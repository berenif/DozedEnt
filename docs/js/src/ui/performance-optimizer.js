/**
 * Performance Optimizer for Modern Roguelite UI
 * Ensures 60fps performance on mid-tier laptops
 * Implements frame timing, memory management, and render optimization
 */

export class PerformanceOptimizer {
  constructor() {
    // Performance metrics
    this.metrics = {
      frameTime: 0,
      avgFrameTime: 0,
      fps: 60,
      memoryUsage: 0,
      renderCalls: 0,
      wasmCalls: 0
    };
    
    // Performance targets (as per guidelines)
    this.targets = {
      maxFrameTime: 16.67, // 60 FPS
      maxMemoryGrowth: 10 * 1024 * 1024, // 10MB per session
      maxWASMMemory: 32 * 1024 * 1024, // 32MB total
      maxGCFrequency: 1000 // max 1 GC per second
    };
    
    // Frame timing
    this.frameHistory = [];
    this.frameHistorySize = 60; // 1 second at 60fps
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Memory tracking
    this.initialMemory = 0;
    this.lastMemoryCheck = 0;
    this.memoryCheckInterval = 5000; // 5 seconds
    
    // Render optimization
    this.renderQueue = [];
    this.deferredUpdates = new Set();
    this.updateBatch = new Map();
    
    // Object pooling
    this.pools = new Map();
    
    // Performance monitoring
    this.isMonitoring = false;
    this.performanceObserver = null;
    
    // Throttling and debouncing
    this.throttledFunctions = new Map();
    this.debouncedFunctions = new Map();
    
    this.initialize();
  }

  /**
   * Initialize performance monitoring
   */
  initialize() {
    this.setupPerformanceObserver();
    this.initializeObjectPools();
    this.startMonitoring();
    
    // Initial memory baseline
    if (performance.memory) {
      this.initialMemory = performance.memory.usedJSHeapSize;
    }
  }

  /**
   * Setup Performance Observer for detailed metrics
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });
      
      try {
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  /**
   * Process performance entries
   */
  processPerformanceEntry(entry) {
    switch (entry.entryType) {
      case 'measure':
        if (entry.name.startsWith('ui-update')) {
          this.metrics.renderCalls++;
        }
        break;
      case 'paint':
        // Track paint timing
        break;
    }
  }

  /**
   * Initialize object pools for common UI elements
   */
  initializeObjectPools() {
    // Damage number pool
    this.createPool('damageNumbers', () => {
      const element = document.createElement('div');
      element.className = 'damage-number pooled';
      return element;
    }, 20);
    
    // Pickup notification pool
    this.createPool('pickupNotifications', () => {
      const element = document.createElement('div');
      element.className = 'pickup-notification pooled';
      return element;
    }, 10);
    
    // Status effect pool
    this.createPool('statusEffects', () => {
      const element = document.createElement('div');
      element.className = 'status-effect pooled';
      return element;
    }, 15);
  }

  /**
   * Create an object pool
   */
  createPool(name, factory, initialSize = 10) {
    const pool = {
      objects: [],
      factory: factory,
      active: new Set(),
      maxSize: initialSize * 2
    };
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.objects.push(factory());
    }
    
    this.pools.set(name, pool);
  }

  /**
   * Get object from pool
   */
  getFromPool(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      return null;
    }
    
    let obj = pool.objects.pop();
    if (!obj) {
      // Pool exhausted, create new object
      obj = pool.factory();
    }
    
    pool.active.add(obj);
    return obj;
  }

  /**
   * Return object to pool
   */
  returnToPool(poolName, obj) {
    const pool = this.pools.get(poolName);
    if (!pool || !pool.active.has(obj)) {
      return;
    }
    
    pool.active.delete(obj);
    
    // Reset object state
    this.resetPooledObject(obj);
    
    // Return to pool if not at max capacity
    if (pool.objects.length < pool.maxSize) {
      pool.objects.push(obj);
    } else if (obj.parentNode) {
      // Pool full, remove from DOM
      obj.parentNode.removeChild(obj);
    }
  }

  /**
   * Reset pooled object to default state
   */
  resetPooledObject(obj) {
    // Clear common properties
    obj.textContent = '';
    obj.className = obj.className.replace(/\s*(show|active|fade-out)\s*/g, ' ').trim();
    obj.style.transform = '';
    obj.style.opacity = '';
    obj.style.animation = '';
    
    // Remove from DOM if attached
    if (obj.parentNode) {
      obj.parentNode.removeChild(obj);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.monitoringLoop();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
  }

  /**
   * Main monitoring loop
   */
  monitoringLoop() {
    if (!this.isMonitoring) {
      return;
    }
    
    const now = performance.now();
    
    // Calculate frame time
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.updateFrameMetrics(frameTime);
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Check memory usage periodically
    if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
      this.checkMemoryUsage();
      this.lastMemoryCheck = now;
    }
    
    // Process deferred updates
    this.processDeferredUpdates();
    
    // Process update batches
    this.processUpdateBatches();
    
    requestAnimationFrame(() => this.monitoringLoop());
  }

  /**
   * Update frame timing metrics
   */
  updateFrameMetrics(frameTime) {
    this.metrics.frameTime = frameTime;
    
    // Update frame history
    this.frameHistory.push(frameTime);
    if (this.frameHistory.length > this.frameHistorySize) {
      this.frameHistory.shift();
    }
    
    // Calculate average frame time and FPS
    if (this.frameHistory.length > 0) {
      const sum = this.frameHistory.reduce((a, b) => a + b, 0);
      this.metrics.avgFrameTime = sum / this.frameHistory.length;
      this.metrics.fps = 1000 / this.metrics.avgFrameTime;
    }
    
    // Check for performance issues
    if (frameTime > this.targets.maxFrameTime * 1.5) {
      this.handlePerformanceIssue('frame-time', frameTime);
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    if (!performance.memory) {
      return;
    }
    
    const currentMemory = performance.memory.usedJSHeapSize;
    this.metrics.memoryUsage = currentMemory - this.initialMemory;
    
    // Check for memory growth
    if (this.metrics.memoryUsage > this.targets.maxMemoryGrowth) {
      this.handlePerformanceIssue('memory-growth', this.metrics.memoryUsage);
    }
    
    // Check for GC pressure
    const heapLimit = performance.memory.jsHeapSizeLimit;
    const usageRatio = currentMemory / heapLimit;
    
    if (usageRatio > 0.8) {
      this.handlePerformanceIssue('memory-pressure', usageRatio);
    }
  }

  /**
   * Handle performance issues
   */
  handlePerformanceIssue(type, value) {
    console.warn(`Performance issue detected: ${type}`, value);
    
    switch (type) {
      case 'frame-time':
        this.optimizeFrameTime();
        break;
      case 'memory-growth':
        this.optimizeMemoryUsage();
        break;
      case 'memory-pressure':
        this.forceGarbageCollection();
        break;
    }
    
    // Dispatch performance warning event
    const event = new CustomEvent('performance-warning', {
      detail: { type, value, metrics: this.getMetrics() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Optimize frame time performance
   */
  optimizeFrameTime() {
    // Reduce animation quality
    document.documentElement.classList.add('performance-mode');
    
    // Defer non-critical updates
    this.increaseDeferredUpdateThreshold();
    
    // Reduce update frequency for expensive operations
    this.throttleExpensiveOperations();
  }

  /**
   * Optimize memory usage
   */
  optimizeMemoryUsage() {
    // Clear object pools
    this.clearObjectPools();
    
    // Clear caches
    this.clearCaches();
    
    // Defer garbage collection
    if (window.gc) {
      setTimeout(() => window.gc(), 100);
    }
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection() {
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Clear object pools to free memory
   */
  clearObjectPools() {
    for (const [, pool] of this.pools) {
      // Remove inactive objects from DOM
      pool.objects.forEach(obj => {
        if (obj.parentNode) {
          obj.parentNode.removeChild(obj);
        }
      });
      
      // Clear pool
      pool.objects = [];
    }
  }

  /**
   * Clear various caches
   */
  clearCaches() {
    // Clear throttled function cache
    this.throttledFunctions.clear();
    this.debouncedFunctions.clear();
    
    // Clear update batches
    this.updateBatch.clear();
    this.deferredUpdates.clear();
  }

  /**
   * Increase threshold for deferred updates
   */
  increaseDeferredUpdateThreshold() {
    // Implementation would depend on specific UI update system
  }

  /**
   * Throttle expensive operations
   */
  throttleExpensiveOperations() {
    // Reduce minimap update frequency
    this.throttleFunction('updateMinimap', 100); // 10fps instead of 60fps
    
    // Reduce status effect updates
    this.throttleFunction('updateStatusEffects', 200); // 5fps
    
    // Reduce particle updates
    this.throttleFunction('updateParticles', 50); // 20fps
  }

  /**
   * Defer an update to the next frame or later
   */
  deferUpdate(updateFunction, priority = 'normal') {
    const deferredUpdate = {
      function: updateFunction,
      priority: priority,
      timestamp: performance.now()
    };
    
    this.deferredUpdates.add(deferredUpdate);
  }

  /**
   * Process deferred updates
   */
  processDeferredUpdates() {
    if (this.deferredUpdates.size === 0) {
      return;
    }
    
    const maxProcessingTime = 5; // Max 5ms per frame for deferred updates
    const startTime = performance.now();
    
    // Sort by priority
    const updates = Array.from(this.deferredUpdates).sort((a, b) => {
      const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    for (const update of updates) {
      if (performance.now() - startTime > maxProcessingTime) {
        break; // Time budget exhausted
      }
      
      try {
        update.function();
        this.deferredUpdates.delete(update);
      } catch (error) {
        console.error('Error in deferred update:', error);
        this.deferredUpdates.delete(update);
      }
    }
  }

  /**
   * Batch similar updates together
   */
  batchUpdate(type, updateFunction) {
    if (!this.updateBatch.has(type)) {
      this.updateBatch.set(type, []);
    }
    
    this.updateBatch.get(type).push(updateFunction);
  }

  /**
   * Process batched updates
   */
  processUpdateBatches() {
    for (const [type, updates] of this.updateBatch) {
      if (updates.length === 0) {
        continue;
      }
      
      // Process all updates of this type together
      performance.mark(`batch-${type}-start`);
      
      updates.forEach(updateFn => {
        try {
          updateFn();
        } catch (error) {
          console.error(`Error in batched update (${type}):`, error);
        }
      });
      
      performance.mark(`batch-${type}-end`);
      performance.measure(`batch-${type}`, `batch-${type}-start`, `batch-${type}-end`);
      
      // Clear processed updates
      updates.length = 0;
    }
  }

  /**
   * Throttle a function to reduce call frequency
   */
  throttleFunction(name, delay) {
    const existing = this.throttledFunctions.get(name);
    if (existing) {
      existing.delay = delay;
      return existing.throttled;
    }
    
    let lastCall = 0;
        const throttled = (originalFunction) => (...args) => {
          const now = performance.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            return originalFunction.apply(this, args);
          }
        };
    
    this.throttledFunctions.set(name, { throttled, delay });
    return throttled;
  }

  /**
   * Debounce a function to reduce call frequency
   */
  debounceFunction(name, delay) {
    const existing = this.debouncedFunctions.get(name);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    
    const debounced = (originalFunction) => (...args) => {
      const timeout = setTimeout(() => {
        originalFunction.apply(this, args);
        this.debouncedFunctions.delete(name);
      }, delay);
      
      this.debouncedFunctions.set(name, { timeout });
    };
    
    return debounced;
  }

  /**
   * Optimize DOM operations
   */
  optimizeDOMOperations() {
    // Use DocumentFragment for multiple DOM insertions
    return {
      createFragment: () => document.createDocumentFragment(),
      
      batchDOMUpdates: (updates) => {
        const fragment = document.createDocumentFragment();
        updates.forEach(update => {
          if (typeof update === 'function') {
            update(fragment);
          }
        });
        return fragment;
      },
      
      measureAndUpdate: (element, updateFn) => {
        // Batch read and write operations
        const measurements = {};
        
        // Read phase
        measurements.rect = element.getBoundingClientRect();
        measurements.computedStyle = getComputedStyle(element);
        
        // Write phase
        updateFn(measurements);
      }
    };
  }

  /**
   * Optimize canvas operations
   */
  optimizeCanvasOperations(canvas, ctx) {
    return {
      // Use off-screen canvas for complex drawings
      createOffscreenCanvas: (width, height) => {
        if ('OffscreenCanvas' in window) {
          return new OffscreenCanvas(width, height);
        }
        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        return offscreen;
      },
      
      // Batch canvas operations
      batchCanvasOps: (operations) => {
        ctx.save();
        operations.forEach(op => op(ctx));
        ctx.restore();
      },
      
      // Use image data for pixel-level operations
      optimizePixelOps: (imageData, operation) => {
        const data = imageData.data;
        const length = data.length;
        
        for (let i = 0; i < length; i += 4) {
          operation(data, i);
        }
        
        return imageData;
      }
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      frameHistory: [...this.frameHistory],
      poolStats: this.getPoolStats(),
      isOptimized: document.documentElement.classList.contains('performance-mode')
    };
  }

  /**
   * Get object pool statistics
   */
  getPoolStats() {
    const stats = {};
    
    for (const [name, pool] of this.pools) {
      stats[name] = {
        available: pool.objects.length,
        active: pool.active.size,
        total: pool.objects.length + pool.active.size,
        maxSize: pool.maxSize
      };
    }
    
    return stats;
  }

  /**
   * Enable performance monitoring dashboard
   */
  enableDashboard() {
    // Create performance dashboard element
    const dashboard = document.createElement('div');
    dashboard.id = 'performance-dashboard';
    dashboard.className = 'performance-dashboard';
    dashboard.innerHTML = `
      <div class="dashboard-header">Performance</div>
      <div class="dashboard-content">
        <div class="metric">
          <span class="label">FPS:</span>
          <span class="value" id="fps-value">60</span>
        </div>
        <div class="metric">
          <span class="label">Frame Time:</span>
          <span class="value" id="frametime-value">16.67ms</span>
        </div>
        <div class="metric">
          <span class="label">Memory:</span>
          <span class="value" id="memory-value">0MB</span>
        </div>
        <div class="metric">
          <span class="label">Render Calls:</span>
          <span class="value" id="renders-value">0</span>
        </div>
      </div>
    `;
    
    // Style the dashboard
    dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
    `;
    
    document.body.appendChild(dashboard);
    
    // Update dashboard periodically
    setInterval(() => this.updateDashboard(), 100);
  }

  /**
   * Update performance dashboard
   */
  updateDashboard() {
    const fpsValue = document.getElementById('fps-value');
    const frameTimeValue = document.getElementById('frametime-value');
    const memoryValue = document.getElementById('memory-value');
    const rendersValue = document.getElementById('renders-value');
    
    if (fpsValue) {
      fpsValue.textContent = Math.round(this.metrics.fps);
    }
    if (frameTimeValue) {
      frameTimeValue.textContent = this.metrics.avgFrameTime.toFixed(2) + 'ms';
    }
    if (memoryValue) {
      memoryValue.textContent = (this.metrics.memoryUsage / 1024 / 1024).toFixed(1) + 'MB';
    }
    if (rendersValue) {
      rendersValue.textContent = this.metrics.renderCalls;
    }
  }

  /**
   * Cleanup and destroy performance optimizer
   */
  destroy() {
    this.stopMonitoring();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.clearObjectPools();
    this.clearCaches();
    
    // Remove dashboard
    const dashboard = document.getElementById('performance-dashboard');
    if (dashboard) {
      dashboard.remove();
    }
  }
}