/**
 * Deterministic Game Simulation Wrapper
 * Provides a deterministic game engine suitable for rollback netcode
 * Uses fixed-point math and deterministic random number generation
 */

import { createLogger } from './logger.js'

// Fixed-point math constants
const FIXED_POINT_SHIFT = 16
const FIXED_POINT_SCALE = 1 << FIXED_POINT_SHIFT

// Convert float to fixed-point
const toFixed = (n) => Math.floor(n * FIXED_POINT_SCALE)
const fromFixed = (n) => n / FIXED_POINT_SCALE

// Fixed-point operations
const fixedAdd = (a, b) => a + b
const fixedSub = (a, b) => a - b
const fixedMul = (a, b) => Math.floor((a * b) / FIXED_POINT_SCALE)
const fixedDiv = (a, b) => Math.floor((a * FIXED_POINT_SCALE) / b)

// Deterministic math functions
const fixedSqrt = (n) => {
  if (n < 0) return 0
  let x = n
  let y = (x + FIXED_POINT_SCALE) >> 1
  while (y < x) {
    x = y
    y = (x + fixedDiv(n, x)) >> 1
  }
  return x
}

const fixedSin = (angle) => {
  // Simple sine approximation using Taylor series
  const a = angle % (2 * Math.PI * FIXED_POINT_SCALE)
  const x = a / FIXED_POINT_SCALE
  const sin = Math.sin(x)
  return toFixed(sin)
}

const fixedCos = (angle) => {
  // Simple cosine approximation
  const a = angle % (2 * Math.PI * FIXED_POINT_SCALE)
  const x = a / FIXED_POINT_SCALE
  const cos = Math.cos(x)
  return toFixed(cos)
}

/**
 * Deterministic Random Number Generator (PRNG)
 * Uses Linear Congruential Generator (LCG)
 */
class DeterministicRandom {
  constructor(seed = 12345) {
    this.seed = seed
    this.current = seed
  }
  
  next() {
    // LCG parameters (from Numerical Recipes)
    const a = 1664525
    const c = 1013904223
    const m = 2 ** 32
    
    this.current = (a * this.current + c) % m
    return this.current
  }
  
  nextFloat() {
    return this.next() / (2 ** 32)
  }
  
  nextInt(min, max) {
    return min + (this.next() % (max - min))
  }
  
  reset(seed = null) {
    this.seed = seed !== null ? seed : this.seed
    this.current = this.seed
  }
  
  save() {
    return { seed: this.seed, current: this.current }
  }
  
  load(state) {
    this.seed = state.seed
    this.current = state.current
  }
}

/**
 * Deterministic Game Base Class
 * Provides framework for deterministic game simulation
 */
class DeterministicGame {
  constructor(config = {}) {
    this.config = {
      fixedTimestep: 1000 / 60, // 60 FPS in milliseconds
      maxEntities: config.maxEntities || 1000,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Game state
    this.frame = 0
    this.entities = new Map()
    this.players = new Map()
    this.random = new DeterministicRandom(config.seed || Date.now())
    
    // Entity ID counter
    this.nextEntityId = 1
    
    // Fixed-point position and velocity tracking
    this.positions = new Map() // entityId -> { x, y }
    this.velocities = new Map() // entityId -> { vx, vy }
  }
  
  /**
   * Initialize game with players
   */
  initialize(players) {
    this.frame = 0
    this.entities.clear()
    this.players.clear()
    this.positions.clear()
    this.velocities.clear()
    
    // Create player entities
    for (const playerId of players) {
      this.createPlayer(playerId)
    }
    
    // Initialize game-specific state
    this.onInitialize()
  }
  
  /**
   * Create a player entity
   */
  createPlayer(playerId) {
    const entityId = this.nextEntityId++
    
    const player = {
      id: playerId,
      entityId: entityId,
      score: 0,
      lives: 3,
      input: {
        left: false,
        right: false,
        up: false,
        down: false,
        action: false
      }
    }
    
    this.players.set(playerId, player)
    
    // Create player entity with deterministic starting position
    const startX = toFixed(100 + (this.players.size - 1) * 100)
    const startY = toFixed(300)
    
    this.createEntity(entityId, 'player', {
      playerId: playerId,
      health: 100,
      radius: toFixed(16)
    })
    
    this.positions.set(entityId, { x: startX, y: startY })
    this.velocities.set(entityId, { vx: 0, vy: 0 })
  }
  
  /**
   * Create an entity
   */
  createEntity(id, type, data = {}) {
    const entity = {
      id: id || this.nextEntityId++,
      type: type,
      alive: true,
      ...data
    }
    
    this.entities.set(entity.id, entity)
    
    if (!this.positions.has(entity.id)) {
      this.positions.set(entity.id, { x: 0, y: 0 })
    }
    
    if (!this.velocities.has(entity.id)) {
      this.velocities.set(entity.id, { vx: 0, vy: 0 })
    }
    
    return entity
  }
  
  /**
   * Destroy an entity
   */
  destroyEntity(entityId) {
    this.entities.delete(entityId)
    this.positions.delete(entityId)
    this.velocities.delete(entityId)
  }
  
  /**
   * Advance game simulation by one frame
   */
  advanceFrame(inputs) {
    this.frame++
    
    // Update player inputs
    for (const [playerId, input] of inputs) {
      const player = this.players.get(playerId)
      if (player) {
        player.input = input
      }
    }
    
    // Process game logic in deterministic order
    this.processInput()
    this.updatePhysics()
    this.checkCollisions()
    this.updateGameLogic()
    
    // Clean up dead entities
    for (const [id, entity] of this.entities) {
      if (!entity.alive) {
        this.destroyEntity(id)
      }
    }
  }
  
  /**
   * Process player inputs
   */
  processInput() {
    for (const [playerId, player] of this.players) {
      const entity = this.entities.get(player.entityId)
      if (!entity || !entity.alive) continue
      
      const vel = this.velocities.get(player.entityId)
      if (!vel) continue
      
      // Apply input to velocity (using fixed-point math)
      const speed = toFixed(5)
      
      vel.vx = 0
      vel.vy = 0
      
      if (player.input.left) vel.vx = -speed
      if (player.input.right) vel.vx = speed
      if (player.input.up) vel.vy = -speed
      if (player.input.down) vel.vy = speed
      
      // Normalize diagonal movement
      if (vel.vx !== 0 && vel.vy !== 0) {
        const mag = fixedSqrt(fixedMul(vel.vx, vel.vx) + fixedMul(vel.vy, vel.vy))
        if (mag > 0) {
          vel.vx = fixedDiv(fixedMul(vel.vx, speed), mag)
          vel.vy = fixedDiv(fixedMul(vel.vy, speed), mag)
        }
      }
      
      // Handle action input
      if (player.input.action) {
        this.onPlayerAction(playerId, player)
      }
    }
  }
  
  /**
   * Update physics simulation
   */
  updatePhysics() {
    const dt = toFixed(1) // One frame timestep
    
    for (const [entityId, pos] of this.positions) {
      const vel = this.velocities.get(entityId)
      if (!vel) continue
      
      // Update position using velocity
      pos.x = fixedAdd(pos.x, fixedMul(vel.vx, dt))
      pos.y = fixedAdd(pos.y, fixedMul(vel.vy, dt))
      
      // Apply friction
      const friction = toFixed(0.9)
      vel.vx = fixedMul(vel.vx, friction)
      vel.vy = fixedMul(vel.vy, friction)
      
      // Clamp to world bounds
      const minX = toFixed(0)
      const maxX = toFixed(1280)
      const minY = toFixed(0)
      const maxY = toFixed(720)
      
      if (pos.x < minX) {
        pos.x = minX
        vel.vx = 0
      }
      if (pos.x > maxX) {
        pos.x = maxX
        vel.vx = 0
      }
      if (pos.y < minY) {
        pos.y = minY
        vel.vy = 0
      }
      if (pos.y > maxY) {
        pos.y = maxY
        vel.vy = 0
      }
    }
  }
  
  /**
   * Check collisions between entities
   */
  checkCollisions() {
    const entities = Array.from(this.entities.values())
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i]
        const e2 = entities[j]
        
        if (!e1.alive || !e2.alive) continue
        
        const pos1 = this.positions.get(e1.id)
        const pos2 = this.positions.get(e2.id)
        
        if (!pos1 || !pos2) continue
        
        // Calculate distance using fixed-point math
        const dx = fixedSub(pos2.x, pos1.x)
        const dy = fixedSub(pos2.y, pos1.y)
        const distSq = fixedAdd(fixedMul(dx, dx), fixedMul(dy, dy))
        
        // Check collision based on entity radii
        const r1 = e1.radius || toFixed(16)
        const r2 = e2.radius || toFixed(16)
        const minDist = fixedAdd(r1, r2)
        const minDistSq = fixedMul(minDist, minDist)
        
        if (distSq < minDistSq) {
          this.onCollision(e1, e2)
        }
      }
    }
  }
  
  /**
   * Save game state
   */
  saveState() {
    const state = {
      frame: this.frame,
      nextEntityId: this.nextEntityId,
      random: this.random.save(),
      entities: [],
      players: [],
      positions: [],
      velocities: []
    }
    
    // Save entities
    for (const [id, entity] of this.entities) {
      state.entities.push({ ...entity })
    }
    
    // Save players
    for (const [id, player] of this.players) {
      state.players.push({ id, ...player })
    }
    
    // Save positions
    for (const [id, pos] of this.positions) {
      state.positions.push({ id, ...pos })
    }
    
    // Save velocities
    for (const [id, vel] of this.velocities) {
      state.velocities.push({ id, ...vel })
    }
    
    // Save game-specific state
    const gameState = this.onSaveState()
    if (gameState) {
      state.gameSpecific = gameState
    }
    
    return state
  }
  
  /**
   * Load game state
   */
  loadState(state) {
    this.frame = state.frame
    this.nextEntityId = state.nextEntityId
    this.random.load(state.random)
    
    // Clear current state
    this.entities.clear()
    this.players.clear()
    this.positions.clear()
    this.velocities.clear()
    
    // Load entities
    for (const entity of state.entities) {
      this.entities.set(entity.id, { ...entity })
    }
    
    // Load players
    for (const player of state.players) {
      this.players.set(player.id, { ...player })
    }
    
    // Load positions
    for (const pos of state.positions) {
      this.positions.set(pos.id, { x: pos.x, y: pos.y })
    }
    
    // Load velocities
    for (const vel of state.velocities) {
      this.velocities.set(vel.id, { vx: vel.vx, vy: vel.vy })
    }
    
    // Load game-specific state
    if (state.gameSpecific) {
      this.onLoadState(state.gameSpecific)
    }
  }
  
  /**
   * Calculate checksum for sync testing
   */
  getChecksum() {
    let checksum = 0
    
    // Include frame number
    checksum ^= this.frame
    
    // Include entity positions (in deterministic order)
    const sortedIds = Array.from(this.positions.keys()).sort((a, b) => a - b)
    for (const id of sortedIds) {
      const pos = this.positions.get(id)
      checksum ^= pos.x
      checksum ^= pos.y << 16
    }
    
    // Include player scores
    for (const [id, player] of this.players) {
      checksum ^= player.score
    }
    
    // Include game-specific checksum
    const gameChecksum = this.onGetChecksum()
    if (gameChecksum) {
      checksum ^= gameChecksum
    }
    
    return checksum >>> 0 // Ensure unsigned 32-bit integer
  }
  
  /**
   * Get current game state for rendering
   */
  getRenderState() {
    const renderState = {
      frame: this.frame,
      entities: [],
      players: []
    }
    
    // Convert fixed-point positions to floats for rendering
    for (const [id, entity] of this.entities) {
      const pos = this.positions.get(id)
      if (pos) {
        renderState.entities.push({
          ...entity,
          x: fromFixed(pos.x),
          y: fromFixed(pos.y)
        })
      }
    }
    
    // Include player info
    for (const [id, player] of this.players) {
      renderState.players.push({
        id: id,
        score: player.score,
        lives: player.lives
      })
    }
    
    return renderState
  }
  
  // Override these methods in game implementation
  onInitialize() {}
  onPlayerAction(playerId, player) {}
  onCollision(entity1, entity2) {}
  updateGameLogic() {}
  onSaveState() { return {} }
  onLoadState(state) {}
  onGetChecksum() { return 0 }
}

// Export utilities and base class
export {
  DeterministicGame,
  DeterministicRandom,
  toFixed,
  fromFixed,
  fixedAdd,
  fixedSub,
  fixedMul,
  fixedDiv,
  fixedSqrt,
  fixedSin,
  fixedCos
}