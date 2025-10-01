/**
 * Integrated Player Example
 * 
 * Demonstrates:
 * - New modular player architecture
 * - Animation event hooks
 * - Combo system integration
 * - Proper separation of rendering
 */

import { IntegratedPlayerController } from '../animation/player/IntegratedPlayerController.js'
import PlayerRenderer from '../renderer/PlayerRenderer.js'
import { createWasmApi } from './wasm-api.js'

export class IntegratedPlayerExample {
	constructor(canvas) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d')
		
		// State
		this.wasmApi = null
		this.playerController = null
		this.renderer = null
		this.keys = {}
		this.initialized = false
		this.lastTime = performance.now()
		
		// Camera
		this.camera = { x: 0, y: 0 }
		
		// World dimensions (for coordinate transformation)
		this.worldWidth = 800
		this.worldHeight = 600
		
		console.log('🎮 Integrated Player Example initializing...')
	}

	/**
	 * Initialize WASM and player systems
	 */
	async init() {
		try {
			// 1. Load WASM
			console.log('📦 Loading WASM...')
			this.wasmApi = await createWasmApi()
			console.log('✅ WASM loaded:', this.wasmApi.loaderInfo)
			
			// 2. Create integrated player controller with events and combos
			console.log('🎯 Creating integrated player controller...')
			this.playerController = new IntegratedPlayerController(0.5, 0.5, {
				maxHealth: 100,
				maxStamina: 100,
				debugMode: true,
				wasmModule: this.wasmApi.exports,
				comboWindow: 0.6,
				maxComboLength: 8
			})
			
			// 3. Create renderer
			console.log('🎨 Creating renderer...')
			this.renderer = new PlayerRenderer(this.ctx, this.canvas, {
				mode: 'physics', // or 'procedural'
				debugLogging: false // Set to true for detailed logs
			})
			
			// 4. Setup input handling
			this.setupInput()
			
			// 5. Setup custom event listeners
			this.setupCustomEvents()
			
			// 6. Register custom combos
			this.registerCustomCombos()
			
			this.initialized = true
			console.log('✅ Integrated Player Example initialized!')
			
			// Start game loop
			this.gameLoop()
		} catch (error) {
			console.error('❌ Initialization failed:', error)
		}
	}

	/**
	 * Setup input handling
	 */
	setupInput() {
		// Keyboard input
		window.addEventListener('keydown', (e) => {
			this.keys[e.key.toLowerCase()] = true
			
			// F3 for debug toggle
			if (e.key === 'F3') {
				e.preventDefault()
				const debugMode = !this.playerController.player.debugMode
				this.playerController.setDebugMode(debugMode)
				console.log(`🔧 Debug mode: ${debugMode}`)
			}
		})
		
		window.addEventListener('keyup', (e) => {
			this.keys[e.key.toLowerCase()] = false
		})
		
		console.log('⌨️ Input system ready')
		console.log('Controls:')
		console.log('  WASD - Move')
		console.log('  J/1 - Light Attack')
		console.log('  K/2 - Heavy Attack')
		console.log('  Shift/3 - Block/Parry')
		console.log('  Ctrl/4 - Roll/Dodge')
		console.log('  L/5 - Special Move')
		console.log('  F3 - Toggle Debug Mode')
	}

	/**
	 * Setup custom event listeners for feedback
	 */
	setupCustomEvents() {
		// Listen to combo events
		this.playerController.on('combo.start', (data) => {
			console.log('🎯 COMBO START:', data)
		})
		
		this.playerController.on('combo.hit', (data) => {
			console.log(`💥 COMBO HIT: ${data.hits} hits, x${data.multiplier.toFixed(1)} (${data.damage} damage)`)
		})
		
		this.playerController.on('combo.end', (data) => {
			console.log(`✨ COMBO END: ${data.hits} hits, max x${data.maxMultiplier.toFixed(1)}`)
		})
		
		this.playerController.on('specialMove', (data) => {
			console.log('⚡ SPECIAL MOVE:', data.name)
		})
		
		// Listen to parry events
		this.playerController.on('parry.success', () => {
			console.log('✨ PERFECT PARRY!')
		})
		
		// Listen to footstep events
		let footstepCount = 0
		this.playerController.on('footstep', (data) => {
			footstepCount++
			if (footstepCount % 10 === 0) {
				console.log(`👣 Footsteps: ${footstepCount}`)
			}
		})
	}

	/**
	 * Register custom combos
	 */
	registerCustomCombos() {
		// Custom 3-hit combo
		this.playerController.registerCombo('tripleStrike', ['light', 'light', 'light'], {
			damage: 45,
			knockback: 8,
			animation: 'combo_triple',
			cancelWindow: [0.4, 0.6]
		})
		
		// Custom launcher combo
		this.playerController.registerCombo('skyBreaker', ['heavy', 'light', 'heavy'], {
			damage: 65,
			knockback: 20,
			launchHeight: 30,
			animation: 'combo_launcher',
			cancelWindow: [0.3, 0.5]
		})
		
		console.log('🎯 Custom combos registered')
	}

	/**
	 * Main game loop
	 */
	gameLoop() {
		if (!this.initialized) {
			return
		}
		
		const now = performance.now()
		const deltaTime = Math.min(0.1, (now - this.lastTime) / 1000)
		this.lastTime = now
		
		// Update
		this.update(deltaTime)
		
		// Render
		this.render()
		
		// Continue loop
		requestAnimationFrame(() => this.gameLoop())
	}

	/**
	 * Update game state
	 */
	update(deltaTime) {
		// Convert key state to input
		const input = {
			// Movement
			left: this.keys['a'] || this.keys['arrowleft'],
			right: this.keys['d'] || this.keys['arrowright'],
			up: this.keys['w'] || this.keys['arrowup'],
			down: this.keys['s'] || this.keys['arrowdown'],
			
			// Combat (5-button system)
			lightAttack: this.keys['j'] || this.keys['1'],
			heavyAttack: this.keys['k'] || this.keys['2'],
			block: this.keys['shift'] || this.keys['3'],
			roll: this.keys['control'] || this.keys['4'],
			special: this.keys['l'] || this.keys['5'],
			
			// Legacy
			jump: this.keys[' '] || this.keys['z']
		}
		
		// Update integrated player controller
		// This handles: input → WASM → state → animation → events → combos
		this.playerController.update(deltaTime, input)
		
		// Update WASM (if using separate WASM api)
		if (this.wasmApi && this.wasmApi.update) {
			// Note: Player controller already forwards inputs to WASM
			// Only call this if you need additional WASM updates
			// this.wasmApi.update(deltaTime)
		}
		
		// Update camera (simple follow)
		const playerState = this.playerController.getPlayerState()
		this.camera.x = playerState.x * this.worldWidth - this.canvas.width / 2
		this.camera.y = playerState.y * this.worldHeight - this.canvas.height / 2
	}

	/**
	 * Render game
	 */
	render() {
		// Clear canvas
		this.ctx.fillStyle = '#1a1a2e'
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
		
		// Get player state
		const playerState = this.playerController.getPlayerState()
		
		// Coordinate transformation function
		const toCanvas = (normalizedX, normalizedY) => {
			const worldX = normalizedX * this.worldWidth
			const worldY = normalizedY * this.worldHeight
			return {
				x: worldX - this.camera.x,
				y: worldY - this.camera.y
			}
		}
		
		// Render player using dedicated renderer
		this.renderer.render(playerState, toCanvas, 20) // 20 = base radius
		
		// Render combo UI (overlaid on top)
		this.playerController.renderComboUI(this.ctx)
		
		// Render debug info
		this.renderDebugInfo(playerState)
	}

	/**
	 * Render debug information
	 */
	renderDebugInfo(playerState) {
		this.ctx.save()
		this.ctx.fillStyle = '#ffffff'
		this.ctx.font = '12px monospace'
		
		let y = 20
		const lineHeight = 16
		
		const info = [
			`FPS: ${Math.round(1 / ((performance.now() - this.lastTime) / 1000 || 0.016))}`,
			`State: ${playerState.anim}`,
			`Position: (${playerState.x.toFixed(2)}, ${playerState.y.toFixed(2)})`,
			`Velocity: (${playerState.vx.toFixed(2)}, ${playerState.vy.toFixed(2)})`,
			`HP: ${Math.round(playerState.hp)}/${Math.round(playerState.hp / playerState.healthRatio)}`,
			`Stamina: ${Math.round(playerState.stamina)}/${Math.round(playerState.stamina / playerState.staminaRatio)}`,
			`Grounded: ${playerState.grounded}`,
			``,
			`Combo System:`,
			`  Hits: ${this.playerController.comboSystem.totalHits}`,
			`  Multiplier: x${this.playerController.comboSystem.comboMultiplier.toFixed(1)}`,
			`  Active: ${this.playerController.comboSystem.isInCombo}`,
			`  Current: ${this.playerController.comboSystem.getCurrentComboString() || 'none'}`,
			``,
			`Press F3 for detailed debug logs`
		]
		
		info.forEach(line => {
			this.ctx.fillText(line, 10, y)
			y += lineHeight
		})
		
		this.ctx.restore()
	}

	/**
	 * Resize canvas
	 */
	resize() {
		this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight
	}
}

// Auto-initialize when loaded as main script
if (typeof window !== 'undefined') {
	window.addEventListener('DOMContentLoaded', () => {
		const canvas = document.getElementById('gameCanvas')
		if (canvas) {
			const example = new IntegratedPlayerExample(canvas)
			
			// Handle resize
			window.addEventListener('resize', () => example.resize())
			example.resize()
			
			// Start
			example.init()
			
			// Expose to window for debugging
			window.integratedExample = example
		}
	})
}

export default IntegratedPlayerExample

