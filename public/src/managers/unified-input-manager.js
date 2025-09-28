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
            
            // 5-button combat system (boolean states)
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
            
            // 5-button combat system
            ['KeyJ', 'light-attack'],    // J/1: Light Attack
            ['Digit1', 'light-attack'],
            ['KeyK', 'heavy-attack'],    // K/2: Heavy Attack
            ['Digit2', 'heavy-attack'],
            ['KeyL', 'special'],         // L/5: Special Attack
            ['Digit5', 'special'],
            ['ShiftLeft', 'block'],      // Shift/3: Block/Parry
            ['ShiftRight', 'block'],
            ['Digit3', 'block'],
            ['ControlLeft', 'roll'],     // Ctrl/4: Roll
            ['ControlRight', 'roll'],
            ['Digit4', 'roll'],
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
        
        this.initialize();
    }
    
    /**
     * Initialize the unified input system
     */
    initialize() {
        console.log('🎮 Initializing Unified Input Manager...');
        
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
        // Touch controls will be implemented based on UI requirements
        // For now, basic touch-to-move functionality
        
        const handleTouchStart = (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this.inputState.pointer.x = touch.clientX;
            this.inputState.pointer.y = touch.clientY;
            this.inputState.pointer.down = true;
        };
        
        const handleTouchEnd = (event) => {
            event.preventDefault();
            this.inputState.pointer.down = false;
        };
        
        const handleTouchMove = (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this.inputState.pointer.x = touch.clientX;
            this.inputState.pointer.y = touch.clientY;
        };
        
        this.addEventListenerWithCleanup(document, 'touchstart', handleTouchStart, { passive: false });
        this.addEventListenerWithCleanup(document, 'touchend', handleTouchEnd, { passive: false });
        this.addEventListenerWithCleanup(document, 'touchmove', handleTouchMove, { passive: false });
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
        
        // Update input state based on action
        switch (action) {
            case 'move-up':
                this.inputState.direction.y = isPressed ? -1 : 0;
                break;
            case 'move-down':
                this.inputState.direction.y = isPressed ? 1 : 0;
                break;
            case 'move-left':
                this.inputState.direction.x = isPressed ? -1 : 0;
                break;
            case 'move-right':
                this.inputState.direction.x = isPressed ? 1 : 0;
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
        
        // Queue input for synchronized sending to WASM
        this.queueInputForWasm();
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
            
            // Process queued inputs if WASM is ready
            if (this.syncState.wasmReady && this.syncState.inputQueue.length > 0) {
                this.flushInputQueue();
            }
            
            // Continue loop
            requestAnimationFrame(updateInput);
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
        
        // Log state changes
        if (!wasReady && this.syncState.wasmReady) {
            console.log('✅ WASM input system ready');
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
        
        // Send cleared state to WASM
        this.sendInputToWasm();
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
