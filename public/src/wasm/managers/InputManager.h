#pragma once

/**
 * InputManager - Handles all player input processing and validation
 * Follows single responsibility principle for input management
 */
class InputManager {
public:
    struct InputState {
        float movement_x = 0.0f;
        float movement_y = 0.0f;
        bool is_rolling = false;
        bool is_jumping = false;
        bool light_attack = false;
        bool heavy_attack = false;
        bool is_blocking = false;
        bool special_attack = false;
    };

    InputManager();
    ~InputManager() = default;

    // Input processing
    void update_input(float input_x, float input_y, int rolling, int jumping, 
                     int light_attack, int heavy_attack, int blocking, int special);
    void normalize_movement_input();
    void clear_input_latches();
    
    // Combat manager integration (for stun state)
    void set_combat_manager(class CombatManager* cm) { combat_manager_ = cm; }
    
    // Input validation
    bool is_input_allowed() const;
    void apply_stun_restrictions();
    
    // Getters
    const InputState& get_input_state() const { return current_input_; }
    float get_movement_x() const { return current_input_.movement_x; }
    float get_movement_y() const { return current_input_.movement_y; }
    bool is_rolling_pressed() const { return current_input_.is_rolling; }
    bool is_jumping_pressed() const { return current_input_.is_jumping; }
    bool is_light_attack_pressed() const { return current_input_.light_attack; }
    bool is_heavy_attack_pressed() const { return current_input_.heavy_attack; }
    bool is_blocking_pressed() const { return current_input_.is_blocking; }
    bool is_special_pressed() const { return current_input_.special_attack; }

private:
    InputState current_input_;
    InputState previous_input_;
    class CombatManager* combat_manager_ = nullptr;
    
    // Input validation helpers
    bool validate_movement_input(float x, float y) const;
    void clamp_input_values();
};

