/**
 * Visual Effects Integration
 * 
 * Integrates the visual effects system with the WASM game
 * Provides seamless visual feedback for all game events
 */

export class VisualEffectsIntegration {
    constructor(canvas, wasmModule, gameRenderer) {
        this.canvas = canvas;
        this.wasm = wasmModule;
        this.renderer = gameRenderer;
        
        // Initialize visual effects manager
        this.visualEffects = new VisualEffectsManager(canvas, this);
        
        // Initialize phase transition effects
        this.phaseTransitions = new PhaseTransitionEffects(
            this.visualEffects,
            wasmModule,
            gameRenderer
        );
        
        // Game state tracking
        this.lastPlayerHealth = 100;
        this.lastPlayerStamina = 100;
        this.lastEnemyCount = 0;
        this.lastPhase = 0;
        
        // Effect timers
        this.lastHitEffect = 0;
        this.lastBlockEffect = 0;
        this.lastRollEffect = 0;
        
        this.init();
    }
    
    /**
     * Initialize visual effects integration
     */
    init() {
        this.setupGameEventListeners();
        this.setupWASMIntegration();
        this.setupUIEffects();
    }
    
    /**
     * Setup game event listeners
     */
    setupGameEventListeners() {
        // Listen for custom game events
        window.addEventListener('playerHit', (event) => {
            this.onPlayerHit(event.detail);
        });
        
        window.addEventListener('playerBlock', (event) => {
            this.onPlayerBlock(event.detail);
        });
        
        window.addEventListener('playerRoll', (event) => {
            this.onPlayerRoll(event.detail);
        });
        
        window.addEventListener('enemyKilled', (event) => {
            this.onEnemyKilled(event.detail);
        });
        
        window.addEventListener('phaseTransitionComplete', (event) => {
            this.onPhaseTransitionComplete(event.detail);
        });
    }
    
    /**
     * Setup WASM integration
     */
    setupWASMIntegration() {
        // Monitor WASM state changes
        this.wasmUpdateInterval = setInterval(() => {
            this.updateWASMEffects();
        }, 16); // ~60 FPS
    }
    
    /**
     * Setup UI effects
     */
    setupUIEffects() {
        // Create UI effect overlays
        this.createUIOverlays();
        
        // Setup HUD effects
        this.setupHUDEffects();
    }
    
    /**
     * Update visual effects
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update visual effects manager
        this.visualEffects.update(deltaTime);
        
        // Update phase transitions
        this.phaseTransitions.update(deltaTime);
        
        // Update UI effects
        this.updateUIEffects(deltaTime);
    }
    
    /**
     * Render visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        // Render visual effects
        this.visualEffects.render(ctx);
        
        // Render UI effects
        this.renderUIEffects(ctx);
    }
    
    /**
     * Update WASM effects
     */
    updateWASMEffects() {
        try {
            // Check for player health changes
            const currentHealth = this.wasm.get_health();
            if (currentHealth < this.lastPlayerHealth) {
                this.onPlayerTakeDamage(this.lastPlayerHealth - currentHealth);
            }
            this.lastPlayerHealth = currentHealth;
            
            // Check for stamina changes
            const currentStamina = this.wasm.get_stamina();
            if (currentStamina < this.lastPlayerStamina - 0.1) {
                this.onPlayerLowStamina();
            }
            this.lastPlayerStamina = currentStamina;
            
            // Check for enemy count changes
            const currentEnemyCount = this.wasm.get_enemy_count();
            if (currentEnemyCount < this.lastEnemyCount) {
                this.onEnemyDefeated();
            }
            this.lastEnemyCount = currentEnemyCount;
            
            // Check for phase changes
            const currentPhase = this.wasm.get_phase();
            if (currentPhase !== this.lastPhase) {
                this.onPhaseChange(this.lastPhase, currentPhase);
            }
            this.lastPhase = currentPhase;
            
        } catch (error) {
            console.error('Error updating WASM effects:', error);
        }
    }
    
    /**
     * On player take damage
     * @param {number} damage - Damage amount
     */
    onPlayerTakeDamage(damage) {
        // Screen shake based on damage
        const intensity = Math.min(damage / 100, 1.0);
        this.visualEffects.triggerScreenShake(intensity * 0.8, 500);
        
        // Red flash
        this.visualEffects.triggerFlash('#e74c3c', intensity * 0.6, 300);
        
        // Damage particles
        this.spawnDamageParticles(damage);
        
        // Update last hit effect time
        this.lastHitEffect = Date.now();
    }
    
    /**
     * On player low stamina
     */
    onPlayerLowStamina() {
        // Subtle warning effect
        this.visualEffects.triggerFlash('#f39c12', 0.2, 200);
    }
    
    /**
     * On enemy defeated
     */
    onEnemyDefeated() {
        // Victory particles
        this.spawnVictoryParticles();
        
        // Small screen shake
        this.visualEffects.triggerScreenShake(0.3, 300);
    }
    
    /**
     * On phase change
     * @param {number} fromPhase - Previous phase
     * @param {number} toPhase - New phase
     */
    onPhaseChange(fromPhase, toPhase) {
        // Phase transition effects are handled by PhaseTransitionEffects
        // This is just a placeholder for additional effects
    }
    
    /**
     * On player hit
     * @param {Object} detail - Hit details
     */
    onPlayerHit(detail) {
        const now = Date.now();
        if (now - this.lastHitEffect < 100) return; // Throttle
        
        // Hit particles
        this.spawnHitParticles(detail.x, detail.y, detail.damage);
        
        // Screen shake
        this.visualEffects.triggerScreenShake(0.4, 400);
        
        this.lastHitEffect = now;
    }
    
    /**
     * On player block
     * @param {Object} detail - Block details
     */
    onPlayerBlock(detail) {
        const now = Date.now();
        if (now - this.lastBlockEffect < 100) return; // Throttle
        
        // Block particles
        this.spawnBlockParticles(detail.x, detail.y, detail.perfect);
        
        // Block flash
        const color = detail.perfect ? '#00ff00' : '#0099ff';
        this.visualEffects.triggerFlash(color, 0.4, 200);
        
        this.lastBlockEffect = now;
    }
    
    /**
     * On player roll
     * @param {Object} detail - Roll details
     */
    onPlayerRoll(detail) {
        const now = Date.now();
        if (now - this.lastRollEffect < 100) return; // Throttle
        
        // Roll particles
        this.spawnRollParticles(detail.x, detail.y, detail.direction);
        
        // Roll flash
        this.visualEffects.triggerFlash('#9b59b6', 0.3, 300);
        
        this.lastRollEffect = now;
    }
    
    /**
     * On enemy killed
     * @param {Object} detail - Kill details
     */
    onEnemyKilled(detail) {
        // Death particles
        this.spawnDeathParticles(detail.x, detail.y, detail.type);
        
        // Screen shake
        this.visualEffects.triggerScreenShake(0.5, 400);
    }
    
    /**
     * On phase transition complete
     * @param {Object} detail - Transition details
     */
    onPhaseTransitionComplete(detail) {
        // Additional phase-specific effects
        this.applyPhaseSpecificEffects(detail.toPhase);
    }
    
    /**
     * Spawn damage particles
     * @param {number} damage - Damage amount
     */
    spawnDamageParticles(damage) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const count = Math.min(20, Math.max(5, damage / 5));
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 500 + Math.random() * 500;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#e74c3c',
                size: 2 + Math.random() * 3,
                type: 'damage'
            });
        }
    }
    
    /**
     * Spawn victory particles
     */
    spawnVictoryParticles() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 1000 + Math.random() * 500;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // Upward bias
                life: life,
                color: '#f1c40f',
                size: 2 + Math.random() * 3,
                type: 'victory'
            });
        }
    }
    
    /**
     * Spawn hit particles
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     */
    spawnHitParticles(x, y, damage) {
        const count = Math.min(15, Math.max(3, damage / 10));
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const life = 300 + Math.random() * 400;
            
            this.visualEffects.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#ff6b6b',
                size: 1 + Math.random() * 2,
                type: 'hit'
            });
        }
    }
    
    /**
     * Spawn block particles
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} perfect - Whether it's a perfect block
     */
    spawnBlockParticles(x, y, perfect) {
        const color = perfect ? '#00ff00' : '#0099ff';
        const count = perfect ? 20 : 10;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 400 + Math.random() * 300;
            
            this.visualEffects.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: color,
                size: 1 + Math.random() * 2,
                type: 'block'
            });
        }
    }
    
    /**
     * Spawn roll particles
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} direction - Roll direction
     */
    spawnRollParticles(x, y, direction) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            const life = 600 + Math.random() * 400;
            
            this.visualEffects.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#9b59b6',
                size: 1 + Math.random() * 2,
                type: 'roll'
            });
        }
    }
    
    /**
     * Spawn death particles
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - Enemy type
     */
    spawnDeathParticles(x, y, type) {
        const colors = {
            'wolf': '#8e44ad',
            'bear': '#e67e22',
            'default': '#95a5a6'
        };
        
        const color = colors[type] || colors.default;
        const count = 25;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const life = 800 + Math.random() * 600;
            
            this.visualEffects.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: color,
                size: 2 + Math.random() * 3,
                type: 'death'
            });
        }
    }
    
    /**
     * Apply phase-specific effects
     * @param {number} phase - Phase number
     */
    applyPhaseSpecificEffects(phase) {
        const effects = {
            0: () => this.setAmbientEffect('exploration'),
            1: () => this.setAmbientEffect('combat'),
            2: () => this.setAmbientEffect('choice'),
            3: () => this.setAmbientEffect('powerup'),
            4: () => this.setAmbientEffect('risk'),
            5: () => this.setAmbientEffect('escalation'),
            6: () => this.setAmbientEffect('cashout'),
            7: () => this.setAmbientEffect('reset')
        };
        
        const effect = effects[phase];
        if (effect) {
            effect();
        }
    }
    
    /**
     * Set ambient effect
     * @param {string} effect - Effect name
     */
    setAmbientEffect(effect) {
        // This would set ambient visual effects for the phase
        // Could include lighting, fog, particle systems, etc.
    }
    
    /**
     * Create UI overlays
     */
    createUIOverlays() {
        // Create UI effect overlays
        this.createDamageOverlay();
        this.createStaminaOverlay();
        this.createPhaseOverlay();
    }
    
    /**
     * Create damage overlay
     */
    createDamageOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'damage-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            background: radial-gradient(circle, transparent 0%, rgba(231, 76, 60, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
        this.damageOverlay = overlay;
    }
    
    /**
     * Create stamina overlay
     */
    createStaminaOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'stamina-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            background: radial-gradient(circle, transparent 0%, rgba(243, 156, 18, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
        this.staminaOverlay = overlay;
    }
    
    /**
     * Create phase overlay
     */
    createPhaseOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'phase-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 998;
            opacity: 0;
            transition: opacity 0.5s ease;
        `;
        document.body.appendChild(overlay);
        this.phaseOverlay = overlay;
    }
    
    /**
     * Setup HUD effects
     */
    setupHUDEffects() {
        // Setup HUD-specific visual effects
        this.setupHealthBarEffects();
        this.setupStaminaBarEffects();
        this.setupPhaseIndicatorEffects();
    }
    
    /**
     * Setup health bar effects
     */
    setupHealthBarEffects() {
        // Add visual effects to health bar
        const healthBar = document.getElementById('health-bar');
        if (healthBar) {
            healthBar.style.transition = 'all 0.3s ease';
        }
    }
    
    /**
     * Setup stamina bar effects
     */
    setupStaminaBarEffects() {
        // Add visual effects to stamina bar
        const staminaBar = document.getElementById('stamina-bar');
        if (staminaBar) {
            staminaBar.style.transition = 'all 0.3s ease';
        }
    }
    
    /**
     * Setup phase indicator effects
     */
    setupPhaseIndicatorEffects() {
        // Add visual effects to phase indicator
        const phaseIndicator = document.getElementById('phase-indicator');
        if (phaseIndicator) {
            phaseIndicator.style.transition = 'all 0.5s ease';
        }
    }
    
    /**
     * Update UI effects
     * @param {number} deltaTime - Time since last update
     */
    updateUIEffects(deltaTime) {
        // Update damage overlay
        if (this.damageOverlay && this.damageOverlay.style.opacity > 0) {
            const currentOpacity = parseFloat(this.damageOverlay.style.opacity);
            this.damageOverlay.style.opacity = Math.max(0, currentOpacity - deltaTime * 0.001);
        }
        
        // Update stamina overlay
        if (this.staminaOverlay && this.staminaOverlay.style.opacity > 0) {
            const currentOpacity = parseFloat(this.staminaOverlay.style.opacity);
            this.staminaOverlay.style.opacity = Math.max(0, currentOpacity - deltaTime * 0.0005);
        }
    }
    
    /**
     * Render UI effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderUIEffects(ctx) {
        // Render any additional UI effects
        // This could include screen overlays, post-processing effects, etc.
    }
    
    /**
     * Show damage overlay
     * @param {number} intensity - Damage intensity (0-1)
     */
    showDamageOverlay(intensity) {
        if (this.damageOverlay) {
            this.damageOverlay.style.opacity = intensity * 0.3;
        }
    }
    
    /**
     * Show stamina overlay
     * @param {number} intensity - Stamina intensity (0-1)
     */
    showStaminaOverlay(intensity) {
        if (this.staminaOverlay) {
            this.staminaOverlay.style.opacity = intensity * 0.2;
        }
    }
    
    /**
     * Show phase overlay
     * @param {string} color - Overlay color
     * @param {number} intensity - Overlay intensity (0-1)
     */
    showPhaseOverlay(color, intensity) {
        if (this.phaseOverlay) {
            this.phaseOverlay.style.background = `radial-gradient(circle, transparent 0%, ${color} 100%)`;
            this.phaseOverlay.style.opacity = intensity * 0.1;
        }
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear intervals
        if (this.wasmUpdateInterval) {
            clearInterval(this.wasmUpdateInterval);
        }
        
        // Remove overlays
        if (this.damageOverlay) {
            this.damageOverlay.remove();
        }
        if (this.staminaOverlay) {
            this.staminaOverlay.remove();
        }
        if (this.phaseOverlay) {
            this.phaseOverlay.remove();
        }
        
        // Cleanup visual effects
        this.visualEffects.cleanup();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEffectsIntegration;
} else if (typeof window !== 'undefined') {
    window.VisualEffectsIntegration = VisualEffectsIntegration;
}