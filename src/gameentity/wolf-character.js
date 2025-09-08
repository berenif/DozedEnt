// Wolf Character Class - Realistic wolf appearance and animations
// Implements proper wolf visuals with ears, snout, tail, and fur texture

import WolfAnimationSystem from '../animation/wolf-animation.js'

export class WolfCharacter {
    constructor(x, y, type = 'normal', wasmModule = null, id = -1) {
        // Assign ID
        this.id = id;

        // Position and physics
        this.position = { x, y }
        this.velocity = { x: 0, y: 0 }
        this.acceleration = { x: 0, y: 0 }
        
        // Wolf-specific dimensions
        this.width = 80
        this.height = 60
        this.facing = 1 // 1 for right, -1 for left
        
        // Wolf type determines appearance
        this.type = type // 'normal', 'alpha', 'scout', 'hunter'
        this.size = this.getWolfSize()
        
        // Animation states
        this.state = 'idle' // idle, prowling, running, lunging, attacking, howling, hurt, death, packRun
        this.animationFrame = 0
        this.animationTime = 0
        this.animationSpeed = 0.1
        this.howlCooldown = 0
        this.lastHowlTime = 0
        this.packFormationOffset = { x: 0, y: 0 }
        this.packFormationAngle = 0
        
        // Lunge attack properties
        this.lungeState = {
            active: false,
            charging: false,
            chargeTime: 0,
            maxChargeTime: 800, // ms to fully charge
            lungeSpeed: 800,
            lungeDistance: 200,
            cooldown: 2000,
            lastLungeTime: 0,
            startPosition: null,
            targetPosition: null,
            lungeProgress: 0
        }
        
        // Combat properties
        this.health = 100
        this.maxHealth = 100
        this.damage = 15
        this.attackRange = 50
        this.detectionRange = 300
        
        // Visual properties
        this.colors = this.getWolfColors()
        this.furPattern = Math.random() // Unique fur pattern for each wolf
        this.tailPosition = 0 // For tail animation
        this.earRotation = 0 // For ear animation
        this.breathingOffset = 0 // For idle breathing animation
        
        // Movement properties
        this.speed = type === 'scout' ? 250 : 200
        this.maxSpeed = type === 'scout' ? 400 : 350
        this.friction = 0.85
        this.isGrounded = true
        
        // Pack behavior
        this.packId = null
        this.isAlpha = type === 'alpha'
        this.packRole = this.getPackRole()
        
        // Animation system
        this.animationSystem = new WolfAnimationSystem()
        if (wasmModule) {
            this.animationSystem.setWasmModule(wasmModule)
            this.wasmModule = wasmModule; // Store the WASM module
        }
        
        // Additional animation properties
        this.legPositions = []
        this.tailSegments = []
        this.bodyBob = 0
        this.headBob = 0
        this.bodyLowered = 0
        this.bodySway = 0
        this.headScan = 0
        this.headTilt = 0
        this.headShake = 0
        this.bodyStretch = 1
        this.frontLegExtension = 0
        this.rearLegExtension = 0
        this.clawsOut = false
        this.mouthOpen = 0
        this.jawOpen = 0
        this.teethVisible = false
        this.furRipple = 0
        this.furMovement = null
        this.bodyTension = 0
        this.chestExpansion = 1
        this.bellyOffset = 0
        this.mouthVibration = 0
        this.soundWavePhase = null
        this.soundWaveAmplitude = 0
        this.flinchOffset = 0
        this.bodyShake = 0
        this.tailTucked = 0
        this.earAlertness = 0
        this.isBlinking = false
        this.particleSystem = null
    }
    
    getWolfSize() {
        const sizes = {
            normal: 1.0,
            alpha: 1.3,
            scout: 0.9,
            hunter: 1.1
        }
        return sizes[this.type] || 1.0
    }
    
    getWolfColors() {
        const colorSchemes = {
            normal: {
                primary: '#6b5d54',    // Brown-grey
                secondary: '#4a4038',   // Darker brown
                belly: '#8b7d74',       // Lighter brown
                eyes: '#ffd700',        // Golden yellow
                nose: '#1a1a1a',        // Black
                claws: '#2c2c2c'        // Dark grey
            },
            alpha: {
                primary: '#3a3a3a',     // Dark grey
                secondary: '#1a1a1a',   // Black
                belly: '#5a5a5a',       // Medium grey
                eyes: '#ff4444',        // Red
                nose: '#000000',        // Pure black
                claws: '#1a1a1a'        // Black
            },
            scout: {
                primary: '#8b7355',     // Light brown
                secondary: '#6b5a47',   // Medium brown
                belly: '#a89484',       // Tan
                eyes: '#90ee90',        // Light green
                nose: '#2a2a2a',        // Dark grey
                claws: '#3c3c3c'        // Grey
            },
            hunter: {
                primary: '#4a3c30',     // Dark brown
                secondary: '#2a1f18',   // Very dark brown
                belly: '#6a5a4a',       // Medium brown
                eyes: '#ffa500',        // Orange
                nose: '#1a1a1a',        // Black
                claws: '#2c2c2c'        // Dark grey
            }
        }
        return colorSchemes[this.type] || colorSchemes.normal
    }
    
    getPackRole() {
        const roles = {
            alpha: 'leader',
            scout: 'scout',
            hunter: 'hunter',
            normal: 'pack_member'
        }
        return roles[this.type] || 'pack_member'
    }
    
    // Update wolf state and animations
    update(deltaTime, player) {
        // Update animation time
        this.animationTime += deltaTime
        this.animationFrame = Math.floor(this.animationTime / this.animationSpeed)
        
        // Update animation system with WASM data
        if (this.wasmModule) {
            try {
                // Get current WASM enemy data for this wolf
                const wasmEnemyType = typeof this.wasmModule.get_enemy_type === 'function' ? 
                    this.wasmModule.get_enemy_type(this.id) : 0;
                const wasmEnemyState = typeof this.wasmModule.get_enemy_state === 'function' ? 
                    this.wasmModule.get_enemy_state(this.id) : 0;
                const wasmEnemyFacingX = typeof this.wasmModule.get_enemy_face_x === 'function' ? 
                    this.wasmModule.get_enemy_face_x(this.id) : 1;
                const wasmEnemyFacingY = typeof this.wasmModule.get_enemy_face_y === 'function' ? 
                    this.wasmModule.get_enemy_face_y(this.id) : 0;
                const wasmEnemyVX = typeof this.wasmModule.get_enemy_vx === 'function' ? 
                    this.wasmModule.get_enemy_vx(this.id) : 0;
                const wasmEnemyVY = typeof this.wasmModule.get_enemy_vy === 'function' ? 
                    this.wasmModule.get_enemy_vy(this.id) : 0;

                // Update wolf's JS-side state based on WASM state
                this.type = this.getWolfTypeFromWasm(wasmEnemyType);
                switch(wasmEnemyState) {
                    case 1: this.state = 'running'; break; // seek
                    case 2: this.state = 'prowling'; break; // circle
                    case 3: this.state = 'attacking'; break; // harass
                    case 4: this.state = 'hurt'; break; // recover
                    default: this.state = 'idle'; break;
                }

                this.facing = (wasmEnemyFacingX >= 0) ? 1 : -1;
                this.velocity.x = wasmEnemyVX;
                this.velocity.y = wasmEnemyVY;

                this.animationSystem.applyAnimation(this, deltaTime);
            } catch (error) {
                console.warn('WASM function call failed in wolf update:', error);
                // Continue with fallback behavior
            }
        }
        
        // Handle lunge attack
        this.updateLungeAttack(deltaTime, player)
        
        // Update physics
        this.velocity.x += this.acceleration.x * deltaTime
        this.velocity.y += this.acceleration.y * deltaTime
        
        // Apply friction
        this.velocity.x *= this.friction
        this.velocity.y *= this.friction
        
        // Update position
        this.position.x += this.velocity.x * deltaTime
        this.position.y += this.velocity.y * deltaTime
        
        // Reset acceleration
        this.acceleration.x = 0
        this.acceleration.y = 0
    }
    
    // Handle lunge attack mechanics
    updateLungeAttack(deltaTime, player) {
        const now = Date.now()
        
        // Check if we can start a new lunge
        if (!this.lungeState.active && 
            now - this.lungeState.lastLungeTime > this.lungeState.cooldown) {
            
            const distanceToPlayer = this.getDistanceTo(player)
            
            // Start charging if player is in range
            if (distanceToPlayer < this.detectionRange && 
                distanceToPlayer > this.attackRange) {
                
                if (!this.lungeState.charging) {
                    this.startLungeCharge(player)
                } else {
                    // Continue charging
                    this.lungeState.chargeTime += deltaTime * 1000
                    
                    // Launch lunge when fully charged
                    if (this.lungeState.chargeTime >= this.lungeState.maxChargeTime) {
                        this.executeLunge(player)
                    }
                }
            } else if (this.lungeState.charging) {
                // Cancel charge if player moves out of range
                this.cancelLungeCharge()
            }
        }
        
        // Update active lunge
        if (this.lungeState.active) {
            this.lungeState.lungeProgress += deltaTime * 1000
            
            if (this.lungeState.lungeProgress >= this.lungeState.lungeDuration) {
                // End lunge
                this.endLunge()
            } else {
                // Continue lunge movement
                const progress = this.lungeState.lungeProgress / this.lungeState.lungeDuration
                const easeOut = 1 - (1 - progress)**3 // Cubic ease-out
                
                // Interpolate position
                if (this.lungeState.startPosition && this.lungeState.targetPosition) {
                    this.position.x = this.lungeState.startPosition.x + 
                        (this.lungeState.targetPosition.x - this.lungeState.startPosition.x) * easeOut
                    this.position.y = this.lungeState.startPosition.y + 
                        (this.lungeState.targetPosition.y - this.lungeState.startPosition.y) * easeOut
                }
            }
        }
    }
    
    startLungeCharge(target) {
        if (!target || !target.position) {
            return
        }
        
        this.lungeState.charging = true
        this.lungeState.chargeTime = 0
        this.state = 'prowling'
        
        // Face the target
        this.facing = target.position.x > this.position.x ? 1 : -1
    }
    
    executeLunge(target) {
        if (!target || !target.position) {
            return
        }
        
        this.lungeState.active = true
        this.lungeState.charging = false
        this.lungeState.lungeProgress = 0
        this.lungeState.lastLungeTime = Date.now()
        
        // Store start and target positions
        this.lungeState.startPosition = { ...this.position }
        
        // Calculate lunge target (slightly past the player for overshoot effect)
        const dx = target.position.x - this.position.x
        const dy = target.position.y - this.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const normalizedDx = dx / distance
        const normalizedDy = dy / distance
        
        this.lungeState.targetPosition = {
            x: this.position.x + normalizedDx * Math.min(distance + 50, this.lungeState.lungeDistance),
            y: this.position.y + normalizedDy * Math.min(distance + 50, this.lungeState.lungeDistance)
        }
        
        this.state = 'lunging'
        this.facing = normalizedDx > 0 ? 1 : -1
    }
    
    cancelLungeCharge() {
        this.lungeState.charging = false
        this.lungeState.chargeTime = 0
        this.state = 'idle'
    }
    
    endLunge() {
        this.lungeState.active = false
        this.lungeState.lungeProgress = 0
        this.lungeState.startPosition = null
        this.lungeState.targetPosition = null
        this.state = 'idle'
        
        // Add a small recovery pause
        this.velocity.x = 0
        this.velocity.y = 0
    }
    
    getDistanceTo(target) {
        if (!target || !target.position) {return Infinity}
        const dx = this.position.x - target.position.x
        const dy = this.position.y - target.position.y
        return Math.sqrt(dx * dx + dy * dy)
    }
    
    // Render the wolf with realistic features
    render(ctx, camera) {
        // Draw procedural animation overlays from WASM data
        if (this.wasmModule) {
            try {
                const wolfId = this.id;
                
                // Check if wolf animation is active
                const isActive = typeof this.wasmModule.get_wolf_anim_active === 'function' ? 
                    this.wasmModule.get_wolf_anim_active(wolfId) : false;
                    
                if (!isActive) return;

                // Apply spine bend
                const spineBend = typeof this.wasmModule.get_wolf_anim_spine_bend === 'function' ? 
                    this.wasmModule.get_wolf_anim_spine_bend(wolfId) : 0;
                // ctx.rotate(spineBend); // This would rotate the whole canvas, need to rotate individual parts

                // Apply body offset (bobbing)
                const bodyOffsetY = typeof this.wasmModule.get_wolf_anim_body_offset_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_body_offset_y(wolfId) : 0;
                ctx.translate(0, bodyOffsetY);

                // Render legs procedurally
                for (let i = 0; i < 4; i++) {
                    const legX = typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                        this.wasmModule.get_wolf_anim_leg_x(wolfId, i) : 0;
                    const legY = typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                        this.wasmModule.get_wolf_anim_leg_y(wolfId, i) : 0;
                    // Draw leg at (this.position.x + legX, this.position.y + legY)
                    // This requires more granular drawing, currently drawWolfBody handles full body
                    // For now, we will draw simple circles for leg positions as a debug visual
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(this.position.x - camera.x + legX, this.position.y - camera.y + legY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Reset translation after drawing specific elements that use it
                ctx.translate(0, -bodyOffsetY);
            } catch (error) {
                console.warn('WASM function call failed in wolf render:', error);
                // Continue with fallback rendering
            }
        }

        // Render the wolf with realistic features using the animation system
        this.animationSystem.renderAnimatedWolf(ctx, this, camera)
    }
    
    drawShadow(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.beginPath()
        ctx.ellipse(0, this.height / 2 + 5, this.width / 3, 8, 0, 0, Math.PI * 2)
        ctx.fill()
    }
    
    drawTail(ctx) {
        ctx.save()
        ctx.translate(-this.width * 0.35, -this.height * 0.1)
        ctx.rotate(this.tailPosition)
        
        // Tail shape
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(-15, 5, -25, 15)
        ctx.quadraticCurveTo(-20, 20, -10, 18)
        ctx.quadraticCurveTo(-5, 10, 0, 0)
        ctx.fill()
        
        // Tail fur detail
        ctx.strokeStyle = this.colors.secondary
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-5, 5)
        ctx.lineTo(-15, 12)
        ctx.moveTo(-10, 8)
        ctx.lineTo(-20, 15)
        ctx.stroke()
        
        ctx.restore()
    }
    
    drawHindLegs(ctx) {
        // Left hind leg
        const legOffset = this.state === 'running' ? Math.sin(this.animationFrame * 0.5) * 5 : 0
        
        ctx.fillStyle = this.colors.primary
        ctx.fillRect(-this.width * 0.25, this.height * 0.2 + legOffset, 8, 20)
        
        // Right hind leg
        ctx.fillRect(-this.width * 0.15, this.height * 0.2 - legOffset, 8, 20)
        
        // Paws
        ctx.fillStyle = this.colors.secondary
        ctx.fillRect(-this.width * 0.25, this.height * 0.35 + legOffset, 10, 5)
        ctx.fillRect(-this.width * 0.15, this.height * 0.35 - legOffset, 10, 5)
    }
    
    drawBody(ctx) {
        // Main body with breathing animation
        const breathY = this.breathingOffset
        
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.ellipse(0, breathY, this.width * 0.35, this.height * 0.25, 0, 0, Math.PI * 2)
        ctx.fill()
        
        // Belly
        ctx.fillStyle = this.colors.belly
        ctx.beginPath()
        ctx.ellipse(0, breathY + this.height * 0.1, this.width * 0.3, this.height * 0.15, 0, 0, Math.PI)
        ctx.fill()
        
        // Fur texture
        this.drawFurTexture(ctx, 0, breathY, this.width * 0.35, this.height * 0.25)
    }
    
    drawFrontLegs(ctx) {
        const legOffset = this.state === 'running' ? Math.sin(this.animationFrame * 0.5 + Math.PI) * 5 : 0
        
        // Left front leg
        ctx.fillStyle = this.colors.primary
        ctx.fillRect(this.width * 0.15, this.height * 0.15 + legOffset, 8, 25)
        
        // Right front leg
        ctx.fillRect(this.width * 0.25, this.height * 0.15 - legOffset, 8, 25)
        
        // Paws with claws
        ctx.fillStyle = this.colors.secondary
        ctx.fillRect(this.width * 0.15, this.height * 0.35 + legOffset, 10, 5)
        ctx.fillRect(this.width * 0.25, this.height * 0.35 - legOffset, 10, 5)
        
        // Claws
        ctx.fillStyle = this.colors.claws
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(this.width * 0.15 + i * 3, this.height * 0.38 + legOffset, 2, 3)
            ctx.fillRect(this.width * 0.25 + i * 3, this.height * 0.38 - legOffset, 2, 3)
        }
    }
    
    drawNeck(ctx) {
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(this.width * 0.15, -this.height * 0.1)
        ctx.quadraticCurveTo(this.width * 0.25, -this.height * 0.05, this.width * 0.3, -this.height * 0.15)
        ctx.quadraticCurveTo(this.width * 0.25, this.height * 0.05, this.width * 0.15, this.height * 0.1)
        ctx.fill()
    }
    
    drawHead(ctx) {
        ctx.save()
        ctx.translate(this.width * 0.35, -this.height * 0.15)
        
        // Head shape (more wolf-like with pronounced snout)
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(10, -5, 15, 0) // Top of head
        ctx.quadraticCurveTo(20, 3, 25, 5)   // Snout top
        ctx.lineTo(28, 8)                    // Nose tip
        ctx.quadraticCurveTo(25, 10, 20, 10) // Snout bottom
        ctx.quadraticCurveTo(10, 8, 0, 10)   // Jaw
        ctx.quadraticCurveTo(-5, 5, 0, 0)    // Back of head
        ctx.fill()
        
        // Ears
        this.drawEars(ctx)
        
        // Snout detail
        ctx.fillStyle = this.colors.secondary
        ctx.beginPath()
        ctx.moveTo(20, 5)
        ctx.quadraticCurveTo(25, 6, 28, 8)
        ctx.quadraticCurveTo(25, 9, 20, 9)
        ctx.fill()
        
        // Nose
        ctx.fillStyle = this.colors.nose
        ctx.beginPath()
        ctx.arc(28, 8, 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Eye
        this.drawEye(ctx)
        
        // Teeth (visible when attacking or lunging)
        if (this.state === 'attacking' || this.state === 'lunging') {
            this.drawTeeth(ctx)
        }
        
        ctx.restore()
    }
    
    drawEars(ctx) {
        ctx.save()
        
        // Left ear
        ctx.save()
        ctx.translate(5, -3)
        ctx.rotate(this.earRotation)
        ctx.fillStyle = this.colors.primary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-3, -8)
        ctx.lineTo(3, -8)
        ctx.closePath()
        ctx.fill()
        
        // Inner ear
        ctx.fillStyle = this.colors.belly
        ctx.beginPath()
        ctx.moveTo(0, -2)
        ctx.lineTo(-1, -6)
        ctx.lineTo(1, -6)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        
        // Right ear (slightly behind)
        ctx.save()
        ctx.translate(8, -2)
        ctx.rotate(this.earRotation)
        ctx.fillStyle = this.colors.secondary
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-2, -7)
        ctx.lineTo(3, -7)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        
        ctx.restore()
    }
    
    drawEye(ctx) {
        // Eye glow for dramatic effect
        if (this.state === 'prowling' || this.state === 'lunging') {
            ctx.shadowColor = this.colors.eyes
            ctx.shadowBlur = 5
        }
        
        // Eye white
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.ellipse(12, 3, 4, 3, -0.2, 0, Math.PI * 2)
        ctx.fill()
        
        // Iris
        ctx.fillStyle = this.colors.eyes
        ctx.beginPath()
        ctx.arc(13, 3, 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Pupil
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(13.5, 3, 1, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.shadowBlur = 0
    }
    
    drawTeeth(ctx) {
        ctx.fillStyle = '#ffffff'
        
        // Upper fangs
        ctx.beginPath()
        ctx.moveTo(22, 9)
        ctx.lineTo(21, 11)
        ctx.lineTo(23, 11)
        ctx.closePath()
        ctx.fill()
        
        ctx.beginPath()
        ctx.moveTo(25, 9)
        ctx.lineTo(24, 11)
        ctx.lineTo(26, 11)
        ctx.closePath()
        ctx.fill()
    }
    
    drawFurTexture(ctx, x, y, width, height) {
        ctx.strokeStyle = this.colors.secondary
        ctx.lineWidth = 0.5
        ctx.globalAlpha = 0.3
        
        // Draw fur lines based on unique pattern
        const furLines = 8
        for (let i = 0; i < furLines; i++) {
            const offsetX = (Math.sin(this.furPattern * i * 10) * width * 0.3)
            const offsetY = (i / furLines) * height - height / 2
            
            ctx.beginPath()
            ctx.moveTo(x + offsetX, y + offsetY)
            ctx.lineTo(x + offsetX + 5, y + offsetY + 3)
            ctx.stroke()
        }
        
        ctx.globalAlpha = 1
    }
    
    drawLungeEffect(ctx) {
        // Motion blur effect during lunge
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.fillStyle = this.colors.primary
        
        // Draw motion trails
        for (let i = 1; i <= 3; i++) {
            ctx.globalAlpha = 0.3 / i
            ctx.save()
            ctx.translate(-i * 10 * this.facing, 0)
            ctx.scale(1 - i * 0.1, 1 - i * 0.1)
            
            // Simplified body shape for motion blur
            ctx.beginPath()
            ctx.ellipse(0, 0, this.width * 0.3, this.height * 0.2, 0, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.restore()
        }
        
        ctx.restore()
        
        // Speed lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 1
        for (let i = 0; i < 5; i++) {
            const y = -this.height / 2 + (i / 4) * this.height
            ctx.beginPath()
            ctx.moveTo(-this.width * 0.5 * this.facing, y)
            ctx.lineTo(-this.width * 0.8 * this.facing, y)
            ctx.stroke()
        }
    }
    
    drawHealthBar(ctx) {
        if (this.health >= this.maxHealth) {return}
        
        ctx.save()
        ctx.scale(1 / this.size, 1 / this.size)
        
        const barWidth = 60
        const barHeight = 6
        const barY = -this.height * 0.5 - 20
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight)
        
        // Health
        const healthPercent = this.health / this.maxHealth
        ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : 
                        healthPercent > 0.25 ? '#ff9800' : '#f44336'
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight)
        
        // Border
        ctx.strokeStyle = this.isAlpha ? '#ffd700' : '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight)
        
        // Alpha crown icon
        if (this.isAlpha) {
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('👑', 0, barY - 5)
        }
        
        ctx.restore()
    }
    
    // AI behavior methods
    setState(newState) {
        if (this.state !== newState) {
            this.state = newState
            this.animationFrame = 0
            this.animationTime = 0
        }
    }
    
    moveTowards(target, speed = null) {
        if (!target) {
            return
        }
        
        // Handle both target.position and direct target coordinates
        const targetX = target.position ? target.position.x : target.x
        const targetY = target.position ? target.position.y : target.y
        
        if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
            return
        }
        
        const dx = targetX - this.position.x
        const dy = targetY - this.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0) {
            const moveSpeed = speed || this.speed
            this.velocity.x = (dx / distance) * moveSpeed
            this.velocity.y = (dy / distance) * moveSpeed
            this.facing = dx > 0 ? 1 : -1
            
            if (distance > this.attackRange) {
                this.setState('running')
            }
        }
    }
    
    attack(target) {
        const distance = this.getDistanceTo(target)
        
        if (distance <= this.attackRange) {
            this.setState('attacking')
            // Deal damage logic would go here
            return true
        }
        return false
    }
    
    takeDamage(amount) {
        this.health -= amount
        this.setState('hurt')
        
        // Knockback effect
        this.velocity.x = -this.facing * 100
        this.velocity.y = -50
        
        if (this.health <= 0) {
            this.health = 0
            this.setState('death')
        }
    }
    
    // Howl to call pack or buff allies
    howl() {
        const now = Date.now()
        if (now - this.lastHowlTime > 10000) { // 10 second cooldown
            this.setState('howling')
            this.lastHowlTime = now
            this.velocity.x = 0
            this.velocity.y = 0
            
            // Return howl data for pack coordination
            return {
                position: { ...this.position },
                type: this.type,
                isAlpha: this.isAlpha,
                packId: this.packId,
                effect: this.isAlpha ? 'rally' : 'call'
            }
        }
        return null
    }
    
    // Update pack formation position
    updatePackFormation(leaderPosition, formationIndex, totalPack) {
        if (this.state !== 'packRun') {
            this.setState('packRun')
        }
        
        // Calculate formation offset based on index
        const angle = (formationIndex / totalPack) * Math.PI * 2
        const radius = 100 + (formationIndex % 2) * 50 // Stagger formation
        
        this.packFormationOffset.x = Math.cos(angle) * radius
        this.packFormationOffset.y = Math.sin(angle) * radius * 0.5 // Elliptical formation
        this.packFormationAngle = angle
        
        // Move towards formation position
        const targetX = leaderPosition.x + this.packFormationOffset.x
        const targetY = leaderPosition.y + this.packFormationOffset.y
        
        this.moveTowards({ x: targetX, y: targetY }, this.speed * 1.2)
    }

    getWolfTypeFromWasm(wasmType) {
        switch(wasmType) {
            case 0: return 'normal';
            case 1: return 'alpha';
            case 2: return 'scout';
            case 3: return 'hunter';
            default: return 'normal';
        }
    }
}

export default WolfCharacter