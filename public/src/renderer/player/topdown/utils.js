// Utility functions for colors and math used by the top-down player renderer

export function getBodyColorForState(state) {
	const isHurt = state.anim === 'hurt'
	const isBlocking = state.anim === 'blocking'
	const isAttacking = state.anim === 'attacking'
	const isRolling = state.anim === 'rolling'

	if (isHurt) {
		return '#f87171'
	}
	if (isBlocking) {
		return '#5eead4'
	}
	if (isAttacking) {
		return '#fbbf24'
	}
	if (isRolling) {
		return '#a78bfa'
	}
	return '#60a5fa'
}

export function lightenColor(hex, amount) {
	// Accepts hex "#RRGGBB" and returns rgb() string
	const clean = (hex || '').replace('#', '')
	if (clean.length !== 6) {
		return hex || '#60a5fa'
	}
	const r = Math.min(255, parseInt(clean.substring(0, 2), 16) + Math.floor(255 * amount))
	const g = Math.min(255, parseInt(clean.substring(2, 4), 16) + Math.floor(255 * amount))
	const b = Math.min(255, parseInt(clean.substring(4, 6), 16) + Math.floor(255 * amount))
	return `rgb(${r}, ${g}, ${b})`
}

// Time-based angular smoothing (frame-rate independent)
export function smoothRotate(current, target, dt, speed = 10) {
    const TAU = Math.PI * 2
    let diff = ((target - current + Math.PI) % TAU) - Math.PI
    const t = Math.min(1, Math.max(0, (speed || 0) * (dt || 0)))
    return current + diff * t
}

// Maintain stroke width in screen pixels regardless of current transform scale
export function setScreenSpaceStroke(ctx, strokePx) {
    const t = typeof ctx.getTransform === 'function' ? ctx.getTransform() : { a: 1 }
    const scaleX = (t && typeof t.a === 'number' && isFinite(t.a)) ? t.a : 1
    const px = (typeof strokePx === 'number' && isFinite(strokePx)) ? strokePx : 1
    ctx.lineWidth = px / (scaleX || 1)
}

// Apply consistent, clean line styles once
export function setDefaultLineStyles(ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
}

// Color helpers
export function withAlpha(color, alpha) {
    const a = Math.max(0, Math.min(1, Number(alpha)))
    if (typeof color !== 'string') { return `rgba(0,0,0,${a})` }
    if (color.startsWith('#')) {
        const hex = color.replace('#', '')
        const to255 = (h) => parseInt(h, 16)
        if (hex.length === 6) {
            const r = to255(hex.slice(0, 2))
            const g = to255(hex.slice(2, 4))
            const b = to255(hex.slice(4, 6))
            return `rgba(${r}, ${g}, ${b}, ${a})`
        }
        if (hex.length === 3) {
            const r = to255(hex[0] + hex[0])
            const g = to255(hex[1] + hex[1])
            const b = to255(hex[2] + hex[2])
            return `rgba(${r}, ${g}, ${b}, ${a})`
        }
    }
    if (color.startsWith('rgba(')) {
        // Replace the trailing alpha
        return color.replace(/rgba\(([^)]+)\)/, (_m, inner) => {
            const parts = inner.split(',').map(s => s.trim())
            parts[3] = String(a)
            return `rgba(${parts.join(', ')})`
        })
    }
    if (color.startsWith('rgb(')) {
        return color.replace(/rgb\(([^)]+)\)/, (_m, inner) => `rgba(${inner.trim()}, ${a})`)
    }
    // Fallback: return color unchanged if we can't inject alpha cleanly
    return color
}

export function hasNumber(v) {
    return typeof v === 'number' && Number.isFinite(v)
}

// Simple single-bend IK that prefers a bend direction
export function singleBendIK(shoulder, hand, L1, L2, bendDir = 1) {
    const dx = (hand?.x || 0) - (shoulder?.x || 0)
    const dy = (hand?.y || 0) - (shoulder?.y || 0)
    const d = Math.hypot(dx, dy)
    const l1 = Math.max(1e-4, Math.abs(L1 || 1))
    const l2 = Math.max(1e-4, Math.abs(L2 || 1))
    const clamped = Math.max(1e-4, Math.min(d, l1 + l2 - 1e-4))
    const cosA = (l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped)
    const a = Math.acos(Math.max(-1, Math.min(1, cosA)))
    const base = Math.atan2(dy, dx)
    const ang = base + (bendDir >= 0 ? a : -a)
    return {
        x: (shoulder?.x || 0) + Math.cos(ang) * l1,
        y: (shoulder?.y || 0) + Math.sin(ang) * l1
    }
}
