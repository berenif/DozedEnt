# 🛡️ Bash Ability Test - Quick Start

## 🚀 Running the Tests

### Test 1: Standalone Simulation (Instant)
No build required - just open in your browser:
```
public/bash-ability-test.html
```

### Test 2: WASM-Integrated (Real Implementation) ⭐
```bash
# Already built! Just serve and test:
npm run serve:dev

# Then open: http://localhost:3000/bash-ability-wasm-test.html

# Note: Must be served via HTTP server (not file://)
# WASM requires proper CORS and MIME types
```

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move player (green) |
| **E (Hold)** | Charge bash |
| **E (Release)** | Execute bash |
| **Arrow Keys** | Move target (orange) |
| **Left Click** | Place target at cursor |

## 🎯 Quick Tests

1. **Full Charge Test**
   - Click "⚡ Test Full Charge"
   - Watch charge bar fill to 100%
   - Release E to bash

2. **Collision Test**
   - Click "📍 Move Target In Front"
   - Target moves in front of player
   - Hold E for 1 second
   - Release E
   - **💥 COLLISION!** should appear

3. **Multiple Targets**
   - Click "🎯 Spawn Multiple Targets"
   - 3 orange targets appear
   - Position yourself and bash through them

## 📊 What to Watch For

### ✅ Success Indicators:
- Charge bar fills smoothly (0-100%)
- Green glow appears while charging
- Orange hitbox appears on bash execution
- **💥 COLLISION DETECTED!** message on hit
- Target count increments
- Stamina refunds on successful hits

### ❌ Issues to Report:
- Player doesn't move
- Charge bar stuck at 0%
- No collision detection
- Hitbox doesn't appear
- NaN values in diagnostics

## 🔍 Diagnostics

The test provides real-time monitoring:
- Player position, velocity, facing
- Bash state (Idle/Charging/Active)
- Hitbox position and radius
- Collision status
- Timestamped event log

## 📈 Next Steps

After testing, you can:
1. Integrate with enemy AI (wolves)
2. Add VFX and particle effects
3. Implement Raider and Kensei abilities
4. Connect to multiplayer system

## 🐛 Troubleshooting

**WASM test won't load?**
- **Check if served via HTTP** - WASM won't load from `file://` URLs
- Run `npm run serve:dev` to start local server
- Check if `public/wasm/game.wasm` exists (34 KB)
- Run `npm run wasm:build` if missing
- Check browser console for errors

**No collision detected?**

1. **Check exports in console:**
   ```javascript
   // Open browser console and type:
   console.log('Bash exports:', {
     start: typeof wasmExports.start_charging_bash,
     release: typeof wasmExports.release_bash,
     getCharge: typeof wasmExports.get_bash_charge_level,
     checkCollision: typeof wasmExports.check_bash_collision
   });
   ```

2. **Manual collision test:**
   ```javascript
   // In browser console:
   wasmExports.start_charging_bash();
   setTimeout(() => wasmExports.release_bash(), 1000);
   setTimeout(() => {
     console.log('Bash active:', wasmExports.is_bash_active());
     console.log('Hitbox:', {
       x: wasmExports.get_bash_hitbox_x(),
       y: wasmExports.get_bash_hitbox_y(),
       radius: wasmExports.get_bash_hitbox_radius(),
       active: wasmExports.is_bash_hitbox_active()
     });
   }, 1010);
   ```

3. **Check if bash is active:**
   - Ensure bash is fully charged (hold E for 1 second)
   - Target must be within hitbox radius (0.05 world units)
   - Use "Move Target In Front" button to guarantee collision

**Performance issues?**
- Check FPS in diagnostics
- Close other browser tabs
- Try standalone test first

## 📚 Documentation

See full implementation details:
- `GUIDELINES/PROGRESS/playerl/BASH_ABILITY_INTEGRATION_SUMMARY.md`
- `GUIDELINES/PROGRESS/playerl/PLAYER_ABILITY_UPGRADE_PLAN.md`

---

**Have fun testing! 🎮**

