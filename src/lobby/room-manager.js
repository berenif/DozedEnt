/**
 * Room Manager - Handles multiplayer room creation, joining, and management
 * Separated from main site.js for better organization
 */

import { idGenerator } from '../utils/deterministic-id-generator.js'

const PLAYER_ID_STORAGE_KEY = 'dozedent.lobby.playerId'
const PLAYER_NAME_STORAGE_KEY = 'dozedent.lobby.playerName'
const MAX_PLAYER_NAME_LENGTH = 24

export class RoomManager {
  constructor() {
    this.currentRoom = null;
    this.rooms = new Map();
    this.eventListeners = new Map();
    this.localPlayer = this.loadStoredPlayerIdentity();
  }

  /**
   * Create a new room
   * @param {Object} options - Room creation options
   * @returns {Promise<Object>} Created room object
   */
  createRoom(options = {}) {
    const {
      playerName,
      playerId,
      ...roomOptions
    } = options;

    const roomConfig = {
      name: roomOptions.name ?? 'New Room',
      type: roomOptions.type ?? 'public',
      gameMode: roomOptions.gameMode ?? 'default',
      maxPlayers: roomOptions.maxPlayers ?? 4,
      allowSpectators:
        roomOptions.allowSpectators !== undefined
          ? roomOptions.allowSpectators
          : true,
      ...roomOptions
    };

    try {
      // Generate unique room ID
      const roomId = this.generateRoomId();
      
      const room = {
        id: roomId,
        code: this.generateRoomCode(),
        ...roomConfig,
        players: [],
        spectators: [],
        status: 'waiting',
        createdAt: Date.now()
      };

      this.rooms.set(roomId, room);
      this.currentRoom = room;

      this.ensurePlayerIdentity({ playerName, playerId });

      this.emit('roomCreated', room);
      console.log('Room created:', room);
      
      return room;
    } catch (error) {
      console.error('Failed to create room:', error);
      // Provide more user-friendly error messages
      if (error.message.includes('network') || error.message.includes('connection')) {
        throw new Error('Network error: Unable to create room. Please check your internet connection.');
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        throw new Error('Permission denied: Unable to create room. Please try again.');
      } else {
        throw new Error(`Unable to create room: ${error.message}`);
      }
    }
  }

  /**
   * Join an existing room
   * @param {string} roomId - Room ID to join
   * @returns {Promise<Object>} Room object
   */
  joinRoom(roomId, options = {}) {
    try {
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error('Room not found. The room may have been deleted or the ID is incorrect.');
      }

      const identity = this.ensurePlayerIdentity({
        playerName: options.playerName,
        playerId: options.playerId
      });

      let player = room.players.find(existing => existing.id === identity.id);

      if (!player && room.players.length >= room.maxPlayers) {
        throw new Error('Room is full. Please try joining a different room.');
      }

      if (!player) {
        player = {
          id: identity.id,
          name: identity.name,
          isReady: false,
          joinedAt: Date.now(),
          metadata: options.metadata ?? null
        };
        room.players.push(player);
      } else {
        player.name = identity.name;
        if (options.metadata !== undefined) {
          player.metadata = options.metadata;
        }
        player.lastJoinedAt = Date.now();
      }
      this.currentRoom = room;

      this.emit('roomJoined', room);
      console.log('Joined room:', room);
      
      return room;
    } catch (error) {
      console.error('Failed to join room:', error);
      // Provide more user-friendly error messages
      if (error.message.includes('Room not found')) {
        throw error; // Already user-friendly
      } else if (error.message.includes('Room is full')) {
        throw error; // Already user-friendly
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        throw new Error('Network error: Unable to join room. Please check your internet connection.');
      } else {
        throw new Error(`Unable to join room: ${error.message}`);
      }
    }
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (!this.currentRoom) {return;}

    const roomId = this.currentRoom.id;
    const room = this.rooms.get(roomId);
    
    if (room) {
      // Remove current player from room
      room.players = room.players.filter(player => player.id !== this.getCurrentPlayerId());
      
      // If room is empty, remove it
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.currentRoom = null;
    this.emit('roomLeft', roomId);
  }

  /**
   * Quick play - join or create room automatically
   * @param {Object} options - Quick play options
   * @returns {Promise<Object>} Room object
   */
  async quickPlay(options = {}) {
    try {
      // Look for available rooms first
      const availableRooms = this.getRoomList({ hasSpace: true });
      
      if (availableRooms.length > 0) {
        // Join first available room
        return await this.joinRoom(availableRooms[0].id, options);
      }
      // Create and join a new room when none are available
      const room = await this.createRoom({
        name: 'Quick Play Room',
        gameMode: options.gameMode ?? 'default',
        maxPlayers: options.maxPlayers ?? 4,
        type: options.type,
        allowSpectators: options.allowSpectators,
        playerName: options.playerName,
        playerId: options.playerId
      });

      await this.joinRoom(room.id, options);
      return room;

    } catch (error) {
      console.error('Quick play failed:', error);
      throw new Error(`Quick play failed: ${error.message}`);
    }
  }

  /**
   * Get list of available rooms
   * @param {Object} filters - Filter options
   * @returns {Array} Array of room objects
   */
  getRoomList(filters = {}) {
    const rooms = Array.from(this.rooms.values());
    
    return rooms.filter(room => {
      if (filters.hasSpace && room.players.length >= room.maxPlayers) {
        return false;
      }
      
      if (filters.gameMode && room.gameMode !== filters.gameMode) {
        return false;
      }
      
      if (filters.type && room.type !== filters.type) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Send chat message to current room
   * @param {string} message - Message to send
   */
  sendChatMessage(message) {
    if (!this.currentRoom || !message.trim()) {return;}

    const chatMessage = {
      id: this.generateMessageId(),
      playerId: this.getCurrentPlayerId(),
      playerName: this.getPlayerName(),
      message: message.trim(),
      timestamp: Date.now()
    };

    this.emit('chatMessage', chatMessage);
  }

  /**
   * Toggle player ready status
   * @returns {boolean} New ready status
   */
  toggleReady() {
    if (!this.currentRoom) {return false;}

    const player = this.getCurrentPlayer();
    if (player) {
      player.isReady = !player.isReady;
      this.emit('playerReadyChanged', { player, room: this.currentRoom });
      return player.isReady;
    }
    
    return false;
  }

  /**
   * Start room game
   * @returns {boolean} Success status
   */
  startRoomGame() {
    if (!this.currentRoom) {return false;}

    const allPlayersReady = this.currentRoom.players.every(player => player.isReady);
    if (!allPlayersReady) {
      console.warn('Cannot start game: not all players are ready');
      return false;
    }

    // Derive a deterministic seed to start the game and broadcast to clients
    const params = new URLSearchParams(location.search);
    const urlSeed = params.get('seed');
    const startSeed = urlSeed && /^\d+$/.test(urlSeed) ? BigInt(urlSeed) : 1n;

    this.currentRoom.status = 'playing';
    this.currentRoom.startSeed = startSeed.toString();
    this.emit('gameStarted', { ...this.currentRoom });
    console.log('Game starting!');
    
    return true;
  }

  /**
   * Get current player from current room
   * @returns {Object|null} Current player object
   */
  getCurrentPlayer() {
    if (!this.currentRoom) {return null;}
    
    const playerId = this.getCurrentPlayerId();
    return this.currentRoom.players.find(player => player.id === playerId);
  }

  /**
   * Get current player ID (placeholder implementation)
   * @returns {string} Player ID
   */
  getCurrentPlayerId() {
    return this.ensurePlayerIdentity().id;
  }

  /**
   * Get player name from local identity state
   * @returns {string} Player name
   */
  getPlayerName() {
    return this.ensurePlayerIdentity().name;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Load stored player identity from persistent storage
   * @returns {{id: string|null, name: string|null}}
   */
  loadStoredPlayerIdentity() {
    if (typeof localStorage === 'undefined') {
      return { id: null, name: null };
    }

    try {
      return {
        id: localStorage.getItem(PLAYER_ID_STORAGE_KEY),
        name: localStorage.getItem(PLAYER_NAME_STORAGE_KEY)
      };
    } catch (error) {
      console.warn('Unable to access player identity storage:', error);
      return { id: null, name: null };
    }
  }

  /**
   * Persist player identity details if storage is available
   * @param {{id: string, name: string}} identity - Identity to persist
   */
  persistPlayerIdentity(identity) {
    if (typeof localStorage === 'undefined') {return;}

    try {
      if (identity.id) {
        localStorage.setItem(PLAYER_ID_STORAGE_KEY, identity.id);
      }
      if (identity.name) {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, identity.name);
      }
    } catch (error) {
      console.warn('Unable to persist player identity:', error);
    }
  }

  /**
   * Normalize player names and clamp to maximum length
   * @param {string} name - Requested player name
   * @returns {string} Normalized name or empty string when invalid
   */
  normalizePlayerName(name) {
    if (name === null || name === undefined) {return '';}

    const normalized = String(name).trim().replace(/\s+/g, ' ');
    if (!normalized) {return '';}

    return normalized.slice(0, MAX_PLAYER_NAME_LENGTH);
  }

  /**
   * Generate a friendly fallback player name based on the current ID
   * @param {string} id - Player identifier
   * @returns {string} Generated player name
   */
  generateDefaultPlayerName(id) {
    const cleanedId = (id || '').replace(/[^a-zA-Z0-9]/g, '');
    const suffix = cleanedId.slice(-4).toUpperCase();

    if (suffix) {
      return `Player ${suffix}`;
    }

    const fallback = idGenerator.randomString(4, false).toUpperCase();
    return `Player ${fallback}`;
  }

  /**
   * Ensure the local player identity is populated and up to date
   * @param {{playerName?: string, playerId?: string}} overrides - Overrides for identity
   * @returns {{id: string, name: string}} Player identity
   */
  ensurePlayerIdentity(overrides = {}) {
    const stored = this.localPlayer ?? this.loadStoredPlayerIdentity();
    const identity = {
      id: stored?.id ?? null,
      name: stored?.name ?? null
    };

    if (typeof overrides.playerId === 'string') {
      const trimmedId = overrides.playerId.trim();
      if (trimmedId) {
        identity.id = trimmedId;
      }
    }

    const normalizedName = this.normalizePlayerName(overrides.playerName);
    if (normalizedName) {
      identity.name = normalizedName;
    }

    if (!identity.id) {
      identity.id = this.generatePlayerId();
    }

    if (!identity.name) {
      identity.name = this.generateDefaultPlayerName(identity.id);
    }

    this.localPlayer = identity;
    this.persistPlayerIdentity(identity);

    return identity;
  }

  /**
   * Generate unique room ID
   * @returns {string} Room ID
   */
  generateRoomId() {
    return idGenerator.generateRoomId();
  }

  /**
   * Generate room code for easy sharing
   * @returns {string} Room code
   */
  generateRoomCode() {
    return idGenerator.generateRoomCode();
  }

  /**
   * Generate unique player ID
   * @returns {string} Player ID
   */
  generatePlayerId() {
    return idGenerator.generatePlayerId();
  }

  /**
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return idGenerator.generateMessageId();
  }
}
