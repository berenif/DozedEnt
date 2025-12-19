const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const damp = (current, target, deltaTime, speed) => {
    const lambda = Math.exp(-speed * deltaTime)
    return (current * lambda) + (target * (1 - lambda))
}

// HeadGazeModule provides head stabilization, look-at targeting, and
// natural micro-movements like nodding coupled to footsteps.
export default class HeadGazeModule {
    constructor(config = {}) {
        this.config = {
            stabilizationFactor: config.stabilizationFactor ?? 0.7,
            maxYaw: config.maxYaw ?? 0.6,
            maxPitch: config.maxPitch ?? 0.4,
            lookAtSpeed: config.lookAtSpeed ?? 5,
            nodAmplitude: config.nodAmplitude ?? 0.8,
            counterRotationRatio: config.counterRotationRatio ?? 0.3
        }
        
        this.headState = {
            yaw: 0,
            pitch: 0,
            nodOffset: 0,
            lookTarget: null
        }
    }

    apply(deltaTime, pose, context) {
        const facing = context.facing ?? 1;
        const spine = context.spine || { counterRotation: 0 };
        const locomotion = context.locomotion || { stridePhase: 0, moving: false, footContacts: { left: false, right: false } };
        const lookTarget = context.lookTarget || null;
        
        // Counter-rotation: head rotates opposite to chest
        const chestRotation = spine.counterRotation ?? 0
        const counterYaw = -chestRotation * this.config.counterRotationRatio
        
        // Look-at targeting (if target provided)
        let targetYaw = counterYaw
        let targetPitch = 0
        
        if (lookTarget) {
            const dx = lookTarget.x - pose.head.x
            const dy = lookTarget.y - pose.head.y
            const distance = Math.hypot(dx, dy)
            
            if (distance > 1) {
                targetYaw = Math.atan2(dy, dx * facing)
                targetPitch = Math.atan2(-dy, distance) * 0.5
            }
        }
        
        // Clamp to anatomical limits
        targetYaw = clamp(targetYaw, -this.config.maxYaw, this.config.maxYaw)
        targetPitch = clamp(targetPitch, -this.config.maxPitch, this.config.maxPitch)
        
        // Smooth transitions
        this.headState.yaw = damp(this.headState.yaw, targetYaw, deltaTime, this.config.lookAtSpeed)
        this.headState.pitch = damp(this.headState.pitch, targetPitch, deltaTime, this.config.lookAtSpeed)
        
        // Micro-nod on footstep impacts
        const leftContact = locomotion.footContacts?.left ?? false;
        const rightContact = locomotion.footContacts?.right ?? false;
        // nodPhase available for future use: Math.sin(locomotion.stridePhase * Math.PI * 2)
        const nodTarget = (leftContact || rightContact) ? -this.config.nodAmplitude : 0;
        this.headState.nodOffset = damp(this.headState.nodOffset, nodTarget, deltaTime, 20)
        
        // Apply to head pose
        // Head position is already set by spine module, we just adjust orientation
        pose.head.x += Math.sin(this.headState.yaw) * 2 * facing
        pose.head.y += this.headState.nodOffset + Math.sin(this.headState.pitch) * 1.5
        pose.head.rotation = this.headState.yaw * this.config.stabilizationFactor
        pose.head.pitch = this.headState.pitch
        
        return {
            yaw: this.headState.yaw,
            pitch: this.headState.pitch,
            nodOffset: this.headState.nodOffset,
            lookingAt: lookTarget
        }
    }
}

