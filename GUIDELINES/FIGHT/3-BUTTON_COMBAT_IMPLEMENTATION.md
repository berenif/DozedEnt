# 🎮 3-Button Combat System Implementation (October 2025)

## Overview

This document defines the new 3-button combat layout. Movement remains unchanged (WASD/Arrow keys on desktop, virtual joystick on mobile). Attacks are per-hand, with light/heavy determined by press vs hold. Block and parry are inferred from button combinations, and roll is mapped to Special + direction.

## Controls

### Desktop (Keyboard)

- J: Left Hand (press = Light, hold = Heavy)
- L: Right Hand (press = Light, hold = Heavy)
- K: Special
- Movement: W, A, S, D (unchanged)

### Mobile (Touch)

- Three on-screen buttons: Left Hand, Special, Right Hand (clustered as today)
- Movement: Virtual joystick (unchanged)

## Core Mechanics

### Attacks (Per Hand)

- Press (short): Light Attack
- Hold (beyond heavy_hold_threshold): Heavy Attack
- Heavy timing threshold is defined in WASM and may be tuned; UI is visual-only

### Block & Parry

- Without shield equipped:
  - Block: Hold Left Hand + Right Hand simultaneously (J + L)
  - Parry: Perfect-timing press of the same combination within the parry window before impact
- With shield equipped:
  - Block: Hold Left Hand (J)
  - Parry: Perfect-timing tap of Left Hand (J) before impact
- Parry effects (unchanged):
  - Perfect Parry Window: 120 ms
  - On success: Full stamina restore and attacker stunned for 300 ms
  - With shield: Parry negates damage entirely
  - Without shield: Parry prevents damage during the window

### Roll/Dodge vs Special (Precedence)

- Tap Special + Direction = Roll (gesture)
  - Direction is any non-zero movement input during a short gesture window (≈120 ms)
  - Releasing Special within the gesture window with direction active triggers Roll
- Hold Special (no direction) = Special
  - Holding Special beyond the hold threshold without direction triggers the Special ability
- If Special is held with direction: treated as Roll only when released within the tap window; otherwise resolves to Special on hold without direction
- Roll timing/model remains: 300 ms i-frames → 200 ms slide (low traction)

### Input Buffer

- 120 ms input buffer is preserved to prevent dropped commands during state transitions

## API Mapping (High-Level)

- set_player_input(moveX, moveY, leftHand, rightHand, special)
  - moveX, moveY: -1..1 (normalized movement axes)
  - leftHand, rightHand, special: 0/1 button-down states per frame
  - Block, Parry, and Roll are inferred in WASM from button combinations and timing

## Animation & VFX Notes

- Attack animations per hand are triggered by the corresponding button state; heavy variants play when the hold duration exceeds the threshold
- Block state triggers on Left+Right (or Left with shield) and uses existing block visuals
- Parry triggers the parry VFX and sound; shielded parry adds no-damage guarantee
- Roll triggers the existing roll animation with i-frames and slide phase

## Testing Checklist

- Light vs Heavy detection per hand based on hold duration
- Block without shield via J+L hold; with shield via J hold
- Parry window (120 ms) validated with and without shield
- Roll via K + direction; conflicts with Special are handled per precedence rule
- Determinism preserved: same inputs → same outcomes

## Legacy Note

This document supersedes the 5-button layout. See 5-BUTTON_COMBAT_IMPLEMENTATION.md for historical context only.


