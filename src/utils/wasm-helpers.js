/**
 * WebAssembly Helper Utilities
 * Provides utilities for WASM module management, memory optimization, and debugging
 * Follows WASM-first architecture principles from AGENTS.md
 */

/**
 * WASM Memory Manager for efficient memory operations
 */
export class WasmMemoryManager {
  constructor(memory, options = {}) {
    this.memory = memory;
    this.options = {
      pageSize: options.pageSize || 65536, // 64KB per page
      maxPages: options.maxPages || 32768, // Max 2GB
      growthFactor: options.growthFactor || 2,
      verbose: options.verbose || false,
      ...options
    };
    
    this.allocations = new Map();
    this.freeList = [];
    this.totalAllocated = 0;
    this.peakAllocated = 0;
  }

  /**
   * Allocate memory block
   * @param {number} size - Size in bytes
   * @returns {number} Pointer to allocated memory
   */
  allocate(size) {
    // Align to 8 bytes
    const alignedSize = Math.ceil(size / 8) * 8;
    
    // Try to find a free block
    for (let i = 0; i < this.freeList.length; i++) {
      const block = this.freeList[i];
      if (block.size >= alignedSize) {
        const ptr = block.ptr;
        
        // Split block if necessary
        if (block.size > alignedSize) {
          block.ptr += alignedSize;
          block.size -= alignedSize;
        } else {
          this.freeList.splice(i, 1);
        }
        
        this.allocations.set(ptr, { size: alignedSize, allocated: Date.now() });
        this.totalAllocated += alignedSize;
        this.peakAllocated = Math.max(this.peakAllocated, this.totalAllocated);
        
        if (this.options.verbose) {
          console.log(`Allocated ${alignedSize} bytes at 0x${ptr.toString(16)}`);
        }
        
        return ptr;
      }
    }
    
    // No suitable free block, need to grow memory
    const currentPages = this.memory.buffer.byteLength / this.options.pageSize;
    const requiredPages = Math.ceil(alignedSize / this.options.pageSize);
    const newPages = Math.max(requiredPages, Math.ceil(currentPages * (this.options.growthFactor - 1)));
    
    if (currentPages + newPages > this.options.maxPages) {
      throw new Error(`Memory allocation failed: would exceed max pages (${this.options.maxPages})`);
    }
    
    const ptr = this.memory.buffer.byteLength;
    this.memory.grow(newPages);
    
    // Add remaining space to free list
    const allocatedSize = newPages * this.options.pageSize;
    if (allocatedSize > alignedSize) {
      this.freeList.push({
        ptr: ptr + alignedSize,
        size: allocatedSize - alignedSize
      });
    }
    
    this.allocations.set(ptr, { size: alignedSize, allocated: Date.now() });
    this.totalAllocated += alignedSize;
    this.peakAllocated = Math.max(this.peakAllocated, this.totalAllocated);
    
    if (this.options.verbose) {
      console.log(`Grew memory by ${newPages} pages, allocated ${alignedSize} bytes at 0x${ptr.toString(16)}`);
    }
    
    return ptr;
  }

  /**
   * Free memory block
   * @param {number} ptr - Pointer to memory block
   */
  free(ptr) {
    const allocation = this.allocations.get(ptr);
    if (!allocation) {
      console.warn(`Attempted to free unallocated memory at 0x${ptr.toString(16)}`);
      return;
    }
    
    this.allocations.delete(ptr);
    this.totalAllocated -= allocation.size;
    
    // Add to free list and merge adjacent blocks
    this.freeList.push({ ptr, size: allocation.size });
    this.mergeFreeBlocks();
    
    if (this.options.verbose) {
      console.log(`Freed ${allocation.size} bytes at 0x${ptr.toString(16)}`);
    }
  }

  /**
   * Merge adjacent free blocks
   * @private
   */
  mergeFreeBlocks() {
    this.freeList.sort((a, b) => a.ptr - b.ptr);
    
    for (let i = 0; i < this.freeList.length - 1; i++) {
      const current = this.freeList[i];
      const next = this.freeList[i + 1];
      
      if (current.ptr + current.size === next.ptr) {
        current.size += next.size;
        this.freeList.splice(i + 1, 1);
        i--;
      }
    }
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    return {
      totalPages: this.memory.buffer.byteLength / this.options.pageSize,
      usedBytes: this.totalAllocated,
      freeBytes: this.freeList.reduce((sum, block) => sum + block.size, 0),
      peakBytes: this.peakAllocated,
      allocations: this.allocations.size,
      fragmentation: this.calculateFragmentation()
    };
  }

  /**
   * Calculate memory fragmentation
   * @returns {number} Fragmentation percentage
   * @private
   */
  calculateFragmentation() {
    if (this.freeList.length <= 1) {
      return 0;
    }
    
    const totalFree = this.freeList.reduce((sum, block) => sum + block.size, 0);
    const largestFree = Math.max(...this.freeList.map(block => block.size));
    
    return ((totalFree - largestFree) / totalFree) * 100;
  }

  /**
   * Defragment memory
   */
  defragment() {
    console.warn('Memory defragmentation not yet implemented');
    // TODO: Implement memory defragmentation
  }
}

/**
 * WASM Module Loader with caching and validation
 */
export class WasmModuleLoader {
  constructor(options = {}) {
    this.options = {
      cache: options.cache !== false,
      validate: options.validate !== false,
      streaming: options.streaming !== false,
      importObject: options.importObject || {},
      verbose: options.verbose || false,
      ...options
    };
    
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load WASM module from URL or bytes
   * @param {string|ArrayBuffer} source - Module source
   * @param {Object} importObject - Import object
   * @returns {Promise<Object>} Module instance
   */
  async load(source, importObject = null) {
    const imports = importObject || this.options.importObject;
    
    // Check cache
    if (this.options.cache && typeof source === 'string') {
      if (this.cache.has(source)) {
        if (this.options.verbose) {
          console.log(`Loading cached WASM module: ${source}`);
        }
        return this.cache.get(source);
      }
      
      // Check if already loading
      if (this.loadingPromises.has(source)) {
        return await this.loadingPromises.get(source);
      }
    }
    
    // Create loading promise
    const loadingPromise = this._loadModule(source, imports);
    
    if (typeof source === 'string') {
      this.loadingPromises.set(source, loadingPromise);
    }
    
    try {
      const instance = await loadingPromise;
      
      // Cache the instance
      if (this.options.cache && typeof source === 'string') {
        this.cache.set(source, instance);
      }
      
      return instance;
    } finally {
      if (typeof source === 'string') {
        this.loadingPromises.delete(source);
      }
    }
  }

  /**
   * Load module implementation
   * @param {string|ArrayBuffer} source - Module source
   * @param {Object} imports - Import object
   * @returns {Promise<Object>} Module instance
   * @private
   */
  async _loadModule(source, imports) {
    let moduleBytes;
    
    if (typeof source === 'string') {
      // Load from URL
      if (this.options.streaming && WebAssembly.instantiateStreaming) {
        try {
          const response = await fetch(source, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
          }
          
          const result = await WebAssembly.instantiateStreaming(response, imports);
          
          if (this.options.verbose) {
            console.log(`Loaded WASM module via streaming: ${source}`);
          }
          
          return result.instance;
        } catch (error) {
          if (this.options.verbose) {
            console.warn('Streaming instantiation failed, falling back to ArrayBuffer', error);
          }
        }
      }
      
      // Fallback to ArrayBuffer loading
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
      }
      moduleBytes = await response.arrayBuffer();
    } else {
      moduleBytes = source;
    }
    
    // Validate if requested
    if (this.options.validate) {
      const isValid = WebAssembly.validate(moduleBytes);
      if (!isValid) {
        throw new Error('Invalid WASM module');
      }
    }
    
    // Instantiate module
    const result = await WebAssembly.instantiate(moduleBytes, imports);
    
    if (this.options.verbose) {
      console.log(`Loaded WASM module: ${typeof source === 'string' ? source : 'ArrayBuffer'}`);
      console.log(`Exports: ${Object.keys(result.instance.exports).join(', ')}`);
    }
    
    return result.instance;
  }

  /**
   * Preload multiple modules
   * @param {Array<string>} urls - Module URLs
   * @returns {Promise<Map>} Map of loaded modules
   */
  async preloadModules(urls) {
    const promises = urls.map(url => 
      this.load(url).then(instance => [url, instance])
    );
    
    const results = await Promise.all(promises);
    return new Map(results);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    if (this.options.verbose) {
      console.log('WASM module cache cleared');
    }
  }
}

/**
 * WASM State Serializer for saving/loading state
 */
export class WasmStateSerializer {
  constructor(memory, exports) {
    this.memory = memory;
    this.exports = exports;
  }

  /**
   * Serialize WASM state to object
   * @param {Object} schema - State schema
   * @returns {Object} Serialized state
   */
  serialize(schema) {
    const state = {};
    
    for (const [key, config] of Object.entries(schema)) {
      if (config.type === 'function' && this.exports[config.getter]) {
        state[key] = this.exports[config.getter]();
      } else if (config.type === 'memory') {
        state[key] = this.readMemory(config.offset, config.size, config.dataType);
      }
    }
    
    return state;
  }

  /**
   * Deserialize state back to WASM
   * @param {Object} state - Serialized state
   * @param {Object} schema - State schema
   */
  deserialize(state, schema) {
    for (const [key, value] of Object.entries(state)) {
      const config = schema[key];
      if (!config) {continue;}
      
      if (config.type === 'function' && this.exports[config.setter]) {
        this.exports[config.setter](value);
      } else if (config.type === 'memory') {
        this.writeMemory(config.offset, value, config.dataType);
      }
    }
  }

  /**
   * Read from WASM memory
   * @param {number} offset - Memory offset
   * @param {number} size - Size in bytes
   * @param {string} dataType - Data type
   * @returns {*} Read value
   * @private
   */
  readMemory(offset, size, dataType) {
    const buffer = this.memory.buffer;
    
    switch (dataType) {
      case 'i32':
        return new Int32Array(buffer, offset, size / 4);
      case 'f32':
        return new Float32Array(buffer, offset, size / 4);
      case 'f64':
        return new Float64Array(buffer, offset, size / 8);
      case 'u8':
        return new Uint8Array(buffer, offset, size);
      default:
        return new Uint8Array(buffer, offset, size);
    }
  }

  /**
   * Write to WASM memory
   * @param {number} offset - Memory offset
   * @param {*} value - Value to write
   * @param {string} dataType - Data type
   * @private
   */
  writeMemory(offset, value, dataType) {
    const buffer = this.memory.buffer;
    
    switch (dataType) {
      case 'i32': {
        const view = new Int32Array(buffer, offset);
        view.set(value);
        break;
      }
      case 'f32': {
        const view = new Float32Array(buffer, offset);
        view.set(value);
        break;
      }
      case 'f64': {
        const view = new Float64Array(buffer, offset);
        view.set(value);
        break;
      }
      case 'u8':
      default: {
        const view = new Uint8Array(buffer, offset);
        view.set(value);
        break;
      }
    }
  }
}

/**
 * WASM Debug Helper for development
 */
export class WasmDebugHelper {
  constructor(instance, options = {}) {
    this.instance = instance;
    this.exports = instance.exports;
    this.memory = instance.exports.memory;
    this.options = {
      logCalls: options.logCalls || false,
      logMemory: options.logMemory || false,
      breakpoints: options.breakpoints || [],
      ...options
    };
    
    this.callCount = new Map();
    this.callHistory = [];
    
    if (this.options.logCalls) {
      this.wrapExports();
    }
  }

  /**
   * Wrap exports with logging
   * @private
   */
  wrapExports() {
    for (const [name, fn] of Object.entries(this.exports)) {
      if (typeof fn === 'function') {
        const original = fn;
        this.exports[name] = (...args) => {
          this.logCall(name, args);
          
          if (this.options.breakpoints.includes(name)) {
            debugger; // eslint-disable-line no-debugger
          }
          
          const result = original.apply(this.exports, args);
          this.logResult(name, result);
          
          return result;
        };
      }
    }
  }

  /**
   * Log function call
   * @param {string} name - Function name
   * @param {Array} args - Arguments
   * @private
   */
  logCall(name, args) {
    const count = (this.callCount.get(name) || 0) + 1;
    this.callCount.set(name, count);
    
    const call = {
      name,
      args: [...args],
      timestamp: performance.now(),
      count
    };
    
    this.callHistory.push(call);
    
    if (this.options.logCalls) {
      console.log(`WASM Call: ${name}(${args.join(', ')}) [#${count}]`);
    }
  }

  /**
   * Log function result
   * @param {string} name - Function name
   * @param {*} result - Result value
   * @private
   */
  logResult(name, result) {
    if (this.options.logCalls && result !== undefined) {
      console.log(`WASM Result: ${name} => ${result}`);
    }
  }

  /**
   * Dump memory region
   * @param {number} offset - Start offset
   * @param {number} length - Length in bytes
   * @param {string} format - Output format ('hex', 'ascii', 'i32', 'f32')
   * @returns {string} Memory dump
   */
  dumpMemory(offset, length, format = 'hex') {
    const buffer = this.memory.buffer;
    const bytes = new Uint8Array(buffer, offset, length);
    
    switch (format) {
      case 'hex':
        return Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
      
      case 'ascii':
        return Array.from(bytes)
          .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')
          .join('');
      
      case 'i32': {
        const view = new Int32Array(buffer, offset, length / 4);
        return Array.from(view).join(', ');
      }
      
      case 'f32': {
        const view = new Float32Array(buffer, offset, length / 4);
        return Array.from(view).join(', ');
      }
      
      default:
        return 'Unknown format';
    }
  }

  /**
   * Get call statistics
   * @returns {Object} Call statistics
   */
  getCallStats() {
    const stats = {};
    
    for (const [name, count] of this.callCount) {
      const calls = this.callHistory.filter(c => c.name === name);
      const times = [];
      
      for (let i = 1; i < calls.length; i++) {
        times.push(calls[i].timestamp - calls[i - 1].timestamp);
      }
      
      stats[name] = {
        count,
        avgTimeBetweenCalls: times.length > 0 
          ? times.reduce((a, b) => a + b, 0) / times.length 
          : 0
      };
    }
    
    return stats;
  }

  /**
   * Reset debug state
   */
  reset() {
    this.callCount.clear();
    this.callHistory = [];
  }
}

/**
 * Create WASM memory manager
 * @param {WebAssembly.Memory} memory - WASM memory
 * @param {Object} options - Options
 * @returns {WasmMemoryManager} Memory manager
 */
export function createMemoryManager(memory, options = {}) {
  return new WasmMemoryManager(memory, options);
}

/**
 * Create WASM module loader
 * @param {Object} options - Options
 * @returns {WasmModuleLoader} Module loader
 */
export function createModuleLoader(options = {}) {
  return new WasmModuleLoader(options);
}

/**
 * Create WASM state serializer
 * @param {WebAssembly.Memory} memory - WASM memory
 * @param {Object} exports - WASM exports
 * @returns {WasmStateSerializer} State serializer
 */
export function createStateSerializer(memory, exports) {
  return new WasmStateSerializer(memory, exports);
}

/**
 * Create WASM debug helper
 * @param {Object} instance - WASM instance
 * @param {Object} options - Options
 * @returns {WasmDebugHelper} Debug helper
 */
export function createDebugHelper(instance, options = {}) {
  return new WasmDebugHelper(instance, options);
}

export default {
  WasmMemoryManager,
  WasmModuleLoader,
  WasmStateSerializer,
  WasmDebugHelper,
  createMemoryManager,
  createModuleLoader,
  createStateSerializer,
  createDebugHelper
};