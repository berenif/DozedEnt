/**
 * Rollback Netcode System (GGPO-style) over WebRTC
 * Implements deterministic lockstep simulation with input prediction and rollback
 */

import { createLogger } from './logger.js'

// Constants for rollback system
const MAX_ROLLBACK_FRAMES = 8  // Maximum frames we can roll back
const INPUT_DELAY_FRAMES = 2   // Input delay for smoother gameplay
const MAX_PREDICTION_FRAMES = 8 // Maximum frames we can predict ahead
const SYNC_TEST_INTERVAL = 60  // Frames between sync tests
const FRAME_RATE = 60          // Target frame rate

class RollbackNetcode {
  constructor(config = {}) {
    this.config = {
      maxRollbackFrames: config.maxRollbackFrames || MAX_ROLLBACK_FRAMES,
      inputDelayFrames: config.inputDelayFrames || INPUT_DELAY_FRAMES,
      maxPredictionFrames: config.maxPredictionFrames || MAX_PREDICTION_FRAMES,
      syncTestInterval: config.syncTestInterval || SYNC_TEST_INTERVAL,
      frameRate: config.frameRate || FRAME_RATE,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Frame management
    this.currentFrame = 0
    this.confirmedFrame = 0 // Last frame with all inputs confirmed
    this.frameHistory = [] // Circular buffer of game states
    this.inputHistory = new Map() // frame -> { playerId -> input }
    this.predictedInputs = new Map() // playerId -> last known input
    
    // Player management
    this.localPlayerId = null
    this.players = new Map() // playerId -> player info
    this.inputQueues = new Map() // playerId -> input queue
    
    // Game simulation
    this.gameState = null
    this.gameCallbacks = {
      saveState: null,      // () => state
      loadState: null,      // (state) => void
      advanceFrame: null,   // (inputs) => void
      getChecksum: null     // () => number (for sync testing)
    }
    
    // Network callbacks
    this.onSendInput = null // (frame, input) => void
    this.onSendSyncTest = null // (frame, checksum) => void
    
    // Performance metrics
    this.metrics = {
      rollbacks: 0,
      totalRollbackFrames: 0,
      predictions: 0,
      inputLatency: []
    }
    
    // Frame timing
    this.lastFrameTime = 0
    this.frameAccumulator = 0
    this.running = false
  }
  
  /**
   * Initialize the rollback system with game callbacks
   */
  initialize(gameCallbacks, localPlayerId) {
    this.gameCallbacks = {
      saveState: gameCallbacks.saveState,
      loadState: gameCallbacks.loadState,
      advanceFrame: gameCallbacks.advanceFrame,
      getChecksum: gameCallbacks.getChecksum || (() => 0)
    }
    
    this.localPlayerId = localPlayerId
    this.players.set(localPlayerId, {
      id: localPlayerId,
      local: true,
      lastConfirmedFrame: 0,
      inputDelay: this.config.inputDelayFrames
    })
    
    // Initialize frame history
    this.frameHistory = new Array(this.config.maxRollbackFrames + 1)
    for (let i = 0; i < this.frameHistory.length; i++) {
      this.frameHistory[i] = { frame: -1, state: null, checksum: 0 }
    }
    
    // Save initial state
    this.saveFrameState(0)
    
    this.logger.info('Rollback netcode initialized', {
      playerId: localPlayerId,
      maxRollback: this.config.maxRollbackFrames
    })
  }
  
  /**
   * Add a remote player to the session
   */
  addPlayer(playerId, inputDelay = INPUT_DELAY_FRAMES) {
    if (this.players.has(playerId)) {return}
    
    this.players.set(playerId, {
      id: playerId,
      local: false,
      lastConfirmedFrame: 0,
      inputDelay: inputDelay
    })
    
    this.inputQueues.set(playerId, [])
    this.predictedInputs.set(playerId, null)
    
    this.logger.info('Player added', { playerId, inputDelay })
  }
  
  /**
   * Remove a player from the session
   */
  removePlayer(playerId) {
    this.players.delete(playerId)
    this.inputQueues.delete(playerId)
    this.predictedInputs.delete(playerId)
    
    this.logger.info('Player removed', { playerId })
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (this.running) {return}
    
    this.running = true
    this.lastFrameTime = performance.now()
    this.gameLoop()
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.running = false
  }
  
  /**
   * Main game loop with fixed timestep
   */
  gameLoop() {
    if (!this.running) {return}
    
    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
    this.lastFrameTime = now
    
    // Accumulate time for fixed timestep
    this.frameAccumulator += deltaTime
    const frameTime = 1000 / this.config.frameRate
    
    while (this.frameAccumulator >= frameTime) {
      this.frameAccumulator -= frameTime
      this.tick()
    }
    
    requestAnimationFrame(() => this.gameLoop())
  }
  
  /**
   * Process one frame
   */
  tick() {
    // Advance the frame
    this.currentFrame++
    
    // Process received inputs
    this.processReceivedInputs()
    
    // Get local input for this frame
    const localInput = this.getLocalInput()
    if (localInput !== null) {
      const targetFrame = this.currentFrame + this.config.inputDelayFrames
      this.addInput(this.localPlayerId, targetFrame, localInput)
      
      // Send input to other players
      if (this.onSendInput) {
        this.onSendInput(targetFrame, localInput)
      }
    }
    
    // Check if we need to rollback
    const rollbackFrame = this.checkForRollback()
    if (rollbackFrame >= 0) {
      this.rollback(rollbackFrame)
    }
    
    // Advance simulation
    this.simulateFrame(this.currentFrame)
    
    // Periodic sync test
    if (this.currentFrame % this.config.syncTestInterval === 0) {
      this.performSyncTest()
    }
    
    // Clean up old history
    this.cleanupHistory()
  }
  
  /**
   * Get local player input (to be implemented by game)
   */
  getLocalInput() {
    // This should be overridden by the game
    return null
  }
  
  /**
   * Add input for a player at a specific frame
   */
  addInput(playerId, frame, input) {
    if (!this.inputHistory.has(frame)) {
      this.inputHistory.set(frame, new Map())
    }
    
    this.inputHistory.get(frame).set(playerId, input)
    
    // Update last known input for prediction
    this.predictedInputs.set(playerId, input)
    
    // Update player's last confirmed frame
    const player = this.players.get(playerId)
    if (player) {
      player.lastConfirmedFrame = Math.max(player.lastConfirmedFrame, frame)
    }
  }
  
  /**
   * Receive input from remote player
   */
  receiveRemoteInput(playerId, frame, input) {
    // Ignore inputs that are too old
    if (frame < this.currentFrame - this.config.maxRollbackFrames) {
      this.logger.warn('Received input too old to process', { playerId, frame, currentFrame: this.currentFrame })
      return
    }
    
    // Queue the input
    if (!this.inputQueues.has(playerId)) {
      this.inputQueues.set(playerId, [])
    }
    
    this.inputQueues.get(playerId).push({ frame, input })
    
    // Track latency
    const latency = this.currentFrame - frame
    this.metrics.inputLatency.push(latency)
    if (this.metrics.inputLatency.length > 100) {
      this.metrics.inputLatency.shift()
    }
  }
  
  /**
   * Process all received inputs
   */
  processReceivedInputs() {
    for (const [playerId, queue] of this.inputQueues) {
      while (queue.length > 0) {
        const { frame, input } = queue[0]
        
        // Skip if too old
        if (frame < this.currentFrame - this.config.maxRollbackFrames) {
          queue.shift()
          continue
        }
        
        // Skip if in the future
        if (frame > this.currentFrame + this.config.maxPredictionFrames) {
          break
        }
        
        queue.shift()
        this.addInput(playerId, frame, input)
      }
    }
  }
  
  /**
   * Check if we need to rollback due to new inputs
   */
  checkForRollback() {
    let earliestChange = -1
    
    for (let frame = this.confirmedFrame + 1; frame <= this.currentFrame; frame++) {
      const frameInputs = this.inputHistory.get(frame) || new Map()
      
      for (const [playerId, player] of this.players) {
        if (player.local) {continue}
        
        // Check if we have actual input vs predicted
        const actualInput = frameInputs.get(playerId)
        const predictedInput = this.predictedInputs.get(playerId)
        
        if (actualInput && actualInput !== predictedInput) {
          if (earliestChange < 0 || frame < earliestChange) {
            earliestChange = frame
          }
        }
      }
    }
    
    return earliestChange
  }
  
  /**
   * Rollback to a specific frame and resimulate
   */
  rollback(targetFrame) {
    this.logger.debug('Rolling back', { from: this.currentFrame, to: targetFrame })
    
    // Update metrics
    this.metrics.rollbacks++
    this.metrics.totalRollbackFrames += this.currentFrame - targetFrame
    
    // Find and load the saved state
    const savedState = this.findSavedState(targetFrame)
    if (!savedState) {
      this.logger.error('No saved state found for rollback', { targetFrame })
      return
    }
    
    // Load the saved state
    this.gameCallbacks.loadState(savedState.state)
    
    // Resimulate from target frame to current frame
    for (let frame = targetFrame; frame <= this.currentFrame; frame++) {
      this.simulateFrame(frame)
    }
  }
  
  /**
   * Simulate a single frame
   */
  simulateFrame(frame) {
    // Gather inputs for all players
    const frameInputs = new Map()
    const inputData = this.inputHistory.get(frame) || new Map()
    
    for (const [playerId] of this.players) {
      let input = inputData.get(playerId)
      
      // Use prediction if no actual input
      if (!input) {
        input = this.predictedInputs.get(playerId) || null
        this.metrics.predictions++
      }
      
      if (input !== null) {
        frameInputs.set(playerId, input)
      }
    }
    
    // Advance the game simulation
    this.gameCallbacks.advanceFrame(frameInputs)
    
    // Save state periodically
    if (frame % 3 === 0) { // Save every 3 frames
      this.saveFrameState(frame)
    }
    
    // Update confirmed frame
    this.updateConfirmedFrame()
  }
  
  /**
   * Save the current game state
   */
  saveFrameState(frame) {
    const index = frame % this.frameHistory.length
    this.frameHistory[index] = {
      frame: frame,
      state: this.gameCallbacks.saveState(),
      checksum: this.gameCallbacks.getChecksum()
    }
  }
  
  /**
   * Find a saved state at or before the target frame
   */
  findSavedState(targetFrame) {
    let bestState = null
    let bestFrame = -1
    
    for (const saved of this.frameHistory) {
      if (saved.frame >= 0 && saved.frame <= targetFrame && saved.frame > bestFrame) {
        bestState = saved
        bestFrame = saved.frame
      }
    }
    
    return bestState
  }
  
  /**
   * Update the confirmed frame (all inputs received)
   */
  updateConfirmedFrame() {
    let minConfirmed = this.currentFrame
    
    for (const [, player] of this.players) {
      if (!player.local) {
        minConfirmed = Math.min(minConfirmed, player.lastConfirmedFrame)
      }
    }
    
    this.confirmedFrame = minConfirmed
  }
  
  /**
   * Perform sync test to detect desync
   */
  performSyncTest() {
    const checksum = this.gameCallbacks.getChecksum()
    
    if (this.onSendSyncTest) {
      this.onSendSyncTest(this.currentFrame, checksum)
    }
  }
  
  /**
   * Receive sync test from remote player
   */
  receiveSyncTest(playerId, frame, remoteChecksum) {
    // Find our checksum for that frame
    const savedState = this.frameHistory.find(s => s.frame === frame)
    
    if (savedState && savedState.checksum !== remoteChecksum) {
      this.logger.error('Desync detected!', {
        playerId,
        frame,
        localChecksum: savedState.checksum,
        remoteChecksum
      })
      
      // Could trigger resync or pause here
      if (this.onDesyncDetected) {
        this.onDesyncDetected(playerId, frame)
      }
    }
  }
  
  /**
   * Clean up old history entries
   */
  cleanupHistory() {
    const oldestAllowedFrame = this.currentFrame - this.config.maxRollbackFrames - 10
    
    // Clean up input history
    for (const [frame] of this.inputHistory) {
      if (frame < oldestAllowedFrame) {
        this.inputHistory.delete(frame)
      }
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.inputLatency.length > 0
      ? this.metrics.inputLatency.reduce((a, b) => a + b, 0) / this.metrics.inputLatency.length
      : 0
    
    return {
      currentFrame: this.currentFrame,
      confirmedFrame: this.confirmedFrame,
      rollbacks: this.metrics.rollbacks,
      avgRollbackFrames: this.metrics.rollbacks > 0 
        ? this.metrics.totalRollbackFrames / this.metrics.rollbacks 
        : 0,
      predictions: this.metrics.predictions,
      avgInputLatency: avgLatency,
      players: this.players.size
    }
  }
}

export default RollbackNetcode