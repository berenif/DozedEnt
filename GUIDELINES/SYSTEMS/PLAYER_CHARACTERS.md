# 🗡️ Player Character System (WASM-First Architecture)

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Global Combat Rules](#global-combat-rules)
- [Character Definitions](#character-definitions)
  - [Warden - Balanced Pressure](#warden---balanced-pressure)
  - [Raider - Momentum Bully](#raider---momentum-bully)
  - [Kensei - Flow and Reach](#kensei---flow-and-reach)
- [WASM Implementation](#wasm-implementation)
- [JavaScript Integration](#javascript-integration)
- [Testing Requirements](#testing-requirements)

## Overview

This document defines the three player character archetypes for our WASM-first multiplayer combat system. All character logic, combat calculations, and state management **MUST** be implemented in WebAssembly (C++) to ensure deterministic execution across all clients. JavaScript handles only rendering, input capture, and UI feedback.

### 🏗️ Architecture Alignment
- **WASM-First**: All character stats, combat logic, and ability calculations in WebAssembly
- **Deterministic**: Identical inputs produce identical combat outcomes across all clients
- **Performance Optimized**: Native-speed combat calculations with minimal JS overhead
- **JavaScript as Visualizer**: JS only renders combat effects and character animations

## Architecture Principles

### 🔑 Golden Rules
1. **Keep ALL character logic in WASM** - No combat decisions in JavaScript
2. **Deterministic timing** - All frame windows, buffers, and cooldowns calculated in WASM
3. **Input validation** - All player actions processed and validated by WASM first
4. **State consistency** - Character state synchronized across all clients via WASM

### ⚡ Combat Flow
```cpp
// WASM combat update cycle
void update_character_combat(float dt) {
    process_input_buffer(dt);           // Handle queued inputs
    update_active_abilities(dt);        // Tick ability timers
    check_combat_state_transitions();   // State machine updates
    apply_status_effects(dt);          // Stamina, poise, debuffs
    calculate_damage_interactions();    // Hit detection and damage
    export_state_for_rendering();      // Send data to JS for visuals
}
```

## Global Combat Rules

### 🎮 5-Button Control System
```cpp
enum CombatInput {
    LIGHT_ATTACK = 0,    // A1 - Light attack
    HEAVY_ATTACK = 1,    // A2 - Heavy attack  
    BLOCK = 2,           // Hold to guard, tap on contact to parry
    ROLL = 3,            // Dodge with brief i-frames
    SPECIAL = 4          // Hero-specific move
};
```

### ⏱️ Universal Timing Windows
```cpp
struct GlobalTimings {
    static constexpr float INPUT_BUFFER_MS = 120.0f;    // Input buffer window
    static constexpr float PARRY_WINDOW_MS = 120.0f;    // Parry timing window
    static constexpr float PARRY_STUN_MS = 300.0f;      // Stun duration after parry
    static constexpr float ROLL_IFRAMES_MS = 300.0f;    // Invincibility frames
    static constexpr float ROLL_SLIDE_MS = 200.0f;      // Low traction slide after roll
};
```

### 🛡️ Defense Mechanics
```cpp
struct DefenseSystem {
    bool is_blocking;
    bool is_parrying;
    float parry_window_remaining;
    float block_stamina_cost;
    
    // Parry gives 300ms stun to attacker
    bool attempt_parry(float timing_offset) {
        return abs(timing_offset) <= GlobalTimings::PARRY_WINDOW_MS;
    }
};
```

### 🏃 Dodge System
```cpp
struct DodgeSystem {
    bool is_rolling;
    float iframe_time_remaining;
    float slide_time_remaining;
    bool has_low_traction;
    
    void start_roll() {
        is_rolling = true;
        iframe_time_remaining = GlobalTimings::ROLL_IFRAMES_MS;
        slide_time_remaining = GlobalTimings::ROLL_SLIDE_MS;
        has_low_traction = true;
    }
};
```

### ⚡ Stamina & Poise System
```cpp
struct ResourceSystem {
    float stamina;              // Gates big moves (0.0 to 100.0)
    float stamina_regen_rate;   // Per second recovery
    float poise;                // Absorbs small hits (0.0 to 100.0)
    float poise_recovery_rate;  // Per second recovery
    bool is_poise_broken;       // Stunned state
    
    bool can_perform_heavy_attack() {
        return stamina >= HEAVY_ATTACK_COST && !is_poise_broken;
    }
    
    void take_poise_damage(float damage) {
        poise -= damage;
        if (poise <= 0.0f) {
            is_poise_broken = true;
            poise = 0.0f;
        }
    }
};
```

### 🔄 Feint System
```cpp
struct FeintSystem {
    bool can_feint;
    float feint_window_remaining;
    
    // Heavy attacks can be feinted with Block during wind-up
    bool attempt_feint_heavy() {
        return can_feint && feint_window_remaining > 0.0f;
    }
};
```

## Character Definitions

### Warden - Balanced Pressure

#### 🛡️ Character Identity
**Role**: Balanced fighter with strong fundamentals and mix-up potential
**Playstyle**: Pressure opponent with safe pokes, feints, and shoulder bash mix-ups
**Strengths**: Versatile moveset, strong defense, reliable damage
**Weaknesses**: No extreme advantages, requires good fundamentals

#### ⚔️ Core Abilities
```cpp
struct WardenData {
    // Special: Shoulder Bash
    bool is_charging_bash;
    float bash_charge_time;
    float bash_damage;
    float bash_range;
    bool bash_checks_poise;
    
    // Core strings
    struct {
        bool light_light_heavy_combo;    // A1, A1, A2 - Safe poke into heavy
        bool heavy_feint_bash_combo;     // A2 feint → Block → Special
        bool parry_heavy_guaranteed;     // Parry → A2 guaranteed
    } combos;
};
```

#### 🎯 Special Move: Shoulder Bash
```cpp
void update_shoulder_bash(WardenData& warden, float dt) {
    if (warden.is_charging_bash) {
        warden.bash_charge_time += dt;
        
        // Charge increases damage and range
        warden.bash_damage = BASE_BASH_DAMAGE + (warden.bash_charge_time * CHARGE_MULTIPLIER);
        warden.bash_range = BASE_BASH_RANGE + (warden.bash_charge_time * RANGE_MULTIPLIER);
        
        // Release bash on input or max charge
        if (should_release_bash() || warden.bash_charge_time >= MAX_CHARGE_TIME) {
            execute_shoulder_bash(warden);
        }
    }
}

void execute_shoulder_bash(WardenData& warden) {
    // Short dash with impulse that checks poise
    apply_forward_impulse(BASH_IMPULSE_FORCE);
    
    // Check for hits during dash
    auto targets = find_targets_in_bash_range();
    for (auto& target : targets) {
        if (target.poise < warden.bash_damage) {
            target.take_poise_damage(warden.bash_damage);
            target.apply_knockback(BASH_KNOCKBACK);
        }
    }
}
```

#### 🔄 Core Combat Strings
```cpp
// A1, A1, A2 - Safe poke into heavy
bool execute_light_light_heavy(WardenData& warden) {
    if (combo_step == 0) return execute_light_attack();
    if (combo_step == 1) return execute_light_attack();
    if (combo_step == 2) return execute_heavy_attack();
    return false;
}

// A2 feint → Block → Special - Heavy feint into bash
bool execute_heavy_feint_bash(WardenData& warden) {
    if (is_heavy_winding_up() && can_feint) {
        cancel_heavy_attack();
        start_block_state();
        queue_shoulder_bash();
        return true;
    }
    return false;
}

// Parry → A2 - Guaranteed heavy after parry
bool execute_parry_punish(WardenData& warden) {
    if (just_parried_opponent()) {
        return execute_heavy_attack(); // Guaranteed hit
    }
    return false;
}
```

#### 🌊 Flow Mechanics
```cpp
void update_warden_flow(WardenData& warden, float dt) {
    // Use A2 feint to freeze opponents, cash out with Bash
    if (opponent_is_frozen_by_feint()) {
        warden.bash_effectiveness_multiplier = 1.5f;
    }
    
    // Roll cancels out of A2 start-up on early frames
    if (is_heavy_startup() && roll_input_detected()) {
        if (heavy_startup_time < EARLY_CANCEL_WINDOW) {
            cancel_heavy_attack();
            start_roll();
        }
    }
}
```

### Raider - Momentum Bully

#### ⚡ Character Identity
**Role**: Aggressive rushdown fighter with grab-based offense
**Playstyle**: Build momentum through hyperarmor, carry opponents with stampede
**Strengths**: High damage, hyperarmor, wall carry potential
**Weaknesses**: Vulnerable when momentum is lost, stamina dependent

#### 💪 Core Abilities
```cpp
struct RaiderData {
    // Special: Stampede Charge
    bool is_stampeding;
    bool has_grabbed_opponent;
    float stampede_speed;
    Vector2 stampede_direction;
    uint32_t grabbed_target_id;
    
    // Hyperarmor system
    bool hyperarmor_active;
    float hyperarmor_threshold;
    
    // Core strings
    struct {
        bool heavy_feint_light_combo;     // A2 feint → A1 (Stunning Tap)
        bool light_grab_carry_combo;      // A1 → Guardbreak → Special
        bool wall_splat_heavy_punish;     // Wall splat → A2
    } combos;
};
```

#### 🏃 Special Move: Stampede Charge
```cpp
void update_stampede_charge(RaiderData& raider, float dt) {
    if (raider.is_stampeding) {
        // Player steers the charge direction
        Vector2 input_direction = get_movement_input();
        raider.stampede_direction = lerp(raider.stampede_direction, input_direction, STEER_RATE * dt);
        
        // Move both raider and grabbed opponent
        Vector2 movement = raider.stampede_direction * raider.stampede_speed * dt;
        apply_movement(movement);
        
        if (raider.has_grabbed_opponent) {
            move_grabbed_opponent(raider.grabbed_target_id, movement);
        }
        
        // Check for wall/ledge collision to end charge
        if (check_wall_collision() || check_ledge_collision()) {
            end_stampede_charge(raider);
        }
    }
}

bool attempt_stampede_grab(RaiderData& raider) {
    auto nearby_targets = find_targets_in_grab_range();
    if (!nearby_targets.empty()) {
        auto target = select_closest_target(nearby_targets);
        raider.has_grabbed_opponent = true;
        raider.grabbed_target_id = target.id;
        raider.is_stampeding = true;
        return true;
    }
    return false;
}
```

#### 🛡️ Hyperarmor System
```cpp
void update_hyperarmor(RaiderData& raider, float dt) {
    // Hyperarmor active on A2 late frames
    if (is_heavy_attack_active() && heavy_attack_progress > HYPERARMOR_START_THRESHOLD) {
        raider.hyperarmor_active = true;
        raider.hyperarmor_threshold = RAIDER_HYPERARMOR_VALUE;
    }
    
    // Check incoming attacks against hyperarmor
    for (auto& incoming_attack : get_incoming_attacks()) {
        if (raider.hyperarmor_active && incoming_attack.damage < raider.hyperarmor_threshold) {
            // Take damage but don't get interrupted
            take_damage(incoming_attack.damage);
            continue_current_attack();
        } else {
            // Hyperarmor broken, normal hit reaction
            interrupt_current_attack();
            raider.hyperarmor_active = false;
        }
    }
}
```

#### 🔄 Core Combat Strings
```cpp
// A2 feint → A1 - Heavy fake into Stunning Tap
bool execute_heavy_feint_light(RaiderData& raider) {
    if (is_heavy_winding_up() && can_feint) {
        cancel_heavy_attack();
        return execute_light_attack_variant(STUNNING_TAP);
    }
    return false;
}

// A1 → Guardbreak → Special - Convert hit into carry
bool execute_light_grab_carry(RaiderData& raider) {
    if (light_attack_hit_confirmed()) {
        if (attempt_guardbreak()) {
            return attempt_stampede_grab(raider);
        }
    }
    return false;
}

// Wall splat → A2 - Big punish after wall carry
bool execute_wall_punish(RaiderData& raider) {
    if (opponent_wall_splatted()) {
        return execute_heavy_attack_variant(WALL_PUNISH);
    }
    return false;
}
```

#### 🌊 Flow Mechanics
```cpp
void update_raider_flow(RaiderData& raider, float dt) {
    // Roll to chase - Release early to keep traction for steering
    if (raider.is_rolling && chase_input_detected()) {
        if (roll_progress < EARLY_RELEASE_THRESHOLD) {
            end_roll_early();
            maintain_momentum_for_steering();
        }
    }
    
    // Momentum builds effectiveness
    float momentum_multiplier = calculate_momentum_multiplier(raider.recent_actions);
    raider.stampede_speed *= momentum_multiplier;
    raider.hyperarmor_threshold *= momentum_multiplier;
}
```

### Kensei - Flow and Reach

#### 🗾 Character Identity
**Role**: Technical fighter with superior range and flow-based offense
**Playstyle**: Control space with reach, use feints to maintain pressure, commit to unblockables
**Strengths**: Superior range, excellent feint game, powerful finishers
**Weaknesses**: Requires good spacing, vulnerable when flow is interrupted

#### ⚔️ Core Abilities
```cpp
struct KenseiData {
    // Special: Finisher Stance
    bool in_finisher_stance;
    bool unblockable_armed;
    float finisher_range_bonus;
    float stance_duration_remaining;
    
    // Flow system
    float flow_momentum;
    bool maintaining_lateral_drift;
    float drift_direction;
    
    // Core strings
    struct {
        bool heavy_soft_feint_light;      // A2 → Block (soft-feint) → A1
        bool light_light_finisher;        // A1, A1, Special
        bool dodge_forward_poke;          // Roll forward → A1
    } combos;
};
```

#### 🎯 Special Move: Finisher Stance
```cpp
void update_finisher_stance(KenseiData& kensei, float dt) {
    if (kensei.in_finisher_stance) {
        kensei.stance_duration_remaining -= dt;
        
        // Stance timeout
        if (kensei.stance_duration_remaining <= 0.0f) {
            exit_finisher_stance(kensei);
            return;
        }
        
        // Enhanced range while in stance
        kensei.finisher_range_bonus = FINISHER_RANGE_MULTIPLIER;
        
        // Execute unblockable heavy if input detected
        if (heavy_attack_input_detected()) {
            execute_unblockable_finisher(kensei);
        }
    }
}

bool enter_finisher_stance(KenseiData& kensei) {
    // Can enter after any hit or feint
    if (just_hit_opponent() || just_performed_feint()) {
        kensei.in_finisher_stance = true;
        kensei.unblockable_armed = true;
        kensei.stance_duration_remaining = FINISHER_STANCE_DURATION;
        kensei.finisher_range_bonus = FINISHER_RANGE_MULTIPLIER;
        return true;
    }
    return false;
}

void execute_unblockable_finisher(KenseiData& kensei) {
    // Unblockable heavy with extended range
    float enhanced_range = BASE_HEAVY_RANGE * kensei.finisher_range_bonus;
    execute_unblockable_attack(enhanced_range, FINISHER_DAMAGE);
    
    // Exit stance after use
    exit_finisher_stance(kensei);
}
```

#### 🌊 Flow System
```cpp
void update_kensei_flow(KenseiData& kensei, float dt) {
    // Use feints to maintain lateral drift
    if (is_performing_feint()) {
        kensei.maintaining_lateral_drift = true;
        kensei.flow_momentum += FEINT_FLOW_BONUS;
        
        // Lateral movement during feints
        Vector2 drift_vector = calculate_lateral_drift(kensei.drift_direction);
        apply_movement(drift_vector * kensei.flow_momentum * dt);
    }
    
    // Flow momentum decays over time
    kensei.flow_momentum = max(0.0f, kensei.flow_momentum - FLOW_DECAY_RATE * dt);
    
    // Commit to Special when opponent is frozen by feints
    if (opponent_frozen_by_feints() && kensei.flow_momentum > FLOW_THRESHOLD) {
        recommend_finisher_stance_entry();
    }
}
```

#### 🎯 Enhanced Dodge Mechanics
```cpp
void update_kensei_dodge(KenseiData& kensei, float dt) {
    // Roll start has low friction for positioning
    if (just_started_roll()) {
        reduce_ground_friction(LOW_FRICTION_MULTIPLIER);
        kensei.maintaining_lateral_drift = true;
    }
    
    // Good for whiff punish angles
    if (kensei.is_rolling && opponent_whiffed_attack()) {
        // Optimal positioning for counter-attack
        Vector2 punish_angle = calculate_whiff_punish_angle();
        adjust_roll_trajectory(punish_angle);
    }
}
```

#### 🔄 Core Combat Strings
```cpp
// A2 → Block (soft-feint) → A1 - Keep turns without overcommitting
bool execute_heavy_soft_feint_light(KenseiData& kensei) {
    if (is_heavy_winding_up()) {
        start_block_state(); // Soft feint
        kensei.maintaining_lateral_drift = true;
        return execute_light_attack();
    }
    return false;
}

// A1, A1, Special - Chain into UB finisher to check dodges
bool execute_light_chain_finisher(KenseiData& kensei) {
    if (combo_step == 2 && light_chain_active()) {
        return enter_finisher_stance(kensei);
    }
    return false;
}

// Dodge forward Roll → A1 - Slide poke
bool execute_dodge_forward_poke(KenseiData& kensei) {
    if (kensei.is_rolling && roll_direction_forward()) {
        if (roll_progress > SLIDE_POKE_WINDOW_START && roll_progress < SLIDE_POKE_WINDOW_END) {
            return execute_light_attack_variant(SLIDE_POKE);
        }
    }
    return false;
}
```

## WASM Implementation

### 🏗️ Character Data Structure
```cpp
struct PlayerCharacter {
    uint32_t character_id;
    CharacterType type;              // WARDEN, RAIDER, KENSEI
    
    // Universal systems
    ResourceSystem resources;        // Stamina, poise
    DefenseSystem defense;          // Block, parry
    DodgeSystem dodge;              // Roll, i-frames
    FeintSystem feints;             // Cancel system
    
    // Character-specific data
    union {
        WardenData warden;
        RaiderData raider;
        KenseiData kensei;
    };
    
    // Combat state
    CombatState current_state;
    float state_timer;
    uint32_t active_combo_id;
    float combo_timer;
};
```

### 🔄 Update Loop
```cpp
extern "C" {
    void update_player_character(uint32_t character_id, float dt) {
        PlayerCharacter& character = get_character(character_id);
        
        // Update universal systems
        update_resource_system(character.resources, dt);
        update_defense_system(character.defense, dt);
        update_dodge_system(character.dodge, dt);
        update_feint_system(character.feints, dt);
        
        // Update character-specific logic
        switch (character.type) {
            case WARDEN:
                update_warden_specific(character.warden, dt);
                break;
            case RAIDER:
                update_raider_specific(character.raider, dt);
                break;
            case KENSEI:
                update_kensei_specific(character.kensei, dt);
                break;
        }
        
        // Update combat state machine
        update_combat_state(character, dt);
    }
}
```

### 📤 Export Functions
```cpp
extern "C" {
    // Character state queries
    float get_character_stamina(uint32_t id);
    float get_character_poise(uint32_t id);
    uint32_t get_character_state(uint32_t id);
    bool is_character_blocking(uint32_t id);
    bool is_character_rolling(uint32_t id);
    
    // Character-specific queries
    bool is_warden_charging_bash(uint32_t id);
    float get_warden_bash_charge(uint32_t id);
    bool is_raider_stampeding(uint32_t id);
    bool has_raider_grabbed_target(uint32_t id);
    bool is_kensei_in_finisher_stance(uint32_t id);
    float get_kensei_flow_momentum(uint32_t id);
    
    // Input processing
    void process_character_input(uint32_t id, uint32_t input_flags, float dt);
    void queue_character_action(uint32_t id, uint32_t action_id);
}
```

## JavaScript Integration

### 🎨 Rendering Integration
```javascript
// Character rendering loop
function renderCharacter(characterId) {
    // Read state from WASM
    const stamina = wasmModule.get_character_stamina(characterId);
    const poise = wasmModule.get_character_poise(characterId);
    const state = wasmModule.get_character_state(characterId);
    const isBlocking = wasmModule.is_character_blocking(characterId);
    const isRolling = wasmModule.is_character_rolling(characterId);
    
    // Update UI elements
    updateStaminaBar(stamina);
    updatePoiseBar(poise);
    
    // Character-specific rendering
    const characterType = getCharacterType(characterId);
    switch (characterType) {
        case 'WARDEN':
            renderWardenEffects(characterId);
            break;
        case 'RAIDER':
            renderRaiderEffects(characterId);
            break;
        case 'KENSEI':
            renderKenseiEffects(characterId);
            break;
    }
    
    // Render combat state
    renderCombatState(state, isBlocking, isRolling);
}

function renderWardenEffects(characterId) {
    const isChargingBash = wasmModule.is_warden_charging_bash(characterId);
    const bashCharge = wasmModule.get_warden_bash_charge(characterId);
    
    if (isChargingBash) {
        renderShoulderBashCharge(bashCharge);
    }
}

function renderRaiderEffects(characterId) {
    const isStampeding = wasmModule.is_raider_stampeding(characterId);
    const hasGrabbedTarget = wasmModule.has_raider_grabbed_target(characterId);
    
    if (isStampeding) {
        renderStampedeEffect(hasGrabbedTarget);
    }
}

function renderKenseiEffects(characterId) {
    const inFinisherStance = wasmModule.is_kensei_in_finisher_stance(characterId);
    const flowMomentum = wasmModule.get_kensei_flow_momentum(characterId);
    
    if (inFinisherStance) {
        renderFinisherStanceUI();
    }
    
    renderFlowMomentumIndicator(flowMomentum);
}
```

### 🎮 Input Handling
```javascript
// Input processing
function processPlayerInput(characterId, inputState, deltaTime) {
    // Convert JS input to bit flags
    let inputFlags = 0;
    if (inputState.lightAttack) inputFlags |= INPUT_LIGHT_ATTACK;
    if (inputState.heavyAttack) inputFlags |= INPUT_HEAVY_ATTACK;
    if (inputState.block) inputFlags |= INPUT_BLOCK;
    if (inputState.roll) inputFlags |= INPUT_ROLL;
    if (inputState.special) inputFlags |= INPUT_SPECIAL;
    
    // Send to WASM for processing
    wasmModule.process_character_input(characterId, inputFlags, deltaTime);
}

// Combo input handling
function handleComboInput(characterId, actionId) {
    wasmModule.queue_character_action(characterId, actionId);
}
```

## Testing Requirements

### 🧪 Determinism Tests
```cpp
void test_character_determinism() {
    // Test identical input sequences produce identical results
    PlayerCharacter char1, char2;
    
    initialize_character(char1, WARDEN, 12345);
    initialize_character(char2, WARDEN, 12345);
    
    // Apply same input sequence
    uint32_t input_sequence[] = {
        INPUT_LIGHT_ATTACK,
        INPUT_LIGHT_ATTACK, 
        INPUT_HEAVY_ATTACK,
        INPUT_BLOCK | INPUT_SPECIAL
    };
    
    for (int i = 0; i < 4; i++) {
        process_character_input(char1.character_id, input_sequence[i], 1.0f/60.0f);
        process_character_input(char2.character_id, input_sequence[i], 1.0f/60.0f);
        
        // Verify identical state
        assert(get_character_checksum(char1) == get_character_checksum(char2));
    }
}
```

### ⏱️ Timing Validation
```cpp
void test_timing_windows() {
    // Test parry window accuracy
    PlayerCharacter character;
    initialize_character(character, WARDEN, 12345);
    
    // Test parry timing
    float test_timings[] = {0.0f, 60.0f, 120.0f, 180.0f}; // ms
    
    for (float timing : test_timings) {
        bool should_parry = (timing <= GlobalTimings::PARRY_WINDOW_MS);
        bool actual_parry = attempt_parry(character, timing);
        assert(should_parry == actual_parry);
    }
}
```

### 🎯 Character-Specific Tests
```cpp
void test_warden_shoulder_bash() {
    WardenData warden;
    
    // Test charge mechanics
    start_shoulder_bash_charge(warden);
    update_shoulder_bash(warden, 1.0f); // 1 second charge
    
    assert(warden.bash_damage > BASE_BASH_DAMAGE);
    assert(warden.bash_range > BASE_BASH_RANGE);
}

void test_raider_hyperarmor() {
    RaiderData raider;
    
    // Test hyperarmor activation
    start_heavy_attack(raider);
    simulate_attack_progress(0.7f); // 70% through attack
    
    assert(raider.hyperarmor_active);
    
    // Test hyperarmor threshold
    apply_incoming_attack(raider, LIGHT_ATTACK_DAMAGE);
    assert(is_attack_continuing(raider)); // Should not be interrupted
}

void test_kensei_finisher_stance() {
    KenseiData kensei;
    
    // Test stance entry conditions
    simulate_successful_hit(kensei);
    bool entered = enter_finisher_stance(kensei);
    
    assert(entered);
    assert(kensei.in_finisher_stance);
    assert(kensei.unblockable_armed);
}
```

---

## 📚 Related Documentation

- [AGENTS.md](../AGENTS.md) - WASM-first architecture principles
- [CORE_WORLD_SIMULATION.md](./CORE_WORLD_SIMULATION.md) - Physics and world systems
- [PLAYER_ANIMATIONS.md](../ANIMATION/PLAYER_ANIMATIONS.md) - Character animation integration
- [TESTING.md](../BUILD/TESTING.md) - Testing frameworks and validation

---

*This document defines the three player character archetypes for our deterministic, WASM-based combat system. All character logic must be implemented in WebAssembly to ensure consistent, high-performance execution across all clients.*

**Last updated: January 2025**
