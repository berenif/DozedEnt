// Drawing the player from a top-down perspective using a human-like skeleton

import { getBodyColorForState, lightenColor } from './utils.js'

export function drawTopDownSkeleton(ctx, state, position, baseRadius, skeleton) {
	// 1) Legs first (under torso)
	drawLegs(ctx, position, baseRadius, skeleton)

	// 2) Torso/body core (oriented by outer rotation transform)
	const torsoRadius = baseRadius * 0.6
	const bodyColor = getBodyColorForState(state)
	const torsoGradient = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, torsoRadius)
	torsoGradient.addColorStop(0, lightenColor(bodyColor, 0.3))
	torsoGradient.addColorStop(1, bodyColor)
	ctx.fillStyle = torsoGradient
	ctx.beginPath()
	ctx.arc(position.x, position.y, torsoRadius, 0, Math.PI * 2)
	ctx.fill()
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
	ctx.lineWidth = 2
	ctx.stroke()

	// Forward-facing arc wedge when moving (front = +X in rotated space)
	const speed = Math.hypot(state.vx ?? 0, state.vy ?? 0)
	if (speed > 0.03) {
		ctx.save()
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
		ctx.lineWidth = 2
		ctx.beginPath()
		const wedge = Math.PI / 6 // ~30 degrees
		ctx.arc(position.x, position.y, torsoRadius * 1.02, -wedge, wedge)
		ctx.stroke()
		ctx.restore()
	}

	// 3) Clavicles subtle line connecting shoulders to chest
	ctx.save()
	ctx.strokeStyle = 'rgba(123, 163, 197, 0.85)'
	ctx.lineWidth = 3
	ctx.beginPath()
	ctx.moveTo(position.x + skeleton.clavicleL.x, position.y + skeleton.clavicleL.y)
	ctx.lineTo(position.x + skeleton.chest.x, position.y + skeleton.chest.y)
	ctx.lineTo(position.x + skeleton.clavicleR.x, position.y + skeleton.clavicleR.y)
	ctx.stroke()
	ctx.restore()

	// 4) Neck line from chest to neck joint (subtle)
	ctx.save()
	ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)'
	ctx.lineWidth = 2.5
	ctx.lineCap = 'round'
	ctx.beginPath()
	ctx.moveTo(position.x + skeleton.chest.x, position.y + skeleton.chest.y)
	ctx.lineTo(position.x + skeleton.neck.x, position.y + skeleton.neck.y)
	ctx.stroke()
	ctx.restore()

	// 5) Arms on top of torso
	drawArms(ctx, position, baseRadius, skeleton, state)

	// 6) Head placed forward in facing direction (outer rotation already applied)
	const headRadius = baseRadius * 0.25
	const headOffset = baseRadius * 0.3
	const headX = position.x + headOffset
	const headY = position.y
	const hurt = state.anim === 'hurt'
	ctx.fillStyle = hurt ? '#fecaca' : '#dbeafe'
	ctx.beginPath()
	ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
	ctx.fill()
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
	ctx.lineWidth = 1.5
	ctx.stroke()

	// 7) Subtle forward-facing chevron to reinforce orientation
	ctx.save()
	ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)'
	ctx.lineWidth = 2
	ctx.lineCap = 'round'
	// Chevron drawn inside the head, apex pointing forward (+x in rotated space)
	const cSize = headRadius * 0.8
	ctx.beginPath()
	ctx.moveTo(headX + headRadius * 0.2, headY - cSize * 0.4)
	ctx.lineTo(headX + headRadius * 0.6, headY)
	ctx.lineTo(headX + headRadius * 0.2, headY + cSize * 0.4)
	ctx.stroke()
	ctx.restore()
}

function drawArms(ctx, position, baseRadius, s, state) {
	const isBlocking = state.anim === 'blocking'
	const isAttacking = state.anim === 'attacking'
	const armColor = isBlocking ? '#7ba3c5' : (isAttacking ? '#f87171' : '#5f8fb4')

	ctx.save()
	ctx.strokeStyle = armColor
	ctx.lineCap = 'round'

	// Helper to draw a single arm
	const drawArm = (arm) => {
		ctx.lineWidth = 5
		ctx.beginPath()
		ctx.moveTo(position.x + arm.shoulder.x, position.y + arm.shoulder.y)
		ctx.lineTo(position.x + arm.elbow.x, position.y + arm.elbow.y)
		ctx.stroke()
		ctx.lineWidth = 4
		ctx.beginPath()
		ctx.moveTo(position.x + arm.elbow.x, position.y + arm.elbow.y)
		ctx.lineTo(position.x + (arm.wrist?.x ?? arm.hand.x), position.y + (arm.wrist?.y ?? arm.hand.y))
		ctx.stroke()
		// Hand
		ctx.fillStyle = isAttacking ? '#f87171' : '#bfdbfe'
		ctx.beginPath()
		ctx.arc(position.x + arm.hand.x, position.y + arm.hand.y, 3, 0, Math.PI * 2)
		ctx.fill()
	}

	drawArm(s.leftArm)
	drawArm(s.rightArm)
	ctx.restore()
}

function drawLegs(ctx, position, baseRadius, s) {
	const legColor = '#475569'
	const footColor = '#334155'

	ctx.save()
	ctx.strokeStyle = legColor
	ctx.lineCap = 'round'

	const drawLeg = (leg) => {
		ctx.lineWidth = 6
		ctx.beginPath()
		ctx.moveTo(position.x + leg.hip.x, position.y + leg.hip.y)
		ctx.lineTo(position.x + leg.knee.x, position.y + leg.knee.y)
		ctx.stroke()
		ctx.lineWidth = 5
		ctx.beginPath()
		ctx.moveTo(position.x + leg.knee.x, position.y + leg.knee.y)
		ctx.lineTo(position.x + leg.ankle.x, position.y + leg.ankle.y)
		ctx.stroke()
		// Foot: ankle→foot→toe
		ctx.strokeStyle = footColor
		ctx.lineWidth = 4
		ctx.beginPath()
		ctx.moveTo(position.x + leg.ankle.x, position.y + leg.ankle.y)
		ctx.lineTo(position.x + leg.foot.x, position.y + leg.foot.y)
		ctx.lineTo(position.x + leg.toe.x, position.y + leg.toe.y)
		ctx.stroke()
		// Toe marker
		ctx.beginPath()
		ctx.arc(position.x + leg.toe.x, position.y + leg.toe.y, 3, 0, Math.PI * 2)
		ctx.fillStyle = footColor
		ctx.fill()
		// Reset stroke color for next leg
		ctx.strokeStyle = legColor
	}

	drawLeg(s.leftLeg)
	drawLeg(s.rightLeg)
	ctx.restore()
}
