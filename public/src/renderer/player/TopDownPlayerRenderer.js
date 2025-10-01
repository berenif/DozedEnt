import { PlayerProceduralAnimator } from '../../animation/player/procedural/index.js'
import { PlayerPhysicsAnimator } from '../../animation/player/physics/index.js'
import { smoothRotate, setDefaultLineStyles } from './topdown/utils.js'
import { scaleSkeletonCoordinates } from './topdown/scale.js'
import { drawTopDownShadow } from './topdown/shadow.js'
import { drawTopDownSkeleton } from './topdown/skeleton.js'
import { drawPhysicsDebugOverlay } from './topdown/debug-overlay.js'
import { rotateSkeletonAround } from './topdown/transform.js'
import {
	drawDirectionIndicator,
	drawAttackIndicator,
	drawBlockIndicator,
	drawRollIndicator,
	drawStatusIndicators,
	drawAttackTrail
} from './topdown/indicators.js'

export default class TopDownPlayerRenderer {
    constructor(ctx, canvas, options = {}) {
        this.ctx = ctx
        this.canvas = canvas
        this.animMode = resolveAnimMode(options.mode)
        const physicsOverrides = readPhysicsOverridesFromUrl()
        const physicsOptions = { ...(options.physics || {}), ...physicsOverrides }
        this.animator = this.animMode === 'physics' ? new PlayerPhysicsAnimator(physicsOptions) : new PlayerProceduralAnimator(options.procedural || {})
        this.lastTime = (typeof performance !== 'undefined') ? performance.now() : 0
        this.currentRotation = 0
		this._loggedSuccess = false
        this._lastVelLog = 0
        // Debug flags - gate logging to avoid perf impact in production
        this.debugPhysics = physicsOverrides.debug === true
        this.debugLogging = options.debugLogging || false
		// Track previous world position to derive reliable direction
		this._prevWorldX = undefined
		this._prevWorldY = undefined
    }

	updateAndGetTransform(deltaTime, playerState) {
		// Keep rig authored facing along +X; canvas rotation handles world direction
		const facing = 1
		const velocity = { x: playerState.vx ?? 0, y: playerState.vy ?? 0 }
		// Derive direction from world position deltas to avoid sign mismatches
		const worldX = playerState.x ?? 0
		const worldY = playerState.y ?? 0
		const dx = (typeof this._prevWorldX === 'number') ? (worldX - this._prevWorldX) : 0
		const dy = (typeof this._prevWorldY === 'number') ? (worldY - this._prevWorldY) : 0
		this._prevWorldX = worldX
		this._prevWorldY = worldY
		const dirMag = Math.hypot(dx, dy)
		// Store renderVelocity on instance for use in render()
		this._renderVelocity = dirMag > 0.00005 ? { x: dx, y: dy } : velocity
		const speed = Math.hypot(this._renderVelocity.x, this._renderVelocity.y)
		const context = {
			playerState: typeof playerState.anim === 'string' ? playerState.anim : 'idle',
			facing,
			velocity,
			speed,
			momentum: velocity,
			maxSpeed: 0.3,
			isGrounded: playerState.grounded ?? true,
			staminaRatio: playerState.stamina ?? 1,
			healthRatio: playerState.hp ?? 1,
			attackType: playerState.attackType || 'light',
			attackStrength: playerState.attackStrength ?? 1,
			overlay: { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 },
			normalizedTime: (typeof performance !== 'undefined' ? (performance.now() / 1000) : 0) % 1000
		}

		// Debug logging - gated behind debugLogging flag
		if (this.debugLogging && (!this._lastVelLog || (typeof performance !== 'undefined' && performance.now() - this._lastVelLog > 1000))) {
			if (speed > 0.01) {
				console.log('[PlayerRenderer] Movement:', { vx: velocity.x.toFixed(3), vy: velocity.y.toFixed(3), speed: speed.toFixed(3) })
				console.log('[PlayerRenderer] Player state:', {
					x: playerState.x?.toFixed(3),
					y: playerState.y?.toFixed(3),
					grounded: playerState.grounded,
					anim: playerState.anim
				})
			}
			this._lastVelLog = typeof performance !== 'undefined' ? performance.now() : 0
		}

		return this.animator.update(deltaTime, context)
	}

	render(playerState, toCanvas, baseRadius) {
		const now = (typeof performance !== 'undefined') ? performance.now() : 0
		const dt = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000))
		this.lastTime = now

		const transform = this.updateAndGetTransform(dt, playerState)
		const pos = toCanvas(playerState.x, playerState.y)

		if (!transform || !transform.skeleton) {
			if (this.debugLogging) {
				console.warn('[PlayerRenderer] No skeleton data in transform:', transform)
			}
			this.ctx.fillStyle = '#ff0000'
			this.ctx.beginPath()
			this.ctx.arc(pos.x, pos.y, baseRadius, 0, Math.PI * 2)
			this.ctx.fill()
			return
		}

		if (!this._loggedSuccess && this.debugLogging) {
			console.log('[PlayerRenderer] ✅ Rendering with top-down view')
			this._loggedSuccess = true
		}

		const ctx = this.ctx
		const velocity = { x: playerState.vx ?? 0, y: playerState.vy ?? 0 }
		const speed = Math.hypot(velocity.x, velocity.y)

		// Global line style hygiene
		setDefaultLineStyles(ctx)

		// Draw shadow below everything
		drawTopDownShadow(ctx, pos, baseRadius, velocity)

		// Scale the skeleton to base radius
		const scale = baseRadius / 15
		const scaledSkeleton = scaleSkeletonCoordinates(transform.skeleton, scale)

		// For true top-down view: NO skeleton rotation - character always faces same direction
		// Movement direction is shown through limb animation; yaw used only for z-sorting
		const renderVelocity = this._renderVelocity || { x: 0, y: 0 }
		const renderSpeed = Math.hypot(renderVelocity.x, renderVelocity.y)
		const yawTarget = renderSpeed > 0.0001 ? Math.atan2(-(renderVelocity.y || 0), (renderVelocity.x || 0)) : (this.currentRotation || 0)
		const yaw = this.currentRotation = smoothRotate(this.currentRotation || 0, yawTarget, dt, 10)

		ctx.save()
		// No rotation applied - skeleton stays in fixed top-down orientation

		// Draw the human-like top-down skeleton and body
		drawTopDownSkeleton(ctx, playerState, pos, baseRadius, scaledSkeleton, yaw)

		// Optional physics debug overlay
		if (this.debugPhysics && transform && transform.debug) {
			try {
				drawPhysicsDebugOverlay(ctx, pos, baseRadius, scaledSkeleton, transform.debug)
			} catch (e) {
				if (this.debugLogging) {
					console.warn('[PlayerRenderer] Debug overlay failed:', e && e.message)
				}
			}
		}

		ctx.restore()

		// Direction + action indicators (outside rotated context)
		drawDirectionIndicator(ctx, pos, baseRadius, renderVelocity)
		if (playerState.anim === 'attacking') {
			// Indicators follow rotation; keep facing positive X baseline
			drawAttackIndicator(ctx, pos, baseRadius, 1)
		}
		if (playerState.anim === 'blocking') {
			drawBlockIndicator(ctx, pos, baseRadius)
		}
		if (playerState.anim === 'rolling') {
			drawRollIndicator(ctx, pos, baseRadius, velocity)
		}
		drawStatusIndicators(ctx, pos, baseRadius, playerState)

		// Attack trail if provided by modules
		const attackTrail = (transform && transform.environmental && transform.environmental.attackTrail) || (transform && transform.combat && transform.combat.attackTrail) || null
		if (attackTrail) {
			drawAttackTrail(ctx, pos, attackTrail)
		}
	}
}

function resolveAnimMode(explicitMode) {
    if (explicitMode === 'physics' || explicitMode === 'procedural') {return explicitMode}
    try {
        const params = (typeof window !== 'undefined' && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null
        const urlMode = params ? params.get('playerAnim') : null
        if (urlMode === 'physics' || urlMode === 'procedural') {return urlMode}
    } catch (_e) {}
    if (typeof window !== 'undefined' && window.DOZEDENT_PLAYER_ANIM_MODE === 'physics') {return 'physics'}
    return 'procedural'
}

function readPhysicsOverridesFromUrl() {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) { return {} }
        const params = new URLSearchParams(window.location.search)
        const override = {}
        const kp = parseFloat(params.get('physKp'))
        const kd = parseFloat(params.get('physKd'))
        const sub = parseInt(params.get('physSub'), 10)
        const dt = parseFloat(params.get('physDt') || params.get('fixedDt'))
        if (Number.isFinite(kp)) { override.kp = kp }
        if (Number.isFinite(kd)) { override.kd = kd }
        if (Number.isFinite(sub)) { override.substeps = Math.max(1, Math.min(sub, 8)) }
        if (Number.isFinite(dt)) { override.fixedDt = Math.max(1 / 240, Math.min(dt, 1 / 30)) }
        const debug = params.get('physDebug')
        if (debug === '1' || debug === 'true') { override.debug = true }
        return override
    } catch (_e) {
        return {}
    }
}
