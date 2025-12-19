// HandStateMachine.js
// Per-hand state transitions and intent emission for dual-hand controls

import { HandId, HandState, Intent, Tunables } from '../../state/HandState.js'
import { SwipeDetector } from './SwipeDetector.js'

export class HandStateMachine {
  constructor({ onIntent, onStateChange, isGrabbableInRange, getNow = () => performance.now() } = {}) {
    this.onIntent = onIntent || (() => {})
    this.onStateChange = onStateChange || (() => {})
    this.isGrabbableInRange = isGrabbableInRange || (() => false)
    this.now = getNow
    this.hands = new Map()
    this._initHand(HandId.Left)
    this._initHand(HandId.Right)
  }

  _initHand(handId) {
    this.hands.set(handId, {
      state: HandState.Idle,
      downTs: 0,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      holdTimer: null,
      heavyCharge: false,
      grabbing: false,
      drawing: false,
      swipe: new SwipeDetector()
    })
  }

  reset() {
    for (const handId of this.hands.keys()) {this._resetHand(handId)}
  }

  _resetHand(handId) {
    const h = this.hands.get(handId)
    if (!h) {return}
    if (h.holdTimer) {clearTimeout(h.holdTimer)}
    h.state = HandState.Idle
    h.downTs = 0
    h.heavyCharge = false
    h.grabbing = false
    h.drawing = false
    h.swipe.reset()
  }

  handleDown(handId, info) {
    const h = this.hands.get(handId)
    if (!h) {return}
    const now = this.now()
    h.state = HandState.Hold
    h.downTs = now
    h.startX = info.x
    h.startY = info.y
    h.x = info.x
    h.y = info.y
    h.swipe.reset()
    h.swipe.addPoint(info.x, info.y, now)

    // Schedule hold threshold
    if (h.holdTimer) {clearTimeout(h.holdTimer)}
    h.holdTimer = setTimeout(() => {
      // Decide between Grab vs HeavyCharge
      if (this.isGrabbableInRange(handId)) {
        h.grabbing = true
        this._setState(handId, HandState.Grab)
        this._emitIntent(handId, Intent.Grab, { phase: 'start' })
      } else {
        h.heavyCharge = true
        this._emitIntent(handId, Intent.HeavyCharge, { phase: 'start', maxMs: Tunables.heavyMaxMs })
      }
    }, Tunables.holdMinMs)

    this._setState(handId, HandState.Hold)
  }

  handleMove(handId, info) {
    const h = this.hands.get(handId)
    if (!h) {return}
    h.x = info.x
    h.y = info.y
    h.swipe.addPoint(info.x, info.y, this.now())

    // Push while holding (no grab target)
    if (h.state === HandState.Hold && h.heavyCharge && !h.grabbing) {
      const dx = info.x - h.startX
      const dy = info.y - h.startY
      const dist = Math.hypot(dx, dy)
      if (dist > Tunables.swipeMinPx) {
        this._setState(handId, HandState.Push)
        this._emitIntent(handId, Intent.Push, { dx, dy, x: info.x, y: info.y })
      }
    }
  }

  handleUp(handId, info) {
    const h = this.hands.get(handId)
    if (!h) {return}
    const now = this.now()
    const elapsed = now - h.downTs
    if (h.holdTimer) { clearTimeout(h.holdTimer); h.holdTimer = null }

    // Cancel slide-off
    if (info.cancelled) {
      if (h.heavyCharge) {this._emitIntent(handId, Intent.HeavyCharge, { phase: 'cancel' })}
      if (h.grabbing) {this._emitIntent(handId, Intent.Grab, { phase: 'cancel' })}
      this._setState(handId, HandState.Idle)
      this._clearFlags(h)
      return
    }

    // If grabbing, check for flick -> Throw, else Drop
    if (h.grabbing) {
      const flick = h.swipe.detectFlick()
      if (flick.isFlick) {
        this._emitIntent(handId, Intent.Throw, { dir8: flick.dir8, speedBucket: flick.speedBucket })
      } else {
        this._emitIntent(handId, Intent.Grab, { phase: 'release' })
      }
      this._setState(handId, HandState.Idle)
      this._clearFlags(h)
      return
    }

    // Heavy attack release
    if (h.heavyCharge) {
      this._emitIntent(handId, Intent.HeavyAttack, { chargeMs: Math.min(elapsed - Tunables.holdMinMs, Tunables.heavyMaxMs) })
      this._setState(handId, HandState.Idle)
      this._clearFlags(h)
      return
    }

    // Swipe detection
    const swipe = h.swipe.detectSwipe()
    if (swipe.isSwipe) {
      this._setState(handId, HandState.Swipe)
      this._emitIntent(handId, Intent.DirectionalAttack, { dir8: swipe.dir8, magnitudeBucket: swipe.magnitudeBucket, startTs: swipe.startTs, endTs: swipe.endTs })
      this._setState(handId, HandState.Idle)
      this._clearFlags(h)
      return
    }

    // Tap (quick)
    if (elapsed <= Tunables.tapMaxMs) {
      this._setState(handId, HandState.Tap)
      this._emitIntent(handId, Intent.LightAttack, { })
      this._setState(handId, HandState.Idle)
      this._clearFlags(h)
      return
    }

    // Default: end, back to idle
    this._setState(handId, HandState.Idle)
    this._clearFlags(h)
  }

  // External draw controls (entry/exit handled by UI coordinator)
  beginDraw(handId, startX, startY) {
    const h = this.hands.get(handId)
    if (!h) {return}
    h.drawing = true
    this._setState(handId, HandState.Draw)
    this._emitIntent(handId, Intent.DrawPath, { phase: 'start', x: startX, y: startY })
  }

  endDraw(handId, result) {
    const h = this.hands.get(handId)
    if (!h) {return}
    if (h.drawing) {
      this._emitIntent(handId, Intent.DrawPath, { phase: 'end', ...result })
    }
    h.drawing = false
    this._setState(handId, HandState.Idle)
  }

  _clearFlags(h) {
    h.heavyCharge = false
    h.grabbing = false
    h.drawing = false
    h.swipe.reset()
  }

  _emitIntent(handId, intent, payload) {
    this.onIntent && this.onIntent(handId, intent, payload || {})
  }

  _setState(handId, next) {
    const h = this.hands.get(handId)
    if (!h) {return}
    const prev = h.state
    if (prev === next) {return}
    h.state = next
    this.onStateChange && this.onStateChange(handId, prev, next)
  }
}


