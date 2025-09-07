/**
 * Enhanced Mobile Controls - Advanced touch controls for 5-button combat system
 * Features gesture recognition, haptic feedback, and adaptive UI
 */

export class EnhancedMobileControls {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.touchPoints = new Map();
    this.gestureState = {
      swipeThreshold: 50,
      longPressThreshold: 500,
      doubleTapThreshold: 300,
      pinchThreshold: 10
    };
    
    this.joystickState = {
      active: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      center: { x: 0, y: 0 },
      radius: 60,
      deadZone: 0.15
    };
    
    this.buttonStates = new Map();
    this.vibrationEnabled = 'vibrate' in navigator;
    this.lastTapTime = 0;
    this.lastTapTarget = null;
    
    this.init();
  }
  
  /**
   * Initialize enhanced mobile controls
   */
  init() {
    this.createEnhancedUI();
    this.setupTouchHandlers();
    this.setupGestureRecognition();
    this.setupHapticFeedback();
    this.setupResponsiveLayout();
  }
  
  /**
   * Create enhanced UI elements
   */
  createEnhancedUI() {
    this.createEnhancedJoystick();
    this.createEnhancedActionButtons();
    this.createGestureIndicators();
  }
  
  /**
   * Create enhanced joystick with visual feedback
   */
  createEnhancedJoystick() {
    const joystick = document.getElementById('joystick');
    if (!joystick) return;
    
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    
    if (!base || !knob) return;
    
    // Add direction indicators
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    directions.forEach((dir, index) => {
      const indicator = document.createElement('div');
      indicator.className = 'direction-indicator';
      indicator.textContent = dir;
      
      const angle = (index * 45) - 90; // Start from North
      const radius = 45;
      const x = Math.cos(angle * Math.PI / 180) * radius;
      const y = Math.sin(angle * Math.PI / 180) * radius;
      
      indicator.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      base.appendChild(indicator);
    });
    
    // Store joystick center for calculations
    const rect = base.getBoundingClientRect();
    this.joystickState.center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    this.joystickState.radius = rect.width / 2 - 20; // Account for knob size
  }
  
  /**
   * Create enhanced action buttons with 5-button combat system
   */
  createEnhancedActionButtons() {
    const actionsContainer = document.getElementById('actions');
    if (!actionsContainer) return;
    
    // Clear existing buttons
    actionsContainer.innerHTML = '';
    
    // Define 5-button combat system
    const buttons = [
      { id: 'light-attack', emoji: '👊', action: 'lightAttack', color: '#4CAF50', label: 'Light Attack' },
      { id: 'heavy-attack', emoji: '💥', action: 'heavyAttack', color: '#FF5722', label: 'Heavy Attack' },
      { id: 'special', emoji: '⚡', action: 'special', color: '#9C27B0', label: 'Special' },
      { id: 'block', emoji: '🛡️', action: 'block', color: '#2196F3', label: 'Block' },
      { id: 'roll', emoji: '🌀', action: 'roll', color: '#FF9800', label: 'Roll' }
    ];
    
    buttons.forEach((buttonConfig, index) => {
      const button = document.createElement('div');
      button.className = 'action-btn enhanced-btn';
      button.id = buttonConfig.id;
      button.dataset.action = buttonConfig.action;
      button.style.setProperty('--btn-color', buttonConfig.color);
      button.setAttribute('aria-label', buttonConfig.label);
      
      // Button content
      button.innerHTML = `
        <span class="btn-emoji">${buttonConfig.emoji}</span>
        <div class="cooldown-overlay"></div>
        <div class="press-feedback"></div>
      `;
      
      // Add to container
      actionsContainer.appendChild(button);
      
      // Initialize button state
      this.buttonStates.set(buttonConfig.action, {
        element: button,
        pressed: false,
        cooldown: 0,
        lastPress: 0
      });
    });
  }
  
  /**
   * Create gesture indicators for visual feedback
   */
  createGestureIndicators() {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;
    
    // Swipe indicators
    const swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'swipe-indicator hidden';
    swipeIndicator.innerHTML = `
      <div class="swipe-arrow"></div>
      <div class="swipe-text">Swipe detected</div>
    `;
    viewport.appendChild(swipeIndicator);
    
    // Long press indicator
    const longPressIndicator = document.createElement('div');
    longPressIndicator.className = 'long-press-indicator hidden';
    longPressIndicator.innerHTML = `
      <div class="long-press-circle"></div>
      <div class="long-press-text">Hold to activate</div>
    `;
    viewport.appendChild(longPressIndicator);
  }
  
  /**
   * Setup advanced touch handlers
   */
  setupTouchHandlers() {
    // Prevent default touch behaviors that interfere with game
    document.addEventListener('touchstart', this.preventDefaultTouch.bind(this), { passive: false });
    document.addEventListener('touchmove', this.preventDefaultTouch.bind(this), { passive: false });
    document.addEventListener('touchend', this.preventDefaultTouch.bind(this), { passive: false });
    
    // Joystick touch handlers
    const joystick = document.getElementById('joystick-base');
    if (joystick) {
      joystick.addEventListener('touchstart', this.handleJoystickStart.bind(this));
      joystick.addEventListener('touchmove', this.handleJoystickMove.bind(this));
      joystick.addEventListener('touchend', this.handleJoystickEnd.bind(this));
    }
    
    // Action button handlers
    document.querySelectorAll('.action-btn').forEach(button => {
      button.addEventListener('touchstart', this.handleButtonStart.bind(this));
      button.addEventListener('touchend', this.handleButtonEnd.bind(this));
    });
    
    // Global gesture handlers
    document.addEventListener('touchstart', this.handleGlobalTouchStart.bind(this));
    document.addEventListener('touchmove', this.handleGlobalTouchMove.bind(this));
    document.addEventListener('touchend', this.handleGlobalTouchEnd.bind(this));
  }
  
  /**
   * Prevent default touch behaviors selectively
   */
  preventDefaultTouch(event) {
    // Only prevent default for game-related touches
    const target = event.target;
    if (target.closest('.mobile-controls') || 
        target.closest('#gameCanvas') || 
        target.closest('.action-btn') ||
        target.closest('#joystick')) {
      event.preventDefault();
    }
  }
  
  /**
   * Handle joystick touch start
   */
  handleJoystickStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    
    this.joystickState.active = true;
    this.joystickState.startPos = { x: touch.clientX, y: touch.clientY };
    
    // Visual feedback
    const base = document.getElementById('joystick-base');
    if (base) base.classList.add('active');
    
    this.vibrate(10);
  }
  
  /**
   * Handle joystick touch move
   */
  handleJoystickMove(event) {
    if (!this.joystickState.active) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const center = this.joystickState.center;
    
    // Calculate offset from center
    const deltaX = touch.clientX - center.x;
    const deltaY = touch.clientY - center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Constrain to joystick radius
    const maxDistance = this.joystickState.radius;
    let constrainedX = deltaX;
    let constrainedY = deltaY;
    
    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      constrainedX = deltaX * ratio;
      constrainedY = deltaY * ratio;
    }
    
    // Update knob position
    const knob = document.getElementById('joystick-knob');
    if (knob) {
      knob.style.transform = `translate(calc(-50% + ${constrainedX}px), calc(-50% + ${constrainedY}px))`;
    }
    
    // Calculate normalized input (-1 to 1)
    const normalizedX = constrainedX / maxDistance;
    const normalizedY = constrainedY / maxDistance;
    
    // Apply dead zone
    const inputMagnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    let finalX = 0;
    let finalY = 0;
    
    if (inputMagnitude > this.joystickState.deadZone) {
      const adjustedMagnitude = (inputMagnitude - this.joystickState.deadZone) / (1 - this.joystickState.deadZone);
      const ratio = adjustedMagnitude / inputMagnitude;
      finalX = normalizedX * ratio;
      finalY = normalizedY * ratio;
    }
    
    // Update game state
    this.updateMovementInput(finalX, finalY);
  }
  
  /**
   * Handle joystick touch end
   */
  handleJoystickEnd(event) {
    event.preventDefault();
    
    this.joystickState.active = false;
    
    // Reset knob position
    const knob = document.getElementById('joystick-knob');
    if (knob) {
      knob.style.transform = 'translate(-50%, -50%)';
    }
    
    // Remove visual feedback
    const base = document.getElementById('joystick-base');
    if (base) base.classList.remove('active');
    
    // Reset movement input
    this.updateMovementInput(0, 0);
  }
  
  /**
   * Handle action button touch start
   */
  handleButtonStart(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    
    if (!action) return;
    
    const buttonState = this.buttonStates.get(action);
    if (!buttonState) return;
    
    // Check cooldown
    const now = performance.now();
    if (buttonState.cooldown > 0) return;
    
    // Visual feedback
    button.classList.add('pressed');
    
    // Haptic feedback based on action type
    this.vibrateForAction(action);
    
    // Update button state
    buttonState.pressed = true;
    buttonState.lastPress = now;
    
    // Forward to game
    this.triggerGameAction(action, true);
  }
  
  /**
   * Handle action button touch end
   */
  handleButtonEnd(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    
    if (!action) return;
    
    const buttonState = this.buttonStates.get(action);
    if (!buttonState) return;
    
    // Visual feedback
    button.classList.remove('pressed');
    
    // Update button state
    buttonState.pressed = false;
    
    // Forward to game (for hold-type actions like block)
    this.triggerGameAction(action, false);
  }
  
  /**
   * Setup gesture recognition
   */
  setupGestureRecognition() {
    this.gestureData = {
      startTouches: [],
      currentTouches: [],
      startTime: 0,
      swipeStartPos: null,
      longPressTimer: null
    };
  }
  
  /**
   * Handle global touch start for gestures
   */
  handleGlobalTouchStart(event) {
    // Skip if touching controls
    if (event.target.closest('.mobile-controls')) return;
    
    const touches = Array.from(event.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      startTime: performance.now()
    }));
    
    this.gestureData.startTouches = touches;
    this.gestureData.startTime = performance.now();
    
    // Start long press detection for single touch
    if (touches.length === 1) {
      this.startLongPressDetection(touches[0]);
    }
  }
  
  /**
   * Handle global touch move for gestures
   */
  handleGlobalTouchMove(event) {
    // Skip if touching controls
    if (event.target.closest('.mobile-controls')) return;
    
    const touches = Array.from(event.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }));
    
    this.gestureData.currentTouches = touches;
    
    // Cancel long press if finger moves too much
    if (this.gestureData.longPressTimer && touches.length === 1) {
      const startTouch = this.gestureData.startTouches[0];
      const currentTouch = touches[0];
      const distance = Math.sqrt(
        Math.pow(currentTouch.x - startTouch.x, 2) + 
        Math.pow(currentTouch.y - startTouch.y, 2)
      );
      
      if (distance > 20) { // 20px movement threshold
        this.cancelLongPress();
      }
    }
  }
  
  /**
   * Handle global touch end for gestures
   */
  handleGlobalTouchEnd(event) {
    // Skip if touching controls
    if (event.target.closest('.mobile-controls')) return;
    
    const endTime = performance.now();
    const duration = endTime - this.gestureData.startTime;
    
    // Cancel long press
    this.cancelLongPress();
    
    // Detect swipe gesture
    if (this.gestureData.startTouches.length === 1 && duration < 500) {
      this.detectSwipe();
    }
    
    // Detect double tap
    this.detectDoubleTap(event);
    
    // Reset gesture data
    this.gestureData.startTouches = [];
    this.gestureData.currentTouches = [];
  }
  
  /**
   * Start long press detection
   */
  startLongPressDetection(touch) {
    this.gestureData.longPressTimer = setTimeout(() => {
      this.handleLongPress(touch);
    }, this.gestureState.longPressThreshold);
  }
  
  /**
   * Cancel long press detection
   */
  cancelLongPress() {
    if (this.gestureData.longPressTimer) {
      clearTimeout(this.gestureData.longPressTimer);
      this.gestureData.longPressTimer = null;
    }
  }
  
  /**
   * Handle long press gesture
   */
  handleLongPress(touch) {
    console.log('Long press detected at:', touch.x, touch.y);
    
    // Show visual feedback
    this.showLongPressIndicator(touch.x, touch.y);
    
    // Vibrate
    this.vibrate(100);
    
    // Trigger special action (e.g., context menu or special attack)
    this.triggerGameAction('longPress', true);
  }
  
  /**
   * Detect swipe gesture
   */
  detectSwipe() {
    if (this.gestureData.startTouches.length !== 1 || this.gestureData.currentTouches.length !== 1) return;
    
    const start = this.gestureData.startTouches[0];
    const end = this.gestureData.currentTouches[0];
    
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < this.gestureState.swipeThreshold) return;
    
    // Determine swipe direction
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    let direction;
    
    if (angle >= -45 && angle <= 45) direction = 'right';
    else if (angle >= 45 && angle <= 135) direction = 'down';
    else if (angle >= -135 && angle <= -45) direction = 'up';
    else direction = 'left';
    
    console.log(`Swipe ${direction} detected:`, distance, 'px');
    
    // Show visual feedback
    this.showSwipeIndicator(direction, start, end);
    
    // Vibrate
    this.vibrate(50);
    
    // Trigger game action based on swipe direction
    this.triggerSwipeAction(direction);
  }
  
  /**
   * Detect double tap gesture
   */
  detectDoubleTap(event) {
    const now = performance.now();
    const touch = event.changedTouches[0];
    
    if (this.lastTapTime && now - this.lastTapTime < this.gestureState.doubleTapThreshold) {
      console.log('Double tap detected');
      
      // Vibrate
      this.vibrate(30);
      
      // Trigger double tap action
      this.triggerGameAction('doubleTap', true);
      
      this.lastTapTime = 0; // Reset to prevent triple tap
    } else {
      this.lastTapTime = now;
    }
  }
  
  /**
   * Show visual indicators for gestures
   */
  showSwipeIndicator(direction, start, end) {
    // Implementation for swipe visual feedback
    const indicator = document.querySelector('.swipe-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      // Position and animate indicator
      setTimeout(() => indicator.classList.add('hidden'), 1000);
    }
  }
  
  showLongPressIndicator(x, y) {
    // Implementation for long press visual feedback
    const indicator = document.querySelector('.long-press-indicator');
    if (indicator) {
      indicator.style.left = x + 'px';
      indicator.style.top = y + 'px';
      indicator.classList.remove('hidden');
      setTimeout(() => indicator.classList.add('hidden'), 1000);
    }
  }
  
  /**
   * Setup haptic feedback
   */
  setupHapticFeedback() {
    // Test vibration support
    if (this.vibrationEnabled) {
      console.log('✅ Haptic feedback available');
    } else {
      console.log('❌ Haptic feedback not supported');
    }
  }
  
  /**
   * Trigger vibration with different patterns for different actions
   */
  vibrate(duration = 50) {
    if (!this.vibrationEnabled) return;
    
    try {
      navigator.vibrate(duration);
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }
  
  /**
   * Vibrate with action-specific patterns
   */
  vibrateForAction(action) {
    if (!this.vibrationEnabled) return;
    
    const patterns = {
      lightAttack: 30,
      heavyAttack: [50, 20, 50],
      special: [100, 50, 100, 50, 100],
      block: 20,
      roll: [40, 20, 40]
    };
    
    const pattern = patterns[action] || 50;
    this.vibrate(pattern);
  }
  
  /**
   * Setup responsive layout adjustments
   */
  setupResponsiveLayout() {
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.adjustLayoutForOrientation(), 100);
    });
    
    // Listen for resize events
    window.addEventListener('resize', () => {
      this.adjustLayoutForScreenSize();
    });
    
    // Initial adjustment
    this.adjustLayoutForOrientation();
    this.adjustLayoutForScreenSize();
  }
  
  /**
   * Adjust layout based on device orientation
   */
  adjustLayoutForOrientation() {
    const orientation = screen.orientation?.angle || 0;
    const isLandscape = Math.abs(orientation) === 90;
    
    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);
    
    // Adjust control positions for orientation
    const mobileControls = document.querySelector('.mobile-controls');
    if (mobileControls) {
      if (isLandscape) {
        mobileControls.style.height = '160px';
      } else {
        mobileControls.style.height = '200px';
      }
    }
  }
  
  /**
   * Adjust layout based on screen size
   */
  adjustLayoutForScreenSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Adjust button sizes for very small screens
    if (width < 400 || height < 600) {
      document.body.classList.add('small-screen');
    } else {
      document.body.classList.remove('small-screen');
    }
  }
  
  /**
   * Update movement input
   */
  updateMovementInput(x, y) {
    if (this.gameStateManager && this.gameStateManager.updateMovement) {
      this.gameStateManager.updateMovement(x, y);
    }
  }
  
  /**
   * Trigger game action
   */
  triggerGameAction(action, pressed) {
    if (!this.gameStateManager) return;
    
    switch (action) {
      case 'lightAttack':
        if (pressed && this.gameStateManager.lightAttack) {
          this.gameStateManager.lightAttack();
        }
        break;
      case 'heavyAttack':
        if (pressed && this.gameStateManager.heavyAttack) {
          this.gameStateManager.heavyAttack();
        }
        break;
      case 'special':
        if (pressed && this.gameStateManager.specialAttack) {
          this.gameStateManager.specialAttack();
        }
        break;
      case 'block':
        if (this.gameStateManager.setBlocking) {
          this.gameStateManager.setBlocking(pressed, 0, 0);
        }
        break;
      case 'roll':
        if (pressed && this.gameStateManager.roll) {
          this.gameStateManager.roll();
        }
        break;
      case 'longPress':
        // Special long press action
        if (pressed && this.gameStateManager.specialAction) {
          this.gameStateManager.specialAction();
        }
        break;
      case 'doubleTap':
        // Double tap action (e.g., quick dodge)
        if (pressed && this.gameStateManager.quickDodge) {
          this.gameStateManager.quickDodge();
        }
        break;
    }
  }
  
  /**
   * Trigger swipe-based actions
   */
  triggerSwipeAction(direction) {
    if (!this.gameStateManager) return;
    
    // Swipe gestures can trigger different actions
    switch (direction) {
      case 'up':
        // Swipe up for jump or special move
        if (this.gameStateManager.jump) {
          this.gameStateManager.jump();
        }
        break;
      case 'down':
        // Swipe down for ground slam or crouch
        if (this.gameStateManager.groundSlam) {
          this.gameStateManager.groundSlam();
        }
        break;
      case 'left':
      case 'right':
        // Swipe left/right for dash
        if (this.gameStateManager.dash) {
          this.gameStateManager.dash(direction === 'right' ? 1 : -1);
        }
        break;
    }
  }
  
  /**
   * Update button cooldowns
   */
  updateCooldowns(deltaTime) {
    this.buttonStates.forEach((state, action) => {
      if (state.cooldown > 0) {
        state.cooldown = Math.max(0, state.cooldown - deltaTime);
        
        // Update visual cooldown indicator
        const cooldownOverlay = state.element.querySelector('.cooldown-overlay');
        if (cooldownOverlay) {
          const progress = state.cooldown / this.getCooldownDuration(action);
          const degrees = progress * 360;
          cooldownOverlay.style.background = `conic-gradient(var(--btn-color) ${degrees}deg, transparent ${degrees}deg)`;
        }
        
        // Remove cooldown class when done
        if (state.cooldown === 0) {
          state.element.classList.remove('on-cooldown');
        }
      }
    });
  }
  
  /**
   * Get cooldown duration for action
   */
  getCooldownDuration(action) {
    const cooldowns = {
      lightAttack: 200,   // 200ms
      heavyAttack: 500,   // 500ms
      special: 2000,      // 2s
      block: 100,         // 100ms
      roll: 1000          // 1s
    };
    
    return cooldowns[action] || 0;
  }
  
  /**
   * Set button cooldown
   */
  setButtonCooldown(action, duration) {
    const buttonState = this.buttonStates.get(action);
    if (buttonState) {
      buttonState.cooldown = duration;
      buttonState.element.classList.add('on-cooldown');
    }
  }
  
  /**
   * Get current input state for debugging
   */
  getInputState() {
    return {
      joystick: this.joystickState,
      buttons: Object.fromEntries(this.buttonStates),
      gestures: this.gestureData,
      vibrationEnabled: this.vibrationEnabled
    };
  }
  
  /**
   * Enable/disable vibration
   */
  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled && 'vibrate' in navigator;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    // Cancel any active timers
    this.cancelLongPress();
    
    // Clear button states
    this.buttonStates.clear();
    
    // Remove event listeners
    document.removeEventListener('touchstart', this.preventDefaultTouch);
    document.removeEventListener('touchmove', this.preventDefaultTouch);
    document.removeEventListener('touchend', this.preventDefaultTouch);
  }
}
