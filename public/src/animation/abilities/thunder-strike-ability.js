/**
 * ThunderStrikeAbility - Area of effect lightning ability
 * Implements:
 * - Lightning bolt animation and effects
 * - Area damage with chain lightning
 * - Screen flash and camera shake
 * - Thunder sound effects
 */

import { AbilityAnimationBase } from './ability-animation-base.js'

export class ThunderStrikeAbility extends AbilityAnimationBase {
    constructor(wasmModule, vfxManager = {}) {
        super({ 
            duration: 1.2, 
            cooldown: 8.0, 
            staminaCost: 60,
            manaCost: 40,
            canMoveWhileCasting: false
        })
        this.wasm = wasmModule || null
        this.particleSystem = vfxManager.particles || null
        this.cameraEffects = vfxManager.camera || null
        this.audio = vfxManager.audio || null
        
        this.lightningBolts = []
        this.chainTargets = []
        this.impactRadius = 120
        this.chainRadius = 80
        this.maxChains = 3
        this.strikePhase = 0 // 0: charging, 1: striking, 2: chaining
        this.lastLightningTime = 0
        this.lightningInterval = 0.1
    }
    
    /**
     * Start thunder strike
     */
    onStart(player, _target) {
        // Play charge-up animation
        if (player.setState) {
            player.setState('chargingThunder');
        }
        
        // Visual effects
        this.spawnChargeEffects(player.position)
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('thunder_charge')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.2, 0.5)
        }
    }
    
    /**
     * Update thunder strike
     */
    onUpdate(_deltaTime) {
        const progress = this.getProgress();
        
        // Phase 1: Charging (0-30%)
        if (progress < 0.3) {
            this.updateChargingPhase(progress)
        }
        // Phase 2: Main strike (30-70%)
        else if (progress < 0.7) {
            this.updateStrikingPhase(progress)
        }
        // Phase 3: Chain lightning (70-100%)
        else {
            this.updateChainingPhase(progress)
        }
    }
    
    /**
     * End thunder strike
     */
    onEnd() {
        // Return player to normal state
        if (this.player && this.player.setState) {
            this.player.setState('idle')
        }
        
        // Clean up
        this.lightningBolts = []
        this.chainTargets = []
        this.strikePhase = 0
        
        // Audio
        if (this.audio && this.audio.stop) {
            this.audio.stop('thunder_charge')
        }
    }
    
    /**
     * Update charging phase
     */
    updateChargingPhase(progress) {
        if (!this.player) {
            return;
        }
        
        // Spawn charge particles
        this.spawnChargeEffects(this.player.position)
        
        // Screen flash buildup
        if (this.cameraEffects && this.cameraEffects.flash) {
            const intensity = progress * 0.3
            this.cameraEffects.flash('#ffffff', intensity)
        }
    }
    
    /**
     * Update striking phase
     */
    updateStrikingPhase(_progress) {
        if (this.strikePhase === 0) {
            this.executeMainStrike()
            this.strikePhase = 1
        }
        
        // Spawn lightning bolts
        if (this.shouldSpawnLightning()) {
            this.spawnLightningBolt()
        }
    }
    
    /**
     * Update chaining phase
     */
    updateChainingPhase(_progress) {
        if (this.strikePhase === 1) {
            this.executeChainLightning()
            this.strikePhase = 2
        }
    }
    
    /**
     * Execute main lightning strike
     */
    executeMainStrike() {
        if (!this.player) {
            return;
        }
        
        const targetPos = this.getTargetPosition();
        
        // Create main lightning bolt
        this.lightningBolts.push({
            start: { x: this.player.x, y: this.player.y - 20 },
            end: targetPos,
            intensity: 1.0,
            type: 'main'
        })
        
        // Deal damage
        this.dealAreaDamage(targetPos, this.impactRadius, 100)
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('thunder_strike')
        }
        
        // Camera effects
        if (this.cameraEffects && this.cameraEffects.shake) {
            this.cameraEffects.shake(0.5, 0.3)
        }
        
        // Screen flash
        if (this.cameraEffects && this.cameraEffects.flash) {
            this.cameraEffects.flash('#ffffff', 0.8)
        }
    }
    
    /**
     * Execute chain lightning
     */
    executeChainLightning() {
        if (!this.player) {
            return;
        }
        
        const mainTarget = this.getTargetPosition();
        this.chainTargets = this.findChainTargets(mainTarget, this.maxChains)
        
        // Create chain lightning bolts
        this.chainTargets.forEach((target, index) => {
            this.lightningBolts.push({
                start: index === 0 ? mainTarget : this.chainTargets[index - 1],
                end: target,
                intensity: 0.7 - index * 0.2,
                type: 'chain'
            })
            
            // Deal damage
            this.dealAreaDamage(target, this.chainRadius, 60 - index * 15)
        })
        
        // Audio
        if (this.audio && this.audio.play) {
            this.audio.play('chain_lightning')
        }
    }
    
    /**
     * Spawn charge effects
     */
    spawnChargeEffects(position) {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        // Electric charge particles
        this.particleSystem.spawn('electric_charge', position, {
            count: 2,
            color: '#00aaff',
            size: 3,
            lifetime: 0.4,
            velocity: { x: 0, y: 0 }
        })
        
        // Spark particles
        this.particleSystem.spawn('sparks', position, {
            count: 1,
            color: '#ffffff',
            size: 1,
            lifetime: 0.2,
            velocity: { x: 0, y: 0 }
        })
    }
    
    /**
     * Spawn lightning bolt
     */
    spawnLightningBolt() {
        if (!this.particleSystem || !this.particleSystem.spawn) {
            return;
        }
        
        // Lightning bolt effect
        this.particleSystem.spawn('lightning_bolt', this.player.position, {
            count: 1,
            color: '#ffffff',
            size: 5,
            lifetime: 0.1,
            velocity: { x: 0, y: 0 }
        })
        
        this.lastLightningTime = Date.now()
    }
    
    /**
     * Deal area damage
     */
    dealAreaDamage(position, radius, damage) {
        // This would integrate with the game's damage system
        if (this.wasm && this.wasm.deal_area_damage) {
            this.wasm.deal_area_damage(position.x, position.y, radius, damage)
        }
    }
    
    /**
     * Find chain targets
     */
    findChainTargets(startPos, maxChains) {
        // Simplified chain target finding
        // In a real game, this would find nearby enemies
        const targets = []
        
        for (let i = 0; i < maxChains; i++) {
            const angle = (i * Math.PI * 2) / maxChains
            const distance = 60 + i * 20
            targets.push({
                x: startPos.x + Math.cos(angle) * distance,
                y: startPos.y + Math.sin(angle) * distance
            })
        }
        
        return targets
    }
    
    /**
     * Get target position
     */
    getTargetPosition() {
        if (this.target) {
            return { x: this.target.x, y: this.target.y }
        }
        
        // Default target in front of player
        return {
            x: this.player.x + (this.player.facing || 1) * 100,
            y: this.player.y
        }
    }
    
    /**
     * Check if should spawn lightning
     */
    shouldSpawnLightning() {
        return Date.now() - this.lastLightningTime > this.lightningInterval * 1000
    }
    
    /**
     * Get lightning bolts for rendering
     */
    getLightningBolts() {
        return this.lightningBolts
    }
    
    /**
     * Get chain targets for rendering
     */
    getChainTargets() {
        return this.chainTargets
    }
}

export default ThunderStrikeAbility
