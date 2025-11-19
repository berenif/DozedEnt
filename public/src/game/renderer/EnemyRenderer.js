// EnemyRenderer.js
// Handles enemy rendering and state visualization

export class EnemyRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.wolfAnimEnabled = false
    this.wasmExports = null
  }

  /**
   * Initialize WASM animation support (called by RenderingCoordinator)
   * @param {Object} wasmExports - WASM module exports
   */
  setWasmModule(wasmExports) {
    // Check feature flag
    const urlParams = new URLSearchParams(window.location.search)
    const flagEnabled = urlParams.get('wolfAnim') === 'true'
    
    if (!flagEnabled) {
      console.log('[WolfAnim] Feature flag disabled (use ?wolfAnim=true)')
      return
    }
    
    // Verify required exports exist
    const required = ['get_wolf_leg_x', 'get_wolf_leg_y', 'get_wolf_body_bob']
    const missing = required.filter(fn => typeof wasmExports[fn] !== 'function')
    
    if (missing.length > 0) {
      console.warn('[WolfAnim] Missing exports, falling back to circles:', missing)
      this.wolfAnimEnabled = false
    } else {
      this.wolfAnimEnabled = true
      this.wasmExports = wasmExports
      console.log('[WolfAnim] Enabled with WASM animation data')
    }
  }

  worldToCanvas(wx, wy) {
    return {
      x: wx * this.canvas.width,
      y: wy * this.canvas.height
    }
  }

  enemyStateToString(stateId) {
    switch ((stateId | 0) >>> 0) {
      case 0: return 'Idle'
      case 1: return 'Patrol'
      case 2: return 'Investigate'
      case 3: return 'Alert'
      case 4: return 'Approach'
      case 5: return 'Strafe'
      case 6: return 'Attack'
      case 7: return 'Retreat'
      case 8: return 'Recover'
      case 9: return 'Flee'
      case 10: return 'Ambush'
      case 11: return 'Flank'
      default: return '?'
    }
  }

  getEnemyColor(stateId) {
    switch ((stateId | 0) >>> 0) {
      case 0: return '#ffffff'  // Idle - white
      case 1: return '#ff8c00'  // Patrol - orange
      case 2: return '#ffcc00'  // Investigate - yellow-orange
      case 3: return '#ffa500'  // Alert - bright orange
      case 4: return '#ff6600'  // Approach - red-orange
      case 5: return '#cc66ff'  // Strafe - purple
      case 6: return '#8b0000'  // Attack - dark red
      case 7: return '#00aaff'  // Retreat - blue
      case 8: return '#4444ff'  // Recover - darker blue
      case 9: return '#ffff00'  // Flee - yellow
      case 10: return '#990099' // Ambush - dark purple
      case 11: return '#ff00ff' // Flank - magenta
      default: return '#ff4d4d' // Default - light red
    }
  }

  getEmotionString(emotionId) {
    switch ((emotionId | 0) >>> 0) {
      case 0: return 'Calm'
      case 1: return 'Aggressive'
      case 2: return 'Fearful'
      case 3: return 'Desperate'
      case 4: return 'Confident'
      case 5: return 'Frustrated'
      default: return '?'
    }
  }

  getEmotionColor(emotionId) {
    switch ((emotionId | 0) >>> 0) {
      case 0: return '#aaaaaa'  // Calm - gray
      case 1: return '#ff3333'  // Aggressive - red
      case 2: return '#3333ff'  // Fearful - blue
      case 3: return '#ff8800'  // Desperate - orange
      case 4: return '#33ff33'  // Confident - green
      case 5: return '#ffff00'  // Frustrated - yellow
      default: return '#ffffff'
    }
  }

  renderEnemies(wasmApi) {
    try {
      const ex = wasmApi.exports || {}
      if (typeof ex.get_enemy_count !== 'function') {
        return
      }

      const enemyCount = ex.get_enemy_count() | 0
      
      // First pass: render pack coordination lines
      if (typeof ex.get_pack_count === 'function') {
        this.renderPackCoordination(ex, enemyCount)
      }
      
      // Second pass: render individual wolves
      for (let i = 0; i < enemyCount; i += 1) {
        const x = Number(ex.get_enemy_x?.(i) ?? ex.get_wolf_x?.(i) ?? 0)
        const y = Number(ex.get_enemy_y?.(i) ?? ex.get_wolf_y?.(i) ?? 0)
        const stateId = Number(ex.get_enemy_state?.(i) ?? ex.get_wolf_state?.(i) ?? -1)
        const emotionId = Number(ex.get_wolf_emotion?.(i) ?? 0)
        const wolfType = Number(ex.get_wolf_type?.(i) ?? 0)
        const packId = Number(ex.get_wolf_pack_id?.(i) ?? 0)
        
        this.renderEnemy(x, y, stateId, emotionId, wolfType, packId, i)
      }
    } catch (error) {
      // Log rendering errors for debugging (non-critical, so warn not error)
      console.warn('[EnemyRenderer] Failed to render enemies:', error.message)
    }
  }

  renderPackCoordination(wasmExports, enemyCount) {
    const packCount = wasmExports.get_pack_count?.() | 0
    if (packCount === 0) {
      return
    }
    
    // Draw lines connecting pack members
    for (let i = 0; i < enemyCount; i += 1) {
      const packId1 = Number(wasmExports.get_wolf_pack_id?.(i) ?? 0)
      if (packId1 === 0) {
        continue
      }
      
      const x1 = Number(wasmExports.get_wolf_x?.(i) ?? 0)
      const y1 = Number(wasmExports.get_wolf_y?.(i) ?? 0)
      const pos1 = this.worldToCanvas(x1, y1)
      
      // Connect to other pack members
      for (let j = i + 1; j < enemyCount; j += 1) {
        const packId2 = Number(wasmExports.get_wolf_pack_id?.(j) ?? 0)
        if (packId1 !== packId2) {
          continue
        }
        
        const x2 = Number(wasmExports.get_wolf_x?.(j) ?? 0)
        const y2 = Number(wasmExports.get_wolf_y?.(j) ?? 0)
        const pos2 = this.worldToCanvas(x2, y2)
        
        // Draw line between pack members
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(pos1.x, pos1.y)
        this.ctx.lineTo(pos2.x, pos2.y)
        this.ctx.stroke()
      }
    }
  }

  renderEnemy(x, y, stateId, emotionId, wolfType, packId, index = -1) {
    const pos = this.worldToCanvas(x, y)
    
    // Enhanced rendering with WASM animation data
    if (this.wolfAnimEnabled && this.wasmExports && index >= 0) {
      this.renderAnimatedWolf(pos, index, stateId, emotionId, packId)
    } else {
      // Fallback: simple circle (existing code)
      const stateName = this.enemyStateToString(stateId)
      const stateColor = this.getEnemyColor(stateId)

      // Render enemy circle with state-based color
      this.ctx.fillStyle = stateColor
      this.ctx.beginPath()
      this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Render emotion ring if not calm
      if (emotionId && emotionId !== 0) {
        this.ctx.strokeStyle = this.getEmotionColor(emotionId)
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
        this.ctx.stroke()
      }
      
      // Render pack ID indicator
      if (packId && packId !== 0) {
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = 'bold 10px sans-serif'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(`P${packId}`, pos.x, pos.y)
      }

      // Render state label
      this.ctx.fillStyle = '#e6f2ff'
      this.ctx.font = '11px sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'top'
      this.ctx.fillText(stateName, pos.x, pos.y + 14)
      
      // Render emotion label if present
      if (emotionId && emotionId !== 0) {
        const emotionName = this.getEmotionString(emotionId)
        this.ctx.fillStyle = this.getEmotionColor(emotionId)
        this.ctx.font = '9px sans-serif'
        this.ctx.fillText(emotionName, pos.x, pos.y + 26)
      }
    }
  }

  renderAnimatedWolf(pos, index, stateId, emotionId, packId) {
    const ex = this.wasmExports
    
    // Read animation data from WASM
    const bodyBob = ex.get_wolf_body_bob(index)
    const headPitch = ex.get_wolf_head_pitch(index)
    const headYaw = ex.get_wolf_head_yaw(index)
    const tailWag = ex.get_wolf_tail_wag(index)
    const bodyStretch = ex.get_wolf_body_stretch(index)
    
    // Validate all data is finite
    if (!Number.isFinite(bodyBob) || !Number.isFinite(headYaw)) {
      console.warn('[WolfAnim] Invalid data from WASM, falling back')
      this.wolfAnimEnabled = false
      return
    }
    
    // For MVP: render enhanced circle with animation indicators
    this.ctx.save()
    this.ctx.translate(pos.x, pos.y + bodyBob * 20) // Apply body bob
    
    // Body (stretched circle)
    this.ctx.fillStyle = this.getEnemyColor(stateId)
    this.ctx.scale(bodyStretch, 1.0)
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 12, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.scale(1.0 / bodyStretch, 1.0)
    
    // Head direction indicator
    const headLen = 15
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(Math.cos(headYaw) * headLen, Math.sin(headYaw) * headLen)
    this.ctx.stroke()
    
    // Tail indicator
    const tailLen = 10
    const tailAngle = headYaw + Math.PI + tailWag
    this.ctx.strokeStyle = '#aaaaaa'
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(Math.cos(tailAngle) * tailLen, Math.sin(tailAngle) * tailLen)
    this.ctx.stroke()
    
    // Render emotion ring if not calm
    if (emotionId && emotionId !== 0) {
      this.ctx.strokeStyle = this.getEmotionColor(emotionId)
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    // Render pack ID indicator
    if (packId && packId !== 0) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 10px sans-serif'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(`P${packId}`, 0, 0)
    }
    
    this.ctx.restore()
    
    // Render state label (outside transform)
    const stateName = this.enemyStateToString(stateId)
    this.ctx.fillStyle = '#e6f2ff'
    this.ctx.font = '11px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(stateName, pos.x, pos.y + 18)
  }
}
