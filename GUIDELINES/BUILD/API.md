# 🎮 WASM Game API Reference

> **Single Source of Truth**: This document provides the canonical API surface for the DozedEnt WASM game module. For architectural overview and usage examples, see [AGENTS.md](../AGENTS.md).

## 📦 Complete WASM API Surface

### Core Game Loop Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `init_run(seed, start_weapon)` | Initialize new run | `seed`: RNG seed<br>`start_weapon`: weapon ID | `void` |
| `reset_run(new_seed)` | Instant restart with new seed | `new_seed`: RNG seed | `void` |
| `update(dirX, dirY, isRolling, dtSeconds)` | Main game tick (deterministic) | `dirX`: -1 to 1<br>`dirY`: -1 to 1<br>`isRolling`: 0 or 1<br>`dtSeconds`: delta time | `void` |

### Player State Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_x()` | Get player X position | None | `float` (0..1) |
| `get_y()` | Get player Y position | None | `float` (0..1) |
| `get_stamina()` | Get current stamina | None | `float` (0..1) |
| `get_health()` | Get current health | None | `float` (0..1) |
| `get_room_count()` | Room progression counter | None | `int` |

### Combat System Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `set_player_input(...)` | Set 5-button combat input | `inputX, inputY, isRolling, isJumping, lightAttack, heavyAttack, isBlocking, special` | `void` |
| `on_attack()` | Execute attack action | None | `1` if successful, `0` if failed |
| `on_roll_start()` | Start dodge roll | None | `1` if successful, `0` if failed |
| `set_blocking(on, faceX, faceY, nowSeconds)` | Toggle/update block state | `on`: 0 or 1<br>`faceX, faceY`: direction<br>`nowSeconds`: timestamp | `1` if active, `0` if not |
| `get_block_state()` | Query blocking status | None | `1` if blocking, `0` otherwise |
| `handle_incoming_attack(...)` | Process incoming attack | Attack parameters | `-1`: ignore<br>`0`: hit<br>`1`: block<br>`2`: perfect parry |

### Game Phase Management

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_phase()` | Get current game phase | None | Phase enum (0-7) |

#### Game Phases (Complete Implementation)
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

### Choice System Functions (Phase 2)

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_choice_count()` | Number of available choices | None | `int` |
| `get_choice_id(index)` | Get choice ID at index | `index`: choice index | `int` |
| `get_choice_type(index)` | Get choice type at index | `index`: choice index | `int` |
| `get_choice_rarity(index)` | Get choice rarity at index | `index`: choice index | `int` |
| `get_choice_tags(index)` | Get choice tags at index | `index`: choice index | `int` |
| `commit_choice(choice_id)` | Apply selected choice | `choice_id`: selected ID | `void` |
| `generate_choices()` | Force choice generation | None | `void` |

### Risk Phase Functions (Phase 4)

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_curse_count()` | Active curses count | None | `int` |
| `get_curse_type(index)` | Curse type at index | `index`: curse index | `int` |
| `get_curse_intensity(index)` | Curse strength | `index`: curse index | `float` |
| `get_risk_multiplier()` | Risk/reward multiplier | None | `float` |
| `get_elite_active()` | Elite enemy flag | None | `int` |
| `escape_risk()` | Exit risk phase | None | `void` |

### Escalate Phase Functions (Phase 5)

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_escalation_level()` | Difficulty level (0-1) | None | `float` |
| `get_spawn_rate_modifier()` | Enemy spawn multiplier | None | `float` |
| `get_miniboss_active()` | Miniboss presence | None | `int` |
| `get_miniboss_x()`, `get_miniboss_y()` | Miniboss position | None | `float` |
| `damage_miniboss(amount)` | Damage miniboss | `amount`: damage | `void` |

### CashOut Phase Functions (Phase 6)

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_gold()` | Gold currency amount | None | `int` |
| `get_essence()` | Essence currency amount | None | `int` |
| `get_shop_item_count()` | Available items | None | `int` |
| `buy_shop_item(index)` | Purchase item | `index`: item index | `void` |
| `buy_heal()` | Purchase full heal | None | `void` |
| `reroll_shop_items()` | Refresh shop | None | `void` |

### Weapon System Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get_weapon_damage()` | Current weapon damage | None | `float` |
| `get_weapon_reach_mult()` | Weapon reach multiplier | None | `float` |
| `weapon_has_hyperarmor()` | Check hyperarmor tag | None | `1` if has tag, `0` otherwise |
| `weapon_has_flow_combo()` | Check flow combo tag | None | `1` if has tag, `0` otherwise |
| `weapon_has_bash_synergy()` | Check bash synergy tag | None | `1` if has tag, `0` otherwise |

### Environment System Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `generate_environment(biome_type, seed)` | Generate environment | `biome_type`: biome enum<br>`seed`: generation seed | `void` |
| `get_environment_object_count()` | Number of environment objects | None | `int` |
| `get_environment_object_type(index)` | Object type at index | `index`: object index | `int` |
| `get_environment_object_x(index)` | Object X position | `index`: object index | `float` |
| `get_environment_object_y(index)` | Object Y position | `index`: object index | `float` |

### World Simulation Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `world_simulation_init()` | Initialize world simulation | None | `void` |
| `world_simulation_update(dt)` | Update world simulation | `dt`: delta time | `void` |
| `set_weather_wind(speed, dirX, dirY, dirZ)` | Set wind parameters | Wind parameters | `void` |
| `set_weather_temperature(temp)` | Set temperature | `temp`: temperature value | `void` |
| `get_weather_wind_speed()` | Get wind speed | None | `float` |
| `get_weather_temperature()` | Get temperature | None | `float` |
| `get_time_of_day()` | Get current time of day | None | `float` |

## 🎯 JavaScript Integration Examples

### Basic Game Loop Integration
```javascript
// Main game loop (60 FPS)
function gameLoop(deltaTime) {
    // 1. Forward inputs to WASM
    wasmModule.update(inputX, inputY, isRolling, deltaTime);
    
    // 2. Read state for rendering
    const playerX = wasmModule.get_x();
    const playerY = wasmModule.get_y();
    const stamina = wasmModule.get_stamina();
    const currentPhase = wasmModule.get_phase();
    
    // 3. Update UI/HUD based on state
    renderPlayer(playerX, playerY);
    updateStaminaBar(stamina);
    handlePhaseTransitions(currentPhase);
    
    requestAnimationFrame(gameLoop);
}
```

### Choice System Integration
```javascript
// Monitor for choice phase
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

### Combat System Integration
```javascript
// 5-button combat input handling
function handleCombatInput(inputState) {
    wasmModule.set_player_input(
        inputState.moveX,        // -1 to 1
        inputState.moveY,        // -1 to 1
        inputState.isRolling,    // 0 or 1
        inputState.isJumping,    // 0 or 1
        inputState.lightAttack,  // 0 or 1 (J/1 key)
        inputState.heavyAttack,  // 0 or 1 (K/2 key)
        inputState.isBlocking,   // 0 or 1 (Shift/3 key)
        inputState.special       // 0 or 1 (L/5 key)
    );
}

// Check combat results
function checkCombatState() {
    const blockState = wasmModule.get_block_state();
    const stamina = wasmModule.get_stamina();
    
    // Update UI based on combat state
    updateBlockIndicator(blockState);
    updateStaminaBar(stamina);
}
```

## 🏗️ Architecture Compliance

### ✅ Correct Usage Patterns
```javascript
// CORRECT: Read WASM state, render only
const playerHealth = wasmModule.get_health();
const playerX = wasmModule.get_x();
const playerY = wasmModule.get_y();

if (playerHealth <= 0) {
    showGameOverScreen(); // UI only
}

renderPlayer(playerX, playerY); // Visual representation only
```

### ❌ Anti-Patterns to Avoid
```javascript
// WRONG: Game logic in JavaScript
if (player.health <= 0) {
    gameState = 'game_over'; // Don't modify game state in JS
}

// WRONG: Using Math.random() for gameplay
const damage = Math.random() * 50; // Use WASM RNG instead

// WRONG: Modifying game state in JS
player.x += velocity * deltaTime; // Let WASM handle all state updates
```

## 🚀 Performance Guidelines

### WASM/JS Boundary Optimization
1. **Batch State Reads**: Read all needed WASM state once per frame
2. **Minimize Function Calls**: Group related operations
3. **Use Flat Data**: Avoid complex object serialization
4. **Profile Regularly**: Monitor WASM/JS boundary overhead

### Memory Management
- **WASM Memory**: < 32MB total allocation
- **No GC Pressure**: Avoid frequent JS object creation in game loop
- **Static Allocations**: Pre-allocate buffers where possible

## 📊 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Frame Time | ≤ 16ms | ≤ 20ms |
| WASM Memory | < 32MB | < 64MB |
| Update Function | < 1ms typical | < 5ms max |
| Network Sync | < 100ms | < 200ms |

## 🧪 Testing Integration

### API Validation Tests
```javascript
describe('WASM API', () => {
    it('should provide all required functions', () => {
        expect(typeof wasmModule.init_run).to.equal('function');
        expect(typeof wasmModule.update).to.equal('function');
        expect(typeof wasmModule.get_x).to.equal('function');
        expect(typeof wasmModule.get_phase).to.equal('function');
    });
    
    it('should return valid state values', () => {
        wasmModule.init_run(12345, 0);
        
        const x = wasmModule.get_x();
        const y = wasmModule.get_y();
        const stamina = wasmModule.get_stamina();
        
        expect(x).to.be.within(0, 1);
        expect(y).to.be.within(0, 1);
        expect(stamina).to.be.within(0, 1);
    });
});
```

## 📚 Related Documentation

- **[AGENTS.md](../AGENTS.md)** - Complete architecture overview and usage examples
- **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - Development process and best practices
- **[TESTING.md](./TESTING.md)** - Testing framework and validation procedures
- **[QUICK_REFERENCE.md](../UTILS/QUICK_REFERENCE.md)** - Essential information for AI agents

---

*This API reference is the canonical source for WASM function signatures and behavior. Always consult this document when implementing JavaScript integration code.*
