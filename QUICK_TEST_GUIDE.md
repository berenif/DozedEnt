# Quick Test Guide - Player Movement Fixes

## 🚀 Quick Start

### Option 1: Test with your existing game
1. Open your game page (e.g., `public/index.html`)
2. Press **W, A, S, D** keys
3. Player should move! ✅

### Option 2: Use the test page
1. Open `public/test-player-movement.html` in browser
2. Click **"🔍 Run Full Diagnostics"**
3. Check the diagnostic log for green ✅ messages
4. Use WASD to move player manually

---

## 🔍 Console Commands

Open browser DevTools console (F12) and run:

```javascript
// Check if player can move
window.wasmApi.setPlayerInput(1, 0, 0, 0, 0, 0, 0, 0); // Move right
window.wasmApi.update(1/60);
console.log('Position:', window.wasmApi.exports.get_x(), window.wasmApi.exports.get_y());
// X should increase

// Check current state
window.wasmApi.getPlayerState();
// Should show: { x: 0.5, y: 0.5, vx: 0, vy: 0, ... }

// Reset if needed
window.wasmApi.exports.init_run(BigInt(Date.now()), 0);
```

---

## ✅ What Should Work Now

1. **Player spawns** at valid position (around 0.5, 0.5)
2. **WASD movement** makes player move on screen
3. **No stuck attacks** when clicking outside canvas
4. **No NaN corruption** - console will warn if detected
5. **Velocity changes** when pressing keys

---

## 🐛 If Something's Still Broken

### Player still can't move?
1. Check console for red 🔴 errors
2. Look for "Position corrupted" messages (now includes stack trace)
3. Verify velocity with: `window.wasmApi.exports.get_vel_x()`
4. Check if stuck in attack: `window.wasmApi.exports.get_player_anim_state()`

### Still seeing NaN?
- The diagnostic logs will now show exactly when/where it happens
- Check the stack trace in console
- This points to the WASM C++ code that needs fixing

### Movement sluggish?
- Check FPS: `window.DZ.flags().fps`
- Check if blocking: `window.wasmApi.exports.get_block_state()`
- Clear all inputs: `window.inputManager.clearAllInputs()`

---

## 📋 Files Changed

- ✅ `public/src/managers/unified-input-manager.js` - Fixed mouse attacks
- ✅ `public/src/demo/wasm-api.js` - Added NaN protection & diagnostics  
- ✅ `public/src/demo/main.js` - Fixed initialization
- ✅ `public/test-player-movement.html` - **NEW** test page

---

## 🎯 Expected Console Logs

```
✅ [Main] WASM initialized at 10:30:45 AM
✅ [Main] Player spawned at 0.5 0.5
✅ [Demo] ✅ Skipped validation test to preserve initialized state
✅ Input manager ready, state defaults to zero
✅ Demo: Sent initial clear input state to WASM
```

If you see these, initialization worked! 🎉

---

**Need help?** Check `MOVEMENT_FIX_COMPLETE.md` for detailed info.
