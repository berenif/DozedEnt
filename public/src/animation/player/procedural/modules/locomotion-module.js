const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// LocomotionModule drives leg placement and maintains a stride phase based on
// supplied velocity, keeping the implementation pure and easily testable.
export default class LocomotionModule {
    constructor(config = {}) {
        this.config = {
            strideLength: config.strideLength ?? 12,
            stepHeight: config.stepHeight ?? 5,
            stanceWidth: config.stanceWidth ?? 8,
            maxStrideSpeed: config.maxStrideSpeed ?? 220,
            phaseSpeed: config.phaseSpeed ?? 2.2
        }
        this.phase = 0
        this.lastStepPower = 0
    }

    apply(deltaTime, pose, context) {
        const velocity = context.velocity || { x: 0, y: 0 }
        const speed = context.speed ?? Math.hypot(velocity.x, velocity.y)
        const facing = context.facing ?? 1
        const isGrounded = context.isGrounded ?? true
        const legLiftLeft = context.legLiftLeft ?? 0
        const legLiftRight = context.legLiftRight ?? 0
        const groundOffset = context.groundOffset ?? 0

        const speedRatio = clamp(speed / this.config.maxStrideSpeed, 0, 1)
        const moving = speedRatio > 0.05 && isGrounded

        if (moving) {
            const strideRate = this.config.phaseSpeed + speedRatio * this.config.phaseSpeed
            this.phase = (this.phase + deltaTime * strideRate) % 1
        } else {
            this.phase = damp(this.phase, 0, deltaTime, 6)
        }

        const strideAmount = this.config.strideLength * speedRatio
        const baseLeftX = -this.config.stanceWidth * 0.5
        const baseRightX = this.config.stanceWidth * 0.5
        const baseY = 21 + groundOffset

        const leftPhase = this.phase
        const rightPhase = (this.phase + 0.5) % 1

        const leftLift = Math.max(0, Math.sin(leftPhase * Math.PI)) * this.config.stepHeight + legLiftLeft * this.config.stepHeight
        const rightLift = Math.max(0, Math.sin(rightPhase * Math.PI)) * this.config.stepHeight + legLiftRight * this.config.stepHeight

        const leftStride = Math.sin(leftPhase * Math.PI * 2) * strideAmount
        const rightStride = Math.sin(rightPhase * Math.PI * 2) * strideAmount

        pose.leftLeg.foot.x = baseLeftX + facing * leftStride
        pose.leftLeg.foot.y = baseY - leftLift
        pose.rightLeg.foot.x = baseRightX + facing * rightStride
        pose.rightLeg.foot.y = baseY - rightLift

        pose.leftLeg.knee.x = (pose.leftLeg.hip.x + pose.leftLeg.foot.x) * 0.5
        pose.leftLeg.knee.y = (pose.leftLeg.hip.y + pose.leftLeg.foot.y) * 0.5 - (moving ? this.config.stepHeight * 0.5 : 2)
        pose.rightLeg.knee.x = (pose.rightLeg.hip.x + pose.rightLeg.foot.x) * 0.5
        pose.rightLeg.knee.y = (pose.rightLeg.hip.y + pose.rightLeg.foot.y) * 0.5 - (moving ? this.config.stepHeight * 0.5 : 2)

        this.lastStepPower = damp(this.lastStepPower, moving ? speedRatio : 0, deltaTime, 8)

        return {
            stridePhase: this.phase,
            moving,
            stepPower: this.lastStepPower,
            footContacts: {
                left: leftLift < 0.2,
                right: rightLift < 0.2
            }
        }
    }
}
