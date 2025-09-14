/**
 * Modern Roguelite UI - Enhanced browser-based UI for roguelite gameplay
 * Follows WASM-first architecture: JavaScript only handles rendering, input forwarding, and UI state
 * All game logic and state management remains in WASM
 */

export class ModernRogueliteUI {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    
    // UI State (visual only - no game logic)
    this.isVisible = true;
    this.currentMenu = null;
    this.animationSettings = {
      reduceMotion: false,
      screenShake: true
    };
    
    // Performance tracking
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Input state (forwarded to WASM)
    this.inputState = {
      movement: { x: 0, y: 0 },
      actions: new Set(),
      keybinds: new Map()
    };
    
    // Animation queues
    this.damageNumbers = [];
    this.pickupNotifications = [];
    this.screenEffects = [];
    
    this.initializeUI();
    this.setupInputHandling();
    this.startRenderLoop();
  }

  /**
   * Initialize the complete UI system
   */
  initializeUI() {
    this.createHUDLayout();
    this.createMenuOverlays();
    this.initializeAnimationSystems();
    this.setupAccessibilityFeatures();
  }

  /**
   * Create the core HUD layout following the specification
   */
  createHUDLayout() {
    // Remove any existing UI
    const existing = document.getElementById('modern-roguelite-ui');
    if (existing) {
      existing.remove();
    }

    const uiContainer = document.createElement('div');
    uiContainer.id = 'modern-roguelite-ui';
    uiContainer.className = 'modern-roguelite-ui';
    
    uiContainer.innerHTML = `
      <!-- Core Game View -->
      <div class="game-viewport" id="game-viewport">
        <canvas id="game-canvas" class="game-canvas"></canvas>
        
        <!-- HUD Overlay -->
        <div class="hud-overlay" id="hud-overlay">
          
          <!-- Top-Left: Health/Shield/Status -->
          <div class="hud-top-left">
            <div class="player-vitals">
              <!-- Health Bar -->
              <div class="vital-container health-container">
                <div class="vital-bar health-bar">
                  <div class="vital-background"></div>
                  <div class="vital-fill health-fill" id="health-fill"></div>
                  <div class="damage-ripple" id="damage-ripple"></div>
                </div>
                <div class="vital-text health-text" id="health-text">100</div>
                <div class="vital-icon health-icon">❤️</div>
              </div>
              
              <!-- Shield Bar -->
              <div class="vital-container shield-container">
                <div class="vital-bar shield-bar">
                  <div class="vital-background"></div>
                  <div class="vital-fill shield-fill" id="shield-fill"></div>
                </div>
                <div class="vital-text shield-text" id="shield-text">50</div>
                <div class="vital-icon shield-icon">🛡️</div>
              </div>
            </div>
            
            <!-- Status Effects -->
            <div class="status-effects-container" id="status-effects">
              <!-- Dynamically populated status effects -->
            </div>
          </div>
          
          <!-- Top-Right: Minimap + Objective -->
          <div class="hud-top-right">
            <div class="minimap-container" id="minimap-container">
              <div class="minimap-wrapper">
                <canvas id="minimap-canvas" class="minimap" width="120" height="120"></canvas>
                <div class="objective-breadcrumb" id="objective-breadcrumb">
                  <svg class="breadcrumb-svg" viewBox="0 0 120 120">
                    <path id="breadcrumb-path" class="breadcrumb-line" />
                  </svg>
                </div>
              </div>
              
              <!-- Expanded minimap on hover -->
              <div class="minimap-expanded" id="minimap-expanded">
                <canvas id="minimap-large" class="minimap-large" width="240" height="240"></canvas>
              </div>
            </div>
          </div>
          
          <!-- Bottom-Center: Ability Bar -->
          <div class="hud-bottom-center">
            <div class="ability-bar">
              
              <!-- Basic Abilities -->
              <div class="ability-group basic-abilities">
                ${this.createAbilitySlot('Q', 'ability-1', 'light-attack')}
                ${this.createAbilitySlot('W', 'ability-2', 'heavy-attack')}
                ${this.createAbilitySlot('E', 'ability-3', 'special-attack')}
              </div>
              
              <!-- Ultimate Ability -->
              <div class="ultimate-container">
                <div class="ultimate-slot" data-slot="ultimate">
                  <div class="ultimate-background"></div>
                  <div class="ultimate-icon">R</div>
                  <svg class="ultimate-charge-ring" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" class="charge-track"/>
                    <circle cx="40" cy="40" r="36" class="charge-fill" id="ultimate-charge"/>
                  </svg>
                  <div class="keybind-label">R</div>
                </div>
              </div>
              
              <!-- Consumables -->
              <div class="ability-group consumables">
                ${this.createConsumableSlot('1', 'consumable-1', '🧪', 3)}
                ${this.createConsumableSlot('2', 'consumable-2', '💊', 1)}
              </div>
              
              <!-- Defense Actions -->
              <div class="ability-group defense-actions">
                ${this.createAbilitySlot('SHIFT', 'block', 'block')}
                ${this.createAbilitySlot('CTRL', 'roll', 'dodge-roll')}
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Screen Effects -->
        <div class="screen-effects" id="screen-effects">
          <div class="damage-vignette" id="damage-vignette"></div>
          <div class="screen-shake-container" id="screen-shake"></div>
        </div>
        
        <!-- Floating UI Elements -->
        <div class="floating-ui" id="floating-ui">
          <div class="damage-numbers" id="damage-numbers"></div>
          <div class="pickup-notifications" id="pickup-notifications"></div>
        </div>
      </div>
      
      <!-- Menu Overlays -->
      <div class="menu-system" id="menu-system">
        <!-- Pause Menu -->
        <div class="menu-overlay pause-menu hidden" id="pause-menu">
          <div class="menu-backdrop"></div>
          <div class="menu-container">
            <div class="menu-header">
              <h2>Game Paused</h2>
              <button class="close-menu" data-menu="pause-menu">×</button>
            </div>
            
            <div class="menu-tabs">
              <button class="tab-button active" data-tab="inventory">Inventory</button>
              <button class="tab-button" data-tab="character">Character</button>
              <button class="tab-button" data-tab="map">Map</button>
              <button class="tab-button" data-tab="settings">Settings</button>
            </div>
            
            <div class="menu-content">
              <div class="tab-panel active" id="inventory-tab">
                <div class="inventory-grid" id="inventory-grid">
                  <!-- Dynamically populated inventory -->
                </div>
              </div>
              
              <div class="tab-panel" id="character-tab">
                <div class="character-sheet" id="character-sheet">
                  <!-- Character stats and equipment -->
                </div>
              </div>
              
              <div class="tab-panel" id="map-tab">
                <canvas id="full-map-canvas" class="full-map"></canvas>
              </div>
              
              <div class="tab-panel" id="settings-tab">
                <div class="settings-panel" id="settings-panel">
                  <!-- Settings content will be populated by setupAccessibilityFeatures -->
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Meta Progression Screen -->
        <div class="menu-overlay meta-progression hidden" id="meta-progression">
          <div class="meta-container">
            <div class="meta-header">
              <h1>Meta Progression</h1>
            </div>
            
            <div class="currency-display">
              <div class="currency-item banked">
                <div class="currency-icon">💎</div>
                <div class="currency-amount" id="banked-currency">0</div>
                <div class="currency-label">Banked</div>
              </div>
              <div class="currency-separator">vs</div>
              <div class="currency-item spent">
                <div class="currency-icon">💰</div>
                <div class="currency-amount" id="spent-currency">0</div>
                <div class="currency-label">Spent</div>
              </div>
            </div>
            
            <div class="upgrade-tracks">
              ${this.createUpgradeTrack('power', 'Power', '⚔️', 40)}
              ${this.createUpgradeTrack('defense', 'Defense', '🛡️', 20)}
              ${this.createUpgradeTrack('utility', 'Utility', '🔧', 60)}
            </div>
            
            <button class="btn-primary btn-large" id="start-new-run">Start New Run</button>
          </div>
        </div>
        
        <!-- Run Summary Screen -->
        <div class="menu-overlay run-summary hidden" id="run-summary">
          <div class="summary-container">
            <div class="summary-header">
              <h1>Run Complete</h1>
            </div>
            
            <div class="death-info">
              <div class="death-cause">
                <span class="label">Cause of Death:</span>
                <span class="value" id="death-cause-text">Unknown</span>
              </div>
            </div>
            
            <div class="run-highlights">
              <div class="top-stat">
                <div class="stat-value" id="top-stat-value">0</div>
                <div class="stat-label" id="top-stat-label">Damage Dealt</div>
              </div>
              
              <div class="standout-moment">
                <div class="moment-icon">⚡</div>
                <div class="moment-text" id="standout-moment">No special moments recorded</div>
              </div>
            </div>
            
            <div class="rewards-section">
              <h3>Rewards Earned</h3>
              <div class="rewards-list" id="rewards-list">
                <!-- Dynamically populated rewards -->
              </div>
            </div>
            
            <div class="summary-actions">
              <button class="btn-secondary" id="view-detailed-stats">Detailed Stats</button>
              <button class="btn-primary" id="continue-to-meta">Continue</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Input Remapping Overlay -->
      <div class="menu-overlay keybind-overlay hidden" id="keybind-overlay">
        <div class="keybind-container">
          <h2>Configure Controls</h2>
          <div class="keybind-list" id="keybind-list">
            <!-- Dynamically populated keybinds -->
          </div>
          <div class="keybind-actions">
            <button class="btn-secondary" id="reset-keybinds">Reset to Defaults</button>
            <button class="btn-primary" id="save-keybinds">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(uiContainer);
    
    // Initialize canvas contexts
    this.initializeCanvases();
  }

  /**
   * Create an ability slot HTML
   */
  createAbilitySlot(key, id, type) {
    return `
      <div class="ability-slot" data-slot="${id}" data-type="${type}">
        <div class="ability-background"></div>
        <div class="ability-icon">${key}</div>
        <svg class="cooldown-ring" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="26" class="cooldown-track"/>
          <circle cx="30" cy="30" r="26" class="cooldown-fill" id="${id}-cooldown"/>
        </svg>
        <div class="keybind-label">${key}</div>
      </div>
    `;
  }

  /**
   * Create a consumable slot HTML
   */
  createConsumableSlot(key, id, icon, count) {
    return `
      <div class="consumable-slot" data-slot="${id}">
        <div class="consumable-background"></div>
        <div class="consumable-icon">${icon}</div>
        <div class="consumable-count" id="${id}-count">${count}</div>
        <div class="keybind-label">${key}</div>
      </div>
    `;
  }

  /**
   * Create upgrade track HTML
   */
  createUpgradeTrack(id, name, icon, progress) {
    return `
      <div class="upgrade-track" data-track="${id}">
        <div class="track-header">
          <div class="track-icon">${icon}</div>
          <h3 class="track-name">${name}</h3>
        </div>
        <div class="track-progress-bar">
          <div class="track-fill" style="width: ${progress}%"></div>
        </div>
        <div class="track-nodes">
          ${Array(5).fill(0).map((_, i) => 
            `<div class="track-node ${i < Math.floor(progress/20) ? 'unlocked' : ''}"></div>`
          ).join('')}
        </div>
        <button class="upgrade-button" data-track="${id}">Upgrade (250 💎)</button>
      </div>
    `;
  }

  /**
   * Initialize canvas contexts for rendering
   */
  initializeCanvases() {
    // Main game canvas
    this.gameCanvas = document.getElementById('game-canvas');
    this.gameCtx = this.gameCanvas?.getContext('2d');
    
    // Minimap canvases
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas?.getContext('2d');
    
    this.minimapLargeCanvas = document.getElementById('minimap-large');
    this.minimapLargeCtx = this.minimapLargeCanvas?.getContext('2d');
    
    // Full map canvas
    this.fullMapCanvas = document.getElementById('full-map-canvas');
    this.fullMapCtx = this.fullMapCanvas?.getContext('2d');
    
    // Set up canvas sizing and DPI scaling
    this.setupCanvasScaling();
  }

  /**
   * Setup high-DPI canvas scaling for crisp rendering
   */
  setupCanvasScaling() {
    const canvases = [this.gameCanvas, this.minimapCanvas, this.minimapLargeCanvas, this.fullMapCanvas];
    const dpr = window.devicePixelRatio || 1;
    
    canvases.forEach(canvas => {
      if (!canvas) {
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    });
  }

  /**
   * Create menu overlay system
   */
  createMenuOverlays() {
    // Menu navigation and state management
    this.setupMenuNavigation();
    
    // Tab system for pause menu
    this.setupTabSystem();
  }

  /**
   * Setup menu navigation and event handling
   */
  setupMenuNavigation() {
    // Close menu buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-menu')) {
        const menuId = e.target.dataset.menu;
        this.hideMenu(menuId);
      }
    });
    
    // ESC key to close menus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.currentMenu) {
          this.hideMenu(this.currentMenu);
        } else {
          this.showMenu('pause-menu');
        }
      }
    });
  }

  /**
   * Setup tab system for pause menu
   */
  setupTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Update active states
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${tabId}-tab`)?.classList.add('active');
      });
    });
  }

  /**
   * Initialize animation systems
   */
  initializeAnimationSystems() {
    // Damage number system
    this.damageNumberPool = [];
    
    // Pickup notification system  
    this.pickupNotificationPool = [];
    
    // Screen effect system
    this.screenEffectTimers = new Map();
  }

  /**
   * Setup accessibility features
   */
  setupAccessibilityFeatures() {
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) {
      return;
    }
    
    settingsPanel.innerHTML = `
      <!-- Gameplay Settings -->
      <div class="settings-section">
        <h3>Gameplay</h3>
        <div class="setting-item">
          <label for="screen-shake-toggle">Screen Shake</label>
          <input type="checkbox" id="screen-shake-toggle" checked>
        </div>
      </div>
      
      <!-- Accessibility Settings -->
      <div class="settings-section">
        <h3>Accessibility</h3>
        <div class="setting-item">
          <label for="text-scale-slider">Text Scale</label>
          <input type="range" id="text-scale-slider" min="80" max="150" value="100">
          <span class="setting-value" id="text-scale-value">100%</span>
        </div>
        <div class="setting-item">
          <label for="colorblind-select">Colorblind Mode</label>
          <select id="colorblind-select">
            <option value="none">None</option>
            <option value="protanopia">Protanopia</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="tritanopia">Tritanopia</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="reduce-motion-toggle">Reduce Motion</label>
          <input type="checkbox" id="reduce-motion-toggle">
        </div>
      </div>
      
      <!-- Controls -->
      <div class="settings-section">
        <h3>Controls</h3>
        <button id="configure-keybinds" class="btn-primary">Configure Keybinds</button>
        <div class="control-info">
          <p>Controller support: ${this.detectControllerSupport() ? 'Available' : 'Not detected'}</p>
          <p>Touch controls: ${this.isTouchDevice() ? 'Enabled' : 'Not available'}</p>
        </div>
      </div>
    `;
    
    this.setupAccessibilityEventListeners();
  }

  /**
   * Setup event listeners for accessibility features
   */
  setupAccessibilityEventListeners() {
    // Text scaling
    const textScaleSlider = document.getElementById('text-scale-slider');
    const textScaleValue = document.getElementById('text-scale-value');
    
    if (textScaleSlider && textScaleValue) {
      textScaleSlider.addEventListener('input', (e) => {
        const scale = e.target.value;
        textScaleValue.textContent = scale + '%';
        document.documentElement.style.setProperty('--text-scale', scale / 100);
      });
    }
    
    // Colorblind mode
    const colorblindSelect = document.getElementById('colorblind-select');
    if (colorblindSelect) {
      colorblindSelect.addEventListener('change', (e) => {
        this.applyColorblindFilter(e.target.value);
      });
    }
    
    // Reduce motion
    const reduceMotionToggle = document.getElementById('reduce-motion-toggle');
    if (reduceMotionToggle) {
      reduceMotionToggle.addEventListener('change', (e) => {
        this.animationSettings.reduceMotion = e.target.checked;
        document.documentElement.classList.toggle('reduce-motion', e.target.checked);
      });
    }
    
    // Screen shake
    const screenShakeToggle = document.getElementById('screen-shake-toggle');
    if (screenShakeToggle) {
      screenShakeToggle.addEventListener('change', (e) => {
        this.animationSettings.screenShake = e.target.checked;
      });
    }
    
    // Keybind configuration
    const configureKeybinds = document.getElementById('configure-keybinds');
    if (configureKeybinds) {
      configureKeybinds.addEventListener('click', () => {
        this.showKeybindConfiguration();
      });
    }
  }

  /**
   * Setup input handling (forwarded to WASM)
   */
  setupInputHandling() {
    // Keyboard input
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse input
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    
    // Touch input (basic support)
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    
    // Controller support
    window.addEventListener('gamepadconnected', (e) => this.handleControllerConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this.handleControllerDisconnect(e));
    
    // Initialize default keybinds
    this.initializeDefaultKeybinds();
  }

  /**
   * Initialize default keybind mappings
   */
  initializeDefaultKeybinds() {
    this.inputState.keybinds = new Map([
      ['KeyW', 'move-up'],
      ['KeyA', 'move-left'],
      ['KeyS', 'move-down'],
      ['KeyD', 'move-right'],
      ['KeyJ', 'light-attack'],
      ['KeyK', 'heavy-attack'],
      ['KeyL', 'special-attack'],
      ['ShiftLeft', 'block'],
      ['ControlLeft', 'roll'],
      ['KeyR', 'ultimate'],
      ['Digit1', 'consumable-1'],
      ['Digit2', 'consumable-2'],
      ['Escape', 'pause'],
      ['KeyI', 'inventory'],
      ['KeyM', 'map']
    ]);
  }

  /**
   * Handle keyboard input and forward to WASM
   */
  handleKeyDown(e) {
    const action = this.inputState.keybinds.get(e.code);
    if (!action) {
      return;
    }
    
    // Prevent default for game keys
    if (this.isGameKey(e.code)) {
      e.preventDefault();
    }
    
    // Add to active actions
    this.inputState.actions.add(action);
    
    // Handle movement
    this.updateMovementInput();
    
    // Forward to WASM (example - actual implementation depends on WASM API)
    if (this.wasmManager && this.wasmManager.handleInput) {
      this.wasmManager.handleInput(action, true);
    }
  }

  /**
   * Handle keyboard input release
   */
  handleKeyUp(e) {
    const action = this.inputState.keybinds.get(e.code);
    if (!action) {
      return;
    }
    
    // Remove from active actions
    this.inputState.actions.delete(action);
    
    // Handle movement
    this.updateMovementInput();
    
    // Forward to WASM
    if (this.wasmManager && this.wasmManager.handleInput) {
      this.wasmManager.handleInput(action, false);
    }
  }

  /**
   * Update movement input based on active keys
   */
  updateMovementInput() {
    let x = 0;
    let y = 0;
    
    if (this.inputState.actions.has('move-left')) {
      x -= 1;
    }
    if (this.inputState.actions.has('move-right')) {
      x += 1;
    }
    if (this.inputState.actions.has('move-up')) {
      y -= 1;
    }
    if (this.inputState.actions.has('move-down')) {
      y += 1;
    }
    
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    this.inputState.movement = { x, y };
  }

  /**
   * Start the main render loop
   */
  startRenderLoop() {
    const renderFrame = (timestamp) => {
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      
      // Update UI based on WASM state
      this.updateFromWASM();
      
      // Update animations
      this.updateAnimations(deltaTime);
      
      // Render frame
      this.render(deltaTime);
      
      // Performance tracking
      this.frameCount++;
      
      requestAnimationFrame(renderFrame);
    };
    
    requestAnimationFrame(renderFrame);
  }

  /**
   * Update UI state from WASM (read-only)
   */
  updateFromWASM() {
    if (!this.wasmManager) {
      return;
    }
    
    // Update vitals
    this.updateVitalsDisplay();
    
    // Update ability cooldowns
    this.updateAbilityCooldowns();
    
    // Update minimap
    this.updateMinimap();
    
    // Update phase information
    this.updatePhaseDisplay();
    
    // Update status effects
    this.updateStatusEffects();
  }

  /**
   * Update health and shield displays
   */
  updateVitalsDisplay() {
    // Get values from WASM
    const health = this.wasmManager.getHP ? this.wasmManager.getHP() : 1;
    const shield = this.wasmManager.getShield ? this.wasmManager.getShield() : 0;
    
    // Update health bar
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    
    if (healthFill && healthText) {
      const healthPercent = Math.max(0, Math.min(100, health * 100));
      healthFill.style.width = `${healthPercent}%`;
      healthText.textContent = Math.floor(health * 100).toString();
      
      // Add warning states
      healthFill.classList.toggle('low', healthPercent < 25);
      healthFill.classList.toggle('critical', healthPercent < 10);
    }
    
    // Update shield bar
    const shieldFill = document.getElementById('shield-fill');
    const shieldText = document.getElementById('shield-text');
    
    if (shieldFill && shieldText) {
      const shieldPercent = Math.max(0, Math.min(100, shield * 100));
      shieldFill.style.width = `${shieldPercent}%`;
      shieldText.textContent = Math.floor(shield * 100).toString();
    }
  }

  /**
   * Update ability cooldown displays
   */
  updateAbilityCooldowns() {
    const abilities = ['ability-1', 'ability-2', 'ability-3', 'ultimate'];
    
    abilities.forEach(abilityId => {
      const cooldownElement = document.getElementById(`${abilityId}-cooldown`);
      if (!cooldownElement) {
        return;
      }
      
      // Get cooldown from WASM (example - actual API may differ)
      const cooldownPercent = this.wasmManager.getAbilityCooldown ? 
        this.wasmManager.getAbilityCooldown(abilityId) : 0;
      
      // Update cooldown ring
      const circumference = 2 * Math.PI * 26; // radius = 26
      const offset = circumference * (1 - cooldownPercent);
      
      cooldownElement.style.strokeDasharray = circumference;
      cooldownElement.style.strokeDashoffset = offset;
      
      // Add ready state
      const slot = cooldownElement.closest('.ability-slot, .ultimate-slot');
      slot?.classList.toggle('ready', cooldownPercent >= 1);
    });
  }

  /**
   * Update minimap display
   */
  updateMinimap() {
    if (!this.minimapCtx) {
      return;
    }
    
    const ctx = this.minimapCtx;
    const canvas = this.minimapCanvas;
    
    // Clear canvas
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Get player position from WASM
    const playerX = this.wasmManager.getX ? this.wasmManager.getX() : 0.5;
    const playerY = this.wasmManager.getY ? this.wasmManager.getY() : 0.5;
    
    // Convert to canvas coordinates
    const canvasX = playerX * canvas.width;
    const canvasY = playerY * canvas.height;
    
    // Draw explored area
    ctx.fillStyle = 'rgba(64, 64, 64, 0.3)';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw objective breadcrumb if available
    this.updateObjectiveBreadcrumb(canvasX, canvasY);
  }

  /**
   * Update objective breadcrumb line
   */
  updateObjectiveBreadcrumb(playerX, playerY) {
    const breadcrumbPath = document.getElementById('breadcrumb-path');
    if (!breadcrumbPath) {
      return;
    }
    
    // Get objective position from WASM (example)
    const objectiveX = this.wasmManager.getObjectiveX ? this.wasmManager.getObjectiveX() : 0.8;
    const objectiveY = this.wasmManager.getObjectiveY ? this.wasmManager.getObjectiveY() : 0.2;
    
    const objCanvasX = objectiveX * 120;
    const objCanvasY = objectiveY * 120;
    
    // Create curved path
    const pathData = `M ${playerX} ${playerY} Q ${(playerX + objCanvasX) / 2} ${(playerY + objCanvasY) / 2 - 20} ${objCanvasX} ${objCanvasY}`;
    breadcrumbPath.setAttribute('d', pathData);
  }

  /**
   * Update animations
   */
  updateAnimations(deltaTime) {
    if (this.animationSettings.reduceMotion) {
      return;
    }
    
    // Update damage numbers
    this.updateDamageNumbers(deltaTime);
    
    // Update pickup notifications
    this.updatePickupNotifications(deltaTime);
    
    // Update screen effects
    this.updateScreenEffects(deltaTime);
  }

  /**
   * Update damage number animations
   */
  updateDamageNumbers(deltaTime) {
    this.damageNumbers = this.damageNumbers.filter(damage => {
      damage.lifetime -= deltaTime;
      
      if (damage.lifetime <= 0) {
        damage.element.remove();
        return false;
      }
      
      // Animate position and opacity
      const progress = 1 - (damage.lifetime / damage.maxLifetime);
      const y = damage.startY - (progress * 50);
      const opacity = Math.max(0, 1 - progress);
      
      damage.element.style.transform = `translate(${damage.x}px, ${y}px)`;
      damage.element.style.opacity = opacity;
      
      return true;
    });
  }

  /**
   * Show damage number at position
   */
  showDamageNumber(damage, x, y, isCrit = false) {
    if (this.animationSettings.reduceMotion) {
      return;
    }
    
    const container = document.getElementById('damage-numbers');
    if (!container) {
      return;
    }
    
    const damageEl = document.createElement('div');
    damageEl.className = `damage-number ${isCrit ? 'critical' : ''}`;
    damageEl.textContent = Math.floor(damage).toString();
    damageEl.style.transform = `translate(${x}px, ${y}px)`;
    
    container.appendChild(damageEl);
    
    // Add to animation queue
    this.damageNumbers.push({
      element: damageEl,
      x: x,
      startY: y,
      lifetime: 2000,
      maxLifetime: 2000
    });
  }

  /**
   * Show pickup notification
   */
  showPickupNotification(item, icon) {
    const container = document.getElementById('pickup-notifications');
    if (!container) {
      return;
    }
    
    const pickupEl = document.createElement('div');
    pickupEl.className = 'pickup-notification';
    pickupEl.innerHTML = `
      <div class="pickup-icon">${icon}</div>
      <div class="pickup-text">${item}</div>
    `;
    
    container.appendChild(pickupEl);
    
    // Animate in and out
    setTimeout(() => pickupEl.classList.add('show'), 100);
    setTimeout(() => {
      pickupEl.classList.add('fade-out');
      setTimeout(() => pickupEl.remove(), 300);
    }, 2000);
  }

  /**
   * Trigger screen shake effect
   */
  triggerScreenShake(intensity = 1) {
    if (!this.animationSettings.screenShake || this.animationSettings.reduceMotion) {
      return;
    }
    
    const shakeContainer = document.getElementById('screen-shake');
    if (!shakeContainer) {
      return;
    }
    
    const duration = 200 * intensity;
    const amplitude = 5 * intensity;
    
    shakeContainer.style.animation = `screen-shake ${duration}ms ease-out`;
    shakeContainer.style.setProperty('--shake-amplitude', `${amplitude}px`);
    
    setTimeout(() => {
      shakeContainer.style.animation = '';
    }, duration);
  }

  /**
   * Show damage vignette effect
   */
  showDamageVignette() {
    const vignette = document.getElementById('damage-vignette');
    if (!vignette || this.animationSettings.reduceMotion) {
      return;
    }
    
    vignette.classList.add('active');
    setTimeout(() => vignette.classList.remove('active'), 200);
  }

  /**
   * Show/hide menus
   */
  showMenu(menuId) {
    this.hideAllMenus();
    
    const menu = document.getElementById(menuId);
    if (menu) {
      menu.classList.remove('hidden');
      this.currentMenu = menuId;
      
      // Pause game rendering effects (not audio)
      if (menuId === 'pause-menu' && this.wasmManager.pauseEffects) {
        this.wasmManager.pauseEffects(true);
      }
    }
  }

  hideMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) {
      menu.classList.add('hidden');
      
      if (this.currentMenu === menuId) {
        this.currentMenu = null;
        
        // Resume game rendering effects
        if (menuId === 'pause-menu' && this.wasmManager.pauseEffects) {
          this.wasmManager.pauseEffects(false);
        }
      }
    }
  }

  hideAllMenus() {
    const menus = document.querySelectorAll('.menu-overlay');
    menus.forEach(menu => menu.classList.add('hidden'));
    this.currentMenu = null;
  }

  /**
   * Utility methods
   */
  isGameKey(code) {
    return this.inputState.keybinds.has(code);
  }

  detectControllerSupport() {
    return 'getGamepads' in navigator;
  }

  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  applyColorblindFilter(mode) {
    document.documentElement.className = document.documentElement.className.replace(/colorblind-\w+/g, '');
    if (mode !== 'none') {
      document.documentElement.classList.add(`colorblind-${mode}`);
    }
  }

  /**
   * Render frame (called every frame)
   */
  render(_deltaTime) {
    // Main rendering is handled by the game engine
    // UI only updates visual state based on WASM data
    
    // Update performance metrics
    if (this.frameCount % 60 === 0) {
      // Could display FPS counter if needed
      // const fps = Math.round(1000 / deltaTime);
    }
  }

  /**
   * Cleanup and destroy UI
   */
  destroy() {
    const ui = document.getElementById('modern-roguelite-ui');
    if (ui) {
      ui.remove();
    }
    
    // Clear animation queues
    this.damageNumbers.forEach(damage => damage.element?.remove());
    this.damageNumbers = [];
    
    this.pickupNotifications.forEach(pickup => pickup.element?.remove());
    this.pickupNotifications = [];
  }

  // Placeholder methods for input handling
  handleMouseDown() { /* Forward to WASM */ }
  handleMouseUp() { /* Forward to WASM */ }
  handleMouseMove() { /* Forward to WASM */ }
  handleTouchStart() { /* Basic touch support */ }
  handleTouchEnd() { /* Basic touch support */ }
  handleTouchMove() { /* Basic touch support */ }
  handleControllerConnect() { /* Controller support */ }
  handleControllerDisconnect() { /* Controller support */ }
  
  updatePhaseDisplay() { /* Update phase UI from WASM */ }
  updateStatusEffects() { /* Update status effects from WASM */ }
  updatePickupNotifications() { /* Update pickup animations */ }
  updateScreenEffects() { /* Update screen effects */ }
  showKeybindConfiguration() { /* Show keybind config UI */ }
}