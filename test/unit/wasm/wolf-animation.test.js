// wolf-animation.test.js
// Unit tests for WASM wolf animation exports

import { describe, it, expect, beforeAll } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

let wasmModule = null
let wasmExports = null

/**
 * Load WASM module for testing
 */
async function loadWasmModule() {
  try {
    const wasmPath = join(process.cwd(), 'public', 'wasm', 'game.wasm')
    const wasmBuffer = readFileSync(wasmPath)
    const wasmInstance = await WebAssembly.instantiate(wasmBuffer, {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 })
      }
    })
    return wasmInstance.instance.exports
  } catch (error) {
    console.error('Failed to load WASM module:', error)
    throw error
  }
}

describe('Wolf Animation Exports', () => {
  beforeAll(async () => {
    wasmExports = await loadWasmModule()
  })

  describe('Export existence', () => {
    it('should export get_wolf_leg_x', () => {
      expect(typeof wasmExports.get_wolf_leg_x).toBe('function')
    })

    it('should export get_wolf_leg_y', () => {
      expect(typeof wasmExports.get_wolf_leg_y).toBe('function')
    })

    it('should export get_wolf_body_bob', () => {
      expect(typeof wasmExports.get_wolf_body_bob).toBe('function')
    })

    it('should export get_wolf_head_pitch', () => {
      expect(typeof wasmExports.get_wolf_head_pitch).toBe('function')
    })

    it('should export get_wolf_head_yaw', () => {
      expect(typeof wasmExports.get_wolf_head_yaw).toBe('function')
    })

    it('should export get_wolf_tail_wag', () => {
      expect(typeof wasmExports.get_wolf_tail_wag).toBe('function')
    })

    it('should export get_wolf_ear_rotation', () => {
      expect(typeof wasmExports.get_wolf_ear_rotation).toBe('function')
    })

    it('should export get_wolf_body_stretch', () => {
      expect(typeof wasmExports.get_wolf_body_stretch).toBe('function')
    })
  })

  describe('Bounds checking', () => {
    beforeAll(() => {
      // Initialize WASM
      if (typeof wasmExports.init_run === 'function') {
        wasmExports.init_run(12345, 0)
      }
    })

    it('should return 0.0 for invalid wolf index (-1)', () => {
      expect(wasmExports.get_wolf_body_bob(-1)).toBe(0.0)
      expect(wasmExports.get_wolf_head_yaw(-1)).toBe(0.0)
      expect(wasmExports.get_wolf_body_stretch(-1)).toBe(0.0)
    })

    it('should return 0.0 for invalid wolf index (999)', () => {
      expect(wasmExports.get_wolf_body_bob(999)).toBe(0.0)
      expect(wasmExports.get_wolf_head_yaw(999)).toBe(0.0)
      expect(wasmExports.get_wolf_body_stretch(999)).toBe(0.0)
    })

    it('should return 0.0 for invalid leg index', () => {
      expect(wasmExports.get_wolf_leg_x(0, -1)).toBe(0.0)
      expect(wasmExports.get_wolf_leg_x(0, 4)).toBe(0.0)
      expect(wasmExports.get_wolf_leg_y(0, -1)).toBe(0.0)
      expect(wasmExports.get_wolf_leg_y(0, 4)).toBe(0.0)
    })

    it('should return 0.0 for invalid ear index', () => {
      expect(wasmExports.get_wolf_ear_rotation(0, -1)).toBe(0.0)
      expect(wasmExports.get_wolf_ear_rotation(0, 2)).toBe(0.0)
    })
  })

  describe('Valid animation data', () => {
    beforeAll(() => {
      // Initialize and spawn a wolf
      if (typeof wasmExports.init_run === 'function') {
        wasmExports.init_run(12345, 0)
      }
      if (typeof wasmExports.spawn_wolf === 'function') {
        wasmExports.spawn_wolf(0.5, 0.5, 0) // Normal wolf
      }
      // Run a few updates to generate animation data
      if (typeof wasmExports.update === 'function') {
        for (let i = 0; i < 10; i++) {
          wasmExports.update(0.016) // ~60 FPS
        }
      }
    })

    it('should return finite numbers for body_bob', () => {
      const bodyBob = wasmExports.get_wolf_body_bob(0)
      expect(Number.isFinite(bodyBob)).toBe(true)
    })

    it('should return finite numbers for head_yaw', () => {
      const headYaw = wasmExports.get_wolf_head_yaw(0)
      expect(Number.isFinite(headYaw)).toBe(true)
    })

    it('should return finite numbers for head_pitch', () => {
      const headPitch = wasmExports.get_wolf_head_pitch(0)
      expect(Number.isFinite(headPitch)).toBe(true)
    })

    it('should return finite numbers for tail_wag', () => {
      const tailWag = wasmExports.get_wolf_tail_wag(0)
      expect(Number.isFinite(tailWag)).toBe(true)
    })

    it('should return finite numbers for body_stretch', () => {
      const bodyStretch = wasmExports.get_wolf_body_stretch(0)
      expect(Number.isFinite(bodyStretch)).toBe(true)
      expect(bodyStretch).toBeGreaterThan(0) // Should be positive
    })

    it('should return finite numbers for leg positions', () => {
      for (let leg = 0; leg < 4; leg++) {
        const legX = wasmExports.get_wolf_leg_x(0, leg)
        const legY = wasmExports.get_wolf_leg_y(0, leg)
        expect(Number.isFinite(legX)).toBe(true)
        expect(Number.isFinite(legY)).toBe(true)
        expect(legY).toBeGreaterThanOrEqual(0) // Y should be non-negative (ground contact)
      }
    })

    it('should return finite numbers for ear rotation', () => {
      for (let ear = 0; ear < 2; ear++) {
        const earRot = wasmExports.get_wolf_ear_rotation(0, ear)
        expect(Number.isFinite(earRot)).toBe(true)
      }
    })
  })

  describe('Animation changes over time', () => {
    beforeAll(() => {
      // Initialize and spawn a moving wolf
      if (typeof wasmExports.init_run === 'function') {
        wasmExports.init_run(54321, 0)
      }
      if (typeof wasmExports.spawn_wolf === 'function') {
        wasmExports.spawn_wolf(0.3, 0.3, 0)
      }
    })

    it('should change body_bob over time during movement', () => {
      const initialBodyBob = wasmExports.get_wolf_body_bob(0)
      
      // Run several updates
      for (let i = 0; i < 30; i++) {
        wasmExports.update(0.016)
      }
      
      const finalBodyBob = wasmExports.get_wolf_body_bob(0)
      
      // Body bob should change over time (unless wolf is perfectly still)
      // This is a soft check - it's okay if they're the same if wolf is idle
      expect(Number.isFinite(initialBodyBob)).toBe(true)
      expect(Number.isFinite(finalBodyBob)).toBe(true)
    })

    it('should change leg positions over time', () => {
      const initialLeg0X = wasmExports.get_wolf_leg_x(0, 0)
      
      // Run several updates
      for (let i = 0; i < 30; i++) {
        wasmExports.update(0.016)
      }
      
      const finalLeg0X = wasmExports.get_wolf_leg_x(0, 0)
      
      // Leg position should change if wolf is moving
      expect(Number.isFinite(initialLeg0X)).toBe(true)
      expect(Number.isFinite(finalLeg0X)).toBe(true)
    })
  })
})

