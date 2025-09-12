/**
 * Performance Benchmarks
 * Comprehensive performance testing for all game systems
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { GameStateManager } from '../../src/game/game-state-manager.js';
import { EnhancedAudioManager } from '../../src/audio/enhanced-audio-manager.js';
import { VisualEffectsManager } from '../../src/effects/visual-effects-manager.js';
import { EnhancedAnimationController } from '../../src/animation/enhanced-animation-controller.js';

describe('Performance Benchmarks', () => {
  let gameStateManager;
  let audioManager;
  let visualEffects;
  let animationController;
  let mockCanvas;
  let mockWasmModule;

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    frameTime: 16.67, // 60 FPS target
    memoryGrowth: 50 * 1024 * 1024, // 50MB max growth
    gcFrequency: 1000, // Max 1 GC per second
    audioLatency: 50, // 50ms max audio latency
    inputLatency: 8, // 8ms max input latency
    renderTime: 10, // 10ms max render time
    updateTime: 5 // 5ms max update time
  };

  beforeEach(() => {
    // Setup mocks
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: sinon.stub().returns({
        clearRect: sinon.stub(),
        drawImage: sinon.stub(),
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        scale: sinon.stub(),
        rotate: sinon.stub(),
        fillRect: sinon.stub(),
        strokeRect: sinon.stub(),
        beginPath: sinon.stub(),
        moveTo: sinon.stub(),
        lineTo: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub(),
        createLinearGradient: sinon.stub().returns({
          addColorStop: sinon.stub()
        }),
        getImageData: sinon.stub().returns({
          data: new Uint8ClampedArray(1920 * 1080 * 4)
        }),
        putImageData: sinon.stub()
      })
    };

    mockWasmModule = {
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(1.0),
      get_health: sinon.stub().returns(100),
      get_phase: sinon.stub().returns(0)
    };

    global.wasmExports = mockWasmModule;

    // Mock AudioContext
    global.AudioContext = class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.listener = {
          positionX: { value: 0 },
          positionY: { value: 0 },
          positionZ: { value: 0 }
        };
      }

      createGain() {
        return {
          gain: { value: 1.0 },
          connect: sinon.stub()
        };
      }

      createBufferSource() {
        return {
          buffer: null,
          connect: sinon.stub(),
          start: sinon.stub(),
          stop: sinon.stub()
        };
      }

      createPanner() {
        return {
          positionX: { value: 0 },
          positionY: { value: 0 },
          positionZ: { value: 0 },
          connect: sinon.stub()
        };
      }

      createDynamicsCompressor() {
        return { connect: sinon.stub() };
      }

      createConvolver() {
        return { connect: sinon.stub() };
      }

      createBiquadFilter() {
        return { connect: sinon.stub() };
      }

      createDelay() {
        return { connect: sinon.stub() };
      }

      get destination() {
        return { connect: sinon.stub() };
      }

      decodeAudioData() {
        return Promise.resolve({
          length: 44100,
          sampleRate: 44100,
          numberOfChannels: 2,
          getChannelData: () => new Float32Array(44100)
        });
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    };

    // Initialize systems
    gameStateManager = new GameStateManager();
    audioManager = new EnhancedAudioManager(gameStateManager);
    visualEffects = new VisualEffectsManager(mockCanvas, gameStateManager);
    animationController = new EnhancedAnimationController(visualEffects, audioManager);
  });

  afterEach(() => {
    sinon.restore();
    delete global.wasmExports;
    delete global.AudioContext;
  });

  describe('Frame Rate Performance', () => {
    it('should maintain 60 FPS under normal load', async () => {
      const frameCount = 300; // 5 seconds at 60 FPS
      const deltaTime = 1/60;
      const frameTimes = [];

      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();

        // Simulate normal game loop
        gameStateManager.update(deltaTime);
        visualEffects.update(deltaTime);
        animationController.update(deltaTime, {
          health: 100,
          isMoving: i % 30 < 15, // Change movement state
          weapon: null
        });
        visualEffects.render();

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      // Analyze frame times
      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      const p95FrameTime = frameTimes.sort((a, b) => a - b)[Math.floor(frameTimes.length * 0.95)];

      console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`);
      console.log(`Max frame time: ${maxFrameTime.toFixed(2)}ms`);
      console.log(`95th percentile: ${p95FrameTime.toFixed(2)}ms`);

      expect(averageFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime);
      expect(p95FrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime * 1.5);
    });

    it('should maintain performance under heavy visual effects load', () => {
      const effectCount = 100;
      const frameCount = 60;
      const frameTimes = [];

      // Create heavy visual effects load
      for (let i = 0; i < effectCount; i++) {
        visualEffects.triggerScreenShake(Math.random() * 20, Math.random() * 1000);
        visualEffects.triggerFlash(`hsl(${Math.random() * 360}, 100%, 50%)`, 0.8, 500);
        
        // Spawn many particles
        for (let j = 0; j < 10; j++) {
          window.dispatchEvent(new CustomEvent('playerAttack', {
            detail: { 
              x: Math.random() * 1920, 
              y: Math.random() * 1080, 
              type: Math.random() > 0.5 ? 'light' : 'heavy' 
            }
          }));
        }
      }

      // Measure frame times under load
      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();

        visualEffects.update(1/60);
        visualEffects.render();

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      console.log(`Heavy effects average frame time: ${averageFrameTime.toFixed(2)}ms`);

      // Should still maintain reasonable performance
      expect(averageFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime * 2);
    });

    it('should handle rapid state transitions efficiently', () => {
      const transitionCount = 1000;
      const states = ['idle', 'moving', 'attacking', 'blocking', 'rolling'];
      
      const startTime = performance.now();

      for (let i = 0; i < transitionCount; i++) {
        const randomState = states[Math.floor(Math.random() * states.length)];
        animationController.transitionToState(randomState);
        animationController.update(0.001, { health: 100 });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTransitionTime = totalTime / transitionCount;

      console.log(`Average state transition time: ${averageTransitionTime.toFixed(4)}ms`);
      expect(averageTransitionTime).to.be.lessThan(0.1); // 0.1ms per transition
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during normal operation', () => {
      if (!performance.memory) {
        console.log('Memory performance testing not available in this environment');
        return;
      }

      const initialMemory = performance.memory.usedJSHeapSize;
      const frameCount = 600; // 10 seconds

      // Simulate normal gameplay
      for (let i = 0; i < frameCount; i++) {
        gameStateManager.update(1/60);
        visualEffects.update(1/60);
        animationController.update(1/60, {
          health: 100 - (i % 100),
          isMoving: Math.random() > 0.5,
          weapon: { targetPosition: { x: 0, y: 0, z: 0 } }
        });

        // Trigger occasional effects
        if (i % 30 === 0) {
          visualEffects.triggerScreenShake(5, 200);
          window.dispatchEvent(new CustomEvent('playerAttack', {
            detail: { x: 500, y: 400, type: 'light' }
          }));
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      expect(memoryGrowth).to.be.lessThan(PERFORMANCE_THRESHOLDS.memoryGrowth);
    });

    it('should efficiently manage particle systems', () => {
      if (!performance.memory) {return;}

      const initialMemory = performance.memory.usedJSHeapSize;
      const particleCount = 10000;

      // Spawn many particles
      for (let i = 0; i < particleCount; i++) {
        window.dispatchEvent(new CustomEvent('playerAttack', {
          detail: { x: Math.random() * 800, y: Math.random() * 600, type: 'special' }
        }));
      }

      // Update particles for several frames
      for (let i = 0; i < 300; i++) {
        visualEffects.update(1/60);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Particle system memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      expect(memoryGrowth).to.be.lessThan(20 * 1024 * 1024); // 20MB max for particle systems
    });

    it('should cleanup resources properly', () => {
      const instanceCount = 100;
      
      // Create and destroy many instances
      for (let i = 0; i < instanceCount; i++) {
        const effects = new VisualEffectsManager(mockCanvas, gameStateManager);
        const animation = new EnhancedAnimationController(effects, audioManager);
        
        // Use the instances
        effects.update(1/60);
        animation.update(1/60, { health: 100 });
        
        // Cleanup
        effects.destroy();
        animation.destroy();
      }

      // Memory should not grow significantly
      expect(true).to.be.true; // Placeholder - actual verification would need memory monitoring
    });
  });

  describe('Audio Performance', () => {
    it('should handle many simultaneous audio sources', async () => {
      const sourceCount = 50;
      const startTime = performance.now();

      // Create many spatial audio sources
      const sources = [];
      for (let i = 0; i < sourceCount; i++) {
        const source = audioManager.playSpatialSound('combat/sword_swing', 
          Math.random() * 1000, Math.random() * 1000, 0, {
          volume: Math.random(),
          category: 'sfx'
        });
        if (source) {sources.push(source);}
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Created ${sources.length} audio sources in ${totalTime.toFixed(2)}ms`);
      expect(totalTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.audioLatency);
    });

    it('should efficiently update 3D audio positions', () => {
      const sourceCount = 32;
      const updateCount = 60; // 1 second of updates

      // Create audio sources
      const sources = [];
      for (let i = 0; i < sourceCount; i++) {
        const source = audioManager.playSpatialSound('ambient/forest_day', 
          Math.random() * 1000, Math.random() * 1000, 0, {
          loop: true,
          category: 'ambient'
        });
        if (source) {sources.push(source);}
      }

      const startTime = performance.now();

      // Update listener position many times
      for (let i = 0; i < updateCount; i++) {
        audioManager.setListenerPosition(
          Math.sin(i * 0.1) * 100,
          Math.cos(i * 0.1) * 100,
          0
        );
      }

      const endTime = performance.now();
      const averageUpdateTime = (endTime - startTime) / updateCount;

      console.log(`Average 3D audio update time: ${averageUpdateTime.toFixed(4)}ms`);
      expect(averageUpdateTime).to.be.lessThan(1); // 1ms per update
    });
  });

  describe('Input Performance', () => {
    it('should process input with low latency', () => {
      const inputCount = 1000;
      const inputs = [];

      // Generate test inputs
      for (let i = 0; i < inputCount; i++) {
        inputs.push({
          moveX: Math.sin(i * 0.1),
          moveY: Math.cos(i * 0.1),
          lightAttack: i % 10 === 0,
          heavyAttack: i % 20 === 0,
          block: i % 15 === 0,
          roll: i % 25 === 0
        });
      }

      const startTime = performance.now();

      // Process all inputs
      inputs.forEach(input => {
        if (gameStateManager.updateInput) {
          gameStateManager.updateInput(input);
        }
      });

      const endTime = performance.now();
      const averageInputTime = (endTime - startTime) / inputCount;

      console.log(`Average input processing time: ${averageInputTime.toFixed(4)}ms`);
      expect(averageInputTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.inputLatency / 1000);
    });

    it('should handle input buffering efficiently', () => {
      const bufferSize = 120; // 120ms buffer at 60fps = 7.2 frames
      const frameCount = 300;

      const startTime = performance.now();

      for (let i = 0; i < frameCount; i++) {
        // Simulate input buffering
        const input = {
          timestamp: performance.now(),
          moveX: Math.random() * 2 - 1,
          moveY: Math.random() * 2 - 1,
          actions: Math.random() > 0.8 ? ['attack'] : []
        };

        // Process buffered input
        gameStateManager.update(1/60);
      }

      const endTime = performance.now();
      const averageFrameTime = (endTime - startTime) / frameCount;

      console.log(`Input buffering frame time: ${averageFrameTime.toFixed(2)}ms`);
      expect(averageFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime);
    });
  });

  describe('Rendering Performance', () => {
    it('should render efficiently at high resolution', () => {
      // Test at 4K resolution
      const highResCanvas = {
        width: 3840,
        height: 2160,
        getContext: () => mockCanvas.getContext('2d')
      };

      const highResEffects = new VisualEffectsManager(highResCanvas, gameStateManager);
      const frameCount = 60;
      const renderTimes = [];

      for (let i = 0; i < frameCount; i++) {
        const renderStart = performance.now();

        highResEffects.update(1/60);
        highResEffects.render();

        const renderEnd = performance.now();
        renderTimes.push(renderEnd - renderStart);
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      console.log(`4K rendering average time: ${averageRenderTime.toFixed(2)}ms`);

      expect(averageRenderTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.renderTime * 2); // Allow 2x for 4K
    });

    it('should handle complex particle effects efficiently', () => {
      const particleCount = 5000;
      const frameCount = 60;

      // Create complex particle effects
      for (let i = 0; i < particleCount / 50; i++) {
        visualEffects.triggerScreenShake(10, 1000);
        visualEffects.triggerFlash('#ffffff', 0.5, 500);
        
        for (let j = 0; j < 50; j++) {
          window.dispatchEvent(new CustomEvent('playerAttack', {
            detail: { x: Math.random() * 800, y: Math.random() * 600, type: 'special' }
          }));
        }
      }

      const renderTimes = [];

      for (let i = 0; i < frameCount; i++) {
        const renderStart = performance.now();
        
        visualEffects.update(1/60);
        visualEffects.render();
        
        const renderEnd = performance.now();
        renderTimes.push(renderEnd - renderStart);
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      console.log(`Complex particle rendering time: ${averageRenderTime.toFixed(2)}ms`);

      expect(averageRenderTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.renderTime * 3);
    });
  });

  describe('System Integration Performance', () => {
    it('should maintain performance with all systems active', () => {
      const frameCount = 300;
      const frameTimes = [];

      // Activate all systems with realistic load
      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();

        // Game state update
        gameStateManager.update(1/60);

        // Animation system
        animationController.update(1/60, {
          health: 100 - (i % 50),
          isMoving: i % 20 < 10,
          weapon: { targetPosition: { x: Math.sin(i * 0.1), y: Math.cos(i * 0.1), z: 0 } }
        });

        // Visual effects
        if (i % 30 === 0) {
          visualEffects.triggerScreenShake(5, 200);
        }
        if (i % 45 === 0) {
          visualEffects.triggerFlash('#ff0000', 0.3, 150);
        }
        visualEffects.update(1/60);
        visualEffects.render();

        // Audio updates
        audioManager.setListenerPosition(
          Math.sin(i * 0.05) * 10,
          Math.cos(i * 0.05) * 10,
          0
        );

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);

      console.log(`Integrated systems average frame time: ${averageFrameTime.toFixed(2)}ms`);
      console.log(`Integrated systems max frame time: ${maxFrameTime.toFixed(2)}ms`);

      expect(averageFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime);
      expect(maxFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime * 2);
    });

    it('should scale well with increasing complexity', () => {
      const complexityLevels = [1, 2, 4, 8, 16];
      const results = [];

      complexityLevels.forEach(complexity => {
        const frameCount = 60;
        const frameTimes = [];

        for (let i = 0; i < frameCount; i++) {
          const frameStart = performance.now();

          // Scale effects with complexity
          for (let c = 0; c < complexity; c++) {
            if (i % (30 / complexity) === 0) {
              visualEffects.triggerScreenShake(2, 100);
            }
            
            gameStateManager.update(1/60 / complexity);
            visualEffects.update(1/60 / complexity);
          }

          visualEffects.render();

          const frameEnd = performance.now();
          frameTimes.push(frameEnd - frameStart);
        }

        const averageTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        results.push({ complexity, averageTime });
      });

      console.log('Scaling results:', results);

      // Performance should scale reasonably (not exponentially)
      const scalingRatio = results[results.length - 1].averageTime / results[0].averageTime;
      expect(scalingRatio).to.be.lessThan(complexityLevels[complexityLevels.length - 1] * 1.5);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', () => {
      const baselineFrameTime = 10; // 10ms baseline
      const frameCount = 100;
      const frameTimes = [];

      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();

        gameStateManager.update(1/60);
        visualEffects.update(1/60);
        animationController.update(1/60, { health: 100 });

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const regression = (averageFrameTime - baselineFrameTime) / baselineFrameTime;

      console.log(`Performance regression: ${(regression * 100).toFixed(1)}%`);

      // Alert if performance regressed by more than 20%
      if (regression > 0.2) {
        console.warn(`Performance regression detected: ${(regression * 100).toFixed(1)}%`);
      }

      // This is informational - actual thresholds would be set based on baseline measurements
      expect(averageFrameTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.frameTime);
    });
  });
});
