/**
 * PlayerActionManager - Business Logic Layer
 * 
 * Responsible for:
 * - WASM bridge calls for player actions (roll, attack, block, parry, jump)
 * - Action validation and cooldown checks
 * - Audio/visual effect triggers (non-gameplay)
 * - Input to WASM forwarding
 * 
 * Does NOT handle:
 * - Rendering/drawing
 * - Animation state management
 * - Transform calculations
 */

export class PlayerActionManager {
	constructor(options = {}) {
		this.wasmExports = options.wasmExports || globalThis.wasmExports
		this.particleSystem = options.particleSystem || null
		this.soundSystem = options.soundSystem || null
		
		// Cooldown tracking (client-side prediction only)
		this.attackCooldown = 0
		this.rollCooldown = 0
		this.blockHeld = false
		
		// Action parameters (for client-side validation)
		this.params = {
			roll: {
				duration: 0.4,
				iFrameStart: 0.08,
				iFrameEnd: 0.36,
				staminaCost: 25,
				cooldown: 0.8
			},
			attackLight: {
				duration: 0.4,
				activeStart: 0.28,
				activeEnd: 0.38,
				staminaCost: 12,
				cooldown: 0.5
			},
			attackHeavy: {
				duration: 0.62,
				activeStart: 0.32,
				activeEnd: 0.48,
				staminaCost: 24,
				cooldown: 0.8
			},
			parry: {
				duration: 0.22,
				window: 0.18,
				staminaCost: 10
			}
		}
	}

	/**
	 * Update cooldown timers
	 * @param {number} deltaTime - Frame time in seconds
	 */
	update(deltaTime) {
		this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime)
		this.rollCooldown = Math.max(0, this.rollCooldown - deltaTime)
	}

	/**
	 * Forward player input to WASM
	 * @param {Object} input - Input state {left, right, up, down, roll, jump, lightAttack, heavyAttack, block, special}
	 */
	setPlayerInput(input) {
		let inputX = 0
		let inputY = 0
		if (input.left) {
			inputX -= 1
		}
		if (input.right) {
			inputX += 1
		}
		if (input.up) {
			inputY -= 1
		}
		if (input.down) {
			inputY += 1
		}

		// Forward to WASM - 5-button combat system
		this.wasmExports?.set_player_input?.(
			inputX,
			inputY,
			input.roll ? 1 : 0,
			input.jump ? 1 : 0,
			input.lightAttack ? 1 : 0,
			input.heavyAttack ? 1 : 0,
			input.block ? 1 : 0,
			input.special ? 1 : 0
		)
	}

	/**
	 * Attempt to start a roll/dodge action
	 * @param {Object} input - Current input state
	 * @param {number} facing - Current facing direction
	 * @returns {boolean} - True if roll started successfully
	 */
	tryRoll(input, facing) {
		// Trigger WASM roll action
		if (!this.wasmExports?.on_roll_start?.()) {
			// WASM determined roll could not start (e.g., stamina, cooldown)
			return false
		}

		// Determine roll direction for local effects
		let dirX = 0
		let dirY = 0

		if (input.left) {
			dirX -= 1
		}
		if (input.right) {
			dirX += 1
		}
		if (input.up) {
			dirY -= 1
		}
		if (input.down) {
			dirY += 1
		}

		// If no direction input, roll in facing direction
		if (dirX === 0 && dirY === 0) {
			dirX = facing
		}

		// Normalize direction
		const length = Math.hypot(dirX, dirY)
		if (length > 0) {
			dirX /= length
			dirY /= length
		}

		// Visual and audio effects only - core logic handled by WASM
		this.createRollEffects(dirX, dirY)
		
		return true
	}

	/**
	 * Attempt to start an attack action
	 * @param {string} type - Attack type: 'light' or 'heavy'
	 * @returns {boolean} - True if attack started successfully
	 */
	tryAttack(type = 'light') {
		// Trigger WASM attack action
		if (!this.wasmExports?.on_attack?.(type === 'heavy' ? 1 : 0)) {
			// WASM determined attack could not start (e.g., stamina, cooldown)
			return false
		}

		// Play attack sound (non-gameplay)
		if (this.soundSystem) {
			this.soundSystem.play('attack')
		}

		return true
	}

	/**
	 * Attempt to execute a parry
	 * @returns {boolean} - True if parry started successfully
	 */
	tryParry() {
		// Parry logic is handled in WASM
		if (!this.wasmExports?.on_parry?.()) {
			return false
		}

		// Optional SFX
		if (this.soundSystem) {
			this.soundSystem.play('parry')
		}

		return true
	}

	/**
	 * Start blocking
	 * @param {number} facing - Current facing direction
	 */
	startBlock(facing) {
		// Trigger WASM block action
		if (!this.wasmExports?.set_blocking?.(1, facing, 0)) {
			return false
		}

		this.blockHeld = true

		// Create block effect (non-gameplay)
		if (this.particleSystem) {
			this.particleSystem.createShieldEffect?.(0, 0) // Position will be handled by renderer
		}

		// Play block sound
		if (this.soundSystem) {
			this.soundSystem.play('block')
		}

		return true
	}

	/**
	 * Stop blocking
	 * @param {number} facing - Current facing direction
	 */
	stopBlock(facing) {
		this.wasmExports?.set_blocking?.(0, facing, 0)
		this.blockHeld = false
	}

	/**
	 * Attempt to jump
	 * @returns {boolean} - True if jump started successfully
	 */
	tryJump() {
		// WASM handles jump logic
		if (!this.wasmExports?.on_jump?.()) {
			return false
		}

		// Create jump effects (non-gameplay)
		if (this.particleSystem) {
			this.particleSystem.createDustCloud?.(0, 0) // Position will be handled by renderer
		}

		if (this.soundSystem) {
			this.soundSystem.play('jump')
		}

		return true
	}

	/**
	 * Client-side validation for attack availability (for UI feedback)
	 * @param {number} stamina - Current stamina value
	 * @param {string} state - Current player state
	 * @returns {boolean}
	 */
	canAttack(stamina, state) {
		const minCost = Math.min(this.params.attackLight.staminaCost, this.params.attackHeavy.staminaCost)
		return (
			this.attackCooldown <= 0 &&
			stamina >= minCost &&
			state !== 'dead' &&
			state !== 'rolling' &&
			state !== 'hurt'
		)
	}

	/**
	 * Client-side validation for roll availability (for UI feedback)
	 * @param {number} stamina - Current stamina value
	 * @param {string} state - Current player state
	 * @returns {boolean}
	 */
	canRoll(stamina, state) {
		return (
			this.rollCooldown <= 0 &&
			stamina >= this.params.roll.staminaCost &&
			state !== 'dead' &&
			state !== 'attacking' &&
			state !== 'hurt'
		)
	}

	/**
	 * Client-side validation for block availability (for UI feedback)
	 * @param {number} stamina - Current stamina value
	 * @param {string} state - Current player state
	 * @returns {boolean}
	 */
	canBlock(stamina, state) {
		return (
			stamina > 0 &&
			state !== 'dead' &&
			state !== 'rolling' &&
			state !== 'attacking' &&
			state !== 'hurt'
		)
	}

	/**
	 * Create roll visual/audio effects (non-gameplay)
	 * @private
	 */
	createRollEffects(_dirX, _dirY) {
		if (this.particleSystem) {
			this.particleSystem.createDustCloud?.(0, 0) // Position handled by renderer
		}

		if (this.soundSystem) {
			this.soundSystem.play('roll')
		}
	}
}

export default PlayerActionManager

