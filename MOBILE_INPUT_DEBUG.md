# Mobile Joystick Input Debugging Guide

## Issue
Mobile device joystick input not moving the player character.

## Debugging Steps

### 1. Enable Debug Mode
Open browser console and run:
```javascript
DZ.enableInputDebug()
```

This will log:
- Touch events (touch start, move, end)
- Joystick position calculations
- Input sent to WASM

### 2. Check Mobile Controls Visibility
```javascript
// Check if mobile controls are visible
const mobileControls = document.getElementById('mobile-controls');
console.log('Mobile controls display:', mobileControls.style.display);
console.log('Mobile controls visible:', mobileControls.offsetParent !== null);
```

### 3. Test Touch Detection
```javascript
// Add temporary touch logger
document.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  console.log('Touch on:', el.id || el.className, 'at', touch.clientX, touch.clientY);
}, { passive: false });
```

### 4. Check Input State
```javascript
// Check current input state
console.log('Input state:', DZ.inputManager.getInputState());

// Watch input state in real-time
setInterval(() => {
  const state = DZ.inputManager.getInputState();
  if (state.direction.x !== 0 || state.direction.y !== 0) {
    console.log('Direction:', state.direction);
  }
}, 100);
```

### 5. Test WASM Input Manually
```javascript
// Manually send input to WASM to verify it's working
DZ.setInput(1, 0, 0, 0, 0, 0, 0, 0);  // Move right
setTimeout(() => {
  console.log('Player pos after manual input:', DZ.state());
  DZ.setInput(0, 0, 0, 0, 0, 0, 0, 0);  // Stop
}, 1000);
```

### 6. Check WASM Ready State
```javascript
// Check if WASM is ready to receive input
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
console.log('WASM ready:', inputMgr.syncState.wasmReady);
console.log('WASM exports available:', typeof inputMgr.wasmManager?.exports?.set_player_input);
```

### 7. Inspect Joystick State
```javascript
// Check joystick internal state
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
console.log('Joystick state:', inputMgr.joystickState);
console.log('Active touches:', inputMgr.activeTouches);
```

## Common Issues and Fixes

### Issue 1: Mobile Controls Not Visible
**Symptom:** Joystick HTML elements exist but not visible
**Fix:**
```javascript
const mobileControls = document.getElementById('mobile-controls');
mobileControls.style.display = 'flex';
```

### Issue 2: Touch Events Not Firing
**Symptom:** No console logs when touching joystick with debug enabled
**Possible causes:**
- Z-index issue: Another element is on top
- Pointer-events: CSS blocking touch events
- Touch event listeners not attached

**Fix:**
```javascript
// Check z-index
const joystick = document.getElementById('joystick-base');
console.log('Joystick z-index:', window.getComputedStyle(joystick).zIndex);
console.log('Joystick pointer-events:', window.getComputedStyle(joystick).pointerEvents);
```

### Issue 3: Input Not Reaching WASM
**Symptom:** Touch events fire, joystick state updates, but player doesn't move
**Possible causes:**
- WASM not ready
- Input queue not flushing
- Validation failing

**Fix:**
```javascript
// Force flush input queue
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
inputMgr.inputState.direction.x = 1;
inputMgr.inputState.direction.y = 0;
inputMgr.queueInputForWasm();
inputMgr.flushInputQueue();
```

### Issue 4: Deadzone Too Large
**Symptom:** Small joystick movements don't register
**Fix:**
```javascript
// Reduce deadzone (default 0.15)
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
// Note: Deadzone is hardcoded in handleJoystickMove, would need code change
```

### Issue 5: Joystick Center Position Wrong
**Symptom:** Joystick knob doesn't follow finger correctly
**Fix:**
```javascript
// Recalculate joystick center
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
const base = document.getElementById('joystick-base');
const rect = base.getBoundingClientRect();
inputMgr.joystickState.center = {
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2
};
inputMgr.joystickState.maxDistance = rect.width / 2 - 20;
console.log('Updated joystick center:', inputMgr.joystickState.center);
```

## Expected Behavior

When working correctly, you should see:
1. Touch on joystick: `🕹️ Joystick touch detected`
2. As you move: `🕹️ Joystick: (0.75, 0.00)` (example values)
3. Input sent to WASM: `📡 Sending to WASM: dir=(0.75, 0.00)`
4. Player position changing in debug overlay

## Quick Fix Command

If all else fails, try this full reset:
```javascript
// Full reset and test
DZ.enableInputDebug();
const inputMgr = DZ.inputManager.unifiedManager || DZ.inputManager;
inputMgr.clearAllInputs();
setTimeout(() => {
  // Force manual movement test
  DZ.setInput(1, 0, 0, 0, 0, 0, 0, 0);
  console.log('Testing manual input - player should move right');
}, 500);
```

## Mobile Testing

### On Device
1. Connect device to computer
2. Enable remote debugging (Chrome: `chrome://inspect`, Safari: Develop menu)
3. Open console and run debug commands above

### On Desktop Browser (Simulated)
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M or Cmd+Shift+M)
3. Select a mobile device from dropdown
4. Refresh page
5. Click and drag on joystick (simulates touch)

## Architecture Overview

```
Touch Event (finger on joystick)
    ↓
UnifiedInputManager.handleTouchStart()
    ↓
UnifiedInputManager.handleJoystickMove()
    - Calculates normalized X/Y
    - Applies deadzone
    - Updates inputState.direction
    ↓
UnifiedInputManager.queueInputForWasm()
    - Adds to input queue
    ↓
UnifiedInputManager.flushInputQueue()
    - Validates input
    - Calls wasmManager.exports.set_player_input()
    ↓
WASM game logic processes movement
    ↓
Player character moves
```

## Next Steps

If none of the above helps, check:
1. Browser console for errors
2. Network tab for WASM loading issues
3. Whether keyboard controls work (to isolate touch vs general input issues)

## Contact

If you've tried all the above and it's still not working, provide:
1. Browser and device info
2. Console output with debug mode enabled
3. Screenshot of joystick area
4. Result of `DZ.inputManager.getInputState()` while touching joystick