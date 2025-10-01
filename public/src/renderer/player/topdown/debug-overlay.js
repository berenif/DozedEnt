// Lightweight physics debug overlay for top-down player

function drawPoint(ctx, x, y, r, fill, stroke) {
    ctx.save()
    if (stroke) { ctx.strokeStyle = stroke }
    if (fill) { ctx.fillStyle = fill }
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    if (fill) { ctx.fill() }
    if (stroke) { ctx.stroke() }
    ctx.restore()
}

function drawCross(ctx, x, y, size, color) {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - size, y)
    ctx.lineTo(x + size, y)
    ctx.moveTo(x, y - size)
    ctx.lineTo(x, y + size)
    ctx.stroke()
    ctx.restore()
}

function forEachJoint(skeleton, callback) {
    for (const [key, value] of Object.entries(skeleton)) {
        if (!value) { continue }
        if (typeof value.x === 'number' && typeof value.y === 'number') {
            callback(key, value)
        } else if (typeof value === 'object') {
            for (const [subKey, subVal] of Object.entries(value)) {
                if (subVal && typeof subVal.x === 'number' && typeof subVal.y === 'number') {
                    callback(`${key}.${subKey}`, subVal)
                }
            }
        }
    }
}

export function drawPhysicsDebugOverlay(ctx, position, baseRadius, skeleton, debug) {
    // Draw joint markers
    ctx.save()
    const jointFill = 'rgba(59, 130, 246, 0.35)'
    const jointStroke = 'rgba(59, 130, 246, 0.7)'
    const jointRadius = Math.max(2, Math.min(4, baseRadius * 0.12))
    forEachJoint(skeleton, (_key, pt) => {
        const x = position.x + pt.x
        const y = position.y + pt.y
        drawPoint(ctx, x, y, jointRadius, jointFill, jointStroke)
    })
    ctx.restore()

    // Foot contact markers (highlighted)
    const leftFoot = skeleton?.leftLeg?.foot
    const rightFoot = skeleton?.rightLeg?.foot
    if (leftFoot || rightFoot) {
        const contactLeft = !!(debug && debug.contacts && debug.contacts.left)
        const contactRight = !!(debug && debug.contacts && debug.contacts.right)
        if (leftFoot) {
            drawPoint(
                ctx,
                position.x + leftFoot.x,
                position.y + leftFoot.y,
                Math.max(3, baseRadius * 0.14),
                contactLeft ? 'rgba(16, 185, 129, 0.85)' : 'rgba(245, 158, 11, 0.85)',
                'rgba(0,0,0,0.25)'
            )
        }
        if (rightFoot) {
            drawPoint(
                ctx,
                position.x + rightFoot.x,
                position.y + rightFoot.y,
                Math.max(3, baseRadius * 0.14),
                contactRight ? 'rgba(16, 185, 129, 0.85)' : 'rgba(245, 158, 11, 0.85)',
                'rgba(0,0,0,0.25)'
            )
        }
    }

    // PD targets and ground line (scaled from solver space)
    const scale = baseRadius / 15
    if (debug && debug.targets) {
        const tLeft = debug.targets.left
        const tRight = debug.targets.right
        if (tLeft && typeof tLeft.x === 'number' && typeof tLeft.y === 'number') {
            drawCross(
                ctx,
                position.x + tLeft.x * scale,
                position.y + tLeft.y * scale,
                Math.max(4, baseRadius * 0.18),
                'rgba(244, 63, 94, 0.9)'
            )
        }
        if (tRight && typeof tRight.x === 'number' && typeof tRight.y === 'number') {
            drawCross(
                ctx,
                position.x + tRight.x * scale,
                position.y + tRight.y * scale,
                Math.max(4, baseRadius * 0.18),
                'rgba(244, 63, 94, 0.9)'
            )
        }
    }

    if (debug && typeof debug.groundY === 'number') {
        const gy = position.y + debug.groundY * scale
        ctx.save()
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(position.x - baseRadius * 2, gy)
        ctx.lineTo(position.x + baseRadius * 2, gy)
        ctx.stroke()
        ctx.restore()
    }
}


