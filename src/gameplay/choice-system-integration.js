/**
 * Choice System Integration
 * 
 * Provides JavaScript integration for the WASM choice system
 * Includes choice descriptions, effects, and UI integration
 */

export class ChoiceSystemIntegration {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        
        // Choice type mappings
        this.choiceTypes = {
            0: 'Passive',      // Safe
            1: 'Active',       // Spicy
            2: 'Economy',      // Weird
            3: 'Defensive',    // Safe variant
            4: 'Offensive',    // Spicy variant
            5: 'Utility'       // Weird variant
        };
        
        // Choice rarity mappings
        this.choiceRarities = {
            0: 'Common',
            1: 'Uncommon',
            2: 'Rare',
            3: 'Legendary'
        };
        
        // Choice tag mappings
        this.choiceTags = {
            1: 'Stamina',
            2: 'Speed',
            4: 'Damage',
            8: 'Defense',
            16: 'Lifesteal',
            32: 'Cooldown',
            64: 'Area',
            128: 'Pierce',
            256: 'Burn',
            512: 'Freeze',
            1024: 'Lightning',
            2048: 'Poison',
            4096: 'Bleed',
            8192: 'Knockback',
            16384: 'Pull',
            32768: 'Teleport',
            65536: 'Treasure'
        };
        
        // Choice descriptions and effects
        this.choiceData = {
            // Safe choices (Passive/Defensive)
            1001: { name: 'Stamina Boost', description: 'Increases maximum stamina by 20%', effect: 'stamina_boost' },
            1002: { name: 'Speed Enhancement', description: 'Increases movement speed by 15%', effect: 'speed_boost' },
            1003: { name: 'Defensive Stance', description: 'Reduces incoming damage by 10%', effect: 'damage_reduction' },
            1004: { name: 'Fortified Guard', description: 'Increases defense and stamina regeneration', effect: 'fortified_guard' },
            1005: { name: 'Swift Defender', description: 'Combines speed and stamina bonuses', effect: 'swift_defender' },
            1006: { name: 'Defensive Speed', description: 'Increases defense and movement speed', effect: 'defensive_speed' },
            1007: { name: 'Stamina Fortress', description: 'Increases stamina and defense', effect: 'stamina_fortress' },
            1008: { name: 'Speed Cooldown', description: 'Increases speed and reduces cooldowns', effect: 'speed_cooldown' },
            1009: { name: 'Defensive Lifesteal', description: 'Increases defense and lifesteal', effect: 'defensive_lifesteal' },
            1010: { name: 'Triple Defense', description: 'Massive boost to stamina, speed, and defense', effect: 'triple_defense' },
            1011: { name: 'Defensive Mastery', description: 'Increases defense and reduces cooldowns', effect: 'defensive_mastery' },
            1012: { name: 'Ultimate Defense', description: 'Maximum defensive capabilities', effect: 'ultimate_defense' },
            1013: { name: 'Legendary Guard', description: 'Legendary defensive abilities', effect: 'legendary_guard' },
            1014: { name: 'Perfect Defense', description: 'Perfect defensive combination', effect: 'perfect_defense' },
            
            // Spicy choices (Active/Offensive)
            2001: { name: 'Damage Amplifier', description: 'Increases damage dealt by 25%', effect: 'damage_boost' },
            2002: { name: 'Knockback Strike', description: 'Attacks have knockback effect', effect: 'knockback_strike' },
            2003: { name: 'Area Devastation', description: 'Attacks affect multiple enemies', effect: 'area_devastation' },
            2004: { name: 'Piercing Blow', description: 'Attacks pierce through enemies', effect: 'piercing_blow' },
            2005: { name: 'Burning Fury', description: 'Attacks set enemies on fire', effect: 'burning_fury' },
            2006: { name: 'Inferno Strike', description: 'Legendary fire-based area attack', effect: 'inferno_strike' },
            2007: { name: 'Rapid Assault', description: 'Increases damage and reduces cooldowns', effect: 'rapid_assault' },
            2008: { name: 'Swift Strike', description: 'Increases damage and speed', effect: 'swift_strike' },
            2009: { name: 'Frost Strike', description: 'Attacks freeze enemies', effect: 'frost_strike' },
            2010: { name: 'Lightning Bolt', description: 'Attacks have lightning effects', effect: 'lightning_bolt' },
            2011: { name: 'Poison Blade', description: 'Attacks poison enemies', effect: 'poison_blade' },
            2012: { name: 'Bleeding Edge', description: 'Attacks cause bleeding', effect: 'bleeding_edge' },
            2013: { name: 'Devastating Combo', description: 'Legendary area and piercing attack', effect: 'devastating_combo' },
            2014: { name: 'Chaos Strike', description: 'Legendary knockback and pull attack', effect: 'chaos_strike' },
            
            // Weird choices (Economy/Utility)
            3001: { name: 'Cooldown Mastery', description: 'Reduces all cooldowns by 30%', effect: 'cooldown_mastery' },
            3002: { name: 'Teleportation', description: 'Gain teleportation ability', effect: 'teleportation' },
            3003: { name: 'Life Drain', description: 'Gain lifesteal on attacks', effect: 'life_drain' },
            3004: { name: 'Freeze Field', description: 'Create freezing area effects', effect: 'freeze_field' },
            3005: { name: 'Vampiric Strike', description: 'Combines lifesteal and damage', effect: 'vampiric_strike' },
            3006: { name: 'Lightning Teleport', description: 'Legendary teleportation with lightning', effect: 'lightning_teleport' },
            3007: { name: 'Treasure Hunter', description: 'Increases gold and item drops', effect: 'treasure_hunter' },
            3008: { name: 'Gravity Pull', description: 'Pull enemies towards you', effect: 'gravity_pull' },
            3009: { name: 'Treasure Cooldown', description: 'Combines treasure hunting and cooldowns', effect: 'treasure_cooldown' },
            3010: { name: 'Force Manipulation', description: 'Combines pull and knockback effects', effect: 'force_manipulation' },
            3011: { name: 'Treasure Lifesteal', description: 'Combines treasure hunting and lifesteal', effect: 'treasure_lifesteal' },
            3012: { name: 'Frost Teleport', description: 'Combines teleportation and freezing', effect: 'frost_teleport' },
            3013: { name: 'Ultimate Treasure', description: 'Legendary treasure, lifesteal, and damage', effect: 'ultimate_treasure' },
            3014: { name: 'Reality Warp', description: 'Legendary teleportation, pull, and knockback', effect: 'reality_warp' }
        };
        
        // Choice effects implementation
        this.choiceEffects = {
            // Safe effects
            stamina_boost: () => this.applyStaminaBoost(0.2),
            speed_boost: () => this.applySpeedBoost(0.15),
            damage_reduction: () => this.applyDamageReduction(0.1),
            fortified_guard: () => this.applyFortifiedGuard(),
            swift_defender: () => this.applySwiftDefender(),
            defensive_speed: () => this.applyDefensiveSpeed(),
            stamina_fortress: () => this.applyStaminaFortress(),
            speed_cooldown: () => this.applySpeedCooldown(),
            defensive_lifesteal: () => this.applyDefensiveLifesteal(),
            triple_defense: () => this.applyTripleDefense(),
            defensive_mastery: () => this.applyDefensiveMastery(),
            ultimate_defense: () => this.applyUltimateDefense(),
            legendary_guard: () => this.applyLegendaryGuard(),
            perfect_defense: () => this.applyPerfectDefense(),
            
            // Spicy effects
            damage_boost: () => this.applyDamageBoost(0.25),
            knockback_strike: () => this.applyKnockbackStrike(),
            area_devastation: () => this.applyAreaDevastation(),
            piercing_blow: () => this.applyPiercingBlow(),
            burning_fury: () => this.applyBurningFury(),
            inferno_strike: () => this.applyInfernoStrike(),
            rapid_assault: () => this.applyRapidAssault(),
            swift_strike: () => this.applySwiftStrike(),
            frost_strike: () => this.applyFrostStrike(),
            lightning_bolt: () => this.applyLightningBolt(),
            poison_blade: () => this.applyPoisonBlade(),
            bleeding_edge: () => this.applyBleedingEdge(),
            devastating_combo: () => this.applyDevastatingCombo(),
            chaos_strike: () => this.applyChaosStrike(),
            
            // Weird effects
            cooldown_mastery: () => this.applyCooldownMastery(0.3),
            teleportation: () => this.applyTeleportation(),
            life_drain: () => this.applyLifeDrain(),
            freeze_field: () => this.applyFreezeField(),
            vampiric_strike: () => this.applyVampiricStrike(),
            lightning_teleport: () => this.applyLightningTeleport(),
            treasure_hunter: () => this.applyTreasureHunter(),
            gravity_pull: () => this.applyGravityPull(),
            treasure_cooldown: () => this.applyTreasureCooldown(),
            force_manipulation: () => this.applyForceManipulation(),
            treasure_lifesteal: () => this.applyTreasureLifesteal(),
            frost_teleport: () => this.applyFrostTeleport(),
            ultimate_treasure: () => this.applyUltimateTreasure(),
            reality_warp: () => this.applyRealityWarp()
        };
        
        this.init();
    }
    
    /**
     * Initialize choice system integration
     */
    init() {
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for choice selection
        window.addEventListener('choiceSelected', (event) => {
            this.handleChoiceSelection(event.detail);
        });
        
        // Listen for choice generation
        window.addEventListener('choicesGenerated', (event) => {
            this.handleChoicesGenerated(event.detail);
        });
    }
    
    /**
     * Get current choices from WASM
     */
    getCurrentChoices() {
        try {
            const choiceCount = this.wasm.get_choice_count();
            const choices = [];
            
            for (let i = 0; i < choiceCount; i++) {
                const choice = {
                    id: this.wasm.get_choice_id(i),
                    type: this.wasm.get_choice_type(i),
                    rarity: this.wasm.get_choice_rarity(i),
                    tags: this.wasm.get_choice_tags(i)
                };
                
                // Add description and effect
                const choiceData = this.choiceData[choice.id];
                if (choiceData) {
                    choice.name = choiceData.name;
                    choice.description = choiceData.description;
                    choice.effect = choiceData.effect;
                } else {
                    choice.name = `Choice ${choice.id}`;
                    choice.description = 'Unknown choice effect';
                    choice.effect = 'unknown';
                }
                
                // Add type and rarity names
                choice.typeName = this.choiceTypes[choice.type] || 'Unknown';
                choice.rarityName = this.choiceRarities[choice.rarity] || 'Unknown';
                
                // Parse tags
                choice.tagNames = this.parseTags(choice.tags);
                
                choices.push(choice);
            }
            
            return choices;
        } catch (error) {
            console.error('Error getting current choices:', error);
            return [];
        }
    }
    
    /**
     * Parse choice tags
     */
    parseTags(tags) {
        const tagNames = [];
        
        for (const [value, name] of Object.entries(this.choiceTags)) {
            if (tags & parseInt(value)) {
                tagNames.push(name);
            }
        }
        
        return tagNames;
    }
    
    /**
     * Select a choice
     */
    selectChoice(choiceIndex) {
        try {
            // Apply the choice effect
            const choices = this.getCurrentChoices();
            if (choiceIndex >= 0 && choiceIndex < choices.length) {
                const choice = choices[choiceIndex];
                this.applyChoiceEffect(choice);
                
                // Dispatch choice selected event
                window.dispatchEvent(new CustomEvent('choiceSelected', {
                    detail: {
                        choice,
                        choiceIndex,
                        timestamp: Date.now()
                    }
                }));
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error selecting choice:', error);
            return false;
        }
    }
    
    /**
     * Apply choice effect
     */
    applyChoiceEffect(choice) {
        const effect = this.choiceEffects[choice.effect];
        if (effect) {
            effect();
        } else {
            console.warn(`Unknown choice effect: ${choice.effect}`);
        }
    }
    
    /**
     * Handle choice selection
     */
    handleChoiceSelection(detail) {
        // This would integrate with the WASM choice system
        // For now, we'll just log the selection
        console.log('Choice selected:', detail.choice.name);
    }
    
    /**
     * Handle choices generated
     */
    handleChoicesGenerated(detail) {
        // This would update the UI with new choices
        console.log('New choices generated:', detail.choices.length);
    }
    
    /**
     * Get choice statistics
     */
    getChoiceStatistics() {
        try {
            const choices = this.getCurrentChoices();
            const stats = {
                totalChoices: choices.length,
                byType: {},
                byRarity: {},
                byTag: {}
            };
            
            // Count by type
            choices.forEach(choice => {
                const typeName = choice.typeName;
                stats.byType[typeName] = (stats.byType[typeName] || 0) + 1;
            });
            
            // Count by rarity
            choices.forEach(choice => {
                const rarityName = choice.rarityName;
                stats.byRarity[rarityName] = (stats.byRarity[rarityName] || 0) + 1;
            });
            
            // Count by tags
            choices.forEach(choice => {
                choice.tagNames.forEach(tagName => {
                    stats.byTag[tagName] = (stats.byTag[tagName] || 0) + 1;
                });
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting choice statistics:', error);
            return null;
        }
    }
    
    // ============================================================================
    // Choice Effect Implementations
    // ============================================================================
    
    // Safe effects
    applyStaminaBoost(amount) {
        // This would modify WASM stamina values
        console.log(`Applying stamina boost: +${amount * 100}%`);
    }
    
    applySpeedBoost(amount) {
        console.log(`Applying speed boost: +${amount * 100}%`);
    }
    
    applyDamageReduction(amount) {
        console.log(`Applying damage reduction: -${amount * 100}%`);
    }
    
    applyFortifiedGuard() {
        console.log('Applying fortified guard');
    }
    
    applySwiftDefender() {
        console.log('Applying swift defender');
    }
    
    applyDefensiveSpeed() {
        console.log('Applying defensive speed');
    }
    
    applyStaminaFortress() {
        console.log('Applying stamina fortress');
    }
    
    applySpeedCooldown() {
        console.log('Applying speed cooldown');
    }
    
    applyDefensiveLifesteal() {
        console.log('Applying defensive lifesteal');
    }
    
    applyTripleDefense() {
        console.log('Applying triple defense');
    }
    
    applyDefensiveMastery() {
        console.log('Applying defensive mastery');
    }
    
    applyUltimateDefense() {
        console.log('Applying ultimate defense');
    }
    
    applyLegendaryGuard() {
        console.log('Applying legendary guard');
    }
    
    applyPerfectDefense() {
        console.log('Applying perfect defense');
    }
    
    // Spicy effects
    applyDamageBoost(amount) {
        console.log(`Applying damage boost: +${amount * 100}%`);
    }
    
    applyKnockbackStrike() {
        console.log('Applying knockback strike');
    }
    
    applyAreaDevastation() {
        console.log('Applying area devastation');
    }
    
    applyPiercingBlow() {
        console.log('Applying piercing blow');
    }
    
    applyBurningFury() {
        console.log('Applying burning fury');
    }
    
    applyInfernoStrike() {
        console.log('Applying inferno strike');
    }
    
    applyRapidAssault() {
        console.log('Applying rapid assault');
    }
    
    applySwiftStrike() {
        console.log('Applying swift strike');
    }
    
    applyFrostStrike() {
        console.log('Applying frost strike');
    }
    
    applyLightningBolt() {
        console.log('Applying lightning bolt');
    }
    
    applyPoisonBlade() {
        console.log('Applying poison blade');
    }
    
    applyBleedingEdge() {
        console.log('Applying bleeding edge');
    }
    
    applyDevastatingCombo() {
        console.log('Applying devastating combo');
    }
    
    applyChaosStrike() {
        console.log('Applying chaos strike');
    }
    
    // Weird effects
    applyCooldownMastery(amount) {
        console.log(`Applying cooldown mastery: -${amount * 100}%`);
    }
    
    applyTeleportation() {
        console.log('Applying teleportation');
    }
    
    applyLifeDrain() {
        console.log('Applying life drain');
    }
    
    applyFreezeField() {
        console.log('Applying freeze field');
    }
    
    applyVampiricStrike() {
        console.log('Applying vampiric strike');
    }
    
    applyLightningTeleport() {
        console.log('Applying lightning teleport');
    }
    
    applyTreasureHunter() {
        console.log('Applying treasure hunter');
    }
    
    applyGravityPull() {
        console.log('Applying gravity pull');
    }
    
    applyTreasureCooldown() {
        console.log('Applying treasure cooldown');
    }
    
    applyForceManipulation() {
        console.log('Applying force manipulation');
    }
    
    applyTreasureLifesteal() {
        console.log('Applying treasure lifesteal');
    }
    
    applyFrostTeleport() {
        console.log('Applying frost teleport');
    }
    
    applyUltimateTreasure() {
        console.log('Applying ultimate treasure');
    }
    
    applyRealityWarp() {
        console.log('Applying reality warp');
    }
    
    /**
     * Get choice system info
     */
    getChoiceSystemInfo() {
        return {
            totalChoices: Object.keys(this.choiceData).length,
            choiceTypes: Object.keys(this.choiceTypes).length,
            choiceRarities: Object.keys(this.choiceRarities).length,
            choiceTags: Object.keys(this.choiceTags).length,
            currentChoices: this.getCurrentChoices(),
            statistics: this.getChoiceStatistics()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Cleanup any resources
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChoiceSystemIntegration;
} else if (typeof window !== 'undefined') {
    window.ChoiceSystemIntegration = ChoiceSystemIntegration;
}