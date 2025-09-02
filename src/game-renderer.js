// Game Renderer - Actual game content rendering implementation
// Provides sprites, characters, environment, and interactive elements

import { WolfCharacter } from './wolf-character.js'

export class GameRenderer {
    constructor(ctx, canvas) {
        this.ctx = ctx
        this.canvas = canvas
        
        // Game world
        this.world = {
            width: 3840,
            height: 2160,
            tileSize: 32
        }
        
        // Camera viewport with improved tracking
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            width: canvas.width,
            height: canvas.height,
            zoom: 1.0,
            smoothing: 0.1,
            bounds: {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0
            }
        }
        
        // Calculate camera bounds
        this.updateCameraBounds()
        
        // Player data with improved physics
        this.player = {
            x: this.world.width / 2,
            y: this.world.height / 2,
            width: 48,
            height: 64,
            velocityX: 0,
            velocityY: 0,
            maxSpeed: 500,
            acceleration: 2000,
            friction: 0.85,
            facing: 1, // 1 for right, -1 for left
            state: 'idle', // idle, running, jumping, attacking, blocking, rolling
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            animationFrame: 0,
            animationTime: 0,
            color: '#4a90e2',
            weaponAngle: 0,
            isGrounded: true,
            jumpPower: -800,
            gravity: 2000
        }
        
        // Enemies
        this.enemies = []
        this.initializeEnemies()
        
        // Environment elements
        this.platforms = []
        this.decorations = []
        this.interactables = []
        this.initializeEnvironment()
        
        // Projectiles
        this.projectiles = []
        
        // Collectibles
        this.collectibles = []
        this.initializeCollectibles()
        
        // Visual effects layers
        this.backgroundLayers = []
        this.foregroundEffects = []
        
        // Grid for spatial optimization
        this.spatialGrid = new Map()
        
        // Lighting system
        this.lights = []
        this.ambientLight = 0.3
        
        // Weather effects
        this.weather = {
            type: 'clear', // clear, rain, fog, snow
            intensity: 0,
            particles: []
        }
    }
    
    initializeEnemies() {
        // Create various enemy types
        const enemyTypes = [
            { type: 'wolf', x: 900, y: 350, wolfType: 'normal' },
            { type: 'wolf', x: 1200, y: 340, wolfType: 'scout' },
            { type: 'wolf', x: 1500, y: 330, wolfType: 'alpha' },
            { type: 'bandit', x: 400, y: 360, color: '#8b0000' },
            { type: 'archer', x: 1400, y: 300, color: '#2f4f4f' },
            { type: 'heavy', x: 1600, y: 350, color: '#4b0082' }
        ]
        
        enemyTypes.forEach((config, index) => {
            if (config.type === 'wolf') {
                // Create wolf using WolfCharacter class
                const wolf = new WolfCharacter(config.x, config.y, config.wolfType)
                wolf.id = `enemy_${index}`
                this.enemies.push(wolf)
            } else {
                // Create other enemy types
                this.enemies.push({
                    id: `enemy_${index}`,
                    type: config.type,
                    x: config.x,
                    y: config.y,
                    position: { x: config.x, y: config.y },
                    width: config.type === 'heavy' ? 56 : 40,
                    height: config.type === 'heavy' ? 72 : 56,
                    velocityX: 0,
                    velocityY: 0,
                    health: config.type === 'heavy' ? 150 : 50,
                    maxHealth: config.type === 'heavy' ? 150 : 50,
                    state: 'idle',
                    facing: -1,
                    color: config.color,
                    alertRadius: 200,
                    attackRadius: 60,
                    speed: config.type === 'heavy' ? 80 : 150,
                    damage: config.type === 'heavy' ? 20 : 10,
                    lastAttackTime: 0,
                    attackCooldown: config.type === 'archer' ? 2000 : 1000,
                    animationFrame: 0,
                    animationTime: 0,
                    isAlerted: false,
                    isGrounded: true,
                    ai: {
                        patrolStart: config.x - 100,
                        patrolEnd: config.x + 100,
                        patrolDirection: 1
                    }
                })
            }
        })
    }
    
    initializeEnvironment() {
        // Ground platforms
        this.platforms.push({
            x: 0, y: 450, width: 2000, height: 100,
            type: 'ground', color: '#3e4444'
        })
        
        // Floating platforms
        const platformConfigs = [
            { x: 300, y: 350, width: 150, height: 20 },
            { x: 550, y: 280, width: 120, height: 20 },
            { x: 750, y: 320, width: 180, height: 20 },
            { x: 1000, y: 250, width: 100, height: 20 },
            { x: 1300, y: 300, width: 160, height: 20 }
        ]
        
        platformConfigs.forEach(config => {
            this.platforms.push({
                ...config,
                type: 'platform',
                color: '#5a6c7d'
            })
        })
        
        // Decorative elements
        this.decorations = [
            { type: 'tree', x: 200, y: 350, width: 80, height: 100 },
            { type: 'rock', x: 500, y: 420, width: 40, height: 30 },
            { type: 'bush', x: 800, y: 430, width: 60, height: 20 },
            { type: 'crate', x: 1100, y: 410, width: 40, height: 40 },
            { type: 'barrel', x: 1150, y: 415, width: 35, height: 35 }
        ]
        
        // Interactive objects
        this.interactables = [
            { type: 'chest', x: 650, y: 410, width: 50, height: 40, opened: false, loot: 'health_potion' },
            { type: 'lever', x: 1400, y: 430, width: 20, height: 30, activated: false },
            { type: 'door', x: 1800, y: 350, width: 60, height: 100, locked: true }
        ]
        
        // Lights
        this.lights = [
            { x: 640, y: 200, radius: 300, intensity: 0.8, color: '#ffeb3b' },
            { x: 1200, y: 250, radius: 250, intensity: 0.6, color: '#ff9800' },
            { x: 1600, y: 300, radius: 200, intensity: 0.5, color: '#03a9f4' }
        ]
    }
    
    initializeCollectibles() {
        const collectibleTypes = [
            { type: 'coin', x: 350, y: 320, value: 10 },
            { type: 'coin', x: 380, y: 320, value: 10 },
            { type: 'coin', x: 410, y: 320, value: 10 },
            { type: 'gem', x: 600, y: 250, value: 50 },
            { type: 'powerup', x: 1050, y: 220, effect: 'speed' },
            { type: 'health', x: 900, y: 420, value: 25 }
        ]
        
        collectibleTypes.forEach((config, index) => {
            this.collectibles.push({
                id: `collectible_${index}`,
                ...config,
                width: config.type === 'powerup' ? 30 : 20,
                height: config.type === 'powerup' ? 30 : 20,
                collected: false,
                animationTime: Math.random() * Math.PI * 2,
                color: this.getCollectibleColor(config.type)
            })
        })
    }
    
    getCollectibleColor(type) {
        const colors = {
            coin: '#ffd700',
            gem: '#9c27b0',
            powerup: '#00bcd4',
            health: '#f44336'
        }
        return colors[type] || '#ffffff'
    }
    
    // Update camera bounds based on world size
    updateCameraBounds() {
        this.camera.bounds.minX = this.camera.width / 2
        this.camera.bounds.minY = this.camera.height / 2
        this.camera.bounds.maxX = this.world.width - this.camera.width / 2
        this.camera.bounds.maxY = this.world.height - this.camera.height / 2
    }
    
    // Update camera to follow target
    updateCamera(targetX, targetY, deltaTime) {
        // Set target position
        this.camera.targetX = targetX
        this.camera.targetY = targetY
        
        // Clamp target to bounds
        this.camera.targetX = Math.max(this.camera.bounds.minX, 
                                      Math.min(this.camera.bounds.maxX, this.camera.targetX))
        this.camera.targetY = Math.max(this.camera.bounds.minY, 
                                      Math.min(this.camera.bounds.maxY, this.camera.targetY))
        
        // Smooth camera movement
        const smoothing = 1 - (1 - this.camera.smoothing)**(deltaTime * 60)
        this.camera.x += (this.camera.targetX - this.camera.x) * smoothing
        this.camera.y += (this.camera.targetY - this.camera.y) * smoothing
    }
    
    // Main render method
    render(followPlayer = true) {
        // Update camera to follow player if enabled
        if (followPlayer) {
            this.updateCamera(this.player.x, this.player.y, 1/60)
        }
        
        // Save context state
        this.ctx.save()
        
        // Apply camera transform
        const offsetX = -this.camera.x + this.canvas.width / 2
        const offsetY = -this.camera.y + this.canvas.height / 2
        this.ctx.translate(offsetX, offsetY)
        
        // Render layers in order
        this.renderBackground()
        this.renderPlatforms()
        this.renderDecorations()
        this.renderCollectibles()
        this.renderInteractables()
        this.renderEnemies()
        this.renderPlayer()
        this.renderProjectiles()
        this.renderLighting()
        this.renderWeather()
        
        // Restore context
        this.ctx.restore()
        
        // Render UI elements (not affected by camera)
        this.renderUI()
    }
    
    renderBackground() {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(
            this.camera.x - this.canvas.width / 2,
            this.camera.y - this.canvas.height / 2,
            this.camera.x - this.canvas.width / 2,
            this.camera.y + this.canvas.height / 2
        )
        gradient.addColorStop(0, '#0a0e27')
        gradient.addColorStop(0.5, '#1a1f3a')
        gradient.addColorStop(1, '#2a2f4a')
        
        this.ctx.fillStyle = gradient
        this.ctx.fillRect(
            this.camera.x - this.canvas.width / 2,
            this.camera.y - this.canvas.height / 2,
            this.canvas.width,
            this.canvas.height
        )
        
        // Parallax background elements
        this.renderParallaxLayer(0.3, () => {
            // Mountains
            this.ctx.fillStyle = '#1e2936'
            this.drawMountain(200, 400, 300, 200)
            this.drawMountain(500, 400, 400, 250)
            this.drawMountain(900, 400, 350, 180)
        })
        
        this.renderParallaxLayer(0.5, () => {
            // Trees in background
            this.ctx.fillStyle = '#2a3844'
            for (let i = 0; i < 10; i++) {
                this.drawBackgroundTree(i * 200 + 100, 380, 60, 100)
            }
        })
    }
    
    renderParallaxLayer(scrollFactor, renderFunc) {
        this.ctx.save()
        this.ctx.translate(
            this.camera.x * (1 - scrollFactor) - this.camera.x,
            this.camera.y * (1 - scrollFactor) - this.camera.y
        )
        renderFunc()
        this.ctx.restore()
    }
    
    drawMountain(x, y, width, height) {
        this.ctx.beginPath()
        this.ctx.moveTo(x - width / 2, y)
        this.ctx.lineTo(x, y - height)
        this.ctx.lineTo(x + width / 2, y)
        this.ctx.closePath()
        this.ctx.fill()
    }
    
    drawBackgroundTree(x, y, width, height) {
        // Simple triangle tree
        this.ctx.beginPath()
        this.ctx.moveTo(x, y - height)
        this.ctx.lineTo(x - width / 2, y)
        this.ctx.lineTo(x + width / 2, y)
        this.ctx.closePath()
        this.ctx.fill()
    }
    
    renderPlatforms() {
        this.platforms.forEach(platform => {
            // Platform shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
            this.ctx.fillRect(
                platform.x + 5,
                platform.y + 5,
                platform.width,
                platform.height
            )
            
            // Platform main body
            const gradient = this.ctx.createLinearGradient(
                platform.x,
                platform.y,
                platform.x,
                platform.y + platform.height
            )
            
            if (platform.type === 'ground') {
                gradient.addColorStop(0, '#4a5568')
                gradient.addColorStop(1, '#2d3748')
            } else {
                gradient.addColorStop(0, '#718096')
                gradient.addColorStop(1, '#4a5568')
            }
            
            this.ctx.fillStyle = gradient
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
            
            // Platform edge highlight
            this.ctx.strokeStyle = '#a0aec0'
            this.ctx.lineWidth = 2
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height)
        })
    }
    
    renderDecorations() {
        this.decorations.forEach(deco => {
            this.ctx.save()
            
            switch(deco.type) {
                case 'tree':
                    this.drawTree(deco.x, deco.y, deco.width, deco.height)
                    break
                case 'rock':
                    this.drawRock(deco.x, deco.y, deco.width, deco.height)
                    break
                case 'bush':
                    this.drawBush(deco.x, deco.y, deco.width, deco.height)
                    break
                case 'crate':
                    this.drawCrate(deco.x, deco.y, deco.width, deco.height)
                    break
                case 'barrel':
                    this.drawBarrel(deco.x, deco.y, deco.width, deco.height)
                    break
            }
            
            this.ctx.restore()
        })
    }
    
    drawTree(x, y, width, height) {
        // Trunk
        this.ctx.fillStyle = '#8b4513'
        this.ctx.fillRect(x + width * 0.35, y, width * 0.3, height * 0.4)
        
        // Leaves
        this.ctx.fillStyle = '#228b22'
        this.ctx.beginPath()
        this.ctx.arc(x + width / 2, y - height * 0.3, width * 0.4, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.beginPath()
        this.ctx.arc(x + width * 0.3, y - height * 0.2, width * 0.35, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.beginPath()
        this.ctx.arc(x + width * 0.7, y - height * 0.2, width * 0.35, 0, Math.PI * 2)
        this.ctx.fill()
    }
    
    drawRock(x, y, width, height) {
        this.ctx.fillStyle = '#696969'
        this.ctx.beginPath()
        this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Highlight
        this.ctx.fillStyle = '#808080'
        this.ctx.beginPath()
        this.ctx.ellipse(x + width * 0.4, y + height * 0.3, width * 0.2, height * 0.2, 0, 0, Math.PI * 2)
        this.ctx.fill()
    }
    
    drawBush(x, y, width, height) {
        this.ctx.fillStyle = '#3cb371'
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath()
            this.ctx.arc(
                x + (i + 0.5) * (width / 3),
                y + height / 2,
                height * 0.6,
                0,
                Math.PI * 2
            )
            this.ctx.fill()
        }
    }
    
    drawCrate(x, y, width, height) {
        // Crate body
        this.ctx.fillStyle = '#8b6914'
        this.ctx.fillRect(x, y, width, height)
        
        // Wood grain
        this.ctx.strokeStyle = '#654321'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(x, y + height * 0.3)
        this.ctx.lineTo(x + width, y + height * 0.3)
        this.ctx.moveTo(x, y + height * 0.7)
        this.ctx.lineTo(x + width, y + height * 0.7)
        this.ctx.stroke()
        
        // Border
        this.ctx.strokeStyle = '#4a3c28'
        this.ctx.lineWidth = 3
        this.ctx.strokeRect(x, y, width, height)
    }
    
    drawBarrel(x, y, width, height) {
        // Barrel body
        this.ctx.fillStyle = '#8b6914'
        this.ctx.beginPath()
        this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Metal bands
        this.ctx.strokeStyle = '#4a4a4a'
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.arc(x + width / 2, y + height * 0.3, width / 2, 0, Math.PI * 2)
        this.ctx.stroke()
        this.ctx.beginPath()
        this.ctx.arc(x + width / 2, y + height * 0.7, width / 2, 0, Math.PI * 2)
        this.ctx.stroke()
    }
    
    renderCollectibles() {
        const time = Date.now() / 1000
        
        this.collectibles.forEach(item => {
            if (item.collected) {return}
            
            // Floating animation
            const floatY = Math.sin(time * 2 + item.animationTime) * 5
            
            // Glow effect
            this.ctx.shadowColor = item.color
            this.ctx.shadowBlur = 15
            
            // Draw collectible
            this.ctx.fillStyle = item.color
            
            switch(item.type) {
                case 'coin':
                    this.drawCoin(item.x, item.y + floatY, item.width)
                    break
                case 'gem':
                    this.drawGem(item.x, item.y + floatY, item.width)
                    break
                case 'powerup':
                    this.drawPowerup(item.x, item.y + floatY, item.width, item.effect)
                    break
                case 'health':
                    this.drawHealthPickup(item.x, item.y + floatY, item.width)
                    break
            }
            
            this.ctx.shadowBlur = 0
        })
    }
    
    drawCoin(x, y, size) {
        this.ctx.beginPath()
        this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Inner circle
        this.ctx.strokeStyle = '#ffed4e'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2)
        this.ctx.stroke()
    }
    
    drawGem(x, y, size) {
        this.ctx.beginPath()
        this.ctx.moveTo(x + size / 2, y)
        this.ctx.lineTo(x + size, y + size / 3)
        this.ctx.lineTo(x + size * 0.8, y + size)
        this.ctx.lineTo(x + size * 0.2, y + size)
        this.ctx.lineTo(x, y + size / 3)
        this.ctx.closePath()
        this.ctx.fill()
    }
    
    drawPowerup(x, y, size) {
        // Star shape for powerups
        this.ctx.beginPath()
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2
            const outerX = x + size / 2 + Math.cos(angle) * size / 2
            const outerY = y + size / 2 + Math.sin(angle) * size / 2
            
            if (i === 0) {
                this.ctx.moveTo(outerX, outerY)
            } else {
                this.ctx.lineTo(outerX, outerY)
            }
            
            const innerAngle = angle + Math.PI / 5
            const innerX = x + size / 2 + Math.cos(innerAngle) * size / 4
            const innerY = y + size / 2 + Math.sin(innerAngle) * size / 4
            this.ctx.lineTo(innerX, innerY)
        }
        this.ctx.closePath()
        this.ctx.fill()
    }
    
    drawHealthPickup(x, y, size) {
        // Heart shape
        this.ctx.beginPath()
        this.ctx.moveTo(x + size / 2, y + size * 0.3)
        this.ctx.bezierCurveTo(
            x + size / 2, y,
            x, y,
            x, y + size * 0.3
        )
        this.ctx.bezierCurveTo(
            x, y + size * 0.6,
            x + size / 2, y + size,
            x + size / 2, y + size
        )
        this.ctx.bezierCurveTo(
            x + size / 2, y + size,
            x + size, y + size * 0.6,
            x + size, y + size * 0.3
        )
        this.ctx.bezierCurveTo(
            x + size, y,
            x + size / 2, y,
            x + size / 2, y + size * 0.3
        )
        this.ctx.fill()
    }
    
    renderInteractables() {
        this.interactables.forEach(obj => {
            switch(obj.type) {
                case 'chest':
                    this.drawChest(obj)
                    break
                case 'lever':
                    this.drawLever(obj)
                    break
                case 'door':
                    this.drawDoor(obj)
                    break
            }
        })
    }
    
    drawChest(chest) {
        // Chest body
        this.ctx.fillStyle = chest.opened ? '#654321' : '#8b6914'
        this.ctx.fillRect(chest.x, chest.y, chest.width, chest.height)
        
        // Chest lid
        if (!chest.opened) {
            this.ctx.fillStyle = '#a0742c'
            this.ctx.fillRect(chest.x, chest.y, chest.width, chest.height * 0.4)
            
            // Lock
            this.ctx.fillStyle = '#ffd700'
            this.ctx.fillRect(
                chest.x + chest.width * 0.4,
                chest.y + chest.height * 0.3,
                chest.width * 0.2,
                chest.height * 0.2
            )
        }
        
        // Decorative bands
        this.ctx.strokeStyle = '#4a3c28'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(chest.x, chest.y, chest.width, chest.height)
    }
    
    drawLever(lever) {
        // Base
        this.ctx.fillStyle = '#4a4a4a'
        this.ctx.fillRect(
            lever.x,
            lever.y + lever.height * 0.7,
            lever.width,
            lever.height * 0.3
        )
        
        // Handle
        this.ctx.save()
        this.ctx.translate(lever.x + lever.width / 2, lever.y + lever.height * 0.7)
        this.ctx.rotate(lever.activated ? Math.PI / 4 : -Math.PI / 4)
        
        this.ctx.fillStyle = '#8b4513'
        this.ctx.fillRect(-2, -lever.height * 0.6, 4, lever.height * 0.6)
        
        // Handle grip
        this.ctx.fillStyle = '#ff0000'
        this.ctx.beginPath()
        this.ctx.arc(0, -lever.height * 0.6, 5, 0, Math.PI * 2)
        this.ctx.fill()
        
        this.ctx.restore()
    }
    
    drawDoor(door) {
        // Door frame
        this.ctx.strokeStyle = '#4a3c28'
        this.ctx.lineWidth = 5
        this.ctx.strokeRect(door.x, door.y, door.width, door.height)
        
        // Door
        if (!door.locked) {
            this.ctx.fillStyle = 'rgba(139, 105, 20, 0.5)'
        } else {
            this.ctx.fillStyle = '#8b6914'
        }
        this.ctx.fillRect(door.x, door.y, door.width, door.height)
        
        // Door handle
        this.ctx.fillStyle = '#ffd700'
        this.ctx.beginPath()
        this.ctx.arc(
            door.x + door.width * 0.8,
            door.y + door.height / 2,
            5,
            0,
            Math.PI * 2
        )
        this.ctx.fill()
        
        // Lock indicator
        if (door.locked) {
            this.ctx.fillStyle = '#ff0000'
            this.ctx.font = 'bold 20px Arial'
            this.ctx.textAlign = 'center'
            this.ctx.fillText('🔒', door.x + door.width / 2, door.y + door.height / 2)
        }
    }
    
    renderEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) {return}
            
            // Check if this is a wolf enemy
            if (enemy instanceof WolfCharacter) {
                // Use wolf's own render method
                enemy.render(this.ctx, this.camera)
            } else {
                // Render other enemy types
                this.ctx.save()
                
                // Get position (handle both old and new formats)
                const x = enemy.position ? enemy.position.x : enemy.x
                const y = enemy.position ? enemy.position.y : enemy.y
                
                // Enemy body
                this.drawCharacter(
                    x,
                    y,
                    enemy.width,
                    enemy.height,
                    enemy.color,
                    enemy.facing,
                    enemy.state,
                    enemy.animationFrame
                )
                
                // Alert indicator
                if (enemy.isAlerted) {
                    this.ctx.fillStyle = '#ff0000'
                    this.ctx.font = 'bold 16px Arial'
                    this.ctx.textAlign = 'center'
                    this.ctx.fillText('!', x + enemy.width / 2, y - 10)
                }
                
                // Health bar
                if (enemy.health < enemy.maxHealth) {
                    this.drawHealthBar(
                        x,
                        y - 15,
                        enemy.width,
                        8,
                        enemy.health,
                        enemy.maxHealth
                    )
                }
                
                // Special enemy features
                if (enemy.type === 'archer') {
                    this.drawBow(enemy)
                } else if (enemy.type === 'heavy') {
                    this.drawShield(enemy)
                }
                
                this.ctx.restore()
            }
        })
    }
    
    renderPlayer() {
        this.ctx.save()
        
        // Player shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        this.ctx.beginPath()
        this.ctx.ellipse(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height + 5,
            this.player.width / 2,
            5,
            0, 0, Math.PI * 2
        )
        this.ctx.fill()
        
        // Player body
        this.drawCharacter(
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height,
            this.player.color,
            this.player.facing,
            this.player.state,
            this.player.animationFrame
        )
        
        // Weapon
        this.drawWeapon(this.player)
        
        // Status effects
        if (this.player.state === 'blocking') {
            this.drawShield(this.player)
        }
        
        if (this.player.state === 'rolling') {
            // Motion blur effect
            for (let i = 1; i <= 3; i++) {
                this.ctx.globalAlpha = 0.3 / i
                this.drawCharacter(
                    this.player.x - this.player.velocityX * 0.05 * i,
                    this.player.y - this.player.velocityY * 0.05 * i,
                    this.player.width,
                    this.player.height,
                    this.player.color,
                    this.player.facing,
                    'rolling',
                    this.player.animationFrame
                )
            }
            this.ctx.globalAlpha = 1
        }
        
        this.ctx.restore()
    }
    
    drawCharacter(x, y, width, height, color, facing, state, frame) {
        // Body
        const bodyColor = state === 'hurt' ? '#ff6b6b' : color
        this.ctx.fillStyle = bodyColor
        
        // Torso
        this.ctx.fillRect(x + width * 0.25, y + height * 0.3, width * 0.5, height * 0.4)
        
        // Head
        this.ctx.beginPath()
        this.ctx.arc(x + width / 2, y + height * 0.2, width * 0.2, 0, Math.PI * 2)
        this.ctx.fill()
        
        // Arms
        const armOffset = Math.sin(frame * 0.3) * 5
        this.ctx.fillRect(x + width * 0.1, y + height * 0.35 + armOffset, width * 0.15, height * 0.3)
        this.ctx.fillRect(x + width * 0.75, y + height * 0.35 - armOffset, width * 0.15, height * 0.3)
        
        // Legs
        const legOffset = state === 'running' ? Math.sin(frame * 0.5) * 10 : 0
        this.ctx.fillRect(x + width * 0.25, y + height * 0.65 + Math.max(0, legOffset), width * 0.2, height * 0.35)
        this.ctx.fillRect(x + width * 0.55, y + height * 0.65 + Math.max(0, -legOffset), width * 0.2, height * 0.35)
        
        // Eyes
        this.ctx.fillStyle = '#ffffff'
        const eyeX = facing === 1 ? x + width * 0.55 : x + width * 0.35
        this.ctx.fillRect(eyeX, y + height * 0.15, width * 0.1, height * 0.05)
    }
    
    drawWeapon(character) {
        if (character.state === 'attacking') {
            this.ctx.save()
            
            // Sword position based on facing
            const swordX = character.x + (character.facing === 1 ? character.width : 0)
            const swordY = character.y + character.height * 0.4
            
            this.ctx.translate(swordX, swordY)
            this.ctx.rotate(character.weaponAngle + (character.facing === -1 ? Math.PI : 0))
            
            // Sword blade
            const gradient = this.ctx.createLinearGradient(0, 0, 40, 0)
            gradient.addColorStop(0, '#c0c0c0')
            gradient.addColorStop(0.5, '#ffffff')
            gradient.addColorStop(1, '#c0c0c0')
            
            this.ctx.fillStyle = gradient
            this.ctx.fillRect(0, -3, 40, 6)
            
            // Sword handle
            this.ctx.fillStyle = '#8b4513'
            this.ctx.fillRect(-10, -4, 15, 8)
            
            // Sword guard
            this.ctx.fillStyle = '#ffd700'
            this.ctx.fillRect(-5, -8, 8, 16)
            
            this.ctx.restore()
        }
    }
    
    drawBow(archer) {
        if (archer.state === 'attacking') {
            this.ctx.strokeStyle = '#8b4513'
            this.ctx.lineWidth = 3
            this.ctx.beginPath()
            this.ctx.arc(
                archer.x + (archer.facing === 1 ? archer.width : 0),
                archer.y + archer.height * 0.4,
                20,
                archer.facing === 1 ? -Math.PI / 4 : Math.PI - Math.PI / 4,
                archer.facing === 1 ? Math.PI / 4 : Math.PI + Math.PI / 4
            )
            this.ctx.stroke()
            
            // Arrow
            this.ctx.strokeStyle = '#654321'
            this.ctx.lineWidth = 2
            this.ctx.beginPath()
            this.ctx.moveTo(
                archer.x + (archer.facing === 1 ? archer.width : 0),
                archer.y + archer.height * 0.4
            )
            this.ctx.lineTo(
                archer.x + (archer.facing === 1 ? archer.width + 20 : -20),
                archer.y + archer.height * 0.4
            )
            this.ctx.stroke()
        }
    }
    
    drawShield(character) {
        this.ctx.fillStyle = 'rgba(100, 150, 200, 0.7)'
        this.ctx.strokeStyle = '#4a90e2'
        this.ctx.lineWidth = 3
        
        const shieldX = character.x + (character.facing === 1 ? character.width - 10 : -5)
        const shieldY = character.y + character.height * 0.3
        
        this.ctx.fillRect(shieldX, shieldY, 15, character.height * 0.5)
        this.ctx.strokeRect(shieldX, shieldY, 15, character.height * 0.5)
    }
    
    renderProjectiles() {
        this.projectiles.forEach(proj => {
            this.ctx.save()
            
            // Projectile trail
            const gradient = this.ctx.createLinearGradient(
                proj.x - proj.velocityX * 0.1,
                proj.y - proj.velocityY * 0.1,
                proj.x,
                proj.y
            )
            gradient.addColorStop(0, 'rgba(255, 200, 100, 0)')
            gradient.addColorStop(1, 'rgba(255, 200, 100, 0.8)')
            
            this.ctx.strokeStyle = gradient
            this.ctx.lineWidth = proj.size
            this.ctx.beginPath()
            this.ctx.moveTo(proj.x - proj.velocityX * 0.1, proj.y - proj.velocityY * 0.1)
            this.ctx.lineTo(proj.x, proj.y)
            this.ctx.stroke()
            
            // Projectile body
            this.ctx.fillStyle = proj.color || '#ffaa00'
            this.ctx.beginPath()
            this.ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2)
            this.ctx.fill()
            
            this.ctx.restore()
        })
    }
    
    renderLighting() {
        // Create lighting overlay
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'multiply'
        
        // Base darkness
        this.ctx.fillStyle = `rgba(0, 0, 20, ${1 - this.ambientLight})`
        this.ctx.fillRect(
            this.camera.x - this.canvas.width / 2,
            this.camera.y - this.canvas.height / 2,
            this.canvas.width,
            this.canvas.height
        )
        
        this.ctx.globalCompositeOperation = 'screen'
        
        // Render light sources
        this.lights.forEach(light => {
            const gradient = this.ctx.createRadialGradient(
                light.x, light.y, 0,
                light.x, light.y, light.radius
            )
            gradient.addColorStop(0, light.color)
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
            
            this.ctx.fillStyle = gradient
            this.ctx.globalAlpha = light.intensity
            this.ctx.fillRect(
                light.x - light.radius,
                light.y - light.radius,
                light.radius * 2,
                light.radius * 2
            )
        })
        
        this.ctx.restore()
    }
    
    renderWeather() {
        if (this.weather.type === 'rain') {
            this.ctx.strokeStyle = 'rgba(200, 200, 255, 0.5)'
            this.ctx.lineWidth = 1
            
            for (let i = 0; i < 50 * this.weather.intensity; i++) {
                const x = Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2
                const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2
                
                this.ctx.beginPath()
                this.ctx.moveTo(x, y)
                this.ctx.lineTo(x - 2, y + 10)
                this.ctx.stroke()
            }
        } else if (this.weather.type === 'snow') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
            
            for (let i = 0; i < 30 * this.weather.intensity; i++) {
                const x = Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2
                const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2
                const size = Math.random() * 3 + 1
                
                this.ctx.beginPath()
                this.ctx.arc(x, y, size, 0, Math.PI * 2)
                this.ctx.fill()
            }
        } else if (this.weather.type === 'fog') {
            this.ctx.fillStyle = `rgba(200, 200, 200, ${0.3 * this.weather.intensity})`
            this.ctx.fillRect(
                this.camera.x - this.canvas.width / 2,
                this.camera.y - this.canvas.height / 2,
                this.canvas.width,
                this.canvas.height
            )
        }
    }
    
    renderUI() {
        // Health bar
        this.drawHealthBar(20, 20, 200, 20, this.player.health, this.player.maxHealth)
        
        // Stamina bar
        this.drawStaminaBar(20, 50, 200, 15, this.player.stamina, this.player.maxStamina)
        
        // Mini map
        this.drawMiniMap(this.canvas.width - 160, 20, 140, 100)
    }
    
    drawHealthBar(x, y, width, height, current, max) {
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.ctx.fillRect(x, y, width, height)
        
        // Health fill
        const healthPercent = current / max
        const gradient = this.ctx.createLinearGradient(x, y, x + width * healthPercent, y)
        gradient.addColorStop(0, healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336')
        gradient.addColorStop(1, healthPercent > 0.5 ? '#8bc34a' : healthPercent > 0.25 ? '#ffc107' : '#ff5722')
        
        this.ctx.fillStyle = gradient
        this.ctx.fillRect(x, y, width * healthPercent, height)
        
        // Border
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(x, y, width, height)
        
        // Text
        this.ctx.fillStyle = '#ffffff'
        this.ctx.font = 'bold 12px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(`${Math.floor(current)}/${max}`, x + width / 2, y + height / 2)
    }
    
    drawStaminaBar(x, y, width, height, current, max) {
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.ctx.fillRect(x, y, width, height)
        
        // Stamina fill
        const staminaPercent = current / max
        this.ctx.fillStyle = '#2196f3'
        this.ctx.fillRect(x, y, width * staminaPercent, height)
        
        // Border
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(x, y, width, height)
    }
    
    drawMiniMap(x, y, width, height) {
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        this.ctx.fillRect(x, y, width, height)
        
        // Map scale
        const scaleX = width / this.world.width
        const scaleY = height / this.world.height
        
        // Draw platforms
        this.ctx.fillStyle = '#4a5568'
        this.platforms.forEach(platform => {
            this.ctx.fillRect(
                x + platform.x * scaleX,
                y + platform.y * scaleY,
                platform.width * scaleX,
                platform.height * scaleY
            )
        })
        
        // Draw enemies
        this.ctx.fillStyle = '#ff0000'
        this.enemies.forEach(enemy => {
            if (enemy.health > 0) {
                this.ctx.fillRect(
                    x + enemy.x * scaleX - 1,
                    y + enemy.y * scaleY - 1,
                    3, 3
                )
            }
        })
        
        // Draw player
        this.ctx.fillStyle = '#00ff00'
        this.ctx.fillRect(
            x + this.player.x * scaleX - 2,
            y + this.player.y * scaleY - 2,
            4, 4
        )
        
        // Border
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(x, y, width, height)
    }
    
    // Update methods for game logic
    updatePlayer(deltaTime, input = {}) {
        // Handle input
        let inputX = 0
        let inputY = 0
        
        if (input.left) {
            inputX -= 1
        }
        if (input.right) {
            inputX += 1
        }
        if (input.up) {
            inputY -= 1
        }
        if (input.down) {
            inputY += 1
        }
        
        // Normalize diagonal movement
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707
            inputY *= 0.707
        }
        
        // Apply acceleration based on input
        if (this.player.state !== 'rolling' && this.player.state !== 'attacking') {
            const speed = input.sprint ? this.player.maxSpeed * 1.5 : this.player.maxSpeed
            this.player.velocityX += inputX * this.player.acceleration * deltaTime
            this.player.velocityY += inputY * this.player.acceleration * deltaTime
            
            // Clamp to max speed
            const currentSpeed = Math.sqrt(this.player.velocityX ** 2 + this.player.velocityY ** 2)
            if (currentSpeed > speed) {
                const scale = speed / currentSpeed
                this.player.velocityX *= scale
                this.player.velocityY *= scale
            }
        }
        
        // Apply friction
        const frictionFactor = this.player.friction**(deltaTime * 60)
        this.player.velocityX *= frictionFactor
        this.player.velocityY *= frictionFactor
        
        // Apply gravity if not grounded (for platformer mode)
        if (!this.player.isGrounded && this.world.hasPlatformPhysics) {
            this.player.velocityY += this.player.gravity * deltaTime
        }
        
        // Jump handling
        if (input.jump && this.player.isGrounded && this.world.hasPlatformPhysics) {
            this.player.velocityY = this.player.jumpPower
            this.player.isGrounded = false
        }
        
        // Update position
        this.player.x += this.player.velocityX * deltaTime
        this.player.y += this.player.velocityY * deltaTime
        
        // Keep player in world bounds
        this.player.x = Math.max(this.player.width / 2, 
                                Math.min(this.world.width - this.player.width / 2, this.player.x))
        this.player.y = Math.max(this.player.height / 2, 
                                Math.min(this.world.height - this.player.height / 2, this.player.y))
        
        // Update facing direction
        if (Math.abs(this.player.velocityX) > 10) {
            this.player.facing = Math.sign(this.player.velocityX)
        }
        
        // Update animation
        this.player.animationTime += deltaTime
        this.player.animationFrame = Math.floor(this.player.animationTime * 10) % 4
        
        // Update weapon angle for attacks
        if (this.player.state === 'attacking') {
            this.player.weaponAngle = Math.sin(this.player.animationTime * 10) * Math.PI / 4
        }
        
        // Handle state transitions
        if (Math.abs(this.player.velocityX) > 50 || Math.abs(this.player.velocityY) > 50) {
            if (this.player.state !== 'attacking' && this.player.state !== 'rolling') {
                this.player.state = 'running'
            }
        } else if (this.player.state === 'running') {
            this.player.state = 'idle'
        }
        
        // Regenerate stamina
        if (this.player.stamina < this.player.maxStamina) {
            this.player.stamina = Math.min(this.player.maxStamina, 
                                          this.player.stamina + 20 * deltaTime)
        }
    }
    
    updateEnemies(deltaTime) {
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) {return}
            
            // Check if this is a wolf enemy
            if (enemy instanceof WolfCharacter) {
                // Update wolf using its own update method
                enemy.update(deltaTime, this.player)
                
                // Simple AI for wolf movement towards player
                const distToPlayer = enemy.getDistanceTo(this.player)
                
                if (distToPlayer < enemy.detectionRange && distToPlayer > enemy.attackRange) {
                    // Move towards player if in detection range but not attack range
                    enemy.moveTowards(this.player.position)
                } else if (distToPlayer <= enemy.attackRange) {
                    // Attack if in range
                    enemy.attack(this.player)
                }
            } else {
                // Original enemy update logic for non-wolf enemies
                const x = enemy.position ? enemy.position.x : enemy.x
                const y = enemy.position ? enemy.position.y : enemy.y
                
                // Update animation
                enemy.animationTime += deltaTime
                enemy.animationFrame = Math.floor(enemy.animationTime * 10) % 4
                
                // Simple AI behavior
                const distToPlayer = Math.sqrt(
                    (this.player.x - x)**2 +
                    (this.player.y - y)**2
                )
                
                // Alert state
                if (distToPlayer < enemy.alertRadius) {
                    enemy.isAlerted = true
                    
                    // Move towards player
                    if (distToPlayer > enemy.attackRadius) {
                        const dx = this.player.x - x
                        enemy.velocityX = Math.sign(dx) * enemy.speed
                        enemy.facing = Math.sign(dx)
                        enemy.state = 'running'
                    } else {
                        // Attack
                        enemy.velocityX = 0
                        if (Date.now() - enemy.lastAttackTime > enemy.attackCooldown) {
                            enemy.state = 'attacking'
                            enemy.lastAttackTime = Date.now()
                            
                            // Create projectile for archers
                            if (enemy.type === 'archer') {
                                this.createProjectile(
                                    x + (enemy.facing === 1 ? enemy.width : 0),
                                    y + enemy.height * 0.4,
                                    enemy.facing * 300,
                                    0,
                                    'arrow'
                                )
                            }
                        } else {
                            enemy.state = 'idle'
                        }
                    }
                } else {
                    // Patrol behavior
                    enemy.isAlerted = false
                    if (x <= enemy.ai.patrolStart || x >= enemy.ai.patrolEnd) {
                        enemy.ai.patrolDirection *= -1
                    }
                    enemy.velocityX = enemy.ai.patrolDirection * enemy.speed * 0.5
                    enemy.facing = enemy.ai.patrolDirection
                    enemy.state = 'running'
                }
                
                // Update position
                if (enemy.position) {
                    enemy.position.x += enemy.velocityX * deltaTime
                    enemy.x = enemy.position.x
                } else {
                    enemy.x += enemy.velocityX * deltaTime
                }
            }
        })
    }
    
    createProjectile(x, y, vx, vy, type) {
        this.projectiles.push({
            x, y,
            velocityX: vx,
            velocityY: vy,
            type,
            size: type === 'arrow' ? 3 : 5,
            color: type === 'arrow' ? '#654321' : '#ffaa00',
            damage: type === 'arrow' ? 15 : 10
        })
    }
    
    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(proj => {
            // Update position
            proj.x += proj.velocityX * deltaTime
            proj.y += proj.velocityY * deltaTime
            
            // Apply gravity to some projectiles
            if (proj.type !== 'magic') {
                proj.velocityY += 500 * deltaTime
            }
            
            // Remove if out of bounds
            return proj.x > -100 && proj.x < this.world.width + 100 &&
                   proj.y > -100 && proj.y < this.world.height + 100
        })
    }
    
    // Collision detection helpers
    checkCollisions() {
        // Player vs platforms
        this.platforms.forEach(platform => {
            if (this.checkRectCollision(this.player, platform)) {
                this.resolveCollision(this.player, platform)
            }
        })
        
        // Enemies vs platforms
        this.enemies.forEach(enemy => {
            this.platforms.forEach(platform => {
                if (this.checkRectCollision(enemy, platform)) {
                    this.resolveCollision(enemy, platform)
                }
            })
        })
        
        // Player vs collectibles
        this.collectibles.forEach(item => {
            if (!item.collected && this.checkRectCollision(this.player, item)) {
                item.collected = true
                this.onCollectItem(item)
            }
        })
    }
    
    checkRectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y
    }
    
    resolveCollision(entity, platform) {
        // Simple AABB collision resolution
        const overlapX = Math.min(
            entity.x + entity.width - platform.x,
            platform.x + platform.width - entity.x
        )
        const overlapY = Math.min(
            entity.y + entity.height - platform.y,
            platform.y + platform.height - entity.y
        )
        
        if (overlapX < overlapY) {
            // Horizontal collision
            if (entity.x < platform.x) {
                entity.x = platform.x - entity.width
            } else {
                entity.x = platform.x + platform.width
            }
            entity.velocityX = 0
        } else {
            // Vertical collision
            if (entity.y < platform.y) {
                entity.y = platform.y - entity.height
                entity.isGrounded = true
            } else {
                entity.y = platform.y + platform.height
            }
            entity.velocityY = 0
        }
    }
    
    onCollectItem(item) {
        // Handle collection effects
        switch(item.type) {
            case 'coin':
                // Add score
                break
            case 'health':
                this.player.health = Math.min(
                    this.player.health + item.value,
                    this.player.maxHealth
                )
                break
            case 'powerup':
                // Apply powerup effect
                break
        }
    }
    
    // Weather control
    setWeather(type, intensity = 1) {
        this.weather.type = type
        this.weather.intensity = Math.max(0, Math.min(1, intensity))
    }
    
    // Dynamic lighting
    addLight(x, y, radius, intensity, color) {
        this.lights.push({ x, y, radius, intensity, color })
    }
    
    removeLight(index) {
        this.lights.splice(index, 1)
    }
    
    setAmbientLight(level) {
        this.ambientLight = Math.max(0, Math.min(1, level))
    }
    
    // Player action methods
    performRoll(direction) {
        if (this.player.stamina < 30 || this.player.state === 'rolling') {
            return false
        }
        
        this.player.state = 'rolling'
        this.player.stamina -= 30
        
        // Apply roll velocity
        const rollSpeed = 800
        this.player.velocityX = Math.cos(direction) * rollSpeed
        this.player.velocityY = Math.sin(direction) * rollSpeed
        
        // Reset state after roll duration
        setTimeout(() => {
            this.player.state = 'idle'
        }, 300)
        
        return true
    }
    
    performAttack() {
        if (this.player.state === 'attacking') {
            return false
        }
        
        this.player.state = 'attacking'
        
        // Reset state after attack duration
        setTimeout(() => {
            this.player.state = 'idle'
        }, 400)
        
        return true
    }
    
    performBlock(active) {
        if (active && this.player.state !== 'blocking') {
            this.player.state = 'blocking'
            return true
        } else if (!active && this.player.state === 'blocking') {
            this.player.state = 'idle'
            return false
        }
        return this.player.state === 'blocking'
    }
    
    // Get player world position
    getPlayerPosition() {
        return { x: this.player.x, y: this.player.y }
    }
    
    // Set player position (for network sync or respawn)
    setPlayerPosition(x, y) {
        this.player.x = Math.max(0, Math.min(this.world.width, x))
        this.player.y = Math.max(0, Math.min(this.world.height, y))
        this.player.velocityX = 0
        this.player.velocityY = 0
    }
    
    // Get camera position for external use
    getCameraPosition() {
        return { x: this.camera.x, y: this.camera.y }
    }
    
    // WASM coordinate mapping functions
    // Convert WASM coordinates (0-1 range) to world coordinates
    wasmToWorld(wasmX, wasmY) {
        // Map WASM (0-1) to center third of world
        // This keeps the playable area in the middle of the larger world
        const playableWidth = this.world.width / 3
        const playableHeight = this.world.height / 3
        const offsetX = this.world.width / 3
        const offsetY = this.world.height / 3
        
        return {
            x: offsetX + wasmX * playableWidth,
            y: offsetY + wasmY * playableHeight
        }
    }
    
    // Convert world coordinates to WASM coordinates (0-1 range)
    worldToWasm(worldX, worldY) {
        const playableWidth = this.world.width / 3
        const playableHeight = this.world.height / 3
        const offsetX = this.world.width / 3
        const offsetY = this.world.height / 3
        
        // Clamp to playable area and normalize
        const wasmX = Math.max(0, Math.min(1, (worldX - offsetX) / playableWidth))
        const wasmY = Math.max(0, Math.min(1, (worldY - offsetY) / playableHeight))
        
        return { x: wasmX, y: wasmY }
    }
    
    // Set player position from WASM coordinates
    setPlayerPositionFromWasm(wasmX, wasmY) {
        const worldPos = this.wasmToWorld(wasmX, wasmY)
        this.setPlayerPosition(worldPos.x, worldPos.y)
    }
    
    // Get player position in WASM coordinates
    getPlayerPositionAsWasm() {
        return this.worldToWasm(this.player.x, this.player.y)
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.camera.x - this.canvas.width / 2,
            y: screenY + this.camera.y - this.canvas.height / 2
        }
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.camera.x + this.canvas.width / 2,
            y: worldY - this.camera.y + this.canvas.height / 2
        }
    }
}

export default GameRenderer