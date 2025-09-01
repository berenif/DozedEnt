/**
 * Host Authority System - Manages authoritative game state with WASM integration
 * The host runs the game logic in WASM and broadcasts state to all players
 */

import { loadWasm, createStringCodec } from './wasm.js'
import { toJson, fromJson } from './utils.js'

class HostAuthority {
  constructor(roomManager) {
    this.roomManager = roomManager
    this.wasmGame = null
    this.gameState = null
    this.updateInterval = null
    this.lastUpdateTime = Date.now()
    this.playerInputs = new Map() // playerId -> input queue
    this.config = {
      updateRate: 60, // 60 FPS
      stateSnapshotRate: 10, // Send full state 10 times per second
      inputBufferSize: 10
    }
    
    // Set up room manager callbacks
    this.roomManager.onPlayerAction = this.handlePlayerAction.bind(this)
  }
  
  /**
   * Initialize the WASM game module
   */
  async initializeGame(wasmSource, gameConfig = {}) {
    try {
      // Load WASM module
      const runtime = await loadWasm(wasmSource, {
        env: {
          // Custom imports for the game
          js_log: (ptr, len) => {
            const { fromWasm } = createStringCodec(runtime)
            console.log('[WASM]:', fromWasm(ptr, len))
          },
          js_get_timestamp: () => Date.now(),
          js_random: () => Math.random(),
          // Network callbacks
          js_broadcast_state: (ptr, len) => {
            const { fromWasm } = createStringCodec(runtime)
            const stateJson = fromWasm(ptr, len)
            this.broadcastGameState(fromJson(stateJson))
          }
        }
      })
      
      this.wasmGame = runtime
      this.codec = createStringCodec(runtime)
      
      // Initialize game with config
      if (runtime.exports.game_init) {
        const configStr = toJson(gameConfig)
        const { ptr, len } = this.codec.toWasm(configStr)
        runtime.exports.game_init(ptr, len)
      }
      
      // Create initial game state
      if (runtime.exports.game_create_state) {
        const maxPlayers = this.roomManager.currentRoom?.maxPlayers || 8
        this.gameStatePtr = runtime.exports.game_create_state(maxPlayers)
      }
      
      return true
    } catch (error) {
      console.error('Failed to initialize WASM game:', error)
      return false
    }
  }
  
  /**
   * Start the game loop (host only)
   */
  startGameLoop() {
    if (!this.roomManager.isHost) {
      console.warn('Only the host can start the game loop')
      return
    }
    
    if (!this.wasmGame) {
      console.error('WASM game not initialized')
      return
    }
    
    // Clear any existing interval
    this.stopGameLoop()
    
    let lastSnapshotTime = Date.now()
    
    // Main game update loop
    this.updateInterval = setInterval(() => {
      const now = Date.now()
      const deltaTime = now - this.lastUpdateTime
      this.lastUpdateTime = now
      
      // Process player inputs
      this.processPlayerInputs()
      
      // Update game state in WASM
      if (this.wasmGame.exports.game_update) {
        this.wasmGame.exports.game_update(this.gameStatePtr, deltaTime)
      }
      
      // Send state snapshots at lower frequency
      if (now - lastSnapshotTime >= 1000 / this.config.stateSnapshotRate) {
        this.sendStateSnapshot()
        lastSnapshotTime = now
      }
    }, 1000 / this.config.updateRate)
  }
  
  /**
   * Stop the game loop
   */
  stopGameLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
  
  /**
   * Handle player action/input from clients
   */
  handlePlayerAction(action, playerId) {
    if (!this.roomManager.isHost) return
    
    // Buffer player inputs
    if (!this.playerInputs.has(playerId)) {
      this.playerInputs.set(playerId, [])
    }
    
    const inputQueue = this.playerInputs.get(playerId)
    inputQueue.push({
      ...action,
      timestamp: Date.now(),
      playerId
    })
    
    // Limit buffer size
    if (inputQueue.length > this.config.inputBufferSize) {
      inputQueue.shift()
    }
  }
  
  /**
   * Process all buffered player inputs
   */
  processPlayerInputs() {
    if (!this.wasmGame?.exports.game_handle_input) return
    
    for (const [playerId, inputs] of this.playerInputs.entries()) {
      while (inputs.length > 0) {
        const input = inputs.shift()
        
        // Convert input to JSON and pass to WASM
        const inputStr = toJson(input)
        const { ptr, len } = this.codec.toWasm(inputStr)
        
        // Get player index
        const playerIndex = this.getPlayerIndex(playerId)
        if (playerIndex >= 0) {
          this.wasmGame.exports.game_handle_input(
            this.gameStatePtr,
            playerIndex,
            ptr,
            len
          )
        }
      }
    }
  }
  
  /**
   * Get player index in the room
   */
  getPlayerIndex(playerId) {
    const room = this.roomManager.currentRoom
    if (!room) return -1
    return room.players.indexOf(playerId)
  }
  
  /**
   * Send full game state snapshot to all players
   */
  sendStateSnapshot() {
    if (!this.wasmGame?.exports.game_get_state) return
    
    // Get state from WASM
    const statePtr = this.wasmGame.exports.game_get_state(this.gameStatePtr)
    const stateLen = this.wasmGame.exports.game_get_state_size(this.gameStatePtr)
    
    if (statePtr && stateLen > 0) {
      const stateJson = this.codec.fromWasm(statePtr, stateLen)
      const state = fromJson(stateJson)
      
      // Add metadata
      state.timestamp = Date.now()
      state.frameNumber = (state.frameNumber || 0) + 1
      
      this.broadcastGameState(state)
    }
  }
  
  /**
   * Broadcast game state to all players
   */
  broadcastGameState(state) {
    this.gameState = state
    this.roomManager.sendGameState(state)
  }
  
  /**
   * Handle state update from host (client side)
   */
  receiveStateUpdate(state) {
    if (this.roomManager.isHost) return
    
    this.gameState = state
    
    // If we have WASM on client for prediction/interpolation
    if (this.wasmGame?.exports.game_apply_state) {
      const stateStr = toJson(state)
      const { ptr, len } = this.codec.toWasm(stateStr)
      this.wasmGame.exports.game_apply_state(this.gameStatePtr, ptr, len)
    }
  }
  
  /**
   * Send input to host (client side)
   */
  sendInput(input) {
    if (this.roomManager.isHost) {
      // Host processes input directly
      this.handlePlayerAction(input, this.roomManager.selfId)
    } else {
      // Client sends to host
      this.roomManager.sendPlayerAction(input)
    }
  }
  
  /**
   * Get current game state
   */
  getGameState() {
    return this.gameState
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.stopGameLoop()
    
    if (this.wasmGame) {
      // Clean up WASM resources
      if (this.wasmGame.exports.game_destroy && this.gameStatePtr) {
        this.wasmGame.exports.game_destroy(this.gameStatePtr)
      }
      this.wasmGame = null
    }
    
    this.playerInputs.clear()
    this.gameState = null
  }
}

/**
 * Example WASM game interface (what the WASM module should export):
 * 
 * - game_init(config_ptr, config_len): Initialize game with JSON config
 * - game_create_state(max_players): Create and return game state pointer
 * - game_update(state_ptr, delta_time): Update game logic
 * - game_handle_input(state_ptr, player_index, input_ptr, input_len): Process player input
 * - game_get_state(state_ptr): Get current state as JSON string pointer
 * - game_get_state_size(state_ptr): Get size of state JSON string
 * - game_apply_state(state_ptr, state_json_ptr, state_json_len): Apply state snapshot (for clients)
 * - game_destroy(state_ptr): Clean up game state
 */

export default HostAuthority