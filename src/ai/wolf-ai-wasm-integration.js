// Wolf AI WASM Integration Module
// Provides JavaScript interface to the enhanced AI features implemented in WASM

export class WolfAIWASMIntegration {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.soundSystem = null; // To be injected
        
        // Cache for frequently accessed data
        this.cache = {
            vocalizations: [],
            territories: [],
            scentMarkers: [],
            alphaInfo: null,
            lastUpdate: 0
        };
        
        // Vocalization type mapping
        this.VocalizationType = {
            None: 0,
            HowlRally: 1,
            HowlHunt: 2,
            HowlVictory: 3,
            HowlMourning: 4,
            GrowlWarning: 5,
            GrowlAggressive: 6,
            GrowlDefensive: 7,
            BarkAlert: 8,
            BarkCommand: 9,
            BarkAcknowledge: 10,
            WhineSubmission: 11,
            WhineDistress: 12
        };
        
        // Emotional state mapping
        this.EmotionalState = {
            Calm: 0,
            Aggressive: 1,
            Fearful: 2,
            Desperate: 3,
            Confident: 4,
            Frustrated: 5,
            Hurt: 6
        };
        
        // Alpha ability mapping
        this.AlphaAbility = {
            None: 0,
            RallyPack: 1,
            CoordinatedStrike: 2,
            Intimidate: 3,
            CallReinforcements: 4,
            BerserkRage: 5
        };
        
        // Pack plan mapping
        this.PackPlan = {
            Stalk: 0,
            Encircle: 1,
            Harass: 2,
            Commit: 3,
            Ambush: 4,
            Pincer: 5,
            Retreat: 6
        };
    }
    
    // Initialize the integration
    init(soundSystem) {
        this.soundSystem = soundSystem;
    }
    
    // Update and cache AI data from WASM
    update() {
        const now = performance.now();
        if (now - this.cache.lastUpdate < 16) { // 60 FPS throttle
            return;
        }
        
        this.cache.lastUpdate = now;
        
        // Update vocalizations
        this.updateVocalizations();
        
        // Update alpha wolf info
        this.updateAlphaInfo();
        
        // Update territories
        this.updateTerritories();
        
        // Update scent markers
        this.updateScentMarkers();
    }
    
    // Get current vocalizations from WASM
    updateVocalizations() {
        const count = this.wasm.get_vocalization_count();
        this.cache.vocalizations = [];
        
        for (let i = 0; i < count; i++) {
            const vocalization = {
                type: this.wasm.get_vocalization_type(i),
                x: this.wasm.get_vocalization_x(i),
                y: this.wasm.get_vocalization_y(i),
                intensity: this.wasm.get_vocalization_intensity(i),
                wolfIndex: this.wasm.get_vocalization_wolf_index(i)
            };
            
            this.cache.vocalizations.push(vocalization);
            
            // Trigger sound effect if sound system is available
            if (this.soundSystem) {
                this.playVocalizationSound(vocalization);
            }
        }
    }
    
    // Play appropriate sound for vocalization
    playVocalizationSound(vocalization) {
        let soundName = null;
        const volume = vocalization.intensity;
        
        switch (vocalization.type) {
            case this.VocalizationType.HowlRally:
                soundName = 'wolf_howl_rally';
                break;
            case this.VocalizationType.HowlHunt:
                soundName = 'wolf_howl_hunt';
                break;
            case this.VocalizationType.HowlVictory:
                soundName = 'wolf_howl_victory';
                break;
            case this.VocalizationType.HowlMourning:
                soundName = 'wolf_howl_mourning';
                break;
            case this.VocalizationType.GrowlWarning:
                soundName = 'wolf_growl_warning';
                break;
            case this.VocalizationType.GrowlAggressive:
                soundName = 'wolf_growl_aggressive';
                break;
            case this.VocalizationType.GrowlDefensive:
                soundName = 'wolf_growl_defensive';
                break;
            case this.VocalizationType.BarkAlert:
                soundName = 'wolf_bark_alert';
                break;
            case this.VocalizationType.BarkCommand:
                soundName = 'wolf_bark_command';
                break;
            case this.VocalizationType.BarkAcknowledge:
                soundName = 'wolf_bark_acknowledge';
                break;
            case this.VocalizationType.WhineSubmission:
            case this.VocalizationType.WhineDistress:
                soundName = 'wolf_whine';
                break;
        }
        
        if (soundName && this.soundSystem.playSound) {
            this.soundSystem.playSound(soundName, {
                volume: volume,
                position: { x: vocalization.x, y: vocalization.y }
            });
        }
    }
    
    // Update alpha wolf information
    updateAlphaInfo() {
        const alphaIndex = this.wasm.get_alpha_wolf_index();
        
        if (alphaIndex >= 0) {
            this.cache.alphaInfo = {
                wolfIndex: alphaIndex,
                ability: this.wasm.get_alpha_ability(),
                isEnraged: this.wasm.get_alpha_is_enraged() === 1,
                leadershipBonus: this.wasm.get_alpha_leadership_bonus()
            };
        } else {
            this.cache.alphaInfo = null;
        }
    }
    
    // Update territory information
    updateTerritories() {
        const count = this.wasm.get_territory_count();
        this.cache.territories = [];
        
        for (let i = 0; i < count; i++) {
            this.cache.territories.push({
                x: this.wasm.get_territory_x(i),
                y: this.wasm.get_territory_y(i),
                radius: this.wasm.get_territory_radius(i),
                strength: this.wasm.get_territory_strength(i)
            });
        }
    }
    
    // Update scent marker information
    updateScentMarkers() {
        const count = this.wasm.get_scent_marker_count();
        this.cache.scentMarkers = [];
        
        for (let i = 0; i < count; i++) {
            this.cache.scentMarkers.push({
                x: this.wasm.get_scent_marker_x(i),
                y: this.wasm.get_scent_marker_y(i),
                strength: this.wasm.get_scent_marker_strength(i)
            });
        }
    }
    
    // Get wolf emotional state
    getWolfEmotion(wolfIndex) {
        const emotion = this.wasm.get_enemy_emotion(wolfIndex);
        const intensity = this.wasm.get_enemy_emotion_intensity(wolfIndex);
        
        return {
            state: emotion,
            intensity: intensity,
            name: Object.keys(this.EmotionalState).find(key => this.EmotionalState[key] === emotion)
        };
    }
    
    // Get wolf AI attributes
    getWolfAttributes(wolfIndex) {
        return {
            aggression: this.wasm.get_enemy_aggression(wolfIndex),
            intelligence: this.wasm.get_enemy_intelligence(wolfIndex),
            coordination: this.wasm.get_enemy_coordination(wolfIndex),
            morale: this.wasm.get_enemy_morale(wolfIndex)
        };
    }
    
    // Get pack information
    getPackInfo() {
        return {
            plan: this.wasm.get_pack_plan(),
            planName: Object.keys(this.PackPlan).find(key => this.PackPlan[key] === this.wasm.get_pack_plan()),
            morale: this.wasm.get_pack_morale(),
            syncTimer: this.wasm.get_pack_sync_timer()
        };
    }
    
    // Get adaptive difficulty information
    getAdaptiveDifficulty() {
        return {
            playerSkillEstimate: this.wasm.get_player_skill_estimate(),
            wolfSpeed: this.wasm.get_difficulty_wolf_speed(),
            wolfAggression: this.wasm.get_difficulty_wolf_aggression(),
            wolfIntelligence: this.wasm.get_difficulty_wolf_intelligence()
        };
    }
    
    // Get scent strength at position
    getScentStrengthAt(x, y) {
        return this.wasm.get_scent_strength_at(x, y);
    }
    
    // Check if position is in wolf territory
    isInTerritory(x, y) {
        for (const territory of this.cache.territories) {
            const dx = x - territory.x;
            const dy = y - territory.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < territory.radius) {
                return true;
            }
        }
        return false;
    }
    
    // Get territory strength at position
    getTerritoryStrengthAt(x, y) {
        let maxStrength = 0;
        
        for (const territory of this.cache.territories) {
            const dx = x - territory.x;
            const dy = y - territory.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < territory.radius) {
                const strength = territory.strength * (1 - dist / territory.radius);
                maxStrength = Math.max(maxStrength, strength);
            }
        }
        
        return maxStrength;
    }
    
    // Get debug info for development
    getDebugInfo() {
        return {
            vocalizations: this.cache.vocalizations,
            alphaInfo: this.cache.alphaInfo,
            territories: this.cache.territories,
            scentMarkers: this.cache.scentMarkers,
            packInfo: this.getPackInfo(),
            difficulty: this.getAdaptiveDifficulty()
        };
    }
    
    // Render debug overlay (for development)
    renderDebugOverlay(ctx, canvas) {
        // Render territories
        ctx.save();
        ctx.globalAlpha = 0.2;
        
        for (const territory of this.cache.territories) {
            const x = territory.x * canvas.width;
            const y = territory.y * canvas.height;
            const radius = territory.radius * Math.min(canvas.width, canvas.height);
            
            ctx.fillStyle = `rgba(255, 100, 0, ${territory.strength})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Render scent markers
        ctx.globalAlpha = 0.3;
        for (const marker of this.cache.scentMarkers) {
            const x = marker.x * canvas.width;
            const y = marker.y * canvas.height;
            
            ctx.fillStyle = `rgba(100, 255, 100, ${marker.strength})`;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Render vocalizations
        ctx.globalAlpha = 1;
        ctx.font = '20px Arial';
        for (const vocal of this.cache.vocalizations) {
            const x = vocal.x * canvas.width;
            const y = vocal.y * canvas.height;
            
            let symbol = '?';
            let color = 'white';
            
            if (vocal.type >= 1 && vocal.type <= 4) { // Howls
                symbol = '🎵';
                color = 'cyan';
            } else if (vocal.type >= 5 && vocal.type <= 7) { // Growls
                symbol = '💢';
                color = 'red';
            } else if (vocal.type >= 8 && vocal.type <= 10) { // Barks
                symbol = '❗';
                color = 'yellow';
            } else if (vocal.type >= 11 && vocal.type <= 12) { // Whines
                symbol = '😢';
                color = 'blue';
            }
            
            ctx.fillStyle = color;
            ctx.fillText(symbol, x - 10, y - 10);
        }
        
        // Highlight alpha wolf
        if (this.cache.alphaInfo) {
            const alphaIndex = this.cache.alphaInfo.wolfIndex;
            const alphaX = this.wasm.get_enemy_x(alphaIndex) * canvas.width;
            const alphaY = this.wasm.get_enemy_y(alphaIndex) * canvas.height;
            
            ctx.strokeStyle = this.cache.alphaInfo.isEnraged ? 'red' : 'gold';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(alphaX, alphaY, 20, 0, Math.PI * 2);
            ctx.stroke();
            
            // Show alpha ability icon
            if (this.cache.alphaInfo.ability > 0) {
                const abilityName = Object.keys(this.AlphaAbility).find(
                    key => this.AlphaAbility[key] === this.cache.alphaInfo.ability
                );
                ctx.fillStyle = 'gold';
                ctx.font = '12px Arial';
                ctx.fillText(abilityName, alphaX - 30, alphaY - 25);
            }
        }
        
        ctx.restore();
    }
}

// Export for use in other modules
export default WolfAIWASMIntegration;