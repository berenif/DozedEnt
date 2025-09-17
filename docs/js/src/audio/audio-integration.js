/**
 * Audio Integration
 * 
 * Integrates the audio system with the WASM game
 * Provides seamless audio feedback for all game events
 */

export class AudioIntegration {
    constructor(canvas, wasmModule, gameRenderer) {
        this.canvas = canvas;
        this.wasm = wasmModule;
        this.renderer = gameRenderer;
        
        // Initialize audio manager
        this.audioManager = new EnhancedAudioManager(this);
        
        // Initialize phase audio system
        this.phaseAudio = new PhaseAudioSystem(this.audioManager, wasmModule);
        
        // Audio state tracking
        this.lastPlayerHealth = 100;
        this.lastPlayerStamina = 100;
        this.lastEnemyCount = 0;
        this.lastPhase = 0;
        
        // Audio timing
        this.lastAudioUpdate = 0;
        this.audioUpdateInterval = 50; // Update every 50ms
        
        this.init();
    }
    
    /**
     * Initialize audio integration
     */
    init() {
        this.setupGameEventListeners();
        this.setupWASMIntegration();
        this.setupAudioUI();
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
        
        window.addEventListener('achievementUnlocked', (event) => {
            this.onAchievementUnlocked(event.detail);
        });
        
        window.addEventListener('itemCollected', (event) => {
            this.onItemCollected(event.detail);
        });
    }
    
    /**
     * Setup WASM integration
     */
    setupWASMIntegration() {
        // Monitor WASM state changes
        this.wasmUpdateInterval = setInterval(() => {
            this.updateWASMAudio();
        }, this.audioUpdateInterval);
    }
    
    /**
     * Setup audio UI
     */
    setupAudioUI() {
        this.createAudioControls();
        this.setupVolumeControls();
    }
    
    /**
     * Update audio system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update audio manager
        this.audioManager.update(deltaTime);
        
        // Update phase audio
        this.phaseAudio.update(deltaTime);
        
        // Update spatial audio
        this.updateSpatialAudio();
    }
    
    /**
     * Update WASM audio
     */
    updateWASMAudio() {
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
            
            // Update spatial audio based on player position
            this.updatePlayerPositionAudio();
            
        } catch (error) {
            console.error('Error updating WASM audio:', error);
        }
    }
    
    /**
     * Update spatial audio
     */
    updateSpatialAudio() {
        try {
            // Get player position
            const playerX = this.wasm.get_x();
            const playerY = this.wasm.get_y();
            
            // Update listener position
            this.audioManager.updateListenerPosition(playerX, playerY);
            
            // Update enemy positions
            this.updateEnemyPositions();
            
        } catch (error) {
            console.error('Error updating spatial audio:', error);
        }
    }
    
    /**
     * Update enemy positions for spatial audio
     */
    updateEnemyPositions() {
        const enemyCount = this.wasm.get_enemy_count();
        
        for (let i = 0; i < enemyCount; i++) {
            try {
                // Get enemy position (this would need to be implemented in WASM)
                const enemyX = this.wasm.get_enemy_x(i);
                const enemyY = this.wasm.get_enemy_y(i);
                const enemyActive = this.wasm.get_enemy_active(i);
                
                if (enemyActive) {
                    // Update spatial audio source
                    this.audioManager.updateSpatialSource(`enemy_${i}`, {
                        x: enemyX,
                        y: enemyY,
                        volume: 0.8,
                        maxDistance: 0.5
                    });
                }
            } catch (error) {
                // Enemy position functions might not be implemented yet
                break;
            }
        }
    }
    
    /**
     * Update player position audio
     */
    updatePlayerPositionAudio() {
        const playerX = this.wasm.get_x();
        const playerY = this.wasm.get_y();
        
        // Update listener position
        this.audioManager.updateListenerPosition(playerX, playerY);
        
        // Play footstep sounds based on movement
        this.updateFootstepAudio();
    }
    
    /**
     * Update footstep audio
     */
    updateFootstepAudio() {
        // This would track player movement and play appropriate footstep sounds
        // based on the current phase and terrain
        const currentPhase = this.wasm.get_phase();
        const phaseEffects = this.phaseAudio.phaseEffects[currentPhase];
        
        if (phaseEffects && phaseEffects.footsteps) {
            // Play footstep sound based on movement speed and terrain
            // This would need to be implemented with proper movement tracking
        }
    }
    
    /**
     * On player take damage
     * @param {number} damage - Damage amount
     */
    onPlayerTakeDamage(damage) {
        // Play damage sound
        this.audioManager.playSound('sfx/player_hurt', {
            volume: Math.min(damage / 100, 1.0),
            category: 'sfx'
        });
        
        // Play damage voice line
        this.playDamageVoiceLine(damage);
    }
    
    /**
     * On player low stamina
     */
    onPlayerLowStamina() {
        // Play low stamina warning
        this.audioManager.playSound('sfx/stamina_low', {
            volume: 0.6,
            category: 'ui'
        });
    }
    
    /**
     * On enemy defeated
     */
    onEnemyDefeated() {
        // Play victory sound
        this.audioManager.playSound('sfx/enemy_defeated', {
            volume: 0.8,
            category: 'sfx'
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect('enemy_death');
    }
    
    /**
     * On player hit
     * @param {Object} detail - Hit details
     */
    onPlayerHit(detail) {
        // Play hit sound
        this.audioManager.playSound('sfx/sword_hit', {
            volume: 0.7,
            category: 'sfx',
            position: { x: detail.x, y: detail.y }
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect('hit');
    }
    
    /**
     * On player block
     * @param {Object} detail - Block details
     */
    onPlayerBlock(detail) {
        // Play block sound
        const sound = detail.perfect ? 'sfx/perfect_parry' : 'sfx/shield_block';
        this.audioManager.playSound(sound, {
            volume: 0.8,
            category: 'sfx',
            position: { x: detail.x, y: detail.y }
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect(detail.perfect ? 'parry' : 'block');
    }
    
    /**
     * On player roll
     * @param {Object} detail - Roll details
     */
    onPlayerRoll(detail) {
        // Play roll sound
        this.audioManager.playSound('sfx/dodge_roll', {
            volume: 0.6,
            category: 'sfx',
            position: { x: detail.x, y: detail.y }
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect('roll');
    }
    
    /**
     * On enemy killed
     * @param {Object} detail - Kill details
     */
    onEnemyKilled(detail) {
        // Play death sound
        this.audioManager.playSound('sfx/enemy_death', {
            volume: 0.8,
            category: 'sfx',
            position: { x: detail.x, y: detail.y }
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect('enemy_death');
    }
    
    /**
     * On achievement unlocked
     * @param {Object} detail - Achievement details
     */
    onAchievementUnlocked(detail) {
        // Play achievement sound
        this.audioManager.playSound('sfx/achievement_unlocked', {
            volume: 0.9,
            category: 'ui'
        });
        
        // Play rarity-specific sound
        const raritySounds = {
            0: 'sfx/achievement_common',
            1: 'sfx/achievement_uncommon',
            2: 'sfx/achievement_rare',
            3: 'sfx/achievement_epic',
            4: 'sfx/achievement_legendary'
        };
        
        const raritySound = raritySounds[detail.rarity];
        if (raritySound) {
            this.audioManager.playSound(raritySound, {
                volume: 0.8,
                category: 'ui'
            });
        }
    }
    
    /**
     * On item collected
     * @param {Object} detail - Item details
     */
    onItemCollected(detail) {
        // Play collection sound
        this.audioManager.playSound('sfx/item_collected', {
            volume: 0.7,
            category: 'sfx'
        });
        
        // Play phase-specific effect
        this.phaseAudio.playPhaseEffect('discovery');
    }
    
    /**
     * Play damage voice line
     * @param {number} damage - Damage amount
     */
    playDamageVoiceLine(damage) {
        const voiceLines = {
            light: 'voice/damage_light',
            medium: 'voice/damage_medium',
            heavy: 'voice/damage_heavy'
        };
        
        let voiceLine;
        if (damage < 20) {
            voiceLine = voiceLines.light;
        } else if (damage < 50) {
            voiceLine = voiceLines.medium;
        } else {
            voiceLine = voiceLines.heavy;
        }
        
        this.audioManager.playSound(voiceLine, {
            volume: 0.8,
            category: 'voice'
        });
    }
    
    /**
     * Create audio controls
     */
    createAudioControls() {
        // Create audio control panel
        const audioPanel = document.createElement('div');
        audioPanel.id = 'audio-controls';
        audioPanel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            min-width: 200px;
        `;
        
        audioPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4a90e2;">Audio Controls</h3>
            <div style="margin-bottom: 10px;">
                <label>Master Volume:</label>
                <input type="range" id="master-volume" min="0" max="100" value="80" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Music Volume:</label>
                <input type="range" id="music-volume" min="0" max="100" value="60" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>SFX Volume:</label>
                <input type="range" id="sfx-volume" min="0" max="100" value="80" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Ambient Volume:</label>
                <input type="range" id="ambient-volume" min="0" max="100" value="50" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Voice Volume:</label>
                <input type="range" id="voice-volume" min="0" max="100" value="90" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>UI Volume:</label>
                <input type="range" id="ui-volume" min="0" max="100" value="70" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>
                    <input type="checkbox" id="audio-mute" style="margin-right: 5px;">
                    Mute All
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <label>
                    <input type="checkbox" id="audio-3d" checked style="margin-right: 5px;">
                    3D Audio
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <label>
                    <input type="checkbox" id="audio-adaptive" checked style="margin-right: 5px;">
                    Adaptive Music
                </label>
            </div>
        `;
        
        document.body.appendChild(audioPanel);
        this.audioPanel = audioPanel;
    }
    
    /**
     * Setup volume controls
     */
    setupVolumeControls() {
        // Master volume
        const masterVolume = document.getElementById('master-volume');
        masterVolume.addEventListener('input', (e) => {
            this.audioManager.setMasterVolume(e.target.value / 100);
        });
        
        // Music volume
        const musicVolume = document.getElementById('music-volume');
        musicVolume.addEventListener('input', (e) => {
            this.audioManager.setCategoryVolume('music', e.target.value / 100);
        });
        
        // SFX volume
        const sfxVolume = document.getElementById('sfx-volume');
        sfxVolume.addEventListener('input', (e) => {
            this.audioManager.setCategoryVolume('sfx', e.target.value / 100);
        });
        
        // Ambient volume
        const ambientVolume = document.getElementById('ambient-volume');
        ambientVolume.addEventListener('input', (e) => {
            this.audioManager.setCategoryVolume('ambient', e.target.value / 100);
        });
        
        // Voice volume
        const voiceVolume = document.getElementById('voice-volume');
        voiceVolume.addEventListener('input', (e) => {
            this.audioManager.setCategoryVolume('voice', e.target.value / 100);
        });
        
        // UI volume
        const uiVolume = document.getElementById('ui-volume');
        uiVolume.addEventListener('input', (e) => {
            this.audioManager.setCategoryVolume('ui', e.target.value / 100);
        });
        
        // Mute toggle
        const audioMute = document.getElementById('audio-mute');
        audioMute.addEventListener('change', (e) => {
            this.audioManager.setMuted(e.target.checked);
        });
        
        // 3D Audio toggle
        const audio3D = document.getElementById('audio-3d');
        audio3D.addEventListener('change', (e) => {
            this.audioManager.set3DAudioEnabled(e.target.checked);
        });
        
        // Adaptive music toggle
        const audioAdaptive = document.getElementById('audio-adaptive');
        audioAdaptive.addEventListener('change', (e) => {
            this.audioManager.musicSystem.adaptiveMusic = e.target.checked;
        });
    }
    
    /**
     * Get audio system info
     * @returns {Object} Audio system information
     */
    getAudioInfo() {
        return {
            phaseAudio: this.phaseAudio.getPhaseAudioInfo(),
            audioManager: this.audioManager.getAudioInfo(),
            spatialAudio: this.audioManager.getSpatialAudioInfo(),
            performance: this.audioManager.getPerformanceInfo()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear intervals
        if (this.wasmUpdateInterval) {
            clearInterval(this.wasmUpdateInterval);
        }
        
        // Remove audio panel
        if (this.audioPanel) {
            this.audioPanel.remove();
        }
        
        // Cleanup audio systems
        this.audioManager.cleanup();
        this.phaseAudio.cleanup();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioIntegration;
} else if (typeof window !== 'undefined') {
    window.AudioIntegration = AudioIntegration;
}