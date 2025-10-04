import { WasmCache, globalWasmCache } from './WasmCache.js';
import { WasmLoadingStats, globalWasmLoadingStats } from './WasmLoadingStats.js';
import { WasmRetryStrategy, globalWasmRetryStrategy } from './WasmRetryStrategy.js';
import { WasmImportFactory } from './WasmImportFactory.js';
import { WasmResourceFetcher } from './WasmResourceFetcher.js';
import { clearSourceMapReferences } from './WasmSourceMap.js';
import { runWasmDiagnostics } from './WasmDiagnostics.js';

const DEFAULT_CONFIG = {
  preloadCritical: true,
  enableCompression: true,
  cacheModules: true,
  loadTimeout: 30000,
  instantiationTimeout: 20000,
  retryAttempts: 3,
  retryDelay: 2000,
  compressionThreshold: 1024 * 50,
  debugMode: false
};

export class WasmLoader {
  constructor({
    config = {},
    cache = globalWasmCache,
    stats = globalWasmLoadingStats,
    retryStrategy = globalWasmRetryStrategy,
    importFactory,
    resourceFetcher,
    logger = console
  } = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.cache = cache instanceof WasmCache ? cache : globalWasmCache;
    this.stats = stats instanceof WasmLoadingStats ? stats : globalWasmLoadingStats;

    this.retryStrategy = retryStrategy instanceof WasmRetryStrategy
      ? retryStrategy
      : globalWasmRetryStrategy;

    this.retryStrategy.updateConfig({
      baseDelayMs: this.config.retryDelay,
      maxAttempts: this.config.retryAttempts
    });

    this.importFactory = importFactory || new WasmImportFactory({
      cache: this.cache,
      logger: this.logger
    });

    this.resourceFetcher = resourceFetcher || new WasmResourceFetcher({
      retryStrategy: this.retryStrategy,
      config: this.config,
      logger: this.logger
    });

    this.loadingStrategies = {
      IMMEDIATE: 'immediate',
      ON_DEMAND: 'on_demand',
      PROGRESSIVE: 'progressive',
      BACKGROUND: 'background'
    };
  }

  configure(options = {}) {
    this.config = { ...this.config, ...options };
    this.retryStrategy.updateConfig({
      baseDelayMs: this.config.retryDelay,
      maxAttempts: this.config.retryAttempts
    });
    this.resourceFetcher.updateConfig(this.config);
  }

  async loadModule(moduleName, options = {}) {
    const startTime = performance.now();

    if (this.cache.hasLoaded(moduleName)) {
      this.stats.recordCacheHit();
      this.logger.log?.(`Cache hit for WASM module '${moduleName}'`);
      return this.cache.getLoaded(moduleName);
    }

    const existingPromise = this.cache.getLoading(moduleName);
    if (existingPromise) {
      return existingPromise;
    }

    const loadingPromise = this.performLazyLoad(moduleName, options);
    const timedPromise = this.retryStrategy.withTimeout(
      loadingPromise,
      this.config.loadTimeout,
      `WASM module '${moduleName}' loading timeout`
    );

    this.cache.setLoading(moduleName, timedPromise);

    try {
      const instance = await timedPromise;

      if (this.config.cacheModules) {
        this.cache.setLoaded(moduleName, instance);
      }

      const loadTime = performance.now() - startTime;
      this.stats.recordCacheMiss(loadTime);

      this.logger.log?.(`Loaded WASM module '${moduleName}' in ${loadTime.toFixed(2)}ms`);
      return instance;
    } catch (error) {
      this.stats.recordFailure();
      this.logger.error?.(`Failed to load WASM module '${moduleName}':`, error);
      throw error;
    } finally {
      this.cache.clearLoading(moduleName);
    }
  }

  async performLazyLoad(moduleName, options) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const arrayBuffer = await this.resourceFetcher.loadModuleBytes(moduleName, options);

        this.logger.log?.(`Creating import object for ${moduleName} (attempt ${attempt})`);
        let imports = this.importFactory.createImportObject(moduleName, options?.imports || {});
        this.logger.log?.(`Import object created for ${moduleName}`);

        if (attempt > 1) {
          this.logger.log?.(`Retry attempt ${attempt}: using simplified import object`);
          imports = this.importFactory.createSimplifiedImportObject(moduleName);
        }

        this.optimizeMemoryBeforeInstantiation();

        let instanceResult;

        if (typeof WebAssembly.instantiate === 'function') {
          instanceResult = await this.#instantiateModuleWithMonitoring(
            moduleName,
            arrayBuffer,
            imports
          );
        } else {
          instanceResult = await this.#compileAndInstantiateFallback(
            moduleName,
            arrayBuffer,
            imports
          );
        }

        const { instance, module: compiledModule } = instanceResult;
        clearSourceMapReferences(instance, compiledModule, { logger: this.logger });
        return instance;
      } catch (error) {
        lastError = error;
        this.logger.warn?.(`Load attempt ${attempt} failed for '${moduleName}': ${error.message}`);

        if (this.#shouldLogDiagnosticsForError(error)) {
          this.#logDiagnosticsHints(error, attempt);
        }

        if (attempt < this.config.retryAttempts) {
          const delayMs = this.config.retryDelay * attempt;
          this.logger.log?.(`Retrying in ${delayMs}ms...`);
          await this.retryStrategy.delay(delayMs);
        }
      }
    }

    const reason = lastError?.message || 'Unknown error';
    throw new Error(`Failed to load WASM module '${moduleName}' after ${this.config.retryAttempts} attempts: ${reason}`);
  }

  async preloadCriticalModules(moduleNames = ['game']) {
    if (!this.config.preloadCritical) {
      return;
    }

    this.logger.log?.('Preloading critical WASM modules...');

    const results = await Promise.allSettled(
      moduleNames.map(moduleName =>
        this.loadModule(moduleName, {
          strategy: this.loadingStrategies.BACKGROUND,
          priority: 'low'
        })
      )
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    this.logger.log?.(`Preloaded ${successful}/${moduleNames.length} critical modules`);
  }

  async loadModulesProgressively(moduleSpecs) {
    const sortedSpecs = [...moduleSpecs].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    const results = [];

    for (const spec of sortedSpecs) {
      try {
        const instance = await this.loadModule(spec.name, spec.options);
        results.push({ name: spec.name, instance, success: true });
        await this.retryStrategy.delay(10);
      } catch (error) {
        results.push({ name: spec.name, error, success: false });
      }
    }

    return results;
  }

  unloadModule(moduleName) {
    const unloaded = this.cache.unload(moduleName);
    if (unloaded) {
      this.logger.log?.(`Unloaded WASM module: ${moduleName}`);
    }
    return unloaded;
  }

  clearCache() {
    const clearedCount = this.cache.clearAllCaches();
    this.logger.log?.(`Cleared ${clearedCount} cached WASM modules`);
    return clearedCount;
  }

  getStats() {
    return this.stats.snapshot({
      loadedModules: this.cache.loadedCount(),
      loadingInProgress: this.cache.loadingCount()
    });
  }

  async runDiagnostics(moduleName = 'game') {
    return runWasmDiagnostics(moduleName, {
      resourceFetcher: this.resourceFetcher,
      logger: this.logger
    });
  }

  createImportObject(moduleName, userImports = {}) {
    return this.importFactory.createImportObject(moduleName, userImports);
  }

  createSimplifiedImportObject(moduleName) {
    return this.importFactory.createSimplifiedImportObject(moduleName);
  }

  createWasiShim(memory) {
    return this.importFactory.createWasiShim(memory);
  }

  createMinimalWasiShim(memory) {
    return this.importFactory.createMinimalWasiShim(memory);
  }

  getAdditionalMemory(memoryIndex) {
    return this.importFactory.getAdditionalMemory(memoryIndex);
  }

  delay(ms) {
    return this.retryStrategy.delay(ms);
  }

  withTimeout(promise, timeoutMs, timeoutMessage) {
    return this.retryStrategy.withTimeout(promise, timeoutMs, timeoutMessage);
  }

  optimizeMemoryBeforeInstantiation() {
    try {
      if (typeof window !== 'undefined' && typeof window.gc === 'function') {
        window.gc();
        this.logger.log?.('Forced garbage collection before WASM instantiation');
      }

      const cleared = typeof this.cache.clearModuleCache === 'function'
        ? this.cache.clearModuleCache()
        : 0;
      if (cleared > 0) {
        this.logger.log?.(`Cleared ${cleared} cached modules before instantiation`);
      }

      if (typeof performance !== 'undefined' && performance.memory) {
        const memInfo = performance.memory;
        this.logger.log?.(
          `Memory before instantiation: used ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB, ` +
          `total ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB, ` +
          `limit ${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`
        );
      }
    } catch (error) {
      this.logger.warn?.('Memory optimization warning:', error.message);
    }
  }

  async #instantiateModuleWithMonitoring(moduleName, arrayBuffer, imports) {
    const instantiationStart = performance.now();
    const instantiationPromise = WebAssembly.instantiate(arrayBuffer, imports);

    let progressInterval = null;
    if (arrayBuffer.byteLength > 100000 || this.config.debugMode) {
      progressInterval = setInterval(() => {
        const elapsed = performance.now() - instantiationStart;
        this.logger.log?.(`WASM instantiation in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)`);
      }, 5000);
    }

    try {
      const result = await this.retryStrategy.withTimeout(
        instantiationPromise,
        this.config.instantiationTimeout,
        `WASM instantiation timeout for ${moduleName} after ${this.config.instantiationTimeout}ms`
      );

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      const instantiationTime = performance.now() - instantiationStart;
      this.logger.log?.(`WASM instantiation completed for ${moduleName} in ${instantiationTime.toFixed(2)}ms`);

      return {
        instance: result.instance,
        module: result.module || null
      };
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  }

  async #compileAndInstantiateFallback(moduleName, arrayBuffer, imports) {
    this.logger.log?.(`Starting WASM compilation for ${moduleName} (${arrayBuffer.byteLength} bytes)`);
    const compilationStart = performance.now();

    let compilationProgressInterval = setInterval(() => {
      const elapsed = performance.now() - compilationStart;
      this.logger.log?.(`WASM compilation in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)`);
    }, 2000);

    try {
      const compiledModule = await this.retryStrategy.withTimeout(
        WebAssembly.compile(arrayBuffer),
        this.config.instantiationTimeout / 2,
        `WASM compilation timeout for ${moduleName} after ${this.config.instantiationTimeout / 2}ms`
      );

      clearInterval(compilationProgressInterval);
      compilationProgressInterval = null;

      const compilationTime = performance.now() - compilationStart;
      this.logger.log?.(`WASM compilation completed for ${moduleName} in ${compilationTime.toFixed(2)}ms`);

      const instantiationStart = performance.now();
      let instantiationProgressInterval = setInterval(() => {
        const elapsed = performance.now() - instantiationStart;
        this.logger.log?.(`WASM instantiation in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)`);
      }, 5000);

      try {
        const instance = await this.retryStrategy.withTimeout(
          WebAssembly.instantiate(compiledModule, imports),
          this.config.instantiationTimeout,
          `WASM instantiation timeout for ${moduleName} after ${this.config.instantiationTimeout}ms`
        );

        clearInterval(instantiationProgressInterval);
        instantiationProgressInterval = null;

        const instantiationTime = performance.now() - instantiationStart;
        this.logger.log?.(`WASM instantiation completed for ${moduleName} in ${instantiationTime.toFixed(2)}ms`);

        return {
          instance,
          module: compiledModule
        };
      } finally {
        if (instantiationProgressInterval) {
          clearInterval(instantiationProgressInterval);
        }
      }
    } finally {
      if (compilationProgressInterval) {
        clearInterval(compilationProgressInterval);
      }
    }
  }

  #shouldLogDiagnosticsForError(error) {
    if (!error || !error.message) {
      return false;
    }
    const message = error.message.toLowerCase();
    return message.includes('timeout')
      || message.includes('webassembly')
      || message.includes('fetch')
      || message.includes('network');
  }

  #logDiagnosticsHints(error, attempt) {
    const message = error.message || '';

    if (message.includes('timeout')) {
      this.logger.warn?.(`Timeout detected (attempt ${attempt}/${this.config.retryAttempts}). Potential causes:`);
      this.logger.warn?.(' - Browser performance issues or high CPU load');
      this.logger.warn?.(' - WASM module complexity requiring more time');
      this.logger.warn?.(' - Browser memory limitations');
      this.logger.warn?.(' - Network connectivity issues');
      this.logger.warn?.(' - Server not responding properly');

      if (typeof performance !== 'undefined' && performance.memory) {
        const memInfo = performance.memory;
        this.logger.warn?.(
          `Current memory usage: used ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB, ` +
          `total ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`
        );
      }
    } else if (message.includes('webassembly')) {
      this.logger.warn?.(`WebAssembly error (attempt ${attempt}/${this.config.retryAttempts}). Potential causes:`);
      this.logger.warn?.(' - WASM file is corrupted');
      this.logger.warn?.(' - Browser lacks required WASM features');
      this.logger.warn?.(' - Import object incompatibility');
      this.logger.warn?.(' - Module requires unavailable features');
    } else if (message.includes('fetch')) {
      this.logger.warn?.(`Network error (attempt ${attempt}/${this.config.retryAttempts}). Potential causes:`);
      this.logger.warn?.(' - File not found at expected path');
      this.logger.warn?.(' - Server not running or misconfigured');
      this.logger.warn?.(' - CORS or MIME type issues');
    }
  }
}

export const globalWasmLoaderInstance = new WasmLoader();
