// Enhanced Wolf AI System with Vocalization, Alpha Wolf, and Scent Tracking
// Implements high-priority features from WOLF_AI_ENHANCEMENTS.md

export class WolfVocalizationSystem {
    constructor(soundSystem) {
        this.soundSystem = soundSystem
        
        // Vocalization types and their purposes
        this.vocalizations = {
            // Howls - Long-range communication
            HOWL_RALLY: {
                type: 'howl',
                sound: 'wolf_howl_rally',
                range: 800,
                duration: 3000,
                purpose: 'Rally pack members to location',
                cooldown: 10000
            },
            HOWL_HUNT: {
                type: 'howl',
                sound: 'wolf_howl_hunt',
                range: 1000,
                duration: 2500,
                purpose: 'Signal start of coordinated hunt',
                cooldown: 15000
            },
            HOWL_VICTORY: {
                type: 'howl',
                sound: 'wolf_howl_victory',
                range: 600,
                duration: 2000,
                purpose: 'Celebrate successful kill',
                cooldown: 5000
            },
            HOWL_MOURNING: {
                type: 'howl',
                sound: 'wolf_howl_mourning',
                range: 700,
                duration: 4000,
                purpose: 'Mourn fallen pack member',
                cooldown: 20000
            },
            
            // Growls - Warning and intimidation
            GROWL_WARNING: {
                type: 'growl',
                sound: 'wolf_growl_warning',
                range: 200,
                duration: 1500,
                purpose: 'Warn target to back off',
                cooldown: 3000
            },
            GROWL_AGGRESSIVE: {
                type: 'growl',
                sound: 'wolf_growl_aggressive',
                range: 150,
                duration: 1000,
                purpose: 'Pre-attack intimidation',
                cooldown: 2000
            },
            GROWL_DEFENSIVE: {
                type: 'growl',
                sound: 'wolf_growl_defensive',
                range: 100,
                duration: 1200,
                purpose: 'Defensive stance warning',
                cooldown: 2500
            },
            
            // Barks - Short-range communication
            BARK_ALERT: {
                type: 'bark',
                sound: 'wolf_bark_alert',
                range: 300,
                duration: 500,
                purpose: 'Alert pack to danger',
                cooldown: 1000
            },
            BARK_COMMAND: {
                type: 'bark',
                sound: 'wolf_bark_command',
                range: 250,
                duration: 600,
                purpose: 'Alpha giving orders',
                cooldown: 1500
            },
            BARK_ACKNOWLEDGE: {
                type: 'bark',
                sound: 'wolf_bark_acknowledge',
                range: 200,
                duration: 400,
                purpose: 'Acknowledge alpha command',
                cooldown: 1000
            },
            
            // Whines - Submission and distress
            WHINE_PAIN: {
                type: 'whine',
                sound: 'wolf_whine_pain',
                range: 150,
                duration: 800,
                purpose: 'Express pain or injury',
                cooldown: 500
            },
            WHINE_SUBMISSION: {
                type: 'whine',
                sound: 'wolf_whine_submission',
                range: 100,
                duration: 1000,
                purpose: 'Submit to alpha',
                cooldown: 2000
            }
        }
        
        // Track last vocalization times for cooldowns
        this.lastVocalizationTime = new Map()
        
        // Active vocalizations (for visual indicators)
        this.activeVocalizations = []
        
        // Pack communication network
        this.communicationNetwork = new Map()
    }
    
    // Emit a vocalization from a wolf
    vocalize(wolf, vocalizationType, targetPosition = null) {
        const vocalization = this.vocalizations[vocalizationType]
        if (!vocalization) {return false}
        
        // Check cooldown
        const lastTime = this.lastVocalizationTime.get(`${wolf.id}_${vocalizationType}`) || 0
        if (Date.now() - lastTime < vocalization.cooldown) {
            return false
        }
        
        // Play sound
        if (this.soundSystem) {
            this.soundSystem.playAtPosition(
                vocalization.sound,
                wolf.position.x,
                wolf.position.y,
                {
                    volume: this.getVolumeByDistance(vocalization.range),
                    pitch: wolf.isAlpha ? 0.8 : 1.0 // Alpha has deeper voice
                }
            )
        }
        
        // Record vocalization
        this.lastVocalizationTime.set(`${wolf.id}_${vocalizationType}`, Date.now())
        
        // Add to active vocalizations for visual feedback
        this.activeVocalizations.push({
            wolfId: wolf.id,
            type: vocalizationType,
            position: { ...wolf.position },
            startTime: Date.now(),
            duration: vocalization.duration,
            range: vocalization.range,
            purpose: vocalization.purpose
        })
        
        // Broadcast to nearby wolves
        this.broadcastVocalization(wolf, vocalizationType, targetPosition)
        
        return true
    }
    
    // Broadcast vocalization to pack members in range
    broadcastVocalization(sender, vocalizationType, targetPosition) {
        const vocalization = this.vocalizations[vocalizationType]
        const message = {
            senderId: sender.id,
            type: vocalizationType,
            position: sender.position,
            targetPosition,
            purpose: vocalization.purpose,
            timestamp: Date.now()
        }
        
        // Store in communication network
        if (!this.communicationNetwork.has(sender.packId)) {
            this.communicationNetwork.set(sender.packId, [])
        }
        this.communicationNetwork.get(sender.packId).push(message)
        
        // Clean old messages
        this.cleanOldMessages(sender.packId)
    }
    
    // Get messages for a wolf
    getMessages(wolf, maxRange = Infinity) {
        const messages = this.communicationNetwork.get(wolf.packId) || []
        return messages.filter(msg => {
            const distance = this.getDistance(wolf.position, msg.position)
            const vocalization = this.vocalizations[msg.type]
            return distance <= Math.min(vocalization.range, maxRange) &&
                   Date.now() - msg.timestamp < 5000 // Messages expire after 5 seconds
        })
    }
    
    // Clean old messages from network
    cleanOldMessages(packId) {
        const messages = this.communicationNetwork.get(packId) || []
        const cutoffTime = Date.now() - 10000 // Remove messages older than 10 seconds
        this.communicationNetwork.set(
            packId,
            messages.filter(msg => msg.timestamp > cutoffTime)
        )
    }
    
    // Update active vocalizations (remove expired ones)
    update() {
        const now = Date.now()
        this.activeVocalizations = this.activeVocalizations.filter(
            v => now - v.startTime < (v.duration || 1000)
        )
    }
    
    // Get volume based on distance
    getVolumeByDistance(range) {
        // This would be calculated based on player distance in actual implementation
        return Math.max(0.1, Math.min(1.0, range / 1000))
    }
    
    // Calculate distance between two positions
    getDistance(pos1, pos2) {
        if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos1.y !== 'number' || 
            typeof pos2.x !== 'number' || typeof pos2.y !== 'number') {
            return Infinity // Return large distance if positions are invalid
        }
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        return Math.sqrt(dx * dx + dy * dy)
    }
    
    // Render vocalization indicators
    render(ctx, camera) {
        this.activeVocalizations.forEach(vocal => {
            const progress = (Date.now() - vocal.startTime) / Math.max(1, vocal.duration || 1000)
            const opacity = 1 - progress
            
            // Draw expanding rings for vocalizations
            ctx.save()
            ctx.globalAlpha = opacity * 0.5
            ctx.strokeStyle = this.getVocalizationColor(vocal.type)
            ctx.lineWidth = 2
            
            const radius = vocal.range * progress
            ctx.beginPath()
            ctx.arc(
                vocal.position.x - camera.x,
                vocal.position.y - camera.y,
                radius,
                0,
                Math.PI * 2
            )
            ctx.stroke()
            
            // Draw vocalization icon
            if (progress < 0.5) {
                ctx.globalAlpha = opacity
                ctx.font = '20px Arial'
                ctx.textAlign = 'center'
                ctx.fillStyle = this.getVocalizationColor(vocal.type)
                const icon = this.getVocalizationIcon(vocal.type)
                ctx.fillText(
                    icon,
                    vocal.position.x - camera.x,
                    vocal.position.y - camera.y - 30
                )
            }
            
            ctx.restore()
        })
    }
    
    getVocalizationColor(type) {
        const vocalization = this.vocalizations[type]
        if (!vocalization) {return '#ffffff'}
        
        switch(vocalization.type) {
            case 'howl': return '#4a90e2'
            case 'growl': return '#ff6b6b'
            case 'bark': return '#ffd93d'
            case 'whine': return '#95e1d3'
            default: return '#ffffff'
        }
    }
    
    getVocalizationIcon(type) {
        const vocalization = this.vocalizations[type]
        if (!vocalization) {return '🔊'}
        
        switch(vocalization.type) {
            case 'howl': return '🌙'
            case 'growl': return '😤'
            case 'bark': return '📢'
            case 'whine': return '😢'
            default: return '🔊'
        }
    }
}

export class AlphaWolf {
    constructor(baseWolf) {
        // Inherit base wolf properties
        Object.assign(this, baseWolf)
        
        // Alpha-specific properties
        this.isAlpha = true
        this.size = baseWolf.size * 1.3 // 30% larger
        this.health = baseWolf.health * 1.5 // 50% more health
        this.maxHealth = baseWolf.maxHealth * 1.5
        this.damage = baseWolf.damage * 1.4 // 40% more damage
        this.speed = baseWolf.speed * 0.9 // Slightly slower due to size
        this.detectionRange = baseWolf.detectionRange * 1.5 // Better senses
        
        // Alpha abilities
        this.abilities = {
            PACK_RALLY: {
                name: 'Pack Rally',
                cooldown: 30000,
                lastUsed: 0,
                effect: 'Summons all pack members to alpha location'
            },
            INTIMIDATING_PRESENCE: {
                name: 'Intimidating Presence',
                cooldown: 20000,
                lastUsed: 0,
                effect: 'Reduces player damage by 25% for 10 seconds'
            },
            COORDINATED_ASSAULT: {
                name: 'Coordinated Assault',
                cooldown: 25000,
                lastUsed: 0,
                effect: 'All pack members attack simultaneously'
            },
            ALPHA_HOWL: {
                name: 'Alpha Howl',
                cooldown: 40000,
                lastUsed: 0,
                effect: 'Buffs all pack members with 20% speed and damage for 15 seconds'
            },
            PACK_FRENZY: {
                name: 'Pack Frenzy',
                cooldown: 60000,
                lastUsed: 0,
                effect: 'Pack enters frenzy mode - 50% attack speed for 10 seconds'
            }
        }
        
        // Pack management
        this.packMembers = []
        this.packFormation = 'hunting' // hunting, defensive, surrounding
        this.packMorale = 1.0 // Affects pack performance
        
        // Command queue for pack coordination
        this.commandQueue = []
        
        // Alpha-specific AI states
        this.alphaState = 'commanding' // commanding, fighting, retreating
        
        // Visual indicators
        this.glowColor = '#ffd700' // Golden glow for alpha
        this.crownOffset = { x: 0, y: -10 } // Visual crown position
    }
    
    // Issue command to pack
    issueCommand(command, target = null) {
        const now = Date.now()
        
        switch(command) {
            case 'RALLY':
                if (now - this.abilities.PACK_RALLY.lastUsed > this.abilities.PACK_RALLY.cooldown) {
                    this.commandQueue.push({
                        type: 'RALLY',
                        position: { ...this.position },
                        timestamp: now,
                        priority: 10
                    })
                    this.abilities.PACK_RALLY.lastUsed = now
                    return true
                }
                break
                
            case 'ATTACK':
                this.commandQueue.push({
                    type: 'ATTACK',
                    target: target,
                    timestamp: now,
                    priority: 8
                })
                return true
                
            case 'DEFEND':
                this.commandQueue.push({
                    type: 'DEFEND',
                    position: { ...this.position },
                    timestamp: now,
                    priority: 7
                })
                return true
                
            case 'SURROUND':
                this.commandQueue.push({
                    type: 'SURROUND',
                    target: target,
                    timestamp: now,
                    priority: 9
                })
                return true
                
            case 'RETREAT':
                this.commandQueue.push({
                    type: 'RETREAT',
                    direction: this.getRetreatDirection(),
                    timestamp: now,
                    priority: 10
                })
                return true
        }
        
        return false
    }
    
    // Use alpha ability
    useAbility(abilityName, target = null) {
        const ability = this.abilities[abilityName]
        if (!ability) {return false}
        
        const now = Date.now()
        if (now - ability.lastUsed < ability.cooldown) {
            return false
        }
        
        ability.lastUsed = now
        
        // Apply ability effects
        switch(abilityName) {
            case 'PACK_RALLY':
                this.rallyPack()
                break
            case 'INTIMIDATING_PRESENCE':
                this.intimidateTarget(target)
                break
            case 'COORDINATED_ASSAULT':
                this.coordinateAssault(target)
                break
            case 'ALPHA_HOWL':
                this.alphaHowl()
                break
            case 'PACK_FRENZY':
                this.activateFrenzy()
                break
        }
        
        return true
    }
    
    // Rally all pack members to alpha
    rallyPack() {
        this.packMembers.forEach(member => {
            member.setDestination(this.position)
            member.setState('rallying')
            member.speed *= 1.3 // Temporary speed boost to reach alpha
        })
    }
    
    // Intimidate target (usually player)
    intimidateTarget(target) {
        if (target) {
            target.applyDebuff('intimidated', {
                duration: 10000,
                damageReduction: 0.25,
                speedReduction: 0.1
            })
        }
    }
    
    // Coordinate pack assault
    coordinateAssault(target) {
        if (!target) {return}
        
        // Calculate attack positions around target
        const attackPositions = this.calculateSurroundPositions(target.position, this.packMembers.length)
        
        this.packMembers.forEach((member, index) => {
            member.setAttackPosition(attackPositions[index])
            member.setState('coordinated_attack')
            member.attackTiming = index * 200 // Stagger attacks
        })
    }
    
    // Alpha howl buff
    alphaHowl() {
        const buffDuration = 15000
        const speedBuff = 1.2
        const damageBuff = 1.2
        
        // Buff self
        this.applyBuff('alpha_howl', {
            duration: buffDuration,
            speedMultiplier: speedBuff,
            damageMultiplier: damageBuff
        })
        
        // Buff pack
        this.packMembers.forEach(member => {
            member.applyBuff('alpha_howl', {
                duration: buffDuration,
                speedMultiplier: speedBuff,
                damageMultiplier: damageBuff
            })
            member.morale = Math.min(1.5, member.morale + 0.3)
        })
    }
    
    // Activate pack frenzy
    activateFrenzy() {
        const frenzyDuration = 10000
        
        this.packMembers.forEach(member => {
            member.applyBuff('frenzy', {
                duration: frenzyDuration,
                attackSpeedMultiplier: 1.5,
                movementSpeedMultiplier: 1.3,
                damageMultiplier: 1.1
            })
            member.setState('frenzied')
        })
    }
    
    // Calculate positions for surrounding target
    calculateSurroundPositions(targetPos, count) {
        const positions = []
        const radius = 100
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2
            positions.push({
                x: targetPos.x + Math.cos(angle) * radius,
                y: targetPos.y + Math.sin(angle) * radius
            })
        }
        
        return positions
    }
    
    // Get retreat direction based on pack status
    getRetreatDirection() {
        // Calculate center of healthy pack members
        let centerX = 0; let centerY = 0
        let healthyCount = 0
        
        this.packMembers.forEach(member => {
            if (member.health > member.maxHealth * 0.3) {
                centerX += member.position.x
                centerY += member.position.y
                healthyCount++
            }
        })
        
        if (healthyCount > 0) {
            centerX /= healthyCount
            centerY /= healthyCount
            
            // Retreat towards pack center
            const dx = centerX - this.position.x
            const dy = centerY - this.position.y
            const length = Math.sqrt(dx * dx + dy * dy)
            
            return {
                x: dx / length,
                y: dy / length
            }
        }
        
        // Default retreat away from threat
        return { x: -1, y: 0 }
    }
    
    // Update alpha behavior
    update(deltaTime, player, pack) {
        // Update pack members reference
        this.packMembers = pack.filter(w => w.id !== this.id && w.health > 0)
        
        // Update pack morale based on pack status
        this.updatePackMorale()
        
        // Process command queue
        this.processCommands()
        
        // Alpha decision making
        this.makeStrategicDecisions(player)
        
        // Check ability usage
        this.checkAbilityUsage(player)
    }
    
    // Update pack morale
    updatePackMorale() {
        const totalMembers = this.packMembers.length + 1
        const healthyMembers = this.packMembers.filter(m => m.health > m.maxHealth * 0.5).length + 1
        const healthRatio = healthyMembers / totalMembers
        
        // Morale affected by pack health and size
        this.packMorale = healthRatio * (totalMembers / 5) // Assumes ideal pack size of 5
        this.packMorale = Math.max(0.3, Math.min(1.5, this.packMorale))
    }
    
    // Process command queue
    processCommands() {
        if (this.commandQueue.length === 0) {return}
        
        // Sort by priority
        this.commandQueue.sort((a, b) => b.priority - a.priority)
        
        // Execute highest priority command
        const command = this.commandQueue.shift()
        
        // Broadcast command to pack
        this.packMembers.forEach(member => {
            member.receiveCommand(command)
        })
    }
    
    // Make strategic decisions
    makeStrategicDecisions(player) {
        const distanceToPlayer = this.getDistanceTo(player)
        const packStrength = this.calculatePackStrength()
        const playerThreat = this.assessPlayerThreat(player)
        
        // Decide strategy based on situation
        if (packStrength < 0.3) {
            // Pack is weak, consider retreat
            this.alphaState = 'retreating'
            this.issueCommand('RETREAT')
        } else if (distanceToPlayer < 200 && playerThreat > 0.7) {
            // High threat player nearby
            this.alphaState = 'fighting'
            this.issueCommand('SURROUND', player)
        } else if (distanceToPlayer < 400) {
            // Player in medium range
            this.alphaState = 'commanding'
            this.issueCommand('ATTACK', player)
        } else {
            // Default hunting behavior
            this.alphaState = 'commanding'
            this.packFormation = 'hunting'
        }
    }
    
    // Check and use abilities
    checkAbilityUsage(player) {
        const distanceToPlayer = this.getDistanceTo(player)
        
        // Use abilities based on situation
        if (distanceToPlayer < 150 && this.health < this.maxHealth * 0.5) {
            // Low health, close to player - use intimidation
            this.useAbility('INTIMIDATING_PRESENCE', player)
        } else if (this.packMembers.length >= 3 && distanceToPlayer < 300) {
            // Good pack size, player in range - coordinate assault
            this.useAbility('COORDINATED_ASSAULT', player)
        } else if (this.packMorale < 0.6) {
            // Low morale - use alpha howl to boost pack
            this.useAbility('ALPHA_HOWL')
        } else if (this.packMembers.some(m => m.health < m.maxHealth * 0.3)) {
            // Pack member in danger - rally pack
            this.useAbility('PACK_RALLY')
        }
    }
    
    // Calculate pack strength
    calculatePackStrength() {
        let strength = this.health / this.maxHealth
        
        this.packMembers.forEach(member => {
            strength += (member.health / member.maxHealth) * 0.8 // Pack members contribute less
        })
        
        return strength / (this.packMembers.length + 1)
    }
    
    // Assess player threat level
    assessPlayerThreat(player) {
        // Factors: player health, weapons, recent kills, etc.
        let threat = player.health || 0.5
        
        // Increase threat if player has killed pack members recently
        if (player.recentKills > 0) {
            threat += player.recentKills * 0.1
        }
        
        // Decrease threat if player is low on stamina
        if (player.stamina < 0.3) {
            threat *= 0.7
        }
        
        return Math.min(1, threat)
    }
    
    // Get distance to target
    getDistanceTo(target) {
        const dx = this.position.x - target.position.x
        const dy = this.position.y - target.position.y
        return Math.sqrt(dx * dx + dy * dy)
    }
    
    // Apply buff to alpha
    applyBuff(buffName, buffData) {
        // Implementation would integrate with game's buff system
        this.buffs = this.buffs || {}
        this.buffs[buffName] = {
            ...buffData,
            startTime: Date.now()
        }
    }
    
    // Render alpha with special effects
    render(ctx, camera) {
        // Render glow effect
        ctx.save()
        ctx.shadowColor = this.glowColor
        ctx.shadowBlur = 20
        ctx.globalAlpha = 0.7
        
        // Draw larger wolf sprite
        ctx.fillStyle = '#2c2c2c'
        ctx.fillRect(
            this.position.x - camera.x - this.size / 2,
            this.position.y - camera.y - this.size / 2,
            this.size,
            this.size
        )
        
        // Draw alpha crown/marking
        ctx.fillStyle = this.glowColor
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(
            '👑',
            this.position.x - camera.x,
            this.position.y - camera.y + this.crownOffset.y
        )
        
        // Draw health bar
        const barWidth = this.size
        const barHeight = 6
        const barY = this.position.y - camera.y - this.size / 2 - 15
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(
            this.position.x - camera.x - barWidth / 2,
            barY,
            barWidth,
            barHeight
        )
        
        // Health
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(
            this.position.x - camera.x - barWidth / 2,
            barY,
            barWidth * (this.health / this.maxHealth),
            barHeight
        )
        
        // Border
        ctx.strokeStyle = this.glowColor
        ctx.lineWidth = 2
        ctx.strokeRect(
            this.position.x - camera.x - barWidth / 2,
            barY,
            barWidth,
            barHeight
        )
        
        ctx.restore()
    }
}

export class ScentTrackingSystem {
    constructor() {
        // Scent trail data structure
        this.scentTrails = new Map() // entityId -> trail points
        this.maxTrailLength = 100 // Maximum trail points per entity
        this.scentDecayTime = 30000 // Scent lasts 30 seconds
        this.scentDropInterval = 100 // Drop scent every 100ms
        
        // Scent types and their properties
        this.scentTypes = {
            PLAYER: {
                color: '#4a90e2',
                strength: 1.0,
                decayRate: 0.03
            },
            WOLF: {
                color: '#8b4513',
                strength: 0.7,
                decayRate: 0.02
            },
            BLOOD: {
                color: '#ff0000',
                strength: 1.5,
                decayRate: 0.01
            },
            FEAR: {
                color: '#9b59b6',
                strength: 0.8,
                decayRate: 0.04
            },
            TERRITORY: {
                color: '#f39c12',
                strength: 1.2,
                decayRate: 0.005
            }
        }
        
        // Territory markers
        this.territoryMarkers = []
        
        // Last scent drop times
        this.lastScentDrop = new Map()
        
        // Wind system affects scent drift
        this.wind = {
            direction: { x: 0.5, y: 0.2 },
            strength: 0.3,
            variability: 0.1
        }
    }
    
    // Add scent point to trail
    addScentPoint(entityId, position, scentType = 'PLAYER', intensity = 1.0) {
        const now = Date.now()
        
        // Check if enough time has passed since last drop
        const lastDrop = this.lastScentDrop.get(entityId) || 0
        if (now - lastDrop < this.scentDropInterval) {
            return
        }
        
        // Get or create trail for entity
        if (!this.scentTrails.has(entityId)) {
            this.scentTrails.set(entityId, [])
        }
        
        const trail = this.scentTrails.get(entityId)
        
        // Add new scent point
        trail.push({
            position: { ...position },
            type: scentType,
            intensity,
            timestamp: now,
            windDrift: { x: 0, y: 0 }
        })
        
        // Limit trail length
        if (trail.length > this.maxTrailLength) {
            trail.shift()
        }
        
        this.lastScentDrop.set(entityId, now)
    }
    
    // Mark territory at position
    markTerritory(wolfId, position, packId) {
        this.territoryMarkers.push({
            wolfId,
            packId,
            position: { ...position },
            timestamp: Date.now(),
            strength: 1.0,
            radius: 150
        })
        
        // Add territory scent
        this.addScentPoint(wolfId, position, 'TERRITORY', 1.5)
    }
    
    // Get scent intensity at position for a wolf
    getScentIntensity(position, scentType = null) {
        let totalIntensity = 0
        const now = Date.now()
        
        // Check all scent trails
        this.scentTrails.forEach((trail) => {
            trail.forEach(point => {
                // Filter by scent type if specified
                if (scentType && point.type !== scentType) {return}
                
                // Calculate age and decay
                const age = now - point.timestamp
                if (age > this.scentDecayTime) {return}
                
                const decay = 1 - (age / this.scentDecayTime)
                const scentConfig = this.scentTypes[point.type]
                
                // Calculate distance with wind drift
                const driftedPos = {
                    x: point.position.x + point.windDrift.x,
                    y: point.position.y + point.windDrift.y
                }
                
                const distance = this.getDistance(position, driftedPos)
                const maxRange = 100 // Scent detection range
                
                if (distance < maxRange) {
                    const distanceFactor = 1 - (distance / maxRange)
                    const intensity = point.intensity * decay * distanceFactor * scentConfig.strength
                    totalIntensity += intensity
                }
            })
        })
        
        // Check territory markers
        this.territoryMarkers.forEach(marker => {
            const age = now - marker.timestamp
            if (age > 60000) {return} // Territory marks last 1 minute
            
            const distance = this.getDistance(position, marker.position)
            if (distance < marker.radius) {
                const intensity = marker.strength * (1 - age / 60000) * (1 - distance / marker.radius)
                totalIntensity += intensity
            }
        })
        
        return Math.min(1, totalIntensity)
    }
    
    // Get strongest scent direction from position
    getStrongestScentDirection(position, scentType = 'PLAYER', excludeEntityId = null) {
        const samples = 8 // Sample directions
        const sampleDistance = 50
        let strongestDirection = null
        let strongestIntensity = 0
        
        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2
            const samplePos = {
                x: position.x + Math.cos(angle) * sampleDistance,
                y: position.y + Math.sin(angle) * sampleDistance
            }
            
            const intensity = this.getScentIntensityFiltered(samplePos, scentType, excludeEntityId)
            
            if (intensity > strongestIntensity) {
                strongestIntensity = intensity
                strongestDirection = {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                    intensity
                }
            }
        }
        
        return strongestDirection
    }
    
    // Get scent intensity with entity filter
    getScentIntensityFiltered(position, scentType, excludeEntityId) {
        let totalIntensity = 0
        const now = Date.now()
        
        this.scentTrails.forEach((trail, entityId) => {
            if (entityId === excludeEntityId) {return}
            
            trail.forEach(point => {
                if (point.type !== scentType) {return}
                
                const age = now - point.timestamp
                if (age > this.scentDecayTime) {return}
                
                const decay = 1 - (age / this.scentDecayTime)
                const distance = this.getDistance(position, point.position)
                const maxRange = 100
                
                if (distance < maxRange) {
                    const distanceFactor = 1 - (distance / maxRange)
                    totalIntensity += point.intensity * decay * distanceFactor
                }
            })
        })
        
        return totalIntensity
    }
    
    // Follow scent trail
    followTrail(wolf, targetScentType = 'PLAYER') {
        const direction = this.getStrongestScentDirection(
            wolf.position,
            targetScentType,
            wolf.id
        )
        
        if (direction && direction.intensity > 0.1) {
            // Move in direction of strongest scent
            wolf.moveDirection = direction
            wolf.followingScent = true
            wolf.scentIntensity = direction.intensity
            
            // Adjust speed based on scent intensity
            wolf.speed = wolf.baseSpeed * (0.7 + 0.3 * direction.intensity)
            
            return true
        }
        
        wolf.followingScent = false
        return false
    }
    
    // Update scent system
    update(deltaTime) {
        const now = Date.now()
        
        // Update wind
        this.updateWind(deltaTime)
        
        // Apply wind drift to scent points
        this.scentTrails.forEach(trail => {
            trail.forEach(point => {
                point.windDrift.x += this.wind.direction.x * this.wind.strength * deltaTime
                point.windDrift.y += this.wind.direction.y * this.wind.strength * deltaTime
            })
        })
        
        // Clean old scent points
        this.scentTrails.forEach((trail, entityId) => {
            const filtered = trail.filter(point => 
                now - point.timestamp < this.scentDecayTime
            )
            if (filtered.length === 0) {
                this.scentTrails.delete(entityId)
            } else {
                this.scentTrails.set(entityId, filtered)
            }
        })
        
        // Clean old territory markers
        this.territoryMarkers = this.territoryMarkers.filter(marker =>
            now - marker.timestamp < 60000
        )
    }
    
    // Get deterministic wind seed based on time and position
    getDeterministicWindSeed(_deltaTime) {
        // Use time-based seed for deterministic wind variation
        const timeSeed = (Date.now() * 0.001) % 1
        const positionSeed = ((this.wind.direction.x + this.wind.direction.y) * 1000) % 1
        return (timeSeed + positionSeed) % 1
    }

    // Update wind system
    updateWind(deltaTime) {
        // Add some variability to wind using deterministic seed
        const variance = this.wind.variability
        const windSeed = this.getDeterministicWindSeed(deltaTime)
        this.wind.direction.x += (windSeed - 0.5) * variance * deltaTime
        this.wind.direction.y += (windSeed - 0.5) * variance * deltaTime
        
        // Normalize wind direction
        const length = Math.sqrt(
            this.wind.direction.x * this.wind.direction.x +
            this.wind.direction.y * this.wind.direction.y
        )
        if (length > 0) {
            this.wind.direction.x /= length
            this.wind.direction.y /= length
        }
    }
    
    // Render scent trails (for debug/visualization)
    render(ctx, camera, showScent = true) {
        if (!showScent) {return}
        
        const now = Date.now()
        
        // Render scent trails
        this.scentTrails.forEach(trail => {
            trail.forEach(point => {
                const age = now - point.timestamp
                if (age > this.scentDecayTime) {return}
                
                const decay = 1 - (age / this.scentDecayTime)
                const scentConfig = this.scentTypes[point.type]
                
                ctx.save()
                ctx.globalAlpha = decay * 0.3
                ctx.fillStyle = scentConfig.color
                
                // Apply wind drift
                const x = point.position.x + point.windDrift.x - camera.x
                const y = point.position.y + point.windDrift.y - camera.y
                
                // Draw scent particle
                ctx.beginPath()
                ctx.arc(x, y, 3 + point.intensity * 2, 0, Math.PI * 2)
                ctx.fill()
                
                ctx.restore()
            })
        })
        
        // Render territory markers
        this.territoryMarkers.forEach(marker => {
            const age = now - marker.timestamp
            if (age > 60000) {return}
            
            const decay = 1 - (age / 60000)
            
            ctx.save()
            ctx.globalAlpha = decay * 0.2
            ctx.strokeStyle = this.scentTypes.TERRITORY.color
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            
            ctx.beginPath()
            ctx.arc(
                marker.position.x - camera.x,
                marker.position.y - camera.y,
                marker.radius,
                0,
                Math.PI * 2
            )
            ctx.stroke()
            
            ctx.restore()
        })
        
        // Render wind indicator
        this.renderWindIndicator(ctx)
    }
    
    // Render wind direction indicator
    renderWindIndicator(ctx) {
        const x = 50
        const y = 100
        const length = 30
        
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 2
        
        // Draw wind arrow
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(
            x + this.wind.direction.x * length,
            y + this.wind.direction.y * length
        )
        ctx.stroke()
        
        // Arrow head
        const headLength = 8
        const headAngle = Math.atan2(this.wind.direction.y, this.wind.direction.x)
        
        ctx.beginPath()
        ctx.moveTo(
            x + this.wind.direction.x * length,
            y + this.wind.direction.y * length
        )
        ctx.lineTo(
            x + this.wind.direction.x * length - headLength * Math.cos(headAngle - Math.PI / 6),
            y + this.wind.direction.y * length - headLength * Math.sin(headAngle - Math.PI / 6)
        )
        ctx.moveTo(
            x + this.wind.direction.x * length,
            y + this.wind.direction.y * length
        )
        ctx.lineTo(
            x + this.wind.direction.x * length - headLength * Math.cos(headAngle + Math.PI / 6),
            y + this.wind.direction.y * length - headLength * Math.sin(headAngle + Math.PI / 6)
        )
        ctx.stroke()
        
        // Wind strength indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`Wind: ${Math.round(this.wind.strength * 100)}%`, x, y - 10)
        
        ctx.restore()
    }
    
    // Calculate distance
    getDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        return Math.sqrt(dx * dx + dy * dy)
    }
}

// Export the complete enhanced wolf AI system
export class EnhancedWolfAISystem {
    constructor(soundSystem) {
        this.vocalizationSystem = new WolfVocalizationSystem(soundSystem)
        this.scentTrackingSystem = new ScentTrackingSystem()
        this.alphaWolves = new Map() // packId -> AlphaWolf
        this.packs = new Map() // packId -> wolf array
    }
    
    // Create a new wolf pack with alpha
    createPack(packId, wolves) {
        if (wolves.length === 0) {return null}
        
        // Select strongest wolf as alpha
        const alphaCandidate = wolves.reduce((strongest, wolf) => 
            wolf.health > strongest.health ? wolf : strongest
        )
        
        // Create alpha wolf
        const alpha = new AlphaWolf(alphaCandidate)
        alpha.packId = packId
        this.alphaWolves.set(packId, alpha)
        
        // Set pack members
        const packMembers = wolves.filter(w => w.id !== alpha.id)
        packMembers.forEach(wolf => {
            wolf.packId = packId
            wolf.alpha = alpha
        })
        
        this.packs.set(packId, [alpha, ...packMembers])
        
        return alpha
    }
    
    // Update all systems
    update(deltaTime, player) {
        // Update vocalization system
        this.vocalizationSystem.update()
        
        // Update scent tracking
        this.scentTrackingSystem.update(deltaTime)
        
        // Add player scent trail
        if (player && player.position) {
            this.scentTrackingSystem.addScentPoint(
                'player',
                player.position,
                'PLAYER',
                player.isRunning ? 1.5 : 1.0
            )
            
            // Add fear scent if player is low health
            if (player.health < 0.3) {
                this.scentTrackingSystem.addScentPoint(
                    'player',
                    player.position,
                    'FEAR',
                    1.0
                )
            }
        }
        
        // Update each pack
        this.packs.forEach((pack, packId) => {
            const alpha = this.alphaWolves.get(packId)
            
            if (alpha && alpha.health > 0) {
                // Update alpha
                alpha.update(deltaTime, player, pack)
                
                // Alpha scent trail
                this.scentTrackingSystem.addScentPoint(
                    alpha.id,
                    alpha.position,
                    'WOLF',
                    1.5 // Alpha has stronger scent
                )
            }
            
            // Update pack members
            pack.forEach(wolf => {
                if (wolf.health <= 0) {return}
                
                // Add wolf scent trail
                this.scentTrackingSystem.addScentPoint(
                    wolf.id,
                    wolf.position,
                    'WOLF',
                    1.0
                )
                
                // Try to follow player scent if not in combat
                if (wolf.state === 'hunting' || wolf.state === 'searching') {
                    this.scentTrackingSystem.followTrail(wolf, 'PLAYER')
                }
                
                // Check for vocalizations based on state
                this.checkVocalizations(wolf, player)
            })
        })
    }
    
    // Get deterministic vocalization seed based on wolf state and time
    getDeterministicVocalizationSeed(wolf, _player) {
        // Use wolf ID, time, and state for deterministic vocalization timing
        const wolfId = wolf.id || 0
        const timeSeed = (Date.now() * 0.001) % 1
        const stateSeed = wolf.state.charCodeAt(0) / 255
        return (wolfId + timeSeed + stateSeed) % 1
    }

    // Check and trigger vocalizations
    checkVocalizations(wolf, player) {
        const distanceToPlayer = this.getDistance(wolf.position, player.position)
        const vocalizationSeed = this.getDeterministicVocalizationSeed(wolf, player)
        
        // Vocalize based on situation using deterministic seed
        if (wolf.state === 'attacking' && vocalizationSeed < 0.01) {
            this.vocalizationSystem.vocalize(wolf, 'GROWL_AGGRESSIVE', player.position)
        } else if (wolf.health < wolf.maxHealth * 0.3 && vocalizationSeed < 0.02) {
            this.vocalizationSystem.vocalize(wolf, 'WHINE_PAIN')
        } else if (wolf.isAlpha && wolf.packMembers.length > 2 && vocalizationSeed < 0.005) {
            this.vocalizationSystem.vocalize(wolf, 'HOWL_HUNT', player.position)
        } else if (distanceToPlayer < 100 && vocalizationSeed < 0.01) {
            this.vocalizationSystem.vocalize(wolf, 'GROWL_WARNING', player.position)
        }
    }
    
    // Render all visual elements
    render(ctx, camera) {
        // Render scent trails
        this.scentTrackingSystem.render(ctx, camera, true)
        
        // Render vocalizations
        this.vocalizationSystem.render(ctx, camera)
        
        // Render alpha wolves with special effects
        this.alphaWolves.forEach(alpha => {
            if (alpha.health > 0) {
                alpha.render(ctx, camera)
            }
        })
    }
    
    // Helper function
    getDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        return Math.sqrt(dx * dx + dy * dy)
    }
}

export default EnhancedWolfAISystem