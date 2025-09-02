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
        return this.frames[this.currentFrame]
    }

    getProgress() {
        if (this.frames.length === 0) {return 0}
        return this.currentFrame / (this.frames.length - 1)
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

    addAnimation(animation) {
        this.animations.set(animation.name, animation)
    }

    play(animationName, options = {}) {
        const animation = this.animations.get(animationName)
        if (!animation) {
            console.warn(`Animation not found: ${animationName}`)
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

    // Breathing animation for idle characters
    createBreathingAnimation(baseScale = 1.0, intensity = 0.02, speed = 2) {
        return {
            time: 0,
            update(deltaTime) {
                this.time += deltaTime * speed
                const breathScale = baseScale + Math.sin(this.time) * intensity
                return {
                    scaleX: breathScale,
                    scaleY: baseScale + Math.sin(this.time * 1.2) * intensity * 0.5
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
        
        // Procedural animation instances
        this.breathing = this.procedural.createBreathingAnimation()
        this.squashStretch = this.procedural.createSquashStretch()
        this.wobble = this.procedural.createWobble()
        this.anticipation = this.procedural.createAnticipation()
        this.trail = this.procedural.createTrailEffect()
        
        // State
        this.state = 'idle'
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
            run: 0,
            attack: 0,
            block: 0,
            roll: 0,
            hurt: 0,
            jump: 0,
            doubleJump: 0,
            land: 0,
            wallSlide: 0,
            dash: 0,
            chargeAttack: 0,
            death: 0
        }
        
        this.targetBlendFactors = { ...this.blendFactors }
        this.blendSpeed = 0.2
    }

    setState(newState) {
        if (this.state === newState) {return}
        
        this.state = newState
        
        // Update target blend factors
        Object.keys(this.targetBlendFactors).forEach(key => {
            this.targetBlendFactors[key] = 0
        })
        this.targetBlendFactors[newState] = 1
        
        // Trigger procedural animations
        switch(newState) {
            case 'attack':
                this.anticipation.trigger()
                break
            case 'hurt':
                this.squashStretch.trigger()
                this.wobble.impulse(10)
                break
            case 'roll':
                this.trail.clear()
                break
            case 'jump':
                this.squashStretch.trigger()
                break
            case 'doubleJump':
                this.wobble.impulse(5)
                this.trail.clear()
                break
            case 'land':
                this.squashStretch.trigger()
                this.wobble.impulse(15)
                break
            case 'dash':
                this.trail.clear()
                break
            case 'chargeAttack':
                this.anticipation.trigger()
                this.wobble.impulse(3)
                break
            case 'death':
                this.squashStretch.trigger()
                this.wobble.impulse(20)
                break
        }
    }

    update(deltaTime, position) {
        // Update animation controller
        this.controller.update(deltaTime)
        
        // Update blend factors
        Object.keys(this.blendFactors).forEach(key => {
            const diff = this.targetBlendFactors[key] - this.blendFactors[key]
            this.blendFactors[key] += diff * this.blendSpeed
        })
        
        // Update procedural animations
        const breathing = this.breathing.update(deltaTime)
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
            trails: trails
        }
        
        // Apply breathing when idle
        if (this.blendFactors.idle > 0) {
            transform.scaleX *= breathing.scaleX
            transform.scaleY *= breathing.scaleY
        }
        
        // Apply squash/stretch
        transform.scaleX *= squashStretch.scaleX
        transform.scaleY *= squashStretch.scaleY
        
        // Apply wobble
        transform.scaleX *= wobble.scaleX
        transform.scaleY *= wobble.scaleY
        transform.rotation += wobble.rotation
        
        // Apply anticipation
        if (this.state === 'attack') {
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
        this.setState('hurt')
        setTimeout(() => {
            if (this.state === 'hurt') {
                this.setState('idle')
            }
        }, 300)
    }

    triggerAttack() {
        this.setState('attack')
        setTimeout(() => {
            if (this.state === 'attack') {
                this.setState('idle')
            }
        }, 400)
    }

    triggerRoll() {
        this.setState('roll')
        setTimeout(() => {
            if (this.state === 'roll') {
                this.setState('idle')
            }
        }, 300)
    }

    triggerBlock() {
        this.setState('block')
    }

    releaseBlock() {
        if (this.state === 'block') {
            this.setState('idle')
        }
    }

    setMoving(isMoving) {
        this.moving = isMoving
        if (isMoving && this.state === 'idle') {
            this.setState('run')
        } else if (!isMoving && this.state === 'run') {
            this.setState('idle')
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
            run: new Animation('run', [
                new AnimationFrame(0, 32, 32, 32, 100),
                new AnimationFrame(32, 32, 32, 32, 100),
                new AnimationFrame(64, 32, 32, 32, 100),
                new AnimationFrame(96, 32, 32, 32, 100),
                new AnimationFrame(128, 32, 32, 32, 100),
                new AnimationFrame(160, 32, 32, 32, 100)
            ]),
            attack: new Animation('attack', [
                new AnimationFrame(0, 64, 32, 32, 50),
                new AnimationFrame(32, 64, 32, 32, 50),
                new AnimationFrame(64, 64, 32, 32, 100),
                new AnimationFrame(96, 64, 32, 32, 50)
            ], { loop: false }),
            block: new Animation('block', [
                new AnimationFrame(0, 96, 32, 32, 100)
            ], { loop: false }),
            roll: new Animation('roll', [
                new AnimationFrame(0, 128, 32, 32, 50),
                new AnimationFrame(32, 128, 32, 32, 50),
                new AnimationFrame(64, 128, 32, 32, 50),
                new AnimationFrame(96, 128, 32, 32, 50)
            ], { loop: false }),
            hurt: new Animation('hurt', [
                new AnimationFrame(0, 160, 32, 32, 100),
                new AnimationFrame(32, 160, 32, 32, 100)
            ], { loop: false }),
            death: new Animation('death', [
                new AnimationFrame(0, 192, 32, 32, 100),
                new AnimationFrame(32, 192, 32, 32, 100),
                new AnimationFrame(64, 192, 32, 32, 100),
                new AnimationFrame(96, 192, 32, 32, 200),
                new AnimationFrame(128, 192, 32, 32, -1) // Final frame, holds indefinitely
            ], { loop: false }),
            jump: new Animation('jump', [
                new AnimationFrame(0, 224, 32, 32, 100),
                new AnimationFrame(32, 224, 32, 32, 100),
                new AnimationFrame(64, 224, 32, 32, -1) // Hold in air
            ], { loop: false }),
            doubleJump: new Animation('doubleJump', [
                new AnimationFrame(0, 256, 32, 32, 50),
                new AnimationFrame(32, 256, 32, 32, 50),
                new AnimationFrame(64, 256, 32, 32, 50),
                new AnimationFrame(96, 256, 32, 32, 50),
                new AnimationFrame(128, 256, 32, 32, 50),
                new AnimationFrame(160, 256, 32, 32, 50),
                new AnimationFrame(192, 256, 32, 32, 50),
                new AnimationFrame(224, 256, 32, 32, -1) // Complete flip
            ], { loop: false }),
            land: new Animation('land', [
                new AnimationFrame(0, 288, 32, 32, 50),
                new AnimationFrame(32, 288, 32, 32, 50),
                new AnimationFrame(64, 288, 32, 32, 100)
            ], { loop: false }),
            wallSlide: new Animation('wallSlide', [
                new AnimationFrame(0, 320, 32, 32, 100),
                new AnimationFrame(32, 320, 32, 32, 100)
            ], { loop: true }),
            dash: new Animation('dash', [
                new AnimationFrame(0, 352, 32, 32, 50),
                new AnimationFrame(32, 352, 32, 32, 50),
                new AnimationFrame(64, 352, 32, 32, 100),
                new AnimationFrame(96, 352, 32, 32, 50)
            ], { loop: false }),
            chargeAttack: new Animation('chargeAttack', [
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

export default {
    Animation,
    AnimationController,
    AnimationFrame,
    ProceduralAnimator,
    CharacterAnimator,
    AnimationPresets
}