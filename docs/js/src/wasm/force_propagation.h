#pragma once

#include "physics_backbone.h"
#include <cmath>

// ============================================================================
// Force Propagation System - WASM Implementation
// Handles impulse chains, explosion mechanics, and momentum conservation
// Based on CORE_WORLD_SIMULATION.MD specifications
// ============================================================================

// ============================================================================
// Force Propagation Data Structures
// ============================================================================

struct ForceNode {
    Vector3 accumulated_force;
    uint32_t connected_bodies[8];  // Connected rigid body IDs
    float transmission_efficiency[8];  // 0.0 to 1.0 for each connection
    uint32_t connection_count;
    
    ForceNode() : accumulated_force(0, 0, 0), connection_count(0) {
        for (int i = 0; i < 8; i++) {
            connected_bodies[i] = 0xFFFFFFFF;
            transmission_efficiency[i] = 1.0f;
        }
    }
    
    void add_connection(uint32_t body_id, float efficiency) {
        if (connection_count < 8) {
            connected_bodies[connection_count] = body_id;
            transmission_efficiency[connection_count] = efficiency;
            connection_count++;
        }
    }
    
    void propagate_impulse(const Vector3& impulse, float dt) {
        for (uint32_t i = 0; i < connection_count; i++) {
            uint32_t body_id = connected_bodies[i];
            if (body_id != 0xFFFFFFFF && body_id < g_physics_world.body_count) {
                Vector3 transmitted = impulse * transmission_efficiency[i];
                g_physics_world.bodies[body_id].apply_impulse(transmitted);
            }
        }
    }
};

// Explosion system
struct Explosion {
    Vector3 origin;
    float max_radius;
    float max_force;
    float current_radius;
    float expansion_speed;
    bool active;
    float start_time;
    
    Explosion() : origin(0, 0, 0), max_radius(0), max_force(0), 
                  current_radius(0), expansion_speed(0), active(false), start_time(0) {}
                  
    Explosion(const Vector3& pos, float radius, float force, float speed) :
        origin(pos), max_radius(radius), max_force(force), 
        current_radius(0), expansion_speed(speed), active(true), start_time(0) {}
};

// Momentum transfer tracking
struct MomentumTransfer {
    uint32_t from_body;
    uint32_t to_body;
    Vector3 impulse;
    float transfer_efficiency;
    
    MomentumTransfer() : from_body(0xFFFFFFFF), to_body(0xFFFFFFFF), 
                        impulse(0, 0, 0), transfer_efficiency(1.0f) {}
};

// ============================================================================
// Force Propagation System State
// ============================================================================

const int MAX_FORCE_NODES = 128;
const int MAX_EXPLOSIONS = 16;
const int MAX_MOMENTUM_TRANSFERS = 64;

struct ForcePropagationSystem {
    ForceNode force_nodes[MAX_FORCE_NODES];
    Explosion explosions[MAX_EXPLOSIONS];
    MomentumTransfer momentum_transfers[MAX_MOMENTUM_TRANSFERS];
    
    uint32_t node_count;
    uint32_t explosion_count;
    uint32_t transfer_count;
    
    float current_time;
    
    ForcePropagationSystem() : node_count(0), explosion_count(0), 
                              transfer_count(0), current_time(0.0f) {}
};

static ForcePropagationSystem g_force_system;

// ============================================================================
// Force Propagation Functions
// ============================================================================

// Create a force node that can propagate impulses
uint32_t create_force_node(const Vector3& position) {
    if (g_force_system.node_count >= MAX_FORCE_NODES) {
        return 0xFFFFFFFF;
    }
    
    uint32_t node_id = g_force_system.node_count++;
    g_force_system.force_nodes[node_id] = ForceNode();
    
    return node_id;
}

// Connect two force nodes for impulse propagation
void connect_force_nodes(uint32_t node_a, uint32_t node_b, float efficiency) {
    if (node_a >= g_force_system.node_count || node_b >= g_force_system.node_count) {
        return;
    }
    
    // Add bidirectional connection
    g_force_system.force_nodes[node_a].add_connection(node_b, efficiency);
    g_force_system.force_nodes[node_b].add_connection(node_a, efficiency);
}

// Create an explosion at a specific location
uint32_t create_explosion(float x, float y, float z, float radius, float force, float speed) {
    if (g_force_system.explosion_count >= MAX_EXPLOSIONS) {
        return 0xFFFFFFFF;
    }
    
    uint32_t explosion_id = g_force_system.explosion_count++;
    g_force_system.explosions[explosion_id] = Explosion(
        Vector3(x, y, z), radius, force, speed
    );
    g_force_system.explosions[explosion_id].start_time = g_force_system.current_time;
    
    return explosion_id;
}

// Check line of sight for explosion effects
bool has_line_of_sight(const Vector3& from, const Vector3& to) {
    // Simple implementation - check for rigid body obstacles
    Vector3 direction = (to - from).normalized();
    float distance = (to - from).length();
    
    const float step_size = 0.1f;
    float current_distance = 0.0f;
    
    while (current_distance < distance) {
        Vector3 test_pos = from + direction * current_distance;
        
        // Check if any rigid body blocks the line of sight
        for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
            const RigidBody& body = g_physics_world.bodies[i];
            if (body.is_static && body.mass <= 0.0f) continue; // Skip destroyed bodies
            
            Vector3 to_body = test_pos - body.position;
            if (to_body.length() < body.radius) {
                return false; // Line of sight blocked
            }
        }
        
        current_distance += step_size;
    }
    
    return true; // Clear line of sight
}

// Apply explosion force to rigid bodies
void apply_explosion_force(const Explosion& explosion) {
    for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
        RigidBody& body = g_physics_world.bodies[i];
        if (body.is_static && body.mass <= 0.0f) continue; // Skip destroyed bodies
        
        Vector3 to_body = body.position - explosion.origin;
        float distance = to_body.length();
        
        // Check if body is within explosion radius
        if (distance > explosion.current_radius) continue;
        if (distance < 0.001f) continue; // Avoid division by zero
        
        // Check line of sight
        if (!has_line_of_sight(explosion.origin, body.position)) {
            // Reduce force for blocked objects
            distance *= 2.0f; // Effectively halve the force
        }
        
        // Calculate force based on inverse square law
        float force_magnitude = explosion.max_force / (distance * distance + 0.1f);
        
        // Apply distance falloff
        float falloff = 1.0f - (distance / explosion.current_radius);
        force_magnitude *= falloff * falloff;
        
        // Apply material response
        float material_response = 1.0f;
        if (body.material.density > 2000.0f) {
            material_response = 0.7f; // Heavy materials resist explosions
        } else if (body.material.density < 500.0f) {
            material_response = 1.3f; // Light materials are more affected
        }
        
        force_magnitude *= material_response;
        
        // Apply the impulse
        Vector3 force_direction = to_body.normalized();
        Vector3 impulse = force_direction * force_magnitude;
        
        body.apply_impulse(impulse);
        
        // Record momentum transfer for chain reactions
        if (g_force_system.transfer_count < MAX_MOMENTUM_TRANSFERS) {
            MomentumTransfer& transfer = g_force_system.momentum_transfers[g_force_system.transfer_count++];
            transfer.from_body = 0xFFFFFFFF; // Explosion source
            transfer.to_body = i;
            transfer.impulse = impulse;
            transfer.transfer_efficiency = material_response;
        }
    }
}

// Update rolling dynamics on slopes
void update_rolling_dynamics(RigidBody& body, float dt) {
    // Simple slope detection - check if body is on an inclined surface
    Vector3 ground_normal(0, 0, -1); // Assume flat ground for now
    
    // Calculate rolling force based on slope angle
    float slope_angle = acosf(-ground_normal.z); // Angle from vertical
    
    if (slope_angle > 0.1f) { // Significant slope
        Vector3 slope_direction = Vector3(ground_normal.x, ground_normal.y, 0).normalized();
        float rolling_force = body.mass * GRAVITY_ACCELERATION * sinf(slope_angle);
        
        // Apply friction
        float friction = body.material.kinetic_friction;
        rolling_force *= (1.0f - friction);
        
        if (rolling_force > 0.0f) {
            body.apply_force(slope_direction * rolling_force);
        }
    }
}

// Calculate momentum conservation in collisions
void calculate_momentum_conservation(RigidBody& body_a, RigidBody& body_b, const Vector3& collision_normal) {
    // Calculate masses
    float mass_a = body_a.mass;
    float mass_b = body_b.mass;
    float total_mass = mass_a + mass_b;
    
    if (total_mass <= 0.0f) return; // Skip if either body is static
    
    // Calculate relative velocity along collision normal
    Vector3 relative_velocity = body_b.velocity - body_a.velocity;
    float velocity_along_normal = relative_velocity.dot(collision_normal);
    
    // Don't resolve if velocities are separating
    if (velocity_along_normal > 0) return;
    
    // Calculate new velocities using conservation of momentum
    float impulse_magnitude = -2.0f * velocity_along_normal / (body_a.inv_mass + body_b.inv_mass);
    Vector3 impulse = collision_normal * impulse_magnitude;
    
    // Apply momentum conservation
    if (!body_a.is_static && !body_a.is_kinematic) {
        body_a.velocity -= impulse * body_a.inv_mass;
    }
    if (!body_b.is_static && !body_b.is_kinematic) {
        body_b.velocity += impulse * body_b.inv_mass;
    }
    
    // Record momentum transfer
    if (g_force_system.transfer_count < MAX_MOMENTUM_TRANSFERS) {
        MomentumTransfer& transfer = g_force_system.momentum_transfers[g_force_system.transfer_count++];
        transfer.from_body = 0xFFFFFFFF; // Find body A ID
        transfer.to_body = 0xFFFFFFFF;   // Find body B ID
        transfer.impulse = impulse;
        transfer.transfer_efficiency = 1.0f;
    }
}

// Update force propagation system
void update_force_propagation(float dt) {
    g_force_system.current_time += dt;
    
    // Update explosions
    for (uint32_t i = 0; i < g_force_system.explosion_count; i++) {
        Explosion& explosion = g_force_system.explosions[i];
        if (!explosion.active) continue;
        
        // Expand explosion radius
        explosion.current_radius += explosion.expansion_speed * dt;
        
        // Apply forces to bodies within current radius
        apply_explosion_force(explosion);
        
        // Deactivate explosion when it reaches max radius
        if (explosion.current_radius >= explosion.max_radius) {
            explosion.active = false;
        }
    }
    
    // Update rolling dynamics for all bodies
    for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
        RigidBody& body = g_physics_world.bodies[i];
        if (body.is_static && body.mass <= 0.0f) continue;
        
        update_rolling_dynamics(body, dt);
    }
    
    // Clear momentum transfers from previous frame
    g_force_system.transfer_count = 0;
    
    // Reset accumulated forces in force nodes
    for (uint32_t i = 0; i < g_force_system.node_count; i++) {
        g_force_system.force_nodes[i].accumulated_force = Vector3(0, 0, 0);
    }
}

// ============================================================================
// WASM Export Functions
// ============================================================================

extern "C" {
    // Force propagation system management
    void force_propagation_init() {
        g_force_system = ForcePropagationSystem();
    }
    
    void force_propagation_update(float dt) {
        update_force_propagation(dt);
    }
    
    // Force node management
    uint32_t create_force_propagation_node(float x, float y, float z) {
        return create_force_node(Vector3(x, y, z));
    }
    
    void connect_force_propagation_nodes(uint32_t node_a, uint32_t node_b, float efficiency) {
        connect_force_nodes(node_a, node_b, efficiency);
    }
    
    // Explosion management
    uint32_t create_explosion_at(float x, float y, float z, float radius, float force, float speed) {
        return create_explosion(x, y, z, radius, force, speed);
    }
    
    // Explosion queries
    uint32_t get_explosion_count() {
        return g_force_system.explosion_count;
    }
    
    int is_explosion_active(uint32_t explosion_id) {
        if (explosion_id >= g_force_system.explosion_count) return 0;
        return g_force_system.explosions[explosion_id].active ? 1 : 0;
    }
    
    float get_explosion_current_radius(uint32_t explosion_id) {
        if (explosion_id >= g_force_system.explosion_count) return 0.0f;
        return g_force_system.explosions[explosion_id].current_radius;
    }
    
    float get_explosion_x(uint32_t explosion_id) {
        if (explosion_id >= g_force_system.explosion_count) return 0.0f;
        return g_force_system.explosions[explosion_id].origin.x;
    }
    
    float get_explosion_y(uint32_t explosion_id) {
        if (explosion_id >= g_force_system.explosion_count) return 0.0f;
        return g_force_system.explosions[explosion_id].origin.y;
    }
    
    float get_explosion_z(uint32_t explosion_id) {
        if (explosion_id >= g_force_system.explosion_count) return 0.0f;
        return g_force_system.explosions[explosion_id].origin.z;
    }
    
    // Momentum transfer queries
    uint32_t get_momentum_transfer_count() {
        return g_force_system.transfer_count;
    }
    
    uint32_t get_momentum_transfer_to_body(uint32_t transfer_id) {
        if (transfer_id >= g_force_system.transfer_count) return 0xFFFFFFFF;
        return g_force_system.momentum_transfers[transfer_id].to_body;
    }
    
    float get_momentum_transfer_impulse_x(uint32_t transfer_id) {
        if (transfer_id >= g_force_system.transfer_count) return 0.0f;
        return g_force_system.momentum_transfers[transfer_id].impulse.x;
    }
    
    float get_momentum_transfer_impulse_y(uint32_t transfer_id) {
        if (transfer_id >= g_force_system.transfer_count) return 0.0f;
        return g_force_system.momentum_transfers[transfer_id].impulse.y;
    }
    
    float get_momentum_transfer_impulse_z(uint32_t transfer_id) {
        if (transfer_id >= g_force_system.transfer_count) return 0.0f;
        return g_force_system.momentum_transfers[transfer_id].impulse.z;
    }
    
    // Utility functions
    void apply_radial_impulse(float x, float y, float z, float radius, float force) {
        Vector3 center(x, y, z);
        
        for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
            RigidBody& body = g_physics_world.bodies[i];
            if (body.is_static && body.mass <= 0.0f) continue;
            
            Vector3 to_body = body.position - center;
            float distance = to_body.length();
            
            if (distance < radius && distance > 0.001f) {
                Vector3 direction = to_body.normalized();
                float falloff = 1.0f - (distance / radius);
                Vector3 impulse = direction * (force * falloff);
                body.apply_impulse(impulse);
            }
        }
    }
    
    void apply_directional_impulse(float x, float y, float z, float dx, float dy, float dz, float force) {
        Vector3 center(x, y, z);
        Vector3 direction(dx, dy, dz);
        direction = direction.normalized();
        
        // Find closest body to the center point
        float closest_distance = 1000.0f;
        uint32_t closest_body = 0xFFFFFFFF;
        
        for (uint32_t i = 0; i < g_physics_world.body_count; i++) {
            const RigidBody& body = g_physics_world.bodies[i];
            if (body.is_static && body.mass <= 0.0f) continue;
            
            float distance = (body.position - center).length();
            if (distance < closest_distance) {
                closest_distance = distance;
                closest_body = i;
            }
        }
        
        // Apply impulse to closest body
        if (closest_body != 0xFFFFFFFF) {
            Vector3 impulse = direction * force;
            g_physics_world.bodies[closest_body].apply_impulse(impulse);
        }
    }
}
