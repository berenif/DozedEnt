#pragma once

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
    };

    PlayerManager();
    ~PlayerManager() = default;

    // Core update
    void update(float delta_time);
    void update_movement(float input_x, float input_y, float delta_time);
    void update_physics(float delta_time);
    
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
    
    // Getters
    const PlayerState& get_state() const { return state_; }
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

private:
    PlayerState state_;
    
    // Movement constants
    static constexpr float MOVE_SPEED = 0.8f;
    static constexpr float STAMINA_REGEN_RATE = 0.4f;
    static constexpr float MAX_JUMP_COUNT = 2;
    static constexpr float WALL_SLIDE_SPEED = 0.3f;
    
    // Helper methods
    void apply_friction(float delta_time);
    void handle_collisions();
    void update_grounded_state();
    void update_wall_sliding_state();
};

