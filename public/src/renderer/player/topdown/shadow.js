// Top-down shadow rendering

export function drawTopDownShadow(ctx, position, baseRadius) {
	ctx.save()
	ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
	ctx.beginPath()
	ctx.ellipse(position.x + 2, position.y + 2, baseRadius * 0.6, baseRadius * 0.3, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()
}
