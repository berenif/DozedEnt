/**
 * Rollback Netcode Lobby System
 * Provides two hosting options:
 * 1. Dedicated Host - One player acts as the lobby host and coordinates connections
 * 2. Mesh P2P - All players connect to each other in a full mesh topology
 */

import RollbackNetcode from './rollback-netcode.js'
import RollbackP2P from './rollback-p2p.js'
import { joinRoom as joinNostrRoom } from './nostr.js'
import { createLogger } from './logger.js'
import { toJson, fromJson, genId } from './utils.js'

const LOBBY_ANNOUNCE_INTERVAL = 3000 // 3 seconds
const LOBBY_CLEANUP_INTERVAL = 5000 // 5 seconds
const LOBBY_TIMEOUT = 10000 // 10 seconds

// Hosting modes
const HOSTING_MODE = {
  DEDICATED_HOST: 'dedicated_host', // One player hosts, others connect to host
  MESH_P2P: 'mesh_p2p' // All players connect to each other
}

class RollbackLobby {
  constructor(appId, config = {}) {
    this.appId = appId
    this.config = {
      hostingMode: config.hostingMode || HOSTING_MODE.DEDICATED_HOST,
      maxPlayers: config.maxPlayers || 4,
      announceInterval: config.announceInterval || LOBBY_ANNOUNCE_INTERVAL,
      cleanupInterval: config.cleanupInterval || LOBBY_CLEANUP_INTERVAL,
      lobbyTimeout: config.lobbyTimeout || LOBBY_TIMEOUT,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Lobby state
    this.lobbyId = null
    this.localPlayerId = genId()
    this.isHost = false
    this.hostId = null
    this.players = new Map() // playerId -> player info
    this.lobbies = new Map() // lobbyId -> lobby info
    
    // Networking components
    this.rollbackNetcode = null
    this.p2pNetwork = null
    this.signalingRoom = null
    this.gameRoom = null
    
    // Intervals
    this.announceInterval = null
    this.cleanupInterval = null
    
    // Callbacks
    this.onLobbyListUpdate = null
    this.onPlayerJoin = null
    this.onPlayerLeave = null
    this.onGameStart = null
    this.onHostMigration = null
    
    // Connect to lobby discovery
    this._connectToLobbyDiscovery()
  }
  
  /**
   * Connect to lobby discovery system
   */
  _connectToLobbyDiscovery() {
    const discoveryRoomId = `${this.appId}_rollback_lobby`
    
    this.signalingRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      discoveryRoomId
    )
    
    // Set up lobby discovery actions
    const [sendLobbyAnnounce, onLobbyAnnounce] = this.signalingRoom.makeAction('lobby_announce')
    const [sendLobbyClose, onLobbyClose] = this.signalingRoom.makeAction('lobby_close')
    const [sendJoinRequest, onJoinRequest] = this.signalingRoom.makeAction('join_request')
    const [sendJoinResponse, onJoinResponse] = this.signalingRoom.makeAction('join_response')
    
    this.lobbyActions = {
      sendLobbyAnnounce,
      sendLobbyClose,
      sendJoinRequest,
      sendJoinResponse
    }
    
    // Handle lobby announcements
    onLobbyAnnounce((data, peerId) => {
      const lobby = typeof data === 'string' ? fromJson(data) : data
      lobby.lastSeen = Date.now()
      lobby.hostId = peerId
      
      this.lobbies.set(lobby.id, lobby)
      
      if (this.onLobbyListUpdate) {
        this.onLobbyListUpdate(this.getLobbies())
      }
    })
    
    // Handle lobby closures
    onLobbyClose((lobbyId, peerId) => {
      const lobby = this.lobbies.get(lobbyId)
      if (lobby && lobby.hostId === peerId) {
        this.lobbies.delete(lobbyId)
        
        if (this.onLobbyListUpdate) {
          this.onLobbyListUpdate(this.getLobbies())
        }
      }
    })
    
    // Handle join requests (for hosts)
    onJoinRequest((data, peerId) => {
      if (this.isHost && data.lobbyId === this.lobbyId) {
        this.handleJoinRequest(data, peerId)
      }
    })
    
    // Handle join responses (for clients)
    onJoinResponse((data, peerId) => {
      if (!this.isHost && data.playerId === this.localPlayerId) {
        this.handleJoinResponse(data, peerId)
      }
    })
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this._cleanupOldLobbies()
    }, this.config.cleanupInterval)
  }
  
  /**
   * Create a new lobby
   */
  async createLobby(lobbyName, gameConfig = {}) {
    if (this.lobbyId) {
      throw new Error('Already in a lobby')
    }
    
    this.lobbyId = genId()
    this.isHost = true
    this.hostId = this.localPlayerId
    
    // Create lobby info
    const lobbyInfo = {
      id: this.lobbyId,
      name: lobbyName,
      hostId: this.localPlayerId,
      hostingMode: this.config.hostingMode,
      maxPlayers: this.config.maxPlayers,
      currentPlayers: 1,
      gameConfig: gameConfig,
      createdAt: Date.now()
    }
    
    // Add self as first player
    this.players.set(this.localPlayerId, {
      id: this.localPlayerId,
      name: 'Host',
      ready: true,
      isHost: true,
      joinedAt: Date.now()
    })
    
    // Initialize rollback netcode
    this.rollbackNetcode = new RollbackNetcode(this.config.rollbackConfig || {})
    
    // Initialize P2P network
    this.p2pNetwork = new RollbackP2P(this.config.p2pConfig || {})
    
    // Set up P2P signaling based on hosting mode
    if (this.config.hostingMode === HOSTING_MODE.DEDICATED_HOST) {
      await this._setupDedicatedHostSignaling()
    } else {
      await this._setupMeshP2PSignaling()
    }
    
    // Start announcing lobby
    this._startLobbyAnnouncement(lobbyInfo)
    
    this.logger.info('Lobby created', { lobbyId: this.lobbyId, hostingMode: this.config.hostingMode })
    
    return this.lobbyId
  }
  
  /**
   * Join an existing lobby
   */
  joinLobby(lobbyId, playerName = 'Player') {
    if (this.lobbyId) {
      throw new Error('Already in a lobby')
    }
    
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) {
      throw new Error('Lobby not found')
    }
    
    if (lobby.currentPlayers >= lobby.maxPlayers) {
      throw new Error('Lobby is full')
    }
    
    this.lobbyId = lobbyId
    this.isHost = false
    this.hostId = lobby.hostId
    
    // Send join request to host
    this.lobbyActions.sendJoinRequest({
      lobbyId: lobbyId,
      playerId: this.localPlayerId,
      playerName: playerName
    })
    
    // Wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join request timeout'))
      }, 10000)
      
      this.pendingJoinResolve = () => {
        clearTimeout(timeout)
        resolve(this.lobbyId)
      }
      
      this.pendingJoinReject = (error) => {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }
  
  /**
   * Handle join request (host only)
   */
  async handleJoinRequest(data, peerId) {
    if (!this.isHost) {return}
    
    const lobby = this.lobbies.get(this.lobbyId)
    if (!lobby) {return}
    
    // Check if lobby is full
    if (this.players.size >= this.config.maxPlayers) {
      this.lobbyActions.sendJoinResponse({
        playerId: data.playerId,
        accepted: false,
        reason: 'Lobby is full'
      })
      return
    }
    
    // Add player
    this.players.set(data.playerId, {
      id: data.playerId,
      name: data.playerName,
      ready: false,
      isHost: false,
      joinedAt: Date.now(),
      peerId: peerId
    })
    
    // Send acceptance with lobby details
    this.lobbyActions.sendJoinResponse({
      playerId: data.playerId,
      accepted: true,
      lobbyInfo: {
        ...lobby,
        players: Array.from(this.players.values())
      },
      gameRoomId: this._getGameRoomId()
    })
    
    // Notify other players
    if (this.onPlayerJoin) {
      this.onPlayerJoin(data.playerId, data.playerName)
    }
    
    // In dedicated host mode, establish P2P connection
    if (this.config.hostingMode === HOSTING_MODE.DEDICATED_HOST) {
      await this.p2pNetwork.connectToPeer(data.playerId)
    }
  }
  
  /**
   * Handle join response (client only)
   */
  async handleJoinResponse(data, peerId) {
    if (data.accepted) {
      // Store lobby info
      this.hostId = peerId
      
      // Add players
      for (const player of data.lobbyInfo.players) {
        this.players.set(player.id, player)
      }
      
      // Initialize rollback netcode
      this.rollbackNetcode = new RollbackNetcode(this.config.rollbackConfig || {})
      
      // Initialize P2P network
      this.p2pNetwork = new RollbackP2P(this.config.p2pConfig || {})
      
      // Join game room for P2P signaling
      await this._joinGameRoom(data.gameRoomId)
      
      // Connect based on hosting mode
      if (this.config.hostingMode === HOSTING_MODE.DEDICATED_HOST) {
        // Connect only to host
        await this.p2pNetwork.connectToPeer(this.hostId)
      } else {
        // Connect to all existing players
        for (const [playerId] of this.players) {
          if (playerId !== this.localPlayerId) {
            await this.p2pNetwork.connectToPeer(playerId)
          }
        }
      }
      
      if (this.pendingJoinResolve) {
        this.pendingJoinResolve()
      }
    } else if (this.pendingJoinReject) {
        this.pendingJoinReject(new Error(data.reason || 'Join request rejected'))
      }
  }
  
  /**
   * Start the game (host only)
   */
  startGame(gameCallbacks) {
    if (!this.isHost) {
      throw new Error('Only the host can start the game')
    }
    
    if (this.players.size < 2) {
      throw new Error('Need at least 2 players to start')
    }
    
    // Initialize rollback netcode with game callbacks
    this.rollbackNetcode.initialize(gameCallbacks, this.localPlayerId)
    
    // Add all players to rollback system
    for (const [playerId] of this.players) {
      if (playerId !== this.localPlayerId) {
        this.rollbackNetcode.addPlayer(playerId)
      }
    }
    
    // Connect rollback to P2P network
    this._connectRollbackToP2P()
    
    // Broadcast game start to all players
    this._broadcastGameStart()
    
    // Start the rollback game loop
    this.rollbackNetcode.start()
    
    // Stop lobby announcements
    this._stopLobbyAnnouncement()
    
    if (this.onGameStart) {
      this.onGameStart()
    }
    
    this.logger.info('Game started', { players: this.players.size })
  }
  
  /**
   * Setup dedicated host signaling
   */
  _setupDedicatedHostSignaling() {
    const gameRoomId = this._getGameRoomId()
    
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      gameRoomId
    )
    
    // Set up WebRTC signaling actions
    const [sendOffer] = this.gameRoom.makeAction('webrtc_offer')
    const [sendAnswer] = this.gameRoom.makeAction('webrtc_answer')
    const [sendIceCandidate] = this.gameRoom.makeAction('webrtc_ice')
    const [sendGameStart, onGameStart] = this.gameRoom.makeAction('game_start')
    
    // Initialize P2P with signaling
    this.p2pNetwork.initialize({
      sendOffer: (peerId, offer) => sendOffer({ target: peerId, offer }),
      sendAnswer: (peerId, answer) => sendAnswer({ target: peerId, answer }),
      sendIceCandidate: (peerId, candidate) => sendIceCandidate({ target: peerId, candidate }),
      onOffer: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, offer: data.offer }
        }
      },
      onAnswer: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, answer: data.answer }
        }
      },
      onIceCandidate: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, candidate: data.candidate }
        }
      }
    }, this.localPlayerId)
    
    // Handle game start (for clients)
    onGameStart((data, from) => {
      if (!this.isHost && from === this.hostId) {
        this._handleGameStart(data)
      }
    })
    
    this.gameActions = { sendGameStart }
  }
  
  /**
   * Setup mesh P2P signaling
   */
  _setupMeshP2PSignaling() {
    const gameRoomId = this._getGameRoomId()
    
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      gameRoomId
    )
    
    // Set up WebRTC signaling actions for mesh topology
    const [sendOffer] = this.gameRoom.makeAction('mesh_offer')
    const [sendAnswer] = this.gameRoom.makeAction('mesh_answer')
    const [sendIceCandidate] = this.gameRoom.makeAction('mesh_ice')
    const [sendPlayerReady, onPlayerReady] = this.gameRoom.makeAction('player_ready')
    const [sendGameStart, onGameStart] = this.gameRoom.makeAction('game_start')
    
    // Initialize P2P with mesh signaling
    this.p2pNetwork.initialize({
      sendOffer: (peerId, offer) => sendOffer({ target: peerId, offer }),
      sendAnswer: (peerId, answer) => sendAnswer({ target: peerId, answer }),
      sendIceCandidate: (peerId, candidate) => sendIceCandidate({ target: peerId, candidate }),
      onOffer: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, offer: data.offer }
        }
      },
      onAnswer: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, answer: data.answer }
        }
      },
      onIceCandidate: (data, from) => {
        if (data.target === this.localPlayerId) {
          return { peerId: from, candidate: data.candidate }
        }
      }
    }, this.localPlayerId)
    
    // Handle player ready signals
    onPlayerReady((data, from) => {
      const player = this.players.get(from)
      if (player) {
        player.ready = true
        this._checkAllPlayersReady()
      }
    })
    
    // Handle game start
    onGameStart((data, from) => {
      if (from === this.hostId) {
        this._handleGameStart(data)
      }
    })
    
    this.gameActions = { sendPlayerReady, sendGameStart }
  }
  
  /**
   * Join game room (for clients)
   */
  async _joinGameRoom(gameRoomId) {
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      gameRoomId
    )
    
    // Set up the same signaling as host based on mode
    if (this.config.hostingMode === HOSTING_MODE.DEDICATED_HOST) {
      await this._setupDedicatedHostSignaling()
    } else {
      await this._setupMeshP2PSignaling()
    }
  }
  
  /**
   * Connect rollback netcode to P2P network
   */
  _connectRollbackToP2P() {
    // Connect rollback output to P2P
    this.rollbackNetcode.onSendInput = (frame, input) => {
      this.p2pNetwork.broadcastInput(frame, input)
    }
    
    this.rollbackNetcode.onSendSyncTest = (frame, checksum) => {
      this.p2pNetwork.broadcastSyncTest(frame, checksum)
    }
    
    // Connect P2P input to rollback
    this.p2pNetwork.onInputReceived = (peerId, frame, input) => {
      this.rollbackNetcode.receiveRemoteInput(peerId, frame, input)
    }
    
    this.p2pNetwork.onSyncTestReceived = (peerId, frame, checksum) => {
      this.rollbackNetcode.receiveSyncTest(peerId, frame, checksum)
    }
    
    // Handle peer connections
    this.p2pNetwork.onPeerConnected = (peerId) => {
      this.logger.info('Peer connected for rollback', { peerId })
    }
    
    this.p2pNetwork.onPeerDisconnected = (peerId) => {
      this.logger.warn('Peer disconnected', { peerId })
      this.rollbackNetcode.removePlayer(peerId)
      
      if (this.onPlayerLeave) {
        this.onPlayerLeave(peerId)
      }
      
      // Handle host migration if needed
      if (peerId === this.hostId && this.config.hostingMode === HOSTING_MODE.DEDICATED_HOST) {
        this._handleHostMigration()
      }
    }
  }
  
  /**
   * Broadcast game start
   */
  _broadcastGameStart() {
    if (this.gameActions && this.gameActions.sendGameStart) {
      this.gameActions.sendGameStart({
        players: Array.from(this.players.values()),
        gameConfig: this.lobbies.get(this.lobbyId)?.gameConfig || {}
      })
    }
  }
  
  /**
   * Handle game start (for clients)
   */
  _handleGameStart(data) {
    // Initialize rollback with received game config
    // Note: Game callbacks should be provided by the client application
    
    // Add all players to rollback system
    for (const player of data.players) {
      if (player.id !== this.localPlayerId) {
        this.rollbackNetcode.addPlayer(player.id)
      }
    }
    
    // Connect rollback to P2P network
    this._connectRollbackToP2P()
    
    // Start the rollback game loop
    this.rollbackNetcode.start()
    
    if (this.onGameStart) {
      this.onGameStart()
    }
  }
  
  /**
   * Handle host migration
   */
  _handleHostMigration() {
    // Find new host (player with lowest ID)
    const sortedPlayers = Array.from(this.players.keys()).sort()
    const newHostId = sortedPlayers[0]
    
    if (newHostId === this.localPlayerId) {
      this.isHost = true
      this.hostId = this.localPlayerId
      
      this.logger.info('Became new host after migration')
      
      if (this.onHostMigration) {
        this.onHostMigration(this.localPlayerId)
      }
      
      // Start announcing lobby again if game hasn't started
      if (!this.rollbackNetcode.running) {
        const lobbyInfo = this.lobbies.get(this.lobbyId)
        if (lobbyInfo) {
          lobbyInfo.hostId = this.localPlayerId
          this._startLobbyAnnouncement(lobbyInfo)
        }
      }
    } else {
      this.hostId = newHostId
      
      if (this.onHostMigration) {
        this.onHostMigration(newHostId)
      }
    }
  }
  
  /**
   * Get game room ID
   */
  _getGameRoomId() {
    return `${this.appId}_game_${this.lobbyId}`
  }
  
  /**
   * Start announcing lobby
   */
  _startLobbyAnnouncement(lobbyInfo) {
    this._stopLobbyAnnouncement()
    
    // Announce immediately
    this.lobbyActions.sendLobbyAnnounce(toJson(lobbyInfo))
    
    // Set up periodic announcements
    this.announceInterval = setInterval(() => {
      lobbyInfo.currentPlayers = this.players.size
      this.lobbyActions.sendLobbyAnnounce(toJson(lobbyInfo))
    }, this.config.announceInterval)
  }
  
  /**
   * Stop announcing lobby
   */
  _stopLobbyAnnouncement() {
    if (this.announceInterval) {
      clearInterval(this.announceInterval)
      this.announceInterval = null
    }
    
    // Send close message
    if (this.lobbyId) {
      this.lobbyActions.sendLobbyClose(this.lobbyId)
    }
  }
  
  /**
   * Clean up old lobbies
   */
  _cleanupOldLobbies() {
    const now = Date.now()
    
    for (const [lobbyId, lobby] of this.lobbies) {
      if (now - lobby.lastSeen > this.config.lobbyTimeout) {
        this.lobbies.delete(lobbyId)
      }
    }
  }
  
  /**
   * Get list of available lobbies
   */
  getLobbies() {
    return Array.from(this.lobbies.values())
      .filter(lobby => Date.now() - lobby.lastSeen < this.config.lobbyTimeout)
      .sort((a, b) => b.createdAt - a.createdAt)
  }
  
  /**
   * Get current players
   */
  getPlayers() {
    return Array.from(this.players.values())
  }
  
  /**
   * Leave current lobby
   */
  leaveLobby() {
    if (!this.lobbyId) {return}
    
    // Stop game if running
    if (this.rollbackNetcode) {
      this.rollbackNetcode.stop()
    }
    
    // Disconnect P2P connections
    if (this.p2pNetwork) {
      this.p2pNetwork.disconnectAll()
    }
    
    // Stop announcing if host
    if (this.isHost) {
      this._stopLobbyAnnouncement()
    }
    
    // Clean up
    this.lobbyId = null
    this.isHost = false
    this.hostId = null
    this.players.clear()
    this.rollbackNetcode = null
    this.p2pNetwork = null
    
    this.logger.info('Left lobby')
  }
  
  /**
   * Clean up and disconnect
   */
  destroy() {
    this.leaveLobby()
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    if (this.signalingRoom) {
      // Clean up signaling room if needed
    }
  }
}

export { RollbackLobby, HOSTING_MODE }