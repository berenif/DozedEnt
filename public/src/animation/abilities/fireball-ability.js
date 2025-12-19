/**
 * FireballAbility - Ranged projectile ability
 * Implements:
 * - Charge-up animation with particle effects
 * - Projectile trajectory and impact
 * - Damage dealing and area effects
 * - Visual feedback and camera effects
 */

import { AbilityAnimationBase } from './ability-animation-base.js'

export class FireballAbility extends AbilityAnimationBase {
    constructor(wasmModule, vfxManager = {}) {
        super({ 
            duration: 0.8, 
            cooldown: 5.0, 
            staminaCost: 40,
            manaCost: 20,
            canMoveWhileCasting: false
        })
        this.wasm = wasmModule || null
        this.particleSystem = vfxManager.particles || null
        this.cameraEffects = vfxManager.camera || null
        this.audio = vfxManager.audio || null
        
        this.projectile = null
        this.chargeLevel = 0
        this.lastChargeParticleTime = 0
        this.chargeParticleInterval = 0.05
        this.chargeGlow = { radius: 0, alpha: 0 }
        this.impactSpawned = false
    }
    
    /**
     * Start charging fireball
     */
    onStart(player, _target) {
        // Play charge-up animation
        if (player.setState) {
            player.setState('chargingFireball');
        }
        
        // Visual effects
        this.spawnChargeParticles(player.position)
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('fireball_charge')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.1, 0.3)
        }
    }
    
    /**
     * Update fireball ability
     */
    onUpdate(deltaTime) {
        const progress = this.getProgress()
        
        // Increase charge level
        this.chargeLevel = Math.min(1, progress * 1.5)
        
        // Spawn charge particles
        if (this.player && this.shouldSpawnChargeParticle()) {
            this.spawnChargeParticles(this.player.position)
        }
        
        // Release projectile at 50% of animation
        if (progress >= 0.5 && !this.projectile) {
            this.releaseProjectile()
        }
        
        // Update projectile
        if (this.projectile) {
            this.projectile.update(deltaTime)
            
            // Check for impact
            if (this.projectile.hasImpacted) {
                this.handleImpact()
            }
        }
        
        // Update charge glow
        this.updateChargeGlow(progress)
    }
    
    /**
     * End fireball ability
     */
    onEnd() {
        // Return player to normal state
        if (this.player && this.player.setState) {
            this.player.setState('idle')
        }
        
        // Clean up projectile
        this.projectile = null
        this.impactSpawned = false
        
        // Audio
        if (this.audio && this.audio.stop) {
            this.audio.stop('fireball_charge')
        }
    }
    
    /**
     * Release the fireball projectile
     */
    releaseProjectile() {
        if (!this.player) {
            return;
        }
        
        const direction = this.getProjectileDirection();
        const startPos = this.getProjectileStartPosition();
        
        this.projectile = new FireballProjectile({
            position: startPos,
            direction: direction,
            speed: 500,
            damage: 60,
            chargeLevel: this.chargeLevel,
            particleSystem: this.particleSystem,
            audio: this.audio
        })
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('fireball_release')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.2, 0.2)
        }
    }
    
    /**
     * Handle projectile impact
     */
    handleImpact() {
        if (this.impactSpawned) {
            return;
        }
        this.impactSpawned = true;
        
        const impactPos = this.projectile.position
        
        // Spawn impact effects
        this.spawnImpactEffect(impactPos)
        
        // Deal damage to nearby enemies
        this.dealAreaDamage(impactPos)
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('fireball_explosion')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.3, 0.4)
        }
    }
    
    /**
     * Spawn charge particles
     */
    spawnChargeParticles(position) {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        this.particleSystem.spawn('fireball_charge', position, {
            count: 3,
            color: '#ff4400',
            size: 2 + this.chargeLevel * 3,
            lifetime: 0.3,
            velocity: { x: 0, y: 0 }
        })
        
        this.lastChargeParticleTime = Date.now()
    }
    
    /**
     * Spawn impact effect
     */
    spawnImpactEffect(position) {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        // Explosion effect
        this.particleSystem.spawn('explosion', position, {
            count: 20,
            color: '#ff0000',
            size: 4,
            lifetime: 0.5,
            velocity: { x: 0, y: 0 }
        })
        
        // Fire particles
        this.particleSystem.spawn('fire_particles', position, {
            count: 15,
            color: '#ff8800',
            size: 3,
            lifetime: 1.0,
            velocity: { x: 0, y: 0 }
        })
    }
    
    /**
     * Deal area damage
     */
    dealAreaDamage(position) {
        const radius = 80
        const damage = 60 * this.chargeLevel
        
        // This would integrate with the game's damage system
        if (this.wasm && this.wasm.deal_area_damage) {
            this.wasm.deal_area_damage(position.x, position.y, radius, damage)
        }
    }
    
    /**
     * Get projectile direction
     */
    getProjectileDirection() {
        if (this.target) {
            const dx = this.target.x - this.player.x
            const dy = this.target.y - this.player.y
            const distance = Math.hypot(dx, dy)
            return { x: dx / distance, y: dy / distance }
        }
        
        // Default direction based on player facing
        return { x: this.player.facing || 1, y: 0 }
    }
    
    /**
     * Get projectile start position
     */
    getProjectileStartPosition() {
        return {
            x: this.player.x + (this.player.facing || 1) * 20,
            y: this.player.y - 10
        }
    }
    
    /**
     * Check if should spawn charge particle
     */
    shouldSpawnChargeParticle() {
        return Date.now() - this.lastChargeParticleTime > this.chargeParticleInterval * 1000
    }
    
    /**
     * Update charge glow effect
     */
    updateChargeGlow(progress) {
        this.chargeGlow.radius = 10 + progress * 20
        this.chargeGlow.alpha = 0.3 + progress * 0.4
    }
    
    /**
     * Get current charge level
     */
    getChargeLevel() {
        return this.chargeLevel
    }
    
    /**
     * Get charge glow properties
     */
    getChargeGlow() {
        return this.chargeGlow
    }
}

/**
 * FireballProjectile - Projectile class for fireball ability
 */
class FireballProjectile {
    constructor(config) {
        this.position = { ...config.position }
        this.direction = { ...config.direction }
        this.speed = config.speed || 500
        this.damage = config.damage || 60
        this.chargeLevel = config.chargeLevel || 1
        this.particleSystem = config.particleSystem
        this.audio = config.audio
        
        this.velocity = {
            x: this.direction.x * this.speed,
            y: this.direction.y * this.speed
        }
        
        this.hasImpacted = false
        this.trailParticles = []
        this.lastTrailTime = 0
        this.trailInterval = 0.02
    }
    
    update(deltaTime) {
        if (this.hasImpacted) {
            return;
        }
        
        // Update position
        this.position.x += this.velocity.x * deltaTime
        this.position.y += this.velocity.y * deltaTime
        
        // Spawn trail particles
        if (this.shouldSpawnTrailParticle()) {
            this.spawnTrailParticle()
        }
        
        // Check for impact (simplified - would integrate with collision system)
        if (this.checkImpact()) {
            this.hasImpacted = true
        }
    }
    
    spawnTrailParticle() {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        this.particleSystem.spawn('fireball_trail', this.position, {
            count: 1,
            color: '#ff4400',
            size: 2,
            lifetime: 0.2,
            velocity: { x: 0, y: 0 }
        })
        
        this.lastTrailTime = Date.now()
    }
    
    shouldSpawnTrailParticle() {
        return Date.now() - this.lastTrailTime > this.trailInterval * 1000
    }
    
    checkImpact() {
        // Simplified impact detection
        // In a real game, this would check against walls, enemies, etc.
        return false
    }
}

export default FireballAbility
