/**
 * WASM Manager - Handles WebAssembly module initialization and lifecycle
 * Follows WASM-first architecture principles from AGENTS.MD
 */

import { setGlobalSeed as setVisualRngSeed } from '../utils/rng.js'

export class WasmManager {
  constructor() {
    this.exports = null;
    this.isLoaded = false;
    this.runSeed = 0n;
    this.timingConstants = {
      rollDuration: 0.18,
      rollCooldown: 0.8,
      attackCooldown: 0.35
    };
    
    // Performance optimization: state caching
    this._cachedPlayerState = null;
    this._lastStateUpdate = 0;
    this._stateCacheTimeout = 8.33; // ~2 frames at 60fps in milliseconds
    
    // Performance monitoring
    this._performanceMetrics = {
      wasmCallCount: 0,
      totalWasmTime: 0,
      avgFrameTime: 0,
      lastFrameTime: 0
    };
  }

  /**
   * Initialize WASM module with comprehensive error handling
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    const initStartTime = performance.now();
    
    try {
      // Load the local WASM helper module with multiple fallback strategies
      let wasmHelperModule;
      const helperModulePaths = [
        './dist/trystero-wasm.min.js',
        './src/utils/wasm.js',
        '../utils/wasm.js'
      ];
      
      for (const modulePath of helperModulePaths) {
        try {
          const baseUrl = new URL(document.baseURI);
          const wasmModulePath = new URL(modulePath, baseUrl).href;
          console.log(`Attempting to load WASM helper from: ${wasmModulePath}`);
          wasmHelperModule = await import(wasmModulePath);
          console.log(`Successfully loaded WASM helper from: ${wasmModulePath}`);
          break;
        } catch (error) {
          console.warn(`Failed to load WASM helper from ${modulePath}:`, error.message);
          // Continue to next fallback
        }
      }
      
      if (!wasmHelperModule) {
        throw new Error('All WASM helper module paths failed. Ensure either dist/trystero-wasm.min.js or src/utils/wasm.js exists');
      }

      const { loadWasm } = wasmHelperModule;
      
      // Try multiple WASM file paths, resolved against the current document base URL
      const resolveUrl = (p) => {
        try {
          return new URL(p, document.baseURI).toString();
        } catch (_) {
          return p; // fallback to raw if URL construction fails (non-browser env)
        }
      };

      const candidatePaths = [
        'game.wasm',
        'dist/game.wasm',
        'src/wasm/game.wasm'
      ];

      // On GitHub Pages, ensure we also try with the repo prefix explicitly
      try {
        if (location && /\.github\.io$/.test(location.hostname)) {
          const parts = location.pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            const repo = parts[0];
            candidatePaths.push(`${repo}/game.wasm`);
            candidatePaths.push(`${repo}/dist/game.wasm`);
          }
        }
      } catch (_) {}

      const wasmUrls = candidatePaths.map(resolveUrl);

      let exports = null;
      let wasmPath = null;
      
      const loadAttempts = [];
      for (const url of wasmUrls) {
        try {
          console.log(`Attempting to load WASM from: ${url}`);
          const loadStart = performance.now();
          
          // Add timeout for WASM loading
          const loadPromise = loadWasm(url);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WASM load timeout')), 10000)
          );
          
          const result = await Promise.race([loadPromise, timeoutPromise]);
          const loadTime = performance.now() - loadStart;
          
          exports = result.exports;
          wasmPath = url;
          console.log(`Successfully loaded WASM from: ${url} (${loadTime.toFixed(1)}ms)`);
          loadAttempts.push({ url, success: true, loadTime, error: null });
          break;
        } catch (error) {
          const errorInfo = {
            url,
            success: false,
            loadTime: null,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            }
          };
          loadAttempts.push(errorInfo);
          console.warn(`Failed to load WASM from ${url}:`, error.message);
          
          // Provide specific error guidance
          if (error.message.includes('fetch')) {
            console.warn('Network error - check if WASM file exists and is accessible');
          } else if (error.message.includes('WebAssembly')) {
            console.warn('WASM compilation error - file may be corrupted or incompatible');
          } else if (error.message.includes('timeout')) {
            console.warn('WASM loading timed out - check network connection');
          }
        }
      }
      
      // Log comprehensive load attempt summary
      console.log('WASM loading attempts summary:', loadAttempts);
      
      if (!exports) {
        console.warn('Could not load WASM from any path - initializing fallback mode');
        console.warn('Fallback mode limitations:');
        console.warn('- No game logic processing (WASM-first architecture violated)');
        console.warn('- Deterministic gameplay not available');
        console.warn('- Multiplayer synchronization will fail');
        console.warn('- Performance will be significantly degraded');
        
        // Show user-friendly error notification
        this.showWasmLoadError(loadAttempts);
        
        // Create a comprehensive fallback exports object
        exports = this.createFallbackExports();
        this.isFallbackMode = true;
      } else {
        this.isFallbackMode = false;
      }
      
      this.exports = exports;
      this.isLoaded = true;
      
      // Make globally accessible for debugging
      globalThis.wasmExports = this.exports;
      
      // Initialize WASM runtime
      if (typeof this.exports.start === 'function') {
        this.exports.start();
      }

      // Initialize game run with seed
      this.initializeGameRun();
      
      // Load timing constants from WASM
      this.loadTimingConstants();
      
      // Apply URL parameters
      this.applyUrlParameters();

      const initTime = performance.now() - initStartTime;
      console.log(`WASM initialization completed in ${initTime.toFixed(1)}ms`);
      console.log('WASM loaded successfully from:', wasmPath || 'fallback mode');
      console.log('WASM exports available:', Object.keys(this.exports || {}));
      
      // Emit initialization event for UI feedback
      this.emitInitializationEvent({
        success: true,
        fallbackMode: this.isFallbackMode,
        loadTime: initTime,
        wasmPath: wasmPath
      });
      
      return true;
    } catch (error) {
      const initTime = performance.now() - initStartTime;
      console.error('WASM initialization failed completely:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Show critical error to user
      this.showCriticalError(error);
      
      // Emit failure event
      this.emitInitializationEvent({
        success: false,
        fallbackMode: false,
        loadTime: initTime,
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Initialize game run with deterministic seed
   * @private
   */
  async initializeGameRun() {
    if (typeof this.exports.init_run !== 'function') {
      console.warn('WASM init_run function not available');
      return;
    }

    try {
      // Get seed from URL or use a deterministic default
      const urlParams = new URLSearchParams(location.search);
      const urlSeed = urlParams.get('seed');
      
      if (urlSeed !== null && /^\d+$/.test(urlSeed)) {
        this.runSeed = BigInt(urlSeed);
        console.log('Using URL seed:', this.runSeed.toString());
      } else {
        // Use stable default when no seed is provided
        this.runSeed = 1n;
        console.log('Using default seed:', this.runSeed.toString());
      }

      // Initialize WASM run with starting weapon (0 = default)
      const startWeapon = this.getStartWeaponFromUrl() || 0;
      this.exports.init_run(this.runSeed, startWeapon);
      console.log('WASM game run initialized successfully');
      
      // Make seed available for visual RNG
      globalThis.runSeedForVisuals = this.runSeed;
      try { setVisualRngSeed(this.runSeed); } catch {}
      
      // Verify initialization by checking basic functions
      this.verifyWasmInitialization();
      
    } catch (error) {
      console.error('Failed to initialize game run:', error);
      throw error;
    }
  }

  /**
   * Verify WASM initialization is working
   * @private
   */
  verifyWasmInitialization() {
    try {
      // Test basic WASM functions with error handling
      const playerPos = this.getPlayerPosition();
      const stamina = this.getStamina();
      const phase = this.getPhase();
      
      // Validate returned values are reasonable
      const isValid = (
        playerPos && 
        typeof playerPos.x === 'number' && 
        typeof playerPos.y === 'number' &&
        Number.isFinite(stamina) && stamina >= 0 && stamina <= 1 &&
        Number.isInteger(phase) && phase >= 0
      );
      
      if (!isValid) {
        console.error('WASM verification failed: invalid return values', {
          playerPosition: playerPos,
          stamina: stamina,
          currentPhase: phase
        });
        return false;
      }
      
      console.log('WASM verification successful:', {
        playerPosition: playerPos,
        stamina: stamina,
        currentPhase: phase
      });
      
      return true;
    } catch (error) {
      console.error('WASM verification failed:', error);
      this.isLoaded = false; // Mark as not loaded if verification fails
      return false;
    }
  }

  /**
   * Load timing constants from WASM exports
   * @private
   */
  loadTimingConstants() {
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
   * Apply URL parameters (wind, etc.)
   * @private
   */
  applyUrlParameters() {
    try {
      const urlParams = new URLSearchParams(location.search);
      const windX = parseFloat(urlParams.get('windx') || '0');
      const windY = parseFloat(urlParams.get('windy') || '0');
      
      if (!Number.isNaN(windX) && !Number.isNaN(windY) && 
          typeof this.exports.set_wind === 'function') {
        this.exports.set_wind(windX, windY);
      }
    } catch (error) {
      console.warn('Failed to apply URL parameters:', error);
    }
  }

  /**
   * Get current biome from WASM
   * @returns {number} Biome type
   */
  getCurrentBiome() {
    if (this.exports && typeof this.exports.get_current_biome === 'function') {
      return this.exports.get_current_biome();
    }
    return 0; // Default to Forest
  }

  /**
   * Update game state with deterministic inputs
   * @param {number} dirX - X direction (-1 to 1)
   * @param {number} dirY - Y direction (-1 to 1)
   * @param {boolean} isRolling - Is player rolling
   * @param {number} deltaTime - Delta time in seconds
   */
  update(dirX, dirY, isRolling, deltaTime) {
    if (!this.isLoaded || typeof this.exports.update !== 'function') {return;}
    
    const updateStart = performance.now();
    
    // Validate input parameters to prevent bounds errors
    const safeDirectionX = Number.isFinite(dirX) ? Math.max(-1, Math.min(1, dirX)) : 0;
    const safeDirY = Number.isFinite(dirY) ? Math.max(-1, Math.min(1, dirY)) : 0;
    const safeIsRolling = isRolling ? 1 : 0;
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0 ? Math.min(deltaTime, 0.1) : 0.016; // Cap at 100ms, default to 16ms
    
    try {
      // Validate WASM state before update to prevent corruption
      const currentPhase = this.getPhase();
      if (currentPhase > 7) {
        console.warn(`Invalid phase detected (${currentPhase}), resetting WASM state`);
        // Try to reinitialize if phase is corrupted
        if (typeof this.exports.init_run === 'function') {
          this.exports.init_run(this.runSeed, 0);
        }
        return; // Skip this update cycle
      }
      
      // Set player input first using the correct WASM API
      if (typeof this.exports.set_player_input === 'function') {
        // set_player_input(inputX, inputY, isRolling, isJumping, lightAttack, heavyAttack, isBlocking, special)
        this.exports.set_player_input(
          safeDirectionX, 
          safeDirY, 
          safeIsRolling, 
          0, // isJumping
          0, // lightAttack (handled separately)
          0, // heavyAttack (handled separately) 
          0, // isBlocking (handled separately)
          0  // special (handled separately)
        );
      }
      
      // Then call update with just deltaTime
      this.exports.update(safeDeltaTime);
      
      // Validate state after update
      const newPhase = this.getPhase();
      if (newPhase > 7) {
        console.error(`WASM phase corrupted after update (${newPhase}), stopping updates`);
        this.isLoaded = false; // Prevent further updates
        
      }
      
      // Invalidate cached state since WASM state changed
      this._invalidateStateCache();
      
      // Update performance metrics
      const updateEnd = performance.now();
      const frameTime = updateEnd - updateStart;
      this._performanceMetrics.lastFrameTime = frameTime;
      this._performanceMetrics.wasmCallCount++;
      this._performanceMetrics.totalWasmTime += frameTime;
      this._performanceMetrics.avgFrameTime = this._performanceMetrics.totalWasmTime / this._performanceMetrics.wasmCallCount;
      
    } catch (error) {
      console.error('WASM update error:', error, {
        inputs: { dirX: safeDirectionX, dirY: safeDirY, isRolling: safeIsRolling, deltaTime: safeDeltaTime },
        phase: this.getPhase(),
        isLoaded: this.isLoaded
      });
      
      // If we get repeated bounds errors, disable WASM updates
      this.errorCount = (this.errorCount || 0) + 1;
      if (this.errorCount > 5) {
        console.error('Too many WASM errors, disabling WASM updates');
        this.isLoaded = false;
      }
      
      // Don't rethrow - allow game to continue with fallback behavior
    }
  }

  /**
   * Get player position from WASM (OPTIMIZED: batches x,y calls)
   * @returns {Object} Position object with x, y coordinates
   */
  getPlayerPosition() {
    if (!this.isLoaded) {return { x: 0, y: 0 };}
    
    const rawX = typeof this.exports.get_x === 'function' ? this.exports.get_x() : 0.5;
    const rawY = typeof this.exports.get_y === 'function' ? this.exports.get_y() : 0.5;
    const x = Number.isFinite(rawX) ? Math.max(0, Math.min(1, rawX)) : 0.5;
    const y = Number.isFinite(rawY) ? Math.max(0, Math.min(1, rawY)) : 0.5;
    return { x, y };
  }

  /**
   * PERFORMANCE OPTIMIZATION: Get all essential player state in one batch
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
    
    // Check if we have a cached state that's still valid
    const now = performance.now();
    if (this._cachedPlayerState && (now - this._lastStateUpdate < this._stateCacheTimeout)) {
      return this._cachedPlayerState;
    }
    
    // Batch all commonly-used state reads
    const state = {};
    state.x = typeof this.exports.get_x === 'function' ? this.exports.get_x() : 0.5;
    state.y = typeof this.exports.get_y === 'function' ? this.exports.get_y() : 0.5;
    state.stamina = typeof this.exports.get_stamina === 'function' ? this.exports.get_stamina() : 1.0;
    state.phase = typeof this.exports.get_phase === 'function' ? this.exports.get_phase() : 0;
    state.health = typeof this.exports.get_health === 'function' ? this.exports.get_health() : 1.0;
    state.gold = typeof this.exports.get_gold === 'function' ? this.exports.get_gold() : 0;
    state.essence = typeof this.exports.get_essence === 'function' ? this.exports.get_essence() : 0;
    
    // Add additional state for batching
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
   * Invalidate cached state - call when WASM state changes
   * @private
   */
  _invalidateStateCache() {
    this._cachedPlayerState = null;
    this._lastStateUpdate = 0;
  }

  /**
   * Get performance metrics for monitoring
   * @returns {Object} Performance data
   */
  getPerformanceMetrics() {
    return { ...this._performanceMetrics };
  }

  /**
   * Get player X position
   * @returns {number} X position (0-1)
   */
  getX() {
    if (!this.isLoaded || typeof this.exports.get_x !== 'function') {return 0.5;}
    const v = this.exports.get_x();
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  }

  /**
   * Get player Y position
   * @returns {number} Y position (0-1)
   */
  getY() {
    if (!this.isLoaded || typeof this.exports.get_y !== 'function') {return 0.5;}
    const v = this.exports.get_y();
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  }

  /**
   * Get player stamina from WASM
   * @returns {number} Stamina value (0-1)
   */
  getStamina() {
    if (!this.isLoaded || typeof this.exports.get_stamina !== 'function') {return 1;}
    return this.exports.get_stamina();
  }

  /**
   * Execute attack action (alias for attack)
   * @returns {number} Attack result (1 for success, 0 for failure)
   */
  onAttack() {
    if (!this.isLoaded || typeof this.exports.on_attack !== 'function') {return 0;}
    return this.exports.on_attack();
  }

  /**
   * Execute light attack action (A1)
   * @returns {boolean} Success status
   */
  lightAttack() {
    if (!this.isLoaded) {return false;}
    
    try {
      // Set light attack input and trigger update
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 1, 0, 0, 0); // lightAttack = 1
        return true;
      }
      // Fallback to legacy API if available
      if (typeof this.exports.on_light_attack === 'function') {
        return this.exports.on_light_attack() === 1;
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
    if (!this.isLoaded) {return false;}
    
    try {
      // Set heavy attack input and trigger update
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 0, 1, 0, 0); // heavyAttack = 1
        return true;
      }
      // Fallback to legacy API if available
      if (typeof this.exports.on_heavy_attack === 'function') {
        return this.exports.on_heavy_attack() === 1;
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
    if (!this.isLoaded) {return false;}
    
    try {
      // Set special attack input and trigger update
      if (typeof this.exports.set_player_input === 'function') {
        this.exports.set_player_input(0, 0, 0, 0, 0, 0, 0, 1); // special = 1
        return true;
      }
      // Fallback to legacy API if available
      if (typeof this.exports.on_special_attack === 'function') {
        return this.exports.on_special_attack() === 1;
      }
    } catch (error) {
      console.error('Special attack error:', error);
    }
    return false;
  }

  /**
   * Execute attack action (legacy - maps to light attack)
   * @returns {boolean} Success status
   */
  attack() {
    return this.lightAttack(); // Default to light attack for compatibility
  }

  /**
   * Start dodge roll (alias for startRoll)
   * @returns {number} Roll result (1 for success, 0 for failure)
   */
  onRollStart() {
    if (!this.isLoaded || typeof this.exports.on_roll_start !== 'function') {return 0;}
    return this.exports.on_roll_start();
  }

  /**
   * Start dodge roll
   * @returns {boolean} Success status
   */
  startRoll() {
    return this.onRollStart() === 1;
  }

  /**
   * Set blocking state
   * @param {boolean} isBlocking - Is player blocking
   * @param {number} faceX - Facing direction X
   * @param {number} faceY - Facing direction Y
   * @returns {boolean} Block state
   */
  setBlocking(isBlocking, faceX, faceY) {
    if (!this.isLoaded) {return false;}
    
    try {
      // Use the new set_player_input API for blocking
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
        return true;
      }
      // Fallback to legacy API if available
      if (typeof this.exports.set_blocking === 'function') {
        return this.exports.set_blocking(isBlocking ? 1 : 0, faceX, faceY) === 1;
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
    if (!this.isLoaded || typeof this.exports.get_block_state !== 'function') {return false;}
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
    if (!this.isLoaded || typeof this.exports.handle_incoming_attack !== 'function') {return -1;}
    return this.exports.handle_incoming_attack(ax, ay, dirX, dirY);
  }

  /**
   * Get game phase
   * @returns {number} Current game phase
   */
  getPhase() {
    if (!this.isLoaded || typeof this.exports.get_phase !== 'function') {return 0;}
    return this.exports.get_phase();
  }

  /**
   * Get room count from WASM
   * @returns {number} Current room count
   */
  getRoomCount() {
    if (!this.isLoaded || typeof this.exports.get_room_count !== 'function') {return 1;}
    return this.exports.get_room_count();
  }

  // ===== CHOICE SYSTEM =====

  /**
   * Get number of available choices
   * @returns {number} Number of choices
   */
  getChoiceCount() {
    if (!this.isLoaded || typeof this.exports.get_choice_count !== 'function') {return 0;}
    return this.exports.get_choice_count();
  }

  /**
   * Get choice ID at index
   * @param {number} index - Choice index
   * @returns {number} Choice ID
   */
  getChoiceId(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_id !== 'function') {return 0;}
    return this.exports.get_choice_id(index);
  }

  /**
   * Get choice type at index
   * @param {number} index - Choice index
   * @returns {number} Choice type
   */
  getChoiceType(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_type !== 'function') {return 0;}
    return this.exports.get_choice_type(index);
  }

  /**
   * Get choice rarity at index
   * @param {number} index - Choice index
   * @returns {number} Choice rarity
   */
  getChoiceRarity(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_rarity !== 'function') {return 0;}
    return this.exports.get_choice_rarity(index);
  }

  /**
   * Get choice tags at index
   * @param {number} index - Choice index
   * @returns {number} Choice tags
   */
  getChoiceTags(index) {
    if (!this.isLoaded || typeof this.exports.get_choice_tags !== 'function') {return 0;}
    return this.exports.get_choice_tags(index);
  }

  /**
   * Commit choice selection
   * @param {number} choiceId - Selected choice ID
   */
  commitChoice(choiceId) {
    if (!this.isLoaded || typeof this.exports.commit_choice !== 'function') {return;}
    this.exports.commit_choice(choiceId);
  }

  /**
   * Generate new choices
   */
  generateChoices() {
    if (!this.isLoaded || typeof this.exports.generate_choices !== 'function') {return;}
    this.exports.generate_choices();
  }

  // ===== RISK PHASE =====

  /**
   * Get number of active curses
   * @returns {number} Curse count
   */
  getCurseCount() {
    if (!this.isLoaded || typeof this.exports.get_curse_count !== 'function') {return 0;}
    return this.exports.get_curse_count();
  }

  /**
   * Get curse type at index
   * @param {number} index - Curse index
   * @returns {number} Curse type
   */
  getCurseType(index) {
    if (!this.isLoaded || typeof this.exports.get_curse_type !== 'function') {return 0;}
    
    // Validate index bounds
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
    if (!this.isLoaded || typeof this.exports.get_curse_intensity !== 'function') {return 0;}
    
    // Validate index bounds
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
    if (!this.isLoaded || typeof this.exports.get_risk_multiplier !== 'function') {return 1.0;}
    return this.exports.get_risk_multiplier();
  }

  /**
   * Check if elite enemy is active
   * @returns {boolean} Elite active status
   */
  getEliteActive() {
    if (!this.isLoaded || typeof this.exports.get_elite_active !== 'function') {return false;}
    return this.exports.get_elite_active() === 1;
  }

  /**
   * Escape risk phase
   */
  escapeRisk() {
    if (!this.isLoaded || typeof this.exports.escape_risk !== 'function') {return;}
    this.exports.escape_risk();
  }

  // ===== ESCALATE PHASE =====

  /**
   * Get escalation level (0-1)
   * @returns {number} Escalation level
   */
  getEscalationLevel() {
    if (!this.isLoaded || typeof this.exports.get_escalation_level !== 'function') {return 0;}
    return this.exports.get_escalation_level();
  }

  /**
   * Get spawn rate modifier
   * @returns {number} Spawn rate multiplier
   */
  getSpawnRateModifier() {
    if (!this.isLoaded || typeof this.exports.get_spawn_rate_modifier !== 'function') {return 1.0;}
    return this.exports.get_spawn_rate_modifier();
  }

  /**
   * Check if miniboss is active
   * @returns {boolean} Miniboss active status
   */
  getMinibossActive() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_active !== 'function') {return false;}
    return this.exports.get_miniboss_active() === 1;
  }

  /**
   * Get miniboss X position
   * @returns {number} Miniboss X position
   */
  getMinibossX() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_x !== 'function') {return 0;}
    return this.exports.get_miniboss_x();
  }

  /**
   * Get miniboss Y position
   * @returns {number} Miniboss Y position
   */
  getMinibossY() {
    if (!this.isLoaded || typeof this.exports.get_miniboss_y !== 'function') {return 0;}
    return this.exports.get_miniboss_y();
  }

  /**
   * Damage miniboss
   * @param {number} amount - Damage amount
   */
  damageMiniboss(amount) {
    if (!this.isLoaded || typeof this.exports.damage_miniboss !== 'function') {return;}
    this.exports.damage_miniboss(amount);
  }

  // ===== CASHOUT PHASE =====

  /**
   * Get gold amount
   * @returns {number} Gold amount
   */
  getGold() {
    if (!this.isLoaded || typeof this.exports.get_gold !== 'function') {return 0;}
    return this.exports.get_gold();
  }

  /**
   * Get essence amount
   * @returns {number} Essence amount
   */
  getEssence() {
    if (!this.isLoaded || typeof this.exports.get_essence !== 'function') {return 0;}
    return this.exports.get_essence();
  }

  /**
   * Get number of shop items
   * @returns {number} Shop item count
   */
  getShopItemCount() {
    if (!this.isLoaded || typeof this.exports.get_shop_item_count !== 'function') {return 0;}
    return this.exports.get_shop_item_count();
  }

  /**
   * Buy shop item at index
   * @param {number} index - Item index
   */
  buyShopItem(index) {
    if (!this.isLoaded || typeof this.exports.buy_shop_item !== 'function') {return;}
    this.exports.buy_shop_item(index);
  }

  /**
   * Buy full heal
   */
  buyHeal() {
    if (!this.isLoaded || typeof this.exports.buy_heal !== 'function') {return;}
    this.exports.buy_heal();
  }

  /**
   * Reroll shop items
   */
  rerollShopItems() {
    if (!this.isLoaded || typeof this.exports.reroll_shop_items !== 'function') {return;}
    this.exports.reroll_shop_items();
  }

  /**
   * Exit cashout phase
   */
  exitCashout() {
    if (!this.isLoaded || typeof this.exports.exit_cashout !== 'function') {return;}
    this.exports.exit_cashout();
  }

  // ===== HEALTH SYSTEM =====

  /**
   * Get player health points
   * @returns {number} Health (0-1)
   */
  getHP() {
    if (!this.isLoaded || typeof this.exports.get_hp !== 'function') {return 1;}
    return this.exports.get_hp();
  }

  /**
   * Get player maximum health
   * @returns {number} Max health
   */
  getMaxHP() {
    if (!this.isLoaded || typeof this.exports.get_max_hp !== 'function') {return 100;}
    return this.exports.get_max_hp();
  }

  /**
   * Get available choices count
   * @returns {number} Number of choices
   */
  // (removed duplicate getChoiceCount definition)

  /**
   * Get choice details
   * @param {number} index - Choice index
   * @returns {Object} Choice object with id, type, rarity, tags
   */
  getChoice(index) {
    if (!this.isLoaded) {return null;}
    
    // Validate index bounds before calling WASM functions
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

  // (deduplicated commitChoice; see method later in file)

  /**
   * Reset game run with new seed
   * @param {bigint} newSeed - New seed value
   */
  resetRun(newSeed) {
    if (!this.isLoaded || typeof this.exports.reset_run !== 'function') {return;}
    this.runSeed = newSeed;
    this.exports.reset_run(newSeed);
  }

  /**
   * Get timing constants
   * @returns {Object} Timing constants object
   */
  getTimingConstants() {
    return { ...this.timingConstants };
  }

  /**
   * Query roll state from WASM
   * @returns {boolean}
   */
  isRolling() {
    if (!this.isLoaded || typeof this.exports.get_is_rolling !== 'function') {return false;}
    try {
      return this.exports.get_is_rolling() === 1;
    } catch {
      return false;
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
   * Initialize a new run explicitly with a given seed and starting weapon.
   * @param {bigint|number|string} seed - Seed value (will be coerced to BigInt)
   * @param {number} weapon - Starting weapon id
   */
  initRun(seed, weapon = 0) {
    if (!this.isLoaded || typeof this.exports.init_run !== 'function') {return;}
    try {
      const newSeed = typeof seed === 'bigint' ? seed : BigInt(String(seed));
      this.runSeed = newSeed;
      this.exports.init_run(newSeed, weapon);
      globalThis.runSeedForVisuals = newSeed;
    } catch (error) {
      console.error('initRun failed:', error);
    }
  }

  // ============================================================================
  // World Simulation API - New comprehensive world simulation functions
  // ============================================================================

  /**
   * Get weather information
   * @returns {Object} Weather state object
   */
  getWeather() {
    if (!this.isLoaded) {return { rain: 0, windSpeed: 0, temperature: 20, lightning: false };}
    
    return {
      rain: typeof this.exports.get_weather_rain === 'function' ? this.exports.get_weather_rain() : 0,
      windSpeed: typeof this.exports.get_weather_wind_speed === 'function' ? this.exports.get_weather_wind_speed() : 0,
      temperature: typeof this.exports.get_weather_temperature === 'function' ? this.exports.get_weather_temperature() : 20,
      lightning: typeof this.exports.get_weather_lightning === 'function' ? this.exports.get_weather_lightning() === 1 : false
    };
  }

  /**
   * Set weather conditions
   * @param {Object} weather - Weather parameters
   */
  setWeather(weather) {
    if (!this.isLoaded) {return;}
    
    if (weather.rain !== undefined && typeof this.exports.set_weather_rain === 'function') {
      this.exports.set_weather_rain(weather.rain);
    }
    if (weather.wind !== undefined && typeof this.exports.set_weather_wind === 'function') {
      this.exports.set_weather_wind(weather.wind.speed || 0, 
                                   weather.wind.dirX || 0, 
                                   weather.wind.dirY || 0, 
                                   weather.wind.dirZ || 0);
    }
    if (weather.temperature !== undefined && typeof this.exports.set_weather_temperature === 'function') {
      this.exports.set_weather_temperature(weather.temperature);
    }
    if (weather.lightning !== undefined && typeof this.exports.set_weather_lightning === 'function') {
      this.exports.set_weather_lightning(weather.lightning ? 1 : 0);
    }
  }

  /**
   * Get time and day information
   * @returns {Object} Time state object
   */
  getTimeInfo() {
    if (!this.isLoaded) {return { timeOfDay: 12, dayCount: 0, isBloodMoon: false, lightLevel: 1, isNight: false };}
    
    return {
      timeOfDay: typeof this.exports.get_time_of_day === 'function' ? this.exports.get_time_of_day() : 12,
      dayCount: typeof this.exports.get_day_count === 'function' ? this.exports.get_day_count() : 0,
      isBloodMoon: typeof this.exports.is_blood_moon === 'function' ? this.exports.is_blood_moon() === 1 : false,
      lightLevel: typeof this.exports.get_light_level === 'function' ? this.exports.get_light_level() : 1,
      isNight: typeof this.exports.is_night_time === 'function' ? this.exports.is_night_time() === 1 : false
    };
  }

  /**
   * Set time scale (speed up/slow down time)
   * @param {number} scale - Time scale multiplier
   */
  setTimeScale(scale) {
    if (!this.isLoaded || typeof this.exports.set_time_scale !== 'function') {return;}
    this.exports.set_time_scale(scale);
  }

  /**
   * Get chemistry state at position
   * @param {number} x - X coordinate (0-1)
   * @param {number} y - Y coordinate (0-1)
   * @returns {Object} Chemistry state object
   */
  getChemistryState(x, y) {
    if (!this.isLoaded) {return { states: 0, temperature: 20, fuel: 0 };}
    
    return {
      states: typeof this.exports.get_chemistry_state === 'function' ? this.exports.get_chemistry_state(x, y) : 0,
      temperature: typeof this.exports.get_chemistry_temperature === 'function' ? this.exports.get_chemistry_temperature(x, y) : 20,
      fuel: typeof this.exports.get_chemistry_fuel === 'function' ? this.exports.get_chemistry_fuel(x, y) : 0,
      fireIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 1) : 0,
      waterIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 2) : 0,
      electricIntensity: typeof this.exports.get_chemistry_intensity === 'function' ? this.exports.get_chemistry_intensity(x, y, 8) : 0
    };
  }

  /**
   * Apply chemistry effects to area
   * @param {string} effect - Effect type ('fire', 'water', 'electric')
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Effect radius
   * @param {number} intensity - Effect intensity
   */
  applyChemistryEffect(effect, x, y, radius, intensity) {
    if (!this.isLoaded) {return;}
    
    switch (effect) {
      case 'fire':
        if (typeof this.exports.ignite_area === 'function') {
          this.exports.ignite_area(x, y, radius, intensity);
        }
        break;
      case 'water':
        if (typeof this.exports.douse_area === 'function') {
          this.exports.douse_area(x, y, radius, intensity);
        }
        break;
      case 'electric':
        if (typeof this.exports.electrify_area === 'function') {
          this.exports.electrify_area(x, y, radius, intensity);
        }
        break;
    }
  }

  /**
   * Get terrain information at position
   * @param {number} x - X coordinate (0-1)
   * @param {number} y - Y coordinate (0-1)
   * @returns {Object} Terrain information
   */
  getTerrainInfo(x, y) {
    if (!this.isLoaded) {return { elevation: 0, moisture: 0.5, climateZone: 0 };}
    
    return {
      elevation: typeof this.exports.get_terrain_elevation === 'function' ? this.exports.get_terrain_elevation(x, y) : 0,
      moisture: typeof this.exports.get_terrain_moisture === 'function' ? this.exports.get_terrain_moisture(x, y) : 0.5,
      climateZone: typeof this.exports.get_climate_zone === 'function' ? this.exports.get_climate_zone(x, y) : 0
    };
  }

  /**
   * Create physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} mass - Body mass
   * @param {number} radius - Body radius
   * @returns {number} Body ID
   */
  createPhysicsBody(x, y, z, mass, radius) {
    if (!this.isLoaded || typeof this.exports.create_rigid_body !== 'function') {return 0xFFFFFFFF;}
    return this.exports.create_rigid_body(x, y, z, mass, radius);
  }

  /**
   * Get physics body position
   * @param {number} bodyId - Body ID
   * @returns {Object} Position object
   */
  getPhysicsBodyPosition(bodyId) {
    if (!this.isLoaded) {return { x: 0, y: 0, z: 0 };}
    
    return {
      x: typeof this.exports.get_body_x === 'function' ? this.exports.get_body_x(bodyId) : 0,
      y: typeof this.exports.get_body_y === 'function' ? this.exports.get_body_y(bodyId) : 0,
      z: typeof this.exports.get_body_z === 'function' ? this.exports.get_body_z(bodyId) : 0
    };
  }

  /**
   * Apply force to physics body
   * @param {number} bodyId - Body ID
   * @param {number} fx - Force X
   * @param {number} fy - Force Y
   * @param {number} fz - Force Z
   */
  applyForce(bodyId, fx, fy, fz) {
    if (!this.isLoaded || typeof this.exports.apply_force_to_body !== 'function') {return;}
    this.exports.apply_force_to_body(bodyId, fx, fy, fz);
  }

  /**
   * Get start weapon from URL parameters
   * @returns {number} Weapon ID
   * @private
   */
  getStartWeaponFromUrl() {
    const urlParams = new URLSearchParams(location.search);
    const weaponParam = urlParams.get('weapon');
    
    if (weaponParam !== null) {
      const weaponId = parseInt(weaponParam, 10);
      if (!isNaN(weaponId) && weaponId >= 0 && weaponId < 4) { // 4 weapon types
        console.log('Using URL weapon:', weaponId);
        return weaponId;
      }
    }
    
    return 0; // Default weapon
  }

  /**
   * Get current weapon information
   * @returns {Object} Weapon info
   */
  getCurrentWeapon() {
    if (!this.isLoaded) {return { type: 0, character: 0, name: 'Basic Sword' };}
    
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
    if (!this.isLoaded || typeof this.exports.set_character_and_weapon !== 'function') {return;}
    this.exports.set_character_and_weapon(character, weapon);
  }

  /**
   * Get weapon stats
   * @returns {Object} Weapon stats
   */
  getWeaponStats() {
    if (!this.isLoaded) {return { damage: 1.0, speed: 1.0, reach: 1.0 };}
    
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
   * Create explosion
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} radius - Explosion radius
   * @param {number} force - Explosion force
   * @param {number} speed - Expansion speed
   * @returns {number} Explosion ID
   */
  createExplosion(x, y, z, radius, force, speed = 10) {
    if (!this.isLoaded || typeof this.exports.create_explosion_at !== 'function') {return 0xFFFFFFFF;}
    return this.exports.create_explosion_at(x, y, z, radius, force, speed);
  }

  /**
   * Get active explosions
   * @returns {Array} Array of explosion data
   */
  getExplosions() {
    if (!this.isLoaded || typeof this.exports.get_explosion_count !== 'function') {return [];}
    
    const count = this.exports.get_explosion_count();
    const explosions = [];
    
    for (let i = 0; i < count; i++) {
      if (typeof this.exports.is_explosion_active === 'function' && this.exports.is_explosion_active(i)) {
        explosions.push({
          id: i,
          x: typeof this.exports.get_explosion_x === 'function' ? this.exports.get_explosion_x(i) : 0,
          y: typeof this.exports.get_explosion_y === 'function' ? this.exports.get_explosion_y(i) : 0,
          z: typeof this.exports.get_explosion_z === 'function' ? this.exports.get_explosion_z(i) : 0,
          radius: typeof this.exports.get_explosion_current_radius === 'function' ? this.exports.get_explosion_current_radius(i) : 0
        });
      }
    }
    
    return explosions;
  }

  /**
   * Create heat source
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} temperature - Temperature in Celsius
   * @param {number} radius - Heat radius
   * @returns {number} Heat source ID
   */
  createHeatSource(x, y, z, temperature, radius) {
    if (!this.isLoaded || typeof this.exports.create_heat_source !== 'function') {return 0xFFFFFFFF;}
    return this.exports.create_heat_source(x, y, z, temperature, radius);
  }

  /**
   * Emit sound event
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @param {number} volume - Sound volume
   * @param {number} frequency - Sound frequency
   */
  emitSound(x, y, z, volume, frequency = 1000) {
    if (!this.isLoaded || typeof this.exports.emit_sound !== 'function') {return;}
    this.exports.emit_sound(x, y, z, volume, frequency);
  }

  /**
   * Get active sound events
   * @returns {Array} Array of sound event data
   */
  getSoundEvents() {
    if (!this.isLoaded || typeof this.exports.get_sound_event_count !== 'function') {return [];}
    
    const count = this.exports.get_sound_event_count();
    const sounds = [];
    
    for (let i = 0; i < count; i++) {
      sounds.push({
        x: typeof this.exports.get_sound_x === 'function' ? this.exports.get_sound_x(i) : 0,
        y: typeof this.exports.get_sound_y === 'function' ? this.exports.get_sound_y(i) : 0,
        volume: typeof this.exports.get_sound_volume === 'function' ? this.exports.get_sound_volume(i) : 0
      });
    }
    
    return sounds;
  }

  /**
   * Get hazard volumes
   * @returns {Array} Array of hazard data
   */
  getHazards() {
    if (!this.isLoaded || typeof this.exports.get_hazard_count !== 'function') {return [];}
    
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
          break; // Stop processing if we hit an index error
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
    if (!this.isLoaded || typeof this.exports.get_enemy_count !== 'function') {return 0;}
    return this.exports.get_enemy_count();
  }

  /**
   * Get memory buffer
   * @returns {ArrayBuffer} WASM memory buffer
   */
  getMemoryBuffer() {
    if (!this.isLoaded || !this.exports.memory) {return new ArrayBuffer(0);}
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
   * Load WASM module (alias for initialize)
   * @returns {Promise<boolean>} Success status
   */
  async load() {
    return await this.initialize();
  }

  /**
   * Show user-friendly WASM load error notification
   * @param {Array} loadAttempts - Array of load attempt results
   * @private
   */
  showWasmLoadError(loadAttempts) {
    // Create non-blocking notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
    `;
    
    const totalAttempts = loadAttempts.length;
    const failedAttempts = loadAttempts.filter(a => !a.success).length;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">⚠️ WASM Loading Failed</div>
      <div>Failed to load game engine (${failedAttempts}/${totalAttempts} attempts)</div>
      <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
        Running in limited fallback mode.<br>
        Some features may not work correctly.
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
        font-size: 11px;
      ">Dismiss</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }
  
  /**
   * Show critical error notification
   * @param {Error} error - The critical error
   * @private
   */
  showCriticalError(error) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 10001;
      max-width: 500px;
      font-family: monospace;
      text-align: center;
    `;
    
    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 16px;">💥</div>
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 12px;">Game Engine Failed to Initialize</div>
      <div style="margin-bottom: 16px; line-height: 1.4;">
        The WebAssembly game engine could not be loaded.<br>
        Please refresh the page or contact support if the issue persists.
      </div>
      <div style="font-size: 12px; opacity: 0.8; margin-bottom: 16px;">
        Error: ${error.message}
      </div>
      <button onclick="location.reload()" style="
        background: #fff;
        color: #dc3545;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-right: 8px;
      ">Reload Page</button>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">Continue Anyway</button>
    `;
    
    document.body.appendChild(notification);
  }
  
  /**
   * Emit initialization event for external listeners
   * @param {Object} details - Initialization details
   * @private
   */
  emitInitializationEvent(details) {
    try {
      const event = new CustomEvent('wasmInitialization', { detail: details });
      document.dispatchEvent(event);
    } catch (error) {
      console.warn('Failed to emit WASM initialization event:', error);
    }
  }
  
  /**
   * Create comprehensive fallback exports when WASM fails to load
   * @returns {Object} Comprehensive fallback exports object
   * @private
   */
  createFallbackExports() {
    console.warn('Creating comprehensive fallback WASM exports - significant limitations apply');
    
    // Track fallback function calls for debugging
    const fallbackCalls = new Map();
    const trackCall = (functionName) => {
      const count = fallbackCalls.get(functionName) || 0;
      fallbackCalls.set(functionName, count + 1);
      if (count === 0) {
        console.warn(`Fallback function called: ${functionName}`);
      }
    };
    
    // Simple simulation state for fallback mode
    let fallbackState = {
      playerX: 0.5,
      playerY: 0.5,
      stamina: 1.0,
      health: 1.0,
      phase: 0,
      isBlocking: false,
      lastUpdate: performance.now(),
      inputHistory: []
    };
    
    return {
      // Core simulation functions with enhanced fallback implementations
      start: () => {
        trackCall('start');
        console.log('Fallback: WASM runtime started (simulation only)');
        fallbackState.lastUpdate = performance.now();
      },
      
      set_player_input: (inputX, inputY, isRolling, isJumping, lightAttack, heavyAttack, isBlocking, special) => {
        trackCall('set_player_input');
        
        // Validate and clamp inputs
        const safeInputX = Math.max(-1, Math.min(1, Number(inputX) || 0));
        const safeInputY = Math.max(-1, Math.min(1, Number(inputY) || 0));
        
        // Store input for basic simulation
        fallbackState.inputHistory.push({
          x: safeInputX,
          y: safeInputY,
          rolling: Boolean(isRolling),
          attacking: Boolean(lightAttack || heavyAttack),
          blocking: Boolean(isBlocking),
          timestamp: performance.now()
        });
        
        // Keep only recent inputs
        if (fallbackState.inputHistory.length > 10) {
          fallbackState.inputHistory.shift();
        }
        
        fallbackState.isBlocking = Boolean(isBlocking);
      },
      
      update: (dtSeconds) => {
        trackCall('update');
        
        const safeDt = Math.max(0, Math.min(0.1, Number(dtSeconds) || 0.016));
        const now = performance.now();
        
        // Basic movement simulation
        const recentInput = fallbackState.inputHistory[fallbackState.inputHistory.length - 1];
        if (recentInput && (now - recentInput.timestamp) < 100) {
          const moveSpeed = 0.3 * safeDt;
          fallbackState.playerX += recentInput.x * moveSpeed;
          fallbackState.playerY += recentInput.y * moveSpeed;
          
          // Keep player in bounds
          fallbackState.playerX = Math.max(0, Math.min(1, fallbackState.playerX));
          fallbackState.playerY = Math.max(0, Math.min(1, fallbackState.playerY));
        }
        
        // Basic stamina regeneration
        if (!fallbackState.isBlocking) {
          fallbackState.stamina = Math.min(1.0, fallbackState.stamina + safeDt * 0.5);
        }
        
        fallbackState.lastUpdate = now;
      },
      
      get_x: () => {
        trackCall('get_x');
        return fallbackState.playerX;
      },
      
      get_y: () => {
        trackCall('get_y');
        return fallbackState.playerY;
      },
      
      get_stamina: () => {
        trackCall('get_stamina');
        return fallbackState.stamina;
      },
      
      on_attack: () => {
        trackCall('on_attack');
        // Consume stamina for attack
        if (fallbackState.stamina > 0.2) {
          fallbackState.stamina -= 0.2;
          return 1; // Attack succeeded
        }
        return 0; // Attack failed - not enough stamina
      },
      
      on_roll_start: () => {
        trackCall('on_roll_start');
        // Consume stamina for roll
        if (fallbackState.stamina > 0.3) {
          fallbackState.stamina -= 0.3;
          return 1; // Roll succeeded
        }
        return 0; // Roll failed - not enough stamina
      },
      
      set_blocking: (on, faceX, faceY, nowSeconds) => {
        trackCall('set_blocking');
        fallbackState.isBlocking = Boolean(on);
        return fallbackState.isBlocking ? 1 : 0;
      },
      
      get_block_state: () => {
        trackCall('get_block_state');
        return fallbackState.isBlocking ? 1 : 0;
      },
      
      handle_incoming_attack: (ax, ay, dirX, dirY, nowSeconds) => {
        trackCall('handle_incoming_attack');
        return fallbackState.isBlocking ? 1 : 0; // Block or take damage
      },
      
      // Game loop functions with basic state management
      init_run: (seed, startWeapon) => {
        trackCall('init_run');
        if (seed !== undefined && seed !== null) {
          this.runSeed = BigInt(seed);
        }
        
        // Reset fallback state
        fallbackState = {
          playerX: 0.5,
          playerY: 0.5,
          stamina: 1.0,
          health: 1.0,
          phase: 0,
          isBlocking: false,
          lastUpdate: performance.now(),
          inputHistory: []
        };
        
        console.log('Fallback: Game run initialized with seed:', this.runSeed);
      },
      
      reset_run: (newSeed) => {
        trackCall('reset_run');
        if (newSeed !== undefined && newSeed !== null) {
          this.runSeed = BigInt(newSeed);
        }
        
        // Reset to initial state
        Object.assign(fallbackState, {
          playerX: 0.5,
          playerY: 0.5,
          stamina: 1.0,
          health: 1.0,
          phase: 0,
          isBlocking: false,
          lastUpdate: performance.now(),
          inputHistory: []
        });
        
        console.log('Fallback: Game run reset with seed:', this.runSeed);
      },
      
      get_phase: () => {
        trackCall('get_phase');
        return fallbackState.phase;
      },
      
      get_choice_count: () => {
        trackCall('get_choice_count');
        return 0; // No choices in fallback mode
      },
      
      get_choice_id: (index) => {
        trackCall('get_choice_id');
        return 0;
      },
      
      get_choice_type: (index) => {
        trackCall('get_choice_type');
        return 0;
      },
      
      get_choice_rarity: (index) => {
        trackCall('get_choice_rarity');
        return 0;
      },
      
      get_choice_tags: (index) => {
        trackCall('get_choice_tags');
        return 0;
      },
      
      commit_choice: (choiceId) => {
        trackCall('commit_choice');
        console.log('Fallback: Choice committed (no effect):', choiceId);
      },
      
      // Additional fallback functions for all game phases
      escape_risk: () => {
        trackCall('escape_risk');
        console.log('Fallback: Risk phase escaped (no effect)');
      },
      
      get_health: () => {
        trackCall('get_health');
        return fallbackState.health;
      },
      
      get_room_count: () => {
        trackCall('get_room_count');
        return 1; // Always room 1 in fallback
      },
      
      // Risk phase functions
      get_curse_count: () => {
        trackCall('get_curse_count');
        return 0;
      },
      
      get_risk_multiplier: () => {
        trackCall('get_risk_multiplier');
        return 1.0;
      },
      
      // Shop functions
      get_gold: () => {
        trackCall('get_gold');
        return 0;
      },
      
      get_essence: () => {
        trackCall('get_essence');
        return 0;
      },
      
      // Debug function to get fallback call statistics
      __get_fallback_stats: () => {
        const stats = Object.fromEntries(fallbackCalls);
        console.log('Fallback function call statistics:', stats);
        return stats;
      },
      buy_heal: () => console.log('Fallback: WASM buy_heal() called'),
      reroll_shop_items: () => console.log('Fallback: WASM reroll_shop_items() called'),
      exit_cashout: () => console.log('Fallback: WASM exit_cashout() called'),
      
      // Biome and environment functions
      get_current_biome: () => 0, // Default to Forest biome
      
      // Timing constants
      get_attack_cooldown: () => 0.35,
      get_roll_duration: () => 0.18,
      get_roll_cooldown: () => 0.8,
      
      // Health system
      get_hp: () => 1.0,
      get_max_hp: () => 100,
      
      // Room and phase management
      get_room_count: () => 1,
      
      // Rolling state
      get_is_rolling: () => 0,
      
      // Weapon system
      get_current_weapon: () => 0,
      get_character_type: () => 0,
      set_character_and_weapon: () => {},
      get_weapon_damage_mult: () => 1.0,
      get_weapon_speed_mult: () => 1.0,
      get_weapon_reach_mult: () => 1.0,
      weapon_has_hyperarmor: () => 0,
      weapon_has_flow_combo: () => 0,
      weapon_has_bash_synergy: () => 0,
      
      // Wind and weather
      set_wind: () => {},
      
      // Enemy count
      get_enemy_count: () => 0,
      
      // Risk phase
      get_curse_count: () => 0,
      get_curse_type: () => 0,
      get_curse_intensity: () => 0,
      get_risk_multiplier: () => 1.0,
      get_elite_active: () => 0,
      
      // Escalate phase
      get_escalation_level: () => 0,
      get_spawn_rate_modifier: () => 1.0,
      get_miniboss_active: () => 0,
      get_miniboss_x: () => 0,
      get_miniboss_y: () => 0,
      damage_miniboss: () => {},
      
      // Cashout phase
      get_gold: () => 0,
      get_essence: () => 0,
      get_shop_item_count: () => 0,
      buy_shop_item: () => {},
      
      // Hazards
      get_hazard_count: () => 0,
      get_hazard_type: () => 0,
      get_hazard_x: () => 0,
      get_hazard_y: () => 0,
      get_hazard_radius: () => 0,
      get_hazard_intensity: () => 0
    };
  }
  
  /**
   * Check if WASM is running in fallback mode
   * @returns {boolean} True if in fallback mode
   */
  isFallback() {
    return this.isFallbackMode === true;
  }
  
  /**
   * Get WASM loading diagnostics
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
}
