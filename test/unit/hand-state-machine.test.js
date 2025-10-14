const assert = require('assert')

describe('HandStateMachine transitions', () => {
  it('tap -> LightAttack within tapMaxMs', async () => {
    const { HandStateMachine } = await import('../../public/src/game/input/hands/HandStateMachine.js')
    const { HandId, Tunables } = await import('../../public/src/game/state/HandState.js')
    const intents = []
    const hsm = new HandStateMachine({ onIntent: (hand, intent, payload) => intents.push({ hand, intent, payload }), getNow: (() => { let t=0; return () => t+=10 })() })
    hsm.handleDown(HandId.Left, { x: 0, y: 0 })
    for (let i=0;i<(Tunables.tapMaxMs/10)-1;i++) hsm.handleMove(HandId.Left, { x: 1, y: 1 })
    hsm.handleUp(HandId.Left, { x: 1, y: 1 })
    const hasLight = intents.some(i => i.intent === 'LightAttack')
    assert.ok(hasLight)
  })
})


