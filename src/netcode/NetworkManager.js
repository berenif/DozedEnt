/**
 * NetworkManager - Trystero Integration for P2P Multiplayer
 * Handles peer-to-peer connections, message passing, and room management
 */

export class NetworkManager {
  constructor(config = {}) {
    this.config = {
      defaultProvider: 'torrent',
      appId: 'dozedent-multiplayer',
      enableReconnection: true,
      heartbeatInterval: 5000,
      connectionTimeout: 30000,
      ...config
    }
    
    // State
    this.currentProvider = null
    this.trysteroRoom = null
    this.roomId = null
    this.localPeerId = null
    this.peers = new Map()
    this.isHost = false
    
    // Message handlers
    this.messageHandlers = new Map()
    
    // Event callbacks
    this.callbacks = {
      onPeerJoined: null,
      onPeerLeft: null,
      onConnectionStateChange: null,
      onError: null
    }
    
    // Connection state
    this.connectionState = 'disconnected' // disconnected, connecting, connected
    
    // Heartbeat
    this.heartbeatInterval = null
    
    // Actions (Trystero send/receive functions)
    this.actions = new Map()
  }
  
  /**
   * Initialize with a specific provider
   */
  async initialize(providerId = null) {
    const provider = providerId || this.config.defaultProvider
    
    try {
      console.log(`🌐 Initializing NetworkManager with provider: ${provider}`)
      
      // Import the appropriate Trystero provider
      let trysteroModule
      
      switch (provider) {
        case 'torrent':
          trysteroModule = await import('trystero/torrent')
          this.currentProvider = {
            id: 'torrent',
            module: trysteroModule,
            config: {
              appId: this.config.appId,
              trackerUrls: [
                'wss://tracker.openwebtorrent.com',
                'wss://tracker.webtorrent.dev',
                'wss://tracker.files.fm:7073/announce',
                'wss://tracker.novage.com.ua',
                'wss://tracker.fastcast.nz'
              ],
              // Disable problematic/offline trackers
              trackerRedundancy: 2 // Only need 2 working trackers
            }
          }
          break
          
        case 'firebase':
          trysteroModule = await import('trystero/firebase')
          this.currentProvider = {
            id: 'firebase',
            module: trysteroModule,
            config: this.config.firebaseConfig || {}
          }
          break
          
        case 'ipfs':
          trysteroModule = await import('trystero/ipfs')
          this.currentProvider = {
            id: 'ipfs',
            module: trysteroModule,
            config: { appId: this.config.appId }
          }
          break
          
        case 'mqtt':
          trysteroModule = await import('trystero/mqtt')
          this.currentProvider = {
            id: 'mqtt',
            module: trysteroModule,
            config: this.config.mqttConfig || {}
          }
          break
          
        case 'supabase':
          trysteroModule = await import('trystero/supabase')
          this.currentProvider = {
            id: 'supabase',
            module: trysteroModule,
            config: this.config.supabaseConfig || {}
          }
          break
          
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
      
      console.log('✅ NetworkManager initialized with provider:', provider)
      console.log('ℹ️ Note: Some tracker connection warnings are normal - only one tracker needs to succeed')
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize NetworkManager:', error)
      this.emitError(error)
      throw error
    }
  }
  
  /**
   * Create a new room
   */
  async createRoom(roomId, options = {}) {
    if (!this.currentProvider) {
      throw new Error('NetworkManager not initialized. Call initialize() first.')
    }
    
    try {
      console.log(`🏠 Creating room: ${roomId}`)
      this.setConnectionState('connecting')
      
      const { joinRoom } = this.currentProvider.module
      
      // Create Trystero room
      this.trysteroRoom = joinRoom(this.currentProvider.config, roomId)
      this.roomId = roomId
      this.isHost = true
      
      // Get our peer ID
      this.localPeerId = this.trysteroRoom.getPeerId?.() || this.generatePeerId()
      
      // Set up peer connection handlers
      this.setupPeerHandlers()
      
      // Set up message actions
      this.setupMessageActions()
      
      // Start heartbeat
      this.startHeartbeat()
      
      this.setConnectionState('connected')
      console.log('✅ Room created, peer ID:', this.localPeerId)
      
      return {
        roomId: this.roomId,
        peerId: this.localPeerId,
        isHost: this.isHost
      }
    } catch (error) {
      console.error('❌ Failed to create room:', error)
      this.setConnectionState('disconnected')
      this.emitError(error)
      throw error
    }
  }
  
  /**
   * Join an existing room
   */
  async joinRoom(roomId, options = {}) {
    if (!this.currentProvider) {
      throw new Error('NetworkManager not initialized. Call initialize() first.')
    }
    
    try {
      console.log(`🚪 Joining room: ${roomId}`)
      this.setConnectionState('connecting')
      
      const { joinRoom } = this.currentProvider.module
      
      // Join Trystero room
      this.trysteroRoom = joinRoom(this.currentProvider.config, roomId)
      this.roomId = roomId
      this.isHost = false
      
      // Get our peer ID
      this.localPeerId = this.trysteroRoom.getPeerId?.() || this.generatePeerId()
      
      // Set up peer connection handlers
      this.setupPeerHandlers()
      
      // Set up message actions
      this.setupMessageActions()
      
      // Start heartbeat
      this.startHeartbeat()
      
      this.setConnectionState('connected')
      console.log('✅ Room joined, peer ID:', this.localPeerId)
      
      return {
        roomId: this.roomId,
        peerId: this.localPeerId,
        isHost: this.isHost
      }
    } catch (error) {
      console.error('❌ Failed to join room:', error)
      this.setConnectionState('disconnected')
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
    
    // Stop heartbeat
    this.stopHeartbeat()
    
    // Leave Trystero room
    this.trysteroRoom.leave()
    
    // Clean up
    this.trysteroRoom = null
    this.roomId = null
    this.peers.clear()
    this.actions.clear()
    this.messageHandlers.clear()
    
    this.setConnectionState('disconnected')
    console.log('✅ Left room')
  }
  
  /**
   * Set up peer connection/disconnection handlers
   */
  setupPeerHandlers() {
    if (!this.trysteroRoom) return
    
    // Handle peer joins
    this.trysteroRoom.onPeerJoin(peerId => {
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
    this.trysteroRoom.onPeerLeave(peerId => {
      console.log('👋 Peer left:', peerId)
      this.peers.delete(peerId)
      
      if (this.callbacks.onPeerLeft) {
        this.callbacks.onPeerLeft(peerId)
      }
    })
  }
  
  /**
   * Set up message actions (send/receive)
   */
  setupMessageActions() {
    if (!this.trysteroRoom) return
    
    // Create actions for different message types
    const messageTypes = [
      'roomState',
      'playerJoin',
      'playerLeave',
      'playerReady',
      'chatMessage',
      'gameStart',
      'gameSync',
      'heartbeat'
    ]
    
    messageTypes.forEach(type => {
      const [sendAction, receiveAction] = this.trysteroRoom.makeAction(type)
      
      this.actions.set(type, {
        send: sendAction,
        receive: receiveAction
      })
      
      // Set up receiver
      receiveAction((data, peerId) => {
        this.handleMessage(type, data, peerId)
      })
    })
  }
  
  /**
   * Handle incoming messages
   */
  handleMessage(type, data, peerId) {
    // Update peer heartbeat
    if (this.peers.has(peerId)) {
      this.peers.get(peerId).lastHeartbeat = Date.now()
    }
    
    // Call registered handler
    if (this.messageHandlers.has(type)) {
      const handler = this.messageHandlers.get(type)
      try {
        handler(data, peerId)
      } catch (error) {
        console.error(`Error handling message type ${type}:`, error)
      }
    }
  }
  
  /**
   * Send message to specific peer
   */
  sendToPeer(peerId, message) {
    if (!this.trysteroRoom || !this.actions.has(message.type)) {
      console.warn('Cannot send message - not connected or invalid type')
      return false
    }
    
    const action = this.actions.get(message.type)
    action.send(message.data, peerId)
    return true
  }
  
  /**
   * Broadcast message to all peers
   */
  broadcastToRoom(message) {
    if (!this.trysteroRoom || !this.actions.has(message.type)) {
      console.warn('Cannot broadcast - not connected or invalid type')
      return false
    }
    
    const action = this.actions.get(message.type)
    action.send(message.data)
    return true
  }
  
  /**
   * Register message handler
   */
  onMessage(messageType, handler) {
    this.messageHandlers.set(messageType, handler)
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
   * Check if connected to room
   */
  isConnected() {
    return this.connectionState === 'connected' && this.trysteroRoom !== null
  }
  
  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.broadcastToRoom({
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
   * Check peer health based on heartbeat
   */
  checkPeerHealth() {
    const now = Date.now()
    const timeout = this.config.connectionTimeout
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastHeartbeat > timeout) {
        console.warn('⚠️ Peer timed out:', peerId)
        this.peers.delete(peerId)
        if (this.callbacks.onPeerLeft) {
          this.callbacks.onPeerLeft(peerId)
        }
      }
    }
  }
  
  /**
   * Set connection state and emit event
   */
  setConnectionState(state) {
    if (this.connectionState === state) return
    
    this.connectionState = state
    console.log('📡 Connection state:', state)
    
    if (this.callbacks.onConnectionStateChange) {
      this.callbacks.onConnectionStateChange(state)
    }
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
   * Generate a peer ID
   */
  generatePeerId() {
    return 'peer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
  
  /**
   * Get current state info
   */
  getState() {
    return {
      connected: this.isConnected(),
      roomId: this.roomId,
      peerId: this.localPeerId,
      isHost: this.isHost,
      provider: this.currentProvider?.id,
      peerCount: this.peers.size,
      connectionState: this.connectionState
    }
  }
}

export default NetworkManager

