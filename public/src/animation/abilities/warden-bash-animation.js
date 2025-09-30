/**
 * WardenBashAnimation - Complete visual effects for shoulder bash
 * Implements:
 * - Charge glow effect
 * - Charge particle management
 * - Impact VFX coordination
 * - Camera effect triggers
 * - Hit effect management
 */

import { AbilityAnimationBase } from './ability-animation-base.js';

export class WardenBashAnimation extends AbilityAnimationBase {
    constructor(wasmModule, vfxManager) {
        super(null, vfxManager);
        
        this.wasm = wasmModule;
        this.charging = false;
        this.chargeLevel = 0;
        this.particleSystem = vfxManager.particles;
        this.cameraEffects = vfxManager.camera;
        
        // Glow effect
        this.chargeGlow = {
            radius: 0,
            alpha: 0
        };
        
        // Track last spawn time for particle throttling
        this.lastChargeParticleTime = 0;
        this.chargeParticleInterval = 0.05; // Spawn every 50ms
    }
    
    /**
     * Start charging animation
     */
    startCharging() {
        this.charging = true;
        this.chargeLevel = 0;
    }
    
    /**
     * Update charge level
     * @param {number} level - Charge level (0-1)
     * @param {number} deltaTime - Time delta
     */
    updateChargeLevel(level, deltaTime) {
        this.chargeLevel = level;
        
        // Spawn charge particles based on level
        if (level > 0.3) {
            this.lastChargeParticleTime += deltaTime;
            
            if (this.lastChargeParticleTime >= this.chargeParticleInterval) {
                this.spawnChargeParticles(level);
                this.lastChargeParticleTime = 0;
            }
        }
        
        // Update glow effect
        this.chargeGlow.radius = 30 * level;
        this.chargeGlow.alpha = level * 0.5;
        
        // Camera shake at max charge
        if (level >= 1.0 && this.cameraEffects) {
            this.cameraEffects.shake(0.5, 0.1);
        }
    }
    
    /**
     * Execute bash animation
     */
    executeBash() {
        this.charging = false;
        this.play('bash_execute', 0.6, false);
        
        // Spawn impact effect
        this.spawnImpactEffect();
    }
    
    /**
     * Update active bash
     * @param {number} targetsHit - Number of targets hit
     */
    updateBashActive(targetsHit) {
        // Spawn additional effects for each hit
        if (targetsHit > 0) {
            this.spawnHitEffect(targetsHit);
        }
    }
    
    /**
     * Spawn charge particles
     */
    spawnChargeParticles(level) {
        // Get player position from WASM
        const playerX = this.wasm?.exports?.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm?.exports?.get_y ? this.wasm.exports.get_y() : 0.5;
        
        if (this.particleSystem) {
            this.particleSystem.spawnChargeParticles(playerX, playerY, level);
        }
    }
    
    /**
     * Spawn impact effect
     */
    spawnImpactEffect() {
        const playerX = this.wasm?.exports?.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm?.exports?.get_y ? this.wasm.exports.get_y() : 0.5;
        
        // Get charge level for impact force
        const force = this.chargeLevel;
        
        if (this.particleSystem) {
            // Spawn shockwave
            this.particleSystem.spawnImpactShockwave(playerX, playerY, force);
            
            // Spawn sparks
            this.particleSystem.spawnHitSparks(playerX, playerY, 20);
        }
        
        // Camera effects
        if (this.cameraEffects) {
            this.cameraEffects.shake(3.0 * force, 0.3);
            this.cameraEffects.zoom(1.2, 0.1);
            
            // Reset zoom after delay
            setTimeout(() => {
                if (this.cameraEffects) {
                    this.cameraEffects.zoom(1.0, 0.3);
                }
            }, 100);
        }
    }
    
    /**
     * Spawn hit effect for each target
     */
    spawnHitEffect(count) {
        // Additional effects for multi-hit
        if (count > 1 && this.cameraEffects) {
            this.cameraEffects.shake(1.5, 0.2);
        }
    }
    
    /**
     * Render charge glow
     */
    renderChargeGlow(ctx, camera) {
        if (this.chargeGlow.alpha <= 0) {
            return;
        }
        
        const playerX = this.wasm?.exports?.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm?.exports?.get_y ? this.wasm.exports.get_y() : 0.5;
        
        // Convert to screen coordinates
        const screenX = (playerX - camera.x) * camera.scale + camera.width / 2;
        const screenY = (playerY - camera.y) * camera.scale + camera.height / 2;
        
        // Draw glow
        ctx.save();
        ctx.globalAlpha = this.chargeGlow.alpha;
        ctx.fillStyle = '#ffaa00';
        ctx.filter = 'blur(10px)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.chargeGlow.radius * camera.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    /**
     * Render animation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        // Render charge glow
        if (this.charging) {
            this.renderChargeGlow(ctx, camera);
        }
    }
    
    /**
     * Update animation
     * @param {number} deltaTime - Time delta
     */
    update(deltaTime) {
        const t = this.updateTiming(deltaTime);
        
        // Additional per-frame updates if needed
        // (particles and camera are updated separately)
    }
}

