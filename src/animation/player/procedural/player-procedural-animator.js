import PlayerProceduralRig from './player-procedural-rig.js'
import CorePostureModule from './modules/core-posture-module.js'
import LocomotionModule from './modules/locomotion-module.js'
import CombatModule from './modules/combat-module.js'
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
            combat: new CombatModule(options.combat),
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
            maxSpeed: inputContext.maxSpeed ?? 260,
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

        const posture = this.modules.core.apply(deltaTime, pose, context)
        context.posture = posture
        context.stridePhase = context.stridePhase ?? posture?.stridePhase ?? context.normalizedTime

        const locomotion = this.modules.locomotion.apply(deltaTime, pose, context)
        context.locomotion = locomotion
        context.stridePhase = locomotion?.stridePhase ?? context.stridePhase

        const combat = this.modules.combat.apply(deltaTime, pose, context)
        context.combat = combat

        const secondary = this.modules.secondary.apply(deltaTime, pose, context)
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
                shiver: environmental?.shiver ?? 0
            }
        }

        return this.cachedTransform
    }
}




