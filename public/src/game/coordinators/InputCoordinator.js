// InputCoordinator.js
// Coordinates input capture and processing
// Single responsibility: handle all input-related logic

import { InputMapper } from '../input/InputMapper.js'

/**
 * InputCoordinator manages input capture and forwarding to WASM.
 * 
 * Responsibilities:
 * - Create and manage InputMapper
 * - Process input each frame
 * - Forward input to WASM via setPlayerInput
 * - Record input for replay (if enabled)
 */
export class InputCoordinator {
  constructor(wasmApi, options = {}) {
    this.wasmApi = wasmApi
    this.inputMapper = new InputMapper()
    this.inputMapper.attach()
    
    // Replay recording
    this.recordingEnabled = options.recordingEnabled || false
    this.inputHistory = []
  }

  /**
   * Process input and send to WASM
   * @returns {Object} Current input state (for recording)
   */
  processInput() {
    const axisX = this.inputMapper.axisX()
    const axisY = this.inputMapper.axisY()
    const flags = this.inputMapper.flags()

    // Debug logging for attack inputs
    if (flags.light || flags.heavy || flags.special) {
      console.log('[InputCoordinator] Attack input detected:', {
        light: flags.light,
        heavy: flags.heavy,
        special: flags.special,
        axisX,
        axisY
      })
      
      // Check WASM state before and after input
      if (this.wasmApi.exports) {
        const beforeAttackState = this.wasmApi.exports.get_attack_state?.() ?? 'undefined'
        const beforeAnimState = this.wasmApi.exports.get_player_anim_state?.() ?? 'undefined'
        const stamina = this.wasmApi.exports.get_stamina?.() ?? 'undefined'
        
        console.log('[InputCoordinator] Before input - Attack State:', beforeAttackState, 'Anim State:', beforeAnimState, 'Stamina:', stamina)
      }
    }

    // Send to WASM
    this.wasmApi.setPlayerInput(
      axisX,
      axisY,
      flags.roll ? 1 : 0,
      flags.jump ? 1 : 0,
      flags.light ? 1 : 0,
      flags.heavy ? 1 : 0,
      flags.block ? 1 : 0,
      flags.special ? 1 : 0
    )
    
    // Check WASM state after input
    if (flags.light || flags.heavy || flags.special) {
      if (this.wasmApi.exports) {
        const afterAttackState = this.wasmApi.exports.get_attack_state?.() ?? 'undefined'
        const afterAnimState = this.wasmApi.exports.get_player_anim_state?.() ?? 'undefined'
        
        console.log('[InputCoordinator] After input - Attack State:', afterAttackState, 'Anim State:', afterAnimState)
      }
    }

    // Record for replay
    const inputFrame = {
      axisX,
      axisY,
      flags: { ...flags }
    }

    if (this.recordingEnabled) {
      this.inputHistory.push(inputFrame)
    }

    return inputFrame
  }

  /**
   * Enable/disable input recording
   */
  setRecording(enabled) {
    this.recordingEnabled = enabled
    if (!enabled) {
      this.inputHistory = []
    }
  }

  /**
   * Get recorded input history
   */
  getInputHistory() {
    return [...this.inputHistory]
  }

  /**
   * Clear input history
   */
  clearHistory() {
    this.inputHistory = []
  }

  /**
   * Clean up input listeners
   */
  dispose() {
    // TODO: Add detach method to InputMapper
  }
}

