// Particle System Integration for Animation Effects
// Provides seamless integration between animation system and particle effects

export class AnimationParticleIntegration {
    constructor(particleSystem) {
        this.particleSystem = particleSystem
        this.activeEffects = new Map()
        this.effectConfigs = this.createEffectConfigs()
    }

    createEffectConfigs() {
        return {
            // Attack effects
            lightAttack: {
                type: 'slash',
                particles: 15,
                color: '#00ffff',
                speed: 200,
                lifetime: 0.3,
                spread: 30,
                size: { min: 2, max: 6 }
            },
            heavyAttack: {
                type: 'chargedSlash',
                particles: 25,
                color: '#ff00ff',
                speed: 250,
                lifetime: 0.4,
                spread: 45,
                size: { min: 3, max: 8 },
                trail: true
            },
            combo: {
                type: 'burst',
                particles: 30,
                color: '#ffff00',
                speed: 300,
                lifetime: 0.5,
                spread: 360,
                size: { min: 2, max: 10 }
            },

            // Movement effects
            roll: {
                type: 'dustCloud',
                particles: 20,
                color: '#8B7355',
                speed: 100,
                lifetime: 0.6,
                spread: 180,
                size: { min: 4, max: 8 },
                gravity: 0.5
            },
            dash: {
                type: 'speedLines',
                particles: 10,
                color: '#ffffff',
                speed: 400,
                lifetime: 0.2,
                spread: 5,
                size: { min: 1, max: 3 },
                stretch: true
            },
            jump: {
                type: 'dustPuff',
                particles: 12,
                color: '#9B8A6F',
                speed: 80,
                lifetime: 0.4,
                spread: 90,
                size: { min: 3, max: 6 },
                gravity: 0.3
            },
            landing: {
                type: 'dustRing',
                particles: 25,
                color: '#8B7355',
                speed: 150,
                lifetime: 0.5,
                spread: 360,
                size: { min: 2, max: 5 },
                gravity: 0.2,
                ring: true
            },

            // Defense effects
            block: {
                type: 'shield',
                particles: 8,
                color: '#4444ff',
                speed: 50,
                lifetime: 0.3,
                spread: 45,
                size: { min: 2, max: 4 },
                orbit: true
            },
            parry: {
                type: 'sparkBurst',
                particles: 20,
                color: '#ffff44',
                speed: 200,
                lifetime: 0.4,
                spread: 360,
                size: { min: 1, max: 3 },
                sparkle: true
            },
            perfectBlock: {
                type: 'shockwave',
                particles: 30,
                color: '#00ffff',
                speed: 250,
                lifetime: 0.6,
                spread: 360,
                size: { min: 2, max: 8 },
                wave: true
            },

            // Damage effects
            hurt: {
                type: 'blood',
                particles: 15,
                color: '#ff0000',
                speed: 150,
                lifetime: 0.4,
                spread: 120,
                size: { min: 1, max: 4 },
                gravity: 1.0,
                splatter: true
            },
            critical: {
                type: 'criticalHit',
                particles: 25,
                color: '#ff00ff',
                speed: 200,
                lifetime: 0.5,
                spread: 360,
                size: { min: 2, max: 6 },
                burst: true
            },
            death: {
                type: 'deathExplosion',
                particles: 40,
                color: '#ff4444',
                speed: 250,
                lifetime: 0.8,
                spread: 360,
                size: { min: 2, max: 10 },
                gravity: 0.5,
                fade: true
            },

            // Environmental effects
            footstep: {
                type: 'footprint',
                particles: 5,
                color: '#6B5D54',
                speed: 30,
                lifetime: 0.2,
                spread: 30,
                size: { min: 1, max: 2 },
                gravity: 0.2
            },
            waterSplash: {
                type: 'splash',
                particles: 20,
                color: '#4A90E2',
                speed: 120,
                lifetime: 0.5,
                spread: 90,
                size: { min: 2, max: 5 },
                gravity: 0.8,
                transparent: true
            },
            mudSplash: {
                type: 'mudSplatter',
                particles: 15,
                color: '#4A3C28',
                speed: 80,
                lifetime: 0.6,
                spread: 60,
                size: { min: 2, max: 4 },
                gravity: 1.0,
                sticky: true
            }
        }
    }

    // Trigger particle effect based on animation event
    triggerEffect(effectName, position, direction = { x: 1, y: 0 }, options = {}) {
        const config = this.effectConfigs[effectName]
        if (!config || !this.particleSystem) {return null}

        const effectId = `${effectName}_${Date.now()}`
        const effect = this.createParticleEffect(config, position, direction, options)
        
        this.activeEffects.set(effectId, effect)
        
        // Auto-cleanup after lifetime
        setTimeout(() => {
            this.activeEffects.delete(effectId)
        }, (config.lifetime || 1) * 1000 + 500)

        return effectId
    }

    createParticleEffect(config, position, direction, options) {
        const particles = []
        const count = options.particleCount || config.particles

        for (let i = 0; i < count; i++) {
            const angle = this.calculateParticleAngle(i, count, config, direction)
            const speed = this.calculateParticleSpeed(config, options)
            const size = this.randomRange(config.size.min, config.size.max)
            
            const particle = {
                x: position.x + (options.offsetX || 0),
                y: position.y + (options.offsetY || 0),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: options.color || config.color,
                lifetime: config.lifetime,
                age: 0,
                gravity: config.gravity || 0,
                type: config.type,
                custom: {
                    stretch: config.stretch,
                    sparkle: config.sparkle,
                    wave: config.wave,
                    orbit: config.orbit,
                    ring: config.ring,
                    splatter: config.splatter,
                    fade: config.fade,
                    transparent: config.transparent,
                    sticky: config.sticky
                }
            }

            particles.push(particle)
        }

        // Add to particle system if available
        if (this.particleSystem && typeof this.particleSystem.addParticles === 'function') {
            this.particleSystem.addParticles(particles)
        }

        return {
            particles,
            config,
            position: { ...position },
            direction: { ...direction },
            startTime: Date.now()
        }
    }

    calculateParticleAngle(index, total, config, direction) {
        const baseAngle = Math.atan2(direction.y, direction.x)
        
        if (config.ring) {
            // Distribute evenly in a ring
            return (index / total) * Math.PI * 2
        } else if (config.spread >= 360) {
            // Full circle burst
            return (index / total) * Math.PI * 2
        } else {
            // Cone spread
            const spreadRad = (config.spread * Math.PI) / 180
            const offset = (Math.random() - 0.5) * spreadRad
            return baseAngle + offset
        }
    }

    calculateParticleSpeed(config, options) {
        const baseSpeed = options.speed || config.speed
        const variation = options.speedVariation || 0.2
        return baseSpeed * (1 + (Math.random() - 0.5) * variation)
    }

    // Update active particle effects
    update(deltaTime) {
        for (const [id, effect] of this.activeEffects) {
            this.updateEffect(effect, deltaTime)
        }
    }

    updateEffect(effect, deltaTime) {
        if (!effect.particles) {return}

        effect.particles.forEach(particle => {
            // Update age
            particle.age += deltaTime
            
            // Update position
            particle.x += particle.vx * deltaTime
            particle.y += particle.vy * deltaTime
            
            // Apply gravity
            if (particle.gravity) {
                particle.vy += particle.gravity * 500 * deltaTime
            }
            
            // Apply custom behaviors
            if (particle.custom) {
                this.applyCustomBehaviors(particle, deltaTime, effect)
            }
            
            // Update alpha for fading
            if (particle.custom?.fade) {
                particle.alpha = 1 - (particle.age / particle.lifetime)
            }
        })

        // Remove dead particles
        effect.particles = effect.particles.filter(p => p.age < p.lifetime)
    }

    applyCustomBehaviors(particle, deltaTime, effect) {
        const custom = particle.custom
        
        // Orbit behavior
        if (custom.orbit) {
            const angle = particle.age * 5
            const radius = 20
            particle.x = effect.position.x + Math.cos(angle) * radius
            particle.y = effect.position.y + Math.sin(angle) * radius
        }
        
        // Wave behavior
        if (custom.wave) {
            particle.y += Math.sin(particle.age * 10) * 50 * deltaTime
        }
        
        // Sparkle behavior
        if (custom.sparkle) {
            particle.size *= (1 + Math.sin(particle.age * 20) * 0.5)
        }
        
        // Sticky behavior (slow down over time)
        if (custom.sticky) {
            particle.vx *= 0.95
            particle.vy *= 0.95
        }
    }

    // Link animation events to particle effects
    linkAnimationEvents(animator, characterType = 'player') {
        if (!animator) {return}

        const eventMap = this.getEventMapForCharacter(characterType)
        
        // Subscribe to animation events
        for (const [eventName, effectName] of Object.entries(eventMap)) {
            this.subscribeToAnimationEvent(animator, eventName, effectName)
        }
    }

    getEventMapForCharacter(characterType) {
        const maps = {
            player: {
                'attack.start': 'lightAttack',
                'attack.heavy.start': 'heavyAttack',
                'attack.combo': 'combo',
                'roll.start': 'roll',
                'dash.start': 'dash',
                'jump.start': 'jump',
                'land': 'landing',
                'block.start': 'block',
                'parry.success': 'parry',
                'block.perfect': 'perfectBlock',
                'damage.taken': 'hurt',
                'damage.critical': 'critical',
                'death': 'death',
                'step.left': 'footstep',
                'step.right': 'footstep'
            },
            wolf: {
                'lunge.start': 'lightAttack',
                'bite': 'heavyAttack',
                'howl': 'combo',
                'dodge': 'roll',
                'pounce': 'jump',
                'land': 'landing',
                'damage.taken': 'hurt',
                'death': 'death',
                'step': 'footstep'
            },
            boss: {
                'attack.slam': 'heavyAttack',
                'attack.sweep': 'lightAttack',
                'attack.special': 'combo',
                'charge.start': 'dash',
                'jump.attack': 'jump',
                'land.heavy': 'landing',
                'shield.activate': 'block',
                'damage.taken': 'hurt',
                'damage.critical': 'critical',
                'death': 'death'
            }
        }
        
        return maps[characterType] || maps.player
    }

    subscribeToAnimationEvent(animator, eventName, effectName) {
        // This assumes the animator has an event system
        // Check if animator has the on method before subscribing
        if (animator && typeof animator.on === 'function') {
            animator.on(eventName, (data) => {
                this.triggerEffect(
                    effectName,
                    data.position || { x: 0, y: 0 },
                    data.direction || { x: 1, y: 0 },
                    data.options || {}
                )
            })
        } else {
            console.warn(`Animator does not have event system (on method) for event: ${eventName}`)
        }
    }

    // Render debug information
    renderDebug(ctx) {
        if (this.activeEffects.size === 0) {return}

        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2

        let y = 10
        ctx.strokeText(`Active Effects: ${this.activeEffects.size}`, 10, y)
        ctx.fillText(`Active Effects: ${this.activeEffects.size}`, 10, y)
        
        y += 15
        for (const [id, effect] of this.activeEffects) {
            const particleCount = effect.particles ? effect.particles.length : 0
            ctx.strokeText(`  ${id.split('_')[0]}: ${particleCount} particles`, 10, y)
            ctx.fillText(`  ${id.split('_')[0]}: ${particleCount} particles`, 10, y)
            y += 12
        }

        ctx.restore()
    }

    // Utility functions
    randomRange(min, max) {
        return min + Math.random() * (max - min)
    }

    clear() {
        this.activeEffects.clear()
    }
}

// Particle effect presets for quick access
export const ParticleEffectPresets = {
    // Combat presets
    createSlashEffect(particleSystem, position, direction) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('lightAttack', position, direction)
    },

    createChargedSlashEffect(particleSystem, position, direction, chargeLevel = 1) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('heavyAttack', position, direction, {
            particleCount: Math.floor(25 * chargeLevel),
            speed: 250 * chargeLevel
        })
    },

    createComboFinisherEffect(particleSystem, position) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('combo', position, { x: 0, y: -1 })
    },

    // Movement presets
    createDashEffect(particleSystem, position, direction) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('dash', position, direction)
    },

    createJumpEffect(particleSystem, position) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('jump', position, { x: 0, y: 1 })
    },

    createLandingEffect(particleSystem, position, force = 1) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('landing', position, { x: 0, y: 1 }, {
            particleCount: Math.floor(25 * force),
            speed: 150 * force
        })
    },

    // Defense presets
    createBlockEffect(particleSystem, position, direction) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('block', position, direction)
    },

    createParryEffect(particleSystem, position) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('parry', position, { x: 0, y: 0 })
    },

    // Damage presets
    createHurtEffect(particleSystem, position, damageDirection) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('hurt', position, damageDirection)
    },

    createDeathEffect(particleSystem, position) {
        const integration = new AnimationParticleIntegration(particleSystem)
        return integration.triggerEffect('death', position, { x: 0, y: -1 })
    }
}

export default AnimationParticleIntegration