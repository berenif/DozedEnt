/**
 * Network Provider Manager
 * Abstracts away network provider implementation details from the application layer
 * Provides a unified interface for different Trystero network providers
 */

import { createLogger } from '../utils/logger.js'

export class NetworkProviderManager {
  constructor() {
    this.logger = createLogger({ 
      level: 'info',
      prefix: '[NetworkProvider]'
    })
    
    // Available providers and their configurations
    this.providers = {
      torrent: {
        name: 'Torrent (BitTorrent)',
        module: null,
        config: {
          appId: 'working-multiplayer-demo',
          password: null
        }
      },
      firebase: {
        name: 'Firebase',
        module: null,
        config: {
          appId: 'working-multiplayer-demo',
          password: null
        }
      },
      ipfs: {
        name: 'IPFS',
        module: null,
        config: {
          appId: 'working-multiplayer-demo',
          password: null
        }
      },
      mqtt: {
        name: 'MQTT',
        module: null,
        config: {
          appId: 'working-multiplayer-demo',
          password: null
        }
      },
      supabase: {
        name: 'Supabase',
        module: null,
        config: {
          appId: 'working-multiplayer-demo',
          password: null
        }
      }
    }
    
    // Current provider state
    this.currentProvider = null
    this.currentRoom = null
    this.isInitialized = false
    
    // Event handlers
    this.eventHandlers = {
      onProviderChanged: null,
      onRoomCreated: null,
      onRoomJoined: null,
      onRoomLeft: null,
      onPeerJoined: null,
      onPeerLeft: null,
      onMessageReceived: null,
      onError: null
    }
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      connectionsEstablished: 0,
      errors: 0
    }
  }
  
  /**
   * Get list of available providers
   * @returns {Array} Array of provider objects with id, name, and status
   */
  getAvailableProviders() {
    return Object.entries(this.providers).map(([id, provider]) => ({
      id,
      name: provider.name,
      isLoaded: provider.module !== null,
      config: provider.config
    }))
  }
  
  /**
   * Initialize a specific network provider
   * @param {string} providerId - The provider ID to initialize
   * @returns {Promise<boolean>} Success status
   */
  async initializeProvider(providerId) {
    try {
      if (!this.providers[providerId]) {
        throw new Error(`Unknown provider: ${providerId}`)
      }
      
      this.logger.info(`Initializing provider: ${providerId}`)
      
      // Import the appropriate Trystero module
      let trysteroModule
      switch (providerId) {
        case 'torrent':
          trysteroModule = await import('../../demos/dist/trystero-torrent.min.js')
          break
        case 'firebase':
          trysteroModule = await import('../../demos/dist/trystero-firebase.min.js')
          break
        case 'ipfs':
          trysteroModule = await import('../../demos/dist/trystero-ipfs.min.js')
          break
        case 'mqtt':
          trysteroModule = await import('../../demos/dist/trystero-mqtt.min.js')
          break
        case 'supabase':
          trysteroModule = await import('../../demos/dist/trystero-supabase.min.js')
          break
        default:
          throw new Error(`Unknown provider: ${providerId}`)
      }
      
      // Store the module
      this.providers[providerId].module = trysteroModule
      this.currentProvider = providerId
      this.isInitialized = true
      
      this.logger.info(`Provider ${providerId} initialized successfully`)
      
      // Notify event handler
      if (this.eventHandlers.onProviderChanged) {
        this.eventHandlers.onProviderChanged(providerId)
      }
      
      return true
      
    } catch (error) {
      this.logger.error(`Failed to initialize provider ${providerId}:`, error)
      this.stats.errors++
      
      // Provide specific error messages for common issues
      let errorMessage = error.message;
      if (error.message.includes('randomPrivateKey')) {
        errorMessage = `Nostr provider requires @noble/secp256k1 v3+. Please update dependencies.`;
      } else if (error.message.includes('Cannot resolve module')) {
        errorMessage = `Provider ${providerId} module not found. Check if dist/trystero-${providerId}.min.js exists.`;
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.providerId = providerId;
      
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(enhancedError)
      }
      
      return false
    }
  }
  
  /**
   * Create a room with the current provider
   * @param {string} roomId - Room identifier
   * @param {Object} options - Room options
   * @returns {Promise<Object>} Room instance
   */
  async createRoom(roomId, options = {}) {
    try {
      if (!this.isInitialized || !this.currentProvider) {
        throw new Error('No provider initialized')
      }
      
      const provider = this.providers[this.currentProvider]
      const { joinRoom: createTrysteroRoom } = provider.module
      
      // Create room with provider-specific config
      const roomConfig = {
        ...provider.config,
        ...options
      }
      
      this.currentRoom = createTrysteroRoom(roomConfig, roomId)
      
      // Set up room event handlers
      this.setupRoomEventHandlers()
      
      this.logger.info(`Room created: ${roomId} with provider: ${this.currentProvider}`)
      this.stats.connectionsEstablished++
      
      // Notify event handler
      if (this.eventHandlers.onRoomCreated) {
        this.eventHandlers.onRoomCreated(roomId, this.currentProvider)
      }
      
      return this.currentRoom
      
    } catch (error) {
      this.logger.error(`Failed to create room:`, error)
      this.stats.errors++
      
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error)
      }
      
      throw error
    }
  }
  
  /**
   * Join an existing room
   * @param {string} roomId - Room identifier
   * @param {Object} options - Join options
   * @returns {Promise<Object>} Room instance
   */
  async joinRoom(roomId, options = {}) {
    try {
      if (!this.isInitialized || !this.currentProvider) {
        throw new Error('No provider initialized')
      }
      
      const provider = this.providers[this.currentProvider]
      const { joinRoom: createTrysteroRoom } = provider.module
      
      // Join room with provider-specific config
      const roomConfig = {
        ...provider.config,
        ...options
      }
      
      this.currentRoom = createTrysteroRoom(roomConfig, roomId)
      
      // Set up room event handlers
      this.setupRoomEventHandlers()
      
      this.logger.info(`Joined room: ${roomId} with provider: ${this.currentProvider}`)
      this.stats.connectionsEstablished++
      
      // Notify event handler
      if (this.eventHandlers.onRoomJoined) {
        this.eventHandlers.onRoomJoined(roomId, this.currentProvider)
      }
      
      return this.currentRoom
      
    } catch (error) {
      this.logger.error(`Failed to join room:`, error)
      this.stats.errors++
      
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error)
      }
      
      throw error
    }
  }
  
  /**
   * Leave the current room
   */
  leaveRoom() {
    if (this.currentRoom) {
      this.currentRoom.leave()
      this.currentRoom = null
      this.logger.info('Left room')
      
      if (this.eventHandlers.onRoomLeft) {
        this.eventHandlers.onRoomLeft()
      }
    }
  }
  
  /**
   * Create actions for the current room
   * @param {string} actionName - Name of the action
   * @returns {Array} [sendAction, getAction] functions
   */
  createAction(actionName) {
    if (!this.currentRoom) {
      throw new Error('No active room')
    }
    
    return this.currentRoom.makeAction(actionName)
  }
  
  /**
   * Get connected peers
   * @returns {Object} Peer connection object
   */
  getPeers() {
    if (!this.currentRoom) {
      return {}
    }
    
    return this.currentRoom.getPeers()
  }
  
  /**
   * Get current provider information
   * @returns {Object} Current provider info
   */
  getCurrentProvider() {
    if (!this.currentProvider) {
      return null
    }
    
    return {
      id: this.currentProvider,
      name: this.providers[this.currentProvider].name,
      isInitialized: this.isInitialized
    }
  }
  
  /**
   * Get connection statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      currentProvider: this.currentProvider,
      isConnected: this.currentRoom !== null,
      peerCount: this.currentRoom ? Object.keys(this.getPeers()).length : 0
    }
  }
  
  /**
   * Set event handler
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    if (this.eventHandlers.hasOwnProperty(eventName)) {
      this.eventHandlers[eventName] = handler
    } else {
      this.logger.warn(`Unknown event: ${eventName}`)
    }
  }
  
  /**
   * Set up room event handlers
   * @private
   */
  setupRoomEventHandlers() {
    if (!this.currentRoom) {
      return
    }
    
    // Peer join/leave events
    this.currentRoom.onPeerJoin(peerId => {
      this.logger.info(`Peer joined: ${peerId}`)
      if (this.eventHandlers.onPeerJoined) {
        this.eventHandlers.onPeerJoined(peerId)
      }
    })
    
    this.currentRoom.onPeerLeave(peerId => {
      this.logger.info(`Peer left: ${peerId}`)
      if (this.eventHandlers.onPeerLeft) {
        this.eventHandlers.onPeerLeft(peerId)
      }
    })
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      connectionsEstablished: 0,
      errors: 0
    }
    this.logger.info('Statistics reset')
  }
  
  /**
   * Update message statistics
   * @param {string} type - 'sent' or 'received'
   */
  updateMessageStats(type) {
    if (type === 'sent') {
      this.stats.messagesSent++
    } else if (type === 'received') {
      this.stats.messagesReceived++
    }
  }
}

export default NetworkProviderManager
