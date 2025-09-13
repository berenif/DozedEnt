import { expect } from 'chai'
import { AnimationFrame, Animation } from '../../src/animation/animation-system.js'

describe('Animation progress', () => {
  it('returns finite progress for single-frame animations', () => {
    const frame = new AnimationFrame(0, 0, 32, 32)
    const anim = new Animation('single', [frame])

    anim.play()
    for (let i = 0; i < 10; i++) {
      anim.update(16)
    }

    const progress = anim.getProgress()
    expect(Number.isFinite(progress)).to.be.true
    expect(progress).to.equal(0)
  })
})

