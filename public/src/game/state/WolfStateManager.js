// WolfStateManager.js
// Read-only facade for wolf and pack snapshots from WASM exports
// - Uses new wolf-specific exports when available (Phase 1+)
// - Falls back to existing enemy exports for compatibility

export class WolfStateManager {
  constructor(wasmExports) {
    this.exports = wasmExports || {}
    this._lastSnapshotTick = -1
    this._cachedSnapshot = { wolves: [], packs: [], valid: false }
  }

  // Public API: get immutable snapshot once per frame
  getSnapshot(tick) {
    const safeTick = Number.isFinite(tick) ? tick : this._readTickFallback()
    if (safeTick === this._lastSnapshotTick && this._cachedSnapshot.valid) {
      return this._cachedSnapshot
    }

    const wolves = this._readWolves()
    const packs = this._readPacks()

    this._cachedSnapshot = Object.freeze({
      wolves,
      packs,
      valid: true
    })
    this._lastSnapshotTick = safeTick
    return this._cachedSnapshot
  }

  // Detect presence of Phase 1 wolf exports
  _hasWolfCoreExports() {
    const ex = this.exports
    return (
      typeof ex.get_wolf_x === 'function' &&
      typeof ex.get_wolf_y === 'function' &&
      typeof ex.get_wolf_health === 'function' &&
      typeof ex.get_wolf_state === 'function' &&
      typeof ex.get_wolf_emotion === 'function'
    )
  }

  _hasPackBasics() {
    const ex = this.exports
    return (
      typeof ex.get_pack_count === 'function' &&
      typeof ex.get_pack_plan === 'function' &&
      typeof ex.get_pack_morale === 'function'
    )
  }

  _readWolves() {
    // Prefer explicit enemy count until get_wolf_count exists
    const ex = this.exports
    const countFn = ex.get_wolf_count || ex.get_enemy_count
    const countRaw = typeof countFn === 'function' ? countFn() : 0
    const count = this._clampInt(countRaw, 0, 1024)

    const useWolf = this._hasWolfCoreExports()
    const wolves = new Array(count)

    for (let i = 0; i < count; i++) {
      if (useWolf) {
        const x = this._num(ex.get_wolf_x(i), 0)
        const y = this._num(ex.get_wolf_y(i), 0)
        const health = this._num(ex.get_wolf_health(i), 1)
        const state = this._int(ex.get_wolf_state(i), 0)
        const emotion = this._int(ex.get_wolf_emotion(i), 0)
        wolves[i] = Object.freeze({ index: i, position: [x, y], health, state, emotion })
      } else {
        // Compatibility path (existing enemy exports)
        const x = this._num(ex.get_enemy_x?.(i), 0)
        const y = this._num(ex.get_enemy_y?.(i), 0)
        const hp = this._num(ex.get_enemy_hp?.(i), 1)
        const state = this._int(ex.get_enemy_state?.(i), 0)
        wolves[i] = Object.freeze({ index: i, position: [x, y], health: hp, state, emotion: 0 })
      }
    }

    return wolves
  }

  _readPacks() {
    const ex = this.exports
    if (!this._hasPackBasics()) return []
    const countRaw = ex.get_pack_count()
    const count = this._clampInt(countRaw, 0, 128)
    const packs = new Array(count)
    for (let i = 0; i < count; i++) {
      const plan = this._int(ex.get_pack_plan(i), 0)
      const morale = this._num(ex.get_pack_morale(i), 1)
      packs[i] = Object.freeze({ packId: i, plan, morale })
    }
    return packs
  }

  _readTickFallback() {
    // Try to read a monotonic value to gate per-frame caching
    const ex = this.exports
    if (typeof ex.get_frame_count === 'function') {
      const t = ex.get_frame_count()
      if (Number.isFinite(t)) return t
    }
    return Math.floor(performance?.now?.() || Date.now())
  }

  _num(v, fb = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fb
  }

  _int(v, fb = 0) {
    const n = this._num(v, fb)
    return (n | 0)
  }

  _clampInt(v, min, max) {
    const n = this._int(v, 0)
    if (n < min) return min
    if (n > max) return max
    return n
  }
}


