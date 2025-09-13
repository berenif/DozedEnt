// Enhanced Wolf Integration System
// Integrates all wolf body enhancement systems with existing animation framework

import EnhancedWolfBody from './enhanced-wolf-body.js'
import AdvancedFurSystem from './advanced-fur-system.js'
import WolfAnatomy from './wolf-anatomy.js'
import WolfBodyVariations from './wolf-body-variations.js'
import WolfAnimationSystem from './wolf-animation.js'
import { randInt } from '../utils/rng.js'

export class EnhancedWolfIntegration {
    constructor() {
        // Core systems
        this.bodySystem = new EnhancedWolfBody()
        this.furSystem = new AdvancedFurSystem()
        this.anatomySystem = new WolfAnatomy()
        this.variationSystem = new WolfBodyVariations()
        this.animationSystem = new WolfAnimationSystem()

        // Integration state
        this.wolves = new Map()
        this.systemsInitialized = false

        // Performance monitoring
        this.performanceMetrics = {
            renderTime: 0,
            updateTime: 0,
            furStrandCount: 0,
            activeWolves: 0
        }
    }

    // Initialize all systems
    initialize() {
        try {
            console.log('Initializing Enhanced Wolf Integration System...')

            // Systems are already instantiated, just mark as initialized
            this.systemsInitialized = true

            console.log('Enhanced Wolf Integration System initialized successfully')
            return true
        } catch (error) {
            console.error('Failed to initialize Enhanced Wolf Integration System:', error)
            return false
        }
    }

    // Create enhanced wolf with all systems integrated
    createEnhancedWolf(x, y, options = {}) {
        const wolfOptions = {
            type: 'normal',
            environment: 'forest',
            individualSeed: null,
            useAdvancedFur: true,
            useAnatomicalAccuracy: true,
            useProceduralVariations: true,
            ...options
        }

        // Create base wolf character
        const baseWolf = new EnhancedWolfCharacter(x, y, wolfOptions)

        // Generate body variation profile
        const variationProfile = this.variationSystem.generateBodyVariation(
            wolfOptions.type,
            wolfOptions.environment,
            wolfOptions.individualSeed
        )

        // Apply anatomical proportions
        const anatomicalProfile = this.anatomySystem.getAnatomicalProfile({
            age: this.getAgeFromType(wolfOptions.type),
            sex: this.getSexFromType(wolfOptions.type),
            breed: this.getBreedFromType(wolfOptions.type),
            condition: this.getConditionFromType(wolfOptions.type),
            size: variationProfile.size
        })

        // Initialize enhanced body system
        this.bodySystem.initializeWolf(baseWolf, wolfOptions.type, variationProfile.size)

        // Initialize fur system if enabled
        if (wolfOptions.useAdvancedFur) {
            this.furSystem.initializeFur(baseWolf, this.bodySystem)
        }

        // Apply variations to wolf
        this.applyVariationsToWolf(baseWolf, variationProfile, anatomicalProfile)

        // Store wolf reference
        this.wolves.set(baseWolf.id, {
            wolf: baseWolf,
            variationProfile,
            anatomicalProfile,
            systems: {
                body: this.bodySystem,
                fur: wolfOptions.useAdvancedFur ? this.furSystem : null,
                anatomy: this.anatomySystem,
                animation: this.animationSystem
            }
        })

        return baseWolf
    }

    // Get age from wolf type
    getAgeFromType(type) {
        const ageMap = {
            pup: 'pup',
            elder: 'elder',
            alpha: 'adult',
            scout: 'adult',
            hunter: 'adult',
            omega: 'adult'
        }
        return ageMap[type] || 'adult'
    }

    // Get sex from wolf type
    getSexFromType(type) {
        const sexMap = {
            alpha: 'male',
            scout: 'female',
            hunter: 'male',
            omega: 'male',
            pup: 'male', // Default, can be randomized
            elder: 'female'
        }
        return sexMap[type] || 'male'
    }

    // Get breed from wolf type
    getBreedFromType(type) {
        const breedMap = {
            alpha: 'timber',
            scout: 'gray',
            hunter: 'red',
            omega: 'gray',
            pup: 'gray',
            elder: 'gray'
        }
        return breedMap[type] || 'gray'
    }

    // Get condition from wolf type
    getConditionFromType(type) {
        const conditionMap = {
            injured: 'injured',
            starving: 'starving',
            elder: 'healthy' // Elders can be healthy despite age
        }
        return conditionMap[type] || 'healthy'
    }

    // Apply variations to wolf
    applyVariationsToWolf(wolf, variationProfile, anatomicalProfile) {
        // Apply size
        wolf.size *= variationProfile.size

        // Apply colors from variation profile
        if (variationProfile.colors) {
            wolf.colors = { ...wolf.colors, ...variationProfile.colors }
        }

        // Apply anatomical proportions
        if (anatomicalProfile.proportions) {
            wolf.proportions = anatomicalProfile.proportions
        }

        // Apply visual features
        if (variationProfile.features) {
            wolf.specialFeatures = variationProfile.features
        }

        // Apply behavioral traits
        if (variationProfile.traits) {
            wolf.traits = variationProfile.traits
        }

        // Apply asymmetry if present
        if (variationProfile.asymmetry && variationProfile.asymmetry.hasAsymmetry) {
            wolf.asymmetry = variationProfile.asymmetry
        }

        // Apply muscle tone
        wolf.muscleTone = variationProfile.muscleTone || 1.0

        // Apply body fat
        wolf.bodyFat = variationProfile.bodyFat || 1.0
    }

    // Update all enhanced wolves
    update(deltaTime, player) {
        if (!this.systemsInitialized) {return}

        const startTime = performance.now()
        let activeWolves = 0

        this.wolves.forEach((wolfData, wolfId) => {
            const wolf = wolfData.wolf

            // Skip if wolf is dead or inactive
            if (wolf.health <= 0) {return}

            activeWolves++

            // Update base wolf
            wolf.update(deltaTime, player)

            // Update enhanced body system
            this.bodySystem.update(deltaTime, wolf)

            // Update fur system if enabled
            if (wolfData.systems.fur) {
                wolfData.systems.fur.update(deltaTime)
            }

            // Update animation system
            this.animationSystem.applyAnimation(wolf, deltaTime)

            // Apply behavioral traits to animation
            this.applyBehavioralTraitsToAnimation(wolf, wolfData.variationProfile)
        })

        this.performanceMetrics.updateTime = performance.now() - startTime
        this.performanceMetrics.activeWolves = activeWolves
    }

    // Apply behavioral traits to animation
    applyBehavioralTraitsToAnimation(wolf, variationProfile) {
        if (!variationProfile.traits) {return}

        const traits = variationProfile.traits

        // Adjust animation speed based on traits
        if (traits.speed) {
            wolf.animationSpeed *= traits.speed
        }

        // Adjust muscle tension based on aggression
        if (traits.aggression) {
            wolf.muscleTone *= traits.aggression
        }

        // Adjust posture based on confidence
        if (traits.confidence) {
            wolf.confidence = traits.confidence
        }

        // Adjust movement patterns based on temperament
        if (wolf.traits && wolf.traits.temperament) {
            this.applyTemperamentToAnimation(wolf, wolf.traits.temperament)
        }
    }

    // Apply temperament to animation
    applyTemperamentToAnimation(wolf, temperament) {
        switch (temperament) {
            case 'bold':
                wolf.animationSpeed *= 1.1
                wolf.bodyTension *= 1.2
                break
            case 'cautious':
                wolf.animationSpeed *= 0.9
                wolf.earRotation *= 1.3
                break
            case 'curious':
                wolf.headScan *= 1.5
                wolf.animationSpeed *= 1.0
                break
            case 'aggressive':
                wolf.bodyTension *= 1.4
                wolf.jawOpen *= 1.2
                break
            case 'submissive':
                wolf.tailTucked *= 1.5
                wolf.bodyLowered *= 1.2
                break
        }
    }

    // Render all enhanced wolves
    render(ctx, camera) {
        if (!this.systemsInitialized) {return}

        const startTime = performance.now()
        let totalFurStrands = 0

        this.wolves.forEach((wolfData, wolfId) => {
            const wolf = wolfData.wolf

            // Skip if wolf is dead or inactive
            if (wolf.health <= 0) {return}

            // Render wolf using integrated systems
            this.renderEnhancedWolf(ctx, wolf, wolfData, camera)

            // Count fur strands for performance monitoring
            if (wolfData.systems.fur) {
                totalFurStrands += wolfData.systems.fur.strands.length
            }
        })

        this.performanceMetrics.renderTime = performance.now() - startTime
        this.performanceMetrics.furStrandCount = totalFurStrands
    }

    // Render enhanced wolf
    renderEnhancedWolf(ctx, wolf, wolfData, camera) {
        ctx.save()

        // Apply wolf transformations
        const screenX = wolf.position.x - camera.x
        const screenY = wolf.position.y - camera.y

        ctx.translate(screenX, screenY)
        ctx.scale(wolf.facing * wolf.size, wolf.size)

        // Render shadow
        this.renderWolfShadow(ctx, wolf)

        // Render body using enhanced body system
        this.bodySystem.render(ctx, wolf, { x: 0, y: 0 })

        // Render fur using advanced fur system
        if (wolfData.systems.fur) {
            wolfData.systems.fur.render(ctx, wolf, { x: 0, y: 0 })
        }

        // Render special effects based on wolf type and state
        this.renderSpecialEffects(ctx, wolf, wolfData.variationProfile)

        // Render UI elements
        this.renderWolfUI(ctx, wolf, wolfData)

        ctx.restore()
    }

    // Render wolf shadow
    renderWolfShadow(ctx, wolf) {
        ctx.save()

        const shadowScale = wolf.isGrounded ? 1.0 : 0.6
        const shadowAlpha = wolf.isGrounded ? 0.3 : 0.1

        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`
        ctx.beginPath()
        ctx.ellipse(0, wolf.height * 0.3, wolf.width * 0.4 * shadowScale, wolf.height * 0.2 * shadowScale, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    // Render special effects
    renderSpecialEffects(ctx, wolf, variationProfile) {
        // Alpha wolf aura
        if (wolf.type === 'alpha' && wolf.health > 0) {
            this.renderAlphaAura(ctx, wolf)
        }

        // Low health blood effect
        if (wolf.health < wolf.maxHealth * 0.3) {
            this.renderInjuryEffects(ctx, wolf)
        }

        // Movement speed lines
        if (wolf.velocity && Math.abs(wolf.velocity.x) > 200) {
            this.renderSpeedLines(ctx, wolf)
        }

        // Special features from variation profile
        if (variationProfile.features) {
            this.renderSpecialFeatures(ctx, wolf, variationProfile.features)
        }
    }

    // Render alpha wolf aura
    renderAlphaAura(ctx, wolf) {
        ctx.save()

        const auraRadius = wolf.width * 0.8
        const auraAlpha = 0.3 + Math.sin(Date.now() * 0.003) * 0.1

        // Outer glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius)
        gradient.addColorStop(0, `rgba(255, 215, 0, ${auraAlpha})`)
        gradient.addColorStop(0.7, `rgba(255, 215, 0, ${auraAlpha * 0.5})`)
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    // Render injury effects
    renderInjuryEffects(ctx, wolf) {
        ctx.save()

        // Blood droplets (deterministic visuals)
        ctx.fillStyle = 'rgba(139, 0, 0, 0.6)'

        let s = Number((globalThis.runSeedForVisuals ?? 1n) % 4093n)
        const next = () => {
            s = (s * 1103515245 + 12345) % 0x80000000
            return (s >>> 0) / 0x80000000
        }
        for (let i = 0; i < 3; i++) {
            const x = (next() - 0.5) * wolf.width * 0.8
            const y = (next() - 0.5) * wolf.height * 0.6
            const size = 2 + next() * 3

            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.restore()
    }

    // Render speed lines
    renderSpeedLines(ctx, wolf) {
        ctx.save()

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1

        const numLines = 5
        for (let i = 0; i < numLines; i++) {
            const y = wolf.height * (0.1 + (i / numLines) * 0.8)
            const length = wolf.width * 0.3

            ctx.beginPath()
            ctx.moveTo(-wolf.facing * wolf.width * 0.5, y)
            ctx.lineTo(-wolf.facing * (wolf.width * 0.5 + length), y)
            ctx.stroke()
        }

        ctx.restore()
    }

    // Render special features
    renderSpecialFeatures(ctx, wolf, features) {
        features.forEach(feature => {
            switch (feature) {
                case 'mane':
                    this.renderMane(ctx, wolf)
                    break
                case 'scars':
                    this.renderScars(ctx, wolf)
                    break
                case 'battle_scars':
                    this.renderBattleScars(ctx, wolf)
                    break
                case 'weathered_fur':
                    this.renderWeatheredFur(ctx, wolf)
                    break
                case 'fluffy_fur':
                    this.renderFluffyFur(ctx, wolf)
                    break
            }
        })
    }

    // Render mane (alpha wolves)
    renderMane(ctx, wolf) {
        ctx.save()

        // Mane around neck and shoulders
        ctx.fillStyle = 'rgba(139, 115, 85, 0.8)'
        ctx.beginPath()
        ctx.arc(0, -wolf.height * 0.1, wolf.width * 0.6, -Math.PI * 0.3, Math.PI * 0.3)
        ctx.fill()

        ctx.restore()
    }

    // Render scars
    renderScars(ctx, wolf) {
        ctx.save()

        ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)'
        ctx.lineWidth = 2

        // Random scar lines (deterministic)
        let t = Number((globalThis.runSeedForVisuals ?? 1n) % 8191n)
        const next = () => {
            t = (t * 48271) % 2147483647
            return t / 2147483647
        }
        for (let i = 0; i < 3; i++) {
            const startX = (next() - 0.5) * wolf.width * 0.6
            const startY = (next() - 0.5) * wolf.height * 0.6
            const endX = startX + (next() - 0.5) * wolf.width * 0.3
            const endY = startY + (next() - 0.5) * wolf.height * 0.3

            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.lineTo(endX, endY)
            ctx.stroke()
        }

        ctx.restore()
    }

    // Render battle scars (more dramatic)
    renderBattleScars(ctx, wolf) {
        ctx.save()

        ctx.strokeStyle = 'rgba(139, 0, 0, 0.9)'
        ctx.lineWidth = 3

        // More prominent scars
        ctx.beginPath()
        ctx.moveTo(-wolf.width * 0.3, -wolf.height * 0.2)
        ctx.lineTo(-wolf.width * 0.1, -wolf.height * 0.3)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(wolf.width * 0.2, wolf.height * 0.1)
        ctx.lineTo(wolf.width * 0.4, wolf.height * 0.2)
        ctx.stroke()

        ctx.restore()
    }

    // Render weathered fur
    renderWeatheredFur(ctx, wolf) {
        ctx.save()

        ctx.fillStyle = 'rgba(160, 130, 100, 0.4)'

        // Weathered patches (deterministic)
        let s = Number((globalThis.runSeedForVisuals ?? 1n) % 7919n)
        const next = () => {
            s = (s * 1664525 + 1013904223) % 0x80000000
            return (s >>> 0) / 0x80000000
        }
        for (let i = 0; i < 5; i++) {
            const x = (next() - 0.5) * wolf.width * 0.8
            const y = (next() - 0.5) * wolf.height * 0.6
            const size = 8 + next() * 12

            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.restore()
    }

    // Render fluffy fur
    renderFluffyFur(ctx, wolf) {
        ctx.save()

        ctx.fillStyle = 'rgba(200, 180, 160, 0.5)'

        // Fluffy patches (deterministic)
        let r = Number((globalThis.runSeedForVisuals ?? 1n) % 1237n)
        const next2 = () => {
            r = (r * 22695477 + 1) % 0x80000000
            return (r >>> 0) / 0x80000000
        }
        for (let i = 0; i < 8; i++) {
            const x = (next2() - 0.5) * wolf.width * 0.6
            const y = (next2() - 0.5) * wolf.height * 0.5
            const size = 5 + next2() * 8

            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.restore()
    }

    // Render wolf UI elements
    renderWolfUI(ctx, wolf, wolfData) {
        // Health bar
        if (wolf.health < wolf.maxHealth) {
            this.renderHealthBar(ctx, wolf)
        }

        // Status indicators
        this.renderStatusIndicators(ctx, wolf, wolfData.variationProfile)

        // Alpha crown
        if (wolf.type === 'alpha') {
            this.renderAlphaCrown(ctx, wolf)
        }
    }

    // Render health bar
    renderHealthBar(ctx, wolf) {
        ctx.save()

        const barWidth = 60
        const barHeight = 6
        const barY = -wolf.height * 0.5 - 20

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight)

        // Health
        const healthPercent = wolf.health / wolf.maxHealth
        ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336'
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight)

        // Border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight)

        ctx.restore()
    }

    // Render status indicators
    renderStatusIndicators(ctx, wolf, variationProfile) {
        ctx.save()
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'

        let indicatorY = -wolf.height * 0.5 - 40

        // State indicator
        if (wolf.state !== 'idle') {
            ctx.fillStyle = this.getStateColor(wolf.state)
            ctx.fillText(this.getStateIcon(wolf.state), 0, indicatorY)
            indicatorY -= 15
        }

        // Trait indicators
        if (variationProfile.traits) {
            if (variationProfile.traits.aggression > 1.2) {
                ctx.fillStyle = '#ff6b6b'
                ctx.fillText('⚔', -20, indicatorY)
            }
            if (variationProfile.traits.stealth > 1.2) {
                ctx.fillStyle = '#95e1d3'
                ctx.fillText('👁', 0, indicatorY)
            }
            if (variationProfile.traits.speed > 1.2) {
                ctx.fillStyle = '#ffd93d'
                ctx.fillText('💨', 20, indicatorY)
            }
        }

        ctx.restore()
    }

    // Get state color
    getStateColor(state) {
        const colors = {
            idle: '#666666',
            prowling: '#4a90e2',
            running: '#ff9800',
            lunging: '#f44336',
            attacking: '#e91e63',
            hurt: '#ff5722',
            howling: '#9c27b0'
        }
        return colors[state] || '#666666'
    }

    // Get state icon
    getStateIcon(state) {
        const icons = {
            idle: '😌',
            prowling: '👁',
            running: '🏃',
            lunging: '💨',
            attacking: '⚔',
            hurt: '😰',
            howling: '🌙'
        }
        return icons[state] || '🐺'
    }

    // Render alpha crown
    renderAlphaCrown(ctx, wolf) {
        ctx.save()

        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffd700'
        ctx.strokeStyle = '#b8860b'
        ctx.lineWidth = 2

        // Crown symbol
        ctx.strokeText('👑', 0, -wolf.height * 0.5 - 5)
        ctx.fillText('👑', 0, -wolf.height * 0.5 - 5)

        ctx.restore()
    }

    // Get performance metrics
    getPerformanceMetrics() {
        return { ...this.performanceMetrics }
    }

    // Remove wolf from system
    removeWolf(wolfId) {
        this.wolves.delete(wolfId)
    }

    // Get wolf data
    getWolfData(wolfId) {
        return this.wolves.get(wolfId)
    }

    // Get all active wolves
    getActiveWolves() {
        return Array.from(this.wolves.values()).map(data => data.wolf)
    }

    // Export system state
    exportSystemState() {
        const wolfStates = {}
        this.wolves.forEach((data, wolfId) => {
            wolfStates[wolfId] = {
                variationProfile: data.variationProfile,
                anatomicalProfile: data.anatomicalProfile,
                wolfState: {
                    position: { ...data.wolf.position },
                    health: data.wolf.health,
                    state: data.wolf.state,
                    type: data.wolf.type
                }
            }
        })

        return {
            version: '1.0',
            timestamp: Date.now(),
            wolfStates,
            performanceMetrics: this.performanceMetrics
        }
    }
}

// Enhanced Wolf Character class that extends base functionality
class EnhancedWolfCharacter {
    constructor(x, y, options = {}) {
        // Base properties
        // Deterministic ID (visuals-only): stable across runs given creation order
        const n = randInt(2176782336, 'wolf-id') // 36**6
        const suffix = n.toString(36).padStart(6, '0')
        this.id = `wolf_${suffix}`
        this.position = { x, y }
        this.velocity = { x: 0, y: 0 }
        this.acceleration = { x: 0, y: 0 }

        // Enhanced properties
        this.type = options.type || 'normal'
        this.size = 1.0
        this.facing = 1
        this.health = 100
        this.maxHealth = 100

        // Visual properties
        this.colors = {
            primary: '#6b5d54',
            secondary: '#4a4038',
            belly: '#8b7d74',
            eyes: '#ffd700',
            nose: '#1a1a1a',
            claws: '#2c2c2c'
        }

        // Animation properties
        this.state = 'idle'
        this.animationTime = 0
        this.animationSpeed = 0.1

        // Enhanced animation properties
        this.proportions = {}
        this.traits = {}
        this.specialFeatures = []
        this.muscleTone = 1.0
        this.bodyFat = 1.0
        this.confidence = 1.0

        // Physics properties
        this.width = 80
        this.height = 60
        this.isGrounded = true

        // Combat properties
        this.damage = 15
        this.attackRange = 50
        this.detectionRange = 300

        // Movement properties
        this.speed = 200
        this.maxSpeed = 350
        this.friction = 0.85

        // Animation system properties
        this.legPositions = []
        this.tailSegments = []
        this.bodyBob = 0
        this.headBob = 0
        this.bodyLowered = 0
        this.bodySway = 0
        this.headScan = 0
        this.headTilt = 0
        this.headShake = 0
        this.bodyStretch = 1
        this.frontLegExtension = 0
        this.rearLegExtension = 0
        this.clawsOut = false
        this.mouthOpen = 0
        this.jawOpen = 0
        this.teethVisible = false
        this.furRipple = 0
        this.furMovement = null
        this.bodyTension = 0
        this.chestExpansion = 1
        this.bellyOffset = 0
        this.mouthVibration = 0
        this.soundWavePhase = null
        this.soundWaveAmplitude = 0
        this.flinchOffset = 0
        this.bodyShake = 0
        this.tailTucked = 0
        this.earAlertness = 0
        this.isBlinking = false
        this.particleSystem = null
    }

    // Enhanced update method
    update(deltaTime, player) {
        this.animationTime += deltaTime

        // Update physics
        this.velocity.x += this.acceleration.x * deltaTime
        this.velocity.y += this.acceleration.y * deltaTime
        this.velocity.x *= this.friction
        this.velocity.y *= this.friction

        this.position.x += this.velocity.x * deltaTime
        this.position.y += this.velocity.y * deltaTime

        this.acceleration.x = 0
        this.acceleration.y = 0

        // Update facing direction based on movement or target
        if (player && this.position.x !== player.position.x) {
            this.facing = this.position.x < player.position.x ? 1 : -1
        }
    }

    // Enhanced render method (placeholder - actual rendering handled by integration system)
    render(ctx, camera) {
        // This will be overridden by the integration system
        console.log(`Rendering enhanced wolf ${this.id}`)
    }

    // Utility methods
    getDistanceTo(target) {
        if (!target || !target.position) {return Infinity}
        const dx = this.position.x - target.position.x
        const dy = this.position.y - target.position.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    takeDamage(amount) {
        this.health -= amount
        if (this.health <= 0) {
            this.health = 0
            this.state = 'death'
        } else {
            this.state = 'hurt'
        }
    }

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState
            this.animationTime = 0
        }
    }
}

export default EnhancedWolfIntegration
