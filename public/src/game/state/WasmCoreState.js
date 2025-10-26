// WasmCoreState.js
// Centralized read-only facade over WASM state (ADR-003 compliance)
// Single source of truth for all game state access
import { WolfStateManager } from './WolfStateManager.js'

/**
 * WasmCoreState provides a centralized, read-only interface to WASM game state.
 * This implements ADR-003: all gameplay state is owned by WASM, JS only reads snapshots.
 * 
 * Key principles:
 * - Single snapshot per frame (updated once in game loop)
 * - All components read from this facade, never directly from WASM
 * - Immutable state objects returned to prevent accidental mutation
 * - Validates and coerces all WASM data to prevent NaN/corruption
 */
export class WasmCoreState {
  constructor(wasmApi) {
    this.wasmApi = wasmApi
    this.exports = wasmApi.exports || {}
    
    // Cached state snapshot (updated once per frame)
    this.snapshot = {
      player: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        hp: 1,
        stamina: 1,
        anim: 'idle',
        grounded: false,
        rolling: false,
        blocking: false
      },
      ui: {
        phase: 0,
        tick: 0
      },
      enemies: [],
      validated: false
    }
    
    // Frame counter for debugging
    this.frameCount = 0
    
    // Seed tracking for replay
    this.currentSeed = null
    this._wolfStateManager = null
  }

  /**
   * Update snapshot from WASM (call once per frame)
   */
  update() {
    this.frameCount++
    
    try {
      // Read player state from WASM
      const playerState = this.wasmApi.getPlayerState()
      
      // Validate and coerce all numeric values
      this.snapshot.player = {
        x: this._coerceNumber(playerState.x, 0),
        y: this._coerceNumber(playerState.y, 0),
        vx: this._coerceNumber(playerState.vx, 0),
        vy: this._coerceNumber(playerState.vy, 0),
        hp: this._coerceNumber(playerState.hp, 1),
        stamina: this._coerceNumber(playerState.stamina, 1),
        anim: playerState.anim || 'idle',
        grounded: !!playerState.grounded,
        rolling: !!playerState.rolling,
        blocking: !!playerState.block
      }
      
      // Read UI state
      this.snapshot.ui = {
        phase: this._coerceNumber(
          typeof this.exports.get_phase === 'function' ? this.exports.get_phase() : 0,
          0
        ),
        tick: this.frameCount
      }
      
      // Read enemy states
      this.snapshot.enemies = this._readEnemies()
      
      this.snapshot.validated = true
    } catch (error) {
      console.error('[WasmCoreState] Failed to update snapshot:', error)
      this.snapshot.validated = false
    }
  }

  // WolfStateManager accessor (phase 1 integration)
  getWolfState() {
    if (!this._wolfStateManager) {
      this._wolfStateManager = new WolfStateManager(this.exports)
    } else {
      // Keep exports in sync if WASM reloaded
      this._wolfStateManager.exports = this.exports
    }
    return this._wolfStateManager
  }

  // Skeleton snapshot: batched read once per frame
  getSkeletonSnapshot() {
    const ex = this.exports
    const count = typeof ex.get_skeleton_joint_count === 'function' ? ex.get_skeleton_joint_count() : 0
    if (!Number.isFinite(count) || count <= 0 || count > 64) {
      return Object.freeze({ joints: [], balanceQuality: 1, leftGrounded: false, rightGrounded: false })
    }
    const joints = new Array(count)
    for (let i = 0; i < count; i++) {
      const x = this._coerceNumber(ex.get_skeleton_joint_x?.(i), 0)
      const y = this._coerceNumber(ex.get_skeleton_joint_y?.(i), 0)
      joints[i] = [x, y]
    }
    const balanceQuality = this._coerceNumber(ex.get_balance_quality?.(), 1)
    const leftGrounded = !!ex.get_left_foot_grounded?.()
    const rightGrounded = !!ex.get_right_foot_grounded?.()
    return Object.freeze({ joints, balanceQuality, leftGrounded, rightGrounded })
  }

  /**
   * Get immutable player state snapshot
   */
  getPlayerState() {
    return Object.freeze({ ...this.snapshot.player })
  }

  /**
   * Get player position
   */
  getPlayerPosition() {
    return Object.freeze({
      x: this.snapshot.player.x,
      y: this.snapshot.player.y
    })
  }

  /**
   * Get player velocity
   */
  getPlayerVelocity() {
    return Object.freeze({
      vx: this.snapshot.player.vx,
      vy: this.snapshot.player.vy
    })
  }

  /**
   * Get player health (normalized 0-1)
   */
  getPlayerHealth() {
    return Math.max(0, Math.min(1, this.snapshot.player.hp))
  }

  /**
   * Get player stamina (normalized 0-1)
   */
  getPlayerStamina() {
    return Math.max(0, Math.min(1, this.snapshot.player.stamina))
  }

  /**
   * Get player animation state
   */
  getPlayerAnimation() {
    return this.snapshot.player.anim
  }

  /**
   * Check if player is grounded
   */
  isPlayerGrounded() {
    return this.snapshot.player.grounded
  }

  /**
   * Check if player is rolling
   */
  isPlayerRolling() {
    return this.snapshot.player.rolling
  }

  /**
   * Check if player is blocking
   */
  isPlayerBlocking() {
    return this.snapshot.player.blocking
  }

  /**
   * Get UI state snapshot
   */
  getUIState() {
    // Include hp and stamina for UI displays
    return Object.freeze({ 
      ...this.snapshot.ui,
      hp: this.snapshot.player.hp,
      stamina: this.snapshot.player.stamina
    })
  }

  /**
   * Get current game phase
   */
  getPhase() {
    return this.snapshot.ui.phase
  }

  /**
   * Get current tick/frame count
   */
  getTick() {
    return this.snapshot.ui.tick
  }

  /**
   * Get enemy states
   */
  getEnemyStates() {
    return Object.freeze([...this.snapshot.enemies])
  }

  /**
   * Get enemy count
   */
  getEnemyCount() {
    const count = typeof this.exports.get_enemy_count === 'function' 
      ? this.exports.get_enemy_count() 
      : 0
    return this._coerceNumber(count, 0)
  }

  /**
   * Check if snapshot is valid
   */
  isValid() {
    return this.snapshot.validated
  }

  /**
   * Serialize state for replay/multiplayer
   */
  serialize() {
    return {
      frame: this.frameCount,
      seed: this.currentSeed,
      player: this.snapshot.player,
      enemies: this.snapshot.enemies,
      phase: this.snapshot.ui.phase
    }
  }

  /**
   * Set seed for deterministic replay
   */
  setSeed(seed) {
    this.currentSeed = seed
  }

  /**
   * Get current seed
   */
  getSeed() {
    return this.currentSeed
  }

  // Private helpers

  _coerceNumber(value, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  _readEnemies() {
    const enemies = []
    const count = this.getEnemyCount()
    
    for (let i = 0; i < count; i++) {
      if (typeof this.exports.get_enemy_x === 'function') {
        enemies.push({
          index: i,
          x: this._coerceNumber(this.exports.get_enemy_x(i), 0),
          y: this._coerceNumber(this.exports.get_enemy_y(i), 0),
          hp: this._coerceNumber(this.exports.get_enemy_hp?.(i), 1)
        })
      }
    }
    
    return enemies
  }
}

