// Realistic Wolf Physics System
// Implements biomechanically accurate physics simulation for wolves
// Integrates with WASM animation data and enhanced procedural system

import { WolfAnatomy } from './wolf-procedural.js'

// Physical constants based on real wolf biomechanics
export const WolfPhysicsConstants = Object.freeze({
    // Mass and inertia (kg, kg⋅m²)
    averageMass: 50,           // Adult wolf mass
    bodyInertia: 2.5,          // Rotational inertia around center of mass
    
    // Spring constants for joints (N/m)
    spineStiffness: 8000,      // Spine vertebral stiffness
    neckStiffness: 6000,       // Neck joint stiffness
    legStiffness: 12000,       // Leg joint stiffness
    pawStiffness: 15000,       // Paw contact stiffness
    
    // Damping coefficients (N⋅s/m)
    spineDamping: 200,         // Spine damping
    neckDamping: 150,          // Neck damping
    legDamping: 300,           // Leg damping
    pawDamping: 400,           // Paw contact damping
    
    // Friction coefficients
    pawFriction: 0.8,          // Paw-ground friction
    bodyDrag: 0.02,            // Air resistance coefficient
    
    // Force limits (N)
    maxMuscleForce: 1500,      // Maximum muscle force per leg
    maxSpineForce: 800,        // Maximum spine muscle force
    maxNeckForce: 400,         // Maximum neck muscle force
    
    // Anatomical constraints
    maxSpineBend: 0.5,         // Maximum spine curvature (rad/m)
    maxNeckPitch: 1.2,         // Maximum neck pitch (rad)
    maxNeckYaw: 1.0,           // Maximum neck yaw (rad)
    maxLegExtension: 0.9,      // Maximum leg extension ratio
    maxLegFlexion: 0.3,        // Maximum leg flexion ratio
    
    // Ground interaction
    groundStiffness: 50000,    // Ground contact stiffness
    groundDamping: 1000,       // Ground contact damping
    sinkDepth: 0.02            // Maximum paw sink depth
})

// Wolf physics body representation
export class WolfPhysicsBody {
    constructor(mass = WolfPhysicsConstants.averageMass) {
        this.mass = mass
        this.inertia = WolfPhysicsConstants.bodyInertia * (mass / WolfPhysicsConstants.averageMass)
        
        // Body segments (simplified multi-body system)
        this.segments = {
            head: this.createSegment(mass * 0.08, 0.15), // 8% of body mass
            neck: this.createSegment(mass * 0.05, 0.12), // 5% of body mass
            torso: this.createSegment(mass * 0.45, 0.6), // 45% of body mass
            pelvis: this.createSegment(mass * 0.15, 0.25), // 15% of body mass
            legs: [
                this.createSegment(mass * 0.067, 0.3), // Front left leg
                this.createSegment(mass * 0.067, 0.3), // Front right leg
                this.createSegment(mass * 0.083, 0.35), // Hind left leg
                this.createSegment(mass * 0.083, 0.35)  // Hind right leg
            ]
        }
        
        // Joint constraints
        this.joints = {
            neckToHead: this.createJoint('revolute', 2),
            torsoToNeck: this.createJoint('universal', 3),
            pelvisToTorso: this.createJoint('universal', 3),
            legs: [
                this.createJoint('universal', 3), // Front left hip/shoulder
                this.createJoint('universal', 3), // Front right hip/shoulder
                this.createJoint('universal', 3), // Hind left hip
                this.createJoint('universal', 3)  // Hind right hip
            ]
        }
        
        // Contact points (paws)
        this.contacts = [
            this.createContact(), // Front left paw
            this.createContact(), // Front right paw
            this.createContact(), // Hind left paw
            this.createContact()  // Hind right paw
        ]
        
        // Muscle system
        this.muscles = {
            spine: this.createMuscleGroup(8, WolfPhysicsConstants.maxSpineForce),
            neck: this.createMuscleGroup(4, WolfPhysicsConstants.maxNeckForce),
            legs: [
                this.createMuscleGroup(6, WolfPhysicsConstants.maxMuscleForce), // Front left
                this.createMuscleGroup(6, WolfPhysicsConstants.maxMuscleForce), // Front right
                this.createMuscleGroup(8, WolfPhysicsConstants.maxMuscleForce), // Hind left
                this.createMuscleGroup(8, WolfPhysicsConstants.maxMuscleForce)  // Hind right
            ]
        }
        
        // Physics state
        this.state = {
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0 }, // Euler angles
            angularVelocity: { x: 0, y: 0, z: 0 },
            centerOfMass: { x: 0, y: 0, z: 0 },
            momentum: { x: 0, y: 0, z: 0 },
            angularMomentum: { x: 0, y: 0, z: 0 }
        }
        
        // Ground contact state
        this.groundContact = {
            isGrounded: false,
            contactPoints: [false, false, false, false], // Per paw
            contactForces: [
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 }
            ],
            groundNormal: { x: 0, y: 1, z: 0 },
            surfaceMaterial: 'grass'
        }
    }
    
    // Create a body segment
    createSegment(mass, length) {
        return {
            mass,
            length,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
            forces: { x: 0, y: 0, z: 0 },
            torques: { x: 0, y: 0, z: 0 }
        }
    }
    
    // Create a joint constraint
    createJoint(type, dof) {
        return {
            type, // 'revolute', 'universal', 'spherical'
            degreesOfFreedom: dof,
            stiffness: WolfPhysicsConstants.spineStiffness,
            damping: WolfPhysicsConstants.spineDamping,
            limits: {
                min: [-Math.PI, -Math.PI, -Math.PI],
                max: [Math.PI, Math.PI, Math.PI]
            },
            currentAngles: [0, 0, 0],
            targetAngles: [0, 0, 0],
            forces: [0, 0, 0]
        }
    }
    
    // Create a ground contact point
    createContact() {
        return {
            position: { x: 0, y: 0, z: 0 },
            normal: { x: 0, y: 1, z: 0 },
            penetration: 0,
            isActive: false,
            force: { x: 0, y: 0, z: 0 },
            friction: WolfPhysicsConstants.pawFriction,
            restitution: 0.1
        }
    }
    
    // Create a muscle group
    createMuscleGroup(muscleCount, maxForce) {
        return {
            muscles: Array(muscleCount).fill().map(() => ({
                activation: 0,      // 0-1 activation level
                force: 0,          // Current force output
                maxForce: maxForce / muscleCount,
                fatigue: 0,        // 0-1 fatigue level
                length: 1,         // Normalized muscle length
                velocity: 0        // Contraction velocity
            })),
            totalForce: 0,
            averageActivation: 0
        }
    }
}

// Main physics simulation class
export class RealisticWolfPhysics {
    constructor() {
        this.wolves = new Map() // Map of wolf ID to physics body
        this.gravity = { x: 0, y: -9.81, z: 0 }
        this.timeStep = 1/60 // Fixed timestep for stability
        this.accumulator = 0
        
        // Solver parameters
        this.solverIterations = 8
        this.constraintTolerance = 0.001
        
        // Performance tracking
        this.performanceMetrics = {
            updateTime: 0,
            constraintIterations: 0,
            activeContacts: 0
        }
    }
    
    // Add a wolf to the physics simulation
    addWolf(wolfId, mass = WolfPhysicsConstants.averageMass) {
        const body = new WolfPhysicsBody(mass)
        this.wolves.set(wolfId, body)
        return body
    }
    
    // Remove a wolf from simulation
    removeWolf(wolfId) {
        this.wolves.delete(wolfId)
    }
    
    // Main physics update
    update(deltaTime, wasmModule) {
        const startTime = performance.now()
        
        this.accumulator += deltaTime
        
        // Fixed timestep integration for stability
        while (this.accumulator >= this.timeStep) {
            this.stepPhysics(this.timeStep, wasmModule)
            this.accumulator -= this.timeStep
        }
        
        // Interpolate for smooth rendering
        const alpha = this.accumulator / this.timeStep
        this.interpolateStates(alpha)
        
        this.performanceMetrics.updateTime = performance.now() - startTime
    }
    
    // Single physics step
    stepPhysics(dt, wasmModule) {
        // Update each wolf
        for (let [wolfId, body] of this.wolves) {
            this.updateWolfPhysics(wolfId, body, dt, wasmModule)
        }
        
        // Resolve constraints
        this.solveConstraints(dt)
        
        // Update WASM animation data
        this.updateWASMAnimationData(wasmModule)
    }
    
    // Update individual wolf physics
    updateWolfPhysics(wolfId, body, dt, wasmModule) {
        // Get target animation state from WASM or enhanced procedural system
        const animTarget = this.getAnimationTarget(wolfId, wasmModule)
        
        // Apply muscle forces to achieve target pose
        this.applyMuscleForces(body, animTarget, dt)
        
        // Apply external forces (gravity, drag, etc.)
        this.applyExternalForces(body, dt)
        
        // Update ground contacts
        this.updateGroundContacts(body)
        
        // Apply contact forces
        this.applyContactForces(body, dt)
        
        // Integrate motion
        this.integrateMotion(body, dt)
        
        // Update derived properties
        this.updateDerivedProperties(body)
    }
    
    // Get animation target from procedural system
    getAnimationTarget(wolfId, wasmModule) {
        const target = {
            spine: { bend: 0, twist: 0 },
            neck: { pitch: 0, yaw: 0 },
            head: { pitch: 0, yaw: 0 },
            legs: [
                { hip: 0, knee: 0, ankle: 0, target: { x: 0, y: 0, z: 0 } },
                { hip: 0, knee: 0, ankle: 0, target: { x: 0, y: 0, z: 0 } },
                { hip: 0, knee: 0, ankle: 0, target: { x: 0, y: 0, z: 0 } },
                { hip: 0, knee: 0, ankle: 0, target: { x: 0, y: 0, z: 0 } }
            ]
        }
        
        // Get data from WASM if available
        if (wasmModule && typeof wasmModule.get_wolf_anim_active === 'function') {
            const wolfIndex = parseInt(wolfId)
            if (wasmModule.get_wolf_anim_active(wolfIndex)) {
                // Get spine bend
                target.spine.bend = wasmModule.get_wolf_anim_spine_bend(wolfIndex)
                
                // Get head orientation
                target.head.pitch = wasmModule.get_wolf_anim_head_pitch(wolfIndex)
                target.head.yaw = wasmModule.get_wolf_anim_head_yaw(wolfIndex)
                
                // Get leg positions
                for (let i = 0; i < 4; i++) {
                    target.legs[i].target.x = wasmModule.get_wolf_anim_leg_x(wolfIndex, i)
                    target.legs[i].target.y = wasmModule.get_wolf_anim_leg_y(wolfIndex, i)
                }
            }
        }
        
        return target
    }
    
    // Apply muscle forces to achieve target pose
    applyMuscleForces(body, target, dt) {
        // Spine muscles
        this.applySpineMuscleForces(body, target.spine, dt)
        
        // Neck muscles
        this.applyNeckMuscleForces(body, target.neck, target.head, dt)
        
        // Leg muscles (IK to target positions)
        for (let i = 0; i < 4; i++) {
            this.applyLegMuscleForces(body, i, target.legs[i], dt)
        }
    }
    
    // Apply spine muscle forces
    applySpineMuscleForces(body, spineTarget, dt) {
        const spineJoint = body.joints.pelvisToTorso
        const targetBend = Math.max(-WolfPhysicsConstants.maxSpineBend, 
                                   Math.min(WolfPhysicsConstants.maxSpineBend, spineTarget.bend))
        
        // PD controller for spine position
        const kp = WolfPhysicsConstants.spineStiffness
        const kd = WolfPhysicsConstants.spineDamping
        
        const error = targetBend - spineJoint.currentAngles[0]
        const errorRate = -spineJoint.forces[0] / kd // Approximate derivative
        
        const force = kp * error + kd * errorRate
        const clampedForce = Math.max(-WolfPhysicsConstants.maxSpineForce,
                                     Math.min(WolfPhysicsConstants.maxSpineForce, force))
        
        spineJoint.forces[0] = clampedForce
        
        // Update muscle activation
        const muscleGroup = body.muscles.spine
        muscleGroup.averageActivation = Math.abs(clampedForce) / WolfPhysicsConstants.maxSpineForce
    }
    
    // Apply neck muscle forces
    applyNeckMuscleForces(body, neckTarget, headTarget, dt) {
        const neckJoint = body.joints.torsoToNeck
        const headJoint = body.joints.neckToHead
        
        // Neck pitch and yaw
        const targetNeckPitch = Math.max(-WolfPhysicsConstants.maxNeckPitch,
                                        Math.min(WolfPhysicsConstants.maxNeckPitch, neckTarget.pitch))
        const targetNeckYaw = Math.max(-WolfPhysicsConstants.maxNeckYaw,
                                      Math.min(WolfPhysicsConstants.maxNeckYaw, neckTarget.yaw))
        
        // Head pitch and yaw (relative to neck)
        const targetHeadPitch = Math.max(-WolfPhysicsConstants.maxNeckPitch * 0.5,
                                        Math.min(WolfPhysicsConstants.maxNeckPitch * 0.5, headTarget.pitch))
        const targetHeadYaw = Math.max(-WolfPhysicsConstants.maxNeckYaw * 0.5,
                                      Math.min(WolfPhysicsConstants.maxNeckYaw * 0.5, headTarget.yaw))
        
        // Apply PD control
        const kp = WolfPhysicsConstants.neckStiffness
        const kd = WolfPhysicsConstants.neckDamping
        
        // Neck forces
        const neckPitchError = targetNeckPitch - neckJoint.currentAngles[0]
        const neckYawError = targetNeckYaw - neckJoint.currentAngles[1]
        
        neckJoint.forces[0] = Math.max(-WolfPhysicsConstants.maxNeckForce,
                                      Math.min(WolfPhysicsConstants.maxNeckForce,
                                              kp * neckPitchError + kd * (-neckJoint.forces[0] / kd)))
        neckJoint.forces[1] = Math.max(-WolfPhysicsConstants.maxNeckForce,
                                      Math.min(WolfPhysicsConstants.maxNeckForce,
                                              kp * neckYawError + kd * (-neckJoint.forces[1] / kd)))
        
        // Head forces
        const headPitchError = targetHeadPitch - headJoint.currentAngles[0]
        const headYawError = targetHeadYaw - headJoint.currentAngles[1]
        
        headJoint.forces[0] = Math.max(-WolfPhysicsConstants.maxNeckForce * 0.5,
                                      Math.min(WolfPhysicsConstants.maxNeckForce * 0.5,
                                              kp * 0.5 * headPitchError))
        headJoint.forces[1] = Math.max(-WolfPhysicsConstants.maxNeckForce * 0.5,
                                      Math.min(WolfPhysicsConstants.maxNeckForce * 0.5,
                                              kp * 0.5 * headYawError))
        
        // Update muscle activation
        const muscleGroup = body.muscles.neck
        const totalForce = Math.sqrt(neckJoint.forces[0]**2 + neckJoint.forces[1]**2 +
                                   headJoint.forces[0]**2 + headJoint.forces[1]**2)
        muscleGroup.averageActivation = totalForce / WolfPhysicsConstants.maxNeckForce
    }
    
    // Apply leg muscle forces with IK
    applyLegMuscleForces(body, legIndex, legTarget, dt) {
        const legJoint = body.joints.legs[legIndex]
        const legSegment = body.segments.legs[legIndex]
        
        // Simple 2-DOF IK for leg (hip and knee)
        const targetPos = legTarget.target
        const legLength = WolfAnatomy.legLength
        const upperLegLength = legLength * 0.6
        const lowerLegLength = legLength * 0.4
        
        // Calculate joint angles for IK
        const distance = Math.sqrt(targetPos.x**2 + targetPos.y**2)
        const maxReach = upperLegLength + lowerLegLength
        const minReach = Math.abs(upperLegLength - lowerLegLength)
        
        let hipAngle = 0
        let kneeAngle = 0
        
        if (distance > maxReach) {
            // Target too far, extend fully
            hipAngle = Math.atan2(targetPos.y, targetPos.x)
            kneeAngle = 0
        } else if (distance < minReach) {
            // Target too close, flex fully
            hipAngle = Math.atan2(targetPos.y, targetPos.x)
            kneeAngle = Math.PI
        } else {
            // Normal IK solution
            const cosKnee = (upperLegLength**2 + lowerLegLength**2 - distance**2) / 
                           (2 * upperLegLength * lowerLegLength)
            kneeAngle = Math.acos(Math.max(-1, Math.min(1, cosKnee)))
            
            const alpha = Math.atan2(targetPos.y, targetPos.x)
            const beta = Math.atan2(lowerLegLength * Math.sin(kneeAngle),
                                   upperLegLength + lowerLegLength * Math.cos(kneeAngle))
            hipAngle = alpha - beta
        }
        
        // Apply PD control to achieve target angles
        const kp = WolfPhysicsConstants.legStiffness
        const kd = WolfPhysicsConstants.legDamping
        
        const hipError = hipAngle - legJoint.currentAngles[0]
        const kneeError = kneeAngle - legJoint.currentAngles[1]
        
        const hipForce = Math.max(-WolfPhysicsConstants.maxMuscleForce,
                                 Math.min(WolfPhysicsConstants.maxMuscleForce,
                                         kp * hipError + kd * (-legJoint.forces[0] / kd)))
        const kneeForce = Math.max(-WolfPhysicsConstants.maxMuscleForce,
                                  Math.min(WolfPhysicsConstants.maxMuscleForce,
                                          kp * kneeError + kd * (-legJoint.forces[1] / kd)))
        
        legJoint.forces[0] = hipForce
        legJoint.forces[1] = kneeForce
        
        // Update muscle activation
        const muscleGroup = body.muscles.legs[legIndex]
        muscleGroup.averageActivation = (Math.abs(hipForce) + Math.abs(kneeForce)) / 
                                       (2 * WolfPhysicsConstants.maxMuscleForce)
    }
    
    // Apply external forces (gravity, drag, etc.)
    applyExternalForces(body, dt) {
        // Gravity
        body.segments.torso.forces.y += body.mass * this.gravity.y
        
        // Air drag
        const dragCoeff = WolfPhysicsConstants.bodyDrag
        const velocity = body.state.velocity
        const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2)
        
        if (speed > 0) {
            const dragForce = dragCoeff * speed * speed
            const dragDir = {
                x: -velocity.x / speed,
                y: -velocity.y / speed,
                z: -velocity.z / speed
            }
            
            body.segments.torso.forces.x += dragForce * dragDir.x
            body.segments.torso.forces.y += dragForce * dragDir.y
            body.segments.torso.forces.z += dragForce * dragDir.z
        }
    }
    
    // Update ground contacts for all paws
    updateGroundContacts(body) {
        let anyGrounded = false
        
        for (let i = 0; i < 4; i++) {
            const contact = body.contacts[i]
            const legSegment = body.segments.legs[i]
            
            // Simple ground plane at y = 0 for now
            const groundHeight = 0
            const pawY = legSegment.position.y
            
            if (pawY <= groundHeight + WolfPhysicsConstants.sinkDepth) {
                contact.isActive = true
                contact.penetration = groundHeight - pawY
                contact.position.x = legSegment.position.x
                contact.position.y = groundHeight
                contact.position.z = legSegment.position.z
                contact.normal = body.groundContact.groundNormal
                anyGrounded = true
                body.groundContact.contactPoints[i] = true
            } else {
                contact.isActive = false
                contact.penetration = 0
                body.groundContact.contactPoints[i] = false
            }
        }
        
        body.groundContact.isGrounded = anyGrounded
    }
    
    // Apply contact forces from ground interaction
    applyContactForces(body, dt) {
        for (let i = 0; i < 4; i++) {
            const contact = body.contacts[i]
            if (!contact.isActive) continue
            
            const legSegment = body.segments.legs[i]
            
            // Normal force (spring-damper)
            const kn = WolfPhysicsConstants.groundStiffness
            const cn = WolfPhysicsConstants.groundDamping
            
            const normalForce = kn * contact.penetration - cn * legSegment.velocity.y
            contact.force.y = Math.max(0, normalForce)
            
            // Friction force
            const tangentVel = {
                x: legSegment.velocity.x,
                z: legSegment.velocity.z
            }
            const tangentSpeed = Math.sqrt(tangentVel.x**2 + tangentVel.z**2)
            
            if (tangentSpeed > 0.001) {
                const maxFriction = contact.friction * contact.force.y
                const frictionForce = Math.min(maxFriction, 
                                             WolfPhysicsConstants.pawDamping * tangentSpeed)
                
                contact.force.x = -frictionForce * tangentVel.x / tangentSpeed
                contact.force.z = -frictionForce * tangentVel.z / tangentSpeed
            } else {
                contact.force.x = 0
                contact.force.z = 0
            }
            
            // Apply contact forces to leg
            legSegment.forces.x += contact.force.x
            legSegment.forces.y += contact.force.y
            legSegment.forces.z += contact.force.z
            
            // Store for WASM
            body.groundContact.contactForces[i] = {
                x: contact.force.x,
                y: contact.force.y,
                z: contact.force.z
            }
        }
    }
    
    // Integrate motion using semi-implicit Euler
    integrateMotion(body, dt) {
        // Update velocities first
        for (let segment of Object.values(body.segments)) {
            if (Array.isArray(segment)) {
                for (let seg of segment) {
                    this.integrateSegment(seg, dt)
                }
            } else {
                this.integrateSegment(segment, dt)
            }
        }
        
        // Update main body state
        const torso = body.segments.torso
        body.state.velocity = { ...torso.velocity }
        body.state.position.x += body.state.velocity.x * dt
        body.state.position.y += body.state.velocity.y * dt
        body.state.position.z += body.state.velocity.z * dt
    }
    
    // Integrate individual segment
    integrateSegment(segment, dt) {
        // Linear motion
        const accel = {
            x: segment.forces.x / segment.mass,
            y: segment.forces.y / segment.mass,
            z: segment.forces.z / segment.mass
        }
        
        segment.velocity.x += accel.x * dt
        segment.velocity.y += accel.y * dt
        segment.velocity.z += accel.z * dt
        
        segment.position.x += segment.velocity.x * dt
        segment.position.y += segment.velocity.y * dt
        segment.position.z += segment.velocity.z * dt
        
        // Clear forces for next frame
        segment.forces.x = 0
        segment.forces.y = 0
        segment.forces.z = 0
    }
    
    // Update derived properties
    updateDerivedProperties(body) {
        // Center of mass
        let totalMass = 0
        let com = { x: 0, y: 0, z: 0 }
        
        for (let segment of Object.values(body.segments)) {
            if (Array.isArray(segment)) {
                for (let seg of segment) {
                    totalMass += seg.mass
                    com.x += seg.position.x * seg.mass
                    com.y += seg.position.y * seg.mass
                    com.z += seg.position.z * seg.mass
                }
            } else {
                totalMass += segment.mass
                com.x += segment.position.x * segment.mass
                com.y += segment.position.y * segment.mass
                com.z += segment.position.z * segment.mass
            }
        }
        
        body.state.centerOfMass.x = com.x / totalMass
        body.state.centerOfMass.y = com.y / totalMass
        body.state.centerOfMass.z = com.z / totalMass
        
        // Momentum
        body.state.momentum.x = totalMass * body.state.velocity.x
        body.state.momentum.y = totalMass * body.state.velocity.y
        body.state.momentum.z = totalMass * body.state.velocity.z
    }
    
    // Solve joint constraints
    solveConstraints(dt) {
        for (let iteration = 0; iteration < this.solverIterations; iteration++) {
            let maxError = 0
            
            for (let [wolfId, body] of this.wolves) {
                const error = this.solveWolfConstraints(body, dt)
                maxError = Math.max(maxError, error)
            }
            
            if (maxError < this.constraintTolerance) {
                break
            }
        }
    }
    
    // Solve constraints for a single wolf
    solveWolfConstraints(body, dt) {
        let maxError = 0
        
        // Joint angle constraints
        for (let joint of Object.values(body.joints)) {
            if (Array.isArray(joint)) {
                for (let j of joint) {
                    const error = this.solveJointConstraint(j, dt)
                    maxError = Math.max(maxError, error)
                }
            } else {
                const error = this.solveJointConstraint(joint, dt)
                maxError = Math.max(maxError, error)
            }
        }
        
        return maxError
    }
    
    // Solve individual joint constraint
    solveJointConstraint(joint, dt) {
        let maxError = 0
        
        for (let i = 0; i < joint.degreesOfFreedom; i++) {
            const angle = joint.currentAngles[i]
            const minAngle = joint.limits.min[i]
            const maxAngle = joint.limits.max[i]
            
            let error = 0
            if (angle < minAngle) {
                error = minAngle - angle
                joint.currentAngles[i] = minAngle
            } else if (angle > maxAngle) {
                error = angle - maxAngle
                joint.currentAngles[i] = maxAngle
            }
            
            maxError = Math.max(maxError, Math.abs(error))
        }
        
        return maxError
    }
    
    // Interpolate states for smooth rendering
    interpolateStates(alpha) {
        // For now, just use current states
        // In a full implementation, we'd store previous states and interpolate
    }
    
    // Update WASM animation data with physics results
    updateWASMAnimationData(wasmModule) {
        if (!wasmModule) return
        
        for (let [wolfId, body] of this.wolves) {
            const wolfIndex = parseInt(wolfId)
            
            // Update animation data in WASM if functions exist
            if (typeof wasmModule.set_wolf_anim_spine_bend === 'function') {
                wasmModule.set_wolf_anim_spine_bend(wolfIndex, body.joints.pelvisToTorso.currentAngles[0])
            }
            
            if (typeof wasmModule.set_wolf_anim_head_pitch === 'function') {
                wasmModule.set_wolf_anim_head_pitch(wolfIndex, body.joints.neckToHead.currentAngles[0])
                wasmModule.set_wolf_anim_head_yaw(wolfIndex, body.joints.neckToHead.currentAngles[1])
            }
            
            // Update leg positions
            for (let i = 0; i < 4; i++) {
                const legPos = body.segments.legs[i].position
                if (typeof wasmModule.set_wolf_anim_leg_x === 'function') {
                    wasmModule.set_wolf_anim_leg_x(wolfIndex, i, legPos.x)
                    wasmModule.set_wolf_anim_leg_y(wolfIndex, i, legPos.y)
                }
            }
        }
    }
    
    // Get physics data for rendering
    getWolfPhysicsData(wolfId) {
        const body = this.wolves.get(wolfId)
        if (!body) return null
        
        return {
            position: body.state.position,
            centerOfMass: body.state.centerOfMass,
            groundContact: body.groundContact,
            joints: body.joints,
            muscles: body.muscles,
            segments: body.segments
        }
    }
    
    // Get performance metrics
    getPerformanceMetrics() {
        return { ...this.performanceMetrics }
    }
}

// Export the physics system
export default RealisticWolfPhysics
