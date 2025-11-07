/**
 * Comprehensive Error Handling Test Suite
 * Tests all error handling systems and edge cases
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';

// Import error handling modules
import { gameErrorHandler } from '../../public/src/utils/game-error-handler.js';
import { networkErrorRecovery } from '../../public/src/utils/network-error-recovery.js';
import { browserAPIFallbacks } from '../../public/src/utils/browser-api-fallbacks.js';
import { inputValidator } from '../../public/src/utils/input-validator.js';
import { errorReporter } from '../../public/src/utils/error-reporter.js';

describe('Error Handling System', () => {
  let mockWasmManager;
  let mockNetworkManager;
  let mockGameStateManager;
  
  beforeEach(() => {
    // Setup DOM environment
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;
    global.performance = { now: () => Date.now() };
    
    // Mock WASM manager
    mockWasmManager = {
      isLoaded: true,
      exports: {
        update: sinon.stub(),
        set_player_input: sinon.stub(),
        get_phase: sinon.stub().returns(0),
        get_x: sinon.stub().returns(0.5),
        get_y: sinon.stub().returns(0.5)
      },
      isFallback: sinon.stub().returns(false),
      getDiagnostics: sinon.stub().returns({
        isLoaded: true,
        isFallbackMode: false
      })
    };
    
    // Mock network manager
    mockNetworkManager = {
      disconnect: sinon.stub().resolves(),
      connect: sinon.stub().resolves(),
      reconnect: sinon.stub().resolves(),
      switchRelay: sinon.stub().resolves({ success: true, relay: 'backup' }),
      discoverPeers: sinon.stub().resolves([{ id: 'peer1' }]),
      connectToServer: sinon.stub().resolves()
    };
    
    // Mock game state manager
    mockGameStateManager = {
      getStateSnapshot: sinon.stub().returns({
        currentPhase: 0,
        playerState: { x: 0.5, y: 0.5 }
      })
    };
    
    // Reset error handlers
    gameErrorHandler.reset();
    networkErrorRecovery.reset();
    inputValidator.resetStats();
    errorReporter.clearErrors();
  });
  
  afterEach(() => {
    sinon.restore();
  });

  describe('Game Error Handler', () => {
    describe('WASM Error Handling', () => {
      it('should handle WASM update function errors', () => {
        const error = new Error('WASM update failed');
        const context = { deltaTime: 0.016 };
        
        const result = gameErrorHandler.handleWasmError('update', error, context);
        
        expect(result).to.have.property('action');
        expect(['skip_frame', 'sanitize_input', 'reset_wasm']).to.include(result.action);
      });
      
      it('should handle invalid delta time', () => {
        const error = new Error('Invalid delta time');
        const context = { deltaTime: -1 };
        
        const result = gameErrorHandler.handleWasmError('update', error, context);
        
        expect(result.action).to.equal('sanitize_input');
        expect(result.sanitizedDeltaTime).to.be.within(0, 0.1);
      });
      
      it('should detect memory corruption', () => {
        const error = new Error('WASM memory bounds exceeded');
        const context = {};
        
        const result = gameErrorHandler.handleWasmError('update', error, context);
        
        expect(result.action).to.equal('reset_wasm');
      });
      
      it('should handle input function errors', () => {
        const error = new Error('Input processing failed');
        const context = {
          inputState: { direction: { x: NaN, y: Infinity } }
        };
        
        const result = gameErrorHandler.handleWasmError('set_player_input', error, context);
        
        expect(result).to.have.property('action');
        expect(['sanitize_input', 'skip_input']).to.include(result.action);
      });
    });

    describe('Combat Error Handling', () => {
      it('should handle invalid attack data', () => {
        const details = {
          attackData: {
            attackerId: null,
            targetId: 'valid-id',
            attackType: 'invalid-type',
            damage: -50
          }
        };
        
        const result = gameErrorHandler.handleCombatError('invalid_attack', details);
        
        expect(result.action).to.equal('block_attack');
      });
      
      it('should handle combat state desync', () => {
        const details = {
          playerStates: { player1: { x: 0.5, y: 0.5 } },
          combatStates: { player1: { health: 100 } }
        };
        
        const result = gameErrorHandler.handleCombatError('state_desync', details);
        
        expect(result.action).to.equal('request_resync');
        expect(result.syncData).to.have.property('timestamp');
      });
      
      it('should handle timing violations', () => {
        const details = {
          expectedTime: 1000,
          actualTime: 1150 // 150ms difference
        };
        
        const result = gameErrorHandler.handleCombatError('timing_violation', details);
        
        expect(result.action).to.equal('reject_action');
      });
      
      it('should allow minor timing differences', () => {
        const details = {
          expectedTime: 1000,
          actualTime: 1050 // 50ms difference (acceptable)
        };
        
        const result = gameErrorHandler.handleCombatError('timing_violation', details);
        
        expect(result.action).to.equal('accept_with_warning');
      });
    });

    describe('Phase Transition Error Handling', () => {
      it('should handle invalid phase transitions', () => {
        const details = {
          fromPhase: 0,
          toPhase: 5, // Invalid jump
          expectedPhase: 1
        };
        
        const result = gameErrorHandler.handlePhaseError('invalid_transition', details);
        
        expect(result.action).to.equal('force_valid_transition');
        expect(result.validPhase).to.equal(1);
      });
      
      it('should handle corrupted choice data', () => {
        const details = {
          choices: null,
          expectedChoiceCount: 3
        };
        
        const result = gameErrorHandler.handlePhaseError('corrupted_choices', details);
        
        expect(result.action).to.equal('regenerate_choices');
        expect(result.fallbackChoices).to.be.an('array');
        expect(result.fallbackChoices).to.have.length(3);
      });
      
      it('should handle state inconsistencies', () => {
        const details = {
          currentState: { phase: 2, choices: [] },
          expectedState: { phase: 2, choices: [1, 2, 3] }
        };
        
        const result = gameErrorHandler.handlePhaseError('state_inconsistency', details);
        
        expect(result.action).to.equal('reset_phase_state');
        expect(result.safeState.currentPhase).to.equal(0);
      });
    });

    describe('Performance Monitoring', () => {
      it('should detect slow update times', () => {
        const slowUpdateTime = 150; // 150ms is very slow
        
        const result = gameErrorHandler.monitorPerformance(slowUpdateTime);
        
        expect(result).to.not.be.null;
        expect(result.action).to.equal('performance_warning');
        expect(result.details.updateTime).to.equal(slowUpdateTime);
      });
      
      it('should track performance history', () => {
        // Add several update times
        gameErrorHandler.monitorPerformance(16);
        gameErrorHandler.monitorPerformance(20);
        gameErrorHandler.monitorPerformance(18);
        
        const avgTime = gameErrorHandler.getAverageUpdateTime();
        
        expect(avgTime).to.be.approximately(18, 2);
      });
    });
  });

  describe('Network Error Recovery', () => {
    describe('Connection Handling', () => {
      it('should handle connection drops', async () => {
        const error = new Error('Connection lost');
        const context = { room: mockNetworkManager };
        
        const result = await networkErrorRecovery.handleConnectionDrop(error, context);
        
        expect(result).to.have.property('success');
        expect(result).to.have.property('action');
      });
      
      it('should handle network timeouts', async () => {
        const error = new Error('Request timeout');
        const context = {};
        
        const result = await networkErrorRecovery.handleNetworkTimeout(error, context);
        
        expect(result).to.have.property('success');
      });
      
      it('should queue failed messages', async () => {
        const message = {
          id: 'test-message',
          type: 'input',
          data: { x: 0.5, y: 0.5 }
        };
        const error = new Error('Send failed');
        
        await networkErrorRecovery.handleMessageFailure(message, error);
        
        const status = networkErrorRecovery.getNetworkStatus();
        expect(status.messageQueue.failedCount).to.be.greaterThan(0);
      });
    });

    describe('Recovery Strategies', () => {
      it('should execute ping test strategy', async () => {
        // Mock successful fetch
        global.fetch = sinon.stub().resolves({});
        
        const result = await networkErrorRecovery.executeRecoveryStrategy('ping_test');
        
        expect(result).to.have.property('success');
        expect(result).to.have.property('pingTime');
      });
      
      it('should execute reconnect strategy', async () => {
        const context = { room: mockNetworkManager };
        
        const result = await networkErrorRecovery.executeRecoveryStrategy('reconnect_current', context);
        
        expect(mockNetworkManager.reconnect.called).to.be.true;
      });
      
      it('should execute relay switch strategy', async () => {
        const context = { networkManager: mockNetworkManager };
        
        const result = await networkErrorRecovery.executeRecoveryStrategy('switch_relay', context);
        
        expect(mockNetworkManager.switchRelay.called).to.be.true;
      });
      
      it('should enter offline mode as fallback', async () => {
        const result = await networkErrorRecovery.executeRecoveryStrategy('offline_mode');
        
        expect(result.success).to.be.true;
        expect(result.action).to.equal('offline_mode');
      });
    });

    describe('Connection Quality Assessment', () => {
      it('should assess excellent connection quality', () => {
        const quality = networkErrorRecovery.assessConnectionQuality(50);
        expect(quality).to.equal('excellent');
      });
      
      it('should assess good connection quality', () => {
        const quality = networkErrorRecovery.assessConnectionQuality(200);
        expect(quality).to.equal('good');
      });
      
      it('should assess poor connection quality', () => {
        const quality = networkErrorRecovery.assessConnectionQuality(800);
        expect(quality).to.equal('poor');
      });
      
      it('should assess critical connection quality', () => {
        const quality = networkErrorRecovery.assessConnectionQuality(2000);
        expect(quality).to.equal('critical');
      });
    });
  });

  describe('Browser API Fallbacks', () => {
    describe('API Detection', () => {
      it('should detect Web Audio API support', async () => {
        global.window.AudioContext = function() {};
        
        await browserAPIFallbacks.checkWebAudioAPI();
        
        const capabilities = browserAPIFallbacks.capabilities;
        expect(capabilities.webAudio).to.be.true;
      });
      
      it('should detect Web Audio API absence', async () => {
        delete global.window.AudioContext;
        delete global.window.webkitAudioContext;
        
        await browserAPIFallbacks.checkWebAudioAPI();
        
        const capabilities = browserAPIFallbacks.capabilities;
        expect(capabilities.webAudio).to.be.false;
      });
      
      it('should detect Canvas API support', async () => {
        // Mock canvas context
        global.document.createElement = sinon.stub().returns({
          getContext: sinon.stub().returns({
            fillStyle: '',
            fillRect: sinon.stub(),
            getImageData: sinon.stub().returns({ data: new Uint8Array(4) })
          })
        });
        
        await browserAPIFallbacks.checkCanvasAPI();
        
        const capabilities = browserAPIFallbacks.capabilities;
        expect(capabilities.canvas).to.be.true;
      });
      
      it('should detect WebRTC API support', async () => {
        global.window.RTCPeerConnection = function() {
          return {
            createOffer: sinon.stub(),
            close: sinon.stub()
          };
        };
        
        await browserAPIFallbacks.checkWebRTCAPI();
        
        const capabilities = browserAPIFallbacks.capabilities;
        expect(capabilities.webRTC).to.be.true;
      });
    });

    describe('Fallback Creation', () => {
      it('should create fallback audio manager', () => {
        const fallbackAudio = browserAPIFallbacks.createFallbackAudioManager();
        
        expect(fallbackAudio).to.have.property('playSound');
        expect(fallbackAudio).to.have.property('playMusic');
        expect(fallbackAudio).to.have.property('setVolume');
        expect(fallbackAudio.isSupported()).to.be.false;
      });
      
      it('should create fallback canvas renderer', () => {
        const fallbackRenderer = browserAPIFallbacks.createFallbackCanvasRenderer();
        
        expect(fallbackRenderer).to.have.property('render');
        expect(fallbackRenderer.isSupported()).to.be.false;
      });
    });
  });

  describe('Input Validator', () => {
    describe('Movement Validation', () => {
      it('should validate normal movement input', () => {
        const result = inputValidator.validateMovement(0.5, -0.3);
        
        expect(result.blocked).to.be.false;
        expect(result.x).to.equal(0.5);
        expect(result.y).to.equal(-0.3);
      });
      
      it('should clamp out-of-bounds movement', () => {
        const result = inputValidator.validateMovement(2.0, -5.0);
        
        expect(result.blocked).to.be.false;
        expect(result.x).to.equal(1.0);
        expect(result.y).to.equal(-1.0);
      });
      
      it('should handle NaN input', () => {
        const result = inputValidator.validateMovement(NaN, 0.5);
        
        expect(result.blocked).to.be.false;
        expect(result.x).to.equal(0);
        expect(result.y).to.equal(0.5);
      });
      
      it('should handle Infinity input', () => {
        const result = inputValidator.validateMovement(Infinity, -Infinity);
        
        expect(result.blocked).to.be.false;
        expect(result.x).to.equal(0);
        expect(result.y).to.equal(0);
      });
      
      it('should block suspicious input patterns', () => {
        const result = inputValidator.validateMovement('<script>alert("hack")</script>', 0);
        
        expect(result.blocked).to.be.true;
        expect(result.x).to.equal(0);
        expect(result.y).to.equal(0);
      });
    });

    describe('Delta Time Validation', () => {
      it('should validate normal delta time', () => {
        const result = inputValidator.validateDeltaTime(0.016);
        
        expect(result).to.equal(0.016);
      });
      
      it('should cap excessive delta time', () => {
        const result = inputValidator.validateDeltaTime(5.0);
        
        expect(result).to.equal(0.1);
      });
      
      it('should handle negative delta time', () => {
        const result = inputValidator.validateDeltaTime(-1.0);
        
        expect(result).to.equal(0.016);
      });
      
      it('should handle NaN delta time', () => {
        const result = inputValidator.validateDeltaTime(NaN);
        
        expect(result).to.equal(0.016);
      });
    });

    describe('Boolean Validation', () => {
      it('should validate true boolean', () => {
        expect(inputValidator.validateBoolean(true)).to.be.true;
        expect(inputValidator.validateBoolean(1)).to.be.true;
        expect(inputValidator.validateBoolean('true')).to.be.true;
        expect(inputValidator.validateBoolean('1')).to.be.true;
      });
      
      it('should validate false boolean', () => {
        expect(inputValidator.validateBoolean(false)).to.be.false;
        expect(inputValidator.validateBoolean(0)).to.be.false;
        expect(inputValidator.validateBoolean('false')).to.be.false;
        expect(inputValidator.validateBoolean('0')).to.be.false;
      });
      
      it('should handle null/undefined', () => {
        expect(inputValidator.validateBoolean(null)).to.be.false;
        expect(inputValidator.validateBoolean(undefined)).to.be.false;
      });
      
      it('should block suspicious boolean strings', () => {
        const result = inputValidator.validateBoolean('<script>true</script>');
        
        expect(result).to.be.false;
      });
    });

    describe('Network Message Validation', () => {
      it('should validate proper input message', () => {
        const message = {
          type: 'input',
          timestamp: Date.now(),
          playerId: 'player-123',
          data: {
            movement: { x: 0.5, y: 0.3 },
            buttons: { attack: true, roll: false }
          }
        };
        
        const result = inputValidator.validateNetworkMessage(message);
        
        expect(result).to.not.be.null;
        expect(result.type).to.equal('input');
        expect(result.data.movement.x).to.equal(0.5);
      });
      
      it('should reject oversized messages', () => {
        const hugeMessage = {
          type: 'input',
          data: 'x'.repeat(20000) // 20KB message
        };
        
        const result = inputValidator.validateNetworkMessage(hugeMessage);
        
        expect(result).to.be.null;
      });
      
      it('should reject invalid message types', () => {
        const message = {
          type: 'malicious_type',
          data: {}
        };
        
        const result = inputValidator.validateNetworkMessage(message);
        
        expect(result).to.be.null;
      });
      
      it('should sanitize chat messages', () => {
        const message = {
          type: 'chat',
          timestamp: Date.now(),
          playerId: 'player-123',
          data: {
            text: '<script>alert("xss")</script>Hello world!'
          }
        };
        
        const result = inputValidator.validateNetworkMessage(message);
        
        expect(result).to.be.null; // Suspicious pattern blocked
      });
    });

    describe('Combat Interaction Validation', () => {
      it('should validate proper attack data', () => {
        const attackData = {
          attackerId: 'player-123',
          targetId: 'player-456',
          attackType: 'light',
          x: 0.5,
          y: 0.5,
          dirX: 1.0,
          dirY: 0.0,
          timestamp: Date.now(),
          damage: 25
        };
        
        const result = inputValidator.validateCombatInteraction(attackData);
        
        expect(result).to.not.be.null;
        expect(result.attackType).to.equal('light');
        expect(result.damage).to.equal(25);
      });
      
      it('should sanitize invalid attack data', () => {
        const attackData = {
          attackerId: null,
          targetId: 'player-456',
          attackType: 'invalid-type',
          x: NaN,
          y: Infinity,
          damage: -100
        };
        
        const result = inputValidator.validateCombatInteraction(attackData);
        
        expect(result).to.not.be.null;
        expect(result.attackType).to.equal('light'); // Fallback
        expect(result.damage).to.equal(0); // Clamped
        expect(result.position.x).to.equal(0); // Sanitized
      });
    });
  });

  describe('Error Reporter', () => {
    describe('Error Collection', () => {
      it('should collect and categorize errors', () => {
        const error = new Error('Test error');
        
        errorReporter.reportError('test', error, { context: 'unit-test' });
        
        const stats = errorReporter.getErrorStatistics();
        expect(stats.totalErrors).to.equal(1);
        expect(stats.categories.test).to.equal(1);
      });
      
      it('should detect error patterns', () => {
        const error = new Error('Recurring error');
        
        // Report the same error multiple times
        for (let i = 0; i < 6; i++) {
          errorReporter.reportError('pattern', error, { attempt: i });
        }
        
        const stats = errorReporter.getErrorStatistics();
        expect(stats.patterns['pattern:Recurring error']).to.equal(6);
      });
      
      it('should classify error severity', () => {
        const criticalError = new Error('WASM update failed');
        const minorError = new Error('Cosmetic issue');
        
        errorReporter.reportError('wasm', criticalError, { function: 'update' });
        errorReporter.reportError('ui', minorError);
        
        const stats = errorReporter.getErrorStatistics();
        expect(stats.severityBreakdown.critical).to.equal(1);
        expect(stats.severityBreakdown.low).to.equal(1);
      });
    });

    describe('System Diagnostics', () => {
      it('should collect browser diagnostics', () => {
        const diagnostics = errorReporter.getSystemDiagnostics();
        
        expect(diagnostics.browser).to.have.property('userAgent');
        expect(diagnostics.browser).to.have.property('language');
        expect(diagnostics.browser).to.have.property('platform');
      });
      
      it('should collect performance metrics', () => {
        const capabilities = errorReporter.getBrowserCapabilities();
        
        expect(capabilities).to.have.property('webAssembly');
        expect(capabilities).to.have.property('webGL');
        expect(capabilities).to.have.property('webAudio');
      });
    });

    describe('Error Reporting', () => {
      it('should generate comprehensive error report', () => {
        // Add some test errors
        errorReporter.reportError('test', new Error('Test error 1'));
        errorReporter.reportError('test', new Error('Test error 2'));
        
        const report = errorReporter.generateErrorReport();
        
        expect(report).to.have.property('timestamp');
        expect(report).to.have.property('errorSummary');
        expect(report).to.have.property('recentErrors');
        expect(report).to.have.property('systemDiagnostics');
        expect(report.errorSummary.totalErrors).to.equal(2);
      });
      
      it('should track validation statistics', () => {
        // Trigger some validations
        inputValidator.validateMovement(0.5, 0.5);
        inputValidator.validateDeltaTime(0.016);
        inputValidator.validateBoolean(true);
        
        const report = errorReporter.generateErrorReport();
        const validationStats = report.componentStatus.inputValidator;
        
        expect(validationStats.totalValidations).to.be.greaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle cascading errors gracefully', async () => {
      // Simulate WASM failure leading to network issues
      const wasmError = new Error('WASM crashed');
      const networkError = new Error('Connection lost during recovery');
      
      // Handle WASM error
      const wasmResult = gameErrorHandler.handleWasmError('update', wasmError);
      expect(wasmResult.action).to.be.oneOf(['reset_wasm', 'skip_frame']);
      
      // Handle subsequent network error
      const networkResult = await networkErrorRecovery.handleConnectionDrop(networkError);
      expect(networkResult).to.have.property('success');
    });
    
    it('should maintain error statistics across components', () => {
      // Generate errors in different components
      gameErrorHandler.handleWasmError('update', new Error('WASM error'));
      inputValidator.validateMovement('<script>hack</script>', 0);
      errorReporter.reportError('integration', new Error('Integration test error'));
      
      // Check that all components have recorded their activity
      const gameStats = gameErrorHandler.getErrorStats();
      const validationStats = inputValidator.getValidationStats();
      const reporterStats = errorReporter.getErrorStatistics();
      
      expect(gameStats.errorState.consecutiveErrors).to.be.greaterThan(0);
      expect(validationStats.blockedInputs).to.be.greaterThan(0);
      expect(reporterStats.totalErrors).to.be.greaterThan(0);
    });
    
    it('should recover from multiple simultaneous errors', async () => {
      // Simulate multiple error conditions
      const errors = [
        { type: 'wasm', error: new Error('Memory corruption') },
        { type: 'network', error: new Error('Connection timeout') },
        { type: 'input', error: new Error('Invalid input detected') }
      ];
      
      const results = await Promise.all(errors.map(async ({ type, error }) => {
        switch (type) {
          case 'wasm':
            return gameErrorHandler.handleWasmError('update', error);
          case 'network':
            return networkErrorRecovery.handleNetworkTimeout(error);
          case 'input':
            return { blocked: inputValidator.validateMovement('invalid', 'input').blocked };
          default:
            return { success: false };
        }
      }));
      
      // All error handlers should provide some form of recovery
      results.forEach(result => {
        expect(result).to.be.an('object');
        expect(result).to.have.property('action').or.have.property('blocked');
      });
    });
  });
});
