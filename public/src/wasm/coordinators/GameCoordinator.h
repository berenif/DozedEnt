#pragma once

#include "../managers/InputManager.h"
#include "../managers/PlayerManager.h"
#include "../managers/CombatManager.h"
#include "../managers/GameStateManager.h"
#include "../managers/WolfManager.h"
#include "../managers/ArmManager.h"
#include "../physics/PhysicsManager.h"

/**
 * GameCoordinator - Main coordinator that orchestrates all game systems
 * Follows coordinator pattern to manage interactions between managers
 */
class GameCoordinator {
public:
    GameCoordinator();
    ~GameCoordinator() = default;

    // Core lifecycle
    void initialize(unsigned long long seed, unsigned int start_weapon);
    void shutdown();
    void reset(unsigned long long new_seed);
    
    // Main update loop
    void update(float delta_time);
    
    // Input handling
    void set_player_input(float input_x, float input_y, int rolling, int jumping,
                         int light_attack, int heavy_attack, int blocking, int special);
    
    // Manager access (for WASM exports)
    InputManager& get_input_manager() { return input_manager_; }
    PlayerManager& get_player_manager() { return player_manager_; }
    CombatManager& get_combat_manager() { return combat_manager_; }
    GameStateManager& get_game_state_manager() { return game_state_manager_; }
    PhysicsManager& get_physics_manager() { return physics_manager_; }
    WolfManager& get_wolf_manager() { return wolf_manager_; }
    
    const InputManager& get_input_manager() const { return input_manager_; }
    const PlayerManager& get_player_manager() const { return player_manager_; }
    const CombatManager& get_combat_manager() const { return combat_manager_; }
    const GameStateManager& get_game_state_manager() const { return game_state_manager_; }
    const PhysicsManager& get_physics_manager() const { return physics_manager_; }
    const WolfManager& get_wolf_manager() const { return wolf_manager_; }

private:
    // Manager instances
    InputManager input_manager_;
    PlayerManager player_manager_;
    CombatManager combat_manager_;
    GameStateManager game_state_manager_;
    PhysicsManager physics_manager_;
    WolfManager wolf_manager_;
    ArmManager arm_manager_;
    
    // Coordination state
    bool is_initialized_ = false;
    
    // Update coordination
    void update_input_processing(float delta_time);
    void update_player_systems(float delta_time);
    void update_combat_systems(float delta_time);
    void update_game_state(float delta_time);
    
    // Cross-system coordination
    void coordinate_player_input();
    void coordinate_combat_actions();
    void coordinate_movement_and_combat();
    void coordinate_stamina_consumption();
    void process_collision_events();
    
    // Helper methods
    void handle_attack_inputs();
    void handle_movement_inputs(float delta_time);
    void handle_defensive_inputs();
    void synchronize_manager_states();
    void handle_player_wolf_collision(uint32_t wolf_body_id, float impulse_magnitude);
    void handle_wolf_wolf_collision(uint32_t wolf_body_a, uint32_t wolf_body_b, float impulse_magnitude);
public:
    ArmManager& get_arm_manager() { return arm_manager_; }
    const ArmManager& get_arm_manager() const { return arm_manager_; }
};

