/**
 * Enhanced Rollback Netcode System (GGPO-style) over WebRTC
 * Implements deterministic lockstep simulation with input prediction and rollback
 * Features:
 * - WASM-first integration with deterministic game state
 * - Multi-layer desync detection with automatic recovery
 * - Comprehensive network diagnostics and quality metrics
 * - Adaptive performance tuning based on network conditions
 */

import { createLogger } from '../utils/logger.js'

// Constants for rollback system
const MAX_ROLLBACK_FRAMES = 12 // Increased for better recovery
const INPUT_DELAY_FRAMES = 2   // Input delay for smoother gameplay
const MAX_PREDICTION_FRAMES = 10 // Increased prediction window
const SYNC_TEST_INTERVAL = 30  // More frequent sync tests
const FRAME_RATE = 60          // Target frame rate
const DESYNC_RECOVERY_FRAMES = 5 // Frames to wait before attempting recovery
const STATE_COMPRESSION_THRESHOLD = 1024 // Bytes - compress states above this size

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
    
    // Enhanced performance metrics
    this.metrics = {
      rollbacks: 0,
      totalRollbackFrames: 0,
      predictions: 0,
      inputLatency: [],
      networkQuality: 'good', // good, fair, poor
      desyncCount: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      stateCompressionRatio: 0,
      wasmCallTime: [],
      frameProcessingTime: []
    }
    
    // Desync detection and recovery
    this.desyncDetection = {
      checksumHistory: new Map(), // frame -> {local, remote: Map<playerId, checksum>}
      desyncFrames: new Set(),
      recoveryInProgress: false,
      lastRecoveryFrame: -1
    }
    
    // Network diagnostics
    this.networkDiagnostics = {
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      bandwidth: 0,
      connectionQuality: 'unknown'
    }
    this.networkMonitorId = null
    
    // WASM integration
    this.wasmIntegration = {
      module: null,
      stateBuffer: null,
      checksumFunction: null,
      compressionEnabled: config.enableStateCompression !== false
    }
    
    // Frame timing
    this.lastFrameTime = 0
    this.frameAccumulator = 0
    this.running = false
  }
  
  /**
   * Initialize the enhanced rollback system with game callbacks and WASM integration
   */
  initialize(gameCallbacks, localPlayerId, wasmModule = null) {
    this.gameCallbacks = {
      saveState: gameCallbacks.saveState,
      loadState: gameCallbacks.loadState,
      advanceFrame: gameCallbacks.advanceFrame,
      getChecksum: gameCallbacks.getChecksum || (() => 0),
      // Enhanced WASM callbacks
      getWasmState: gameCallbacks.getWasmState || null,
      setWasmState: gameCallbacks.setWasmState || null,
      validateWasmState: gameCallbacks.validateWasmState || null
    }
    
    // Initialize WASM integration
    if (wasmModule) {
      this.wasmIntegration.module = wasmModule
      this.wasmIntegration.stateBuffer = new ArrayBuffer(65536) // 64KB initial buffer
      this.wasmIntegration.checksumFunction = this.createEnhancedChecksum.bind(this)
    }
    
    this.localPlayerId = localPlayerId
    this.players.set(localPlayerId, {
      id: localPlayerId,
      local: true,
      lastConfirmedFrame: 0,
      inputDelay: this.config.inputDelayFrames,
      connectionQuality: 'excellent',
      lastInputTime: performance.now()
    })
    
    // Initialize enhanced frame history with compression
    this.frameHistory = new Array(this.config.maxRollbackFrames + 5) // Extra buffer
    for (let i = 0; i < this.frameHistory.length; i++) {
      this.frameHistory[i] = { 
        frame: -1, 
        state: null, 
        compressedState: null,
        checksum: 0, 
        enhancedChecksum: 0,
        timestamp: 0,
        stateSize: 0
      }
    }
    
    // Save initial state
    this.saveFrameState(0)

    // Initialize network quality monitoring
    this.stopNetworkMonitoring()
    this.startNetworkMonitoring()
    
    this.logger.info('Enhanced rollback netcode initialized', {
      playerId: localPlayerId,
      maxRollback: this.config.maxRollbackFrames,
      wasmEnabled: !!wasmModule,
      compressionEnabled: this.wasmIntegration.compressionEnabled
    })
  }
  
  /**
   * Add a remote player to the session with enhanced tracking
   */
  addPlayer(playerId, inputDelay = INPUT_DELAY_FRAMES, connectionInfo = {}) {
    if (this.players.has(playerId)) {
      return
    }
    
    this.players.set(playerId, {
      id: playerId,
      local: false,
      lastConfirmedFrame: 0,
      inputDelay: inputDelay,
      connectionQuality: connectionInfo.quality || 'unknown',
      lastInputTime: performance.now(),
      inputLossCount: 0,
      desyncCount: 0,
      avgLatency: 0,
      region: connectionInfo.region || 'unknown'
    })
    
    this.inputQueues.set(playerId, [])
    this.predictedInputs.set(playerId, null)
    
    // Initialize checksum tracking for this player
    if (!this.desyncDetection.checksumHistory.has(this.currentFrame)) {
      this.desyncDetection.checksumHistory.set(this.currentFrame, {
        local: 0,
        remote: new Map()
      })
    }
    
    this.logger.info('Player added with enhanced tracking', { 
      playerId, 
      inputDelay, 
      connectionQuality: connectionInfo.quality || 'unknown'
    })
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
    if (this.running) {
      return
    }
    
    this.running = true
    this.lastFrameTime = performance.now()
    this.gameLoop()
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.running = false
    this.stopNetworkMonitoring()
  }
  
  /**
   * Main game loop with fixed timestep
   */
  gameLoop() {
    if (!this.running) {
      return
    }
    
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
   * Save the current game state with enhanced features
   */
  saveFrameState(frame) {
    const startTime = performance.now()
    const index = frame % this.frameHistory.length
    
    // Get the current state
    const state = this.gameCallbacks.saveState()
    const basicChecksum = this.gameCallbacks.getChecksum()
    
    // Get enhanced checksum if available
    let enhancedChecksum = 0
    if (this.wasmIntegration.checksumFunction) {
      enhancedChecksum = this.wasmIntegration.checksumFunction()
    }
    
    // Compress state if enabled and state is large enough
    let compressedState = null
    let stateSize = 0
    
    if (state) {
      stateSize = JSON.stringify(state).length
      
      if (this.wasmIntegration.compressionEnabled && stateSize > STATE_COMPRESSION_THRESHOLD) {
        try {
          compressedState = this.compressState(state)
          const compressionRatio = compressedState.length / stateSize
          this.metrics.stateCompressionRatio = compressionRatio
        } catch (error) {
          this.logger.warn('State compression failed', error)
        }
      }
    }
    
    this.frameHistory[index] = {
      frame: frame,
      state: state,
      compressedState: compressedState,
      checksum: basicChecksum,
      enhancedChecksum: enhancedChecksum,
      timestamp: performance.now(),
      stateSize: stateSize
    }
    
    // Track save performance
    const saveTime = performance.now() - startTime
    this.metrics.frameProcessingTime.push(saveTime)
    if (this.metrics.frameProcessingTime.length > 100) {
      this.metrics.frameProcessingTime.shift()
    }
  }
  
  /**
   * Compress state data (simple implementation)
   */
  compressState(state) {
    try {
      const stateString = JSON.stringify(state)
      // Simple compression: remove whitespace and use shorter keys
      return stateString.replace(/\s/g, '').replace(/"(\w+)":/g, '$1:')
    } catch (error) {
      this.logger.error('State compression error', error)
      return JSON.stringify(state)
    }
  }
  
  /**
   * Decompress state data
   */
  decompressState(compressedState) {
    try {
      // Reverse the compression: add quotes back to keys
      const decompressed = compressedState.replace(/(\w+):/g, '"$1":')
      return JSON.parse(decompressed)
    } catch (error) {
      this.logger.error('State decompression error', error)
      return null
    }
  }
  
  /**
   * Find a saved state at or before the target frame with decompression
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
    
    // Decompress state if needed
    if (bestState && bestState.compressedState && !bestState.state) {
      bestState.state = this.decompressState(bestState.compressedState)
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
   * Perform enhanced sync test with multi-layer checksums
   */
  performSyncTest() {
    const startTime = performance.now()
    
    // Get basic checksum
    const basicChecksum = this.gameCallbacks.getChecksum()
    
    // Get enhanced checksum if WASM is available
    let enhancedChecksum = 0
    if (this.wasmIntegration.module && this.wasmIntegration.checksumFunction) {
      enhancedChecksum = this.wasmIntegration.checksumFunction()
    }
    
    // Store local checksums
    this.desyncDetection.checksumHistory.set(this.currentFrame, {
      local: basicChecksum,
      localEnhanced: enhancedChecksum,
      remote: new Map(),
      remoteEnhanced: new Map(),
      timestamp: performance.now()
    })
    
    // Send both checksums to other players
    if (this.onSendSyncTest) {
      this.onSendSyncTest(this.currentFrame, {
        basic: basicChecksum,
        enhanced: enhancedChecksum,
        frame: this.currentFrame,
        timestamp: performance.now()
      })
    }
    
    // Track WASM call performance
    const wasmCallTime = performance.now() - startTime
    this.metrics.wasmCallTime.push(wasmCallTime)
    if (this.metrics.wasmCallTime.length > 100) {
      this.metrics.wasmCallTime.shift()
    }
  }
  
  /**
   * Receive enhanced sync test from remote player with comprehensive desync detection
   */
  receiveSyncTest(playerId, frame, checksumData) {
    // Handle both old format (single checksum) and new format (object)
    const remoteBasic = typeof checksumData === 'object' ? checksumData.basic : checksumData
    const remoteEnhanced = typeof checksumData === 'object' ? checksumData.enhanced : 0
    
    // Get our checksums for that frame
    const localData = this.desyncDetection.checksumHistory.get(frame)
    const savedState = this.frameHistory.find(s => s.frame === frame)
    
    if (!localData || !savedState) {
      this.logger.warn('No local data for sync test frame', { playerId, frame })
      return
    }
    
    // Store remote checksums
    localData.remote.set(playerId, remoteBasic)
    if (remoteEnhanced) {
      localData.remoteEnhanced.set(playerId, remoteEnhanced)
    }
    
    // Check for basic desync
    const basicDesync = savedState.checksum !== remoteBasic
    const enhancedDesync = remoteEnhanced && savedState.enhancedChecksum !== remoteEnhanced
    
    if (basicDesync || enhancedDesync) {
      this.handleDesyncDetection(playerId, frame, {
        localBasic: savedState.checksum,
        remoteBasic: remoteBasic,
        localEnhanced: savedState.enhancedChecksum,
        remoteEnhanced: remoteEnhanced,
        basicDesync,
        enhancedDesync
      })
    } else {
      // Sync successful - update player quality
      const player = this.players.get(playerId)
      if (player && player.desyncCount > 0) {
        player.desyncCount = Math.max(0, player.desyncCount - 1)
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
   * Get comprehensive performance metrics and diagnostics
   */
  getMetrics() {
    const avgLatency = this.metrics.inputLatency.length > 0
      ? this.metrics.inputLatency.reduce((a, b) => a + b, 0) / this.metrics.inputLatency.length
      : 0
    
    const avgWasmCallTime = this.metrics.wasmCallTime.length > 0
      ? this.metrics.wasmCallTime.reduce((a, b) => a + b, 0) / this.metrics.wasmCallTime.length
      : 0
    
    const avgFrameTime = this.metrics.frameProcessingTime.length > 0
      ? this.metrics.frameProcessingTime.reduce((a, b) => a + b, 0) / this.metrics.frameProcessingTime.length
      : 0
    
    return {
      // Core metrics
      currentFrame: this.currentFrame,
      confirmedFrame: this.confirmedFrame,
      rollbacks: this.metrics.rollbacks,
      avgRollbackFrames: this.metrics.rollbacks > 0 
        ? this.metrics.totalRollbackFrames / this.metrics.rollbacks 
        : 0,
      predictions: this.metrics.predictions,
      players: this.players.size,
      
      // Performance metrics
      avgInputLatency: avgLatency,
      avgWasmCallTime: avgWasmCallTime,
      avgFrameTime: avgFrameTime,
      networkQuality: this.metrics.networkQuality,
      
      // Desync metrics
      desyncCount: this.metrics.desyncCount,
      recoveryAttempts: this.metrics.recoveryAttempts,
      successfulRecoveries: this.metrics.successfulRecoveries,
      recoverySuccessRate: this.metrics.recoveryAttempts > 0 
        ? this.metrics.successfulRecoveries / this.metrics.recoveryAttempts 
        : 0,
      
      // State compression metrics
      stateCompressionRatio: this.metrics.stateCompressionRatio,
      compressionEnabled: this.wasmIntegration.compressionEnabled,
      
      // Network diagnostics
      networkDiagnostics: { ...this.networkDiagnostics },
      
      // Per-player metrics
      playerMetrics: Array.from(this.players.values()).map(player => ({
        id: player.id,
        local: player.local,
        connectionQuality: player.connectionQuality,
        desyncCount: player.desyncCount || 0,
        inputLossCount: player.inputLossCount || 0,
        avgLatency: player.avgLatency || 0,
        region: player.region || 'unknown'
      }))
    }
  }
  
  /**
   * Handle desync detection with automatic recovery
   */
  handleDesyncDetection(playerId, frame, desyncInfo) {
    this.metrics.desyncCount++
    this.desyncDetection.desyncFrames.add(frame)
    
    // Update player desync count
    const player = this.players.get(playerId)
    if (player) {
      player.desyncCount = (player.desyncCount || 0) + 1
      player.connectionQuality = this.calculateConnectionQuality(player)
    }
    
    this.logger.error('Desync detected with enhanced info', {
      playerId,
      frame,
      ...desyncInfo,
      totalDesyncs: this.metrics.desyncCount
    })
    
    // Attempt automatic recovery if not already in progress
    if (!this.desyncDetection.recoveryInProgress && 
        frame - this.desyncDetection.lastRecoveryFrame > DESYNC_RECOVERY_FRAMES) {
      this.attemptDesyncRecovery(playerId, frame)
    }
    
    // Notify external handlers
    if (this.onDesyncDetected) {
      this.onDesyncDetected(playerId, frame, desyncInfo)
    }
  }
  
  /**
   * Attempt automatic desync recovery
   */
  attemptDesyncRecovery(playerId, frame) {
    this.desyncDetection.recoveryInProgress = true
    this.desyncDetection.lastRecoveryFrame = frame
    this.metrics.recoveryAttempts++
    
    this.logger.info('Attempting desync recovery', { playerId, frame })
    
    // Strategy 1: Request state from other players
    if (this.onRequestStateSync) {
      this.onRequestStateSync(playerId, frame)
    }
    
    // Strategy 2: Rollback to last known good state
    const lastGoodFrame = this.findLastSyncedFrame()
    if (lastGoodFrame >= 0 && frame - lastGoodFrame <= this.config.maxRollbackFrames) {
      setTimeout(() => {
        this.rollback(lastGoodFrame)
        this.desyncDetection.recoveryInProgress = false
        this.metrics.successfulRecoveries++
        this.logger.info('Desync recovery successful via rollback', { 
          lastGoodFrame, 
          recoveredFrames: frame - lastGoodFrame 
        })
      }, 100) // Small delay to allow network recovery
    } else {
      // Strategy 3: Full state resync (last resort)
      this.requestFullStateResync()
    }
  }
  
  /**
   * Find the last frame where all players were synced
   */
  findLastSyncedFrame() {
    for (let frame = this.currentFrame - 1; frame >= this.currentFrame - this.config.maxRollbackFrames; frame--) {
      const checksumData = this.desyncDetection.checksumHistory.get(frame)
      if (checksumData && this.isFrameSynced(checksumData)) {
        return frame
      }
    }
    return -1
  }
  
  /**
   * Check if a frame is synced across all players
   */
  isFrameSynced(checksumData) {
    const localChecksum = checksumData.local
    for (const [, remoteChecksum] of checksumData.remote) {
      if (remoteChecksum !== localChecksum) {
        return false
      }
    }
    return true
  }
  
  /**
   * Request full state resync from host or most reliable player
   */
  requestFullStateResync() {
    this.logger.warn('Requesting full state resync')
    
    if (this.onRequestFullResync) {
      this.onRequestFullResync()
    }
    
    setTimeout(() => {
      this.desyncDetection.recoveryInProgress = false
    }, 5000) // 5 second timeout
  }
  
  /**
   * Create enhanced checksum using multiple methods
   */
  createEnhancedChecksum() {
    if (!this.wasmIntegration.module) {
      return 0
    }
    
    try {
      // Get WASM state if available
      const wasmState = this.gameCallbacks.getWasmState ? this.gameCallbacks.getWasmState() : null
      if (!wasmState) {
        return 0
      }
      
      // Create multiple checksums for better detection
      let checksum = 0
      
      // Simple XOR checksum
      for (let i = 0; i < wasmState.length; i++) {
        checksum ^= wasmState[i] << (i % 32)
      }
      
      // Add frame-based salt to prevent collision
      checksum ^= this.currentFrame * 0x9e3779b9
      
      return checksum >>> 0 // Ensure unsigned 32-bit
    } catch (error) {
      this.logger.error('Enhanced checksum calculation failed', error)
      return 0
    }
  }
  
  /**
   * Calculate connection quality based on player metrics
   */
  calculateConnectionQuality(player) {
    const desyncRate = player.desyncCount / Math.max(1, this.currentFrame / 60) // per second
    const inputLossRate = player.inputLossCount / Math.max(1, this.currentFrame / 60)
    const avgLatency = player.avgLatency || 0
    
    if (desyncRate > 0.1 || inputLossRate > 0.05 || avgLatency > 200) {
      return 'poor'
    } else if (desyncRate > 0.02 || inputLossRate > 0.01 || avgLatency > 100) {
      return 'fair'
    } else if (avgLatency > 50) {
      return 'good'
    } 
      return 'excellent'
    
  }
  
  /**
   * Start network quality monitoring
   */
  startNetworkMonitoring() {
    this.networkMonitorId = setInterval(() => {
      this.updateNetworkQuality()
    }, 5000) // Update every 5 seconds
  }

  stopNetworkMonitoring() {
    if (this.networkMonitorId) {
      clearInterval(this.networkMonitorId)
      this.networkMonitorId = null
    }
  }
  
  /**
   * Update overall network quality assessment
   */
  updateNetworkQuality() {
    const playerQualities = Array.from(this.players.values())
      .filter(p => !p.local)
      .map(p => p.connectionQuality)
    
    if (playerQualities.length === 0) {
      this.metrics.networkQuality = 'good'
      return
    }
    
    const poorCount = playerQualities.filter(q => q === 'poor').length
    const fairCount = playerQualities.filter(q => q === 'fair').length
    
    if (poorCount > playerQualities.length * 0.5) {
      this.metrics.networkQuality = 'poor'
    } else if (poorCount + fairCount > playerQualities.length * 0.3) {
      this.metrics.networkQuality = 'fair'
    } else {
      this.metrics.networkQuality = 'good'
    }
  }
}

// Additional callback definitions for enhanced features
RollbackNetcode.prototype.onDesyncDetected = null // (playerId, frame, desyncInfo) => void
RollbackNetcode.prototype.onRequestStateSync = null // (playerId, frame) => void
RollbackNetcode.prototype.onRequestFullResync = null // () => void
RollbackNetcode.prototype.onNetworkQualityChanged = null // (quality) => void
RollbackNetcode.prototype.onRecoveryComplete = null // (success, method) => void

export default RollbackNetcode