/**
 * Performance Optimization Integration Example
 * Demonstrates how to use all performance optimization features
 */

// Import all optimization systems
import { globalPerformanceIntegration } from '../src/utils/performance-integration.js';
import { globalWasmLoader } from '../src/utils/wasm-lazy-loader.js';
import { globalMemoryOptimizer } from '../src/utils/memory-optimizer.js';
import { globalDeadCodeEliminator } from '../src/utils/dead-code-eliminator.js';
import { globalProfiler } from '../src/utils/performance-profiler.js';

/**
 * Example: Complete Performance Optimization Setup
 */
export class PerformanceOptimizedGame {
  constructor() {
    this.isInitialized = false;
    this.gameLoop = null;
    this.wasmModule = null;
  }

  /**
   * Initialize game with all performance optimizations
   */
  async initialize() {
    console.log('🎮 Initializing Performance Optimized Game...');

    try {
      // 1. Initialize performance optimization system
      await globalPerformanceIntegration.initialize();

      // 2. Load WASM module with lazy loading
      this.wasmModule = await this.loadWasmWithOptimizations();

      // 3. Set up memory-optimized game loop
      this.setupOptimizedGameLoop();

      // 4. Configure performance monitoring
      this.setupPerformanceMonitoring();

      // 5. Enable auto-optimization
      this.enableAutoOptimization();

      this.isInitialized = true;
      console.log('✅ Performance optimized game initialized successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize optimized game:', error);
      throw error;
    }
  }

  /**
   * Load WASM module with optimizations
   * @private
   */
  async loadWasmWithOptimizations() {
    console.log('📦 Loading WASM module with optimizations...');

    try {
      // Configure lazy loader for optimal performance
      globalWasmLoader.configure({
        preloadCritical: true,
        enableCompression: true,
        cacheModules: true,
        loadTimeout: 30000
      });

      // Load main game module with progress tracking
      const wasmInstance = await globalWasmLoader.loadModule('game', {
        strategy: 'progressive',
        priority: 'high',
        onProgress: (progress) => {
          console.log(`🔄 WASM Loading: ${(progress.progress * 100).toFixed(1)}%`);
          
          // Update loading UI if available
          if (this.updateLoadingUI) {
            this.updateLoadingUI(progress);
          }
        }
      });

      console.log('✅ WASM module loaded with optimizations');
      return wasmInstance;

    } catch (error) {
      console.error('❌ WASM loading failed:', error);
      
      // Fallback to traditional loading if needed
      console.log('🔄 Attempting fallback loading...');
      throw error;
    }
  }

  /**
   * Set up memory-optimized game loop
   * @private
   */
  setupOptimizedGameLoop() {
    console.log('⚡ Setting up optimized game loop...');

    let lastFrameTime = performance.now();
    
    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastFrameTime) / 1000;
      lastFrameTime = currentTime;

      // Begin frame profiling
      globalProfiler.beginFrame();

      try {
        // 1. Use object pooling for temporary objects
        const frameData = this.getPooledFrameData();

        // 2. Update game state with optimized WASM calls
        this.updateGameStateOptimized(deltaTime, frameData);

        // 3. Render with LOD system
        this.renderWithLOD(frameData);

        // 4. Return pooled objects
        this.returnPooledFrameData(frameData);

      } catch (error) {
        console.error('Game loop error:', error);
      }

      // End frame profiling
      globalProfiler.endFrame();

      // Continue game loop
      this.gameLoop = requestAnimationFrame(gameLoop);
    };

    // Start the optimized game loop
    this.gameLoop = requestAnimationFrame(gameLoop);
    console.log('✅ Optimized game loop started');
  }

  /**
   * Get pooled objects for frame data
   * @private
   */
  getPooledFrameData() {
    return {
      vectors: globalMemoryOptimizer.getPooledObject('vectors'),
      transforms: globalMemoryOptimizer.getPooledObject('transforms'),
      particles: globalMemoryOptimizer.getPooledObject('particles')
    };
  }

  /**
   * Return pooled objects after use
   * @private
   */
  returnPooledFrameData(frameData) {
    globalMemoryOptimizer.returnPooledObject('vectors', frameData.vectors);
    globalMemoryOptimizer.returnPooledObject('transforms', frameData.transforms);
    globalMemoryOptimizer.returnPooledObject('particles', frameData.particles);
  }

  /**
   * Update game state with optimized WASM calls
   * @private
   */
  updateGameStateOptimized(deltaTime, frameData) {
    if (!this.wasmModule || !this.wasmModule.exports) return;

    // Profile WASM calls
    globalProfiler.beginWasmCall('game_update');

    try {
      // Batch WASM state updates to minimize boundary crossings
      const inputData = this.getInputData();
      
      // Single optimized update call
      this.wasmModule.exports.update(
        inputData.dirX,
        inputData.dirY,
        inputData.isRolling,
        deltaTime
      );

      // Batch state reading
      const gameState = this.getBatchedGameState();
      
      // Update local state
      this.updateLocalState(gameState, frameData);

    } finally {
      globalProfiler.endWasmCall('game_update');
    }
  }

  /**
   * Get batched game state to minimize WASM calls
   * @private
   */
  getBatchedGameState() {
    if (!this.wasmModule || !this.wasmModule.exports) return {};

    // Batch multiple state reads into single call pattern
    return {
      playerX: this.wasmModule.exports.get_x(),
      playerY: this.wasmModule.exports.get_y(),
      stamina: this.wasmModule.exports.get_stamina(),
      phase: this.wasmModule.exports.get_phase(),
      hp: this.wasmModule.exports.get_hp()
    };
  }

  /**
   * Render with Level-of-Detail optimization
   * @private
   */
  renderWithLOD(frameData) {
    globalProfiler.beginRender();

    try {
      // Use LOD system for optimized rendering
      const entities = this.getVisibleEntities();
      
      for (const entity of entities) {
        // Calculate LOD based on distance and performance
        const lodInfo = this.calculateEntityLOD(entity);
        
        if (lodInfo.shouldRender) {
          const renderParams = this.getOptimizedRenderParams(lodInfo);
          this.renderEntity(entity, renderParams, frameData);
        }
      }

    } finally {
      globalProfiler.endRender();
    }
  }

  /**
   * Calculate entity LOD
   * @private
   */
  calculateEntityLOD(entity) {
    const distance = this.calculateDistanceToPlayer(entity);
    const currentFrameTime = globalProfiler.getLastFrameTime();
    
    // Adaptive LOD based on performance
    if (currentFrameTime > 20) { // Poor performance
      return {
        level: distance > 500 ? 'CULLED' : distance > 200 ? 'MINIMAL' : 'REDUCED',
        shouldRender: distance <= 500
      };
    } else if (currentFrameTime < 12) { // Good performance
      return {
        level: distance > 1000 ? 'REDUCED' : 'FULL',
        shouldRender: distance <= 1000
      };
    } else { // Balanced
      return {
        level: distance > 800 ? 'MINIMAL' : distance > 400 ? 'REDUCED' : 'FULL',
        shouldRender: distance <= 800
      };
    }
  }

  /**
   * Set up performance monitoring
   * @private
   */
  setupPerformanceMonitoring() {
    console.log('📊 Setting up performance monitoring...');

    // Enable debug shortcuts
    document.addEventListener('keydown', (event) => {

      // Additional debug shortcuts
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyM') {
        event.preventDefault();
        this.logMemoryStats();
      }

      if (event.ctrlKey && event.shiftKey && event.code === 'KeyW') {
        event.preventDefault();
        this.logWasmStats();
      }
    });

    // Set up periodic performance analysis
    setInterval(() => {
      this.performPerformanceAnalysis();
    }, 30000); // Every 30 seconds

    console.log('✅ Performance monitoring configured');
    console.log('   🧠 Ctrl+Shift+M: Log memory statistics');
    console.log('   📦 Ctrl+Shift+W: Log WASM statistics');
  }

  /**
   * Enable auto-optimization features
   * @private
   */
  enableAutoOptimization() {
    console.log('🤖 Enabling auto-optimization...');

    // Set optimization level based on device capabilities
    const deviceMemory = navigator.deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
      globalPerformanceIntegration.setOptimizationLevel('quality');
      console.log('   🎯 High-end device detected: Quality mode enabled');
    } else if (deviceMemory >= 4 && hardwareConcurrency >= 4) {
      globalPerformanceIntegration.setOptimizationLevel('balanced');
      console.log('   ⚖️ Mid-range device detected: Balanced mode enabled');
    } else {
      globalPerformanceIntegration.setOptimizationLevel('performance');
      console.log('   ⚡ Low-end device detected: Performance mode enabled');
    }

    console.log('✅ Auto-optimization enabled');
  }

  /**
   * Perform periodic performance analysis
   * @private
   */
  async performPerformanceAnalysis() {
    try {
      const analysis = await globalPerformanceIntegration.runPerformanceAnalysis();
      
      // Log high-priority recommendations
      const highPriorityIssues = analysis.recommendations.filter(r => r.severity === 'high');
      
      if (highPriorityIssues.length > 0) {
        console.warn('⚠️ Performance issues detected:');
        highPriorityIssues.forEach(issue => {
          console.warn(`   ${issue.type}: ${issue.message}`);
        });
      }

    } catch (error) {
      console.error('Performance analysis failed:', error);
    }
  }

  /**
   * Log memory statistics
   * @private
   */
  logMemoryStats() {
    const memoryStats = globalMemoryOptimizer.getMemoryStats();
    const poolStats = globalMemoryOptimizer.getPoolEfficiency();
    
    console.log('🧠 Memory Statistics:');
    console.log(`   Used: ${(memoryStats.used / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Allocated: ${(memoryStats.allocated / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Pool Hit Rate: ${(poolStats.hitRate * 100).toFixed(1)}%`);
    console.log(`   GC Count: ${memoryStats.gcCount}`);
  }

  /**
   * Log WASM statistics
   * @private
   */
  logWasmStats() {
    const wasmStats = globalWasmLoader.getStats();
    
    console.log('📦 WASM Statistics:');
    console.log(`   Modules Loaded: ${wasmStats.loadedModules}`);
    console.log(`   Cache Hit Rate: ${(wasmStats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Average Load Time: ${wasmStats.averageLoadTime.toFixed(2)}ms`);
    console.log(`   Loading In Progress: ${wasmStats.loadingInProgress}`);
  }

  /**
   * Clean up optimized game
   */
  cleanup() {
    console.log('🧹 Cleaning up optimized game...');

    // Stop game loop
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }

    // Clean up performance systems
    globalPerformanceIntegration.cleanup();

    console.log('✅ Cleanup completed');
  }

  // Placeholder methods for example completeness
  getInputData() { return { dirX: 0, dirY: 0, isRolling: false }; }
  updateLocalState(gameState, frameData) { /* Update local game state */ }
  getVisibleEntities() { return []; }
  calculateDistanceToPlayer(entity) { return 100; }
  getOptimizedRenderParams(lodInfo) { return {}; }
  renderEntity(entity, params, frameData) { /* Render entity */ }
  updateLoadingUI(progress) { /* Update loading UI */ }
}

/**
 * Usage Example
 */
export async function runOptimizedGameExample() {
  console.log('🚀 Starting Performance Optimized Game Example...');

  try {
    // Create and initialize optimized game
    const game = new PerformanceOptimizedGame();
    await game.initialize();

    // Game is now running with all optimizations enabled
    console.log('✅ Optimized game is now running!');
    
    // Return game instance for further use
    return game;

  } catch (error) {
    console.error('❌ Failed to start optimized game:', error);
    throw error;
  }
}

// Auto-run example if loaded directly
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  runOptimizedGameExample().catch(console.error);
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    runOptimizedGameExample().catch(console.error);
  });
}
