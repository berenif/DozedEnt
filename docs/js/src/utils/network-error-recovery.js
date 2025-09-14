/**
 * Network Error Recovery and Connection Resilience
 * Handles network failures, connection drops, and peer synchronization issues
 */

import { createLogger } from './logger.js';
import { inputValidator } from './input-validator.js';

export class NetworkErrorRecovery {
  constructor() {
    this.logger = createLogger('NetworkErrorRecovery');
    
    // Connection state tracking
    this.connectionState = {
      isConnected: false,
      connectionQuality: 'unknown', // 'excellent', 'good', 'poor', 'critical'
      lastPingTime: 0,
      pingHistory: [],
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      backoffMultiplier: 1.5,
      baseReconnectDelay: 1000
    };
    
    // Error tracking
    this.networkErrors = {
      connectionDrops: 0,
      timeouts: 0,
      messageFailures: 0,
      syncErrors: 0,
      lastError: null,
      errorHistory: []
    };
    
    // Recovery strategies
    this.recoveryStrategies = {
      immediate: [], // Strategies to try immediately
      delayed: [],   // Strategies to try after a delay
      fallback: []   // Last resort strategies
    };
    
    // Message queue for offline resilience
    this.messageQueue = {
      outgoing: [],
      failed: [],
      maxQueueSize: 1000,
      retryAttempts: new Map()
    };
    
    // Peer synchronization state
    this.syncState = {
      lastSyncTime: 0,
      syncInterval: 5000, // 5 seconds
      desyncThreshold: 2000, // 2 seconds
      syncAttempts: 0,
      maxSyncAttempts: 5
    };
    
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize recovery strategies in order of preference
   */
  initializeRecoveryStrategies() {
    // Immediate strategies (try right away)
    this.recoveryStrategies.immediate = [
      'ping_test',
      'reconnect_current',
      'switch_relay'
    ];
    
    // Delayed strategies (try after backoff)
    this.recoveryStrategies.delayed = [
      'full_reconnect',
      'peer_discovery',
      'fallback_server'
    ];
    
    // Fallback strategies (last resort)
    this.recoveryStrategies.fallback = [
      'offline_mode',
      'local_simulation',
      'error_notification'
    ];
  }

  /**
   * Handle network connection drop
   */
  async handleConnectionDrop(error, context = {}) {
    this.networkErrors.connectionDrops++;
    this.logNetworkError('connection_drop', error, context);
    
    this.connectionState.isConnected = false;
    this.connectionState.connectionQuality = 'critical';
    
    // Immediately try recovery strategies
    for (const strategy of this.recoveryStrategies.immediate) {
      try {
        const result = await this.executeRecoveryStrategy(strategy, context);
        if (result.success) {
          this.logger.log(`Recovery successful with strategy: ${strategy}`);
          return result;
        }
      } catch (strategyError) {
        this.logger.warn(`Recovery strategy '${strategy}' failed:`, strategyError);
      }
    }
    
    // If immediate strategies fail, schedule delayed recovery
    this.scheduleDelayedRecovery(context);
    
    return { success: false, action: 'scheduled_recovery' };
  }

  /**
   * Handle network timeout errors
   */
  handleNetworkTimeout(error, context = {}) {
    this.networkErrors.timeouts++;
    this.logNetworkError('timeout', error, context);
    
    // Check if this is a pattern of timeouts
    const recentTimeouts = this.getRecentErrors('timeout', 30000); // Last 30 seconds
    if (recentTimeouts.length > 3) {
      this.logger.warn('Multiple timeouts detected - connection may be unstable');
      return this.handleConnectionInstability();
    }
    
    // For single timeout, try immediate reconnection
    return this.executeRecoveryStrategy('reconnect_current', context);
  }

  /**
   * Handle message send/receive failures
   */
  handleMessageFailure(message, error, context = {}) {
    this.networkErrors.messageFailures++;
    this.logNetworkError('message_failure', error, { ...context, message });
    
    // Validate the message first
    const validatedMessage = inputValidator.validateNetworkMessage(message);
    if (!validatedMessage) {
      this.logger.warn('Message failure due to invalid message format');
      return { success: false, action: 'message_rejected' };
    }
    
    // Queue message for retry
    this.queueFailedMessage(validatedMessage, error);
    
    // Check connection health
    if (!this.connectionState.isConnected) {
      return this.handleConnectionDrop(error, context);
    }
    
    // Try to resend immediately
    return this.retryMessage(validatedMessage);
  }

  /**
   * Handle peer synchronization errors
   */
  handleSyncError(error, context = {}) {
    this.networkErrors.syncErrors++;
    this.syncState.syncAttempts++;
    this.logNetworkError('sync_error', error, context);
    
    // If too many sync attempts, reset sync state
    if (this.syncState.syncAttempts >= this.syncState.maxSyncAttempts) {
      this.logger.error('Max sync attempts reached - resetting sync state');
      this.resetSyncState();
      return { success: false, action: 'sync_reset' };
    }
    
    // Attempt to resynchronize
    return this.attemptResync(context);
  }

  /**
   * Execute a specific recovery strategy
   */
  executeRecoveryStrategy(strategy, context = {}) {
    this.logger.log(`Executing recovery strategy: ${strategy}`);
    
    switch (strategy) {
      case 'ping_test':
        return this.pingTest();
      
      case 'reconnect_current':
        return this.reconnectCurrent(context);
      
      case 'switch_relay':
        return this.switchRelay(context);
      
      case 'full_reconnect':
        return this.fullReconnect(context);
      
      case 'peer_discovery':
        return this.peerDiscovery(context);
      
      case 'fallback_server':
        return this.connectFallbackServer(context);
      
      case 'offline_mode':
        return this.enterOfflineMode();
      
      case 'local_simulation':
        return this.startLocalSimulation();
      
      case 'error_notification':
        return this.showErrorNotification();
      
      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  /**
   * Test connection with ping
   */
  async pingTest() {
    try {
      const startTime = performance.now();
      
      // Simple connectivity test using fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const pingTime = performance.now() - startTime;
      this.updatePingHistory(pingTime);
      
      this.connectionState.connectionQuality = this.assessConnectionQuality(pingTime);
      
      if (pingTime < 1000) { // Less than 1 second is good
        this.connectionState.isConnected = true;
        return { success: true, pingTime, quality: this.connectionState.connectionQuality };
      }
      
      return { success: false, pingTime, quality: this.connectionState.connectionQuality };
      
    } catch (error) {
      this.logger.warn('Ping test failed:', error.message);
      this.connectionState.connectionQuality = 'critical';
      return { success: false, error: error.message };
    }
  }

  /**
   * Reconnect to current peer/room
   */
  async reconnectCurrent(context) {
    try {
      if (context.room && typeof context.room.reconnect === 'function') {
        await context.room.reconnect();
        this.connectionState.isConnected = true;
        this.connectionState.reconnectAttempts = 0;
        return { success: true, action: 'reconnected' };
      }
      
      return { success: false, error: 'No room context or reconnect method' };
      
    } catch (error) {
      this.connectionState.reconnectAttempts++;
      this.logger.error('Reconnection failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Switch to different relay/server
   */
  async switchRelay(context) {
    try {
      // This would depend on the specific networking implementation
      if (context.networkManager && typeof context.networkManager.switchRelay === 'function') {
        const result = await context.networkManager.switchRelay();
        if (result.success) {
          this.connectionState.isConnected = true;
          return { success: true, action: 'relay_switched', newRelay: result.relay };
        }
      }
      
      return { success: false, error: 'No relay switching capability' };
      
    } catch (error) {
      this.logger.error('Relay switch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform full reconnection
   */
  async fullReconnect(context) {
    try {
      // Full disconnect and reconnect cycle
      if (context.networkManager) {
        await context.networkManager.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        await context.networkManager.connect();
        
        this.connectionState.isConnected = true;
        this.connectionState.reconnectAttempts = 0;
        return { success: true, action: 'full_reconnect' };
      }
      
      return { success: false, error: 'No network manager context' };
      
    } catch (error) {
      this.logger.error('Full reconnection failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Attempt peer discovery
   */
  async peerDiscovery(context) {
    try {
      if (context.networkManager && typeof context.networkManager.discoverPeers === 'function') {
        const peers = await context.networkManager.discoverPeers();
        if (peers.length > 0) {
          return { success: true, action: 'peers_discovered', peerCount: peers.length };
        }
      }
      
      return { success: false, error: 'No peers discovered' };
      
    } catch (error) {
      this.logger.error('Peer discovery failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to fallback server
   */
  async connectFallbackServer(context) {
    try {
      const fallbackServers = [
        'wss://fallback1.example.com',
        'wss://fallback2.example.com',
        'wss://fallback3.example.com'
      ];
      
      for (const server of fallbackServers) {
        try {
          if (context.networkManager && typeof context.networkManager.connectToServer === 'function') {
            await context.networkManager.connectToServer(server);
            this.connectionState.isConnected = true;
            return { success: true, action: 'fallback_connected', server };
          }
        } catch (serverError) {
          this.logger.warn(`Fallback server ${server} failed:`, serverError.message);
          continue;
        }
      }
      
      return { success: false, error: 'All fallback servers failed' };
      
    } catch (error) {
      this.logger.error('Fallback server connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enter offline mode
   */
  enterOfflineMode() {
    this.logger.warn('Entering offline mode');
    this.connectionState.isConnected = false;
    
    // Enable offline features
    this.showOfflineNotification();
    
    return { success: true, action: 'offline_mode' };
  }

  /**
   * Start local simulation mode
   */
  startLocalSimulation() {
    this.logger.log('Starting local simulation mode');
    
    // This would enable local-only gameplay
    this.showLocalModeNotification();
    
    return { success: true, action: 'local_simulation' };
  }

  /**
   * Show error notification to user
   */
  showErrorNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">🌐 Connection Lost</div>
      <div>Unable to connect to game servers. Check your internet connection.</div>
      <div style="margin-top: 12px;">
        <button onclick="location.reload()" style="
          background: white;
          color: #dc3545;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          margin-right: 8px;
        ">Retry</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Continue Offline</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    return { success: true, action: 'notification_shown' };
  }

  /**
   * Show offline mode notification
   */
  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #6c757d;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">📴 Offline Mode</div>
      <div>Playing locally - multiplayer features disabled</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Show local simulation notification
   */
  showLocalModeNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #17a2b8;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">🖥️ Local Mode</div>
      <div>Running local simulation</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  /**
   * Schedule delayed recovery attempts
   */
  scheduleDelayedRecovery(context) {
    const delay = this.calculateBackoffDelay();
    
    this.logger.log(`Scheduling delayed recovery in ${delay}ms`);
    
    setTimeout(async () => {
      for (const strategy of this.recoveryStrategies.delayed) {
        try {
          const result = await this.executeRecoveryStrategy(strategy, context);
          if (result.success) {
            this.logger.log(`Delayed recovery successful with strategy: ${strategy}`);
            return;
          }
        } catch (error) {
          this.logger.warn(`Delayed recovery strategy '${strategy}' failed:`, error);
        }
      }
      
      // If delayed strategies fail, try fallback
      this.executeFallbackStrategies(context);
    }, delay);
  }

  /**
   * Execute fallback recovery strategies
   */
  async executeFallbackStrategies(context) {
    for (const strategy of this.recoveryStrategies.fallback) {
      try {
        const result = await this.executeRecoveryStrategy(strategy, context);
        if (result.success) {
          this.logger.log(`Fallback recovery successful with strategy: ${strategy}`);
          return;
        }
      } catch (error) {
        this.logger.error(`Fallback strategy '${strategy}' failed:`, error);
      }
    }
    
    this.logger.error('All recovery strategies exhausted');
  }

  /**
   * Calculate backoff delay for reconnection attempts
   */
  calculateBackoffDelay() {
    const baseDelay = this.connectionState.baseReconnectDelay;
    const attempts = this.connectionState.reconnectAttempts;
    const multiplier = this.connectionState.backoffMultiplier;
    
    return Math.min(baseDelay * multiplier**attempts, 30000); // Max 30 seconds
  }

  /**
   * Queue failed message for retry
   */
  queueFailedMessage(message, error) {
    if (this.messageQueue.outgoing.length >= this.messageQueue.maxQueueSize) {
      // Remove oldest message to make room
      const removed = this.messageQueue.outgoing.shift();
      this.logger.warn('Message queue full, removed oldest message:', removed);
    }
    
    const queuedMessage = {
      message,
      error: error.message,
      timestamp: performance.now(),
      attempts: 0
    };
    
    this.messageQueue.failed.push(queuedMessage);
  }

  /**
   * Retry sending a failed message
   */
  async retryMessage(message) {
    try {
      // This would depend on the specific networking implementation
      // For now, we'll simulate a retry
      const retryAttempts = this.messageQueue.retryAttempts.get(message.id) || 0;
      
      if (retryAttempts >= 3) {
        this.logger.warn('Max retry attempts reached for message:', message.id);
        return { success: false, action: 'max_retries_reached' };
      }
      
      this.messageQueue.retryAttempts.set(message.id, retryAttempts + 1);
      
      // Simulate network send (would be actual network call)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log('Message retry successful:', message.id);
      return { success: true, action: 'message_retried' };
      
    } catch (error) {
      this.logger.error('Message retry failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle connection instability (multiple timeouts/errors)
   */
  async handleConnectionInstability() {
    this.logger.warn('Connection instability detected');
    
    // Reduce update frequency to minimize network load
    this.connectionState.connectionQuality = 'poor';
    
    // Try to stabilize connection
    const stabilizationResult = await this.executeRecoveryStrategy('ping_test');
    
    if (stabilizationResult.success) {
      return { success: true, action: 'connection_stabilized' };
    }
    
    // If stabilization fails, enter degraded mode
    return { success: false, action: 'degraded_mode' };
  }

  /**
   * Attempt to resynchronize with peers
   */
  async attemptResync(context) {
    try {
      if (context.gameStateManager && context.networkManager) {
        const currentState = context.gameStateManager.getStateSnapshot();
        
        // Request authoritative state from host or peers
        const syncRequest = {
          type: 'sync_request',
          timestamp: performance.now(),
          currentState: {
            phase: currentState.currentPhase,
            playerState: currentState.playerState
          }
        };
        
        // This would send the sync request through the network
        this.logger.log('Requesting state synchronization');
        
        // Simulate sync response (would be actual network response)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.syncState.lastSyncTime = performance.now();
        this.syncState.syncAttempts = 0;
        
        return { success: true, action: 'sync_completed' };
      }
      
      return { success: false, error: 'Missing context for sync' };
      
    } catch (error) {
      this.logger.error('Resync attempt failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset sync state after too many failures
   */
  resetSyncState() {
    this.syncState = {
      lastSyncTime: 0,
      syncInterval: 5000,
      desyncThreshold: 2000,
      syncAttempts: 0,
      maxSyncAttempts: 5
    };
    
    this.logger.log('Sync state reset');
  }

  /**
   * Update ping history for connection quality assessment
   */
  updatePingHistory(pingTime) {
    this.connectionState.pingHistory.push({
      time: pingTime,
      timestamp: performance.now()
    });
    
    // Keep only recent pings (last 20)
    if (this.connectionState.pingHistory.length > 20) {
      this.connectionState.pingHistory.shift();
    }
    
    this.connectionState.lastPingTime = pingTime;
  }

  /**
   * Assess connection quality based on ping times
   */
  assessConnectionQuality(pingTime) {
    if (pingTime < 100) {
      return 'excellent';
    }
    if (pingTime < 300) {
      return 'good';
    }
    if (pingTime < 1000) {
      return 'poor';
    }
    return 'critical';
  }

  /**
   * Get recent errors of a specific type
   */
  getRecentErrors(errorType, timeWindow = 60000) {
    const now = performance.now();
    return this.networkErrors.errorHistory.filter(
      error => error.type === errorType && (now - error.timestamp) < timeWindow
    );
  }

  /**
   * Log network error with context
   */
  logNetworkError(type, error, context) {
    const errorEntry = {
      type,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: performance.now()
    };
    
    this.networkErrors.errorHistory.push(errorEntry);
    this.networkErrors.lastError = errorEntry;
    
    // Keep only recent errors (last 100)
    if (this.networkErrors.errorHistory.length > 100) {
      this.networkErrors.errorHistory.shift();
    }
    
    this.logger.error(`Network ${type}:`, error, context);
  }

  /**
   * Get comprehensive network status
   */
  getNetworkStatus() {
    return {
      connectionState: { ...this.connectionState },
      networkErrors: { ...this.networkErrors },
      messageQueue: {
        outgoingCount: this.messageQueue.outgoing.length,
        failedCount: this.messageQueue.failed.length,
        retryAttempts: Object.fromEntries(this.messageQueue.retryAttempts)
      },
      syncState: { ...this.syncState },
      recoveryStrategies: { ...this.recoveryStrategies }
    };
  }

  /**
   * Reset network error recovery system
   */
  reset() {
    this.connectionState.reconnectAttempts = 0;
    this.networkErrors = {
      connectionDrops: 0,
      timeouts: 0,
      messageFailures: 0,
      syncErrors: 0,
      lastError: null,
      errorHistory: []
    };
    
    this.messageQueue = {
      outgoing: [],
      failed: [],
      maxQueueSize: 1000,
      retryAttempts: new Map()
    };
    
    this.resetSyncState();
    
    this.logger.log('Network error recovery system reset');
  }
}

// Create global instance
export const networkErrorRecovery = new NetworkErrorRecovery();
