/**
 * Raider Berserker Charge Ability
 * WASM-First Architecture: All logic in C++, JS handles only visuals and input
 * 
 * Features:
 * - Unstoppable forward rush
 * - Increased attack speed during charge
 * - Damages/knockbacks all enemies in path
 * - Consumes stamina over time
 * - Can be cancelled early
 */

import { RaiderChargeAnimation } from '../../animation/abilities/raider-charge-animation.js';

export class RaiderAbilities {
    constructor(wasmModule, vfxManager) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        this.chargeActive = false;
        this.chargeStartTime = 0;
        this.lastTargetsHit = 0;
        
        // Create charge animation controller
        try {
            this.chargeAnimation = new RaiderChargeAnimation(wasmModule, vfxManager);
        } catch (error) {
            console.warn('⚠️ RaiderChargeAnimation not yet implemented:', error);
            this.chargeAnimation = null;
        }
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
        
        // Start berserker charge
        if (input.special && !this.chargeActive) {
            this.startCharge();
        }
        
        // Cancel charge early
        if (input.roll && this.chargeActive) {
            this.cancelCharge();
        }
        
        // Update active charge (visual feedback)
        if (this.isActive()) {
            this.updateActiveCharge(dt);
        }
    }
    
    /**
     * Start the berserker charge
     */
    startCharge() {
        if (!this.wasm.exports.start_berserker_charge) {
            console.warn('⚠️ Berserker charge not available in WASM');
            return;
        }
        
        // Check if player has enough stamina
        if (this.wasm.exports.get_stamina && this.wasm.exports.get_stamina() < 0.3) {
            console.log('⚔️ Not enough stamina for charge!');
            return;
        }
        
        this.wasm.exports.start_berserker_charge();
        this.chargeActive = true;
        this.chargeStartTime = performance.now();
        this.lastTargetsHit = 0;
        
        // Start charge animation
        if (this.chargeAnimation) {
            this.chargeAnimation.startCharge();
        }
        
        console.log('⚔️ Raider: Berserker charge initiated!');
    }
    
    /**
     * Cancel charge early (at cost of remaining stamina)
     */
    cancelCharge() {
        if (!this.wasm.exports.cancel_berserker_charge) {
            return;
        }
        
        this.wasm.exports.cancel_berserker_charge();
        this.chargeActive = false;
        
        console.log('⚔️ Raider: Charge cancelled');
        
        if (this.chargeAnimation) {
            this.chargeAnimation.cancelCharge();
        }
    }
    
    /**
     * Update active charge visual effects
     * @param {number} dt - Delta time
     */
    updateActiveCharge(dt) {
        const duration = this.getChargeDuration();
        const targetsHit = this.getTargetsHit();
        const chargeSpeed = this.getChargeSpeed();
        
        // Update animation with current state
        if (this.chargeAnimation) {
            this.chargeAnimation.updateCharge(duration, targetsHit, chargeSpeed, dt);
        }
        
        // Visual feedback when hitting enemies
        if (targetsHit > this.lastTargetsHit) {
            this.onTargetHit(targetsHit);
            this.lastTargetsHit = targetsHit;
        }
        
        // Check if charge ended naturally
        if (!this.isActive() && this.chargeActive) {
            this.onChargeEnd();
        }
    }
    
    /**
     * Handle target hit during charge (visual effects only)
     * @param {number} totalHits - Total targets hit
     */
    onTargetHit(totalHits) {
        console.log(`💥 Raider hit target #${totalHits}!`);
        
        if (this.chargeAnimation) {
            this.chargeAnimation.onTargetHit();
        }
        
        // Spawn impact particles
        if (this.vfx && this.vfx.spawnImpactEffect) {
            this.vfx.spawnImpactEffect({
                type: 'berserker_hit',
                intensity: Math.min(totalHits / 5, 1.0)
            });
        }
    }
    
    /**
     * Handle charge ending (visual cleanup)
     */
    onChargeEnd() {
        this.chargeActive = false;
        const finalHits = this.lastTargetsHit;
        
        console.log(`⚔️ Raider: Charge ended. Total hits: ${finalHits}`);
        
        if (this.chargeAnimation) {
            this.chargeAnimation.endCharge(finalHits);
        }
    }
    
    /**
     * Render ability visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (this.chargeAnimation && this.chargeAnimation.render) {
            this.chargeAnimation.render(ctx, camera);
        }
    }
    
    // ========================================
    // WASM Query Methods (Read-Only)
    // ========================================
    
    /**
     * Check if charge is currently active
     * @returns {boolean}
     */
    isActive() {
        if (!this.wasm.exports.is_berserker_charge_active) {
            return false;
        }
        return this.wasm.exports.is_berserker_charge_active() === 1;
    }
    
    /**
     * Get charge duration (seconds)
     * @returns {number}
     */
    getChargeDuration() {
        if (!this.wasm.exports.get_berserker_charge_duration) {
            return 0;
        }
        return this.wasm.exports.get_berserker_charge_duration();
    }
    
    /**
     * Get number of targets hit during charge
     * @returns {number}
     */
    getTargetsHit() {
        if (!this.wasm.exports.get_berserker_targets_hit) {
            return 0;
        }
        return this.wasm.exports.get_berserker_targets_hit();
    }
    
    /**
     * Get current charge speed multiplier
     * @returns {number}
     */
    getChargeSpeed() {
        if (!this.wasm.exports.get_berserker_speed_multiplier) {
            return 1.0;
        }
        return this.wasm.exports.get_berserker_speed_multiplier();
    }
    
    /**
     * Get current charge direction
     * @returns {{x: number, y: number}}
     */
    getChargeDirection() {
        if (!this.wasm.exports.get_berserker_charge_dir_x || 
            !this.wasm.exports.get_berserker_charge_dir_y) {
            return { x: 1, y: 0 };
        }
        return {
            x: this.wasm.exports.get_berserker_charge_dir_x(),
            y: this.wasm.exports.get_berserker_charge_dir_y()
        };
    }
    
    /**
     * Check if charge is unstoppable (can't be interrupted)
     * @returns {boolean}
     */
    isUnstoppable() {
        if (!this.wasm.exports.is_berserker_unstoppable) {
            return false;
        }
        return this.wasm.exports.is_berserker_unstoppable() === 1;
    }
}

