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

export function smoothRotate(current, target, factor = 0.1) {
	let diff = target - current
	if (diff > Math.PI) {
		diff -= Math.PI * 2
	}
	if (diff < -Math.PI) {
		diff += Math.PI * 2
	}
	return current + diff * factor
}
