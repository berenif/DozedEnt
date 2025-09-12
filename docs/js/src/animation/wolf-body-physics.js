// Wolf Body Physics System
// Provides realistic physics simulation for wolf body dynamics

export class WolfBodyPhysics {
    constructor() {
        // Physics constants
        this.constants = {
            gravity: 980,           // pixels per second squared
            airResistance: 0.99,    // air resistance coefficient
            groundFriction: 0.85,   // ground friction
            muscleForce: 1000,      // maximum muscle force (N)
            jointDamping: 0.9,      // joint damping coefficient
            springConstant: 800,    // spring constant for body parts
            maxJointTorque: 200,    // maximum joint torque
            bodyMass: 35,           // average wolf mass (kg)
            momentOfInertia: 5,     // rotational inertia
            collisionElasticity: 0.3 // collision bounce factor
        }

        // Body segment definitions
        this.bodySegments = {
            head: {
                mass: 4.5,
                momentOfInertia: 0.8,
                size: { width: 0.16, height: 0.14 }
            },
            neck: {
                mass: 2.0,
                momentOfInertia: 0.3,
                size: { width: 0.08, height: 0.14 }
            },
            torso: {
                mass: 18.0,
                momentOfInertia: 2.5,
                size: { width: 0.30, height: 0.32 }
            },
            frontLeftLeg: {
                mass: 2.2,
                momentOfInertia: 0.2,
                size: { width: 0.05, height: 0.18 }
            },
            frontRightLeg: {
                mass: 2.2,
                momentOfInertia: 0.2,
                size: { width: 0.05, height: 0.18 }
            },
            hindLeftLeg: {
                mass: 2.5,
                momentOfInertia: 0.25,
                size: { width: 0.06, height: 0.20 }
            },
            hindRightLeg: {
                mass: 2.5,
                momentOfInertia: 0.25,
                size: { width: 0.06, height: 0.20 }
            },
            tail: {
                mass: 1.8,
                momentOfInertia: 0.4,
                size: { width: 0.08, height: 0.42 }
            }
        }

        // Joint constraints
        this.jointConstraints = {
            headNeck: {
                maxAngle: Math.PI / 3,    // 60 degrees
                minAngle: -Math.PI / 6,  // -30 degrees
                stiffness: 500
            },
            neckTorso: {
                maxAngle: Math.PI / 4,    // 45 degrees
                minAngle: -Math.PI / 4,  // -45 degrees
                stiffness: 600
            },
            shoulderFront: {
                maxAngle: Math.PI / 2,    // 90 degrees
                minAngle: -Math.PI / 3,  // -60 degrees
                stiffness: 700
            },
            hipHind: {
                maxAngle: Math.PI / 3,    // 60 degrees
                minAngle: -Math.PI / 2,  // -90 degrees
                stiffness: 800
            },
            elbow: {
                maxAngle: Math.PI / 2,    // 90 degrees
                minAngle: 0,             // 0 degrees
                stiffness: 400
            },
            knee: {
                maxAngle: Math.PI / 2,    // 90 degrees
                minAngle: 0,             // 0 degrees
                stiffness: 500
            },
            tailBase: {
                maxAngle: Math.PI / 4,    // 45 degrees
                minAngle: -Math.PI / 4,  // -45 degrees
                stiffness: 300
            }
        }

        // Physics state for each wolf
        this.physicsStates = new Map()

        // Collision system
        this.collisionSystem = new WolfCollisionSystem()
    }

    // Initialize physics for a wolf
    initializeWolfPhysics(wolf, anatomyData) {
        const physicsState = {
            segments: {},
            joints: {},
            forces: { x: 0, y: 0 },
            torques: {},
            centerOfMass: { x: 0, y: 0 },
            linearVelocity: { x: 0, y: 0 },
            angularVelocity: 0,
            isGrounded: true,
            groundContactPoints: [],
            lastUpdateTime: Date.now()
        }

        // Initialize body segments
        this.initializeBodySegments(physicsState, wolf, anatomyData)

        // Initialize joints
        this.initializeJoints(physicsState, anatomyData)

        // Calculate initial center of mass
        this.calculateCenterOfMass(physicsState)

        this.physicsStates.set(wolf.id, physicsState)

        return physicsState
    }

    // Initialize body segments
    initializeBodySegments(physicsState, wolf, anatomyData) {
        const segments = physicsState.segments

        // Get joint positions from anatomy
        const jointPositions = anatomyData.jointPositions || this.getDefaultJointPositions(wolf)

        // Initialize each segment
        Object.keys(this.bodySegments).forEach(segmentName => {
            const segmentDef = this.bodySegments[segmentName]
            const position = this.getSegmentPosition(segmentName, jointPositions, wolf)

            segments[segmentName] = {
                position: { ...position },
                velocity: { x: 0, y: 0 },
                angle: this.getSegmentAngle(segmentName, wolf),
                angularVelocity: 0,
                mass: segmentDef.mass,
                momentOfInertia: segmentDef.momentOfInertia,
                size: { ...segmentDef.size },
                forces: { x: 0, y: 0 },
                torque: 0,
                isGrounded: false
            }
        })
    }

    // Get default joint positions if anatomy doesn't provide them
    getDefaultJointPositions(wolf) {
        const baseX = wolf.position.x
        const baseY = wolf.position.y

        return {
            head: { x: baseX + 0.75 * wolf.width, y: baseY - 0.2 * wolf.height },
            neck: { x: baseX + 0.6 * wolf.width, y: baseY - 0.1 * wolf.height },
            shoulders: { x: baseX + 0.4 * wolf.width, y: baseY - 0.1 * wolf.height },
            hips: { x: baseX + 0.2 * wolf.width, y: baseY },
            frontLeftKnee: { x: baseX + 0.25 * wolf.width, y: baseY + 0.1 * wolf.height },
            frontRightKnee: { x: baseX + 0.35 * wolf.width, y: baseY + 0.1 * wolf.height },
            hindLeftKnee: { x: baseX - 0.15 * wolf.width, y: baseY + 0.15 * wolf.height },
            hindRightKnee: { x: baseX - 0.05 * wolf.width, y: baseY + 0.15 * wolf.height },
            tailBase: { x: baseX - 0.35 * wolf.width, y: baseY }
        }
    }

    // Get segment position
    getSegmentPosition(segmentName, jointPositions, wolf) {
        const positions = {
            head: jointPositions.head,
            neck: jointPositions.neck,
            torso: {
                x: (jointPositions.shoulders.x + jointPositions.hips.x) / 2,
                y: (jointPositions.shoulders.y + jointPositions.hips.y) / 2
            },
            frontLeftLeg: {
                x: (jointPositions.shoulders.x + jointPositions.frontLeftKnee.x) / 2,
                y: (jointPositions.shoulders.y + jointPositions.frontLeftKnee.y) / 2
            },
            frontRightLeg: {
                x: (jointPositions.shoulders.x + jointPositions.frontRightKnee.x) / 2,
                y: (jointPositions.shoulders.y + jointPositions.frontRightKnee.y) / 2
            },
            hindLeftLeg: {
                x: (jointPositions.hips.x + jointPositions.hindLeftKnee.x) / 2,
                y: (jointPositions.hips.y + jointPositions.hindLeftKnee.y) / 2
            },
            hindRightLeg: {
                x: (jointPositions.hips.x + jointPositions.hindRightKnee.x) / 2,
                y: (jointPositions.hips.y + jointPositions.hindRightKnee.y) / 2
            },
            tail: {
                x: jointPositions.tailBase.x - wolf.width * 0.2,
                y: jointPositions.tailBase.y
            }
        }

        return positions[segmentName] || { x: wolf.position.x, y: wolf.position.y }
    }

    // Get segment angle
    getSegmentAngle(segmentName, wolf) {
        // Base angles for different segments
        const baseAngles = {
            head: 0,
            neck: 0,
            torso: 0,
            frontLeftLeg: Math.PI / 6,
            frontRightLeg: -Math.PI / 6,
            hindLeftLeg: -Math.PI / 4,
            hindRightLeg: Math.PI / 4,
            tail: 0
        }

        return baseAngles[segmentName] || 0
    }

    // Initialize joints
    initializeJoints(physicsState, anatomyData) {
        const joints = physicsState.joints

        // Define joint connections
        const jointDefinitions = {
            headNeck: { parent: 'neck', child: 'head', constraint: 'headNeck' },
            neckTorso: { parent: 'torso', child: 'neck', constraint: 'neckTorso' },
            leftShoulder: { parent: 'torso', child: 'frontLeftLeg', constraint: 'shoulderFront' },
            rightShoulder: { parent: 'torso', child: 'frontRightLeg', constraint: 'shoulderFront' },
            leftHip: { parent: 'torso', child: 'hindLeftLeg', constraint: 'hipHind' },
            rightHip: { parent: 'torso', child: 'hindRightLeg', constraint: 'hipHind' },
            tailJoint: { parent: 'torso', child: 'tail', constraint: 'tailBase' }
        }

        // Initialize each joint
        Object.keys(jointDefinitions).forEach(jointName => {
            const def = jointDefinitions[jointName]
            const constraint = this.jointConstraints[def.constraint]

            joints[jointName] = {
                parentSegment: def.parent,
                childSegment: def.child,
                constraint: constraint,
                currentAngle: 0,
                targetAngle: 0,
                torque: 0,
                stiffness: constraint.stiffness,
                damping: this.constants.jointDamping
            }
        })
    }

    // Calculate center of mass
    calculateCenterOfMass(physicsState) {
        const segments = physicsState.segments
        let totalMass = 0
        let comX = 0
        let comY = 0

        Object.values(segments).forEach(segment => {
            totalMass += segment.mass
            comX += segment.position.x * segment.mass
            comY += segment.position.y * segment.mass
        })

        physicsState.centerOfMass.x = comX / totalMass
        physicsState.centerOfMass.y = comY / totalMass
    }

    // Update physics simulation
    update(deltaTime, wolf, environment = {}) {
        const physicsState = this.physicsStates.get(wolf.id)
        if (!physicsState) {return}

        const dt = Math.min(deltaTime, 1/60) // Cap at 60fps for stability

        // Reset forces
        this.resetForces(physicsState)

        // Apply environmental forces
        this.applyEnvironmentalForces(physicsState, environment, wolf)

        // Apply muscle forces based on animation state
        this.applyMuscleForces(physicsState, wolf)

        // Apply joint constraints
        this.applyJointConstraints(physicsState)

        // Handle collisions
        this.handleCollisions(physicsState, environment)

        // Integrate physics
        this.integratePhysics(physicsState, dt)

        // Update wolf position based on physics
        this.updateWolfPosition(wolf, physicsState)

        // Update animation state based on physics
        this.updateAnimationFromPhysics(wolf, physicsState)
    }

    // Reset forces for new frame
    resetForces(physicsState) {
        Object.values(physicsState.segments).forEach(segment => {
            segment.forces.x = 0
            segment.forces.y = 0
            segment.torque = 0
        })

        physicsState.forces.x = 0
        physicsState.forces.y = 0
        Object.keys(physicsState.torques).forEach(key => {
            physicsState.torques[key] = 0
        })
    }

    // Apply environmental forces
    applyEnvironmentalForces(physicsState, environment, wolf) {
        const segments = physicsState.segments

        // Gravity
        Object.values(segments).forEach(segment => {
            segment.forces.y += segment.mass * this.constants.gravity
        })

        // Air resistance
        Object.values(segments).forEach(segment => {
            segment.forces.x -= segment.velocity.x * (1 - this.constants.airResistance)
            segment.forces.y -= segment.velocity.y * (1 - this.constants.airResistance)
        })

        // Wind force
        if (environment.wind) {
            const windForce = environment.wind.strength * 50
            Object.values(segments).forEach(segment => {
                segment.forces.x += windForce * environment.wind.direction.x
                segment.forces.y += windForce * environment.wind.direction.y
            })
        }

        // Ground friction
        if (physicsState.isGrounded) {
            Object.values(segments).forEach(segment => {
                if (segment.isGrounded) {
                    segment.forces.x -= segment.velocity.x * (1 - this.constants.groundFriction) * segment.mass
                }
            })
        }
    }

    // Apply muscle forces based on animation state
    applyMuscleForces(physicsState, wolf) {
        const segments = physicsState.segments
        const joints = physicsState.joints

        // Apply forces based on wolf state
        switch (wolf.state) {
            case 'running':
                this.applyRunningForces(segments, joints, wolf)
                break
            case 'lunging':
                this.applyLungingForces(segments, joints, wolf)
                break
            case 'attacking':
                this.applyAttackingForces(segments, joints, wolf)
                break
            case 'idle':
                this.applyIdleForces(segments, joints, wolf)
                break
            case 'hurt':
                this.applyHurtForces(segments, joints, wolf)
                break
        }

        // Apply muscle tone multiplier
        const muscleMultiplier = wolf.muscleTone || 1.0
        Object.values(segments).forEach(segment => {
            segment.forces.x *= muscleMultiplier
            segment.forces.y *= muscleMultiplier
        })
    }

    // Apply running forces
    applyRunningForces(segments, joints, wolf) {
        // Leg extension and retraction forces
        const runCycle = Math.sin(wolf.animationTime * 0.02)
        const legForce = this.constants.muscleForce * 0.8

        // Front legs
        segments.frontLeftLeg.forces.y -= legForce * Math.max(0, runCycle)
        segments.frontRightLeg.forces.y -= legForce * Math.max(0, -runCycle)

        // Hind legs
        segments.hindLeftLeg.forces.y -= legForce * Math.max(0, -runCycle)
        segments.hindRightLeg.forces.y -= legForce * Math.max(0, runCycle)

        // Body propulsion
        const propulsionForce = legForce * 0.5
        segments.torso.forces.x += wolf.facing * propulsionForce
    }

    // Apply lunging forces
    applyLungingForces(segments, joints, wolf) {
        const lungeForce = this.constants.muscleForce * 1.5

        // Powerful hind leg extension
        segments.hindLeftLeg.forces.y -= lungeForce
        segments.hindRightLeg.forces.y -= lungeForce

        // Front leg push
        segments.frontLeftLeg.forces.y -= lungeForce * 0.7
        segments.frontRightLeg.forces.y -= lungeForce * 0.7

        // Forward body propulsion
        segments.torso.forces.x += wolf.facing * lungeForce * 2
    }

    // Apply attacking forces
    applyAttackingForces(segments, joints, wolf) {
        // Head and neck extension
        segments.head.forces.x += wolf.facing * this.constants.muscleForce * 0.6
        segments.neck.forces.x += wolf.facing * this.constants.muscleForce * 0.4

        // Body stabilization
        segments.torso.forces.y -= this.constants.muscleForce * 0.3
    }

    // Apply idle forces
    applyIdleForces(segments, joints, wolf) {
        // Gentle breathing motion
        const breathCycle = Math.sin(wolf.animationTime * 0.005)
        segments.torso.forces.y += breathCycle * 50
        segments.head.forces.y += breathCycle * 20
    }

    // Apply hurt forces
    applyHurtForces(segments, joints, wolf) {
        // Deterministic flinch forces (visuals only)
        const base = Number((globalThis.runSeedForVisuals ?? 1n) % 997n) / 997
        let n = base
        Object.values(segments).forEach(segment => {
            // Simple hash step
            n = (n * 9301 + 49297) % 233280
            const f1 = (n / 233280) - 0.5
            n = (n * 9301 + 49297) % 233280
            const f2 = (n / 233280) - 0.5
            segment.forces.x += f1 * 200
            segment.forces.y += f2 * 200
        })
    }

    // Apply joint constraints
    applyJointConstraints(physicsState) {
        const segments = physicsState.segments
        const joints = physicsState.joints

        Object.values(joints).forEach(joint => {
            const parent = segments[joint.parentSegment]
            const child = segments[joint.childSegment]
            const constraint = joint.constraint

            if (!parent || !child || !constraint) {return}

            // Calculate current joint angle
            const dx = child.position.x - parent.position.x
            const dy = child.position.y - parent.position.y
            const currentAngle = Math.atan2(dy, dx)

            // Calculate angle error
            const targetAngle = joint.targetAngle
            let angleError = targetAngle - currentAngle

            // Normalize angle to [-π, π]
            while (angleError > Math.PI) {angleError -= 2 * Math.PI}
            while (angleError < -Math.PI) {angleError += 2 * Math.PI}

            // Clamp to joint limits
            angleError = Math.max(constraint.minAngle - currentAngle,
                        Math.min(constraint.maxAngle - currentAngle, angleError))

            // Apply constraint torque
            const torque = angleError * constraint.stiffness
            const dampingTorque = -joint.currentAngle * joint.damping

            joint.torque = torque + dampingTorque

            // Apply torques to segments
            parent.torque -= joint.torque
            child.torque += joint.torque

            joint.currentAngle = currentAngle
        })
    }

    // Handle collisions
    handleCollisions(physicsState, environment) {
        // Ground collision
        this.handleGroundCollision(physicsState, environment)

        // Obstacle collision
        this.handleObstacleCollision(physicsState, environment)

        // Other wolf collisions
        this.handleWolfCollisions(physicsState, environment)
    }

    // Handle ground collision
    handleGroundCollision(physicsState, environment) {
        const segments = physicsState.segments
        const groundY = environment.groundY || 0

        physicsState.isGrounded = false
        physicsState.groundContactPoints = []

        Object.entries(segments).forEach(([name, segment]) => {
            const segmentBottom = segment.position.y + segment.size.height / 2

            if (segmentBottom >= groundY) {
                // Ground contact
                segment.isGrounded = true
                physicsState.isGrounded = true
                physicsState.groundContactPoints.push(name)

                // Apply normal force
                const penetration = segmentBottom - groundY
                const normalForce = penetration * 1000 // Spring constant

                segment.forces.y -= normalForce

                // Apply friction
                const frictionForce = segment.velocity.x * this.constants.groundFriction * segment.mass
                segment.forces.x -= frictionForce

                // Bounce if moving fast
                if (segment.velocity.y > 50) {
                    segment.velocity.y *= -this.constants.collisionElasticity
                } else {
                    segment.velocity.y = 0
                }

                // Prevent sinking
                segment.position.y = groundY - segment.size.height / 2
            } else {
                segment.isGrounded = false
            }
        })
    }

    // Handle obstacle collision
    handleObstacleCollision(physicsState, environment) {
        if (!environment.obstacles) {return}

        environment.obstacles.forEach(obstacle => {
            Object.values(physicsState.segments).forEach(segment => {
                if (this.collisionSystem.checkCollision(segment, obstacle)) {
                    this.collisionSystem.resolveCollision(segment, obstacle)
                }
            })
        })
    }

    // Handle wolf-to-wolf collisions
    handleWolfCollisions(physicsState, environment) {
        if (!environment.otherWolves) {return}

        environment.otherWolves.forEach(otherWolf => {
            const otherPhysics = this.physicsStates.get(otherWolf.id)
            if (!otherPhysics) {return}

            // Check collisions between all segments
            Object.values(physicsState.segments).forEach(segment => {
                Object.values(otherPhysics.segments).forEach(otherSegment => {
                    if (this.collisionSystem.checkCollision(segment, otherSegment)) {
                        this.collisionSystem.resolveCollision(segment, otherSegment)
                    }
                })
            })
        })
    }

    // Integrate physics equations
    integratePhysics(physicsState, dt) {
        const segments = physicsState.segments

        // Integrate segment physics
        Object.values(segments).forEach(segment => {
            // Linear motion
            const accelX = segment.forces.x / segment.mass
            const accelY = segment.forces.y / segment.mass

            segment.velocity.x += accelX * dt
            segment.velocity.y += accelY * dt

            segment.position.x += segment.velocity.x * dt
            segment.position.y += segment.velocity.y * dt

            // Angular motion
            const angularAccel = segment.torque / segment.momentOfInertia
            segment.angularVelocity += angularAccel * dt
            segment.angle += segment.angularVelocity * dt

            // Damping
            segment.velocity.x *= this.constants.airResistance
            segment.velocity.y *= this.constants.airResistance
            segment.angularVelocity *= this.constants.airResistance
        })

        // Update center of mass
        this.calculateCenterOfMass(physicsState)

        // Update overall wolf velocity (average of segment velocities)
        this.updateOverallVelocity(physicsState)
    }

    // Update overall wolf velocity
    updateOverallVelocity(physicsState) {
        const segments = physicsState.segments
        let totalMass = 0
        let totalMomentumX = 0
        let totalMomentumY = 0

        Object.values(segments).forEach(segment => {
            totalMass += segment.mass
            totalMomentumX += segment.velocity.x * segment.mass
            totalMomentumY += segment.velocity.y * segment.mass
        })

        physicsState.linearVelocity.x = totalMomentumX / totalMass
        physicsState.linearVelocity.y = totalMomentumY / totalMass
    }

    // Update wolf position based on physics
    updateWolfPosition(wolf, physicsState) {
        // Update position to match center of mass
        wolf.position.x = physicsState.centerOfMass.x
        wolf.position.y = physicsState.centerOfMass.y

        // Update velocity
        wolf.velocity.x = physicsState.linearVelocity.x
        wolf.velocity.y = physicsState.linearVelocity.y

        // Update facing direction based on movement
        if (Math.abs(wolf.velocity.x) > 10) {
            wolf.facing = wolf.velocity.x > 0 ? 1 : -1
        }
    }

    // Update animation state based on physics
    updateAnimationFromPhysics(wolf, physicsState) {
        // Update body deformation based on forces
        const totalForce = Math.sqrt(
            physicsState.forces.x ** 2 + physicsState.forces.y ** 2
        )
        wolf.bodyDeformation = Math.min(totalForce / 1000, 0.5)

        // Update muscle tension based on joint torques
        const maxTorque = Math.max(...Object.values(physicsState.joints).map(j => Math.abs(j.torque)))
        wolf.muscleTension = Math.min(maxTorque / this.constants.maxJointTorque, 1.0)

        // Update balance state
        wolf.isBalanced = physicsState.isGrounded &&
                         Math.abs(physicsState.linearVelocity.y) < 50

        // Update segment positions for animation
        this.updateAnimationSegments(wolf, physicsState)
    }

    // Update animation segment positions
    updateAnimationSegments(wolf, physicsState) {
        const segments = physicsState.segments

        // Update leg positions
        if (wolf.legPositions) {
            wolf.legPositions[0] = {
                x: segments.frontLeftLeg.position.x - wolf.position.x,
                y: segments.frontLeftLeg.position.y - wolf.position.y
            }
            wolf.legPositions[1] = {
                x: segments.frontRightLeg.position.x - wolf.position.x,
                y: segments.frontRightLeg.position.y - wolf.position.y
            }
            wolf.legPositions[2] = {
                x: segments.hindLeftLeg.position.x - wolf.position.x,
                y: segments.hindLeftLeg.position.y - wolf.position.y
            }
            wolf.legPositions[3] = {
                x: segments.hindRightLeg.position.x - wolf.position.x,
                y: segments.hindRightLeg.position.y - wolf.position.y
            }
        }

        // Update head position
        wolf.headOffset = {
            x: segments.head.position.x - wolf.position.x,
            y: segments.head.position.y - wolf.position.y
        }

        // Update tail position
        if (wolf.tailPosition !== undefined) {
            wolf.tailPosition = segments.tail.angle
        }
    }

    // Apply external force to wolf
    applyForce(wolfId, force, position = null) {
        const physicsState = this.physicsStates.get(wolfId)
        if (!physicsState) {return}

        if (position) {
            // Apply force at specific position (affects both linear and angular motion)
            const com = physicsState.centerOfMass
            const leverArm = {
                x: position.x - com.x,
                y: position.y - com.y
            }

            // Torque = r × F
            const torque = leverArm.x * force.y - leverArm.y * force.x

            physicsState.forces.x += force.x
            physicsState.forces.y += force.y
            physicsState.torques.body = (physicsState.torques.body || 0) + torque
        } else {
            // Apply force at center of mass
            physicsState.forces.x += force.x
            physicsState.forces.y += force.y
        }
    }

    // Apply impulse (instantaneous force)
    applyImpulse(wolfId, impulse, position = null) {
        const physicsState = this.physicsStates.get(wolfId)
        if (!physicsState) {return}

        // Convert impulse to velocity change
        const segments = physicsState.segments
        const totalMass = Object.values(segments).reduce((sum, seg) => sum + seg.mass, 0)

        if (position) {
            // Apply at specific position
            const com = physicsState.centerOfMass
            const leverArm = {
                x: position.x - com.x,
                y: position.y - com.y
            }

            const torque = leverArm.x * impulse.y - leverArm.y * impulse.x
            const angularImpulse = torque / this.constants.momentOfInertia

            // Apply to all segments
            Object.values(segments).forEach(segment => {
                const massRatio = segment.mass / totalMass
                segment.velocity.x += (impulse.x / segment.mass) * massRatio
                segment.velocity.y += (impulse.y / segment.mass) * massRatio
                segment.angularVelocity += angularImpulse * massRatio
            })
        } else {
            // Apply at center of mass
            const velocityChangeX = impulse.x / totalMass
            const velocityChangeY = impulse.y / totalMass

            Object.values(segments).forEach(segment => {
                segment.velocity.x += velocityChangeX
                segment.velocity.y += velocityChangeY
            })
        }
    }

    // Get physics debug data
    getDebugData(wolfId) {
        const physicsState = this.physicsStates.get(wolfId)
        if (!physicsState) {return null}

        return {
            centerOfMass: { ...physicsState.centerOfMass },
            linearVelocity: { ...physicsState.linearVelocity },
            angularVelocity: physicsState.angularVelocity,
            isGrounded: physicsState.isGrounded,
            segmentCount: Object.keys(physicsState.segments).length,
            jointCount: Object.keys(physicsState.joints).length,
            groundContacts: physicsState.groundContactPoints.length
        }
    }

    // Reset physics state
    resetWolfPhysics(wolfId) {
        const physicsState = this.physicsStates.get(wolfId)
        if (!physicsState) {return}

        // Reset all segments
        Object.values(physicsState.segments).forEach(segment => {
            segment.velocity.x = 0
            segment.velocity.y = 0
            segment.angularVelocity = 0
            segment.forces.x = 0
            segment.forces.y = 0
            segment.torque = 0
        })

        // Reset overall state
        physicsState.forces.x = 0
        physicsState.forces.y = 0
        physicsState.linearVelocity.x = 0
        physicsState.linearVelocity.y = 0
        physicsState.angularVelocity = 0
    }

    // Remove wolf physics
    removeWolfPhysics(wolfId) {
        this.physicsStates.delete(wolfId)
    }
}

// Collision detection and resolution system
class WolfCollisionSystem {
    constructor() {
        this.collisionThreshold = 5 // Minimum distance for collision
    }

    // Check collision between two objects
    checkCollision(obj1, obj2) {
        // Simple bounding box collision
        const box1 = this.getBoundingBox(obj1)
        const box2 = this.getBoundingBox(obj2)

        return !(box1.right < box2.left ||
                box1.left > box2.right ||
                box1.bottom < box2.top ||
                box1.top > box2.bottom)
    }

    // Get bounding box for object
    getBoundingBox(obj) {
        const halfWidth = obj.size.width / 2
        const halfHeight = obj.size.height / 2

        return {
            left: obj.position.x - halfWidth,
            right: obj.position.x + halfWidth,
            top: obj.position.y - halfHeight,
            bottom: obj.position.y + halfHeight
        }
    }

    // Resolve collision between two objects
    resolveCollision(obj1, obj2) {
        // Calculate collision normal
        const dx = obj2.position.x - obj1.position.x
        const dy = obj2.position.y - obj1.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance === 0) {return} // Avoid division by zero

        const normal = {
            x: dx / distance,
            y: dy / distance
        }

        // Separate objects
        const overlap = (obj1.size.width + obj2.size.width) / 2 - distance
        if (overlap > 0) {
            const separation = overlap / 2
            obj1.position.x -= normal.x * separation
            obj1.position.y -= normal.y * separation
            obj2.position.x += normal.x * separation
            obj2.position.y += normal.y * separation
        }

        // Apply collision response
        const relativeVelocity = {
            x: obj2.velocity.x - obj1.velocity.x,
            y: obj2.velocity.y - obj1.velocity.y
        }

        const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y

        if (velocityAlongNormal > 0) {return} // Objects moving apart

        const restitution = 0.3 // Elasticity
        let impulse = -(1 + restitution) * velocityAlongNormal
        impulse /= (1 / obj1.mass + 1 / obj2.mass)

        const impulseVector = {
            x: impulse * normal.x,
            y: impulse * normal.y
        }

        obj1.velocity.x -= impulseVector.x / obj1.mass
        obj1.velocity.y -= impulseVector.y / obj1.mass
        obj2.velocity.x += impulseVector.x / obj2.mass
        obj2.velocity.y += impulseVector.y / obj2.mass
    }
}

export default WolfBodyPhysics
