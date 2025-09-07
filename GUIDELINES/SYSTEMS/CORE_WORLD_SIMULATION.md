# 🌍 Core World Simulation Engine Rules

## 📋 Table of Contents
- [Overview](#overview)
- [Physics Backbone](#physics-backbone)
- [Force Propagation System](#force-propagation-system)
- [Constraint Logic](#constraint-logic)
- [Chemistry State Machine](#chemistry-state-machine)
- [Weather and Climate](#weather-and-climate)
- [Terrain and Fluids](#terrain-and-fluids)
- [Time and World Reset](#time-and-world-reset)
- [Layered World Topology](#layered-world-topology)
- [Status and Hazards](#status-and-hazards)
- [AI, Ecology, and Perception](#ai-ecology-and-perception)
- [Fire, Heat, and Cooking Reactions](#fire-heat-and-cooking-reactions)
- [Sound and Surfaces](#sound-and-surfaces)
- [Design Principles](#design-principles)
- [WASM Implementation Guidelines](#wasm-implementation-guidelines)

## Overview

This document defines the core world simulation engine rules for our WASM-first game architecture. All simulation logic **MUST** be implemented in WebAssembly (C++) to ensure deterministic execution across all clients. JavaScript handles only rendering, input capture, and networking.

### 🏗️ Architecture Alignment
- **WASM-First**: All physics, chemistry, and world state calculations in WebAssembly
- **Deterministic**: Identical inputs produce identical outputs across all clients
- **Performance Optimized**: Native-speed simulations with minimal JS overhead
- **JavaScript as Visualizer**: JS only renders the results of WASM calculations

## 🔎 Quick Rules Overview (BOTW-inspired)

### Core simulation

- **Physics backbone.** Rigid bodies, forces, constraints, and buoyancy drive almost everything (logs float, metal sinks). BOTW shipped on Havok; Nintendo layered their own rules on top. [Zelda Universe](https://zeldauniverse.net/features/ocarinas-image-freedom-in-breath-of-the-wild/?utm_source=chatgpt.com) · [Wikipedia](https://en.wikipedia.org/wiki/The_Legend_of_Zelda%3A_Breath_of_the_Wild?utm_source=chatgpt.com)
- **“Chemistry” layer.** Rule system that changes states of elements and materials: fire spreads, wind pushes, water conducts cold/heat, electricity chains through metal. Think state calculator paired with physics.

### Environment & world state

- **Weather & climate.** Wind direction, rain, storms, heat/cold.
- **Terrain & fluids.** Slopes, friction, updrafts, rivers, waterfalls, lava. Logs become bridges; rafts move with current or fan thrust. Cryonis-like powers can spawn climbable ice pillars from water.
- **Time & resets.** Day/night affects NPCs and enemies.

### Player verbs that touch the sim

- Move, push, pull, lift, throw
- Ignite, douse, fan wind, sail/raft
- Freeze/melt, electrify/chain, wet/dry
- Cut trees, build/attach (constraints), break joints

### Materials, status, and damage

- **Material properties.** Wood burns and floats; metal conducts electricity and attracts lightning; stone blocks fire.
- **Elemental reactions.** Burn (creates updrafts, clears thorns), Freeze (immobilize, shatter bonus), Shock (AoE arc, disarm), Wet (boosts shock, douses fire), Wind (fans flames, pushes smoke and boats).

### AI, sound, and stealth

- **Enemy & wildlife behaviors.** Enemies pick up dropped weapons, investigate noise, use cover, and react to environmental hazards (fire, bombs, rolling boulders). Sound meter and clothing affect detection.

### Design philosophy that makes it all click

- **Systemic first, content second.** Favor simple, predictable rules that stack for multiplicative gameplay.

## ✅ Reference Checklist

### Architecture and Determinism

- [ ] All gameplay/simulation logic in WASM; JS limited to rendering/input/networking
- [ ] No `Math.random()` or time-based logic in JS affecting gameplay
- [ ] Deterministic ordering of updates (fixed tick, stable iteration order, seeded RNG)
- [ ] Flat, minimal exports (primitives/IDs/bitflags); no strings/objects across boundary
- [ ] Performance budget respected (≤ 16ms/frame total; WASM updates ≤ target)

### Physics Backbone

- [ ] Rigid bodies update with stable integrator; gravity applied consistently
- [ ] Collision shapes selected per object (sphere/plane/convex/terrain)
- [ ] Friction, restitution, and drag use material-driven parameters
- [ ] Buoyancy computed by displaced volume/density; floating partly submerges
- [ ] Momentum transfer and rolling behavior on slopes validated
- [ ] Center of mass recalculated for break/attach events; stability checks in place

### Constraints and Structures

- [ ] Correct joint types used (hinge/ball/slider/fixed/contact) with force limits
- [ ] Break thresholds and progressive collapse logic covered by tests
- [ ] Attach/detach (player build) operations preserve determinism and COM

### Chemistry and Materials

- [ ] Material tags set (WOOD/METAL/STONE/PLANT/CLOTH/LIQUID/ORGANIC)
- [ ] Fire ↔ Water interactions (extinguish/steam) implemented deterministically
- [ ] Wet + Cold ⇒ Ice; Ice melts with heat; Wind fans flames
- [ ] Electricity chains through metal/water; wet targets amplify shock
- [ ] Fuel/oxygen systems drive burn duration and heat output

### Environment and World State

- [ ] Weather state updates friction, fire spread, and visibility as designed
- [ ] Wind field applies force proportional to area and velocity²
- [ ] Terrain materials affect friction, footsteps, and movement speed
- [ ] Fluids flow downhill; currents move floating bodies and rafts
- [ ] Hazard volumes (lava/quicksand/bog/acid/gas) apply DOT/forces consistently

### Time and Resets

- [ ] Day/night cycle affects AI, visibility, and temperature zones
- [ ] World reset events (e.g., blood moon) safely respawn/despawn deterministically
- [ ] Persistence windows clean up transient objects with player-created exceptions

### Layered World Topology

- [ ] World layers aligned (sky/surface/depths) with consistent coordinates
- [ ] Cross-layer falls and openings validated; gravity wells defined where needed

### Player Verbs Integration

- [ ] Move/push/pull/lift/throw routed through WASM with consistent forces
- [ ] Ignite/douse/fan/freeze/melt/electrify actions modify chemistry state
- [ ] Cut trees; logs float; rafts can be propelled by wind/fans/currents
- [ ] Attach/detach constraints deterministic; breakage respects thresholds

### Status, Damage, and Reactions

- [ ] Burning applies DOT, spreads to nearby flammables, creates updrafts
- [ ] Freezing immobilizes; shatter bonus on heavy impact
- [ ] Shock applies AoE arcs; disarms; amplified when wet/metallic
- [ ] Wet status boosts shock; douses fire; interacts with cold/heat

### AI, Sound, and Stealth

- [ ] Senses use light-aware vision, hearing with surface/volume modifiers
- [ ] Behaviors react to environment (fire/boulders/traps/weather)
- [ ] Enemies pick up weapons, use cover, and investigate noise
- [ ] Footstep acoustics vary by material; rain masks sound appropriately

### Exports and JS Integration

- [ ] Batch reads of WASM state per frame; minimal call count
- [ ] Accessors provided for physics/chemistry/weather/time queries as primitives
- [ ] No JS-side state mutation of gameplay; UI is read-only observer

### Testing and Validation

- [ ] Determinism test: same seed + inputs ⇒ identical checksums
- [ ] Golden replay covers weather, fluids, chemistry, AI reactions, constraints
- [ ] Performance test: frame and subsystem times within budget; no GC churn
- [ ] Network sync test: lockstep stays in sync under load
- [ ] Edge cases: lightning hits metal, logs bridge gaps, currents carry rafts

## Physics Backbone

### 🔧 Core Systems (WASM Implementation)

#### Rigid Body Dynamics
```cpp
struct RigidBody {
    Vector3 position;
    Vector3 velocity;
    Vector3 acceleration;
    float mass;
    float drag;
    Matrix3 inertia_tensor;
    Vector3 angular_velocity;
    
    void update(float dt) {
        // Verlet integration for stability
        velocity += acceleration * dt;
        position += velocity * dt;
        apply_drag(dt);
    }
};
```

#### Gravity System
- **Universal Force**: Constant downward acceleration (-9.81 m/s²)
- **Buoyancy Override**: Objects in water experience reduced effective gravity
- **Density-Based**: Heavy objects sink faster, light objects float

#### Collision Detection
```cpp
enum CollisionType {
    SPHERE_SPHERE,
    SPHERE_PLANE,
    CONVEX_HULL,
    TERRAIN_MESH
};

struct CollisionPair {
    uint32_t body_a;
    uint32_t body_b;
    Vector3 contact_point;
    Vector3 normal;
    float penetration;
};
```

#### Center of Mass Calculations
- **Dynamic COM**: Recalculated when objects break or combine
- **Stability Check**: Objects tip over when COM moves outside base
- **Load Distribution**: Weight affects structural integrity

#### Friction Models
```cpp
struct SurfaceMaterial {
    float static_friction;    // 0.0 (ice) to 1.5 (rubber)
    float kinetic_friction;   // Always < static_friction
    float restitution;        // Bounciness factor
    float roughness;          // Surface texture
};
```

### 🌊 Buoyancy System
- **Archimedes Principle**: Displaced water volume determines buoyant force
- **Material Density**: Wood (0.6), Ice (0.9), Stone (2.5), Metal (7.8)
- **Dynamic Floating**: Objects can partially submerge based on density ratio
- **Current Interaction**: Floating objects pushed by water flow

**Example**: A felled tree (density 0.6) floats with 60% submerged, can be pushed by river current.

## Force Propagation System

### ⚡ Impulse Chains
```cpp
class ForceNode {
    Vector3 accumulated_force;
    std::vector<uint32_t> connected_bodies;
    float transmission_efficiency;
    
public:
    void propagate_impulse(Vector3 impulse, float dt) {
        for (auto body_id : connected_bodies) {
            RigidBody& body = get_body(body_id);
            Vector3 transmitted = impulse * transmission_efficiency;
            body.apply_impulse(transmitted);
        }
    }
};
```

### 💥 Explosion Mechanics
- **Radial Force**: Strength decreases with distance (inverse square law)
- **Line of Sight**: Obstacles block or reduce blast effects
- **Material Response**: Different materials react differently to explosions
- **Chain Reactions**: Explosions can trigger other explosions

### 🪨 Momentum Conservation
- **Rolling Dynamics**: Objects gain speed on slopes based on angle and friction
- **Impact Transfer**: Collisions transfer momentum based on mass ratios
- **Energy Loss**: Some energy lost to heat, sound, and deformation

## Constraint Logic

### 🔗 Joint Systems
```cpp
enum ConstraintType {
    HINGE_JOINT,      // Door hinges, wheels
    BALL_JOINT,       // Shoulder joints, chains
    SLIDER_JOINT,     // Pistons, drawers
    FIXED_JOINT,      // Welds, glue
    CONTACT_PAIR      // Temporary surface contact
};

struct Constraint {
    uint32_t body_a, body_b;
    Vector3 anchor_a, anchor_b;
    float max_force;
    float break_threshold;
    bool is_broken;
};
```

### 🏗️ Structural Stability
- **Load Paths**: Forces flow through connected structures
- **Failure Points**: Weakest links break first under excessive load
- **Progressive Collapse**: Failures can cascade through structures
- **Repair Mechanics**: Some joints can be reinforced or repaired

**Examples**:
- Cart wheels connected by axles, can break if overloaded
- Stone stacks held by friction, topple if pushed too hard
- Rope bridges with tension limits

## Chemistry State Machine

### 🔥 Element States
```cpp
enum ElementState {
    NEUTRAL = 0,
    FIRE    = 1 << 0,  // Spreads, consumes fuel, produces heat
    WATER   = 1 << 1,  // Extinguishes fire, conducts electricity
    ICE     = 1 << 2,  // Slippery, melts to water
    ELECTRIC = 1 << 3, // Arcs through conductors, stuns
    WIND    = 1 << 4   // Fans flames, moves particles
};

struct ChemicalNode {
    uint32_t states;           // Bit flags for active states
    float intensity[5];        // Strength of each state
    float fuel_remaining;      // For fire propagation
    uint32_t material_tags;    // What this node is made of
};
```

### 🏷️ Material Tags
```cpp
enum MaterialTag {
    WOOD     = 1 << 0,  // Burns, floats
    METAL    = 1 << 1,  // Conducts electricity, attracts lightning
    STONE    = 1 << 2,  // Fire resistant, heavy
    PLANT    = 1 << 3,  // Burns quickly, withers in heat
    CLOTH    = 1 << 4,  // Burns fast, absorbs water
    LIQUID   = 1 << 5,  // Flows, conducts
    ORGANIC  = 1 << 6   // Rots, burns, feeds fire
};
```

### ⚡ State Transitions
```cpp
void update_chemistry(ChemicalNode& node, float dt) {
    // Fire + Water = Steam (extinguish)
    if ((node.states & FIRE) && (node.states & WATER)) {
        node.intensity[FIRE] -= node.intensity[WATER] * dt * 2.0f;
        node.states &= ~WATER; // Water consumed
    }
    
    // Wet + Cold = Ice
    if ((node.states & WATER) && temperature < 0.0f) {
        node.states |= ICE;
        node.states &= ~WATER;
    }
    
    // Electric + Water = Enhanced conduction
    if ((node.states & ELECTRIC) && (node.states & WATER)) {
        node.intensity[ELECTRIC] *= 1.5f; // Boosted damage
    }
}
```

## Weather and Climate

### 🌧️ Weather Systems
```cpp
struct WeatherState {
    float rain_intensity;        // 0.0 to 1.0
    float wind_speed;           // m/s
    Vector2 wind_direction;     // Normalized vector
    float temperature;          // Celsius
    float humidity;            // 0.0 to 1.0
    bool lightning_active;     // Storm conditions
};

void update_weather_effects(WeatherState& weather, float dt) {
    // Rain reduces surface friction
    if (weather.rain_intensity > 0.1f) {
        apply_surface_modifier(FRICTION_REDUCTION, weather.rain_intensity * 0.5f);
        extinguish_small_fires(weather.rain_intensity);
    }
    
    // Lightning targets tall/conductive objects
    if (weather.lightning_active) {
        auto targets = find_lightning_targets();
        if (!targets.empty()) {
            strike_lightning(select_target(targets));
        }
    }
}
```

### 🌪️ Wind Field Simulation
- **Vector Field**: Each world cell has wind velocity
- **Object Interaction**: Wind force = area × velocity² × drag coefficient
- **Propagation**: Wind flows around obstacles, creates eddies
- **Fire Enhancement**: Wind spreads flames faster in wind direction

### 🌡️ Temperature Zones
```cpp
enum ClimateZone {
    DESERT,     // High heat, low humidity
    MOUNTAIN,   // Cold, thin air
    CAVE,       // Constant cool temperature
    SHADE,      // Reduced temperature
    WATER       // Temperature buffering
};

float get_ambient_temperature(Vector3 position, float time_of_day) {
    ClimateZone zone = determine_climate_zone(position);
    float base_temp = zone_base_temperature[zone];
    float daily_variation = sin(time_of_day * 2 * PI) * zone_temp_range[zone];
    return base_temp + daily_variation;
}
```

## Terrain and Fluids

### 🏔️ Surface Properties
```cpp
struct TerrainCell {
    SurfaceMaterial material;
    float elevation;
    float moisture;
    float temperature;
    uint32_t vegetation_density;
    FluidVolume* fluid;        // Null if no fluid present
};
```

### 🌊 Fluid Dynamics
```cpp
struct FluidVolume {
    float density;             // kg/m³
    Vector3 velocity;         // Current flow direction
    float viscosity;          // Resistance to flow
    float temperature;        // Affects state changes
    
    void update_flow(float dt) {
        // Simple fluid simulation using cellular automata
        distribute_to_neighbors(dt);
        apply_gravity_flow(dt);
        calculate_pressure_gradients(dt);
    }
};
```

#### Water Current System
- **Flow Simulation**: Water flows downhill, creates currents
- **Obstacle Interaction**: Water flows around rocks, creates eddies
- **Object Transport**: Floating objects carried by current
- **Erosion**: Fast water can move small objects

#### Hazard Volumes
```cpp
enum HazardType {
    LAVA,           // High damage, ignites objects
    QUICKSAND,      // Gradual sinking, escape difficulty
    BOG,            // Slow movement, stamina drain
    ACID,           // Damage over time, dissolves materials
    POISON_GAS      // Area denial, breathing hazard
};

struct HazardVolume {
    HazardType type;
    float intensity;
    float sink_rate;           // For quicksand/bog
    float damage_per_second;
    float escape_difficulty;   // Force needed to escape
};
```

## Time and World Reset

### 🕐 Day-Night Cycle
```cpp
struct TimeSystem {
    float current_time;        // 0.0 to 24.0 hours
    float day_length;          // Real seconds per game day
    uint32_t day_count;        // Days since start
    bool is_blood_moon;        // Special event flag
    
    float get_light_level() {
        // Sinusoidal light curve
        float normalized_time = current_time / 24.0f;
        return max(0.1f, sin(normalized_time * 2 * PI));
    }
};
```

### 🌙 Blood Moon System
- **Periodic Event**: Every 7-10 game days (randomized)
- **World Refresh**: Enemies respawn, loot tables reset
- **Visual Effects**: Red lighting, increased danger
- **Mechanical Changes**: Enhanced enemy stats, rare drops

### 🧹 Persistence Windows
```cpp
struct PersistentObject {
    uint32_t object_id;
    float creation_time;
    float lifetime;            // Seconds before cleanup
    bool is_player_created;    // Player items last longer
    
    bool should_cleanup(float current_time) {
        float age = current_time - creation_time;
        float effective_lifetime = is_player_created ? lifetime * 2.0f : lifetime;
        return age > effective_lifetime;
    }
};
```

## Layered World Topology

### 🏗️ Multi-Layer Architecture
```cpp
enum WorldLayer {
    SKY_LAYER = 2,      // Floating islands, sky structures
    SURFACE_LAYER = 1,   // Main world surface
    DEPTHS_LAYER = 0     // Underground caves, depths
};

struct LayeredPosition {
    Vector3 coordinates;     // X, Y, Z within layer
    WorldLayer layer;
    
    // Objects can fall between layers
    bool can_fall_to_layer(WorldLayer target) {
        return (layer > target) && has_opening_below(coordinates);
    }
};
```

### 🌐 Cross-Layer Interactions
- **Gravity Wells**: Objects fall through layer boundaries at specific points
- **Coordinate Alignment**: Same X,Y coordinates across all layers
- **Geological Continuity**: Cave ceilings correspond to surface terrain
- **Light Penetration**: Surface light affects upper cave areas

## Status and Hazards

### 🌡️ Environmental Effects
```cpp
struct StatusEffect {
    uint32_t effect_id;
    float intensity;           // 0.0 to 1.0
    float duration;           // Seconds remaining
    float tick_rate;          // Damage/effect per second
    
    void apply_effect(GameObject& target, float dt) {
        switch(effect_id) {
            case BURNING:
                target.take_damage(intensity * tick_rate * dt);
                spread_to_nearby_flammables();
                break;
            case FREEZING:
                target.reduce_movement_speed(intensity * 0.5f);
                break;
            case SHOCKED:
                target.stun_duration += intensity * dt;
                break;
        }
    }
};
```

### 🌫️ Gloom System (Inspired by TOTK)
```cpp
struct GloomField {
    Vector3 center;
    float radius;
    float intensity;
    
    void apply_gloom_effect(Player& player) {
        float distance = length(player.position - center);
        if (distance < radius) {
            float effect_strength = 1.0f - (distance / radius);
            player.max_health_penalty += effect_strength * intensity;
            player.regeneration_rate *= (1.0f - effect_strength * 0.8f);
        }
    }
};
```

### ⚡ Conductive Interactions
- **Wet + Electric**: Increased damage and spread distance
- **Metal + Lightning**: Attracts strikes, conducts to nearby objects
- **Water Bodies**: Electricity spreads through connected water

## AI, Ecology, and Perception

### 👁️ Sensory Systems
```cpp
struct AISenses {
    float sight_range;
    float sight_angle;         // Field of view in radians
    float hearing_range;
    float light_sensitivity;   // How darkness affects sight
    
    bool can_see_target(Vector3 target_pos, float light_level) {
        float distance = length(target_pos - ai_position);
        float effective_range = sight_range * light_level;
        
        if (distance > effective_range) return false;
        if (!in_field_of_view(target_pos)) return false;
        if (line_of_sight_blocked(target_pos)) return false;
        
        return true;
    }
};
```

### 🧠 Behavioral Intelligence
```cpp
enum AIBehavior {
    PATROL,
    INVESTIGATE,
    HUNT,
    FLEE,
    USE_TOOL,
    SEEK_SHELTER,
    REGROUP
};

struct AIDecisionTree {
    float aggression;
    float intelligence;
    float tool_use_ability;
    
    AIBehavior decide_behavior(GameState& state) {
        if (state.weather.rain_intensity > 0.8f) return SEEK_SHELTER;
        if (nearby_weapon() && intelligence > 0.7f) return USE_TOOL;
        if (health_low() && can_flee()) return FLEE;
        if (target_visible()) return HUNT;
        return PATROL;
    }
};
```

### 🛠️ Tool Use and Improvisation
- **Weapon Pickup**: AI entities can grab nearby weapons
- **Environmental Hazards**: Push boulders, trigger traps
- **Fire Avoidance**: Retreat from spreading flames
- **Water Usage**: Seek water to extinguish fire status

## Fire, Heat, and Cooking Reactions

### 🔥 Heat Source System
```cpp
struct HeatSource {
    Vector3 position;
    float temperature;         // Celsius
    float heat_radius;        // Effective range
    float fuel_consumption;   // Per second
    bool requires_oxygen;
    
    void update_heat_effects(float dt) {
        auto nearby_objects = find_objects_in_radius(position, heat_radius);
        for (auto& obj : nearby_objects) {
            float distance = length(obj.position - position);
            float heat_transfer = calculate_heat_transfer(distance, dt);
            obj.temperature += heat_transfer;
            
            // State changes based on temperature
            if (obj.temperature > obj.ignition_point) {
                obj.set_on_fire();
            }
        }
    }
};
```

### 🍳 Cooking Mechanics
- **Temperature Thresholds**: Raw (0°C), Cooked (60°C), Burnt (120°C)
- **Time Requirements**: Different foods need different cooking times
- **Heat Distribution**: Objects cook from outside in
- **Fuel Consumption**: Fires need continuous fuel to maintain heat

### 🌿 Fuel and Oxygen Systems
```cpp
struct CombustibleMaterial {
    float fuel_value;          // How long it burns
    float ignition_temp;       // Temperature needed to ignite
    float burn_rate;          // Fuel consumed per second
    float heat_output;        // Heat produced while burning
    bool requires_air;        // Can be smothered
};
```

## Sound and Surfaces

### 🔊 Acoustic System
```cpp
struct SoundEvent {
    Vector3 origin;
    float volume;             // dB level
    float frequency;          // Hz, affects how far it travels
    SurfaceMaterial surface;  // What generated the sound
    
    float calculate_audible_range() {
        float base_range = volume * 0.1f; // 1 dB = 0.1 meters
        
        // Surface material affects sound
        switch(surface.type) {
            case METAL: return base_range * 1.5f;  // Louder
            case SAND:  return base_range * 0.7f;  // Muffled
            case WATER: return base_range * 1.2f;  // Carries well
            default:    return base_range;
        }
    }
};
```

### 🦶 Footstep Acoustics
- **Material-Based**: Different surfaces produce different sounds
- **Volume Scaling**: Heavier objects make louder sounds
- **Weather Effects**: Rain masks footsteps
- **AI Detection**: Enemies investigate loud sounds

### 💥 Impact Sound Generation
- **Collision Energy**: Harder impacts = louder sounds
- **Material Combination**: Metal on stone vs. wood on grass
- **Distance Falloff**: Sound decreases with distance
- **Obstacle Blocking**: Walls reduce sound transmission

## Design Principles

### 🎯 Core Philosophy

#### Simple Rules, Broad Coverage
```cpp
// Example: Single fire spread rule covers many scenarios
bool can_fire_spread(ChemicalNode& from, ChemicalNode& to) {
    if (!(from.states & FIRE)) return false;
    if (to.fuel_remaining <= 0) return false;
    if (to.states & WATER) return false;
    
    float distance = length(to.position - from.position);
    return distance < from.intensity[FIRE] * FIRE_SPREAD_RADIUS;
}
```

#### Determinism Under Load
- **Fixed-Point Math**: Use integers for critical calculations
- **Consistent Ordering**: Process objects in deterministic order
- **Bounded Iteration**: Limit simulation steps to prevent lag
- **Reproducible RNG**: Same seed = same results

#### Multiplicative Systems
```cpp
// Weather + Terrain + Chemistry = Emergent Gameplay
float calculate_movement_speed(TerrainCell& terrain, WeatherState& weather) {
    float base_speed = 1.0f;
    
    // Terrain effects
    base_speed *= terrain.material.friction;
    
    // Weather effects
    if (weather.rain_intensity > 0.1f) {
        base_speed *= (1.0f - weather.rain_intensity * 0.3f);
    }
    
    // Chemistry effects
    if (terrain.has_ice()) {
        base_speed *= 0.3f; // Very slippery
    }
    
    return base_speed;
}
```

## WASM Implementation Guidelines

### 🏗️ Architecture Requirements

#### Memory Layout
```cpp
// All simulation data in linear WASM memory
struct WorldSimulation {
    RigidBody bodies[MAX_BODIES];
    ChemicalNode chemistry[WORLD_WIDTH][WORLD_HEIGHT];
    FluidVolume fluids[MAX_FLUID_VOLUMES];
    WeatherState weather;
    TimeSystem time;
    
    // Export functions for JavaScript
    extern "C" {
        void update_simulation(float dt);
        float get_object_temperature(uint32_t object_id);
        uint32_t get_chemistry_state(int x, int y);
        // ... more exports
    }
};
```

#### Export Strategy
```cpp
// Minimal, flat data exports to JavaScript
extern "C" {
    // Physics queries
    float get_body_x(uint32_t id);
    float get_body_y(uint32_t id);
    float get_body_rotation(uint32_t id);
    
    // Chemistry state
    uint32_t get_cell_states(int x, int y);
    float get_cell_temperature(int x, int y);
    
    // Weather data
    float get_rain_intensity();
    float get_wind_speed();
    float get_wind_direction_x();
    float get_wind_direction_y();
    
    // Simulation control
    void update_world(float dt);
    void set_weather_override(uint32_t weather_flags);
}
```

### ⚡ Performance Optimizations

#### Spatial Partitioning
```cpp
// Grid-based spatial hash for efficient collision detection
class SpatialGrid {
    static constexpr int GRID_SIZE = 64;
    std::vector<uint32_t> cells[GRID_SIZE][GRID_SIZE];
    
public:
    void update_object(uint32_t id, Vector3 position) {
        int x = (int)(position.x / CELL_SIZE);
        int y = (int)(position.y / CELL_SIZE);
        cells[x][y].push_back(id);
    }
    
    std::vector<uint32_t> query_region(Vector3 center, float radius) {
        // Return objects in nearby cells
    }
};
```

#### Level of Detail
```cpp
// Reduce simulation complexity for distant objects
void update_simulation_lod(float dt) {
    Vector3 player_pos = get_player_position();
    
    for (auto& body : bodies) {
        float distance = length(body.position - player_pos);
        
        if (distance < FULL_DETAIL_RANGE) {
            body.update_full_physics(dt);
        } else if (distance < REDUCED_DETAIL_RANGE) {
            body.update_simplified_physics(dt * 2.0f); // Half rate
        } else {
            body.update_minimal_physics(dt * 4.0f);    // Quarter rate
        }
    }
}
```

### 🧪 Testing and Validation

#### Determinism Tests
```cpp
// Verify identical results across runs
void test_deterministic_simulation() {
    WorldSimulation sim1, sim2;
    
    // Initialize with same seed
    sim1.initialize(12345);
    sim2.initialize(12345);
    
    // Apply same inputs
    for (int frame = 0; frame < 1000; frame++) {
        sim1.update_simulation(1.0f/60.0f);
        sim2.update_simulation(1.0f/60.0f);
        
        // Verify state matches
        assert(sim1.get_checksum() == sim2.get_checksum());
    }
}
```

#### Performance Benchmarks
```cpp
// Measure simulation performance
struct PerformanceMetrics {
    float physics_time_ms;
    float chemistry_time_ms;
    float ai_time_ms;
    float total_time_ms;
    
    void print_report() {
        printf("Physics: %.2fms\n", physics_time_ms);
        printf("Chemistry: %.2fms\n", chemistry_time_ms);
        printf("AI: %.2fms\n", ai_time_ms);
        printf("Total: %.2fms\n", total_time_ms);
    }
};
```

---

## 📚 Related Documentation

- [AGENTS.MD](../AGENTS.MD) - WASM-first architecture principles
- [ENEMY_AI.md](../AI/ENEMY_AI.md) - AI behavior systems
- [ANIMATION_SYSTEM_INDEX.md](../ANIMATION/ANIMATION_SYSTEM_INDEX.md) - Visual effects integration
- [TESTING.md](../TESTING.md) - Simulation testing frameworks

---

*This document defines the foundational rules for our deterministic, WASM-based world simulation engine. All systems must be implemented in WebAssembly to ensure consistent, high-performance execution across all clients.*

**Last updated: January 2025**
