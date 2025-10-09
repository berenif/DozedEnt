/**
 * Kensei Flow Dash Ability
 * WASM-First Architecture: All logic in C++, JS handles only visuals and input
 * 
 * Features:
 * - Instant teleport dash with i-frames
 * - Multi-target chain dashing (up to 3 combos)
 * - Reduced stamina cost per combo level
 * - Stamina restoration on hit
 * - Can cancel into another dash immediately on hit
 */

import { KenseiDashAnimation } from '../../animation/abilities/kensei-dash-animation.js';

export class KenseiAbilities {
    constructor(wasmModule, vfxManager) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        this.dashActive = false;
        this.lastComboLevel = 0;
        this.dashStartPos = { x: 0, y: 0 };
        
        // Create dash animation controller
        try {
            this.dashAnimation = new KenseiDashAnimation(wasmModule, vfxManager);
        } catch (error) {
            console.warn('⚠️ KenseiDashAnimation not yet implemented:', error);
            this.dashAnimation = null;
        }
    }
    
    /**
     * Update ability state (called every frame)
     * @param {number} dt - Delta time in seconds
     * @param {Object} input - Input state {special: boolean, dirX: number, dirY: number, ...}
     */
    update(dt, input) {
        if (!this.wasm.exports) {
            return;
        }
        
        // Execute flow dash
        if (input.special && !this.dashActive) {
            this.startDash(input.dirX, input.dirY);
        }
        
        // Update active dash (visual feedback)
        if (this.isActive()) {
            this.updateActiveDash(dt);
        } else if (this.dashActive) {
            // Dash ended
            this.onDashEnd();
        }
    }
    
    /**
     * Start the flow dash
     * @param {number} dirX - Direction X (-1 to 1)
     * @param {number} dirY - Direction Y (-1 to 1)
     */
    startDash(dirX = 0, dirY = 0) {
        if (!this.wasm.exports.execute_flow_dash) {
            console.warn('⚠️ Flow dash not available in WASM');
            return;
        }
        
        // Check if player has enough stamina
        if (this.wasm.exports.get_stamina && this.wasm.exports.get_stamina() < 0.15) {
            console.log('🗡️ Not enough stamina for dash!');
            return;
        }
        
        // Store start position for animation
        this.dashStartPos = {
            x: this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5,
            y: this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5
        };
        
        // Execute dash in WASM
        this.wasm.exports.execute_flow_dash(dirX, dirY);
        this.dashActive = true;
        this.lastComboLevel = this.getComboLevel();
        
        // Start dash animation
        if (this.dashAnimation) {
            const endPos = {
                x: this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5,
                y: this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5
            };
            this.dashAnimation.startDash(this.dashStartPos, endPos, this.lastComboLevel);
        }
        
        console.log(`🗡️ Kensei: Flow dash executed! (Combo: ${this.lastComboLevel})`);
    }
    
    /**
     * Cancel dash early (not typically used for flow dash)
     */
    cancelDash() {
        if (!this.wasm.exports.cancel_flow_dash) {
            return;
        }
        
        this.wasm.exports.cancel_flow_dash();
        this.dashActive = false;
        
        console.log('🗡️ Kensei: Dash cancelled');
        
        if (this.dashAnimation) {
            this.dashAnimation.cancelDash();
        }
    }
    
    /**
     * Update active dash visual effects
     * @param {number} dt - Delta time
     */
    updateActiveDash(dt) {
        const duration = this.getDashDuration();
        const progress = this.getDashProgress();
        const comboLevel = this.getComboLevel();
        const isInvulnerable = this.isInvulnerable();
        
        // Update animation with current state
        if (this.dashAnimation) {
            this.dashAnimation.updateDash(progress, comboLevel, isInvulnerable, dt);
        }
        
        // Check if combo level increased (hit a target)
        if (comboLevel > this.lastComboLevel) {
            this.onTargetHit(comboLevel);
            this.lastComboLevel = comboLevel;
        }
    }
    
    /**
     * Handle target hit during dash (visual effects only)
     * @param {number} comboLevel - Current combo level
     */
    onTargetHit(comboLevel) {
        console.log(`⚡ Kensei hit target! Combo level: ${comboLevel}`);
        
        if (this.dashAnimation) {
            this.dashAnimation.onTargetHit(comboLevel);
        }
        
        // Spawn slash effect
        if (this.vfx && this.vfx.spawnSlashEffect) {
            this.vfx.spawnSlashEffect({
                type: 'flow_dash_slash',
                combo: comboLevel,
                intensity: Math.min(comboLevel / 3, 1.0)
            });
        }
    }
    
    /**
     * Handle dash ending (visual cleanup)
     */
    onDashEnd() {
        this.dashActive = false;
        const finalCombo = this.lastComboLevel;
        
        console.log(`🗡️ Kensei: Dash ended. Final combo: ${finalCombo}`);
        
        if (this.dashAnimation) {
            this.dashAnimation.endDash(finalCombo);
        }
        
        // Spawn finisher effect if 3-combo achieved
        if (finalCombo >= 3) {
            this.spawnFinisherEffect();
        }
    }
    
    /**
     * Spawn finisher effect for max combo
     */
    spawnFinisherEffect() {
        console.log('🎆 FLOW STATE ACHIEVED - MAX COMBO!');
        
        if (this.dashAnimation) {
            this.dashAnimation.spawnFinisherEffect();
        }
    }
    
    /**
     * Render ability visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (this.dashAnimation && this.dashAnimation.render) {
            this.dashAnimation.render(ctx, camera);
        }
    }
    
    // ========================================
    // WASM Query Methods (Read-Only)
    // ========================================
    
    /**
     * Check if dash is currently active
     * @returns {boolean}
     */
    isActive() {
        if (!this.wasm.exports.is_flow_dash_active) {
            return false;
        }
        return this.wasm.exports.is_flow_dash_active() === 1;
    }
    
    /**
     * Get dash duration remaining (seconds)
     * @returns {number}
     */
    getDashDuration() {
        if (!this.wasm.exports.get_flow_dash_duration) {
            return 0;
        }
        return this.wasm.exports.get_flow_dash_duration();
    }
    
    /**
     * Get current combo level (0-3)
     * @returns {number}
     */
    getComboLevel() {
        if (!this.wasm.exports.get_flow_dash_combo_level) {
            return 0;
        }
        return this.wasm.exports.get_flow_dash_combo_level();
    }
    
    /**
     * Get dash animation progress (0-1)
     * @returns {number}
     */
    getDashProgress() {
        if (!this.wasm.exports.get_dash_progress) {
            return 0;
        }
        return this.wasm.exports.get_dash_progress();
    }
    
    /**
     * Check if player is invulnerable (i-frames)
     * @returns {boolean}
     */
    isInvulnerable() {
        if (!this.wasm.exports.is_dash_invulnerable) {
            return false;
        }
        return this.wasm.exports.is_dash_invulnerable() === 1;
    }
    
    /**
     * Check if dash can be cancelled into another dash
     * @returns {boolean}
     */
    canCancel() {
        if (!this.wasm.exports.can_dash_cancel) {
            return false;
        }
        return this.wasm.exports.can_dash_cancel() === 1;
    }
}

