/**
 * Combat Feedback System - Visual feedback for combat actions
 * Provides damage numbers, hit indicators, combo feedback, and screen effects
 */

export class CombatFeedback {
  constructor() {
    this.feedbackElements = [];
    this.screenEffects = [];
    this.comboState = {
      count: 0,
      lastHitTime: 0,
      multiplier: 1.0
    };
    
    // Initialize feedback overlay
    this.initializeFeedbackOverlay();
  }

  /**
   * Initialize the feedback overlay container
   */
  initializeFeedbackOverlay() {
    // Remove existing overlay if present
    const existingOverlay = document.getElementById('combat-feedback-system');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create feedback overlay
    const overlay = document.createElement('div');
    overlay.id = 'combat-feedback-system';
    overlay.className = 'combat-feedback-system';
    overlay.innerHTML = `
      <!-- Screen effects container -->
      <div class="screen-effects-container"></div>
      
      <!-- Damage numbers container -->
      <div class="damage-numbers-container"></div>
      
      <!-- Hit indicators container -->
      <div class="hit-indicators-container"></div>
      
      <!-- Combo feedback -->
      <div class="combo-feedback-container">
        <div class="combo-display" id="combo-display">
          <div class="combo-count">0</div>
          <div class="combo-text">COMBO</div>
          <div class="combo-multiplier">×1.0</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Show damage number at world position
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} damage - Damage amount
   * @param {string} type - Damage type (damage, heal, critical, block, parry)
   */
  showDamageNumber(worldX, worldY, damage, type = 'damage') {
    // Convert world coordinates to screen coordinates
    // For now, use simple conversion - this would need proper camera transformation
    const screenX = (worldX * window.innerWidth) + (Math.random() - 0.5) * 40;
    const screenY = (worldY * window.innerHeight) + (Math.random() - 0.5) * 20;
    
    const container = document.querySelector('.damage-numbers-container');
    if (!container) return;
    
    const damageEl = document.createElement('div');
    damageEl.className = `damage-number ${type}`;
    
    // Format damage text
    let displayText = Math.floor(damage).toString();
    if (type === 'critical') {
      displayText = `${displayText}!`;
    } else if (type === 'block') {
      displayText = 'BLOCKED';
    } else if (type === 'parry') {
      displayText = 'PARRY!';
    } else if (type === 'heal') {
      displayText = `+${displayText}`;
    }
    
    damageEl.textContent = displayText;
    damageEl.style.left = `${screenX}px`;
    damageEl.style.top = `${screenY}px`;
    
    container.appendChild(damageEl);
    
    // Animate and remove
    this.animateDamageNumber(damageEl, type);
  }

  /**
   * Animate damage number
   * @param {HTMLElement} element - Damage number element
   * @param {string} type - Damage type
   */
  animateDamageNumber(element, type) {
    const duration = type === 'critical' ? 2500 : 2000;
    const floatDistance = type === 'critical' ? 80 : 60;
    
    // Add to tracking
    const feedback = {
      element,
      startTime: performance.now(),
      duration,
      floatDistance,
      startY: parseFloat(element.style.top)
    };
    
    this.feedbackElements.push(feedback);
    
    // Remove after duration
    setTimeout(() => {
      if (element.parentNode) {
        element.remove();
      }
      const index = this.feedbackElements.indexOf(feedback);
      if (index > -1) {
        this.feedbackElements.splice(index, 1);
      }
    }, duration);
  }

  /**
   * Show hit indicator at position
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {string} type - Hit type (hit, miss, critical, block, parry)
   */
  showHitIndicator(worldX, worldY, type = 'hit') {
    const screenX = worldX * window.innerWidth;
    const screenY = worldY * window.innerHeight;
    
    const container = document.querySelector('.hit-indicators-container');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.className = `hit-indicator ${type}`;
    
    // Set indicator content based on type
    const indicators = {
      hit: '💥',
      miss: '💨',
      critical: '⚡',
      block: '🛡️',
      parry: '✨'
    };
    
    indicator.textContent = indicators[type] || '💥';
    indicator.style.left = `${screenX}px`;
    indicator.style.top = `${screenY}px`;
    
    container.appendChild(indicator);
    
    // Animate and remove
    setTimeout(() => {
      indicator.classList.add('fade-out');
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 300);
    }, 500);
  }

  /**
   * Update combo state
   * @param {boolean} hit - Whether the attack hit
   * @param {boolean} isCritical - Whether it was a critical hit
   */
  updateCombo(hit, isCritical = false) {
    const now = performance.now();
    const comboTimeout = 3000; // 3 seconds to maintain combo
    
    if (hit) {
      // Check if combo should continue
      if (now - this.comboState.lastHitTime < comboTimeout) {
        this.comboState.count++;
      } else {
        this.comboState.count = 1; // Reset combo
      }
      
      this.comboState.lastHitTime = now;
      
      // Calculate multiplier
      this.comboState.multiplier = 1.0 + (this.comboState.count - 1) * 0.1;
      if (isCritical) {
        this.comboState.multiplier *= 1.5;
      }
      
      // Update combo display
      this.updateComboDisplay();
      
      // Show combo milestone effects
      if (this.comboState.count % 5 === 0 && this.comboState.count > 0) {
        this.showComboMilestone(this.comboState.count);
      }
    } else {
      // Miss - reset combo after timeout
      setTimeout(() => {
        if (now - this.comboState.lastHitTime >= comboTimeout) {
          this.comboState.count = 0;
          this.comboState.multiplier = 1.0;
          this.updateComboDisplay();
        }
      }, comboTimeout);
    }
  }

  /**
   * Update combo display
   */
  updateComboDisplay() {
    const comboDisplay = document.getElementById('combo-display');
    if (!comboDisplay) return;
    
    const countEl = comboDisplay.querySelector('.combo-count');
    const multiplierEl = comboDisplay.querySelector('.combo-multiplier');
    
    if (countEl) {
      countEl.textContent = this.comboState.count;
    }
    
    if (multiplierEl) {
      multiplierEl.textContent = `×${this.comboState.multiplier.toFixed(1)}`;
    }
    
    // Add visual effects for high combos
    comboDisplay.classList.remove('combo-low', 'combo-medium', 'combo-high', 'combo-extreme');
    
    if (this.comboState.count >= 20) {
      comboDisplay.classList.add('combo-extreme');
    } else if (this.comboState.count >= 10) {
      comboDisplay.classList.add('combo-high');
    } else if (this.comboState.count >= 5) {
      comboDisplay.classList.add('combo-medium');
    } else if (this.comboState.count > 0) {
      comboDisplay.classList.add('combo-low');
    }
    
    // Show/hide combo display
    comboDisplay.style.opacity = this.comboState.count > 0 ? '1' : '0.3';
  }

  /**
   * Show combo milestone effect
   * @param {number} comboCount - Current combo count
   */
  showComboMilestone(comboCount) {
    const container = document.querySelector('.screen-effects-container');
    if (!container) return;
    
    const milestone = document.createElement('div');
    milestone.className = 'combo-milestone';
    milestone.innerHTML = `
      <div class="milestone-text">${comboCount} HIT COMBO!</div>
      <div class="milestone-subtitle">EXCELLENT!</div>
    `;
    
    container.appendChild(milestone);
    
    // Animate and remove
    setTimeout(() => {
      milestone.classList.add('fade-out');
      setTimeout(() => {
        if (milestone.parentNode) {
          milestone.remove();
        }
      }, 500);
    }, 2000);
  }

  /**
   * Show screen effect
   * @param {string} type - Effect type (hit, critical, heal, damage)
   * @param {number} intensity - Effect intensity (0-1)
   */
  showScreenEffect(type, intensity = 0.5) {
    const container = document.querySelector('.screen-effects-container');
    if (!container) return;
    
    const effect = document.createElement('div');
    effect.className = `screen-effect ${type}`;
    effect.style.opacity = intensity;
    
    container.appendChild(effect);
    
    // Remove after animation
    setTimeout(() => {
      if (effect.parentNode) {
        effect.remove();
      }
    }, 500);
  }

  /**
   * Update animation frame for all feedback elements
   */
  update() {
    const now = performance.now();
    
    this.feedbackElements.forEach(feedback => {
      const elapsed = now - feedback.startTime;
      const progress = Math.min(elapsed / feedback.duration, 1);
      
      if (progress < 1) {
        // Update position
        const currentY = feedback.startY - (feedback.floatDistance * progress);
        feedback.element.style.top = `${currentY}px`;
        
        // Update opacity
        const opacity = 1 - Math.pow(progress, 2); // Quadratic fade
        feedback.element.style.opacity = opacity;
        
        // Update scale for critical hits
        if (feedback.element.classList.contains('critical')) {
          const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
          feedback.element.style.transform = `scale(${scale})`;
        }
      }
    });
  }

  /**
   * Trigger feedback for various combat events
   */
  onAttackHit(worldX, worldY, damage, isCritical = false) {
    this.showDamageNumber(worldX, worldY, damage, isCritical ? 'critical' : 'damage');
    this.showHitIndicator(worldX, worldY, isCritical ? 'critical' : 'hit');
    this.updateCombo(true, isCritical);
    this.showScreenEffect(isCritical ? 'critical' : 'hit', isCritical ? 0.8 : 0.4);
  }

  onAttackMiss(worldX, worldY) {
    this.showHitIndicator(worldX, worldY, 'miss');
    this.updateCombo(false);
  }

  onAttackBlocked(worldX, worldY, damage) {
    this.showDamageNumber(worldX, worldY, damage, 'block');
    this.showHitIndicator(worldX, worldY, 'block');
    this.updateCombo(false);
  }

  onAttackParried(worldX, worldY) {
    this.showDamageNumber(worldX, worldY, 0, 'parry');
    this.showHitIndicator(worldX, worldY, 'parry');
    this.showScreenEffect('parry', 0.6);
  }

  onPlayerHealed(worldX, worldY, amount) {
    this.showDamageNumber(worldX, worldY, amount, 'heal');
    this.showScreenEffect('heal', 0.3);
  }

  onPlayerDamaged(worldX, worldY, damage) {
    this.showDamageNumber(worldX, worldY, damage, 'damage');
    this.showScreenEffect('damage', 0.6);
  }

  /**
   * Get current combo state
   */
  getComboState() {
    return { ...this.comboState };
  }

  /**
   * Reset combo
   */
  resetCombo() {
    this.comboState.count = 0;
    this.comboState.multiplier = 1.0;
    this.comboState.lastHitTime = 0;
    this.updateComboDisplay();
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    const overlay = document.getElementById('combat-feedback-system');
    if (overlay) {
      overlay.remove();
    }
    
    this.feedbackElements = [];
    this.screenEffects = [];
  }
}
