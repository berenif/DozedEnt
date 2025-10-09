#pragma once
#include <vector>
#include <cstdint>
#include <algorithm>
#include "../physics/FixedPoint.h"

/**
 * WolfManager - Manages wolf enemy AI, behavior, and combat
 * Follows WASM-first architecture: all logic in C++, JS only reads state
 * Implements pack behavior, adaptive difficulty, and emotional AI
 */

// Forward declarations
class GameCoordinator;

// Wolf types (from WOLF_AI.md)
enum class WolfType : uint8_t {
    Normal = 0,
    Alpha = 1,
    Scout = 2,
    Hunter = 3,
    Omega = 4
};

// Wolf AI states (from ENEMY_AI.md and WOLF_AI.md)
enum class WolfState : uint8_t {
    Idle = 0,
    Patrol = 1,
    Investigate = 2,
    Alert = 3,
    Approach = 4,
    Strafe = 5,
    Attack = 6,
    Retreat = 7,
    Recover = 8,
    Flee = 9,
    Ambush = 10,
    Flank = 11
};

// Pack roles for coordination
enum class PackRole : uint8_t {
    Leader = 0,
    Bruiser = 1,
    Skirmisher = 2,
    Support = 3,
    Scout = 4
};

// Emotional states affecting behavior
enum class EmotionalState : uint8_t {
    Calm = 0,
    Aggressive = 1,
    Fearful = 2,
    Desperate = 3,
    Confident = 4,
    Frustrated = 5
};

// Pack hunting plans
enum class PackPlan : uint8_t {
    None = 0,
    Ambush = 1,    // Coordinated surprise attack
    Pincer = 2,    // Flank from both sides
    Retreat = 3,   // Tactical withdrawal
    Commit = 4,    // All-in synchronized attack
    Flank = 5,     // One distracts, others flank
    Distract = 6,  // Support creates openings
    Regroup = 7    // Reform formation
};

/**
 * Core wolf structure - all state deterministic for multiplayer
 */
struct Wolf {
    // Identity
    uint32_t id = 0;
    WolfType type = WolfType::Normal;
    uint32_t physics_body_id = 0;  // PhysicsManager body ID for collision
    
    // Physics & Position (deterministic fixed-point)
    Fixed x = Fixed::from_float(0.5f);
    Fixed y = Fixed::from_float(0.5f);
    Fixed vx = Fixed::from_int(0);
    Fixed vy = Fixed::from_int(0);
    Fixed facing_x = Fixed::from_int(1);
    Fixed facing_y = Fixed::from_int(0);
    
    // Stats
    float health = 100.0f;
    float max_health = 100.0f;
    float stamina = 1.0f;
    float damage = 15.0f;
    float speed = 0.25f;  // Normalized 0-1 space (same as BASE_WOLF_SPEED)
    float detection_range = 0.4f;  // Normalized world space
    float attack_range = 0.08f;
    
    // AI State
    WolfState state = WolfState::Idle;
    PackRole pack_role = PackRole::Scout;
    EmotionalState emotion = EmotionalState::Calm;
    float state_timer = 0.0f;
    
    // Attributes (from WOLF_AI.md)
    float aggression = 0.5f;     // 0.3-0.7
    float intelligence = 0.6f;   // 0.4-0.8
    float coordination = 0.65f;  // 0.5-0.8
    float morale = 0.7f;         // 0.6-0.8
    float awareness = 0.5f;      // 0-1
    
    // Pack coordination
    uint32_t pack_id = 0;
    int pack_index = -1;
    
    // Memory & Learning
    float player_speed_estimate = 0.3f;
    float player_reaction_time = 0.3f;
    float last_player_block_time = 999.0f;
    float last_player_roll_time = 999.0f;
    uint32_t successful_attacks = 0;
    uint32_t failed_attacks = 0;
    
    // Timers & Cooldowns
    float attack_cooldown = 0.0f;
    float dodge_cooldown = 0.0f;
    float decision_timer = 0.0f;
    
    // Animation data (for JS rendering)
    float body_stretch = 1.0f;
    float head_pitch = 0.0f;
    float head_yaw = 0.0f;
    float tail_wag = 0.0f;
    float ear_rotation[2] = {0.0f, 0.0f};
    float leg_positions[4][2] = {{0.0f, 0.0f}, {0.0f, 0.0f}, {0.0f, 0.0f}, {0.0f, 0.0f}};
};

/**
 * Pack coordination structure
 */
struct Pack {
    uint32_t pack_id = 0;
    std::vector<uint32_t> wolf_ids;
    PackPlan current_plan = PackPlan::None;
    float plan_timer = 0.0f;
    float coordination_bonus = 1.0f;
    
    // Pack state
    float pack_morale = 0.7f;
    int leader_index = -1;
};

/**
 * WolfManager - Main manager class for all wolf enemy logic
 */
class WolfManager {
public:
    WolfManager();
    ~WolfManager();
    
    // Core lifecycle
    void initialize(GameCoordinator* coordinator);
    void update(float delta_time);
    void clear_all();
    
    // Wolf spawning and management
    void spawn_wolf(float x, float y, WolfType type);
    void remove_wolf(uint32_t wolf_id);
    void damage_wolf(uint32_t wolf_id, float damage, float knockback_x, float knockback_y);
    
    // Pack management
    void create_pack(const std::vector<uint32_t>& wolf_ids);
    void update_pack_roles();
    void coordinate_pack_attack();
    
    // State queries (for WASM exports)
    int get_wolf_count() const { return static_cast<int>(wolves_.size()); }
    const Wolf* get_wolf(int index) const;
    Wolf* get_wolf_mutable(int index);
    Wolf* find_wolf_by_id(uint32_t wolf_id);
    
    // Adaptive difficulty
    void update_difficulty_scaling(float player_skill);
    float estimate_player_skill() const;

private:
    GameCoordinator* coordinator_ = nullptr;
    std::vector<Wolf> wolves_;
    std::vector<Pack> packs_;
    uint32_t next_wolf_id_ = 1;
    uint32_t next_pack_id_ = 1;
    
    // Performance tracking
    uint32_t total_attacks_ = 0;
    uint32_t player_dodges_ = 0;
    uint32_t player_blocks_ = 0;
    float average_kill_time_ = 30.0f;
    
    // Internal AI methods
    void update_wolf_ai(Wolf& wolf, float delta_time);
    void update_wolf_physics(Wolf& wolf, float delta_time);
    void update_wolf_state_machine(Wolf& wolf, float delta_time);
    void update_wolf_emotion(Wolf& wolf, float delta_time);
    void update_wolf_memory(Wolf& wolf, float delta_time);
    void update_pack_coordination(float delta_time);
    
    // State machine behaviors
    void update_idle_behavior(Wolf& wolf, float delta_time);
    void update_patrol_behavior(Wolf& wolf, float delta_time);
    void update_alert_behavior(Wolf& wolf, float delta_time);
    void update_approach_behavior(Wolf& wolf, float delta_time);
    void update_strafe_behavior(Wolf& wolf, float delta_time);
    void update_attack_behavior(Wolf& wolf, float delta_time);
    void update_retreat_behavior(Wolf& wolf, float delta_time);
    void update_recover_behavior(Wolf& wolf, float delta_time);
    
    // Decision making
    WolfState evaluate_best_state(const Wolf& wolf) const;
    bool should_attack(const Wolf& wolf) const;
    bool should_retreat(const Wolf& wolf) const;
    float get_state_duration(WolfState state) const;
    void on_state_enter(Wolf& wolf, WolfState new_state);
    
    // Movement & targeting
    void move_towards_player(Wolf& wolf, float delta_time);
    void circle_strafe(Wolf& wolf, float delta_time);
    float get_distance_to_player(const Wolf& wolf) const;
    bool is_player_in_attack_range(const Wolf& wolf) const;
    
    // Emotional AI
    void apply_emotion_modifiers(Wolf& wolf);
    
    // Pack AI
    void update_pack_ai(Pack& pack, float delta_time);
    void assign_pack_roles(Pack& pack);
    void execute_pack_plan(Pack& pack);
    void execute_ambush_plan(Pack& pack);
    void execute_pincer_plan(Pack& pack);
    void execute_commit_plan(Pack& pack);
    bool wolves_in_position(const Pack& pack) const;
    void move_wolf_to_position(Wolf& wolf, float target_x, float target_y);
    
    // Animation helpers
    void update_wolf_animation(Wolf& wolf, float delta_time);
    
    // Helper methods
    Pack* find_pack_by_id(uint32_t pack_id);
    void init_wolf_stats(Wolf& wolf);
};

