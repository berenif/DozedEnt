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
#include <vector>
#include "coordinators/GameCoordinator.h"
#include "GameGlobals.h"
#include "physics/PhysicsManager.h"
#include "physics/PhysicsTypes.h"
#include "../entities/PhysicsBarrel.h"

// Initialize global coordinator
GameCoordinator g_coordinator;

// Barrel management
static std::vector<PhysicsBarrel> g_barrels;

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

__attribute__((export_name("get_facing_x")))
float get_facing_x() {
    return g_coordinator.get_player_manager().get_facing_x();
}

__attribute__((export_name("get_facing_y")))
float get_facing_y() {
    return g_coordinator.get_player_manager().get_facing_y();
}

// ---- Warden Shoulder Bash Abilities ----

__attribute__((used)) __attribute__((export_name("start_charging_bash")))
void start_charging_bash() {
    g_coordinator.get_player_manager().start_charging_bash();
}

__attribute__((used)) __attribute__((export_name("release_bash")))
void release_bash() {
    g_coordinator.get_player_manager().release_bash();
}

__attribute__((used)) __attribute__((export_name("get_bash_charge_level")))
float get_bash_charge_level() {
    return g_coordinator.get_player_manager().get_bash_charge_level();
}

__attribute__((used)) __attribute__((export_name("is_bash_active")))
int is_bash_active() {
    return g_coordinator.get_player_manager().is_bash_active() ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("is_bash_charging")))
int is_bash_charging() {
    return g_coordinator.get_player_manager().is_bash_charging() ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("get_bash_targets_hit")))
int get_bash_targets_hit() {
    return g_coordinator.get_player_manager().get_bash_targets_hit();
}

__attribute__((used)) __attribute__((export_name("get_bash_hitbox_x")))
float get_bash_hitbox_x() {
    return g_coordinator.get_player_manager().get_bash_hitbox().x;
}

__attribute__((used)) __attribute__((export_name("get_bash_hitbox_y")))
float get_bash_hitbox_y() {
    return g_coordinator.get_player_manager().get_bash_hitbox().y;
}

__attribute__((used)) __attribute__((export_name("get_bash_hitbox_radius")))
float get_bash_hitbox_radius() {
    return g_coordinator.get_player_manager().get_bash_hitbox().radius;
}

__attribute__((used)) __attribute__((export_name("is_bash_hitbox_active")))
int is_bash_hitbox_active() {
    return g_coordinator.get_player_manager().get_bash_hitbox().active ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("check_bash_collision")))
int check_bash_collision(float target_x, float target_y, float target_radius) {
    return g_coordinator.get_player_manager().check_bash_collision(target_x, target_y, target_radius) ? 1 : 0;
}

// ---- Raider Berserker Charge Abilities ----

__attribute__((used)) __attribute__((export_name("start_berserker_charge")))
void start_berserker_charge() {
    g_coordinator.get_player_manager().start_berserker_charge();
}

__attribute__((used)) __attribute__((export_name("cancel_berserker_charge")))
void cancel_berserker_charge() {
    g_coordinator.get_player_manager().cancel_berserker_charge();
}

__attribute__((used)) __attribute__((export_name("is_berserker_charge_active")))
int is_berserker_charge_active() {
    return g_coordinator.get_player_manager().is_berserker_charge_active() ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("get_berserker_charge_duration")))
float get_berserker_charge_duration() {
    return g_coordinator.get_player_manager().get_berserker_charge_duration();
}

__attribute__((used)) __attribute__((export_name("get_berserker_targets_hit")))
int get_berserker_targets_hit() {
    return g_coordinator.get_player_manager().get_berserker_targets_hit();
}

__attribute__((used)) __attribute__((export_name("get_berserker_speed_multiplier")))
float get_berserker_speed_multiplier() {
    return g_coordinator.get_player_manager().get_berserker_speed_multiplier();
}

__attribute__((used)) __attribute__((export_name("get_berserker_charge_dir_x")))
float get_berserker_charge_dir_x() {
    return g_coordinator.get_player_manager().get_berserker_charge_dir_x();
}

__attribute__((used)) __attribute__((export_name("get_berserker_charge_dir_y")))
float get_berserker_charge_dir_y() {
    return g_coordinator.get_player_manager().get_berserker_charge_dir_y();
}

__attribute__((used)) __attribute__((export_name("is_berserker_unstoppable")))
int is_berserker_unstoppable() {
    return g_coordinator.get_player_manager().is_berserker_unstoppable() ? 1 : 0;
}

// ---- Kensei Flow Dash Abilities ----

__attribute__((used)) __attribute__((export_name("execute_flow_dash")))
void execute_flow_dash(float direction_x, float direction_y) {
    g_coordinator.get_player_manager().execute_flow_dash(direction_x, direction_y);
}

__attribute__((used)) __attribute__((export_name("cancel_flow_dash")))
void cancel_flow_dash() {
    g_coordinator.get_player_manager().cancel_flow_dash();
}

__attribute__((used)) __attribute__((export_name("is_flow_dash_active")))
int is_flow_dash_active() {
    return g_coordinator.get_player_manager().is_flow_dash_active() ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("get_flow_dash_duration")))
float get_flow_dash_duration() {
    return g_coordinator.get_player_manager().get_flow_dash_duration();
}

__attribute__((used)) __attribute__((export_name("get_flow_dash_combo_level")))
int get_flow_dash_combo_level() {
    return g_coordinator.get_player_manager().get_flow_dash_combo_level();
}

__attribute__((used)) __attribute__((export_name("get_dash_progress")))
float get_dash_progress() {
    return g_coordinator.get_player_manager().get_dash_progress();
}

__attribute__((used)) __attribute__((export_name("is_dash_invulnerable")))
int is_dash_invulnerable() {
    return g_coordinator.get_player_manager().is_dash_invulnerable() ? 1 : 0;
}

__attribute__((used)) __attribute__((export_name("can_dash_cancel")))
int can_dash_cancel() {
    return g_coordinator.get_player_manager().can_dash_cancel() ? 1 : 0;
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

// ---- Physics Barrel Functions ----

__attribute__((export_name("spawn_barrel")))
uint32_t spawn_barrel(float x, float y, float z) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    
    // Create physics body for barrel
    RigidBody barrel_body;
    barrel_body.position = FixedVector3::from_floats(x, y, z);
    barrel_body.mass = Fixed::from_float(PhysicsBarrel::BARREL_MASS);
    barrel_body.inverse_mass = Fixed::from_float(1.0f / PhysicsBarrel::BARREL_MASS);
    barrel_body.friction = Fixed::from_float(0.7f);
    barrel_body.restitution = Fixed::from_float(0.3f);
    barrel_body.drag = Fixed::from_float(0.95f);
    barrel_body.radius = Fixed::from_float(PhysicsBarrel::BARREL_RADIUS);
    barrel_body.type = BodyType::Dynamic;
    
    uint32_t body_id = physics_mgr.create_body(barrel_body);
    
    // Create barrel entity
    PhysicsBarrel barrel;
    barrel.initialize(body_id, x, y, z);
    g_barrels.push_back(barrel);
    
    return body_id;
}

__attribute__((export_name("throw_barrel")))
void throw_barrel(uint32_t body_id, float dx, float dy, float dz, float force) {
    auto& physics_mgr = g_coordinator.get_physics_manager();
    
    FixedVector3 dir = FixedVector3::from_floats(dx, dy, dz).normalized();
    FixedVector3 impulse = dir * Fixed::from_float(force);
    physics_mgr.apply_impulse(body_id, impulse);
    
    // Mark as projectile for damage tracking
    for (auto& barrel : g_barrels) {
        if (barrel.get_body_id() == body_id) {
            barrel.mark_as_projectile();
            break;
        }
    }
}

__attribute__((export_name("get_barrel_count")))
int get_barrel_count() {
    return static_cast<int>(g_barrels.size());
}

__attribute__((export_name("get_barrel_x")))
float get_barrel_x(int index) {
    if (index < 0 || index >= static_cast<int>(g_barrels.size())) {
        return 0.0f;
    }
    
    auto& physics_mgr = g_coordinator.get_physics_manager();
    const RigidBody* body = physics_mgr.get_body(g_barrels[index].get_body_id());
    return body ? body->position.x.to_float() : 0.0f;
}

__attribute__((export_name("get_barrel_y")))
float get_barrel_y(int index) {
    if (index < 0 || index >= static_cast<int>(g_barrels.size())) {
        return 0.0f;
    }
    
    auto& physics_mgr = g_coordinator.get_physics_manager();
    const RigidBody* body = physics_mgr.get_body(g_barrels[index].get_body_id());
    return body ? body->position.y.to_float() : 0.0f;
}

__attribute__((export_name("get_barrel_vel_x")))
float get_barrel_vel_x(int index) {
    if (index < 0 || index >= static_cast<int>(g_barrels.size())) {
        return 0.0f;
    }
    
    auto& physics_mgr = g_coordinator.get_physics_manager();
    const RigidBody* body = physics_mgr.get_body(g_barrels[index].get_body_id());
    return body ? body->velocity.x.to_float() : 0.0f;
}

__attribute__((export_name("get_barrel_vel_y")))
float get_barrel_vel_y(int index) {
    if (index < 0 || index >= static_cast<int>(g_barrels.size())) {
        return 0.0f;
    }
    
    auto& physics_mgr = g_coordinator.get_physics_manager();
    const RigidBody* body = physics_mgr.get_body(g_barrels[index].get_body_id());
    return body ? body->velocity.y.to_float() : 0.0f;
}

__attribute__((export_name("clear_all_barrels")))
void clear_all_barrels() {
    // Destroy physics bodies for all barrels
    auto& physics_mgr = g_coordinator.get_physics_manager();
    for (const auto& barrel : g_barrels) {
        physics_mgr.destroy_body(barrel.get_body_id());
    }
    g_barrels.clear();
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

// ---- Wolf Enemy System ----

__attribute__((export_name("spawn_wolf")))
void spawn_wolf(float x, float y, int type) {
    g_coordinator.get_wolf_manager().spawn_wolf(x, y, static_cast<WolfType>(type));
}

__attribute__((export_name("spawn_wolves")))
void spawn_wolves(int count) {
    // Spawn wolves in a circle around the player for testing
    auto& player_mgr = g_coordinator.get_player_manager();
    float player_x = player_mgr.get_x();
    float player_y = player_mgr.get_y();
    
    for (int i = 0; i < count; i++) {
        float angle = (float)i / (float)count * 6.28318f; // 2*PI
        float dist = 0.15f; // Distance from player
        float x = player_x + dist * cosf(angle);
        float y = player_y + dist * sinf(angle);
        
        // Clamp to world bounds
        x = (x < 0.0f) ? 0.0f : (x > 1.0f) ? 1.0f : x;
        y = (y < 0.0f) ? 0.0f : (y > 1.0f) ? 1.0f : y;
        
        // Alternate between wolf types
        WolfType type = static_cast<WolfType>(i % 5);
        g_coordinator.get_wolf_manager().spawn_wolf(x, y, type);
    }
}

__attribute__((export_name("clear_enemies")))
void clear_enemies() {
    g_coordinator.get_wolf_manager().clear_all();
}

__attribute__((export_name("get_wolf_count")))
int get_wolf_count() {
    return g_coordinator.get_wolf_manager().get_wolf_count();
}

__attribute__((export_name("get_enemy_count")))
int get_enemy_count() {
    return g_coordinator.get_wolf_manager().get_wolf_count();
}

__attribute__((export_name("get_wolf_x")))
float get_wolf_x(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->x.to_float() : 0.0f;
}

__attribute__((export_name("get_enemy_x")))
float get_enemy_x(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->x.to_float() : 0.0f;
}

__attribute__((export_name("get_wolf_y")))
float get_wolf_y(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->y.to_float() : 0.0f;
}

__attribute__((export_name("get_enemy_y")))
float get_enemy_y(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->y.to_float() : 0.0f;
}

__attribute__((export_name("get_enemy_type")))
int get_enemy_type(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? static_cast<int>(wolf->type) : 0;
}

__attribute__((export_name("get_enemy_state")))
int get_enemy_state(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? static_cast<int>(wolf->state) : 0;
}

__attribute__((export_name("get_enemy_role")))
int get_enemy_role(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? static_cast<int>(wolf->pack_role) : 0;
}

__attribute__((export_name("get_enemy_fatigue")))
float get_enemy_fatigue(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    if (!wolf) {
        return 0.0f;
    }
    // Calculate fatigue as inverse of health (1.0 = dead, 0.0 = full health)
    return 1.0f - (wolf->health / wolf->max_health);
}

__attribute__((export_name("get_wolf_state")))
int get_wolf_state(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? static_cast<int>(wolf->state) : 0;
}

__attribute__((export_name("get_wolf_health")))
float get_wolf_health(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->health : 0.0f;
}

__attribute__((export_name("get_wolf_facing_x")))
float get_wolf_facing_x(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->facing_x.to_float() : 1.0f;
}

__attribute__((export_name("get_wolf_facing_y")))
float get_wolf_facing_y(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->facing_y.to_float() : 0.0f;
}

// Animation data exports (for JS rendering)
__attribute__((export_name("get_wolf_body_stretch")))
float get_wolf_body_stretch(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->body_stretch : 1.0f;
}

__attribute__((export_name("get_wolf_head_pitch")))
float get_wolf_head_pitch(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->head_pitch : 0.0f;
}

__attribute__((export_name("get_wolf_head_yaw")))
float get_wolf_head_yaw(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->head_yaw : 0.0f;
}

__attribute__((export_name("get_wolf_tail_wag")))
float get_wolf_tail_wag(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->tail_wag : 0.0f;
}

__attribute__((export_name("get_enemy_vx")))
float get_enemy_vx(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->vx.to_float() : 0.0f;
}

__attribute__((export_name("get_enemy_vy")))
float get_enemy_vy(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->vy.to_float() : 0.0f;
}

__attribute__((export_name("damage_wolf")))
void damage_wolf(int wolf_index, float damage, float knockback_x, float knockback_y) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    if (wolf) {
        g_coordinator.get_wolf_manager().damage_wolf(wolf->id, damage, knockback_x, knockback_y);
    }
}

__attribute__((export_name("remove_wolf")))
void remove_wolf(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    if (wolf) {
        g_coordinator.get_wolf_manager().remove_wolf(wolf->id);
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

