#pragma once
#include <vector>
#include <cstdint>
#include <algorithm>
#include <unordered_map>
#include "../physics/FixedPoint.h"
#include "wolves/WolfTypes.h"

/**
 * WolfManager - Manages wolf enemy AI, behavior, and combat
 * Follows WASM-first architecture: all logic in C++, JS only reads state
 * Implements pack behavior, adaptive difficulty, and emotional AI
 */

// Forward declarations
class GameCoordinator;

// Wolf and pack type definitions are declared in wolves/WolfTypes.h

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
    
    // Collision handling
    void set_wolf_collision_cooldown(uint32_t body_id, float cooldown_time);
    
    // State queries (for WASM exports)
    int get_wolf_count() const { return static_cast<int>(wolves_.size()); }
    const Wolf* get_wolf(int index) const;
    Wolf* get_wolf_mutable(int index);
    Wolf* find_wolf_by_id(uint32_t wolf_id);
    Wolf* find_wolf_by_body(uint32_t body_id);
    const Wolf* find_wolf_by_body(uint32_t body_id) const;
    
    // Adaptive difficulty
    void update_difficulty_scaling(float player_skill);
    float estimate_player_skill() const;
    
    // Pack info queries (for WASM exports)
    int get_pack_count() const { return static_cast<int>(packs_.size()); }
    const Pack* get_pack(int index) const;

private:
    GameCoordinator* coordinator_ = nullptr;
    std::vector<Wolf> wolves_;
    std::vector<Pack> packs_;
    std::unordered_map<uint32_t, int> body_id_to_index_;
    uint32_t next_wolf_id_ = 1;
    uint32_t next_pack_id_ = 1;
    
    // Performance tracking
    uint32_t total_attacks_ = 0;
    uint32_t player_dodges_ = 0;
    uint32_t player_blocks_ = 0;
    float average_kill_time_ = 30.0f;
    
    // Adaptive difficulty timer
    float difficulty_update_timer_ = 0.0f;
    
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
    // State durations with emotion-aware adjustment and jitter
    float get_state_duration(WolfState state) const;
    float get_state_duration_for(const Wolf& wolf, WolfState state) const;
    void on_state_enter(Wolf& wolf, WolfState new_state);
    
    // Movement & targeting
    void move_towards_player(Wolf& wolf, float delta_time);
    void circle_strafe(Wolf& wolf, float delta_time);
    float get_distance_to_player(const Wolf& wolf) const;
    bool is_player_in_attack_range(const Wolf& wolf) const;
    float compute_facing_dot_to_player(const Wolf& wolf) const;
    int count_current_attackers() const;
    
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
    void rebuild_body_index_map();
    
    // New systems - Phase 2 & 3 (Pack Intelligence & Reactive Combat)
    bool check_interrupt_conditions(Wolf& wolf, WolfState& out_new_state);
    WolfState get_preferred_state(const Wolf& wolf) const;
    uint8_t select_attack_type(const Wolf& wolf) const;
    void update_wolf_spatial_awareness(Wolf& wolf, float delta_time);
    bool has_clear_path_to_player(const Wolf& wolf) const;
    FixedVector3 calculate_separation_force(const Wolf& wolf) const;
    float get_optimal_attack_angle(const Wolf& wolf) const;
    
    // Pack plan executors
    void execute_flank_plan(Pack& pack);
    void execute_distract_plan(Pack& pack);
    void execute_regroup_plan(Pack& pack);

    // Threat budget for concurrent attackers (pack/global)
    int max_concurrent_attackers_ = 2;

    // Observability counters (for diagnostics/tests)
    uint32_t interrupt_critical_health_count_ = 0;
    uint32_t interrupt_pack_command_count_ = 0;
    uint32_t interrupt_close_proximity_count_ = 0;
    uint32_t interrupt_damage_count_ = 0;
    uint32_t gating_angle_rejects_count_ = 0;
    uint32_t gating_los_rejects_count_ = 0;
    uint32_t threat_budget_deferrals_count_ = 0;
};


