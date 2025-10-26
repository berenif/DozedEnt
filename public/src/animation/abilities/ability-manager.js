/**
 * AbilityManager - Manages multiple character abilities
 * Provides:
 * - Ability registration and management
 * - Cooldown tracking
 * - Resource management (stamina, mana)
 * - Ability switching and hotkeys
 * - Integration with animation system
 */

export class AbilityManager {
    constructor(player, options = {}) {
        this.player = player
        this.abilities = new Map()
        this.activeAbility = null
        this.abilityQueue = []
        this.cooldowns = new Map()
        this.resourceCosts = new Map()
        
        // Configuration
        this.maxActiveAbilities = options.maxActiveAbilities || 4
        this.globalCooldown = options.globalCooldown || 0.5
        this.lastAbilityTime = 0
        
        // Event callbacks
        this.onAbilityStart = options.onAbilityStart || (() => {})
        this.onAbilityEnd = options.onAbilityEnd || (() => {})
        this.onAbilityFail = options.onAbilityFail || (() => {})
        
        // Initialize default abilities
        this.initializeDefaultAbilities()
    }
    
    /**
     * Initialize default abilities
     */
    initializeDefaultAbilities() {
        // This would import and register default abilities
        // For now, we'll leave it empty as abilities are registered externally
    }
    
    /**
     * Register a new ability
     */
    registerAbility(name, abilityClass, config = {}) {
        if (this.abilities.has(name)) {
            console.warn(`Ability '${name}' is already registered`)
            return false
        }
        
        // Get wasmModule and vfxManager from player or use defaults
        const wasmModule = this.player.wasmModule || this.player.actionManager?.wasmExports || globalThis.wasmExports || null
        const vfxManager = this.player.vfxManager || {
            particles: this.player.particleSystem || null,
            camera: null,
            audio: null
        }
        
        const ability = new abilityClass(wasmModule, vfxManager)
        
        // Store ability configuration
        this.abilities.set(name, {
            instance: ability,
            config: config,
            hotkey: config.hotkey || null,
            category: config.category || 'combat',
            description: config.description || '',
            icon: config.icon || null
        })
        
        // Initialize cooldown
        this.cooldowns.set(name, 0)
        
        // Store resource costs
        this.resourceCosts.set(name, {
            stamina: ability.staminaCost || 0,
            mana: ability.manaCost || 0
        })
        
        return true
    }
    
    /**
     * Unregister an ability
     */
    unregisterAbility(name) {
        if (!this.abilities.has(name)) {
            return false
        }
        
        // Cancel if active
        if (this.activeAbility === name) {
            this.cancelAbility()
        }
        
        // Remove from collections
        this.abilities.delete(name)
        this.cooldowns.delete(name)
        this.resourceCosts.delete(name)
        
        return true
    }
    
    /**
     * Use an ability
     */
    useAbility(name, target = null) {
        if (!this.abilities.has(name)) {
            this.onAbilityFail(name, 'Ability not found')
            return false
        }
        
        const abilityData = this.abilities.get(name)
        const ability = abilityData.instance
        
        // Check if ability is ready
        if (!ability.isReady()) {
            this.onAbilityFail(name, 'Ability not ready')
            return false
        }
        
        // Check global cooldown
        const now = Date.now() / 1000
        if (now - this.lastAbilityTime < this.globalCooldown) {
            this.onAbilityFail(name, 'Global cooldown active')
            return false
        }
        
        // Check resource requirements
        if (!this.canAffordAbility(name)) {
            this.onAbilityFail(name, 'Insufficient resources')
            return false
        }
        
        // Check if another ability is active
        if (this.activeAbility && this.activeAbility !== name) {
            if (!ability.canCancelEarly) {
                this.onAbilityFail(name, 'Another ability is active')
                return false
            }
            this.cancelAbility()
        }
        
        // Start the ability
        if (ability.start(this.player, target)) {
            this.activeAbility = name
            this.lastAbilityTime = now
            
            // Consume resources
            this.consumeResources(name)
            
            // Start cooldown
            this.startCooldown(name)
            
            // Trigger callback
            this.onAbilityStart(name, ability)
            
            return true
        }
        
        this.onAbilityFail(name, 'Failed to start ability')
        return false
    }
    
    /**
     * Update ability manager
     */
    update(deltaTime) {
        // Update active ability
        if (this.activeAbility) {
            const abilityData = this.abilities.get(this.activeAbility)
            const ability = abilityData.instance
            
            ability.update(deltaTime)
            
            // Check if ability ended
            if (!ability.isActive()) {
                this.endAbility(this.activeAbility)
            }
        }
        
        // Update cooldowns
        this.updateCooldowns(deltaTime)
        
        // Process ability queue
        this.processAbilityQueue()
    }
    
    /**
     * End an ability
     */
    endAbility(name) {
        if (this.activeAbility !== name) {
            return
        }
        
        const abilityData = this.abilities.get(name)
        const ability = abilityData.instance
        
        // End the ability
        ability.end()
        
        // Clear active ability
        this.activeAbility = null
        
        // Trigger callback
        this.onAbilityEnd(name, ability)
    }
    
    /**
     * Cancel active ability
     */
    cancelAbility() {
        if (!this.activeAbility) {
            return
        }
        
        const abilityData = this.abilities.get(this.activeAbility)
        const ability = abilityData.instance
        
        if (ability.canCancelEarly) {
            ability.end()
            this.activeAbility = null
            this.onAbilityEnd(this.activeAbility, ability)
        }
    }
    
    /**
     * Check if player can afford an ability
     */
    canAffordAbility(name) {
        if (!this.resourceCosts.has(name)) {
            return true
        }
        
        const costs = this.resourceCosts.get(name)
        
        // Check stamina
        if (costs.stamina > 0 && this.player.stamina < costs.stamina) {
            return false
        }
        
        // Check mana
        if (costs.mana > 0 && this.player.mana < costs.mana) {
            return false
        }
        
        return true
    }
    
    /**
     * Consume resources for an ability
     */
    consumeResources(name) {
        if (!this.resourceCosts.has(name)) {
            return
        }
        
        const costs = this.resourceCosts.get(name)
        
        // Consume stamina
        if (costs.stamina > 0) {
            this.player.stamina = Math.max(0, this.player.stamina - costs.stamina)
        }
        
        // Consume mana
        if (costs.mana > 0) {
            this.player.mana = Math.max(0, this.player.mana - costs.mana)
        }
    }
    
    /**
     * Start cooldown for an ability
     */
    startCooldown(name) {
        if (!this.abilities.has(name)) {
            return
        }
        
        const ability = this.abilities.get(name).instance
        this.cooldowns.set(name, ability.cooldown)
    }
    
    /**
     * Update cooldowns
     */
    updateCooldowns(deltaTime) {
        for (const [name, cooldown] of this.cooldowns) {
            if (cooldown > 0) {
                this.cooldowns.set(name, Math.max(0, cooldown - deltaTime))
            }
        }
    }
    
    /**
     * Process ability queue
     */
    processAbilityQueue() {
        if (this.abilityQueue.length === 0 || this.activeAbility) {
            return
        }
        
        const nextAbility = this.abilityQueue.shift()
        this.useAbility(nextAbility.name, nextAbility.target)
    }
    
    /**
     * Queue an ability for later use
     */
    queueAbility(name, target = null) {
        this.abilityQueue.push({ name, target })
    }
    
    /**
     * Get ability information
     */
    getAbilityInfo(name) {
        if (!this.abilities.has(name)) {
            return null
        }
        
        const abilityData = this.abilities.get(name)
        const ability = abilityData.instance
        const cooldown = this.cooldowns.get(name) || 0
        
        return {
            name: name,
            config: abilityData.config,
            cooldown: cooldown,
            instance: ability,
            isReady: ability.isReady(),
            isActive: ability.isActive(),
            canAfford: this.canAffordAbility(name),
            resources: this.resourceCosts.get(name) || { stamina: 0, mana: 0 }
        }
    }
    
    /**
     * Get all abilities
     */
    getAllAbilities() {
        const abilities = []
        for (const name of this.abilities.keys()) {
            abilities.push(this.getAbilityInfo(name))
        }
        return abilities
    }
    
    /**
     * Get abilities by category
     */
    getAbilitiesByCategory(category) {
        const abilities = []
        for (const [name, data] of this.abilities) {
            if (data.config.category === category) {
                abilities.push(this.getAbilityInfo(name))
            }
        }
        return abilities
    }
    
    /**
     * Get active ability
     */
    getActiveAbility() {
        return this.activeAbility
    }
    
    /**
     * Check if any ability is active
     */
    hasActiveAbility() {
        return this.activeAbility !== null
    }
    
    /**
     * Get cooldown for an ability
     */
    getCooldown(name) {
        return this.cooldowns.get(name) || 0
    }
    
    /**
     * Set hotkey for an ability
     */
    setHotkey(name, key) {
        if (!this.abilities.has(name)) {
            return false
        }
        
        this.abilities.get(name).config.hotkey = key
        return true
    }
    
    /**
     * Handle input
     */
    handleInput(input) {
        // Check for ability hotkeys
        for (const [name, data] of this.abilities) {
            if (data.config.hotkey && input[data.config.hotkey]) {
                this.useAbility(name)
                break
            }
        }
    }
    
    /**
     * Reset all cooldowns (for testing)
     */
    resetCooldowns() {
        for (const name of this.cooldowns.keys()) {
            this.cooldowns.set(name, 0)
        }
    }
    
    /**
     * Clear ability queue
     */
    clearQueue() {
        this.abilityQueue = []
    }
}
