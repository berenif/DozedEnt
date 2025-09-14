// Combo Attack System for Player Animations
// Provides combo chaining, timing windows, and special move combinations

export class ComboSystem {
    constructor(options = {}) {
        this.combos = new Map()
        this.currentCombo = []
        this.comboTimer = 0
        this.comboWindow = options.comboWindow || 0.5 // seconds
        this.maxComboLength = options.maxComboLength || 5
        this.comboMultiplier = 1
        this.totalHits = 0
        this.lastInputTime = 0
        this.specialMoveBuffer = []
        this.bufferTime = options.bufferTime || 0.2
        
        // Combo state
        this.isInCombo = false
        this.canCancel = false
        this.currentMove = null
        
        // Event callbacks
        this.onComboStart = options.onComboStart || (() => {})
        this.onComboHit = options.onComboHit || (() => {})
        this.onComboEnd = options.onComboEnd || (() => {})
        this.onSpecialMove = options.onSpecialMove || (() => {})
        
        // Initialize default combos
        this.initializeDefaultCombos()
    }

    initializeDefaultCombos() {
        // Basic combos
        this.registerCombo('basicCombo', ['light', 'light', 'heavy'], {
            damage: 50,
            knockback: 10,
            animation: 'combo_basic_finisher',
            cancelWindow: [0.4, 0.6]
        })
        
        this.registerCombo('launcher', ['heavy', 'heavy', 'up'], {
            damage: 40,
            knockback: 15,
            launchHeight: 20,
            animation: 'combo_launcher',
            cancelWindow: [0.3, 0.5]
        })
        
        this.registerCombo('rushdown', ['light', 'light', 'light', 'light'], {
            damage: 60,
            knockback: 5,
            animation: 'combo_rush',
            cancelWindow: [0.35, 0.55],
            requiresRapidInput: true
        })
        
        // Advanced combos
        this.registerCombo('spinSlash', ['heavy', 'roll', 'heavy'], {
            damage: 70,
            knockback: 20,
            animation: 'combo_spin_slash',
            areaOfEffect: true,
            radius: 100
        })
        
        this.registerCombo('counterStrike', ['block', 'light', 'heavy'], {
            damage: 65,
            knockback: 15,
            animation: 'combo_counter',
            requiresPerfectTiming: true,
            timingWindow: 0.1
        })
        
        this.registerCombo('aerialRave', ['jump', 'light', 'light', 'heavy'], {
            damage: 55,
            knockback: 12,
            animation: 'combo_aerial',
            requiresAirborne: true
        })
        
        // Special moves (fighting game style)
        this.registerSpecialMove('hadouken', ['down', 'forward', 'light'], {
            damage: 30,
            projectile: true,
            animation: 'special_projectile',
            cooldown: 2
        })
        
        this.registerSpecialMove('shoryuken', ['forward', 'down', 'forward', 'heavy'], {
            damage: 45,
            knockback: 25,
            invincible: true,
            animation: 'special_uppercut',
            cooldown: 3
        })
        
        this.registerSpecialMove('tatsu', ['down', 'back', 'roll'], {
            damage: 35,
            hits: 3,
            animation: 'special_spin',
            movement: true,
            cooldown: 2.5
        })
    }

    registerCombo(name, sequence, properties) {
        this.combos.set(name, {
            sequence,
            properties,
            sequenceString: sequence.join('-')
        })
    }

    registerSpecialMove(name, sequence, properties) {
        this.registerCombo(name, sequence, {
            ...properties,
            isSpecial: true
        })
    }

    // Process input for combo detection
    processInput(input, deltaTime) {
        this.comboTimer -= deltaTime
        
        // Clear combo if timer expired
        if (this.comboTimer <= 0 && this.currentCombo.length > 0) {
            this.endCombo()
        }
        
        // Add to special move buffer for motion inputs
        this.updateSpecialMoveBuffer(input, deltaTime)
        
        // Check for attack inputs
        if (input.lightAttack || input.heavyAttack || input.special) {
            const move = this.getInputType(input)
            this.addToCombo(move)
        }
    }

    getInputType(input) {
        if (input.lightAttack) {return 'light'}
        if (input.heavyAttack) {return 'heavy'}
        if (input.special) {return 'special'}
        if (input.roll) {return 'roll'}
        if (input.block) {return 'block'}
        if (input.jump) {return 'jump'}
        
        // Directional inputs for special moves
        if (input.up) {return 'up'}
        if (input.down) {return 'down'}
        if (input.left) {return this.facing === 1 ? 'back' : 'forward'}
        if (input.right) {return this.facing === 1 ? 'forward' : 'back'}
        
        return null
    }

    addToCombo(move) {
        if (!move) {return}
        
        const now = Date.now()
        const timeSinceLastInput = (now - this.lastInputTime) / 1000
        
        // Check if input is within combo window
        if (this.currentCombo.length > 0 && timeSinceLastInput > this.comboWindow) {
            this.endCombo()
        }
        
        // Add move to current combo
        this.currentCombo.push(move)
        this.lastInputTime = now
        this.comboTimer = this.comboWindow
        
        // Check for combo matches
        const comboResult = this.checkForCombo()
        
        if (comboResult) {
            this.executeCombo(comboResult)
        } else if (this.currentCombo.length === 1) {
            // Start new combo
            this.startCombo()
        } else if (this.currentCombo.length >= this.maxComboLength) {
            // Max length reached, reset
            this.endCombo()
        }
    }

    checkForCombo() {
        const currentSequence = this.currentCombo.join('-')
        
        // Check all registered combos
        for (const [name, combo] of this.combos) {
            if (combo.sequenceString === currentSequence) {
                // Check additional requirements
                if (this.meetsRequirements(combo.properties)) {
                    return { name, combo }
                }
            }
        }
        
        // Check for partial matches (combo might still be building)
        for (const [name, combo] of this.combos) {
            if (combo.sequenceString.startsWith(currentSequence)) {
                return null // Partial match, keep building
            }
        }
        
        // No matches, check if we should reset
        if (this.currentCombo.length > 2) {
            // Try removing first input and checking again
            this.currentCombo.shift()
            return this.checkForCombo()
        }
        
        return null
    }

    meetsRequirements(properties) {
        // Check various combo requirements
        if (properties.requiresAirborne && this.isGrounded) {
            return false
        }
        
        if (properties.requiresGrounded && !this.isGrounded) {
            return false
        }
        
        if (properties.requiresRapidInput) {
            const avgTime = this.getAverageInputTime()
            if (avgTime > 0.2) { // More than 200ms between inputs
                return false
            }
        }
        
        if (properties.requiresPerfectTiming) {
            const timingWindow = properties.timingWindow || 0.1
            const lastTiming = (Date.now() - this.lastInputTime) / 1000
            if (lastTiming > timingWindow) {
                return false
            }
        }
        
        if (properties.requiresStamina) {
            if (this.stamina < properties.staminaCost) {
                return false
            }
        }
        
        return true
    }

    executeCombo(comboResult) {
        const { name, combo } = comboResult
        const properties = combo.properties
        
        // Update combo state
        this.isInCombo = true
        this.currentMove = name
        this.totalHits++
        this.comboMultiplier = Math.min(this.comboMultiplier + 0.1, 3)
        
        // Calculate damage with multiplier
        const finalDamage = properties.damage * this.comboMultiplier
        
        // Trigger combo callback
        this.onComboHit({
            name,
            damage: finalDamage,
            hits: this.totalHits,
            multiplier: this.comboMultiplier,
            properties
        })
        
        // Handle special move
        if (properties.isSpecial) {
            this.onSpecialMove({
                name,
                properties
            })
        }
        
        // Reset combo for next sequence
        if (!properties.chainable) {
            this.currentCombo = []
        } else {
            // Keep last input for chaining
            this.currentCombo = [this.currentCombo[this.currentCombo.length - 1]]
        }
        
        return {
            animation: properties.animation,
            damage: finalDamage,
            effects: properties
        }
    }

    startCombo() {
        this.isInCombo = true
        this.comboMultiplier = 1
        this.totalHits = 1
        
        this.onComboStart({
            firstMove: this.currentCombo[0]
        })
    }

    endCombo() {
        if (this.totalHits > 1) {
            this.onComboEnd({
                hits: this.totalHits,
                maxMultiplier: this.comboMultiplier,
                moves: [...this.currentCombo]
            })
        }
        
        this.currentCombo = []
        this.comboTimer = 0
        this.isInCombo = false
        this.comboMultiplier = 1
        this.totalHits = 0
        this.currentMove = null
    }

    // Special move buffer for complex inputs
    updateSpecialMoveBuffer(input, _deltaTime) {
        const currentInput = this.getDirectionalInput(input)
        
        if (currentInput) {
            this.specialMoveBuffer.push({
                input: currentInput,
                time: Date.now()
            })
        }
        
        // Clean old inputs from buffer
        const cutoffTime = Date.now() - (this.bufferTime * 1000)
        this.specialMoveBuffer = this.specialMoveBuffer.filter(
            entry => entry.time > cutoffTime
        )
    }

    getDirectionalInput(input) {
        const dirs = []
        if (input.up) {dirs.push('up')}
        if (input.down) {dirs.push('down')}
        if (input.left) {dirs.push(this.facing === 1 ? 'back' : 'forward')}
        if (input.right) {dirs.push(this.facing === 1 ? 'forward' : 'back')}
        
        return dirs.length > 0 ? dirs.join('-') : null
    }

    getAverageInputTime() {
        // Calculate average time between inputs in current combo
        if (this.inputTimes && this.inputTimes.length > 1) {
            let totalTime = 0
            for (let i = 1; i < this.inputTimes.length; i++) {
                totalTime += this.inputTimes[i] - this.inputTimes[i - 1]
            }
            return totalTime / (this.inputTimes.length - 1) / 1000
        }
        return 0
    }

    // Cancel current move into another
    cancelInto(newMove) {
        if (!this.canCancel) {return false}
        
        const currentProperties = this.getCurrentMoveProperties()
        if (!currentProperties) {return false}
        
        const cancelWindow = currentProperties.cancelWindow
        if (!cancelWindow) {return false}
        
        // Check if we're in cancel window (normalized time)
        const normalizedTime = this.getMoveProgress()
        if (normalizedTime >= cancelWindow[0] && normalizedTime <= cancelWindow[1]) {
            this.currentCombo = [newMove]
            this.comboTimer = this.comboWindow
            return true
        }
        
        return false
    }

    getCurrentMoveProperties() {
        if (!this.currentMove) {return null}
        
        const combo = this.combos.get(this.currentMove)
        return combo ? combo.properties : null
    }

    getMoveProgress() {
        // This should be connected to animation system
        // Returns normalized time (0-1) of current move animation
        return 0.5 // Placeholder
    }

    // Helper methods for UI
    getCurrentComboString() {
        return this.currentCombo.join(' → ')
    }

    getComboMeter() {
        return {
            hits: this.totalHits,
            multiplier: this.comboMultiplier,
            damage: this.calculateTotalDamage(),
            timeRemaining: Math.max(0, this.comboTimer),
            isActive: this.isInCombo
        }
    }

    calculateTotalDamage() {
        // Calculate total damage dealt in current combo
        return Math.floor(this.totalHits * 20 * this.comboMultiplier)
    }

    // Reset combo system
    reset() {
        this.currentCombo = []
        this.comboTimer = 0
        this.comboMultiplier = 1
        this.totalHits = 0
        this.isInCombo = false
        this.currentMove = null
        this.specialMoveBuffer = []
    }

    // Set player facing for directional inputs
    setFacing(facing) {
        this.facing = facing
    }

    // Set grounded state for aerial combos
    setGrounded(grounded) {
        this.isGrounded = grounded
    }

    // Set stamina for stamina-based combos
    setStamina(stamina) {
        this.stamina = stamina
    }
}

// Combo UI Renderer
export class ComboUIRenderer {
    constructor(comboSystem) {
        this.comboSystem = comboSystem
        this.displayTimer = 0
        this.displayDuration = 2
        this.lastComboInfo = null
    }

    update(deltaTime) {
        if (this.displayTimer > 0) {
            this.displayTimer -= deltaTime
        }
        
        const meter = this.comboSystem.getComboMeter()
        if (meter.isActive) {
            this.displayTimer = this.displayDuration
            this.lastComboInfo = meter
        }
    }

    render(ctx, x, y) {
        if (this.displayTimer <= 0 || !this.lastComboInfo) {return}
        
        const alpha = Math.min(1, this.displayTimer)
        ctx.save()
        ctx.globalAlpha = alpha
        
        // Combo counter
        ctx.font = 'bold 24px Arial'
        ctx.fillStyle = this.getComboColor(this.lastComboInfo.hits)
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 3
        
        const comboText = `${this.lastComboInfo.hits} HITS!`
        ctx.strokeText(comboText, x, y)
        ctx.fillText(comboText, x, y)
        
        // Multiplier
        if (this.lastComboInfo.multiplier > 1) {
            ctx.font = '16px Arial'
            ctx.fillStyle = '#ffff00'
            const multText = `x${this.lastComboInfo.multiplier.toFixed(1)}`
            ctx.strokeText(multText, x, y + 25)
            ctx.fillText(multText, x, y + 25)
        }
        
        // Damage
        ctx.font = '14px Arial'
        ctx.fillStyle = '#ffffff'
        const damageText = `Damage: ${this.lastComboInfo.damage}`
        ctx.strokeText(damageText, x, y + 45)
        ctx.fillText(damageText, x, y + 45)
        
        // Timer bar
        if (this.lastComboInfo.timeRemaining > 0) {
            const barWidth = 100
            const barHeight = 4
            const barY = y + 60
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillRect(x, barY, barWidth, barHeight)
            
            ctx.fillStyle = '#00ff00'
            const fillWidth = barWidth * (this.lastComboInfo.timeRemaining / this.comboSystem.comboWindow)
            ctx.fillRect(x, barY, fillWidth, barHeight)
        }
        
        // Current combo string
        const comboString = this.comboSystem.getCurrentComboString()
        if (comboString) {
            ctx.font = '12px monospace'
            ctx.fillStyle = '#aaaaaa'
            ctx.fillText(comboString, x, y + 75)
        }
        
        ctx.restore()
    }

    getComboColor(hits) {
        if (hits >= 20) {return '#ff00ff'} // Purple
        if (hits >= 15) {return '#ff0000'} // Red
        if (hits >= 10) {return '#ff8800'} // Orange
        if (hits >= 5) {return '#ffff00'}  // Yellow
        return '#ffffff' // White
    }
}

export default ComboSystem