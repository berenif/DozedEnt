#pragma once
#include <cstdint>

// Forward declaration
class PhysicsManager;

/**
 * CombatManager - Handles all combat mechanics, attacks, blocking, and combat state
 * Follows single responsibility principle for combat system management
 */
class CombatManager {
public:
    enum class AttackState {
        Idle = 0,
        Windup = 1,
        Active = 2,
        Recovery = 3
    };

    enum class RollState {
        Idle = 0,
        Active = 1,
        Cooldown = 2
    };

    enum class AttackResult {
        Miss = -1,
        Hit = 0,
        Block = 1,
        PerfectParry = 2
    };

    struct CombatState {
        // Attack state
        AttackState attack_state = AttackState::Idle;
        float attack_state_time = 0.0f;
        int combo_count = 0;
        float combo_window_remaining = 0.0f;
        
        // Defense state
        bool is_blocking = false;
        float block_start_time = 0.0f;
        bool can_counter = false;
        float counter_window_remaining = 0.0f;
        
        // Roll state
        RollState roll_state = RollState::Idle;
        float roll_time = 0.0f;
        bool is_invulnerable = false;
        
        // Combat properties
        bool has_hyperarmor = false;
        float armor_value = 0.0f;
        float damage_multiplier = 1.0f;
        
        // Status effects
        bool is_stunned = false;
        float stun_remaining = 0.0f;
        
        // Timing
        float last_attack_time = -1000.0f;
        float last_roll_time = -1000.0f;
    };

    CombatManager();
    ~CombatManager() = default;

    // Core update
    void update(float delta_time);
    
    // Attack actions
    bool try_light_attack();
    bool try_heavy_attack();
    bool try_special_attack();
    bool can_feint_heavy() const;
    void feint_heavy_attack();
    
    // Defense actions
    bool try_block(float face_x, float face_y, float current_time);
    bool try_parry();
    void stop_blocking();
    
    // Roll actions
    bool try_roll();
    bool is_roll_sliding() const;
    
    // Combat evaluation
    AttackResult handle_incoming_attack(float attack_x, float attack_y, 
                                       float dir_x, float dir_y, float current_time);
    
    // State queries
    const CombatState& get_state() const { return state_; }
    AttackState get_attack_state() const { return state_.attack_state; }
    RollState get_roll_state() const { return state_.roll_state; }
    bool is_blocking() const { return state_.is_blocking; }
    bool is_invulnerable() const { return state_.is_invulnerable; }
    bool has_hyperarmor() const { return state_.has_hyperarmor; }
    float get_armor_value() const { return state_.armor_value; }
    int get_combo_count() const { return state_.combo_count; }
    bool can_counter() const { return state_.can_counter; }
    bool is_stunned() const { return state_.is_stunned; }
    float get_stun_remaining() const { return state_.stun_remaining; }
    
    // Timing queries
    float get_attack_cooldown() const;
    float get_roll_cooldown() const;
    float get_parry_window() const;
    float get_combo_window_remaining() const { return state_.combo_window_remaining; }
    float get_counter_window_remaining() const { return state_.counter_window_remaining; }
    
    // Physics integration
    void set_physics_manager(PhysicsManager* pm) { physics_manager_ = pm; }
    void apply_knockback_impulse(float dir_x, float dir_y, float force);
    void apply_enemy_knockback(uint32_t enemy_body_id, float dir_x, float dir_y, float force);
    void apply_attack_lunge(float facing_x, float facing_y, bool is_heavy = false);
    
    // Player manager integration (for stamina)
    void set_player_manager(class PlayerManager* pm) { player_manager_ = pm; }
    
    // Game state manager integration (for timing)
    void set_game_state_manager(class GameStateManager* gsm) { game_state_manager_ = gsm; }

private:
    CombatState state_;
    PhysicsManager* physics_manager_ = nullptr;
    class PlayerManager* player_manager_ = nullptr;
    class GameStateManager* game_state_manager_ = nullptr;
    
    // Combat constants
    static constexpr float ATTACK_WINDUP_SEC = 0.3f;
    static constexpr float ATTACK_ACTIVE_SEC = 0.2f;
    static constexpr float ATTACK_RECOVERY_SEC = 0.4f;
    static constexpr float ROLL_DURATION_SEC = 0.6f;
    static constexpr float ROLL_COOLDOWN_SEC = 1.0f;
    static constexpr float PARRY_WINDOW_SEC = 0.2f;
    static constexpr float COMBO_WINDOW_SEC = 1.0f;
    static constexpr float COUNTER_WINDOW_SEC = 0.5f;
    
    // Stamina costs
    static constexpr float LIGHT_ATTACK_STAMINA = 0.15f;
    static constexpr float HEAVY_ATTACK_STAMINA = 0.25f;
    static constexpr float SPECIAL_ATTACK_STAMINA = 0.4f;
    static constexpr float ROLL_STAMINA = 0.2f;
    static constexpr float BLOCK_STAMINA_PER_SEC = 0.1f;
    
    // Helper methods
    void update_attack_state(float delta_time);
    void update_roll_state(float delta_time);
    void update_block_state(float delta_time);
    void update_combo_system(float delta_time);
    void update_counter_system(float delta_time);
    
    bool has_sufficient_stamina(float required) const;
    void consume_stamina(float amount);
    float calculate_parry_effectiveness(float timing_offset) const;
};

