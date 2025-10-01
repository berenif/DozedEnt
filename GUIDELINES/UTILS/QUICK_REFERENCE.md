# 🚀 Quick Reference Guide for AI Agents

## 🎯 Essential Information at a Glance

### 🏗️ Architecture Rules (CRITICAL)
1. **ALL game logic in WASM** - No gameplay decisions in JavaScript
2. **JavaScript only for**: Rendering, input forwarding, networking
3. **Deterministic execution** - Same seed + inputs = same result
4. **State flow**: Input → WASM → State Update → JS reads for rendering

### 🎮 Core Systems Overview

#### Combat System (3-Button Layout)
```
J: Left Hand  (press=Light, hold=Heavy)
L: Right Hand (press=Light, hold=Heavy)
K: Special

Block/Parry:
- Without shield: Hold J+L = Block; perfect-timing press = Parry (120 ms)
- With shield: Hold J = Block; perfect-timing tap = Parry (no damage)

Roll:
- K + Direction = Roll (300ms i-frames + 200ms slide)
```

#### Game Loop (8 Phases)
```
0: Explore  → Room navigation with hazards
1: Fight    → Combat with wolves, stamina management  
2: Choose   → Three-option selection (Safe/Spicy/Weird)
3: PowerUp  → Apply choice effects to player stats
4: Risk     → Push-your-luck with curses
5: Escalate → Increasing difficulty with minibosses
6: CashOut  → Shop system with dual currency
7: Reset    → Clean restart with adjustments
```

---

## 🔧 WASM API Quick Reference

### Core Functions (Most Used)
```cpp
// Game Loop
init_run(seed, start_weapon)     // Initialize new run
update(dirX, dirY, isRolling, dt) // Main tick (deterministic)
reset_run(new_seed)              // Instant restart

// Player State  
get_x(), get_y()                 // Position (0..1)
get_stamina()                    // Stamina (0..1)
get_phase()                      // Current phase (0-7)

// Combat
on_attack()                      // Execute attack
on_roll_start()                  // Start dodge roll
set_blocking(on, faceX, faceY, time) // Block state
handle_incoming_attack(...)      // Process incoming damage

// Choices (Phase 2)
get_choice_count()               // Number of choices
get_choice_id(i), get_choice_type(i) // Choice data
commit_choice(choice_id)         // Apply selection
```

### Phase-Specific Functions
```cpp
// Risk Phase (4)
get_curse_count(), get_curse_type(i)
get_risk_multiplier(), escape_risk()

// Escalate Phase (5)  
get_escalation_level(), get_miniboss_active()
damage_miniboss(amount)

// CashOut Phase (6)
get_gold(), get_essence()
buy_shop_item(index), buy_heal()
```

---

## ✅ Quick Validation Checklists

### Before Any Code Change
- [ ] Will this affect WASM/JS boundary?
- [ ] Does this maintain deterministic behavior?
- [ ] Is all game logic staying in WASM?
- [ ] Are we only reading state snapshots in JS?

### Combat System Changes
- [ ] Timing windows match spec (120ms parry, 300ms i-frames)
- [ ] Input buffer working (120ms)
- [ ] State machines are deterministic
- [ ] No gameplay logic in animation code

### AI/Enemy Changes  
- [ ] AI logic implemented in WASM
- [ ] Behavior is deterministic (no Math.random())
- [ ] State transitions are predictable
- [ ] Performance impact measured

### Core Loop Changes
- [ ] All 8 phases still functional
- [ ] Phase transitions work correctly
- [ ] Choice system generates properly
- [ ] Deterministic across clients

---

## 🚨 Common Pitfalls & Solutions

### ❌ Don't Do This
```javascript
// WRONG: Game logic in JavaScript
if (player.health <= 0) {
    gameState = 'game_over';
    showGameOverScreen();
}

// WRONG: Using Math.random() for gameplay
const damage = Math.random() * 50;

// WRONG: Modifying game state in JS
player.x += velocity * deltaTime;
```

### ✅ Do This Instead
```javascript
// CORRECT: Read WASM state, render only
const playerHealth = wasmModule.get_health();
if (playerHealth <= 0) {
    showGameOverScreen(); // UI only
}

// CORRECT: Let WASM handle all randomness
wasmModule.init_run(deterministicSeed, startWeapon);

// CORRECT: WASM updates state, JS reads it
wasmModule.update(inputX, inputY, isRolling, deltaTime);
const newX = wasmModule.get_x();
renderPlayer(newX, wasmModule.get_y());
```

---

## 📂 File Organization Logic

### When to Use Which File
- **Architecture questions**: `AGENTS.md` (main reference)
- **WASM API reference**: **`BUILD/API.md`** (canonical function signatures)
- **Development workflow**: **`BUILD/DEVELOPMENT_WORKFLOW.md`** (complete dev cycle)
- **Testing procedures**: **`BUILD/TESTING.md`** (current framework, 54 tests)
- **Combat implementation**: `FIGHT/3-BUTTON_COMBAT_IMPLEMENTATION.md`
- **AI behavior**: `AI/ENEMY_AI.md` or `AI/WOLF_AI.md`
- **Animation issues**: `ANIMATION/PLAYER_ANIMATIONS.md`
- **Core loop validation**: `GAME/CORE_LOOP_CHECKLIST.md`
- **Build problems**: `UTILS/BUILD_INSTRUCTIONS.md`

### File Naming Pattern Recognition
- `*_IMPLEMENTATION.md` = Complete implementation guides
- `*_SYSTEM.md` = System architecture overviews  
- `*_CHECKLIST.md` = Validation and testing lists
- `*_INDEX.md` = Navigation and quick reference
- **`AI/*.md`** = Enemy and AI behavior
- **`ANIMATION/*.md`** = Animation systems
- **`BUILD/*.md`** = **Core development documentation** (API, workflow, testing)
- **`GAME/*.md`** = Core gameplay mechanics
- **`UTILS/*.md`** = Build, deploy, and development tools

---

## 🎯 Performance Targets & Metrics

### Critical Performance Numbers
- **Frame time**: ≤ 16ms (60 FPS)
- **WASM memory**: < 32MB total
- **Update function**: < 1ms typical, < 20ms max
- **Binary size**: ~43KB WASM module
- **Network sync**: < 100ms latency

### Optimization Priorities
1. **WASM/JS boundary calls** - Minimize frequency
2. **State export batching** - Read all needed state once per frame  
3. **Memory allocations** - Avoid during gameplay
4. **Deterministic operations** - No floating point precision issues

---

## 🧪 Testing Quick Commands

```bash
# End-to-end tests (Playwright)
npm test

# Unit tests (mocha)
npm run test:unit

# Coverage for unit tests
npm run test:coverage

# CI check: unit + coverage thresholds
npm run test:all
```

### Key Test Validations
- **Golden test**: 60s input script produces identical end-state
- **Pity timer**: Forced bad streak flips to guarantee
- **Performance**: No GC churn, memory within limits
- **Cross-platform**: Windows/Mac/Linux compatibility
- **Network sync**: Multiplayer synchronization

---

## 📦 Externalized Balance Data

- JSON data under `data/balance/` drives gameplay constants in WASM.
- Generator outputs `src/wasm/generated/balance_data.h` consumed by headers.

Commands:

```bash
npm run balance:gen         # Generate balance header
npm run wasm:build          # Generate + build WASM (prod)
```

Primary files:
- `data/balance/player.json`
- `data/balance/enemies.json`

Include sites:
- `src/wasm/internal_core.h`
- `src/wasm/enemies.h`

Workflow: Edit JSON → generate → build → test.

---

*This quick reference is designed for AI agents to rapidly understand and validate changes to the DozedEnt game framework.*
