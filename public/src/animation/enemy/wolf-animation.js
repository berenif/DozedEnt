/**
 * Wolf Animation Module
 * Handles animation system for wolf enemies
 */

export class WolfCharacter {
  constructor(x = 0, y = 0, config = {}) {
    this.x = x
    this.y = y
    this.role = config.role || 'Beta'
    this.intelligence = config.intelligence || 0.5
    this.aggression = config.aggression || 0.5
    
    this.health = 50
    this.speed = 150
    this.attackRange = 50
    this.detectionRange = 300
    
    this.currentState = 'idle'
    this.animationTime = 0
    this.targetX = x
    this.targetY = y
    this.mood = 'neutral'
    
    console.log(`[WolfCharacter] Created ${this.role} wolf at`, x, y)
  }
  
  update(deltaTime, player, obstacles = []) {
    this.animationTime += deltaTime
    
    // Simple AI behavior
    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < this.detectionRange) {
      if (distance < this.attackRange) {
        this.currentState = 'attacking'
        this.mood = 'aggressive'
      } else {
        this.currentState = 'running'
        this.mood = 'hunting'
        
        // Move towards player
        const moveSpeed = this.speed * (deltaTime / 1000)
        const angle = Math.atan2(dy, dx)
        this.x += Math.cos(angle) * moveSpeed
        this.y += Math.sin(angle) * moveSpeed
      }
    } else {
      this.currentState = 'idle'
      this.mood = 'neutral'
    }
  }
  
  render(ctx, camera = null) {
    const offsetX = camera ? -camera.x : 0
    const offsetY = camera ? -camera.y : 0
    
    ctx.save()
    ctx.translate(this.x + offsetX, this.y + offsetY)
    
    // Simple placeholder rendering - wolf
    ctx.fillStyle = this.mood === 'aggressive' ? '#ff0000' : '#808080'
    ctx.fillRect(-20, -16, 40, 32)
    
    // Head
    ctx.fillStyle = '#606060'
    ctx.fillRect(20, -12, 16, 24)
    
    // Health bar
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(-20, -24, 40, 4)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(-20, -24, (this.health / 50) * 40, 4)
    
    ctx.restore()
  }
  
  setMood(mood) {
    this.mood = mood
    console.log(`[WolfCharacter] ${this.role} mood set to:`, mood)
  }
  
  attack(target) {
    if (this.currentState === 'attacking') {
      const damage = 10 + Math.floor(Math.random() * 5)
      console.log(`[WolfCharacter] ${this.role} attacks for ${damage} damage`)
      return damage
    }
    return 0
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
    console.log(`[WolfCharacter] ${this.role} took damage:`, amount, 'Health:', this.health)
    
    if (this.health === 0) {
      this.currentState = 'dead'
    }
  }
  
  isDead() {
    return this.health <= 0
  }
}

export class WolfAnimationSystem {
  constructor() {
    this.wolves = []
    console.log('[WolfAnimationSystem] Initialized')
  }
  
  addWolf(wolf) {
    this.wolves.push(wolf)
  }
  
  removeWolf(wolf) {
    const index = this.wolves.indexOf(wolf)
    if (index > -1) {
      this.wolves.splice(index, 1)
    }
  }
  
  update(deltaTime, player, obstacles = []) {
    this.wolves.forEach(wolf => {
      if (!wolf.isDead()) {
        wolf.update(deltaTime, player, obstacles)
      }
    })
  }
  
  render(ctx, camera = null) {
    this.wolves.forEach(wolf => {
      if (!wolf.isDead()) {
        wolf.render(ctx, camera)
      }
    })
  }
}

export default WolfAnimationSystem