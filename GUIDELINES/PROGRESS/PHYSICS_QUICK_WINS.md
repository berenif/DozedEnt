# ⚡ Physics System Quick Wins

## Purpose

This document outlines **quick, demonstrable wins** that can showcase physics-based emergent gameplay early, before the full physics overhaul is complete. Each win is self-contained and can be shown as proof of concept.

---

## Quick Win #1: Bouncing Ball Demo

### Goal
Demonstrate basic physics simulation working - gravity, collision, restitution.

### Implementation

**File:** `/workspace/demos/bouncing-ball-physics.cpp`

```cpp
#include "../src/physics/PhysicsTypes.h"

struct SimpleBall {
    Vector3 position;
    Vector3 velocity;
    float radius = 0.5f;
    float mass = 1.0f;
    float restitution = 0.8f; // Bounciness
};

void update_ball(SimpleBall& ball, float dt) {
    // Apply gravity
    const float GRAVITY = -9.81f;
    ball.velocity.y += GRAVITY * dt;
    
    // Update position
    ball.position += ball.velocity * dt;
    
    // Ground collision
    if (ball.position.y - ball.radius < 0.0f) {
        ball.position.y = ball.radius;
        ball.velocity.y = -ball.velocity.y * ball.restitution;
        
        // Energy loss
        ball.velocity.x *= 0.95f;
        ball.velocity.z *= 0.95f;
    }
}

// WASM exports for visualization
extern "C" {
    SimpleBall demo_ball;
    
    __attribute__((export_name("demo_init_ball")))
    void demo_init_ball(float x, float y, float z) {
        demo_ball.position = Vector3(x, y, z);
        demo_ball.velocity = Vector3(0, 0, 0);
    }
    
    __attribute__((export_name("demo_update_ball")))
    void demo_update_ball(float dt) {
        update_ball(demo_ball, dt);
    }
    
    __attribute__((export_name("demo_get_ball_x")))
    float demo_get_ball_x() { return demo_ball.position.x; }
    
    __attribute__((export_name("demo_get_ball_y")))
    float demo_get_ball_y() { return demo_ball.position.y; }
    
    __attribute__((export_name("demo_get_ball_z")))
    float demo_get_ball_z() { return demo_ball.position.z; }
}
```

**JavaScript visualization:**

```javascript
// In demos/bouncing-ball.html
let ball = { x: 0, y: 10, z: 0 };

function render() {
    // Update physics
    wasmExports.demo_update_ball(1/60);
    
    // Read position
    ball.x = wasmExports.demo_get_ball_x();
    ball.y = wasmExports.demo_get_ball_y();
    ball.z = wasmExports.demo_get_ball_z();
    
    // Draw ball
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        ball.x * 20 + 200,  // Scale and center
        300 - ball.y * 20,  // Flip Y
        10,                  // Radius
        0, Math.PI * 2
    );
    ctx.fill();
    
    requestAnimationFrame(render);
}
```

### Deliverable
- Working demo in `demos/bouncing-ball.html`
- Ball bounces realistically with energy loss
- Demonstrates: gravity, collision, restitution

### Demo Script
> "Here's our basic physics engine working. The ball has mass, gravity affects it, and when it hits the ground, it bounces with energy loss. This is the foundation for all our physics-driven gameplay."

---

## Quick Win #2: Player Knockback Impulse

### Goal
Show combat knockback using physics impulses instead of scripted animation.

### Implementation

**File:** `/workspace/src/demo/player-knockback-demo.cpp`

```cpp
// Temporary: Add physics knockback to existing PlayerManager
void PlayerManager::apply_physics_knockback(float dir_x, float dir_y, float force) {
    // Create temporary physics state
    Vector3 position(x_, y_, 0);
    Vector3 velocity(vel_x_, vel_y_, 0);
    Vector3 knockback_impulse(dir_x * force, dir_y * force, 0);
    
    // Physics integration
    const float MASS = 70.0f; // kg
    Vector3 delta_velocity = knockback_impulse / MASS;
    velocity += delta_velocity;
    
    // Apply drag
    const float DRAG = 0.95f;
    velocity *= DRAG;
    
    // Write back to player state
    vel_x_ = velocity.x;
    vel_y_ = velocity.y;
    
    // Visual feedback
    knockback_time_ = 0.3f; // Hitstun duration
}
```

**WASM Export:**

```cpp
extern "C" {
    __attribute__((export_name("demo_apply_knockback")))
    void demo_apply_knockback(float dir_x, float dir_y, float force) {
        g_coordinator.get_player_manager().apply_physics_knockback(dir_x, dir_y, force);
    }
}
```

**JavaScript Trigger:**

```javascript
// On enemy attack hit
if (attackHit) {
    const knockbackDirection = {
        x: player.x - enemy.x,
        y: player.y - enemy.y
    };
    const magnitude = Math.sqrt(
        knockbackDirection.x ** 2 + 
        knockbackDirection.y ** 2
    );
    knockbackDirection.x /= magnitude;
    knockbackDirection.y /= magnitude;
    
    // Apply physics impulse
    wasmExports.demo_apply_knockback(
        knockbackDirection.x,
        knockbackDirection.y,
        15.0  // Force magnitude
    );
    
    // Visual effects
    showKnockbackEffect(player.x, player.y);
}
```

### Deliverable
- Player is knocked back realistically when hit
- Knockback magnitude affected by mass
- Direction based on attack angle
- Demonstrates: impulses, mass, momentum

### Demo Script
> "When the enemy hits the player, we apply a physics impulse based on the attack direction and force. The player's mass affects how far they're knocked back. Heavy characters are harder to knock around."

---

## Quick Win #3: Barrel Throw Projectile

### Goal
Pick up, carry, and throw a physics object that damages enemies on contact.

### Implementation

**File:** `/workspace/src/demo/barrel-throw-demo.cpp`

```cpp
struct PhysicsBarrel {
    uint32_t id;
    Vector3 position;
    Vector3 velocity;
    float mass = 20.0f;
    float radius = 0.5f;
    bool is_held = false;
    uint32_t held_by = 0;
};

std::vector<PhysicsBarrel> barrels;
uint32_t next_barrel_id = 1;

uint32_t spawn_barrel(float x, float y, float z) {
    PhysicsBarrel barrel;
    barrel.id = next_barrel_id++;
    barrel.position = Vector3(x, y, z);
    barrel.velocity = Vector3(0, 0, 0);
    barrels.push_back(barrel);
    return barrel.id;
}

void update_barrels(float dt) {
    for (auto& barrel : barrels) {
        if (barrel.is_held) {
            // Follow holder
            // (Get player position and offset)
            Vector3 player_pos = g_coordinator.get_player_manager().get_position();
            barrel.position = player_pos + Vector3(1.0f, 0.5f, 0);
            barrel.velocity = Vector3(0, 0, 0);
        } else {
            // Physics simulation
            const float GRAVITY = -9.81f;
            barrel.velocity.y += GRAVITY * dt;
            barrel.position += barrel.velocity * dt;
            
            // Ground collision
            if (barrel.position.y - barrel.radius < 0.0f) {
                barrel.position.y = barrel.radius;
                barrel.velocity.y = -barrel.velocity.y * 0.3f; // Low bounce
                barrel.velocity *= 0.8f; // Friction
            }
            
            // Check enemy collisions
            float speed = barrel.velocity.length();
            if (speed > 3.0f) {
                check_barrel_enemy_collision(barrel, speed);
            }
        }
    }
}

void check_barrel_enemy_collision(const PhysicsBarrel& barrel, float speed) {
    // Get all enemies
    auto enemies = get_all_enemies();
    
    for (auto& enemy : enemies) {
        float distance = (enemy.position - barrel.position).length();
        if (distance < barrel.radius + enemy.radius) {
            // Hit!
            float damage = speed * barrel.mass * 0.5f; // Momentum-based damage
            enemy.take_damage(damage);
            
            // Knockback enemy
            Vector3 knockback_dir = (enemy.position - barrel.position).normalized();
            enemy.apply_knockback(knockback_dir * speed * barrel.mass * 0.1f);
            
            // Slow barrel
            barrel.velocity *= 0.3f;
        }
    }
}

// WASM Exports
extern "C" {
    __attribute__((export_name("demo_spawn_barrel")))
    uint32_t demo_spawn_barrel(float x, float y, float z) {
        return spawn_barrel(x, y, z);
    }
    
    __attribute__((export_name("demo_try_grab_barrel")))
    int demo_try_grab_barrel() {
        Vector3 player_pos = g_coordinator.get_player_manager().get_position();
        
        for (auto& barrel : barrels) {
            if (barrel.is_held) continue;
            
            float distance = (barrel.position - player_pos).length();
            if (distance < 2.0f) {
                barrel.is_held = true;
                barrel.held_by = 0; // Player ID
                return barrel.id;
            }
        }
        return 0; // No barrel grabbed
    }
    
    __attribute__((export_name("demo_throw_barrel")))
    void demo_throw_barrel(uint32_t barrel_id, float dir_x, float dir_y, float force) {
        for (auto& barrel : barrels) {
            if (barrel.id == barrel_id && barrel.is_held) {
                barrel.is_held = false;
                barrel.velocity = Vector3(dir_x, dir_y, 0) * force;
                return;
            }
        }
    }
    
    __attribute__((export_name("demo_update_barrels")))
    void demo_update_barrels(float dt) {
        update_barrels(dt);
    }
    
    __attribute__((export_name("demo_get_barrel_count")))
    int demo_get_barrel_count() {
        return barrels.size();
    }
    
    __attribute__((export_name("demo_get_barrel_x")))
    float demo_get_barrel_x(int index) {
        return barrels[index].position.x;
    }
    
    __attribute__((export_name("demo_get_barrel_y")))
    float demo_get_barrel_y(int index) {
        return barrels[index].position.y;
    }
}
```

**JavaScript Integration:**

```javascript
// Input handling
let heldBarrel = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === 'e') {
        // Try to grab
        if (heldBarrel === 0) {
            heldBarrel = wasmExports.demo_try_grab_barrel();
            if (heldBarrel > 0) {
                showMessage("Grabbed barrel!");
            }
        } else {
            // Throw
            const throwDirection = getPlayerFacingDirection();
            wasmExports.demo_throw_barrel(
                heldBarrel,
                throwDirection.x,
                throwDirection.y,
                20.0 // Throw force
            );
            showMessage("Thrown!");
            heldBarrel = 0;
        }
    }
});

// Update loop
function update(dt) {
    wasmExports.demo_update_barrels(dt);
    
    // Render barrels
    const barrelCount = wasmExports.demo_get_barrel_count();
    for (let i = 0; i < barrelCount; i++) {
        const x = wasmExports.demo_get_barrel_x(i);
        const y = wasmExports.demo_get_barrel_y(i);
        renderBarrel(x, y);
    }
}
```

### Deliverable
- Spawn barrels in game world
- Press 'E' to pick up nearby barrel
- Press 'E' again to throw
- Barrel damages enemies on high-speed contact
- Demonstrates: grab/throw, projectile physics, momentum damage

### Demo Script
> "The player can pick up and throw barrels. When thrown, the barrel becomes a projectile. If it hits an enemy at high speed, damage is calculated from the barrel's momentum - mass times velocity. Heavier objects moving faster deal more damage. This creates emergent tactics: throw heavy objects at groups of enemies."

---

## Quick Win #4: Ice Surface Friction

### Goal
Different surface materials affect movement physics.

### Implementation

**File:** `/workspace/src/demo/surface-friction-demo.cpp`

```cpp
enum SurfaceType {
    NORMAL,
    ICE,
    MUD
};

struct SurfaceMaterial {
    SurfaceType type;
    float friction;
    float drag;
};

const SurfaceMaterial MATERIALS[] = {
    { NORMAL, 0.8f, 0.1f },
    { ICE,    0.1f, 0.02f },  // Very slippery, low drag
    { MUD,    1.5f, 0.3f }    // High friction, high drag
};

SurfaceType current_surface = NORMAL;

void update_player_with_surface(PlayerManager& player, float dt) {
    const SurfaceMaterial& mat = MATERIALS[current_surface];
    
    // Apply surface-specific physics
    if (player.is_grounded()) {
        // Apply friction
        player.vel_x_ *= (1.0f - mat.friction * dt);
        
        // Apply drag
        float speed = sqrt(player.vel_x_ * player.vel_x_ + player.vel_y_ * player.vel_y_);
        if (speed > 0) {
            float drag_force = mat.drag * speed * speed;
            player.vel_x_ -= (player.vel_x_ / speed) * drag_force * dt;
        }
        
        // Movement acceleration affected by surface
        if (player.is_moving()) {
            float accel_multiplier = 1.0f / mat.friction;
            player.apply_movement_force(player.input_x_ * accel_multiplier);
        }
    }
}

// WASM Exports
extern "C" {
    __attribute__((export_name("demo_set_surface")))
    void demo_set_surface(int surface_type) {
        current_surface = (SurfaceType)surface_type;
    }
    
    __attribute__((export_name("demo_get_surface_friction")))
    float demo_get_surface_friction() {
        return MATERIALS[current_surface].friction;
    }
}
```

**JavaScript Visualization:**

```javascript
// Draw different surface zones
function renderSurfaces() {
    // Normal ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 300, 200, 100);
    
    // Ice
    ctx.fillStyle = '#ADD8E6';
    ctx.fillRect(200, 300, 200, 100);
    
    // Mud
    ctx.fillStyle = '#654321';
    ctx.fillRect(400, 300, 200, 100);
}

// Detect surface under player
function updatePlayerSurface() {
    if (player.x < 200) {
        wasmExports.demo_set_surface(0); // NORMAL
    } else if (player.x < 400) {
        wasmExports.demo_set_surface(1); // ICE
        showMessage("Slippery!");
    } else {
        wasmExports.demo_set_surface(2); // MUD
        showMessage("Slow!");
    }
}
```

### Deliverable
- Three visible surface zones
- Player slides on ice, slows in mud
- Movement acceleration affected by surface
- Demonstrates: material properties, friction, emergent traversal

### Demo Script
> "Different surfaces have different friction values. On ice, the player slides more and has less control. In mud, movement is sluggish. This creates tactical choices: do you take the fast icy path with less control, or the slow muddy path where you can position precisely?"

---

## Quick Win #5: Wind Knockback Zone

### Goal
Environmental hazard that applies constant force.

### Implementation

**File:** `/workspace/src/demo/wind-zone-demo.cpp`

```cpp
struct WindZone {
    Vector3 center;
    float radius;
    Vector3 wind_direction;
    float wind_strength;
};

std::vector<WindZone> wind_zones;

void add_wind_zone(float x, float y, float radius, float dir_x, float dir_y, float strength) {
    WindZone zone;
    zone.center = Vector3(x, y, 0);
    zone.radius = radius;
    zone.wind_direction = Vector3(dir_x, dir_y, 0).normalized();
    zone.wind_strength = strength;
    wind_zones.push_back(zone);
}

void update_wind_effects(float dt) {
    Vector3 player_pos = g_coordinator.get_player_manager().get_position();
    
    for (const auto& zone : wind_zones) {
        float distance = (player_pos - zone.center).length();
        
        if (distance < zone.radius) {
            // Apply wind force (stronger closer to center)
            float falloff = 1.0f - (distance / zone.radius);
            Vector3 force = zone.wind_direction * zone.wind_strength * falloff;
            
            // Apply to player
            g_coordinator.get_player_manager().apply_force(force.x, force.y);
            
            // Visual feedback
            if (falloff > 0.5f) {
                // Strong wind
                trigger_wind_particles();
            }
        }
    }
}

// WASM Exports
extern "C" {
    __attribute__((export_name("demo_add_wind_zone")))
    void demo_add_wind_zone(float x, float y, float radius, 
                            float dir_x, float dir_y, float strength) {
        add_wind_zone(x, y, radius, dir_x, dir_y, strength);
    }
    
    __attribute__((export_name("demo_update_wind")))
    void demo_update_wind(float dt) {
        update_wind_effects(dt);
    }
    
    __attribute__((export_name("demo_get_wind_zone_count")))
    int demo_get_wind_zone_count() {
        return wind_zones.size();
    }
}
```

**JavaScript Visualization:**

```javascript
// Create wind zones
wasmExports.demo_add_wind_zone(
    300, 200,  // Center
    100,       // Radius
    1, 0,      // Direction (right)
    50.0       // Strength
);

// Render wind zones
function renderWindZones() {
    const count = wasmExports.demo_get_wind_zone_count();
    
    // Draw wind visualization (particles, arrows)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < count; i++) {
        // Draw arrows showing wind direction
        for (let j = 0; j < 10; j++) {
            drawWindArrow(zoneCenter, windDirection);
        }
    }
}

// Update
function update(dt) {
    wasmExports.demo_update_wind(dt);
    // Player is pushed by wind automatically
}
```

### Deliverable
- Visible wind zone on map
- Player pushed by wind force
- Force scales with distance (falloff)
- Demonstrates: environmental forces, hazard volumes, emergent tactics

### Demo Script
> "This is a wind zone. When the player enters it, they're constantly pushed by the wind. The force is stronger near the center. Players have to fight against it to move opposite the wind. You can use wind to knock enemies off ledges, or it can push projectiles off-course."

---

## Implementation Overview (no time commitments)

Recommended order:
1. **Bouncing Ball** — foundational physics demo
2. **Ice Surface** — material properties and traversal
3. **Player Knockback** — combat impulses
4. **Wind Zone** — environmental forces
5. **Barrel Throw** — direct interaction + momentum damage

---

## Presentation Order

For demos, show in this order:

1. **Bouncing Ball** (30 seconds)
   - "Here's the physics engine working at 60fps"

2. **Ice Surface** (1 minute)
   - "Materials affect movement - emergent traversal tactics"

3. **Player Knockback** (1 minute)
   - "Combat feels weighty and physics-driven"

4. **Wind Zone** (1 minute)
   - "Environmental hazards create tactical challenges"

5. **Barrel Throw** (2 minutes)
   - "Direct interaction with physics objects creates emergent combat"

**Goal:** concise sequence showing 5 different physics features

---

## Success Metrics

Each quick win should demonstrate:
- ✅ **Physics-driven** - Not scripted animations
- ✅ **Emergent** - Interaction of simple rules creates complex scenarios
- ✅ **Performant** - Runs at 60fps
- ✅ **Visible** - Clear visual feedback
- ✅ **Interactive** - Player can experiment

---

## After Quick Wins

Once these 5 demos are working, you have:
- Proven physics engine works
- Demonstrated emergent gameplay
- Validated performance targets
- Created momentum for full implementation

**Next step:** Proceed with full Phase 1 implementation (PhysicsManager, etc.)

---

*These quick wins require ~40 hours but provide immediate, demonstrable value and proof that physics-first design achieves emergent gameplay goals.*
