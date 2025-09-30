# 🐺 Wolf System Quick Start

**Status**: ✅ Phases 1, 2, and 5 Complete (70%)  
**You Can Now**: Spawn and see wolves on screen!

---

## 🚀 Test Wolves in 30 Seconds

### Option 1: Test Demo (Recommended)
```bash
# Open this file in your browser:
public/demos/test-wolf-rendering.html
```

**Controls**:
- Click **"Spawn 1 Wolf"** - Adds single wolf
- Click **"Spawn 5 Wolves"** - Adds 5 wolves
- Click **"Clear All"** - Removes all wolves
- Toggle **Health Bars** - Show/hide health
- Toggle **State Labels** - Show/hide AI state

### Option 2: Main Demo Console
```javascript
// Open public/index.html, then in console:

// Spawn 5 wolves
wasmApi.exports.spawn_wolves(5);

// Spawn single wolf at position
wasmApi.exports.spawn_wolf(0.7, 0.3, 0); // x, y, type

// Check wolf count
wasmApi.exports.get_enemy_count();

// Damage a wolf (index, damage, knockbackX, knockbackY)
wasmApi.exports.damage_wolf(0, 25, 0.1, 0.1);

// Clear all wolves
wasmApi.exports.clear_enemies();
```

---

## 📊 What's Working

### ✅ Complete Features
| Feature | Status | Description |
|---------|--------|-------------|
| **Wolf Spawning** | ✅ | Spawn at any position with any type |
| **Basic AI** | ✅ | 12-state AI (Idle, Patrol, Alert, Approach, etc.) |
| **Movement** | ✅ | Move towards player, circle strafe |
| **Rendering** | ✅ | Full procedural wolf drawing |
| **Animations** | ✅ | Legs, tail, bounce, state-reactive |
| **Health System** | ✅ | Damage, health bars, death |
| **Debug Tools** | ✅ | Health bars, state labels, FPS counter |

### ⏳ Partially Working
| Feature | Status | What's Needed |
|---------|--------|---------------|
| **Combat** | 🟡 50% | Hit detection needs CombatManager |
| **Pack Behavior** | 🟡 10% | Plans defined, need implementation |
| **Adaptive AI** | 🟡 30% | Framework exists, needs tuning |

### 🔴 Not Yet Implemented
- Pack coordination (flanking, ambush, etc.)
- Advanced pack tactics
- Terrain awareness
- Sound effects

---

## 🎯 Next Steps (Choose One)

### Option 1: Combat (2-3 hours) - RECOMMENDED ⭐
**Goal**: Make wolves dangerous!

**Tasks**:
1. Integrate with CombatManager
2. Implement wolf → player hit detection
3. Add player block/roll detection
4. Test combat balance
5. Fine-tune damage values

**Why First**: Wolves are visible, now make them fight!

### Option 2: Pack Behavior (6-8 hours)
**Goal**: Coordinated attacks

**Tasks**:
1. Implement 7 pack plans (Ambush, Pincer, etc.)
2. Multi-wolf coordination
3. Pack formations
4. Visual feedback for tactics

**Why Second**: More complex, builds on combat

### Option 3: Testing & Polish (2-3 hours)
**Goal**: Ensure quality

**Tasks**:
1. Unit tests for WolfManager
2. Determinism tests
3. Performance tests (8+ wolves)
4. Fine-tune AI parameters

**Why Later**: Good after combat works

---

## 📁 Key Files

### WASM (C++)
```
public/src/wasm/
├── managers/
│   ├── WolfManager.h          (267 lines) - Wolf logic
│   └── WolfManager.cpp        (682 lines) - Implementation
└── coordinators/
    ├── GameCoordinator.h      - Integration
    └── GameCoordinator.cpp    - Update loop
```

### JavaScript (Rendering)
```
public/src/
├── renderer/
│   └── WolfRenderer.js        (496 lines) - Procedural rendering
└── demo/
    ├── renderer.js            - Wolf integration
    └── main.js                - Game loop
```

### Demos
```
public/demos/
└── test-wolf-rendering.html   - Wolf spawn/test UI
```

---

## 🎨 Wolf Types

| Type | Size | Color | Speed | Health | Role |
|------|------|-------|-------|--------|------|
| **Normal** | 40px | Brown | 1.0x | 100 | Standard |
| **Alpha** | 50px | Dark Brown | 0.9x | 150 | Leader |
| **Scout** | 35px | Light Gray | 1.3x | 70 | Fast Recon |
| **Hunter** | 45px | Dark Gray | 1.1x | 120 | High DPS |
| **Omega** | 38px | Medium Gray | 0.95x | 90 | Support |

---

## 🎮 AI States

| State | ID | Behavior |
|-------|----|----|
| Idle | 0 | Stand still, look around |
| Patrol | 1 | Move in patterns |
| Investigate | 2 | Check disturbance |
| Alert | 3 | Face player, ready |
| Approach | 4 | Move towards player |
| Strafe | 5 | Circle around player |
| Attack | 6 | Three-phase attack |
| Retreat | 7 | Move away (low health) |
| Recover | 8 | Stunned/recovering |
| Flee | 9 | Run away (very low health) |
| Ambush | 10 | Wait in hiding |
| Flank | 11 | Attack from side |

---

## 🔧 WASM API Reference

### Spawning
```cpp
spawn_wolves(count)           // Spawn N wolves
spawn_wolf(x, y, type)        // Spawn at position
clear_enemies()               // Remove all wolves
```

### Queries
```cpp
get_enemy_count()             // Total wolves
get_enemy_x(index)            // Position X (0-1)
get_enemy_y(index)            // Position Y (0-1)
get_enemy_type(index)         // Type (0-4)
get_enemy_state(index)        // AI state (0-11)
get_enemy_role(index)         // Pack role
get_enemy_fatigue(index)      // Fatigue (0-1)
```

### Actions
```cpp
damage_wolf(index, dmg, kbx, kby)  // Apply damage
remove_wolf(index)                 // Delete wolf
```

### Pack Info
```cpp
get_pack_morale(index)        // Pack morale
get_pack_plan(index)          // Current pack plan
```

---

## 🐛 Troubleshooting

### Wolves not visible?
1. Check `get_enemy_count()` returns > 0
2. Verify `spawn_wolves()` was called
3. Check camera position (should be near 0.5, 0.5)
4. Open browser console for errors

### Wolves not moving?
1. Verify WASM `update()` is being called
2. Check wolves are in active AI state (not Idle)
3. Ensure player position is valid
4. Check `get_enemy_state()` to see current state

### Performance issues?
1. Check FPS counter (should be 60)
2. Reduce wolf count (try 1-5 first)
3. Disable debug labels if needed
4. Check browser console for errors

---

## 📚 Documentation

- [**Phase 5 Details**](./PHASE_5_RENDERING.md) - Complete rendering guide
- [**Implementation Status**](./WOLF_IMPLEMENTATION_STATUS.md) - Overall progress
- [**Wolf AI Spec**](../../AI/WOLF_AI.md) - Detailed behavior
- [**WASM API**](../../BUILD/API.md) - Complete API reference

---

## 🎉 Success!

**You've completed 70% of wolf implementation!**

✅ Wolves spawn  
✅ Wolves have AI  
✅ Wolves move  
✅ Wolves render  
✅ Wolves animate  

**Next**: Make them fight! (Phase 3 - Combat Integration)

