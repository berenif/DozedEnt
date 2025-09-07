/**
 * Roguelike HUD - Comprehensive UI overlay for roguelike gameplay
 * Features health/stamina bars, minimap, inventory, status effects, and combat feedback
 */

export class RoguelikeHUD {
  constructor(gameStateManager, wasmManager, combatFeedback = null) {
    this.gameStateManager = gameStateManager;
    this.wasmManager = wasmManager;
    this.combatFeedback = combatFeedback;
    
    // HUD state
    this.isVisible = true;
    this.hudCombatState = {
      damageNumbers: [],
      hitIndicators: [],
      comboCounter: 0,
      lastComboTime: 0
    };
    
    // Status effects tracking
    this.statusEffects = new Map();
    
    // Initialize HUD elements
    this.initializeHUD();
    this.setupEventListeners();
  }

  /**
   * Initialize HUD DOM structure
   */
  initializeHUD() {
    // Remove existing HUD if present
    const existingHUD = document.getElementById('roguelike-hud');
    if (existingHUD) {
      existingHUD.remove();
    }

    // Create main HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'roguelike-hud';
    hudContainer.className = 'roguelike-hud';
    
    hudContainer.innerHTML = `
      <!-- Top HUD Bar -->
      <div class="hud-top-bar">
        <!-- Health and Stamina -->
        <div class="vitals-panel">
          <div class="vital-bar health-bar">
            <div class="vital-icon">❤️</div>
            <div class="vital-progress">
              <div class="vital-fill health-fill"></div>
              <div class="vital-text">100/100</div>
            </div>
          </div>
          <div class="vital-bar stamina-bar">
            <div class="vital-icon">⚡</div>
            <div class="vital-progress">
              <div class="vital-fill stamina-fill"></div>
              <div class="vital-text">100/100</div>
            </div>
          </div>
        </div>
        
        <!-- Phase and Progress Info -->
        <div class="phase-panel">
          <div class="phase-indicator">
            <div class="phase-name">EXPLORE</div>
            <div class="room-counter">Room 1</div>
          </div>
          <div class="objectives">
            <div class="objective">🎯 Find the exit</div>
          </div>
        </div>
        
        <!-- Minimap -->
        <div class="minimap-panel">
          <div class="minimap-title">Map</div>
          <canvas id="minimap-canvas" width="120" height="120"></canvas>
          <div class="minimap-legend">
            <span class="legend-item player">📍 You</span>
            <span class="legend-item enemy">🔴 Enemy</span>
            <span class="legend-item exit">🚪 Exit</span>
          </div>
        </div>
      </div>
      
      <!-- Left Side Panel -->
      <div class="hud-left-panel">
        <!-- Status Effects -->
        <div class="status-effects-panel">
          <div class="panel-title">Status Effects</div>
          <div id="status-effects-container" class="status-effects-grid">
            <!-- Status effects will be populated dynamically -->
          </div>
        </div>
        
        <!-- Quick Inventory -->
        <div class="quick-inventory-panel">
          <div class="panel-title">Quick Items</div>
          <div class="inventory-slots">
            <div class="inventory-slot" data-slot="0">
              <div class="slot-key">1</div>
              <div class="slot-icon">🗡️</div>
            </div>
            <div class="inventory-slot" data-slot="1">
              <div class="slot-key">2</div>
              <div class="slot-icon">🛡️</div>
            </div>
            <div class="inventory-slot" data-slot="2">
              <div class="slot-key">3</div>
              <div class="slot-icon">🧪</div>
            </div>
            <div class="inventory-slot empty" data-slot="3">
              <div class="slot-key">4</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Side Panel -->
      <div class="hud-right-panel">
        <!-- Combat Feedback -->
        <div class="combat-panel">
          <div class="panel-title">Combat</div>
          <div class="combo-counter">
            <div class="combo-text">COMBO</div>
            <div class="combo-number">0</div>
          </div>
          <div class="combat-stats">
            <div class="stat">
              <span class="stat-label">Hits:</span>
              <span class="stat-value" id="hits-counter">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Blocks:</span>
              <span class="stat-value" id="blocks-counter">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Rolls:</span>
              <span class="stat-value" id="rolls-counter">0</span>
            </div>
          </div>
        </div>
        
        <!-- Currency and Resources -->
        <div class="resources-panel">
          <div class="panel-title">Resources</div>
          <div class="resource-item">
            <div class="resource-icon">🔶</div>
            <div class="resource-label">Gold</div>
            <div class="resource-value" id="gold-value">0</div>
          </div>
          <div class="resource-item">
            <div class="resource-icon">🔷</div>
            <div class="resource-label">Essence</div>
            <div class="resource-value" id="essence-value">0</div>
          </div>
        </div>
      </div>
      
      <!-- Combat Feedback Overlay -->
      <div id="combat-feedback-overlay" class="combat-feedback-overlay">
        <!-- Damage numbers and hit indicators will be spawned here -->
      </div>
      
      <!-- Controls Reference -->
      <div class="controls-reference">
        <div class="controls-toggle" id="controls-toggle">?</div>
        <div class="controls-panel" id="controls-panel">
          <div class="panel-title">Controls</div>
          <div class="control-group">
            <div class="control-section">Movement</div>
            <div class="control-item"><kbd>WASD</kbd> Move</div>
          </div>
          <div class="control-group">
            <div class="control-section">Combat</div>
            <div class="control-item"><kbd>J</kbd> Light Attack</div>
            <div class="control-item"><kbd>K</kbd> Heavy Attack</div>
            <div class="control-item"><kbd>L</kbd> Special</div>
            <div class="control-item"><kbd>Shift</kbd> Block/Parry</div>
            <div class="control-item"><kbd>Space</kbd> Roll</div>
          </div>
        </div>
      </div>
    `;
    
    // Add HUD to the page
    document.body.appendChild(hudContainer);
    
    // Initialize minimap canvas
    this.initializeMinimap();
  }

  /**
   * Initialize minimap canvas and rendering
   */
  initializeMinimap() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (!this.minimapCanvas) {
      console.warn('Minimap canvas element not found');
      return;
    }
    
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    if (!this.minimapCtx) {
      console.error('Failed to get 2D context for minimap canvas');
      return;
    }
    
    // Minimap settings
    this.minimapSettings = {
      scale: 0.1, // World scale for minimap
      playerSize: 3,
      enemySize: 2,
      exploredAlpha: 0.6,
      unexploredAlpha: 0.2
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Controls toggle
    const controlsToggle = document.getElementById('controls-toggle');
    const controlsPanel = document.getElementById('controls-panel');
    
    controlsToggle.addEventListener('click', () => {
      controlsPanel.classList.toggle('visible');
    });
    
    // Hide controls when clicking outside
    document.addEventListener('click', (event) => {
      if (!controlsToggle.contains(event.target) && !controlsPanel.contains(event.target)) {
        controlsPanel.classList.remove('visible');
      }
    });
    
    // Listen for game state changes
    this.gameStateManager.on('phaseChanged', (phase) => {
      this.updatePhaseDisplay(phase);
    });
  }

  /**
   * Update HUD with current game state
   */
  update() {
    if (!this.isVisible || !this.wasmManager) return;
    
    this.updateVitals();
    this.updatePhaseInfo();
    this.updateMinimap();
    this.updateStatusEffects();
    this.updateCombatFeedback();
    this.updateResources();
  }

  /**
   * Update health and stamina bars
   */
  updateVitals() {
    const hp = this.wasmManager.getHP ? this.wasmManager.getHP() : 1;
    const stamina = this.wasmManager.getStamina ? this.wasmManager.getStamina() : 1;
    
    // Update health bar
    const healthFill = document.querySelector('.health-fill');
    const healthText = document.querySelector('.health-bar .vital-text');
    if (healthFill && healthText) {
      const healthPercent = Math.max(0, Math.min(100, hp * 100));
      healthFill.style.width = `${healthPercent}%`;
      healthText.textContent = `${Math.floor(hp * 100)}/100`;
      
      // Add low health warning
      healthFill.classList.toggle('low-health', healthPercent < 25);
      healthFill.classList.toggle('critical-health', healthPercent < 10);
    }
    
    // Update stamina bar
    const staminaFill = document.querySelector('.stamina-fill');
    const staminaText = document.querySelector('.stamina-bar .vital-text');
    if (staminaFill && staminaText) {
      const staminaPercent = Math.max(0, Math.min(100, stamina * 100));
      staminaFill.style.width = `${staminaPercent}%`;
      staminaText.textContent = `${Math.floor(stamina * 100)}/100`;
      
      // Add low stamina warning
      staminaFill.classList.toggle('low-stamina', staminaPercent < 25);
    }
  }

  /**
   * Update phase and room information
   */
  updatePhaseInfo() {
    const phase = this.wasmManager.getPhase ? this.wasmManager.getPhase() : 0;
    const roomCount = this.wasmManager.getRoomCount ? this.wasmManager.getRoomCount() : 1;
    
    const phaseNames = ['EXPLORE', 'FIGHT', 'CHOOSE', 'POWER UP', 'RISK', 'ESCALATE', 'CASH OUT', 'RESET'];
    const phaseName = phaseNames[phase] || 'UNKNOWN';
    
    const phaseNameEl = document.querySelector('.phase-name');
    const roomCounterEl = document.querySelector('.room-counter');
    
    if (phaseNameEl) phaseNameEl.textContent = phaseName;
    if (roomCounterEl) roomCounterEl.textContent = `Room ${roomCount}`;
  }

  /**
   * Update minimap display
   */
  updateMinimap() {
    if (!this.minimapCtx) return;
    
    const ctx = this.minimapCtx;
    const canvas = this.minimapCanvas;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Get player position
    const playerX = this.wasmManager.getX ? this.wasmManager.getX() : 0.5;
    const playerY = this.wasmManager.getY ? this.wasmManager.getY() : 0.5;
    
    // Convert to minimap coordinates
    const mapPlayerX = playerX * canvas.width;
    const mapPlayerY = playerY * canvas.height;
    
    // Draw explored area (simplified - just a circle around player)
    ctx.fillStyle = 'rgba(64, 64, 64, 0.3)';
    ctx.beginPath();
    ctx.arc(mapPlayerX, mapPlayerY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.arc(mapPlayerX, mapPlayerY, this.minimapSettings.playerSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction indicator
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapPlayerX, mapPlayerY);
    ctx.lineTo(mapPlayerX + 8, mapPlayerY);
    ctx.stroke();
    
    // TODO: Draw enemies, exits, and other points of interest when available
  }

  /**
   * Update status effects display
   */
  updateStatusEffects() {
    const container = document.getElementById('status-effects-container');
    if (!container) return;
    
    // Clear existing effects
    container.innerHTML = '';
    
    // TODO: Get actual status effects from WASM when available
    // For now, show placeholder effects based on game state
    const phase = this.wasmManager.getPhase ? this.wasmManager.getPhase() : 0;
    
    if (phase === 4) { // Risk phase
      this.addStatusEffect(container, {
        icon: '💀',
        name: 'Risk',
        description: 'Taking risks for greater rewards',
        duration: -1, // Permanent during phase
        type: 'neutral'
      });
    }
    
    if (this.wasmManager.getStamina && this.wasmManager.getStamina() < 0.25) {
      this.addStatusEffect(container, {
        icon: '😰',
        name: 'Exhausted',
        description: 'Low stamina - reduced movement speed',
        duration: -1,
        type: 'debuff'
      });
    }
  }

  /**
   * Add a status effect to the display
   */
  addStatusEffect(container, effect) {
    const effectEl = document.createElement('div');
    effectEl.className = `status-effect ${effect.type}`;
    effectEl.title = `${effect.name}: ${effect.description}`;
    
    effectEl.innerHTML = `
      <div class="effect-icon">${effect.icon}</div>
      <div class="effect-name">${effect.name}</div>
      ${effect.duration > 0 ? `<div class="effect-duration">${Math.ceil(effect.duration)}s</div>` : ''}
    `;
    
    container.appendChild(effectEl);
  }

  /**
   * Update combat feedback and statistics
   */
  updateCombatFeedback() {
    // Update combo counter
    const comboNumber = document.querySelector('.combo-number');
    if (comboNumber) {
      // Get combo count from combat feedback system if available
      const comboCount = this.combatFeedback?.getComboState?.()?.count || this.hudCombatState.comboCounter;
      comboNumber.textContent = comboCount;
    }
    
    // Animate damage numbers and hit indicators
    this.animateCombatFeedback();
  }

  /**
   * Update resource displays
   */
  updateResources() {
    const goldValue = document.getElementById('gold-value');
    const essenceValue = document.getElementById('essence-value');
    
    if (goldValue && this.wasmManager.getGold) {
      goldValue.textContent = this.wasmManager.getGold();
    }
    
    if (essenceValue && this.wasmManager.getEssence) {
      essenceValue.textContent = this.wasmManager.getEssence();
    }
  }

  /**
   * Animate combat feedback elements
   */
  animateCombatFeedback() {
    const overlay = document.getElementById('combat-feedback-overlay');
    if (!overlay) return;
    
    // Update existing damage numbers
    this.hudCombatState.damageNumbers.forEach((damage, index) => {
      damage.element.style.transform = `translate(${damage.x}px, ${damage.y}px)`;
      damage.element.style.opacity = damage.opacity;
      
      // Update position and fade
      damage.y -= 2;
      damage.opacity -= 0.02;
      
      // Remove if faded out
      if (damage.opacity <= 0) {
        damage.element.remove();
        this.hudCombatState.damageNumbers.splice(index, 1);
      }
    });
  }

  /**
   * Show damage number at position
   */
  showDamageNumber(x, y, damage, type = 'damage') {
    const overlay = document.getElementById('combat-feedback-overlay');
    if (!overlay) return;
    
    const damageEl = document.createElement('div');
    damageEl.className = `damage-number ${type}`;
    damageEl.textContent = Math.floor(damage);
    damageEl.style.left = `${x}px`;
    damageEl.style.top = `${y}px`;
    
    overlay.appendChild(damageEl);
    
    // Add to tracking array
    this.hudCombatState.damageNumbers.push({
      element: damageEl,
      x: x,
      y: y,
      opacity: 1.0
    });
  }

  /**
   * Update phase display
   */
  updatePhaseDisplay(phase) {
    const phaseNames = ['EXPLORE', 'FIGHT', 'CHOOSE', 'POWER UP', 'RISK', 'ESCALATE', 'CASH OUT', 'RESET'];
    const phaseName = phaseNames[phase] || 'UNKNOWN';
    
    const phaseNameEl = document.querySelector('.phase-name');
    if (phaseNameEl) {
      phaseNameEl.textContent = phaseName;
      
      // Add phase-specific styling
      phaseNameEl.className = `phase-name phase-${phase}`;
    }
  }

  /**
   * Show/hide HUD
   */
  setVisible(visible) {
    this.isVisible = visible;
    const hud = document.getElementById('roguelike-hud');
    if (hud) {
      hud.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Cleanup and destroy HUD
   */
  destroy() {
    const hud = document.getElementById('roguelike-hud');
    if (hud) {
      hud.remove();
    }
    
    // Clear combat feedback
    this.hudCombatState.damageNumbers.forEach(damage => {
      if (damage.element) damage.element.remove();
    });
    this.hudCombatState.damageNumbers = [];
  }
}
