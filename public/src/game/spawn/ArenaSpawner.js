// ArenaSpawner.js
// Minimal enemy spawning via WASM exports

export class ArenaSpawner {
  constructor(wasmApi) {
    this.api = wasmApi
    this._spawned = false
    this._time = 0
  }

  spawnInitial() {
    try {
      const ex = this.api.exports || {}
      if (typeof ex.spawn_wolves === 'function') {
        ex.spawn_wolves(5)
        this._spawned = true
      }
    } catch (_e) {}
  }

  reset() {
    try {
      const ex = this.api.exports || {}
      if (typeof ex.clear_enemies === 'function') { ex.clear_enemies() }
      this._spawned = false
      this._time = 0
      this.spawnInitial()
    } catch (_e) {}
  }

  update(dt) {
    this._time += dt
    try {
      const ex = this.api.exports || {}
      const count = typeof ex.get_enemy_count === 'function' ? (ex.get_enemy_count() | 0) : 0
      // If no enemies for 3 seconds, spawn a new wave
      if (this._spawned && count === 0 && this._time > 3) {
        if (typeof ex.spawn_wolves === 'function') {
          ex.spawn_wolves(5)
          this._time = 0
        }
      }
    } catch (_e) {}
  }
}


