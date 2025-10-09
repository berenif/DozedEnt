/**
 * RoomManager - Handles room creation, joining, and leaving
 * Focused responsibility: Room state management
 */

export class RoomManager {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
    this.trysteroRoom = null
    this.roomId = null
    this.localPeerId = null
    this.isHost = false
    this.callbacks = {
      onRoomJoined: null,
      onRoomLeft: null,
      onError: null
    }
  }
  
  /**
   * Create a new room
   */
  async createRoom(roomId, options = {}) {
    if (!this.connectionManager.isInitialized()) {
      throw new Error('ConnectionManager not initialized. Call initialize() first.')
    }
    
    try {
      console.log(`🏠 Creating room: ${roomId}`)
      this.connectionManager.setConnectionState('connecting')
      
      const { joinRoom } = this.connectionManager.getProvider().module
      
      // Create Trystero room
      this.trysteroRoom = joinRoom(this.connectionManager.getProvider().config, roomId)
      this.roomId = roomId
      this.isHost = true
      
      // Get our peer ID
      this.localPeerId = this.trysteroRoom.getPeerId?.() || this.generatePeerId()
      
      this.connectionManager.setConnectionState('connected')
      console.log('✅ Room created, peer ID:', this.localPeerId)
      
      if (this.callbacks.onRoomJoined) {
        this.callbacks.onRoomJoined({
          roomId: this.roomId,
          peerId: this.localPeerId,
          isHost: this.isHost
        })
      }
      
      return {
        roomId: this.roomId,
        peerId: this.localPeerId,
        isHost: this.isHost
      }
    } catch (error) {
      console.error('❌ Failed to create room:', error)
      this.connectionManager.setConnectionState('disconnected')
      this.emitError(error)
      throw error
    }
  }
  
  /**
   * Join an existing room
   */
  async joinRoom(roomId, options = {}) {
    if (!this.connectionManager.isInitialized()) {
      throw new Error('ConnectionManager not initialized. Call initialize() first.')
    }
    
    try {
      console.log(`🚪 Joining room: ${roomId}`)
      this.connectionManager.setConnectionState('connecting')
      
      const { joinRoom } = this.connectionManager.getProvider().module
      
      // Join Trystero room
      this.trysteroRoom = joinRoom(this.connectionManager.getProvider().config, roomId)
      this.roomId = roomId
      this.isHost = false
      
      // Get our peer ID
      this.localPeerId = this.trysteroRoom.getPeerId?.() || this.generatePeerId()
      
      this.connectionManager.setConnectionState('connected')
      console.log('✅ Room joined, peer ID:', this.localPeerId)
      
      if (this.callbacks.onRoomJoined) {
        this.callbacks.onRoomJoined({
          roomId: this.roomId,
          peerId: this.localPeerId,
          isHost: this.isHost
        })
      }
      
      return {
        roomId: this.roomId,
        peerId: this.localPeerId,
        isHost: this.isHost
      }
    } catch (error) {
      console.error('❌ Failed to join room:', error)
      this.connectionManager.setConnectionState('disconnected')
      this.emitError(error)
      throw error
    }
  }
  
  /**
   * Leave the current room
   */
  leaveRoom() {
    if (!this.trysteroRoom) return
    
    console.log('👋 Leaving room:', this.roomId)
    
    // Leave Trystero room
    this.trysteroRoom.leave()
    
    // Clean up
    this.trysteroRoom = null
    this.roomId = null
    
    this.connectionManager.setConnectionState('disconnected')
    console.log('✅ Left room')
    
    if (this.callbacks.onRoomLeft) {
      this.callbacks.onRoomLeft()
    }
  }
  
  /**
   * Get Trystero room instance
   */
  getTrysteroRoom() {
    return this.trysteroRoom
  }
  
  /**
   * Check if in a room
   */
  isInRoom() {
    return this.trysteroRoom !== null && this.roomId !== null
  }
  
  /**
   * Get current room info
   */
  getRoomInfo() {
    return {
      roomId: this.roomId,
      peerId: this.localPeerId,
      isHost: this.isHost,
      inRoom: this.isInRoom()
    }
  }
  
  /**
   * Generate a peer ID
   */
  generatePeerId() {
    return 'peer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
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
      roomId: this.roomId,
      peerId: this.localPeerId,
      isHost: this.isHost,
      inRoom: this.isInRoom()
    }
  }
}

export default RoomManager
