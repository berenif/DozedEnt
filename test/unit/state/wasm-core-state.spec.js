// wasm-core-state.spec.js
// Unit tests for WasmCoreState

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { WasmCoreState } from '../../../public/src/game/state/WasmCoreState.js';

describe('WasmCoreState', () => {
  let state;
  let mockWasmApi;

  beforeEach(() => {
    mockWasmApi = {
      exports: {
        get_phase: () => 1,
        get_enemy_count: () => 2,
        get_enemy_x: (i) => i * 10,
        get_enemy_y: (i) => i * 5,
        get_enemy_hp: (i) => 0.8
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

    state = new WasmCoreState(mockWasmApi);
  });

  describe('constructor', () => {
    it('should initialize with WASM API', () => {
      expect(state.wasmApi).to.equal(mockWasmApi);
      expect(state.exports).to.exist;
    });

    it('should initialize snapshot', () => {
      expect(state.snapshot).to.exist;
      expect(state.snapshot).to.have.property('player');
      expect(state.snapshot).to.have.property('ui');
      expect(state.snapshot).to.have.property('enemies');
    });

    it('should initialize frame count', () => {
      expect(state.frameCount).to.equal(0);
    });
  });

  describe('update()', () => {
    it('should update snapshot from WASM', () => {
      state.update();
      
      expect(state.snapshot.player.x).to.equal(1.5);
      expect(state.snapshot.player.y).to.equal(2.5);
      expect(state.snapshot.validated).to.be.true;
    });

    it('should increment frame count', () => {
      const before = state.frameCount;
      state.update();
      
      expect(state.frameCount).to.equal(before + 1);
    });

    it('should coerce NaN to defaults', () => {
      mockWasmApi.getPlayerState = () => ({
        x: NaN,
        y: 2.5,
        vx: NaN,
        vy: 0.3,
        hp: 0.8,
        stamina: 0.6,
        anim: 'running',
        grounded: true,
        rolling: false,
        block: false
      });

      state.update();
      
      expect(state.snapshot.player.x).to.equal(0); // Coerced to 0
      expect(state.snapshot.player.vx).to.equal(0); // Coerced to 0
      expect(state.snapshot.player.y).to.equal(2.5); // Valid value
    });
  });

  describe('getPlayerState()', () => {
    it('should return immutable player state', () => {
      state.update();
      const playerState = state.getPlayerState();
      
      expect(playerState).to.have.property('x', 1.5);
      expect(playerState).to.have.property('y', 2.5);
      expect(Object.isFrozen(playerState)).to.be.true;
    });
  });

  describe('getPlayerPosition()', () => {
    it('should return position', () => {
      state.update();
      const pos = state.getPlayerPosition();
      
      expect(pos).to.deep.equal({ x: 1.5, y: 2.5 });
      expect(Object.isFrozen(pos)).to.be.true;
    });
  });

  describe('getPlayerVelocity()', () => {
    it('should return velocity', () => {
      state.update();
      const vel = state.getPlayerVelocity();
      
      expect(vel).to.deep.equal({ vx: 0.5, vy: 0.3 });
      expect(Object.isFrozen(vel)).to.be.true;
    });
  });

  describe('getPlayerHealth()', () => {
    it('should return normalized health', () => {
      state.update();
      expect(state.getPlayerHealth()).to.equal(0.8);
    });

    it('should clamp health to 0-1 range', () => {
      mockWasmApi.getPlayerState = () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        hp: 1.5, // Over max
        stamina: 1, anim: 'idle',
        grounded: true, rolling: false, block: false
      });

      state.update();
      expect(state.getPlayerHealth()).to.equal(1);

      mockWasmApi.getPlayerState = () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        hp: -0.5, // Below min
        stamina: 1, anim: 'idle',
        grounded: true, rolling: false, block: false
      });

      state.update();
      expect(state.getPlayerHealth()).to.equal(0);
    });
  });

  describe('getPlayerStamina()', () => {
    it('should return normalized stamina', () => {
      state.update();
      expect(state.getPlayerStamina()).to.equal(0.6);
    });

    it('should clamp stamina to 0-1 range', () => {
      mockWasmApi.getPlayerState = () => ({
        x: 0, y: 0, vx: 0, vy: 0, hp: 1,
        stamina: 2.0, // Over max
        anim: 'idle', grounded: true, rolling: false, block: false
      });

      state.update();
      expect(state.getPlayerStamina()).to.equal(1);
    });
  });

  describe('isPlayerGrounded()', () => {
    it('should return grounded status', () => {
      state.update();
      expect(state.isPlayerGrounded()).to.be.true;
    });
  });

  describe('getEnemyCount()', () => {
    it('should return enemy count from WASM', () => {
      expect(state.getEnemyCount()).to.equal(2);
    });

    it('should coerce NaN to 0', () => {
      mockWasmApi.exports.get_enemy_count = () => NaN;
      expect(state.getEnemyCount()).to.equal(0);
    });
  });

  describe('getEnemyStates()', () => {
    it('should return immutable enemy array', () => {
      state.update();
      const enemies = state.getEnemyStates();
      
      expect(enemies).to.have.lengthOf(2);
      expect(Object.isFrozen(enemies)).to.be.true;
    });
  });

  describe('serialize()', () => {
    it('should serialize state for replay', () => {
      state.update();
      const serialized = state.serialize();
      
      expect(serialized).to.have.property('frame');
      expect(serialized).to.have.property('player');
      expect(serialized).to.have.property('enemies');
      expect(serialized).to.have.property('phase');
    });
  });

  describe('seed management', () => {
    it('should set and get seed', () => {
      const seed = 98765;
      state.setSeed(seed);
      
      expect(state.getSeed()).to.equal(seed);
    });
  });

  describe('isValid()', () => {
    it('should return false before first update', () => {
      expect(state.isValid()).to.be.false;
    });

    it('should return true after successful update', () => {
      state.update();
      expect(state.isValid()).to.be.true;
    });
  });
});

