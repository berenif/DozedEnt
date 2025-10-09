/**
 * WASM Core State - Handles core game state reading and caching
 * Manages player state, performance metrics, and state caching for optimization
 */

export class WasmCoreState {
  constructor(exports) {
    this.exports = exports;
    this.isLoaded = false;
    
    // Performance optimization: state caching
    this._cachedPlayerState = null;
    this._lastStateUpdate = 0;
    this._stateCacheTimeout = 16.67; // ~1 frame at 60fps
    
    // Performance monitoring
    this._performanceMetrics = {
      wasmCallCount: 0,
      totalWasmTime: 0,
      avgFrameTime: 0,
      lastFrameTime: 0,
      _lastMetricsUpdate: 0,
      _metricsUpdateInterval: 1000 // Update metrics every second
    };
  }

  /**
   * Set exports reference
   * @param {Object} exports - WASM exports object
   */
  setExports(exports) {
    this.exports = exports;
    this.isLoaded = Boolean(exports);
  }

  /**
   * Update game state with deterministic inputs
   * @param {number} dirX - X direction (-1 to 1)
   * @param {number} dirY - Y direction (-1 to 1)
   * @param {boolean} isRolling - Is player rolling
   * @param {number} deltaTime - Delta time in seconds
   */
  update(dirX, dirY, isRolling, deltaTime) {
    if (!this.isLoaded || typeof this.exports.update !== 'function') {
      return;
    }
    
    const updateStart = performance.now();
    
    // Validate input parameters
    const safeDirectionX = Number.isFinite(dirX) ? Math.max(-1, Math.min(1, dirX)) : 0;
    const safeDirY = Number.isFinite(dirY) ? Math.max(-1, Math.min(1, dirY)) : 0;
    const safeIsRolling = isRolling ? 1 : 0;
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0 ? Math.min(deltaTime, 0.1) : 0.016;
    
    try {
      const wasmUpdate = this.exports.update;
      const arity = Number.isInteger(wasmUpdate.length) ? wasmUpdate.length : 0;

      // If using legacy 1-arg update, set input first
      if (arity < 4 && typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(
          safeDirectionX,
          safeDirY,
          safeIsRolling,
          0, 0, 0, 0, 0
        );
      }
      
      // Call update with timeout protection
      const updateStartTime = performance.now();
      const updateTimeout = setTimeout(() => {
        const elapsed = performance.now() - updateStartTime;
        console.error(`❌ WASM update timed out after ${elapsed.toFixed(2)}ms`);
        this.isLoaded = false;
        throw new Error('WASM update timeout');
      }, 50);

      try {
        if (arity >= 4) {
          wasmUpdate(safeDirectionX, safeDirY, safeIsRolling, safeDeltaTime);
        } else {
          wasmUpdate(safeDeltaTime);
        }
        clearTimeout(updateTimeout);
      } catch (error) {
        clearTimeout(updateTimeout);
        throw error;
      }
      
      // Invalidate cached state
      this._invalidateStateCache();

      // Update performance metrics
      const updateEnd = performance.now();
      const frameTime = updateEnd - updateStart;
      this._performanceMetrics.lastFrameTime = frameTime;
      this._performanceMetrics.wasmCallCount++;
      this._performanceMetrics.totalWasmTime += frameTime;
      
      const now = performance.now();
      if (now - this._performanceMetrics._lastMetricsUpdate > this._performanceMetrics._metricsUpdateInterval) {
        this._performanceMetrics.avgFrameTime = this._performanceMetrics.totalWasmTime / this._performanceMetrics.wasmCallCount;
        this._performanceMetrics._lastMetricsUpdate = now;
      }
    } catch (error) {
      console.error('WASM update error:', error);
      
      // Re-throw critical errors that indicate system failure
      if (error.name === 'RuntimeError' || 
          error.message.includes('out of memory') ||
          error.message.includes('segmentation fault') ||
          error.message.includes('null pointer')) {
        console.error('Critical WASM error detected, re-throwing:', error);
        throw error;
      }
      
      // For non-critical errors, continue execution but mark as degraded
      this._errorCount = (this._errorCount || 0) + 1;
      if (this._errorCount > 10) {
        console.warn('High error count detected, WASM may be unstable');
      }
    }
  }

  /**
   * Get player position from WASM (batches x,y calls)
   * @returns {Object} Position object with x, y coordinates
   */
  getPlayerPosition() {
    if (!this.isLoaded) {
      return { x: 0, y: 0 };
    }
    
    const rawX = typeof this.exports.get_x === 'function' ? this.exports.get_x() : 0.5;
    const rawY = typeof this.exports.get_y === 'function' ? this.exports.get_y() : 0.5;
    const x = Number.isFinite(rawX) ? Math.max(0, Math.min(1, rawX)) : 0.5;
    const y = Number.isFinite(rawY) ? Math.max(0, Math.min(1, rawY)) : 0.5;
    return { x, y };
  }

  /**
   * Get all essential player state in one batch (PERFORMANCE OPTIMIZED)
   * Reduces WASM/JS boundary calls from 4+ to 1 batch
   * @returns {Object} Complete player state
   */
  getPlayerState() {
    if (!this.isLoaded) {
      return { 
        x: 0.5, y: 0.5, stamina: 1.0, phase: 0, 
        health: 1.0, gold: 0, essence: 0 
      };
    }
    
    // Check cache
    const now = performance.now();
    if (this._cachedPlayerState && (now - this._lastStateUpdate < this._stateCacheTimeout)) {
      return this._cachedPlayerState;
    }
    
    // Batch all state reads
    const state = {};
    state.x = typeof this.exports.get_x === 'function' ? this.exports.get_x() : 0.5;
    state.y = typeof this.exports.get_y === 'function' ? this.exports.get_y() : 0.5;
    state.stamina = typeof this.exports.get_stamina === 'function' ? this.exports.get_stamina() : 1.0;
    state.phase = typeof this.exports.get_phase === 'function' ? this.exports.get_phase() : 0;
    state.health = typeof this.exports.get_health === 'function' ? this.exports.get_health() : 1.0;
    state.gold = typeof this.exports.get_gold === 'function' ? this.exports.get_gold() : 0;
    state.essence = typeof this.exports.get_essence === 'function' ? this.exports.get_essence() : 0;
    
    // Additional state
    state.velX = typeof this.exports.get_vel_x === 'function' ? this.exports.get_vel_x() : 0;
    state.velY = typeof this.exports.get_vel_y === 'function' ? this.exports.get_vel_y() : 0;
    state.isRolling = typeof this.exports.get_is_rolling === 'function' ? this.exports.get_is_rolling() : 0;
    state.isBlocking = typeof this.exports.get_block_state === 'function' ? this.exports.get_block_state() : 0;
    state.animState = typeof this.exports.get_player_anim_state === 'function' ? this.exports.get_player_anim_state() : 0;
    
    // Validate and clamp values
    state.x = Number.isFinite(state.x) ? Math.max(0, Math.min(1, state.x)) : 0.5;
    state.y = Number.isFinite(state.y) ? Math.max(0, Math.min(1, state.y)) : 0.5;
    state.stamina = Number.isFinite(state.stamina) ? Math.max(0, Math.min(1, state.stamina)) : 1.0;
    state.health = Number.isFinite(state.health) ? Math.max(0, Math.min(1, state.health)) : 1.0;
    state.phase = Number.isFinite(state.phase) ? Math.max(0, Math.min(7, state.phase)) : 0;
    
    // Cache the state
    this._cachedPlayerState = state;
    this._lastStateUpdate = now;
    
    return state;
  }

  /**
   * Get player X position
   * @returns {number} X position (0-1)
   */
  getX() {
    if (!this.isLoaded || typeof this.exports.get_x !== 'function') {
      return 0.5;
    }
    const v = this.exports.get_x();
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  }

  /**
   * Get player Y position
   * @returns {number} Y position (0-1)
   */
  getY() {
    if (!this.isLoaded || typeof this.exports.get_y !== 'function') {
      return 0.5;
    }
    const v = this.exports.get_y();
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  }

  /**
   * Get player stamina
   * @returns {number} Stamina value (0-1)
   */
  getStamina() {
    if (!this.isLoaded || typeof this.exports.get_stamina !== 'function') {
      return 1;
    }
    return this.exports.get_stamina();
  }

  /**
   * Get player health
   * @returns {number} Health (0-1)
   */
  getHP() {
    if (!this.isLoaded || typeof this.exports.get_hp !== 'function') {
      return 1;
    }
    return this.exports.get_hp();
  }

  /**
   * Get player maximum health
   * @returns {number} Max health
   */
  getMaxHP() {
    if (!this.isLoaded || typeof this.exports.get_max_hp !== 'function') {
      return 100;
    }
    return this.exports.get_max_hp();
  }

  /**
   * Get game phase
   * @returns {number} Current game phase (0-7)
   */
  getPhase() {
    if (!this.isLoaded || typeof this.exports.get_phase !== 'function') {
      return 0;
    }
    return this.exports.get_phase();
  }

  /**
   * Get room count
   * @returns {number} Current room count
   */
  getRoomCount() {
    if (!this.isLoaded || typeof this.exports.get_room_count !== 'function') {
      return 1;
    }
    return this.exports.get_room_count();
  }

  /**
   * Get current biome
   * @returns {number} Biome type
   */
  getCurrentBiome() {
    if (this.exports && typeof this.exports.get_current_biome === 'function') {
      return this.exports.get_current_biome();
    }
    return 0;
  }

  /**
   * Query roll state from WASM
   * @returns {boolean} Is currently rolling
   */
  isRolling() {
    if (!this.isLoaded || typeof this.exports.get_is_rolling !== 'function') {
      return false;
    }
    try {
      return this.exports.get_is_rolling() === 1;
    } catch (rollingError) {
      console.debug('Error checking rolling state:', rollingError.message);
      return false;
    }
  }

  /**
   * Get active enemy positions
   * @returns {Array<{x:number,y:number}>} Array of enemy positions
   */
  getEnemyPositions() {
    if (!this.isLoaded || typeof this.exports.get_enemy_count !== 'function') {
      return [];
    }
    
    try {
      const count = this.exports.get_enemy_count();
      const enemies = [];
      for (let i = 0; i < count; i++) {
        try {
          const x = typeof this.exports.get_enemy_x === 'function' ? this.exports.get_enemy_x(i) : 0;
          const y = typeof this.exports.get_enemy_y === 'function' ? this.exports.get_enemy_y(i) : 0;
          enemies.push({ x, y });
        } catch (err) {
          console.error(`Error getting enemy position ${i}:`, err);
          break;
        }
      }
      return enemies;
    } catch (error) {
      console.error('Error getting enemy positions:', error);
      return [];
    }
  }

  /**
   * Get exit positions
   * @returns {Array<{x:number,y:number}>} Array of exit positions
   */
  getExitPositions() {
    if (!this.isLoaded || typeof this.exports.get_exit_count !== 'function') {
      return [];
    }
    
    try {
      const count = this.exports.get_exit_count();
      const exits = [];
      for (let i = 0; i < count; i++) {
        try {
          const x = typeof this.exports.get_exit_x === 'function' ? this.exports.get_exit_x(i) : 0;
          const y = typeof this.exports.get_exit_y === 'function' ? this.exports.get_exit_y(i) : 0;
          exits.push({ x, y });
        } catch (err) {
          console.error(`Error getting exit position ${i}:`, err);
          break;
        }
      }
      return exits;
    } catch (error) {
      console.error('Error getting exit positions:', error);
      return [];
    }
  }

  /**
   * Get current status effects
   * @returns {Array<Object>} Array of status effect objects
   */
  getStatusEffects() {
    if (!this.isLoaded || typeof this.exports.get_status_effect_count !== 'function') {
      return [];
    }
    
    try {
      const count = this.exports.get_status_effect_count();
      const effects = [];
      for (let i = 0; i < count; i++) {
        try {
          const icon = typeof this.exports.get_status_effect_icon === 'function' ? this.exports.get_status_effect_icon(i) : '';
          const name = typeof this.exports.get_status_effect_name === 'function' ? this.exports.get_status_effect_name(i) : '';
          const description = typeof this.exports.get_status_effect_description === 'function' ? this.exports.get_status_effect_description(i) : '';
          const duration = typeof this.exports.get_status_effect_duration === 'function' ? this.exports.get_status_effect_duration(i) : 0;
          const type = typeof this.exports.get_status_effect_type === 'function' ? this.exports.get_status_effect_type(i) : 'neutral';
          effects.push({ icon, name, description, duration, type });
        } catch (err) {
          console.error(`Error getting status effect ${i}:`, err);
          break;
        }
      }
      return effects;
    } catch (error) {
      console.error('Error getting status effects:', error);
      return [];
    }
  }

  /**
   * Get hazard volumes
   * @returns {Array} Array of hazard data
   */
  getHazards() {
    if (!this.isLoaded || typeof this.exports.get_hazard_count !== 'function') {
      return [];
    }
    
    try {
      const count = this.exports.get_hazard_count();
      const hazards = [];
      
      // Validate count to prevent infinite loops
      const safeCount = Number.isInteger(count) && count >= 0 ? Math.min(count, 1000) : 0;
      
      for (let i = 0; i < safeCount; i++) {
        try {
          hazards.push({
            type: typeof this.exports.get_hazard_type === 'function' ? this.exports.get_hazard_type(i) : 0,
            x: typeof this.exports.get_hazard_x === 'function' ? this.exports.get_hazard_x(i) : 0,
            y: typeof this.exports.get_hazard_y === 'function' ? this.exports.get_hazard_y(i) : 0,
            radius: typeof this.exports.get_hazard_radius === 'function' ? this.exports.get_hazard_radius(i) : 0,
            intensity: typeof this.exports.get_hazard_intensity === 'function' ? this.exports.get_hazard_intensity(i) : 0
          });
        } catch (indexError) {
          console.error(`Error getting hazard at index ${i}:`, indexError);
          break;
        }
      }
      
      return hazards;
    } catch (error) {
      console.error('Error getting hazards:', error);
      return [];
    }
  }

  /**
   * Get wolf count
   * @returns {number} Number of wolves
   */
  getWolfCount() {
    if (!this.isLoaded || typeof this.exports.get_enemy_count !== 'function') {
      return 0;
    }
    return this.exports.get_enemy_count();
  }

  /**
   * Get memory buffer
   * @returns {ArrayBuffer} WASM memory buffer
   */
  getMemoryBuffer() {
    if (!this.isLoaded || !this.exports.memory) {
      return new ArrayBuffer(0);
    }
    return this.exports.memory.buffer;
  }

  /**
   * Get memory size
   * @returns {number} Memory size in bytes
   */
  getMemorySize() {
    const buffer = this.getMemoryBuffer();
    return buffer.byteLength;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance data
   */
  getPerformanceMetrics() {
    return { ...this._performanceMetrics };
  }

  /**
   * Invalidate cached state - call when WASM state changes
   * @private
   */
  _invalidateStateCache() {
    this._cachedPlayerState = null;
    this._lastStateUpdate = 0;
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this._performanceMetrics = {
      wasmCallCount: 0,
      totalWasmTime: 0,
      avgFrameTime: 0,
      lastFrameTime: 0,
      _lastMetricsUpdate: 0,
      _metricsUpdateInterval: 1000
    };
  }
}
