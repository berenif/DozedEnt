# ⚡ Physics Integration Quick Start

## 📄 What Was Created

A comprehensive implementation guide for integrating physics-driven combat into DozedEnt while maintaining WASM-first architecture and deterministic multiplayer.

### Main Document
**[PHYSICS_INTEGRATION_IMPLEMENTATION_GUIDE.md](./PHYSICS_INTEGRATION_IMPLEMENTATION_GUIDE.md)** - Complete technical specifications with:
- All design decisions documented
- Full code templates for all components
- File-by-file implementation checklist
- Performance targets and optimization strategies
- Success criteria for each milestone

### Supporting Documents Updated
- **[src/PHYSICS_PROGRESS.md](../../src/PHYSICS_PROGRESS.md)** - Progress tracker with Phase 0.5 added
- **[src/FEATURES_TO_SOURCE_MAP.md](../../src/FEATURES_TO_SOURCE_MAP.md)** - Source file mapping updated

---

## 🎯 Implementation Approach

### **Walking Skeleton Strategy** - Chosen Approach

**Week 1**: Foundation + Knockback Demo
- Fixed-point math library (16.16 format)
- Basic PhysicsManager
- Extend CombatManager with knockback
- Visual demo in browser

**Week 2**: Physics Barrels
- PhysicsBarrel entity
- Collision detection
- Momentum damage
- Emergent gameplay demo

**Month 1+**: Solidify foundations after validating approach

### Key Architectural Decisions

| Decision | Choice Made |
|----------|-------------|
| **Starting Point** | Hybrid - structure + quick win demo |
| **Combat Integration** | Extend existing CombatManager |
| **Build System** | Add physics incrementally |
| **Entity Refactoring** | Refactor player to entity with physics |
| **Testing** | Visual HTML demos for feedback |
| **Determinism** | Fixed-point from day one (avoid refactoring) |
| **File Organization** | Create directories incrementally |

---

## 📋 File Creation Order

### Week 1: Knockback Demo
```
✅ Step 1: Create core physics headers
   - src/physics/FixedPoint.h
   - src/physics/PhysicsTypes.h
   - src/physics/PhysicsManager.h

✅ Step 2: Implement physics manager
   - src/physics/PhysicsManager.cpp

✅ Step 3: Extend combat system
   - src/managers/CombatManager.h (add methods)
   - src/managers/CombatManager.cpp (implement knockback)

✅ Step 4: Build system integration
   - src/CMakeLists.txt (add physics sources)

✅ Step 5: WASM exports
   - src/game_refactored.cpp (add physics exports)

✅ Step 6: Visual demo
   - public/demos/physics-knockback-demo.html
```

### Week 2: Barrel Demo
```
✅ Step 7: Barrel entity
   - src/entities/PhysicsBarrel.h
   - src/entities/PhysicsBarrel.cpp

✅ Step 8: Barrel WASM exports
   - src/game_refactored.cpp (add barrel functions)

✅ Step 9: Barrel demo
   - public/demos/physics-barrel-demo.html
```

---

## 🚀 How to Start Development

### Option 1: Guided Implementation
Follow the implementation guide section by section:
1. Open `PHYSICS_INTEGRATION_IMPLEMENTATION_GUIDE.md`
2. Copy code templates from "Week 1: Foundation + Knockback Demo"
3. Create files in order listed
4. Test after each component

### Option 2: Jump to Code Templates
All code is provided in the guide:
- **Fixed-Point Math**: Lines 150-220
- **Physics Types**: Lines 222-280
- **Physics Manager**: Lines 282-340
- **Combat Extension**: Lines 342-380
- **WASM Exports**: Lines 420-490
- **Demo HTML**: Lines 492-610

### Option 3: Use TODO List
12 tasks created tracking each milestone:
- `physics_01` through `physics_12`
- Check progress: See TODO panel in Cursor
- Mark complete as you build

---

## ✅ Success Criteria

### Week 1 Complete
- [ ] Fixed-point math working (test: 2+2=4 in fixed-point)
- [ ] PhysicsManager updates bodies
- [ ] Knockback visually working in demo
- [ ] Player bounces back when hit
- [ ] Attack lunges move player forward
- [ ] Demo runs in browser without errors

### Week 2 Complete
- [ ] 5 barrels spawn on screen
- [ ] Player collision pushes barrels
- [ ] Thrown barrels fly realistically
- [ ] Barrel hits deal damage
- [ ] 60fps with all objects active

---

## 🎮 Demo Testing

### Knockback Demo Controls
- **Arrow Keys / WASD**: Change facing direction
- **Space**: Apply attack lunge
- **Buttons**: Test directional knockback
- **Visual**: See velocity vectors in real-time

### Barrel Demo Controls
- **Click**: Spawn barrel at cursor
- **E Key**: Throw nearest barrel
- **Mouse Drag**: Aim throw direction
- **Numbers 1-5**: Spawn multiple barrels

---

## 📊 Performance Targets

```
Frame Budget: 16.67ms (60 FPS)
├─ Physics:    5ms ✅ Target for Phase 0.5
├─ Rendering:  6ms
├─ Logic:      3ms
└─ Reserve:  2.67ms
```

**Phase 0.5 Optimizations**:
- Sphere-only collision (fast)
- No spatial grid (< 10 objects)
- Simple integration (no rotation)
- Sleep disabled (all objects active)

---

## 🔗 Quick Links

### Planning Documents
- [Physics Integration Implementation Guide](./PHYSICS_INTEGRATION_IMPLEMENTATION_GUIDE.md) - **START HERE**
- [Physics Progress Tracker](../../src/PHYSICS_PROGRESS.md)
- [Features to Source Mapping](../../src/FEATURES_TO_SOURCE_MAP.md)

### Reference Documents (Future Phases)
- [Physics Gap Analysis](../SYSTEMS/PHYSICS_GAP_ANALYSIS.md)
- [Physics First Implementation Plan](./PHYSICS_FIRST_IMPLEMENTATION_PLAN.md)
- [Physics Planning Complete](./PHYSICS_PLANNING_COMPLETE.md)

### Architecture Guides
- [Agent Development Guide](../AGENTS.md) - WASM-first architecture principles
- [Combat System](../FIGHT/COMBAT_SYSTEM.md)
- [Attack Animation](../FIGHT/ATTACK_ANIMATION_ENHANCEMENT.md)

---

## ⚠️ Critical Notes

### Fixed-Point Math
- **2-3x slower than float** - Only use for determinism-critical objects
- Player physics: **Fixed-point** ✅
- Barrels (Phase 0.5): **Fixed-point** ✅
- Props (Phase 2): **Float** (emergent tier)

### Determinism
```cpp
// This MUST be true after 60 seconds of identical inputs:
sim1.get_body(0)->position.x.raw == sim2.get_body(0)->position.x.raw
```

### WASM-First Rule
- **ALL physics logic in C++**
- JavaScript only reads results for rendering
- No gameplay decisions in JS

---

## 🆘 If You Get Stuck

### Build Errors
1. Check `CMakeLists.txt` includes all new files
2. Verify `#include` paths are correct
3. Run: `npm run wasm:build:dev` for debug symbols

### Runtime Errors
1. Check WASM exports match JavaScript calls
2. Verify `physics_initialize()` called before use
3. Use browser console for error messages

### Determinism Failures
1. Check all physics uses fixed-point (not float)
2. Verify no `Math.random()` in physics code
3. Test with same seed on two simulations

### Performance Issues
1. Profile with browser DevTools
2. Check body count (< 10 for Phase 0.5)
3. Verify sleep system working (future phase)

---

## 📞 Next Steps

1. **Read**: Open `PHYSICS_INTEGRATION_IMPLEMENTATION_GUIDE.md`
2. **Code**: Start with `src/physics/FixedPoint.h`
3. **Test**: Build after each file
4. **Demo**: Run `physics-knockback-demo.html` when Week 1 done
5. **Iterate**: Refine based on visual feedback

**Good luck! The walking skeleton approach ensures fast feedback and early validation.** 🚀

