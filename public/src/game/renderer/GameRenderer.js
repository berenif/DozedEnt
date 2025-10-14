// GameRenderer.js
// Handles canvas rendering for player and basic game elements

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  worldToCanvas(wx, wy) {
    return {
      x: wx * this.canvas.width,
      y: wy * this.canvas.height
    }
  }

  renderPlayer(playerState) {
    const pos = this.worldToCanvas(playerState.x, playerState.y)
    this.ctx.fillStyle = '#2aa3ff'
    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
    this.ctx.fill()
  }
}
