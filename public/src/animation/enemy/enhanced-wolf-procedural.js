// Enhanced Wolf Procedural Animation System v3
// Realistic biomechanical animation system for wolves with advanced procedural techniques
// Built on top of the existing wolf-procedural.js system with enhanced realism

import { 
    WolfGait, 
    WolfState, 
    WolfEmotionalState, 
    WolfAction, 
    TerrainType, 
    PackRole,
    EnhancedWolfBehavior,
    WolfAnatomy,
    createWolfAnimComponent,
    updateWolfAnimation 
} from './wolf-procedural.js'

// Enhanced gait patterns with realistic biomechanics
export const EnhancedWolfGait = Object.freeze({
    ...WolfGait,
    Bound: 4,      // Bounding gait (both hind legs together)
    Pace: 5,       // Pacing gait (lateral legs together)
    Stalking: 6,   // Ultra-slow stalking movement
    Pounce: 7      // Pre-attack crouch and pounce
})

// Enhanced behavioral states for realistic wolf behavior
// Note: EnhancedWolfBehavior and WolfAnatomy are imported from wolf-procedural.js to avoid duplicate exports

// Enhanced component factory with biomechanical properties
export function createEnhancedWolfAnimComponent(overrides = {}) {
    const baseComponent = createWolfAnimComponent(overrides)
    
    return {
        ...baseComponent,
        
        // Enhanced locomotion properties
        gaitTransitionSpeed: 0.5,     // Speed of gait transitions
        strideFrequency: 1.0,         // Base stride frequency
        strideLength: 1.0,            // Base stride length
        groundClearance: 0.05,        // Foot lift height
        
        // Biomechanical properties
        centerOfMass: { x: 0, y: 0.6, z: 0 }, // Relative to shoulder
        spineSegments: 12,            // Number of spine segments
        neckSegments: 7,              // Cervical vertebrae
        tailSegments: 20,             // Tail vertebrae
        
        // Advanced physics
        momentum: { x: 0, y: 0, z: 0 },
        angularMomentum: 0,
        balancePoint: { x: 0, y: 0 },
        weightDistribution: [0.25, 0.25, 0.25, 0.25], // Per leg
        
        // Behavioral animation
        behavior: EnhancedWolfBehavior.Resting,
        behaviorTimer: 0,
        lastBehavior: EnhancedWolfBehavior.Resting,
        behaviorIntensity: 0,
        
        // Pack dynamics
        packPosition: { x: 0, y: 0 },
        packFormation: 'loose',       // loose, tight, line, circle
        packRank: 0.5,                // 0 = omega, 1 = alpha
        socialInteractionTarget: -1,   // Index of wolf being interacted with
        
        // Environmental awareness
        windDirection: { x: 0, y: 0 },
        windStrength: 0,
        surfaceType: 'grass',         // grass, dirt, rock, snow, mud
        surfaceFriction: 1.0,
        surfaceSlope: 0,
        
        // Scent and marking
        scentStrength: 0,
        markingUrge: 0,
        lastMarkingTime: 0,
        
        // Realistic breathing and metabolism
        breathingRate: 1.0,           // Breaths per second
        heartRate: 1.5,               // Beats per second
        fatigueLevel: 0,              // 0-1, affects all animations
        temperature: 0.5,             // 0 = cold, 1 = hot, affects panting
        
        // Fur and body dynamics
        furState: {
            raised: 0,                // Hackles raised (0-1)
            wetness: 0,               // Fur wetness (0-1)
            windRuffle: 0,            // Wind effect on fur
            movement: { x: 0, y: 0 }  // Fur movement direction
        },
        
        // Enhanced muscle tension system
        muscleTension: {
            neck: 0,
            shoulders: 0,
            back: 0,
            hips: 0,
            legs: [0, 0, 0, 0]        // Per leg tension
        },
        
        // Procedural variation seeds for unique animations
        // ARCHITECTURAL VIOLATION FIXED: Use deterministic seed from WASM instead of Math.random()
        individualSeed: overrides.individualSeed || 0, // Should be set from WASM-generated deterministic seed
        personalityTraits: {
            confidence: 0.5,          // Affects posture and movement
            playfulness: 0.5,         // Affects idle animations
            aggression: 0.5,          // Affects threat displays
            curiosity: 0.5            // Affects investigation behavior
        },
        
        ...overrides
    }
}

// Enhanced update function with realistic biomechanics
export function updateEnhancedWolfAnimation(comp, deltaTime, raycastGround, environmentData = {}) {
    // Update base animation system first
    updateWolfAnimation(comp, deltaTime, raycastGround)
    
    // Enhanced updates
    updateBehavioralState(comp, deltaTime, environmentData)
    updateBiomechanics(comp, deltaTime)
    updatePackDynamics(comp, deltaTime, environmentData)
    updateEnvironmentalEffects(comp, deltaTime, environmentData)
    updateProceduralVariations(comp, deltaTime)
    updateAdvancedSecondaryMotion(comp, deltaTime)
    
    return comp
}

// Update behavioral state machine
function updateBehavioralState(comp, deltaTime, _environmentData) {
    comp.behaviorTimer += deltaTime
    
    const speed = comp.speed
    const alertness = comp.alertness
    const emotional = comp.emotionalState
    const fatigue = comp.fatigueLevel
    
    // Determine target behavior based on context
    let targetBehavior = comp.behavior
    
    // Basic behavior selection logic
    if (comp.stunTimer > 0) {
        targetBehavior = EnhancedWolfBehavior.Defending
    } else if (speed > 3.0 && alertness > 0.8) {
        targetBehavior = EnhancedWolfBehavior.Chasing
    } else if (speed > 0.1 && alertness > 0.6) {
        targetBehavior = EnhancedWolfBehavior.Hunting
    } else if (alertness > 0.8 && speed < 0.5) {
        targetBehavior = EnhancedWolfBehavior.Stalking
    } else if (speed < 0.1 && alertness < 0.3 && fatigue > 0.6) {
        targetBehavior = EnhancedWolfBehavior.Resting
    } else if (speed < 0.5) {
        targetBehavior = EnhancedWolfBehavior.Patrolling
    }
    
    // Behavioral transitions with hysteresis
    if (targetBehavior !== comp.behavior) {
        if (comp.behaviorTimer > 0.5) { // Minimum time in state
            comp.lastBehavior = comp.behavior
            comp.behavior = targetBehavior
            comp.behaviorTimer = 0
            comp.behaviorIntensity = 0
        }
    }
    
    // Update behavior intensity
    const targetIntensity = getBehaviorIntensity(comp.behavior, comp)
    comp.behaviorIntensity += (targetIntensity - comp.behaviorIntensity) * deltaTime * 3
    
    // Apply behavior-specific modifications
    applyBehavioralModifications(comp)
}

// Get target intensity for current behavior
function getBehaviorIntensity(behavior, _comp) {
    switch (behavior) {
        case EnhancedWolfBehavior.Resting: return 0.1
        case EnhancedWolfBehavior.Patrolling: return 0.3
        case EnhancedWolfBehavior.Hunting: return 0.7
        case EnhancedWolfBehavior.Stalking: return 0.9
        case EnhancedWolfBehavior.Chasing: return 1.0
        case EnhancedWolfBehavior.Attacking: return 1.0
        case EnhancedWolfBehavior.Defending: return 0.8
        case EnhancedWolfBehavior.Howling: return 0.6
        case EnhancedWolfBehavior.Playing: return 0.8
        default: return 0.5
    }
}

// Apply behavior-specific animation modifications
function applyBehavioralModifications(comp) {
    const behavior = comp.behavior
    const intensity = comp.behaviorIntensity
    
    switch (behavior) {
        case EnhancedWolfBehavior.Stalking:
            comp.root.height *= 0.8 // Lower body
            comp.gait = WolfGait.Prowl
            comp.muscleTension.neck = intensity * 0.8
            comp.furState.raised = intensity * 0.3
            break
            
        case EnhancedWolfBehavior.Hunting:
            comp.headPitch = -0.2 * intensity // Head forward
            comp.muscleTension.shoulders = intensity * 0.6
            comp.alertness = Math.max(comp.alertness, intensity * 0.8)
            break
            
        case EnhancedWolfBehavior.Chasing:
            comp.gait = WolfGait.Gallop
            comp.bodyStretch = 1 + intensity * 0.3
            comp.muscleTension.hips = intensity * 0.9
            break
            
        case EnhancedWolfBehavior.Defending:
            comp.furState.raised = intensity
            comp.muscleTension.neck = intensity
            comp.muscleTension.shoulders = intensity * 0.8
            comp.root.height *= 1.1 // Slightly taller
            break
            
        case EnhancedWolfBehavior.Resting:
            comp.root.height *= 0.6 // Lying down
            comp.breathingRate = 0.5
            comp.muscleTension.neck = 0.1
            break
            
        case EnhancedWolfBehavior.Playing:
            // Play bow posture
            if (Math.sin(comp.time * 2) > 0.5) {
                comp.root.height *= 0.7
                comp.headPitch = -0.3
            }
            break
    }
}

// Update realistic biomechanics
function updateBiomechanics(comp, deltaTime) {
    updateCenterOfMass(comp)
    updateWeightDistribution(comp)
    updateMomentum(comp, deltaTime)
    updateSpineDynamics(comp, deltaTime)
    updateMuscleTension(comp, deltaTime)
    updateMetabolism(comp, deltaTime)
}

// Calculate realistic center of mass
function updateCenterOfMass(comp) {
    const anatomy = WolfAnatomy
    
    // Base center of mass
    let comX = 0
    let comY = anatomy.shoulderHeight * 0.6
    const comZ = 0
    
    // Adjust based on posture
    if (comp.behavior === EnhancedWolfBehavior.Resting) {
        comY *= 0.5 // Lower when lying
    } else if (comp.behavior === EnhancedWolfBehavior.Defending) {
        comY *= 1.1 // Higher when alert
    }
    
    // Adjust based on movement
    const speedFactor = Math.min(comp.speed / 4.0, 1.0)
    comX += speedFactor * 0.1 // Shift forward when moving
    
    // Adjust based on spine curvature
    comX += comp.spineCurve * 0.2
    
    comp.centerOfMass.x = comX
    comp.centerOfMass.y = comY
    comp.centerOfMass.z = comZ
}

// Update weight distribution across legs
function updateWeightDistribution(comp) {
    const anatomy = WolfAnatomy
    const com = comp.centerOfMass
    
    // Base weight distribution
    let frontWeight = anatomy.frontWeightRatio
    let hindWeight = anatomy.hindWeightRatio
    
    // Adjust based on movement
    const speedFactor = Math.min(comp.speed / 4.0, 1.0)
    frontWeight -= speedFactor * 0.1 // Less weight on front when running
    hindWeight += speedFactor * 0.1  // More weight on hind when running
    
    // Adjust based on posture
    if (comp.behavior === EnhancedWolfBehavior.Stalking) {
        frontWeight -= 0.1 // Shift weight back for stalking
        hindWeight += 0.1
    } else if (comp.behavior === EnhancedWolfBehavior.Defending) {
        frontWeight += 0.1 // Shift weight forward for threat display
        hindWeight -= 0.1
    }
    
    // Distribute to individual legs
    comp.weightDistribution[0] = frontWeight * 0.5 // Front left
    comp.weightDistribution[1] = frontWeight * 0.5 // Front right
    comp.weightDistribution[2] = hindWeight * 0.5  // Hind left
    comp.weightDistribution[3] = hindWeight * 0.5  // Hind right
    
    // Add asymmetry for turning
    if (comp.turnRate > 0.1) {
        const turnFactor = comp.turnRate * 0.1
        comp.weightDistribution[1] += turnFactor // More weight on right when turning left
        comp.weightDistribution[3] += turnFactor
        comp.weightDistribution[0] -= turnFactor
        comp.weightDistribution[2] -= turnFactor
    } else if (comp.turnRate < -0.1) {
        const turnFactor = -comp.turnRate * 0.1
        comp.weightDistribution[0] += turnFactor // More weight on left when turning right
        comp.weightDistribution[2] += turnFactor
        comp.weightDistribution[1] -= turnFactor
        comp.weightDistribution[3] -= turnFactor
    }
}

// Update momentum and physics
function updateMomentum(comp, _deltaTime) {
    const mass = 50 // kg, average wolf weight
    
    // Update linear momentum
    comp.momentum.x = mass * comp.velocityWorld.x
    comp.momentum.y = mass * comp.velocityWorld.y
    comp.momentum.z = 0 // 2D for now
    
    // Update angular momentum based on turning
    comp.angularMomentum = mass * comp.turnRate * 0.5
    
    // Calculate balance point
    comp.balancePoint.x = comp.centerOfMass.x + comp.momentum.x * 0.01
    comp.balancePoint.y = comp.centerOfMass.y
}

// Update spine dynamics with realistic constraints
function updateSpineDynamics(comp, deltaTime) {
    const maxBend = WolfAnatomy.spineMaxBend
    
    // Base spine curvature from movement
    let targetCurve = 0
    
    // Add curvature for turning
    targetCurve += comp.turnRate * 0.3
    
    // Add curvature for different behaviors
    if (comp.behavior === EnhancedWolfBehavior.Stalking) {
        targetCurve += Math.sin(comp.time * 0.5) * 0.1 // Subtle stalking sway
    } else if (comp.behavior === EnhancedWolfBehavior.Playing) {
        targetCurve += Math.sin(comp.time * 3) * 0.2 // Playful movement
    }
    
    // Clamp to anatomical limits
    targetCurve = Math.max(-maxBend, Math.min(maxBend, targetCurve))
    
    // Smooth transition
    comp.spineCurve += (targetCurve - comp.spineCurve) * deltaTime * 5
}

// Update muscle tension based on activity
function updateMuscleTension(comp, deltaTime) {
    const baseTension = comp.behaviorIntensity * 0.5
    const speedTension = Math.min(comp.speed / 4.0, 1.0) * 0.3
    const alertTension = comp.alertness * 0.2
    
    const totalTension = baseTension + speedTension + alertTension
    
    // Update muscle groups
    comp.muscleTension.neck += (totalTension - comp.muscleTension.neck) * deltaTime * 3
    comp.muscleTension.shoulders += (totalTension - comp.muscleTension.shoulders) * deltaTime * 3
    comp.muscleTension.back += (totalTension * 0.8 - comp.muscleTension.back) * deltaTime * 3
    comp.muscleTension.hips += (totalTension * 1.2 - comp.muscleTension.hips) * deltaTime * 3
    
    // Individual leg tension
    for (let i = 0; i < 4; i++) {
        const legLoad = comp.weightDistribution[i]
        const targetTension = totalTension * legLoad
        comp.muscleTension.legs[i] += (targetTension - comp.muscleTension.legs[i]) * deltaTime * 4
    }
}

// Update metabolism and physiological responses
function updateMetabolism(comp, deltaTime) {
    // Update breathing rate based on activity
    const targetBreathingRate = 0.5 + comp.speed * 0.3 + comp.behaviorIntensity * 0.5
    comp.breathingRate += (targetBreathingRate - comp.breathingRate) * deltaTime * 2
    
    // Update heart rate
    const targetHeartRate = 1.0 + comp.speed * 0.8 + comp.behaviorIntensity * 0.7
    comp.heartRate += (targetHeartRate - comp.heartRate) * deltaTime * 1.5
    
    // Update fatigue
    const fatigueRate = comp.speed * 0.1 + comp.behaviorIntensity * 0.05
    const recoveryRate = comp.behavior === EnhancedWolfBehavior.Resting ? 0.2 : 0.05
    comp.fatigueLevel = Math.max(0, Math.min(1, comp.fatigueLevel + (fatigueRate - recoveryRate) * deltaTime))
    
    // Temperature regulation
    const heatGeneration = comp.speed * 0.2 + comp.behaviorIntensity * 0.1
    const heatLoss = 0.3
    comp.temperature = Math.max(0, Math.min(1, comp.temperature + (heatGeneration - heatLoss) * deltaTime))
}

// Update pack dynamics and coordination
function updatePackDynamics(comp, deltaTime, environmentData) {
    // Update pack position and formation
    if (environmentData.packData) {
        updatePackFormation(comp, environmentData.packData)
        updatePackCoordination(comp, environmentData.packData)
        updateSocialBehavior(comp, environmentData.packData, deltaTime)
    }
}

// Update pack formation
function updatePackFormation(comp, packData) {
    const formation = packData.formation || 'loose'
    const myIndex = packData.myIndex || 0
    const packSize = packData.size || 1
    
    switch (formation) {
        case 'line':
            comp.packPosition.x = (myIndex - packSize / 2) * 2
            comp.packPosition.y = 0
            break
        case 'circle':
            const angle = (myIndex / packSize) * Math.PI * 2
            comp.packPosition.x = Math.cos(angle) * 3
            comp.packPosition.y = Math.sin(angle) * 3
            break
        case 'tight':
            // ARCHITECTURAL VIOLATION FIXED: Pack positioning should be deterministic
            // Use deterministic positioning based on wolf index and formation
            const tightAngle = (myIndex / packSize) * Math.PI * 2
            comp.packPosition.x = Math.cos(tightAngle) * 1.5
            comp.packPosition.y = Math.sin(tightAngle) * 1.5
            break
        default: // loose
            // ARCHITECTURAL VIOLATION FIXED: Pack positioning should be deterministic
            // Use deterministic positioning based on wolf index and formation
            const looseAngle = (myIndex / packSize) * Math.PI * 2
            comp.packPosition.x = Math.cos(looseAngle) * 3
            comp.packPosition.y = Math.sin(looseAngle) * 3
            break
    }
}

// Update pack coordination
function updatePackCoordination(comp, packData) {
    // Sync movement with pack leader
    if (packData.leader && comp.packRank < 0.8) {
        const leader = packData.leader
        const syncStrength = (1 - comp.packRank) * 0.3
        
        // Sync gait
        if (leader.gait !== comp.gait) {
            comp.gait = leader.gait
        }
        
        // Sync phase with slight offset
        const phaseOffset = comp.packRank * Math.PI * 0.5
        comp.packSyncPhase = leader.phase[0] + phaseOffset
    }
}

// Update social behavior within pack
function updateSocialBehavior(comp, packData, deltaTime) {
    // Update marking urge based on territory and rank
    if (comp.packRank > 0.7) { // Alpha wolves mark more
        comp.markingUrge += deltaTime * 0.1
    } else {
        comp.markingUrge += deltaTime * 0.02
    }
    
    // Territory marking behavior
    if (comp.markingUrge > 1.0 && comp.speed < 0.1) {
        comp.behavior = EnhancedWolfBehavior.Marking
        comp.markingUrge = 0
        comp.lastMarkingTime = comp.time
    }
    
    // Social interaction checks
    if (packData.nearbyWolves) {
        for (const other of packData.nearbyWolves) {
            const distance = Math.sqrt(
                (other.position.x - comp.targetPos.x) ** 2 + 
                (other.position.y - comp.targetPos.y) ** 2
            )
            
            // ARCHITECTURAL VIOLATION FIXED: Behavioral decisions should be deterministic
            // Use deterministic decision based on distance, personality, and wolf ID
            const playfulness = comp.personalityTraits.playfulness
            const threshold = 0.3 + playfulness * 0.4 // Base threshold modified by personality
            const wolfId = comp.individualSeed || 0
            const decision = (wolfId + Math.floor(distance * 1000)) % 1000
            
            if (distance < 2.0 && decision < threshold * 1000) {
                comp.behavior = EnhancedWolfBehavior.Socializing
                comp.socialInteractionTarget = other.id
            }
        }
    }
}

// Update environmental effects
function updateEnvironmentalEffects(comp, deltaTime, environmentData) {
    updateWindEffects(comp, environmentData.wind || {})
    updateSurfaceEffects(comp, environmentData.surface || {})
    updateWeatherEffects(comp, environmentData.weather || {})
    updateScentTracking(comp, environmentData.scents || [])
}

// Update wind effects on movement and fur
function updateWindEffects(comp, windData) {
    comp.windDirection.x = windData.x || 0
    comp.windDirection.y = windData.y || 0
    comp.windStrength = windData.strength || 0
    
    // Wind affects fur
    comp.furState.windRuffle = comp.windStrength * 0.5
    comp.furState.movement.x = comp.windDirection.x * comp.windStrength
    comp.furState.movement.y = comp.windDirection.y * comp.windStrength
    
    // Wind affects balance slightly
    comp.balancePoint.x += comp.windDirection.x * comp.windStrength * 0.1
}

// Update surface effects
function updateSurfaceEffects(comp, surfaceData) {
    comp.surfaceType = surfaceData.type || 'grass'
    comp.surfaceFriction = surfaceData.friction || 1.0
    comp.surfaceSlope = surfaceData.slope || 0
    
    // Different surfaces affect gait
    switch (comp.surfaceType) {
        case 'ice':
            comp.strideLength *= 0.8 // Shorter strides on ice
            comp.groundClearance *= 0.5 // Keep feet closer to ground
            break
        case 'mud':
            comp.strideFrequency *= 0.9 // Slower movement in mud
            comp.groundClearance *= 1.2 // Higher steps to clear mud
            break
        case 'rock':
            comp.groundClearance *= 1.3 // Higher steps on rocks
            break
    }
    
    // Slope affects posture
    if (comp.surfaceSlope > 0.1) { // Uphill
        comp.root.pitch = -comp.surfaceSlope * 0.5
        comp.headPitch += comp.surfaceSlope * 0.3
    } else if (comp.surfaceSlope < -0.1) { // Downhill
        comp.root.pitch = -comp.surfaceSlope * 0.3
        comp.headPitch += comp.surfaceSlope * 0.2
    }
}

// Update weather effects
function updateWeatherEffects(comp, weatherData) {
    const rain = weatherData.rain || 0
    const snow = weatherData.snow || 0
    const temperature = weatherData.temperature || 0.5
    
    // Rain affects fur
    comp.furState.wetness = rain
    
    // Temperature affects behavior
    if (temperature < 0.3) { // Cold
        comp.behaviorIntensity *= 1.1 // More active to stay warm
        comp.furState.raised += 0.2 // Fluff up fur
    } else if (temperature > 0.7) { // Hot
        comp.breathingRate *= 1.3 // Panting
        comp.behaviorIntensity *= 0.9 // Less active in heat
    }
    
    // Snow affects movement
    if (snow > 0.3) {
        comp.groundClearance *= 1.5 // Higher steps in snow
        comp.strideLength *= 0.9 // Shorter strides
    }
}

// Update scent tracking behavior
function updateScentTracking(comp, scents) {
    if (scents.length === 0) {return}
    
    // Find strongest scent
    let strongestScent = null
    let maxStrength = 0
    
    for (const scent of scents) {
        if (scent.strength > maxStrength) {
            maxStrength = scent.strength
            strongestScent = scent
        }
    }
    
    if (strongestScent && maxStrength > 0.3) {
        comp.scentStrength = maxStrength
        
        // Adjust head position to track scent
        const dx = strongestScent.position.x - comp.targetPos.x
        const dy = strongestScent.position.y - comp.targetPos.y
        const angle = Math.atan2(dy, dx)
        
        comp.headYaw += (angle - comp.headYaw) * 0.1
        comp.headPitch = -0.1 // Lower head to sniff
        
        // Change behavior based on scent type
        if (strongestScent.type === 'prey') {
            comp.behavior = EnhancedWolfBehavior.Hunting
        } else if (strongestScent.type === 'territory') {
            comp.behavior = EnhancedWolfBehavior.Investigating
        }
    }
}

// Update procedural variations based on personality
function updateProceduralVariations(comp, _deltaTime) {
    const traits = comp.personalityTraits
    const seed = comp.individualSeed
    
    // Confidence affects posture
    if (traits.confidence > 0.7) {
        comp.root.height *= 1.05 // Taller posture
        comp.headPitch += 0.05 // Head slightly up
    } else if (traits.confidence < 0.3) {
        comp.root.height *= 0.95 // Lower posture
        comp.headPitch -= 0.05 // Head slightly down
    }
    
    // Playfulness affects idle behavior
    if (traits.playfulness > 0.7 && comp.behavior === EnhancedWolfBehavior.Resting) {
        if (Math.sin(comp.time + seed) > 0.8) {
            comp.behavior = EnhancedWolfBehavior.Playing
        }
    }
    
    // Curiosity affects investigation
    if (traits.curiosity > 0.7) {
        comp.headYaw += Math.sin(comp.time * 2 + seed) * 0.1 // Look around more
    }
    
    // Aggression affects threat displays
    if (traits.aggression > 0.7 && comp.behaviorIntensity > 0.6) {
        comp.furState.raised = Math.max(comp.furState.raised, traits.aggression * 0.5)
    }
}

// Update advanced secondary motion
function updateAdvancedSecondaryMotion(comp, deltaTime) {
    updateAdvancedTailPhysics(comp, deltaTime)
    updateAdvancedEarDynamics(comp, deltaTime)
    updateAdvancedBreathing(comp, deltaTime)
    updateAdvancedFurDynamics(comp, deltaTime)
}

// Advanced tail physics with realistic constraints
function updateAdvancedTailPhysics(comp, _deltaTime) {
    const segments = comp.tailSegments
    const windEffect = comp.windStrength * 0.2
    const emotionalEffect = comp.behaviorIntensity * 0.3
    
    // Base tail position based on emotional state
    let baseTailAngle = 0
    
    switch (comp.behavior) {
        case EnhancedWolfBehavior.Defending:
            baseTailAngle = 0.5 // Raised tail
            break
        case EnhancedWolfBehavior.Resting:
            baseTailAngle = -0.3 // Relaxed tail
            break
        case EnhancedWolfBehavior.Stalking:
            baseTailAngle = -0.1 // Low tail
            break
        case EnhancedWolfBehavior.Playing:
            baseTailAngle = 0.3 + Math.sin(comp.time * 3) * 0.2 // Wagging
            break
        default:
            baseTailAngle = emotionalEffect * 0.2
    }
    
    comp.tailAngle = baseTailAngle + windEffect * Math.sin(comp.time * 2)
}

// Advanced ear dynamics
function updateAdvancedEarDynamics(comp, _deltaTime) {
    const alertness = comp.alertness
    const behavior = comp.behavior
    const windEffect = comp.windStrength * 0.1
    
    // Base ear rotation
    let baseEarRotation = alertness * 0.3
    
    // Behavior-specific ear positions
    if (behavior === EnhancedWolfBehavior.Defending) {
        baseEarRotation = 0.5 // Ears forward
    } else if (behavior === EnhancedWolfBehavior.Resting) {
        baseEarRotation = -0.2 // Ears relaxed
    } else if (behavior === EnhancedWolfBehavior.Stalking) {
        baseEarRotation = 0.4 // Ears alert
    }
    
    // Add subtle ear twitching
    const earTwitch = Math.sin(comp.time * 8 + comp.individualSeed) * 0.05
    
    comp.earLeftYaw = baseEarRotation + earTwitch + windEffect
    comp.earRightYaw = baseEarRotation - earTwitch + windEffect
}

// Advanced breathing with realistic patterns
function updateAdvancedBreathing(comp, _deltaTime) {
    const breathPhase = (comp.time * comp.breathingRate) % 1
    const breathDepth = 0.02 + comp.fatigueLevel * 0.03 + comp.temperature * 0.02
    
    // Realistic breathing curve (not simple sine wave)
    let breathValue = 0
    if (breathPhase < 0.4) {
        // Inhale
        breathValue = Math.sin(breathPhase * Math.PI / 0.4) * breathDepth
    } else if (breathPhase < 0.6) {
        // Hold
        breathValue = breathDepth
    } else {
        // Exhale
        breathValue = breathDepth * (1 - Math.sin((breathPhase - 0.6) * Math.PI / 0.4))
    }
    
    comp.breathing = breathValue
    
    // Panting when hot or tired
    if (comp.temperature > 0.7 || comp.fatigueLevel > 0.8) {
        comp.jawOpen = Math.max(comp.jawOpen, breathValue * 2)
    }
}

// Advanced fur dynamics
function updateAdvancedFurDynamics(comp, _deltaTime) {
    const movement = comp.speed
    const wind = comp.windStrength
    const emotional = comp.behaviorIntensity
    
    // Fur movement from locomotion
    comp.furState.movement.x = -comp.velocityWorld.x * 0.1
    comp.furState.movement.y = -comp.velocityWorld.y * 0.1
    
    // Add wind effect
    comp.furState.movement.x += comp.windDirection.x * wind * 0.3
    comp.furState.movement.y += comp.windDirection.y * wind * 0.3
    
    // Fur raised based on emotional state
    if (comp.behavior === EnhancedWolfBehavior.Defending || 
        comp.behavior === EnhancedWolfBehavior.Attacking) {
        comp.furState.raised = Math.max(comp.furState.raised, emotional * 0.8)
    } else {
        comp.furState.raised *= 0.95 // Gradually lower
    }
    
    // Wetness affects fur behavior
    if (comp.furState.wetness > 0.3) {
        comp.furState.movement.x *= 0.5 // Wet fur moves less
        comp.furState.movement.y *= 0.5
    }
}

// Export enhanced system - createEnhancedWolfAnimComponent already exported above

// Utility functions for external use
export function getWolfBehaviorName(behavior) {
    const names = {
        [EnhancedWolfBehavior.Resting]: "Resting",
        [EnhancedWolfBehavior.Patrolling]: "Patrolling", 
        [EnhancedWolfBehavior.Hunting]: "Hunting",
        [EnhancedWolfBehavior.Stalking]: "Stalking",
        [EnhancedWolfBehavior.Chasing]: "Chasing",
        [EnhancedWolfBehavior.Attacking]: "Attacking",
        [EnhancedWolfBehavior.Defending]: "Defending",
        [EnhancedWolfBehavior.Socializing]: "Socializing",
        [EnhancedWolfBehavior.Marking]: "Territory Marking",
        [EnhancedWolfBehavior.Howling]: "Howling",
        [EnhancedWolfBehavior.Investigating]: "Investigating",
        [EnhancedWolfBehavior.Fleeing]: "Fleeing",
        [EnhancedWolfBehavior.Playing]: "Playing",
        [EnhancedWolfBehavior.Grooming]: "Grooming"
    }
    return names[behavior] || "Unknown"
}

export function createRealisticWolfPersonality(seed = 0.5) {
    // ARCHITECTURAL VIOLATION FIXED: Default seed should be deterministic
    // Generate correlated personality traits based on real wolf psychology
    // Use deterministic seed instead of random values
    const deterministicSeed = typeof seed === 'number' ? seed : 0.5
    const confidence = 0.3 + deterministicSeed * 0.4
    const playfulness = Math.max(0, Math.min(1, 0.7 - confidence * 0.3 + (deterministicSeed * 0.4 - 0.2)))
    const aggression = Math.max(0, Math.min(1, confidence * 0.6 + (deterministicSeed * 0.6 - 0.3)))
    const curiosity = 0.4 + deterministicSeed * 0.4
    
    return {
        confidence,
        playfulness,
        aggression,
        curiosity
    }
}
