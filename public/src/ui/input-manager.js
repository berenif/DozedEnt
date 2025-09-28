/**
 * Input Manager for Modern Roguelite UI
 * Handles keyboard remapping, controller support, and touch controls
 * Forwards all input to WASM following the WASM-first architecture
 */

export class InputManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    
    // Input state
    this.inputState = {
      keyboard: new Map(),
      mouse: { x: 0, y: 0, buttons: new Set() },
      gamepad: null,
      touch: { active: false, points: [] }
    };
    
    // Key bindings (customizable)
    this.keybinds = new Map();
    this.defaultKeybinds = new Map([
      // Movement
      ['KeyW', 'move-up'],
      ['KeyA', 'move-left'],
      ['KeyS', 'move-down'],
      ['KeyD', 'move-right'],
      ['ArrowUp', 'move-up'],
      ['ArrowLeft', 'move-left'],
      ['ArrowDown', 'move-down'],
      ['ArrowRight', 'move-right'],
      
      // Combat (5-button system from guidelines)
      ['KeyJ', 'light-attack'],    // J/1: Light Attack
      ['Digit1', 'light-attack'],
      ['KeyK', 'heavy-attack'],    // K/2: Heavy Attack
      ['Digit2', 'heavy-attack'],
      ['KeyL', 'special-attack'],  // L/5: Special Attack
      ['Digit5', 'special-attack'],
      ['ShiftLeft', 'block'],      // Shift/3: Block/Parry
      ['ShiftRight', 'block'],
      ['Digit3', 'block'],
      ['ControlLeft', 'roll'],     // Ctrl/4: Roll
      ['ControlRight', 'roll'],
      ['Digit4', 'roll'],
      
      // Ultimate and consumables
      ['KeyR', 'ultimate'],
      ['KeyQ', 'consumable-1'],
      ['KeyE', 'consumable-2'],
      
      // UI Controls
      ['Escape', 'pause'],
      ['Tab', 'inventory'],
      ['KeyM', 'map'],
      ['KeyI', 'character'],
      ['F1', 'help']
    ]);
    
    // Input buffer for responsive controls (120ms as per guidelines)
    this.inputBuffer = new Map();
    this.bufferDuration = 120; // milliseconds
    
    // Controller support
    this.gamepadIndex = -1;
    this.gamepadDeadzone = 0.15;
    
    // Touch support
    this.touchZones = new Map();
    
    // Input remapping state
    this.isRemapping = false;
    this.remappingKey = null;
    
    this.initialize();
  }

  /**
   * Initialize input systems
   */
  initialize() {
    this.loadKeybinds();
    this.setupEventListeners();
    this.setupTouchZones();
    this.startGamepadPolling();
  }

  /**
   * Load keybinds from localStorage or use defaults
   */
  loadKeybinds() {
    try {
      const saved = localStorage.getItem('roguelite-keybinds');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.keybinds = new Map(parsed);
      } else {
        this.keybinds = new Map(this.defaultKeybinds);
      }
    } catch (error) {
      console.warn('Failed to load keybinds, using defaults:', error);
      this.keybinds = new Map(this.defaultKeybinds);
    }
  }

  /**
   * Save keybinds to localStorage
   */
  saveKeybinds() {
    try {
      const serialized = JSON.stringify([...this.keybinds]);
      localStorage.setItem('roguelite-keybinds', serialized);
    } catch (error) {
      console.error('Failed to save keybinds:', error);
    }
  }

  /**
   * Reset keybinds to defaults
   */
  resetKeybinds() {
    this.keybinds = new Map(this.defaultKeybinds);
    this.saveKeybinds();
  }

  /**
   * Setup event listeners for all input types
   */
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('wheel', (e) => this.handleMouseWheel(e));
    
    // Touch events
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnect(e));
    
    // Focus/blur events
    window.addEventListener('blur', () => this.handleWindowBlur());
    window.addEventListener('focus', () => this.handleWindowFocus());
  }

  /**
   * Handle keyboard key press
   */
  handleKeyDown(e) {
    // Handle key remapping mode
    if (this.isRemapping) {
      this.handleRemapKey(e.code);
      e.preventDefault();
      return;
    }
    
    const action = this.keybinds.get(e.code);
    if (!action) {
      return;
    }
    
    // Prevent default for game keys
    if (this.isGameKey(e.code)) {
      e.preventDefault();
    }
    
    // Add to input buffer
    this.addToInputBuffer(action);
    
    // Update input state
    this.inputState.keyboard.set(action, true);
    
    // Forward to WASM
    this.forwardInputToWASM(action, true);
  }

  /**
   * Handle keyboard key release
   */
  handleKeyUp(e) {
    if (this.isRemapping) {
      return;
    }
    
    const action = this.keybinds.get(e.code);
    if (!action) {
      return;
    }
    
    // Update input state
    this.inputState.keyboard.set(action, false);
    
    // Forward to WASM
    this.forwardInputToWASM(action, false);
  }

  /**
   * Handle mouse button press
   */
  handleMouseDown(e) {
    this.inputState.mouse.buttons.add(e.button);
    
    // Map mouse buttons to actions
    const action = this.getMouseAction(e.button);
    if (action) {
      this.addToInputBuffer(action);
      this.forwardInputToWASM(action, true, 'mouse');
    }
  }

  /**
   * Handle mouse button release
   */
  handleMouseUp(e) {
    this.inputState.mouse.buttons.delete(e.button);
    
    const action = this.getMouseAction(e.button);
    if (action) {
      this.forwardInputToWASM(action, false, 'mouse');
    }
  }

  /**
   * Handle mouse movement
   */
  handleMouseMove(e) {
    this.inputState.mouse.x = e.clientX;
    this.inputState.mouse.y = e.clientY;
    
    // Forward mouse position to WASM if needed
    if (this.wasmManager.updateMousePosition) {
      const rect = document.getElementById('game-canvas')?.getBoundingClientRect();
      if (rect) {
        const relativeX = (e.clientX - rect.left) / rect.width;
        const relativeY = (e.clientY - rect.top) / rect.height;
        this.wasmManager.updateMousePosition(relativeX, relativeY);
      }
    }
  }

  /**
   * Handle mouse wheel
   */
  handleMouseWheel(e) {
    // Could be used for camera zoom or inventory scrolling
    if (this.wasmManager.handleMouseWheel) {
      this.wasmManager.handleMouseWheel(e.deltaY > 0 ? 1 : -1);
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    this.inputState.touch.active = true;
    this.inputState.touch.points = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }));
    
    // Process touch zones
    for (const touch of e.touches) {
      const action = this.getTouchAction(touch.clientX, touch.clientY);
      if (action) {
        this.addToInputBuffer(action);
        this.forwardInputToWASM(action, true, 'touch');
      }
    }
    
    // Prevent default to avoid scrolling
    if (this.isTouchInGameArea(e.touches[0])) {
      e.preventDefault();
    }
  }

  /**
   * Handle touch movement
   */
  handleTouchMove(e) {
    if (!this.inputState.touch.active) {
      return;
    }
    
    this.inputState.touch.points = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }));
    
    // Handle virtual joystick if in movement area
    const primaryTouch = e.touches[0];
    if (primaryTouch && this.isInMovementZone(primaryTouch.clientX, primaryTouch.clientY)) {
      const movement = this.calculateTouchMovement(primaryTouch);
      if (this.wasmManager.updateMovement) {
        this.wasmManager.updateMovement(movement.x, movement.y);
      }
      e.preventDefault();
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    if (e.touches.length === 0) {
      this.inputState.touch.active = false;
      this.inputState.touch.points = [];
      
      // Stop movement
      if (this.wasmManager.updateMovement) {
        this.wasmManager.updateMovement(0, 0);
      }
    } else {
      this.inputState.touch.points = Array.from(e.touches).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY
      }));
    }
  }

  /**
   * Handle gamepad connection
   */
  handleGamepadConnect(e) {
    console.log('Gamepad connected:', e.gamepad.id);
    this.gamepadIndex = e.gamepad.index;
    
    // Show notification
    this.showInputNotification('Controller Connected', '🎮');
  }

  /**
   * Handle gamepad disconnection
   */
  handleGamepadDisconnect(e) {
    console.log('Gamepad disconnected:', e.gamepad.id);
    if (this.gamepadIndex === e.gamepad.index) {
      this.gamepadIndex = -1;
    }
    
    // Show notification
    this.showInputNotification('Controller Disconnected', '❌');
  }

  /**
   * Poll gamepad state (called every frame)
   */
  updateGamepad() {
    if (this.gamepadIndex === -1) {
      return;
    }
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    
    if (!gamepad) {
      this.gamepadIndex = -1;
      return;
    }
    
    this.inputState.gamepad = gamepad;
    
    // Process gamepad inputs
    this.processGamepadButtons(gamepad);
    this.processGamepadAxes(gamepad);
  }

  /**
   * Process gamepad button inputs
   */
  processGamepadButtons(gamepad) {
    const buttonMappings = {
      0: 'light-attack',    // A/X button
      1: 'roll',           // B/Circle button
      2: 'heavy-attack',   // X/Square button
      3: 'special-attack', // Y/Triangle button
      4: 'block',          // LB/L1
      5: 'ultimate',       // RB/R1
      6: 'consumable-1',   // LT/L2
      7: 'consumable-2',   // RT/R2
      9: 'pause',          // Menu/Options
      12: 'move-up',       // D-pad up
      13: 'move-down',     // D-pad down
      14: 'move-left',     // D-pad left
      15: 'move-right'     // D-pad right
    };
    
    gamepad.buttons.forEach((button, index) => {
      const action = buttonMappings[index];
      if (!action) {
      return;
    }
      
      const isPressed = button.pressed || button.value > 0.5;
      const wasPressed = this.inputState.gamepad?.buttons[index]?.pressed || false;
      
      if (isPressed && !wasPressed) {
        this.addToInputBuffer(action);
        this.forwardInputToWASM(action, true, 'gamepad');
      } else if (!isPressed && wasPressed) {
        this.forwardInputToWASM(action, false, 'gamepad');
      }
    });
  }

  /**
   * Process gamepad analog stick inputs
   */
  processGamepadAxes(gamepad) {
    if (gamepad.axes.length < 2) {
      return;
    }
    
    // Left stick for movement
    const leftX = Math.abs(gamepad.axes[0]) > this.gamepadDeadzone ? gamepad.axes[0] : 0;
    const leftY = Math.abs(gamepad.axes[1]) > this.gamepadDeadzone ? gamepad.axes[1] : 0;
    
    // Forward movement to WASM
    if (this.wasmManager.updateMovement) {
      this.wasmManager.updateMovement(leftX, leftY);
    }
    
    // Right stick for camera/aiming (if supported)
    if (gamepad.axes.length >= 4 && this.wasmManager.updateLook) {
      const rightX = Math.abs(gamepad.axes[2]) > this.gamepadDeadzone ? gamepad.axes[2] : 0;
      const rightY = Math.abs(gamepad.axes[3]) > this.gamepadDeadzone ? gamepad.axes[3] : 0;
      this.wasmManager.updateLook(rightX, rightY);
    }
  }

  /**
   * Start gamepad polling loop
   */
  startGamepadPolling() {
    const poll = () => {
      this.updateGamepad();
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  /**
   * Setup touch zones for mobile controls
   */
  setupTouchZones() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Movement zone (left side of screen)
    this.touchZones.set('movement', {
      x: 0,
      y: screenHeight * 0.3,
      width: screenWidth * 0.4,
      height: screenHeight * 0.7,
      action: null // Virtual joystick
    });
    
    // Attack buttons (right side)
    this.touchZones.set('light-attack', {
      x: screenWidth * 0.7,
      y: screenHeight * 0.6,
      width: screenWidth * 0.15,
      height: screenHeight * 0.15,
      action: 'light-attack'
    });
    
    this.touchZones.set('heavy-attack', {
      x: screenWidth * 0.85,
      y: screenHeight * 0.45,
      width: screenWidth * 0.15,
      height: screenHeight * 0.15,
      action: 'heavy-attack'
    });
    
    this.touchZones.set('roll', {
      x: screenWidth * 0.6,
      y: screenHeight * 0.75,
      width: screenWidth * 0.15,
      height: screenHeight * 0.15,
      action: 'roll'
    });
  }

  /**
   * Add input to buffer for responsive controls
   */
  addToInputBuffer(action) {
    this.inputBuffer.set(action, Date.now());
    
    // Clean old buffer entries
    setTimeout(() => {
      this.inputBuffer.delete(action);
    }, this.bufferDuration);
  }

  /**
   * Check if action is in input buffer
   */
  isInInputBuffer(action) {
    const timestamp = this.inputBuffer.get(action);
    if (!timestamp) {
      return false;
    }
    
    return (Date.now() - timestamp) <= this.bufferDuration;
  }

  /**
   * Forward input to WASM following WASM-first architecture
   */
  forwardInputToWASM(action, isPressed) {
    if (!this.wasmManager) {
      return;
    }
    
    // Forward to appropriate WASM function based on action
    switch (action) {
      case 'move-up':
      case 'move-down':
      case 'move-left':
      case 'move-right':
        this.updateMovementFromInput();
        break;
        
      case 'light-attack':
        if (isPressed && this.wasmManager.onAttack) {
          this.wasmManager.onAttack();
        }
        break;
        
      case 'heavy-attack':
        if (isPressed && this.wasmManager.onHeavyAttack) {
          this.wasmManager.onHeavyAttack();
        }
        break;
        
      case 'special-attack':
        if (isPressed && this.wasmManager.onSpecialAttack) {
          this.wasmManager.onSpecialAttack();
        }
        break;
        
      case 'block':
        if (this.wasmManager.setBlocking) {
          this.wasmManager.setBlocking(isPressed ? 1 : 0, 0, 0, Date.now() / 1000);
        }
        break;
        
      case 'roll':
        if (isPressed && this.wasmManager.onRollStart) {
          this.wasmManager.onRollStart();
        }
        break;
        
      case 'ultimate':
        if (isPressed && this.wasmManager.onUltimate) {
          this.wasmManager.onUltimate();
        }
        break;
        
      case 'consumable-1':
      case 'consumable-2':
        if (isPressed && this.wasmManager.useConsumable) {
          const slot = action === 'consumable-1' ? 0 : 1;
          this.wasmManager.useConsumable(slot);
        }
        break;
        
      // UI actions don't go to WASM
      case 'pause':
      case 'inventory':
      case 'map':
      case 'character':
        this.handleUIAction(action, isPressed);
        break;
        
      default:
        // Generic input forwarding
        if (this.wasmManager.handleInput) {
          this.wasmManager.handleInput(action, isPressed);
        }
    }
  }

  /**
   * Update movement based on current keyboard state
   */
  updateMovementFromInput() {
    let x = 0;
    let y = 0;
    
    if (this.inputState.keyboard.get('move-left')) {
      x -= 1;
    }
    if (this.inputState.keyboard.get('move-right')) {
      x += 1;
    }
    if (this.inputState.keyboard.get('move-up')) {
      y += 1;
    }
    if (this.inputState.keyboard.get('move-down')) {
      y -= 1;
    }
    
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    // Forward to WASM
    if (this.wasmManager.updateMovement) {
      this.wasmManager.updateMovement(x, y);
    }
  }

  /**
   * Handle UI-specific actions (not forwarded to WASM)
   */
  handleUIAction(action, isPressed) {
    if (!isPressed) {
      return; // Only handle key press, not release
    }
    
    // Dispatch custom events for UI components to handle
    const event = new CustomEvent('ui-action', {
      detail: { action, inputType: 'keyboard' }
    });
    document.dispatchEvent(event);
  }

  /**
   * Handle window blur (pause game, clear inputs)
   */
  handleWindowBlur() {
    // Clear all input states
    this.inputState.keyboard.clear();
    this.inputState.mouse.buttons.clear();
    this.inputState.touch.active = false;
    
    // Notify WASM to stop all actions
    if (this.wasmManager.clearAllInputs) {
      this.wasmManager.clearAllInputs();
    }
  }

  /**
   * Handle window focus
   */
  handleWindowFocus() {
    // Reset input buffer
    this.inputBuffer.clear();
  }

  /**
   * Start key remapping process
   */
  startKeyRemap(actionName) {
    this.isRemapping = true;
    this.remappingKey = actionName;
    
    // Show remapping UI
    this.showRemapDialog(actionName);
  }

  /**
   * Handle key remapping
   */
  handleRemapKey(keyCode) {
    if (!this.isRemapping || !this.remappingKey) {
      return;
    }
    
    // Remove old binding for this key
    for (const [key, action] of this.keybinds) {
      if (action === this.remappingKey) {
        this.keybinds.delete(key);
      }
    }
    
    // Add new binding
    this.keybinds.set(keyCode, this.remappingKey);
    
    // Save changes
    this.saveKeybinds();
    
    // Exit remapping mode
    this.isRemapping = false;
    this.remappingKey = null;
    
    // Hide remapping UI
    this.hideRemapDialog();
    
    // Update keybind display
    this.updateKeybindDisplay();
  }

  /**
   * Cancel key remapping
   */
  cancelKeyRemap() {
    this.isRemapping = false;
    this.remappingKey = null;
    this.hideRemapDialog();
  }

  /**
   * Get current keybind for an action
   */
  getKeybindForAction(action) {
    for (const [key, boundAction] of this.keybinds) {
      if (boundAction === action) {
        return this.formatKeyName(key);
      }
    }
    return 'Unbound';
  }

  /**
   * Format key code to readable name
   */
  formatKeyName(keyCode) {
    const keyMap = {
      'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E',
      'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J',
      'KeyK': 'K', 'KeyL': 'L', 'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O',
      'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyS': 'S', 'KeyT': 'T',
      'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X', 'KeyY': 'Y', 'KeyZ': 'Z',
      'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
      'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
      'ShiftLeft': 'Left Shift', 'ShiftRight': 'Right Shift',
      'ControlLeft': 'Left Ctrl', 'ControlRight': 'Right Ctrl',
      'AltLeft': 'Left Alt', 'AltRight': 'Right Alt',
      'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
      'Space': 'Space', 'Enter': 'Enter', 'Escape': 'Esc', 'Tab': 'Tab'
    };
    
    return keyMap[keyCode] || keyCode;
  }

  /**
   * Utility methods
   */
  isGameKey(keyCode) {
    return this.keybinds.has(keyCode);
  }

  getMouseAction(button) {
    const mouseMap = {
      0: 'light-attack',  // Left click
      2: 'heavy-attack'   // Right click
    };
    return mouseMap[button];
  }

  getTouchAction(x, y) {
    for (const [name, zone] of this.touchZones) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return zone.action;
      }
    }
    return null;
  }

  isInMovementZone(x, y) {
    const zone = this.touchZones.get('movement');
    return zone && x >= zone.x && x <= zone.x + zone.width &&
           y >= zone.y && y <= zone.y + zone.height;
  }

  isTouchInGameArea(touch) {
    // Determine if touch is in game area vs UI elements
    const gameCanvas = document.getElementById('game-canvas');
    if (!gameCanvas) {
      return false;
    }
    
    const rect = gameCanvas.getBoundingClientRect();
    return touch.clientX >= rect.left && touch.clientX <= rect.right &&
           touch.clientY >= rect.top && touch.clientY <= rect.bottom;
  }

  calculateTouchMovement(touch) {
    const zone = this.touchZones.get('movement');
    if (!zone) {
      return { x: 0, y: 0 };
    }
    
    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;
    
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    
    const maxDistance = Math.min(zone.width, zone.height) / 3;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < 10) {
      return { x: 0, y: 0 }; // Dead zone
    }
    
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const angle = Math.atan2(deltaY, deltaX);
    
    return {
      x: Math.cos(angle) * normalizedDistance,
      y: Math.sin(angle) * normalizedDistance
    };
  }

  showInputNotification(message, icon) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'input-notification';
    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showRemapDialog(actionName) {
    // Implementation depends on UI framework
    console.log(`Remapping ${actionName} - Press any key...`);
  }

  hideRemapDialog() {
    // Implementation depends on UI framework
    console.log('Remapping cancelled');
  }

  updateKeybindDisplay() {
    // Dispatch event to update UI
    const event = new CustomEvent('keybinds-updated');
    document.dispatchEvent(event);
  }

  /**
   * Get input state for debugging
   */
  getInputState() {
    return {
      keyboard: Object.fromEntries(this.inputState.keyboard),
      mouse: {
        position: { x: this.inputState.mouse.x, y: this.inputState.mouse.y },
        buttons: [...this.inputState.mouse.buttons]
      },
      gamepad: this.gamepadIndex >= 0,
      touch: this.inputState.touch.active,
      buffer: Object.fromEntries(this.inputBuffer)
    };
  }

  /**
   * Cleanup and destroy input manager
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('wheel', this.handleMouseWheel);
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    // Clear state
    this.inputState.keyboard.clear();
    this.inputState.mouse.buttons.clear();
    this.inputBuffer.clear();
  }
}