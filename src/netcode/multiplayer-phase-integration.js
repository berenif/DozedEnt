/**
 * Multiplayer Phase Integration Module
 * Integrates phase synchronization with the existing game systems
 */

import { MultiplayerPhaseManager } from './multiplayer-phase-manager.js'
import { PhaseSyncNetworkAdapter } from './phase-sync-network-adapter.js'
import { MultiplayerPhaseUI } from '../ui/multiplayer-phase-ui.js'
import { EnhancedMultiplayerSync } from './enhanced-multiplayer-sync.js'
import { createLogger } from '../utils/logger.js'

export class MultiplayerPhaseIntegration {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      autoInitialize: config.autoInitialize !== false,
      uiEnabled: config.uiEnabled !== false,
      networkProtocol: config.networkProtocol || 'websocket',
      websocketUrl: config.websocketUrl || null,
      reconciliationStrategy: config.reconciliationStrategy || 'host-authoritative',
      phaseTimersEnabled: config.phaseTimersEnabled !== false,
      phaseVotingEnabled: config.phaseVotingEnabled || false,
      debugMode: config.debugMode || false,
      logLevel: config.logLevel || 'info',
      ...config
    }
    
    this.logger = createLogger({
      level: this.config.logLevel,
      prefix: '[PhaseIntegration]'
    })
    
    // Core components
    this.phaseManager = null
    this.networkAdapter = null
    this.phaseUI = null
    this.multiplayerSync = null
    
    // Game references
    this.gameStateManager = null
    this.wasmManager = null
    this.inputManager = null
    
    // State
    this.initialized = false
    this.connected = false
    this.sessionActive = false
    
    // Statistics
    this.stats = {
      sessionsStarted: 0,
      totalPhaseTransitions: 0,
      syncErrors: 0,
      networkReconnects: 0
    }
  }
  
  /**
   * Initialize the phase integration system
   */
  async initialize(gameStateManager, wasmManager, inputManager = null) {
    if (this.initialized) {
      this.logger.warn('Already initialized')
      return
    }
    
    this.gameStateManager = gameStateManager
    this.wasmManager = wasmManager
    this.inputManager = inputManager
    
    try {
      // Create phase manager
      this.phaseManager = new MultiplayerPhaseManager({
        syncInterval: 100,
        phaseTimeout: 60000,
        autoTransition: true,
        requireConsensus: this.config.reconciliationStrategy !== 'host-authoritative',
        consensusThreshold: 0.75,
        reconciliationStrategy: this.config.reconciliationStrategy,
        enablePhaseTimers: this.config.phaseTimersEnabled,
        enablePhaseVoting: this.config.phaseVotingEnabled,
        logLevel: this.config.logLevel
      })
      
      // Create network adapter
      this.networkAdapter = new PhaseSyncNetworkAdapter({
        protocol: this.config.networkProtocol,
        websocketUrl: this.config.websocketUrl,
        reconnectAttempts: 3,
        reconnectDelay: 1000,
        heartbeatInterval: 5000,
        compressionEnabled: true,
        logLevel: this.config.logLevel
      })
      
      // Create UI if enabled
      if (this.config.uiEnabled) {
        this.phaseUI = new MultiplayerPhaseUI({
          containerId: 'multiplayer-phase-ui',
          showTimer: true,
          showPlayerStates: true,
          showTransitions: true,
          showSyncStatus: true,
          position: 'top-right'
        })
      }
      
      // Initialize enhanced multiplayer sync if available
      if (this.config.enhancedSyncEnabled) {
        this.multiplayerSync = new EnhancedMultiplayerSync({
          maxPlayers: 8,
          enableRollback: true,
          enableDesyncDetection: true,
          enableHostMigration: true,
          enableNetworkDiagnostics: true,
          enablePerformanceOptimization: true,
          logLevel: this.config.logLevel
        })
      }
      
      // Set up component connections
      this.setupConnections()
      
      // Register event handlers
      this.registerEventHandlers()
      
      this.initialized = true
      this.logger.info('Phase integration initialized successfully')
      
      // Auto-initialize UI if enabled
      if (this.config.autoInitialize && this.phaseUI) {
        this.phaseUI.initialize(this.phaseManager)
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize phase integration', {
        error: error.message
      })
      throw error
    }
  }
  
  /**
   * Set up connections between components
   */
  setupConnections() {
    // Initialize phase manager with game references
    this.phaseManager.initialize(
      this.gameStateManager,
      this.networkAdapter,
      this.wasmManager,
      {
        onPhaseChanged: (data) => this.handlePhaseChanged(data),
        onPhaseTransitionStart: (data) => this.handlePhaseTransitionStart(data),
        onPhaseTransitionEnd: (data) => this.handlePhaseTransitionEnd(data),
        onPhaseSyncError: (data) => this.handlePhaseSyncError(data),
        onPhaseVoteStart: (data) => this.handlePhaseVoteStart(data),
        onPhaseVoteEnd: (data) => this.handlePhaseVoteEnd(data),
        onPhaseTimeout: (data) => this.handlePhaseTimeout(data)
      }
    )
    
    // Initialize network adapter with phase manager
    this.networkAdapter.initialize(
      this.phaseManager,
      this.getLocalPlayerId(),
      this.getHostPlayerId()
    )
    
    // Initialize enhanced sync if available
    if (this.multiplayerSync) {
      this.multiplayerSync.initialize(
        {
          wasmModule: this.wasmManager,
          saveState: () => this.saveGameState(),
          loadState: (state) => this.loadGameState(state),
          advanceFrame: (dt) => this.advanceGameFrame(dt),
          getChecksum: () => this.getGameChecksum(),
          pauseGame: () => this.pauseGame(),
          resumeGame: () => this.resumeGame()
        },
        {
          sendToPeer: (peerId, message) => this.networkAdapter.sendToPeer(peerId, message),
          broadcastMessage: (message) => this.networkAdapter.broadcast(message),
          getPeerConnection: (peerId) => this.networkAdapter.peers.get(peerId),
          onPeerConnected: (callback) => { this.onPeerConnected = callback },
          onPeerDisconnected: (callback) => { this.onPeerDisconnected = callback }
        }
      )
    }
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // Game state manager events
    if (this.gameStateManager) {
      this.gameStateManager.on('phaseChanged', (phase) => {
        if (this.phaseManager && phase !== this.phaseManager.state.currentPhase) {
          this.phaseManager.transitionToPhase(phase)
        }
      })
      
      this.gameStateManager.on('choiceCommitted', (data) => {
        this.logger.info('Choice committed', data)
      })
    }
    
    // Input manager events
    if (this.inputManager) {
      // Add phase-specific input handling
      this.inputManager.on('pausePressed', () => {
        if (this.config.phaseVotingEnabled) {
          this.initiatePhaseVote()
        }
      })
    }
  }
  
  /**
   * Start a multiplayer session
   */
  async startSession(sessionConfig = {}) {
    if (!this.initialized) {
      throw new Error('Phase integration not initialized')
    }
    
    if (this.sessionActive) {
      this.logger.warn('Session already active')
      return
    }
    
    const config = {
      roomId: sessionConfig.roomId || `room_${Date.now()}`,
      playerId: sessionConfig.playerId || `player_${Math.random().toString(36).substr(2, 9)}`,
      isHost: sessionConfig.isHost !== false,
      maxPlayers: sessionConfig.maxPlayers || 4,
      ...sessionConfig
    }
    
    try {
      // Connect to network
      if (this.networkAdapter) {
        await this.networkAdapter.connect(config.websocketUrl)
        this.connected = true
      }
      
      // Start multiplayer sync
      if (this.multiplayerSync) {
        if (config.isHost) {
          await this.multiplayerSync.startAsHost(config.playerId, config)
        } else {
          await this.multiplayerSync.joinAsClient(config.playerId, config.hostId)
        }
      }
      
      // Start phase synchronization
      this.phaseManager.startSyncTimer()
      
      // Update UI
      if (this.phaseUI && !this.phaseUI.initialized) {
        this.phaseUI.initialize(this.phaseManager)
      }
      
      this.sessionActive = true
      this.stats.sessionsStarted++
      
      this.logger.info('Multiplayer session started', config)
      
      // Trigger initial phase sync
      this.phaseManager.performPhaseSync()
      
    } catch (error) {
      this.logger.error('Failed to start session', {
        error: error.message
      })
      throw error
    }
  }
  
  /**
   * End the current multiplayer session
   */
  endSession() {
    if (!this.sessionActive) {
      this.logger.warn('No active session')
      return
    }
    
    // Stop phase synchronization
    this.phaseManager.stopSyncTimer()
    
    // Disconnect from network
    if (this.networkAdapter) {
      this.networkAdapter.disconnect()
      this.connected = false
    }
    
    // Shutdown multiplayer sync
    if (this.multiplayerSync) {
      this.multiplayerSync.shutdown()
    }
    
    // Reset phase manager
    this.phaseManager.reset()
    
    this.sessionActive = false
    
    this.logger.info('Multiplayer session ended')
  }
  
  /**
   * Force a phase transition
   */
  forcePhaseTransition(targetPhase) {
    if (!this.phaseManager) {
      this.logger.error('Phase manager not initialized')
      return false
    }
    
    return this.phaseManager.transitionToPhase(targetPhase, true)
  }
  
  /**
   * Initiate a phase vote
   */
  initiatePhaseVote(proposedPhase = null) {
    if (!this.phaseManager || !this.config.phaseVotingEnabled) {
      return false
    }
    
    // If no phase specified, get next valid phase
    if (proposedPhase === null) {
      proposedPhase = this.phaseManager.getDefaultNextPhase(
        this.phaseManager.state.currentPhase
      )
    }
    
    return this.phaseManager.initiatePhaseVote(proposedPhase)
  }
  
  /**
   * Event handlers
   */
  
  handlePhaseChanged(data) {
    this.stats.totalPhaseTransitions++
    
    this.logger.info('Phase changed', data)
    
    // Update game state
    if (this.gameStateManager) {
      this.gameStateManager.phaseState.currentPhase = data.to
    }
    
    // Update WASM
    if (this.wasmManager?.setPhase) {
      this.wasmManager.setPhase(data.to)
    }
    
    // Emit global event
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('phaseChanged', { detail: data }))
    }
  }
  
  handlePhaseTransitionStart(data) {
    this.logger.debug('Phase transition starting', data)
    
    // Pause game during transition if needed
    if (data.forced) {
      this.pauseGame()
    }
  }
  
  handlePhaseTransitionEnd(data) {
    this.logger.debug('Phase transition completed', data)
    
    // Resume game after transition
    if (data.success) {
      this.resumeGame()
    }
  }
  
  handlePhaseSyncError(data) {
    this.stats.syncErrors++
    
    this.logger.warn('Phase sync error', data)
    
    // Attempt recovery
    if (this.config.autoRecovery) {
      this.attemptRecovery()
    }
  }
  
  handlePhaseVoteStart(data) {
    this.logger.info('Phase vote started', data)
    
    // Show vote UI if available
    if (this.phaseUI) {
      // UI handles this automatically
    }
  }
  
  handlePhaseVoteEnd(data) {
    this.logger.info('Phase vote ended', data)
  }
  
  handlePhaseTimeout(data) {
    this.logger.warn('Phase timeout', data)
  }
  
  /**
   * Helper methods
   */
  
  getLocalPlayerId() {
    return this.gameStateManager?.sessionState?.localPlayerId || 
           `player_${Math.random().toString(36).substr(2, 9)}`
  }
  
  getHostPlayerId() {
    if (this.gameStateManager?.sessionState?.isHost) {
      return this.getLocalPlayerId()
    }
    
    // Find host from players
    if (this.gameStateManager?.sessionState?.players) {
      for (const [playerId, player] of this.gameStateManager.sessionState.players) {
        if (player.isHost) {
          return playerId
        }
      }
    }
    
    return null
  }
  
  saveGameState() {
    if (this.wasmManager?.saveState) {
      return this.wasmManager.saveState()
    }
    
    return {
      phase: this.phaseManager?.state?.currentPhase,
      timestamp: Date.now()
    }
  }
  
  loadGameState(state) {
    if (this.wasmManager?.loadState) {
      this.wasmManager.loadState(state)
    }
    
    if (state.phase !== undefined && this.phaseManager) {
      this.phaseManager.state.currentPhase = state.phase
    }
  }
  
  advanceGameFrame(deltaTime) {
    if (this.gameStateManager) {
      this.gameStateManager.update(deltaTime, {})
    }
  }
  
  getGameChecksum() {
    if (this.wasmManager?.getChecksum) {
      return this.wasmManager.getChecksum()
    }
    
    // Simple checksum based on phase and time
    return `${this.phaseManager?.state?.currentPhase}_${Date.now()}`
  }
  
  pauseGame() {
    if (this.gameStateManager) {
      this.gameStateManager.pauseGame()
    }
  }
  
  resumeGame() {
    if (this.gameStateManager) {
      this.gameStateManager.resumeGame()
    }
  }
  
  attemptRecovery() {
    this.logger.info('Attempting phase recovery')
    
    // Request validation from peers
    if (this.phaseManager) {
      this.phaseManager.validatePhaseWithPeers().then(isValid => {
        if (!isValid) {
          // Force reconciliation
          this.phaseManager.attemptPhaseReconciliation()
        }
      })
    }
  }
  
  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      connected: this.connected,
      sessionActive: this.sessionActive,
      currentPhase: this.phaseManager?.state?.currentPhase,
      phaseStats: this.phaseManager?.getPhaseStats(),
      networkStats: this.networkAdapter?.getNetworkStats(),
      syncStatus: this.multiplayerSync?.getSystemStatus(),
      integrationStats: this.stats
    }
  }
  
  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      status: this.getStatus(),
      phaseHistory: this.getPhaseHistory(),
      networkInfo: this.networkAdapter?.getPeerInfo(),
      recommendations: this.getRecommendations()
    }
    
    if (this.config.debugMode) {
      diagnostics.debug = {
        phaseManager: this.phaseManager?.state,
        networkAdapter: this.networkAdapter?.connectionState,
        multiplayerSync: this.multiplayerSync?.sessionState
      }
    }
    
    return diagnostics
  }
  
  /**
   * Get phase transition history
   */
  getPhaseHistory() {
    // This would ideally be tracked, but for now return current state
    return [{
      phase: this.phaseManager?.state?.currentPhase,
      timestamp: this.phaseManager?.state?.phaseStartTime
    }]
  }
  
  /**
   * Get system recommendations
   */
  getRecommendations() {
    const recommendations = []
    
    // Check sync health
    if (this.phaseManager) {
      const syncHealth = this.phaseManager.calculateSyncHealth()
      if (syncHealth < 0.5) {
        recommendations.push({
          type: 'error',
          message: 'Poor phase synchronization detected. Check network connection.',
          priority: 'high'
        })
      }
    }
    
    // Check network status
    if (this.networkAdapter) {
      const stats = this.networkAdapter.getNetworkStats()
      if (stats.averageLatency > 200) {
        recommendations.push({
          type: 'warning',
          message: 'High network latency detected. Game experience may be affected.',
          priority: 'medium'
        })
      }
    }
    
    // Check sync errors
    if (this.stats.syncErrors > 10) {
      recommendations.push({
        type: 'warning',
        message: 'Multiple sync errors detected. Consider restarting the session.',
        priority: 'medium'
      })
    }
    
    return recommendations
  }
  
  /**
   * Shutdown the integration system
   */
  shutdown() {
    this.logger.info('Shutting down phase integration')
    
    // End active session
    if (this.sessionActive) {
      this.endSession()
    }
    
    // Shutdown components
    if (this.phaseManager) {
      this.phaseManager.shutdown()
      this.phaseManager = null
    }
    
    if (this.networkAdapter) {
      this.networkAdapter.shutdown()
      this.networkAdapter = null
    }
    
    if (this.phaseUI) {
      this.phaseUI.destroy()
      this.phaseUI = null
    }
    
    if (this.multiplayerSync) {
      this.multiplayerSync.shutdown()
      this.multiplayerSync = null
    }
    
    // Clear references
    this.gameStateManager = null
    this.wasmManager = null
    this.inputManager = null
    
    this.initialized = false
    
    this.logger.info('Phase integration shutdown complete')
  }
}

// Export singleton instance for easy access
export const phaseIntegration = new MultiplayerPhaseIntegration()

export default MultiplayerPhaseIntegration