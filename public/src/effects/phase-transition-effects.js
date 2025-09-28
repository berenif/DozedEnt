/**
 * Enhanced Phase Transition Effects System
 * 
 * Integrates with WASM game phases to provide rich visual feedback
 * for phase transitions with contextual effects and animations
 */

export class PhaseTransitionEffects {
    constructor(visualEffectsManager, wasmModule, gameRenderer) {
        this.visualEffects = visualEffectsManager;
        this.wasm = wasmModule;
        this.renderer = gameRenderer;
        
        // Phase transition state
        this.currentPhase = 0;
        this.previousPhase = 0;
        this.transitionInProgress = false;
        this.transitionStartTime = 0;
        
        // Phase-specific visual themes
        this.phaseThemes = {
            0: { // Explore
                color: '#4a90e2',
                particles: 'exploration',
                sound: 'phase_explore',
                effects: ['fog', 'wind']
            },
            1: { // Fight
                color: '#e74c3c',
                particles: 'combat',
                sound: 'phase_fight',
                effects: ['screen_shake', 'blood_particles']
            },
            2: { // Choose
                color: '#f39c12',
                particles: 'choice',
                sound: 'phase_choose',
                effects: ['glow', 'sparkles']
            },
            3: { // PowerUp
                color: '#9b59b6',
                particles: 'powerup',
                sound: 'phase_powerup',
                effects: ['energy_burst', 'lightning']
            },
            4: { // Risk
                color: '#8e44ad',
                particles: 'risk',
                sound: 'phase_risk',
                effects: ['darkness', 'ominous_glow']
            },
            5: { // Escalate
                color: '#c0392b',
                particles: 'escalation',
                sound: 'phase_escalate',
                effects: ['intensity', 'red_flash']
            },
            6: { // CashOut
                color: '#f1c40f',
                particles: 'treasure',
                sound: 'phase_cashout',
                effects: ['gold_sparkles', 'wealth_glow']
            },
            7: { // Reset
                color: '#34495e',
                particles: 'reset',
                sound: 'phase_reset',
                effects: ['fade_out', 'clean_slate']
            }
        };
        
        // Transition types for different phase combinations
        this.transitionTypes = {
            'explore-fight': 'combat_enter',
            'fight-choose': 'victory_transition',
            'choose-powerup': 'choice_made',
            'powerup-risk': 'risk_entrance',
            'risk-escalate': 'danger_escalation',
            'escalate-cashout': 'reward_transition',
            'cashout-reset': 'cycle_reset',
            'reset-explore': 'new_beginning'
        };
        
        this.init();
    }
    
    /**
     * Initialize phase transition system
     */
    init() {
        // Listen for WASM phase changes
        this.setupPhaseMonitoring();
        
        // Setup transition animations
        this.setupTransitionAnimations();
        
        // Initialize phase-specific effects
        this.initializePhaseEffects();
    }
    
    /**
     * Setup monitoring for WASM phase changes
     */
    setupPhaseMonitoring() {
        // Monitor phase changes in the game loop
        this.lastPhaseCheck = 0;
        this.phaseCheckInterval = 100; // Check every 100ms
        
        // Store previous phase for comparison
        this.previousPhase = this.wasm.get_phase();
    }
    
    /**
     * Update phase transition system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Check for phase changes
        this.checkForPhaseChange();
        
        // Update transition effects
        if (this.transitionInProgress) {
            this.updateTransition(deltaTime);
        }
        
        // Update phase-specific ambient effects
        this.updatePhaseAmbientEffects(deltaTime);
    }
    
    /**
     * Check for phase changes
     */
    checkForPhaseChange() {
        const currentTime = Date.now();
        if (currentTime - this.lastPhaseCheck < this.phaseCheckInterval) {
            return;
        }
        
        this.lastPhaseCheck = currentTime;
        
        const newPhase = this.wasm.get_phase();
        if (newPhase !== this.currentPhase) {
            this.triggerPhaseTransition(this.currentPhase, newPhase);
            this.currentPhase = newPhase;
        }
    }
    
    /**
     * Trigger phase transition
     * @param {number} fromPhase - Previous phase
     * @param {number} toPhase - New phase
     */
    triggerPhaseTransition(fromPhase, toPhase) {
        if (this.transitionInProgress) {
            return; // Don't interrupt ongoing transition
        }
        
        this.transitionInProgress = true;
        this.transitionStartTime = Date.now();
        this.previousPhase = fromPhase;
        
        // Get transition configuration
        const transitionKey = `${this.getPhaseName(fromPhase)}-${this.getPhaseName(toPhase)}`;
        const transitionType = this.transitionTypes[transitionKey] || 'default';
        
        // Get phase themes
        const fromTheme = this.phaseThemes[fromPhase];
        const toTheme = this.phaseThemes[toPhase];
        
        // Trigger transition effects
        this.startTransitionEffects(transitionType, fromTheme, toTheme);
        
        // Play transition sound
        this.playTransitionSound(toTheme.sound);
        
        // Trigger visual effects manager
        this.visualEffects.startPhaseTransition(
            this.getPhaseName(fromPhase),
            this.getPhaseName(toPhase),
            transitionType
        );
        
        // Dispatch custom event
        this.dispatchPhaseTransitionEvent(fromPhase, toPhase, transitionType);
    }
    
    /**
     * Start transition effects
     * @param {string} transitionType - Type of transition
     * @param {Object} fromTheme - Source phase theme
     * @param {Object} toTheme - Target phase theme
     */
    startTransitionEffects(transitionType, fromTheme, toTheme) {
        switch (transitionType) {
            case 'combat_enter':
                this.startCombatTransition(fromTheme, toTheme);
                break;
            case 'victory_transition':
                this.startVictoryTransition(fromTheme, toTheme);
                break;
            case 'choice_made':
                this.startChoiceTransition(fromTheme, toTheme);
                break;
            case 'risk_entrance':
                this.startRiskTransition(fromTheme, toTheme);
                break;
            case 'danger_escalation':
                this.startEscalationTransition(fromTheme, toTheme);
                break;
            case 'reward_transition':
                this.startRewardTransition(fromTheme, toTheme);
                break;
            case 'cycle_reset':
                this.startResetTransition(fromTheme, toTheme);
                break;
            case 'new_beginning':
                this.startNewBeginningTransition(fromTheme, toTheme);
                break;
            default:
                this.startDefaultTransition(fromTheme, toTheme);
        }
    }
    
    /**
     * Combat transition (Explore -> Fight)
     */
    startCombatTransition(fromTheme, toTheme) {
        // Screen shake and red flash
        this.visualEffects.triggerScreenShake(0.8, 1000);
        this.visualEffects.triggerFlash('#e74c3c', 0.6, 500);
        
        // Combat particles
        this.spawnCombatParticles();
        
        // Camera zoom effect
        this.visualEffects.setCameraZoom(1.2, 800);
        
        // Environmental effects
        this.setEnvironmentalEffect('fog', { density: 0.3, color: '#e74c3c' });
    }
    
    /**
     * Victory transition (Fight -> Choose)
     */
    startVictoryTransition(fromTheme, toTheme) {
        // Victory sparkles
        this.spawnVictoryParticles();
        
        // Golden flash
        this.visualEffects.triggerFlash('#f1c40f', 0.4, 800);
        
        // Camera zoom out
        this.visualEffects.setCameraZoom(0.9, 1000);
        
        // Environmental effects
        this.setEnvironmentalEffect('sparkles', { intensity: 0.8, color: '#f1c40f' });
    }
    
    /**
     * Choice transition (Choose -> PowerUp)
     */
    startChoiceTransition(fromTheme, toTheme) {
        // Choice confirmation effect
        this.spawnChoiceParticles();
        
        // Purple energy burst
        this.visualEffects.triggerFlash('#9b59b6', 0.5, 600);
        
        // Environmental effects
        this.setEnvironmentalEffect('energy', { intensity: 0.6, color: '#9b59b6' });
    }
    
    /**
     * Risk transition (PowerUp -> Risk)
     */
    startRiskTransition(fromTheme, toTheme) {
        // Ominous darkness
        this.visualEffects.triggerFlash('#2c3e50', 0.7, 1200);
        
        // Dark particles
        this.spawnRiskParticles();
        
        // Camera shake
        this.visualEffects.triggerScreenShake(0.3, 1500);
        
        // Environmental effects
        this.setEnvironmentalEffect('darkness', { intensity: 0.8, color: '#2c3e50' });
    }
    
    /**
     * Escalation transition (Risk -> Escalate)
     */
    startEscalationTransition(fromTheme, toTheme) {
        // Intense red flash
        this.visualEffects.triggerFlash('#c0392b', 0.8, 1000);
        
        // Escalation particles
        this.spawnEscalationParticles();
        
        // Strong screen shake
        this.visualEffects.triggerScreenShake(1.0, 1200);
        
        // Camera zoom in
        this.visualEffects.setCameraZoom(1.3, 1000);
        
        // Environmental effects
        this.setEnvironmentalEffect('intensity', { strength: 1.0, color: '#c0392b' });
    }
    
    /**
     * Reward transition (Escalate -> CashOut)
     */
    startRewardTransition(fromTheme, toTheme) {
        // Golden sparkles
        this.spawnRewardParticles();
        
        // Golden flash
        this.visualEffects.triggerFlash('#f1c40f', 0.6, 800);
        
        // Camera zoom out
        this.visualEffects.setCameraZoom(0.8, 1000);
        
        // Environmental effects
        this.setEnvironmentalEffect('wealth', { intensity: 0.9, color: '#f1c40f' });
    }
    
    /**
     * Reset transition (CashOut -> Reset)
     */
    startResetTransition(fromTheme, toTheme) {
        // Fade to black
        this.visualEffects.triggerFlash('#000000', 1.0, 1500);
        
        // Clean slate particles
        this.spawnResetParticles();
        
        // Environmental effects
        this.setEnvironmentalEffect('cleanse', { intensity: 1.0, color: '#ffffff' });
    }
    
    /**
     * New beginning transition (Reset -> Explore)
     */
    startNewBeginningTransition(fromTheme, toTheme) {
        // Bright flash
        this.visualEffects.triggerFlash('#ffffff', 0.8, 1000);
        
        // New beginning particles
        this.spawnNewBeginningParticles();
        
        // Camera reset
        this.visualEffects.setCameraZoom(1.0, 1200);
        
        // Environmental effects
        this.setEnvironmentalEffect('renewal', { intensity: 0.7, color: '#4a90e2' });
    }
    
    /**
     * Default transition
     */
    startDefaultTransition(fromTheme, toTheme) {
        // Simple fade
        this.visualEffects.triggerFlash(toTheme.color, 0.5, 800);
    }
    
    /**
     * Update transition
     * @param {number} deltaTime - Time since last update
     */
    updateTransition(deltaTime) {
        const elapsed = Date.now() - this.transitionStartTime;
        const duration = this.getTransitionDuration();
        
        if (elapsed >= duration) {
            this.transitionInProgress = false;
            this.onTransitionComplete();
        }
    }
    
    /**
     * Update phase-specific ambient effects
     * @param {number} deltaTime - Time since last update
     */
    updatePhaseAmbientEffects(deltaTime) {
        const theme = this.phaseThemes[this.currentPhase];
        if (!theme) return;
        
        // Update ambient particles
        this.updateAmbientParticles(theme, deltaTime);
        
        // Update environmental effects
        this.updateEnvironmentalEffects(theme, deltaTime);
    }
    
    /**
     * Spawn combat particles
     */
    spawnCombatParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 2 + Math.random() * 3;
            const life = 1000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX + Math.cos(angle) * 50,
                y: centerY + Math.sin(angle) * 50,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#e74c3c',
                size: 3 + Math.random() * 3,
                type: 'combat'
            });
        }
    }
    
    /**
     * Spawn victory particles
     */
    spawnVictoryParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 2000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // Upward bias
                life: life,
                color: '#f1c40f',
                size: 2 + Math.random() * 4,
                type: 'victory'
            });
        }
    }
    
    /**
     * Spawn choice particles
     */
    spawnChoiceParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2;
            const life = 1500 + Math.random() * 500;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#9b59b6',
                size: 2 + Math.random() * 3,
                type: 'choice'
            });
        }
    }
    
    /**
     * Spawn risk particles
     */
    spawnRiskParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            const life = 2000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX + Math.cos(angle) * 100,
                y: centerY + Math.sin(angle) * 100,
                vx: -Math.cos(angle) * speed,
                vy: -Math.sin(angle) * speed,
                life: life,
                color: '#8e44ad',
                size: 1 + Math.random() * 2,
                type: 'risk'
            });
        }
    }
    
    /**
     * Spawn escalation particles
     */
    spawnEscalationParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const life = 1000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#c0392b',
                size: 2 + Math.random() * 4,
                type: 'escalation'
            });
        }
    }
    
    /**
     * Spawn reward particles
     */
    spawnRewardParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 2500 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // Slight upward bias
                life: life,
                color: '#f1c40f',
                size: 1 + Math.random() * 3,
                type: 'reward'
            });
        }
    }
    
    /**
     * Spawn reset particles
     */
    spawnResetParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1;
            const life = 3000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#ffffff',
                size: 1 + Math.random() * 2,
                type: 'reset'
            });
        }
    }
    
    /**
     * Spawn new beginning particles
     */
    spawnNewBeginningParticles() {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const life = 2000 + Math.random() * 1000;
            
            this.visualEffects.spawnParticle({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                color: '#4a90e2',
                size: 2 + Math.random() * 3,
                type: 'new_beginning'
            });
        }
    }
    
    /**
     * Get phase name from number
     * @param {number} phase - Phase number
     * @returns {string} Phase name
     */
    getPhaseName(phase) {
        const names = ['explore', 'fight', 'choose', 'powerup', 'risk', 'escalate', 'cashout', 'reset'];
        return names[phase] || 'unknown';
    }
    
    /**
     * Get transition duration
     * @returns {number} Duration in milliseconds
     */
    getTransitionDuration() {
        return 1500; // Default duration
    }
    
    /**
     * Play transition sound
     * @param {string} soundName - Sound to play
     */
    playTransitionSound(soundName) {
        // This would integrate with the audio system
        if (window.audioManager) {
            window.audioManager.playSound(soundName, { volume: 0.7 });
        }
    }
    
    /**
     * Set environmental effect
     * @param {string} effect - Effect name
     * @param {Object} params - Effect parameters
     */
    setEnvironmentalEffect(effect, params) {
        if (this.visualEffects.setEnvironmentalEffect) {
            this.visualEffects.setEnvironmentalEffect(effect, params);
        }
    }
    
    /**
     * Dispatch phase transition event
     * @param {number} fromPhase - Previous phase
     * @param {number} toPhase - New phase
     * @param {string} transitionType - Type of transition
     */
    dispatchPhaseTransitionEvent(fromPhase, toPhase, transitionType) {
        const event = new CustomEvent('phaseTransitionComplete', {
            detail: {
                fromPhase: fromPhase,
                toPhase: toPhase,
                fromPhaseName: this.getPhaseName(fromPhase),
                toPhaseName: this.getPhaseName(toPhase),
                transitionType: transitionType,
                timestamp: Date.now()
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * On transition complete
     */
    onTransitionComplete() {
        // Clean up any lingering effects
        this.cleanupTransitionEffects();
        
        // Dispatch completion event
        this.dispatchPhaseTransitionEvent(this.previousPhase, this.currentPhase, 'complete');
    }
    
    /**
     * Cleanup transition effects
     */
    cleanupTransitionEffects() {
        // Reset camera
        this.visualEffects.setCameraZoom(1.0, 500);
        
        // Clear environmental effects
        this.setEnvironmentalEffect('clear', {});
    }
    
    /**
     * Update ambient particles
     * @param {Object} theme - Phase theme
     * @param {number} deltaTime - Time since last update
     */
    updateAmbientParticles(theme, deltaTime) {
        // Update ambient particle systems based on phase
        // This would integrate with the particle system
    }
    
    /**
     * Update environmental effects
     * @param {Object} theme - Phase theme
     * @param {number} deltaTime - Time since last update
     */
    updateEnvironmentalEffects(theme, deltaTime) {
        // Update environmental effects based on phase
        // This would integrate with the environmental system
    }
    
    /**
     * Setup transition animations
     */
    setupTransitionAnimations() {
        // Setup any additional transition animations
        // This could include UI animations, HUD transitions, etc.
    }
    
    /**
     * Initialize phase effects
     */
    initializePhaseEffects() {
        // Initialize any phase-specific effects
        // This could include ambient lighting, particle systems, etc.
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhaseTransitionEffects;
} else if (typeof window !== 'undefined') {
    window.PhaseTransitionEffects = PhaseTransitionEffects;
}