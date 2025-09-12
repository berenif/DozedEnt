/**
 * Comprehensive Input Validation and Sanitization
 * Handles edge cases and malicious input for all game systems
 */

export class InputValidator {
  constructor() {
    this.validationRules = {
      movement: {
        x: { min: -1, max: 1, type: 'number' },
        y: { min: -1, max: 1, type: 'number' }
      },
      timing: {
        deltaTime: { min: 0, max: 0.1, type: 'number' },
        timestamp: { min: 0, max: Number.MAX_SAFE_INTEGER, type: 'number' }
      },
      gameState: {
        phase: { min: 0, max: 7, type: 'integer' },
        stamina: { min: 0, max: 1, type: 'number' },
        health: { min: 0, max: 1, type: 'number' }
      },
      network: {
        playerId: { minLength: 1, maxLength: 64, type: 'string' },
        messageType: { enum: ['input', 'state', 'chat', 'system'], type: 'string' }
      }
    };
    
    this.validationStats = {
      totalValidations: 0,
      failedValidations: 0,
      sanitizedInputs: 0,
      blockedInputs: 0
    };
    
    this.suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /eval\(/i,
      /function\(/i,
      /<.*>/,
      /\$\{.*\}/,
      /\.\.\//g
    ];
  }

  /**
   * Validate and sanitize movement input
   */
  validateMovement(inputX, inputY) {
    this.validationStats.totalValidations++;
    
    try {
      // Convert to numbers and handle edge cases
      let x = this.sanitizeNumber(inputX, -1, 1);
      let y = this.sanitizeNumber(inputY, -1, 1);
      
      // Handle NaN, Infinity, and other edge cases
      if (!Number.isFinite(x)) {
        console.warn('Invalid movement X input:', inputX, '-> sanitized to 0');
        x = 0;
        this.validationStats.sanitizedInputs++;
      }
      
      if (!Number.isFinite(y)) {
        console.warn('Invalid movement Y input:', inputY, '-> sanitized to 0');
        y = 0;
        this.validationStats.sanitizedInputs++;
      }
      
      // Clamp to valid range
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      
      // Check for suspicious patterns (potential injection)
      if (this.containsSuspiciousPattern(String(inputX)) || 
          this.containsSuspiciousPattern(String(inputY))) {
        console.error('Suspicious movement input detected:', { inputX, inputY });
        this.validationStats.blockedInputs++;
        return { x: 0, y: 0, blocked: true };
      }
      
      return { x, y, blocked: false };
      
    } catch (error) {
      console.error('Movement validation error:', error);
      this.validationStats.failedValidations++;
      return { x: 0, y: 0, blocked: true };
    }
  }

  /**
   * Validate delta time for game updates
   */
  validateDeltaTime(deltaTime) {
    this.validationStats.totalValidations++;
    
    try {
      let dt = this.sanitizeNumber(deltaTime, 0, 0.1);
      
      // Handle edge cases
      if (!Number.isFinite(dt) || dt < 0) {
        console.warn('Invalid deltaTime:', deltaTime, '-> using default 16ms');
        dt = 0.016; // Default 60 FPS
        this.validationStats.sanitizedInputs++;
      }
      
      // Cap extremely high delta times (prevents time-based exploits)
      if (dt > 0.1) {
        console.warn('Delta time capped:', deltaTime, '-> 100ms');
        dt = 0.1;
        this.validationStats.sanitizedInputs++;
      }
      
      // Cap extremely low delta times (prevents division by zero)
      if (dt > 0 && dt < 0.001) {
        dt = 0.001; // Minimum 1ms
        this.validationStats.sanitizedInputs++;
      }
      
      return dt;
      
    } catch (error) {
      console.error('Delta time validation error:', error);
      this.validationStats.failedValidations++;
      return 0.016; // Safe default
    }
  }

  /**
   * Validate boolean inputs (buttons, flags)
   */
  validateBoolean(input, defaultValue = false) {
    this.validationStats.totalValidations++;
    
    try {
      // Handle various truthy/falsy representations
      if (input === null || input === undefined) {
        return defaultValue;
      }
      
      if (typeof input === 'boolean') {
        return input;
      }
      
      if (typeof input === 'number') {
        return input !== 0;
      }
      
      if (typeof input === 'string') {
        const lower = input.toLowerCase().trim();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
          return false;
        }
        
        // Check for suspicious patterns in string booleans
        if (this.containsSuspiciousPattern(input)) {
          console.error('Suspicious boolean input:', input);
          this.validationStats.blockedInputs++;
          return defaultValue;
        }
      }
      
      // Fallback to default for unexpected types
      console.warn('Unexpected boolean input type:', typeof input, input);
      this.validationStats.sanitizedInputs++;
      return defaultValue;
      
    } catch (error) {
      console.error('Boolean validation error:', error);
      this.validationStats.failedValidations++;
      return defaultValue;
    }
  }

  /**
   * Validate game phase transitions
   */
  validatePhase(phase) {
    this.validationStats.totalValidations++;
    
    try {
      const phaseNum = this.sanitizeNumber(phase, 0, 7);
      
      if (!Number.isInteger(phaseNum) || phaseNum < 0 || phaseNum > 7) {
        console.error('Invalid game phase:', phase, '-> reset to 0');
        this.validationStats.sanitizedInputs++;
        return 0;
      }
      
      return phaseNum;
      
    } catch (error) {
      console.error('Phase validation error:', error);
      this.validationStats.failedValidations++;
      return 0;
    }
  }

  /**
   * Validate network message
   */
  validateNetworkMessage(message) {
    this.validationStats.totalValidations++;
    
    try {
      if (!message || typeof message !== 'object') {
        console.error('Invalid network message format:', typeof message);
        this.validationStats.blockedInputs++;
        return null;
      }
      
      // Check message size (prevent DoS attacks)
      const messageStr = JSON.stringify(message);
      if (messageStr.length > 10000) { // 10KB limit
        console.error('Network message too large:', messageStr.length);
        this.validationStats.blockedInputs++;
        return null;
      }
      
      // Validate message type
      if (!message.type || !this.validationRules.network.messageType.enum.includes(message.type)) {
        console.error('Invalid message type:', message.type);
        this.validationStats.blockedInputs++;
        return null;
      }
      
      // Check for suspicious patterns in message content
      if (this.containsSuspiciousPattern(messageStr)) {
        console.error('Suspicious network message content detected');
        this.validationStats.blockedInputs++;
        return null;
      }
      
      // Validate specific message types
      switch (message.type) {
        case 'input':
          return this.validateInputMessage(message);
        case 'state':
          return this.validateStateMessage(message);
        case 'chat':
          return this.validateChatMessage(message);
        default:
          return message; // Pass through system messages
      }
      
    } catch (error) {
      console.error('Network message validation error:', error);
      this.validationStats.failedValidations++;
      return null;
    }
  }

  /**
   * Validate input message from network
   */
  validateInputMessage(message) {
    if (!message.data) {
      return null;
    }
    
    const validatedInput = {
      type: 'input',
      timestamp: this.validateTimestamp(message.timestamp),
      playerId: this.validatePlayerId(message.playerId),
      data: {}
    };
    
    // Validate movement data
    if (message.data.movement) {
      validatedInput.data.movement = this.validateMovement(
        message.data.movement.x,
        message.data.movement.y
      );
    }
    
    // Validate button states
    if (message.data.buttons) {
      validatedInput.data.buttons = {
        attack: this.validateBoolean(message.data.buttons.attack),
        roll: this.validateBoolean(message.data.buttons.roll),
        block: this.validateBoolean(message.data.buttons.block),
        special: this.validateBoolean(message.data.buttons.special)
      };
    }
    
    return validatedInput;
  }

  /**
   * Validate state sync message
   */
  validateStateMessage(message) {
    if (!message.data) {
      return null;
    }
    
    // Basic state validation
    const validatedState = {
      type: 'state',
      timestamp: this.validateTimestamp(message.timestamp),
      data: {
        phase: this.validatePhase(message.data.phase),
        players: {}
      }
    };
    
    // Validate player states
    if (message.data.players) {
      for (const [playerId, playerState] of Object.entries(message.data.players)) {
        const validId = this.validatePlayerId(playerId);
        if (validId && playerState) {
          validatedState.data.players[validId] = {
            x: this.sanitizeNumber(playerState.x, 0, 1),
            y: this.sanitizeNumber(playerState.y, 0, 1),
            stamina: this.sanitizeNumber(playerState.stamina, 0, 1),
            health: this.sanitizeNumber(playerState.health, 0, 1)
          };
        }
      }
    }
    
    return validatedState;
  }

  /**
   * Validate chat message
   */
  validateChatMessage(message) {
    if (!message.data || !message.data.text) {
      return null;
    }
    
    let text = String(message.data.text).trim();
    
    // Length limits
    if (text.length > 200) {
      text = text.substring(0, 200) + '...';
      this.validationStats.sanitizedInputs++;
    }
    
    // Remove suspicious patterns
    if (this.containsSuspiciousPattern(text)) {
      console.warn('Suspicious chat message blocked:', text);
      this.validationStats.blockedInputs++;
      return null;
    }
    
    // Basic HTML/script sanitization
    text = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    return {
      type: 'chat',
      timestamp: this.validateTimestamp(message.timestamp),
      playerId: this.validatePlayerId(message.playerId),
      data: { text }
    };
  }

  /**
   * Validate timestamp
   */
  validateTimestamp(timestamp) {
    const now = Date.now();
    const ts = this.sanitizeNumber(timestamp, 0, now + 60000); // Allow 1 minute future
    
    // Reject timestamps too far in the past or future
    if (Math.abs(now - ts) > 300000) { // 5 minutes
      console.warn('Suspicious timestamp:', timestamp, 'vs now:', now);
      return now;
    }
    
    return ts;
  }

  /**
   * Validate player ID
   */
  validatePlayerId(playerId) {
    if (!playerId || typeof playerId !== 'string') {
      return null;
    }
    
    // Length check
    if (playerId.length < 1 || playerId.length > 64) {
      return null;
    }
    
    // Alphanumeric + hyphens only
    if (!/^[a-zA-Z0-9\-_]+$/.test(playerId)) {
      console.warn('Invalid player ID format:', playerId);
      return null;
    }
    
    return playerId;
  }

  /**
   * Sanitize number input with bounds
   */
  sanitizeNumber(input, min = -Infinity, max = Infinity) {
    if (input === null || input === undefined) {
      return 0;
    }
    
    let num = Number(input);
    
    if (!Number.isFinite(num)) {
      return 0;
    }
    
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Check for suspicious patterns that might indicate injection attempts
   */
  containsSuspiciousPattern(input) {
    if (typeof input !== 'string') {
      return false;
    }
    
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate complex game interaction parameters
   */
  validateCombatInteraction(attackData) {
    this.validationStats.totalValidations++;
    
    try {
      if (!attackData || typeof attackData !== 'object') {
        return null;
      }
      
      return {
        attackerId: this.validatePlayerId(attackData.attackerId),
        targetId: this.validatePlayerId(attackData.targetId),
        attackType: this.validateAttackType(attackData.attackType),
        position: this.validateMovement(attackData.x, attackData.y),
        direction: this.validateMovement(attackData.dirX, attackData.dirY),
        timestamp: this.validateTimestamp(attackData.timestamp),
        damage: this.sanitizeNumber(attackData.damage, 0, 100)
      };
      
    } catch (error) {
      console.error('Combat interaction validation error:', error);
      this.validationStats.failedValidations++;
      return null;
    }
  }

  /**
   * Validate attack type
   */
  validateAttackType(attackType) {
    const validTypes = ['light', 'heavy', 'special', 'projectile'];
    
    if (!validTypes.includes(attackType)) {
      console.warn('Invalid attack type:', attackType);
      return 'light'; // Default fallback
    }
    
    return attackType;
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    const successRate = this.validationStats.totalValidations > 0 
      ? ((this.validationStats.totalValidations - this.validationStats.failedValidations) / this.validationStats.totalValidations * 100).toFixed(1)
      : '100.0';
    
    return {
      ...this.validationStats,
      successRate: `${successRate}%`
    };
  }

  /**
   * Reset validation statistics
   */
  resetStats() {
    this.validationStats = {
      totalValidations: 0,
      failedValidations: 0,
      sanitizedInputs: 0,
      blockedInputs: 0
    };
  }
}

// Create global instance
export const inputValidator = new InputValidator();
