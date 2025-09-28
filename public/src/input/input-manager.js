/**
 * Input Manager - Unified input system for desktop and mobile
 * Handles keyboard, mouse, touch, and gamepad input
 * Following WASM-first architecture - all input flows through WASM
 */

export class InputManager {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.gamepadManager = null;
        
        // Device detection
        this.isMobile = this.detectMobileDevice();
        this.hasTouch = 'ontouchstart' in window;
        this.hasGamepad = 'getGamepads' in navigator;
        
        // Input state
        this.inputState = {
            // Movement
            direction: { x: 0, y: 0 },
            
            // 5-button combat system
            lightAttack: false,    // A1 - J or 1
            heavyAttack: false,    // A2 - K or 2  
            block: false,          // Block - Shift or 3
            roll: false,           // Roll - Ctrl/Space or 4
            special: false,        // Special - L or 5
            
            // Mouse/touch state
            pointer: { x: 0, y: 0, down: false },
            facing: { x: 0, y: 0 },
            
            // Gamepad state
            gamepadIndex: -1,
            gamepadDeadzone: 0.15
        };
        
        // Track last movement direction for shield facing
        this.lastMovementDirection = { x: 1, y: 0 }; // Default to facing right
        
        // Key mappings
        this.keyMappings = {
            // Movement (WASD + Arrow keys)
            movement: {
                'KeyW': { axis: 'y', value: 1 },
                'KeyA': { axis: 'x', value: -1 },
                'KeyS': { axis: 'y', value: -1 },
                'KeyD': { axis: 'x', value: 1 },
                'ArrowUp': { axis: 'y', value: 1 },
                'ArrowLeft': { axis: 'x', value: -1 },
                'ArrowDown': { axis: 'y', value: -1 },
                'ArrowRight': { axis: 'x', value: 1 }
            },
            
            // Combat actions
            combat: {
                'KeyJ': 'lightAttack',      // A1 - Light Attack
                'Digit1': 'lightAttack',
                'KeyK': 'heavyAttack',      // A2 - Heavy Attack  
                'Digit2': 'heavyAttack',
                'ShiftLeft': 'block',       // Block
                'ShiftRight': 'block',
                'Digit3': 'block',
                'ControlLeft': 'roll',      // Roll
                'ControlRight': 'roll',
                'Space': 'roll',            // Legacy roll
                'Digit4': 'roll',
                'KeyL': 'special',          // Special
                'Digit5': 'special'
            }
        };
        
        // Touch controls state
        this.touchState = {
            joystick: {
                active: false,
                center: { x: 0, y: 0 },
                current: { x: 0, y: 0 },
                maxDistance: 50
            },
            touches: new Map()
        };
        
        this.init();
    }
    
    /**
     * Initialize input system
     */
  init() {
    this.setupKeyboardInput();
    this.setupMouseInput();
        
        if (this.hasTouch) {
            this.setupTouchInput();
        }
        
        if (this.hasGamepad) {
            this.setupGamepadInput();
        }
        
        // Show appropriate controls
        this.updateControlsDisplay();
        
    // Clear stuck inputs when window loses focus (prevents latched block)
    window.addEventListener('blur', () => {
      try {
        this.inputState.lightAttack = false;
        this.inputState.heavyAttack = false;
        this.inputState.block = false;
        this.inputState.roll = false;
        this.inputState.special = false;
        this.inputState.pointer.down = false;
        this.resetMovementInput();
      } catch (_) { /* ignore */ }
    });

    // Start input update loop
    this.startInputLoop();
        
        console.log(`Input Manager initialized - Mobile: ${this.isMobile}, Touch: ${this.hasTouch}, Gamepad: ${this.hasGamepad}`);
    }
    
    /**
     * Detect if running on mobile device
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }
    
    /**
     * Setup keyboard input handlers
     */
    setupKeyboardInput() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
        
        // Prevent context menu on right click for better gaming experience
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    /**
     * Setup mouse input handlers
     */
    setupMouseInput() {
        document.addEventListener('mousedown', (event) => {
            this.handleMouseDown(event);
        });
        
        document.addEventListener('mouseup', (event) => {
            this.handleMouseUp(event);
        });
        
        document.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        // Mouse wheel for future use
        document.addEventListener('wheel', (event) => {
            this.handleMouseWheel(event);
        }, { passive: false });
    }
    
    /**
     * Setup touch input handlers
     */
    setupTouchInput() {
        // Prevent default touch behaviors
        document.addEventListener('touchstart', (event) => {
            if (event.target.closest('.mobile-controls')) {
                event.preventDefault();
            }
            this.handleTouchStart(event);
        }, { passive: false });
        
        document.addEventListener('touchmove', (event) => {
            if (event.target.closest('.mobile-controls')) {
                event.preventDefault();
            }
            this.handleTouchMove(event);
        }, { passive: false });
        
        document.addEventListener('touchend', (event) => {
            this.handleTouchEnd(event);
        });
        
        document.addEventListener('touchcancel', (event) => {
            this.handleTouchEnd(event);
        });
    }
    
    /**
     * Setup gamepad input handlers
     */
    setupGamepadInput() {
        // Import and initialize GamepadManager
        import('./gamepad-manager.js').then(({ GamepadManager }) => {
            this.gamepadManager = new GamepadManager(this);
            console.log('GamepadManager integrated with InputManager');
        }).catch(err => {
            console.warn('Failed to load GamepadManager:', err);
            // Fallback to basic gamepad support
            this.setupBasicGamepadInput();
        });
    }
    
    /**
     * Fallback basic gamepad input
     */
    setupBasicGamepadInput() {
        window.addEventListener('gamepadconnected', (event) => {
            console.log('Gamepad connected:', event.gamepad.id);
            this.inputState.gamepadIndex = event.gamepad.index;
            this.updateControlsDisplay();
        });
        
        window.addEventListener('gamepaddisconnected', (event) => {
            console.log('Gamepad disconnected:', event.gamepad.id);
            if (this.inputState.gamepadIndex === event.gamepad.index) {
                this.inputState.gamepadIndex = -1;
            }
            this.updateControlsDisplay();
        });
    }
    
    /**
     * Handle keyboard key down
     */
    handleKeyDown(event) {
        // Prevent default for game keys
        const gameKeys = Object.keys({...this.keyMappings.movement, ...this.keyMappings.combat});
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
        }
        
        // Handle movement - accumulate multiple keys instead of overwriting
        if (this.keyMappings.movement[event.code]) {
            const mapping = this.keyMappings.movement[event.code];
            // Add to existing value instead of overwriting
            this.inputState.direction[mapping.axis] += mapping.value;
            // Clamp to [-1, 1] range
            this.inputState.direction[mapping.axis] = Math.max(-1, Math.min(1, this.inputState.direction[mapping.axis]));
        }
        
        // Handle combat
        if (this.keyMappings.combat[event.code]) {
            const action = this.keyMappings.combat[event.code];
            this.inputState[action] = true;
        }
        
        // Special keys
        if (event.code === 'Escape') {
            this.handleEscapeKey();
        }
    }
    
    /**
     * Handle keyboard key up
     */
    handleKeyUp(event) {
        // Handle movement - subtract the key value instead of resetting
        if (this.keyMappings.movement[event.code]) {
            const mapping = this.keyMappings.movement[event.code];
            // Subtract the key value from the current direction
            this.inputState.direction[mapping.axis] -= mapping.value;
            // Clamp to [-1, 1] range
            this.inputState.direction[mapping.axis] = Math.max(-1, Math.min(1, this.inputState.direction[mapping.axis]));
        }
        
        // Handle combat
        if (this.keyMappings.combat[event.code]) {
            const action = this.keyMappings.combat[event.code];
            this.inputState[action] = false;
        }
    }
    
    /**
     * Handle mouse down
     */
    handleMouseDown(event) {
        this.inputState.pointer.down = true;
        
        // Map mouse buttons to actions
        switch (event.button) {
            case 0: // Left click - Light attack
                this.inputState.lightAttack = true;
                break;
            case 1: // Middle click - Special
                this.inputState.special = true;
                event.preventDefault();
                break;
            case 2: // Right click - Block
                this.inputState.block = true;
                break;
        }
    }
    
    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        this.inputState.pointer.down = false;
        
        switch (event.button) {
            case 0: // Left click
                this.inputState.lightAttack = false;
                break;
            case 1: // Middle click
                this.inputState.special = false;
                break;
            case 2: // Right click
                this.inputState.block = false;
                break;
        }
    }
    
    /**
     * Handle mouse move
     */
    handleMouseMove(event) {
        this.inputState.pointer.x = event.clientX;
        this.inputState.pointer.y = event.clientY;
        
        // Update facing direction based on mouse position
        const canvas = document.getElementById('demo-canvas') || document.getElementById('gameCanvas');
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
     * Handle mouse wheel
     */
    handleMouseWheel(event) {
        // Future use for weapon switching or camera zoom
        event.preventDefault();
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        for (const touch of event.changedTouches) {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Handle joystick
            if (element && element.closest('#joystick')) {
                this.handleJoystickStart(touch);
            }
            
            // Handle action buttons
            else if (element && element.classList.contains('action-btn')) {
                this.handleActionButtonPress(element, true);
            }
            
            this.touchState.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                element: element
            });
        }
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        for (const touch of event.changedTouches) {
            const touchData = this.touchState.touches.get(touch.identifier);
            if (!touchData) continue;
            
            // Handle joystick movement
            if (touchData.element && touchData.element.closest('#joystick')) {
                this.handleJoystickMove(touch);
            }
            
            // Update touch position
            touchData.x = touch.clientX;
            touchData.y = touch.clientY;
        }
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        for (const touch of event.changedTouches) {
            const touchData = this.touchState.touches.get(touch.identifier);
            if (!touchData) continue;
            
            // Handle joystick release
            if (touchData.element && touchData.element.closest('#joystick')) {
                this.handleJoystickEnd();
            }
            
            // Handle action button release
            else if (touchData.element && touchData.element.classList.contains('action-btn')) {
                this.handleActionButtonPress(touchData.element, false);
            }
            
            this.touchState.touches.delete(touch.identifier);
        }
    }
    
    /**
     * Handle joystick start
     */
    handleJoystickStart(touch) {
        const joystick = document.getElementById('joystick-base');
        const rect = joystick.getBoundingClientRect();
        
        this.touchState.joystick.active = true;
        this.touchState.joystick.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        this.touchState.joystick.maxDistance = rect.width / 2 - 20; // Leave some margin
        
        this.handleJoystickMove(touch);
    }
    
    /**
     * Handle joystick movement
     */
    handleJoystickMove(touch) {
        if (!this.touchState.joystick.active) return;
        
        const center = this.touchState.joystick.center;
        const maxDist = this.touchState.joystick.maxDistance;
        
        let deltaX = touch.clientX - center.x;
        let deltaY = touch.clientY - center.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Clamp to max distance
        if (distance > maxDist) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDist;
            deltaY = Math.sin(angle) * maxDist;
        }
        
        // Update knob position
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        }
        
        // Update input state
        if (distance > 10) { // Dead zone
            this.inputState.direction.x = deltaX / maxDist;
            this.inputState.direction.y = deltaY / maxDist;
        } else {
            this.inputState.direction.x = 0;
            this.inputState.direction.y = 0;
        }
    }
    
    /**
     * Handle joystick end
     */
    handleJoystickEnd() {
        this.touchState.joystick.active = false;
        
        // Reset knob position
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = 'translate(-50%, -50%)';
        }
        
        // Reset movement
        this.inputState.direction.x = 0;
        this.inputState.direction.y = 0;
    }
    
    /**
     * Handle action button press/release
     */
    handleActionButtonPress(element, pressed) {
        const action = element.dataset.action || element.id.replace('Btn', '').replace('-button', '');
        
        // Map button actions to input state
        const actionMap = {
            'roll': 'roll',
            'attack': 'lightAttack',  // Legacy mapping
            'lightAttack': 'lightAttack',
            'heavyAttack': 'heavyAttack',
            'block': 'block',
            'special': 'special'
        };
        
        const inputAction = actionMap[action];
        if (inputAction && Object.prototype.hasOwnProperty.call(this.inputState, inputAction)) {
            this.inputState[inputAction] = pressed;
            
            // Visual feedback
            if (pressed) {
                element.style.transform = 'scale(0.95)';
                element.style.background = 'rgba(255, 255, 255, 0.3)';
            } else {
                element.style.transform = '';
                element.style.background = '';
            }
        }
    }
    
    /**
     * Update gamepad input
     */
    updateGamepadInput() {
        // Enhanced gamepad input is handled by GamepadManager's internal polling
        // No need to manually update as it has its own requestAnimationFrame loop
        if (this.gamepadManager) return;
        
        // Fallback to basic gamepad input
        if (this.inputState.gamepadIndex === -1) return;
        
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.inputState.gamepadIndex];
        if (!gamepad) return;
        
        const deadzone = this.inputState.gamepadDeadzone;
        
        // Left stick for movement
        const leftX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
        const leftY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
        
        this.inputState.direction.x = leftX;
        this.inputState.direction.y = leftY;
        
        // Buttons (Xbox controller layout)
        this.inputState.lightAttack = gamepad.buttons[0].pressed;  // A button
        this.inputState.heavyAttack = gamepad.buttons[1].pressed;  // B button
        this.inputState.special = gamepad.buttons[2].pressed;      // X button
        this.inputState.roll = gamepad.buttons[3].pressed;         // Y button
        this.inputState.block = gamepad.buttons[4].pressed ||      // Left bumper
                               gamepad.buttons[5].pressed;         // Right bumper
    }
    
    /**
     * Handle escape key
     */
    handleEscapeKey() {
        // Dispatch custom event for game to handle
        window.dispatchEvent(new CustomEvent('gameEscape'));
    }
    
    /**
     * Update controls display based on available input methods
     */
    updateControlsDisplay() {
        const mobileControls = document.querySelector('.mobile-controls');
        const controlsTip = document.getElementById('controls-tip');
        
        if (this.isMobile || this.hasTouch) {
            // Show mobile controls
            if (mobileControls) mobileControls.style.display = 'block';
            if (controlsTip) controlsTip.style.display = 'none';
        } else {
            // Show desktop controls tip
            if (mobileControls) mobileControls.style.display = 'none';
            if (controlsTip) {
                controlsTip.style.display = 'block';
                
                // Update tip based on gamepad presence
                if (this.inputState.gamepadIndex !== -1 || (this.gamepadManager && this.gamepadManager.getConnectedCount() > 0)) {
                    controlsTip.textContent = 'Left stick to move • A/B/X/Y for combat • Bumpers to block';
                } else {
                    controlsTip.textContent = 'WASD to move • J/K for attacks • L for special • Shift to block • Space/Ctrl to roll';
                }
            }
        }
    }
    
    /**
     * Start input update loop
     */
    startInputLoop() {
        const updateInput = () => {
            // Allow disabling gamepad via feature flag for debugging
            try {
                const flags = (window.DZ && typeof window.DZ.flags === 'function') ? window.DZ.flags() : null;
                const disableGamepad = flags && !!flags.disableGamepad;
                if (!disableGamepad) {
                    this.updateGamepadInput();
                } else {
                    // When disabled, ensure gamepad-only toggles are cleared
                    this.inputState.block = false;
                    this.inputState.roll = false;
                }
            } catch (_) {
                this.updateGamepadInput();
            }
            // Input is now sent to WASM via GameStateManager.update()
            // this.sendInputToWasm(); // Disabled to prevent duplicate input
            requestAnimationFrame(updateInput);
        };
        
        updateInput();
    }
    
    /**
     * Send input state to WASM
     */
    sendInputToWasm() {
        if (!this.wasmManager || !this.wasmManager.exports) return;
        
        // Update last movement direction for shield facing
        if (this.inputState.direction.x !== 0 || this.inputState.direction.y !== 0) {
            this.lastMovementDirection.x = this.inputState.direction.x;
            this.lastMovementDirection.y = this.inputState.direction.y;
        }
        
        // Send input to WASM using the 5-button combat system
        if (this.wasmManager.exports.set_player_input) {
            this.wasmManager.exports.set_player_input(
                this.inputState.direction.x,
                this.inputState.direction.y,
                this.inputState.roll ? 1 : 0,
                0, // Jump (not used in current system)
                this.inputState.lightAttack ? 1 : 0,
                this.inputState.heavyAttack ? 1 : 0,
                this.inputState.block ? 1 : 0,
                this.inputState.special ? 1 : 0
            );
        }
        
        // Send facing direction for blocking - use last movement direction
        if (this.wasmManager.exports.set_blocking && this.inputState.block) {
            this.wasmManager.exports.set_blocking(
                1,
                this.lastMovementDirection.x,
                this.lastMovementDirection.y,
                performance.now() / 1000
            );
        }
    }
    
    /**
     * Get current input state (for debugging)
     */
    getInputState() {
        return { ...this.inputState };
    }
    
    /**
     * Reset input state for frame-based actions
     * This should be called after each frame to clear actions that shouldn't persist
     */
    resetFrameInput() {
        // Reset frame-based actions (not movement, which is state-based)
        this.inputState.lightAttack = false;
        this.inputState.heavyAttack = false;
        this.inputState.block = false;
        this.inputState.roll = false;
        this.inputState.special = false;
        
        // Reset pointer state
        this.inputState.pointer.down = false;
    }
    
    /**
     * Reset movement input to zero
     * This should be called when no movement keys are pressed
     */
    resetMovementInput() {
        this.inputState.direction.x = 0;
        this.inputState.direction.y = 0;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Cleanup gamepad manager
        if (this.gamepadManager) {
            this.gamepadManager.destroy();
            this.gamepadManager = null;
        }
        
        // Remove all event listeners
        // Note: In a real implementation, you'd want to store references to the handlers
        // and remove them properly to avoid memory leaks
        console.log('InputManager destroyed');
    }
}
