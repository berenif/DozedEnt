#include "CombatManager.h"
#include "../GameGlobals.h"
#include "../physics/PhysicsManager.h"
#include "../physics/PhysicsTypes.h"
#include "../physics/FixedPoint.h"
#include "PlayerManager.h"
#include "GameStateManager.h"
#include <cmath>
#include <algorithm>

CombatManager::CombatManager() {
    // Initialize combat state
    state_ = {};
}

void CombatManager::update(float delta_time) {
    if (delta_time <= 0.0f) return;
    
    // Update all combat subsystems
    update_attack_state(delta_time);
    update_roll_state(delta_time);
    update_block_state(delta_time);
    update_combo_system(delta_time);
    update_counter_system(delta_time);
}

bool CombatManager::try_light_attack() {
    if (state_.attack_state != AttackState::Idle) return false;
    if (!has_sufficient_stamina(LIGHT_ATTACK_STAMINA)) return false;
    
    // Start light attack
    state_.attack_state = AttackState::Windup;
    state_.attack_state_time = 0.0f;  // Will be set by game time
    consume_stamina(LIGHT_ATTACK_STAMINA);
    
    // Update combo
    if (state_.combo_window_remaining > 0.0f) {
        state_.combo_count++;
    } else {
        state_.combo_count = 1;
    }
    state_.combo_window_remaining = COMBO_WINDOW_SEC;
    
    return true;
}

bool CombatManager::try_heavy_attack() {
    if (state_.attack_state != AttackState::Idle) return false;
    if (!has_sufficient_stamina(HEAVY_ATTACK_STAMINA)) return false;
    
    // Start heavy attack
    state_.attack_state = AttackState::Windup;
    state_.attack_state_time = 0.0f;  // Will be set by game time
    consume_stamina(HEAVY_ATTACK_STAMINA);
    
    // Heavy attacks break combo but deal more damage
    state_.combo_count = 0;
    state_.combo_window_remaining = 0.0f;
    
    return true;
}

bool CombatManager::try_special_attack() {
    if (state_.attack_state != AttackState::Idle) return false;
    if (!has_sufficient_stamina(SPECIAL_ATTACK_STAMINA)) return false;
    
    // Start special attack
    state_.attack_state = AttackState::Windup;
    state_.attack_state_time = 0.0f;  // Will be set by game time
    consume_stamina(SPECIAL_ATTACK_STAMINA);
    
    // Special attacks reset combo and provide hyperarmor
    state_.combo_count = 0;
    state_.combo_window_remaining = 0.0f;
    state_.has_hyperarmor = true;
    
    return true;
}

bool CombatManager::can_feint_heavy() const {
    return state_.attack_state == AttackState::Windup;
}

void CombatManager::feint_heavy_attack() {
    if (can_feint_heavy()) {
        state_.attack_state = AttackState::Idle;
        state_.attack_state_time = 0.0f;
        // Partial stamina refund for feinting
        // TODO: Add stamina refund logic
    }
}

bool CombatManager::try_block(float face_x, float face_y, float current_time) {
    if (!has_sufficient_stamina(0.05f)) return false;  // Minimum stamina to block
    
    if (!state_.is_blocking) {
        state_.is_blocking = true;
        state_.block_start_time = current_time;
        
        // Check if this is within parry window
        float time_since_block_start = current_time - state_.block_start_time;
        if (time_since_block_start <= PARRY_WINDOW_SEC) {
            state_.can_counter = true;
            state_.counter_window_remaining = COUNTER_WINDOW_SEC;
        }
    }
    
    return true;
}

bool CombatManager::try_parry() {
    if (!state_.is_blocking) return false;
    
    if (!game_state_manager_) return false;
    
    float current_time = game_state_manager_->get_game_time();
    float time_since_block_start = current_time - state_.block_start_time;
    
    return time_since_block_start <= PARRY_WINDOW_SEC;
}

void CombatManager::stop_blocking() {
    state_.is_blocking = false;
    state_.can_counter = false;
    state_.counter_window_remaining = 0.0f;
}

bool CombatManager::try_roll() {
    if (state_.roll_state != RollState::Idle) return false;
    if (!has_sufficient_stamina(ROLL_STAMINA)) return false;
    
    // Start roll
    state_.roll_state = RollState::Active;
    state_.roll_time = 0.0f;
    state_.is_invulnerable = true;
    consume_stamina(ROLL_STAMINA);
    
    return true;
}

bool CombatManager::is_roll_sliding() const {
    return state_.roll_state == RollState::Active;
}

CombatManager::AttackResult CombatManager::handle_incoming_attack(
    float attack_x, float attack_y, float dir_x, float dir_y, float current_time) {
    
    // Check if invulnerable (rolling)
    if (state_.is_invulnerable) {
        return AttackResult::Miss;
    }
    
    // Check if blocking
    if (state_.is_blocking) {
        float time_since_block_start = current_time - state_.block_start_time;
        
        // Perfect parry window
        if (time_since_block_start <= PARRY_WINDOW_SEC) {
            state_.can_counter = true;
            state_.counter_window_remaining = COUNTER_WINDOW_SEC;
            return AttackResult::PerfectParry;
        }
        
        // Regular block
        return AttackResult::Block;
    }
    
    // Attack hits
    return AttackResult::Hit;
}

float CombatManager::get_attack_cooldown() const {
    // TODO: Calculate based on current attack state and timing
    return 0.0f;
}

float CombatManager::get_roll_cooldown() const {
    if (state_.roll_state == RollState::Cooldown) {
        return ROLL_COOLDOWN_SEC - state_.roll_time;
    }
    return 0.0f;
}

float CombatManager::get_parry_window() const {
    if (state_.is_blocking && game_state_manager_) {
        float current_time = game_state_manager_->get_game_time();
        float time_since_block_start = current_time - state_.block_start_time;
        return std::max(0.0f, PARRY_WINDOW_SEC - time_since_block_start);
    }
    return 0.0f;
}

void CombatManager::update_attack_state(float delta_time) {
    if (state_.attack_state == AttackState::Idle) return;
    
    state_.attack_state_time += delta_time;
    
    switch (state_.attack_state) {
        case AttackState::Windup:
            if (state_.attack_state_time >= ATTACK_WINDUP_SEC) {
                state_.attack_state = AttackState::Active;
                state_.attack_state_time = 0.0f;
            }
            break;
            
        case AttackState::Active:
            if (state_.attack_state_time >= ATTACK_ACTIVE_SEC) {
                state_.attack_state = AttackState::Recovery;
                state_.attack_state_time = 0.0f;
                state_.has_hyperarmor = false;  // Remove hyperarmor after active phase
            }
            break;
            
        case AttackState::Recovery:
            if (state_.attack_state_time >= ATTACK_RECOVERY_SEC) {
                state_.attack_state = AttackState::Idle;
                state_.attack_state_time = 0.0f;
            }
            break;
            
        default:
            break;
    }
}

void CombatManager::update_roll_state(float delta_time) {
    if (state_.roll_state == RollState::Idle) return;
    
    state_.roll_time += delta_time;
    
    switch (state_.roll_state) {
        case RollState::Active:
            if (state_.roll_time >= ROLL_DURATION_SEC) {
                state_.roll_state = RollState::Cooldown;
                state_.roll_time = 0.0f;
                state_.is_invulnerable = false;
            }
            break;
            
        case RollState::Cooldown:
            if (state_.roll_time >= ROLL_COOLDOWN_SEC) {
                state_.roll_state = RollState::Idle;
                state_.roll_time = 0.0f;
            }
            break;
            
        default:
            break;
    }
}

void CombatManager::update_block_state(float delta_time) {
    if (state_.is_blocking) {
        // Consume stamina while blocking
        consume_stamina(BLOCK_STAMINA_PER_SEC * delta_time);
        
        // Stop blocking if out of stamina
        if (!has_sufficient_stamina(0.01f)) {
            stop_blocking();
        }
    }
}

void CombatManager::update_combo_system(float delta_time) {
    if (state_.combo_window_remaining > 0.0f) {
        state_.combo_window_remaining -= delta_time;
        if (state_.combo_window_remaining <= 0.0f) {
            state_.combo_count = 0;
        }
    }
}

void CombatManager::update_counter_system(float delta_time) {
    if (state_.counter_window_remaining > 0.0f) {
        state_.counter_window_remaining -= delta_time;
        if (state_.counter_window_remaining <= 0.0f) {
            state_.can_counter = false;
        }
    }
    
    // Update stun state
    if (state_.is_stunned && state_.stun_remaining > 0.0f) {
        state_.stun_remaining -= delta_time;
        if (state_.stun_remaining <= 0.0f) {
            state_.is_stunned = false;
            state_.stun_remaining = 0.0f;
        }
    }
}

bool CombatManager::has_sufficient_stamina(float required) const {
    if (!player_manager_) {
        return false;  // Can't check stamina without player manager
    }
    return player_manager_->get_stamina() >= required;
}

void CombatManager::consume_stamina(float amount) {
    if (!player_manager_) {
        return;  // Can't consume stamina without player manager
    }
    player_manager_->consume_stamina(amount);
}

float CombatManager::calculate_parry_effectiveness(float timing_offset) const {
    // Perfect parry at timing_offset = 0, decreases with distance from perfect timing
    float effectiveness = 1.0f - (timing_offset / PARRY_WINDOW_SEC);
    return std::max(0.0f, std::min(1.0f, effectiveness));
}

// ============================================================================
// Physics Integration Methods
// ============================================================================

void CombatManager::apply_knockback_impulse(float dir_x, float dir_y, float force) {
    if (!physics_manager_) {
        return;
    }
    
    // Prevent knockback during roll (player keeps momentum)
    if (state_.roll_state == RollState::Active) {
        return;
    }
    
    // Reduce knockback when blocking
    float knockback_multiplier = 1.0f;
    if (state_.is_blocking) {
        knockback_multiplier = 0.3f;  // 70% reduction
    }
    
    // Apply knockback to player body (ID 0)
    FixedVector3 direction = FixedVector3::from_floats(dir_x, dir_y, 0.0f).normalized();
    FixedVector3 impulse = direction * Fixed::from_float(force * knockback_multiplier);
    physics_manager_->apply_impulse(0, impulse);
}

void CombatManager::apply_attack_lunge(float facing_x, float facing_y, bool is_heavy) {
    if (!physics_manager_) {
        return;
    }
    
    // Only lunge during attack windup
    if (state_.attack_state != AttackState::Windup) {
        return;
    }
    
    // Heavy attacks lunge farther
    float lunge_force = is_heavy ? 8.0f : 5.0f;
    
    // Apply lunge impulse in facing direction
    FixedVector3 lunge_dir = FixedVector3::from_floats(facing_x, facing_y, 0.0f).normalized();
    FixedVector3 impulse = lunge_dir * Fixed::from_float(lunge_force);
    physics_manager_->apply_impulse(0, impulse);
}

void CombatManager::apply_enemy_knockback(uint32_t enemy_body_id, float dir_x, float dir_y, float force) {
    if (!physics_manager_) {
        return;
    }
    
    // Calculate knockback based on attack type
    float knockback_multiplier = 1.0f;
    
    // Heavy attacks deal more knockback
    // TODO: Could make this configurable per attack type
    
    // Apply knockback impulse to enemy body
    FixedVector3 direction = FixedVector3::from_floats(dir_x, dir_y, 0.0f).normalized();
    FixedVector3 impulse = direction * Fixed::from_float(force * knockback_multiplier);
    physics_manager_->apply_impulse(enemy_body_id, impulse);
}

