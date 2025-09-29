# Testing Player Movement Fix

## How to Test

1. **Start the game:**
   ```bash
   npm run serve:public
   ```

2. **Open browser to:** http://localhost:8080

3. **Test basic movement:**
   - Press W → Player should move up
   - Press A → Player should move left
   - Press S → Player should move down
   - Press D → Player should move right

4. **Test diagonal movement:**
   - Press W+D → Player should move diagonally up-right
   - Press W+A → Player should move diagonally up-left
   - Press S+D → Player should move diagonally down-right
   - Press S+A → Player should move diagonally down-left

5. **Test key release behavior:**
   - Press W+D (moving diagonally up-right)
   - Release W (should continue moving right only)
   - Release D (should stop)

6. **Test opposite keys:**
   - Press W (moving up)
   - Press S while holding W (should cancel out, no movement or move down depending on order)

## Enable Debug Mode

Open browser console and run:
```javascript
window.DZ.enableInputDebug()
```

This will show input events in the console, including:
- Key press/release events
- Movement direction updates
- Input sent to WASM

## Expected Behavior

✅ Player should move in the direction of pressed keys
✅ Multiple keys should work simultaneously (e.g., W+D for diagonal movement)
✅ Releasing one key while holding others should not stop all movement
✅ Player should stop when all movement keys are released

## Debug Output Example

With debug mode enabled, you should see:
```
🎮 Input: move-up = true
🎮 Movement updated: (0, -1)
🎮 Input: move-right = true
🎮 Movement updated: (1, -1)
🎮 Input: move-up = false
🎮 Movement updated: (1, 0)
```

## Troubleshooting

If movement still doesn't work:

1. Check console for errors
2. Verify WASM is loaded: Check for "WASM input system ready" message
3. Check input state: `window.DZ.inputManager.getInputState()`
4. Verify no other input managers are conflicting