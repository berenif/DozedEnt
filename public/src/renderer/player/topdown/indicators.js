// Top-down HUD-like indicators and action arcs

export function drawDirectionIndicator(ctx, position, baseRadius, velocity, speed) {
	if (speed < 0.01) {
		return
	}
	ctx.save()
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
	const arrowLength = baseRadius * 0.4
	const arrowWidth = baseRadius * 0.15
	// Negate Y because canvas Y increases downward, but our world Y up is positive
	const angle = Math.atan2(-(velocity.y), velocity.x)
	ctx.translate(position.x, position.y)
	ctx.rotate(angle)
	ctx.beginPath()
	ctx.moveTo(arrowLength, 0)
	ctx.lineTo(-arrowLength + arrowWidth, -arrowWidth)
	ctx.lineTo(-arrowLength + arrowWidth, arrowWidth)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}

export function drawAttackIndicator(ctx, position, baseRadius, facing) {
	ctx.save()
	const attackRadius = baseRadius * 1.5
	const startAngle = facing > 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3
	const endAngle = facing > 0 ? Math.PI / 3 : Math.PI + Math.PI / 3
	ctx.strokeStyle = '#dc2626'
	ctx.lineWidth = 4
	ctx.beginPath()
	ctx.arc(position.x, position.y, attackRadius, startAngle, endAngle)
	ctx.stroke()
	ctx.fillStyle = '#f87171'
	for (let i = 0; i < 3; i += 1) {
		const t = i / 2
		const a = startAngle + (endAngle - startAngle) * t
		const x = position.x + Math.cos(a) * attackRadius
		const y = position.y + Math.sin(a) * attackRadius
		ctx.beginPath()
		ctx.arc(x, y, 3, 0, Math.PI * 2)
		ctx.fill()
	}
	ctx.restore()
}

export function drawBlockIndicator(ctx, position, baseRadius) {
	ctx.save()
	ctx.strokeStyle = '#5eead4'
	ctx.lineWidth = 3
	ctx.setLineDash([5, 5])
	ctx.beginPath()
	ctx.arc(position.x, position.y, baseRadius * 1.2, 0, Math.PI * 2)
	ctx.stroke()
	ctx.restore()
}

export function drawRollIndicator(ctx, position, baseRadius, velocity) {
	ctx.save()
	const speed = Math.hypot(velocity.x ?? 0, velocity.y ?? 0)
	if (speed > 0.01) {
		// Negate Y for canvas coordinate system
		const angle = Math.atan2(-(velocity.y ?? 0), velocity.x ?? 0)
		const lineLength = baseRadius * 0.8
		ctx.strokeStyle = '#a78bfa'
		ctx.lineWidth = 3
		ctx.setLineDash([3, 3])
		for (let i = 0; i < 3; i += 1) {
			const offset = (i - 1) * baseRadius * 0.3
			const startX = position.x + Math.cos(angle + Math.PI / 2) * offset
			const startY = position.y + Math.sin(angle + Math.PI / 2) * offset
			const endX = startX + Math.cos(angle) * lineLength
			const endY = startY + Math.sin(angle) * lineLength
			ctx.beginPath()
			ctx.moveTo(startX, startY)
			ctx.lineTo(endX, endY)
			ctx.stroke()
		}
	}
	ctx.restore()
}

export function drawStatusIndicators(ctx, position, baseRadius, state) {
	ctx.save()
	const healthRatio = state.hp ?? 1
	const healthAngle = healthRatio * Math.PI * 2
	ctx.strokeStyle = '#dc2626'
	ctx.lineWidth = 3
	ctx.beginPath()
	ctx.arc(position.x, position.y, baseRadius * 1.1, -Math.PI / 2, -Math.PI / 2 + healthAngle)
	ctx.stroke()

	const staminaRatio = state.stamina ?? 1
	const staminaAngle = staminaRatio * Math.PI * 2
	ctx.strokeStyle = '#3b82f6'
	ctx.lineWidth = 2
	ctx.beginPath()
	ctx.arc(position.x, position.y, baseRadius * 1.15, Math.PI / 2, Math.PI / 2 + staminaAngle)
	ctx.stroke()
	ctx.restore()
}

export function drawAttackTrail(ctx, position, trailPoints) {
	if (!Array.isArray(trailPoints) || trailPoints.length === 0) {
		return
	}
	ctx.save()
	for (const point of trailPoints) {
		const alpha = typeof point.alpha === 'number' ? Math.max(0, Math.min(1, point.alpha)) : 0.35
		ctx.fillStyle = `rgba(251, 113, 133, ${alpha})`
		ctx.beginPath()
		ctx.arc(position.x + point.x, position.y + point.y, 6, 0, Math.PI * 2)
		ctx.fill()
	}
	ctx.restore()
}
