# 🎮 Agent Development Guide (WASM-First Architecture)

## 📋 Table of Contents
- [Quick Start](#quick-start-5-minute-setup)
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Decision Trees](#decision-trees)
- [Guideline Cross-Reference Index](#guideline-cross-reference-index)
- [WASM API Reference](#wasm-api-reference)
- [JavaScript Integration](#javascript-integration)
- [Common Tasks Cookbook](#common-tasks-cookbook)
- [File Location Quick Reference](#file-location-quick-reference)
- [Build Process](#build-process)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance Metrics](#performance-metrics)
- [Testing Framework](#testing-framework)
- [Glossary](#glossary)

## 🚀 Quick Start (5-Minute Setup)

### Your First Code Change

1. **Clone and Build**
```bash
git clone https://github.com/BerenIf/DozedEnt.git
cd DozedEnt
npm install
npm run wasm:build
```

2. **Run Local Development**
```bash
npm run serve
# Open http://localhost:8080/public/
```

3. **Make a Simple Change**
- **WASM (C++)**: Edit `public/src/wasm/game_refactored.cpp`
  - Rebuild: `npm run wasm:build`
- **JavaScript**: Edit `public/src/game/` files
  - No rebuild needed, just refresh browser
- **Balance Data**: Edit `data/balance/player.json`
  - Regenerate: `node ./tools/scripts/generate-balance.cjs`
  - Rebuild WASM: `npm run wasm:build`

### First-Time Agent Checklist
- [ ] Read this document (AGENTS.md) - You are here! ✓
- [ ] Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization
- [ ] Check [ADR documents](./ADR/) - Recent architectural decisions
- [ ] Run tests: `npm run test:unit` - Verify setup
- [ ] Try a small change - Modify player speed in `data/balance/player.json`

### Key Files to Know
| File | Purpose | When to Edit |
|------|---------|--------------|
| `public/src/wasm/game_refactored.cpp` | Main game logic | Gameplay rules, state |
| `public/src/wasm/managers/*.cpp` | Domain-specific logic | Wolves, combat, physics |
| `public/src/game/loop/MVPLoop.js` | Game loop | Rendering, updates |
| `data/balance/player.json` | Player stats | Balancing, tuning |
| `WASM_EXPORTS.json` | Available WASM functions | Reference |

## Overview

This repository implements a **WebAssembly-first roguelike game architecture** where all game logic resides in WASM (C++) modules, while JavaScript handles only rendering, input capture, and networking. The system features a complete core loop implementation with 8 phases, advanced enemy AI, comprehensive animation systems, character abilities, and robust multiplayer infrastructure.

## Architecture Principles

### 🏗️ Core Design Philosophy
- **WASM-First**: All game logic, state management, and calculations in WebAssembly
- **JavaScript as UI Layer**: JS handles only rendering, input forwarding, and network communication
- **Deterministic Execution**: Identical inputs produce identical outputs across all clients
- **Performance Optimized**: Native-speed game logic with minimal JS overhead

### 🔑 Golden Rules
1. **Keep ALL game logic in WASM** - No gameplay decisions in JavaScript
2. **UI reads state snapshots** - JS only visualizes WASM-exported data
3. **Inputs flow through WASM** - All player actions processed by WASM first
4. **Deterministic by design** - Same seed + inputs = same outcome everywhere
5. **Code Quality Standards** - Always follow ESLint rules and maintain clean code

### ✅ Enforced Rules (One‑Shot Plan Workflow)
- One‑Shot plan required before implementation
  - Use template: `.cursor/plans/ONE-SHOT-PLAN-TEMPLATE.md`
  - Store as `.cursor/plans/s-<short-id>.plan.md` and keep ≤ 200 lines
- File/function/class size limits
  - Max file: 500 lines (split at ~400)
  - Max function: 30–40 lines; prefer early returns
  - Classes >200 lines must be split into focused helpers
- Responsibility and patterns
  - One concern per file; use Manager (business), ViewModel (UI state), Coordinator (flow)
  - JS in `public/src/` only; no gameplay logic in JS
- WASM exports and build gates
  - When adding exports: mark `EMSCRIPTEN_KEEPALIVE`, update build scripts EXPORTED_FUNCTIONS, regenerate `WASM_EXPORTS.json`
  - Post‑build must pass export verification (e.g., `npm run wasm:verify:skeleton` or feature‑specific verify)
- Feature flags and safe fallback
  - Guard with URL param + localStorage; if exports missing or non‑finite data, disable feature without throwing
- Performance budgets (hard)
  - JS render ≤ 0.5 ms; WASM update ≤ 1.0 ms; snapshot ≤ 0.3 ms
  - Batch WASM reads once per frame; prefer a single bulk call
- Determinism constraints
  - No `Math.random()` in gameplay; no JS physics; clamp dt on WASM side as needed
- Testing requirements
  - Unit: state contract/shape; Coordinator integration
  - Node smoke: instantiate WASM and call key exports
  - Visual (when applicable): golden frame tolerance on demo
- CI gates (fail the build if any fails)
  - Missing required exports; lints; file >500 lines; tests; export manifest generation

### 🚨 Common Pitfalls (Updated January 2025)

> **Note**: These pitfalls are addressed in detail in our Architecture Decision Records. See [ADR-001](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md), [ADR-002](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md), and [ADR-003](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md) for the architectural decisions and migration paths.

#### ❌ Don't: Duplicate Physics in JavaScript
JavaScript physics will conflict with WASM. Only read positions from WASM.
```javascript
// WRONG - Duplicate physics simulation
this.velocity.x += this.acceleration.x * deltaTime;
this.position.x += this.velocity.x * deltaTime;

// CORRECT - Read from WASM only
this.position.x = this.wasmModule.get_physics_player_x();
this.velocity.x = this.wasmModule.get_physics_player_vel_x();
```

**See**: [ADR-001: Remove JavaScript Physics](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md) for complete rationale and implementation details.

#### ❌ Don't: Use Math.random() for Gameplay
Breaks determinism and multiplayer sync. Use WASM RNG or WasmRNG facade.
```javascript
// WRONG - Non-deterministic
const damage = Math.random() * 10;

// CORRECT - Deterministic
const damage = this.wasmModule.get_random_float() * 10;
// OR for UI-only randomness:
import { uiRNG } from '../utils/wasm-rng.js';
const uiElement = uiRNG.choose(colors);
```

**See**: [ADR-002: Math.random() Elimination](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md) for complete rationale and linting rules.

#### ❌ Don't: Create Multiple State Managers
WASM is source of truth. JavaScript only reads state.
```javascript
// WRONG - Multiple state managers
class GameStateManager { getPlayerHealth() { return this.health; } }
class PlayerStateManager { getPlayerHealth() { return this.health; } }

// CORRECT - Single source of truth
import { WasmCoreState } from '../wasm/WasmCoreState.js';
const wasmState = new WasmCoreState(wasmModule);
const health = wasmState.getPlayerState().health;
```

**See**: [ADR-003: State Manager Consolidation](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md) for migration guide and implementation patterns.

#### ❌ Don't: Build God Classes (>500 lines)
Violates single responsibility principle. Split into focused modules.
```javascript
// WRONG - NetworkManager (487 lines)
class NetworkManager {
  // Connection management
  // Room management  
  // Chat system
  // Matchmaking
  // Diagnostics
}

// CORRECT - Focused modules
class ConnectionManager { /* ~150 lines */ }
class RoomManager { /* ~150 lines */ }
class MessageManager { /* ~150 lines */ }
class NetworkCoordinator { /* ~100 lines */ }
```

## 🌲 Decision Trees

### "Where Should This Code Live?"

```
START: I need to implement [feature]
│
├─ Does it affect game state or rules?
│  ├─ YES → Must be in WASM (C++)
│  │      Location: public/src/wasm/
│  │      Files: managers/, coordinators/, or game_refactored.cpp
│  │
│  └─ NO → Continue...
│
├─ Is it visual-only (particles, UI, animations)?
│  ├─ YES → JavaScript
│  │      Location: public/src/animation/, public/src/renderer/
│  │
│  └─ NO → Continue...
│
├─ Is it input handling?
│  ├─ YES → JavaScript (capture) + WASM (processing)
│  │      JS Location: public/src/game/input/
│  │      WASM: set_player_input() in game_refactored.cpp
│  │
│  └─ NO → Continue...
│
└─ Is it networking/multiplayer?
   └─ YES → JavaScript (P2P layer) + WASM (state sync)
         JS Location: public/src/networking/
         WASM: Deterministic state exports
```

### "Which Animation System Should I Use?"

```
START: I need animations for [entity]
│
├─ Is this for the player character?
│  ├─ YES → Top-down gameplay?
│  │      ├─ YES → PlayerPhysicsAnimator 
│  │      │        Location: public/src/animation/player/physics/
│  │      │        Use case: Performance-critical, mobile
│  │      │
│  │      └─ NO → PlayerProceduralAnimator
│  │               Location: public/src/animation/player/procedural/
│  │               Use case: Side-view, detailed motion
│  │
│  └─ NO → Is it for wolves/enemies?
│         └─ YES → WolfAnimationSystem
│                  Location: public/src/animation/enemy/wolf-animation.js
│
└─ Custom entity? → Extend AnimationBase
                    Location: public/src/animation/system/
```

### "How Do I Debug This?"

```
START: Something is broken
│
├─ Is it a WASM crash or error?
│  ├─ YES → Build with debug flags
│  │      Command: npm run wasm:build:dev
│  │      Check: Browser console for WASM errors
│  │      Tool: Use em++ --profiling flag for detailed traces
│  │
│  └─ NO → Continue...
│
├─ Is it a state/logic issue?
│  ├─ YES → Check determinism
│  │      Test: Run with fixed seed (init_run(12345, 0))
│  │      Record: Log all inputs and state changes
│  │      Replay: Verify same inputs produce same state
│  │
│  └─ NO → Continue...
│
├─ Is it a visual/rendering issue?
│  ├─ YES → Check rendering pipeline
│  │      Debug: Enable debug overlays
│  │      Check: Animation mode ('physics' vs 'procedural')
│  │      Verify: State reading from WASM (not stale data)
│  │
│  └─ NO → Continue...
│
└─ Is it a multiplayer desync?
   └─ YES → Verify determinism
         Check: No Math.random() in gameplay
         Check: No JS physics simulation
         Check: Same WASM version on all clients
         Tool: Enable network debug logs
```

## Guideline Cross-Reference Index

Use these documents when working on agents, enemies, animations, core loop, and multiplayer systems. Keep gameplay logic in WASM and use JS only for rendering, inputs, and networking.

### Architecture Decision Records (ADRs)
- [ADR-001: Remove JavaScript Physics](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md) — **Critical**: Eliminates duplicate physics simulation in JS; WASM PhysicsManager is single source of truth
- [ADR-002: Math.random() Elimination](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md) — **Critical**: Removes non-deterministic RNG; all randomness must come from WASM
- [ADR-003: State Manager Consolidation](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md) — **Critical**: Consolidates state management; WASM owns all gameplay state, JS reads snapshots only

### AI
- [Enemy AI Template](./AI/ENEMY_TEMPLATE.md) — Baseline rules, state machine structure, properties, combat patterns, animation integration, performance, and testing checklist for all enemies.
- [Enemy AI (System Overview)](./AI/ENEMY_AI.md) — Modular behavior system: states, attributes, memory, adaptive difficulty, terrain awareness, roles, comms, and performance.
- [Wolf AI](./AI/WOLF_AI.md) — Concrete predator/pack AI: coordinated plans, adaptive tuning, emotions, memory, terrain exploitation, and future roadmap.

### Animation
- [Animation System Index](./ANIMATION/ANIMATION_SYSTEM_INDEX.md) — Dual animation system overview, architecture, components, quick start guide, API, and integration examples.
- [Top-Down Physics Animation](./ANIMATION/TOPDOWN_PHYSICS_ANIMATION.md) — **NEW!** Lightweight physics-based animation for top-down gameplay with 120 FPS effective physics.
- [Procedural Animation](./ANIMATION/HUMAN_MOTION_IMPROVEMENTS.md) — Biomechanically accurate human motion with IK solvers and multi-segment spine.
- [Player Animations](./ANIMATION/PLAYER_ANIMATIONS.md) — States, transitions, effects, input mapping, API, performance considerations, and troubleshooting.

### Game Core Loop
- [Game Features Summary](./GAME/GAME_FEATURES_SUMMARY.md) — End-to-end features for all phases (Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset), exports, testing, and performance.
- [Core Loop Checklist](./GAME/CORE_LOOP_CHECKLIST.md) — Per-feature validation for determinism, WASM-only logic, API constraints, phase-specific criteria, and tests.

### Multiplayer (Lobby & Rooms)
- [Lobby System](./MULTIPLAYER/LOBBY_SYSTEM.md) — Enhanced lobby UX, matchmaking, chat, analytics, events, config, and performance.
- [Room System](./MULTIPLAYER/ROOM_SYSTEM.md) — Host-authoritative rooms, migration, WASM integration, state sync, events, and performance tips.

### Build, Deploy, and Testing
- [Development Workflow](./BUILD/DEVELOPMENT_WORKFLOW.md) — Complete development cycle guide for AI agents.
- [WASM Feature Implementation Guide](./WASM/DEMO_DEVELOPMENT.md) — Complete reference for implementing features, creating demos, and WASM setup.
- [WASM API Reference](./BUILD/API.md) — **Canonical API surface** - definitive function signatures and behavior.
- [Testing Framework](./BUILD/TESTING.md) — Current testing infrastructure (54+ tests, 5.15% coverage, 680% improvement).
- [Build Instructions](./UTILS/BUILD_INSTRUCTIONS.md) — Build scripts, outputs, demos, troubleshooting, and performance tips.
- [Balance Data Guide](./UTILS/BALANCE_DATA.md) — Externalized constants, JSON schema, generator, workflow.
- [Deploy to GitHub Pages](./UTILS/DEPLOY_GITHUB_PAGES.md) — CI/CD workflow, setup, custom domains, troubleshooting.
- [Project Structure](./PROJECT_STRUCTURE.md) — Complete project layout and file organization guide.

## WASM API Reference

> **Note**: The table below summarizes common APIs. For the **complete canonical API surface**, see **[BUILD/API.md](./BUILD/API.md)**. This section provides overview examples - always consult BUILD/API.md for the definitive function signatures and behavior.

### 📦 Current API Surface (80+ Functions)
#### ⚙️ Core Simulation Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `init_run(seed, start_weapon)` | Initialize new run | `seed`: RNG seed<br>`start_weapon`: weapon ID | `void` |
| `reset_run(new_seed)` | Instant restart with new seed | `new_seed`: RNG seed | `void` |
| `update(delta_time)` | Main game tick (deterministic) | `delta_time`: frame time | `void` |
| `set_player_input(input_x, input_y, rolling, jumping, light_attack, heavy_attack, blocking, special)` | Set player input state | Input flags (0 or 1) | `void` |
| `get_x()` | Get player X position | None | `float` (0..1) |
| `get_y()` | Get player Y position | None | `float` (0..1) |
| `get_vel_x()` | Get player X velocity | None | `float` |
| `get_vel_y()` | Get player Y velocity | None | `float` |
| `get_stamina()` | Get current stamina | None | `float` (0..1) |
| `get_hp()` | Get current health | None | `float` (0..1) |
| `get_phase()` | Get current game phase | None | Phase enum (0-7) |
| `get_is_grounded()` | Check if player is grounded | None | `1` if grounded, `0` otherwise |
| `get_jump_count()` | Get current jump count | None | `int` |
| `get_is_wall_sliding()` | Check if wall sliding | None | `1` if sliding, `0` otherwise |

*See [GAME/GAME_FEATURES_SUMMARY.md](./GAME/GAME_FEATURES_SUMMARY.md) for complete API documentation.*

##### 📊 Game Phases (Complete Implementation)
```cpp
enum Phase {
    Explore  = 0,  // Room navigation with deterministic hazards
    Fight    = 1,  // Combat with wolves, stamina management
    Choose   = 2,  // Three-option selection (Safe/Spicy/Weird)
    PowerUp  = 3,  // Apply choice effects to player stats
    Risk     = 4,  // Push-your-luck mechanics with curses
    Escalate = 5,  // Increasing difficulty with minibosses
    CashOut  = 6,  // Shop system with dual currency
    Reset    = 7   // Clean restart with early room adjustments
}
```

#### ⚔️ Character Abilities Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `get_character_type()` | Get current character class | None | `int` (0=Warden, 1=Raider, 2=Kensei) |
| `set_character_type(type)` | Set character class | `type`: character ID | `void` |
| `can_use_ability(ability_id)` | Check if ability can be used | `ability_id`: ability ID | `1` if available, `0` otherwise |
| `use_ability(ability_id)` | Execute character ability | `ability_id`: ability ID | `1` if successful, `0` if failed |
| `get_ability_cooldown(ability_id)` | Get ability cooldown remaining | `ability_id`: ability ID | `float` (seconds) |
| `get_ability_stamina_cost(ability_id)` | Get ability stamina cost | `ability_id`: ability ID | `int` |

#### 🎯 Choice System Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `get_choice_count()` | Number of available choices | None | `int` |
| `get_choice_id(index)` | Get choice ID at index | `index`: choice index | `int` |
| `get_choice_type(index)` | Get choice type at index | `index`: choice index | `int` |
| `get_choice_rarity(index)` | Get choice rarity at index | `index`: choice index | `int` |
| `get_choice_tags(index)` | Get choice tags at index | `index`: choice index | `int` |
| `commit_choice(choice_id)` | Apply selected choice | `choice_id`: selected ID | `void` |
| `generate_choices()` | Force choice generation | None | `void` |

#### 🎲 Risk Phase Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `get_curse_count()` | Active curses count | None | `int` |
| `get_curse_type(index)` | Curse type at index | `index`: curse index | `int` |
| `get_curse_intensity(index)` | Curse strength | `index`: curse index | `float` |
| `get_risk_multiplier()` | Risk/reward multiplier | None | `float` |
| `get_elite_active()` | Elite enemy flag | None | `int` |
| `escape_risk()` | Exit risk phase | None | `void` |

#### 📈 Escalate Phase Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `get_escalation_level()` | Difficulty level (0-1) | None | `float` |
| `get_spawn_rate_modifier()` | Enemy spawn multiplier | None | `float` |
| `get_miniboss_active()` | Miniboss presence | None | `int` |
| `get_miniboss_x/y()` | Miniboss position | None | `float` |
| `damage_miniboss(amount)` | Damage miniboss | `amount`: damage | `void` |

#### 💰 CashOut Phase Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `get_gold()` | Gold currency amount | None | `int` |
| `get_essence()` | Essence currency amount | None | `int` |
| `get_shop_item_count()` | Available items | None | `int` |
| `buy_shop_item(index)` | Purchase item | `index`: item index | `void` |
| `buy_heal()` | Purchase full heal | None | `void` |
| `reroll_shop_items()` | Refresh shop | None | `void` |

## JavaScript Integration

### 🎨 UI Layer Contract

#### Frame Update Loop
```javascript
// Main game loop (60 FPS)
function gameLoop(deltaTime) {
    // 1. Set player input in WASM
    wasmModule.set_player_input(
        inputX, inputY, isRolling, isJumping,
        lightAttack, heavyAttack, isBlocking, special
    );
    
    // 2. Update WASM simulation
    wasmModule.update(deltaTime);
    
    // 3. Read state for rendering
    const playerX = wasmModule.get_x();
    const playerY = wasmModule.get_y();
    const stamina = wasmModule.get_stamina();
    const hp = wasmModule.get_hp();
    
    // 4. Update UI/HUD
    renderPlayer(playerX, playerY);
    updateStaminaBar(stamina);
    updateHealthBar(hp);
    
    requestAnimationFrame(gameLoop);
}
```

#### Choice System Integration
```javascript
// Monitor phase changes
if (wasmModule.get_phase() === 2) { // Choose phase
    const choiceCount = wasmModule.get_choice_count();
    const choices = [];
    
    for (let i = 0; i < choiceCount; i++) {
        choices.push({
            id: wasmModule.get_choice_id(i),
            type: wasmModule.get_choice_type(i),
            rarity: wasmModule.get_choice_rarity(i),
            tags: wasmModule.get_choice_tags(i)
        });
    }
    
    showChoiceOverlay(choices);
}

// Handle choice selection
function onChoiceSelected(choiceId) {
    wasmModule.commit_choice(choiceId);
    hideChoiceOverlay();
}
```

#### Game Restart
```javascript
function restartGame() {
    const newSeed = generateSeed(); // Deterministic seed generation
    wasmModule.reset_run(newSeed);
    // UI will update automatically on next frame
}
```

### ⚠️ JavaScript Restrictions
- **NO gameplay logic** - All decisions in WASM
- **NO Math.random()** for gameplay - Use WASM RNG only
- **NO state mutations** - JS is read-only observer
- **NO timing-based gameplay** - Use deterministic WASM timers

## 👨‍🍳 Common Tasks Cookbook

### Task: Add a New WASM Export Function

**1. C++ Side** (`public/src/wasm/game_refactored.cpp`):
```cpp
// Add function implementation
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    float get_my_new_value() {
        return gameState.myNewValue;
    }
}
```

**2. Rebuild WASM**:
```bash
npm run wasm:build
```

**3. JavaScript Side** (`public/src/game/state/WasmCoreState.js`):
```javascript
export class WasmCoreState {
    getMyNewValue() {
        return this.wasmModule.get_my_new_value?.() ?? 0;
    }
}
```

**4. Verify Export** (check `WASM_EXPORTS.json`):
```bash
grep "get_my_new_value" WASM_EXPORTS.json
```

**5. Test**:
```javascript
// test/unit/state/wasm-core-state.test.js
it('should get my new value', () => {
    const value = wasmState.getMyNewValue();
    expect(value).to.be.a('number');
});
```

---

### Task: Add a New Enemy Type

**1. Define Stats** (`data/balance/enemies.json`):
```json
{
    "myEnemy": {
        "health": 100,
        "damage": 15,
        "speed": 200,
        "detectionRange": 300
    }
}
```

**2. Regenerate Balance Data**:
```bash
node ./tools/scripts/generate-balance.cjs
```

**3. Register in WASM** (`public/src/wasm/managers/EnemyManager.cpp`):
```cpp
void EnemyManager::spawnEnemy(EnemyType type) {
    if (type == ENEMY_MY_ENEMY) {
        Enemy enemy;
        enemy.health = BALANCE_MY_ENEMY_HEALTH;
        enemy.damage = BALANCE_MY_ENEMY_DAMAGE;
        enemies.push_back(enemy);
    }
}
```

**4. Rebuild WASM**:
```bash
npm run wasm:build
```

**5. Add Renderer** (`public/src/renderer/enemies/MyEnemyRenderer.js`):
```javascript
export class MyEnemyRenderer {
    render(ctx, enemy, camera) {
        // Visual rendering only - read state from enemy object
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - camera.x, enemy.y - camera.y, 32, 32);
    }
}
```

---

### Task: Modify Game Balance

**1. Edit Balance File** (`data/balance/player.json`):
```json
{
    "player": {
        "speed": 300,        // Changed from 250
        "health": 150,       // Changed from 100
        "stamina": 120       // Changed from 100
    }
}
```

**2. Regenerate C++ Header**:
```bash
node ./tools/scripts/generate-balance.cjs
```

**3. Rebuild WASM** (constants are compiled in):
```bash
npm run wasm:build
```

**4. Test Changes**:
- Refresh browser
- Verify player moves faster
- Verify health bar shows 150 max
- Check stamina regeneration

---

### Task: Add a New UI Component

**1. Create Component** (`public/src/game/ui/components/MyComponent.js`):
```javascript
export class MyComponent {
    constructor(container) {
        this.element = document.createElement('div');
        this.element.className = 'my-component';
        container.appendChild(this.element);
    }
    
    update(gameState) {
        // Read from WASM state only
        const value = gameState.getMyValue();
        this.element.textContent = `Value: ${value}`;
    }
    
    destroy() {
        this.element.remove();
    }
}
```

**2. Add Styles** (`public/src/styles/ui.css`):
```css
.my-component {
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 5px;
}
```

**3. Register in UIManager** (`public/src/game/ui/UIManager.js`):
```javascript
import { MyComponent } from './components/MyComponent.js';

class UIManager {
    constructor() {
        this.myComponent = new MyComponent(this.container);
    }
    
    update(gameState) {
        this.myComponent.update(gameState);
    }
}
```

**4. No rebuild needed** - Just refresh browser

---

### Task: Debug a WASM Function

**1. Check if Function Exists**:
```javascript
console.log('Function exists?', typeof wasmModule.get_my_value === 'function');
```

**2. Check WASM Exports Manifest**:
```bash
cat WASM_EXPORTS.json | grep "get_my_value"
```

**3. Add Debug Logging in C++**:
```cpp
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    float get_my_value() {
        printf("get_my_value called, returning: %f\n", myValue);
        return myValue;
    }
}
```

**4. Rebuild with Debug Symbols**:
```bash
npm run wasm:build:dev
```

**5. Check Browser Console** for `printf` output

---

### Task: Fix a Multiplayer Desync

**1. Enable Deterministic Replay**:
```javascript
// Record inputs
const inputs = [];
function recordInput(input) {
    inputs.push({ frame: frameCount, input: { ...input } });
}

// Replay with same seed
wasmModule.init_run(12345, 0);
inputs.forEach(({ input }) => {
    wasmModule.set_player_input(...Object.values(input));
    wasmModule.update(0.016);
});
```

**2. Check for Non-Deterministic Code**:
```bash
# Search for Math.random() in gameplay code
grep -r "Math.random()" public/src/game/
grep -r "Math.random()" public/src/wasm/

# Should find ZERO results in gameplay code
```

**3. Verify WASM Versions Match**:
```javascript
// Add version check
const WASM_VERSION = '1.0.0';
if (remoteWasmVersion !== WASM_VERSION) {
    console.error('WASM version mismatch!');
}
```

**4. Check State Sync**:
```javascript
// Log state checksums
const stateHash = hashGameState(wasmModule);
console.log('State hash:', stateHash);
// Compare with other clients
```

## 📁 File Location Quick Reference

### "Where do I find...?"

| What | Location | Key Files |
|------|----------|-----------|
| **Game Logic (C++)** | `public/src/wasm/` | `game_refactored.cpp`, `GameGlobals.cpp` |
| **Managers (C++)** | `public/src/wasm/managers/` | `WolfManager.cpp`, `CombatManager.cpp` |
| **Coordinators (C++)** | `public/src/wasm/coordinators/` | `GameCoordinator.cpp` |
| **Physics (C++)** | `public/src/wasm/physics/` | `PhysicsManager.cpp` |
| **Game Loop (JS)** | `public/src/game/loop/` | `GameLoopCoordinator.js`, `MVPLoop.js` |
| **Rendering (JS)** | `public/src/renderer/` | `GameRenderer.js`, `PlayerRenderer.js` |
| **Input (JS)** | `public/src/game/input/` | `InputMapper.js` |
| **UI (JS)** | `public/src/game/ui/` | `UIManager.js` |
| **Animation - Player (JS)** | `public/src/animation/player/` | `physics/`, `procedural/` |
| **Animation - Enemies (JS)** | `public/src/animation/enemy/` | `wolf-animation.js` |
| **WASM State Bridge (JS)** | `public/src/game/state/` | `WasmCoreState.js` |
| **Coordinators (JS)** | `public/src/game/coordinators/` | `*Coordinator.js` |
| **Balance Data** | `data/balance/` | `player.json`, `enemies.json` |
| **Tests - Unit** | `test/unit/` | `*/*.test.js` (54+ tests) |
| **Tests - Integration** | `test/integration/` | `*.js` |
| **Build Scripts** | `tools/scripts/` | `build-wasm.ps1`, `build-wasm.sh` |
| **Documentation** | `GUIDELINES/` | All `.md` files |
| **WASM Exports Manifest** | Root | `WASM_EXPORTS.json` |

### File Naming Conventions

- **Managers**: `*Manager.js/.cpp` - Handle specific domain logic (e.g., `WolfManager`, `CombatManager`)
- **Coordinators**: `*Coordinator.js/.cpp` - Orchestrate multiple systems (e.g., `GameCoordinator`)
- **Renderers**: `*Renderer.js` - Visual display only, no logic (e.g., `PlayerRenderer`, `WolfRenderer`)
- **Bridges**: `*Bridge.js` - WASM ↔ JS data translation (e.g., `progression-bridge.js`)
- **Utils**: `*-utils.js` - Pure helper functions (e.g., `math-utils.js`)
- **States**: `*State.js` - State management facades (e.g., `WasmCoreState.js`)

### Directory Organization

```
public/src/
├── wasm/              # C++ game logic (WASM source)
│   ├── managers/      # Domain managers (Wolf, Combat, etc.)
│   ├── coordinators/  # System orchestrators
│   ├── physics/       # Physics simulation
│   └── progression/   # Progression systems
├── game/              # JavaScript game systems
│   ├── loop/          # Game loop
│   ├── input/         # Input handling
│   ├── ui/            # User interface
│   ├── state/         # State management
│   └── coordinators/  # JS coordinators
├── animation/         # Animation systems
│   ├── player/        # Player animations
│   ├── enemy/         # Enemy animations
│   ├── abilities/     # Ability animations
│   └── system/        # Animation framework
├── renderer/          # Rendering systems
│   └── player/        # Player renderers
└── networking/        # Multiplayer networking
```

## Build Process

### 🛠️ Prerequisites
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (vendored in `emsdk/`)
- C++17 compatible compiler
- Node.js 20+ (for build tools)
- CMake (for C++ build system)

### 📦 Build Commands

Use the provided scripts in `tools/scripts/`, which set environment variables and output to the project root as `game.wasm` (and `game-host.wasm` when requested):

#### Windows (PowerShell)
```powershell
npm run wasm:build        # prod build → ./game.wasm
npm run wasm:build:dev    # dev build with assertions
npm run wasm:build:host   # host-authoritative module → ./game-host.wasm
npm run wasm:build:all    # build both modules
```

#### Linux/macOS (Bash)
```bash
npm run wasm:build        # prod build → ./game.wasm
npm run wasm:build:dev    # dev build with assertions
npm run wasm:build:host   # host-authoritative module → ./game-host.wasm
npm run wasm:build:all    # build both modules
```

#### Build Flags (used by scripts)
- `-O3`: Maximum optimization level
- `-s STANDALONE_WASM=1`: Generate standalone WASM without JS glue
- `-s WASM_BIGINT=1`: Enable BigInt support for 64-bit integers
- `-s EXPORT_ALL=0`: Export only marked functions (reduces size)
- `-s ALLOW_MEMORY_GROWTH=1`: Dynamic memory allocation support

## Best Practices

### 📝 Code Quality and ESLint Compliance

#### ESLint Rules - MANDATORY
- **Always use curly braces** for if/else statements, even single-line ones
- **Remove unused variables** and imports - clean up dead code
- **Split multiple declarations** - use separate `let`/`const` statements
- **Handle Unicode properly** - avoid bare `catch (_)` blocks, use descriptive error handling
- **Use semicolons consistently** - maintain consistent code style

```javascript
// ❌ WRONG - Missing braces
if (condition) doSomething();

// ✅ CORRECT - Always use braces
if (condition) {
  doSomething();
}

// ❌ WRONG - Multiple declarations
let a = 1, b = 2;

// ✅ CORRECT - Separate declarations
let a = 1;
let b = 2;

// ❌ WRONG - Unused variable
let fps = 60; // Never used

// ✅ CORRECT - Remove unused or use it
// Remove the line entirely if not needed

// ❌ WRONG - Silent error handling
catch (_) {}

// ✅ CORRECT - Descriptive error handling
catch (error) {
  // Handle specific error or log appropriately
}
```

#### Pre-commit Checklist
- [ ] Run ESLint and fix all errors
- [ ] Remove console.log statements in production code
- [ ] Check for unused imports and variables
- [ ] Ensure all if/else statements have braces
- [ ] Verify Unicode escapes are properly formatted

### 🎲 Determinism Rules

#### RNG Management
```cpp
// WASM side - deterministic RNG
class GameRNG {
    uint32_t seed;
public:
    void init(uint32_t s) { seed = s; }
    uint32_t next() {
        seed = seed * 1664525 + 1013904223; // LCG
        return seed;
    }
};
```

```javascript
// JS side - seed management only
const gameSeed = Date.now(); // Or from server
wasmModule.init_run(gameSeed, startWeapon);
// Never use Math.random() for gameplay!
```

#### Time Management
- **UI Animations**: Use `performance.now()` in JavaScript
- **Game Logic**: Use deterministic frame counters in WASM
- **Network Sync**: Pass tick numbers, not timestamps

### 🚀 Performance Guidelines
1. **Batch State Reads**: Read all WASM state once per frame
2. **Minimize Calls**: Group related operations
3. **Use Flat Data**: Avoid complex object serialization
4. **Profile Regular**: Monitor WASM/JS boundary overhead

### 🔧 Extending the System

#### Adding New Choices/Boons

1. **Define in WASM** (src/game_refactored.cpp):
```cpp
struct Choice {
    uint32_t id;
    uint8_t type;
    uint8_t rarity;
    uint32_t tags;
    
    void apply(GameState* state) {
        // Apply choice effects
        switch(type) {
            case CHOICE_WEAPON:
                state->weapon = id;
                break;
            case CHOICE_BUFF:
                state->applyBuff(id);
                break;
        }
    }
};
```

2. **Export Getters**:
```cpp
extern "C" {
    int get_choice_count() { return choices.size(); }
    int get_choice_id(int i) { return choices[i].id; }
    // ... other getters
}
```

3. **Render in JS** (public/src/):
```javascript
function renderChoice(choice) {
    // Only visual representation
    const element = createChoiceCard(choice);
    element.onclick = () => wasmModule.commit_choice(choice.id);
}
```

#### Data Structure Guidelines
- **Keep exports flat**: Primitives over objects
- **Use bit flags**: Pack booleans into integers
- **Avoid strings**: Use enums/IDs instead
- **Minimize allocations**: Pre-allocate buffers

## 📝 Pull Request Checklist

### Code Quality
- [ ] **ESLint passes** - Run `npm run lint`, fix all errors
- [ ] **No console.log** - Remove debug statements in production code
- [ ] **No unused imports** - Clean up dead code
- [ ] **Curly braces** - All if/else statements have braces
- [ ] **File size** - No files >500 lines (split if needed)
- [ ] **Single responsibility** - Each file/class does one thing
- [ ] **Descriptive names** - Clear, intention-revealing names

### WASM Changes (if applicable)
- [ ] **Builds successfully** - `npm run wasm:build` succeeds
- [ ] **WASM_EXPORTS.json updated** - All new exports documented
- [ ] **EMSCRIPTEN_KEEPALIVE** - All exports properly marked
- [ ] **No memory leaks** - Valgrind clean (if unsure)
- [ ] **Balance data regenerated** - If modified `data/balance/*.json`
- [ ] **Golden test passes** - Deterministic replay works

### Architecture Compliance
- [ ] **WASM-first** - All game logic in WASM, not JavaScript
- [ ] **No Math.random()** - Use WASM RNG for gameplay
- [ ] **No JS physics** - Physics only in WASM PhysicsManager
- [ ] **Single state source** - WASM owns state, JS reads only
- [ ] **Deterministic** - Same seed + inputs = same result

### Testing
- [ ] **Unit tests pass** - Run `npm run test:unit`
- [ ] **New tests added** - Test new functionality
- [ ] **Coverage maintained** - No decrease in coverage %
- [ ] **Integration tests** - If touching core systems
- [ ] **Manual testing** - Verify in browser

### Performance
- [ ] **Frame time ≤ 16ms** - Maintain 60 FPS
- [ ] **No allocations in hot paths** - Profile if unsure
- [ ] **Batch WASM calls** - Minimize boundary crossings
- [ ] **Memory usage** - No unexpected increases

### Documentation
- [ ] **Updated .md files** - If architecture/API changed
- [ ] **JSDoc comments** - For public APIs
- [ ] **Code comments** - For complex logic
- [ ] **CHANGELOG** - If major feature/change

### Git Hygiene
- [ ] **Commit message format** - `type(scope): description`
- [ ] **No merge conflicts** - Resolved cleanly
- [ ] **Branched from main** - Latest code
- [ ] **Focused commits** - No unrelated changes
- [ ] **No committed secrets** - API keys, passwords

### Browser Compatibility
- [ ] **Chrome** - Tested and working
- [ ] **Firefox** - Tested and working
- [ ] **Safari** - Tested and working (if possible)
- [ ] **Mobile** - Touch controls work (if applicable)

### Multiplayer (if applicable)
- [ ] **No desync** - Deterministic replay works
- [ ] **Same WASM version** - All clients use same build
- [ ] **Network sync** - State synchronizes correctly
- [ ] **Host authority** - Host state is source of truth

## Troubleshooting

### Common Issues

#### WASM Module Won't Load
```javascript
// Check for CORS issues
fetch('wasm/game.wasm')  // Located in public/wasm/ or root
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.instantiate(bytes))
    .catch(error => console.error('WASM load failed:', error));
```

#### Desync in Multiplayer
- Verify all clients use same WASM version
- Check seed synchronization
- Ensure no `Math.random()` in gameplay path (see [ADR-002](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md))
- Validate input timestamps
- Confirm no duplicate physics in JavaScript (see [ADR-001](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md))
- Verify single state source of truth (see [ADR-003](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md))

#### Performance Issues
- Profile WASM/JS boundary calls
- Reduce state export frequency
- Use `requestAnimationFrame` properly
- Check for memory leaks

### Enhanced Debugging Guide

#### WASM/JS Boundary Debugging

**Problem**: WASM function returns unexpected value

```javascript
// 1. Check if function exists
console.log('Function exists?', typeof wasmModule.get_my_value === 'function');

// 2. Check return value and type
const value = wasmModule.get_my_value();
console.log('Returned value:', value, 'Type:', typeof value);

// 3. Check WASM exports manifest
// See WASM_EXPORTS.json for all available functions
const fs = await fetch('/WASM_EXPORTS.json');
const exports = await fs.json();
console.log('Available exports:', exports);
```

**Problem**: Game state desync in multiplayer

```javascript
// 1. Enable deterministic replay
const seed = 12345;
wasmModule.init_run(seed, 0);

// 2. Record inputs with timestamps
const inputs = [];
function recordInput(input) {
    inputs.push({ 
        frame: frameCount, 
        time: Date.now(), 
        input: { ...input } 
    });
}

// 3. Replay with same seed
wasmModule.init_run(seed, 0);
let frameCount = 0;
inputs.forEach(({ input }) => {
    wasmModule.set_player_input(...Object.values(input));
    wasmModule.update(0.016); // Fixed timestep
    frameCount++;
});

// 4. Compare final states
const finalState = {
    x: wasmModule.get_x(),
    y: wasmModule.get_y(),
    health: wasmModule.get_hp()
};
console.log('Final state:', finalState);
// Should be identical across all clients
```

#### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `exports.function_name is not a function` | WASM function not exported | Add `EMSCRIPTEN_KEEPALIVE` and rebuild WASM |
| `Module is not defined` | WASM not loaded yet | Ensure WASM loads before calling functions |
| `Cannot read property 'x' of undefined` | Accessing non-existent export | Check `WASM_EXPORTS.json` for available functions |
| Desync in multiplayer | Non-deterministic code | Check for `Math.random()`, use WASM RNG only |
| Animation not visible | Wrong renderer mode | Check `mode: 'physics'` vs `'procedural'` |
| `Memory access out of bounds` | Buffer overflow in WASM | Check array bounds in C++ code |
| Slow performance | Too many WASM calls | Batch state reads, profile with DevTools |

#### Performance Profiling

```javascript
// Profile WASM update time
performance.mark('wasm-start');
wasmModule.update(deltaTime);
performance.mark('wasm-end');
performance.measure('wasm-update', 'wasm-start', 'wasm-end');

// View measurements
const measures = performance.getEntriesByName('wasm-update');
console.log('WASM update time:', measures[0].duration, 'ms');
// Target: < 1ms

// Profile JS rendering time
performance.mark('render-start');
renderer.render(ctx, camera);
performance.mark('render-end');
performance.measure('render', 'render-start', 'render-end');

const renderMeasures = performance.getEntriesByName('render');
console.log('Render time:', renderMeasures[0].duration, 'ms');
// Target: < 5ms

// Memory profiling
if (performance.memory) {
    console.log('Heap used:', (performance.memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Heap total:', (performance.memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
}
```

#### Debugging Checklist

When something goes wrong, check in this order:

1. **[ ] Browser Console** - Any errors or warnings?
2. **[ ] WASM Build** - Does `npm run wasm:build` succeed?
3. **[ ] Function Exists** - Is the function in `WASM_EXPORTS.json`?
4. **[ ] Correct Types** - Are you passing correct parameter types?
5. **[ ] State Sync** - Is WASM state being read correctly?
6. **[ ] Determinism** - Does same seed produce same result?
7. **[ ] Performance** - Are frame times within budget?
8. **[ ] Memory** - Any memory leaks or excessive allocation?

## Performance Metrics

### 📊 Current Performance Characteristics
- **Deterministic**: Same seed + inputs = same output across all clients
- **Memory Efficient**: Flat data structures, no allocations during gameplay
- **Fast Updates**: < 1ms per frame typical, < 20ms maximum
- **Small Binary**: ~195KB WASM module with 139+ export functions
- **No GC Pressure**: All state in WASM linear memory
- **Multiplayer Ready**: Room-based P2P networking with host authority
- **Modular Architecture**: Manager/ViewModel/Coordinator patterns throughout
- **Dual Animation**: Physics-based (top-down) and Procedural (side-view) systems
- **Character Classes**: Three unique classes with special abilities
- **C++ Source**: Game logic in `public/src/wasm/` (C++), UI in `public/src/` (JavaScript)

### 🎯 Performance Targets
- Frame time: ≤ 16ms (60 FPS)
- Memory growth: < 10MB per session
- WASM memory: < 32MB total
- GC frequency: < 1/second
- Network sync: < 100ms latency
- Binary size: < 200KB (currently ~195KB)

### 📈 Optimization Strategies
1. **Batch State Reads**: Read all WASM state once per frame
2. **Minimize Calls**: Group related operations
3. **Use Flat Data**: Avoid complex object serialization
4. **Profile Regular**: Monitor WASM/JS boundary overhead
5. **Level of Detail**: Reduce complexity for distant entities

## Testing Framework

### 🧪 Current Test Coverage
- **54+ tests passing** - Core functionality verified (in `test/unit/`)
- **Golden Test**: 60-second deterministic gameplay validation
- **Pity Timer Test**: Choice system guarantee verification
- **Performance Test**: Frame time and memory monitoring
- **Phase Transition Test**: Complete core loop verification
- **Integration Tests**: Multiplayer and networking validation
- **Character Ability Tests**: Warden, Raider, Kensei ability validation
- **Animation System Tests**: Dual animation system verification
- **WASM Integration Tests**: Module loading and API validation

### 🔬 Test Categories
1. **Unit Tests**: Individual module functionality
2. **Integration Tests**: Module interaction verification
3. **Golden Tests**: Deterministic replay validation
4. **Performance Tests**: Frame time and memory benchmarks
5. **Network Tests**: Multiplayer synchronization

### 🚀 Testing Commands
```bash
# Run end-to-end Playwright tests
npm test

# Unit tests (mocha) - 53+ tests in test/unit/
npm run test:unit

# Coverage for unit tests
npm run test:coverage

# CI check: unit + coverage thresholds
npm run test:all

# Run specific test categories
npm run test:integration  # Integration tests
npm run test:performance  # Performance tests
```

### 📋 Testing Checklist
- [ ] Golden test: 60s input script produces identical end-state
- [ ] Pity timer test: forced bad streak flips to guarantee
- [ ] Performance: no GC churn/regressions; memory stays within limits
- [ ] Cross-platform: Works on Windows/Mac/Linux
- [ ] Browser compatibility: Chrome, Firefox, Safari tested
- [ ] Network sync: Multiplayer stays synchronized

## 📖 Glossary

### Architecture Terms

- **Manager**: Handles a specific domain (e.g., `WolfManager`, `CombatManager`). Owns state and logic for that domain. Located in `public/src/wasm/managers/` (C++) or `public/src/game/` (JS).
- **Coordinator**: Orchestrates multiple managers/systems without owning state (e.g., `GameCoordinator`). Higher-level than managers, connects systems together.
- **Bridge**: Translates data between WASM and JavaScript (e.g., `progression-bridge.js`). Handles serialization and data format conversion.
- **ViewModel**: JavaScript facade over WASM state for rendering (e.g., `WasmCoreState`). Provides clean API for UI layer without exposing WASM details.
- **Animator**: Controls entity animations, reads from WASM state. Never modifies game state, only visualizes it.
- **Renderer**: Pure visual display, no game logic. Takes state snapshots and draws to canvas.
- **Facade**: Wrapper that simplifies complex subsystem interactions. Common pattern for WASM-JS boundary.

### Game Systems

- **Phase**: One of 8 game loop stages (Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset). Each phase has distinct gameplay mechanics.
- **Run**: Single playthrough from start to death/reset. Can be replayed with same seed for determinism.
- **Seed**: RNG initialization value for deterministic gameplay. Same seed = same gameplay across all clients.
- **Deterministic**: Same inputs + seed always produce same outputs. Critical for multiplayer and replay systems.
- **WASM-First**: Architecture where WASM owns all game logic, JS only visualizes. JavaScript cannot make gameplay decisions.
- **Golden Test**: Test that replays recorded inputs and verifies identical output. Validates determinism.
- **State Snapshot**: Read-only copy of game state at a specific point in time. Used for rendering and network sync.

### Animation Terms

- **Procedural Animation**: Generated algorithmically (IK, physics-based). Not keyframed or hand-animated.
- **Physics Animation**: Lightweight top-down animation using physics solver. Faster than procedural, used for performance-critical scenarios.
- **Skeleton**: Joint-based character structure for animation. Defines bone hierarchy and constraints.
- **IK (Inverse Kinematics)**: Calculate joint positions from target positions. E.g., position hand at target, solve elbow angle.
- **Gait**: Movement pattern (walk, trot, gallop for wolves). Defines foot placement timing and stride.
- **Rig**: Skeleton structure with joint constraints. Defines character's movable parts.
- **Keyframe**: Specific pose at a specific time. Interpolated between for smooth animation.
- **Blend Tree**: System for blending multiple animations together. E.g., walk + aim + hurt.

### Multiplayer Terms

- **Host-Authoritative**: Host's WASM state is source of truth. Clients predict locally but accept host corrections.
- **P2P (Peer-to-Peer)**: Direct connections between players, no server. Uses WebRTC for low-latency communication.
- **Desync**: Divergent game states between clients (bug). Caused by non-deterministic code or network issues.
- **Rollback**: Rewind simulation to past state for correction. Used when desync detected.
- **Deterministic Replay**: Re-execute inputs to reproduce game state. Used for debugging and validation.
- **Lockstep**: All clients advance in sync, wait for all inputs. Ensures perfect synchronization but adds latency.
- **Input Prediction**: Client predicts own actions before server confirms. Reduces perceived latency.

### WASM Terms

- **Export**: C++ function marked with `EMSCRIPTEN_KEEPALIVE` that JavaScript can call.
- **Import**: JavaScript function that WASM can call (rare in this project).
- **Linear Memory**: Flat byte array shared between WASM and JS. Direct memory access for performance.
- **Module**: Compiled WASM binary. Loaded and instantiated by JavaScript.
- **Instance**: Runtime instance of WASM module. Contains exports and memory.
- **Emscripten**: Toolchain for compiling C++ to WASM. Includes helper libraries and build tools.

### Development Terms

- **Hot Reload**: Update code without full page refresh. JavaScript changes only (WASM requires rebuild).
- **Build Artifact**: Generated file from build process (e.g., `game.wasm`, `WASM_EXPORTS.json`).
- **Linting**: Static code analysis for style and errors. Use ESLint for JavaScript, clang-tidy for C++.
- **Coverage**: Percentage of code executed by tests. Target: >80% for critical paths.
- **Profiling**: Measuring performance to find bottlenecks. Use browser DevTools and `performance.mark()`.

## 📚 Additional Resources

### Architecture Decision Records
- [ADR-001: Remove JavaScript Physics](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md)
- [ADR-002: Math.random() Elimination](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md)
- [ADR-003: State Manager Consolidation](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md)

### External Resources
- [WebAssembly MDN Documentation](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Game Networking Resources](https://gafferongames.com/)
- [Deterministic Simulation Guide](https://gafferongames.com/post/deterministic_lockstep/)
- [Performance Optimization Guide](https://developer.mozilla.org/en-docs/WebAssembly/Optimizing_WebAssembly_performance)

### Migration Guides
- [UTILS/MIGRATION_GUIDE.md](./UTILS/MIGRATION_GUIDE.md) - Step-by-step migration from legacy patterns to WASM-first architecture

---

*Last updated: January 2025*
