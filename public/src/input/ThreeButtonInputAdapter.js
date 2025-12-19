/**
 * ThreeButtonInputAdapter
 *
 * Translates the 3-button combat layout into the existing 5-action flags
 * expected by the WASM API: lightAttack, heavyAttack, block, roll, special.
 *
 * Buttons:
 * - leftHand  (J)
 * - special   (K)
 * - rightHand (L)
 *
 * Rules implemented (UI-side approximation):
 * - Light vs Heavy per hand:
 *   - Light on short press (emitted on release if not heavy)
 *   - Heavy when held beyond heavyHoldMs (emitted once when threshold is crossed)
 * - Block (no shield info available):
 *   - Active while leftHand AND rightHand are simultaneously held
 * - Parry: handled in WASM during early block window (no JS-side logic needed)
 * - Roll vs Special precedence using the special button (K):
 *   - Tap with non-zero movement and release within rollTapWindowMs -> one-shot roll
 *   - Hold without direction beyond specialHoldMs -> special remains active while held
 *   - If special is held with direction and not released within window, it resolves to
 *     special once direction returns to zero and hold exceeds specialHoldMs
 */

export class ThreeButtonInputAdapter {
  constructor(options = {}) {
    // Timing thresholds in milliseconds
    this.heavyHoldMs = this._clampNumber(options.heavyHoldMs, 100, 1200, 300); // default 300ms
    this.rollTapWindowMs = this._clampNumber(options.rollTapWindowMs, 60, 240, 120); // default 120ms
    this.specialHoldMs = this._clampNumber(options.specialHoldMs, 120, 800, 220); // default 220ms

    // Internal state tracking
    this._left = this._createHandState();
    this._right = this._createHandState();
    this._special = {
      down: false,
      downAt: 0,
      emittedRoll: false,
      emittedSpecial: false,
      directionWasNonZero: false
    };
  }

  /**
   * Update adapter for the current frame and produce action flags.
   * @param {Object} p
   * @param {boolean} p.leftHandDown
   * @param {boolean} p.rightHandDown
   * @param {boolean} p.specialDown
   * @param {number} p.moveX - -1..1
   * @param {number} p.moveY - -1..1
   * @param {number} p.nowMs - performance.now()
   * @returns {{lightAttack:boolean,heavyAttack:boolean,block:boolean,roll:boolean,special:boolean}}
   */
  update(p) {
    const now = typeof p.nowMs === 'number' ? p.nowMs : (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const moveLen = Math.hypot(this._safeNum(p.moveX), this._safeNum(p.moveY));
    const hasDirection = moveLen > 0.001;

    // Reset frame outputs
    let lightAttack = false;
    let heavyAttack = false;
    let block = false;
    let roll = false;
    let special = false;

    // --- Hands (left/right) ---
    lightAttack = this._updateHand(this._left, !!p.leftHandDown, now) || lightAttack;
    heavyAttack = this._left.emittedHeavyThisFrame || heavyAttack;

    lightAttack = this._updateHand(this._right, !!p.rightHandDown, now) || lightAttack;
    heavyAttack = this._right.emittedHeavyThisFrame || heavyAttack;

    // Block: both hands held
    block = (!!p.leftHandDown && !!p.rightHandDown);

    // If we are blocking, suppress attack emissions this frame
    if (block) {
      lightAttack = false;
      heavyAttack = false;
      // While blocking, clear any pending light on release (prevents accidental taps)
      this._left.pendingLightOnRelease = false;
      this._right.pendingLightOnRelease = false;
    }

    // --- Special vs Roll ---
    roll = this._updateSpecial(!!p.specialDown, hasDirection, now);
    // If not rolling, special may be active (hold semantics)
    if (!roll) {
      special = this._isSpecialActive(now, hasDirection);
    }

    return { lightAttack, heavyAttack, block, roll, special };
  }

  // Internal helpers

  _createHandState() {
    return {
      down: false,
      downAt: 0,
      emittedHeavy: false,
      emittedHeavyThisFrame: false,
      pendingLightOnRelease: false
    };
  }

  _updateHand(state, isDown, now) {
    state.emittedHeavyThisFrame = false;

    if (isDown && !state.down) {
      // Key pressed
      state.down = true;
      state.downAt = now;
      state.emittedHeavy = false;
      state.pendingLightOnRelease = true; // assume light unless heavy threshold is crossed
      return false; // no light yet; we decide on release
    }

    if (!isDown && state.down) {
      // Key released
      const heldMs = now - state.downAt;
      const shouldEmitLight = state.pendingLightOnRelease && !state.emittedHeavy && heldMs < this.heavyHoldMs;
      // Reset
      state.down = false;
      state.downAt = 0;
      state.pendingLightOnRelease = false;

      return shouldEmitLight; // emit light one-shot if not heavy
    }

    if (isDown && state.down) {
      // Held
      const heldMs = now - state.downAt;
      if (!state.emittedHeavy && heldMs >= this.heavyHoldMs) {
        state.emittedHeavy = true;
        state.pendingLightOnRelease = false;
        state.emittedHeavyThisFrame = true; // one-shot heavy when crossing threshold
      }
    }

    return false;
  }

  _updateSpecial(isDown, hasDirection, now) {
    // Track transitions
    if (isDown && !this._special.down) {
      this._special.down = true;
      this._special.downAt = now;
      this._special.emittedRoll = false;
      this._special.emittedSpecial = false;
      this._special.directionWasNonZero = hasDirection;
      return false;
    }

    if (!isDown && this._special.down) {
      // Released — decide if this was a roll tap
      const heldMs = now - this._special.downAt;
      const isRollTap = (heldMs <= this.rollTapWindowMs) && (this._special.directionWasNonZero || hasDirection);
      this._special.down = false;
      if (isRollTap) {
        this._special.emittedRoll = true;
        return true; // one-shot roll
      }
      return false;
    }

    if (isDown && this._special.down) {
      // While holding, remember if direction was ever active
      if (hasDirection) {this._special.directionWasNonZero = true;}
    }

    return false;
  }

  _isSpecialActive(now, hasDirection) {
    // Only while button is held and we haven't emitted a roll
    if (!this._special.down) {return false;}

    const heldMs = now - this._special.downAt;
    // If within roll window, do not activate special yet
    if (heldMs <= this.rollTapWindowMs) {return false;}

    // Activate special when held long enough without direction
    if (heldMs >= this.specialHoldMs && !hasDirection) {
      return true;
    }
    return false;
  }

  _clampNumber(value, min, max, fallback) {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.max(min, Math.min(max, n));
  }

  _safeNum(n) {
    return Number.isFinite(n) ? n : 0;
  }
}


