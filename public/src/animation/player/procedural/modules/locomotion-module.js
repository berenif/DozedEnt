const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// Realistic human locomotion module based on biomechanics
export default class LocomotionModule {
    constructor(config = {}) {
        this.config = {
            // Human proportions (in skeleton units)
            legLength: config.legLength ?? 20,           // Total leg length
            thighLength: config.thighLength ?? 12,       // Upper leg
            shinLength: config.shinLength ?? 8,          // Lower leg
            footLength: config.footLength ?? 4,          // Foot length
            
            // Gait parameters
            strideLength: config.strideLength ?? 12,     // Forward stride
            stepHeight: config.stepHeight ?? 6,          // Maximum foot lift
            stanceWidth: config.stanceWidth ?? 6,        // Distance between feet
            
            // Speed and cadence
            maxStrideSpeed: config.maxStrideSpeed ?? 0.3,
            basePhaseSpeed: config.basePhaseSpeed ?? 2.0,
            cadenceScaling: config.cadenceScaling ?? 1.5,
            
            // Biomechanical parameters
            hipFlexion: config.hipFlexion ?? 0.3,        // Hip forward/back movement
            kneeFlexion: config.kneeFlexion ?? 0.4,      // Knee bend during swing
            ankleFlexion: config.ankleFlexion ?? 0.2,    // Ankle articulation
            
            // Balance and weight shifting
            weightShiftAmount: config.weightShiftAmount ?? 0.3,
            balanceRecovery: config.balanceRecovery ?? 8.0
        }
        
        // Gait cycle state
        this.phase = 0                    // Overall gait phase (0-1)
        this.leftPhase = 0               // Left leg phase (0-1)
        this.rightPhase = 0              // Right leg phase (0-1)
        
        // Biomechanical state
        this.weightShift = 0             // Current weight shift (-1 to 1)
        this.lastStepPower = 0
        this.contactTimer = { left: 0, right: 0 }
        
        // Previous state for smooth transitions
        this.prevVelocity = { x: 0, y: 0 }
        this.prevDirection = { x: 0, y: 0 }
    }

    apply(deltaTime, pose, context) {
        const velocity = context.velocity || { x: 0, y: 0 };
        const speed = context.speed ?? Math.hypot(velocity.x, velocity.y);
        const isGrounded = context.isGrounded ?? true;
        const groundOffset = context.groundOffset ?? 0;

        // Calculate movement direction and speed ratio
        const speedRatio = clamp(speed / this.config.maxStrideSpeed, 0, 1)
        const moving = speedRatio > 0.01

        // Calculate movement direction from velocity
        const movementDirection = { x: 0, y: 0 }
        if (speed > 0.001) {
            movementDirection.x = velocity.x / speed
            movementDirection.y = velocity.y / speed
        }

        // Update gait cycle based on movement (with subtle left/right asymmetry)
        if (moving) {
            // Natural cadence: faster speeds = higher stride frequency
            const strideRate = this.config.basePhaseSpeed * (1 + speedRatio * this.config.cadenceScaling)
            this.phase = (this.phase + deltaTime * strideRate) % 1
            
            // Calculate individual leg phases (offset by 50% for alternating gait)
            const asym = context.asymmetry || { leftPhaseOffset: 0, rightPhaseOffset: 0 }
            this.leftPhase = (this.phase + (asym.leftPhaseOffset || 0)) % 1
            this.rightPhase = (this.phase + 0.5 + (asym.rightPhaseOffset || 0)) % 1
        } else {
            // Return to neutral position when stopped
            this.phase = damp(this.phase, 0, deltaTime, 6)
            this.leftPhase = damp(this.leftPhase, 0, deltaTime, 6)
            this.rightPhase = damp(this.rightPhase, 0.5, deltaTime, 6)
        }

        // Update weight shifting for balance
        this.updateWeightShifting(deltaTime, speedRatio, movementDirection)

        // Apply realistic human locomotion
        this.applyRealisticLocomotion(pose, speedRatio, movementDirection, isGrounded, groundOffset, context)

        // Debug logging (disabled by default - uncomment to enable)
        // if (!this._debugCounter) this._debugCounter = 0
        // this._debugCounter++
        // if (this._debugCounter % 60 === 0 && speed > 0.001) {
        //     console.log('[LocomotionModule] Human gait - speed:', speed.toFixed(4), 'ratio:', speedRatio.toFixed(3), 'moving:', moving)
        //     console.log('[LocomotionModule] Phases - overall:', this.phase.toFixed(3), 'left:', this.leftPhase.toFixed(3), 'right:', this.rightPhase.toFixed(3))
        //     console.log('[LocomotionModule] Weight shift:', this.weightShift.toFixed(3))
        //     console.log('[LocomotionModule] Movement direction:', { x: movementDirection.x.toFixed(3), y: movementDirection.y.toFixed(3) })
        //     
        //     const isHorizontalMovement = Math.abs(movementDirection.x) > Math.abs(movementDirection.y)
        //     const isVerticalMovement = Math.abs(movementDirection.y) > Math.abs(movementDirection.x)
        //     console.log('[LocomotionModule] Movement type:', isHorizontalMovement ? 'horizontal' : (isVerticalMovement ? 'vertical' : 'diagonal'))
        // }

        this.lastStepPower = damp(this.lastStepPower, moving ? speedRatio : 0, deltaTime, 8)

        return {
            stridePhase: this.phase,
            moving,
            stepPower: this.lastStepPower,
            stanceWidth: this.config.stanceWidth,
            cadence: moving ? this.config.basePhaseSpeed * (1 + speedRatio * this.config.cadenceScaling) : 0,
            footContacts: {
                left: this.leftPhase < 0.1 || this.leftPhase > 0.9,
                right: this.rightPhase < 0.1 || this.rightPhase > 0.9
            },
            contactTimers: {
                left: this.contactTimer.left,
                right: this.contactTimer.right
            },
            speedRatio,
            weightShift: this.weightShift
        }
    }

    // Update weight shifting for realistic balance
    updateWeightShifting(deltaTime, speedRatio, movementDirection) {
        if (speedRatio > 0.01) {
            // Weight shifts toward the supporting leg during gait
            const targetWeightShift = Math.sin(this.phase * Math.PI * 2) * this.config.weightShiftAmount
            this.weightShift = damp(this.weightShift, targetWeightShift, deltaTime, this.config.balanceRecovery)
        } else {
            // Return to center when stopped
            this.weightShift = damp(this.weightShift, 0, deltaTime, this.config.balanceRecovery)
        }
    }

    // Apply realistic human locomotion with proper biomechanics
    applyRealisticLocomotion(pose, speedRatio, movementDirection, isGrounded, groundOffset, context) {
        const groundedMultiplier = isGrounded ? 1.0 : 0.6
        
        // Base foot positions
        const stanceWidth = this.config.stanceWidth
        const baseLeftX = -stanceWidth * 0.5
        const baseRightX = stanceWidth * 0.5
        const baseY = 21 + groundOffset

        // Calculate realistic foot placement for each leg
        const leftFoot = this.calculateFootPosition(this.leftPhase, speedRatio, movementDirection, groundedMultiplier, baseLeftX, baseY)
        const rightFoot = this.calculateFootPosition(this.rightPhase, speedRatio, movementDirection, groundedMultiplier, baseRightX, baseY)

        // Apply foot positions
        pose.leftLeg.foot.x = leftFoot.x
        pose.leftLeg.foot.y = leftFoot.y
        pose.rightLeg.foot.x = rightFoot.x
        pose.rightLeg.foot.y = rightFoot.y

        // Calculate realistic knee positions using inverse kinematics
        const leftKnee = this.calculateKneePosition(pose.leftLeg, leftFoot, this.leftPhase, speedRatio)
        const rightKnee = this.calculateKneePosition(pose.rightLeg, rightFoot, this.rightPhase, speedRatio)

        pose.leftLeg.knee.x = leftKnee.x
        pose.leftLeg.knee.y = leftKnee.y
        pose.rightLeg.knee.x = rightKnee.x
        pose.rightLeg.knee.y = rightKnee.y

        // Calculate ankle positions for natural foot orientation
        const leftAnkle = this.calculateAnklePosition(leftFoot, leftKnee, movementDirection, this.leftPhase)
        const rightAnkle = this.calculateAnklePosition(rightFoot, rightKnee, movementDirection, this.rightPhase)

        pose.leftLeg.ankle.x = leftAnkle.x
        pose.leftLeg.ankle.y = leftAnkle.y
        pose.rightLeg.ankle.x = rightAnkle.x
        pose.rightLeg.ankle.y = rightAnkle.y

        // Apply weight shifting to hip positions with small asymmetry bias
        const asymArmBias = (context.asymmetry?.armSwingBias || 0) * 0.2
        const hipShift = this.weightShift * 0.5 + asymArmBias
        pose.leftLeg.hip.x += hipShift
        pose.rightLeg.hip.x -= hipShift
    }

    // Calculate realistic foot position based on gait phase
    calculateFootPosition(phase, speedRatio, movementDirection, groundedMultiplier, baseX, baseY) {
        // Gait phases: 0-0.1 = heel strike, 0.1-0.6 = stance, 0.6-1.0 = swing
        const isStance = phase >= 0.1 && phase <= 0.6
        const isSwing = phase > 0.6 || phase < 0.1

        let footX = baseX
        let footY = baseY

        // Determine movement type for different gait mechanics
        const isHorizontalMovement = Math.abs(movementDirection.x) > Math.abs(movementDirection.y)
        const isVerticalMovement = Math.abs(movementDirection.y) > Math.abs(movementDirection.x)

        if (isSwing) {
            // Swing phase: foot lifts and moves forward
            const swingProgress = phase > 0.6 ? (phase - 0.6) / 0.4 : (phase + 0.4) / 0.4
            
            // Foot lift follows natural arc
            const liftHeight = Math.sin(swingProgress * Math.PI) * this.config.stepHeight * groundedMultiplier
            
            // Calculate stride amount and progress
            const strideAmount = this.config.strideLength * speedRatio * groundedMultiplier
            const strideProgress = Math.sin(swingProgress * Math.PI)
            
            if (isHorizontalMovement) {
                // Normal horizontal stepping
                footX += strideAmount * movementDirection.x * strideProgress
                footY -= liftHeight  // Lift foot up, don't move in Y direction
            } else if (isVerticalMovement) {
                // Vertical movement: smaller steps, more shuffling motion
                const verticalStrideAmount = strideAmount * 0.6  // Smaller stride for vertical
                footX += strideAmount * movementDirection.x * strideProgress * 0.3  // Minimal horizontal movement
                footY += verticalStrideAmount * movementDirection.y * strideProgress - liftHeight
            } else {
                // Diagonal movement: combine both
                footX += strideAmount * movementDirection.x * strideProgress
                footY += strideAmount * movementDirection.y * strideProgress - liftHeight
            }
        } else {
            // Stance phase: foot stays on ground, slight forward movement
            const stanceProgress = (phase - 0.1) / 0.5
            const strideAmount = this.config.strideLength * speedRatio * groundedMultiplier * 0.3
            
            if (isHorizontalMovement) {
                footX += strideAmount * movementDirection.x * stanceProgress
                // No Y movement during stance for horizontal movement
            } else if (isVerticalMovement) {
                // Vertical stance: slight shuffling movement
                const verticalStrideAmount = strideAmount * 0.4
                footX += strideAmount * movementDirection.x * stanceProgress * 0.2
                footY += verticalStrideAmount * movementDirection.y * stanceProgress
            } else {
                // Diagonal stance
                footX += strideAmount * movementDirection.x * stanceProgress
                footY += strideAmount * movementDirection.y * stanceProgress
            }
        }

        return { x: footX, y: footY }
    }

    // Calculate realistic knee position using inverse kinematics
    calculateKneePosition(leg, footPos, phase, speedRatio) {
        const hipPos = leg.hip
        const footPos2 = footPos
        
        // Distance from hip to foot
        const distance = Math.hypot(footPos2.x - hipPos.x, footPos2.y - hipPos.y)
        
        // Use realistic leg proportions
        const thighLength = this.config.thighLength
        const shinLength = this.config.shinLength
        const totalLength = thighLength + shinLength
        
        // Clamp distance to realistic range
        const clampedDistance = Math.min(distance, totalLength * 0.95)
        
        // Calculate knee position using law of cosines
        const cosAngle = (thighLength * thighLength + clampedDistance * clampedDistance - shinLength * shinLength) / 
                        (2 * thighLength * clampedDistance)
        
        // Handle edge cases
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
        
        // Calculate knee position
        const directionX = (footPos2.x - hipPos.x) / clampedDistance
        const directionY = (footPos2.y - hipPos.y) / clampedDistance
        
        const kneeX = hipPos.x + directionX * thighLength * Math.cos(angle)
        const kneeY = hipPos.y + directionY * thighLength * Math.cos(angle)
        
        // Add natural knee flexion during swing phase
        const isSwing = phase > 0.6 || phase < 0.1
        const kneeFlexion = isSwing ? this.config.kneeFlexion * speedRatio : 0
        
        return {
            x: kneeX,
            y: kneeY - kneeFlexion
        }
    }

    // Calculate ankle position for natural foot orientation
    calculateAnklePosition(footPos, kneePos, movementDirection, phase) {
        // Ankle is positioned between knee and foot with slight offset
        const ankleX = (kneePos.x + footPos.x) * 0.5
        const ankleY = (kneePos.y + footPos.y) * 0.5
        
        // Add slight forward offset for natural foot placement
        const forwardOffset = this.config.ankleFlexion * 0.5
        const offsetX = movementDirection.x * forwardOffset
        const offsetY = movementDirection.y * forwardOffset
        
        return {
            x: ankleX + offsetX,
            y: ankleY + offsetY
        }
    }
}
