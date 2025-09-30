# 🎯 Day 5 Checklist: Integration & Polish

## ✅ Integration Tasks

### Main Game Loop Integration
- [ ] Import VFX systems in `main.js`
- [ ] Initialize `AbilityParticleSystem`
- [ ] Initialize `AbilityCameraEffects` with renderer camera
- [ ] Create `vfxManager` object
- [ ] Pass `vfxManager` to `AbilityManager`
- [ ] Update VFX in game loop (particles + camera)
- [ ] Render abilities after player
- [ ] Test with dev server

### Camera Access
- [ ] Verify `renderer.camera` is accessible
- [ ] Add camera getter if needed
- [ ] Test camera shake effects
- [ ] Test zoom effects

## 🧪 Testing Tasks

### Functionality Tests
- [ ] Bash charges when holding E
- [ ] Charge level increases (0-100%)
- [ ] Orange/yellow particles spawn
- [ ] Glow effect scales with charge
- [ ] Release executes bash
- [ ] Shockwave appears on release
- [ ] Screen shakes on impact
- [ ] Camera zooms (1.0 → 1.2 → 1.0)
- [ ] No console errors

### Performance Tests
- [ ] 60 FPS maintained
- [ ] Particle count stays under 500
- [ ] Update time < 2ms
- [ ] Render time < 3ms
- [ ] No memory leaks after 5 minutes
- [ ] No frame drops during bash

### Cross-Browser Tests
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari (if available)

## 🎨 Polish Tasks

### Particle Tuning
- [ ] **Charge particles**: Adjust spawn rate (currently 50ms)
- [ ] **Charge particles**: Tune count (currently 20 per spawn)
- [ ] **Charge particles**: Adjust lifetime (currently 0.5-0.8s)
- [ ] **Impact shockwave**: Adjust radius (currently 60-100px)
- [ ] **Impact shockwave**: Adjust duration (currently 0.3s)
- [ ] **Hit sparks**: Adjust count (currently 15-20)
- [ ] **Hit sparks**: Adjust velocity (currently 100-200 units)

### Camera Effects Tuning
- [ ] **Charge shake**: Adjust intensity (currently 0.5)
- [ ] **Impact shake**: Adjust intensity (currently 3.0 * charge)
- [ ] **Impact shake**: Adjust duration (currently 0.3s)
- [ ] **Zoom timing**: Adjust in/out timing (currently 0.1s/0.3s)
- [ ] **Zoom amount**: Adjust zoom level (currently 1.2x)

### Glow Effect Tuning
- [ ] **Glow size**: Adjust radius (currently 30px * charge)
- [ ] **Glow alpha**: Adjust opacity (currently 0.5 * charge)
- [ ] **Glow blur**: Adjust blur amount (currently 10px)

## 📝 Documentation Tasks

### Update Progress Docs
- [ ] Update `WEEK1_PROGRESS.md` with Day 4 completion
- [ ] Add Day 5 section to `WEEK1_PROGRESS.md`
- [ ] Update `README.md` status (80% → 100%)
- [ ] Add performance metrics achieved
- [ ] Document any issues encountered

### Create Final Summary
- [ ] List all files created/modified
- [ ] Document final file sizes
- [ ] Record performance metrics
- [ ] Note any deviations from plan
- [ ] Add screenshots/GIFs (optional)

## 🎯 Success Criteria

### Must Have
- [ ] Bash charges and executes correctly
- [ ] All VFX appear as designed
- [ ] 60 FPS maintained
- [ ] No linter errors
- [ ] No console errors

### Nice to Have
- [ ] VFX feels impactful and satisfying
- [ ] Camera effects enhance gameplay
- [ ] Particles look polished
- [ ] Timing feels right

## 🐛 Known Issues to Address

- [ ] Check if camera shake affects UI elements
- [ ] Verify particle cleanup on game reset
- [ ] Test with multiple bashes in quick succession
- [ ] Check for particle pool exhaustion
- [ ] Verify camera effects reset on death/restart

## 📊 Performance Targets

| Metric | Target | Current | Pass? |
|--------|--------|---------|-------|
| FPS | 60 | - | ☐ |
| Particle Update | < 0.5ms | - | ☐ |
| Particle Render | < 1ms | - | ☐ |
| Camera Update | < 0.1ms | - | ☐ |
| Total VFX | < 2ms | - | ☐ |
| Max Particles | < 500 | - | ☐ |

## ✅ Day 5 Complete When:

- [ ] All integration tasks complete
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] Ready for Week 2 (Raider Charge)

---

**Estimated Time**: 3-4 hours  
**Priority**: HIGH - Completes Week 1  
**Next**: Week 2 - Raider Berserker Charge

