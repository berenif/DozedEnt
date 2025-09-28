const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// CombatModule controls arm targeting for attacks, blocks, and locomotion sway.
export default class CombatModule {
    constructor(config = {}) {
        this.config = {
            attackReach: config.attackReach ?? 18,
            blockGuardHeight: config.blockGuardHeight ?? -10,
            blendSpeed: config.blendSpeed ?? 14,
            swingAmplitude: config.swingAmplitude ?? 7
        }
        this.currentTargets = {
            leftHand: { x: -12, y: -2 },
            rightHand: { x: 12, y: -2 }
        }
    }

    apply(deltaTime, pose, context) {
        const state = context.playerState || 'idle'
        const facing = context.facing ?? 1
        const normalizedTime = clamp(context.normalizedTime ?? 0, 0, 1)
        const locomotion = context.locomotion || { stridePhase: 0, moving: false }
        const speed = context.speed ?? 0

        const baseLeft = { x: -12, y: -2 }
        const baseRight = { x: 12, y: -2 }
        let targetLeft = { ...baseLeft }
        let targetRight = { ...baseRight }

        if (state === 'attacking') {
            const swing = Math.sin(normalizedTime * Math.PI)
            const reach = this.config.attackReach * (context.attackStrength ?? 1)
            targetRight.x = facing * (reach * swing)
            targetRight.y = -6 - swing * 6
            targetLeft.x = facing * (reach * 0.35)
            targetLeft.y = -8 - swing * 2
        } else if (state === 'blocking') {
            targetRight.x = facing * 10
            targetRight.y = this.config.blockGuardHeight
            targetLeft.x = facing * 6
            targetLeft.y = this.config.blockGuardHeight - 1
        } else if (state === 'rolling') {
            targetRight.x = facing * 6
            targetRight.y = -4
            targetLeft.x = -facing * 6
            targetLeft.y = -4
        } else {
            const swing = Math.sin(locomotion.stridePhase * Math.PI * 2) * (locomotion.moving ? 1 : 0)
            targetRight.x = baseRight.x + facing * swing * this.config.swingAmplitude
            targetRight.y = baseRight.y + Math.cos(locomotion.stridePhase * Math.PI * 2) * 2
            targetLeft.x = baseLeft.x - facing * swing * this.config.swingAmplitude
            targetLeft.y = baseLeft.y - Math.cos(locomotion.stridePhase * Math.PI * 2) * 2
        }

        const blendSpeed = this.config.blendSpeed + speed * 0.02
        this.currentTargets.leftHand.x = damp(this.currentTargets.leftHand.x, targetLeft.x, deltaTime, blendSpeed)
        this.currentTargets.leftHand.y = damp(this.currentTargets.leftHand.y, targetLeft.y, deltaTime, blendSpeed)
        this.currentTargets.rightHand.x = damp(this.currentTargets.rightHand.x, targetRight.x, deltaTime, blendSpeed)
        this.currentTargets.rightHand.y = damp(this.currentTargets.rightHand.y, targetRight.y, deltaTime, blendSpeed)

        pose.leftArm.hand.x = this.currentTargets.leftHand.x
        pose.leftArm.hand.y = this.currentTargets.leftHand.y
        pose.rightArm.hand.x = this.currentTargets.rightHand.x
        pose.rightArm.hand.y = this.currentTargets.rightHand.y

        pose.leftArm.elbow.x = (pose.leftArm.shoulder.x + pose.leftArm.hand.x) * 0.5
        pose.leftArm.elbow.y = (pose.leftArm.shoulder.y + pose.leftArm.hand.y) * 0.5 + 4
        pose.rightArm.elbow.x = (pose.rightArm.shoulder.x + pose.rightArm.hand.x) * 0.5
        pose.rightArm.elbow.y = (pose.rightArm.shoulder.y + pose.rightArm.hand.y) * 0.5 + 4

        return {
            handTargets: {
                left: { ...this.currentTargets.leftHand },
                right: { ...this.currentTargets.rightHand }
            },
            poseState: state
        }
    }
}
