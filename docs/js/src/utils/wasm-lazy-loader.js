/**
 * WASM Lazy Loading System
 * Implements progressive loading strategies for WASM modules with compression and caching
 */

export class WasmLazyLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.moduleCache = new Map();
    this.preloadQueue = [];
    
    this.config = {
      preloadCritical: true,
      enableCompression: true,
      cacheModules: true,
      loadTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      compressionThreshold: 1024 * 50 // 50KB
    };

    this.stats = {
      modulesLoaded: 0,
      totalLoadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      compressionSavings: 0,
      failedLoads: 0
    };

    this.loadingStrategies = {
      IMMEDIATE: 'immediate',
      ON_DEMAND: 'on_demand',
      PROGRESSIVE: 'progressive',
      BACKGROUND: 'background'
    };
  }

  /**
   * Load WASM module with lazy loading strategy
   * @param {string} moduleName - Module identifier
   * @param {Object} options - Loading options
   * @returns {Promise<WebAssembly.Instance>} Instantiated module
   */
  async loadModule(moduleName, options = {}) {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (this.loadedModules.has(moduleName)) {
        this.stats.cacheHits++;
        console.log(`📦 Cache hit for WASM module '${moduleName}'`);
        return this.loadedModules.get(moduleName);
      }

      // Return existing loading promise if in progress
      if (this.loadingPromises.has(moduleName)) {
        return await this.loadingPromises.get(moduleName);
      }

      // Create loading promise
      const loadingPromise = this.performLazyLoad(moduleName, options);
      this.loadingPromises.set(moduleName, loadingPromise);

      const instance = await loadingPromise;
      
      // Cache the loaded module
      if (this.config.cacheModules) {
        this.loadedModules.set(moduleName, instance);
      }

      this.loadingPromises.delete(moduleName);
      
      // Update stats
      const loadTime = performance.now() - startTime;
      this.stats.modulesLoaded++;
      this.stats.totalLoadTime += loadTime;
      this.stats.cacheMisses++;

      console.log(`✅ Loaded WASM module '${moduleName}' in ${loadTime.toFixed(2)}ms`);
      return instance;

    } catch (error) {
      this.loadingPromises.delete(moduleName);
      this.stats.failedLoads++;
      console.error(`❌ Failed to load WASM module '${moduleName}':`, error);
      throw error;
    }
  }

  /**
   * Perform the actual lazy loading with retry logic
   * @private
   */
  async performLazyLoad(moduleName, options) {
    // Strategy is defined but not used in the current implementation
    // const strategy = options.strategy || this.loadingStrategies.ON_DEMAND;
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const arrayBuffer = await this.loadModuleBytes(moduleName, options);
        
        // Create proper import objects based on module name
        const imports = this.createImportObject(moduleName, options.imports || {});
        
        // Use streaming compilation if available for better performance
        let instance;
        if (typeof WebAssembly.instantiate === 'function') {
          // Direct instantiation from buffer (more efficient than compile + instantiate)
          // Wrap in timeout to prevent browser hanging
          const result = await this.withTimeout(
            WebAssembly.instantiate(arrayBuffer, imports),
            this.config.loadTimeout,
            `WASM instantiation timeout for ${moduleName}`
          );
          instance = result.instance;
          
          // Clear any source map references to prevent null URL errors
          if (instance && typeof instance.exports === 'object') {
            // Ensure no source map URLs are attached that could cause issues
            try {
              // Remove any potential source map references from the instance
              if (instance.sourceMapURL) {
                delete instance.sourceMapURL;
              }
            } catch (e) {
              // Ignore errors when clearing source map references
            }
          }
        } else {
          // Fallback to two-step process with timeout protection
          const module = await this.withTimeout(
            WebAssembly.compile(arrayBuffer),
            this.config.loadTimeout / 2,
            `WASM compilation timeout for ${moduleName}`
          );
          instance = await this.withTimeout(
            WebAssembly.instantiate(module, imports),
            this.config.loadTimeout / 2,
            `WASM instantiation timeout for ${moduleName}`
          );
          
          // Clear any source map references to prevent null URL errors
          if (instance && typeof instance.exports === 'object') {
            try {
              if (instance.sourceMapURL) {
                delete instance.sourceMapURL;
              }
            } catch (e) {
              // Ignore errors when clearing source map references
            }
          }
        }
        
        return instance;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Load attempt ${attempt} failed for '${moduleName}':`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed to load WASM module '${moduleName}' after ${this.config.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Load WASM module bytes with fallback paths
   * @private
   */
  async loadModuleBytes(moduleName, options) {
    const paths = this.resolveModulePaths(moduleName);
    let lastError = null;

    for (const path of paths) {
      try {
        const arrayBuffer = await this.fetchWithTimeout(path, options);
        
        // Check if compression is beneficial
        if (this.config.enableCompression && arrayBuffer.byteLength > this.config.compressionThreshold) {
          return await this.decompressIfNeeded(arrayBuffer, path);
        }
        
        return arrayBuffer;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Failed to load from ${path}:`, error.message);
      }
    }

    throw new Error(`All module paths failed for '${moduleName}': ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Fetch with timeout and progress tracking
   * @private
   */
  async fetchWithTimeout(url, options) {
    // Validate URL before making request
    if (!url || url.trim() === '') {
      throw new Error('Invalid URL provided to fetchWithTimeout');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.loadTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache', // Use browser cache aggressively
        ...options.fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Track loading progress if possible
      if (response.body && options.onProgress) {
        return await this.trackDownloadProgress(response, options.onProgress);
      }

      const arrayBuffer = await response.arrayBuffer();
      clearTimeout(timeoutId);
      return arrayBuffer;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Load timeout after ${this.config.loadTimeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Track download progress
   * @private
   */
  async trackDownloadProgress(response, onProgress) {
    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      chunks.push(value);
      receivedBytes += value.length;
      
      if (onProgress && totalBytes > 0) {
        onProgress({
          loaded: receivedBytes,
          total: totalBytes,
          progress: receivedBytes / totalBytes
        });
      }
    }

    // Combine chunks into single ArrayBuffer
    const arrayBuffer = new ArrayBuffer(receivedBytes);
    const uint8Array = new Uint8Array(arrayBuffer);
    let offset = 0;
    
    for (const chunk of chunks) {
      uint8Array.set(chunk, offset);
      offset += chunk.length;
    }

    return arrayBuffer;
  }

  /**
   * Resolve module paths with fallbacks
   * @private
   */
  resolveModulePaths(moduleName) {
    // Ensure we have a valid base URL
    let baseUrl;
    try {
      baseUrl = new URL(document.baseURI || window.location.href);
    } catch {
      baseUrl = new URL(window.location.href);
    }
    
    const paths = [
      `${moduleName}.wasm`,
      `dist/${moduleName}.wasm`,
      `src/wasm/${moduleName}.wasm`,
      `wasm/${moduleName}.wasm`,
      `docs/${moduleName}.wasm`,
      `docs/wasm/${moduleName}.wasm`
    ];

    return paths.map(path => {
      try {
        // Validate path before creating URL to prevent null URL errors
        if (!path || path.trim() === '') {
          console.warn(`Invalid WASM path: "${path}"`);
          return null;
        }
        const url = new URL(path, baseUrl).href;
        return url;
      } catch (error) {
        console.warn(`Failed to create URL for path "${path}":`, error.message);
        return path; // Fallback to relative path
      }
    }).filter(path => path !== null); // Remove null paths
  }

  /**
   * Decompress module if needed (placeholder for actual compression)
   * @private
   */
  decompressIfNeeded(arrayBuffer) {
    // For now, just return as-is
    // In production, could implement brotli/gzip decompression
    return arrayBuffer;
  }

  /**
   * Preload critical WASM modules in background
   */
  async preloadCriticalModules(moduleNames = ['game']) {
    if (!this.config.preloadCritical) {
      return;
    }

    console.log('🚀 Preloading critical WASM modules...');
    
    const preloadPromises = moduleNames.map(async (moduleName) => {
      try {
        // Load in background with low priority
        await this.loadModule(moduleName, { 
          strategy: this.loadingStrategies.BACKGROUND,
          priority: 'low'
        });
        console.log(`✅ Preloaded critical module: ${moduleName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${moduleName}:`, error.message);
        // Don't throw - preloading is optional
      }
    });

    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`📦 Preloaded ${successful}/${moduleNames.length} critical modules`);
  }

  /**
   * Progressive loading with priority queue
   */
  async loadModulesProgressively(moduleSpecs) {
    // Sort by priority
    const sortedSpecs = moduleSpecs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    const results = [];
    
    for (const spec of sortedSpecs) {
      try {
        const instance = await this.loadModule(spec.name, spec.options);
        results.push({ name: spec.name, instance, success: true });
        
        // Small delay to allow other work
        await this.delay(10);
        
      } catch (error) {
        results.push({ name: spec.name, error, success: false });
      }
    }

    return results;
  }

  /**
   * Unload module to free memory
   */
  unloadModule(moduleName) {
    if (this.loadedModules.has(moduleName)) {
      this.loadedModules.delete(moduleName);
      console.log(`🗑️ Unloaded WASM module: ${moduleName}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all cached modules
   */
  clearCache() {
    const count = this.loadedModules.size;
    this.loadedModules.clear();
    this.moduleCache.clear();
    console.log(`🧹 Cleared ${count} cached WASM modules`);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      ...this.stats,
      loadedModules: this.loadedModules.size,
      loadingInProgress: this.loadingPromises.size,
      averageLoadTime: this.stats.modulesLoaded > 0 ? this.stats.totalLoadTime / this.stats.modulesLoaded : 0,
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 
        ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) 
        : 0
    };
  }

  /**
   * Create proper import objects for WASM modules
   * @param {string} moduleName - Name of the module
   * @param {Object} userImports - User-provided imports
   * @returns {Object} Complete import object
   * @private
   */
  createImportObject(moduleName, userImports = {}) {
    // Create base memory if not provided
    const memory = userImports.env?.memory || new WebAssembly.Memory({ initial: 16 });
    
    // Base imports that most modules need
    const baseImports = {
      env: {
        memory,
        abort: () => { throw new Error('WASM abort'); },
        abort_: () => { throw new Error('WASM abort_'); },
        __console_log: (ptr, len) => {
          try {
            const view = new Uint8Array(memory.buffer, ptr, len);
            const text = new TextDecoder().decode(view);
            console.log('[WASM]:', text);
          } catch (e) {
            console.warn('Failed to decode WASM console log:', e);
          }
        },
        // Additional env functions that might be needed
        js_log: (ptr, len) => {
          try {
            const view = new Uint8Array(memory.buffer, ptr, len);
            const text = new TextDecoder().decode(view);
            console.log('[WASM]:', text);
          } catch (e) {
            console.warn('Failed to decode WASM js_log:', e);
          }
        },
        js_get_timestamp: () => Date.now(),
        js_random: () => Math.random(),
        // Emscripten memory growth notification (required for dynamic memory allocation)
        emscripten_notify_memory_growth: (memoryIndex) => {
          console.log(`[WASM] Memory growth notification: ${memoryIndex}`);
          // This is a callback that Emscripten uses to notify about memory growth
          // In most cases, we don't need to do anything special here
        }
      }
    };

    // Create WASI shim for modules that need it
    const wasiImports = this.createWasiShim(memory);
    
    // Module-specific import configurations
    let moduleSpecificImports = {};
    
    if (moduleName === 'game') {
      // Game module typically needs WASI
      moduleSpecificImports = {
        wasi_snapshot_preview1: wasiImports,
        wasi_unstable: wasiImports
      };

    // Merge all imports: base < module-specific < user-provided
    const finalImports = {
      ...baseImports,
      ...moduleSpecificImports,
      ...userImports
    };

    // Ensure env is properly merged
    if (userImports.env || moduleSpecificImports.env) {
      finalImports.env = {
        ...baseImports.env,
        ...moduleSpecificImports.env,
        ...userImports.env
      };
    }

    return finalImports;
  }

  /**
   * Create minimal WASI shim for browser environments
   * @param {WebAssembly.Memory} memory - WASM memory instance
   * @returns {Object} WASI import object
   * @private
   */
  createWasiShim(memory) {
    const u8 = () => new Uint8Array(memory.buffer);
    const dv = () => new DataView(memory.buffer);
    const textDecoder = new TextDecoder();
    
    // Simple PRNG for deterministic behavior
    let prngState = (() => {
      try {
        const seedBig = (typeof globalThis !== 'undefined' && typeof globalThis.runSeedForVisuals !== 'undefined')
          ? globalThis.runSeedForVisuals
          : 0xC0FFEE ^ 0x9E3779B9;
        const seedNum = typeof seedBig === 'bigint' ? Number(seedBig & 0xffffffffn) : (seedBig >>> 0);
        return (seedNum >>> 0) || 0x9E3779B9;
      } catch {
        return 0x9E3779B9;
      }
    })();
    
    const nextByte = () => {
      prngState = (Math.imul(prngState, 1664525) + 1013904223) >>> 0;
      return prngState & 0xff;
    };

    return {
      fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
        let written = 0;
        const dataView = dv();
        const bytes = u8();
        let offset = iovPtr >>> 0;
        
        for (let i = 0; i < (iovCnt >>> 0); i++) {
          const ptr = dataView.getUint32(offset, true);
          const len = dataView.getUint32(offset + 4, true);
          offset += 8;
          
          try {
            const chunk = bytes.subarray(ptr, ptr + len);
            const text = textDecoder.decode(chunk);
            if (fd === 1) {
              console.log(text);
            } else if (fd === 2) {
              console.error(text);
            }
            written += len;
          } catch (e) {
            console.warn('WASI fd_write decode error:', e);
          }
        }
        
        dataView.setUint32(nwrittenPtr >>> 0, written >>> 0, true);
        return 0;
      },
      
      proc_exit: (code) => {
        throw new Error(`WASI proc_exit: ${code}`);
      },
      
      random_get: (ptr, len) => {
        const view = u8().subarray(ptr >>> 0, (ptr >>> 0) + (len >>> 0));
        
        // Try to use crypto if available
        try {
          if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
            globalThis.crypto.getRandomValues(view);
            return 0;
          }
        } catch (e) {
          // Fall back to PRNG
        }
        
        // Deterministic fallback
        for (let i = 0; i < view.length; i++) {
          view[i] = nextByte();
        }
        return 0;
      },
      
      clock_time_get: (_id, _precision, timePtr) => {
        const nowNs = BigInt(Date.now()) * 1000000n;
        const dataView = dv();
        
        try {
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(timePtr >>> 0, nowNs, true);
          } else {
            const low = Number(nowNs & 0xffffffffn);
            const high = Number((nowNs >> 32n) & 0xffffffffn);
            dataView.setUint32(timePtr >>> 0, low, true);
            dataView.setUint32((timePtr >>> 0) + 4, high, true);
          }
        } catch (e) {
          console.warn('WASI clock_time_get error:', e);
        }
        return 0;
      },
      
      args_sizes_get: (argcPtr, argvBufSizePtr) => {
        const dataView = dv();
        dataView.setUint32(argcPtr >>> 0, 0, true);
        dataView.setUint32(argvBufSizePtr >>> 0, 0, true);
        return 0;
      },
      
      args_get: () => 0,
      
      environ_sizes_get: (envcPtr, envBufSizePtr) => {
        const dataView = dv();
        dataView.setUint32(envcPtr >>> 0, 0, true);
        dataView.setUint32(envBufSizePtr >>> 0, 0, true);
        return 0;
      },
      
      environ_get: () => 0,
      fd_close: () => 0,
      
      fd_seek: (_fd, _offsetLow, _offsetHigh, _whence, newOffsetPtr) => {
        const dataView = dv();
        dataView.setUint32(newOffsetPtr >>> 0, 0, true);
        dataView.setUint32((newOffsetPtr >>> 0) + 4, 0, true);
        return 0;
      }
    };
  }

  /**
   * Utility delay function
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap promise with timeout to prevent hanging
   * @private
   */
  withTimeout(promise, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Enable/disable features
   */
  configure(options) {
    this.config = { ...this.config, ...options };
  }
}

// Global lazy loader instance
export const globalWasmLoader = new WasmLazyLoader();

// Auto-preload critical modules when available
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    globalWasmLoader.preloadCriticalModules().catch(error => {
      console.warn('Failed to preload critical WASM modules:', error);
    });
  });
}
