// GameRenderer.js
// Handles canvas rendering for player and basic game elements
import TopDownPlayerRenderer from '../../renderer/player/TopDownPlayerRenderer.js'
import PlayerSkeletonRenderer from '../../renderer/player/PlayerSkeletonRenderer.js'

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    
    // Dual animation system renderer (procedural by default)
    // KEPT INTACT: Can be re-enabled with ?skeleton=1 or ?advanced=1
    this.playerRenderer = new TopDownPlayerRenderer(this.ctx, canvas, {
      mode: 'procedural',
      procedural: {
        footIK: { stepHeight: 7 },
        spine: { maxBend: 0.18 },
        armIK: { upperArmLength: 9 }
      }
    })

    // Feature flags for different rendering modes
    this.skeletonEnabled = (new URLSearchParams(globalThis.location?.search || '')).get('skeleton') === '1'
    this.advancedRenderingEnabled = (new URLSearchParams(globalThis.location?.search || '')).get('advanced') === '1'
    this.skeletonRenderer = new PlayerSkeletonRenderer(this.ctx, canvas)
    
    // Simple sphere rendering (default)
    this.useSphereRendering = !this.skeletonEnabled && !this.advancedRenderingEnabled
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
    
    if (this.useSphereRendering) {
      // Simple sphere rendering (default)
      this.renderPlayerSphere(playerState, pos)
    } else if (this.advancedRenderingEnabled) {
      // Advanced procedural animation system (skeleton intact, use ?advanced=1)
      this.playerRenderer.render(
        playerState,
        (wx, wy) => this.worldToCanvas(wx, wy),
        20
      )
    }
    
    // Debug text overlay for current animation state
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 16px monospace'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(playerState.anim || 'unknown', pos.x, pos.y - 50)
  }
  
  /**
   * Render player as a simple sphere with directional indicator
   * @param {Object} playerState - Player state from WASM
   * @param {Object} pos - Canvas position {x, y}
   */
  renderPlayerSphere(playerState, pos) {
    const radius = 15
    
    // Main sphere body
    this.ctx.save()
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.ellipse(pos.x, pos.y + radius + 5, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Player sphere with gradient
    const gradient = this.ctx.createRadialGradient(
      pos.x - radius * 0.3, 
      pos.y - radius * 0.3, 
      radius * 0.1,
      pos.x, 
      pos.y, 
      radius
    )
    gradient.addColorStop(0, '#6699ff')
    gradient.addColorStop(1, '#2255cc')
    
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Outline
    this.ctx.strokeStyle = '#1144aa'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
    
    // Direction indicator (arrow)
    const vx = playerState.vx || 0
    const vy = playerState.vy || 0
    const speed = Math.sqrt(vx * vx + vy * vy)
    
    if (speed > 0.01) {
      const angle = Math.atan2(vy, vx)
      const arrowLength = radius + 10
      
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.fillStyle = '#ffffff'
      this.ctx.lineWidth = 3
      
      // Arrow shaft
      this.ctx.beginPath()
      this.ctx.moveTo(pos.x, pos.y)
      this.ctx.lineTo(
        pos.x + Math.cos(angle) * arrowLength,
        pos.y + Math.sin(angle) * arrowLength
      )
      this.ctx.stroke()
      
      // Arrow head
      const headSize = 8
      const headAngle = Math.PI / 6
      this.ctx.beginPath()
      this.ctx.moveTo(
        pos.x + Math.cos(angle) * arrowLength,
        pos.y + Math.sin(angle) * arrowLength
      )
      this.ctx.lineTo(
        pos.x + Math.cos(angle - headAngle) * (arrowLength - headSize),
        pos.y + Math.sin(angle - headAngle) * (arrowLength - headSize)
      )
      this.ctx.lineTo(
        pos.x + Math.cos(angle + headAngle) * (arrowLength - headSize),
        pos.y + Math.sin(angle + headAngle) * (arrowLength - headSize)
      )
      this.ctx.closePath()
      this.ctx.fill()
    } else {
      // Stationary indicator (dot in center)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.beginPath()
      this.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // State-based visual feedback
    if (playerState.rolling || playerState.anim === 'rolling') {
      // Rolling state - motion blur effect
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      this.ctx.lineWidth = 2
      for (let i = 1; i <= 3; i++) {
        this.ctx.beginPath()
        this.ctx.arc(pos.x, pos.y, radius + i * 3, 0, Math.PI * 2)
        this.ctx.stroke()
      }
    }
    
    if (playerState.block || playerState.anim === 'blocking') {
      // Blocking state - shield indicator
      this.ctx.strokeStyle = '#ffaa00'
      this.ctx.lineWidth = 4
      this.ctx.beginPath()
      this.ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    if (playerState.anim === 'attacking') {
      // Attacking state - red glow
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.arc(pos.x, pos.y, radius + 3, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }
}
