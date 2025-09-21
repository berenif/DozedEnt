// WASM-First Combat Systems Demo using existing source code
import { GameStateManager } from '../../src/game/game-state-manager.js';
import { InputManager } from '../../src/input/input-manager.js';
import { AnimatedPlayer } from '../../src/animation/player-animator.js';
import { WasmManager } from '../../src/wasm/wasm-manager.js';

export class WASMCombatSystemsDemo {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element with id "gameCanvas" not found');
        }
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        
        // Initialize WASM-first architecture
        this.initializePlayer();
        this.initializeWASMSystems();
        this.initializeGameSystems();

        // Game loop
        this.lastTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;

        this.gameLoop();
    }
    
    async initialize() {
        // Initialize WASM manager first
        this.wasmManager = new WasmManager();
        await this.wasmManager.initialize();
        
        // Set flag to indicate WASM input is managed externally
        globalThis.wasmInputManagedExternally = true;
        
        // Initialize other systems after WASM is ready
        this.initializePlayer();
        this.initializeGameSystems();
        
        // Start game loop
        this.gameLoop();
    }

    initializeWASMSystems() {
        // WASM manager is now initialized in the async initialize() method
        // Set global WASM exports for AnimatedPlayer
        if (this.wasmManager && this.wasmManager.exports) {
            globalThis.wasmExports = this.wasmManager.exports;
            console.log('✓ WASM Systems initialized (Real)');
        } else {
            console.warn('WASM manager not ready yet, will be set in initialize()');
        }
    }
    
    
    initializeGameSystems() {
        // Initialize GameStateManager
        this.gameStateManager = new GameStateManager();
        this.gameStateManager.initialize(this.wasmManager);
        
        // Initialize InputManager
        this.inputManager = new InputManager(this.wasmManager);
        
        console.log('✓ Game Systems initialized');
    }
    
    initializePlayer() {
        // Initialize AnimatedPlayer using existing source code
        this.player = new AnimatedPlayer(0.5, 0.5, {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            speed: 250,
            color: '#3498db',
            debugMode: false
        });
        
        // Add debug toggle
        AnimatedPlayer.attachDebugToggle(this.player, 'F3');
        
        console.log('✓ Player initialized');
    }
    
    switchCharacter(characterType) {
        // Character switching functionality using AnimatedPlayer
        const characterConfigs = {
            warden: { color: '#3498db', speed: 250 },
            raider: { color: '#e74c3c', speed: 280 },
            kensei: { color: '#9b59b6', speed: 300 }
        };
        
        const config = characterConfigs[characterType];
        if (config) {
            this.player.color = config.color;
            this.player.speed = config.speed;
            console.log(`✓ Switched to ${characterType}`);
        }
    }
    
    gameLoop(currentTime = 0) {
        let deltaTime = this.lastTime === 0 ? 0 : currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent teleporting (max 1/30th of a second)
        deltaTime = Math.min(deltaTime, 1000 / 30);

        // Update FPS
        this.fpsCounter++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFpsUpdate = currentTime;
            const fpsElement = document.getElementById('fps');
            if (fpsElement) fpsElement.textContent = this.fps;
        }

        this.update(deltaTime / 1000); // Convert to seconds
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Get input from InputManager
        const inputState = this.inputManager.getInputState();
        
        // Convert InputManager format to AnimatedPlayer format
        const playerInput = {
            // Convert direction.x/y to left/right/up/down booleans
            // Use proper threshold for responsive movement
            left: inputState.direction.x < -0.1,
            right: inputState.direction.x > 0.1,
            up: inputState.direction.y < -0.1,
            down: inputState.direction.y > 0.1,
            
            // Pass through combat actions
            lightAttack: inputState.lightAttack,
            heavyAttack: inputState.heavyAttack,
            block: inputState.block,
            roll: inputState.roll,
            special: inputState.special,
            
            // Add jump for compatibility (not used in current system)
            jump: false
        };
        
        // Update GameStateManager (handles WASM communication)
        this.gameStateManager.update(deltaTime, inputState);
        
        // Update player with converted input (but don't let it send to WASM again)
        this.player.update(deltaTime, playerInput);
        
        // Update UI
        this.updateUI();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Render player using AnimatedPlayer
        this.player.render(this.ctx);
    }
    
    drawBackground() {
        // Draw simple background
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    updateUI() {
        // Update position display
        const posElement = document.getElementById('playerPos');
        if (posElement) {
            posElement.textContent = `X: ${Math.round(this.player.x * this.canvas.width)}, Y: ${Math.round(this.player.y * this.canvas.height)}`;
        }
        
        // Update state display
        const stateElement = document.getElementById('playerState');
        if (stateElement) {
            stateElement.textContent = this.player.state;
        }
        
        // Update health display
        const healthElement = document.getElementById('playerHealth');
        if (healthElement) {
            healthElement.textContent = Math.round(this.player.health);
        }
        
        // Update stamina display
        const staminaElement = document.getElementById('playerStamina');
        if (staminaElement) {
            staminaElement.textContent = Math.round(this.player.stamina);
        }
        
        // Update health bar
        const healthBar = document.querySelector('.health-bar');
        if (healthBar) {
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            healthBar.style.width = `${healthPercent}%`;
            
            const healthText = healthBar.querySelector('.health-text');
            if (healthText) {
                healthText.textContent = `${Math.round(this.player.health)}/${this.player.maxHealth}`;
            }
        }
        
        // Update stamina bar
        const staminaBar = document.querySelector('.stamina-bar');
        if (staminaBar) {
            const staminaPercent = (this.player.stamina / this.player.maxStamina) * 100;
            staminaBar.style.width = `${staminaPercent}%`;
        }
    }
}