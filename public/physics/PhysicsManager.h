#pragma once
#include "PhysicsTypes.h"
#include <vector>

/**
 * PhysicsManager - Manages physics simulation with fixed-point determinism
 * 
 * Responsibilities:
 * - Update rigid bodies using deterministic fixed-point math
 * - Apply forces and impulses to bodies
 * - Handle world bounds and simple collisions
 * - Use integer tick counting for perfect determinism
 */
class PhysicsManager {
public:
    PhysicsManager();
    ~PhysicsManager() = default;
    
    // Lifecycle
    void initialize(const PhysicsConfig& config);
    void reset();
    
    // Main update (called every frame with variable dt)
    void update(float delta_time);
    
    // Body management
    uint32_t create_body(const RigidBody& body);
    void destroy_body(uint32_t id);
    RigidBody* get_body(uint32_t id);
    const RigidBody* get_body(uint32_t id) const;
    
    // Force/impulse application
    void apply_impulse(uint32_t body_id, const FixedVector3& impulse);
    void apply_force(uint32_t body_id, const FixedVector3& force);
    void set_velocity(uint32_t body_id, const FixedVector3& velocity);
    void set_position(uint32_t body_id, const FixedVector3& position);
    
    // State queries
    int get_body_count() const { 
        return static_cast<int>(bodies_.size()); 
    }
    
    const PhysicsConfig& get_config() const { 
        return config_; 
    }
    
    float get_last_step_time_ms() const { 
        return last_step_time_ms_; 
    }
    
    int32_t get_tick_accumulator() const {
        return tick_accumulator_;
    }

private:
    // Configuration
    PhysicsConfig config_;
    
    // Bodies
    std::vector<RigidBody> bodies_;
    uint32_t next_body_id_;
    
    // Timing (using integer microseconds for determinism)
    int32_t tick_accumulator_;  // Accumulated time in microseconds
    float last_step_time_ms_;   // Performance tracking only (not deterministic)
    
    // Physics simulation
    void step(Fixed dt);
    void integrate_forces(Fixed dt);
    void apply_world_bounds(RigidBody& body);
    void update_sleeping_bodies(int32_t timestep_micros);
    
    // Utility
    uint32_t generate_body_id() { 
        return next_body_id_++; 
    }
    
    RigidBody* find_body(uint32_t id);
    const RigidBody* find_body(uint32_t id) const;
};


