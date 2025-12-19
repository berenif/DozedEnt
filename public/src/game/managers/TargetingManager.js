// TargetingManager.js
// Soft-lock selection with cone and hysteresis, plus reticle metadata

import { Tunables } from '../state/HandState.js'

export class TargetingManager {
  constructor() {
    this.currentTargetId = null
  }

  acquireTarget(playerPos, facingDir, candidates) {
    // candidates: array of { id, x, y, interactable, grabbable, priority }
    const best = pickBestTarget(playerPos, facingDir, candidates, this.currentTargetId)
    this.currentTargetId = best ? best.id : null
    return {
      targetId: this.currentTargetId || undefined,
      reticleData: best ? { x: best.x, y: best.y, priority: best.priority || 0 } : null
    }
  }
}

function pickBestTarget(playerPos, facingDir, candidates, currentId) {
  const maxR = Tunables.softLockRangeM
  const maxAng = toRad(Tunables.softLockConeDeg)
  const hysteresisR = Tunables.softLockHysteresisM
  const hysteresisAng = toRad(Tunables.softLockHysteresisDeg)

  let best = null
  let bestScore = -Infinity
  for (const c of candidates || []) {
    if (!c || !c.interactable) {continue}
    const dx = c.x - playerPos.x
    const dy = c.y - playerPos.y
    const dist = Math.hypot(dx, dy)
    if (dist > maxR + hysteresisR) {continue}
    const ang = Math.atan2(dy, dx)
    const delta = smallestAngleDiff(ang, facingDir)
    if (Math.abs(delta) > (maxAng + hysteresisAng)) {continue}
    const base = (maxR - dist) / maxR + Math.max(0, (maxAng - Math.abs(delta)) / maxAng)
    const pri = (c.priority || 0) * 0.1
    const sticky = c.id === currentId ? 0.25 : 0 // hysteresis preference
    const score = base + pri + sticky
    if (score > bestScore) { best = c; bestScore = score }
  }
  return best
}

function toRad(deg) { return (deg * Math.PI) / 180 }

function smallestAngleDiff(a, b) {
  let d = a - b
  while (d > Math.PI) {d -= 2 * Math.PI}
  while (d < -Math.PI) {d += 2 * Math.PI}
  return d
}


