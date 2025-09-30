#pragma once

#include "physics_backbone.h"
#include <cmath>

// ============================================================================
// Chemistry State Machine System - WASM Implementation
// Handles element states, material interactions, and state transitions
// Based on CORE_WORLD_SIMULATION.MD specifications
// ============================================================================

// ============================================================================
// Chemistry Data Structures
// ============================================================================

// Element states (bit flags for combinations)
enum ElementState {
    NEUTRAL = 0,
    FIRE    = 1 << 0,  // Spreads, consumes fuel, produces heat
    WATER   = 1 << 1,  // Extinguishes fire, conducts electricity
    ICE     = 1 << 2,  // Slippery, melts to water
    ELECTRIC = 1 << 3, // Arcs through conductors, stuns
    WIND    = 1 << 4   // Fans flames, moves particles
};

// Material tags (bit flags for properties)
enum MaterialTag {
    WOOD     = 1 << 0,  // Burns, floats
    METAL    = 1 << 1,  // Conducts electricity, attracts lightning
    STONE    = 1 << 2,  // Fire resistant, heavy
    PLANT    = 1 << 3,  // Burns quickly, withers in heat
    CLOTH    = 1 << 4,  // Burns fast, absorbs water
    LIQUID   = 1 << 5,  // Flows, conducts
    ORGANIC  = 1 << 6   // Rots, burns, feeds fire
};

// Chemical node representing a point in space with chemical properties
struct ChemicalNode {
    Vector3 position;
    uint32_t states;           // Bit flags for active element states
    float intensity[5];        // Strength of each element state (FIRE, WATER, ICE, ELECTRIC, WIND)
    float fuel_remaining;      // For fire propagation
    uint32_t material_tags;    // What this node is made of
    float temperature;         // Current temperature in Celsius
    float conductivity;        // Electrical conductivity
    float flammability;        // How easily it catches fire
    
    // State transition timers
    float fire_duration;       // How long fire has been burning
    float wet_duration;        // How long node has been wet
    float freeze_timer;        // Timer for freezing process
    
    // Neighbors for propagation (spatial grid indices)
    uint32_t neighbors[8];
    uint32_t neighbor_count;
    
    ChemicalNode() : 
        position(0, 0, 0), states(NEUTRAL), fuel_remaining(100.0f), 
        material_tags(WOOD), temperature(20.0f), conductivity(0.1f), flammability(0.5f),
        fire_duration(0.0f), wet_duration(0.0f), freeze_timer(0.0f), neighbor_count(0) {
        
        for (int i = 0; i < 5; i++) intensity[i] = 0.0f;
        for (int i = 0; i < 8; i++) neighbors[i] = 0xFFFFFFFF;
    }
};

// Reaction rules for state transitions
struct ChemistryReaction {
    uint32_t required_states;    // Input states needed
    uint32_t required_materials; // Material tags needed
    uint32_t result_states;      // Output states produced
    float activation_energy;     // Temperature/intensity threshold
    float reaction_rate;         // Speed of reaction
    float heat_generated;        // Heat produced by reaction
    bool consumes_fuel;          // Whether reaction consumes fuel
    
    ChemistryReaction() : 
        required_states(NEUTRAL), required_materials(0), result_states(NEUTRAL),
        activation_energy(0.0f), reaction_rate(1.0f), heat_generated(0.0f), consumes_fuel(false) {}
        
    ChemistryReaction(uint32_t req_states, uint32_t req_materials, uint32_t res_states,
                     float activation, float rate, float heat, bool fuel) :
        required_states(req_states), required_materials(req_materials), result_states(res_states),
        activation_energy(activation), reaction_rate(rate), heat_generated(heat), consumes_fuel(fuel) {}
};

// ============================================================================
// Chemistry System State
// ============================================================================

const int CHEMISTRY_GRID_SIZE = 64;
const int MAX_REACTIONS = 32;
const float FIRE_SPREAD_RADIUS = 0.1f;
const float ELECTRIC_ARC_RADIUS = 0.15f;
const float WIND_EFFECT_RADIUS = 0.2f;

struct ChemistrySystem {
    ChemicalNode grid[CHEMISTRY_GRID_SIZE][CHEMISTRY_GRID_SIZE];
    ChemistryReaction reactions[MAX_REACTIONS];
    uint32_t reaction_count;
    
    float world_temperature;    // Ambient temperature
    float world_humidity;       // Ambient humidity
    Vector3 wind_velocity;      // Current wind
    
    // Performance tracking
    uint32_t active_nodes;      // Nodes with active chemistry
    uint32_t reactions_this_frame;
    
    ChemistrySystem() : 
        reaction_count(0), world_temperature(20.0f), world_humidity(0.5f),
        wind_velocity(0, 0, 0), active_nodes(0), reactions_this_frame(0) {
        
        initialize_default_reactions();
    }
    
    void initialize_default_reactions() {
        // Fire + Water = Steam (extinguish)
        reactions[reaction_count++] = ChemistryReaction(
            FIRE | WATER, 0, NEUTRAL, 0.0f, 2.0f, -50.0f, false
        );
        
        // Wet + Cold = Ice
        reactions[reaction_count++] = ChemistryReaction(
            WATER, 0, ICE, -10.0f, 1.0f, -20.0f, false
        );
        
        // Ice + Heat = Water
        reactions[reaction_count++] = ChemistryReaction(
            ICE, 0, WATER, 10.0f, 1.5f, 0.0f, false
        );
        
        // Electric + Water = Enhanced conduction
        reactions[reaction_count++] = ChemistryReaction(
            ELECTRIC | WATER, 0, ELECTRIC, 0.0f, 1.0f, 10.0f, false
        );
        
        // Fire + Wind = Enhanced spread
        reactions[reaction_count++] = ChemistryReaction(
            FIRE | WIND, 0, FIRE, 0.0f, 2.0f, 20.0f, true
        );
        
        // Wood + Fire = Burning wood
        reactions[reaction_count++] = ChemistryReaction(
            FIRE, WOOD, FIRE, 200.0f, 0.8f, 100.0f, true
        );
        
        // Metal + Electric = Conduction
        reactions[reaction_count++] = ChemistryReaction(
            ELECTRIC, METAL, ELECTRIC, 0.0f, 3.0f, 5.0f, false
        );
        
        // Plant + Fire = Fast burning
        reactions[reaction_count++] = ChemistryReaction(
            FIRE, PLANT, FIRE, 150.0f, 1.5f, 80.0f, true
        );
    }
};

static ChemistrySystem g_chemistry_system;

// ============================================================================
// Chemistry Functions
// ============================================================================

// Convert world coordinates to grid coordinates
void world_to_grid(const Vector3& world_pos, int& grid_x, int& grid_y) {
    // Assume world coordinates are in [0,1] range
    grid_x = (int)(world_pos.x * CHEMISTRY_GRID_SIZE);
    grid_y = (int)(world_pos.y * CHEMISTRY_GRID_SIZE);
    
    // Clamp to grid bounds
    grid_x = grid_x < 0 ? 0 : (grid_x >= CHEMISTRY_GRID_SIZE ? CHEMISTRY_GRID_SIZE - 1 : grid_x);
    grid_y = grid_y < 0 ? 0 : (grid_y >= CHEMISTRY_GRID_SIZE ? CHEMISTRY_GRID_SIZE - 1 : grid_y);
}

// Get chemical node at world position
ChemicalNode* get_node_at_position(const Vector3& world_pos) {
    int grid_x, grid_y;
    world_to_grid(world_pos, grid_x, grid_y);
    return &g_chemistry_system.grid[grid_x][grid_y];
}

// Initialize chemistry grid
void initialize_chemistry_grid() {
    for (int x = 0; x < CHEMISTRY_GRID_SIZE; x++) {
        for (int y = 0; y < CHEMISTRY_GRID_SIZE; y++) {
            ChemicalNode& node = g_chemistry_system.grid[x][y];
            
            // Set position
            node.position = Vector3(
                (float)x / CHEMISTRY_GRID_SIZE,
                (float)y / CHEMISTRY_GRID_SIZE,
                0.0f
            );
            
            // Set up neighbors
            node.neighbor_count = 0;
            for (int dx = -1; dx <= 1; dx++) {
                for (int dy = -1; dy <= 1; dy++) {
                    if (dx == 0 && dy == 0) continue; // Skip self
                    
                    int nx = x + dx;
                    int ny = y + dy;
                    
                    if (nx >= 0 && nx < CHEMISTRY_GRID_SIZE && 
                        ny >= 0 && ny < CHEMISTRY_GRID_SIZE) {
                        
                        if (node.neighbor_count < 8) {
                            uint32_t neighbor_index = ny * CHEMISTRY_GRID_SIZE + nx;
                            node.neighbors[node.neighbor_count++] = neighbor_index;
                        }
                    }
                }
            }
            
            // Set default material properties based on position
            // This could be enhanced to read from terrain data
            if (x < CHEMISTRY_GRID_SIZE / 4) {
                node.material_tags = STONE;
                node.flammability = 0.1f;
                node.fuel_remaining = 0.0f;
            } else if (x > 3 * CHEMISTRY_GRID_SIZE / 4) {
                node.material_tags = WATER | LIQUID;
                node.conductivity = 0.8f;
                node.flammability = 0.0f;
            } else {
                node.material_tags = WOOD | ORGANIC;
                node.flammability = 0.7f;
                node.fuel_remaining = 150.0f;
            }
        }
    }
}

// Apply a chemistry reaction to a node
void apply_reaction(ChemicalNode& node, const ChemistryReaction& reaction, float dt) {
    // Check if reaction conditions are met
    if ((node.states & reaction.required_states) != reaction.required_states) return;
    if (reaction.required_materials != 0 && 
        (node.material_tags & reaction.required_materials) == 0) return;
    if (node.temperature < reaction.activation_energy) return;
    
    // Apply reaction
    float reaction_progress = reaction.reaction_rate * dt;
    
    // Modify states
    if (reaction.result_states != NEUTRAL) {
        node.states |= reaction.result_states;
        
        // Update intensities for new states
        if (reaction.result_states & FIRE) {
            node.intensity[0] += reaction_progress;
            if (node.intensity[0] > 1.0f) node.intensity[0] = 1.0f;
        }
        if (reaction.result_states & WATER) {
            node.intensity[1] += reaction_progress;
            if (node.intensity[1] > 1.0f) node.intensity[1] = 1.0f;
        }
        if (reaction.result_states & ICE) {
            node.intensity[2] += reaction_progress;
            if (node.intensity[2] > 1.0f) node.intensity[2] = 1.0f;
        }
        if (reaction.result_states & ELECTRIC) {
            node.intensity[3] += reaction_progress;
            if (node.intensity[3] > 1.0f) node.intensity[3] = 1.0f;
        }
        if (reaction.result_states & WIND) {
            node.intensity[4] += reaction_progress;
            if (node.intensity[4] > 1.0f) node.intensity[4] = 1.0f;
        }
    }
    
    // Apply heat
    node.temperature += reaction.heat_generated * reaction_progress;
    
    // Consume fuel if needed
    if (reaction.consumes_fuel) {
        node.fuel_remaining -= 10.0f * reaction_progress;
        if (node.fuel_remaining < 0.0f) {
            node.fuel_remaining = 0.0f;
            // Remove fire state if no fuel
            node.states &= ~FIRE;
            node.intensity[0] = 0.0f;
        }
    }
    
    g_chemistry_system.reactions_this_frame++;
}

// Update state transitions for a single node
void update_chemistry_node(ChemicalNode& node, float dt) {
    bool was_active = (node.states != NEUTRAL);
    
    // Apply all possible reactions
    for (uint32_t i = 0; i < g_chemistry_system.reaction_count; i++) {
        apply_reaction(node, g_chemistry_system.reactions[i], dt);
    }
    
    // Handle special state interactions
    if ((node.states & FIRE) && (node.states & WATER)) {
        // Fire + Water = Steam (extinguish)
        float extinguish_rate = node.intensity[1] * 2.0f * dt; // Water intensity affects rate
        node.intensity[0] -= extinguish_rate;
        node.intensity[1] -= extinguish_rate * 0.5f; // Water partially consumed
        
        if (node.intensity[0] <= 0.0f) {
            node.states &= ~FIRE;
            node.intensity[0] = 0.0f;
        }
        if (node.intensity[1] <= 0.0f) {
            node.states &= ~WATER;
            node.intensity[1] = 0.0f;
        }
        
        // Generate heat from steam
        node.temperature += 30.0f * extinguish_rate;
    }
    
    // Electric + Water = Enhanced conduction
    if ((node.states & ELECTRIC) && (node.states & WATER)) {
        node.intensity[3] *= 1.5f; // Boosted electric intensity
        if (node.intensity[3] > 1.0f) node.intensity[3] = 1.0f;
    }
    
    // Temperature-based state changes
    if (node.temperature < 0.0f && (node.states & WATER)) {
        // Water freezes to ice
        node.states |= ICE;
        node.states &= ~WATER;
        node.intensity[2] = node.intensity[1];
        node.intensity[1] = 0.0f;
    }
    
    if (node.temperature > 0.0f && (node.states & ICE)) {
        // Ice melts to water
        node.states |= WATER;
        node.states &= ~ICE;
        node.intensity[1] = node.intensity[2];
        node.intensity[2] = 0.0f;
    }
    
    // Decay intensities over time
    for (int i = 0; i < 5; i++) {
        if (node.intensity[i] > 0.0f) {
            float decay_rate = 0.1f * dt; // Base decay rate
            
            // Different decay rates for different states
            switch (1 << i) {
                case FIRE:
                    decay_rate = 0.05f * dt; // Fire decays slowly
                    break;
                case WATER:
                    decay_rate = 0.02f * dt; // Water evaporates slowly
                    break;
                case ELECTRIC:
                    decay_rate = 0.5f * dt;  // Electricity dissipates quickly
                    break;
                case WIND:
                    decay_rate = 0.3f * dt;  // Wind dies down
                    break;
            }
            
            node.intensity[i] -= decay_rate;
            if (node.intensity[i] <= 0.0f) {
                node.intensity[i] = 0.0f;
                node.states &= ~(1 << i);
            }
        }
    }
    
    // Temperature equilibrium with environment
    float temp_diff = g_chemistry_system.world_temperature - node.temperature;
    node.temperature += temp_diff * 0.1f * dt;
    
    // Update active node count
    bool is_active = (node.states != NEUTRAL);
    if (was_active && !is_active) {
        g_chemistry_system.active_nodes--;
    } else if (!was_active && is_active) {
        g_chemistry_system.active_nodes++;
    }
}

// Propagate effects to neighboring nodes
void propagate_chemistry_effects(ChemicalNode& node, float dt) {
    // Fire propagation
    if (node.states & FIRE) {
        for (uint32_t i = 0; i < node.neighbor_count; i++) {
            uint32_t neighbor_idx = node.neighbors[i];
            int nx = neighbor_idx % CHEMISTRY_GRID_SIZE;
            int ny = neighbor_idx / CHEMISTRY_GRID_SIZE;
            ChemicalNode& neighbor = g_chemistry_system.grid[nx][ny];
            
            // Check if fire can spread to neighbor
            if (neighbor.fuel_remaining > 0.0f && neighbor.flammability > 0.0f) {
                float distance = (neighbor.position - node.position).length();
                if (distance < FIRE_SPREAD_RADIUS) {
                    float spread_chance = node.intensity[0] * neighbor.flammability * dt;
                    
                    // Wind enhances fire spread in wind direction
                    if (g_chemistry_system.wind_velocity.length() > 0.1f) {
                        Vector3 wind_dir = g_chemistry_system.wind_velocity.normalized();
                        Vector3 spread_dir = (neighbor.position - node.position).normalized();
                        float wind_factor = wind_dir.dot(spread_dir);
                        if (wind_factor > 0.0f) {
                            spread_chance *= (1.0f + wind_factor * 2.0f);
                        }
                    }
                    
                    if (spread_chance > 0.1f) { // Threshold for ignition
                        neighbor.states |= FIRE;
                        neighbor.intensity[0] = 0.3f; // Start with lower intensity
                        neighbor.temperature += 50.0f;
                    }
                }
            }
        }
    }
    
    // Electric arc propagation
    if (node.states & ELECTRIC) {
        for (uint32_t i = 0; i < node.neighbor_count; i++) {
            uint32_t neighbor_idx = node.neighbors[i];
            int nx = neighbor_idx % CHEMISTRY_GRID_SIZE;
            int ny = neighbor_idx / CHEMISTRY_GRID_SIZE;
            ChemicalNode& neighbor = g_chemistry_system.grid[nx][ny];
            
            // Electricity conducts through conductive materials
            if (neighbor.conductivity > 0.3f) {
                float distance = (neighbor.position - node.position).length();
                if (distance < ELECTRIC_ARC_RADIUS) {
                    float arc_strength = node.intensity[3] * neighbor.conductivity * dt;
                    
                    neighbor.states |= ELECTRIC;
                    neighbor.intensity[3] += arc_strength * 0.8f; // Reduced intensity
                    if (neighbor.intensity[3] > 1.0f) neighbor.intensity[3] = 1.0f;
                }
            }
        }
    }
    
    // Wind effect propagation
    if (node.states & WIND) {
        for (uint32_t i = 0; i < node.neighbor_count; i++) {
            uint32_t neighbor_idx = node.neighbors[i];
            int nx = neighbor_idx % CHEMISTRY_GRID_SIZE;
            int ny = neighbor_idx / CHEMISTRY_GRID_SIZE;
            ChemicalNode& neighbor = g_chemistry_system.grid[nx][ny];
            
            float distance = (neighbor.position - node.position).length();
            if (distance < WIND_EFFECT_RADIUS) {
                // Wind fans flames
                if (neighbor.states & FIRE) {
                    neighbor.intensity[0] += node.intensity[4] * 0.5f * dt;
                    if (neighbor.intensity[0] > 1.0f) neighbor.intensity[0] = 1.0f;
                }
            }
        }
    }
}

// Update entire chemistry system
void update_chemistry_system(float dt) {
    g_chemistry_system.reactions_this_frame = 0;
    
    // Update all nodes
    for (int x = 0; x < CHEMISTRY_GRID_SIZE; x++) {
        for (int y = 0; y < CHEMISTRY_GRID_SIZE; y++) {
            update_chemistry_node(g_chemistry_system.grid[x][y], dt);
        }
    }
    
    // Propagate effects (separate pass to avoid interference)
    for (int x = 0; x < CHEMISTRY_GRID_SIZE; x++) {
        for (int y = 0; y < CHEMISTRY_GRID_SIZE; y++) {
            ChemicalNode& node = g_chemistry_system.grid[x][y];
            if (node.states != NEUTRAL) {
                propagate_chemistry_effects(node, dt);
            }
        }
    }
}

// ============================================================================
// WASM Export Functions
// ============================================================================

extern "C" {
    // Chemistry system management
    void chemistry_system_init() {
        g_chemistry_system = ChemistrySystem();
        initialize_chemistry_grid();
    }
    
    void chemistry_system_update(float dt) {
        update_chemistry_system(dt);
    }
    
    // State manipulation
    void set_chemistry_state(float x, float y, uint32_t states, float intensity) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        if (node) {
            node->states |= states;
            
            // Set intensities for each state
            if (states & FIRE) node->intensity[0] = intensity;
            if (states & WATER) node->intensity[1] = intensity;
            if (states & ICE) node->intensity[2] = intensity;
            if (states & ELECTRIC) node->intensity[3] = intensity;
            if (states & WIND) node->intensity[4] = intensity;
        }
    }
    
    void clear_chemistry_state(float x, float y, uint32_t states) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        if (node) {
            node->states &= ~states;
            
            // Clear intensities for removed states
            if (states & FIRE) node->intensity[0] = 0.0f;
            if (states & WATER) node->intensity[1] = 0.0f;
            if (states & ICE) node->intensity[2] = 0.0f;
            if (states & ELECTRIC) node->intensity[3] = 0.0f;
            if (states & WIND) node->intensity[4] = 0.0f;
        }
    }
    
    // State queries
    uint32_t get_chemistry_state(float x, float y) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        return node ? node->states : NEUTRAL;
    }
    
    float get_chemistry_intensity(float x, float y, uint32_t state) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        if (!node) return 0.0f;
        
        switch (state) {
            case FIRE: return node->intensity[0];
            case WATER: return node->intensity[1];
            case ICE: return node->intensity[2];
            case ELECTRIC: return node->intensity[3];
            case WIND: return node->intensity[4];
            default: return 0.0f;
        }
    }
    
    float get_chemistry_temperature(float x, float y) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        return node ? node->temperature : g_chemistry_system.world_temperature;
    }
    
    float get_chemistry_fuel(float x, float y) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        return node ? node->fuel_remaining : 0.0f;
    }
    
    // Material properties
    void set_material_tags(float x, float y, uint32_t tags) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        if (node) {
            node->material_tags = tags;
            
            // Update properties based on material
            if (tags & METAL) {
                node->conductivity = 0.9f;
                node->flammability = 0.0f;
            } else if (tags & WOOD) {
                node->conductivity = 0.1f;
                node->flammability = 0.7f;
                node->fuel_remaining = 150.0f;
            } else if (tags & STONE) {
                node->conductivity = 0.05f;
                node->flammability = 0.0f;
            }
        }
    }
    
    uint32_t get_material_tags(float x, float y) {
        ChemicalNode* node = get_node_at_position(Vector3(x, y, 0));
        return node ? node->material_tags : 0;
    }
    
    // Environmental controls
    void set_world_temperature(float temperature) {
        g_chemistry_system.world_temperature = temperature;
    }
    
    void set_world_humidity(float humidity) {
        g_chemistry_system.world_humidity = humidity;
    }
    
    void set_chemistry_wind(float vx, float vy, float vz) {
        g_chemistry_system.wind_velocity = Vector3(vx, vy, vz);
    }
    
    // System queries
    uint32_t get_active_chemistry_nodes() {
        return g_chemistry_system.active_nodes;
    }
    
    uint32_t get_chemistry_reactions_per_frame() {
        return g_chemistry_system.reactions_this_frame;
    }
    
    // Utility functions
    void ignite_area(float x, float y, float radius, float intensity) {
        Vector3 center(x, y, 0);
        
        for (int gx = 0; gx < CHEMISTRY_GRID_SIZE; gx++) {
            for (int gy = 0; gy < CHEMISTRY_GRID_SIZE; gy++) {
                ChemicalNode& node = g_chemistry_system.grid[gx][gy];
                float distance = (node.position - center).length();
                
                if (distance < radius && node.fuel_remaining > 0.0f) {
                    float falloff = 1.0f - (distance / radius);
                    node.states |= FIRE;
                    node.intensity[0] = intensity * falloff;
                    node.temperature += 100.0f * falloff;
                }
            }
        }
    }
    
    void electrify_area(float x, float y, float radius, float intensity) {
        Vector3 center(x, y, 0);
        
        for (int gx = 0; gx < CHEMISTRY_GRID_SIZE; gx++) {
            for (int gy = 0; gy < CHEMISTRY_GRID_SIZE; gy++) {
                ChemicalNode& node = g_chemistry_system.grid[gx][gy];
                float distance = (node.position - center).length();
                
                if (distance < radius && node.conductivity > 0.1f) {
                    float falloff = 1.0f - (distance / radius);
                    node.states |= ELECTRIC;
                    node.intensity[3] = intensity * falloff;
                }
            }
        }
    }
    
    void douse_area(float x, float y, float radius, float intensity) {
        Vector3 center(x, y, 0);
        
        for (int gx = 0; gx < CHEMISTRY_GRID_SIZE; gx++) {
            for (int gy = 0; gy < CHEMISTRY_GRID_SIZE; gy++) {
                ChemicalNode& node = g_chemistry_system.grid[gx][gy];
                float distance = (node.position - center).length();
                
                if (distance < radius) {
                    float falloff = 1.0f - (distance / radius);
                    node.states |= WATER;
                    node.intensity[1] = intensity * falloff;
                    node.temperature -= 50.0f * falloff;
                    
                    // Extinguish fire
                    if (node.states & FIRE) {
                        node.intensity[0] -= intensity * falloff;
                        if (node.intensity[0] <= 0.0f) {
                            node.states &= ~FIRE;
                            node.intensity[0] = 0.0f;
                        }
                    }
                }
            }
        }
    }
}
