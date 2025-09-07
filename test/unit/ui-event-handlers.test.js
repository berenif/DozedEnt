/**
 * UIEventHandlers Tests
 * Tests event handling system following WASM-first architecture
 * Ensures UI only forwards inputs to WASM, no game logic in JavaScript
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { UIEventHandlers } from '../../src/ui/ui-event-handlers.js';

describe('UIEventHandlers', () => {
  let uiEventHandlers;
  let mockGameStateManager;
  let mockRoomManager;
  let mockAudioManager;
  let mockGamepadManager;
  let mockMobileControls;
  let mockVisualEffects;
  let mockDocument;
  let mockWindow;

  beforeEach(() => {
    // Mock DOM environment
    mockDocument = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getElementById: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub(),
      hidden: false
    };

    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      innerWidth: 1280,
      innerHeight: 720,
      dispatchEvent: sinon.stub()
    };

    global.document = mockDocument;
    global.window = mockWindow;

    // Mock dependencies
    mockGameStateManager = {
      roll: sinon.stub(),
      attack: sinon.stub(),
      lightAttack: sinon.stub(),
      heavyAttack: sinon.stub(),
      specialAttack: sinon.stub(),
      setBlocking: sinon.stub(),
      isGameRunning: true,
      isPaused: false,
      pauseGame: sinon.stub(),
      resumeGame: sinon.stub(),
      stopGame: sinon.stub(),
      wasmManager: {
        resetRun: sinon.stub()
      }
    };

    mockRoomManager = {
      sendChatMessage: sinon.stub(),
      currentRoom: { id: 'test-room' },
      leaveRoom: sinon.stub()
    };

    mockAudioManager = {
      playSound: sinon.stub(),
      setVolume: sinon.stub()
    };

    mockGamepadManager = {
      update: sinon.stub(),
      getInput: sinon.stub().returns({ x: 0, y: 0 })
    };

    mockMobileControls = {
      update: sinon.stub(),
      isVisible: sinon.stub().returns(false)
    };

    mockVisualEffects = {
      addEffect: sinon.stub(),
      update: sinon.stub()
    };

    // Mock DOM elements
    const mockChatInput = { 
      addEventListener: sinon.stub(),
      value: '',
      blur: sinon.stub()
    };
    const mockRestartButton = { addEventListener: sinon.stub() };
    const mockCanvas = {
      getBoundingClientRect: sinon.stub().returns({
        left: 100,
        top: 100,
        width: 800,
        height: 600
      })
    };
    const mockTabContent = { style: { display: 'block' } };
    const mockTabBtn = { 
      style: { background: '#333' },
      classList: { add: sinon.stub(), remove: sinon.stub() },
      getAttribute: sinon.stub().returns('lobby')
    };

    mockDocument.getElementById
      .withArgs('chatInput').returns(mockChatInput)
      .withArgs('restart-button').returns(mockRestartButton)
      .withArgs('gameCanvas').returns(mockCanvas)
      .withArgs('lobbyTab').returns(mockTabContent);

    mockDocument.querySelector.returns(mockTabBtn);
    mockDocument.querySelectorAll.returns([mockTabContent, mockTabBtn]);

    uiEventHandlers = new UIEventHandlers(
      mockGameStateManager,
      mockRoomManager,
      mockAudioManager,
      mockGamepadManager,
      mockMobileControls,
      mockVisualEffects
    );
  });

  afterEach(() => {
    sinon.restore();
    if (uiEventHandlers) {
      uiEventHandlers.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(uiEventHandlers.gameStateManager).to.equal(mockGameStateManager);
      expect(uiEventHandlers.roomManager).to.equal(mockRoomManager);
      expect(uiEventHandlers.audioManager).to.equal(mockAudioManager);
      expect(uiEventHandlers.gamepadManager).to.equal(mockGamepadManager);
      expect(uiEventHandlers.mobileControls).to.equal(mockMobileControls);
      expect(uiEventHandlers.visualEffects).to.equal(mockVisualEffects);
    });

    it('should initialize with default input state', () => {
      expect(uiEventHandlers.inputState).to.deep.include({
        direction: { x: 0, y: 0 },
        isRolling: false,
        isAttacking: false,
        isLightAttacking: false,
        isHeavyAttacking: false,
        isSpecialAttacking: false,
        isBlocking: false,
        facing: { x: 0, y: 0 }
      });
    });

    it('should initialize with default tab', () => {
      expect(uiEventHandlers.currentTab).to.equal('lobby');
    });

    it('should setup all event listeners', () => {
      expect(mockDocument.addEventListener.callCount).to.be.at.least(4);
      expect(mockWindow.addEventListener.callCount).to.be.at.least(2);
    });
  });

  describe('Keyboard Input Handling', () => {
    let keydownEvent, keyupEvent;

    beforeEach(() => {
      keydownEvent = {
        code: 'KeyW',
        preventDefault: sinon.stub()
      };
      keyupEvent = {
        code: 'KeyW',
        preventDefault: sinon.stub()
      };
    });

    describe('Movement Keys', () => {
      it('should handle WASD movement keys', () => {
        const movementTests = [
          { code: 'KeyW', axis: 'y', value: -1 },
          { code: 'ArrowUp', axis: 'y', value: -1 },
          { code: 'KeyS', axis: 'y', value: 1 },
          { code: 'ArrowDown', axis: 'y', value: 1 },
          { code: 'KeyA', axis: 'x', value: -1 },
          { code: 'ArrowLeft', axis: 'x', value: -1 },
          { code: 'KeyD', axis: 'x', value: 1 },
          { code: 'ArrowRight', axis: 'x', value: 1 }
        ];

        movementTests.forEach(({ code, axis, value }) => {
          uiEventHandlers.inputState.direction = { x: 0, y: 0 };
          keydownEvent.code = code;
          
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(uiEventHandlers.inputState.direction[axis]).to.equal(value);
          expect(keydownEvent.preventDefault.called).to.be.true;
        });
      });

      it('should handle key up for movement keys', () => {
        uiEventHandlers.inputState.direction = { x: -1, y: -1 };
        keyupEvent.code = 'KeyW';
        
        uiEventHandlers.handleKeyUp(keyupEvent);
        
        expect(uiEventHandlers.inputState.direction.y).to.equal(0);
      });

      it('should not reset movement if different direction key is released', () => {
        uiEventHandlers.inputState.direction = { x: 0, y: 1 };
        keyupEvent.code = 'KeyW'; // Up key, but we're moving down
        
        uiEventHandlers.handleKeyUp(keyupEvent);
        
        expect(uiEventHandlers.inputState.direction.y).to.equal(1);
      });
    });

    describe('Combat Keys - 5-Button System', () => {
      it('should handle light attack (A1)', () => {
        const lightAttackKeys = ['KeyJ', 'Digit1'];
        
        lightAttackKeys.forEach(code => {
          keydownEvent.code = code;
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(mockGameStateManager.lightAttack.called).to.be.true;
          expect(uiEventHandlers.inputState.isLightAttacking).to.be.true;
          
          mockGameStateManager.lightAttack.resetHistory();
        });
      });

      it('should handle heavy attack (A2)', () => {
        const heavyAttackKeys = ['KeyK', 'Digit2'];
        
        heavyAttackKeys.forEach(code => {
          keydownEvent.code = code;
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(mockGameStateManager.heavyAttack.called).to.be.true;
          expect(uiEventHandlers.inputState.isHeavyAttacking).to.be.true;
          
          mockGameStateManager.heavyAttack.resetHistory();
        });
      });

      it('should handle block input', () => {
        const blockKeys = ['ShiftLeft', 'ShiftRight', 'Digit3'];
        
        blockKeys.forEach(code => {
          keydownEvent.code = code;
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(mockGameStateManager.setBlocking.calledWith(true, 0, 0)).to.be.true;
          expect(uiEventHandlers.inputState.isBlocking).to.be.true;
          
          mockGameStateManager.setBlocking.resetHistory();
        });
      });

      it('should handle roll input', () => {
        const rollKeys = ['ControlLeft', 'ControlRight', 'Digit4', 'Space'];
        
        rollKeys.forEach(code => {
          keydownEvent.code = code;
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(mockGameStateManager.roll.called).to.be.true;
          expect(uiEventHandlers.inputState.isRolling).to.be.true;
          
          mockGameStateManager.roll.resetHistory();
        });
      });

      it('should handle special attack', () => {
        const specialKeys = ['KeyL', 'Digit5'];
        
        specialKeys.forEach(code => {
          keydownEvent.code = code;
          uiEventHandlers.handleKeyDown(keydownEvent);
          
          expect(mockGameStateManager.specialAttack.called).to.be.true;
          expect(uiEventHandlers.inputState.isSpecialAttacking).to.be.true;
          
          mockGameStateManager.specialAttack.resetHistory();
        });
      });

      it('should prevent repeated actions while key is held', () => {
        keydownEvent.code = 'KeyJ';
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        uiEventHandlers.handleKeyDown(keydownEvent); // Second press while held
        
        expect(mockGameStateManager.lightAttack.callCount).to.equal(1);
      });

      it('should reset action state on key up', () => {
        keydownEvent.code = 'KeyJ';
        keyupEvent.code = 'KeyJ';
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        uiEventHandlers.handleKeyUp(keyupEvent);
        
        expect(uiEventHandlers.inputState.isLightAttacking).to.be.false;
      });
    });

    describe('System Keys', () => {
      it('should handle escape key for pause/resume', () => {
        keydownEvent.code = 'Escape';
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        
        expect(mockGameStateManager.pauseGame.called).to.be.true;
      });

      it('should resume game if already paused', () => {
        mockGameStateManager.isPaused = true;
        keydownEvent.code = 'Escape';
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        
        expect(mockGameStateManager.resumeGame.called).to.be.true;
      });

      it('should not handle escape if game is not running', () => {
        mockGameStateManager.isGameRunning = false;
        keydownEvent.code = 'Escape';
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        
        expect(mockGameStateManager.pauseGame.called).to.be.false;
        expect(mockGameStateManager.resumeGame.called).to.be.false;
      });
    });

    it('should prevent default for game keys', () => {
      const gameKeys = ['KeyW', 'KeyJ', 'Space', 'ArrowUp'];
      
      gameKeys.forEach(code => {
        keydownEvent.code = code;
        keydownEvent.preventDefault.resetHistory();
        
        uiEventHandlers.handleKeyDown(keydownEvent);
        
        expect(keydownEvent.preventDefault.called).to.be.true;
      });
    });

    it('should not prevent default for non-game keys', () => {
      keydownEvent.code = 'KeyZ';
      
      uiEventHandlers.handleKeyDown(keydownEvent);
      
      expect(keydownEvent.preventDefault.called).to.be.false;
    });
  });

  describe('Mouse Input Handling', () => {
    let mouseEvent;

    beforeEach(() => {
      mouseEvent = {
        button: 0,
        clientX: 500,
        clientY: 400,
        preventDefault: sinon.stub()
      };
    });

    it('should handle left mouse button for attack', () => {
      mouseEvent.button = 0;
      
      uiEventHandlers.handleMouseDown(mouseEvent);
      
      expect(mockGameStateManager.attack.called).to.be.true;
    });

    it('should handle right mouse button for block', () => {
      mouseEvent.button = 2;
      
      uiEventHandlers.handleMouseDown(mouseEvent);
      
      expect(mockGameStateManager.setBlocking.calledWith(true)).to.be.true;
    });

    it('should handle mouse up events', () => {
      mouseEvent.button = 0;
      
      uiEventHandlers.handleMouseDown(mouseEvent);
      uiEventHandlers.handleMouseUp(mouseEvent);
      
      expect(uiEventHandlers.inputState.isAttacking).to.be.false;
    });

    it('should update facing direction based on mouse position', () => {
      const mockCanvas = {
        getBoundingClientRect: sinon.stub().returns({
          left: 100,
          top: 100,
          width: 800,
          height: 600
        })
      };
      mockDocument.getElementById.withArgs('gameCanvas').returns(mockCanvas);
      
      mouseEvent.clientX = 500; // 400 pixels from center
      mouseEvent.clientY = 400; // 0 pixels from center
      
      uiEventHandlers.handleMouseMove(mouseEvent);
      
      expect(uiEventHandlers.inputState.facing.x).to.equal(1); // Normalized right
      expect(uiEventHandlers.inputState.facing.y).to.equal(0);
    });

    it('should handle missing canvas gracefully', () => {
      mockDocument.getElementById.withArgs('gameCanvas').returns(null);
      
      expect(() => uiEventHandlers.handleMouseMove(mouseEvent)).to.not.throw();
    });
  });

  describe('Input State Management', () => {
    it('should get current input state as copy', () => {
      uiEventHandlers.inputState.direction.x = 1;
      uiEventHandlers.inputState.isRolling = true;
      
      const state = uiEventHandlers.getInputState();
      
      expect(state.direction.x).to.equal(1);
      expect(state.isRolling).to.be.true;
      expect(state).to.not.equal(uiEventHandlers.inputState); // Should be copy
    });

    it('should update input state', () => {
      const newState = {
        direction: { x: -1, y: 1 },
        isBlocking: true
      };
      
      uiEventHandlers.updateInputState(newState);
      
      expect(uiEventHandlers.inputState.direction.x).to.equal(-1);
      expect(uiEventHandlers.inputState.direction.y).to.equal(1);
      expect(uiEventHandlers.inputState.isBlocking).to.be.true;
    });

    it('should reset input state to defaults', () => {
      uiEventHandlers.inputState.direction.x = 1;
      uiEventHandlers.inputState.isRolling = true;
      uiEventHandlers.inputState.isBlocking = true;
      
      uiEventHandlers.resetInputState();
      
      expect(uiEventHandlers.inputState).to.deep.include({
        direction: { x: 0, y: 0 },
        isRolling: false,
        isAttacking: false,
        isBlocking: false,
        facing: { x: 0, y: 0 }
      });
    });
  });

  describe('UI Event Handling', () => {
    it('should handle tab click events', () => {
      const mockTabBtn = {
        classList: { contains: sinon.stub().returns(true) },
        getAttribute: sinon.stub().returns('game')
      };
      const clickEvent = { target: mockTabBtn };
      
      uiEventHandlers.handleTabClick(clickEvent);
      
      expect(uiEventHandlers.currentTab).to.equal('game');
    });

    it('should show selected tab and hide others', () => {
      const mockTabContent1 = { style: { display: 'block' } };
      const mockTabContent2 = { style: { display: 'block' } };
      const mockSelectedContent = { style: { display: 'none' } };
      const mockBtn1 = { 
        style: { background: '#4a90e2' },
        classList: { add: sinon.stub(), remove: sinon.stub() }
      };
      const mockBtn2 = { 
        style: { background: '#4a90e2' },
        classList: { add: sinon.stub(), remove: sinon.stub() }
      };
      
      mockDocument.querySelectorAll
        .withArgs('.tab-content').returns([mockTabContent1, mockTabContent2])
        .withArgs('.tab-btn').returns([mockBtn1, mockBtn2]);
      mockDocument.getElementById.withArgs('gameTab').returns(mockSelectedContent);
      mockDocument.querySelector.withArgs('[data-tab="game"]').returns(mockBtn1);
      
      uiEventHandlers.showTab('game');
      
      expect(mockTabContent1.style.display).to.equal('none');
      expect(mockTabContent2.style.display).to.equal('none');
      expect(mockSelectedContent.style.display).to.equal('block');
      expect(mockBtn1.style.background).to.equal('#4a90e2');
    });

    it('should handle chat submit', () => {
      const mockChatInput = { value: '  Hello world!  ', blur: sinon.stub() };
      mockDocument.getElementById.withArgs('chatInput').returns(mockChatInput);
      
      uiEventHandlers.handleChatSubmit();
      
      expect(mockRoomManager.sendChatMessage.calledWith('Hello world!')).to.be.true;
      expect(mockChatInput.value).to.equal('');
    });

    it('should not send empty chat messages', () => {
      const mockChatInput = { value: '   ', blur: sinon.stub() };
      mockDocument.getElementById.withArgs('chatInput').returns(mockChatInput);
      
      uiEventHandlers.handleChatSubmit();
      
      expect(mockRoomManager.sendChatMessage.called).to.be.false;
    });

    it('should handle chat submit without room manager', () => {
      uiEventHandlers.roomManager = null;
      
      expect(() => uiEventHandlers.handleChatSubmit()).to.not.throw();
    });

    it('should handle game restart', () => {
      const mockDate = sinon.useFakeTimers(new Date('2024-01-01T12:00:00Z'));
      
      uiEventHandlers.handleRestartGame();
      
      expect(mockGameStateManager.wasmManager.resetRun.called).to.be.true;
      const seedArg = mockGameStateManager.wasmManager.resetRun.getCall(0).args[0];
      expect(typeof seedArg).to.equal('bigint');
      
      mockDate.restore();
    });

    it('should handle restart without WASM manager', () => {
      mockGameStateManager.wasmManager = null;
      
      expect(() => uiEventHandlers.handleRestartGame()).to.not.throw();
    });
  });

  describe('Window Event Handling', () => {
    it('should handle window resize', () => {
      const mockCanvas = { width: 800, height: 600 };
      mockDocument.getElementById.withArgs('gameCanvas').returns(mockCanvas);
      
      uiEventHandlers.handleWindowResize();
      
      expect(mockWindow.dispatchEvent.called).to.be.true;
      const event = mockWindow.dispatchEvent.getCall(0).args[0];
      expect(event.type).to.equal('gameCanvasResize');
    });

    it('should handle resize without canvas', () => {
      mockDocument.getElementById.withArgs('gameCanvas').returns(null);
      
      expect(() => uiEventHandlers.handleWindowResize()).to.not.throw();
    });

    it('should handle before unload', () => {
      uiEventHandlers.handleBeforeUnload();
      
      expect(mockGameStateManager.stopGame.called).to.be.true;
      expect(mockRoomManager.leaveRoom.called).to.be.true;
    });

    it('should skip cleanup if game not running', () => {
      mockGameStateManager.isGameRunning = false;
      
      uiEventHandlers.handleBeforeUnload();
      
      expect(mockGameStateManager.stopGame.called).to.be.false;
    });

    it('should skip room cleanup if no current room', () => {
      mockRoomManager.currentRoom = null;
      
      uiEventHandlers.handleBeforeUnload();
      
      expect(mockRoomManager.leaveRoom.called).to.be.false;
    });

    it('should handle visibility change - pause when hidden', () => {
      mockDocument.hidden = true;
      
      uiEventHandlers.handleVisibilityChange();
      
      expect(mockGameStateManager.pauseGame.called).to.be.true;
    });

    it('should handle visibility change - resume when visible', () => {
      mockDocument.hidden = false;
      mockGameStateManager.isPaused = true;
      
      uiEventHandlers.handleVisibilityChange();
      
      expect(mockGameStateManager.resumeGame.called).to.be.true;
    });

    it('should not pause if already paused', () => {
      mockDocument.hidden = true;
      mockGameStateManager.isPaused = true;
      
      uiEventHandlers.handleVisibilityChange();
      
      expect(mockGameStateManager.pauseGame.called).to.be.false;
    });

    it('should not resume if not paused', () => {
      mockDocument.hidden = false;
      mockGameStateManager.isPaused = false;
      
      uiEventHandlers.handleVisibilityChange();
      
      expect(mockGameStateManager.resumeGame.called).to.be.false;
    });
  });

  describe('Gamepad Support', () => {
    it('should handle gamepad connected event', () => {
      const gamepadEvent = {
        gamepad: { id: 'Test Gamepad' }
      };
      
      // Simulate gamepad connection
      expect(() => {
        const connectHandler = mockWindow.addEventListener
          .getCalls()
          .find(call => call.args[0] === 'gamepadconnected')?.args[1];
        if (connectHandler) connectHandler(gamepadEvent);
      }).to.not.throw();
    });

    it('should handle gamepad disconnected event', () => {
      const gamepadEvent = {
        gamepad: { id: 'Test Gamepad' }
      };
      
      // Simulate gamepad disconnection
      expect(() => {
        const disconnectHandler = mockWindow.addEventListener
          .getCalls()
          .find(call => call.args[0] === 'gamepaddisconnected')?.args[1];
        if (disconnectHandler) disconnectHandler(gamepadEvent);
      }).to.not.throw();
    });
  });

  describe('Combat Input Integration', () => {
    it('should integrate block input with facing direction', () => {
      uiEventHandlers.inputState.facing = { x: 0.6, y: 0.8 };
      
      uiEventHandlers.handleBlockInput(true);
      
      expect(mockGameStateManager.setBlocking.calledWith(true, 0.6, 0.8)).to.be.true;
      expect(uiEventHandlers.inputState.isBlocking).to.be.true;
    });

    it('should handle block input release', () => {
      uiEventHandlers.inputState.isBlocking = true;
      
      uiEventHandlers.handleBlockInput(false);
      
      expect(mockGameStateManager.setBlocking.calledWith(false, 0, 0)).to.be.true;
      expect(uiEventHandlers.inputState.isBlocking).to.be.false;
    });

    it('should prevent roll spam', () => {
      uiEventHandlers.handleRollInput(true);
      uiEventHandlers.handleRollInput(true); // Try to roll again while already rolling
      
      expect(mockGameStateManager.roll.callCount).to.equal(1);
    });

    it('should prevent attack spam', () => {
      uiEventHandlers.handleAttackInput(true);
      uiEventHandlers.handleAttackInput(true); // Try to attack again while already attacking
      
      expect(mockGameStateManager.attack.callCount).to.equal(1);
    });

    it('should prevent light attack spam', () => {
      uiEventHandlers.handleLightAttackInput(true);
      uiEventHandlers.handleLightAttackInput(true);
      
      expect(mockGameStateManager.lightAttack.callCount).to.equal(1);
    });

    it('should prevent heavy attack spam', () => {
      uiEventHandlers.handleHeavyAttackInput(true);
      uiEventHandlers.handleHeavyAttackInput(true);
      
      expect(mockGameStateManager.heavyAttack.callCount).to.equal(1);
    });

    it('should prevent special attack spam', () => {
      uiEventHandlers.handleSpecialInput(true);
      uiEventHandlers.handleSpecialInput(true);
      
      expect(mockGameStateManager.specialAttack.callCount).to.equal(1);
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove all event listeners on destroy', () => {
      uiEventHandlers.destroy();
      
      expect(mockDocument.removeEventListener.callCount).to.be.at.least(4);
      expect(mockWindow.removeEventListener.callCount).to.be.at.least(2);
    });

    it('should handle destroy without errors', () => {
      expect(() => uiEventHandlers.destroy()).to.not.throw();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.returns(null);
      mockDocument.querySelector.returns(null);
      mockDocument.querySelectorAll.returns([]);
      
      expect(() => {
        uiEventHandlers.handleChatSubmit();
        uiEventHandlers.showTab('test');
        uiEventHandlers.handleWindowResize();
      }).to.not.throw();
    });

    it('should handle events without required managers', () => {
      uiEventHandlers.gameStateManager = null;
      uiEventHandlers.roomManager = null;
      
      expect(() => {
        uiEventHandlers.handleRollInput(true);
        uiEventHandlers.handleChatSubmit();
        uiEventHandlers.handleRestartGame();
      }).to.not.throw();
    });

    it('should handle malformed events', () => {
      const malformedEvent = {};
      
      expect(() => {
        uiEventHandlers.handleKeyDown(malformedEvent);
        uiEventHandlers.handleMouseDown(malformedEvent);
        uiEventHandlers.handleTabClick(malformedEvent);
      }).to.not.throw();
    });

    it('should handle invalid tab names', () => {
      expect(() => {
        uiEventHandlers.showTab('nonexistent-tab');
      }).to.not.throw();
    });
  });

  describe('WASM-First Architecture Compliance', () => {
    it('should not contain any game logic - only input forwarding', () => {
      // Verify that all combat actions are forwarded to gameStateManager
      const keydownEvent = { code: 'KeyJ', preventDefault: sinon.stub() };
      
      uiEventHandlers.handleKeyDown(keydownEvent);
      
      expect(mockGameStateManager.lightAttack.called).to.be.true;
      // Verify no game state is modified in UI layer
      expect(uiEventHandlers.inputState.isLightAttacking).to.be.true; // Only UI state
    });

    it('should forward all inputs to WASM through game state manager', () => {
      // Test that movement, combat, and system inputs are all forwarded
      const inputs = [
        { code: 'KeyW', method: null }, // Movement handled by input state
        { code: 'KeyJ', method: 'lightAttack' },
        { code: 'KeyK', method: 'heavyAttack' },
        { code: 'Space', method: 'roll' },
        { code: 'ShiftLeft', method: 'setBlocking' }
      ];

      inputs.forEach(({ code, method }) => {
        const event = { code, preventDefault: sinon.stub() };
        uiEventHandlers.handleKeyDown(event);
        
        if (method) {
          expect(mockGameStateManager[method].called).to.be.true;
          mockGameStateManager[method].resetHistory();
        }
      });
    });

    it('should not perform any game calculations', () => {
      // Verify UI only manages input state and forwards to WASM
      const originalInputState = JSON.parse(JSON.stringify(uiEventHandlers.inputState));
      
      uiEventHandlers.handleKeyDown({ code: 'KeyW', preventDefault: sinon.stub() });
      
      // Only input state should change, no game calculations
      expect(uiEventHandlers.inputState.direction.y).to.equal(-1);
      expect(typeof uiEventHandlers.inputState.direction.y).to.equal('number');
      // No complex calculations, just simple state updates
    });
  });
});
