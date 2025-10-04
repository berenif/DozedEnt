#include "PlayerManager.h"
#include "../GameGlobals.h"
#include <cmath>
#include <algorithm>

PlayerManager::PlayerManager() {
    reset_to_spawn();
    // Initialize skeleton at player spawn position
    skeleton_.initialize(
        Fixed::from_float(state_.pos_x), 
        Fixed::from_float(state_.pos_y),
        Fixed::from_int(1)
    );
}

void PlayerManager::update(float delta_time) {
    // Update physics
    update_physics(delta_time);
    
    // Update skeleton physics if enabled
    if (state_.use_skeleton_physics) {
        update_skeleton(delta_time);
    }
    
    // Update bash state
    if (bash_state_.is_charging) {
        update_bash_charge(delta_time);
    }
    if (bash_state_.is_active) {
        update_active_bash(delta_time);
    }
    
    // Regenerate stamina
    regenerate_stamina(delta_time);
    
    // Update state timer
    state_.state_timer += delta_time;
    
    // Update movement state
    update_grounded_state();
    update_wall_sliding_state();
}

void PlayerManager::update_movement(float input_x, float input_y, float delta_time) {
    if (delta_time <= 0.0f) {
        return;
    }
    
    // Instant stop when there's no movement input (prevents glide)
    // Preserve momentum during active bash to avoid cancelling ability movement
    {
        const float input_mag_sq = input_x * input_x + input_y * input_y;
        if (input_mag_sq < 1e-6f) {
            // Track last input as zero for input-aware friction
            state_.last_input_x = 0.0f;
            state_.last_input_y = 0.0f;
            if (!bash_state_.is_active) {
                state_.vel_x = 0.0f;
                state_.vel_y = 0.0f;
            }
            // No need to update position or collisions when stationary
            return;
        }
    }

    // Update facing direction based on input
    update_facing_direction(input_x, input_y);
    
    // Apply movement input
    float target_vel_x = input_x * MOVE_SPEED * state_.speed_multiplier;
    float target_vel_y = input_y * MOVE_SPEED * state_.speed_multiplier;
    
    // Smooth velocity transition with quick-turn assistance
    float accel_x = ACCELERATION;
    float accel_y = ACCELERATION;
    
    // If reversing direction on an axis, apply a boost to overcome inertia faster
    if (target_vel_x != 0.0f && state_.vel_x != 0.0f && (target_vel_x * state_.vel_x) < 0.0f) {
        accel_x *= TURN_BOOST;
    }
    if (target_vel_y != 0.0f && state_.vel_y != 0.0f && (target_vel_y * state_.vel_y) < 0.0f) {
        accel_y *= TURN_BOOST;
    }
    
    state_.vel_x += (target_vel_x - state_.vel_x) * accel_x * delta_time;
    state_.vel_y += (target_vel_y - state_.vel_y) * accel_y * delta_time;
    
    // Track last input for input-aware friction
    state_.last_input_x = input_x;
    state_.last_input_y = input_y;
    
    // Update position
    state_.pos_x += state_.vel_x * delta_time;
    state_.pos_y += state_.vel_y * delta_time;
    
    // Handle collisions and boundaries
    handle_collisions();
}

void PlayerManager::update_physics(float delta_time) {
    // Apply friction
    apply_friction(delta_time);
    
    // Clamp position to world bounds
    state_.pos_x = std::max(0.0f, std::min(1.0f, state_.pos_x));
    state_.pos_y = std::max(0.0f, std::min(1.0f, state_.pos_y));
}

void PlayerManager::reset_to_spawn() {
    state_.pos_x = 0.5f;
    state_.pos_y = 0.5f;
    state_.vel_x = 0.0f;
    state_.vel_y = 0.0f;
    state_.stamina = 1.0f;
    state_.hp = 1.0f;
    state_.health = 100;
    state_.max_health = 100;
    state_.is_grounded = true;
    state_.is_wall_sliding = false;
    state_.jump_count = 0;
    state_.state_timer = 0.0f;
    state_.speed_multiplier = 1.0f;
}

void PlayerManager::set_position(float x, float y) {
    state_.pos_x = std::max(0.0f, std::min(1.0f, x));
    state_.pos_y = std::max(0.0f, std::min(1.0f, y));
}

void PlayerManager::set_velocity(float vx, float vy) {
    state_.vel_x = vx;
    state_.vel_y = vy;
}

void PlayerManager::consume_stamina(float amount) {
    state_.stamina = std::max(0.0f, state_.stamina - amount);
}

void PlayerManager::regenerate_stamina(float delta_time) {
    if (state_.stamina < 1.0f) {
        state_.stamina = std::min(1.0f, state_.stamina + STAMINA_REGEN_RATE * delta_time);
    }
}

void PlayerManager::take_damage(float amount) {
    state_.hp = std::max(0.0f, state_.hp - amount);
    state_.health = static_cast<int>(state_.hp * state_.max_health);
}

void PlayerManager::heal(float amount) {
    state_.hp = std::min(1.0f, state_.hp + amount);
    state_.health = static_cast<int>(state_.hp * state_.max_health);
}

bool PlayerManager::can_jump() const {
    return state_.jump_count < MAX_JUMP_COUNT && state_.stamina > 0.1f;
}

bool PlayerManager::can_wall_slide() const {
    return !state_.is_grounded && state_.stamina > 0.05f;
}

void PlayerManager::apply_jump() {
    if (can_jump()) {
        state_.vel_y += 0.6f; // Jump velocity
        state_.jump_count++;
        consume_stamina(0.15f);
        state_.is_grounded = false;
    }
}

void PlayerManager::apply_wall_slide(float delta_time) {
    if (can_wall_slide()) {
        state_.vel_y = std::max(state_.vel_y, -WALL_SLIDE_SPEED);
        state_.is_wall_sliding = true;
        consume_stamina(0.1f * delta_time);
    }
}

float PlayerManager::get_speed() const {
    return std::sqrt(state_.vel_x * state_.vel_x + state_.vel_y * state_.vel_y);
}

void PlayerManager::apply_friction(float delta_time) {
    // Input-aware friction: lower damping while input is held for responsiveness,
    // higher damping when idle to stop quickly
    float input_mag = std::abs(state_.last_input_x) + std::abs(state_.last_input_y);
    const float friction = (input_mag > 0.05f) ? FRICTION_WHEN_MOVING : FRICTION_WHEN_IDLE;
    float friction_factor = 1.0f / (1.0f + friction * delta_time);
    
    state_.vel_x *= friction_factor;
    state_.vel_y *= friction_factor;
    
    // Clamp near-zero velocities to exactly zero to prevent drift
    if (std::abs(state_.vel_x) < 0.0005f) state_.vel_x = 0.0f;  // Reduced threshold from 0.001f
    if (std::abs(state_.vel_y) < 0.0005f) state_.vel_y = 0.0f;  // Reduced threshold from 0.001f
}

void PlayerManager::handle_collisions() {
    // Simple collision with world boundaries
    if (state_.pos_x <= 0.0f || state_.pos_x >= 1.0f) {
        state_.vel_x = 0.0f;
    }
    if (state_.pos_y <= 0.0f || state_.pos_y >= 1.0f) {
        state_.vel_y = 0.0f;
    }
    
    // TODO: Add proper collision detection with obstacles
}

void PlayerManager::update_grounded_state() {
    // More permissive ground detection - assume grounded unless actively falling/jumping
    // This allows movement animation to work properly
    const bool isFalling = state_.vel_y > 0.1f;  // Moving upward significantly
    const bool isHighUp = state_.pos_y > 0.3f;   // Very high up
    
    state_.is_grounded = !isFalling && !isHighUp;
    
    if (state_.is_grounded) {
        state_.jump_count = 0;
    }
}

void PlayerManager::update_wall_sliding_state() {
    // Simple wall detection (TODO: improve with proper collision detection)
    bool near_wall = (state_.pos_x <= 0.1f || state_.pos_x >= 0.9f);
    state_.is_wall_sliding = near_wall && !state_.is_grounded && state_.vel_y < 0.0f;
}

// ========== Warden Shoulder Bash Implementation ==========

bool PlayerManager::can_bash() const {
    return state_.stamina >= BASH_STAMINA_COST && !bash_state_.is_active && !bash_state_.is_charging;
}

void PlayerManager::start_charging_bash() {
    if (!can_bash()) {
        return;
    }
    
    bash_state_.is_charging = true;
    bash_state_.charge_time = 0.0f;
    bash_state_.targets_hit = 0;
    
    // Slow movement during charge
    state_.speed_multiplier = BASH_CHARGE_SLOW_FACTOR;
}

void PlayerManager::update_bash_charge(float dt) {
    if (!bash_state_.is_charging) {
        return;
    }
    
    // Increment charge time (capped at max_charge)
    bash_state_.charge_time += dt;
    bash_state_.charge_time = std::min(bash_state_.charge_time, bash_state_.max_charge);
    
    // Update force multiplier based on charge level
    bash_state_.force_multiplier = Fixed::from_float(1.0f + bash_state_.charge_time);
}

void PlayerManager::release_bash() {
    if (!bash_state_.is_charging) {
        return;
    }
    
    // Check minimum charge requirement
    if (bash_state_.charge_time < BASH_MIN_CHARGE) {
        // Release without executing bash
        bash_state_.is_charging = false;
        state_.speed_multiplier = 1.0f;
        return;
    }
    
    // Execute bash
    bash_state_.is_charging = false;
    bash_state_.is_active = true;
    bash_state_.duration = BASH_DURATION;
    
    // Apply forward lunge (simplified - will integrate with physics manager later)
    float bash_force = BASH_BASE_FORCE * bash_state_.force_multiplier.to_float();
    state_.vel_x += state_.facing_x * bash_force * 0.1f;
    state_.vel_y += state_.facing_y * bash_force * 0.1f;
    
    // Consume stamina (scales with charge)
    consume_stamina(BASH_STAMINA_COST * bash_state_.force_multiplier.to_float());
    
    // Restore speed multiplier
    state_.speed_multiplier = 1.0f;
    
    // TODO: Create bash hitbox when physics integration is complete
}

void PlayerManager::update_active_bash(float dt) {
    if (!bash_state_.is_active) {
        return;
    }
    
    // Decrease bash duration
    bash_state_.duration -= dt;
    
    // End bash when duration expires
    if (bash_state_.duration <= 0.0f) {
        bash_state_.is_active = false;
        bash_state_.targets_hit = 0;
    }
    
    // TODO: Check for bash collisions with enemies
}

void PlayerManager::on_bash_hit(uint32_t target_id) {
    if (!bash_state_.is_active) {
        return;
    }
    
    bash_state_.targets_hit++;
    
    // Extend bash duration slightly on hit
    bash_state_.duration += 0.1f;
    
    // Restore stamina on successful hit (reward aggression)
    state_.stamina = std::min(1.0f, state_.stamina + BASH_STAMINA_REFUND);
    
    // TODO: Apply knockback to target when physics integration is complete
    // TODO: Apply stun status effect to target
}

void PlayerManager::update_facing_direction(float input_x, float input_y) {
    // Only update facing if there's significant input
    const float min_input = 0.1f;
    if (std::abs(input_x) > min_input || std::abs(input_y) > min_input) {
        // Normalize the facing direction
        float length = std::sqrt(input_x * input_x + input_y * input_y);
        if (length > 0.001f) {
            state_.facing_x = input_x / length;
            state_.facing_y = input_y / length;
        }
    }
}

// Bash getters
float PlayerManager::get_bash_charge_level() const {
    if (!bash_state_.is_charging) {
        return 0.0f;
    }
    return bash_state_.charge_time / bash_state_.max_charge;
}

bool PlayerManager::is_bash_active() const {
    return bash_state_.is_active;
}

bool PlayerManager::is_bash_charging() const {
    return bash_state_.is_charging;
}

uint32_t PlayerManager::get_bash_targets_hit() const {
    return bash_state_.targets_hit;
}

PlayerManager::BashHitbox PlayerManager::get_bash_hitbox() const {
    BashHitbox hitbox;
    
    if (!bash_state_.is_active) {
        hitbox.active = false;
        return hitbox;
    }
    
    hitbox.active = true;
    hitbox.radius = bash_state_.hitbox_radius;
    
    // Calculate hitbox position in front of player
    hitbox.x = state_.pos_x + state_.facing_x * bash_state_.hitbox_offset;
    hitbox.y = state_.pos_y + state_.facing_y * bash_state_.hitbox_offset;
    
    return hitbox;
}

bool PlayerManager::check_bash_collision(float target_x, float target_y, float target_radius) const {
    if (!bash_state_.is_active) {
        return false;
    }
    
    BashHitbox hitbox = get_bash_hitbox();
    if (!hitbox.active) {
        return false;
    }
    
    // Circle-circle collision detection
    float dx = target_x - hitbox.x;
    float dy = target_y - hitbox.y;
    float dist_sq = dx * dx + dy * dy;
    
    float combined_radius = hitbox.radius + target_radius;
    float combined_radius_sq = combined_radius * combined_radius;
    
    return dist_sq <= combined_radius_sq;
}

void PlayerManager::update_skeleton(float delta_time) {
    // Sync skeleton pelvis to player position
    skeleton_.sync_to_player_position(
        Fixed::from_float(state_.pos_x),
        Fixed::from_float(state_.pos_y)
    );
    
    // Update skeleton physics
    Fixed dt = Fixed::from_float(delta_time);
    skeleton_.update(dt);
    
    // Extract balance state for gameplay
    state_.left_foot_grounded = skeleton_.foot_contact_l;
    state_.right_foot_grounded = skeleton_.foot_contact_r;
    
    // Calculate balance quality (0-1, where 1 is perfectly balanced)
    // Based on center of mass offset from support base
    Fixed com_offset_abs = skeleton_.com_offset.abs();
    Fixed max_offset = Fixed::from_float(0.1f); // Max acceptable offset
    Fixed quality = Fixed::from_int(1) - (com_offset_abs / max_offset);
    quality = Fixed::max(Fixed::from_int(0), Fixed::min(Fixed::from_int(1), quality));
    state_.balance_quality = quality.to_float();
    
    // Update grounded state based on foot contact
    state_.is_grounded = state_.left_foot_grounded || state_.right_foot_grounded;
}

