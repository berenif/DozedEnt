#pragma once
#include "../wasm/physics/PhysicsTypes.h"

/**
 * PhysicsBarrel - Throwable physics-enabled barrel entity
 * 
 * Features:
 * - Physics-driven movement (no teleporting)
 * - Momentum-based damage calculation
 * - Can be thrown by player or enemies
 * - Emergent "barrel bowling" gameplay
 * 
 * Usage:
 *   1. Spawn barrel with spawn_barrel() WASM export
 *   2. Apply impulse with throw_barrel()
 *   3. Collision system handles damage automatically
 */
class PhysicsBarrel {
public:
    PhysicsBarrel();
    ~PhysicsBarrel() = default;
    
    // Initialization
    void initialize(uint32_t physics_body_id, float x, float y, float z);
    void update(float delta_time);
    
    // Body queries
    uint32_t get_body_id() const { return body_id_; }
    bool is_active() const { return body_id_ != 0; }
    
    // Projectile state
    bool is_projectile() const { return is_projectile_; }
    void mark_as_projectile() { is_projectile_ = true; }
    void clear_projectile_flag() { is_projectile_ = false; }
    
    // Damage calculation (based on momentum)
    float calculate_impact_damage(float speed, float mass) const;
    float calculate_knockback_force(float speed, float mass) const;
    
    // Lifetime management
    float get_lifetime() const { return lifetime_; }
    bool should_despawn() const;
    
    // Physics constants
    static constexpr float BARREL_MASS = 20.0f;  // kg
    static constexpr float BARREL_RADIUS = 0.5f;  // World units
    static constexpr float DAMAGE_MULTIPLIER = 0.5f;  // damage = mass * speed * 0.5
    static constexpr float KNOCKBACK_MULTIPLIER = 0.3f;
    static constexpr float MAX_LIFETIME = 30.0f;  // Despawn after 30 seconds
    static constexpr float MIN_DAMAGE_SPEED = 2.0f;  // m/s threshold

private:
    uint32_t body_id_;
    bool is_projectile_;
    float lifetime_;
    
    // Collision tracking
    bool has_collided_with_player_;
    float collision_cooldown_;
};

