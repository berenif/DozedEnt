#include "PlayerManager.h"
#include "../core/GameGlobals.h"
#include <cmath>
#include <algorithm>

PlayerManager::PlayerManager() {
    reset_to_spawn();
}

void PlayerManager::update(float delta_time) {
    // Update physics
    update_physics(delta_time);
    
    // Regenerate stamina
    regenerate_stamina(delta_time);
    
    // Update state timer
    state_.state_timer += delta_time;
    
    // Update movement state
    update_grounded_state();
    update_wall_sliding_state();
}

void PlayerManager::update_movement(float input_x, float input_y, float delta_time) {
    if (delta_time <= 0.0f) return;
    
    // Apply movement input
    float target_vel_x = input_x * MOVE_SPEED * state_.speed_multiplier;
    float target_vel_y = input_y * MOVE_SPEED * state_.speed_multiplier;
    
    // Smooth velocity transition
    const float acceleration = 8.0f;
    state_.vel_x += (target_vel_x - state_.vel_x) * acceleration * delta_time;
    state_.vel_y += (target_vel_y - state_.vel_y) * acceleration * delta_time;
    
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
    const float friction = 0.85f;
    float friction_factor = std::pow(friction, delta_time);
    
    state_.vel_x *= friction_factor;
    state_.vel_y *= friction_factor;
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
    // Simple ground detection (TODO: improve with proper collision detection)
    state_.is_grounded = (state_.pos_y <= 0.1f);
    
    if (state_.is_grounded) {
        state_.jump_count = 0;
    }
}

void PlayerManager::update_wall_sliding_state() {
    // Simple wall detection (TODO: improve with proper collision detection)
    bool near_wall = (state_.pos_x <= 0.1f || state_.pos_x >= 0.9f);
    state_.is_wall_sliding = near_wall && !state_.is_grounded && state_.vel_y < 0.0f;
}

