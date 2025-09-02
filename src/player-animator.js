// Enhanced Player with Animation System Integration
// Provides a complete player character with roll, attack, block, and hurt animations

import { CharacterAnimator, AnimationPresets } from './animation-system.js'
import { SoundSystem } from './sound-system.js'
import { ParticleSystem } from './particle-system.js'

export class AnimatedPlayer {
    constructor(x = 400, y = 300, options = {}) {
        // Position and physics
        this.x = x
        this.y = y
        this.vx = 0
        this.vy = 0
        this.facing = 1 // 1 for right, -1 for left
        
        // Player stats
        this.health = options.health || 100
        this.maxHealth = options.maxHealth || 100
        this.stamina = options.stamina || 100
        this.maxStamina = options.maxStamina || 100
        this.speed = options.speed || 250
        this.rollSpeed = options.rollSpeed || 500
        
        // State management
        this.state = 'idle' // idle, running, attacking, blocking, rolling, hurt, dead, jumping, doubleJumping, landing, wallSliding, dashing, chargingAttack
        this.previousState = 'idle'
        this.stateTimer = 0
        this.invulnerable = false
        this.invulnerabilityTimer = 0
        this.isGrounded = true
        this.jumpCount = 0
        this.maxJumps = 2
        this.nearWall = false
        this.dashCooldown = 0
        this.chargeTime = 0
        this.maxChargeTime = 1.5
        
        // Animation system
        this.animator = new CharacterAnimator()
        this.animations = AnimationPresets.createPlayerAnimations()
        this.setupAnimations()
        
        // Action cooldowns
        this.attackCooldown = 0
        this.rollCooldown = 0
        this.blockHeld = false
        
        // Visual properties
        this.width = options.width || 32
        this.height = options.height || 32
        this.color = options.color || '#00ff88'
        this.sprite = options.sprite || null
        
        // Effects
        this.particleSystem = options.particleSystem || null
        this.soundSystem = options.soundSystem || null
        
        // Combat properties
        this.attackDamage = options.attackDamage || 20
        this.attackRange = options.attackRange || 60
        this.blockDamageReduction = options.blockDamageReduction || 0.5
    }
    
    setupAnimations() {
        // Add all animations to the controller
        Object.values(this.animations).forEach(animation => {
            this.animator.controller.addAnimation(animation)
        })
        
        // Start with idle animation
        this.animator.controller.play('idle')
    }
    
    update(deltaTime, input = {}) {
        // Update timers
        this.stateTimer -= deltaTime
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime)
        this.rollCooldown = Math.max(0, this.rollCooldown - deltaTime)
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false
            }
        }
        
        // Handle state transitions
        this.handleStateTransitions(input)
        
        // Update based on current state
        this.updateState(deltaTime, input)
        
        // Update animation system
        this.animator.update(deltaTime, { x: this.x, y: this.y })
        
        // Apply physics
        this.applyPhysics(deltaTime)
        
        // Regenerate stamina
        if (this.state !== 'rolling' && this.state !== 'attacking') {
            this.stamina = Math.min(this.maxStamina, this.stamina + 20 * deltaTime)
        }
    }
    
    handleStateTransitions(input) {
        // Don't transition if in the middle of an action
        if (this.state === 'attacking' && this.stateTimer > 0) return
        if (this.state === 'rolling' && this.stateTimer > 0) return
        if (this.state === 'hurt' && this.stateTimer > 0) return
        if (this.state === 'dead') return
        
        // Check for roll input (highest priority)
        if (input.roll && this.canRoll()) {
            this.startRoll(input)
            return
        }
        
        // Check for attack input
        if (input.attack && this.canAttack()) {
            this.startAttack()
            return
        }
        
        // Check for block input
        if (input.block && this.canBlock()) {
            this.startBlock()
            return
        }
        
        // Release block
        if (this.state === 'blocking' && !input.block) {
            this.stopBlock()
            return
        }
        
        // Check for movement
        const isMoving = (input.left || input.right || input.up || input.down)
        if (isMoving && this.state !== 'running') {
            this.setState('running')
        } else if (!isMoving && this.state === 'running') {
            this.setState('idle')
        }
    }
    
    updateState(deltaTime, input) {
        switch(this.state) {
            case 'idle':
            case 'running':
                this.handleMovement(deltaTime, input)
                break
                
            case 'attacking':
                // Attack animation plays out
                if (this.stateTimer <= 0.2 && !this.attackExecuted) {
                    this.executeAttack()
                    this.attackExecuted = true
                }
                break
                
            case 'rolling':
                // Continue roll in current direction
                this.x += this.rollDirection.x * this.rollSpeed * deltaTime
                this.y += this.rollDirection.y * this.rollSpeed * deltaTime
                break
                
            case 'blocking':
                // Slow movement while blocking
                this.handleMovement(deltaTime, input, 0.3)
                break
                
            case 'hurt':
                // Knockback effect
                this.vx *= Math.pow(0.5, deltaTime)
                this.vy *= Math.pow(0.5, deltaTime)
                break
        }
    }
    
    handleMovement(deltaTime, input, speedMultiplier = 1) {
        let inputX = 0, inputY = 0
        
        if (input.left) inputX -= 1
        if (input.right) inputX += 1
        if (input.up) inputY -= 1
        if (input.down) inputY += 1
        
        // Normalize diagonal movement
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707
            inputY *= 0.707
        }
        
        // Apply acceleration
        const currentSpeed = this.speed * speedMultiplier
        this.vx += inputX * 1000 * deltaTime
        this.vy += inputY * 1000 * deltaTime
        
        // Clamp to max speed
        const speed = Math.hypot(this.vx, this.vy)
        if (speed > currentSpeed) {
            this.vx = (this.vx / speed) * currentSpeed
            this.vy = (this.vy / speed) * currentSpeed
        }
        
        // Update facing direction
        if (Math.abs(this.vx) > 10) {
            this.facing = Math.sign(this.vx)
        }
    }
    
    applyPhysics(deltaTime) {
        // Apply friction
        if (this.state !== 'rolling') {
            this.vx *= Math.pow(0.1, deltaTime)
            this.vy *= Math.pow(0.1, deltaTime)
        }
        
        // Update position
        this.x += this.vx * deltaTime
        this.y += this.vy * deltaTime
    }
    
    startRoll(input) {
        // Determine roll direction
        let dirX = 0, dirY = 0
        
        if (input.left) dirX -= 1
        if (input.right) dirX += 1
        if (input.up) dirY -= 1
        if (input.down) dirY += 1
        
        // If no direction input, roll in facing direction
        if (dirX === 0 && dirY === 0) {
            dirX = this.facing
        }
        
        // Normalize direction
        const length = Math.hypot(dirX, dirY)
        if (length > 0) {
            dirX /= length
            dirY /= length
        }
        
        this.rollDirection = { x: dirX, y: dirY }
        this.setState('rolling')
        this.stateTimer = 0.4 // Roll duration
        this.rollCooldown = 0.8 // Cooldown before next roll
        this.stamina -= 25
        this.invulnerable = true
        this.invulnerabilityTimer = 0.4
        
        // Create roll effect
        if (this.particleSystem) {
            this.particleSystem.createDustCloud(this.x, this.y)
        }
        
        // Play roll sound
        if (this.soundSystem) {
            this.soundSystem.play('roll')
        }
    }
    
    startAttack() {
        this.setState('attacking')
        this.stateTimer = 0.4 // Attack duration
        this.attackCooldown = 0.6 // Cooldown before next attack
        this.attackExecuted = false
        this.stamina -= 15
        
        // Play attack sound
        if (this.soundSystem) {
            this.soundSystem.play('attack')
        }
    }
    
    executeAttack() {
        // Create attack hitbox
        const hitboxX = this.x + (this.facing * this.attackRange / 2)
        const hitboxY = this.y
        
        // Create attack effect
        if (this.particleSystem) {
            this.particleSystem.createSlashEffect(hitboxX, hitboxY, this.facing)
        }
        
        // Return attack hitbox for collision detection
        return {
            x: hitboxX,
            y: hitboxY,
            width: this.attackRange,
            height: this.height,
            damage: this.attackDamage
        }
    }
    
    startBlock() {
        this.setState('blocking')
        this.blockHeld = true
        
        // Create block effect
        if (this.particleSystem) {
            this.particleSystem.createShieldEffect(this.x, this.y)
        }
        
        // Play block sound
        if (this.soundSystem) {
            this.soundSystem.play('block')
        }
    }
    
    stopBlock() {
        this.setState('idle')
        this.blockHeld = false
    }
    
    takeDamage(damage, knockbackX = 0, knockbackY = 0) {
        if (this.invulnerable || this.state === 'dead') return false
        
        let actualDamage = damage
        
        // Reduce damage if blocking
        if (this.state === 'blocking') {
            actualDamage *= this.blockDamageReduction
            
            // Create block impact effect
            if (this.particleSystem) {
                this.particleSystem.createBlockImpact(this.x, this.y)
            }
            
            // Play block impact sound
            if (this.soundSystem) {
                this.soundSystem.play('blockImpact')
            }
        } else {
            // Not blocking, take full damage and enter hurt state
            this.setState('hurt')
            this.stateTimer = 0.3 // Hurt duration
            
            // Apply knockback
            this.vx = knockbackX * 300
            this.vy = knockbackY * 300
            
            // Create hurt effect
            if (this.particleSystem) {
                this.particleSystem.createBloodEffect(this.x, this.y)
            }
            
            // Play hurt sound
            if (this.soundSystem) {
                this.soundSystem.play('hurt')
            }
        }
        
        // Apply damage
        this.health = Math.max(0, this.health - actualDamage)
        
        // Check for death
        if (this.health <= 0) {
            this.die()
        }
        
        return true
    }
    
    die() {
        this.setState('dead')
        this.vx = 0
        this.vy = 0
        
        // Create death effect
        if (this.particleSystem) {
            this.particleSystem.createDeathEffect(this.x, this.y)
        }
        
        // Play death sound
        if (this.soundSystem) {
            this.soundSystem.play('death')
        }
    }
    
    respawn(x, y) {
        this.x = x
        this.y = y
        this.vx = 0
        this.vy = 0
        this.health = this.maxHealth
        this.stamina = this.maxStamina
        this.setState('idle')
        this.invulnerable = true
        this.invulnerabilityTimer = 2 // 2 seconds of invulnerability after respawn
        
        // Create respawn effect
        if (this.particleSystem) {
            this.particleSystem.createRespawnEffect(this.x, this.y)
        }
        
        // Play respawn sound
        if (this.soundSystem) {
            this.soundSystem.play('respawn')
        }
    }
    
    setState(newState) {
        if (this.state === newState) return
        
        this.previousState = this.state
        this.state = newState
        
        // Update animation
        this.animator.setState(newState)
        
        // Play animation based on state
        switch(newState) {
            case 'idle':
                this.animator.controller.play('idle', { transition: 200 })
                break
            case 'running':
                this.animator.controller.play('run', { transition: 100 })
                break
            case 'attacking':
                this.animator.controller.play('attack', { transition: 50 })
                break
            case 'blocking':
                this.animator.controller.play('block', { transition: 100 })
                break
            case 'rolling':
                this.animator.controller.play('roll', { transition: 50 })
                break
            case 'hurt':
                this.animator.controller.play('hurt', { transition: 0 })
                break
            case 'dead':
                this.animator.controller.play('death', { transition: 0 })
                break
            case 'jumping':
                this.animator.controller.play('jump', { transition: 50 })
                break
            case 'doubleJumping':
                this.animator.controller.play('doubleJump', { transition: 0 })
                break
            case 'landing':
                this.animator.controller.play('land', { transition: 0 })
                break
            case 'wallSliding':
                this.animator.controller.play('wallSlide', { transition: 100 })
                break
            case 'dashing':
                this.animator.controller.play('dash', { transition: 0 })
                break
            case 'chargingAttack':
                this.animator.controller.play('chargeAttack', { transition: 100 })
                break
        }
    }
    
    canAttack() {
        return this.attackCooldown <= 0 && 
               this.stamina >= 15 &&
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'hurt'
    }
    
    canRoll() {
        return this.rollCooldown <= 0 && 
               this.stamina >= 25 &&
               this.state !== 'dead' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    canBlock() {
        return this.stamina > 0 &&
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    render(ctx, camera = null) {
        // Calculate screen position
        let screenX = this.x
        let screenY = this.y
        
        if (camera) {
            screenX = this.x - camera.x
            screenY = this.y - camera.y
        }
        
        ctx.save()
        
        // Apply invulnerability flashing
        if (this.invulnerable) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3
        }
        
        // Get current animation frame
        const frame = this.animator.controller.getCurrentFrame()
        
        if (this.sprite && frame) {
            // Draw sprite animation
            ctx.save()
            
            // Flip sprite based on facing direction
            if (this.facing < 0) {
                ctx.scale(-1, 1)
                screenX = -screenX - this.width
            }
            
            ctx.drawImage(
                this.sprite,
                frame.x, frame.y, frame.width, frame.height,
                screenX - this.width/2, screenY - this.height/2,
                this.width, this.height
            )
            
            ctx.restore()
        } else {
            // Fallback to colored rectangle
            ctx.fillStyle = this.color
            
            // Apply state-based visual effects
            if (this.state === 'hurt') {
                ctx.fillStyle = '#ff4444'
            } else if (this.state === 'blocking') {
                ctx.fillStyle = '#4444ff'
            } else if (this.state === 'rolling') {
                ctx.fillStyle = '#ffff44'
            }
            
            ctx.fillRect(
                screenX - this.width/2,
                screenY - this.height/2,
                this.width,
                this.height
            )
        }
        
        // Draw health bar
        const barWidth = 40
        const barHeight = 4
        const barY = screenY - this.height/2 - 10
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight)
        
        // Health
        const healthPercent = this.health / this.maxHealth
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000'
        ctx.fillRect(screenX - barWidth/2, barY, barWidth * healthPercent, barHeight)
        
        // Stamina bar
        const staminaY = barY + 5
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth, 2)
        
        const staminaPercent = this.stamina / this.maxStamina
        ctx.fillStyle = '#00aaff'
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth * staminaPercent, 2)
        
        ctx.restore()
    }
    
    // Get current animation info for debugging
    getAnimationInfo() {
        return {
            state: this.state,
            animation: this.animator.controller.currentAnimation?.name,
            frame: this.animator.controller.getCurrentFrame(),
            stateTimer: this.stateTimer,
            invulnerable: this.invulnerable
        }
    }
    
    // Input helper to convert keyboard to player input
    static createInputFromKeys(keys) {
        return {
            left: keys['a'] || keys['arrowleft'],
            right: keys['d'] || keys['arrowright'],
            up: keys['w'] || keys['arrowup'],
            down: keys['s'] || keys['arrowdown'],
            attack: keys[' '] || keys['j'],
            block: keys['shift'] || keys['k'],
            roll: keys['control'] || keys['l'],
            jump: keys['space'] || keys['z'],
            dash: keys['x'] || keys['shift'],
            chargeAttack: keys['c'] || keys['h']
        }
    }
    
    // New movement methods for enhanced animations
    jump() {
        if (this.isGrounded && this.jumpCount === 0) {
            this.setState('jumping')
            this.isGrounded = false
            this.jumpCount = 1
            this.vy = -400
            
            if (this.particleSystem) {
                this.particleSystem.createDustCloud(this.x, this.y + this.height/2)
            }
            
            if (this.soundSystem) {
                this.soundSystem.play('jump')
            }
        } else if (this.jumpCount === 1 && this.jumpCount < this.maxJumps) {
            this.triggerDoubleJump()
        }
    }
    
    triggerDoubleJump() {
        this.setState('doubleJumping')
        this.jumpCount = 2
        this.vy = -350
        
        if (this.particleSystem) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2
                this.particleSystem.createSparkle(
                    this.x + Math.cos(angle) * 20,
                    this.y + Math.sin(angle) * 20
                )
            }
        }
        
        if (this.soundSystem) {
            this.soundSystem.play('doubleJump')
        }
    }
    
    land() {
        if (!this.isGrounded && this.vy > 100) {
            this.setState('landing')
            this.stateTimer = 0.2
            this.isGrounded = true
            this.jumpCount = 0
            
            const impactStrength = Math.min(this.vy / 500, 1)
            if (this.particleSystem) {
                this.particleSystem.createLandingImpact(this.x, this.y + this.height/2, impactStrength)
            }
            
            if (this.soundSystem) {
                this.soundSystem.play('land', { volume: 0.3 + impactStrength * 0.7 })
            }
        } else {
            this.isGrounded = true
            this.jumpCount = 0
        }
    }
    
    dash(direction = null) {
        if (this.dashCooldown <= 0 && this.stamina >= 20) {
            this.setState('dashing')
            this.stateTimer = 0.3
            this.dashCooldown = 1.0
            this.stamina -= 20
            this.invulnerable = true
            this.invulnerabilityTimer = 0.3
            
            let dashX = direction?.x || this.facing
            let dashY = direction?.y || 0
            
            const length = Math.sqrt(dashX * dashX + dashY * dashY)
            if (length > 0) {
                dashX /= length
                dashY /= length
            }
            
            this.vx = dashX * 600
            this.vy = dashY * 600
            
            if (this.particleSystem) {
                this.particleSystem.createDashTrail(this.x, this.y, dashX, dashY)
            }
            
            if (this.soundSystem) {
                this.soundSystem.play('dash')
            }
        }
    }
    
    startChargeAttack() {
        if (this.canAttack() && this.stamina >= 30) {
            this.setState('chargingAttack')
            this.chargeTime = 0
            
            if (this.particleSystem) {
                this.particleSystem.startChargingEffect(this.x, this.y)
            }
            
            if (this.soundSystem) {
                this.soundSystem.play('chargeStart')
            }
        }
    }
    
    releaseChargeAttack() {
        if (this.state === 'chargingAttack') {
            const chargePercent = Math.min(this.chargeTime / this.maxChargeTime, 1)
            const damage = this.attackDamage * (1 + chargePercent * 2)
            
            this.setState('attacking')
            this.stateTimer = 0.5
            this.attackCooldown = 0.8
            this.stamina -= 30
            
            const hitboxX = this.x + (this.facing * this.attackRange * (1 + chargePercent))
            const hitboxY = this.y
            
            if (this.particleSystem) {
                this.particleSystem.createChargedSlash(
                    hitboxX, hitboxY, this.facing, chargePercent
                )
            }
            
            if (this.soundSystem) {
                this.soundSystem.play('chargedAttack', { volume: 0.5 + chargePercent * 0.5 })
            }
            
            return {
                x: hitboxX,
                y: hitboxY,
                width: this.attackRange * (1 + chargePercent),
                height: this.height,
                damage: damage
            }
        }
    }
}

export default AnimatedPlayer