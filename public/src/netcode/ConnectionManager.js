/**
 * ConnectionManager - Handles provider initialization and connection state
 * Focused responsibility: WebRTC/WebSocket connection management
 */

export class ConnectionManager {
  constructor(config = {}) {
    this.config = {
      defaultProvider: 'torrent',
      appId: 'dozedent-multiplayer',
      enableReconnection: true,
      connectionTimeout: 30000,
      ...config
    }
    
    this.currentProvider = null
    this.connectionState = 'disconnected' // disconnected, connecting, connected
    this.callbacks = {
      onConnectionStateChange: null,
      onError: null
    }
  }
  
  /**
   * Initialize with a specific provider
   */
  async initialize(providerId = null) {
    const provider = providerId || this.config.defaultProvider
    
    try {
      console.log(`🌐 Initializing ConnectionManager with provider: ${provider}`)
      
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
              trackerRedundancy: 2
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
      
      console.log('✅ ConnectionManager initialized with provider:', provider)
      console.log('ℹ️ Note: Some tracker connection warnings are normal - only one tracker needs to succeed')
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize ConnectionManager:', error)
      this.emitError(error)
      throw error
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
   * Get current provider
   */
  getProvider() {
    return this.currentProvider
  }
  
  /**
   * Check if initialized
   */
  isInitialized() {
    return this.currentProvider !== null
  }
  
  /**
   * Get connection state
   */
  getConnectionState() {
    return this.connectionState
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
      provider: this.currentProvider?.id,
      connectionState: this.connectionState,
      initialized: this.isInitialized()
    }
  }
}

export default ConnectionManager
