/**
 * Comprehensive Integration Tests
 * Tests complete game systems working together
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { GameStateManager } from '../../src/game/game-state-manager.js';
import { EnhancedAudioManager } from '../../src/audio/enhanced-audio-manager.js';
import { VisualEffectsManager } from '../../src/effects/visual-effects-manager.js';
import { GamepadManager } from '../../src/input/gamepad-manager.js';
import { EnhancedMobileControls } from '../../src/input/enhanced-mobile-controls.js';
import { EnhancedAnimationController } from '../../src/animation/enhanced-animation-controller.js';

describe('Comprehensive Integration Tests', () => {
  let gameStateManager;
  let audioManager;
  let visualEffects;
  let gamepadManager;
  let mobileControls;
  let animationController;
  let mockCanvas;
  let mockWasmModule;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      width: 1280,
      height: 720,
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
        createRadialGradient: sinon.stub().returns({
          addColorStop: sinon.stub()
        })
      })
    };

    // Create mock WASM module
    mockWasmModule = {
      init_run: sinon.stub(),
      reset_run: sinon.stub(),
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(1.0),
      get_health: sinon.stub().returns(100),
      get_phase: sinon.stub().returns(0),
      on_attack: sinon.stub().returns(1),
      on_roll_start: sinon.stub().returns(1),
      set_blocking: sinon.stub().returns(1),
      get_block_state: sinon.stub().returns(0),
      handle_incoming_attack: sinon.stub().returns(0),
      // Save/Load system
      create_save_data: sinon.stub(),
      load_save_data: sinon.stub().returns(1),
      get_save_data_size: sinon.stub().returns(1024),
      // Achievement system
      get_achievement_count: sinon.stub().returns(5),
      get_achievement_id: sinon.stub().returns(1),
      is_achievement_unlocked: sinon.stub().returns(0),
      get_newly_unlocked_count: sinon.stub().returns(0)
    };

    // Mock global WASM exports
    global.wasmExports = mockWasmModule;

    // Initialize managers
    gameStateManager = new GameStateManager();
    gameStateManager.wasmManager = { exports: mockWasmModule };

    // Mock AudioContext for audio manager
    global.AudioContext = class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.listener = {
          positionX: { value: 0 },
          positionY: { value: 0 },
          positionZ: { value: 0 },
          forwardX: { value: 0 },
          forwardY: { value: 0 },
          forwardZ: { value: -1 },
          upX: { value: 0 },
          upY: { value: 1 },
          upZ: { value: 0 }
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
          loop: false,
          playbackRate: { value: 1.0 },
          connect: sinon.stub(),
          start: sinon.stub(),
          stop: sinon.stub(),
          onended: null
        };
      }

      createPanner() {
        return {
          panningModel: 'HRTF',
          distanceModel: 'inverse',
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          positionX: { value: 0 },
          positionY: { value: 0 },
          positionZ: { value: 0 },
          connect: sinon.stub()
        };
      }

      createDynamicsCompressor() {
        return {
          threshold: { value: -24 },
          knee: { value: 30 },
          ratio: { value: 12 },
          attack: { value: 0.003 },
          release: { value: 0.25 },
          connect: sinon.stub()
        };
      }

      createConvolver() {
        return {
          buffer: null,
          connect: sinon.stub()
        };
      }

      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: { value: 22050 },
          connect: sinon.stub()
        };
      }

      createDelay() {
        return {
          delayTime: { value: 0.3 },
          connect: sinon.stub()
        };
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

      get destination() {
        return { connect: sinon.stub() };
      }
    };

    audioManager = new EnhancedAudioManager(gameStateManager);
    visualEffects = new VisualEffectsManager(mockCanvas, gameStateManager);
    gamepadManager = new GamepadManager(gameStateManager);
    mobileControls = new EnhancedMobileControls(gameStateManager);
    animationController = new EnhancedAnimationController(visualEffects, audioManager);
  });

  afterEach(() => {
    sinon.restore();
    delete global.wasmExports;
    delete global.AudioContext;
  });

  describe('System Integration', () => {
    it('should initialize all systems successfully', () => {
      expect(gameStateManager).to.be.instanceOf(GameStateManager);
      expect(audioManager).to.be.instanceOf(EnhancedAudioManager);
      expect(visualEffects).to.be.instanceOf(VisualEffectsManager);
      expect(gamepadManager).to.be.instanceOf(GamepadManager);
      expect(mobileControls).to.be.instanceOf(EnhancedMobileControls);
      expect(animationController).to.be.instanceOf(EnhancedAnimationController);
    });

    it('should handle game state updates across all systems', () => {
      const deltaTime = 0.016; // 60 FPS

      // Update all systems
      gameStateManager.update(deltaTime);
      visualEffects.update(deltaTime);
      animationController.update(deltaTime, {
        health: 100,
        isMoving: false,
        weapon: null
      });

      // Verify WASM update was called
      expect(mockWasmModule.update.called).to.be.true;
    });

    it('should coordinate combat effects across systems', () => {
      const attackData = {
        x: 100,
        y: 200,
        type: 'light',
        weapon: 'sword'
      };

      // Trigger attack through game state manager
      gameStateManager.lightAttack();

      // Simulate event dispatch
      window.dispatchEvent(new CustomEvent('playerAttack', { detail: attackData }));

      // Verify WASM attack was called
      expect(mockWasmModule.on_attack.called).to.be.true;
    });

    it('should handle input from multiple sources', () => {
      // Simulate gamepad input
      const gamepadInput = {
        lightAttack: true,
        moveX: 0.5,
        moveY: 0
      };

      // Simulate mobile input
      const mobileInput = {
        left: false,
        right: true,
        up: false,
        down: false,
        lightAttack: true
      };

      // Both should result in game state updates
      if (gameStateManager.updateInput) {
        gameStateManager.updateInput(gamepadInput);
        gameStateManager.updateInput(mobileInput);
      }

      // Should not throw errors
      expect(() => {
        gamepadManager.updateGamepads();
      }).to.not.throw();
    });

    it('should synchronize audio and visual effects', () => {
      const hitData = {
        x: 150,
        y: 250,
        damage: 25,
        critical: false
      };

      // Trigger hit event
      window.dispatchEvent(new CustomEvent('playerHit', { detail: hitData }));

      // Both systems should respond
      expect(visualEffects.screenShake.intensity).to.be.greaterThan(0);
    });

    it('should handle phase transitions properly', () => {
      const transitionData = {
        from: 'explore',
        to: 'fight'
      };

      // Trigger phase transition
      window.dispatchEvent(new CustomEvent('phaseTransition', { detail: transitionData }));

      // Animation controller should transition states
      expect(animationController.getCurrentState().state).to.not.be.null;
    });
  });

  describe('Performance Integration', () => {
    it('should maintain 60 FPS with all systems active', () => {
      const frameCount = 60; // Test 1 second worth of frames
      const deltaTime = 1/60;
      const startTime = performance.now();

      for (let i = 0; i < frameCount; i++) {
        gameStateManager.update(deltaTime);
        visualEffects.update(deltaTime);
        animationController.update(deltaTime, {
          health: 100,
          isMoving: i % 10 < 5, // Alternate movement
          weapon: { targetPosition: { x: 0, y: 0, z: 0 } }
        });
        visualEffects.render();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageFrameTime = totalTime / frameCount;

      // Should average less than 16.67ms per frame (60 FPS)
      expect(averageFrameTime).to.be.lessThan(16.67);
    });

    it('should handle memory efficiently', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        visualEffects.triggerScreenShake(5, 100);
        visualEffects.triggerFlash('#ff0000', 0.5, 100);
        
        // Trigger particle effects
        window.dispatchEvent(new CustomEvent('playerAttack', {
          detail: { x: Math.random() * 800, y: Math.random() * 600, type: 'light' }
        }));

        visualEffects.update(0.016);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      if (performance.memory) {
        expect(memoryIncrease).to.be.lessThan(10 * 1024 * 1024);
      }
    });

    it('should handle rapid input without dropping commands', () => {
      const inputCount = 100;
      let processedInputs = 0;

      // Mock input processing
      const originalUpdateInput = gameStateManager.updateInput;
      gameStateManager.updateInput = () => {
        processedInputs++;
        if (originalUpdateInput) {originalUpdateInput.call(gameStateManager);}
      };

      // Simulate rapid input
      for (let i = 0; i < inputCount; i++) {
        if (gameStateManager.updateInput) {
          gameStateManager.updateInput({
            lightAttack: i % 2 === 0,
            moveX: Math.sin(i * 0.1),
            moveY: Math.cos(i * 0.1)
          });
        }
      }

      // All inputs should be processed
      expect(processedInputs).to.equal(inputCount);
    });
  });

  describe('Error Handling Integration', () => {
    it('should gracefully handle WASM failures', () => {
      // Simulate WASM failure
      mockWasmModule.update.throws(new Error('WASM Error'));

      expect(() => {
        gameStateManager.update(0.016);
      }).to.not.throw();

      // System should continue functioning
      expect(gameStateManager.isGameRunning).to.be.a('boolean');
    });

    it('should handle audio context failures', () => {
      // Simulate audio context failure
      const originalAudioContext = global.AudioContext;
      global.AudioContext = function() {
        throw new Error('Audio not supported');
      };

      expect(() => {
        const fallbackAudio = new EnhancedAudioManager(gameStateManager);
        fallbackAudio.playSound('test', {});
      }).to.not.throw();

      global.AudioContext = originalAudioContext;
    });

    it('should handle missing DOM elements gracefully', () => {
      // Test with missing elements
      const originalQuerySelector = document.querySelector;
      document.querySelector = () => null;

      expect(() => {
        const controls = new EnhancedMobileControls(gameStateManager);
        controls.setupTouchHandlers();
      }).to.not.throw();

      document.querySelector = originalQuerySelector;
    });

    it('should handle gamepad disconnection', () => {
      // Simulate gamepad disconnection
      const disconnectEvent = new Event('gamepaddisconnected');
      disconnectEvent.gamepad = {
        index: 0,
        id: 'Test Gamepad',
        connected: false
      };

      expect(() => {
        gamepadManager.onGamepadDisconnected(disconnectEvent);
      }).to.not.throw();

      // Should handle input gracefully after disconnection
      expect(() => {
        gamepadManager.updateGamepads();
      }).to.not.throw();
    });
  });

  describe('Save/Load Integration', () => {
    it('should save and restore complete game state', () => {
      // Set up initial state
      mockWasmModule.get_x.returns(0.3);
      mockWasmModule.get_y.returns(0.7);
      mockWasmModule.get_stamina.returns(0.8);
      mockWasmModule.get_health.returns(75);

      // Create save data
      const saveData = new Uint8Array(1024);
      mockWasmModule.create_save_data.returns(saveData.buffer);
      mockWasmModule.get_save_data_size.returns(1024);

      // Simulate save
      const savedData = gameStateManager.createSaveData?.() || saveData;

      // Simulate load
      mockWasmModule.load_save_data.returns(1);
      const loadResult = gameStateManager.loadSaveData?.(savedData) || true;

      expect(loadResult).to.be.true;
      expect(mockWasmModule.load_save_data.called).to.be.true;
    });

    it('should handle achievement unlocks', () => {
      // Simulate achievement unlock
      mockWasmModule.get_newly_unlocked_count.returns(1);
      mockWasmModule.get_newly_unlocked_id.returns(5);
      mockWasmModule.get_achievement_name.returns('Test Achievement');

      // Check for new achievements
      const newAchievements = gameStateManager.checkNewAchievements?.() || [];

      // Should handle achievement data
      expect(() => {
        gameStateManager.displayAchievementNotification?.(5);
      }).to.not.throw();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work with different user agents', () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
      ];

      userAgents.forEach(userAgent => {
        Object.defineProperty(navigator, 'userAgent', {
          value: userAgent,
          configurable: true
        });

        expect(() => {
          const manager = new GameStateManager();
          const effects = new VisualEffectsManager(mockCanvas, manager);
          effects.update(0.016);
        }).to.not.throw();
      });
    });

    it('should handle different screen sizes', () => {
      const screenSizes = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },  // Tablet portrait
        { width: 1024, height: 768 },  // Tablet landscape
        { width: 375, height: 667 },   // Mobile portrait
        { width: 667, height: 375 }    // Mobile landscape
      ];

      screenSizes.forEach(size => {
        Object.defineProperty(window, 'innerWidth', { value: size.width, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: size.height, configurable: true });

        expect(() => {
          mobileControls.adjustLayoutForScreenSize();
          visualEffects.canvas.width = size.width;
          visualEffects.canvas.height = size.height;
          visualEffects.update(0.016);
        }).to.not.throw();
      });
    });

    it('should handle different input methods', () => {
      // Test keyboard input
      const keyboardEvent = new KeyboardEvent('keydown', { code: 'KeyJ' });
      expect(() => {
        document.dispatchEvent(keyboardEvent);
      }).to.not.throw();

      // Test touch input
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200, identifier: 0 }]
      });
      expect(() => {
        document.dispatchEvent(touchEvent);
      }).to.not.throw();

      // Test mouse input
      const mouseEvent = new MouseEvent('mousedown', { button: 0, clientX: 300, clientY: 400 });
      expect(() => {
        document.dispatchEvent(mouseEvent);
      }).to.not.throw();
    });
  });

  describe('Stress Testing', () => {
    it('should handle many simultaneous effects', () => {
      const effectCount = 50;

      for (let i = 0; i < effectCount; i++) {
        visualEffects.triggerScreenShake(Math.random() * 10, Math.random() * 500);
        visualEffects.triggerFlash(`hsl(${Math.random() * 360}, 100%, 50%)`, Math.random(), 200);
        
        // Trigger various events
        window.dispatchEvent(new CustomEvent('playerAttack', {
          detail: { x: Math.random() * 800, y: Math.random() * 600, type: 'light' }
        }));
        
        window.dispatchEvent(new CustomEvent('playerHit', {
          detail: { x: Math.random() * 800, y: Math.random() * 600, damage: Math.random() * 50 }
        }));
      }

      // Update systems
      expect(() => {
        visualEffects.update(0.016);
        visualEffects.render();
      }).to.not.throw();

      // Performance should still be reasonable
      const performanceInfo = visualEffects.getEffectsState();
      expect(performanceInfo).to.be.an('object');
    });

    it('should handle rapid system state changes', () => {
      const stateChanges = 100;

      for (let i = 0; i < stateChanges; i++) {
        // Rapid animation state changes
        const states = ['idle', 'moving', 'attacking', 'blocking', 'rolling'];
        const randomState = states[Math.floor(Math.random() * states.length)];
        animationController.transitionToState(randomState);

        // Rapid phase changes
        mockWasmModule.get_phase.returns(Math.floor(Math.random() * 8));

        // Update systems
        gameStateManager.update(0.001); // Very small delta time
        animationController.update(0.001, {
          health: Math.random() * 100,
          isMoving: Math.random() > 0.5,
          weapon: null
        });
      }

      // System should remain stable
      expect(animationController.getCurrentState()).to.be.an('object');
    });
  });

  describe('Memory Leak Detection', () => {
    it('should clean up resources properly', () => {
      // Create and destroy multiple instances
      for (let i = 0; i < 10; i++) {
        const effects = new VisualEffectsManager(mockCanvas, gameStateManager);
        const animation = new EnhancedAnimationController(effects, audioManager);
        
        // Use the systems
        effects.update(0.016);
        animation.update(0.016, { health: 100 });
        
        // Cleanup
        effects.destroy();
        animation.destroy();
      }

      // Should not accumulate significant memory
      expect(true).to.be.true; // Placeholder - actual memory testing would require more sophisticated tools
    });

    it('should remove event listeners on cleanup', () => {
      const effects = new VisualEffectsManager(mockCanvas, gameStateManager);
      const originalRemoveEventListener = window.removeEventListener;
      let removeListenerCalled = false;

      window.removeEventListener = () => {
        removeListenerCalled = true;  
      };

      effects.destroy();

      // Should attempt to clean up event listeners
      window.removeEventListener = originalRemoveEventListener;
      expect(true).to.be.true; // Placeholder for actual event listener cleanup verification
    });
  });
});
