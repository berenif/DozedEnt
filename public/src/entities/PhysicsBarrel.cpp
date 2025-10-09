#include "PhysicsBarrel.h"
#include <cmath>

PhysicsBarrel::PhysicsBarrel()
    : body_id_(0)
    , is_projectile_(false)
    , lifetime_(0.0f)
    , has_collided_with_player_(false)
    , collision_cooldown_(0.0f)
{
}

void PhysicsBarrel::initialize(uint32_t physics_body_id, float x, float y, float z) {
    body_id_ = physics_body_id;
    is_projectile_ = false;
    lifetime_ = 0.0f;
    has_collided_with_player_ = false;
    collision_cooldown_ = 0.0f;
}

void PhysicsBarrel::update(float delta_time) {
    if (!is_active()) {
        return;
    }
    
    // Update lifetime
    lifetime_ += delta_time;
    
    // Update collision cooldown
    if (collision_cooldown_ > 0.0f) {
        collision_cooldown_ -= delta_time;
        if (collision_cooldown_ <= 0.0f) {
            collision_cooldown_ = 0.0f;
            has_collided_with_player_ = false;
        }
    }
    
    // Auto-clear projectile flag after some velocity
    // (Becomes "environmental" barrel again after landing)
    if (is_projectile_) {
        // Will be cleared by physics system when velocity is low
    }
}

float PhysicsBarrel::calculate_impact_damage(float speed, float mass) const {
    // Only deal damage if moving fast enough
    if (speed < MIN_DAMAGE_SPEED) {
        return 0.0f;
    }
    
    // damage = kinetic_energy * multiplier
    // KE = 0.5 * mass * velocity^2
    // Simplified: damage = mass * speed * damage_multiplier
    float damage = mass * speed * DAMAGE_MULTIPLIER;
    
    // Cap maximum damage to prevent one-shots
    const float MAX_DAMAGE = 50.0f;
    if (damage > MAX_DAMAGE) {
        damage = MAX_DAMAGE;
    }
    
    return damage;
}

float PhysicsBarrel::calculate_knockback_force(float speed, float mass) const {
    // knockback = momentum * knockback_multiplier
    // momentum = mass * velocity
    float knockback = mass * speed * KNOCKBACK_MULTIPLIER;
    
    // Cap maximum knockback
    const float MAX_KNOCKBACK = 30.0f;
    if (knockback > MAX_KNOCKBACK) {
        knockback = MAX_KNOCKBACK;
    }
    
    return knockback;
}

bool PhysicsBarrel::should_despawn() const {
    return lifetime_ >= MAX_LIFETIME;
}

