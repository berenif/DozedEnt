// dual-hand-block-and-grab.test.js
const assert = require('assert')

describe('Two-hand block chord + grab vs heavy (skeleton)', () => {
  it('block triggers when both hands down within 120ms', async () => {
    const { ArmCoordinator } = await import('../../public/src/game/coordinators/ArmCoordinator.js')
    const { HandId, HandState, Tunables } = await import('../../public/src/game/state/HandState.js')
    const states = { [HandId.Left]: HandState.Hold, [HandId.Right]: HandState.Hold }
    const coord = new ArmCoordinator({ getHandState: (h) => states[h] })
    const t0 = 1000
    coord.noteHandDown(HandId.Left, t0)
    coord.noteHandDown(HandId.Right, t0 + Tunables.blockChordMs - 10)
    const res = coord.update(t0 + 200)
    assert.ok(res.overrides[HandId.Left] === HandState.Block && res.overrides[HandId.Right] === HandState.Block)
  })
})
