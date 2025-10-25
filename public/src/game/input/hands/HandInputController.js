// Bridges HandInputView to WASM arm targets
import { HandInputView } from './HandInputView.js'
import { worldToWasm, screenToWorld } from '../../../utils/renderer/coords.js'

export class HandInputController {
  constructor(renderer) {
    this.renderer = renderer
    this.view = new HandInputView({
      onHandDown: (handId, e) => this._onMove(handId, e),
      onHandMove: (handId, e) => this._onMove(handId, e),
      onHandUp: (handId, e) => this._onMove(handId, e),
      getUnsafeInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
    })
  }

  attach(root = document.body) {
    this.view.attach(root)
    if (window.wasmExports && typeof window.wasmExports.init_player_arms === 'function') {
      try { window.wasmExports.init_player_arms() } catch (_) {}
    }
  }

  detach() {
    this.view.detach()
  }

  _onMove(handId, e) {
    if (!window.wasmExports) return
    const world = screenToWorld(this.renderer, e.x, e.y)
    const wasm = worldToWasm(this.renderer, world.x, world.y)
    if (handId === 0) {
      if (typeof window.wasmExports.set_left_hand_target === 'function') {
        window.wasmExports.set_left_hand_target(wasm.x, wasm.y, 0)
      }
    } else {
      if (typeof window.wasmExports.set_right_hand_target === 'function') {
        window.wasmExports.set_right_hand_target(wasm.x, wasm.y, 0)
      }
    }
  }
}





