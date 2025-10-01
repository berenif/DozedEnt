/**
 * AnimatedPlayer - Refactored Thin Wrapper
 * 
 * Coordinates the modular player animation system:
 * - PlayerActionManager: WASM bridge for actions
 * - PlayerStateViewModel: State reading and derivation
 * - PlayerAnimationCoordinator: Animation composition
 * 
 * Does NOT handle:
 * - Rendering (use TopDownPlayerRenderer/PlayerRenderer)
 * - Direct WASM calls (delegated to modules)
 * - Complex state logic (delegated to modules)
 * 
 * This is a facade that provides backward compatibility while
 * following single-responsibility and modular design principles.
 */

import PlayerActionManager from '../manager/PlayerActionManager.js'
import PlayerStateViewModel from '../viewmodel/PlayerStateViewModel.js'
import PlayerAnimationCoordinator from '../coordinator/PlayerAnimationCoordinator.js'

export class AnimatedPlayer {
	constructor(x = 400, y = 300, options = {}) {
		// Position - managed by WASM, these are just initial values
		this.x = x
		this.y = y
		
		// Create modular components
		this.actionManager = new PlayerActionManager({
			wasmExports: options.wasmModule || globalThis.wasmExports,
			particleSystem: options.particleSystem || null,
			soundSystem: options.soundSystem || null
		})
		
		this.stateViewModel = new PlayerStateViewModel({
			wasmExports: options.wasmModule || globalThis.wasmExports,
			maxHealth: options.maxHealth || 100,
			maxStamina: options.maxStamina || 100
		})
		
		this.animationCoordinator = new PlayerAnimationCoordinator({
			proceduralOptions: options.proceduralOptions || options.proceduralConfig || options.proceduralModules || {},
			debugMode: options.debugMode || false
		})
		
		// Legacy properties for backward compatibility
		this.facing = 1
		this.state = 'idle'
		this.debugMode = options.debugMode || false
		
		// Optional WASM module injection support
		try {
			if (options.wasmModule && !globalThis.wasmExports) {
				globalThis.wasmExports = options.wasmModule
			}
		} catch (error) {
			// Ignore WASM module loading errors
		}
	}

	/**
	 * Main update loop - coordinates all modules
	 * @param {number} deltaTime - Frame time in seconds
	 * @param {Object} input - Input state
	 */
	update(deltaTime, input = {}) {
		// 1. Update action manager cooldowns
		this.actionManager.update(deltaTime)
		
		// 2. Forward inputs to WASM (if not managed externally)
		if (!globalThis.wasmInputManagedExternally) {
			this.actionManager.setPlayerInput(input)
		}
		
		// 3. Read state from WASM
		const playerState = this.stateViewModel.getPlayerState()
		const proceduralValues = this.stateViewModel.getProceduralValues()
		const overlay = this.stateViewModel.getAnimationOverlay()
		
		// 4. Update animation coordinator
		const transform = this.animationCoordinator.update(
			deltaTime,
			playerState,
			proceduralValues,
			overlay
		)
		
		// 5. Update legacy properties for backward compatibility
		this.x = playerState.x
		this.y = playerState.y
		this.facing = this.animationCoordinator.facing
		this.state = this.animationCoordinator.currentState
		this.currentTransform = transform
		
		// Store state for external access
		this._currentState = playerState
	}

	/**
	 * Get current player state (for external consumers)
	 * @returns {Object}
	 */
	getPlayerState() {
		return this.stateViewModel.getPlayerState()
	}

	/**
	 * Get current transform (for rendering)
	 * @returns {Object|null}
	 */
	getCurrentTransform() {
		return this.animationCoordinator.getCurrentTransform()
	}

	/**
	 * Get animation info (for debugging)
	 * @returns {Object}
	 */
	getAnimationInfo() {
		return this.animationCoordinator.getAnimationInfo()
	}

	// ===========================================
	// Action Methods (delegate to ActionManager)
	// ===========================================

	/**
	 * Start a roll/dodge action
	 * @param {Object} input - Current input state
	 * @returns {boolean}
	 */
	startRoll(input) {
		return this.actionManager.tryRoll(input, this.facing)
	}

	/**
	 * Start an attack action
	 * @param {string} type - 'light' or 'heavy'
	 * @returns {boolean}
	 */
	startAttack(type = 'light') {
		return this.actionManager.tryAttack(type)
	}

	/**
	 * Queue an attack (backward compatibility)
	 * @param {string} type - 'light' or 'heavy'
	 */
	queueAttack(type = 'light') {
		const stats = this.stateViewModel.getStats()
		if (this.canAttack()) {
			this.startAttack(type)
		}
	}

	/**
	 * Try to roll (backward compatibility)
	 * @param {Object} dir - Direction {x, y}
	 */
	tryRoll(dir = null) {
		const input = {}
		if (dir && (dir.x || dir.y)) {
			input.left = dir.x < -0.5
			input.right = dir.x > 0.5
			input.up = dir.y < -0.5
			input.down = dir.y > 0.5
		}
		this.startRoll(input)
	}

	/**
	 * Try to parry
	 * @returns {boolean}
	 */
	tryParry() {
		return this.actionManager.tryParry()
	}

	/**
	 * Start blocking
	 */
	startBlock() {
		return this.actionManager.startBlock(this.facing)
	}

	/**
	 * Stop blocking
	 */
	stopBlock() {
		this.actionManager.stopBlock(this.facing)
	}

	/**
	 * Try to jump
	 * @returns {boolean}
	 */
	jump() {
		return this.actionManager.tryJump()
	}

	// ===========================================
	// State Query Methods (delegate to ViewModel)
	// ===========================================

	/**
	 * Check if player can attack (client-side prediction)
	 * @returns {boolean}
	 */
	canAttack() {
		const stats = this.stateViewModel.getStats()
		return this.actionManager.canAttack(stats.stamina, this.state)
	}

	/**
	 * Check if player can roll (client-side prediction)
	 * @returns {boolean}
	 */
	canRoll() {
		const stats = this.stateViewModel.getStats()
		return this.actionManager.canRoll(stats.stamina, this.state)
	}

	/**
	 * Check if player can block (client-side prediction)
	 * @returns {boolean}
	 */
	canBlock() {
		const stats = this.stateViewModel.getStats()
		return this.actionManager.canBlock(stats.stamina, this.state)
	}

	/**
	 * Get normalized time for current action
	 * @returns {number}
	 */
	getNormalizedTime() {
		return this.stateViewModel.getNormalizedTime()
	}

	/**
	 * Set animation state (for backward compatibility)
	 * @param {string} newState
	 * @param {boolean} wasmDriven
	 */
	setState(newState, wasmDriven = false) {
		this.animationCoordinator.setState(newState)
		this.state = newState
	}

	/**
	 * Get animation state code (for WASM integration)
	 * @returns {number}
	 */
	getAnimationStateCode() {
		return this.stateViewModel.stateNameToNumber(this.state)
	}

	/**
	 * Enable/disable debug mode
	 * @param {boolean} enabled
	 */
	setDebugMode(enabled) {
		this.debugMode = enabled
		this.animationCoordinator.setDebugMode(enabled)
	}

	// ===========================================
	// Deprecated Methods (for backward compatibility)
	// ===========================================

	/**
	 * @deprecated Use TopDownPlayerRenderer.render() instead
	 * Rendering should be handled by dedicated renderer classes
	 */
	render(ctx, camera = null) {
		if (this.debugMode) {
			console.warn('[AnimatedPlayer] render() is deprecated. Use TopDownPlayerRenderer instead.')
		}
		// Fallback: draw a simple placeholder
		this.renderFallback(ctx, camera)
	}

	/**
	 * Simple fallback rendering for backward compatibility
	 * @private
	 */
	renderFallback(ctx, camera = null) {
		const camX = camera?.x || 0
		const camY = camera?.y || 0
		
		let screenX = 0
		let screenY = 0
		
		if (globalThis.gameRenderer && typeof globalThis.gameRenderer.wasmToWorld === 'function') {
			const pos = globalThis.gameRenderer.wasmToWorld(this.x || 0.5, this.y || 0.5)
			screenX = pos.x - camX
			screenY = pos.y - camY
		} else {
			const worldWidth = 800
			const worldHeight = 600
			screenX = (this.x || 0) * worldWidth - camX
			screenY = (this.y || 0) * worldHeight - camY
		}
		
		ctx.save()
		
		// Draw simple rectangle
		ctx.fillStyle = '#00ff88'
		const width = 32
		const height = 32
		ctx.fillRect(screenX - width / 2, screenY - height / 2, width, height)
		
		// Draw direction indicator
		ctx.fillStyle = '#ffffff'
		const dirX = this.facing > 0 ? 5 : -5
		ctx.fillRect(screenX + dirX, screenY - 2, 4, 4)
		
		ctx.restore()
	}

	/**
	 * Static helper to create input from keys (backward compatibility)
	 * @param {Object} keys - Key state object
	 * @returns {Object} - Input object
	 */
	static createInputFromKeys(keys) {
		return {
			// Movement
			left: keys.a || keys.arrowleft,
			right: keys.d || keys.arrowright,
			up: keys.w || keys.arrowup,
			down: keys.s || keys.arrowdown,
			
			// 5-Button Combat System
			lightAttack: keys.j || keys['1'],
			heavyAttack: keys.k || keys['2'],
			block: keys.shift || keys['3'],
			roll: keys.control || keys['4'],
			special: keys.l || keys['5'],
			
			// Legacy support
			attack: keys.j || keys[' '],
			jump: keys.space || keys.z
		}
	}

	/**
	 * Static helper to attach debug toggle
	 * @param {AnimatedPlayer} playerInstance
	 * @param {string} key
	 */
	static attachDebugToggle(playerInstance, key = 'F3') {
		if (!playerInstance || playerInstance.__debugToggleAttached) {
			return
		}
		
		const targetKey = (key || 'F3').toLowerCase()
		const handler = (e) => {
			const k = (e.key || '').toLowerCase()
			if (k === targetKey.toLowerCase()) {
				playerInstance.setDebugMode(!playerInstance.debugMode)
			}
		}
		
		try {
			addEventListener('keydown', handler)
			playerInstance.__debugToggleAttached = true
		} catch (error) {
			// Ignore debug handler attachment errors
		}
	}
}

export default AnimatedPlayer

