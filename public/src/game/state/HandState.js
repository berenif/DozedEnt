// HandState.js
// Enums and tunables for dual-hand mobile controls

// Hand identifiers
export const HandId = Object.freeze({
  Left: 'Left',
  Right: 'Right'
})

// High-level per-hand state (UI/intent-facing)
export const HandState = Object.freeze({
  Idle: 'Idle',
  Tap: 'Tap',
  Hold: 'Hold',
  Swipe: 'Swipe',
  Grab: 'Grab',
  Push: 'Push',
  Draw: 'Draw',
  Block: 'Block'
})

// Intents emitted by the state machine toward interaction/ability layers
export const Intent = Object.freeze({
  LightAttack: 'LightAttack',
  HeavyCharge: 'HeavyCharge',
  HeavyAttack: 'HeavyAttack',
  DirectionalAttack: 'DirectionalAttack',
  Grab: 'Grab',
  Push: 'Push',
  Throw: 'Throw',
  Block: 'Block',
  DrawPath: 'DrawPath'
})

// Tunable thresholds and constants (px/ms/meters)
export const Tunables = Object.freeze({
  tapMaxMs: 220,
  holdMinMs: 350,
  heavyMaxMs: 700,
  swipeMinPx: 40,
  longSwipePx: 140,
  blockChordMs: 120,
  // Palm rejection and UI sizing
  safeEdgeMarginPx: 24,
  pillMinHeightPx: 72,
  pillShortSidePctMin: 0.12,
  pillShortSidePctMax: 0.16,
  pillWidthToHeight: 1.4,
  cancelRadiusMultiplier: 1.6,
  // Gesture and networking
  flickThresholdPxPerSec: 900,
  gestureCaptureHz: 60,
  gestureSendHz: 30,
  gestureMinLengthPx: 80,
  gestureMaxPoints: 32,
  frameMs: 16,
  // Soft-lock
  softLockRangeM: 3.0,
  softLockConeDeg: 30,
  softLockHysteresisM: 0.5,
  softLockHysteresisDeg: 10,
  // Quantization/grid
  gridSnapMeters: 0.1
})

// Utility: clamp helper
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Utility: degrees/radians helpers
export function degToRad(deg) {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI
}


