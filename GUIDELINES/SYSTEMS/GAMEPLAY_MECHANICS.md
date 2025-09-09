# 🎮 Core Gameplay Mechanics (WASM-First Architecture)

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [5-Button Control System](#5-button-control-system)
- [Global Combat Rules](#global-combat-rules)
- [Input Buffer System](#input-buffer-system)
- [Defense Mechanics](#defense-mechanics)
- [Dodge System](#dodge-system)
- [Resource Management](#resource-management)
- [Combat Flow](#combat-flow)
- [WASM Implementation](#wasm-implementation)
- [JavaScript Integration](#javascript-integration)
- [Testing Requirements](#testing-requirements)

## Overview

This document defines the core gameplay mechanics for our WASM-first multiplayer combat system. All gameplay logic, timing calculations, and state management **MUST** be implemented in WebAssembly (C++) to ensure deterministic execution across all clients. JavaScript handles only input capture, rendering, and UI feedback.

### 🏗️ Architecture Alignment
- **WASM-First**: All gameplay logic, timing windows, and combat calculations in WebAssembly
- **Deterministic**: Identical inputs produce identical combat outcomes across all clients
- **Performance Optimized**: Native-speed combat processing with minimal JS overhead
- **JavaScript as Interface**: JS only captures inputs and renders gameplay results

## Architecture Principles

### 🔑 Golden Rules
1. **Keep ALL gameplay logic in WASM** - No combat decisions in JavaScript
2. **Deterministic timing** - All frame windows, buffers, and cooldowns calculated in WASM
3. **Input validation** - All player actions processed and validated by WASM first
4. **State consistency** - Game state synchronized across all clients via WASM

### ⚡ Gameplay Update Cycle
```cpp
// WASM gameplay update cycle (60 FPS)
void update_gameplay(float dt) {
    process_input_buffers(dt);          // Handle queued inputs with timing
    update_combat_states(dt);           // State machine transitions
    calculate_resource_systems(dt);     // Stamina, poise, cooldowns
    process_defense_mechanics(dt);      // Block, parry, dodge
    handle_combat_interactions(dt);     // Hit detection, damage
    update_flow_systems(dt);           // Momentum, combos, chains
    export_state_for_rendering();      // Send data to JS for visuals
}
```

## 5-Button Control System

### 🎮 Button Layout
```cpp
enum GameInput {
    A1_LIGHT = 0,        // Light Attack - Quick, safe pokes
    A2_HEAVY = 1,        // Heavy Attack - Slow, high damage
    BLOCK = 2,           // Hold to guard, tap on contact to parry
    ROLL = 3,            // Dodge with brief invincibility frames
    SPECIAL = 4          // Character-specific hero move
};

struct InputState {
    bool buttons[5];              // Current button states
    bool button_pressed[5];       // Just pressed this frame
    bool button_released[5];      // Just released this frame
    float hold_duration[5];       // How long each button held
};
```

### 🎯 Input Behavior Definitions
```cpp
// A1 - Light Attack
struct LightAttack {
    static constexpr float STARTUP_MS = 400.0f;      // Wind-up time
    static constexpr float ACTIVE_MS = 100.0f;       // Hit window
    static constexpr float RECOVERY_MS = 300.0f;     // Cool-down
    static constexpr float DAMAGE = 25.0f;           // Base damage
    static constexpr float STAMINA_COST = 10.0f;     // Stamina consumed
    static constexpr float POISE_DAMAGE = 20.0f;     // Poise break value
};

// A2 - Heavy Attack  
struct HeavyAttack {
    static constexpr float STARTUP_MS = 800.0f;      // Wind-up time
    static constexpr float ACTIVE_MS = 200.0f;       // Hit window
    static constexpr float RECOVERY_MS = 600.0f;     // Cool-down
    static constexpr float DAMAGE = 60.0f;           // Base damage
    static constexpr float STAMINA_COST = 30.0f;     // Stamina consumed
    static constexpr float POISE_DAMAGE = 60.0f;     // Poise break value
    static constexpr float FEINT_WINDOW_MS = 400.0f; // Can feint during this window
};

// Block - Defense
struct BlockSystem {
    static constexpr float STAMINA_DRAIN_RATE = 5.0f;  // Per second while held
    static constexpr float DAMAGE_REDUCTION = 0.8f;    // 80% damage reduction
    static constexpr float CHIP_DAMAGE = 0.1f;         // 10% damage still taken
    static constexpr float BLOCK_STUN_MS = 200.0f;     // Stun after blocking hit
};

// Roll - Dodge
struct RollSystem {
    static constexpr float DURATION_MS = 600.0f;       // Total roll time
    static constexpr float IFRAME_MS = 300.0f;         // Invincibility window
    static constexpr float SLIDE_MS = 200.0f;          // Low-traction slide after
    static constexpr float STAMINA_COST = 25.0f;       // Stamina consumed
    static constexpr float DISTANCE = 3.0f;            // Movement distance
};

// Special - Character-specific abilities (see PLAYER_CHARACTERS.md)
```

## Global Combat Rules

### ⏱️ Universal Timing Windows
```cpp
struct GlobalTimings {
    // Input buffer - inputs registered slightly early still count
    static constexpr float INPUT_BUFFER_MS = 120.0f;
    
    // Parry window - precise timing for perfect defense
    static constexpr float PARRY_WINDOW_MS = 120.0f;
    
    // Parry reward - stun duration applied to attacker
    static constexpr float PARRY_STUN_MS = 300.0f;
    
    // Dodge invincibility - brief untouchable period
    static constexpr float ROLL_IFRAMES_MS = 300.0f;
    
    // Post-roll slide - reduced traction period
    static constexpr float ROLL_SLIDE_MS = 200.0f;
    
    // Feint window - heavy attacks can be canceled
    static constexpr float HEAVY_FEINT_WINDOW_MS = 400.0f;
};
```

### 🔄 Feint Mechanics
```cpp
struct FeintSystem {
    bool can_feint_heavy;
    float feint_window_remaining;
    bool feint_input_detected;
    
    // Heavy attacks can be feinted with Block during wind-up
    bool attempt_heavy_feint() {
        return can_feint_heavy && 
               feint_window_remaining > 0.0f && 
               block_input_detected();
    }
    
    void update_feint_system(float dt) {
        if (is_heavy_attack_winding_up()) {
            feint_window_remaining -= dt * 1000.0f; // Convert to ms
            can_feint_heavy = (feint_window_remaining > 0.0f);
            
            if (attempt_heavy_feint()) {
                cancel_heavy_attack();
                enter_block_state();
                can_feint_heavy = false;
            }
        }
    }
};
```

### 🎯 Hit Priority System
```cpp
enum HitPriority {
    LIGHT_PRIORITY = 1,
    HEAVY_PRIORITY = 2,
    SPECIAL_PRIORITY = 3,
    UNBLOCKABLE_PRIORITY = 4
};

struct CombatInteraction {
    uint32_t attacker_id;
    uint32_t defender_id;
    HitPriority attack_priority;
    float damage;
    float poise_damage;
    
    // Resolve simultaneous attacks
    CombatResult resolve_interaction() {
        if (attack_priority > defender_attack_priority) {
            return ATTACKER_WINS;
        } else if (attack_priority < defender_attack_priority) {
            return DEFENDER_WINS;
        } else {
            return TRADE; // Both attacks land
        }
    }
};
```

## Input Buffer System

### 📥 Buffer Implementation
```cpp
struct InputBuffer {
    struct BufferedInput {
        GameInput input_type;
        float timestamp;
        bool consumed;
    };
    
    std::array<BufferedInput, 8> buffer;
    uint32_t write_index;
    uint32_t read_index;
    
    void add_input(GameInput input, float current_time) {
        buffer[write_index] = {input, current_time, false};
        write_index = (write_index + 1) % buffer.size();
    }
    
    bool consume_input(GameInput expected_input, float current_time) {
        for (auto& buffered : buffer) {
            if (buffered.input_type == expected_input && 
                !buffered.consumed &&
                (current_time - buffered.timestamp) <= GlobalTimings::INPUT_BUFFER_MS) {
                buffered.consumed = true;
                return true;
            }
        }
        return false;
    }
    
    void cleanup_old_inputs(float current_time) {
        for (auto& buffered : buffer) {
            if ((current_time - buffered.timestamp) > GlobalTimings::INPUT_BUFFER_MS) {
                buffered.consumed = true; // Mark as expired
            }
        }
    }
};
```

### ⚡ Buffer Usage Examples
```cpp
// Example: Combo input buffering
bool check_combo_input(InputBuffer& buffer, float current_time) {
    // Looking for Light -> Light -> Heavy combo
    if (current_combo_step == 2) { // After two lights
        return buffer.consume_input(A2_HEAVY, current_time);
    }
    return false;
}

// Example: Cancel input buffering  
bool check_cancel_input(InputBuffer& buffer, float current_time) {
    // Check for roll cancel during heavy startup
    if (is_heavy_startup() && startup_time < EARLY_CANCEL_WINDOW) {
        return buffer.consume_input(ROLL, current_time);
    }
    return false;
}
```

## Defense Mechanics

### 🛡️ Block System
```cpp
struct BlockState {
    bool is_blocking;
    float block_stamina;
    float last_block_time;
    bool can_perfect_block;
    
    void update_block(float dt) {
        if (is_blocking) {
            // Drain stamina while blocking
            block_stamina -= BlockSystem::STAMINA_DRAIN_RATE * dt;
            
            // Can't block with no stamina
            if (block_stamina <= 0.0f) {
                is_blocking = false;
                enter_guard_break_state();
            }
        }
    }
    
    float calculate_block_damage(float incoming_damage) {
        if (!is_blocking) return incoming_damage;
        
        // Reduced damage but chip damage still applies
        float blocked_damage = incoming_damage * (1.0f - BlockSystem::DAMAGE_REDUCTION);
        float chip_damage = incoming_damage * BlockSystem::CHIP_DAMAGE;
        
        return max(blocked_damage, chip_damage);
    }
};
```

### ⚡ Parry System
```cpp
struct ParrySystem {
    bool parry_window_active;
    float parry_window_remaining;
    float perfect_parry_bonus;
    
    bool attempt_parry(float attack_timing) {
        // Check if input was within parry window
        return abs(attack_timing) <= GlobalTimings::PARRY_WINDOW_MS;
    }
    
    void execute_perfect_parry(uint32_t attacker_id) {
        // Stun the attacker
        apply_stun(attacker_id, GlobalTimings::PARRY_STUN_MS);
        
        // Restore stamina to defender
        restore_stamina(25.0f);
        
        // Open up guaranteed punish window
        enable_guaranteed_punish(GlobalTimings::PARRY_STUN_MS);
    }
    
    void update_parry_system(float dt) {
        if (parry_window_active) {
            parry_window_remaining -= dt * 1000.0f;
            if (parry_window_remaining <= 0.0f) {
                parry_window_active = false;
            }
        }
    }
};
```

## Dodge System

### 🏃 Roll Mechanics
```cpp
struct DodgeState {
    bool is_rolling;
    float roll_progress;           // 0.0 to 1.0
    float iframe_remaining;        // Invincibility time left
    float slide_remaining;         // Low traction time left
    Vector2 roll_direction;        // Movement direction
    bool has_low_traction;
    
    void start_roll(Vector2 input_direction) {
        if (can_roll()) {
            is_rolling = true;
            roll_progress = 0.0f;
            iframe_remaining = GlobalTimings::ROLL_IFRAMES_MS;
            slide_remaining = GlobalTimings::ROLL_SLIDE_MS;
            roll_direction = normalize(input_direction);
            has_low_traction = false;
            
            // Consume stamina
            consume_stamina(RollSystem::STAMINA_COST);
        }
    }
    
    void update_roll(float dt) {
        if (is_rolling) {
            float dt_ms = dt * 1000.0f;
            roll_progress += dt / (RollSystem::DURATION_MS / 1000.0f);
            
            // Update invincibility frames
            if (iframe_remaining > 0.0f) {
                iframe_remaining -= dt_ms;
                set_invincible(true);
            } else {
                set_invincible(false);
            }
            
            // Update slide phase
            if (roll_progress > 0.5f && slide_remaining > 0.0f) {
                slide_remaining -= dt_ms;
                has_low_traction = true;
            } else {
                has_low_traction = false;
            }
            
            // Apply movement
            Vector2 movement = roll_direction * RollSystem::DISTANCE * dt / (RollSystem::DURATION_MS / 1000.0f);
            apply_movement(movement);
            
            // End roll
            if (roll_progress >= 1.0f) {
                end_roll();
            }
        }
    }
    
    bool is_invincible() {
        return is_rolling && iframe_remaining > 0.0f;
    }
};
```

### 🎯 Dodge Applications
```cpp
// Early roll cancels (character-specific)
bool can_early_cancel_with_roll() {
    return is_heavy_startup() && 
           heavy_startup_time < EARLY_CANCEL_WINDOW &&
           has_roll_stamina();
}

// Roll catch-up mechanics (Raider specific)
void update_roll_chase() {
    if (is_rolling && chase_input_detected()) {
        if (roll_progress < EARLY_RELEASE_THRESHOLD) {
            end_roll_early();
            maintain_momentum_for_steering();
        }
    }
}

// Low friction positioning (Kensei specific)
void update_positioning_roll() {
    if (just_started_roll()) {
        reduce_ground_friction(LOW_FRICTION_MULTIPLIER);
        enable_whiff_punish_positioning();
    }
}
```

## Resource Management

### ⚡ Stamina System
```cpp
struct StaminaSystem {
    float current_stamina;         // 0.0 to 100.0
    float max_stamina;
    float regen_rate;              // Per second
    float regen_delay;             // Delay after stamina use
    float last_stamina_use_time;
    bool is_exhausted;
    
    void update_stamina(float dt) {
        float current_time = get_game_time();
        
        // Check if in regen delay
        if (current_time - last_stamina_use_time > regen_delay) {
            // Regenerate stamina
            current_stamina = min(max_stamina, current_stamina + regen_rate * dt);
        }
        
        // Check exhaustion state
        is_exhausted = (current_stamina <= 0.0f);
    }
    
    bool consume_stamina(float amount) {
        if (current_stamina >= amount) {
            current_stamina -= amount;
            last_stamina_use_time = get_game_time();
            return true;
        }
        return false;
    }
    
    bool has_stamina_for_action(float required) {
        return current_stamina >= required && !is_exhausted;
    }
};
```

### 🛡️ Poise System
```cpp
struct PoiseSystem {
    float current_poise;           // 0.0 to 100.0
    float max_poise;
    float recovery_rate;           // Per second
    float recovery_delay;          // Delay after poise damage
    float last_poise_damage_time;
    bool is_poise_broken;
    float poise_break_duration;
    
    void update_poise(float dt) {
        float current_time = get_game_time();
        
        // Handle poise break state
        if (is_poise_broken) {
            poise_break_duration -= dt;
            if (poise_break_duration <= 0.0f) {
                is_poise_broken = false;
                current_poise = max_poise * 0.5f; // Recover to 50%
            }
            return;
        }
        
        // Poise recovery
        if (current_time - last_poise_damage_time > recovery_delay) {
            current_poise = min(max_poise, current_poise + recovery_rate * dt);
        }
    }
    
    void take_poise_damage(float damage) {
        current_poise -= damage;
        last_poise_damage_time = get_game_time();
        
        if (current_poise <= 0.0f) {
            is_poise_broken = true;
            poise_break_duration = POISE_BREAK_STUN_DURATION;
            current_poise = 0.0f;
        }
    }
    
    bool can_absorb_hit(float incoming_poise_damage) {
        return !is_poise_broken && current_poise > incoming_poise_damage;
    }
};
```

## Combat Flow

### 🌊 Flow State System
```cpp
struct FlowSystem {
    float flow_momentum;           // 0.0 to 100.0
    float momentum_decay_rate;     // Per second
    uint32_t successful_actions;   // Combo counter
    float last_successful_action;
    bool in_flow_state;
    
    void update_flow(float dt) {
        // Decay momentum over time
        flow_momentum = max(0.0f, flow_momentum - momentum_decay_rate * dt);
        
        // Check flow state threshold
        in_flow_state = (flow_momentum > FLOW_STATE_THRESHOLD);
        
        // Reset combo counter if too much time passed
        if (get_game_time() - last_successful_action > COMBO_RESET_TIME) {
            successful_actions = 0;
        }
    }
    
    void add_successful_action(ActionType action) {
        float momentum_gain = calculate_momentum_gain(action);
        flow_momentum = min(100.0f, flow_momentum + momentum_gain);
        successful_actions++;
        last_successful_action = get_game_time();
    }
    
    float get_flow_multiplier() {
        if (in_flow_state) {
            return 1.0f + (flow_momentum / 100.0f) * MAX_FLOW_BONUS;
        }
        return 1.0f;
    }
};
```

### 🔗 Combo System
```cpp
struct ComboSystem {
    uint32_t current_combo_id;
    uint32_t combo_step;
    float combo_timer;
    float combo_window;
    bool combo_active;
    
    struct ComboDefinition {
        uint32_t combo_id;
        GameInput sequence[MAX_COMBO_LENGTH];
        float timing_windows[MAX_COMBO_LENGTH];
        uint32_t length;
    };
    
    bool advance_combo(GameInput input, float current_time) {
        if (!combo_active) return false;
        
        ComboDefinition& combo = get_combo_definition(current_combo_id);
        
        // Check if input matches next step
        if (combo.sequence[combo_step] == input) {
            // Check timing window
            if (combo_timer <= combo.timing_windows[combo_step]) {
                combo_step++;
                combo_timer = 0.0f;
                
                // Check if combo complete
                if (combo_step >= combo.length) {
                    complete_combo();
                    return true;
                }
                return true;
            }
        }
        
        // Wrong input or timing - break combo
        break_combo();
        return false;
    }
    
    void update_combo_system(float dt) {
        if (combo_active) {
            combo_timer += dt;
            
            // Timeout combo if too slow
            if (combo_timer > combo_window) {
                break_combo();
            }
        }
    }
};
```

## WASM Implementation

### 🏗️ Core Data Structures
```cpp
struct GameplayState {
    // Input systems
    InputBuffer input_buffer;
    InputState current_inputs;
    InputState previous_inputs;
    
    // Combat systems
    BlockState block_state;
    ParrySystem parry_system;
    DodgeState dodge_state;
    FeintSystem feint_system;
    
    // Resource systems
    StaminaSystem stamina;
    PoiseSystem poise;
    
    // Flow systems
    FlowSystem flow;
    ComboSystem combos;
    
    // Timing
    float game_time;
    float delta_time;
};
```

### 🔄 Main Update Loop
```cpp
extern "C" {
    void update_gameplay_systems(float dt) {
        GameplayState& state = get_gameplay_state();
        
        // Update timing
        state.game_time += dt;
        state.delta_time = dt;
        
        // Process inputs
        update_input_system(state, dt);
        
        // Update combat systems
        state.block_state.update_block(dt);
        state.parry_system.update_parry_system(dt);
        state.dodge_state.update_roll(dt);
        state.feint_system.update_feint_system(dt);
        
        // Update resources
        state.stamina.update_stamina(dt);
        state.poise.update_poise(dt);
        
        // Update flow
        state.flow.update_flow(dt);
        state.combos.update_combo_system(dt);
        
        // Process combat interactions
        process_combat_interactions(dt);
    }
}
```

### 📤 Export Functions
```cpp
extern "C" {
    // Input processing
    void process_input(uint32_t input_flags, float timestamp);
    void clear_input_buffer();
    
    // Combat state queries
    bool is_blocking();
    bool is_parrying();
    bool is_rolling();
    bool can_feint();
    float get_iframe_time_remaining();
    
    // Resource queries
    float get_stamina();
    float get_max_stamina();
    float get_poise();
    float get_max_poise();
    bool is_poise_broken();
    bool is_exhausted();
    
    // Flow state queries
    float get_flow_momentum();
    bool is_in_flow_state();
    uint32_t get_combo_count();
    uint32_t get_current_combo_step();
    
    // Timing queries
    float get_parry_window_remaining();
    float get_feint_window_remaining();
    float get_combo_timer();
}
```

## JavaScript Integration

### 🎮 Input Capture
```javascript
// Input handling
class InputManager {
    constructor() {
        this.inputState = {
            lightAttack: false,
            heavyAttack: false,
            block: false,
            roll: false,
            special: false
        };
        
        this.previousState = {...this.inputState};
    }
    
    update() {
        // Detect input changes
        const inputFlags = this.calculateInputFlags();
        
        // Send to WASM with timestamp
        const timestamp = performance.now();
        wasmModule.process_input(inputFlags, timestamp);
        
        this.previousState = {...this.inputState};
    }
    
    calculateInputFlags() {
        let flags = 0;
        if (this.inputState.lightAttack && !this.previousState.lightAttack) {
            flags |= INPUT_A1_LIGHT;
        }
        if (this.inputState.heavyAttack && !this.previousState.heavyAttack) {
            flags |= INPUT_A2_HEAVY;
        }
        if (this.inputState.block) {
            flags |= INPUT_BLOCK;
        }
        if (this.inputState.roll && !this.previousState.roll) {
            flags |= INPUT_ROLL;
        }
        if (this.inputState.special && !this.previousState.special) {
            flags |= INPUT_SPECIAL;
        }
        return flags;
    }
}
```

### 🎨 UI Rendering
```javascript
// Gameplay UI updates
function updateGameplayUI() {
    // Resource bars
    const stamina = wasmModule.get_stamina();
    const maxStamina = wasmModule.get_max_stamina();
    const poise = wasmModule.get_poise();
    const maxPoise = wasmModule.get_max_poise();
    
    updateStaminaBar(stamina / maxStamina);
    updatePoiseBar(poise / maxPoise);
    
    // Combat state indicators
    const isBlocking = wasmModule.is_blocking();
    const isRolling = wasmModule.is_rolling();
    const isPoisebroken = wasmModule.is_poise_broken();
    
    updateCombatStateUI(isBlocking, isRolling, isPoisebroken);
    
    // Flow state
    const flowMomentum = wasmModule.get_flow_momentum();
    const inFlowState = wasmModule.is_in_flow_state();
    
    updateFlowIndicator(flowMomentum, inFlowState);
    
    // Combo system
    const comboCount = wasmModule.get_combo_count();
    const comboStep = wasmModule.get_current_combo_step();
    
    updateComboDisplay(comboCount, comboStep);
}

// Visual effects
function renderCombatEffects() {
    // Parry flash
    const parryWindow = wasmModule.get_parry_window_remaining();
    if (parryWindow > 0) {
        renderParryWindow(parryWindow);
    }
    
    // I-frame visualization
    const iframeTime = wasmModule.get_iframe_time_remaining();
    if (iframeTime > 0) {
        renderInvincibilityEffect(iframeTime);
    }
    
    // Feint indicator
    const feintWindow = wasmModule.get_feint_window_remaining();
    if (feintWindow > 0) {
        renderFeintWindow(feintWindow);
    }
}
```

## Testing Requirements

### 🧪 Determinism Tests
```cpp
void test_input_determinism() {
    GameplayState state1, state2;
    
    // Initialize identical states
    initialize_gameplay_state(state1, 12345);
    initialize_gameplay_state(state2, 12345);
    
    // Apply same input sequence with timing
    uint32_t inputs[] = {INPUT_A1_LIGHT, INPUT_BLOCK, INPUT_A2_HEAVY, INPUT_ROLL};
    float timings[] = {0.0f, 0.5f, 1.0f, 1.5f};
    
    for (int i = 0; i < 4; i++) {
        process_input_with_state(state1, inputs[i], timings[i]);
        process_input_with_state(state2, inputs[i], timings[i]);
        
        // Verify identical results
        assert(states_equal(state1, state2));
    }
}
```

### ⏱️ Timing Window Tests
```cpp
void test_timing_windows() {
    // Test parry window
    GameplayState state;
    initialize_gameplay_state(state, 12345);
    
    // Test various parry timings
    float test_timings[] = {0.0f, 60.0f, 120.0f, 180.0f}; // ms
    bool expected[] = {true, true, true, false};
    
    for (int i = 0; i < 4; i++) {
        bool result = test_parry_timing(state, test_timings[i]);
        assert(result == expected[i]);
    }
    
    // Test input buffer
    test_input_buffer_timing();
    
    // Test feint windows
    test_feint_timing_windows();
}

void test_resource_systems() {
    GameplayState state;
    initialize_gameplay_state(state, 12345);
    
    // Test stamina consumption
    float initial_stamina = state.stamina.current_stamina;
    consume_stamina_for_action(state, HEAVY_ATTACK);
    assert(state.stamina.current_stamina < initial_stamina);
    
    // Test poise breaking
    apply_poise_damage(state, 150.0f); // Exceed max poise
    assert(state.poise.is_poise_broken);
}
```

### 🎯 Combat Flow Tests
```cpp
void test_combo_system() {
    GameplayState state;
    initialize_gameplay_state(state, 12345);
    
    // Test valid combo sequence
    start_combo(state, LIGHT_LIGHT_HEAVY_COMBO);
    
    bool step1 = advance_combo(state, INPUT_A1_LIGHT, 0.1f);
    bool step2 = advance_combo(state, INPUT_A1_LIGHT, 0.3f);
    bool step3 = advance_combo(state, INPUT_A2_HEAVY, 0.6f);
    
    assert(step1 && step2 && step3);
    assert(is_combo_complete(state));
}

void test_flow_system() {
    GameplayState state;
    initialize_gameplay_state(state, 12345);
    
    // Build flow momentum
    for (int i = 0; i < 5; i++) {
        add_successful_action(state, LIGHT_ATTACK);
    }
    
    assert(state.flow.in_flow_state);
    assert(state.flow.get_flow_multiplier() > 1.0f);
}
```

---

## 📚 Related Documentation

- [PLAYER_CHARACTERS.md](PLAYER_CHARACTERS.md) - Character-specific abilities and movesets
- [AGENTS.md](../AGENTS.md) - WASM-first architecture principles  
- [CORE_WORLD_SIMULATION.md](CORE_WORLD_SIMULATION.md) - Physics and world systems
- [TESTING.md](../TESTING.md) - Testing frameworks and validation

---

*This document defines the core gameplay mechanics for our deterministic, WASM-based combat system. All gameplay logic must be implemented in WebAssembly to ensure consistent, high-performance execution across all clients.*

**Last updated: January 2025**
