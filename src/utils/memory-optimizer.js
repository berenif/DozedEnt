/**
 * Memory Optimization System
 * Implements object pooling, garbage collection monitoring, and memory leak detection
 */

export class MemoryOptimizer {
  constructor() {
    // Object pools for frequently created/destroyed objects
    this.pools = {
      particles: [],
      effects: [],
      animations: [],
      vectors: [],
      transforms: []
    };
    
    // Pool configuration
    this.poolConfig = {
      particles: { maxSize: 1000, prealloc: 200 },
      effects: { maxSize: 100, prealloc: 20 },
      animations: { maxSize: 50, prealloc: 10 },
      vectors: { maxSize: 500, prealloc: 100 },
      transforms: { maxSize: 200, prealloc: 50 }
    };
    
    // Memory monitoring
    this.memoryStats = {
      allocated: 0,
      used: 0,
      gcCount: 0,
      lastGC: 0,
      peakUsage: 0,
      leakThreshold: 100 * 1024 * 1024, // 100MB
      history: []
    };
    
    // Performance tracking
    this.performanceMetrics = {
      poolHits: 0,
      poolMisses: 0,
      allocations: 0,
      deallocations: 0
    };
    
    // Configuration
    this.config = {
      monitoringInterval: 5000, // 5 seconds
      gcThreshold: 50 * 1024 * 1024, // 50MB
      autoOptimize: true,
      debugMode: false
    };
    
    this.initialize();
  }

  /**
   * Initialize the memory optimizer
   * @private
   */
  initialize() {
    // Pre-allocate objects for pools
    this.preallocatePools();
    
    // Start memory monitoring
    this.startMonitoring();
    
    // Hook into global error handling for leak detection
    this.setupLeakDetection();
    
    console.log('🧠 Memory optimizer initialized');
  }

  /**
   * Pre-allocate objects for object pools
   * @private
   */
  preallocatePools() {
    Object.keys(this.poolConfig).forEach(poolName => {
      const config = this.poolConfig[poolName];
      const pool = this.pools[poolName];
      
      for (let i = 0; i < config.prealloc; i++) {
        pool.push(this.createPooledObject(poolName));
      }
      
      if (this.config.debugMode) {
        console.log(`Pre-allocated ${config.prealloc} objects for ${poolName} pool`);
      }
    });
  }

  /**
   * Create a pooled object of the specified type
   * @param {string} type - Object type
   * @returns {Object} Pooled object
   * @private
   */
  createPooledObject(type) {
    switch (type) {
      case 'particles':
        return {
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0, vz: 0,
          life: 0, maxLife: 1,
          size: 1, color: '#ffffff',
          alpha: 1, rotation: 0,
          active: false,
          reset() {
            this.x = this.y = this.z = 0;
            this.vx = this.vy = this.vz = 0;
            this.life = 0;
            this.maxLife = 1;
            this.size = 1;
            this.color = '#ffffff';
            this.alpha = 1;
            this.rotation = 0;
            this.active = false;
          }
        };
        
      case 'effects':
        return {
          type: 'none',
          duration: 0,
          progress: 0,
          intensity: 1,
          active: false,
          reset() {
            this.type = 'none';
            this.duration = 0;
            this.progress = 0;
            this.intensity = 1;
            this.active = false;
          }
        };
        
      case 'animations':
        return {
          name: '',
          frame: 0,
          time: 0,
          speed: 1,
          loop: false,
          active: false,
          reset() {
            this.name = '';
            this.frame = 0;
            this.time = 0;
            this.speed = 1;
            this.loop = false;
            this.active = false;
          }
        };
        
      case 'vectors':
        return {
          x: 0, y: 0, z: 0,
          set(x, y, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
          },
          reset() {
            this.x = this.y = this.z = 0;
          }
        };
        
      case 'transforms':
        return {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          reset() {
            this.position.x = this.position.y = this.position.z = 0;
            this.rotation.x = this.rotation.y = this.rotation.z = 0;
            this.scale.x = this.scale.y = this.scale.z = 1;
          }
        };
        
      default:
        return {};
    }
  }

  /**
   * Get an object from the pool
   * @param {string} type - Object type
   * @returns {Object} Pooled object
   */
  getPooledObject(type) {
    const pool = this.pools[type];
    if (!pool) {
      console.warn(`Unknown pool type: ${type}`);
      return null;
    }
    
    // Try to get from pool
    if (pool.length > 0) {
      const obj = pool.pop();
      obj.reset();
      this.performanceMetrics.poolHits++;
      return obj;
    }
    
    // Pool is empty, create new object
    this.performanceMetrics.poolMisses++;
    this.performanceMetrics.allocations++;
    return this.createPooledObject(type);
  }

  /**
   * Return an object to the pool
   * @param {string} type - Object type
   * @param {Object} obj - Object to return
   */
  returnPooledObject(type, obj) {
    const pool = this.pools[type];
    const config = this.poolConfig[type];
    
    if (!pool || !config) {
      console.warn(`Unknown pool type: ${type}`);
      return;
    }
    
    // Don't exceed max pool size
    if (pool.length >= config.maxSize) {
      this.performanceMetrics.deallocations++;
      return;
    }
    
    // Reset object and return to pool
    if (obj && typeof obj.reset === 'function') {
      obj.reset();
    }
    
    pool.push(obj);
  }

  /**
   * Start memory monitoring
   * @private
   */
  startMonitoring() {
    if (!performance.memory) {
      console.debug('Memory monitoring not available in this environment (performance.memory API not supported)');
      return;
    }
    
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryStats();
      this.checkForLeaks();
      this.autoOptimize();
    }, this.config.monitoringInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update memory statistics
   * @private
   */
  updateMemoryStats() {
    if (!performance.memory) {return;}
    
    const memory = performance.memory;
    const now = performance.now();
    
    // Check for garbage collection
    if (memory.usedJSHeapSize < this.memoryStats.used) {
      this.memoryStats.gcCount++;
      this.memoryStats.lastGC = now;
    }
    
    // Update stats
    this.memoryStats.used = memory.usedJSHeapSize;
    this.memoryStats.allocated = memory.totalJSHeapSize;
    this.memoryStats.peakUsage = Math.max(this.memoryStats.peakUsage, this.memoryStats.used);
    
    // Add to history
    this.memoryStats.history.push({
      timestamp: now,
      used: this.memoryStats.used,
      allocated: this.memoryStats.allocated
    });
    
    // Limit history size
    if (this.memoryStats.history.length > 100) {
      this.memoryStats.history.shift();
    }
  }

  /**
   * Check for potential memory leaks
   * @private
   */
  checkForLeaks() {
    if (this.memoryStats.used > this.memoryStats.leakThreshold) {
      console.warn(`🚨 Potential memory leak detected: ${(this.memoryStats.used / 1024 / 1024).toFixed(1)}MB used`);
      
      // Force garbage collection if available
      try {
        const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                         typeof global !== 'undefined' ? global : 
                         typeof window !== 'undefined' ? window : {};
        if (globalObj.gc && typeof globalObj.gc === 'function') {
          console.log('🗑️ Forcing garbage collection');
          globalObj.gc();
        }
      } catch (e) {
        console.warn('Could not access global gc function:', e.message);
      }
    }
    
    // Check for memory growth trend
    if (this.memoryStats.history.length >= 10) {
      const recent = this.memoryStats.history.slice(-10);
      const trend = recent[recent.length - 1].used - recent[0].used;
      
      if (trend > 10 * 1024 * 1024) { // 10MB growth
        console.warn(`📈 Memory growth trend detected: ${(trend / 1024 / 1024).toFixed(1)}MB over recent samples`);
      }
    }
  }

  /**
   * Automatic optimization based on memory usage
   * @private
   */
  autoOptimize() {
    if (!this.config.autoOptimize) {return;}
    
    const usageMB = this.memoryStats.used / 1024 / 1024;
    
    // Aggressive optimization if memory usage is high
    if (usageMB > 80) {
      this.optimizeAggressively();
    } else if (usageMB > 50) {
      this.optimizeModerately();
    }
  }

  /**
   * Moderate memory optimization
   * @private
   */
  optimizeModerately() {
    // Reduce pool sizes slightly
    Object.keys(this.pools).forEach(poolName => {
      const pool = this.pools[poolName];
      const targetSize = Math.floor(pool.length * 0.8);
      
      while (pool.length > targetSize) {
        pool.pop();
        this.performanceMetrics.deallocations++;
      }
    });
    
    if (this.config.debugMode) {
      console.log('🔧 Applied moderate memory optimization');
    }
  }

  /**
   * Aggressive memory optimization
   * @private
   */
  optimizeAggressively() {
    // Reduce pool sizes significantly
    Object.keys(this.pools).forEach(poolName => {
      const pool = this.pools[poolName];
      const targetSize = Math.floor(pool.length * 0.5);
      
      while (pool.length > targetSize) {
        pool.pop();
        this.performanceMetrics.deallocations++;
      }
    });
    
    // Force garbage collection if available
    try {
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                       typeof global !== 'undefined' ? global : 
                       typeof window !== 'undefined' ? window : {};
      if (globalObj.gc && typeof globalObj.gc === 'function') {
        globalObj.gc();
      }
    } catch (e) {
      console.warn('Could not access global gc function:', e.message);
    }
    
    console.log('🚨 Applied aggressive memory optimization');
  }

  /**
   * Setup memory leak detection
   * @private
   */
  setupLeakDetection() {
    // Monitor for common leak patterns
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    let eventListenerCount = 0;
    
    EventTarget.prototype.addEventListener = function(...args) {
      eventListenerCount++;
      if (eventListenerCount > 1000) {
        console.warn('🚨 High number of event listeners detected:', eventListenerCount);
      }
      return originalAddEventListener.apply(this, args);
    };
    
    // Monitor for timer leaks
    const originalSetInterval = setInterval;
    let intervalCount = 0;
    
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     typeof global !== 'undefined' ? global : 
                     typeof window !== 'undefined' ? window : {};
    
    if (globalObj.setInterval) {
      globalObj.setInterval = function(...args) {
        intervalCount++;
        if (intervalCount > 50) {
          console.warn('🚨 High number of intervals detected:', intervalCount);
        }
        return originalSetInterval.apply(this, args);
      };
    }
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    return {
      ...this.memoryStats,
      poolStats: Object.keys(this.pools).reduce((stats, poolName) => {
        stats[poolName] = {
          size: this.pools[poolName].length,
          maxSize: this.poolConfig[poolName].maxSize
        };
        return stats;
      }, {}),
      performance: { ...this.performanceMetrics }
    };
  }

  /**
   * Get pool efficiency metrics
   * @returns {Object} Pool efficiency data
   */
  getPoolEfficiency() {
    const total = this.performanceMetrics.poolHits + this.performanceMetrics.poolMisses;
    const hitRate = total > 0 ? (this.performanceMetrics.poolHits / total) * 100 : 0;
    
    return {
      hitRate: hitRate.toFixed(1) + '%',
      hits: this.performanceMetrics.poolHits,
      misses: this.performanceMetrics.poolMisses,
      allocations: this.performanceMetrics.allocations,
      deallocations: this.performanceMetrics.deallocations
    };
  }

  /**
   * Manual garbage collection trigger
   */
  forceGarbageCollection() {
    try {
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                       typeof global !== 'undefined' ? global : 
                       typeof window !== 'undefined' ? window : {};
      if (globalObj.gc && typeof globalObj.gc === 'function') {
        console.log('🗑️ Manually triggering garbage collection');
        globalObj.gc();
        return true;
      }
    } catch (e) {
      console.warn('Could not access global gc function:', e.message);
    }
    
    console.warn('Garbage collection not available');
    return false;
  }

  /**
   * Reset all pools and statistics
   */
  reset() {
    // Clear all pools
    Object.keys(this.pools).forEach(poolName => {
      this.pools[poolName].length = 0;
    });
    
    // Reset statistics
    this.performanceMetrics = {
      poolHits: 0,
      poolMisses: 0,
      allocations: 0,
      deallocations: 0
    };
    
    // Re-preallocate pools
    this.preallocatePools();
    
    console.log('🔄 Memory optimizer reset');
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy() {
    this.stopMonitoring();
    this.reset();
    console.log('🧠 Memory optimizer destroyed');
  }
}

// Global memory optimizer instance
export const globalMemoryOptimizer = new MemoryOptimizer();
