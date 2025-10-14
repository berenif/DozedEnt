// GameLoopCoordinator.js
// Coordinates the main game loop components

import { InputMapper } from '../input/InputMapper.js'
import { WasmStateBridge } from '../state/WasmStateBridge.js'
import { GameRenderer } from '../renderer/GameRenderer.js'
import { EnemyRenderer } from '../renderer/EnemyRenderer.js'
import { UIManager } from '../ui/UIManager.js'
import { ArenaSpawner } from '../spawn/ArenaSpawner.js'
import { BerserkerChargeController } from '../abilities/BerserkerChargeController.js'

export class GameLoopCoordinator {
  constructor(canvas, options, wasmApi) {
    this.canvas = canvas
    this.wasmApi = wasmApi
    this.options = options

    // Initialize components
    this.stateBridge = new WasmStateBridge(wasmApi)
    this.gameRenderer = new GameRenderer(canvas)
    this.enemyRenderer = new EnemyRenderer(canvas)
    this.uiManager = new UIManager(options, wasmApi)
    
    // Initialize input
    this.inputMapper = new InputMapper()
    this.inputMapper.attach()

    // Initialize game systems
    this.arenaSpawner = new ArenaSpawner(wasmApi)
    this.chargeController = new BerserkerChargeController({ wasmApi, input: this.inputMapper })

    // Setup character type
    this.setupCharacterType()

    // Initialize arena
    this.arenaSpawner.spawnInitial()

    // Loop state
    this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.isRunning = false
  }

  setupCharacterType() {
    try {
      const ex = this.wasmApi.exports || {}
      if (typeof ex.set_character_type === 'function') { 
        ex.set_character_type(1) // Raider class
      }
    } catch (_e) {
      // Silently handle WASM errors
    }
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.frame()
  }

  stop() {
    this.isRunning = false
  }

  frame() {
    if (!this.isRunning) return

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const deltaTime = Math.min(0.05, Math.max(0, (now - this.lastFrameTime) / 1000))
    this.lastFrameTime = now

    // Process input
    this.processInput()

    // Update ability controller
    this.chargeController.update(deltaTime)

    // Update WASM simulation
    this.wasmApi.update(deltaTime)

    // Read state
    const playerState = this.stateBridge.readPlayer()
    const uiState = this.stateBridge.readUI()

    // Render frame
    this.render(playerState)

    // Update UI
    this.uiManager.update(playerState, uiState)

    // Update arena
    this.arenaSpawner.update(deltaTime)

    // Continue loop
    requestAnimationFrame(() => this.frame())
  }

  processInput() {
    const axisX = this.inputMapper.axisX()
    const axisY = this.inputMapper.axisY()
    const flags = this.inputMapper.flags()

    this.wasmApi.setPlayerInput(
      axisX, 
      axisY, 
      flags.roll, 
      flags.jump, 
      flags.light, 
      flags.heavy, 
      flags.block, 
      flags.special
    )
  }

  render(playerState) {
    // Clear canvas
    this.gameRenderer.clear()

    // Render player
    this.gameRenderer.renderPlayer(playerState)

    // Render enemies
    this.enemyRenderer.renderEnemies(this.wasmApi)
  }

  reset() {
    try { 
      this.wasmApi.resetRun(BigInt(Date.now())) 
    } catch { 
      this.wasmApi.resetRun(Date.now()) 
    }
    this.arenaSpawner.reset()
    this.uiManager.reset()
  }
}
