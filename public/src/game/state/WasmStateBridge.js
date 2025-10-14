// WasmStateBridge.js
// Read-only adapter over demo/wasm-api.js to provide render/UI state

export class WasmStateBridge {
  constructor(wasmApi) {
    this.wasmApi = wasmApi
  }

  readPlayer() {
    const s = this.wasmApi.getPlayerState()
    return {
      x: s.x || 0,
      y: s.y || 0,
      vx: s.vx || 0,
      vy: s.vy || 0
    }
  }

  readUI() {
    const s = this.wasmApi.getPlayerState()
    const ex = this.wasmApi.exports || {}
    const phase = typeof ex.get_phase === 'function' ? Number(ex.get_phase()) : 0
    return {
      anim: s.anim || 'idle',
      hp: typeof s.hp === 'number' ? Math.max(0, Math.min(1, s.hp)) : 1,
      stamina: typeof s.stamina === 'number' ? Math.max(0, Math.min(1, s.stamina)) : 1,
      grounded: !!s.grounded,
      phase
    }
  }
}


