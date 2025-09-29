# Bug Fix: Player Can't Move & Spawning with Shield Held

## Issues Found

1. **Player cannot move** - Movement input is being blocked
2. **Player spawns with shield held** - The blocking state (`g_blocking`) is getting stuck/latched

## Root Cause

The blocking state (`g_blocking`) in the WASM game logic was getting stuck in an active state, which:
- Halts all player movement (line 653-654 in `game.cpp`)
- Shows the player in a blocking animation state even without block input
- Prevents normal gameplay

## Fixes Applied

### 1. C++ WASM Game Logic (`public/src/wasm/game.cpp`)

#### Fix 1.1: Safety check to clear blocking when no input
Added automatic clearing of blocking state if no block input is present:

```cpp
// SAFETY: Clear blocking state if no block input is present
// This prevents the player from getting stuck in a blocking state
if (!g_input_is_blocking && g_blocking) {
  g_blocking = 0;
}
```

**Location:** After line 485 (after stun input clearing)

#### Fix 1.2: Require both g_blocking AND input for movement halt
Changed the movement halt condition to require both the blocking state AND active input:

```cpp
// CRITICAL FIX: Only halt movement when BOTH blocking AND block input are active
// This prevents getting stuck if g_blocking gets latched without actual input
// Also don't halt if rolling or if there's no actual block input
bool haltMovement = ((g_blocking && g_input_is_blocking && !g_is_rolling) || g_player_latched);
```

**Location:** Line 651-654 (replaces the original `haltMovement` check)

### 2. JavaScript Input Manager (`public/src/input/input-manager.js`)

#### Fix 2.1: Clear WASM state on window blur
Added clearing of WASM blocking state when window loses focus:

```javascript
// Also clear WASM blocking state
if (this.wasmManager && this.wasmManager.exports && this.wasmManager.exports.set_blocking) {
  this.wasmManager.exports.set_blocking(0, 1, 0);
}
```

**Location:** Added in the `blur` event listener (line 116-119)

#### Fix 2.2: Added clearAllInputs() method
Created a comprehensive input clearing method for initialization and debugging:

```javascript
/**
 * Clear all inputs (for initialization and debugging)
 */
clearAllInputs() {
    this.inputState.lightAttack = false;
    this.inputState.heavyAttack = false;
    this.inputState.block = false;
    this.inputState.roll = false;
    this.inputState.special = false;
    this.inputState.pointer.down = false;
    this.resetMovementInput();
    
    // Also clear WASM state if available
    if (this.wasmManager && this.wasmManager.exports) {
        if (this.wasmManager.exports.set_blocking) {
            this.wasmManager.exports.set_blocking(0, 1, 0);
        }
        if (this.wasmManager.exports.clear_input_latch) {
            this.wasmManager.exports.clear_input_latch();
        }
    }
}
```

**Location:** Line 695-716

### 3. Main Game Loop (`public/src/demo/main.js`)

#### Fix 3.1: Improved block state validation
Enhanced block state checking with debug logging:

```javascript
// Get block state - ensure it's properly read from input
// IMPORTANT: Block should ONLY be active when explicitly pressed
let block = (input.block === true || input.block === 1) ? 1 : 0;

// DEBUG: If block is somehow active without input, clear it
if (block === 1 && !input.block) {
  console.warn('Block state latched without input - clearing');
  block = 0;
}
```

**Location:** Line 156-164

#### Fix 3.2: Always synchronize blocking state
Ensured blocking state is always synchronized with fallback values:

```javascript
// Synchronize blocking state explicitly to avoid latched blocks
// Always call set_blocking with current state to ensure WASM state is correct
if (wasmApi.exports?.set_blocking) {
  wasmApi.exports.set_blocking(
    block,
    inputManager.lastMovementDirection.x || 1,
    inputManager.lastMovementDirection.y || 0
  );
}
```

**Location:** Line 177-185

## Building the Fixed WASM File

To apply these fixes, you need to rebuild the WASM file:

```bash
# Make sure Emscripten SDK is installed and activated
source ./emsdk/emsdk_env.sh  # On Linux/Mac
# or
.\emsdk\emsdk_env.bat  # On Windows

# Build the production WASM
npm run wasm:build

# Or build development version with debug symbols
npm run wasm:build:dev
```

## Testing the Fix

1. **Load the game** - Player should spawn in idle state, not blocking
2. **Try moving with WASD** - Player should move freely
3. **Press Shift (block)** - Player should enter blocking stance
4. **Release Shift** - Player should return to idle/running and be able to move
5. **Try blocking while moving** - Block should activate and stop movement
6. **Release block** - Movement should resume immediately

## Additional Notes

- The JavaScript fixes will help prevent the issue even without rebuilding WASM
- The WASM fixes provide a more robust solution that prevents the state from getting stuck in the first place
- The `clearAllInputs()` method can be called from the console for debugging: `inputManager.clearAllInputs()`

## Prevention

To prevent this issue in the future:
1. Always clear input states when they're not actively being pressed
2. Don't rely solely on state flags - verify with actual input
3. Add safety checks to auto-clear stuck states
4. Test window focus/blur scenarios
5. Test gamepad connect/disconnect scenarios