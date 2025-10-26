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
#include <cstdint>
#include "coordinators/GameCoordinator.h"
#include "GameGlobals.h"
#include "physics/PhysicsManager.h"
#include "physics/PhysicsConstants.h"
#include "physics/PhysicsTypes.h"
#include "physics/PhysicsEvents.h"
#include "physics/ForceField.h"
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
// ---- Arm System Exports ----

__attribute__((export_name("init_player_arms")))
void init_player_arms() {
    g_coordinator.get_arm_manager().initialize(&g_coordinator.get_physics_manager(), &g_coordinator.get_player_manager());
}

__attribute__((export_name("set_left_hand_target")))
void set_left_hand_target(float x, float y, float z) {
    g_coordinator.get_arm_manager().set_left_target(x, y, z);
}

__attribute__((export_name("set_right_hand_target")))
void set_right_hand_target(float x, float y, float z) {
    g_coordinator.get_arm_manager().set_right_target(x, y, z);
}

__attribute__((export_name("get_left_shoulder_x"))) float get_left_shoulder_x() { float x,y,z; g_coordinator.get_arm_manager().get_left_shoulder(x,y,z); return x; }
__attribute__((export_name("get_left_shoulder_y"))) float get_left_shoulder_y() { float x,y,z; g_coordinator.get_arm_manager().get_left_shoulder(x,y,z); return y; }
__attribute__((export_name("get_left_shoulder_z"))) float get_left_shoulder_z() { float x,y,z; g_coordinator.get_arm_manager().get_left_shoulder(x,y,z); return z; }
__attribute__((export_name("get_left_elbow_x"))) float get_left_elbow_x() { float x,y,z; g_coordinator.get_arm_manager().get_left_elbow(x,y,z); return x; }
__attribute__((export_name("get_left_elbow_y"))) float get_left_elbow_y() { float x,y,z; g_coordinator.get_arm_manager().get_left_elbow(x,y,z); return y; }
__attribute__((export_name("get_left_elbow_z"))) float get_left_elbow_z() { float x,y,z; g_coordinator.get_arm_manager().get_left_elbow(x,y,z); return z; }
__attribute__((export_name("get_left_hand_x"))) float get_left_hand_x() { float x,y,z; g_coordinator.get_arm_manager().get_left_hand(x,y,z); return x; }
__attribute__((export_name("get_left_hand_y"))) float get_left_hand_y() { float x,y,z; g_coordinator.get_arm_manager().get_left_hand(x,y,z); return y; }
__attribute__((export_name("get_left_hand_z"))) float get_left_hand_z() { float x,y,z; g_coordinator.get_arm_manager().get_left_hand(x,y,z); return z; }

__attribute__((export_name("get_right_shoulder_x"))) float get_right_shoulder_x() { float x,y,z; g_coordinator.get_arm_manager().get_right_shoulder(x,y,z); return x; }
__attribute__((export_name("get_right_shoulder_y"))) float get_right_shoulder_y() { float x,y,z; g_coordinator.get_arm_manager().get_right_shoulder(x,y,z); return y; }
__attribute__((export_name("get_right_shoulder_z"))) float get_right_shoulder_z() { float x,y,z; g_coordinator.get_arm_manager().get_right_shoulder(x,y,z); return z; }
__attribute__((export_name("get_right_elbow_x"))) float get_right_elbow_x() { float x,y,z; g_coordinator.get_arm_manager().get_right_elbow(x,y,z); return x; }
__attribute__((export_name("get_right_elbow_y"))) float get_right_elbow_y() { float x,y,z; g_coordinator.get_arm_manager().get_right_elbow(x,y,z); return y; }
__attribute__((export_name("get_right_elbow_z"))) float get_right_elbow_z() { float x,y,z; g_coordinator.get_arm_manager().get_right_elbow(x,y,z); return z; }
__attribute__((export_name("get_right_hand_x"))) float get_right_hand_x() { float x,y,z; g_coordinator.get_arm_manager().get_right_hand(x,y,z); return x; }
__attribute__((export_name("get_right_hand_y"))) float get_right_hand_y() { float x,y,z; g_coordinator.get_arm_manager().get_right_hand(x,y,z); return y; }
__attribute__((export_name("get_right_hand_z"))) float get_right_hand_z() { float x,y,z; g_coordinator.get_arm_manager().get_right_hand(x,y,z); return z; }

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
    // Validate input parameters
    if (std::isnan(input_x) || std::isinf(input_x) || 
        std::isnan(input_y) || std::isinf(input_y)) {
        return; // Ignore invalid float inputs
    }
    
    // Clamp input values to reasonable ranges
    input_x = std::max(-1.0f, std::min(1.0f, input_x));
    input_y = std::max(-1.0f, std::min(1.0f, input_y));
    
    // Validate boolean-like inputs (should be 0 or 1)
    rolling = (rolling != 0) ? 1 : 0;
    jumping = (jumping != 0) ? 1 : 0;
    light_attack = (light_attack != 0) ? 1 : 0;
    heavy_attack = (heavy_attack != 0) ? 1 : 0;
    blocking = (blocking != 0) ? 1 : 0;
    special = (special != 0) ? 1 : 0;
    
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

__attribute__((export_name("get_player_anim_state")))
int get_player_anim_state() {
    // Return animation state code based on combat and player state
    // Animation codes: 0=idle, 1=running, 2=attacking, 3=blocking, 4=rolling, 
    // 5=hurt, 6=dead, 7=jumping, 8=doubleJumping, 9=landing, 10=wallSliding, 11=dashing, 12=chargingAttack
    
    const auto& combat = g_coordinator.get_combat_manager();
    const auto& player = g_coordinator.get_player_manager();
    
    // Priority order: attacking > rolling > blocking > movement
    
    // Check attack state
    if (combat.get_attack_state() != CombatManager::AttackState::Idle) {
        return 2; // attacking
    }
    
    // Check roll state
    if (combat.is_roll_sliding()) {
        return 4; // rolling
    }
    
    // Check blocking
    if (combat.is_blocking()) {
        return 3; // blocking
    }
    
    // Check if player is moving
    float speed = player.get_speed();
    if (speed > 0.05f) {
        return 1; // running
    }
    
    return 0; // idle
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
    g_coordinator.initialize(1ull, 0u);
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

// ---- Physics Event Queue Exports ----

__attribute__((export_name("physics_get_event_count")))
int physics_get_event_count() {
    return GetPhysicsEventQueue().count();
}

__attribute__((export_name("physics_get_events_ptr")))
uintptr_t physics_get_events_ptr() {
    return reinterpret_cast<uintptr_t>(GetPhysicsEventQueue().data());
}

__attribute__((export_name("physics_clear_events")))
void physics_clear_events() {
    GetPhysicsEventQueue().clear();
}

// ---- Physics Collision Filter Utilities ----

__attribute__((export_name("set_body_collision_filter")))
void set_body_collision_filter(uint32_t body_id, uint32_t layer, uint32_t mask) {
    auto &pm = g_coordinator.get_physics_manager();
    RigidBody *body = pm.get_body(body_id);
    if (!body) return;
    body->collision_layer = layer;
    body->collision_mask = mask;
}

// ---- Physics Perf Counters ----

__attribute__((export_name("get_collision_pairs_checked")))
uint32_t get_collision_pairs_checked() {
    return g_coordinator.get_physics_manager().get_pairs_checked();
}

__attribute__((export_name("get_collisions_resolved")))
uint32_t get_collisions_resolved() {
    return g_coordinator.get_physics_manager().get_collisions_resolved();
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
    
    // Ensure the body is awake before applying impulse
    RigidBody* body = physics_mgr.get_body(body_id);
    if (!body) {
        // Body not found - this is the problem!
        return;
    }
    
    body->wake();
    
    FixedVector3 dir = FixedVector3::from_floats(dx, dy, dz).normalized();
    FixedVector3 impulse = dir * Fixed::from_float(force);
    
    // Debug: Check if impulse is valid
    if (impulse.is_zero()) {
        // Impulse is zero - direction vector was zero
        return;
    }
    
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
    
    const RigidBody* player_body = physics_mgr.get_body(PhysicsConstants::kPlayerBodyId);
    if (!player_body) {
        return;
    }

    const PhysicsConfig& config = physics_mgr.get_config();
    const float normalized_x = CoordinateSpace::physicsToNormalizedX(
        config,
        player_body->position.x.to_float()
    );
    const float normalized_y = CoordinateSpace::physicsToNormalizedY(
        config,
        player_body->position.y.to_float()
    );
    player_mgr.set_position(normalized_x, normalized_y);

    const float span_x = config.world_max_x.to_float() - config.world_min_x.to_float();
    const float span_y = config.world_max_y.to_float() - config.world_min_y.to_float();
    const float velocity_x = (span_x > 0.0f) ? (player_body->velocity.x.to_float() / span_x) : 0.0f;
    const float velocity_y = (span_y > 0.0f) ? (player_body->velocity.y.to_float() / span_y) : 0.0f;
    player_mgr.set_velocity(velocity_x, velocity_y);
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

// ---- NEW: Enhanced Wolf AI Exports ----

__attribute__((export_name("get_wolf_type")))
int get_wolf_type(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    return wolf ? static_cast<int>(wolf->type) : 0;
}

__attribute__((export_name("get_wolf_emotion")))
int get_wolf_emotion(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    return wolf ? static_cast<int>(wolf->emotion) : 0;
}

__attribute__((export_name("get_wolf_pack_id")))
int get_wolf_pack_id(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    return wolf ? static_cast<int>(wolf->pack_id) : 0;
}

__attribute__((export_name("get_wolf_pack_role")))
int get_wolf_pack_role(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    return wolf ? static_cast<int>(wolf->pack_role) : 0;
}

__attribute__((export_name("get_pack_count")))
int get_pack_count() {
    return g_coordinator.get_wolf_manager().get_pack_count();
}

__attribute__((export_name("get_pack_plan")))
int get_pack_plan(int pack_index) {
    const Pack* pack = g_coordinator.get_wolf_manager().get_pack(pack_index);
    return pack ? static_cast<int>(pack->current_plan) : 0;
}

__attribute__((export_name("get_pack_morale")))
float get_pack_morale(int pack_index) {
    const Pack* pack = g_coordinator.get_wolf_manager().get_pack(pack_index);
    return pack ? pack->pack_morale : 0.0f;
}

__attribute__((export_name("get_wolf_attack_type")))
int get_wolf_attack_type(int wolf_index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(wolf_index);
    return wolf ? static_cast<int>(wolf->current_attack_type) : 0;
}

// ---- Phase 2A: Terrain System (stubbed) ----
__attribute__((export_name("get_terrain_feature_count")))
int get_terrain_feature_count() {
    // Terrain system not implemented yet; safe default
    return 0;
}

__attribute__((export_name("get_terrain_feature_x")))
float get_terrain_feature_x(int /*feature_index*/) {
    return 0.0f;
}

__attribute__((export_name("get_terrain_feature_y")))
float get_terrain_feature_y(int /*feature_index*/) {
    return 0.0f;
}

__attribute__((export_name("get_terrain_feature_type")))
int get_terrain_feature_type(int /*feature_index*/) {
    return 0;
}

// ---- Phase 2B: Advanced Wolf State ----
__attribute__((export_name("get_wolf_aggression")))
float get_wolf_aggression(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->aggression : 0.0f;
}

__attribute__((export_name("get_wolf_morale")))
float get_wolf_morale(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->morale : 0.0f;
}

__attribute__((export_name("get_wolf_stamina")))
float get_wolf_stamina(int index) {
    const Wolf* wolf = g_coordinator.get_wolf_manager().get_wolf(index);
    return wolf ? wolf->stamina : 0.0f;
}

__attribute__((export_name("get_wolf_limp_severity")))
float get_wolf_limp_severity(int /*index*/) {
    // Limp/injury system not yet implemented; safe default
    return 0.0f;
}

__attribute__((export_name("get_pack_wolf_count")))
int get_pack_wolf_count(int pack_index) {
    const Pack* pack = g_coordinator.get_wolf_manager().get_pack(pack_index);
    return pack ? static_cast<int>(pack->wolf_ids.size()) : 0;
}

__attribute__((export_name("get_pack_leader_index")))
int get_pack_leader_index(int pack_index) {
    const Pack* pack = g_coordinator.get_wolf_manager().get_pack(pack_index);
    return pack ? pack->leader_index : -1;
}

// ---- Phase 3: Performance Metrics ----
__attribute__((export_name("get_wolf_attack_success_rate")))
float get_wolf_attack_success_rate() {
    const int count = g_coordinator.get_wolf_manager().get_wolf_count();
    unsigned int attempts = 0;
    unsigned int successes = 0;
    for (int i = 0; i < count; ++i) {
        const Wolf* w = g_coordinator.get_wolf_manager().get_wolf(i);
        if (!w) continue;
        successes += w->successful_attacks;
        attempts += (w->successful_attacks + w->failed_attacks);
    }
    if (attempts == 0) return 0.0f;
    return static_cast<float>(successes) / static_cast<float>(attempts);
}

__attribute__((export_name("get_pack_coordination_bonus")))
float get_pack_coordination_bonus() {
    // Return average coordination bonus across all packs
    float sum = 0.0f;
    int packs = g_coordinator.get_wolf_manager().get_pack_count();
    if (packs <= 0) return 1.0f;
    for (int i = 0; i < packs; ++i) {
        const Pack* p = g_coordinator.get_wolf_manager().get_pack(i);
        sum += p ? p->coordination_bonus : 1.0f;
    }
    return sum / static_cast<float>(packs);
}

__attribute__((export_name("get_player_skill_estimate")))
float get_player_skill_estimate() {
    return g_coordinator.get_wolf_manager().estimate_player_skill();
}

__attribute__((export_name("get_wolf_message_count")))
int get_wolf_message_count(int /*wolf_index*/) {
    // Communication system not yet implemented; safe default
    return 0;
}

__attribute__((export_name("get_wolf_last_message_type")))
int get_wolf_last_message_type(int /*wolf_index*/) {
    // Communication system not yet implemented; safe default
    return 0;
}

// ---- Skeleton Snapshot Exports (v1 getters) ----

__attribute__((export_name("get_skeleton_joint_count")))
int get_skeleton_joint_count() {
    const auto &pm = g_coordinator.get_player_manager();
    const SkeletonPhysics::PlayerSkeleton* skel = pm.get_skeleton();
    if (!skel) {
        return 0;
    }
    // Defined joint set: 26
    return 26;
}

// Helper to map index to joint pointer
static inline const SkeletonPhysics::Joint* _skel_joint_by_index(const SkeletonPhysics::PlayerSkeleton* s, int i) {
    // Order must be stable and documented
    switch (i) {
        case 0: return &s->head; case 1: return &s->neck; case 2: return &s->chest; case 3: return &s->mid_spine;
        case 4: return &s->lower_spine; case 5: return &s->pelvis; case 6: return &s->shoulder_l; case 7: return &s->shoulder_r;
        case 8: return &s->elbow_l; case 9: return &s->elbow_r; case 10: return &s->wrist_l; case 11: return &s->wrist_r;
        case 12: return &s->hand_l; case 13: return &s->hand_r; case 14: return &s->hip_l; case 15: return &s->hip_r;
        case 16: return &s->knee_l; case 17: return &s->knee_r; case 18: return &s->ankle_l; case 19: return &s->ankle_r;
        case 20: return &s->heel_l; case 21: return &s->heel_r; case 22: return &s->foot_l; case 23: return &s->foot_r;
        case 24: return &s->toe_l; case 25: return &s->toe_r; default: return nullptr;
    }
}

__attribute__((export_name("get_skeleton_joint_x")))
float get_skeleton_joint_x(int index) {
    if (index < 0 || index >= 26) {
        return 0.0f;
    }
    const auto &pm = g_coordinator.get_player_manager();
    const SkeletonPhysics::PlayerSkeleton* skel = pm.get_skeleton();
    if (!skel) {
        return 0.0f;
    }
    const SkeletonPhysics::Joint* j = _skel_joint_by_index(skel, index);
    return j ? j->x.to_float() : 0.0f;
}

__attribute__((export_name("get_skeleton_joint_y")))
float get_skeleton_joint_y(int index) {
    if (index < 0 || index >= 26) {
        return 0.0f;
    }
    const auto &pm = g_coordinator.get_player_manager();
    const SkeletonPhysics::PlayerSkeleton* skel = pm.get_skeleton();
    if (!skel) {
        return 0.0f;
    }
    const SkeletonPhysics::Joint* j = _skel_joint_by_index(skel, index);
    return j ? j->y.to_float() : 0.0f;
}

// ---- Skeleton Snapshot Exports (v2 bulk writer) ----
// Writes XY pairs for all joints into a provided buffer.
// Buffer layout: [x0, y0, x1, y1, ...] of length count*2 floats.
// Returns number of floats written (count*2). Returns 0 on error.
__attribute__((export_name("write_skeleton_joints_xy")))
int write_skeleton_joints_xy(uintptr_t out_ptr, int max_pairs) {
    if (out_ptr == 0 || max_pairs <= 0) {
        return 0;
    }
    const auto &pm = g_coordinator.get_player_manager();
    const SkeletonPhysics::PlayerSkeleton* skel = pm.get_skeleton();
    if (!skel) {
        return 0;
    }
    const int total_joints = 26;
    const int pairs_to_write = std::min(max_pairs, total_joints);
    float* out = reinterpret_cast<float*>(out_ptr);
    int written = 0;
    for (int i = 0; i < pairs_to_write; ++i) {
        const SkeletonPhysics::Joint* j = _skel_joint_by_index(skel, i);
        const float x = j ? j->x.to_float() : 0.0f;
        const float y = j ? j->y.to_float() : 0.0f;
        out[written++] = x;
        out[written++] = y;
    }
    return written; // number of floats written
}

__attribute__((export_name("get_balance_quality")))
float get_balance_quality() {
    return g_coordinator.get_player_manager().get_balance_quality();
}

__attribute__((export_name("get_left_foot_grounded")))
int get_left_foot_grounded() {
    return g_coordinator.get_player_manager().is_left_foot_grounded() ? 1 : 0;
}

__attribute__((export_name("get_right_foot_grounded")))
int get_right_foot_grounded() {
    return g_coordinator.get_player_manager().is_right_foot_grounded() ? 1 : 0;
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

