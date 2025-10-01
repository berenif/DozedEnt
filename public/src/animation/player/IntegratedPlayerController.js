/**
 * IntegratedPlayerController - Complete Player System Integration
 * 
 * Combines:
 * - Refactored modular player architecture (ActionManager, StateViewModel, AnimationCoordinator)
 * - AnimationEventSystem for action timing and feedback
 * - ComboSystem for fighting game mechanics
 * 
 * This demonstrates best practices for:
 * - Event-driven architecture
 * - Separation of concerns
 * - Integration of multiple systems
 * - Clean API design
 */

import { AnimatedPlayer } from './index.js'
import { AnimationEventSystem, AnimationEventPresets } from '../system/animation-events.js'
import { ComboSystem, ComboUIRenderer } from '../system/combo-system.js'

export class IntegratedPlayerController {
	constructor(x, y, options = {}) {
		// Create player with refactored architecture
		this.player = new AnimatedPlayer(x, y, {
			...options,
			debugMode: options.debugMode || false
		})
		
		// Create event system
		this.events = new AnimationEventSystem()
		
		// Create combat and movement event presets
		this.combatEvents = AnimationEventPresets.createCombatEvents(this.events)
		this.movementEvents = AnimationEventPresets.createMovementEvents(this.events)
		this.effectEvents = AnimationEventPresets.createEffectEvents(this.events)
		
		// Create combo system with callbacks
		this.comboSystem = new ComboSystem({
			comboWindow: options.comboWindow || 0.5,
			maxComboLength: options.maxComboLength || 5,
			onComboStart: this.handleComboStart.bind(this),
			onComboHit: this.handleComboHit.bind(this),
			onComboEnd: this.handleComboEnd.bind(this),
			onSpecialMove: this.handleSpecialMove.bind(this)
		})
		
		// Create combo UI renderer
		this.comboUI = new ComboUIRenderer(this.comboSystem)
		
		// Track previous state for state change events
		this.previousState = 'idle'
		
		// Setup event hooks
		this.setupEventHooks()
		
		// Setup combo event integration
		this.setupComboEvents()
		
		console.log('✅ IntegratedPlayerController initialized with events and combos')
	}

	/**
	 * Setup animation event hooks for attack/roll/block timing
	 */
	setupEventHooks() {
		// Attack events - hook into normalized time windows
		this.events.on('attack.windup', () => {
			if (this.player.debugMode) {
				console.log('🗡️ Attack windup phase')
			}
		})
		
		this.events.on('attack.active', () => {
			if (this.player.debugMode) {
				console.log('⚡ Attack active - hitbox enabled')
			}
			// Trigger actual damage check here
			this.checkAttackHit()
		})
		
		this.events.on('attack.recovery', () => {
			if (this.player.debugMode) {
				console.log('🔄 Attack recovery phase')
			}
		})
		
		// Roll/dodge events
		this.events.on('dodge.start', () => {
			if (this.player.debugMode) {
				console.log('💨 Dodge started')
			}
			this.effectEvents.particleSpawn('dust', this.getPosition())
		})
		
		this.events.on('dodge.iframes', () => {
			if (this.player.debugMode) {
				console.log('🛡️ I-frames active')
			}
		})
		
		this.events.on('dodge.end', () => {
			if (this.player.debugMode) {
				console.log('✅ Dodge complete')
			}
		})
		
		// Block events
		this.events.on('block.start', () => {
			if (this.player.debugMode) {
				console.log('🛡️ Block started')
			}
		})
		
		this.events.on('block.impact', (data) => {
			if (this.player.debugMode) {
				console.log('💥 Block impact:', data.damage)
			}
			this.effectEvents.screenShake(0.3)
		})
		
		this.events.on('parry.success', () => {
			if (this.player.debugMode) {
				console.log('✨ Perfect parry!')
			}
			this.effectEvents.screenShake(0.5)
			this.effectEvents.particleSpawn('sparkle', this.getPosition())
		})
		
		// Footstep events
		this.events.on('footstep', (data) => {
			if (this.player.debugMode) {
				console.log(`👣 Footstep: ${data.foot}`)
			}
			this.effectEvents.soundPlay('footstep')
			this.effectEvents.particleSpawn('dust_small', this.getPosition())
		})
		
		// State change events
		this.events.on('stateChange', (data) => {
			if (this.player.debugMode) {
				console.log(`🔄 State: ${data.fromState} → ${data.toState}`)
			}
		})
	}

	/**
	 * Setup combo system event integration
	 */
	setupComboEvents() {
		// Hook combo events into animation event system
		this.events.on('combo.window', () => {
			// Combo window is open - visual feedback
			if (this.player.debugMode) {
				console.log('⏰ Combo window open')
			}
		})
		
		this.events.on('combo.success', (data) => {
			if (this.player.debugMode) {
				console.log(`🎯 Combo! ${data.comboCount} hits`)
			}
			this.effectEvents.screenShake(0.2 * data.comboCount)
		})
		
		this.events.on('combo.break', () => {
			if (this.player.debugMode) {
				console.log('💔 Combo broken')
			}
		})
	}

	/**
	 * Main update loop - coordinates all systems
	 */
	update(deltaTime, input = {}) {
		// 1. Update player (handles input forwarding, WASM, animations)
		this.player.update(deltaTime, input)
		
		// 2. Get current state for event detection
		const currentState = this.player.state
		const normalizedTime = this.player.getNormalizedTime()
		
		// 3. Detect state changes and trigger events
		if (currentState !== this.previousState) {
			this.events.triggerStateEvents(this.previousState, currentState)
			this.handleStateChange(this.previousState, currentState)
			this.previousState = currentState
		}
		
		// 4. Trigger frame-based events based on normalized time
		this.triggerTimedEvents(currentState, normalizedTime)
		
		// 5. Update combo system (processes inputs, detects combos)
		const playerState = this.player.getPlayerState()
		this.comboSystem.setFacing(this.player.facing)
		this.comboSystem.setGrounded(playerState.grounded)
		this.comboSystem.setStamina(playerState.stamina)
		this.comboSystem.processInput(input, deltaTime)
		
		// 6. Update combo UI
		this.comboUI.update(deltaTime)
		
		// 7. Trigger footsteps at appropriate times
		if (currentState === 'running') {
			this.triggerFootsteps(normalizedTime)
		}
	}

	/**
	 * Trigger events based on action timing
	 */
	triggerTimedEvents(state, normalizedTime) {
		// Attack timing windows
		if (state === 'attacking') {
			if (normalizedTime >= 0.2 && normalizedTime < 0.3) {
				this.combatEvents.attackWindup()
			} else if (normalizedTime >= 0.5 && normalizedTime < 0.6) {
				this.combatEvents.attackActive()
			} else if (normalizedTime >= 0.8 && normalizedTime < 0.9) {
				this.combatEvents.attackRecovery()
			}
			
			// Combo window
			if (normalizedTime >= 0.55 && normalizedTime < 0.75) {
				this.events.emit('combo.window')
			}
		}
		
		// Roll I-frames
		if (state === 'rolling') {
			const params = this.player.actionManager.params.roll
			if (normalizedTime >= params.iFrameStart && normalizedTime <= params.iFrameEnd) {
				// I-frames are active (only emit once per roll)
				if (!this._iframesEmitted) {
					this.combatEvents.dodgeIFrames()
					this._iframesEmitted = true
				}
			}
		} else {
			this._iframesEmitted = false
		}
		
		// Block parry window
		if (state === 'blocking') {
			const params = this.player.actionManager.params.parry
			if (normalizedTime <= params.window) {
				// Parry window active
				if (!this._parryWindowEmitted) {
					this.combatEvents.parryWindow()
					this._parryWindowEmitted = true
				}
			}
		} else {
			this._parryWindowEmitted = false
		}
	}

	/**
	 * Trigger footstep events
	 */
	triggerFootsteps(normalizedTime) {
		// Trigger at 0.25 (left) and 0.75 (right) of run cycle
		const leftFoot = normalizedTime >= 0.24 && normalizedTime < 0.26
		const rightFoot = normalizedTime >= 0.74 && normalizedTime < 0.76
		
		if (leftFoot && !this._leftFootEmitted) {
			this.movementEvents.footstep('left')
			this._leftFootEmitted = true
			this._rightFootEmitted = false
		} else if (rightFoot && !this._rightFootEmitted) {
			this.movementEvents.footstep('right')
			this._rightFootEmitted = true
			this._leftFootEmitted = false
		}
	}

	/**
	 * Handle state changes
	 */
	handleStateChange(fromState, toState) {
		// Movement events
		if (toState === 'running' && fromState === 'idle') {
			const velocity = this.player.stateViewModel.getVelocity()
			const direction = Math.atan2(velocity.y, velocity.x)
			this.movementEvents.moveStart(direction)
		}
		
		if (toState === 'idle' && fromState === 'running') {
			this.movementEvents.moveStop()
		}
		
		// Combat events
		if (toState === 'rolling') {
			this.combatEvents.dodgeStart()
		}
		
		if (fromState === 'rolling') {
			this.combatEvents.dodgeEnd()
		}
		
		if (toState === 'blocking') {
			this.combatEvents.blockStart()
		}
		
		if (fromState === 'blocking') {
			this.combatEvents.blockRelease()
		}
	}

	/**
	 * Check for attack hits (integrate with your combat system)
	 */
	checkAttackHit() {
		// This would integrate with your enemy system
		// For now, just emit the event
		const hasHit = false // Replace with actual hit detection
		
		if (hasHit) {
			this.combatEvents.attackHit(null) // Pass target when available
		}
	}

	/**
	 * Combo system callbacks
	 */
	handleComboStart(data) {
		console.log('🎯 Combo started:', data.firstMove)
		this.events.emit('combo.start', data)
	}

	handleComboHit(data) {
		console.log(`💥 Combo hit! ${data.hits} hits, x${data.multiplier.toFixed(1)} multiplier`)
		this.events.emit('combo.hit', data)
		this.effectEvents.screenShake(0.1 * data.multiplier)
	}

	handleComboEnd(data) {
		console.log(`✨ Combo ended! ${data.hits} hits, max x${data.maxMultiplier.toFixed(1)}`)
		this.events.emit('combo.end', data)
	}

	handleSpecialMove(data) {
		console.log('⚡ Special move:', data.name)
		this.events.emit('specialMove', data)
		this.effectEvents.screenShake(0.5)
		this.effectEvents.screenFlash('#ffff00')
	}

	/**
	 * Render player and combo UI
	 */
	render(ctx, camera = null) {
		// Note: Player rendering should be done by TopDownPlayerRenderer
		// This is just for backward compatibility
		if (this.player.debugMode) {
			console.warn('[IntegratedPlayerController] Use TopDownPlayerRenderer for proper rendering')
		}
		
		// Render combo UI
		const canvasWidth = ctx.canvas.width
		this.comboUI.render(ctx, canvasWidth - 150, 50)
	}

	/**
	 * Render combo UI (separate method for clarity)
	 */
	renderComboUI(ctx) {
		const canvasWidth = ctx.canvas.width
		this.comboUI.render(ctx, canvasWidth - 150, 50)
	}

	/**
	 * Get current position (for effects)
	 */
	getPosition() {
		const state = this.player.getPlayerState()
		return { x: state.x, y: state.y }
	}

	/**
	 * Get player state (for external consumers)
	 */
	getPlayerState() {
		return this.player.getPlayerState()
	}

	/**
	 * Get combo meter for UI
	 */
	getComboMeter() {
		return this.comboSystem.getComboMeter()
	}

	/**
	 * Register custom combo
	 */
	registerCombo(name, sequence, properties) {
		this.comboSystem.registerCombo(name, sequence, properties)
	}

	/**
	 * Register custom event listener
	 */
	on(eventName, callback, context = null) {
		return this.events.on(eventName, callback, context)
	}

	/**
	 * Enable/disable debug mode
	 */
	setDebugMode(enabled) {
		this.player.setDebugMode(enabled)
	}

	/**
	 * Clean up
	 */
	destroy() {
		this.events.clear()
		this.comboSystem.reset()
	}
}

export default IntegratedPlayerController

