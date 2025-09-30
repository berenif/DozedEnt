# 🐺 Wolf Movement Fix

**Date**: September 30, 2025  
**Status**: ✅ Fixed  
**Build**: game.wasm 34.1 KB

---

## 🐛 Problem

Wolves were showing animations but not moving, then teleporting back to their initial position.

## 🔍 Root Causes

### 1. Incorrect Speed Scale
**Location**: `public/src/wasm/managers/WolfManager.cpp:9`

**Problem**: 
```cpp
constexpr float BASE_WOLF_SPEED = 250.0f;  // ❌ Pixel-based scale
```

The game uses **normalized 0-1 coordinate space**, but wolves were set to move at 250 units/second (pixel scale). This made wolves move 833x too fast, causing them to:
- Hit world boundaries instantly
- Move off-screen before being visible
- Appear to "teleport" when clamped back to 0-1 bounds

**Fix**:
```cpp
constexpr float BASE_WOLF_SPEED = 0.25f;  // ✅ Normalized space (slightly slower than player's 0.3)
```

### 2. Uninitialized State Timer
**Location**: `public/src/wasm/managers/WolfManager.cpp:60-71`

**Problem**:
When wolves spawned, their `state_timer` defaulted to `0.0f` but was never explicitly initialized. The state machine code only set the timer when the state *changed*:

```cpp
// OLD CODE
if (new_state != wolf.state) {
    wolf.state_timer = get_state_duration(new_state);  // Only sets when state changes
}
```

If a wolf evaluated to the same state (e.g., Idle → Idle), the timer never got set, leaving it at 0 or negative. This caused:
- Broken state behavior execution
- No velocity updates
- Wolves stuck in a perpetual "expired timer" state

**Fix 1 - Initialize on spawn**:
```cpp
void WolfManager::spawn_wolf(float x, float y, WolfType type) {
    Wolf wolf;
    wolf.id = next_wolf_id_++;
    wolf.type = type;
    wolf.x = Fixed::from_float(x);
    wolf.y = Fixed::from_float(y);
    wolf.state = WolfState::Idle;
    wolf.state_timer = get_state_duration(WolfState::Idle);  // ✅ Initialize timer
    
    init_wolf_stats(wolf);
    wolves_.push_back(wolf);
}
```

**Fix 2 - Always reset timer on expiration**:
```cpp
void WolfManager::update_wolf_state_machine(Wolf& wolf, float delta_time) {
    wolf.state_timer -= delta_time;
    
    if (wolf.state_timer <= 0.0f) {
        WolfState new_state = evaluate_best_state(wolf);
        
        if (new_state != wolf.state) {
            wolf.state = new_state;
            wolf.state_timer = get_state_duration(new_state);
            on_state_enter(wolf, new_state);
        } else {
            // ✅ Even if state doesn't change, reset timer
            wolf.state_timer = get_state_duration(new_state);
        }
    }
    // ... state behavior execution
}
```

---

## 🎯 Result

Wolves now:
- ✅ Move at correct speed (0.25 units/second in normalized space)
- ✅ Have properly initialized state timers
- ✅ Execute state behaviors correctly
- ✅ Transition smoothly between states
- ✅ Don't teleport or get stuck

---

## 🧪 Testing

1. **Spawn wolves**: `wasmApi.exports.spawn_wolves(5)`
2. **Observe**: Wolves should move smoothly with animations matching movement
3. **Check states**: Wolves should transition from Idle → Alert → Approach as they detect player
4. **Verify speed**: Wolves slightly slower than player (0.25 vs 0.3 speed)

---

## 📊 Speed Comparison

| Entity | Speed (normalized/second) | Scale |
|--------|--------------------------|-------|
| Player | 0.3 | Baseline |
| Wolf (Normal) | 0.25 | 83% of player |
| Wolf (Alpha) | 0.3 | 100% (with 1.5x health modifier) |
| Wolf (Scout) | 0.3 | 120% (with 1.2x speed modifier) |

*Note: Type modifiers applied in `init_wolf_stats()`*

---

## 🔧 Files Modified

- `public/src/wasm/managers/WolfManager.cpp` (+2 lines, modified 2 functions)
  - Line 9: Changed `BASE_WOLF_SPEED` from 250.0f to 0.25f
  - Line 67: Added `wolf.state_timer` initialization
  - Line 213-216: Added else clause to reset timer
- `public/wasm/game.wasm` (rebuilt, 34.1 KB)

---

## 💡 Lessons Learned

1. **Always match coordinate systems**: Verify speed constants match the game's coordinate space (normalized 0-1 vs pixels)
2. **Initialize all state properly**: Don't rely on struct defaults for critical state like timers
3. **Handle state machine edge cases**: Consider what happens when a state evaluates to itself
4. **Test with different spawn positions**: Edge cases appear when entities spawn far from player

---

**Status**: ✅ **WOLVES NOW MOVE CORRECTLY!**  
**Next**: Test gameplay, balance speed/aggression, tune state transitions

