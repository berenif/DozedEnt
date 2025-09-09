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
static const float BASE_SPEED = 0.3f;
static const float ROLL_SPEED_MULTIPLIER = 2.6f;
static const float PLAYER_ACCEL = 12.0f;
static const float PLAYER_FRICTION = 9.0f;
static const float JUMP_POWER = -0.45f; // New: Initial jump velocity
static const float GRAVITY = 1.2f; // New: Gravity strength
static const int MAX_JUMPS = 2; // New: Max allowed jumps

// 5-Button Combat System Constants
static const float INPUT_BUFFER_TIME = 0.12f;      // 120ms input buffer
static const float PARRY_WINDOW = 0.12f;           // 120ms parry window
static const float PARRY_STUN_DURATION = 0.30f;    // 300ms stun on successful parry
static const float ROLL_IFRAME_DURATION = 0.30f;   // 300ms i-frames during roll

// Combat tunables
static const float ATTACK_RANGE = 0.055f;
static const float BACK_ATTACK_COS_THRESHOLD = -0.3f;
static const float BLOCK_FACING_COS_THRESHOLD = 0.5f;
static const float PERFECT_PARRY_WINDOW = 0.12f;   // Updated to match spec

// Light Attack (A1) timings
static const float LIGHT_WINDUP_SEC = 0.05f;
static const float LIGHT_ACTIVE_SEC = 0.08f;
static const float LIGHT_RECOVERY_SEC = 0.15f;
static const float LIGHT_DAMAGE = 0.20f;

// Heavy Attack (A2) timings
static const float HEAVY_WINDUP_SEC = 0.15f;       // Longer wind-up, can feint
static const float HEAVY_ACTIVE_SEC = 0.12f;
static const float HEAVY_RECOVERY_SEC = 0.25f;
static const float HEAVY_DAMAGE = 0.45f;

// Special Attack timings
static const float SPECIAL_WINDUP_SEC = 0.20f;
static const float SPECIAL_ACTIVE_SEC = 0.15f;
static const float SPECIAL_RECOVERY_SEC = 0.30f;
static const float SPECIAL_DAMAGE = 0.60f;

// Legacy attack constants (for compatibility)
static const float ATTACK_WINDUP_SEC = 0.08f;
static const float ATTACK_ACTIVE_SEC = 0.12f;
static const float ATTACK_RECOVERY_SEC = 0.22f;
static const float ATTACK_ARC_COS_THRESHOLD = 0.34f;
static const float ATTACK_DAMAGE = 0.34f;
static const float ATTACK_STUN_SEC = 0.25f;
static const float ATTACK_KNOCKBACK = 0.12f;

// Data-driven timings
static const float ATTACK_COOLDOWN_SEC = 0.35f;
static const float ROLL_DURATION_SEC = 0.30f;      // Updated for i-frames
static const float ROLL_COOLDOWN_SEC = 0.80f;

// Roll mechanics
static const float ROLL_SLIDE_DURATION = 0.20f;    // Low traction slide after i-frames
static const float ROLL_SLIDE_FRICTION = 0.3f;     // Reduced friction during slide

// Stamina tunables
static const float STAMINA_REGEN_PER_SEC = 0.10f;
static const float STAMINA_BLOCK_DRAIN_PER_SEC = 0.10f;
static const float STAMINA_ROLL_DRAIN_PER_SEC = 0.0f;
static const float STAMINA_ROLL_START_COST = 0.50f;
static const float STAMINA_BLOCK_START_COST = 0.10f;
static const float STAMINA_ATTACK_COST = 0.25f;

// World/walls
static const float WALL_CENTER_X = 0.5f;
static const float WALL_HALF_WIDTH = 0.0078125f;

// Radii
static const float PLAYER_RADIUS = 0.018f;
static const float ENEMY_RADIUS = 0.018f;

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


