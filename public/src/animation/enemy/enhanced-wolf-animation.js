/**
 * Enhanced Wolf Animation System
 * Implements advanced wolf animations with:
 * - Realistic physics simulation
 * - Pack dynamics and coordination
 * - Environmental adaptation
 * - Behavioral state management
 * - Advanced fur simulation
 */

import { ParticleSystem } from '../../utils/particle-system.js'

export class EnhancedWolfAnimationSystem {
    constructor(options = {}) {
        this.options = {
            enablePhysics: options.enablePhysics ?? true,
            enablePackDynamics: options.enablePackDynamics ?? true,
            enableEnvironmentalEffects: options.enableEnvironmentalEffects ?? true,
            maxWolves: options.maxWolves ?? 20,
            ...options
        }
        
        this.wolves = new Map()
        this.packLeader = null
        this.environment = {
            wind: { x: 0, y: 0, strength: 0 },
            weather: { temperature: 0.5, rain: 0, snow: 0 },
            terrain: { roughness: 0, slope: 0 }
        }
        
        this.particleSystem = options.particleSystem || new ParticleSystem()
        this.wasmModule = options.wasmModule || null
        
        this.initializeWolfTypes()
        this.initializeBehaviorStates()
    }
    
    /**
     * Initialize wolf types
     */
    initializeWolfTypes() {
        this.wolfTypes = {
            alpha: {
                size: 1.2,
                mass: 50,
                packRank: 0.9,
                characteristics: {
                    confidence: 0.9,
                    aggression: 0.7,
                    playfulness: 0.3,
                    curiosity: 0.6
                },
                visual: {
                    mane: true,
                    scars: true,
                    furColor: '#8B4513',
                    eyeColor: '#FFD700'
                }
            },
            scout: {
                size: 0.9,
                mass: 35,
                packRank: 0.6,
                characteristics: {
                    confidence: 0.6,
                    aggression: 0.4,
                    playfulness: 0.5,
                    curiosity: 0.9
                },
                visual: {
                    sleek: true,
                    alertEars: true,
                    furColor: '#A0522D',
                    eyeColor: '#00FF00'
                }
            },
            hunter: {
                size: 1.1,
                mass: 45,
                packRank: 0.8,
                characteristics: {
                    confidence: 0.8,
                    aggression: 0.9,
                    playfulness: 0.2,
                    curiosity: 0.4
                },
                visual: {
                    powerfulLegs: true,
                    furColor: '#654321',
                    eyeColor: '#FF0000'
                }
            },
            normal: {
                size: 1.0,
                mass: 40,
                packRank: 0.5,
                characteristics: {
                    confidence: 0.5,
                    aggression: 0.5,
                    playfulness: 0.5,
                    curiosity: 0.5
                },
                visual: {
                    furColor: '#8B4513',
                    eyeColor: '#FFFF00'
                }
            },
            omega: {
                size: 0.85,
                mass: 30,
                packRank: 0.2,
                characteristics: {
                    confidence: 0.2,
                    aggression: 0.3,
                    playfulness: 0.4,
                    curiosity: 0.6
                },
                visual: {
                    submissivePosture: true,
                    furColor: '#A0522D',
                    eyeColor: '#C0C0C0'
                }
            }
        }
    }
    
    /**
     * Initialize behavior states
     */
    initializeBehaviorStates() {
        this.behaviorStates = {
            resting: {
                animation: 'idle',
                speed: 0,
                aggression: 0.1,
                social: 0.3,
                duration: 0
            },
            patrolling: {
                animation: 'walk',
                speed: 0.3,
                aggression: 0.2,
                social: 0.4,
                duration: 0
            },
            hunting: {
                animation: 'stalk',
                speed: 0.6,
                aggression: 0.8,
                social: 0.2,
                duration: 0
            },
            stalking: {
                animation: 'crouch',
                speed: 0.4,
                aggression: 0.9,
                social: 0.1,
                duration: 0
            },
            chasing: {
                animation: 'gallop',
                speed: 1.0,
                aggression: 1.0,
                social: 0.1,
                duration: 0
            },
            attacking: {
                animation: 'attack',
                speed: 0.8,
                aggression: 1.0,
                social: 0.0,
                duration: 0
            },
            defending: {
                animation: 'threat',
                speed: 0.2,
                aggression: 0.9,
                social: 0.6,
                duration: 0
            },
            socializing: {
                animation: 'play',
                speed: 0.4,
                aggression: 0.1,
                social: 1.0,
                duration: 0
            },
            howling: {
                animation: 'howl',
                speed: 0,
                aggression: 0.3,
                social: 0.8,
                duration: 0
            },
            playing: {
                animation: 'play',
                speed: 0.5,
                aggression: 0.2,
                social: 0.9,
                duration: 0
            },
            marking: {
                animation: 'mark',
                speed: 0.1,
                aggression: 0.4,
                social: 0.3,
                duration: 0
            },
            grooming: {
                animation: 'groom',
                speed: 0,
                aggression: 0.1,
                social: 0.2,
                duration: 0
            },
            investigating: {
                animation: 'sniff',
                speed: 0.3,
                aggression: 0.3,
                social: 0.4,
                duration: 0
            },
            fleeing: {
                animation: 'run',
                speed: 0.9,
                aggression: 0.1,
                social: 0.2,
                duration: 0
            }
        }
    }
    
    /**
     * Create a new wolf
     */
    createWolf(id, config = {}) {
        const wolfType = this.wolfTypes[config.type] || this.wolfTypes.normal
        const wolf = {
            id: id,
            type: config.type || 'normal',
            position: config.position || { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            facing: config.facing || 1,
            
            // Physical properties
            size: wolfType.size * (config.size || 1),
            mass: wolfType.mass * (config.mass || 1),
            packRank: config.packRank || wolfType.packRank,
            
            // Characteristics
            personality: { ...wolfType.characteristics, ...config.personality },
            
            // Visual properties
            visual: { ...wolfType.visual, ...config.visual },
            
            // Animation state
            behavior: config.behavior || 'resting',
            animationState: 'idle',
            animationTime: 0,
            animationSpeed: 1,
            
            // Physics state
            physics: {
                centerOfMass: { x: 0, y: 0 },
                angularVelocity: 0,
                groundContact: { left: false, right: false },
                legPhases: { frontLeft: 0, frontRight: 0, backLeft: 0, backRight: 0 }
            },
            
            // Fur simulation
            fur: {
                ruffle: 0,
                wetness: 0,
                windEffect: 0,
                tension: 0
            },
            
            // Pack dynamics
            pack: {
                leader: false,
                followers: [],
                territory: null,
                dominance: 0
            },
            
            // Environmental adaptation
            environment: {
                temperature: 0.5,
                windResistance: 0.5,
                terrainAdaptation: 0.5
            },
            
            // Animation seed for variation
            _animSeed: null,
            _animRngState: null,
            _smVelX: 0,
            _smVelY: 0
        }
        
        this.wolves.set(id, wolf)
        
        // Set pack leader if this is an alpha
        if (wolf.type === 'alpha' && !this.packLeader) {
            this.packLeader = wolf
            wolf.pack.leader = true
        }
        
        return wolf
    }
    
    /**
     * Update wolf animation system
     */
    update(deltaTime, environment = {}) {
        this._dt = deltaTime
        
        // Update environment
        this.updateEnvironment(environment)
        
        // Update each wolf
        for (const wolf of this.wolves.values()) {
            this.updateWolf(wolf, deltaTime)
        }
        
        // Update pack dynamics
        if (this.options.enablePackDynamics) {
            this.updatePackDynamics(deltaTime)
        }
    }
    
    /**
     * Update individual wolf
     */
    updateWolf(wolf, deltaTime) {
        // Update animation state
        this.updateWolfAnimation(wolf, deltaTime)
        
        // Update physics
        if (this.options.enablePhysics) {
            this.updateWolfPhysics(wolf, deltaTime)
        }
        
        // Update fur simulation
        this.updateWolfFur(wolf, deltaTime)
        
        // Update environmental adaptation
        if (this.options.enableEnvironmentalEffects) {
            this.updateWolfEnvironment(wolf, deltaTime)
        }
        
        // Update behavior
        this.updateWolfBehavior(wolf, deltaTime)
    }
    
    /**
     * Update wolf animation
     */
    updateWolfAnimation(wolf, deltaTime) {
        const behavior = this.behaviorStates[wolf.behavior];
        if (!behavior) {
            return;
        }
        
        // Update animation time
        wolf.animationTime += deltaTime * wolf.animationSpeed
        
        // Update leg phases for locomotion
        if (behavior.animation === 'walk' || behavior.animation === 'run' || behavior.animation === 'gallop') {
            this.updateLegPhases(wolf, deltaTime)
        }
        
        // Update body animation
        this.updateBodyAnimation(wolf, deltaTime)
        
        // Update head animation
        this.updateHeadAnimation(wolf, deltaTime)
        
        // Update tail animation
        this.updateTailAnimation(wolf, deltaTime)
    }
    
    /**
     * Update leg phases
     */
    updateLegPhases(wolf, deltaTime) {
        const behavior = this.behaviorStates[wolf.behavior]
        const speed = behavior.speed
        
        // Calculate gait frequency based on speed
        const gaitFrequency = 0.5 + speed * 1.5
        
        // Update each leg phase
        wolf.physics.legPhases.frontLeft = (wolf.physics.legPhases.frontLeft + deltaTime * gaitFrequency) % 1
        wolf.physics.legPhases.frontRight = (wolf.physics.legPhases.frontRight + deltaTime * gaitFrequency + 0.5) % 1
        wolf.physics.legPhases.backLeft = (wolf.physics.legPhases.backLeft + deltaTime * gaitFrequency + 0.25) % 1
        wolf.physics.legPhases.backRight = (wolf.physics.legPhases.backRight + deltaTime * gaitFrequency + 0.75) % 1
    }
    
    /**
     * Update body animation
     */
    updateBodyAnimation(wolf, _deltaTime) {
        const behavior = this.behaviorStates[wolf.behavior];
        const speed = behavior.speed;
        
        // Body bob based on speed
        const bobAmplitude = speed * 2
        const bobFrequency = 0.5 + speed * 1.5
        const bodyBob = Math.sin(wolf.animationTime * bobFrequency * Math.PI * 2) * bobAmplitude
        
        // Spine bending based on movement
        const spineBend = speed * 0.1
        
        // Update wolf properties
        wolf.bodyBob = bodyBob
        wolf.spineBend = spineBend
    }
    
    /**
     * Update head animation
     */
    updateHeadAnimation(wolf, _deltaTime) {
        // behavior is stored but animation is based on wolf.behavior directly
        
        // Head movement based on behavior
        let headPitch = 0
        let headYaw = 0
        
        switch (wolf.behavior) {
            case 'hunting':
            case 'stalking':
                headPitch = -0.2 // Head lowered
                break
            case 'howling':
                headPitch = 0.5 // Head raised
                break
            case 'investigating':
                headYaw = Math.sin(wolf.animationTime * 0.5) * 0.3 // Swaying
                break
        }
        
        wolf.headPitch = headPitch
        wolf.headYaw = headYaw
    }
    
    /**
     * Update tail animation
     */
    updateTailAnimation(wolf, _deltaTime) {
        // behavior is stored but animation is based on wolf.behavior directly
        
        // Tail movement based on behavior and personality
        let tailSway = 0
        let tailHeight = 0.5
        
        switch (wolf.behavior) {
            case 'playing':
            case 'socializing':
                tailSway = Math.sin(wolf.animationTime * 2) * 0.5
                tailHeight = 0.8
                break
            case 'fleeing':
                tailHeight = 0.2 // Tail tucked
                break
            case 'attacking':
            case 'defending':
                tailHeight = 0.9 // Tail raised
                break
            case 'resting':
                tailSway = Math.sin(wolf.animationTime * 0.5) * 0.1
                break
        }
        
        wolf.tailSway = tailSway
        wolf.tailHeight = tailHeight
    }
    
    /**
     * Update wolf physics
     */
    updateWolfPhysics(wolf, _deltaTime) {
        // speed unused - physics updates based on wolf state
        
        // Update center of mass
        wolf.physics.centerOfMass.x = wolf.position.x
        wolf.physics.centerOfMass.y = wolf.position.y + wolf.bodyBob
        
        // Update angular velocity based on turning
        const turnRate = 0.5
        wolf.physics.angularVelocity = wolf.velocity.x * turnRate
        
        // Update ground contact
        wolf.physics.groundContact.left = wolf.physics.legPhases.backLeft < 0.5
        wolf.physics.groundContact.right = wolf.physics.legPhases.backRight < 0.5
    }
    
    /**
     * Update wolf fur simulation
     */
    updateWolfFur(wolf, deltaTime) {
        // Wind effect
        const windStrength = this.environment.wind.strength
        wolf.fur.windEffect = windStrength * 0.5
        
        // Wetness effect
        const rain = this.environment.weather.rain
        wolf.fur.wetness = Math.min(1, wolf.fur.wetness + rain * deltaTime * 0.5)
        
        // Tension based on behavior
        const behavior = this.behaviorStates[wolf.behavior]
        wolf.fur.tension = behavior.aggression * 0.5
        
        // Ruffle calculation
        wolf.fur.ruffle = wolf.fur.windEffect + wolf.fur.tension + wolf.fur.wetness * 0.3
    }
    
    /**
     * Update wolf environmental adaptation
     */
    updateWolfEnvironment(wolf, _deltaTime) {
        // Temperature adaptation
        wolf.environment.temperature = this.environment.weather.temperature
        
        // Wind resistance
        wolf.environment.windResistance = Math.max(0.1, 1 - this.environment.wind.strength * 0.5)
        
        // Terrain adaptation
        wolf.environment.terrainAdaptation = this.environment.terrain.roughness
    }
    
    /**
     * Update wolf behavior
     */
    updateWolfBehavior(wolf, deltaTime) {
        // Behavior state machine
        this.updateBehaviorStateMachine(wolf, deltaTime)
        
        // Pack coordination
        if (wolf.pack.leader) {
            this.updatePackLeadership(wolf, deltaTime)
        }
    }
    
    /**
     * Update behavior state machine
     */
    updateBehaviorStateMachine(wolf, deltaTime) {
        const currentBehavior = this.behaviorStates[wolf.behavior];
        if (!currentBehavior) {
            return;
        }
        
        // Update behavior duration
        currentBehavior.duration += deltaTime
        
        // Check for behavior transitions
        this.checkBehaviorTransitions(wolf, deltaTime)
    }
    
    /**
     * Check behavior transitions
     */
    checkBehaviorTransitions(wolf, _deltaTime) {
        const currentBehavior = this.behaviorStates[wolf.behavior];
        const personality = wolf.personality;
        
        // Simple behavior transition logic
        if (currentBehavior.duration > 5) { // Minimum behavior duration
            const rand = Math.random()
            
            if (wolf.behavior === 'resting' && rand < personality.curiosity * 0.1) {
                this.transitionBehavior(wolf, 'patrolling')
            } else if (wolf.behavior === 'patrolling' && rand < personality.aggression * 0.05) {
                this.transitionBehavior(wolf, 'hunting')
            } else if (wolf.behavior === 'hunting' && rand < 0.1) {
                this.transitionBehavior(wolf, 'resting')
            }
        }
    }
    
    /**
     * Transition to new behavior
     */
    transitionBehavior(wolf, newBehavior) {
        if (wolf.behavior === newBehavior) {
            return;
        }
        
        wolf.behavior = newBehavior
        wolf.animationTime = 0
        
        // Reset behavior duration
        const behavior = this.behaviorStates[newBehavior]
        if (behavior) {
            behavior.duration = 0
        }
        
        // Spawn transition effects
        this.spawnBehaviorTransitionEffect(wolf, newBehavior)
    }
    
    /**
     * Spawn behavior transition effect
     */
    spawnBehaviorTransitionEffect(wolf, newBehavior) {
        if (!this.particleSystem) {
            return;
        }
        
        // Different effects for different behaviors
        switch (newBehavior) {
            case 'hunting':
                this.particleSystem.spawn('hunt_aura', wolf.position, {
                    count: 5,
                    color: '#FF0000',
                    size: 3,
                    lifetime: 1.0
                })
                break
            case 'playing':
                this.particleSystem.spawn('play_sparkles', wolf.position, {
                    count: 8,
                    color: '#FFFF00',
                    size: 2,
                    lifetime: 0.8
                })
                break
            case 'howling':
                this.particleSystem.spawn('howl_effect', wolf.position, {
                    count: 3,
                    color: '#FFFFFF',
                    size: 4,
                    lifetime: 1.5
                })
                break
        }
    }
    
    /**
     * Update pack dynamics
     */
    updatePackDynamics(deltaTime) {
        if (!this.packLeader) {
            return;
        }
        
        // Update pack coordination
        for (const wolf of this.wolves.values()) {
            if (wolf.id !== this.packLeader.id) {
                this.updatePackFollower(wolf, deltaTime)
            }
        }
    }
    
    /**
     * Update pack follower
     */
    updatePackFollower(wolf, _deltaTime) {
        // Follow pack leader
        const leader = this.packLeader
        const distance = Math.hypot(
            wolf.position.x - leader.position.x,
            wolf.position.y - leader.position.y
        )
        
        // Maintain pack formation
        if (distance > 100) {
            // Move toward leader
            const dx = leader.position.x - wolf.position.x
            const dy = leader.position.y - wolf.position.y
            const angle = Math.atan2(dy, dx)
            
            wolf.velocity.x = Math.cos(angle) * 0.5
            wolf.velocity.y = Math.sin(angle) * 0.5
        } else if (distance < 50) {
            // Maintain distance
            wolf.velocity.x *= 0.5
            wolf.velocity.y *= 0.5
        }
        
        // Synchronize behavior with leader
        if (leader.behavior !== wolf.behavior) {
            this.transitionBehavior(wolf, leader.behavior)
        }
    }
    
    /**
     * Update pack leadership
     */
    updatePackLeadership(wolf, _deltaTime) {
        // Pack leader behavior
        const personality = wolf.personality
        
        // Make decisions for the pack
        if (personality.confidence > 0.7 && Math.random() < 0.01) {
            // Occasionally change pack behavior
            const behaviors = ['hunting', 'patrolling', 'socializing']
            const newBehavior = behaviors[Math.floor(Math.random() * behaviors.length)]
            this.transitionBehavior(wolf, newBehavior)
        }
    }
    
    /**
     * Update environment
     */
    updateEnvironment(environment) {
        if (environment.wind) {
            this.environment.wind = { ...environment.wind }
        }
        if (environment.weather) {
            this.environment.weather = { ...environment.weather }
        }
        if (environment.terrain) {
            this.environment.terrain = { ...environment.terrain }
        }
    }
    
    /**
     * Get wolf by ID
     */
    getWolf(id) {
        return this.wolves.get(id)
    }
    
    /**
     * Get all wolves
     */
    getAllWolves() {
        return Array.from(this.wolves.values())
    }
    
    /**
     * Get wolves by type
     */
    getWolvesByType(type) {
        return this.getAllWolves().filter(wolf => wolf.type === type)
    }
    
    /**
     * Get pack leader
     */
    getPackLeader() {
        return this.packLeader
    }
    
    /**
     * Set WASM module
     */
    setWasmModule(wasmModule) {
        this.wasmModule = wasmModule
    }
    
    /**
     * Get system status
     */
    getStatus() {
        return {
            wolves: this.wolves.size,
            packLeader: this.packLeader ? this.packLeader.id : null,
            environment: this.environment,
            performance: {
                frameTime: this._dt * 1000,
                physicsTime: 0, // Would be measured in real implementation
                animationTime: 0 // Would be measured in real implementation
            }
        }
    }
}

export default EnhancedWolfAnimationSystem
