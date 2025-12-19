// Quantization.js
// Direction, grid, velocity, and frame quantization utilities for deterministic networking

import { Tunables } from '../state/HandState.js'

// Dir8 mapping using 0..7 where 0 points to +X (east/right) and increments counter-clockwise
// 0:E, 1:NE, 2:N, 3:NW, 4:W, 5:SW, 6:S, 7:SE
export const Dir8 = Object.freeze({
  E: 0, NE: 1, N: 2, NW: 3, W: 4, SW: 5, S: 6, SE: 7
})

export function angleToDir8(angleRad) {
  // Normalize angle to [0, 2π)
  let a = angleRad % (Math.PI * 2)
  if (a < 0) {a += Math.PI * 2}
  const sector = Math.round(a / (Math.PI / 4)) % 8
  // Math.round centers sectors on the axes (±π/8 boundaries)
  return sector
}

export function dir8ToAngle(dir8) {
  const d = ((dir8 % 8) + 8) % 8
  return d * (Math.PI / 4)
}

export function dir8ToVector(dir8) {
  const ang = dir8ToAngle(dir8)
  return { x: Math.cos(ang), y: Math.sin(ang) }
}

export function bucketVelocity(speedNormalized01) {
  const s = Math.max(0, Math.min(1, speedNormalized01))
  // 8 buckets -> 0..7
  const bucket = Math.floor(s * 8)
  return bucket > 7 ? 7 : bucket
}

export function timeMsToFrame(tsMs, originMs = 0, frameMs = Tunables.frameMs) {
  return Math.round((tsMs - originMs) / frameMs)
}

export function frameToTimeMs(frameIndex, originMs = 0, frameMs = Tunables.frameMs) {
  return originMs + frameIndex * frameMs
}

export function snapPointGridMeters(point) {
  const g = Tunables.gridSnapMeters
  return {
    x: Math.round(point.x / g) * g,
    y: Math.round(point.y / g) * g
  }
}

export function quantizePathMeters(pointsMeters) {
  // Snap each point to grid and limit to max points
  const snapped = []
  const maxPts = Tunables.gestureMaxPoints
  for (let i = 0; i < pointsMeters.length && snapped.length < maxPts; i++) {
    snapped.push(snapPointGridMeters(pointsMeters[i]))
  }
  return snapped
}


