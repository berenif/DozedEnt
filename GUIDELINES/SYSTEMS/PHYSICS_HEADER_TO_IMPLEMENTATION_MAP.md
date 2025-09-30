# 🗺️ Physics Headers to Implementation Mapping

## Overview

This document maps existing physics headers (in `public/src/wasm/`) to the implementation files that need to be created in `src/physics/` and related directories.

---

## Header Files Status

### Legend
- ✅ **Complete** - Header + implementation exist and are integrated
- 🟡 **Partial** - Header exists, no implementation
- ❌ **Missing** - Neither header nor implementation exist
- 🔄 **Needs Refactor** - Exists but needs to be rewritten for physics-first

---

## 1. `physics_backbone.h` → Core Physics Implementation

**Location:** `public/src/wasm/physics_backbone.h` (642 lines)
**Status:** 🟡 Header only, no implementation

### Maps To:

#### A. `/src/physics/PhysicsTypes.h` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Core data structures
**Content from header:**
```cpp
struct Vector3 { float x, y, z; /* ... */ };
struct Vector2 { float x, y; /* ... */ };
struct Quaternion { float x, y, z, w; /* ... */ };
struct Matrix3 { /* ... */ };
struct RigidBody { /* ... */ };
struct CollisionPair { /* ... */ };
struct SurfaceMaterial { /* ... */ };
```

**Implementation needed:**
- ✅ Already defined in header
- Just needs to be moved to `src/physics/`

---

#### B. `/src/physics/PhysicsManager.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Main physics system manager
**Depends on:** PhysicsTypes.h

**Interface:**
```cpp
class PhysicsManager {
public:
    void initialize();
    void update(float dt);
    uint32_t create_body(const RigidBody& body);
    void destroy_body(uint32_t id);
    RigidBody* get_body(uint32_t id);
    void apply_force(uint32_t id, Vector3 force);
    void apply_impulse(uint32_t id, Vector3 impulse);
    // ... more methods
};
```

**Implementation estimate:** ~600 lines
**Complexity:** Medium
**Dependencies:** 
- RigidBodyManager
- CollisionManager
- ForceIntegrator
- SpatialPartition

---

#### C. `/src/physics/RigidBodyManager.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Lifecycle management for rigid bodies
**Uses from header:**
- `struct RigidBody`

**Interface:**
```cpp
class RigidBodyManager {
public:
    uint32_t create(const RigidBody& body);
    void destroy(uint32_t id);
    RigidBody* get(uint32_t id);
    const std::vector<RigidBody>& get_all() const;
    void clear();
    size_t count() const;
    
private:
    std::vector<RigidBody> bodies_;
    std::unordered_map<uint32_t, size_t> id_to_index_;
    uint32_t next_id_;
};
```

**Implementation estimate:** ~400 lines
**Complexity:** Low
**Dependencies:** PhysicsTypes.h

---

#### D. `/src/physics/ForceIntegrator.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Integrate forces and update positions/velocities
**Uses from header:**
- `struct RigidBody` (modifies position, velocity, acceleration)

**Interface:**
```cpp
class ForceIntegrator {
public:
    void integrate_forces(std::vector<RigidBody>& bodies, float dt);
    void integrate_velocities(std::vector<RigidBody>& bodies, float dt);
    void set_gravity(Vector3 gravity);
    Vector3 get_gravity() const;
    
private:
    Vector3 gravity_;
    void verlet_integration(RigidBody& body, float dt);
};
```

**Implementation estimate:** ~300 lines
**Complexity:** Medium
**Key algorithms:**
- Verlet integration for stability
- Gravity application
- Drag/friction damping
- Angular integration

---

#### E. `/src/physics/CollisionManager.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Collision detection and response
**Uses from header:**
- `struct CollisionPair`
- `struct RigidBody`
- Collision detection functions

**Interface:**
```cpp
class CollisionManager {
public:
    void detect_collisions(const std::vector<RigidBody>& bodies,
                          std::vector<CollisionPair>& out_collisions);
    void resolve_collisions(std::vector<RigidBody>& bodies,
                           const std::vector<CollisionPair>& collisions,
                           float dt);
    
private:
    SpatialPartition* spatial_partition_;
    
    // Narrow phase
    bool check_sphere_sphere(const RigidBody& a, const RigidBody& b);
    bool check_sphere_box(const RigidBody& a, const RigidBody& b);
    bool check_box_box(const RigidBody& a, const RigidBody& b);
    bool check_capsule_box(const RigidBody& a, const RigidBody& b);
    
    // Resolution
    void resolve_collision(RigidBody& a, RigidBody& b, 
                          const CollisionPair& collision);
};
```

**Implementation estimate:** ~800 lines
**Complexity:** High
**Key algorithms:**
- Broad phase (spatial partition)
- Narrow phase (shape-specific)
- Impulse-based resolution
- Penetration correction

---

#### F. `/src/physics/SpatialPartition.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Broad-phase collision detection optimization
**Uses from header:**
- `struct RigidBody`

**Interface:**
```cpp
class SpatialPartition {
public:
    void update(const std::vector<RigidBody>& bodies);
    std::vector<uint32_t> query_nearby(Vector3 position, float radius);
    std::vector<std::pair<uint32_t, uint32_t>> get_potential_pairs();
    void clear();
    
private:
    static constexpr float CELL_SIZE = 8.0f;
    static constexpr int GRID_SIZE = 128;
    std::vector<uint32_t> grid_[GRID_SIZE][GRID_SIZE];
};
```

**Implementation estimate:** ~400 lines
**Complexity:** Medium
**Algorithm:** Spatial hash grid

---

#### G. `/src/physics/BuoyancySystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Buoyancy and fluid forces
**Uses from header:**
- `struct RigidBody` (density, volume)
- `struct SurfaceMaterial`

**Interface:**
```cpp
class BuoyancySystem {
public:
    void update(std::vector<RigidBody>& bodies, 
               const FluidVolume& fluid,
               float dt);
    
private:
    float calculate_buoyant_force(const RigidBody& body,
                                  const FluidVolume& fluid);
    float calculate_displaced_volume(const RigidBody& body);
};
```

**Implementation estimate:** ~200 lines
**Complexity:** Low
**Algorithm:** Archimedes principle

---

## 2. `chemistry_system.h` → Chemistry Implementation

**Location:** `public/src/wasm/chemistry_system.h` (670 lines)
**Status:** 🟡 Header only, no implementation

### Maps To:

#### A. `/src/world/ChemistrySystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Element state management and reactions

**Uses from header:**
```cpp
enum ElementState { NEUTRAL, FIRE, WATER, ICE, ELECTRIC, WIND };
enum MaterialTag { WOOD, METAL, STONE, PLANT, CLOTH, LIQUID, ORGANIC };
struct ChemicalNode { /* ... */ };
struct ChemistryReaction { /* ... */ };
struct ChemistrySystem { /* grid, reactions */ };
```

**Interface:**
```cpp
class ChemistrySystem {
public:
    void initialize();
    void update(float dt);
    void apply_element(Vector3 position, ElementState element, float intensity);
    uint32_t get_state_at(Vector3 position);
    
private:
    ChemicalNode grid_[GRID_SIZE][GRID_SIZE];
    std::vector<ChemistryReaction> reactions_;
    
    void update_node(ChemicalNode& node, float dt);
    void propagate_fire(ChemicalNode& from, ChemicalNode& to, float dt);
    void handle_water_fire_reaction(ChemicalNode& node);
};
```

**Implementation estimate:** ~500 lines
**Complexity:** Medium
**Priority:** Phase 4+ (after core physics working)

---

## 3. `world_simulation.h` → World Systems Implementation

**Location:** `public/src/wasm/world_simulation.h` (1064 lines)
**Status:** 🟡 Header only, massive file

### Maps To Multiple Systems:

#### A. `/src/world/WeatherSystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Uses from header:**
```cpp
struct WeatherState { 
    float rain_intensity; 
    float wind_speed; 
    Vector3 wind_direction; 
    /* ... */ 
};
```

**Implementation estimate:** ~300 lines
**Priority:** Phase 4 (environment systems)

---

#### B. `/src/world/TerrainSystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Uses from header:**
```cpp
struct TerrainCell { /* ... */ };
struct FluidVolume { /* ... */ };
```

**Implementation estimate:** ~400 lines
**Priority:** Phase 4

---

#### C. `/src/world/HazardSystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Uses from header:**
```cpp
struct HazardVolume { 
    HazardType type; 
    float damage_per_second; 
    /* ... */ 
};
```

**Implementation estimate:** ~300 lines
**Priority:** Phase 3 (enemy environment)

**Integration with physics:**
```cpp
void HazardSystem::update(float dt, PhysicsManager& physics) {
    for (auto& hazard : hazards_) {
        // Find bodies in hazard volume
        auto bodies = physics.sphere_cast(hazard.position, hazard.radius);
        
        for (uint32_t body_id : bodies) {
            // Apply damage
            apply_hazard_damage(body_id, hazard, dt);
            
            // Apply physics forces (e.g., quicksand sinking)
            if (hazard.type == QUICKSAND) {
                Vector3 sink_force(0, -hazard.sink_rate * 100, 0);
                physics.apply_force(body_id, sink_force);
            }
        }
    }
}
```

---

#### D. `/src/world/TimeSystem.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Uses from header:**
```cpp
struct TimeSystem { 
    float current_time; 
    float day_length; 
    /* ... */ 
};
```

**Implementation estimate:** ~200 lines
**Priority:** Phase 5 (polish)

---

## 4. `force_propagation.h` → Force Systems

**Location:** `public/src/wasm/force_propagation.h`
**Status:** 🟡 Header only

### Maps To:

#### A. Integrated into `ForceIntegrator.cpp`
**Implementation estimate:** +200 lines to existing ForceIntegrator
**Features:**
- Impulse chains through connected bodies
- Explosion radial forces
- Force dampening

---

## 5. `constraint_logic.h` → Constraint Systems

**Location:** `public/src/wasm/constraint_logic.h`
**Status:** 🟡 Header only

### Maps To:

#### A. `/src/physics/ConstraintSolver.h/.cpp` (NEW)
**Status:** ❌ Doesn't exist
**Purpose:** Joints, ragdolls, structures

**Implementation estimate:** ~600 lines
**Complexity:** Very High
**Priority:** Phase 3+ (ragdolls), Phase 4+ (full constraints)

---

## Manager Refactoring Map

### Current → Physics-First

#### `/src/managers/PlayerManager.*` 🔄
**Current:** 200 lines, direct position updates
**Becomes:** `/src/entities/PlayerEntity.*`
**Changes:**
- Remove position/velocity storage
- Add `uint32_t physics_body_id_`
- Replace `update()` with force applications
- Query physics for all state

**Estimate:** Complete rewrite, ~500 lines

---

#### `/src/managers/CombatManager.*` 🔄
**Current:** 300 lines, scripted combat
**Becomes:** `/src/combat/PhysicsCombatSystem.*`
**Changes:**
- Hitboxes become physics triggers
- Damage from momentum
- Knockback as impulses
- Integration with PhysicsManager

**Estimate:** Complete rewrite, ~700 lines

---

#### `/src/managers/InputManager.*` 🟢
**Current:** Can stay mostly as-is
**Changes:**
- Add helper methods for force application
- Add grab/throw input handling

**Estimate:** +50 lines, minor additions

---

#### `/src/managers/GameStateManager.*` 🟢
**Current:** No changes needed
**Changes:** None, doesn't interact with physics

---

## Build System Map

### `/src/CMakeLists.txt` 🔄
**Current:** 4 managers + coordinator
**Add:**
```cmake
# Physics
physics/PhysicsManager.cpp
physics/RigidBodyManager.cpp
physics/CollisionManager.cpp
physics/ForceIntegrator.cpp
physics/SpatialPartition.cpp
physics/BuoyancySystem.cpp
physics/ConstraintSolver.cpp

# Entities
entities/Entity.cpp
entities/PlayerEntity.cpp
entities/EnemyEntity.cpp

# Combat
combat/PhysicsCombatSystem.cpp

# Interaction
interaction/GrabSystem.cpp
interaction/PushPullSystem.cpp

# World (later phases)
world/ChemistrySystem.cpp
world/HazardSystem.cpp
world/WeatherSystem.cpp
```

---

## WASM Export Map

### Current Exports (in `game_refactored.cpp`)
- ✅ `get_x()`, `get_y()` - Player position
- ✅ `get_vel_x()`, `get_vel_y()` - Player velocity
- ✅ `set_player_input()` - Input setting
- ✅ `get_stamina()`, `get_hp()` - Player stats

### New Physics Exports Needed

#### Phase 1: Core Physics
```cpp
// Body queries
float get_body_x(uint32_t body_id);
float get_body_y(uint32_t body_id);
float get_body_z(uint32_t body_id);
float get_body_vel_x(uint32_t body_id);
float get_body_vel_y(uint32_t body_id);
float get_body_vel_z(uint32_t body_id);
float get_body_mass(uint32_t body_id);

// Force application
void apply_force(uint32_t body_id, float x, float y, float z);
void apply_impulse(uint32_t body_id, float x, float y, float z);
void set_body_velocity(uint32_t body_id, float x, float y, float z);
```

#### Phase 2: Combat
```cpp
// Attack system
uint32_t spawn_attack_hitbox(uint32_t owner_id, float offset_x, float offset_y, 
                             float radius, float damage, float knockback);
int get_hit_count();
uint32_t get_hit_attacker(int index);
uint32_t get_hit_defender(int index);
float get_hit_damage(int index);
```

#### Phase 4: Interaction
```cpp
// Grab/throw
int try_grab(uint32_t player_id);
void release_grab(uint32_t player_id);
void throw_object(uint32_t player_id, float dir_x, float dir_y, float force);
uint32_t get_grabbed_object(uint32_t player_id);
```

**Total new exports:** ~30

---

## Implementation Priority Matrix

| File | Lines | Complexity | Priority | Phase |
|------|-------|------------|----------|-------|
| `PhysicsTypes.h` | 200 | Low | Critical | 0 |
| `PhysicsManager.*` | 600 | Medium | Critical | 1 |
| `RigidBodyManager.*` | 400 | Low | Critical | 1 |
| `ForceIntegrator.*` | 300 | Medium | Critical | 1 |
| `CollisionManager.*` | 800 | High | Critical | 1 |
| `SpatialPartition.*` | 400 | Medium | Critical | 1 |
| `PlayerEntity.*` | 500 | High | Critical | 2 |
| `PhysicsCombatSystem.*` | 700 | High | Critical | 2 |
| `EnemyEntity.*` | 600 | High | Important | 3 |
| `GrabSystem.*` | 400 | Medium | Important | 4 |
| `PushPullSystem.*` | 300 | Low | Important | 4 |
| `BuoyancySystem.*` | 200 | Low | Nice-to-have | 4 |
| `ConstraintSolver.*` | 600 | Very High | Nice-to-have | 4 |
| `ChemistrySystem.*` | 500 | Medium | Future | 5+ |
| `WeatherSystem.*` | 300 | Low | Future | 5+ |
| `HazardSystem.*` | 300 | Medium | Important | 3 |

---

## Code Migration Checklist

### Phase 0: Preparation
- [ ] Create `src/physics/` directory
- [ ] Create `src/entities/` directory
- [ ] Create `src/combat/` directory
- [ ] Create `src/interaction/` directory
- [ ] Create `src/world/` directory
- [ ] Move headers from `public/src/wasm/` to `src/physics/`
- [ ] Update CMakeLists.txt
- [ ] Verify compilation with empty implementations

### Phase 1: Core Physics
- [ ] Implement PhysicsTypes.h (move, no changes)
- [ ] Implement PhysicsManager (600 lines)
- [ ] Implement RigidBodyManager (400 lines)
- [ ] Implement ForceIntegrator (300 lines)
- [ ] Implement CollisionManager (800 lines)
- [ ] Implement SpatialPartition (400 lines)
- [ ] Add physics exports to WASM
- [ ] Test: bouncing ball

### Phase 2: Combat
- [ ] Implement PhysicsCombatSystem (700 lines)
- [ ] Implement PlayerEntity (500 lines)
- [ ] Update GameCoordinator
- [ ] Add combat exports to WASM
- [ ] Test: physics knockback

### Phase 3: Enemies
- [ ] Implement EnemyEntity (600 lines)
- [ ] Implement HazardSystem (300 lines)
- [ ] Update enemy AI to use forces
- [ ] Test: 20 enemies physics

### Phase 4: Interaction
- [ ] Implement GrabSystem (400 lines)
- [ ] Implement PushPullSystem (300 lines)
- [ ] Add interaction exports to WASM
- [ ] Test: grab/throw object

### Phase 5: Polish
- [ ] Optimize performance
- [ ] Add LOD system
- [ ] Add sleep system
- [ ] Complete documentation

---

## Total Code Estimate

| Category | Lines |
|----------|-------|
| **Existing Headers** | 3,076 |
| **New Implementations** | 5,400 |
| **Refactored Code** | 1,200 |
| **WASM Exports** | 400 |
| **Test Code** | 1,000 |
| **Total** | **11,076** |

**Development time:** 10-11 weeks (1 engineer)

---

*Use this map to track progress and understand dependencies between components.*
