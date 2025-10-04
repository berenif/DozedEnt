import '../setup.js';
/**
 * Unit tests for WASM subsystem modules
 */

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { WasmCoreState } from '../../public/src/wasm/WasmCoreState.js';
import { WasmCombatSystem } from '../../public/src/wasm/WasmCombatSystem.js';
import { WasmPhaseManagers } from '../../public/src/wasm/WasmPhaseManagers.js';
import { WasmWorldSimulation } from '../../public/src/wasm/WasmWorldSimulation.js';

describe('WASM Subsystems', () => {
  describe('WasmCoreState', () => {
    let coreState;
    let mockExports;

    beforeEach(() => {
      mockExports = {
        get_x: () => 0.5,
        get_y: () => 0.5,
        get_stamina: () => 1.0,
        get_hp: () => 1.0,
        get_phase: () => 0,
        get_gold: () => 100,
        get_essence: () => 50,
        get_room_count: () => 1,
        get_enemy_count: () => 0,
        update: () => {}
      };
      
      coreState = new WasmCoreState(mockExports);
    });

    it('should initialize with exports', () => {
      expect(coreState.exports).to.equal(mockExports);
      expect(coreState.isLoaded).to.be.false;
    });

    it('should set exports and mark as loaded', () => {
      coreState.setExports(mockExports);
      expect(coreState.isLoaded).to.be.true;
    });

    it('should get player position', () => {
      coreState.setExports(mockExports);
      const pos = coreState.getPlayerPosition();
      expect(pos).to.deep.equal({ x: 0.5, y: 0.5 });
    });

    it('should get X coordinate', () => {
      coreState.setExports(mockExports);
      expect(coreState.getX()).to.equal(0.5);
    });

    it('should get Y coordinate', () => {
      coreState.setExports(mockExports);
      expect(coreState.getY()).to.equal(0.5);
    });

    it('should get stamina', () => {
      coreState.setExports(mockExports);
      expect(coreState.getStamina()).to.equal(1.0);
    });

    it('should get HP', () => {
      coreState.setExports(mockExports);
      expect(coreState.getHP()).to.equal(1.0);
    });

    it('should get phase', () => {
      coreState.setExports(mockExports);
      expect(coreState.getPhase()).to.equal(0);
    });

    it('should get room count', () => {
      coreState.setExports(mockExports);
      expect(coreState.getRoomCount()).to.equal(1);
    });

    it('should return default values when not loaded', () => {
      const pos = coreState.getPlayerPosition();
      expect(pos).to.deep.equal({ x: 0, y: 0 });
      expect(coreState.getStamina()).to.equal(1);
      expect(coreState.getHP()).to.equal(1);
    });

    it('should handle missing export functions gracefully', () => {
      const minimalExports = {};
      coreState.setExports(minimalExports);
      
      expect(coreState.getX()).to.equal(0.5);
      expect(coreState.getY()).to.equal(0.5);
      expect(coreState.getStamina()).to.equal(1);
    });

    it('should clamp position values to 0-1 range', () => {
      const exportsWithInvalidValues = {
        get_x: () => 2.5,
        get_y: () => -0.5
      };
      coreState.setExports(exportsWithInvalidValues);
      
      const pos = coreState.getPlayerPosition();
      expect(pos.x).to.equal(1);
      expect(pos.y).to.equal(0);
    });

    it('should get player state with all fields', () => {
      coreState.setExports(mockExports);
      const state = coreState.getPlayerState();
      
      expect(state).to.have.property('x');
      expect(state).to.have.property('y');
      expect(state).to.have.property('stamina');
      expect(state).to.have.property('phase');
      expect(state).to.have.property('health');
      expect(state).to.have.property('gold');
      expect(state).to.have.property('essence');
    });

    it('should cache player state', () => {
      coreState.setExports(mockExports);
      
      const state1 = coreState.getPlayerState();
      const state2 = coreState.getPlayerState();
      
      // Should return cached state (same reference)
      expect(state1).to.equal(state2);
    });

    it('should invalidate state cache on update', () => {
      coreState.setExports(mockExports);
      
      const state1 = coreState.getPlayerState();
      coreState.update(0, 1, false, 0.016);
      const state2 = coreState.getPlayerState();
      
      // Should return new state object after update
      expect(state1).to.not.equal(state2);
    });
  });

  describe('WasmCombatSystem', () => {
    let combat;
    let mockExports;
    let attackCalled;
    let rollCalled;

    beforeEach(() => {
      attackCalled = false;
      rollCalled = false;
      
      mockExports = {
        set_player_input: () => {},
        on_attack: () => {
          attackCalled = true;
          return 1;
        },
        on_roll_start: () => {
          rollCalled = true;
          return 1;
        },
        get_block_state: () => 0,
        set_blocking: () => 1,
        get_parry_window: () => 0.12,
        get_attack_cooldown: () => 0.35,
        get_roll_duration: () => 0.18,
        get_roll_cooldown: () => 0.8
      };
      
      combat = new WasmCombatSystem(mockExports);
    });

    it('should initialize with exports', () => {
      expect(combat.exports).to.equal(mockExports);
      expect(combat.isLoaded).to.be.false;
    });

    it('should set exports and mark as loaded', () => {
      combat.setExports(mockExports);
      expect(combat.isLoaded).to.be.true;
    });

    it('should execute attack', () => {
      combat.setExports(mockExports);
      const result = combat.onAttack();
      expect(result).to.equal(1);
      expect(attackCalled).to.be.true;
    });

    it('should execute roll', () => {
      combat.setExports(mockExports);
      const result = combat.onRollStart();
      expect(result).to.equal(1);
      expect(rollCalled).to.be.true;
    });

    it('should get parry window', () => {
      combat.setExports(mockExports);
      expect(combat.getParryWindow()).to.equal(0.12);
    });

    it('should get timing constants', () => {
      combat.setExports(mockExports);
      const timing = combat.getTimingConstants();
      
      expect(timing).to.have.property('rollDuration');
      expect(timing).to.have.property('rollCooldown');
      expect(timing).to.have.property('attackCooldown');
    });

    it('should return default timing constants when exports missing', () => {
      combat.setExports({});
      const timing = combat.getTimingConstants();
      
      expect(timing.rollDuration).to.equal(0.18);
      expect(timing.rollCooldown).to.equal(0.8);
      expect(timing.attackCooldown).to.equal(0.35);
    });

    it('should handle light attack', () => {
      let inputCalled = false;
      mockExports.set_player_input = (x, y, roll, jump, light, heavy, block, special) => {
        inputCalled = true;
        expect(light).to.equal(1);
      };
      
      combat.setExports(mockExports);
      const result = combat.lightAttack();
      
      expect(result).to.be.true;
      expect(inputCalled).to.be.true;
    });

    it('should handle heavy attack', () => {
      let inputCalled = false;
      mockExports.set_player_input = (x, y, roll, jump, light, heavy, block, special) => {
        inputCalled = true;
        expect(heavy).to.equal(1);
      };
      
      combat.setExports(mockExports);
      const result = combat.heavyAttack();
      
      expect(result).to.be.true;
      expect(inputCalled).to.be.true;
    });

    it('should handle special attack', () => {
      let inputCalled = false;
      mockExports.set_player_input = (x, y, roll, jump, light, heavy, block, special) => {
        inputCalled = true;
        expect(special).to.equal(1);
      };
      
      combat.setExports(mockExports);
      const result = combat.specialAttack();
      
      expect(result).to.be.true;
      expect(inputCalled).to.be.true;
    });

    it('should get combat telemetry', () => {
      mockExports.get_combo_count = () => 3;
      mockExports.get_is_rolling = () => 0;
      mockExports.get_is_stunned = () => 0;
      
      combat.setExports(mockExports);
      const telemetry = combat.getCombatTelemetry();
      
      expect(telemetry).to.have.property('comboCount');
      expect(telemetry).to.have.property('parryWindow');
      expect(telemetry).to.have.property('isBlocking');
      expect(telemetry.comboCount).to.equal(3);
    });

    it('should return fallback telemetry when not loaded', () => {
      const telemetry = combat.getCombatTelemetry();
      
      expect(telemetry).to.have.property('comboCount');
      expect(telemetry.comboCount).to.equal(0);
      expect(telemetry.parryWindow).to.equal(0.12);
    });
  });

  describe('WasmPhaseManagers', () => {
    let phases;
    let mockExports;

    beforeEach(() => {
      mockExports = {
        get_choice_count: () => 3,
        get_choice_id: (i) => i + 100,
        get_choice_type: (i) => i % 3,
        get_choice_rarity: (i) => i % 4,
        get_choice_tags: (i) => 0,
        commit_choice: () => {},
        get_gold: () => 500,
        get_essence: () => 250,
        get_shop_item_count: () => 5
      };
      
      phases = new WasmPhaseManagers(mockExports);
    });

    it('should initialize with exports', () => {
      expect(phases.exports).to.equal(mockExports);
      expect(phases.isLoaded).to.be.false;
    });

    it('should get choice count', () => {
      phases.setExports(mockExports);
      expect(phases.getChoiceCount()).to.equal(3);
    });

    it('should get choice by index', () => {
      phases.setExports(mockExports);
      const choice = phases.getChoice(0);
      
      expect(choice).to.not.be.null;
      expect(choice).to.have.property('id');
      expect(choice).to.have.property('type');
      expect(choice).to.have.property('rarity');
      expect(choice).to.have.property('tags');
    });

    it('should validate choice index bounds', () => {
      phases.setExports(mockExports);
      const choice = phases.getChoice(999);
      
      expect(choice).to.be.null;
    });

    it('should get gold amount', () => {
      phases.setExports(mockExports);
      expect(phases.getGold()).to.equal(500);
    });

    it('should get essence amount', () => {
      phases.setExports(mockExports);
      expect(phases.getEssence()).to.equal(250);
    });

    it('should get shop item count', () => {
      phases.setExports(mockExports);
      expect(phases.getShopItemCount()).to.equal(5);
    });

    it('should return zero when not loaded', () => {
      expect(phases.getChoiceCount()).to.equal(0);
      expect(phases.getGold()).to.equal(0);
      expect(phases.getEssence()).to.equal(0);
    });
  });

  describe('WasmWorldSimulation', () => {
    let world;
    let mockExports;

    beforeEach(() => {
      mockExports = {
        get_weather_rain: () => 0.5,
        get_weather_wind_speed: () => 10,
        get_weather_temperature: () => 22,
        get_weather_lightning: () => 0,
        get_time_of_day: () => 14,
        get_day_count: () => 5,
        is_blood_moon: () => 0,
        get_light_level: () => 0.8,
        is_night_time: () => 0
      };
      
      world = new WasmWorldSimulation(mockExports);
    });

    it('should initialize with exports', () => {
      expect(world.exports).to.equal(mockExports);
      expect(world.isLoaded).to.be.false;
    });

    it('should get weather information', () => {
      world.setExports(mockExports);
      const weather = world.getWeather();
      
      expect(weather).to.have.property('rain');
      expect(weather).to.have.property('windSpeed');
      expect(weather).to.have.property('temperature');
      expect(weather).to.have.property('lightning');
      expect(weather.rain).to.equal(0.5);
      expect(weather.temperature).to.equal(22);
    });

    it('should get time information', () => {
      world.setExports(mockExports);
      const time = world.getTimeInfo();
      
      expect(time).to.have.property('timeOfDay');
      expect(time).to.have.property('dayCount');
      expect(time).to.have.property('isBloodMoon');
      expect(time).to.have.property('lightLevel');
      expect(time).to.have.property('isNight');
      expect(time.timeOfDay).to.equal(14);
      expect(time.dayCount).to.equal(5);
    });

    it('should get terrain info', () => {
      mockExports.get_terrain_elevation = (x, y) => x + y;
      mockExports.get_terrain_moisture = (x, y) => 0.5;
      mockExports.get_climate_zone = (x, y) => 1;
      
      world.setExports(mockExports);
      const terrain = world.getTerrainInfo(0.5, 0.5);
      
      expect(terrain).to.have.property('elevation');
      expect(terrain).to.have.property('moisture');
      expect(terrain).to.have.property('climateZone');
      expect(terrain.elevation).to.equal(1.0);
    });

    it('should return default weather when not loaded', () => {
      const weather = world.getWeather();
      
      expect(weather.rain).to.equal(0);
      expect(weather.windSpeed).to.equal(0);
      expect(weather.temperature).to.equal(20);
      expect(weather.lightning).to.be.false;
    });

    it('should return default time info when not loaded', () => {
      const time = world.getTimeInfo();
      
      expect(time.timeOfDay).to.equal(12);
      expect(time.dayCount).to.equal(0);
      expect(time.isBloodMoon).to.be.false;
    });
  });
});
