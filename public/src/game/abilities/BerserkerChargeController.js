// BerserkerChargeController.js
// Wires K to start/cancel berserker charge (Raider); read-only aside from calling WASM exports

export class BerserkerChargeController {
  constructor({ wasmApi, input }) {
    this.api = wasmApi
    this.input = input
  }

  update(_dt) {
    const ex = this.api.exports || {}
    const flags = this.input.flags()
    try {
      if (flags.special && typeof ex.is_berserker_charge_active === 'function' && !ex.is_berserker_charge_active()) {
        if (typeof ex.start_berserker_charge === 'function') {
          ex.start_berserker_charge()
        }
      }
    } catch (_e) {}
  }
}


