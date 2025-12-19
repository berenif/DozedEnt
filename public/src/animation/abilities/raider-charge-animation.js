/**
 * Raider Berserker Charge Animation
 * Handles visual effects for Raider's unstoppable forward rush
 */

export class RaiderChargeAnimation {
    constructor(wasmModule, vfxManager) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        
        // Animation state
        this.isCharging = false;
        this.chargeDuration = 0;
        this.targetHitFlash = 0;
        
        // Visual properties
        this.trailParticles = [];
        this.impactRings = [];
        this.chargeGlow = 0;
    }
    
    /**
     * Start charge animation
     */
    startCharge() {
        this.isCharging = true;
        this.chargeDuration = 0;
        this.chargeGlow = 0;
        this.trailParticles = [];
        
        console.log('🎬 Started berserker charge animation');
    }
    
    /**
     * Update charge animation
     * @param {number} duration - Current charge duration
     * @param {number} targetsHit - Targets hit so far
     * @param {number} speedMultiplier - Current speed multiplier
     * @param {number} dt - Delta time
     */
    updateCharge(duration, targetsHit, speedMultiplier, dt) {
        this.chargeDuration = duration;
        
        // Increase glow over time
        this.chargeGlow = Math.min(1.0, this.chargeGlow + dt * 2.0);
        
        // Spawn trail particles based on speed
        if (Math.random() < speedMultiplier * 0.5) {
            this.spawnTrailParticle();
        }
        
        // Update existing particles
        this.updateParticles(dt);
        
        // Flash effect when hitting targets
        if (this.targetHitFlash > 0) {
            this.targetHitFlash -= dt * 5.0;
        }
    }
    
    /**
     * Handle target hit (trigger impact effects)
     */
    onTargetHit() {
        this.targetHitFlash = 1.0;
        this.spawnImpactRing();
        
        // Spawn burst of particles
        for (let i = 0; i < 5; i++) {
            this.spawnImpactParticle();
        }
        
        console.log('💥 Berserker hit target - spawning impact effects');
    }
    
    /**
     * End charge animation
     * @param {number} totalHits - Total targets hit
     */
    endCharge(totalHits) {
        this.isCharging = false;
        this.chargeGlow = 0;
        
        // Spawn finisher effect if hit multiple targets
        if (totalHits >= 3) {
            this.spawnFinisherEffect();
        }
        
        console.log('🎬 Ended berserker charge animation');
    }
    
    /**
     * Cancel charge animation early
     */
    cancelCharge() {
        this.isCharging = false;
        this.chargeGlow = 0;
        this.trailParticles = [];
        
        console.log('🎬 Cancelled berserker charge animation');
    }
    
    /**
     * Render charge effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (!this.isCharging && this.trailParticles.length === 0) {
            return;
        }
        
        // Get player position from WASM
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        const screenX = (playerX - camera.x) * camera.scale;
        const screenY = (playerY - camera.y) * camera.scale;
        
        // Draw charge glow
        if (this.isCharging) {
            ctx.save();
            ctx.globalAlpha = this.chargeGlow * 0.5;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 40 * this.chargeGlow, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw trail particles
        ctx.save();
        for (const particle of this.trailParticles) {
            const px = (particle.x - camera.x) * camera.scale;
            const py = (particle.y - camera.y) * camera.scale;
            
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Draw impact rings
        ctx.save();
        for (const ring of this.impactRings) {
            const rx = (ring.x - camera.x) * camera.scale;
            const ry = (ring.y - camera.y) * camera.scale;
            
            ctx.globalAlpha = ring.life;
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(rx, ry, ring.radius * (1 - ring.life) * 50, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw target hit flash
        if (this.targetHitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.targetHitFlash * 0.3;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }
    
    // ========================================
    // Particle System
    // ========================================
    
    /**
     * Spawn trail particle
     */
    spawnTrailParticle() {
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        this.trailParticles.push({
            x: playerX + (Math.random() - 0.5) * 0.05,
            y: playerY + (Math.random() - 0.5) * 0.05,
            size: 5 + Math.random() * 5,
            color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00',
            life: 1.0
        });
        
        // Limit particle count
        if (this.trailParticles.length > 50) {
            this.trailParticles.shift();
        }
    }
    
    /**
     * Spawn impact particle
     */
    spawnImpactParticle() {
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.1;
        
        this.trailParticles.push({
            x: playerX,
            y: playerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 8 + Math.random() * 4,
            color: '#ffaa00',
            life: 1.0
        });
    }
    
    /**
     * Spawn impact ring effect
     */
    spawnImpactRing() {
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        this.impactRings.push({
            x: playerX,
            y: playerY,
            radius: 1.0,
            life: 1.0
        });
        
        // Limit ring count
        if (this.impactRings.length > 10) {
            this.impactRings.shift();
        }
    }
    
    /**
     * Spawn finisher effect (3+ hits)
     */
    spawnFinisherEffect() {
        console.log('🎆 Spawning berserker finisher effect!');
        
        // Spawn burst of particles
        for (let i = 0; i < 20; i++) {
            this.spawnImpactParticle();
        }
        
        // Spawn multiple rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.spawnImpactRing(), i * 100);
        }
    }
    
    /**
     * Update all particles
     * @param {number} dt - Delta time
     */
    updateParticles(dt) {
        // Update trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const particle = this.trailParticles[i];
            
            // Update position with velocity
            if (typeof particle.vx !== 'undefined') {
                particle.x += particle.vx * dt;
                particle.y += particle.vy * dt;
            }
            
            // Fade out
            particle.life -= dt * 2.0;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Update impact rings
        for (let i = this.impactRings.length - 1; i >= 0; i--) {
            const ring = this.impactRings[i];
            
            ring.life -= dt * 3.0;
            
            if (ring.life <= 0) {
                this.impactRings.splice(i, 1);
            }
        }
    }
}

