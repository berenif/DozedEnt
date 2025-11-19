// GameLoopCoordinator.js (REFACTORED)
// Orchestrates game loop components using focused coordinators
// Single responsibility: coordinate subsystems, no business logic

import { StateCoordinator } from '../coordinators/StateCoordinator.js'
import { RenderingCoordinator } from '../coordinators/RenderingCoordinator.js'
import { InputCoordinator } from '../coordinators/InputCoordinator.js'
import { SpawnCoordinator } from '../coordinators/SpawnCoordinator.js'
import { AbilityCoordinator } from '../coordinators/AbilityCoordinator.js'
import { UIManager } from '../ui/UIManager.js'
import { ReplayRecorder } from '../replay/ReplayRecorder.js'

/**
 * GameLoopCoordinator orchestrates the game loop.
 * This is a thin coordinator that delegates to focused subsystems.
 * 
 * Architecture (ADR-001, ADR-002, ADR-003 compliant):
 * - All physics from WASM (validated by StateCoordinator)
 * - All RNG from WASM (no Math.random())
 * - Single state facade (WasmCoreState via StateCoordinator)
 * - Focused coordinators (no god class)
 * 
 * Responsibilities:
 * - Orchestrate coordinators (State, Rendering, Input, Spawn, Ability)
 * - Run game loop (requestAnimationFrame)
 * - Handle start/stop/reset
 * - Optional replay recording
 */
export class GameLoopCoordinator {
  constructor(canvas, options, wasmApi) {
    if (!canvas) {
      throw new Error('Canvas is required')
    }
    if (!wasmApi) {
      throw new Error('WASM API is required')
    }

    this.canvas = canvas
    this.wasmApi = wasmApi
    this.options = options

    // Initialize coordinators
    this.stateCoordinator = new StateCoordinator(wasmApi)
    this.renderingCoordinator = new RenderingCoordinator(canvas)
    this.inputCoordinator = new InputCoordinator(wasmApi, {
      recordingEnabled: options.recordingEnabled || false
    })
    this.spawnCoordinator = new SpawnCoordinator(wasmApi)
    this.abilityCoordinator = new AbilityCoordinator(wasmApi, this.inputCoordinator)

    // UI manager (reads from state coordinator)
    this.uiManager = new UIManager(options, wasmApi)

    // Replay recorder
    this.replayRecorder = new ReplayRecorder({
      enabled: options.recordingEnabled || false
    })

    // Setup character type
    this.abilityCoordinator.setCharacterType(1) // Raider class

    // Initialize seed for deterministic gameplay
    const initialSeed = Date.now()
    this.stateCoordinator.setSeed(initialSeed)
    if (this.replayRecorder.isRecording()) {
      this.replayRecorder.start(initialSeed)
    }

    // Initialize arena
    this.spawnCoordinator.initialize()

    // Loop state
    this.lastFrameTime = this._getTime()
    this.isRunning = false
    this.tick = 0
  }

  /**
   * Start game loop
   */
  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = this._getTime()
    this.frame()
  }

  /**
   * Stop game loop
   */
  stop() {
    this.isRunning = false
  }

  /**
   * Main game loop frame
   */
  frame() {
    if (!this.isRunning) return

    // Calculate delta time
    const now = this._getTime()
    const deltaTime = Math.min(0.05, Math.max(0, (now - this.lastFrameTime) / 1000))
    this.lastFrameTime = now
    this.tick++

    // 1. Process input
    const inputFrame = this.inputCoordinator.processInput()

    // 2. Update abilities
    this.abilityCoordinator.update(deltaTime)

    // 3. Update WASM simulation (physics happens here)
    if (typeof this.wasmApi.update === 'function') {
      this.wasmApi.update(deltaTime)
    } else if (typeof this.wasmApi.exports?.update === 'function') {
      this.wasmApi.exports.update(deltaTime)
    } else {
      console.error('[GameLoopCoordinator] WASM update function not found')
    }

    // 4. Update state snapshot (once per frame)
    this.stateCoordinator.update()

    // 5. Get centralized state
    const wasmState = this.stateCoordinator.getState()

    // 6. Record frame for replay
    if (this.replayRecorder.isRecording()) {
      this.replayRecorder.recordFrame({
        tick: this.tick,
        input: inputFrame
      })

      // Record state snapshot every 60 frames
      if (this.tick % 60 === 0) {
        this.replayRecorder.recordStateSnapshot(
          this.tick,
          wasmState.serialize()
        )
      }
    }

    // 7. Render frame
    this.renderingCoordinator.render(wasmState, this.wasmApi)

    // 8. Update UI
    const playerState = wasmState.getPlayerState()
    const uiState = wasmState.getUIState()
    this.uiManager.update(playerState, uiState)

    // 9. Update spawning
    this.spawnCoordinator.update(deltaTime)

    // Continue loop
    requestAnimationFrame(() => this.frame())
  }

  /**
   * Reset game
   */
  reset() {
    const newSeed = Date.now()
    
    try {
      this.wasmApi.resetRun(BigInt(newSeed))
    } catch {
      this.wasmApi.resetRun(newSeed)
    }

    this.stateCoordinator.setSeed(newSeed)
    this.spawnCoordinator.reset()
    this.uiManager.reset()
    this.inputCoordinator.clearHistory()
    
    if (this.replayRecorder.isRecording()) {
      this.replayRecorder.start(newSeed)
    }

    this.tick = 0
  }

  /**
   * Export replay
   */
  exportReplay() {
    return this.replayRecorder.export()
  }

  /**
   * Get current state (for debugging)
   */
  getState() {
    return this.stateCoordinator.getState()
  }

  /**
   * Enable/disable replay recording
   */
  setRecording(enabled) {
    this.inputCoordinator.setRecording(enabled)
    if (enabled) {
      this.replayRecorder.start(this.stateCoordinator.getSeed())
    } else {
      this.replayRecorder.stop()
    }
  }

  // Private helpers

  _getTime() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
  }
}
