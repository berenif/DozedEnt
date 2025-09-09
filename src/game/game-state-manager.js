/**
 * Game State Manager - Centralized state management for the game
 * Follows WASM-first architecture principles
 */

export class GameStateManager {
  constructor() {
    this.isGameRunning = false;
    this.isPaused = false;
    this.currentBiome = 0; // Default to Forest
    this.gameStartTime = 0;
    this.lastUpdateTime = 0;
    
    // Player state
    this.playerState = {
      position: { x: 0, y: 0 },
      stamina: 1,
      isRolling: false,
      isBlocking: false,
      facing: { x: 0, y: 0 },
      lastAttackTime: 0,
      lastRollTime: 0
    };

    // Game phase state
    this.phaseState = {
      currentPhase: 0, // Explore phase
      availableChoices: [],
      selectedChoice: null
    };

    // Wolf AI state
    this.wolfState = {
      characters: [],
      aiSystem: null,
      activeVocalizations: new Map()
    };

    // Camera and effects state
    this.cameraState = {
      shakeEndTime: 0,
      shakeStrength: 0,
      targetPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    };

    // Event listeners
    this.eventListeners = new Map();
  }

  /**
   * Initialize game state
   * @param {Object} wasmManager - WASM manager instance
   */
  initialize(wasmManager) {
    this.wasmManager = wasmManager;
    
    // Get initial biome from WASM
    this.currentBiome = wasmManager.getCurrentBiome();
    
    // Initialize player position
    const position = wasmManager.getPlayerPosition();
    this.playerState.position = position;
    
    // Initialize stamina
    this.playerState.stamina = wasmManager.getStamina();
    
    this.emit('stateInitialized', this.getStateSnapshot());
  }

  /**
   * Start the game
   */
  startGame() {
    if (this.isGameRunning) return;

    this.isGameRunning = true;
    this.isPaused = false;
    this.gameStartTime = performance.now();
    this.lastUpdateTime = this.gameStartTime;

    this.emit('gameStarted', {
      startTime: this.gameStartTime,
      biome: this.currentBiome
    });
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (!this.isGameRunning || this.isPaused) return;

    this.isPaused = true;
    this.emit('gamePaused');
  }

  /**
   * Resume the game
   */
  resumeGame() {
    if (!this.isGameRunning || !this.isPaused) return;

    this.isPaused = false;
    this.lastUpdateTime = performance.now();
    this.emit('gameResumed');
  }

  /**
   * Stop the game
   */
  stopGame() {
    if (!this.isGameRunning) return;

    this.isGameRunning = false;
    this.isPaused = false;
    
    this.emit('gameStopped');
  }

  /**
   * Update game state
   * @param {number} deltaTime - Delta time in seconds
   * @param {Object} inputState - Current input state
   */
  update(deltaTime, inputState) {
    if (!this.isGameRunning || this.isPaused || !this.wasmManager) return;

    const currentTime = performance.now();
    
    try {
      // Validate input state before passing to WASM
      const safeInputState = {
        direction: {
          x: Number.isFinite(inputState?.direction?.x) ? inputState.direction.x : 0,
          y: Number.isFinite(inputState?.direction?.y) ? inputState.direction.y : 0
        },
        isRolling: Boolean(inputState?.isRolling)
      };
      
      // Update WASM with deterministic inputs
      this.wasmManager.update(
        safeInputState.direction.x,
        safeInputState.direction.y,
        safeInputState.isRolling,
        deltaTime
      );

      // Read updated state from WASM
      this.updatePlayerState();
      this.updatePhaseState();
      this.updateCameraState();

      this.lastUpdateTime = currentTime;
      
      this.emit('stateUpdated', this.getStateSnapshot());
    } catch (error) {
      console.error('GameStateManager update error:', error, {
        deltaTime,
        inputState,
        isLoaded: this.wasmManager?.isLoaded,
        hasExports: !!this.wasmManager?.exports
      });
      
      // Emit error event but don't crash the game
      this.emit('updateError', { error, deltaTime, inputState });
    }
  }

  /**
   * Update player state from WASM
   * @private
   */
  updatePlayerState() {
    if (!this.wasmManager) return;

    // Get position from WASM
    const position = this.wasmManager.getPlayerPosition();
    this.playerState.position = position;

    // Get stamina from WASM
    this.playerState.stamina = this.wasmManager.getStamina();

    // Get blocking state from WASM
    this.playerState.isBlocking = this.wasmManager.isBlocking();

    // Authoritative rolling state from WASM if available
    if (typeof this.wasmManager.isRolling === 'function') {
      this.playerState.isRolling = this.wasmManager.isRolling();
    }
  }

  /**
   * Update phase state from WASM
   * @private
   */
  updatePhaseState() {
    if (!this.wasmManager) return;

    const phase = this.wasmManager.getPhase();
    if (phase !== this.phaseState.currentPhase) {
      this.phaseState.currentPhase = phase;
      this.emit('phaseChanged', phase);
    }

    // Update available choices if in choice phase
    if (phase === 2) { // Choose phase
      try {
        const choiceCount = this.wasmManager.getChoiceCount();
        this.phaseState.availableChoices = [];
        
        // Validate choice count to prevent bounds errors
        const safeChoiceCount = Number.isInteger(choiceCount) && choiceCount >= 0 ? Math.min(choiceCount, 10) : 0;
        
        for (let i = 0; i < safeChoiceCount; i++) {
          try {
            const choice = this.wasmManager.getChoice(i);
            if (choice) {
              this.phaseState.availableChoices.push(choice);
            }
          } catch (choiceError) {
            console.error(`Error getting choice at index ${i}:`, choiceError);
            break; // Stop processing if we hit an index error
          }
        }
      } catch (error) {
        console.error('Error updating choice state:', error);
        this.phaseState.availableChoices = [];
      }
    }
  }

  /**
   * Update camera state
   * @private
   */
  updateCameraState() {
    const now = performance.now();
    
    // Update screen shake
    if (now < this.cameraState.shakeEndTime) {
      this.applyScreenShake(now);
    } else {
      this.cameraState.shakeStrength = 0;
    }

    // Update camera position (smooth following)
    const lerpFactor = 0.1;
    this.cameraState.currentPosition.x += 
      (this.cameraState.targetPosition.x - this.cameraState.currentPosition.x) * lerpFactor;
    this.cameraState.currentPosition.y += 
      (this.cameraState.targetPosition.y - this.cameraState.currentPosition.y) * lerpFactor;
  }

  /**
   * Apply screen shake effect
   * @param {number} now - Current timestamp
   * @private
   */
  applyScreenShake(now) {
    const remainingTime = this.cameraState.shakeEndTime - now;
    const intensity = remainingTime / 140; // 140ms duration
    
    this.cameraState.shakeStrength = this.cameraState.shakeStrength * intensity;
  }

  /**
   * Trigger screen shake
   * @param {number} strength - Shake strength in pixels
   * @param {number} duration - Duration in milliseconds
   */
  screenShake(strength = 4, duration = 140) {
    this.cameraState.shakeStrength = strength;
    this.cameraState.shakeEndTime = performance.now() + duration;
  }

  /**
   * Handle player light attack (A1)
   * @returns {boolean} Success status
   */
  lightAttack() {
    if (!this.wasmManager) return false;

    const success = this.wasmManager.lightAttack();
    if (success) {
      this.playerState.lastAttackTime = performance.now();
      this.emit('playerLightAttacked', { timestamp: this.playerState.lastAttackTime });
    }
    
    return success;
  }

  /**
   * Handle player heavy attack (A2)
   * @returns {boolean} Success status
   */
  heavyAttack() {
    if (!this.wasmManager) return false;

    const success = this.wasmManager.heavyAttack();
    if (success) {
      this.playerState.lastAttackTime = performance.now();
      this.emit('playerHeavyAttacked', { timestamp: this.playerState.lastAttackTime });
    }
    
    return success;
  }

  /**
   * Handle player special attack (Hero move)
   * @returns {boolean} Success status
   */
  specialAttack() {
    if (!this.wasmManager) return false;

    const success = this.wasmManager.specialAttack();
    if (success) {
      this.playerState.lastAttackTime = performance.now();
      this.emit('playerSpecialAttacked', { timestamp: this.playerState.lastAttackTime });
    }
    
    return success;
  }

  /**
   * Handle player attack (legacy - maps to light attack)
   * @returns {boolean} Success status
   */
  attack() {
    return this.lightAttack(); // Default to light attack for compatibility
  }

  /**
   * Handle player roll
   * @returns {boolean} Success status
   */
  roll() {
    if (!this.wasmManager) return false;

    const success = this.wasmManager.startRoll();
    if (success) {
      this.playerState.isRolling = true;
      this.playerState.lastRollTime = performance.now();
      this.emit('playerRolled', { timestamp: this.playerState.lastRollTime });
    }
    
    return success;
  }

  /**
   * Handle player blocking
   * @param {boolean} isBlocking - Is player blocking
   * @param {number} faceX - Facing direction X
   * @param {number} faceY - Facing direction Y
   */
  setBlocking(isBlocking, faceX, faceY) {
    if (!this.wasmManager) return;

    const success = this.wasmManager.setBlocking(isBlocking, faceX, faceY, performance.now() / 1000);
    if (success) {
      this.playerState.isBlocking = isBlocking;
      this.playerState.facing = { x: faceX, y: faceY };
      this.emit('playerBlockingChanged', { isBlocking, facing: this.playerState.facing });
    }
  }

  /**
   * Handle choice selection
   * @param {number} choiceId - Choice ID to commit
   */
  commitChoice(choiceId) {
    if (!this.wasmManager) return;

    this.wasmManager.commitChoice(choiceId);
    this.phaseState.selectedChoice = choiceId;
    this.emit('choiceCommitted', { choiceId });
  }

  /**
   * Add wolf character
   * @param {Object} wolfCharacter - Wolf character instance
   */
  addWolfCharacter(wolfCharacter) {
    this.wolfState.characters.push(wolfCharacter);
    this.emit('wolfAdded', { wolf: wolfCharacter });
  }

  /**
   * Remove wolf character
   * @param {Object} wolfCharacter - Wolf character instance
   */
  removeWolfCharacter(wolfCharacter) {
    const index = this.wolfState.characters.indexOf(wolfCharacter);
    if (index > -1) {
      this.wolfState.characters.splice(index, 1);
      this.emit('wolfRemoved', { wolf: wolfCharacter });
    }
  }

  /**
   * Set wolf AI system
   * @param {Object} aiSystem - AI system instance
   */
  setWolfAISystem(aiSystem) {
    this.wolfState.aiSystem = aiSystem;
    this.emit('wolfAISystemSet', { aiSystem });
  }

  /**
   * Get current state snapshot
   * @returns {Object} State snapshot
   */
  getStateSnapshot() {
    return {
      isGameRunning: this.isGameRunning,
      isPaused: this.isPaused,
      currentBiome: this.currentBiome,
      gameStartTime: this.gameStartTime,
      playerState: { ...this.playerState },
      phaseState: { ...this.phaseState },
      wolfState: {
        characterCount: this.wolfState.characters.length,
        hasAISystem: !!this.wolfState.aiSystem
      },
      cameraState: { ...this.cameraState }
    };
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Reset game state
   */
  reset() {
    this.isGameRunning = false;
    this.isPaused = false;
    this.gameStartTime = 0;
    this.lastUpdateTime = 0;
    
    this.playerState = {
      position: { x: 0, y: 0 },
      stamina: 1,
      isRolling: false,
      isBlocking: false,
      facing: { x: 0, y: 0 },
      lastAttackTime: 0,
      lastRollTime: 0
    };

    this.phaseState = {
      currentPhase: 0,
      availableChoices: [],
      selectedChoice: null
    };

    this.wolfState.characters = [];
    this.wolfState.aiSystem = null;

    this.cameraState = {
      shakeEndTime: 0,
      shakeStrength: 0,
      targetPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    };

    this.emit('stateReset');
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup() {
    // Clear wolf characters
    this.wolfState.characters.forEach(wolf => {
      if (wolf.cleanup && typeof wolf.cleanup === 'function') {
        wolf.cleanup();
      }
    });
    this.wolfState.characters.length = 0;

    // Clear active vocalizations
    this.wolfState.activeVocalizations.clear();

    // Clear event listeners
    this.eventListeners.clear();

    // Reset AI system reference
    this.wolfState.aiSystem = null;

    // Reset WASM manager reference
    this.wasmManager = null;

    console.log('GameStateManager cleaned up');
  }
}
