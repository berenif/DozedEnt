// UIManager.js
// Manages UI overlays and phase-specific UI states

import { HUD } from '../../ui/HUD.js'
import { ChoiceOverlay } from '../../ui/ChoiceOverlay.js'
import { ShopOverlay } from '../../ui/ShopOverlay.js'

export class UIManager {
  constructor(options, wasmApi) {
    this.wasmApi = wasmApi
    
    // Initialize HUD
    this.hud = new HUD({
      hpBarId: options.ui.hpBar,
      staminaBarId: options.ui.staminaBar,
      phaseTextId: options.ui.phaseText
    })

    // Initialize overlays
    this.choiceOverlay = new ChoiceOverlay({ 
      modalId: options.ui.choiceModal, 
      wasmApi 
    })
    this.shopOverlay = new ShopOverlay({ 
      modalId: options.ui.shopModal, 
      wasmApi 
    })

    // Setup help modal
    this.setupHelpModal(options.ui)
    this.setupRestartButton(options.ui)
  }

  setupHelpModal(uiOptions) {
    const helpModal = document.getElementById(uiOptions.helpModal)
    const helpButton = document.getElementById(uiOptions.btnHelp)
    const closeButton = document.getElementById(uiOptions.btnCloseHelp)

    helpButton?.addEventListener('click', () => {
      helpModal.classList.add('active')
    })

    closeButton?.addEventListener('click', () => {
      helpModal.classList.remove('active')
    })
  }

  setupRestartButton(uiOptions) {
    const restartButton = document.getElementById(uiOptions.btnRestart)
    restartButton?.addEventListener('click', () => {
      try { 
        this.wasmApi.resetRun(BigInt(Date.now())) 
      } catch { 
        this.wasmApi.resetRun(Date.now()) 
      }
    })
  }

  update(playerState, uiState) {
    // Update HUD - hp and stamina come from playerState, phase from uiState
    this.hud.update({ 
      hp: playerState.hp, 
      stamina: playerState.stamina, 
      phase: uiState.phase 
    })

    // Handle phase-specific overlays
    this.updatePhaseOverlays(uiState.phase)
  }

  updatePhaseOverlays(phase) {
    // Choice phase (phase 2)
    if (phase === 2) {
      this.choiceOverlay.show()
    } else {
      this.choiceOverlay.hide()
    }

    // CashOut phase (phase 6)
    if (phase === 6) {
      this.shopOverlay.show()
    } else {
      this.shopOverlay.hide()
    }
  }

  reset() {
    this.choiceOverlay.hide()
    this.shopOverlay.hide()
  }
}
