import '../setup.js';
/**
 * Comprehensive Performance Test Suite
 * Tests all performance optimizations and monitoring systems
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { WasmManager } from '../../src/wasm/wasm-manager.js';
import { GameStateManager } from '../../src/game/game-state-manager.js';
import { PerformanceLODSystem } from '../../src/utils/performance-lod-system.js';
import { PerformanceProfiler } from '../../src/utils/performance-profiler.js';
import { MemoryOptimizer } from '../../src/utils/memory-optimizer.js';

describe('Comprehensive Performance Optimizations', () => {
  let wasmManager;
  let gameStateManager;
  let lodSystem;
  let profiler;
  let memoryOptimizer;
  let mockWasmModule;

  // Performance targets
  const PERFORMANCE_TARGETS = {
    frameTime: 16.67, // 60 FPS
    wasmCallTime: 1.0, // 1ms max per WASM call
    stateUpdateTime: 0.5, // 0.5ms for state updates
    lodProcessingTime: 0.1, // 0.1ms per entity
    memoryGrowth: 10 * 1024 * 1024, // 10MB max growth
    poolHitRate: 0.8 // 80% pool hit rate
  };

  beforeEach(() => {
    // Mock WASM exports
    mockWasmModule = {
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(1.0),
      get_health: sinon.stub().returns(1.0),
      get_phase: sinon.stub().returns(0),
      get_gold: sinon.stub().returns(0),
      get_essence: sinon.stub().returns(0),
      get_vel_x: sinon.stub().returns(0),
      get_vel_y: sinon.stub().returns(0),
      get_is_rolling: sinon.stub().returns(0),
      get_block_state: sinon.stub().returns(0),
      get_player_anim_state: sinon.stub().returns(0)
    };

    // Initialize systems
    wasmManager = new WasmManager();
    wasmManager.exports = mockWasmModule;
    wasmManager.isLoaded = true;
    
    gameStateManager = new GameStateManager();
    gameStateManager.wasmManager = wasmManager;
    
    lodSystem = new PerformanceLODSystem();
    profiler = new PerformanceProfiler();
    memoryOptimizer = new MemoryOptimizer();
  });

  afterEach(() => {
    sinon.restore();
    profiler.stop();
    memoryOptimizer.destroy();
  });

  describe('WASM/JS Boundary Optimization', () => {
    it('should batch WASM state reads efficiently', () => {
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Use batched call
        const state = wasmManager.getPlayerState();
        expect(state).to.have.property('x');
        expect(state).to.have.property('y');
        expect(state).to.have.property('stamina');
        expect(state).to.have.property('health');
        expect(state).to.have.property('phase');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      console.log(`Batched WASM calls: ${avgTime.toFixed(4)}ms per call`);
      expect(avgTime).to.be.lessThan(PERFORMANCE_TARGETS.wasmCallTime);
    });

    it('should cache state effectively', () => {
      // First call should hit WASM
      const state1 = wasmManager.getPlayerState();
      const wasmCallCount1 = mockWasmModule.get_x.callCount;
      
      // Second call within cache timeout should use cache
      const state2 = wasmManager.getPlayerState();
      const wasmCallCount2 = mockWasmModule.get_x.callCount;
      
      expect(wasmCallCount2).to.equal(wasmCallCount1); // No additional WASM calls
      expect(state1).to.deep.equal(state2);
    });

    it('should invalidate cache after updates', () => {
      // Get initial state
      const state1 = wasmManager.getPlayerState();
      const initialCallCount = mockWasmModule.get_x.callCount;
      
      // Update should invalidate cache
      wasmManager.setPlayerInput(0.1, 0.1, false, 0, 0, 0, 0, 0);
      wasmManager.update(0.016);
      
      // Next state read should hit WASM again
      const state2 = wasmManager.getPlayerState();
      const finalCallCount = mockWasmModule.get_x.callCount;
      
      expect(finalCallCount).to.be.greaterThan(initialCallCount);
    });

    it('should track performance metrics', () => {
      // Perform some operations
      for (let i = 0; i < 10; i++) {
        wasmManager.setPlayerInput(Math.random(), Math.random(), false, 0, 0, 0, 0, 0);
        wasmManager.update(0.016);
        wasmManager.getPlayerState();
      }
      
      const metrics = wasmManager.getPerformanceMetrics();
      expect(metrics).to.have.property('wasmCallCount');
      expect(metrics).to.have.property('avgFrameTime');
      expect(metrics).to.have.property('lastFrameTime');
      expect(metrics.wasmCallCount).to.be.greaterThan(0);
    });
  });

  describe('Level of Detail (LOD) System', () => {
    it('should calculate appropriate LOD levels based on distance', () => {
      const camera = { x: 0, y: 0, width: 800, height: 600 };
      const entities = [
        { x: 100, y: 100 }, // Close
        { x: 400, y: 400 }, // Medium distance
        { x: 800, y: 800 }, // Far
        { x: 2000, y: 2000 } // Very far
      ];
      
      const lodResults = entities.map(entity => 
        lodSystem.calculateEntityLOD(entity, camera)
      );
      
      // Close entity should have full detail
      expect(lodResults[0].lodLevel).to.equal('FULL_DETAIL');
      expect(lodResults[0].shouldRender).to.be.true;
      
      // Far entity should have reduced detail
      expect(lodResults[2].lodLevel).to.equal('REDUCED_DETAIL');
      expect(lodResults[2].shouldRender).to.be.true;
      
      // Very far entity should be culled
      expect(lodResults[3].shouldRender).to.be.false;
    });

    it('should adapt quality based on performance', () => {
      // Simulate poor performance
      for (let i = 0; i < 100; i++) {
        lodSystem.updatePerformanceMetrics(25); // 25ms frame time
      }
      
      const stats1 = lodSystem.getPerformanceStats();
      const initialQuality = stats1.qualityLevel;
      
      // Quality should be reduced
      expect(initialQuality).to.be.lessThan(1.0);
      
      // Simulate good performance
      for (let i = 0; i < 100; i++) {
        lodSystem.updatePerformanceMetrics(10); // 10ms frame time
      }
      
      const stats2 = lodSystem.getPerformanceStats();
      const finalQuality = stats2.qualityLevel;
      
      // Quality should improve
      expect(finalQuality).to.be.greaterThan(initialQuality);
    });

    it('should provide optimized render parameters', () => {
      const lodInfo = {
        lodLevel: 'MINIMAL_DETAIL',
        distance: 1200,
        shouldRender: true,
        renderDetail: 0.3
      };
      
      const renderParams = lodSystem.getOptimizedRenderParams(lodInfo);
      
      expect(renderParams.skipShadow).to.be.true;
      expect(renderParams.skipParticles).to.be.true;
      expect(renderParams.reducedPolygons).to.be.true;
    });

    it('should handle entity count limits', () => {
      const camera = { x: 0, y: 0, width: 800, height: 600 };
      
      // Create many close entities
      const entities = Array.from({ length: 30 }, (_, i) => ({
        x: i * 10,
        y: i * 10
      }));
      
      lodSystem.resetFrameCounts();
      const lodResults = entities.map(entity => 
        lodSystem.calculateEntityLOD(entity, camera)
      );
      
      // Should limit full detail entities
      const fullDetailCount = lodResults.filter(r => r.lodLevel === 'FULL_DETAIL').length;
      expect(fullDetailCount).to.be.at.most(lodSystem.MAX_ENTITIES_FULL_DETAIL);
    });
  });

  describe('Performance Profiler', () => {
    it('should track frame timing accurately', (done) => {
      profiler.start();
      
      // Simulate frame rendering
      let frameCount = 0;
      const renderFrame = () => {
        profiler.beginFrame();
        
        // Simulate work
        const workStart = performance.now();
        while (performance.now() - workStart < 5) {
          // Busy wait for 5ms
        }
        
        profiler.endFrame();
        frameCount++;
        
        if (frameCount < 10) {
          requestAnimationFrame(renderFrame);
        } else {
          const summary = profiler.getMetricsSummary();
          
          expect(summary.frameCount).to.equal(10);
          expect(summary.frameTime.average).to.be.greaterThan(4);
          expect(summary.frameTime.average).to.be.lessThan(10);
          
          profiler.stop();
          done();
        }
      };
      
      renderFrame();
    });

    it('should track WASM call performance', () => {
      profiler.start();
      
      // Simulate WASM calls
      for (let i = 0; i < 100; i++) {
        profiler.beginWasmCall('get_player_state');
        
        // Simulate work
        const workStart = performance.now();
        while (performance.now() - workStart < 0.1) {
          // Busy wait
        }
        
        profiler.endWasmCall();
      }
      
      const summary = profiler.getMetricsSummary();
      expect(summary.wasmCalls.count).to.equal(100);
      expect(summary.wasmCalls.averageTime).to.be.greaterThan(0);
      
      profiler.stop();
    });

    it('should detect performance alerts', () => {
      profiler.start();
      
      // Simulate slow frame
      profiler.beginFrame();
      const workStart = performance.now();
      while (performance.now() - workStart < 25) {
        // Busy wait for 25ms (above threshold)
      }
      profiler.endFrame();
      
      const report = profiler.getDetailedReport();
      expect(report.alerts.length).to.be.greaterThan(0);
      
      const frameTimeAlert = report.alerts.find(alert => alert.type === 'FRAME_TIME');
      expect(frameTimeAlert).to.exist;
      
      profiler.stop();
    });

    it('should support performance hooks', () => {
      let hookCalled = false;
      
      profiler.addHook('afterFrame', (frameTime) => {
        hookCalled = true;
        expect(frameTime).to.be.a('number');
      });
      
      profiler.start();
      profiler.beginFrame();
      profiler.endFrame();
      
      expect(hookCalled).to.be.true;
      profiler.stop();
    });
  });

  describe('Memory Optimization', () => {
    it('should provide object pooling for particles', () => {
      const poolSize = 100;
      const particles = [];
      
      // Get particles from pool
      for (let i = 0; i < poolSize; i++) {
        const particle = memoryOptimizer.getPooledObject('particles');
        expect(particle).to.have.property('x');
        expect(particle).to.have.property('reset');
        particles.push(particle);
      }
      
      // Return particles to pool
      particles.forEach(particle => {
        memoryOptimizer.returnPooledObject('particles', particle);
      });
      
      const efficiency = memoryOptimizer.getPoolEfficiency();
      expect(parseFloat(efficiency.hitRate)).to.be.greaterThan(0);
    });

    it('should track pool efficiency', () => {
      // Generate pool hits and misses
      for (let i = 0; i < 50; i++) {
        const obj = memoryOptimizer.getPooledObject('effects');
        memoryOptimizer.returnPooledObject('effects', obj);
      }
      
      // Generate some misses by exceeding pool size
      const objects = [];
      for (let i = 0; i < 200; i++) {
        objects.push(memoryOptimizer.getPooledObject('effects'));
      }
      
      const efficiency = memoryOptimizer.getPoolEfficiency();
      expect(efficiency.hits).to.be.greaterThan(0);
      expect(efficiency.misses).to.be.greaterThan(0);
      
      const hitRate = parseFloat(efficiency.hitRate) / 100;
      console.log(`Pool hit rate: ${efficiency.hitRate}`);
    });

    it('should monitor memory usage', function(done) {
      if (!performance.memory) {
        console.log('Memory monitoring not available, skipping test');
        this.skip();
        return;
      }
      
      const initialStats = memoryOptimizer.getMemoryStats();
      
      // Allocate some memory
      const largeArray = new Array(100000).fill(0).map(() => ({
        data: new Array(100).fill(Math.random())
      }));
      
      setTimeout(() => {
        const finalStats = memoryOptimizer.getMemoryStats();
        
        expect(finalStats.used).to.be.greaterThan(initialStats.used);
        expect(finalStats.history.length).to.be.greaterThan(0);
        
        // Clean up
        largeArray.length = 0;
        done();
      }, 100);
    });

    it('should handle pool size limits', () => {
      const poolType = 'vectors';
      const config = memoryOptimizer.poolConfig[poolType];
      const maxSize = config.maxSize;
      
      // Fill pool to capacity
      const objects = [];
      for (let i = 0; i < maxSize + 10; i++) {
        const obj = memoryOptimizer.getPooledObject(poolType);
        objects.push(obj);
      }
      
      // Return all objects
      objects.forEach(obj => {
        memoryOptimizer.returnPooledObject(poolType, obj);
      });
      
      // Pool should not exceed max size
      const poolStats = memoryOptimizer.getMemoryStats().poolStats[poolType];
      expect(poolStats.size).to.be.at.most(maxSize);
    });
  });

  describe('Integrated Performance', () => {
    it('should maintain target frame rate under load', (done) => {
      profiler.start();
      
      let frameCount = 0;
      const targetFrames = 60; // 1 second at 60fps
      
      const renderFrame = () => {
        profiler.beginFrame();
        
        // Simulate game update with all systems
        gameStateManager.update(0.016, {
          direction: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
          roll: Math.random() > 0.9,
          lightAttack: Math.random() > 0.95
        });
        
        // Simulate LOD processing for multiple entities
        const camera = { x: 0, y: 0, width: 800, height: 600 };
        for (let i = 0; i < 20; i++) {
          const entity = { x: Math.random() * 1000, y: Math.random() * 1000 };
          lodSystem.calculateEntityLOD(entity, camera);
        }
        
        // Use memory pool
        const particle = memoryOptimizer.getPooledObject('particles');
        memoryOptimizer.returnPooledObject('particles', particle);
        
        profiler.endFrame();
        frameCount++;
        
        if (frameCount < targetFrames) {
          requestAnimationFrame(renderFrame);
        } else {
          const summary = profiler.getMetricsSummary();
          
          console.log('Integrated performance test results:');
          console.log(`Average frame time: ${summary.frameTime.average.toFixed(2)}ms`);
          console.log(`FPS: ${summary.fps.toFixed(1)}`);
          console.log(`WASM calls per frame: ${summary.wasmCalls.callsPerFrame.toFixed(2)}`);
          
          expect(summary.frameTime.average).to.be.lessThan(PERFORMANCE_TARGETS.frameTime);
          expect(summary.fps).to.be.greaterThan(55); // Allow some margin
          
          profiler.stop();
          done();
        }
      };
      
      renderFrame();
    }).timeout(5000);

    it('should handle performance degradation gracefully', () => {
      // Simulate performance degradation
      for (let i = 0; i < 100; i++) {
        lodSystem.updatePerformanceMetrics(30); // Poor performance
      }
      
      const lodStats = lodSystem.getPerformanceStats();
      expect(lodStats.qualityLevel).to.be.lessThan(1.0);
      
      // System should adapt by reducing quality
      const camera = { x: 0, y: 0, width: 800, height: 600 };
      const entity = { x: 400, y: 400 };
      
      const lodInfo = lodSystem.calculateEntityLOD(entity, camera);
      const renderParams = lodSystem.getOptimizedRenderParams(lodInfo);
      
      // Should have some optimizations enabled
      const optimizationCount = Object.values(renderParams).filter(Boolean).length;
      expect(optimizationCount).to.be.greaterThan(0);
    });

    it('should provide comprehensive performance reporting', () => {
      // Generate some activity
      profiler.start();
      
      for (let i = 0; i < 10; i++) {
        profiler.beginFrame();
        profiler.beginWasmCall('update');
        profiler.endWasmCall();
        profiler.endFrame();
        
        lodSystem.updatePerformanceMetrics(15);
        
        const obj = memoryOptimizer.getPooledObject('particles');
        memoryOptimizer.returnPooledObject('particles', obj);
      }
      
      // Get comprehensive report
      const profilerReport = profiler.getDetailedReport();
      const lodStats = lodSystem.getPerformanceStats();
      const memoryStats = memoryOptimizer.getMemoryStats();
      const poolEfficiency = memoryOptimizer.getPoolEfficiency();
      
      // Verify all systems are reporting
      expect(profilerReport.summary.frameCount).to.be.greaterThan(0);
      expect(lodStats.avgFrameTime).to.be.greaterThan(0);
      expect(memoryStats.performance.poolHits).to.be.greaterThan(0);
      expect(parseFloat(poolEfficiency.hitRate)).to.be.greaterThan(0);
      
      profiler.stop();
    });
  });
});

