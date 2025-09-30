const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// CorePostureModule adjusts pelvis, torso, and head based on locomotion metrics
// while staying agnostic of game logic. All required data is supplied through
// the context so the module can be unit tested in isolation.
export default class CorePostureModule {
    constructor(config = {}) {
        this.config = {
            maxLean: config.maxLean ?? 0.35,
            pelvisBobAmplitude: config.pelvisBobAmplitude ?? 3,
            headStabilization: config.headStabilization ?? 0.55,
            leanResponsiveness: config.leanResponsiveness ?? 10,
            bobResponsiveness: config.bobResponsiveness ?? 14
        }
        this.lean = 0
        this.pelvisOffset = 0
        this.breathTimer = 0
    }

    apply(deltaTime, pose, context) {
        const velocity = context.velocity || { x: 0, y: 0 }
        const facing = context.facing ?? 1
        // Use normalized WASM movement max (~0.3 units/sec) for lean scaling
        const maxSpeed = context.maxSpeed ?? 0.3
        const normalizedTime = context.normalizedTime ?? 0
        const isGrounded = context.isGrounded ?? true
        const pelvisOverlay = context.pelvisOffset ?? 0
        const breathing = context.breathing ?? 1
        const fatigue = clamp(context.fatigue ?? 0, 0, 1)

        const horizontalVelocity = clamp(velocity.x / maxSpeed, -1, 1)
        const leanTarget = horizontalVelocity * this.config.maxLean
        this.lean = damp(this.lean, leanTarget, deltaTime, this.config.leanResponsiveness)

        const gaitPhase = context.stridePhase ?? normalizedTime
        const bobAmplitude = isGrounded ? this.config.pelvisBobAmplitude : this.config.pelvisBobAmplitude * 0.3
        const fatigueDrop = fatigue * bobAmplitude * 0.5
        const bobTarget = Math.sin(gaitPhase * Math.PI * 2) * bobAmplitude - fatigueDrop + pelvisOverlay
        this.pelvisOffset = damp(this.pelvisOffset, bobTarget, deltaTime, this.config.bobResponsiveness)

        this.breathTimer += deltaTime * clamp(breathing, 0.25, 2)
        const breathOffset = Math.sin(this.breathTimer * Math.PI * 2) * 0.6 * breathing

        pose.pelvis.x = this.lean * 4 * facing
        pose.pelvis.y = this.pelvisOffset
        pose.torso.x = this.lean * 12 * facing
        pose.torso.y = -14 + this.pelvisOffset * 0.35
        pose.torso.rotation = this.lean * 0.25

        pose.head.x = this.lean * 6 * facing
        pose.head.y = -26 + (this.pelvisOffset * (1 - this.config.headStabilization)) + breathOffset
        pose.head.rotation = -this.lean * 0.2

        return {
            offsetX: this.lean * 3 * facing,
            offsetY: this.pelvisOffset * 0.2,
            rotation: this.lean * 0.12,
            pelvis: this.pelvisOffset,
            lean: this.lean,
            breathOffset
        }
    }
}
