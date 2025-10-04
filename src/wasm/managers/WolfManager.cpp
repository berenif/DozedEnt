#include "WolfManager.h"
#include "../coordinators/GameCoordinator.h"
#include <cmath>
#include <algorithm>

// Constants
namespace {
    constexpr float PI = 3.14159265359f;
    constexpr float BASE_WOLF_SPEED = 0.25f;  // Normalized 0-1 space (slightly slower than player's 0.3)
    // Time-based friction coefficient (per second), similar scale to player
    constexpr float WOLF_FRICTION = 12.0f;
    constexpr float ATTACK_ANTICIPATION_TIME = 0.3f;
    constexpr float ATTACK_EXECUTE_TIME = 0.2f;
    constexpr float ATTACK_RECOVERY_TIME = 0.3f;
}

WolfManager::WolfManager() 
    : coordinator_(nullptr)
    , next_wolf_id_(1)
    , next_pack_id_(1)
    , total_attacks_(0)
    , player_dodges_(0)
    , player_blocks_(0)
    , average_kill_time_(30.0f) {
}

WolfManager::~WolfManager() {
    clear_all();
}

void WolfManager::initialize(GameCoordinator* coordinator) {
    coordinator_ = coordinator;
    clear_all();
}

void WolfManager::clear_all() {
    wolves_.clear();
    packs_.clear();
    next_wolf_id_ = 1;
    next_pack_id_ = 1;
}

void WolfManager::update(float delta_time) {
    if (!coordinator_) {
        return;
    }
    
    // Update all wolves
    for (Wolf& wolf : wolves_) {
        update_wolf_ai(wolf, delta_time);
        update_wolf_physics(wolf, delta_time);
        update_wolf_emotion(wolf, delta_time);
        update_wolf_memory(wolf, delta_time);
        update_wolf_animation(wolf, delta_time);
    }
    
    // Update pack coordination
    update_pack_coordination(delta_time);
}

void WolfManager::spawn_wolf(float x, float y, WolfType type) {
    Wolf wolf;
    wolf.id = next_wolf_id_++;
    wolf.type = type;
    wolf.x = Fixed::from_float(x);
    wolf.y = Fixed::from_float(y);
    wolf.state = WolfState::Idle;
    wolf.state_timer = get_state_duration(WolfState::Idle);  // Initialize timer properly
    
    init_wolf_stats(wolf);
    
    wolves_.push_back(wolf);
}

void WolfManager::init_wolf_stats(Wolf& wolf) {
    // Base stats
    wolf.max_health = 100.0f;
    wolf.health = wolf.max_health;
    wolf.stamina = 1.0f;
    wolf.damage = 15.0f;
    wolf.speed = BASE_WOLF_SPEED;
    wolf.detection_range = 0.4f;
    wolf.attack_range = 0.08f;
    
    // Randomize attributes slightly (deterministic using wolf ID as seed)
    uint32_t seed = wolf.id * 12345u;
    auto pseudo_rand = [&seed]() -> float {
        seed = seed * 1664525u + 1013904223u;
        return static_cast<float>(seed % 1000) / 1000.0f;
    };
    
    wolf.aggression = 0.3f + pseudo_rand() * 0.4f;      // 0.3-0.7
    wolf.intelligence = 0.4f + pseudo_rand() * 0.4f;    // 0.4-0.8
    wolf.coordination = 0.5f + pseudo_rand() * 0.3f;    // 0.5-0.8
    wolf.morale = 0.6f + pseudo_rand() * 0.2f;          // 0.6-0.8
    
    // Type-specific modifiers
    switch (wolf.type) {
        case WolfType::Alpha:
            wolf.max_health *= 1.5f;
            wolf.health = wolf.max_health;
            wolf.damage *= 1.3f;
            wolf.aggression = std::min(1.0f, wolf.aggression + 0.2f);
            break;
        case WolfType::Scout:
            wolf.speed *= 1.2f;
            wolf.detection_range *= 1.3f;
            wolf.intelligence += 0.1f;
            break;
        case WolfType::Hunter:
            wolf.damage *= 1.2f;
            wolf.coordination += 0.15f;
            break;
        default:
            break;
    }
}

void WolfManager::remove_wolf(uint32_t wolf_id) {
    wolves_.erase(
        std::remove_if(wolves_.begin(), wolves_.end(),
            [wolf_id](const Wolf& w) { return w.id == wolf_id; }),
        wolves_.end()
    );
}

void WolfManager::damage_wolf(uint32_t wolf_id, float damage, float knockback_x, float knockback_y) {
    Wolf* wolf = find_wolf_by_id(wolf_id);
    if (!wolf) {
        return;
    }
    
    // Apply damage
    wolf->health -= damage;
    if (wolf->health < 0.0f) {
        wolf->health = 0.0f;
    }
    
    // Apply knockback
    wolf->vx += Fixed::from_float(knockback_x * 0.3f);
    wolf->vy += Fixed::from_float(knockback_y * 0.3f);
    
    // Update morale
    wolf->morale = std::max(0.0f, wolf->morale - 0.05f);
    
    // Interrupt current action
    if (wolf->state == WolfState::Attack) {
        wolf->state = WolfState::Recover;
        wolf->state_timer = 0.5f;
    }
    
    // Death check
    if (wolf->health <= 0.0f) {
        wolf->state = WolfState::Flee;
        // Could trigger death animation, loot drop, etc.
        // For now, just mark for removal
    }
}

const Wolf* WolfManager::get_wolf(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) {
        return nullptr;
    }
    return &wolves_[index];
}

Wolf* WolfManager::get_wolf_mutable(int index) {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) {
        return nullptr;
    }
    return &wolves_[index];
}

Wolf* WolfManager::find_wolf_by_id(uint32_t wolf_id) {
    for (Wolf& wolf : wolves_) {
        if (wolf.id == wolf_id) {
            return &wolf;
        }
    }
    return nullptr;
}

// ============================================================================
// AI UPDATE - Main wolf AI logic
// ============================================================================

void WolfManager::update_wolf_ai(Wolf& wolf, float delta_time) {
    // Update state machine
    update_wolf_state_machine(wolf, delta_time);
    
    // Update cooldowns
    if (wolf.attack_cooldown > 0.0f) {
        wolf.attack_cooldown -= delta_time;
    }
    if (wolf.dodge_cooldown > 0.0f) {
        wolf.dodge_cooldown -= delta_time;
    }
    if (wolf.decision_timer > 0.0f) {
        wolf.decision_timer -= delta_time;
    }
}

void WolfManager::update_wolf_state_machine(Wolf& wolf, float delta_time) {
    wolf.state_timer -= delta_time;
    
    // State transition check
    if (wolf.state_timer <= 0.0f) {
        WolfState new_state = evaluate_best_state(wolf);
        
        if (new_state != wolf.state) {
            wolf.state = new_state;
            wolf.state_timer = get_state_duration(new_state);
            on_state_enter(wolf, new_state);
        } else {
            // Even if state doesn't change, reset timer to avoid getting stuck
            wolf.state_timer = get_state_duration(new_state);
        }
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
    
    // In attack range and ready
    if (dist_to_player < wolf.attack_range) {
        if (wolf.attack_cooldown <= 0.0f && wolf.stamina > 0.3f) {
            return WolfState::Attack;
        }
        return WolfState::Strafe;
    }
    
    // Medium range -> approach
    if (dist_to_player < wolf.detection_range * 0.7f) {
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
    float time_remaining = wolf.state_timer;
    float total_time = ATTACK_ANTICIPATION_TIME + ATTACK_EXECUTE_TIME + ATTACK_RECOVERY_TIME;
    
    if (time_remaining > (ATTACK_EXECUTE_TIME + ATTACK_RECOVERY_TIME)) {
        // Anticipation phase - crouch
        wolf.body_stretch = 0.8f;
        move_towards_player(wolf, 0.0f); // Face player
    } 
    else if (time_remaining > ATTACK_RECOVERY_TIME) {
        // Execute phase - lunge
        wolf.body_stretch = 1.3f;
        
        // Check if player is in range
        if (is_player_in_attack_range(wolf) && coordinator_) {
            // Send attack to combat manager
            // Note: This would integrate with the combat system
            // For now, just track the attempt
            wolf.successful_attacks++; // Simplified
            total_attacks_++;
        }
    } 
    else {
        // Recovery phase
        wolf.body_stretch = 1.0f;
        wolf.attack_cooldown = 1.5f / (1.0f + wolf.aggression);
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

void WolfManager::move_towards_player(Wolf& wolf, float delta_time) {
    if (!coordinator_) {
        return;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    Fixed dx = Fixed::from_float(player_x) - wolf.x;
    Fixed dy = Fixed::from_float(player_y) - wolf.y;
    
    Fixed distance = fixed_sqrt(dx * dx + dy * dy);
    
    if (distance > Fixed::from_int(0)) {
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        if (delta_time > 0.0f) {
            // Set per-second velocity; position integrates with dt in physics
            Fixed move_speed = Fixed::from_float(wolf.speed);
            wolf.vx = wolf.facing_x * move_speed;
            wolf.vy = wolf.facing_y * move_speed;
        }
    }
}

void WolfManager::circle_strafe(Wolf& wolf, float delta_time) {
    if (!coordinator_) {
        return;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    Fixed dx = Fixed::from_float(player_x) - wolf.x;
    Fixed dy = Fixed::from_float(player_y) - wolf.y;
    
    // Perpendicular direction (clockwise or counter-clockwise based on ID)
    int direction = (wolf.id % 2 == 0) ? 1 : -1;
    
    Fixed strafe_x = -dy * Fixed::from_int(direction);
    Fixed strafe_y = dx * Fixed::from_int(direction);
    
    Fixed length = fixed_sqrt(strafe_x * strafe_x + strafe_y * strafe_y);
    if (length > Fixed::from_int(0)) {
        // Set per-second strafe velocity; physics integrates using delta_time
        Fixed speed = Fixed::from_float(wolf.speed * 0.7f);
        wolf.vx = (strafe_x / length) * speed;
        wolf.vy = (strafe_y / length) * speed;
        
        // Keep facing player
        wolf.facing_x = dx / fixed_sqrt(dx * dx + dy * dy);
        wolf.facing_y = dy / fixed_sqrt(dx * dx + dy * dy);
    }
}

float WolfManager::get_distance_to_player(const Wolf& wolf) const {
    if (!coordinator_) {
        return 999.0f;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    float dx = player_x - wolf.x.to_float();
    float dy = player_y - wolf.y.to_float();
    
    return std::sqrt(dx * dx + dy * dy);
}

bool WolfManager::is_player_in_attack_range(const Wolf& wolf) const {
    return get_distance_to_player(wolf) < wolf.attack_range;
}

// ============================================================================
// PHYSICS UPDATE
// ============================================================================

void WolfManager::update_wolf_physics(Wolf& wolf, float delta_time) {
    // Integrate position with time-scaled velocity (match player integration style)
    Fixed dt = Fixed::from_float(std::max(0.0f, delta_time));
    wolf.x += wolf.vx * dt;
    wolf.y += wolf.vy * dt;
    
    // Apply time-based friction to velocities
    float friction_factor = 1.0f / (1.0f + WOLF_FRICTION * std::max(0.0f, delta_time));
    Fixed f = Fixed::from_float(friction_factor);
    wolf.vx *= f;
    wolf.vy *= f;
    
    // Boundary checks (keep in world bounds 0-1)
    if (wolf.x < Fixed::from_int(0)) {
        wolf.x = Fixed::from_int(0);
    }
    if (wolf.x > Fixed::from_int(1)) {
        wolf.x = Fixed::from_int(1);
    }
    if (wolf.y < Fixed::from_int(0)) {
        wolf.y = Fixed::from_int(0);
    }
    if (wolf.y > Fixed::from_int(1)) {
        wolf.y = Fixed::from_int(1);
    }
    
    // Update stamina
    wolf.stamina = std::min(1.0f, wolf.stamina + 0.1f * delta_time);
}

// ============================================================================
// EMOTIONAL AI
// ============================================================================

void WolfManager::update_wolf_emotion(Wolf& wolf, float delta_time) {
    float health_percent = wolf.health / wolf.max_health;
    float success_rate = 0.5f;
    if ((wolf.successful_attacks + wolf.failed_attacks) > 0) {
        success_rate = static_cast<float>(wolf.successful_attacks) / 
                       static_cast<float>(wolf.successful_attacks + wolf.failed_attacks);
    }
    
    // Determine emotion based on situation
    if (health_percent < 0.3f) {
        wolf.emotion = EmotionalState::Fearful;
    } else if (success_rate > 0.7f && wolf.morale > 0.7f) {
        wolf.emotion = EmotionalState::Confident;
    } else if (wolf.failed_attacks > 5 && success_rate < 0.3f) {
        wolf.emotion = EmotionalState::Frustrated;
    } else if (health_percent < 0.2f) {
        wolf.emotion = EmotionalState::Desperate;
    } else if (wolf.aggression > 0.6f && get_distance_to_player(wolf) < wolf.attack_range * 1.5f) {
        wolf.emotion = EmotionalState::Aggressive;
    } else {
        wolf.emotion = EmotionalState::Calm;
    }
    
    apply_emotion_modifiers(wolf);
}

void WolfManager::apply_emotion_modifiers(Wolf& wolf) {
    // Reset modifiers to base values first
    // (In a more complete system, we'd store base values separately)
    
    switch (wolf.emotion) {
        case EmotionalState::Confident:
            wolf.attack_cooldown *= 0.8f;
            break;
        case EmotionalState::Fearful:
            wolf.detection_range *= 1.3f;
            wolf.attack_range *= 0.7f;
            break;
        case EmotionalState::Frustrated:
            wolf.aggression = std::min(1.0f, wolf.aggression + 0.2f);
            break;
        case EmotionalState::Desperate:
            wolf.damage *= 1.3f;
            break;
        default:
            break;
    }
}

// ============================================================================
// MEMORY & LEARNING
// ============================================================================

void WolfManager::update_wolf_memory(Wolf& wolf, float delta_time) {
    if (!coordinator_) {
        return;
    }
    
    // Track player movement patterns
    float player_vx = coordinator_->get_player_manager().get_vel_x();
    float player_vy = coordinator_->get_player_manager().get_vel_y();
    float player_speed = std::sqrt(player_vx * player_vx + player_vy * player_vy);
    
    // Exponential moving average
    float alpha = 0.1f;
    wolf.player_speed_estimate = wolf.player_speed_estimate * (1.0f - alpha) + player_speed * alpha;
    
    // Update timers
    wolf.last_player_block_time += delta_time;
    wolf.last_player_roll_time += delta_time;
    
    // Adjust behavior based on memory
    if (wolf.last_player_block_time < 1.0f) {
        // Player recently blocked, be more cautious
        wolf.attack_cooldown = std::max(wolf.attack_cooldown, 0.5f);
    }
    
    if (wolf.player_speed_estimate > 0.4f) {
        // Player is fast, increase anticipation
        wolf.intelligence = std::min(0.9f, wolf.intelligence + 0.01f * delta_time);
    }
}

// ============================================================================
// PACK BEHAVIOR (Basic stubs for Phase 4)
// ============================================================================

void WolfManager::create_pack(const std::vector<uint32_t>& wolf_ids) {
    Pack pack;
    pack.pack_id = next_pack_id_++;
    pack.wolf_ids = wolf_ids;
    pack.current_plan = PackPlan::None;
    pack.pack_morale = 0.7f;
    
    packs_.push_back(pack);
    
    // Assign pack IDs to wolves
    for (uint32_t wolf_id : wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (wolf) {
            wolf->pack_id = pack.pack_id;
        }
    }
    
    assign_pack_roles(packs_.back());
}

void WolfManager::update_pack_roles() {
    for (Pack& pack : packs_) {
        assign_pack_roles(pack);
    }
}

void WolfManager::assign_pack_roles(Pack& pack) {
    // Find leader (highest intelligence * morale)
    float best_score = 0.0f;
    Wolf* leader = nullptr;
    
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* w = find_wolf_by_id(wolf_id);
        if (!w) {
            continue;
        }
        
        float score = w->intelligence * w->morale;
        if (score > best_score) {
            best_score = score;
            leader = w;
        }
    }
    
    if (leader) {
        leader->pack_role = PackRole::Leader;
    }
    
    // Assign other roles based on attributes
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* w = find_wolf_by_id(wolf_id);
        if (!w || w == leader) {
            continue;
        }
        
        if (w->aggression > 0.6f) {
            w->pack_role = PackRole::Bruiser;
        } else if (w->speed > 280.0f) {
            w->pack_role = PackRole::Skirmisher;
        } else if (w->intelligence > 0.7f) {
            w->pack_role = PackRole::Support;
        } else {
            w->pack_role = PackRole::Scout;
        }
    }
}

void WolfManager::coordinate_pack_attack() {
    // Placeholder for Phase 4
}

void WolfManager::update_pack_coordination(float delta_time) {
    // Placeholder for Phase 4
    for (Pack& pack : packs_) {
        update_pack_ai(pack, delta_time);
    }
}

void WolfManager::update_pack_ai(Pack& pack, float delta_time) {
    // Placeholder for Phase 4
    pack.plan_timer -= delta_time;
}

void WolfManager::execute_pack_plan(Pack& pack) {
    // Placeholder for Phase 4
}

void WolfManager::execute_ambush_plan(Pack& pack) {
    // Placeholder for Phase 4
}

void WolfManager::execute_pincer_plan(Pack& pack) {
    // Placeholder for Phase 4
}

void WolfManager::execute_commit_plan(Pack& pack) {
    // Placeholder for Phase 4
}

bool WolfManager::wolves_in_position(const Pack& pack) const {
    // Placeholder for Phase 4
    return false;
}

void WolfManager::move_wolf_to_position(Wolf& wolf, float target_x, float target_y) {
    // Placeholder for Phase 4
    Fixed dx = Fixed::from_float(target_x) - wolf.x;
    Fixed dy = Fixed::from_float(target_y) - wolf.y;
    
    Fixed distance = fixed_sqrt(dx * dx + dy * dy);
    if (distance > Fixed::from_int(0)) {
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        Fixed move_speed = Fixed::from_float(wolf.speed * 0.016f); // Assume 60 FPS
        wolf.vx = wolf.facing_x * move_speed;
        wolf.vy = wolf.facing_y * move_speed;
    }
}

Pack* WolfManager::find_pack_by_id(uint32_t pack_id) {
    for (Pack& pack : packs_) {
        if (pack.pack_id == pack_id) {
            return &pack;
        }
    }
    return nullptr;
}

// ============================================================================
// ANIMATION
// ============================================================================

void WolfManager::update_wolf_animation(Wolf& wolf, float delta_time) {
    // Simple animation updates
    // Body stretch animates based on state
    float target_stretch = 1.0f;
    if (wolf.state == WolfState::Attack) {
        if (wolf.state_timer > (ATTACK_EXECUTE_TIME + ATTACK_RECOVERY_TIME)) {
            target_stretch = 0.8f; // Crouch
        } else if (wolf.state_timer > ATTACK_RECOVERY_TIME) {
            target_stretch = 1.3f; // Lunge
        }
    }
    
    // Smooth interpolation
    wolf.body_stretch += (target_stretch - wolf.body_stretch) * delta_time * 10.0f;
    
    // Tail wag based on emotion
    if (wolf.emotion == EmotionalState::Confident) {
        wolf.tail_wag = std::sin(wolf.state_timer * 6.0f) * 0.5f;
    } else if (wolf.emotion == EmotionalState::Fearful) {
        wolf.tail_wag = -0.8f; // Tucked
    } else {
        wolf.tail_wag = 0.0f;
    }
}

// ============================================================================
// ADAPTIVE DIFFICULTY
// ============================================================================

void WolfManager::update_difficulty_scaling(float player_skill) {
    // player_skill: 0.0 (beginner) to 1.0 (expert)
    
    for (Wolf& wolf : wolves_) {
        // Adjust speed (0.85x - 1.15x)
        float speed_mult = 0.85f + (player_skill * 0.3f);
        wolf.speed = BASE_WOLF_SPEED * speed_mult;
        
        // Adjust aggression
        wolf.aggression = 0.3f + (player_skill * 0.55f);
        
        // Adjust reaction time
        float reaction_delay = 0.22f - (player_skill * 0.13f); // 220ms to 90ms
        wolf.decision_timer = std::max(0.09f, reaction_delay);
    }
}

float WolfManager::estimate_player_skill() const {
    if (total_attacks_ == 0) {
        return 0.5f; // Default medium skill
    }
    
    float dodge_rate = static_cast<float>(player_dodges_) / static_cast<float>(total_attacks_);
    float block_rate = static_cast<float>(player_blocks_) / static_cast<float>(total_attacks_);
    float kill_speed = 1.0f / std::max(1.0f, average_kill_time_);
    
    // Combine metrics
    float skill = (dodge_rate * 0.4f + block_rate * 0.3f + kill_speed * 0.3f);
    return std::clamp(skill, 0.0f, 1.0f);
}

