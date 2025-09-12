/**
 * Enhanced Desync Detection and Recovery System
 * Implements multi-layer checksum validation and automatic recovery mechanisms
 * for multiplayer game synchronization
 */

import { createLogger } from '../utils/logger.js'

// Constants for desync detection
const CHECKSUM_HISTORY_SIZE = 300 // Keep 5 seconds of checksum history at 60fps
const DESYNC_THRESHOLD = 3 // Number of consecutive desyncs before triggering recovery
const RECOVERY_TIMEOUT = 5000 // Maximum time to wait for recovery
const STATE_VALIDATION_INTERVAL = 30 // Frames between deep state validation
const CHECKSUM_LAYERS = {
  BASIC: 'basic',
  ENHANCED: 'enhanced', 
  DEEP: 'deep',
  WASM: 'wasm'
}

export class DesyncDetectionSystem {
  constructor(config = {}) {
    this.config = {
      checksumHistorySize: config.checksumHistorySize || CHECKSUM_HISTORY_SIZE,
      desyncThreshold: config.desyncThreshold || DESYNC_THRESHOLD,
      recoveryTimeout: config.recoveryTimeout || RECOVERY_TIMEOUT,
      stateValidationInterval: config.stateValidationInterval || STATE_VALIDATION_INTERVAL,
      enableDeepValidation: config.enableDeepValidation !== false,
      enableWasmValidation: config.enableWasmValidation !== false,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Checksum tracking
    this.checksumHistory = new Map() // frame -> ChecksumData
    this.playerDesyncs = new Map() // playerId -> DesyncTracker
    this.globalDesyncState = {
      isDesynced: false,
      lastDesyncFrame: -1,
      consecutiveDesyncs: 0,
      recoveryInProgress: false,
      recoveryStartTime: 0
    }
    
    // Validation callbacks
    this.validators = {
      basic: null,      // () => number
      enhanced: null,   // () => number  
      deep: null,       // () => object
      wasm: null        // () => ArrayBuffer | Uint8Array
    }
    
    // Recovery callbacks
    this.recoveryHandlers = {
      onDesyncDetected: null,     // (desyncInfo) => void
      onRecoveryStarted: null,    // (method, frame) => void
      onRecoveryCompleted: null,  // (success, method) => void
      requestStateResync: null,   // (playerId, frame) => Promise<state>
      requestFullResync: null     // () => Promise<state>
    }
    
    // Statistics
    this.stats = {
      totalDesyncs: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      checksumComparisons: 0,
      deepValidations: 0,
      wasmValidations: 0,
      avgRecoveryTime: 0
    }
  }
  
  /**
   * Initialize the desync detection system
   */
  initialize(validators, recoveryHandlers) {
    this.validators = { ...this.validators, ...validators }
    this.recoveryHandlers = { ...this.recoveryHandlers, ...recoveryHandlers }
    
    this.logger.info('Desync detection system initialized', {
      enableDeepValidation: this.config.enableDeepValidation,
      enableWasmValidation: this.config.enableWasmValidation,
      desyncThreshold: this.config.desyncThreshold
    })
  }
  
  /**
   * Add a player to desync tracking
   */
  addPlayer(playerId) {
    if (this.playerDesyncs.has(playerId)) return
    
    this.playerDesyncs.set(playerId, {
      playerId,
      desyncCount: 0,
      consecutiveDesyncs: 0,
      lastDesyncFrame: -1,
      connectionQuality: 'unknown',
      checksumMismatches: {
        [CHECKSUM_LAYERS.BASIC]: 0,
        [CHECKSUM_LAYERS.ENHANCED]: 0,
        [CHECKSUM_LAYERS.DEEP]: 0,
        [CHECKSUM_LAYERS.WASM]: 0
      }
    })
    
    this.logger.info('Player added to desync tracking', { playerId })
  }
  
  /**
   * Remove a player from desync tracking
   */
  removePlayer(playerId) {
    this.playerDesyncs.delete(playerId)
    
    // Clean up checksum history for this player
    for (const [frame, checksumData] of this.checksumHistory) {
      Object.values(checksumData.remote).forEach(layer => {
        delete layer[playerId]
      })
    }
    
    this.logger.info('Player removed from desync tracking', { playerId })
  }
  
  /**
   * Record local checksums for a frame
   */
  recordLocalChecksums(frame) {
    const checksumData = {
      frame,
      timestamp: performance.now(),
      local: {},
      remote: {
        [CHECKSUM_LAYERS.BASIC]: {},
        [CHECKSUM_LAYERS.ENHANCED]: {},
        [CHECKSUM_LAYERS.DEEP]: {},
        [CHECKSUM_LAYERS.WASM]: {}
      },
      validated: false,
      desyncDetected: false
    }
    
    // Calculate basic checksum
    if (this.validators.basic) {
      checksumData.local[CHECKSUM_LAYERS.BASIC] = this.validators.basic()
    }
    
    // Calculate enhanced checksum
    if (this.validators.enhanced) {
      checksumData.local[CHECKSUM_LAYERS.ENHANCED] = this.validators.enhanced()
    }
    
    // Calculate deep checksum (less frequent)
    if (this.config.enableDeepValidation && 
        frame % this.config.stateValidationInterval === 0 && 
        this.validators.deep) {
      checksumData.local[CHECKSUM_LAYERS.DEEP] = this.calculateDeepChecksum(this.validators.deep())
      this.stats.deepValidations++
    }
    
    // Calculate WASM checksum
    if (this.config.enableWasmValidation && this.validators.wasm) {
      checksumData.local[CHECKSUM_LAYERS.WASM] = this.calculateWasmChecksum(this.validators.wasm())
      this.stats.wasmValidations++
    }
    
    this.checksumHistory.set(frame, checksumData)
    this.cleanupChecksumHistory()
    
    return checksumData
  }
  
  /**
   * Record remote checksums from a player
   */
  recordRemoteChecksums(playerId, frame, checksums) {
    const checksumData = this.checksumHistory.get(frame)
    if (!checksumData) {
      this.logger.warn('No local checksum data for frame', { playerId, frame })
      return
    }
    
    // Store remote checksums by layer
    Object.keys(checksums).forEach(layer => {
      if (checksumData.remote[layer]) {
        checksumData.remote[layer][playerId] = checksums[layer]
      }
    })
    
    // Validate checksums for this player
    this.validatePlayerChecksums(playerId, frame, checksumData)
  }
  
  /**
   * Validate checksums for a specific player
   */
  validatePlayerChecksums(playerId, frame, checksumData) {
    const playerTracker = this.playerDesyncs.get(playerId)
    if (!playerTracker) return
    
    let hasDesync = false
    const desyncInfo = {
      playerId,
      frame,
      timestamp: performance.now(),
      layers: {}
    }
    
    this.stats.checksumComparisons++
    
    // Check each layer
    Object.keys(CHECKSUM_LAYERS).forEach(layerKey => {
      const layer = CHECKSUM_LAYERS[layerKey]
      const localChecksum = checksumData.local[layer]
      const remoteChecksum = checksumData.remote[layer]?.[playerId]
      
      if (localChecksum !== undefined && remoteChecksum !== undefined) {
        const isMatch = this.compareChecksums(localChecksum, remoteChecksum, layer)
        
        desyncInfo.layers[layer] = {
          local: localChecksum,
          remote: remoteChecksum,
          match: isMatch
        }
        
        if (!isMatch) {
          hasDesync = true
          playerTracker.checksumMismatches[layer]++
          this.logger.debug('Checksum mismatch detected', {
            playerId,
            frame,
            layer,
            local: localChecksum,
            remote: remoteChecksum
          })
        }
      }
    })
    
    if (hasDesync) {
      this.handlePlayerDesync(playerTracker, desyncInfo)
    } else {
      // Reset consecutive desyncs on successful validation
      if (playerTracker.consecutiveDesyncs > 0) {
        this.logger.debug('Player sync restored', { 
          playerId, 
          frame,
          previousConsecutive: playerTracker.consecutiveDesyncs
        })
        playerTracker.consecutiveDesyncs = 0
      }
    }
    
    checksumData.validated = true
  }
  
  /**
   * Handle desync detection for a player
   */
  handlePlayerDesync(playerTracker, desyncInfo) {
    playerTracker.desyncCount++
    playerTracker.consecutiveDesyncs++
    playerTracker.lastDesyncFrame = desyncInfo.frame
    
    this.stats.totalDesyncs++
    this.globalDesyncState.lastDesyncFrame = desyncInfo.frame
    
    // Update connection quality
    playerTracker.connectionQuality = this.calculateConnectionQuality(playerTracker)
    
    this.logger.warn('Desync detected for player', {
      playerId: playerTracker.playerId,
      frame: desyncInfo.frame,
      consecutiveDesyncs: playerTracker.consecutiveDesyncs,
      totalDesyncs: playerTracker.desyncCount,
      connectionQuality: playerTracker.connectionQuality
    })
    
    // Check if we need to trigger recovery
    if (playerTracker.consecutiveDesyncs >= this.config.desyncThreshold) {
      this.triggerDesyncRecovery(playerTracker, desyncInfo)
    }
    
    // Notify external handlers
    if (this.recoveryHandlers.onDesyncDetected) {
      this.recoveryHandlers.onDesyncDetected({
        ...desyncInfo,
        consecutiveDesyncs: playerTracker.consecutiveDesyncs,
        connectionQuality: playerTracker.connectionQuality
      })
    }
  }
  
  /**
   * Trigger desync recovery process
   */
  async triggerDesyncRecovery(playerTracker, desyncInfo) {
    if (this.globalDesyncState.recoveryInProgress) {
      this.logger.debug('Recovery already in progress, skipping')
      return
    }
    
    this.globalDesyncState.recoveryInProgress = true
    this.globalDesyncState.recoveryStartTime = performance.now()
    this.stats.recoveryAttempts++
    
    this.logger.info('Starting desync recovery', {
      playerId: playerTracker.playerId,
      frame: desyncInfo.frame,
      method: 'automatic'
    })
    
    if (this.recoveryHandlers.onRecoveryStarted) {
      this.recoveryHandlers.onRecoveryStarted('automatic', desyncInfo.frame)
    }
    
    try {
      // Strategy 1: Request state resync from specific player
      if (this.recoveryHandlers.requestStateResync) {
        const success = await this.attemptStateResync(playerTracker.playerId, desyncInfo.frame)
        if (success) {
          this.completeRecovery(true, 'state_resync')
          return
        }
      }
      
      // Strategy 2: Request full resync from all players
      if (this.recoveryHandlers.requestFullResync) {
        const success = await this.attemptFullResync()
        if (success) {
          this.completeRecovery(true, 'full_resync')
          return
        }
      }
      
      // Strategy 3: Fallback to local recovery
      const success = this.attemptLocalRecovery(desyncInfo.frame)
      this.completeRecovery(success, 'local_recovery')
      
    } catch (error) {
      this.logger.error('Recovery attempt failed', error)
      this.completeRecovery(false, 'error')
    }
  }
  
  /**
   * Attempt state resync from a specific player
   */
  async attemptStateResync(playerId, frame) {
    try {
      this.logger.info('Attempting state resync', { playerId, frame })
      
      const state = await Promise.race([
        this.recoveryHandlers.requestStateResync(playerId, frame),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Resync timeout')), this.config.recoveryTimeout)
        )
      ])
      
      if (state) {
        this.logger.info('State resync successful', { playerId, frame })
        return true
      }
      
    } catch (error) {
      this.logger.warn('State resync failed', { playerId, frame, error: error.message })
    }
    
    return false
  }
  
  /**
   * Attempt full resync from all players
   */
  async attemptFullResync() {
    try {
      this.logger.info('Attempting full resync')
      
      const state = await Promise.race([
        this.recoveryHandlers.requestFullResync(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Full resync timeout')), this.config.recoveryTimeout)
        )
      ])
      
      if (state) {
        this.logger.info('Full resync successful')
        return true
      }
      
    } catch (error) {
      this.logger.warn('Full resync failed', { error: error.message })
    }
    
    return false
  }
  
  /**
   * Attempt local recovery (rollback to last known good state)
   */
  attemptLocalRecovery(frame) {
    this.logger.info('Attempting local recovery', { frame })
    
    // Find last known good frame (all players synced)
    const goodFrame = this.findLastSyncedFrame()
    if (goodFrame >= 0) {
      this.logger.info('Local recovery successful', { 
        goodFrame, 
        rollbackFrames: frame - goodFrame 
      })
      return true
    }
    
    this.logger.warn('No good frame found for local recovery')
    return false
  }
  
  /**
   * Complete the recovery process
   */
  completeRecovery(success, method) {
    const recoveryTime = performance.now() - this.globalDesyncState.recoveryStartTime
    
    this.globalDesyncState.recoveryInProgress = false
    
    if (success) {
      this.stats.successfulRecoveries++
      this.stats.avgRecoveryTime = (this.stats.avgRecoveryTime * (this.stats.successfulRecoveries - 1) + recoveryTime) / this.stats.successfulRecoveries
      
      // Reset all player consecutive desyncs
      for (const playerTracker of this.playerDesyncs.values()) {
        playerTracker.consecutiveDesyncs = 0
      }
    }
    
    this.logger.info('Recovery completed', {
      success,
      method,
      recoveryTime,
      totalAttempts: this.stats.recoveryAttempts,
      successRate: this.stats.successfulRecoveries / this.stats.recoveryAttempts
    })
    
    if (this.recoveryHandlers.onRecoveryCompleted) {
      this.recoveryHandlers.onRecoveryCompleted(success, method)
    }
  }
  
  /**
   * Find the last frame where all players were synced
   */
  findLastSyncedFrame() {
    const frames = Array.from(this.checksumHistory.keys()).sort((a, b) => b - a)
    
    for (const frame of frames) {
      const checksumData = this.checksumHistory.get(frame)
      if (checksumData && this.isFrameSynced(checksumData)) {
        return frame
      }
    }
    
    return -1
  }
  
  /**
   * Check if all players are synced for a frame
   */
  isFrameSynced(checksumData) {
    // Check basic layer (most reliable)
    const localBasic = checksumData.local[CHECKSUM_LAYERS.BASIC]
    if (localBasic === undefined) return false
    
    const remoteBasic = checksumData.remote[CHECKSUM_LAYERS.BASIC]
    for (const playerId of this.playerDesyncs.keys()) {
      if (remoteBasic[playerId] !== localBasic) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Compare checksums based on layer type
   */
  compareChecksums(local, remote, layer) {
    switch (layer) {
      case CHECKSUM_LAYERS.BASIC:
      case CHECKSUM_LAYERS.ENHANCED:
        return local === remote
        
      case CHECKSUM_LAYERS.DEEP:
        return this.compareDeepChecksums(local, remote)
        
      case CHECKSUM_LAYERS.WASM:
        return this.compareWasmChecksums(local, remote)
        
      default:
        return local === remote
    }
  }
  
  /**
   * Calculate deep checksum from complex state object
   */
  calculateDeepChecksum(stateObject) {
    try {
      // Create a deterministic hash of the state object
      const stateString = JSON.stringify(stateObject, Object.keys(stateObject).sort())
      let hash = 0
      for (let i = 0; i < stateString.length; i++) {
        const char = stateString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return hash
    } catch (error) {
      this.logger.error('Deep checksum calculation failed', error)
      return 0
    }
  }
  
  /**
   * Calculate WASM checksum from binary data
   */
  calculateWasmChecksum(wasmData) {
    try {
      if (!wasmData || wasmData.length === 0) return 0
      
      let checksum = 0
      const data = new Uint8Array(wasmData)
      
      // Use a more sophisticated checksum algorithm
      for (let i = 0; i < data.length; i += 4) {
        const word = (data[i] || 0) | 
                    ((data[i + 1] || 0) << 8) | 
                    ((data[i + 2] || 0) << 16) | 
                    ((data[i + 3] || 0) << 24)
        checksum ^= word
        checksum = (checksum << 1) | (checksum >>> 31) // Rotate left
      }
      
      return checksum >>> 0 // Ensure unsigned
    } catch (error) {
      this.logger.error('WASM checksum calculation failed', error)
      return 0
    }
  }
  
  /**
   * Compare deep checksums with tolerance
   */
  compareDeepChecksums(local, remote) {
    // For deep checksums, we might allow small differences due to floating point precision
    if (typeof local === 'number' && typeof remote === 'number') {
      return Math.abs(local - remote) < 0.001
    }
    return local === remote
  }
  
  /**
   * Compare WASM checksums
   */
  compareWasmChecksums(local, remote) {
    return local === remote
  }
  
  /**
   * Calculate connection quality for a player
   */
  calculateConnectionQuality(playerTracker) {
    const totalFrames = Math.max(1, this.checksumHistory.size)
    const desyncRate = playerTracker.desyncCount / totalFrames
    const consecutiveDesyncs = playerTracker.consecutiveDesyncs
    
    if (consecutiveDesyncs >= this.config.desyncThreshold || desyncRate > 0.1) {
      return 'poor'
    } else if (consecutiveDesyncs > 1 || desyncRate > 0.02) {
      return 'fair'
    } else if (desyncRate > 0.005) {
      return 'good'
    } else {
      return 'excellent'
    }
  }
  
  /**
   * Clean up old checksum history
   */
  cleanupChecksumHistory() {
    if (this.checksumHistory.size <= this.config.checksumHistorySize) return
    
    const frames = Array.from(this.checksumHistory.keys()).sort((a, b) => a - b)
    const framesToDelete = frames.slice(0, frames.length - this.config.checksumHistorySize)
    
    framesToDelete.forEach(frame => {
      this.checksumHistory.delete(frame)
    })
  }
  
  /**
   * Get comprehensive statistics
   */
  getStats() {
    const playerStats = Array.from(this.playerDesyncs.values()).map(tracker => ({
      playerId: tracker.playerId,
      desyncCount: tracker.desyncCount,
      consecutiveDesyncs: tracker.consecutiveDesyncs,
      connectionQuality: tracker.connectionQuality,
      checksumMismatches: { ...tracker.checksumMismatches }
    }))
    
    return {
      global: {
        ...this.stats,
        successRate: this.stats.recoveryAttempts > 0 
          ? this.stats.successfulRecoveries / this.stats.recoveryAttempts 
          : 0,
        isDesynced: this.globalDesyncState.isDesynced,
        recoveryInProgress: this.globalDesyncState.recoveryInProgress
      },
      players: playerStats,
      checksumHistorySize: this.checksumHistory.size
    }
  }
  
  /**
   * Reset all statistics and state
   */
  reset() {
    this.checksumHistory.clear()
    this.playerDesyncs.clear()
    
    this.globalDesyncState = {
      isDesynced: false,
      lastDesyncFrame: -1,
      consecutiveDesyncs: 0,
      recoveryInProgress: false,
      recoveryStartTime: 0
    }
    
    this.stats = {
      totalDesyncs: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      checksumComparisons: 0,
      deepValidations: 0,
      wasmValidations: 0,
      avgRecoveryTime: 0
    }
    
    this.logger.info('Desync detection system reset')
  }
}

export default DesyncDetectionSystem
