/**
 * WASM Phase Managers - Handles phase-specific game operations
 * Manages Choice, Risk, Escalate, and CashOut phases
 */

export class WasmPhaseManagers {
  constructor(exports) {
    this.exports = exports;
    this.isLoaded = false;
  }

  /**
   * Set exports reference
   * @param {Object} exports - WASM exports object
   */
  setExports(exports) {
    this.exports = exports;
    this.isLoaded = Boolean(exports);
  }

  // ===== CHOICE SYSTEM =====

  /**
   * Get number of available choices
   * @returns {number} Number of choices
   */
  getChoiceCount() {
    if (!this.isLoaded || typeof this.exports.get_choice_count !== 'function') {
      return 0;
    }
    return this.exports.get_choice_count();
  }

  /**
   * Get choice ID at index
   * @param {number} index - Choice index
   * @returns {number} Choice ID
   */
  getChoiceId(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_id !== 'function') {
      return 0;
    }
    
    const choiceCount = this.getChoiceCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < choiceCount ? index : 0;
    
    try {
      return this.exports.get_choice_id(safeIndex);
    } catch (error) {
      console.error(`Error getting choice ID at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get choice type at index
   * @param {number} index - Choice index
   * @returns {number} Choice type
   */
  getChoiceType(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_type !== 'function') {
      return 0;
    }
    
    const choiceCount = this.getChoiceCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < choiceCount ? index : 0;
    
    try {
      return this.exports.get_choice_type(safeIndex);
    } catch (error) {
      console.error(`Error getting choice type at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get choice rarity at index
   * @param {number} index - Choice index
   * @returns {number} Choice rarity
   */
  getChoiceRarity(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_rarity !== 'function') {
      return 0;
    }
    
    const choiceCount = this.getChoiceCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < choiceCount ? index : 0;
    
    try {
      return this.exports.get_choice_rarity(safeIndex);
    } catch (error) {
      console.error(`Error getting choice rarity at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get choice tags at index
   * @param {number} index - Choice index
   * @returns {number} Choice tags
   */
  getChoiceTags(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_tags !== 'function') {
      return 0;
    }
    
    const choiceCount = this.getChoiceCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < choiceCount ? index : 0;
    
    try {
      return this.exports.get_choice_tags(safeIndex);
    } catch (error) {
      console.error(`Error getting choice tags at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get choice details
   * @param {number} index - Choice index
   * @returns {Object} Choice object with id, type, rarity, tags
   */
  getChoice(index) {
    if (!this.isLoaded) {
      return null;
    }
    
    const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
    const choiceCount = this.getChoiceCount();
    
    if (safeIndex >= choiceCount) {
      console.warn(`Choice index ${safeIndex} out of bounds (max: ${choiceCount - 1})`);
      return null;
    }
    
    try {
      return {
        id: typeof this.exports.get_choice_id === 'function' ? this.exports.get_choice_id(safeIndex) : 0,
        type: typeof this.exports.get_choice_type === 'function' ? this.exports.get_choice_type(safeIndex) : 0,
        rarity: typeof this.exports.get_choice_rarity === 'function' ? this.exports.get_choice_rarity(safeIndex) : 0,
        tags: typeof this.exports.get_choice_tags === 'function' ? this.exports.get_choice_tags(safeIndex) : 0
      };
    } catch (error) {
      console.error('Error getting choice details:', error, { index: safeIndex, choiceCount });
      return null;
    }
  }

  /**
   * Commit choice selection
   * @param {number} choiceId - Selected choice ID
   */
  commitChoice(choiceId) {
    if (!this.isLoaded || typeof this.exports.commit_choice !== 'function') {
      return;
    }
    this.exports.commit_choice(choiceId);
  }

  /**
   * Generate new choices
   */
  generateChoices() {
    if (!this.isLoaded || typeof this.exports.generate_choices !== 'function') {
      return;
    }
    this.exports.generate_choices();
  }

  // ===== RISK PHASE =====

  /**
   * Get number of active curses
   * @returns {number} Curse count
   */
  getCurseCount() {
    if (!this.isLoaded || typeof this.exports.get_curse_count !== 'function') {
      return 0;
    }
    return this.exports.get_curse_count();
  }

  /**
   * Get curse type at index
   * @param {number} index - Curse index
   * @returns {number} Curse type
   */
  getCurseType(index) {
    if (!this.isLoaded || typeof this.exports.get_curse_type !== 'function') {
      return 0;
    }
    
    const curseCount = this.getCurseCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < curseCount ? index : 0;
    
    try {
      return this.exports.get_curse_type(safeIndex);
    } catch (error) {
      console.error(`Error getting curse type at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get curse intensity at index
   * @param {number} index - Curse index
   * @returns {number} Curse intensity (0-1)
   */
  getCurseIntensity(index) {
    if (!this.isLoaded || typeof this.exports.get_curse_intensity !== 'function') {
      return 0;
    }
    
    const curseCount = this.getCurseCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < curseCount ? index : 0;
    
    try {
      return this.exports.get_curse_intensity(safeIndex);
    } catch (error) {
      console.error(`Error getting curse intensity at index ${safeIndex}:`, error);
      return 0;
    }
  }

  /**
   * Get risk multiplier
   * @returns {number} Risk multiplier
   */
  getRiskMultiplier() {
    if (!this.isLoaded || typeof this.exports.get_risk_multiplier !== 'function') {
      return 1.0;
    }
    return this.exports.get_risk_multiplier();
  }

  /**
   * Check if elite enemy is active
   * @returns {boolean} Elite active status
   */
  getEliteActive() {
    if (!this.isLoaded || typeof this.exports.get_elite_active !== 'function') {
      return false;
    }
    return this.exports.get_elite_active() === 1;
  }

  /**
   * Escape risk phase
   */
  escapeRisk() {
    if (!this.isLoaded || typeof this.exports.escape_risk !== 'function') {
      return;
    }
    this.exports.escape_risk();
  }

  // ===== ESCALATE PHASE =====

  /**
   * Get escalation level (0-1)
   * @returns {number} Escalation level
   */
  getEscalationLevel() {
    if (!this.isLoaded || typeof this.exports.get_escalation_level !== 'function') {
      return 0;
    }
    return this.exports.get_escalation_level();
  }

  /**
   * Get spawn rate modifier
   * @returns {number} Spawn rate multiplier
   */
  getSpawnRateModifier() {
    if (!this.isLoaded || typeof this.exports.get_spawn_rate_modifier !== 'function') {
      return 1.0;
    }
    return this.exports.get_spawn_rate_modifier();
  }

  /**
   * Check if miniboss is active
   * @returns {boolean} Miniboss active status
   */
  getMinibossActive() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_active !== 'function') {
      return false;
    }
    return this.exports.get_miniboss_active() === 1;
  }

  /**
   * Get miniboss X position
   * @returns {number} Miniboss X position
   */
  getMinibossX() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_x !== 'function') {
      return 0;
    }
    return this.exports.get_miniboss_x();
  }

  /**
   * Get miniboss Y position
   * @returns {number} Miniboss Y position
   */
  getMinibossY() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_y !== 'function') {
      return 0;
    }
    return this.exports.get_miniboss_y();
  }

  /**
   * Damage miniboss
   * @param {number} amount - Damage amount
   */
  damageMiniboss(amount) {
    if (!this.isLoaded || typeof this.exports.damage_miniboss !== 'function') {
      return;
    }
    
    const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    this.exports.damage_miniboss(safeAmount);
  }

  // ===== CASHOUT PHASE =====

  /**
   * Get gold amount
   * @returns {number} Gold amount
   */
  getGold() {
    if (!this.isLoaded || typeof this.exports.get_gold !== 'function') {
      return 0;
    }
    return this.exports.get_gold();
  }

  /**
   * Get essence amount
   * @returns {number} Essence amount
   */
  getEssence() {
    if (!this.isLoaded || typeof this.exports.get_essence !== 'function') {
      return 0;
    }
    return this.exports.get_essence();
  }

  /**
   * Get number of shop items
   * @returns {number} Shop item count
   */
  getShopItemCount() {
    if (!this.isLoaded || typeof this.exports.get_shop_item_count !== 'function') {
      return 0;
    }
    return this.exports.get_shop_item_count();
  }

  /**
   * Buy shop item at index
   * @param {number} index - Item index
   */
  buyShopItem(index) {
    if (!this.isLoaded || typeof this.exports.buy_shop_item !== 'function') {
      return;
    }
    
    const shopItemCount = this.getShopItemCount();
    const safeIndex = Number.isInteger(index) && index >= 0 && index < shopItemCount ? index : 0;
    
    try {
      this.exports.buy_shop_item(safeIndex);
    } catch (error) {
      console.error(`Error buying shop item at index ${safeIndex}:`, error);
    }
  }

  /**
   * Buy full heal
   */
  buyHeal() {
    if (!this.isLoaded || typeof this.exports.buy_heal !== 'function') {
      return;
    }
    this.exports.buy_heal();
  }

  /**
   * Reroll shop items
   */
  rerollShopItems() {
    if (!this.isLoaded || typeof this.exports.reroll_shop_items !== 'function') {
      return;
    }
    this.exports.reroll_shop_items();
  }

  /**
   * Exit cashout phase
   */
  exitCashout() {
    if (!this.isLoaded || typeof this.exports.exit_cashout !== 'function') {
      return;
    }
    this.exports.exit_cashout();
  }
}
