/**
 * Room Manager - Handles multiplayer room creation, joining, and management
 * Separated from main site.js for better organization
 */

import { idGenerator } from '../utils/deterministic-id-generator.js'

export class RoomManager {
  constructor() {
    this.currentRoom = null;
    this.rooms = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Create a new room
   * @param {Object} options - Room creation options
   * @returns {Promise<Object>} Created room object
   */
  createRoom(options = {}) {
    const roomConfig = {
      name: options.name || 'New Room',
      type: options.type || 'public',
      gameMode: options.gameMode || 'default',
      maxPlayers: options.maxPlayers || 4,
      allowSpectators: options.allowSpectators !== false,
      ...options
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
  joinRoom(roomId) {
    try {
      const room = this.rooms.get(roomId);
      
      if (!room) {
        throw new Error('Room not found. The room may have been deleted or the ID is incorrect.');
      }

      if (room.players.length >= room.maxPlayers) {
        throw new Error('Room is full. Please try joining a different room.');
      }

      // Add current player to room
      const player = {
        id: this.generatePlayerId(),
        name: this.getPlayerName(),
        isReady: false,
        joinedAt: Date.now()
      };

      room.players.push(player);
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
        return await this.joinRoom(availableRooms[0].id);
      } 
        // Create new room
        return await this.createRoom({
          name: 'Quick Play Room',
          gameMode: options.gameMode || 'default',
          maxPlayers: options.maxPlayers || 4
        });
      
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
    // This should be replaced with actual player ID from authentication
    return 'current-player';
  }

  /**
   * Get player name (placeholder implementation)
   * @returns {string} Player name
   */
  getPlayerName() {
    // This should be replaced with actual player name from authentication
    return 'Player';
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
