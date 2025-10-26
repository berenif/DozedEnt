#include "PlayerManager.h"
#include "../GameGlobals.h"
#include "../progression/AbilityUpgradeSystem.h"
#include "../physics/FixedPoint.h"
#include "../physics/PhysicsTypes.h"
#include <cmath>
#include <algorithm>

// Using the real upgrade system function from AbilityUpgradeSystem

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
    
    // Update berserker charge state
    if (charge_state_.is_active) {
        update_berserker_charge(delta_time);
    }
    
    // Update flow dash state
    if (dash_state_.is_active) {
        update_flow_dash(delta_time);
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
    // Apply progression: warden.bash.damage (multiplicative)
    {
        const char* key = "warden.bash.damage";
        int fix = upgrade_get_effect_scalar(1, key, 18);
        float mult = 1.0f + (fix / 65536.0f);
        if (mult > 0.0f) bash_force *= mult;
    }
    state_.vel_x += state_.facing_x * bash_force * 0.1f;
    state_.vel_y += state_.facing_y * bash_force * 0.1f;
    
    // Consume stamina (scales with charge)
    {
        float cost = BASH_STAMINA_COST * bash_state_.force_multiplier.to_float();
        // Apply progression: kensei.dash.stamina_cost_reduction is for kensei only; warden uses stamina refund on hit instead
        consume_stamina(cost);
    }
    
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
    
    // Apply progression: warden.bash.stamina_refund adds to base refund
    const char* k = "warden.bash.stamina_refund";
    int fix = upgrade_get_effect_scalar(1, k, 24);
    float bonus = fix / 65536.0f; // additive to base 0.1
    float refund = BASH_STAMINA_REFUND + bonus;
    if (refund > 0.0f) {
        state_.stamina = std::min(1.0f, state_.stamina + refund);
    }
    
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
    // Clamp dt for stability (avoid big steps or zero/negative)
    const float dt_clamped = std::max(1.0f/240.0f, std::min(delta_time, 1.0f/30.0f));

    // Sync skeleton pelvis to player position
    skeleton_.sync_to_player_position(
        Fixed::from_float(state_.pos_x),
        Fixed::from_float(state_.pos_y)
    );
    
    // Update skeleton physics
    Fixed dt = Fixed::from_float(dt_clamped);
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

// ========== Raider Berserker Charge Implementation ==========

bool PlayerManager::can_charge() const {
    return state_.stamina >= CHARGE_STAMINA_COST && 
           !charge_state_.is_active &&
           !bash_state_.is_active &&  // Can't charge while bashing
           !bash_state_.is_charging;
}

void PlayerManager::start_berserker_charge() {
    if (!can_charge()) {
        return;
    }
    
    charge_state_.is_active = true;
    charge_state_.duration = CHARGE_DURATION;
    charge_state_.remaining_duration = CHARGE_DURATION;
    charge_state_.targets_hit = 0;
    charge_state_.has_hyperarmor = true;
    
    // Store charge direction (current facing)
    charge_state_.charge_dir_x = state_.facing_x;
    charge_state_.charge_dir_y = state_.facing_y;
    
    // Apply powerful forward impulse
    float charge_force = CHARGE_BASE_FORCE;
    state_.vel_x += state_.facing_x * charge_force * 0.1f;
    state_.vel_y += state_.facing_y * charge_force * 0.1f;
    
    // Initial stamina cost
    consume_stamina(CHARGE_STAMINA_COST);
    
    // Set speed multiplier
    state_.speed_multiplier = CHARGE_SPEED_MULTIPLIER;
    // Apply progression: raider.charge.speed multiplier and duration bonus seconds
    {
        const char* keyS = "raider.charge.speed";
        int fixS = upgrade_get_effect_scalar(2, keyS, 19);
        float multS = 1.0f + (fixS / 65536.0f);
        charge_state_.speed_multiplier = Fixed::from_float(2.5f * multS);
    }
    {
        const char* keyD = "raider.charge.duration_s";
        int fixD = upgrade_get_effect_scalar(2, keyD, 24);
        float addSeconds = fixD / 65536.0f;
        charge_state_.duration = CHARGE_DURATION + addSeconds;
        charge_state_.remaining_duration = charge_state_.duration;
    }
}

void PlayerManager::update_berserker_charge(float dt) {
    if (!charge_state_.is_active) {
        return;
    }
    
    // Decrease remaining duration
    charge_state_.remaining_duration -= dt;
    
    // Maintain high speed in charge direction
    float current_speed_x = state_.vel_x;
    float current_speed_y = state_.vel_y;
    float current_speed = std::sqrt(current_speed_x * current_speed_x + 
                                   current_speed_y * current_speed_y);
    
    float target_speed = MOVE_SPEED * CHARGE_SPEED_MULTIPLIER;
    
    if (current_speed < target_speed) {
        // Apply forward force to maintain speed
        float force_amount = 100.0f * dt;
        state_.vel_x += charge_state_.charge_dir_x * force_amount;
        state_.vel_y += charge_state_.charge_dir_y * force_amount;
    }
    
    // Drain stamina over time
    float stamina_drain = CHARGE_STAMINA_DRAIN * dt;
    consume_stamina(stamina_drain);
    
    // End charge if out of stamina or duration expired
    if (state_.stamina <= 0.0f || charge_state_.remaining_duration <= 0.0f) {
        cancel_berserker_charge();
    }
}

void PlayerManager::cancel_berserker_charge() {
    if (!charge_state_.is_active) {
        return;
    }
    
    charge_state_.is_active = false;
    charge_state_.has_hyperarmor = false;
    charge_state_.remaining_duration = 0.0f;
    
    // Restore normal speed multiplier
    state_.speed_multiplier = 1.0f;
}

void PlayerManager::on_charge_hit(uint32_t target_id) {
    if (!charge_state_.is_active) {
        return;
    }
    
    charge_state_.targets_hit++;
    
    // Calculate momentum-based damage (handled by caller)
    float current_speed = std::sqrt(state_.vel_x * state_.vel_x + 
                                   state_.vel_y * state_.vel_y);
    float momentum_damage = current_speed * 10.0f;
    
    // TODO: Apply knockback to target (perpendicular to charge)
    // TODO: Check if target died for healing effect
    // For now, assume target survives - in full implementation:
    // if (is_enemy_dead(target_id)) {
    //     heal(CHARGE_HEAL_PER_KILL);
    // }
}

// Berserker charge getters
bool PlayerManager::is_berserker_charge_active() const {
    return charge_state_.is_active;
}

float PlayerManager::get_berserker_charge_duration() const {
    return charge_state_.remaining_duration;
}

uint32_t PlayerManager::get_berserker_targets_hit() const {
    return charge_state_.targets_hit;
}

float PlayerManager::get_berserker_speed_multiplier() const {
    return charge_state_.speed_multiplier.to_float();
}

float PlayerManager::get_berserker_charge_dir_x() const {
    return charge_state_.charge_dir_x;
}

float PlayerManager::get_berserker_charge_dir_y() const {
    return charge_state_.charge_dir_y;
}

bool PlayerManager::is_berserker_unstoppable() const {
    return charge_state_.is_active && charge_state_.has_hyperarmor;
}

// ========== Kensei Flow Dash Implementation ==========

bool PlayerManager::can_dash() const {
    return state_.stamina >= DASH_STAMINA_COST && 
           !dash_state_.is_active &&
           !bash_state_.is_active &&      // Can't dash while bashing
           !bash_state_.is_charging &&
           !charge_state_.is_active;      // Can't dash while charging
}

bool PlayerManager::can_chain_dash() const {
    return dash_state_.can_cancel && 
           dash_state_.combo_level < DASH_MAX_COMBO &&
           state_.stamina >= DASH_STAMINA_COST;
}

void PlayerManager::execute_flow_dash(float direction_x, float direction_y) {
    if (!can_dash() && !can_chain_dash()) {
        return;
    }
    
    // Normalize direction
    float length = std::sqrt(direction_x * direction_x + direction_y * direction_y);
    if (length < 0.001f) {
        // No direction provided, use facing direction
        direction_x = state_.facing_x;
        direction_y = state_.facing_y;
        length = 1.0f;
    } else {
        direction_x /= length;
        direction_y /= length;
    }
    
    // If this is a chain dash, increment combo
    if (dash_state_.can_cancel) {
        dash_state_.combo_level++;
    } else {
        dash_state_.combo_level = 0;
    }
    
    // Calculate target position
    dash_state_.target_x = state_.pos_x + direction_x * DASH_DISTANCE;
    dash_state_.target_y = state_.pos_y + direction_y * DASH_DISTANCE;
    
    // Clamp to world bounds [0, 1]
    dash_state_.target_x = std::max(0.0f, std::min(1.0f, dash_state_.target_x));
    dash_state_.target_y = std::max(0.0f, std::min(1.0f, dash_state_.target_y));
    
    // Initialize dash state
    dash_state_.is_active = true;
    dash_state_.duration = DASH_DURATION;
    dash_state_.dash_progress = 0.0f;
    dash_state_.is_invulnerable = true;  // I-frames during dash
    dash_state_.can_cancel = false;      // Reset cancel window
    
    // Consume stamina (reduced cost with combo level)
    float cost_reduction = dash_state_.combo_level * 0.05f;
    float actual_cost = std::max(0.1f, DASH_STAMINA_COST - cost_reduction);
    consume_stamina(actual_cost);
    // Apply progression: kensei.dash.iframes_ms and kensei.dash.stamina_cost_reduction
    {
        const char* keyC = "kensei.dash.stamina_cost_reduction";
        int fixC = upgrade_get_effect_scalar(3, keyC, 31);
        float reduction = fixC / 65536.0f; // 0..1
        float cost = std::max(0.0f, DASH_STAMINA_COST * (1.0f - reduction));
        consume_stamina(cost);
    }
    {
        const char* keyI = "kensei.dash.iframes_ms";
        int fixI = upgrade_get_effect_scalar(3, keyI, 23);
        float addMs = fixI / 65536.0f; // milliseconds
        if (addMs > 0.0f) {
            dash_state_.is_invulnerable = true;
            // duration already set; extend invulnerability window implicitly by toggling flag while active
        }
    }
}

void PlayerManager::update_flow_dash(float dt) {
    if (!dash_state_.is_active) {
        return;
    }
    
    // Update dash progress (0 to 1)
    dash_state_.dash_progress += dt / dash_state_.duration;
    
    if (dash_state_.dash_progress >= 1.0f) {
        // Dash complete
        dash_state_.dash_progress = 1.0f;
        dash_state_.is_active = false;
        dash_state_.is_invulnerable = false;
        
        // Snap to target position
        state_.pos_x = dash_state_.target_x;
        state_.pos_y = dash_state_.target_y;
        
        // Reset combo if max combo reached
        if (dash_state_.combo_level >= DASH_MAX_COMBO) {
            dash_state_.combo_level = 0;
            dash_state_.can_cancel = false;
        }
        
        return;
    }
    
    // Interpolate position smoothly (ease-out cubic for snappy feel)
    float t = dash_state_.dash_progress;
    float ease_t = 1.0f - std::pow(1.0f - t, 3.0f); // Cubic ease-out
    
    float start_x = state_.pos_x - (dash_state_.target_x - state_.pos_x) / t * (t - 1.0f);
    float start_y = state_.pos_y - (dash_state_.target_y - state_.pos_y) / t * (t - 1.0f);
    
    state_.pos_x = start_x + (dash_state_.target_x - start_x) * ease_t;
    state_.pos_y = start_y + (dash_state_.target_y - start_y) * ease_t;
    
    // TODO: Check for collisions along dash path
    // TODO: Create dash slash hitbox
}

void PlayerManager::cancel_flow_dash() {
    if (!dash_state_.is_active) {
        return;
    }
    
    dash_state_.is_active = false;
    dash_state_.is_invulnerable = false;
    dash_state_.can_cancel = false;
    dash_state_.combo_level = 0;
}

void PlayerManager::on_dash_hit(uint32_t target_id) {
    if (!dash_state_.is_active) {
        return;
    }
    
    // Store target for chain dash tracking
    dash_state_.last_target_id = target_id;
    
    // Enable dash cancel window (can chain to another target)
    dash_state_.can_cancel = true;
    
    // Restore stamina on hit
    state_.stamina = std::min(1.0f, state_.stamina + DASH_STAMINA_REFUND);
    
    // Calculate damage with combo scaling
    float damage = DASH_BASE_DAMAGE * (1.0f + dash_state_.combo_level * DASH_COMBO_MULTIPLIER);
    
    // TODO: Apply damage to target
    // TODO: Apply knockback
}

// Flow dash getters
bool PlayerManager::is_flow_dash_active() const {
    return dash_state_.is_active;
}

float PlayerManager::get_flow_dash_duration() const {
    if (!dash_state_.is_active) {
        return 0.0f;
    }
    return dash_state_.duration * (1.0f - dash_state_.dash_progress);
}

int PlayerManager::get_flow_dash_combo_level() const {
    return dash_state_.combo_level;
}

float PlayerManager::get_dash_progress() const {
    return dash_state_.dash_progress;
}

bool PlayerManager::is_dash_invulnerable() const {
    return dash_state_.is_invulnerable;
}

bool PlayerManager::can_dash_cancel() const {
    return dash_state_.can_cancel;
}

