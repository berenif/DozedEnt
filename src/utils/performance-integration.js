/**
 * Performance Integration System
 * Integrates all performance optimizations into the game engine
 */

import { globalWasmLoader } from './wasm-lazy-loader.js';
import { globalMemoryOptimizer } from './memory-optimizer.js';
// import { globalDeadCodeEliminator } from './dead-code-eliminator.js'; // Not used
import { globalProfiler } from './performance-profiler.js';
import { globalDashboard } from '../ui/performance-dashboard.js';

export class PerformanceIntegration {
  constructor() {
    this.isInitialized = false;
    this.optimizationLevel = 'balanced'; // 'performance', 'balanced', 'quality'
    
    this.config = {
      enableMemoryOptimization: true,
      enableWasmLazyLoading: true,
      enableDeadCodeElimination: true,
      enablePerformanceProfiling: true,
      enableDashboard: true,
      autoOptimization: true
    };

    this.stats = {
      initTime: 0,
      memoryOptimized: false,
      wasmLazyLoaded: false,
      profilingActive: false,
      dashboardActive: false
    };
  }

  /**
   * Initialize all performance optimizations
   */
  async initialize() {
    if (this.isInitialized) return;

    const startTime = performance.now();
    console.log('🚀 Initializing Performance Optimization System...');

    try {
      // 1. Initialize memory optimization
      if (this.config.enableMemoryOptimization) {
        await this.initializeMemoryOptimization();
      }

      // 2. Initialize WASM lazy loading
      if (this.config.enableWasmLazyLoading) {
        await this.initializeWasmLazyLoading();
      }

      // 3. Initialize performance profiling
      if (this.config.enablePerformanceProfiling) {
        await this.initializePerformanceProfiling();
      }

      // 4. Initialize performance dashboard
      if (this.config.enableDashboard) {
        await this.initializePerformanceDashboard();
      }

      // 5. Set up auto-optimization
      if (this.config.autoOptimization) {
        this.setupAutoOptimization();
      }

      this.isInitialized = true;
      this.stats.initTime = performance.now() - startTime;
      
      console.log(`✅ Performance optimization system initialized in ${this.stats.initTime.toFixed(2)}ms`);
      this.logOptimizationStatus();

    } catch (error) {
      console.error('❌ Failed to initialize performance optimization system:', error);
      throw error;
    }
  }

  /**
   * Initialize memory optimization
   * @private
   */
  initializeMemoryOptimization() {
    try {
      if (globalMemoryOptimizer && !globalMemoryOptimizer.isMonitoring) {
        globalMemoryOptimizer.startMonitoring();
        this.stats.memoryOptimized = true;
        console.log('   ✅ Memory optimization active');
      }
    } catch (error) {
      console.warn('   ⚠️ Memory optimization failed:', error.message);
    }
  }

  /**
   * Initialize WASM lazy loading
   * @private
   */
  async initializeWasmLazyLoading() {
    try {
      if (globalWasmLoader) {
        // Configure lazy loader based on optimization level
        const config = this.getWasmLoaderConfig();
        globalWasmLoader.configure(config);
        
        // Preload critical modules
        await globalWasmLoader.preloadCriticalModules();
        
        this.stats.wasmLazyLoaded = true;
        console.log('   ✅ WASM lazy loading configured');
      }
    } catch (error) {
      console.warn('   ⚠️ WASM lazy loading failed:', error.message);
    }
  }

  /**
   * Initialize performance profiling
   * @private
   */
  initializePerformanceProfiling() {
    try {
      if (globalProfiler && !globalProfiler.isEnabled) {
        globalProfiler.enable();
        this.stats.profilingActive = true;
        console.log('   ✅ Performance profiling active');
      }
    } catch (error) {
      console.warn('   ⚠️ Performance profiling failed:', error.message);
    }
  }

  /**
   * Initialize performance dashboard
   * @private
   */
  initializePerformanceDashboard() {
    try {
      if (globalDashboard) {
        // Set up keyboard shortcut (Ctrl+Shift+P)
        document.addEventListener('keydown', (event) => {
          if (event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
            event.preventDefault();
            this.togglePerformanceDashboard();
          }
        });

        this.stats.dashboardActive = true;
        console.log('   ✅ Performance dashboard ready (Ctrl+Shift+P to toggle)');
      }
    } catch (error) {
      console.warn('   ⚠️ Performance dashboard failed:', error.message);
    }
  }

  /**
   * Set up automatic optimization based on performance metrics
   * @private
   */
  setupAutoOptimization() {
    // Monitor performance every 10 seconds
    setInterval(() => {
      this.performAutoOptimization();
    }, 10000);

    console.log('   ✅ Auto-optimization monitoring active');
  }

  /**
   * Perform automatic optimization adjustments
   * @private
   */
  performAutoOptimization() {
    if (!globalProfiler || !globalProfiler.isEnabled) {
      return;
    }

    const metrics = globalProfiler.getMetricsSummary();
    
    // Adjust optimization level based on performance
    if (metrics.frameTime.average > 20) { // > 20ms frame time
      if (this.optimizationLevel !== 'performance') {
        console.log('📉 Performance degraded, switching to performance mode');
        this.setOptimizationLevel('performance');
      }
    } else if (metrics.frameTime.average < 12) { // < 12ms frame time
      if (this.optimizationLevel !== 'quality') {
        console.log('📈 Performance headroom available, switching to quality mode');
        this.setOptimizationLevel('quality');
      }
    }

    // Memory optimization
    if (globalMemoryOptimizer) {
      const memoryStats = globalMemoryOptimizer.getMemoryStats();
      
      if (memoryStats.used > 80 * 1024 * 1024) { // > 80MB
        console.log('🧹 High memory usage detected, triggering cleanup');
        globalMemoryOptimizer.optimizeMemoryUsage();
      }
    }
  }

  /**
   * Get WASM loader configuration based on optimization level
   * @private
   */
  getWasmLoaderConfig() {
    const configs = {
      performance: {
        preloadCritical: true,
        enableCompression: true,
        cacheModules: true,
        loadTimeout: 15000
      },
      balanced: {
        preloadCritical: true,
        enableCompression: true,
        cacheModules: true,
        loadTimeout: 30000
      },
      quality: {
        preloadCritical: false,
        enableCompression: false,
        cacheModules: true,
        loadTimeout: 60000
      }
    };

    return configs[this.optimizationLevel] || configs.balanced;
  }

  /**
   * Set optimization level
   */
  setOptimizationLevel(level) {
    if (!['performance', 'balanced', 'quality'].includes(level)) {
      console.warn(`Invalid optimization level: ${level}`);
      return;
    }

    this.optimizationLevel = level;
    console.log(`🎯 Optimization level set to: ${level}`);

    // Reconfigure systems
    if (globalWasmLoader) {
      globalWasmLoader.configure(this.getWasmLoaderConfig());
    }

    // Adjust profiling frequency
    if (globalProfiler) {
      const frequencies = {
        performance: 1000, // Every second
        balanced: 5000,    // Every 5 seconds
        quality: 10000     // Every 10 seconds
      };
      
      globalProfiler.setSampleInterval(frequencies[level]);
    }
  }

  /**
   * Toggle performance dashboard
   */
  togglePerformanceDashboard() {
    if (globalDashboard) {
      if (globalDashboard.isVisible) {
        globalDashboard.hide();
        console.log('📊 Performance dashboard hidden');
      } else {
        globalDashboard.show();
        console.log('📊 Performance dashboard shown');
      }
    }
  }

  /**
   * Run performance analysis
   */
  runPerformanceAnalysis() {
    console.log('🔍 Running performance analysis...');
    
    const analysis = {
      memory: null,
      wasm: null,
      profiling: null,
      recommendations: []
    };

    // Memory analysis
    if (globalMemoryOptimizer) {
      analysis.memory = globalMemoryOptimizer.getMemoryStats();
      
      if (analysis.memory.used > 100 * 1024 * 1024) {
        analysis.recommendations.push({
          type: 'memory',
          message: 'High memory usage detected - consider enabling aggressive cleanup',
          severity: 'high'
        });
      }
    }

    // WASM analysis
    if (globalWasmLoader) {
      analysis.wasm = globalWasmLoader.getStats();
      
      if (analysis.wasm.cacheHitRate < 0.8) {
        analysis.recommendations.push({
          type: 'wasm',
          message: 'Low WASM cache hit rate - consider preloading more modules',
          severity: 'medium'
        });
      }
    }

    // Profiling analysis
    if (globalProfiler) {
      analysis.profiling = globalProfiler.getMetricsSummary();
      
      if (analysis.profiling.frameTime.average > 16.67) {
        analysis.recommendations.push({
          type: 'performance',
          message: 'Frame time exceeds 60 FPS target - optimization needed',
          severity: 'high'
        });
      }
    }

    return analysis;
  }

  /**
   * Log current optimization status
   * @private
   */
  logOptimizationStatus() {
    console.log('\n📊 Performance Optimization Status:');
    console.log(`   🎯 Optimization Level: ${this.optimizationLevel}`);
    console.log(`   🧠 Memory Optimization: ${this.stats.memoryOptimized ? '✅' : '❌'}`);
    console.log(`   📦 WASM Lazy Loading: ${this.stats.wasmLazyLoaded ? '✅' : '❌'}`);
    console.log(`   📈 Performance Profiling: ${this.stats.profilingActive ? '✅' : '❌'}`);
    console.log(`   📊 Dashboard Available: ${this.stats.dashboardActive ? '✅' : '❌'}`);
    
    if (this.stats.dashboardActive) {
      console.log('   🎮 Press Ctrl+Shift+P to toggle performance dashboard');
    }
  }

  /**
   * Get current performance statistics
   */
  getStats() {
    const stats = {
      ...this.stats,
      optimizationLevel: this.optimizationLevel,
      config: this.config
    };

    // Add sub-system stats
    if (globalMemoryOptimizer) {
      stats.memory = globalMemoryOptimizer.getMemoryStats();
    }

    if (globalWasmLoader) {
      stats.wasm = globalWasmLoader.getStats();
    }

    if (globalProfiler) {
      stats.profiling = globalProfiler.getMetricsSummary();
    }

    return stats;
  }

  /**
   * Clean up performance systems
   */
  cleanup() {
    if (globalMemoryOptimizer) {
      globalMemoryOptimizer.stopMonitoring();
    }

    if (globalProfiler) {
      globalProfiler.disable();
    }

    if (globalWasmLoader) {
      globalWasmLoader.clearCache();
    }

    console.log('🧹 Performance optimization systems cleaned up');
  }
}

// Global performance integration instance
export const globalPerformanceIntegration = new PerformanceIntegration();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalPerformanceIntegration.initialize().catch(error => {
        console.error('Failed to initialize performance optimizations:', error);
      });
    });
  } else {
    // DOM already loaded
    globalPerformanceIntegration.initialize().catch(error => {
      console.error('Failed to initialize performance optimizations:', error);
    });
  }
}
