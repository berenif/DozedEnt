/**
 * Comprehensive Performance Profiling System
 * Monitors frame time, WASM/JS boundary calls, memory usage, and rendering performance
 */

export class PerformanceProfiler {
  constructor() {
    // Performance tracking
    this.metrics = {
      frameTime: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        history: [],
        target: 16.67 // 60 FPS
      },
      wasmCalls: {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        history: []
      },
      rendering: {
        drawCalls: 0,
        triangles: 0,
        time: 0,
        history: []
      },
      memory: {
        used: 0,
        allocated: 0,
        gcCount: 0,
        history: []
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        latency: 0,
        packetsLost: 0
      }
    };

    // Configuration
    this.config = {
      historySize: 300, // 5 seconds at 60fps
      sampleInterval: 100, // Sample every 100ms
      alertThresholds: {
        frameTime: 20, // Alert if frame time > 20ms
        memoryGrowth: 50 * 1024 * 1024, // 50MB
        gcFrequency: 2000 // Alert if GC more than every 2 seconds
      }
    };

    // State tracking
    this.isEnabled = false;
    this.startTime = 0;
    this.lastSampleTime = 0;
    this.frameCount = 0;
    this.alerts = [];
    
    // Performance hooks
    this.hooks = {
      beforeFrame: [],
      afterFrame: [],
      beforeWasmCall: [],
      afterWasmCall: [],
      beforeRender: [],
      afterRender: []
    };

    // Browser-specific performance APIs
    this.hasPerformanceObserver = 'PerformanceObserver' in window;
    this.hasMemoryAPI = 'memory' in performance;
    
    this.initializePerformanceObservers();
  }

  /**
   * Initialize performance observers for automatic monitoring
   * @private
   */
  initializePerformanceObservers() {
    if (this.hasPerformanceObserver) {
      try {
        // Monitor long tasks (>50ms)
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.addAlert('LONG_TASK', `Long task detected: ${entry.duration.toFixed(1)}ms`, entry);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Monitor layout shifts
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.value > 0.1) {
              this.addAlert('LAYOUT_SHIFT', `Large layout shift: ${entry.value.toFixed(3)}`, entry);
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

      } catch (error) {
        console.warn('Performance observers not fully supported:', error);
      }
    }
  }

  /**
   * Start performance profiling
   */
  start() {
    if (this.isEnabled) {return;}
    
    this.isEnabled = true;
    this.startTime = performance.now();
    this.lastSampleTime = this.startTime;
    this.frameCount = 0;
    
    console.log('🔍 Performance profiling started');
    
    // Start periodic sampling
    this.sampleInterval = setInterval(() => {
      this.samplePerformanceMetrics();
    }, this.config.sampleInterval);
  }

  /**
   * Stop performance profiling
   */
  stop() {
    if (!this.isEnabled) {return;}
    
    this.isEnabled = false;
    
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
    
    console.log('🔍 Performance profiling stopped');
    console.log('📊 Final metrics:', this.getMetricsSummary());
  }

  /**
   * Mark the beginning of a frame
   */
  beginFrame() {
    if (!this.isEnabled) {return;}
    
    this.frameStartTime = performance.now();
    this.frameCount++;
    
    // Call frame begin hooks
    this.hooks.beforeFrame.forEach(hook => {
      try {
        hook();
      } catch (error) {
        console.warn('Frame begin hook error:', error);
      }
    });
  }

  /**
   * Mark the end of a frame
   */
  endFrame() {
    if (!this.isEnabled || !this.frameStartTime) {return;}
    
    const frameTime = performance.now() - this.frameStartTime;
    this.updateFrameMetrics(frameTime);
    
    // Call frame end hooks
    this.hooks.afterFrame.forEach(hook => {
      try {
        hook(frameTime);
      } catch (error) {
        console.warn('Frame end hook error:', error);
      }
    });
    
    // Check for performance alerts
    this.checkFrameTimeAlert(frameTime);
  }

  /**
   * Mark the beginning of a WASM call
   * @param {string} functionName - Name of the WASM function
   */
  beginWasmCall(functionName = 'unknown') {
    if (!this.isEnabled) {return;}
    
    this.wasmCallStart = {
      time: performance.now(),
      name: functionName
    };
    
    this.hooks.beforeWasmCall.forEach(hook => {
      try {
        hook(functionName);
      } catch (error) {
        console.warn('WASM call begin hook error:', error);
      }
    });
  }

  /**
   * Mark the end of a WASM call
   */
  endWasmCall() {
    if (!this.isEnabled || !this.wasmCallStart) {return;}
    
    const callTime = performance.now() - this.wasmCallStart.time;
    this.updateWasmMetrics(callTime, this.wasmCallStart.name);
    
    this.hooks.afterWasmCall.forEach(hook => {
      try {
        hook(callTime, this.wasmCallStart.name);
      } catch (error) {
        console.warn('WASM call end hook error:', error);
      }
    });
    
    this.wasmCallStart = null;
  }

  /**
   * Mark the beginning of rendering
   */
  beginRender() {
    if (!this.isEnabled) {return;}
    
    this.renderStartTime = performance.now();
    this.renderStartDrawCalls = this.metrics.rendering.drawCalls;
    
    this.hooks.beforeRender.forEach(hook => {
      try {
        hook();
      } catch (error) {
        console.warn('Render begin hook error:', error);
      }
    });
  }

  /**
   * Mark the end of rendering
   */
  endRender() {
    if (!this.isEnabled || !this.renderStartTime) {return;}
    
    const renderTime = performance.now() - this.renderStartTime;
    const drawCalls = this.metrics.rendering.drawCalls - this.renderStartDrawCalls;
    
    this.updateRenderMetrics(renderTime, drawCalls);
    
    this.hooks.afterRender.forEach(hook => {
      try {
        hook(renderTime, drawCalls);
      } catch (error) {
        console.warn('Render end hook error:', error);
      }
    });
  }

  /**
   * Update frame time metrics
   * @param {number} frameTime - Frame time in milliseconds
   * @private
   */
  updateFrameMetrics(frameTime) {
    const metrics = this.metrics.frameTime;
    
    metrics.current = frameTime;
    metrics.min = Math.min(metrics.min, frameTime);
    metrics.max = Math.max(metrics.max, frameTime);
    
    metrics.history.push(frameTime);
    if (metrics.history.length > this.config.historySize) {
      metrics.history.shift();
    }
    
    // Calculate rolling average
    metrics.average = metrics.history.reduce((a, b) => a + b, 0) / metrics.history.length;
  }

  /**
   * Update WASM call metrics
   * @param {number} callTime - Call time in milliseconds
   * @param {string} functionName - Function name
   * @private
   */
  updateWasmMetrics(callTime, functionName) {
    const metrics = this.metrics.wasmCalls;
    
    metrics.count++;
    metrics.totalTime += callTime;
    metrics.averageTime = metrics.totalTime / metrics.count;
    
    metrics.history.push({ time: callTime, name: functionName, timestamp: performance.now() });
    if (metrics.history.length > this.config.historySize) {
      metrics.history.shift();
    }
  }

  /**
   * Update rendering metrics
   * @param {number} renderTime - Render time in milliseconds
   * @param {number} drawCalls - Number of draw calls
   * @private
   */
  updateRenderMetrics(renderTime, drawCalls) {
    const metrics = this.metrics.rendering;
    
    metrics.time = renderTime;
    metrics.drawCalls += drawCalls;
    
    metrics.history.push({ time: renderTime, drawCalls, timestamp: performance.now() });
    if (metrics.history.length > this.config.historySize) {
      metrics.history.shift();
    }
  }

  /**
   * Sample performance metrics periodically
   * @private
   */
  samplePerformanceMetrics() {
    const now = performance.now();
    
    // Sample memory usage
    if (this.hasMemoryAPI) {
      const memory = performance.memory;
      this.metrics.memory.used = memory.usedJSHeapSize;
      this.metrics.memory.allocated = memory.totalJSHeapSize;
      
      this.metrics.memory.history.push({
        used: memory.usedJSHeapSize,
        allocated: memory.totalJSHeapSize,
        timestamp: now
      });
      
      if (this.metrics.memory.history.length > this.config.historySize) {
        this.metrics.memory.history.shift();
      }
    }
    
    this.lastSampleTime = now;
  }

  /**
   * Check for frame time performance alerts
   * @param {number} frameTime - Current frame time
   * @private
   */
  checkFrameTimeAlert(frameTime) {
    if (frameTime > this.config.alertThresholds.frameTime) {
      this.addAlert('FRAME_TIME', `High frame time: ${frameTime.toFixed(1)}ms (target: ${this.metrics.frameTime.target}ms)`);
    }
  }

  /**
   * Add a performance alert
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} data - Additional data
   * @private
   */
  addAlert(type, message, data = null) {
    const alert = {
      type,
      message,
      data,
      timestamp: performance.now(),
      frame: this.frameCount
    };
    
    this.alerts.push(alert);
    
    // Limit alert history
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    console.warn(`⚠️ Performance Alert [${type}]: ${message}`);
  }

  /**
   * Get current metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    const runtime = performance.now() - this.startTime;
    const fps = this.frameCount / (runtime / 1000);
    
    return {
      runtime: runtime,
      fps: fps,
      frameCount: this.frameCount,
      frameTime: {
        current: this.metrics.frameTime.current,
        average: this.metrics.frameTime.average,
        min: this.metrics.frameTime.min,
        max: this.metrics.frameTime.max,
        p95: this.getPercentile(this.metrics.frameTime.history, 0.95)
      },
      wasmCalls: {
        count: this.metrics.wasmCalls.count,
        totalTime: this.metrics.wasmCalls.totalTime,
        averageTime: this.metrics.wasmCalls.averageTime,
        callsPerFrame: this.metrics.wasmCalls.count / this.frameCount
      },
      memory: this.hasMemoryAPI ? {
        used: this.metrics.memory.used,
        allocated: this.metrics.memory.allocated,
        efficiency: this.metrics.memory.used / this.metrics.memory.allocated
      } : null,
      alerts: this.alerts.length
    };
  }

  /**
   * Get detailed performance report
   * @returns {Object} Detailed performance data
   */
  getDetailedReport() {
    return {
      summary: this.getMetricsSummary(),
      metrics: this.metrics,
      alerts: this.alerts.slice(-20), // Last 20 alerts
      config: this.config
    };
  }

  /**
   * Calculate percentile from array
   * @param {Array} arr - Array of numbers
   * @param {number} percentile - Percentile (0-1)
   * @returns {number} Percentile value
   * @private
   */
  getPercentile(arr, percentile) {
    if (arr.length === 0) {return 0;}
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index] || 0;
  }

  /**
   * Add a performance hook
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addHook(event, callback) {
    if (this.hooks[event]) {
      this.hooks[event].push(callback);
    }
  }

  /**
   * Remove a performance hook
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeHook(event, callback) {
    if (this.hooks[event]) {
      const index = this.hooks[event].indexOf(callback);
      if (index > -1) {
        this.hooks[event].splice(index, 1);
      }
    }
  }

  /**
   * Export performance data for analysis
   * @returns {string} JSON string of performance data
   */
  exportData() {
    return JSON.stringify(this.getDetailedReport(), null, 2);
  }

  /**
   * Create a simple performance monitor overlay
   * @returns {HTMLElement} Performance overlay element
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'performance-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 10000;
      min-width: 200px;
    `;

    const updateOverlay = () => {
      if (!this.isEnabled) {
        overlay.style.display = 'none';
        return;
      }

      overlay.style.display = 'block';
      const summary = this.getMetricsSummary();
      
      overlay.innerHTML = `
        <div><strong>Performance Monitor</strong></div>
        <div>FPS: ${summary.fps.toFixed(1)}</div>
        <div>Frame: ${summary.frameTime.current.toFixed(1)}ms (avg: ${summary.frameTime.average.toFixed(1)}ms)</div>
        <div>WASM Calls: ${summary.wasmCalls.count} (${summary.wasmCalls.callsPerFrame.toFixed(1)}/frame)</div>
        ${summary.memory ? `<div>Memory: ${(summary.memory.used / 1024 / 1024).toFixed(1)}MB</div>` : ''}
        <div>Alerts: ${summary.alerts}</div>
      `;
    };

    // Update every second
    setInterval(updateOverlay, 1000);
    updateOverlay();

    return overlay;
  }
}

// Global profiler instance
export const globalProfiler = new PerformanceProfiler();
