/**
 * Enhanced UI Manager - Implements critical UI improvements for roguelike genre
 * Focuses on: Visual hierarchy, stable layouts, reduced cognitive load
 */

export class EnhancedUIManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    
    // UI State Management
    this.isInCombat = false;
    this.currentPhase = 0;
    this.uiMode = 'enhanced'; // 'enhanced' or 'legacy'
    
    // Stable element tracking
    this.stableElements = new Map();
    this.criticalElements = new Map();
    
    // Cognitive load management
    this.informationClusters = new Map();
    this.currentFocusArea = 'survival';
    
    // Performance tracking
    this.lastUpdateTime = 0;
    this.updateFrequency = 60; // 60 FPS
    
    this.initialize();
  }

  /**
   * Initialize the enhanced UI system
   */
  initialize() {
    this.createEnhancedUIStructure();
    this.setupStableElements();
    this.initializeInformationClusters();
    this.setupEventListeners();
    this.startUpdateLoop();
  }

  /**
   * Create the main enhanced UI structure with proper hierarchy
   */
  createEnhancedUIStructure() {
    // Remove existing UI if present
    const existingUI = document.getElementById('enhanced-ui-container');
    if (existingUI) {
      existingUI.remove();
    }

    const uiContainer = document.createElement('div');
    uiContainer.id = 'enhanced-ui-container';
    uiContainer.className = 'stable-ui-container';
    
    uiContainer.innerHTML = `
      <!-- Critical Information Zone (Top Priority) -->
      <div class="ui-zone-top-left">
        <div class="critical-vitals">
          <!-- Health Bar (Highest Priority) -->
          <div class="critical-health-bar stable-health-container" id="critical-health">
            <div class="critical-health-fill" id="health-fill-enhanced"></div>
            <div class="critical-health-text stable-text" id="health-text-enhanced">100</div>
          </div>
          
          <!-- Stamina Bar (Second Priority) -->
          <div class="critical-stamina-bar stable-stamina-container" id="critical-stamina">
            <div class="critical-stamina-fill" id="stamina-fill-enhanced"></div>
            <div class="critical-stamina-text stable-text" id="stamina-text-enhanced">100</div>
          </div>
        </div>
      </div>

      <!-- Status Effects Zone (High Priority) -->
      <div class="ui-zone-top-right">
        <div class="priority-status-effects" id="status-effects-enhanced">
          <!-- Status effects populated dynamically -->
        </div>
        
        <!-- Resource Cluster -->
        <div class="priority-resources" id="resources-enhanced">
          <div class="priority-resource">
            <span class="priority-resource-icon icon-gold"></span>
            <span class="priority-resource-value" id="gold-enhanced">0</span>
          </div>
          <div class="priority-resource">
            <span class="priority-resource-icon icon-essence"></span>
            <span class="priority-resource-value" id="essence-enhanced">0</span>
          </div>
        </div>
      </div>

      <!-- Phase Information Zone -->
      <div class="ui-zone-top-center">
        <div class="info-cluster progress-cluster" id="phase-info-enhanced">
          <div class="info-cluster-title">Current Objective</div>
          <div class="progress-item">
            <div class="progress-text-simple">
              <span id="phase-name-enhanced">Explore</span>
              <span id="room-counter-enhanced">Room 1</span>
            </div>
            <div class="progress-bar-simple">
              <div class="progress-fill-simple" id="phase-progress-enhanced"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ability Bar Zone (Combat Priority) -->
      <div class="ui-zone-bottom-center">
        <div class="priority-abilities stable-ability-bar" id="abilities-enhanced">
          <div class="priority-ability-slot stable-ability-button" data-action="light-attack">
            <div class="priority-ability-icon">⚡</div>
            <div class="priority-ability-key">J</div>
            <div class="priority-cooldown-overlay hidden" id="light-attack-cooldown"></div>
          </div>
          <div class="priority-ability-slot stable-ability-button" data-action="heavy-attack">
            <div class="priority-ability-icon">💥</div>
            <div class="priority-ability-key">K</div>
            <div class="priority-cooldown-overlay hidden" id="heavy-attack-cooldown"></div>
          </div>
          <div class="priority-ability-slot stable-ability-button" data-action="block">
            <div class="priority-ability-icon">🛡️</div>
            <div class="priority-ability-key">Shift</div>
            <div class="priority-cooldown-overlay hidden" id="block-cooldown"></div>
          </div>
          <div class="priority-ability-slot stable-ability-button" data-action="roll">
            <div class="priority-ability-icon">🌀</div>
            <div class="priority-ability-key">Space</div>
            <div class="priority-cooldown-overlay hidden" id="roll-cooldown"></div>
          </div>
          <div class="priority-ability-slot stable-ability-button" data-action="special">
            <div class="priority-ability-icon">✨</div>
            <div class="priority-ability-key">L</div>
            <div class="priority-cooldown-overlay hidden" id="special-cooldown"></div>
          </div>
        </div>
      </div>

      <!-- Information Clusters (Progressive Disclosure) -->
      <div class="ui-zone-bottom-left">
        <div class="info-cluster survival-cluster detail-on-hover" id="survival-cluster">
          <div class="info-cluster-title">Survival Status</div>
          <div class="survival-item">
            <span class="survival-icon icon-health"></span>
            <span class="survival-label">Health</span>
            <span class="survival-value color-health" id="health-detailed">100/100</span>
          </div>
          <div class="survival-item">
            <span class="survival-icon icon-stamina"></span>
            <span class="survival-label">Stamina</span>
            <span class="survival-value color-stamina" id="stamina-detailed">100/100</span>
          </div>
          <div class="detail-tooltip">
            Hover for detailed combat stats
          </div>
        </div>
      </div>

      <!-- Threat Indicators (Combat Overlay) -->
      <div class="threat-indicators" id="threat-indicators-enhanced">
        <!-- Threat indicators populated dynamically -->
      </div>

      <!-- Damage Numbers and Effects -->
      <div class="stable-damage-numbers" id="damage-numbers-enhanced">
        <!-- Damage numbers populated dynamically -->
      </div>

      <!-- Screen Effects -->
      <div class="stable-screen-effects" id="screen-effects-enhanced">
        <!-- Screen effects populated dynamically -->
      </div>

      <!-- Notifications -->
      <div class="stable-notifications" id="notifications-enhanced">
        <!-- Notifications populated dynamically -->
      </div>
    `;

    document.body.appendChild(uiContainer);
    
    // Apply CSS files
    this.loadEnhancedStyles();
  }

  /**
   * Load the enhanced CSS files
   */
  loadEnhancedStyles() {
    const cssFiles = [
      'src/css/critical-ui-hierarchy.css',
      'src/css/stable-ui-layouts.css',
      'src/css/reduced-cognitive-load.css'
    ];

    cssFiles.forEach(cssFile => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssFile;
      document.head.appendChild(link);
    });
  }

  /**
   * Setup stable element tracking to prevent layout shifts
   */
  setupStableElements() {
    // Track critical elements that should never move
    const criticalSelectors = [
      '#critical-health',
      '#critical-stamina',
      '#abilities-enhanced',
      '#status-effects-enhanced',
      '#phase-info-enhanced'
    ];

    criticalSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        this.stableElements.set(selector, {
          element,
          originalPosition: element.getBoundingClientRect(),
          locked: true
        });
      }
    });
  }

  /**
   * Initialize information clustering for reduced cognitive load
   */
  initializeInformationClusters() {
    this.informationClusters.set('survival', {
      priority: 1,
      elements: ['#critical-health', '#critical-stamina'],
      updateFrequency: 60 // Update every frame
    });

    this.informationClusters.set('combat', {
      priority: 2,
      elements: ['#abilities-enhanced', '#threat-indicators-enhanced'],
      updateFrequency: 60
    });

    this.informationClusters.set('status', {
      priority: 3,
      elements: ['#status-effects-enhanced'],
      updateFrequency: 30 // Update every other frame
    });

    this.informationClusters.set('progress', {
      priority: 4,
      elements: ['#phase-info-enhanced', '#resources-enhanced'],
      updateFrequency: 10 // Update 10 times per second
    });
  }

  /**
   * Setup event listeners for enhanced UI
   */
  setupEventListeners() {
    // Combat state detection
    document.addEventListener('combatStart', () => {
      this.enterCombatMode();
    });

    document.addEventListener('combatEnd', () => {
      this.exitCombatMode();
    });

    // Phase change detection
    document.addEventListener('phaseChange', (event) => {
      this.updatePhaseDisplay(event.detail.phase);
    });

    // Ability usage tracking
    document.addEventListener('keydown', (event) => {
      this.handleAbilityInput(event);
    });

    // Window resize - maintain stable layouts
    window.addEventListener('resize', () => {
      this.maintainStableLayouts();
    });
  }

  /**
   * Start the main update loop
   */
  startUpdateLoop() {
    const update = (timestamp) => {
      if (timestamp - this.lastUpdateTime >= (1000 / this.updateFrequency)) {
        this.updateUI();
        this.lastUpdateTime = timestamp;
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /**
   * Main UI update function - prioritizes critical information
   */
  updateUI() {
    if (!this.wasmManager || !this.wasmManager.exports) {
      return;
    }

    // Update in priority order for performance
    this.updateCriticalVitals();
    this.updateCombatElements();
    this.updateStatusEffects();
    this.updateProgressInfo();
  }

  /**
   * Update critical health and stamina (highest priority)
   */
  updateCriticalVitals() {
    try {
      const health = this.wasmManager.exports.get_hp?.() || 1.0;
      const stamina = this.wasmManager.exports.get_stamina?.() || 1.0;

      // Update health bar
      const healthFill = document.getElementById('health-fill-enhanced');
      const healthText = document.getElementById('health-text-enhanced');
      
      if (healthFill && healthText) {
        const healthPercent = Math.max(0, Math.min(100, health * 100));
        healthFill.style.width = `${healthPercent}%`;
        healthText.textContent = Math.ceil(healthPercent).toString();

        // Apply health state classes
        healthFill.className = 'critical-health-fill';
        if (healthPercent <= 25) {
          healthFill.classList.add('critical-health');
        } else if (healthPercent <= 50) {
          healthFill.classList.add('low-health');
        }
      }

      // Update stamina bar
      const staminaFill = document.getElementById('stamina-fill-enhanced');
      const staminaText = document.getElementById('stamina-text-enhanced');
      
      if (staminaFill && staminaText) {
        const staminaPercent = Math.max(0, Math.min(100, stamina * 100));
        staminaFill.style.width = `${staminaPercent}%`;
        staminaText.textContent = Math.ceil(staminaPercent).toString();

        // Apply stamina state classes
        staminaFill.className = 'critical-stamina-fill';
        if (staminaPercent <= 25) {
          staminaFill.classList.add('low-stamina');
        }
      }

      // Update detailed survival info
      const healthDetailed = document.getElementById('health-detailed');
      const staminaDetailed = document.getElementById('stamina-detailed');
      
      if (healthDetailed) {
        healthDetailed.textContent = `${Math.ceil(health * 100)}/100`;
      }
      if (staminaDetailed) {
        staminaDetailed.textContent = `${Math.ceil(stamina * 100)}/100`;
      }

    } catch (error) {
      console.error('Error updating critical vitals:', error);
    }
  }

  /**
   * Update combat-related elements
   */
  updateCombatElements() {
    // Update ability cooldowns
    this.updateAbilityCooldowns();
    
    // Update threat indicators
    this.updateThreatIndicators();
  }

  /**
   * Update ability cooldown displays
   */
  updateAbilityCooldowns() {
    const abilities = [
      { id: 'light-attack', key: 'J' },
      { id: 'heavy-attack', key: 'K' },
      { id: 'block', key: 'Shift' },
      { id: 'roll', key: 'Space' },
      { id: 'special', key: 'L' }
    ];

    abilities.forEach(ability => {
      const slot = document.querySelector(`[data-action="${ability.id}"]`);
      const cooldownOverlay = document.getElementById(`${ability.id}-cooldown`);
      
      if (slot && cooldownOverlay) {
        // Check if ability is on cooldown (implement based on WASM exports)
        const isOnCooldown = false; // TODO: Get from WASM
        const cooldownTime = 0; // TODO: Get from WASM

        if (isOnCooldown) {
          slot.classList.add('cooldown');
          slot.classList.remove('ready');
          cooldownOverlay.classList.remove('hidden');
          cooldownOverlay.textContent = cooldownTime.toFixed(1);
        } else {
          slot.classList.add('ready');
          slot.classList.remove('cooldown');
          cooldownOverlay.classList.add('hidden');
        }
      }
    });
  }

  /**
   * Update threat indicators for incoming attacks
   */
  updateThreatIndicators() {
    const threatContainer = document.getElementById('threat-indicators-enhanced');
    if (!threatContainer) return;

    // Clear existing threats
    threatContainer.innerHTML = '';

    // TODO: Get threat data from WASM
    // For now, this is a placeholder for the threat detection system
    const threats = []; // TODO: Get from WASM exports

    threats.forEach(threat => {
      const indicator = document.createElement('div');
      indicator.className = `threat-indicator ${threat.blockable ? 'blockable' : 'unblockable'}`;
      indicator.innerHTML = threat.blockable ? '🛡️' : '⚠️';
      
      // Position based on threat direction
      const angle = threat.angle || 0;
      const distance = 100; // pixels from center
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      
      threatContainer.appendChild(indicator);
    });
  }

  /**
   * Update status effects display
   */
  updateStatusEffects() {
    const statusContainer = document.getElementById('status-effects-enhanced');
    if (!statusContainer) return;

    // TODO: Get status effects from WASM
    const statusEffects = []; // TODO: Get from WASM exports

    statusContainer.innerHTML = '';

    statusEffects.forEach(effect => {
      const statusElement = document.createElement('div');
      statusElement.className = `priority-status-effect ${effect.type}`;
      
      statusElement.innerHTML = `
        <span class="status-icon-large">${effect.icon}</span>
        <span class="status-name-large">${effect.name}</span>
        <span class="status-duration-large">${effect.duration > 0 ? Math.ceil(effect.duration) : '∞'}</span>
      `;
      
      statusContainer.appendChild(statusElement);
    });
  }

  /**
   * Update progress and phase information
   */
  updateProgressInfo() {
    try {
      const phase = this.wasmManager.exports.get_phase?.() || 0;
      const roomCount = this.wasmManager.exports.get_room_count?.() || 1;
      const gold = this.wasmManager.exports.get_gold?.() || 0;
      const essence = this.wasmManager.exports.get_essence?.() || 0;

      // Update phase display
      const phaseName = document.getElementById('phase-name-enhanced');
      const roomCounter = document.getElementById('room-counter-enhanced');
      
      if (phaseName) {
        const phaseNames = ['Explore', 'Fight', 'Choose', 'PowerUp', 'Risk', 'Escalate', 'CashOut', 'Reset'];
        phaseName.textContent = phaseNames[phase] || 'Unknown';
      }
      
      if (roomCounter) {
        roomCounter.textContent = `Room ${roomCount}`;
      }

      // Update resources
      const goldElement = document.getElementById('gold-enhanced');
      const essenceElement = document.getElementById('essence-enhanced');
      
      if (goldElement) {
        goldElement.textContent = Math.floor(gold).toString();
      }
      if (essenceElement) {
        essenceElement.textContent = Math.floor(essence).toString();
      }

    } catch (error) {
      console.error('Error updating progress info:', error);
    }
  }

  /**
   * Enter combat mode - maximum UI stability
   */
  enterCombatMode() {
    this.isInCombat = true;
    const container = document.getElementById('enhanced-ui-container');
    if (container) {
      container.classList.add('combat-mode');
    }

    // Lock all stable elements
    this.stableElements.forEach(({ element }) => {
      element.classList.add('stable-element');
    });

    // Increase update frequency for critical elements
    this.updateFrequency = 120; // 120 FPS during combat
  }

  /**
   * Exit combat mode - restore normal UI behavior
   */
  exitCombatMode() {
    this.isInCombat = false;
    const container = document.getElementById('enhanced-ui-container');
    if (container) {
      container.classList.remove('combat-mode');
    }

    // Restore normal update frequency
    this.updateFrequency = 60;
  }

  /**
   * Handle ability input for visual feedback
   */
  handleAbilityInput(event) {
    const keyMap = {
      'KeyJ': 'light-attack',
      'KeyK': 'heavy-attack',
      'ShiftLeft': 'block',
      'ShiftRight': 'block',
      'Space': 'roll',
      'KeyL': 'special'
    };

    const action = keyMap[event.code];
    if (action) {
      const slot = document.querySelector(`[data-action="${action}"]`);
      if (slot && !slot.classList.contains('cooldown')) {
        // Visual feedback for ability use
        slot.style.transform = 'scale(0.95)';
        setTimeout(() => {
          slot.style.transform = '';
        }, 100);
      }
    }
  }

  /**
   * Maintain stable layouts on window resize
   */
  maintainStableLayouts() {
    this.stableElements.forEach(({ element, originalPosition }) => {
      if (element && originalPosition) {
        // Ensure element maintains its relative position
        const currentRect = element.getBoundingClientRect();
        if (Math.abs(currentRect.left - originalPosition.left) > 5 ||
            Math.abs(currentRect.top - originalPosition.top) > 5) {
          // Reset to stable position if it has shifted
          element.style.position = 'fixed';
          element.style.left = `${originalPosition.left}px`;
          element.style.top = `${originalPosition.top}px`;
        }
      }
    });
  }

  /**
   * Show damage number with enhanced visual hierarchy
   */
  showDamageNumber(damage, x, y, type = 'damage') {
    const container = document.getElementById('damage-numbers-enhanced');
    if (!container) return;

    const damageElement = document.createElement('div');
    damageElement.className = `stable-damage-number ${type}`;
    damageElement.textContent = Math.floor(damage).toString();
    damageElement.style.left = `${x}px`;
    damageElement.style.top = `${y}px`;

    // Color coding based on type
    if (type === 'critical') {
      damageElement.style.color = '#ffaa00';
      damageElement.style.fontSize = '24px';
    } else if (type === 'heal') {
      damageElement.style.color = '#44ff44';
    } else {
      damageElement.style.color = '#ff4444';
    }

    container.appendChild(damageElement);

    // Animate and remove
    damageElement.animate([
      { transform: 'translateY(0px)', opacity: 1 },
      { transform: 'translateY(-50px)', opacity: 0 }
    ], {
      duration: 2000,
      easing: 'ease-out'
    }).onfinish = () => {
      damageElement.remove();
    };
  }

  /**
   * Show notification with reduced cognitive load
   */
  showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notifications-enhanced');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `simple-notification ${type}`;
    
    const iconMap = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };

    notification.innerHTML = `
      <span class="notification-icon-simple">${iconMap[type] || 'ℹ️'}</span>
      <span class="notification-text-simple">${message}</span>
    `;

    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      notification.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-20px)' }
      ], {
        duration: 300,
        easing: 'ease-in'
      }).onfinish = () => {
        notification.remove();
      };
    }, duration);
  }

  /**
   * Toggle between enhanced and legacy UI modes
   */
  toggleUIMode() {
    this.uiMode = this.uiMode === 'enhanced' ? 'legacy' : 'enhanced';
    
    if (this.uiMode === 'enhanced') {
      this.createEnhancedUIStructure();
    } else {
      // Switch back to legacy UI
      const enhancedUI = document.getElementById('enhanced-ui-container');
      if (enhancedUI) {
        enhancedUI.style.display = 'none';
      }
      // Show legacy UI elements
      const legacyUI = document.getElementById('roguelike-hud');
      if (legacyUI) {
        legacyUI.style.display = 'block';
      }
    }
  }

  /**
   * Get current UI performance metrics
   */
  getPerformanceMetrics() {
    return {
      updateFrequency: this.updateFrequency,
      isInCombat: this.isInCombat,
      stableElementCount: this.stableElements.size,
      informationClusterCount: this.informationClusters.size,
      uiMode: this.uiMode
    };
  }
}

export default EnhancedUIManager;
