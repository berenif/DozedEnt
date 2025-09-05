# 🎮 Agent Development Guide (WASM-First Architecture)

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Guideline Cross-Reference Index](#guideline-cross-reference-index)
- [WASM API Reference](#wasm-api-reference)
- [JavaScript Integration](#javascript-integration)
- [Build Process](#build-process)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This repository implements a **WebAssembly-first multiplayer game architecture** where all game logic resides in WASM (C++) modules, while JavaScript handles only rendering, input capture, and networking.

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

## Guideline Cross-Reference Index

Use these documents when working on agents, enemies, animations, core loop, and multiplayer systems. Keep gameplay logic in WASM and use JS only for rendering, inputs, and networking.

### AI
- [Enemy AI Template](./AI/ENEMY_TEMPLATE.MD) — Baseline rules, state machine structure, properties, combat patterns, animation integration, performance, and testing checklist for all enemies.
- [Enemy AI (System Overview)](./AI/ENEMY_AI.md) — Modular behavior system: states, attributes, memory, adaptive difficulty, terrain awareness, roles, comms, and performance.
- [Wolf AI](./AI/WOLF_AI.md) — Concrete predator/pack AI: coordinated plans, adaptive tuning, emotions, memory, terrain exploitation, and future roadmap.

### Animation
- [Animation System Index](./ANIMATION/ANIMATION_SYSTEM_INDEX.md) — Architecture, components, quick start, API, and integration examples.
- [Player Animations](./ANIMATION/PLAYER_ANIMATIONS.md) — States, transitions, effects, input mapping, API, performance considerations, and troubleshooting.

### Game Core Loop
- [Implementation Summary](./GAME/IMPLEMENTATION_SUMMARY.md) — End-to-end features for all phases (Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset), exports, testing, and performance.
- [Core Loop Checklist](./GAME/CORE_LOOP_CHECKLIST.md) — Per-feature validation for determinism, WASM-only logic, API constraints, phase-specific criteria, and tests.

### Multiplayer (Lobby & Rooms)
- [Lobby System](./GAME/LOBBY_SYSTEM.md) — Enhanced lobby UX, matchmaking, chat, analytics, events, config, and performance.
- [Room System](./GAME/ROOM_SYSTEM.md) — Host-authoritative rooms, migration, WASM integration, state sync, events, and performance tips.

### Build, Deploy, and Testing
- [Build Instructions](./UTILS/BUILD_INSTRUCTIONS.md) — Build scripts, outputs, demos, troubleshooting, and performance tips.
- [Deploy to GitHub Pages](./UTILS/DEPLOY_GITHUB_PAGES.md) — CI/CD workflow, setup, custom domains, troubleshooting.
- [Test Coverage Improvements](./UTILS/TEST_COVERAGE_IMPROVEMENTS.md) — Testing stack, coverage status, recommendations, and next steps.

## WASM API Reference

### 📦 Current API Surface
#### ⚙️ Core Simulation Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `start()` | Initializes/resets runtime state | None | `void` |
| `update(dirX, dirY, isRolling, dtSeconds)` | Main game tick (deterministic) | `dirX`: -1 to 1<br>`dirY`: -1 to 1<br>`isRolling`: 0 or 1<br>`dtSeconds`: delta time | `void` |
| `get_x()` | Get player X position | None | `float` (0..1) |
| `get_y()` | Get player Y position | None | `float` (0..1) |
| `get_stamina()` | Get current stamina | None | `float` (0..1) |
| `on_attack()` | Execute attack action | None | `1` if successful, `0` if failed |
| `on_roll_start()` | Start dodge roll | None | `1` if successful, `0` if failed |
| `set_blocking(on, faceX, faceY, nowSeconds)` | Toggle/update block state | `on`: 0 or 1<br>`faceX`: direction<br>`faceY`: direction<br>`nowSeconds`: timestamp | `1` if active, `0` if not |
| `get_block_state()` | Query blocking status | None | `1` if blocking, `0` otherwise |
| `handle_incoming_attack(ax, ay, dirX, dirY, nowSeconds)` | Process incoming attack | Attack parameters | `-1`: ignore<br>`0`: hit<br>`1`: block<br>`2`: perfect parry |
#### 🔄 Game Loop & State Management

| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `init_run(seed, start_weapon)` | Initialize new run | `seed`: RNG seed<br>`start_weapon`: weapon ID | `void` |
| `reset_run(new_seed)` | Instant restart with new seed | `new_seed`: RNG seed | `void` |
| `get_phase()` | Get current game phase | None | Phase enum (see below) |
| `get_choice_count()` | Number of available choices | None | `int` |
| `get_choice_id(i)` | Get choice ID at index | `i`: index | `int` |
| `get_choice_type(i)` | Get choice type at index | `i`: index | `int` |
| `get_choice_rarity(i)` | Get choice rarity at index | `i`: index | `int` |
| `get_choice_tags(i)` | Get choice tags at index | `i`: index | `int` |
| `commit_choice(choice_id)` | Apply selected choice | `choice_id`: selected ID | `void` |

##### 📊 Game Phases
```cpp
enum Phase {
    Explore  = 0,  // Exploration phase
    Fight    = 1,  // Combat encounter
    Choose   = 2,  // Choice/reward selection
    PowerUp  = 3,  // Power-up application
    Risk     = 4,  // Risk/reward decision
    Escalate = 5,  // Difficulty escalation
    CashOut  = 6,  // Shop/exchange phase
    Reset    = 7   // Run reset/restart
}
```

## JavaScript Integration

### 🎨 UI Layer Contract

#### Frame Update Loop
```javascript
// Main game loop (60 FPS)
function gameLoop(deltaTime) {
    // 1. Forward inputs to WASM
    wasmModule.update(inputX, inputY, isRolling, deltaTime);
    
    // 2. Read state for rendering
    const playerX = wasmModule.get_x();
    const playerY = wasmModule.get_y();
    const stamina = wasmModule.get_stamina();
    
    // 3. Update UI/HUD
    renderPlayer(playerX, playerY);
    updateStaminaBar(stamina);
    
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

## Build Process

### 🛠️ Prerequisites
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
- C++17 compatible compiler
- Node.js 16+ (for build tools)

### 📦 Build Commands

#### Windows (PowerShell)
```powershell
# Initialize Emscripten environment
. .\emsdk\emsdk_env.ps1

# Build optimized WASM module
em++ wasm\game.cpp \
    -O3 \
    -s STANDALONE_WASM=1 \
    -s WASM_BIGINT=1 \
    -s EXPORT_ALL=0 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -o docs\game.wasm
```

#### Linux/macOS (Bash)
```bash
# Initialize Emscripten environment
source ./emsdk/emsdk_env.sh

# Build optimized WASM module
em++ wasm/game.cpp \
    -O3 \
    -s STANDALONE_WASM=1 \
    -s WASM_BIGINT=1 \
    -s EXPORT_ALL=0 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -o docs/game.wasm
```

#### Build Flags Explained
- `-O3`: Maximum optimization level
- `-s STANDALONE_WASM=1`: Generate standalone WASM without JS glue
- `-s WASM_BIGINT=1`: Enable BigInt support for 64-bit integers
- `-s EXPORT_ALL=0`: Export only marked functions (reduces size)
- `-s ALLOW_MEMORY_GROWTH=1`: Dynamic memory allocation support

## Best Practices

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

1. **Define in WASM** (game.cpp):
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

3. **Render in JS**:
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

### Required Checks
- [ ] **All game logic in WASM** - No gameplay code in JavaScript
- [ ] **Deterministic execution** - Same seed + inputs = same result
- [ ] **Build successful** - `docs/game.wasm` updated and tested
- [ ] **No regressions** - Core systems still functional:
  - [ ] Movement (`update` function)
  - [ ] Stamina system
  - [ ] Roll/dodge mechanics
  - [ ] Block/parry system
- [ ] **Memory safe** - No leaks or buffer overflows
- [ ] **Performance maintained** - Frame time ≤ 16ms
- [ ] **Documentation updated** - API changes documented

### Testing Requirements
- [ ] **Golden test passes** - Replay produces identical results
- [ ] **Cross-platform** - Works on Windows/Mac/Linux
- [ ] **Browser compatibility** - Chrome, Firefox, Safari tested
- [ ] **Network sync** - Multiplayer stays synchronized

## Troubleshooting

### Common Issues

#### WASM Module Won't Load
```javascript
// Check for CORS issues
fetch('game.wasm')
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.instantiate(bytes))
    .catch(error => console.error('WASM load failed:', error));
```

#### Desync in Multiplayer
- Verify all clients use same WASM version
- Check seed synchronization
- Ensure no `Math.random()` in gameplay path
- Validate input timestamps

#### Performance Issues
- Profile WASM/JS boundary calls
- Reduce state export frequency
- Use `requestAnimationFrame` properly
- Check for memory leaks

## 📚 Additional Resources

- [WebAssembly MDN Documentation](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Game Networking Resources](https://gafferongames.com/)
- [Deterministic Simulation Guide](https://gafferongames.com/post/deterministic_lockstep/)

---

*Last updated: January 2025*
