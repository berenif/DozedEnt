# 🎮 Physics-First Complete Overhaul Implementation Plan

## 📋 Executive Summary

This document outlines the complete redesign of the game to be **physics-first**, where all gameplay emerges from physics simulation rather than being scripted. This is a comprehensive overhaul, not incremental integration.

### Core Philosophy
- **Everything is a physics object** - Player, enemies, projectiles, items, environment
- **Combat emerges from physics** - Damage from momentum transfer, positioning from forces
- **Direct interaction** - Players push, pull, throw, manipulate physical objects
- **Emergent complexity** - Simple physics rules create complex gameplay scenarios

### Target Specifications
- **Platform:** Mobile-first (60fps on mid-tier devices), desktop secondary
- **Physics objects:** 100+ simultaneous (player, 20-30 enemies, 50+ environment objects)
- **WASM size:** Accept significant increase for full physics engine
- **Architecture:** Complete refactor of Player/Combat/Input managers to be physics-driven

---

## 🗺️ Phase Overview

```
Phase 0: Foundation & Architecture
  ↓
Phase 1: Core Physics Engine
  ↓
Phase 2: Physics-Driven Combat
  ↓
Phase 3: Enemy Physics Integration
  ↓
Phase 4: Direct Interaction Systems
  ↓
Phase 5: Optimization & Polish
```

---

## 🎯 Phase 0: Foundation & Architecture

### Objectives
- Establish physics-first architecture
- Set up build system for physics integration
- Create new manager hierarchy
- Define physics API contract

### Tasks

#### 0.1: Architecture Design
**File:** `/workspace/GUIDELINES/SYSTEMS/PHYSICS_ARCHITECTURE.md`

```markdown
# Physics-First Architecture

## Core Principles
1. All game objects are RigidBody entities
2. Managers query/manipulate physics, don't own state
3. Physics simulation runs at fixed 60Hz timestep
4. Deterministic simulation for multiplayer

## Manager Hierarchy
PhysicsManager (Core)
  ├── RigidBodyManager (object lifecycle)
  ├── CollisionManager (detection & resolution)
  ├── ForceManager (gravity, impulses, constraints)
  └── SpatialPartitionManager (broad-phase)

GameCoordinator
  ├── PhysicsManager (NEW - owns all state)
  ├── InputManager (REFACTOR - applies forces)
  ├── CombatManager (REFACTOR - physics-driven)
  └── EntityManager (NEW - replaces PlayerManager)
```

#### 0.2: Build System Integration
**Files to modify:**
- `/workspace/src/CMakeLists.txt` - Add physics sources
- `/workspace/tools/scripts/build-wasm.sh` - Ensure physics headers included

**New files:**
```
src/
├── physics/
│   ├── PhysicsManager.h/.cpp
│   ├── RigidBodyManager.h/.cpp
│   ├── CollisionManager.h/.cpp
│   ├── ForceManager.h/.cpp
│   └── SpatialPartition.h/.cpp
├── entities/
│   ├── Entity.h/.cpp (base physics entity)
│   ├── PlayerEntity.h/.cpp (replaces PlayerManager)
│   └── EnemyEntity.h/.cpp
└── wasm/
    ├── physics_backbone.h (move from public/src/wasm/)
    ├── chemistry_system.h (move from public/src/wasm/)
    └── world_simulation.h (move from public/src/wasm/)
```

#### 0.3: Core Data Structures
**File:** `/workspace/src/physics/PhysicsTypes.h`

```cpp
#pragma once
#include <cmath>
#include <vector>

// Core physics types
struct Vector3 { float x, y, z; /* operations */ };
struct Vector2 { float x, y; /* operations */ };
struct Quaternion { float x, y, z, w; /* operations */ };

// Physics body definition
struct RigidBody {
    uint32_t id;
    Vector3 position;
    Vector3 velocity;
    Vector3 acceleration;
    Quaternion rotation;
    Vector3 angular_velocity;
    
    float mass;
    float inverse_mass;
    float drag;
    float angular_drag;
    Vector3 inertia_tensor;
    
    // Material properties
    float friction;
    float restitution; // bounciness
    float density;
    
    // Collision shape
    enum Shape { SPHERE, BOX, CAPSULE, MESH } shape;
    Vector3 shape_extents;
    float radius;
    
    // State flags
    bool is_kinematic;    // Driven by code, not physics
    bool is_static;       // Never moves
    bool is_trigger;      // No collision, just detection
    bool is_grounded;
    
    // Collision layers (bit flags)
    uint32_t collision_layer;
    uint32_t collision_mask;
};

// Collision detection
struct CollisionContact {
    uint32_t body_a_id;
    uint32_t body_b_id;
    Vector3 point;
    Vector3 normal;
    float penetration;
    float impulse_magnitude;
};

// Force application
struct ForceApplication {
    uint32_t body_id;
    Vector3 force;
    Vector3 point; // For torque calculation
    enum Type { FORCE, IMPULSE, VELOCITY_CHANGE } type;
};
```

#### 0.4: Physics Manager Interface
**File:** `/workspace/src/physics/PhysicsManager.h`

```cpp
#pragma once
#include "PhysicsTypes.h"
#include <vector>
#include <unordered_map>

class PhysicsManager {
public:
    PhysicsManager();
    ~PhysicsManager();
    
    // Lifecycle
    void initialize();
    void reset();
    void update(float delta_time);
    
    // Rigid body management
    uint32_t create_body(const RigidBody& body);
    void destroy_body(uint32_t body_id);
    RigidBody* get_body(uint32_t body_id);
    const RigidBody* get_body(uint32_t body_id) const;
    
    // Force application
    void apply_force(uint32_t body_id, Vector3 force, Vector3 point = Vector3(0,0,0));
    void apply_impulse(uint32_t body_id, Vector3 impulse, Vector3 point = Vector3(0,0,0));
    void set_velocity(uint32_t body_id, Vector3 velocity);
    void add_velocity(uint32_t body_id, Vector3 delta_velocity);
    
    // Queries
    std::vector<uint32_t> raycast(Vector3 origin, Vector3 direction, float max_distance);
    std::vector<uint32_t> sphere_cast(Vector3 center, float radius);
    std::vector<uint32_t> box_cast(Vector3 center, Vector3 extents);
    std::vector<CollisionContact> get_contacts_for_body(uint32_t body_id);
    
    // Global physics properties
    void set_gravity(Vector3 gravity);
    Vector3 get_gravity() const;
    void set_time_scale(float scale);
    
    // Debug/profiling
    struct PhysicsStats {
        uint32_t body_count;
        uint32_t contact_count;
        float update_time_ms;
        uint32_t broad_phase_checks;
        uint32_t narrow_phase_checks;
    };
    PhysicsStats get_stats() const;
    
private:
    std::vector<RigidBody> bodies_;
    std::unordered_map<uint32_t, size_t> id_to_index_;
    std::vector<CollisionContact> contacts_;
    Vector3 gravity_;
    float time_scale_;
    uint32_t next_body_id_;
    
    // Sub-managers
    class CollisionManager* collision_manager_;
    class SpatialPartition* spatial_partition_;
    class ForceIntegrator* force_integrator_;
    
    // Fixed timestep accumulator
    float time_accumulator_;
    static constexpr float FIXED_TIMESTEP = 1.0f / 60.0f;
    
    void physics_step(float dt);
    void integrate_forces(float dt);
    void detect_collisions();
    void resolve_collisions(float dt);
    void integrate_velocities(float dt);
};
```

### Deliverables (Phase 0)
- [ ] Architecture document created
- [ ] Build system updated to include physics sources
- [ ] Core data structures defined
- [ ] PhysicsManager interface complete
- [ ] Empty implementations compile and link
- [ ] WASM exports updated to route through PhysicsManager

---

## 🔧 Phase 1: Core Physics Engine

### Objectives
- Implement full rigid body simulation
- Collision detection and resolution
- Spatial partitioning for performance
- Verify 100+ objects at 60fps on mobile

### Tasks

#### 1.1: Rigid Body Integration
**File:** `/workspace/src/physics/ForceIntegrator.cpp`

```cpp
// Implement Verlet integration for stability
void ForceIntegrator::integrate_forces(std::vector<RigidBody>& bodies, float dt) {
    for (auto& body : bodies) {
        if (body.is_kinematic || body.is_static) continue;
        
        // Apply gravity
        body.acceleration = gravity_ * body.inverse_mass;
        
        // Apply drag
        body.velocity *= (1.0f - body.drag * dt);
        body.angular_velocity *= (1.0f - body.angular_drag * dt);
        
        // Verlet integration
        Vector3 prev_velocity = body.velocity;
        body.velocity += body.acceleration * dt;
        body.position += (prev_velocity + body.velocity) * 0.5f * dt;
        
        // Angular integration
        // body.rotation = integrate_angular(body.rotation, body.angular_velocity, dt);
    }
}
```

#### 1.2: Collision Detection
**File:** `/workspace/src/physics/CollisionManager.cpp`

Implement:
- **Broad phase:** Spatial hash grid (8x8m cells for mobile performance)
- **Narrow phase:** 
  - Sphere-sphere (fastest, for projectiles)
  - Sphere-box (for character-environment)
  - Capsule-box (for humanoid characters)
  - Box-box (for environment objects)

```cpp
class SpatialPartition {
    static constexpr float CELL_SIZE = 8.0f;
    static constexpr int GRID_SIZE = 128;
    std::vector<uint32_t> grid_[GRID_SIZE][GRID_SIZE];
    
public:
    void update(const std::vector<RigidBody>& bodies) {
        // Clear grid
        for (auto& row : grid_) {
            for (auto& cell : row) {
                cell.clear();
            }
        }
        
        // Insert bodies
        for (const auto& body : bodies) {
            int x = (int)(body.position.x / CELL_SIZE) + GRID_SIZE/2;
            int z = (int)(body.position.z / CELL_SIZE) + GRID_SIZE/2;
            if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
                grid_[x][z].push_back(body.id);
            }
        }
    }
    
    std::vector<uint32_t> query_nearby(Vector3 position, float radius) {
        // Return bodies in nearby cells
        std::vector<uint32_t> result;
        int cells_radius = (int)(radius / CELL_SIZE) + 1;
        int cx = (int)(position.x / CELL_SIZE) + GRID_SIZE/2;
        int cz = (int)(position.z / CELL_SIZE) + GRID_SIZE/2;
        
        for (int x = cx - cells_radius; x <= cx + cells_radius; x++) {
            for (int z = cz - cells_radius; z <= cz + cells_radius; z++) {
                if (x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE) {
                    result.insert(result.end(), 
                                 grid_[x][z].begin(), 
                                 grid_[x][z].end());
                }
            }
        }
        return result;
    }
};
```

#### 1.3: Collision Resolution
**File:** `/workspace/src/physics/CollisionResolver.cpp`

Implement impulse-based resolution:

```cpp
void resolve_collision(RigidBody& a, RigidBody& b, const CollisionContact& contact) {
    // Relative velocity at contact point
    Vector3 relative_vel = b.velocity - a.velocity;
    float vel_along_normal = relative_vel.dot(contact.normal);
    
    // Don't resolve if separating
    if (vel_along_normal > 0) return;
    
    // Calculate restitution (bounciness)
    float e = std::min(a.restitution, b.restitution);
    
    // Calculate impulse magnitude
    float impulse_magnitude = -(1.0f + e) * vel_along_normal;
    impulse_magnitude /= (a.inverse_mass + b.inverse_mass);
    
    // Apply impulse
    Vector3 impulse = contact.normal * impulse_magnitude;
    a.velocity -= impulse * a.inverse_mass;
    b.velocity += impulse * b.inverse_mass;
    
    // Position correction (prevent sinking)
    const float SLOP = 0.01f;
    const float CORRECTION_PERCENT = 0.8f;
    float correction_magnitude = std::max(contact.penetration - SLOP, 0.0f) 
                                * CORRECTION_PERCENT 
                                / (a.inverse_mass + b.inverse_mass);
    Vector3 correction = contact.normal * correction_magnitude;
    a.position -= correction * a.inverse_mass;
    b.position += correction * b.inverse_mass;
}
```

#### 1.4: Mobile Performance Optimization
**File:** `/workspace/src/physics/PhysicsConfig.h`

```cpp
// Mobile-first performance settings
namespace PhysicsConfig {
    // Spatial partition
    constexpr float CELL_SIZE = 8.0f;           // Larger cells for mobile
    constexpr int MAX_BODIES_PER_CELL = 16;     // Limit cell population
    
    // Collision detection
    constexpr int MAX_CONTACTS_PER_BODY = 4;    // Reduce contact processing
    constexpr float CONTACT_MERGE_THRESHOLD = 0.1f;
    
    // Integration
    constexpr float FIXED_TIMESTEP = 1.0f / 60.0f;
    constexpr int MAX_SUBSTEPS = 2;              // Limit substeps on mobile
    
    // Sleep system (disable inactive bodies)
    constexpr float SLEEP_VELOCITY_THRESHOLD = 0.1f;
    constexpr float SLEEP_TIME_THRESHOLD = 1.0f;
    
    // LOD system
    constexpr float FULL_SIMULATION_RADIUS = 20.0f;   // Around player
    constexpr float REDUCED_SIMULATION_RADIUS = 40.0f;
    constexpr float MINIMAL_SIMULATION_RADIUS = 80.0f;
}
```

### Deliverables (Phase 1)
- [ ] Rigid body integration working
- [ ] Collision detection for sphere/box/capsule
- [ ] Spatial partitioning optimized
- [ ] 100 physics objects at 60fps on test mobile device
- [ ] Sleep system for inactive bodies
- [ ] LOD system for distant objects
- [ ] Profiling tools showing frame breakdown

### Test Cases
```cpp
// Test: 100 bouncing balls at 60fps
void test_physics_performance() {
    PhysicsManager physics;
    
    // Create 100 spheres
    for (int i = 0; i < 100; i++) {
        RigidBody ball;
        ball.shape = RigidBody::SPHERE;
        ball.radius = 0.5f;
        ball.mass = 1.0f;
        ball.inverse_mass = 1.0f;
        ball.position = Vector3(rand() % 20 - 10, 20 + i * 0.5f, rand() % 20 - 10);
        physics.create_body(ball);
    }
    
    // Simulate 60 seconds
    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 3600; i++) {
        physics.update(1.0f / 60.0f);
    }
    auto end = std::chrono::high_resolution_clock::now();
    float elapsed_ms = std::chrono::duration<float, std::milli>(end - start).count();
    
    // Should complete in < 3600ms (realtime)
    assert(elapsed_ms < 3600.0f);
}
```

---

## ⚔️ Phase 2: Physics-Driven Combat

### Objectives
- Replace CombatManager with physics-based damage
- Momentum-based knockback and hitstun
- Attack hitboxes as physics triggers
- Stamina affects physics properties

### Tasks

#### 2.1: Combat Physics Model
**File:** `/workspace/src/combat/PhysicsCombatSystem.h`

```cpp
class PhysicsCombatSystem {
public:
    struct AttackHitbox {
        uint32_t owner_id;
        Vector3 offset;      // Relative to owner
        float radius;
        float damage;
        float knockback_force;
        float lifetime;
        bool is_active;
        std::vector<uint32_t> hit_entities;
    };
    
    struct CombatState {
        uint32_t entity_id;
        float health;
        float stamina;
        float poise;
        bool is_blocking;
        float block_angle;    // Cone of defense
        
        // Physics properties affected by combat state
        float mass_multiplier;      // Heavy attacks increase mass
        float drag_multiplier;      // Low stamina increases drag
        float friction_multiplier;  // Stance affects ground friction
    };
    
    void update(float dt, PhysicsManager& physics);
    
    // Attack actions
    uint32_t spawn_attack_hitbox(uint32_t owner_id, Vector3 offset, float radius, 
                                  float damage, float knockback);
    void update_hitboxes(float dt, PhysicsManager& physics);
    
    // Damage processing
    void process_hit(uint32_t attacker_id, uint32_t defender_id, 
                    Vector3 hit_point, Vector3 hit_direction,
                    float damage, float knockback_force,
                    PhysicsManager& physics);
    
    // Combat state queries
    CombatState& get_combat_state(uint32_t entity_id);
    bool is_entity_blocking(uint32_t entity_id, Vector3 attack_direction);
    
private:
    std::unordered_map<uint32_t, CombatState> combat_states_;
    std::vector<AttackHitbox> active_hitboxes_;
};
```

#### 2.2: Momentum-Based Damage
**File:** `/workspace/src/combat/DamageCalculation.cpp`

```cpp
void PhysicsCombatSystem::process_hit(
    uint32_t attacker_id, uint32_t defender_id,
    Vector3 hit_point, Vector3 hit_direction,
    float base_damage, float base_knockback,
    PhysicsManager& physics
) {
    RigidBody* attacker = physics.get_body(attacker_id);
    RigidBody* defender = physics.get_body(defender_id);
    if (!attacker || !defender) return;
    
    // Calculate momentum transfer
    Vector3 relative_velocity = attacker->velocity - defender->velocity;
    float momentum_magnitude = relative_velocity.length() * attacker->mass;
    
    // Damage scales with momentum
    float momentum_bonus = momentum_magnitude / 10.0f; // Normalize
    float final_damage = base_damage * (1.0f + momentum_bonus * 0.5f);
    
    // Check blocking
    auto& defender_state = get_combat_state(defender_id);
    if (is_entity_blocking(defender_id, hit_direction)) {
        final_damage *= 0.2f; // 80% reduction
        base_knockback *= 0.3f;
        defender_state.poise -= final_damage * 0.5f;
    } else {
        defender_state.health -= final_damage;
        defender_state.poise -= final_damage;
    }
    
    // Apply physics knockback
    Vector3 knockback_impulse = hit_direction.normalized() * base_knockback;
    
    // Poise break causes extra knockback
    if (defender_state.poise <= 0) {
        knockback_impulse *= 2.0f;
        defender_state.poise = 0;
    }
    
    physics.apply_impulse(defender_id, knockback_impulse);
    
    // Attacker also receives some recoil
    physics.apply_impulse(attacker_id, knockback_impulse * -0.2f);
}
```

#### 2.3: Attack Animations Drive Physics
**File:** `/workspace/src/combat/AttackController.cpp`

```cpp
class AttackController {
public:
    struct AttackDefinition {
        float windup_time;
        float active_time;
        float recovery_time;
        
        // Physics properties during attack
        float mass_multiplier;       // Becomes heavier during heavy attacks
        float forward_impulse;       // Lunge forward
        Vector3 hitbox_offset;
        float hitbox_radius;
        float damage;
        float knockback_force;
    };
    
    void execute_light_attack(uint32_t entity_id, PhysicsManager& physics) {
        static const AttackDefinition LIGHT_ATTACK = {
            .windup_time = 0.2f,
            .active_time = 0.1f,
            .recovery_time = 0.3f,
            .mass_multiplier = 1.0f,
            .forward_impulse = 3.0f,
            .hitbox_offset = Vector3(0, 0, 1.5f),
            .hitbox_radius = 1.0f,
            .damage = 25.0f,
            .knockback_force = 5.0f
        };
        
        // Apply forward impulse (lunge)
        RigidBody* body = physics.get_body(entity_id);
        Vector3 forward = /* get facing direction */;
        physics.apply_impulse(entity_id, forward * LIGHT_ATTACK.forward_impulse);
        
        // Spawn hitbox after windup
        schedule_hitbox_spawn(entity_id, LIGHT_ATTACK);
    }
};
```

#### 2.4: Stamina Affects Physics
**File:** `/workspace/src/combat/StaminaPhysics.cpp`

```cpp
void update_stamina_physics_effects(CombatState& state, RigidBody& body) {
    float stamina_ratio = state.stamina / 100.0f;
    
    // Low stamina makes movement sluggish
    if (stamina_ratio < 0.3f) {
        body.drag = 2.0f;  // High drag when exhausted
        body.mass *= 1.5f; // Feel heavier
    } else {
        body.drag = 0.5f;  // Normal
        body.mass = /* base mass */;
    }
    
    // Blocking stance increases friction (planted feet)
    if (state.is_blocking) {
        body.friction = 2.0f;
    } else {
        body.friction = 0.8f;
    }
}
```

### Deliverables (Phase 2)
- [ ] Attack hitboxes spawn and detect collisions
- [ ] Damage calculated from momentum + base values
- [ ] Knockback applied as physics impulses
- [ ] Blocking reduces knockback and damage
- [ ] Poise break causes extra knockback
- [ ] Stamina affects movement physics
- [ ] Attack animations apply forward impulses
- [ ] Recoil applied to attacker

### Test Cases
```cpp
void test_momentum_damage() {
    // Test: Fast-moving attack deals more damage
    PhysicsManager physics;
    PhysicsCombatSystem combat;
    
    uint32_t attacker = create_test_entity(physics);
    uint32_t defender = create_test_entity(physics);
    
    // Stationary attack
    physics.set_velocity(attacker, Vector3(0, 0, 0));
    combat.process_hit(attacker, defender, Vector3(0,0,0), Vector3(1,0,0), 10.0f, 5.0f, physics);
    float damage_static = combat.get_combat_state(defender).health;
    
    // Reset
    combat.get_combat_state(defender).health = 100.0f;
    
    // High-velocity attack
    physics.set_velocity(attacker, Vector3(10, 0, 0));
    combat.process_hit(attacker, defender, Vector3(0,0,0), Vector3(1,0,0), 10.0f, 5.0f, physics);
    float damage_moving = combat.get_combat_state(defender).health;
    
    // Moving attack should deal more damage
    assert(damage_moving < damage_static);
}
```

---

## 👾 Phase 3: Enemy Physics Integration

### Objectives
- Enemies as physics entities
- AI applies forces, not direct position updates
- Enemy attacks use physics hitboxes
- Ragdoll on death

### Tasks

#### 3.1: Enemy Entity System
**File:** `/workspace/src/entities/EnemyEntity.cpp`

```cpp
class EnemyEntity {
public:
    struct EnemyPhysicsProfile {
        float mass;
        float radius;
        float height;
        float max_force;          // AI can't apply more than this
        float movement_acceleration;
        float turn_speed;
    };
    
    uint32_t physics_body_id;
    EnemyPhysicsProfile profile;
    AIBehaviorState ai_state;
    
    void update_ai(float dt, PhysicsManager& physics, 
                   const Vector3& player_position) {
        Vector3 to_player = player_position - get_position(physics);
        float distance = to_player.length();
        
        // AI decides on desired velocity
        Vector3 desired_velocity = calculate_ai_velocity(to_player, distance);
        
        // Apply force to reach desired velocity (not teleport!)
        Vector3 current_velocity = physics.get_body(physics_body_id)->velocity;
        Vector3 velocity_delta = desired_velocity - current_velocity;
        Vector3 force = velocity_delta * profile.mass * profile.movement_acceleration;
        
        // Clamp to max force
        if (force.length() > profile.max_force) {
            force = force.normalized() * profile.max_force;
        }
        
        physics.apply_force(physics_body_id, force);
    }
    
    Vector3 calculate_ai_velocity(Vector3 to_player, float distance) {
        // Chase player
        if (distance > 2.0f) {
            return to_player.normalized() * 5.0f; // Run speed
        }
        // Attack range - circle strafe
        else if (distance > 1.5f) {
            Vector3 strafe = to_player.cross(Vector3(0, 1, 0)).normalized();
            return strafe * 3.0f;
        }
        // Too close - back away
        else {
            return -to_player.normalized() * 3.0f;
        }
    }
};
```

#### 3.2: Enemy Attack Physics
**File:** `/workspace/src/entities/EnemyAttacks.cpp`

```cpp
void EnemyEntity::execute_attack(PhysicsManager& physics, PhysicsCombatSystem& combat) {
    // Different enemy types have different attack physics
    switch (enemy_type) {
        case WOLF:
            // Pounce attack - applies large forward impulse
            {
                Vector3 forward = get_facing_direction(physics);
                physics.apply_impulse(physics_body_id, forward * 15.0f);
                
                // Spawn attack hitbox ahead
                combat.spawn_attack_hitbox(
                    physics_body_id,
                    forward * 1.5f,     // Offset
                    1.0f,                // Radius
                    20.0f,               // Damage
                    10.0f                // Knockback
                );
            }
            break;
            
        case GOLEM:
            // Ground slam - radial knockback
            {
                Vector3 position = get_position(physics);
                
                // Apply downward impulse to self (slam animation)
                physics.apply_impulse(physics_body_id, Vector3(0, -20, 0));
                
                // Create large hitbox
                combat.spawn_attack_hitbox(
                    physics_body_id,
                    Vector3(0, -1, 0),
                    5.0f,                // Large radius
                    40.0f,               // Heavy damage
                    15.0f                // Strong knockback
                );
            }
            break;
    }
}
```

#### 3.3: Ragdoll System
**File:** `/workspace/src/entities/RagdollSystem.cpp`

```cpp
class RagdollSystem {
public:
    struct Ragdoll {
        uint32_t root_body_id;
        std::vector<uint32_t> limb_body_ids;
        std::vector<ConstraintJoint> joints;
        float lifetime;
    };
    
    Ragdoll create_ragdoll(Vector3 position, Vector3 death_impulse, 
                          PhysicsManager& physics) {
        Ragdoll ragdoll;
        
        // Create torso (root)
        RigidBody torso;
        torso.shape = RigidBody::CAPSULE;
        torso.mass = 50.0f;
        torso.position = position;
        ragdoll.root_body_id = physics.create_body(torso);
        
        // Apply death impulse
        physics.apply_impulse(ragdoll.root_body_id, death_impulse);
        
        // Create limbs (simplified - 4 limbs)
        for (int i = 0; i < 4; i++) {
            RigidBody limb;
            limb.shape = RigidBody::CAPSULE;
            limb.mass = 10.0f;
            limb.position = position + Vector3(/* offset */);
            uint32_t limb_id = physics.create_body(limb);
            ragdoll.limb_body_ids.push_back(limb_id);
            
            // Create joint connecting limb to torso
            // (This would use constraint system from physics_backbone.h)
        }
        
        ragdoll.lifetime = 5.0f; // Despawn after 5 seconds
        return ragdoll;
    }
    
    void update_ragdolls(float dt, PhysicsManager& physics) {
        for (auto it = ragdolls_.begin(); it != ragdolls_.end();) {
            it->lifetime -= dt;
            if (it->lifetime <= 0) {
                // Despawn ragdoll
                physics.destroy_body(it->root_body_id);
                for (uint32_t limb_id : it->limb_body_ids) {
                    physics.destroy_body(limb_id);
                }
                it = ragdolls_.erase(it);
            } else {
                ++it;
            }
        }
    }
    
private:
    std::vector<Ragdoll> ragdolls_;
};
```

### Deliverables (Phase 3)
- [ ] Enemies are physics entities
- [ ] AI applies forces, not teleportation
- [ ] Enemy attacks spawn physics hitboxes
- [ ] Different enemy types have different physics profiles
- [ ] Ragdoll on death with impulse-based animation
- [ ] Ragdolls despawn after timeout
- [ ] 20 enemies + player running at 60fps

---

## 🤲 Phase 4: Direct Interaction Systems

### Objectives
- Pick up and throw objects
- Push/pull heavy objects
- Environmental objects react to combat
- Emergent gameplay demonstrations

### Tasks

#### 4.1: Grab System
**File:** `/workspace/src/interaction/GrabSystem.h`

```cpp
class GrabSystem {
public:
    struct GrabbableObject {
        uint32_t body_id;
        float mass;
        bool can_be_thrown;
        bool can_be_pushed;
        float grab_distance;
    };
    
    struct GrabState {
        bool is_grabbing;
        uint32_t grabbed_object_id;
        Vector3 grab_offset;
        float hold_time;
    };
    
    // Player interaction
    bool try_grab(uint32_t player_id, PhysicsManager& physics);
    void release(uint32_t player_id, PhysicsManager& physics);
    void throw_object(uint32_t player_id, Vector3 throw_direction, 
                     float throw_force, PhysicsManager& physics);
    
    // Physics integration
    void update_held_objects(float dt, PhysicsManager& physics);
    
private:
    std::unordered_map<uint32_t, GrabState> grab_states_;
    std::vector<GrabbableObject> grabbable_objects_;
    
    uint32_t find_nearest_grabbable(Vector3 position, Vector3 facing, 
                                    PhysicsManager& physics);
};
```

#### 4.2: Grab Implementation
**File:** `/workspace/src/interaction/GrabSystem.cpp`

```cpp
bool GrabSystem::try_grab(uint32_t player_id, PhysicsManager& physics) {
    RigidBody* player = physics.get_body(player_id);
    if (!player) return false;
    
    // Find nearest grabbable object
    Vector3 facing = /* get player facing */;
    uint32_t object_id = find_nearest_grabbable(player->position, facing, physics);
    if (object_id == INVALID_ID) return false;
    
    RigidBody* object = physics.get_body(object_id);
    
    // Check if object is light enough to grab
    GrabbableObject* grabbable = find_grabbable_by_id(object_id);
    if (!grabbable || object->mass > 20.0f) return false;
    
    // Grab the object
    grab_states_[player_id] = GrabState{
        .is_grabbing = true,
        .grabbed_object_id = object_id,
        .grab_offset = object->position - player->position,
        .hold_time = 0.0f
    };
    
    // Make object kinematic while held
    object->is_kinematic = true;
    
    return true;
}

void GrabSystem::update_held_objects(float dt, PhysicsManager& physics) {
    for (auto& [player_id, state] : grab_states_) {
        if (!state.is_grabbing) continue;
        
        RigidBody* player = physics.get_body(player_id);
        RigidBody* object = physics.get_body(state.grabbed_object_id);
        if (!player || !object) continue;
        
        // Object follows player with some lag
        Vector3 target_position = player->position + state.grab_offset;
        Vector3 to_target = target_position - object->position;
        
        // Smooth follow using physics
        object->position += to_target * dt * 10.0f; // Spring constant
        
        state.hold_time += dt;
    }
}

void GrabSystem::throw_object(uint32_t player_id, Vector3 throw_direction, 
                              float throw_force, PhysicsManager& physics) {
    auto it = grab_states_.find(player_id);
    if (it == grab_states_.end() || !it->second.is_grabbing) return;
    
    GrabState& state = it->second;
    RigidBody* object = physics.get_body(state.grabbed_object_id);
    if (!object) return;
    
    // Release object
    object->is_kinematic = false;
    
    // Apply throw impulse
    Vector3 impulse = throw_direction.normalized() * throw_force * object->mass;
    physics.apply_impulse(state.grabbed_object_id, impulse);
    
    // Clear grab state
    state.is_grabbing = false;
}
```

#### 4.3: Push/Pull System
**File:** `/workspace/src/interaction/PushPullSystem.cpp`

```cpp
class PushPullSystem {
public:
    void update(float dt, PhysicsManager& physics) {
        // Check for player-object contacts where object is pushable
        for (auto& [player_id, player_body] : get_players(physics)) {
            auto contacts = physics.get_contacts_for_body(player_id);
            
            for (const auto& contact : contacts) {
                uint32_t other_id = (contact.body_a_id == player_id) 
                                   ? contact.body_b_id : contact.body_a_id;
                
                if (is_pushable(other_id)) {
                    handle_push(player_id, other_id, contact, physics);
                }
            }
        }
    }
    
private:
    void handle_push(uint32_t player_id, uint32_t object_id,
                     const CollisionContact& contact, PhysicsManager& physics) {
        RigidBody* player = physics.get_body(player_id);
        RigidBody* object = physics.get_body(object_id);
        
        // Player's movement force is partially transferred to object
        Vector3 push_direction = player->velocity.normalized();
        float push_force = player->velocity.length() * player->mass * 0.3f;
        
        // Heavier objects are harder to push
        push_force /= (object->mass / 10.0f);
        
        // Apply force to object
        physics.apply_force(object_id, push_direction * push_force);
        
        // Apply resistance to player
        physics.apply_force(player_id, -push_direction * push_force * 0.5f);
    }
};
```

#### 4.4: Environmental Combat Integration
**File:** `/workspace/src/interaction/EnvironmentalCombat.cpp`

```cpp
class EnvironmentalCombat {
public:
    // Knocked objects become projectiles
    void on_object_hit(uint32_t object_id, Vector3 hit_direction, 
                       float impulse_magnitude, PhysicsManager& physics) {
        RigidBody* object = physics.get_body(object_id);
        if (!object) return;
        
        // Make object a temporary weapon
        float velocity = object->velocity.length();
        if (velocity > 5.0f) {
            // Fast-moving objects can damage on contact
            register_as_projectile(object_id, velocity * object->mass * 0.1f);
        }
    }
    
    // Check for projectile collisions
    void update(float dt, PhysicsManager& physics, PhysicsCombatSystem& combat) {
        for (auto& proj : active_projectiles_) {
            auto contacts = physics.get_contacts_for_body(proj.body_id);
            
            for (const auto& contact : contacts) {
                uint32_t hit_id = (contact.body_a_id == proj.body_id)
                                 ? contact.body_b_id : contact.body_a_id;
                
                // Check if hit an entity
                if (is_entity(hit_id)) {
                    // Apply damage based on projectile momentum
                    RigidBody* proj_body = physics.get_body(proj.body_id);
                    float damage = proj.damage_multiplier * proj_body->velocity.length();
                    
                    combat.process_hit(
                        proj.body_id,
                        hit_id,
                        contact.point,
                        contact.normal,
                        damage,
                        proj_body->mass * proj_body->velocity.length(),
                        physics
                    );
                    
                    // Deactivate projectile
                    proj.is_active = false;
                }
            }
        }
    }
    
private:
    struct Projectile {
        uint32_t body_id;
        float damage_multiplier;
        float lifetime;
        bool is_active;
    };
    
    std::vector<Projectile> active_projectiles_;
};
```

### Deliverables (Phase 4)
- [ ] Pick up objects (sphere cast to find grabbable)
- [ ] Throw objects with force-based trajectory
- [ ] Push heavy objects while moving
- [ ] Thrown objects damage enemies on contact
- [ ] Knocked objects become temporary projectiles
- [ ] Combat knockback affects nearby objects

### Emergent Gameplay Demos
```
Demo 1: Barrel Bowling
- Player throws barrel at group of enemies
- Barrel knocks enemies into each other
- Chain reaction knockback

Demo 2: Environmental Hazard
- Player knocks enemy toward cliff edge
- Enemy physics ragdolls off edge
- Fall damage on landing

Demo 3: Improvised Weapon
- Player grabs nearby rock
- Throws rock at distant enemy
- Rock trajectory affected by wind (if implemented)

Demo 4: Shield Block Reflection
- Enemy throws object at player
- Player blocks at right time
- Object bounces back and hits enemy
```

---

## ⚡ Phase 5: Optimization & Polish

### Objectives
- Achieve stable 60fps with 100 objects on mobile
- Implement sleep system for inactive objects
- Add LOD physics for distant objects
- Profile and optimize hotspots

### Tasks

#### 5.1: Performance Profiling
**File:** `/workspace/src/physics/PhysicsProfiler.h`

```cpp
class PhysicsProfiler {
public:
    struct FrameProfile {
        float total_time_ms;
        float broad_phase_ms;
        float narrow_phase_ms;
        float integration_ms;
        float resolution_ms;
        uint32_t body_count;
        uint32_t contact_count;
        uint32_t broad_phase_checks;
        uint32_t narrow_phase_checks;
    };
    
    void begin_frame();
    void end_phase(const char* phase_name);
    void end_frame();
    
    FrameProfile get_last_frame() const;
    FrameProfile get_average(int frame_count = 60) const;
    
    void log_report();
    
private:
    std::vector<FrameProfile> frame_history_;
    FrameProfile current_frame_;
    std::chrono::high_resolution_clock::time_point phase_start_;
};
```

#### 5.2: Sleep System
**File:** `/workspace/src/physics/SleepSystem.cpp`

```cpp
class SleepSystem {
public:
    void update(std::vector<RigidBody>& bodies, float dt) {
        for (auto& body : bodies) {
            if (body.is_kinematic || body.is_static) continue;
            
            // Check if body is slow enough to sleep
            float speed = body.velocity.length();
            if (speed < PhysicsConfig::SLEEP_VELOCITY_THRESHOLD) {
                body.sleep_timer += dt;
                
                if (body.sleep_timer > PhysicsConfig::SLEEP_TIME_THRESHOLD) {
                    body.is_sleeping = true;
                    body.velocity = Vector3(0, 0, 0);
                    body.angular_velocity = Vector3(0, 0, 0);
                }
            } else {
                body.sleep_timer = 0.0f;
                body.is_sleeping = false;
            }
        }
    }
    
    void wake_nearby_bodies(Vector3 position, float radius, 
                           std::vector<RigidBody>& bodies) {
        for (auto& body : bodies) {
            if (!body.is_sleeping) continue;
            
            float distance = (body.position - position).length();
            if (distance < radius) {
                body.is_sleeping = false;
                body.sleep_timer = 0.0f;
            }
        }
    }
};
```

#### 5.3: LOD Physics System
**File:** `/workspace/src/physics/PhysicsLOD.cpp`

```cpp
class PhysicsLOD {
public:
    enum LODLevel {
        FULL,       // Full simulation, all features
        REDUCED,    // Half update rate, simplified collision
        MINIMAL     // Quarter rate, sphere collision only
    };
    
    void update_lod_levels(const std::vector<RigidBody>& bodies, 
                          Vector3 camera_position) {
        for (size_t i = 0; i < bodies.size(); i++) {
            float distance = (bodies[i].position - camera_position).length();
            
            if (distance < PhysicsConfig::FULL_SIMULATION_RADIUS) {
                lod_levels_[i] = FULL;
            } else if (distance < PhysicsConfig::REDUCED_SIMULATION_RADIUS) {
                lod_levels_[i] = REDUCED;
            } else {
                lod_levels_[i] = MINIMAL;
            }
        }
    }
    
    bool should_update_body(size_t index, uint32_t frame_counter) {
        switch (lod_levels_[index]) {
            case FULL: return true;
            case REDUCED: return (frame_counter % 2) == 0;
            case MINIMAL: return (frame_counter % 4) == 0;
            default: return false;
        }
    }
    
private:
    std::vector<LODLevel> lod_levels_;
};
```

#### 5.4: Mobile-Specific Optimizations
**File:** `/workspace/src/physics/MobileOptimizations.cpp`

```cpp
namespace MobileOptimizations {
    // Reduce precision for distant objects
    void quantize_distant_bodies(std::vector<RigidBody>& bodies, Vector3 camera_pos) {
        for (auto& body : bodies) {
            float distance = (body.position - camera_pos).length();
            if (distance > 50.0f) {
                // Snap to grid
                body.position.x = std::round(body.position.x * 2.0f) / 2.0f;
                body.position.y = std::round(body.position.y * 2.0f) / 2.0f;
                body.position.z = std::round(body.position.z * 2.0f) / 2.0f;
            }
        }
    }
    
    // Pool allocations
    class ContactPool {
    public:
        std::vector<CollisionContact> contacts;
        size_t active_count = 0;
        
        void reset() { active_count = 0; }
        
        CollisionContact* allocate() {
            if (active_count >= contacts.size()) {
                contacts.resize(contacts.size() + 64);
            }
            return &contacts[active_count++];
        }
    };
    
    // Batch similar operations
    void batch_force_applications(const std::vector<ForceApplication>& forces,
                                  std::vector<RigidBody>& bodies) {
        // Sort forces by body ID
        auto sorted_forces = forces;
        std::sort(sorted_forces.begin(), sorted_forces.end(),
                 [](const auto& a, const auto& b) { return a.body_id < b.body_id; });
        
        // Apply in batches (better cache locality)
        for (const auto& force : sorted_forces) {
            // ...
        }
    }
}
```

### Deliverables (Phase 5)
- [ ] Performance profiler showing per-phase timings
- [ ] Sleep system reduces active bodies by 50%+ in calm moments
- [ ] LOD system maintains 60fps with 100+ objects
- [ ] Mobile optimization guide document
- [ ] Frame time consistently under 16ms on target mobile device
- [ ] Memory usage stable (no leaks over 10 minute session)

---

## 📊 Success Metrics

### Phase 0-1: Foundation
- [ ] Build system compiles physics code
- [ ] 100 bouncing balls at 60fps

### Phase 2: Combat
- [ ] Momentum affects damage
- [ ] Knockback feels weighty and physics-driven
- [ ] Blocking reduces knockback realistically

### Phase 3: Enemies
- [ ] 20 enemies + player at 60fps
- [ ] Enemies move via forces, no teleporting
- [ ] Ragdolls on death

### Phase 4: Interaction
- [ ] Pick up, throw, push objects
- [ ] Thrown objects damage enemies
- [ ] 3+ emergent gameplay scenarios demonstrated

### Phase 5: Polish
- [ ] 100 objects at 60fps on mobile
- [ ] Frame time < 16ms 99% of the time
- [ ] Memory usage stable

---

## 🔧 Implementation Checkpoints

Each phase should complete with:
1. **Code complete** - All files implemented
2. **Unit tests passing** - Automated test suite
3. **Performance verified** - Profiling confirms targets met
4. **Documentation updated** - API docs and examples
5. **Demo created** - Playable demonstration of features
6. **Code review** - Architecture review before next phase

---

## 📚 Supporting Documentation

### To Create
- [ ] `PHYSICS_ARCHITECTURE.md` - System overview
- [ ] `PHYSICS_API.md` - Complete API reference
- [ ] `PHYSICS_OPTIMIZATION.md` - Performance guide
- [ ] `EMERGENT_GAMEPLAY_EXAMPLES.md` - Showcase scenarios
- [ ] `MIGRATION_GUIDE.md` - Porting old code to physics

### To Update
- [ ] `CORE_WORLD_SIMULATION.md` - Link to implementation
- [ ] `COMBAT_SYSTEM.md` - Update with physics combat
- [ ] `AGENTS.md` - Add physics manager pattern
- [ ] `BUILD/API.md` - Document new WASM exports

---

## 🚀 Quick Wins (Early Demonstration)

Even during foundation phase, these can showcase physics:

1. **Bouncing balls demo** - Basic rigid body simulation
2. **Knockback test** - Apply impulse to player
3. **Gravity zones** - Hazard volumes apply forces
4. **Friction demo** - Ice vs. stone surface materials
5. **Collision response** - Objects bounce realistically

---

## ⚠️ Risk Mitigation

### Performance Risks
- **Risk:** Mobile can't handle 100 objects
- **Mitigation:** LOD system from day 1, sleep system, profiler

### Gameplay Risks
- **Risk:** Physics feels too floaty/imprecise
- **Mitigation:** Tunable damping, friction, masses per entity type

### Architecture Risks
- **Risk:** Complete refactor breaks existing features
- **Mitigation:** Phased rollout, keep old code until physics proven

### Determinism Risks
- **Risk:** Floating-point drift causes multiplayer desync
- **Mitigation:** Fixed timestep, test with golden replays, consider fixed-point math

---

## 📝 Next Steps

1. **Approve this plan** - Confirm approach before starting
2. **Set up Phase 0** - Create directory structure
3. **Implement PhysicsManager skeleton** - Empty implementation
4. **First test case** - Single bouncing ball
5. **Iterate from there** - Build up complexity

---

**This is a comprehensive overhaul. Each phase is milestone-driven with clear deliverables. Track progress in `/src/PHYSICS_PROGRESS.md`.**
