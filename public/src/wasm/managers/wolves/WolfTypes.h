#pragma once

#include <vector>
#include <cstdint>
#include "../../physics/FixedPoint.h"

enum class WolfType : std::uint8_t {
    Normal = 0,
    Alpha = 1,
    Scout = 2,
    Hunter = 3,
    Omega = 4
};

enum class WolfState : std::uint8_t {
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

enum class PackRole : std::uint8_t {
    Leader = 0,
    Bruiser = 1,
    Skirmisher = 2,
    Support = 3,
    Scout = 4
};

enum class EmotionalState : std::uint8_t {
    Calm = 0,
    Aggressive = 1,
    Fearful = 2,
    Desperate = 3,
    Confident = 4,
    Frustrated = 5
};

enum class PackPlan : std::uint8_t {
    None = 0,
    Ambush = 1,
    Pincer = 2,
    Retreat = 3,
    Commit = 4,
    Flank = 5,
    Distract = 6,
    Regroup = 7
};

enum class AttackType : std::uint8_t {
    StandardLunge = 0,
    QuickJab = 1,
    PowerLunge = 2,
    Feint = 3
};

struct Wolf {
    std::uint32_t id = 0;
    WolfType type = WolfType::Normal;
    std::uint32_t physics_body_id = 0;

    Fixed x = Fixed::from_float(0.5f);
    Fixed y = Fixed::from_float(0.5f);
    Fixed vx = Fixed::from_int(0);
    Fixed vy = Fixed::from_int(0);
    Fixed facing_x = Fixed::from_int(1);
    Fixed facing_y = Fixed::from_int(0);

    float health = 100.0f;
    float max_health = 100.0f;
    float stamina = 1.0f;
    float damage = 15.0f;
    float speed = 0.25f;
    float detection_range = 0.4f;
    float attack_range = 0.08f;

    float base_speed = 0.25f;
    float base_detection_range = 0.4f;
    float base_attack_range = 0.08f;
    float base_damage = 15.0f;

    WolfState state = WolfState::Idle;
    PackRole pack_role = PackRole::Scout;
    EmotionalState emotion = EmotionalState::Calm;
    EmotionalState previous_emotion = EmotionalState::Calm;
    float state_timer = 0.0f;
    bool pack_command_received = false;
    std::uint8_t current_attack_type = 0;

    float aggression = 0.5f;
    float intelligence = 0.6f;
    float coordination = 0.65f;
    float morale = 0.7f;
    float awareness = 0.5f;

    std::uint32_t pack_id = 0;
    int pack_index = -1;

    float player_speed_estimate = 0.3f;
    float player_reaction_time = 0.3f;
    float last_player_block_time = 999.0f;
    float last_player_roll_time = 999.0f;
    float preferred_attack_angle = 0.0f;
    std::uint32_t successful_attacks = 0;
    std::uint32_t failed_attacks = 0;
    std::uint32_t player_blocks = 0;

    float attack_cooldown = 0.0f;
    float dodge_cooldown = 0.0f;
    float decision_timer = 0.0f;
    float collision_cooldown = 0.0f;  // Prevents immediate re-collision after separation

    float body_stretch = 1.0f;
    float head_pitch = 0.0f;
    float head_yaw = 0.0f;
    float tail_wag = 0.0f;
    float ear_rotation[2] = {0.0f, 0.0f};
    float leg_positions[4][2] = {{0.0f, 0.0f}, {0.0f, 0.0f}, {0.0f, 0.0f}, {0.0f, 0.0f}};

    float decision_interval = 0.15f;
    float health_at_state_enter = 100.0f;
};

struct Pack {
    std::uint32_t pack_id = 0;
    std::vector<std::uint32_t> wolf_ids;
    PackPlan current_plan = PackPlan::None;
    float plan_timer = 0.0f;
    float coordination_bonus = 1.0f;

    float pack_morale = 0.7f;
    int leader_index = -1;
};
