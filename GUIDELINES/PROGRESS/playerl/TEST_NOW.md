# 🎮 Test the Bash Ability NOW!

## Quick Test Guide (5 minutes)

### 1. Open the Game
```
URL: http://localhost:3000/public/demo.html
```
(Dev server is already running)

### 2. Test Basic Bash
1. **Hold `E` key** for 1 second
2. **Watch for**: Orange particles appearing
3. **Release `E`**
4. **Should see**: 
   - Shockwave burst
   - Yellow sparks
   - Camera shake
   - Screen zoom pulse

### 3. Test Max Charge
1. **Hold `E` key** for 2+ seconds
2. **Watch for**: "⚡ MAX CHARGE" flashing in console
3. **Release `E`**
4. **Should see**:
   - HUGE shockwave
   - Lots of sparks
   - Strong camera shake
   - Bigger zoom effect

### 4. Check Console
Open F12 DevTools and look for:
```
✅ [Main] WASM initialized
✨ VFX Manager initialized
🛡️ Initialized Warden abilities
```

### 5. Test Debug Commands
In console, try:
```javascript
// Check systems
window.DZ.vfxManager
window.DZ.abilityManager

// Watch particles
window.DZ.vfxManager.particles.particles.length
```

## ✅ What Should Work

- [ ] Charging: Hold E → orange particles appear
- [ ] Max charge: Console shows "⚡ MAX CHARGE"
- [ ] Impact: Release E → shockwave + sparks
- [ ] Camera: Screen shakes and zooms
- [ ] Performance: Smooth 60 FPS
- [ ] Cleanup: Particles disappear after 1s

## 🐛 If Something's Wrong

### No Particles?
```javascript
// Check particle system
window.DZ.vfxManager.particles
// Should show ParticleSystem with methods
```

### No Camera Shake?
```javascript
// Check camera effects
window.DZ.vfxManager.camera.shakeIntensity
// Should be > 0 right after bash
```

### Console Errors?
- Check for red error messages
- Look for "WASM not initialized" warnings
- Check "Network" tab for failed loads

## 📊 Expected Performance

- **FPS**: 60 (check with browser DevTools)
- **Particle Count**: 5-50 active at once
- **Frame Time**: < 16ms
- **No lag** during bash execution

## 🎯 Success Criteria

If you can:
1. ✅ Hold E and see particles
2. ✅ Release E and see shockwave
3. ✅ Feel the camera shake
4. ✅ Maintain 60 FPS

**Then Week 1 is COMPLETE!** 🎉

---

## 📝 Report Issues

If anything doesn't work:
1. Check console for errors
2. Note what you were doing
3. Check if particles spawn at all
4. Verify WASM loaded correctly

## 🎊 If Everything Works

Congratulations! The bash ability is fully functional!

Next steps:
- Fine-tune particle spawn rates (optional)
- Adjust camera shake intensity (optional)
- Test on different screen sizes (optional)
- Move to Week 2: Raider Execution Axe

---

**Go test it now!** 🚀

