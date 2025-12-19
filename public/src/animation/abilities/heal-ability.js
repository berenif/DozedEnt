/**
 * HealAbility - Support healing ability
 * Implements:
 * - Healing animation and effects
 * - Health restoration over time
 * - Visual feedback and particles
 * - Audio and camera effects
 */

import { AbilityAnimationBase } from './ability-animation-base.js'

export class HealAbility extends AbilityAnimationBase {
    constructor(wasmModule, vfxManager = {}) {
        super({ 
            duration: 2.0, 
            cooldown: 10.0, 
            staminaCost: 30,
            manaCost: 50,
            canMoveWhileCasting: true
        })
        this.wasm = wasmModule || null
        this.particleSystem = vfxManager.particles || null
        this.cameraEffects = vfxManager.camera || null
        this.audio = vfxManager.audio || null
        
        this.healAmount = 80
        this.healRadius = 100
        this.healRate = 0.1 // Heal per second
        this.lastHealTime = 0
        this.healInterval = 0.1
        this.healedTargets = new Set()
        this.healParticles = []
    }
    
    /**
     * Start healing
     */
    onStart(player, _target) {
        // Play healing animation
        if (player.setState) {
            player.setState('healing');
        }
        
        // Visual effects
        this.spawnHealEffects(player.position)
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('heal_start')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.1, 0.2)
        }
    }
    
    /**
     * Update healing
     */
    onUpdate(deltaTime) {
        const progress = this.getProgress()
        
        // Spawn healing particles
        if (this.shouldSpawnHealParticle()) {
            this.spawnHealParticles()
        }
        
        // Apply healing over time
        if (this.shouldApplyHealing()) {
            this.applyHealing()
        }
        
        // Update heal particles
        this.updateHealParticles(deltaTime)
        
        // Screen flash effect
        if (this.cameraEffects && this.cameraEffects.flash) {
            const intensity = Math.sin(progress * Math.PI * 4) * 0.1
            this.cameraEffects.flash('#00ff00', intensity)
        }
    }
    
    /**
     * End healing
     */
    onEnd() {
        // Return player to normal state
        if (this.player && this.player.setState) {
            this.player.setState('idle')
        }
        
        // Clean up
        this.healedTargets.clear()
        this.healParticles = []
        
        // Audio
        if (this.audio && this.audio.stop) {
            this.audio.stop('heal_start')
        }
        
        if (this.audio && this.audio.play) {
            this.audio.play('heal_complete')
        }
    }
    
    /**
     * Spawn initial heal effects
     */
    spawnHealEffects(position) {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        // Healing aura
        this.particleSystem.spawn('heal_aura', position, {
            count: 10,
            color: '#00ff00',
            size: 4,
            lifetime: 2.0,
            velocity: { x: 0, y: 0 }
        })
        
        // Sparkle particles
        this.particleSystem.spawn('heal_sparkles', position, {
            count: 15,
            color: '#ffffff',
            size: 2,
            lifetime: 1.5,
            velocity: { x: 0, y: 0 }
        })
    }
    
    /**
     * Spawn healing particles
     */
    spawnHealParticles() {
        if (!this.player) {
            return;
        }
        
        const position = this.player.position;
        
        // Healing particles
        this.particleSystem.spawn('heal_particles', position, {
            count: 3,
            color: '#00ff00',
            size: 2,
            lifetime: 0.8,
            velocity: { x: 0, y: 0 }
        })
        
        // Energy particles
        this.particleSystem.spawn('energy_particles', position, {
            count: 2,
            color: '#88ff88',
            size: 1,
            lifetime: 0.6,
            velocity: { x: 0, y: 0 }
        })
        
        this.lastHealTime = Date.now()
    }
    
    /**
     * Apply healing to targets
     */
    applyHealing() {
        if (!this.player) {
            return;
        }
        
        const targets = this.findHealTargets();
        
        targets.forEach(target => {
            if (!this.healedTargets.has(target.id)) {
                this.healedTargets.add(target.id)
                
                // Apply healing
                this.healTarget(target)
                
                // Spawn target heal effect
                this.spawnTargetHealEffect(target.position)
            }
        })
        
        this.lastHealTime = Date.now()
    }
    
    /**
     * Heal a specific target
     */
    healTarget(target) {
        const healAmount = this.healAmount * this.healRate
        
        // This would integrate with the game's healing system
        if (this.wasm && this.wasm.heal_target) {
            this.wasm.heal_target(target.id, healAmount)
        }
        
        // Audio feedback
        if (this.audio && this.audio.play) {
            this.audio.play('heal_target')
        }
    }
    
    /**
     * Spawn target heal effect
     */
    spawnTargetHealEffect(position) {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        // Target heal effect
        this.particleSystem.spawn('target_heal', position, {
            count: 5,
            color: '#00ff00',
            size: 3,
            lifetime: 0.5,
            velocity: { x: 0, y: 0 }
        })
        
        // Healing numbers
        this.particleSystem.spawn('heal_numbers', position, {
            count: 1,
            color: '#00ff00',
            size: 4,
            lifetime: 1.0,
            velocity: { x: 0, y: -20 }
        })
    }
    
    /**
     * Find heal targets
     */
    findHealTargets() {
        // Simplified target finding
        // In a real game, this would find nearby allies
        const targets = []
        
        if (this.player) {
            // Heal self
            targets.push({
                id: 'player',
                position: this.player.position,
                health: this.player.health || 100,
                maxHealth: this.player.maxHealth || 100
            })
            
            // Find nearby allies (simplified)
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3
                const distance = 60
                targets.push({
                    id: `ally_${i}`,
                    position: {
                        x: this.player.x + Math.cos(angle) * distance,
                        y: this.player.y + Math.sin(angle) * distance
                    },
                    health: 80,
                    maxHealth: 100
                })
            }
        }
        
        return targets
    }
    
    /**
     * Update heal particles
     */
    updateHealParticles(deltaTime) {
        this.healParticles = this.healParticles.filter(particle => {
            particle.lifetime -= deltaTime
            return particle.lifetime > 0
        })
    }
    
    /**
     * Check if should spawn heal particle
     */
    shouldSpawnHealParticle() {
        return Date.now() - this.lastHealTime > this.healInterval * 1000
    }
    
    /**
     * Check if should apply healing
     */
    shouldApplyHealing() {
        return Date.now() - this.lastHealTime > this.healInterval * 1000
    }
    
    /**
     * Get heal amount
     */
    getHealAmount() {
        return this.healAmount
    }
    
    /**
     * Get heal radius
     */
    getHealRadius() {
        return this.healRadius
    }
    
    /**
     * Get healed targets
     */
    getHealedTargets() {
        return Array.from(this.healedTargets)
    }
    
    /**
     * Get heal particles for rendering
     */
    getHealParticles() {
        return this.healParticles
    }
}

export default HealAbility
