import { InputValidator } from '../managers/input-validator.js';

const DEFAULT_CONFIG = {
  bufferDuration: 120,
  gamepadDeadzone: 0.15,
  touchSensitivity: 1.0,
  keyRepeatDelay: 250,
  debugInput: false
};

export class InputStateManager {
  constructor({ wasmManager, validator = new InputValidator(), config = {} } = {}) {
    this.wasmManager = wasmManager;
    this.validator = validator;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.inputState = this.#createInitialInputState();
    this.keyStates = this.#createInitialKeyStates();
    this.syncState = this.#createInitialSyncState();
    this.keyMappings = new Map([
      ['KeyW', 'move-up'],
      ['KeyA', 'move-left'],
      ['KeyS', 'move-down'],
      ['KeyD', 'move-right'],
      ['ArrowUp', 'move-up'],
      ['ArrowLeft', 'move-left'],
      ['ArrowDown', 'move-down'],
      ['ArrowRight', 'move-right'],
      ['KeyJ', 'left-hand'],
      ['KeyL', 'right-hand'],
      ['KeyK', 'special3'],
      ['ShiftLeft', 'block'],
      ['ShiftRight', 'block'],
      ['ControlLeft', 'roll'],
      ['ControlRight', 'roll'],
      ['Space', 'roll'],
      ['Escape', 'pause'],
      ['Tab', 'inventory'],
      ['KeyM', 'map'],
      ['KeyI', 'inventory']
    ]);

  }

  setWasmManager(wasmManager) {
    this.wasmManager = wasmManager;
  }

  updateConfig(partialConfig = {}) {
    this.config = { ...this.config, ...partialConfig };
  }

  getStateSnapshot() {
    return { ...this.inputState };
  }

  get state() {
    return this.inputState;
  }

  get sync() {
    return this.syncState;
  }

  handleAction(rawAction, rawPressed) {
    let action = rawAction;
    let isPressed = rawPressed;

    if (this.config.debugInput) {
      console.log(`dYZr Input: ${action} = ${isPressed}`);
    }

    const validation = this.validator.validateInputAction(action, isPressed);
    if (!validation.valid) {
      if (this.config.debugInput) {
        console.warn(`?s??,? Input rejected: ${validation.reason}`);
      }
      return;
    }

    action = validation.action;
    isPressed = validation.isPressed;

    switch (action) {
      case 'left-hand':
        this.inputState.leftHand = isPressed;
        break;
      case 'right-hand':
        this.inputState.rightHand = isPressed;
        break;
      case 'special3':
        this.inputState.special3 = isPressed;
        break;
      case 'move-up':
        this.keyStates.up = isPressed;
        this.updateDirectionFromKeyStates();
        break;
      case 'move-down':
        this.keyStates.down = isPressed;
        this.updateDirectionFromKeyStates();
        break;
      case 'move-left':
        this.keyStates.left = isPressed;
        this.updateDirectionFromKeyStates();
        break;
      case 'move-right':
        this.keyStates.right = isPressed;
        this.updateDirectionFromKeyStates();
        break;
      case 'light-attack':
        this.inputState.lightAttack = isPressed;
        break;
      case 'heavy-attack':
        this.inputState.heavyAttack = isPressed;
        break;
      case 'special':
        this.inputState.special = isPressed;
        break;
      case 'block':
        this.inputState.block = isPressed;
        break;
      case 'roll':
        this.inputState.roll = isPressed;
        break;
      case 'pause':
        if (isPressed) {
          this.inputState.pause = !this.inputState.pause;
        }
        break;
      case 'inventory':
        if (isPressed) {
          this.inputState.inventory = !this.inputState.inventory;
        }
        break;
      case 'map':
        if (isPressed) {
          this.inputState.map = !this.inputState.map;
        }
        break;
      default:
        break;
    }

    if (this.inputState.direction.x !== 0 || this.inputState.direction.y !== 0) {
      this.inputState.lastMovementDirection.x = this.inputState.direction.x;
      this.inputState.lastMovementDirection.y = this.inputState.direction.y;
    }
  }

  updateDirectionFromKeyStates() {
    let x = 0;
    let y = 0;

    if (this.keyStates.left) {x -= 1;}
    if (this.keyStates.right) {x += 1;}
    if (this.keyStates.up) {y -= 1;}
    if (this.keyStates.down) {y += 1;}

    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    this.inputState.direction.x = x;
    this.inputState.direction.y = y;

    if (this.config.debugInput && (x !== 0 || y !== 0)) {
      console.log(
        `dYZr Movement: (${x.toFixed(2)}, ${y.toFixed(2)}) - Keys: U:${this.keyStates.up} D:${this.keyStates.down} L:${this.keyStates.left} R:${this.keyStates.right}`
      );
    }
  }

  setPointerDown(isDown) {
    this.inputState.pointer.down = isDown;
  }

  setPointerPosition(x, y) {
    this.inputState.pointer.x = x;
    this.inputState.pointer.y = y;
  }

  setMovementVector(x, y, { updateLastDirection = true } = {}) {
    this.inputState.direction.x = x;
    this.inputState.direction.y = y;

    if (updateLastDirection && (x !== 0 || y !== 0)) {
      this.inputState.lastMovementDirection.x = x;
      this.inputState.lastMovementDirection.y = y;
    }
  }

  /**
   * Legacy compatibility for jump flag toggles
   */
  setJump(isPressed) {
    this.inputState.jump = isPressed;
  }

  addToInputBuffer(action) {
    this.inputState.inputBuffer.set(action, performance.now());
    const cutoff = performance.now() - this.config.bufferDuration;
    for (const [key, timestamp] of this.inputState.inputBuffer) {
      if (timestamp < cutoff) {
        this.inputState.inputBuffer.delete(key);
      }
    }
  }

  isInInputBuffer(action) {
    const timestamp = this.inputState.inputBuffer.get(action);
    if (!timestamp) {
      return false;
    }
    return (performance.now() - timestamp) <= this.config.bufferDuration;
  }

  queueInputForWasm() {
    const now = performance.now();
    this.syncState.inputQueue.push({
      timestamp: now,
      state: { ...this.inputState }
    });

    if (this.syncState.inputQueue.length > 60) {
      this.syncState.inputQueue.shift();
    }

    if (this.syncState.wasmReady) {
      this.flushInputQueue();
    }
  }

  flushInputQueue() {
    if (!this.#hasWasmExports()) {
      this.syncState.wasmReady = false;
      return;
    }

    while (this.syncState.inputQueue.length > 0) {
      const queuedInput = this.syncState.inputQueue.shift();
      this.sendInputStateToWasm(queuedInput.state);
    }

    this.syncState.lastWasmUpdate = performance.now();
  }

  sendInputStateToWasm(inputState) {
    if (!this.#hasWasmExports()) {
      return;
    }

    try {
      const validation = this.validator.validateWasmInput(
        inputState.direction.x,
        inputState.direction.y,
        inputState.roll,
        inputState.jump,
        inputState.lightAttack,
        inputState.heavyAttack,
        inputState.block,
        inputState.special
      );

      if (!validation.valid) {
        console.warn('?s??,? WASM input validation failed:', validation.reason);
        return;
      }

      if (this.config.debugInput && (validation.inputX !== 0 || validation.inputY !== 0)) {
        console.log(`dY"? Sending to WASM: dir=(${validation.inputX.toFixed(2)}, ${validation.inputY.toFixed(2)})`);
      }

      this.wasmManager.setPlayerInput(
        validation.inputX,
        validation.inputY,
        validation.isRolling,
        validation.isJumping,
        validation.lightAttack,
        validation.heavyAttack,
        validation.isBlocking,
        validation.special
      );

      if (this.wasmManager.exports.set_blocking && validation.isBlocking) {
        this.wasmManager.exports.set_blocking(
          1,
          inputState.lastMovementDirection.x,
          inputState.lastMovementDirection.y,
          performance.now() / 1000
        );
      }
    } catch (error) {
      console.error('??O Failed to send input to WASM:', error);
      this.syncState.wasmReady = false;
    }
  }

  sendInputToWasm() {
    this.queueInputForWasm();
    if (this.syncState.wasmReady) {
      this.flushInputQueue();
    }
  }

  clearAllInputs() {
    this.inputState.direction.x = 0;
    this.inputState.direction.y = 0;
    this.inputState.lightAttack = false;
    this.inputState.heavyAttack = false;
    this.inputState.block = false;
    this.inputState.roll = false;
    this.inputState.special = false;
    this.inputState.jump = false;
    this.inputState.pointer.down = false;

    this.keyStates.up = false;
    this.keyStates.down = false;
    this.keyStates.left = false;
    this.keyStates.right = false;

    this.inputState.inputBuffer.clear();

    if (this.syncState.wasmReady) {
      this.sendInputToWasm();
      if (this.wasmManager?.exports?.set_blocking) {
        try {
          this.wasmManager.exports.set_blocking(0, 0, 0);
        } catch (error) {
          console.warn('Failed to clear blocking state:', error);
        }
      }
    }
  }

  checkWasmReadiness() {
    const wasReady = this.syncState.wasmReady;
    this.syncState.wasmReady = this.#hasWasmExports();

    if (!wasReady && this.syncState.wasmReady) {
      console.log('?o. WASM input system ready');
      this.clearAllInputs();
    } else if (wasReady && !this.syncState.wasmReady) {
      console.warn('?s??,? WASM input system not ready');
    }
  }

  setKeyMapping(key, action) {
    this.keyMappings.set(key, action);
  }

  getKeyMapping(code) {
    return this.keyMappings.get(code);
  }

  resetBuffers() {
    this.inputState.inputBuffer.clear();
    this.syncState.inputQueue.length = 0;
  }

  #hasWasmExports() {
    return Boolean(
      this.wasmManager &&
      this.wasmManager.exports &&
      typeof this.wasmManager.exports.set_player_input === 'function'
    );
  }

  #createInitialInputState() {
    return {
      direction: { x: 0, y: 0 },
      leftHand: false,
      rightHand: false,
      special3: false,
      lightAttack: false,
      heavyAttack: false,
      block: false,
      roll: false,
      special: false,
      jump: false,
      pointer: { x: 0, y: 0, down: false },
      pause: false,
      inventory: false,
      map: false,
      lastUpdate: 0,
      inputBuffer: new Map(),
      lastMovementDirection: { x: 1, y: 0 }
    };
  }

  #createInitialKeyStates() {
    return {
      up: false,
      down: false,
      left: false,
      right: false
    };
  }

  #createInitialSyncState() {
    return {
      lastWasmUpdate: 0,
      pendingInputs: new Map(),
      wasmReady: false,
      inputQueue: []
    };
  }
}

