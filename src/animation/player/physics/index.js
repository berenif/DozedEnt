export class PlayerPhysicsAnimator {
    constructor(options = {}) {
        // Tuned for 60 FPS: default to 1/60 with 2 substeps (equivalent to 1/120 effective step)
        const desiredFixedDt = typeof options.fixedDt === 'number' ? options.fixedDt : 1 / 60
        const desiredSubsteps = Number.isFinite(options.substeps) ? options.substeps : 2
        this.fixedDt = Math.max(1 / 240, Math.min(desiredFixedDt, 1 / 30))
        this.substeps = Math.max(1, Math.min(desiredSubsteps, 8))
        this.accumulator = 0
        this.solver = new MinimalPhysicsSolver(options)
        this.cached = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            skeleton: this.solver.getSkeleton(),
            environmental: null,
            combat: null,
            trails: []
        }
    }

    update(deltaTime, context) {
        const dt = Math.max(0, Math.min(deltaTime || 0, 0.05))
        this.accumulator += dt
        const step = this.fixedDt / this.substeps
        while (this.accumulator >= this.fixedDt) {
            for (let i = 0; i < this.substeps; i++) {
                this.solver.step(step, context)
            }
            this.accumulator -= this.fixedDt
        }
        this.cached.skeleton = this.solver.getSkeleton()
        // Expose debug info for overlays (non-breaking: additional field only)
        this.cached.debug = this.solver.getDebugInfo()
        return this.cached
    }
}

class MinimalPhysicsSolver {
    constructor(options = {}) {
        const base = createNeutralSkeleton()
        this.state = {
            skeleton: base,
            // Simple velocities per joint for future use
            v: Object.create(null)
        }
        this.gravity = typeof options.gravity === 'number' ? options.gravity : 0
        this.damping = typeof options.damping === 'number' ? options.damping : 0.98
        this.params = {
            // Tuned defaults for 60 FPS stability/responsiveness
            kp: typeof options.kp === 'number' ? options.kp : 22,
            kd: typeof options.kd === 'number' ? options.kd : 3,
            groundY: 22,
            footLift: 4
        }
        this._debug = {
            contacts: { left: false, right: false },
            targets: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
            groundY: this.params.groundY
        }
    }

    getSkeleton() {
        return this.state.skeleton
    }

    step(dt, context) {
        const s = this.state.skeleton
        const vel = context && context.velocity ? context.velocity : { x: 0, y: 0 }
        const speed = Math.hypot(vel.x, vel.y)
        const stride = Math.min(8, 2 + speed * 20)
        const phase = (context && typeof context.normalizedTime === 'number') ? context.normalizedTime : 0

        // Target foot trajectories (xz → screen x, y)
        const footTargets = this.computeFootTargets(s, stride, phase)
        this._debug.targets = footTargets

        // PD settle feet to targets with simple damping
        this.pd2D(s.leftLeg.foot, this.key('ll.foot'), footTargets.left, dt)
        this.pd2D(s.rightLeg.foot, this.key('rl.foot'), footTargets.right, dt)

        // Enforce ground contact and toe follow
        const leftContact = this.applyGroundContact(s.leftLeg)
        const rightContact = this.applyGroundContact(s.rightLeg)
        this._debug.contacts.left = !!leftContact
        this._debug.contacts.right = !!rightContact

        // Knees/ankles follow simple chain from hip → knee → ankle with offsets
        this.solveLegChain(s.leftLeg, -1)
        this.solveLegChain(s.rightLeg, 1)

        // Simple pelvis bobbing and spine alignment
        const bob = 1.5 * Math.sin(phase * 6.28318 * 2) * Math.min(1, speed * 6)
        s.pelvis.y = 0 + bob
        s.lowerSpine.y = -6 + bob * 0.6
        s.chest.y = -12 + bob * 0.3
        s.neck.y = -16 + bob * 0.15

        // Arm counter-swing
        const armSwing = -0.6 * Math.sin((phase + 0.25) * 6.28318) * stride
        s.leftArm.elbow.x = s.leftArm.shoulder.x - 6
        s.leftArm.elbow.y = s.leftArm.shoulder.y + 8
        s.leftArm.wrist.x = s.leftArm.elbow.x - 3 + armSwing
        s.leftArm.wrist.y = s.leftArm.elbow.y + 6
        s.leftArm.hand.x = s.leftArm.wrist.x + 1
        s.leftArm.hand.y = s.leftArm.wrist.y + 1

        s.rightArm.elbow.x = s.rightArm.shoulder.x + 6
        s.rightArm.elbow.y = s.rightArm.shoulder.y + 8
        s.rightArm.wrist.x = s.rightArm.elbow.x + 3 - armSwing
        s.rightArm.wrist.y = s.rightArm.elbow.y + 6
        s.rightArm.hand.x = s.rightArm.wrist.x + 1
        s.rightArm.hand.y = s.rightArm.wrist.y + 1
    }

    key(name) {
        if (!this.state.v[name]) {this.state.v[name] = { x: 0, y: 0 }}
        return name
    }

    pd2D(point, key, target, dt) {
        const v = this.state.v[key]
        const kp = this.params.kp
        const kd = this.params.kd
        const ax = kp * (target.x - point.x) - kd * v.x
        const ay = kp * (target.y - point.y) - kd * v.y
        v.x = (v.x + ax * dt) * this.damping
        v.y = (v.y + ay * dt) * this.damping
        point.x += v.x * dt
        point.y += v.y * dt
    }

    computeFootTargets(s, stride, phase) {
        const ground = this.params.groundY
        const lift = this.params.footLift
        // Oscillate foot X, lift during swing
        const swingL = Math.sin(phase * 6.28318)
        const swingR = Math.sin((phase + 0.5) * 6.28318)
        const leftSwinging = swingL > 0
        const rightSwinging = swingR > 0
        const leftX = s.leftLeg.ankle.x + swingL * (stride * 0.4)
        const rightX = s.rightLeg.ankle.x + swingR * (stride * 0.4)
        return {
            left: { x: leftX, y: ground - (leftSwinging ? lift : 0) },
            right: { x: rightX, y: ground - (rightSwinging ? lift : 0) }
        }
    }

    applyGroundContact(leg) {
        const g = this.params.groundY
        let contact = false
        if (leg.foot.y > g) { leg.foot.y = g; contact = true }
        if (leg.toe.y > g) { leg.toe.y = g }
        leg.toe.x = leg.foot.x + 3
        leg.toe.y = Math.min(g, leg.foot.y + 2)
        return contact || Math.abs(leg.foot.y - g) < 1e-3
    }

    solveLegChain(leg, side) {
        // Place knee/ankle between hip and foot with gentle bend
        const hip = leg.hip
        const foot = leg.foot
        const midX = (hip.x + foot.x) * 0.5 + 2 * side
        const midY = (hip.y + foot.y) * 0.5 - 2
        leg.knee.x = midX
        leg.knee.y = midY
        leg.ankle.x = (midX + foot.x) * 0.5
        leg.ankle.y = (midY + foot.y) * 0.5 + 2
    }

    getDebugInfo() {
        return this._debug
    }
}

function createNeutralSkeleton() {
    // Coordinates in renderer-local space (top-down), roughly centered
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
    }
}


