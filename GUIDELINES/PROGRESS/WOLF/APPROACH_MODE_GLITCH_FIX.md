# 🐺 Wolf Approach Mode Glitch Fix

**Date**: October 1, 2025  
**Status**: ✅ Fixed  
**Issue**: Wolves glitching and accelerating when entering approach mode

---

## 🐛 Problem

When wolves entered "approach mode" (moving towards the player), they would:
- Start glitching/jittering
- Accelerate to incorrect positions
- Appear to teleport or move erratically
- Show unstable/jerky movement

## 🔍 Root Cause

**Missing WASM Exports** - The JavaScript renderer (`WolfRenderer.js`) was trying to read wolf velocity using `get_enemy_vx()` and `get_enemy_vy()`, but these functions **did not exist** in the WASM module.

```javascript
// WolfRenderer.js line 106-107
vx: (wasmExports.get_enemy_vx?.(index)) || 0,  // ❌ Function doesn't exist!
vy: (wasmExports.get_enemy_vy?.(index)) || 0   // ❌ Function doesn't exist!
```

When these functions were called but didn't exist, they returned `undefined` or defaulted to `0`, causing:
- Incorrect animation pacing
- Broken movement calculations
- Erratic behavior when wolves changed velocity
- Visual glitches and jittering

## ✅ Solution

**Added Missing WASM Exports** - Added `get_enemy_vx` and `get_enemy_vy` functions to `game_refactored.cpp`:

```cpp
// Added to game_refactored.cpp after line 653
__attribute__((export_name("get_enemy_vx")))
float get_enemy_vx(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->vx.to_float() : 0.0f;
}

__attribute__((export_name("get_enemy_vy")))
float get_enemy_vy(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->vy.to_float() : 0.0f;
}
```

Then rebuilt the WASM module:
```bash
powershell -ExecutionPolicy Bypass -File tools/scripts/build-wasm.ps1
```

## 📝 Key Changes

**File**: `public/src/wasm/game_refactored.cpp`

1. **Added velocity export functions** (lines 655-665)
   - `get_enemy_vx(int index)` - Returns wolf's X velocity
   - `get_enemy_vy(int index)` - Returns wolf's Y velocity
   - Both read from the wolf's `vx` and `vy` Fixed-point values

2. **Rebuilt WASM module** (game.wasm 34.5 KB)
   - Now exports 106 functions (was 104)
   - JavaScript can now properly read wolf velocity
   - Animation system can synchronize with actual movement

## 🧪 Expected Behavior After Fix

- Wolves move smoothly towards player in approach mode
- No glitching or jittering
- Correct animation pacing synchronized with movement
- Correct speed matching WASM-defined `BASE_WOLF_SPEED = 0.25f`
- Smooth state transitions between Idle → Alert → Approach → Attack
- Stable, predictable movement behavior

## 🎯 Related Files

- `public/src/wasm/game_refactored.cpp` - WASM exports (added `get_enemy_vx`, `get_enemy_vy`)
- `public/src/wasm/managers/WolfManager.cpp` - WASM wolf AI and physics
- `public/src/renderer/WolfRenderer.js` - JavaScript wolf renderer (uses velocity exports)
- `tools/scripts/build-wasm.ps1` - WASM build script

## 📚 Related Documentation

- [Wolf Movement Fix](MOVEMENT_FIX.md) - Previous fix for wolf speed scaling
- [Wolf Enemy Implementation Plan](WOLF_ENEMY_IMPLEMENTATION_PLAN.md) - Full wolf system design
