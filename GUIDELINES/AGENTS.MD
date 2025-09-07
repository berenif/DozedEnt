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
- [Performance Metrics](#performance-metrics)
- [Testing Framework](#testing-framework)

## Overview

This repository implements a **WebAssembly-first multiplayer game architecture** where all game logic resides in WASM (C++) modules, while JavaScript handles only rendering, input capture, and networking. The system features a complete core loop implementation with 8 phases, advanced enemy AI, comprehensive animation systems, and robust multiplayer infrastructure.

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

### 📦 Current API Surface (60+ Functions)
#### ⚙️ Core Simulation Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|----------|
| `init_run(seed, start_weapon)` | Initialize new run | `seed`: RNG seed<br>`start_weapon`: weapon ID | `void` |
| `reset_run(new_seed)` | Instant restart with new seed | `new_seed`: RNG seed | `void` |
| `update(dirX, dirY, isRolling, dtSeconds)` | Main game tick (deterministic) | `dirX`: -1 to 1<br>`dirY`: -1 to 1<br>`isRolling`: 0 or 1<br>`dtSeconds`: delta time | `void` |
| `get_x()` | Get player X position | None | `float` (0..1) |
| `get_y()` | Get player Y position | None | `float` (0..1) |
| `get_stamina()` | Get current stamina | None | `float` (0..1) |
| `get_phase()` | Get current game phase | None | Phase enum (0-7) |
| `get_room_count()` | Room progression counter | None | `int` |
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

## Performance Metrics

### 📊 Current Performance Characteristics
- **Deterministic**: Same seed + inputs = same output across all clients
- **Memory Efficient**: Flat data structures, no allocations during gameplay
- **Fast Updates**: < 1ms per frame typical, < 20ms maximum
- **Small Binary**: ~43KB WASM module
- **No GC Pressure**: All state in WASM linear memory
- **60+ Export Functions**: Complete API surface for all game systems

### 🎯 Performance Targets
- Frame time: ≤ 16ms (60 FPS)
- Memory growth: < 10MB per session
- WASM memory: < 32MB total
- GC frequency: < 1/second
- Network sync: < 100ms latency

### 📈 Optimization Strategies
1. **Batch State Reads**: Read all WASM state once per frame
2. **Minimize Calls**: Group related operations
3. **Use Flat Data**: Avoid complex object serialization
4. **Profile Regular**: Monitor WASM/JS boundary overhead
5. **Level of Detail**: Reduce complexity for distant entities

## Testing Framework

### 🧪 Current Test Coverage
- **54 tests passing** - Core functionality verified
- **Golden Test**: 60-second deterministic gameplay validation
- **Pity Timer Test**: Choice system guarantee verification
- **Performance Test**: Frame time and memory monitoring
- **Phase Transition Test**: Complete core loop verification

### 🔬 Test Categories
1. **Unit Tests**: Individual module functionality
2. **Integration Tests**: Module interaction verification
3. **Golden Tests**: Deterministic replay validation
4. **Performance Tests**: Frame time and memory benchmarks
5. **Network Tests**: Multiplayer synchronization

### 🚀 Testing Commands
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance

# Generate coverage report
npm run test:coverage
```

### 📋 Testing Checklist
- [ ] Golden test: 60s input script produces identical end-state
- [ ] Pity timer test: forced bad streak flips to guarantee
- [ ] Performance: no GC churn/regressions; memory stays within limits
- [ ] Cross-platform: Works on Windows/Mac/Linux
- [ ] Browser compatibility: Chrome, Firefox, Safari tested
- [ ] Network sync: Multiplayer stays synchronized

## 📚 Additional Resources

- [WebAssembly MDN Documentation](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Game Networking Resources](https://gafferongames.com/)
- [Deterministic Simulation Guide](https://gafferongames.com/post/deterministic_lockstep/)
- [Performance Optimization Guide](https://developer.mozilla.org/en-US/docs/WebAssembly/Optimizing_WebAssembly_performance)

---

*Last updated: January 2025*
