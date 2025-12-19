export class PlayerPhysicsAnimator {
    constructor(options = {}) {
        // WASM-first: Read physics from WASM, only do visual interpolation
        this.wasmModule = options.wasmModule || null;
        this.cached = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            skeleton: this.createNeutralSkeleton(),
            environmental: null,
            combat: null,
            trails: []
        }
        
        // Visual interpolation state
        this.targetSkeleton = this.createNeutralSkeleton();
        this.currentSkeleton = this.createNeutralSkeleton();
        this.interpolationSpeed = options.interpolationSpeed || 0.1;
    }

    update(deltaTime, context) {
        if (!this.wasmModule) {
            console.warn('PlayerPhysicsAnimator: No WASM module provided, using static skeleton');
            return this.cached;
        }

        // Read physics state from WASM
        const wasmPosition = {
            x: this.wasmModule.get_physics_player_x?.() ?? 0,
            y: this.wasmModule.get_physics_player_y?.() ?? 0
        };
        
        const wasmVelocity = {
            x: this.wasmModule.get_physics_player_vel_x?.() ?? 0,
            y: this.wasmModule.get_physics_player_vel_y?.() ?? 0
        };

        // Update target skeleton based on WASM physics
        this.updateSkeletonFromPhysics(wasmPosition, wasmVelocity, context);
        
        // Smooth visual interpolation
        this.interpolateSkeleton(deltaTime);
        
        this.cached.skeleton = this.currentSkeleton;
        this.cached.debug = {
            contacts: { left: false, right: false },
            targets: { left: wasmPosition, right: wasmPosition },
            groundY: 22
        };
        
        return this.cached;
    }

    updateSkeletonFromPhysics(position, velocity, context) {
        const speed = Math.hypot(velocity.x, velocity.y);
        const stride = Math.min(8, 2 + speed * 20);
        const phase = (context && typeof context.normalizedTime === 'number') ? context.normalizedTime : 0;

        // Update pelvis position based on WASM physics
        this.targetSkeleton.pelvis.x = position.x;
        this.targetSkeleton.pelvis.y = position.y;

        // Simple locomotion animation based on velocity
        const bob = 1.5 * Math.sin(phase * 6.28318 * 2) * Math.min(1, speed * 6);
        this.targetSkeleton.pelvis.y += bob;
        this.targetSkeleton.lowerSpine.y = -6 + bob * 0.6;
        this.targetSkeleton.chest.y = -12 + bob * 0.3;
        this.targetSkeleton.neck.y = -16 + bob * 0.15;

        // Foot targets based on movement
        const footTargets = this.computeFootTargets(stride, phase);
        this.targetSkeleton.leftLeg.foot.x = footTargets.left.x;
        this.targetSkeleton.leftLeg.foot.y = footTargets.left.y;
        this.targetSkeleton.rightLeg.foot.x = footTargets.right.x;
        this.targetSkeleton.rightLeg.foot.y = footTargets.right.y;

        // Arm counter-swing
        const armSwing = -0.6 * Math.sin((phase + 0.25) * 6.28318) * stride;
        this.targetSkeleton.leftArm.wrist.x = this.targetSkeleton.leftArm.elbow.x - 3 + armSwing;
        this.targetSkeleton.rightArm.wrist.x = this.targetSkeleton.rightArm.elbow.x + 3 - armSwing;
    }

    interpolateSkeleton(deltaTime) {
        const lerp = Math.min(1, this.interpolationSpeed * deltaTime * 60);
        
        // Interpolate all skeleton points
        this.interpolatePoint(this.currentSkeleton.pelvis, this.targetSkeleton.pelvis, lerp);
        this.interpolatePoint(this.currentSkeleton.lowerSpine, this.targetSkeleton.lowerSpine, lerp);
        this.interpolatePoint(this.currentSkeleton.chest, this.targetSkeleton.chest, lerp);
        this.interpolatePoint(this.currentSkeleton.neck, this.targetSkeleton.neck, lerp);
        this.interpolatePoint(this.currentSkeleton.head, this.targetSkeleton.head, lerp);
        
        // Interpolate limbs
        this.interpolateLimb(this.currentSkeleton.leftArm, this.targetSkeleton.leftArm, lerp);
        this.interpolateLimb(this.currentSkeleton.rightArm, this.targetSkeleton.rightArm, lerp);
        this.interpolateLimb(this.currentSkeleton.leftLeg, this.targetSkeleton.leftLeg, lerp);
        this.interpolateLimb(this.currentSkeleton.rightLeg, this.targetSkeleton.rightLeg, lerp);
    }

    interpolatePoint(current, target, lerp) {
        current.x += (target.x - current.x) * lerp;
        current.y += (target.y - current.y) * lerp;
    }

    interpolateLimb(current, target, lerp) {
        Object.keys(target).forEach(key => {
            if (target[key] && typeof target[key] === 'object' && typeof target[key].x !== 'undefined') {
                this.interpolatePoint(current[key], target[key], lerp);
            }
        });
    }

    computeFootTargets(stride, phase) {
        const ground = 22;
        const lift = 4;
        const swingL = Math.sin(phase * 6.28318);
        const swingR = Math.sin((phase + 0.5) * 6.28318);
        const leftSwinging = swingL > 0;
        const rightSwinging = swingR > 0;
        
        return {
            left: { 
                x: this.targetSkeleton.leftLeg.ankle.x + swingL * (stride * 0.4),
                y: ground - (leftSwinging ? lift : 0)
            },
            right: { 
                x: this.targetSkeleton.rightLeg.ankle.x + swingR * (stride * 0.4),
                y: ground - (rightSwinging ? lift : 0)
            }
        };
    }

    createNeutralSkeleton() {
        return {
            root: { x: 0, y: 0 },
            pelvis: { x: 0, y: 0 },
            lowerSpine: { x: 0, y: -6 },
            chest: { x: 0, y: -12 },
            neck: { x: 0, y: -16 },
            torso: { x: 0, y: -6 },
            head: { x: 0, y: -20 },
            clavicleL: { x: -6, y: -12 },
            clavicleR: { x: 6, y: -12 },
            leftArm: {
                shoulder: { x: -7, y: -13 },
                elbow: { x: -11, y: -5 },
                wrist: { x: -13, y: 0 },
                hand: { x: -14, y: 1 }
            },
            rightArm: {
                shoulder: { x: 7, y: -13 },
                elbow: { x: 11, y: -5 },
                wrist: { x: 13, y: 0 },
                hand: { x: 14, y: 1 }
            },
            leftLeg: {
                hip: { x: -4, y: 2 },
                knee: { x: -5, y: 10 },
                ankle: { x: -6, y: 18 },
                foot: { x: -6, y: 20 },
                toe: { x: -6, y: 22 }
            },
            rightLeg: {
                hip: { x: 4, y: 2 },
                knee: { x: 5, y: 10 },
                ankle: { x: 6, y: 18 },
                foot: { x: 6, y: 20 },
                toe: { x: 6, y: 22 }
            }
        };
    }
}



