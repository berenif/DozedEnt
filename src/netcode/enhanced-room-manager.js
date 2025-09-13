/**
 * Enhanced Room Manager - Advanced multiplayer room management
 * Features: Smart matchmaking, room persistence, advanced settings, team support
 */

import { idGenerator } from '../utils/deterministic-id-generator.js'
import { LobbyAnalytics } from '../utils/lobby-analytics.js'

export class EnhancedRoomManager {
  constructor(appId = 'default-game', config = {}) {
    this.appId = appId
    this.config = {
      maxRooms: 100,
      enablePersistence: true,
      enableMatchmaking: true,
      enableSpectators: true,
      enableChat: true,
      enableVoice: false,
      analyticsInterval: 60000,
      cleanupInterval: 30000,
      roomTimeout: 3600000, // 1 hour
      ...config
    }
    
    // Core data structures
    this.rooms = new Map()
    this.players = new Map()
    this.spectators = new Map()
    this.chatHistory = new Map()
    this.matchmakingQueue = []
    
    // Current session state
    this.currentRoom = null
    this.localPlayer = null
    this.isHost = false
    
    // Event listeners
    this.eventListeners = new Map()
    
    // Analytics
    this.analytics = new LobbyAnalytics()
    
    // Room types
    this.roomTypes = {
      PUBLIC: 'public',
      PRIVATE: 'private',
      RANKED: 'ranked',
      CUSTOM: 'custom',
      TOURNAMENT: 'tournament'
    }
    
    // Room states
    this.roomStates = {
      WAITING: 'waiting',
      STARTING: 'starting',
      IN_PROGRESS: 'in_progress',
      PAUSED: 'paused',
      COMPLETED: 'completed'
    }
    
    // Game modes
    this.gameModes = {
      DEFAULT: 'default',
      DEATHMATCH: 'deathmatch',
      TEAM_BATTLE: 'team',
      CAPTURE_FLAG: 'ctf',
      SURVIVAL: 'survival'
    }
    
    // Player roles
    this.playerRoles = {
      HOST: 'host',
      PLAYER: 'player',
      SPECTATOR: 'spectator',
      MODERATOR: 'moderator'
    }
    
    // Initialize
    this.initialize()
  }
  
  /**
   * Initialize the room manager
   */
  initialize() {
    // Load persisted rooms if enabled
    if (this.config.enablePersistence) {
      this.loadPersistedRooms()
    }
    
    // Start cleanup interval
    this.startCleanupInterval()
    
    // Start analytics if enabled
    if (this.config.enableAnalytics) {
      this.startAnalytics()
    }
    
    // Initialize matchmaking system
    if (this.config.enableMatchmaking) {
      this.initializeMatchmaking()
    }
  }
  
  /**
   * Create a new room with advanced settings
   */
  async createRoom(options = {}) {
    try {
      // Generate unique identifiers
      const roomId = this.generateRoomId()
      const roomCode = this.generateRoomCode()
      
      // Create room object with all settings
      const room = {
        id: roomId,
        code: roomCode,
        name: options.name || `Room ${roomCode}`,
        type: options.type || this.roomTypes.PUBLIC,
        state: this.roomStates.WAITING,
        gameMode: options.gameMode || this.gameModes.DEFAULT,
        
        // Player management
        maxPlayers: options.maxPlayers || 4,
        minPlayers: options.minPlayers || 2,
        players: new Map(),
        teams: options.enableTeams ? new Map() : null,
        
        // Spectator settings
        allowSpectators: options.allowSpectators !== false,
        maxSpectators: options.maxSpectators || 10,
        spectators: new Map(),
        
        // Game settings
        timeLimit: options.timeLimit || 600, // 10 minutes
        scoreLimit: options.scoreLimit || 100,
        customRules: options.customRules || {},
        
        // Room settings
        password: options.password || null,
        allowLateJoin: options.allowLateJoin !== false,
        autoStart: options.autoStart || false,
        
        // Metadata
        hostId: null,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        
        // Statistics
        stats: {
          messagesCount: 0,
          gamesPlayed: 0,
          totalDuration: 0
        }
      }
      
      // Store room
      this.rooms.set(roomId, room)
      
      // Persist if enabled
      if (this.config.enablePersistence) {
        this.persistRoom(room)
      }
      
      // Track analytics
      this.analytics.trackEvent('room_created', {
        roomId,
        type: room.type,
        gameMode: room.gameMode,
        maxPlayers: room.maxPlayers
      })
      
      // Emit event
      this.emit('onRoomCreated', room)
      
      return room
    } catch (error) {
      console.error('Failed to create room:', error)
      throw new Error(`Room creation failed: ${error.message}`)
    }
  }
  
  /**
   * Join a room with various options
   */
  async joinRoom(roomId, options = {}) {
    try {
      const room = this.rooms.get(roomId)
      
      if (!room) {
        throw new Error('Room not found')
      }
      
      // Check password if required
      if (room.password && room.password !== options.password) {
        throw new Error('Invalid password')
      }
      
      // Check if joining as spectator
      if (options.asSpectator) {
        return this.joinAsSpectator(roomId, options)
      }
      
      // Check room capacity
      if (room.players.size >= room.maxPlayers) {
        if (room.allowSpectators) {
          return this.joinAsSpectator(roomId, options)
        }
        throw new Error('Room is full')
      }
      
      // Check if game in progress and late join allowed
      if (room.state === this.roomStates.IN_PROGRESS && !room.allowLateJoin) {
        if (room.allowSpectators) {
          return this.joinAsSpectator(roomId, options)
        }
        throw new Error('Game already in progress')
      }
      
      // Create player object
      const player = {
        id: options.playerId || this.generatePlayerId(),
        name: options.playerName || `Player${Date.now() % 1000}`,
        role: room.players.size === 0 ? this.playerRoles.HOST : this.playerRoles.PLAYER,
        team: options.team || null,
        isReady: false,
        rating: options.rating || 1000,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0
        },
        joinedAt: Date.now()
      }
      
      // Set as host if first player
      if (room.players.size === 0) {
        room.hostId = player.id
        this.isHost = true
      }
      
      // Add player to room
      room.players.set(player.id, player)
      this.players.set(player.id, { roomId, ...player })
      
      // Set current room and player
      this.currentRoom = room
      this.localPlayer = player
      
      // Add to team if enabled
      if (room.teams && options.team) {
        this.assignToTeam(roomId, player.id, options.team)
      }
      
      // Track analytics
      this.analytics.trackEvent('player_joined', {
        roomId,
        playerId: player.id,
        role: player.role
      })
      
      // Emit events
      this.emit('onRoomJoined', room)
      this.emit('onPlayerJoin', player)
      
      // Check auto-start
      if (room.autoStart && room.players.size >= room.minPlayers) {
        this.checkAndStartGame(roomId)
      }
      
      return room
    } catch (error) {
      console.error('Failed to join room:', error)
      throw error
    }
  }
  
  /**
   * Join as spectator
   */
  async joinAsSpectator(roomId, options = {}) {
    const room = this.rooms.get(roomId)
    
    if (!room) {
      throw new Error('Room not found')
    }
    
    if (!room.allowSpectators) {
      throw new Error('Spectators not allowed')
    }
    
    if (room.spectators.size >= room.maxSpectators) {
      throw new Error('Spectator limit reached')
    }
    
    const spectator = {
      id: options.spectatorId || this.generatePlayerId(),
      name: options.spectatorName || `Spectator${Date.now() % 1000}`,
      role: this.playerRoles.SPECTATOR,
      joinedAt: Date.now()
    }
    
    room.spectators.set(spectator.id, spectator)
    this.spectators.set(spectator.id, { roomId, ...spectator })
    
    this.currentRoom = room
    this.localPlayer = spectator
    
    // Track analytics
    this.analytics.trackEvent('spectator_joined', {
      roomId,
      spectatorId: spectator.id
    })
    
    this.emit('onSpectatorJoin', spectator)
    
    return room
  }
  
  /**
   * Leave current room
   */
  async leaveRoom() {
    if (!this.currentRoom || !this.localPlayer) {
      return
    }
    
    const room = this.currentRoom
    const player = this.localPlayer
    
    // Remove from appropriate collection
    if (player.role === this.playerRoles.SPECTATOR) {
      room.spectators.delete(player.id)
      this.spectators.delete(player.id)
      this.emit('onSpectatorLeave', player)
    } else {
      room.players.delete(player.id)
      this.players.delete(player.id)
      
      // Handle host migration if needed
      if (room.hostId === player.id && room.players.size > 0) {
        this.migrateHost(room.id)
      }
      
      this.emit('onPlayerLeave', player)
    }
    
    // Track analytics
    this.analytics.trackEvent('player_left', {
      roomId: room.id,
      playerId: player.id,
      role: player.role
    })
    
    // Clean up room if empty
    if (room.players.size === 0 && room.spectators.size === 0) {
      this.deleteRoom(room.id)
    }
    
    this.currentRoom = null
    this.localPlayer = null
    this.isHost = false
  }
  
  /**
   * Quick play - find and join a suitable room
   */
  async quickPlay(preferences = {}) {
    try {
      // Find suitable rooms
      const suitableRooms = this.findSuitableRooms(preferences)
      
      if (suitableRooms.length > 0) {
        // Join the best available room
        const bestRoom = suitableRooms[0]
        return await this.joinRoom(bestRoom.id, preferences)
      }
      
      // No suitable room found, create one
      const newRoom = await this.createRoom({
        name: 'Quick Play Room',
        type: this.roomTypes.PUBLIC,
        gameMode: preferences.gameMode || this.gameModes.DEFAULT,
        maxPlayers: preferences.maxPlayers || 4,
        autoStart: true
      })
      
      return await this.joinRoom(newRoom.id, preferences)
    } catch (error) {
      console.error('Quick play failed:', error)
      throw error
    }
  }
  
  /**
   * Start skill-based matchmaking
   */
  async startMatchmaking(options = {}) {
    if (!this.config.enableMatchmaking) {
      throw new Error('Matchmaking is not enabled')
    }
    
    const matchRequest = {
      playerId: options.playerId || this.generatePlayerId(),
      playerName: options.playerName || `Player${Date.now() % 1000}`,
      rating: options.rating || 1000,
      gameMode: options.gameMode || this.gameModes.RANKED,
      skillRange: options.skillRange || 200,
      maxWaitTime: options.maxWaitTime || 30000,
      region: options.region || 'auto',
      startTime: Date.now()
    }
    
    // Add to matchmaking queue
    this.matchmakingQueue.push(matchRequest)
    
    // Track analytics
    this.analytics.trackEvent('matchmaking_started', {
      playerId: matchRequest.playerId,
      rating: matchRequest.rating,
      gameMode: matchRequest.gameMode
    })
    
    // Start matching process
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const match = this.findMatch(matchRequest)
        
        if (match) {
          clearInterval(checkInterval)
          this.removeFromMatchmaking(matchRequest.playerId)
          resolve(match)
        }
        
        // Check timeout
        if (Date.now() - matchRequest.startTime > matchRequest.maxWaitTime) {
          clearInterval(checkInterval)
          this.removeFromMatchmaking(matchRequest.playerId)
          
          // Expand search criteria and retry
          if (options.autoExpand !== false) {
            matchRequest.skillRange *= 1.5
            matchRequest.maxWaitTime *= 1.5
            this.matchmakingQueue.push(matchRequest)
          } else {
            reject(new Error('Matchmaking timeout'))
          }
        }
      }, 1000)
    })
  }
  
  /**
   * Send chat message
   */
  sendChatMessage(message, options = {}) {
    if (!this.config.enableChat || !this.currentRoom) {
      return
    }
    
    const chatMessage = {
      id: this.generateMessageId(),
      senderId: this.localPlayer?.id,
      senderName: this.localPlayer?.name || 'System',
      message: this.sanitizeMessage(message),
      timestamp: Date.now(),
      type: options.type || 'player',
      team: options.team || null,
      language: this.detectLanguage(message)
    }
    
    // Store in chat history
    if (!this.chatHistory.has(this.currentRoom.id)) {
      this.chatHistory.set(this.currentRoom.id, [])
    }
    this.chatHistory.get(this.currentRoom.id).push(chatMessage)
    
    // Update room stats
    this.currentRoom.stats.messagesCount++
    
    // Track analytics
    this.analytics.trackEvent('chat_message', {
      roomId: this.currentRoom.id,
      type: chatMessage.type,
      language: chatMessage.language,
      hasEmoji: /[\u{1F600}-\u{1F64F}]/u.test(message)
    })
    
    // Emit event
    this.emit('onChatMessage', chatMessage)
    
    return chatMessage
  }
  
  /**
   * Update room settings
   */
  updateRoomSettings(roomId, settings) {
    const room = this.rooms.get(roomId)
    
    if (!room) {
      throw new Error('Room not found')
    }
    
    // Check if user is host
    if (this.localPlayer?.id !== room.hostId) {
      throw new Error('Only host can update room settings')
    }
    
    // Update allowed settings
    const allowedSettings = [
      'name', 'gameMode', 'maxPlayers', 'timeLimit',
      'scoreLimit', 'allowSpectators', 'allowLateJoin',
      'password', 'customRules'
    ]
    
    for (const key of allowedSettings) {
      if (key in settings) {
        room[key] = settings[key]
      }
    }
    
    // Persist changes
    if (this.config.enablePersistence) {
      this.persistRoom(room)
    }
    
    // Track analytics
    this.analytics.trackEvent('room_settings_updated', {
      roomId,
      settings: Object.keys(settings)
    })
    
    // Emit event
    this.emit('onRoomSettingsChange', settings)
    
    return room
  }
  
  /**
   * Start the game
   */
  startGame(roomId) {
    const room = this.rooms.get(roomId || this.currentRoom?.id)
    
    if (!room) {
      throw new Error('Room not found')
    }
    
    // Check if user is host
    if (this.localPlayer?.id !== room.hostId) {
      throw new Error('Only host can start the game')
    }
    
    // Check minimum players
    if (room.players.size < room.minPlayers) {
      throw new Error(`Need at least ${room.minPlayers} players to start`)
    }
    
    // Update room state
    room.state = this.roomStates.IN_PROGRESS
    room.startedAt = Date.now()
    
    // Track analytics
    this.analytics.trackEvent('game_started', {
      roomId: room.id,
      playerCount: room.players.size,
      spectatorCount: room.spectators.size,
      gameMode: room.gameMode
    })
    
    // Emit event
    this.emit('onRoomStateChange', room.state)
    
    return room
  }
  
  /**
   * Helper: Find suitable rooms for quick play
   */
  findSuitableRooms(preferences) {
    const rooms = Array.from(this.rooms.values())
    
    return rooms
      .filter(room => {
        // Basic filters
        if (room.type !== this.roomTypes.PUBLIC) return false
        if (room.state !== this.roomStates.WAITING) return false
        if (room.players.size >= room.maxPlayers) return false
        if (room.password) return false
        
        // Preference filters
        if (preferences.gameMode && room.gameMode !== preferences.gameMode) return false
        if (preferences.maxPlayers && room.maxPlayers > preferences.maxPlayers) return false
        if (preferences.region && room.region !== preferences.region) return false
        
        return true
      })
      .sort((a, b) => {
        // Sort by player count (prefer rooms with more players)
        return b.players.size - a.players.size
      })
  }
  
  /**
   * Helper: Find match for matchmaking
   */
  findMatch(request) {
    // Look for other players in queue with similar rating
    const candidates = this.matchmakingQueue.filter(other => {
      if (other.playerId === request.playerId) return false
      if (other.gameMode !== request.gameMode) return false
      if (Math.abs(other.rating - request.rating) > request.skillRange) return false
      return true
    })
    
    // Need enough players for a match
    const requiredPlayers = 2 // Minimum for a match
    if (candidates.length >= requiredPlayers - 1) {
      // Create a new room for the match
      const room = this.createRoom({
        name: 'Ranked Match',
        type: this.roomTypes.RANKED,
        gameMode: request.gameMode,
        maxPlayers: requiredPlayers,
        autoStart: true
      })
      
      // Add all matched players
      const matchedPlayers = [request, ...candidates.slice(0, requiredPlayers - 1)]
      for (const player of matchedPlayers) {
        this.joinRoom(room.id, {
          playerId: player.playerId,
          playerName: player.playerName,
          rating: player.rating
        })
      }
      
      // Track analytics
      this.analytics.trackEvent('matchmaking_complete', {
        roomId: room.id,
        players: matchedPlayers.map(p => p.playerId),
        avgRating: matchedPlayers.reduce((sum, p) => sum + p.rating, 0) / matchedPlayers.length,
        waitTime: Date.now() - request.startTime
      })
      
      this.emit('onMatchmakingComplete', room)
      
      return room
    }
    
    return null
  }
  
  /**
   * Helper: Remove from matchmaking queue
   */
  removeFromMatchmaking(playerId) {
    const index = this.matchmakingQueue.findIndex(r => r.playerId === playerId)
    if (index !== -1) {
      this.matchmakingQueue.splice(index, 1)
    }
  }
  
  /**
   * Helper: Migrate host to another player
   */
  migrateHost(roomId) {
    const room = this.rooms.get(roomId)
    if (!room || room.players.size === 0) return
    
    // Select oldest player as new host
    const players = Array.from(room.players.values())
    const newHost = players.sort((a, b) => a.joinedAt - b.joinedAt)[0]
    
    room.hostId = newHost.id
    newHost.role = this.playerRoles.HOST
    
    // Update local host status
    if (this.localPlayer?.id === newHost.id) {
      this.isHost = true
    }
    
    // Track analytics
    this.analytics.trackEvent('host_migrated', {
      roomId,
      newHostId: newHost.id
    })
    
    this.emit('onHostMigration', newHost)
  }
  
  /**
   * Helper: Delete room
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    
    // Clean up chat history
    this.chatHistory.delete(roomId)
    
    // Remove from storage
    this.rooms.delete(roomId)
    
    // Remove from persistence
    if (this.config.enablePersistence) {
      this.removePersistedRoom(roomId)
    }
    
    // Track analytics
    this.analytics.trackEvent('room_deleted', {
      roomId,
      lifetime: Date.now() - room.createdAt
    })
    
    this.emit('onRoomDeleted', roomId)
  }
  
  /**
   * Helper: Check and start game automatically
   */
  checkAndStartGame(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return
    
    // Check if all players are ready
    const allReady = Array.from(room.players.values()).every(p => p.isReady)
    
    if (allReady && room.players.size >= room.minPlayers) {
      // Auto-start after a short delay
      setTimeout(() => {
        if (room.state === this.roomStates.WAITING) {
          this.startGame(roomId)
        }
      }, 3000)
    }
  }
  
  /**
   * Helper: Assign player to team
   */
  assignToTeam(roomId, playerId, teamName) {
    const room = this.rooms.get(roomId)
    if (!room || !room.teams) return
    
    const player = room.players.get(playerId)
    if (!player) return
    
    // Remove from current team
    for (const [name, team] of room.teams) {
      team.delete(playerId)
    }
    
    // Add to new team
    if (!room.teams.has(teamName)) {
      room.teams.set(teamName, new Set())
    }
    room.teams.get(teamName).add(playerId)
    player.team = teamName
  }
  
  /**
   * Helper: Sanitize chat message
   */
  sanitizeMessage(message) {
    // Remove HTML tags
    message = message.replace(/<[^>]*>/g, '')
    
    // Limit length
    if (message.length > 500) {
      message = message.substring(0, 500) + '...'
    }
    
    return message.trim()
  }
  
  /**
   * Helper: Detect language (simplified)
   */
  detectLanguage(message) {
    // Simple language detection based on character sets
    if (/[\u4e00-\u9fa5]/.test(message)) return 'zh'
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(message)) return 'ja'
    if (/[\uac00-\ud7af]/.test(message)) return 'ko'
    if (/[\u0600-\u06ff]/.test(message)) return 'ar'
    if (/[\u0400-\u04ff]/.test(message)) return 'ru'
    return 'en'
  }
  
  /**
   * Persistence helpers
   */
  loadPersistedRooms() {
    try {
      const stored = localStorage.getItem(`rooms_${this.appId}`)
      if (stored) {
        const data = JSON.parse(stored)
        for (const room of data.rooms) {
          // Convert plain objects back to Maps
          room.players = new Map(room.players || [])
          room.spectators = new Map(room.spectators || [])
          if (room.teams) {
            room.teams = new Map(room.teams || [])
          }
          this.rooms.set(room.id, room)
        }
      }
    } catch (error) {
      console.error('Failed to load persisted rooms:', error)
    }
  }
  
  persistRoom(room) {
    try {
      const data = {
        rooms: Array.from(this.rooms.values()).map(r => ({
          ...r,
          players: Array.from(r.players.entries()),
          spectators: Array.from(r.spectators.entries()),
          teams: r.teams ? Array.from(r.teams.entries()) : null
        }))
      }
      localStorage.setItem(`rooms_${this.appId}`, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to persist room:', error)
    }
  }
  
  removePersistedRoom(roomId) {
    this.persistRoom(null) // Re-persist all rooms
  }
  
  /**
   * Cleanup old/stale rooms
   */
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now()
      for (const [roomId, room] of this.rooms) {
        // Remove empty rooms older than timeout
        if (room.players.size === 0 && room.spectators.size === 0) {
          if (now - room.createdAt > this.config.roomTimeout) {
            this.deleteRoom(roomId)
          }
        }
        
        // Remove completed games after 5 minutes
        if (room.state === this.roomStates.COMPLETED) {
          if (now - room.completedAt > 300000) {
            this.deleteRoom(roomId)
          }
        }
      }
    }, this.config.cleanupInterval)
  }
  
  /**
   * Analytics helpers
   */
  startAnalytics() {
    setInterval(() => {
      const summary = this.getAnalyticsSummary()
      this.analytics.trackEvent('analytics_snapshot', summary)
    }, this.config.analyticsInterval)
  }
  
  getAnalyticsSummary() {
    const rooms = Array.from(this.rooms.values())
    return {
      totalRooms: rooms.length,
      activeRooms: rooms.filter(r => r.state === this.roomStates.IN_PROGRESS).length,
      waitingRooms: rooms.filter(r => r.state === this.roomStates.WAITING).length,
      totalPlayers: this.players.size,
      totalSpectators: this.spectators.size,
      matchmakingQueue: this.matchmakingQueue.length,
      roomTypes: this.getRoomTypeDistribution(),
      gameModes: this.getGameModeDistribution()
    }
  }
  
  getRoomTypeDistribution() {
    const distribution = {}
    for (const room of this.rooms.values()) {
      distribution[room.type] = (distribution[room.type] || 0) + 1
    }
    return distribution
  }
  
  getGameModeDistribution() {
    const distribution = {}
    for (const room of this.rooms.values()) {
      distribution[room.gameMode] = (distribution[room.gameMode] || 0) + 1
    }
    return distribution
  }
  
  /**
   * ID Generation helpers
   */
  generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
  
  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Event system
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }
  
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      }
    }
  }
  
  /**
   * Public API
   */
  getRoomList() {
    return Array.from(this.rooms.values())
  }
  
  getRoom(roomId) {
    return this.rooms.get(roomId)
  }
  
  getPlayer(playerId) {
    return this.players.get(playerId)
  }
  
  getChatHistory(roomId) {
    return this.chatHistory.get(roomId) || []
  }
  
  getMatchmakingQueue() {
    return [...this.matchmakingQueue]
  }
  
  getAnalytics() {
    return this.analytics
  }
}

export default EnhancedRoomManager