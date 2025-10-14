// ArmCoordinator.js
// Cross-hand rules: block chord, two-hand items, conflict resolution

import { HandId, HandState, Tunables } from '../state/HandState.js'

export class ArmCoordinator {
  constructor({ getHandState }) {
    this.getHandState = getHandState // (handId) => HandState
    this.lastDownTs = { [HandId.Left]: 0, [HandId.Right]: 0 }
    this.blocking = false
  }

  noteHandDown(handId, ts) {
    this.lastDownTs[handId] = ts
  }

  update(now) {
    const left = this.getHandState(HandId.Left)
    const right = this.getHandState(HandId.Right)
    const res = { overrides: {}, twoHandEvents: [] }

    // Two-button block chord window
    const chord = this._withinChordWindow()
    const bothHeld = left !== HandState.Idle && right !== HandState.Idle
    if (chord && bothHeld) {
      if (!this.blocking) {
        this.blocking = true
        res.twoHandEvents.push({ type: 'BlockStart', frame: Math.round(now / Tunables.frameMs) })
      }
      res.overrides[HandId.Left] = HandState.Block
      res.overrides[HandId.Right] = HandState.Block
    } else if (this.blocking && (!bothHeld)) {
      this.blocking = false
      res.twoHandEvents.push({ type: 'BlockEnd', frame: Math.round(now / Tunables.frameMs) })
    }

    return res
  }

  _withinChordWindow() {
    const dt = Math.abs(this.lastDownTs[HandId.Left] - this.lastDownTs[HandId.Right])
    return dt <= Tunables.blockChordMs
  }
}


