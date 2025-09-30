/**
 * Warden Shoulder Bash Ability
 * WASM-First Architecture: All logic in C++, JS handles only visuals and input
 */

import { WardenBashAnimation } from '../../animation/abilities/warden-bash-animation.js';

export class WardenAbilities {
    constructor(wasmModule, vfxManager) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        this.bashCharging = false;
        this.chargeStartTime = 0;
        this.lastChargeLevel = 0;
        
        // Create bash animation controller
        this.bashAnimation = new WardenBashAnimation(wasmModule, vfxManager);
    }
    
    /**
     * Update ability state (called every frame)
     * @param {number} dt - Delta time in seconds
     * @param {Object} input - Input state {special: boolean, ...}
     */
    update(dt, input) {
        if (!this.wasm.exports) {
            return;
        }
        
        // Start charging bash
        if (input.special && !this.bashCharging) {
            this.startCharging();
        }
        
        // Release bash
        if (!input.special && this.bashCharging) {
            this.releaseBash();
        }
        
        // Update charge animation
        if (this.bashCharging) {
            this.updateChargeEffect(dt);
        }
        
        // Update active bash (visual feedback only)
        if (this.isActive()) {
            this.updateActiveBash(dt);
        }
    }
    
    /**
     * Start charging the bash ability
     */
    startCharging() {
        if (!this.wasm.exports.start_charging_bash) {
            console.warn('⚠️ Bash ability not available in WASM');
            return;
        }
        
        this.wasm.exports.start_charging_bash();
        this.bashCharging = true;
        this.chargeStartTime = performance.now();
        this.lastChargeLevel = 0;
        
        // Start charge animation
        this.bashAnimation.startCharging();
        
        console.log('🛡️ Warden: Started charging bash');
    }
    
    /**
     * Release and execute the bash
     */
    releaseBash() {
        if (!this.wasm.exports.release_bash) {
            return;
        }
        
        const chargeLevel = this.getChargeLevel();
        this.wasm.exports.release_bash();
        this.bashCharging = false;
        
        console.log(`🛡️ Warden: Released bash at ${Math.floor(chargeLevel * 100)}% charge`);
        
        // Spawn impact effect (visual only)
        this.onBashExecute(chargeLevel);
    }
    
    /**
     * Update charge visual effects
     * @param {number} dt - Delta time
     */
    updateChargeEffect(dt) {
        const chargeLevel = this.getChargeLevel();
        
        // Update animation with current charge level
        this.bashAnimation.updateChargeLevel(chargeLevel, dt);
        
        // Only update visuals when charge level changes significantly
        if (Math.abs(chargeLevel - this.lastChargeLevel) > 0.05) {
            this.lastChargeLevel = chargeLevel;
            
            // Visual feedback scales with charge
            if (chargeLevel >= 1.0) {
                // Max charge reached - visual indicator
                if (Math.floor(performance.now() / 100) % 2 === 0) {
                    console.log('⚡ MAX CHARGE');
                }
            }
        }
    }
    
    /**
     * Handle bash execution (visual effects only)
     * @param {number} chargeLevel - Charge level 0-1
     */
    onBashExecute(chargeLevel) {
        // Execute bash animation with VFX
        this.bashAnimation.executeBash();
        
        console.log(`💥 Bash executed with ${Math.floor(chargeLevel * 100)}% charge`);
    }
    
    /**
     * Update active bash state (visual only)
     * @param {number} dt - Delta time
     */
    updateActiveBash(dt) {
        const targetsHit = this.getTargetsHit();
        
        // Update bash animation with hit count
        this.bashAnimation.updateBashActive(targetsHit);
    }
    
    /**
     * Render ability visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (this.bashAnimation) {
            this.bashAnimation.render(ctx, camera);
        }
    }
    
    // ========================================
    // WASM Query Methods (Read-Only)
    // ========================================
    
    /**
     * Get current charge level (0-1)
     * @returns {number}
     */
    getChargeLevel() {
        if (!this.wasm.exports.get_bash_charge_level) {
            return 0;
        }
        return this.wasm.exports.get_bash_charge_level();
    }
    
    /**
     * Check if bash is currently active
     * @returns {boolean}
     */
    isActive() {
        if (!this.wasm.exports.is_bash_active) {
            return false;
        }
        return this.wasm.exports.is_bash_active() === 1;
    }
    
    /**
     * Check if currently charging bash
     * @returns {boolean}
     */
    isCharging() {
        if (!this.wasm.exports.is_bash_charging) {
            return false;
        }
        return this.wasm.exports.is_bash_charging() === 1;
    }
    
    /**
     * Get number of targets hit by bash
     * @returns {number}
     */
    getTargetsHit() {
        if (!this.wasm.exports.get_bash_targets_hit) {
            return 0;
        }
        return this.wasm.exports.get_bash_targets_hit();
    }
    
    /**
     * Get player facing direction
     * @returns {{x: number, y: number}}
     */
    getFacing() {
        if (!this.wasm.exports.get_facing_x || !this.wasm.exports.get_facing_y) {
            return { x: 1, y: 0 };
        }
        return {
            x: this.wasm.exports.get_facing_x(),
            y: this.wasm.exports.get_facing_y()
        };
    }
}

