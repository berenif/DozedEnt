#pragma once
#include "../physics/PhysicsTypes.h"
#include "../physics/CollisionLayers.h"
#include <cstdint>

/**
 * ArmManager - creates and updates articulated player arms using physics bodies and constraints.
 * Uses DistanceConstraint chains and PD servo forces on hand bodies to reach targets.
 */
class PhysicsManager;
class PlayerManager;

struct ArmChainIds {
    uint32_t anchor = 0;   // Kinematic (follows player chest)
    uint32_t upper = 0;    // Dynamic
    uint32_t forearm = 0;  // Dynamic
    uint32_t hand = 0;     // Dynamic
};

class ArmManager {
public:
    ArmManager();
    ~ArmManager() = default;

    void initialize(PhysicsManager* physics, PlayerManager* player);
    void update(float dt);

    // Targets in normalized world space (0..1); z ignored in 2D sim
    void set_left_target(float x, float y, float z);
    void set_right_target(float x, float y, float z);

    // Getters for joint positions (float, normalized world)
    void get_left_shoulder(float& x, float& y, float& z) const;
    void get_left_elbow(float& x, float& y, float& z) const;
    void get_left_hand(float& x, float& y, float& z) const;
    void get_right_shoulder(float& x, float& y, float& z) const;
    void get_right_elbow(float& x, float& y, float& z) const;
    void get_right_hand(float& x, float& y, float& z) const;

private:
    PhysicsManager* physics_ = nullptr;
    PlayerManager* player_ = nullptr;

    ArmChainIds left_{};
    ArmChainIds right_{};

    // Targets
    float left_tx_ = 0.5f, left_ty_ = 0.5f, left_tz_ = 0.0f;
    float right_tx_ = 0.5f, right_ty_ = 0.5f, right_tz_ = 0.0f;

    // Tunables
    float upper_len_ = 0.12f;
    float forearm_len_ = 0.11f;
    float hand_radius_ = 0.02f;
    float kp_ = 200.0f; // PD positional gain
    float kd_ = 12.0f;  // damping
    float arm_separation_min_ = 0.05f; // prevent left/right intersection near hands

    // Helpers
    void ensure_created();
    void create_arm(ArmChainIds& arm, float side_sign);
    void update_anchor_positions();
    void apply_servo_to_hand(uint32_t hand_id, float tx, float ty, float tz, float dt);
    void read_body_pos(uint32_t id, float& x, float& y, float& z) const;
};


