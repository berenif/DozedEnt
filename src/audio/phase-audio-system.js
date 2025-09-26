/**
 * Phase Audio System
 * 
 * Enhanced audio cues and sound effects for game phase transitions
 * Integrates with the existing EnhancedAudioManager
 */

export class PhaseAudioSystem {
    constructor(audioManager, wasmModule) {
        this.audioManager = audioManager;
        this.wasm = wasmModule;
        
        // Phase-specific audio configurations
        this.phaseAudioConfig = {
            0: { // Explore
                music: 'music/explore',
                ambient: 'ambient/forest',
                intensity: 0.3,
                transitionSound: 'sfx/phase_explore',
                ambientVolume: 0.4,
                musicVolume: 0.5
            },
            1: { // Fight
                music: 'music/combat',
                ambient: 'ambient/battle',
                intensity: 0.8,
                transitionSound: 'sfx/phase_fight',
                ambientVolume: 0.6,
                musicVolume: 0.7
            },
            2: { // Choose
                music: 'music/choice',
                ambient: 'ambient/contemplation',
                intensity: 0.4,
                transitionSound: 'sfx/phase_choose',
                ambientVolume: 0.3,
                musicVolume: 0.4
            },
            3: { // PowerUp
                music: 'music/powerup',
                ambient: 'ambient/energy',
                intensity: 0.6,
                transitionSound: 'sfx/phase_powerup',
                ambientVolume: 0.5,
                musicVolume: 0.6
            },
            4: { // Risk
                music: 'music/risk',
                ambient: 'ambient/danger',
                intensity: 0.9,
                transitionSound: 'sfx/phase_risk',
                ambientVolume: 0.7,
                musicVolume: 0.8
            },
            5: { // Escalate
                music: 'music/escalate',
                ambient: 'ambient/chaos',
                intensity: 1.0,
                transitionSound: 'sfx/phase_escalate',
                ambientVolume: 0.8,
                musicVolume: 0.9
            },
            6: { // CashOut
                music: 'music/reward',
                ambient: 'ambient/wealth',
                intensity: 0.5,
                transitionSound: 'sfx/phase_cashout',
                ambientVolume: 0.4,
                musicVolume: 0.5
            },
            7: { // Reset
                music: 'music/reset',
                ambient: 'ambient/void',
                intensity: 0.2,
                transitionSound: 'sfx/phase_reset',
                ambientVolume: 0.2,
                musicVolume: 0.3
            }
        };
        
        // Transition sound effects
        this.transitionSounds = {
            'explore-fight': 'sfx/transition_combat_enter',
            'fight-choose': 'sfx/transition_victory',
            'choose-powerup': 'sfx/transition_choice_made',
            'powerup-risk': 'sfx/transition_risk_enter',
            'risk-escalate': 'sfx/transition_danger_escalate',
            'escalate-cashout': 'sfx/transition_reward',
            'cashout-reset': 'sfx/transition_reset',
            'reset-explore': 'sfx/transition_new_beginning'
        };
        
        // Phase-specific sound effects
        this.phaseEffects = {
            0: { // Explore
                footsteps: 'sfx/footsteps_grass',
                environment: 'sfx/birds_chirping',
                discovery: 'sfx/item_found'
            },
            1: { // Fight
                sword_clash: 'sfx/sword_clash',
                block: 'sfx/shield_block',
                parry: 'sfx/perfect_parry',
                hit: 'sfx/sword_hit',
                roll: 'sfx/dodge_roll'
            },
            2: { // Choose
                choice_hover: 'sfx/choice_hover',
                choice_select: 'sfx/choice_select',
                choice_confirm: 'sfx/choice_confirm'
            },
            3: { // PowerUp
                powerup_gain: 'sfx/powerup_gain',
                stat_increase: 'sfx/stat_increase',
                ability_unlock: 'sfx/ability_unlock'
            },
            4: { // Risk
                curse_applied: 'sfx/curse_applied',
                risk_warning: 'sfx/risk_warning',
                danger_ambient: 'sfx/danger_ambient'
            },
            5: { // Escalate
                escalation_warning: 'sfx/escalation_warning',
                miniboss_spawn: 'sfx/miniboss_spawn',
                intensity_increase: 'sfx/intensity_increase'
            },
            6: { // CashOut
                coin_collect: 'sfx/coin_collect',
                shop_open: 'sfx/shop_open',
                purchase_success: 'sfx/purchase_success'
            },
            7: { // Reset
                cycle_reset: 'sfx/cycle_reset',
                new_beginning: 'sfx/new_beginning',
                clean_slate: 'sfx/clean_slate'
            }
        };
        
        // Current phase state
        this.currentPhase = 0;
        this.previousPhase = 0;
        this.phaseTransitionInProgress = false;
        
        // Audio timing
        this.lastPhaseCheck = 0;
        this.phaseCheckInterval = 100; // Check every 100ms
        
        this.init();
    }
    
    /**
     * Initialize phase audio system
     */
    init() {
        this.setupPhaseMonitoring();
        this.setupEventListeners();
        this.initializePhaseAudio();
    }
    
    /**
     * Setup phase monitoring
     */
    setupPhaseMonitoring() {
        // Monitor WASM phase changes
        this.phaseMonitorInterval = setInterval(() => {
            this.checkForPhaseChange();
        }, this.phaseCheckInterval);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for phase transition events
        window.addEventListener('phaseTransitionComplete', (event) => {
            this.onPhaseTransitionComplete(event.detail);
        });
        
        // Listen for game events
        window.addEventListener('enemyKilled', (event) => {
            this.onEnemyKilled(event.detail);
        });
        
        window.addEventListener('playerHit', (event) => {
            this.onPlayerHit(event.detail);
        });
        
        window.addEventListener('playerBlock', (event) => {
            this.onPlayerBlock(event.detail);
        });
        
        window.addEventListener('choiceMade', (event) => {
            this.onChoiceMade(event.detail);
        });
    }
    
    /**
     * Initialize phase audio
     */
    initializePhaseAudio() {
        try {
            // Set initial phase audio
            this.currentPhase = this.wasm.get_phase ? this.wasm.get_phase() : 0;
            this.applyPhaseAudio(this.currentPhase);
        } catch (error) {
            console.warn('Failed to initialize phase audio:', error);
            this.currentPhase = 0;
            this.applyPhaseAudio(this.currentPhase);
        }
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
        
        try {
            if (!this.wasm.get_phase) {
                return; // WASM method not available
            }
            const newPhase = this.wasm.get_phase();
            if (newPhase !== this.currentPhase) {
                this.triggerPhaseTransition(this.currentPhase, newPhase);
                this.currentPhase = newPhase;
            }
        } catch (error) {
            // Silently ignore errors from missing WASM methods
        }
    }
    
    /**
     * Trigger phase transition
     * @param {number} fromPhase - Previous phase
     * @param {number} toPhase - New phase
     */
    triggerPhaseTransition(fromPhase, toPhase) {
        if (this.phaseTransitionInProgress) {
            return; // Don't interrupt ongoing transition
        }
        
        this.phaseTransitionInProgress = true;
        this.previousPhase = fromPhase;
        
        // Get transition configuration
        const transitionKey = `${this.getPhaseName(fromPhase)}-${this.getPhaseName(toPhase)}`;
        const transitionSound = this.transitionSounds[transitionKey];
        
        // Play transition sound
        if (transitionSound) {
            this.playTransitionSound(transitionSound);
        }
        
        // Apply new phase audio after transition sound
        setTimeout(() => {
            this.applyPhaseAudio(toPhase);
            this.phaseTransitionInProgress = false;
        }, 500); // Wait for transition sound to play
    }
    
    /**
     * Apply phase audio
     * @param {number} phase - Phase number
     */
    applyPhaseAudio(phase) {
        const config = this.phaseAudioConfig[phase];
        if (!config) return;
        
        // Update music
        this.audioManager.handlePhaseTransition({
            from: this.getPhaseName(this.previousPhase),
            to: this.getPhaseName(phase)
        });
        
        // Update ambient sounds
        this.updateAmbientAudio(config);
        
        // Update audio intensity
        this.audioManager.musicSystem.targetIntensity = config.intensity;
        
        // Play phase-specific sound
        if (config.transitionSound) {
            this.audioManager.playSound(config.transitionSound, {
                volume: 0.8,
                category: 'sfx'
            });
        }
    }
    
    /**
     * Update ambient audio
     * @param {Object} config - Phase audio configuration
     */
    updateAmbientAudio(config) {
        // Stop current ambient
        if (this.audioManager.ambientSystem.currentAmbient) {
            this.audioManager.ambientSystem.currentAmbient.stop();
        }
        
        // Start new ambient
        if (config.ambient) {
            this.audioManager.ambientSystem.currentAmbient = this.audioManager.playSound(config.ambient, {
                loop: true,
                volume: config.ambientVolume,
                category: 'ambient'
            });
        }
    }
    
    /**
     * Play transition sound
     * @param {string} soundKey - Sound to play
     */
    playTransitionSound(soundKey) {
        this.audioManager.playSound(soundKey, {
            volume: 0.9,
            category: 'sfx',
            priority: 'high'
        });
    }
    
    /**
     * On phase transition complete
     * @param {Object} detail - Transition details
     */
    onPhaseTransitionComplete(detail) {
        // Play completion sound
        const completionSound = this.getPhaseCompletionSound(detail.toPhase);
        if (completionSound) {
            this.audioManager.playSound(completionSound, {
                volume: 0.7,
                category: 'sfx'
            });
        }
    }
    
    /**
     * On enemy killed
     * @param {Object} detail - Kill details
     */
    onEnemyKilled(detail) {
        const phaseEffects = this.phaseEffects[this.currentPhase];
        if (phaseEffects && phaseEffects.enemy_death) {
            this.audioManager.playSound(phaseEffects.enemy_death, {
                volume: 0.8,
                category: 'sfx'
            });
        }
    }
    
    /**
     * On player hit
     * @param {Object} detail - Hit details
     */
    onPlayerHit(detail) {
        const phaseEffects = this.phaseEffects[this.currentPhase];
        if (phaseEffects && phaseEffects.hit) {
            this.audioManager.playSound(phaseEffects.hit, {
                volume: 0.6,
                category: 'sfx'
            });
        }
    }
    
    /**
     * On player block
     * @param {Object} detail - Block details
     */
    onPlayerBlock(detail) {
        const phaseEffects = this.phaseEffects[this.currentPhase];
        if (phaseEffects) {
            const sound = detail.perfect ? phaseEffects.parry : phaseEffects.block;
            if (sound) {
                this.audioManager.playSound(sound, {
                    volume: 0.7,
                    category: 'sfx'
                });
            }
        }
    }
    
    /**
     * On choice made
     * @param {Object} detail - Choice details
     */
    onChoiceMade(detail) {
        const phaseEffects = this.phaseEffects[this.currentPhase];
        if (phaseEffects && phaseEffects.choice_confirm) {
            this.audioManager.playSound(phaseEffects.choice_confirm, {
                volume: 0.8,
                category: 'sfx'
            });
        }
    }
    
    /**
     * Get phase completion sound
     * @param {number} phase - Phase number
     * @returns {string|null} Sound key
     */
    getPhaseCompletionSound(phase) {
        const completionSounds = {
            0: 'sfx/explore_complete',
            1: 'sfx/fight_complete',
            2: 'sfx/choice_complete',
            3: 'sfx/powerup_complete',
            4: 'sfx/risk_complete',
            5: 'sfx/escalate_complete',
            6: 'sfx/cashout_complete',
            7: 'sfx/reset_complete'
        };
        
        return completionSounds[phase] || null;
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
     * Play phase-specific sound effect
     * @param {string} effectType - Type of effect
     * @param {Object} options - Sound options
     */
    playPhaseEffect(effectType, options = {}) {
        const phaseEffects = this.phaseEffects[this.currentPhase];
        if (phaseEffects && phaseEffects[effectType]) {
            this.audioManager.playSound(phaseEffects[effectType], {
                volume: 0.7,
                category: 'sfx',
                ...options
            });
        }
    }
    
    /**
     * Update phase audio based on game state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update phase-specific audio based on game state
        this.updatePhaseSpecificAudio(deltaTime);
    }
    
    /**
     * Update phase-specific audio
     * @param {number} deltaTime - Time since last update
     */
    updatePhaseSpecificAudio(deltaTime) {
        const config = this.phaseAudioConfig[this.currentPhase];
        if (!config) return;
        
        // Update audio intensity based on game state
        let targetIntensity = config.intensity;
        
        switch (this.currentPhase) {
            case 0: // Explore
                // Increase intensity if enemies are nearby
                if (this.wasm.get_enemy_count) {
                    const enemyCount = this.wasm.get_enemy_count();
                    if (enemyCount > 0) {
                        targetIntensity += 0.2;
                    }
                }
                break;
                
            case 1: // Fight
                // Increase intensity based on combat intensity
                if (this.wasm.get_health && this.wasm.get_max_health) {
                    const playerHealth = this.wasm.get_health();
                    const maxHealth = this.wasm.get_max_health();
                    if (maxHealth > 0) {
                        const healthRatio = playerHealth / maxHealth;
                        targetIntensity += (1 - healthRatio) * 0.3;
                    }
                }
                break;
                
            case 4: // Risk
                // Increase intensity based on risk multiplier
                if (this.wasm.get_risk_multiplier) {
                    const riskMultiplier = this.wasm.get_risk_multiplier();
                    targetIntensity += (riskMultiplier - 1) * 0.2;
                }
                break;
                
            case 5: // Escalate
                // Increase intensity based on escalation level
                if (this.wasm.get_escalation_level) {
                    const escalationLevel = this.wasm.get_escalation_level();
                    targetIntensity += escalationLevel * 0.3;
                }
                break;
        }
        
        // Clamp intensity
        targetIntensity = Math.max(0, Math.min(1, targetIntensity));
        
        // Update audio manager intensity
        this.audioManager.musicSystem.targetIntensity = targetIntensity;
    }
    
    /**
     * Set phase audio volume
     * @param {string} category - Audio category
     * @param {number} volume - Volume level (0-1)
     */
    setPhaseAudioVolume(category, volume) {
        const config = this.phaseAudioConfig[this.currentPhase];
        if (!config) return;
        
        switch (category) {
            case 'music':
                this.audioManager.audioCategories.music.volume = volume * config.musicVolume;
                break;
            case 'ambient':
                this.audioManager.audioCategories.ambient.volume = volume * config.ambientVolume;
                break;
        }
    }
    
    /**
     * Get current phase audio info
     * @returns {Object} Phase audio information
     */
    getPhaseAudioInfo() {
        const config = this.phaseAudioConfig[this.currentPhase];
        return {
            phase: this.currentPhase,
            phaseName: this.getPhaseName(this.currentPhase),
            music: config ? config.music : null,
            ambient: config ? config.ambient : null,
            intensity: config ? config.intensity : 0,
            musicVolume: config ? config.musicVolume : 0,
            ambientVolume: config ? config.ambientVolume : 0
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear intervals
        if (this.phaseMonitorInterval) {
            clearInterval(this.phaseMonitorInterval);
            this.phaseMonitorInterval = null;
        }
        
        // Stop current ambient
        if (this.audioManager.ambientSystem.currentAmbient) {
            try {
                this.audioManager.ambientSystem.currentAmbient.stop();
                this.audioManager.ambientSystem.currentAmbient.disconnect();
            } catch (error) {
                // Source may already be stopped
            }
            this.audioManager.ambientSystem.currentAmbient = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhaseAudioSystem;
} else if (typeof window !== 'undefined') {
    window.PhaseAudioSystem = PhaseAudioSystem;
}