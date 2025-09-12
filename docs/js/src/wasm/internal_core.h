// Core state, constants, math helpers, stamina/block, phases, RNG, landmarks/exits, wind
#pragma once

// ---------------- Module globals: player/core ----------------
static float g_pos_x = 0.5f;
static float g_pos_y = 0.5f;
static float g_vel_x = 0.f;
static float g_vel_y = 0.f;
static int g_is_rolling = 0;
static int g_prev_is_rolling = 0;
static float g_time_seconds = 0.f;
static int g_is_grounded = 1; // New: Player grounded status
static int g_jump_count = 0; // New: Tracks current jumps
// Track when the current player animation state started (for UI timing)
static float g_player_state_start_time = -1000.f;
// Wall slide state (exported)
static int g_is_wall_sliding = 0;
static float g_wall_slide_timer = 0.f;

// Block/parry state
static int g_blocking = 0;
static float g_block_face_x = 1.f;
static float g_block_face_y = 0.f;
static float g_block_start_time = -1000.f;

// Player facing
static float g_face_x = 1.f;
static float g_face_y = 0.f;

// Latch state
static int g_player_latched = 0;
static float g_latch_end_time = -1000.f;
static int g_latch_enemy_idx = -1;

// Resources
static float g_stamina = 1.0f;
static float g_max_stamina = 1.0f;
static float g_stamina_regen_mult = 1.0f;
static float g_hp = 1.0f;

// Combat multipliers
static float g_attack_damage_mult = 1.0f;
static float g_defense_mult = 1.0f;
// Movement and combat augments (choice-driven)
static float g_speed_mult = 1.0f;
static float g_lifesteal = 0.0f;          // fraction of damage dealt returned as HP
static float g_crit_chance = 0.1f;        // 0..1
static float g_dodge_chance = 0.05f;      // 0..1 (reserved)
static float g_wolf_damage_mult = 1.0f;   // extra damage vs wolves
static float g_treasure_multiplier = 1.0f; // currency gain multiplier
static float g_vision_radius_multiplier = 1.0f; // reserved for UI
static float g_hp_regen_per_sec = 0.0f;   // passive health regen (0..1 per second)

// Enhanced combat system - 5-button layout
enum class AttackState : unsigned char { Idle = 0, Windup = 1, Active = 2, Recovery = 3 };
enum class AttackType : unsigned char { Light = 0, Heavy = 1, Special = 2 };
static AttackState g_attack_state = AttackState::Idle;
static AttackType g_current_attack_type = AttackType::Light;
static float g_attack_state_time = -1000.f;
static float g_attack_dir_x = 1.f;
static float g_attack_dir_y = 0.f;

// Input buffer system
static float g_light_attack_buffer = 0.f;
static float g_heavy_attack_buffer = 0.f;
static float g_special_buffer = 0.f;
static float g_block_buffer = 0.f;
static float g_roll_buffer = 0.f;

// Enhanced roll state system
enum class RollState : unsigned char { Idle = 0, Active = 1, Sliding = 2 };
static RollState g_roll_state = RollState::Idle;
static float g_roll_start_time = -1000.f;
static float g_roll_direction_x = 1.f;
static float g_roll_direction_y = 0.f;

// Stun system for parry effects
static int g_is_stunned = 0;
static float g_stun_end_time = -1000.f;
static int g_parry_stun_target = -1;  // Enemy index that got stunned by parry

// Tunables
#include "generated/balance_data.h"
#ifndef BAL_BASE_SPEED
#define BAL_BASE_SPEED 0.3
#endif
#ifndef BAL_ROLL_SPEED_MULTIPLIER
#define BAL_ROLL_SPEED_MULTIPLIER 2.6
#endif
#ifndef BAL_PLAYER_ACCEL
#define BAL_PLAYER_ACCEL 12.0
#endif
#ifndef BAL_PLAYER_FRICTION
#define BAL_PLAYER_FRICTION 9.0
#endif
#ifndef BAL_JUMP_POWER
#define BAL_JUMP_POWER -0.45
#endif
#ifndef BAL_GRAVITY
#define BAL_GRAVITY 1.2
#endif
#ifndef BAL_MAX_JUMPS
#define BAL_MAX_JUMPS 2
#endif
static const float BASE_SPEED = (float)BAL_BASE_SPEED;
static const float ROLL_SPEED_MULTIPLIER = (float)BAL_ROLL_SPEED_MULTIPLIER;
static const float PLAYER_ACCEL = (float)BAL_PLAYER_ACCEL;
static const float PLAYER_FRICTION = (float)BAL_PLAYER_FRICTION;
static const float JUMP_POWER = (float)BAL_JUMP_POWER; // New: Initial jump velocity
static const float GRAVITY = (float)BAL_GRAVITY; // New: Gravity strength
static const int MAX_JUMPS = (int)BAL_MAX_JUMPS; // New: Max allowed jumps

// 5-Button Combat System Constants
#ifndef BAL_INPUT_BUFFER_TIME
#define BAL_INPUT_BUFFER_TIME 0.12
#endif
#ifndef BAL_PARRY_WINDOW
#define BAL_PARRY_WINDOW 0.12
#endif
#ifndef BAL_PARRY_STUN_DURATION
#define BAL_PARRY_STUN_DURATION 0.30
#endif
#ifndef BAL_ROLL_IFRAME_DURATION
#define BAL_ROLL_IFRAME_DURATION 0.30
#endif
static const float INPUT_BUFFER_TIME = (float)BAL_INPUT_BUFFER_TIME;      // 120ms input buffer
static const float PARRY_WINDOW = (float)BAL_PARRY_WINDOW;           // 120ms parry window
static const float PARRY_STUN_DURATION = (float)BAL_PARRY_STUN_DURATION;    // 300ms stun on successful parry
static const float ROLL_IFRAME_DURATION = (float)BAL_ROLL_IFRAME_DURATION;   // 300ms i-frames during roll

// Combat tunables
#ifndef BAL_ATTACK_RANGE
#define BAL_ATTACK_RANGE 0.055
#endif
#ifndef BAL_BACK_ATTACK_COS_THRESHOLD
#define BAL_BACK_ATTACK_COS_THRESHOLD -0.3
#endif
#ifndef BAL_BLOCK_FACING_COS_THRESHOLD
#define BAL_BLOCK_FACING_COS_THRESHOLD 0.5
#endif
#ifndef BAL_PERFECT_PARRY_WINDOW
#define BAL_PERFECT_PARRY_WINDOW 0.12
#endif
static const float ATTACK_RANGE = (float)BAL_ATTACK_RANGE;
static const float BACK_ATTACK_COS_THRESHOLD = (float)BAL_BACK_ATTACK_COS_THRESHOLD;
static const float BLOCK_FACING_COS_THRESHOLD = (float)BAL_BLOCK_FACING_COS_THRESHOLD;
static const float PERFECT_PARRY_WINDOW = (float)BAL_PERFECT_PARRY_WINDOW;   // Updated to match spec

// Light Attack (A1) timings
#ifndef BAL_LIGHT_WINDUP_SEC
#define BAL_LIGHT_WINDUP_SEC 0.05
#endif
#ifndef BAL_LIGHT_ACTIVE_SEC
#define BAL_LIGHT_ACTIVE_SEC 0.08
#endif
#ifndef BAL_LIGHT_RECOVERY_SEC
#define BAL_LIGHT_RECOVERY_SEC 0.15
#endif
#ifndef BAL_LIGHT_DAMAGE
#define BAL_LIGHT_DAMAGE 0.20
#endif
static const float LIGHT_WINDUP_SEC = (float)BAL_LIGHT_WINDUP_SEC;
static const float LIGHT_ACTIVE_SEC = (float)BAL_LIGHT_ACTIVE_SEC;
static const float LIGHT_RECOVERY_SEC = (float)BAL_LIGHT_RECOVERY_SEC;
static const float LIGHT_DAMAGE = (float)BAL_LIGHT_DAMAGE;

// Heavy Attack (A2) timings
#ifndef BAL_HEAVY_WINDUP_SEC
#define BAL_HEAVY_WINDUP_SEC 0.15
#endif
#ifndef BAL_HEAVY_ACTIVE_SEC
#define BAL_HEAVY_ACTIVE_SEC 0.12
#endif
#ifndef BAL_HEAVY_RECOVERY_SEC
#define BAL_HEAVY_RECOVERY_SEC 0.25
#endif
#ifndef BAL_HEAVY_DAMAGE
#define BAL_HEAVY_DAMAGE 0.45
#endif
static const float HEAVY_WINDUP_SEC = (float)BAL_HEAVY_WINDUP_SEC;       // Longer wind-up, can feint
static const float HEAVY_ACTIVE_SEC = (float)BAL_HEAVY_ACTIVE_SEC;
static const float HEAVY_RECOVERY_SEC = (float)BAL_HEAVY_RECOVERY_SEC;
static const float HEAVY_DAMAGE = (float)BAL_HEAVY_DAMAGE;

// Special Attack timings
#ifndef BAL_SPECIAL_WINDUP_SEC
#define BAL_SPECIAL_WINDUP_SEC 0.20
#endif
#ifndef BAL_SPECIAL_ACTIVE_SEC
#define BAL_SPECIAL_ACTIVE_SEC 0.15
#endif
#ifndef BAL_SPECIAL_RECOVERY_SEC
#define BAL_SPECIAL_RECOVERY_SEC 0.30
#endif
#ifndef BAL_SPECIAL_DAMAGE
#define BAL_SPECIAL_DAMAGE 0.60
#endif
static const float SPECIAL_WINDUP_SEC = (float)BAL_SPECIAL_WINDUP_SEC;
static const float SPECIAL_ACTIVE_SEC = (float)BAL_SPECIAL_ACTIVE_SEC;
static const float SPECIAL_RECOVERY_SEC = (float)BAL_SPECIAL_RECOVERY_SEC;
static const float SPECIAL_DAMAGE = (float)BAL_SPECIAL_DAMAGE;

// Legacy attack constants (for compatibility)
#ifndef BAL_ATTACK_WINDUP_SEC
#define BAL_ATTACK_WINDUP_SEC 0.08
#endif
#ifndef BAL_ATTACK_ACTIVE_SEC
#define BAL_ATTACK_ACTIVE_SEC 0.12
#endif
#ifndef BAL_ATTACK_RECOVERY_SEC
#define BAL_ATTACK_RECOVERY_SEC 0.22
#endif
#ifndef BAL_ATTACK_ARC_COS_THRESHOLD
#define BAL_ATTACK_ARC_COS_THRESHOLD 0.34
#endif
#ifndef BAL_ATTACK_DAMAGE
#define BAL_ATTACK_DAMAGE 0.34
#endif
#ifndef BAL_ATTACK_STUN_SEC
#define BAL_ATTACK_STUN_SEC 0.25
#endif
#ifndef BAL_ATTACK_KNOCKBACK
#define BAL_ATTACK_KNOCKBACK 0.12
#endif
static const float ATTACK_WINDUP_SEC = (float)BAL_ATTACK_WINDUP_SEC;
static const float ATTACK_ACTIVE_SEC = (float)BAL_ATTACK_ACTIVE_SEC;
static const float ATTACK_RECOVERY_SEC = (float)BAL_ATTACK_RECOVERY_SEC;
static const float ATTACK_ARC_COS_THRESHOLD = (float)BAL_ATTACK_ARC_COS_THRESHOLD;
static const float ATTACK_DAMAGE = (float)BAL_ATTACK_DAMAGE;
static const float ATTACK_STUN_SEC = (float)BAL_ATTACK_STUN_SEC;
static const float ATTACK_KNOCKBACK = (float)BAL_ATTACK_KNOCKBACK;

// Data-driven timings
#ifndef BAL_ATTACK_COOLDOWN_SEC
#define BAL_ATTACK_COOLDOWN_SEC 0.35
#endif
#ifndef BAL_ROLL_DURATION_SEC
#define BAL_ROLL_DURATION_SEC 0.30
#endif
#ifndef BAL_ROLL_COOLDOWN_SEC
#define BAL_ROLL_COOLDOWN_SEC 0.80
#endif
static const float ATTACK_COOLDOWN_SEC = (float)BAL_ATTACK_COOLDOWN_SEC;
static const float ROLL_DURATION_SEC = (float)BAL_ROLL_DURATION_SEC;      // Updated for i-frames
static const float ROLL_COOLDOWN_SEC = (float)BAL_ROLL_COOLDOWN_SEC;

// Roll mechanics
#ifndef BAL_ROLL_SLIDE_DURATION
#define BAL_ROLL_SLIDE_DURATION 0.20
#endif
#ifndef BAL_ROLL_SLIDE_FRICTION
#define BAL_ROLL_SLIDE_FRICTION 0.3
#endif
static const float ROLL_SLIDE_DURATION = (float)BAL_ROLL_SLIDE_DURATION;    // Low traction slide after i-frames
static const float ROLL_SLIDE_FRICTION = (float)BAL_ROLL_SLIDE_FRICTION;     // Reduced friction during slide

// Stamina tunables
#ifndef BAL_STAMINA_REGEN_PER_SEC
#define BAL_STAMINA_REGEN_PER_SEC 0.10
#endif
#ifndef BAL_STAMINA_BLOCK_DRAIN_PER_SEC
#define BAL_STAMINA_BLOCK_DRAIN_PER_SEC 0.10
#endif
#ifndef BAL_STAMINA_ROLL_DRAIN_PER_SEC
#define BAL_STAMINA_ROLL_DRAIN_PER_SEC 0.0
#endif
#ifndef BAL_STAMINA_ROLL_START_COST
#define BAL_STAMINA_ROLL_START_COST 0.50
#endif
#ifndef BAL_STAMINA_BLOCK_START_COST
#define BAL_STAMINA_BLOCK_START_COST 0.10
#endif
#ifndef BAL_STAMINA_ATTACK_COST
#define BAL_STAMINA_ATTACK_COST 0.25
#endif
static const float STAMINA_REGEN_PER_SEC = (float)BAL_STAMINA_REGEN_PER_SEC;
static const float STAMINA_BLOCK_DRAIN_PER_SEC = (float)BAL_STAMINA_BLOCK_DRAIN_PER_SEC;
static const float STAMINA_ROLL_DRAIN_PER_SEC = (float)BAL_STAMINA_ROLL_DRAIN_PER_SEC;
static const float STAMINA_ROLL_START_COST = (float)BAL_STAMINA_ROLL_START_COST;
static const float STAMINA_BLOCK_START_COST = (float)BAL_STAMINA_BLOCK_START_COST;
static const float STAMINA_ATTACK_COST = (float)BAL_STAMINA_ATTACK_COST;

// World/walls
#ifndef BAL_WALL_CENTER_X
#define BAL_WALL_CENTER_X 0.5
#endif
#ifndef BAL_WALL_HALF_WIDTH
#define BAL_WALL_HALF_WIDTH 0.0078125
#endif
static const float WALL_CENTER_X = (float)BAL_WALL_CENTER_X;
static const float WALL_HALF_WIDTH = (float)BAL_WALL_HALF_WIDTH;

// Radii
static const float PLAYER_RADIUS = (float)BAL_PLAYER_RADIUS;
#ifndef BAL_ENEMY_RADIUS
#define BAL_ENEMY_RADIUS 0.018
#endif
static const float ENEMY_RADIUS = (float)BAL_ENEMY_RADIUS;

// Math helpers
static inline float clamp01(float v) { return v < 0.f ? 0.f : (v > 1.f ? 1.f : v); }
static inline float vec_len(float x, float y) { return __builtin_sqrtf(x * x + y * y); }
static inline void normalize(float &x, float &y) {
  float l = vec_len(x, y);
  if (l > 0.f) { x /= l; y /= l; }
}

// Utility: vertical wall resolve (retained for compatibility)
static inline float resolve_vertical_wall(float prevX, float nextX, float intentX) {
  const float leftBoundary = WALL_CENTER_X - WALL_HALF_WIDTH;
  const float rightBoundary = WALL_CENTER_X + WALL_HALF_WIDTH;
  float resolvedX = clamp01(nextX);
  if (prevX < leftBoundary && resolvedX >= leftBoundary && resolvedX <= rightBoundary) {
    resolvedX = leftBoundary;
  } else if (prevX > rightBoundary && resolvedX <= rightBoundary && resolvedX >= leftBoundary) {
    resolvedX = rightBoundary;
  } else if (resolvedX > leftBoundary && resolvedX < rightBoundary) {
    if (intentX > 0.f) {
      resolvedX = leftBoundary;
    } else if (intentX < 0.f) {
      resolvedX = rightBoundary;
    } else {
      resolvedX = (prevX <= WALL_CENTER_X) ? leftBoundary : rightBoundary;
    }
  }
  return resolvedX;
}

// Stamina/block update
static inline void apply_stamina_and_block_update(float dtSeconds) {
  if (dtSeconds <= 0.f) return;
  if (g_is_rolling) {
    g_stamina -= STAMINA_ROLL_DRAIN_PER_SEC * dtSeconds;
  } else if (g_blocking) {
    g_stamina -= STAMINA_BLOCK_DRAIN_PER_SEC * dtSeconds;
  } else {
    g_stamina += (STAMINA_REGEN_PER_SEC * g_stamina_regen_mult) * dtSeconds;
  }
  if (g_stamina < 0.f) g_stamina = 0.f; else if (g_stamina > 1.f) g_stamina = 1.f;
  if (g_blocking && g_stamina <= 0.f) { g_blocking = 0; }
}

// Game phases
enum class GamePhase : unsigned char { Explore = 0, Fight = 1, Choose = 2, PowerUp = 3, Risk = 4, Escalate = 5, CashOut = 6, Reset = 7 };

// RNG
static unsigned long long g_rng = 1ull;
static inline unsigned long long rng_next() {
  unsigned long long x = g_rng;
  x ^= x >> 12; x ^= x << 25; x ^= x >> 27;
  g_rng = x;
  return x * 2685821657736338717ull;
}
static inline unsigned int rng_u32() { return (unsigned int)(rng_next() >> 32); }
static inline float rng_float01() { return (float)((rng_next() >> 40) / 16777216.0); }

// Run-scoped state
static GamePhase g_phase = GamePhase::Explore;
static unsigned int g_wolf_kills_since_choice = 0;
static float g_last_attack_time = -1000.f;
static float g_last_roll_time = -1000.f;
static unsigned int g_room_count = 0;  // Track room progression for early room spawn logic

// Landmarks/exits snapshot
#define MAX_LANDMARKS 4
#define MAX_EXITS 2
static unsigned char g_landmark_count = 0;
static float g_landmarks_x[MAX_LANDMARKS];
static float g_landmarks_y[MAX_LANDMARKS];
static unsigned char g_exit_count = 0;
static float g_exits_x[MAX_EXITS];
static float g_exits_y[MAX_EXITS];

// Environment inputs (wind)
static float g_wind_x = 0.f;
static float g_wind_y = 0.f;

// Biome/Zone Definitions
enum class BiomeType : unsigned char {
    Forest = 0,
    Swamp = 1,
    Mountains = 2,
    Plains = 3,
    Count = 4 // Keep at end for total count
};

static BiomeType g_current_biome = BiomeType::Forest;

// ---------------- Player Animation State (UI driven by WASM) ----------------
enum PlayerAnimState {
    PlayerAnimState_Idle = 0,
    PlayerAnimState_Running = 1,
    PlayerAnimState_Attacking = 2,
    PlayerAnimState_Blocking = 3,
    PlayerAnimState_Rolling = 4,
    PlayerAnimState_Hurt = 5,
    PlayerAnimState_Dead = 6,
    PlayerAnimState_Jumping = 7,
    PlayerAnimState_DoubleJumping = 8,
    PlayerAnimState_Landing = 9,
    PlayerAnimState_WallSliding = 10,
    PlayerAnimState_Dashing = 11,
    PlayerAnimState_ChargingAttack = 12
};
extern PlayerAnimState g_player_anim_state;

// Expose current state timer to UI via export in game.cpp

// ---------------- Player Modifiers (from choices, etc) ----------------
extern float g_max_stamina;


