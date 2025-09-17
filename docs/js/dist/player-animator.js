// Advanced Animation System for Smooth Character and Object Animations
// Provides sprite animations, procedural animations, and smooth transitions

class AnimationFrame {
    constructor(x, y, width, height, duration = 100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.duration = duration; // milliseconds
    }
}

class Animation {
    constructor(name, frames, options = {}) {
        this.name = name;
        this.frames = frames;
        this.loop = options.loop !== null && options.loop !== void 0 ? options.loop : true;
        this.pingPong = options.pingPong || false;
        this.speed = options.speed || 1.0;
        this.onComplete = options.onComplete || null;
        this.onFrame = options.onFrame || null;
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
        this.isPlaying = false;
        this.hasCompleted = false;
    }

    play() {
        this.isPlaying = true;
        this.hasCompleted = false;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
    }

    stop() {
        this.isPlaying = false;
        this.reset();
    }

    pause() {
        this.isPlaying = false;
    }

    resume() {
        this.isPlaying = true;
    }

    reset() {
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
        this.hasCompleted = false;
    }

    update(deltaTime) {
        if (!this.isPlaying || this.frames.length === 0) {
            return
        }

        this.elapsedTime += deltaTime * this.speed * 1000; // Convert to milliseconds

        const currentFrameData = this.frames[this.currentFrame];

        // Handle frames with non-positive duration as indefinite holds
        if (currentFrameData && currentFrameData.duration <= 0) {
            if (!this.loop && this.currentFrame === this.frames.length - 1) {
                this.isPlaying = false;
                this.hasCompleted = true;
                if (this.onComplete) {this.onComplete();}
            }
            return
        }

        if (this.elapsedTime >= currentFrameData.duration) {
            this.elapsedTime -= currentFrameData.duration;
            
            const previousFrame = this.currentFrame;
            this.currentFrame += this.direction;

            if (this.pingPong) {
                if (this.currentFrame >= this.frames.length || this.currentFrame < 0) {
                    this.direction *= -1;
                    this.currentFrame += this.direction * 2;
                }
            } else if (this.currentFrame >= this.frames.length) {
                    if (this.loop) {
                        this.currentFrame = 0;
                    } else {
                        this.currentFrame = this.frames.length - 1;
                        this.isPlaying = false;
                        this.hasCompleted = true;
                        if (this.onComplete) {this.onComplete();}
                    }
                }

            if (this.onFrame && this.currentFrame !== previousFrame) {
                this.onFrame(this.currentFrame, this.frames[this.currentFrame]);
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

class AnimationController {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.transitions = new Map();
        this.blendTime = 0;
        this.blendFrom = null;
        this.blendProgress = 0;
    }

    addAnimation(nameOrAnimation, maybeAnimation) {
        if (typeof nameOrAnimation === 'string' && maybeAnimation) {
            this.animations.set(nameOrAnimation, maybeAnimation);
            return
        }
        const animation = nameOrAnimation;
        this.animations.set(animation.name, animation);
    }

    play(animationName, options = {}) {
        const animation = this.animations.get(animationName);
        if (!animation) {
            // Animation not found: ${animationName}
            return
        }

        const transition = options.transition || 0;
        
        if (transition > 0 && this.currentAnimation) {
            this.blendFrom = this.currentAnimation;
            this.blendTime = transition;
            this.blendProgress = 0;
        }

        this.currentAnimation = animation;
        animation.play();
    }

    stop() {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
    }

    update(deltaTime) {
        if (this.blendTime > 0) {
            this.blendProgress += deltaTime;
            if (this.blendProgress >= this.blendTime) {
                this.blendTime = 0;
                this.blendFrom = null;
                this.blendProgress = 0;
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.update(deltaTime);
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

        const blendFactor = this.blendProgress / this.blendTime;
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
            this.currentAnimation.speed = speed;
        }
    }
}

class ProceduralAnimator {
    constructor() {
        this.animations = new Map();
    }

    // Enhanced breathing animation with state-based modulation
    createBreathingAnimation(options = {}) {
        const {
            baseScale = 1.0,
            intensity = 0.015,
            speed = 2.0,
            asymmetry = 0.2
        } = options;

        return {
            time: 0,
            phase: 0,
            breathRate: speed,
            currentIntensity: intensity,
            depthMod: 1.0,
            asymmetryOffset: 0,
            _buf: {
                scaleX: baseScale,
                scaleY: baseScale,
                offsetY: 0,
                chestExpansion: 0,
                phase: 0,
                intensity: 0
            },

            // State-based modulation
            modulateForState(state) {
                switch(state) {
                    case 'running':
                        this.depthMod = 0.3;
                        this.breathRate = speed * 3.0;
                        break
                    case 'attacking':
                        this.depthMod = 0.5;
                        this.breathRate = speed * 1.8;
                        break
                    case 'blocking':
                        this.depthMod = 0.2;
                        this.breathRate = speed * 1.3;
                        break
                    case 'hurt':
                        this.depthMod = 0.1;
                        this.breathRate = speed * 0.5;
                        break
                    case 'dead':
                        this.depthMod = 0.0;
                        this.breathRate = 0.0;
                        break
                    default: // idle, rolling
                        this.depthMod = 1.0;
                        this.breathRate = speed;
                }
            },

            update(deltaTime) {
                const res = this._buf;

                if (this.breathRate <= 0) {
                    res.scaleX = baseScale;
                    res.scaleY = baseScale;
                    res.offsetY = 0;
                    res.chestExpansion = 0;
                    res.phase = 0;
                    res.intensity = 0;
                    return res
                }

                this.time += deltaTime * this.breathRate;
                this.phase = Math.sin(this.time);

                // Calculate breathing with realistic parameters
                const currentIntensity = this.currentIntensity * this.depthMod;
                const breathScaleX = baseScale + this.phase * currentIntensity;
                const breathScaleY = baseScale + this.phase * currentIntensity * 0.7;

                // Add slight asymmetry for more natural feel
                const asymmetryFactor = Math.sin(this.time * 0.7) * asymmetry;
                const finalScaleX = breathScaleX + asymmetryFactor * currentIntensity * 0.3;

                // Chest expansion effect (subtle upward movement)
                const chestExpansion = this.phase * currentIntensity * 2;

                // Smooth transitions
                const smoothFactor = 1 - Math.exp(-deltaTime * 5);
                this.currentIntensity = this.currentIntensity + (currentIntensity - this.currentIntensity) * smoothFactor;

                res.scaleX = finalScaleX;
                res.scaleY = breathScaleY;
                res.offsetY = -chestExpansion * 0.5;
                res.chestExpansion = chestExpansion;
                res.phase = this.phase;
                res.intensity = currentIntensity;
                return res
            }
        }
    }

    // Bobbing animation for floating objects
    createBobbingAnimation(amplitude = 5, speed = 2) {
        return {
            time: 0,
            _buf: { offsetY: 0, rotation: 0 },
            update(deltaTime) {
                this.time += deltaTime * speed;
                const res = this._buf;
                res.offsetY = Math.sin(this.time) * amplitude;
                res.rotation = Math.sin(this.time * 0.5) * 0.05;
                return res
            }
        }
    }

    // Squash and stretch for impacts and jumps
    createSquashStretch(intensity = 0.3, duration = 0.2) {
        return {
            time: 0,
            active: false,
            _buf: { scaleX: 1, scaleY: 1 },
            trigger() {
                this.time = 0;
                this.active = true;
            },
            update(deltaTime) {
                const res = this._buf;

                if (!this.active) {
                    res.scaleX = 1;
                    res.scaleY = 1;
                    return res
                }

                this.time += deltaTime;
                const progress = Math.min(this.time / duration, 1);

                if (progress >= 1) {
                    this.active = false;
                    res.scaleX = 1;
                    res.scaleY = 1;
                    return res
                }

                // Elastic easing
                const t = progress;
                const p = 0.3;
                const s = p / 4;
                const postFix = 2**(-10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;

                const squash = 1 - postFix * intensity;
                const stretch = 1 + postFix * intensity * 0.5;

                res.scaleX = progress < 0.5 ? stretch : squash;
                res.scaleY = progress < 0.5 ? squash : stretch;
                return res
            }
        }
    }

    // Wobble effect for jelly-like movement
    createWobble(frequency = 10, damping = 0.8, intensity = 0.1) {
        return {
            velocity: 0,
            displacement: 0,
            _buf: { scaleX: 1, scaleY: 1, rotation: 0 },
            update(deltaTime, force = 0) {
                // Spring physics
                const springForce = -frequency * this.displacement;
                const dampingForce = -damping * this.velocity;

                this.velocity += (springForce + dampingForce + force) * deltaTime;
                this.displacement += this.velocity * deltaTime;

                const res = this._buf;
                res.scaleX = 1 + this.displacement * intensity;
                res.scaleY = 1 - this.displacement * intensity * 0.5;
                res.rotation = this.displacement * 0.1;
                return res
            },
            impulse(force) {
                this.velocity += force;
            }
        }
    }

    // Anticipation animation for attacks
    createAnticipation(duration = 0.3, intensity = 0.15) {
        return {
            time: 0,
            active: false,
            phase: 'idle', // idle, anticipation, action, recovery
            _buf: { scaleX: 1, scaleY: 1, offsetX: 0 },
            trigger() {
                this.time = 0;
                this.active = true;
                this.phase = 'anticipation';
            },
            update(deltaTime) {
                const res = this._buf;
                if (!this.active) {
                    res.scaleX = 1;
                    res.scaleY = 1;
                    res.offsetX = 0;
                    return res
                }

                this.time += deltaTime;

                if (this.phase === 'anticipation') {
                    const progress = Math.min(this.time / (duration * 0.4), 1);
                    const eased = 1 - Math.cos(progress * Math.PI * 0.5);

                    if (progress >= 1) {
                        this.phase = 'action';
                        this.time = 0;
                    }

                    res.scaleX = 1 - eased * intensity;
                    res.scaleY = 1 + eased * intensity * 0.5;
                    res.offsetX = -eased * 10;
                    return res
                } else if (this.phase === 'action') {
                    const progress = Math.min(this.time / (duration * 0.2), 1);
                    const eased = Math.sin(progress * Math.PI * 0.5);

                    if (progress >= 1) {
                        this.phase = 'recovery';
                        this.time = 0;
                    }

                    res.scaleX = 1 + eased * intensity * 2;
                    res.scaleY = 1 - eased * intensity;
                    res.offsetX = eased * 20;
                    return res
                } else if (this.phase === 'recovery') {
                    const progress = Math.min(this.time / (duration * 0.4), 1);
                    const eased = 1 - (1 - progress)**3;

                    if (progress >= 1) {
                        this.active = false;
                        this.phase = 'idle';
                    }

                    res.scaleX = 1 + (1 - eased) * intensity * 0.5;
                    res.scaleY = 1 - (1 - eased) * intensity * 0.25;
                    res.offsetX = (1 - eased) * 10;
                    return res
                }

                res.scaleX = 1;
                res.scaleY = 1;
                res.offsetX = 0;
                return res
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
        } = options;

        return {
            shoulder: { x: 0, y: 0 },
            elbow: { x: 0, y: 0 },
            hand: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            targetVelocity: { x: 0, y: 0 },
            _buf: {
                shoulder: { x: 0, y: 0 },
                elbow: { x: 0, y: 0 },
                hand: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                reach: 0,
                stiffness: 0
            },

            // Two-bone IK solver (CCD - Cyclic Coordinate Descent)
            solveIK(targetX, targetY, shoulderX, shoulderY) {
                this.target.x = targetX;
                this.target.y = targetY;
                this.shoulder.x = shoulderX;
                this.shoulder.y = shoulderY;

                // Calculate distance to target
                const dx = targetX - shoulderX;
                const dy = targetY - shoulderY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Clamp to maximum reach
                const clampedDistance = Math.min(distance, maxReach);
                const scale = clampedDistance / distance;
                const clampedTargetX = shoulderX + dx * scale;
                const clampedTargetY = shoulderY + dy * scale;

                // Solve for elbow and hand positions
                const totalLength = armLength + forearmLength;
                const cosAngle = Math.max(-1, Math.min(1, clampedDistance / totalLength));

                // Law of cosines for elbow angle
                const elbowAngle = Math.acos(cosAngle);
                const shoulderAngle = Math.atan2(clampedTargetY - shoulderY, clampedTargetX - shoulderX);

                // Position elbow
                this.elbow.x = shoulderX + Math.cos(shoulderAngle - elbowAngle * 0.5) * armLength;
                this.elbow.y = shoulderY + Math.sin(shoulderAngle - elbowAngle * 0.5) * armLength;

                // Position hand
                this.hand.x = this.elbow.x + Math.cos(shoulderAngle + elbowAngle * 0.5) * forearmLength;
                this.hand.y = this.elbow.y + Math.sin(shoulderAngle + elbowAngle * 0.5) * forearmLength;

                const res = this._buf;
                res.shoulder.x = this.shoulder.x;
                res.shoulder.y = this.shoulder.y;
                res.elbow.x = this.elbow.x;
                res.elbow.y = this.elbow.y;
                res.hand.x = this.hand.x;
                res.hand.y = this.hand.y;
                res.target.x = clampedTargetX;
                res.target.y = clampedTargetY;
                res.reach = clampedDistance / totalLength;
                return res
            },

            // Smooth IK with velocity prediction
            update(deltaTime, targetX, targetY, shoulderX, shoulderY) {
                // Predict target position based on velocity
                const predictedTargetX = targetX + this.targetVelocity.x * deltaTime * 0.1;
                const predictedTargetY = targetY + this.targetVelocity.y * deltaTime * 0.1;

                // Update target velocity for smoothing
                this.targetVelocity.x = (predictedTargetX - this.target.x) / deltaTime * damping;
                this.targetVelocity.y = (predictedTargetY - this.target.y) / deltaTime * damping;

                // Solve IK with damping
                const solution = this.solveIK(predictedTargetX, predictedTargetY, shoulderX, shoulderY);

                // Apply stiffness damping to joints
                const stiffnessFactor = 1 - Math.exp(-stiffness * deltaTime);

                const res = this._buf;
                res.shoulder.x = solution.shoulder.x;
                res.shoulder.y = solution.shoulder.y;
                res.elbow.x = solution.elbow.x;
                res.elbow.y = solution.elbow.y;
                res.hand.x = solution.hand.x;
                res.hand.y = solution.hand.y;
                res.target.x = solution.target.x;
                res.target.y = solution.target.y;
                res.reach = solution.reach;
                res.stiffness = stiffnessFactor;
                return res
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
        } = options;

        return {
            segments: [],
            anchorPoint: { x: 0, y: 0 },
            windTime: 0,
            _segBuf: [],

            initialize(anchorX, anchorY) {
                this.anchorPoint = { x: anchorX, y: anchorY };
                this.segments = [];

                // Create chain segments
                for (let i = 0; i < segments; i++) {
                    this.segments.push({
                        x: anchorX,
                        y: anchorY + i * (length / segments),
                        vx: 0,
                        vy: 0,
                        prevX: anchorX,
                        prevY: anchorY + i * (length / segments)
                    });
                }
            },

            update(deltaTime, anchorX, anchorY, windDirection = 0) {
                this.anchorPoint.x = anchorX;
                this.anchorPoint.y = anchorY;
                this.windTime += deltaTime;

                // Update anchor point
                this.segments[0].x = anchorX;
                this.segments[0].y = anchorY;

                // Simulate chain physics
                for (let i = 1; i < this.segments.length; i++) {
                    const segment = this.segments[i];
                    const prevSegment = this.segments[i - 1];

                    // Calculate desired position (maintain distance from previous segment)
                    const dx = segment.x - prevSegment.x;
                    const dy = segment.y - prevSegment.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const targetDistance = length / segments;

                    if (distance > 0) {
                        const ratio = targetDistance / distance;
                        segment.x = prevSegment.x + dx * ratio;
                        segment.y = prevSegment.y + dy * ratio;
                    }

                    // Apply gravity
                    segment.vy += gravity * deltaTime;

                    // Apply wind
                    const windX = Math.sin(this.windTime * 2 + windDirection) * windStrength;
                    const windY = Math.cos(this.windTime * 1.5 + windDirection) * windStrength * 0.5;
                    segment.vx += windX * deltaTime;
                    segment.vy += windY * deltaTime;

                    // Verlet integration for smooth movement
                    const tempX = segment.x;
                    const tempY = segment.y;
                    segment.x += (segment.x - segment.prevX) * damping + segment.vx * deltaTime;
                    segment.y += (segment.y - segment.prevY) * damping + segment.vy * deltaTime;
                    segment.prevX = tempX;
                    segment.prevY = tempY;

                    // Dampen velocity
                    segment.vx *= damping;
                    segment.vy *= damping;
                }

                if (!this._segBuf || this._segBuf.length !== this.segments.length) {
                    this._segBuf = new Array(this.segments.length);
                }
                for (let i = 0; i < this.segments.length; i++) {
                    this._segBuf[i] = this.segments[i];
                }
                return this._segBuf
            },

            applyForce(forceX, forceY, segmentIndex = -1) {
                if (segmentIndex === -1) {
                    // Apply to all segments
                    this.segments.forEach(segment => {
                        segment.vx += forceX;
                        segment.vy += forceY;
                    });
                } else if (segmentIndex < this.segments.length) {
                    this.segments[segmentIndex].vx += forceX;
                    this.segments[segmentIndex].vy += forceY;
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
        } = options;

        return {
            momentum: { x: 0, y: 0 },
            smoothedDirection: { x: 0, y: 0 },
            lastVelocity: { x: 0, y: 0 },
            _buf: {
                momentum: { x: 0, y: 0 },
                smoothedDirection: { x: 0, y: 0 },
                leanAngle: 0,
                bounceFactor: 0,
                stretchFactor: 0
            },

            update(deltaTime, velocityX, velocityY, isGrounded = true) {
                // Calculate velocity change
                const deltaVx = velocityX - this.lastVelocity.x;
                const deltaVy = velocityY - this.lastVelocity.y;
                this.lastVelocity = { x: velocityX, y: velocityY };

                // Build momentum from acceleration
                const acceleration = Math.sqrt(deltaVx * deltaVx + deltaVy * deltaVy);
                if (acceleration > 0.1) {
                    const momentumStrength = Math.min(acceleration * momentumInfluence, maxMomentum);
                    const momentumDirX = deltaVx / acceleration;
                    const momentumDirY = deltaVy / acceleration;

                    this.momentum.x += momentumDirX * momentumStrength;
                    this.momentum.y += momentumDirY * momentumStrength;
                }

                // Apply momentum decay
                this.momentum.x *= momentumDecay;
                this.momentum.y *= momentumDecay;

                // Clamp momentum
                const momentumMagnitude = Math.sqrt(this.momentum.x * this.momentum.x + this.momentum.y * this.momentum.y);
                if (momentumMagnitude > maxMomentum) {
                    this.momentum.x = (this.momentum.x / momentumMagnitude) * maxMomentum;
                    this.momentum.y = (this.momentum.y / momentumMagnitude) * maxMomentum;
                }

                // Smooth direction changes
                const currentDirection = { x: velocityX, y: velocityY };
                const directionMagnitude = Math.sqrt(currentDirection.x * currentDirection.x + currentDirection.y * currentDirection.y);

                if (directionMagnitude > 0.1) {
                    const normalizedDir = {
                        x: currentDirection.x / directionMagnitude,
                        y: currentDirection.y / directionMagnitude
                    };

                    this.smoothedDirection.x = this.smoothedDirection.x * (1 - directionSmoothing) + normalizedDir.x * directionSmoothing;
                    this.smoothedDirection.y = this.smoothedDirection.y * (1 - directionSmoothing) + normalizedDir.y * directionSmoothing;
                }

                const res = this._buf;
                res.momentum.x = this.momentum.x;
                res.momentum.y = this.momentum.y;
                res.smoothedDirection.x = this.smoothedDirection.x;
                res.smoothedDirection.y = this.smoothedDirection.y;
                res.leanAngle = isGrounded ? Math.atan2(this.momentum.x, Math.abs(this.momentum.y) + 1) * 0.3 : 0;
                res.bounceFactor = momentumMagnitude * 0.1;
                res.stretchFactor = Math.max(0, momentumMagnitude * 0.05);
                return res
            },

            addImpulse(impulseX, impulseY) {
                this.momentum.x += impulseX;
                this.momentum.y += impulseY;
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
                    trail.alpha -= fadeSpeed * deltaTime;
                    return trail.alpha > 0
                });

                // Add new trail if moved enough
                if (this.lastPosition) {
                    const dx = currentPosition.x - this.lastPosition.x;
                    const dy = currentPosition.y - this.lastPosition.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 10) {
                        this.trails.push({
                            x: this.lastPosition.x,
                            y: this.lastPosition.y,
                            alpha: 0.5,
                            scale: 0.8
                        });

                        if (this.trails.length > maxTrails) {
                            this.trails.shift();
                        }

                        this.lastPosition = { ...currentPosition };
                    }
                } else {
                    this.lastPosition = { ...currentPosition };
                }

                return this.trails
            },
            clear() {
                this.trails = [];
            }
        }
    }
}

class CharacterAnimator {
    constructor() {
        this.controller = new AnimationController();
        this.procedural = new ProceduralAnimator();

        // Enhanced procedural animation instances
        this.breathing = this.procedural.createBreathingAnimation({
            intensity: 0.012,
            speed: 1.8,
            asymmetry: 0.15
        });
        this.squashStretch = this.procedural.createSquashStretch();
        this.wobble = this.procedural.createWobble();
        this.anticipation = this.procedural.createAnticipation();
        this.trail = this.procedural.createTrailEffect();

        // New advanced systems
        this.advancedIK = this.procedural.createAdvancedIK({
            armLength: 22,
            forearmLength: 18,
            damping: 0.75,
            stiffness: 0.4
        });
        this.secondaryMotion = this.procedural.createSecondaryMotion({
            segments: 4,
            length: 12,
            damping: 0.82,
            stiffness: 0.25,
            gravity: 0.3,
            windStrength: 0.08
        });
        this.momentumSystem = this.procedural.createMomentumSystem({
            maxMomentum: 8,
            momentumDecay: 0.88,
            momentumInfluence: 0.25,
            directionSmoothing: 0.75
        });
        
        // State
        this.state = 0; // numeric state code; default to idle
        this.stateName = 'idle';
        this.facing = 'right';
        this.moving = false;
        this.attacking = false;
        this.blocking = false;
        this.rolling = false;
        this.hurt = false;
        this.jumping = false;
        this.doubleJumping = false;
        this.wallSliding = false;
        this.dashing = false;
        this.charging = false;
        this.dead = false;
        this.landing = false;
        
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
        };
        
        this.targetBlendFactors = { ...this.blendFactors };
        this.blendSpeed = 0.2;

        // Internal timers for temporary states
        this.hurtTimer = 0;
        this.attackTimer = 0;
        this.rollTimer = 0;
    }

    resetActionTimers() {
        this.hurtTimer = 0;
        this.attackTimer = 0;
        this.rollTimer = 0;
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
        this.resetActionTimers();

        this.state = newState;
        this.stateName = this.getAnimStateName(newState);
        
        // Update target blend factors
        Object.keys(this.targetBlendFactors).forEach(key => {
            this.targetBlendFactors[key] = 0;
        });
        this.targetBlendFactors[this.stateName] = 1;
        
        // Play animation based on state
        this.controller.play(this.stateName, { transition: 0.1 });
        
        // Trigger procedural animations
        switch(newState) {
            case 2: // Attacking
                this.anticipation.trigger();
                break
            case 5: // Hurt
                this.squashStretch.trigger();
                this.wobble.impulse(10);
                break
            case 4: // Rolling
                this.trail.clear();
                break
            case 7: // Jumping
                this.squashStretch.trigger();
                break
            case 8: // DoubleJumping
                this.wobble.impulse(5);
                this.trail.clear();
                break
            case 9: // Landing
                this.squashStretch.trigger();
                this.wobble.impulse(15);
                break
            case 11: // Dashing
                this.trail.clear();
                break
            case 12: // ChargingAttack
                this.anticipation.trigger();
                this.wobble.impulse(3);
                break
            case 6: // Death
                this.squashStretch.trigger();
                this.wobble.impulse(20);
                break
        }
    }

    update(deltaTime, position, velocity = { x: 0, y: 0 }, isGrounded = true) {
        // Update state timers
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            if (this.hurtTimer <= 0 && this.state === 5) {
                this.setAnimState(0); // Idle
            }
        }
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0 && this.state === 2) {
                this.setAnimState(0); // Idle
            }
        }
        if (this.rollTimer > 0) {
            this.rollTimer -= deltaTime;
            if (this.rollTimer <= 0 && this.state === 4) {
                this.setAnimState(0); // Idle
            }
        }

        // Update animation controller
        this.controller.update(deltaTime);

        // Update blend factors
        Object.keys(this.blendFactors).forEach(key => {
            const diff = this.targetBlendFactors[key] - this.blendFactors[key];
            this.blendFactors[key] += diff * this.blendSpeed;
        });

        // Update enhanced breathing with state modulation
        this.breathing.modulateForState(this.stateName);
        const breathing = this.breathing.update(deltaTime);

        // Update momentum system
        const momentumData = this.momentumSystem.update(deltaTime, velocity.x, velocity.y, isGrounded);

        // Update secondary motion (initialize if needed)
        if (this.secondaryMotion.segments.length === 0) {
            this.secondaryMotion.initialize(position.x, position.y - 8);
        }
        const secondaryMotion = this.secondaryMotion.update(deltaTime, position.x, position.y - 8);

        // Update other procedural animations
        const squashStretch = this.squashStretch.update(deltaTime);
        const wobble = this.wobble.update(deltaTime);
        const anticipation = this.anticipation.update(deltaTime);
        const trails = this.trail.update(deltaTime, position);

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
        };

        // Apply enhanced breathing
        if (this.blendFactors.idle > 0 || this.blendFactors.running > 0) {
            transform.scaleX *= breathing.scaleX;
            transform.scaleY *= breathing.scaleY;
            transform.offsetY += breathing.offsetY;
        }

        // Apply momentum-based adjustments
        transform.rotation += momentumData.leanAngle;
        transform.scaleY *= (1 + momentumData.stretchFactor);
        transform.offsetY += momentumData.bounceFactor * Math.sin(Date.now() * 0.01);

        // Apply squash/stretch
        transform.scaleX *= squashStretch.scaleX;
        transform.scaleY *= squashStretch.scaleY;

        // Apply wobble
        transform.scaleX *= wobble.scaleX;
        transform.scaleY *= wobble.scaleY;
        transform.rotation += wobble.rotation;

        // Apply anticipation
        if (this.stateName === 'attacking' || this.stateName === 'chargingAttack') {
            transform.scaleX *= anticipation.scaleX;
            transform.scaleY *= anticipation.scaleY;
            transform.offsetX += anticipation.offsetX;
        }

        // Apply facing direction
        if (this.facing === 'left') {
            transform.scaleX *= -1;
        }

        return transform
    }

    setFacing(direction) {
        this.facing = direction;
    }

    triggerHurt() {
        this.setAnimState(5); // Hurt
        this.hurtTimer = 300;
    }

    triggerAttack() {
        this.setAnimState(2); // Attack
        this.attackTimer = 400;
    }

    triggerRoll() {
        this.setAnimState(4); // Roll
        this.rollTimer = 400;
    }

    triggerBlock() {
        this.setAnimState(3); // Block
    }

    releaseBlock() {
        if (this.state === 3) { // Block
            this.setAnimState(0); // Idle
        }
    }

    setMoving(isMoving) {
        this.moving = isMoving;
        if (isMoving && this.state === 0) { // Idle
            this.setAnimState(1); // Run
        } else if (!isMoving && this.state === 1) { // Run
            this.setAnimState(0); // Idle
        }
    }
}

// Animation presets for common game objects
const AnimationPresets = {
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
};

/**
 * Realistic Procedural Animation System
 * Advanced physics-based animation that integrates with WASM for realistic character movement
 * Features: IK, secondary motion, environmental responses, and anatomically correct movement
 */

class RealisticProceduralAnimator {
    constructor(options = {}) {
        // Configuration
        this.config = {
            // IK System
            ikEnabled: options.ikEnabled !== false,
            armLength: options.armLength || 20,
            forearmLength: options.forearmLength || 16,
            thighLength: options.thighLength || 18,
            shinLength: options.shinLength || 16,
            
            // Physics
            gravity: options.gravity || 0.3,
            damping: options.damping || 0.85,
            stiffness: options.stiffness || 0.4,
            
            // Visual
            renderSkeleton: options.renderSkeleton || false,
            renderIKTargets: options.renderIKTargets || false,
            renderSecondaryMotion: options.renderSecondaryMotion || false,
            
            // Performance
            updateRate: options.updateRate || 60,
            enableOptimizations: options.enableOptimizations !== false
        };
        
        // Animation state
        this.state = {
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            facing: 1,
            isGrounded: true,
            
            // Body segments
            head: { x: 0, y: -25, rotation: 0 },
            torso: { x: 0, y: -15, rotation: 0 },
            pelvis: { x: 0, y: 0, rotation: 0 },
            
            // Arms
            leftShoulder: { x: -8, y: -20 },
            leftElbow: { x: -12, y: -10 },
            leftHand: { x: -15, y: 0 },
            rightShoulder: { x: 8, y: -20 },
            rightElbow: { x: 12, y: -10 },
            rightHand: { x: 15, y: 0 },
            
            // Legs
            leftHip: { x: -4, y: 0 },
            leftKnee: { x: -6, y: 10 },
            leftFoot: { x: -8, y: 20 },
            rightHip: { x: 4, y: 0 },
            rightKnee: { x: 6, y: 10 },
            rightFoot: { x: 8, y: 20 }
        };
        
        // IK Solver
        this.ikSolver = new AdvancedIKSolver({
            armLength: this.config.armLength,
            forearmLength: this.config.forearmLength,
            thighLength: this.config.thighLength,
            shinLength: this.config.shinLength
        });
        
        // Secondary motion systems
        this.secondaryMotion = new SecondaryMotionSystem();
        this.clothPhysics = new ClothPhysicsSystem();
        this.facialAnimator = new FacialAnimationSystem();
        
        // Performance optimization
        this.frameCount = 0;
        this.lastUpdate = 0;
        this.cachedTransforms = new Map();
        
        // Environmental response
        this.environmentalResponses = new EnvironmentalResponseSystem();
    }
    
    update(deltaTime, wasmData = {}) {
        this.frameCount++;
        const now = performance.now();
        
        // Performance throttling
        if (this.config.enableOptimizations && (now - this.lastUpdate) < (1000 / this.config.updateRate)) {
            return this.getCachedTransform();
        }
        this.lastUpdate = now;
        
        // Get enhanced animation data from WASM
        const wasmAnimData = this.getWasmAnimationData(wasmData);
        
        // Update base position and orientation
        this.updateBaseTransform(wasmAnimData, deltaTime);
        
        // Update skeletal system with IK
        this.updateSkeletalSystem(wasmAnimData, deltaTime);
        
        // Apply secondary motion
        this.updateSecondaryMotion(wasmAnimData, deltaTime);
        
        // Apply environmental responses
        this.updateEnvironmentalResponses(wasmAnimData, deltaTime);
        
        // Generate final transform
        const transform = this.generateTransform(wasmAnimData);
        
        // Cache for performance
        this.cacheTransform(transform);
        
        return transform;
    }
    
    getWasmAnimationData(_wasmData) {
        // Extract enhanced animation data from WASM exports
        const exports = globalThis.wasmExports || {};
        
        return {
            // Base transform (existing)
            scaleX: exports.get_anim_scale_x?.() || 1.0,
            scaleY: exports.get_anim_scale_y?.() || 1.0,
            rotation: exports.get_anim_rotation?.() || 0.0,
            offsetX: exports.get_anim_offset_x?.() || 0.0,
            offsetY: exports.get_anim_offset_y?.() || 0.0,
            pelvisY: exports.get_anim_pelvis_y?.() || 0.0,
            
            // Enhanced animation data (new)
            spineCurve: exports.get_anim_spine_curve?.() || 0.0,
            shoulderRotation: exports.get_anim_shoulder_rotation?.() || 0.0,
            headBobX: exports.get_anim_head_bob_x?.() || 0.0,
            headBobY: exports.get_anim_head_bob_y?.() || 0.0,
            armSwingLeft: exports.get_anim_arm_swing_left?.() || 0.0,
            armSwingRight: exports.get_anim_arm_swing_right?.() || 0.0,
            legLiftLeft: exports.get_anim_leg_lift_left?.() || 0.0,
            legLiftRight: exports.get_anim_leg_lift_right?.() || 0.0,
            torsoTwist: exports.get_anim_torso_twist?.() || 0.0,
            breathingIntensity: exports.get_anim_breathing_intensity?.() || 1.0,
            fatigueFactor: exports.get_anim_fatigue_factor?.() || 0.0,
            momentumX: exports.get_anim_momentum_x?.() || 0.0,
            momentumY: exports.get_anim_momentum_y?.() || 0.0,
            
            // Secondary motion
            clothSway: exports.get_anim_cloth_sway?.() || 0.0,
            hairBounce: exports.get_anim_hair_bounce?.() || 0.0,
            equipmentJiggle: exports.get_anim_equipment_jiggle?.() || 0.0,
            
            // Environmental
            windResponse: exports.get_anim_wind_response?.() || 0.0,
            groundAdapt: exports.get_anim_ground_adapt?.() || 0.0,
            temperatureShiver: exports.get_anim_temperature_shiver?.() || 0.0,
            
            // Game state
            position: {
                x: exports.get_x?.() || 0.5,
                y: exports.get_y?.() || 0.5
            },
            velocity: {
                x: exports.get_vel_x?.() || 0.0,
                y: exports.get_vel_y?.() || 0.0
            },
            isGrounded: exports.get_is_grounded?.() === 1,
            stamina: exports.get_stamina?.() || 1.0,
            health: exports.get_hp?.() || 1.0,
            animState: exports.get_player_anim_state?.() || 0
        };
    }
    
    updateBaseTransform(wasmData, _deltaTime) {
        // Update base position and facing
        this.state.position.x = wasmData.position.x;
        this.state.position.y = wasmData.position.y;
        this.state.velocity.x = wasmData.velocity.x;
        this.state.velocity.y = wasmData.velocity.y;
        this.state.isGrounded = wasmData.isGrounded;
        
        // Determine facing direction
        if (Math.abs(wasmData.velocity.x) > 0.01) {
            this.state.facing = wasmData.velocity.x > 0 ? 1 : -1;
        }
        
        // Update core body segments with WASM data
        this.state.torso.rotation = wasmData.torsoTwist;
        this.state.pelvis.y = wasmData.pelvisY;
        
        // Head positioning with realistic constraints
        this.state.head.x = wasmData.headBobX;
        this.state.head.y = -25 + wasmData.headBobY;
        this.state.head.rotation = wasmData.spineCurve * 0.3; // Head follows spine curve
    }
    
    updateSkeletalSystem(wasmData, _deltaTime) {
        if (!this.config.ikEnabled) {return;}
        
        // Calculate IK targets for arms based on WASM animation data
        const leftArmTarget = this.calculateArmTarget('left', wasmData);
        const rightArmTarget = this.calculateArmTarget('right', wasmData);
        
        // Solve IK for arms
        const leftArmSolution = this.ikSolver.solveArm(
            this.state.leftShoulder,
            leftArmTarget,
            this.config.armLength,
            this.config.forearmLength
        );
        
        const rightArmSolution = this.ikSolver.solveArm(
            this.state.rightShoulder,
            rightArmTarget,
            this.config.armLength,
            this.config.forearmLength
        );
        
        // Apply arm solutions
        if (leftArmSolution) {
            this.state.leftElbow = leftArmSolution.elbow;
            this.state.leftHand = leftArmSolution.hand;
        }
        
        if (rightArmSolution) {
            this.state.rightElbow = rightArmSolution.elbow;
            this.state.rightHand = rightArmSolution.hand;
        }
        
        // Calculate IK targets for legs
        const leftLegTarget = this.calculateLegTarget('left', wasmData);
        const rightLegTarget = this.calculateLegTarget('right', wasmData);
        
        // Solve IK for legs
        const leftLegSolution = this.ikSolver.solveLeg(
            this.state.leftHip,
            leftLegTarget,
            this.config.thighLength,
            this.config.shinLength
        );
        
        const rightLegSolution = this.ikSolver.solveLeg(
            this.state.rightHip,
            rightLegTarget,
            this.config.thighLength,
            this.config.shinLength
        );
        
        // Apply leg solutions
        if (leftLegSolution) {
            this.state.leftKnee = leftLegSolution.knee;
            this.state.leftFoot = leftLegSolution.foot;
        }
        
        if (rightLegSolution) {
            this.state.rightKnee = rightLegSolution.knee;
            this.state.rightFoot = rightLegSolution.foot;
        }
    }
    
    calculateArmTarget(side, wasmData) {
        const isLeft = side === 'left';
        const sideMultiplier = isLeft ? -1 : 1;
        const armSwing = isLeft ? wasmData.armSwingLeft : wasmData.armSwingRight;
        
        // Base arm position
        let targetX = sideMultiplier * 12;
        let targetY = 5;
        
        // Apply natural arm swing
        targetX += Math.sin(armSwing) * 8;
        targetY += Math.cos(armSwing) * 4 - 2; // Arms swing forward/back and up/down
        
        // Adjust for shoulder rotation
        const shoulderOffset = wasmData.shoulderRotation * sideMultiplier;
        targetX += shoulderOffset * 3;
        
        // Adjust for momentum
        targetX += wasmData.momentumX * 0.3;
        targetY += wasmData.momentumY * 0.2;
        
        // Add some natural variation based on breathing
        targetY += Math.sin(Date.now() * 0.001 * wasmData.breathingIntensity) * 0.5;
        
        return { x: targetX, y: targetY };
    }
    
    calculateLegTarget(side, wasmData) {
        const isLeft = side === 'left';
        const sideMultiplier = isLeft ? -1 : 1;
        const legLift = isLeft ? wasmData.legLiftLeft : wasmData.legLiftRight;
        
        // Base leg position (foot placement)
        let targetX = sideMultiplier * 6;
        let targetY = 20; // Ground level
        
        // Apply leg lift for walking animation
        targetY -= legLift * 8; // Lift foot during walk cycle
        targetX += legLift * 2 * sideMultiplier; // Slight forward movement when lifted
        
        // Ground adaptation
        targetY += wasmData.groundAdapt;
        
        // Momentum-based foot placement
        targetX += wasmData.momentumX * 0.2;
        
        // Fatigue effect - less precise foot placement
        // Apply a deterministic offset based on fatigue level
        const fatigueOffset = wasmData.fatigueFactor * sideMultiplier * 0.5;
        targetX += fatigueOffset;
        
        return { x: targetX, y: targetY };
    }
    
    updateSecondaryMotion(wasmData, deltaTime) {
        // Update cloth physics
        this.clothPhysics.update(deltaTime, {
            sway: wasmData.clothSway,
            windResponse: wasmData.windResponse,
            momentum: { x: wasmData.momentumX, y: wasmData.momentumY }
        });
        
        // Update hair physics
        this.secondaryMotion.updateHair(deltaTime, {
            bounce: wasmData.hairBounce,
            windResponse: wasmData.windResponse,
            headMovement: { x: wasmData.headBobX, y: wasmData.headBobY }
        });
        
        // Update equipment physics
        this.secondaryMotion.updateEquipment(deltaTime, {
            jiggle: wasmData.equipmentJiggle,
            momentum: { x: wasmData.momentumX, y: wasmData.momentumY }
        });
    }
    
    updateEnvironmentalResponses(wasmData, _deltaTime) {
        // Temperature response
        if (wasmData.temperatureShiver > 0) {
            this.environmentalResponses.applyShivering(this.state, wasmData.temperatureShiver);
        }
        
        // Wind response
        if (wasmData.windResponse !== 0) {
            this.environmentalResponses.applyWindEffects(this.state, wasmData.windResponse);
        }
    }
    
    generateTransform(wasmData) {
        return {
            // Base transform from WASM
            scaleX: wasmData.scaleX,
            scaleY: wasmData.scaleY,
            rotation: wasmData.rotation,
            offsetX: wasmData.offsetX,
            offsetY: wasmData.offsetY,
            
            // Enhanced skeletal data
            skeleton: {
                head: this.state.head,
                torso: this.state.torso,
                pelvis: this.state.pelvis,
                leftArm: {
                    shoulder: this.state.leftShoulder,
                    elbow: this.state.leftElbow,
                    hand: this.state.leftHand
                },
                rightArm: {
                    shoulder: this.state.rightShoulder,
                    elbow: this.state.rightElbow,
                    hand: this.state.rightHand
                },
                leftLeg: {
                    hip: this.state.leftHip,
                    knee: this.state.leftKnee,
                    foot: this.state.leftFoot
                },
                rightLeg: {
                    hip: this.state.rightHip,
                    knee: this.state.rightKnee,
                    foot: this.state.rightFoot
                }
            },
            
            // Secondary motion data
            secondaryMotion: {
                cloth: this.clothPhysics.getState(),
                hair: this.secondaryMotion.getHairState(),
                equipment: this.secondaryMotion.getEquipmentState()
            },
            
            // Environmental effects
            environmental: {
                windResponse: wasmData.windResponse,
                temperatureShiver: wasmData.temperatureShiver,
                groundAdapt: wasmData.groundAdapt
            },
            
            // Debug information
            debug: {
                frameCount: this.frameCount,
                animState: wasmData.animState,
                fatigue: wasmData.fatigueFactor,
                breathing: wasmData.breathingIntensity
            }
        };
    }
    
    cacheTransform(transform) {
        const cacheKey = `${this.frameCount}_${this.lastUpdate}`;
        this.cachedTransforms.set(cacheKey, transform);
        
        // Limit cache size
        if (this.cachedTransforms.size > 10) {
            const firstKey = this.cachedTransforms.keys().next().value;
            this.cachedTransforms.delete(firstKey);
        }
    }
    
    getCachedTransform() {
        const keys = Array.from(this.cachedTransforms.keys());
        const latestKey = keys[keys.length - 1];
        return this.cachedTransforms.get(latestKey) || this.generateDefaultTransform();
    }
    
    generateDefaultTransform() {
        return {
            scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0,
            skeleton: null, secondaryMotion: null, environmental: null, debug: null
        };
    }
    
    // Rendering method for debug visualization
    renderDebug(ctx, x, y, scale = 1) {
        if (!this.config.renderSkeleton) {return;}
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // Render skeleton
        this.renderSkeleton(ctx);
        
        // Render IK targets
        if (this.config.renderIKTargets) {
            this.renderIKTargets(ctx);
        }
        
        // Render secondary motion
        if (this.config.renderSecondaryMotion) {
            this.renderSecondaryMotion(ctx);
        }
        
        ctx.restore();
    }
    
    renderSkeleton(ctx) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        
        // Draw bones
        this.drawBone(ctx, this.state.torso, this.state.head);
        this.drawBone(ctx, this.state.torso, this.state.pelvis);
        
        // Arms
        this.drawBone(ctx, this.state.leftShoulder, this.state.leftElbow);
        this.drawBone(ctx, this.state.leftElbow, this.state.leftHand);
        this.drawBone(ctx, this.state.rightShoulder, this.state.rightElbow);
        this.drawBone(ctx, this.state.rightElbow, this.state.rightHand);
        
        // Legs
        this.drawBone(ctx, this.state.leftHip, this.state.leftKnee);
        this.drawBone(ctx, this.state.leftKnee, this.state.leftFoot);
        this.drawBone(ctx, this.state.rightHip, this.state.rightKnee);
        this.drawBone(ctx, this.state.rightKnee, this.state.rightFoot);
        
        // Draw joints
        ctx.fillStyle = '#ffff44';
        Object.values(this.state).forEach(joint => {
            if (typeof joint.x !== "undefined" && typeof joint.y !== "undefined") {
                ctx.beginPath();
                ctx.arc(joint.x, joint.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    drawBone(ctx, start, end) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    renderIKTargets(ctx) {
        // Render IK target positions for debugging
        ctx.fillStyle = '#ff4444';
        // Implementation would show where IK is trying to reach
    }
    
    renderSecondaryMotion(ctx) {
        // Render cloth, hair, and equipment physics
        this.clothPhysics.render(ctx);
        this.secondaryMotion.renderHair(ctx);
        this.secondaryMotion.renderEquipment(ctx);
    }
}

// Advanced IK Solver for realistic limb movement
class AdvancedIKSolver {
    constructor(options = {}) {
        this.armLength = options.armLength || 20;
        this.forearmLength = options.forearmLength || 16;
        this.thighLength = options.thighLength || 18;
        this.shinLength = options.shinLength || 16;
        
        // IK solving parameters
        this.maxIterations = options.maxIterations || 10;
        this.tolerance = options.tolerance || 0.1;
        this.damping = options.damping || 0.8;
    }
    
    solveArm(shoulder, target, upperLength, lowerLength) {
        const distance = Math.sqrt(
            (target.x - shoulder.x)**2 + 
            (target.y - shoulder.y)**2
        );
        
        const maxReach = upperLength + lowerLength;
        
        // Check if target is reachable
        if (distance > maxReach) {
            // Stretch towards target at maximum reach
            const angle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);
            return {
                elbow: {
                    x: shoulder.x + Math.cos(angle) * upperLength,
                    y: shoulder.y + Math.sin(angle) * upperLength
                },
                hand: {
                    x: shoulder.x + Math.cos(angle) * maxReach,
                    y: shoulder.y + Math.sin(angle) * maxReach
                }
            };
        }
        
        // Two-bone IK solution using law of cosines
        const a = upperLength;
        const b = lowerLength;
        const c = distance;
        const angleB = Math.acos((a * a + c * c - b * b) / (2 * a * c));
        
        const targetAngle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);
        
        // Calculate elbow position
        const elbowAngle = targetAngle + angleB;
        const elbow = {
            x: shoulder.x + Math.cos(elbowAngle) * upperLength,
            y: shoulder.y + Math.sin(elbowAngle) * upperLength
        };
        
        return {
            elbow: elbow,
            hand: target
        };
    }
    
    solveLeg(hip, target, upperLength, lowerLength) {
        // Similar to arm IK but with different constraints for legs
        return this.solveArm(hip, target, upperLength, lowerLength);
    }
}

// Secondary motion system for cloth, hair, and equipment
class SecondaryMotionSystem {
    constructor() {
        this.hairSegments = [];
        this.equipmentItems = [];
        this.initializeHair();
        this.initializeEquipment();
    }
    
    initializeHair() {
        // Create hair segments for physics simulation
        for (let i = 0; i < 5; i++) {
            this.hairSegments.push({
                position: { x: 0, y: -25 - i * 3 },
                velocity: { x: 0, y: 0 },
                restLength: 3
            });
        }
    }
    
    initializeEquipment() {
        // Initialize equipment items (sword, pouch, etc.)
        this.equipmentItems = [
            { type: 'sword', position: { x: 8, y: 5 }, velocity: { x: 0, y: 0 } },
            { type: 'pouch', position: { x: -6, y: 8 }, velocity: { x: 0, y: 0 } }
        ];
    }
    
    updateHair(deltaTime, forces) {
        // Simple verlet integration for hair physics
        this.hairSegments.forEach((segment, index) => {
            if (index === 0) {return;} // Root segment is fixed to head
            
            // Apply forces
            segment.velocity.x += forces.windResponse * 0.1;
            segment.velocity.y += 0.1; // Gravity
            
            // Apply bounce from head movement
            if (index === 1) {
                segment.velocity.x += forces.headMovement.x * 0.05;
                segment.velocity.y += forces.headMovement.y * 0.05;
            }
            
            // Update position
            segment.position.x += segment.velocity.x * deltaTime;
            segment.position.y += segment.velocity.y * deltaTime;
            
            // Apply damping
            segment.velocity.x *= 0.95;
            segment.velocity.y *= 0.95;
            
            // Constraint to previous segment
            if (index > 0) {
                const prev = this.hairSegments[index - 1];
                const dx = segment.position.x - prev.position.x;
                const dy = segment.position.y - prev.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > segment.restLength) {
                    const correction = (distance - segment.restLength) / distance * 0.5;
                    segment.position.x -= dx * correction;
                    segment.position.y -= dy * correction;
                }
            }
        });
    }
    
    updateEquipment(deltaTime, forces) {
        this.equipmentItems.forEach(item => {
            // ARCHITECTURAL VIOLATION FIXED: Jiggle forces should be deterministic from WASM
            // Apply jiggle forces
            // item.velocity.x += (Math.random() - 0.5) * forces.jiggle * 0.1;
            // item.velocity.y += (Math.random() - 0.5) * forces.jiggle * 0.1;
            
            // Apply momentum
            item.velocity.x += forces.momentum.x * 0.02;
            item.velocity.y += forces.momentum.y * 0.02;
            
            // Update position
            item.position.x += item.velocity.x * deltaTime;
            item.position.y += item.velocity.y * deltaTime;
            
            // Apply damping
            item.velocity.x *= 0.9;
            item.velocity.y *= 0.9;
        });
    }
    
    getHairState() {
        return this.hairSegments;
    }
    
    getEquipmentState() {
        return this.equipmentItems;
    }
    
    renderHair(ctx) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.hairSegments.forEach((segment, index) => {
            if (index === 0) {
                ctx.moveTo(segment.position.x, segment.position.y);
            } else {
                ctx.lineTo(segment.position.x, segment.position.y);
            }
        });
        ctx.stroke();
    }
    
    renderEquipment(ctx) {
        this.equipmentItems.forEach(item => {
            ctx.fillStyle = item.type === 'sword' ? '#C0C0C0' : '#8B4513';
            ctx.fillRect(item.position.x - 2, item.position.y - 1, 4, 2);
        });
    }
}

// Cloth physics system
class ClothPhysicsSystem {
    constructor() {
        this.clothPoints = [];
        this.constraints = [];
        this.initializeCloth();
    }
    
    initializeCloth() {
        // Create a simple cloth simulation for capes/cloaks
        const width = 3;
        const height = 4;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.clothPoints.push({
                    position: { x: x * 3 - 3, y: y * 3 + 5 },
                    oldPosition: { x: x * 3 - 3, y: y * 3 + 5 },
                    pinned: y === 0 // Pin top row
                });
            }
        }
        
        // Create constraints between neighboring points
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x < width - 1) {
                    this.constraints.push({
                        p1: y * width + x,
                        p2: y * width + x + 1,
                        restLength: 3
                    });
                }
                if (y < height - 1) {
                    this.constraints.push({
                        p1: y * width + x,
                        p2: (y + 1) * width + x,
                        restLength: 3
                    });
                }
            }
        }
    }
    
    update(deltaTime, forces) {
        // Verlet integration
        this.clothPoints.forEach(point => {
            if (point.pinned) {return;}
            
            const velX = point.position.x - point.oldPosition.x;
            const velY = point.position.y - point.oldPosition.y;
            
            point.oldPosition.x = point.position.x;
            point.oldPosition.y = point.position.y;
            
            // Apply forces
            point.position.x += velX + forces.sway * 0.1 + forces.windResponse * 0.2;
            point.position.y += velY + 0.2; // Gravity
        });
        
        // Satisfy constraints
        for (let i = 0; i < 2; i++) { // Multiple iterations for stability
            this.constraints.forEach(constraint => {
                const p1 = this.clothPoints[constraint.p1];
                const p2 = this.clothPoints[constraint.p2];
                
                const dx = p2.position.x - p1.position.x;
                const dy = p2.position.y - p1.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const difference = constraint.restLength - distance;
                const percent = difference / distance / 2;
                
                const offsetX = dx * percent;
                const offsetY = dy * percent;
                
                if (!p1.pinned) {
                    p1.position.x -= offsetX;
                    p1.position.y -= offsetY;
                }
                if (!p2.pinned) {
                    p2.position.x += offsetX;
                    p2.position.y += offsetY;
                }
            });
        }
    }
    
    getState() {
        return this.clothPoints;
    }
    
    render(ctx) {
        // Render cloth as a mesh
        ctx.strokeStyle = '#4A4A4A';
        ctx.lineWidth = 1;
        
        this.constraints.forEach(constraint => {
            const p1 = this.clothPoints[constraint.p1];
            const p2 = this.clothPoints[constraint.p2];
            
            ctx.beginPath();
            ctx.moveTo(p1.position.x, p1.position.y);
            ctx.lineTo(p2.position.x, p2.position.y);
            ctx.stroke();
        });
    }
}

// Facial animation system
class FacialAnimationSystem {
    constructor() {
        this.expressions = {
            neutral: { eyeOpenness: 1.0, mouthCurve: 0.0, eyebrowHeight: 0.0 },
            happy: { eyeOpenness: 0.8, mouthCurve: 0.5, eyebrowHeight: 0.2 },
            angry: { eyeOpenness: 0.6, mouthCurve: -0.3, eyebrowHeight: -0.4 },
            surprised: { eyeOpenness: 1.2, mouthCurve: -0.2, eyebrowHeight: 0.6 },
            tired: { eyeOpenness: 0.4, mouthCurve: -0.1, eyebrowHeight: -0.1 }
        };
        
        this.currentExpression = 'neutral';
        this.blendWeight = 0.0;
    }
    
    setExpression(expression, blendTime = 0.5) {
        this.targetExpression = expression;
        this.blendTime = blendTime;
        this.blendWeight = 0.0;
    }
    
    update(deltaTime, emotionalState) {
        // Determine expression based on game state
        if (emotionalState.stamina < 0.3) {
            this.setExpression('tired');
        } else if (emotionalState.health < 0.5) {
            this.setExpression('angry');
        } else {
            this.setExpression('neutral');
        }
        
        // Blend towards target expression
        if (this.blendWeight < 1.0) {
            this.blendWeight += deltaTime / this.blendTime;
            this.blendWeight = Math.min(this.blendWeight, 1.0);
        }
    }
}

// Environmental response system
class EnvironmentalResponseSystem {
    applyShivering(state, _intensity) {
        // ARCHITECTURAL VIOLATION FIXED: Shivering should be deterministic from WASM
        // Apply small deterministic movements to simulate shivering
        const shiver = 0; // Should be calculated deterministically in WASM
        
        Object.values(state).forEach(joint => {
            if (typeof joint.x !== "undefined") {
                joint.x += shiver * 0.5;
                joint.y += shiver * 0.3;
            }
        });
    }
    
    applyWindEffects(state, windStrength) {
        // Apply wind forces to extremities
        state.head.x += windStrength * 0.5;
        state.leftHand.x += windStrength * 0.8;
        state.rightHand.x += windStrength * 0.8;
    }
}

// Enhanced Player with Animation System Integration
// Provides a complete player character with roll, attack, block, and hurt animations

// SoundSystem and ParticleSystem imports removed - not used in this file

class AnimatedPlayer {
    constructor(x = 400, y = 300, options = {}) {
        // Position - driven by WASM (normalized 0-1 coordinates)
        this.x = x;
        this.y = y;
        this.facing = 1; // 1 for right, -1 for left
        
        // Player stats - WASM will manage the core stats
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.stamina = options.stamina || 100;
        this.maxStamina = options.maxStamina || 100;
        this.speed = options.speed || 250; // Base speed, actual speed is WASM-driven
        this.rollSpeed = options.rollSpeed || 500; // Base roll speed, actual speed is WASM-driven
        
        // State management - now primarily WASM-driven, this is for JS animation state
        this.state = 'idle'; // idle, running, attacking, blocking, rolling, hurt, dead, jumping, doubleJumping, landing, wallSliding, dashing, chargingAttack
        this.previousState = 'idle';
        this.stateTimer = 0; // Managed by WASM now for core actions
        this.stateTime = 0; // Managed by WASM now
        this.stateDuration = 0; // Managed by WASM now
        this._prevNormTime = 0; // Managed by WASM now
        this._comboQueued = false; // Logic related to combos will move to WASM
        this._currentAttackType = 'light'; // Managed by WASM now
        this.invulnerable = false; // Managed by WASM
        this.invulnerabilityTimer = 0; // Managed by WASM
        this.isGrounded = true; // Driven by WASM
        this.jumpCount = 0; // Driven by WASM
        this.nearWall = false; // Will be WASM-driven or removed
        this.dashCooldown = 0; // Will be WASM-driven or removed
        this.chargeTime = 0; // Will be WASM-driven or removed
        this.maxChargeTime = 1.5; // Will be WASM-driven or removed

        // Deterministic animation/event parameters - these are mostly cues for animation
        this.params = {
            roll: {
                duration: 0.4,
                iFrameStart: 0.08,
                iFrameEnd: 0.36,
                staminaCost: 25,
                cooldown: 0.8
            },
            attackLight: {
                duration: 0.4,
                activeStart: 0.28,
                activeEnd: 0.38,
                staminaCost: 12,
                cooldown: 0.5
            },
            attackHeavy: {
                duration: 0.62,
                activeStart: 0.32,
                activeEnd: 0.48,
                staminaCost: 24,
                cooldown: 0.8
            },
            comboWindow: { start: 0.55, end: 0.75 },
            parry: { duration: 0.22, window: 0.18, staminaCost: 10 }
        };
        
        // Animation system
        this.animator = new CharacterAnimator();
        this.animations = AnimationPresets.createPlayerAnimations();
        this.setupAnimations();
        
        // Realistic Procedural Animator - NEW!
        this.proceduralAnimator = new RealisticProceduralAnimator({
            ikEnabled: options.enableIK !== false,
            renderSkeleton: options.debugMode || false,
            renderIKTargets: options.debugMode || false,
            renderSecondaryMotion: options.debugMode || false,
            enableOptimizations: options.enableOptimizations !== false
        });
        
        // Action cooldowns - now WASM-driven
        this.attackCooldown = 0;
        this.rollCooldown = 0;
        this.blockHeld = false; // WASM will manage the actual block state
        
        // Visual properties
        this.width = options.width || 32;
        this.height = options.height || 32;
        this.color = options.color || '#00ff88';
        this.sprite = options.sprite || null;

        // Load sprite sheet if not provided
        if (!this.sprite) {
            this.loadSpriteSheet();
        }
        
        // Effects
        this.particleSystem = options.particleSystem || null;
        this.soundSystem = options.soundSystem || null;
        
        // Combat properties - now WASM-driven
        this.attackDamage = options.attackDamage || 20;
        this.attackDamageHeavy = options.attackDamageHeavy || 35;
        this.attackRange = options.attackRange || 60;
        this.attackRangeHeavy = options.attackRangeHeavy || 80;
        this.blockDamageReduction = options.blockDamageReduction || 0.5;

        // Locomotion cadence and footsteps - these will be driven by WASM velocity feedback
        this.stridePhase = 0;
        this.gaitRate = 1.4;
        this._lastFootFlag = 0; // 0 left, 1 right alternating
        this.footstepIntervalBase = 0.28;

        // Minimal IK proxy values (pelvis bob and foot locks for readability) - driven by WASM
        this.ik = {
            pelvisY: 0,
            pelvisRate: 10,
            left: { locked: false, y: 0 },
            right: { locked: false, y: 0 },
            stepHeight: 2
        };

        // Debug flag
        this.debugMode = false;

        // Optional WASM module injection support for testing/integration
        try {
            if (options.wasmModule && !globalThis.wasmExports) {
                globalThis.wasmExports = options.wasmModule;
            }
        } catch {
            // Ignore WASM module loading errors - fallback handling elsewhere
        }
    }

    loadSpriteSheet() {
        // Try to load sprite sheet
        this.sprite = new Image();
        this.sprite.src = './src/images/player-sprites.png';

        this.sprite.onload = () => {
            console.log('Player sprite sheet loaded successfully');
        };

        this.sprite.onerror = () => {
            console.warn('Player sprite sheet not found at ./src/images/player-sprites.png, using fallback rendering');
            console.log('To fix this: Run "node scripts/generate-sprite-sheet.js" or use create-sprite-sheet.html');
            this.sprite = null;
        };
    }
    
    setupAnimations() {
        // Add all animations to the controller
        Object.values(this.animations).forEach(animation => {
            this.animator.controller.addAnimation(animation);
        });
        
        // Start with idle animation
        this.animator.controller.play('idle');
    }
    
    update(deltaTime, input = {}) {
        // Update timers - WASM manages core game timers
        this._prevNormTime = this.getNormalizedTime();
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        this.rollCooldown = Math.max(0, this.rollCooldown - deltaTime);
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime; // WASM manages invulnerability timer
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
        
        // Handle state transitions
        // this.handleStateTransitions(input) // WASM now handles state transitions
        
        // Update based on current state
        // this.updateState(deltaTime, input) // WASM now handles state updates

        // Deterministic state event windows (hitboxes, i-frames)
        // this.applyStateEvents() // WASM now handles state events
        
        // Update simple IK before composing overlay
        this.updateIK(deltaTime);

        // 1. Forward inputs to WASM - 5-button combat system
        let inputX = 0; let inputY = 0;
        if (input.left) {inputX -= 1;}
        if (input.right) {inputX += 1;}
        if (input.up) {inputY -= 1;}
        if (input.down) {inputY += 1;}
        
        // New 5-button combat system: A1(light), A2(heavy), Block, Roll, Special
        globalThis.wasmExports?.set_player_input?.(
            inputX, inputY, 
            input.roll ? 1 : 0, 
            input.jump ? 1 : 0, 
            input.lightAttack ? 1 : 0, 
            input.heavyAttack ? 1 : 0, 
            input.block ? 1 : 0, 
            input.special ? 1 : 0
        );

        // 2. Read state for rendering
        // Assuming 800x600 canvas for now. Convert WASM's 0-1 range to world coordinates.
        // The game-renderer.js is responsible for this scaling when passing player position to render.
        // For now, we'll directly set x and y, and let the renderer handle scaling.
        // WASM provides normalized coordinates; guard against NaN/Infinity
        const rx = globalThis.wasmExports?.get_x?.();
        const ry = globalThis.wasmExports?.get_y?.();
        this.x = (typeof rx === 'number' && Number.isFinite(rx)) ? rx : 0.5;
        this.y = (typeof ry === 'number' && Number.isFinite(ry)) ? ry : 0.5;

        this.isGrounded = (globalThis.wasmExports?.get_is_grounded?.() === 1);
        this.jumpCount = globalThis.wasmExports?.get_jump_count?.();

        // Update animation system and cache transform
        // WASM will determine facing direction implicitly from movement and actions
        // Infer facing from velocity if available; preserve when nearly still
        const fx = globalThis.wasmExports?.get_vel_x?.();
        const fy = globalThis.wasmExports?.get_vel_y?.();
        if (typeof fx === 'number' && typeof fy === 'number') {
            const speed = Math.hypot(fx, fy);
            if (speed > 0.001) {
                this.facing = fx >= 0 ? 1 : -1;
            }
        }

        if (this.animator && typeof this.animator.setFacing === 'function') {
            this.animator.setFacing(this.facing >= 0 ? 'right' : 'left');
        }
        // Query WASM overlay values if available
        const wx = (globalThis.wasmExports?.get_anim_offset_x?.() ?? 0);
        const wy = (globalThis.wasmExports?.get_anim_offset_y?.() ?? 0);
        const wsx = (globalThis.wasmExports?.get_anim_scale_x?.() ?? 1);
        const wsy = (globalThis.wasmExports?.get_anim_scale_y?.() ?? 1);
        const wrot = (globalThis.wasmExports?.get_anim_rotation?.() ?? 0);
        (globalThis.wasmExports?.get_anim_pelvis_y?.() ?? 0);
        
        // Get the animation state from WASM and set it in the CharacterAnimator
        const wasmAnimState = globalThis.wasmExports?.get_player_anim_state?.();
        if (typeof wasmAnimState === 'number') {
            this.setState(this.getAnimStateName(wasmAnimState), true); // Pass true to indicate WASM-driven state
        }

        const baseTransform = this.animator.update(
            deltaTime,
            { x: this.x, y: this.y },
            // Pass WASM-driven velocity to CharacterAnimator
            { x: globalThis.wasmExports?.get_vel_x?.() ?? 0, y: globalThis.wasmExports?.get_vel_y?.() ?? 0 },
            this.isGrounded
        ) || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 };
        
        // Update realistic procedural animator with WASM data
        const proceduralTransform = this.proceduralAnimator.update(deltaTime, {
            // Pass any additional context the procedural animator might need
            playerState: this.state,
            inputState: input,
            debugMode: this.debugMode
        });
        
        // Prefer WASM-driven overlay when available; fallback to local
        const overlay = (globalThis.wasmExports && typeof wx === 'number') ? {
            scaleX: wsx,
            scaleY: wsy,
            rotation: wrot,
            offsetX: wx,
            offsetY: wy
        } : this.computePoseOverlay(input);
        
        // Combine all transforms: base + procedural + overlay
        this.currentTransform = {
            scaleX: baseTransform.scaleX * overlay.scaleX * proceduralTransform.scaleX,
            scaleY: baseTransform.scaleY * overlay.scaleY * proceduralTransform.scaleY,
            rotation: baseTransform.rotation + overlay.rotation + proceduralTransform.rotation,
            offsetX: baseTransform.offsetX + overlay.offsetX + proceduralTransform.offsetX,
            offsetY: baseTransform.offsetY + overlay.offsetY + proceduralTransform.offsetY,
            trails: baseTransform.trails || [],
            
            // Enhanced data from procedural animator
            skeleton: proceduralTransform.skeleton,
            secondaryMotion: proceduralTransform.secondaryMotion,
            environmental: proceduralTransform.environmental,
            debug: proceduralTransform.debug
        };
        
        // Physics handled by WASM

        // Stamina regeneration handled by WASM
    }

    // Returns a normalized [0,1] progress for the current player action/animation
    // Prefer authoritative WASM timers; fallback to current animation controller progress
    getNormalizedTime() {
        try {
            // If WASM provides an explicit attack state machine, derive normalized phase
            const get = (fn) => (typeof globalThis.wasmExports?.[fn] === 'function') ? globalThis.wasmExports[fn]() : void 0;
            const attackState = get('get_attack_state'); // 0 Idle, 1 Windup, 2 Active, 3 Recovery
            const stateStartTime = get('get_attack_state_time');
            const now = get('get_time_seconds');
            if (typeof attackState === 'number' && typeof stateStartTime === 'number' && typeof now === 'number') {
                const elapsed = Math.max(0, now - stateStartTime);
                let duration = 0;
                if (attackState === 1) {duration = get('get_attack_windup_sec') ?? this.params.attackLight.duration;}
                else if (attackState === 2) {duration = get('get_attack_active_sec') ?? this.params.attackLight.duration;}
                else if (attackState === 3) {duration = get('get_attack_recovery_sec') ?? this.params.attackLight.duration;}
                if (duration && duration > 0) {
                    return Math.max(0, Math.min(1, elapsed / duration))
                }
            }

            // Rolling phase if available
            const isRolling = get('get_is_rolling');
            if (isRolling === 1) {
                const rollDur = get('get_roll_duration') || this.params.roll.duration;
                const playerStateTimer = get('get_player_state_timer');
                if (typeof playerStateTimer === 'number' && rollDur > 0) {
                    return Math.max(0, Math.min(1, playerStateTimer / rollDur))
                }
            }

            // Generic state timer normalization when duration is known locally
            const playerStateTimer = get('get_player_state_timer');
            if (typeof playerStateTimer === 'number') {
                let duration = 0;
                switch (this.state) {
                    case 'rolling': duration = this.params.roll.duration; break
                    case 'attacking':
                        duration = this._currentAttackType === 'heavy' ? this.params.attackHeavy.duration : this.params.attackLight.duration;
                        break
                    default:
                        duration = 0;
                }
                if (duration > 0) {
                    return Math.max(0, Math.min(1, playerStateTimer / duration))
                }
            }
        } catch {
            // Ignore WASM timing errors - fallback to animation controller
        }

        // Fallback: use current animation controller progress
        try {
            const anim = this.animator?.controller?.currentAnimation;
            if (anim && Array.isArray(anim.frames) && anim.frames.length > 1) {
                // Use frame index over total as coarse progress
                const coarse = anim.currentFrame / (anim.frames.length - 1);
                return Math.max(0, Math.min(1, coarse))
            }
        } catch {
            // Ignore animation controller errors - return default
        }

        return 0
    }

    startRoll(input) {
        // Trigger WASM roll action and handle visual/audio effects
        if (!globalThis.wasmExports?.on_roll_start?.()) {
            // WASM determined roll could not start (e.g., stamina, cooldown)
            return;
        }

        // Determine roll direction for local effects and WASM input
        let dirX = 0; let dirY = 0;
        
        if (input.left) {dirX -= 1;}
        if (input.right) {dirX += 1;}
        if (input.up) {dirY -= 1;}
        if (input.down) {dirY += 1;}
        
        // If no direction input, roll in facing direction
        if (dirX === 0 && dirY === 0) {
            dirX = this.facing;
        }
        
        // Normalize direction
        const length = Math.hypot(dirX, dirY);
        if (length > 0) {
            dirX /= length;
            dirY /= length;
        }
        
        this.rollDirection = { x: dirX, y: dirY };
        // Visual and audio effects only - core logic handled by WASM
        
        // Create roll effect
        if (this.particleSystem) {
            this.particleSystem.createDustCloud(this.x, this.y);
        }
        
        // Play roll sound
        if (this.soundSystem) {
            this.soundSystem.play('roll');
        }
    }
    
    startAttack(type = 'light') {
        // Trigger WASM attack action and handle visual/audio effects
        type === 'heavy' ? this.params.attackHeavy : this.params.attackLight;
        this._currentAttackType = type;

        if (!globalThis.wasmExports?.on_attack?.(type === 'heavy' ? 1 : 0)) {
            // WASM determined attack could not start (e.g., stamina, cooldown)
            return;
        }
        
        // Play attack sound
        if (this.soundSystem) {
            this.soundSystem.play('attack');
        }
    }

    // Public input API helpers
    queueAttack(type = 'light') {
        // This logic is now handled in WASM
        if (this.canAttack()) { // This check will still use local state, but the actual decision is WASM's
            this.startAttack(type);
        } else if (this.state === 'attacking') {
            // This combo queuing needs to be moved to WASM if it affects gameplay
            this._comboQueued = true;
        }
    }

    tryRoll(dir = null) {
        // dir: {x,y} optional; if absent uses current input/facing via startRoll caller
        // This logic is now handled by WASM, just call startRoll
        const input = {};
        if (dir && (dir.x || dir.y)) {
            input.left = dir.x < -0.5;
            input.right = dir.x > 0.5;
            input.up = dir.y < -0.5;
            input.down = dir.y > 0.5;
        }
        this.startRoll(input);
    }

    tryParry() {
        // Parry logic is now handled in WASM
        if (this.state === 'dead') { return }
        // Stamina check is now done in WASM
        // if (this.stamina < this.params.parry.staminaCost) { return }
        // Enter a brief blocking-like state with a success window; integrate with combat later
        // this.setState('blocking') // State is WASM-driven
        // this.stateTimer = this.params.parry.duration // State timing is WASM-driven
        // this.stateTime = 0 // State timing is WASM-driven
        // this.stateDuration = this.params.parry.duration // State timing is WASM-driven
        // this.stamina -= this.params.parry.staminaCost // Stamina cost is WASM-driven
        if (!globalThis.wasmExports?.on_parry?.()) { // Assuming a new WASM on_parry function
            return; // Parry failed in WASM
        }
        // Optional sfx
        if (this.soundSystem) { this.soundSystem.play('parry'); }
    }
    
    executeAttack() {
        // This method will be simplified as WASM handles attack logic.
        // It will primarily be for visual effects and returning hit data for JS enemies.
        const isHeavy = this._currentAttackType === 'heavy';
        const range = isHeavy ? this.attackRangeHeavy : this.attackRange;
        const damage = isHeavy ? this.attackDamageHeavy : this.attackDamage;
        const hitboxX = this.x + (this.facing * range / 2);
        const hitboxY = this.y;
        
        // Create attack effect
        if (this.particleSystem) {
            if (isHeavy) {
                this.particleSystem.createChargedSlash?.(hitboxX, hitboxY, this.facing, 1);
            } else {
                this.particleSystem.createSlashEffect(hitboxX, hitboxY, this.facing);
            }
        }
        
        // Return attack hitbox for collision detection (for JS-managed enemies)
        return {
            x: hitboxX,
            y: hitboxY,
            width: range,
            height: this.height,
            damage: damage
        }
    }
    
    startBlock() {
        // This function now primarily triggers the WASM block action and handles local effects
        if (!globalThis.wasmExports?.set_blocking?.(1, this.facing, 0)) {
            return; // Block failed in WASM (e.g., stamina)
        }
        // this.setState('blocking') // State is WASM-driven
        this.blockHeld = true;
        
        // Create block effect
        if (this.particleSystem) {
            this.particleSystem.createShieldEffect(this.x, this.y);
        }
        
        // Play block sound
        if (this.soundSystem) {
            this.soundSystem.play('block');
        }
    }
    
    stopBlock() {
        // This function now primarily triggers the WASM block action
        globalThis.wasmExports?.set_blocking?.(0, this.facing, 0);
        // this.setState('idle') // State is WASM-driven
        this.blockHeld = false;
    }
    
    takeDamage(damage, knockbackX = 0, knockbackY = 0) {
        // Damage calculation is now primarily WASM-driven
        // This function will be simplified or removed if WASM handles all damage and effects
        if (this.invulnerable || this.state === 'dead') {return false} // Invulnerable state is WASM-driven
        
        // Reduce damage if blocking - WASM handles this logic
        if (this.state === 'blocking') {
            // actualDamage *= this.blockDamageReduction
            
            // Create block impact effect
            if (this.particleSystem) {
                this.particleSystem.createBlockImpact(this.x, this.y);
            }
            
            // Play block impact sound
            if (this.soundSystem) {
                this.soundSystem.play('blockImpact');
            }
        } else {
            // Not blocking, take full damage - visual/audio effects only
            if (this.particleSystem) {
                this.particleSystem.createBloodEffect(this.x, this.y);
            }

            if (this.soundSystem) {
                this.soundSystem.play('hurt');
            }
        }

        // Damage application and death check handled by WASM
        
        return true
    }
    
    die() {
        // Visual and audio effects only - death state handled by WASM
        if (this.particleSystem) {
            this.particleSystem.createDeathEffect(this.x, this.y);
        }

        if (this.soundSystem) {
            this.soundSystem.play('death');
        }
    }
    
    respawn(_x, _y) {
        // Visual and audio effects only - respawn logic handled by WASM
        if (this.particleSystem) {
            this.particleSystem.createRespawnEffect(this.x, this.y);
        }

        if (this.soundSystem) {
            this.soundSystem.play('respawn');
        }
    }
    
    setState(newState, wasmDriven = false) { // Added wasmDriven parameter
        if (this.state === newState) {return} // Prevent redundant state changes regardless of source

        this.previousState = this.state;
        this.state = newState;
        this.stateTime = 0;
        this.stateDuration = 0;
        this._prevNormTime = 0;

        // Convert string state to numeric state for CharacterAnimator
        const numericState = this.stateNameToNumber(newState);

        // Update animation using CharacterAnimator's setAnimState method
        this.animator.setAnimState(numericState);
    }
    
    canAttack() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        const minCost = Math.min(this.params.attackLight.staminaCost, this.params.attackHeavy.staminaCost);
        return this.attackCooldown <= 0 && 
               this.stamina >= minCost && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'hurt'
    }
    
    canRoll() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        return this.rollCooldown <= 0 && 
               this.stamina >= this.params.roll.staminaCost && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    canBlock() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        return this.stamina > 0 && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    render(ctx, camera = null) {
        // Compute screen position from WASM-normalized coords using GameRenderer mapping if available
        let screenX = 0;
        let screenY = 0;
        const camX = camera?.x || 0;
        const camY = camera?.y || 0;
        
        if (globalThis.gameRenderer && typeof globalThis.gameRenderer.wasmToWorld === 'function') {
            const pos = globalThis.gameRenderer.wasmToWorld(this.x || 0.5, this.y || 0.5);
            screenX = pos.x - camX;
            screenY = pos.y - camY;
        } else {
            // Fallback scaling if renderer mapping is unavailable
            const worldWidth = 800;
            const worldHeight = 600;
            screenX = (this.x || 0) * worldWidth - camX;
            screenY = (this.y || 0) * worldHeight - camY;
        }
        
        ctx.save();
        
        // Apply invulnerability flashing - this will be driven by WASM
        if (globalThis.wasmExports?.get_is_invulnerable?.() === 1) { // Assuming a WASM export for invulnerability
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        }
        
        // Get current animation frame
        const frame = this.animator.controller.getCurrentFrame();
        
        if (this.sprite && frame) {
            // Draw sprite animation with enhanced procedural transform
            ctx.save();
            const t = this.currentTransform || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 };
            const centerX = screenX + t.offsetX;
            const centerY = screenY + t.offsetY;
            ctx.translate(centerX, centerY);
            ctx.rotate(t.rotation);
            ctx.scale(this.facing < 0 ? -t.scaleX : t.scaleX, t.scaleY);
            
            // Render secondary motion effects first (behind character)
            if (t.secondaryMotion && this.debugMode) {
                this.renderSecondaryMotion(ctx, t.secondaryMotion);
            }
            
            // Draw main character sprite
            ctx.drawImage(
                this.sprite,
                frame.x, frame.y, frame.width, frame.height,
                -this.width/2, -this.height/2,
                this.width, this.height
            );
            
            // Render enhanced skeletal overlay if available and in debug mode
            if (t.skeleton && this.debugMode) {
                this.renderSkeletalOverlay(ctx, t.skeleton);
            }
            
            ctx.restore();
        } else {
            // Fallback to colored rectangle - ensure it's always visible
            ctx.fillStyle = this.color || '#4a90e2'; // Default blue color
            
            // Apply state-based visual effects
            if (this.state === 'hurt') {
                ctx.fillStyle = '#ff4444';
            } else if (this.state === 'blocking') {
                ctx.fillStyle = '#4444ff';
            } else if (this.state === 'rolling') {
                ctx.fillStyle = '#ffff44';
            }
            
            // Draw a more visible rectangle
            const rectWidth = this.width || 32;
            const rectHeight = this.height || 32;
            
            ctx.fillRect(
                screenX - rectWidth/2,
                screenY - rectHeight/2,
                rectWidth,
                rectHeight
            );
            
            // Add a border to make it more visible
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                screenX - rectWidth/2,
                screenY - rectHeight/2,
                rectWidth,
                rectHeight
            );
            
            // Add a center dot to show exact position
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw health bar
        const barWidth = 40;
        const barHeight = 4;
        const barY = screenY - this.height/2 - 10;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight);
        
        // Health - get from WASM
        const currentHealth = globalThis.wasmExports?.get_hp?.() ?? globalThis.wasmExports?.get_health?.() ?? this.health;
        const maxHealth = this.maxHealth; // Max health can still be local or WASM-driven if dynamic
        const healthPercent = currentHealth / maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(screenX - barWidth/2, barY, barWidth * healthPercent, barHeight);
        
        // Stamina bar - get from WASM
        const staminaY = barY + 5;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth, 2);
        
        const currentStamina = globalThis.wasmExports?.get_stamina?.() ?? this.stamina;
        const maxStamina = this.maxStamina; // Max stamina can still be local or WASM-driven if dynamic
        const staminaPercent = currentStamina / maxStamina;
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth * staminaPercent, 2);
        
        // Debug overlays
        if (this.debugMode) {
            this.renderDebug(ctx, camera, screenX, screenY);
        }

        ctx.restore();
    }

    computePoseOverlay(_input) {
        // Simple procedural layers approximation for readability and responsiveness
        // This can still be done in JS as it's purely visual
        const t = this.getNormalizedTime(); // This needs to be driven by WASM state timings
        let scaleX = 1;
        let scaleY = 1;
        let rotation = 0;
        const offsetX = 0;
        let offsetY = this.ik?.pelvisY || 0;

        // Lean with velocity when running - velocity should come from WASM
        // For now, using this.vx from CharacterAnimator.update's velocity parameter. This needs to be cleaned up.
        // The CharacterAnimator.update is already being passed vx, vy, which are currently local.
        // These local vx, vy are not updated from WASM, which is an issue.
        // Need to pass WASM-driven velocity to CharacterAnimator.update as well.
        // For now, let's assume CharacterAnimator is updated with correct velocity from WASM.
        // We need an export for WASM player velocity (get_vel_x, get_vel_y)
        const currentVx = globalThis.wasmExports?.get_vel_x?.() ?? 0;
        globalThis.wasmExports?.get_vel_y?.() ?? 0;
        const playerSpeed = globalThis.wasmExports?.get_speed?.() ?? this.speed; // Assuming WASM provides player speed

        if (this.state === 'running') {
            const lean = Math.max(-0.15, Math.min(0.15, (currentVx / (playerSpeed || 1)) * 0.25));
            rotation += lean;
        }

        // Block hunch
        if (this.state === 'blocking') {
            scaleY *= 0.98;
            offsetY += 1;
        }

        // Roll tuck
        if (this.state === 'rolling') {
            const w = (t < 0.5 ? t * 2 : (1 - t) * 2);
            scaleY *= 1 - 0.06 * w;
            scaleX *= 1 + 0.04 * w;
            rotation += (this.facing >= 0 ? 1 : -1) * 0.12 * w;
        }

        // Attack slight forward push and recoil feel
        // These will be driven by WASM attack state timings and forces
        if (this.state === 'attacking') ;

        return { scaleX, scaleY, rotation, offsetX, offsetY }
    }

    updateIK(deltaTime) {
        // Pelvis bob from WASM overlay if available
        const wasmPelvis = globalThis.wasmExports?.get_anim_pelvis_y?.();
        if (typeof wasmPelvis === 'number') {
            this.ik.pelvisY = wasmPelvis;
        } else {
            this.ik.pelvisY = 0; // Fallback to 0 if WASM value not available
        }

        // Foot lock flags (alternating with steps) for future mask usage
        // These should also be driven by WASM if precise synchronization is needed
        const currentVx = globalThis.wasmExports?.get_vel_x?.() ?? 0;
        const currentVy = globalThis.wasmExports?.get_vel_y?.() ?? 0;
        const isMovingNow = Math.hypot(currentVx, currentVy) > 10;
        if (isMovingNow) {
            // left foot considered planted near stridePhase ~ 0.0; right near ~0.5
            // The stridePhase needs to be driven by WASM's locomotion state.
            // For now, let's keep a local stridePhase but eventually it should be removed.
            this.stridePhase = (this.stridePhase + deltaTime * this.gaitRate) % 1; // Keep local for now
            const lf = (this.stridePhase < 0.25 || this.stridePhase > 0.75);
            this.ik.left.locked = lf;
            this.ik.right.locked = !lf;
        } else {
            this.ik.left.locked = false;
            this.ik.right.locked = false;
            this.stridePhase = 0; // Reset stride phase when idle
        }
    }

    renderDebug(ctx, camera, screenX, screenY) {
        const x = screenX;
        const y = screenY - this.height / 2 - 18;
        // Stride phase bar - needs to be updated based on WASM if stridePhase moves to WASM
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x - 24, y, 48, 4);
        ctx.fillStyle = '#00ffaa';
        ctx.fillRect(x - 24, y, 48 * (this.stridePhase % 1), 4);

        // Pelvis offset marker
        ctx.strokeStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 2);
        ctx.lineTo(x + 30, y + 2 - (this.ik?.pelvisY || 0));
        ctx.stroke();

        // Event windows (attack/roll) - these timings are now WASM-driven
        // This will require WASM exports for current attack/roll state durations and normalized times
        const currentAttackState = globalThis.wasmExports?.get_attack_state?.() ?? 0; // Assuming a WASM export
        const currentAttackStateTime = globalThis.wasmExports?.get_attack_state_time?.() ?? 0; // Assuming a WASM export
        const totalGameTime = globalThis.wasmExports?.get_time_seconds?.() ?? 0; // Assuming a WASM export
        
        let norm = 0;
        if (currentAttackState === 1) { // Windup
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_windup_sec?.() ?? this.params.attackLight.duration);
        } else if (currentAttackState === 2) { // Active
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_active_sec?.() ?? this.params.attackLight.duration);
        } else if (currentAttackState === 3) { // Recovery
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_recovery_sec?.() ?? this.params.attackLight.duration);
        }

        const barY = y + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x - 24, barY, 48, 3);

        // These ranges should be driven by WASM exports if precise
        if (currentAttackState === 2) { // Active attack phase
            ctx.fillStyle = '#ff4477';
            // Placeholder: actual activeStart/End should come from WASM
            ctx.fillRect(x - 24 + 48 * 0.28, barY, 48 * (0.38 - 0.28), 3);
        }
        if (globalThis.wasmExports?.get_is_rolling?.() === 1) { // If rolling
            ctx.fillStyle = '#ffee55';
            // Placeholder: iFrameStart/End should come from WASM
            ctx.fillRect(x - 24 + 48 * 0.08, barY, 48 * (0.36 - 0.08), 3);
        }
        // Current norm marker
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 24 + 48 * norm - 1, barY - 1, 2, 5);

        ctx.restore();
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

    // Helper function to convert string state to numeric for CharacterAnimator
    stateNameToNumber(stateName) {
        switch(stateName) {
            case 'idle': return 0
            case 'running': return 1
            case 'attacking': return 2
            case 'blocking': return 3
            case 'rolling': return 4
            case 'hurt': return 5
            case 'dead': return 6
            case 'jumping': return 7
            case 'doubleJumping': return 8
            case 'landing': return 9
            case 'wallSliding': return 10
            case 'dashing': return 11
            case 'chargingAttack': return 12
            default: return 0
        }
    }
    
    // Get current animation info for debugging
    getAnimationInfo() {
        return {
            state: this.state, // Now directly reflecting the local state derived from WASM
            animation: this.animator.controller.currentAnimation?.name,
            frame: this.animator.controller.getCurrentFrame(),
            stateTimer: globalThis.wasmExports?.get_player_state_timer?.() ?? 0, // Assuming WASM exports player state timer
            invulnerable: globalThis.wasmExports?.get_is_invulnerable?.() === 1,
            
            // Enhanced procedural animation info
            proceduralData: this.currentTransform?.debug || null,
            skeletalData: this.currentTransform?.skeleton || null,
            secondaryMotion: this.currentTransform?.secondaryMotion || null,
            environmental: this.currentTransform?.environmental || null
        }
    }
    
    // Render secondary motion effects (cloth, hair, equipment)
    renderSecondaryMotion(ctx, secondaryMotion) {
        if (!secondaryMotion) {return}
        
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        // Render cloth physics
        if (secondaryMotion.cloth) {
            ctx.strokeStyle = '#4A4A4A';
            ctx.lineWidth = 2;
            ctx.beginPath();
            secondaryMotion.cloth.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.position.x, point.position.y);
                } else {
                    ctx.lineTo(point.position.x, point.position.y);
                }
            });
            ctx.stroke();
        }
        
        // Render hair physics
        if (secondaryMotion.hair) {
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            secondaryMotion.hair.forEach((segment, index) => {
                if (index === 0) {
                    ctx.moveTo(segment.position.x, segment.position.y);
                } else {
                    ctx.lineTo(segment.position.x, segment.position.y);
                }
            });
            ctx.stroke();
        }
        
        // Render equipment physics
        if (secondaryMotion.equipment) {
            secondaryMotion.equipment.forEach(item => {
                ctx.fillStyle = item.type === 'sword' ? '#C0C0C0' : '#8B4513';
                ctx.fillRect(item.position.x - 2, item.position.y - 1, 4, 2);
            });
        }
        
        ctx.restore();
    }
    
    // Render skeletal overlay for debugging and enhanced visualization
    renderSkeletalOverlay(ctx, skeleton) {
        if (!skeleton) {return}
        
        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.fillStyle = '#ffff44';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        
        // Draw bones
        this.drawBone(ctx, skeleton.torso, skeleton.head);
        this.drawBone(ctx, skeleton.torso, skeleton.pelvis);
        
        // Draw arms
        this.drawBone(ctx, skeleton.leftArm.shoulder, skeleton.leftArm.elbow);
        this.drawBone(ctx, skeleton.leftArm.elbow, skeleton.leftArm.hand);
        this.drawBone(ctx, skeleton.rightArm.shoulder, skeleton.rightArm.elbow);
        this.drawBone(ctx, skeleton.rightArm.elbow, skeleton.rightArm.hand);
        
        // Draw legs
        this.drawBone(ctx, skeleton.leftLeg.hip, skeleton.leftLeg.knee);
        this.drawBone(ctx, skeleton.leftLeg.knee, skeleton.leftLeg.foot);
        this.drawBone(ctx, skeleton.rightLeg.hip, skeleton.rightLeg.knee);
        this.drawBone(ctx, skeleton.rightLeg.knee, skeleton.rightLeg.foot);
        
        // Draw joints
        const joints = [
            skeleton.head, skeleton.torso, skeleton.pelvis,
            skeleton.leftArm.shoulder, skeleton.leftArm.elbow, skeleton.leftArm.hand,
            skeleton.rightArm.shoulder, skeleton.rightArm.elbow, skeleton.rightArm.hand,
            skeleton.leftLeg.hip, skeleton.leftLeg.knee, skeleton.leftLeg.foot,
            skeleton.rightLeg.hip, skeleton.rightLeg.knee, skeleton.rightLeg.foot
        ];
        
        joints.forEach(joint => {
            if (joint && typeof joint.x !== "undefined" && typeof joint.y !== "undefined") {
                ctx.beginPath();
                ctx.arc(joint.x, joint.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.restore();
    }
    
    // Helper method to draw bones
    drawBone(ctx, start, end) {
        if (!start || !end || typeof start.x === "undefined" || typeof end.x === "undefined") {return}
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
    
    // Input helper to convert keyboard to player input - 5-button combat system
    static createInputFromKeys(keys) {
        return {
            // Movement
            left: keys.a || keys.arrowleft,
            right: keys.d || keys.arrowright,
            up: keys.w || keys.arrowup,
            down: keys.s || keys.arrowdown,
            
            // 5-Button Combat System
            lightAttack: keys.j || keys['1'],        // A1 = Light Attack
            heavyAttack: keys.k || keys['2'],        // A2 = Heavy Attack  
            block: keys.shift || keys['3'],          // Block = Hold to guard, tap to parry
            roll: keys.control || keys['4'],         // Roll = Dodge with i-frames
            special: keys.l || keys['5'],            // Special = Hero move
            
            // Legacy support
            attack: keys.j || keys[' '],             // Maps to light attack
            jump: keys.space || keys.z
        }
    }
    
    // New movement methods for enhanced animations
    // These methods now just trigger actions, WASM will handle state changes
    jump() {
        // WASM will drive the jump state, so we just trigger the action
        globalThis.wasmExports?.on_jump?.(); // New WASM function call for jumping
        if (this.particleSystem) {
            this.particleSystem.createDustCloud(this.x, this.y + this.height/2);
        }
        
        if (this.soundSystem) {
            this.soundSystem.play('jump');
        }
    }
    
}

// Static helper: attach a key to toggle debug overlays for a given player instance
AnimatedPlayer.attachDebugToggle = function(playerInstance, key = 'F3') {
    if (!playerInstance || playerInstance.__debugToggleAttached) { return }
    const targetKey = (key || 'F3').toLowerCase();
    const handler = (e) => {
        const k = (e.key || '').toLowerCase();
        if (k === targetKey.toLowerCase()) {
            playerInstance.debugMode = !playerInstance.debugMode;
        }
    };
    try {
        addEventListener('keydown', handler);
        playerInstance.__debugToggleAttached = true;
    } catch {
        // Ignore debug handler attachment errors
    }
};

export { AnimatedPlayer, AnimatedPlayer as default };
