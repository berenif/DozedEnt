// SwipeDetector.js
// Detects swipe and flick with quantized direction and magnitude buckets

import { Tunables } from '../../state/HandState.js'
import { angleToDir8, bucketVelocity } from '../../net/Quantization.js'

export class SwipeDetector {
  constructor() {
    this.points = [] // {x,y,ts}
  }

  reset() {
    this.points.length = 0
  }

  addPoint(x, y, ts) {
    this.points.push({ x, y, ts })
    // Keep last ~300 ms of points
    const cutoff = ts - 300
    while (this.points.length && this.points[0].ts < cutoff) this.points.shift()
  }

  detectSwipe() {
    if (this.points.length < 2) return { isSwipe: false }
    const first = this.points[0]
    const last = this.points[this.points.length - 1]
    const dx = last.x - first.x
    const dy = last.y - first.y
    const dist = Math.hypot(dx, dy)
    if (dist < Tunables.swipeMinPx) return { isSwipe: false }
    const angle = Math.atan2(dy, dx)
    const dir8 = angleToDir8(angle)
    const magnitudeBucket = dist >= Tunables.longSwipePx ? 7 : 3 // coarse bucket; refined later if needed
    return { isSwipe: true, dir8, lengthPx: dist, magnitudeBucket, startTs: first.ts, endTs: last.ts }
  }

  detectFlick() {
    if (this.points.length < 2) return { isFlick: false }
    const windowMs = 120
    const end = this.points[this.points.length - 1]
    let i = this.points.length - 2
    while (i > 0 && end.ts - this.points[i].ts < windowMs) i--
    const start = this.points[Math.max(0, i)]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dt = Math.max(1, end.ts - start.ts)
    const speedPxPerSec = Math.hypot(dx, dy) * (1000 / dt)
    if (speedPxPerSec < Tunables.flickThresholdPxPerSec) return { isFlick: false }
    const speedNorm = Math.min(1, speedPxPerSec / (Tunables.flickThresholdPxPerSec * 2))
    const speedBucket = bucketVelocity(speedNorm)
    const ang = Math.atan2(dy, dx)
    const dir8 = angleToDir8(ang)
    return { isFlick: true, dir8, speedBucket, lastWindowMs: Math.min(windowMs, dt) }
  }
}


