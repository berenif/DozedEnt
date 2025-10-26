// GameRenderer.js
// Handles canvas rendering for player and basic game elements
import TopDownPlayerRenderer from '../../renderer/player/TopDownPlayerRenderer.js'
import PlayerSkeletonRenderer from '../../renderer/player/PlayerSkeletonRenderer.js'

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    
    // Dual animation system renderer (procedural by default)
    this.playerRenderer = new TopDownPlayerRenderer(this.ctx, canvas, {
      mode: 'procedural',
      procedural: {
        footIK: { stepHeight: 7 },
        spine: { maxBend: 0.18 },
        armIK: { upperArmLength: 9 }
      }
    })

    this.skeletonEnabled = (new URLSearchParams(globalThis.location?.search || '')).get('skeleton') === '1'
    this.skeletonRenderer = new PlayerSkeletonRenderer(this.ctx, canvas)
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

  renderPlayer(playerState, wasmState) {
    const pos = this.worldToCanvas(playerState.x, playerState.y)
    
    // Render animated skeleton using the top-down player renderer
    this.playerRenderer.render(
      playerState,
      (wx, wy) => this.worldToCanvas(wx, wy),
      20
    )
    
    // Debug text overlay for current animation state
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 16px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(playerState.anim || 'unknown', pos.x, pos.y - 50)

    // Optional WASM skeleton overlay
    if (this.skeletonEnabled && wasmState && typeof wasmState.getSkeletonSnapshot === 'function') {
      const snapshot = wasmState.getSkeletonSnapshot()
      if (snapshot && snapshot.joints && snapshot.joints.length >= 26) {
        this.skeletonRenderer.render(snapshot)
      }
    }
  }
}
