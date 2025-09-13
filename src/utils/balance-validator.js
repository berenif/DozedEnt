/**
 * Balance Data Validator Utility
 * Validates and ensures consistency of balance data JSON files
 * Based on BALANCE_DATA.md guidelines
 */

// Browser-compatible path handling
const path = {
  join: (...parts) => parts.filter(p => p).join('/'),
  basename: (filePath, ext) => {
    const base = filePath.split('/').pop() || filePath;
    return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
  }
};

/**
 * Balance data validator for game configuration
 */
export class BalanceValidator {
  constructor(options = {}) {
    this.options = {
      dataPath: options.dataPath || './data/balance',
      strict: options.strict !== false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.errors = [];
    this.warnings = [];
    
    // Define expected schemas
    this.schemas = {
      player: this.getPlayerSchema(),
      enemies: this.getEnemiesSchema()
    };
  }

  /**
   * Get player data schema
   * @returns {Object} Player schema
   * @private
   */
  getPlayerSchema() {
    return {
      movement: {
        baseSpeed: { type: 'number', min: 0, max: 10, required: true },
        sprintMultiplier: { type: 'number', min: 1, max: 3, required: true },
        acceleration: { type: 'number', min: 0, max: 100, required: true },
        friction: { type: 'number', min: 0, max: 1, required: true }
      },
      stamina: {
        max: { type: 'number', min: 0, max: 1, required: true },
        regenRate: { type: 'number', min: 0, max: 1, required: true },
        regenDelay: { type: 'number', min: 0, max: 10, required: true },
        rollCost: { type: 'number', min: 0, max: 1, required: true },
        rollStartCost: { type: 'number', min: 0, max: 1, required: true },
        sprintDrain: { type: 'number', min: 0, max: 1, required: true }
      },
      timing: {
        attackCooldown: { type: 'number', min: 0, max: 5, required: true },
        rollDuration: { type: 'number', min: 0, max: 2, required: true },
        rollCooldown: { type: 'number', min: 0, max: 5, required: true },
        parryWindow: { type: 'number', min: 0, max: 1, required: true },
        inputBuffer: { type: 'number', min: 0, max: 1, required: true }
      },
      combat: {
        health: { type: 'number', min: 1, max: 1000, required: true },
        baseDamage: { type: 'number', min: 0, max: 100, required: true },
        critChance: { type: 'number', min: 0, max: 1, required: false },
        critMultiplier: { type: 'number', min: 1, max: 5, required: false }
      },
      lightAttack: {
        windup: { type: 'number', min: 0, max: 2, required: true },
        active: { type: 'number', min: 0, max: 2, required: true },
        recovery: { type: 'number', min: 0, max: 2, required: true },
        damage: { type: 'number', min: 0, max: 100, required: true },
        range: { type: 'number', min: 0, max: 10, required: true },
        staminaCost: { type: 'number', min: 0, max: 1, required: true }
      },
      heavyAttack: {
        windup: { type: 'number', min: 0, max: 3, required: true },
        active: { type: 'number', min: 0, max: 2, required: true },
        recovery: { type: 'number', min: 0, max: 3, required: true },
        damage: { type: 'number', min: 0, max: 200, required: true },
        range: { type: 'number', min: 0, max: 10, required: true },
        staminaCost: { type: 'number', min: 0, max: 1, required: true }
      },
      world: {
        wallPushForce: { type: 'number', min: 0, max: 100, required: false },
        wallDamage: { type: 'number', min: 0, max: 50, required: false },
        gravity: { type: 'number', min: 0, max: 50, required: false }
      }
    };
  }

  /**
   * Get enemies data schema
   * @returns {Object} Enemies schema
   * @private
   */
  getEnemiesSchema() {
    return {
      wolf: {
        movement: {
          baseSpeed: { type: 'number', min: 0, max: 10, required: true },
          maxSpeed: { type: 'number', min: 0, max: 15, required: true },
          acceleration: { type: 'number', min: 0, max: 100, required: true },
          turnSpeed: { type: 'number', min: 0, max: 10, required: true }
        },
        combat: {
          health: { type: 'number', min: 1, max: 500, required: true },
          damage: { type: 'number', min: 0, max: 100, required: true },
          attackRange: { type: 'number', min: 0, max: 10, required: true },
          attackCooldown: { type: 'number', min: 0, max: 5, required: true }
        },
        lunge: {
          range: { type: 'number', min: 0, max: 20, required: true },
          speed: { type: 'number', min: 0, max: 30, required: true },
          duration: { type: 'number', min: 0, max: 3, required: true },
          cooldown: { type: 'number', min: 0, max: 10, required: true },
          damage: { type: 'number', min: 0, max: 150, required: true }
        },
        feint: {
          chance: { type: 'number', min: 0, max: 1, required: true },
          duration: { type: 'number', min: 0, max: 2, required: true },
          cooldown: { type: 'number', min: 0, max: 10, required: true }
        },
        fatigue: {
          threshold: { type: 'number', min: 0, max: 1, required: true },
          recoveryRate: { type: 'number', min: 0, max: 1, required: true },
          penaltyMultiplier: { type: 'number', min: 0, max: 1, required: true }
        },
        pack: {
          maxSize: { type: 'number', min: 1, max: 10, required: true },
          spacing: { type: 'number', min: 0, max: 10, required: true },
          coordinationDelay: { type: 'number', min: 0, max: 5, required: true }
        },
        spawn: {
          initialCount: { type: 'number', min: 0, max: 20, required: true },
          maxActive: { type: 'number', min: 1, max: 50, required: true },
          spawnRate: { type: 'number', min: 0, max: 10, required: true },
          spawnDelay: { type: 'number', min: 0, max: 30, required: true }
        }
      },
      elite: {
        healthMultiplier: { type: 'number', min: 1, max: 10, required: false },
        damageMultiplier: { type: 'number', min: 1, max: 5, required: false },
        speedMultiplier: { type: 'number', min: 0.5, max: 2, required: false },
        specialAbilities: { type: 'array', itemType: 'string', required: false }
      },
      miniboss: {
        health: { type: 'number', min: 100, max: 5000, required: false },
        damage: { type: 'number', min: 0, max: 500, required: false },
        phases: { type: 'number', min: 1, max: 5, required: false }
      }
    };
  }

  /**
   * Validate balance data files
   * @param {Array<string>} files - Files to validate (optional)
   * @returns {Object} Validation results
   */
  async validate(files = null) {
    this.errors = [];
    this.warnings = [];
    
    const filesToValidate = files || ['player.json', 'enemies.json'];
    const results = {};
    
    for (const file of filesToValidate) {
      const filePath = path.join(this.options.dataPath, file);
      const schemaName = path.basename(file, '.json');
      
      try {
        const data = await this.loadJsonFile(filePath);
        const schema = this.schemas[schemaName];
        
        if (!schema) {
          this.warnings.push(`No schema defined for ${file}`);
          continue;
        }
        
        const fileResults = this.validateData(data, schema, file);
        results[schemaName] = fileResults;
        
        if (this.options.verbose) {
          console.log(`Validated ${file}: ${fileResults.valid ? 'PASS' : 'FAIL'}`);
        }
      } catch (error) {
        this.errors.push(`Failed to load ${file}: ${error.message}`);
        results[schemaName] = { valid: false, error: error.message };
      }
    }
    
    // Cross-file validation
    if (results.player && results.enemies && results.player.valid && results.enemies.valid) {
      this.validateCrossReferences(results);
    }
    
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      files: results
    };
  }

  /**
   * Load JSON file
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Parsed JSON data
   * @private
   */
  async loadJsonFile(filePath) {
    // In browser environment, use fetch
    if (typeof window !== 'undefined' || typeof fetch !== 'undefined') {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to load ${filePath}: ${error.message}`);
      }
    }
    
    // In Node.js environment
    if (typeof require !== 'undefined') {
      try {
        const fs = await import('fs');
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to load ${filePath}: ${error.message}`);
      }
    }
    
    throw new Error('No suitable method to load JSON file');
  }

  /**
   * Validate data against schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - Schema to validate against
   * @param {string} context - Context for error messages
   * @returns {Object} Validation result
   * @private
   */
  validateData(data, schema, context = '') {
    const result = { valid: true, errors: [], warnings: [] };
    
    for (const [key, fieldSchema] of Object.entries(schema)) {
      const fieldContext = context ? `${context}.${key}` : key;
      
      if (typeof fieldSchema === 'object' && !fieldSchema.type) {
        // Nested object
        if (data[key] == null) {
          if (this.options.strict) {
            result.valid = false;
            result.errors.push(`Missing required section: ${fieldContext}`);
            this.errors.push(`Missing required section: ${fieldContext}`);
          } else {
            result.warnings.push(`Missing optional section: ${fieldContext}`);
            this.warnings.push(`Missing optional section: ${fieldContext}`);
          }
        } else {
          const nestedResult = this.validateData(data[key], fieldSchema, fieldContext);
          if (!nestedResult.valid) {
            result.valid = false;
          }
          result.errors.push(...nestedResult.errors);
          result.warnings.push(...nestedResult.warnings);
        }
      } else {
        // Field validation
        const fieldResult = this.validateField(data[key], fieldSchema, fieldContext);
        if (!fieldResult.valid) {
          result.valid = false;
          result.errors.push(fieldResult.error);
          this.errors.push(fieldResult.error);
        }
        if (fieldResult.warning) {
          result.warnings.push(fieldResult.warning);
          this.warnings.push(fieldResult.warning);
        }
      }
    }
    
    return result;
  }

  /**
   * Validate individual field
   * @param {*} value - Field value
   * @param {Object} schema - Field schema
   * @param {string} context - Context for error messages
   * @returns {Object} Validation result
   * @private
   */
  validateField(value, schema, context) {
    const result = { valid: true };
    
    // Check required
    if (schema.required && value == null) {
      result.valid = false;
      result.error = `Missing required field: ${context}`;
      return result;
    }
    
    if (value == null) {
      return result; // Optional field not present
    }
    
    // Type validation
    switch (schema.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          result.valid = false;
          result.error = `Invalid type for ${context}: expected number, got ${typeof value}`;
        } else {
          // Range validation
          if (schema.min != null && value < schema.min) {
            result.valid = false;
            result.error = `Value out of range for ${context}: ${value} < ${schema.min}`;
          }
          if (schema.max != null && value > schema.max) {
            result.valid = false;
            result.error = `Value out of range for ${context}: ${value} > ${schema.max}`;
          }
          
          // Warnings for suspicious values
          if (value === 0 && schema.min > 0) {
            result.warning = `Suspicious zero value for ${context} (min: ${schema.min})`;
          }
        }
        break;
      
      case 'string':
        if (typeof value !== 'string') {
          result.valid = false;
          result.error = `Invalid type for ${context}: expected string, got ${typeof value}`;
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          result.valid = false;
          result.error = `Invalid type for ${context}: expected boolean, got ${typeof value}`;
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          result.valid = false;
          result.error = `Invalid type for ${context}: expected array, got ${typeof value}`;
        } else if (schema.itemType) {
          // Validate array items
          for (let i = 0; i < value.length; i++) {
            const itemResult = this.validateField(
              value[i], 
              { type: schema.itemType }, 
              `${context}[${i}]`
            );
            if (!itemResult.valid) {
              result.valid = false;
              result.error = itemResult.error;
              break;
            }
          }
        }
        break;
    }
    
    return result;
  }

  /**
   * Validate cross-references between files
   * @param {Object} results - Validation results
   * @private
   */
  validateCrossReferences(results) {
    // Example cross-validations
    
    // Check that enemy speeds don't exceed player sprint speed
    if (results.player.data?.movement?.baseSpeed && results.enemies.data?.wolf?.movement?.maxSpeed) {
      const playerMaxSpeed = results.player.data.movement.baseSpeed * 
                            (results.player.data.movement.sprintMultiplier || 1);
      const wolfMaxSpeed = results.enemies.data.wolf.movement.maxSpeed;
      
      if (wolfMaxSpeed > playerMaxSpeed * 1.5) {
        this.warnings.push(
          `Wolf max speed (${wolfMaxSpeed}) is significantly higher than player max speed (${playerMaxSpeed})`
        );
      }
    }
    
    // Check attack timing relationships
    if (results.player.data?.timing?.attackCooldown && results.enemies.data?.wolf?.combat?.attackCooldown) {
      const playerCooldown = results.player.data.timing.attackCooldown;
      const wolfCooldown = results.enemies.data.wolf.combat.attackCooldown;
      
      if (wolfCooldown < playerCooldown * 0.5) {
        this.warnings.push(
          `Wolf attack cooldown (${wolfCooldown}s) is much shorter than player (${playerCooldown}s)`
        );
      }
    }
    
    // Check damage balance
    if (results.player.data?.combat?.health && results.enemies.data?.wolf?.combat?.damage) {
      const playerHealth = results.player.data.combat.health;
      const wolfDamage = results.enemies.data.wolf.combat.damage;
      
      const hitsToKillPlayer = Math.ceil(playerHealth / wolfDamage);
      if (hitsToKillPlayer < 3) {
        this.warnings.push(
          `Wolf can kill player in only ${hitsToKillPlayer} hits - may be too difficult`
        );
      }
    }
  }

  /**
   * Generate validation report
   * @param {Object} results - Validation results
   * @returns {string} Formatted report
   */
  generateReport(results) {
    const lines = [];
    
    lines.push('Balance Data Validation Report');
    lines.push('=' .repeat(50));
    lines.push('');
    
    lines.push(`Overall Status: ${results.valid ? '✅ VALID' : '❌ INVALID'}`);
    lines.push('');
    
    if (results.errors.length > 0) {
      lines.push('Errors:');
      lines.push('-'.repeat(30));
      results.errors.forEach(error => {
        lines.push(`  ❌ ${error}`);
      });
      lines.push('');
    }
    
    if (results.warnings.length > 0) {
      lines.push('Warnings:');
      lines.push('-'.repeat(30));
      results.warnings.forEach(warning => {
        lines.push(`  ⚠️  ${warning}`);
      });
      lines.push('');
    }
    
    lines.push('File Results:');
    lines.push('-'.repeat(30));
    for (const [file, fileResult] of Object.entries(results.files)) {
      lines.push(`  ${file}: ${fileResult.valid ? '✅' : '❌'}`);
      if (fileResult.error) {
        lines.push(`    Error: ${fileResult.error}`);
      }
    }
    
    lines.push('');
    lines.push('=' .repeat(50));
    
    return lines.join('\n');
  }

  /**
   * Auto-fix common issues
   * @param {Object} data - Data to fix
   * @param {Object} schema - Schema to validate against
   * @returns {Object} Fixed data
   */
  autoFix(data, schema) {
    const fixed = JSON.parse(JSON.stringify(data)); // Deep clone
    
    const fixObject = (obj, sch, path = '') => {
      for (const [key, fieldSchema] of Object.entries(sch)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (typeof fieldSchema === 'object' && !fieldSchema.type) {
          // Nested object
          if (obj[key] == null) {
            obj[key] = {};
            if (this.options.verbose) {
              console.log(`Created missing section: ${fieldPath}`);
            }
          }
          fixObject(obj[key], fieldSchema, fieldPath);
        } else if (fieldSchema.required && obj[key] == null) {
          // Add missing required field with default value
          obj[key] = this.getDefaultValue(fieldSchema);
          if (this.options.verbose) {
            console.log(`Added missing field: ${fieldPath} = ${obj[key]}`);
          }
        } else if (obj[key] != null) {
          // Fix out-of-range values
          if (fieldSchema.type === 'number') {
            if (fieldSchema.min != null && obj[key] < fieldSchema.min) {
              obj[key] = fieldSchema.min;
              if (this.options.verbose) {
                console.log(`Fixed min value: ${fieldPath} = ${obj[key]}`);
              }
            }
            if (fieldSchema.max != null && obj[key] > fieldSchema.max) {
              obj[key] = fieldSchema.max;
              if (this.options.verbose) {
                console.log(`Fixed max value: ${fieldPath} = ${obj[key]}`);
              }
            }
          }
        }
      }
    };
    
    fixObject(fixed, schema);
    return fixed;
  }

  /**
   * Get default value for field type
   * @param {Object} schema - Field schema
   * @returns {*} Default value
   * @private
   */
  getDefaultValue(schema) {
    switch (schema.type) {
      case 'number':
        if (schema.min != null) return schema.min;
        if (schema.max != null && schema.max < 0) return schema.max;
        return 0;
      case 'string':
        return '';
      case 'boolean':
        return false;
      case 'array':
        return [];
      default:
        return null;
    }
  }
}

/**
 * Create balance validator
 * @param {Object} options - Validator options
 * @returns {BalanceValidator} Validator instance
 */
export function createBalanceValidator(options = {}) {
  return new BalanceValidator(options);
}

/**
 * Quick validation function
 * @param {string} dataPath - Path to balance data
 * @returns {Promise<Object>} Validation results
 */
export async function validateBalanceData(dataPath = './data/balance') {
  const validator = new BalanceValidator({ dataPath, verbose: true });
  return await validator.validate();
}

// Export singleton instance for convenience
export const globalBalanceValidator = new BalanceValidator({
  verbose: true,
  strict: true
});

export default BalanceValidator;