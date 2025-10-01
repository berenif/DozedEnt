const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// Two-bone IK solver for legs (hip -> knee -> ankle -> foot)
const solveLegIK = (hipPos, targetFootPos, upperLength, lowerLength, preferForward = true) => {
    const dx = targetFootPos.x - hipPos.x
    const dy = targetFootPos.y - hipPos.y
    const distance = Math.hypot(dx, dy)
    
    // Clamp to reachable range
    const maxReach = upperLength + lowerLength
    const minReach = Math.abs(upperLength - lowerLength)
    const reachDistance = clamp(distance, minReach + 0.1, maxReach - 0.1)
    
    // Law of cosines for knee angle
    const cosKneeAngle = (upperLength * upperLength + lowerLength * lowerLength - reachDistance * reachDistance) 
                        / (2 * upperLength * lowerLength)
    const kneeAngle = Math.acos(clamp(cosKneeAngle, -1, 1))
    
    // Angle from hip to target
    const hipToTargetAngle = Math.atan2(dy, dx)
    
    // Angle from hip to knee using law of cosines
    const cosHipAngle = (upperLength * upperLength + reachDistance * reachDistance - lowerLength * lowerLength)
                       / (2 * upperLength * reachDistance)
    const hipAngle = Math.acos(clamp(cosHipAngle, -1, 1))
    
    // Bend knee forward (positive x direction) or backward
    const bendDirection = preferForward ? 1 : -1
    const kneeDirection = hipToTargetAngle + bendDirection * hipAngle
    
    const knee = {
        x: hipPos.x + Math.cos(kneeDirection) * upperLength,
        y: hipPos.y + Math.sin(kneeDirection) * upperLength
    }
    
    const ankle = {
        x: knee.x + Math.cos(hipToTargetAngle - bendDirection * (Math.PI - kneeAngle)) * lowerLength,
        y: knee.y + Math.sin(hipToTargetAngle - bendDirection * (Math.PI - kneeAngle)) * lowerLength
    }
    
    return { knee, ankle }
}

// Bezier curve for natural foot trajectory
const bezierFootPath = (phase, startY, peakHeight, endY, startX, endX) => {
    // Cubic Bezier with control points for natural arc
    const t = phase
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    
    // Control points: start low, arc high, end low
    const p0y = startY
    const p1y = startY - peakHeight * 0.3  // Slight lift early
    const p2y = startY - peakHeight         // Peak clearance
    const p3y = endY
    
    const p0x = startX
    const p1x = startX + (endX - startX) * 0.2
    const p2x = startX + (endX - startX) * 0.8
    const p3x = endX
    
    const y = mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y
    const x = mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x
    
    return { x, y }
}

// FootIKModule resolves foot target positions into joint angles using IK,
// handles foot planting with zero slip, and creates natural foot roll.
export default class FootIKModule {
    constructor(config = {}) {
        this.config = {
            thighLength: config.thighLength ?? 11,
            shinLength: config.shinLength ?? 11,
            footLength: config.footLength ?? 3,
            stanceWidth: config.stanceWidth ?? 8,
            stepHeight: config.stepHeight ?? 6,
            strideLength: config.strideLength ?? 12,
            plantThreshold: config.plantThreshold ?? 0.15,  // Phase range for planted foot
            rollDuration: config.rollDuration ?? 0.2,        // Heel-to-toe roll time
            groundAdaptSpeed: config.groundAdaptSpeed ?? 8
        }
        
        // Foot state tracking
        this.leftFoot = {
            planted: false,
            plantedPos: { x: -4, y: 21 },
            phase: 0,
            contactTime: 0,
            rollPhase: 0
        }
        this.rightFoot = {
            planted: false,
            plantedPos: { x: 4, y: 21 },
            phase: 0,
            contactTime: 0,
            rollPhase: 0
        }
        
        this.groundHeightL = 21
        this.groundHeightR = 21
    }

    apply(deltaTime, pose, context) {
        const velocity = context.velocity || { x: 0, y: 0 }
        const speed = context.speed ?? Math.hypot(velocity.x, velocity.y)
        const facing = context.facing ?? 1
        const isGrounded = context.isGrounded ?? true
        const locomotion = context.locomotion || { stridePhase: 0, moving: false }
        const maxSpeed = context.maxSpeed ?? 0.3
        
        const speedRatio = clamp(speed / maxSpeed, 0, 1)
        const moving = speedRatio > 0.05 && isGrounded
        
        // Get ground heights (from environment module if available)
        const groundOffsetL = context.groundOffsetLeft ?? 0
        const groundOffsetR = context.groundOffsetRight ?? 0
        const baseGroundY = 21
        
        this.groundHeightL = damp(this.groundHeightL, baseGroundY + groundOffsetL, deltaTime, this.config.groundAdaptSpeed)
        this.groundHeightR = damp(this.groundHeightR, baseGroundY + groundOffsetR, deltaTime, this.config.groundAdaptSpeed)
        
        // Calculate foot targets using Bezier paths
        const strideAmount = this.config.strideLength * speedRatio
        const stanceWidth = this.config.stanceWidth + speedRatio * 2  // Wider stance when running
        
        const leftPhase = locomotion.stridePhase
        const rightPhase = (locomotion.stridePhase + 0.5) % 1
        
        // Update foot states
        this.updateFootState(this.leftFoot, leftPhase, deltaTime, moving)
        this.updateFootState(this.rightFoot, rightPhase, deltaTime, moving)
        
        // Calculate target positions
        const leftTarget = this.calculateFootTarget(
            this.leftFoot,
            leftPhase,
            -stanceWidth * 0.5,
            this.groundHeightL,
            strideAmount,
            facing,
            moving
        )
        
        const rightTarget = this.calculateFootTarget(
            this.rightFoot,
            rightPhase,
            stanceWidth * 0.5,
            this.groundHeightR,
            strideAmount,
            facing,
            moving
        )
        
        // Solve IK for both legs
        const hipL = { x: pose.leftLeg.hip.x, y: pose.leftLeg.hip.y }
        const hipR = { x: pose.rightLeg.hip.x, y: pose.rightLeg.hip.y }
        
        const leftIK = solveLegIK(hipL, leftTarget, this.config.thighLength, this.config.shinLength, true)
        const rightIK = solveLegIK(hipR, rightTarget, this.config.thighLength, this.config.shinLength, true)
        
        // Debug: log IK results occasionally
        if (!this._debugCounter) this._debugCounter = 0
        this._debugCounter++
        if (this._debugCounter % 60 === 0 && moving) {
            console.log('[FootIK] Moving:', moving, 'Left knee:', leftIK.knee, 'Right knee:', rightIK.knee)
        }
        
        // Apply IK results
        pose.leftLeg.knee = leftIK.knee
        pose.leftLeg.ankle = leftIK.ankle
        pose.leftLeg.foot = { x: leftTarget.x, y: leftTarget.y }
        pose.leftLeg.toe = { 
            x: leftTarget.x + facing * this.config.footLength * (this.leftFoot.rollPhase > 0.5 ? 1 : 0.5),
            y: leftTarget.y 
        }
        
        pose.rightLeg.knee = rightIK.knee
        pose.rightLeg.ankle = rightIK.ankle
        pose.rightLeg.foot = { x: rightTarget.x, y: rightTarget.y }
        pose.rightLeg.toe = { 
            x: rightTarget.x + facing * this.config.footLength * (this.rightFoot.rollPhase > 0.5 ? 1 : 0.5),
            y: rightTarget.y 
        }
        
        // Adjust pelvis height based on average foot height
        const avgFootHeight = (leftTarget.y + rightTarget.y) * 0.5
        pose.pelvis.y += (avgFootHeight - baseGroundY) * 0.3
        
        return {
            leftFootPlanted: this.leftFoot.planted,
            rightFootPlanted: this.rightFoot.planted,
            leftContactTime: this.leftFoot.contactTime,
            rightContactTime: this.rightFoot.contactTime,
            stanceWidth,
            footTargets: {
                left: leftTarget,
                right: rightTarget
            }
        }
    }
    
    updateFootState(foot, phase, deltaTime, moving) {
        foot.phase = phase
        
        // Determine if foot should be planted (near bottom of sine wave)
        const swingPhase = Math.sin(phase * Math.PI)
        const shouldBePlanted = swingPhase < this.config.plantThreshold && moving
        
        if (shouldBePlanted && !foot.planted) {
            // Plant foot
            foot.planted = true
            foot.contactTime = 0
            foot.rollPhase = 0
        } else if (!shouldBePlanted && foot.planted) {
            // Lift foot
            foot.planted = false
        }
        
        if (foot.planted) {
            foot.contactTime += deltaTime
            foot.rollPhase = clamp(foot.contactTime / this.config.rollDuration, 0, 1)
        } else {
            foot.rollPhase = 0
        }
    }
    
    calculateFootTarget(foot, phase, baseX, groundY, strideAmount, facing, moving) {
        if (foot.planted && moving) {
            // Zero slip: keep foot at planted position
            return { ...foot.plantedPos }
        }
        
        // Swing phase: use Bezier curve for natural arc
        const swingPhase = phase
        const strideOffset = Math.sin(swingPhase * Math.PI * 2) * strideAmount
        
        const startX = baseX - facing * strideAmount
        const endX = baseX + facing * strideAmount
        const currentX = baseX + facing * strideOffset
        
        let footY = groundY
        
        if (moving) {
            // Use Bezier for swing arc
            const liftPhase = Math.max(0, Math.sin(swingPhase * Math.PI))
            const bezierPoint = bezierFootPath(
                liftPhase,
                groundY,
                this.config.stepHeight,
                groundY,
                startX,
                endX
            )
            footY = bezierPoint.y
        }
        
        const targetPos = { x: currentX, y: footY }
        
        // Update planted position when foot is about to plant
        if (Math.sin(phase * Math.PI) < this.config.plantThreshold && moving) {
            foot.plantedPos = { ...targetPos }
        }
        
        return targetPos
    }
}

