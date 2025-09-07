#pragma once

#include "physics_backbone.h"
#include "chemistry_system.h"
#include "internal_core.h"
#include "terrain_hazards.h"
#include <cmath>

// BiomeType constants for compatibility with existing code
const BiomeType BIOME_FOREST = BiomeType::Forest;
const BiomeType BIOME_SWAMP = BiomeType::Swamp;
const BiomeType BIOME_MOUNTAINS = BiomeType::Mountains;
const BiomeType BIOME_PLAINS = BiomeType::Plains;

// HazardType constants for compatibility with existing code
const HazardType HAZARD_BOG = HazardType::Quicksand;  // Bog acts like quicksand
const HazardType HAZARD_POISON_GAS = HazardType::Poison_Gas;
const HazardType HAZARD_QUICKSAND = HazardType::Quicksand;

// Material type flags for environment objects
const uint32_t MATERIAL_FLAG_WOOD = 1;
const uint32_t MATERIAL_FLAG_STONE = 2;
const uint32_t MATERIAL_FLAG_METAL = 3;
const uint32_t MATERIAL_FLAG_ORGANIC = 4;
const uint32_t MATERIAL_FLAG_PLANT = 5;

// ============================================================================
// Comprehensive World Simulation System - WASM Implementation
// Combines Weather, Terrain, Time, Layers, Status, AI, Fire, and Sound systems
// Based on CORE_WORLD_SIMULATION.MD specifications
// ============================================================================

// ============================================================================
// Weather and Climate System
// ============================================================================

struct WeatherState {
    float rain_intensity;        // 0.0 to 1.0
    float wind_speed;           // m/s
    Vector3 wind_direction;     // Normalized vector
    float temperature;          // Celsius
    float humidity;            // 0.0 to 1.0
    bool lightning_active;     // Storm conditions
    float pressure;            // Atmospheric pressure
    
    WeatherState() : 
        rain_intensity(0.0f), wind_speed(0.0f), wind_direction(1, 0, 0),
        temperature(20.0f), humidity(0.5f), lightning_active(false), pressure(1013.25f) {}
};

enum ClimateZone {
    DESERT,     // High heat, low humidity
    MOUNTAIN,   // Cold, thin air
    CAVE,       // Constant cool temperature
    SHADE,      // Reduced temperature
    WATERZONE   // Temperature buffering
};

// ============================================================================
// Terrain and Fluids System
// ============================================================================

struct TerrainCell {
    SurfaceMaterial material;
    float elevation;
    float moisture;
    float temperature;
    uint32_t vegetation_density;
    struct FluidVolume* fluid;        // Null if no fluid present
    ClimateZone climate_zone;
    
    TerrainCell() : elevation(0.0f), moisture(0.5f), temperature(20.0f), 
                   vegetation_density(0), fluid(nullptr), climate_zone(SHADE) {}
};

struct FluidVolume {
    float density;             // kg/m³
    Vector3 velocity;         // Current flow direction
    float viscosity;          // Resistance to flow
    float temperature;        // Affects state changes
    float volume;             // Amount of fluid
    
    FluidVolume() : density(1000.0f), velocity(0, 0, 0), viscosity(1.0f), 
                   temperature(20.0f), volume(0.0f) {}
    
    void update_flow(float dt) {
        // Simple fluid simulation using cellular automata
        velocity *= (1.0f - viscosity * dt * 0.1f); // Viscous damping
        velocity.z += 9.81f * dt; // Gravity
    }
};

// HazardType enum is defined in terrain_hazards.h
// Adding additional hazard type constants for world simulation
const int WORLD_HAZARD_LAVA = 16;
const int WORLD_HAZARD_BOG = 17;
const int WORLD_HAZARD_ACID = 18;

struct HazardVolume {
    HazardType type;
    Vector3 position;
    float radius;
    float intensity;
    float sink_rate;           // For quicksand/bog
    float damage_per_second;
    float escape_difficulty;   // Force needed to escape
    
    HazardVolume() : type((HazardType)WORLD_HAZARD_LAVA), position(0, 0, 0), radius(1.0f), intensity(1.0f),
                    sink_rate(0.1f), damage_per_second(10.0f), escape_difficulty(100.0f) {}
};

// ============================================================================
// Time and World Reset System
// ============================================================================

struct TimeSystem {
    float current_time;        // 0.0 to 24.0 hours
    float day_length;          // Real seconds per game day
    uint32_t day_count;        // Days since start
    bool is_blood_moon;        // Special event flag
    float time_scale;          // Time dilation factor
    
    TimeSystem() : current_time(12.0f), day_length(1200.0f), day_count(0), 
                  is_blood_moon(false), time_scale(1.0f) {}
    
    float get_light_level() {
        // Sinusoidal light curve
        float normalized_time = current_time / 24.0f;
        return fmaxf(0.1f, sinf(normalized_time * 2 * 3.14159f));
    }
    
    bool is_night() {
        return current_time < 6.0f || current_time > 18.0f;
    }
};

struct PersistentObject {
    uint32_t object_id;
    float creation_time;
    float lifetime;            // Seconds before cleanup
    bool is_player_created;    // Player items last longer
    
    PersistentObject() : object_id(0xFFFFFFFF), creation_time(0.0f), 
                        lifetime(300.0f), is_player_created(false) {}
    
    bool should_cleanup(float current_time) {
        float age = current_time - creation_time;
        float effective_lifetime = is_player_created ? lifetime * 2.0f : lifetime;
        return age > effective_lifetime;
    }
};

// ============================================================================
// Layered World Topology System
// ============================================================================

enum WorldLayer {
    SKY_LAYER = 2,      // Floating islands, sky structures
    SURFACE_LAYER = 1,   // Main world surface
    DEPTHS_LAYER = 0     // Underground caves, depths
};

struct LayeredPosition {
    Vector3 coordinates;     // X, Y, Z within layer
    WorldLayer layer;
    
    LayeredPosition() : coordinates(0, 0, 0), layer(SURFACE_LAYER) {}
    LayeredPosition(const Vector3& pos, WorldLayer l) : coordinates(pos), layer(l) {}
    
    // Objects can fall between layers
    bool can_fall_to_layer(WorldLayer target) {
        return (layer > target) && has_opening_below(coordinates);
    }
    
private:
    bool has_opening_below(const Vector3& pos) {
        // Simple check - could be enhanced with actual terrain data
        return (pos.x > 0.4f && pos.x < 0.6f && pos.y > 0.4f && pos.y < 0.6f);
    }
};

// ============================================================================
// Status and Hazards System
// ============================================================================

struct StatusEffect {
    uint32_t effect_id;
    float intensity;           // 0.0 to 1.0
    float duration;           // Seconds remaining
    float tick_rate;          // Damage/effect per second
    
    StatusEffect() : effect_id(0), intensity(0.0f), duration(0.0f), tick_rate(0.0f) {}
    
    void apply_effect(RigidBody& target, float dt) {
        duration -= dt;
        if (duration <= 0.0f) return;
        
        switch(effect_id) {
            case 1: // BURNING
                // Applied through chemistry system
                break;
            case 2: // FREEZING
                // Reduce movement (applied to velocity)
                break;
            case 3: // SHOCKED
                // Stun effect
                break;
        }
    }
};

struct GloomField {
    Vector3 center;
    float radius;
    float intensity;
    
    GloomField() : center(0, 0, 0), radius(5.0f), intensity(0.5f) {}
    
    void apply_gloom_effect(RigidBody& body) {
        float distance = (body.position - center).length();
        if (distance < radius) {
            float effect_strength = 1.0f - (distance / radius);
            // Apply gloom effects (reduced health regen, etc.)
        }
    }
};

// ============================================================================
// AI, Ecology, and Perception System
// ============================================================================

struct AISenses {
    float sight_range;
    float sight_angle;         // Field of view in radians
    float hearing_range;
    float light_sensitivity;   // How darkness affects sight
    
    AISenses() : sight_range(10.0f), sight_angle(3.14159f), hearing_range(15.0f), light_sensitivity(1.0f) {}
    
    bool can_see_target(const Vector3& ai_pos, const Vector3& target_pos, float light_level) {
        float distance = (target_pos - ai_pos).length();
        float effective_range = sight_range * light_level * light_sensitivity;
        
        if (distance > effective_range) return false;
        // Additional FOV and LOS checks would go here
        return true;
    }
};

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
    
    AIDecisionTree() : aggression(0.5f), intelligence(0.5f), tool_use_ability(0.3f) {}
    
    AIBehavior decide_behavior(const WeatherState& weather, bool has_target, float health) {
        if (weather.rain_intensity > 0.8f) return SEEK_SHELTER;
        if (intelligence > 0.7f && tool_use_ability > 0.5f) return USE_TOOL;
        if (health < 0.3f && aggression < 0.5f) return FLEE;
        if (has_target && aggression > 0.6f) return HUNT;
        return PATROL;
    }
};

// ============================================================================
// Fire, Heat, and Cooking System
// ============================================================================

struct HeatSource {
    Vector3 position;
    float temperature;         // Celsius
    float heat_radius;        // Effective range
    float fuel_consumption;   // Per second
    bool requires_oxygen;
    bool is_active;
    
    HeatSource() : position(0, 0, 0), temperature(200.0f), heat_radius(2.0f), 
                  fuel_consumption(1.0f), requires_oxygen(true), is_active(false) {}
    
    void update_heat_effects(float dt) {
        if (!is_active) return;
        
        // Heat transfer to nearby objects would be handled here
        // Integration with chemistry system for ignition
    }
};

struct CombustibleMaterial {
    float fuel_value;          // How long it burns
    float ignition_temp;       // Temperature needed to ignite
    float burn_rate;          // Fuel consumed per second
    float heat_output;        // Heat produced while burning
    bool requires_air;        // Can be smothered
    
    CombustibleMaterial() : fuel_value(100.0f), ignition_temp(200.0f), burn_rate(1.0f),
                           heat_output(300.0f), requires_air(true) {}
};

// ============================================================================
// Sound and Surfaces System
// ============================================================================

struct SoundEvent {
    Vector3 origin;
    float volume;             // dB level
    float frequency;          // Hz, affects how far it travels
    SurfaceMaterial surface;  // What generated the sound
    float timestamp;
    
    SoundEvent() : origin(0, 0, 0), volume(60.0f), frequency(1000.0f), timestamp(0.0f) {}
    
    float calculate_audible_range() {
        float base_range = volume * 0.1f; // 1 dB = 0.1 meters
        
        // Surface material affects sound
        float material_modifier = 1.0f;
        if (surface.density > 2000.0f) material_modifier = 1.5f;  // Metal - louder
        else if (surface.density < 500.0f) material_modifier = 0.7f;  // Sand - muffled
        
        return base_range * material_modifier;
    }
};

// ============================================================================
// Combined World Simulation State
// ============================================================================

const int TERRAIN_GRID_SIZE = 32;
const int MAX_HEAT_SOURCES = 64;
const int MAX_HAZARD_VOLUMES = 32;
const int MAX_SOUND_EVENTS = 128;
const int MAX_STATUS_EFFECTS = 256;
const int MAX_PERSISTENT_OBJECTS = 512;
const int MAX_ENVIRONMENT_OBJECTS = 1024;
const int MAX_BIOME_DECORATIONS = 512;

// ============================================================================
// Environment and Biome System
// ============================================================================

enum EnvironmentObjectType {
    ENV_TREE = 0,
    ENV_ROCK = 1,
    ENV_BUSH = 2,
    ENV_SWAMP_TREE = 3,
    ENV_LILYPAD = 4,
    ENV_SNOW_PATCH = 5,
    ENV_GRASS_TUFT = 6,
    ENV_CRATE = 7,
    ENV_BARREL = 8,
    ENV_CHEST = 9,
    ENV_LEVER = 10,
    ENV_DOOR = 11
};

struct EnvironmentObject {
    EnvironmentObjectType type;
    Vector3 position;
    Vector2 size;
    uint32_t material_flags;    // Material properties for physics
    bool is_interactable;
    bool is_solid;              // Affects collision
    float health;               // For destructible objects
    uint32_t state_flags;       // Open/closed, activated, etc.
    
    EnvironmentObject() : type(ENV_TREE), position(0, 0, 0), size(80, 150),
                         material_flags(0), is_interactable(false), is_solid(true),
                         health(100.0f), state_flags(0) {}
};

struct BiomeConfiguration {
    BiomeType type;
    float decoration_density;
    float tree_probability;
    float rock_probability;
    float interactable_probability;
    WeatherState default_weather;
    ClimateZone climate_zone;
    SurfaceMaterial ground_material;
    
    BiomeConfiguration() : type(BIOME_FOREST), decoration_density(0.5f),
                          tree_probability(0.6f), rock_probability(0.3f),
                          interactable_probability(0.1f), climate_zone(SHADE) {}
};

struct WorldSimulation {
    // Weather and climate
    WeatherState weather;
    float climate_zones[TERRAIN_GRID_SIZE][TERRAIN_GRID_SIZE];
    
    // Terrain and fluids
    TerrainCell terrain[TERRAIN_GRID_SIZE][TERRAIN_GRID_SIZE];
    FluidVolume fluids[TERRAIN_GRID_SIZE][TERRAIN_GRID_SIZE];
    HazardVolume hazards[MAX_HAZARD_VOLUMES];
    uint32_t hazard_count;
    
    // Environment and biomes
    BiomeType current_biome;
    BiomeConfiguration biome_configs[4];
    EnvironmentObject environment_objects[MAX_ENVIRONMENT_OBJECTS];
    uint32_t environment_object_count;
    uint32_t environment_seed;
    
    // Time system
    TimeSystem time;
    PersistentObject persistent_objects[MAX_PERSISTENT_OBJECTS];
    uint32_t persistent_count;
    
    // Status effects
    StatusEffect status_effects[MAX_STATUS_EFFECTS];
    uint32_t status_count;
    GloomField gloom_fields[16];
    uint32_t gloom_count;
    
    // Heat and fire
    HeatSource heat_sources[MAX_HEAT_SOURCES];
    uint32_t heat_source_count;
    
    // Sound system
    SoundEvent sound_events[MAX_SOUND_EVENTS];
    uint32_t sound_event_count;
    uint32_t sound_write_index;
    
    WorldSimulation() : current_biome(BIOME_FOREST), environment_object_count(0), environment_seed(12345),
                       hazard_count(0), persistent_count(0), status_count(0), 
                       gloom_count(0), heat_source_count(0), sound_event_count(0), sound_write_index(0) {
        initialize_terrain();
        initialize_biome_configs();
    }
    
private:
    void initialize_terrain() {
        for (int x = 0; x < TERRAIN_GRID_SIZE; x++) {
            for (int y = 0; y < TERRAIN_GRID_SIZE; y++) {
                TerrainCell& cell = terrain[x][y];
                
                // Simple terrain generation
                float fx = (float)x / TERRAIN_GRID_SIZE;
                float fy = (float)y / TERRAIN_GRID_SIZE;
                
                if (fx < 0.3f) {
                    cell.climate_zone = MOUNTAIN;
                    cell.material = MATERIAL_STONE;
                    cell.temperature = 5.0f;
                } else if (fx > 0.7f) {
                    cell.climate_zone = WATERZONE;
                    cell.material = SurfaceMaterial(0.1f, 0.05f, 0.1f, 0.1f, 1000.0f);
                    cell.temperature = 15.0f;
                    fluids[x][y].volume = 100.0f;
                } else {
                    cell.climate_zone = SHADE;
                    cell.material = MATERIAL_WOOD;
                    cell.temperature = 20.0f;
                    cell.vegetation_density = 50;
                }
                
                climate_zones[x][y] = (float)cell.climate_zone;
            }
        }
    }
    
    void initialize_biome_configs() {
        // Forest biome
        biome_configs[0].type = BIOME_FOREST;
        biome_configs[0].decoration_density = 0.7f;
        biome_configs[0].tree_probability = 0.8f;
        biome_configs[0].rock_probability = 0.2f;
        biome_configs[0].interactable_probability = 0.15f;
        biome_configs[0].climate_zone = SHADE;
        biome_configs[0].ground_material = MATERIAL_WOOD;
        biome_configs[0].default_weather.rain_intensity = 0.0f;
        biome_configs[0].default_weather.temperature = 18.0f;
        
        // Swamp biome
        biome_configs[1].type = BIOME_SWAMP;
        biome_configs[1].decoration_density = 0.6f;
        biome_configs[1].tree_probability = 0.5f;
        biome_configs[1].rock_probability = 0.1f;
        biome_configs[1].interactable_probability = 0.1f;
        biome_configs[1].climate_zone = WATERZONE;
        biome_configs[1].ground_material = MATERIAL_ORGANIC;
        biome_configs[1].default_weather.rain_intensity = 0.3f;
        biome_configs[1].default_weather.humidity = 0.9f;
        biome_configs[1].default_weather.temperature = 22.0f;
        
        // Mountain biome
        biome_configs[2].type = BIOME_MOUNTAINS;
        biome_configs[2].decoration_density = 0.4f;
        biome_configs[2].tree_probability = 0.2f;
        biome_configs[2].rock_probability = 0.7f;
        biome_configs[2].interactable_probability = 0.05f;
        biome_configs[2].climate_zone = MOUNTAIN;
        biome_configs[2].ground_material = MATERIAL_STONE;
        biome_configs[2].default_weather.temperature = 5.0f;
        biome_configs[2].default_weather.wind_speed = 15.0f;
        
        // Plains biome
        biome_configs[3].type = BIOME_PLAINS;
        biome_configs[3].decoration_density = 0.5f;
        biome_configs[3].tree_probability = 0.1f;
        biome_configs[3].rock_probability = 0.1f;
        biome_configs[3].interactable_probability = 0.2f;
        biome_configs[3].climate_zone = SHADE;
        biome_configs[3].ground_material = MATERIAL_PLANT;
        biome_configs[3].default_weather.temperature = 25.0f;
        biome_configs[3].default_weather.wind_speed = 8.0f;
    }

public:
    // Environment generation functions
    void generate_environment(BiomeType biome_type, uint32_t seed) {
        current_biome = biome_type;
        environment_seed = seed;
        environment_object_count = 0;
        hazard_count = 0; // Clear existing hazards
        
        // Set weather based on biome
        weather = biome_configs[(int)biome_type].default_weather;
        
        // Generate environment objects deterministically
        srand(seed);
        
        BiomeConfiguration& config = biome_configs[(int)biome_type];
        
        switch (biome_type) {
            case BIOME_FOREST:
                generate_forest_environment(config);
                break;
            case BIOME_SWAMP:
                generate_swamp_environment(config);
                break;
            case BIOME_MOUNTAINS:
                generate_mountain_environment(config);
                break;
            case BIOME_PLAINS:
                generate_plains_environment(config);
                break;
            case BiomeType::Count:
                // Should never reach here - Count is not a valid biome
                break;
        }
    }

private:
    void generate_forest_environment(const BiomeConfiguration& config) {
        // Generate trees
        for (int i = 0; i < 20; i++) {
            if ((float)rand() / (float)RAND_MAX < config.tree_probability) {
                add_environment_object(ENV_TREE, 
                    Vector3(100 + i * 150 + (rand() % 100), 360, 0), 
                    Vector2(80, 150), true, true);
            }
        }
        
        // Generate bushes
        for (int i = 0; i < 25; i++) {
            if ((float)rand() / (float)RAND_MAX < 0.6f) {
                add_environment_object(ENV_BUSH, 
                    Vector3(180 + i * 120 + (rand() % 80), 430, 0), 
                    Vector2(60, 40), false, false);
            }
        }
        
        // Generate interactables
        add_environment_object(ENV_CHEST, Vector3(520, 380, 0), Vector2(40, 30), true, true);
        add_environment_object(ENV_LEVER, Vector3(860, 390, 0), Vector2(20, 40), true, false);
        add_environment_object(ENV_DOOR, Vector3(1300, 340, 0), Vector2(40, 110), true, true);
    }
    
    void generate_swamp_environment(const BiomeConfiguration& config) {
        // Generate swamp trees
        for (int i = 0; i < 15; i++) {
            if ((float)rand() / (float)RAND_MAX < config.tree_probability) {
                add_environment_object(ENV_SWAMP_TREE, 
                    Vector3(120 + i * 180 + (rand() % 100), 420, 0), 
                    Vector2(90, 160), true, true);
            }
        }
        
        // Generate lilypads
        for (int i = 0; i < 20; i++) {
            add_environment_object(ENV_LILYPAD, 
                Vector3(160 + i * 100 + (rand() % 80), 500, 0), 
                Vector2(50, 10), false, false);
        }
        
        // Add swamp hazards (bog areas)
        add_hazard(HAZARD_BOG, Vector3(800, 480, 0), 120.0f, 0.6f);
        add_hazard(HAZARD_POISON_GAS, Vector3(1200, 450, 0), 80.0f, 0.4f);
        
        // Interactables
        add_environment_object(ENV_CHEST, Vector3(450, 410, 0), Vector2(40, 30), true, true);
        add_environment_object(ENV_LEVER, Vector3(980, 420, 0), Vector2(20, 40), true, false);
    }
    
    void generate_mountain_environment(const BiomeConfiguration& config) {
        // Generate rocks
        for (int i = 0; i < 12; i++) {
            if ((float)rand() / (float)RAND_MAX < config.rock_probability) {
                add_environment_object(ENV_ROCK, 
                    Vector3(180 + i * 200 + (rand() % 120), 380, 0), 
                    Vector2(100, 70), true, true);
            }
        }
        
        // Generate snow patches
        for (int i = 0; i < 15; i++) {
            add_environment_object(ENV_SNOW_PATCH, 
                Vector3(260 + i * 130 + (rand() % 100), 390, 0), 
                Vector2(70, 30), false, false);
        }
        
        // Add mountain hazards (avalanche zones, thin air)
        add_hazard(HAZARD_QUICKSAND, Vector3(600, 400, 0), 100.0f, 0.3f); // Represents unstable snow
        
        // Interactables
        add_environment_object(ENV_DOOR, Vector3(1250, 320, 0), Vector2(50, 130), true, true);
    }
    
    void generate_plains_environment(const BiomeConfiguration& config) {
        // Generate bushes
        for (int i = 0; i < 30; i++) {
            if ((float)rand() / (float)RAND_MAX < 0.7f) {
                add_environment_object(ENV_BUSH, 
                    Vector3(100 + i * 120 + (rand() % 80), 480, 0), 
                    Vector2(50, 30), false, false);
            }
        }
        
        // Generate grass tufts
        for (int i = 0; i < 40; i++) {
            add_environment_object(ENV_GRASS_TUFT, 
                Vector3(140 + i * 80 + (rand() % 60), 510, 0), 
                Vector2(20, 15), false, false);
        }
        
        // Interactables
        add_environment_object(ENV_CHEST, Vector3(700, 470, 0), Vector2(40, 30), true, true);
    }
    
    void add_environment_object(EnvironmentObjectType type, Vector3 pos, Vector2 size, bool interactable, bool solid) {
        if (environment_object_count >= MAX_ENVIRONMENT_OBJECTS) return;
        
        EnvironmentObject& obj = environment_objects[environment_object_count];
        obj.type = type;
        obj.position = pos;
        obj.size = size;
        obj.is_interactable = interactable;
        obj.is_solid = solid;
        obj.health = 100.0f;
        obj.state_flags = 0;
        
        // Set material flags based on type
        switch (type) {
            case ENV_TREE:
            case ENV_SWAMP_TREE:
                obj.material_flags = MATERIAL_FLAG_WOOD;
                break;
            case ENV_ROCK:
                obj.material_flags = MATERIAL_FLAG_STONE;
                break;
            case ENV_BUSH:
            case ENV_GRASS_TUFT:
                obj.material_flags = MATERIAL_FLAG_PLANT;
                break;
            case ENV_CRATE:
            case ENV_BARREL:
            case ENV_CHEST:
            case ENV_DOOR:
                obj.material_flags = MATERIAL_FLAG_WOOD;
                break;
            case ENV_LEVER:
                obj.material_flags = MATERIAL_FLAG_METAL;
                break;
            default:
                obj.material_flags = MATERIAL_FLAG_ORGANIC;
                break;
        }
        
        environment_object_count++;
    }
    
    void add_hazard(HazardType type, Vector3 center, float radius, float intensity) {
        if (hazard_count >= MAX_HAZARD_VOLUMES) return;
        
        HazardVolume& hazard = hazards[hazard_count];
        hazard.type = type;
        hazard.position = center;
        hazard.radius = radius;
        hazard.intensity = intensity;
        hazard.damage_per_second = intensity * 10.0f; // Scale damage with intensity
        hazard.escape_difficulty = intensity * 50.0f; // Scale escape difficulty
        hazard.sink_rate = (type == HAZARD_QUICKSAND || type == HAZARD_BOG) ? intensity * 0.1f : 0.0f;
        
        hazard_count++;
    }
};

static WorldSimulation g_world_sim;

// ============================================================================
// World Simulation Functions
// ============================================================================

void update_weather_effects(float dt) {
    WeatherState& weather = g_world_sim.weather;
    
    // Rain reduces surface friction
    if (weather.rain_intensity > 0.1f) {
        for (int x = 0; x < TERRAIN_GRID_SIZE; x++) {
            for (int y = 0; y < TERRAIN_GRID_SIZE; y++) {
                TerrainCell& cell = g_world_sim.terrain[x][y];
                cell.moisture += weather.rain_intensity * dt * 0.1f;
                if (cell.moisture > 1.0f) cell.moisture = 1.0f;
                
                // Reduce friction when wet
                cell.material.kinetic_friction *= (1.0f - weather.rain_intensity * 0.3f);
            }
        }
    }
    
    // Lightning strikes
    if (weather.lightning_active && (rand() % 1000) < 5) { // 0.5% chance per frame
        // Strike random conductive object
        Vector3 strike_pos(
            (float)(rand() % 100) / 100.0f,
            (float)(rand() % 100) / 100.0f,
            0.0f
        );
        
        // Apply electric state through chemistry system
        set_chemistry_state(strike_pos.x, strike_pos.y, ELECTRIC, 1.0f);
    }
}

void update_fluid_dynamics(float dt) {
    // Simple fluid simulation
    for (int x = 0; x < TERRAIN_GRID_SIZE; x++) {
        for (int y = 0; y < TERRAIN_GRID_SIZE; y++) {
            FluidVolume& fluid = g_world_sim.fluids[x][y];
            if (fluid.volume > 0.1f) {
                fluid.update_flow(dt);
                
                // Flow to lower neighbors
                for (int dx = -1; dx <= 1; dx++) {
                    for (int dy = -1; dy <= 1; dy++) {
                        if (dx == 0 && dy == 0) continue;
                        
                        int nx = x + dx;
                        int ny = y + dy;
                        
                        if (nx >= 0 && nx < TERRAIN_GRID_SIZE && 
                            ny >= 0 && ny < TERRAIN_GRID_SIZE) {
                            
                            TerrainCell& neighbor = g_world_sim.terrain[nx][ny];
                            if (neighbor.elevation < g_world_sim.terrain[x][y].elevation) {
                                float flow_rate = (fluid.volume * 0.1f) * dt;
                                fluid.volume -= flow_rate;
                                g_world_sim.fluids[nx][ny].volume += flow_rate;
                            }
                        }
                    }
                }
            }
        }
    }
}

void update_time_system(float dt) {
    TimeSystem& time_sys = g_world_sim.time;
    
    time_sys.current_time += (dt / time_sys.day_length) * 24.0f * time_sys.time_scale;
    
    if (time_sys.current_time >= 24.0f) {
        time_sys.current_time -= 24.0f;
        time_sys.day_count++;
        
        // Check for blood moon (every 7-10 days)
        if (time_sys.day_count % (7 + (rand() % 4)) == 0) {
            time_sys.is_blood_moon = true;
        } else {
            time_sys.is_blood_moon = false;
        }
    }
    
    // Update persistent objects
    for (uint32_t i = 0; i < g_world_sim.persistent_count; i++) {
        PersistentObject& obj = g_world_sim.persistent_objects[i];
        if (obj.should_cleanup(time_sys.current_time * time_sys.day_length / 24.0f)) {
            // Remove object (swap with last)
            g_world_sim.persistent_objects[i] = g_world_sim.persistent_objects[g_world_sim.persistent_count - 1];
            g_world_sim.persistent_count--;
            i--; // Check the swapped object
        }
    }
}

void update_heat_sources(float dt) {
    for (uint32_t i = 0; i < g_world_sim.heat_source_count; i++) {
        HeatSource& source = g_world_sim.heat_sources[i];
        if (source.is_active) {
            source.update_heat_effects(dt);
            
            // Apply heat to nearby chemistry nodes
            for (int x = 0; x < CHEMISTRY_GRID_SIZE; x++) {
                for (int y = 0; y < CHEMISTRY_GRID_SIZE; y++) {
                    Vector3 node_pos((float)x / CHEMISTRY_GRID_SIZE, (float)y / CHEMISTRY_GRID_SIZE, 0);
                    float distance = (node_pos - source.position).length();
                    
                    if (distance < source.heat_radius) {
                        float heat_transfer = source.temperature * (1.0f - distance / source.heat_radius) * dt * 0.01f;
                        ChemicalNode* node = get_node_at_position(node_pos);
                        if (node) {
                            node->temperature += heat_transfer;
                            
                            // Auto-ignite if hot enough
                            if (node->temperature > 200.0f && node->fuel_remaining > 0.0f) {
                                node->states |= FIRE;
                                node->intensity[0] = 0.5f;
                            }
                        }
                    }
                }
            }
        }
    }
}

void update_sound_propagation(float dt) {
    // Age existing sound events
    for (uint32_t i = 0; i < g_world_sim.sound_event_count; i++) {
        SoundEvent& event = g_world_sim.sound_events[i];
        event.volume -= 10.0f * dt; // Decay at 10 dB per second
        
        if (event.volume <= 0.0f) {
            // Remove sound event
            g_world_sim.sound_events[i] = g_world_sim.sound_events[g_world_sim.sound_event_count - 1];
            g_world_sim.sound_event_count--;
            i--;
        }
    }
}

void update_world_simulation(float dt) {
    update_weather_effects(dt);
    update_fluid_dynamics(dt);
    update_time_system(dt);
    update_heat_sources(dt);
    update_sound_propagation(dt);
}

// ============================================================================
// WASM Export Functions
// ============================================================================

extern "C" {
    // World simulation management
    void world_simulation_init() {
        g_world_sim = WorldSimulation();
    }
    
    void world_simulation_update(float dt) {
        update_world_simulation(dt);
    }
    
    // Weather system
    void set_weather_rain(float intensity) {
        g_world_sim.weather.rain_intensity = intensity;
    }
    
    void set_weather_wind(float speed, float dir_x, float dir_y, float dir_z) {
        g_world_sim.weather.wind_speed = speed;
        g_world_sim.weather.wind_direction = Vector3(dir_x, dir_y, dir_z).normalized();
    }
    
    void set_weather_temperature(float temp) {
        g_world_sim.weather.temperature = temp;
    }
    
    void set_weather_lightning(int active) {
        g_world_sim.weather.lightning_active = (active != 0);
    }
    
    float get_weather_rain() { return g_world_sim.weather.rain_intensity; }
    float get_weather_wind_speed() { return g_world_sim.weather.wind_speed; }
    float get_weather_temperature() { return g_world_sim.weather.temperature; }
    int get_weather_lightning() { return g_world_sim.weather.lightning_active ? 1 : 0; }
    
    // Time system
    float get_time_of_day() { return g_world_sim.time.current_time; }
    uint32_t get_day_count() { return g_world_sim.time.day_count; }
    int is_blood_moon() { return g_world_sim.time.is_blood_moon ? 1 : 0; }
    float get_light_level() { return g_world_sim.time.get_light_level(); }
    int is_night_time() { return g_world_sim.time.is_night() ? 1 : 0; }
    
    void set_time_scale(float scale) { g_world_sim.time.time_scale = scale; }
    
    // Terrain queries
    float get_terrain_elevation(float x, float y) {
        int gx = (int)(x * TERRAIN_GRID_SIZE);
        int gy = (int)(y * TERRAIN_GRID_SIZE);
        if (gx >= 0 && gx < TERRAIN_GRID_SIZE && gy >= 0 && gy < TERRAIN_GRID_SIZE) {
            return g_world_sim.terrain[gx][gy].elevation;
        }
        return 0.0f;
    }
    
    float get_terrain_moisture(float x, float y) {
        int gx = (int)(x * TERRAIN_GRID_SIZE);
        int gy = (int)(y * TERRAIN_GRID_SIZE);
        if (gx >= 0 && gx < TERRAIN_GRID_SIZE && gy >= 0 && gy < TERRAIN_GRID_SIZE) {
            return g_world_sim.terrain[gx][gy].moisture;
        }
        return 0.0f;
    }
    
    uint32_t get_climate_zone(float x, float y) {
        int gx = (int)(x * TERRAIN_GRID_SIZE);
        int gy = (int)(y * TERRAIN_GRID_SIZE);
        if (gx >= 0 && gx < TERRAIN_GRID_SIZE && gy >= 0 && gy < TERRAIN_GRID_SIZE) {
            return (uint32_t)g_world_sim.terrain[gx][gy].climate_zone;
        }
        return (uint32_t)SHADE;
    }
    
    // Heat sources
    uint32_t create_heat_source(float x, float y, float z, float temperature, float radius) {
        if (g_world_sim.heat_source_count >= MAX_HEAT_SOURCES) return 0xFFFFFFFF;
        
        uint32_t id = g_world_sim.heat_source_count++;
        HeatSource& source = g_world_sim.heat_sources[id];
        source.position = Vector3(x, y, z);
        source.temperature = temperature;
        source.heat_radius = radius;
        source.is_active = true;
        
        return id;
    }
    
    void activate_heat_source(uint32_t id, int active) {
        if (id < g_world_sim.heat_source_count) {
            g_world_sim.heat_sources[id].is_active = (active != 0);
        }
    }
    
    // Sound system
    void emit_sound(float x, float y, float z, float volume, float frequency) {
        if (g_world_sim.sound_event_count >= MAX_SOUND_EVENTS) {
            // Replace oldest sound
            g_world_sim.sound_write_index = (g_world_sim.sound_write_index + 1) % MAX_SOUND_EVENTS;
        } else {
            g_world_sim.sound_write_index = g_world_sim.sound_event_count++;
        }
        
        SoundEvent& event = g_world_sim.sound_events[g_world_sim.sound_write_index];
        event.origin = Vector3(x, y, z);
        event.volume = volume;
        event.frequency = frequency;
        event.timestamp = g_world_sim.time.current_time;
    }
    
    uint32_t get_sound_event_count() {
        return g_world_sim.sound_event_count;
    }
    
    float get_sound_x(uint32_t index) {
        if (index >= g_world_sim.sound_event_count) return 0.0f;
        return g_world_sim.sound_events[index].origin.x;
    }
    
    float get_sound_y(uint32_t index) {
        if (index >= g_world_sim.sound_event_count) return 0.0f;
        return g_world_sim.sound_events[index].origin.y;
    }
    
    float get_sound_volume(uint32_t index) {
        if (index >= g_world_sim.sound_event_count) return 0.0f;
        return g_world_sim.sound_events[index].volume;
    }
    
    // Hazards
    uint32_t create_hazard_volume(uint32_t type, float x, float y, float z, float radius, float intensity) {
        if (g_world_sim.hazard_count >= MAX_HAZARD_VOLUMES) return 0xFFFFFFFF;
        
        uint32_t id = g_world_sim.hazard_count++;
        HazardVolume& hazard = g_world_sim.hazards[id];
        hazard.type = (HazardType)type;
        hazard.position = Vector3(x, y, z);
        hazard.radius = radius;
        hazard.intensity = intensity;
        
        switch ((int)hazard.type) {
            case WORLD_HAZARD_LAVA:
                hazard.damage_per_second = 50.0f * intensity;
                break;
            case (int)HazardType::Quicksand:
                hazard.sink_rate = 0.1f * intensity;
                hazard.escape_difficulty = 200.0f * intensity;
                break;
            case (int)HazardType::Poison_Gas:
                hazard.damage_per_second = 10.0f * intensity;
                break;
            default:
                hazard.damage_per_second = 20.0f * intensity;
                break;
        }
        
        return id;
    }
    
    uint32_t get_world_hazard_count() { return g_world_sim.hazard_count; }
    
    uint32_t get_world_hazard_type(uint32_t index) {
        if (index >= g_world_sim.hazard_count) return 0;
        return (uint32_t)g_world_sim.hazards[index].type;
    }
    
    float get_world_hazard_x(uint32_t index) {
        if (index >= g_world_sim.hazard_count) return 0.0f;
        return g_world_sim.hazards[index].position.x;
    }
    
    float get_world_hazard_y(uint32_t index) {
        if (index >= g_world_sim.hazard_count) return 0.0f;
        return g_world_sim.hazards[index].position.y;
    }
    
    float get_world_hazard_radius(uint32_t index) {
        if (index >= g_world_sim.hazard_count) return 0.0f;
        return g_world_sim.hazards[index].radius;
    }
    
    float get_world_hazard_intensity(uint32_t index) {
        if (index >= g_world_sim.hazard_count) return 0.0f;
        return g_world_sim.hazards[index].intensity;
    }
}
