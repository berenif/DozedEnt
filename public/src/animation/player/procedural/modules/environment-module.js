const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// EnvironmentModule applies wind and temperature responses without touching game logic.
export default class EnvironmentModule {
    constructor(config = {}) {
        this.config = {
            windInfluence: config.windInfluence ?? 0.25,
            shiverMagnitude: config.shiverMagnitude ?? 0.6,
            windResponsiveness: config.windResponsiveness ?? 4,
            shiverResponsiveness: config.shiverResponsiveness ?? 6
        }
        this.wind = 0
        this.shiver = 0
        this.shiverPhase = 0
    }

    apply(deltaTime, pose, context) {
        const targetWind = context.wind ?? 0
        const targetShiver = context.temperatureShiver ?? 0

        this.wind = damp(this.wind, targetWind, deltaTime, this.config.windResponsiveness)
        this.shiver = damp(this.shiver, targetShiver, deltaTime, this.config.shiverResponsiveness)
        this.shiverPhase = (this.shiverPhase + deltaTime * 18) % (Math.PI * 2)

        const shiverOffset = Math.sin(this.shiverPhase) * this.shiver * this.config.shiverMagnitude

        pose.torso.x += this.wind * this.config.windInfluence
        pose.head.x += this.wind * this.config.windInfluence * 1.5
        pose.leftArm.hand.x += this.wind * this.config.windInfluence * 1.2
        pose.rightArm.hand.x += this.wind * this.config.windInfluence * 1.2

        pose.torso.y += shiverOffset * 0.6
        pose.head.y += shiverOffset * 0.4

        return {
            wind: this.wind,
            shiver: shiverOffset,
            temperature: targetShiver
        }
    }
}
