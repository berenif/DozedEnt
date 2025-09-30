#pragma once

#include "physics_backbone.h"
#include <cmath>

// ============================================================================
// Constraint Logic System - WASM Implementation
// Handles joint systems, structural stability, and constraint solving
// Based on CORE_WORLD_SIMULATION.MD specifications
// ============================================================================

// Forward declarations
void trigger_cascading_failure(uint32_t failed_node_id);

// ============================================================================
// Constraint Data Structures
// ============================================================================

enum ConstraintType {
    HINGE_JOINT,      // Door hinges, wheels - rotation around one axis
    BALL_JOINT,       // Shoulder joints, chains - rotation around point
    SLIDER_JOINT,     // Pistons, drawers - translation along one axis
    FIXED_JOINT,      // Welds, glue - no relative motion
    CONTACT_PAIR,     // Temporary surface contact
    ROPE_CONSTRAINT,  // Rope/cable connections
    SPRING_JOINT      // Spring-damper connections
};

struct Constraint {
    ConstraintType type;
    uint32_t body_a;
    uint32_t body_b;
    
    Vector3 anchor_a;         // Local anchor point on body A
    Vector3 anchor_b;         // Local anchor point on body B
    Vector3 axis;             // Constraint axis (for hinge/slider)
    
    float max_force;          // Maximum force before breaking
    float break_threshold;    // Force threshold for constraint failure
    bool is_broken;           // Whether constraint has failed
    
    // Joint limits
    float min_limit;          // Minimum angle/distance
    float max_limit;          // Maximum angle/distance
    float current_value;      // Current angle/distance
    
    // Spring/damping properties
    float spring_constant;    // Spring stiffness
    float damping_constant;   // Damping coefficient
    float rest_length;        // Rest length for springs/ropes
    
    // Motor properties (for powered joints)
    bool has_motor;
    float motor_speed;        // Target speed
    float motor_force;        // Maximum motor force
    
    Constraint() : 
        type(FIXED_JOINT), body_a(0xFFFFFFFF), body_b(0xFFFFFFFF),
        anchor_a(0, 0, 0), anchor_b(0, 0, 0), axis(1, 0, 0),
        max_force(1000.0f), break_threshold(800.0f), is_broken(false),
        min_limit(-3.14159f), max_limit(3.14159f), current_value(0.0f),
        spring_constant(100.0f), damping_constant(10.0f), rest_length(1.0f),
        has_motor(false), motor_speed(0.0f), motor_force(100.0f) {}
};

// Structural analysis for load paths and stability
struct StructuralNode {
    uint32_t body_id;
    Vector3 position;
    float load_capacity;      // Maximum load this node can handle
    float current_load;       // Current load on this node
    uint32_t connected_constraints[8];
    uint32_t connection_count;
    bool is_critical;         // Critical structural element
    
    StructuralNode() : 
        body_id(0xFFFFFFFF), position(0, 0, 0), load_capacity(1000.0f), 
        current_load(0.0f), connection_count(0), is_critical(false) {
        for (int i = 0; i < 8; i++) {
            connected_constraints[i] = 0xFFFFFFFF;
        }
    }
};

// Load path tracking for structural analysis
struct LoadPath {
    uint32_t nodes[16];       // Chain of structural nodes
    uint32_t node_count;
    float total_load;
    float weakest_capacity;
    uint32_t weakest_node;
    
    LoadPath() : node_count(0), total_load(0.0f), weakest_capacity(1000.0f), weakest_node(0xFFFFFFFF) {
        for (int i = 0; i < 16; i++) {
            nodes[i] = 0xFFFFFFFF;
        }
    }
};

// ============================================================================
// Constraint System State
// ============================================================================

const int MAX_CONSTRAINTS = 256;
const int MAX_STRUCTURAL_NODES = 128;
const int MAX_LOAD_PATHS = 64;

struct ConstraintSystem {
    Constraint constraints[MAX_CONSTRAINTS];
    StructuralNode structural_nodes[MAX_STRUCTURAL_NODES];
    LoadPath load_paths[MAX_LOAD_PATHS];
    
    uint32_t constraint_count;
    uint32_t node_count;
    uint32_t path_count;
    
    float structural_integrity;  // Overall system integrity (0.0 to 1.0)
    uint32_t failure_cascade_count; // Number of cascading failures this frame
    
    ConstraintSystem() : 
        constraint_count(0), node_count(0), path_count(0),
        structural_integrity(1.0f), failure_cascade_count(0) {}
};

static ConstraintSystem g_constraint_system;

// ============================================================================
// Constraint Functions
// ============================================================================

// Create a constraint between two rigid bodies
uint32_t create_constraint(ConstraintType type, uint32_t body_a, uint32_t body_b,
                          const Vector3& anchor_a, const Vector3& anchor_b) {
    if (g_constraint_system.constraint_count >= MAX_CONSTRAINTS) {
        return 0xFFFFFFFF;
    }
    
    if (body_a >= g_physics_world.body_count || body_b >= g_physics_world.body_count) {
        return 0xFFFFFFFF;
    }
    
    uint32_t constraint_id = g_constraint_system.constraint_count++;
    Constraint& constraint = g_constraint_system.constraints[constraint_id];
    
    constraint.type = type;
    constraint.body_a = body_a;
    constraint.body_b = body_b;
    constraint.anchor_a = anchor_a;
    constraint.anchor_b = anchor_b;
    
    // Set default properties based on constraint type
    switch (type) {
        case HINGE_JOINT:
            constraint.axis = Vector3(0, 0, 1); // Default Z-axis rotation
            constraint.min_limit = -3.14159f;
            constraint.max_limit = 3.14159f;
            break;
            
        case BALL_JOINT:
            constraint.max_force = 500.0f;
            break;
            
        case SLIDER_JOINT:
            constraint.axis = Vector3(1, 0, 0); // Default X-axis translation
            constraint.min_limit = -1.0f;
            constraint.max_limit = 1.0f;
            break;
            
        case ROPE_CONSTRAINT:
            constraint.rest_length = (anchor_b - anchor_a).length();
            constraint.spring_constant = 50.0f;
            constraint.max_force = 200.0f;
            break;
            
        case SPRING_JOINT:
            constraint.rest_length = (anchor_b - anchor_a).length();
            constraint.spring_constant = 100.0f;
            constraint.damping_constant = 20.0f;
            break;
            
        default:
            break;
    }
    
    return constraint_id;
}

// Solve constraint and apply corrective forces
void solve_constraint(Constraint& constraint, float dt) {
    if (constraint.is_broken) return;
    
    if (constraint.body_a >= g_physics_world.body_count || 
        constraint.body_b >= g_physics_world.body_count) {
        return;
    }
    
    RigidBody& body_a = g_physics_world.bodies[constraint.body_a];
    RigidBody& body_b = g_physics_world.bodies[constraint.body_b];
    
    // Skip if both bodies are static
    if ((body_a.is_static || body_a.is_kinematic) && 
        (body_b.is_static || body_b.is_kinematic)) {
        return;
    }
    
    // Calculate world positions of anchor points
    Vector3 world_anchor_a = body_a.position + constraint.anchor_a;
    Vector3 world_anchor_b = body_b.position + constraint.anchor_b;
    
    Vector3 delta = world_anchor_b - world_anchor_a;
    float distance = delta.length();
    
    switch (constraint.type) {
        case FIXED_JOINT: {
            // Maintain fixed distance and orientation
            if (distance > 0.001f) {
                Vector3 correction = delta * 0.5f;
                
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.position += correction;
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.position -= correction;
                }
                
                // Apply corrective impulse
                Vector3 impulse = delta.normalized() * (distance * 100.0f * dt);
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.apply_impulse(impulse);
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.apply_impulse(-impulse);
                }
            }
            break;
        }
        
        case ROPE_CONSTRAINT: {
            // Rope can only pull, not push
            if (distance > constraint.rest_length) {
                float extension = distance - constraint.rest_length;
                Vector3 direction = delta.normalized();
                
                // Spring force
                float spring_force = constraint.spring_constant * extension;
                Vector3 force = direction * spring_force;
                
                // Damping force
                Vector3 relative_velocity = body_b.velocity - body_a.velocity;
                float velocity_along_rope = relative_velocity.dot(direction);
                Vector3 damping_force = direction * (constraint.damping_constant * velocity_along_rope);
                
                Vector3 total_force = force + damping_force;
                
                // Check if force exceeds break threshold
                if (total_force.length() > constraint.break_threshold) {
                    constraint.is_broken = true;
                    return;
                }
                
                // Apply forces
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.apply_force(total_force);
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.apply_force(-total_force);
                }
            }
            break;
        }
        
        case SPRING_JOINT: {
            // Spring can push and pull
            float extension = distance - constraint.rest_length;
            Vector3 direction = (distance > 0.001f) ? delta.normalized() : Vector3(1, 0, 0);
            
            // Spring force
            float spring_force = constraint.spring_constant * extension;
            Vector3 force = direction * spring_force;
            
            // Damping force
            Vector3 relative_velocity = body_b.velocity - body_a.velocity;
            float velocity_along_spring = relative_velocity.dot(direction);
            Vector3 damping_force = direction * (constraint.damping_constant * velocity_along_spring);
            
            Vector3 total_force = force + damping_force;
            
            // Apply forces
            if (!body_a.is_static && !body_a.is_kinematic) {
                body_a.apply_force(total_force);
            }
            if (!body_b.is_static && !body_b.is_kinematic) {
                body_b.apply_force(-total_force);
            }
            break;
        }
        
        case HINGE_JOINT: {
            // Maintain position constraint, allow rotation around axis
            if (distance > 0.001f) {
                Vector3 correction = delta * 0.5f;
                
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.position += correction;
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.position -= correction;
                }
                
                // Apply motor torque if enabled
                if (constraint.has_motor) {
                    // Simplified motor implementation
                    Vector3 torque = constraint.axis * constraint.motor_force * constraint.motor_speed * dt;
                    // Apply torque to bodies (simplified - would need proper angular dynamics)
                }
            }
            break;
        }
        
        case BALL_JOINT: {
            // Maintain position constraint, allow free rotation
            if (distance > 0.001f) {
                Vector3 correction = delta * 0.5f;
                
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.position += correction;
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.position -= correction;
                }
            }
            break;
        }
        
        case SLIDER_JOINT: {
            // Allow movement only along specified axis
            Vector3 axis_world = constraint.axis.normalized();
            float projection = delta.dot(axis_world);
            
            // Constrain perpendicular movement
            Vector3 perpendicular = delta - axis_world * projection;
            if (perpendicular.length() > 0.001f) {
                Vector3 correction = perpendicular * 0.5f;
                
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.position += correction;
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.position -= correction;
                }
            }
            
            // Check limits
            if (projection < constraint.min_limit || projection > constraint.max_limit) {
                float limit_violation = (projection < constraint.min_limit) ? 
                    (constraint.min_limit - projection) : (projection - constraint.max_limit);
                
                Vector3 limit_correction = axis_world * limit_violation * 0.5f;
                
                if (!body_a.is_static && !body_a.is_kinematic) {
                    body_a.position += limit_correction;
                }
                if (!body_b.is_static && !body_b.is_kinematic) {
                    body_b.position -= limit_correction;
                }
            }
            break;
        }
        
        default:
            break;
    }
}

// Analyze structural integrity and load paths
void analyze_structural_integrity() {
    g_constraint_system.structural_integrity = 1.0f;
    g_constraint_system.failure_cascade_count = 0;
    
    // Reset node loads
    for (uint32_t i = 0; i < g_constraint_system.node_count; i++) {
        g_constraint_system.structural_nodes[i].current_load = 0.0f;
    }
    
    // Calculate loads on each structural node
    for (uint32_t i = 0; i < g_constraint_system.constraint_count; i++) {
        const Constraint& constraint = g_constraint_system.constraints[i];
        if (constraint.is_broken) continue;
        
        // Calculate constraint force
        if (constraint.body_a < g_physics_world.body_count && 
            constraint.body_b < g_physics_world.body_count) {
            
            const RigidBody& body_a = g_physics_world.bodies[constraint.body_a];
            const RigidBody& body_b = g_physics_world.bodies[constraint.body_b];
            
            Vector3 world_anchor_a = body_a.position + constraint.anchor_a;
            Vector3 world_anchor_b = body_b.position + constraint.anchor_b;
            Vector3 force_vector = world_anchor_b - world_anchor_a;
            float force_magnitude = force_vector.length() * constraint.spring_constant;
            
            // Find corresponding structural nodes and add load
            for (uint32_t j = 0; j < g_constraint_system.node_count; j++) {
                StructuralNode& node = g_constraint_system.structural_nodes[j];
                if (node.body_id == constraint.body_a || node.body_id == constraint.body_b) {
                    node.current_load += force_magnitude;
                }
            }
        }
    }
    
    // Check for overloaded nodes and potential failures
    for (uint32_t i = 0; i < g_constraint_system.node_count; i++) {
        StructuralNode& node = g_constraint_system.structural_nodes[i];
        
        if (node.current_load > node.load_capacity) {
            // Node is overloaded - reduce structural integrity
            float overload_ratio = node.current_load / node.load_capacity;
            float integrity_reduction = (overload_ratio - 1.0f) * 0.1f;
            g_constraint_system.structural_integrity -= integrity_reduction;
            
            // If critical node fails, cause cascading failure
            if (node.is_critical && overload_ratio > 1.5f) {
                trigger_cascading_failure(i);
            }
        }
    }
    
    // Clamp structural integrity
    if (g_constraint_system.structural_integrity < 0.0f) {
        g_constraint_system.structural_integrity = 0.0f;
    }
}

// Trigger cascading structural failure
void trigger_cascading_failure(uint32_t failed_node_id) {
    if (failed_node_id >= g_constraint_system.node_count) return;
    
    StructuralNode& failed_node = g_constraint_system.structural_nodes[failed_node_id];
    g_constraint_system.failure_cascade_count++;
    
    // Break all constraints connected to this node
    for (uint32_t i = 0; i < failed_node.connection_count; i++) {
        uint32_t constraint_id = failed_node.connected_constraints[i];
        if (constraint_id < g_constraint_system.constraint_count) {
            g_constraint_system.constraints[constraint_id].is_broken = true;
        }
    }
    
    // Redistribute load to neighboring nodes
    for (uint32_t i = 0; i < failed_node.connection_count; i++) {
        uint32_t constraint_id = failed_node.connected_constraints[i];
        if (constraint_id >= g_constraint_system.constraint_count) continue;
        
        const Constraint& constraint = g_constraint_system.constraints[constraint_id];
        uint32_t other_body = (constraint.body_a == failed_node.body_id) ? 
                              constraint.body_b : constraint.body_a;
        
        // Find the structural node for the other body
        for (uint32_t j = 0; j < g_constraint_system.node_count; j++) {
            if (g_constraint_system.structural_nodes[j].body_id == other_body) {
                // Add redistributed load
                g_constraint_system.structural_nodes[j].current_load += 
                    failed_node.current_load / failed_node.connection_count;
                break;
            }
        }
    }
}

// Update constraint system
void update_constraint_system(float dt) {
    // Solve all constraints
    for (uint32_t i = 0; i < g_constraint_system.constraint_count; i++) {
        solve_constraint(g_constraint_system.constraints[i], dt);
    }
    
    // Analyze structural integrity
    analyze_structural_integrity();
}

// ============================================================================
// WASM Export Functions
// ============================================================================

extern "C" {
    // Constraint system management
    void constraint_system_init() {
        g_constraint_system = ConstraintSystem();
    }
    
    void constraint_system_update(float dt) {
        update_constraint_system(dt);
    }
    
    // Constraint creation
    uint32_t create_hinge_joint(uint32_t body_a, uint32_t body_b, 
                               float anchor_a_x, float anchor_a_y, float anchor_a_z,
                               float anchor_b_x, float anchor_b_y, float anchor_b_z,
                               float axis_x, float axis_y, float axis_z) {
        uint32_t constraint_id = create_constraint(HINGE_JOINT, body_a, body_b,
            Vector3(anchor_a_x, anchor_a_y, anchor_a_z),
            Vector3(anchor_b_x, anchor_b_y, anchor_b_z));
        
        if (constraint_id != 0xFFFFFFFF) {
            g_constraint_system.constraints[constraint_id].axis = Vector3(axis_x, axis_y, axis_z).normalized();
        }
        
        return constraint_id;
    }
    
    uint32_t create_ball_joint(uint32_t body_a, uint32_t body_b,
                              float anchor_a_x, float anchor_a_y, float anchor_a_z,
                              float anchor_b_x, float anchor_b_y, float anchor_b_z) {
        return create_constraint(BALL_JOINT, body_a, body_b,
            Vector3(anchor_a_x, anchor_a_y, anchor_a_z),
            Vector3(anchor_b_x, anchor_b_y, anchor_b_z));
    }
    
    uint32_t create_slider_joint(uint32_t body_a, uint32_t body_b,
                                float anchor_a_x, float anchor_a_y, float anchor_a_z,
                                float anchor_b_x, float anchor_b_y, float anchor_b_z,
                                float axis_x, float axis_y, float axis_z) {
        uint32_t constraint_id = create_constraint(SLIDER_JOINT, body_a, body_b,
            Vector3(anchor_a_x, anchor_a_y, anchor_a_z),
            Vector3(anchor_b_x, anchor_b_y, anchor_b_z));
        
        if (constraint_id != 0xFFFFFFFF) {
            g_constraint_system.constraints[constraint_id].axis = Vector3(axis_x, axis_y, axis_z).normalized();
        }
        
        return constraint_id;
    }
    
    uint32_t create_rope_constraint(uint32_t body_a, uint32_t body_b,
                                   float anchor_a_x, float anchor_a_y, float anchor_a_z,
                                   float anchor_b_x, float anchor_b_y, float anchor_b_z,
                                   float max_length) {
        uint32_t constraint_id = create_constraint(ROPE_CONSTRAINT, body_a, body_b,
            Vector3(anchor_a_x, anchor_a_y, anchor_a_z),
            Vector3(anchor_b_x, anchor_b_y, anchor_b_z));
        
        if (constraint_id != 0xFFFFFFFF) {
            g_constraint_system.constraints[constraint_id].rest_length = max_length;
        }
        
        return constraint_id;
    }
    
    uint32_t create_spring_joint(uint32_t body_a, uint32_t body_b,
                                float anchor_a_x, float anchor_a_y, float anchor_a_z,
                                float anchor_b_x, float anchor_b_y, float anchor_b_z,
                                float spring_constant, float damping_constant) {
        uint32_t constraint_id = create_constraint(SPRING_JOINT, body_a, body_b,
            Vector3(anchor_a_x, anchor_a_y, anchor_a_z),
            Vector3(anchor_b_x, anchor_b_y, anchor_b_z));
        
        if (constraint_id != 0xFFFFFFFF) {
            g_constraint_system.constraints[constraint_id].spring_constant = spring_constant;
            g_constraint_system.constraints[constraint_id].damping_constant = damping_constant;
        }
        
        return constraint_id;
    }
    
    // Constraint management
    void break_constraint(uint32_t constraint_id) {
        if (constraint_id < g_constraint_system.constraint_count) {
            g_constraint_system.constraints[constraint_id].is_broken = true;
        }
    }
    
    int is_constraint_broken(uint32_t constraint_id) {
        if (constraint_id >= g_constraint_system.constraint_count) return 1;
        return g_constraint_system.constraints[constraint_id].is_broken ? 1 : 0;
    }
    
    void set_constraint_motor(uint32_t constraint_id, float speed, float force) {
        if (constraint_id >= g_constraint_system.constraint_count) return;
        
        Constraint& constraint = g_constraint_system.constraints[constraint_id];
        constraint.has_motor = true;
        constraint.motor_speed = speed;
        constraint.motor_force = force;
    }
    
    // Structural analysis queries
    float get_structural_integrity() {
        return g_constraint_system.structural_integrity;
    }
    
    uint32_t get_constraint_count() {
        return g_constraint_system.constraint_count;
    }
    
    uint32_t get_failure_cascade_count() {
        return g_constraint_system.failure_cascade_count;
    }
    
    // Constraint queries
    uint32_t get_constraint_body_a(uint32_t constraint_id) {
        if (constraint_id >= g_constraint_system.constraint_count) return 0xFFFFFFFF;
        return g_constraint_system.constraints[constraint_id].body_a;
    }
    
    uint32_t get_constraint_body_b(uint32_t constraint_id) {
        if (constraint_id >= g_constraint_system.constraint_count) return 0xFFFFFFFF;
        return g_constraint_system.constraints[constraint_id].body_b;
    }
    
    uint32_t get_constraint_type(uint32_t constraint_id) {
        if (constraint_id >= g_constraint_system.constraint_count) return 0;
        return (uint32_t)g_constraint_system.constraints[constraint_id].type;
    }
    
    // Utility functions
    void apply_structural_stress(float x, float y, float z, float radius, float stress) {
        Vector3 center(x, y, z);
        
        // Find all constraints within radius and apply stress
        for (uint32_t i = 0; i < g_constraint_system.constraint_count; i++) {
            Constraint& constraint = g_constraint_system.constraints[i];
            if (constraint.is_broken) continue;
            
            if (constraint.body_a < g_physics_world.body_count && 
                constraint.body_b < g_physics_world.body_count) {
                
                const RigidBody& body_a = g_physics_world.bodies[constraint.body_a];
                const RigidBody& body_b = g_physics_world.bodies[constraint.body_b];
                
                Vector3 constraint_center = (body_a.position + body_b.position) * 0.5f;
                float distance = (constraint_center - center).length();
                
                if (distance < radius) {
                    float falloff = 1.0f - (distance / radius);
                    float applied_stress = stress * falloff;
                    
                    // Reduce constraint strength
                    constraint.break_threshold -= applied_stress;
                    if (constraint.break_threshold < 0.0f) {
                        constraint.is_broken = true;
                        g_constraint_system.failure_cascade_count++;
                    }
                }
            }
        }
    }
}
