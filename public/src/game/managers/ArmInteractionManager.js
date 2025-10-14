// ArmInteractionManager.js
// Resolves intents to action commands (attack, grab, push, throw)

import { Intent, Tunables } from '../state/HandState.js'
import { dir8ToVector } from '../net/Quantization.js'

export class ArmInteractionManager {
  constructor({ onCommand } = {}) {
    this.onCommand = onCommand || (() => {})
  }

  resolveIntent(handId, intent, context) {
    switch (intent) {
      case Intent.LightAttack:
        return this._emit({ type: 'LightAttack', handId })
      case Intent.HeavyCharge:
        return this._emit({ type: 'HeavyCharge', handId, ...context })
      case Intent.HeavyAttack:
        return this._emit({ type: 'HeavyAttack', handId, chargeMs: clampMs(context?.chargeMs, 0, Tunables.heavyMaxMs) })
      case Intent.DirectionalAttack: {
        const v = dir8ToVector(context.dir8)
        return this._emit({ type: 'DirectionalAttack', handId, dir8: context.dir8, vx: v.x, vy: v.y, magnitudeBucket: context.magnitudeBucket })
      }
      case Intent.Grab:
        return this._emit({ type: 'Grab', handId, ...context })
      case Intent.Push: {
        const dx = context.dx || 0, dy = context.dy || 0
        return this._emit({ type: 'Push', handId, dx, dy })
      }
      case Intent.Throw: {
        const v = dir8ToVector(context.dir8)
        return this._emit({ type: 'Throw', handId, dir8: context.dir8, vx: v.x, vy: v.y, speedBucket: context.speedBucket })
      }
      case Intent.DrawPath:
        return this._emit({ type: 'DrawPath', handId, ...context })
    }
  }

  _emit(cmd) {
    this.onCommand && this.onCommand(cmd)
    return cmd
  }
}

function clampMs(v, min, max) {
  const n = Math.max(min, Math.min(max, v || 0))
  return Math.round(n)
}


