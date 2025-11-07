import { expect } from 'chai'
import PlayerProceduralRig from '../../public/src/animation/player/procedural/player-procedural-rig.js'
import CorePostureModule from '../../public/src/animation/player/procedural/modules/core-posture-module.js'
import LocomotionModule from '../../public/src/animation/player/procedural/modules/locomotion-module.js'
import CombatModule from '../../public/src/animation/player/procedural/modules/combat-module.js'
import PlayerProceduralAnimator from '../../public/src/animation/player/procedural/player-procedural-animator.js'

const createPose = () => new PlayerProceduralRig().createWorkingPose()

describe('Player Procedural Modules', () => {
    it('clones rig data without sharing references', () => {
        const rig = new PlayerProceduralRig()
        const pose = rig.createWorkingPose()
        pose.torso.x = 10
        rig.commitPose(pose)

        const snapshot = rig.createWorkingPose()
        expect(snapshot.torso.x).to.equal(10)

        snapshot.torso.x = 99
        const secondSnapshot = rig.createWorkingPose()
        expect(secondSnapshot.torso.x).to.equal(10)
    })

    it('core posture reacts to velocity and breathing input', () => {
        const module = new CorePostureModule()
        const pose = createPose()
        const result = module.apply(0.016, pose, {
            velocity: { x: 180, y: 0 },
            maxSpeed: 240,
            facing: 1,
            normalizedTime: 0.25,
            isGrounded: true,
            pelvisOffset: 0,
            breathing: 1,
            fatigue: 0
        })

        expect(pose.torso.x).to.be.greaterThan(0)
        expect(pose.pelvis.y).to.not.equal(0)
        expect(result.rotation).to.be.above(0)
        expect(result.offsetX).to.be.above(0)
    })

    it('locomotion module advances stride phase when moving', () => {
        const module = new LocomotionModule()
        const pose = createPose()
        const outcome = module.apply(0.033, pose, {
            velocity: { x: 150, y: 0 },
            speed: 150,
            facing: 1,
            isGrounded: true
        })

        expect(outcome.moving).to.equal(true)
        expect(outcome.stridePhase).to.be.greaterThan(0)
        expect(pose.leftLeg.foot.y).to.be.below(21)
    })

    it('combat module produces distinct poses for attack and block', () => {
        const attackModule = new CombatModule()
        const attackPose = createPose()
        attackModule.apply(0.016, attackPose, {
            playerState: 'attacking',
            normalizedTime: 0.5,
            facing: 1,
            speed: 0,
            locomotion: { stridePhase: 0, moving: false }
        })
        expect(attackPose.rightArm.hand.y).to.be.below(-2)

        const blockModule = new CombatModule()
        const blockPose = createPose()
        const blockContext = {
            playerState: 'blocking',
            normalizedTime: 0,
            facing: 1,
            speed: 0,
            locomotion: { stridePhase: 0, moving: false }
        }
        for (let i = 0; i < 12; i += 1) {
            blockModule.apply(0.016, blockPose, blockContext)
        }
        expect(blockPose.rightArm.hand.x).to.be.above(0)
        expect(blockPose.rightArm.hand.y).to.be.below(-3)
    })
})

describe('PlayerProceduralAnimator', () => {
    it('merges module outputs into a coherent transform', () => {
        const animator = new PlayerProceduralAnimator()
        const context = {
            playerState: 'running',
            facing: 1,
            velocity: { x: 180, y: 0 },
            momentum: { x: 180, y: 0 },
            normalizedTime: 0.3,
            isGrounded: true,
            pelvisOffset: 1.5,
            breathing: 1,
            fatigue: 0.1,
            legLiftLeft: 0.3,
            legLiftRight: 0,
            groundOffset: 0,
            wind: 0.5,
            temperatureShiver: 0.2,
            clothSway: 0.4,
            hairBounce: 0.2,
            equipmentJiggle: 0.15,
            staminaRatio: 0.8,
            healthRatio: 0.9,
            attackStrength: 1,
            attackType: 'light',
            overlay: {
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                offsetX: 2,
                offsetY: 1
            }
        }

        let transform
        for (let frame = 0; frame < 12; frame += 1) {
            transform = animator.update(0.016, context)
        }

        expect(transform.rotation).to.be.greaterThan(0)
        expect(transform.offsetX).to.be.greaterThan(1.5)
        expect(transform.skeleton).to.have.property('leftLeg')
        expect(transform.secondaryMotion.cloth.length).to.be.greaterThan(1)
        expect(transform.environmental.wind).to.be.within(0.2, 0.5)
        expect(transform.debug.state).to.equal('running')
    })
})
