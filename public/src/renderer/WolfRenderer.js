/**
 * WolfRenderer.js
 * Procedural wolf rendering for WASM wolf entities
 * Architecture: JavaScript reads WASM state and visualizes only
 * NO GAME LOGIC - Pure visualization layer
 */

// Wolf state constants (must match WASM WolfState enum)
const WOLF_STATES = {
  IDLE: 0,
  PATROL: 1,
  INVESTIGATE: 2,
  ALERT: 3,
  APPROACH: 4,
  STRAFE: 5,
  ATTACK: 6,
  RETREAT: 7,
  RECOVER: 8,
  FLEE: 9,
  AMBUSH: 10,
  FLANK: 11
};

// Wolf types (must match WASM WolfType enum)
const WOLF_TYPES = {
  NORMAL: 0,
  ALPHA: 1,
  SCOUT: 2,
  HUNTER: 3,
  OMEGA: 4
};

// Pack roles (must match WASM PackRole enum)
const PACK_ROLES = {
  LEADER: 0,
  BRUISER: 1,
  SKIRMISHER: 2,
  SUPPORT: 3
};

/**
 * WolfRenderer - Reads wolf state from WASM and renders procedurally
 */
export class WolfRenderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.worldWidth = 1.0; // WASM normalized coordinates (0-1)
    this.worldHeight = 1.0;
    // Per-wolf animation pacing derived from actual velocity
    this._wolfAnim = new Map(); // key: index -> { phase, lastSpeed }
    
    // Animation timing
    this.animationTime = 0;
    this.lastFrameTime = performance.now();
    
    // Debug options
    this.showHealthBars = true;
    this.showStateLabels = true;
    this.showPackLines = false;
    this.showRanges = false;
  }

  /**
   * Main render method - reads all wolves from WASM and draws them
   * @param {Object} wasmExports - WASM module exports
   * @param {Object} camera - Camera transform {x, y, zoom}
   */
  render(wasmExports, camera = { x: 0.5, y: 0.5, zoom: 1.0 }) {
    if (!wasmExports || !wasmExports.get_enemy_count) {
      return; // WASM not loaded yet
    }

    // Update animation timer
    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.animationTime += deltaTime;

    // Read wolf count from WASM
    const wolfCount = wasmExports.get_enemy_count();

    // Render each wolf
    for (let i = 0; i < wolfCount; i++) {
      const wolfState = this.readWolfState(wasmExports, i);
      this.renderWolf(wolfState, camera, deltaTime);
    }
  }

  /**
   * Read wolf state from WASM exports
   * @param {Object} wasmExports - WASM module exports
   * @param {number} index - Wolf index
   * @returns {Object} Wolf state data
   */
  readWolfState(wasmExports, index) {
    return {
      index: index,
      x: wasmExports.get_enemy_x(index) || 0,
      y: wasmExports.get_enemy_y(index) || 0,
      type: wasmExports.get_enemy_type(index) || WOLF_TYPES.NORMAL,
      state: wasmExports.get_enemy_state(index) || WOLF_STATES.IDLE,
      role: wasmExports.get_enemy_role?.(index) || PACK_ROLES.SKIRMISHER,
      fatigue: wasmExports.get_enemy_fatigue?.(index) || 0,
      // Optional velocity for animation pacing; default to 0 if not exported
      vx: (wasmExports.get_enemy_vx?.(index)) || 0,
      vy: (wasmExports.get_enemy_vy?.(index)) || 0
    };
  }

  /**
   * Render a single wolf
   * @param {Object} wolf - Wolf state data
   * @param {Object} camera - Camera transform
   */
  renderWolf(wolf, camera, deltaTime) {
    // Convert normalized WASM coords (0-1) to screen coords
    const screenPos = this.wasmToScreen(wolf.x, wolf.y, camera);
    
    // Calculate wolf size based on type
    const baseSize = this.getWolfSize(wolf.type);
    const size = baseSize * camera.zoom;

    // Compute animation parameters synchronized to movement
    const anim = this.computeAnimParams(wolf, deltaTime);

    // Save context state
    this.ctx.save();

    // Draw wolf body
    this.drawWolfBody(screenPos.x, screenPos.y, size, wolf, anim);

    // Draw wolf head
    this.drawWolfHead(screenPos.x, screenPos.y, size, wolf);

    // Draw legs
    this.drawWolfLegs(screenPos.x, screenPos.y, size, wolf, anim);

    // Draw tail
    this.drawWolfTail(screenPos.x, screenPos.y, size, wolf);

    // Draw overlays
    if (this.showHealthBars) {
      this.drawHealthBar(screenPos.x, screenPos.y, size, wolf);
    }

    if (this.showStateLabels) {
      this.drawStateLabel(screenPos.x, screenPos.y, size, wolf);
    }

    // Restore context
    this.ctx.restore();
  }

  /**
   * Draw wolf body (torso)
   */
  drawWolfBody(x, y, size, wolf, anim) {
    const ctx = this.ctx;
    const color = this.getWolfColor(wolf.type);
    
    // Body dimensions
    const bodyLength = size * 1.2;
    const bodyHeight = size * 0.6;
    const bodyX = x - bodyLength / 2;
    const bodyY = y - bodyHeight / 2;

    // State + speed-based body bounce synced to gait
    const bounce = anim.bodyBounce;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x, 
      y + bounce, 
      bodyLength / 2, 
      bodyHeight / 2, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();

    // Add fur texture (simple stripes)
    ctx.strokeStyle = this.darkenColor(color, 0.2);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const stripeX = bodyX + bodyLength * (0.3 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(stripeX, bodyY);
      ctx.lineTo(stripeX, bodyY + bodyHeight);
      ctx.stroke();
    }
  }

  /**
   * Draw wolf head
   */
  drawWolfHead(x, y, size, wolf) {
    const ctx = this.ctx;
    const color = this.getWolfColor(wolf.type);
    
    // Head position (front of body)
    const headX = x + size * 0.7;
    const headY = y - size * 0.1;
    const headSize = size * 0.4;

    // Draw head circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(headX, headY, headSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw snout
    const snoutLength = headSize * 0.6;
    ctx.beginPath();
    ctx.ellipse(
      headX + headSize * 0.5, 
      headY, 
      snoutLength, 
      headSize * 0.4, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();

    // Draw ears
    this.drawEar(headX - headSize * 0.3, headY - headSize * 0.7, headSize * 0.3, color);
    this.drawEar(headX + headSize * 0.3, headY - headSize * 0.7, headSize * 0.3, color);

    // Draw eyes
    this.drawEye(headX - headSize * 0.2, headY - headSize * 0.2, wolf);
    this.drawEye(headX + headSize * 0.1, headY - headSize * 0.2, wolf);
  }

  /**
   * Draw wolf ear
   */
  drawEar(x, y, size, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * 0.3, y - size);
    ctx.lineTo(x + size * 0.3, y - size * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw wolf eye
   */
  drawEye(x, y, wolf) {
    const ctx = this.ctx;
    const eyeSize = 3;
    
    // Eye color based on state
    let eyeColor = '#ffff00'; // Default: yellow
    if (wolf.state === WOLF_STATES.ATTACK) {
      eyeColor = '#ff0000'; // Red when attacking
    } else if (wolf.state === WOLF_STATES.FLEE) {
      eyeColor = '#ffffff'; // White when fleeing
    }

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(x, y, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + 1, y, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw wolf legs (4 legs with animation)
   */
  drawWolfLegs(x, y, size, wolf, anim) {
    const ctx = this.ctx;
    const color = this.darkenColor(this.getWolfColor(wolf.type), 0.3);
    
    const legLength = size * 0.5;
    const legWidth = size * 0.1;
    const legSpacing = size * 0.4;

    // Animate legs based on actual speed-derived phase
    const walkCycle = anim.walkCycle;
    const isMoving = anim.speed > 0.005;

    // Front legs
    this.drawLeg(x - legSpacing, y, legLength, legWidth, color, isMoving ? walkCycle : 0);
    this.drawLeg(x - legSpacing + size * 0.2, y, legLength, legWidth, color, isMoving ? -walkCycle : 0);

    // Back legs
    this.drawLeg(x + legSpacing - size * 0.6, y, legLength, legWidth, color, isMoving ? -walkCycle : 0);
    this.drawLeg(x + legSpacing - size * 0.4, y, legLength, legWidth, color, isMoving ? walkCycle : 0);
  }

  /**
   * Draw single leg
   */
  drawLeg(x, y, length, width, color, offset) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + offset * 10, y + length);
    ctx.stroke();
  }

  /**
   * Draw wolf tail
   */
  drawWolfTail(x, y, size, wolf) {
    const ctx = this.ctx;
    const color = this.getWolfColor(wolf.type);
    
    // Tail position (back of body)
    const tailStartX = x - size * 0.8;
    const tailStartY = y - size * 0.2;
    
    // Tail animation based on state
    const tailWag = wolf.state === WOLF_STATES.IDLE ? 
      Math.sin(this.animationTime * 5) * 0.3 : 
      0.5; // Raised when alert/attacking

    const tailEndX = tailStartX - size * 0.6;
    const tailEndY = tailStartY - size * tailWag;

    // Draw tail curve
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.15;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(tailStartX, tailStartY);
    ctx.quadraticCurveTo(
      tailStartX - size * 0.3, 
      tailStartY - size * 0.3, 
      tailEndX, 
      tailEndY
    );
    ctx.stroke();

    // Tail tuft
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tailEndX, tailEndY, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw health bar above wolf
   */
  drawHealthBar(x, y, size, wolf) {
    const ctx = this.ctx;
    const barWidth = size * 1.5;
    const barHeight = 4;
    const barY = y - size * 0.8;

    // Background (red)
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

    // Foreground (green) - health percentage
    // Note: Health would come from WASM, using fatigue as proxy
    const healthPercent = Math.max(0, 1 - wolf.fatigue);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);
  }

  /**
   * Draw state label above wolf
   */
  drawStateLabel(x, y, size, wolf) {
    const ctx = this.ctx;
    const labelY = y - size * 1.1;

    // Get state name
    const stateName = this.getStateName(wolf.state);
    const typeName = this.getTypeName(wolf.type);

    // Draw label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const labelWidth = ctx.measureText(`${typeName} ${stateName}`).width + 8;
    ctx.fillRect(x - labelWidth / 2, labelY - 12, labelWidth, 14);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${typeName} ${stateName}`, x, labelY - 5);
  }

  /**
   * Convert WASM normalized coords to screen coords
   */
  wasmToScreen(wasmX, wasmY, camera) {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Apply camera transform
    const relX = (wasmX - camera.x) * camera.zoom;
    const relY = (wasmY - camera.y) * camera.zoom;
    
    return {
      x: canvasWidth / 2 + relX * canvasWidth,
      y: canvasHeight / 2 + relY * canvasHeight
    };
  }

  /**
   * Get wolf size based on type
   */
  getWolfSize(type) {
    switch (type) {
      case WOLF_TYPES.ALPHA: return 50;
      case WOLF_TYPES.SCOUT: return 35;
      case WOLF_TYPES.HUNTER: return 45;
      case WOLF_TYPES.OMEGA: return 38;
      default: return 40; // Normal
    }
  }

  /**
   * Get wolf color based on type
   */
  getWolfColor(type) {
    switch (type) {
      case WOLF_TYPES.ALPHA: return '#8b4513'; // Dark brown
      case WOLF_TYPES.SCOUT: return '#d3d3d3'; // Light gray
      case WOLF_TYPES.HUNTER: return '#696969'; // Dark gray
      case WOLF_TYPES.OMEGA: return '#a9a9a9'; // Medium gray
      default: return '#8b7355'; // Normal brown
    }
  }

  /**
   * Get state-based bounce animation
   */
  getStateBounce(state) {
    if (state === WOLF_STATES.ATTACK) {
      return Math.sin(this.animationTime * 20) * 3;
    } else if (state === WOLF_STATES.ALERT) {
      return Math.sin(this.animationTime * 15) * 2;
    }
    return 0;
  }

  // Compute speed-synchronized animation parameters for a wolf
  computeAnimParams(wolf, deltaTime) {
    const key = wolf.index >>> 0;
    let rec = this._wolfAnim.get(key);
    if (!rec) {
      rec = { phase: 0, lastSpeed: 0 };
      this._wolfAnim.set(key, rec);
    }
    const vx = Number.isFinite(wolf.vx) ? wolf.vx : 0;
    const vy = Number.isFinite(wolf.vy) ? wolf.vy : 0;
    const speed = Math.hypot(vx, vy); // normalized units per second
    // Map speed to stride frequency (cycles/sec). Use nominal stride length ~0.22 world units
    const strideLen = 0.22;
    const rawFreq = strideLen > 1e-4 ? speed / strideLen : 0;
    const freq = Math.min(3.8, Math.max(0, rawFreq));
    // Advance phase in radians
    rec.phase = (rec.phase + (Math.PI * 2) * freq * Math.max(0, deltaTime)) % (Math.PI * 2);
    // Leg swing amplitude scales with speed
    const legAmp = Math.min(0.25, speed * 1.2);
    const walkCycle = Math.sin(rec.phase) * legAmp;
    // Body bounce blends state bounce with speed-based bounce (cap to ~3px)
    const speedBounceMax = 3;
    const speedBounce = Math.sin(rec.phase * 2) * Math.min(speedBounceMax, speed / 0.25 * 1.5);
    const stateBounce = this.getStateBounce(wolf.state);
    const bodyBounce = stateBounce + speedBounce;
    rec.lastSpeed = speed;
    return { phase: rec.phase, speed, walkCycle, bodyBounce };
  }

  /**
   * Check if wolf is in moving state
   */
  isWolfMoving(state) {
    return [
      WOLF_STATES.PATROL,
      WOLF_STATES.APPROACH,
      WOLF_STATES.STRAFE,
      WOLF_STATES.RETREAT,
      WOLF_STATES.FLEE
    ].includes(state);
  }

  /**
   * Get human-readable state name
   */
  getStateName(state) {
    const names = [
      'Idle', 'Patrol', 'Investigate', 'Alert',
      'Approach', 'Strafe', 'Attack', 'Retreat',
      'Recover', 'Flee', 'Ambush', 'Flank'
    ];
    return names[state] || 'Unknown';
  }

  /**
   * Get human-readable type name
   */
  getTypeName(type) {
    const names = ['Wolf', 'Alpha', 'Scout', 'Hunter', 'Omega'];
    return names[type] || 'Wolf';
  }

  /**
   * Darken a hex color by percentage
   */
  darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  /**
   * Toggle debug visualizations
   */
  setDebugMode(options) {
    if (options.healthBars !== undefined) {
      this.showHealthBars = options.healthBars;
    }
    if (options.stateLabels !== undefined) {
      this.showStateLabels = options.stateLabels;
    }
    if (options.packLines !== undefined) {
      this.showPackLines = options.packLines;
    }
    if (options.ranges !== undefined) {
      this.showRanges = options.ranges;
    }
  }
}

