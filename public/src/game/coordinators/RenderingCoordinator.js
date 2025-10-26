// RenderingCoordinator.js
// Coordinates all rendering systems
// Single responsibility: orchestrate rendering from state snapshots

import { GameRenderer } from '../renderer/GameRenderer.js'
import { EnemyRenderer } from '../renderer/EnemyRenderer.js'

/**
 * RenderingCoordinator manages all rendering systems.
 * It reads from WasmCoreState and delegates to specialized renderers.
 * 
 * Responsibilities:
 * - Coordinate GameRenderer and EnemyRenderer
 * - Clear canvas each frame
 * - Render player and enemies from state snapshot
 * - No direct WASM access (reads from StateCoordinator only)
 */
export class RenderingCoordinator {
  constructor(canvas) {
    this.canvas = canvas
    this.gameRenderer = new GameRenderer(canvas)
    this.enemyRenderer = new EnemyRenderer(canvas)
  }

  /**
   * Render current frame from state snapshot
   * @param {WasmCoreState} wasmState - Centralized state facade
   * @param {Object} wasmApi - WASM API (for enemy renderer compatibility)
   */
  render(wasmState, wasmApi) {
    // Clear canvas
    this.gameRenderer.clear()

    // Get player state from centralized facade
    const playerState = wasmState.getPlayerState()

    // Render player
    this.gameRenderer.renderPlayer(playerState)

    // Render enemies (TODO: refactor EnemyRenderer to use wasmState instead of wasmApi)
    this.enemyRenderer.renderEnemies(wasmApi)
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Clean up renderers if needed
  }
}

