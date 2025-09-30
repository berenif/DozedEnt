/**
 * game_refactored.cpp - Modular game implementation
 * 
 * This file demonstrates the refactored architecture following the user's guidelines:
 * - Single responsibility principle
 * - Manager/Coordinator patterns
 * - Modular design with clear separation of concerns
 * - Functions and classes under size limits
 * - Descriptive naming conventions
 */

#include <cmath>
#include "coordinators/GameCoordinator.h"
#include "GameGlobals.h"
#include "physics/PhysicsManager.h"
#include "physics/PhysicsTypes.h"

// Initialize global coordinator
GameCoordinator g_coordinator;

int main() { 
    return 0; 
}

// ============================================================================
// WASM Export Functions - Thin wrappers around coordinator methods
// ============================================================================

extern "C" {

// ---- Core Lifecycle Functions ----

__attribute__((export_name("init_run")))
void init_run(unsigned long long seed, unsigned int start_weapon) {
    g_coordinator.initialize(seed, start_weapon);
}

__attribute__((export_name("reset_run")))
void reset_run(unsigned long long new_seed) {
    g_coordinator.reset(new_seed);
}

__attribute__((export_name("update")))
void update(float delta_time) {
    g_coordinator.update(delta_time);
}

// ---- Input Functions ----

__attribute__((export_name("set_player_input")))
void set_player_input(float input_x, float input_y, int rolling, int jumping,
                     int light_attack, int heavy_attack, int blocking, int special) {
    g_coordinator.set_player_input(input_x, input_y, rolling, jumping,
                                  light_attack, heavy_attack, blocking, special);
}

// ---- Player State Getters ----

__attribute__((export_name("get_x")))
float get_x() {
    return g_coordinator.get_player_manager().get_x();
}

__attribute__((export_name("get_y")))
float get_y() {
    return g_coordinator.get_player_manager().get_y();
}

__attribute__((export_name("get_vel_x")))
float get_vel_x() {
    return g_coordinator.get_player_manager().get_vel_x();
}

__attribute__((export_name("get_vel_y")))
float get_vel_y() {
    return g_coordinator.get_player_manager().get_vel_y();
}

__attribute__((export_name("get_stamina")))
float get_stamina() {
    return g_coordinator.get_player_manager().get_stamina();
}

__attribute__((export_name("get_hp")))
float get_hp() {
    return g_coordinator.get_player_manager().get_hp();
}

__attribute__((export_name("get_is_grounded")))
int get_is_grounded() {
    return g_coordinator.get_player_manager().is_grounded() ? 1 : 0;
}

__attribute__((export_name("get_jump_count")))
int get_jump_count() {
    return g_coordinator.get_player_manager().get_jump_count();
}

__attribute__((export_name("get_is_wall_sliding")))
int get_is_wall_sliding() {
    return g_coordinator.get_player_manager().is_wall_sliding() ? 1 : 0;
}

__attribute__((export_name("get_speed")))
float get_speed() {
    return g_coordinator.get_player_manager().get_speed();
}

// ---- Game State Getters ----

__attribute__((export_name("get_phase")))
int get_phase() {
    return static_cast<int>(g_coordinator.get_game_state_manager().get_current_phase());
}

__attribute__((export_name("get_room_count")))
int get_room_count() {
    return g_coordinator.get_game_state_manager().get_room_count();
}

__attribute__((export_name("get_current_biome")))
int get_current_biome() {
    return static_cast<int>(g_coordinator.get_game_state_manager().get_current_biome());
}

__attribute__((export_name("get_time_seconds")))
float get_time_seconds() {
    return g_coordinator.get_game_state_manager().get_game_time();
}

__attribute__((export_name("get_gold")))
int get_gold() {
    return g_coordinator.get_game_state_manager().get_gold();
}

__attribute__((export_name("get_essence")))
int get_essence() {
    return g_coordinator.get_game_state_manager().get_essence();
}

// ---- Combat State Getters ----

__attribute__((export_name("get_attack_state")))
int get_attack_state() {
    return static_cast<int>(g_coordinator.get_combat_manager().get_attack_state());
}

__attribute__((export_name("get_roll_state")))
int get_roll_state() {
    return static_cast<int>(g_coordinator.get_combat_manager().get_roll_state());
}

__attribute__((export_name("get_is_rolling")))
int get_is_rolling() {
    return g_coordinator.get_combat_manager().is_roll_sliding() ? 1 : 0;
}

__attribute__((export_name("get_is_invulnerable")))
int get_is_invulnerable() {
    return g_coordinator.get_combat_manager().is_invulnerable() ? 1 : 0;
}

__attribute__((export_name("get_block_state")))
int get_block_state() {
    return g_coordinator.get_combat_manager().is_blocking() ? 1 : 0;
}

__attribute__((export_name("get_combo_count")))
int get_combo_count() {
    return g_coordinator.get_combat_manager().get_combo_count();
}

__attribute__((export_name("get_can_counter")))
int get_can_counter() {
    return g_coordinator.get_combat_manager().can_counter() ? 1 : 0;
}

__attribute__((export_name("get_has_hyperarmor")))
int get_has_hyperarmor() {
    return g_coordinator.get_combat_manager().has_hyperarmor() ? 1 : 0;
}

__attribute__((export_name("get_armor_value")))
float get_armor_value() {
    return g_coordinator.get_combat_manager().get_armor_value();
}

// ---- Combat Action Functions ----

__attribute__((export_name("on_light_attack")))
int on_light_attack() {
    return g_coordinator.get_combat_manager().try_light_attack() ? 1 : 0;
}

__attribute__((export_name("on_heavy_attack")))
int on_heavy_attack() {
    return g_coordinator.get_combat_manager().try_heavy_attack() ? 1 : 0;
}

__attribute__((export_name("on_special_attack")))
int on_special_attack() {
    return g_coordinator.get_combat_manager().try_special_attack() ? 1 : 0;
}

__attribute__((export_name("on_roll_start")))
int on_roll_start() {
    return g_coordinator.get_combat_manager().try_roll() ? 1 : 0;
}

__attribute__((export_name("can_feint_heavy")))
int can_feint_heavy() {
    return g_coordinator.get_combat_manager().can_feint_heavy() ? 1 : 0;
}

__attribute__((export_name("set_blocking")))
int set_blocking(int on, float face_x, float face_y, float now_seconds) {
    if (on) {
        return g_coordinator.get_combat_manager().try_block(face_x, face_y, now_seconds) ? 1 : 0;
    } else {
        g_coordinator.get_combat_manager().stop_blocking();
        return 0;
    }
}

__attribute__((export_name("handle_incoming_attack")))
int handle_incoming_attack(float attack_x, float attack_y, float dir_x, float dir_y, float now_seconds) {
    auto result = g_coordinator.get_combat_manager().handle_incoming_attack(
        attack_x, attack_y, dir_x, dir_y, now_seconds);
    return static_cast<int>(result);
}

// ---- Timing Getters ----

__attribute__((export_name("get_attack_cooldown")))
float get_attack_cooldown() {
    return g_coordinator.get_combat_manager().get_attack_cooldown();
}

__attribute__((export_name("get_roll_cooldown")))
float get_roll_cooldown() {
    return g_coordinator.get_combat_manager().get_roll_cooldown();
}

__attribute__((export_name("get_parry_window")))
float get_parry_window() {
    return g_coordinator.get_combat_manager().get_parry_window();
}

__attribute__((export_name("get_combo_window_remaining")))
float get_combo_window_remaining() {
    return g_coordinator.get_combat_manager().get_combo_window_remaining();
}

__attribute__((export_name("get_counter_window_remaining")))
float get_counter_window_remaining() {
    return g_coordinator.get_combat_manager().get_counter_window_remaining();
}

// ---- Phase Management Functions ----

__attribute__((export_name("force_phase_transition")))
void force_phase_transition(int target_phase) {
    auto phase = static_cast<GameStateManager::GamePhase>(target_phase);
    g_coordinator.get_game_state_manager().force_phase_transition(phase);
}

// ---- Utility Functions ----

__attribute__((export_name("clear_input_latch")))
void clear_input_latch() {
    g_coordinator.get_input_manager().clear_input_latches();
}

// ---- Legacy Compatibility Functions ----

__attribute__((export_name("on_attack")))
int on_attack() {
    // Legacy function - delegates to light attack
    return on_light_attack();
}

__attribute__((export_name("start")))
void start() {
    // Legacy function - reset player to spawn
    // This would need to be implemented in PlayerManager
}

// ---- Physics System Functions ----

__attribute__((export_name("apply_physics_knockback")))
void apply_physics_knockback(float dx, float dy, float force) {
    g_coordinator.get_combat_manager().apply_knockback_impulse(dx, dy, force);
}

__attribute__((export_name("get_physics_player_x")))
float get_physics_player_x() {
    const RigidBody* body = g_coordinator.get_physics_manager().get_body(0);
    return body ? body->position.x.to_float() : 0.5f;
}

__attribute__((export_name("get_physics_player_y")))
float get_physics_player_y() {
    const RigidBody* body = g_coordinator.get_physics_manager().get_body(0);
    return body ? body->position.y.to_float() : 0.5f;
}

__attribute__((export_name("get_physics_player_vel_x")))
float get_physics_player_vel_x() {
    const RigidBody* body = g_coordinator.get_physics_manager().get_body(0);
    return body ? body->velocity.x.to_float() : 0.0f;
}

__attribute__((export_name("get_physics_player_vel_y")))
float get_physics_player_vel_y() {
    const RigidBody* body = g_coordinator.get_physics_manager().get_body(0);
    return body ? body->velocity.y.to_float() : 0.0f;
}

__attribute__((export_name("get_physics_perf_ms")))
float get_physics_perf_ms() {
    return g_coordinator.get_physics_manager().get_last_step_time_ms();
}

// ---- Enemy Physics Functions ----

__attribute__((export_name("create_enemy_body")))
uint32_t create_enemy_body(int enemy_index, float x, float y, float mass, float radius) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    // Create physics body for enemy
    RigidBody enemy_body;
    enemy_body.position = FixedVector3::from_floats(x, y, 0.0f);
    enemy_body.mass = Fixed::from_float(mass);
    enemy_body.inverse_mass = Fixed::from_float(1.0f / mass);
    enemy_body.drag = Fixed::from_float(0.92f);  // Slightly less drag than player
    enemy_body.radius = Fixed::from_float(radius);
    
    uint32_t body_id = physics_mgr.create_body(enemy_body);
    
    // Register with game state manager
    game_state_mgr.register_enemy_body(enemy_index, body_id);
    
    return body_id;
}

__attribute__((export_name("destroy_enemy_body")))
void destroy_enemy_body(int enemy_index) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    uint32_t body_id = game_state_mgr.get_enemy_body_id(enemy_index);
    if (body_id > 0) {
        physics_mgr.destroy_body(body_id);
        game_state_mgr.unregister_enemy_body(enemy_index);
    }
}

__attribute__((export_name("get_enemy_body_x")))
float get_enemy_body_x(int enemy_index) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    uint32_t body_id = game_state_mgr.get_enemy_body_id(enemy_index);
    if (body_id > 0) {
        const RigidBody* body = physics_mgr.get_body(body_id);
        if (body) {
            return body->position.x.to_float();
        }
    }
    
    return 0.0f;
}

__attribute__((export_name("get_enemy_body_y")))
float get_enemy_body_y(int enemy_index) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    uint32_t body_id = game_state_mgr.get_enemy_body_id(enemy_index);
    if (body_id > 0) {
        const RigidBody* body = physics_mgr.get_body(body_id);
        if (body) {
            return body->position.y.to_float();
        }
    }
    
    return 0.0f;
}

__attribute__((export_name("apply_enemy_knockback")))
void apply_enemy_knockback(int enemy_index, float dir_x, float dir_y, float force) {
    auto& combat_mgr = g_coordinator.get_combat_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    uint32_t body_id = game_state_mgr.get_enemy_body_id(enemy_index);
    if (body_id > 0) {
        combat_mgr.apply_enemy_knockback(body_id, dir_x, dir_y, force);
    }
}

__attribute__((export_name("apply_attack_lunge")))
void apply_attack_lunge(float facing_x, float facing_y, int is_heavy) {
    auto& combat_mgr = g_coordinator.get_combat_manager();
    combat_mgr.apply_attack_lunge(facing_x, facing_y, is_heavy != 0);
}

__attribute__((export_name("set_enemy_body_position")))
void set_enemy_body_position(int enemy_index, float x, float y) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& game_state_mgr = g_coordinator.get_game_state_manager();
    
    uint32_t body_id = game_state_mgr.get_enemy_body_id(enemy_index);
    if (body_id > 0) {
        physics_mgr.set_position(body_id, FixedVector3::from_floats(x, y, 0.0f));
    }
}

__attribute__((export_name("get_enemy_body_count")))
int get_enemy_body_count() {
    return g_coordinator.get_game_state_manager().get_enemy_count();
}

__attribute__((export_name("clear_all_enemy_bodies")))
void clear_all_enemy_bodies() {
    g_coordinator.get_game_state_manager().clear_all_enemy_bodies();
}

__attribute__((export_name("sync_player_position_from_physics")))
void sync_player_position_from_physics() {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    auto& player_mgr = g_coordinator.get_player_manager();
    
    // Get player body (ID 0)
    const RigidBody* player_body = physics_mgr.get_body(0);
    if (player_body) {
        // TODO: Add method to PlayerManager to set position from physics
        // For now, physics is the authority for position
    }
}

} // extern "C"

// ============================================================================
// Architecture Notes
// ============================================================================

/*
 * This refactored implementation demonstrates several key improvements:
 * 
 * 1. SINGLE RESPONSIBILITY:
 *    - InputManager: Only handles input processing and validation
 *    - PlayerManager: Only manages player state and movement
 *    - CombatManager: Only handles combat mechanics
 *    - GameStateManager: Only manages game state and phases
 *    - GameCoordinator: Only orchestrates interactions between managers
 * 
 * 2. MODULAR DESIGN:
 *    - Each manager is self-contained and testable
 *    - Clear interfaces between components
 *    - Easy to extend or replace individual systems
 * 
 * 3. MANAGER/COORDINATOR PATTERNS:
 *    - Managers handle specific domains
 *    - Coordinator orchestrates interactions
 *    - Clear separation between business logic and coordination
 * 
 * 4. FILE SIZE MANAGEMENT:
 *    - Main file is now ~300 lines (vs original 2744)
 *    - Each manager file is under 500 lines
 *    - Easy to maintain and understand
 * 
 * 5. SCALABILITY:
 *    - Easy to add new managers (EnemyManager, AudioManager, etc.)
 *    - Clear extension points for new features
 *    - Dependency injection ready architecture
 * 
 * 6. TESTABILITY:
 *    - Each manager can be unit tested independently
 *    - Clear interfaces make mocking easy
 *    - Coordinator can be integration tested
 */

