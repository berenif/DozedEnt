/**
 * WASM Manager - Handles WebAssembly module initialization and lifecycle
 * Follows WASM-first architecture principles from AGENTS.MD
 * 
 * This is the main facade that composes all WASM subsystems:
 * - WasmInitializer: Loading and initialization
 * - WasmCoreState: Core game state management
 * - WasmCombatSystem: Combat operations
 * - WasmPhaseManagers: Phase-specific operations
 * - WasmWorldSimulation: World simulation features
 */

import { WasmInitializer } from '../wasm/WasmInitializer.js';
import { WasmCoreState } from '../wasm/WasmCoreState.js';
import { WasmCombatSystem } from '../wasm/WasmCombatSystem.js';
import { WasmPhaseManagers } from '../wasm/WasmPhaseManagers.js';
import { WasmWorldSimulation } from '../wasm/WasmWorldSimulation.js';

export class WasmManager {
  constructor() {
    // Create subsystem instances
    this.initializer = new WasmInitializer();
    this.coreState = new WasmCoreState(null);
    this.combat = new WasmCombatSystem(null);
    this.phases = new WasmPhaseManagers(null);
    this.world = new WasmWorldSimulation(null);
    
    // Legacy properties for compatibility
    this.runSeed = 0n;
  }
  
  /**
   * Get WASM exports
   * @returns {Object} WASM exports
   */
  get exports() {
    return this.initializer.exports;
  }
  
  /**
   * Get loaded status
   * @returns {boolean} Is WASM loaded
   */
  get isLoaded() {
    return this.initializer.isLoaded;
  }
  
  /**
   * Get fallback mode status
   * @returns {boolean} Is in fallback mode
   */
  get isFallbackMode() {
    return this.initializer.isFallbackMode;
  }

  /**
   * Initialize WASM module
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    const success = await this.initializer.initialize();
    
    if (success && this.initializer.exports) {
      // Update all subsystems with the loaded exports
      this.coreState.setExports(this.initializer.exports);
      this.combat.setExports(this.initializer.exports);
      this.phases.setExports(this.initializer.exports);
      this.world.setExports(this.initializer.exports);
      
      this.runSeed = this.initializer.runSeed;
    }
    
    return success;
  }

  /**
   * Initialize game run with seed
   * @param {bigint|number|string} seed - Seed value
   * @param {number} weapon - Starting weapon id
   */
  initRun(seed, weapon = 0) {
    if (!this.isLoaded || typeof this.exports.init_run !== 'function') {
      return;
    }
    try {
      const newSeed = typeof seed === 'bigint' ? seed : BigInt(String(seed));
      this.runSeed = newSeed;
      this.initializer.runSeed = newSeed;
      this.exports.init_run(newSeed, weapon);
      
      // Clear any lingering state
      try {
        if (typeof this.exports.set_player_input === 'function') {
          this.exports.set_player_input(0, 0, 0, 0, 0, 0, 0, 0);
        }
        if (typeof this.exports.set_blocking === 'function') {
          try {
            this.exports.set_blocking(0, 0, 0);
          } catch (_) {
            // Ignore
          }
        }
      } catch (_) {
        // Ignore
      }
      
      globalThis.runSeedForVisuals = newSeed;
    } catch (error) {
      console.error('initRun failed:', error);
    }
  }

  /**
   * Reset game run with new seed
   * @param {bigint} newSeed - New seed value
   */
  resetRun(newSeed) {
    if (!this.isLoaded || typeof this.exports.reset_run !== 'function') {
      return;
    }
    this.runSeed = newSeed;
    this.initializer.runSeed = newSeed;
    this.exports.reset_run(newSeed);
    
    // Clear lingering state
    try {
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 0, 0, 0, 0);
      }
      if (typeof this.exports.set_blocking === 'function') {
        try {
          this.exports.set_blocking(0, 0, 0);
        } catch (_) {
          // Ignore
        }
      }
    } catch (_) {
      // Ignore
    }
  }

  /**
   * Get current run seed
   * @returns {bigint} Current run seed
   */
  getRunSeed() {
    return this.runSeed;
  }

  /**
   * Load WASM module (alias for initialize)
   * @returns {Promise<boolean>} Success status
   */
  async load() {
    return await this.initialize();
  }

  /**
   * Check if WASM is in fallback mode
   * @returns {boolean} True if in fallback mode
   */
  isFallback() {
    return this.isFallbackMode === true;
  }

  /**
   * Get diagnostics
   * @returns {Object} Diagnostic information
   */
  getDiagnostics() {
    return {
      isLoaded: this.isLoaded,
      isFallbackMode: this.isFallbackMode,
      hasExports: Boolean(this.exports),
      exportCount: this.exports ? Object.keys(this.exports).length : 0,
      runSeed: this.runSeed.toString()
    };
  }

  // ========== Core State Delegation ==========
  
  update(dirX, dirY, isRolling, deltaTime) {
    return this.coreState.update(dirX, dirY, isRolling, deltaTime);
  }
  
  getPlayerPosition() {
    return this.coreState.getPlayerPosition();
  }
  
  getPlayerState() {
    return this.coreState.getPlayerState();
  }
  
  getX() {
    return this.coreState.getX();
  }
  
  getY() {
    return this.coreState.getY();
  }
  
  getStamina() {
    return this.coreState.getStamina();
  }
  
  getHP() {
    return this.coreState.getHP();
  }
  
  getMaxHP() {
    return this.coreState.getMaxHP();
  }
  
  getPhase() {
    return this.coreState.getPhase();
  }
  
  getRoomCount() {
    return this.coreState.getRoomCount();
  }
  
  getCurrentBiome() {
    return this.coreState.getCurrentBiome();
  }
  
  isRolling() {
    return this.coreState.isRolling();
  }
  
  getEnemyPositions() {
    return this.coreState.getEnemyPositions();
  }
  
  getExitPositions() {
    return this.coreState.getExitPositions();
  }
  
  getStatusEffects() {
    return this.coreState.getStatusEffects();
  }
  
  getHazards() {
    return this.coreState.getHazards();
  }
  
  getWolfCount() {
    return this.coreState.getWolfCount();
  }
  
  getMemoryBuffer() {
    return this.coreState.getMemoryBuffer();
  }
  
  getMemorySize() {
    return this.coreState.getMemorySize();
  }
  
  getPerformanceMetrics() {
    return this.coreState.getPerformanceMetrics();
  }

  // ========== Combat System Delegation ==========
  
  getTimingConstants() {
    return this.combat.getTimingConstants();
  }
  
  attack() {
    return this.combat.attack();
  }
  
  onAttack() {
    return this.combat.onAttack();
  }
  
  lightAttack() {
    return this.combat.lightAttack();
  }
  
  heavyAttack() {
    return this.combat.heavyAttack();
  }
  
  specialAttack() {
    return this.combat.specialAttack();
  }
  
  startRoll() {
    return this.combat.startRoll();
  }
  
  onRollStart() {
    return this.combat.onRollStart();
  }
  
  setBlocking(isBlocking, faceX, faceY) {
    return this.combat.setBlocking(isBlocking, faceX, faceY);
  }
  
  isBlocking() {
    return this.combat.isBlocking();
  }
  
  handleIncomingAttack(ax, ay, dirX, dirY) {
    return this.combat.handleIncomingAttack(ax, ay, dirX, dirY);
  }
  
  getParryWindow() {
    return this.combat.getParryWindow();
  }
  
  getCombatTelemetry() {
    return this.combat.getCombatTelemetry();
  }
  
  getCurrentWeapon() {
    return this.combat.getCurrentWeapon();
  }
  
  setCharacterAndWeapon(character, weapon) {
    return this.combat.setCharacterAndWeapon(character, weapon);
  }
  
  getWeaponStats() {
    return this.combat.getWeaponStats();
  }

  // ========== Phase Managers Delegation ==========
  
  getChoiceCount() {
    return this.phases.getChoiceCount();
  }
  
  getChoiceId(index) {
    return this.phases.getChoiceId(index);
  }
  
  getChoiceType(index) {
    return this.phases.getChoiceType(index);
  }
  
  getChoiceRarity(index) {
    return this.phases.getChoiceRarity(index);
  }
  
  getChoiceTags(index) {
    return this.phases.getChoiceTags(index);
  }
  
  getChoice(index) {
    return this.phases.getChoice(index);
  }
  
  commitChoice(choiceId) {
    return this.phases.commitChoice(choiceId);
  }
  
  generateChoices() {
    return this.phases.generateChoices();
  }
  
  getCurseCount() {
    return this.phases.getCurseCount();
  }
  
  getCurseType(index) {
    return this.phases.getCurseType(index);
  }
  
  getCurseIntensity(index) {
    return this.phases.getCurseIntensity(index);
  }
  
  getRiskMultiplier() {
    return this.phases.getRiskMultiplier();
  }
  
  getEliteActive() {
    return this.phases.getEliteActive();
  }
  
  escapeRisk() {
    return this.phases.escapeRisk();
  }
  
  getEscalationLevel() {
    return this.phases.getEscalationLevel();
  }
  
  getSpawnRateModifier() {
    return this.phases.getSpawnRateModifier();
  }
  
  getMinibossActive() {
    return this.phases.getMinibossActive();
  }
  
  getMinibossX() {
    return this.phases.getMinibossX();
  }
  
  getMinibossY() {
    return this.phases.getMinibossY();
  }
  
  damageMiniboss(amount) {
    return this.phases.damageMiniboss(amount);
  }
  
  getGold() {
    return this.phases.getGold();
  }
  
  getEssence() {
    return this.phases.getEssence();
  }
  
  getShopItemCount() {
    return this.phases.getShopItemCount();
  }
  
  buyShopItem(index) {
    return this.phases.buyShopItem(index);
  }
  
  buyHeal() {
    return this.phases.buyHeal();
  }
  
  rerollShopItems() {
    return this.phases.rerollShopItems();
  }
  
  exitCashout() {
    return this.phases.exitCashout();
  }

  // ========== World Simulation Delegation ==========
  
  getWeather() {
    return this.world.getWeather();
  }
  
  setWeather(weather) {
    return this.world.setWeather(weather);
  }
  
  getTimeInfo() {
    return this.world.getTimeInfo();
  }
  
  setTimeScale(scale) {
    return this.world.setTimeScale(scale);
  }
  
  getChemistryState(x, y) {
    return this.world.getChemistryState(x, y);
  }
  
  applyChemistryEffect(effect, x, y, radius, intensity) {
    return this.world.applyChemistryEffect(effect, x, y, radius, intensity);
  }
  
  getTerrainInfo(x, y) {
    return this.world.getTerrainInfo(x, y);
  }
  
  createPhysicsBody(x, y, z, mass, radius) {
    return this.world.createPhysicsBody(x, y, z, mass, radius);
  }
  
  getPhysicsBodyPosition(bodyId) {
    return this.world.getPhysicsBodyPosition(bodyId);
  }
  
  applyForce(bodyId, fx, fy, fz) {
    return this.world.applyForce(bodyId, fx, fy, fz);
  }
  
  createExplosion(x, y, z, radius, force, speed) {
    return this.world.createExplosion(x, y, z, radius, force, speed);
  }
  
  getExplosions() {
    return this.world.getExplosions();
  }
  
  createHeatSource(x, y, z, temperature, radius) {
    return this.world.createHeatSource(x, y, z, temperature, radius);
  }
  
  emitSound(x, y, z, volume, frequency) {
    return this.world.emitSound(x, y, z, volume, frequency);
  }
  
  getSoundEvents() {
    return this.world.getSoundEvents();
  }
}

// Create global instance
export const globalWasmManager = new WasmManager();