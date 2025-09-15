// Environmental Interaction Animations
// Provides animations for interactive objects in the game world
import { createRngStream } from '../utils/rng.js'

export class EnvironmentalObject {
    constructor(x, y, type = 'generic') {
        this.x = x
        this.y = y
        this.type = type
        this.state = 'idle'
        this.animationTime = 0
        this.interactionRadius = 50
        this.activated = false
        
        // Create per-object RNG stream derived from global seed
        this.initializeRNG()
        
        // Animation properties
        this.scale = 1
        this.rotation = 0
        this.alpha = 1
        this.glowIntensity = 0
        this.particleEmitRate = 0
        
        // Type-specific properties
        this.setupTypeProperties()
    }
    
    setupTypeProperties() {
        switch(this.type) {
            case 'chest':
                this.width = 48
                this.height = 32
                this.openAngle = 0
                this.maxOpenAngle = Math.PI / 3
                this.hasLoot = true
                this.sparkleTimer = 0
                break
                
            case 'door':
                this.width = 64
                this.height = 96
                this.openProgress = 0
                this.isLocked = false
                this.requiresKey = false
                break
                
            case 'lever':
                this.width = 24
                this.height = 32
                this.leverAngle = -Math.PI / 4
                this.targetAngle = -Math.PI / 4
                this.isPulled = false
                break
                
            case 'crystal':
                this.width = 32
                this.height = 48
                this.floatOffset = 0
                this.rotationSpeed = 0.5
                this.isPowered = false
                this.energyPulse = 0
                break
                
            case 'portal':
                this.width = 80
                this.height = 80
                this.swirling = 0
                this.portalEnergy = 1
                this.isActive = true
                this.particles = []
                break
                
            case 'torch':
                this.width = 16
                this.height = 32
                this.flameHeight = 20
                this.flameWave = 0
                this.isLit = true
                this.lightRadius = 100
                break
                
            case 'breakable':
                this.width = 32
                this.height = 32
                this.health = 3
                this.crackLevel = 0
                this.shakeIntensity = 0
                this.isBroken = false
                break
                
            case 'platform':
                this.width = 96
                this.height = 16
                this.movePattern = 'horizontal' // horizontal, vertical, circular
                this.moveSpeed = 50
                this.moveRange = 200
                this.moveProgress = 0
                this.originalX = this.x
                this.originalY = this.y
                break
                
            case 'spring':
                this.width = 32
                this.height = 24
                this.compression = 0
                this.maxCompression = 0.5
                this.springForce = 800
                this.isCompressed = false
                break
                
            case 'collectible':
                this.width = 24
                this.height = 24
                this.bobOffset = 0
                this.spinRotation = 0
                this.collected = false
                this.collectAnimation = 0
                break
        }
    }
    
    initializeRNG() {
        // Create a unique stream name for this object based on position and type
        // This derives from the global seed without resetting it
        this.streamName = `env:${this.type}:${Math.floor(this.x)}:${Math.floor(this.y)}`
        this.rng = createRngStream(this.streamName)
    }
    
    update(deltaTime, player = null) {
        this.animationTime += deltaTime
        
        // Update type-specific animations
        switch(this.type) {
            case 'chest':
                this.updateChest(deltaTime)
                break
            case 'door':
                this.updateDoor(deltaTime, player)
                break
            case 'lever':
                this.updateLever(deltaTime)
                break
            case 'crystal':
                this.updateCrystal(deltaTime)
                break
            case 'portal':
                this.updatePortal(deltaTime, player)
                break
            case 'torch':
                this.updateTorch()
                break
            case 'breakable':
                this.updateBreakable(deltaTime)
                break
            case 'platform':
                this.updatePlatform(deltaTime)
                break
            case 'spring':
                this.updateSpring(deltaTime)
                break
            case 'collectible':
                this.updateCollectible(deltaTime, player)
                break
        }
        
        // Update glow effect for interactables
        if (player && !this.activated) {
            const dist = this.getDistanceTo(player)
            if (dist < this.interactionRadius * 1.5) {
                this.glowIntensity = Math.min(this.glowIntensity + deltaTime * 3, 1)
            } else {
                this.glowIntensity = Math.max(this.glowIntensity - deltaTime * 2, 0)
            }
        }
    }
    
    updateChest(deltaTime) {
        // Sparkle effect when closed and has loot
        if (!this.activated && this.hasLoot) {
            this.sparkleTimer += deltaTime
            if (this.sparkleTimer > 2) {
                this.sparkleTimer = 0
                // Emit sparkle particle
                this.particleEmitRate = 3
            }
        }
        
        // Opening animation
        if (this.activated && this.openAngle < this.maxOpenAngle) {
            this.openAngle += deltaTime * 2
            if (this.openAngle >= this.maxOpenAngle) {
                this.openAngle = this.maxOpenAngle
                // Burst of particles when fully opened
                this.particleEmitRate = 20
            }
        }
        
        // Bounce effect when opening
        if (this.activated && this.openAngle > 0 && this.openAngle < this.maxOpenAngle) {
            this.scale = 1 + Math.sin(this.openAngle * 10) * 0.05
        }
    }
    
    updateDoor(deltaTime, player) {
        if (this.activated && !this.isLocked) {
            // Smooth door opening
            this.openProgress = Math.min(this.openProgress + deltaTime * 1.5, 1)
            
            // Slight rotation during opening
            if (this.openProgress < 1) {
                this.rotation = Math.sin(this.openProgress * Math.PI) * 0.02
            }
        } else if (!this.activated && this.openProgress > 0) {
            // Close door when not activated
            this.openProgress = Math.max(this.openProgress - deltaTime * 1.5, 0)
        }
        
        // Shake effect if trying to open locked door
        if (this.isLocked && player) {
            const dist = this.getDistanceTo(player)
            if (dist < this.interactionRadius && player.interacting) {
                this.rotation = Math.sin(this.animationTime * 30) * 0.05
            }
        }
    }
    
    updateLever(deltaTime) {
        // Smooth lever rotation
        const angleDiff = this.targetAngle - this.leverAngle
        this.leverAngle += angleDiff * deltaTime * 8
        
        // Toggle animation
        if (this.activated && !this.isPulled) {
            this.targetAngle = Math.PI / 4
            this.isPulled = true
            this.particleEmitRate = 5
        } else if (!this.activated && this.isPulled) {
            this.targetAngle = -Math.PI / 4
            this.isPulled = false
        }
    }
    
    updateCrystal(deltaTime) {
        // Floating animation
        this.floatOffset = Math.sin(this.animationTime * 2) * 5
        
        // Rotation
        this.rotation += this.rotationSpeed * deltaTime
        
        // Energy pulse when powered
        if (this.isPowered) {
            this.energyPulse = (Math.sin(this.animationTime * 3) + 1) * 0.5
            this.glowIntensity = 0.5 + this.energyPulse * 0.5
            this.particleEmitRate = 2 + this.energyPulse * 3
        } else {
            this.energyPulse *= 0.95
            this.glowIntensity *= 0.95
        }
        
        // Scale pulse
        this.scale = 1 + this.energyPulse * 0.1
    }
    
    updatePortal(deltaTime, player) {
        if (!this.isActive) {return}
        
        // Swirling effect
        this.swirling += deltaTime * 2
        
        // Energy fluctuation
        this.portalEnergy = 0.8 + Math.sin(this.animationTime * 1.5) * 0.2
        
        // Particle generation
        this.particleEmitRate = 5 * this.portalEnergy
        
        // Pull effect when player is near
        if (player) {
            const dist = this.getDistanceTo(player)
            if (dist < this.interactionRadius * 2) {
                const pullStrength = 1 - (dist / (this.interactionRadius * 2))
                // Apply pull force to player
                const dx = this.x - player.x
                const dy = this.y - player.y
                const norm = Math.sqrt(dx * dx + dy * dy)
                if (norm > 0) {
                    player.vx += (dx / norm) * pullStrength * 100 * deltaTime
                    player.vy += (dy / norm) * pullStrength * 100 * deltaTime
                }
            }
        }
        
        // Distortion effect
        this.scale = 1 + Math.sin(this.swirling * 2) * 0.05
    }
    
    updateTorch() {
        if (this.isLit) {
            // Flame animation
            this.flameWave = Math.sin(this.animationTime * 10) * 0.3 + 
                            Math.sin(this.animationTime * 15) * 0.2
            this.flameHeight = 20 + Math.sin(this.animationTime * 5) * 3
            
            // Occasional spark
            if (this.rng.float() < 0.01) {
                this.particleEmitRate = 2
            }
            
            // Light flicker
            this.glowIntensity = 0.8 + Math.sin(this.animationTime * 8) * 0.2
        } else {
            this.flameHeight *= 0.9
            this.glowIntensity *= 0.95
        }
    }
    
    updateBreakable(deltaTime) {
        if (this.isBroken) {
            // Fade out after breaking
            this.alpha = Math.max(this.alpha - deltaTime * 2, 0)
            this.scale = Math.max(this.scale - deltaTime * 0.5, 0)
            return
        }
        
        // Shake when damaged
        if (this.shakeIntensity > 0) {
            this.shakeIntensity -= deltaTime * 10
            this.rotation = Math.sin(this.animationTime * 50) * this.shakeIntensity * 0.1
        }
        
        // Update crack appearance based on health
        this.crackLevel = Math.floor((1 - this.health / 3) * 3)
    }
    
    updatePlatform(deltaTime) {
        this.moveProgress += deltaTime * this.moveSpeed / this.moveRange
        
        switch(this.movePattern) {
            case 'horizontal':
                this.x = this.originalX + Math.sin(this.moveProgress * Math.PI * 2) * this.moveRange
                break
            case 'vertical':
                this.y = this.originalY + Math.sin(this.moveProgress * Math.PI * 2) * this.moveRange
                break
            case 'circular':
                this.x = this.originalX + Math.cos(this.moveProgress * Math.PI * 2) * this.moveRange
                this.y = this.originalY + Math.sin(this.moveProgress * Math.PI * 2) * this.moveRange
                break
        }
        
        // Slight tilt based on movement
        if (this.movePattern === 'horizontal') {
            this.rotation = Math.sin(this.moveProgress * Math.PI * 2) * 0.05
        }
    }
    
    updateSpring(deltaTime) {
        if (this.isCompressed) {
            // Decompress animation
            this.compression = Math.max(this.compression - deltaTime * 5, 0)
            if (this.compression <= 0) {
                this.isCompressed = false
                // Spring back effect
                this.scale = 1.3
                this.particleEmitRate = 10
            }
        }
        
        // Scale spring back to normal
        if (this.scale > 1) {
            this.scale = Math.max(this.scale - deltaTime * 3, 1)
        }
    }
    
    updateCollectible(deltaTime, player) {
        if (this.collected) {
            // Collection animation
            this.collectAnimation += deltaTime * 3
            this.scale = 1 + this.collectAnimation * 0.5
            this.alpha = Math.max(1 - this.collectAnimation, 0)
            this.y -= deltaTime * 100
            this.spinRotation += deltaTime * 20
            return
        }
        
        // Bobbing animation
        this.bobOffset = Math.sin(this.animationTime * 3) * 5
        
        // Spinning
        this.spinRotation += deltaTime * 2
        
        // Sparkle effect
        if (this.rng.float() < 0.02) {
            this.particleEmitRate = 1
        }
        
        // Magnetic effect when player is near
        if (player) {
            const dist = this.getDistanceTo(player)
            if (dist < this.interactionRadius * 2) {
                const pullStrength = 1 - (dist / (this.interactionRadius * 2))
                const dx = player.x - this.x
                const dy = player.y - this.y
                const norm = Math.sqrt(dx * dx + dy * dy)
                if (norm > 0) {
                    this.x += (dx / norm) * pullStrength * 200 * deltaTime
                    this.y += (dy / norm) * pullStrength * 200 * deltaTime
                }
            }
        }
    }
    
    interact(player) {
        if (this.activated) {return false}
        
        const dist = this.getDistanceTo(player)
        if (dist > this.interactionRadius) {return false}
        
        switch(this.type) {
            case 'chest':
                if (this.hasLoot) {
                    this.activated = true
                    return { type: 'chest_opened', loot: this.generateLoot() }
                }
                break
                
            case 'door':
                if (!this.isLocked || (this.requiresKey && player.hasKey)) {
                    this.activated = true
                    return { type: 'door_opened' }
                }
                break
                
            case 'lever':
                this.activated = !this.activated
                return { type: 'lever_pulled', state: this.activated }
                
            case 'collectible':
                if (!this.collected) {
                    this.collected = true
                    return { type: 'item_collected', item: this.type }
                }
                break
                
            case 'portal':
                if (this.isActive) {
                    return { type: 'portal_entered', destination: this.destination }
                }
                break
        }
        
        return false
    }
    
    damage(amount) {
        if (this.type === 'breakable' && !this.isBroken) {
            this.health -= amount
            this.shakeIntensity = 1
            
            if (this.health <= 0) {
                this.isBroken = true
                this.particleEmitRate = 15
                return { type: 'object_broken', drops: this.generateDrops() }
            }
        }
        return false
    }
    
    compress() {
        if (this.type === 'spring' && !this.isCompressed) {
            this.isCompressed = true
            this.compression = this.maxCompression
            return { type: 'spring_activated', force: this.springForce }
        }
        return false
    }
    
    getDistanceTo(target) {
        const dx = this.x - target.x
        const dy = this.y - target.y
        return Math.sqrt(dx * dx + dy * dy)
    }
    
    generateLoot() {
        // Generate random loot for chests
        return {
            gold: 50 + this.rng.int(100),
            items: this.rng.choice(['potion', 'key', 'scroll'])
        }
    }
    
    generateDrops() {
        // Generate drops for breakable objects
        return {
            gold: 5 + this.rng.int(20),
            items: (this.rng.float() > 0.7) ? ['potion'] : []
        }
    }
}

// Victory/Defeat Screen Animations
export class GameOverAnimation {
    constructor(type = 'victory') {
        this.type = type
        this.phase = 'intro' // intro, main, outro
        this.time = 0
        this.elements = []
        
        // Create per-instance RNG stream for confetti generation
        this.rng = createRngStream(`gameover:${type}:${Date.now()}`)
        
        if (type === 'victory') {
            this.setupVictoryElements()
        } else {
            this.setupDefeatElements()
        }
    }
    
    setupVictoryElements() {
        this.elements = [
            {
                type: 'text',
                content: 'VICTORY!',
                x: 0,
                y: -100,
                size: 72,
                color: '#ffd700',
                delay: 0,
                animation: 'slideIn'
            },
            {
                type: 'stars',
                count: 3,
                x: 0,
                y: 0,
                size: 60,
                delay: 0.5,
                animation: 'pop'
            },
            {
                type: 'confetti',
                count: 50,
                delay: 0.3,
                animation: 'fall'
            },
            {
                type: 'stats',
                x: 0,
                y: 100,
                delay: 1,
                animation: 'fadeIn'
            }
        ]
    }
    
    setupDefeatElements() {
        this.elements = [
            {
                type: 'text',
                content: 'DEFEATED',
                x: 0,
                y: -100,
                size: 72,
                color: '#ff4444',
                delay: 0,
                animation: 'fadeIn'
            },
            {
                type: 'vignette',
                color: '#000000',
                intensity: 0.8,
                delay: 0,
                animation: 'expand'
            },
            {
                type: 'text',
                content: 'Try Again?',
                x: 0,
                y: 50,
                size: 36,
                color: '#ffffff',
                delay: 1,
                animation: 'pulse'
            }
        ]
    }
    
    update(deltaTime) {
        this.time += deltaTime
        
        // Update each element based on its animation
        this.elements.forEach(element => {
            if (this.time < element.delay) {return}
            
            const localTime = this.time - element.delay
            
            switch(element.animation) {
                case 'slideIn':
                    element.offset = Math.max(0, 1 - localTime * 2) * 100
                    element.alpha = Math.min(1, localTime * 2)
                    break
                    
                case 'pop':
                    element.scale = Math.min(1, localTime * 5)
                    if (localTime < 0.2) {
                        element.scale = localTime * 10
                    } else {
                        element.scale = 1 + Math.sin((localTime - 0.2) * 10) * 0.1 * Math.exp(-(localTime - 0.2) * 3)
                    }
                    break
                    
                case 'fall':
                    element.particles = element.particles || this.generateConfetti(element.count)
                    element.particles.forEach(p => {
                        p.y += p.speed * deltaTime
                        p.x += Math.sin(p.y * 0.01 + p.phase) * p.sway
                        p.rotation += p.rotSpeed * deltaTime
                    })
                    break
                    
                case 'fadeIn':
                    element.alpha = Math.min(1, localTime)
                    break
                    
                case 'pulse':
                    element.scale = 1 + Math.sin(localTime * 3) * 0.1
                    element.alpha = 0.7 + Math.sin(localTime * 3) * 0.3
                    break
                    
                case 'expand':
                    element.radius = Math.min(1, localTime * 0.5)
                    break
            }
        })
    }
    
    generateConfetti(count) {
        const confetti = []
        for (let i = 0; i < count; i++) {
            confetti.push({
                x: this.rng.range(-400, 400),
                y: -50 - this.rng.range(0, 200),
                speed: 100 + this.rng.range(0, 100),
                sway: this.rng.range(0, 2),
                phase: this.rng.range(0, Math.PI * 2),
                rotation: this.rng.range(0, Math.PI * 2),
                rotSpeed: this.rng.range(-5, 5),
                color: this.rng.choice(['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']),
                size: 10 + this.rng.range(0, 10)
            })
        }
        return confetti
    }
}

export default {
    EnvironmentalObject,
    GameOverAnimation
}