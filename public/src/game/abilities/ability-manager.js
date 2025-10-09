/**
 * Ability Manager - Coordinates character-specific abilities
 * WASM-First Architecture: Ability logic in C++, this only routes to correct ability handler
 */

import { WardenAbilities } from './warden-abilities.js';
import { RaiderAbilities } from './raider-abilities.js';
import { KenseiAbilities } from './kensei-abilities.js';
import { ProgressionManager } from '../progression/progression-manager.js';

// Character type constants (should match WASM enum)
export const CHARACTER_TYPE = {
    WARDEN: 0,
    RAIDER: 1,
    KENSEI: 2
};

export class AbilityManager {
    constructor(wasmModule, vfxManager, characterType = CHARACTER_TYPE.WARDEN, progression = null) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        this.characterType = characterType;
        this.abilityHandler = null;
        this.progression = progression;
        
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
                this.abilityHandler = new RaiderAbilities(this.wasm, this.vfx);
                console.log('⚔️ Initialized Raider abilities');
                break;
                
            case CHARACTER_TYPE.KENSEI:
                this.abilityHandler = new KenseiAbilities(this.wasm, this.vfx);
                console.log('🗡️ Initialized Kensei abilities');
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
    
    /**
     * Optional: Provide progression scalar lookup for abilities
     */
    getUpgradeScalar(effectKey) {
        if (!this.progression) return 0;
        const classId = this.characterType === CHARACTER_TYPE.WARDEN ? 'warden'
                       : this.characterType === CHARACTER_TYPE.RAIDER ? 'raider'
                       : 'kensei';
        try {
            return this.progression.getEffectScalar(classId, effectKey) || 0;
        } catch {
            return 0;
        }
    }
}

