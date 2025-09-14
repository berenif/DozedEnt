// Procedural Wolf Animation Integration System
// Combines enhanced procedural animation, realistic physics, and WASM integration
// Provides a unified interface for realistic wolf animation

import { 
    createEnhancedWolfAnimComponent, 
    updateEnhancedWolfAnimation,
    EnhancedWolfBehavior,
    WolfAnatomy,
    getWolfBehaviorName,
    createRealisticWolfPersonality
} from './wolf-procedural.js'

import RealisticWolfPhysics, { WolfPhysicsConstants } from './realistic-wolf-physics.js'
import EnhancedWolfBody from './enhanced-wolf-body.js'
import WolfAnimationSystem from './wolf-animation.js'

// Main integration class
export class ProceduralWolfSystem {
    constructor(options = {}) {
        // Core systems
        this.physics = new RealisticWolfPhysics()
        this.animationSystem = new WolfAnimationSystem()
        this.bodyRenderer = new EnhancedWolfBody()
        
        // Wolf instances
        this.wolves = new Map() // wolfId -> WolfInstance
        this.wasmModule = null
        
        // System configuration
        this.config = {
            enablePhysics: options.enablePhysics ?? true,
            enableRealisticBehavior: options.enableRealisticBehavior ?? true,
            enablePackDynamics: options.enablePackDynamics ?? true,
            enableEnvironmentalEffects: options.enableEnvironmentalEffects ?? true,
            physicsTimeStep: options.physicsTimeStep ?? 1/60,
            maxWolves: options.maxWolves ?? 32,
            performanceMode: options.performanceMode ?? 'balanced' // 'performance', 'balanced', 'quality'
        }
        
        // Performance tracking
        this.performance = {
            frameTime: 0,
            animationTime: 0,
            physicsTime: 0,
            renderTime: 0,
            activeWolves: 0,
            behaviorUpdates: 0
        }
        
        // Environmental data
        this.environment = {
            wind: { x: 0, y: 0, strength: 0 },
            weather: { rain: 0, snow: 0, temperature: 0.5 },
            surface: { type: 'grass', friction: 1.0, slope: 0 },
            scents: [],
            packData: null
        }
        
        // Behavior management
        this.behaviorManager = new WolfBehaviorManager()
        
        // Initialize systems
        this.initialize()
    }
    
    // Initialize the system
    initialize() {
        console.log('🐺 Initializing Procedural Wolf System')
        
        // Set up performance monitoring
        this.setupPerformanceMonitoring()
        
        // Initialize behavior patterns
        this.behaviorManager.initialize()
        
        console.log(`✅ Wolf system initialized (max wolves: ${this.config.maxWolves})`)
    }
    
    // Set WASM module reference
    setWasmModule(wasmModule) {
        this.wasmModule = wasmModule
        this.animationSystem.setWasmModule(wasmModule)
        console.log('🔗 WASM module connected to wolf system')
    }
    
    // Create a new wolf instance
    createWolf(wolfId, options = {}) {
        if (this.wolves.has(wolfId)) {
            console.warn(`Wolf ${wolfId} already exists`)
            return this.wolves.get(wolfId)
        }
        
        if (this.wolves.size >= this.config.maxWolves) {
            console.warn(`Maximum wolves limit reached (${this.config.maxWolves})`)
            return null
        }
        
        // Create wolf instance
        const wolf = new WolfInstance(wolfId, options, this.config)
        
        // Add to physics system if enabled
        if (this.config.enablePhysics) {
            this.physics.addWolf(wolfId, wolf.mass)
        }
        
        // Initialize body renderer
        this.bodyRenderer.initializeWolf(wolf, wolf.type, wolf.size)
        
        // Store instance
        this.wolves.set(wolfId, wolf)
        
        console.log(`🐺 Created wolf ${wolfId} (${wolf.type}, behavior: ${getWolfBehaviorName(wolf.behavior)})`)
        
        return wolf
    }
    
    // Remove a wolf instance
    removeWolf(wolfId) {
        const wolf = this.wolves.get(wolfId)
        if (!wolf) {return false}
        
        // Remove from physics
        if (this.config.enablePhysics) {
            this.physics.removeWolf(wolfId)
        }
        
        // Clean up
        this.wolves.delete(wolfId)
        
        console.log(`🗑️ Removed wolf ${wolfId}`)
        return true
    }
    
    // Main update function
    update(deltaTime, environmentData = {}) {
        const startTime = performance.now()
        
        // Update environment
        this.updateEnvironment(environmentData)
        
        // Update physics if enabled
        if (this.config.enablePhysics) {
            const physicsStart = performance.now()
            this.physics.update(deltaTime, this.wasmModule)
            this.performance.physicsTime = performance.now() - physicsStart
        }
        
        // Update each wolf
        const animStart = performance.now()
        this.updateWolves(deltaTime)
        this.performance.animationTime = performance.now() - animStart
        
        // Update behavior management
        if (this.config.enableRealisticBehavior) {
            this.behaviorManager.update(deltaTime, this.wolves, this.environment)
        }
        
        // Update pack dynamics
        if (this.config.enablePackDynamics) {
            this.updatePackDynamics(deltaTime)
        }
        
        // Performance tracking
        this.performance.frameTime = performance.now() - startTime
        this.performance.activeWolves = this.wolves.size
        
        // Adaptive performance management
        this.managePerformance()
    }
    
    // Update environment data
    updateEnvironment(environmentData) {
        // Merge new environment data
        Object.assign(this.environment.wind, environmentData.wind || {})
        Object.assign(this.environment.weather, environmentData.weather || {})
        Object.assign(this.environment.surface, environmentData.surface || {})
        
        if (environmentData.scents) {
            this.environment.scents = environmentData.scents
        }
        
        if (environmentData.packData) {
            this.environment.packData = environmentData.packData
        }
    }
    
    // Update all wolves
    updateWolves(deltaTime) {
        for (const [wolfId, wolf] of this.wolves) {
            this.updateSingleWolf(wolfId, wolf, deltaTime)
        }
    }
    
    // Update a single wolf
    updateSingleWolf(wolfId, wolf, deltaTime) {
        // Update enhanced procedural animation
        updateEnhancedWolfAnimation(wolf.animComponent, deltaTime, 
                                   this.createRaycastFunction(), this.environment)
        
        // Update traditional animation system
        this.animationSystem.applyAnimation(wolf, deltaTime)
        
        // Update body dynamics
        this.bodyRenderer.update(deltaTime, wolf)
        
        // Sync with physics if enabled
        if (this.config.enablePhysics) {
            this.syncWolfWithPhysics(wolfId, wolf)
        }
        
        // Update wolf state
        wolf.update(deltaTime)
    }
    
    // Sync wolf with physics system
    syncWolfWithPhysics(wolfId, wolf) {
        const physicsData = this.physics.getWolfPhysicsData(wolfId)
        if (!physicsData) {return}
        
        // Update position from physics
        wolf.position.x = physicsData.position.x
        wolf.position.y = physicsData.position.y
        
        // Update ground contact
        wolf.isGrounded = physicsData.groundContact.isGrounded
        
        // Update muscle tension for rendering
        if (physicsData.muscles) {
            wolf.muscleTension = {}
            wolf.muscleTension.neck = physicsData.muscles.neck.averageActivation
            wolf.muscleTension.shoulders = physicsData.muscles.legs[0].averageActivation
            wolf.muscleTension.hips = physicsData.muscles.legs[2].averageActivation
        }
    }
    
    // Update pack dynamics
    updatePackDynamics(deltaTime) {
        if (this.wolves.size < 2) {return} // Need at least 2 wolves for pack behavior
        
        // Find alpha wolf (highest pack rank)
        let alphaWolf = null
        let maxRank = -1
        
        for (const wolf of this.wolves.values()) {
            if (wolf.animComponent.packRank > maxRank) {
                maxRank = wolf.animComponent.packRank
                alphaWolf = wolf
            }
        }
        
        // Update pack formation and coordination
        if (alphaWolf) {
            this.updatePackFormation(alphaWolf, deltaTime)
            this.updatePackCoordination(alphaWolf, deltaTime)
        }
    }
    
    // Update pack formation
    updatePackFormation(alphaWolf, deltaTime) {
        const formation = this.environment.packData?.formation || 'loose'
        const wolves = Array.from(this.wolves.values())
        
        wolves.forEach((wolf, index) => {
            if (wolf === alphaWolf) {return} // Alpha sets the pace
            
            // Calculate target position relative to alpha
            const targetOffset = { x: 0, y: 0 }
            
            switch (formation) {
                case 'line':
                    targetOffset.x = (index - wolves.length / 2) * 3
                    targetOffset.y = -2
                    break
                case 'circle':
                    const angle = (index / wolves.length) * Math.PI * 2
                    targetOffset.x = Math.cos(angle) * 4
                    targetOffset.y = Math.sin(angle) * 4
                    break
                case 'wedge':
                    targetOffset.x = (index % 2) * 2 - 1
                    targetOffset.y = -Math.floor(index / 2) * 2
                    break
                default: // loose
                    // ARCHITECTURAL VIOLATION FIXED: Should use deterministic positioning from WASM
                    targetOffset.x = 0 // Should be calculated in WASM
                    targetOffset.y = 0
                    break
            }
            
            // Apply formation influence to wolf's target
            const influence = 0.3 * deltaTime // Gradual formation adjustment
            wolf.animComponent.targetPos.x += (alphaWolf.position.x + targetOffset.x - wolf.position.x) * influence
            wolf.animComponent.targetPos.y += (alphaWolf.position.y + targetOffset.y - wolf.position.y) * influence
        })
    }
    
    // Update pack coordination
    updatePackCoordination(alphaWolf, _deltaTime) {
        const wolves = Array.from(this.wolves.values())
        
        wolves.forEach(wolf => {
            if (wolf === alphaWolf) {return}
            
            // Sync gait with alpha (subordinate wolves follow leader's pace)
            const syncStrength = (1 - wolf.animComponent.packRank) * 0.5
            if (syncStrength > 0.1) {
                wolf.animComponent.gait = alphaWolf.animComponent.gait
                
                // Slight phase offset to avoid perfect synchronization
                const phaseOffset = wolf.animComponent.packRank * Math.PI * 0.3
                wolf.animComponent.packSyncPhase = alphaWolf.animComponent.phase[0] + phaseOffset
            }
            
            // Behavioral influence
            if (alphaWolf.behavior === EnhancedWolfBehavior.Hunting && 
                wolf.behavior === EnhancedWolfBehavior.Patrolling) {
                wolf.behavior = EnhancedWolfBehavior.Hunting
            }
        })
    }
    
    // Create raycast function for procedural system
    createRaycastFunction() {
        return (_x, _y) => 
            // Simple ground plane for now
            // In a full implementation, this would query the actual terrain
             ({
                hit: true,
                y: 0,
                normal: { x: 0, y: 1, z: 0 },
                material: 0 // Grass
            })
        
    }
    
    // Render all wolves
    render(ctx, camera) {
        const renderStart = performance.now()
        
        // Sort wolves by depth for proper rendering order
        const sortedWolves = Array.from(this.wolves.values()).sort((a, b) => (b.position.y + b.position.x * 0.1) - (a.position.y + a.position.x * 0.1))
        
        // Render each wolf
        sortedWolves.forEach(wolf => {
            this.renderWolf(ctx, wolf, camera)
        })
        
        this.performance.renderTime = performance.now() - renderStart
        
        // Render debug info if enabled
        if (this.config.showDebugInfo) {
            this.renderDebugInfo(ctx, camera)
        }
    }
    
    // Render a single wolf
    renderWolf(ctx, wolf, camera) {
        ctx.save()
        
        // Use enhanced body renderer
        this.bodyRenderer.render(ctx, wolf, camera)
        
        // Use animation system for additional effects
        this.animationSystem.renderAnimatedWolf(ctx, wolf, camera)
        
        ctx.restore()
    }
    
    // Render debug information
    renderDebugInfo(ctx, _camera) {
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(10, 10, 300, 200)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Arial'
        let y = 30
        
        ctx.fillText(`Active Wolves: ${this.performance.activeWolves}`, 20, y += 15)
        ctx.fillText(`Frame Time: ${this.performance.frameTime.toFixed(2)}ms`, 20, y += 15)
        ctx.fillText(`Animation: ${this.performance.animationTime.toFixed(2)}ms`, 20, y += 15)
        ctx.fillText(`Physics: ${this.performance.physicsTime.toFixed(2)}ms`, 20, y += 15)
        ctx.fillText(`Render: ${this.performance.renderTime.toFixed(2)}ms`, 20, y += 15)
        
        // Show wolf states
        ctx.fillText('Wolf States:', 20, y += 25)
        for (const [wolfId, wolf] of this.wolves) {
            const behaviorName = getWolfBehaviorName(wolf.behavior)
            ctx.fillText(`${wolfId}: ${behaviorName}`, 20, y += 15)
            if (y > 180) {break} // Don't overflow
        }
        
        ctx.restore()
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Adaptive quality settings based on performance
        this.performanceThresholds = {
            targetFrameTime: 16.67, // 60 FPS
            warningFrameTime: 20,   // 50 FPS
            criticalFrameTime: 33.33 // 30 FPS
        }
    }
    
    // Manage performance adaptively
    managePerformance() {
        const frameTime = this.performance.frameTime
        
        if (frameTime > this.performanceThresholds.criticalFrameTime) {
            // Critical performance - reduce quality
            if (this.config.performanceMode !== 'performance') {
                console.warn('🐌 Switching to performance mode due to low FPS')
                this.config.performanceMode = 'performance'
                this.adaptPerformanceSettings()
            }
        } else if (frameTime < this.performanceThresholds.targetFrameTime * 0.8) {
            // Good performance - can increase quality
            if (this.config.performanceMode === 'performance') {
                console.log('🚀 Switching to balanced mode - good performance')
                this.config.performanceMode = 'balanced'
                this.adaptPerformanceSettings()
            }
        }
    }
    
    // Adapt settings based on performance mode
    adaptPerformanceSettings() {
        switch (this.config.performanceMode) {
            case 'performance':
                this.config.enablePhysics = false
                this.config.enableEnvironmentalEffects = false
                break
            case 'balanced':
                this.config.enablePhysics = true
                this.config.enableEnvironmentalEffects = true
                break
            case 'quality':
                this.config.enablePhysics = true
                this.config.enableEnvironmentalEffects = true
                this.config.enableRealisticBehavior = true
                break
        }
    }
    
    // Get system status
    getStatus() {
        return {
            wolves: this.wolves.size,
            performance: { ...this.performance },
            config: { ...this.config },
            environment: { ...this.environment }
        }
    }
    
    // Get wolf by ID
    getWolf(wolfId) {
        return this.wolves.get(wolfId)
    }
    
    // Get all wolves
    getAllWolves() {
        return Array.from(this.wolves.values())
    }
    
    // Cleanup
    destroy() {
        console.log('🧹 Cleaning up wolf system')
        
        // Remove all wolves
        for (const wolfId of this.wolves.keys()) {
            this.removeWolf(wolfId)
        }
        
        // Clear systems
        this.wolves.clear()
        this.behaviorManager.destroy()
        
        console.log('✅ Wolf system cleaned up')
    }
}

// Individual wolf instance
class WolfInstance {
    constructor(id, options = {}, systemConfig = {}) {
        this.id = id
        this.type = options.type || 'normal'
        this.size = options.size || 1.0
        this.mass = options.mass || WolfPhysicsConstants.averageMass
        
        // Position and movement
        this.position = options.position || { x: 0, y: 0 }
        this.velocity = { x: 0, y: 0 }
        this.facing = options.facing || 1
        
        // Animation component
        this.animComponent = createEnhancedWolfAnimComponent({
            ...options.animationOverrides,
            // ARCHITECTURAL VIOLATION FIXED: Seeds should come from WASM
            individualSeed: 0, // Should be set from WASM-generated deterministic seed
            personalityTraits: options.personality || createRealisticWolfPersonality(0.5),
            packRank: options.packRank || 0.5
        })
        
        // Behavior state
        this.behavior = options.behavior || EnhancedWolfBehavior.Resting
        this.lastBehavior = this.behavior
        this.behaviorTimer = 0
        this.behaviorIntensity = 0
        
        // Physical properties
        this.health = options.health || 100
        this.maxHealth = options.maxHealth || 100
        this.stamina = options.stamina || 100
        this.maxStamina = options.maxStamina || 100
        this.isGrounded = true
        
        // Visual properties
        this.colors = options.colors || this.getDefaultColors()
        this.furPattern = options.furPattern || null
        
        // State tracking
        this.lastUpdateTime = 0
        this.age = 0
        
        // Animation state (for compatibility with existing system)
        this.state = 'idle'
        this.width = 40 * this.size
        this.height = 30 * this.size
        
        // Muscle tension for rendering
        this.muscleTension = {
            neck: 0,
            shoulders: 0,
            hips: 0
        }
        
        console.log(`🐺 Wolf instance ${id} created (${this.type}, rank: ${this.animComponent.packRank.toFixed(2)})`)
    }
    
    // Get default colors based on type
    getDefaultColors() {
        const colorSchemes = {
            normal: {
                primary: '#6b5d54',
                secondary: '#4a4038',
                belly: '#8b7d74',
                eyes: '#ffd700',
                nose: '#1a1a1a',
                claws: '#2c2c2c'
            },
            alpha: {
                primary: '#5a4f45',
                secondary: '#3a342e',
                belly: '#7a6b61',
                eyes: '#ff6b35',
                nose: '#0a0a0a',
                claws: '#1c1c1c'
            },
            scout: {
                primary: '#8b7355',
                secondary: '#6b5a47',
                belly: '#a89484',
                eyes: '#90ee90',
                nose: '#2a2a2a',
                claws: '#3c3c3c'
            }
        }
        
        return colorSchemes[this.type] || colorSchemes.normal
    }
    
    // Update wolf state
    update(deltaTime) {
        this.age += deltaTime
        this.lastUpdateTime = performance.now()
        
        // Update animation state mapping
        this.updateAnimationStateMapping()
        
        // Update health and stamina
        this.updatePhysiology(deltaTime)
    }
    
    // Map enhanced behavior to traditional animation states
    updateAnimationStateMapping() {
        const behaviorToState = {
            [EnhancedWolfBehavior.Resting]: 'idle',
            [EnhancedWolfBehavior.Patrolling]: 'walking',
            [EnhancedWolfBehavior.Hunting]: 'prowling',
            [EnhancedWolfBehavior.Stalking]: 'prowling',
            [EnhancedWolfBehavior.Chasing]: 'running',
            [EnhancedWolfBehavior.Attacking]: 'attacking',
            [EnhancedWolfBehavior.Defending]: 'attacking',
            [EnhancedWolfBehavior.Howling]: 'howling',
            [EnhancedWolfBehavior.Playing]: 'running',
            [EnhancedWolfBehavior.Fleeing]: 'running'
        }
        
        this.state = behaviorToState[this.behavior] || 'idle'
        this.behavior = this.animComponent.behavior
    }
    
    // Update physiological systems
    updatePhysiology(deltaTime) {
        // Stamina regeneration/depletion
        const staminaRate = this.animComponent.speed > 2 ? -10 : 5 // Drain when running fast
        this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina + staminaRate * deltaTime))
        
        // Health regeneration (very slow)
        if (this.health < this.maxHealth && this.behavior === EnhancedWolfBehavior.Resting) {
            this.health = Math.min(this.maxHealth, this.health + 1 * deltaTime)
        }
        
        // Fatigue affects animation
        this.animComponent.fatigueLevel = 1 - (this.stamina / this.maxStamina)
    }
    
    // Get current status
    getStatus() {
        return {
            id: this.id,
            type: this.type,
            behavior: getWolfBehaviorName(this.behavior),
            position: { ...this.position },
            health: this.health,
            stamina: this.stamina,
            isGrounded: this.isGrounded,
            age: this.age,
            packRank: this.animComponent.packRank
        }
    }
}

// Behavior management system
class WolfBehaviorManager {
    constructor() {
        this.behaviorRules = new Map()
        this.globalBehaviorState = {
            packThreat: 0,
            territoryAlert: 0,
            huntingOpportunity: 0,
            socialTime: 0
        }
    }
    
    initialize() {
        this.setupBehaviorRules()
    }
    
    setupBehaviorRules() {
        // Define behavior transition rules
        this.behaviorRules.set('pack_hunt', {
            trigger: (wolf, environment) => environment.scents.some(s => s.type === 'prey' && s.strength > 0.5) &&
                       wolf.animComponent.packRank > 0.3,
            targetBehavior: EnhancedWolfBehavior.Hunting,
            priority: 8
        })
        
        this.behaviorRules.set('territory_defense', {
            trigger: (wolf, environment) => environment.scents.some(s => s.type === 'intruder' && s.strength > 0.7) &&
                       wolf.animComponent.packRank > 0.5,
            targetBehavior: EnhancedWolfBehavior.Defending,
            priority: 9
        })
        
        this.behaviorRules.set('rest_when_tired', {
            trigger: (wolf, _environment) => wolf.animComponent.fatigueLevel > 0.8 && wolf.animComponent.speed < 0.1,
            targetBehavior: EnhancedWolfBehavior.Resting,
            priority: 6
        })
        
        this.behaviorRules.set('social_interaction', {
            trigger: (wolf, environment) => environment.packData && environment.packData.nearbyWolves.length > 1 &&
                       wolf.animComponent.personalityTraits.playfulness > 0.6 &&
                       false, // ARCHITECTURAL VIOLATION FIXED: Decision should come from WASM
            targetBehavior: EnhancedWolfBehavior.Socializing,
            priority: 4
        })
    }
    
    update(deltaTime, wolves, environment) {
        // Update global behavior state
        this.updateGlobalBehaviorState(environment, deltaTime)
        
        // Apply behavior rules to each wolf
        for (const wolf of wolves.values()) {
            this.updateWolfBehavior(wolf, environment, deltaTime)
        }
    }
    
    updateGlobalBehaviorState(environment, _deltaTime) {
        // Update pack-wide behavior influences
        this.globalBehaviorState.huntingOpportunity = environment.scents
            .filter(s => s.type === 'prey')
            .reduce((max, s) => Math.max(max, s.strength), 0)
        
        this.globalBehaviorState.territoryAlert = environment.scents
            .filter(s => s.type === 'intruder')
            .reduce((max, s) => Math.max(max, s.strength), 0)
    }
    
    updateWolfBehavior(wolf, environment, _deltaTime) {
        // Check behavior rules
        let bestRule = null
        let bestPriority = -1
        
        for (const [name, rule] of this.behaviorRules) {
            if (rule.trigger(wolf, environment) && rule.priority > bestPriority) {
                bestRule = rule
                bestPriority = rule.priority
            }
        }
        
        // Apply rule if found
        if (bestRule && bestRule.targetBehavior !== wolf.behavior) {
            wolf.lastBehavior = wolf.behavior
            wolf.behavior = bestRule.targetBehavior
            wolf.animComponent.behavior = bestRule.targetBehavior
            wolf.behaviorTimer = 0
        }
    }
    
    destroy() {
        this.behaviorRules.clear()
    }
}

// Export the system
export default ProceduralWolfSystem
export { WolfInstance, WolfBehaviorManager }
