// GestureRecognizer.js
// Smoothing, simplification, resampling (60→30Hz), and quantization of gesture paths

import { Tunables } from '../state/HandState.js'
import { catmullRomSpline } from './gesture/PathSmoothing.js'
import { simplifyRDP } from './gesture/SimplifyRDP.js'
import { quantizePathMeters } from '../net/Quantization.js'

export class GestureRecognizer {
  constructor({ rdpTolerancePx = 10, smoothingResolutionPx = 2 } = {}) {
    this.rdpTol = rdpTolerancePx
    this.smoothRes = smoothingResolutionPx
  }

  process(rawPoints60Hz, playerOriginMeters) {
    if (!rawPoints60Hz || rawPoints60Hz.length < 2) return {
      path30Hz: [], quantizedPoints: [], startFrame: 0, endFrame: 0
    }

    // 1) Smooth with Catmull–Rom (centripetal)
    const smoothed = catmullRomSpline(rawPoints60Hz, 0.5, this.smoothRes)
    // 2) Simplify with RDP
    const simplified = simplifyRDP(smoothed, this.rdpTol)
    // 3) Resample to 30 Hz by timestamp spacing if available, otherwise by distance
    const resampled = resampleSeries(simplified, Tunables.gestureSendHz)
    // 4) Convert to relative-to-player and meters (assume pixels already scaled externally if needed)
    const pathMeters = resampled.map(p => ({ x: p.x - playerOriginMeters.x, y: p.y - playerOriginMeters.y }))
    // 5) Quantize to grid and clamp length
    const quantizedPoints = quantizePathMeters(pathMeters)

    // Frame indices
    const startTs = rawPoints60Hz[0].ts || performance.now()
    const endTs = rawPoints60Hz[rawPoints60Hz.length - 1].ts || startTs
    const frameMs = Tunables.frameMs
    const startFrame = Math.round(startTs / frameMs)
    const endFrame = Math.round(endTs / frameMs)

    return { path30Hz: resampled, quantizedPoints, startFrame, endFrame }
  }
}

function resampleSeries(points, targetHz) {
  if (points.length < 2) return points
  const targetDt = 1000 / targetHz
  const out = []
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dt = (b.ts ?? (i * targetDt)) - (a.ts ?? ((i - 1) * targetDt))
    const segLen = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.round(dt / targetDt))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ts: (a.ts ?? acc) + t * dt })
    }
    acc += dt
  }
  out.push(points[points.length - 1])
  return out
}


