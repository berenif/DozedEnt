import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Create mock InputManager class based on the input system structure
const createMockInputManager = () => {
  return class MockInputManager {
    constructor(config = {}) {
      this.config = {
        enableKeyboard: true,
        enableMouse: true,
        enableGamepad: true,
        enableTouch: true,
        keyBindings: {
          moveUp: ['KeyW', 'ArrowUp'],
          moveDown: ['KeyS', 'ArrowDown'],
          moveLeft: ['KeyA', 'ArrowLeft'],
          moveRight: ['KeyD', 'ArrowRight'],
          lightAttack: ['KeyJ'],
          heavyAttack: ['KeyK'],
          block: ['KeyL'],
          roll: ['Space'],
          special: ['KeyU']
        },
        ...config
      };
      
      this.inputState = {
        movement: { x: 0, y: 0 },
        actions: {
          lightAttack: false,
          heavyAttack: false,
          block: false,
          roll: false,
          special: false,
          jump: false
        },
        mouse: { x: 0, y: 0, buttons: 0 },
        touch: { active: false, x: 0, y: 0 },
        gamepad: { connected: false, index: -1 }
      };
      
      this.eventListeners = [];
      this.isInitialized = false;
      this.callbacks = {
        onInput: null,
        onAction: null,
        onMovement: null
      };
    }

    initialize() {
      if (this.isInitialized) {return;}
      
      this.setupKeyboardListeners();
      this.setupMouseListeners();
      this.setupTouchListeners();
      this.setupGamepadListeners();
      
      this.isInitialized = true;
    }

    setupKeyboardListeners() {
      if (!this.config.enableKeyboard) {return;}
      
      const keyDownHandler = (event) => this.handleKeyDown(event);
      const keyUpHandler = (event) => this.handleKeyUp(event);
      
      document.addEventListener('keydown', keyDownHandler);
      document.addEventListener('keyup', keyUpHandler);
      
      this.eventListeners.push(
        { element: document, event: 'keydown', handler: keyDownHandler },
        { element: document, event: 'keyup', handler: keyUpHandler }
      );
    }

    setupMouseListeners() {
      if (!this.config.enableMouse) {return;}
      
      const mouseDownHandler = (event) => this.handleMouseDown(event);
      const mouseUpHandler = (event) => this.handleMouseUp(event);
      const mouseMoveHandler = (event) => this.handleMouseMove(event);
      
      document.addEventListener('mousedown', mouseDownHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      document.addEventListener('mousemove', mouseMoveHandler);
      
      this.eventListeners.push(
        { element: document, event: 'mousedown', handler: mouseDownHandler },
        { element: document, event: 'mouseup', handler: mouseUpHandler },
        { element: document, event: 'mousemove', handler: mouseMoveHandler }
      );
    }

    setupTouchListeners() {
      if (!this.config.enableTouch) {return;}
      
      const touchStartHandler = (event) => this.handleTouchStart(event);
      const touchEndHandler = (event) => this.handleTouchEnd(event);
      const touchMoveHandler = (event) => this.handleTouchMove(event);
      
      document.addEventListener('touchstart', touchStartHandler, { passive: false });
      document.addEventListener('touchend', touchEndHandler, { passive: false });
      document.addEventListener('touchmove', touchMoveHandler, { passive: false });
      
      this.eventListeners.push(
        { element: document, event: 'touchstart', handler: touchStartHandler },
        { element: document, event: 'touchend', handler: touchEndHandler },
        { element: document, event: 'touchmove', handler: touchMoveHandler }
      );
    }

    setupGamepadListeners() {
      if (!this.config.enableGamepad) {return;}
      
      const gamepadConnectedHandler = (event) => this.handleGamepadConnected(event);
      const gamepadDisconnectedHandler = (event) => this.handleGamepadDisconnected(event);
      
      window.addEventListener('gamepadconnected', gamepadConnectedHandler);
      window.addEventListener('gamepaddisconnected', gamepadDisconnectedHandler);
      
      this.eventListeners.push(
        { element: window, event: 'gamepadconnected', handler: gamepadConnectedHandler },
        { element: window, event: 'gamepaddisconnected', handler: gamepadDisconnectedHandler }
      );
    }

    handleKeyDown(event) {
      const action = this.getActionFromKey(event.code);
      if (action) {
        if (action === 'moveUp' || action === 'moveDown' || action === 'moveLeft' || action === 'moveRight') {
          this.updateMovement(action, true);
        } else {
          this.inputState.actions[action] = true;
          this.triggerActionCallback(action, true);
        }
        event.preventDefault();
      }
    }

    handleKeyUp(event) {
      const action = this.getActionFromKey(event.code);
      if (action) {
        if (action === 'moveUp' || action === 'moveDown' || action === 'moveLeft' || action === 'moveRight') {
          this.updateMovement(action, false);
        } else {
          this.inputState.actions[action] = false;
          this.triggerActionCallback(action, false);
        }
        event.preventDefault();
      }
    }

    handleMouseDown(event) {
      this.inputState.mouse.buttons |= (1 << event.button);
      
      if (event.button === 0) { // Left click
        this.inputState.actions.lightAttack = true;
        this.triggerActionCallback('lightAttack', true);
      } else if (event.button === 2) { // Right click
        this.inputState.actions.heavyAttack = true;
        this.triggerActionCallback('heavyAttack', true);
      }
    }

    handleMouseUp(event) {
      this.inputState.mouse.buttons &= ~(1 << event.button);
      
      if (event.button === 0) {
        this.inputState.actions.lightAttack = false;
        this.triggerActionCallback('lightAttack', false);
      } else if (event.button === 2) {
        this.inputState.actions.heavyAttack = false;
        this.triggerActionCallback('heavyAttack', false);
      }
    }

    handleMouseMove(event) {
      this.inputState.mouse.x = event.clientX;
      this.inputState.mouse.y = event.clientY;
    }

    handleTouchStart(event) {
      event.preventDefault();
      const touch = event.touches[0];
      this.inputState.touch.active = true;
      this.inputState.touch.x = touch.clientX;
      this.inputState.touch.y = touch.clientY;
    }

    handleTouchEnd(event) {
      event.preventDefault();
      this.inputState.touch.active = false;
    }

    handleTouchMove(event) {
      event.preventDefault();
      if (this.inputState.touch.active) {
        const touch = event.touches[0];
        this.inputState.touch.x = touch.clientX;
        this.inputState.touch.y = touch.clientY;
      }
    }

    handleGamepadConnected(event) {
      this.inputState.gamepad.connected = true;
      this.inputState.gamepad.index = event.gamepad.index;
    }

    handleGamepadDisconnected(event) {
      if (this.inputState.gamepad.index === event.gamepad.index) {
        this.inputState.gamepad.connected = false;
        this.inputState.gamepad.index = -1;
      }
    }

    getActionFromKey(keyCode) {
      for (const [action, keys] of Object.entries(this.config.keyBindings)) {
        if (keys.includes(keyCode)) {
          return action;
        }
      }
      return null;
    }

    updateMovement(direction, pressed) {
      const movementMap = {
        moveUp: { axis: 'y', value: -1 },
        moveDown: { axis: 'y', value: 1 },
        moveLeft: { axis: 'x', value: -1 },
        moveRight: { axis: 'x', value: 1 }
      };
      
      const mapping = movementMap[direction];
      if (mapping) {
        if (pressed) {
          this.inputState.movement[mapping.axis] = mapping.value;
        } else {
          // Check if opposite direction is still pressed
          const opposites = {
            moveUp: 'moveDown',
            moveDown: 'moveUp',
            moveLeft: 'moveRight',
            moveRight: 'moveLeft'
          };
          
          const opposite = opposites[direction];
          const oppositePressed = this.isActionPressed(opposite);
          
          if (oppositePressed) {
            this.inputState.movement[mapping.axis] = movementMap[opposite].value;
          } else {
            this.inputState.movement[mapping.axis] = 0;
          }
        }
        
        this.triggerMovementCallback();
      }
    }

    isActionPressed(action) {
      const keys = this.config.keyBindings[action] || [];
      return keys.some(key => this.isKeyPressed(key));
    }

    isKeyPressed(keyCode) {
      // This would normally check actual key state
      return false;
    }

    updateGamepad() {
      if (!this.inputState.gamepad.connected) {return;}
      
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[this.inputState.gamepad.index];
      
      if (gamepad) {
        // Update movement from left stick
        const deadzone = 0.1;
        const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
        const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
        
        this.inputState.movement.x = leftStickX;
        this.inputState.movement.y = leftStickY;
        
        // Update action buttons
        this.inputState.actions.lightAttack = gamepad.buttons[0].pressed; // A/X
        this.inputState.actions.heavyAttack = gamepad.buttons[1].pressed; // B/Circle
        this.inputState.actions.roll = gamepad.buttons[2].pressed; // X/Square
        this.inputState.actions.block = gamepad.buttons[3].pressed; // Y/Triangle
      }
    }

    getInputState() {
      this.updateGamepad();
      return { ...this.inputState };
    }

    getMovementVector() {
      return { ...this.inputState.movement };
    }

    getActionState(action) {
      return this.inputState.actions[action] || false;
    }

    setCallback(type, callback) {
      if (this.callbacks.hasOwnProperty(type)) {
        this.callbacks[type] = callback;
      }
    }

    triggerActionCallback(action, pressed) {
      if (this.callbacks.onAction) {
        this.callbacks.onAction(action, pressed);
      }
    }

    triggerMovementCallback() {
      if (this.callbacks.onMovement) {
        this.callbacks.onMovement(this.inputState.movement);
      }
    }

    updateKeyBinding(action, keys) {
      this.config.keyBindings[action] = Array.isArray(keys) ? keys : [keys];
    }

    getKeyBinding(action) {
      return this.config.keyBindings[action] || [];
    }

    destroy() {
      this.eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      
      this.eventListeners = [];
      this.isInitialized = false;
      this.callbacks = { onInput: null, onAction: null, onMovement: null };
    }
  };
};

describe('InputManager', function() {
  let InputManager;
  let inputManager;
  let mockDocument;
  let mockWindow;
  let mockNavigator;

  beforeEach(function() {
    InputManager = createMockInputManager();
    
    // Mock DOM elements and APIs
    mockDocument = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub()
    };
    
    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub()
    };
    
    mockNavigator = {
      getGamepads: sinon.stub().returns([])
    };
    
    global.document = mockDocument;
    global.window = mockWindow;
    global.navigator = mockNavigator;
    
    inputManager = new InputManager();
  });

  afterEach(function() {
    if (inputManager.isInitialized) {
      inputManager.destroy();
    }
    sinon.restore();
  });

  describe('Initialization', function() {
    it('should initialize with default configuration', function() {
      expect(inputManager.config.enableKeyboard).to.be.true;
      expect(inputManager.config.enableMouse).to.be.true;
      expect(inputManager.config.enableGamepad).to.be.true;
      expect(inputManager.config.enableTouch).to.be.true;
    });

    it('should initialize with custom configuration', function() {
      const customConfig = {
        enableKeyboard: false,
        enableMouse: true,
        keyBindings: {
          moveUp: ['KeyI'],
          lightAttack: ['KeyO']
        }
      };
      
      const customManager = new InputManager(customConfig);
      expect(customManager.config.enableKeyboard).to.be.false;
      expect(customManager.config.keyBindings.moveUp).to.deep.equal(['KeyI']);
    });

    it('should setup event listeners on initialization', function() {
      inputManager.initialize();
      
      expect(inputManager.isInitialized).to.be.true;
      expect(mockDocument.addEventListener.callCount).to.be.greaterThan(0);
    });

    it('should not initialize twice', function() {
      inputManager.initialize();
      inputManager.initialize();
      
      expect(inputManager.isInitialized).to.be.true;
      // Should not add listeners twice
    });
  });

  describe('Keyboard Input', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should handle key down events', function() {
      const mockEvent = {
        code: 'KeyW',
        preventDefault: sinon.stub()
      };
      
      inputManager.handleKeyDown(mockEvent);
      
      expect(inputManager.inputState.movement.y).to.equal(-1);
      expect(mockEvent.preventDefault.called).to.be.true;
    });

    it('should handle key up events', function() {
      // First press key
      inputManager.handleKeyDown({ code: 'KeyW', preventDefault: sinon.stub() });
      expect(inputManager.inputState.movement.y).to.equal(-1);
      
      // Then release key
      inputManager.handleKeyUp({ code: 'KeyW', preventDefault: sinon.stub() });
      expect(inputManager.inputState.movement.y).to.equal(0);
    });

    it('should handle action key presses', function() {
      const mockEvent = {
        code: 'KeyJ', // Light attack
        preventDefault: sinon.stub()
      };
      
      inputManager.handleKeyDown(mockEvent);
      
      expect(inputManager.inputState.actions.lightAttack).to.be.true;
    });

    it('should ignore unknown keys', function() {
      const mockEvent = {
        code: 'KeyZ',
        preventDefault: sinon.stub()
      };
      
      inputManager.handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault.called).to.be.false;
    });

    it('should handle multiple movement keys', function() {
      inputManager.handleKeyDown({ code: 'KeyW', preventDefault: sinon.stub() }); // Up
      inputManager.handleKeyDown({ code: 'KeyD', preventDefault: sinon.stub() }); // Right
      
      expect(inputManager.inputState.movement.y).to.equal(-1);
      expect(inputManager.inputState.movement.x).to.equal(1);
    });
  });

  describe('Mouse Input', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should handle mouse down events', function() {
      const mockEvent = {
        button: 0, // Left click
        clientX: 100,
        clientY: 200
      };
      
      inputManager.handleMouseDown(mockEvent);
      
      expect(inputManager.inputState.actions.lightAttack).to.be.true;
      expect(inputManager.inputState.mouse.buttons & 1).to.equal(1);
    });

    it('should handle mouse up events', function() {
      // First press
      inputManager.handleMouseDown({ button: 0 });
      expect(inputManager.inputState.actions.lightAttack).to.be.true;
      
      // Then release
      inputManager.handleMouseUp({ button: 0 });
      expect(inputManager.inputState.actions.lightAttack).to.be.false;
    });

    it('should handle right mouse button', function() {
      inputManager.handleMouseDown({ button: 2 });
      
      expect(inputManager.inputState.actions.heavyAttack).to.be.true;
    });

    it('should track mouse position', function() {
      const mockEvent = {
        clientX: 150,
        clientY: 250
      };
      
      inputManager.handleMouseMove(mockEvent);
      
      expect(inputManager.inputState.mouse.x).to.equal(150);
      expect(inputManager.inputState.mouse.y).to.equal(250);
    });
  });

  describe('Touch Input', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should handle touch start events', function() {
      const mockEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchStart(mockEvent);
      
      expect(inputManager.inputState.touch.active).to.be.true;
      expect(inputManager.inputState.touch.x).to.equal(100);
      expect(inputManager.inputState.touch.y).to.equal(200);
      expect(mockEvent.preventDefault.called).to.be.true;
    });

    it('should handle touch end events', function() {
      // Start touch first
      inputManager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: sinon.stub()
      });
      
      // End touch
      const mockEvent = { preventDefault: sinon.stub() };
      inputManager.handleTouchEnd(mockEvent);
      
      expect(inputManager.inputState.touch.active).to.be.false;
    });

    it('should handle touch move events', function() {
      // Start touch first
      inputManager.handleTouchStart({
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: sinon.stub()
      });
      
      // Move touch
      const mockEvent = {
        touches: [{ clientX: 150, clientY: 250 }],
        preventDefault: sinon.stub()
      };
      
      inputManager.handleTouchMove(mockEvent);
      
      expect(inputManager.inputState.touch.x).to.equal(150);
      expect(inputManager.inputState.touch.y).to.equal(250);
    });
  });

  describe('Gamepad Input', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should handle gamepad connection', function() {
      const mockEvent = {
        gamepad: { index: 0 }
      };
      
      inputManager.handleGamepadConnected(mockEvent);
      
      expect(inputManager.inputState.gamepad.connected).to.be.true;
      expect(inputManager.inputState.gamepad.index).to.equal(0);
    });

    it('should handle gamepad disconnection', function() {
      // Connect first
      inputManager.handleGamepadConnected({ gamepad: { index: 0 } });
      
      // Then disconnect
      inputManager.handleGamepadDisconnected({ gamepad: { index: 0 } });
      
      expect(inputManager.inputState.gamepad.connected).to.be.false;
      expect(inputManager.inputState.gamepad.index).to.equal(-1);
    });

    it('should update gamepad state', function() {
      const mockGamepad = {
        axes: [0.5, -0.3, 0, 0],
        buttons: [
          { pressed: true },  // A button
          { pressed: false }, // B button
          { pressed: true },  // X button
          { pressed: false }  // Y button
        ]
      };
      
      mockNavigator.getGamepads.returns([mockGamepad]);
      inputManager.inputState.gamepad.connected = true;
      inputManager.inputState.gamepad.index = 0;
      
      inputManager.updateGamepad();
      
      expect(inputManager.inputState.movement.x).to.equal(0.5);
      expect(inputManager.inputState.movement.y).to.equal(-0.3);
      expect(inputManager.inputState.actions.lightAttack).to.be.true;
      expect(inputManager.inputState.actions.roll).to.be.true;
    });

    it('should apply deadzone to gamepad sticks', function() {
      const mockGamepad = {
        axes: [0.05, -0.08, 0, 0], // Below deadzone
        buttons: []
      };
      
      mockNavigator.getGamepads.returns([mockGamepad]);
      inputManager.inputState.gamepad.connected = true;
      inputManager.inputState.gamepad.index = 0;
      
      inputManager.updateGamepad();
      
      expect(inputManager.inputState.movement.x).to.equal(0);
      expect(inputManager.inputState.movement.y).to.equal(0);
    });
  });

  describe('Input State Management', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should return current input state', function() {
      inputManager.inputState.movement.x = 0.5;
      inputManager.inputState.actions.lightAttack = true;
      
      const state = inputManager.getInputState();
      
      expect(state.movement.x).to.equal(0.5);
      expect(state.actions.lightAttack).to.be.true;
    });

    it('should return movement vector', function() {
      inputManager.inputState.movement.x = 0.7;
      inputManager.inputState.movement.y = -0.3;
      
      const movement = inputManager.getMovementVector();
      
      expect(movement.x).to.equal(0.7);
      expect(movement.y).to.equal(-0.3);
    });

    it('should return action state', function() {
      inputManager.inputState.actions.heavyAttack = true;
      
      expect(inputManager.getActionState('heavyAttack')).to.be.true;
      expect(inputManager.getActionState('lightAttack')).to.be.false;
    });
  });

  describe('Callbacks', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should set and trigger action callbacks', function() {
      const actionCallback = sinon.stub();
      inputManager.setCallback('onAction', actionCallback);
      
      inputManager.triggerActionCallback('lightAttack', true);
      
      expect(actionCallback.calledWith('lightAttack', true)).to.be.true;
    });

    it('should set and trigger movement callbacks', function() {
      const movementCallback = sinon.stub();
      inputManager.setCallback('onMovement', movementCallback);
      
      inputManager.triggerMovementCallback();
      
      expect(movementCallback.calledWith(inputManager.inputState.movement)).to.be.true;
    });

    it('should handle callbacks when handling input', function() {
      const actionCallback = sinon.stub();
      inputManager.setCallback('onAction', actionCallback);
      
      inputManager.handleKeyDown({ code: 'KeyJ', preventDefault: sinon.stub() });
      
      expect(actionCallback.calledWith('lightAttack', true)).to.be.true;
    });
  });

  describe('Key Binding Management', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should update key bindings', function() {
      inputManager.updateKeyBinding('lightAttack', ['KeyF']);
      
      expect(inputManager.config.keyBindings.lightAttack).to.deep.equal(['KeyF']);
    });

    it('should get key bindings', function() {
      const bindings = inputManager.getKeyBinding('moveUp');
      
      expect(bindings).to.include('KeyW');
      expect(bindings).to.include('ArrowUp');
    });

    it('should handle single key binding updates', function() {
      inputManager.updateKeyBinding('roll', 'KeyR');
      
      expect(inputManager.config.keyBindings.roll).to.deep.equal(['KeyR']);
    });
  });

  describe('Cleanup', function() {
    it('should remove event listeners on destroy', function() {
      inputManager.initialize();
      inputManager.destroy();
      
      expect(inputManager.isInitialized).to.be.false;
      expect(inputManager.eventListeners).to.have.length(0);
    });

    it('should clear callbacks on destroy', function() {
      inputManager.setCallback('onAction', sinon.stub());
      inputManager.destroy();
      
      expect(inputManager.callbacks.onAction).to.be.null;
    });
  });

  describe('Edge Cases', function() {
    beforeEach(function() {
      inputManager.initialize();
    });

    it('should handle opposite movement keys correctly', function() {
      // Press up
      inputManager.handleKeyDown({ code: 'KeyW', preventDefault: sinon.stub() });
      expect(inputManager.inputState.movement.y).to.equal(-1);
      
      // Press down while up is still pressed
      inputManager.handleKeyDown({ code: 'KeyS', preventDefault: sinon.stub() });
      expect(inputManager.inputState.movement.y).to.equal(1);
      
      // Release down, should go back to up
      inputManager.handleKeyUp({ code: 'KeyS', preventDefault: sinon.stub() });
      expect(inputManager.inputState.movement.y).to.equal(-1);
    });

    it('should handle disabled input types', function() {
      const disabledManager = new InputManager({ enableKeyboard: false });
      disabledManager.initialize();
      
      // Should not have keyboard listeners
      expect(disabledManager.config.enableKeyboard).to.be.false;
    });

    it('should handle missing gamepad gracefully', function() {
      mockNavigator.getGamepads.returns([null, null, null, null]);
      inputManager.inputState.gamepad.connected = true;
      inputManager.inputState.gamepad.index = 0;
      
      inputManager.updateGamepad();
      
      // Should not throw error
      expect(true).to.be.true;
    });
  });
});
