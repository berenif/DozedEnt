// Test suite for Wolf AI WASM Integration
// Verifies that all new AI features are working correctly

import { expect } from 'chai';
import WolfAIWASMIntegration from '../../src/ai/wolf-ai-wasm-integration.js';

describe('Wolf AI WASM Integration', () => {
    let mockWasm;
    let integration;
    let soundPlayedCalls;
    
    beforeEach(() => {
        // Create mock WASM module with all the new exports
        mockWasm = {
            // Vocalization exports
            get_vocalization_count: () => 2,
            get_vocalization_type: (idx) => idx === 0 ? 1 : 8, // HowlRally, BarkAlert
            get_vocalization_x: (idx) => idx === 0 ? 0.5 : 0.3,
            get_vocalization_y: (idx) => idx === 0 ? 0.5 : 0.7,
            get_vocalization_intensity: (idx) => idx === 0 ? 1.0 : 0.8,
            get_vocalization_wolf_index: (idx) => idx,
            
            // Alpha wolf exports
            get_alpha_wolf_index: () => 0,
            get_alpha_ability: () => 2, // CoordinatedStrike
            get_alpha_is_enraged: () => 0,
            get_alpha_leadership_bonus: () => 0.25,
            
            // Territory exports
            get_territory_count: () => 1,
            get_territory_x: () => 0.5,
            get_territory_y: () => 0.5,
            get_territory_radius: () => 0.2,
            get_territory_strength: () => 0.8,
            
            // Scent exports
            get_scent_marker_count: () => 3,
            get_scent_marker_x: (idx) => 0.1 + idx * 0.3,
            get_scent_marker_y: (idx) => 0.2 + idx * 0.2,
            get_scent_marker_strength: (idx) => 1.0 - idx * 0.3,
            get_scent_strength_at: (x, y) => Math.max(0, 1 - Math.sqrt(x * x + y * y)),
            
            // Enemy emotion exports
            get_enemy_emotion: (idx) => idx % 7, // Cycle through emotions
            get_enemy_emotion_intensity: (idx) => 0.5 + (idx % 5) * 0.1,
            get_enemy_aggression: (idx) => 0.3 + (idx % 4) * 0.15,
            get_enemy_intelligence: (idx) => 0.4 + (idx % 3) * 0.2,
            get_enemy_coordination: (idx) => 0.5 + (idx % 3) * 0.15,
            get_enemy_morale: (idx) => 0.6 + (idx % 4) * 0.1,
            
            // Pack exports
            get_pack_plan: () => 3, // Commit
            get_pack_morale: () => 0.75,
            get_pack_sync_timer: () => 0.5,
            
            // Adaptive difficulty exports
            get_player_skill_estimate: () => 0.6,
            get_difficulty_wolf_speed: () => 1.1,
            get_difficulty_wolf_aggression: () => 0.65,
            get_difficulty_wolf_intelligence: () => 0.7,
            
            // Basic enemy exports
            get_enemy_x: (idx) => 0.5 + idx * 0.1,
            get_enemy_y: (idx) => 0.5 - idx * 0.1
        };
        
        // Track sound system calls
        soundPlayedCalls = [];
        const mockSoundSystem = {
            playSound: (name, options) => {
                soundPlayedCalls.push({ name, options });
            }
        };
        
        integration = new WolfAIWASMIntegration(mockWasm);
        integration.init(mockSoundSystem);
    });
    
    describe('Vocalization System', () => {
        it('should retrieve vocalizations from WASM', () => {
            integration.update();
            
            expect(integration.cache.vocalizations).to.have.lengthOf(2);
            expect(integration.cache.vocalizations[0].type).to.equal(1); // HowlRally
            expect(integration.cache.vocalizations[1].type).to.equal(8); // BarkAlert
        });
        
        it('should play appropriate sounds for vocalizations', () => {
            integration.update();
            
            expect(soundPlayedCalls).to.have.lengthOf(2);
            expect(soundPlayedCalls[0].name).to.equal('wolf_howl_rally');
            expect(soundPlayedCalls[1].name).to.equal('wolf_bark_alert');
        });
        
        it('should include position and intensity in vocalizations', () => {
            integration.update();
            
            const vocal = integration.cache.vocalizations[0];
            expect(vocal.x).to.equal(0.5);
            expect(vocal.y).to.equal(0.5);
            expect(vocal.intensity).to.equal(1.0);
            expect(vocal.wolfIndex).to.equal(0);
        });
    });
    
    describe('Alpha Wolf System', () => {
        it('should retrieve alpha wolf information', () => {
            integration.update();
            
            expect(integration.cache.alphaInfo).to.not.be.null;
            expect(integration.cache.alphaInfo.wolfIndex).to.equal(0);
            expect(integration.cache.alphaInfo.ability).to.equal(2); // CoordinatedStrike
            expect(integration.cache.alphaInfo.isEnraged).to.be.false;
            expect(integration.cache.alphaInfo.leadershipBonus).to.equal(0.25);
        });
        
        it('should handle no alpha wolf', () => {
            mockWasm.get_alpha_wolf_index = () => -1;
            integration.update();
            
            expect(integration.cache.alphaInfo).to.be.null;
        });
    });
    
    describe('Territory System', () => {
        it('should retrieve territory information', () => {
            integration.update();
            
            expect(integration.cache.territories).to.have.lengthOf(1);
            const territory = integration.cache.territories[0];
            expect(territory.x).to.equal(0.5);
            expect(territory.y).to.equal(0.5);
            expect(territory.radius).to.equal(0.2);
            expect(territory.strength).to.equal(0.8);
        });
        
        it('should check if position is in territory', () => {
            integration.update();
            
            expect(integration.isInTerritory(0.5, 0.5)).to.be.true; // Center
            expect(integration.isInTerritory(0.6, 0.5)).to.be.true; // Within radius
            expect(integration.isInTerritory(0.8, 0.5)).to.be.false; // Outside radius
        });
        
        it('should calculate territory strength at position', () => {
            integration.update();
            
            const centerStrength = integration.getTerritoryStrengthAt(0.5, 0.5);
            expect(centerStrength).to.be.closeTo(0.8, 0.01); // Full strength at center
            
            const edgeStrength = integration.getTerritoryStrengthAt(0.69, 0.5);
            expect(edgeStrength).to.be.above(0); // Some strength near edge
            expect(edgeStrength).to.be.below(0.8); // Less than center
            
            const outsideStrength = integration.getTerritoryStrengthAt(0.8, 0.5);
            expect(outsideStrength).to.equal(0); // No strength outside
        });
    });
    
    describe('Scent Tracking System', () => {
        it('should retrieve scent markers', () => {
            integration.update();
            
            expect(integration.cache.scentMarkers).to.have.lengthOf(3);
            expect(integration.cache.scentMarkers[0].strength).to.equal(1.0);
            expect(integration.cache.scentMarkers[2].strength).to.equal(0.4);
        });
        
        it('should get scent strength at position', () => {
            const strength = integration.getScentStrengthAt(0, 0);
            expect(strength).to.equal(1.0); // Max at origin
            
            const weakStrength = integration.getScentStrengthAt(0.5, 0.5);
            expect(weakStrength).to.be.below(1.0);
            expect(weakStrength).to.be.above(0);
        });
    });
    
    describe('Emotional State System', () => {
        it('should retrieve wolf emotional state', () => {
            const emotion = integration.getWolfEmotion(1);
            
            expect(emotion.state).to.equal(1); // Aggressive
            expect(emotion.name).to.equal('Aggressive');
            expect(emotion.intensity).to.equal(0.6);
        });
        
        it('should retrieve wolf AI attributes', () => {
            const attributes = integration.getWolfAttributes(2);
            
            expect(attributes.aggression).to.be.above(0);
            expect(attributes.intelligence).to.be.above(0);
            expect(attributes.coordination).to.be.above(0);
            expect(attributes.morale).to.be.above(0);
        });
    });
    
    describe('Pack System', () => {
        it('should retrieve pack information', () => {
            const packInfo = integration.getPackInfo();
            
            expect(packInfo.plan).to.equal(3);
            expect(packInfo.planName).to.equal('Commit');
            expect(packInfo.morale).to.equal(0.75);
            expect(packInfo.syncTimer).to.equal(0.5);
        });
    });
    
    describe('Adaptive Difficulty System', () => {
        it('should retrieve adaptive difficulty parameters', () => {
            const difficulty = integration.getAdaptiveDifficulty();
            
            expect(difficulty.playerSkillEstimate).to.equal(0.6);
            expect(difficulty.wolfSpeed).to.equal(1.1);
            expect(difficulty.wolfAggression).to.equal(0.65);
            expect(difficulty.wolfIntelligence).to.equal(0.7);
        });
    });
    
    describe('Debug Features', () => {
        it('should provide comprehensive debug info', () => {
            integration.update();
            const debug = integration.getDebugInfo();
            
            expect(debug).to.have.property('vocalizations');
            expect(debug).to.have.property('alphaInfo');
            expect(debug).to.have.property('territories');
            expect(debug).to.have.property('scentMarkers');
            expect(debug).to.have.property('packInfo');
            expect(debug).to.have.property('difficulty');
        });
        
        it('should render debug overlay without errors', () => {
            const mockCanvas = { width: 800, height: 600 };
            const mockCtx = {
                save: () => {},
                restore: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                fillText: () => {},
                globalAlpha: 0,
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                font: ''
            };
            
            integration.update();
            
            // Should not throw
            expect(() => {
                integration.renderDebugOverlay(mockCtx, mockCanvas);
            }).to.not.throw();
        });
    });
    
    describe('Performance', () => {
        it('should throttle updates to 60 FPS', () => {
            const originalNow = performance.now;
            let currentTime = 0;
            performance.now = () => currentTime;
            
            integration.update();
            expect(integration.cache.vocalizations).to.have.lengthOf(2);
            
            // Reset mock to return empty
            mockWasm.get_vocalization_count = () => 0;
            
            // Update again immediately - should be throttled
            currentTime = 10; // Only 10ms later
            integration.update();
            expect(integration.cache.vocalizations).to.have.lengthOf(2); // Still cached
            
            // Update after 16ms - should update
            currentTime = 20; // 20ms since first update
            integration.update();
            expect(integration.cache.vocalizations).to.have.lengthOf(0); // Updated
            
            performance.now = originalNow;
        });
    });
});

// Export for test runner
export default { WolfAIWASMIntegration };