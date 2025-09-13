/**
 * Comprehensive Game Error Handler
 * Handles complex game interaction errors, WASM failures, and recovery strategies
 */

/* global validatedAttack */

import { inputValidator } from './input-validator.js';
import { createLogger } from './logger.js';

export class GameErrorHandler {
  constructor() {
    this.logger = createLogger({ prefix: 'GameErrorHandler' });
    
    // Error tracking and recovery state
    this.errorState = {
      consecutiveErrors: 0,
      lastErrorTime: 0,
      maxConsecutiveErrors: 5,
      recoveryTimeout: 1000,
      isRecovering: false,
      errorHistory: []
    };
    
    // Performance monitoring
    this.performanceMonitor = {
      updateTimes: [],
      maxSamples: 60,
      slowFrameThreshold: 32, // 32ms = 30 FPS
      slowFrameCount: 0,
      lastPerformanceWarning: 0
    };
    
    // Combat interaction error tracking
    this.combatErrors = {
      invalidAttacks: 0,
      stateDesync: 0,
      timingViolations: 0,
      lastCombatError: 0
    };
    
    // Phase transition error tracking
    this.phaseErrors = {
      invalidTransitions: 0,
      corruptedChoices: 0,
      stateInconsistencies: 0,
      lastPhaseError: 0
    };
  }

  /**
   * Handle WASM-specific errors with recovery strategies
   */
  handleWasmError(functionName, error, context = {}) {
    this.logError('wasm', functionName, error, context);
    
    const errorInfo = {
      type: 'wasm',
      function: functionName,
      message: error.message,
      timestamp: performance.now(),
      context
    };
    
    this.errorState.errorHistory.push(errorInfo);
    this.errorState.consecutiveErrors++;
    this.errorState.lastErrorTime = performance.now();
    
    // Specific WASM error handling strategies
    switch (functionName) {
      case 'update':
        return this.handleWasmUpdateError(error, context);
      case 'set_player_input':
        return this.handleWasmInputError(error, context);
      case 'get_phase':
      case 'get_choice_count':
        return this.handleWasmStateError(error, context);
      default:
        return this.handleGenericWasmError(error, context);
    }
  }

  /**
   * Handle WASM update function errors
   */
  handleWasmUpdateError(error, context) {
    this.logger.error('WASM update function failed:', error);
    
    // Check if error is due to invalid delta time
    if (context.deltaTime && (context.deltaTime < 0 || context.deltaTime > 0.1)) {
      this.logger.warn('Invalid delta time detected, sanitizing:', context.deltaTime);
      return { 
        action: 'sanitize_input',
        sanitizedDeltaTime: Math.max(0, Math.min(0.1, context.deltaTime || 0.016))
      };
    }
    
    // Check if WASM state is corrupted
    if (error.message.includes('memory') || error.message.includes('bounds')) {
      this.logger.error('WASM memory corruption detected');
      return { action: 'reset_wasm' };
    }
    
    return { action: 'skip_frame' };
  }

  /**
   * Handle WASM input function errors
   */
  handleWasmInputError(error, context) {
    this.logger.error('WASM input function failed:', error);
    
    // Validate input parameters
    if (context.inputState) {
      const validatedInput = this.validateGameInput(context.inputState);
      if (validatedInput.hasErrors) {
        this.logger.warn('Invalid input detected:', validatedInput.errors);
        return { 
          action: 'sanitize_input',
          sanitizedInput: validatedInput.sanitized
        };
      }
    }
    
    return { action: 'skip_input' };
  }

  /**
   * Handle WASM state reading errors
   */
  handleWasmStateError(error, _context) {
    this.logger.error('WASM state reading failed:', error);
    
    // If we can't read state, we might need to reset
    if (this.errorState.consecutiveErrors > 3) {
      return { action: 'reset_wasm' };
    }
    
    return { action: 'use_cached_state' };
  }

  /**
   * Handle generic WASM errors
   */
  handleGenericWasmError(error, _context) {
    this.logger.error('Generic WASM error:', error);
    
    // If too many errors, suggest recovery
    if (this.errorState.consecutiveErrors >= this.errorState.maxConsecutiveErrors) {
      return { action: 'enter_recovery' };
    }
    
    return { action: 'continue' };
  }

  /**
   * Handle combat interaction errors
   */
  handleCombatError(errorType, details) {
    this.combatErrors[errorType] = (this.combatErrors[errorType] || 0) + 1;
    this.combatErrors.lastCombatError = performance.now();
    
    this.logError('combat', errorType, new Error(`Combat error: ${errorType}`), details);
    
    switch (errorType) {
      case 'invalid_attack':
        return this.handleInvalidAttack(details);
      case 'state_desync':
        return this.handleCombatDesync(details);
      case 'timing_violation':
        return this.handleTimingViolation(details);
      default:
        return { action: 'log_and_continue' };
    }
  }

  /**
   * Handle invalid attack attempts
   */
  handleInvalidAttack(details) {
    // Validate attack parameters
    if (details.attackData) {
      const validatedAttack = inputValidator.validateCombatInteraction(details.attackData);
      if (!validatedAttack) {
        this.logger.warn('Attack blocked due to invalid parameters');
        return { action: 'block_attack' };
      }
    }
    
    // Check for attack spam
    if (this.combatErrors.invalidAttacks > 10) {
      this.logger.warn('Too many invalid attacks - possible exploit attempt');
      return { action: 'temporary_block' };
    }
    
    return { action: 'sanitize_attack', sanitizedData: validatedAttack };
  }

  /**
   * Handle combat state desynchronization
   */
  handleCombatDesync(details) {
    this.logger.error('Combat state desync detected:', details);
    
    // Attempt to resync by requesting authoritative state
    return { 
      action: 'request_resync',
      syncData: {
        timestamp: performance.now(),
        playerStates: details.playerStates,
        combatStates: details.combatStates
      }
    };
  }

  /**
   * Handle timing violations in combat
   */
  handleTimingViolation(details) {
    this.logger.warn('Combat timing violation:', details);
    
    // Check if violation is within acceptable threshold
    const timingError = Math.abs(details.expectedTime - details.actualTime);
    if (timingError > 100) { // 100ms threshold
      this.logger.error('Severe timing violation detected:', timingError);
      return { action: 'reject_action' };
    }
    
    return { action: 'accept_with_warning' };
  }

  /**
   * Handle phase transition errors
   */
  handlePhaseError(errorType, details) {
    this.phaseErrors[errorType] = (this.phaseErrors[errorType] || 0) + 1;
    this.phaseErrors.lastPhaseError = performance.now();
    
    this.logError('phase', errorType, new Error(`Phase error: ${errorType}`), details);
    
    switch (errorType) {
      case 'invalid_transition':
        return this.handleInvalidPhaseTransition(details);
      case 'corrupted_choices':
        return this.handleCorruptedChoices(details);
      case 'state_inconsistency':
        return this.handlePhaseStateInconsistency(details);
      default:
        return { action: 'log_and_continue' };
    }
  }

  /**
   * Handle invalid phase transitions
   */
  handleInvalidPhaseTransition(details) {
    const { fromPhase, toPhase, expectedPhase } = details;
    
    this.logger.error(`Invalid phase transition: ${fromPhase} -> ${toPhase} (expected: ${expectedPhase})`);
    
    // Validate the phase transition
    const validPhase = inputValidator.validatePhase(toPhase);
    if (validPhase !== toPhase) {
      return { 
        action: 'correct_phase',
        correctedPhase: validPhase
      };
    }
    
    // Check if this is a valid transition sequence
    const validTransitions = this.getValidPhaseTransitions(fromPhase);
    if (!validTransitions.includes(toPhase)) {
      return {
        action: 'force_valid_transition',
        validPhase: validTransitions[0] || 0
      };
    }
    
    return { action: 'allow_transition' };
  }

  /**
   * Handle corrupted choice data
   */
  handleCorruptedChoices(details) {
    this.logger.error('Corrupted choice data detected:', details);
    
    // Attempt to regenerate choices
    return {
      action: 'regenerate_choices',
      fallbackChoices: this.generateFallbackChoices()
    };
  }

  /**
   * Handle phase state inconsistencies
   */
  handlePhaseStateInconsistency(details) {
    this.logger.error('Phase state inconsistency:', details);
    
    // Reset to a known good state
    return {
      action: 'reset_phase_state',
      safeState: {
        currentPhase: 0, // Reset to Explore phase
        availableChoices: [],
        selectedChoice: null
      }
    };
  }

  /**
   * Validate comprehensive game input
   */
  validateGameInput(inputState) {
    const errors = [];
    const sanitized = {};
    
    // Validate movement
    if (inputState.direction) {
      const movement = inputValidator.validateMovement(
        inputState.direction.x,
        inputState.direction.y
      );
      
      if (movement.blocked) {
        errors.push('movement_blocked');
      }
      
      sanitized.direction = { x: movement.x, y: movement.y };
    }
    
    // Validate button inputs
    const buttonInputs = ['roll', 'lightAttack', 'heavyAttack', 'block', 'special'];
    buttonInputs.forEach(button => {
      if (button in inputState) {
        sanitized[button] = inputValidator.validateBoolean(inputState[button]);
      }
    });
    
    // Validate timing
    if (inputState.timestamp) {
      const now = performance.now();
      if (Math.abs(inputState.timestamp - now) > 5000) { // 5 second threshold
        errors.push('invalid_timestamp');
        sanitized.timestamp = now;
      } else {
        sanitized.timestamp = inputState.timestamp;
      }
    }
    
    return {
      hasErrors: errors.length > 0,
      errors,
      sanitized
    };
  }

  /**
   * Monitor performance and detect issues
   */
  monitorPerformance(updateTime) {
    this.performanceMonitor.updateTimes.push(updateTime);
    
    // Keep only recent samples
    if (this.performanceMonitor.updateTimes.length > this.performanceMonitor.maxSamples) {
      this.performanceMonitor.updateTimes.shift();
    }
    
    // Check for slow frames
    if (updateTime > this.performanceMonitor.slowFrameThreshold) {
      this.performanceMonitor.slowFrameCount++;
      
      const now = performance.now();
      if (now - this.performanceMonitor.lastPerformanceWarning > 5000) { // Warn every 5 seconds max
        this.logger.warn(`Performance warning: Slow frame detected (${updateTime.toFixed(1)}ms)`);
        this.performanceMonitor.lastPerformanceWarning = now;
        
        return {
          action: 'performance_warning',
          details: {
            updateTime,
            slowFrameCount: this.performanceMonitor.slowFrameCount,
            averageTime: this.getAverageUpdateTime()
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Get average update time for performance monitoring
   */
  getAverageUpdateTime() {
    if (this.performanceMonitor.updateTimes.length === 0) {
      return 0;
    }
    
    const sum = this.performanceMonitor.updateTimes.reduce((a, b) => a + b, 0);
    return sum / this.performanceMonitor.updateTimes.length;
  }

  /**
   * Get valid phase transitions for a given phase
   */
  getValidPhaseTransitions(fromPhase) {
    const transitions = {
      0: [1], // Explore -> Fight
      1: [2], // Fight -> Choose
      2: [3], // Choose -> PowerUp
      3: [4, 0], // PowerUp -> Risk or Explore (skip)
      4: [5, 6], // Risk -> Escalate or CashOut
      5: [6], // Escalate -> CashOut
      6: [7], // CashOut -> Reset
      7: [0]  // Reset -> Explore
    };
    
    return transitions[fromPhase] || [0];
  }

  /**
   * Generate fallback choices when choice system fails
   */
  generateFallbackChoices() {
    return [
      {
        id: 0,
        type: 0, // Safe choice
        rarity: 0, // Common
        tags: 0,
        description: 'Continue (Safe)'
      },
      {
        id: 1,
        type: 1, // Spicy choice
        rarity: 0, // Common
        tags: 0,
        description: 'Take Risk (Spicy)'
      },
      {
        id: 2,
        type: 2, // Weird choice
        rarity: 0, // Common
        tags: 0,
        description: 'Something Different (Weird)'
      }
    ];
  }

  /**
   * Log error with context
   */
  logError(category, type, error, context) {
    const errorEntry = {
      category,
      type,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      performanceTime: performance.now()
    };
    
    this.errorState.errorHistory.push(errorEntry);
    
    // Keep only recent errors (last 100)
    if (this.errorState.errorHistory.length > 100) {
      this.errorState.errorHistory.shift();
    }
    
    this.logger.error(`${category}:${type}`, error, context);
  }

  /**
   * Check if system should enter recovery mode
   */
  shouldEnterRecovery() {
    const now = performance.now();
    
    // Check consecutive errors
    if (this.errorState.consecutiveErrors >= this.errorState.maxConsecutiveErrors) {
      return true;
    }
    
    // Check error frequency
    const recentErrors = this.errorState.errorHistory.filter(
      e => (now - e.performanceTime) < 10000 // Last 10 seconds
    );
    
    if (recentErrors.length > 20) { // More than 20 errors in 10 seconds
      return true;
    }
    
    // Check critical error types
    const criticalErrors = recentErrors.filter(
      e => e.category === 'wasm' && e.type === 'update'
    );
    
    if (criticalErrors.length > 5) { // More than 5 WASM update errors
      return true;
    }
    
    return false;
  }

  /**
   * Enter recovery mode
   */
  enterRecovery() {
    this.errorState.isRecovering = true;
    this.logger.warn('Entering error recovery mode');
    
    return {
      action: 'enter_recovery',
      recoverySteps: [
        'pause_updates',
        'reset_wasm_state',
        'clear_error_counters',
        'resume_with_monitoring'
      ]
    };
  }

  /**
   * Exit recovery mode
   */
  exitRecovery() {
    this.errorState.isRecovering = false;
    this.errorState.consecutiveErrors = 0;
    this.logger.log('Exited error recovery mode');
  }

  /**
   * Get comprehensive error statistics
   */
  getErrorStats() {
    return {
      errorState: { ...this.errorState },
      performanceMonitor: { ...this.performanceMonitor },
      combatErrors: { ...this.combatErrors },
      phaseErrors: { ...this.phaseErrors },
      validationStats: inputValidator.getValidationStats(),
      recentErrors: this.errorState.errorHistory.slice(-10)
    };
  }

  /**
   * Reset all error counters and history
   */
  reset() {
    this.errorState = {
      consecutiveErrors: 0,
      lastErrorTime: 0,
      maxConsecutiveErrors: 5,
      recoveryTimeout: 1000,
      isRecovering: false,
      errorHistory: []
    };
    
    this.performanceMonitor.slowFrameCount = 0;
    this.combatErrors = {
      invalidAttacks: 0,
      stateDesync: 0,
      timingViolations: 0,
      lastCombatError: 0
    };
    
    this.phaseErrors = {
      invalidTransitions: 0,
      corruptedChoices: 0,
      stateInconsistencies: 0,
      lastPhaseError: 0
    };
    
    inputValidator.resetStats();
    
    this.logger.log('Error handler reset');
  }
}

// Create global instance
export const gameErrorHandler = new GameErrorHandler();
