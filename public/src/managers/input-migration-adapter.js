/**
 * Input Migration Adapter - Provides backward compatibility
 * Allows existing code to work with the new UnifiedInputManager
 * Gradually migrate old input manager usage to the new system
 */

import { UnifiedInputManager } from './unified-input-manager.js';

/**
 * Legacy Input Manager Adapter
 * Provides the same API as the old input managers for compatibility
 */
export class LegacyInputManagerAdapter {
    constructor(wasmManager) {
        // Create the unified input manager
        this.unifiedManager = new UnifiedInputManager(wasmManager);
        
        // Expose legacy properties for backward compatibility
        this.wasmManager = wasmManager;
        this.gamepadManager = null; // Will be set by unified manager
        this.inputState = this.unifiedManager.inputState;
        this.lastMovementDirection = this.unifiedManager.inputState.lastMovementDirection;
        
        console.log('🔄 Legacy Input Manager Adapter initialized');
    }
    
    // Legacy method compatibility
    init() {
        // Already initialized in constructor
        return this;
    }
    
    setupKeyboardInput() {
        // Handled by unified manager
        console.warn('⚠️ setupKeyboardInput() is deprecated - handled automatically');
    }
    
    setupMouseInput() {
        // Handled by unified manager
        console.warn('⚠️ setupMouseInput() is deprecated - handled automatically');
    }
    
    setupTouchInput() {
        // Handled by unified manager
        console.warn('⚠️ setupTouchInput() is deprecated - handled automatically');
    }
    
    setupGamepadInput() {
        // Handled by unified manager
        console.warn('⚠️ setupGamepadInput() is deprecated - handled automatically');
    }
    
    startInputLoop() {
        // Handled by unified manager
        console.warn('⚠️ startInputLoop() is deprecated - handled automatically');
    }
    
    sendInputToWasm() {
        return this.unifiedManager.sendInputToWasm();
    }
    
    getInputState() {
        return this.unifiedManager.getInputState();
    }
    
    clearAllInputs() {
        return this.unifiedManager.clearAllInputs();
    }
    
    detectMobileDevice() {
        return this.unifiedManager.detectMobileDevice();
    }
    
    updateConfig(config) {
        return this.unifiedManager.updateConfig(config);
    }
    
    setDebugMode(enabled) {
        return this.unifiedManager.setDebugMode(enabled);
    }
    
    destroy() {
        return this.unifiedManager.destroy();
    }
    
    // Legacy properties that some code might access
    get isMobile() {
        return this.unifiedManager.isMobile;
    }
    
    get hasTouch() {
        return this.unifiedManager.hasTouch;
    }
    
    get hasGamepad() {
        return this.unifiedManager.hasGamepad;
    }
    
    get config() {
        return this.unifiedManager.config;
    }
    
    // Forward gamepad manager when it's ready
    setGamepadManager(gamepadManager) {
        this.gamepadManager = gamepadManager;
        this.unifiedManager.gamepadManager = gamepadManager;
    }
}

/**
 * Factory function to create the appropriate input manager
 * Use this to gradually migrate from old to new system
 */
export function createInputManager(wasmManager, options = {}) {
    const { useLegacyAdapter = true, debugMode = false } = options;
    
    if (useLegacyAdapter) {
        console.log('🔄 Creating legacy-compatible input manager');
        const adapter = new LegacyInputManagerAdapter(wasmManager);
        if (debugMode) {
            adapter.setDebugMode(true);
        }
        return adapter;
    } else {
        console.log('✨ Creating unified input manager');
        const manager = new UnifiedInputManager(wasmManager);
        if (debugMode) {
            manager.setDebugMode(true);
        }
        return manager;
    }
}

/**
 * Migration helper to update existing input manager usage
 */
export class InputMigrationHelper {
    static migrateGameStateManager(gameStateManager) {
        if (!gameStateManager.inputManager) {
            console.warn('⚠️ No input manager found in GameStateManager');
            return;
        }
        
        // Replace old input manager with adapter
        const oldManager = gameStateManager.inputManager;
        const newManager = new LegacyInputManagerAdapter(gameStateManager.wasmManager);
        
        // Copy over any custom configuration
        if (oldManager.config) {
            newManager.updateConfig(oldManager.config);
        }
        
        // Clean up old manager
        if (typeof oldManager.destroy === 'function') {
            oldManager.destroy();
        }
        
        // Replace with new manager
        gameStateManager.inputManager = newManager;
        
        console.log('✅ GameStateManager input manager migrated');
    }
    
    static migrateAnimatedPlayer(animatedPlayer) {
        // Update AnimatedPlayer to use external input management
        if (animatedPlayer && typeof animatedPlayer.update === 'function') {
            // Set flag to indicate external input management
            globalThis.wasmInputManagedExternally = true;
            console.log('✅ AnimatedPlayer configured for external input management');
        }
    }
    
    static validateMigration() {
        const issues = [];
        
        // Check for duplicate input managers
        const inputManagers = document.querySelectorAll('[data-input-manager]');
        if (inputManagers.length > 1) {
            issues.push(`Found ${inputManagers.length} input managers - should be only 1`);
        }
        
        // Check for conflicting event listeners
        const keyListeners = document.querySelectorAll('[data-key-listener]');
        if (keyListeners.length > 1) {
            issues.push(`Found ${keyListeners.length} key listeners - potential conflicts`);
        }
        
        // Check WASM input function availability
        if (globalThis.wasmExports && !globalThis.wasmExports.set_player_input) {
            issues.push('WASM set_player_input function not available');
        }
        
        if (issues.length === 0) {
            console.log('✅ Input system migration validation passed');
            return { valid: true, issues: [] };
        } else {
            console.warn('⚠️ Input system migration issues found:', issues);
            return { valid: false, issues };
        }
    }
}

/**
 * Global migration function for easy use in console
 */
if (typeof window !== 'undefined') {
    window.migrateInputSystem = function() {
        console.log('🚀 Starting input system migration...');
        
        // Find and migrate game state manager
        if (window.gameStateManager) {
            InputMigrationHelper.migrateGameStateManager(window.gameStateManager);
        }
        
        // Find and migrate animated player
        if (window.animatedPlayer) {
            InputMigrationHelper.migrateAnimatedPlayer(window.animatedPlayer);
        }
        
        // Validate migration
        const validation = InputMigrationHelper.validateMigration();
        
        if (validation.valid) {
            console.log('✅ Input system migration completed successfully');
        } else {
            console.error('❌ Input system migration completed with issues:', validation.issues);
        }
        
        return validation;
    };
}
