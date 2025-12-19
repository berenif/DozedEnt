/**
 * PhaseOverlayController centralizes phase overlay presentation logic.
 * It reads data from the WASM bridge and updates the DOM accordingly.
 */
const PHASE = {
  CHOOSE: 2,
  RISK: 4,
  ESCALATE: 5,
  CASH_OUT: 6,
  RESET: 7
};

export class PhaseOverlayController {
  constructor({
    wasmManager,
    onChoiceCommitted,
    onRestart,
    onRematch
  } = {}) {
    this.wasmManager = wasmManager;
    this.onChoiceCommitted = onChoiceCommitted || (() => {});
    this.onRestart = onRestart || (() => {});
    this.onRematch = onRematch || (() => {});

    this.overlays = {
      choice: null,
      risk: null,
      escalate: null,
      cashout: null,
      gameOver: null
    };

    this.choiceButtons = [];
    this.cleanupCallbacks = [];
  }

  /**
   * Cache overlay elements and bind button handlers.
   */
  initialize() {
    this.overlays.choice = document.getElementById('choice-overlay');
    this.overlays.risk = document.getElementById('risk-overlay');
    this.overlays.escalate = document.getElementById('escalate-overlay');
    this.overlays.cashout = document.getElementById('cashout-overlay');
    this.overlays.gameOver = document.getElementById('gameOverOverlay');

    this.bindChoiceButtons();
    this.bindGameOverButtons();
  }

  /**
   * Remove listeners.
   */
  destroy() {
    this.cleanupCallbacks.forEach(cleanup => cleanup());
    this.cleanupCallbacks = [];
    this.choiceButtons = [];
  }

  /**
   * Display the overlay that corresponds to the current phase.
   * @param {number} phaseId
   */
  handlePhaseChange(phaseId) {
    this.hideAll();

    switch (phaseId) {
      case PHASE.CHOOSE:
        this.showChoicePhase();
        break;
      case PHASE.RISK:
        this.showRiskPhase();
        break;
      case PHASE.ESCALATE:
        this.showEscalatePhase();
        break;
      case PHASE.CASH_OUT:
        this.showCashOutPhase();
        break;
      case PHASE.RESET:
        this.showGameOverPhase();
        break;
      default:
        break;
    }
  }

  /**
   * Refresh shop items when cash-out overlay is visible.
   */
  refreshShopItems() {
    this.renderShopItems();
  }

  bindChoiceButtons() {
    const elements = Array.from(document.querySelectorAll('.choice-button'));
    elements.forEach((button, index) => {
      const handler = () => this.handleChoiceSelection(button, index);
      button.addEventListener('click', handler);
      this.cleanupCallbacks.push(() => button.removeEventListener('click', handler));
      this.choiceButtons.push(button);
    });
  }

  bindGameOverButtons() {
    this.registerButton('restart-button', () => {
      this.hideOverlay(this.overlays.gameOver);
      this.onRestart();
    });

    this.registerButton('rematch-button', () => {
      this.hideOverlay(this.overlays.gameOver);
      this.onRematch();
    });
  }

  registerButton(elementId, handler) {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    element.addEventListener('click', handler);
    this.cleanupCallbacks.push(() => element.removeEventListener('click', handler));
  }

  handleChoiceSelection(button, index) {
    if (!this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    const parsed = Number.parseInt(button.dataset.choiceId, 10);
    const choiceId = Number.isInteger(parsed) ? parsed : index;

    if (typeof this.wasmManager.commitChoice === 'function') {
      this.wasmManager.commitChoice(choiceId);
    }

    this.onChoiceCommitted(choiceId);
    this.hideOverlay(this.overlays.choice);
  }

  hideAll() {
    Object.values(this.overlays).forEach(overlay => this.hideOverlay(overlay));
  }

  hideOverlay(overlay) {
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  showOverlay(overlay) {
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  showChoicePhase() {
    const overlay = this.overlays.choice;
    if (!overlay || !this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    const choiceCount = typeof this.wasmManager.getChoiceCount === 'function'
      ? this.wasmManager.getChoiceCount()
      : 0;

    this.choiceButtons.forEach((button, index) => {
      if (index < choiceCount) {
        const choiceId = this.safeCall(() => this.wasmManager.getChoiceId(index), index);
        const choiceType = this.safeCall(() => this.wasmManager.getChoiceType(index), 0);
        const choiceRarity = this.safeCall(() => this.wasmManager.getChoiceRarity(index), 0);

        button.style.display = 'block';
        button.textContent = this.getChoiceDisplayName(choiceType, choiceRarity);
        button.dataset.choiceId = String(choiceId);
      } else {
        button.style.display = 'none';
        delete button.dataset.choiceId;
      }
    });

    this.showOverlay(overlay);
  }

  showRiskPhase() {
    const overlay = this.overlays.risk;
    if (!overlay || !this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    const multiplierElement = document.getElementById('risk-mult');
    if (multiplierElement && typeof this.wasmManager.getRiskMultiplier === 'function') {
      multiplierElement.textContent = `${this.wasmManager.getRiskMultiplier().toFixed(1)}x`;
    }

    const curseList = document.getElementById('curse-list');
    if (curseList && typeof this.wasmManager.getCurseCount === 'function') {
      const curseCount = this.wasmManager.getCurseCount();
      curseList.innerHTML = '';

      if (curseCount === 0) {
        curseList.innerHTML = '<li>No active curses</li>';
      } else {
        for (let index = 0; index < curseCount; index += 1) {
          const curseType = this.safeCall(() => this.wasmManager.getCurseType(index), 0);
          const curseIntensity = this.safeCall(() => this.wasmManager.getCurseIntensity(index), 0);
          const item = document.createElement('li');
          item.textContent = `${this.getCurseDisplayName(curseType)} (${(curseIntensity * 100).toFixed(0)}%)`;
          curseList.appendChild(item);
        }
      }
    }

    this.showOverlay(overlay);
  }

  showEscalatePhase() {
    const overlay = this.overlays.escalate;
    if (!overlay || !this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    const escalationLevel = document.getElementById('escalation-lvl');
    if (escalationLevel && typeof this.wasmManager.getEscalationLevel === 'function') {
      escalationLevel.textContent = `${(this.wasmManager.getEscalationLevel() * 100).toFixed(0)}%`;
    }

    const spawnRate = document.getElementById('spawn-rate');
    if (spawnRate && typeof this.wasmManager.getSpawnRateModifier === 'function') {
      spawnRate.textContent = `${this.wasmManager.getSpawnRateModifier().toFixed(1)}x`;
    }

    const minibossAlert = document.getElementById('miniboss-alert');
    if (minibossAlert && typeof this.wasmManager.getMinibossActive === 'function') {
      const isActive = !!this.wasmManager.getMinibossActive();
      minibossAlert.classList.toggle('hidden', !isActive);
    }

    this.showOverlay(overlay);
  }

  showCashOutPhase() {
    if (!this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    this.renderShopItems();
    this.showOverlay(this.overlays.cashout);
  }

  showGameOverPhase() {
    this.showOverlay(this.overlays.gameOver);
  }

  renderShopItems() {
    const container = document.getElementById('shop-items');
    if (!container || !this.wasmManager || !this.wasmManager.isLoaded) {
      return;
    }

    container.innerHTML = '';

    if (typeof this.wasmManager.getShopItemCount !== 'function') {
      return;
    }

    const itemCount = this.wasmManager.getShopItemCount();

    for (let index = 0; index < itemCount; index += 1) {
      const itemElement = document.createElement('div');
      itemElement.className = 'shop-item';

      const nameElement = document.createElement('div');
      nameElement.className = 'item-name';
      nameElement.textContent = `Item ${index + 1}`;

      const priceElement = document.createElement('div');
      priceElement.className = 'item-price';
      priceElement.textContent = 'Cost: 50 coins';

      const purchaseButton = document.createElement('button');
      purchaseButton.textContent = 'Buy';
      purchaseButton.addEventListener('click', () => {
        if (typeof this.wasmManager.buyShopItem === 'function') {
          this.wasmManager.buyShopItem(index);
        }
      });

      itemElement.appendChild(nameElement);
      itemElement.appendChild(priceElement);
      itemElement.appendChild(purchaseButton);
      container.appendChild(itemElement);
    }
  }

  getChoiceDisplayName(choiceType, choiceRarity) {
    const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'];
    const typeNames = ['Weapon', 'Armor', 'Skill', 'Blessing'];

    const rarity = rarityNames[choiceRarity] || 'Unknown';
    const type = typeNames[choiceType] || 'Mystery';

    return `${rarity} ${type}`;
  }

  getCurseDisplayName(curseType) {
    const names = [
      'Weakness',
      'Slowness',
      'Fragility',
      'Confusion',
      'Blindness',
      'Silence',
      'Poison',
      'Curse'
    ];

    return names[curseType] || `Curse ${curseType}`;
  }

  safeCall(fn, fallback) {
    try {
      const value = fn();
      return (typeof value !== 'undefined') ? value : fallback;
    } catch (error) {
      console.warn('PhaseOverlayController: failed to read data from WASM bridge.', error);
      return fallback;
    }
  }
}

export default PhaseOverlayController;
