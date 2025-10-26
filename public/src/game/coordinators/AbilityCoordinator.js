// AbilityCoordinator.js
// Coordinates character abilities
// Single responsibility: manage ability systems

import { BerserkerChargeController } from '../abilities/BerserkerChargeController.js'

/**
 * AbilityCoordinator manages character-specific ability systems.
 * 
 * Responsibilities:
 * - Create ability controllers based on character type
 * - Update abilities each frame
 * - Coordinate ability state with input
 */
export class AbilityCoordinator {
  constructor(wasmApi, inputCoordinator) {
    this.wasmApi = wasmApi
    this.inputCoordinator = inputCoordinator
    
    // Initialize character abilities
    this.chargeController = new BerserkerChargeController({
      wasmApi,
      input: inputCoordinator.inputMapper
    })
  }

  /**
   * Update abilities
   */
  update(deltaTime) {
    this.chargeController.update(deltaTime)
  }

  /**
   * Set character type and initialize appropriate abilities
   */
  setCharacterType(characterType) {
    try {
      const ex = this.wasmApi.exports || {}
      if (typeof ex.set_character_type === 'function') {
        ex.set_character_type(characterType)
      }
    } catch (error) {
      console.warn('[AbilityCoordinator] Failed to set character type:', error)
    }
  }
}

