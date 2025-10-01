import { PlayerProceduralAnimator } from '../../animation/player/procedural/index.js'
import { smoothRotate } from './topdown/utils.js'
import { scaleSkeletonCoordinates } from './topdown/scale.js'
import { drawTopDownShadow } from './topdown/shadow.js'
import { drawTopDownSkeleton } from './topdown/skeleton.js'
import {
	drawDirectionIndicator,
	drawAttackIndicator,
	drawBlockIndicator,
	drawRollIndicator,
	drawStatusIndicators,
	drawAttackTrail
} from './topdown/indicators.js'

export default class TopDownPlayerRenderer {
	constructor(ctx, canvas) {
		this.ctx = ctx
		this.canvas = canvas
		this.animator = new PlayerProceduralAnimator()
		this.lastTime = (typeof performance !== 'undefined') ? performance.now() : 0
		this.currentRotation = 0
		this._loggedSuccess = false
		this._lastVelLog = 0
	}

	updateAndGetTransform(deltaTime, playerState) {
		const facing = (playerState.vx ?? 0) < 0 ? -1 : 1
		const velocity = { x: playerState.vx ?? 0, y: playerState.vy ?? 0 }
		const speed = Math.hypot(velocity.x, velocity.y)
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

		if (!this._lastVelLog || (typeof performance !== 'undefined' && performance.now() - this._lastVelLog > 1000)) {
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
			console.warn('[PlayerRenderer] No skeleton data in transform:', transform)
			this.ctx.fillStyle = '#ff0000'
			this.ctx.beginPath()
			this.ctx.arc(pos.x, pos.y, baseRadius, 0, Math.PI * 2)
			this.ctx.fill()
			return
		}

		if (!this._loggedSuccess) {
			console.log('[PlayerRenderer] ✅ Rendering with top-down view')
			this._loggedSuccess = true
		}

		const ctx = this.ctx
		const velocity = { x: playerState.vx ?? 0, y: playerState.vy ?? 0 }
		const speed = Math.hypot(velocity.x, velocity.y)

		// Draw shadow below everything
		drawTopDownShadow(ctx, pos, baseRadius)

		// Scale the skeleton to base radius
		const scale = baseRadius / 15
		const scaledSkeleton = scaleSkeletonCoordinates(transform.skeleton, scale)

		// Calculate and apply smooth rotation based on movement direction
		let targetRotation = 0
		if (speed > 0.01) {
			targetRotation = Math.atan2(velocity.y, velocity.x)
		} else {
			targetRotation = (playerState.vx ?? 0) < 0 ? Math.PI : 0
		}
		this.currentRotation = smoothRotate(this.currentRotation, targetRotation, 0.1)

		ctx.save()
		ctx.translate(pos.x, pos.y)
		ctx.rotate(this.currentRotation)
		ctx.translate(-pos.x, -pos.y)

		// Draw the human-like top-down skeleton and body
		drawTopDownSkeleton(ctx, playerState, pos, baseRadius, scaledSkeleton)

		ctx.restore()

		// Direction + action indicators (outside rotated context)
		drawDirectionIndicator(ctx, pos, baseRadius, velocity, speed)
		if (playerState.anim === 'attacking') {
			const facing = (playerState.vx ?? 0) < 0 ? -1 : 1
			drawAttackIndicator(ctx, pos, baseRadius, facing)
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
