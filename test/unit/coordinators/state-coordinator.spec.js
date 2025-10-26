// state-coordinator.spec.js
// Unit tests for StateCoordinator

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { StateCoordinator } from '../../../public/src/game/coordinators/StateCoordinator.js';

describe('StateCoordinator', () => {
  let coordinator;
  let mockWasmApi;

  beforeEach(() => {
    // Create mock WASM API
    mockWasmApi = {
      exports: {
        get_phase: () => 1,
        get_enemy_count: () => 2,
        get_enemy_x: (i) => i * 10,
        get_enemy_y: (i) => i * 5,
        get_enemy_hp: (i) => 1
      },
      getPlayerState: () => ({
        x: 1.5,
        y: 2.5,
        vx: 0.5,
        vy: 0.3,
        hp: 0.8,
        stamina: 0.6,
        anim: 'running',
        grounded: true,
        rolling: false,
        block: false
      })
    };

    coordinator = new StateCoordinator(mockWasmApi);
  });

  describe('constructor', () => {
    it('should initialize with WASM API', () => {
      expect(coordinator.wasmApi).to.equal(mockWasmApi);
      expect(coordinator.wasmState).to.exist;
    });

    it('should enable physics validation by default', () => {
      expect(coordinator.physicsValidationEnabled).to.be.true;
    });
  });

  describe('update()', () => {
    it('should update WASM state snapshot', () => {
      coordinator.update();
      
      const state = coordinator.getState();
      expect(state.isValid()).to.be.true;
    });

    it('should validate physics when enabled', () => {
      coordinator.physicsValidationEnabled = true;
      coordinator.update();
      
      // Should not throw
      expect(() => coordinator.update()).to.not.throw();
    });

    it('should skip validation when disabled', () => {
      coordinator.setPhysicsValidation(false);
      coordinator.update();
      
      expect(coordinator.physicsValidationEnabled).to.be.false;
    });
  });

  describe('getState()', () => {
    it('should return WasmCoreState instance', () => {
      const state = coordinator.getState();
      expect(state).to.exist;
      expect(state.getPlayerState).to.be.a('function');
    });
  });

  describe('seed management', () => {
    it('should set and get seed', () => {
      const seed = 12345;
      coordinator.setSeed(seed);
      
      expect(coordinator.getSeed()).to.equal(seed);
    });
  });

  describe('serialization', () => {
    it('should serialize current state', () => {
      coordinator.update();
      const serialized = coordinator.serialize();
      
      expect(serialized).to.have.property('frame');
      expect(serialized).to.have.property('player');
      expect(serialized).to.have.property('enemies');
    });
  });

  describe('physics validation', () => {
    it('should detect NaN position corruption', () => {
      const consoleErrors = [];
      const originalError = console.error;
      console.error = (...args) => consoleErrors.push(args);

      mockWasmApi.getPlayerState = () => ({
        x: NaN,
        y: 2.5,
        vx: 0,
        vy: 0,
        hp: 1,
        stamina: 1,
        anim: 'idle',
        grounded: true,
        rolling: false,
        block: false
      });

      coordinator.update();

      console.error = originalError;
      expect(consoleErrors.length).to.be.greaterThan(0);
      expect(consoleErrors[0].join(' ')).to.include('PHYSICS VALIDATION FAILED');
    });

    it('should detect impossible teleportation', () => {
      const consoleWarnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => consoleWarnings.push(args);

      // First update at (0, 0)
      mockWasmApi.getPlayerState = () => ({
        x: 0, y: 0, vx: 0, vy: 0, hp: 1, stamina: 1,
        anim: 'idle', grounded: true, rolling: false, block: false
      });
      coordinator.update();

      // Second update at (100, 100) - impossible jump
      mockWasmApi.getPlayerState = () => ({
        x: 100, y: 100, vx: 0, vy: 0, hp: 1, stamina: 1,
        anim: 'idle', grounded: true, rolling: false, block: false
      });
      coordinator.update();

      console.warn = originalWarn;
      expect(consoleWarnings.length).to.be.greaterThan(0);
      expect(consoleWarnings[0].join(' ')).to.include('position jump');
    });
  });
});

