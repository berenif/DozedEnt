// HUD.js

export class HUD {
  constructor({ hpBarId, staminaBarId, phaseTextId }) {
    this.hpEl = document.getElementById(hpBarId)?.querySelector('i')
    this.stEl = document.getElementById(staminaBarId)?.querySelector('i')
    this.phaseEl = document.getElementById(phaseTextId)
  }

  update({ hp, stamina, phase }) {
    if (this.hpEl) { this.hpEl.style.width = `${Math.floor(Math.max(0, Math.min(1, hp)) * 100)}%` }
    if (this.stEl) { this.stEl.style.width = `${Math.floor(Math.max(0, Math.min(1, stamina)) * 100)}%` }
    if (this.phaseEl) { this.phaseEl.textContent = `Phase: ${phase}` }
  }
}


