// Top-down HUD-like indicators and action arcs
import { setScreenSpaceStroke } from './utils.js'

let SHAPES = null

function buildShapes() {
	// Normalized unit shapes (scale by baseRadius at draw time)
	const arrow = new Path2D()
	{
		const len = 0.4
		const w = 0.15
		arrow.moveTo(len, 0)
		arrow.lineTo(-len + w, -w)
		arrow.lineTo(-len + w, w)
		arrow.closePath()
	}

	const attackArc = new Path2D()
	{
		const r = 1.5
		attackArc.arc(0, 0, r, -Math.PI / 3, Math.PI / 3)
	}

	const blockRing = new Path2D()
	{
		const r = 1.2
		blockRing.arc(0, 0, r, 0, Math.PI * 2)
	}

	const rollLine = new Path2D()
	{
		rollLine.moveTo(0, 0)
		rollLine.lineTo(0.8, 0)
	}

	return { arrow, attackArc, blockRing, rollLine }
}

function getShapes() {
	if (!SHAPES) { SHAPES = buildShapes() }
	return SHAPES
}

export function drawDirectionIndicator(ctx, position, baseRadius, velocity) {
    const speed = Math.hypot(velocity?.x || 0, velocity?.y || 0)
    if (speed < 0.01) {
		return
	}
    const { arrow } = getShapes()
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    // Negate Y because canvas Y increases downward, but our world Y up is positive
    const angle = Math.atan2(-(velocity.y), velocity.x)
    ctx.translate(position.x, position.y)
    ctx.rotate(angle)
    ctx.scale(baseRadius, baseRadius)
    ctx.fill(arrow)
    ctx.restore()
}

export function drawAttackIndicator(ctx, position, baseRadius, facing) {
    const { attackArc } = getShapes()
    ctx.save()
    ctx.translate(position.x, position.y)
    // Mirror by rotating PI when facing left
    ctx.rotate(facing > 0 ? 0 : Math.PI)
    ctx.scale(baseRadius, baseRadius)
    ctx.strokeStyle = '#dc2626'
    setScreenSpaceStroke(ctx, 4)
    ctx.stroke(attackArc)
    // Blips along arc (computed in world space for simplicity)
    ctx.restore()
    const r = baseRadius * 1.5
    const startAngle = facing > 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3
    const endAngle = facing > 0 ? Math.PI / 3 : Math.PI + Math.PI / 3
    ctx.save()
    ctx.fillStyle = '#f87171'
    for (let i = 0; i < 3; i += 1) {
        const t = i / 2
        const a = startAngle + (endAngle - startAngle) * t
        const x = position.x + Math.cos(a) * r
        const y = position.y + Math.sin(a) * r
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.restore()
}

export function drawBlockIndicator(ctx, position, baseRadius) {
    const { blockRing } = getShapes()
    ctx.save()
    ctx.translate(position.x, position.y)
    ctx.scale(baseRadius, baseRadius)
    ctx.strokeStyle = '#5eead4'
    // Keep dashes in screen space
    const a = (typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1) || 1
    ctx.setLineDash([5 / a, 5 / a])
    setScreenSpaceStroke(ctx, 3)
    ctx.stroke(blockRing)
    ctx.restore()
}

export function drawRollIndicator(ctx, position, baseRadius, velocity) {
    const speed = Math.hypot(velocity.x ?? 0, velocity.y ?? 0)
    if (speed <= 0.01) { return }
    const { rollLine } = getShapes()
    const angle = Math.atan2(-(velocity.y ?? 0), velocity.x ?? 0)
    ctx.save()
    ctx.translate(position.x, position.y)
    ctx.rotate(angle)
    ctx.strokeStyle = '#a78bfa'
    const a = (typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1) || 1
    ctx.setLineDash([3 / a, 3 / a])
    for (let i = 0; i < 3; i += 1) {
        ctx.save()
        const offset = (i - 1) * baseRadius * 0.3
        ctx.translate(0, offset)
        ctx.scale(baseRadius, baseRadius)
        setScreenSpaceStroke(ctx, 3)
        ctx.stroke(rollLine)
        ctx.restore()
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
