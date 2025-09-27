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
      loadTimeout: 30000, // Increased to 30s for better reliability
      instantiationTimeout: 20000, // Increased to 20s for complex WASM modules
      retryAttempts: 3,
      retryDelay: 2000, // Increased retry delay to 2s
      compressionThreshold: 1024 * 50, // 50KB
      debugMode: false // Disable debug mode by default to reduce overhead
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

      // Create loading promise with timeout
      const loadingPromise = this.performLazyLoad(moduleName, options);
      const timeoutPromise = this.withTimeout(
        loadingPromise,
        this.config.loadTimeout,
        `WASM module '${moduleName}' loading timeout`
      );
      
      this.loadingPromises.set(moduleName, timeoutPromise);

      const instance = await timeoutPromise;
      
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
   * Clear source map references from WASM instance
   * @private
   */
  clearSourceMapReferences(instance, moduleRef = null) {
    if (!instance && !moduleRef) {
      return;
    }
    
    try {
      const sourceMapProps = [
        'sourceMapURL', '_sourceMapURL', 'sourceMap', '_sourceMap',
        'sourceMappingURL', '_sourceMappingURL', 'sourceMapData', '_sourceMapData',
        'debugInfo', '_debugInfo', 'debugSymbols', '_debugSymbols'
      ];
      
      const safeDelete = (target, prop) => {
        if (target && prop in target) {
          try {
            delete target[prop];
          } catch (error) {
            // Ignore deletion errors
          }
        }
      };
      
      const scrubTarget = (target) => {
        if (!target || typeof target !== 'object') {
          return;
        }
        
        sourceMapProps.forEach(prop => safeDelete(target, prop));
        
        if ('sourceMapURL' in target && (target.sourceMapURL === null || target.sourceMapURL === '' || target.sourceMapURL === undefined)) {
          safeDelete(target, 'sourceMapURL');
        }
      };
      
      const moduleTarget = (moduleRef && typeof moduleRef === 'object')
        ? moduleRef
        : (instance && typeof instance.module === 'object' ? instance.module : null);
      
      scrubTarget(instance);
      if (instance && typeof instance.exports === 'object') {
        scrubTarget(instance.exports);
      }
      scrubTarget(moduleTarget);
      
      if (moduleTarget && typeof moduleTarget === 'object') {
        try {
          Object.keys(moduleTarget).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('source') || lowerKey.includes('map') || lowerKey.includes('debug')) {
              safeDelete(moduleTarget, key);
            }
          });
        } catch (e) {
          // Ignore key iteration errors
        }
      }
      
      if (typeof window !== 'undefined' && window.WebAssembly && window.WebAssembly.Module) {
        try {
          const prototype = window.WebAssembly.Module.prototype;
          sourceMapProps.forEach(prop => {
            if (prototype[prop] === null || prototype[prop] === '' || prototype[prop] === undefined) {
              safeDelete(prototype, prop);
            }
          });
        } catch (prototypeError) {
          // Ignore prototype modification errors
        }
      }
      
      if (typeof window !== 'undefined' && window.WebAssembly && window.WebAssembly.Instance) {
        try {
          const prototype = window.WebAssembly.Instance.prototype;
          sourceMapProps.forEach(prop => {
            if (prototype[prop] === null || prototype[prop] === '' || prototype[prop] === undefined) {
              safeDelete(prototype, prop);
            }
          });
        } catch (prototypeError) {
          // Ignore prototype modification errors
        }
      }
      
    } catch (e) {
      console.debug('Source map cleanup warning:', e.message);
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
        console.log(`🔧 Creating import object for ${moduleName}...`);
        let imports = this.createImportObject(moduleName, options.imports || {});
        console.log(`✅ Import object created for ${moduleName} with ${Object.keys(imports).length} import categories`);
        
        // If this is a retry attempt, try with a simpler import object
        if (attempt > 1) {
          console.log(`🔧 Retry attempt ${attempt}: Using simplified import object...`);
          imports = this.createSimplifiedImportObject(moduleName);
          console.log(`✅ Simplified import object created for ${moduleName}`);
        }
        
        // Perform memory optimization before instantiation
        this.optimizeMemoryBeforeInstantiation();
        
        // Use streaming compilation if available for better performance
        let instance;
        let compiledModule = null;
        if (typeof WebAssembly.instantiate === 'function') {
          // Direct instantiation from buffer (more efficient than compile + instantiate)
          // Wrap in timeout to prevent browser hanging
          console.log(`🔧 Starting WASM instantiation for ${moduleName} (${arrayBuffer.byteLength} bytes)...`);
          const instantiationStart = performance.now();
          
          // Add progress monitoring for instantiation
          const instantiationPromise = WebAssembly.instantiate(arrayBuffer, imports);
          
          // Create a progress monitor that logs every 5 seconds (reduced frequency)
          let progressInterval;
          const progressMonitor = () => {
            progressInterval = setInterval(() => {
              const elapsed = performance.now() - instantiationStart;
              console.log(`⏳ WASM instantiation still in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)...`);
            }, 5000); // Reduced from 2000ms to 5000ms
          };
          
          // Only start progress monitoring for large modules or in debug mode
          if (arrayBuffer.byteLength > 100000 || this.config.debugMode) {
            progressMonitor();
          }
          
          const result = await this.withTimeout(
            instantiationPromise,
            this.config.instantiationTimeout,
            `WASM instantiation timeout for ${moduleName} after ${this.config.instantiationTimeout}ms`
          );
          
          // Clear progress monitor
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          
          const instantiationTime = performance.now() - instantiationStart;
          console.log(`✅ WASM instantiation completed for ${moduleName} in ${instantiationTime.toFixed(2)}ms`);
          instance = result.instance;
          compiledModule = result.module || null;

          // Immediately clear any source map references to prevent devtools issues
          this.clearSourceMapReferences(instance, compiledModule);
        } else {
          // Fallback to two-step process with timeout protection
          console.log(`🔧 Starting WASM compilation for ${moduleName} (${arrayBuffer.byteLength} bytes)...`);
          const compilationStart = performance.now();
          
          // Add progress monitoring for compilation
          const compilationPromise = WebAssembly.compile(arrayBuffer);
          
          // Create a progress monitor for compilation
          let compilationProgressInterval;
          const compilationProgressMonitor = () => {
            compilationProgressInterval = setInterval(() => {
              const elapsed = performance.now() - compilationStart;
              console.log(`⏳ WASM compilation still in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)...`);
            }, 2000);
          };
          
          compilationProgressMonitor();
          
          compiledModule = await this.withTimeout(
            compilationPromise,
            this.config.instantiationTimeout / 2,
            `WASM compilation timeout for ${moduleName} after ${this.config.instantiationTimeout / 2}ms`
          );
          
          // Clear compilation progress monitor
          if (compilationProgressInterval) {
            clearInterval(compilationProgressInterval);
          }
          
          const compilationTime = performance.now() - compilationStart;
          console.log(`✅ WASM compilation completed for ${moduleName} in ${compilationTime.toFixed(2)}ms`);
          
          console.log(`🔧 Starting WASM instantiation for ${moduleName}...`);
          const instantiationStart = performance.now();
          
          // Add progress monitoring for second instantiation
          const secondInstantiationPromise = WebAssembly.instantiate(compiledModule, imports);
          
          // Create a progress monitor for second instantiation
          let secondInstantiationProgressInterval;
          const secondInstantiationProgressMonitor = () => {
            secondInstantiationProgressInterval = setInterval(() => {
              const elapsed = performance.now() - instantiationStart;
              console.log(`⏳ WASM second instantiation still in progress for ${moduleName} (${elapsed.toFixed(0)}ms elapsed)...`);
            }, 2000);
          };
          
          secondInstantiationProgressMonitor();
          
          instance = await this.withTimeout(
            secondInstantiationPromise,
            this.config.instantiationTimeout / 2,
            `WASM instantiation timeout for ${moduleName} after ${this.config.instantiationTimeout / 2}ms`
          );
          
          // Clear second instantiation progress monitor
          if (secondInstantiationProgressInterval) {
            clearInterval(secondInstantiationProgressInterval);
          }
          
          const instantiationTime = performance.now() - instantiationStart;
          console.log(`✅ WASM instantiation completed for ${moduleName} in ${instantiationTime.toFixed(2)}ms`);

          this.clearSourceMapReferences(instance, compiledModule);
        }

        return instance;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Load attempt ${attempt} failed for '${moduleName}':`, error.message);
        
        // Provide specific guidance based on error type
        if (error.message.includes('timeout')) {
          console.warn(`🕐 Timeout detected (attempt ${attempt}/${this.config.retryAttempts}) - this may indicate:`);
          console.warn(`   - Browser performance issues or high CPU load`);
          console.warn(`   - WASM module complexity requiring more time`);
          console.warn(`   - Browser memory limitations`);
          console.warn(`   - Network connectivity issues`);
          console.warn(`   - Server not responding properly`);
          
          // Log memory usage if available
          if (typeof performance !== 'undefined' && performance.memory) {
            const memInfo = performance.memory;
            console.warn(`📊 Current memory usage: Used ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB, Total ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
          }
        } else if (error.message.includes('WebAssembly')) {
          console.warn(`🔧 WebAssembly error (attempt ${attempt}/${this.config.retryAttempts}) - this may indicate:`);
          console.warn(`   - WASM file is corrupted`);
          console.warn(`   - Browser doesn't support required WASM features`);
          console.warn(`   - Import object incompatibility`);
          console.warn(`   - WASM module requires features not available in this browser`);
        } else if (error.message.includes('fetch')) {
          console.warn(`🌐 Network error (attempt ${attempt}/${this.config.retryAttempts}) - this may indicate:`);
          console.warn(`   - File not found at expected path`);
          console.warn(`   - Server not running or misconfigured`);
          console.warn(`   - CORS or MIME type issues`);
        } else {
          console.warn(`❌ Unknown error (attempt ${attempt}/${this.config.retryAttempts}):`, error.message);
        }
        
        if (attempt < this.config.retryAttempts) {
          console.log(`🔄 Retrying in ${this.config.retryDelay * attempt}ms...`);
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

    console.log(`🔍 Resolving paths for WASM module '${moduleName}':`, paths);

    for (const path of paths) {
      try {
        console.log(`📥 Attempting to load WASM from: ${path}`);
        const arrayBuffer = await this.fetchWithTimeout(path, options);
        
        console.log(`✅ Successfully loaded WASM from: ${path} (${arrayBuffer.byteLength} bytes)`);
        
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

    console.error(`❌ All module paths failed for '${moduleName}':`, paths);
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
        ...(options.fetchOptions || {})
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
      `../${moduleName}.wasm`,
      `../src/wasm/${moduleName}.wasm`
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
   * Create simplified import object for retry attempts
   * @param {string} moduleName - Name of the module
   * @returns {Object} Simplified import object
   * @private
   */
  createSimplifiedImportObject(moduleName) {
    console.log(`🔧 Creating simplified import object for ${moduleName}...`);
    
    // Create minimal memory
    const memory = new WebAssembly.Memory({ initial: 8 }); // Smaller initial memory
    
    // Minimal imports - only essential functions
    const simplifiedImports = {
      env: {
        memory,
        abort: () => { throw new Error('WASM abort'); },
        __console_log: (ptr, len) => {
          try {
            const view = new Uint8Array(memory.buffer, ptr, len);
            const text = new TextDecoder().decode(view);
            console.log('[WASM]:', text);
          } catch (e) {
            console.warn('Failed to decode WASM console log:', e);
          }
        },
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
        js_random: () => Math.random()
      }
    };
    
    // Add minimal WASI if needed
    if (moduleName === 'game') {
      simplifiedImports.wasi_snapshot_preview1 = this.createMinimalWasiShim(memory);
    }
    
    console.log(`✅ Simplified import object created with ${Object.keys(simplifiedImports).length} categories`);
    return simplifiedImports;
  }

  /**
   * Create minimal WASI shim for simplified imports
   * @param {WebAssembly.Memory} memory - WASM memory instance
   * @returns {Object} Minimal WASI import object
   * @private
   */
  createMinimalWasiShim(memory) {
    const u8 = () => new Uint8Array(memory.buffer);
    const dv = () => new DataView(memory.buffer);
    const textDecoder = new TextDecoder();
    
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
        
        // Use crypto if available, otherwise use Math.random
        try {
          if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
            globalThis.crypto.getRandomValues(view);
            return 0;
          }
        } catch (e) {
          // Fall back to Math.random
        }
        
        // Simple fallback
        for (let i = 0; i < view.length; i++) {
          view[i] = Math.floor(Math.random() * 256);
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
   * Create proper import objects for WASM modules with WASM 2.0 support
   * @param {string} moduleName - Name of the module
   * @param {Object} userImports - User-provided imports
   * @returns {Object} Complete import object
   * @private
   */
  createImportObject(moduleName, userImports = {}) {
    // Create base memory if not provided - support for multiple memories
    const memory = userImports.env?.memory || new WebAssembly.Memory({ 
      initial: 16,
      maximum: 1024, // Support larger memory limits
      shared: false   // Enable shared memory if needed
    });
    
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
        },
        
        // WASM 2.0 bulk memory operations
        memory_fill: (memoryIndex, dest, value, size) => {
          try {
            const mem = memoryIndex === 0 ? memory : this.getAdditionalMemory(memoryIndex);
            const view = new Uint8Array(mem.buffer, dest, size);
            view.fill(value);
            return 0;
          } catch (error) {
            console.warn('Memory fill error:', error);
            return 1;
          }
        },
        
        memory_copy: (memoryIndex, dest, src, size) => {
          try {
            const mem = memoryIndex === 0 ? memory : this.getAdditionalMemory(memoryIndex);
            const destView = new Uint8Array(mem.buffer, dest, size);
            const srcView = new Uint8Array(mem.buffer, src, size);
            destView.set(srcView);
            return 0;
          } catch (error) {
            console.warn('Memory copy error:', error);
            return 1;
          }
        },
        
        // WASM 2.0 exception handling
        wasm_exception: (exceptionPtr) => {
          console.warn('[WASM] Exception occurred:', exceptionPtr);
          // Handle WASM exceptions if needed
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
    }

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
   * Optimize memory before WASM instantiation
   * @private
   */
  optimizeMemoryBeforeInstantiation() {
    try {
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
        console.log('🧹 Forced garbage collection before WASM instantiation');
      }
      
      // Clear any cached modules that might be consuming memory
      if (this.moduleCache.size > 0) {
        console.log(`🧹 Clearing ${this.moduleCache.size} cached modules before instantiation`);
        this.moduleCache.clear();
      }
      
      // Log memory usage if available
      if (typeof performance !== 'undefined' && performance.memory) {
        const memInfo = performance.memory;
        console.log(`📊 Memory before instantiation: Used ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB, Total ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB, Limit ${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`);
      }
    } catch (error) {
      console.warn('Memory optimization warning:', error.message);
    }
  }

  /**
   * Get additional memory for WASM 2.0 multiple memories support
   * @param {number} memoryIndex - Memory index
   * @returns {WebAssembly.Memory} Memory instance
   * @private
   */
  getAdditionalMemory(memoryIndex) {
    // For now, return the main memory
    // In a full implementation, this would manage multiple memory instances
    return this.loadedModules.get('main')?.exports?.memory || new WebAssembly.Memory({ initial: 16 });
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

  /**
   * Run comprehensive WASM diagnostics
   * @param {string} moduleName - Module to test
   * @returns {Object} Diagnostic results
   */
  async runDiagnostics(moduleName = 'game') {
    console.log(`🔍 Running WASM diagnostics for module: ${moduleName}`);
    
    const diagnostics = {
      browserSupport: {
        webAssembly: typeof WebAssembly !== 'undefined',
        instantiate: typeof WebAssembly?.instantiate === 'function',
        compile: typeof WebAssembly?.compile === 'function',
        instantiateStreaming: typeof WebAssembly?.instantiateStreaming === 'function',
        compileStreaming: typeof WebAssembly?.compileStreaming === 'function'
      },
      networkTests: [],
      fileTests: [],
      memoryTests: {},
      errors: []
    };

    // Test browser support
    if (!diagnostics.browserSupport.webAssembly) {
      diagnostics.errors.push('WebAssembly not supported in this browser');
      return diagnostics;
    }

    // Test network connectivity to WASM files
    const paths = this.resolveModulePaths(moduleName);
    for (const path of paths.slice(0, 3)) { // Test first 3 paths
      try {
        console.log(`🌐 Testing network access to: ${path}`);
        const startTime = performance.now();
        const response = await fetch(path, { method: 'HEAD' });
        const responseTime = performance.now() - startTime;
        
        diagnostics.networkTests.push({
          path,
          status: response.status,
          statusText: response.statusText,
          responseTime: responseTime.toFixed(2),
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          success: response.ok
        });
        
        if (response.ok) {
          console.log(`✅ Network test passed: ${path} (${responseTime.toFixed(2)}ms)`);
        } else {
          console.warn(`⚠️ Network test failed: ${path} - ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        diagnostics.networkTests.push({
          path,
          error: error.message,
          success: false
        });
        console.warn(`❌ Network test error: ${path} - ${error.message}`);
      }
    }

    // Test file loading
    for (const path of paths.slice(0, 2)) { // Test first 2 paths
      try {
        console.log(`📁 Testing file loading from: ${path}`);
        const startTime = performance.now();
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const loadTime = performance.now() - startTime;
        
        diagnostics.fileTests.push({
          path,
          size: arrayBuffer.byteLength,
          loadTime: loadTime.toFixed(2),
          success: true
        });
        
        console.log(`✅ File load test passed: ${path} (${arrayBuffer.byteLength} bytes in ${loadTime.toFixed(2)}ms)`);
        
        // Test WASM compilation if file loaded successfully
        try {
          console.log(`🔧 Testing WASM compilation...`);
          const compileStart = performance.now();
          const module = await WebAssembly.compile(arrayBuffer);
          const compileTime = performance.now() - compileStart;
          
          diagnostics.fileTests[diagnostics.fileTests.length - 1].compilation = {
            success: true,
            time: compileTime.toFixed(2)
          };
          
          console.log(`✅ WASM compilation test passed (${compileTime.toFixed(2)}ms)`);
        } catch (compileError) {
          diagnostics.fileTests[diagnostics.fileTests.length - 1].compilation = {
            success: false,
            error: compileError.message
          };
          console.warn(`⚠️ WASM compilation test failed: ${compileError.message}`);
        }
        
      } catch (error) {
        diagnostics.fileTests.push({
          path,
          error: error.message,
          success: false
        });
        console.warn(`❌ File load test error: ${path} - ${error.message}`);
      }
    }

    // Test memory availability
    try {
      diagnostics.memoryTests = {
        totalMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
      };
    } catch (error) {
      diagnostics.memoryTests.error = error.message;
    }

    console.log(`📊 Diagnostics complete:`, diagnostics);
    return diagnostics;
  }
}

// Global source map cleanup function to prevent URL constructor errors
export function cleanupGlobalSourceMaps() {
  try {
    // Clear any global source map references that might cause issues
    if (typeof window !== 'undefined' && window.WebAssembly) {
      // Clear from WebAssembly.Module prototype
      if (window.WebAssembly.Module && window.WebAssembly.Module.prototype) {
        const moduleProps = ['sourceMapURL', '_sourceMapURL', 'sourceMap', '_sourceMap'];
        moduleProps.forEach(prop => {
          if (window.WebAssembly.Module.prototype[prop] === null || 
              window.WebAssembly.Module.prototype[prop] === '' || 
              window.WebAssembly.Module.prototype[prop] === undefined) {
            delete window.WebAssembly.Module.prototype[prop];
          }
        });
      }
      
      // Clear from WebAssembly.Instance prototype
      if (window.WebAssembly.Instance && window.WebAssembly.Instance.prototype) {
        const instanceProps = ['sourceMapURL', '_sourceMapURL', 'sourceMap', '_sourceMap'];
        instanceProps.forEach(prop => {
          if (window.WebAssembly.Instance.prototype[prop] === null || 
              window.WebAssembly.Instance.prototype[prop] === '' || 
              window.WebAssembly.Instance.prototype[prop] === undefined) {
            delete window.WebAssembly.Instance.prototype[prop];
          }
        });
      }
    }
    
    // Clear any global source map variables
    if (typeof globalThis !== 'undefined') {
      const globalProps = ['sourceMapURL', '_sourceMapURL', 'sourceMap', '_sourceMap'];
      globalProps.forEach(prop => {
        if (globalThis[prop] === null || globalThis[prop] === '' || globalThis[prop] === undefined) {
          delete globalThis[prop];
        }
      });
    }
  } catch (e) {
    console.debug('Global source map cleanup warning:', e.message);
  }
}

// Global lazy loader instance
export const globalWasmLoader = new WasmLazyLoader();

// Make diagnostics available globally for debugging
if (typeof window !== 'undefined') {
  window.runWasmDiagnostics = () => globalWasmLoader.runDiagnostics();
  window.wasmLoader = globalWasmLoader;
}

// Auto-preload critical modules when available
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Clean up source maps before loading modules
    cleanupGlobalSourceMaps();
    
    globalWasmLoader.preloadCriticalModules().catch(error => {
      console.warn('Failed to preload critical WASM modules:', error);
    });
  });
}
