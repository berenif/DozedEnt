# 🎯 Physics-Combat Integration Implementation Guide

## Project Context

**DozedEnt**: WASM-first multiplayer survival fighting game  
**Architecture**: All game logic in C++ (WebAssembly), JavaScript only for rendering/input/networking  
**Current State**: Working 5-button combat, combo system, 30+ status effects, stamina management  
**Goal**: Add physics-driven combat with emergent gameplay while maintaining determinism

---

## Core Design Decisions

### Philosophy
- **70% Emergent / 30% Scripted** gameplay balance
- **Priority**: Combat responsiveness > Tactical depth > Physics realism > Mobile 60fps > Multiplayer determinism
- **PvP Critical**: Frame-perfect determinism required for competitive play

### Architecture Choices

**1. Physics-Combat Integration**: Hybrid approach - set up basic structure + quick win demo to validate pipeline

**2. Combat Manager Extension**: Extend existing `CombatManager` to add physics methods (keeps everything together)

**3. Build System**: Add physics sources to existing build incrementally

**4. Entity Structure**: Refactor player to entity structure as part of physics work

**5. Testing Strategy**: Build visual demos (HTML pages) for immediate feedback

**6. Determinism**: Start with fixed-point from day one (16.16 format) to avoid refactoring later

**7. File Organization**: Create directories incrementally as needed (cleaner git history)

---

## Technical Implementation Plan

### Week 1: Foundation + Knockback Demo

#### File Structure
```
src/
├── physics/
│   ├── FixedPoint.h              # 16.16 fixed-point math
│   ├── PhysicsTypes.h            # Vector3, RigidBody structs
│   ├── PhysicsManager.h          # Core physics loop
│   └── PhysicsManager.cpp        # Integration & force application
├── entities/
│   ├── PlayerEntity.h            # Physics-enabled player
│   └── PlayerEntity.cpp          # Replaces PlayerManager gradually
├── managers/
│   ├── CombatManager.h           # Extended with knockback
│   └── CombatManager.cpp         # apply_knockback_impulse()
└── CMakeLists.txt                # Updated with physics sources
```

#### Core Components

##### 1. Fixed-Point Math (`src/physics/FixedPoint.h`)
```cpp
#pragma once
#include <cstdint>

// 16.16 fixed-point for deterministic physics
struct Fixed {
    int32_t raw;
    static constexpr int32_t SHIFT = 16;
    static constexpr int32_t ONE = 1 << SHIFT;
    
    // Construction
    Fixed() : raw(0) {}
    explicit Fixed(int32_t r) : raw(r) {}
    
    static Fixed from_int(int32_t i) { 
        return Fixed(i << SHIFT); 
    }
    
    static Fixed from_float(float f) { 
        return Fixed(static_cast<int32_t>(f * ONE)); 
    }
    
    float to_float() const { 
        return static_cast<float>(raw) / ONE; 
    }
    
    // Arithmetic
    Fixed operator+(Fixed o) const { return Fixed(raw + o.raw); }
    Fixed operator-(Fixed o) const { return Fixed(raw - o.raw); }
    Fixed operator-() const { return Fixed(-raw); }
    
    Fixed operator*(Fixed o) const { 
        return Fixed(static_cast<int32_t>((static_cast<int64_t>(raw) * o.raw) >> SHIFT)); 
    }
    
    Fixed operator/(Fixed o) const {
        return Fixed(static_cast<int32_t>((static_cast<int64_t>(raw) << SHIFT) / o.raw));
    }
    
    // Comparison
    bool operator==(Fixed o) const { return raw == o.raw; }
    bool operator<(Fixed o) const { return raw < o.raw; }
    bool operator>(Fixed o) const { return raw > o.raw; }
    bool operator<=(Fixed o) const { return raw <= o.raw; }
    bool operator>=(Fixed o) const { return raw >= o.raw; }
    
    // In-place operations
    Fixed& operator+=(Fixed o) { raw += o.raw; return *this; }
    Fixed& operator-=(Fixed o) { raw -= o.raw; return *this; }
    Fixed& operator*=(Fixed o) { 
        raw = static_cast<int32_t>((static_cast<int64_t>(raw) * o.raw) >> SHIFT);
        return *this;
    }
};

// Fixed-point vector for deterministic positions/velocities
struct FixedVector3 {
    Fixed x, y, z;
    
    FixedVector3() : x(Fixed::from_int(0)), y(Fixed::from_int(0)), z(Fixed::from_int(0)) {}
    FixedVector3(Fixed x_, Fixed y_, Fixed z_) : x(x_), y(y_), z(z_) {}
    
    static FixedVector3 from_floats(float fx, float fy, float fz) {
        return FixedVector3(Fixed::from_float(fx), Fixed::from_float(fy), Fixed::from_float(fz));
    }
    
    FixedVector3 operator+(const FixedVector3& o) const {
        return FixedVector3(x + o.x, y + o.y, z + o.z);
    }
    
    FixedVector3 operator-(const FixedVector3& o) const {
        return FixedVector3(x - o.x, y - o.y, z - o.z);
    }
    
    FixedVector3 operator*(Fixed scalar) const {
        return FixedVector3(x * scalar, y * scalar, z * scalar);
    }
    
    FixedVector3& operator+=(const FixedVector3& o) {
        x += o.x; y += o.y; z += o.z;
        return *this;
    }
    
    Fixed dot(const FixedVector3& o) const {
        return x * o.x + y * o.y + z * o.z;
    }
    
    Fixed length_squared() const {
        return x * x + y * y + z * z;
    }
    
    // Approximate normalized (use lookup table in production)
    FixedVector3 normalized() const {
        // Simple approximation - refine with fast inverse sqrt later
        float fx = x.to_float();
        float fy = y.to_float();
        float fz = z.to_float();
        float len = sqrtf(fx*fx + fy*fy + fz*fz);
        if (len < 0.0001f) return FixedVector3();
        return from_floats(fx/len, fy/len, fz/len);
    }
};
```

##### 2. Physics Types (`src/physics/PhysicsTypes.h`)
```cpp
#pragma once
#include "FixedPoint.h"

enum class BodyType {
    Dynamic = 0,    // Affected by forces (players, barrels)
    Kinematic = 1,  // Moves but unaffected by forces (moving platforms)
    Static = 2      // Never moves (terrain, walls)
};

struct RigidBody {
    // Identity
    uint32_t id;
    BodyType type;
    
    // Fixed-point physics state
    FixedVector3 position;
    FixedVector3 velocity;
    FixedVector3 acceleration;
    
    // Physical properties (fixed-point)
    Fixed mass;              // kg
    Fixed inverse_mass;      // 1/mass (optimization)
    Fixed friction;          // 0-1 (surface drag)
    Fixed restitution;       // 0-1 (bounciness)
    Fixed drag;              // Air resistance
    
    // Collision
    Fixed radius;            // Sphere collision for now
    uint32_t collision_layer;
    uint32_t collision_mask;
    
    // State flags
    bool is_sleeping;
    float sleep_timer;       // Float for sleep logic only
    
    RigidBody() 
        : id(0)
        , type(BodyType::Dynamic)
        , mass(Fixed::from_int(70))           // 70kg default
        , inverse_mass(Fixed::from_float(1.0f/70.0f))
        , friction(Fixed::from_float(0.9f))   // High friction by default
        , restitution(Fixed::from_float(0.3f))
        , drag(Fixed::from_float(0.98f))
        , radius(Fixed::from_float(0.5f))
        , collision_layer(1)
        , collision_mask(0xFFFFFFFF)
        , is_sleeping(false)
        , sleep_timer(0.0f)
    {}
};

struct PhysicsConfig {
    FixedVector3 gravity;
    Fixed timestep;           // Fixed timestep (1/60 sec)
    int max_bodies;
    int max_iterations;       // Solver iterations
    
    PhysicsConfig()
        : gravity(FixedVector3::from_floats(0.0f, -9.81f, 0.0f))
        , timestep(Fixed::from_float(1.0f / 60.0f))
        , max_bodies(50)
        , max_iterations(4)
    {}
};
```

##### 3. Physics Manager (`src/physics/PhysicsManager.h`)
```cpp
#pragma once
#include "PhysicsTypes.h"
#include <vector>

class PhysicsManager {
public:
    PhysicsManager();
    ~PhysicsManager() = default;
    
    // Core lifecycle
    void initialize(const PhysicsConfig& config);
    void update(float delta_time);  // Accumulates time, steps fixed timestep
    void reset();
    
    // Body management
    uint32_t create_body(const RigidBody& body);
    void destroy_body(uint32_t id);
    RigidBody* get_body(uint32_t id);
    const RigidBody* get_body(uint32_t id) const;
    
    // Force application
    void apply_impulse(uint32_t body_id, const FixedVector3& impulse);
    void apply_force(uint32_t body_id, const FixedVector3& force);
    void set_velocity(uint32_t body_id, const FixedVector3& velocity);
    
    // Queries
    int get_body_count() const { return static_cast<int>(bodies_.size()); }
    const PhysicsConfig& get_config() const { return config_; }
    
    // Debug/profiling
    float get_last_step_time_ms() const { return last_step_time_ms_; }
    
private:
    PhysicsConfig config_;
    std::vector<RigidBody> bodies_;
    float time_accumulator_;
    float last_step_time_ms_;
    
    // Internal simulation
    void step(Fixed dt);
    void integrate_forces(Fixed dt);
    void detect_collisions();
    void resolve_collisions();
    void update_sleep_states(float real_dt);
    
    // Helpers
    uint32_t next_body_id_;
    uint32_t generate_body_id() { return next_body_id_++; }
};
```

##### 4. Extended Combat Manager (`src/managers/CombatManager.h`)
Add to existing CombatManager class:

```cpp
// Add to public section:
void apply_knockback_impulse(uint32_t body_id, float dir_x, float dir_y, float force);
void apply_attack_lunge(uint32_t body_id, float facing_x, float facing_y);

// Add to private section:
class PhysicsManager* physics_manager_;  // Injected dependency

// Add setter:
void set_physics_manager(PhysicsManager* pm) { physics_manager_ = pm; }
```

##### 5. Combat Manager Implementation (`src/managers/CombatManager.cpp`)
Add to existing file:

```cpp
#include "../physics/PhysicsManager.h"

void CombatManager::apply_knockback_impulse(uint32_t body_id, float dir_x, float dir_y, float force) {
    if (!physics_manager_) return;
    
    // Convert float direction to fixed-point impulse
    FixedVector3 direction = FixedVector3::from_floats(dir_x, dir_y, 0.0f).normalized();
    FixedVector3 impulse = direction * Fixed::from_float(force);
    
    physics_manager_->apply_impulse(body_id, impulse);
}

void CombatManager::apply_attack_lunge(uint32_t body_id, float facing_x, float facing_y) {
    if (!physics_manager_) return;
    
    // Light attacks lunge forward slightly (5 units force)
    float lunge_force = 5.0f;
    if (state_.attack_state == AttackState::Windup) {
        FixedVector3 lunge_dir = FixedVector3::from_floats(facing_x, facing_y, 0.0f).normalized();
        FixedVector3 impulse = lunge_dir * Fixed::from_float(lunge_force);
        physics_manager_->apply_impulse(body_id, impulse);
        
        // Temporarily reduce friction for slide effect (300ms)
        RigidBody* body = physics_manager_->get_body(body_id);
        if (body) {
            body->friction = Fixed::from_float(0.6f);  // Reduced friction during attack
        }
    }
}
```

##### 6. Updated CMakeLists.txt
Add to existing file:

```cmake
# Physics sources
set(PHYSICS_SOURCES
    physics/PhysicsManager.cpp
)

# Update ALL_SOURCES
set(ALL_SOURCES
    ${MANAGER_SOURCES}
    ${COORDINATOR_SOURCES}
    ${CORE_SOURCES}
    ${PHYSICS_SOURCES}
    ${MAIN_SOURCES}
)

# Add physics include directory
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/managers
    ${CMAKE_CURRENT_SOURCE_DIR}/coordinators
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/physics
)
```

##### 7. WASM Exports (`src/game_refactored.cpp`)
Add to existing exports:

```cpp
#include "physics/PhysicsManager.h"

// Global physics manager
static PhysicsManager* g_physics_manager = nullptr;

extern "C" {
    // Initialize physics system
    __attribute__((export_name("physics_initialize")))
    void physics_initialize() {
        if (!g_physics_manager) {
            g_physics_manager = new PhysicsManager();
            PhysicsConfig config;
            g_physics_manager->initialize(config);
            
            // Wire physics into combat manager
            // g_combat_manager->set_physics_manager(g_physics_manager);
        }
    }
    
    // Apply knockback (called from JS on hit)
    __attribute__((export_name("apply_physics_knockback")))
    void apply_physics_knockback(float dx, float dy, float force) {
        if (!g_physics_manager) return;
        
        // Apply to player body (ID 0 for now)
        uint32_t player_body_id = 0;
        RigidBody* body = g_physics_manager->get_body(player_body_id);
        if (body) {
            FixedVector3 dir = FixedVector3::from_floats(dx, dy, 0.0f).normalized();
            FixedVector3 impulse = dir * Fixed::from_float(force);
            g_physics_manager->apply_impulse(player_body_id, impulse);
        }
    }
    
    // Query player physics position
    __attribute__((export_name("get_physics_player_x")))
    float get_physics_player_x() {
        if (!g_physics_manager) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(0);
        return body ? body->position.x.to_float() : 0.0f;
    }
    
    __attribute__((export_name("get_physics_player_y")))
    float get_physics_player_y() {
        if (!g_physics_manager) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(0);
        return body ? body->position.y.to_float() : 0.0f;
    }
    
    __attribute__((export_name("get_physics_player_vel_x")))
    float get_physics_player_vel_x() {
        if (!g_physics_manager) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(0);
        return body ? body->velocity.x.to_float() : 0.0f;
    }
    
    __attribute__((export_name("get_physics_player_vel_y")))
    float get_physics_player_vel_y() {
        if (!g_physics_manager) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(0);
        return body ? body->velocity.y.to_float() : 0.0f;
    }
}
```

##### 8. Visual Demo (`public/demos/physics-knockback-demo.html`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Physics Knockback Demo</title>
    <style>
        body { margin: 0; overflow: hidden; background: #1a1a2e; font-family: monospace; }
        canvas { display: block; }
        #controls { 
            position: absolute; top: 10px; left: 10px; 
            color: white; background: rgba(0,0,0,0.7); 
            padding: 15px; border-radius: 5px;
        }
        button { margin: 5px; padding: 8px 15px; cursor: pointer; }
        .stats { margin-top: 10px; font-size: 12px; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="controls">
        <h3>Physics Knockback Demo</h3>
        <button onclick="applyKnockback(1, 0, 20)">Knockback Right →</button>
        <button onclick="applyKnockback(-1, 0, 20)">Knockback Left ←</button>
        <button onclick="applyKnockback(0, 1, 20)">Knockback Up ↑</button>
        <button onclick="applyKnockback(0, -1, 20)">Knockback Down ↓</button>
        <button onclick="applyLunge()">Attack Lunge</button>
        <div class="stats" id="stats"></div>
    </div>
    
    <script type="module">
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;
        
        let wasmExports = null;
        let playerFacing = { x: 1, y: 0 };
        
        // Load WASM
        async function initWasm() {
            const response = await fetch('../../game.wasm');
            const bytes = await response.arrayBuffer();
            const wasm = await WebAssembly.instantiate(bytes);
            wasmExports = wasm.instance.exports;
            
            // Initialize physics
            wasmExports.physics_initialize();
            console.log('Physics initialized');
            
            // Start render loop
            requestAnimationFrame(render);
        }
        
        // Apply knockback from controls
        window.applyKnockback = function(dx, dy, force) {
            if (wasmExports) {
                wasmExports.apply_physics_knockback(dx, dy, force);
            }
        };
        
        // Apply attack lunge
        window.applyLunge = function() {
            if (wasmExports) {
                // Lunge in facing direction
                wasmExports.apply_physics_knockback(playerFacing.x, playerFacing.y, 5);
            }
        };
        
        // Render loop
        function render() {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (!wasmExports) {
                ctx.fillStyle = 'white';
                ctx.fillText('Loading WASM...', 20, 20);
                requestAnimationFrame(render);
                return;
            }
            
            // Get player physics position
            const px = wasmExports.get_physics_player_x();
            const py = wasmExports.get_physics_player_y();
            const vx = wasmExports.get_physics_player_vel_x();
            const vy = wasmExports.get_physics_player_vel_y();
            
            // Draw grid
            ctx.strokeStyle = '#2a2a4e';
            for (let i = 0; i < canvas.width; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 50) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }
            
            // Draw player (convert from world space to screen space)
            const screenX = canvas.width / 2 + px * 100;
            const screenY = canvas.height / 2 - py * 100;
            
            // Draw velocity vector
            if (vx !== 0 || vy !== 0) {
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + vx * 10, screenY - vy * 10);
                ctx.stroke();
            }
            
            // Draw player
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw facing direction
            ctx.fillStyle = '#ffe66d';
            ctx.beginPath();
            ctx.arc(screenX + playerFacing.x * 15, screenY - playerFacing.y * 15, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Update stats
            document.getElementById('stats').innerHTML = `
                Position: (${px.toFixed(2)}, ${py.toFixed(2)})<br>
                Velocity: (${vx.toFixed(2)}, ${vy.toFixed(2)})<br>
                Speed: ${Math.sqrt(vx*vx + vy*vy).toFixed(2)} m/s
            `;
            
            requestAnimationFrame(render);
        }
        
        // Keyboard controls for facing direction
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft': case 'a': playerFacing = {x: -1, y: 0}; break;
                case 'ArrowRight': case 'd': playerFacing = {x: 1, y: 0}; break;
                case 'ArrowUp': case 'w': playerFacing = {x: 0, y: 1}; break;
                case 'ArrowDown': case 's': playerFacing = {x: 0, y: -1}; break;
                case ' ': applyLunge(); break;
            }
        });
        
        initWasm();
    </script>
</body>
</html>
```

---

### Week 2: Physics Barrels

#### New Components

##### 1. Physics Barrel Entity (`src/entities/PhysicsBarrel.h`)
```cpp
#pragma once
#include "../physics/PhysicsTypes.h"

class PhysicsBarrel {
public:
    PhysicsBarrel();
    
    void initialize(uint32_t physics_body_id, float x, float y, float z);
    void update(float delta_time);
    
    // Barrel properties
    uint32_t get_body_id() const { return body_id_; }
    bool is_projectile() const { return is_projectile_; }
    void mark_as_projectile() { is_projectile_ = true; }
    
    // Damage calculation
    float calculate_impact_damage(float speed, float mass) const;
    
private:
    uint32_t body_id_;
    bool is_projectile_;
    float lifetime_;
    
    static constexpr float BARREL_MASS = 20.0f;  // kg
    static constexpr float DAMAGE_MULTIPLIER = 0.5f;  // damage = mass * speed * 0.5
};
```

##### 2. WASM Barrel Exports
Add to `src/game_refactored.cpp`:

```cpp
// Barrel management
static std::vector<PhysicsBarrel> g_barrels;

extern "C" {
    __attribute__((export_name("spawn_barrel")))
    uint32_t spawn_barrel(float x, float y, float z) {
        if (!g_physics_manager) return 0;
        
        // Create physics body
        RigidBody barrel_body;
        barrel_body.position = FixedVector3::from_floats(x, y, z);
        barrel_body.mass = Fixed::from_float(20.0f);  // 20kg
        barrel_body.inverse_mass = Fixed::from_float(1.0f / 20.0f);
        barrel_body.friction = Fixed::from_float(0.7f);
        barrel_body.restitution = Fixed::from_float(0.3f);
        barrel_body.radius = Fixed::from_float(0.5f);
        
        uint32_t body_id = g_physics_manager->create_body(barrel_body);
        
        // Create barrel entity
        PhysicsBarrel barrel;
        barrel.initialize(body_id, x, y, z);
        g_barrels.push_back(barrel);
        
        return body_id;
    }
    
    __attribute__((export_name("throw_barrel")))
    void throw_barrel(uint32_t body_id, float dx, float dy, float dz, float force) {
        if (!g_physics_manager) return;
        
        FixedVector3 dir = FixedVector3::from_floats(dx, dy, dz).normalized();
        FixedVector3 impulse = dir * Fixed::from_float(force);
        g_physics_manager->apply_impulse(body_id, impulse);
        
        // Mark as projectile for damage tracking
        for (auto& barrel : g_barrels) {
            if (barrel.get_body_id() == body_id) {
                barrel.mark_as_projectile();
                break;
            }
        }
    }
    
    __attribute__((export_name("get_barrel_count")))
    int get_barrel_count() {
        return static_cast<int>(g_barrels.size());
    }
    
    __attribute__((export_name("get_barrel_x")))
    float get_barrel_x(int index) {
        if (index < 0 || index >= static_cast<int>(g_barrels.size())) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(g_barrels[index].get_body_id());
        return body ? body->position.x.to_float() : 0.0f;
    }
    
    __attribute__((export_name("get_barrel_y")))
    float get_barrel_y(int index) {
        if (index < 0 || index >= static_cast<int>(g_barrels.size())) return 0.0f;
        const RigidBody* body = g_physics_manager->get_body(g_barrels[index].get_body_id());
        return body ? body->position.y.to_float() : 0.0f;
    }
}
```

---

## Performance Budget (Mobile 60fps Target)

```
Frame Budget: 16.67ms
├─ Physics:          5ms (30%)
│  └─ Fixed-point:   3ms (integration + collision)
├─ Rendering:        6ms (36%)
├─ Game Logic:       3ms (18%)
└─ Reserve:        2.67ms (16%)
```

**Optimization Strategies**:
- Use sphere-only collision (Phase 0.5)
- Spatial grid disabled until needed (10+ objects)
- Sleep system for stationary objects
- LOD: Disable physics for off-screen objects

---

## Success Criteria

### Week 1 Complete ✅
- [ ] Fixed-point math library working (16.16 format)
- [ ] PhysicsManager update loop integrated
- [ ] Knockback visually working in demo
- [ ] Player position deterministic after knockback
- [ ] Attack lunges feel responsive
- [ ] WASM exports functional from JavaScript
- [ ] Demo loads in browser without errors

### Week 2 Complete ✅
- [ ] 5 physics barrels spawnable
- [ ] Barrels respond to player collision
- [ ] Thrown barrels deal momentum damage
- [ ] Barrel → Enemy collision detected
- [ ] Visual demo shows emergent barrel physics
- [ ] Performance: 60fps with 5 barrels + player

---

## File Creation Checklist

### Phase 0.5 Week 1
```
[ ] src/physics/FixedPoint.h
[ ] src/physics/PhysicsTypes.h
[ ] src/physics/PhysicsManager.h
[ ] src/physics/PhysicsManager.cpp
[ ] src/managers/CombatManager.h (extend existing)
[ ] src/managers/CombatManager.cpp (extend existing)
[ ] src/CMakeLists.txt (update)
[ ] src/game_refactored.cpp (add exports)
[ ] public/demos/physics-knockback-demo.html
```

### Phase 0.5 Week 2
```
[ ] src/entities/PhysicsBarrel.h
[ ] src/entities/PhysicsBarrel.cpp
[ ] src/game_refactored.cpp (add barrel exports)
[ ] public/demos/physics-barrel-demo.html
```

---

## Critical Technical Notes

### Fixed-Point Performance
- 2-3x slower than float operations
- Keep only player/enemies in fixed-point (determinism critical)
- Props can use float physics (Phase 2)

### Determinism Validation
```cpp
// Golden test structure
PhysicsManager sim1, sim2;
sim1.initialize(config);
sim2.initialize(config);

// Apply same inputs
for (int i = 0; i < 3600; i++) {  // 60 seconds
    sim1.update(1.0f / 60.0f);
    sim2.update(1.0f / 60.0f);
}

// MUST be bit-identical
assert(sim1.get_body(0)->position.x.raw == sim2.get_body(0)->position.x.raw);
```

### WASM Build Command
```bash
# Windows (PowerShell)
npm run wasm:build:dev

# Output: game.wasm in project root
```

### JavaScript Integration Pattern
```javascript
// Initialize physics
wasmExports.physics_initialize();

// Game loop
function update(dt) {
    // Physics runs in WASM update
    wasmExports.update(inputX, inputY, isRolling, dt);
    
    // Read results for rendering
    const px = wasmExports.get_physics_player_x();
    const py = wasmExports.get_physics_player_y();
    
    renderPlayer(px, py);
}
```

---

## Next Steps After Week 2

### Month 1: Solidify Foundations
- Refine fixed-point math (fast inverse sqrt)
- Build determinism test suite
- Add capsule collision for player
- Implement spatial partition (8x8m grid)
- Add sleep system (2 sec threshold)

### Month 2: Combat Integration
- Physics hitboxes for attacks
- Momentum-based damage formula
- Enemy ragdoll system
- Performance profiling dashboard

---

**Implementation Start Date**: January 2025  
**Status Tracker**: `src/PHYSICS_PROGRESS.md`  
**Source Mapping**: `src/FEATURES_TO_SOURCE_MAP.md`

---

*This document contains everything needed to start physics implementation. Follow the file creation checklist in order. Build and test after each file. Commit incrementally.*

