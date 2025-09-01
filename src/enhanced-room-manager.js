/**
 * Enhanced Room Manager - Advanced room management system with persistence, 
 * matchmaking, and comprehensive lobby features
 */

import { joinRoom as joinNostrRoom, selfId } from './nostr.js'
import { toJson, fromJson, genId } from './utils.js'
import { LobbyAnalytics } from './lobby-analytics.js'

// Configuration constants
const ROOM_ANNOUNCE_INTERVAL = 3000 // 3 seconds
const ROOM_CLEANUP_INTERVAL = 10000 // 10 seconds
const ROOM_TIMEOUT = 15000 // 15 seconds - room considered dead if no update
const MAX_ROOM_HISTORY = 50 // Maximum number of rooms to keep in history
const HEARTBEAT_INTERVAL = 2000 // 2 seconds

// Room states
export const RoomState = {
  WAITING: 'waiting',
  STARTING: 'starting',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed'
}

// Player roles
export const PlayerRole = {
  HOST: 'host',
  PLAYER: 'player',
  SPECTATOR: 'spectator',
  MODERATOR: 'moderator'
}

// Room types
export const RoomType = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  RANKED: 'ranked',
  CUSTOM: 'custom',
  TOURNAMENT: 'tournament'
}

export class EnhancedRoomManager {
  constructor(appId, config = {}) {
    this.appId = appId
    this.config = {
      maxRooms: 100,
      enablePersistence: true,
      enableMatchmaking: true,
      enableSpectators: true,
      enableChat: true,
      enableVoice: false,
      ...config
    }
    
    // Core data structures
    this.rooms = new Map() // roomId -> room info
    this.roomHistory = [] // Historical room data
    this.players = new Map() // playerId -> player info
    this.currentRoom = null
    this.playerInfo = null
    
    // Connection management
    this.lobbyRoom = null
    this.gameRoom = null
    this.chatChannels = new Map()
    
    // Intervals and timers
    this.announceInterval = null
    this.cleanupInterval = null
    this.heartbeatInterval = null
    
    // Event listeners
    this.listeners = {
      onRoomListUpdate: () => {},
      onRoomCreated: () => {},
      onRoomDeleted: () => {},
      onPlayerJoin: () => {},
      onPlayerLeave: () => {},
      onPlayerUpdate: () => {},
      onGameStateUpdate: () => {},
      onHostMigration: () => {},
      onChatMessage: () => {},
      onRoomSettingsChange: () => {},
      onMatchmakingComplete: () => {},
      onSpectatorJoin: () => {},
      onSpectatorLeave: () => {},
      onRoomStateChange: () => {}
    }
    
    // Statistics and Analytics
    this.stats = {
      totalRoomsCreated: 0,
      totalPlayersJoined: 0,
      averageRoomDuration: 0,
      peakConcurrentRooms: 0,
      popularGameModes: new Map()
    }
    
    // Initialize analytics module
    this.analytics = new LobbyAnalytics()
    
    // Initialize
    this._initialize()
  }
  
  /**
   * Initialize the room manager
   */
  async _initialize() {
    // Load persisted data if enabled
    if (this.config.enablePersistence) {
      await this._loadPersistedData()
    }
    
    // Set up player info
    this.playerInfo = {
      id: selfId,
      name: `Player_${selfId.slice(0, 6)}`,
      role: PlayerRole.PLAYER,
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        rating: 1000
      },
      preferences: {
        preferredGameMode: null,
        preferredRoomSize: 4
      }
    }
    
    // Connect to lobby
    this._connectToLobby()
    
    // Start heartbeat
    this._startHeartbeat()
  }
  
  /**
   * Connect to the lobby for room discovery
   */
  _connectToLobby() {
    const lobbyRoomId = `${this.appId}_enhanced_lobby`
    
    this.lobbyRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      lobbyRoomId
    )
    
    // Set up lobby actions
    const [sendRoomAnnounce, onRoomAnnounce] = this.lobbyRoom.makeAction('room_announce')
    const [sendRoomClose, onRoomClose] = this.lobbyRoom.makeAction('room_close')
    const [sendRoomUpdate, onRoomUpdate] = this.lobbyRoom.makeAction('room_update')
    const [sendPlayerUpdate, onPlayerUpdate] = this.lobbyRoom.makeAction('player_update')
    const [sendMatchmakingRequest, onMatchmakingRequest] = this.lobbyRoom.makeAction('matchmaking_request')
    const [sendMatchmakingResponse, onMatchmakingResponse] = this.lobbyRoom.makeAction('matchmaking_response')
    
    this.lobbyActions = {
      sendRoomAnnounce,
      sendRoomClose,
      sendRoomUpdate,
      sendPlayerUpdate,
      sendMatchmakingRequest,
      sendMatchmakingResponse
    }
    
    // Handle room announcements
    onRoomAnnounce((roomData, peerId) => {
      const room = typeof roomData === 'string' ? fromJson(roomData) : roomData
      room.lastSeen = Date.now()
      room.hostId = peerId
      
      // Validate room data
      if (this._validateRoomData(room)) {
        this.rooms.set(room.id, room)
        this._updateStatistics('roomCreated', room)
        this.listeners.onRoomCreated(room)
        this._notifyRoomListUpdate()
      }
    })
    
    // Handle room closures
    onRoomClose((roomId, peerId) => {
      const room = this.rooms.get(roomId)
      if (room && room.hostId === peerId) {
        this._archiveRoom(room)
        this.rooms.delete(roomId)
        this.listeners.onRoomDeleted(roomId)
        this._notifyRoomListUpdate()
      }
    })
    
    // Handle room updates
    onRoomUpdate((updateData, peerId) => {
      const update = typeof updateData === 'string' ? fromJson(updateData) : updateData
      const room = this.rooms.get(update.roomId)
      
      if (room && room.hostId === peerId) {
        Object.assign(room, update.changes)
        room.lastSeen = Date.now()
        this._notifyRoomListUpdate()
      }
    })
    
    // Handle player updates
    onPlayerUpdate((playerData, peerId) => {
      const player = typeof playerData === 'string' ? fromJson(playerData) : playerData
      player.id = peerId
      player.lastSeen = Date.now()
      
      this.players.set(peerId, player)
      this.listeners.onPlayerUpdate(player)
    })
    
    // Handle matchmaking
    if (this.config.enableMatchmaking) {
      onMatchmakingRequest((request, peerId) => {
        this._handleMatchmakingRequest(request, peerId)
      })
      
      onMatchmakingResponse((response, peerId) => {
        this._handleMatchmakingResponse(response, peerId)
      })
    }
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this._cleanupStaleRooms()
    }, ROOM_CLEANUP_INTERVAL)
  }
  
  /**
   * Create a new room
   */
  async createRoom(options = {}) {
    if (this.currentRoom) {
      await this.leaveRoom()
    }
    
    const roomId = options.roomId || genId(16)
    const roomCode = this._generateRoomCode()
    
    const roomInfo = {
      id: roomId,
      code: roomCode,
      name: options.name || `Room ${roomCode}`,
      type: options.type || RoomType.PUBLIC,
      state: RoomState.WAITING,
      hostId: selfId,
      hostName: this.playerInfo.name,
      players: [{
        id: selfId,
        name: this.playerInfo.name,
        role: PlayerRole.HOST,
        ready: false,
        team: null,
        stats: this.playerInfo.stats
      }],
      spectators: [],
      maxPlayers: options.maxPlayers || 4,
      maxSpectators: options.maxSpectators || 10,
      settings: {
        gameMode: options.gameMode || 'default',
        timeLimit: options.timeLimit || 0,
        scoreLimit: options.scoreLimit || 0,
        allowSpectators: options.allowSpectators !== false,
        allowLateJoin: options.allowLateJoin !== false,
        isPasswordProtected: !!options.password,
        password: options.password || null,
        customRules: options.customRules || {}
      },
      metadata: {
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        region: options.region || 'auto',
        language: options.language || 'en',
        tags: options.tags || []
      },
      chat: {
        messages: [],
        enabled: this.config.enableChat
      }
    }
    
    // Join the game room
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      roomId
    )
    
    // Set up game room actions
    this._setupGameRoomActions()
    
    // Store room info
    this.currentRoom = roomInfo
    this.playerInfo.role = PlayerRole.HOST
    
    // Announce room to lobby
    this._announceRoom()
    
    // Start announce interval
    this.announceInterval = setInterval(() => {
      this._announceRoom()
    }, ROOM_ANNOUNCE_INTERVAL)
    
    // Update statistics and analytics
    this._updateStatistics('roomCreated', roomInfo)
    this.analytics.trackRoomCreated(roomInfo)
    
    // Persist if enabled
    if (this.config.enablePersistence) {
      await this._persistRoomData(roomInfo)
    }
    
    return roomInfo
  }
  
  /**
   * Join an existing room
   */
  async joinRoom(roomId, options = {}) {
    if (this.currentRoom) {
      await this.leaveRoom()
    }
    
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new Error('Room not found')
    }
    
    // Check if room is full
    if (!options.asSpectator && room.players.length >= room.maxPlayers) {
      if (!room.settings.allowSpectators) {
        throw new Error('Room is full')
      }
      options.asSpectator = true
    }
    
    // Check password if protected
    if (room.settings.isPasswordProtected && room.settings.password !== options.password) {
      throw new Error('Invalid password')
    }
    
    // Join the game room
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      roomId
    )
    
    // Set up game room actions
    this._setupGameRoomActions()
    
    // Set current room
    this.currentRoom = room
    this.playerInfo.role = options.asSpectator ? PlayerRole.SPECTATOR : PlayerRole.PLAYER
    
    // Send join message
    const joinData = {
      player: {
        id: selfId,
        name: this.playerInfo.name,
        role: this.playerInfo.role,
        ready: false,
        team: null,
        stats: this.playerInfo.stats
      },
      asSpectator: options.asSpectator
    }
    
    this.gameActions.sendPlayerJoin(toJson(joinData))
    
    // Update statistics
    this._updateStatistics('playerJoined', room)
    
    return room
  }
  
  /**
   * Leave current room
   */
  async leaveRoom() {
    if (!this.currentRoom) {
      return
    }
    
    // Send leave message
    if (this.gameActions) {
      this.gameActions.sendPlayerLeave(selfId)
    }
    
    // If host, close the room
    if (this.playerInfo.role === PlayerRole.HOST) {
      this.lobbyActions.sendRoomClose(this.currentRoom.id)
      
      // Stop announce interval
      if (this.announceInterval) {
        clearInterval(this.announceInterval)
        this.announceInterval = null
      }
    }
    
    // Clean up
    this.currentRoom = null
    this.gameRoom = null
    this.gameActions = null
    this.playerInfo.role = PlayerRole.PLAYER
  }
  
  /**
   * Quick play - find and join a suitable room
   */
  async quickPlay(preferences = {}) {
    const suitableRooms = this._findSuitableRooms(preferences)
    
    if (suitableRooms.length > 0) {
      // Join the best matching room
      const bestRoom = suitableRooms[0]
      return await this.joinRoom(bestRoom.id)
    } else {
      // Create a new room
      return await this.createRoom({
        name: 'Quick Play Room',
        type: RoomType.PUBLIC,
        ...preferences
      })
    }
  }
  
  /**
   * Start matchmaking
   */
  async startMatchmaking(criteria = {}) {
    if (!this.config.enableMatchmaking) {
      throw new Error('Matchmaking is not enabled')
    }
    
    const request = {
      playerId: selfId,
      playerStats: this.playerInfo.stats,
      criteria: {
        gameMode: criteria.gameMode || 'any',
        skillRange: criteria.skillRange || 200,
        maxWaitTime: criteria.maxWaitTime || 30000,
        region: criteria.region || 'auto',
        ...criteria
      },
      timestamp: Date.now()
    }
    
    this.lobbyActions.sendMatchmakingRequest(toJson(request))
    
    // Set up timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Matchmaking timeout'))
      }, request.criteria.maxWaitTime)
      
      // Store resolver for when we get a response
      this.matchmakingResolver = { resolve, reject, timeout }
    })
  }
  
  /**
   * Send chat message
   */
  sendChatMessage(message, options = {}) {
    if (!this.currentRoom || !this.config.enableChat) {
      return
    }
    
    const chatMessage = {
      id: genId(8),
      playerId: selfId,
      playerName: this.playerInfo.name,
      message: message,
      timestamp: Date.now(),
      type: options.type || 'chat',
      team: options.team || null
    }
    
    if (this.gameActions) {
      this.gameActions.sendChatMessage(toJson(chatMessage))
    }
    
    // Add to local chat history
    if (this.currentRoom.chat) {
      this.currentRoom.chat.messages.push(chatMessage)
      this.listeners.onChatMessage(chatMessage)
    }
  }
  
  /**
   * Update room settings (host only)
   */
  updateRoomSettings(settings) {
    if (!this.currentRoom || this.playerInfo.role !== PlayerRole.HOST) {
      throw new Error('Only the host can update room settings')
    }
    
    // Merge settings
    Object.assign(this.currentRoom.settings, settings)
    
    // Send update to all players
    if (this.gameActions) {
      this.gameActions.sendSettingsUpdate(toJson(settings))
    }
    
    // Update in lobby
    this.lobbyActions.sendRoomUpdate(toJson({
      roomId: this.currentRoom.id,
      changes: { settings: this.currentRoom.settings }
    }))
    
    this.listeners.onRoomSettingsChange(this.currentRoom.settings)
  }
  
  /**
   * Start the game (host only)
   */
  startGame() {
    if (!this.currentRoom || this.playerInfo.role !== PlayerRole.HOST) {
      throw new Error('Only the host can start the game')
    }
    
    if (this.currentRoom.players.length < 2) {
      throw new Error('Need at least 2 players to start')
    }
    
    // Check if all players are ready
    const allReady = this.currentRoom.players.every(p => p.ready || p.role === PlayerRole.HOST)
    if (!allReady) {
      throw new Error('Not all players are ready')
    }
    
    // Update room state
    this.currentRoom.state = RoomState.STARTING
    this.currentRoom.metadata.startedAt = Date.now()
    
    // Send start signal
    if (this.gameActions) {
      this.gameActions.sendGameStart({
        startTime: Date.now(),
        settings: this.currentRoom.settings
      })
    }
    
    // Update in lobby
    this.lobbyActions.sendRoomUpdate(toJson({
      roomId: this.currentRoom.id,
      changes: { state: RoomState.IN_PROGRESS }
    }))
    
    this.listeners.onRoomStateChange(RoomState.STARTING)
  }
  
  /**
   * Toggle player ready status
   */
  toggleReady() {
    if (!this.currentRoom || this.playerInfo.role === PlayerRole.SPECTATOR) {
      return
    }
    
    const player = this.currentRoom.players.find(p => p.id === selfId)
    if (player) {
      player.ready = !player.ready
      
      if (this.gameActions) {
        this.gameActions.sendPlayerUpdate(toJson({
          playerId: selfId,
          updates: { ready: player.ready }
        }))
      }
    }
  }
  
  /**
   * Get room statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      currentRooms: this.rooms.size,
      currentPlayers: this.players.size,
      roomHistory: this.roomHistory.slice(-10) // Last 10 rooms
    }
  }
  
  /**
   * Set event listener
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = callback
    }
  }
  
  // Private helper methods
  
  _setupGameRoomActions() {
    if (!this.gameRoom) return
    
    // Player management
    const [sendPlayerJoin, onPlayerJoin] = this.gameRoom.makeAction('player_join')
    const [sendPlayerLeave, onPlayerLeave] = this.gameRoom.makeAction('player_leave')
    const [sendPlayerUpdate, onPlayerUpdate] = this.gameRoom.makeAction('player_update')
    
    // Game management
    const [sendGameStart, onGameStart] = this.gameRoom.makeAction('game_start')
    const [sendGameState, onGameState] = this.gameRoom.makeAction('game_state')
    const [sendSettingsUpdate, onSettingsUpdate] = this.gameRoom.makeAction('settings_update')
    
    // Chat
    const [sendChatMessage, onChatMessage] = this.gameRoom.makeAction('chat_message')
    
    // Host migration
    const [sendHostMigration, onHostMigration] = this.gameRoom.makeAction('host_migration')
    
    this.gameActions = {
      sendPlayerJoin,
      sendPlayerLeave,
      sendPlayerUpdate,
      sendGameStart,
      sendGameState,
      sendSettingsUpdate,
      sendChatMessage,
      sendHostMigration
    }
    
    // Handle player join
    onPlayerJoin((data, peerId) => {
      const joinData = typeof data === 'string' ? fromJson(data) : data
      
      if (joinData.asSpectator && this.currentRoom.spectators.length < this.currentRoom.maxSpectators) {
        this.currentRoom.spectators.push(joinData.player)
        this.listeners.onSpectatorJoin(joinData.player)
      } else if (this.currentRoom.players.length < this.currentRoom.maxPlayers) {
        this.currentRoom.players.push(joinData.player)
        this.listeners.onPlayerJoin(joinData.player)
      }
      
      // Send current room state to new player
      if (this.playerInfo.role === PlayerRole.HOST) {
        this.gameActions.sendGameState(toJson(this.currentRoom))
      }
    })
    
    // Handle player leave
    onPlayerLeave((playerId) => {
      const playerIndex = this.currentRoom.players.findIndex(p => p.id === playerId)
      if (playerIndex !== -1) {
        const player = this.currentRoom.players[playerIndex]
        this.currentRoom.players.splice(playerIndex, 1)
        this.listeners.onPlayerLeave(player)
        
        // Handle host migration if needed
        if (player.role === PlayerRole.HOST && this.currentRoom.players.length > 0) {
          this._migrateHost()
        }
      } else {
        const spectatorIndex = this.currentRoom.spectators.findIndex(s => s.id === playerId)
        if (spectatorIndex !== -1) {
          const spectator = this.currentRoom.spectators[spectatorIndex]
          this.currentRoom.spectators.splice(spectatorIndex, 1)
          this.listeners.onSpectatorLeave(spectator)
        }
      }
    })
    
    // Handle player updates
    onPlayerUpdate((data) => {
      const update = typeof data === 'string' ? fromJson(data) : data
      const player = this.currentRoom.players.find(p => p.id === update.playerId)
      
      if (player) {
        Object.assign(player, update.updates)
        this.listeners.onPlayerUpdate(player)
      }
    })
    
    // Handle game start
    onGameStart((data) => {
      this.currentRoom.state = RoomState.IN_PROGRESS
      this.listeners.onRoomStateChange(RoomState.IN_PROGRESS)
    })
    
    // Handle game state updates
    onGameState((data) => {
      const state = typeof data === 'string' ? fromJson(data) : data
      this.currentRoom = state
      this.listeners.onGameStateUpdate(state)
    })
    
    // Handle settings updates
    onSettingsUpdate((data) => {
      const settings = typeof data === 'string' ? fromJson(data) : data
      Object.assign(this.currentRoom.settings, settings)
      this.listeners.onRoomSettingsChange(settings)
    })
    
    // Handle chat messages
    onChatMessage((data) => {
      const message = typeof data === 'string' ? fromJson(data) : data
      if (this.currentRoom.chat) {
        this.currentRoom.chat.messages.push(message)
        this.listeners.onChatMessage(message)
      }
    })
    
    // Handle host migration
    onHostMigration((data) => {
      const migration = typeof data === 'string' ? fromJson(data) : data
      const newHost = this.currentRoom.players.find(p => p.id === migration.newHostId)
      
      if (newHost) {
        // Update old host
        const oldHost = this.currentRoom.players.find(p => p.role === PlayerRole.HOST)
        if (oldHost) {
          oldHost.role = PlayerRole.PLAYER
        }
        
        // Set new host
        newHost.role = PlayerRole.HOST
        this.currentRoom.hostId = migration.newHostId
        this.currentRoom.hostName = newHost.name
        
        // Update local role if we're the new host
        if (migration.newHostId === selfId) {
          this.playerInfo.role = PlayerRole.HOST
          
          // Start announcing room
          this.announceInterval = setInterval(() => {
            this._announceRoom()
          }, ROOM_ANNOUNCE_INTERVAL)
        }
        
        this.listeners.onHostMigration(newHost)
      }
    })
  }
  
  _announceRoom() {
    if (!this.currentRoom || !this.lobbyActions) return
    
    const announcement = {
      id: this.currentRoom.id,
      code: this.currentRoom.code,
      name: this.currentRoom.name,
      type: this.currentRoom.type,
      state: this.currentRoom.state,
      playerCount: this.currentRoom.players.length,
      maxPlayers: this.currentRoom.maxPlayers,
      spectatorCount: this.currentRoom.spectators.length,
      maxSpectators: this.currentRoom.maxSpectators,
      settings: {
        gameMode: this.currentRoom.settings.gameMode,
        allowSpectators: this.currentRoom.settings.allowSpectators,
        allowLateJoin: this.currentRoom.settings.allowLateJoin,
        isPasswordProtected: this.currentRoom.settings.isPasswordProtected
      },
      metadata: {
        region: this.currentRoom.metadata.region,
        language: this.currentRoom.metadata.language,
        tags: this.currentRoom.metadata.tags
      }
    }
    
    this.lobbyActions.sendRoomAnnounce(toJson(announcement))
  }
  
  _cleanupStaleRooms() {
    const now = Date.now()
    let changed = false
    
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastSeen > ROOM_TIMEOUT) {
        this._archiveRoom(room)
        this.rooms.delete(roomId)
        changed = true
      }
    }
    
    if (changed) {
      this._notifyRoomListUpdate()
    }
  }
  
  _archiveRoom(room) {
    if (this.roomHistory.length >= MAX_ROOM_HISTORY) {
      this.roomHistory.shift()
    }
    
    this.roomHistory.push({
      ...room,
      archivedAt: Date.now()
    })
  }
  
  _validateRoomData(room) {
    return room.id && 
           room.name && 
           room.type && 
           room.maxPlayers > 0 &&
           room.maxPlayers <= 100
  }
  
  _generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }
  
  _findSuitableRooms(preferences) {
    const suitableRooms = []
    
    for (const room of this.rooms.values()) {
      // Skip full rooms
      if (room.players.length >= room.maxPlayers) continue
      
      // Skip private rooms
      if (room.type === RoomType.PRIVATE) continue
      
      // Skip in-progress rooms if late join not allowed
      if (room.state === RoomState.IN_PROGRESS && !room.settings.allowLateJoin) continue
      
      // Check game mode preference
      if (preferences.gameMode && room.settings.gameMode !== preferences.gameMode) continue
      
      // Check room size preference
      if (preferences.maxPlayers && room.maxPlayers !== preferences.maxPlayers) continue
      
      // Calculate match score
      let score = 100
      
      // Prefer rooms with more players (but not full)
      score += (room.players.length / room.maxPlayers) * 50
      
      // Prefer rooms in waiting state
      if (room.state === RoomState.WAITING) score += 20
      
      // Prefer rooms in same region
      if (preferences.region && room.metadata.region === preferences.region) score += 30
      
      suitableRooms.push({ ...room, matchScore: score })
    }
    
    // Sort by match score
    return suitableRooms.sort((a, b) => b.matchScore - a.matchScore)
  }
  
  _handleMatchmakingRequest(request, peerId) {
    // Only process if we're hosting a room
    if (!this.currentRoom || this.playerInfo.role !== PlayerRole.HOST) return
    
    const req = typeof request === 'string' ? fromJson(request) : request
    
    // Check if our room matches the criteria
    if (this._matchesCriteria(this.currentRoom, req.criteria)) {
      // Send response
      this.lobbyActions.sendMatchmakingResponse(toJson({
        requestId: req.playerId,
        roomId: this.currentRoom.id,
        roomInfo: {
          name: this.currentRoom.name,
          playerCount: this.currentRoom.players.length,
          maxPlayers: this.currentRoom.maxPlayers,
          gameMode: this.currentRoom.settings.gameMode,
          averageRating: this._calculateAverageRating()
        }
      }))
    }
  }
  
  _handleMatchmakingResponse(response, peerId) {
    const res = typeof response === 'string' ? fromJson(response) : response
    
    // Check if this response is for us
    if (res.requestId === selfId && this.matchmakingResolver) {
      clearTimeout(this.matchmakingResolver.timeout)
      
      // Join the room
      this.joinRoom(res.roomId).then(room => {
        this.matchmakingResolver.resolve(room)
        this.listeners.onMatchmakingComplete(room)
      }).catch(err => {
        this.matchmakingResolver.reject(err)
      })
      
      this.matchmakingResolver = null
    }
  }
  
  _matchesCriteria(room, criteria) {
    // Check game mode
    if (criteria.gameMode !== 'any' && room.settings.gameMode !== criteria.gameMode) {
      return false
    }
    
    // Check skill range
    if (criteria.skillRange) {
      const avgRating = this._calculateAverageRating()
      const playerRating = criteria.playerStats?.rating || 1000
      
      if (Math.abs(avgRating - playerRating) > criteria.skillRange) {
        return false
      }
    }
    
    // Check region
    if (criteria.region !== 'auto' && room.metadata.region !== criteria.region) {
      return false
    }
    
    // Check if room has space
    if (room.players.length >= room.maxPlayers) {
      return false
    }
    
    // Check if room is accepting players
    if (room.state !== RoomState.WAITING && !room.settings.allowLateJoin) {
      return false
    }
    
    return true
  }
  
  _calculateAverageRating() {
    if (!this.currentRoom || this.currentRoom.players.length === 0) {
      return 1000
    }
    
    const totalRating = this.currentRoom.players.reduce((sum, player) => {
      return sum + (player.stats?.rating || 1000)
    }, 0)
    
    return Math.round(totalRating / this.currentRoom.players.length)
  }
  
  _migrateHost() {
    // Find the next suitable host (prefer oldest player)
    const newHost = this.currentRoom.players[0]
    
    if (newHost) {
      this.gameActions.sendHostMigration(toJson({
        newHostId: newHost.id,
        timestamp: Date.now()
      }))
    }
  }
  
  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Update player status in lobby
      if (this.lobbyActions) {
        this.lobbyActions.sendPlayerUpdate(toJson({
          name: this.playerInfo.name,
          stats: this.playerInfo.stats,
          status: this.currentRoom ? 'in_room' : 'in_lobby'
        }))
      }
    }, HEARTBEAT_INTERVAL)
  }
  
  _updateStatistics(event, data) {
    switch (event) {
      case 'roomCreated':
        this.stats.totalRoomsCreated++
        if (this.rooms.size > this.stats.peakConcurrentRooms) {
          this.stats.peakConcurrentRooms = this.rooms.size
        }
        
        // Track popular game modes
        const gameMode = data.settings?.gameMode || 'default'
        this.stats.popularGameModes.set(
          gameMode,
          (this.stats.popularGameModes.get(gameMode) || 0) + 1
        )
        break
        
      case 'playerJoined':
        this.stats.totalPlayersJoined++
        break
        
      case 'roomCompleted':
        // Update average room duration
        if (data.metadata?.startedAt && data.metadata?.completedAt) {
          const duration = data.metadata.completedAt - data.metadata.startedAt
          this.stats.averageRoomDuration = 
            (this.stats.averageRoomDuration + duration) / 2
        }
        break
    }
  }
  
  _notifyRoomListUpdate() {
    const roomList = Array.from(this.rooms.values())
    this.listeners.onRoomListUpdate(roomList)
  }
  
  async _loadPersistedData() {
    try {
      const stored = localStorage.getItem(`${this.appId}_room_data`)
      if (stored) {
        const data = JSON.parse(stored)
        this.stats = data.stats || this.stats
        this.roomHistory = data.roomHistory || []
        this.playerInfo.stats = data.playerStats || this.playerInfo.stats
      }
    } catch (err) {
      console.warn('Failed to load persisted data:', err)
    }
  }
  
  async _persistRoomData(room) {
    try {
      const data = {
        stats: this.stats,
        roomHistory: this.roomHistory.slice(-MAX_ROOM_HISTORY),
        playerStats: this.playerInfo.stats,
        lastRoom: {
          id: room.id,
          name: room.name,
          settings: room.settings
        }
      }
      localStorage.setItem(`${this.appId}_room_data`, JSON.stringify(data))
    } catch (err) {
      console.warn('Failed to persist room data:', err)
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear intervals
    if (this.announceInterval) clearInterval(this.announceInterval)
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    
    // Leave current room
    if (this.currentRoom) {
      this.leaveRoom()
    }
    
    // Clear data
    this.rooms.clear()
    this.players.clear()
    this.chatChannels.clear()
  }
}

export default EnhancedRoomManager