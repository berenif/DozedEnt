/**
 * Phase Synchronization Network Adapter
 * Handles network communication for phase synchronization across WebSocket/WebRTC connections
 */

import { createLogger } from '../utils/logger.js'
import { GAME_PHASES, PHASE_CONFIG } from './multiplayer-phase-manager.js'

export class PhaseSyncNetworkAdapter {
  constructor(config = {}) {
    this.config = {
      protocol: config.protocol || 'websocket', // 'websocket' or 'webrtc'
      reconnectAttempts: config.reconnectAttempts || 3,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 5000,
      messageTimeout: config.messageTimeout || 5000,
      compressionEnabled: config.compressionEnabled !== false,
      encryptionEnabled: config.encryptionEnabled || false,
      logLevel: config.logLevel || 'info',
      ...config
    }
    
    this.logger = createLogger({
      level: this.config.logLevel,
      prefix: '[PhaseSyncNetwork]'
    })
    
    // Connection state
    this.connectionState = {
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
      lastConnectTime: 0,
      lastDisconnectTime: 0
    }
    
    // Peer connections
    this.peers = new Map() // peerId -> { connection, state, latency, lastSeen }
    this.localPeerId = null
    this.hostPeerId = null
    
    // Message handling
    this.messageQueue = []
    this.pendingRequests = new Map() // requestId -> { resolve, reject, timeout }
    this.messageHandlers = new Map() // messageType -> handler
    
    // Network statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      packetLoss: 0,
      connectionUptime: 0
    }
    
    // WebSocket/WebRTC connection
    this.connection = null
    this.dataChannel = null
    
    // Heartbeat timer
    this.heartbeatTimer = null
    
    // Phase manager reference
    this.phaseManager = null
  }
  
  /**
   * Initialize network adapter with phase manager
   */
  initialize(phaseManager, localPeerId, hostPeerId = null) {
    this.phaseManager = phaseManager
    this.localPeerId = localPeerId
    this.hostPeerId = hostPeerId || localPeerId
    
    // Register default message handlers
    this.registerDefaultHandlers()
    
    // Start heartbeat
    this.startHeartbeat()
    
    this.logger.info('Network adapter initialized', {
      localPeerId: this.localPeerId,
      hostPeerId: this.hostPeerId,
      protocol: this.config.protocol
    })
  }
  
  /**
   * Connect to network
   */
  async connect(connectionUrl = null) {
    if (this.connectionState.connected) {
      this.logger.warn('Already connected')
      return true
    }
    
    this.connectionState.connecting = true
    
    try {
      if (this.config.protocol === 'websocket') {
        await this.connectWebSocket(connectionUrl)
      } else if (this.config.protocol === 'webrtc') {
        await this.connectWebRTC(connectionUrl)
      } else {
        throw new Error(`Unsupported protocol: ${this.config.protocol}`)
      }
      
      this.connectionState.connected = true
      this.connectionState.connecting = false
      this.connectionState.lastConnectTime = Date.now()
      this.connectionState.reconnectAttempts = 0
      
      // Process queued messages
      this.processMessageQueue()
      
      this.logger.info('Connected successfully')
      return true
      
    } catch (error) {
      this.connectionState.connecting = false
      this.logger.error('Connection failed', { error: error.message })
      
      // Attempt reconnection
      if (this.config.reconnectAttempts > 0) {
        this.scheduleReconnect()
      }
      
      return false
    }
  }
  
  /**
   * Connect via WebSocket
   */
  async connectWebSocket(url) {
    return new Promise((resolve, reject) => {
      const wsUrl = url || this.config.websocketUrl || 'ws://localhost:8080'
      
      this.connection = new WebSocket(wsUrl)
      
      this.connection.onopen = () => {
        this.logger.info('WebSocket connected', { url: wsUrl })
        this.sendHandshake()
        resolve()
      }
      
      this.connection.onerror = (error) => {
        this.logger.error('WebSocket error', { error })
        reject(error)
      }
      
      this.connection.onclose = (event) => {
        this.handleDisconnect(event.reason)
      }
      
      this.connection.onmessage = (event) => {
        this.handleMessage(event.data)
      }
      
      // Set connection timeout
      setTimeout(() => {
        if (this.connectionState.connecting) {
          this.connection.close()
          reject(new Error('Connection timeout'))
        }
      }, 10000)
    })
  }
  
  /**
   * Connect via WebRTC
   */
  async connectWebRTC(config) {
    // WebRTC implementation would go here
    // This is a placeholder for WebRTC data channel setup
    this.logger.warn('WebRTC support not yet implemented')
    throw new Error('WebRTC not implemented')
  }
  
  /**
   * Send handshake message
   */
  sendHandshake() {
    this.send({
      type: 'handshake',
      data: {
        peerId: this.localPeerId,
        version: '1.0.0',
        capabilities: {
          phaseSync: true,
          compression: this.config.compressionEnabled,
          encryption: this.config.encryptionEnabled
        }
      }
    })
  }
  
  /**
   * Handle disconnection
   */
  handleDisconnect(reason = 'Unknown') {
    this.connectionState.connected = false
    this.connectionState.lastDisconnectTime = Date.now()
    
    this.logger.warn('Disconnected', { reason })
    
    // Clear pending requests
    for (const [requestId, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout)
      request.reject(new Error('Connection lost'))
    }
    this.pendingRequests.clear()
    
    // Notify phase manager
    if (this.phaseManager) {
      this.phaseManager.notifyEvent('onNetworkDisconnected', { reason })
    }
    
    // Attempt reconnection
    if (this.config.reconnectAttempts > this.connectionState.reconnectAttempts) {
      this.scheduleReconnect()
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.connectionState.reconnecting) return
    
    this.connectionState.reconnecting = true
    this.connectionState.reconnectAttempts++
    
    const delay = this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1)
    
    this.logger.info('Scheduling reconnection', {
      attempt: this.connectionState.reconnectAttempts,
      delay
    })
    
    setTimeout(async () => {
      this.connectionState.reconnecting = false
      await this.connect()
    }, delay)
  }
  
  /**
   * Register default message handlers
   */
  registerDefaultHandlers() {
    // Phase sync messages
    this.on('phase_sync', (data, senderId) => {
      if (this.phaseManager) {
        this.phaseManager.handlePhaseSyncMessage(data, senderId)
      }
    })
    
    // Phase transition messages
    this.on('phase_transition', (data, senderId) => {
      if (this.phaseManager) {
        this.phaseManager.handlePhaseTransitionRequest(data, senderId)
      }
    })
    
    // Phase vote messages
    this.on('phase_vote', (data, senderId) => {
      if (this.phaseManager) {
        this.phaseManager.handlePhaseVote(data, senderId)
      }
    })
    
    // Phase validation messages
    this.on('phase_validate', (data, senderId) => {
      if (this.phaseManager) {
        this.phaseManager.handlePhaseValidationRequest(data, senderId)
      }
    })
    
    // Heartbeat messages
    this.on('heartbeat', (data, senderId) => {
      this.handleHeartbeat(data, senderId)
    })
    
    // Handshake messages
    this.on('handshake', (data, senderId) => {
      this.handleHandshake(data, senderId)
    })
    
    // Error messages
    this.on('error', (data, senderId) => {
      this.logger.error('Received error from peer', {
        senderId,
        error: data.error
      })
    })
  }
  
  /**
   * Send message to network
   */
  send(message, targetPeerId = null) {
    // Add metadata
    const fullMessage = {
      ...message,
      senderId: this.localPeerId,
      timestamp: Date.now(),
      sequence: ++this.stats.messagesSent
    }
    
    // Compress if enabled
    let data = JSON.stringify(fullMessage)
    if (this.config.compressionEnabled) {
      data = this.compressMessage(data)
    }
    
    // Queue if not connected
    if (!this.connectionState.connected) {
      this.messageQueue.push({ message: fullMessage, targetPeerId })
      return false
    }
    
    // Send message
    try {
      if (targetPeerId) {
        this.sendToPeer(targetPeerId, data)
      } else {
        this.broadcast(data)
      }
      
      this.stats.bytesTransferred += data.length
      return true
      
    } catch (error) {
      this.logger.error('Failed to send message', {
        error: error.message,
        type: message.type
      })
      return false
    }
  }
  
  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, data) {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.connection) {
      this.logger.warn('Peer not connected', { peerId })
      return false
    }
    
    if (this.config.protocol === 'websocket') {
      // In WebSocket, send through server with target
      this.connection.send(JSON.stringify({
        type: 'unicast',
        targetPeerId: peerId,
        data
      }))
    } else if (this.config.protocol === 'webrtc') {
      // In WebRTC, send directly through data channel
      peer.connection.send(data)
    }
    
    return true
  }
  
  /**
   * Broadcast message to all peers
   */
  broadcast(data) {
    if (this.config.protocol === 'websocket') {
      // Send through WebSocket server
      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        this.connection.send(data)
      }
    } else if (this.config.protocol === 'webrtc') {
      // Send to each peer directly
      for (const peer of this.peers.values()) {
        if (peer.connection) {
          peer.connection.send(data)
        }
      }
    }
  }
  
  /**
   * Handle incoming message
   */
  handleMessage(data) {
    try {
      // Decompress if needed
      if (this.config.compressionEnabled) {
        data = this.decompressMessage(data)
      }
      
      const message = JSON.parse(data)
      this.stats.messagesReceived++
      this.stats.bytesTransferred += data.length
      
      // Update peer info
      if (message.senderId && message.senderId !== this.localPeerId) {
        this.updatePeerInfo(message.senderId, message.timestamp)
      }
      
      // Check if this is a response to a pending request
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        this.handleResponse(message)
        return
      }
      
      // Route to appropriate handler
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        handler(message.data || message, message.senderId)
      } else {
        this.logger.debug('Unhandled message type', {
          type: message.type,
          senderId: message.senderId
        })
      }
      
    } catch (error) {
      this.logger.error('Failed to handle message', {
        error: error.message,
        data: data.substring(0, 100)
      })
    }
  }
  
  /**
   * Handle response to pending request
   */
  handleResponse(message) {
    const request = this.pendingRequests.get(message.requestId)
    if (!request) return
    
    clearTimeout(request.timeout)
    this.pendingRequests.delete(message.requestId)
    
    if (message.error) {
      request.reject(new Error(message.error))
    } else {
      request.resolve(message.data || message)
    }
  }
  
  /**
   * Send request and wait for response
   */
  async request(type, data, targetPeerId = null, timeout = null) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timeoutMs = timeout || this.config.messageTimeout
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Request timeout: ${type}`))
      }, timeoutMs)
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle
      })
      
      // Send request
      this.send({
        type,
        requestId,
        data
      }, targetPeerId)
    })
  }
  
  /**
   * Register message handler
   */
  on(type, handler) {
    this.messageHandlers.set(type, handler)
  }
  
  /**
   * Remove message handler
   */
  off(type) {
    this.messageHandlers.delete(type)
  }
  
  /**
   * Update peer information
   */
  updatePeerInfo(peerId, timestamp) {
    let peer = this.peers.get(peerId)
    
    if (!peer) {
      peer = {
        id: peerId,
        connection: null,
        state: 'connected',
        latency: 0,
        lastSeen: timestamp
      }
      this.peers.set(peerId, peer)
      
      // Notify phase manager of new peer
      if (this.phaseManager) {
        this.phaseManager.playerStates.set(peerId, {
          phase: null,
          timestamp,
          sequence: 0,
          ready: false
        })
      }
    } else {
      // Calculate latency
      const latency = Date.now() - timestamp
      peer.latency = (peer.latency * 0.8) + (latency * 0.2) // Exponential moving average
      peer.lastSeen = Date.now()
    }
    
    // Update average latency
    this.updateAverageLatency()
  }
  
  /**
   * Update average latency across all peers
   */
  updateAverageLatency() {
    if (this.peers.size === 0) {
      this.stats.averageLatency = 0
      return
    }
    
    let totalLatency = 0
    for (const peer of this.peers.values()) {
      totalLatency += peer.latency
    }
    
    this.stats.averageLatency = totalLatency / this.peers.size
  }
  
  /**
   * Handle handshake message
   */
  handleHandshake(data, senderId) {
    this.logger.info('Handshake received', {
      senderId,
      version: data.version,
      capabilities: data.capabilities
    })
    
    // Update peer info
    const peer = this.peers.get(senderId) || {}
    peer.version = data.version
    peer.capabilities = data.capabilities
    this.peers.set(senderId, peer)
    
    // Send handshake response if needed
    if (!peer.handshakeComplete) {
      peer.handshakeComplete = true
      this.sendHandshake()
    }
  }
  
  /**
   * Handle heartbeat message
   */
  handleHeartbeat(data, senderId) {
    // Update peer last seen
    this.updatePeerInfo(senderId, data.timestamp)
    
    // Send heartbeat response
    this.send({
      type: 'heartbeat_ack',
      data: {
        originalTimestamp: data.timestamp,
        timestamp: Date.now()
      }
    }, senderId)
  }
  
  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
      this.checkPeerHealth()
    }, this.config.heartbeatInterval)
  }
  
  /**
   * Send heartbeat to all peers
   */
  sendHeartbeat() {
    if (!this.connectionState.connected) return
    
    this.broadcast(JSON.stringify({
      type: 'heartbeat',
      senderId: this.localPeerId,
      data: {
        timestamp: Date.now(),
        phase: this.phaseManager?.state?.currentPhase,
        stats: this.stats
      }
    }))
  }
  
  /**
   * Check health of peer connections
   */
  checkPeerHealth() {
    const now = Date.now()
    const timeout = this.config.heartbeatInterval * 3
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > timeout) {
        this.logger.warn('Peer timeout', { peerId, lastSeen: peer.lastSeen })
        this.handlePeerDisconnect(peerId)
      }
    }
  }
  
  /**
   * Handle peer disconnect
   */
  handlePeerDisconnect(peerId) {
    this.peers.delete(peerId)
    
    // Notify phase manager
    if (this.phaseManager) {
      this.phaseManager.playerStates.delete(peerId)
      this.phaseManager.notifyEvent('onPeerDisconnected', { peerId })
    }
    
    this.logger.info('Peer disconnected', { peerId })
  }
  
  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { message, targetPeerId } = this.messageQueue.shift()
      this.send(message, targetPeerId)
    }
  }
  
  /**
   * Compress message data
   */
  compressMessage(data) {
    // Simple compression using base64 encoding
    // In production, use a proper compression library
    try {
      return btoa(data)
    } catch (error) {
      return data
    }
  }
  
  /**
   * Decompress message data
   */
  decompressMessage(data) {
    // Simple decompression using base64 decoding
    // In production, use a proper compression library
    try {
      return atob(data)
    } catch (error) {
      return data
    }
  }
  
  /**
   * Get network statistics
   */
  getNetworkStats() {
    const uptime = this.connectionState.connected ? 
      Date.now() - this.connectionState.lastConnectTime : 0
    
    return {
      ...this.stats,
      connectionUptime: uptime,
      connected: this.connectionState.connected,
      peerCount: this.peers.size,
      reconnectAttempts: this.connectionState.reconnectAttempts,
      messageQueueSize: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size
    }
  }
  
  /**
   * Get peer information
   */
  getPeerInfo() {
    const peerInfo = []
    
    for (const [peerId, peer] of this.peers.entries()) {
      peerInfo.push({
        id: peerId,
        state: peer.state,
        latency: peer.latency,
        lastSeen: peer.lastSeen,
        version: peer.version,
        capabilities: peer.capabilities
      })
    }
    
    return peerInfo
  }
  
  /**
   * Disconnect from network
   */
  disconnect() {
    this.logger.info('Disconnecting from network')
    
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    // Close connections
    if (this.connection) {
      if (this.config.protocol === 'websocket') {
        this.connection.close()
      }
      this.connection = null
    }
    
    // Clear peers
    this.peers.clear()
    
    // Clear pending requests
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeout)
      request.reject(new Error('Disconnected'))
    }
    this.pendingRequests.clear()
    
    // Clear message queue
    this.messageQueue = []
    
    // Update state
    this.connectionState.connected = false
    this.connectionState.connecting = false
    this.connectionState.reconnecting = false
  }
  
  /**
   * Shutdown network adapter
   */
  shutdown() {
    this.disconnect()
    this.messageHandlers.clear()
    this.phaseManager = null
    
    this.logger.info('Network adapter shutdown')
  }
}

export default PhaseSyncNetworkAdapter