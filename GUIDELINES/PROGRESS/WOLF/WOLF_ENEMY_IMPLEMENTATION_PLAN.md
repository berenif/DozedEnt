# 🐺 Wolf Enemy Implementation Plan

**Status**: 📋 Planning Phase  
**Created**: September 30, 2025  
**Priority**: High  
**Architecture**: WASM-First (All logic in C++, JS for rendering only)

---

## 📋 Table of Contents
- [Overview](#overview)
- [Phase 1: Core Wolf Structure (WASM)](#phase-1-core-wolf-structure-wasm)
- [Phase 2: Basic AI & Movement](#phase-2-basic-ai--movement)
- [Phase 3: Combat Integration](#phase-3-combat-integration)
- [Phase 4: Pack Behavior](#phase-4-pack-behavior)
- [Phase 5: Visual & Animation](#phase-5-visual--animation)
- [Phase 6: Advanced AI Features](#phase-6-advanced-ai-features)
- [Testing & Validation](#testing--validation)
- [Success Criteria](#success-criteria)

---

## 🎯 Overview

### Goals
1. **Implement functional wolf enemy** with full AI capabilities
2. **Follow WASM-first architecture** - All logic in C++, JS only for rendering
3. **Use existing documentation** as reference (ENEMY_TEMPLATE.md, WOLF_AI.md)
4. **Support pack behavior** with coordination and roles
5. **Integrate with combat system** (5-button combat, blocking, parrying)
6. **Performance target**: <0.5ms per wolf per frame, support 8+ wolves

### Key Features (from WOLF_AI.md)
- ✅ Advanced pack intelligence with 7 hunting plans
- ✅ Dynamic adaptive difficulty based on player skill
- ✅ Environmental awareness (6 terrain types)
- ✅ Enhanced memory system for player patterns
- ✅ Emotional state machine (6 states)
- ✅ Coordinated attacks and formations
- ✅ Individual wolf attributes (aggression, intelligence, morale)

### Architecture Requirements
- **All AI logic in WASM** (C++)
- **JavaScript only for**:
  - Rendering wolf sprites/animations
  - Reading WASM state for visualization
  - Input forwarding (already handled)
- **Deterministic behavior** - Same seed = same outcome
- **No Math.random() in WASM** - Use seeded RNG

---

## 📊 Phase Breakdown

### Phase 1: Core Wolf Structure (WASM)
**Duration**: 4-6 hours  
**Complexity**: Medium  
**Dependencies**: None

#### 1.1 Create WolfManager (WASM)
**File**: `public/src/wasm/managers/WolfManager.h` + `.cpp`

```cpp
// managers/WolfManager.h
#pragma once
#include <vector>
#include "../GameGlobals.h"
#include "../physics/PhysicsTypes.h"

// Wolf types (from WOLF_AI.md)
enum class WolfType : uint8_t {
    Normal = 0,
    Alpha = 1,
    Scout = 2,
    Hunter = 3,
    Omega = 4
};

// Wolf states (from ENEMY_AI.md)
enum class WolfState : uint8_t {
    Idle = 0,
    Patrol = 1,
    Investigate = 2,
    Alert = 3,
    Approach = 4,
    Strafe = 5,
    Attack = 6,
    Retreat = 7,
    Recover = 8,
    Flee = 9,
    Ambush = 10,
    Flank = 11
};

// Pack roles (from WOLF_AI.md)
enum class PackRole : uint8_t {
    Leader = 0,
    Bruiser = 1,
    Skirmisher = 2,
    Support = 3,
    Scout = 4
};

// Emotional states (from ENEMY_AI.md)
enum class EmotionalState : uint8_t {
    Calm = 0,
    Aggressive = 1,
    Fearful = 2,
    Desperate = 3,
    Confident = 4,
    Frustrated = 5
};

// Core wolf structure
struct Wolf {
    // Identity
    uint32_t id;
    WolfType type;
    
    // Physics & Position (use FixedPoint for determinism)
    FixedPoint x, y;
    FixedPoint vx, vy;
    FixedPoint facing_x, facing_y;
    
    // Stats
    float health;
    float max_health;
    float stamina;
    float damage;
    float speed;
    float detection_range;
    float attack_range;
    
    // AI State
    WolfState state;
    PackRole pack_role;
    EmotionalState emotion;
    float state_timer;
    
    // Attributes (from WOLF_AI.md)
    float aggression;    // 0.3-0.7
    float intelligence;  // 0.4-0.8
    float coordination;  // 0.5-0.8
    float morale;        // 0.6-0.8
    float awareness;     // 0-1
    
    // Pack coordination
    uint32_t pack_id;
    int pack_index;
    
    // Memory & Learning
    float player_speed_estimate;
    float player_reaction_time;
    float last_player_block_time;
    float last_player_roll_time;
    uint32_t successful_attacks;
    uint32_t failed_attacks;
    
    // Timers & Cooldowns
    float attack_cooldown;
    float dodge_cooldown;
    float decision_timer;
    
    // Animation data (for JS to read)
    float body_stretch;
    float head_pitch;
    float head_yaw;
    float tail_wag;
    float ear_rotation[2];
    float leg_positions[4][2];
};

class WolfManager {
public:
    WolfManager();
    ~WolfManager();
    
    // Core methods
    void update(float delta_time);
    void spawn_wolf(float x, float y, WolfType type);
    void remove_wolf(uint32_t wolf_id);
    void clear_all();
    
    // Pack management
    void create_pack(const std::vector<uint32_t>& wolf_ids);
    void update_pack_roles();
    void coordinate_pack_attack();
    
    // State queries (for WASM exports)
    int get_wolf_count() const { return static_cast<int>(wolves_.size()); }
    const Wolf* get_wolf(int index) const;
    
    // Adaptive difficulty
    void update_difficulty_scaling(float player_skill);
    
private:
    std::vector<Wolf> wolves_;
    uint32_t next_wolf_id_;
    
    // Internal AI methods
    void update_wolf_ai(Wolf& wolf, float delta_time);
    void update_wolf_physics(Wolf& wolf, float delta_time);
    void update_wolf_state_machine(Wolf& wolf, float delta_time);
    void update_pack_coordination(float delta_time);
    
    // Decision making
    WolfState evaluate_best_state(const Wolf& wolf);
    bool should_attack(const Wolf& wolf);
    bool should_retreat(const Wolf& wolf);
    
    // Movement & targeting
    void move_towards_player(Wolf& wolf, float delta_time);
    void circle_strafe(Wolf& wolf, float delta_time);
    float get_distance_to_player(const Wolf& wolf) const;
};
```

#### 1.2 Add to GameCoordinator
**File**: `public/src/wasm/coordinators/GameCoordinator.h`

```cpp
#include "../managers/WolfManager.h"

class GameCoordinator {
private:
    WolfManager wolf_manager_;
    
public:
    WolfManager& get_wolf_manager() { return wolf_manager_; }
    
    void update(float delta_time) {
        // ... existing updates ...
        wolf_manager_.update(delta_time);
    }
};
```

#### 1.3 Export WASM Functions
**File**: `public/src/wasm/game_refactored.cpp`

```cpp
// Wolf system exports
extern "C" {

__attribute__((export_name("spawn_wolf")))
void spawn_wolf(float x, float y, int type) {
    g_coordinator.get_wolf_manager().spawn_wolf(x, y, static_cast<WolfType>(type));
}

__attribute__((export_name("get_wolf_count")))
int get_wolf_count() {
    return g_coordinator.get_wolf_manager().get_wolf_count();
}

__attribute__((export_name("get_wolf_x")))
float get_wolf_x(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->x.to_float() : 0.0f;
}

__attribute__((export_name("get_wolf_y")))
float get_wolf_y(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->y.to_float() : 0.0f;
}

__attribute__((export_name("get_wolf_state")))
int get_wolf_state(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? static_cast<int>(wolf->state) : 0;
}

__attribute__((export_name("get_wolf_health")))
float get_wolf_health(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->health : 0.0f;
}

__attribute__((export_name("get_wolf_facing_x")))
float get_wolf_facing_x(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->facing_x.to_float() : 1.0f;
}

// Animation data exports (for JS rendering)
__attribute__((export_name("get_wolf_body_stretch")))
float get_wolf_body_stretch(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->body_stretch : 1.0f;
}

__attribute__((export_name("get_wolf_head_pitch")))
float get_wolf_head_pitch(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->head_pitch : 0.0f;
}

} // extern "C"
```

#### 1.4 Update Build Scripts
**File**: `tools/scripts/build-wasm.ps1` and `build-wasm.sh`

```powershell
$sourceFiles = @(
    # ... existing files ...
    "public/src/wasm/managers/WolfManager.cpp"
)
```

**Checklist**:
- [ ] Create WolfManager.h with all structs and enums
- [ ] Create WolfManager.cpp with basic constructor/destructor
- [ ] Add WolfManager to GameCoordinator
- [ ] Export basic WASM functions (spawn, get_count, get_position)
- [ ] Update build scripts
- [ ] Test build: `npm run wasm:build`
- [ ] Verify exports: Check WASM_EXPORTS.json

---

### Phase 2: Basic AI & Movement
**Duration**: 6-8 hours  
**Complexity**: High  
**Dependencies**: Phase 1 complete

#### 2.1 Implement State Machine
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::update_wolf_state_machine(Wolf& wolf, float delta_time) {
    wolf.state_timer -= delta_time;
    
    // State transition logic
    if (wolf.state_timer <= 0.0f) {
        WolfState new_state = evaluate_best_state(wolf);
        
        if (new_state != wolf.state) {
            // State transition
            wolf.state = new_state;
            wolf.state_timer = get_state_duration(new_state);
            on_state_enter(wolf, new_state);
        }
    }
    
    // Execute current state behavior
    switch (wolf.state) {
        case WolfState::Idle:
            update_idle_behavior(wolf, delta_time);
            break;
        case WolfState::Patrol:
            update_patrol_behavior(wolf, delta_time);
            break;
        case WolfState::Alert:
            update_alert_behavior(wolf, delta_time);
            break;
        case WolfState::Approach:
            update_approach_behavior(wolf, delta_time);
            break;
        case WolfState::Strafe:
            update_strafe_behavior(wolf, delta_time);
            break;
        case WolfState::Attack:
            update_attack_behavior(wolf, delta_time);
            break;
        case WolfState::Retreat:
            update_retreat_behavior(wolf, delta_time);
            break;
        // ... other states
    }
}

WolfState WolfManager::evaluate_best_state(const Wolf& wolf) {
    float dist_to_player = get_distance_to_player(wolf);
    
    // Detection range check
    if (dist_to_player > wolf.detection_range) {
        return wolf.state == WolfState::Patrol ? WolfState::Patrol : WolfState::Idle;
    }
    
    // Low health -> retreat
    if (wolf.health < wolf.max_health * 0.3f && wolf.morale < 0.4f) {
        return WolfState::Retreat;
    }
    
    // In attack range
    if (dist_to_player < wolf.attack_range) {
        if (wolf.attack_cooldown <= 0.0f && wolf.stamina > 0.3f) {
            return WolfState::Attack;
        }
        return WolfState::Strafe;
    }
    
    // Medium range -> approach
    if (dist_to_player < wolf.detection_range * 0.7f) {
        return WolfState::Approach;
    }
    
    // Detected player -> alert
    return WolfState::Alert;
}
```

#### 2.2 Implement Movement
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::move_towards_player(Wolf& wolf, float delta_time) {
    // Get player position from GameCoordinator
    FixedPoint player_x = g_coordinator.get_player_manager().get_player_x();
    FixedPoint player_y = g_coordinator.get_player_manager().get_player_y();
    
    // Calculate direction (deterministic using FixedPoint)
    FixedPoint dx = player_x - wolf.x;
    FixedPoint dy = player_y - wolf.y;
    
    FixedPoint distance = fixed_sqrt(dx * dx + dy * dy);
    
    if (distance > FixedPoint(0)) {
        // Normalize direction
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        // Apply movement
        FixedPoint move_speed = FixedPoint(wolf.speed * delta_time);
        wolf.vx = wolf.facing_x * move_speed;
        wolf.vy = wolf.facing_y * move_speed;
    }
}

void WolfManager::circle_strafe(Wolf& wolf, float delta_time) {
    // Maintain distance while circling
    FixedPoint player_x = g_coordinator.get_player_manager().get_player_x();
    FixedPoint player_y = g_coordinator.get_player_manager().get_player_y();
    
    FixedPoint dx = player_x - wolf.x;
    FixedPoint dy = player_y - wolf.y;
    
    // Perpendicular direction (clockwise or counter-clockwise)
    int direction = (wolf.id % 2 == 0) ? 1 : -1;
    
    FixedPoint strafe_x = -dy * FixedPoint(direction);
    FixedPoint strafe_y = dx * FixedPoint(direction);
    
    // Normalize and apply
    FixedPoint length = fixed_sqrt(strafe_x * strafe_x + strafe_y * strafe_y);
    if (length > FixedPoint(0)) {
        wolf.vx = (strafe_x / length) * FixedPoint(wolf.speed * 0.7f * delta_time);
        wolf.vy = (strafe_y / length) * FixedPoint(wolf.speed * 0.7f * delta_time);
    }
}

void WolfManager::update_wolf_physics(Wolf& wolf, float delta_time) {
    // Apply velocity
    wolf.x += wolf.vx;
    wolf.y += wolf.vy;
    
    // Apply friction
    wolf.vx *= FixedPoint(0.85f);
    wolf.vy *= FixedPoint(0.85f);
    
    // Boundary checks (keep in world bounds)
    if (wolf.x < FixedPoint(0)) wolf.x = FixedPoint(0);
    if (wolf.x > FixedPoint(1)) wolf.x = FixedPoint(1);
    if (wolf.y < FixedPoint(0)) wolf.y = FixedPoint(0);
    if (wolf.y > FixedPoint(1)) wolf.y = FixedPoint(1);
    
    // Update stamina
    wolf.stamina = std::min(1.0f, wolf.stamina + 0.1f * delta_time);
    
    // Update cooldowns
    wolf.attack_cooldown -= delta_time;
    if (wolf.attack_cooldown < 0.0f) wolf.attack_cooldown = 0.0f;
}
```

**Checklist**:
- [ ] Implement state machine with transitions
- [ ] Implement all state behaviors (Idle, Patrol, Alert, etc.)
- [ ] Implement movement towards player
- [ ] Implement circle strafing
- [ ] Implement physics update
- [ ] Add deterministic RNG for decisions
- [ ] Test: Wolves spawn and move towards player

---

### Phase 3: Combat Integration
**Duration**: 4-6 hours  
**Complexity**: Medium-High  
**Dependencies**: Phase 2, Combat System

#### 3.1 Wolf Attack System
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::update_attack_behavior(Wolf& wolf, float delta_time) {
    // Face player
    move_towards_player(wolf, 0.0f); // Just update facing
    
    // Execute attack animation/hitbox
    if (wolf.state_timer > 0.3f) {
        // Anticipation phase
        wolf.body_stretch = 0.8f; // Crouch before pounce
    } else if (wolf.state_timer > 0.1f) {
        // Attack phase - create hitbox
        wolf.body_stretch = 1.3f; // Lunge forward
        
        // Check if player is in range and not invulnerable
        if (is_player_in_attack_range(wolf)) {
            // Calculate attack direction
            float attack_dir_x = wolf.facing_x.to_float();
            float attack_dir_y = wolf.facing_y.to_float();
            
            // Send attack to combat manager
            int result = g_coordinator.get_combat_manager().handle_incoming_attack(
                wolf.x.to_float(),
                wolf.y.to_float(),
                attack_dir_x,
                attack_dir_y,
                wolf.damage
            );
            
            // Update memory based on result
            if (result == 0) {
                // Hit player
                wolf.successful_attacks++;
                wolf.morale = std::min(1.0f, wolf.morale + 0.1f);
            } else if (result == 1) {
                // Player blocked
                wolf.failed_attacks++;
                wolf.last_player_block_time = 0.0f; // Reset timer
            } else if (result == 2) {
                // Player parried - get stunned
                wolf.state = WolfState::Recover;
                wolf.state_timer = 1.5f;
                wolf.failed_attacks++;
            }
        }
    } else {
        // Recovery phase
        wolf.body_stretch = 1.0f;
    }
    
    // After attack, set cooldown
    if (wolf.state_timer <= 0.0f) {
        wolf.attack_cooldown = 1.5f / (1.0f + wolf.aggression);
        wolf.state = WolfState::Strafe;
    }
}

bool WolfManager::is_player_in_attack_range(const Wolf& wolf) {
    float dist = get_distance_to_player(wolf);
    return dist < wolf.attack_range;
}
```

#### 3.2 Wolf Takes Damage
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::damage_wolf(uint32_t wolf_id, float damage, float knockback_x, float knockback_y) {
    Wolf* wolf = find_wolf_by_id(wolf_id);
    if (!wolf) return;
    
    // Apply damage
    wolf->health -= damage;
    
    // Apply knockback
    wolf->vx = FixedPoint(knockback_x * 0.3f);
    wolf->vy = FixedPoint(knockback_y * 0.3f);
    
    // Update morale
    wolf->morale = std::max(0.0f, wolf->morale - 0.05f);
    
    // Interrupt current action
    if (wolf->state == WolfState::Attack) {
        wolf->state = WolfState::Recover;
        wolf->state_timer = 0.5f;
    }
    
    // Death check
    if (wolf->health <= 0.0f) {
        wolf->health = 0.0f;
        wolf->state = WolfState::Flee; // Or remove wolf
        // Could trigger death animation, loot drop, etc.
    }
}
```

**Export function**:
```cpp
extern "C" {
__attribute__((export_name("damage_wolf")))
void damage_wolf(int wolf_index, float damage, float knockback_x, float knockback_y) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    if (wolf) {
        g_coordinator.get_wolf_manager().damage_wolf(wolf->id, damage, knockback_x, knockback_y);
    }
}
}
```

**Checklist**:
- [ ] Implement attack behavior with anticipation/execute/recovery
- [ ] Integrate with CombatManager for hit detection
- [ ] Implement damage handling
- [ ] Implement knockback physics
- [ ] Export damage_wolf function
- [ ] Test: Wolf attacks player, player can damage wolf

---

### Phase 4: Pack Behavior
**Duration**: 6-8 hours  
**Complexity**: High  
**Dependencies**: Phase 3

#### 4.1 Pack Coordination Structure
**File**: `managers/WolfManager.h`

```cpp
// Pack hunting plans (from WOLF_AI.md)
enum class PackPlan : uint8_t {
    None = 0,
    Ambush = 1,    // Coordinated surprise attack
    Pincer = 2,    // Flank from both sides
    Retreat = 3,   // Tactical withdrawal
    Commit = 4,    // All-in synchronized attack
    Flank = 5,     // One distracts, others flank
    Distract = 6,  // Support creates openings
    Regroup = 7    // Reform formation
};

struct Pack {
    uint32_t pack_id;
    std::vector<uint32_t> wolf_ids;
    PackPlan current_plan;
    float plan_timer;
    float coordination_bonus;
    
    // Pack state
    float pack_morale;
    int leader_index;
};

class WolfManager {
private:
    std::vector<Pack> packs_;
    
    void update_pack_ai(Pack& pack, float delta_time);
    void assign_pack_roles(Pack& pack);
    void execute_pack_plan(Pack& pack);
};
```

#### 4.2 Pack Plan Execution
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::execute_pack_plan(Pack& pack) {
    switch (pack.current_plan) {
        case PackPlan::Ambush:
            execute_ambush_plan(pack);
            break;
        case PackPlan::Pincer:
            execute_pincer_plan(pack);
            break;
        case PackPlan::Commit:
            execute_commit_plan(pack);
            break;
        // ... other plans
    }
}

void WolfManager::execute_pincer_plan(Pack& pack) {
    // Divide pack into two flanking groups
    int mid = pack.wolf_ids.size() / 2;
    
    for (size_t i = 0; i < pack.wolf_ids.size(); i++) {
        Wolf* wolf = find_wolf_by_id(pack.wolf_ids[i]);
        if (!wolf) continue;
        
        // Get player position
        FixedPoint player_x = g_coordinator.get_player_manager().get_player_x();
        FixedPoint player_y = g_coordinator.get_player_manager().get_player_y();
        
        // Calculate flanking position (left or right side)
        float angle = (i < mid) ? -PI / 3.0f : PI / 3.0f;
        float target_x = player_x.to_float() + std::cos(angle) * 0.15f;
        float target_y = player_y.to_float() + std::sin(angle) * 0.15f;
        
        // Move to flanking position
        move_wolf_to_position(*wolf, target_x, target_y);
        
        // Coordinate attack timing
        if (wolves_in_position(pack)) {
            wolf->state = WolfState::Attack;
        }
    }
}

void WolfManager::assign_pack_roles(Pack& pack) {
    // Sort wolves by attributes
    std::vector<Wolf*> wolves;
    for (uint32_t id : pack.wolf_ids) {
        Wolf* w = find_wolf_by_id(id);
        if (w) wolves.push_back(w);
    }
    
    if (wolves.empty()) return;
    
    // Assign leader (highest intelligence + morale)
    Wolf* leader = wolves[0];
    float best_score = leader->intelligence * leader->morale;
    
    for (Wolf* w : wolves) {
        float score = w->intelligence * w->morale;
        if (score > best_score) {
            leader = w;
            best_score = score;
        }
    }
    leader->pack_role = PackRole::Leader;
    
    // Assign other roles based on attributes
    for (Wolf* w : wolves) {
        if (w == leader) continue;
        
        if (w->aggression > 0.6f) {
            w->pack_role = PackRole::Bruiser;
        } else if (w->speed > 280.0f) {
            w->pack_role = PackRole::Skirmisher;
        } else if (w->intelligence > 0.7f) {
            w->pack_role = PackRole::Support;
        } else {
            w->pack_role = PackRole::Scout;
        }
    }
}
```

**Checklist**:
- [ ] Implement Pack structure
- [ ] Implement pack creation/management
- [ ] Implement all 7 pack plans
- [ ] Implement role assignment
- [ ] Implement coordinated attacks
- [ ] Test: Multiple wolves coordinate attacks

---

### Phase 5: Visual & Animation (JavaScript)
**Duration**: 4-6 hours  
**Complexity**: Medium  
**Dependencies**: Phase 1-3

#### 5.1 Wolf Renderer (JavaScript)
**File**: `public/src/demo/wolf-renderer.js`

```javascript
export class WolfRenderer {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.wolfSprites = null; // Load sprite sheet
    }
    
    render(ctx, camera) {
        const wolfCount = this.wasm.get_wolf_count();
        
        for (let i = 0; i < wolfCount; i++) {
            this.renderWolf(ctx, camera, i);
        }
    }
    
    renderWolf(ctx, camera, wolfIndex) {
        // Read WASM state
        const x = this.wasm.get_wolf_x(wolfIndex);
        const y = this.wasm.get_wolf_y(wolfIndex);
        const state = this.wasm.get_wolf_state(wolfIndex);
        const health = this.wasm.get_wolf_health(wolfIndex);
        const facingX = this.wasm.get_wolf_facing_x(wolfIndex);
        
        // Animation data
        const bodyStretch = this.wasm.get_wolf_body_stretch(wolfIndex);
        const headPitch = this.wasm.get_wolf_head_pitch(wolfIndex);
        
        // Convert to screen coordinates
        const screenX = (x - camera.x) * camera.scale + camera.width / 2;
        const screenY = (y - camera.y) * camera.scale + camera.height / 2;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(facingX, 1); // Flip horizontally based on facing
        
        // Render wolf body (procedural or sprite)
        this.renderWolfBody(ctx, state, bodyStretch, headPitch);
        
        // Health bar
        this.renderHealthBar(ctx, health);
        
        ctx.restore();
    }
    
    renderWolfBody(ctx, state, bodyStretch, headPitch) {
        // Simple procedural wolf (can be replaced with sprites)
        const baseSize = 40;
        const size = baseSize * bodyStretch;
        
        // Body (ellipse)
        ctx.fillStyle = '#8B7355';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.save();
        ctx.translate(-size * 0.5, 0);
        ctx.rotate(headPitch);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Legs (4 stick legs)
        ctx.strokeStyle = '#6B5345';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const offsetX = (i < 2 ? -15 : 15);
            const offsetY = (i % 2 === 0 ? -10 : 10);
            ctx.beginPath();
            ctx.moveTo(offsetX, 0);
            ctx.lineTo(offsetX, 20);
            ctx.stroke();
        }
        
        // Tail
        ctx.beginPath();
        ctx.moveTo(size * 0.6, 0);
        ctx.quadraticCurveTo(size * 0.8, -10, size, -15);
        ctx.stroke();
    }
    
    renderHealthBar(ctx, health) {
        const barWidth = 40;
        const barHeight = 4;
        const y = -30;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth / 2, y, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = health > 0.5 ? '#44ff44' : health > 0.25 ? '#ffff44' : '#ff4444';
        ctx.fillRect(-barWidth / 2, y, barWidth * health, barHeight);
    }
}
```

#### 5.2 Integrate into Demo
**File**: `public/src/demo/renderer.js`

```javascript
import { WolfRenderer } from './wolf-renderer.js';

class DemoRenderer {
    constructor() {
        // ... existing code ...
        this.wolfRenderer = null;
    }
    
    init(wasmModule) {
        // ... existing code ...
        this.wolfRenderer = new WolfRenderer(wasmModule);
    }
    
    render(ctx, camera) {
        // ... existing rendering ...
        
        // Render wolves
        if (this.wolfRenderer) {
            this.wolfRenderer.render(ctx, camera);
        }
    }
}
```

#### 5.3 Wolf Spawn UI
**File**: `public/demo.html` or `public/index.html`

```javascript
// Add button to spawn wolves for testing
function addWolfSpawnButton() {
    const button = document.createElement('button');
    button.textContent = 'Spawn Wolf';
    button.style.position = 'absolute';
    button.style.top = '10px';
    button.style.right = '10px';
    button.onclick = () => {
        if (wasmModule) {
            // Spawn at random position
            const x = 0.5 + (Math.random() - 0.5) * 0.3;
            const y = 0.5 + (Math.random() - 0.5) * 0.3;
            wasmModule.spawn_wolf(x, y, 0); // Normal wolf
        }
    };
    document.body.appendChild(button);
}
```

**Checklist**:
- [ ] Create WolfRenderer class
- [ ] Implement procedural wolf rendering
- [ ] Integrate with demo renderer
- [ ] Add spawn button for testing
- [ ] Test: Wolves render correctly at different positions
- [ ] Add sprite sheet support (optional)

---

### Phase 6: Advanced AI Features
**Duration**: 6-8 hours  
**Complexity**: High  
**Dependencies**: Phase 2-4

#### 6.1 Adaptive Difficulty
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::update_difficulty_scaling(float player_skill) {
    // player_skill: 0.0 (beginner) to 1.0 (expert)
    
    for (Wolf& wolf : wolves_) {
        // Adjust speed (0.85x - 1.15x)
        float speed_mult = 0.85f + (player_skill * 0.3f);
        wolf.speed = base_wolf_speed * speed_mult;
        
        // Adjust aggression (0.3 - 0.85)
        wolf.aggression = 0.3f + (player_skill * 0.55f);
        
        // Adjust reaction time
        float reaction_delay = 0.22f - (player_skill * 0.13f); // 220ms to 90ms
        wolf.decision_timer = std::max(0.09f, reaction_delay);
        
        // Interpolate changes smoothly (10% per update)
        // This prevents jarring difficulty spikes
    }
}

float WolfManager::estimate_player_skill() {
    // Track player performance metrics
    float dodge_rate = player_dodges / (float)std::max(1, total_attacks);
    float block_rate = player_blocks / (float)std::max(1, total_attacks);
    float kill_speed = 1.0f / std::max(1.0f, average_kill_time);
    
    // Combine metrics
    float skill = (dodge_rate * 0.4f + block_rate * 0.3f + kill_speed * 0.3f);
    return std::clamp(skill, 0.0f, 1.0f);
}
```

#### 6.2 Emotional State System
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::update_wolf_emotion(Wolf& wolf, float delta_time) {
    // Update emotion based on situation
    float health_percent = wolf.health / wolf.max_health;
    float success_rate = wolf.successful_attacks / 
                         (float)std::max(1, wolf.successful_attacks + wolf.failed_attacks);
    
    // Determine emotion
    if (health_percent < 0.3f) {
        wolf.emotion = EmotionalState::Fearful;
    } else if (success_rate > 0.7f && wolf.morale > 0.7f) {
        wolf.emotion = EmotionalState::Confident;
    } else if (wolf.failed_attacks > 5 && success_rate < 0.3f) {
        wolf.emotion = EmotionalState::Frustrated;
    } else if (health_percent < 0.2f && pack_members_alive < 2) {
        wolf.emotion = EmotionalState::Desperate;
    } else if (wolf.aggression > 0.6f && in_attack_range) {
        wolf.emotion = EmotionalState::Aggressive;
    } else {
        wolf.emotion = EmotionalState::Calm;
    }
    
    // Apply emotion effects to behavior
    apply_emotion_modifiers(wolf);
}

void WolfManager::apply_emotion_modifiers(Wolf& wolf) {
    switch (wolf.emotion) {
        case EmotionalState::Confident:
            wolf.attack_cooldown *= 0.8f; // Attack more frequently
            wolf.damage *= 1.1f;
            break;
        case EmotionalState::Fearful:
            wolf.detection_range *= 1.3f; // More cautious
            wolf.attack_range *= 0.7f; // Keep distance
            break;
        case EmotionalState::Frustrated:
            wolf.aggression = std::min(1.0f, wolf.aggression + 0.2f);
            wolf.coordination *= 0.7f; // Less coordinated
            break;
        case EmotionalState::Desperate:
            wolf.damage *= 1.3f; // High risk, high reward
            wolf.morale *= 0.5f;
            break;
        // ... other emotions
    }
}
```

#### 6.3 Memory & Learning
**File**: `managers/WolfManager.cpp`

```cpp
void WolfManager::update_wolf_memory(Wolf& wolf, float delta_time) {
    // Track player patterns
    FixedPoint player_vx = g_coordinator.get_player_manager().get_player_vx();
    FixedPoint player_vy = g_coordinator.get_player_manager().get_player_vy();
    float player_speed = std::sqrt(player_vx.to_float() * player_vx.to_float() + 
                                   player_vy.to_float() * player_vy.to_float());
    
    // Exponential moving average
    float alpha = 0.1f;
    wolf.player_speed_estimate = wolf.player_speed_estimate * (1.0f - alpha) + 
                                  player_speed * alpha;
    
    // Update last block/roll timers
    wolf.last_player_block_time += delta_time;
    wolf.last_player_roll_time += delta_time;
    
    // Use memory for decision making
    if (wolf.last_player_block_time < 1.0f) {
        // Player recently blocked, use feint or wait
        wolf.attack_cooldown += 0.5f;
    }
    
    if (wolf.player_speed_estimate > 0.4f) {
        // Player is fast, increase anticipation
        wolf.intelligence = std::min(0.9f, wolf.intelligence + 0.1f);
    }
}
```

**Checklist**:
- [ ] Implement adaptive difficulty system
- [ ] Implement emotional state machine
- [ ] Implement emotion-based behavior modifiers
- [ ] Implement memory & learning system
- [ ] Implement player skill estimation
- [ ] Test: Wolves adapt to player performance

---

## 🧪 Testing & Validation

### Unit Tests
**File**: `test/unit/wolf-manager.test.js`

```javascript
describe('WolfManager', () => {
    let wasmModule;
    
    beforeEach(() => {
        wasmModule = loadWasmModule();
        wasmModule.init_run(12345, 0);
    });
    
    describe('Wolf Spawning', () => {
        it('should spawn wolf at correct position', () => {
            wasmModule.spawn_wolf(0.5, 0.3, 0);
            
            expect(wasmModule.get_wolf_count()).to.equal(1);
            expect(wasmModule.get_wolf_x(0)).to.be.closeTo(0.5, 0.01);
            expect(wasmModule.get_wolf_y(0)).to.be.closeTo(0.3, 0.01);
        });
        
        it('should spawn multiple wolves', () => {
            wasmModule.spawn_wolf(0.2, 0.2, 0);
            wasmModule.spawn_wolf(0.8, 0.8, 1);
            
            expect(wasmModule.get_wolf_count()).to.equal(2);
        });
    });
    
    describe('Wolf AI', () => {
        it('should move towards player', () => {
            wasmModule.spawn_wolf(0.8, 0.8, 0);
            const initialX = wasmModule.get_wolf_x(0);
            
            // Update multiple frames
            for (let i = 0; i < 60; i++) {
                wasmModule.update(0, 0, 0, 0.016);
            }
            
            const finalX = wasmModule.get_wolf_x(0);
            expect(finalX).to.be.lessThan(initialX); // Moved closer
        });
        
        it('should attack when in range', () => {
            wasmModule.spawn_wolf(0.5, 0.5, 0);
            
            // Move player close
            // ... update until wolf attacks
            
            const state = wasmModule.get_wolf_state(0);
            expect(state).to.equal(6); // Attack state
        });
    });
    
    describe('Wolf Combat', () => {
        it('should take damage correctly', () => {
            wasmModule.spawn_wolf(0.5, 0.5, 0);
            const initialHealth = wasmModule.get_wolf_health(0);
            
            wasmModule.damage_wolf(0, 10, 0.1, 0);
            
            const finalHealth = wasmModule.get_wolf_health(0);
            expect(finalHealth).to.equal(initialHealth - 10);
        });
    });
});
```

### Integration Tests
**File**: `test/integration/wolf-gameplay.test.js`

```javascript
describe('Wolf Gameplay Integration', () => {
    it('should complete full combat encounter', async () => {
        // Load demo page
        await page.goto('http://localhost:8080/demo.html');
        
        // Spawn wolves
        await page.evaluate(() => {
            window.wasmModule.spawn_wolf(0.7, 0.5, 0);
            window.wasmModule.spawn_wolf(0.3, 0.5, 0);
        });
        
        // Simulate player movement and combat
        // ... keyboard events, attack inputs ...
        
        // Verify wolves behave correctly
        const wolfCount = await page.evaluate(() => window.wasmModule.get_wolf_count());
        expect(wolfCount).to.equal(2);
    });
});
```

### Performance Tests
**File**: `test/performance/wolf-performance.test.js`

```javascript
describe('Wolf Performance', () => {
    it('should handle 8 wolves at 60 FPS', () => {
        wasmModule.init_run(12345, 0);
        
        // Spawn 8 wolves
        for (let i = 0; i < 8; i++) {
            wasmModule.spawn_wolf(0.5 + Math.random() * 0.2, 0.5 + Math.random() * 0.2, 0);
        }
        
        // Measure update time
        const iterations = 1000;
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            wasmModule.update(0, 0, 0, 0.016);
        }
        
        const end = performance.now();
        const avgFrameTime = (end - start) / iterations;
        
        expect(avgFrameTime).to.be.lessThan(4); // <4ms per frame with 8 wolves
    });
});
```

### Determinism Tests
```javascript
describe('Wolf Determinism', () => {
    it('should produce identical results with same seed', () => {
        const seed = 99999;
        
        // Run 1
        wasmModule.init_run(seed, 0);
        wasmModule.spawn_wolf(0.5, 0.5, 0);
        for (let i = 0; i < 100; i++) {
            wasmModule.update(0, 0, 0, 0.016);
        }
        const run1_x = wasmModule.get_wolf_x(0);
        const run1_y = wasmModule.get_wolf_y(0);
        
        // Run 2
        wasmModule.init_run(seed, 0);
        wasmModule.spawn_wolf(0.5, 0.5, 0);
        for (let i = 0; i < 100; i++) {
            wasmModule.update(0, 0, 0, 0.016);
        }
        const run2_x = wasmModule.get_wolf_x(0);
        const run2_y = wasmModule.get_wolf_y(0);
        
        expect(run1_x).to.equal(run2_x);
        expect(run1_y).to.equal(run2_y);
    });
});
```

---

## ✅ Success Criteria

### Core Functionality
- [ ] **Wolf spawns correctly** at specified position
- [ ] **Wolf moves towards player** using pathfinding
- [ ] **Wolf attacks player** when in range
- [ ] **Wolf takes damage** from player attacks
- [ ] **Wolf health system** works correctly
- [ ] **Wolf state machine** transitions properly
- [ ] **Wolf respects physics** (collision, boundaries)

### Pack Behavior
- [ ] **Multiple wolves coordinate** attacks
- [ ] **Pack roles assigned** dynamically
- [ ] **All 7 pack plans** implemented
- [ ] **Pack formation maintained** during movement
- [ ] **Pack adapts** to player tactics

### Advanced Features
- [ ] **Adaptive difficulty** scales with player skill
- [ ] **Emotional states** affect behavior
- [ ] **Memory system** tracks player patterns
- [ ] **Terrain awareness** uses positioning tactically

### Performance
- [ ] **<0.5ms per wolf** update time
- [ ] **8+ wolves** at stable 60 FPS
- [ ] **Deterministic** - Same seed = same behavior
- [ ] **No memory leaks** - Stable over time

### Visual & UX
- [ ] **Wolf renders correctly** at all positions
- [ ] **Animations smooth** and responsive
- [ ] **Health bar displays** correctly
- [ ] **State transitions visible** to player
- [ ] **Pack coordination visible** to player

### Testing
- [ ] **All unit tests pass** (>90% coverage)
- [ ] **Integration tests pass** (gameplay scenarios)
- [ ] **Performance tests pass** (frame time targets)
- [ ] **Determinism tests pass** (replay consistency)

---

## 📚 Documentation Updates

After implementation, update:
- [ ] `BUILD/API.md` - Add wolf-related WASM exports
- [ ] `GAME/GAME_FEATURES_SUMMARY.md` - Document wolf system
- [ ] `AI/ENEMY_AI.md` - Mark wolf AI as implemented
- [ ] `PROJECT_STRUCTURE.md` - Add WolfManager files
- [ ] `WASM_EXPORTS.json` - Auto-generated by build
- [ ] Create `WOLF_IMPLEMENTATION_STATUS.md` - Mark complete

---

## 🚀 Quick Start Guide (After Implementation)

### Spawning Wolves
```javascript
// JavaScript
wasmModule.spawn_wolf(0.7, 0.5, 0); // Normal wolf at (0.7, 0.5)
wasmModule.spawn_wolf(0.3, 0.5, 1); // Alpha wolf
```

### Reading Wolf State
```javascript
const count = wasmModule.get_wolf_count();
for (let i = 0; i < count; i++) {
    const x = wasmModule.get_wolf_x(i);
    const y = wasmModule.get_wolf_y(i);
    const health = wasmModule.get_wolf_health(i);
    const state = wasmModule.get_wolf_state(i);
    
    // Render wolf...
}
```

### Damaging Wolves
```javascript
// When player attacks
if (playerAttacking) {
    const hitWolf = checkWolfHit(); // Your collision detection
    if (hitWolf !== -1) {
        wasmModule.damage_wolf(hitWolf, 25, knockbackX, knockbackY);
    }
}
```

---

## 📊 Estimated Timeline

| Phase | Duration | Complexity | Priority |
|-------|----------|------------|----------|
| 1. Core Structure | 4-6 hours | Medium | Critical |
| 2. AI & Movement | 6-8 hours | High | Critical |
| 3. Combat | 4-6 hours | Medium-High | Critical |
| 4. Pack Behavior | 6-8 hours | High | High |
| 5. Visual/Animation | 4-6 hours | Medium | High |
| 6. Advanced AI | 6-8 hours | High | Medium |
| Testing | 4-6 hours | Medium | Critical |
| **Total** | **34-48 hours** | **High** | - |

**Recommended Approach**: 
- Complete phases 1-3 first (minimum viable wolf)
- Test thoroughly before proceeding
- Phases 4-6 can be incremental improvements

---

## 🎯 Milestones

### Milestone 1: Basic Wolf (Phases 1-3)
- Wolf spawns, moves, attacks, takes damage
- Integrated with combat system
- **ETA**: 14-20 hours

### Milestone 2: Pack Intelligence (Phase 4)
- Multiple wolves coordinate
- Pack plans functional
- **ETA**: +6-8 hours

### Milestone 3: Full Polish (Phases 5-6)
- Advanced AI features
- Visual polish
- **ETA**: +10-14 hours

---

**Implementation Start**: TBD  
**Target Completion**: TBD  
**Maintainer**: AI Agent

---

*This plan follows the WASM-first architecture principles and existing documentation standards. All game logic will be in C++, with JavaScript handling only visualization.*

