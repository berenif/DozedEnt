/**
 * PeerManager - Handles peer tracking and health monitoring
 * Focused responsibility: Peer connection management and diagnostics
 */

export class PeerManager {
  constructor(roomManager, config = {}) {
    this.roomManager = roomManager
    this.config = {
      heartbeatInterval: 5000,
      connectionTimeout: 30000,
      ...config
    }
    
    this.peers = new Map()
    this.heartbeatInterval = null
    this.callbacks = {
      onPeerJoined: null,
      onPeerLeft: null,
      onPeerTimeout: null,
      onError: null
    }
  }
  
  /**
   * Set up peer connection/disconnection handlers
   */
  setupPeerHandlers() {
    const trysteroRoom = this.roomManager.getTrysteroRoom()
    if (!trysteroRoom) {return}
    
    // Handle peer joins
    trysteroRoom.onPeerJoin(peerId => {
      console.log('👋 Peer joined:', peerId)
      this.peers.set(peerId, {
        id: peerId,
        joinedAt: Date.now(),
        lastHeartbeat: Date.now()
      })
      
      if (this.callbacks.onPeerJoined) {
        this.callbacks.onPeerJoined(peerId)
      }
    })
    
    // Handle peer leaves
    trysteroRoom.onPeerLeave(peerId => {
      console.log('👋 Peer left:', peerId)
      this.peers.delete(peerId)
      
      if (this.callbacks.onPeerLeft) {
        this.callbacks.onPeerLeft(peerId)
      }
    })
  }
  
  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat(messageManager) {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.roomManager.isInRoom()) {
        // Send heartbeat through message manager
        messageManager.broadcastToRoom({
          type: 'heartbeat',
          data: { timestamp: Date.now() }
        })
        
        // Check for dead peers
        this.checkPeerHealth()
      }
    }, this.config.heartbeatInterval)
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
  
  /**
   * Update peer heartbeat timestamp
   */
  updatePeerHeartbeat(peerId) {
    if (this.peers.has(peerId)) {
      this.peers.get(peerId).lastHeartbeat = Date.now()
    }
  }
  
  /**
   * Check peer health based on heartbeat
   */
  checkPeerHealth() {
    const now = Date.now()
    const timeout = this.config.connectionTimeout
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastHeartbeat > timeout) {
        console.warn('⚠️ Peer timed out:', peerId)
        this.peers.delete(peerId)
        
        if (this.callbacks.onPeerTimeout) {
          this.callbacks.onPeerTimeout(peerId)
        }
        
        if (this.callbacks.onPeerLeft) {
          this.callbacks.onPeerLeft(peerId)
        }
      }
    }
  }
  
  /**
   * Get peer connection info
   */
  getPeerConnection(peerId) {
    return this.peers.get(peerId)
  }
  
  /**
   * Get all connected peers
   */
  getPeers() {
    return Array.from(this.peers.values())
  }
  
  /**
   * Get peer count
   */
  getPeerCount() {
    return this.peers.size
  }
  
  /**
   * Get peer IDs
   */
  getPeerIds() {
    return Array.from(this.peers.keys())
  }
  
  /**
   * Check if peer exists
   */
  hasPeer(peerId) {
    return this.peers.has(peerId)
  }
  
  /**
   * Get peer health status
   */
  getPeerHealth(peerId) {
    const peer = this.peers.get(peerId)
    if (!peer) {return null}
    
    const now = Date.now()
    const timeSinceHeartbeat = now - peer.lastHeartbeat
    const isHealthy = timeSinceHeartbeat < this.config.connectionTimeout
    
    return {
      peerId,
      isHealthy,
      timeSinceHeartbeat,
      joinedAt: peer.joinedAt,
      lastHeartbeat: peer.lastHeartbeat
    }
  }
  
  /**
   * Get all peer health statuses
   */
  getAllPeerHealth() {
    const health = []
    for (const peerId of this.peers.keys()) {
      health.push(this.getPeerHealth(peerId))
    }
    return health
  }
  
  /**
   * Remove peer
   */
  removePeer(peerId) {
    if (this.peers.has(peerId)) {
      this.peers.delete(peerId)
      if (this.callbacks.onPeerLeft) {
        this.callbacks.onPeerLeft(peerId)
      }
    }
  }
  
  /**
   * Clear all peers
   */
  clearPeers() {
    this.peers.clear()
  }
  
  /**
   * Emit error
   */
  emitError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error)
    }
  }
  
  /**
   * Set callback
   */
  setCallback(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback
    }
  }
  
  /**
   * Get state info
   */
  getState() {
    return {
      peerCount: this.peers.size,
      peerIds: this.getPeerIds(),
      peers: this.getPeers(),
      health: this.getAllPeerHealth(),
      heartbeatActive: this.heartbeatInterval !== null
    }
  }
}

export default PeerManager
