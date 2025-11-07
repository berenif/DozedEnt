import { expect } from 'chai';
import sinon from 'sinon';
import { WolfCharacter } from '../../public/src/gameentity/wolf-character.js';

describe('WolfCharacter', () => {
  let wolf;
  let mockWasmModule;

  beforeEach(() => {
    // Create a mock WASM module
    mockWasmModule = {
      get_wolf_x: sinon.stub().returns(0.5),
      get_wolf_y: sinon.stub().returns(0.5),
      get_wolf_state: sinon.stub().returns(0), // idle state
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
      get_wolf_type: sinon.stub().returns(0), // normal type
      get_wolf_size: sinon.stub().returns(1.0),
      get_wolf_fur_pattern: sinon.stub().returns(0.5),
      get_wolf_colors: sinon.stub().returns(0), // default color scheme
      get_wolf_howl_cooldown: sinon.stub().returns(0),
      get_wolf_last_howl_time: sinon.stub().returns(0),
      get_wolf_ai_state: sinon.stub().returns(0), // idle AI state
      get_wolf_target_x: sinon.stub().returns(0),
      get_wolf_target_y: sinon.stub().returns(0),
      get_wolf_memory_count: sinon.stub().returns(0),
      get_wolf_emotion_state: sinon.stub().returns(0), // neutral emotion
      get_wolf_pack_role: sinon.stub().returns(0), // follower role
      get_wolf_terrain_awareness: sinon.stub().returns(0),
      get_wolf_communication_state: sinon.stub().returns(0),
      get_wolf_adaptive_difficulty: sinon.stub().returns(1.0),
      get_wolf_performance_metrics: sinon.stub().returns(0)
    };

    wolf = new WolfCharacter(100, 200, 'normal', mockWasmModule, 1);
  });

  describe('Constructor', () => {
    it('should create a wolf with default properties', () => {
      expect(wolf.id).to.equal(1);
      expect(wolf.position.x).to.equal(100);
      expect(wolf.position.y).to.equal(200);
      expect(wolf.type).to.equal('normal');
      expect(wolf.width).to.equal(80);
      expect(wolf.height).to.equal(60);
      expect(wolf.facing).to.equal(1);
      expect(wolf.state).to.equal('idle');
      expect(wolf.health).to.equal(100);
      expect(wolf.maxHealth).to.equal(100);
      expect(wolf.damage).to.equal(15);
      expect(wolf.attackRange).to.equal(50);
      expect(wolf.detectionRange).to.equal(300);
    });

    it('should create different wolf types with appropriate properties', () => {
      const alphaWolf = new WolfCharacter(0, 0, 'alpha', mockWasmModule, 2);
      const scoutWolf = new WolfCharacter(0, 0, 'scout', mockWasmModule, 3);
      const hunterWolf = new WolfCharacter(0, 0, 'hunter', mockWasmModule, 4);

      expect(alphaWolf.type).to.equal('alpha');
      expect(scoutWolf.type).to.equal('scout');
      expect(hunterWolf.type).to.equal('hunter');
    });

    it('should initialize animation properties', () => {
      expect(wolf.animationFrame).to.equal(0);
      expect(wolf.animationTime).to.equal(0);
      expect(wolf.animationSpeed).to.equal(0.1);
      expect(wolf.howlCooldown).to.equal(0);
      expect(wolf.lastHowlTime).to.equal(0);
    });

    it('should initialize lunge state', () => {
      expect(wolf.lungeState.active).to.be.false;
      expect(wolf.lungeState.charging).to.be.false;
      expect(wolf.lungeState.chargeTime).to.equal(0);
      expect(wolf.lungeState.maxChargeTime).to.equal(800);
      expect(wolf.lungeState.lungeSpeed).to.equal(800);
      expect(wolf.lungeState.lungeDistance).to.equal(200);
      expect(wolf.lungeState.cooldown).to.equal(2000);
      expect(wolf.lungeState.lastLungeTime).to.equal(0);
    });

    it('should initialize pack formation properties', () => {
      expect(wolf.packFormationOffset.x).to.equal(0);
      expect(wolf.packFormationOffset.y).to.equal(0);
      expect(wolf.packFormationAngle).to.equal(0);
    });
  });

  describe('Wolf Size Calculation', () => {
    it('should return correct size for normal wolf', () => {
      const normalWolf = new WolfCharacter(0, 0, 'normal', mockWasmModule, 1);
      expect(normalWolf.size).to.equal(1.0);
    });

    it('should return correct size for alpha wolf', () => {
      const alphaWolf = new WolfCharacter(0, 0, 'alpha', mockWasmModule, 2);
      expect(alphaWolf.size).to.equal(1.3);
    });

    it('should return correct size for scout wolf', () => {
      const scoutWolf = new WolfCharacter(0, 0, 'scout', mockWasmModule, 3);
      expect(scoutWolf.size).to.equal(0.8);
    });

    it('should return correct size for hunter wolf', () => {
      const hunterWolf = new WolfCharacter(0, 0, 'hunter', mockWasmModule, 4);
      expect(hunterWolf.size).to.equal(1.1);
    });
  });

  describe('Wolf Colors', () => {
    it('should return default colors for normal wolf', () => {
      const colors = wolf.getWolfColors();
      expect(colors).to.be.an('object');
      expect(colors).to.have.property('primary');
      expect(colors).to.have.property('secondary');
      expect(colors).to.have.property('accent');
      expect(colors).to.have.property('eyes');
      expect(colors).to.have.property('nose');
    });

    it('should return different colors for alpha wolf', () => {
      const alphaWolf = new WolfCharacter(0, 0, 'alpha', mockWasmModule, 2);
      const colors = alphaWolf.getWolfColors();
      expect(colors).to.be.an('object');
      expect(colors.primary).to.not.equal(wolf.getWolfColors().primary);
    });
  });

  describe('State Management', () => {
    it('should change state correctly', () => {
      wolf.setState('running');
      expect(wolf.state).to.equal('running');
    });

    it('should update state timer', () => {
      wolf.setState('attacking');
      wolf.updateStateTimer(16);
      expect(wolf.stateTimer).to.equal(16);
    });

    it('should reset state timer when changing states', () => {
      wolf.setState('idle');
      wolf.updateStateTimer(100);
      wolf.setState('running');
      expect(wolf.stateTimer).to.equal(0);
    });
  });

  describe('Animation System', () => {
    it('should update animation frame', () => {
      wolf.updateAnimation(16);
      expect(wolf.animationTime).to.equal(16);
    });

    it('should cycle through animation frames', () => {
      wolf.animationSpeed = 0.1;
      wolf.updateAnimation(100); // Should advance frame
      expect(wolf.animationFrame).to.be.greaterThan(0);
    });

    it('should handle different animation speeds', () => {
      wolf.animationSpeed = 0.2;
      wolf.updateAnimation(50);
      const frame1 = wolf.animationFrame;
      
      wolf.animationSpeed = 0.1;
      wolf.updateAnimation(50);
      const frame2 = wolf.animationFrame;
      
      expect(frame1).to.be.greaterThan(frame2);
    });
  });

  describe('Combat System', () => {
    it('should calculate attack damage correctly', () => {
      const damage = wolf.calculateDamage();
      expect(damage).to.be.a('number');
      expect(damage).to.be.greaterThan(0);
      expect(damage).to.be.at.most(wolf.damage);
    });

    it('should handle taking damage', () => {
      const initialHealth = wolf.health;
      wolf.takeDamage(20);
      expect(wolf.health).to.equal(initialHealth - 20);
    });

    it('should not allow health to go below zero', () => {
      wolf.takeDamage(150);
      expect(wolf.health).to.equal(0);
    });

    it('should detect if wolf is dead', () => {
      wolf.health = 0;
      expect(wolf.isDead()).to.be.true;
      
      wolf.health = 50;
      expect(wolf.isDead()).to.be.false;
    });

    it('should calculate distance to target', () => {
      const distance = wolf.getDistanceToTarget(200, 300);
      const expectedDistance = Math.sqrt(Math.pow(200 - wolf.position.x, 2) + Math.pow(300 - wolf.position.y, 2));
      expect(distance).to.equal(expectedDistance);
    });

    it('should check if target is in attack range', () => {
      const inRange = wolf.isTargetInRange(100, 200, wolf.attackRange);
      expect(inRange).to.be.true;
      
      const outOfRange = wolf.isTargetInRange(1000, 1000, wolf.attackRange);
      expect(outOfRange).to.be.false;
    });

    it('should check if target is in detection range', () => {
      const inRange = wolf.isTargetInRange(100, 200, wolf.detectionRange);
      expect(inRange).to.be.true;
      
      const outOfRange = wolf.isTargetInRange(1000, 1000, wolf.detectionRange);
      expect(outOfRange).to.be.false;
    });
  });

  describe('Lunge Attack System', () => {
    it('should start lunge attack', () => {
      wolf.startLungeAttack(200, 300);
      expect(wolf.lungeState.active).to.be.true;
      expect(wolf.lungeState.charging).to.be.true;
      expect(wolf.lungeState.startPosition).to.deep.equal({ x: wolf.position.x, y: wolf.position.y });
      expect(wolf.lungeState.targetPosition).to.deep.equal({ x: 200, y: 300 });
    });

    it('should update lunge charge', () => {
      wolf.startLungeAttack(200, 300);
      wolf.updateLungeCharge(16);
      expect(wolf.lungeState.chargeTime).to.equal(16);
    });

    it('should execute lunge when fully charged', () => {
      wolf.startLungeAttack(200, 300);
      wolf.lungeState.chargeTime = wolf.lungeState.maxChargeTime;
      wolf.executeLunge();
      
      expect(wolf.lungeState.charging).to.be.false;
      expect(wolf.lungeState.lungeProgress).to.be.greaterThan(0);
    });

    it('should update lunge progress', () => {
      wolf.startLungeAttack(200, 300);
      wolf.lungeState.charging = false;
      wolf.lungeState.lungeProgress = 0.5;
      
      wolf.updateLungeProgress(16);
      expect(wolf.lungeState.lungeProgress).to.be.greaterThan(0.5);
    });

    it('should complete lunge attack', () => {
      wolf.startLungeAttack(200, 300);
      wolf.lungeState.lungeProgress = 1.0;
      
      wolf.completeLungeAttack();
      expect(wolf.lungeState.active).to.be.false;
      expect(wolf.lungeState.lungeProgress).to.equal(0);
    });

    it('should check lunge cooldown', () => {
      wolf.lungeState.lastLungeTime = Date.now() - 1000;
      expect(wolf.canLunge()).to.be.false;
      
      wolf.lungeState.lastLungeTime = Date.now() - 3000;
      expect(wolf.canLunge()).to.be.true;
    });
  });

  describe('Pack Behavior', () => {
    it('should set pack formation', () => {
      wolf.setPackFormation(50, 30, Math.PI / 4);
      expect(wolf.packFormationOffset.x).to.equal(50);
      expect(wolf.packFormationOffset.y).to.equal(30);
      expect(wolf.packFormationAngle).to.equal(Math.PI / 4);
    });

    it('should calculate pack position', () => {
      wolf.setPackFormation(100, 50, 0);
      const packPos = wolf.getPackPosition();
      expect(packPos.x).to.equal(wolf.position.x + 100);
      expect(packPos.y).to.equal(wolf.position.y + 50);
    });

    it('should handle pack coordination', () => {
      const packMembers = [
        new WolfCharacter(0, 0, 'normal', mockWasmModule, 1),
        new WolfCharacter(100, 0, 'alpha', mockWasmModule, 2),
        new WolfCharacter(0, 100, 'scout', mockWasmModule, 3)
      ];
      
      wolf.coordinateWithPack(packMembers);
      expect(wolf.packFormationOffset).to.be.an('object');
    });
  });

  describe('Howling System', () => {
    it('should start howling', () => {
      wolf.startHowling();
      expect(wolf.state).to.equal('howling');
      expect(wolf.howlCooldown).to.be.greaterThan(0);
    });

    it('should check howl cooldown', () => {
      wolf.howlCooldown = 1000;
      expect(wolf.canHowl()).to.be.false;
      
      wolf.howlCooldown = 0;
      expect(wolf.canHowl()).to.be.true;
    });

    it('should update howl cooldown', () => {
      wolf.howlCooldown = 1000;
      wolf.updateHowlCooldown(16);
      expect(wolf.howlCooldown).to.equal(984);
    });
  });

  describe('AI Integration', () => {
    it('should update AI state', () => {
      wolf.updateAI();
      expect(wolf.aiState).to.be.a('string');
    });

    it('should handle different AI states', () => {
      wolf.aiState = 'hunting';
      wolf.updateAI();
      expect(wolf.aiState).to.equal('hunting');
    });

    it('should update memory system', () => {
      wolf.updateMemory();
      expect(wolf.memory).to.be.an('array');
    });

    it('should update emotion system', () => {
      wolf.updateEmotions();
      expect(wolf.emotionState).to.be.a('string');
    });
  });

  describe('WASM Integration', () => {
    it('should sync with WASM module', () => {
      wolf.syncWithWasm();
      expect(mockWasmModule.get_wolf_x.called).to.be.true;
      expect(mockWasmModule.get_wolf_y.called).to.be.true;
      expect(mockWasmModule.get_wolf_state.called).to.be.true;
    });

    it('should update position from WASM', () => {
      mockWasmModule.get_wolf_x.returns(0.7);
      mockWasmModule.get_wolf_y.returns(0.3);
      
      wolf.syncWithWasm();
      expect(wolf.position.x).to.equal(0.7);
      expect(wolf.position.y).to.equal(0.3);
    });

    it('should update state from WASM', () => {
      mockWasmModule.get_wolf_state.returns(2); // running state
      wolf.syncWithWasm();
      expect(wolf.state).to.equal('running');
    });

    it('should update health from WASM', () => {
      mockWasmModule.get_wolf_health.returns(75);
      wolf.syncWithWasm();
      expect(wolf.health).to.equal(75);
    });

    it('should update velocity from WASM', () => {
      mockWasmModule.get_wolf_velocity_x.returns(0.1);
      mockWasmModule.get_wolf_velocity_y.returns(-0.05);
      
      wolf.syncWithWasm();
      expect(wolf.velocity.x).to.equal(0.1);
      expect(wolf.velocity.y).to.equal(-0.05);
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

    it('should render wolf without errors', () => {
      expect(() => wolf.render(mockContext)).to.not.throw();
      expect(mockContext.save.called).to.be.true;
      expect(mockContext.restore.called).to.be.true;
    });

    it('should render different wolf types', () => {
      const alphaWolf = new WolfCharacter(0, 0, 'alpha', mockWasmModule, 2);
      expect(() => alphaWolf.render(mockContext)).to.not.throw();
    });

    it('should render different states', () => {
      wolf.setState('running');
      expect(() => wolf.render(mockContext)).to.not.throw();
      
      wolf.setState('attacking');
      expect(() => wolf.render(mockContext)).to.not.throw();
      
      wolf.setState('howling');
      expect(() => wolf.render(mockContext)).to.not.throw();
    });
  });

  describe('Performance', () => {
    it('should update efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        wolf.update(16);
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
        wolf.render(mockContext);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 renders in less than 50ms
      expect(duration).to.be.lessThan(50);
    });
  });
});
