#pragma once
#include "PhysicsTypes.h"
#include <vector>
#include "constraints/DistanceConstraint.h"
#include "constraints/DistanceRangeConstraint.h"
class SpatialHash;
class ForceFieldManager;

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
    ~PhysicsManager();
    
    // Lifecycle
    void initialize(const PhysicsConfig& config);
    void reset();
    
    // Main update (called every frame with variable dt)
    void update(float delta_time);
    
    // Body management
    uint32_t create_body(const RigidBody& body);
    uint32_t create_wolf_body(float x, float y, float radius = 0.04f);
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
    void detect_and_resolve_collisions();
    void solve_constraints(int iterations);
    
    // Utility
    uint32_t generate_body_id() { 
        return next_body_id_++; 
    }
    
    RigidBody* find_body(uint32_t id);
    const RigidBody* find_body(uint32_t id) const;

    // Optional systems (declared in cpp to keep header light)
    SpatialHash* spatial_hash_ = nullptr;
    ForceFieldManager* force_field_mgr_ = nullptr;
    bool use_broadphase_ = false;
    // Perf counters
    uint32_t pairs_checked_ = 0;
    uint32_t collisions_resolved_ = 0;
    // Constraints
    std::vector<DistanceConstraint> distance_constraints_;
    std::vector<DistanceRangeConstraint> range_constraints_;
public:
    // Toggle/configure optional systems
    void enable_broadphase(bool on) { use_broadphase_ = on; }
    uint32_t get_pairs_checked() const { return pairs_checked_; }
    uint32_t get_collisions_resolved() const { return collisions_resolved_; }
    // Constraints API
    void clear_constraints() { distance_constraints_.clear(); range_constraints_.clear(); }
    void add_distance_constraint(const DistanceConstraint& c) { distance_constraints_.push_back(c); }
    void add_range_constraint(const DistanceRangeConstraint& c) { range_constraints_.push_back(c); }
};


