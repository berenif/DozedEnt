# 🔧 WASM Rebuild for Wolf Exports

**Date**: September 30, 2025  
**Status**: ✅ Complete  
**Build Size**: 34KB (104 exports)

---

## 🎯 What Was Done

### 1. Added Convenience Exports
Added helper functions to make JS integration easier:

```cpp
// Spawn multiple wolves at once (in circle around player)
spawn_wolves(count)

// Clear all enemies
clear_enemies()

// Get enemy data (aliases for wolf functions)
get_enemy_count()   // Same as get_wolf_count()
get_enemy_x(index)  // Same as get_wolf_x(index)
get_enemy_y(index)  // Same as get_wolf_y(index)
get_enemy_type(index)
get_enemy_state(index)
get_enemy_role(index)
get_enemy_fatigue(index)  // Calculated as 1.0 - (health/max_health)
```

### 2. Fixed Compilation Issues
- ✅ Fixed `get_x()` - already returns float, removed `.to_float()`
- ✅ Fixed `clear_enemies()` - uses `clear_all()` from WolfManager
- ✅ Fixed `get_enemy_role()` - uses `pack_role` field, not `role`
- ✅ Fixed `get_enemy_fatigue()` - calculated from health (no fatigue field in Wolf struct)

### 3. Build Results
```
✅ game.wasm - 34 KB (104 exports)
✅ game-host.wasm - 143.8 KB (16 exports)
```

---

## 📦 New WASM Exports

### Wolf Spawning
```javascript
// Spawn N wolves in a circle around player
wasmApi.exports.spawn_wolves(5);

// Spawn single wolf at position
wasmApi.exports.spawn_wolf(0.7, 0.3, 0); // x, y, type
```

### Wolf Queries
```javascript
// Get wolf count
const count = wasmApi.exports.get_enemy_count();

// Get wolf position
const x = wasmApi.exports.get_enemy_x(0);
const y = wasmApi.exports.get_enemy_y(0);

// Get wolf state
const type = wasmApi.exports.get_enemy_type(0);    // 0=Normal, 1=Alpha, etc.
const state = wasmApi.exports.get_enemy_state(0);  // 0=Idle, 1=Patrol, etc.
const role = wasmApi.exports.get_enemy_role(0);    // 0=Leader, 1=Bruiser, etc.
const fatigue = wasmApi.exports.get_enemy_fatigue(0); // 0.0=full health, 1.0=dead
```

### Wolf Actions
```javascript
// Clear all wolves
wasmApi.exports.clear_enemies();
```

---

## 🎮 Test Demo Now Ready!

The test demo at `public/demos/test-wolf-rendering.html` should now work correctly:

1. **Open**: `public/demos/test-wolf-rendering.html` in your browser
2. **Click**: "Spawn 5 Wolves" button
3. **See**: Wolves appear in circle around player
4. **Observe**: Health bars, state labels, animations

---

## 🐛 Previous Issues Fixed

### Issue 1: WASM 404 Errors
**Problem**: Multiple 404s in console before WASM loaded  
**Solution**: Normal behavior - loader tries multiple paths  
**Result**: WASM successfully loads from `/public/game.wasm`

### Issue 2: Old WASM (22KB)
**Problem**: Old WASM didn't have wolf exports  
**Solution**: Rebuilt WASM with wolf code  
**Result**: New WASM is 34KB with 104 exports

### Issue 3: Missing Exports
**Problem**: `spawn_wolves` and `get_enemy_*` didn't exist  
**Solution**: Added convenience exports  
**Result**: Demo can now spawn and query wolves

---

## 📊 WASM Export Summary

### Total Exports: 104
- **Core Game**: 30+ exports (player, input, update, etc.)
- **Combat System**: 10+ exports (attack, block, parry, etc.)
- **Wolf System**: 15+ exports (spawn, query, damage, etc.)
- **Game Phases**: 20+ exports (choices, shop, risk, etc.)
- **Environment**: 10+ exports (obstacles, exits, hazards, etc.)
- **Utilities**: 20+ exports (memory, stack, etc.)

### Wolf-Specific Exports (15)
```
1.  spawn_wolf
2.  spawn_wolves ✨ NEW
3.  get_wolf_count
4.  get_enemy_count ✨ NEW
5.  get_wolf_x
6.  get_enemy_x ✨ NEW
7.  get_wolf_y
8.  get_enemy_y ✨ NEW
9.  get_enemy_type ✨ NEW
10. get_wolf_state
11. get_enemy_state ✨ NEW
12. get_enemy_role ✨ NEW
13. get_enemy_fatigue ✨ NEW
14. damage_wolf
15. remove_wolf
16. clear_enemies ✨ NEW
17. set_wind
18. post_sound
19. post_danger
20. set_den
21. get_pack_morale
22. get_pack_plan
```

---

## 🎯 Next Steps

### 1. Test the Demo (NOW!)
```bash
# Open in browser
public/demos/test-wolf-rendering.html

# Should see:
✅ No more 404 errors (or if any, WASM loads successfully)
✅ "Spawn 5 Wolves" creates visible wolves
✅ Wolves appear in circle around player
✅ Health bars visible
✅ State labels show AI state
✅ Legs animate when wolves move
✅ 60 FPS with 5+ wolves
```

### 2. Verify Core Functionality
- [ ] Wolves spawn correctly
- [ ] Wolves visible on screen
- [ ] Health bars update
- [ ] State changes visible
- [ ] Different wolf types have different colors
- [ ] Animations smooth

### 3. Continue Development
Once demo works:
- **Phase 3**: Combat Integration (make wolves fight)
- **Phase 4**: Pack Behavior (coordinated attacks)
- **Phase 6**: Advanced AI (adaptive difficulty)

---

## 🔧 Build Commands Reference

```bash
# Rebuild WASM if you make changes
npm run wasm:build

# Build with debug symbols
npm run wasm:build:dev

# Build host-authoritative version
npm run wasm:build:host

# Build all variants
npm run wasm:build:all
```

---

## 📁 Key Files Modified

### WASM Source
- `public/src/wasm/game_refactored.cpp` (+40 lines)
  - Added `spawn_wolves()` function
  - Added `clear_enemies()` function
  - Added `get_enemy_*()` aliases
  - Fixed compilation errors

### Build Outputs
- `public/wasm/game.wasm` (34KB)
- `public/game.wasm` (34KB copy)
- `dist/wasm/game.wasm` (34KB)

### Documentation
- `WASM_EXPORTS.json` (updated manifest)
- `GUIDELINES/PROGRESS/WOLF/WASM_REBUILD_NOTES.md` (this file)

---

## 💡 Architecture Notes

### Why Two Copies?
```
public/wasm/game.wasm  - Primary build output
public/game.wasm       - Copy for demos (easier path)
dist/wasm/game.wasm    - Distribution copy
```

### Why Alias Functions?
```cpp
// Consistency with WASM_EXPORTS.json documentation
get_wolf_x()   -> get_enemy_x()
get_wolf_y()   -> get_enemy_y()

// Both work! Use whichever you prefer
// Renderer uses get_enemy_* for consistency
```

---

**Status**: ✅ **WASM REBUILT AND READY!**  
**Action**: **Test the demo NOW!**  
**Location**: `public/demos/test-wolf-rendering.html`

