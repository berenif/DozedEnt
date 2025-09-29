#include "GameCoordinator.h"

GameCoordinator::GameCoordinator() {
    // Managers are initialized with their default constructors
}

void GameCoordinator::initialize(unsigned long long seed, unsigned int start_weapon) {
    // Initialize game state first
    game_state_manager_.initialize(seed, start_weapon);
    
    // Reset all managers to clean state
    player_manager_.reset_to_spawn();
    input_manager_.clear_input_latches();
    
    // TODO: Initialize other systems (enemies, world, etc.)
    
    is_initialized_ = true;
}

void GameCoordinator::shutdown() {
    game_state_manager_.shutdown();
    is_initialized_ = false;
}

void GameCoordinator::reset(unsigned long long new_seed) {
    if (!is_initialized_) return;
    
    // Reset game state
    game_state_manager_.reset(new_seed);
    
    // Reset all managers
    player_manager_.reset_to_spawn();
    input_manager_.clear_input_latches();
    
    // TODO: Reset other systems
}

void GameCoordinator::update(float delta_time) {
    if (!is_initialized_ || game_state_manager_.is_paused()) return;
    
    // Update in coordinated order
    update_input_processing(delta_time);
    update_player_systems(delta_time);
    update_combat_systems(delta_time);
    update_game_state(delta_time);
    
    // Coordinate cross-system interactions
    coordinate_player_input();
    coordinate_combat_actions();
    coordinate_movement_and_combat();
    coordinate_stamina_consumption();
    
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
    
    // Modify player movement based on combat state
    if (combat_state.attack_state != CombatManager::AttackState::Idle) {
        // Reduce movement speed during attacks
        // TODO: Apply movement restrictions to player manager
    }
    
    if (combat_state.is_blocking) {
        // Reduce movement speed while blocking
        // TODO: Apply blocking movement restrictions
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
        // TODO: Get current game time
        float current_time = game_state_manager_.get_game_time();
        combat_manager_.try_block(0.0f, 0.0f, current_time);  // TODO: Get facing direction
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

