// grab-vs-heavy-preference.test.js
const assert = require('assert')

describe('Grab preferred over heavy at hold threshold', () => {
  it('emits Grab start when grabbable is in range at holdMinMs', async () => {
    const { HandStateMachine } = await import('../../public/src/game/input/hands/HandStateMachine.js')
    const { HandId, Tunables } = await import('../../public/src/game/state/HandState.js')
    const intents = []
    let now = 0
    const hsm = new HandStateMachine({
      onIntent: (_h, intent, payload) => intents.push({ intent, payload }),
      isGrabbableInRange: () => true,
      getNow: () => now
    })
    hsm.handleDown(HandId.Left, { x: 0, y: 0 })
    now += Tunables.holdMinMs + 10
    // trigger timer by any move or up processing cycle
    hsm.handleMove(HandId.Left, { x: 1, y: 1 })
    const hasGrabStart = intents.some(i => i.intent === 'Grab' && i.payload && i.payload.phase === 'start')
    assert.ok(hasGrabStart)
  })
})
