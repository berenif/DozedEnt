/**
 * Integration Example - How to use the new Input System
 * This file demonstrates how to integrate the enhanced input system
 * with the existing game architecture following WASM-first principles
 */

/* global MobileGameControls */

import { InputManager } from './input-manager.js';

/**
 * Example integration with the main game system
 */
export class GameInputIntegration {
    constructor(wasmManager, gameStateManager) {
        this.wasmManager = wasmManager;
        this.gameStateManager = gameStateManager;
        this.inputManager = null;
        this.mobileControls = null;
        
        this.init();
    }
    
    /**
     * Initialize the input system
     */
    init() {
        // Initialize the unified input manager
        this.inputManager = new InputManager(this.wasmManager);
        
        // Initialize mobile controls with input manager integration
        if (typeof MobileGameControls !== 'undefined') {
            this.mobileControls = new MobileGameControls(this.inputManager);
        }
        
        // Set up input event handlers
        this.setupInputHandlers();
        
        console.log('Game Input Integration initialized');
    }
    
    /**
     * Set up custom input event handlers
     */
    setupInputHandlers() {
        // Handle escape/pause events
        window.addEventListener('gameEscape', () => {
            this.handleEscapeInput();
        });
        
        // Handle game canvas resize for input coordinate mapping
        window.addEventListener('gameCanvasResize', (event) => {
            this.handleCanvasResize(event.detail.canvas);
        });
        
        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }
    
    /**
     * Handle escape/pause input
     */
    handleEscapeInput() {
        if (this.gameStateManager.isGameRunning) {
            if (this.gameStateManager.isPaused) {
                this.gameStateManager.resumeGame();
            } else {
                this.gameStateManager.pauseGame();
            }
        }
    }
    
    /**
     * Handle canvas resize for input coordinate mapping
     */
    handleCanvasResize(_canvas) {
        // Update input manager with new canvas dimensions
        if (this.inputManager) {
            // The input manager will automatically adapt to the new canvas size
            console.log('Canvas resized, input system adapting');
        }
    }
    
    /**
     * Handle device orientation change
     */
    handleOrientationChange() {
        // Update mobile controls layout
        if (this.mobileControls) {
            this.mobileControls.resizeCanvas();
        }
        
        // Update input manager display
        if (this.inputManager) {
            this.inputManager.updateControlsDisplay();
        }
        
        // Show/hide orientation overlay if needed
        this.updateOrientationOverlay();
    }
    
    /**
     * Update orientation overlay visibility
     */
    updateOrientationOverlay() {
        const orientationOverlay = document.getElementById('orientation-overlay');
        if (!orientationOverlay) {return;}
        
        const isMobile = this.inputManager.isMobile;
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Show overlay on mobile portrait mode
        if (isMobile && isPortrait && window.innerWidth < 768) {
            orientationOverlay.style.display = 'flex';
        } else {
            orientationOverlay.style.display = 'none';
        }
    }
    
    /**
     * Get current input state for debugging
     */
    getInputState() {
        return this.inputManager ? this.inputManager.getInputState() : null;
    }
    
    /**
     * Update input system (called from main game loop)
     */
    update() {
        // The input manager automatically updates through its internal loop
        // This method can be used for any additional input processing
        
        
        // Example: Update input-based UI elements
        this.updateInputUI();
    }
    
    
    /**
     * Update input-based UI elements
     */
    updateInputUI() {
        if (!this.inputManager) {return;}
        
        const inputState = this.inputManager.getInputState();
        
        // Update action button states for visual feedback
        this.updateActionButtonStates(inputState);
        
        // Update movement indicator
        this.updateMovementIndicator(inputState.direction);
        
        // Update gamepad status
        this.updateGamepadStatus();
    }
    
    /**
     * Update action button visual states
     */
    updateActionButtonStates(inputState) {
        const actions = ['lightAttack', 'heavyAttack', 'special', 'block', 'roll'];
        
        actions.forEach(action => {
            const button = document.querySelector(`[data-action="${action}"]`);
            if (button) {
                if (inputState[action]) {
                    button.classList.add('pressed');
                } else {
                    button.classList.remove('pressed');
                }
            }
        });
    }
    
    /**
     * Update movement indicator
     */
    updateMovementIndicator(direction) {
        const joystickKnob = document.getElementById('joystick-knob');
        if (joystickKnob && (direction.x !== 0 || direction.y !== 0)) {
            // Visual feedback for keyboard/gamepad movement
            const maxOffset = 30; // Maximum visual offset
            const offsetX = direction.x * maxOffset;
            const offsetY = direction.y * maxOffset;
            
            joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        }
    }
    
    /**
     * Update gamepad connection status
     */
    updateGamepadStatus() {
        const gamepadCount = this.inputManager.gamepadManager ? 
                           this.inputManager.gamepadManager.getConnectedCount() : 0;
        
        // Update debug HUD with gamepad info
        const debugHud = document.getElementById('debug-hud');
        if (debugHud && gamepadCount > 0) {
            const gamepadInfo = document.getElementById('gamepad-info') || 
                              document.createElement('div');
            gamepadInfo.id = 'gamepad-info';
            gamepadInfo.textContent = `🎮 ${gamepadCount} controller(s) connected`;
            
            if (!gamepadInfo.parentNode) {
                debugHud.appendChild(gamepadInfo);
            }
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.inputManager) {
            this.inputManager.destroy();
            this.inputManager = null;
        }
        
        if (this.mobileControls) {
            // Cleanup mobile controls if they have a destroy method
            if (typeof this.mobileControls.destroy === 'function') {
                this.mobileControls.destroy();
            }
            this.mobileControls = null;
        }
        
        // Remove event listeners
        window.removeEventListener('gameEscape', this.handleEscapeInput);
        window.removeEventListener('gameCanvasResize', this.handleCanvasResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        console.log('Game Input Integration destroyed');
    }
}

/**
 * Usage example in main game initialization:
 * 
 * // In your main game file (e.g., site.js):
 * import { GameInputIntegration } from './src/input/integration-example.js';
 * 
 * // After initializing WASM and game state managers:
 * const inputIntegration = new GameInputIntegration(wasmManager, gameStateManager);
 * 
 * // In your game loop:
 * function gameLoop() {
 *     inputIntegration.update();
 *     // ... rest of game loop
 *     requestAnimationFrame(gameLoop);
 * }
 * 
 * // For cleanup:
 * window.addEventListener('beforeunload', () => {
 *     inputIntegration.destroy();
 * });
 */
