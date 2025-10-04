const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// SpineModule creates natural S-curve spine bending and counter-rotation
// between pelvis and chest for realistic torso motion.
export default class SpineModule {
    constructor(config = {}) {
        this.config = {
            maxBend: config.maxBend ?? 0.15,
            counterRotationRatio: config.counterRotationRatio ?? 0.6,
            bendResponsiveness: config.bendResponsiveness ?? 8,
            breathingAmplitude: config.breathingAmplitude ?? 1.2,
            breathingRate: config.breathingRate ?? 0.25  // breaths per second
        }
        
        this.spineState = {
            lowerBend: 0,
            chestBend: 0,
            neckBend: 0,
            chestRotation: 0,
            breathPhase: 0
        }
    }

    apply(deltaTime, pose, context) {
        const velocity = context.velocity || { x: 0, y: 0 }
        const facing = context.facing ?? 1
        const maxSpeed = context.maxSpeed ?? 0.3
        const posture = context.posture || { lean: 0 }
        const locomotion = context.locomotion || { stridePhase: 0, moving: false }
        const breathing = context.breathing ?? 1
        
        const horizontalVelocity = clamp(velocity.x / maxSpeed, -1, 1)
        const speed = context.speed ?? Math.hypot(velocity.x, velocity.y)
        const speedRatio = clamp(speed / maxSpeed, 0, 1)
        
        // Update breathing cycle
        this.spineState.breathPhase = (this.spineState.breathPhase + deltaTime * this.config.breathingRate * breathing) % 1
        const breathCycle = Math.sin(this.spineState.breathPhase * Math.PI * 2)
        const breathExpansion = breathCycle * this.config.breathingAmplitude * breathing
        
        // S-curve bending based on lateral movement
        const bendTarget = horizontalVelocity * this.config.maxBend
        this.spineState.lowerBend = damp(this.spineState.lowerBend, bendTarget * 1.2, deltaTime, this.config.bendResponsiveness)
        this.spineState.chestBend = damp(this.spineState.chestBend, bendTarget * 0.8, deltaTime, this.config.bendResponsiveness)
        this.spineState.neckBend = damp(this.spineState.neckBend, bendTarget * 0.4, deltaTime, this.config.bendResponsiveness)
        
        // Counter-rotation: chest rotates opposite to pelvis during stride
        const pelvisRotation = Math.sin(locomotion.stridePhase * Math.PI * 2) * speedRatio * 0.15
        const chestRotationTarget = -pelvisRotation * this.config.counterRotationRatio
        this.spineState.chestRotation = damp(
            this.spineState.chestRotation,
            chestRotationTarget,
            deltaTime,
            this.config.bendResponsiveness
        )
        
        // Apply to pose joints
        // Lower spine: between pelvis and chest, follows pelvis rotation
        pose.lowerSpine.x = pose.pelvis.x + facing * this.spineState.lowerBend * 8
        pose.lowerSpine.y = pose.pelvis.y + (-7 - pose.pelvis.y) * 0.5
        pose.lowerSpine.rotation = pelvisRotation * 0.5
        
        // Chest: counter-rotates and has breathing expansion
        pose.chest.x = pose.lowerSpine.x + facing * this.spineState.chestBend * 10
        pose.chest.y = pose.lowerSpine.y - 7 + breathExpansion * 0.3
        pose.chest.rotation = this.spineState.chestRotation
        
        // Neck: between chest and head, gentle bend
        pose.neck.x = pose.chest.x + facing * this.spineState.neckBend * 6
        pose.neck.y = pose.chest.y - 6
        pose.neck.rotation = -this.spineState.chestRotation * 0.3
        
        // Update clavicles (attached to chest, lifted by breathing)
        const clavicleSpread = 5
        const clavicleY = pose.chest.y - 2 - breathExpansion * 0.5
        pose.clavicleL.x = pose.chest.x - clavicleSpread
        pose.clavicleL.y = clavicleY
        pose.clavicleR.x = pose.chest.x + clavicleSpread
        pose.clavicleR.y = clavicleY
        
        // Update shoulder positions (attached to clavicles)
        pose.leftArm.shoulder.x = pose.clavicleL.x - 2
        pose.leftArm.shoulder.y = pose.clavicleL.y - 1
        pose.rightArm.shoulder.x = pose.clavicleR.x + 2
        pose.rightArm.shoulder.y = pose.clavicleR.y - 1
        
        // Sync legacy torso with chest for backward compatibility
        pose.torso.x = pose.chest.x
        pose.torso.y = pose.chest.y
        pose.torso.rotation = pose.chest.rotation
        
        return {
            spineBend: {
                lower: this.spineState.lowerBend,
                chest: this.spineState.chestBend,
                neck: this.spineState.neckBend
            },
            counterRotation: this.spineState.chestRotation,
            breathExpansion,
            breathPhase: this.spineState.breathPhase
        }
    }
}

