/**
 * UI Event Handlers - Centralized UI event handling
 * Separated from main site.js for better organization
 */

export class UIEventHandlers {
  constructor(gameStateManager, roomManager, audioManager, gamepadManager, mobileControls, visualEffects) {
    this.gameStateManager = gameStateManager;
    this.roomManager = roomManager;
    this.audioManager = audioManager;
    this.gamepadManager = gamepadManager;
    this.mobileControls = mobileControls;
    this.visualEffects = visualEffects;
    
    this.currentTab = 'lobby';
    this.inputState = {
      direction: { x: 0, y: 0 },
      isRolling: false,
      isAttacking: false,          // Legacy
      isLightAttacking: false,     // A1 - Light Attack
      isHeavyAttacking: false,     // A2 - Heavy Attack  
      isSpecialAttacking: false,   // Special - Hero move
      isBlocking: false,           // Block - Hold to guard
      facing: { x: 0, y: 0 }
    };

    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupGamepadEvents();
    this.setupUIEvents();
    this.setupWindowEvents();
  }

  /**
   * Setup keyboard event listeners
   * @private
   */
  setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    });
  }

  /**
   * Setup mouse event listeners
   * @private
   */
  setupMouseEvents() {
    document.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });

    document.addEventListener('mouseup', (event) => {
      this.handleMouseUp(event);
    });

    document.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });
  }

  /**
   * Setup gamepad event listeners
   * @private
   */
  setupGamepadEvents() {
    // Gamepad support for future implementation
    window.addEventListener('gamepadconnected', (event) => {
      console.log('Gamepad connected:', event.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', (event) => {
      console.log('Gamepad disconnected:', event.gamepad.id);
    });
  }

  /**
   * Setup UI-specific event listeners
   * @private
   */
  setupUIEvents() {
    // Tab switching
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('tab-btn')) {
        this.handleTabClick(event);
      }
    });

    // Chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.handleChatSubmit();
        }
      });
    }

    // Restart button
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        this.handleRestartGame();
      });
    }
  }

  /**
   * Setup window event listeners
   * @private
   */
  setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.handleWindowResize();
    });

    window.addEventListener('beforeunload', () => {
      this.handleBeforeUnload();
    });

    // Visibility change for pause/resume
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Handle key down events - 5-button combat system
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    // Prevent default for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
    if (gameKeys.includes(event.code)) {
      event.preventDefault();
    }

    switch (event.code) {
      // Movement
      case 'ArrowUp':
      case 'KeyW':
        this.inputState.direction.y = -1;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.inputState.direction.y = 1;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.inputState.direction.x = -1;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.inputState.direction.x = 1;
        break;
        
      // 5-Button Combat System
      case 'KeyJ':
      case 'Digit1':
        this.handleLightAttackInput(true);  // A1 = Light Attack
        break;
      case 'KeyK':
      case 'Digit2':
        this.handleHeavyAttackInput(true);  // A2 = Heavy Attack
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'Digit3':
        this.handleBlockInput(true);        // Block = Hold to guard
        break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'Digit4':
        this.handleRollInput(true);         // Roll = Dodge
        break;
      case 'KeyL':
      case 'Digit5':
        this.handleSpecialInput(true);      // Special = Hero move
        break;
        
      // Legacy/Other
      case 'Space':
        this.handleRollInput(true);         // Legacy roll mapping
        break;
      case 'Escape':
        this.handleEscapeKey();
        break;
    }
  }

  /**
   * Handle key up events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        if (this.inputState.direction.y === -1) {
          this.inputState.direction.y = 0;
        }
        break;
      case 'ArrowDown':
      case 'KeyS':
        if (this.inputState.direction.y === 1) {
          this.inputState.direction.y = 0;
        }
        break;
      case 'ArrowLeft':
      case 'KeyA':
        if (this.inputState.direction.x === -1) {
          this.inputState.direction.x = 0;
        }
        break;
      case 'ArrowRight':
      case 'KeyD':
        if (this.inputState.direction.x === 1) {
          this.inputState.direction.x = 0;
        }
        break;
      // 5-Button Combat System Key Up
      case 'KeyJ':
      case 'Digit1':
        this.handleLightAttackInput(false);  // A1 = Light Attack
        break;
      case 'KeyK':
      case 'Digit2':
        this.handleHeavyAttackInput(false);  // A2 = Heavy Attack
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'Digit3':
        this.handleBlockInput(false);        // Block
        break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'Digit4':
        this.handleRollInput(false);         // Roll
        break;
      case 'KeyL':
      case 'Digit5':
        this.handleSpecialInput(false);      // Special
        break;
        
      // Legacy
      case 'Space':
        this.handleRollInput(false);         // Legacy roll
        break;
    }
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseDown(event) {
    // Handle mouse-based input for future implementation
    if (event.button === 0) { // Left click
      this.handleAttackInput(true);
    } else if (event.button === 2) { // Right click
      this.handleBlockInput(true);
    }
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseUp(event) {
    if (event.button === 0) { // Left click
      this.handleAttackInput(false);
    } else if (event.button === 2) { // Right click
      this.handleBlockInput(false);
    }
  }

  /**
   * Handle mouse move events
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseMove(event) {
    // Update facing direction based on mouse position
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (length > 0) {
        this.inputState.facing.x = deltaX / length;
        this.inputState.facing.y = deltaY / length;
      }
    }
  }

  /**
   * Handle roll input
   * @param {boolean} isPressed - Is key pressed
   */
  handleRollInput(isPressed) {
    if (isPressed && !this.inputState.isRolling) {
      this.inputState.isRolling = true;
      this.gameStateManager.roll();
    } else if (!isPressed) {
      this.inputState.isRolling = false;
    }
  }

  /**
   * Handle attack input
   * @param {boolean} isPressed - Is key pressed
   */
  handleAttackInput(isPressed) {
    if (isPressed && !this.inputState.isAttacking) {
      this.inputState.isAttacking = true;
      this.gameStateManager.attack();
    } else if (!isPressed) {
      this.inputState.isAttacking = false;
    }
  }

  /**
   * Handle light attack input (A1)
   * @param {boolean} isPressed - Is key pressed
   */
  handleLightAttackInput(isPressed) {
    if (isPressed && !this.inputState.isLightAttacking) {
      this.inputState.isLightAttacking = true;
      this.gameStateManager.lightAttack();
    } else if (!isPressed) {
      this.inputState.isLightAttacking = false;
    }
  }

  /**
   * Handle heavy attack input (A2)
   * @param {boolean} isPressed - Is key pressed
   */
  handleHeavyAttackInput(isPressed) {
    if (isPressed && !this.inputState.isHeavyAttacking) {
      this.inputState.isHeavyAttacking = true;
      this.gameStateManager.heavyAttack();
    } else if (!isPressed) {
      this.inputState.isHeavyAttacking = false;
    }
  }

  /**
   * Handle special attack input (Hero move)
   * @param {boolean} isPressed - Is key pressed
   */
  handleSpecialInput(isPressed) {
    if (isPressed && !this.inputState.isSpecialAttacking) {
      this.inputState.isSpecialAttacking = true;
      this.gameStateManager.specialAttack();
    } else if (!isPressed) {
      this.inputState.isSpecialAttacking = false;
    }
  }

  /**
   * Handle block input - Hold to guard, tap to parry
   * @param {boolean} isPressed - Is key pressed
   */
  handleBlockInput(isPressed) {
    this.inputState.isBlocking = isPressed;
    this.gameStateManager.setBlocking(
      isPressed,
      this.inputState.facing.x,
      this.inputState.facing.y
    );
  }

  /**
   * Handle escape key
   */
  handleEscapeKey() {
    if (this.gameStateManager.isGameRunning) {
      if (this.gameStateManager.isPaused) {
        this.gameStateManager.resumeGame();
      } else {
        this.gameStateManager.pauseGame();
      }
    }
  }

  /**
   * Handle restart game
   */
  handleRestartGame() {
    if (this.gameStateManager.wasmManager) {
      // Generate deterministic seed based on current time (seconds)
      const newSeed = BigInt(Math.floor(Date.now() / 1000));
      this.gameStateManager.wasmManager.resetRun(newSeed);
      console.log('Game restarted with seed:', newSeed.toString());
    }
  }

  /**
   * Handle tab click
   * @param {Event} event - Click event
   */
  handleTabClick(event) {
    const tabName = event.target.getAttribute('data-tab');
    if (tabName) {
      this.showTab(tabName);
    }
  }

  /**
   * Show specific tab
   * @param {string} tabName - Tab name to show
   */
  showTab(tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}Tab`);
    if (selectedContent) {
      selectedContent.style.display = 'block';
    }

    // Update button styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.style.background = '#333';
      btn.classList.remove('active');
    });

    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) {
      selectedBtn.style.background = '#4a90e2';
      selectedBtn.classList.add('active');
    }

    this.currentTab = tabName;
  }

  /**
   * Handle chat submit
   */
  handleChatSubmit() {
    if (this.roomManager) {
      const input = document.getElementById('chatInput');
      const message = input.value.trim();
      
      if (message) {
        this.roomManager.sendChatMessage(message);
        input.value = '';
      }
    }
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    // Update canvas size if needed
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      // Trigger resize event for game renderer
      window.dispatchEvent(new CustomEvent('gameCanvasResize', {
        detail: { canvas }
      }));
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    // Cleanup resources
    if (this.gameStateManager.isGameRunning) {
      this.gameStateManager.stopGame();
    }
    
    if (this.roomManager.currentRoom) {
      this.roomManager.leaveRoom();
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      if (this.gameStateManager.isGameRunning && !this.gameStateManager.isPaused) {
        this.gameStateManager.pauseGame();
      }
    } else {
      if (this.gameStateManager.isGameRunning && this.gameStateManager.isPaused) {
        this.gameStateManager.resumeGame();
      }
    }
  }

  /**
   * Get current input state
   * @returns {Object} Current input state
   */
  getInputState() {
    return { ...this.inputState };
  }

  /**
   * Update input state
   * @param {Object} newState - New input state
   */
  updateInputState(newState) {
    this.inputState = { ...this.inputState, ...newState };
  }

  /**
   * Reset input state
   */
  resetInputState() {
    this.inputState = {
      direction: { x: 0, y: 0 },
      isRolling: false,
      isAttacking: false,
      isBlocking: false,
      facing: { x: 0, y: 0 }
    };
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    // Remove all event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
