/**
 * Multiplayer Main - Coordinates all multiplayer systems
 * Integrates lobby, room management, netcode, and game synchronization
 */

import { EnhancedRoomManager } from '../netcode/enhanced-room-manager.js'
import { EnhancedMultiplayerSync } from '../netcode/enhanced-multiplayer-sync.js'
import { RoomLobbyUI } from './multiplayer-ui-controller.js'
import { MultiplayerGameController } from './multiplayer-game-controller.js'
import { OrientationManager } from '../ui/orientation-manager.js'
import { NetworkManager } from '../netcode/NetworkManager.js'

class MultiplayerCoordinator {
  constructor() {
    this.roomManager = null
    this.networkManager = null
    this.multiplayerSync = null
    this.uiController = null
    this.gameController = null
    this.orientationManager = null
    this.initialized = false
    
    this.state = {
      playerName: this.loadPlayerName(),
      playerId: this.generatePlayerId(),
      currentRoom: null,
      isHost: false,
      isReady: false,
      gameStarted: false
    }
  }
  
  async initialize() {
    if (this.initialized) return
    
    console.log('🎮 Initializing multiplayer system...')
    
    try {
      // Initialize Network Manager
      this.networkManager = new NetworkManager({
        defaultProvider: 'torrent',
        appId: 'dozedent-multiplayer',
        enableReconnection: true
      })
      
      // Initialize network with default provider
      await this.networkManager.initialize('torrent')
      console.log('✅ Network manager initialized')
      
      // Initialize Room Manager
      this.roomManager = new EnhancedRoomManager('dozedent-multiplayer', {
        maxRooms: 50,
        enablePersistence: true,
        enableMatchmaking: true,
        enableSpectators: true,
        enableChat: true,
        enableAnalytics: true
      })
      
      // Connect network manager to room manager
      await this.roomManager.setNetworkManager(this.networkManager)
      
      // Initialize Multiplayer Sync (will be configured when game starts)
      this.multiplayerSync = new EnhancedMultiplayerSync({
        maxPlayers: 8,
        enableRollback: true,
        enableDesyncDetection: true,
        enableHostMigration: true,
        enableNetworkDiagnostics: true,
        enablePerformanceOptimization: true
      })
      
      // Initialize UI Controller
      this.uiController = new RoomLobbyUI(this)
      
      // Initialize Game Controller
      this.gameController = new MultiplayerGameController(this)
      
      // Initialize OrientationManager for mobile devices
      this.orientationManager = new OrientationManager({
        detectMobileDevice: () => {
          const userAgent = (navigator.userAgent || '').toLowerCase()
          const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
          const smallViewport = window.innerWidth <= 768
          const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|ipad|tablet/
          return mobileRegex.test(userAgent) || hasTouch || smallViewport
        },
        onOrientationChange: (isLandscape) => {
          console.log('📱 Orientation changed:', isLandscape ? 'landscape' : 'portrait')
        }
      })
      this.orientationManager.initialize()
      
      // Set up event listeners
      this.setupEventListeners()
      
      // Load player data
      this.loadPlayerData()
      
      // Initialize UI
      this.uiController.initialize()
      
      this.initialized = true
      console.log('✅ Multiplayer system initialized')
      
      // Show initial rooms
      await this.refreshRooms()
      
      // Enable mobile controls if needed
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        const mobileControls = document.getElementById('mobile-controls')
        if (mobileControls) {
          mobileControls.style.display = 'flex'
          console.log('✅ Mobile controls enabled')
        }
        // Evaluate orientation for mobile
        this.orientationManager.evaluateOrientation()
      }
    } catch (error) {
      console.error('❌ Failed to initialize multiplayer:', error)
      // Can't use this.showError here because uiController might not be initialized yet
      alert('Failed to initialize multiplayer system. Please refresh the page.\n\nError: ' + error.message)
    }
  }
  
  setupEventListeners() {
    // Room Manager Events
    this.roomManager.on('onRoomListUpdate', (rooms) => {
      console.log('📋 Room list updated:', rooms.length, 'rooms')
      this.uiController.updateRoomList(rooms)
    })
    
    this.roomManager.on('onRoomCreated', (room) => {
      console.log('🏠 Room created:', room.id)
      this.state.currentRoom = room
      this.state.isHost = true
      this.uiController.showCurrentRoom(room)
    })
    
    this.roomManager.on('onPlayerJoin', (player) => {
      console.log('👋 Player joined:', player.name)
      this.uiController.updatePlayerList(this.roomManager.currentRoom)
      this.showStatus(`${player.name} joined the room`, 'success')
    })
    
    this.roomManager.on('onPlayerLeave', (player) => {
      console.log('👋 Player left:', player.name)
      this.uiController.updatePlayerList(this.roomManager.currentRoom)
      this.showStatus(`${player.name} left the room`, 'warning')
    })
    
    this.roomManager.on('onHostMigration', (newHostId) => {
      console.log('👑 Host migrated to:', newHostId)
      this.state.isHost = (newHostId === this.state.playerId)
      this.showStatus('Host migrated', 'warning')
    })
    
    this.roomManager.on('onRoomStateChange', (state) => {
      console.log('🎮 Room state changed:', state)
      if (state === 'in_progress' && !this.state.gameStarted) {
        this.startGame()
      }
    })
    
    this.roomManager.on('onChatMessage', (message) => {
      console.log('💬 Chat:', message.player, ':', message.text)
    })
    
    // Multiplayer Sync Events (will be active during game)
    this.multiplayerSync.eventHandlers.onNetworkQualityChanged = (quality) => {
      console.log('📡 Network quality:', quality)
      this.uiController.updateNetworkQuality(quality)
    }
    
    this.multiplayerSync.eventHandlers.onDesyncDetected = (info) => {
      console.warn('⚠️ Desync detected:', info)
      this.showStatus('Synchronization issue detected, recovering...', 'warning')
    }
    
    this.multiplayerSync.eventHandlers.onRecoveryCompleted = (success) => {
      if (success) {
        console.log('✅ Sync recovered')
        this.showStatus('Synchronization restored', 'success')
      } else {
        console.error('❌ Sync recovery failed')
        this.showError('Failed to restore synchronization. You may need to rejoin.')
      }
    }
  }
  
  async createRoom(options) {
    try {
      this.showLoading(true)
      
      const roomConfig = {
        playerName: this.state.playerName,
        playerId: this.state.playerId,
        name: options.name,
        type: options.type || 'public',
        gameMode: options.gameMode || 'default',
        maxPlayers: options.maxPlayers || 4,
        allowSpectators: true,
        allowLateJoin: false
      }
      
      const room = await this.roomManager.createRoom(roomConfig)
      
      this.state.currentRoom = room
      this.state.isHost = true
      
      console.log('✅ Room created:', room.id)
      this.showStatus('Room created successfully!', 'success')
      
      return room
    } catch (error) {
      console.error('❌ Failed to create room:', error)
      this.showError('Failed to create room: ' + error.message)
      throw error
    } finally {
      this.showLoading(false)
    }
  }
  
  async joinRoom(roomId, options = {}) {
    try {
      this.showLoading(true)
      
      const joinConfig = {
        playerName: this.state.playerName,
        playerId: this.state.playerId,
        ...options
      }
      
      const room = await this.roomManager.joinRoom(roomId, joinConfig)
      
      this.state.currentRoom = room
      this.state.isHost = false
      
      console.log('✅ Joined room:', room.id)
      this.showStatus('Joined room successfully!', 'success')
      
      return room
    } catch (error) {
      console.error('❌ Failed to join room:', error)
      this.showError('Failed to join room: ' + error.message)
      throw error
    } finally {
      this.showLoading(false)
    }
  }
  
  async leaveRoom() {
    try {
      if (!this.state.currentRoom) return
      
      // If game is running, stop it first
      if (this.state.gameStarted) {
        this.stopGame()
      }
      
      await this.roomManager.leaveRoom()
      
      this.state.currentRoom = null
      this.state.isHost = false
      this.state.isReady = false
      
      this.uiController.hideCurrentRoom()
      this.showStatus('Left room', 'success')
      
      // Refresh room list
      await this.refreshRooms()
    } catch (error) {
      console.error('❌ Failed to leave room:', error)
      this.showError('Failed to leave room: ' + error.message)
    }
  }
  
  async quickPlay() {
    try {
      this.showLoading(true)
      
      const room = await this.roomManager.quickPlay({
        playerName: this.state.playerName,
        playerId: this.state.playerId,
        gameMode: 'default'
      })
      
      if (room) {
        this.state.currentRoom = room
        this.state.isHost = false
        this.showStatus('Joined room via Quick Play!', 'success')
      } else {
        // No available room, create one
        await this.createRoom({
          name: `${this.state.playerName}'s Room`,
          type: 'public',
          gameMode: 'default',
          maxPlayers: 4
        })
        this.showStatus('Created new room for Quick Play', 'success')
      }
    } catch (error) {
      console.error('❌ Quick play failed:', error)
      this.showError('Quick Play failed: ' + error.message)
    } finally {
      this.showLoading(false)
    }
  }
  
  async refreshRooms() {
    try {
      // Get all available rooms
      const rooms = Array.from(this.roomManager.rooms.values())
        .filter(room => room.status === 'waiting' && room.type === 'public')
      
      this.uiController.updateRoomList(rooms)
      console.log('🔄 Rooms refreshed:', rooms.length, 'available')
    } catch (error) {
      console.error('❌ Failed to refresh rooms:', error)
    }
  }
  
  toggleReady() {
    this.state.isReady = !this.state.isReady
    
    // Broadcast ready state to other players
    if (this.roomManager.currentRoom) {
      this.roomManager.broadcastToRoom('playerReady', {
        playerId: this.state.playerId,
        ready: this.state.isReady
      })
    }
    
    this.uiController.updateReadyButton(this.state.isReady)
    
    // If host and all players ready, can start game
    if (this.state.isHost) {
      const allReady = this.checkAllPlayersReady()
      if (allReady && this.state.isReady) {
        // Enable start game button or auto-start
        setTimeout(() => {
          this.startGame()
        }, 2000)
      }
    }
  }
  
  checkAllPlayersReady() {
    // TODO: Track ready state for all players
    return true
  }
  
  async startGame() {
    try {
      if (this.state.gameStarted) return
      
      console.log('🎮 Starting multiplayer game...')
      this.showLoading(true)
      
      // Update room state
      if (this.roomManager.currentRoom) {
        this.roomManager.currentRoom.status = 'in_progress'
      }
      
      // Initialize game controller
      await this.gameController.initialize()
      
      // Configure multiplayer sync with game integration
      const gameIntegration = this.gameController.getGameIntegration()
      const networkIntegration = this.getNetworkIntegration()
      const eventHandlers = this.multiplayerSync.eventHandlers
      
      await this.multiplayerSync.initialize(gameIntegration, networkIntegration, eventHandlers)
      
      // Start as host or client
      if (this.state.isHost) {
        await this.multiplayerSync.startAsHost(this.state.playerId, {
          maxPlayers: this.state.currentRoom?.maxPlayers || 4,
          gameMode: this.state.currentRoom?.gameMode || 'default'
        })
      } else {
        const hostId = this.getHostPlayerId()
        await this.multiplayerSync.joinAsClient(this.state.playerId, hostId)
      }
      
      // Start game loop
      await this.gameController.startGame()
      
      this.state.gameStarted = true
      
      // Hide lobby, show game
      this.uiController.showGame()
      
      // Request fullscreen and orientation lock on mobile when game starts
      if (this.orientationManager && this.orientationManager.detectMobileDevice()) {
        await this.orientationManager.requestFullscreenAndOrientationLock()
      }
      
      console.log('✅ Multiplayer game started')
      this.showStatus('Game started!', 'success')
    } catch (error) {
      console.error('❌ Failed to start game:', error)
      this.showError('Failed to start game: ' + error.message)
    } finally {
      this.showLoading(false)
    }
  }
  
  stopGame() {
    if (!this.state.gameStarted) return
    
    console.log('🛑 Stopping game...')
    
    // Stop game controller
    this.gameController.stopGame()
    
    // Shutdown multiplayer sync
    this.multiplayerSync.shutdown()
    
    this.state.gameStarted = false
    
    // Show lobby again
    this.uiController.showLobby()
    
    console.log('✅ Game stopped')
  }
  
  getNetworkIntegration() {
    return {
      sendToPeer: (peerId, message) => {
        if (this.networkManager) {
          this.networkManager.sendToPeer(peerId, {
            type: 'gameSync',
            data: message
          })
        }
      },
      broadcastMessage: (message) => {
        if (this.networkManager) {
          this.networkManager.broadcastToRoom({
            type: 'gameSync',
            data: message
          })
        }
      },
      getPeerConnection: (peerId) => {
        return this.networkManager?.getPeerConnection(peerId)
      }
    }
  }
  
  getHostPlayerId() {
    if (!this.state.currentRoom) return null
    const hostPlayer = this.state.currentRoom.players?.find(p => p.role === 'host')
    return hostPlayer?.id || null
  }
  
  // Player Data Management
  loadPlayerData() {
    const stored = localStorage.getItem('dozedent.player.stats')
    if (stored) {
      try {
        const stats = JSON.parse(stored)
        this.uiController.updatePlayerStats(stats)
      } catch (error) {
        console.error('Failed to load player stats:', error)
      }
    }
  }
  
  savePlayerData() {
    const stats = {
      rating: this.state.rating || 1000,
      gamesPlayed: this.state.gamesPlayed || 0,
      wins: this.state.wins || 0,
      losses: this.state.losses || 0
    }
    localStorage.setItem('dozedent.player.stats', JSON.stringify(stats))
  }
  
  loadPlayerName() {
    return localStorage.getItem('dozedent.player.name') || 'Player' + Math.floor(Math.random() * 1000)
  }
  
  savePlayerName(name) {
    this.state.playerName = name
    localStorage.setItem('dozedent.player.name', name)
  }
  
  generatePlayerId() {
    let id = localStorage.getItem('dozedent.player.id')
    if (!id) {
      id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('dozedent.player.id', id)
    }
    return id
  }
  
  async changeNetworkProvider(providerId) {
    try {
      console.log('🔄 Changing network provider to:', providerId)
      this.showStatus('Switching network provider...', 'info')
      
      // Leave current room if in one
      if (this.state.currentRoom) {
        await this.leaveRoom()
      }
      
      // Reinitialize network manager with new provider
      await this.networkManager.initialize(providerId)
      
      // Reconnect room manager
      await this.roomManager.setNetworkManager(this.networkManager)
      
      this.showStatus(`Switched to ${providerId} provider`, 'success')
      console.log('✅ Network provider changed to:', providerId)
    } catch (error) {
      console.error('❌ Failed to change provider:', error)
      this.showError('Failed to switch provider: ' + error.message)
    }
  }
  
  // UI Helpers
  showLoading(show) {
    this.uiController.showLoading(show)
  }
  
  showStatus(message, type = 'info') {
    this.uiController.showStatus(message, type)
  }
  
  showError(message) {
    this.uiController.showStatus(message, 'error')
  }
}

// Initialize and start
const coordinator = new MultiplayerCoordinator()
await coordinator.initialize()

// Expose for debugging
window.multiplayer = coordinator

console.log('🎮 Multiplayer system ready')