// StateCoordinator.js
// Manages WASM state synchronization and snapshot management
// Single responsibility: coordinate state updates between WASM and JS

import { WasmCoreState } from '../state/WasmCoreState.js'

/**
 * StateCoordinator handles all WASM state synchronization.
 * This is the single entry point for accessing game state.
 * 
 * Responsibilities:
 * - Create and maintain WasmCoreState facade
 * - Update state snapshot once per frame
 * - Provide validated state to other coordinators
 * - Handle physics validation (ensure WASM is source of truth)
 */
export class StateCoordinator {
  constructor(wasmApi) {
    this.wasmApi = wasmApi
    this.wasmState = new WasmCoreState(wasmApi)
    
    // Physics validation
    this.lastPosition = { x: 0, y: 0 }
    this.physicsValidationEnabled = true
  }

  /**
   * Update state snapshot (call once per frame before rendering)
   */
  update() {
    this.wasmState.update()
    
    // Validate physics comes from WASM
    if (this.physicsValidationEnabled) {
      this._validatePhysics()
    }
  }

  /**
   * Get centralized state facade
   */
  getState() {
    return this.wasmState
  }

  /**
   * Set deterministic seed for replay
   */
  setSeed(seed) {
    this.wasmState.setSeed(seed)
  }

  /**
   * Get current seed
   */
  getSeed() {
    return this.wasmState.getSeed()
  }

  /**
   * Serialize current state for multiplayer/replay
   */
  serialize() {
    return this.wasmState.serialize()
  }

  // Private methods

  /**
   * Validate that physics is coming from WASM only (ADR-001)
   */
  _validatePhysics() {
    const pos = this.wasmState.getPlayerPosition()
    
    // Validate position object structure
    if (!pos || typeof pos !== 'object') {
      console.error('[StateCoordinator] 🔴 PHYSICS VALIDATION FAILED: Position is not an object')
      return
    }

    if (!('x' in pos) || !('y' in pos)) {
      console.error('[StateCoordinator] 🔴 PHYSICS VALIDATION FAILED: Position missing x or y properties')
      return
    }
    
    // Check for NaN corruption (indicates JS physics or WASM error)
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      console.error('[StateCoordinator] 🔴 PHYSICS VALIDATION FAILED: Position is NaN')
      console.error('This indicates JS physics interference or WASM corruption')
      console.trace('Position corruption trace:')
      return
    }
    
    // Check for impossible teleportation (indicates position override)
    const dx = Math.abs(pos.x - this.lastPosition.x)
    const dy = Math.abs(pos.y - this.lastPosition.y)
    const maxDelta = 10.0 // Maximum reasonable movement per frame
    
    if (dx > maxDelta || dy > maxDelta) {
      console.warn('[StateCoordinator] ⚠️ Sudden position jump detected')
      console.warn(`Delta: (${dx.toFixed(2)}, ${dy.toFixed(2)})`)
      console.warn('This may indicate JS physics override or teleport')
    }
    
    this.lastPosition = pos
  }

  /**
   * Enable/disable physics validation
   */
  setPhysicsValidation(enabled) {
    this.physicsValidationEnabled = enabled
  }
}

