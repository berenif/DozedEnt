import { expect } from 'chai';
import sinon from 'sinon';
import { InputManager } from '../../src/input/input-manager.js';

describe('InputManager - Comprehensive Tests', () => {
  let inputManager;
  let mockWasmManager;
  let mockDocument;
  let mockWindow;
  let mockNavigator;

  beforeEach(() => {
    // Mock WASM Manager
    mockWasmManager = {
      setPlayerInput: sinon.stub(),
      exports: {
        set_player_input: sinon.stub()
      }
    };

    // Mock DOM and browser APIs
    mockDocument = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getElementById: sinon.stub(),
      createElement: sinon.stub().returns({
        style: {},
        appendChild: sinon.stub(),
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub()
      })
    };

    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      innerWidth: 1920,
      innerHeight: 1080,
      ontouchstart: undefined // Desktop by default
    };

    mockNavigator = {
      getGamepads: sinon.stub().returns([]),
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // Set up global mocks
    global.document = mockDocument;
    global.window = mockWindow;
    global.navigator = mockNavigator;

    inputManager = new InputManager(mockWasmManager);
  });

  afterEach(() => {
    sinon.restore();
    delete global.document;
    delete global.window;
    delete global.navigator;
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      expect(inputManager.wasmManager).to.equal(mockWasmManager);
      expect(inputManager.inputState.direction.x).to.equal(0);
      expect(inputManager.inputState.direction.y).to.equal(0);
      expect(inputManager.inputState.lightAttack).to.be.false;
      expect(inputManager.inputState.heavyAttack).to.be.false;
      expect(inputManager.inputState.block).to.be.false;
      expect(inputManager.inputState.roll).to.be.false;
      expect(inputManager.inputState.special).to.be.false;
    });

    it('should detect mobile device correctly', () => {
      // Test desktop detection
      expect(inputManager.isMobile).to.be.false;
      
      // Test mobile detection
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const mobileInputManager = new InputManager(mockWasmManager);
      expect(mobileInputManager.isMobile).to.be.true;
    });

    it('should detect touch capability', () => {
      expect(inputManager.hasTouch).to.be.false;
      
      // Test with touch support
      mockWindow.ontouchstart = {};
      const touchInputManager = new InputManager(mockWasmManager);
      expect(touchInputManager.hasTouch).to.be.true;
    });

    it('should detect gamepad capability', () => {
      expect(inputManager.hasGamepad).to.be.true;
      
      // Test without gamepad support
      delete mockNavigator.getGamepads;
      const noGamepadInputManager = new InputManager(mockWasmManager);
      expect(noGamepadInputManager.hasGamepad).to.be.false;
    });
  });

  describe('Keyboard Input', () => {
    it('should handle WASD movement keys', () => {
      // Test W key (up)
      inputManager.handleKeyDown({ code: 'KeyW' });
      expect(inputManager.inputState.direction.y).to.equal(-1);
      
      // Test A key (left)
      inputManager.handleKeyDown({ code: 'KeyA' });
      expect(inputManager.inputState.direction.x).to.equal(-1);
      
      // Test S key (down)
      inputManager.handleKeyDown({ code: 'KeyS' });
      expect(inputManager.inputState.direction.y).to.equal(1);
      
      // Test D key (right)
      inputManager.handleKeyDown({ code: 'KeyD' });
      expect(inputManager.inputState.direction.x).to.equal(1);
    });

    it('should handle arrow key movement', () => {
      inputManager.handleKeyDown({ code: 'ArrowUp' });
      expect(inputManager.inputState.direction.y).to.equal(-1);
      
      inputManager.handleKeyDown({ code: 'ArrowLeft' });
      expect(inputManager.inputState.direction.x).to.equal(-1);
      
      inputManager.handleKeyDown({ code: 'ArrowDown' });
      expect(inputManager.inputState.direction.y).to.equal(1);
      
      inputManager.handleKeyDown({ code: 'ArrowRight' });
      expect(inputManager.inputState.direction.x).to.equal(1);
    });

    it('should handle 5-button combat system', () => {
      // Light Attack - J or 1
      inputManager.handleKeyDown({ code: 'KeyJ' });
      expect(inputManager.inputState.lightAttack).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Digit1' });
      expect(inputManager.inputState.lightAttack).to.be.true;
      
      // Heavy Attack - K or 2
      inputManager.handleKeyDown({ code: 'KeyK' });
      expect(inputManager.inputState.heavyAttack).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Digit2' });
      expect(inputManager.inputState.heavyAttack).to.be.true;
      
      // Block - Shift or 3
      inputManager.handleKeyDown({ code: 'ShiftLeft' });
      expect(inputManager.inputState.block).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Digit3' });
      expect(inputManager.inputState.block).to.be.true;
      
      // Roll - Ctrl/Space or 4
      inputManager.handleKeyDown({ code: 'ControlLeft' });
      expect(inputManager.inputState.roll).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Space' });
      expect(inputManager.inputState.roll).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Digit4' });
      expect(inputManager.inputState.roll).to.be.true;
      
      // Special - L or 5
      inputManager.handleKeyDown({ code: 'KeyL' });
      expect(inputManager.inputState.special).to.be.true;
      
      inputManager.handleKeyDown({ code: 'Digit5' });
      expect(inputManager.inputState.special).to.be.true;
    });

    it('should handle key release', () => {
      // Press and release movement key
      inputManager.handleKeyDown({ code: 'KeyW' });
      expect(inputManager.inputState.direction.y).to.equal(-1);
      
      inputManager.handleKeyUp({ code: 'KeyW' });
      expect(inputManager.inputState.direction.y).to.equal(0);
      
      // Press and release combat key
      inputManager.handleKeyDown({ code: 'KeyJ' });
      expect(inputManager.inputState.lightAttack).to.be.true;
      
      inputManager.handleKeyUp({ code: 'KeyJ' });
      expect(inputManager.inputState.lightAttack).to.be.false;
    });

    it('should handle diagonal movement', () => {
      inputManager.handleKeyDown({ code: 'KeyW' });
      inputManager.handleKeyDown({ code: 'KeyD' });
      
      expect(inputManager.inputState.direction.x).to.equal(1);
      expect(inputManager.inputState.direction.y).to.equal(-1);
      
      // Should normalize diagonal movement
      inputManager.updateWasmInput();
      expect(mockWasmManager.setPlayerInput).to.have.been.called;
    });
  });

  describe('Mouse Input', () => {
    it('should handle mouse movement for facing direction', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: sinon.stub()
      };
      
      inputManager.handleMouseMove(mockEvent);
      
      expect(inputManager.inputState.pointer.x).to.equal(100);
      expect(inputManager.inputState.pointer.y).to.equal(200);
    });

    it('should handle mouse clicks', () => {
      const mockEvent = {
        button: 0, // Left click
        clientX: 100,
        clientY: 200,
        preventDefault: sinon.stub()
      };
      
      inputManager.handleMouseDown(mockEvent);
      expect(inputManager.inputState.pointer.down).to.be.true;
      
      inputManager.handleMouseUp(mockEvent);
      expect(inputManager.inputState.pointer.down).to.be.false;
    });

    it('should calculate facing direction from mouse position', () => {
      // Mock canvas element for position calculation
      const mockCanvas = {
        getBoundingClientRect: sinon.stub().returns({
          left: 0,
          top: 0,
          width: 800,
          height: 600
        })
      };
      
      mockDocument.getElementById.withArgs('game-canvas').returns(mockCanvas);
      
      const mockEvent = {
        clientX: 600, // Right side
        clientY: 200, // Top side
        preventDefault: sinon.stub()
      };
      
      inputManager.handleMouseMove(mockEvent);
      
      // Should calculate normalized facing direction
      expect(inputManager.inputState.facing.x).to.be.greaterThan(0);
      expect(inputManager.inputState.facing.y).to.be.lessThan(0);
    });
  });

  describe('Touch Input', () => {
    beforeEach(() => {
      mockWindow.ontouchstart = {};
      inputManager.hasTouch = true;
    });

    it('should handle touch start for virtual joystick', () => {
      const mockEvent = {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchStart(mockEvent);
      
      expect(inputManager.touchState.joystick.active).to.be.true;
      expect(inputManager.touchState.joystick.center.x).to.equal(100);
      expect(inputManager.touchState.joystick.center.y).to.equal(500);
    });

    it('should handle touch move for joystick input', () => {
      // Start touch
      const startEvent = {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchStart(startEvent);
      
      // Move touch
      const moveEvent = {
        touches: [{
          identifier: 0,
          clientX: 130,
          clientY: 480
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchMove(moveEvent);
      
      expect(inputManager.inputState.direction.x).to.be.greaterThan(0);
      expect(inputManager.inputState.direction.y).to.be.lessThan(0);
    });

    it('should handle touch end', () => {
      // Start and then end touch
      const startEvent = {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchStart(startEvent);
      
      const endEvent = {
        changedTouches: [{
          identifier: 0
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchEnd(endEvent);
      
      expect(inputManager.touchState.joystick.active).to.be.false;
      expect(inputManager.inputState.direction.x).to.equal(0);
      expect(inputManager.inputState.direction.y).to.equal(0);
    });

    it('should limit joystick distance', () => {
      const startEvent = {
        touches: [{
          identifier: 0,
          clientX: 100,
          clientY: 500
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchStart(startEvent);
      
      // Move very far from center
      const moveEvent = {
        touches: [{
          identifier: 0,
          clientX: 200, // 100 pixels away
          clientY: 400  // 100 pixels away
        }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchMove(moveEvent);
      
      // Direction should be normalized to max 1.0
      expect(Math.abs(inputManager.inputState.direction.x)).to.be.at.most(1);
      expect(Math.abs(inputManager.inputState.direction.y)).to.be.at.most(1);
    });
  });

  describe('Gamepad Input', () => {
    beforeEach(() => {
      inputManager.hasGamepad = true;
      mockNavigator.getGamepads.returns([{
        id: 'Test Gamepad',
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array(16).fill().map(() => ({ pressed: false, value: 0 }))
      }]);
    });

    it('should detect connected gamepad', () => {
      inputManager.updateGamepadInput();
      expect(inputManager.inputState.gamepadIndex).to.equal(0);
    });

    it('should handle analog stick input', () => {
      const mockGamepad = {
        id: 'Test Gamepad',
        connected: true,
        axes: [0.5, -0.3, 0, 0], // Left stick right and up
        buttons: Array(16).fill().map(() => ({ pressed: false, value: 0 }))
      };
      
      mockNavigator.getGamepads.returns([mockGamepad]);
      
      inputManager.updateGamepadInput();
      
      expect(inputManager.inputState.direction.x).to.equal(0.5);
      expect(inputManager.inputState.direction.y).to.equal(-0.3);
    });

    it('should apply deadzone to analog input', () => {
      const mockGamepad = {
        id: 'Test Gamepad',
        connected: true,
        axes: [0.1, 0.05, 0, 0], // Small movement within deadzone
        buttons: Array(16).fill().map(() => ({ pressed: false, value: 0 }))
      };
      
      mockNavigator.getGamepads.returns([mockGamepad]);
      
      inputManager.updateGamepadInput();
      
      // Should be filtered out by deadzone
      expect(inputManager.inputState.direction.x).to.equal(0);
      expect(inputManager.inputState.direction.y).to.equal(0);
    });

    it('should handle gamepad button input', () => {
      const mockGamepad = {
        id: 'Test Gamepad',
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array(16).fill().map((_, i) => ({ 
          pressed: i === 0, // A button pressed
          value: i === 0 ? 1 : 0 
        }))
      };
      
      mockNavigator.getGamepads.returns([mockGamepad]);
      
      inputManager.updateGamepadInput();
      
      // A button should map to light attack
      expect(inputManager.inputState.lightAttack).to.be.true;
    });
  });

  describe('WASM Integration', () => {
    it('should send input to WASM manager', () => {
      inputManager.inputState.direction.x = 0.5;
      inputManager.inputState.direction.y = -0.3;
      inputManager.inputState.lightAttack = true;
      
      inputManager.updateWasmInput();
      
      expect(mockWasmManager.setPlayerInput).to.have.been.calledWith(
        0.5, -0.3, false, false, true, false, false, false
      );
    });

    it('should normalize diagonal movement for WASM', () => {
      inputManager.inputState.direction.x = 1;
      inputManager.inputState.direction.y = 1;
      
      inputManager.updateWasmInput();
      
      // Should normalize to prevent faster diagonal movement
      const args = mockWasmManager.setPlayerInput.getCall(0).args;
      const magnitude = Math.sqrt(args[0] * args[0] + args[1] * args[1]);
      expect(magnitude).to.be.at.most(1.01); // Allow small floating point error
    });

    it('should handle WASM manager not available', () => {
      inputManager.wasmManager = null;
      
      // Should not throw error
      expect(() => inputManager.updateWasmInput()).to.not.throw();
    });
  });

  describe('Input State Management', () => {
    it('should reset input state', () => {
      // Set some input state
      inputManager.inputState.direction.x = 1;
      inputManager.inputState.lightAttack = true;
      inputManager.inputState.block = true;
      
      inputManager.resetInputState();
      
      expect(inputManager.inputState.direction.x).to.equal(0);
      expect(inputManager.inputState.direction.y).to.equal(0);
      expect(inputManager.inputState.lightAttack).to.be.false;
      expect(inputManager.inputState.heavyAttack).to.be.false;
      expect(inputManager.inputState.block).to.be.false;
      expect(inputManager.inputState.roll).to.be.false;
      expect(inputManager.inputState.special).to.be.false;
    });

    it('should get current input snapshot', () => {
      inputManager.inputState.direction.x = 0.5;
      inputManager.inputState.lightAttack = true;
      
      const snapshot = inputManager.getInputSnapshot();
      
      expect(snapshot.direction.x).to.equal(0.5);
      expect(snapshot.lightAttack).to.be.true;
      expect(snapshot).to.not.equal(inputManager.inputState); // Should be a copy
    });

    it('should apply input snapshot', () => {
      const snapshot = {
        direction: { x: 0.7, y: -0.3 },
        lightAttack: true,
        heavyAttack: false,
        block: true,
        roll: false,
        special: false,
        pointer: { x: 100, y: 200, down: false },
        facing: { x: 0.5, y: 0.5 },
        gamepadIndex: 0,
        gamepadDeadzone: 0.15
      };
      
      inputManager.applyInputSnapshot(snapshot);
      
      expect(inputManager.inputState.direction.x).to.equal(0.7);
      expect(inputManager.inputState.direction.y).to.equal(-0.3);
      expect(inputManager.inputState.lightAttack).to.be.true;
      expect(inputManager.inputState.block).to.be.true;
    });
  });

  describe('Cleanup and Disposal', () => {
    it('should remove event listeners on dispose', () => {
      inputManager.dispose();
      
      expect(mockDocument.removeEventListener).to.have.been.called;
      expect(mockWindow.removeEventListener).to.have.been.called;
    });

    it('should reset state on dispose', () => {
      inputManager.inputState.direction.x = 1;
      inputManager.inputState.lightAttack = true;
      
      inputManager.dispose();
      
      expect(inputManager.inputState.direction.x).to.equal(0);
      expect(inputManager.inputState.lightAttack).to.be.false;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.returns(null);
      
      expect(() => inputManager.updateControlsDisplay()).to.not.throw();
    });

    it('should handle invalid gamepad data', () => {
      mockNavigator.getGamepads.returns([null, undefined]);
      
      expect(() => inputManager.updateGamepadInput()).to.not.throw();
    });

    it('should handle touch events without touches array', () => {
      const badEvent = {
        preventDefault: sinon.stub()
      };
      
      expect(() => inputManager.handleTouchStart(badEvent)).to.not.throw();
    });

    it('should handle keyboard events without code property', () => {
      const badEvent = {};
      
      expect(() => inputManager.handleKeyDown(badEvent)).to.not.throw();
      expect(() => inputManager.handleKeyUp(badEvent)).to.not.throw();
    });
  });
});
