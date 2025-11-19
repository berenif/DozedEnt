#include "GameCoordinator.h"
#include "../physics/PhysicsEvents.h"
#include "../physics/PhysicsConstants.h"
#include <cmath>

GameCoordinator::GameCoordinator() {
    // Managers are initialized with their default constructors
}

void GameCoordinator::initialize(unsigned long long seed, unsigned int start_weapon) {
    // Initialize physics first (deterministic foundation)
    PhysicsConfig physics_config;
    
    // Enable gravity for physics demos and realistic physics
    physics_config.gravity = FixedVector3::from_floats(0.0f, -9.81f, 0.0f);
    
    physics_manager_.initialize(physics_config);
    
    // Wire dependencies between managers
    combat_manager_.set_physics_manager(&physics_manager_);
    combat_manager_.set_player_manager(&player_manager_);
    combat_manager_.set_game_state_manager(&game_state_manager_);
    
    input_manager_.set_combat_manager(&combat_manager_);
    
    // Initialize game state
    game_state_manager_.initialize(seed, start_weapon);
    
    // Initialize wolf manager
    wolf_manager_.initialize(this);
    arm_manager_.initialize(&physics_manager_, &player_manager_);
    
    // Reset all managers to clean state
    player_manager_.reset_to_spawn();
    input_manager_.clear_input_latches();
    
    // TODO: Initialize other systems (world, etc.)
    
    is_initialized_ = true;
}

void GameCoordinator::shutdown() {
    game_state_manager_.shutdown();
    is_initialized_ = false;
}

void GameCoordinator::reset(unsigned long long new_seed) {
    if (!is_initialized_) return;
    
    // Reset physics
    physics_manager_.reset();
    
    // Reset game state
    game_state_manager_.reset(new_seed);
    
    // Reset all managers
    player_manager_.reset_to_spawn();
    input_manager_.clear_input_latches();
    wolf_manager_.clear_all();
    
    // TODO: Reset other systems
}

void GameCoordinator::update(float delta_time) {
    if (!is_initialized_ || game_state_manager_.is_paused()) return;
    
    // Update physics first (deterministic fixed timestep)
    physics_manager_.update(delta_time);
    
    // Update in coordinated order
    update_input_processing(delta_time);
    update_player_systems(delta_time);
    update_combat_systems(delta_time);
    wolf_manager_.update(delta_time);  // Update wolf AI and behavior
    arm_manager_.update(delta_time);
    update_game_state(delta_time);
    
    // Coordinate cross-system interactions
    coordinate_player_input();
    coordinate_combat_actions();
    coordinate_movement_and_combat();
    coordinate_stamina_consumption();
    
    // Process physics collision events
    process_collision_events();
    
    // Synchronize states between managers
    synchronize_manager_states();
}

void GameCoordinator::set_player_input(float input_x, float input_y, int rolling, int jumping,
                                      int light_attack, int heavy_attack, int blocking, int special) {
    input_manager_.update_input(input_x, input_y, rolling, jumping, 
                               light_attack, heavy_attack, blocking, special);
}

void GameCoordinator::update_input_processing(float delta_time) {
    // Input manager handles its own validation and normalization
    // No additional processing needed here
}

void GameCoordinator::update_player_systems(float delta_time) {
    // Update player manager with current input
    const auto& input_state = input_manager_.get_input_state();
    player_manager_.update_movement(input_state.movement_x, input_state.movement_y, delta_time);
    player_manager_.update(delta_time);
}

void GameCoordinator::update_combat_systems(float delta_time) {
    combat_manager_.update(delta_time);
}

void GameCoordinator::update_game_state(float delta_time) {
    game_state_manager_.update(delta_time);
}

void GameCoordinator::coordinate_player_input() {
    const auto& input_state = input_manager_.get_input_state();
    
    // Handle attack inputs
    handle_attack_inputs();
    
    // Handle defensive inputs
    handle_defensive_inputs();
    
    // Handle movement abilities
    if (input_state.is_jumping && player_manager_.can_jump()) {
        player_manager_.apply_jump();
    }
    
    if (input_state.is_rolling && combat_manager_.try_roll()) {
        // Roll was successful, no additional action needed
    }
}

void GameCoordinator::coordinate_combat_actions() {
    // This method coordinates combat actions between combat manager and other systems
    // For example, applying damage to enemies, handling combat effects, etc.
    
    // TODO: Coordinate with enemy systems
    // TODO: Handle combat effects on environment
}

void GameCoordinator::coordinate_movement_and_combat() {
    // Coordinate movement restrictions based on combat state
    const auto& combat_state = combat_manager_.get_state();
    auto& player_state = player_manager_.get_state_mutable();
    
    // Reset speed multiplier each frame
    player_state.speed_multiplier = 1.0f;
    
    // Reduce movement speed during attacks
    if (combat_state.attack_state != CombatManager::AttackState::Idle) {
        if (combat_state.attack_state == CombatManager::AttackState::Windup) {
            player_state.speed_multiplier = 0.5f;  // 50% speed during windup
        } else if (combat_state.attack_state == CombatManager::AttackState::Active) {
            player_state.speed_multiplier = 0.3f;  // 30% speed during active attack
        } else if (combat_state.attack_state == CombatManager::AttackState::Recovery) {
            player_state.speed_multiplier = 0.6f;  // 60% speed during recovery
        }
    }
    
    // Reduce movement speed while blocking (doesn't stack with attack speed reduction)
    if (combat_state.is_blocking && combat_state.attack_state == CombatManager::AttackState::Idle) {
        player_state.speed_multiplier = 0.4f;  // 40% speed while blocking
    }
}

void GameCoordinator::coordinate_stamina_consumption() {
    // Ensure stamina consumption is properly coordinated between systems
    // This is currently handled within individual managers, but could be centralized here
    
    // TODO: Implement centralized stamina management if needed
}

void GameCoordinator::handle_attack_inputs() {
    const auto& input_state = input_manager_.get_input_state();
    
    if (input_state.light_attack) {
        combat_manager_.try_light_attack();
    }
    
    if (input_state.heavy_attack) {
        // Check if we can feint a heavy attack
        if (input_state.is_blocking && combat_manager_.can_feint_heavy()) {
            combat_manager_.feint_heavy_attack();
        } else {
            combat_manager_.try_heavy_attack();
        }
    }
    
    if (input_state.special_attack) {
        combat_manager_.try_special_attack();
    }
}

void GameCoordinator::handle_movement_inputs(float delta_time) {
    const auto& input_state = input_manager_.get_input_state();
    
    // Movement is handled in update_player_systems
    // This method can handle special movement cases
    
    if (player_manager_.can_wall_slide()) {
        player_manager_.apply_wall_slide(delta_time);
    }
}

void GameCoordinator::handle_defensive_inputs() {
    const auto& input_state = input_manager_.get_input_state();
    
    if (input_state.is_blocking) {
        float current_time = game_state_manager_.get_game_time();
        // Use player's current facing direction for blocking
        float face_x = player_manager_.get_facing_x();
        float face_y = player_manager_.get_facing_y();
        combat_manager_.try_block(face_x, face_y, current_time);
    } else {
        combat_manager_.stop_blocking();
    }
}

void GameCoordinator::synchronize_manager_states() {
    // Synchronize any shared state between managers
    // For example, ensuring player position is consistent across systems
    
    // TODO: Implement state synchronization as needed
    // This might include updating global variables for WASM exports
}

void GameCoordinator::process_collision_events() {
    // Get collision events from physics system
    auto& event_queue = GetPhysicsEventQueue();
    int event_count = event_queue.count();
    const CollisionEvent* events = event_queue.data();
    
    // Process each collision event
    for (int i = 0; i < event_count; i++) {
        const CollisionEvent& event = events[i];
        
        // Check if collision involves player (player body ID is 0)
        const uint32_t playerBodyId = PhysicsConstants::kPlayerBodyId;
        bool player_is_bodyA = (event.bodyA == playerBodyId);
        bool player_is_bodyB = (event.bodyB == playerBodyId);
        
        if (player_is_bodyA || player_is_bodyB) {
            const uint32_t other_body_id = player_is_bodyA ? event.bodyB : event.bodyA;
            const Wolf* wolf = wolf_manager_.find_wolf_by_body(other_body_id);
            if (wolf) {
                handle_player_wolf_collision(other_body_id, event.impulse);
            }
        } else {
            // Check for wolf-wolf collisions
            const Wolf* wolfA = wolf_manager_.find_wolf_by_body(event.bodyA);
            const Wolf* wolfB = wolf_manager_.find_wolf_by_body(event.bodyB);
            
            if (wolfA && wolfB) {
                handle_wolf_wolf_collision(event.bodyA, event.bodyB, event.impulse);
            }
        }
    }
    
    // Clear processed events
    event_queue.clear();
}

void GameCoordinator::handle_wolf_wolf_collision(uint32_t wolf_body_a, uint32_t wolf_body_b, float impulse_magnitude) {
    // Set collision cooldown on both wolves to prevent sticking
    const float WOLF_COLLISION_COOLDOWN = 0.4f;  // 400ms cooldown for wolf-wolf collisions (increased)
    wolf_manager_.set_wolf_collision_cooldown(wolf_body_a, WOLF_COLLISION_COOLDOWN);
    wolf_manager_.set_wolf_collision_cooldown(wolf_body_b, WOLF_COLLISION_COOLDOWN);
    
    #ifdef DEBUG_COLLISIONS
    printf("[GameCoordinator] Wolf-Wolf collision: bodies %u <-> %u, impulse=%.3f\n", 
           wolf_body_a, wolf_body_b, impulse_magnitude);
    #endif
    
    // Wolf-wolf collisions don't deal damage, physics separation is enough
    // The cooldown prevents them from immediately moving back toward the same target
}

void GameCoordinator::handle_player_wolf_collision(uint32_t wolf_body_id, float impulse_magnitude) {
    // Set collision cooldown on the wolf to prevent immediate re-collision
    const float COLLISION_COOLDOWN = 0.5f;  // 500ms cooldown after collision (increased)
    wolf_manager_.set_wolf_collision_cooldown(wolf_body_id, COLLISION_COOLDOWN);
    
    #ifdef DEBUG_COLLISIONS
    printf("[GameCoordinator] Player-Wolf collision: body %u, impulse=%.3f\n", 
           wolf_body_id, impulse_magnitude);
    #endif
    
    // Find the wolf that owns this physics body
    int wolf_count = wolf_manager_.get_wolf_count();
    Wolf* colliding_wolf = nullptr;
    
    for (int i = 0; i < wolf_count; i++) {
        Wolf* wolf = wolf_manager_.get_wolf_mutable(i);
        if (wolf && wolf->physics_body_id == wolf_body_id) {
            colliding_wolf = wolf;
            break;
        }
    }
    
    if (!colliding_wolf) {
        return;
    }
    
    // Calculate collision damage based on wolf state and impulse
    float base_damage = 5.0f;  // Base collision damage
    float damage = base_damage;
    
    // If wolf is attacking, deal more damage
    if (colliding_wolf->state == WolfState::Attack) {
        damage = colliding_wolf->damage;  // Use wolf's full attack damage
    } else {
        // Scale damage by collision impulse (stronger collision = more damage)
        float impulse_scale = impulse_magnitude * 0.5f;  // Scale factor
        damage = base_damage * (1.0f + impulse_scale);
    }
    
    // Clamp damage to reasonable range
    damage = std::max(1.0f, std::min(damage, 50.0f));
    
    // Check if player is blocking
    const auto& combat_state = combat_manager_.get_state();
    if (combat_state.is_blocking) {
        // Calculate if block is effective (wolf must be in front of player)
        float player_x = player_manager_.get_x();
        float player_y = player_manager_.get_y();
        float player_face_x = player_manager_.get_facing_x();
        float player_face_y = player_manager_.get_facing_y();
        
        // Direction from player to wolf
        float dx = colliding_wolf->x.to_float() - player_x;
        float dy = colliding_wolf->y.to_float() - player_y;
        float dist = std::sqrt(dx * dx + dy * dy);
        
        if (dist > 0.001f) {
            dx /= dist;
            dy /= dist;
            
            // Dot product to check if wolf is in front
            float dot = dx * player_face_x + dy * player_face_y;
            
            if (dot > 0.5f) {  // Wolf is in front (within ~60 degree cone)
                // Successful block - reduce damage significantly
                damage *= 0.2f;  // Block absorbs 80% of damage
                
                // Consume stamina for blocking
                player_manager_.consume_stamina(0.1f);
            }
        }
    }
    
    // Apply damage to player
    player_manager_.take_damage(damage);
    
    // Track collision for wolf AI
    if (colliding_wolf->state == WolfState::Attack) {
        colliding_wolf->successful_attacks++;
    }
}


