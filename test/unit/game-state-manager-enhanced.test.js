import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { GameStateManager } from '../../src/game/game-state-manager.js';

describe('GameStateManager', function() {
  let gameStateManager;
  let mockWasmModule;
  let mockLocalStorage;

  beforeEach(function() {
    // Mock WASM module with all required functions
    mockWasmModule = {
      // Core game functions
      init_run: sinon.stub(),
      reset_run: sinon.stub(),
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(1.0),
      get_phase: sinon.stub().returns(0), // Explore phase
      get_room_count: sinon.stub().returns(1),
      
      // Combat functions
      on_attack: sinon.stub().returns(1),
      on_roll_start: sinon.stub().returns(1),
      set_blocking: sinon.stub().returns(1),
      get_block_state: sinon.stub().returns(0),
      handle_incoming_attack: sinon.stub().returns(0),
      
      // Choice system
      get_choice_count: sinon.stub().returns(3),
      get_choice_id: sinon.stub().returns(1),
      get_choice_type: sinon.stub().returns(0),
      get_choice_rarity: sinon.stub().returns(1),
      get_choice_tags: sinon.stub().returns(0),
      commit_choice: sinon.stub(),
      generate_choices: sinon.stub(),
      
      // Risk phase
      get_curse_count: sinon.stub().returns(0),
      get_curse_type: sinon.stub().returns(0),
      get_curse_intensity: sinon.stub().returns(0.0),
      get_risk_multiplier: sinon.stub().returns(1.0),
      get_elite_active: sinon.stub().returns(0),
      escape_risk: sinon.stub(),
      
      // Escalate phase
      get_escalation_level: sinon.stub().returns(0.0),
      get_spawn_rate_modifier: sinon.stub().returns(1.0),
      get_miniboss_active: sinon.stub().returns(0),
      get_miniboss_x: sinon.stub().returns(0.5),
      get_miniboss_y: sinon.stub().returns(0.5),
      damage_miniboss: sinon.stub(),
      
      // CashOut phase
      get_gold: sinon.stub().returns(100),
      get_essence: sinon.stub().returns(10),
      get_shop_item_count: sinon.stub().returns(5),
      buy_shop_item: sinon.stub(),
      buy_heal: sinon.stub(),
      reroll_shop_items: sinon.stub(),
      
      // Enemy system
      get_enemy_count: sinon.stub().returns(2),
      get_enemy_x: sinon.stub().returns(0.3),
      get_enemy_y: sinon.stub().returns(0.7),
      get_enemy_health: sinon.stub().returns(100),
      get_enemy_type: sinon.stub().returns(0),
      
      // Animation state
      get_player_anim_state: sinon.stub().returns(0),
      set_player_input: sinon.stub()
    };

    // Mock localStorage
    mockLocalStorage = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
      removeItem: sinon.stub(),
      clear: sinon.stub()
    };
    global.localStorage = mockLocalStorage;

    gameStateManager = new GameStateManager(mockWasmModule);
  });

  afterEach(function() {
    sinon.restore();
    delete global.localStorage;
  });

  describe('Initialization', function() {
    it('should initialize with WASM module', function() {
      expect(gameStateManager.wasmModule).to.equal(mockWasmModule);
      expect(gameStateManager.isInitialized).to.be.false;
    });

    it('should initialize game state', async function() {
      await gameStateManager.initialize();
      
      expect(gameStateManager.isInitialized).to.be.true;
      expect(mockWasmModule.init_run.called).to.be.true;
    });

    it('should handle initialization with custom seed', async function() {
      const customSeed = 12345;
      await gameStateManager.initialize({ seed: customSeed });
      
      expect(mockWasmModule.init_run.calledWith(customSeed)).to.be.true;
    });

    it('should handle initialization failure gracefully', async function() {
      mockWasmModule.init_run.throws(new Error('WASM initialization failed'));
      const consoleSpy = sinon.spy(console, 'error');
      
      await gameStateManager.initialize();
      
      expect(gameStateManager.isInitialized).to.be.false;
      expect(consoleSpy.called).to.be.true;
    });
  });

  describe('Game State Updates', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should update game state with input', function() {
      const input = {
        dirX: 0.5,
        dirY: -0.3,
        isRolling: false,
        isJumping: true,
        lightAttack: false,
        heavyAttack: true,
        isBlocking: false,
        special: false
      };
      
      gameStateManager.update(input, 0.016);
      
      expect(mockWasmModule.set_player_input.calledWith(
        0.5, -0.3, false, true, false, true, false, false
      )).to.be.true;
      expect(mockWasmModule.update.calledWith(0.5, -0.3, false, 0.016)).to.be.true;
    });

    it('should get current player state', function() {
      const state = gameStateManager.getPlayerState();
      
      expect(state).to.deep.include({
        x: 0.5,
        y: 0.5,
        stamina: 1.0,
        phase: 0,
        roomCount: 1
      });
      expect(mockWasmModule.get_x.called).to.be.true;
      expect(mockWasmModule.get_y.called).to.be.true;
      expect(mockWasmModule.get_stamina.called).to.be.true;
    });

    it('should get current game phase', function() {
      mockWasmModule.get_phase.returns(2); // Choose phase
      
      const phase = gameStateManager.getCurrentPhase();
      
      expect(phase).to.equal(2);
      expect(mockWasmModule.get_phase.called).to.be.true;
    });
  });

  describe('Combat System', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should handle attack actions', function() {
      mockWasmModule.on_attack.returns(1); // Success
      
      const result = gameStateManager.performAttack();
      
      expect(result).to.be.true;
      expect(mockWasmModule.on_attack.called).to.be.true;
    });

    it('should handle roll/dodge actions', function() {
      mockWasmModule.on_roll_start.returns(1); // Success
      
      const result = gameStateManager.performRoll();
      
      expect(result).to.be.true;
      expect(mockWasmModule.on_roll_start.called).to.be.true;
    });

    it('should handle blocking', function() {
      const result = gameStateManager.setBlocking(true, 1.0, 0.0, 1000);
      
      expect(result).to.be.true;
      expect(mockWasmModule.set_blocking.calledWith(1, 1.0, 0.0, 1000)).to.be.true;
    });

    it('should get block state', function() {
      mockWasmModule.get_block_state.returns(1);
      
      const isBlocking = gameStateManager.isBlocking();
      
      expect(isBlocking).to.be.true;
      expect(mockWasmModule.get_block_state.called).to.be.true;
    });

    it('should handle incoming attacks', function() {
      mockWasmModule.handle_incoming_attack.returns(2); // Perfect parry
      
      const result = gameStateManager.handleIncomingAttack(0.5, 0.5, 1.0, 0.0, 1000);
      
      expect(result).to.equal(2);
      expect(mockWasmModule.handle_incoming_attack.calledWith(0.5, 0.5, 1.0, 0.0, 1000)).to.be.true;
    });
  });

  describe('Choice System', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get available choices', function() {
      mockWasmModule.get_choice_count.returns(3);
      mockWasmModule.get_choice_id.onCall(0).returns(101);
      mockWasmModule.get_choice_id.onCall(1).returns(102);
      mockWasmModule.get_choice_id.onCall(2).returns(103);
      mockWasmModule.get_choice_type.returns(1);
      mockWasmModule.get_choice_rarity.returns(2);
      mockWasmModule.get_choice_tags.returns(4);
      
      const choices = gameStateManager.getAvailableChoices();
      
      expect(choices).to.have.length(3);
      expect(choices[0]).to.deep.include({
        id: 101,
        type: 1,
        rarity: 2,
        tags: 4
      });
    });

    it('should commit choice selection', function() {
      gameStateManager.selectChoice(101);
      
      expect(mockWasmModule.commit_choice.calledWith(101)).to.be.true;
    });

    it('should generate new choices', function() {
      gameStateManager.generateChoices();
      
      expect(mockWasmModule.generate_choices.called).to.be.true;
    });
  });

  describe('Risk Phase', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get risk phase data', function() {
      mockWasmModule.get_curse_count.returns(2);
      mockWasmModule.get_curse_type.onCall(0).returns(1);
      mockWasmModule.get_curse_type.onCall(1).returns(2);
      mockWasmModule.get_curse_intensity.onCall(0).returns(0.5);
      mockWasmModule.get_curse_intensity.onCall(1).returns(0.8);
      mockWasmModule.get_risk_multiplier.returns(1.5);
      mockWasmModule.get_elite_active.returns(1);
      
      const riskData = gameStateManager.getRiskPhaseData();
      
      expect(riskData.curses).to.have.length(2);
      expect(riskData.multiplier).to.equal(1.5);
      expect(riskData.eliteActive).to.be.true;
      expect(riskData.curses[0]).to.deep.include({
        type: 1,
        intensity: 0.5
      });
    });

    it('should escape risk phase', function() {
      gameStateManager.escapeRisk();
      
      expect(mockWasmModule.escape_risk.called).to.be.true;
    });
  });

  describe('Escalate Phase', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get escalation data', function() {
      mockWasmModule.get_escalation_level.returns(0.7);
      mockWasmModule.get_spawn_rate_modifier.returns(2.0);
      mockWasmModule.get_miniboss_active.returns(1);
      mockWasmModule.get_miniboss_x.returns(0.8);
      mockWasmModule.get_miniboss_y.returns(0.3);
      
      const escalationData = gameStateManager.getEscalationData();
      
      expect(escalationData).to.deep.include({
        level: 0.7,
        spawnRateModifier: 2.0,
        minibossActive: true,
        minibossPosition: { x: 0.8, y: 0.3 }
      });
    });

    it('should damage miniboss', function() {
      gameStateManager.damageMiniboss(50);
      
      expect(mockWasmModule.damage_miniboss.calledWith(50)).to.be.true;
    });
  });

  describe('CashOut Phase', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get shop data', function() {
      mockWasmModule.get_gold.returns(150);
      mockWasmModule.get_essence.returns(25);
      mockWasmModule.get_shop_item_count.returns(6);
      
      const shopData = gameStateManager.getShopData();
      
      expect(shopData).to.deep.include({
        gold: 150,
        essence: 25,
        itemCount: 6
      });
    });

    it('should buy shop items', function() {
      gameStateManager.buyShopItem(2);
      
      expect(mockWasmModule.buy_shop_item.calledWith(2)).to.be.true;
    });

    it('should buy heal', function() {
      gameStateManager.buyHeal();
      
      expect(mockWasmModule.buy_heal.called).to.be.true;
    });

    it('should reroll shop items', function() {
      gameStateManager.rerollShop();
      
      expect(mockWasmModule.reroll_shop_items.called).to.be.true;
    });
  });

  describe('Enemy System', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get enemy data', function() {
      mockWasmModule.get_enemy_count.returns(3);
      mockWasmModule.get_enemy_x.onCall(0).returns(0.2);
      mockWasmModule.get_enemy_x.onCall(1).returns(0.8);
      mockWasmModule.get_enemy_x.onCall(2).returns(0.5);
      mockWasmModule.get_enemy_y.onCall(0).returns(0.3);
      mockWasmModule.get_enemy_y.onCall(1).returns(0.7);
      mockWasmModule.get_enemy_y.onCall(2).returns(0.1);
      mockWasmModule.get_enemy_health.returns(80);
      mockWasmModule.get_enemy_type.returns(1);
      
      const enemies = gameStateManager.getEnemies();
      
      expect(enemies).to.have.length(3);
      expect(enemies[0]).to.deep.include({
        x: 0.2,
        y: 0.3,
        health: 80,
        type: 1
      });
    });
  });

  describe('Save/Load System', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should save game state to localStorage', function() {
      const gameData = {
        seed: 12345,
        phase: 2,
        roomCount: 5,
        playerState: { x: 0.3, y: 0.7, stamina: 0.8 }
      };
      
      gameStateManager.saveGame('slot1', gameData);
      
      expect(mockLocalStorage.setItem.called).to.be.true;
      const savedData = JSON.parse(mockLocalStorage.setItem.getCall(0).args[1]);
      expect(savedData).to.deep.include(gameData);
    });

    it('should load game state from localStorage', function() {
      const gameData = {
        seed: 12345,
        phase: 2,
        roomCount: 5,
        timestamp: Date.now()
      };
      mockLocalStorage.getItem.returns(JSON.stringify(gameData));
      
      const loadedData = gameStateManager.loadGame('slot1');
      
      expect(mockLocalStorage.getItem.calledWith('dozedent_save_slot1')).to.be.true;
      expect(loadedData).to.deep.include(gameData);
    });

    it('should handle loading non-existent save', function() {
      mockLocalStorage.getItem.returns(null);
      
      const loadedData = gameStateManager.loadGame('nonexistent');
      
      expect(loadedData).to.be.null;
    });

    it('should delete save slot', function() {
      gameStateManager.deleteSave('slot1');
      
      expect(mockLocalStorage.removeItem.calledWith('dozedent_save_slot1')).to.be.true;
    });

    it('should list all saves', function() {
      mockLocalStorage.getItem
        .withArgs('dozedent_save_slot1').returns(JSON.stringify({ timestamp: 1000 }))
        .withArgs('dozedent_save_slot2').returns(JSON.stringify({ timestamp: 2000 }))
        .withArgs('dozedent_save_slot3').returns(null);
      
      const saves = gameStateManager.listSaves();
      
      expect(saves).to.have.length(2);
      expect(saves[0].slot).to.equal('slot1');
      expect(saves[1].slot).to.equal('slot2');
    });
  });

  describe('Game Reset', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should reset game with new seed', function() {
      const newSeed = 67890;
      gameStateManager.resetGame(newSeed);
      
      expect(mockWasmModule.reset_run.calledWith(newSeed)).to.be.true;
    });

    it('should reset game with random seed if none provided', function() {
      gameStateManager.resetGame();
      
      expect(mockWasmModule.reset_run.called).to.be.true;
      const calledSeed = mockWasmModule.reset_run.getCall(0).args[0];
      expect(calledSeed).to.be.a('number');
      expect(calledSeed).to.be.greaterThan(0);
    });
  });

  describe('Animation State', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should get player animation state', function() {
      mockWasmModule.get_player_anim_state.returns(3); // Attack state
      
      const animState = gameStateManager.getPlayerAnimationState();
      
      expect(animState).to.equal(3);
      expect(mockWasmModule.get_player_anim_state.called).to.be.true;
    });
  });

  describe('Error Handling', function() {
    it('should handle WASM function call failures', async function() {
      await gameStateManager.initialize();
      
      mockWasmModule.get_x.throws(new Error('WASM function failed'));
      const consoleSpy = sinon.spy(console, 'error');
      
      const state = gameStateManager.getPlayerState();
      
      expect(state.x).to.equal(0); // Default fallback
      expect(consoleSpy.called).to.be.true;
    });

    it('should handle missing WASM functions gracefully', function() {
      const incompleteWasm = { init_run: sinon.stub() };
      const manager = new GameStateManager(incompleteWasm);
      const consoleSpy = sinon.spy(console, 'warn');
      
      const state = manager.getPlayerState();
      
      expect(state).to.deep.include({
        x: 0,
        y: 0,
        stamina: 0
      });
      expect(consoleSpy.called).to.be.true;
    });

    it('should handle localStorage failures', async function() {
      await gameStateManager.initialize();
      
      mockLocalStorage.setItem.throws(new Error('Storage quota exceeded'));
      const consoleSpy = sinon.spy(console, 'error');
      
      const result = gameStateManager.saveGame('slot1', { test: 'data' });
      
      expect(result).to.be.false;
      expect(consoleSpy.called).to.be.true;
    });
  });

  describe('Performance', function() {
    beforeEach(async function() {
      await gameStateManager.initialize();
    });

    it('should cache frequently accessed state', function() {
      // Call multiple times
      gameStateManager.getPlayerState();
      gameStateManager.getPlayerState();
      gameStateManager.getPlayerState();
      
      // Should cache and not call WASM functions excessively
      expect(mockWasmModule.get_x.callCount).to.be.lessThan(10);
    });

    it('should handle high-frequency updates', function() {
      const input = { dirX: 0, dirY: 0, isRolling: false, isJumping: false };
      
      // Simulate 60 FPS updates
      for (let i = 0; i < 60; i++) {
        gameStateManager.update(input, 0.016);
      }
      
      expect(mockWasmModule.update.callCount).to.equal(60);
    });
  });
});
