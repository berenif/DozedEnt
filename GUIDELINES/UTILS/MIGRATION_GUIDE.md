# DozedEnt Migration Guide

**Version:** 1.0  
**Status:** Production  
**Last Updated:** January 2025

---

## 📋 Table of Contents
- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Physics System Migration](#physics-system-migration)
- [API Changes](#api-changes)
- [WASM Loading Migration](#wasm-loading-migration)
- [Combat System Updates](#combat-system-updates)
- [Enemy AI Changes](#enemy-ai-changes)
- [Demo Migration](#demo-migration)
- [Testing Migration](#testing-migration)

---

## Overview

This guide helps migrate existing DozedEnt code to the latest version. It covers breaking changes, deprecated APIs, and migration strategies for major system updates.

### Migration Priority
1. **Critical (🔴):** Breaks existing functionality, must update
2. **Important (🟡):** Deprecated but still works, should update soon
3. **Optional (🟢):** Quality-of-life improvements, update when convenient

---

## Breaking Changes

### Physics System Integration (v1.0 - January 2025) 🔴

**What Changed:**
- Physics system now integrated into core game loop
- New WASM exports for physics operations
- Enemy bodies require physics body creation

**Migration:**

#### Before:
```javascript
// Old: Direct position setting
function spawnEnemy(x, y) {
  const index = exports.spawn_wolf(x, y);
  // Enemy position set directly
}

function moveEnemy(index, x, y) {
  // Position updated via game state only
}
```

#### After:
```javascript
// New: Create physics body
function spawnEnemy(x, y) {
  const index = exports.spawn_wolf(x, y);
  
  // Create physics body for enemy
  const bodyId = exports.create_enemy_body(
    index,  // enemy index
    x, y,   // initial position
    70.0,   // mass (kg)
    0.35    // radius
  );
  
  if (bodyId === 0) {
    console.error('Failed to create enemy physics body');
  }
  
  return index;
}

function moveEnemy(index, x, y) {
  // Use physics forces instead of direct position
  const targetX = x;
  const targetY = y;
  exports.apply_attack_lunge(index, targetX, targetY, 20.0);
}
```

**Why:**
- Physics-driven movement is more natural and reactive
- Enables knockback, collisions, and environmental forces
- Maintains determinism across clients

**Checklist:**
- [ ] Replace direct position setting with physics forces
- [ ] Create physics bodies for all dynamic entities
- [ ] Destroy physics bodies when entities removed
- [ ] Sync positions after physics updates

---

### Player Position Synchronization (v1.0) 🔴

**What Changed:**
- Player position must be synced from physics after updates
- New `sync_player_position_from_physics()` export
- Physics position is now authoritative

**Migration:**

#### Before:
```javascript
function update(dt) {
  exports.update(dt);
  
  // Read position directly
  const playerX = exports.get_x();
  const playerY = exports.get_y();
  
  renderPlayer(playerX, playerY);
}
```

#### After:
```javascript
function update(dt) {
  exports.update(dt);
  
  // Sync physics position to game state
  exports.sync_player_position_from_physics();
  
  // Now read position (reflects physics)
  const playerX = exports.get_x();
  const playerY = exports.get_y();
  
  renderPlayer(playerX, playerY);
}
```

**Why:**
- Physics system is source of truth for positions
- Prevents desync between physics and gameplay
- Enables physics-driven player movement (knockback, forces)

**Checklist:**
- [ ] Call `sync_player_position_from_physics()` after `update()`
- [ ] Update all rendering code to use synced positions
- [ ] Test knockback and collision responses

---

## API Changes

### Deprecated: `get_wolf_*` → `get_enemy_*` 🟡

**What Changed:**
- Generic `get_enemy_*` functions replace `get_wolf_*`
- Old functions still work but are aliases
- Prepares for multiple enemy types

**Migration:**

#### Before:
```javascript
const count = exports.get_wolf_count();
for (let i = 0; i < count; i++) {
  const x = exports.get_wolf_x(i);
  const y = exports.get_wolf_y(i);
  const health = exports.get_wolf_health(i);
  const state = exports.get_wolf_state(i);
}
```

#### After:
```javascript
const count = exports.get_enemy_count();
for (let i = 0; i < count; i++) {
  const x = exports.get_enemy_x(i);
  const y = exports.get_enemy_y(i);
  const type = exports.get_enemy_type(i);
  const state = exports.get_enemy_state(i);
  
  // Render based on type
  if (type === ENEMY_TYPE_WOLF) {
    const health = exports.get_wolf_health(i);
    renderWolf(x, y, health, state);
  }
}
```

**Why:**
- Supports multiple enemy types (wolves, bears, bandits, etc.)
- Cleaner API surface
- Forward-compatible

**Checklist:**
- [ ] Replace `get_wolf_count()` with `get_enemy_count()`
- [ ] Replace `get_wolf_x/y()` with `get_enemy_x/y()`
- [ ] Use `get_enemy_type()` to differentiate enemies
- [ ] Keep wolf-specific calls (`get_wolf_health()`) for now

---

### New: Velocity Getters 🟢

**Added:** `get_enemy_vx()` and `get_enemy_vy()`

**Usage:**
```javascript
const vx = exports.get_enemy_vx(enemyIndex);
const vy = exports.get_enemy_vy(enemyIndex);

// Calculate speed for animation
const speed = Math.sqrt(vx * vx + vy * vy);

// Adjust animation speed based on movement
const animSpeed = Math.max(0.5, speed / 10.0);
renderEnemyWithSpeed(x, y, animSpeed);
```

**Why:**
- Enables velocity-based animations (motion blur, dust trails)
- Better visual feedback for physics forces
- Supports advanced rendering techniques

---

## WASM Loading Migration

### Old Loader → `wasm.js` 🟡

**What Changed:**
- Simplified WASM loading utility
- Automatic WASI support
- Better error handling

**Migration:**

#### Before:
```javascript
// Manual fetch + instantiate
fetch('./game.wasm')
  .then(response => response.arrayBuffer())
  .then(bytes => WebAssembly.instantiate(bytes, imports))
  .then(({ instance }) => {
    wasmExports = instance.exports;
    wasmMemory = instance.exports.memory;
  });
```

#### After:
```javascript
import { loadWasm } from './utils/wasm.js';

const { exports, memory } = await loadWasm('./wasm/game.wasm');
wasmExports = exports;
wasmMemory = memory;
```

**Why:**
- Less boilerplate
- Handles WASI automatically
- Consistent error messages
- Supports module caching

**Checklist:**
- [ ] Import `loadWasm` from `./utils/wasm.js`
- [ ] Replace manual fetch/instantiate with `loadWasm()`
- [ ] Update error handling (loadWasm throws descriptive errors)

---

### Production Apps: Use `WasmManager` 🟢

**When to Migrate:**
- Large applications with complex state
- Need automatic state batching
- Want performance optimizations

**Migration:**

#### Before:
```javascript
// Manual state reads every frame
function render() {
  const x = exports.get_x();
  const y = exports.get_y();
  const hp = exports.get_hp();
  const stamina = exports.get_stamina();
  const phase = exports.get_phase();
  // ... 20 more calls
}
```

#### After:
```javascript
import { WasmManager } from './utils/wasm-manager.js';

const manager = new WasmManager();
await manager.initialize();

function render() {
  // Single batched call
  const state = manager.getPlayerState();
  
  // All properties cached
  console.log(state.x, state.y, state.hp, state.stamina);
}
```

**Benefits:**
- 80% fewer WASM boundary crosses
- Automatic caching and invalidation
- Better performance profiling
- Cleaner code

---

## Combat System Updates

### Attack Handling Changes 🔴

**What Changed:**
- `handle_incoming_attack()` now includes attacker position
- Automatic knockback direction calculation
- Integrated with physics system

**Migration:**

#### Before:
```javascript
// Old: No attacker position
function onEnemyAttack(damage) {
  exports.handle_incoming_attack(damage);
  
  // Manual knockback
  applyKnockback(playerX - enemyX, playerY - enemyY, damage);
}
```

#### After:
```javascript
// New: Attacker position included
function onEnemyAttack(damage, attackerX, attackerY) {
  exports.handle_incoming_attack(damage, attackerX, attackerY);
  
  // Knockback applied automatically by physics system
}
```

**Why:**
- Physics system handles knockback direction
- Consistent across all attacks
- Enables physics-based hit reactions

---

### Ability Cooldowns 🟡

**What Changed:**
- Explicit cooldown getters for each ability
- Replaces generic `get_ability_cooldown(id)`

**Migration:**

#### Before:
```javascript
const bashCooldown = exports.get_ability_cooldown(ABILITY_BASH);
const chargeCooldown = exports.get_ability_cooldown(ABILITY_CHARGE);
```

#### After:
```javascript
// Bash ability
const bashCooldown = exports.get_bash_charge_level();

// Berserker charge
const chargeDuration = exports.get_berserker_charge_duration();

// Flow dash
const dashProgress = exports.get_dash_progress();
```

**Why:**
- Ability-specific state (not just cooldown)
- Better type safety
- More descriptive API

---

## Enemy AI Changes

### Pack Roles 🟡

**What Changed:**
- Added `get_enemy_role()` export
- Role affects AI behavior
- Used for pack coordination

**New API:**
```javascript
const role = exports.get_enemy_role(enemyIndex);

switch (role) {
  case 0: // None
    renderNormalWolf(x, y);
    break;
  case 1: // Alpha
    renderAlphaWolf(x, y); // Larger, more aggressive
    break;
  case 2: // Beta
    renderBetaWolf(x, y);  // Standard pack member
    break;
  case 3: // Scout
    renderScoutWolf(x, y); // Smaller, faster
    break;
}
```

**Use Cases:**
- Visual differentiation
- UI indicators ("Alpha Wolf")
- Player strategy (kill scouts first)

---

### Fatigue System 🟢

**Added:** `get_enemy_fatigue()` export

**Usage:**
```javascript
const fatigue = exports.get_enemy_fatigue(enemyIndex);

// Adjust rendering based on fatigue
if (fatigue > 0.7) {
  // Show heavy breathing particles
  // Slower animation speed
  renderTiredWolf(x, y, fatigue);
}
```

**Why:**
- Visual feedback for AI state
- Adds character to enemies
- Helps players predict AI behavior

---

## Demo Migration

### HTML Template Updates 🟡

**What Changed:**
- New canvas sizing conventions
- Standardized loading indicators
- Consistent error display

**Migration:**

#### Before:
```html
<canvas id="canvas" width="800" height="600"></canvas>
<div id="loading">Loading...</div>
```

#### After:
```html
<style>
  canvas {
    width: 100%;
    height: 100vh;
    background: #1a1a2e;
  }
  
  #loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-family: monospace;
  }
</style>

<canvas id="canvas"></canvas>
<div id="loading">
  <div class="spinner"></div>
  <p>Loading WASM module...</p>
</div>
```

**Why:**
- Responsive canvas sizing
- Better loading UX
- Consistent across all demos

---

### Demo WASM Path 🔴

**What Changed:**
- Demos now load from `../../wasm/game.wasm`
- Standardized path structure
- Cache busting with query params

**Migration:**

#### Before:
```javascript
// Varied paths
const { exports } = await loadWasm('../game.wasm');
const { exports } = await loadWasm('./wasm/game.wasm');
const { exports } = await loadWasm('game.wasm');
```

#### After:
```javascript
// Consistent path from demos/
const { exports } = await loadWasm('../../wasm/game.wasm');
```

**Directory Structure:**
```
public/
├── demos/
│   ├── physics/
│   │   └── physics-demo.html  → ../../wasm/game.wasm
│   └── abilities/
│       └── ability-demo.html  → ../../wasm/game.wasm
└── wasm/
    └── game.wasm
```

**Checklist:**
- [ ] Update all demo WASM paths to `../../wasm/game.wasm`
- [ ] Test each demo loads correctly
- [ ] Add cache busting if needed: `game.wasm?v=${timestamp}`

---

## Testing Migration

### Golden Test Updates 🟡

**What Changed:**
- Physics integration changes determinism slightly
- New baseline required for physics-enabled builds
- Extended test duration (60s → 90s)

**Migration:**

```javascript
// Old golden baseline
const expectedEndState = {
  playerX: 0.523,
  playerY: 0.411,
  hp: 0.65,
  stamina: 0.82
};

// New golden baseline (with physics)
const expectedEndState = {
  playerX: 0.521,     // Slightly different due to physics
  playerY: 0.409,
  hp: 0.65,
  stamina: 0.82,
  physicsPlayerX: 0.521,  // NEW: Physics position
  physicsPlayerY: 0.409
};
```

**Regenerate Baseline:**
```bash
npm run test:golden -- --regenerate
```

**Why:**
- Physics introduces minor position variations
- Need to validate physics positions separately
- Longer test catches physics drift

---

### Performance Test Thresholds 🟡

**What Changed:**
- Physics adds ~0.5-1ms per frame
- Updated performance budgets
- New physics-specific metrics

**Migration:**

```javascript
// Old thresholds
const MAX_FRAME_TIME_MS = 5.0;

// New thresholds
const MAX_FRAME_TIME_MS = 6.0;           // +1ms for physics
const MAX_PHYSICS_TIME_MS = 2.0;         // NEW: Physics budget
const MAX_BODIES = 100;                  // NEW: Body count target
```

**New Assertions:**
```javascript
const physicsTime = exports.get_physics_perf_ms();
expect(physicsTime).to.be.below(MAX_PHYSICS_TIME_MS);

const bodyCount = exports.get_enemy_body_count();
expect(bodyCount).to.be.at.most(MAX_BODIES);
```

---

## Deprecated Features

### Scheduled for Removal (v2.0)

| Feature | Status | Replacement | Timeline |
|---------|--------|-------------|----------|
| `get_wolf_x/y()` | Deprecated | `get_enemy_x/y()` | Remove v2.0 |
| Direct position setting | Deprecated | Physics forces | Remove v2.0 |
| `init_run()` without BigInt | Deprecated | Always use BigInt | Remove v1.5 |
| Manual WASM instantiation | Discouraged | Use `loadWasm()` | N/A |

---

## Migration Checklist

### High Priority (Do First)
- [ ] Update physics body creation for enemies
- [ ] Add `sync_player_position_from_physics()` calls
- [ ] Update `handle_incoming_attack()` calls with attacker position
- [ ] Fix demo WASM paths to `../../wasm/game.wasm`
- [ ] Regenerate golden test baselines

### Medium Priority (Do Soon)
- [ ] Migrate `get_wolf_*()` to `get_enemy_*()`
- [ ] Switch to `loadWasm()` utility
- [ ] Update combat system to use physics forces
- [ ] Add velocity-based animations

### Low Priority (Optional)
- [ ] Migrate to `WasmManager` for large apps
- [ ] Add role-based enemy rendering
- [ ] Implement fatigue visual feedback
- [ ] Update HTML templates to new standard

---

## Troubleshooting

### "Physics body creation failed"

**Cause:** Max bodies reached (256 limit)

**Solution:**
```javascript
// Check body count before creating
const currentCount = exports.get_enemy_body_count();
if (currentCount >= 250) {
  console.warn('Approaching max physics bodies');
  // Clean up distant/dead enemies
  exports.clear_all_enemy_bodies();
}
```

---

### "Position desync after update"

**Cause:** Missing `sync_player_position_from_physics()`

**Solution:**
```javascript
function update(dt) {
  exports.update(dt);
  exports.sync_player_position_from_physics(); // ADD THIS
  const x = exports.get_x();
  const y = exports.get_y();
}
```

---

### "Demos not loading WASM"

**Cause:** Incorrect relative path

**Solution:**
- From `public/demos/subdir/demo.html` → `../../wasm/game.wasm`
- From `public/demo.html` → `./wasm/game.wasm`
- Check console for 404 errors

---

### "Golden tests failing"

**Cause:** Physics integration changed deterministic output

**Solution:**
```bash
# Regenerate baseline with new physics system
npm run test:golden -- --regenerate

# Verify determinism with multiple runs
npm run test:golden
npm run test:golden
npm run test:golden
# All should pass with identical output
```

---

## Getting Help

### Documentation
- [WASM API Reference](../BUILD/API.md) - Complete API surface
- [Physics API](../SYSTEMS/PHYSICS_API.md) - Physics-specific functions
- [Demo Development](../WASM/DEMO_DEVELOPMENT.md) - Creating demos

### Testing
- Run `npm run test:unit` to validate changes
- Run `npm run test:golden` to check determinism
- Use `exports.get_physics_perf_ms()` to profile

### Community
- Check existing demos in `public/demos/` for examples
- Review `GUIDELINES/IMPLEMENTATION_STATUS_SUMMARY.md` for current implementation status
- See `WASM_EXPORTS.json` for available functions

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintained by:** DozedEnt Development Team

