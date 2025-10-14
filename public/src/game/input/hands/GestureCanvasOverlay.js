// GestureCanvasOverlay.js
// Full-screen overlay to capture free-form gesture paths and render preview

import { Tunables } from '../../state/HandState.js'

export class GestureCanvasOverlay {
  constructor({ onPathCaptured }) {
    this.onPathCaptured = onPathCaptured || (() => {})
    this.visible = false
    this.points = [] // {x,y,ts}
  }

  attach(root = document.body) {
    this.root = root
    this._createCanvas()
  }

  detach() {
    this._detach()
    this.root = null
  }

  show() {
    if (!this.canvas) return
    this.visible = true
    this.canvas.style.display = 'block'
  }

  hide() {
    if (!this.canvas) return
    this.visible = false
    this.canvas.style.display = 'none'
  }

  startCapture(startX, startY) {
    this.points.length = 0
    this.points.push({ x: startX, y: startY, ts: performance.now() })
    this._ensureAnimating()
  }

  addPoint(x, y) {
    this.points.push({ x, y, ts: performance.now() })
  }

  endCapture() {
    // Minimum length gate
    if (this.points.length >= 2) {
      const a = this.points[0]
      const b = this.points[this.points.length - 1]
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      if (len >= Tunables.gestureMinLengthPx) {
        this.onPathCaptured(this.points.slice())
      }
    }
    this.points.length = 0
  }

  _createCanvas() {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.right = '0'
    canvas.style.bottom = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.display = 'none'
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.root.appendChild(canvas)
    this._resize()
    window.addEventListener('resize', this._resize)
  }

  _detach() {
    if (!this.canvas) return
    window.removeEventListener('resize', this._resize)
    this.canvas.remove()
    this.canvas = null
    this.ctx = null
  }

  _resize = () => {
    if (!this.canvas) return
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.floor(window.innerWidth * dpr)
    this.canvas.height = Math.floor(window.innerHeight * dpr)
    this.canvas.style.width = `${window.innerWidth}px`
    this.canvas.style.height = `${window.innerHeight}px`
    this.ctx && this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  _ensureAnimating() {
    if (this._raf) return
    const loop = () => {
      this._raf = requestAnimationFrame(loop)
      if (!this.visible || !this.ctx) return
      this._render()
    }
    this._raf = requestAnimationFrame(loop)
  }

  _render() {
    const ctx = this.ctx
    if (!ctx) return
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (this.points.length < 2) return
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(80,200,255,0.85)'
    ctx.beginPath()
    ctx.moveTo(this.points[0].x, this.points[0].y)
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y)
    ctx.stroke()
  }
}


