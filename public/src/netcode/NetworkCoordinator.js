/**
 * NetworkCoordinator - Facade that composes focused network modules
 * Provides simple API while delegating to specialized managers
 */

import ConnectionManager from './ConnectionManager.js'
import RoomManager from './RoomManager.js'
import MessageManager from './MessageManager.js'
import PeerManager from './PeerManager.js'

export class NetworkCoordinator {
  constructor(config = {}) {
    this.config = config
    
    // Initialize managers
    this.connection = new ConnectionManager(config)
    this.rooms = new RoomManager(this.connection)
    this.messages = new MessageManager(this.rooms)
    this.peers = new PeerManager(this.rooms, config)
    
    // Set up cross-manager communication
    this.setupManagerCommunication()
  }
  
  /**
   * Set up communication between managers
   */
  setupManagerCommunication() {
    // Message manager handles heartbeat messages
    this.messages.onMessage('heartbeat', (data, peerId) => {
      this.peers.updatePeerHeartbeat(peerId)
    })
    
    // Room manager notifies when room is joined
    this.rooms.setCallback('onRoomJoined', () => {
      this.peers.setupPeerHandlers()
      this.messages.setupMessageActions()
      this.peers.startHeartbeat(this.messages)
    })
    
    // Room manager notifies when room is left
    this.rooms.setCallback('onRoomLeft', () => {
      this.peers.stopHeartbeat()
      this.peers.clearPeers()
      this.messages.clearHandlers()
    })
  }
  
  /**
   * Initialize with a specific provider
   */
  async initialize(providerId = null) {
    return await this.connection.initialize(providerId)
  }
  
  /**
   * Create a new room
   */
  async createRoom(roomId, options = {}) {
    return await this.rooms.createRoom(roomId, options)
  }
  
  /**
   * Join an existing room
   */
  async joinRoom(roomId, options = {}) {
    return await this.rooms.joinRoom(roomId, options)
  }
  
  /**
   * Leave the current room
   */
  leaveRoom() {
    this.rooms.leaveRoom()
  }
  
  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, message) {
    return this.messages.sendToPeer(peerId, message)
  }
  
  /**
   * Broadcast message to all peers
   */
  broadcastToRoom(message) {
    return this.messages.broadcastToRoom(message)
  }
  
  /**
   * Register message handler
   */
  onMessage(messageType, handler) {
    this.messages.onMessage(messageType, handler)
  }
  
  /**
   * Unregister message handler
   */
  offMessage(messageType) {
    this.messages.offMessage(messageType)
  }
  
  /**
   * Get peer connection info
   */
  getPeerConnection(peerId) {
    return this.peers.getPeerConnection(peerId)
  }
  
  /**
   * Get all connected peers
   */
  getPeers() {
    return this.peers.getPeers()
  }
  
  /**
   * Get peer count
   */
  getPeerCount() {
    return this.peers.getPeerCount()
  }
  
  /**
   * Check if connected to room
   */
  isConnected() {
    return this.rooms.isInRoom() && this.connection.getConnectionState() === 'connected'
  }
  
  /**
   * Get current state info
   */
  getState() {
    return {
      connected: this.isConnected(),
      roomId: this.rooms.getRoomInfo().roomId,
      peerId: this.rooms.getRoomInfo().peerId,
      isHost: this.rooms.getRoomInfo().isHost,
      provider: this.connection.getState().provider,
      peerCount: this.peers.getPeerCount(),
      connectionState: this.connection.getConnectionState(),
      messageTypes: this.messages.getMessageTypes(),
      peerHealth: this.peers.getAllPeerHealth()
    }
  }
  
  /**
   * Set callback for events
   */
  setCallback(event, callback) {
    switch (event) {
      case 'onPeerJoined':
        this.peers.setCallback('onPeerJoined', callback)
        break
      case 'onPeerLeft':
        this.peers.setCallback('onPeerLeft', callback)
        break
      case 'onConnectionStateChange':
        this.connection.setCallback('onConnectionStateChange', callback)
        break
      case 'onError':
        this.connection.setCallback('onError', callback)
        this.rooms.setCallback('onError', callback)
        this.messages.setCallback('onError', callback)
        this.peers.setCallback('onError', callback)
        break
      case 'onRoomJoined':
        this.rooms.setCallback('onRoomJoined', callback)
        break
      case 'onRoomLeft':
        this.rooms.setCallback('onRoomLeft', callback)
        break
      case 'onMessage':
        this.messages.setCallback('onMessage', callback)
        break
      case 'onPeerTimeout':
        this.peers.setCallback('onPeerTimeout', callback)
        break
      default:
        console.warn(`Unknown callback event: ${event}`)
    }
  }
  
  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      connection: this.connection.getState(),
      room: this.rooms.getState(),
      messages: this.messages.getState(),
      peers: this.peers.getState(),
      overall: this.getState()
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.leaveRoom()
    this.peers.stopHeartbeat()
    this.peers.clearPeers()
    this.messages.clearHandlers()
  }
}

export default NetworkCoordinator
