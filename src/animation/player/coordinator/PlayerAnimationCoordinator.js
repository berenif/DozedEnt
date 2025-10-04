/**
 * PlayerAnimationCoordinator - Animation Composition Layer
 * 
 * Responsible for:
 * - Composing CharacterAnimator + ProceduralAnimator
 * - Providing unified transform output for rendering
 * - Managing animation state transitions
 * - Coordinating between animation systems
 * 
 * Does NOT handle:
 * - Game logic or state mutations
 * - Direct rendering
 * - Input processing
 * - WASM calls (reads state only)
 */

import { CharacterAnimator, AnimationPresets } from '../../system/animation-system.js'
import PlayerProceduralAnimator from '../procedural/player-procedural-animator.js'

export class PlayerAnimationCoordinator {
	constructor(options = {}) {
		// Animation systems
		this.characterAnimator = new CharacterAnimator()
		this.animations = AnimationPresets.createPlayerAnimations()
		this.setupAnimations()
		
		// Procedural animator
		const proceduralOptions = options.proceduralOptions || options.proceduralConfig || options.proceduralModules || {}
		this.proceduralAnimator = new PlayerProceduralAnimator(proceduralOptions)
		
		// State
		this.currentState = 'idle'
		this.previousState = 'idle'
		this.facing = 1 // 1 for right, -1 for left
		
		// Transform cache
		this.currentTransform = null
		
		// Debug
		this.debugMode = options.debugMode || false
	}

	/**
	 * Setup character animations
	 * @private
	 */
	setupAnimations() {
		// Add all animations to the controller
		Object.entries(this.animations).forEach(([name, animation]) => {
			this.characterAnimator.addAnimation(name, animation)
		})
		
		// Start with idle animation
		this.characterAnimator.play('idle')
	}

	/**
	 * Set animation state
	 * @param {string} stateName - Animation state name (e.g., 'idle', 'running')
	 */
	setState(stateName) {
		if (this.currentState === stateName) {
			return
		}
		
		this.previousState = this.currentState
		this.currentState = stateName
		
		// Update CharacterAnimator
		const stateCode = this.stateNameToNumber(stateName)
		this.characterAnimator.setAnimState(stateCode)
	}

	/**
	 * Set facing direction
	 * @param {number} facing - 1 for right, -1 for left
	 */
	setFacing(facing) {
		this.facing = facing
		
		if (this.characterAnimator && typeof this.characterAnimator.setFacing === 'function') {
			this.characterAnimator.setFacing(facing >= 0 ? 'right' : 'left')
		}
	}

	/**
	 * Update animation systems and return composed transform
	 * @param {number} deltaTime - Frame time in seconds
	 * @param {Object} playerState - Current player state from ViewModel
	 * @param {Object} proceduralValues - Procedural animation values from ViewModel
	 * @param {Object} overlay - Animation overlay from WASM
	 * @returns {Object} - Composed transform for rendering
	 */
	update(deltaTime, playerState, proceduralValues, overlay) {
		// Update state and facing
		this.setState(playerState.anim)
		this.setFacing(this.getFacingFromVelocity(playerState.vx, playerState.vy))
		
		// Scale animation speed based on movement velocity
		this.updateAnimationSpeed(playerState)
		
		// Update CharacterAnimator
		const baseTransform = this.characterAnimator.update(
			deltaTime,
			{ x: playerState.x, y: playerState.y },
			{ x: playerState.vx, y: playerState.vy },
			playerState.grounded
		) || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 }
		
		// Prepare procedural context
		const proceduralContext = {
			playerState: playerState.anim,
			facing: this.facing,
			velocity: { x: playerState.vx, y: playerState.vy },
			momentum: { x: proceduralValues.momentumX, y: proceduralValues.momentumY },
			normalizedTime: playerState.normalizedTime,
			isGrounded: playerState.grounded,
			pelvisOffset: overlay.pelvisY,
			breathing: proceduralValues.breathing,
			fatigue: proceduralValues.fatigue,
			legLiftLeft: proceduralValues.legLiftLeft,
			legLiftRight: proceduralValues.legLiftRight,
			groundOffset: proceduralValues.groundAdapt,
			wind: proceduralValues.windResponse,
			temperatureShiver: proceduralValues.temperatureShiver,
			clothSway: proceduralValues.clothSway,
			hairBounce: proceduralValues.hairBounce,
			equipmentJiggle: proceduralValues.equipmentJiggle,
			staminaRatio: playerState.staminaRatio,
			healthRatio: playerState.healthRatio,
			attackStrength: 1, // Could be derived from state
			attackType: 'light', // Could be derived from state
			inputState: {}, // Not used in coordinator
			maxSpeed: 0.3, // Normalized max speed
			stridePhase: 0, // Managed internally by procedural animator
			overlay: overlay
		}
		
		// Update ProceduralAnimator
		const proceduralTransform = this.proceduralAnimator.update(deltaTime, proceduralContext)
		
		// Compose transforms
		this.currentTransform = {
			scaleX: baseTransform.scaleX * (proceduralTransform.scaleX ?? 1),
			scaleY: baseTransform.scaleY * (proceduralTransform.scaleY ?? 1),
			rotation: baseTransform.rotation + (proceduralTransform.rotation ?? 0),
			offsetX: baseTransform.offsetX + (proceduralTransform.offsetX ?? 0),
			offsetY: baseTransform.offsetY + (proceduralTransform.offsetY ?? 0),
			trails: baseTransform.trails || [],
			skeleton: proceduralTransform.skeleton,
			secondaryMotion: proceduralTransform.secondaryMotion,
			environmental: proceduralTransform.environmental,
			debug: proceduralTransform.debug,
			combat: proceduralTransform.combat
		}
		
		return this.currentTransform
	}

	/**
	 * Get current transform (cached from last update)
	 * @returns {Object|null}
	 */
	getCurrentTransform() {
		return this.currentTransform
	}

	/**
	 * Update animation playback speed based on movement
	 * @private
	 */
	updateAnimationSpeed(playerState) {
		if (!this.characterAnimator || !this.characterAnimator.controller) {
			return
		}
		
		// Scale running animation speed with velocity
		if (this.currentState === 'running') {
			const maxSpeedNorm = 0.3
			const velMag = Math.hypot(playerState.vx, playerState.vy)
			const speedRatio = Math.max(0, Math.min(1, maxSpeedNorm > 0 ? velMag / maxSpeedNorm : 0))
			this.characterAnimator.controller.setSpeed(0.9 + 1.2 * speedRatio)
		} else {
			this.characterAnimator.controller.setSpeed(1)
		}
	}

	/**
	 * Derive facing direction from velocity
	 * @private
	 */
	getFacingFromVelocity(vx, vy) {
		const speed = Math.hypot(vx, vy)
		if (speed > 0.001) {
			return vx >= 0 ? 1 : -1
		}
		return this.facing // Preserve current facing when not moving
	}

	/**
	 * Convert state name to numeric code for CharacterAnimator
	 * @private
	 */
	stateNameToNumber(stateName) {
		const codes = {
			idle: 0,
			running: 1,
			attacking: 2,
			blocking: 3,
			rolling: 4,
			hurt: 5,
			dead: 6,
			jumping: 7,
			doubleJumping: 8,
			landing: 9,
			wallSliding: 10,
			dashing: 11,
			chargingAttack: 12
		}
		return codes[stateName] ?? 0
	}

	/**
	 * Get current animation info for debugging
	 * @returns {Object}
	 */
	getAnimationInfo() {
		return {
			state: this.currentState,
			previousState: this.previousState,
			facing: this.facing,
			animation: this.characterAnimator.controller.currentAnimation?.name,
			frame: this.characterAnimator.controller.getCurrentFrame(),
			proceduralData: this.currentTransform?.debug || null,
			skeletalData: this.currentTransform?.skeleton || null,
			secondaryMotion: this.currentTransform?.secondaryMotion || null,
			environmental: this.currentTransform?.environmental || null
		}
	}

	/**
	 * Enable/disable debug mode
	 * @param {boolean} enabled
	 */
	setDebugMode(enabled) {
		this.debugMode = enabled
	}
}

export default PlayerAnimationCoordinator

