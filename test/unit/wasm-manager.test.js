import { expect } from 'chai';
import sinon from 'sinon';
import { WasmManager } from '../../src/wasm/wasm-manager.js';

describe('WasmManager', () => {
  let wasmManager;
  let mockWasmModule;
  let mockWebAssembly;

  beforeEach(() => {
    // Create a mock WASM module with all the exported functions
    mockWasmModule = {
      // Core simulation functions
      init_run: sinon.stub(),
      reset_run: sinon.stub(),
      update: sinon.stub(),
      get_x: sinon.stub().returns(0.5),
      get_y: sinon.stub().returns(0.5),
      get_stamina: sinon.stub().returns(100),
      get_phase: sinon.stub().returns(0),
      get_room_count: sinon.stub().returns(1),
      on_attack: sinon.stub().returns(1),
      on_roll_start: sinon.stub().returns(1),
      set_blocking: sinon.stub().returns(1),
      get_block_state: sinon.stub().returns(0),
      handle_incoming_attack: sinon.stub().returns(0),
      
      // Game loop & state management
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
      get_wolf_performance_metrics: sinon.stub().returns(0),
      
      // Memory management
      memory: {
        buffer: new ArrayBuffer(1024),
        grow: sinon.stub().returns(1024)
      },
      
      // Instance methods
      _malloc: sinon.stub().returns(0),
      _free: sinon.stub(),
      _get_string: sinon.stub().returns('test'),
      _set_string: sinon.stub()
    };

    // Mock WebAssembly
    mockWebAssembly = {
      instantiate: sinon.stub().returns(Promise.resolve({
        instance: {
          exports: mockWasmModule
        }
      })),
      instantiateStreaming: sinon.stub().returns(Promise.resolve({
        instance: {
          exports: mockWasmModule
        }
      }))
    };

    global.WebAssembly = mockWebAssembly;
    global.fetch = sinon.stub().returns(Promise.resolve({
      arrayBuffer: sinon.stub().returns(Promise.resolve(new ArrayBuffer(8)))
    }));

    wasmManager = new WasmManager();
  });

  describe('Constructor', () => {
    it('should create WASM manager with default properties', () => {
      expect(wasmManager.module).to.be.null;
      expect(wasmManager.instance).to.be.null;
      expect(wasmManager.exports).to.be.null;
      expect(wasmManager.loaded).to.be.false;
      expect(wasmManager.loading).to.be.false;
      expect(wasmManager.error).to.be.null;
    });

    it('should initialize with default configuration', () => {
      expect(wasmManager.config).to.be.an('object');
      expect(wasmManager.config.wasmPath).to.equal('game.wasm');
      expect(wasmManager.config.memoryInitial).to.equal(16);
      expect(wasmManager.config.memoryMaximum).to.equal(256);
    });
  });

  describe('Module Loading', () => {
    it('should load WASM module successfully', async () => {
      await wasmManager.load();
      
      expect(wasmManager.loaded).to.be.true;
      expect(wasmManager.module).to.exist;
      expect(wasmManager.instance).to.exist;
      expect(wasmManager.exports).to.exist;
      expect(wasmManager.error).to.be.null;
    });

    it('should handle loading errors', async () => {
      mockWebAssembly.instantiateStreaming.throws(new Error('WASM load failed'));
      
      try {
        await wasmManager.load();
      } catch (error) {
        expect(error.message).to.equal('WASM load failed');
        expect(wasmManager.loaded).to.be.false;
        expect(wasmManager.error).to.exist;
      }
    });

    it('should not load module twice', async () => {
      await wasmManager.load();
      const firstModule = wasmManager.module;
      
      await wasmManager.load();
      expect(wasmManager.module).to.equal(firstModule);
    });

    it('should handle network errors', async () => {
      global.fetch.throws(new Error('Network error'));
      
      try {
        await wasmManager.load();
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });

    it('should handle invalid WASM file', async () => {
      mockWebAssembly.instantiateStreaming.throws(new Error('Invalid WASM file'));
      
      try {
        await wasmManager.load();
      } catch (error) {
        expect(error.message).to.equal('Invalid WASM file');
      }
    });
  });

  describe('Function Exports', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should export core simulation functions', () => {
      expect(wasmManager.exports.init_run).to.exist;
      expect(wasmManager.exports.reset_run).to.exist;
      expect(wasmManager.exports.update).to.exist;
      expect(wasmManager.exports.get_x).to.exist;
      expect(wasmManager.exports.get_y).to.exist;
      expect(wasmManager.exports.get_stamina).to.exist;
      expect(wasmManager.exports.get_phase).to.exist;
      expect(wasmManager.exports.get_room_count).to.exist;
    });

    it('should export combat functions', () => {
      expect(wasmManager.exports.on_attack).to.exist;
      expect(wasmManager.exports.on_roll_start).to.exist;
      expect(wasmManager.exports.set_blocking).to.exist;
      expect(wasmManager.exports.get_block_state).to.exist;
      expect(wasmManager.exports.handle_incoming_attack).to.exist;
    });

    it('should export choice system functions', () => {
      expect(wasmManager.exports.get_choice_count).to.exist;
      expect(wasmManager.exports.get_choice_id).to.exist;
      expect(wasmManager.exports.get_choice_type).to.exist;
      expect(wasmManager.exports.get_choice_rarity).to.exist;
      expect(wasmManager.exports.get_choice_tags).to.exist;
      expect(wasmManager.exports.commit_choice).to.exist;
      expect(wasmManager.exports.generate_choices).to.exist;
    });

    it('should export risk phase functions', () => {
      expect(wasmManager.exports.get_curse_count).to.exist;
      expect(wasmManager.exports.get_curse_type).to.exist;
      expect(wasmManager.exports.get_curse_intensity).to.exist;
      expect(wasmManager.exports.get_risk_multiplier).to.exist;
      expect(wasmManager.exports.get_elite_active).to.exist;
      expect(wasmManager.exports.escape_risk).to.exist;
    });

    it('should export escalate phase functions', () => {
      expect(wasmManager.exports.get_escalation_level).to.exist;
      expect(wasmManager.exports.get_spawn_rate_modifier).to.exist;
      expect(wasmManager.exports.get_miniboss_active).to.exist;
      expect(wasmManager.exports.get_miniboss_x).to.exist;
      expect(wasmManager.exports.get_miniboss_y).to.exist;
      expect(wasmManager.exports.damage_miniboss).to.exist;
    });

    it('should export cashout phase functions', () => {
      expect(wasmManager.exports.get_gold).to.exist;
      expect(wasmManager.exports.get_essence).to.exist;
      expect(wasmManager.exports.get_shop_item_count).to.exist;
      expect(wasmManager.exports.buy_shop_item).to.exist;
      expect(wasmManager.exports.buy_heal).to.exist;
      expect(wasmManager.exports.reroll_shop_items).to.exist;
    });

    it('should export wolf functions', () => {
      expect(wasmManager.exports.get_wolf_count).to.exist;
      expect(wasmManager.exports.get_wolf_x).to.exist;
      expect(wasmManager.exports.get_wolf_y).to.exist;
      expect(wasmManager.exports.get_wolf_state).to.exist;
      expect(wasmManager.exports.get_wolf_health).to.exist;
      expect(wasmManager.exports.get_wolf_stamina).to.exist;
      expect(wasmManager.exports.get_wolf_velocity_x).to.exist;
      expect(wasmManager.exports.get_wolf_velocity_y).to.exist;
      expect(wasmManager.exports.get_wolf_facing).to.exist;
    });
  });

  describe('Function Execution', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should execute init_run function', () => {
      wasmManager.initRun(12345, 1);
      expect(mockWasmModule.init_run.calledWith(12345, 1)).to.be.true;
    });

    it('should execute reset_run function', () => {
      wasmManager.resetRun(54321);
      expect(mockWasmModule.reset_run.calledWith(54321)).to.be.true;
    });

    it('should execute update function', () => {
      wasmManager.update(1, 0, 0, 16);
      expect(mockWasmModule.update.calledWith(1, 0, 0, 16)).to.be.true;
    });

    it('should execute getter functions', () => {
      const x = wasmManager.getX();
      const y = wasmManager.getY();
      const stamina = wasmManager.getStamina();
      const phase = wasmManager.getPhase();
      
      expect(x).to.equal(0.5);
      expect(y).to.equal(0.5);
      expect(stamina).to.equal(100);
      expect(phase).to.equal(0);
    });

    it('should execute combat functions', () => {
      const attackResult = wasmManager.onAttack();
      const rollResult = wasmManager.onRollStart();
      const blockResult = wasmManager.setBlocking(1, 1, 0);
      
      expect(attackResult).to.equal(1);
      expect(rollResult).to.equal(1);
      expect(blockResult).to.equal(1);
    });

    it('should execute choice functions', () => {
      const choiceCount = wasmManager.getChoiceCount();
      const choiceId = wasmManager.getChoiceId(0);
      const choiceType = wasmManager.getChoiceType(0);
      
      expect(choiceCount).to.equal(3);
      expect(choiceId).to.equal(1);
      expect(choiceType).to.equal(0);
    });

    it('should execute wolf functions', () => {
      const wolfCount = wasmManager.getWolfCount();
      const wolfX = wasmManager.getWolfX(0);
      const wolfY = wasmManager.getWolfY(0);
      const wolfState = wasmManager.getWolfState(0);
      
      expect(wolfCount).to.equal(0);
      expect(wolfX).to.equal(0.5);
      expect(wolfY).to.equal(0.5);
      expect(wolfState).to.equal(0);
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should allocate memory', () => {
      const ptr = wasmManager.malloc(1024);
      expect(mockWasmModule._malloc.calledWith(1024)).to.be.true;
      expect(ptr).to.equal(0);
    });

    it('should free memory', () => {
      wasmManager.free(0);
      expect(mockWasmModule._free.calledWith(0)).to.be.true;
    });

    it('should grow memory', () => {
      const newSize = wasmManager.growMemory(1024);
      expect(mockWasmModule.memory.grow.calledWith(1024)).to.be.true;
      expect(newSize).to.equal(1024);
    });

    it('should get memory buffer', () => {
      const buffer = wasmManager.getMemoryBuffer();
      expect(buffer).to.exist;
      expect(buffer).to.be.an('ArrayBuffer');
    });

    it('should get memory size', () => {
      const size = wasmManager.getMemorySize();
      expect(size).to.be.a('number');
      expect(size).to.be.greaterThan(0);
    });
  });

  describe('String Management', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should get string from memory', () => {
      const str = wasmManager.getString(0);
      expect(mockWasmModule._get_string.calledWith(0)).to.be.true;
      expect(str).to.equal('test');
    });

    it('should set string in memory', () => {
      const ptr = wasmManager.setString('hello world');
      expect(mockWasmModule._set_string.calledWith('hello world')).to.be.true;
      expect(ptr).to.equal(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle function execution errors', async () => {
      await wasmManager.load();
      
      mockWasmModule.get_x.throws(new Error('WASM function error'));
      
      try {
        wasmManager.getX();
      } catch (error) {
        expect(error.message).to.equal('WASM function error');
      }
    });

    it('should handle missing function exports', async () => {
      // Create a module with missing exports
      const incompleteModule = {
        get_x: sinon.stub().returns(0.5)
        // Missing other functions
      };
      
      mockWebAssembly.instantiateStreaming.returns(Promise.resolve({
        instance: {
          exports: incompleteModule
        }
      }));
      
      await wasmManager.load();
      
      expect(() => wasmManager.getY()).to.throw('Function get_y not exported');
    });

    it('should handle module not loaded', () => {
      expect(() => wasmManager.getX()).to.throw('WASM module not loaded');
    });

    it('should handle invalid parameters', async () => {
      await wasmManager.load();
      
      expect(() => wasmManager.getChoiceId(-1)).to.throw('Invalid choice index');
      expect(() => wasmManager.getWolfX(-1)).to.throw('Invalid wolf index');
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should execute functions efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        wasmManager.getX();
        wasmManager.getY();
        wasmManager.getStamina();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 3000 function calls in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle memory operations efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const ptr = wasmManager.malloc(1024);
        wasmManager.free(ptr);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 200 memory operations in less than 50ms
      expect(duration).to.be.lessThan(50);
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        wasmPath: 'custom.wasm',
        memoryInitial: 32,
        memoryMaximum: 512
      };
      
      const customManager = new WasmManager(customConfig);
      expect(customManager.config.wasmPath).to.equal('custom.wasm');
      expect(customManager.config.memoryInitial).to.equal(32);
      expect(customManager.config.memoryMaximum).to.equal(512);
    });

    it('should validate configuration', () => {
      const invalidConfig = {
        memoryInitial: -1,
        memoryMaximum: 0
      };
      
      expect(() => new WasmManager(invalidConfig)).to.throw('Invalid configuration');
    });
  });

  describe('State Management', () => {
    it('should track loading state', async () => {
      expect(wasmManager.loading).to.be.false;
      
      const loadPromise = wasmManager.load();
      expect(wasmManager.loading).to.be.true;
      
      await loadPromise;
      expect(wasmManager.loading).to.be.false;
      expect(wasmManager.loaded).to.be.true;
    });

    it('should track error state', async () => {
      mockWebAssembly.instantiateStreaming.throws(new Error('Test error'));
      
      try {
        await wasmManager.load();
      } catch (error) {
        expect(wasmManager.error).to.exist;
        expect(wasmManager.loaded).to.be.false;
      }
    });

    it('should clear error state on successful load', async () => {
      // First load fails
      mockWebAssembly.instantiateStreaming.throws(new Error('Test error'));
      try {
        await wasmManager.load();
      } catch (error) {
        expect(wasmManager.error).to.exist;
      }
      
      // Second load succeeds
      mockWebAssembly.instantiateStreaming.returns(Promise.resolve({
        instance: {
          exports: mockWasmModule
        }
      }));
      
      await wasmManager.load();
      expect(wasmManager.error).to.be.null;
      expect(wasmManager.loaded).to.be.true;
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await wasmManager.load();
    });

    it('should cleanup resources', () => {
      wasmManager.cleanup();
      
      expect(wasmManager.module).to.be.null;
      expect(wasmManager.instance).to.be.null;
      expect(wasmManager.exports).to.be.null;
      expect(wasmManager.loaded).to.be.false;
    });

    it('should handle cleanup when not loaded', () => {
      wasmManager.cleanup();
      expect(() => wasmManager.cleanup()).to.not.throw();
    });
  });

  describe('Bounds Checking and Error Handling', () => {
    beforeEach(async () => {
      await wasmManager.initialize();
    });

    it('should handle out of bounds choice access gracefully', () => {
      // Mock choice count to return 3
      mockWasmModule.get_choice_count.returns(3);
      
      // Try to access choice at index 5 (out of bounds)
      const choice = wasmManager.getChoice(5);
      
      // Should return null for out of bounds access
      expect(choice).to.be.null;
    });

    it('should handle negative choice index gracefully', () => {
      mockWasmModule.get_choice_count.returns(3);
      
      // Try to access choice at negative index
      const choice = wasmManager.getChoice(-1);
      
      // Should return null for negative index
      expect(choice).to.be.null;
    });

    it('should handle invalid choice count gracefully', () => {
      // Mock choice count to return invalid value
      mockWasmModule.get_choice_count.returns(NaN);
      
      // Try to access choice
      const choice = wasmManager.getChoice(0);
      
      // Should return null for invalid count
      expect(choice).to.be.null;
    });

    it('should handle WASM function throwing error during bounds checking', () => {
      mockWasmModule.get_choice_count.returns(3);
      mockWasmModule.get_choice_id.throws(new Error('WASM index out of bounds'));
      
      // Try to access choice that throws error
      const choice = wasmManager.getChoice(0);
      
      // Should return null when WASM function throws
      expect(choice).to.be.null;
    });

    it('should handle curse bounds checking', () => {
      mockWasmModule.get_curse_count.returns(2);
      
      // Valid index should work
      const curseType = wasmManager.getCurseType(1);
      expect(curseType).to.equal(0); // Mock returns 0
      
      // Out of bounds index should be clamped to 0
      mockWasmModule.get_curse_type.resetHistory();
      wasmManager.getCurseType(5);
      expect(mockWasmModule.get_curse_type.calledWith(0)).to.be.true;
    });

    it('should handle hazards bounds checking', () => {
      mockWasmModule.get_hazard_count.returns(2);
      mockWasmModule.get_hazard_type = sinon.stub().returns(1);
      mockWasmModule.get_hazard_x = sinon.stub().returns(0.5);
      mockWasmModule.get_hazard_y = sinon.stub().returns(0.5);
      mockWasmModule.get_hazard_radius = sinon.stub().returns(10);
      mockWasmModule.get_hazard_intensity = sinon.stub().returns(0.8);
      
      const hazards = wasmManager.getHazards();
      
      // Should return array with 2 hazards
      expect(hazards).to.be.an('array');
      expect(hazards.length).to.equal(2);
    });

    it('should handle hazards with error during iteration', () => {
      mockWasmModule.get_hazard_count.returns(3);
      mockWasmModule.get_hazard_type = sinon.stub();
      mockWasmModule.get_hazard_type.onCall(0).returns(1);
      mockWasmModule.get_hazard_type.onCall(1).throws(new Error('Index out of bounds'));
      mockWasmModule.get_hazard_x = sinon.stub().returns(0.5);
      mockWasmModule.get_hazard_y = sinon.stub().returns(0.5);
      mockWasmModule.get_hazard_radius = sinon.stub().returns(10);
      mockWasmModule.get_hazard_intensity = sinon.stub().returns(0.8);
      
      const hazards = wasmManager.getHazards();
      
      // Should return only the first hazard before error
      expect(hazards).to.be.an('array');
      expect(hazards.length).to.equal(1);
    });
  });
});
