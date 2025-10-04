/**
 * Ability Manager - Coordinates character-specific abilities
 * WASM-First Architecture: Ability logic in C++, this only routes to correct ability handler
 */

import { WardenAbilities } from './warden-abilities.js';

// Character type constants (should match WASM enum)
export const CHARACTER_TYPE = {
    WARDEN: 0,
    RAIDER: 1,
    KENSEI: 2
};

export class AbilityManager {
    constructor(wasmModule, vfxManager, characterType = CHARACTER_TYPE.WARDEN) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        this.characterType = characterType;
        this.abilityHandler = null;
        
        this.initializeAbilities();
    }
    
    /**
     * Initialize character-specific ability handler
     */
    initializeAbilities() {
        switch (this.characterType) {
            case CHARACTER_TYPE.WARDEN:
                this.abilityHandler = new WardenAbilities(this.wasm, this.vfx);
                console.log('🛡️ Initialized Warden abilities');
                break;
                
            case CHARACTER_TYPE.RAIDER:
                // TODO Week 2: RaiderAbilities
                console.log('⚔️ Raider abilities not yet implemented');
                this.abilityHandler = null;
                break;
                
            case CHARACTER_TYPE.KENSEI:
                // TODO Week 3: KenseiAbilities
                console.log('🗡️ Kensei abilities not yet implemented');
                this.abilityHandler = null;
                break;
                
            default:
                console.warn('⚠️ Unknown character type:', this.characterType);
                this.abilityHandler = null;
        }
    }
    
    /**
     * Update abilities (called every frame from main game loop)
     * @param {number} dt - Delta time in seconds
     * @param {Object} input - Input state
     */
    update(dt, input) {
        if (this.abilityHandler) {
            this.abilityHandler.update(dt, input);
        }
    }
    
    /**
     * Render ability visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (this.abilityHandler && this.abilityHandler.render) {
            this.abilityHandler.render(ctx, camera);
        }
    }
    
    /**
     * Change character type and reinitialize abilities
     * @param {number} newCharacterType
     */
    setCharacterType(newCharacterType) {
        if (this.characterType !== newCharacterType) {
            this.characterType = newCharacterType;
            this.initializeAbilities();
        }
    }
    
    /**
     * Get current ability handler (for debugging)
     * @returns {Object|null}
     */
    getAbilityHandler() {
        return this.abilityHandler;
    }
}

