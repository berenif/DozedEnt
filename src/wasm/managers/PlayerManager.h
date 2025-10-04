#pragma once
#include "../physics/FixedPoint.h"
#include "../physics/SkeletonPhysics.h"

/**
 * PlayerManager - Manages player state, movement, and basic properties
 * Follows single responsibility principle for player management
 */
class PlayerManager {
public:
    struct PlayerState {
        // Position and movement
        float pos_x = 0.5f;
        float pos_y = 0.5f;
        float vel_x = 0.0f;
        float vel_y = 0.0f;
        
        // Health and stamina
        float stamina = 1.0f;
        float hp = 1.0f;
        int health = 100;
        int max_health = 100;
        
        // Movement state
        bool is_grounded = true;
        bool is_wall_sliding = false;
        int jump_count = 0;
        
        // Timing
        float state_timer = 0.0f;
        float speed_multiplier = 1.0f;
        
        // Facing direction for abilities
        float facing_x = 1.0f;
        float facing_y = 0.0f;
        
        // Last input (for input-aware friction)
        float last_input_x = 0.0f;
        float last_input_y = 0.0f;
        
        // Balance state (from skeleton physics)
        bool use_skeleton_physics = true;
        float balance_quality = 1.0f;  // 0-1, how well balanced
        bool left_foot_grounded = false;
        bool right_foot_grounded = false;
    };
    
    struct ShoulderBashState {
        bool is_active = false;
        bool is_charging = false;
        float duration = 0.0f;
        float charge_time = 0.0f;
        float max_charge = 1.0f;
        Fixed force_multiplier;
        uint32_t targets_hit = 0;
        
        // Hitbox properties
        float hitbox_radius = 0.05f;  // Normalized world space (5% of world)
        float hitbox_offset = 0.04f;  // Offset from player position
        
        ShoulderBashState() : force_multiplier(Fixed::from_int(1)) {}
    };
    
    struct BashHitbox {
        float x = 0.0f;
        float y = 0.0f;
        float radius = 0.0f;
        bool active = false;
    };

    PlayerManager();
    ~PlayerManager() = default;

    // Core update
    void update(float delta_time);
    void update_movement(float input_x, float input_y, float delta_time);
    void update_physics(float delta_time);
    void update_skeleton(float delta_time);
    
    // State management
    void reset_to_spawn();
    void set_position(float x, float y);
    void set_velocity(float vx, float vy);
    
    // Health and stamina
    void consume_stamina(float amount);
    void regenerate_stamina(float delta_time);
    void take_damage(float amount);
    void heal(float amount);
    
    // Movement abilities
    bool can_jump() const;
    bool can_wall_slide() const;
    void apply_jump();
    void apply_wall_slide(float delta_time);
    
    // Warden Shoulder Bash abilities
    void start_charging_bash();
    void update_bash_charge(float dt);
    void release_bash();
    void update_active_bash(float dt);
    void on_bash_hit(uint32_t target_id);
    bool can_bash() const;
    
    // Bash getters
    float get_bash_charge_level() const;
    bool is_bash_active() const;
    bool is_bash_charging() const;
    uint32_t get_bash_targets_hit() const;
    BashHitbox get_bash_hitbox() const;
    
    // Collision detection
    bool check_bash_collision(float target_x, float target_y, float target_radius) const;
    
    // Facing direction
    void update_facing_direction(float input_x, float input_y);
    
    // Getters
    const PlayerState& get_state() const { return state_; }
    PlayerState& get_state_mutable() { return state_; }
    float get_x() const { return state_.pos_x; }
    float get_y() const { return state_.pos_y; }
    float get_vel_x() const { return state_.vel_x; }
    float get_vel_y() const { return state_.vel_y; }
    float get_stamina() const { return state_.stamina; }
    float get_hp() const { return state_.hp; }
    bool is_grounded() const { return state_.is_grounded; }
    int get_jump_count() const { return state_.jump_count; }
    bool is_wall_sliding() const { return state_.is_wall_sliding; }
    float get_speed() const;
    float get_facing_x() const { return state_.facing_x; }
    float get_facing_y() const { return state_.facing_y; }
    
    // Skeleton/balance getters
    float get_balance_quality() const { return state_.balance_quality; }
    bool is_left_foot_grounded() const { return state_.left_foot_grounded; }
    bool is_right_foot_grounded() const { return state_.right_foot_grounded; }
    const SkeletonPhysics::PlayerSkeleton* get_skeleton() const { return &skeleton_; }

private:
    PlayerState state_;
    ShoulderBashState bash_state_;
    SkeletonPhysics::PlayerSkeleton skeleton_;
    
    // Movement constants
    static constexpr float MOVE_SPEED = 0.3f;  // Reduced from 0.8f for better control
    static constexpr float STAMINA_REGEN_RATE = 0.4f;
    static constexpr float MAX_JUMP_COUNT = 2;
    static constexpr float WALL_SLIDE_SPEED = 0.3f;
    
    // Tuning constants for responsiveness
    static constexpr float ACCELERATION = 16.0f;      // Faster acceleration for snappier input
    static constexpr float TURN_BOOST = 2.5f;         // Extra boost when reversing direction
    static constexpr float FRICTION_WHEN_IDLE = 8.0f;  // Reduced from 14.0f for better responsiveness
    static constexpr float FRICTION_WHEN_MOVING = 1.5f; // Reduced from 3.0f for smoother movement
    
    // Bash constants
    static constexpr float BASH_MIN_CHARGE = 0.3f;
    static constexpr float BASH_STAMINA_COST = 0.3f;
    static constexpr float BASH_DURATION = 0.6f;
    static constexpr float BASH_BASE_FORCE = 15.0f;
    static constexpr float BASH_CHARGE_SLOW_FACTOR = 0.5f;
    static constexpr float BASH_STAMINA_REFUND = 0.1f;
    
    // Helper methods
    void apply_friction(float delta_time);
    void handle_collisions();
    void update_grounded_state();
    void update_wall_sliding_state();
};

