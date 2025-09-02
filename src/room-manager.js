/**
 * Room Manager - Lightweight hosting system for P2P rooms
 * Handles room creation, listing, joining, and authority management
 */

import { joinRoom as joinNostrRoom, selfId } from './nostr.js'
import { toJson, fromJson, genId } from './utils.js'

const ROOM_ANNOUNCE_INTERVAL = 5000 // 5 seconds
const ROOM_CLEANUP_INTERVAL = 10000 // 10 seconds
const ROOM_TIMEOUT = 15000 // 15 seconds - room considered dead if no update

class RoomManager {
  constructor(appId, config = {}) {
    this.appId = appId
    this.config = config
    this.rooms = new Map() // roomId -> room info
    this.currentRoom = null
    this.isHost = false
    this.listeners = {
      onRoomListUpdate: () => {},
      onPlayerJoin: () => {},
      onPlayerLeave: () => {},
      onGameStateUpdate: () => {},
      onHostMigration: () => {}
    }
    this.lobbyRoom = null
    this.gameRoom = null
    this.announceInterval = null
    this.cleanupInterval = null
    
    // Start lobby connection for room discovery
    this._connectToLobby()
  }
  
  /**
   * Connect to the lobby for room discovery
   */
  _connectToLobby() {
    // Use a special lobby room ID for room announcements
    const lobbyRoomId = `${this.appId}_lobby`
    
    this.lobbyRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      lobbyRoomId
    )
    
    // Set up lobby message handlers
    const [sendRoomAnnounce, onRoomAnnounce] = this.lobbyRoom.makeAction('room_announce')
    const [sendRoomClose, onRoomClose] = this.lobbyRoom.makeAction('room_close')
    
    this.lobbyActions = { sendRoomAnnounce, sendRoomClose }
    
    // Handle room announcements
    onRoomAnnounce((roomData, peerId) => {
      const room = typeof roomData === 'string' ? fromJson(roomData) : roomData
      room.lastSeen = Date.now()
      room.hostId = peerId
      
      this.rooms.set(room.id, room)
      this._notifyRoomListUpdate()
    })
    
    // Handle room closures
    onRoomClose((roomId, peerId) => {
      const room = this.rooms.get(roomId)
      if (room && room.hostId === peerId) {
        this.rooms.delete(roomId)
        this._notifyRoomListUpdate()
      }
    })
    
    // Start cleanup interval to remove stale rooms
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let changed = false
      
      for (const [roomId, room] of this.rooms.entries()) {
        if (now - room.lastSeen > ROOM_TIMEOUT) {
          this.rooms.delete(roomId)
          changed = true
        }
      }
      
      if (changed) {
        this._notifyRoomListUpdate()
      }
    }, ROOM_CLEANUP_INTERVAL)
  }
  
  /**
   * Create a new room and become the host
   */
  async createRoom(roomName, maxPlayers = 8, gameSettings = {}) {
    if (this.currentRoom) {
      await this.leaveRoom()
    }
    
    const roomId = genId(16)
    const roomInfo = {
      id: roomId,
      name: roomName,
      hostId: selfId,
      players: [selfId],
      maxPlayers,
      gameSettings,
      createdAt: Date.now()
    }
    
    this.currentRoom = roomInfo
    this.isHost = true
    
    // Connect to the game room
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      roomId
    )
    
    // Set up game room actions
    this._setupGameRoom()
    
    // Start announcing the room
    this._startRoomAnnouncement()
    
    return roomInfo
  }
  
  /**
   * Join an existing room
   */
  async joinRoom(roomId) {
    if (this.currentRoom) {
      await this.leaveRoom()
    }
    
    const roomInfo = this.rooms.get(roomId)
    if (!roomInfo) {
      throw new Error('Room not found')
    }
    
    if (roomInfo.players.length >= roomInfo.maxPlayers) {
      throw new Error('Room is full')
    }
    
    this.currentRoom = roomInfo
    this.isHost = false
    
    // Connect to the game room
    this.gameRoom = joinNostrRoom(
      { ...this.config, appId: this.appId },
      roomId
    )
    
    // Set up game room actions
    this._setupGameRoom()
    
    // Announce join to host
    const [sendJoinRequest] = this.gameActions.sendJoinRequest
    sendJoinRequest({ playerId: selfId })
    
    return roomInfo
  }
  
  /**
   * Leave the current room
   */
  async leaveRoom() {
    if (!this.currentRoom) {return}
    
    if (this.isHost) {
      // Announce room closure
      this.lobbyActions.sendRoomClose(this.currentRoom.id)
      
      // Stop room announcements
      if (this.announceInterval) {
        clearInterval(this.announceInterval)
        this.announceInterval = null
      }
    } else if (this.gameActions) {
      // Notify host of leaving
      const [sendLeaveNotify] = this.gameActions.sendLeaveNotify
      sendLeaveNotify({ playerId: selfId })
    }
    
    // Leave the game room
    if (this.gameRoom) {
      await this.gameRoom.leave()
      this.gameRoom = null
    }
    
    this.currentRoom = null
    this.isHost = false
    this.gameActions = null
  }
  
  /**
   * Set up game room message handlers
   */
  _setupGameRoom() {
    if (!this.gameRoom) {return}
    
    // Define game actions
    const actions = {
      sendJoinRequest: this.gameRoom.makeAction('join_request'),
      sendJoinResponse: this.gameRoom.makeAction('join_response'),
      sendLeaveNotify: this.gameRoom.makeAction('leave_notify'),
      sendGameState: this.gameRoom.makeAction('game_state'),
      sendPlayerAction: this.gameRoom.makeAction('player_action'),
      sendHostMigration: this.gameRoom.makeAction('host_migration')
    }
    
    this.gameActions = actions
    
    // Host-specific handlers
    if (this.isHost) {
      // Handle join requests
      actions.sendJoinRequest[1]((data, peerId) => {
        if (this.currentRoom.players.length < this.currentRoom.maxPlayers) {
          // Accept the player
          this.currentRoom.players.push(peerId)
          
          // Send acceptance and current game state
          actions.sendJoinResponse[0]({
            accepted: true,
            roomInfo: this.currentRoom,
            gameState: this.gameState
          }, peerId)
          
          // Notify all players of the new player
          this.listeners.onPlayerJoin(peerId)
          
          // Update room announcement
          this._announceRoom()
        } else {
          // Reject - room is full
          actions.sendJoinResponse[0]({
            accepted: false,
            reason: 'Room is full'
          }, peerId)
        }
      })
      
      // Handle player leaving
      actions.sendLeaveNotify[1]((data, peerId) => {
        const index = this.currentRoom.players.indexOf(peerId)
        if (index > -1) {
          this.currentRoom.players.splice(index, 1)
          this.listeners.onPlayerLeave(peerId)
          
          // Update room announcement
          this._announceRoom()
        }
      })
      
      // Handle player actions (forward to game logic)
      actions.sendPlayerAction[1]((action, peerId) => {
        if (this.onPlayerAction) {
          this.onPlayerAction(action, peerId)
        }
      })
    } else {
      // Client-specific handlers
      
      // Handle join response
      actions.sendJoinResponse[1]((response) => {
        if (response.accepted) {
          this.currentRoom = response.roomInfo
          if (response.gameState) {
            this.listeners.onGameStateUpdate(response.gameState)
          }
        } else {
          console.error('Failed to join room:', response.reason)
          this.leaveRoom()
        }
      })
      
      // Handle game state updates
      actions.sendGameState[1]((gameState, peerId) => {
        if (peerId === this.currentRoom.hostId) {
          this.listeners.onGameStateUpdate(gameState)
        }
      })
      
      // Handle host migration
      actions.sendHostMigration[1]((data, peerId) => {
        if (peerId === this.currentRoom.hostId) {
          this.currentRoom.hostId = data.newHostId
          if (data.newHostId === selfId) {
            this.isHost = true
            this._setupGameRoom() // Re-setup as host
            this._startRoomAnnouncement()
          }
          this.listeners.onHostMigration(data.newHostId)
        }
      })
    }
    
    // Common handlers for all players
    this.gameRoom.onPeerJoin((peerId) => {
      if (!this.isHost) {
        this.listeners.onPlayerJoin(peerId)
      }
    })
    
    this.gameRoom.onPeerLeave((peerId) => {
      if (this.isHost) {
        // Remove from players list
        const index = this.currentRoom.players.indexOf(peerId)
        if (index > -1) {
          this.currentRoom.players.splice(index, 1)
          this._announceRoom()
        }
      }
      
      // Check if host left
      if (peerId === this.currentRoom.hostId && !this.isHost) {
        // Initiate host migration
        this._handleHostMigration()
      }
      
      this.listeners.onPlayerLeave(peerId)
    })
  }
  
  /**
   * Handle host migration when the current host leaves
   */
  _handleHostMigration() {
    // Simple strategy: oldest player becomes new host
    const sortedPlayers = [...this.currentRoom.players].sort()
    const newHostId = sortedPlayers[0]
    
    if (newHostId === selfId) {
      // We become the new host
      this.isHost = true
      this.currentRoom.hostId = selfId
      
      // Announce to other players
      if (this.gameActions) {
        this.gameActions.sendHostMigration[0]({ newHostId: selfId })
      }
      
      // Start room announcements
      this._startRoomAnnouncement()
      
      // Re-setup as host
      this._setupGameRoom()
    }
    
    this.listeners.onHostMigration(newHostId)
  }
  
  /**
   * Start announcing the room to the lobby
   */
  _startRoomAnnouncement() {
    if (this.announceInterval) {
      clearInterval(this.announceInterval)
    }
    
    // Announce immediately
    this._announceRoom()
    
    // Set up periodic announcements
    this.announceInterval = setInterval(() => {
      this._announceRoom()
    }, ROOM_ANNOUNCE_INTERVAL)
  }
  
  /**
   * Announce room to the lobby
   */
  _announceRoom() {
    if (!this.isHost || !this.currentRoom || !this.lobbyActions) {return}
    
    const roomData = {
      id: this.currentRoom.id,
      name: this.currentRoom.name,
      playerCount: this.currentRoom.players.length,
      maxPlayers: this.currentRoom.maxPlayers,
      gameSettings: this.currentRoom.gameSettings
    }
    
    this.lobbyActions.sendRoomAnnounce(toJson(roomData))
  }
  
  /**
   * Send game state to all players (host only)
   */
  sendGameState(gameState) {
    if (!this.isHost || !this.gameActions) {return}
    
    this.gameState = gameState
    this.gameActions.sendGameState[0](gameState)
  }
  
  /**
   * Send player action to host (client only)
   */
  sendPlayerAction(action) {
    if (this.isHost || !this.gameActions) {return}
    
    this.gameActions.sendPlayerAction[0](action)
  }
  
  /**
   * Get list of available rooms
   */
  getRoomList() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.playerCount || room.players?.length || 0,
      maxPlayers: room.maxPlayers,
      gameSettings: room.gameSettings,
      hostId: room.hostId
    }))
  }
  
  /**
   * Set event listeners
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = callback
    }
  }
  
  /**
   * Notify room list update
   */
  _notifyRoomListUpdate() {
    this.listeners.onRoomListUpdate(this.getRoomList())
  }
  
  /**
   * Clean up resources
   */
  async destroy() {
    await this.leaveRoom()
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    if (this.lobbyRoom) {
      await this.lobbyRoom.leave()
      this.lobbyRoom = null
    }
  }
}

export default RoomManager