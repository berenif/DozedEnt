#include "WolfManager.h"
#include "../coordinators/GameCoordinator.h"
#include "../physics/FixedPoint.h"
#include "../physics/PhysicsTypes.h"
#include "generated/balance_data.h"
#include "wolves/WolfConstants.h"
#include <cmath>
#include <algorithm>

// Use wolf constants namespace
using namespace wolves::constants;

// Constants
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
        update_wolf_spatial_awareness(wolf, delta_time);
        update_wolf_animation(wolf, delta_time);
    }
    
    // Update pack coordination
    update_pack_coordination(delta_time);
    
    // Update adaptive difficulty every 10 seconds
    difficulty_update_timer_ += delta_time;
    if (difficulty_update_timer_ >= 10.0f) {
        float player_skill = estimate_player_skill();
        update_difficulty_scaling(player_skill);
        difficulty_update_timer_ = 0.0f;
    }
}

void WolfManager::spawn_wolf(float x, float y, WolfType type) {
    Wolf wolf;
    wolf.id = next_wolf_id_++;
    wolf.type = type;
    wolf.x = Fixed::from_float(x);
    wolf.y = Fixed::from_float(y);
    wolf.state = WolfState::Idle;
    wolf.state_timer = get_state_duration_for(wolf, WolfState::Idle);  // Initialize timer properly
    wolf.health_at_state_enter = wolf.health;
    wolf.decision_interval = 0.15f;
    wolf.decision_timer = wolf.decision_interval;
    
    init_wolf_stats(wolf);
    
    // Create physics body for collision detection
    if (coordinator_) {
        wolf.physics_body_id = coordinator_->get_physics_manager().create_wolf_body(x, y);
    }
    
    wolves_.push_back(wolf);
    
    // Map physics body ID to wolf index
    if (wolf.physics_body_id != 0) {
        body_id_to_index_[wolf.physics_body_id] = static_cast<int>(wolves_.size() - 1);
    }
}

void WolfManager::init_wolf_stats(Wolf& wolf) {
    // Base stats
    wolf.max_health = 100.0f;
    wolf.health = wolf.max_health;
    wolf.stamina = 1.0f;
    wolf.base_damage = 15.0f;
    wolf.damage = wolf.base_damage;
    wolf.base_speed = BASE_WOLF_SPEED;
    wolf.speed = wolf.base_speed;
    wolf.base_detection_range = 0.4f;
    wolf.detection_range = wolf.base_detection_range;
    wolf.base_attack_range = 0.08f;
    wolf.attack_range = wolf.base_attack_range;
    
    // Randomize attributes using global RNG for determinism across systems
    auto* game_state = coordinator_ ? &coordinator_->get_game_state_manager() : nullptr;
    const auto next_random = [game_state]() -> float {
        if (game_state) {
            return game_state->get_random_float();
        }
        return 0.5f;
    };

    wolf.aggression = 0.3f + next_random() * 0.4f;      // 0.3-0.7
    wolf.intelligence = 0.4f + next_random() * 0.4f;    // 0.4-0.8
    wolf.coordination = 0.5f + next_random() * 0.3f;    // 0.5-0.8
    wolf.morale = 0.6f + next_random() * 0.2f;          // 0.6-0.8
    
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
    // Find wolf to get physics body ID
    Wolf* wolf = find_wolf_by_id(wolf_id);
    if (wolf) {
        if (wolf->physics_body_id > 0 && coordinator_) {
            coordinator_->get_physics_manager().destroy_body(wolf->physics_body_id);
        }
        body_id_to_index_.erase(wolf->physics_body_id);
    }

    wolves_.erase(
        std::remove_if(wolves_.begin(), wolves_.end(),
            [wolf_id](const Wolf& w) { return w.id == wolf_id; }),
        wolves_.end()
    );
    rebuild_body_index_map();
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

Wolf* WolfManager::find_wolf_by_body(uint32_t body_id) {
    auto it = body_id_to_index_.find(body_id);
    if (it == body_id_to_index_.end()) {
        return nullptr;
    }
    const int index = it->second;
    if (index < 0 || static_cast<std::size_t>(index) >= wolves_.size()) {
        return nullptr;
    }
    return &wolves_[index];
}

const Wolf* WolfManager::find_wolf_by_body(uint32_t body_id) const {
    auto it = body_id_to_index_.find(body_id);
    if (it == body_id_to_index_.end()) {
        return nullptr;
    }
    const int index = it->second;
    if (index < 0 || static_cast<std::size_t>(index) >= wolves_.size()) {
        return nullptr;
    }
    return &wolves_[index];
}

void WolfManager::rebuild_body_index_map() {
    body_id_to_index_.clear();
    for (std::size_t i = 0; i < wolves_.size(); ++i) {
        const auto body_id = wolves_[i].physics_body_id;
        if (body_id != 0) {
            body_id_to_index_[body_id] = static_cast<int>(i);
        }
    }
}

void WolfManager::set_wolf_collision_cooldown(uint32_t body_id, float cooldown_time) {
    Wolf* wolf = find_wolf_by_body(body_id);
    if (wolf) {
        wolf->collision_cooldown = cooldown_time;
    }
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
    if (wolf.collision_cooldown > 0.0f) {
        wolf.collision_cooldown -= delta_time;
    }
}

void WolfManager::move_towards_player(Wolf& wolf, float delta_time) {
    if (!coordinator_) {
        return;
    }
    
    // Don't chase player if we're in collision cooldown (let separation take effect)
    if (wolf.collision_cooldown > 0.0f) {
        // Maintain current velocity or zero it out
        wolf.vx *= Fixed::from_float(0.9f);  // Slow down gradually
        wolf.vy *= Fixed::from_float(0.9f);
        return;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    Fixed dx = Fixed::from_float(player_x) - wolf.x;
    Fixed dy = Fixed::from_float(player_y) - wolf.y;
    
    Fixed distance = fixed_sqrt(dx * dx + dy * dy);
    
    // Stop approaching when within attack range (prevent overlap)
    Fixed min_distance = Fixed::from_float(wolf.attack_range * 0.9f);
    
    if (distance > min_distance) {
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        if (delta_time > 0.0f) {
            // Set per-second velocity; position integrates with dt in physics
            Fixed move_speed = Fixed::from_float(wolf.speed);
            wolf.vx = wolf.facing_x * move_speed;
            wolf.vy = wolf.facing_y * move_speed;
        }
    } else {
        // Within attack range - stop moving (or slow down significantly)
        wolf.vx *= Fixed::from_float(0.8f);
        wolf.vy *= Fixed::from_float(0.8f);
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

float WolfManager::compute_facing_dot_to_player(const Wolf& wolf) const {
    if (!coordinator_) {
        return 1.0f;
    }
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    float dx = player_x - wolf.x.to_float();
    float dy = player_y - wolf.y.to_float();
    float len = std::sqrt(dx * dx + dy * dy);
    if (len <= 0.0f) {
        return 1.0f;
    }
    float norm_dx = dx / len;
    float norm_dy = dy / len;
    return norm_dx * wolf.facing_x.to_float() + norm_dy * wolf.facing_y.to_float();
}

int WolfManager::count_current_attackers() const {
    int count = 0;
    for (const Wolf& w : wolves_) {
        if (w.state == WolfState::Attack) {
            count++;
        }
    }
    return count;
}

// ============================================================================
// PHYSICS UPDATE
// ============================================================================

void WolfManager::update_wolf_physics(Wolf& wolf, float delta_time) {
    // Sync with PhysicsManager if available
    if (coordinator_ && wolf.physics_body_id > 0) {
        auto& physics_mgr = coordinator_->get_physics_manager();
        auto* body = physics_mgr.get_body(wolf.physics_body_id);
        
        if (body) {
            // Only update physics velocity if NOT in collision cooldown
            // This allows physics separation to take effect without AI overriding it
            if (wolf.collision_cooldown <= 0.0f) {
                // Update physics body velocity based on wolf AI
                physics_mgr.set_velocity(wolf.physics_body_id, FixedVector3::from_floats(wolf.vx.to_float(), wolf.vy.to_float(), 0.0f));
            }
            
            // Always read back position from physics (handles collision resolution)
            wolf.x = body->position.x;
            wolf.y = body->position.y;
            
            // Always read back velocity from physics (handles collision response)
            wolf.vx = body->velocity.x;
            wolf.vy = body->velocity.y;
        }
    } else {
        // Fallback: manual physics integration
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
    // Only apply modifiers if emotion changed
    if (wolf.emotion == wolf.previous_emotion) {
        return;
    }
    
    // Reset to base values first
    wolf.speed = wolf.base_speed;
    wolf.detection_range = wolf.base_detection_range;
    wolf.attack_range = wolf.base_attack_range;
    wolf.damage = wolf.base_damage;
    
    // Apply emotion-specific modifiers
    switch (wolf.emotion) {
        case EmotionalState::Confident:
            wolf.speed *= 1.1f;  // 10% faster
            wolf.attack_cooldown *= 0.8f;  // Attack 25% more frequently
            break;
        case EmotionalState::Fearful:
            wolf.detection_range *= 1.3f;  // See player from farther
            wolf.attack_range *= 0.7f;     // Reluctant to get close
            wolf.speed *= 0.9f;            // Slightly slower (cautious)
            break;
        case EmotionalState::Frustrated:
            wolf.aggression = std::min(1.0f, wolf.aggression + 0.2f);  // More aggressive
            wolf.damage *= 1.1f;  // Hit harder out of frustration
            break;
        case EmotionalState::Desperate:
            wolf.damage *= 1.3f;   // 30% more damage (all-in)
            wolf.speed *= 1.15f;   // Faster movement
            break;
        case EmotionalState::Aggressive:
            wolf.attack_range *= 1.2f;  // Willing to engage farther
            wolf.speed *= 1.05f;        // Slightly faster
            break;
        case EmotionalState::Calm:
        default:
            // No modifiers for calm state
            break;
    }
    
    // Update previous emotion
    wolf.previous_emotion = wolf.emotion;
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
        // Cache leader index for exports
        // Find index within wolves_ vector; fallback -1 if not found
        int li = -1;
        for (std::size_t i = 0; i < wolves_.size(); ++i) {
            if (wolves_[i].id == leader->id) { li = static_cast<int>(i); break; }
        }
        pack.leader_index = li;
    } else {
        pack.leader_index = -1;
    }
    
    // Assign other roles based on attributes
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* w = find_wolf_by_id(wolf_id);
        if (!w || w == leader) {
            continue;
        }
        
        if (w->aggression > 0.6f) {
            w->pack_role = PackRole::Bruiser;
        } else if (w->speed > 0.28f) {
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
    pack.plan_timer -= delta_time;
    
    // Re-evaluate pack plan every 3 seconds
    if (pack.plan_timer <= 0.0f) {
        pack.plan_timer = 3.0f;
        
        // Count wolves in attack range and check pack health
        int wolves_near_player = 0;
        int wolves_ready_to_attack = 0;
        float avg_health = 0.0f;
        int alive_wolves = 0;
        
        for (uint32_t wolf_id : pack.wolf_ids) {
            Wolf* wolf = find_wolf_by_id(wolf_id);
            if (!wolf || wolf->health <= 0.0f) {
                continue;
            }
            
            alive_wolves++;
            avg_health += wolf->health / wolf->max_health;
            
            float dist = get_distance_to_player(*wolf);
            if (dist < wolf->attack_range * 2.0f) {
                wolves_near_player++;
            }
            if (wolf->attack_cooldown <= 0.0f && wolf->stamina > 0.3f) {
                wolves_ready_to_attack++;
            }
        }
        
        if (alive_wolves == 0) {
            return;
        }
        
        avg_health /= alive_wolves;
        pack.pack_morale = avg_health * 0.7f + 0.3f;
        
        // Select appropriate pack plan based on situation
        if (avg_health < 0.3f) {
            pack.current_plan = PackPlan::Retreat;
        } else if (wolves_ready_to_attack >= 3) {
            pack.current_plan = PackPlan::Commit;  // All-in attack
        } else if (wolves_near_player >= 2 && wolves_near_player < alive_wolves) {
            pack.current_plan = PackPlan::Flank;  // Some distract, others flank
        } else if (alive_wolves >= 3) {
            pack.current_plan = PackPlan::Pincer;  // Split and surround
        } else {
            pack.current_plan = PackPlan::None;  // Individual behavior
        }
    }
    
    // Execute current plan
    if (pack.current_plan != PackPlan::None) {
        execute_pack_plan(pack);
    }
}

void WolfManager::execute_pack_plan(Pack& pack) {
    switch (pack.current_plan) {
        case PackPlan::Ambush:
            execute_ambush_plan(pack);
            break;
        case PackPlan::Pincer:
            execute_pincer_plan(pack);
            break;
        case PackPlan::Commit:
            execute_commit_plan(pack);
            break;
        case PackPlan::Flank:
            execute_flank_plan(pack);
            break;
        case PackPlan::Distract:
            execute_distract_plan(pack);
            break;
        case PackPlan::Retreat:
            // All wolves retreat individually
            for (uint32_t wolf_id : pack.wolf_ids) {
                Wolf* wolf = find_wolf_by_id(wolf_id);
                if (wolf && wolf->state != WolfState::Retreat) {
                    wolf->state = WolfState::Retreat;
                    wolf->state_timer = 2.0f;
                }
            }
            break;
        case PackPlan::Regroup:
            execute_regroup_plan(pack);
            break;
        default:
            break;
    }
}

void WolfManager::execute_ambush_plan(Pack& pack) {
    // Scout lures player, others wait in flanking positions
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf) {
            continue;
        }
        
        if (wolf->pack_role == PackRole::Scout) {
            // Scout approaches to lure
            if (wolf->state != WolfState::Approach) {
                wolf->state = WolfState::Approach;
                wolf->state_timer = 3.0f;
            }
        } else {
            // Others wait at flanking angles
            float target_angle = get_optimal_attack_angle(*wolf);
            // Convert angle to position (simplified)
            // TODO: Calculate position at flanking angle
        }
    }
}

void WolfManager::execute_pincer_plan(Pack& pack) {
    if (!coordinator_) {
        return;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    // Split pack into two groups attacking from opposite sides
    int wolf_count = 0;
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf) {
            continue;
        }
        
        // First half attacks from one side, second half from opposite
        float target_angle = (wolf_count % 2 == 0) ? 0.0f : PI;
        float target_x = player_x + std::cos(target_angle) * 0.15f;
        float target_y = player_y + std::sin(target_angle) * 0.15f;
        
        move_wolf_to_position(*wolf, target_x, target_y);
        wolf_count++;
    }
}

void WolfManager::execute_commit_plan(Pack& pack) {
    // Threat budget: choose up to N wolves to attack; others strafe/position
    struct Candidate { uint32_t id; float dist; };
    std::vector<Candidate> candidates;
    candidates.reserve(pack.wolf_ids.size());
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf || wolf->health <= 0.0f) {
            continue;
        }
        candidates.push_back({wolf_id, get_distance_to_player(*wolf)});
    }
    std::sort(candidates.begin(), candidates.end(), [](const Candidate& a, const Candidate& b){ return a.dist < b.dist; });
    int attackers_allowed = std::max(1, max_concurrent_attackers_);
    int attackers_assigned = 0;
    for (const Candidate& c : candidates) {
        Wolf* wolf = find_wolf_by_id(c.id);
        if (!wolf) continue;
        if (attackers_assigned < attackers_allowed && wolf->attack_cooldown <= 0.0f && wolf->stamina > 0.3f) {
            wolf->pack_command_received = true;
            attackers_assigned++;
        } else {
            if (wolf->state != WolfState::Strafe) {
                wolf->state = WolfState::Strafe;
                wolf->state_timer = get_state_duration_for(*wolf, WolfState::Strafe);
            }
        }
    }
}

void WolfManager::execute_flank_plan(Pack& pack) {
    // Bruiser distracts from front, others flank from sides
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf) {
            continue;
        }
        
        if (wolf->pack_role == PackRole::Bruiser) {
            // Bruiser approaches directly
            if (wolf->state != WolfState::Approach) {
                wolf->state = WolfState::Approach;
                wolf->state_timer = 3.0f;
            }
        } else {
            // Others strafe to flanking positions
            if (wolf->state != WolfState::Strafe) {
                wolf->state = WolfState::Strafe;
                wolf->state_timer = 2.0f;
            }
        }
    }
}

void WolfManager::execute_distract_plan(Pack& pack) {
    // Support wolf creates opening for coordinated strike
    int support_count = 0;
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf) {
            continue;
        }
        
        if (wolf->pack_role == PackRole::Support && support_count == 0) {
            // First support wolf distracts
            if (wolf->state != WolfState::Approach) {
                wolf->state = WolfState::Approach;
                wolf->state_timer = 3.0f;
            }
            support_count++;
        } else {
            // Others wait for opening, then strike
            if (wolf->state == WolfState::Strafe && wolf->attack_cooldown <= 0.0f) {
                wolf->pack_command_received = true;
            }
        }
    }
}

void WolfManager::execute_regroup_plan(Pack& pack) {
    if (!coordinator_) {
        return;
    }
    
    // Calculate pack center
    float center_x = 0.0f;
    float center_y = 0.0f;
    int count = 0;
    
    for (uint32_t wolf_id : pack.wolf_ids) {
        Wolf* wolf = find_wolf_by_id(wolf_id);
        if (!wolf) {
            continue;
        }
        center_x += wolf->x.to_float();
        center_y += wolf->y.to_float();
        count++;
    }
    
    if (count > 0) {
        center_x /= count;
        center_y /= count;
        
        // Move all wolves toward pack center
        for (uint32_t wolf_id : pack.wolf_ids) {
            Wolf* wolf = find_wolf_by_id(wolf_id);
            if (!wolf) {
                continue;
            }
            move_wolf_to_position(*wolf, center_x, center_y);
        }
    }
}

bool WolfManager::wolves_in_position(const Pack& pack) const {
    // Check if all wolves are close to their target positions
    // For now, simplified check
    return true;
}

void WolfManager::move_wolf_to_position(Wolf& wolf, float target_x, float target_y) {
    Fixed dx = Fixed::from_float(target_x) - wolf.x;
    Fixed dy = Fixed::from_float(target_y) - wolf.y;
    
    Fixed distance = fixed_sqrt(dx * dx + dy * dy);
    if (distance > Fixed::from_int(0)) {
        wolf.facing_x = dx / distance;
        wolf.facing_y = dy / distance;
        
        // Set per-second velocity, physics integrates with delta_time
        Fixed move_speed = Fixed::from_float(wolf.speed);
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

const Pack* WolfManager::get_pack(int index) const {
    if (index < 0 || index >= static_cast<int>(packs_.size())) {
        return nullptr;
    }
    return &packs_[index];
}

// ============================================================================
// ANIMATION
// ============================================================================

void WolfManager::update_wolf_animation(Wolf& wolf, float delta_time) {
    // State-based animation targets
    float target_stretch = 1.0f;
    float target_head_pitch = 0.0f;
    float target_ear_rotation = 0.0f;
    
    // Attack state with enhanced telegraphs
    if (wolf.state == WolfState::Attack) {
        if (wolf.state_timer > (ATTACK_EXECUTE_TIME + ATTACK_RECOVERY_TIME)) {
            // Anticipation phase - clear telegraph
            target_stretch = 0.7f;  // Crouch lower
            target_head_pitch = -0.2f;  // Head down
            target_ear_rotation = -0.3f;  // Ears back
        } else if (wolf.state_timer > ATTACK_RECOVERY_TIME) {
            // Execute phase - lunge
            target_stretch = 1.3f;
            target_head_pitch = 0.1f;
            target_ear_rotation = 0.2f;
        }
    }
    
    // Emotion-based posture modifiers
    switch (wolf.emotion) {
        case EmotionalState::Confident:
            target_stretch *= 1.1f;  // Chest out
            target_head_pitch += 0.1f;  // Head high
            wolf.tail_wag = std::sin(wolf.state_timer * 8.0f) * 0.6f;  // Vigorous wag
            break;
            
        case EmotionalState::Fearful:
            target_stretch *= 0.85f;  // Slightly crouched
            target_ear_rotation += 0.5f;  // Ears alert
            wolf.tail_wag = -0.9f;  // Tail tucked tight
            break;
            
        case EmotionalState::Desperate:
            target_stretch *= 0.95f;  // Tense posture
            target_head_pitch -= 0.1f;  // Head slightly down
            wolf.tail_wag = std::sin(wolf.state_timer * 12.0f) * 0.3f;  // Nervous twitch
            break;
            
        case EmotionalState::Aggressive:
            target_stretch *= 1.05f;  // Puffed up
            target_head_pitch += 0.05f;
            wolf.tail_wag = 0.2f;  // Tail up
            break;
            
        default:  // Calm, Frustrated
            wolf.tail_wag = 0.0f;
            break;
    }
    
    // Smooth interpolation toward targets (faster for urgent signals)
    float anim_speed = (wolf.state == WolfState::Attack) ? 15.0f : 10.0f;
    wolf.body_stretch += (target_stretch - wolf.body_stretch) * delta_time * anim_speed;
    wolf.head_pitch += (target_head_pitch - wolf.head_pitch) * delta_time * anim_speed;
    
    // Apply ear rotation to both ears
    wolf.ear_rotation[0] += (target_ear_rotation - wolf.ear_rotation[0]) * delta_time * anim_speed;
    wolf.ear_rotation[1] += (target_ear_rotation - wolf.ear_rotation[1]) * delta_time * anim_speed;
    
    // ===== NEW: Procedural Leg IK & Body Bob =====
    float speed = sqrtf(wolf.vx.to_float() * wolf.vx.to_float() + 
                        wolf.vy.to_float() * wolf.vy.to_float());
    
    // Update per-wolf animation phase (deterministic)
    if (!coordinator_) return;
    float freq = (speed > 0.15f) ? 0.015f : 0.008f;
    wolf.anim_phase += delta_time * freq;
    
    // Quadruped gait - offset each leg by 90 degrees
    const float phase_offsets[4] = {0.0f, 3.14159f, 1.5708f, 4.71239f}; // 0, π, π/2, 3π/2
    const float leg_id_offsets[4] = {0.0f, 0.5f, 0.25f, 0.75f}; // Per-wolf variation
    
    for (int i = 0; i < 4; i++) {
        float phase = wolf.anim_phase + phase_offsets[i] + (wolf.id * leg_id_offsets[i]);
        
        // X: horizontal stride (forward/back)
        wolf.leg_positions[i][0] = sinf(phase) * 0.25f * speed;
        
        // Y: vertical lift (ground contact = 0, max lift = 0.15)
        float raw_lift = sinf(phase * 2.0f);
        wolf.leg_positions[i][1] = (raw_lift > 0.0f) ? raw_lift * 0.15f : 0.0f;
    }
    
    // Body bob - vertical oscillation during movement
    wolf.body_bob = (speed > 0.05f) ? sinf(wolf.anim_phase * 2.0f) * 0.08f * speed : 0.0f;
    
    // Update head_yaw to track movement direction (already have head_pitch from existing code)
    if (speed > 0.05f) {
        wolf.head_yaw = atan2f(wolf.vy.to_float(), wolf.vx.to_float());
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

bool WolfManager::should_attack(const Wolf& wolf) const {
    float dist_to_player = get_distance_to_player(wolf);
    
    // Check if in attack range and ready
    if (dist_to_player < wolf.attack_range) {
        if (!(wolf.attack_cooldown <= 0.0f && wolf.stamina > 0.3f)) {
            return false;
        }
        // Facing angle gating
        float facing_dot = compute_facing_dot_to_player(wolf);
        if (facing_dot < ATTACK_FACING_COS_THRESHOLD) {
            // Observability
            const_cast<WolfManager*>(this)->gating_angle_rejects_count_++;
            return false;
        }
        // Line of sight gating
        if (!has_clear_path_to_player(wolf)) {
            const_cast<WolfManager*>(this)->gating_los_rejects_count_++;
            return false;
        }
        // Threat budget: limit concurrent attackers globally (simple first pass)
        if (count_current_attackers() >= max_concurrent_attackers_) {
            const_cast<WolfManager*>(this)->threat_budget_deferrals_count_++;
            return false;
        }
        return true;
    }
    
    return false;
}

bool WolfManager::should_retreat(const Wolf& wolf) const {
    float health_percent = wolf.health / wolf.max_health;
    
    // Retreat if low health and low morale
    if (health_percent < 0.3f && wolf.morale < 0.4f) {
        return true;
    }
    
    // Retreat if very low health regardless of morale
    if (health_percent < 0.15f) {
        return true;
    }
    
    return false;
}

// ============================================================================
// NEW SYSTEMS - Phase 2: Pack Intelligence & Reactive Combat
// ============================================================================

// Wolf type behavior preferences
WolfState WolfManager::get_preferred_state(const Wolf& wolf) const {
    float dist_to_player = get_distance_to_player(wolf);
    
    // Type-specific behavior preferences
    switch (wolf.type) {
        case WolfType::Alpha:
            // Prefers frontal assault, aggressive engagement
            if (dist_to_player < wolf.attack_range * 1.5f) {
                return WolfState::Attack;
            }
            return WolfState::Approach;
            
        case WolfType::Scout:
            // Hit-and-run, prefers flanking
            if (wolf.health < wolf.max_health * 0.5f) {
                return WolfState::Retreat;  // Break off when half health
            }
            if (dist_to_player < wolf.attack_range * 1.2f) {
                return WolfState::Strafe;  // Circle and strike
            }
            return WolfState::Approach;
            
        case WolfType::Hunter:
            // Waits for pack coordination, tactical
            if (wolf.pack_id > 0 && !wolf.pack_command_received) {
                return WolfState::Strafe;  // Wait for pack signal
            }
            return WolfState::Approach;
            
        default:
            // Normal wolves have no preference
            return WolfState::Idle;
    }
}

// Attack variety selection based on emotion and intelligence
uint8_t WolfManager::select_attack_type(const Wolf& wolf) const {
    // Desperate wolves use quick jabs
    if (wolf.emotion == EmotionalState::Desperate) {
        return static_cast<uint8_t>(AttackType::QuickJab);
    }
    
    // Intelligent wolves use feints if player blocks frequently
    if (wolf.intelligence > 0.7f && wolf.player_blocks > 2) {
        return static_cast<uint8_t>(AttackType::Feint);
    }
    
    // Confident/Aggressive wolves use power lunges
    if (wolf.emotion == EmotionalState::Confident || wolf.emotion == EmotionalState::Aggressive) {
        if (wolf.aggression > 0.6f) {
            return static_cast<uint8_t>(AttackType::PowerLunge);
        }
    }
    
    // Default to standard lunge
    return static_cast<uint8_t>(AttackType::StandardLunge);
}

// Spatial Awareness - Calculate separation force from nearby wolves
FixedVector3 WolfManager::calculate_separation_force(const Wolf& wolf) const {
    // Wolves should maintain at least 2x their collision radius apart
    constexpr float WOLF_RADIUS = 0.04f;  // Default wolf radius from physics
    constexpr float SEPARATION_DISTANCE = WOLF_RADIUS * 2.5f;  // ~0.1 units minimum spacing
    constexpr float SEPARATION_STRENGTH = 0.8f;  // Much stronger force (was 0.05)
    
    FixedVector3 separation_force = FixedVector3::zero();
    int nearby_count = 0;
    
    for (const Wolf& other : wolves_) {
        if (other.id == wolf.id) {
            continue;
        }
        
        Fixed dx = wolf.x - other.x;
        Fixed dy = wolf.y - other.y;
        Fixed dist_sq = dx * dx + dy * dy;
        Fixed separation_dist = Fixed::from_float(SEPARATION_DISTANCE);
        
        if (dist_sq < separation_dist * separation_dist && dist_sq.raw > 0) {
            Fixed dist = fixed_sqrt(dist_sq);
            // Normalize and apply force inversely proportional to distance
            FixedVector3 push_dir(dx / dist, dy / dist, Fixed::from_int(0));
            
            // Stronger force when closer - squared falloff for more aggressive separation
            Fixed normalized_overlap = (separation_dist - dist) / separation_dist;
            Fixed force_magnitude = normalized_overlap * normalized_overlap;  // Squared for stronger close-range
            
            separation_force += push_dir * force_magnitude;
            nearby_count++;
        }
    }
    
    if (nearby_count > 0) {
        // Apply strong separation force
        separation_force *= Fixed::from_float(SEPARATION_STRENGTH);
    }
    
    return separation_force;
}

// Check if wolf has clear path to player (simple line-of-sight)
bool WolfManager::has_clear_path_to_player(const Wolf& wolf) const {
    // Simplified: check if any other wolf is directly between this wolf and player
    if (!coordinator_) {
        return true;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    for (const Wolf& other : wolves_) {
        if (other.id == wolf.id) {
            continue;
        }
        
        // Check if other wolf is on the line between this wolf and player
        float wolf_to_player_x = player_x - wolf.x.to_float();
        float wolf_to_player_y = player_y - wolf.y.to_float();
        float wolf_to_other_x = other.x.to_float() - wolf.x.to_float();
        float wolf_to_other_y = other.y.to_float() - wolf.y.to_float();
        
        // Dot product to check if in same direction
        float dot = wolf_to_player_x * wolf_to_other_x + wolf_to_player_y * wolf_to_other_y;
        if (dot > 0.0f) {
            // Other wolf is in front, check if close to line
            float dist_to_line = std::abs(wolf_to_player_x * wolf_to_other_y - wolf_to_player_y * wolf_to_other_x);
            float line_length = std::sqrt(wolf_to_player_x * wolf_to_player_x + wolf_to_player_y * wolf_to_player_y);
            if (line_length > 0.0f && dist_to_line / line_length < 0.05f) {
                return false;  // Path blocked
            }
        }
    }
    
    return true;
}

// Calculate optimal attack angle based on pack positions
float WolfManager::get_optimal_attack_angle(const Wolf& wolf) const {
    if (!coordinator_) {
        return 0.0f;
    }
    
    float player_x = coordinator_->get_player_manager().get_x();
    float player_y = coordinator_->get_player_manager().get_y();
    
    // Start with preferred angle from memory
    float best_angle = wolf.preferred_attack_angle;
    
    // Check angles occupied by other wolves
    constexpr int NUM_ANGLES = 8;
    bool angle_occupied[NUM_ANGLES] = {false};
    
    for (const Wolf& other : wolves_) {
        if (other.id == wolf.id || other.pack_id != wolf.pack_id) {
            continue;
        }
        
        // Calculate angle of other wolf relative to player
        float dx = other.x.to_float() - player_x;
        float dy = other.y.to_float() - player_y;
        float angle = std::atan2(dy, dx);
        
        // Mark this angle sector as occupied
        int sector = static_cast<int>((angle + PI) / (2.0f * PI / NUM_ANGLES)) % NUM_ANGLES;
        angle_occupied[sector] = true;
    }
    
    // Find first unoccupied angle
    for (int i = 0; i < NUM_ANGLES; i++) {
        if (!angle_occupied[i]) {
            best_angle = (2.0f * PI * i / NUM_ANGLES) - PI;
            break;
        }
    }
    
    return best_angle;
}

// Update spatial awareness - apply separation forces
void WolfManager::update_wolf_spatial_awareness(Wolf& wolf, float delta_time) {
    FixedVector3 separation = calculate_separation_force(wolf);
    
    // Apply separation force to velocity
    wolf.vx += separation.x * Fixed::from_float(delta_time);
    wolf.vy += separation.y * Fixed::from_float(delta_time);
}

// Interrupt-Based State Transitions
bool WolfManager::check_interrupt_conditions(Wolf& wolf, WolfState& out_new_state) {
    float health_percent = wolf.health / wolf.max_health;
    float dist_to_player = get_distance_to_player(wolf);
    
    // Priority 1: Critical health - always retreat
    if (health_percent < 0.2f && wolf.state != WolfState::Retreat) {
        out_new_state = WolfState::Retreat;
        interrupt_critical_health_count_++;
        return true;
    }
    
    // Priority 2: Pack command for coordinated attack
    if (wolf.pack_command_received && wolf.attack_cooldown <= 0.0f) {
        out_new_state = WolfState::Attack;
        wolf.pack_command_received = false;
        interrupt_pack_command_count_++;
        return true;
    }
    
    // Priority 3: Player suddenly too close
    if (dist_to_player < wolf.attack_range * 0.7f && wolf.state == WolfState::Patrol) {
        out_new_state = WolfState::Strafe;
        interrupt_close_proximity_count_++;
        return true;
    }
    
    // Priority 4: Damaged while attacking - recover based on damage delta
    if (wolf.state == WolfState::Attack) {
        float damage_taken = wolf.health_at_state_enter - wolf.health;
        if (damage_taken >= DAMAGE_INTERRUPT_THRESHOLD) {
            out_new_state = WolfState::Recover;
            interrupt_damage_count_++;
            return true;
        }
    }
    
    return false;
}

// ============================================================================
// ANIMATION STATE GETTERS (for WASM exports)
// ============================================================================

float WolfManager::get_wolf_leg_x(int index, int leg) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size()) || 
        leg < 0 || leg >= 4) return 0.0f;
    return wolves_[index].leg_positions[leg][0];
}

float WolfManager::get_wolf_leg_y(int index, int leg) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size()) || 
        leg < 0 || leg >= 4) return 0.0f;
    return wolves_[index].leg_positions[leg][1];
}

float WolfManager::get_wolf_body_bob(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) return 0.0f;
    return wolves_[index].body_bob;
}

float WolfManager::get_wolf_head_pitch(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) return 0.0f;
    return wolves_[index].head_pitch;
}

float WolfManager::get_wolf_head_yaw(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) return 0.0f;
    return wolves_[index].head_yaw;
}

float WolfManager::get_wolf_tail_wag(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) return 0.0f;
    return wolves_[index].tail_wag;
}

float WolfManager::get_wolf_ear_rotation(int index, int ear) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size()) || 
        ear < 0 || ear >= 2) return 0.0f;
    return wolves_[index].ear_rotation[ear];
}

float WolfManager::get_wolf_body_stretch(int index) const {
    if (index < 0 || index >= static_cast<int>(wolves_.size())) return 0.0f;
    return wolves_[index].body_stretch;
}


