// HandHUDViewModel.js
// View-model for per-hand HUD: reticles, state badges, IK line state

import { HandId, HandState } from '../state/HandState.js'

export class HandHUDViewModel {
  constructor() {
    this.state = {
      [HandId.Left]: { badge: 'Idle', reticle: null, drawPath: [] },
      [HandId.Right]: { badge: 'Idle', reticle: null, drawPath: [] }
    }
  }

  updateHandState(handId, state) {
    this.state[handId].badge = mapStateToBadge(state)
  }

  setReticle(handId, reticleData) {
    this.state[handId].reticle = reticleData
  }

  setDrawPath(handId, pathPoints) {
    this.state[handId].drawPath = pathPoints || []
  }

  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state))
  }
}

function mapStateToBadge(s) {
  switch (s) {
    case HandState.Grab: return 'Grab'
    case HandState.Block: return 'Block'
    case HandState.Hold: return 'Hold'
    case HandState.Draw: return 'Draw'
    case HandState.Push: return 'Push'
    case HandState.Swipe: return 'Swipe'
    case HandState.Tap: return 'Tap'
    default: return 'Idle'
  }
}


