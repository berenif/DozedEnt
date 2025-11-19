#include "../WolfManager.h"
#include "../coordinators/GameCoordinator.h"
#include "../physics/PhysicsManager.h"
#include "WolfConstants.h"
#include <cmath>
#include <algorithm>

using namespace wolves::constants;
void WolfManager::update_wolf_state_machine(Wolf& wolf, float delta_time) {
    wolf.state_timer -= delta_time;
    
    // Check for interrupt conditions first (higher priority than timer)
    WolfState interrupt_state;
    if (check_interrupt_conditions(wolf, interrupt_state)) {
        wolf.state = interrupt_state;
        wolf.state_timer = get_state_duration_for(wolf, interrupt_state);
        on_state_enter(wolf, interrupt_state);
        // Reset decision timer on interrupt to simulate reaction delay
        wolf.decision_timer = wolf.decision_interval;
    }
    // Normal decision tick: reevaluate only when timer elapses AND decision gate passed
    else if (wolf.state_timer <= 0.0f && wolf.decision_timer <= 0.0f) {
        WolfState new_state = evaluate_best_state(wolf);
        
        if (new_state != wolf.state) {
            wolf.state = new_state;
            wolf.state_timer = get_state_duration_for(wolf, new_state);
            on_state_enter(wolf, new_state);
        } else {
            // Even if state doesn't change, reset timer to avoid getting stuck
            wolf.state_timer = get_state_duration_for(wolf, new_state);
        }
        // Reset decision timer each time we evaluate
        wolf.decision_timer = wolf.decision_interval;
    }
    
    // Execute current state behavior
    switch (wolf.state) {
        case WolfState::Idle:
            update_idle_behavior(wolf, delta_time);
            break;
        case WolfState::Patrol:
            update_patrol_behavior(wolf, delta_time);
            break;
        case WolfState::Alert:
            update_alert_behavior(wolf, delta_time);
            break;
        case WolfState::Approach:
            update_approach_behavior(wolf, delta_time);
            break;
        case WolfState::Strafe:
            update_strafe_behavior(wolf, delta_time);
            break;
        case WolfState::Attack:
            update_attack_behavior(wolf, delta_time);
            break;
        case WolfState::Retreat:
            update_retreat_behavior(wolf, delta_time);
            break;
        case WolfState::Recover:
            update_recover_behavior(wolf, delta_time);
            break;
        default:
            break;
    }
}

WolfState WolfManager::evaluate_best_state(const Wolf& wolf) const {
    float dist_to_player = get_distance_to_player(wolf);
    
    // Detection range check
    if (dist_to_player > wolf.detection_range) {
        return wolf.state == WolfState::Patrol ? WolfState::Patrol : WolfState::Idle;
    }
    
    // Low health -> retreat
    if (wolf.health < wolf.max_health * 0.3f && wolf.morale < 0.4f) {
        return WolfState::Retreat;
    }
    
    // Check wolf type preferences
    WolfState preferred = get_preferred_state(wolf);
    if (preferred != WolfState::Idle) {
        // Type has a preference, use it if applicable
        return preferred;
    }
    
    // Default behavior (for Normal type or when no preference)
    // Hysteresis thresholds
    #ifdef BAL_WOLF_ATTACK_ENTER_MULT
    float attack_enter = wolf.attack_range * BAL_WOLF_ATTACK_ENTER_MULT;
    #else
    float attack_enter = wolf.attack_range * 1.00f;
    #endif
    #ifdef BAL_WOLF_ATTACK_EXIT_MULT
    float attack_exit  = wolf.attack_range * BAL_WOLF_ATTACK_EXIT_MULT;
    #else
    float attack_exit  = wolf.attack_range * 1.15f;
    #endif
    #ifdef BAL_WOLF_APPROACH_ENTER_MULT
    float approach_enter = wolf.detection_range * BAL_WOLF_APPROACH_ENTER_MULT;
    #else
    float approach_enter = wolf.detection_range * 0.70f;
    #endif
    #ifdef BAL_WOLF_APPROACH_EXIT_MULT
    float approach_exit  = wolf.detection_range * BAL_WOLF_APPROACH_EXIT_MULT;
    #else
    float approach_exit  = wolf.detection_range * 0.85f;
    #endif
    
    // Prefer Attack only when within enter threshold and gating passes
    if (dist_to_player < attack_enter) {
        if (should_attack(wolf)) {
            return WolfState::Attack;
        }
        return WolfState::Strafe;
    }
    // If currently attacking/strafe and close, keep strafing until exit threshold exceeded
    if ((wolf.state == WolfState::Attack || wolf.state == WolfState::Strafe) && dist_to_player < attack_exit) {
        return WolfState::Strafe;
    }
    
    // Medium range -> approach with hysteresis
    if (dist_to_player < approach_enter) {
        return WolfState::Approach;
    }
    if (wolf.state == WolfState::Approach && dist_to_player < approach_exit) {
        return WolfState::Approach;
    }
    
    // Detected player -> alert
    return WolfState::Alert;
}

float WolfManager::get_state_duration(WolfState state) const {
    switch (state) {
        case WolfState::Idle: return 2.0f;
        case WolfState::Patrol: return 4.0f;
        case WolfState::Alert: return 1.0f;
        case WolfState::Approach: return 3.0f;
        case WolfState::Strafe: return 2.0f;
        case WolfState::Attack: return ATTACK_ANTICIPATION_TIME + ATTACK_EXECUTE_TIME + ATTACK_RECOVERY_TIME;
        case WolfState::Retreat: return 2.0f;
        case WolfState::Recover: return 1.0f;
        default: return 1.0f;
    }
}

float WolfManager::get_state_duration_for(const Wolf& wolf, WolfState state) const {
    float base = get_state_duration(state);
    // Emotion multipliers
    float mult = 1.0f;
    switch (wolf.emotion) {
        case EmotionalState::Confident:
            #ifdef BAL_WOLF_CONFIDENT_RECOVER_MULT
            if (state == WolfState::Recover) mult *= BAL_WOLF_CONFIDENT_RECOVER_MULT; // shorter recovery
            #else
            if (state == WolfState::Recover) mult *= 0.8f; // shorter recovery
            #endif
            break;
        case EmotionalState::Fearful:
            #ifdef BAL_WOLF_FEARFUL_STRAFE_MULT
            if (state == WolfState::Strafe) mult *= BAL_WOLF_FEARFUL_STRAFE_MULT; // longer circling
            #else
            if (state == WolfState::Strafe) mult *= 1.3f; // longer circling
            #endif
            break;
        case EmotionalState::Desperate:
            #ifdef BAL_WOLF_DESPERATE_ATTACK_MULT
            if (state == WolfState::Attack) mult *= BAL_WOLF_DESPERATE_ATTACK_MULT; // faster chain attacks
            #else
            if (state == WolfState::Attack) mult *= 0.9f; // faster chain attacks
            #endif
            break;
        default:
            break;
    }
    // Deterministic jitter based on wolf.id
    uint32_t seed = 0x9e3779b9u ^ wolf.id * 0x85ebca6bu;
    seed ^= (seed >> 16);
    float jitter = static_cast<float>(seed % 100) / 1000.0f; // 0..0.099
    return base * mult * (1.0f + jitter * 0.2f); // up to +2% jitter
}

void WolfManager::on_state_enter(Wolf& wolf, WolfState new_state) {
    // State entry logic
    switch (new_state) {
        case WolfState::Attack:
            wolf.body_stretch = 0.8f; // Crouch
            break;
        case WolfState::Retreat:
            wolf.morale = std::max(0.0f, wolf.morale - 0.1f);
            break;
        default:
            wolf.body_stretch = 1.0f;
            break;
    }
    // Track damage taken during this state for better interrupts
    wolf.health_at_state_enter = wolf.health;
}

// ============================================================================
// STATE BEHAVIORS
// ============================================================================

void WolfManager::update_idle_behavior(Wolf& wolf, float delta_time) {
    // Just stand still, look around
    // Apply time-based friction to bleed off any residual motion
    float friction_factor = 1.0f / (1.0f + WOLF_FRICTION * std::max(0.0f, delta_time));
    Fixed f = Fixed::from_float(friction_factor);
    wolf.vx *= f;
    wolf.vy *= f;
    
    // Subtle head movement
    wolf.head_yaw = std::sin(wolf.state_timer * 2.0f) * 0.2f;
}

void WolfManager::update_patrol_behavior(Wolf& wolf, float delta_time) {
    // Simple patrol: move in a circle or random direction
    float time = wolf.state_timer;
    float patrol_x = std::cos(time) * 0.1f;
    float patrol_y = std::sin(time) * 0.1f;
    
    wolf.facing_x = Fixed::from_float(patrol_x);
    wolf.facing_y = Fixed::from_float(patrol_y);
    
    // Set per-second velocity; physics integrates using delta_time
    Fixed move_speed = Fixed::from_float(wolf.speed * 0.3f);
    wolf.vx = wolf.facing_x * move_speed;
    wolf.vy = wolf.facing_y * move_speed;
}

void WolfManager::update_alert_behavior(Wolf& wolf, float delta_time) {
    // Face player, heightened awareness
    move_towards_player(wolf, 0.0f); // Just update facing
    wolf.awareness = 1.0f;
    wolf.ear_rotation[0] = 0.3f;
    wolf.ear_rotation[1] = 0.3f;
}

void WolfManager::update_approach_behavior(Wolf& wolf, float delta_time) {
    // Move towards player
    move_towards_player(wolf, delta_time);
}

void WolfManager::update_strafe_behavior(Wolf& wolf, float delta_time) {
    // Circle around player, maintaining distance
    circle_strafe(wolf, delta_time);
}

void WolfManager::update_attack_behavior(Wolf& wolf, float delta_time) {
    // Select attack type on state enter
    if (wolf.state_timer >= get_state_duration(WolfState::Attack) - delta_time) {
        wolf.current_attack_type = select_attack_type(wolf);
    }
    
    // Get attack timing based on type
    float anticipation_time, execute_time, recovery_time;
    float damage_multiplier = 1.0f;
    
    switch (static_cast<AttackType>(wolf.current_attack_type)) {
        case AttackType::QuickJab:
            anticipation_time = 0.15f;
            execute_time = 0.15f;
            recovery_time = 0.2f;
            damage_multiplier = 0.7f;
            break;
        case AttackType::PowerLunge:
            anticipation_time = 0.5f;
            execute_time = 0.3f;
            recovery_time = 0.4f;
            damage_multiplier = 1.5f;
            break;
        case AttackType::Feint:
            anticipation_time = 0.2f;
            execute_time = 0.3f;  // 0.1s fake + 0.2s real
            recovery_time = 0.3f;
            damage_multiplier = 1.0f;
            break;
        default:  // StandardLunge
            anticipation_time = ATTACK_ANTICIPATION_TIME;
            execute_time = ATTACK_EXECUTE_TIME;
            recovery_time = ATTACK_RECOVERY_TIME;
            damage_multiplier = 1.0f;
            break;
    }
    
    float time_remaining = wolf.state_timer;
    
    if (time_remaining > (execute_time + recovery_time)) {
        // Anticipation phase - crouch
        wolf.body_stretch = 0.7f;
        move_towards_player(wolf, 0.0f); // Face player
    } 
    else if (time_remaining > recovery_time) {
        // Execute phase - lunge
        wolf.body_stretch = 1.3f;
        
        // Check if player is in range and hasn't been hit yet this attack
        if (is_player_in_attack_range(wolf) && coordinator_) {
            // Only deal damage once per attack (check if we just entered execute phase)
            bool just_entered_execute = (time_remaining + delta_time) > (execute_time + recovery_time);
            
            if (just_entered_execute) {
                // Apply damage with type-specific multiplier
                float final_damage = wolf.damage * damage_multiplier;
                
                // Deal damage to player through coordinator
                coordinator_->get_player_manager().take_damage(final_damage);
                
                // Track successful hit
                wolf.successful_attacks++;
                total_attacks_++;
            }
        }
    } 
    else {
        // Recovery phase
        wolf.body_stretch = 1.0f;
        
        // Cooldown based on attack type and aggression
        float base_cooldown = 1.5f;
        if (wolf.current_attack_type == static_cast<uint8_t>(AttackType::QuickJab)) {
            base_cooldown = 0.8f;
        } else if (wolf.current_attack_type == static_cast<uint8_t>(AttackType::PowerLunge)) {
            base_cooldown = 2.5f;
        }
        wolf.attack_cooldown = base_cooldown / (1.0f + wolf.aggression * 0.5f);
    }
}

void WolfManager::update_retreat_behavior(Wolf& wolf, float delta_time) {
    // Move away from player
    if (!coordinator_) {
        return;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    Fixed dx = wolf.x - Fixed::from_float(player_x);
    Fixed dy = wolf.y - Fixed::from_float(player_y);
    
    Fixed distance = fixed_sqrt(dx * dx + dy * dy);
    
    if (distance > Fixed::from_int(0)) {
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        // Per-second velocity; integrated in physics
        Fixed move_speed = Fixed::from_float(wolf.speed);
        wolf.vx = wolf.facing_x * move_speed;
        wolf.vy = wolf.facing_y * move_speed;
    }
}

void WolfManager::update_recover_behavior(Wolf& wolf, float delta_time) {
    // Stunned/recovering, can't act
    wolf.vx *= Fixed::from_float(0.7f); // Heavy friction
    wolf.vy *= Fixed::from_float(0.7f);
    wolf.body_stretch = 0.9f;
}

// ============================================================================
// MOVEMENT & TARGETING
// ============================================================================


