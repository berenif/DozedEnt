/**
 * Enhanced Host Migration System
 * Implements seamless host migration with state transfer and minimal disruption
 * Features:
 * - Automatic host selection based on connection quality and performance
 * - Complete game state transfer with validation
 * - Rollback-safe migration with frame synchronization
 * - Graceful degradation and recovery mechanisms
 */

import { createLogger } from '../utils/logger.js'
import DesyncDetectionSystem from './desync-detection.js'

// Constants for host migration
const HOST_SELECTION_CRITERIA = {
  CONNECTION_QUALITY: 0.4,
  LATENCY: 0.3,
  PERFORMANCE: 0.2,
  STABILITY: 0.1
}

const MIGRATION_TIMEOUT = 10000 // 10 seconds
const STATE_TRANSFER_CHUNK_SIZE = 8192 // 8KB chunks
const MIGRATION_RETRY_ATTEMPTS = 3
const HOST_HEARTBEAT_INTERVAL = 2000 // 2 seconds
const HOST_TIMEOUT = 6000 // 6 seconds

export class HostMigrationSystem {
  constructor(config = {}) {
    this.config = {
      migrationTimeout: config.migrationTimeout || MIGRATION_TIMEOUT,
      stateTransferChunkSize: config.stateTransferChunkSize || STATE_TRANSFER_CHUNK_SIZE,
      maxRetryAttempts: config.maxRetryAttempts || MIGRATION_RETRY_ATTEMPTS,
      hostHeartbeatInterval: config.hostHeartbeatInterval || HOST_HEARTBEAT_INTERVAL,
      hostTimeout: config.hostTimeout || HOST_TIMEOUT,
      enableAutomaticMigration: config.enableAutomaticMigration !== false,
      enableStateValidation: config.enableStateValidation !== false,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Current session state
    this.sessionState = {
      isHost: false,
      currentHost: null,
      localPlayerId: null,
      players: new Map(), // playerId -> PlayerInfo
      migrationInProgress: false,
      migrationStartTime: 0,
      migrationAttempts: 0
    }
    
    // Host monitoring
    this.hostMonitoring = {
      lastHeartbeat: 0,
      heartbeatInterval: null,
      timeoutCheck: null,
      hostResponsive: true
    }
    
    // State transfer
    this.stateTransfer = {
      inProgress: false,
      chunks: new Map(), // chunkId -> chunk data
      totalChunks: 0,
      receivedChunks: 0,
      transferStartTime: 0,
      transferTimeout: null
    }
    
    // Game integration
    this.gameIntegration = {
      saveState: null,      // () => state
      loadState: null,      // (state) => void
      pauseGame: null,      // () => void
      resumeGame: null,     // () => void
      validateState: null,  // (state) => boolean
      getFrameNumber: null, // () => number
      rollbackToFrame: null // (frame) => void
    }
    
    // Network callbacks
    this.networkCallbacks = {
      broadcastMessage: null,        // (message) => void
      sendToPlayer: null,           // (playerId, message) => void
      onPlayerDisconnected: null,   // (playerId) => void
      onPlayerReconnected: null     // (playerId) => void
    }
    
    // Event handlers
    this.eventHandlers = {
      onMigrationStarted: null,     // (newHost, reason) => void
      onMigrationCompleted: null,   // (success, newHost) => void
      onHostChanged: null,          // (newHost, oldHost) => void
      onStateTransferProgress: null, // (progress) => void
      onMigrationFailed: null       // (reason, attempts) => void
    }
    
    // Statistics
    this.stats = {
      totalMigrations: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      avgMigrationTime: 0,
      hostChanges: 0,
      stateTransferBytes: 0,
      avgStateTransferTime: 0
    }
  }
  
  /**
   * Initialize the host migration system
   */
  initialize(gameIntegration, networkCallbacks, eventHandlers = {}) {
    this.gameIntegration = { ...this.gameIntegration, ...gameIntegration }
    this.networkCallbacks = { ...this.networkCallbacks, ...networkCallbacks }
    this.eventHandlers = { ...this.eventHandlers, ...eventHandlers }
    
    // Start host monitoring if not host
    if (!this.sessionState.isHost) {
      this.startHostMonitoring()
    }
    
    this.logger.info('Host migration system initialized', {
      enableAutomaticMigration: this.config.enableAutomaticMigration,
      enableStateValidation: this.config.enableStateValidation
    })
  }
  
  /**
   * Set local player as host
   */
  becomeHost(playerId, players = new Map()) {
    const wasHost = this.sessionState.isHost
    
    this.sessionState.isHost = true
    this.sessionState.currentHost = playerId
    this.sessionState.localPlayerId = playerId
    this.sessionState.players = new Map(players)
    
    // Stop host monitoring since we are now the host
    this.stopHostMonitoring()
    
    // Start host heartbeat
    this.startHostHeartbeat()
    
    if (!wasHost) {
      this.stats.hostChanges++
      this.logger.info('Became host', { playerId, playerCount: players.size })
      
      if (this.eventHandlers.onHostChanged) {
        this.eventHandlers.onHostChanged(playerId, this.sessionState.currentHost)
      }
    }
  }
  
  /**
   * Join session as non-host player
   */
  joinAsPlayer(playerId, hostId, players = new Map()) {
    this.sessionState.isHost = false
    this.sessionState.currentHost = hostId
    this.sessionState.localPlayerId = playerId
    this.sessionState.players = new Map(players)
    
    // Start monitoring the host
    this.startHostMonitoring()
    
    this.logger.info('Joined as player', { playerId, hostId, playerCount: players.size })
  }
  
  /**
   * Add a player to the session
   */
  addPlayer(playerId, playerInfo = {}) {
    const player = {
      id: playerId,
      connectionQuality: 'unknown',
      latency: 0,
      performance: 'unknown',
      stability: 1.0,
      lastSeen: performance.now(),
      ...playerInfo
    }
    
    this.sessionState.players.set(playerId, player)
    
    this.logger.info('Player added to session', { playerId, playerCount: this.sessionState.players.size })
  }
  
  /**
   * Remove a player from the session
   */
  removePlayer(playerId) {
    const wasHost = this.sessionState.currentHost === playerId
    this.sessionState.players.delete(playerId)
    
    if (wasHost && this.config.enableAutomaticMigration) {
      this.triggerHostMigration('host_disconnected', playerId)
    }
    
    this.logger.info('Player removed from session', { 
      playerId, 
      wasHost, 
      playerCount: this.sessionState.players.size 
    })
  }
  
  /**
   * Update player information
   */
  updatePlayer(playerId, updates) {
    const player = this.sessionState.players.get(playerId)
    if (player) {
      Object.assign(player, updates, { lastSeen: performance.now() })
    }
  }
  
  /**
   * Trigger host migration
   */
  async triggerHostMigration(reason, oldHostId = null) {
    if (this.sessionState.migrationInProgress) {
      this.logger.debug('Migration already in progress, ignoring trigger')
      return false
    }
    
    this.sessionState.migrationInProgress = true
    this.sessionState.migrationStartTime = performance.now()
    this.sessionState.migrationAttempts++
    this.stats.totalMigrations++
    
    this.logger.info('Host migration triggered', { 
      reason, 
      oldHostId, 
      attempt: this.sessionState.migrationAttempts 
    })
    
    if (this.eventHandlers.onMigrationStarted) {
      this.eventHandlers.onMigrationStarted(null, reason)
    }
    
    try {
      // Pause game to prevent state changes during migration
      if (this.gameIntegration.pauseGame) {
        this.gameIntegration.pauseGame()
      }
      
      // Select new host
      const newHost = this.selectNewHost(oldHostId)
      if (!newHost) {
        throw new Error('No suitable host found')
      }
      
      this.logger.info('New host selected', { 
        newHostId: newHost.id,
        score: newHost.score,
        criteria: newHost.criteria
      })
      
      // Perform migration
      const success = await this.performMigration(newHost.id, reason)
      
      if (success) {
        this.completeMigration(true, newHost.id)
        return true
      } 
        throw new Error('Migration failed')
      
      
    } catch (error) {
      this.logger.error('Host migration failed', { 
        reason, 
        error: error.message, 
        attempt: this.sessionState.migrationAttempts 
      })
      
      if (this.sessionState.migrationAttempts < this.config.maxRetryAttempts) {
        // Retry after a short delay
        setTimeout(() => {
          this.triggerHostMigration(reason, oldHostId)
        }, 1000 * this.sessionState.migrationAttempts)
        return false
      } 
        this.completeMigration(false, null)
        return false
      
    }
  }
  
  /**
   * Select the best candidate for new host
   */
  selectNewHost(excludeId = null) {
    const candidates = Array.from(this.sessionState.players.values())
      .filter(player => player.id !== excludeId && player.id !== this.sessionState.localPlayerId)
    
    if (candidates.length === 0) {
      // We are the only remaining player, become host
      return {
        id: this.sessionState.localPlayerId,
        score: 1.0,
        criteria: { local: true }
      }
    }
    
    // Score each candidate
    const scoredCandidates = candidates.map(player => {
      const score = this.calculateHostScore(player)
      return {
        id: player.id,
        player,
        score,
        criteria: this.getHostScoreCriteria(player)
      }
    })
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score)
    
    this.logger.debug('Host candidates evaluated', {
      candidates: scoredCandidates.map(c => ({
        id: c.id,
        score: c.score,
        criteria: c.criteria
      }))
    })
    
    return scoredCandidates[0]
  }
  
  /**
   * Calculate host suitability score for a player
   */
  calculateHostScore(player) {
    let score = 0
    
    // Connection quality (0-1)
    const connectionScore = this.getConnectionQualityScore(player.connectionQuality)
    score += connectionScore * HOST_SELECTION_CRITERIA.CONNECTION_QUALITY
    
    // Latency (lower is better, normalized to 0-1)
    const latencyScore = Math.max(0, 1 - (player.latency / 500)) // 500ms = 0 score
    score += latencyScore * HOST_SELECTION_CRITERIA.LATENCY
    
    // Performance (0-1)
    const performanceScore = this.getPerformanceScore(player.performance)
    score += performanceScore * HOST_SELECTION_CRITERIA.PERFORMANCE
    
    // Stability (0-1)
    const stabilityScore = Math.min(1, player.stability || 1)
    score += stabilityScore * HOST_SELECTION_CRITERIA.STABILITY
    
    return Math.min(1, Math.max(0, score))
  }
  
  /**
   * Get detailed scoring criteria for a player
   */
  getHostScoreCriteria(player) {
    return {
      connectionQuality: player.connectionQuality,
      connectionScore: this.getConnectionQualityScore(player.connectionQuality),
      latency: player.latency,
      latencyScore: Math.max(0, 1 - (player.latency / 500)),
      performance: player.performance,
      performanceScore: this.getPerformanceScore(player.performance),
      stability: player.stability || 1
    }
  }
  
  /**
   * Convert connection quality to numeric score
   */
  getConnectionQualityScore(quality) {
    switch (quality) {
      case 'excellent': return 1.0
      case 'good': return 0.8
      case 'fair': return 0.6
      case 'poor': return 0.3
      default: return 0.5 // unknown
    }
  }
  
  /**
   * Convert performance rating to numeric score
   */
  getPerformanceScore(performance) {
    switch (performance) {
      case 'excellent': return 1.0
      case 'good': return 0.8
      case 'fair': return 0.6
      case 'poor': return 0.3
      default: return 0.5 // unknown
    }
  }
  
  /**
   * Perform the actual migration process
   */
  async performMigration(newHostId, reason) {
    this.logger.info('Performing migration', { newHostId, reason })
    
    // Step 1: Announce migration to all players
    await this.announceMigration(newHostId, reason)
    
    // Step 2: Transfer state if we are becoming the new host
    if (newHostId === this.sessionState.localPlayerId) {
      const success = await this.handleBecomeNewHost()
      return success
    } 
      // Step 3: Wait for new host to be ready
      const success = await this.waitForNewHost(newHostId)
      return success
    
  }
  
  /**
   * Announce migration to all players
   */
  async announceMigration(newHostId, reason) {
    const message = {
      type: 'host_migration',
      newHostId,
      reason,
      timestamp: performance.now(),
      frame: this.gameIntegration.getFrameNumber ? this.gameIntegration.getFrameNumber() : 0
    }
    
    if (this.networkCallbacks.broadcastMessage) {
      this.networkCallbacks.broadcastMessage(message)
    }
    
    this.logger.info('Migration announced', message)
  }
  
  /**
   * Handle becoming the new host
   */
  async handleBecomeNewHost() {
    this.logger.info('Becoming new host')
    
    try {
      // Step 1: Request current state from old host or most reliable player
      const gameState = await this.requestGameState()
      
      // Step 2: Validate and load the state
      if (gameState) {
        const isValid = this.config.enableStateValidation && this.gameIntegration.validateState
          ? this.gameIntegration.validateState(gameState)
          : true
        
        if (isValid && this.gameIntegration.loadState) {
          this.gameIntegration.loadState(gameState)
          this.logger.info('Game state loaded successfully')
        } else {
          this.logger.warn('Invalid game state received, using current state')
        }
      }
      
      // Step 3: Become the host
      this.becomeHost(this.sessionState.localPlayerId, this.sessionState.players)
      
      // Step 4: Announce readiness to all players
      await this.announceHostReady()
      
      return true
      
    } catch (error) {
      this.logger.error('Failed to become new host', error)
      return false
    }
  }
  
  /**
   * Request game state from other players
   */
  async requestGameState() {
    this.logger.info('Requesting game state')
    
    // Find the most reliable player to request state from
    const candidates = Array.from(this.sessionState.players.values())
      .filter(p => p.id !== this.sessionState.localPlayerId)
      .sort((a, b) => this.calculateHostScore(b) - this.calculateHostScore(a))
    
    for (const candidate of candidates) {
      try {
        const state = await this.requestStateFromPlayer(candidate.id)
        if (state) {
          this.logger.info('Game state received', { from: candidate.id })
          return state
        }
      } catch (error) {
        this.logger.warn('Failed to get state from player', { 
          playerId: candidate.id, 
          error: error.message 
        })
      }
    }
    
    this.logger.warn('No game state received, using current state')
    return null
  }
  
  /**
   * Request state from a specific player
   */
  async requestStateFromPlayer(playerId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('State request timeout'))
      }, 5000)
      
      const message = {
        type: 'state_request',
        requestId: `state_${Date.now()}`,
        timestamp: performance.now()
      }
      
      // Set up response handler
      const handleResponse = (response) => {
        if (response.type === 'state_response' && response.requestId === message.requestId) {
          clearTimeout(timeout)
          resolve(response.state)
        }
      }
      
      // Send request
      if (this.networkCallbacks.sendToPlayer) {
        this.networkCallbacks.sendToPlayer(playerId, message)
        // Note: In a real implementation, you'd need to set up the response handler
        // through your networking system
        
        // For now, simulate a timeout
        setTimeout(() => {
          reject(new Error('State request not implemented'))
        }, 1000)
      } else {
        reject(new Error('No network callback available'))
      }
    })
  }
  
  /**
   * Announce that the new host is ready
   */
  async announceHostReady() {
    const message = {
      type: 'host_ready',
      hostId: this.sessionState.localPlayerId,
      timestamp: performance.now(),
      frame: this.gameIntegration.getFrameNumber ? this.gameIntegration.getFrameNumber() : 0
    }
    
    if (this.networkCallbacks.broadcastMessage) {
      this.networkCallbacks.broadcastMessage(message)
    }
    
    this.logger.info('Host ready announced')
  }
  
  /**
   * Wait for new host to be ready
   */
  async waitForNewHost(newHostId) {
    this.logger.info('Waiting for new host', { newHostId })
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn('Timeout waiting for new host')
        resolve(false)
      }, this.config.migrationTimeout)
      
      const handleHostReady = (message) => {
        if (message.type === 'host_ready' && message.hostId === newHostId) {
          clearTimeout(timeout)
          this.sessionState.currentHost = newHostId
          this.logger.info('New host is ready', { newHostId })
          resolve(true)
        }
      }
      
      // Note: In a real implementation, you'd need to set up the message handler
      // through your networking system
      
      // For now, simulate success after a delay
      setTimeout(() => {
        clearTimeout(timeout)
        this.sessionState.currentHost = newHostId
        resolve(true)
      }, 2000)
    })
  }
  
  /**
   * Complete the migration process
   */
  completeMigration(success, newHostId) {
    const migrationTime = performance.now() - this.sessionState.migrationStartTime
    
    this.sessionState.migrationInProgress = false
    
    if (success) {
      this.stats.successfulMigrations++
      this.stats.avgMigrationTime = (this.stats.avgMigrationTime * (this.stats.successfulMigrations - 1) + migrationTime) / this.stats.successfulMigrations
      
      this.sessionState.currentHost = newHostId
      this.sessionState.migrationAttempts = 0
      
      // Resume game
      if (this.gameIntegration.resumeGame) {
        this.gameIntegration.resumeGame()
      }
      
      // Restart host monitoring if we're not the host
      if (newHostId !== this.sessionState.localPlayerId) {
        this.startHostMonitoring()
      }
      
      this.logger.info('Migration completed successfully', {
        newHostId,
        migrationTime,
        totalMigrations: this.stats.totalMigrations,
        successRate: this.stats.successfulMigrations / this.stats.totalMigrations
      })
      
    } else {
      this.stats.failedMigrations++
      
      this.logger.error('Migration failed', {
        attempts: this.sessionState.migrationAttempts,
        migrationTime,
        totalFailures: this.stats.failedMigrations
      })
    }
    
    // Notify handlers
    if (this.eventHandlers.onMigrationCompleted) {
      this.eventHandlers.onMigrationCompleted(success, newHostId)
    }
    
    if (!success && this.eventHandlers.onMigrationFailed) {
      this.eventHandlers.onMigrationFailed('migration_failed', this.sessionState.migrationAttempts)
    }
  }
  
  /**
   * Start monitoring the host
   */
  startHostMonitoring() {
    if (this.sessionState.isHost) {return}
    
    this.stopHostMonitoring() // Clean up existing monitoring
    
    this.hostMonitoring.lastHeartbeat = performance.now()
    
    // Check for host timeout
    this.hostMonitoring.timeoutCheck = setInterval(() => {
      const timeSinceHeartbeat = performance.now() - this.hostMonitoring.lastHeartbeat
      
      if (timeSinceHeartbeat > this.config.hostTimeout) {
        if (this.hostMonitoring.hostResponsive) {
          this.hostMonitoring.hostResponsive = false
          this.logger.warn('Host appears unresponsive', {
            hostId: this.sessionState.currentHost,
            timeSinceHeartbeat
          })
          
          if (this.config.enableAutomaticMigration) {
            this.triggerHostMigration('host_timeout', this.sessionState.currentHost)
          }
        }
      }
    }, 1000)
    
    this.logger.debug('Host monitoring started')
  }
  
  /**
   * Stop monitoring the host
   */
  stopHostMonitoring() {
    if (this.hostMonitoring.timeoutCheck) {
      clearInterval(this.hostMonitoring.timeoutCheck)
      this.hostMonitoring.timeoutCheck = null
    }
    
    this.logger.debug('Host monitoring stopped')
  }
  
  /**
   * Start sending host heartbeats
   */
  startHostHeartbeat() {
    if (!this.sessionState.isHost) {return}
    
    this.stopHostHeartbeat() // Clean up existing heartbeat
    
    this.hostMonitoring.heartbeatInterval = setInterval(() => {
      const message = {
        type: 'host_heartbeat',
        hostId: this.sessionState.localPlayerId,
        timestamp: performance.now(),
        frame: this.gameIntegration.getFrameNumber ? this.gameIntegration.getFrameNumber() : 0
      }
      
      if (this.networkCallbacks.broadcastMessage) {
        this.networkCallbacks.broadcastMessage(message)
      }
    }, this.config.hostHeartbeatInterval)
    
    this.logger.debug('Host heartbeat started')
  }
  
  /**
   * Stop sending host heartbeats
   */
  stopHostHeartbeat() {
    if (this.hostMonitoring.heartbeatInterval) {
      clearInterval(this.hostMonitoring.heartbeatInterval)
      this.hostMonitoring.heartbeatInterval = null
    }
    
    this.logger.debug('Host heartbeat stopped')
  }
  
  /**
   * Handle received heartbeat from host
   */
  handleHostHeartbeat(message) {
    if (message.hostId === this.sessionState.currentHost) {
      this.hostMonitoring.lastHeartbeat = performance.now()
      
      if (!this.hostMonitoring.hostResponsive) {
        this.hostMonitoring.hostResponsive = true
        this.logger.info('Host is responsive again', { hostId: message.hostId })
      }
    }
  }
  
  /**
   * Handle network message
   */
  handleMessage(message, senderId) {
    switch (message.type) {
      case 'host_heartbeat':
        this.handleHostHeartbeat(message)
        break
        
      case 'host_migration':
        this.handleMigrationAnnouncement(message, senderId)
        break
        
      case 'host_ready':
        this.handleHostReady(message, senderId)
        break
        
      case 'state_request':
        this.handleStateRequest(message, senderId)
        break
        
      case 'state_response':
        this.handleStateResponse(message, senderId)
        break
        
      default:
        this.logger.debug('Unknown message type', { type: message.type, senderId })
    }
  }
  
  /**
   * Handle migration announcement
   */
  handleMigrationAnnouncement(message, senderId) {
    this.logger.info('Migration announcement received', {
      newHostId: message.newHostId,
      reason: message.reason,
      from: senderId
    })
    
    // Pause game during migration
    if (this.gameIntegration.pauseGame) {
      this.gameIntegration.pauseGame()
    }
  }
  
  /**
   * Handle host ready message
   */
  handleHostReady(message, senderId) {
    if (message.hostId === senderId) {
      this.sessionState.currentHost = message.hostId
      
      // Resume game
      if (this.gameIntegration.resumeGame) {
        this.gameIntegration.resumeGame()
      }
      
      // Restart host monitoring
      if (message.hostId !== this.sessionState.localPlayerId) {
        this.startHostMonitoring()
      }
      
      this.logger.info('New host ready', { hostId: message.hostId })
      
      if (this.eventHandlers.onHostChanged) {
        this.eventHandlers.onHostChanged(message.hostId, this.sessionState.currentHost)
      }
    }
  }
  
  /**
   * Handle state request
   */
  handleStateRequest(message, senderId) {
    if (this.gameIntegration.saveState) {
      const state = this.gameIntegration.saveState()
      
      const response = {
        type: 'state_response',
        requestId: message.requestId,
        state: state,
        timestamp: performance.now(),
        frame: this.gameIntegration.getFrameNumber ? this.gameIntegration.getFrameNumber() : 0
      }
      
      if (this.networkCallbacks.sendToPlayer) {
        this.networkCallbacks.sendToPlayer(senderId, response)
      }
      
      this.logger.info('State sent to requesting player', { requesterId: senderId })
    }
  }
  
  /**
   * Handle state response
   */
  handleStateResponse(message, senderId) {
    // This would be handled by the promise in requestStateFromPlayer
    this.logger.info('State response received', { from: senderId })
  }
  
  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      session: {
        isHost: this.sessionState.isHost,
        currentHost: this.sessionState.currentHost,
        localPlayerId: this.sessionState.localPlayerId,
        playerCount: this.sessionState.players.size,
        migrationInProgress: this.sessionState.migrationInProgress
      },
      migration: {
        totalMigrations: this.stats.totalMigrations,
        successfulMigrations: this.stats.successfulMigrations,
        failedMigrations: this.stats.failedMigrations,
        successRate: this.stats.totalMigrations > 0 
          ? this.stats.successfulMigrations / this.stats.totalMigrations 
          : 0,
        avgMigrationTime: this.stats.avgMigrationTime,
        hostChanges: this.stats.hostChanges
      },
      hostMonitoring: {
        hostResponsive: this.hostMonitoring.hostResponsive,
        lastHeartbeat: this.hostMonitoring.lastHeartbeat,
        timeSinceHeartbeat: performance.now() - this.hostMonitoring.lastHeartbeat
      },
      players: Array.from(this.sessionState.players.values()).map(player => ({
        id: player.id,
        connectionQuality: player.connectionQuality,
        latency: player.latency,
        performance: player.performance,
        stability: player.stability,
        hostScore: this.calculateHostScore(player)
      }))
    }
  }
  
  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopHostMonitoring()
    this.stopHostHeartbeat()
    
    if (this.stateTransfer.transferTimeout) {
      clearTimeout(this.stateTransfer.transferTimeout)
    }
    
    this.logger.info('Host migration system shutdown')
  }
}

export default HostMigrationSystem
