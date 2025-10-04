/**
 * Multiplayer Game Controller
 * Integrates WASM game with multiplayer synchronization
 */

import { createWasmApi } from '../demo/wasm-api.js'
import { createRenderer } from '../demo/renderer.js'
import { createInputManager } from '../managers/input-migration-adapter.js'

export class MultiplayerGameController {
  constructor(coordinator) {
    this.coordinator = coordinator
    this.wasmApi = null
    this.renderer = null
    this.inputManager = null
    this.animationFrameId = null
    this.lastTime = 0
    this.running = false
  }
  
  async initialize() {
    console.log('🎮 Initializing multiplayer game controller...')
    
    try {
      // Get canvas
      const canvas = document.getElementById('demo-canvas')
      if (!canvas) {
        throw new Error('Game canvas not found')
      }
      
      // Initialize renderer
      this.renderer = createRenderer(canvas)
      console.log('✅ Renderer initialized')
      
      // Initialize WASM API
      this.wasmApi = await createWasmApi()
      console.log('✅ WASM API initialized')
      
      // Initialize game
      if (this.wasmApi.exports?.init_run) {
        const seed = BigInt(Date.now())
        this.wasmApi.exports.init_run(seed, 0)
        
        // Clear input state
        this.wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0)
        
        console.log('✅ WASM game initialized')
      }
      
      // Initialize input manager
      await new Promise(resolve => setTimeout(resolve, 50))
      this.inputManager = createInputManager(this.wasmApi, {
        useLegacyAdapter: true,
        debugMode: false
      })
      console.log('✅ Input manager initialized')
      
      // Expose for debugging
      window.mpGame = {
        wasmApi: this.wasmApi,
        renderer: this.renderer,
        inputManager: this.inputManager
      }
      
      console.log('✅ Multiplayer game controller initialized')
    } catch (error) {
      console.error('❌ Failed to initialize game controller:', error)
      throw error
    }
  }
  
  getGameIntegration() {
    return {
      wasmModule: this.wasmApi,
      
      saveState: () => {
        // Save current game state
        if (this.wasmApi.exports?.save_state) {
          return this.wasmApi.exports.save_state()
        }
        
        // Fallback: serialize essential state
        return this.serializeState()
      },
      
      loadState: (state) => {
        // Load game state
        if (this.wasmApi.exports?.load_state) {
          this.wasmApi.exports.load_state(state)
          return
        }
        
        // Fallback: deserialize state
        this.deserializeState(state)
      },
      
      advanceFrame: (inputs) => {
        // Process inputs and advance one frame
        if (inputs && inputs.length > 0) {
          // Apply inputs for all players
          inputs.forEach((input, playerIndex) => {
            if (playerIndex === 0) {
              // Local player
              this.applyInput(input)
            } else {
              // Remote players - would need multi-player WASM support
              // For now, this is single player with sync
            }
          })
        }
        
        // Update game logic
        const deltaTime = 1 / 60 // Fixed timestep
        if (this.wasmApi.exports?.update) {
          this.wasmApi.exports.update(deltaTime)
        }
      },
      
      getChecksum: () => {
        // Get state checksum for sync verification
        if (this.wasmApi.exports?.get_checksum) {
          return this.wasmApi.exports.get_checksum()
        }
        
        // Fallback: simple checksum of state
        return this.calculateChecksum()
      },
      
      pauseGame: () => {
        this.pause()
      },
      
      resumeGame: () => {
        this.resume()
      }
    }
  }
  
  async startGame() {
    if (this.running) return
    
    console.log('▶️ Starting game loop...')
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop()
  }
  
  stopGame() {
    if (!this.running) return
    
    console.log('⏹️ Stopping game loop...')
    this.running = false
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  pause() {
    this.running = false
  }
  
  resume() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop()
  }
  
  gameLoop() {
    if (!this.running) return
    
    const now = performance.now()
    const deltaTime = (now - this.lastTime) / 1000
    this.lastTime = now
    
    try {
      // Get current input state
      const input = this.inputManager?.inputState || {}
      
      // Send input through multiplayer sync
      if (this.coordinator.state.gameStarted && this.coordinator.multiplayerSync) {
        this.coordinator.multiplayerSync.sendInput({
          direction: input.direction || { x: 0, y: 0 },
          lightAttack: input.lightAttack || false,
          heavyAttack: input.heavyAttack || false,
          special: input.special || false,
          block: input.block || false,
          roll: input.roll || false,
          timestamp: now
        })
      }
      
      // Render current state
      if (this.renderer && this.wasmApi) {
        this.render()
      }
      
    } catch (error) {
      console.error('❌ Game loop error:', error)
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop())
  }
  
  render() {
    try {
      // Get player state
      const playerState = this.wasmApi.getPlayerState()
      
      // Get enemies state
      const enemyCount = this.wasmApi.exports?.get_enemy_count?.() || 0
      const enemies = []
      for (let i = 0; i < enemyCount; i++) {
        enemies.push(this.wasmApi.getEnemyState(i))
      }
      
      // Render
      this.renderer.render(playerState, enemies)
      
    } catch (error) {
      console.error('❌ Render error:', error)
    }
  }
  
  applyInput(input) {
    if (!this.wasmApi) return
    
    const dx = input.direction?.x || 0
    const dy = input.direction?.y || 0
    const lightAttack = input.lightAttack ? 1 : 0
    const heavyAttack = input.heavyAttack ? 1 : 0
    const special = input.special ? 1 : 0
    const block = input.block ? 1 : 0
    const roll = input.roll ? 1 : 0
    
    this.wasmApi.setPlayerInput(dx, dy, lightAttack, heavyAttack, special, block, roll, 0)
  }
  
  serializeState() {
    // Serialize essential game state
    const state = {
      player: this.wasmApi.getPlayerState(),
      enemies: [],
      frame: this.wasmApi.exports?.get_current_frame?.() || 0,
      timestamp: Date.now()
    }
    
    const enemyCount = this.wasmApi.exports?.get_enemy_count?.() || 0
    for (let i = 0; i < enemyCount; i++) {
      state.enemies.push(this.wasmApi.getEnemyState(i))
    }
    
    return JSON.stringify(state)
  }
  
  deserializeState(stateJson) {
    try {
      const state = JSON.parse(stateJson)
      
      // Restore player state
      if (state.player && this.wasmApi.exports?.set_player_state) {
        this.wasmApi.exports.set_player_state(
          state.player.x,
          state.player.y,
          state.player.health,
          state.player.stamina
        )
      }
      
      // Restore enemies - would need WASM support
      // For now, just log
      console.log('Loaded state with', state.enemies?.length || 0, 'enemies')
      
    } catch (error) {
      console.error('Failed to deserialize state:', error)
    }
  }
  
  calculateChecksum() {
    // Simple checksum of current state
    const state = this.serializeState()
    let hash = 0
    for (let i = 0; i < state.length; i++) {
      const char = state.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }
}