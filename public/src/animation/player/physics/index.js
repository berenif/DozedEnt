const SKELETON_JOINT_COUNT = 26
const JOINT_INDEX = Object.freeze({
    head: 0,
    neck: 1,
    chest: 2,
    midSpine: 3,
    lowerSpine: 4,
    pelvis: 5,
    shoulderL: 6,
    shoulderR: 7,
    elbowL: 8,
    elbowR: 9,
    wristL: 10,
    wristR: 11,
    handL: 12,
    handR: 13,
    hipL: 14,
    hipR: 15,
    kneeL: 16,
    kneeR: 17,
    ankleL: 18,
    ankleR: 19,
    heelL: 20,
    heelR: 21,
    footL: 22,
    footR: 23,
    toeL: 24,
    toeR: 25
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function clonePoint(point = { x: 0, y: 0 }) {
    return { x: point.x, y: point.y }
}

function cloneLimb(limb = {}) {
    const clone = {}
    for (const [key, value] of Object.entries(limb)) {
        clone[key] = clonePoint(value)
    }
    return clone
}

function cloneSkeleton(source) {
    if (!source) {
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
            leftArm: {},
            rightArm: {},
            leftLeg: {},
            rightLeg: {}
        }
    }
    return {
        root: clonePoint(source.root),
        pelvis: clonePoint(source.pelvis),
        lowerSpine: clonePoint(source.lowerSpine),
        chest: clonePoint(source.chest),
        neck: clonePoint(source.neck),
        torso: clonePoint(source.torso),
        head: clonePoint(source.head),
        clavicleL: clonePoint(source.clavicleL),
        clavicleR: clonePoint(source.clavicleR),
        leftArm: cloneLimb(source.leftArm),
        rightArm: cloneLimb(source.rightArm),
        leftLeg: cloneLimb(source.leftLeg),
        rightLeg: cloneLimb(source.rightLeg)
    }
}

export class PlayerPhysicsAnimator {
    constructor(options = {}) {
        // WASM-first: Read physics from WASM, only do visual interpolation
        this.wasmModule = options.wasmModule || null
        this.referenceSkeleton = this.createNeutralSkeleton()
        this.referenceMetrics = this._computeReferenceMetrics(this.referenceSkeleton)
        this.cached = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            skeleton: cloneSkeleton(this.referenceSkeleton),
            environmental: null,
            combat: null,
            trails: []
        }
        
        // Visual interpolation state
        this.targetSkeleton = cloneSkeleton(this.referenceSkeleton)
        this.currentSkeleton = cloneSkeleton(this.referenceSkeleton)
        this.interpolationSpeed = options.interpolationSpeed || 0.1
        this._hasWasmSkeleton = this._detectWasmSkeleton()
    }

    update(deltaTime, context) {
        if (!this.wasmModule) {
            console.warn('PlayerPhysicsAnimator: No WASM module provided, using static skeleton')
            return this.cached
        }

        // Read physics state from WASM
        const wasmPosition = {
            x: this.wasmModule.get_physics_player_x?.() ?? 0,
            y: this.wasmModule.get_physics_player_y?.() ?? 0
        }
        
        const wasmVelocity = {
            x: this.wasmModule.get_physics_player_vel_x?.() ?? 0,
            y: this.wasmModule.get_physics_player_vel_y?.() ?? 0
        }

        // Update target skeleton based on WASM physics
        this.updateSkeletonFromPhysics(wasmPosition, wasmVelocity, context)
        
        // Smooth visual interpolation
        this.interpolateSkeleton(deltaTime)
        
        this.cached.skeleton = this.currentSkeleton
        this.cached.debug = {
            ...this.cached.debug,
            contacts: this.cached.debug?.contacts || { left: false, right: false },
            targets: { left: wasmPosition, right: wasmPosition },
            groundY: this.cached.debug?.groundY ?? 22
        }
        
        return this.cached
    }

    updateSkeletonFromPhysics(position, velocity, context) {
        if (this._tryAdoptWasmSkeleton()) {
            return
        }
        this._updateFallbackSkeleton(position, velocity, context)
    }

    interpolateSkeleton(deltaTime) {
        const lerp = Math.min(1, this.interpolationSpeed * deltaTime * 60)
        
        // Interpolate all skeleton points
        this.interpolatePoint(this.currentSkeleton.pelvis, this.targetSkeleton.pelvis, lerp)
        this.interpolatePoint(this.currentSkeleton.lowerSpine, this.targetSkeleton.lowerSpine, lerp)
        this.interpolatePoint(this.currentSkeleton.chest, this.targetSkeleton.chest, lerp)
        this.interpolatePoint(this.currentSkeleton.neck, this.targetSkeleton.neck, lerp)
        this.interpolatePoint(this.currentSkeleton.head, this.targetSkeleton.head, lerp)
        
        // Interpolate limbs
        this.interpolateLimb(this.currentSkeleton.leftArm, this.targetSkeleton.leftArm, lerp)
        this.interpolateLimb(this.currentSkeleton.rightArm, this.targetSkeleton.rightArm, lerp)
        this.interpolateLimb(this.currentSkeleton.leftLeg, this.targetSkeleton.leftLeg, lerp)
        this.interpolateLimb(this.currentSkeleton.rightLeg, this.targetSkeleton.rightLeg, lerp)
    }

    interpolatePoint(current, target, lerp) {
        current.x += (target.x - current.x) * lerp
        current.y += (target.y - current.y) * lerp
    }

    interpolateLimb(current, target, lerp) {
        Object.keys(target).forEach(key => {
            if (target[key] && typeof target[key] === 'object' && target[key].x !== undefined) {
                if (!current[key]) {
                    current[key] = { x: target[key].x, y: target[key].y }
                }
                this.interpolatePoint(current[key], target[key], lerp)
            }
        })
    }

    computeFootTargets(stride, phase) {
        const ground = 22
        const lift = 4
        const swingL = Math.sin(phase * 6.28318)
        const swingR = Math.sin((phase + 0.5) * 6.28318)
        const leftSwinging = swingL > 0
        const rightSwinging = swingR > 0
        
        return {
            left: { 
                x: this.targetSkeleton.leftLeg.ankle.x + swingL * (stride * 0.4),
                y: ground - (leftSwinging ? lift : 0)
            },
            right: { 
                x: this.targetSkeleton.rightLeg.ankle.x + swingR * (stride * 0.4),
                y: ground - (rightSwinging ? lift : 0)
            }
        }
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

    _detectWasmSkeleton() {
        if (!this.wasmModule) {
            return false
        }
        return typeof this.wasmModule.get_skeleton_joint_count === 'function' &&
            typeof this.wasmModule.get_skeleton_joint_x === 'function' &&
            typeof this.wasmModule.get_skeleton_joint_y === 'function'
    }

    _safeNumber(value, fallback = 0) {
        const v = Number(value)
        return Number.isFinite(v) ? v : fallback
    }

    _computeReferenceMetrics(skeleton) {
        const shoulderSpan = (skeleton?.rightArm?.shoulder?.x ?? 7) - (skeleton?.leftArm?.shoulder?.x ?? -7)
        const headOffset = (skeleton?.head?.y ?? -20) - (skeleton?.pelvis?.y ?? 0)
        return {
            shoulderSpan: shoulderSpan === 0 ? 14 : shoulderSpan,
            headOffset: headOffset === 0 ? -20 : headOffset
        }
    }

    _computeScale(reference, sample) {
        const ref = this._safeNumber(reference, 1)
        const sam = this._safeNumber(sample, 0)
        if (Math.abs(sam) < 1e-4) {
            return 1
        }
        const ratio = ref / sam
        if (!Number.isFinite(ratio)) {
            return 1
        }
        return clamp(ratio, 0.5, 40)
    }

    _readWasmSkeletonJoints() {
        const count = this._safeNumber(this.wasmModule?.get_skeleton_joint_count?.(), 0)
        if (count < SKELETON_JOINT_COUNT) {
            return null
        }
        const joints = new Array(SKELETON_JOINT_COUNT)
        for (let i = 0; i < SKELETON_JOINT_COUNT; i++) {
            const x = this._safeNumber(this.wasmModule.get_skeleton_joint_x?.(i), null)
            const y = this._safeNumber(this.wasmModule.get_skeleton_joint_y?.(i), null)
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                return null
            }
            joints[i] = { x, y }
        }
        return joints
    }

    _composeSkeletonFromJoints(joints) {
        const pelvis = joints[JOINT_INDEX.pelvis]
        const shoulderSpan = joints[JOINT_INDEX.shoulderR].x - joints[JOINT_INDEX.shoulderL].x
        const headOffset = joints[JOINT_INDEX.head].y - pelvis.y
        const scaleX = this._computeScale(this.referenceMetrics.shoulderSpan, shoulderSpan)
        const scaleY = this._computeScale(this.referenceMetrics.headOffset, headOffset)
        const relative = (joint) => ({
            x: (joint.x - pelvis.x) * scaleX,
            y: (joint.y - pelvis.y) * scaleY
        })
        return {
            root: { x: 0, y: 0 },
            pelvis: { x: 0, y: 0 },
            lowerSpine: relative(joints[JOINT_INDEX.lowerSpine]),
            chest: relative(joints[JOINT_INDEX.chest]),
            neck: relative(joints[JOINT_INDEX.neck]),
            torso: relative(joints[JOINT_INDEX.midSpine]),
            head: relative(joints[JOINT_INDEX.head]),
            clavicleL: relative(joints[JOINT_INDEX.shoulderL]),
            clavicleR: relative(joints[JOINT_INDEX.shoulderR]),
            leftArm: {
                shoulder: relative(joints[JOINT_INDEX.shoulderL]),
                elbow: relative(joints[JOINT_INDEX.elbowL]),
                wrist: relative(joints[JOINT_INDEX.wristL]),
                hand: relative(joints[JOINT_INDEX.handL])
            },
            rightArm: {
                shoulder: relative(joints[JOINT_INDEX.shoulderR]),
                elbow: relative(joints[JOINT_INDEX.elbowR]),
                wrist: relative(joints[JOINT_INDEX.wristR]),
                hand: relative(joints[JOINT_INDEX.handR])
            },
            leftLeg: {
                hip: relative(joints[JOINT_INDEX.hipL]),
                knee: relative(joints[JOINT_INDEX.kneeL]),
                ankle: relative(joints[JOINT_INDEX.ankleL]),
                foot: relative(joints[JOINT_INDEX.footL]),
                toe: relative(joints[JOINT_INDEX.toeL])
            },
            rightLeg: {
                hip: relative(joints[JOINT_INDEX.hipR]),
                knee: relative(joints[JOINT_INDEX.kneeR]),
                ankle: relative(joints[JOINT_INDEX.ankleR]),
                foot: relative(joints[JOINT_INDEX.footR]),
                toe: relative(joints[JOINT_INDEX.toeR])
            }
        }
    }

    _estimateGroundHeight(skeleton) {
        const left = skeleton?.leftLeg?.foot?.y ?? 22
        const right = skeleton?.rightLeg?.foot?.y ?? 22
        return (left + right) * 0.5
    }

    _tryAdoptWasmSkeleton() {
        if (!this.wasmModule) {
            return false
        }
        if (!this._hasWasmSkeleton) {
            this._hasWasmSkeleton = this._detectWasmSkeleton()
            if (!this._hasWasmSkeleton) {
                return false
            }
        }
        const joints = this._readWasmSkeletonJoints()
        if (!joints) {
            return false
        }
        this.targetSkeleton = this._composeSkeletonFromJoints(joints)
        this.cached.debug = {
            ...this.cached.debug,
            contacts: {
                left: !!this.wasmModule.get_left_foot_grounded?.(),
                right: !!this.wasmModule.get_right_foot_grounded?.()
            },
            balanceQuality: this._safeNumber(this.wasmModule.get_balance_quality?.(), 1),
            groundY: this._estimateGroundHeight(this.targetSkeleton)
        }
        return true
    }

    _updateFallbackSkeleton(position, velocity, context) {
        const speed = Math.hypot(velocity.x, velocity.y)
        const stride = Math.min(8, 2 + speed * 20)
        const phase = (context && typeof context.normalizedTime === 'number') ? context.normalizedTime : 0
        this.targetSkeleton.pelvis.x = position.x
        this.targetSkeleton.pelvis.y = position.y
        const bob = 1.5 * Math.sin(phase * 6.28318 * 2) * Math.min(1, speed * 6)
        this.targetSkeleton.pelvis.y += bob
        this.targetSkeleton.lowerSpine.y = -6 + bob * 0.6
        this.targetSkeleton.chest.y = -12 + bob * 0.3
        this.targetSkeleton.neck.y = -16 + bob * 0.15
        const footTargets = this.computeFootTargets(stride, phase)
        this.targetSkeleton.leftLeg.foot.x = footTargets.left.x
        this.targetSkeleton.leftLeg.foot.y = footTargets.left.y
        this.targetSkeleton.rightLeg.foot.x = footTargets.right.x
        this.targetSkeleton.rightLeg.foot.y = footTargets.right.y
        const armSwing = -0.6 * Math.sin((phase + 0.25) * 6.28318) * stride
        this.targetSkeleton.leftArm.wrist.x = this.targetSkeleton.leftArm.elbow.x - 3 + armSwing
        this.targetSkeleton.rightArm.wrist.x = this.targetSkeleton.rightArm.elbow.x + 3 - armSwing
        this.cached.debug = {
            ...this.cached.debug,
            contacts: this.cached.debug?.contacts || { left: false, right: false },
            groundY: this.cached.debug?.groundY ?? 22,
            balanceQuality: this.cached.debug?.balanceQuality ?? 1
        }
    }
}



