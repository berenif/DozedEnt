// HandInputView.js
// Touch zones (left/right pills), multi-touch tracking, safe-area/palm rejection, slide-off cancel

import { HandId, Tunables, clamp } from '../../state/HandState.js'

export class HandInputView {
  constructor({ onHandDown, onHandUp, onHandMove, getUnsafeInsets }) {
    this.onHandDown = onHandDown || (() => {})
    this.onHandUp = onHandUp || (() => {})
    this.onHandMove = onHandMove || (() => {})
    this.getUnsafeInsets = getUnsafeInsets || (() => ({ top: 0, right: 0, bottom: 0, left: 0 }))

    this.activeTouches = new Map() // touchId → { handId, startX, startY, x, y, startTime, radiusPx, cancelled }
    this.elements = { left: null, right: null }
  }

  attach(root = document.body) {
    this.root = root
    this._createPills()
    this._attachListeners()
  }

  detach() {
    this._detachListeners()
    this.root = null
  }

  _createPills() {
    const container = document.createElement('div')
    container.className = 'hand-input-container'
    container.style.position = 'fixed'
    container.style.left = '0'
    container.style.top = '0'
    container.style.right = '0'
    container.style.bottom = '0'
    container.style.pointerEvents = 'none'

    const mkPill = (side) => {
      const pill = document.createElement('div')
      pill.className = `hand-pill hand-pill-${side}`
      pill.style.position = 'absolute'
      pill.style.pointerEvents = 'auto'
      pill.style.touchAction = 'none'
      // size will be computed on layout update
      return pill
    }

    this.elements.left = mkPill('left')
    this.elements.right = mkPill('right')
    container.appendChild(this.elements.left)
    container.appendChild(this.elements.right)
    this.root.appendChild(container)

    this._layout()
    window.addEventListener('resize', this._layout)
  }

  _layout = () => {
    const inset = this.getUnsafeInsets()
    const shortSide = Math.min(window.innerWidth, window.innerHeight)
    const h = clamp(shortSide * Tunables.pillShortSidePctMin, Tunables.pillMinHeightPx, shortSide * Tunables.pillShortSidePctMax)
    const w = Math.round(h * Tunables.pillWidthToHeight)
    const m = Tunables.safeEdgeMarginPx
    const g = 12 // vertical gap between stacked pills

    const left = this.elements.left
    const right = this.elements.right
    if (!left || !right) {return}

    // Right pill bottom-right (primary)
    right.style.width = `${w}px`
    right.style.height = `${h}px`
    right.style.right = `${m + inset.right}px`
    right.style.bottom = `${m + inset.bottom}px`
    right.style.borderRadius = `${h/2}px`
    right.style.background = 'rgba(255,255,255,0.06)'

    // Left pill stacked above right, also bottom-right corner
    left.style.width = `${w}px`
    left.style.height = `${h}px`
    left.style.right = `${m + inset.right}px`
    left.style.bottom = `${m + inset.bottom + h + g}px`
    left.style.borderRadius = `${h/2}px`
    left.style.background = 'rgba(255,255,255,0.06)'

    // Precompute cancel radii per hand
    this.leftCancelRadius = h * 0.5 * Tunables.cancelRadiusMultiplier
    this.rightCancelRadius = h * 0.5 * Tunables.cancelRadiusMultiplier

    this._updatePillRects()
  }

  _attachListeners() {
    this._onStart = (e) => this._handleStart(e)
    this._onMove = (e) => this._handleMove(e)
    this._onEnd = (e) => this._handleEnd(e)
    document.addEventListener('touchstart', this._onStart, { passive: false })
    document.addEventListener('touchmove', this._onMove, { passive: false })
    document.addEventListener('touchend', this._onEnd, { passive: false })
    document.addEventListener('touchcancel', this._onEnd, { passive: false })
  }

  _detachListeners() {
    document.removeEventListener('touchstart', this._onStart)
    document.removeEventListener('touchmove', this._onMove)
    document.removeEventListener('touchend', this._onEnd)
    document.removeEventListener('touchcancel', this._onEnd)
    window.removeEventListener('resize', this._layout)
  }

  _insideSafeZone(x, y) {
    const inset = this.getUnsafeInsets()
    const m = Tunables.safeEdgeMarginPx
    if (x < m + inset.left) {return false}
    if (x > window.innerWidth - (m + inset.right)) {return false}
    if (y < m + inset.top) {return false}
    if (y > window.innerHeight - (m + inset.bottom)) {return false}
    return true
  }

  _pickHand(x, y) {
    if (!this.pillRects) {this._updatePillRects()}
    const L = this.pillRects?.left
    const R = this.pillRects?.right
    const inside = (r) => r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    if (inside(R)) {return HandId.Right}
    if (inside(L)) {return HandId.Left}
    // Fallback: nearest center
    const dist2 = (r) => {
      if (!r) {return Infinity}
      const cx = (r.left + r.right) / 2
      const cy = (r.top + r.bottom) / 2
      const dx = x - cx
      const dy = y - cy
      return dx*dx + dy*dy
    }
    const dL = dist2(L); const dR = dist2(R)
    return dR <= dL ? HandId.Right : HandId.Left
  }

  _updatePillRects() {
    const left = this.elements.left
    const right = this.elements.right
    if (!left || !right) {return}
    this.pillRects = { left: left.getBoundingClientRect(), right: right.getBoundingClientRect() }
  }

  _handleStart(e) {
    for (const t of Array.from(e.changedTouches)) {
      const x = t.clientX; const y = t.clientY
      if (!this._insideSafeZone(x, y)) {continue}
      const handId = this._pickHand(x, y)
      const radiusPx = handId === HandId.Left ? this.leftCancelRadius : this.rightCancelRadius
      this.activeTouches.set(t.identifier, { handId, startX: x, startY: y, x, y, startTime: performance.now(), radiusPx, cancelled: false })
      this.onHandDown(handId, { x, y, startTime: performance.now(), id: t.identifier })
    }
    if (e.changedTouches.length) {e.preventDefault()}
  }

  _handleMove(e) {
    for (const t of Array.from(e.changedTouches)) {
      const info = this.activeTouches.get(t.identifier)
      if (!info) {continue}
      info.x = t.clientX; info.y = t.clientY

      // Slide-off cancel
      const dx = info.x - info.startX
      const dy = info.y - info.startY
      const dist = Math.hypot(dx, dy)
      if (!info.cancelled && dist > info.radiusPx) {
        info.cancelled = true
        // Signal cancel as an up with cancelled flag
        this.onHandUp(info.handId, { x: info.x, y: info.y, id: t.identifier, cancelled: true })
        this.activeTouches.delete(t.identifier)
        continue
      }

      this.onHandMove(info.handId, { x: info.x, y: info.y, id: t.identifier, startX: info.startX, startY: info.startY, startTime: info.startTime })
    }
    if (e.changedTouches.length) {e.preventDefault()}
  }

  _handleEnd(e) {
    for (const t of Array.from(e.changedTouches)) {
      const info = this.activeTouches.get(t.identifier)
      if (!info) {continue}
      this.onHandUp(info.handId, { x: t.clientX, y: t.clientY, id: t.identifier, cancelled: !!info.cancelled })
      this.activeTouches.delete(t.identifier)
    }
    if (e.changedTouches.length) {e.preventDefault()}
  }
}


