# Phase 6: Multiplayer Phase Synchronization - Detailed Implementation Plan

## Overview

This plan provides comprehensive implementation details for Phase 6 of the missing features implementation: ensuring all players transition between game phases simultaneously in multiplayer games to prevent desync issues and maintain a cohesive gameplay experience.

## Current State Analysis

### What Already Exists:
1. **WASM Phase System**: 8 phases defined in `internal_core.h` with `GamePhase` enum
2. **Phase Transitions**: Handled deterministically in WASM via `g_phase` global variable
3. **Export Functions**: `get_phase()`, `force_phase_transition()` for phase management
4. **Multiplayer Infrastructure**: `EnhancedMultiplayerSync` class with rollback netcode and desync detection
5. **Room Management**: `RoomManager` for player coordination
6. **Host Authority**: Host-authoritative architecture already in place

### What's Missing:
1. **Phase Sync Messages**: No dedicated protocol for phase transition synchronization
2. **Transition Barriers**: No mechanism to wait for all players before transitioning
3. **Phase Validation**: No checks to ensure all players are in the same phase
4. **Recovery Mechanism**: No way to recover if players get out of sync on phases
5. **UI Feedback**: No indication when waiting for other players to transition

### Key Discoveries:
- Phase transitions happen automatically based on game events (e.g., 3 wolf kills → Choose phase)
- Current system has no multiplayer awareness for phase transitions
- `EnhancedMultiplayerSync` already handles message routing but lacks phase-specific logic
- Host authority pattern is established and can be extended for phase sync

## Desired End State

After implementation:
- All players transition to new phases simultaneously
- Host controls when phase transitions occur
- Players see a "waiting for players" indicator during transitions
- Automatic recovery if a player's phase gets out of sync
- Smooth, synchronized transitions with no gameplay interruption
- Phase transitions feel natural and coordinated in multiplayer

### Verification Criteria:
- All clients report the same phase at any given time
- Phase transitions occur within 100ms across all clients
- No player can advance phases independently
- Recovery from phase desync happens automatically
- UI shows clear feedback during transitions

## What We're NOT Doing

- Creating a voting system for phase transitions
- Allowing players to skip phases
- Implementing phase rollback (phases only move forward)
- Adding phase-specific networking optimizations
- Creating custom animations for each phase transition
- Building a phase replay system

## Implementation Approach

We'll implement a host-authoritative phase synchronization system with:
1. Phase transition requests from game logic
2. Host validation and broadcast
3. Client acknowledgment and synchronization
4. Recovery mechanisms for late-joining or desynced players
5. UI feedback during transitions

---

## Component 1: Phase Synchronization Protocol

### Overview
Define the message protocol and state machine for coordinating phase transitions across all players.

### Implementation Details:

#### Message Types
```javascript
// Phase sync message types
const PHASE_SYNC_MESSAGES = {
  // Host → Clients: Announce upcoming phase transition
  PHASE_TRANSITION_ANNOUNCE: 'phase_transition_announce',
  
  // Client → Host: Acknowledge readiness for transition
  PHASE_TRANSITION_READY: 'phase_transition_ready',
  
  // Host → Clients: Execute phase transition now
  PHASE_TRANSITION_EXECUTE: 'phase_transition_execute',
  
  // Client → Host: Confirm transition completed
  PHASE_TRANSITION_CONFIRMED: 'phase_transition_confirmed',
  
  // Host → Client: Force sync to correct phase
  PHASE_SYNC_CORRECTION: 'phase_sync_correction',
  
  // Any → Any: Request current phase state
  PHASE_STATE_REQUEST: 'phase_state_request',
  
  // Any → Any: Response with current phase state
  PHASE_STATE_RESPONSE: 'phase_state_response'
};
```

#### State Machine
```javascript
// Phase transition states
const PHASE_TRANSITION_STATES = {
  IDLE: 'idle',                    // No transition in progress
  ANNOUNCING: 'announcing',        // Host has announced transition
  WAITING_FOR_READY: 'waiting',    // Waiting for client acknowledgments
  EXECUTING: 'executing',           // Transition in progress
  CONFIRMING: 'confirming',         // Waiting for confirmations
  COMPLETED: 'completed'            // Transition complete
};
```

### Files to Create/Modify:

**File**: `src/netcode/phase-sync-protocol.js` (new)
```javascript
export const PhaseSyncProtocol = {
  messages: PHASE_SYNC_MESSAGES,
  states: PHASE_TRANSITION_STATES,
  
  // Timeout values (ms)
  timeouts: {
    readyTimeout: 2000,      // Max wait for ready acknowledgments
    executeTimeout: 500,     // Max wait for execution
    confirmTimeout: 1000,    // Max wait for confirmations
    recoveryTimeout: 3000    // Max wait for recovery
  },
  
  // Create phase transition announcement
  createAnnouncement(fromPhase, toPhase, reason) {
    return {
      type: PHASE_SYNC_MESSAGES.PHASE_TRANSITION_ANNOUNCE,
      fromPhase,
      toPhase,
      reason,
      timestamp: Date.now(),
      frame: null // Will be filled by netcode
    };
  },
  
  // Validate phase transition
  isValidTransition(fromPhase, toPhase) {
    const validTransitions = {
      0: [1],       // Explore → Fight
      1: [2],       // Fight → Choose
      2: [3],       // Choose → PowerUp
      3: [0, 4],    // PowerUp → Explore or Risk
      4: [0, 5],    // Risk → Explore or Escalate
      5: [6],       // Escalate → CashOut
      6: [7],       // CashOut → Reset
      7: [0]        // Reset → Explore
    };
    
    return validTransitions[fromPhase]?.includes(toPhase) ?? false;
  }
};
```

---

## Component 2: Phase Sync Manager

### Overview
Core manager that handles phase synchronization logic, integrating with the existing multiplayer system.

### Implementation Details:

**File**: `src/netcode/phase-sync-manager.js` (new)
```javascript
import { PhaseSyncProtocol } from './phase-sync-protocol.js';
import { createLogger } from '../utils/logger.js';

export class PhaseSyncManager {
  constructor(config = {}) {
    this.config = {
      enableAutoSync: config.enableAutoSync !== false,
      enableRecovery: config.enableRecovery !== false,
      strictMode: config.strictMode ?? true, // Reject invalid transitions
      logLevel: config.logLevel ?? 'info',
      ...config
    };
    
    this.logger = createLogger({
      level: this.config.logLevel,
      prefix: '[PhaseSync]'
    });
    
    // Core references
    this.wasmManager = null;
    this.hostAuthority = null;
    this.roomManager = null;
    this.networkManager = null;
    
    // Sync state
    this.syncState = {
      currentPhase: 0,
      targetPhase: null,
      transitionState: PhaseSyncProtocol.states.IDLE,
      readyPlayers: new Set(),
      confirmedPlayers: new Set(),
      transitionStartTime: 0,
      lastSyncTime: 0
    };
    
    // Player phase tracking
    this.playerPhases = new Map(); // playerId → phase
    
    // Pending transitions
    this.pendingTransition = null;
    this.transitionTimeoutId = null;
    
    // Statistics
    this.stats = {
      totalTransitions: 0,
      successfulTransitions: 0,
      failedTransitions: 0,
      recoveries: 0,
      avgTransitionTime: 0
    };
  }
  
  /**
   * Initialize the phase sync manager
   */
  initialize(wasmManager, hostAuthority, roomManager, networkManager) {
    this.wasmManager = wasmManager;
    this.hostAuthority = hostAuthority;
    this.roomManager = roomManager;
    this.networkManager = networkManager;
    
    // Get initial phase from WASM
    this.syncState.currentPhase = this.wasmManager.exports.get_phase();
    
    // Set up WASM phase monitoring
    this.startPhaseMonitoring();
    
    // Set up network message handlers
    this.setupMessageHandlers();
    
    this.logger.info('Phase sync manager initialized', {
      currentPhase: this.syncState.currentPhase,
      isHost: this.hostAuthority.isHost()
    });
  }
  
  /**
   * Monitor WASM for phase changes
   */
  startPhaseMonitoring() {
    this.phaseMonitorInterval = setInterval(() => {
      const wasmPhase = this.wasmManager.exports.get_phase();
      
      // Detect local phase change
      if (wasmPhase !== this.syncState.currentPhase && 
          this.syncState.transitionState === PhaseSyncProtocol.states.IDLE) {
        
        this.logger.info('Local phase change detected', {
          from: this.syncState.currentPhase,
          to: wasmPhase
        });
        
        // If we're host, initiate sync
        if (this.hostAuthority.isHost()) {
          this.initiatePhaseTransition(this.syncState.currentPhase, wasmPhase, 'game_event');
        } else {
          // Client detected phase change - this shouldn't happen in strict mode
          if (this.config.strictMode) {
            this.logger.error('Client phase changed without host coordination!');
            this.requestPhaseCorrection();
          }
        }
      }
    }, 100); // Check every 100ms
  }
  
  /**
   * Initiate a phase transition (host only)
   */
  async initiatePhaseTransition(fromPhase, toPhase, reason) {
    if (!this.hostAuthority.isHost()) {
      this.logger.error('Only host can initiate phase transitions');
      return false;
    }
    
    if (this.syncState.transitionState !== PhaseSyncProtocol.states.IDLE) {
      this.logger.warn('Transition already in progress');
      return false;
    }
    
    // Validate transition
    if (!PhaseSyncProtocol.isValidTransition(fromPhase, toPhase)) {
      this.logger.error('Invalid phase transition', { fromPhase, toPhase });
      return false;
    }
    
    this.logger.info('Initiating phase transition', { fromPhase, toPhase, reason });
    
    // Update state
    this.syncState.targetPhase = toPhase;
    this.syncState.transitionState = PhaseSyncProtocol.states.ANNOUNCING;
    this.syncState.readyPlayers.clear();
    this.syncState.confirmedPlayers.clear();
    this.syncState.transitionStartTime = Date.now();
    
    // Create and broadcast announcement
    const announcement = PhaseSyncProtocol.createAnnouncement(fromPhase, toPhase, reason);
    announcement.frame = this.getCurrentFrame();
    
    this.networkManager.broadcast(announcement);
    
    // Host is always ready
    this.syncState.readyPlayers.add(this.getLocalPlayerId());
    
    // Wait for ready responses
    this.syncState.transitionState = PhaseSyncProtocol.states.WAITING_FOR_READY;
    
    // Set timeout for ready responses
    this.transitionTimeoutId = setTimeout(() => {
      this.handleReadyTimeout();
    }, PhaseSyncProtocol.timeouts.readyTimeout);
    
    return true;
  }
  
  /**
   * Handle ready timeout - proceed with players who are ready
   */
  handleReadyTimeout() {
    const totalPlayers = this.roomManager.getPlayerCount();
    const readyPlayers = this.syncState.readyPlayers.size;
    
    this.logger.warn('Ready timeout reached', { 
      ready: readyPlayers, 
      total: totalPlayers 
    });
    
    // Proceed if majority are ready
    if (readyPlayers >= Math.ceil(totalPlayers * 0.5)) {
      this.executePhaseTransition();
    } else {
      // Abort transition
      this.abortTransition('insufficient_ready_players');
    }
  }
  
  /**
   * Execute the phase transition
   */
  executePhaseTransition() {
    if (!this.hostAuthority.isHost()) return;
    
    this.logger.info('Executing phase transition', {
      toPhase: this.syncState.targetPhase
    });
    
    // Clear timeout
    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
    
    // Update state
    this.syncState.transitionState = PhaseSyncProtocol.states.EXECUTING;
    
    // Broadcast execute command
    const executeMsg = {
      type: PhaseSyncProtocol.messages.PHASE_TRANSITION_EXECUTE,
      phase: this.syncState.targetPhase,
      frame: this.getCurrentFrame() + 2, // Execute 2 frames in future
      timestamp: Date.now()
    };
    
    this.networkManager.broadcast(executeMsg);
    
    // Execute locally
    this.performLocalTransition(this.syncState.targetPhase);
    
    // Wait for confirmations
    this.syncState.transitionState = PhaseSyncProtocol.states.CONFIRMING;
    
    this.transitionTimeoutId = setTimeout(() => {
      this.handleConfirmationTimeout();
    }, PhaseSyncProtocol.timeouts.confirmTimeout);
  }
  
  /**
   * Perform local phase transition
   */
  performLocalTransition(toPhase) {
    this.wasmManager.exports.force_phase_transition(toPhase);
    this.syncState.currentPhase = toPhase;
    this.syncState.lastSyncTime = Date.now();
    
    // Trigger UI update
    this.onPhaseChanged(toPhase);
  }
  
  /**
   * Handle confirmation timeout
   */
  handleConfirmationTimeout() {
    const totalPlayers = this.roomManager.getPlayerCount();
    const confirmedPlayers = this.syncState.confirmedPlayers.size;
    
    this.logger.info('Transition completed', {
      confirmed: confirmedPlayers,
      total: totalPlayers,
      duration: Date.now() - this.syncState.transitionStartTime
    });
    
    // Complete transition
    this.completeTransition();
  }
  
  /**
   * Complete the transition
   */
  completeTransition() {
    // Update statistics
    this.stats.totalTransitions++;
    this.stats.successfulTransitions++;
    const duration = Date.now() - this.syncState.transitionStartTime;
    this.stats.avgTransitionTime = 
      (this.stats.avgTransitionTime * (this.stats.totalTransitions - 1) + duration) / 
      this.stats.totalTransitions;
    
    // Reset state
    this.syncState.transitionState = PhaseSyncProtocol.states.IDLE;
    this.syncState.targetPhase = null;
    this.syncState.readyPlayers.clear();
    this.syncState.confirmedPlayers.clear();
    
    this.logger.info('Phase transition completed', {
      newPhase: this.syncState.currentPhase,
      duration
    });
  }
  
  /**
   * Abort transition
   */
  abortTransition(reason) {
    this.logger.warn('Aborting phase transition', { reason });
    
    this.stats.totalTransitions++;
    this.stats.failedTransitions++;
    
    // Reset state
    this.syncState.transitionState = PhaseSyncProtocol.states.IDLE;
    this.syncState.targetPhase = null;
    this.syncState.readyPlayers.clear();
    this.syncState.confirmedPlayers.clear();
    
    // Clear timeout
    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
    
    // Notify clients to stay in current phase
    if (this.hostAuthority.isHost()) {
      this.broadcastPhaseCorrection(this.syncState.currentPhase);
    }
  }
  
  /**
   * Setup network message handlers
   */
  setupMessageHandlers() {
    // Handler map
    this.messageHandlers = {
      [PhaseSyncProtocol.messages.PHASE_TRANSITION_ANNOUNCE]: 
        (msg, sender) => this.handleTransitionAnnounce(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_TRANSITION_READY]: 
        (msg, sender) => this.handleTransitionReady(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_TRANSITION_EXECUTE]: 
        (msg, sender) => this.handleTransitionExecute(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_TRANSITION_CONFIRMED]: 
        (msg, sender) => this.handleTransitionConfirmed(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_SYNC_CORRECTION]: 
        (msg, sender) => this.handleSyncCorrection(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_STATE_REQUEST]: 
        (msg, sender) => this.handleStateRequest(msg, sender),
      
      [PhaseSyncProtocol.messages.PHASE_STATE_RESPONSE]: 
        (msg, sender) => this.handleStateResponse(msg, sender)
    };
  }
  
  /**
   * Handle incoming network message
   */
  handleMessage(message, senderId) {
    const handler = this.messageHandlers[message.type];
    if (handler) {
      handler(message, senderId);
    }
  }
  
  /**
   * Message handlers
   */
  
  handleTransitionAnnounce(message, senderId) {
    // Only process if from host
    if (!this.isHost(senderId)) {
      this.logger.warn('Received transition announce from non-host', { senderId });
      return;
    }
    
    this.logger.info('Received transition announcement', {
      from: message.fromPhase,
      to: message.toPhase,
      reason: message.reason
    });
    
    // Validate we're in the correct phase
    const currentPhase = this.wasmManager.exports.get_phase();
    if (currentPhase !== message.fromPhase) {
      this.logger.error('Phase mismatch on transition', {
        local: currentPhase,
        expected: message.fromPhase
      });
      // Request correction
      this.requestPhaseCorrection();
      return;
    }
    
    // Update state
    this.syncState.targetPhase = message.toPhase;
    this.syncState.transitionState = PhaseSyncProtocol.states.ANNOUNCING;
    
    // Show UI feedback
    this.onTransitionAnnounced(message.fromPhase, message.toPhase);
    
    // Send ready response
    this.sendReadyResponse();
  }
  
  handleTransitionReady(message, senderId) {
    if (!this.hostAuthority.isHost()) return;
    
    this.logger.debug('Player ready for transition', { playerId: senderId });
    
    this.syncState.readyPlayers.add(senderId);
    
    // Check if all players are ready
    const totalPlayers = this.roomManager.getPlayerCount();
    if (this.syncState.readyPlayers.size >= totalPlayers) {
      // All ready - execute immediately
      if (this.transitionTimeoutId) {
        clearTimeout(this.transitionTimeoutId);
        this.transitionTimeoutId = null;
      }
      this.executePhaseTransition();
    }
  }
  
  handleTransitionExecute(message, senderId) {
    // Only process if from host
    if (!this.isHost(senderId)) {
      this.logger.warn('Received transition execute from non-host', { senderId });
      return;
    }
    
    this.logger.info('Executing phase transition', { 
      phase: message.phase,
      frame: message.frame 
    });
    
    // Schedule transition for specified frame
    const currentFrame = this.getCurrentFrame();
    const framesToWait = Math.max(0, message.frame - currentFrame);
    
    if (framesToWait > 0) {
      // Wait for specified frame
      setTimeout(() => {
        this.performLocalTransition(message.phase);
        this.sendTransitionConfirmation();
      }, framesToWait * 16.67); // Assuming 60 FPS
    } else {
      // Execute immediately
      this.performLocalTransition(message.phase);
      this.sendTransitionConfirmation();
    }
  }
  
  handleTransitionConfirmed(message, senderId) {
    if (!this.hostAuthority.isHost()) return;
    
    this.logger.debug('Player confirmed transition', { playerId: senderId });
    
    this.syncState.confirmedPlayers.add(senderId);
    this.playerPhases.set(senderId, message.phase);
    
    // Check if all players confirmed
    const totalPlayers = this.roomManager.getPlayerCount();
    if (this.syncState.confirmedPlayers.size >= totalPlayers) {
      // All confirmed - complete immediately
      if (this.transitionTimeoutId) {
        clearTimeout(this.transitionTimeoutId);
        this.transitionTimeoutId = null;
      }
      this.completeTransition();
    }
  }
  
  handleSyncCorrection(message, senderId) {
    // Only process if from host
    if (!this.isHost(senderId)) {
      this.logger.warn('Received sync correction from non-host', { senderId });
      return;
    }
    
    this.logger.info('Received phase sync correction', { 
      phase: message.phase 
    });
    
    // Force local phase to match
    this.performLocalTransition(message.phase);
    this.stats.recoveries++;
  }
  
  handleStateRequest(message, senderId) {
    // Send current phase state
    this.networkManager.sendToPeer(senderId, {
      type: PhaseSyncProtocol.messages.PHASE_STATE_RESPONSE,
      phase: this.syncState.currentPhase,
      transitionState: this.syncState.transitionState,
      targetPhase: this.syncState.targetPhase,
      timestamp: Date.now()
    });
  }
  
  handleStateResponse(message, senderId) {
    this.logger.debug('Received phase state', {
      from: senderId,
      phase: message.phase
    });
    
    this.playerPhases.set(senderId, message.phase);
    
    // Check for desync
    if (message.phase !== this.syncState.currentPhase) {
      this.logger.warn('Phase desync detected', {
        local: this.syncState.currentPhase,
        remote: message.phase,
        player: senderId
      });
      
      if (this.hostAuthority.isHost()) {
        // Send correction to desynced player
        this.sendPhaseCorrection(senderId, this.syncState.currentPhase);
      }
    }
  }
  
  /**
   * Helper methods
   */
  
  sendReadyResponse() {
    this.networkManager.sendToHost({
      type: PhaseSyncProtocol.messages.PHASE_TRANSITION_READY,
      playerId: this.getLocalPlayerId(),
      timestamp: Date.now()
    });
  }
  
  sendTransitionConfirmation() {
    this.networkManager.sendToHost({
      type: PhaseSyncProtocol.messages.PHASE_TRANSITION_CONFIRMED,
      playerId: this.getLocalPlayerId(),
      phase: this.syncState.currentPhase,
      timestamp: Date.now()
    });
  }
  
  sendPhaseCorrection(playerId, phase) {
    this.networkManager.sendToPeer(playerId, {
      type: PhaseSyncProtocol.messages.PHASE_SYNC_CORRECTION,
      phase: phase,
      timestamp: Date.now()
    });
  }
  
  broadcastPhaseCorrection(phase) {
    this.networkManager.broadcast({
      type: PhaseSyncProtocol.messages.PHASE_SYNC_CORRECTION,
      phase: phase,
      timestamp: Date.now()
    });
  }
  
  requestPhaseCorrection() {
    this.networkManager.sendToHost({
      type: PhaseSyncProtocol.messages.PHASE_STATE_REQUEST,
      playerId: this.getLocalPlayerId(),
      timestamp: Date.now()
    });
  }
  
  /**
   * Utility methods
   */
  
  isHost(playerId) {
    return this.hostAuthority.getHostId() === playerId;
  }
  
  getLocalPlayerId() {
    return this.roomManager.localPlayer?.id;
  }
  
  getCurrentFrame() {
    // Get from rollback netcode or WASM
    return this.networkManager.rollbackNetcode?.currentFrame ?? 0;
  }
  
  /**
   * Event callbacks (to be overridden)
   */
  
  onPhaseChanged(phase) {
    // Override this to handle phase changes
  }
  
  onTransitionAnnounced(fromPhase, toPhase) {
    // Override this to show UI feedback
  }
  
  /**
   * Get sync statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentPhase: this.syncState.currentPhase,
      transitionState: this.syncState.transitionState,
      playerPhases: Array.from(this.playerPhases.entries())
    };
  }
  
  /**
   * Shutdown
   */
  shutdown() {
    if (this.phaseMonitorInterval) {
      clearInterval(this.phaseMonitorInterval);
    }
    
    if (this.transitionTimeoutId) {
      clearTimeout(this.transitionTimeoutId);
    }
    
    this.logger.info('Phase sync manager shutdown');
  }
}
```

---

## Component 3: Integration with Enhanced Multiplayer Sync

### Overview
Integrate the phase sync manager into the existing multiplayer infrastructure.

### Implementation Details:

**File**: `src/netcode/enhanced-multiplayer-sync.js` (modify)
```javascript
// Add import at top
import { PhaseSyncManager } from './phase-sync-manager.js';

// In constructor, add:
this.phaseSyncManager = null;

// In initializeSystems(), add:
if (this.config.enablePhaseSync !== false) {
  this.phaseSyncManager = new PhaseSyncManager({
    ...this.config.phaseSyncConfig,
    logLevel: this.config.logLevel
  });
}

// In initializeIndividualSystems(), add:
if (this.phaseSyncManager) {
  this.phaseSyncManager.initialize(
    this.gameIntegration.wasmModule,
    this.hostAuthority || { 
      isHost: () => this.sessionState.isHost,
      getHostId: () => this.sessionState.isHost ? this.sessionState.localPlayerId : null
    },
    this.roomManager || {
      getPlayerCount: () => this.sessionState.players.size,
      localPlayer: { id: this.sessionState.localPlayerId }
    },
    {
      broadcast: (msg) => this.networkIntegration.broadcastMessage(msg),
      sendToPeer: (id, msg) => this.networkIntegration.sendToPeer(id, msg),
      sendToHost: (msg) => {
        const hostId = Array.from(this.sessionState.players.values())
          .find(p => p.isHost)?.id;
        if (hostId) this.networkIntegration.sendToPeer(hostId, msg);
      },
      rollbackNetcode: this.rollbackNetcode
    }
  );
  
  // Set up event handlers
  this.phaseSyncManager.onPhaseChanged = (phase) => {
    this.notifyEvent('onPhaseChanged', phase);
  };
  
  this.phaseSyncManager.onTransitionAnnounced = (from, to) => {
    this.notifyEvent('onPhaseTransitionStarted', { from, to });
  };
}

// In handleMessage(), add phase sync messages:
case 'phase_transition_announce':
case 'phase_transition_ready':
case 'phase_transition_execute':
case 'phase_transition_confirmed':
case 'phase_sync_correction':
case 'phase_state_request':
case 'phase_state_response':
  if (this.phaseSyncManager) {
    this.phaseSyncManager.handleMessage(message, senderId);
  }
  break;

// In getSystemStatus(), add:
phaseSync: this.phaseSyncManager ? {
  enabled: true,
  stats: this.phaseSyncManager.getStats()
} : { enabled: false },

// In shutdown(), add:
if (this.phaseSyncManager) {
  this.phaseSyncManager.shutdown();
}
```

---

## Component 4: UI Feedback for Phase Transitions

### Overview
Create UI components to show phase transition status and waiting indicators.

### Implementation Details:

**File**: `src/ui/phase-transition-ui.js` (new)
```javascript
export class PhaseTransitionUI {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.currentPhase = 0;
    this.phaseNames = [
      'Explore', 'Fight', 'Choose', 'Power Up',
      'Risk', 'Escalate', 'Cash Out', 'Reset'
    ];
    
    this.createUI();
  }
  
  createUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'phase-transition-ui';
    this.container.className = 'phase-transition-container hidden';
    this.container.innerHTML = `
      <div class="phase-transition-overlay">
        <div class="phase-transition-content">
          <div class="phase-transition-spinner"></div>
          <h2 class="phase-transition-title">Phase Transition</h2>
          <p class="phase-transition-message">Waiting for all players...</p>
          <div class="phase-transition-progress">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <span class="progress-text">0 / 0 players ready</span>
          </div>
          <div class="phase-info">
            <span class="current-phase">Current: Explore</span>
            <span class="arrow">→</span>
            <span class="next-phase">Next: Fight</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Show transition UI
   */
  showTransition(fromPhase, toPhase, message = 'Waiting for all players...') {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    
    // Update phase names
    const currentPhaseEl = this.container.querySelector('.current-phase');
    const nextPhaseEl = this.container.querySelector('.next-phase');
    currentPhaseEl.textContent = `Current: ${this.phaseNames[fromPhase]}`;
    nextPhaseEl.textContent = `Next: ${this.phaseNames[toPhase]}`;
    
    // Update message
    const messageEl = this.container.querySelector('.phase-transition-message');
    messageEl.textContent = message;
    
    // Reset progress
    this.updateProgress(0, 0);
    
    // Add animation class
    this.container.classList.add('transitioning');
  }
  
  /**
   * Hide transition UI
   */
  hideTransition() {
    this.isVisible = false;
    this.container.classList.add('hidden');
    this.container.classList.remove('transitioning');
  }
  
  /**
   * Update progress bar
   */
  updateProgress(ready, total) {
    const progressFill = this.container.querySelector('.progress-fill');
    const progressText = this.container.querySelector('.progress-text');
    
    const percentage = total > 0 ? (ready / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${ready} / ${total} players ready`;
  }
  
  /**
   * Show quick phase change notification
   */
  showPhaseChange(newPhase) {
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'phase-change-notification';
    notification.innerHTML = `
      <div class="phase-change-icon"></div>
      <span class="phase-change-text">Entering ${this.phaseNames[newPhase]} Phase</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate and remove
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }
}
```

**File**: `src/css/phase-transition.css` (new)
```css
.phase-transition-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
}

.phase-transition-container.hidden {
  display: none;
}

.phase-transition-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease-out;
}

.phase-transition-content {
  background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
  border-radius: 12px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.phase-transition-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00ff88;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.phase-transition-title {
  color: #fff;
  font-size: 24px;
  margin: 0 0 8px;
  text-align: center;
}

.phase-transition-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0 0 20px;
  text-align: center;
}

.phase-transition-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00ccff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  display: block;
  text-align: center;
}

.phase-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.current-phase,
.next-phase {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.arrow {
  color: #00ff88;
  font-size: 18px;
}

/* Phase change notification */
.phase-change-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(400px);
  transition: transform 0.3s ease;
  z-index: 10001;
}

.phase-change-notification.show {
  transform: translateX(0);
}

.phase-change-icon {
  width: 24px;
  height: 24px;
  background: radial-gradient(circle, #00ff88, #00cc66);
  border-radius: 50%;
  animation: pulse 1s ease infinite;
}

.phase-change-text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
```

---

## Component 5: Testing Infrastructure

### Overview
Create comprehensive tests for phase synchronization.

### Implementation Details:

**File**: `test/phase-sync.spec.js` (new)
```javascript
import { expect } from 'chai';
import { PhaseSyncManager } from '../src/netcode/phase-sync-manager.js';
import { PhaseSyncProtocol } from '../src/netcode/phase-sync-protocol.js';

describe('Phase Synchronization', () => {
  let syncManager;
  let mockWasm;
  let mockHost;
  let mockRoom;
  let mockNetwork;
  
  beforeEach(() => {
    // Create mocks
    mockWasm = {
      exports: {
        get_phase: () => 0,
        force_phase_transition: (phase) => { mockWasm.currentPhase = phase; }
      },
      currentPhase: 0
    };
    
    mockHost = {
      isHost: () => true,
      getHostId: () => 'host-123'
    };
    
    mockRoom = {
      getPlayerCount: () => 4,
      localPlayer: { id: 'player-123' }
    };
    
    mockNetwork = {
      broadcast: sinon.spy(),
      sendToPeer: sinon.spy(),
      sendToHost: sinon.spy(),
      rollbackNetcode: { currentFrame: 100 }
    };
    
    // Create manager
    syncManager = new PhaseSyncManager();
    syncManager.initialize(mockWasm, mockHost, mockRoom, mockNetwork);
  });
  
  describe('Phase Transition Initiation', () => {
    it('should initiate phase transition as host', async () => {
      const result = await syncManager.initiatePhaseTransition(0, 1, 'test');
      
      expect(result).to.be.true;
      expect(syncManager.syncState.targetPhase).to.equal(1);
      expect(syncManager.syncState.transitionState).to.equal('waiting');
      expect(mockNetwork.broadcast.calledOnce).to.be.true;
    });
    
    it('should reject invalid transitions', async () => {
      const result = await syncManager.initiatePhaseTransition(0, 5, 'test');
      
      expect(result).to.be.false;
      expect(syncManager.syncState.transitionState).to.equal('idle');
    });
    
    it('should prevent non-host from initiating', async () => {
      mockHost.isHost = () => false;
      
      const result = await syncManager.initiatePhaseTransition(0, 1, 'test');
      
      expect(result).to.be.false;
      expect(mockNetwork.broadcast.called).to.be.false;
    });
  });
  
  describe('Ready Acknowledgments', () => {
    it('should track ready players', () => {
      syncManager.syncState.transitionState = 'waiting';
      syncManager.syncState.targetPhase = 1;
      
      syncManager.handleTransitionReady({ }, 'player-1');
      syncManager.handleTransitionReady({ }, 'player-2');
      
      expect(syncManager.syncState.readyPlayers.size).to.equal(2);
    });
    
    it('should execute when all ready', () => {
      syncManager.syncState.transitionState = 'waiting';
      syncManager.syncState.targetPhase = 1;
      
      // Add all players as ready
      syncManager.handleTransitionReady({ }, 'player-1');
      syncManager.handleTransitionReady({ }, 'player-2');
      syncManager.handleTransitionReady({ }, 'player-3');
      syncManager.handleTransitionReady({ }, 'player-4');
      
      expect(syncManager.syncState.transitionState).to.equal('executing');
    });
  });
  
  describe('Phase Correction', () => {
    it('should detect phase desync', () => {
      syncManager.syncState.currentPhase = 2;
      
      syncManager.handleStateResponse({
        phase: 3,
        transitionState: 'idle'
      }, 'player-1');
      
      expect(mockNetwork.sendToPeer.called).to.be.true;
      const call = mockNetwork.sendToPeer.getCall(0);
      expect(call.args[1].type).to.equal('phase_sync_correction');
    });
    
    it('should apply phase correction', () => {
      syncManager.syncState.currentPhase = 1;
      
      syncManager.handleSyncCorrection({
        phase: 2
      }, 'host-123');
      
      expect(mockWasm.currentPhase).to.equal(2);
      expect(syncManager.syncState.currentPhase).to.equal(2);
    });
  });
  
  describe('Timeout Handling', () => {
    it('should handle ready timeout', (done) => {
      syncManager.initiatePhaseTransition(0, 1, 'test');
      
      // Only add 1 ready player (need 2 for majority of 4)
      syncManager.handleTransitionReady({ }, 'player-1');
      
      // Wait for timeout
      setTimeout(() => {
        expect(syncManager.syncState.transitionState).to.equal('idle');
        expect(syncManager.stats.failedTransitions).to.equal(1);
        done();
      }, 2100);
    });
  });
});
```

---

## Success Criteria

### Automated Verification:
- [ ] All clients maintain same phase: `all_players_phase === host_phase`
- [ ] Phase transitions complete within 100ms: `transition_time < 100`
- [ ] No invalid phase transitions occur: `isValidTransition() === true`
- [ ] Recovery from desync works: `phase_correction_applied === true`
- [ ] Message ordering preserved: `messages_in_sequence === true`
- [ ] Timeout handling works: `timeout_triggers_correctly === true`

### Manual Verification:
- [ ] Phase transition UI appears smoothly
- [ ] Progress bar updates as players acknowledge
- [ ] All players see phase change simultaneously
- [ ] Late-joining players sync to correct phase
- [ ] Host migration preserves phase state
- [ ] No gameplay interruption during transitions

## Testing Strategy

### Unit Tests:
- Phase transition state machine
- Message protocol validation
- Timeout handling
- Recovery mechanisms
- Statistics tracking

### Integration Tests:
- Full phase transition flow
- Multi-player synchronization
- Host migration during transition
- Network failure recovery
- Late join synchronization

### Manual Testing Steps:
1. Start 4-player game
2. Play until phase transition triggers
3. Verify all players see waiting UI
4. Check all players enter new phase together
5. Disconnect a player during transition
6. Verify remaining players complete transition
7. Have disconnected player rejoin
8. Verify they sync to correct phase
9. Trigger host migration during transition
10. Verify new host completes transition

## Performance Considerations

- Phase monitoring runs at 10Hz (100ms intervals)
- Transition messages are small (~100 bytes)
- Timeout values tuned for typical network latency
- UI updates throttled to prevent flicker
- Phase state cached to avoid repeated WASM calls

## Migration Notes

- Phase sync is opt-in via config flag
- Existing games work without modification
- Phase sync messages ignored by older clients
- Graceful degradation if sync fails

## Implementation Order

1. **Day 1**: Implement PhaseSyncProtocol and PhaseSyncManager core
2. **Day 2**: Integrate with EnhancedMultiplayerSync
3. **Day 3**: Create UI components and styling
4. **Day 4**: Implement recovery and timeout handling
5. **Day 5**: Write comprehensive tests
6. **Day 6**: Manual testing and bug fixes
7. **Day 7**: Performance optimization and polish

## References

- Phase system: `src/wasm/internal_core.h`
- Multiplayer sync: `src/netcode/enhanced-multiplayer-sync.js`
- Network messaging: `src/netcode/network-provider-manager.js`
- UI patterns: `src/ui/enhanced-ui-manager.js`
- Phase transitions: `src/wasm/game.cpp` lines 240-1025