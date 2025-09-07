// Game Renderer - Actual game content rendering implementation
// Provides sprites, characters, environment, and interactive elements

import { WolfCharacter } from '../gameentity/wolf-character.js'

export class GameRenderer {
    constructor(ctx, canvas, initialBiome = 0) {
        this.ctx = ctx
        this.canvas = canvas
        
        // Current biome (0: Forest, 1: Swamp, 2: Mountains, 3: Plains)
        this.currentBiome = initialBiome;

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
        
        // When true, an external player renderer (e.g., AnimatedPlayer) will handle drawing the player
        // and this renderer will skip its internal player drawing.
        this.useExternalPlayer = false
        
        // Weather effects (must be initialized before environment)
        this.weather = {
            type: 'clear', // clear, rain, fog, snow
            intensity: 0,
            particles: []
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
    }
    
    // Biome environment generators (deterministic layouts)
    generateForestEnvironment() {
        // Simple interactables
        this.interactables.push(
            { type: 'chest', x: 520, y: 380, width: 40, height: 30, opened: false },
            { type: 'lever', x: 860, y: 390, width: 20, height: 40, activated: false },
            { type: 'door', x: 1300, y: 340, width: 40, height: 110, locked: true }
        )
        // Decorations for docs/alternate renderers that rely on pre-filled arrays
        for (let i = 0; i < 10; i++) {
            this.decorations.push({ type: 'tree', x: 100 + i * 150, y: 360, width: 80, height: 150 })
            this.decorations.push({ type: 'bush', x: 180 + i * 150, y: 430, width: 60, height: 40 })
        }
    }

    generateSwampEnvironment() {
        this.interactables.push(
            { type: 'chest', x: 450, y: 410, width: 40, height: 30, opened: false },
            { type: 'lever', x: 980, y: 420, width: 20, height: 40, activated: false }
        )
        for (let i = 0; i < 8; i++) {
            this.decorations.push({ type: 'swamp_tree', x: 120 + i * 200, y: 420, width: 90, height: 160 })
            this.decorations.push({ type: 'lilypad', x: 160 + i * 200, y: 500, width: 50, height: 10 })
        }
        this.weather.type = 'fog'
        this.weather.intensity = 0.5
    }

    generateMountainEnvironment() {
        this.interactables.push(
            { type: 'door', x: 1250, y: 320, width: 50, height: 130, locked: false }
        )
        for (let i = 0; i < 6; i++) {
            this.decorations.push({ type: 'rock', x: 180 + i * 220, y: 380, width: 100, height: 70 })
            this.decorations.push({ type: 'snow_patch', x: 260 + i * 220, y: 390, width: 70, height: 30 })
        }
        this.weather.type = 'snow'
        this.weather.intensity = 0.6
    }

    generatePlainsEnvironment() {
        this.interactables.push(
            { type: 'chest', x: 700, y: 470, width: 40, height: 30, opened: false }
        )
        for (let i = 0; i < 12; i++) {
            this.decorations.push({ type: 'bush', x: 100 + i * 160, y: 480, width: 50, height: 30 })
            this.decorations.push({ type: 'grass_tuft', x: 140 + i * 160, y: 510, width: 20, height: 15 })
        }
        this.weather.type = 'clear'
        this.weather.intensity = 0
    }

    generateDefaultEnvironment() {
        this.interactables.push(
            { type: 'crate', x: 600, y: 420, width: 40, height: 40 },
            { type: 'barrel', x: 800, y: 420, width: 30, height: 50 }
        )
        for (let i = 0; i < 8; i++) {
            this.decorations.push({ type: 'tree', x: 150 + i * 180, y: 360, width: 80, height: 150 })
            this.decorations.push({ type: 'rock', x: 220 + i * 180, y: 420, width: 60, height: 40 })
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
                // WolfCharacter creation is now handled by site.js and passed to GameRenderer
                // this.enemies.push(new WolfCharacter(config.x, config.y, config.wolfType))
                // No longer create wolves here; they are managed externally.
                // For now, we will just push a placeholder or skip for wolf types if not passed externally.
                // If GameRenderer is to display external wolves, it needs to be set up to receive them.
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
    
    initializeEnvironment(wasmModule = null) {
        // Clear existing platforms, decorations, and interactables
        this.platforms = [];
        this.decorations = [];
        this.interactables = [];
        this.environmentObjects = [];

        // Ground platforms (always present)
        this.platforms.push({
            x: 0, y: 450, width: 2000, height: 100,
            type: 'ground', color: '#3e4444'
        })

        // If WASM module is available, use it for environment generation
        if (wasmModule) {
            this.loadEnvironmentFromWasm(wasmModule);
        } else {
            // Fallback to legacy JS generation
            this.generateLegacyEnvironment();
        }

        // Lights (some global, some biome-specific)
        this.lights = [
            { x: 640, y: 200, radius: 300, intensity: 0.8, color: '#ffeb3b' },
            { x: 1200, y: 250, radius: 250, intensity: 0.6, color: '#ff9800' },
            { x: 1600, y: 300, radius: 200, intensity: 0.5, color: '#03a9f4' }
        ]
    }

    // Load environment objects from WASM state
    loadEnvironmentFromWasm(wasmModule) {
        try {
            // Get current biome from WASM
            this.currentBiome = wasmModule.get_current_biome();
            
            // Get environment object count
            const objectCount = wasmModule.get_environment_object_count();
            
            // Validate object count to prevent bounds errors
            const safeObjectCount = Number.isInteger(objectCount) && objectCount >= 0 ? Math.min(objectCount, 1000) : 0;
            
            // Load all environment objects from WASM
            for (let i = 0; i < safeObjectCount; i++) {
                try {
                    const envObj = {
                        type: this.getEnvironmentTypeString(wasmModule.get_environment_object_type(i)),
                        x: wasmModule.get_environment_object_x(i),
                        y: wasmModule.get_environment_object_y(i),
                        width: wasmModule.get_environment_object_width(i),
                        height: wasmModule.get_environment_object_height(i),
                        isInteractable: wasmModule.get_environment_object_is_interactable(i) === 1,
                        isSolid: wasmModule.get_environment_object_is_solid(i) === 1,
                        stateFlags: wasmModule.get_environment_object_state_flags(i)
                    };
                
                // Add to appropriate arrays based on type
                if (envObj.isInteractable) {
                    this.interactables.push({
                        type: envObj.type,
                        x: envObj.x,
                        y: envObj.y,
                        width: envObj.width,
                        height: envObj.height,
                        opened: (envObj.stateFlags & 1) !== 0,
                        activated: (envObj.stateFlags & 2) !== 0,
                        locked: (envObj.stateFlags & 4) !== 0
                    });
                } else {
                    this.decorations.push(envObj);
                }
                
                this.environmentObjects.push(envObj);
                } catch (objError) {
                    console.error(`Error loading environment object at index ${i}:`, objError);
                    break; // Stop processing if we hit an index error
                }
            }

            // Load weather state from WASM
            this.weather = {
                type: this.getWeatherTypeFromWasm(wasmModule),
                intensity: wasmModule.get_weather_rain_intensity(),
                temperature: wasmModule.get_weather_temperature(),
                humidity: wasmModule.get_weather_humidity(),
                windSpeed: wasmModule.get_weather_wind_speed(),
                lightningActive: wasmModule.is_lightning_active() === 1
            };

            console.log(`Loaded ${objectCount} environment objects from WASM for biome ${this.currentBiome}`);
            
        } catch (error) {
            console.warn('Failed to load environment from WASM, falling back to legacy generation:', error);
            this.generateLegacyEnvironment();
        }
    }

    // Convert WASM environment type enum to string
    getEnvironmentTypeString(typeEnum) {
        const typeMap = {
            0: 'tree',
            1: 'rock', 
            2: 'bush',
            3: 'swamp_tree',
            4: 'lilypad',
            5: 'snow_patch',
            6: 'grass_tuft',
            7: 'crate',
            8: 'barrel',
            9: 'chest',
            10: 'lever',
            11: 'door'
        };
        return typeMap[typeEnum] || 'unknown';
    }

    // Determine weather type from WASM state
    getWeatherTypeFromWasm(wasmModule) {
        const rainIntensity = wasmModule.get_weather_rain_intensity();
        const temperature = wasmModule.get_weather_temperature();
        const lightning = wasmModule.is_lightning_active() === 1;
        
        if (lightning) return 'storm';
        if (rainIntensity > 0.5) return 'rain';
        if (rainIntensity > 0.2) return 'fog';
        if (temperature < 5) return 'snow';
        return 'clear';
    }

    // Generate environment in WASM and then load it
    generateEnvironmentInWasm(wasmModule, biomeType, seed = null) {
        if (!wasmModule) {
            console.warn('No WASM module available for environment generation');
            this.generateLegacyEnvironment();
            return;
        }

        try {
            // Use provided seed or generate one based on biome and time
            const environmentSeed = seed || (biomeType * 1000 + Date.now() % 10000);
            
            // Generate environment in WASM
            wasmModule.generate_environment(biomeType, environmentSeed);
            
            // Load the generated environment
            this.loadEnvironmentFromWasm(wasmModule);
            
            console.log(`Generated environment for biome ${biomeType} with seed ${environmentSeed}`);
            
        } catch (error) {
            console.error('Failed to generate environment in WASM:', error);
            this.generateLegacyEnvironment();
        }
    }

    // Legacy JS-based environment generation (fallback)
    generateLegacyEnvironment() {
        // Biome-specific environment generation
        switch (this.currentBiome) {
            case 0: // Forest
                this.generateForestEnvironment();
                break;
            case 1: // Swamp
                this.generateSwampEnvironment();
                break;
            case 2: // Mountains
                this.generateMountainEnvironment();
                break;
            case 3: // Plains
                this.generatePlainsEnvironment();
                break;
            default:
                // Default environment if biome not recognized
                this.generateDefaultEnvironment();
                break;
        }
    }

    // Method to change biome and regenerate environment
    changeBiome(newBiome, wasmModule = null, seed = null) {
        this.currentBiome = newBiome;
        
        if (wasmModule) {
            this.generateEnvironmentInWasm(wasmModule, newBiome, seed);
        } else {
            this.generateLegacyEnvironment();
        }
        
        // Update any biome-specific visual settings
        this.updateBiomeVisuals();
    }

    // Update visual settings based on current biome
    updateBiomeVisuals() {
        // This could be expanded to adjust lighting, particle effects, etc.
        switch (this.currentBiome) {
            case 0: // Forest
                // Adjust lighting for forest ambiance
                break;
            case 1: // Swamp
                // Add fog effects, darker lighting
                break;
            case 2: // Mountains
                // Cooler lighting, snow effects
                break;
            case 3: // Plains
                // Bright, open lighting
                break;
        }
    }

    // Update method to be called each frame for environmental effects
    update(deltaTime, wasmModule = null) {
        // Update any dynamic environment elements
        if (this.environmentObjects) {
            this.environmentObjects.forEach(obj => {
                // Update animated objects (like flowing water, swaying trees)
                if (obj.type === 'lilypad') {
                    // Gentle bobbing animation
                    obj.animationOffset = (obj.animationOffset || 0) + deltaTime;
                }
            });
        }

        // Check for environmental hazards affecting the player
        if (wasmModule && this.player) {
            const hazard = this.checkEnvironmentalHazards(this.player.x, this.player.y, wasmModule);
            if (hazard) {
                this.onEnvironmentalHazard(hazard);
            }
        }
    }

    // Handle environmental hazard effects
    onEnvironmentalHazard(hazard) {
        // This would typically be handled by a game state manager
        // For now, just log the hazard for debugging
        console.log(`Player in ${hazard.type} hazard (severity: ${hazard.severity})`);
        
        // Could trigger visual effects, damage, status effects, etc.
        // Example: camera shake, screen tint, particle effects
    }

    // Method to interact with environment objects
    interactWithObject(objectIndex, wasmModule) {
        if (!wasmModule) return false;

        try {
            const result = wasmModule.interact_with_environment_object(objectIndex);
            if (result === 1) {
                // Update the local object state to match WASM state
                this.updateEnvironmentObjectState(objectIndex, wasmModule);
                return true;
            }
        } catch (error) {
            console.warn('Failed to interact with environment object:', error);
        }

        return false;
    }

    // Update local environment object state from WASM
    updateEnvironmentObjectState(objectIndex, wasmModule) {
        if (objectIndex < 0 || objectIndex >= this.environmentObjects.length) return;

        try {
            const newStateFlags = wasmModule.get_environment_object_state_flags(objectIndex);
            const obj = this.environmentObjects[objectIndex];
            
            // Update state based on flags
            if (obj.isInteractable) {
                const interactableObj = this.interactables.find(i => 
                    i.x === obj.x && i.y === obj.y && i.type === obj.type
                );
                
                if (interactableObj) {
                    interactableObj.opened = (newStateFlags & 1) !== 0;
                    interactableObj.activated = (newStateFlags & 2) !== 0;
                    interactableObj.locked = (newStateFlags & 4) !== 0;
                }
            }
        } catch (error) {
            console.warn('Failed to update environment object state:', error);
        }
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
        if (!this.useExternalPlayer) {
            this.renderPlayer()
        }
        this.renderProjectiles()
        this.renderLighting()
        this.renderWeather()
        
        // Restore context
        this.ctx.restore()
        
        // Render UI elements (not affected by camera)
        this.renderUI()
    }
    
    renderBackground() {
        // Biome-specific sky or base background color
        switch (this.currentBiome) {
            case 0: // Forest
                this.ctx.fillStyle = '#4CAF50'; // Forest green sky
                break;
            case 1: // Swamp
                this.ctx.fillStyle = '#5D4037'; // Murky brown sky
                break;
            case 2: // Mountains
                this.ctx.fillStyle = '#78909C'; // Grayish blue sky
                break;
            case 3: // Plains
                this.ctx.fillStyle = '#8BC34A'; // Light green sky
                break;
            default: // Default/Unknown Biome
                this.ctx.fillStyle = '#87CEEB'; // Sky blue
                break;
        }
        this.ctx.fillRect(
            this.camera.x - this.canvas.width / 2,
            this.camera.y - this.canvas.height / 2,
            this.canvas.width,
            this.canvas.height
        );

        // Biome-specific background elements (mountains, distant trees, etc.)
        switch (this.currentBiome) {
            case 0: // Forest
                this.renderParallaxLayer(0.3, () => {
                    this.ctx.fillStyle = '#388E3C'; // Darker forest green
                    this.drawMountain(200, 400, 300, 200);
                    this.drawMountain(500, 400, 400, 250);
                    this.drawMountain(900, 400, 350, 180);
                });
                this.renderParallaxLayer(0.5, () => {
                    this.ctx.fillStyle = '#66BB6A'; // Lighter forest green trees
                    for (let i = 0; i < 15; i++) {
                        this.drawBackgroundTree(i * 150 + 50, 380, 70, 120);
                    }
                });
                break;
            case 1: // Swamp
                this.renderParallaxLayer(0.4, () => {
                    this.ctx.fillStyle = '#8D6E63'; // Brown for distant swamp elements
                    for (let i = 0; i < 10; i++) {
                        this.drawSwampTree(i * 200 + 100, 380, 80, 150);
                    }
                });
                break;
            case 2: // Mountains
                this.renderParallaxLayer(0.3, () => {
                    this.ctx.fillStyle = '#546E7A'; // Darker gray for mountains
                    this.drawMountain(200, 400, 350, 250);
                    this.drawMountain(600, 400, 500, 300);
                    this.drawMountain(1000, 400, 400, 220);
                });
                this.renderParallaxLayer(0.5, () => {
                    this.ctx.fillStyle = '#B0BEC5'; // Snowy peaks
                    this.drawSnowyMountain(300, 350, 300, 180);
                    this.drawSnowyMountain(800, 350, 400, 220);
                });
                break;
            case 3: // Plains
                this.renderParallaxLayer(0.6, () => {
                    this.ctx.fillStyle = '#C5E1A5'; // Lighter green for rolling hills
                    for (let i = 0; i < 5; i++) {
                        this.drawHill(i * 300 + 100, 450, 200, 80);
                    }
                });
                break;
            default: // Default (generic) background elements
                this.renderParallaxLayer(0.3, () => {
                    this.ctx.fillStyle = '#607D8B'; // Grayish blue mountains
                    this.drawMountain(200, 400, 300, 200);
                    this.drawMountain(500, 400, 400, 250);
                    this.drawMountain(900, 400, 350, 180);
                });
                break;
        }
    }
    
    renderParallaxLayer(scrollFactor, renderFunc) {
        this.ctx.save()
        this.ctx.translate(
            -this.camera.x * scrollFactor,
            -this.camera.y * scrollFactor
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
    
    drawSwampTree(x, y, width, height) {
        // Trunk (taller, thinner, darker)
        this.ctx.fillStyle = '#4a3c28'; 
        this.ctx.fillRect(x + width * 0.45, y - height * 0.2, width * 0.1, height * 0.6);
        
        // Twisted canopy
        this.ctx.fillStyle = '#3e4e3d'; // Murky green
        this.ctx.beginPath();
        this.ctx.ellipse(x + width / 2, y - height * 0.4, width * 0.3, height * 0.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + width * 0.3, y - height * 0.3, width * 0.25, height * 0.15, -Math.PI / 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + width * 0.7, y - height * 0.3, width * 0.25, height * 0.15, Math.PI / 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Water reflection (simple)
        this.ctx.fillStyle = 'rgba(42, 42, 30, 0.4)';
        this.ctx.fillRect(x + width * 0.45, y + height * 0.4, width * 0.1, height * 0.2);
    }

    drawSnowyMountain(x, y, width, height) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - width / 2, y);
        this.ctx.lineTo(x, y - height);
        this.ctx.lineTo(x + width / 2, y);
        this.ctx.closePath();
        this.ctx.fill();

        // Snowy cap
        this.ctx.fillStyle = '#e0e8f0'; // Light blue-white
        this.ctx.beginPath();
        this.ctx.moveTo(x - width * 0.2, y - height * 0.7);
        this.ctx.lineTo(x, y - height - 5); // Peak slightly higher
        this.ctx.lineTo(x + width * 0.2, y - height * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawHill(x, y, width, height) {
        this.ctx.fillStyle = '#6a8e5a'; // Greenish-brown
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width / 2, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Grass texture (simple)
        this.ctx.fillStyle = '#7aa36a'; // Lighter green
        for(let i = 0; i < 10; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x - width/2 + Math.random() * width, y - height/2 + Math.random() * height/2, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderPlatforms() {
        // Clear existing platforms for biome-specific generation
        this.platforms = [];
        
        // First, read obstacles from WASM if available
        if (window.wasmExports && typeof window.wasmExports.get_obstacle_count === 'function') {
            const obstacleCount = window.wasmExports.get_obstacle_count();
            
            // Validate obstacle count to prevent bounds errors
            const safeObstacleCount = Number.isInteger(obstacleCount) && obstacleCount >= 0 ? Math.min(obstacleCount, 1000) : 0;
            
            for (let i = 0; i < safeObstacleCount; i++) {
                if (typeof window.wasmExports.get_obstacle_x === 'function' &&
                    typeof window.wasmExports.get_obstacle_y === 'function' &&
                    typeof window.wasmExports.get_obstacle_r === 'function') {
                    
                    try {
                        const wasmX = window.wasmExports.get_obstacle_x(i);
                        const wasmY = window.wasmExports.get_obstacle_y(i);
                        const wasmR = window.wasmExports.get_obstacle_r(i);
                    
                    // Convert WASM coordinates to world coordinates
                    const worldPos = this.wasmToWorld(wasmX, wasmY);
                    const worldRadius = wasmR * (this.world.width / 3); // Scale radius
                    
                    // Add WASM obstacle as a platform
                    this.platforms.push({
                        x: worldPos.x - worldRadius,
                        y: worldPos.y - worldRadius,
                        width: worldRadius * 2,
                        height: worldRadius * 2,
                        type: 'wasm_obstacle',
                        color: '#666666',
                        isCircular: true,
                        centerX: worldPos.x,
                        centerY: worldPos.y,
                        radius: worldRadius
                    });
                    } catch (obstacleError) {
                        console.error(`Error loading obstacle at index ${i}:`, obstacleError);
                        break; // Stop processing if we hit an index error
                    }
                }
            }
        }
        
        // Generate additional ground platforms based on biome
        switch (this.currentBiome) {
            case 0: // Forest
                this.platforms.push({
                    x: 0, y: 450, width: 2000, height: 100,
                    type: 'forest_ground', color: '#3e4444'
                });
                // Additional forest platforms
                this.platforms.push({ x: 300, y: 350, width: 150, height: 20, type: 'wooden', color: '#795548' });
                this.platforms.push({ x: 700, y: 280, width: 120, height: 20, type: 'wooden', color: '#795548' });
                break;
            case 1: // Swamp
                this.platforms.push({
                    x: 0, y: 480, width: 2000, height: 100,
                    type: 'swamp_ground', color: '#5D4037'
                });
                // Floating logs/lily pads
                this.platforms.push({ x: 250, y: 420, width: 80, height: 15, type: 'log', color: '#795548' });
                this.platforms.push({ x: 550, y: 400, width: 100, height: 15, type: 'log', color: '#795548' });
                break;
            case 2: // Mountains
                this.platforms.push({
                    x: 0, y: 400, width: 2000, height: 150,
                    type: 'mountain_ground', color: '#607D8B'
                });
                // Rocky ledges
                this.platforms.push({ x: 200, y: 300, width: 180, height: 30, type: 'rocky', color: '#90A4AE' });
                this.platforms.push({ x: 600, y: 250, width: 200, height: 30, type: 'rocky', color: '#90A4AE' });
                break;
            case 3: // Plains
                this.platforms.push({
                    x: 0, y: 500, width: 2000, height: 80,
                    type: 'plains_ground', color: '#8BC34A'
                });
                // Gentle slopes/small hills
                this.platforms.push({ x: 300, y: 450, width: 100, height: 20, type: 'hill', color: '#A2D27E' });
                this.platforms.push({ x: 700, y: 430, width: 120, height: 20, type: 'hill', color: '#A2D27E' });
                break;
            default: // Default
                this.platforms.push({
                    x: 0, y: 450, width: 2000, height: 100,
                    type: 'ground', color: '#3e4444'
                });
                break;
        }
        
        this.platforms.forEach(platform => {
            this.ctx.save();
            
            if (platform.isCircular) {
                // Render circular obstacles from WASM
                // Shadow
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(platform.centerX + 3, platform.centerY + 3, platform.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Main body with gradient
                const gradient = this.ctx.createRadialGradient(
                    platform.centerX - platform.radius * 0.3,
                    platform.centerY - platform.radius * 0.3,
                    0,
                    platform.centerX,
                    platform.centerY,
                    platform.radius
                );
                
                // Biome-specific colors for WASM obstacles
                let color1, color2;
                switch (this.currentBiome) {
                    case 0: // Forest
                        color1 = '#8B4513'; // Saddle brown (tree trunks)
                        color2 = '#654321'; // Dark brown
                        break;
                    case 1: // Swamp
                        color1 = '#556B2F'; // Dark olive green (moss-covered)
                        color2 = '#2F4F2F'; // Dark sea green
                        break;
                    case 2: // Mountains
                        color1 = '#708090'; // Slate gray (rocks)
                        color2 = '#2F4F4F'; // Dark slate gray
                        break;
                    case 3: // Plains
                        color1 = '#D2B48C'; // Tan (dirt mounds)
                        color2 = '#A0522D'; // Sienna
                        break;
                    default:
                        color1 = '#888888';
                        color2 = '#555555';
                        break;
                }
                
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(platform.centerX, platform.centerY, platform.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Highlight
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.globalAlpha = 0.3;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(platform.centerX, platform.centerY, platform.radius - 2, Math.PI * 1.2, Math.PI * 1.8);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                
            } else {
                // Regular rectangular platform rendering
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
            
            let platformColor1, platformColor2;
            switch (platform.type) {
                case 'forest_ground':
                    platformColor1 = '#4CAF50';
                    platformColor2 = '#388E3C';
                    break;
                case 'swamp_ground':
                    platformColor1 = '#5D4037';
                    platformColor2 = '#3E2723';
                    break;
                case 'mountain_ground':
                    platformColor1 = '#607D8B';
                    platformColor2 = '#455A64';
                    break;
                case 'plains_ground':
                    platformColor1 = '#8BC34A';
                    platformColor2 = '#689F38';
                    break;
                case 'wooden':
                    platformColor1 = '#A1887F';
                    platformColor2 = '#795548';
                    break;
                case 'log':
                    platformColor1 = '#8D6E63';
                    platformColor2 = '#6D4C41';
                    break;
                case 'rocky':
                    platformColor1 = '#90A4AE';
                    platformColor2 = '#607D8B';
                    break;
                case 'hill':
                    platformColor1 = '#A2D27E';
                    platformColor2 = '#7CB342';
                    break;
                default:
                    platformColor1 = '#718096';
                    platformColor2 = '#4a5568';
                    break;
            }
            gradient.addColorStop(0, platformColor1);
            gradient.addColorStop(1, platformColor2);
            
            this.ctx.fillStyle = gradient
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
            
                // Platform edge highlight
                this.ctx.strokeStyle = '#a0aec0'
                this.ctx.lineWidth = 2
                this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height)
            }
            
            this.ctx.restore();
        })
    }
    
    renderDecorations() {
        // Use existing decorations from WASM or legacy generation
        // Apply frustum culling for performance
        const visibleDecorations = this.getVisibleObjects(this.decorations);
        
        visibleDecorations.forEach(deco => {
            // Level of detail based on distance from camera
            const distance = Math.sqrt(
                Math.pow(deco.x - this.camera.x, 2) + 
                Math.pow(deco.y - this.camera.y, 2)
            );
            
            // Skip very distant objects for performance
            if (distance > 1000) return;
            
            this.ctx.save()
            
            // Reduce detail for distant objects
            const isDetailed = distance < 500;
            
            switch(deco.type) {
                case 'tree':
                    this.drawTree(deco.x, deco.y, deco.width, deco.height, isDetailed)
                    break
                case 'rock':
                    this.drawRock(deco.x, deco.y, deco.width, deco.height, isDetailed)
                    break
                case 'bush':
                    this.drawBush(deco.x, deco.y, deco.width, deco.height, isDetailed)
                    break
                case 'crate':
                    this.drawCrate(deco.x, deco.y, deco.width, deco.height, isDetailed)
                    break
                case 'barrel':
                    this.drawBarrel(deco.x, deco.y, deco.width, deco.height, isDetailed)
                    break
                case 'swamp_tree':
                    this.drawSwampTreeForeground(deco.x, deco.y, deco.width, deco.height, isDetailed);
                    break;
                case 'lilypad':
                    this.drawLilyPad(deco.x, deco.y, deco.width, isDetailed);
                    break;
                case 'snow_patch':
                    this.drawSnowPatch(deco.x, deco.y, deco.width, deco.height, isDetailed);
                    break;
                case 'grass_tuft':
                    this.drawGrassTuft(deco.x, deco.y, deco.width, deco.height, isDetailed);
                    break;
            }
            
            this.ctx.restore()
        })
    }

    // Frustum culling for performance optimization
    getVisibleObjects(objects) {
        const margin = 100; // Extra margin for objects partially visible
        const left = this.camera.x - this.camera.width / 2 - margin;
        const right = this.camera.x + this.camera.width / 2 + margin;
        const top = this.camera.y - this.camera.height / 2 - margin;
        const bottom = this.camera.y + this.camera.height / 2 + margin;

        return objects.filter(obj => {
            return obj.x + obj.width >= left && 
                   obj.x <= right && 
                   obj.y + obj.height >= top && 
                   obj.y <= bottom;
        });
    }

    // Spatial partitioning for environmental hazards
    checkEnvironmentalHazards(playerX, playerY, wasmModule) {
        if (!wasmModule) return null;

        try {
            const hazardType = wasmModule.check_player_in_hazard(playerX, playerY);
            
            if (hazardType >= 0) {
                return {
                    type: this.getHazardTypeName(hazardType),
                    severity: this.getHazardSeverity(hazardType)
                };
            }
        } catch (error) {
            console.warn('Failed to check environmental hazards:', error);
        }

        return null;
    }

    // Convert hazard type enum to readable name
    getHazardTypeName(hazardType) {
        const hazardNames = {
            0: 'lava',
            1: 'quicksand',
            2: 'bog',
            3: 'acid',
            4: 'poison_gas'
        };
        return hazardNames[hazardType] || 'unknown';
    }

    // Get hazard severity for UI feedback
    getHazardSeverity(hazardType) {
        const severityMap = {
            0: 'high',    // lava
            1: 'medium',  // quicksand
            2: 'low',     // bog
            3: 'high',    // acid
            4: 'medium'   // poison gas
        };
        return severityMap[hazardType] || 'low';
    }
    
    drawTree(x, y, width, height, detailed = true) {
        if (detailed) {
            // Trunk
            this.ctx.fillStyle = '#8b4513'
            this.ctx.fillRect(x + width * 0.35, y, width * 0.3, height * 0.4)
            
            // Leaves (detailed)
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
        } else {
            // Simplified distant rendering
            this.ctx.fillStyle = '#8b4513'
            this.ctx.fillRect(x + width * 0.4, y, width * 0.2, height * 0.4)
            this.ctx.fillStyle = '#228b22'
            this.ctx.fillRect(x, y - height * 0.4, width, height * 0.6)
        }
    }
    
    drawRock(x, y, width, height, detailed = true) {
        this.ctx.fillStyle = '#696969'
        this.ctx.beginPath()
        this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
        this.ctx.fill()
        
        if (detailed) {
            // Highlight
            this.ctx.fillStyle = '#808080'
            this.ctx.beginPath()
            this.ctx.ellipse(x + width * 0.4, y + height * 0.3, width * 0.2, height * 0.2, 0, 0, Math.PI * 2)
            this.ctx.fill()
        }
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

    drawSwampTreeForeground(x, y, width, height) {
        // Trunk
        this.ctx.fillStyle = '#4a3c28'; 
        this.ctx.fillRect(x + width * 0.45, y - height * 0.2, width * 0.1, height * 0.6);
        
        // Twisted canopy
        this.ctx.fillStyle = '#3e4e3d';
        this.ctx.beginPath();
        this.ctx.ellipse(x + width / 2, y - height * 0.4, width * 0.3, height * 0.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + width * 0.3, y - height * 0.3, width * 0.25, height * 0.15, -Math.PI / 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + width * 0.7, y - height * 0.3, width * 0.25, height * 0.15, Math.PI / 6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLilyPad(x, y, size) {
        this.ctx.fillStyle = '#689F38';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        // Cutout for realism
        this.ctx.fillStyle = '#5D4037'; // Swamp water color
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.4, y);
        this.ctx.lineTo(x + size * 0.2, y + size * 0.2);
        this.ctx.lineTo(x, y + size * 0.2);
        this.ctx.fill();
    }

    drawSnowPatch(x, y, width, height) {
        this.ctx.fillStyle = '#E0E0E0';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawGrassTuft(x, y, width, height) {
        this.ctx.fillStyle = '#A2D27E';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height);
        this.ctx.quadraticCurveTo(x + width / 2, y - height, x + width, y + height);
        this.ctx.fill();
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
        // First render WASM landmarks and exits
        this.renderWasmLandmarks();
        this.renderWasmExits();
        
        // Then render regular interactables
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
    
    renderWasmLandmarks() {
        if (!window.wasmExports || typeof window.wasmExports.get_landmark_count !== 'function') return;
        
        try {
            const landmarkCount = window.wasmExports.get_landmark_count();
            
            // Validate landmark count to prevent bounds errors
            const safeLandmarkCount = Number.isInteger(landmarkCount) && landmarkCount >= 0 ? Math.min(landmarkCount, 100) : 0;
            
            for (let i = 0; i < safeLandmarkCount; i++) {
                if (typeof window.wasmExports.get_landmark_x === 'function' &&
                    typeof window.wasmExports.get_landmark_y === 'function') {
                    
                    try {
                        const wasmX = window.wasmExports.get_landmark_x(i);
                        const wasmY = window.wasmExports.get_landmark_y(i);
                        const worldPos = this.wasmToWorld(wasmX, wasmY);
                        
                        this.drawLandmark(worldPos.x, worldPos.y, i);
                    } catch (landmarkError) {
                        console.error(`Error rendering landmark at index ${i}:`, landmarkError);
                        break; // Stop processing if we hit an index error
                    }
                }
            }
        } catch (error) {
            console.error('Error rendering WASM landmarks:', error);
        }
    }
    
    renderWasmExits() {
        if (!window.wasmExports || typeof window.wasmExports.get_exit_count !== 'function') return;
        
        try {
            const exitCount = window.wasmExports.get_exit_count();
            
            // Validate exit count to prevent bounds errors
            const safeExitCount = Number.isInteger(exitCount) && exitCount >= 0 ? Math.min(exitCount, 50) : 0;
            
            for (let i = 0; i < safeExitCount; i++) {
                if (typeof window.wasmExports.get_exit_x === 'function' &&
                    typeof window.wasmExports.get_exit_y === 'function') {
                    
                    try {
                        const wasmX = window.wasmExports.get_exit_x(i);
                        const wasmY = window.wasmExports.get_exit_y(i);
                        const worldPos = this.wasmToWorld(wasmX, wasmY);
                        
                        this.drawExit(worldPos.x, worldPos.y, i);
                    } catch (exitError) {
                        console.error(`Error rendering exit at index ${i}:`, exitError);
                        break; // Stop processing if we hit an index error
                    }
                }
            }
        } catch (error) {
            console.error('Error rendering WASM exits:', error);
        }
    }
    
    drawLandmark(x, y, index) {
        this.ctx.save();
        
        // Pulsing glow effect
        const time = Date.now() / 1000;
        const pulse = 0.8 + 0.2 * Math.sin(time * 2 + index);
        
        // Glow
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 20 * pulse;
        
        // Main landmark body (crystal/obelisk style)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 30);
        this.ctx.lineTo(x - 15, y);
        this.ctx.lineTo(x - 8, y + 20);
        this.ctx.lineTo(x + 8, y + 20);
        this.ctx.lineTo(x + 15, y);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Inner light
        this.ctx.fillStyle = '#FFFF99';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 25);
        this.ctx.lineTo(x - 10, y - 5);
        this.ctx.lineTo(x - 5, y + 15);
        this.ctx.lineTo(x + 5, y + 15);
        this.ctx.lineTo(x + 10, y - 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        
        this.ctx.restore();
    }
    
    drawExit(x, y, index) {
        this.ctx.save();
        
        // Portal effect
        const time = Date.now() / 1000;
        const rotation = time + index * Math.PI / 2;
        
        // Portal ring
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#00FFFF';
        this.ctx.shadowBlur = 15;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner swirl
        this.ctx.strokeStyle = '#0099FF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = rotation + i * (Math.PI * 2 / 3);
            const radius = 15;
            this.ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            this.ctx.arc(x, y, radius, angle, angle + Math.PI / 2);
        }
        this.ctx.stroke();
        
        // Center core
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        
        this.ctx.restore();
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
        // Disabled enemy rendering - canvas cleaned for player-only view
        // this.enemies.forEach(enemy => {
        //     if (enemy.health <= 0) {return}
        //
        //     // Check if this is a wolf enemy
        //     if (enemy instanceof WolfCharacter) {
        //         // Update wolf using its own update method
        //         enemy.render(this.ctx, this.camera)
        //     } else {
        //         // Render other enemy types
        //         this.ctx.save()
        //
        //         // Get position (handle both old and new formats)
        //         const x = enemy.position ? enemy.position.x : enemy.x
        //         const y = enemy.position ? enemy.position.y : enemy.y
        //
        //         // Enemy body
        //         this.drawCharacter(
        //             x,
        //             y,
        //             enemy.width,
        //             enemy.height,
        //             enemy.color,
        //             enemy.facing,
        //             enemy.state,
        //             enemy.animationFrame
        //         )
        //
        //         // Alert indicator
        //         if (enemy.isAlerted) {
        //             this.ctx.fillStyle = '#ff0000'
        //             this.ctx.font = 'bold 16px Arial'
        //             this.ctx.textAlign = 'center'
        //             this.ctx.fillText('!', x + enemy.width / 2, y - 10)
        //         }
        //
        //         // Health bar
        //         if (enemy.health < enemy.maxHealth) {
        //             this.drawHealthBar(
        //                 x,
        //                 y - 15,
        //                 enemy.width,
        //                 8,
        //                 enemy.health,
        //                 enemy.maxHealth
        //             )
        //         }
        //
        //         // Special enemy features
        //         if (enemy.type === 'archer') {
        //             this.drawBow(enemy)
        //         } else if (enemy.type === 'heavy') {
        //             this.drawShield(enemy)
        //         }
        //
        //         this.ctx.restore()
        //     }
        // })
    }
    
    renderPlayer() {
        if (!window.wasmExports) return;
        
        this.ctx.save()

        // Get player state from WASM
        const wasmX = typeof window.wasmExports.get_x === 'function' ? window.wasmExports.get_x() : 0.5;
        const wasmY = typeof window.wasmExports.get_y === 'function' ? window.wasmExports.get_y() : 0.5;
        const velX = typeof window.wasmExports.get_vel_x === 'function' ? window.wasmExports.get_vel_x() : 0;
        const velY = typeof window.wasmExports.get_vel_y === 'function' ? window.wasmExports.get_vel_y() : 0;
        const isGrounded = typeof window.wasmExports.get_is_grounded === 'function' ? window.wasmExports.get_is_grounded() : 1;
        const isRolling = typeof window.wasmExports.get_is_rolling === 'function' ? window.wasmExports.get_is_rolling() : 0;
        const isBlocking = typeof window.wasmExports.get_block_state === 'function' ? window.wasmExports.get_block_state() : 0;
        const animState = typeof window.wasmExports.get_player_anim_state === 'function' ? window.wasmExports.get_player_anim_state() : 0;
        const jumpCount = typeof window.wasmExports.get_jump_count === 'function' ? window.wasmExports.get_jump_count() : 0;
        const isWallSliding = typeof window.wasmExports.get_is_wall_sliding === 'function' ? window.wasmExports.get_is_wall_sliding() : 0;
        const stateTimer = typeof window.wasmExports.get_player_state_timer === 'function' ? window.wasmExports.get_player_state_timer() : 0;

        // Convert player position from WASM normalized coordinates to world coordinates
        const playerWorldPos = this.wasmToWorld(wasmX, wasmY)

        // Update internal player state for compatibility
        this.player.x = wasmX;
        this.player.y = wasmY;
        this.player.velocityX = velX;
        this.player.velocityY = velY;
        this.player.isGrounded = isGrounded;
        
        // Determine facing direction from velocity
        if (Math.abs(velX) > 0.01) {
            this.player.facing = velX > 0 ? 1 : -1;
        }

        // Player shadow (larger when airborne)
        const shadowSize = isGrounded ? this.player.width / 2 : this.player.width / 3;
        const shadowOpacity = isGrounded ? 0.3 : 0.2;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`
        this.ctx.beginPath()
        this.ctx.ellipse(
            playerWorldPos.x + this.player.width / 2,
            playerWorldPos.y + this.player.height + (isGrounded ? 5 : 15),
            shadowSize,
            5,
            0, 0, Math.PI * 2
        )
        this.ctx.fill()

        // Animation state mapping
        const animStateNames = [
            'idle', 'running', 'attacking', 'blocking', 'rolling', 'hurt', 'dead',
            'jumping', 'double_jumping', 'landing', 'wall_sliding', 'dashing', 'charging_attack'
        ];
        const currentAnimState = animStateNames[animState] || 'idle';

        // Player body with enhanced visual effects
        this.drawEnhancedCharacter(
            playerWorldPos.x,
            playerWorldPos.y,
            this.player.width,
            this.player.height,
            this.player.color,
            this.player.facing,
            currentAnimState,
            stateTimer,
            {
                isGrounded,
                isRolling,
                isBlocking,
                jumpCount,
                isWallSliding,
                velX,
                velY
            }
        )
        
        // Weapon effects
        if (currentAnimState === 'attacking') {
            this.drawWeaponTrail(playerWorldPos, this.player.facing, stateTimer);
        }
        
        // Status effects
        if (isBlocking) {
            this.drawShieldEffect(playerWorldPos, this.player.facing);
        }
        
        if (isRolling) {
            this.drawRollTrail(playerWorldPos, velX, velY);
        }
        
        if (isWallSliding) {
            this.drawWallSlideEffect(playerWorldPos, this.player.facing);
        }
        
        // Jump/double jump effects
        if (!isGrounded && jumpCount > 0) {
            this.drawAirborneEffects(playerWorldPos, jumpCount, velY);
        }
        
        this.ctx.restore()
    }
    
    drawEnhancedCharacter(x, y, width, height, color, facing, state, stateTimer, effects) {
        const time = Date.now() / 1000;
        
        // State-specific color modifications
        let bodyColor = color;
        if (state === 'hurt') {
            bodyColor = '#ff6b6b';
        } else if (state === 'blocking') {
            bodyColor = this.blendColors(color, '#4488ff', 0.3);
        } else if (state === 'rolling') {
            bodyColor = this.blendColors(color, '#ffffff', 0.2);
        } else if (state === 'wall_sliding') {
            bodyColor = this.blendColors(color, '#ffaa00', 0.2);
        }
        
        this.ctx.fillStyle = bodyColor;
        
        // Animation-specific transforms
        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        
        // State-specific rotations and scaling
        if (state === 'rolling') {
            this.ctx.rotate(stateTimer * 20); // Spinning effect
        } else if (state === 'wall_sliding') {
            this.ctx.scale(1, 1.1); // Stretched vertically
            this.ctx.rotate(facing * 0.1); // Slight lean
        } else if (state === 'landing' && stateTimer < 0.2) {
            const squash = 1 - (stateTimer / 0.2) * 0.3;
            this.ctx.scale(1.2, squash); // Squash and stretch
        } else if (!effects.isGrounded && effects.velY < -0.2) {
            this.ctx.scale(0.9, 1.1); // Stretched when jumping up
        } else if (!effects.isGrounded && effects.velY > 0.2) {
            this.ctx.scale(1.1, 0.9); // Compressed when falling
        }
        
        // Translate back to corner for drawing
        this.ctx.translate(-width / 2, -height / 2);
        
        // Torso
        this.ctx.fillRect(width * 0.25, height * 0.3, width * 0.5, height * 0.4);
        
        // Head
        this.ctx.beginPath();
        this.ctx.arc(width / 2, height * 0.2, width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Arms with state-specific animation
        let armOffset = 0;
        if (state === 'running') {
            armOffset = Math.sin(time * 8) * 8;
        } else if (state === 'attacking') {
            armOffset = Math.sin(stateTimer * 30) * 15;
        } else if (state === 'blocking') {
            armOffset = -5; // Arms up for blocking
        }
        
        this.ctx.fillRect(width * 0.1, height * 0.35 + armOffset, width * 0.15, height * 0.3);
        this.ctx.fillRect(width * 0.75, height * 0.35 - armOffset, width * 0.15, height * 0.3);
        
        // Legs with state-specific animation
        let legOffset = 0;
        if (state === 'running') {
            legOffset = Math.sin(time * 8 + Math.PI) * 12;
        } else if (state === 'jumping' || state === 'double_jumping') {
            legOffset = -10; // Legs tucked up
        } else if (state === 'landing') {
            legOffset = 5; // Legs extended for landing
        }
        
        this.ctx.fillRect(width * 0.25, height * 0.65 + Math.max(0, legOffset), width * 0.2, height * 0.35);
        this.ctx.fillRect(width * 0.55, height * 0.65 + Math.max(0, -legOffset), width * 0.2, height * 0.35);
        
        // Eyes
        this.ctx.fillStyle = '#ffffff';
        const eyeX = facing === 1 ? width * 0.55 : width * 0.35;
        this.ctx.fillRect(eyeX, height * 0.15, width * 0.1, height * 0.05);
        
        // State-specific details
        if (state === 'blocking') {
            // Block stance indicator
            this.ctx.fillStyle = '#4488ff';
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillRect(width * 0.8 * facing, height * 0.2, width * 0.1, height * 0.6);
            this.ctx.globalAlpha = 1;
        }
        
        this.ctx.restore();
    }
    
    drawCharacter(x, y, width, height, color, facing, state, frame) {
        // Fallback to simple character drawing for compatibility
        this.drawEnhancedCharacter(x, y, width, height, color, facing, state, 0, {
            isGrounded: true,
            isRolling: state === 'rolling',
            isBlocking: state === 'blocking',
            jumpCount: 0,
            isWallSliding: state === 'wall_sliding',
            velX: 0,
            velY: 0
        });
    }
    
    blendColors(color1, color2, ratio) {
        // Simple color blending helper
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
        const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
        const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 74, g: 144, b: 226}; // Default blue
    }
    
    drawWeaponTrail(pos, facing, stateTimer) {
        this.ctx.save();
        
        const angle = Math.sin(stateTimer * 15) * Math.PI / 3;
        const trailLength = 40;
        
        this.ctx.strokeStyle = '#ffddaa';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.7;
        
        this.ctx.translate(pos.x + this.player.width / 2, pos.y + this.player.height * 0.4);
        this.ctx.rotate(angle * facing);
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, trailLength, -Math.PI / 6, Math.PI / 6);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawShieldEffect(pos, facing) {
        this.ctx.save();
        
        const time = Date.now() / 1000;
        const pulse = 0.7 + 0.3 * Math.sin(time * 4);
        
        this.ctx.fillStyle = `rgba(68, 136, 255, ${0.3 * pulse})`;
        this.ctx.strokeStyle = '#4488ff';
        this.ctx.lineWidth = 2;
        
        const shieldX = pos.x + (facing > 0 ? this.player.width - 5 : -15);
        const shieldY = pos.y + this.player.height * 0.2;
        const shieldWidth = 20;
        const shieldHeight = this.player.height * 0.6;
        
        this.ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);
        this.ctx.strokeRect(shieldX, shieldY, shieldWidth, shieldHeight);
        
        this.ctx.restore();
    }
    
    drawRollTrail(pos, velX, velY) {
        this.ctx.save();
        
        const trailLength = 5;
        const speed = Math.sqrt(velX * velX + velY * velY);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        for (let i = 1; i <= trailLength; i++) {
            const alpha = (trailLength - i) / trailLength * 0.3;
            this.ctx.globalAlpha = alpha;
            
            const trailX = pos.x - velX * i * 100;
            const trailY = pos.y - velY * i * 100;
            
            this.ctx.beginPath();
            this.ctx.arc(trailX + this.player.width / 2, trailY + this.player.height / 2, 
                        this.player.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawWallSlideEffect(pos, facing) {
        this.ctx.save();
        
        const time = Date.now() / 1000;
        const sparkCount = 3;
        
        this.ctx.fillStyle = '#ffaa00';
        
        for (let i = 0; i < sparkCount; i++) {
            const sparkY = pos.y + this.player.height * (0.3 + Math.random() * 0.4);
            const sparkX = pos.x + (facing > 0 ? this.player.width + 2 : -5);
            const sparkSize = 2 + Math.random() * 3;
            
            this.ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(sparkX + Math.sin(time * 10 + i) * 3, sparkY, sparkSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawAirborneEffects(pos, jumpCount, velY) {
        this.ctx.save();
        
        if (jumpCount === 2) {
            // Double jump effect
            const time = Date.now() / 1000;
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6;
            
            for (let i = 0; i < 3; i++) {
                const radius = 20 + i * 8;
                this.ctx.beginPath();
                this.ctx.arc(pos.x + this.player.width / 2, pos.y + this.player.height / 2, 
                           radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Wind effect when falling fast
        if (velY > 0.3) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i < 3; i++) {
                const lineX = pos.x + this.player.width * (0.2 + i * 0.3);
                this.ctx.beginPath();
                this.ctx.moveTo(lineX, pos.y - 10);
                this.ctx.lineTo(lineX, pos.y - 30);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
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
        switch (this.currentBiome) {
            case 0: // Forest - light rain or mist, falling leaves
                this.weather.type = 'rain';
                this.weather.intensity = 0.2; // Light rain
                this.drawFallingLeaves(0.3); // New: falling leaves effect
                break;
            case 1: // Swamp - heavy fog and occasional rain, glowing spores
                this.weather.type = 'fog';
                this.weather.intensity = 0.6;
                if (Math.random() < 0.01) {
                    this.drawRainEffect(0.3);
                }
                this.drawGlowingSpores(0.4); // New: glowing spores effect
                break;
            case 2: // Mountains - snow and wind, shimmering cold
                this.weather.type = 'snow';
                this.weather.intensity = 0.7;
                this.drawWindEffect(0.1);
                this.drawShimmeringCold(0.2); // New: shimmering cold effect
                break;
            case 3: // Plains - clear but windy, floating dust
                this.weather.type = 'clear';
                this.weather.intensity = 0;
                this.drawWindEffect(0.2);
                this.drawFloatingDust(0.3); // New: floating dust effect
                break;
            default:
                this.weather.type = 'clear';
                this.weather.intensity = 0;
                break;
        }

        if (this.weather.type === 'rain') {
            this.drawRainEffect(this.weather.intensity);
        } else if (this.weather.type === 'snow') {
            this.drawSnowEffect(this.weather.intensity);
        } else if (this.weather.type === 'fog') {
            this.drawFogEffect(this.weather.intensity);
        }
    }
    
    renderUI() {
        // Health bar
        this.drawHealthBar(20, 20, 200, 20, this.player.health, this.player.maxHealth)
        
        // Biome display
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        const biomeNames = ['Forest', 'Swamp', 'Mountains', 'Plains'];
        this.ctx.fillText(`Biome: ${biomeNames[this.currentBiome] || 'Unknown'}`, 20, 80);
        
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
        
        // Draw player (convert from WASM normalized coordinates to world coordinates)
        const playerWorldPos = this.wasmToWorld(this.player.x, this.player.y)
        this.ctx.fillStyle = '#00ff00'
        this.ctx.fillRect(
            x + playerWorldPos.x * scaleX - 2,
            y + playerWorldPos.y * scaleY - 2,
            4, 4
        )
        
        // Border
        this.ctx.strokeStyle = '#ffffff'
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(x, y, width, height)
    }
    
    drawRainEffect(intensity) {
        this.ctx.strokeStyle = `rgba(200, 200, 255, ${0.5 * intensity})`;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 50 * intensity; i++) {
            const x = Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2;
            const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - 2, y + 10);
            this.ctx.stroke();
        }
    }

    drawSnowEffect(intensity) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`;
        for (let i = 0; i < 30 * intensity; i++) {
            const x = Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2;
            const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2;
            const size = Math.random() * 3 + 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawFogEffect(intensity) {
        this.ctx.fillStyle = `rgba(200, 200, 200, ${0.3 * intensity})`;
        this.ctx.fillRect(
            this.camera.x - this.canvas.width / 2,
            this.camera.y - this.canvas.height / 2,
            this.canvas.width,
            this.canvas.height
        );
    }

    drawWindEffect(intensity) {
        // Example: Subtle lines or particles moving across the screen
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * intensity})`;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 20 * intensity; i++) {
            const x = (Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2 + (Date.now() / 100 * 5 * intensity)) % (this.canvas.width + 200) - 100; // Drifting effect
            const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 20 * intensity, y);
            this.ctx.stroke();
        }
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
    
    // Enhanced coordinate mapping with scaling options
    wasmToWorldScaled(wasmX, wasmY, scale = 1.0) {
        const worldPos = this.wasmToWorld(wasmX, wasmY);
        return {
            x: worldPos.x * scale,
            y: worldPos.y * scale
        };
    }
    
    // Convert WASM radius to world radius
    wasmRadiusToWorld(wasmRadius) {
        return wasmRadius * (this.world.width / 3);
    }
    
    // Convert world radius to WASM radius
    worldRadiusToWasm(worldRadius) {
        return worldRadius / (this.world.width / 3);
    }
    
    // Utility to check if WASM coordinates are within bounds
    isWasmCoordValid(wasmX, wasmY) {
        return wasmX >= 0 && wasmX <= 1 && wasmY >= 0 && wasmY <= 1;
    }
    
    // Utility to check if world coordinates are within playable area
    isWorldCoordInPlayableArea(worldX, worldY) {
        const wasmCoord = this.worldToWasm(worldX, worldY);
        return this.isWasmCoordValid(wasmCoord.x, wasmCoord.y);
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

    drawFallingLeaves(intensity) {
        this.ctx.fillStyle = `rgba(139, 69, 19, ${0.4 * intensity})`; // Brownish leaves
        for (let i = 0; i < 20 * intensity; i++) {
            const x = (Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2 + (Date.now() / 1000 * 20 * intensity)) % (this.canvas.width + 50) - 25;
            const y = (Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2 + (Date.now() / 1000 * 10 * intensity)) % (this.canvas.height + 50) - 25;
            const size = Math.random() * 4 + 2;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, size / 2, size, Math.random() * Math.PI, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGlowingSpores(intensity) {
        this.ctx.fillStyle = `rgba(100, 255, 100, ${0.5 * intensity})`; // Greenish glow
        this.ctx.shadowColor = `rgba(100, 255, 100, ${0.8 * intensity})`;
        this.ctx.shadowBlur = 10;
        for (let i = 0; i < 15 * intensity; i++) {
            const x = (Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2 + (Date.now() / 1000 * 10 * intensity)) % (this.canvas.width + 50) - 25;
            const y = (Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2 + (Date.now() / 1000 * 5 * intensity)) % (this.canvas.height + 50) - 25;
            const size = Math.random() * 2 + 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0; // Reset shadow
    }

    drawShimmeringCold(intensity) {
        this.ctx.strokeStyle = `rgba(200, 220, 255, ${0.3 * intensity})`;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 10 * intensity; i++) {
            const x = Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2;
            const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.sin(Date.now() / 200 + i) * 10, y + Math.cos(Date.now() / 200 + i) * 10);
            this.ctx.stroke();
        }
    }

    drawFloatingDust(intensity) {
        this.ctx.fillStyle = `rgba(220, 180, 140, ${0.2 * intensity})`; // Dusty brownish color
        for (let i = 0; i < 30 * intensity; i++) {
            const x = (Math.random() * this.canvas.width + this.camera.x - this.canvas.width / 2 - (Date.now() / 1000 * 15 * intensity)) % (this.canvas.width + 50) - 25;
            const y = Math.random() * this.canvas.height + this.camera.y - this.canvas.height / 2;
            const size = Math.random() * 2 + 0.5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

export default GameRenderer