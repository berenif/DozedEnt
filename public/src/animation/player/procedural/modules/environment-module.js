const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// EnvironmentModule applies wind, temperature, and ground coupling without touching game logic.
export default class EnvironmentModule {
    constructor(config = {}) {
        this.config = {
            windInfluence: config.windInfluence ?? 0.25,
            shiverMagnitude: config.shiverMagnitude ?? 0.6,
            windResponsiveness: config.windResponsiveness ?? 4,
            shiverResponsiveness: config.shiverResponsiveness ?? 6,
            pelvisTiltAmount: config.pelvisTiltAmount ?? 4,
            pelvisTiltResponse: config.pelvisTiltResponse ?? 8,
            groundLiftResponse: config.groundLiftResponse ?? 10
        }
        this.wind = 0
        this.shiver = 0
        this.shiverPhase = 0
        this.pelvisTilt = 0
        this.groundLift = 0
    }

    apply(deltaTime, pose, context) {
        const targetWind = context.wind ?? 0
        const targetShiver = context.temperatureShiver ?? 0
        const targetPelvisTilt = context.pelvisTilt ?? 0
        const groundY = (context.overlay && typeof context.overlay.groundY === 'number') ? context.overlay.groundY : null

        this.wind = damp(this.wind, targetWind, deltaTime, this.config.windResponsiveness)
        this.shiver = damp(this.shiver, targetShiver, deltaTime, this.config.shiverResponsiveness)
        this.shiverPhase = (this.shiverPhase + deltaTime * 18) % (Math.PI * 2)
        this.pelvisTilt = damp(this.pelvisTilt, targetPelvisTilt, deltaTime, this.config.pelvisTiltResponse)

        const shiverOffset = Math.sin(this.shiverPhase) * this.shiver * this.config.shiverMagnitude

        pose.torso.x += this.wind * this.config.windInfluence
        pose.head.x += this.wind * this.config.windInfluence * 1.5
        pose.leftArm.hand.x += this.wind * this.config.windInfluence * 1.2
        pose.rightArm.hand.x += this.wind * this.config.windInfluence * 1.2

        pose.torso.y += shiverOffset * 0.6
        pose.head.y += shiverOffset * 0.4

        // Apply gentle pelvis tilt based on ground normal coupling
        if (this.pelvisTilt) {
            pose.pelvis.x += this.pelvisTilt * this.config.pelvisTiltAmount
            pose.torso.rotation = (pose.torso.rotation || 0) + this.pelvisTilt * 0.1
        }

        // If groundY provided, softly lift/lower skeleton baseline
        if (groundY !== null) {
            this.groundLift = damp(this.groundLift, groundY, deltaTime, this.config.groundLiftResponse)
            pose.pelvis.y += (this.groundLift) * 0.2
        }

        return {
            wind: this.wind,
            shiver: shiverOffset,
            temperature: targetShiver,
            pelvisTilt: this.pelvisTilt,
            groundLift: this.groundLift
        }
    }
}
