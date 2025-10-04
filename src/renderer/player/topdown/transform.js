// Lightweight transform helpers for top-down skeletons

function rotatePoint(px, py, cx, cy, angle) {
    const dx = px - cx
    const dy = py - cy
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    return { x: cx + dx * ca - dy * sa, y: cy + dx * sa + dy * ca }
}

export function rotateSkeletonAround(skeleton, center, angle) {
    if (!skeleton) { return skeleton }
    const rotated = {}
    for (const [k, v] of Object.entries(skeleton)) {
        if (v && typeof v.x === 'number' && typeof v.y === 'number') {
            rotated[k] = rotatePoint(v.x, v.y, center.x, center.y, angle)
        } else if (v && typeof v === 'object') {
            const limb = {}
            for (const [lk, lp] of Object.entries(v)) {
                limb[lk] = rotatePoint(lp.x, lp.y, center.x, center.y, angle)
            }
            rotated[k] = limb
        } else {
            rotated[k] = v
        }
    }
    return rotated
}


