/**
 * Gamepad Manager - Comprehensive gamepad support for 5-button combat system
 * Handles multiple gamepads with configurable mappings and dead zones
 */

export class GamepadManager {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.gamepads = new Map();
    this.activeGamepad = null;
    this.lastInputTime = 0;
    this.inputThreshold = 16; // ~60 FPS polling
    
    // Gamepad configuration
    this.config = {
      deadZone: 0.15,
      triggerThreshold: 0.1,
      vibrationEnabled: true,
      autoDetect: true
    };
    
    // Button mappings for different gamepad types
    this.buttonMappings = {
      // Standard gamepad mapping (Xbox/PS4 style)
      standard: {
        lightAttack: 0,    // A/X button - Light Attack (A1)
        heavyAttack: 1,    // B/Circle button - Heavy Attack (A2) 
        special: 2,        // X/Square button - Special (Hero move)
        roll: 3,           // Y/Triangle button - Roll/Dodge
        block: 4,          // LB/L1 button - Block
        // Alternative mappings
        blockAlt: 5,       // RB/R1 button - Block (alternative)
        pause: 9,          // Menu/Options button
        // D-pad for movement (if analog stick fails)
        dpadUp: 12,
        dpadDown: 13,
        dpadLeft: 14,
        dpadRight: 15
      },
      // Xbox controller specific
      xbox: {
        lightAttack: 0,    // A button
        heavyAttack: 1,    // B button
        special: 2,        // X button
        roll: 3,           // Y button
        block: 4,          // Left bumper
        blockAlt: 5,       // Right bumper
        pause: 9           // Menu button
      },
      // PlayStation controller specific
      playstation: {
        lightAttack: 0,    // Cross button
        heavyAttack: 1,    // Circle button
        special: 2,        // Square button
        roll: 3,           // Triangle button
        block: 4,          // L1 button
        blockAlt: 5,       // R1 button
        pause: 9           // Options button
      }
    };
    
    this.currentMapping = this.buttonMappings.standard;
    this.inputState = {
      leftStick: { x: 0, y: 0 },
      rightStick: { x: 0, y: 0 },
      buttons: {},
      triggers: { left: 0, right: 0 }
    };
    
    // Track animation frame for cleanup
    this.pollingFrameId = null;
    
    this.setupEventListeners();
    this.startPolling();
  }
  
  /**
   * Setup gamepad event listeners
   */
  setupEventListeners() {
    window.addEventListener('gamepadconnected', (event) => {
      this.onGamepadConnected(event);
    });
    
    window.addEventListener('gamepaddisconnected', (event) => {
      this.onGamepadDisconnected(event);
    });
  }
  
  /**
   * Handle gamepad connection
   */
  onGamepadConnected(event) {
    const gamepad = event.gamepad;
    console.log(`🎮 Gamepad connected: ${gamepad.id}`);
    
    this.gamepads.set(gamepad.index, gamepad);
    
    // Set as active gamepad if none is active
    if (!this.activeGamepad) {
      this.activeGamepad = gamepad;
      this.detectGamepadType(gamepad);
    }
    
    // Trigger connection feedback
    this.vibrate(200, 200);
    
    // Notify UI
    this.dispatchGamepadEvent('connected', {
      gamepad: gamepad,
      index: gamepad.index
    });
  }
  
  /**
   * Handle gamepad disconnection
   */
  onGamepadDisconnected(event) {
    const gamepad = event.gamepad;
    console.log(`🎮 Gamepad disconnected: ${gamepad.id}`);
    
    this.gamepads.delete(gamepad.index);
    
    // Find new active gamepad if current one was disconnected
    if (this.activeGamepad && this.activeGamepad.index === gamepad.index) {
      this.activeGamepad = this.gamepads.values().next().value || null;
      if (this.activeGamepad) {
        this.detectGamepadType(this.activeGamepad);
      }
    }
    
    // Notify UI
    this.dispatchGamepadEvent('disconnected', {
      gamepad: gamepad,
      index: gamepad.index
    });
  }
  
  /**
   * Detect gamepad type and set appropriate button mapping
   */
  detectGamepadType(gamepad) {
    const id = gamepad.id.toLowerCase();
    
    if (id.includes('xbox') || id.includes('xinput')) {
      this.currentMapping = this.buttonMappings.xbox;
      console.log('🎮 Xbox controller detected');
    } else if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense')) {
      this.currentMapping = this.buttonMappings.playstation;
      console.log('🎮 PlayStation controller detected');
    } else {
      this.currentMapping = this.buttonMappings.standard;
      console.log('🎮 Standard controller mapping applied');
    }
  }
  
  /**
   * Start gamepad polling loop
   */
  startPolling() {
    const poll = () => {
      const now = performance.now();
      if (now - this.lastInputTime >= this.inputThreshold) {
        this.updateGamepads();
        this.lastInputTime = now;
      }
      this.pollingFrameId = requestAnimationFrame(poll);
    };
    poll();
  }
  
  /**
   * Update all connected gamepads
   */
  updateGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        this.gamepads.set(i, gamepad);
        
        // Update active gamepad
        if (this.activeGamepad && this.activeGamepad.index === i) {
          this.activeGamepad = gamepad;
          this.processGamepadInput(gamepad);
        }
      }
    }
  }
  
  /**
   * Process input from active gamepad
   */
  processGamepadInput(gamepad) {
    // Update analog sticks
    this.updateAnalogSticks(gamepad);
    
    // Update buttons
    this.updateButtons(gamepad);
    
    // Update triggers
    this.updateTriggers(gamepad);
    
    // Forward input to game state manager
    this.forwardInputToGame();
  }
  
  /**
   * Update analog stick values with dead zone
   */
  updateAnalogSticks(gamepad) {
    // Left stick (movement)
    let leftX = gamepad.axes[0] || 0;
    let leftY = gamepad.axes[1] || 0;
    
    // Apply dead zone
    if (Math.abs(leftX) < this.config.deadZone) {leftX = 0;}
    if (Math.abs(leftY) < this.config.deadZone) {leftY = 0;}
    
    this.inputState.leftStick = { x: leftX, y: leftY };
    
    // Right stick (camera/facing - for future use)
    let rightX = gamepad.axes[2] || 0;
    let rightY = gamepad.axes[3] || 0;
    
    if (Math.abs(rightX) < this.config.deadZone) {rightX = 0;}
    if (Math.abs(rightY) < this.config.deadZone) {rightY = 0;}
    
    this.inputState.rightStick = { x: rightX, y: rightY };
  }
  
  /**
   * Update button states
   */
  updateButtons(gamepad) {
    const mapping = this.currentMapping;
    const buttons = gamepad.buttons;
    
    // 5-button combat system mapping
    const buttonStates = {
      lightAttack: this.isButtonPressed(buttons[mapping.lightAttack]),
      heavyAttack: this.isButtonPressed(buttons[mapping.heavyAttack]),
      special: this.isButtonPressed(buttons[mapping.special]),
      roll: this.isButtonPressed(buttons[mapping.roll]),
      block: this.isButtonPressed(buttons[mapping.block]) || 
             this.isButtonPressed(buttons[mapping.blockAlt]),
      pause: this.isButtonPressed(buttons[mapping.pause])
    };
    
    // D-pad as movement fallback
    buttonStates.dpadUp = this.isButtonPressed(buttons[mapping.dpadUp]);
    buttonStates.dpadDown = this.isButtonPressed(buttons[mapping.dpadDown]);
    buttonStates.dpadLeft = this.isButtonPressed(buttons[mapping.dpadLeft]);
    buttonStates.dpadRight = this.isButtonPressed(buttons[mapping.dpadRight]);
    
    // Detect button press changes for haptic feedback
    this.handleButtonChanges(buttonStates);
    
    this.inputState.buttons = buttonStates;
  }
  
  /**
   * Update trigger values
   */
  updateTriggers(gamepad) {
    const buttons = gamepad.buttons;
    
    // Triggers can be used for additional actions in the future
    this.inputState.triggers = {
      left: buttons[6] ? buttons[6].value : 0,   // LT/L2
      right: buttons[7] ? buttons[7].value : 0   // RT/R2
    };
  }
  
  /**
   * Check if button is pressed (handles both digital and analog buttons)
   */
  isButtonPressed(button) {
    if (!button) {return false;}
    return button.pressed || button.value > this.config.triggerThreshold;
  }
  
  /**
   * Handle button press changes for haptic feedback
   */
  handleButtonChanges(newButtonStates) {
    const prevButtons = this.inputState.buttons || {};
    
    // Check for new button presses
    Object.keys(newButtonStates).forEach(button => {
      if (newButtonStates[button] && !prevButtons[button]) {
        // Button was just pressed
        this.onButtonPress(button);
      }
    });
  }
  
  /**
   * Handle button press events
   */
  onButtonPress(button) {
    // Haptic feedback for different button types
    switch (button) {
      case 'lightAttack':
        this.vibrate(50, 50);
        break;
      case 'heavyAttack':
        this.vibrate(100, 100);
        break;
      case 'special':
        this.vibrate(150, 150);
        break;
      case 'roll':
        this.vibrate(75, 75);
        break;
      case 'block':
        this.vibrate(25, 25);
        break;
    }
  }
  
  /**
   * Forward processed input to game state manager
   */
  forwardInputToGame() {
    if (!this.gameStateManager) {return;}
    
    const input = this.getProcessedInput();
    
    // Update input manager with gamepad input
    if (this.gameStateManager.inputState) {
      // Update InputManager's input state directly
      this.gameStateManager.inputState.direction.x = input.moveX;
      this.gameStateManager.inputState.direction.y = input.moveY;
      this.gameStateManager.inputState.lightAttack = input.lightAttack;
      this.gameStateManager.inputState.heavyAttack = input.heavyAttack;
      this.gameStateManager.inputState.special = input.special;
      this.gameStateManager.inputState.roll = input.roll;
      this.gameStateManager.inputState.block = input.block;
    } else if (this.gameStateManager.updateInput) {
      // Fallback to updateInput method if available
      this.gameStateManager.updateInput(input);
    }
  }
  
  /**
   * Get processed input state for game
   */
  getProcessedInput() {
    const buttons = this.inputState.buttons;
    const leftStick = this.inputState.leftStick;
    
    // Combine analog stick and D-pad for movement
    let moveX = leftStick.x;
    let moveY = leftStick.y;
    
    // D-pad override (digital input takes precedence)
    if (buttons.dpadLeft) {moveX = -1;}
    else if (buttons.dpadRight) {moveX = 1;}
    
    if (buttons.dpadUp) {moveY = -1;}
    else if (buttons.dpadDown) {moveY = 1;}
    
    return {
      // Movement
      left: moveX < -0.1,
      right: moveX > 0.1,
      up: moveY < -0.1,
      down: moveY > 0.1,
      moveX: moveX,
      moveY: moveY,
      
      // 5-button combat system
      lightAttack: buttons.lightAttack,
      heavyAttack: buttons.heavyAttack,
      special: buttons.special,
      roll: buttons.roll,
      block: buttons.block,
      
      // Additional
      pause: buttons.pause,
      
      // Raw values for advanced features
      rightStick: this.inputState.rightStick,
      triggers: this.inputState.triggers
    };
  }
  
  /**
   * Trigger gamepad vibration
   */
  vibrate(duration = 100, intensity = 1.0) {
    if (!this.config.vibrationEnabled || !this.activeGamepad) {return;}
    
    if (this.activeGamepad.vibrationActuator) {
      // Modern Gamepad API
      this.activeGamepad.vibrationActuator.playEffect('dual-rumble', {
        duration: duration,
        strongMagnitude: intensity * 0.8,
        weakMagnitude: intensity * 0.4
      });
    } else if (this.activeGamepad.hapticActuators) {
      // Legacy API
      this.activeGamepad.hapticActuators[0].pulse(intensity, duration);
    }
  }
  
  /**
   * Dispatch custom gamepad events
   */
  dispatchGamepadEvent(type, data) {
    window.dispatchEvent(new CustomEvent(`gamepad${type}`, {
      detail: data
    }));
  }
  
  /**
   * Get active gamepad info
   */
  getActiveGamepadInfo() {
    if (!this.activeGamepad) {return null;}
    
    return {
      id: this.activeGamepad.id,
      index: this.activeGamepad.index,
      connected: this.activeGamepad.connected,
      mapping: this.activeGamepad.mapping,
      buttonsCount: this.activeGamepad.buttons.length,
      axesCount: this.activeGamepad.axes.length
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Set custom button mapping
   */
  setButtonMapping(mapping) {
    if (this.buttonMappings[mapping]) {
      this.currentMapping = this.buttonMappings[mapping];
    } else {
      console.warn(`Unknown button mapping: ${mapping}`);
    }
  }
  
  /**
   * Get current input state (for debugging)
   */
  getInputState() {
    return {
      ...this.inputState,
      activeGamepad: this.getActiveGamepadInfo(),
      config: this.config
    };
  }
  
  /**
   * Get number of connected gamepads
   */
  getConnectedCount() {
    return this.gamepads.size;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    // Cancel polling loop to prevent memory leak
    if (this.pollingFrameId !== null) {
      cancelAnimationFrame(this.pollingFrameId);
      this.pollingFrameId = null;
    }
    
    this.gamepads.clear();
    this.activeGamepad = null;
  }
}