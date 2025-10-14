const assert = require('assert')

describe('Quantization + SwipeDetector', () => {
  it('maps angles to dir8 sectors consistently', async () => {
    const { angleToDir8, dir8ToAngle } = await import('../../public/src/game/net/Quantization.js')
    const rad = (d) => d * Math.PI / 180
    assert.strictEqual(angleToDir8(rad(0)), 0)
    assert.strictEqual(angleToDir8(rad(45)), 1)
    assert.strictEqual(angleToDir8(rad(90)), 2)
    assert.strictEqual(angleToDir8(rad(180)), 4)
    assert.strictEqual(angleToDir8(rad(-90)), 6)
    const a = dir8ToAngle(3)
    assert.ok(a > Math.PI/2 && a < Math.PI)
  })

  it('detects swipe and flick with thresholds', async () => {
    const { SwipeDetector } = await import('../../public/src/game/input/hands/SwipeDetector.js')
    const det = new SwipeDetector()
    const t0 = 1000
    det.addPoint(0, 0, t0)
    det.addPoint(100, 0, t0 + 100)
    const swipe = det.detectSwipe()
    assert.ok(swipe.isSwipe)
    const det2 = new SwipeDetector()
    det2.addPoint(0, 0, t0)
    det2.addPoint(300, 0, t0 + 100)
    const flick = det2.detectFlick()
    assert.ok(flick.isFlick)
  })
})


