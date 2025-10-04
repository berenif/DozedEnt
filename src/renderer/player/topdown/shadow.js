// Top-down shadow rendering

export function drawTopDownShadow(ctx, position, baseRadius, velocity = { x: 0, y: 0 }) {
    const v = velocity || { x: 0, y: 0 }
    const offX = Math.max(-8, Math.min(8, (v.x || 0) * 0.06 * baseRadius * 0.1))
    const offY = Math.max(-6, Math.min(6, (v.y || 0) * 0.04 * baseRadius * 0.1))
    ctx.save()
    ctx.globalAlpha = 0.25
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    ctx.beginPath()
    ctx.ellipse(position.x + offX, position.y + baseRadius * 0.8 + offY, baseRadius * 0.7, baseRadius * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}
