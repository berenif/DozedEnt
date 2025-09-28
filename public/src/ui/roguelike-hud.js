/**
 * Roguelike HUD - Comprehensive UI overlay for roguelike gameplay
 * Features health/stamina bars, minimap, inventory, status effects, and combat feedback
 */

export class RoguelikeHUD {
  constructor(gameStateManager, wasmManager) {
    this.gameStateManager = gameStateManager;
    this.wasmManager = wasmManager;
    
    // HUD state
    this.isVisible = true;
    
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
        
        <!-- Status Panel -->
        <div class="status-panel">
          <div class="panel-title">Status</div>
          <!-- Status information can be added here if needed -->
        </div>
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
      exitSize: 3,
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

    this.controlsToggle = controlsToggle;
    this.controlsToggleClickHandler = () => {
      controlsPanel.classList.toggle('visible');
    };
    controlsToggle.addEventListener('click', this.controlsToggleClickHandler);

    // Hide controls when clicking outside
    this.documentClickHandler = (event) => {
      if (!controlsToggle.contains(event.target) && !controlsPanel.contains(event.target)) {
        controlsPanel.classList.remove('visible');
      }
    };
    document.addEventListener('click', this.documentClickHandler);

    // Listen for game state changes
    this.phaseChangedHandler = (phase) => {
      this.updatePhaseDisplay(phase);
    };
    this.gameStateManager.on('phaseChanged', this.phaseChangedHandler);
  }

  /**
   * Update HUD with current game state
   */
  update() {
    if (!this.isVisible || !this.wasmManager) {return;}
    
    this.updateVitals();
    this.updatePhaseInfo();
    this.updateMinimap();
    this.updateStatusEffects();
    this.updateStatus();
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
    
    if (phaseNameEl) {phaseNameEl.textContent = phaseName;}
    if (roomCounterEl) {roomCounterEl.textContent = `Room ${roomCount}`;}
  }

  /**
   * Update minimap display
   */
  updateMinimap() {
    if (!this.minimapCtx) {return;}
    
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

    // Draw enemies
    if (this.wasmManager.getEnemyPositions) {
      try {
        const enemies = this.wasmManager.getEnemyPositions();
        ctx.fillStyle = '#e74c3c';
        enemies.forEach(enemy => {
          const ex = enemy.x * canvas.width;
          const ey = enemy.y * canvas.height;
          ctx.beginPath();
          ctx.arc(ex, ey, this.minimapSettings.enemySize, 0, Math.PI * 2);
          ctx.fill();
        });
      } catch (error) {
        console.error('Error drawing enemies on minimap:', error);
      }
    }

    // Draw exits
    if (this.wasmManager.getExitPositions) {
      try {
        const exits = this.wasmManager.getExitPositions();
        ctx.fillStyle = '#2ecc71';
        exits.forEach(exit => {
          const ex = exit.x * canvas.width;
          const ey = exit.y * canvas.height;
          const size = this.minimapSettings.exitSize;
          ctx.fillRect(ex - size, ey - size, size * 2, size * 2);
        });
      } catch (error) {
        console.error('Error drawing exits on minimap:', error);
      }
    }
  }

  /**
   * Update status effects display
   */
  updateStatusEffects() {
    // Get status effects from WASM if available
    let effects = [];
    if (this.wasmManager.getStatusEffects) {
      try {
        effects = this.wasmManager.getStatusEffects() || [];
      } catch (error) {
        console.warn('Error getting status effects from WASM:', error);
      }
    }

    // Update status effects in the UI
    const statusPanel = document.querySelector('.status-panel');
    if (!statusPanel) return;

    // Clear existing status effects
    const existingEffects = statusPanel.querySelectorAll('.status-effect');
    existingEffects.forEach(effect => effect.remove());

    // Add current status effects
    effects.forEach(effect => {
      const effectElement = document.createElement('div');
      effectElement.className = 'status-effect';
      effectElement.innerHTML = `
        <div class="effect-icon">${effect.icon || '⚡'}</div>
        <div class="effect-name">${effect.name || 'Unknown Effect'}</div>
        <div class="effect-duration">${effect.duration || ''}</div>
      `;
      
      // Add effect-specific styling
      if (effect.type) {
        effectElement.classList.add(`effect-${effect.type}`);
      }
      
      statusPanel.appendChild(effectElement);
    });
  }

  /**
   * Update status displays (resource display removed)
   */
  updateStatus() {
    // Status update logic can be added here if needed
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

    // Remove event listeners
    if (this.controlsToggle && this.controlsToggleClickHandler) {
      this.controlsToggle.removeEventListener('click', this.controlsToggleClickHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
    }
    if (this.phaseChangedHandler && this.gameStateManager?.off) {
      this.gameStateManager.off('phaseChanged', this.phaseChangedHandler);
    }

    // Clear combat feedback
    this.hudCombatState.damageNumbers.forEach(damage => {
      if (damage.element?.remove) {damage.element.remove();}
    });
    this.hudCombatState.damageNumbers = [];
  }
}
