# WASM Position Corruption Fix

## 🎯 **Root Cause Identified**

The player position is being **corrupted immediately after `init_run()` is called**, NOT during the update loop.

### Evidence:
```
✅ [Main] Player spawned at 0.9399999976158142 0.9399999976158142
```

But `init_run()` sets position to:
```cpp
g_pos_x = 0.5f;  // game.cpp line 97
g_pos_y = 0.5f;  // game.cpp line 98
```

**Something between setting position and returning from `init_run()` is corrupting it!**

---

## 🔧 **Fixes Applied**

### 1. **Removed Duplicate init_run() Call** ✅
- **File**: `public/src/demo/wasm-api.js` line 695-697
- **Problem**: WASM was being initialized TWICE (once in wasm-api.js, once in main.js)
- **Solution**: Removed the early init call, let main.js handle it

### 2. **Added Position Corruption Detection & Fix** ✅
- **File**: `public/src/demo/main.js` line 32-43
- **Solution**: Detects if position is corrupted after `init_run()` and calls `start()` to fix it
- **Workaround**: If position is not 0.5±0.1 or is NaN, calls `start()` to reset

```javascript
// WORKAROUND: If position is corrupted, force it back to 0.5, 0.5
if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x - 0.5) > 0.1 || Math.abs(y - 0.5) > 0.1) {
  console.warn('⚠️ [Main] Position corrupted after init_run, attempting fix...');
  
  // Use start() which also sets position to 0.5
  if (wasmApi.exports?.start) {
    wasmApi.exports.start();
    x = wasmApi.exports.get_x?.();
    y = wasmApi.exports.get_y?.();
    console.log('✅ [Main] Position after start():', x, y);
  }
}
```

---

## 🔍 **Likely Culprits in game.cpp**

The corruption happens in ONE of these initialization functions called by `init_run()`:

| Line | Function | Likelihood |
|------|----------|------------|
| 154 | `physics_init()` | ⭐⭐⭐ HIGH |
| 157 | `force_propagation_init()` | ⭐⭐⭐ HIGH |
| 160 | `constraint_system_init()` | ⭐⭐ MEDIUM |
| 163 | `chemistry_system_init()` | ⭐⭐⭐ HIGH |
| 166 | `world_simulation_init()` | ⭐⭐ MEDIUM |
| 144 | `init_wolf_pack_system()` | ⭐ LOW |

**Most Likely**: One of the physics/simulation systems is writing to `g_pos_x`/`g_pos_y` during initialization.

---

## 🧪 **Test the Fix**

1. Refresh your game page
2. Look for these console messages:

### If Workaround Works:
```
✅ [Main] Player position after init_run: 0.94 0.94
⚠️ [Main] Position corrupted after init_run, attempting fix...
✅ [Main] Position after start(): 0.5 0.5
✅ [Main] Player spawned successfully at 0.5 0.5
```

### If Still Broken:
```
✅ [Main] Player position after init_run: NaN NaN
⚠️ [Main] Position corrupted after init_run, attempting fix...
✅ [Main] Position after start(): NaN NaN
❌ [Main] WASM init failed - position is NaN
```

---

## 🔬 **Next Steps to Find Root Cause**

### Option 1: Binary Search the Init Functions
Comment out init functions one by one in `game.cpp` `init_run()` to find which one corrupts position:

```cpp
void init_run(unsigned long long seed, unsigned int start_weapon) {
  // ... existing code ...
  g_pos_x = 0.5f;
  g_pos_y = 0.5f;
  
  // Comment these out ONE AT A TIME
  // physics_init();              // TEST 1: Comment this
  // force_propagation_init();    // TEST 2: Comment this
  // constraint_system_init();    // TEST 3: Comment this
  // chemistry_system_init();     // TEST 4: Comment this
  // world_simulation_init();     // TEST 5: Comment this
}
```

### Option 2: Add Position Guards in C++
Add position validation after each init call:

```cpp
g_pos_x = 0.5f;
g_pos_y = 0.5f;

physics_init();
if (g_pos_x != 0.5f || g_pos_y != 0.5f) {
  // Found the culprit!
  g_pos_x = 0.5f;  // Reset
  g_pos_y = 0.5f;
}
```

### Option 3: Search for Direct Writes
Search `public/src/wasm/` for any code that writes to `g_pos_x` or `g_pos_y`:

```bash
grep -r "g_pos_x\s*=" public/src/wasm/
grep -r "g_pos_y\s*=" public/src/wasm/
```

Look for writes that happen during initialization.

---

## 📊 **Status**

| Issue | Status | Solution |
|-------|--------|----------|
| Duplicate init_run() calls | ✅ FIXED | Removed from wasm-api.js |
| Position corruption after init | ⚠️ WORKAROUND | Calls start() to reset |
| Root cause in C++ | ❌ NOT FIXED | Needs C++ investigation |
| Player movement | 🤞 SHOULD WORK | If workaround succeeds |

---

## 💡 **Expected Behavior After Fix**

1. ✅ Player spawns at (0.5, 0.5) - valid position
2. ✅ No NaN values
3. ✅ Player should be able to move with WASD
4. ✅ No stuck attack state (from previous mouse fix)

---

**Refresh the page and check the console!** The workaround should allow the game to run even if the underlying C++ bug persists.
