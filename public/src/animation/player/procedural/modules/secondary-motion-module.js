const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

const cloneChain = (chain) => chain.map(point => ({
    position: { x: point.position.x, y: point.position.y }
}))

// SecondaryMotionModule creates lightweight trailing data for cloth, hair, and
// equipment. The module only relies on the pose and context, keeping the physics
// approximation deterministic and testable.
export default class SecondaryMotionModule {
    constructor(config = {}) {
        const clothPoints = Math.max(2, config.clothPoints ?? 5)
        const hairSegments = Math.max(2, config.hairSegments ?? 4)

        this.cloth = Array.from({ length: clothPoints }, (_, index) => ({
            position: { x: 0, y: index * 4 }
        }))
        this.hair = Array.from({ length: hairSegments }, (_, index) => ({
            position: { x: 0, y: -index * 3 }
        }))
        this.equipment = [{ type: 'sword', position: { x: 0, y: 0 }, orientation: 0 }]
        this.time = 0
        // Impulse accumulators for landing/hurt/block impacts
        this.impulse = { x: 0, y: 0 }
        this.impulseDecay = config.impulseDecay ?? 12
        this.impulseStrength = {
            landing: config.landingImpulse ?? 12,
            hurt: config.hurtImpulse ?? 10,
            blockImpact: config.blockImpulse ?? 8
        }
    }

    apply(deltaTime, pose, context) {
        this.time += deltaTime

        const wind = context.wind ?? 0
        const momentum = context.momentum || context.velocity || { x: 0, y: 0 }
        const facing = context.facing ?? 1
        const clothSway = context.clothSway ?? 0
        const hairBounce = context.hairBounce ?? 0
        const equipmentJiggle = context.equipmentJiggle ?? 0
        const events = context.events || {}

        this.updateChain(this.cloth, {
            x: pose.pelvis.x ?? 0,
            y: pose.pelvis.y + 4
        }, deltaTime, {
            wind,
            momentum,
            gravity: 12,
            sway: clothSway,
            bounce: clothSway * 0.5
        })

        this.updateChain(this.hair, {
            x: pose.head.x,
            y: pose.head.y - 6
        }, deltaTime, {
            wind: wind * 0.8,
            momentum,
            gravity: 4,
            sway: hairBounce,
            bounce: hairBounce
        })

        const anchor = {
            x: pose.rightArm.hand.x,
            y: pose.rightArm.hand.y
        }
        const weapon = this.equipment[0]
        const jiggleX = Math.sin(this.time * 6) * equipmentJiggle * 2
        const jiggleY = Math.cos(this.time * 4) * equipmentJiggle * 2
        // Apply event impulses (brief, damped bursts)
        if (events.landing) {
            this.impulse.y += this.impulseStrength.landing
        }
        if (events.hurt) {
            this.impulse.x += -facing * this.impulseStrength.hurt
        }
        if (events.blockImpact) {
            this.impulse.x += facing * this.impulseStrength.blockImpact * 0.5
            this.impulse.y += this.impulseStrength.blockImpact * 0.3
        }
        // Decay impulses
        this.impulse.x = damp(this.impulse.x, 0, deltaTime, this.impulseDecay)
        this.impulse.y = damp(this.impulse.y, 0, deltaTime, this.impulseDecay)

        weapon.position.x = damp(
            weapon.position.x,
            anchor.x - facing * 6 + momentum.x * 0.06 + jiggleX + this.impulse.x * 0.4,
            deltaTime,
            10
        )
        weapon.position.y = damp(
            weapon.position.y,
            anchor.y + 6 + momentum.y * 0.06 + jiggleY + this.impulse.y * 0.5,
            deltaTime,
            10
        )

        // Orientation: align to wrist→hand vector or wrist orientation if provided
        const wristOrient = context.armIK?.wristOrientations?.right?.rotation
        if (typeof wristOrient === 'number') {
            weapon.orientation = wristOrient
        } else {
            const dx = (pose.rightArm.hand.x - (pose.rightArm.wrist?.x ?? pose.rightArm.hand.x))
            const dy = (pose.rightArm.hand.y - (pose.rightArm.wrist?.y ?? pose.rightArm.hand.y))
            weapon.orientation = Math.atan2(dy, dx)
        }

        return {
            cloth: cloneChain(this.cloth),
            hair: cloneChain(this.hair),
            equipment: this.equipment.map(item => ({
                type: item.type,
                position: { x: item.position.x, y: item.position.y },
                orientation: item.orientation
            }))
        }
    }

    updateChain(chain, anchor, deltaTime, forces) {
        let previous = anchor
        chain.forEach((point, index) => {
            const sway = (forces.sway ?? 0) * Math.sin((this.time * 3) + index * 0.6)
            const bounce = (forces.bounce ?? 0) * Math.cos((this.time * 4) + index * 0.5)
            const targetX = previous.x + forces.wind * (index + 1) * 0.3 + forces.momentum.x * 0.02 + sway
            const targetY = previous.y + index * 4 + forces.momentum.y * 0.015 + forces.gravity * 0.05 + bounce
            point.position.x = damp(point.position.x, targetX, deltaTime, 12)
            point.position.y = damp(point.position.y, targetY, deltaTime, 12)
            previous = point.position
        })
    }
}
