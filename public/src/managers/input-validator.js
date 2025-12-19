/**
 * Input Validator - Validates and sanitizes all user input
 * Prevents exploits, handles edge cases, and ensures WASM compatibility
 * Follows WASM-first architecture principles
 */

export class InputValidator {
    constructor() {
        this.validationStats = {
            totalInputs: 0,
            validInputs: 0,
            invalidInputs: 0,
            blockedInputs: 0,
            lastReset: performance.now()
        };
        
        // Rate limiting configuration
        this.rateLimits = {
            maxInputsPerSecond: 1000, // Prevent input flooding
            maxButtonPressesPerSecond: 60, // Prevent button spam
            inputWindow: 1000, // 1 second window
            buttonWindow: 1000 // 1 second window
        };
        
        // Input history for rate limiting
        this.inputHistory = [];
        this.buttonHistory = new Map(); // Per-button history
        
        // Validation rules
        this.validActions = new Set([
            'move-up', 'move-down', 'move-left', 'move-right',
            'light-attack', 'heavy-attack', 'special', 'block', 'roll',
            'pause', 'inventory', 'map', 'jump'
        ]);
        
        // Input sanitization patterns
        this.sanitizationRules = {
            direction: {
                min: -1,
                max: 1,
                precision: 3 // Round to 3 decimal places
            },
            boolean: {
                truthy: [true, 1, '1', 'true'],
                falsy: [false, 0, '0', 'false', null, undefined]
            }
        };
        
        console.log('✅ Input Validator initialized');
    }
    
    /**
     * Validate and sanitize input action
     */
    validateInputAction(action, isPressed, timestamp = performance.now()) {
        this.validationStats.totalInputs++;
        
        try {
            // Basic type validation
            if (!this.validateTypes(action, isPressed)) {
                this.validationStats.invalidInputs++;
                return { valid: false, reason: 'Invalid types' };
            }
            
            // Action validation
            if (!this.validateAction(action)) {
                this.validationStats.invalidInputs++;
                return { valid: false, reason: 'Invalid action' };
            }
            
            // Rate limiting
            if (!this.checkRateLimit(action, timestamp)) {
                this.validationStats.blockedInputs++;
                return { valid: false, reason: 'Rate limited' };
            }
            
            // Sanitize the input
            const sanitized = this.sanitizeInput(action, isPressed);
            
            this.validationStats.validInputs++;
            return { 
                valid: true, 
                action: sanitized.action, 
                isPressed: sanitized.isPressed 
            };
            
        } catch (error) {
            console.error('❌ Input validation error:', error);
            this.validationStats.invalidInputs++;
            return { valid: false, reason: 'Validation error' };
        }
    }
    
    /**
     * Validate input types
     */
    validateTypes(action, isPressed) {
        return typeof action === 'string' && 
               action.length > 0 && 
               action.length < 50 && // Prevent extremely long action names
               typeof isPressed === 'boolean';
    }
    
    /**
     * Validate action name
     */
    validateAction(action) {
        // Check against whitelist
        if (!this.validActions.has(action)) {
            console.warn(`⚠️ Unknown input action: ${action}`);
            return false;
        }
        
        // Check for injection patterns
        if (this.containsSuspiciousPatterns(action)) {
            console.warn(`⚠️ Suspicious input action: ${action}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check for suspicious patterns in input
     */
    containsSuspiciousPatterns(input) {
        const suspiciousPatterns = [
            /[<>]/,           // HTML tags
            /javascript:/i,   // JavaScript protocol
            /eval\(/i,        // eval() calls
            /function\s*\(/i, // Function definitions
            /\.\./,           // Path traversal
            /[{}]/,           // Object notation
            /[\[\]]/          // Array notation
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(input));
    }
    
    /**
     * Check rate limiting
     */
    checkRateLimit(action, timestamp) {
        // Clean old entries
        this.cleanOldEntries(timestamp);
        
        // Check general input rate
        if (this.inputHistory.length >= this.rateLimits.maxInputsPerSecond) {
            console.warn('⚠️ Input rate limit exceeded');
            return false;
        }
        
        // Check button-specific rate for combat actions
        const combatActions = ['light-attack', 'heavy-attack', 'special', 'block', 'roll'];
        if (combatActions.includes(action)) {
            const buttonHistory = this.buttonHistory.get(action) || [];
            if (buttonHistory.length >= this.rateLimits.maxButtonPressesPerSecond) {
                console.warn(`⚠️ Button rate limit exceeded for ${action}`);
                return false;
            }
            
            // Add to button history
            buttonHistory.push(timestamp);
            this.buttonHistory.set(action, buttonHistory);
        }
        
        // Add to general history
        this.inputHistory.push(timestamp);
        
        return true;
    }
    
    /**
     * Clean old entries from rate limiting history
     */
    cleanOldEntries(currentTime) {
        const cutoff = currentTime - this.rateLimits.inputWindow;
        
        // Clean general input history
        this.inputHistory = this.inputHistory.filter(time => time > cutoff);
        
        // Clean button histories
        for (const [action, history] of this.buttonHistory) {
            const cleanHistory = history.filter(time => time > cutoff);
            if (cleanHistory.length === 0) {
                this.buttonHistory.delete(action);
            } else {
                this.buttonHistory.set(action, cleanHistory);
            }
        }
    }
    
    /**
     * Sanitize input values
     */
    sanitizeInput(action, isPressed) {
        return {
            action: this.sanitizeString(action),
            isPressed: this.sanitizeBoolean(isPressed)
        };
    }
    
    /**
     * Sanitize string input
     */
    sanitizeString(str) {
        return String(str).trim().toLowerCase();
    }
    
    /**
     * Sanitize boolean input
     */
    sanitizeBoolean(value) {
        if (this.sanitizationRules.boolean.truthy.includes(value)) {
            return true;
        }
        if (this.sanitizationRules.boolean.falsy.includes(value)) {
            return false;
        }
        return Boolean(value);
    }
    
    /**
     * Validate and sanitize direction input (for movement)
     */
    validateDirection(x, y) {
        try {
            // Convert to numbers
            const numX = Number(x);
            const numY = Number(y);
            
            // Check for NaN or infinite values
            if (!Number.isFinite(numX) || !Number.isFinite(numY)) {
                return { valid: false, reason: 'Invalid direction values' };
            }
            
            // Clamp to valid range
            const clampedX = this.clamp(numX, -1, 1);
            const clampedY = this.clamp(numY, -1, 1);
            
            // Round to prevent precision issues
            const roundedX = this.roundToPrecision(clampedX, this.sanitizationRules.direction.precision);
            const roundedY = this.roundToPrecision(clampedY, this.sanitizationRules.direction.precision);
            
            return {
                valid: true,
                x: roundedX,
                y: roundedY
            };
            
        } catch (error) {
            console.error('❌ Direction validation error:', error);
            return { valid: false, reason: 'Direction validation error' };
        }
    }
    
    /**
     * Validate WASM input parameters before sending
     */
    validateWasmInput(inputX, inputY, isRolling, isJumping, lightAttack, heavyAttack, isBlocking, special) {
        try {
            // Validate direction
            const directionResult = this.validateDirection(inputX, inputY);
            if (!directionResult.valid) {
                return { valid: false, reason: directionResult.reason };
            }
            
            // Validate boolean parameters
            const boolParams = {
                isRolling: this.sanitizeBoolean(isRolling),
                isJumping: this.sanitizeBoolean(isJumping),
                lightAttack: this.sanitizeBoolean(lightAttack),
                heavyAttack: this.sanitizeBoolean(heavyAttack),
                isBlocking: this.sanitizeBoolean(isBlocking),
                special: this.sanitizeBoolean(special)
            };
            
            return {
                valid: true,
                inputX: directionResult.x,
                inputY: directionResult.y,
                isRolling: boolParams.isRolling ? 1 : 0,
                isJumping: boolParams.isJumping ? 1 : 0,
                lightAttack: boolParams.lightAttack ? 1 : 0,
                heavyAttack: boolParams.heavyAttack ? 1 : 0,
                isBlocking: boolParams.isBlocking ? 1 : 0,
                special: boolParams.special ? 1 : 0
            };
            
        } catch (error) {
            console.error('❌ WASM input validation error:', error);
            return { valid: false, reason: 'WASM validation error' };
        }
    }
    
    /**
     * Utility: Clamp value to range
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * Utility: Round to specified precision
     */
    roundToPrecision(value, precision) {
        const factor = 10**precision;
        return Math.round(value * factor) / factor;
    }
    
    /**
     * Get validation statistics
     */
    getValidationStats() {
        const now = performance.now();
        const elapsed = (now - this.validationStats.lastReset) / 1000;
        
        return {
            ...this.validationStats,
            elapsed,
            inputsPerSecond: this.validationStats.totalInputs / elapsed,
            validPercentage: (this.validationStats.validInputs / this.validationStats.totalInputs) * 100,
            currentRateLimit: {
                generalInputs: this.inputHistory.length,
                buttonHistories: Object.fromEntries(this.buttonHistory)
            }
        };
    }
    
    /**
     * Reset validation statistics
     */
    resetStats() {
        this.validationStats = {
            totalInputs: 0,
            validInputs: 0,
            invalidInputs: 0,
            blockedInputs: 0,
            lastReset: performance.now()
        };
        
        this.inputHistory = [];
        this.buttonHistory.clear();
        
        console.log('📊 Input validation stats reset');
    }
    
    /**
     * Update rate limiting configuration
     */
    updateRateLimits(newLimits) {
        this.rateLimits = { ...this.rateLimits, ...newLimits };
        console.log('⚙️ Rate limits updated:', this.rateLimits);
    }
    
    /**
     * Add custom validation action
     */
    addValidAction(action) {
        this.validActions.add(action);
        console.log(`✅ Added valid action: ${action}`);
    }
    
    /**
     * Remove validation action
     */
    removeValidAction(action) {
        this.validActions.delete(action);
        console.log(`❌ Removed valid action: ${action}`);
    }
}
