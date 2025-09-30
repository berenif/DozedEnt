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
        // Attack trail tracking for visual feedback
        this.attackTrail = []
        this.lastAttackState = 'idle'
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
            // Enhanced attack animation with anticipation, swing, and follow-through
            const attackType = context.attackType || 'light'
            const isHeavy = attackType === 'heavy'
            const swing = Math.sin(normalizedTime * Math.PI)
            const reach = this.config.attackReach * (context.attackStrength ?? 1)
            
            // Anticipation phase (0-0.3): pull back
            // Active phase (0.3-0.7): swing forward
            // Recovery phase (0.7-1.0): return to neutral
            let anticipation = 0
            let activeSwing = 0
            let recovery = 0
            
            if (normalizedTime < 0.3) {
                // Pull back during anticipation
                anticipation = normalizedTime / 0.3
                targetRight.x = facing * (-8 * anticipation)
                targetRight.y = -4 - anticipation * 4
                targetLeft.x = facing * (-4 * anticipation)
                targetLeft.y = -6
            } else if (normalizedTime < 0.7) {
                // Active swing phase with maximum reach
                activeSwing = (normalizedTime - 0.3) / 0.4
                const swingCurve = Math.sin(activeSwing * Math.PI)
                targetRight.x = facing * (reach * swingCurve)
                targetRight.y = -6 - swingCurve * 8
                targetLeft.x = facing * (reach * 0.35 * swingCurve)
                targetLeft.y = -8 - swingCurve * 3
            } else {
                // Recovery phase - return to guard position
                recovery = (normalizedTime - 0.7) / 0.3
                const recoveryCurve = 1 - recovery
                targetRight.x = facing * (reach * 0.3 * recoveryCurve)
                targetRight.y = -4 - recoveryCurve * 2
                targetLeft.x = facing * 4
                targetLeft.y = -6
            }
            
            // Heavy attacks have more exaggerated motion
            if (isHeavy) {
                targetRight.y -= 2
                targetRight.x *= 1.3
            }
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

        // Track attack trail for visual effects
        if (state === 'attacking') {
            // Add current hand position to trail during active swing phase
            if (normalizedTime >= 0.3 && normalizedTime <= 0.7) {
                this.attackTrail.push({
                    x: this.currentTargets.rightHand.x,
                    y: this.currentTargets.rightHand.y,
                    alpha: 1.0,
                    time: Date.now()
                })
                // Keep trail limited to last 8 positions
                if (this.attackTrail.length > 8) {
                    this.attackTrail.shift()
                }
            }
            
            // Fade and clean up trail
            const now = Date.now()
            this.attackTrail = this.attackTrail.filter(point => {
                const age = (now - point.time) / 1000
                point.alpha = Math.max(0, 1 - age * 5) // Fade over 0.2 seconds
                return point.alpha > 0
            })
        } else {
            // Clear trail when not attacking
            if (this.lastAttackState === 'attacking' && state !== 'attacking') {
                this.attackTrail = []
            }
        }
        
        this.lastAttackState = state

        return {
            handTargets: {
                left: { ...this.currentTargets.leftHand },
                right: { ...this.currentTargets.rightHand }
            },
            poseState: state,
            attackTrail: [...this.attackTrail], // Copy for rendering
            isAttacking: state === 'attacking',
            attackPhase: state === 'attacking' ? (normalizedTime < 0.3 ? 'anticipation' : normalizedTime < 0.7 ? 'active' : 'recovery') : 'none'
        }
    }
}
