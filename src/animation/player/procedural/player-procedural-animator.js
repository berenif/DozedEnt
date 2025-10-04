import PlayerProceduralRig from './player-procedural-rig.js'
import CorePostureModule from './modules/core-posture-module.js'
import LocomotionModule from './modules/locomotion-module.js'
import FootIKModule from './modules/foot-ik-module.js'
import SpineModule from './modules/spine-module.js'
import CombatModule from './modules/combat-module.js'
import ArmIKModule from './modules/arm-ik-module.js'
import HeadGazeModule from './modules/head-gaze-module.js'
import SecondaryMotionModule from './modules/secondary-motion-module.js'
import EnvironmentModule from './modules/environment-module.js'

const identityTransform = () => ({
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    trails: []
})

// PlayerProceduralAnimator combines specialized modules into a deterministic
// animation overlay that sits on top of the sprite system. Each module receives
// only the data it needs so behaviour stays predictable and testable.
export default class PlayerProceduralAnimator {
    constructor(options = {}) {
        this.rig = new PlayerProceduralRig()
        this.modules = {
            core: new CorePostureModule(options.core),
            locomotion: new LocomotionModule(options.locomotion),
            footIK: new FootIKModule(options.footIK),
            spine: new SpineModule(options.spine),
            combat: new CombatModule(options.combat),
            armIK: new ArmIKModule(options.armIK),
            headGaze: new HeadGazeModule(options.headGaze),
            secondary: new SecondaryMotionModule(options.secondary),
            environment: new EnvironmentModule(options.environment)
        }
        this.cachedTransform = {
            ...identityTransform(),
            skeleton: this.rig.toSkeleton(),
            secondaryMotion: null,
            environmental: null,
            debug: null
        }
    }

    buildContext(deltaTime, inputContext = {}) {
        const overlay = inputContext.overlay || {}
        const velocity = inputContext.velocity || { x: 0, y: 0 }
        const momentum = inputContext.momentum || velocity
        const speed = Math.hypot(velocity.x, velocity.y)

        return {
            deltaTime,
            playerState: inputContext.playerState || 'idle',
            facing: inputContext.facing ?? 1,
            velocity,
            momentum,
            speed,
            // Normalize default maxSpeed to match WASM player's MOVE_SPEED (0.3 units/sec)
            maxSpeed: inputContext.maxSpeed ?? 0.3,
            normalizedTime: inputContext.normalizedTime ?? 0,
            stridePhase: inputContext.stridePhase,
            isGrounded: inputContext.isGrounded ?? true,
            pelvisOffset: inputContext.pelvisOffset ?? 0,
            breathing: inputContext.breathing ?? 1,
            fatigue: inputContext.fatigue ?? 0,
            legLiftLeft: inputContext.legLiftLeft ?? 0,
            legLiftRight: inputContext.legLiftRight ?? 0,
            groundOffset: inputContext.groundOffset ?? 0,
            wind: inputContext.wind ?? 0,
            temperatureShiver: inputContext.temperatureShiver ?? 0,
            clothSway: inputContext.clothSway ?? 0,
            hairBounce: inputContext.hairBounce ?? 0,
            equipmentJiggle: inputContext.equipmentJiggle ?? 0,
            staminaRatio: inputContext.staminaRatio ?? 1,
            healthRatio: inputContext.healthRatio ?? 1,
            inputState: inputContext.inputState || {},
            attackStrength: inputContext.attackStrength ?? 1,
            attackType: inputContext.attackType || 'light',
            overlay: {
                scaleX: overlay.scaleX ?? 1,
                scaleY: overlay.scaleY ?? 1,
                rotation: overlay.rotation ?? 0,
                offsetX: overlay.offsetX ?? 0,
                offsetY: overlay.offsetY ?? 0
            }
        }
    }
    composeTransform(context, posture, locomotion) {
        const base = context.overlay
        const locomotionLift = locomotion?.stepPower ? -locomotion.stepPower * 1.4 : 0

        return {
            scaleX: base.scaleX,
            scaleY: base.scaleY,
            rotation: base.rotation + (posture?.rotation ?? 0),
            offsetX: base.offsetX + (posture?.offsetX ?? 0),
            offsetY: base.offsetY + (posture?.offsetY ?? 0) + locomotionLift,
            trails: base.trails || []
        }
    }

    update(deltaTime, contextInput = {}) {
        const context = this.buildContext(deltaTime, contextInput)
        const pose = this.rig.createWorkingPose()

        // Module execution order for human-like motion:
        // 1. Core posture establishes COM and breathing baseline
        const posture = this.modules.core.apply(deltaTime, pose, context)
        context.posture = posture
        context.stridePhase = context.stridePhase ?? posture?.stridePhase ?? context.normalizedTime

        // 2. Locomotion calculates stride phase and foot targets
        const locomotion = this.modules.locomotion.apply(deltaTime, pose, context)
        context.locomotion = locomotion
        context.stridePhase = locomotion?.stridePhase ?? context.stridePhase

        // 3. Foot IK resolves foot targets into knee/ankle/toe positions
        const footIK = this.modules.footIK.apply(deltaTime, pose, context)
        context.footIK = footIK

        // 4. Spine creates multi-segment bending and counter-rotation
        const spine = this.modules.spine.apply(deltaTime, pose, context)
        context.spine = spine

        // 5. Combat determines hand targets based on state
        const combat = this.modules.combat.apply(deltaTime, pose, context)
        context.combat = combat

        // 6. Arm IK resolves hand targets into elbow/wrist positions with proper bending
        const armIK = this.modules.armIK.apply(deltaTime, pose, context)
        context.armIK = armIK

        // 7. Head gaze adds stabilization and look-at behavior
        const headGaze = this.modules.headGaze.apply(deltaTime, pose, context)
        context.headGaze = headGaze

        // 8. Secondary motion adds cloth, hair, equipment inertia
        const secondary = this.modules.secondary.apply(deltaTime, pose, context)

        // 9. Environment applies wind, temperature, ground coupling
        const environmental = this.modules.environment.apply(deltaTime, pose, context)

        this.rig.commitPose(pose)

        const baseTransform = this.composeTransform(context, posture, locomotion)

        this.cachedTransform = {
            ...baseTransform,
            skeleton: this.rig.toSkeleton(),
            secondaryMotion: secondary,
            environmental,
            debug: {
                state: context.playerState,
                stridePhase: locomotion?.stridePhase ?? 0,
                speed: context.speed,
                lean: posture?.lean ?? 0,
                wind: environmental?.wind ?? 0,
                shiver: environmental?.shiver ?? 0,
                footPlanted: {
                    left: footIK?.leftFootPlanted ?? false,
                    right: footIK?.rightFootPlanted ?? false
                },
                spineCounterRotation: spine?.counterRotation ?? 0,
                headYaw: headGaze?.yaw ?? 0
            }
        }

        return this.cachedTransform
    }
}




