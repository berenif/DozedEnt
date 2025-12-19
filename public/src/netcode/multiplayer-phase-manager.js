/**
 * Multiplayer Phase Manager
 * Handles phase synchronization across all connected clients in multiplayer games
 * Ensures all players experience consistent phase transitions and timing
 */

import { createLogger } from '../utils/logger.js'

// Phase definitions matching the WASM game logic
export const GAME_PHASES = {
  EXPLORE: 0,
  FIGHT: 1,
  CHOOSE: 2,
  SHOP: 3,
  RISK: 4,
  ESCALATE: 5,
  CASH_OUT: 6,
  RESET: 7,
  GAME_OVER: 8
}

// Phase metadata for validation and UI
export const PHASE_CONFIG = {
  [GAME_PHASES.EXPLORE]: {
    name: 'Explore',
    description: 'Explore the world and gather resources',
    allowsMovement: true,
    allowsCombat: false,
    requiresSync: false,
    minDuration: 0,
    maxDuration: 0, // No time limit
    transitions: [GAME_PHASES.FIGHT, GAME_PHASES.CHOOSE]
  },
  [GAME_PHASES.FIGHT]: {
    name: 'Fight',
    description: 'Engage in combat with enemies',
    allowsMovement: true,
    allowsCombat: true,
    requiresSync: true,
    minDuration: 3000,
    maxDuration: 120000, // 2 minutes max
    transitions: [GAME_PHASES.CHOOSE, GAME_PHASES.RISK, GAME_PHASES.GAME_OVER]
  },
  [GAME_PHASES.CHOOSE]: {
    name: 'Choose',
    description: 'Select your next action',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 2000,
    maxDuration: 30000, // 30 seconds to choose
    transitions: [GAME_PHASES.EXPLORE, GAME_PHASES.FIGHT, GAME_PHASES.SHOP]
  },
  [GAME_PHASES.SHOP]: {
    name: 'Shop',
    description: 'Purchase items and upgrades',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 3000,
    maxDuration: 60000, // 1 minute max
    transitions: [GAME_PHASES.EXPLORE, GAME_PHASES.CHOOSE]
  },
  [GAME_PHASES.RISK]: {
    name: 'Risk',
    description: 'Take a calculated risk',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 2000,
    maxDuration: 20000,
    transitions: [GAME_PHASES.ESCALATE, GAME_PHASES.CASH_OUT, GAME_PHASES.GAME_OVER]
  },
  [GAME_PHASES.ESCALATE]: {
    name: 'Escalate',
    description: 'Increase the stakes',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 2000,
    maxDuration: 20000,
    transitions: [GAME_PHASES.RISK, GAME_PHASES.CASH_OUT, GAME_PHASES.GAME_OVER]
  },
  [GAME_PHASES.CASH_OUT]: {
    name: 'Cash Out',
    description: 'Collect your rewards',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 2000,
    maxDuration: 30000,
    transitions: [GAME_PHASES.EXPLORE, GAME_PHASES.CHOOSE]
  },
  [GAME_PHASES.RESET]: {
    name: 'Reset',
    description: 'Resetting game state',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 1000,
    maxDuration: 5000,
    transitions: [GAME_PHASES.EXPLORE]
  },
  [GAME_PHASES.GAME_OVER]: {
    name: 'Game Over',
    description: 'Game has ended',
    allowsMovement: false,
    allowsCombat: false,
    requiresSync: true,
    minDuration: 3000,
    maxDuration: 0, // No limit
    transitions: [GAME_PHASES.RESET, GAME_PHASES.EXPLORE]
  }
}

export class MultiplayerPhaseManager {
  constructor(config = {}) {
    this.config = {
      syncInterval: config.syncInterval || 100, // ms between sync checks
      phaseTimeout: config.phaseTimeout || 60000, // Default phase timeout
      autoTransition: config.autoTransition !== false,
      requireConsensus: config.requireConsensus !== false,
      consensusThreshold: config.consensusThreshold || 0.75,
      reconciliationStrategy: config.reconciliationStrategy || 'host-authoritative',
      enablePhaseTimers: config.enablePhaseTimers !== false,
      enablePhaseVoting: config.enablePhaseVoting !== false,
      logLevel: config.logLevel || 'info',
      ...config
    }
    
    this.logger = createLogger({
      level: this.config.logLevel,
      prefix: '[PhaseManager]'
    })
    
    // Current phase state
    this.state = {
      currentPhase: GAME_PHASES.EXPLORE,
      previousPhase: null,
      phaseStartTime: 0,
      phaseEndTime: 0,
      transitionInProgress: false,
      pendingTransition: null,
      lastSyncTime: 0,
      syncSequence: 0
    }
    
    // Player phase states
    this.playerStates = new Map() // playerId -> { phase, timestamp, sequence, ready }
    
    // Phase voting system
    this.phaseVotes = new Map() // playerId -> proposedPhase
    this.voteStartTime = 0
    this.voteDuration = 10000 // 10 seconds to vote
    
    // Phase timers
    this.phaseTimer = null
    this.syncTimer = null
    
    // Network integration
    this.networkManager = null
    this.wasmManager = null
    this.gameStateManager = null
    
    // Event handlers
    this.eventHandlers = {
      onPhaseChanged: null,
      onPhaseTransitionStart: null,
      onPhaseTransitionEnd: null,
      onPhaseSyncError: null,
      onPhaseVoteStart: null,
      onPhaseVoteEnd: null,
      onPhaseTimeout: null
    }
    
    // Statistics
    this.stats = {
      totalTransitions: 0,
      syncErrors: 0,
      timeouts: 0,
      votesInitiated: 0,
      consensusReached: 0,
      forcedTransitions: 0
    }
  }
  
  /**
   * Initialize the phase manager with game and network managers
   */
  initialize(gameStateManager, networkManager, wasmManager, eventHandlers = {}) {
    this.gameStateManager = gameStateManager
    this.networkManager = networkManager
    this.wasmManager = wasmManager
    this.eventHandlers = { ...this.eventHandlers, ...eventHandlers }
    
    // Set initial phase from WASM if available
    if (this.wasmManager?.getPhase) {
      this.state.currentPhase = this.wasmManager.getPhase()
    }
    
    // Start sync timer
    this.startSyncTimer()
    
    // Register network message handlers
    this.registerNetworkHandlers()
    
    this.logger.info('Phase manager initialized', {
      currentPhase: this.state.currentPhase,
      config: this.config
    })
  }
  
  /**
   * Register network message handlers
   */
  registerNetworkHandlers() {
    if (!this.networkManager) {return}
    
    // Handle phase sync messages
    this.networkManager.on('phase_sync', (data, senderId) => {
      this.handlePhaseSyncMessage(data, senderId)
    })
    
    // Handle phase transition requests
    this.networkManager.on('phase_transition', (data, senderId) => {
      this.handlePhaseTransitionRequest(data, senderId)
    })
    
    // Handle phase votes
    this.networkManager.on('phase_vote', (data, senderId) => {
      this.handlePhaseVote(data, senderId)
    })
    
    // Handle phase validation requests
    this.networkManager.on('phase_validate', (data, senderId) => {
      this.handlePhaseValidationRequest(data, senderId)
    })
  }
  
  /**
   * Start the synchronization timer
   */
  startSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }
    
    this.syncTimer = setInterval(() => {
      this.performPhaseSync()
    }, this.config.syncInterval)
  }
  
  /**
   * Stop the synchronization timer
   */
  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }
  
  /**
   * Perform phase synchronization
   */
  performPhaseSync() {
    const now = performance.now()
    
    // Check if we need to sync
    if (now - this.state.lastSyncTime < this.config.syncInterval) {
      return
    }
    
    // Get current phase from WASM
    const wasmPhase = this.wasmManager?.getPhase?.() ?? this.state.currentPhase
    
    // Check for phase mismatch
    if (wasmPhase !== this.state.currentPhase) {
      this.logger.warn('Phase mismatch detected', {
        localPhase: this.state.currentPhase,
        wasmPhase
      })
      this.reconcilePhase(wasmPhase)
    }
    
    // Broadcast our phase state
    this.broadcastPhaseState()
    
    // Check for phase timeout
    if (this.config.enablePhaseTimers) {
      this.checkPhaseTimeout()
    }
    
    // Check for consensus if voting is active
    if (this.phaseVotes.size > 0) {
      this.checkVoteConsensus()
    }
    
    this.state.lastSyncTime = now
  }
  
  /**
   * Broadcast current phase state to all peers
   */
  broadcastPhaseState() {
    if (!this.networkManager) {return}
    
    const phaseData = {
      phase: this.state.currentPhase,
      previousPhase: this.state.previousPhase,
      timestamp: performance.now(),
      sequence: ++this.state.syncSequence,
      startTime: this.state.phaseStartTime,
      transitionInProgress: this.state.transitionInProgress
    }
    
    this.networkManager.broadcast({
      type: 'phase_sync',
      data: phaseData
    })
  }
  
  /**
   * Handle phase sync message from peer
   */
  handlePhaseSyncMessage(data, senderId) {
    // Update player state
    this.playerStates.set(senderId, {
      phase: data.phase,
      timestamp: data.timestamp,
      sequence: data.sequence,
      startTime: data.startTime,
      ready: !data.transitionInProgress
    })
    
    // Check for desync
    if (data.phase !== this.state.currentPhase && !this.state.transitionInProgress) {
      this.logger.warn('Phase desync detected from peer', {
        peerId: senderId,
        peerPhase: data.phase,
        localPhase: this.state.currentPhase
      })
      
      // Attempt reconciliation
      this.attemptPhaseReconciliation()
    }
  }
  
  /**
   * Transition to a new phase
   */
  async transitionToPhase(newPhase, forced = false) {
    // Validate transition
    if (!this.isValidTransition(this.state.currentPhase, newPhase) && !forced) {
      this.logger.error('Invalid phase transition', {
        from: this.state.currentPhase,
        to: newPhase
      })
      return false
    }
    
    // Check if already transitioning
    if (this.state.transitionInProgress && !forced) {
      this.logger.warn('Phase transition already in progress')
      return false
    }
    
    this.state.transitionInProgress = true
    this.state.pendingTransition = newPhase
    
    // Notify transition start
    this.notifyEvent('onPhaseTransitionStart', {
      from: this.state.currentPhase,
      to: newPhase,
      forced
    })
    
    // Broadcast transition intent
    if (this.networkManager) {
      this.networkManager.broadcast({
        type: 'phase_transition',
        data: {
          from: this.state.currentPhase,
          to: newPhase,
          timestamp: performance.now(),
          forced
        }
      })
    }
    
    // Wait for consensus if required
    if (this.config.requireConsensus && !forced) {
      const hasConsensus = await this.waitForConsensus(newPhase)
      if (!hasConsensus) {
        this.logger.warn('Failed to reach consensus for phase transition', {
          to: newPhase
        })
        this.state.transitionInProgress = false
        this.state.pendingTransition = null
        return false
      }
    }
    
    // Execute transition
    this.executePhaseTransition(newPhase)
    
    return true
  }
  
  /**
   * Execute the phase transition
   */
  executePhaseTransition(newPhase) {
    const oldPhase = this.state.currentPhase
    
    // Update state
    this.state.previousPhase = oldPhase
    this.state.currentPhase = newPhase
    this.state.phaseStartTime = performance.now()
    this.state.transitionInProgress = false
    this.state.pendingTransition = null
    
    // Update WASM if available
    if (this.wasmManager?.setPhase) {
      this.wasmManager.setPhase(newPhase)
    }
    
    // Update game state manager
    if (this.gameStateManager) {
      this.gameStateManager.phaseState.currentPhase = newPhase
      this.gameStateManager.emit('phaseChanged', newPhase)
    }
    
    // Start phase timer if applicable
    if (this.config.enablePhaseTimers) {
      this.startPhaseTimer(newPhase)
    }
    
    // Clear votes
    this.phaseVotes.clear()
    
    // Update stats
    this.stats.totalTransitions++
    
    // Notify phase change
    this.notifyEvent('onPhaseChanged', {
      from: oldPhase,
      to: newPhase,
      timestamp: this.state.phaseStartTime
    })
    
    // Notify transition end
    this.notifyEvent('onPhaseTransitionEnd', {
      from: oldPhase,
      to: newPhase,
      success: true
    })
    
    this.logger.info('Phase transition completed', {
      from: oldPhase,
      to: newPhase
    })
  }
  
  /**
   * Handle phase transition request from peer
   */
  handlePhaseTransitionRequest(data, senderId) {
    const { from, to, forced } = data
    
    // Validate sender authority (host in host-authoritative mode)
    if (this.config.reconciliationStrategy === 'host-authoritative') {
      const isHost = this.isPlayerHost(senderId)
      if (!isHost && !forced) {
        this.logger.warn('Non-host attempted phase transition', {
          senderId,
          from,
          to
        })
        return
      }
    }
    
    // Validate transition
    if (!this.isValidTransition(from, to) && !forced) {
      this.logger.warn('Invalid phase transition requested', {
        senderId,
        from,
        to
      })
      return
    }
    
    // Apply transition
    if (from === this.state.currentPhase) {
      this.transitionToPhase(to, forced)
    }
  }
  
  /**
   * Start a phase timer
   */
  startPhaseTimer(phase) {
    // Clear existing timer
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    
    const config = PHASE_CONFIG[phase]
    if (!config || !config.maxDuration || config.maxDuration === 0) {
      return
    }
    
    this.state.phaseEndTime = this.state.phaseStartTime + config.maxDuration
    
    this.phaseTimer = setTimeout(() => {
      this.handlePhaseTimeout(phase)
    }, config.maxDuration)
  }
  
  /**
   * Check for phase timeout
   */
  checkPhaseTimeout() {
    if (!this.state.phaseEndTime || this.state.phaseEndTime === 0) {
      return
    }
    
    const now = performance.now()
    if (now >= this.state.phaseEndTime) {
      this.handlePhaseTimeout(this.state.currentPhase)
    }
  }
  
  /**
   * Handle phase timeout
   */
  handlePhaseTimeout(phase) {
    this.logger.warn('Phase timeout', { phase })
    this.stats.timeouts++
    
    // Notify timeout
    this.notifyEvent('onPhaseTimeout', {
      phase,
      duration: performance.now() - this.state.phaseStartTime
    })
    
    // Auto-transition if enabled
    if (this.config.autoTransition) {
      const nextPhase = this.getDefaultNextPhase(phase)
      if (nextPhase !== null) {
        this.transitionToPhase(nextPhase, true)
      }
    }
  }
  
  /**
   * Get default next phase for auto-transition
   */
  getDefaultNextPhase(currentPhase) {
    const config = PHASE_CONFIG[currentPhase]
    if (!config || !config.transitions || config.transitions.length === 0) {
      return null
    }
    
    // Return first valid transition
    return config.transitions[0]
  }
  
  /**
   * Check if a phase transition is valid
   */
  isValidTransition(from, to) {
    const config = PHASE_CONFIG[from]
    if (!config) {return false}
    
    return config.transitions.includes(to)
  }
  
  /**
   * Initiate phase voting
   */
  initiatePhaseVote(proposedPhase, duration = null) {
    if (!this.config.enablePhaseVoting) {
      this.logger.warn('Phase voting is disabled')
      return false
    }
    
    // Check if valid transition
    if (!this.isValidTransition(this.state.currentPhase, proposedPhase)) {
      this.logger.warn('Invalid phase for voting', {
        current: this.state.currentPhase,
        proposed: proposedPhase
      })
      return false
    }
    
    // Clear existing votes
    this.phaseVotes.clear()
    
    // Set vote duration
    this.voteStartTime = performance.now()
    this.voteDuration = duration || this.config.voteDuration || 10000
    
    // Add initiator's vote
    const localId = this.gameStateManager?.sessionState?.localPlayerId || 'local'
    this.phaseVotes.set(localId, proposedPhase)
    
    // Broadcast vote request
    if (this.networkManager) {
      this.networkManager.broadcast({
        type: 'phase_vote',
        data: {
          action: 'initiate',
          proposedPhase,
          duration: this.voteDuration,
          timestamp: this.voteStartTime
        }
      })
    }
    
    // Notify vote start
    this.notifyEvent('onPhaseVoteStart', {
      proposedPhase,
      duration: this.voteDuration
    })
    
    this.stats.votesInitiated++
    
    // Set timeout for vote end
    setTimeout(() => {
      this.concludePhaseVote()
    }, this.voteDuration)
    
    return true
  }
  
  /**
   * Handle phase vote from peer
   */
  handlePhaseVote(data, senderId) {
    const { action, proposedPhase, vote } = data
    
    if (action === 'initiate') {
      // Start voting if not already active
      if (this.phaseVotes.size === 0) {
        this.initiatePhaseVote(proposedPhase, data.duration)
      }
    } else if (action === 'cast') {
      // Record vote
      this.phaseVotes.set(senderId, vote)
      this.logger.debug('Vote received', { senderId, vote })
    }
  }
  
  /**
   * Cast a vote for a phase
   */
  castPhaseVote(phase) {
    if (this.phaseVotes.size === 0) {
      this.logger.warn('No active phase vote')
      return false
    }
    
    const localId = this.gameStateManager?.sessionState?.localPlayerId || 'local'
    this.phaseVotes.set(localId, phase)
    
    // Broadcast vote
    if (this.networkManager) {
      this.networkManager.broadcast({
        type: 'phase_vote',
        data: {
          action: 'cast',
          vote: phase,
          timestamp: performance.now()
        }
      })
    }
    
    return true
  }
  
  /**
   * Check if voting has reached consensus
   */
  checkVoteConsensus() {
    if (this.phaseVotes.size === 0) {return}
    
    const now = performance.now()
    if (now - this.voteStartTime < this.voteDuration) {
      return // Vote still in progress
    }
    
    this.concludePhaseVote()
  }
  
  /**
   * Conclude phase voting
   */
  concludePhaseVote() {
    if (this.phaseVotes.size === 0) {return}
    
    // Count votes
    const voteCounts = new Map()
    let maxVotes = 0
    let winningPhase = null
    
    for (const vote of this.phaseVotes.values()) {
      const count = (voteCounts.get(vote) || 0) + 1
      voteCounts.set(vote, count)
      
      if (count > maxVotes) {
        maxVotes = count
        winningPhase = vote
      }
    }
    
    // Check consensus threshold
    const totalPlayers = this.playerStates.size + 1 // +1 for local player
    const consensusRatio = maxVotes / totalPlayers
    
    const hasConsensus = consensusRatio >= this.config.consensusThreshold
    
    // Notify vote end
    this.notifyEvent('onPhaseVoteEnd', {
      winningPhase,
      votes: Object.fromEntries(voteCounts),
      consensusReached: hasConsensus,
      consensusRatio
    })
    
    // Clear votes
    this.phaseVotes.clear()
    
    // Transition if consensus reached
    if (hasConsensus && winningPhase !== null) {
      this.stats.consensusReached++
      this.transitionToPhase(winningPhase)
    }
  }
  
  /**
   * Wait for consensus on phase transition
   */
  async waitForConsensus(targetPhase, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = performance.now()
      
      const checkInterval = setInterval(() => {
        const elapsed = performance.now() - startTime
        
        // Check timeout
        if (elapsed > timeout) {
          clearInterval(checkInterval)
          resolve(false)
          return
        }
        
        // Check player states
        let agreeCount = 1 // Local player agrees
        let totalCount = 1
        
        for (const [playerId, state] of this.playerStates.entries()) {
          totalCount++
          if (state.phase === targetPhase || state.ready) {
            agreeCount++
          }
        }
        
        const consensusRatio = agreeCount / totalCount
        
        if (consensusRatio >= this.config.consensusThreshold) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 100)
    })
  }
  
  /**
   * Attempt to reconcile phase discrepancies
   */
  attemptPhaseReconciliation() {
    if (this.state.transitionInProgress) {
      return // Already handling transition
    }
    
    // Determine reconciliation strategy
    switch (this.config.reconciliationStrategy) {
      case 'host-authoritative':
        this.reconcileWithHost()
        break
      
      case 'majority-vote':
        this.reconcileWithMajority()
        break
      
      case 'latest-timestamp':
        this.reconcileWithLatest()
        break
      
      default:
        this.logger.error('Unknown reconciliation strategy', {
          strategy: this.config.reconciliationStrategy
        })
    }
  }
  
  /**
   * Reconcile phase with host
   */
  reconcileWithHost() {
    // Find host player
    let hostPhase = null
    
    for (const [playerId, state] of this.playerStates.entries()) {
      if (this.isPlayerHost(playerId)) {
        hostPhase = state.phase
        break
      }
    }
    
    if (hostPhase !== null && hostPhase !== this.state.currentPhase) {
      this.logger.info('Reconciling with host phase', {
        hostPhase,
        localPhase: this.state.currentPhase
      })
      this.reconcilePhase(hostPhase)
    }
  }
  
  /**
   * Reconcile phase with majority
   */
  reconcileWithMajority() {
    const phaseCounts = new Map()
    
    // Count local phase
    phaseCounts.set(this.state.currentPhase, 1)
    
    // Count peer phases
    for (const state of this.playerStates.values()) {
      const count = phaseCounts.get(state.phase) || 0
      phaseCounts.set(state.phase, count + 1)
    }
    
    // Find majority phase
    let maxCount = 0
    let majorityPhase = this.state.currentPhase
    
    for (const [phase, count] of phaseCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        majorityPhase = phase
      }
    }
    
    if (majorityPhase !== this.state.currentPhase) {
      this.logger.info('Reconciling with majority phase', {
        majorityPhase,
        localPhase: this.state.currentPhase,
        votes: Object.fromEntries(phaseCounts)
      })
      this.reconcilePhase(majorityPhase)
    }
  }
  
  /**
   * Reconcile phase with latest timestamp
   */
  reconcileWithLatest() {
    let latestPhase = this.state.currentPhase
    let latestTimestamp = this.state.phaseStartTime
    
    for (const state of this.playerStates.values()) {
      if (state.timestamp > latestTimestamp) {
        latestTimestamp = state.timestamp
        latestPhase = state.phase
      }
    }
    
    if (latestPhase !== this.state.currentPhase) {
      this.logger.info('Reconciling with latest phase', {
        latestPhase,
        localPhase: this.state.currentPhase
      })
      this.reconcilePhase(latestPhase)
    }
  }
  
  /**
   * Reconcile to a specific phase
   */
  reconcilePhase(targetPhase) {
    this.stats.syncErrors++
    
    // Force transition to target phase
    this.executePhaseTransition(targetPhase)
    
    // Notify sync error
    this.notifyEvent('onPhaseSyncError', {
      localPhase: this.state.currentPhase,
      targetPhase,
      strategy: this.config.reconciliationStrategy
    })
  }
  
  /**
   * Check if a player is the host
   */
  isPlayerHost(playerId) {
    // Check game state manager for host info
    if (this.gameStateManager?.sessionState?.players) {
      const player = this.gameStateManager.sessionState.players.get(playerId)
      return player?.isHost || false
    }
    
    // Fallback: first player is host
    const players = Array.from(this.playerStates.keys()).sort()
    return players[0] === playerId
  }
  
  /**
   * Handle phase validation request
   */
  handlePhaseValidationRequest(data, senderId) {
    const { requestId, phase, timestamp } = data
    
    // Validate phase
    const isValid = this.state.currentPhase === phase
    
    // Send response
    if (this.networkManager) {
      this.networkManager.sendToPeer(senderId, {
        type: 'phase_validate_response',
        data: {
          requestId,
          phase: this.state.currentPhase,
          isValid,
          timestamp: performance.now()
        }
      })
    }
  }
  
  /**
   * Request phase validation from peers
   */
  async validatePhaseWithPeers(timeout = 3000) {
    if (!this.networkManager) {return true}
    
    const requestId = `validate_${Date.now()}`
    const responses = []
    
    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        resolve(this.evaluateValidationResponses(responses))
      }, timeout)
      
      // Set up response handler
      const handleResponse = (data) => {
        if (data.requestId === requestId) {
          responses.push(data)
          
          // Check if we have all responses
          if (responses.length >= this.playerStates.size) {
            clearTimeout(timeoutHandle)
            resolve(this.evaluateValidationResponses(responses))
          }
        }
      }
      
      // Register handler
      this.networkManager.on('phase_validate_response', handleResponse)
      
      // Send validation request
      this.networkManager.broadcast({
        type: 'phase_validate',
        data: {
          requestId,
          phase: this.state.currentPhase,
          timestamp: performance.now()
        }
      })
    })
  }
  
  /**
   * Evaluate validation responses
   */
  evaluateValidationResponses(responses) {
    if (responses.length === 0) {return true}
    
    let validCount = 0
    for (const response of responses) {
      if (response.isValid) {
        validCount++
      }
    }
    
    const validRatio = validCount / responses.length
    return validRatio >= this.config.consensusThreshold
  }
  
  /**
   * Get current phase information
   */
  getCurrentPhaseInfo() {
    const config = PHASE_CONFIG[this.state.currentPhase]
    const elapsed = performance.now() - this.state.phaseStartTime
    const remaining = this.state.phaseEndTime ? 
      Math.max(0, this.state.phaseEndTime - performance.now()) : null
    
    return {
      phase: this.state.currentPhase,
      phaseName: config?.name || 'Unknown',
      description: config?.description || '',
      previousPhase: this.state.previousPhase,
      startTime: this.state.phaseStartTime,
      elapsed,
      remaining,
      allowsMovement: config?.allowsMovement || false,
      allowsCombat: config?.allowsCombat || false,
      transitionInProgress: this.state.transitionInProgress,
      pendingTransition: this.state.pendingTransition
    }
  }
  
  /**
   * Get phase statistics
   */
  getPhaseStats() {
    return {
      ...this.stats,
      currentPhase: this.state.currentPhase,
      playerCount: this.playerStates.size + 1,
      syncHealth: this.calculateSyncHealth()
    }
  }
  
  /**
   * Calculate synchronization health
   */
  calculateSyncHealth() {
    if (this.playerStates.size === 0) {return 1.0}
    
    let syncedCount = 0
    for (const state of this.playerStates.values()) {
      if (state.phase === this.state.currentPhase) {
        syncedCount++
      }
    }
    
    return syncedCount / this.playerStates.size
  }
  
  /**
   * Force phase synchronization
   */
  forcePhaseSync(phase) {
    this.logger.warn('Forcing phase sync', {
      from: this.state.currentPhase,
      to: phase
    })
    
    this.stats.forcedTransitions++
    this.transitionToPhase(phase, true)
  }
  
  /**
   * Notify event handlers
   */
  notifyEvent(eventName, data) {
    if (this.eventHandlers[eventName]) {
      try {
        this.eventHandlers[eventName](data)
      } catch (error) {
        this.logger.error('Event handler error', {
          eventName,
          error: error.message
        })
      }
    }
  }
  
  /**
   * Reset phase manager
   */
  reset() {
    this.state = {
      currentPhase: GAME_PHASES.EXPLORE,
      previousPhase: null,
      phaseStartTime: 0,
      phaseEndTime: 0,
      transitionInProgress: false,
      pendingTransition: null,
      lastSyncTime: 0,
      syncSequence: 0
    }
    
    this.playerStates.clear()
    this.phaseVotes.clear()
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    
    this.logger.info('Phase manager reset')
  }
  
  /**
   * Shutdown phase manager
   */
  shutdown() {
    this.stopSyncTimer()
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    
    this.playerStates.clear()
    this.phaseVotes.clear()
    
    this.logger.info('Phase manager shutdown')
  }
}

export default MultiplayerPhaseManager