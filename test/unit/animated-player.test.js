import { expect } from 'chai';
import sinon from 'sinon';
import { AnimatedPlayer } from '../../src/animation/player/procedural/player-animator.js';

describe('AnimatedPlayer', () => {
  let player;
  let mockWasmModule;

  beforeEach(() => {
    // Create a mock WASM module
    mockWasmModule = {
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(100),
      get_health: sinon.stub().returns(100),
      get_phase: sinon.stub().returns(0), // explore phase
      get_room_count: sinon.stub().returns(1),
      get_block_state: sinon.stub().returns(0),
      get_choice_count: sinon.stub().returns(3),
      get_choice_id: sinon.stub().returns(1),
      get_choice_type: sinon.stub().returns(0),
      get_choice_rarity: sinon.stub().returns(1),
      get_choice_tags: sinon.stub().returns(0),
      get_gold: sinon.stub().returns(0),
      get_essence: sinon.stub().returns(0),
      get_shop_item_count: sinon.stub().returns(0),
      get_curse_count: sinon.stub().returns(0),
      get_curse_type: sinon.stub().returns(0),
      get_curse_intensity: sinon.stub().returns(0),
      get_risk_multiplier: sinon.stub().returns(1.0),
      get_elite_active: sinon.stub().returns(0),
      get_escalation_level: sinon.stub().returns(0),
      get_spawn_rate_modifier: sinon.stub().returns(1.0),
      get_miniboss_active: sinon.stub().returns(0),
      get_miniboss_x: sinon.stub().returns(0.5),
      get_miniboss_y: sinon.stub().returns(0.5),
      update: sinon.stub(),
      on_attack: sinon.stub().returns(1),
      on_roll_start: sinon.stub().returns(1),
      set_blocking: sinon.stub().returns(1),
      handle_incoming_attack: sinon.stub().returns(0),
      commit_choice: sinon.stub(),
      generate_choices: sinon.stub(),
      escape_risk: sinon.stub(),
      damage_miniboss: sinon.stub(),
      buy_shop_item: sinon.stub(),
      buy_heal: sinon.stub(),
      reroll_shop_items: sinon.stub(),
      init_run: sinon.stub(),
      reset_run: sinon.stub()
    };

    player = new AnimatedPlayer(400, 300, { wasmModule: mockWasmModule });
  });

  describe('Constructor', () => {
    it('should create a player with default properties', () => {
      expect(player.x).to.equal(400);
      expect(player.y).to.equal(300);
      expect(player.facing).to.equal(1);
      expect(player.health).to.equal(100);
      expect(player.maxHealth).to.equal(100);
      expect(player.stamina).to.equal(100);
      expect(player.maxStamina).to.equal(100);
      expect(player.speed).to.equal(250);
      expect(player.rollSpeed).to.equal(500);
      expect(player.state).to.equal('idle');
      expect(player.previousState).to.equal('idle');
    });

    it('should create a player with custom options', () => {
      const customPlayer = new AnimatedPlayer(200, 150, {
        health: 150,
        maxHealth: 150,
        stamina: 80,
        maxStamina: 80,
        speed: 300,
        rollSpeed: 600
      });

      expect(customPlayer.x).to.equal(200);
      expect(customPlayer.y).to.equal(150);
      expect(customPlayer.health).to.equal(150);
      expect(customPlayer.maxHealth).to.equal(150);
      expect(customPlayer.stamina).to.equal(80);
      expect(customPlayer.maxStamina).to.equal(80);
      expect(customPlayer.speed).to.equal(300);
      expect(customPlayer.rollSpeed).to.equal(600);
    });

    it('should initialize animation system', () => {
      expect(player.animator).to.exist;
      expect(player.animator).to.be.an('object');
    });

    it('should initialize state management', () => {
      expect(player.stateTimer).to.equal(0);
      expect(player.stateTime).to.equal(0);
      expect(player.stateDuration).to.equal(0);
      expect(player.invulnerable).to.be.false;
      expect(player.invulnerabilityTimer).to.equal(0);
      expect(player.isGrounded).to.be.true;
      expect(player.jumpCount).to.equal(0);
    });
  });

  describe('Position Management', () => {
    it('should update position from WASM', () => {
      mockWasmModule.get_x.returns(0.7);
      mockWasmModule.get_y.returns(0.3);
      
      player.updatePosition();
      expect(player.x).to.equal(0.7);
      expect(player.y).to.equal(0.3);
    });

    it('should handle position bounds', () => {
      mockWasmModule.get_x.returns(1.2); // Out of bounds
      mockWasmModule.get_y.returns(-0.1); // Out of bounds
      
      player.updatePosition();
      expect(player.x).to.be.at.least(0);
      expect(player.x).to.be.at.most(1);
      expect(player.y).to.be.at.least(0);
      expect(player.y).to.be.at.most(1);
    });

    it('should update facing direction', () => {
      player.updateFacing(1);
      expect(player.facing).to.equal(1);
      
      player.updateFacing(-1);
      expect(player.facing).to.equal(-1);
    });
  });

  describe('State Management', () => {
    it('should change state correctly', () => {
      player.setState('running');
      expect(player.state).to.equal('running');
      expect(player.previousState).to.equal('idle');
    });

    it('should update state timer', () => {
      player.setState('attacking');
      player.updateStateTimer(16);
      expect(player.stateTimer).to.equal(16);
    });

    it('should reset state timer when changing states', () => {
      player.setState('idle');
      player.updateStateTimer(100);
      player.setState('running');
      expect(player.stateTimer).to.equal(0);
    });

    it('should handle state transitions', () => {
      player.setState('idle');
      expect(player.state).to.equal('idle');
      
      player.setState('running');
      expect(player.state).to.equal('running');
      expect(player.previousState).to.equal('idle');
      
      player.setState('attacking');
      expect(player.state).to.equal('attacking');
      expect(player.previousState).to.equal('running');
    });
  });

  describe('Animation Integration', () => {
    it('should play animation for current state', () => {
      player.setState('running');
      player.updateAnimation();
      expect(player.animator.currentAnimation).to.exist;
    });

    it('should handle animation transitions', () => {
      player.setState('idle');
      player.updateAnimation();
      
      player.setState('running');
      player.updateAnimation();
      
      expect(player.animator.currentAnimation).to.exist;
    });

    it('should update animation frame', () => {
      player.updateAnimation();
      expect(player.animator).to.exist;
    });
  });

  describe('Combat System', () => {
    it('should execute attack', () => {
      const result = player.attack();
      expect(mockWasmModule.on_attack.called).to.be.true;
      expect(result).to.equal(1);
    });

    it('should handle attack failure', () => {
      mockWasmModule.on_attack.returns(0);
      const result = player.attack();
      expect(result).to.equal(0);
    });

    it('should start roll', () => {
      const result = player.roll();
      expect(mockWasmModule.on_roll_start.called).to.be.true;
      expect(result).to.equal(1);
    });

    it('should handle roll failure', () => {
      mockWasmModule.on_roll_start.returns(0);
      const result = player.roll();
      expect(result).to.equal(0);
    });

    it('should set blocking state', () => {
      const result = player.setBlocking(true, 1, 0);
      expect(mockWasmModule.set_blocking.calledWith(1, 1, 0, sinon.match.number)).to.be.true;
      expect(result).to.equal(1);
    });

    it('should handle incoming attack', () => {
      const result = player.handleIncomingAttack(0.5, 0.5, 1, 0);
      expect(mockWasmModule.handle_incoming_attack.calledWith(0.5, 0.5, 1, 0, sinon.match.number)).to.be.true;
      expect(result).to.equal(0);
    });
  });

  describe('Game Phase Integration', () => {
    it('should update phase from WASM', () => {
      mockWasmModule.get_phase.returns(2); // choose phase
      player.updatePhase();
      expect(player.phase).to.equal(2);
    });

    it('should handle choice phase', () => {
      mockWasmModule.get_phase.returns(2);
      mockWasmModule.get_choice_count.returns(3);
      
      player.updatePhase();
      expect(player.phase).to.equal(2);
      expect(player.choices).to.be.an('array');
      expect(player.choices.length).to.equal(3);
    });

    it('should commit choice', () => {
      player.commitChoice(1);
      expect(mockWasmModule.commit_choice.calledWith(1)).to.be.true;
    });

    it('should generate choices', () => {
      player.generateChoices();
      expect(mockWasmModule.generate_choices.called).to.be.true;
    });
  });

  describe('Shop System', () => {
    it('should update shop from WASM', () => {
      mockWasmModule.get_phase.returns(6); // cashout phase
      mockWasmModule.get_gold.returns(100);
      mockWasmModule.get_essence.returns(50);
      mockWasmModule.get_shop_item_count.returns(5);
      
      player.updateShop();
      expect(player.gold).to.equal(100);
      expect(player.essence).to.equal(50);
      expect(player.shopItems.length).to.equal(5);
    });

    it('should buy shop item', () => {
      player.buyShopItem(0);
      expect(mockWasmModule.buy_shop_item.calledWith(0)).to.be.true;
    });

    it('should buy heal', () => {
      player.buyHeal();
      expect(mockWasmModule.buy_heal.called).to.be.true;
    });

    it('should reroll shop items', () => {
      player.rerollShopItems();
      expect(mockWasmModule.reroll_shop_items.called).to.be.true;
    });
  });

  describe('Risk Phase', () => {
    it('should update risk phase from WASM', () => {
      mockWasmModule.get_phase.returns(4); // risk phase
      mockWasmModule.get_curse_count.returns(2);
      mockWasmModule.get_risk_multiplier.returns(1.5);
      mockWasmModule.get_elite_active.returns(1);
      
      player.updateRiskPhase();
      expect(player.curseCount).to.equal(2);
      expect(player.riskMultiplier).to.equal(1.5);
      expect(player.eliteActive).to.equal(1);
    });

    it('should escape risk phase', () => {
      player.escapeRisk();
      expect(mockWasmModule.escape_risk.called).to.be.true;
    });
  });

  describe('Escalate Phase', () => {
    it('should update escalate phase from WASM', () => {
      mockWasmModule.get_phase.returns(5); // escalate phase
      mockWasmModule.get_escalation_level.returns(0.7);
      mockWasmModule.get_spawn_rate_modifier.returns(1.3);
      mockWasmModule.get_miniboss_active.returns(1);
      mockWasmModule.get_miniboss_x.returns(0.6);
      mockWasmModule.get_miniboss_y.returns(0.4);
      
      player.updateEscalatePhase();
      expect(player.escalationLevel).to.equal(0.7);
      expect(player.spawnRateModifier).to.equal(1.3);
      expect(player.minibossActive).to.equal(1);
      expect(player.minibossPosition.x).to.equal(0.6);
      expect(player.minibossPosition.y).to.equal(0.4);
    });

    it('should damage miniboss', () => {
      player.damageMiniboss(25);
      expect(mockWasmModule.damage_miniboss.calledWith(25)).to.be.true;
    });
  });

  describe('Game Control', () => {
    it('should initialize run', () => {
      player.initRun(12345, 1);
      expect(mockWasmModule.init_run.calledWith(12345, 1)).to.be.true;
    });

    it('should reset run', () => {
      player.resetRun(54321);
      expect(mockWasmModule.reset_run.calledWith(54321)).to.be.true;
    });

    it('should update game state', () => {
      player.update(16);
      expect(mockWasmModule.update.calledWith(0, 0, 0, 16)).to.be.true;
    });

    it('should update with input', () => {
      player.update(16, { x: 1, y: 0, rolling: true });
      expect(mockWasmModule.update.calledWith(1, 0, 1, 16)).to.be.true;
    });
  });

  describe('Health and Stamina', () => {
    it('should update health from WASM', () => {
      mockWasmModule.get_health.returns(75);
      player.updateHealth();
      expect(player.health).to.equal(75);
    });

    it('should update stamina from WASM', () => {
      mockWasmModule.get_stamina.returns(50);
      player.updateStamina();
      expect(player.stamina).to.equal(50);
    });

    it('should handle health bounds', () => {
      mockWasmModule.get_health.returns(150); // Over max
      player.updateHealth();
      expect(player.health).to.equal(player.maxHealth);
      
      mockWasmModule.get_health.returns(-10); // Under zero
      player.updateHealth();
      expect(player.health).to.equal(0);
    });

    it('should handle stamina bounds', () => {
      mockWasmModule.get_stamina.returns(150); // Over max
      player.updateStamina();
      expect(player.stamina).to.equal(player.maxStamina);
      
      mockWasmModule.get_stamina.returns(-10); // Under zero
      player.updateStamina();
      expect(player.stamina).to.equal(0);
    });
  });

  describe('Invulnerability', () => {
    it('should set invulnerability', () => {
      player.setInvulnerable(true, 1000);
      expect(player.invulnerable).to.be.true;
      expect(player.invulnerabilityTimer).to.equal(1000);
    });

    it('should update invulnerability timer', () => {
      player.setInvulnerable(true, 1000);
      player.updateInvulnerability(16);
      expect(player.invulnerabilityTimer).to.equal(984);
    });

    it('should clear invulnerability when timer expires', () => {
      player.setInvulnerable(true, 16);
      player.updateInvulnerability(16);
      expect(player.invulnerable).to.be.false;
      expect(player.invulnerabilityTimer).to.equal(0);
    });
  });

  describe('Rendering', () => {
    let mockContext;

    beforeEach(() => {
      mockContext = {
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        rotate: sinon.stub(),
        scale: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1
      };
    });

    it('should render player without errors', () => {
      expect(() => player.render(mockContext)).to.not.throw();
      expect(mockContext.save.called).to.be.true;
      expect(mockContext.restore.called).to.be.true;
    });

    it('should render different states', () => {
      player.setState('running');
      expect(() => player.render(mockContext)).to.not.throw();
      
      player.setState('attacking');
      expect(() => player.render(mockContext)).to.not.throw();
      
      player.setState('blocking');
      expect(() => player.render(mockContext)).to.not.throw();
      
      player.setState('rolling');
      expect(() => player.render(mockContext)).to.not.throw();
    });

    it('should render with invulnerability effect', () => {
      player.setInvulnerable(true, 1000);
      expect(() => player.render(mockContext)).to.not.throw();
    });
  });

  describe('Performance', () => {
    it('should update efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        player.update(16);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should render efficiently', () => {
      const mockContext = {
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        rotate: sinon.stub(),
        scale: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1
      };

      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        player.render(mockContext);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 renders in less than 50ms
      expect(duration).to.be.lessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing WASM module gracefully', () => {
      const playerWithoutWasm = new AnimatedPlayer(100, 100);
      expect(() => playerWithoutWasm.update(16)).to.not.throw();
    });

    it('should handle WASM function errors', () => {
      mockWasmModule.get_x.throws(new Error('WASM error'));
      expect(() => player.updatePosition()).to.not.throw();
    });

    it('should handle invalid state transitions', () => {
      expect(() => player.setState('invalid_state')).to.not.throw();
    });
  });
});
