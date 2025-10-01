/**
 * Unified Input Manager - Single source of truth for all input handling
 * Consolidates keyboard, mouse, touch, and gamepad input
 * Follows WASM-first architecture - all input flows through WASM
 * 
 * This replaces the duplicate InputManager classes in:
 * - public/src/input/input-manager.js
 * - public/src/ui/input-manager.js
 */

import { InputValidator } from './input-validator.js';
import { ThreeButtonInputAdapter } from '../input/ThreeButtonInputAdapter.js';

export class UnifiedInputManager {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        
        // Device detection
        this.isMobile = this.detectMobileDevice();
        this.hasTouch = 'ontouchstart' in window;
        this.hasGamepad = 'getGamepads' in navigator;
        
        // Input state - single source of truth
        this.inputState = {
            // Movement (normalized -1 to 1)
            direction: { x: 0, y: 0 },
            
            // Three-button physical inputs (J/L/K)
            leftHand: false,
            rightHand: false,
            special3: false,

            // Derived 5-action outputs (fed to WASM)
            lightAttack: false,    // A1 - J or 1
            heavyAttack: false,    // A2 - K or 2  
            block: false,          // Block - Shift or 3
            roll: false,           // Roll - Ctrl/Space or 4
            special: false,        // Special - L or 5
            
            // Additional inputs
            jump: false,           // Space (legacy)
            
            // Mouse/touch state
            pointer: { x: 0, y: 0, down: false },
            
            // UI controls
            pause: false,
            inventory: false,
            map: false,
            
            // Internal state
            lastUpdate: 0,
            inputBuffer: new Map(), // For responsive controls (120ms buffer)
            lastMovementDirection: { x: 1, y: 0 } // Default facing right
        };
        
        // Configuration
        this.config = {
            bufferDuration: 120, // milliseconds for input buffer
            gamepadDeadzone: 0.15,
            touchSensitivity: 1.0,
            keyRepeatDelay: 250, // milliseconds
            debugInput: false
        };
        
        // Key mappings - customizable
        this.keyMappings = new Map([
            // Movement
            ['KeyW', 'move-up'],
            ['KeyA', 'move-left'], 
            ['KeyS', 'move-down'],
            ['KeyD', 'move-right'],
            ['ArrowUp', 'move-up'],
            ['ArrowLeft', 'move-left'],
            ['ArrowDown', 'move-down'],
            ['ArrowRight', 'move-right'],
            
            // 3-button combat input (J/L/K)
            ['KeyJ', 'left-hand'],
            ['KeyL', 'right-hand'],
            ['KeyK', 'special3'],
            ['ShiftLeft', 'block'],      // Shift/3: Block/Parry
            ['ShiftRight', 'block'],
            // 'Digit3' intentionally unused in 3-button mode
            ['ControlLeft', 'roll'],     // Ctrl/4: Roll
            ['ControlRight', 'roll'],
            // 'Digit4' intentionally unused in 3-button mode
            ['Space', 'roll'],           // Space as alternative roll
            
            // UI Controls
            ['Escape', 'pause'],
            ['Tab', 'inventory'],
            ['KeyM', 'map'],
            ['KeyI', 'inventory']
        ]);
        
        // Gamepad manager integration
        this.gamepadManager = null;
        
        // Event listeners storage for cleanup
        this.eventListeners = [];
        
        // Input validator for security and edge case handling
        this.validator = new InputValidator();
        
        // Synchronization state
        this.syncState = {
            lastWasmUpdate: 0,
            pendingInputs: new Map(),
            wasmReady: false,
            inputQueue: []
        };
        
        // Three-button adapter
        this._threeBtn = new ThreeButtonInputAdapter();

        // Track animation frame for cleanup
        this.animationFrameId = null;
        
        this.initialize();
    }
    
    /**
     * Initialize the unified input system
     */
    initialize() {
        console.log('🎮 Initializing Unified Input Manager...');
        
        // Initialize key states for proper movement tracking
        this.keyStates = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        // IMPORTANT: Clear all inputs first to ensure clean state
        this.clearAllInputs();
        
        this.setupKeyboardInput();
        this.setupMouseInput();
        
        if (this.hasTouch) {
            this.setupTouchInput();
        }
        
        if (this.hasGamepad) {
            this.setupGamepadInput();
        }
        
        // Clear stuck inputs when window loses focus
        this.addEventListenerWithCleanup(window, 'blur', () => {
            this.clearAllInputs();
        });
        
        // Prevent context menu on right-click during gameplay
        this.addEventListenerWithCleanup(document, 'contextmenu', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });
        
        // Start input update loop
        this.startInputLoop();
        
        // DON'T send initial clear - it corrupts WASM state
        // The input state defaults to all zeros anyway
        setTimeout(() => {
            if (this.syncState.wasmReady) {
                // Just verify state is zero, don't send anything
                console.log('✅ Input manager ready, state defaults to zero');
            }
        }, 100);
        
        console.log(`✅ Unified Input Manager initialized - Mobile: ${this.isMobile}, Touch: ${this.hasTouch}, Gamepad: ${this.hasGamepad}`);
    }
    
    /**
     * Setup keyboard input handling
     */
    setupKeyboardInput() {
        const handleKeyDown = (event) => {
            const action = this.keyMappings.get(event.code);
            if (action) {
                event.preventDefault();
                this.handleInputAction(action, true);
                this.addToInputBuffer(action);
            }
        };
        
        const handleKeyUp = (event) => {
            const action = this.keyMappings.get(event.code);
            if (action) {
                event.preventDefault();
                this.handleInputAction(action, false);
            }
        };
        
        this.addEventListenerWithCleanup(document, 'keydown', handleKeyDown);
        this.addEventListenerWithCleanup(document, 'keyup', handleKeyUp);
    }
    
    /**
     * Setup mouse input handling
     */
    setupMouseInput() {
        const handleMouseDown = (event) => {
            this.inputState.pointer.down = true;
            
            // FIXED: Only trigger attacks on canvas clicks, not document clicks
            // This prevents accidental attacks when clicking outside the game
            const canvas = document.getElementById('demo-canvas');
            if (event.target !== canvas) {
                return; // Ignore clicks outside canvas
            }
            
            // Mouse buttons can trigger actions
            switch (event.button) {
                case 0: // Left click
                    this.handleInputAction('light-attack', true);
                    break;
                case 2: // Right click
                    this.handleInputAction('block', true);
                    break;
            }
        };
        
        const handleMouseUp = (event) => {
            this.inputState.pointer.down = false;
            
            switch (event.button) {
                case 0: // Left click
                    this.handleInputAction('light-attack', false);
                    break;
                case 2: // Right click
                    this.handleInputAction('block', false);
                    break;
            }
        };
        
        const handleMouseMove = (event) => {
            this.inputState.pointer.x = event.clientX;
            this.inputState.pointer.y = event.clientY;
        };
        
        this.addEventListenerWithCleanup(document, 'mousedown', handleMouseDown);
        this.addEventListenerWithCleanup(document, 'mouseup', handleMouseUp);
        this.addEventListenerWithCleanup(document, 'mousemove', handleMouseMove);
    }
    
    /**
     * Setup touch input handling for mobile
     */
    setupTouchInput() {
        // Initialize joystick state
        this.joystickState = {
            active: false,
            center: { x: 0, y: 0 },
            maxDistance: 60,
            touchId: null
        };
        
        // Map of active touches for multi-touch support
        this.activeTouches = new Map();
        
        const handleTouchStart = (event) => {
            for (const touch of event.changedTouches) {
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (this.config.debugInput) {
                    console.log(`👆 Touch start at (${touch.clientX}, ${touch.clientY})`, element?.id || element?.className);
                }
                
                // Handle joystick touch
                if (element && (element.closest('#joystick') || element.closest('#joystick-base') || element.id === 'joystick-base' || element.id === 'joystick-knob')) {
                    event.preventDefault();
                    if (this.config.debugInput) {
                        console.log('🕹️ Joystick touch detected');
                    }
                    this.handleJoystickStart(touch);
                    this.activeTouches.set(touch.identifier, { type: 'joystick', element });
                }
                // Handle action button touch
                else if (element && element.closest('.action-btn')) {
                    event.preventDefault();
                    const actionBtn = element.closest('.action-btn');
                    if (this.config.debugInput) {
                        console.log('🎯 Action button touch detected:', actionBtn.dataset.action);
                    }
                    this.handleActionButtonTouch(actionBtn, true);
                    this.activeTouches.set(touch.identifier, { type: 'button', element: actionBtn });
                }
                // General touch tracking
                else {
                    this.inputState.pointer.x = touch.clientX;
                    this.inputState.pointer.y = touch.clientY;
                    this.inputState.pointer.down = true;
                    this.activeTouches.set(touch.identifier, { type: 'general', element });
                }
            }
        };
        
        const handleTouchMove = (event) => {
            for (const touch of event.changedTouches) {
                const touchData = this.activeTouches.get(touch.identifier);
                if (!touchData) continue;
                
                // Handle joystick movement
                if (touchData.type === 'joystick') {
                    event.preventDefault();
                    this.handleJoystickMove(touch);
                }
                // Update general pointer position
                else {
                    this.inputState.pointer.x = touch.clientX;
                    this.inputState.pointer.y = touch.clientY;
                }
            }
        };
        
        const handleTouchEnd = (event) => {
            for (const touch of event.changedTouches) {
                const touchData = this.activeTouches.get(touch.identifier);
                if (!touchData) continue;
                
                // Handle joystick release
                if (touchData.type === 'joystick') {
                    event.preventDefault();
                    this.handleJoystickEnd();
                }
                // Handle button release
                else if (touchData.type === 'button') {
                    event.preventDefault();
                    this.handleActionButtonTouch(touchData.element, false);
                }
                // General touch end
                else {
                    this.inputState.pointer.down = false;
                }
                
                this.activeTouches.delete(touch.identifier);
            }
        };
        
        this.addEventListenerWithCleanup(document, 'touchstart', handleTouchStart, { passive: false });
        this.addEventListenerWithCleanup(document, 'touchmove', handleTouchMove, { passive: false });
        this.addEventListenerWithCleanup(document, 'touchend', handleTouchEnd, { passive: false });
        this.addEventListenerWithCleanup(document, 'touchcancel', handleTouchEnd, { passive: false });
        
        console.log('✅ Touch input handlers initialized for joystick and action buttons');
    }
    
    /**
     * Handle joystick touch start
     */
    handleJoystickStart(touch) {
        const joystickBase = document.getElementById('joystick-base');
        if (!joystickBase) return;
        
        const rect = joystickBase.getBoundingClientRect();
        this.joystickState.active = true;
        this.joystickState.touchId = touch.identifier;
        this.joystickState.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        this.joystickState.maxDistance = rect.width / 2 - 20;
        
        // Visual feedback
        joystickBase.classList.add('active');
        
        this.handleJoystickMove(touch);
    }
    
    /**
     * Handle joystick movement
     */
    handleJoystickMove(touch) {
        if (!this.joystickState.active) return;
        
        const center = this.joystickState.center;
        const maxDist = this.joystickState.maxDistance;
        
        let deltaX = touch.clientX - center.x;
        let deltaY = touch.clientY - center.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Constrain to max distance
        if (distance > maxDist) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDist;
            deltaY = Math.sin(angle) * maxDist;
        }
        
        // Update knob visual position
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        }
        
        // Calculate normalized input (-1 to 1)
        const deadzone = 0.15;
        let normalizedX = deltaX / maxDist;
        let normalizedY = deltaY / maxDist;
        const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        
        // Apply deadzone
        if (magnitude < deadzone) {
            normalizedX = 0;
            normalizedY = 0;
        } else {
            // Scale to account for deadzone
            const adjustedMagnitude = (magnitude - deadzone) / (1 - deadzone);
            const ratio = adjustedMagnitude / magnitude;
            normalizedX *= ratio;
            normalizedY *= ratio;
        }
        
        // Update input state
        this.inputState.direction.x = normalizedX;
        this.inputState.direction.y = normalizedY;
        
        // Debug log for troubleshooting (only log if movement detected)
        if (this.config.debugInput && (normalizedX !== 0 || normalizedY !== 0)) {
            console.log(`🕹️ Joystick: (${normalizedX.toFixed(2)}, ${normalizedY.toFixed(2)})`);
        }
        
        // Update last movement direction for shield facing
        if (normalizedX !== 0 || normalizedY !== 0) {
            this.inputState.lastMovementDirection.x = normalizedX;
            this.inputState.lastMovementDirection.y = normalizedY;
        }
        
        // Note: We don't queue for WASM here - main.js reads our inputState
        // and sends to WASM in sync with the game loop
    }
    
    /**
     * Handle joystick release
     */
    handleJoystickEnd() {
        this.joystickState.active = false;
        this.joystickState.touchId = null;
        
        // Reset knob visual position
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = 'translate(-50%, -50%)';
        }
        
        // Remove visual feedback
        const joystickBase = document.getElementById('joystick-base');
        if (joystickBase) {
            joystickBase.classList.remove('active');
        }
        
        // Reset movement input
        this.inputState.direction.x = 0;
        this.inputState.direction.y = 0;
        
        // Note: main.js reads our inputState and sends to WASM
    }
    
    /**
     * Handle action button touch
     */
    handleActionButtonTouch(button, pressed) {
        const action = button.dataset.action;
        if (!action) return;
        
        // Map action to input action
        const actionMap = {
            'lightAttack': 'light-attack',
            'heavyAttack': 'heavy-attack',
            'block': 'block',
            'roll': 'roll',
            'special': 'special'
        };
        
        const inputAction = actionMap[action];
        if (inputAction) {
            this.handleInputAction(inputAction, pressed);
            
            // Visual feedback
            if (pressed) {
                button.classList.add('pressed');
                // Haptic feedback if available
                if (navigator.vibrate) {
                    const vibrationMap = {
                        'lightAttack': 20,
                        'heavyAttack': 40,
                        'special': 60,
                        'block': 15,
                        'roll': 30
                    };
                    navigator.vibrate(vibrationMap[action] || 20);
                }
            } else {
                button.classList.remove('pressed');
            }
        }
    }
    
    /**
     * Setup gamepad input handling
     */
    setupGamepadInput() {
        // Import and initialize gamepad manager
        import('../input/gamepad-manager.js').then(({ GamepadManager }) => {
            this.gamepadManager = new GamepadManager(this);
            console.log('🎮 Gamepad manager integrated');
        }).catch(err => {
            console.warn('⚠️ Failed to load gamepad manager:', err);
        });
    }
    
    /**
     * Handle input action with validation and processing
     */
    handleInputAction(action, isPressed) {
        if (this.config.debugInput) {
            console.log(`🎮 Input: ${action} = ${isPressed}`);
        }
        
        // Validate input using the input validator
        const validation = this.validator.validateInputAction(action, isPressed);
        if (!validation.valid) {
            if (this.config.debugInput) {
                console.warn(`⚠️ Input rejected: ${validation.reason}`);
            }
            return;
        }
        
        // Use validated and sanitized input
        action = validation.action;
        isPressed = validation.isPressed;
        
        // Track individual key states for movement
        if (!this.keyStates) {
            this.keyStates = {
                up: false,
                down: false,
                left: false,
                right: false
            };
        }
        
        // Update input state based on action
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
        }
        
        // Update last movement direction for shield facing
        if (this.inputState.direction.x !== 0 || this.inputState.direction.y !== 0) {
            this.inputState.lastMovementDirection.x = this.inputState.direction.x;
            this.inputState.lastMovementDirection.y = this.inputState.direction.y;
        }
        
        // Note: main.js reads our inputState and sends to WASM
    }
    
    /**
     * Update direction based on all currently pressed movement keys
     */
    updateDirectionFromKeyStates() {
        // Calculate direction based on which keys are currently pressed
        let x = 0;
        let y = 0;
        
        if (this.keyStates.left) {
            x -= 1;
        }
        if (this.keyStates.right) {
            x += 1;
        }
        if (this.keyStates.up) {
            y -= 1;
        }
        if (this.keyStates.down) {
            y += 1;
        }
        
        // Normalize diagonal movement to prevent faster diagonal speed
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        this.inputState.direction.x = x;
        this.inputState.direction.y = y;
        
        // Debug log for movement (only when changed and debug enabled)
        if (this.config.debugInput && (x !== 0 || y !== 0)) {
            console.log(`🎮 Movement: (${x.toFixed(2)}, ${y.toFixed(2)}) - Keys: U:${this.keyStates.up} D:${this.keyStates.down} L:${this.keyStates.left} R:${this.keyStates.right}`);
        }
    }
    
    /**
     * Queue input for synchronized sending to WASM
     */
    queueInputForWasm() {
        const now = performance.now();
        
        // Add current input state to queue with timestamp
        this.syncState.inputQueue.push({
            timestamp: now,
            state: { ...this.inputState }
        });
        
        // Limit queue size to prevent memory issues
        if (this.syncState.inputQueue.length > 60) { // ~1 second at 60fps
            this.syncState.inputQueue.shift();
        }
        
        // Send immediately if WASM is ready
        if (this.syncState.wasmReady) {
            this.flushInputQueue();
        }
    }
    
    /**
     * Add input to buffer for responsive controls
     */
    addToInputBuffer(action) {
        this.inputState.inputBuffer.set(action, performance.now());
        
        // Clean old buffer entries
        const cutoff = performance.now() - this.config.bufferDuration;
        for (const [key, timestamp] of this.inputState.inputBuffer) {
            if (timestamp < cutoff) {
                this.inputState.inputBuffer.delete(key);
            }
        }
    }
    
    /**
     * Check if action is in input buffer (for responsive controls)
     */
    isInInputBuffer(action) {
        const timestamp = this.inputState.inputBuffer.get(action);
        if (!timestamp) {
            return false;
        }
        
        return (performance.now() - timestamp) <= this.config.bufferDuration;
    }
    
    /**
     * Flush queued inputs to WASM
     */
    flushInputQueue() {
        if (!this.wasmManager || !this.wasmManager.exports) {
            this.syncState.wasmReady = false;
            return;
        }
        
        // Validate WASM exports
        if (typeof this.wasmManager.exports.set_player_input !== 'function') {
            console.warn('⚠️ WASM set_player_input function not available');
            this.syncState.wasmReady = false;
            return;
        }
        
        // Process all queued inputs
        while (this.syncState.inputQueue.length > 0) {
            const queuedInput = this.syncState.inputQueue.shift();
            this.sendInputStateToWasm(queuedInput.state);
        }
        
        this.syncState.lastWasmUpdate = performance.now();
    }
    
    /**
     * Send specific input state to WASM with validation
     */
    sendInputStateToWasm(inputState) {
        try {
            // Validate input before sending to WASM
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
                console.warn('⚠️ WASM input validation failed:', validation.reason);
                return;
            }
            
            // Debug log for mobile joystick input
            if (this.config.debugInput && (validation.inputX !== 0 || validation.inputY !== 0)) {
                console.log(`📡 Sending to WASM: dir=(${validation.inputX.toFixed(2)}, ${validation.inputY.toFixed(2)})`);
            }
            
            // Send validated input to WASM
            this.wasmManager.exports.set_player_input(
                validation.inputX,
                validation.inputY,
                validation.isRolling,
                validation.isJumping,
                validation.lightAttack,
                validation.heavyAttack,
                validation.isBlocking,
                validation.special
            );
            
            // Send blocking direction if blocking
            if (this.wasmManager.exports.set_blocking && validation.isBlocking) {
                this.wasmManager.exports.set_blocking(
                    1,
                    inputState.lastMovementDirection.x,
                    inputState.lastMovementDirection.y,
                    performance.now() / 1000
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to send input to WASM:', error);
            this.syncState.wasmReady = false;
        }
    }
    
    /**
     * Send current input state to WASM (legacy compatibility)
     */
    sendInputToWasm() {
        this.queueInputForWasm();
        if (this.syncState.wasmReady) {
            this.flushInputQueue();
        }
    }
    
    /**
     * Start input update loop
     */
    startInputLoop() {
        const updateInput = () => {
            // Check WASM readiness
            this.checkWasmReadiness();
            
            // Update gamepad input if available
            if (this.gamepadManager) {
                // Gamepad manager will update our input state directly
            }
            
            // Derive 5-action outputs from 3-button adapter each frame
            try {
                const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                const derived = this._threeBtn.update({
                    leftHandDown: this.inputState.leftHand,
                    rightHandDown: this.inputState.rightHand,
                    specialDown: this.inputState.special3,
                    moveX: this.inputState.direction.x,
                    moveY: this.inputState.direction.y,
                    nowMs
                });

                // Merge with any direct toggles, respecting adapter precedence
                this.inputState.lightAttack = Boolean(this.inputState.lightAttack || derived.lightAttack);
                this.inputState.heavyAttack = Boolean(this.inputState.heavyAttack || derived.heavyAttack);
                this.inputState.block = Boolean(this.inputState.block || derived.block);

                if (derived.roll) {
                    this.inputState.roll = true;
                    this.inputState.special = false;
                } else if (derived.special) {
                    this.inputState.special = true;
                }
            } catch (_) {
                // Adapter errors are non-fatal
            }
            
            // NOTE: We intentionally DO NOT flush inputs here because main.js
            // game loop calls applyInput() which reads our inputState and sends
            // to WASM in sync with the game update. Auto-flushing here would
            // cause double-sends and timing issues.
            // 
            // The inputState is the source of truth that main.js reads from.
            
            // Continue loop (save ID for cleanup)
            this.animationFrameId = requestAnimationFrame(updateInput);
        };
        
        updateInput();
    }
    
    /**
     * Check if WASM is ready to receive inputs
     */
    checkWasmReadiness() {
        const wasReady = this.syncState.wasmReady;
        
        this.syncState.wasmReady = !!(
            this.wasmManager &&
            this.wasmManager.exports &&
            typeof this.wasmManager.exports.set_player_input === 'function'
        );
        
        // Log state changes and clear inputs when WASM becomes ready
        if (!wasReady && this.syncState.wasmReady) {
            console.log('✅ WASM input system ready');
            // Clear inputs when WASM becomes ready to ensure clean state
            this.clearAllInputs();
        } else if (wasReady && !this.syncState.wasmReady) {
            console.warn('⚠️ WASM input system not ready');
        }
    }
    
    /**
     * Clear all input states (used on focus loss)
     */
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
        
        // Clear key states as well
        if (this.keyStates) {
            this.keyStates.up = false;
            this.keyStates.down = false;
            this.keyStates.left = false;
            this.keyStates.right = false;
        }
        
        // Clear the input buffer as well
        this.inputState.inputBuffer.clear();
        
        // Send cleared state to WASM only if ready
        if (this.syncState.wasmReady) {
            this.sendInputToWasm();
            
            // Also explicitly clear blocking state if the function exists
            if (this.wasmManager?.exports?.set_blocking) {
                try {
                    this.wasmManager.exports.set_blocking(0, 0, 0);
                } catch (e) {
                    console.warn('Failed to clear blocking state:', e);
                }
            }
        }
    }
    
    /**
     * Detect if running on mobile device
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    }
    
    /**
     * Add event listener with cleanup tracking
     */
    addEventListenerWithCleanup(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Get current input state (for debugging and external access)
     */
    getInputState() {
        return { ...this.inputState };
    }
    
    /**
     * Set custom key mapping
     */
    setKeyMapping(key, action) {
        this.keyMappings.set(key, action);
    }
    
    /**
     * Enable/disable debug logging
     */
    setDebugMode(enabled) {
        this.config.debugInput = enabled;
    }
    
    /**
     * Cleanup - remove all event listeners
     */
    destroy() {
        console.log('🎮 Cleaning up Unified Input Manager...');
        
        // Cancel animation frame loop to prevent memory leak
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove all event listeners
        for (const { target, event, handler, options } of this.eventListeners) {
            target.removeEventListener(event, handler, options);
        }
        this.eventListeners = [];
        
        // Cleanup gamepad manager
        if (this.gamepadManager) {
            this.gamepadManager.destroy();
            this.gamepadManager = null;
        }
        
        // Clear input state
        this.clearAllInputs();
        
        console.log('✅ Unified Input Manager cleaned up');
    }
}
