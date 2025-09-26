/**
 * Enhanced Multiplayer Synchronization Integration
 * Integrates rollback netcode, desync detection, host migration, network diagnostics,
 * and performance optimization into a unified multiplayer synchronization system
 */

import { createLogger } from '../utils/logger.js'
import RollbackNetcode from './rollback-netcode.js'
import DesyncDetectionSystem from './desync-detection.js'
import HostMigrationSystem from './host-migration.js'
import NetworkDiagnostics from './network-diagnostics.js'
import RollbackPerformanceOptimizer from './rollback-performance-optimizer.js'

export class EnhancedMultiplayerSync {
  constructor(config = {}) {
    this.config = {
      // Core settings
      maxPlayers: config.maxPlayers || 8,
      enableRollback: config.enableRollback !== false,
      enableDesyncDetection: config.enableDesyncDetection !== false,
      enableHostMigration: config.enableHostMigration !== false,
      enableNetworkDiagnostics: config.enableNetworkDiagnostics !== false,
      enablePerformanceOptimization: config.enablePerformanceOptimization !== false,
      
      // System-specific configs
      rollbackConfig: config.rollbackConfig || {},
      desyncConfig: config.desyncConfig || {},
      hostMigrationConfig: config.hostMigrationConfig || {},
      networkDiagnosticsConfig: config.networkDiagnosticsConfig || {},
      optimizerConfig: config.optimizerConfig || {},
      
      // Integration settings
      autoRecovery: config.autoRecovery !== false,
      qualityBasedOptimization: config.qualityBasedOptimization !== false,
      comprehensiveLogging: config.comprehensiveLogging !== false,
      
      ...config
    }
    
    this.logger = createLogger({ 
      level: config.logLevel || 'info',
      prefix: '[EnhancedSync]'
    })
    
    // System instances
    this.rollbackNetcode = null
    this.desyncDetection = null
    this.hostMigration = null
    this.networkDiagnostics = null
    this.performanceOptimizer = null
    
    // Session state
    this.sessionState = {
      localPlayerId: null,
      isHost: false,
      players: new Map(),
      gameState: 'disconnected', // disconnected, connecting, connected, playing, paused
      networkQuality: 'unknown',
      lastSyncTime: 0
    }
    
    // Game integration
    this.gameIntegration = {
      wasmModule: null,
      saveState: null,
      loadState: null,
      advanceFrame: null,
      getChecksum: null,
      pauseGame: null,
      resumeGame: null
    }
    
    // Network integration
    this.networkIntegration = {
      sendToPeer: null,
      broadcastMessage: null,
      getPeerConnection: null,
      onPeerConnected: null,
      onPeerDisconnected: null
    }
    
    // Event handlers
    this.eventHandlers = {
      onSyncStateChanged: null,      // (state) => void
      onNetworkQualityChanged: null, // (quality) => void
      onDesyncDetected: null,        // (info) => void
      onRecoveryCompleted: null,     // (success) => void
      onHostChanged: null,           // (newHost) => void
      onPlayerJoined: null,          // (playerId) => void
      onPlayerLeft: null             // (playerId) => void
    }
    
    // Statistics
    this.stats = {
      sessionsStarted: 0,
      totalPlayTime: 0,
      totalDesyncs: 0,
      totalRecoveries: 0,
      totalHostMigrations: 0,
      avgNetworkQuality: 0,
      lastStatsUpdate: 0
    }
    
    this.initializeSystems()
  }
  
  /**
   * Initialize all subsystems
   */
  initializeSystems() {
    // Initialize rollback netcode
    if (this.config.enableRollback) {
      this.rollbackNetcode = new RollbackNetcode({
        ...this.config.rollbackConfig,
        logLevel: this.config.logLevel
      })
    }
    
    // Initialize desync detection
    if (this.config.enableDesyncDetection) {
      this.desyncDetection = new DesyncDetectionSystem({
        ...this.config.desyncConfig,
        logLevel: this.config.logLevel
      })
    }
    
    // Initialize host migration
    if (this.config.enableHostMigration) {
      this.hostMigration = new HostMigrationSystem({
        ...this.config.hostMigrationConfig,
        logLevel: this.config.logLevel
      })
    }
    
    // Initialize network diagnostics
    if (this.config.enableNetworkDiagnostics) {
      this.networkDiagnostics = new NetworkDiagnostics({
        ...this.config.networkDiagnosticsConfig,
        logLevel: this.config.logLevel
      })
    }
    
    // Initialize performance optimizer
    if (this.config.enablePerformanceOptimization) {
      this.performanceOptimizer = new RollbackPerformanceOptimizer({
        ...this.config.optimizerConfig,
        logLevel: this.config.logLevel
      })
    }
    
    this.logger.info('Enhanced multiplayer sync systems initialized', {
      rollback: !!this.rollbackNetcode,
      desync: !!this.desyncDetection,
      hostMigration: !!this.hostMigration,
      diagnostics: !!this.networkDiagnostics,
      optimizer: !!this.performanceOptimizer
    })
  }
  
  /**
   * Initialize the complete system
   */
  async initialize(gameIntegration, networkIntegration, eventHandlers = {}) {
    this.gameIntegration = { ...this.gameIntegration, ...gameIntegration }
    this.networkIntegration = { ...this.networkIntegration, ...networkIntegration }
    this.eventHandlers = { ...this.eventHandlers, ...eventHandlers }
    
    // Set up cross-system integrations
    this.setupSystemIntegrations()
    
    // Initialize individual systems
    await this.initializeIndividualSystems()
    
    this.logger.info('Enhanced multiplayer sync fully initialized')
  }
  
  /**
   * Set up integrations between systems
   */
  setupSystemIntegrations() {
    // Rollback + Performance Optimizer integration
    if (this.rollbackNetcode && this.performanceOptimizer) {
      this.integrateRollbackWithOptimizer()
    }
    
    // Rollback + Desync Detection integration
    if (this.rollbackNetcode && this.desyncDetection) {
      this.integrateRollbackWithDesyncDetection()
    }
    
    // Host Migration + Network Diagnostics integration
    if (this.hostMigration && this.networkDiagnostics) {
      this.integrateHostMigrationWithDiagnostics()
    }
    
    // Performance Optimizer + Network Diagnostics integration
    if (this.performanceOptimizer && this.networkDiagnostics) {
      this.integrateOptimizerWithDiagnostics()
    }
    
    // All systems + Event coordination
    this.setupEventCoordination()
  }
  
  /**
   * Integrate rollback netcode with performance optimizer
   */
  integrateRollbackWithOptimizer() {
    const originalSaveState = this.gameIntegration.saveState
    const originalLoadState = this.gameIntegration.loadState
    
    // Wrap save state with optimization
    this.gameIntegration.saveState = () => {
      const state = originalSaveState()
      return this.performanceOptimizer.optimizeStateForSaving(state, this.rollbackNetcode.currentFrame)
    }
    
    // Wrap load state with optimization
    this.gameIntegration.loadState = (state) => {
      const optimizedState = this.performanceOptimizer.optimizeStateForLoading(state, this.rollbackNetcode.currentFrame)
      return originalLoadState(optimizedState)
    }
    
    // Connect network quality updates
    this.rollbackNetcode.onNetworkQualityChanged = (quality) => {
      this.performanceOptimizer.updateNetworkQuality(quality)
    }
    
    this.logger.debug('Rollback netcode integrated with performance optimizer')
  }
  
  /**
   * Integrate rollback netcode with desync detection
   */
  integrateRollbackWithDesyncDetection() {
    // Set up validators for desync detection
    const validators = {
      basic: this.gameIntegration.getChecksum,
      enhanced: this.rollbackNetcode.wasmIntegration.checksumFunction,
      deep: () => this.gameIntegration.saveState(),
      wasm: this.gameIntegration.wasmModule ? () => this.gameIntegration.wasmModule.getWasmState() : null
    }
    
    // Set up recovery handlers
    const recoveryHandlers = {
      onDesyncDetected: (desyncInfo) => {
        this.handleDesyncDetected(desyncInfo)
      },
      onRecoveryStarted: (method, frame) => {
        this.handleRecoveryStarted(method, frame)
      },
      onRecoveryCompleted: (success, method) => {
        this.handleRecoveryCompleted(success, method)
      },
      requestStateResync: async (playerId, frame) => this.requestStateResync(playerId, frame),
      requestFullResync: async () => this.requestFullResync()
    }
    
    this.desyncDetection.initialize(validators, recoveryHandlers)
    
    // Connect rollback sync tests to desync detection
    this.rollbackNetcode.onSendSyncTest = (frame, checksumData) => {
      this.desyncDetection.recordLocalChecksums(frame)
      this.networkIntegration.broadcastMessage({
        type: 'sync_test',
        frame,
        checksums: checksumData,
        timestamp: performance.now()
      })
    }
    
    this.rollbackNetcode.onDesyncDetected = (playerId, frame, desyncInfo) => {
      this.desyncDetection.recordRemoteChecksums(playerId, frame, desyncInfo)
    }
    
    this.logger.debug('Rollback netcode integrated with desync detection')
  }
  
  /**
   * Integrate host migration with network diagnostics
   */
  integrateHostMigrationWithDiagnostics() {
    // Initialize host migration with game and network integration
    this.hostMigration.initialize(
      this.gameIntegration,
      this.networkIntegration,
      {
        onMigrationStarted: (newHost, reason) => {
          this.handleMigrationStarted(newHost, reason)
        },
        onMigrationCompleted: (success, newHost) => {
          this.handleMigrationCompleted(success, newHost)
        },
        onHostChanged: (newHost, oldHost) => {
          this.handleHostChanged(newHost, oldHost)
        }
      }
    )
    
    // Initialize network diagnostics
    this.networkDiagnostics.initialize(
      this.networkIntegration,
      {
        onQualityChanged: (peerId, quality) => {
          this.handlePeerQualityChanged(peerId, quality)
        },
        onNetworkConditionChanged: (condition) => {
          this.handleNetworkConditionChanged(condition)
        }
      }
    )
    
    // Connect quality updates to host migration
    this.networkDiagnostics.eventHandlers.onQualityChanged = (peerId, quality) => {
      this.hostMigration.updatePlayer(peerId, { connectionQuality: quality })
    }
    
    this.logger.debug('Host migration integrated with network diagnostics')
  }
  
  /**
   * Integrate performance optimizer with network diagnostics
   */
  integrateOptimizerWithDiagnostics() {
    // Connect network quality to optimizer
    this.networkDiagnostics.eventHandlers.onNetworkConditionChanged = (condition) => {
      this.performanceOptimizer.updateNetworkQuality(condition)
    }
    
    this.logger.debug('Performance optimizer integrated with network diagnostics')
  }
  
  /**
   * Set up event coordination across all systems
   */
  setupEventCoordination() {
    // Coordinate network events
    const originalOnPeerConnected = this.networkIntegration.onPeerConnected
    this.networkIntegration.onPeerConnected = (peerId) => {
      this.handlePeerConnected(peerId)
      if (originalOnPeerConnected) {originalOnPeerConnected(peerId)}
    }
    
    const originalOnPeerDisconnected = this.networkIntegration.onPeerDisconnected
    this.networkIntegration.onPeerDisconnected = (peerId) => {
      this.handlePeerDisconnected(peerId)
      if (originalOnPeerDisconnected) {originalOnPeerDisconnected(peerId)}
    }
  }
  
  /**
   * Initialize individual systems
   */
  async initializeIndividualSystems() {
    // Initialize rollback netcode
    if (this.rollbackNetcode) {
      this.rollbackNetcode.initialize(
        this.gameIntegration,
        this.sessionState.localPlayerId,
        this.gameIntegration.wasmModule
      )
    }
    
    // Add local player to all systems
    if (this.sessionState.localPlayerId) {
      this.addPlayerToAllSystems(this.sessionState.localPlayerId, { local: true })
    }
  }
  
  /**
   * Start a multiplayer session as host
   */
  async startAsHost(localPlayerId, gameConfig = {}) {
    this.sessionState.localPlayerId = localPlayerId
    this.sessionState.isHost = true
    this.sessionState.gameState = 'connecting'
    
    this.logger.info('Starting multiplayer session as host', { localPlayerId })
    
    // Initialize as host in all systems
    if (this.hostMigration) {
      this.hostMigration.becomeHost(localPlayerId, this.sessionState.players)
    }
    
    if (this.rollbackNetcode) {
      this.rollbackNetcode.initialize(
        this.gameIntegration,
        localPlayerId,
        this.gameIntegration.wasmModule
      )
      this.rollbackNetcode.start()
    }
    
    this.addPlayerToAllSystems(localPlayerId, { local: true, isHost: true })
    
    this.sessionState.gameState = 'connected'
    this.stats.sessionsStarted++
    
    this.notifyEvent('onSyncStateChanged', 'host_ready')
  }
  
  /**
   * Join a multiplayer session as client
   */
  async joinAsClient(localPlayerId, hostId) {
    this.sessionState.localPlayerId = localPlayerId
    this.sessionState.isHost = false
    this.sessionState.gameState = 'connecting'
    
    this.logger.info('Joining multiplayer session as client', { localPlayerId, hostId })
    
    // Initialize as client in all systems
    if (this.hostMigration) {
      this.hostMigration.joinAsPlayer(localPlayerId, hostId, this.sessionState.players)
    }
    
    if (this.rollbackNetcode) {
      this.rollbackNetcode.initialize(
        this.gameIntegration,
        localPlayerId,
        this.gameIntegration.wasmModule
      )
      this.rollbackNetcode.start()
    }
    
    this.addPlayerToAllSystems(localPlayerId, { local: true, isHost: false })
    this.addPlayerToAllSystems(hostId, { local: false, isHost: true })
    
    this.sessionState.gameState = 'connected'
    
    this.notifyEvent('onSyncStateChanged', 'client_connected')
  }
  
  /**
   * Add a player to all systems
   */
  addPlayerToAllSystems(playerId, playerInfo = {}) {
    const player = {
      id: playerId,
      local: false,
      isHost: false,
      connectionQuality: 'unknown',
      latency: 0,
      lastSeen: performance.now(),
      ...playerInfo
    }
    
    this.sessionState.players.set(playerId, player)
    
    // Add to rollback netcode
    if (this.rollbackNetcode && !player.local) {
      this.rollbackNetcode.addPlayer(playerId)
    }
    
    // Add to desync detection
    if (this.desyncDetection) {
      this.desyncDetection.addPlayer(playerId)
    }
    
    // Add to host migration
    if (this.hostMigration) {
      this.hostMigration.addPlayer(playerId, player)
    }
    
    // Add to network diagnostics
    if (this.networkDiagnostics) {
      this.networkDiagnostics.addPeer(playerId, player)
    }
    
    this.logger.info('Player added to all systems', { playerId, playerInfo: player })
    this.notifyEvent('onPlayerJoined', playerId)
  }
  
  /**
   * Remove a player from all systems
   */
  removePlayerFromAllSystems(playerId) {
    const player = this.sessionState.players.get(playerId)
    if (!player) {
      return
    }
    
    this.sessionState.players.delete(playerId)
    
    // Remove from all systems
    if (this.rollbackNetcode) {
      this.rollbackNetcode.removePlayer(playerId)
    }
    
    if (this.desyncDetection) {
      this.desyncDetection.removePlayer(playerId)
    }
    
    if (this.hostMigration) {
      this.hostMigration.removePlayer(playerId)
    }
    
    if (this.networkDiagnostics) {
      this.networkDiagnostics.removePeer(playerId)
    }
    
    this.logger.info('Player removed from all systems', { playerId })
    this.notifyEvent('onPlayerLeft', playerId)
  }
  
  /**
   * Handle network message
   */
  handleMessage(message, senderId) {
    // Route message to appropriate system
    switch (message.type) {
      case 'sync_test':
        if (this.desyncDetection) {
          this.desyncDetection.recordRemoteChecksums(senderId, message.frame, message.checksums)
        }
        break
        
      case 'rollback_input':
        if (this.rollbackNetcode) {
          this.rollbackNetcode.receiveRemoteInput(senderId, message.frame, message.input)
        }
        break
        
      case 'host_migration':
      case 'host_ready':
      case 'state_request':
      case 'state_response':
        if (this.hostMigration) {
          this.hostMigration.handleMessage(message, senderId)
        }
        break
        
      case 'network_ping':
      case 'network_pong':
      case 'bandwidth_test':
      case 'bandwidth_ack':
        if (this.networkDiagnostics) {
          this.networkDiagnostics.handleMessage(message, senderId)
        }
        break
        
      default:
        this.logger.debug('Unknown message type', { type: message.type, senderId })
    }
  }
  
  /**
   * Send local input
   */
  sendInput(input) {
    if (!this.rollbackNetcode) {
      return
    }
    
    let processedInput = input
    
    // Apply performance optimization to input
    if (this.performanceOptimizer) {
      const optimization = this.performanceOptimizer.optimizeInputBatching(input, this.rollbackNetcode.currentFrame)
      if (!optimization.immediate) {
        return // Input was batched
      }
      processedInput = optimization.inputs[0] || input
    }
    
    // Send through rollback netcode
    this.rollbackNetcode.addInput(
      this.sessionState.localPlayerId,
      this.rollbackNetcode.currentFrame + this.rollbackNetcode.config.inputDelayFrames,
      processedInput
    )
  }
  
  /**
   * Event handlers
   */
  
  handlePeerConnected(peerId) {
    this.logger.info('Peer connected', { peerId })
    // Peer will be added when we receive their join message
  }
  
  handlePeerDisconnected(peerId) {
    this.logger.info('Peer disconnected', { peerId })
    this.removePlayerFromAllSystems(peerId)
  }
  
  handleDesyncDetected(desyncInfo) {
    this.logger.warn('Desync detected', desyncInfo)
    this.stats.totalDesyncs++
    
    if (this.config.autoRecovery && this.rollbackNetcode) {
      // Attempt rollback recovery
      const goodFrame = this.rollbackNetcode.findSavedState(desyncInfo.frame - 5)
      if (goodFrame) {
        this.rollbackNetcode.rollback(goodFrame.frame)
        this.logger.info('Attempted rollback recovery', { toFrame: goodFrame.frame })
      }
    }
    
    this.notifyEvent('onDesyncDetected', desyncInfo)
  }
  
  handleRecoveryStarted(method, frame) {
    this.logger.info('Recovery started', { method, frame })
    
    if (this.gameIntegration.pauseGame) {
      this.gameIntegration.pauseGame()
    }
    
    this.sessionState.gameState = 'recovering'
  }
  
  handleRecoveryCompleted(success, method) {
    this.logger.info('Recovery completed', { success, method })
    this.stats.totalRecoveries++
    
    if (this.gameIntegration.resumeGame) {
      this.gameIntegration.resumeGame()
    }
    
    this.sessionState.gameState = 'playing'
    this.notifyEvent('onRecoveryCompleted', success)
  }
  
  handleMigrationStarted(newHost, reason) {
    this.logger.info('Host migration started', { newHost, reason })
    this.sessionState.gameState = 'migrating'
  }
  
  handleMigrationCompleted(success, newHost) {
    this.logger.info('Host migration completed', { success, newHost })
    this.stats.totalHostMigrations++
    
    if (success) {
      this.sessionState.gameState = 'playing'
    } else {
      this.sessionState.gameState = 'disconnected'
    }
  }
  
  handleHostChanged(newHost, oldHost) {
    this.logger.info('Host changed', { newHost, oldHost })
    
    // Update local state
    this.sessionState.isHost = (newHost === this.sessionState.localPlayerId)
    
    // Update player info
    if (this.sessionState.players.has(oldHost)) {
      this.sessionState.players.get(oldHost).isHost = false
    }
    if (this.sessionState.players.has(newHost)) {
      this.sessionState.players.get(newHost).isHost = true
    }
    
    this.notifyEvent('onHostChanged', newHost)
  }
  
  handlePeerQualityChanged(peerId, quality) {
    const player = this.sessionState.players.get(peerId)
    if (player) {
      player.connectionQuality = quality
    }
  }
  
  handleNetworkConditionChanged(condition) {
    this.sessionState.networkQuality = condition
    this.notifyEvent('onNetworkQualityChanged', condition)
  }
  
  /**
   * Request state resync from a player
   */
  async requestStateResync(playerId, frame) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('State resync timeout'))
      }, 5000)
      
      const requestId = `resync_${Date.now()}`
      
      // Set up response handler
      const handleResponse = (message) => {
        if (message.type === 'state_response' && message.requestId === requestId) {
          clearTimeout(timeout)
          resolve(message.state)
        }
      }
      
      // Send request
      this.networkIntegration.sendToPeer(playerId, {
        type: 'state_request',
        requestId,
        frame,
        timestamp: performance.now()
      })
    })
  }
  
  /**
   * Request full resync from all players
   */
  async requestFullResync() {
    const players = Array.from(this.sessionState.players.keys())
      .filter(id => id !== this.sessionState.localPlayerId)
    
    for (const playerId of players) {
      try {
        const state = await this.requestStateResync(playerId, this.rollbackNetcode?.currentFrame || 0)
        if (state) {
          return state // Return first successful state
        }
      } catch (error) {
        this.logger.debug('Failed to get state from player', { playerId, error: error.message })
      }
    }
    
    throw new Error('No players could provide state for resync')
  }
  
  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const status = {
      session: {
        localPlayerId: this.sessionState.localPlayerId,
        isHost: this.sessionState.isHost,
        gameState: this.sessionState.gameState,
        networkQuality: this.sessionState.networkQuality,
        playerCount: this.sessionState.players.size
      },
      
      systems: {
        rollback: this.rollbackNetcode ? {
          enabled: true,
          running: this.rollbackNetcode.running,
          currentFrame: this.rollbackNetcode.currentFrame,
          metrics: this.rollbackNetcode.getMetrics()
        } : { enabled: false },
        
        desyncDetection: this.desyncDetection ? {
          enabled: true,
          stats: this.desyncDetection.getStats()
        } : { enabled: false },
        
        hostMigration: this.hostMigration ? {
          enabled: true,
          stats: this.hostMigration.getStats()
        } : { enabled: false },
        
        networkDiagnostics: this.networkDiagnostics ? {
          enabled: true,
          report: this.networkDiagnostics.getDiagnosticsReport()
        } : { enabled: false },
        
        performanceOptimizer: this.performanceOptimizer ? {
          enabled: true,
          stats: this.performanceOptimizer.getPerformanceStats()
        } : { enabled: false }
      },
      
      players: Array.from(this.sessionState.players.values()),
      
      globalStats: {
        ...this.stats,
        uptime: performance.now() - (this.stats.lastStatsUpdate || performance.now())
      }
    }
    
    return status
  }
  
  /**
   * Get system recommendations
   */
  getSystemRecommendations() {
    const recommendations = []
    
    // Network diagnostics recommendations
    if (this.networkDiagnostics) {
      recommendations.push(...this.networkDiagnostics.getNetworkRecommendations())
    }
    
    // Performance recommendations
    if (this.performanceOptimizer) {
      const perfStats = this.performanceOptimizer.getPerformanceStats()
      
      if (perfStats.compression.compressionRatio > 0.8) {
        recommendations.push({
          type: 'info',
          category: 'performance',
          message: 'State compression is not very effective. Consider optimizing state structure.',
          priority: 'low'
        })
      }
      
      if (perfStats.frameProcessing.frameSkipRate > 0.1) {
        recommendations.push({
          type: 'warning',
          category: 'performance',
          message: 'High frame skip rate detected. Consider reducing game complexity or improving hardware.',
          priority: 'medium'
        })
      }
    }
    
    // Desync recommendations
    if (this.desyncDetection) {
      const stats = this.desyncDetection.getStats()
      
      if (stats.global.successRate < 0.8) {
        recommendations.push({
          type: 'error',
          category: 'sync',
          message: 'Low desync recovery success rate. Check network stability and game determinism.',
          priority: 'high'
        })
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    })
  }
  
  /**
   * Export comprehensive diagnostics data
   */
  exportDiagnosticsData() {
    return {
      timestamp: new Date().toISOString(),
      systemStatus: this.getSystemStatus(),
      recommendations: this.getSystemRecommendations(),
      detailedMetrics: {
        rollback: this.rollbackNetcode?.getMetrics(),
        desync: this.desyncDetection?.getStats(),
        hostMigration: this.hostMigration?.getStats(),
        networkDiagnostics: this.networkDiagnostics?.getDiagnosticsReport(),
        performance: this.performanceOptimizer?.getPerformanceStats()
      }
    }
  }
  
  /**
   * Notify event handlers
   */
  notifyEvent(eventName, data) {
    if (this.eventHandlers[eventName]) {
      try {
        this.eventHandlers[eventName](data)
      } catch (error) {
        this.logger.error('Event handler error', { eventName, error: error.message })
      }
    }
  }
  
  /**
   * Shutdown all systems
   */
  shutdown() {
    this.logger.info('Shutting down enhanced multiplayer sync')
    
    if (this.rollbackNetcode) {
      this.rollbackNetcode.stop()
    }
    
    if (this.desyncDetection) {
      this.desyncDetection.reset()
    }
    
    if (this.hostMigration) {
      this.hostMigration.shutdown()
    }
    
    if (this.networkDiagnostics) {
      this.networkDiagnostics.shutdown()
    }
    
    if (this.performanceOptimizer) {
      this.performanceOptimizer.shutdown()
    }
    
    this.sessionState.gameState = 'disconnected'
    this.sessionState.players.clear()
  }
}

export default EnhancedMultiplayerSync
