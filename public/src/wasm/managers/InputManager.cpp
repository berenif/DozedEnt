#include "InputManager.h"
#include "../GameGlobals.h"
#include "CombatManager.h"
#include <cmath>
#include <algorithm>

InputManager::InputManager() {
    // Initialize input state
    current_input_ = {};
    previous_input_ = {};
}

void InputManager::update_input(float input_x, float input_y, int rolling, int jumping,
                               int light_attack, int heavy_attack, int blocking, int special) {
    // Store previous state
    previous_input_ = current_input_;
    
    // Update current input
    current_input_.movement_x = input_x;
    current_input_.movement_y = input_y;
    current_input_.is_rolling = (rolling != 0);
    current_input_.is_jumping = (jumping != 0);
    current_input_.light_attack = (light_attack != 0);
    current_input_.heavy_attack = (heavy_attack != 0);
    current_input_.is_blocking = (blocking != 0);
    current_input_.special_attack = (special != 0);
    
    // Validate and clamp input values
    clamp_input_values();
    
    // Apply restrictions if player is stunned
    if (!is_input_allowed()) {
        apply_stun_restrictions();
    }
    
    // Normalize movement input
    normalize_movement_input();
}

void InputManager::normalize_movement_input() {
    float len_squared = current_input_.movement_x * current_input_.movement_x + 
                        current_input_.movement_y * current_input_.movement_y;
    
    // BUG FIX: Only normalize if magnitude is GREATER than 1.0
    // Normalizing inputs with magnitude < 1.0 would incorrectly amplify them
    // For example, (0.5, 0.5) has magnitude 0.707, normalizing would make it (0.707, 0.707) - larger!
    if (len_squared > 1.0f) {
        float len = std::sqrt(len_squared);
        current_input_.movement_x /= len;
        current_input_.movement_y /= len;
    }
}

void InputManager::clear_input_latches() {
    current_input_ = {};
    previous_input_ = {};
}

bool InputManager::is_input_allowed() const {
    // Check if player is stunned or in a state that prevents input
    if (combat_manager_) {
        return !combat_manager_->is_stunned();
    }
    return true;  // Allow input if combat manager not available
}

void InputManager::apply_stun_restrictions() {
    // Clear all inputs when stunned
    current_input_.movement_x = 0.0f;
    current_input_.movement_y = 0.0f;
    current_input_.is_rolling = false;
    current_input_.light_attack = false;
    current_input_.heavy_attack = false;
    current_input_.is_blocking = false;
    current_input_.special_attack = false;
}

bool InputManager::validate_movement_input(float x, float y) const {
    // Validate input is within reasonable bounds
    return (x >= -1.0f && x <= 1.0f && y >= -1.0f && y <= 1.0f);
}

void InputManager::clamp_input_values() {
    // Clamp movement input to valid range
    current_input_.movement_x = std::max(-1.0f, std::min(1.0f, current_input_.movement_x));
    current_input_.movement_y = std::max(-1.0f, std::min(1.0f, current_input_.movement_y));
}

