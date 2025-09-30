# ⚔️ Combat System Architecture (WASM-First)

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [Combat State Machine](#combat-state-machine)
- [Hit Detection System](#hit-detection-system)
- [Damage Calculation](#damage-calculation)
- [Status Effect System](#status-effect-system)
- [Combat Interactions](#combat-interactions)
- [Animation Integration](#animation-integration)
- [Multiplayer Synchronization](#multiplayer-synchronization)
- [WASM Implementation](#wasm-implementation)
- [JavaScript Integration](#javascript-integration)
- [Performance Optimization](#performance-optimization)
- [Testing Requirements](#testing-requirements)

## Overview

This document defines the combat system architecture for our WASM-first multiplayer fighting game. All combat logic, state management, and calculations **MUST** be implemented in WebAssembly (C++) to ensure deterministic execution across all clients. JavaScript handles only rendering, animation playback, and UI feedback.

### 🏗️ Architecture Alignment
- **WASM-First**: All combat calculations, state transitions, and hit detection in WebAssembly
- **Deterministic**: Identical inputs produce identical combat outcomes across all clients
- **Performance Optimized**: Native-speed combat processing with frame-perfect timing
- **JavaScript as Renderer**: JS only plays animations and renders combat effects

## Architecture Principles

### 🔑 Golden Rules
1. **Keep ALL combat logic in WASM** - No damage calculations or state changes in JavaScript
2. **Frame-perfect timing** - All windows, buffers, and transitions calculated at 60 FPS precision
3. **Deterministic hit detection** - Consistent collision detection across all clients
4. **State synchronization** - Combat state must be identical on all clients

### ⚡ Combat Update Cycle
```cpp
// WASM combat update cycle (60 FPS locked)
void update_combat_system(float dt) {
    update_combat_states(dt);           // State machine progression
    process_active_hitboxes(dt);        // Hit detection and collision
    calculate_damage_interactions();    // Damage, knockback, status effects
    update_status_effects(dt);          // DOT, stuns, buffs, debuffs
    resolve_combat_priorities();       // Handle simultaneous actions
    update_animation_state();           // Sync animation with combat state
    export_combat_data_for_rendering(); // Send visual data to JS
}
```

## Combat State Machine

### 🔄 Core Combat States
```cpp
enum CombatState {
    IDLE = 0,              // Neutral, can perform any action
    LIGHT_STARTUP = 1,     // Light attack wind-up
    LIGHT_ACTIVE = 2,      // Light attack hit frames
    LIGHT_RECOVERY = 3,    // Light attack cool-down
    HEAVY_STARTUP = 4,     // Heavy attack wind-up
    HEAVY_ACTIVE = 5,      // Heavy attack hit frames
    HEAVY_RECOVERY = 6,    // Heavy attack cool-down
    BLOCKING = 7,          // Defensive guard state
    PARRYING = 8,          // Perfect block window
    ROLLING = 9,           // Dodge with i-frames
    STUNNED = 10,          // Unable to act (from parry/poise break)
    SPECIAL_STARTUP = 11,  // Character special wind-up
    SPECIAL_ACTIVE = 12,   // Character special hit frames
    SPECIAL_RECOVERY = 13, // Character special cool-down
    HITSTUN = 14,          // Reeling from taking damage
    BLOCKSTUN = 15         // Reeling from blocked attack
};
```

### 🎯 State Transition Logic
```cpp
struct CombatStateMachine {
    CombatState current_state;
    CombatState previous_state;
    float state_timer;
    float state_duration;
    bool can_cancel;
    uint32_t cancel_options;
    
    bool can_transition_to(CombatState new_state) {
        // Check valid transitions from current state
        switch (current_state) {
            case IDLE:
                return true; // Can do anything from idle
                
            case LIGHT_STARTUP:
                return new_state == BLOCKING && can_cancel; // Can feint to block
                
            case HEAVY_STARTUP:
                return (new_state == BLOCKING || new_state == ROLLING) && can_cancel;
                
            case BLOCKING:
                return new_state == PARRYING || new_state == IDLE;
                
            case ROLLING:
                return false; // Cannot cancel rolls
                
            case STUNNED:
                return false; // Cannot act while stunned
                
            default:
                return check_state_specific_transitions(current_state, new_state);
        }
    }
    
    void update_state_machine(float dt) {
        state_timer += dt;
        
        // Check for automatic state transitions
        if (state_timer >= state_duration) {
            auto_transition_state();
        }
        
        // Update cancel windows
        update_cancel_options(dt);
    }
    
    void transition_to_state(CombatState new_state) {
        if (can_transition_to(new_state)) {
            previous_state = current_state;
            current_state = new_state;
            state_timer = 0.0f;
            state_duration = get_state_duration(new_state);
            can_cancel = get_cancel_availability(new_state);
            cancel_options = get_cancel_options(new_state);
        }
    }
};
```

### ⏱️ State Timing Definitions
```cpp
struct StateTimings {
    // Light Attack Timings (400ms total)
    static constexpr float LIGHT_STARTUP_MS = 200.0f;
    static constexpr float LIGHT_ACTIVE_MS = 100.0f;
    static constexpr float LIGHT_RECOVERY_MS = 100.0f;
    
    // Heavy Attack Timings (1400ms total)
    static constexpr float HEAVY_STARTUP_MS = 800.0f;
    static constexpr float HEAVY_ACTIVE_MS = 200.0f;
    static constexpr float HEAVY_RECOVERY_MS = 400.0f;
    
    // Defense Timings
    static constexpr float PARRY_WINDOW_MS = 120.0f;
    static constexpr float BLOCK_STARTUP_MS = 100.0f;
    
    // Roll Timings (600ms total)
    static constexpr float ROLL_STARTUP_MS = 100.0f;
    static constexpr float ROLL_ACTIVE_MS = 400.0f;
    static constexpr float ROLL_RECOVERY_MS = 100.0f;
    
    // Stun Timings
    static constexpr float PARRY_STUN_MS = 300.0f;
    static constexpr float POISE_BREAK_STUN_MS = 500.0f;
    static constexpr float HITSTUN_BASE_MS = 200.0f;
    static constexpr float BLOCKSTUN_BASE_MS = 150.0f;
};
```

## Hit Detection System

### 🎯 Hitbox Architecture
```cpp
struct Hitbox {
    uint32_t owner_id;
    Vector3 position;
    Vector3 size;            // Box dimensions
    float radius;            // For sphere collisions
    HitboxType type;         // ATTACK, HURTBOX, GRAB
    uint32_t damage;
    uint32_t poise_damage;
    float knockback_force;
    Vector3 knockback_direction;
    uint32_t hit_flags;      // Properties like unblockable, armor-breaking
    float lifetime;          // How long hitbox stays active
    bool has_hit_target;     // Prevents multi-hitting
    std::vector<uint32_t> hit_targets; // Already hit entities
    
    bool check_collision(const Hitbox& other) {
        if (type == ATTACK && other.type == HURTBOX) {
            return check_box_collision(position, size, other.position, other.size);
        }
        return false;
    }
};

enum HitboxType {
    ATTACK,        // Deals damage
    HURTBOX,       // Takes damage
    GRAB,          // Special grab hitbox
    PROJECTILE     // Ranged attack
};

enum HitFlags {
    NORMAL = 0,
    UNBLOCKABLE = 1 << 0,
    ARMOR_BREAKING = 1 << 1,
    SWEEP = 1 << 2,
    OVERHEAD = 1 << 3,
    GRAB_IMMUNE = 1 << 4
};
```

### 🔍 Collision Detection
```cpp
class HitDetectionSystem {
    std::vector<Hitbox> active_hitboxes;
    std::vector<Hitbox> active_hurtboxes;
    
public:
    void update_hit_detection(float dt) {
        // Update hitbox lifetimes
        update_hitbox_lifetimes(dt);
        
        // Check all attack vs hurtbox collisions
        for (auto& attack : active_hitboxes) {
            if (attack.type != ATTACK) continue;
            
            for (auto& hurtbox : active_hurtboxes) {
                if (hurtbox.type != HURTBOX) continue;
                if (attack.owner_id == hurtbox.owner_id) continue; // No self-hit
                
                if (attack.check_collision(hurtbox)) {
                    process_hit(attack, hurtbox);
                }
            }
        }
        
        // Clean up expired hitboxes
        cleanup_expired_hitboxes();
    }
    
    void spawn_hitbox(const Hitbox& hitbox) {
        active_hitboxes.push_back(hitbox);
    }
    
    void spawn_hurtbox(const Hitbox& hurtbox) {
        active_hurtboxes.push_back(hurtbox);
    }
    
private:
    void process_hit(Hitbox& attack, Hitbox& hurtbox) {
        // Prevent multi-hitting
        if (std::find(attack.hit_targets.begin(), attack.hit_targets.end(), 
                     hurtbox.owner_id) != attack.hit_targets.end()) {
            return;
        }
        
        attack.hit_targets.push_back(hurtbox.owner_id);
        
        // Create hit event
        HitEvent hit;
        hit.attacker_id = attack.owner_id;
        hit.defender_id = hurtbox.owner_id;
        hit.damage = attack.damage;
        hit.poise_damage = attack.poise_damage;
        hit.knockback_force = attack.knockback_force;
        hit.knockback_direction = attack.knockback_direction;
        hit.hit_flags = attack.hit_flags;
        
        process_hit_event(hit);
    }
};
```

### 📏 Collision Algorithms
```cpp
bool check_box_collision(Vector3 pos1, Vector3 size1, Vector3 pos2, Vector3 size2) {
    // AABB collision detection
    return (pos1.x - size1.x/2 < pos2.x + size2.x/2 &&
            pos1.x + size1.x/2 > pos2.x - size2.x/2 &&
            pos1.y - size1.y/2 < pos2.y + size2.y/2 &&
            pos1.y + size1.y/2 > pos2.y - size2.y/2 &&
            pos1.z - size1.z/2 < pos2.z + size2.z/2 &&
            pos1.z + size1.z/2 > pos2.z - size2.z/2);
}

bool check_sphere_collision(Vector3 pos1, float radius1, Vector3 pos2, float radius2) {
    float distance_squared = length_squared(pos2 - pos1);
    float radius_sum = radius1 + radius2;
    return distance_squared <= (radius_sum * radius_sum);
}

bool check_capsule_collision(Vector3 start1, Vector3 end1, float radius1,
                           Vector3 start2, Vector3 end2, float radius2) {
    // Line segment to line segment distance
    float distance = line_segment_distance(start1, end1, start2, end2);
    return distance <= (radius1 + radius2);
}
```

## Damage Calculation

### 💥 Damage Processing Pipeline
```cpp
struct HitEvent {
    uint32_t attacker_id;
    uint32_t defender_id;
    uint32_t base_damage;
    uint32_t poise_damage;
    float knockback_force;
    Vector3 knockback_direction;
    uint32_t hit_flags;
    HitResult result; // HIT, BLOCK, PARRY, MISS
};

struct DamageCalculation {
    uint32_t final_damage;
    uint32_t final_poise_damage;
    float final_knockback;
    bool causes_knockdown;
    bool breaks_poise;
    std::vector<StatusEffect> applied_effects;
};

class DamageSystem {
public:
    DamageCalculation calculate_damage(const HitEvent& hit) {
        DamageCalculation result;
        
        // Get attacker and defender data
        CombatEntity& attacker = get_combat_entity(hit.attacker_id);
        CombatEntity& defender = get_combat_entity(hit.defender_id);
        
        // Base damage calculation
        result.final_damage = hit.base_damage;
        result.final_poise_damage = hit.poise_damage;
        result.final_knockback = hit.knockback_force;
        
        // Apply attacker modifiers
        result.final_damage = apply_attack_modifiers(attacker, result.final_damage);
        
        // Apply defender modifiers
        result.final_damage = apply_defense_modifiers(defender, result.final_damage);
        
        // Check for special interactions
        if (defender.is_blocking && !(hit.hit_flags & UNBLOCKABLE)) {
            result = apply_block_interaction(result, defender);
        }
        
        if (defender.is_parrying) {
            result = apply_parry_interaction(result, attacker, defender);
        }
        
        // Calculate poise breaking
        result.breaks_poise = (result.final_poise_damage >= defender.current_poise);
        
        // Calculate knockdown
        result.causes_knockdown = result.breaks_poise && 
                                 (result.final_knockback > KNOCKDOWN_THRESHOLD);
        
        return result;
    }
    
private:
    uint32_t apply_attack_modifiers(const CombatEntity& attacker, uint32_t damage) {
        float modifier = 1.0f;
        
        // Flow state bonus
        if (attacker.flow_momentum > 50.0f) {
            modifier *= 1.2f;
        }
        
        // Character-specific bonuses
        modifier *= get_character_damage_modifier(attacker.character_type);
        
        // Status effect modifiers
        for (const auto& effect : attacker.active_effects) {
            modifier *= effect.damage_modifier;
        }
        
        return static_cast<uint32_t>(damage * modifier);
    }
    
    uint32_t apply_defense_modifiers(const CombatEntity& defender, uint32_t damage) {
        float modifier = 1.0f;
        
        // Armor/defense stats
        modifier *= (1.0f - defender.damage_reduction);
        
        // Status effect modifiers
        for (const auto& effect : defender.active_effects) {
            modifier *= effect.damage_taken_modifier;
        }
        
        return static_cast<uint32_t>(damage * modifier);
    }
    
    DamageCalculation apply_block_interaction(DamageCalculation calc, 
                                            const CombatEntity& defender) {
        // Reduce damage significantly but allow chip damage
        calc.final_damage = static_cast<uint32_t>(calc.final_damage * 0.1f); // 90% reduction
        calc.final_poise_damage = static_cast<uint32_t>(calc.final_poise_damage * 0.5f);
        calc.final_knockback *= 0.3f;
        calc.causes_knockdown = false;
        
        // Add blockstun
        StatusEffect blockstun;
        blockstun.type = BLOCKSTUN;
        blockstun.duration = StateTimings::BLOCKSTUN_BASE_MS;
        calc.applied_effects.push_back(blockstun);
        
        return calc;
    }
    
    DamageCalculation apply_parry_interaction(DamageCalculation calc,
                                            CombatEntity& attacker,
                                            const CombatEntity& defender) {
        // Perfect parry negates all damage
        calc.final_damage = 0;
        calc.final_poise_damage = 0;
        calc.final_knockback = 0.0f;
        calc.causes_knockdown = false;
        calc.breaks_poise = false;
        
        // Stun the attacker instead
        StatusEffect parry_stun;
        parry_stun.type = STUNNED;
        parry_stun.duration = StateTimings::PARRY_STUN_MS;
        
        // Apply stun to attacker (special case)
        apply_status_effect(attacker, parry_stun);
        
        return calc;
    }
};
```

### ⚖️ Damage Types and Resistances
```cpp
enum DamageType {
    PHYSICAL = 0,
    FIRE = 1,
    ICE = 2,
    ELECTRIC = 3,
    POISON = 4,
    HOLY = 5,
    DARK = 6
};

struct DamageResistance {
    float physical_resistance;
    float fire_resistance;
    float ice_resistance;
    float electric_resistance;
    float poison_resistance;
    float holy_resistance;
    float dark_resistance;
    
    float get_resistance(DamageType type) {
        switch (type) {
            case PHYSICAL: return physical_resistance;
            case FIRE: return fire_resistance;
            case ICE: return ice_resistance;
            case ELECTRIC: return electric_resistance;
            case POISON: return poison_resistance;
            case HOLY: return holy_resistance;
            case DARK: return dark_resistance;
            default: return 0.0f;
        }
    }
};
```

## Status Effect System

### 🌟 Status Effect Architecture
```cpp
enum StatusEffectType {
    // Damage over time
    BURNING = 0,
    BLEEDING = 1,
    POISONED = 2,
    
    // Control effects
    STUNNED = 3,
    FROZEN = 4,
    SLOWED = 5,
    
    // Combat states
    HITSTUN = 6,
    BLOCKSTUN = 7,
    
    // Buffs
    DAMAGE_BOOST = 8,
    SPEED_BOOST = 9,
    ARMOR_BOOST = 10,
    
    // Debuffs
    DAMAGE_REDUCTION = 11,
    SPEED_REDUCTION = 12,
    ARMOR_REDUCTION = 13
};

struct StatusEffect {
    StatusEffectType type;
    float duration;           // Remaining time in seconds
    float intensity;          // Effect strength (0.0 to 1.0)
    float tick_rate;          // How often effect applies (for DOT)
    float last_tick_time;     // When effect last applied
    uint32_t stacks;          // How many instances are active
    uint32_t max_stacks;      // Maximum stacks allowed
    bool can_stack;           // Whether multiple instances combine
    
    void update_effect(float dt) {
        duration -= dt;
        
        if (is_tick_effect() && should_tick(dt)) {
            apply_tick_effect();
            last_tick_time += tick_rate;
        }
    }
    
    bool is_expired() {
        return duration <= 0.0f;
    }
    
    bool should_tick(float dt) {
        return (last_tick_time + tick_rate) <= dt;
    }
    
    void apply_tick_effect() {
        switch (type) {
            case BURNING:
                apply_damage(intensity * 10.0f); // 10 damage per tick
                break;
            case BLEEDING:
                apply_damage(intensity * 5.0f);
                break;
            case POISONED:
                apply_damage(intensity * 3.0f);
                reduce_stamina_regen(intensity * 0.5f);
                break;
        }
    }
};
```

### 🔄 Status Effect Manager
```cpp
class StatusEffectManager {
    std::vector<StatusEffect> active_effects;
    
public:
    void update_all_effects(float dt) {
        for (auto& effect : active_effects) {
            effect.update_effect(dt);
        }
        
        // Remove expired effects
        active_effects.erase(
            std::remove_if(active_effects.begin(), active_effects.end(),
                          [](const StatusEffect& e) { return e.is_expired(); }),
            active_effects.end()
        );
    }
    
    void apply_status_effect(const StatusEffect& new_effect) {
        // Check if effect already exists
        auto existing = find_effect(new_effect.type);
        
        if (existing != active_effects.end()) {
            if (existing->can_stack && existing->stacks < existing->max_stacks) {
                // Stack the effect
                existing->stacks++;
                existing->intensity = min(1.0f, existing->intensity + new_effect.intensity);
                existing->duration = max(existing->duration, new_effect.duration);
            } else {
                // Refresh duration
                existing->duration = new_effect.duration;
                existing->intensity = max(existing->intensity, new_effect.intensity);
            }
        } else {
            // Add new effect
            active_effects.push_back(new_effect);
        }
    }
    
    void remove_status_effect(StatusEffectType type) {
        active_effects.erase(
            std::remove_if(active_effects.begin(), active_effects.end(),
                          [type](const StatusEffect& e) { return e.type == type; }),
            active_effects.end()
        );
    }
    
    bool has_status_effect(StatusEffectType type) {
        return find_effect(type) != active_effects.end();
    }
    
    float get_effect_intensity(StatusEffectType type) {
        auto effect = find_effect(type);
        return (effect != active_effects.end()) ? effect->intensity : 0.0f;
    }
    
private:
    std::vector<StatusEffect>::iterator find_effect(StatusEffectType type) {
        return std::find_if(active_effects.begin(), active_effects.end(),
                           [type](const StatusEffect& e) { return e.type == type; });
    }
};
```

## Combat Interactions

### ⚔️ Priority Resolution System
```cpp
enum ActionPriority {
    LOW_PRIORITY = 1,      // Light attacks
    MEDIUM_PRIORITY = 2,   // Heavy attacks
    HIGH_PRIORITY = 3,     // Special moves
    SUPREME_PRIORITY = 4   // Unblockables, grabs
};

struct CombatInteraction {
    uint32_t entity1_id;
    uint32_t entity2_id;
    ActionPriority priority1;
    ActionPriority priority2;
    CombatState state1;
    CombatState state2;
    
    InteractionResult resolve_interaction() {
        // Check for defensive interactions first
        if (state1 == BLOCKING || state1 == PARRYING) {
            return resolve_defensive_interaction(entity1_id, entity2_id);
        }
        if (state2 == BLOCKING || state2 == PARRYING) {
            return resolve_defensive_interaction(entity2_id, entity1_id);
        }
        
        // Check for grab vs strike
        if (is_grab_state(state1) && is_strike_state(state2)) {
            return ENTITY1_WINS; // Grabs beat strikes
        }
        if (is_grab_state(state2) && is_strike_state(state1)) {
            return ENTITY2_WINS;
        }
        
        // Priority comparison
        if (priority1 > priority2) {
            return ENTITY1_WINS;
        } else if (priority2 > priority1) {
            return ENTITY2_WINS;
        } else {
            return TRADE; // Same priority = both hit
        }
    }
    
    InteractionResult resolve_defensive_interaction(uint32_t defender_id, uint32_t attacker_id) {
        CombatEntity& defender = get_combat_entity(defender_id);
        
        if (defender.combat_state == PARRYING) {
            // Perfect parry - defender wins
            apply_parry_effects(defender_id, attacker_id);
            return (defender_id == entity1_id) ? ENTITY1_WINS : ENTITY2_WINS;
        }
        
        if (defender.combat_state == BLOCKING) {
            // Block - reduce damage but attacker continues
            apply_block_effects(defender_id, attacker_id);
            return BLOCKED;
        }
        
        return NORMAL_HIT;
    }
};

enum InteractionResult {
    ENTITY1_WINS,
    ENTITY2_WINS,
    TRADE,
    BLOCKED,
    PARRIED,
    NORMAL_HIT,
    MISS
};
```

### 🎯 Special Interactions
```cpp
// Armor system - some attacks can't be interrupted
bool check_armor_interaction(const CombatEntity& defender, uint32_t incoming_damage) {
    // Hyperarmor (Raider specific)
    if (defender.has_hyperarmor && defender.hyperarmor_threshold > incoming_damage) {
        return true; // Attack absorbed, continue current action
    }
    
    // Super armor - immune to all interruption
    if (defender.has_super_armor) {
        return true;
    }
    
    return false; // Normal hit reaction
}

// Counter-attack system
bool check_counter_opportunity(const CombatEntity& defender, const HitEvent& hit) {
    // Some characters can counter specific attack types
    if (defender.character_type == KENSEI && hit.hit_flags & OVERHEAD) {
        return true; // Kensei can counter overhead attacks
    }
    
    if (defender.character_type == WARDEN && defender.flow_momentum > 75.0f) {
        return true; // High flow Warden can counter any attack
    }
    
    return false;
}

// Environmental interactions
void check_environmental_effects(uint32_t entity_id, Vector3 position) {
    // Wall splat
    if (check_wall_collision(position)) {
        apply_wall_splat_effect(entity_id);
    }
    
    // Ledge danger
    if (check_ledge_proximity(position)) {
        apply_ledge_danger_state(entity_id);
    }
    
    // Hazard volumes
    auto hazards = get_hazards_at_position(position);
    for (const auto& hazard : hazards) {
        apply_hazard_effect(entity_id, hazard);
    }
}
```

## Animation Integration

### 🎭 Animation State Synchronization
```cpp
struct AnimationState {
    uint32_t animation_id;
    float animation_time;
    float animation_speed;
    bool is_looping;
    uint32_t blend_priority;
    
    // Sync with combat state
    void sync_with_combat(CombatState combat_state, float state_timer) {
        animation_id = get_animation_for_combat_state(combat_state);
        animation_time = state_timer;
        animation_speed = get_animation_speed_for_state(combat_state);
    }
};

// Animation events for combat timing
struct AnimationEvent {
    float timestamp;           // When in animation this occurs
    AnimationEventType type;   // What kind of event
    
    void trigger_event() {
        switch (type) {
            case HITBOX_START:
                spawn_attack_hitbox();
                break;
            case HITBOX_END:
                despawn_attack_hitbox();
                break;
            case COMBO_WINDOW:
                enable_combo_input();
                break;
            case CANCEL_WINDOW:
                enable_cancel_options();
                break;
            case MOVEMENT_START:
                enable_movement();
                break;
            case MOVEMENT_END:
                disable_movement();
                break;
        }
    }
};

enum AnimationEventType {
    HITBOX_START,
    HITBOX_END,
    COMBO_WINDOW,
    CANCEL_WINDOW,
    MOVEMENT_START,
    MOVEMENT_END,
    SOUND_CUE,
    PARTICLE_EFFECT
};
```

### 🔄 Animation-Combat Feedback Loop
```cpp
class AnimationCombatSync {
public:
    void update_sync(float dt) {
        // Update combat state based on animation progress
        for (auto& entity : combat_entities) {
            update_entity_sync(entity, dt);
        }
    }
    
private:
    void update_entity_sync(CombatEntity& entity, float dt) {
        // Check animation events
        auto events = get_animation_events_at_time(entity.animation_state.animation_time);
        for (const auto& event : events) {
            process_animation_event(entity, event);
        }
        
        // Sync animation speed with combat flow
        if (entity.flow_momentum > 50.0f) {
            entity.animation_state.animation_speed = 1.2f; // Faster animations
        } else {
            entity.animation_state.animation_speed = 1.0f;
        }
        
        // Handle animation completion
        if (is_animation_complete(entity.animation_state)) {
            handle_animation_completion(entity);
        }
    }
    
    void process_animation_event(CombatEntity& entity, const AnimationEvent& event) {
        switch (event.type) {
            case HITBOX_START:
                spawn_hitbox_for_entity(entity);
                break;
            case HITBOX_END:
                despawn_hitbox_for_entity(entity);
                break;
            case COMBO_WINDOW:
                entity.can_combo = true;
                break;
            case CANCEL_WINDOW:
                entity.can_cancel = true;
                break;
        }
    }
};
```

## Multiplayer Synchronization

### 🌐 Network Combat State
```cpp
struct NetworkCombatState {
    uint32_t frame_number;
    uint32_t entity_id;
    CombatState combat_state;
    float state_timer;
    Vector3 position;
    Vector3 velocity;
    float stamina;
    float poise;
    uint32_t active_effects_mask;
    uint32_t checksum;
    
    // Serialize for network transmission
    void serialize(BinaryWriter& writer) {
        writer.write(frame_number);
        writer.write(entity_id);
        writer.write(static_cast<uint32_t>(combat_state));
        writer.write(state_timer);
        writer.write(position);
        writer.write(velocity);
        writer.write(stamina);
        writer.write(poise);
        writer.write(active_effects_mask);
        writer.write(checksum);
    }
    
    void deserialize(BinaryReader& reader) {
        frame_number = reader.read_uint32();
        entity_id = reader.read_uint32();
        combat_state = static_cast<CombatState>(reader.read_uint32());
        state_timer = reader.read_float();
        position = reader.read_vector3();
        velocity = reader.read_vector3();
        stamina = reader.read_float();
        poise = reader.read_float();
        active_effects_mask = reader.read_uint32();
        checksum = reader.read_uint32();
    }
};
```

### 🔄 Rollback Netcode Integration
```cpp
class CombatRollback {
    static constexpr uint32_t MAX_ROLLBACK_FRAMES = 8;
    
    std::array<NetworkCombatState, MAX_ROLLBACK_FRAMES> state_history;
    uint32_t current_frame;
    
public:
    void save_state(uint32_t frame, const CombatEntity& entity) {
        uint32_t index = frame % MAX_ROLLBACK_FRAMES;
        state_history[index] = create_network_state(frame, entity);
    }
    
    bool rollback_to_frame(uint32_t target_frame) {
        if (target_frame + MAX_ROLLBACK_FRAMES < current_frame) {
            return false; // Too far back
        }
        
        uint32_t index = target_frame % MAX_ROLLBACK_FRAMES;
        restore_state_from_network(state_history[index]);
        current_frame = target_frame;
        return true;
    }
    
    void resimulate_frames(uint32_t start_frame, uint32_t end_frame,
                          const std::vector<InputEvent>& inputs) {
        for (uint32_t frame = start_frame; frame <= end_frame; frame++) {
            // Apply inputs for this frame
            auto frame_inputs = get_inputs_for_frame(inputs, frame);
            for (const auto& input : frame_inputs) {
                process_combat_input(input);
            }
            
            // Update combat simulation
            update_combat_system(1.0f / 60.0f);
            
            // Save state for potential future rollback
            save_current_state(frame);
        }
    }
    
private:
    NetworkCombatState create_network_state(uint32_t frame, const CombatEntity& entity) {
        NetworkCombatState state;
        state.frame_number = frame;
        state.entity_id = entity.entity_id;
        state.combat_state = entity.combat_state;
        state.state_timer = entity.state_timer;
        state.position = entity.position;
        state.velocity = entity.velocity;
        state.stamina = entity.stamina.current_stamina;
        state.poise = entity.poise.current_poise;
        state.active_effects_mask = encode_active_effects(entity.status_effects);
        state.checksum = calculate_entity_checksum(entity);
        return state;
    }
};
```

## WASM Implementation

### 🏗️ Core Combat Data Structures
```cpp
struct CombatEntity {
    uint32_t entity_id;
    CharacterType character_type;
    
    // State machine
    CombatStateMachine state_machine;
    
    // Resources
    StaminaSystem stamina;
    PoiseSystem poise;
    
    // Position and movement
    Vector3 position;
    Vector3 velocity;
    Vector3 facing_direction;
    
    // Combat properties
    uint32_t health;
    uint32_t max_health;
    float damage_reduction;
    bool is_blocking;
    bool is_parrying;
    bool is_invincible;
    
    // Status effects
    StatusEffectManager status_effects;
    
    // Flow state
    float flow_momentum;
    bool in_flow_state;
    
    // Hitboxes
    std::vector<Hitbox> active_hitboxes;
    std::vector<Hitbox> active_hurtboxes;
    
    // Animation sync
    AnimationState animation_state;
};
```

### 🔄 Main Combat Update
```cpp
extern "C" {
    void update_combat_system(float dt) {
        // Update all combat entities
        for (auto& entity : combat_entities) {
            // Update state machine
            entity.state_machine.update_state_machine(dt);
            
            // Update resources
            entity.stamina.update_stamina(dt);
            entity.poise.update_poise(dt);
            
            // Update status effects
            entity.status_effects.update_all_effects(dt);
            
            // Update hitboxes
            update_entity_hitboxes(entity, dt);
        }
        
        // Process combat interactions
        hit_detection_system.update_hit_detection(dt);
        
        // Resolve combat priorities
        resolve_all_combat_interactions();
        
        // Update animation sync
        animation_combat_sync.update_sync(dt);
    }
}
```

### 📤 Combat Export Functions
```cpp
extern "C" {
    // Entity state queries
    uint32_t get_entity_combat_state(uint32_t entity_id);
    float get_entity_state_timer(uint32_t entity_id);
    uint32_t get_entity_health(uint32_t entity_id);
    float get_entity_stamina(uint32_t entity_id);
    float get_entity_poise(uint32_t entity_id);
    bool is_entity_blocking(uint32_t entity_id);
    bool is_entity_invincible(uint32_t entity_id);
    
    // Status effect queries
    uint32_t get_active_effects_count(uint32_t entity_id);
    uint32_t get_active_effect_type(uint32_t entity_id, uint32_t index);
    float get_active_effect_duration(uint32_t entity_id, uint32_t index);
    float get_active_effect_intensity(uint32_t entity_id, uint32_t index);
    
    // Combat action triggers
    bool attempt_light_attack(uint32_t entity_id);
    bool attempt_heavy_attack(uint32_t entity_id);
    bool attempt_block(uint32_t entity_id);
    bool attempt_parry(uint32_t entity_id);
    bool attempt_roll(uint32_t entity_id, float direction_x, float direction_y);
    bool attempt_special_move(uint32_t entity_id);
    
    // Hit event queries (for visual effects)
    uint32_t get_recent_hits_count();
    uint32_t get_hit_attacker_id(uint32_t hit_index);
    uint32_t get_hit_defender_id(uint32_t hit_index);
    uint32_t get_hit_damage(uint32_t hit_index);
    float get_hit_position_x(uint32_t hit_index);
    float get_hit_position_y(uint32_t hit_index);
    float get_hit_position_z(uint32_t hit_index);
    uint32_t get_hit_type(uint32_t hit_index);
}
```

## JavaScript Integration

### 🎨 Combat Rendering
```javascript
// Combat visual effects
class CombatRenderer {
    constructor() {
        this.hitEffects = [];
        this.statusEffectUI = new Map();
        this.combatStateUI = new Map();
    }
    
    update(deltaTime) {
        this.updateCombatStates();
        this.updateStatusEffects();
        this.updateHitEffects(deltaTime);
        this.renderCombatUI();
    }
    
    updateCombatStates() {
        // Update combat state visuals for all entities
        const entityCount = wasmModule.get_entity_count();
        
        for (let i = 0; i < entityCount; i++) {
            const entityId = wasmModule.get_entity_id(i);
            const combatState = wasmModule.get_entity_combat_state(entityId);
            const stateTimer = wasmModule.get_entity_state_timer(entityId);
            
            this.renderCombatState(entityId, combatState, stateTimer);
        }
    }
    
    updateStatusEffects() {
        // Render status effect indicators
        const entityCount = wasmModule.get_entity_count();
        
        for (let i = 0; i < entityCount; i++) {
            const entityId = wasmModule.get_entity_id(i);
            const effectCount = wasmModule.get_active_effects_count(entityId);
            
            const effects = [];
            for (let j = 0; j < effectCount; j++) {
                effects.push({
                    type: wasmModule.get_active_effect_type(entityId, j),
                    duration: wasmModule.get_active_effect_duration(entityId, j),
                    intensity: wasmModule.get_active_effect_intensity(entityId, j)
                });
            }
            
            this.renderStatusEffects(entityId, effects);
        }
    }
    
    updateHitEffects(deltaTime) {
        // Process recent hits for visual effects
        const hitCount = wasmModule.get_recent_hits_count();
        
        for (let i = 0; i < hitCount; i++) {
            const hit = {
                attackerId: wasmModule.get_hit_attacker_id(i),
                defenderId: wasmModule.get_hit_defender_id(i),
                damage: wasmModule.get_hit_damage(i),
                position: {
                    x: wasmModule.get_hit_position_x(i),
                    y: wasmModule.get_hit_position_y(i),
                    z: wasmModule.get_hit_position_z(i)
                },
                type: wasmModule.get_hit_type(i)
            };
            
            this.createHitEffect(hit);
        }
        
        // Update existing hit effects
        this.hitEffects = this.hitEffects.filter(effect => {
            effect.update(deltaTime);
            return !effect.isFinished();
        });
    }
    
    renderCombatState(entityId, combatState, stateTimer) {
        // Render state-specific visuals
        switch (combatState) {
            case COMBAT_STATE.LIGHT_STARTUP:
                this.renderAttackWindup(entityId, 'light', stateTimer);
                break;
            case COMBAT_STATE.HEAVY_STARTUP:
                this.renderAttackWindup(entityId, 'heavy', stateTimer);
                break;
            case COMBAT_STATE.BLOCKING:
                this.renderBlockEffect(entityId);
                break;
            case COMBAT_STATE.PARRYING:
                this.renderParryWindow(entityId);
                break;
            case COMBAT_STATE.ROLLING:
                this.renderRollEffect(entityId, stateTimer);
                break;
            case COMBAT_STATE.STUNNED:
                this.renderStunEffect(entityId);
                break;
        }
    }
    
    createHitEffect(hit) {
        const effect = new HitEffect({
            position: hit.position,
            damage: hit.damage,
            type: hit.type,
            duration: 1000 // 1 second
        });
        
        this.hitEffects.push(effect);
        
        // Trigger screen shake, particles, etc.
        this.triggerHitFeedback(hit);
    }
}

// Combat input handling
class CombatInputHandler {
    constructor() {
        this.inputBuffer = [];
        this.lastInputTime = 0;
    }
    
    handleInput(inputType, timestamp) {
        // Buffer inputs for WASM processing
        this.inputBuffer.push({
            type: inputType,
            timestamp: timestamp
        });
        
        // Send to WASM immediately
        const entityId = this.getPlayerEntityId();
        
        switch (inputType) {
            case 'lightAttack':
                wasmModule.attempt_light_attack(entityId);
                break;
            case 'heavyAttack':
                wasmModule.attempt_heavy_attack(entityId);
                break;
            case 'block':
                wasmModule.attempt_block(entityId);
                break;
            case 'parry':
                wasmModule.attempt_parry(entityId);
                break;
            case 'roll':
                const direction = this.getRollDirection();
                wasmModule.attempt_roll(entityId, direction.x, direction.y);
                break;
            case 'special':
                wasmModule.attempt_special_move(entityId);
                break;
        }
    }
    
    getRollDirection() {
        // Get movement input for roll direction
        const input = this.getMovementInput();
        return {
            x: input.horizontal,
            y: input.vertical
        };
    }
}
```

## Performance Optimization

### ⚡ Combat System Optimization
```cpp
// Spatial partitioning for hit detection
class CombatSpatialGrid {
    static constexpr int GRID_SIZE = 32;
    static constexpr float CELL_SIZE = 2.0f;
    
    struct GridCell {
        std::vector<uint32_t> entities;
        std::vector<uint32_t> hitboxes;
    };
    
    GridCell grid[GRID_SIZE][GRID_SIZE];
    
public:
    void update_grid() {
        // Clear grid
        for (auto& row : grid) {
            for (auto& cell : row) {
                cell.entities.clear();
                cell.hitboxes.clear();
            }
        }
        
        // Add entities to grid
        for (const auto& entity : combat_entities) {
            int x = static_cast<int>(entity.position.x / CELL_SIZE);
            int y = static_cast<int>(entity.position.z / CELL_SIZE);
            
            if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                grid[x][y].entities.push_back(entity.entity_id);
                
                // Add hitboxes
                for (const auto& hitbox : entity.active_hitboxes) {
                    grid[x][y].hitboxes.push_back(hitbox.owner_id);
                }
            }
        }
    }
    
    std::vector<uint32_t> get_nearby_entities(Vector3 position, float radius) {
        std::vector<uint32_t> result;
        
        int min_x = static_cast<int>((position.x - radius) / CELL_SIZE);
        int max_x = static_cast<int>((position.x + radius) / CELL_SIZE);
        int min_y = static_cast<int>((position.z - radius) / CELL_SIZE);
        int max_y = static_cast<int>((position.z + radius) / CELL_SIZE);
        
        for (int x = max(0, min_x); x <= min(GRID_SIZE - 1, max_x); x++) {
            for (int y = max(0, min_y); y <= min(GRID_SIZE - 1, max_y); y++) {
                for (uint32_t entity_id : grid[x][y].entities) {
                    result.push_back(entity_id);
                }
            }
        }
        
        return result;
    }
};

// Level of detail for distant combat
void update_combat_lod(float dt) {
    Vector3 camera_pos = get_camera_position();
    
    for (auto& entity : combat_entities) {
        float distance = length(entity.position - camera_pos);
        
        if (distance < FULL_DETAIL_RANGE) {
            // Full combat simulation
            update_entity_full_detail(entity, dt);
        } else if (distance < REDUCED_DETAIL_RANGE) {
            // Reduced frequency updates
            if (should_update_reduced_detail(entity)) {
                update_entity_reduced_detail(entity, dt * 2.0f);
            }
        } else {
            // Minimal updates
            if (should_update_minimal_detail(entity)) {
                update_entity_minimal_detail(entity, dt * 4.0f);
            }
        }
    }
}
```

## Testing Requirements

### 🧪 Combat System Tests
```cpp
void test_combat_determinism() {
    // Test identical combat scenarios produce identical results
    CombatEntity entity1, entity2;
    
    initialize_combat_entity(entity1, WARDEN, 12345);
    initialize_combat_entity(entity2, WARDEN, 12345);
    
    // Apply same combat sequence
    CombatInput sequence[] = {
        {INPUT_LIGHT_ATTACK, 0.0f},
        {INPUT_LIGHT_ATTACK, 0.5f},
        {INPUT_HEAVY_ATTACK, 1.0f},
        {INPUT_BLOCK, 1.5f}
    };
    
    for (const auto& input : sequence) {
        process_combat_input(entity1, input);
        process_combat_input(entity2, input);
        
        // Update combat state
        update_combat_entity(entity1, 1.0f/60.0f);
        update_combat_entity(entity2, 1.0f/60.0f);
        
        // Verify identical state
        assert(entities_equal(entity1, entity2));
    }
}

void test_hit_detection_accuracy() {
    CombatEntity attacker, defender;
    
    initialize_combat_entity(attacker, WARDEN, 12345);
    initialize_combat_entity(defender, RAIDER, 12345);
    
    // Position entities for hit test
    attacker.position = Vector3(0, 0, 0);
    defender.position = Vector3(1, 0, 0); // 1 unit away
    
    // Start light attack
    attempt_light_attack(attacker.entity_id);
    
    // Update until hit frames
    while (attacker.state_machine.current_state != LIGHT_ACTIVE) {
        update_combat_entity(attacker, 1.0f/60.0f);
    }
    
    // Check hit detection
    bool hit_detected = check_hit_between_entities(attacker, defender);
    assert(hit_detected); // Should hit at 1 unit range
    
    // Move defender out of range
    defender.position = Vector3(3, 0, 0); // 3 units away
    hit_detected = check_hit_between_entities(attacker, defender);
    assert(!hit_detected); // Should miss at 3 unit range
}

void test_status_effect_stacking() {
    CombatEntity entity;
    initialize_combat_entity(entity, KENSEI, 12345);
    
    // Apply multiple burning effects
    StatusEffect burn1 = create_burning_effect(5.0f, 0.5f); // 5 seconds, 50% intensity
    StatusEffect burn2 = create_burning_effect(3.0f, 0.3f); // 3 seconds, 30% intensity
    
    entity.status_effects.apply_status_effect(burn1);
    entity.status_effects.apply_status_effect(burn2);
    
    // Check stacking
    assert(entity.status_effects.has_status_effect(BURNING));
    float total_intensity = entity.status_effects.get_effect_intensity(BURNING);
    assert(total_intensity == 0.8f); // Should stack to 80%
}

void test_combat_rollback() {
    CombatRollback rollback_system;
    CombatEntity entity;
    
    initialize_combat_entity(entity, WARDEN, 12345);
    
    // Save state at frame 100
    rollback_system.save_state(100, entity);
    
    // Simulate 5 frames
    for (int i = 0; i < 5; i++) {
        update_combat_entity(entity, 1.0f/60.0f);
        rollback_system.save_state(101 + i, entity);
    }
    
    // Rollback to frame 102
    bool success = rollback_system.rollback_to_frame(102);
    assert(success);
    
    // Verify state matches frame 102
    // (Would need to compare with saved state)
}
```

---

## 📚 Related Documentation

- [PLAYER_CHARACTERS.md](../SYSTEMS/PLAYER_CHARACTERS.md) - Character-specific combat abilities
- [GAMEPLAY_MECHANICS.md](../SYSTEMS/GAMEPLAY_MECHANICS.md) - Core input and timing systems
- [AGENTS.md](../AGENTS.md) - WASM-first architecture principles
- [CORE_WORLD_SIMULATION.md](../SYSTEMS/CORE_WORLD_SIMULATION.md) - Physics integration
- [TESTING.md](../BUILD/TESTING.md) - Testing frameworks and validation

---

*This document defines the combat system architecture for our deterministic, WASM-based fighting game. All combat logic must be implemented in WebAssembly to ensure consistent, high-performance execution across all clients.*

**Last updated: January 2025**
