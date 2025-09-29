/**
 * Player Animator Module
 * Handles procedural animation for player characters
 */

export class AnimatedPlayer {
  constructor(x = 0, y = 0, config = {}) {
    this.x = x
    this.y = y
    this.health = config.health || 100
    this.stamina = config.stamina || 100
    this.speed = config.speed || 250
    this.attackDamage = config.attackDamage || 20
    
    this.currentState = 'idle'
    this.animationTime = 0
    this.facingDirection = 1 // 1 for right, -1 for left
    
    console.log('[AnimatedPlayer] Created player at', x, y)
  }
  
  update(deltaTime, input) {
    this.animationTime += deltaTime
    
    // Handle input and state transitions
    if (input) {
      if (input.left || input.right) {
        this.currentState = 'running'
        this.facingDirection = input.right ? 1 : -1
        
        const moveSpeed = this.speed * (deltaTime / 1000)
        if (input.left) this.x -= moveSpeed
        if (input.right) this.x += moveSpeed
      } else {
        this.currentState = 'idle'
      }
    }
  }
  
  render(ctx, camera = null) {
    const offsetX = camera ? -camera.x : 0
    const offsetY = camera ? -camera.y : 0
    
    ctx.save()
    ctx.translate(this.x + offsetX, this.y + offsetY)
    
    // Simple placeholder rendering
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(-16, -32, 32, 64)
    
    // Health bar
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(-16, -40, 32, 4)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(-16, -40, (this.health / 100) * 32, 4)
    
    ctx.restore()
  }
  
  attack() {
    if (this.stamina >= 10) {
      this.currentState = 'attacking'
      this.stamina -= 10
      console.log('[AnimatedPlayer] Attack performed')
      return true
    }
    return false
  }
  
  block() {
    this.currentState = 'blocking'
    console.log('[AnimatedPlayer] Blocking')
  }
  
  roll() {
    if (this.stamina >= 20) {
      this.currentState = 'rolling'
      this.stamina -= 20
      console.log('[AnimatedPlayer] Roll performed')
      return true
    }
    return false
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
    console.log('[AnimatedPlayer] Took damage:', amount, 'Health:', this.health)
  }
  
  static createInputFromKeys(keys) {
    return {
      left: keys.ArrowLeft || keys.KeyA,
      right: keys.ArrowRight || keys.KeyD,
      up: keys.ArrowUp || keys.KeyW,
      down: keys.ArrowDown || keys.KeyS,
      attack: keys.Space,
      block: keys.ShiftLeft,
      roll: keys.Space
    }
  }
}

export default AnimatedPlayer