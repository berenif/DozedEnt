/**
 * Unified Input Manager - orchestrates keyboard, mouse, touch, and gamepad input
 * Delegates specific responsibilities to focused handler modules while maintaining
 * the existing API surface for compatibility with legacy callers.
 */

import { InputStateManager } from '../input/InputStateManager.js';
import { KeyboardInputHandler } from '../input/handlers/KeyboardInputHandler.js';
import { MouseInputHandler } from '../input/handlers/MouseInputHandler.js';
import { TouchInputHandler } from '../input/handlers/TouchInputHandler.js';
import { ThreeButtonInputAdapter } from '../input/ThreeButtonInputAdapter.js';

export class UnifiedInputManager {
  constructor(wasmManager) {
    this.stateManager = new InputStateManager({ wasmManager });
    this.config = this.stateManager.config;
    this.validator = this.stateManager.validator;
    this.eventListeners = [];
    this.animationFrameId = null;

    this.isMobile = this.detectMobileDevice();
    this.hasTouch = 'ontouchstart' in window;
    this.hasGamepad = 'getGamepads' in navigator;

    this._threeBtn = new ThreeButtonInputAdapter();
    this.gamepadManager = null;

    this.initialize();
  }

  get inputState() {
    return this.stateManager.state;
  }

  get syncState() {
    return this.stateManager.sync;
  }

  setWasmManager(wasmManager) {
    this.stateManager.setWasmManager(wasmManager);
  }

  initialize() {
    console.log('dYZr Initializing Unified Input Manager...');

    this.stateManager.clearAllInputs();

    this.keyboardHandler = new KeyboardInputHandler({
      stateManager: this.stateManager,
      registerListener: this.addEventListenerWithCleanup.bind(this)
    });
    this.keyboardHandler.initialize();

    this.mouseHandler = new MouseInputHandler({
      stateManager: this.stateManager,
      registerListener: this.addEventListenerWithCleanup.bind(this),
      config: this.config
    });
    this.mouseHandler.initialize();

    if (this.hasTouch) {
      this.touchHandler = new TouchInputHandler({
        stateManager: this.stateManager,
        registerListener: this.addEventListenerWithCleanup.bind(this),
        config: this.config
      });
      this.touchHandler.initialize();
    }

    if (this.hasGamepad) {
      this.setupGamepadInput();
    }

    this.addEventListenerWithCleanup(window, 'blur', () => {
      this.clearAllInputs();
    });

    this.addEventListenerWithCleanup(document, 'contextmenu', (event) => {
      if (event.target.tagName === 'CANVAS') {
        event.preventDefault();
      }
    });

    this.startInputLoop();

    setTimeout(() => {
      if (this.syncState.wasmReady) {
        console.log('Loaded input manager state defaults to zero');
      }
    }, 100);

    console.log(`Unified Input Manager initialized - Mobile: ${this.isMobile}, Touch: ${this.hasTouch}, Gamepad: ${this.hasGamepad}`);
  }

  setupGamepadInput() {
    import('../input/gamepad-manager.js')
      .then(({ GamepadManager }) => {
        this.gamepadManager = new GamepadManager(this);
        console.log('Integrated gamepad manager');
      })
      .catch((error) => {
        console.warn('Failed to load gamepad manager:', error);
      });
  }

  handleInputAction(action, isPressed) {
    this.stateManager.handleAction(action, isPressed);
  }

  addToInputBuffer(action) {
    this.stateManager.addToInputBuffer(action);
  }

  queueInputForWasm() {
    this.stateManager.queueInputForWasm();
  }

  flushInputQueue() {
    this.stateManager.flushInputQueue();
  }

  sendInputStateToWasm(state) {
    this.stateManager.sendInputStateToWasm(state);
  }

  sendInputToWasm() {
    this.stateManager.sendInputToWasm();
  }

  startInputLoop() {
    const updateInput = () => {
      this.stateManager.checkWasmReadiness();

      const state = this.stateManager.state;
      try {
        const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const derived = this._threeBtn.update({
          leftHandDown: state.leftHand,
          rightHandDown: state.rightHand,
          specialDown: state.special3,
          moveX: state.direction.x,
          moveY: state.direction.y,
          nowMs
        });

        state.lightAttack = Boolean(state.lightAttack || derived.lightAttack);
        state.heavyAttack = Boolean(state.heavyAttack || derived.heavyAttack);
        state.block = Boolean(state.block || derived.block);

        if (derived.roll) {
          state.roll = true;
          state.special = false;
        } else if (derived.special) {
          state.special = true;
        }
      } catch (error) {
        if (this.config.debugInput) {
          console.warn('ThreeButtonInputAdapter update failed:', error);
        }
      }

      this.animationFrameId = requestAnimationFrame(updateInput);
    };

    updateInput();
  }

  checkWasmReadiness() {
    this.stateManager.checkWasmReadiness();
  }

  clearAllInputs() {
    this.stateManager.clearAllInputs();
  }

  addEventListenerWithCleanup(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.eventListeners.push({ target, event, handler, options });
  }

  updateConfig(newConfig) {
    this.stateManager.updateConfig(newConfig);
    this.config = this.stateManager.config;
  }

  getInputState() {
    return this.stateManager.getStateSnapshot();
  }

  setKeyMapping(key, action) {
    this.stateManager.setKeyMapping(key, action);
  }

  setDebugMode(enabled) {
    this.updateConfig({ debugInput: enabled });
  }

  destroy() {
    console.log('Cleaning up Unified Input Manager...');

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    for (const { target, event, handler, options } of this.eventListeners) {
      target.removeEventListener(event, handler, options);
    }
    this.eventListeners = [];

    if (this.gamepadManager?.destroy) {
      this.gamepadManager.destroy();
      this.gamepadManager = null;
    }

    this.clearAllInputs();
    console.log('Unified Input Manager cleaned up');
  }

  detectMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
}
