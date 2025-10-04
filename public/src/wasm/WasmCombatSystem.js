/**
 * WASM Combat System - Handles all combat-related operations
 * Manages attacks, blocking, parrying, and combat telemetry
 */

export class WasmCombatSystem {
  constructor(exports) {
    this.exports = exports;
    this.isLoaded = false;
    
    // Timing constants
    this.timingConstants = {
      rollDuration: 0.18,
      rollCooldown: 0.8,
      attackCooldown: 0.35
    };
    
    // Combat telemetry cache
    this._cachedCombatTelemetry = null;
    this._lastCombatTelemetryUpdate = 0;
    this._combatTelemetryCacheMs = 16.67; // ~1 frame cache
  }

  /**
   * Set exports reference
   * @param {Object} exports - WASM exports object
   */
  setExports(exports) {
    this.exports = exports;
    this.isLoaded = Boolean(exports);
    this._loadTimingConstants();
  }

  /**
   * Load timing constants from WASM exports
   * @private
   */
  _loadTimingConstants() {
    try {
      if (typeof this.exports.get_attack_cooldown === 'function') {
        this.timingConstants.attackCooldown = this.exports.get_attack_cooldown();
      }
      if (typeof this.exports.get_roll_duration === 'function') {
        this.timingConstants.rollDuration = this.exports.get_roll_duration();
      }
      if (typeof this.exports.get_roll_cooldown === 'function') {
        this.timingConstants.rollCooldown = this.exports.get_roll_cooldown();
      }
    } catch (error) {
      console.warn('Failed to load timing constants:', error);
    }
  }

  /**
   * Get timing constants
   * @returns {Object} Timing constants object
   */
  getTimingConstants() {
    return { ...this.timingConstants };
  }

  /**
   * Execute attack action (legacy - maps to light attack)
   * @returns {boolean} Success status
   */
  attack() {
    return this.lightAttack();
  }

  /**
   * Execute attack action (alias for attack)
   * @returns {number} Attack result (1 for success, 0 for failure)
   */
  onAttack() {
    if (!this.isLoaded || typeof this.exports.on_attack !== 'function') {
      return 0;
    }
    return this.exports.on_attack();
  }

  /**
   * Execute light attack action (A1)
   * @returns {boolean} Success status
   */
  lightAttack() {
    if (!this.isLoaded) {
      return false;
    }
    
    try {
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 1, 0, 0, 0); // lightAttack = 1
        this._invalidateCombatTelemetryCache();
        return true;
      }
      
      if (typeof this.exports.on_light_attack === 'function') {
        const success = this.exports.on_light_attack() === 1;
        if (success) {
          this._invalidateCombatTelemetryCache();
        }
        return success;
      }
    } catch (error) {
      console.error('Light attack error:', error);
    }
    return false;
  }

  /**
   * Execute heavy attack action (A2)
   * @returns {boolean} Success status
   */
  heavyAttack() {
    if (!this.isLoaded) {
      return false;
    }
    
    try {
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 0, 1, 0, 0); // heavyAttack = 1
        this._invalidateCombatTelemetryCache();
        return true;
      }
      
      if (typeof this.exports.on_heavy_attack === 'function') {
        const success = this.exports.on_heavy_attack() === 1;
        if (success) {
          this._invalidateCombatTelemetryCache();
        }
        return success;
      }
    } catch (error) {
      console.error('Heavy attack error:', error);
    }
    return false;
  }

  /**
   * Execute special attack action (Hero move)
   * @returns {boolean} Success status
   */
  specialAttack() {
    if (!this.isLoaded) {
      return false;
    }
    
    try {
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 0, 0, 0, 1); // special = 1
        this._invalidateCombatTelemetryCache();
        return true;
      }
      
      if (typeof this.exports.on_special_attack === 'function') {
        const success = this.exports.on_special_attack() === 1;
        if (success) {
          this._invalidateCombatTelemetryCache();
        }
        return success;
      }
    } catch (error) {
      console.error('Special attack error:', error);
    }
    return false;
  }

  /**
   * Start dodge roll
   * @returns {boolean} Success status
   */
  startRoll() {
    return this.onRollStart() === 1;
  }

  /**
   * Start dodge roll (alias for startRoll)
   * @returns {number} Roll result (1 for success, 0 for failure)
   */
  onRollStart() {
    if (!this.isLoaded || typeof this.exports.on_roll_start !== 'function') {
      return 0;
    }
    const result = this.exports.on_roll_start();
    if (result === 1) {
      this._invalidateCombatTelemetryCache();
    }
    return result;
  }

  /**
   * Set blocking state
   * @param {boolean} isBlocking - Is player blocking
   * @param {number} faceX - Facing direction X
   * @param {number} faceY - Facing direction Y
   * @returns {boolean} Block state
   */
  setBlocking(isBlocking, faceX, faceY) {
    if (!this.isLoaded) {
      return false;
    }
    
    try {
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(
          faceX || 0, 
          faceY || 0, 
          0, // isRolling
          0, // isJumping
          0, // lightAttack
          0, // heavyAttack
          isBlocking ? 1 : 0, // isBlocking
          0  // special
        );
        this._invalidateCombatTelemetryCache();
        return true;
      }
      
      if (typeof this.exports.set_blocking === 'function') {
        const result = this.exports.set_blocking(isBlocking ? 1 : 0, faceX, faceY) === 1;
        if (result) {
          this._invalidateCombatTelemetryCache();
        }
        return result;
      }
    } catch (error) {
      console.error('Set blocking error:', error);
    }
    return false;
  }

  /**
   * Get blocking state
   * @returns {boolean} Is currently blocking
   */
  isBlocking() {
    if (!this.isLoaded || typeof this.exports.get_block_state !== 'function') {
      return false;
    }
    return this.exports.get_block_state() === 1;
  }

  /**
   * Handle incoming attack
   * @param {number} ax - Attack X position
   * @param {number} ay - Attack Y position
   * @param {number} dirX - Attack direction X
   * @param {number} dirY - Attack direction Y
   * @returns {number} Attack result (-1: ignore, 0: hit, 1: block, 2: perfect parry)
   */
  handleIncomingAttack(ax, ay, dirX, dirY) {
    if (!this.isLoaded || typeof this.exports.handle_incoming_attack !== 'function') {
      return -1;
    }
    return this.exports.handle_incoming_attack(ax, ay, dirX, dirY);
  }

  /**
   * Get parry window
   * @returns {number} Parry window in seconds
   */
  getParryWindow() {
    if (!this.isLoaded || !this.exports || typeof this.exports.get_parry_window !== 'function') {
      return 0.12;
    }
    try {
      const value = this.exports.get_parry_window();
      return Number.isFinite(value) && value >= 0 ? value : 0.12;
    } catch (error) {
      console.warn('Failed to read parry window from WASM:', error);
      return 0.12;
    }
  }

  /**
   * Get combat telemetry (cached for performance)
   * @returns {Object} Combat telemetry data
   */
  getCombatTelemetry() {
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

    const fallback = {
      comboCount: 0,
      comboWindowRemaining: 0,
      parryWindow: this.getParryWindow(),
      counterWindowRemaining: 0,
      canCounter: false,
      hyperarmorActive: false,
      armorValue: 0,
      isBlocking: false,
      isRolling: false,
      rollState: 0,
      rollTime: 0,
      isInvulnerable: false,
      isStunned: false,
      stunRemaining: 0,
      statusEffectCount: 0,
      statusMovementModifier: 1,
      statusDamageModifier: 1,
      statusDefenseModifier: 1,
      nearWall: false,
      wallDistance: 0,
      nearLedge: false,
      ledgeDistance: 0,
      speed: 0,
      weaponHasHyperarmor: false,
      weaponHasFlowCombo: false,
      weaponHasBashSynergy: false,
      timestamp: now
    };

    if (!this.isLoaded || !this.exports) {
      return fallback;
    }

    // Check cache
    if (this._cachedCombatTelemetry && (now - this._lastCombatTelemetryUpdate) < this._combatTelemetryCacheMs) {
      return this._cachedCombatTelemetry;
    }

    const exp = this.exports;
    const readNumber = (getter, fallbackValue = 0) => {
      if (typeof getter === 'function') {
        try {
          const value = getter();
          return Number.isFinite(value) ? value : fallbackValue;
        } catch (error) {
          return fallbackValue;
        }
      }
      return fallbackValue;
    };
    
    const readBool = (getter, fallbackValue = false) => {
      if (typeof getter === 'function') {
        try {
          return Boolean(getter());
        } catch (error) {
          return fallbackValue;
        }
      }
      return fallbackValue;
    };

    try {
      const parryWindow = readNumber(exp.get_parry_window, fallback.parryWindow);

      const telemetry = {
        comboCount: Math.max(0, Math.round(readNumber(exp.get_combo_count, fallback.comboCount))),
        comboWindowRemaining: Math.max(0, readNumber(exp.get_combo_window_remaining, fallback.comboWindowRemaining)),
        parryWindow,
        counterWindowRemaining: Math.max(0, readNumber(exp.get_counter_window_remaining, fallback.counterWindowRemaining)),
        canCounter: readBool(exp.get_can_counter, fallback.canCounter),
        hyperarmorActive: readBool(exp.get_has_hyperarmor, fallback.hyperarmorActive),
        armorValue: Math.max(0, readNumber(exp.get_armor_value, fallback.armorValue)),
        isBlocking: readBool(exp.get_block_state, fallback.isBlocking),
        isRolling: readBool(exp.get_is_rolling, fallback.isRolling),
        rollState: Math.max(0, readNumber(exp.get_roll_state, fallback.rollState)),
        rollTime: Math.max(0, readNumber(exp.get_roll_time, fallback.rollTime)),
        isInvulnerable: readBool(exp.get_is_invulnerable, fallback.isInvulnerable),
        isStunned: readBool(exp.get_is_stunned, fallback.isStunned),
        stunRemaining: Math.max(0, readNumber(exp.get_stun_remaining, fallback.stunRemaining)),
        statusEffectCount: Math.max(0, readNumber(exp.get_status_effect_count, fallback.statusEffectCount)),
        statusMovementModifier: Math.max(0, readNumber(exp.get_status_movement_modifier, fallback.statusMovementModifier)),
        statusDamageModifier: Math.max(0, readNumber(exp.get_status_damage_modifier, fallback.statusDamageModifier)),
        statusDefenseModifier: Math.max(0, readNumber(exp.get_status_defense_modifier, fallback.statusDefenseModifier)),
        nearWall: readBool(exp.get_near_wall, fallback.nearWall),
        wallDistance: Math.max(0, readNumber(exp.get_wall_distance, fallback.wallDistance)),
        nearLedge: readBool(exp.get_near_ledge, fallback.nearLedge),
        ledgeDistance: Math.max(0, readNumber(exp.get_ledge_distance, fallback.ledgeDistance)),
        speed: Math.max(0, readNumber(exp.get_speed, fallback.speed)),
        weaponHasHyperarmor: readBool(exp.weapon_has_hyperarmor, fallback.weaponHasHyperarmor),
        weaponHasFlowCombo: readBool(exp.weapon_has_flow_combo, fallback.weaponHasFlowCombo),
        weaponHasBashSynergy: readBool(exp.weapon_has_bash_synergy, fallback.weaponHasBashSynergy),
        timestamp: now
      };

      this._cachedCombatTelemetry = telemetry;
      this._lastCombatTelemetryUpdate = now;

      return telemetry;
    } catch (error) {
      console.warn('Failed to read combat telemetry from WASM:', error);
      this._cachedCombatTelemetry = null;
      this._lastCombatTelemetryUpdate = 0;
      return fallback;
    }
  }

  /**
   * Get current weapon information
   * @returns {Object} Weapon info
   */
  getCurrentWeapon() {
    if (!this.isLoaded) {
      return { type: 0, character: 0, name: 'Basic Sword' };
    }
    
    const weaponType = typeof this.exports.get_current_weapon === 'function' ? this.exports.get_current_weapon() : 0;
    const characterType = typeof this.exports.get_character_type === 'function' ? this.exports.get_character_type() : 0;
    
    const weaponNames = ['Warden Longsword', 'Raider Greataxe', 'Kensei Katana', 'Basic Sword'];
    const characterNames = ['Warden', 'Raider', 'Kensei', 'None'];
    
    return {
      type: weaponType,
      character: characterType,
      weaponName: weaponNames[weaponType] || 'Unknown',
      characterName: characterNames[characterType] || 'Unknown'
    };
  }

  /**
   * Set character and weapon
   * @param {number} character - Character type (0-2)
   * @param {number} weapon - Weapon type (0-3)
   */
  setCharacterAndWeapon(character, weapon) {
    if (!this.isLoaded || typeof this.exports.set_character_and_weapon !== 'function') {
      return;
    }
    this.exports.set_character_and_weapon(character, weapon);
    this._invalidateCombatTelemetryCache();
  }

  /**
   * Get weapon stats
   * @returns {Object} Weapon stats
   */
  getWeaponStats() {
    if (!this.isLoaded) {
      return { damage: 1.0, speed: 1.0, reach: 1.0 };
    }
    
    return {
      damage: typeof this.exports.get_weapon_damage_mult === 'function' ? this.exports.get_weapon_damage_mult() : 1.0,
      speed: typeof this.exports.get_weapon_speed_mult === 'function' ? this.exports.get_weapon_speed_mult() : 1.0,
      reach: typeof this.exports.get_weapon_reach_mult === 'function' ? this.exports.get_weapon_reach_mult() : 1.0,
      hasHyperarmor: typeof this.exports.weapon_has_hyperarmor === 'function' ? Boolean(this.exports.weapon_has_hyperarmor()) : false,
      hasFlowCombo: typeof this.exports.weapon_has_flow_combo === 'function' ? Boolean(this.exports.weapon_has_flow_combo()) : false,
      hasBashSynergy: typeof this.exports.weapon_has_bash_synergy === 'function' ? Boolean(this.exports.weapon_has_bash_synergy()) : false
    };
  }

  /**
   * Invalidate combat telemetry cache
   * @private
   */
  _invalidateCombatTelemetryCache() {
    this._cachedCombatTelemetry = null;
    this._lastCombatTelemetryUpdate = 0;
  }
}
