// SpawnCoordinator.js
// Coordinates enemy/hazard spawning
// Single responsibility: manage spawn logic

import { ArenaSpawner } from '../spawn/ArenaSpawner.js'

/**
 * SpawnCoordinator manages enemy and hazard spawning.
 * All spawning logic delegates to WASM (no Math.random()).
 * 
 * Responsibilities:
 * - Manage ArenaSpawner
 * - Handle initial spawn
 * - Update spawn logic each frame
 * - Reset spawning state
 */
export class SpawnCoordinator {
  constructor(wasmApi) {
    this.wasmApi = wasmApi
    this.arenaSpawner = new ArenaSpawner(wasmApi)
  }

  /**
   * Initialize arena with initial spawn
   */
  initialize() {
    this.arenaSpawner.spawnInitial()
  }

  /**
   * Update spawning logic
   */
  update(deltaTime) {
    this.arenaSpawner.update(deltaTime)
  }

  /**
   * Reset spawning state
   */
  reset() {
    this.arenaSpawner.reset()
  }
}

