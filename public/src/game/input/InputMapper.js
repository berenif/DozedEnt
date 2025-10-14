// InputMapper.js
// Maps keyboard to set_player_input signature

export class InputMapper {
  constructor() {
    this.keys = Object.create(null)
  }

  attach() {
    window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true })
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false })
  }

  axisX() {
    const left = !!(this.keys['a'] || this.keys['arrowleft'])
    const right = !!(this.keys['d'] || this.keys['arrowright'])
    return right === left ? 0 : (right ? 1 : -1)
  }

  axisY() {
    const up = !!(this.keys['w'] || this.keys['arrowup'])
    const down = !!(this.keys['s'] || this.keys['arrowdown'])
    return up === down ? 0 : (down ? 1 : -1) // y+ is downwards in screen; engine normalizes
  }

  flags() {
    return {
      roll: this.keys[' '], // space
      jump: this.keys['w'] || this.keys['arrowup'],
      light: this.keys['j'],
      heavy: this.keys['l'],
      block: this.keys['shift'],
      special: this.keys['k']
    }
  }
}


