import { expect } from 'chai';
import sinon from 'sinon';
import { GameStateManager } from '../../src/game/game-state-manager.js';

// Clean up after each test
afterEach(() => {
  sinon.restore();
});

describe('GameStateManager', () => {
  let gameStateManager;
  let mockWasmManager;
  let mockEventEmitter;

  beforeEach(() => {
    // Create mock WASM manager with all required functions
    mockWasmManager = {
      // Core simulation functions
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(100),
      get_phase: sinon.stub().returns(0), // Explore phase
      get_room_count: sinon.stub().returns(1),
      getCurrentBiome: sinon.stub().returns(0),
      getPlayerState: sinon.stub().returns({ x: 0.5, y: 0.5, stamina: 100 }),
      getPlayerPosition: sinon.stub().returns({ x: 0.5, y: 0.5 }),
      getStamina: sinon.stub().returns(100),
      
      // Combat functions
      on_attack: sinon.stub().returns(1),
      on_roll_start: sinon.stub().returns(1),
      set_blocking: sinon.stub().returns(1),
      get_block_state: sinon.stub().returns(0),
      handle_incoming_attack: sinon.stub().returns(0),
      
      // Choice system functions
      get_choice_count: sinon.stub().returns(3),
      get_choice_id: sinon.stub().returns(1),
      get_choice_type: sinon.stub().returns(0),
      get_choice_rarity: sinon.stub().returns(1),
      get_choice_tags: sinon.stub().returns(0),
      commit_choice: sinon.stub(),
      generate_choices: sinon.stub(),
      
      // Risk phase functions
      get_curse_count: sinon.stub().returns(0),
      get_curse_type: sinon.stub().returns(0),
      get_curse_intensity: sinon.stub().returns(0),
      get_risk_multiplier: sinon.stub().returns(1.0),
      get_elite_active: sinon.stub().returns(0),
      escape_risk: sinon.stub(),
      
      // Escalate phase functions
      get_escalation_level: sinon.stub().returns(0),
      get_spawn_rate_modifier: sinon.stub().returns(1.0),
      get_miniboss_active: sinon.stub().returns(0),
      get_miniboss_x: sinon.stub().returns(0.5),
      get_miniboss_y: sinon.stub().returns(0.5),
      damage_miniboss: sinon.stub(),
      
      // CashOut phase functions
      get_gold: sinon.stub().returns(0),
      get_essence: sinon.stub().returns(0),
      get_shop_item_count: sinon.stub().returns(0),
      buy_shop_item: sinon.stub(),
      buy_heal: sinon.stub(),
      reroll_shop_items: sinon.stub(),
      
      // Wolf-specific functions
      get_wolf_count: sinon.stub().returns(0),
      get_wolf_x: sinon.stub().returns(0.5),
      get_wolf_y: sinon.stub().returns(0.5),
      get_wolf_state: sinon.stub().returns(0),
      get_wolf_health: sinon.stub().returns(100),
      get_wolf_stamina: sinon.stub().returns(100),
      get_wolf_velocity_x: sinon.stub().returns(0),
      get_wolf_velocity_y: sinon.stub().returns(0),
      get_wolf_facing: sinon.stub().returns(1),
      get_wolf_animation_frame: sinon.stub().returns(0),
      get_wolf_animation_time: sinon.stub().returns(0),
      get_wolf_lunge_state: sinon.stub().returns(0),
      get_wolf_pack_formation_x: sinon.stub().returns(0),
      get_wolf_pack_formation_y: sinon.stub().returns(0),
      get_wolf_pack_formation_angle: sinon.stub().returns(0),
      get_wolf_detection_range: sinon.stub().returns(300),
      get_wolf_attack_range: sinon.stub().returns(50),
      get_wolf_damage: sinon.stub().returns(15),
      get_wolf_type: sinon.stub().returns(0),
      get_wolf_size: sinon.stub().returns(1.0),
      get_wolf_fur_pattern: sinon.stub().returns(0.5),
      get_wolf_colors: sinon.stub().returns(0),
      get_wolf_howl_cooldown: sinon.stub().returns(0),
      get_wolf_last_howl_time: sinon.stub().returns(0),
      get_wolf_ai_state: sinon.stub().returns(0),
      get_wolf_target_x: sinon.stub().returns(0),
      get_wolf_target_y: sinon.stub().returns(0),
      get_wolf_memory_count: sinon.stub().returns(0),
      get_wolf_emotion_state: sinon.stub().returns(0),
      get_wolf_pack_role: sinon.stub().returns(0),
      get_wolf_terrain_awareness: sinon.stub().returns(0),
      get_wolf_communication_state: sinon.stub().returns(0),
      get_wolf_adaptive_difficulty: sinon.stub().returns(1.0),
      get_wolf_performance_metrics: sinon.stub().returns(0)
    };

    // Create mock event emitter
    mockEventEmitter = {
      emit: sinon.stub(),
      on: sinon.stub(),
      off: sinon.stub(),
      once: sinon.stub()
    };

    gameStateManager = new GameStateManager();
    
    // Mock the event emitter methods
    gameStateManager.emit = mockEventEmitter.emit;
    gameStateManager.on = mockEventEmitter.on;
    gameStateManager.off = mockEventEmitter.off;
    gameStateManager.once = mockEventEmitter.once;
  });

  describe('Constructor and Initialization', () => {
    it('should create GameStateManager with default properties', () => {
      expect(gameStateManager.isGameRunning).to.be.false;
      expect(gameStateManager.isPaused).to.be.false;
      expect(gameStateManager.currentBiome).to.equal(0);
      expect(gameStateManager.gameStartTime).to.equal(0);
      expect(gameStateManager.lastUpdateTime).to.equal(0);
    });

    it('should initialize player state', () => {
      expect(gameStateManager.playerState).to.be.an('object');
      expect(gameStateManager.playerState.position).to.deep.equal({ x: 0, y: 0 });
      expect(gameStateManager.playerState.stamina).to.equal(1);
      expect(gameStateManager.playerState.isRolling).to.be.false;
      expect(gameStateManager.playerState.isBlocking).to.be.false;
      expect(gameStateManager.playerState.facing).to.deep.equal({ x: 0, y: 0 });
      expect(gameStateManager.playerState.lastAttackTime).to.equal(0);
      expect(gameStateManager.playerState.lastRollTime).to.equal(0);
    });

    it('should initialize phase state', () => {
      expect(gameStateManager.phaseState).to.be.an('object');
      expect(gameStateManager.phaseState.currentPhase).to.equal(0);
      expect(gameStateManager.phaseState.availableChoices).to.be.an('array');
      expect(gameStateManager.phaseState.selectedChoice).to.be.null;
    });

    it('should initialize wolf state', () => {
      expect(gameStateManager.wolfState).to.be.an('object');
      expect(gameStateManager.wolfState.characters).to.be.an('array');
      expect(gameStateManager.wolfState.aiSystem).to.be.null;
      expect(gameStateManager.wolfState.activeVocalizations).to.be.instanceOf(Map);
    });

    it('should initialize camera state', () => {
      expect(gameStateManager.cameraState).to.be.an('object');
      expect(gameStateManager.cameraState.shakeEndTime).to.equal(0);
      expect(gameStateManager.cameraState.shakeStrength).to.equal(0);
      expect(gameStateManager.cameraState.targetPosition).to.deep.equal({ x: 0, y: 0 });
      expect(gameStateManager.cameraState.currentPosition).to.deep.equal({ x: 0, y: 0 });
    });

    it('should initialize event listeners', () => {
      expect(gameStateManager.eventListeners).to.be.instanceOf(Map);
    });
  });

  describe('Game Lifecycle Management', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
    });

    it('should initialize game state with WASM manager', () => {
      expect(gameStateManager.wasmManager).to.equal(mockWasmManager);
      expect(gameStateManager.isGameRunning).to.be.false;
      expect(gameStateManager.isPaused).to.be.false;
    });

    it('should start game', () => {
      gameStateManager.startGame();
      
      expect(gameStateManager.isGameRunning).to.be.true;
      expect(gameStateManager.gameStartTime).to.be.a('number');
      expect(gameStateManager.gameStartTime).to.be.greaterThan(0);
      expect(mockEventEmitter.emit.calledWith('gameStarted')).to.be.true;
    });

    it('should pause game', () => {
      gameStateManager.startGame();
      gameStateManager.pauseGame();
      
      expect(gameStateManager.isPaused).to.be.true;
      expect(mockEventEmitter.emit.calledWith('gamePaused')).to.be.true;
    });

    it('should resume game', () => {
      gameStateManager.startGame();
      gameStateManager.pauseGame();
      gameStateManager.resumeGame();
      
      expect(gameStateManager.isPaused).to.be.false;
      expect(mockEventEmitter.emit.calledWith('gameResumed')).to.be.true;
    });

    it('should stop game', () => {
      gameStateManager.startGame();
      gameStateManager.stopGame();
      
      expect(gameStateManager.isGameRunning).to.be.false;
      expect(gameStateManager.isPaused).to.be.false;
      expect(mockEventEmitter.emit.calledWith('gameStopped')).to.be.true;
    });

    it('should start game even without WASM manager', () => {
      gameStateManager.wasmManager = null;
      gameStateManager.startGame();
      
      expect(gameStateManager.isGameRunning).to.be.true;
      expect(mockEventEmitter.emit.calledWith('gameStarted')).to.be.true;
    });
  });

  describe('Game Loop and State Updates', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should update game state with input', () => {
      const inputState = {
        direction: { x: 1, y: 0 },
        isRolling: false
      };
      
      gameStateManager.update(16, inputState);
      
      expect(mockWasmManager.update.calledWith(1, 0, 0, 16)).to.be.true;
      expect(mockEventEmitter.emit.calledWith('stateUpdated')).to.be.true;
    });

    it('should not update when game is not running', () => {
      gameStateManager.stopGame();
      
      const inputState = { direction: { x: 1, y: 0 }, isRolling: false };
      gameStateManager.update(16, inputState);
      
      expect(mockWasmManager.update.called).to.be.false;
    });

    it('should not update when game is paused', () => {
      gameStateManager.pauseGame();
      
      const inputState = { direction: { x: 1, y: 0 }, isRolling: false };
      gameStateManager.update(16, inputState);
      
      expect(mockWasmManager.update.called).to.be.false;
    });

    it('should not update without WASM manager', () => {
      gameStateManager.wasmManager = null;
      
      const inputState = { direction: { x: 1, y: 0 }, isRolling: false };
      gameStateManager.update(16, inputState);
      
      expect(mockWasmManager.update.called).to.be.false;
    });

    it('should update player state from WASM', () => {
      mockWasmManager.get_x.returns(0.7);
      mockWasmManager.get_y.returns(0.3);
      mockWasmManager.get_stamina.returns(80);
      mockWasmManager.get_block_state.returns(1);
      
      gameStateManager.updatePlayerState();
      
      expect(gameStateManager.playerState.position.x).to.equal(0.7);
      expect(gameStateManager.playerState.position.y).to.equal(0.3);
      expect(gameStateManager.playerState.stamina).to.equal(80);
      expect(gameStateManager.playerState.isBlocking).to.be.true;
    });

    it('should update phase state from WASM', () => {
      mockWasmManager.get_phase.returns(2); // Choose phase
      mockWasmManager.get_choice_count.returns(3);
      mockWasmManager.get_choice_id.returns(1);
      mockWasmManager.get_choice_type.returns(0);
      mockWasmManager.get_choice_rarity.returns(1);
      mockWasmManager.get_choice_tags.returns(0);
      
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(2);
      expect(gameStateManager.phaseState.availableChoices).to.be.an('array');
      expect(gameStateManager.phaseState.availableChoices.length).to.equal(3);
    });

    it('should update camera state', () => {
      gameStateManager.updateCameraState();

      // Camera state should be updated based on player position
      expect(gameStateManager.cameraState.targetPosition).to.deep.equal({ x: 0.5, y: 0.5 });
    });

    it('should synchronize position and phase from batched WASM state', () => {
      mockWasmManager.isLoaded = true;
      mockWasmManager.getPlayerState.returns({
        x: 0.65,
        y: 0.35,
        stamina: 75,
        health: 0.8,
        gold: 12,
        essence: 3,
        velX: 1,
        velY: -0.5,
        isRolling: 1,
        isBlocking: 0,
        animState: 2,
        phase: 3
      });

      gameStateManager.updateStateFromWasm();

      expect(gameStateManager.playerState.x).to.equal(0.65);
      expect(gameStateManager.playerState.y).to.equal(0.35);
      expect(gameStateManager.playerState.position).to.deep.equal({ x: 0.65, y: 0.35 });
      expect(gameStateManager.phaseState.currentPhase).to.equal(3);
      expect(gameStateManager.currentPhase).to.equal(3);
      expect(gameStateManager.cameraState.targetPosition).to.deep.equal({ x: 0.65, y: 0.35 });
      expect(gameStateManager.playerState.isRolling).to.be.true;
      expect(gameStateManager.playerState.isBlocking).to.be.false;
    });
  });

  describe('State Transitions and Phase Management', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should handle Explore phase (phase 0)', () => {
      mockWasmManager.get_phase.returns(0);
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(0);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 0)).to.be.true;
    });

    it('should handle Fight phase (phase 1)', () => {
      mockWasmManager.get_phase.returns(1);
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(1);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 1)).to.be.true;
    });

    it('should handle Choose phase (phase 2)', () => {
      mockWasmManager.get_phase.returns(2);
      mockWasmManager.get_choice_count.returns(3);
      mockWasmManager.get_choice_id.returns(1);
      mockWasmManager.get_choice_type.returns(0);
      mockWasmManager.get_choice_rarity.returns(1);
      mockWasmManager.get_choice_tags.returns(0);
      
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(2);
      expect(gameStateManager.phaseState.availableChoices.length).to.equal(3);
      expect(mockEventEmitter.emit.calledWith('choicesAvailable')).to.be.true;
    });

    it('should handle PowerUp phase (phase 3)', () => {
      mockWasmManager.get_phase.returns(3);
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(3);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 3)).to.be.true;
    });

    it('should handle Risk phase (phase 4)', () => {
      mockWasmManager.get_phase.returns(4);
      mockWasmManager.get_curse_count.returns(2);
      mockWasmManager.get_risk_multiplier.returns(1.5);
      mockWasmManager.get_elite_active.returns(1);
      
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(4);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 4)).to.be.true;
    });

    it('should handle Escalate phase (phase 5)', () => {
      mockWasmManager.get_phase.returns(5);
      mockWasmManager.get_escalation_level.returns(0.7);
      mockWasmManager.get_spawn_rate_modifier.returns(1.3);
      mockWasmManager.get_miniboss_active.returns(1);
      
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(5);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 5)).to.be.true;
    });

    it('should handle CashOut phase (phase 6)', () => {
      mockWasmManager.get_phase.returns(6);
      mockWasmManager.get_gold.returns(100);
      mockWasmManager.get_essence.returns(50);
      mockWasmManager.get_shop_item_count.returns(5);
      
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(6);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 6)).to.be.true;
    });

    it('should handle Reset phase (phase 7)', () => {
      mockWasmManager.get_phase.returns(7);
      gameStateManager.updatePhaseState();
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(7);
      expect(mockEventEmitter.emit.calledWith('phaseChanged', 7)).to.be.true;
    });

    it('should commit choice', () => {
      const choiceId = 1;
      gameStateManager.commitChoice(choiceId);
      
      expect(mockWasmManager.commit_choice.calledWith(choiceId)).to.be.true;
      expect(gameStateManager.phaseState.selectedChoice).to.equal(choiceId);
      expect(mockEventEmitter.emit.calledWith('choiceCommitted', choiceId)).to.be.true;
    });

    it('should generate choices', () => {
      gameStateManager.generateChoices();
      
      expect(mockWasmManager.generate_choices.called).to.be.true;
      expect(mockEventEmitter.emit.calledWith('choicesGenerated')).to.be.true;
    });
  });

  describe('Wolf AI State Management', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should update wolf state from WASM', () => {
      mockWasmManager.get_wolf_count.returns(2);
      mockWasmManager.get_wolf_x.returns(0.3);
      mockWasmManager.get_wolf_y.returns(0.7);
      mockWasmManager.get_wolf_state.returns(1);
      mockWasmManager.get_wolf_health.returns(80);
      mockWasmManager.get_wolf_stamina.returns(60);
      
      gameStateManager.updateWolfState();
      
      expect(gameStateManager.wolfState.characters).to.be.an('array');
      expect(gameStateManager.wolfState.characters.length).to.equal(2);
    });

    it('should handle wolf AI system integration', () => {
      const mockAISystem = {
        update: sinon.stub(),
        getState: sinon.stub().returns('hunting')
      };
      
      gameStateManager.wolfState.aiSystem = mockAISystem;
      gameStateManager.updateWolfState();
      
      expect(mockAISystem.update.called).to.be.true;
    });

    it('should handle wolf vocalizations', () => {
      gameStateManager.wolfState.activeVocalizations.set('howl', { time: 1000, intensity: 0.8 });
      
      expect(gameStateManager.wolfState.activeVocalizations.size).to.equal(1);
      expect(gameStateManager.wolfState.activeVocalizations.has('howl')).to.be.true;
    });
  });

  describe('Camera Effects and State', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should apply camera shake', () => {
      const strength = 0.5;
      const duration = 1000;
      
      gameStateManager.applyCameraShake(strength, duration);
      
      expect(gameStateManager.cameraState.shakeStrength).to.equal(strength);
      expect(gameStateManager.cameraState.shakeEndTime).to.be.greaterThan(0);
      expect(mockEventEmitter.emit.calledWith('cameraShake', strength, duration)).to.be.true;
    });

    it('should set camera target position', () => {
      const x = 100;
      const y = 200;
      
      gameStateManager.setCameraTarget(x, y);
      
      expect(gameStateManager.cameraState.targetPosition.x).to.equal(x);
      expect(gameStateManager.cameraState.targetPosition.y).to.equal(y);
    });

    it('should update camera position smoothly', () => {
      gameStateManager.cameraState.targetPosition = { x: 100, y: 200 };
      gameStateManager.cameraState.currentPosition = { x: 0, y: 0 };
      
      gameStateManager.updateCameraState();
      
      // Camera should move towards target
      expect(gameStateManager.cameraState.currentPosition.x).to.be.greaterThan(0);
      expect(gameStateManager.cameraState.currentPosition.y).to.be.greaterThan(0);
    });

    it('should decay camera shake over time', () => {
      gameStateManager.cameraState.shakeStrength = 0.5;
      gameStateManager.cameraState.shakeEndTime = performance.now() + 1000;
      
      gameStateManager.updateCameraState();
      
      // Shake should decay
      expect(gameStateManager.cameraState.shakeStrength).to.be.lessThan(0.5);
    });
  });

  describe('State Snapshots and Serialization', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should get complete state snapshot', () => {
      const snapshot = gameStateManager.getStateSnapshot();
      
      expect(snapshot).to.be.an('object');
      expect(snapshot.isGameRunning).to.equal(gameStateManager.isGameRunning);
      expect(snapshot.isPaused).to.equal(gameStateManager.isPaused);
      expect(snapshot.currentBiome).to.equal(gameStateManager.currentBiome);
      expect(snapshot.playerState).to.deep.equal(gameStateManager.playerState);
      expect(snapshot.phaseState).to.deep.equal(gameStateManager.phaseState);
      expect(snapshot.wolfState).to.deep.equal(gameStateManager.wolfState);
      expect(snapshot.cameraState).to.deep.equal(gameStateManager.cameraState);
    });

    it('should restore state from snapshot', () => {
      const snapshot = {
        isGameRunning: true,
        isPaused: false,
        currentBiome: 1,
        playerState: { position: { x: 0.7, y: 0.3 }, stamina: 80 },
        phaseState: { currentPhase: 2, availableChoices: [] },
        wolfState: { characters: [], aiSystem: null, activeVocalizations: new Map() },
        cameraState: { shakeEndTime: 0, shakeStrength: 0, targetPosition: { x: 0.7, y: 0.3 }, currentPosition: { x: 0.7, y: 0.3 } }
      };
      
      gameStateManager.restoreFromSnapshot(snapshot);
      
      expect(gameStateManager.isGameRunning).to.equal(snapshot.isGameRunning);
      expect(gameStateManager.isPaused).to.equal(snapshot.isPaused);
      expect(gameStateManager.currentBiome).to.equal(snapshot.currentBiome);
      expect(gameStateManager.playerState).to.deep.equal(snapshot.playerState);
      expect(gameStateManager.phaseState).to.deep.equal(snapshot.phaseState);
      expect(gameStateManager.wolfState).to.deep.equal(snapshot.wolfState);
      expect(gameStateManager.cameraState).to.deep.equal(snapshot.cameraState);
    });

    it('should handle invalid snapshot gracefully', () => {
      const invalidSnapshot = { invalid: 'data' };
      
      expect(() => gameStateManager.restoreFromSnapshot(invalidSnapshot)).to.not.throw();
    });
  });

  describe('Event System', () => {
    it('should register event listeners', () => {
      const callback = sinon.stub();
      
      gameStateManager.on('testEvent', callback);
      
      expect(mockEventEmitter.on.calledWith('testEvent', callback)).to.be.true;
    });

    it('should emit events', () => {
      gameStateManager.emit('testEvent', 'testData');
      
      expect(mockEventEmitter.emit.calledWith('testEvent', 'testData')).to.be.true;
    });

    it('should remove event listeners', () => {
      const callback = sinon.stub();
      
      gameStateManager.on('testEvent', callback);
      gameStateManager.off('testEvent', callback);
      
      expect(mockEventEmitter.off.calledWith('testEvent', callback)).to.be.true;
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = sinon.stub();
      const callback2 = sinon.stub();
      
      gameStateManager.on('testEvent', callback1);
      gameStateManager.on('testEvent', callback2);
      
      expect(mockEventEmitter.on.calledWith('testEvent', callback1)).to.be.true;
      expect(mockEventEmitter.on.calledWith('testEvent', callback2)).to.be.true;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle WASM manager errors gracefully', () => {
      mockWasmManager.get_x.throws(new Error('WASM error'));
      
      expect(() => gameStateManager.updatePlayerState()).to.not.throw();
    });

    it('should handle missing WASM functions', () => {
      gameStateManager.wasmManager = { get_x: sinon.stub().returns(0.5) };
      
      expect(() => gameStateManager.updatePlayerState()).to.not.throw();
    });

    it('should handle invalid input states', () => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
      
      expect(() => gameStateManager.update(16, null)).to.not.throw();
      expect(() => gameStateManager.update(16, {})).to.not.throw();
      expect(() => gameStateManager.update(16, { direction: null })).to.not.throw();
    });

    it('should handle negative delta time', () => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
      
      expect(() => gameStateManager.update(-16, { direction: { x: 0, y: 0 }, isRolling: false })).to.not.throw();
    });

    it('should handle extremely large delta time', () => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
      
      expect(() => gameStateManager.update(10000, { direction: { x: 0, y: 0 }, isRolling: false })).to.not.throw();
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(() => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
    });

    it('should update efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        gameStateManager.update(16, { direction: { x: 0, y: 0 }, isRolling: false });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle rapid state changes', () => {
      const phases = [0, 1, 2, 3, 4, 5, 6, 7];
      
      phases.forEach(phase => {
        mockWasmManager.get_phase.returns(phase);
        gameStateManager.updatePhaseState();
      });
      
      expect(gameStateManager.phaseState.currentPhase).to.equal(7);
    });

    it('should handle large numbers of wolves efficiently', () => {
      mockWasmManager.get_wolf_count.returns(100);
      
      const startTime = performance.now();
      gameStateManager.updateWolfState();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).to.be.lessThan(50); // Should handle 100 wolves in less than 50ms
    });
  });

  describe('Integration with WASM Manager', () => {
    it('should properly integrate with WASM manager lifecycle', () => {
      expect(gameStateManager.wasmManager).to.be.undefined;
      
      gameStateManager.initialize(mockWasmManager);
      expect(gameStateManager.wasmManager).to.equal(mockWasmManager);
      
      gameStateManager.startGame();
      expect(gameStateManager.isGameRunning).to.be.true;
      
      const inputState = { direction: { x: 1, y: 0 }, isRolling: false };
      gameStateManager.update(16, inputState);
      
      expect(mockWasmManager.update.calledWith(1, 0, 0, 16)).to.be.true;
    });

    it('should handle WASM manager replacement', () => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
      
      const newWasmManager = { ...mockWasmManager };
      gameStateManager.initialize(newWasmManager);
      
      expect(gameStateManager.wasmManager).to.equal(newWasmManager);
      expect(gameStateManager.isGameRunning).to.be.false; // Should reset game state
    });

    it('should maintain state consistency across WASM updates', () => {
      gameStateManager.initialize(mockWasmManager);
      gameStateManager.startGame();
      
      // Simulate multiple updates
      for (let i = 0; i < 10; i++) {
        gameStateManager.update(16, { direction: { x: 0, y: 0 }, isRolling: false });
      }
      
      // State should remain consistent
      expect(gameStateManager.isGameRunning).to.be.true;
      expect(gameStateManager.playerState).to.be.an('object');
      expect(gameStateManager.phaseState).to.be.an('object');
      expect(gameStateManager.wolfState).to.be.an('object');
      expect(gameStateManager.cameraState).to.be.an('object');
    });
  });
});
