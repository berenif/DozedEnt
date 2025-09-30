# 🚀 Player Animation Quick Start

**Current Status**: Week 1, Days 1-2 Complete → Moving to Days 3-5  
**Next Step**: JavaScript Integration & Visual Effects

---

## ⚡ TL;DR - Start Here

You're implementing **Warden Shoulder Bash animation** over the next 3 days.

### What's Done ✅
- ✅ WASM bash logic (PlayerManager.cpp)
- ✅ WASM exports (8 functions)
- ✅ CharacterAnimator system ready

### What's Next 🎯
- **Day 3**: Create ability manager + input handling
- **Day 4**: Add particles + VFX
- **Day 5**: Build demo page + polish

---

## 📋 Day-by-Day Checklist

### Day 3: Core Integration (4-5 hours)

#### Files to Create
1. `public/src/game/abilities/ability-manager.js` - Core coordinator
2. `public/src/animation/abilities/ability-animation-base.js` - Base class
3. `public/src/game/abilities/warden-abilities.js` - Bash logic

#### Tasks
- [ ] Create AbilityManager class (coordinator pattern)
- [ ] Create base animation class (shared utilities)
- [ ] Implement WardenAbilities input handling
- [ ] Connect WASM bash functions
- [ ] Test E key to charge bash
- [ ] Verify charge level reading from WASM

#### Success Criteria
- Holding E starts charging
- Releasing E calls WASM release_bash
- Charge level updates in real-time
- No console errors

---

### Day 4: Visual Effects (5-6 hours)

#### Files to Create
1. `public/src/vfx/abilities/ability-particles.js` - Particle system
2. `public/src/vfx/abilities/ability-camera-effects.js` - Camera shake/zoom
3. Update `warden-abilities.js` - Complete VFX integration

#### Tasks
- [ ] Create particle system (charge particles, shockwave, sparks)
- [ ] Create camera effects (shake, zoom)
- [ ] Implement charge glow effect
- [ ] Add impact shockwave
- [ ] Add hit sparks
- [ ] Test particle spawn rates
- [ ] Verify camera shake on impact

#### Success Criteria
- Charge particles appear while holding E
- Orange/yellow glow scales with charge
- Impact creates shockwave ring
- Screen shakes on bash
- Particles don't cause FPS drops
- < 1ms render time for 100 particles

---

### Day 5: Demo & Polish (3-4 hours)

#### Files to Create
1. `public/demo/abilities/bash-demo.html` - Standalone demo

#### Tasks
- [ ] Create demo HTML page
- [ ] Add UI overlay (charge meter, status)
- [ ] Add performance metrics display
- [ ] Add control hints
- [ ] Polish timing and visuals
- [ ] Test on multiple browsers
- [ ] Update documentation

#### Success Criteria
- Demo runs standalone
- Charge meter fills visually
- FPS counter shows 60
- All metrics displayed
- R key resets demo
- Documentation complete

---

## 🗂️ File Locations

```
public/src/
├── game/
│   └── abilities/
│       ├── ability-manager.js          [Day 3]
│       └── warden-abilities.js         [Day 3-4]
├── animation/
│   └── abilities/
│       └── ability-animation-base.js   [Day 3]
└── vfx/
    └── abilities/
        ├── ability-particles.js        [Day 4]
        └── ability-camera-effects.js   [Day 4]

public/demo/
└── abilities/
    └── bash-demo.html                  [Day 5]
```

---

## 🎯 Code Templates

### Quick Copy-Paste Starters

#### Day 3: AbilityManager Skeleton
```javascript
export class AbilityManager {
    constructor(wasmModule, animationSystem, vfxManager) {
        this.wasm = wasmModule;
        this.abilities = new Map();
    }
    
    registerAbility(characterType, abilityInstance) {
        this.abilities.set(characterType, abilityInstance);
    }
    
    update(deltaTime, input, gameState) {
        // Update active ability
    }
}
```

#### Day 4: Particle System Skeleton
```javascript
export class AbilityParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 1000;
    }
    
    spawnChargeParticles(x, y, chargeLevel) {
        // Spawn particles
    }
    
    update(deltaTime) {
        // Update all particles
    }
    
    render(ctx, camera) {
        // Render particles
    }
}
```

---

## 🔗 Quick Links

| Need | Document | Section |
|------|----------|---------|
| **Full implementation** | [PLAYER_ANIMATION_PLAN.md](./PLAYER_ANIMATION_PLAN.md) | All |
| **Day 3 code** | [PLAYER_ANIMATION_PLAN.md](./PLAYER_ANIMATION_PLAN.md) | Phase 1: Day 3 |
| **Day 4 code** | [PLAYER_ANIMATION_PLAN.md](./PLAYER_ANIMATION_PLAN.md) | Phase 1: Day 4 |
| **Day 5 demo** | [PLAYER_ANIMATION_PLAN.md](./PLAYER_ANIMATION_PLAN.md) | Phase 1: Day 5 |
| **WASM progress** | [WEEK1_PROGRESS.md](./WEEK1_PROGRESS.md) | Days 1-2 |
| **Full roadmap** | [PLAYER_ABILITY_UPGRADE_PLAN.md](./PLAYER_ABILITY_UPGRADE_PLAN.md) | 8-week plan |
| **Animation system** | [../../ANIMATION/ANIMATION_SYSTEM_INDEX.md](../../ANIMATION/ANIMATION_SYSTEM_INDEX.md) | Core docs |

---

## ⚠️ Important Notes

### Architecture Principles
- ✅ **Visual only** - All logic stays in WASM
- ✅ **Read-only** - JavaScript reads WASM state, doesn't modify
- ✅ **Deterministic** - Same inputs = same results
- ✅ **Performance** - Target 60 FPS always

### File Size Rules
- ❌ Max 500 lines per file
- ✅ Split at 400 lines
- ✅ Single responsibility per file

### Testing Strategy
- Test after each file creation
- Use demo page for visual validation
- Check performance metrics
- Test on Chrome, Firefox, Safari

---

## 🐛 Common Issues & Solutions

### Issue: WASM functions not found
**Solution**: Check exports in `game_refactored.cpp`, rebuild WASM

### Issue: Particles causing lag
**Solution**: Reduce max particles, increase particle lifetime decay

### Issue: Camera shake too intense
**Solution**: Reduce shake intensity parameter (try 1.5 instead of 3.0)

### Issue: Charge not updating
**Solution**: Verify WASM `_get_bash_charge_level()` is called in update loop

---

## 📊 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| FPS | 60 | 30+ |
| Update time | < 2ms | < 5ms |
| Particle render | < 1ms | < 2ms |
| Memory growth | < 10MB/session | < 50MB |
| Particle count | < 500 active | < 1000 |

---

## 🎮 Test Checklist

After each day, verify:

### Day 3 Tests
- [ ] Hold E, charge starts
- [ ] Release E, bash executes
- [ ] WASM functions called
- [ ] No console errors
- [ ] Input responsive

### Day 4 Tests
- [ ] Charge particles spawn
- [ ] Glow effect visible
- [ ] Shockwave on impact
- [ ] Camera shakes
- [ ] FPS stays at 60

### Day 5 Tests
- [ ] Demo runs standalone
- [ ] UI updates correctly
- [ ] Metrics accurate
- [ ] Reset works (R key)
- [ ] Cross-browser compatible

---

## 🚀 Getting Started Right Now

### Step 1: Create Directories
```bash
mkdir -p public/src/game/abilities
mkdir -p public/src/animation/abilities
mkdir -p public/src/vfx/abilities
mkdir -p public/demo/abilities
```

### Step 2: Create First File
Open `public/src/game/abilities/ability-manager.js` and start with the skeleton from [PLAYER_ANIMATION_PLAN.md § Day 3](./PLAYER_ANIMATION_PLAN.md#1-ability-manager-publicsrcgameabilitiesability-managerjs)

### Step 3: Follow the Plan
Work through Day 3 tasks one by one, testing after each file creation.

---

## 📞 Need Help?

- **Build errors**: Check file paths, verify imports
- **WASM errors**: Rebuild WASM, check exports
- **Visual issues**: Check camera coordinates, particle rendering
- **Performance**: Use browser DevTools profiler

---

**Ready? Start with Day 3, File 1: `ability-manager.js`**

Open the [full plan](./PLAYER_ANIMATION_PLAN.md) and begin! 🎬

