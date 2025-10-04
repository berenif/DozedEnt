/**
 * PlayerStateViewModel - UI/Render State Derivation Layer
 * 
 * Responsible for:
 * - Reading WASM state exports
 * - Deriving UI/render state (hp/stamina ratios, anim state names)
 * - Providing cached state snapshots for rendering
 * - State name/code conversions
 * 
 * Does NOT handle:
 * - Game logic or state mutations
 * - Rendering/drawing
 * - Input processing
 */

export class PlayerStateViewModel {
	constructor(options = {}) {
		this.wasmExports = options.wasmExports || globalThis.wasmExports
		
		// Cached state for rendering
		this._cachedHealth = 100
		this._cachedStamina = 100
		this.maxHealth = options.maxHealth || 100
		this.maxStamina = options.maxStamina || 100
		
		// Animation state mapping
		this.animCodes = Object.freeze({
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
		})
		
		this.animNames = Object.freeze(
			Object.fromEntries(
				Object.entries(this.animCodes).map(([name, code]) => [code, name])
			)
		)
	}

	/**
	 * Get current player position from WASM (normalized 0-1 coordinates)
	 * @returns {{x: number, y: number}}
	 */
	getPosition() {
		const rx = this.wasmExports?.get_x?.()
		const ry = this.wasmExports?.get_y?.()
		
		// Guard against NaN/Infinity
		const x = (typeof rx === 'number' && Number.isFinite(rx)) ? rx : 0.5
		const y = (typeof ry === 'number' && Number.isFinite(ry)) ? ry : 0.5
		
		return { x, y }
	}

	/**
	 * Get current player velocity from WASM
	 * @returns {{x: number, y: number}}
	 */
	getVelocity() {
		const fx = this.wasmExports?.get_vel_x?.()
		const fy = this.wasmExports?.get_vel_y?.()
		
		const vx = (typeof fx === 'number' && Number.isFinite(fx)) ? fx : 0
		const vy = (typeof fy === 'number' && Number.isFinite(fy)) ? fy : 0
		
		return { x: vx, y: vy }
	}

	/**
	 * Get current facing direction from velocity
	 * @param {number} currentFacing - Current facing direction (1 or -1)
	 * @returns {number} - Facing direction (1 for right, -1 for left)
	 */
	getFacing(currentFacing = 1) {
		const velocity = this.getVelocity()
		const speed = Math.hypot(velocity.x, velocity.y)
		
		// Only update facing when moving significantly
		if (speed > 0.001) {
			return velocity.x >= 0 ? 1 : -1
		}
		
		return currentFacing
	}

	/**
	 * Get current animation state name from WASM
	 * @returns {string} - Animation state name (e.g., 'idle', 'running', 'attacking')
	 */
	getAnimationStateName() {
		const wasmAnimState = this.wasmExports?.get_player_anim_state?.()
		
		if (typeof wasmAnimState === 'number') {
			return this.animNames[wasmAnimState] || 'idle'
		}
		
		return 'idle'
	}

	/**
	 * Convert animation state name to numeric code
	 * @param {string} stateName - Animation state name
	 * @returns {number} - Animation state code
	 */
	stateNameToNumber(stateName) {
		return this.animCodes[stateName] ?? 0
	}

	/**
	 * Get current health and stamina from WASM
	 * @returns {{health: number, stamina: number, healthRatio: number, staminaRatio: number}}
	 */
	getStats() {
		const currentHealth = this.wasmExports?.get_hp?.() ?? this.wasmExports?.get_health?.() ?? this._cachedHealth
		const currentStamina = this.wasmExports?.get_stamina?.() ?? this._cachedStamina
		
		// Cache for next frame if WASM unavailable
		this._cachedHealth = currentHealth
		this._cachedStamina = currentStamina
		
		return {
			health: currentHealth,
			stamina: currentStamina,
			healthRatio: this.maxHealth ? currentHealth / this.maxHealth : 1,
			staminaRatio: this.maxStamina ? currentStamina / this.maxStamina : 1
		}
	}

	/**
	 * Get grounded state from WASM
	 * @returns {boolean}
	 */
	isGrounded() {
		return (this.wasmExports?.get_is_grounded?.() === 1)
	}

	/**
	 * Get rolling state from WASM
	 * @returns {boolean}
	 */
	isRolling() {
		return (this.wasmExports?.get_is_rolling?.() === 1)
	}

	/**
	 * Get blocking state from WASM
	 * @returns {boolean}
	 */
	isBlocking() {
		return (this.wasmExports?.get_block_state?.() === 1)
	}

	/**
	 * Get invulnerability state from WASM
	 * @returns {boolean}
	 */
	isInvulnerable() {
		return (this.wasmExports?.get_is_invulnerable?.() === 1)
	}

	/**
	 * Get jump count from WASM
	 * @returns {number}
	 */
	getJumpCount() {
		return this.wasmExports?.get_jump_count?.() ?? 0
	}

	/**
	 * Get normalized time for current action/animation (0-1 progress)
	 * @returns {number} - Progress through current action (0-1)
	 */
	getNormalizedTime() {
		try {
			// If WASM provides an explicit attack state machine, derive normalized phase
			const get = (fn) => (typeof this.wasmExports?.[fn] === 'function') ? this.wasmExports[fn]() : undefined
			const attackState = get('get_attack_state') // 0 Idle, 1 Windup, 2 Active, 3 Recovery
			const stateStartTime = get('get_attack_state_time')
			const now = get('get_time_seconds')
			
			if (typeof attackState === 'number' && typeof stateStartTime === 'number' && typeof now === 'number') {
				const elapsed = Math.max(0, now - stateStartTime)
				let duration = 0
				
				if (attackState === 1) {
					duration = get('get_attack_windup_sec') ?? 0.4
				} else if (attackState === 2) {
					duration = get('get_attack_active_sec') ?? 0.4
				} else if (attackState === 3) {
					duration = get('get_attack_recovery_sec') ?? 0.4
				}
				
				if (duration && duration > 0) {
					return Math.max(0, Math.min(1, elapsed / duration))
				}
			}

			// Rolling phase if available
			const isRolling = get('get_is_rolling')
			if (isRolling === 1) {
				const rollDur = get('get_roll_duration') || 0.4
				const playerStateTimer = get('get_player_state_timer')
				if (typeof playerStateTimer === 'number' && rollDur > 0) {
					return Math.max(0, Math.min(1, playerStateTimer / rollDur))
				}
			}

			// Generic state timer normalization
			const playerStateTimer = get('get_player_state_timer')
			if (typeof playerStateTimer === 'number') {
				// Default duration for generic states
				return Math.max(0, Math.min(1, playerStateTimer / 0.4))
			}
		} catch (error) {
			// Fallback on error
		}

		return 0
	}

	/**
	 * Get complete player state snapshot for rendering
	 * @returns {Object} - Complete player state
	 */
	getPlayerState() {
		const pos = this.getPosition()
		const vel = this.getVelocity()
		const stats = this.getStats()
		const anim = this.getAnimationStateName()
		
		return {
			x: pos.x,
			y: pos.y,
			vx: vel.x,
			vy: vel.y,
			anim,
			hp: stats.health,
			stamina: stats.stamina,
			healthRatio: stats.healthRatio,
			staminaRatio: stats.staminaRatio,
			grounded: this.isGrounded(),
			rolling: this.isRolling(),
			blocking: this.isBlocking(),
			invulnerable: this.isInvulnerable(),
			jumpCount: this.getJumpCount(),
			normalizedTime: this.getNormalizedTime()
		}
	}

	/**
	 * Get WASM animation overlay values for procedural animation
	 * @returns {Object} - Animation overlay values
	 */
	getAnimationOverlay() {
		const wx = (this.wasmExports?.get_anim_offset_x?.() ?? 0)
		const wy = (this.wasmExports?.get_anim_offset_y?.() ?? 0)
		const wsx = (this.wasmExports?.get_anim_scale_x?.() ?? 1)
		const wsy = (this.wasmExports?.get_anim_scale_y?.() ?? 1)
		const wrot = (this.wasmExports?.get_anim_rotation?.() ?? 0)
		const wpelvis = (this.wasmExports?.get_anim_pelvis_y?.() ?? 0)
		
		return {
			offsetX: wx,
			offsetY: wy,
			scaleX: wsx,
			scaleY: wsy,
			rotation: wrot,
			pelvisY: wpelvis
		}
	}

	/**
	 * Get WASM procedural animation values
	 * @returns {Object} - Procedural animation parameters
	 */
	getProceduralValues() {
		const legLiftLeft = this.wasmExports?.get_anim_leg_lift_left?.() ?? 0
		const legLiftRight = this.wasmExports?.get_anim_leg_lift_right?.() ?? 0
		const breathing = this.wasmExports?.get_anim_breathing_intensity?.() ?? 1
		const fatigue = this.wasmExports?.get_anim_fatigue_factor?.() ?? 0
		const windResponse = this.wasmExports?.get_anim_wind_response?.() ?? 0
		const groundAdapt = this.wasmExports?.get_anim_ground_adapt?.() ?? 0
		const temperatureShiver = this.wasmExports?.get_anim_temperature_shiver?.() ?? 0
		const clothSway = this.wasmExports?.get_anim_cloth_sway?.() ?? 0
		const hairBounce = this.wasmExports?.get_anim_hair_bounce?.() ?? 0
		const equipmentJiggle = this.wasmExports?.get_anim_equipment_jiggle?.() ?? 0
		
		const vel = this.getVelocity()
		const momentumX = this.wasmExports?.get_anim_momentum_x?.() ?? vel.x
		const momentumY = this.wasmExports?.get_anim_momentum_y?.() ?? vel.y
		
		return {
			legLiftLeft,
			legLiftRight,
			breathing,
			fatigue,
			windResponse,
			groundAdapt,
			temperatureShiver,
			clothSway,
			hairBounce,
			equipmentJiggle,
			momentumX,
			momentumY
		}
	}
}

export default PlayerStateViewModel

