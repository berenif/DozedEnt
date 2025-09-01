// Game Feel Enhancer - Main Integration Module
// Combines all game feel systems into a cohesive enhancement layer

import ParticleSystem from './particle-system.js'
import CameraEffects from './camera-effects.js'
import { getSoundSystem } from './sound-system.js'
import { CharacterAnimator } from './animation-system.js'
import UIFeedbackSystem from './ui-feedback.js'
import GameRenderer from './game-renderer.js'

export class GameFeelEnhancer {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        
        // Initialize all subsystems
        this.particles = new ParticleSystem()
        this.camera = new CameraEffects(canvas)
        this.sound = getSoundSystem()
        this.uiFeedback = new UIFeedbackSystem()
        this.characterAnimators = new Map()
        this.gameRenderer = new GameRenderer(this.ctx, canvas)
        
        // Game state tracking
        this.playerState = {
            position: { x: 640, y: 360 },
            velocity: { x: 0, y: 0 },
            health: 100,
            maxHealth: 100,
            stamina: 100,
            isRolling: false,
            isBlocking: false,
            isAttacking: false,
            lastFootstepTime: 0,
            comboCount: 0
        }
        
        // Combat juice settings
        this.hitStopFrames = 0
        this.hitStopDuration = 0
        this.timeScale = 1.0
        
        // Movement feel parameters
        this.movementConfig = {
            acceleration: 800,
            deceleration: 600,
            maxSpeed: 300,
            rollSpeed: 600,
            rollDuration: 0.3,
            jumpForce: 500,
            gravity: 1000,
            airControl: 0.3,
            coyoteTime: 0.1,
            jumpBuffer: 0.1
        }
        
        // Input smoothing
        this.inputBuffer = []
        this.inputBufferSize = 5
        
        // Initialize sound system
        this.sound.initialize()
        
        // Performance monitoring
        this.performanceMode = 'high' // 'high', 'medium', 'low'
        this.particleLimit = 500
        
        // Combo timing
        this.lastHitTime = 0
        this.comboWindow = 2000 // milliseconds
        
        // Screen effects
        this.screenEffects = {
            vignette: 0,
            chromaticAberration: 0,
            motionBlur: false
        }
    }

    // Main update loop
    update(deltaTime) {
        // Apply time scale for slow motion effects
        const scaledDelta = deltaTime * this.timeScale
        
        // Handle hit stop
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--
            return // Skip update during hit stop
        }
        
        // Update all subsystems
        this.particles.update(scaledDelta)
        this.camera.update(scaledDelta)
        this.uiFeedback.update(scaledDelta)
        
        // Update character animators
        this.characterAnimators.forEach(animator => {
            animator.update(scaledDelta, animator.position)
        })
        
        // Update player movement with enhanced feel
        this.updateMovement(scaledDelta)
        
        // Update game renderer entities with proper input
        const input = {
            left: this.playerState.input?.left || false,
            right: this.playerState.input?.right || false,
            up: this.playerState.input?.up || false,
            down: this.playerState.input?.down || false,
            jump: this.playerState.input?.jump || false,
            sprint: this.playerState.input?.sprint || false
        }
        this.gameRenderer.updatePlayer(scaledDelta, input)
        this.gameRenderer.updateEnemies(scaledDelta)
        this.gameRenderer.updateProjectiles(scaledDelta)
        this.gameRenderer.checkCollisions()
        
        // Sync player state from renderer (renderer is authoritative)
        const playerPos = this.gameRenderer.getPlayerPosition()
        this.playerState.position.x = playerPos.x
        this.playerState.position.y = playerPos.y
        this.playerState.velocity.x = this.gameRenderer.player.velocityX
        this.playerState.velocity.y = this.gameRenderer.player.velocityY
        this.gameRenderer.player.state = this.playerState.isAttacking ? 'attacking' : 
                                          this.playerState.isRolling ? 'rolling' :
                                          this.playerState.isBlocking ? 'blocking' :
                                          Math.abs(this.playerState.velocity.x) > 10 ? 'running' : 'idle'
        
        // Check combo timeout
        if (Date.now() - this.lastHitTime > this.comboWindow) {
            if (this.playerState.comboCount > 0) {
                this.uiFeedback.resetCombo()
                this.playerState.comboCount = 0
            }
        }
    }

    // Enhanced movement with better game feel
    updateMovement(deltaTime) {
        const state = this.playerState
        
        // Apply smooth acceleration/deceleration
        if (Math.abs(state.velocity.x) > 0) {
            // Add footstep sounds and particles
            const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2)
            if (speed > 50 && Date.now() - state.lastFootstepTime > 300) {
                this.triggerFootstep(state.position.x, state.position.y)
                state.lastFootstepTime = Date.now()
            }
            
            // Add dust particles when moving fast
            if (speed > 200 && Math.random() < 0.3) {
                this.particles.createFootstep(
                    state.position.x + (Math.random() - 0.5) * 20,
                    state.position.y + 10,
                    speed / 300
                )
            }
        }
        
        // Update position
        state.position.x += state.velocity.x * deltaTime
        state.position.y += state.velocity.y * deltaTime
        
        // Camera follow is now handled by GameRenderer
        // Additional camera effects are applied through CameraEffects
        const cameraPos = this.gameRenderer.getCameraPosition()
        this.camera.position.x = cameraPos.x
        this.camera.position.y = cameraPos.y
    }

    // Render everything with effects
    render() {
        // Pre-render camera effects
        this.camera.preRender(this.ctx)
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        
        // Render actual game content using the GameRenderer with proper camera following
        this.gameRenderer.render(true) // true = follow player automatically
        
        // Render particles (on top of game content)
        this.particles.render(this.ctx)
        
        // Post-render camera effects
        this.camera.postRender(this.ctx)
        
        // Render UI feedback (always on top)
        this.uiFeedback.render(this.ctx)
    }

    // Combat enhancement methods
    onPlayerAttack(x, y, direction) {
        // Visual effects
        this.particles.createHitSpark(x, y)
        
        // Camera shake
        this.camera.shake(0.3, 0.9)
        
        // Sound
        this.sound.playSwordSwing({ x, y })
        
        // Animation
        const animator = this.getCharacterAnimator('player')
        if (animator) {
            animator.triggerAttack()
        }
        
        this.playerState.isAttacking = true
        setTimeout(() => {
            this.playerState.isAttacking = false
        }, 400)
    }

    onEnemyHit(x, y, damage, critical = false) {
        // Combo system
        this.playerState.comboCount++
        this.lastHitTime = Date.now()
        this.uiFeedback.addComboHit()
        
        // Damage numbers
        this.uiFeedback.showDamage(x, y - 20, damage, { critical })
        
        // Particles
        this.particles.createBloodSplatter(x, y)
        if (critical) {
            this.particles.createHitSpark(x, y, { r: 255, g: 50, b: 50 })
        }
        
        // Camera effects
        if (critical) {
            this.camera.criticalHit()
            this.triggerHitStop(6)
        } else {
            this.camera.smallImpact()
            this.triggerHitStop(3)
        }
        
        // Sound
        this.sound.playSwordHit({ x, y }, critical)
        
        // Screen flash
        if (critical) {
            this.uiFeedback.flashScreen('#ff6b6b', 0.3)
        }
    }

    onPlayerBlock(x, y, perfect = false) {
        if (perfect) {
            // Perfect parry effects
            this.particles.createPerfectParryFlash(x, y)
            this.camera.perfectParry()
            this.sound.playBlock({ x, y }, true)
            this.uiFeedback.showNotification('PERFECT PARRY!', 1, '#00ffff')
            this.triggerHitStop(8)
            
            // Add slow motion for dramatic effect
            this.triggerSlowMotion(0.3, 0.5)
        } else {
            // Regular block
            this.particles.createBlockSpark(x, y, Math.PI)
            this.camera.blockSuccess()
            this.sound.playBlock({ x, y }, false)
            this.triggerHitStop(2)
        }
        
        this.playerState.isBlocking = true
    }

    onPlayerRoll(x, y, direction) {
        // Roll effects
        this.particles.createRollDust(x, y, direction)
        this.camera.rollDodge()
        this.sound.playRoll({ x, y })
        
        // Update state
        this.playerState.isRolling = true
        setTimeout(() => {
            this.playerState.isRolling = false
        }, this.movementConfig.rollDuration * 1000)
        
        // Add motion blur
        this.camera.setMotionBlur(true, 0.3)
        setTimeout(() => {
            this.camera.setMotionBlur(false)
        }, 200)
    }

    onPlayerDamaged(damage, x, y) {
        // Update health
        this.playerState.health -= damage
        this.uiFeedback.takeDamage(damage)
        
        // Visual feedback
        this.particles.createBloodSplatter(x, y)
        this.camera.playerDamaged()
        this.uiFeedback.flashScreen('red', 0.4)
        
        // Reset combo
        if (this.playerState.comboCount > 0) {
            this.uiFeedback.resetCombo()
            this.playerState.comboCount = 0
        }
        
        // Sound
        this.sound.play('player_hurt', { position: { x, y } })
        
        // Check for death
        if (this.playerState.health <= 0) {
            this.onPlayerDeath(x, y)
        }
    }

    onPlayerDeath(x, y) {
        // Death effects
        this.camera.playerDeath()
        this.particles.createEnemyDeathExplosion(x, y)
        this.sound.play('player_death', { position: { x, y } })
        this.uiFeedback.showNotification('DEFEATED', 3, '#ef4444')
        
        // Dramatic slow motion
        this.triggerSlowMotion(0.2, 2)
    }

    onEnemyDeath(x, y, enemyType = 'wolf') {
        // Death effects
        this.particles.createEnemyDeathExplosion(x, y)
        this.camera.enemyDeath()
        this.sound.playEnemySound(enemyType, 'death', { x, y })
        
        // Bonus combo points
        this.playerState.comboCount += 5
        this.uiFeedback.addComboHit()
        this.uiFeedback.addComboHit()
        this.uiFeedback.addComboHit()
        this.uiFeedback.addComboHit()
        this.uiFeedback.addComboHit()
    }

    // Helper methods
    triggerHitStop(frames) {
        this.hitStopFrames = frames
        this.hitStopDuration = frames / 60 // Assuming 60 FPS
    }

    triggerSlowMotion(scale, duration) {
        this.timeScale = scale
        this.camera.slowMotion(scale, 0.1)
        
        setTimeout(() => {
            this.timeScale = 1.0
            this.camera.normalSpeed(0.1)
        }, duration * 1000)
    }

    triggerFootstep(x, y) {
        this.particles.createFootstep(x, y)
        this.sound.playFootstep({ x, y })
    }

    getCharacterAnimator(id) {
        if (!this.characterAnimators.has(id)) {
            this.characterAnimators.set(id, new CharacterAnimator())
        }
        return this.characterAnimators.get(id)
    }

    // Status effect methods
    addStatusEffect(type, duration) {
        this.uiFeedback.addStatus(type, duration)
        
        // Apply visual effects based on status
        switch(type) {
            case 'poison':
                this.screenEffects.vignette = 0.3
                this.camera.setVignette(0.3, 0.1)
                break
            case 'burn':
                this.uiFeedback.flashScreen('#ff6b35', 0.2)
                break
            case 'freeze':
                this.camera.setChromaticAberration(0.2)
                break
            case 'speed':
                this.camera.setMotionBlur(true, 0.2)
                break
        }
    }

    removeStatusEffect(type) {
        this.uiFeedback.removeStatus(type)
        
        // Remove visual effects
        switch(type) {
            case 'poison':
                this.camera.setVignette(0, 0.1)
                break
            case 'freeze':
                this.camera.setChromaticAberration(0)
                break
            case 'speed':
                this.camera.setMotionBlur(false)
                break
        }
    }

    // Level and progression effects
    onLevelUp(level) {
        this.uiFeedback.levelUp(level)
        this.particles.createPerfectParryFlash(this.playerState.position.x, this.playerState.position.y)
        this.sound.playLevelUp()
        this.camera.flash('#fbbf24', 0.5)
    }

    onItemPickup(x, y, itemName) {
        this.uiFeedback.showNotification(`Acquired: ${itemName}`, 2, '#4ade80')
        this.particles.createHitSpark(x, y, { r: 100, g: 255, b: 100 })
        this.sound.playItemPickup({ x, y })
    }

    // Performance optimization
    setPerformanceMode(mode) {
        this.performanceMode = mode
        
        switch(mode) {
            case 'low':
                this.particleLimit = 100
                this.camera.setMotionBlur(false)
                break
            case 'medium':
                this.particleLimit = 300
                break
            case 'high':
                this.particleLimit = 500
                break
        }
    }

    // Input handling with buffering for responsive controls
    handleInput(input) {
        // Add to input buffer for smoothing
        this.inputBuffer.push(input)
        if (this.inputBuffer.length > this.inputBufferSize) {
            this.inputBuffer.shift()
        }
        
        // Process buffered input for better responsiveness
        return this.processBufferedInput()
    }

    processBufferedInput() {
        // Average recent inputs for smoother control
        if (this.inputBuffer.length === 0) {return null}
        
        const averaged = this.inputBuffer.reduce((acc, input) => {
            Object.keys(input).forEach(key => {
                if (typeof input[key] === 'number') {
                    acc[key] = (acc[key] || 0) + input[key] / this.inputBuffer.length
                } else {
                    acc[key] = input[key]
                }
            })
            return acc
        }, {})
        
        return averaged
    }

    // Cleanup
    destroy() {
        this.particles.clear()
        this.camera.reset()
        this.sound.stopAll()
        this.characterAnimators.clear()
    }
}

// Singleton instance for easy access
let gameFeelInstance = null

export function getGameFeelEnhancer(canvas) {
    if (!gameFeelInstance && canvas) {
        gameFeelInstance = new GameFeelEnhancer(canvas)
    }
    return gameFeelInstance
}

export default GameFeelEnhancer