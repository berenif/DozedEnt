// Advanced Animation System for Smooth Character and Object Animations
// Provides sprite animations, procedural animations, and smooth transitions

export class AnimationFrame {
    constructor(x, y, width, height, duration = 100) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.duration = duration // milliseconds
    }
}

export class Animation {
    constructor(name, frames, options = {}) {
        this.name = name
        this.frames = frames
        this.loop = options.loop !== null && options.loop !== void 0 ? options.loop : true
        this.pingPong = options.pingPong || false
        this.speed = options.speed || 1.0
        this.onComplete = options.onComplete || null
        this.onFrame = options.onFrame || null
        
        this.currentFrame = 0
        this.elapsedTime = 0
        this.direction = 1
        this.isPlaying = false
        this.hasCompleted = false
    }

    play() {
        this.isPlaying = true
        this.hasCompleted = false
        this.currentFrame = 0
        this.elapsedTime = 0
        this.direction = 1
    }

    stop() {
        this.isPlaying = false
    }

    pause() {
        this.isPlaying = false
    }

    resume() {
        this.isPlaying = true
    }

    reset() {
        this.currentFrame = 0
        this.elapsedTime = 0
        this.direction = 1
        this.hasCompleted = false
    }

    update(deltaTime) {
        if (!this.isPlaying || this.frames.length === 0) {
            return
        }

        this.elapsedTime += deltaTime * this.speed * 1000 // Convert to milliseconds

        const currentFrameData = this.frames[this.currentFrame]

        // Handle frames with non-positive duration as indefinite holds
        if (currentFrameData && currentFrameData.duration <= 0) {
            if (!this.loop && this.currentFrame === this.frames.length - 1) {
                this.isPlaying = false
                this.hasCompleted = true
                if (this.onComplete) {this.onComplete()}
            }
            return
        }

        if (this.elapsedTime >= currentFrameData.duration) {
            this.elapsedTime -= currentFrameData.duration
            
            const previousFrame = this.currentFrame
            this.currentFrame += this.direction

            if (this.pingPong) {
                if (this.currentFrame >= this.frames.length || this.currentFrame < 0) {
                    this.direction *= -1
                    this.currentFrame += this.direction * 2
                }
            } else if (this.currentFrame >= this.frames.length) {
                    if (this.loop) {
                        this.currentFrame = 0
                    } else {
                        this.currentFrame = this.frames.length - 1
                        this.isPlaying = false
                        this.hasCompleted = true
                        if (this.onComplete) {this.onComplete()}
                    }
                }

            if (this.onFrame && this.currentFrame !== previousFrame) {
                this.onFrame(this.currentFrame, this.frames[this.currentFrame])
            }
        }
    }

    getCurrentFrame() {
        if (this.frames.length === 0) {return null}
        if (this.currentFrame < 0 || this.currentFrame >= this.frames.length) {return null}
        return this.frames[this.currentFrame]
    }

    getProgress() {
        if (this.frames.length <= 1) {return 0}
        return this.currentFrame / (this.frames.length - 1)
    }

    // Utility: get frame by index with bounds checking
    getFrameAt(index) {
        if (index < 0 || index >= this.frames.length) {return null}
        return this.frames[index]
    }
}

export class AnimationController {
    constructor() {
        this.animations = new Map()
        this.currentAnimation = null
        this.transitions = new Map()
        this.blendTime = 0
        this.blendFrom = null
        this.blendProgress = 0
    }

    addAnimation(nameOrAnimation, maybeAnimation) {
        if (typeof nameOrAnimation === 'string' && maybeAnimation) {
            this.animations.set(nameOrAnimation, maybeAnimation)
            return
        }
        const animation = nameOrAnimation
        this.animations.set(animation.name, animation)
    }

    play(animationName, options = {}) {
        const animation = this.animations.get(animationName)
        if (!animation) {
            // Animation not found: ${animationName}
            return
        }

        const transition = options.transition || 0
        
        if (transition > 0 && this.currentAnimation) {
            this.blendFrom = this.currentAnimation
            this.blendTime = transition
            this.blendProgress = 0
        }

        this.currentAnimation = animation
        animation.play()
    }

    stop() {
        if (this.currentAnimation) {
            this.currentAnimation.stop()
        }
    }

    update(deltaTime) {
        if (this.blendTime > 0) {
            this.blendProgress += deltaTime
            if (this.blendProgress >= this.blendTime) {
                this.blendTime = 0
                this.blendFrom = null
                this.blendProgress = 0
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.update(deltaTime)
        }
    }

    getCurrentFrame() {
        if (!this.currentAnimation) {return null}
        return this.currentAnimation.getCurrentFrame()
    }

    getBlendFrames() {
        if (this.blendTime === 0 || !this.blendFrom) {
            return { current: this.getCurrentFrame(), blend: null, blendFactor: 0 }
        }

        const blendFactor = this.blendProgress / this.blendTime
        return {
            current: this.currentAnimation.getCurrentFrame(),
            blend: this.blendFrom.getCurrentFrame(),
            blendFactor: blendFactor
        }
    }

    isPlaying(animationName) {
        return this.currentAnimation && 
               this.currentAnimation.name === animationName && 
               this.currentAnimation.isPlaying
    }

    setSpeed(speed) {
        if (this.currentAnimation) {
            this.currentAnimation.speed = speed
        }
    }
}

export class ProceduralAnimator {
    constructor() {
        this.animations = new Map()
    }

    // Enhanced breathing animation with state-based modulation
    createBreathingAnimation(options = {}) {
        const {
            baseScale = 1.0,
            intensity = 0.015,
            speed = 2.0,
            asymmetry = 0.2
        } = options

        return {
            time: 0,
            phase: 0,
            breathRate: speed,
            currentIntensity: intensity,
            depthMod: 1.0,
            asymmetryOffset: 0,

            // State-based modulation
            modulateForState(state) {
                switch(state) {
                    case 'running':
                        this.depthMod = 0.3
                        this.breathRate = speed * 3.0
                        break
                    case 'attacking':
                        this.depthMod = 0.5
                        this.breathRate = speed * 1.8
                        break
                    case 'blocking':
                        this.depthMod = 0.2
                        this.breathRate = speed * 1.3
                        break
                    case 'hurt':
                        this.depthMod = 0.1
                        this.breathRate = speed * 0.5
                        break
                    case 'dead':
                        this.depthMod = 0.0
                        this.breathRate = 0.0
                        break
                    default: // idle, rolling
                        this.depthMod = 1.0
                        this.breathRate = speed
                }
            },

            update(deltaTime) {
                if (this.breathRate <= 0) {
                    return {
                        scaleX: baseScale,
                        scaleY: baseScale,
                        offsetY: 0,
                        chestExpansion: 0
                    }
                }

                this.time += deltaTime * this.breathRate
                this.phase = Math.sin(this.time)

                // Calculate breathing with realistic parameters
                const currentIntensity = this.currentIntensity * this.depthMod
                const breathScaleX = baseScale + this.phase * currentIntensity
                const breathScaleY = baseScale + this.phase * currentIntensity * 0.7

                // Add slight asymmetry for more natural feel
                const asymmetryFactor = Math.sin(this.time * 0.7) * asymmetry
                const finalScaleX = breathScaleX + asymmetryFactor * currentIntensity * 0.3

                // Chest expansion effect (subtle upward movement)
                const chestExpansion = this.phase * currentIntensity * 2

                // Smooth transitions
                const smoothFactor = 1 - Math.exp(-deltaTime * 5)
                this.currentIntensity = this.currentIntensity + (currentIntensity - this.currentIntensity) * smoothFactor

                return {
                    scaleX: finalScaleX,
                    scaleY: breathScaleY,
                    offsetY: -chestExpansion * 0.5,
                    chestExpansion: chestExpansion,
                    phase: this.phase,
                    intensity: currentIntensity
                }
            }
        }
    }

    // Bobbing animation for floating objects
    createBobbingAnimation(amplitude = 5, speed = 2) {
        return {
            time: 0,
            update(deltaTime) {
                this.time += deltaTime * speed
                return {
                    offsetY: Math.sin(this.time) * amplitude,
                    rotation: Math.sin(this.time * 0.5) * 0.05
                }
            }
        }
    }

    // Squash and stretch for impacts and jumps
    createSquashStretch(intensity = 0.3, duration = 0.2) {
        return {
            time: 0,
            active: false,
            trigger() {
                this.time = 0
                this.active = true
            },
            update(deltaTime) {
                if (!this.active) {return { scaleX: 1, scaleY: 1 }}
                
                this.time += deltaTime
                const progress = Math.min(this.time / duration, 1)
                
                if (progress >= 1) {
                    this.active = false
                    return { scaleX: 1, scaleY: 1 }
                }
                
                // Elastic easing
                const t = progress
                const p = 0.3
                const s = p / 4
                const postFix = 2**(-10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
                
                const squash = 1 - postFix * intensity
                const stretch = 1 + postFix * intensity * 0.5
                
                return {
                    scaleX: progress < 0.5 ? stretch : squash,
                    scaleY: progress < 0.5 ? squash : stretch
                }
            }
        }
    }

    // Wobble effect for jelly-like movement
    createWobble(frequency = 10, damping = 0.8, intensity = 0.1) {
        return {
            velocity: 0,
            displacement: 0,
            update(deltaTime, force = 0) {
                // Spring physics
                const springForce = -frequency * this.displacement
                const dampingForce = -damping * this.velocity
                
                this.velocity += (springForce + dampingForce + force) * deltaTime
                this.displacement += this.velocity * deltaTime
                
                return {
                    scaleX: 1 + this.displacement * intensity,
                    scaleY: 1 - this.displacement * intensity * 0.5,
                    rotation: this.displacement * 0.1
                }
            },
            impulse(force) {
                this.velocity += force
            }
        }
    }

    // Anticipation animation for attacks
    createAnticipation(duration = 0.3, intensity = 0.15) {
        return {
            time: 0,
            active: false,
            phase: 'idle', // idle, anticipation, action, recovery
            trigger() {
                this.time = 0
                this.active = true
                this.phase = 'anticipation'
            },
            update(deltaTime) {
                if (!this.active) {return { scaleX: 1, scaleY: 1, offsetX: 0 }}
                
                this.time += deltaTime
                
                if (this.phase === 'anticipation') {
                    const progress = Math.min(this.time / (duration * 0.4), 1)
                    const eased = 1 - Math.cos(progress * Math.PI * 0.5)
                    
                    if (progress >= 1) {
                        this.phase = 'action'
                        this.time = 0
                    }
                    
                    return {
                        scaleX: 1 - eased * intensity,
                        scaleY: 1 + eased * intensity * 0.5,
                        offsetX: -eased * 10
                    }
                } else if (this.phase === 'action') {
                    const progress = Math.min(this.time / (duration * 0.2), 1)
                    const eased = Math.sin(progress * Math.PI * 0.5)
                    
                    if (progress >= 1) {
                        this.phase = 'recovery'
                        this.time = 0
                    }
                    
                    return {
                        scaleX: 1 + eased * intensity * 2,
                        scaleY: 1 - eased * intensity,
                        offsetX: eased * 20
                    }
                } else if (this.phase === 'recovery') {
                    const progress = Math.min(this.time / (duration * 0.4), 1)
                    const eased = 1 - (1 - progress)**3
                    
                    if (progress >= 1) {
                        this.active = false
                        this.phase = 'idle'
                    }
                    
                    return {
                        scaleX: 1 + (1 - eased) * intensity * 0.5,
                        scaleY: 1 - (1 - eased) * intensity * 0.25,
                        offsetX: (1 - eased) * 10
                    }
                }
                
                return { scaleX: 1, scaleY: 1, offsetX: 0 }
            }
        }
    }

    // Advanced Inverse Kinematics for limbs and weapon positioning
    createAdvancedIK(options = {}) {
        const {
            armLength = 25,
            forearmLength = 20,
            damping = 0.8,
            stiffness = 0.5,
            maxReach = 40
        } = options

        return {
            shoulder: { x: 0, y: 0 },
            elbow: { x: 0, y: 0 },
            hand: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            targetVelocity: { x: 0, y: 0 },

            // Two-bone IK solver (CCD - Cyclic Coordinate Descent)
            solveIK(targetX, targetY, shoulderX, shoulderY) {
                this.target.x = targetX
                this.target.y = targetY
                this.shoulder.x = shoulderX
                this.shoulder.y = shoulderY

                // Calculate distance to target
                const dx = targetX - shoulderX
                const dy = targetY - shoulderY
                const distance = Math.sqrt(dx * dx + dy * dy)

                // Clamp to maximum reach
                const clampedDistance = Math.min(distance, maxReach)
                const scale = clampedDistance / distance
                const clampedTargetX = shoulderX + dx * scale
                const clampedTargetY = shoulderY + dy * scale

                // Solve for elbow and hand positions
                const totalLength = armLength + forearmLength
                const cosAngle = Math.max(-1, Math.min(1, clampedDistance / totalLength))

                // Law of cosines for elbow angle
                const elbowAngle = Math.acos(cosAngle)
                const shoulderAngle = Math.atan2(clampedTargetY - shoulderY, clampedTargetX - shoulderX)

                // Position elbow
                this.elbow.x = shoulderX + Math.cos(shoulderAngle - elbowAngle * 0.5) * armLength
                this.elbow.y = shoulderY + Math.sin(shoulderAngle - elbowAngle * 0.5) * armLength

                // Position hand
                this.hand.x = this.elbow.x + Math.cos(shoulderAngle + elbowAngle * 0.5) * forearmLength
                this.hand.y = this.elbow.y + Math.sin(shoulderAngle + elbowAngle * 0.5) * forearmLength

                return {
                    shoulder: { ...this.shoulder },
                    elbow: { ...this.elbow },
                    hand: { ...this.hand },
                    target: { x: clampedTargetX, y: clampedTargetY },
                    reach: clampedDistance / totalLength
                }
            },

            // Smooth IK with velocity prediction
            update(deltaTime, targetX, targetY, shoulderX, shoulderY) {
                // Predict target position based on velocity
                const predictedTargetX = targetX + this.targetVelocity.x * deltaTime * 0.1
                const predictedTargetY = targetY + this.targetVelocity.y * deltaTime * 0.1

                // Update target velocity for smoothing
                this.targetVelocity.x = (predictedTargetX - this.target.x) / deltaTime * damping
                this.targetVelocity.y = (predictedTargetY - this.target.y) / deltaTime * damping

                // Solve IK with damping
                const solution = this.solveIK(predictedTargetX, predictedTargetY, shoulderX, shoulderY)

                // Apply stiffness damping to joints
                const stiffnessFactor = 1 - Math.exp(-stiffness * deltaTime)

                return {
                    ...solution,
                    stiffness: stiffnessFactor
                }
            }
        }
    }

    // Secondary motion system for cloth, hair, and equipment
    createSecondaryMotion(options = {}) {
        const {
            segments = 5,
            length = 15,
            damping = 0.85,
            gravity = 0.5,
            windStrength = 0.1
        } = options

        return {
            segments: [],
            anchorPoint: { x: 0, y: 0 },
            windTime: 0,

            initialize(anchorX, anchorY) {
                this.anchorPoint = { x: anchorX, y: anchorY }
                this.segments = []

                // Create chain segments
                for (let i = 0; i < segments; i++) {
                    this.segments.push({
                        x: anchorX,
                        y: anchorY + i * (length / segments),
                        vx: 0,
                        vy: 0,
                        prevX: anchorX,
                        prevY: anchorY + i * (length / segments)
                    })
                }
            },

            update(deltaTime, anchorX, anchorY, windDirection = 0) {
                this.anchorPoint.x = anchorX
                this.anchorPoint.y = anchorY
                this.windTime += deltaTime

                // Update anchor point
                this.segments[0].x = anchorX
                this.segments[0].y = anchorY

                // Simulate chain physics
                for (let i = 1; i < this.segments.length; i++) {
                    const segment = this.segments[i]
                    const prevSegment = this.segments[i - 1]

                    // Calculate desired position (maintain distance from previous segment)
                    const dx = segment.x - prevSegment.x
                    const dy = segment.y - prevSegment.y
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    const targetDistance = length / segments

                    if (distance > 0) {
                        const ratio = targetDistance / distance
                        segment.x = prevSegment.x + dx * ratio
                        segment.y = prevSegment.y + dy * ratio
                    }

                    // Apply gravity
                    segment.vy += gravity * deltaTime

                    // Apply wind
                    const windX = Math.sin(this.windTime * 2 + windDirection) * windStrength
                    const windY = Math.cos(this.windTime * 1.5 + windDirection) * windStrength * 0.5
                    segment.vx += windX * deltaTime
                    segment.vy += windY * deltaTime

                    // Verlet integration for smooth movement
                    const tempX = segment.x
                    const tempY = segment.y
                    segment.x += (segment.x - segment.prevX) * damping + segment.vx * deltaTime
                    segment.y += (segment.y - segment.prevY) * damping + segment.vy * deltaTime
                    segment.prevX = tempX
                    segment.prevY = tempY

                    // Dampen velocity
                    segment.vx *= damping
                    segment.vy *= damping
                }

                return [...this.segments]
            },

            applyForce(forceX, forceY, segmentIndex = -1) {
                if (segmentIndex === -1) {
                    // Apply to all segments
                    this.segments.forEach(segment => {
                        segment.vx += forceX
                        segment.vy += forceY
                    })
                } else if (segmentIndex < this.segments.length) {
                    this.segments[segmentIndex].vx += forceX
                    this.segments[segmentIndex].vy += forceY
                }
            }
        }
    }

    // Momentum-based animation adjustments
    createMomentumSystem(options = {}) {
        const {
            maxMomentum = 10,
            momentumDecay = 0.9,
            momentumInfluence = 0.3,
            directionSmoothing = 0.8
        } = options

        return {
            momentum: { x: 0, y: 0 },
            smoothedDirection: { x: 0, y: 0 },
            lastVelocity: { x: 0, y: 0 },

            update(deltaTime, velocityX, velocityY, isGrounded = true) {
                // Calculate velocity change
                const deltaVx = velocityX - this.lastVelocity.x
                const deltaVy = velocityY - this.lastVelocity.y
                this.lastVelocity = { x: velocityX, y: velocityY }

                // Build momentum from acceleration
                const acceleration = Math.sqrt(deltaVx * deltaVx + deltaVy * deltaVy)
                if (acceleration > 0.1) {
                    const momentumStrength = Math.min(acceleration * momentumInfluence, maxMomentum)
                    const momentumDirX = deltaVx / acceleration
                    const momentumDirY = deltaVy / acceleration

                    this.momentum.x += momentumDirX * momentumStrength
                    this.momentum.y += momentumDirY * momentumStrength
                }

                // Apply momentum decay
                this.momentum.x *= momentumDecay
                this.momentum.y *= momentumDecay

                // Clamp momentum
                const momentumMagnitude = Math.sqrt(this.momentum.x * this.momentum.x + this.momentum.y * this.momentum.y)
                if (momentumMagnitude > maxMomentum) {
                    this.momentum.x = (this.momentum.x / momentumMagnitude) * maxMomentum
                    this.momentum.y = (this.momentum.y / momentumMagnitude) * maxMomentum
                }

                // Smooth direction changes
                const currentDirection = { x: velocityX, y: velocityY }
                const directionMagnitude = Math.sqrt(currentDirection.x * currentDirection.x + currentDirection.y * currentDirection.y)

                if (directionMagnitude > 0.1) {
                    const normalizedDir = {
                        x: currentDirection.x / directionMagnitude,
                        y: currentDirection.y / directionMagnitude
                    }

                    this.smoothedDirection.x = this.smoothedDirection.x * (1 - directionSmoothing) + normalizedDir.x * directionSmoothing
                    this.smoothedDirection.y = this.smoothedDirection.y * (1 - directionSmoothing) + normalizedDir.y * directionSmoothing
                }

                return {
                    momentum: { ...this.momentum },
                    smoothedDirection: { ...this.smoothedDirection },
                    leanAngle: isGrounded ? Math.atan2(this.momentum.x, Math.abs(this.momentum.y) + 1) * 0.3 : 0,
                    bounceFactor: momentumMagnitude * 0.1,
                    stretchFactor: Math.max(0, momentumMagnitude * 0.05)
                }
            },

            addImpulse(impulseX, impulseY) {
                this.momentum.x += impulseX
                this.momentum.y += impulseY
            }
        }
    }

    // Trail effect for fast movement
    createTrailEffect(maxTrails = 5, fadeSpeed = 0.3) {
        return {
            trails: [],
            lastPosition: null,
            update(deltaTime, currentPosition) {
                // Fade existing trails
                this.trails = this.trails.filter(trail => {
                    trail.alpha -= fadeSpeed * deltaTime
                    return trail.alpha > 0
                })

                // Add new trail if moved enough
                if (this.lastPosition) {
                    const dx = currentPosition.x - this.lastPosition.x
                    const dy = currentPosition.y - this.lastPosition.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance > 10) {
                        this.trails.push({
                            x: this.lastPosition.x,
                            y: this.lastPosition.y,
                            alpha: 0.5,
                            scale: 0.8
                        })

                        if (this.trails.length > maxTrails) {
                            this.trails.shift()
                        }

                        this.lastPosition = { ...currentPosition }
                    }
                } else {
                    this.lastPosition = { ...currentPosition }
                }

                return this.trails
            },
            clear() {
                this.trails = []
            }
        }
    }
}

export class CharacterAnimator {
    constructor() {
        this.controller = new AnimationController()
        this.procedural = new ProceduralAnimator()

        // Enhanced procedural animation instances
        this.breathing = this.procedural.createBreathingAnimation({
            intensity: 0.012,
            speed: 1.8,
            asymmetry: 0.15
        })
        this.squashStretch = this.procedural.createSquashStretch()
        this.wobble = this.procedural.createWobble()
        this.anticipation = this.procedural.createAnticipation()
        this.trail = this.procedural.createTrailEffect()

        // New advanced systems
        this.advancedIK = this.procedural.createAdvancedIK({
            armLength: 22,
            forearmLength: 18,
            damping: 0.75,
            stiffness: 0.4
        })
        this.secondaryMotion = this.procedural.createSecondaryMotion({
            segments: 4,
            length: 12,
            damping: 0.82,
            stiffness: 0.25,
            gravity: 0.3,
            windStrength: 0.08
        })
        this.momentumSystem = this.procedural.createMomentumSystem({
            maxMomentum: 8,
            momentumDecay: 0.88,
            momentumInfluence: 0.25,
            directionSmoothing: 0.75
        })
        
        // State
        this.state = 0 // numeric state code; default to idle
        this.stateName = 'idle'
        this.facing = 'right'
        this.moving = false
        this.attacking = false
        this.blocking = false
        this.rolling = false
        this.hurt = false
        this.jumping = false
        this.doubleJumping = false
        this.wallSliding = false
        this.dashing = false
        this.charging = false
        this.dead = false
        this.landing = false
        
        // Animation blending
        this.blendFactors = {
            idle: 1,
            running: 0,
            attacking: 0,
            blocking: 0,
            rolling: 0,
            hurt: 0,
            jumping: 0,
            doubleJumping: 0,
            landing: 0,
            wallSliding: 0,
            dashing: 0,
            chargingAttack: 0,
            dead: 0
        }
        
        this.targetBlendFactors = { ...this.blendFactors }
        this.blendSpeed = 0.2
    }

    // Helper function to convert numeric WASM state to string for internal use
    getAnimStateName(state) {
        switch(state) {
            case 0: return 'idle'
            case 1: return 'running'
            case 2: return 'attacking'
            case 3: return 'blocking'
            case 4: return 'rolling'
            case 5: return 'hurt'
            case 6: return 'dead'
            case 7: return 'jumping'
            case 8: return 'doubleJumping'
            case 9: return 'landing'
            case 10: return 'wallSliding'
            case 11: return 'dashing'
            case 12: return 'chargingAttack'
            default: return 'idle'
        }
    }

    setAnimState(newState) {
        if (this.state === newState) {return}
        
        this.state = newState
        this.stateName = this.getAnimStateName(newState)
        
        // Update target blend factors
        Object.keys(this.targetBlendFactors).forEach(key => {
            this.targetBlendFactors[key] = 0
        })
        this.targetBlendFactors[this.stateName] = 1
        
        // Play animation based on state
        this.controller.play(this.stateName, { transition: 0.1 })
        
        // Trigger procedural animations
        switch(newState) {
            case 2: // Attacking
                this.anticipation.trigger()
                break
            case 5: // Hurt
                this.squashStretch.trigger()
                this.wobble.impulse(10)
                break
            case 4: // Rolling
                this.trail.clear()
                break
            case 7: // Jumping
                this.squashStretch.trigger()
                break
            case 8: // DoubleJumping
                this.wobble.impulse(5)
                this.trail.clear()
                break
            case 9: // Landing
                this.squashStretch.trigger()
                this.wobble.impulse(15)
                break
            case 11: // Dashing
                this.trail.clear()
                break
            case 12: // ChargingAttack
                this.anticipation.trigger()
                this.wobble.impulse(3)
                break
            case 6: // Death
                this.squashStretch.trigger()
                this.wobble.impulse(20)
                break
        }
    }

    update(deltaTime, position, velocity = { x: 0, y: 0 }, isGrounded = true) {
        // Update animation controller
        this.controller.update(deltaTime)

        // Update blend factors
        Object.keys(this.blendFactors).forEach(key => {
            const diff = this.targetBlendFactors[key] - this.blendFactors[key]
            this.blendFactors[key] += diff * this.blendSpeed
        })

        // Update enhanced breathing with state modulation
        this.breathing.modulateForState(this.stateName)
        const breathing = this.breathing.update(deltaTime)

        // Update momentum system
        const momentumData = this.momentumSystem.update(deltaTime, velocity.x, velocity.y, isGrounded)

        // Update secondary motion (initialize if needed)
        if (this.secondaryMotion.segments.length === 0) {
            this.secondaryMotion.initialize(position.x, position.y - 8)
        }
        const secondaryMotion = this.secondaryMotion.update(deltaTime, position.x, position.y - 8)

        // Update other procedural animations
        const squashStretch = this.squashStretch.update(deltaTime)
        const wobble = this.wobble.update(deltaTime)
        const anticipation = this.anticipation.update(deltaTime)
        const trails = this.trail.update(deltaTime, position)

        // Combine all transformations
        const transform = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            trails: trails,
            secondaryMotion: secondaryMotion,
            momentum: momentumData,
            ik: null // Will be set if weapon/arms are used
        }

        // Apply enhanced breathing
        if (this.blendFactors.idle > 0 || this.blendFactors.running > 0) {
            transform.scaleX *= breathing.scaleX
            transform.scaleY *= breathing.scaleY
            transform.offsetY += breathing.offsetY
        }

        // Apply momentum-based adjustments
        transform.rotation += momentumData.leanAngle
        transform.scaleY *= (1 + momentumData.stretchFactor)
        transform.offsetY += momentumData.bounceFactor * Math.sin(Date.now() * 0.01)

        // Apply squash/stretch
        transform.scaleX *= squashStretch.scaleX
        transform.scaleY *= squashStretch.scaleY

        // Apply wobble
        transform.scaleX *= wobble.scaleX
        transform.scaleY *= wobble.scaleY
        transform.rotation += wobble.rotation

        // Apply anticipation
        if (this.stateName === 'attacking' || this.stateName === 'chargingAttack') {
            transform.scaleX *= anticipation.scaleX
            transform.scaleY *= anticipation.scaleY
            transform.offsetX += anticipation.offsetX
        }

        // Apply facing direction
        if (this.facing === 'left') {
            transform.scaleX *= -1
        }

        return transform
    }

    setFacing(direction) {
        this.facing = direction
    }

    triggerHurt() {
        this.setAnimState(5) // Hurt
        setTimeout(() => {
            if (this.state === 5) { // Hurt
                this.setAnimState(0) // Idle
            }
        }, 300)
    }

    triggerAttack() {
        this.setAnimState(2) // Attack
        setTimeout(() => {
            if (this.state === 2) { // Attack
                this.setAnimState(0) // Idle
            }
        }, 400)
    }

    triggerRoll() {
        this.setAnimState(4) // Roll
        setTimeout(() => {
            if (this.state === 4) { // Roll
                this.setAnimState(0) // Idle
            }
        }, 400)
    }

    triggerBlock() {
        this.setAnimState(3) // Block
    }

    releaseBlock() {
        if (this.state === 3) { // Block
            this.setAnimState(0) // Idle
        }
    }

    setMoving(isMoving) {
        this.moving = isMoving
        if (isMoving && this.state === 0) { // Idle
            this.setAnimState(1) // Run
        } else if (!isMoving && this.state === 1) { // Run
            this.setAnimState(0) // Idle
        }
    }
}

// Animation presets for common game objects
export const AnimationPresets = {
    // Character animations
    createPlayerAnimations() {
        return {
            idle: new Animation('idle', [
                new AnimationFrame(0, 0, 32, 32, 200),
                new AnimationFrame(32, 0, 32, 32, 200),
                new AnimationFrame(64, 0, 32, 32, 200),
                new AnimationFrame(96, 0, 32, 32, 200)
            ]),
            running: new Animation('running', [
                new AnimationFrame(0, 32, 32, 32, 100),
                new AnimationFrame(32, 32, 32, 32, 100),
                new AnimationFrame(64, 32, 32, 32, 100),
                new AnimationFrame(96, 32, 32, 32, 100),
                new AnimationFrame(128, 32, 32, 32, 100),
                new AnimationFrame(160, 32, 32, 32, 100)
            ]),
            attacking: new Animation('attacking', [
                new AnimationFrame(0, 64, 32, 32, 50),
                new AnimationFrame(32, 64, 32, 32, 50),
                new AnimationFrame(64, 64, 32, 32, 100),
                new AnimationFrame(96, 64, 32, 32, 50)
            ], { loop: false }),
            blocking: new Animation('blocking', [
                new AnimationFrame(0, 96, 32, 32, 100)
            ], { loop: false }),
            rolling: new Animation('rolling', [
                new AnimationFrame(0, 128, 32, 32, 50),
                new AnimationFrame(32, 128, 32, 32, 50),
                new AnimationFrame(64, 128, 32, 32, 50),
                new AnimationFrame(96, 128, 32, 32, 50)
            ], { loop: false }),
            hurt: new Animation('hurt', [
                new AnimationFrame(0, 160, 32, 32, 100),
                new AnimationFrame(32, 160, 32, 32, 100)
            ], { loop: false }),
            dead: new Animation('dead', [
                new AnimationFrame(0, 192, 32, 32, 100),
                new AnimationFrame(32, 192, 32, 32, 100),
                new AnimationFrame(64, 192, 32, 32, 100),
                new AnimationFrame(96, 192, 32, 32, 200),
                new AnimationFrame(128, 192, 32, 32, -1) // Final frame, holds indefinitely
            ], { loop: false }),
            jumping: new Animation('jumping', [
                new AnimationFrame(0, 224, 32, 32, 100),
                new AnimationFrame(32, 224, 32, 32, 100),
                new AnimationFrame(64, 224, 32, 32, -1) // Hold in air
            ], { loop: false }),
            doubleJumping: new Animation('doubleJumping', [
                new AnimationFrame(0, 256, 32, 32, 50),
                new AnimationFrame(32, 256, 32, 32, 50),
                new AnimationFrame(64, 256, 32, 32, 50),
                new AnimationFrame(96, 256, 32, 32, 50),
                new AnimationFrame(128, 256, 32, 32, 50),
                new AnimationFrame(160, 256, 32, 32, 50),
                new AnimationFrame(192, 256, 32, 32, 50),
                new AnimationFrame(224, 256, 32, 32, -1) // Complete flip
            ], { loop: false }),
            landing: new Animation('landing', [
                new AnimationFrame(0, 288, 32, 32, 50),
                new AnimationFrame(32, 288, 32, 32, 50),
                new AnimationFrame(64, 288, 32, 32, 100)
            ], { loop: false }),
            wallSliding: new Animation('wallSliding', [
                new AnimationFrame(0, 320, 32, 32, 100),
                new AnimationFrame(32, 320, 32, 32, 100)
            ], { loop: true }),
            dashing: new Animation('dashing', [
                new AnimationFrame(0, 352, 32, 32, 50),
                new AnimationFrame(32, 352, 32, 32, 50),
                new AnimationFrame(64, 352, 32, 32, 100),
                new AnimationFrame(96, 352, 32, 32, 50)
            ], { loop: false }),
            chargingAttack: new Animation('chargingAttack', [
                new AnimationFrame(0, 384, 32, 32, 100),
                new AnimationFrame(32, 384, 32, 32, 100),
                new AnimationFrame(64, 384, 32, 32, 100),
                new AnimationFrame(96, 384, 32, 32, 50),
                new AnimationFrame(128, 384, 32, 32, 50),
                new AnimationFrame(160, 384, 32, 32, 100)
            ], { loop: false })
        }
    },

    // Enemy animations
    createWolfAnimations() {
        return {
            idle: new Animation('idle', [
                new AnimationFrame(0, 0, 48, 32, 300),
                new AnimationFrame(48, 0, 48, 32, 300)
            ]),
            prowl: new Animation('prowl', [
                new AnimationFrame(0, 32, 48, 32, 150),
                new AnimationFrame(48, 32, 48, 32, 150),
                new AnimationFrame(96, 32, 48, 32, 150),
                new AnimationFrame(144, 32, 48, 32, 150)
            ]),
            lunge: new Animation('lunge', [
                new AnimationFrame(0, 64, 48, 32, 50),
                new AnimationFrame(48, 64, 48, 32, 100),
                new AnimationFrame(96, 64, 48, 32, 50)
            ], { loop: false }),
            hurt: new Animation('hurt', [
                new AnimationFrame(0, 96, 48, 32, 100)
            ], { loop: false }),
            howl: new Animation('howl', [
                new AnimationFrame(0, 128, 48, 32, 200),
                new AnimationFrame(48, 128, 48, 32, 300),
                new AnimationFrame(96, 128, 48, 32, 400),
                new AnimationFrame(144, 128, 48, 32, 300),
                new AnimationFrame(192, 128, 48, 32, 200)
            ], { loop: false }),
            death: new Animation('death', [
                new AnimationFrame(0, 160, 48, 32, 100),
                new AnimationFrame(48, 160, 48, 32, 100),
                new AnimationFrame(96, 160, 48, 32, 100),
                new AnimationFrame(144, 160, 48, 32, 200),
                new AnimationFrame(192, 160, 48, 32, -1) // Final frame
            ], { loop: false }),
            packRun: new Animation('packRun', [
                new AnimationFrame(0, 192, 48, 32, 80),
                new AnimationFrame(48, 192, 48, 32, 80),
                new AnimationFrame(96, 192, 48, 32, 80),
                new AnimationFrame(144, 192, 48, 32, 80),
                new AnimationFrame(192, 192, 48, 32, 80),
                new AnimationFrame(240, 192, 48, 32, 80)
            ], { loop: true })
        }
    },

    // Effect animations
    createEffectAnimations() {
        return {
            explosion: new Animation('explosion', [
                new AnimationFrame(0, 0, 64, 64, 50),
                new AnimationFrame(64, 0, 64, 64, 50),
                new AnimationFrame(128, 0, 64, 64, 50),
                new AnimationFrame(192, 0, 64, 64, 50),
                new AnimationFrame(256, 0, 64, 64, 50)
            ], { loop: false }),
            spark: new Animation('spark', [
                new AnimationFrame(0, 64, 32, 32, 30),
                new AnimationFrame(32, 64, 32, 32, 30),
                new AnimationFrame(64, 64, 32, 32, 30)
            ], { loop: false }),
            projectileSpawn: new Animation('projectileSpawn', [
                new AnimationFrame(0, 128, 16, 16, 30),
                new AnimationFrame(16, 128, 16, 16, 30),
                new AnimationFrame(32, 128, 16, 16, 30)
            ], { loop: false }),
            projectileImpact: new Animation('projectileImpact', [
                new AnimationFrame(0, 144, 32, 32, 40),
                new AnimationFrame(32, 144, 32, 32, 40),
                new AnimationFrame(64, 144, 32, 32, 40),
                new AnimationFrame(96, 144, 32, 32, 40)
            ], { loop: false }),
            itemPickup: new Animation('itemPickup', [
                new AnimationFrame(0, 176, 32, 32, 50),
                new AnimationFrame(32, 176, 32, 32, 50),
                new AnimationFrame(64, 176, 32, 32, 50),
                new AnimationFrame(96, 176, 32, 32, 50),
                new AnimationFrame(128, 176, 32, 32, 50)
            ], { loop: false }),
            powerUp: new Animation('powerUp', [
                new AnimationFrame(0, 208, 64, 64, 60),
                new AnimationFrame(64, 208, 64, 64, 60),
                new AnimationFrame(128, 208, 64, 64, 60),
                new AnimationFrame(192, 208, 64, 64, 60),
                new AnimationFrame(256, 208, 64, 64, 60),
                new AnimationFrame(320, 208, 64, 64, 60)
            ], { loop: false })
        }
    }
}

export class WolfAnimator {
    constructor() {
        this.controller = new AnimationController()
        this.procedural = new ProceduralAnimator()
        // ... other procedural animations for wolf
        this.sniffing = this.procedural.createBreathingAnimation({intensity: 0.008, speed: 0.5});
        this.howling = this.procedural.createAnticipation({duration: 0.5, intensity: 0.2});

        this.state = 'idle';
        this.facing = 'right';
    }

    setWolfState(newState) {
        if (this.state === newState) {
            return;
        }
        this.state = newState;
        this.controller.play(newState);
        // Trigger procedural effects specific to wolf
        switch(newState) {
            case 'lunge':
                this.sniffing.modulateForState('attacking');
                break;
            case 'howl':
                this.howling.trigger();
                this.sniffing.modulateForState('idle'); // Breathing for howl anticipation
                break;
            case 'prowl':
                this.sniffing.modulateForState('running');
                break;
            case 'hurt':
                this.sniffing.modulateForState('hurt');
                break;
            case 'death':
                this.sniffing.modulateForState('dead');
                break;
            default:
                this.sniffing.modulateForState('idle');
        }
    }

    update(deltaTime) {
        this.controller.update(deltaTime);
        
        const breathing = this.sniffing.update(deltaTime);
        const howling = this.howling.update(deltaTime);

        const transform = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0
        };

        // Apply breathing
        transform.scaleX *= breathing.scaleX;
        transform.scaleY *= breathing.scaleY;
        transform.offsetY += breathing.offsetY;

        // Apply howling anticipation
        transform.scaleX *= howling.scaleX;
        transform.scaleY *= howling.scaleY;
        transform.offsetX += howling.offsetX;

        // Facing direction
        if (this.facing === 'left') {
            transform.scaleX *= -1;
        }

        return transform;
    }

    setFacing(direction) {
        this.facing = direction;
    }
}

export default {
    Animation,
    AnimationController,
    AnimationFrame,
    ProceduralAnimator,
    CharacterAnimator,
    AnimationPresets,
    WolfAnimator
}