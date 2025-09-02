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

// Simple player attack state
enum class AttackState : unsigned char { Idle = 0, Windup = 1, Active = 2, Recovery = 3 };
static AttackState g_attack_state = AttackState::Idle;
static float g_attack_state_time = -1000.f;
static float g_attack_dir_x = 1.f;
static float g_attack_dir_y = 0.f;

// Tunables
static const float BASE_SPEED = 0.3f;
static const float ROLL_SPEED_MULTIPLIER = 2.6f;
static const float PLAYER_ACCEL = 12.0f;
static const float PLAYER_FRICTION = 9.0f;

// Combat tunables
static const float ATTACK_RANGE = 0.055f;
static const float BACK_ATTACK_COS_THRESHOLD = -0.3f;
static const float BLOCK_FACING_COS_THRESHOLD = 0.5f;
static const float PERFECT_PARRY_WINDOW = 0.16f;

// Player attack timings/arc
static const float ATTACK_WINDUP_SEC = 0.08f;
static const float ATTACK_ACTIVE_SEC = 0.12f;
static const float ATTACK_RECOVERY_SEC = 0.22f;
static const float ATTACK_ARC_COS_THRESHOLD = 0.34f;
static const float ATTACK_DAMAGE = 0.34f;
static const float ATTACK_STUN_SEC = 0.25f;
static const float ATTACK_KNOCKBACK = 0.12f;

// Data-driven timings
static const float ATTACK_COOLDOWN_SEC = 0.35f;
static const float ROLL_DURATION_SEC = 0.18f;
static const float ROLL_COOLDOWN_SEC = 0.80f;

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
    g_stamina += STAMINA_REGEN_PER_SEC * dtSeconds;
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


