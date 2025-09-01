// Minimal C++ game logic compiled to WASM
// - Maintains player position in normalized [0,1] space
// - Applies movement and collision against a vertical wall centered at x=0.5

#include "internal_core.h"
#include "obstacles.h"
#include "terrain_hazards.h"
#include "scent.h"
#include "enemies.h"
#include "choices.h"
#include "risk.h"
#include "escalate.h"
#include "cashout.h"

#if 0

extern "C" {

// State stored in module globals
static float g_pos_x = 0.5f;
static float g_pos_y = 0.5f;
static float g_vel_x = 0.f; // player velocity x (for smoothed motion)
static float g_vel_y = 0.f; // player velocity y (for smoothed motion)
static int g_is_rolling = 0;  // updated each frame via update()
static int g_prev_is_rolling = 0;
// Simulation time in seconds, advanced only by update(dt)
static float g_time_seconds = 0.f;

// Block/parry state
static int g_blocking = 0;
static float g_block_face_x = 1.f;
static float g_block_face_y = 0.f;
static float g_block_start_time = -1000.f; // seconds

// Player facing (used for back-attack checks); follows input or block facing
static float g_face_x = 1.f;
static float g_face_y = 0.f;

// Latch state: when a wolf back-attacks successfully, it latches and drags the player
static int g_player_latched = 0;
static float g_latch_end_time = -1000.f;
static int g_latch_enemy_idx = -1;

// Stamina (normalized 0..1)
static float g_stamina = 1.0f;
// Player HP (normalized 0..1) for UI/demo damage hooks
static float g_hp = 1.0f;

// Simple player attack state (for UI timing hooks)
enum class AttackState : unsigned char { Idle = 0, Windup = 1, Active = 2, Recovery = 3 };
static AttackState g_attack_state = AttackState::Idle;
static float g_attack_state_time = -1000.f;
static float g_attack_dir_x = 1.f;
static float g_attack_dir_y = 0.f;

// Tunables (normalized units per second)
static const float BASE_SPEED = 0.3f;            // matches docs/site.js
static const float ROLL_SPEED_MULTIPLIER = 2.6f; // matches docs/site.js
// Player movement smoothing (accel/friction in units per second)
static const float PLAYER_ACCEL = 12.0f;    // how fast velocity follows desired
static const float PLAYER_FRICTION = 9.0f;  // damping to reduce glide

// Combat tunables (normalized space/time)
// Roughly ~70px in 1280x720 => 70/1280 ~= 0.0547
static const float ATTACK_RANGE = 0.055f;
// Facing tolerance: cos(60 deg) = 0.5
static const float BACK_ATTACK_COS_THRESHOLD = -0.3f; // dot threshold to consider attacker behind player
static const float BLOCK_FACING_COS_THRESHOLD = 0.5f;
// Perfect parry window in seconds
static const float PERFECT_PARRY_WINDOW = 0.16f;

// Player attack timings and arc
static const float ATTACK_WINDUP_SEC = 0.08f;
static const float ATTACK_ACTIVE_SEC = 0.12f;
static const float ATTACK_RECOVERY_SEC = 0.22f;
// Arc threshold for enemy hits (cosine of half-angle). cos(70deg) ~ 0.342
static const float ATTACK_ARC_COS_THRESHOLD = 0.34f;
// Hit effects
static const float ATTACK_DAMAGE = 0.34f;      // subtract from enemy health (0..1)
static const float ATTACK_STUN_SEC = 0.25f;    // enemy stunned duration
static const float ATTACK_KNOCKBACK = 0.12f;   // instantaneous velocity impulse

// Data-driven timings (seconds)
static const float ATTACK_COOLDOWN_SEC = 0.35f;
static const float ROLL_DURATION_SEC = 0.18f;
static const float ROLL_COOLDOWN_SEC = 0.80f;

// Stamina tunables (normalized 0..1 corresponding to 0..100)
// Requested design:
// - Max stamina: 100
// - Roll cost: 50 (instant on start)
// - Attack cost: 25 (instant)
// - Block cost: 10 on start, plus 10 per second while held
// - Regen rate not specified; choose 10 per second for balance
static const float STAMINA_REGEN_PER_SEC = 0.10f;        // +10 per second when idle
static const float STAMINA_BLOCK_DRAIN_PER_SEC = 0.10f;  // -10 per second while blocking
static const float STAMINA_ROLL_DRAIN_PER_SEC = 0.0f;    // no ongoing drain during roll
static const float STAMINA_ROLL_START_COST = 0.50f;      // -50 on roll start
static const float STAMINA_BLOCK_START_COST = 0.10f;     // -10 on block start
static const float STAMINA_ATTACK_COST = 0.25f;          // -25 per attack

// Wall geometry (normalized)
// Canvas is 1280x720; 20px wall => half width = 10/1280 = 0.0078125f
static const float WALL_CENTER_X = 0.5f;
static const float WALL_HALF_WIDTH = 0.0078125f;

// Collision radius for player/enemies (normalized units)
static const float PLAYER_RADIUS = 0.018f;
static const float ENEMY_RADIUS = 0.018f;

// Clamp helper
static inline float clamp01(float v) {
  return v < 0.f ? 0.f : (v > 1.f ? 1.f : v);
}

static inline float vec_len(float x, float y) {
  return __builtin_sqrtf(x * x + y * y);
}

static inline void normalize(float &x, float &y) {
  float l = vec_len(x, y);
  if (l > 0.f) { x /= l; y /= l; }
}
}

// Provide a trivial entry point to satisfy STANDALONE_WASM linking
int main() { return 0; }
extern "C" {

extern "C" {
// Forward declaration for internal use by AI when resolving hits
int handle_incoming_attack(float attackerX, float attackerY, float attackDirX, float attackDirY);
// RNG helpers are defined later; provide forward declarations for earlier use
static inline unsigned int rng_u32();
static inline float rng_float01();
// ------------------------------------------------------------
// Shared helpers (geometry, resources)
// ------------------------------------------------------------
static inline float resolve_vertical_wall(float prevX, float nextX, float intentX) {
  const float leftBoundary = WALL_CENTER_X - WALL_HALF_WIDTH;
  const float rightBoundary = WALL_CENTER_X + WALL_HALF_WIDTH;

  float resolvedX = clamp01(nextX);

  // If previously left of wall and attempting to cross to right side, clamp to left boundary
  if (prevX < leftBoundary && resolvedX >= leftBoundary && resolvedX <= rightBoundary) {
    resolvedX = leftBoundary;
  }
  // If previously right of wall and attempting to cross to left side, clamp to right boundary
  else if (prevX > rightBoundary && resolvedX <= rightBoundary && resolvedX >= leftBoundary) {
    resolvedX = rightBoundary;
  }
  // If already within the wall region, push out based on movement direction or previous side
  else if (resolvedX > leftBoundary && resolvedX < rightBoundary) {
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

  // If stamina is depleted, automatically drop block state
  if (g_blocking && g_stamina <= 0.f) {
    g_blocking = 0;
  }
}
// ------------------------------------------------------------
// Minimal run/choice state (ARPG loop scaffolding)
// ------------------------------------------------------------
enum class GamePhase : unsigned char { Explore = 0, Fight = 1, Choose = 2, PowerUp = 3, Risk = 4, Escalate = 5, CashOut = 6, Reset = 7 };

// ------------------------------------------------------------
// Static obstacles: randomly placed discs; ensure walkable area
// ------------------------------------------------------------
#define MAX_OBSTACLES 16
static unsigned char g_obstacle_count = 0;
static float g_obstacles_x[MAX_OBSTACLES];
static float g_obstacles_y[MAX_OBSTACLES];
static float g_obstacles_r[MAX_OBSTACLES];

static inline void obstacle_clear() {
  g_obstacle_count = 0;
}

static inline float obstacle_min_distance_to_player_start(float ox, float oy) {
  float dx = ox - g_pos_x, dy = oy - g_pos_y;
  return vec_len(dx, dy);
}

static inline int obstacle_overlaps_any(float ox, float oy, float orad) {
  for (int i = 0; i < (int)g_obstacle_count; ++i) {
    float dx = ox - g_obstacles_x[i];
    float dy = oy - g_obstacles_y[i];
    float need = orad + g_obstacles_r[i] + 0.012f; // spacing buffer
    if (dx * dx + dy * dy < need * need) return 1;
  }
  return 0;
}

static inline void resolve_obstacle_collision(float prevX, float prevY, float &nx, float &ny) {
  // Clamp to world first
  nx = clamp01(nx);
  ny = clamp01(ny);
  // Push out of any overlapping obstacle discs
  for (int iter = 0; iter < 2; ++iter) { // a couple of relaxation passes
    for (int i = 0; i < (int)g_obstacle_count; ++i) {
      float ox = g_obstacles_x[i], oy = g_obstacles_y[i], orad = g_obstacles_r[i] + PLAYER_RADIUS;
      float dx = nx - ox, dy = ny - oy;
      float d2 = dx * dx + dy * dy;
      float r2 = orad * orad;
      if (d2 < r2) {
        float d = __builtin_sqrtf(d2);
        if (d > 1e-5f) {
          float push = (orad - d) + 1e-4f;
          nx += (dx / d) * push;
          ny += (dy / d) * push;
        } else {
          // exactly at center; nudge away from previous position
          float ndx = nx - prevX, ndy = ny - prevY;
          if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
          float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
          nx += ndx * (orad + 1e-3f);
          ny += ndy * (orad + 1e-3f);
        }
        // keep in bounds
        if (nx < 0.f) nx = 0.f; else if (nx > 1.f) nx = 1.f;
        if (ny < 0.f) ny = 0.f; else if (ny > 1.f) ny = 1.f;
      }
    }
  }
}

// Push player out of any overlapping enemies (disc-disc resolution)
// moved below enemy declarations

// Simple grid flood-fill to guarantee a walkable route from start to center
static inline int is_cell_blocked(int cx, int cy, int gw, int gh) {
  float x = (float)cx / (float)(gw - 1);
  float y = (float)cy / (float)(gh - 1);
  for (int i = 0; i < (int)g_obstacle_count; ++i) {
    float dx = x - g_obstacles_x[i];
    float dy = y - g_obstacles_y[i];
    float rr = g_obstacles_r[i] + PLAYER_RADIUS * 1.1f; // a bit conservative
    if (dx * dx + dy * dy < rr * rr) return 1;
  }
  return 0;
}

static int path_exists_to_center() {
  const int GW = 41; // odd so center maps nicely
  const int GH = 23;
  int visited[GH][GW];
  for (int y = 0; y < GH; ++y) for (int x = 0; x < GW; ++x) visited[y][x] = 0;
  int qx[GW * GH];
  int qy[GW * GH];
  int qh = 0, qt = 0;
  int sx = (int)(g_pos_x * (GW - 1)); if (sx < 0) sx = 0; if (sx >= GW) sx = GW - 1;
  int sy = (int)(g_pos_y * (GH - 1)); if (sy < 0) sy = 0; if (sy >= GH) sy = GH - 1;
  int tx = GW / 2;
  int ty = GH / 2;
  if (is_cell_blocked(sx, sy, GW, GH)) return 0;
  qx[qh] = sx; qy[qh] = sy; qh++; visited[sy][sx] = 1;
  const int dirs[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
  while (qt < qh) {
    int cx = qx[qt]; int cy = qy[qt]; qt++;
    if (cx == tx && cy == ty) return 1;
    for (int k = 0; k < 4; ++k) {
      int nx = cx + dirs[k][0]; int ny = cy + dirs[k][1];
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      if (visited[ny][nx]) continue;
      if (is_cell_blocked(nx, ny, GW, GH)) continue;
      visited[ny][nx] = 1;
      qx[qh] = nx; qy[qh] = ny; qh++;
    }
  }
  return 0;
}

static void generate_obstacles_walkable() {
  obstacle_clear();
  // Target number scaled lightly by seed for variety
  int target = 8 + (int)(rng_u32() % 5u); // 8..12
  const int MAX_TRIES = 60;
  for (int attempt = 0; attempt < MAX_TRIES; ++attempt) {
    g_obstacle_count = 0;
    for (int i = 0; i < target; ++i) {
      // sample radius and position
      float r = 0.018f + 0.022f * rng_float01();
      float ox = 0.08f + 0.84f * rng_float01();
      float oy = 0.08f + 0.84f * rng_float01();
      if (obstacle_min_distance_to_player_start(ox, oy) < (r + 0.10f)) { i--; continue; }
      if (obstacle_overlaps_any(ox, oy, r)) { i--; continue; }
      g_obstacles_x[g_obstacle_count] = ox;
      g_obstacles_y[g_obstacle_count] = oy;
      g_obstacles_r[g_obstacle_count] = r;
      g_obstacle_count++;
      if (g_obstacle_count >= MAX_OBSTACLES) break;
    }
    if (path_exists_to_center()) {
      // success
      return;
    }
  }
  // Fallback: fewer, smaller obstacles if we failed all attempts
  g_obstacle_count = 0;
  int fallback = 5;
  for (int i = 0; i < fallback; ++i) {
    float r = 0.016f + 0.012f * rng_float01();
    float ox = 0.1f + 0.8f * rng_float01();
    float oy = 0.1f + 0.8f * rng_float01();
    if (obstacle_overlaps_any(ox, oy, r)) { i--; continue; }
    g_obstacles_x[g_obstacle_count] = ox;
    g_obstacles_y[g_obstacle_count] = oy;
    g_obstacles_r[g_obstacle_count] = r;
    g_obstacle_count++;
    if (g_obstacle_count >= MAX_OBSTACLES) break;
  }
}

// ------------------------------------------------------------
// Enemy system scaffolding (WASM-first, UI renders snapshot only)
// ------------------------------------------------------------
enum class EnemyType : unsigned char { Wolf = 0, Dummy = 1 };
enum class EnemyState : unsigned char { Idle = 0, Seek = 1, Circle = 2, Harass = 3, Recover = 4 };
// Pack roles for wolves (optional UI exposure)
enum class PackRole : unsigned char { Lead = 0, FlankL = 1, FlankR = 2, Harasser = 3, PupGuard = 4, None = 255 };

#define MAX_ENEMIES 16
#define MAX_SOUND_PINGS 32

struct SoundPing {
  float x;
  float y;
  float intensity; // 0..1
  float timeSeconds; // when recorded
};

struct EnemyMemory {
  // Last seen or last strong scent of the prey
  float lastSeenX;
  float lastSeenY;
  float lastSeenTime;
  float lastScentX;
  float lastScentY;
  float lastScentStrength; // 0..1
  float lastSeenConfidence; // 0..1
  float lastScentConfidence; // 0..1
};

struct Enemy {
  unsigned char active;      // 1 if in use
  EnemyType type;            // behavior dispatch key
  EnemyState state;          // high-level readable state
  float x, y;                // position in normalized space
  float vx, vy;              // velocity (for simple steering)
  float faceX, faceY;        // facing (normalized)
  float stamina;             // local resource for AI actions 0..1
  float health;              // enemy health 0..1
  EnemyMemory mem;           // short-term memory scaffold
  // Attack/lunge bookkeeping
  float lastLungeTime;       // last time a lunge or feint started
  float lungeEndTime;        // time when current lunge ends (if > now)
  float feintEndTime;        // time when current feint ends (if > now)
  float lungeDirX, lungeDirY; // cached direction at lunge start
  // Awareness gate
  unsigned char noticed;     // 1 if player has been visually noticed at least once
  float noticeAcquiredTime;  // time when visual notice was first acquired
  // Fatigue 0..1 (high means tired)
  float fatigue;
  // Search behavior seed
  float searchSeed;
};

static Enemy g_enemies[MAX_ENEMIES];
static unsigned char g_enemy_count = 0; // number of active entries (<= MAX_ENEMIES)

// Environmental inputs (forwarded from UI; affect AI but are not logic in UI)
static float g_wind_x = 0.f;
static float g_wind_y = 0.f;
static SoundPing g_sounds[MAX_SOUND_PINGS];
static unsigned char g_sound_count = 0; // ring size (<= MAX_SOUND_PINGS)

// Danger zones (blackboard): torches, traps, AoEs; UI posts, AI avoids
#define MAX_DANGER_ZONES 16
struct DangerZone {
  float x;
  float y;
  float radius;
  float strength;    // 0..1 avoidance weight
  float expiresAt;   // absolute time in seconds
};
static DangerZone g_dangers[MAX_DANGER_ZONES];
static unsigned char g_danger_count = 0;

// Den location (defense objective). If radius <= 0, considered unset
static float g_den_x = 0.5f;
static float g_den_y = 0.5f;
static float g_den_radius = 0.f;

// Tunables for enemies
static const float ENEMY_BASE_SPEED = 0.18f;
static const float ENEMY_CIRCLE_RADIUS = 0.08f;
static const float ENEMY_SEEK_RANGE = 0.45f;
static const float ENEMY_HARASS_RANGE = 0.11f;
static const float ENEMY_ACCEL = 1.1f; // steering accel (units/sec^2) — less snappy to avoid glidey feel
static const float ENEMY_FRICTION = 2.0f; // per-second velocity damping to curb glide
static const float ENEMY_MAX_SPEED = 0.26f; // hard cap to prevent overspeed bursts

// Wolf attack tunables
static const float ENEMY_LUNGE_RANGE = 0.125f;     // start lunge when within this distance
static const float ENEMY_LUNGE_SPEED = 0.42f;      // lunge dash speed
static const float ENEMY_LUNGE_DURATION = 0.16f;   // lunge active time
static const float ENEMY_LUNGE_COOLDOWN = 0.90f;   // cooldown between lunges/feints
static const float ENEMY_FEINT_PROB = 0.35f;       // chance to feint instead of real lunge
static const float ENEMY_FEINT_DURATION = 0.10f;   // brief forward fake
// Awareness/chase gating: wolves must first notice, then chase before attacking
static const float ENEMY_MIN_CHASE_BEFORE_LUNGE = 0.75f; // seconds after first notice

// Fatigue tuning and prey danger cone
static const float FATIGUE_PER_SPEED = 0.9f;        // per-second at full speed
static const float FATIGUE_LUNGE_BONUS = 0.25f;     // added when lunge starts
static const float FATIGUE_RECOVERY_PER_SEC = 0.35f; // per-second when not sprinting
static const float PREY_CONE_COS = 0.7f;            // ~45deg cone considered dangerous
static const float PREY_CONE_WEIGHT = 0.55f;        // repulsion weight from cone

// Latch drag
static const float LATCH_DURATION = 1.0f;
static const float LATCH_DRAG_SPEED = 0.22f;

// -------------------- Scent field (grid) --------------------
// Compact grid covering normalized [0,1]^2; advects with wind and decays
static const int SCENT_W = 48; // 16:9 friendly grid
static const int SCENT_H = 27;
static float g_scent[SCENT_H][SCENT_W];
static float g_scent_tmp[SCENT_H][SCENT_W];
static const float SCENT_DECAY_PER_SEC = 0.35f;     // per-second linear decay
static const float SCENT_EMIT_PER_SEC = 2.2f;        // emission amplitude per second at prey position
static const float SCENT_ADVECT_CELLS_PER_SEC = 6.0f; // cells per second shift due to wind

static inline void scent_clear() {
  for (int y = 0; y < SCENT_H; ++y) for (int x = 0; x < SCENT_W; ++x) g_scent[y][x] = 0.f;
}

static inline void scent_deposit_at(float xNorm, float yNorm, float dt) {
  int ix = (int)(xNorm * (SCENT_W - 1)); if (ix < 0) ix = 0; if (ix >= SCENT_W) ix = SCENT_W - 1;
  int iy = (int)(yNorm * (SCENT_H - 1)); if (iy < 0) iy = 0; if (iy >= SCENT_H) iy = SCENT_H - 1;
  g_scent[iy][ix] += SCENT_EMIT_PER_SEC * dt;
  if (g_scent[iy][ix] > 1.f) g_scent[iy][ix] = 1.f;
}

static inline void scent_step(float dt) {
  if (dt <= 0.f) return;
  // Advection: shift field opposite wind direction by fractional cells
  const float shiftX = -g_wind_x * SCENT_ADVECT_CELLS_PER_SEC * dt;
  const float shiftY = -g_wind_y * SCENT_ADVECT_CELLS_PER_SEC * dt;
  for (int y = 0; y < SCENT_H; ++y) {
    for (int x = 0; x < SCENT_W; ++x) {
      // sample source position with bilinear clamp
      float srcX = (float)x + shiftX;
      float srcY = (float)y + shiftY;
      int x0 = (int)srcX; int y0 = (int)srcY;
      float fx = srcX - (float)x0; float fy = srcY - (float)y0;
      if (x0 < 0) { x0 = 0; fx = 0.f; } if (x0 >= SCENT_W - 1) { x0 = SCENT_W - 2; fx = 1.f; }
      if (y0 < 0) { y0 = 0; fy = 0.f; } if (y0 >= SCENT_H - 1) { y0 = SCENT_H - 2; fy = 1.f; }
      float v00 = g_scent[y0][x0];
      float v10 = g_scent[y0][x0 + 1];
      float v01 = g_scent[y0 + 1][x0];
      float v11 = g_scent[y0 + 1][x0 + 1];
      float vx0 = v00 + (v10 - v00) * fx;
      float vx1 = v01 + (v11 - v01) * fx;
      float v = vx0 + (vx1 - vx0) * fy;
      g_scent_tmp[y][x] = v;
    }
  }
  // Decay and clamp
  const float decay = 1.f - (SCENT_DECAY_PER_SEC * dt);
  for (int y = 0; y < SCENT_H; ++y) {
    for (int x = 0; x < SCENT_W; ++x) {
      float v = g_scent_tmp[y][x] * decay;
      g_scent[y][x] = (v < 0.f ? 0.f : (v > 1.f ? 1.f : v));
    }
  }
  // Deposit from prey after decay so fresh scent stands out
  scent_deposit_at(g_pos_x, g_pos_y, dt);
}

static inline void scent_gradient_at(float xNorm, float yNorm, float &gx, float &gy) {
  int ix = (int)(xNorm * (SCENT_W - 1)); if (ix < 1) ix = 1; if (ix > SCENT_W - 2) ix = SCENT_W - 2;
  int iy = (int)(yNorm * (SCENT_H - 1)); if (iy < 1) iy = 1; if (iy > SCENT_H - 2) iy = SCENT_H - 2;
  float left = g_scent[iy][ix - 1];
  float right = g_scent[iy][ix + 1];
  float down = g_scent[iy + 1][ix];
  float up = g_scent[iy - 1][ix];
  // Gradient points towards increasing concentration
  gx = right - left;
  gy = down - up;
  normalize(gx, gy);
}

// -------------------- Pack controller/blackboard --------------------
enum class PackPlan : unsigned char { Stalk = 0, Encircle = 1, Harass = 2, Commit = 3 };
static PackPlan g_pack_plan = PackPlan::Stalk;
static float g_pack_plan_time = 0.f;
static float g_pack_morale = 0.7f; // 0..1
static unsigned char g_enemy_roles[MAX_ENEMIES];

static inline void assign_default_roles() {
  for (int i = 0; i < MAX_ENEMIES; ++i) g_enemy_roles[i] = (unsigned char)PackRole::None;
}

static void update_pack_controller() {
  // Simple plan selection based on average distance and morale
  float sumDist = 0.f; int count = 0;
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue;
    float dx = g_pos_x - g_enemies[i].x;
    float dy = g_pos_y - g_enemies[i].y;
    sumDist += vec_len(dx, dy); count++;
  }
  if (count == 0) { g_pack_plan = PackPlan::Stalk; return; }
  float avgDist = sumDist / (float)count;
  PackPlan next = g_pack_plan;
  if (avgDist > 0.35f) next = PackPlan::Stalk; // far: track
  else if (avgDist > 0.16f) next = PackPlan::Encircle; // medium: surround
  else if (g_pack_morale > 0.65f) next = PackPlan::Commit; // close + bold: burst
  else next = PackPlan::Harass; // close but cautious
  if (next != g_pack_plan) { g_pack_plan = next; g_pack_plan_time = g_time_seconds; }

  // Role assignment: pick nearest as lead, then flankers by side, furthest pup-guard
  int idxs[MAX_ENEMIES]; float dists[MAX_ENEMIES]; int n = 0;
  for (int i = 0; i < (int)g_enemy_count; ++i) if (g_enemies[i].active) { idxs[n] = i; float dx = g_pos_x - g_enemies[i].x; float dy = g_pos_y - g_enemies[i].y; dists[n] = dx*dx + dy*dy; n++; }
  for (int i = 0; i < n; ++i) g_enemy_roles[idxs[i]] = (unsigned char)PackRole::Harasser;
  if (n >= 1) {
    int leadK = 0; for (int k = 1; k < n; ++k) if (dists[k] < dists[leadK]) leadK = k;
    int leadIdx = idxs[leadK]; g_enemy_roles[leadIdx] = (unsigned char)PackRole::Lead;
    float fdx = g_pos_x - g_enemies[leadIdx].x; float fdy = g_pos_y - g_enemies[leadIdx].y; normalize(fdx, fdy);
    int leftIdx = -1, rightIdx = -1;
    for (int k = 0; k < n; ++k) {
      if (k == leadK) continue;
      int ei = idxs[k]; float vx = g_enemies[ei].x - g_pos_x; float vy = g_enemies[ei].y - g_pos_y;
      float side = fdx * vy - fdy * vx; // z-component of cross
      if (side > 0.f) { if (leftIdx < 0) leftIdx = ei; }
      else if (side < 0.f) { if (rightIdx < 0) rightIdx = ei; }
    }
    if (leftIdx >= 0) g_enemy_roles[leftIdx] = (unsigned char)PackRole::FlankL;
    if (rightIdx >= 0) g_enemy_roles[rightIdx] = (unsigned char)PackRole::FlankR;
    int farK = 0; for (int k = 1; k < n; ++k) if (dists[k] > dists[farK]) farK = k;
    if (n >= 3) g_enemy_roles[idxs[farK]] = (unsigned char)PackRole::PupGuard;
  }
}

static inline void enemy_face_towards(Enemy &e, float tx, float ty) {
  float dx = tx - e.x;
  float dy = ty - e.y;
  normalize(dx, dy);
  e.faceX = dx; e.faceY = dy;
}

static void enemy_apply_world_collision(Enemy &e, float nextX, float nextY) {
  float nx = nextX, ny = nextY;
  resolve_obstacle_collision(e.x, e.y, nx, ny);
  
  // Avoid hazards - enemies try to steer around them
  if (enemy_should_avoid_hazard(nx, ny, ENEMY_RADIUS)) {
    // Find a safe direction away from hazards
    float safeX = e.x, safeY = e.y;
    float bestDist = 0.f;
    
    // Try 8 directions to find safest path
    for (int i = 0; i < 8; ++i) {
      float angle = (float)i * 0.785398f; // PI/4
      float testX = e.x + __builtin_cosf(angle) * 0.05f;
      float testY = e.y + __builtin_sinf(angle) * 0.05f;
      
      if (!enemy_should_avoid_hazard(testX, testY, ENEMY_RADIUS)) {
        float dist = vec_len(testX - nx, testY - ny);
        if (dist < 0.1f) { // Close to intended direction
          safeX = testX;
          safeY = testY;
          break;
        }
      }
    }
    
    // Move towards safe position instead
    nx = safeX;
    ny = safeY;
  }
  
  // Push enemy away from the player to prevent overlap
  {
    const float rr = PLAYER_RADIUS + ENEMY_RADIUS;
    float dx = nx - g_pos_x;
    float dy = ny - g_pos_y;
    float d2 = dx * dx + dy * dy;
    float r2 = rr * rr;
    if (d2 < r2) {
      float d = __builtin_sqrtf(d2);
      if (d > 1e-5f) {
        float push = (rr - d) + 1e-4f;
        nx += (dx / d) * push;
        ny += (dy / d) * push;
      } else {
        // exactly coincident; nudge away along last movement direction
        float ndx = nx - e.x, ndy = ny - e.y;
        if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
        float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
        nx += ndx * (rr + 1e-3f);
        ny += ndy * (rr + 1e-3f);
      }
    }
  }
  e.x = clamp01(nx);
  e.y = clamp01(ny);
}

// Push player out of overlapping enemies (requires enemy declarations above)
static inline void resolve_player_enemy_collisions(float prevX, float prevY, float &nx, float &ny) {
  nx = clamp01(nx);
  ny = clamp01(ny);
  const float rr = PLAYER_RADIUS + ENEMY_RADIUS;
  const float r2 = rr * rr;
  for (int iter = 0; iter < 2; ++iter) {
    for (int i = 0; i < (int)g_enemy_count; ++i) {
      const Enemy &e = g_enemies[i];
      if (!e.active) continue;
      float dx = nx - e.x;
      float dy = ny - e.y;
      float d2 = dx * dx + dy * dy;
      if (d2 < r2) {
        float d = __builtin_sqrtf(d2);
        if (d > 1e-5f) {
          float push = (rr - d) + 1e-4f;
          nx += (dx / d) * push;
          ny += (dy / d) * push;
        } else {
          float ndx = nx - prevX, ndy = ny - prevY;
          if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
          float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
          nx += ndx * (rr + 1e-3f);
          ny += ndy * (rr + 1e-3f);
        }
        if (nx < 0.f) nx = 0.f; else if (nx > 1.f) nx = 1.f;
        if (ny < 0.f) ny = 0.f; else if (ny > 1.f) ny = 1.f;
      }
    }
  }
}

static void update_enemy_wolf(Enemy &e, float dt) {
  // Sensory inputs and memory update
  float toPlayerX = g_pos_x - e.x;
  float toPlayerY = g_pos_y - e.y;
  float dist = vec_len(toPlayerX, toPlayerY);
  float dirToPlayerX = toPlayerX, dirToPlayerY = toPlayerY;
  if (dist > 0.f) { dirToPlayerX /= dist; dirToPlayerY /= dist; }

  // Decay short-term memories
  const float memDecay = 0.8f; // linear decay factor per second
  e.mem.lastSeenConfidence -= memDecay * dt; if (e.mem.lastSeenConfidence < 0.f) e.mem.lastSeenConfidence = 0.f;
  e.mem.lastScentConfidence -= memDecay * dt; if (e.mem.lastScentConfidence < 0.f) e.mem.lastScentConfidence = 0.f;

  // Simplified line-of-sight: within seek range considered visible
  if (dist < ENEMY_SEEK_RANGE) {
    e.mem.lastSeenX = g_pos_x; e.mem.lastSeenY = g_pos_y; e.mem.lastSeenTime = g_time_seconds; e.mem.lastSeenConfidence = 1.f;
    if (!e.noticed) {
      e.noticed = 1;
      e.noticeAcquiredTime = g_time_seconds;
    }
  }

  // Hearing: find strongest recent ping
  const float SOUND_WINDOW = 1.0f;
  float heardX = 0.f, heardY = 0.f, heardW = 0.f;
  for (int i = 0; i < (int)g_sound_count; ++i) {
    const SoundPing &s = g_sounds[i];
    float age = g_time_seconds - s.timeSeconds; if (age < 0.f || age > SOUND_WINDOW) continue;
    float dx = s.x - e.x, dy = s.y - e.y; float d = vec_len(dx, dy);
    const float maxHearing = 0.5f;
    if (d > maxHearing) continue;
    float weight = s.intensity * (1.f - (age / SOUND_WINDOW)) * (1.f - (d / maxHearing));
    if (weight > heardW) { heardW = weight; heardX = s.x; heardY = s.y; }
  }

  // Scent: follow gradient when no recent sight
  float scentGX = 0.f, scentGY = 0.f; scent_gradient_at(e.x, e.y, scentGX, scentGY);
  float scentStrength = 0.f;
  {
    int ix = (int)(e.x * (SCENT_W - 1)); if (ix < 0) ix = 0; if (ix >= SCENT_W) ix = SCENT_W - 1;
    int iy = (int)(e.y * (SCENT_H - 1)); if (iy < 0) iy = 0; if (iy >= SCENT_H) iy = SCENT_H - 1;
    scentStrength = g_scent[iy][ix];
  }
  if (scentStrength > e.mem.lastScentStrength) {
    e.mem.lastScentX = e.x; e.mem.lastScentY = e.y; e.mem.lastScentStrength = scentStrength; e.mem.lastScentConfidence = 1.f;
  }

  // Determine pack-driven intent/state
  EnemyState stateOut = e.state;
  switch (g_pack_plan) {
    case PackPlan::Stalk: stateOut = EnemyState::Seek; break;
    case PackPlan::Encircle: stateOut = EnemyState::Circle; break;
    case PackPlan::Harass: stateOut = EnemyState::Harass; break;
    case PackPlan::Commit: stateOut = EnemyState::Harass; break; // reuse label; behavior speeds up
  }

  // Compute desired direction
  float desiredDirX = 0.f, desiredDirY = 0.f;
  float cautious = 1.f;
  if (dist < ENEMY_SEEK_RANGE) {
    desiredDirX = dirToPlayerX; desiredDirY = dirToPlayerY;
  } else if (heardW > 0.f) {
    // Investigate sound cautiously
    desiredDirX = heardX - e.x; desiredDirY = heardY - e.y; normalize(desiredDirX, desiredDirY);
    cautious = 0.75f;
  } else if (e.mem.lastSeenConfidence > 0.1f) {
    desiredDirX = e.mem.lastSeenX - e.x; desiredDirY = e.mem.lastSeenY - e.y; normalize(desiredDirX, desiredDirY);
  } else {
    // Track scent gradient; bias approach to be downwind
    desiredDirX = scentGX - g_wind_x * 0.25f; desiredDirY = scentGY - g_wind_y * 0.25f; normalize(desiredDirX, desiredDirY);
  }

  // Short-term memory search rings: widen as confidence drops
  if (e.mem.lastSeenConfidence > 0.f && dist >= ENEMY_SEEK_RANGE && heardW == 0.f) {
    const float minR = 0.08f, maxR = 0.32f;
    float targetR = minR + (1.f - e.mem.lastSeenConfidence) * (maxR - minR);
    float dxs = e.x - e.mem.lastSeenX, dys = e.y - e.mem.lastSeenY;
    float ds = vec_len(dxs, dys);
    if (ds > 1e-4f) { dxs /= ds; dys /= ds; }
    float tx = -dys, ty = dxs;
    float wTangential = (ds > (targetR * 0.85f) && ds < (targetR * 1.15f)) ? 1.f : (ds < targetR ? 0.2f : 0.4f);
    float wRadial = 1.f - wTangential;
    float radialSign = (ds < targetR) ? 1.f : -0.6f;
    float sx = dxs * radialSign * wRadial + tx * wTangential;
    float sy = dys * radialSign * wRadial + ty * wTangential;
    normalize(sx, sy);
    if (heardW == 0.f && dist >= ENEMY_SEEK_RANGE) {
      desiredDirX = desiredDirX * 0.6f + sx * 0.4f;
      desiredDirY = desiredDirY * 0.6f + sy * 0.4f;
      normalize(desiredDirX, desiredDirY);
    }
  }

  // Role offsetting for encircle behavior
  unsigned char role = (unsigned char)PackRole::None;
  for (int i = 0; i < (int)g_enemy_count; ++i) if (&g_enemies[i] == &e) { role = g_enemy_roles[i]; break; }
  if (stateOut == EnemyState::Circle) {
    // compute tangential component to maintain arc
    float tx = -dirToPlayerY, ty = dirToPlayerX;
    if (role == (unsigned char)PackRole::FlankL) { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.8f); }
    else if (role == (unsigned char)PackRole::FlankR) { desiredDirX = (dirToPlayerX * 0.4f - tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f - ty * 0.8f); }
    else { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.6f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.6f); }
    normalize(desiredDirX, desiredDirY);
  }

  // Separation: steer away from nearby packmates
  float sepX = 0.f, sepY = 0.f;
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue; if (&g_enemies[i] == &e) continue;
    float dx = e.x - g_enemies[i].x; float dy = e.y - g_enemies[i].y; float d2 = dx*dx + dy*dy;
    const float sepRadius = 0.03f; if (d2 < sepRadius*sepRadius && d2 > 0.f) { float inv = 1.f / d2; sepX += dx * inv; sepY += dy * inv; }
  }
  desiredDirX += sepX * 0.6f; desiredDirY += sepY * 0.6f; normalize(desiredDirX, desiredDirY);

  // Avoid danger zones and player's facing cone
  float avoidX = 0.f, avoidY = 0.f;
  for (int i = 0; i < (int)g_danger_count; ++i) {
    const DangerZone &dz = g_dangers[i];
    if (g_time_seconds > dz.expiresAt) continue;
    float dx = e.x - dz.x, dy = e.y - dz.y;
    float d2 = dx*dx + dy*dy;
    float r = dz.radius; float r2 = r*r;
    if (d2 < r2 && d2 > 1e-6f) {
      float d = __builtin_sqrtf(d2);
      float w = dz.strength * (1.f - (d / r));
      avoidX += (dx / d) * w;
      avoidY += (dy / d) * w;
    }
  }
  {
    float toWolfX = e.x - g_pos_x; float toWolfY = e.y - g_pos_y; float dl = vec_len(toWolfX, toWolfY);
    if (dl > 1e-5f) { toWolfX /= dl; toWolfY /= dl; }
    float dot = g_face_x * toWolfX + g_face_y * toWolfY;
    if (dot > PREY_CONE_COS) {
      avoidX += g_face_x * (PREY_CONE_WEIGHT * (dot - PREY_CONE_COS));
      avoidY += g_face_y * (PREY_CONE_WEIGHT * (dot - PREY_CONE_COS));
      cautious *= 0.9f;
    }
  }
  if (avoidX != 0.f || avoidY != 0.f) { desiredDirX += (-avoidX); desiredDirY += (-avoidY); normalize(desiredDirX, desiredDirY); }

  // Attack windows: lunge/feint handling overrides normal steering
  bool lungingNow = (g_time_seconds < e.lungeEndTime);
  bool feintingNow = (g_time_seconds < e.feintEndTime);

  if (!lungingNow && !feintingNow) {
    // Consider starting a lunge when close and roughly facing player
    if (e.noticed && (g_time_seconds - e.noticeAcquiredTime) >= ENEMY_MIN_CHASE_BEFORE_LUNGE && dist > 0.f && dist < ENEMY_LUNGE_RANGE && (g_time_seconds - e.lastLungeTime) > ENEMY_LUNGE_COOLDOWN) {
      // 50% bias to attack when pack has committed, otherwise use feint prob
      float doFeint = (rng_float01() < (g_pack_plan == PackPlan::Commit ? (ENEMY_FEINT_PROB * 0.4f) : ENEMY_FEINT_PROB)) ? 1.f : 0.f;
      e.lungeDirX = dirToPlayerX; e.lungeDirY = dirToPlayerY;
      if (doFeint > 0.5f) {
        e.feintEndTime = g_time_seconds + ENEMY_FEINT_DURATION;
      } else {
        e.lungeEndTime = g_time_seconds + ENEMY_LUNGE_DURATION;
      }
      e.fatigue += FATIGUE_LUNGE_BONUS; if (e.fatigue > 1.f) e.fatigue = 1.f;
      e.lastLungeTime = g_time_seconds;
      lungingNow = (e.lungeEndTime > g_time_seconds);
      feintingNow = (e.feintEndTime > g_time_seconds);
    }
  }

  // Speed selection
  float speed = ENEMY_BASE_SPEED;
  if (stateOut == EnemyState::Harass) speed *= 0.85f;
  if (g_pack_plan == PackPlan::Commit) speed *= 1.35f; // brief burst when committing
  speed *= cautious;

  // Wind flavor (minor) or lunge/feint override
  float desiredVX, desiredVY;
  if (lungingNow) {
    desiredVX = e.lungeDirX * ENEMY_LUNGE_SPEED;
    desiredVY = e.lungeDirY * ENEMY_LUNGE_SPEED;
  } else if (feintingNow) {
    desiredVX = e.lungeDirX * (ENEMY_LUNGE_SPEED * 0.5f);
    desiredVY = e.lungeDirY * (ENEMY_LUNGE_SPEED * 0.5f);
  } else {
    desiredVX = desiredDirX * speed + g_wind_x * 0.02f;
    desiredVY = desiredDirY * speed + g_wind_y * 0.02f;
  }

  // Accelerate towards desired velocity
  e.vx += (desiredVX - e.vx) * (ENEMY_ACCEL * dt);
  e.vy += (desiredVY - e.vy) * (ENEMY_ACCEL * dt);

  // Apply simple friction to reduce glide
  {
    float f = 1.f - (ENEMY_FRICTION * dt);
    if (f < 0.f) f = 0.f;
    e.vx *= f; e.vy *= f;
  }

  // Clamp max speed to prevent bursts
  {
    float sp = vec_len(e.vx, e.vy);
    if (sp > ENEMY_MAX_SPEED && sp > 0.f) {
      float scale = ENEMY_MAX_SPEED / sp;
      e.vx *= scale; e.vy *= scale;
    }
  }

  // Integrate and collide against world
  const float nx = e.x + e.vx * dt;
  const float ny = e.y + e.vy * dt;
  enemy_apply_world_collision(e, nx, ny);

  // Fatigue update based on exertion vs recovery
  {
    float sp = vec_len(e.vx, e.vy);
    float exert = (sp > 0.f) ? (sp / ENEMY_MAX_SPEED) : 0.f;
    float df = (exert * FATIGUE_PER_SPEED - FATIGUE_RECOVERY_PER_SEC) * dt;
    e.fatigue += df;
    if (e.fatigue < 0.f) e.fatigue = 0.f; else if (e.fatigue > 1.f) e.fatigue = 1.f;
  }

  // If in a lunge and within attack range, attempt to hit and possibly latch
  if (lungingNow) {
    float toPlayerX2 = g_pos_x - e.x;
    float toPlayerY2 = g_pos_y - e.y;
    float dist2 = vec_len(toPlayerX2, toPlayerY2);
    if (dist2 <= ATTACK_RANGE) {
      // evaluate as an incoming attack from e towards player
      int result = handle_incoming_attack(e.x, e.y, e.lungeDirX, e.lungeDirY);
      if (result == 0 && !g_player_latched) {
        // Check back-attack: attacker aligned with player's back
        float toPlayerDirX = (dist2 > 0.f) ? (toPlayerX2 / dist2) : e.lungeDirX;
        float toPlayerDirY = (dist2 > 0.f) ? (toPlayerY2 / dist2) : e.lungeDirY;
        // Attack from behind if player's facing is opposite of attacker-to-player vector
        float facingDot = g_face_x * toPlayerDirX + g_face_y * toPlayerDirY; // close to -1 means behind
        if (facingDot < -0.5f) {
          g_player_latched = 1;
          g_latch_end_time = g_time_seconds + LATCH_DURATION;
          // remember which enemy latched for drag direction
          for (int i = 0; i < (int)g_enemy_count; ++i) if (&g_enemies[i] == &e) { g_latch_enemy_idx = i; break; }
        }
      }
    }
  }

  // Update outputs
  e.state = stateOut;
  enemy_face_towards(e, g_pos_x, g_pos_y);
}

static void update_enemy(Enemy &e, float dt) {
  switch (e.type) {
    case EnemyType::Wolf: update_enemy_wolf(e, dt); break;
    case EnemyType::Dummy: default: {
      // Idle slow drift; useful for testing rendering
      e.vx *= 0.98f; e.vy *= 0.98f;
      enemy_apply_world_collision(e, e.x + e.vx * dt, e.y + e.vy * dt);
      if (e.vx == 0.f && e.vy == 0.f) enemy_face_towards(e, g_pos_x, g_pos_y);
    } break;
  }
}

static inline void enemy_tick_all(float dtSeconds) {
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue;
    if (g_enemies[i].health <= 0.f) { g_enemies[i].active = 0; continue; }
    update_enemy(g_enemies[i], dtSeconds);
  }
}

static int enemy_alloc_slot() {
  // Find first inactive slot; keep g_enemy_count as the highest active index+1
  for (int i = 0; i < MAX_ENEMIES; ++i) {
    if (!g_enemies[i].active) return i;
  }
  return -1;
}

static void enemy_activate(int idx, EnemyType type, float x, float y) {
  Enemy &e = g_enemies[idx];
  e.active = 1;
  e.type = type;
  e.state = EnemyState::Idle;
  e.x = clamp01(x);
  e.y = clamp01(y);
  e.vx = 0.f; e.vy = 0.f;
  e.faceX = 1.f; e.faceY = 0.f;
  e.stamina = 1.f;
  e.health = 1.f;
  e.mem = { e.x, e.y, g_time_seconds, e.x, e.y, 0.f, 0.f, 0.f };
  e.lastLungeTime = -1000.f;
  e.lungeEndTime = -1000.f;
  e.feintEndTime = -1000.f;
  e.lungeDirX = 1.f; e.lungeDirY = 0.f;
  e.noticed = 0;
  e.noticeAcquiredTime = -1000.f;
  e.fatigue = 0.f;
  e.searchSeed = (float)(rng_u32() % 1024) / 1024.0f;
  if ((unsigned char)(idx + 1) > g_enemy_count) g_enemy_count = (unsigned char)(idx + 1);
}

// Lightweight xorshift64* RNG for deterministic rolls
/* RNG moved to internal_core.h */

static GamePhase g_phase = GamePhase::Explore;
static unsigned int g_wolf_kills_since_choice = 0;
static float g_last_attack_time = -1000.f;
static float g_last_roll_time = -1000.f;
static unsigned char g_pack_peak_wolves = 0; // tracks peak active wolves
static float g_howl_cooldown_until = -1000.f;

struct Choice {
  unsigned int id;
  unsigned char type;   // 0=Passive,1=Active,2=Economy
  unsigned char rarity; // 0..3
  unsigned int tags;    // bitfield
};

static Choice g_choices[3];
static unsigned char g_choice_count = 0;
static int g_non_rare_choice_streak = 0;

// Spawn a clustered pack of wolves around a random center. Returns number spawned.
#endif

int main() { return 0; }

// Pack tracking variables (needed by active implementation)
static unsigned char g_pack_peak_wolves = 0; // tracks peak active wolves
static float g_howl_cooldown_until = -1000.f;

static unsigned int spawn_wolf_pack(unsigned int packSize) {
  if (packSize == 0u) return 0u;
  // Choose a center away from extreme edges for better clustering
  const float margin = 0.18f;
  const float range = 1.f - margin - margin;
  float cx = margin + range * rng_float01();
  float cy = margin + range * rng_float01();
  const float spread = 0.06f; // cluster radius in normalized units
  unsigned int spawned = 0u;
  for (unsigned int i = 0; i < packSize; ++i) {
    int idx = enemy_alloc_slot();
    if (idx < 0) break;
    // Random unit direction via normalization
    float ox = rng_float01() * 2.f - 1.f;
    float oy = rng_float01() * 2.f - 1.f;
    normalize(ox, oy);
    float radius = spread * (0.4f + 0.6f * rng_float01());
    float ex = clamp01(cx + ox * radius);
    float ey = clamp01(cy + oy * radius);
    enemy_activate(idx, EnemyType::Wolf, ex, ey);
    spawned += 1u;
  }
  // Seed initial role thoughts; controller will refine on first update()
  update_pack_controller();
  return spawned;
}

/* Choices and landmarks now declared in choices.h/internal_core.h */

__attribute__((export_name("init_run")))
void init_run(unsigned long long seed, unsigned int start_weapon) {
  (void)start_weapon; // unused in scaffold
  g_rng = (seed ? seed : 1ull);
  g_phase = GamePhase::Explore;
  g_wolf_kills_since_choice = 0;
  g_pos_x = 0.5f;
  g_pos_y = 0.5f;
  g_vel_x = 0.f;
  g_vel_y = 0.f;
  g_stamina = 1.0f;
  g_blocking = 0;
  g_is_rolling = 0;
  g_prev_is_rolling = 0;
  g_choice_count = 0;
  g_non_rare_choice_streak = 0;
  g_total_choices_offered = 0;
  init_choice_pool();  // Initialize the choice pool
  init_risk_phase();   // Initialize risk phase
  g_time_seconds = 0.f;
  g_last_attack_time = -1000.f;
  g_last_roll_time = -1000.f;
  g_enemy_count = 0;
  for (int i = 0; i < MAX_ENEMIES; ++i) g_enemies[i].active = 0;
  g_sound_count = 0;
  g_danger_count = 0;
  g_wind_x = 0.f; g_wind_y = 0.f;
  // Reset scent and pack
  scent_clear();
  g_pack_plan = PackPlan::Stalk;
  g_pack_plan_time = 0.f;
  g_pack_morale = 0.7f;
  g_pack_peak_wolves = 0;
  g_howl_cooldown_until = -1000.f;
  for (int i = 0; i < MAX_ENEMIES; ++i) g_enemy_roles[i] = (unsigned char)PackRole::None;
  // Deterministic spawn corner from RNG (no peer consideration in scaffold)
  const float margin = 0.06f;
  const float corners[4][2] = {
    {margin, margin},
    {1.f - margin, margin},
    {margin, 1.f - margin},
    {1.f - margin, 1.f - margin}
  };
  unsigned int cornerIndex = rng_u32() & 3u;
  g_pos_x = corners[cornerIndex][0];
  g_pos_y = corners[cornerIndex][1];

  // Generate obstacles deterministically, guaranteeing walkable space
  generate_obstacles_walkable();
  
  // Generate hostile terrain hazards
  generate_hazards();

  // Generate simple deterministic landmarks (3) and exits (1)
  g_landmark_count = 3;
  for (int i = 0; i < (int)g_landmark_count; ++i) {
    // keep away from edges a bit
    g_landmarks_x[i] = 0.1f + 0.8f * rng_float01();
    g_landmarks_y[i] = 0.1f + 0.8f * rng_float01();
  }
  g_exit_count = 1;
  for (int i = 0; i < (int)g_exit_count; ++i) {
    g_exits_x[i] = 0.1f + 0.8f * rng_float01();
    g_exits_y[i] = 0.1f + 0.8f * rng_float01();
  }

  // Spawn initial wolf pack (clustered)
  spawn_wolf_pack(4);
  // Initial role assignment
  for (int i = 0; i < MAX_ENEMIES; ++i) if (g_enemies[i].active) g_enemy_roles[i] = (unsigned char)PackRole::Harasser;
  // Clear den/danger boards
  g_den_radius = 0.f;
}

__attribute__((export_name("reset_run")))
void reset_run(unsigned long long new_seed) {
  init_run(new_seed, 0);
}

__attribute__((export_name("get_phase")))
unsigned int get_phase() {
  return (unsigned int)g_phase;
}

// Choice accessors for JS without pointer passing
__attribute__((export_name("get_choice_count")))
unsigned int get_choice_count() { return (unsigned int)g_choice_count; }

__attribute__((export_name("get_choice_id")))
unsigned int get_choice_id(unsigned int idx) { return (idx < g_choice_count) ? g_choices[idx].id : 0u; }

__attribute__((export_name("get_choice_type")))
unsigned int get_choice_type(unsigned int idx) { return (idx < g_choice_count) ? g_choices[idx].type : 0u; }

__attribute__((export_name("get_choice_rarity")))
unsigned int get_choice_rarity(unsigned int idx) { return (idx < g_choice_count) ? g_choices[idx].rarity : 0u; }

__attribute__((export_name("get_choice_tags")))
unsigned int get_choice_tags(unsigned int idx) { return (idx < g_choice_count) ? g_choices[idx].tags : 0u; }

// Risk phase exports
__attribute__((export_name("get_curse_count")))
unsigned int get_curse_count() { return g_curse_count; }

__attribute__((export_name("get_risk_multiplier")))
float get_risk_multiplier() { return g_risk_multiplier; }

__attribute__((export_name("escape_risk")))
int escape_risk() {
  if (g_phase != GamePhase::Risk) return 0;
  if (attempt_risk_escape()) {
    g_phase = GamePhase::Explore;
    return 1;
  }
  return 0;
}

__attribute__((export_name("exit_cashout")))
int exit_cashout() {
  if (g_phase != GamePhase::CashOut) return 0;
  g_phase = GamePhase::Explore;
  g_wolf_kills_since_choice = 0;
  return 1;
}

__attribute__((export_name("get_timed_challenge_progress")))
unsigned int get_timed_challenge_progress() { return g_timed_challenge_progress; }

__attribute__((export_name("get_timed_challenge_target")))
unsigned int get_timed_challenge_target() { return g_timed_challenge_target; }

__attribute__((export_name("get_timed_challenge_remaining")))
float get_timed_challenge_remaining() {
  if (g_timed_challenge_end < 0.0f) return 0.0f;
  float remaining = g_timed_challenge_end - g_time_seconds;
  return remaining > 0.0f ? remaining : 0.0f;
}

__attribute__((export_name("commit_choice")))
int commit_choice(unsigned int choice_id) {
  if (g_phase != GamePhase::Choose) return 0;
  // verify exists
  bool found = false;
  for (unsigned int i = 0; i < g_choice_count; ++i) {
    if (g_choices[i].id == choice_id) { found = true; break; }
  }
  if (!found) return 0;
  
  // Mark the choice as taken for exclusion system
  mark_choice_taken(choice_id);
  
  // Apply choice effects based on type and tags
  for (unsigned int i = 0; i < g_choice_count; ++i) {
    if (g_choices[i].id == choice_id) {
      // Apply effects based on rarity
      float staminaBonus = 0.1f;
      if (g_choices[i].rarity == (unsigned char)ChoiceRarity::Uncommon) staminaBonus = 0.15f;
      else if (g_choices[i].rarity == (unsigned char)ChoiceRarity::Rare) staminaBonus = 0.2f;
      else if (g_choices[i].rarity == (unsigned char)ChoiceRarity::Legendary) staminaBonus = 0.3f;
      
      g_stamina += staminaBonus;
      if (g_stamina > 1.0f) g_stamina = 1.0f;
      
      // TODO: Apply specific effects based on tags
      break;
    }
  }
  
  g_phase = GamePhase::Explore;
  g_choice_count = 0;
  g_wolf_kills_since_choice = 0;
  return 1;
}
// Initialize/reset state
__attribute__((export_name("start")))
void start() {
  g_pos_x = 0.5f;
  g_pos_y = 0.5f;
  g_vel_x = 0.f;
  g_vel_y = 0.f;
  g_stamina = 1.0f;
  g_hp = 1.0f;
  g_time_seconds = 0.f;
}

// Advance simulation by dt seconds with desired input vector in [-1,1]
// If isRolling != 0, uses roll speed multiplier
// This function performs collision with a vertical wall centered at x=0.5
__attribute__((export_name("update")))
void update(float inputX, float inputY, int isRolling, float dtSeconds) {
  // Advance simulation clock deterministically
  if (dtSeconds > 0.f) {
    g_time_seconds += dtSeconds;
  }
  // Normalize input direction if needed
  float len = inputX * inputX + inputY * inputY;
  if (len > 0.f) {
    // fast rsqrt approximation is unnecessary; use sqrt
    len = __builtin_sqrtf(len);
    inputX /= len;
    inputY /= len;
  }

  const float speed = BASE_SPEED * (isRolling ? ROLL_SPEED_MULTIPLIER : 1.f);

  // Cache rolling flag for combat checks
  g_is_rolling = isRolling ? 1 : 0;

  // Roll start cost is handled by on_roll_start() to allow UI gating

  // Release latch when time elapses
  if (g_player_latched && g_time_seconds >= g_latch_end_time) {
    g_player_latched = 0; g_latch_enemy_idx = -1;
  }

  // While holding block (and not rolling) or latched, target zero velocity
  bool haltMovement = ((g_blocking && !g_is_rolling) || g_player_latched);

  // Compute desired velocity from input
  float desiredVX = haltMovement ? 0.f : (inputX * speed);
  float desiredVY = haltMovement ? 0.f : (inputY * speed);

  // Smoothly steer velocity toward desired
  if (dtSeconds > 0.f) {
    float follow = PLAYER_ACCEL * dtSeconds;
    if (follow > 1.f) follow = 1.f;
    g_vel_x += (desiredVX - g_vel_x) * follow;
    g_vel_y += (desiredVY - g_vel_y) * follow;
    // Friction damping
    float damp = 1.f - (PLAYER_FRICTION * dtSeconds);
    if (damp < 0.f) damp = 0.f;
    g_vel_x *= damp;
    g_vel_y *= damp;
  }

  // Hard clamp to current max speed budget (handles roll/non-roll caps)
  {
    float sp = vec_len(g_vel_x, g_vel_y);
    if (sp > speed && sp > 0.f) {
      float s = speed / sp;
      g_vel_x *= s; g_vel_y *= s;
    }
  }

  // If movement halted due to block/latch, zero velocity
  if (haltMovement) { g_vel_x = 0.f; g_vel_y = 0.f; }

  // Integrate and resolve collisions against world and enemies
  float prevX = g_pos_x, prevY = g_pos_y;
  float nextX = clamp01(g_pos_x + g_vel_x * dtSeconds);
  float nextY = clamp01(g_pos_y + g_vel_y * dtSeconds);
  resolve_obstacle_collision(g_pos_x, g_pos_y, nextX, nextY);
  resolve_player_enemy_collisions(g_pos_x, g_pos_y, nextX, nextY);
  g_pos_x = nextX;
  g_pos_y = nextY;
  // Reconcile velocity to actual displacement to avoid post-collision drift
  if (dtSeconds > 0.f) {
    g_vel_x = (g_pos_x - prevX) / dtSeconds;
    g_vel_y = (g_pos_y - prevY) / dtSeconds;
  }

  // If latched, drag player slightly towards latch enemy
  if (g_player_latched && g_latch_enemy_idx >= 0 && g_latch_enemy_idx < (int)g_enemy_count && g_enemies[g_latch_enemy_idx].active) {
    float dx = g_enemies[g_latch_enemy_idx].x - g_pos_x;
    float dy = g_enemies[g_latch_enemy_idx].y - g_pos_y;
    float d = vec_len(dx, dy);
    if (d > 0.f) { dx /= d; dy /= d; }
    const float dragStep = LATCH_DRAG_SPEED * dtSeconds;
    float nx2 = clamp01(g_pos_x + dx * dragStep);
    float ny2 = clamp01(g_pos_y + dy * dragStep);
    resolve_obstacle_collision(g_pos_x, g_pos_y, nx2, ny2);
    resolve_player_enemy_collisions(g_pos_x, g_pos_y, nx2, ny2);
    g_pos_x = nx2;
    g_pos_y = ny2;
  }

  // Update player facing from velocity when not blocking
  if (!g_blocking) {
    float fx = g_vel_x, fy = g_vel_y; normalize(fx, fy);
    if (fx != 0.f || fy != 0.f) { g_face_x = fx; g_face_y = fy; }
  }

  // Stamina drain/regen
  apply_stamina_and_block_update(dtSeconds);
  
  // Update hazards and apply effects
  update_hazards(dtSeconds);
  
  // Apply hazard movement modifiers
  float hazardSpeedMod = get_hazard_speed_modifier();
  if (hazardSpeedMod < 1.0f) {
    g_vel_x *= hazardSpeedMod;
    g_vel_y *= hazardSpeedMod;
  }

  // Advance player attack state and resolve hits
  if (dtSeconds > 0.f) {
    if (g_attack_state == AttackState::Windup) {
      if ((g_time_seconds - g_attack_state_time) >= ATTACK_WINDUP_SEC) {
        g_attack_state = AttackState::Active;
        g_attack_state_time = g_time_seconds;
      }
    } else if (g_attack_state == AttackState::Active) {
      // During active, evaluate hits each frame; allow multi-hit across different enemies
      for (int i = 0; i < (int)g_enemy_count; ++i) {
        Enemy &e = g_enemies[i];
        if (!e.active) continue;
        if (e.health <= 0.f) continue;
        float dx = e.x - g_pos_x;
        float dy = e.y - g_pos_y;
        float dist = vec_len(dx, dy);
        if (dist <= 0.f || dist > ATTACK_RANGE) continue;
        dx /= dist; dy /= dist;
        float dot = dx * g_attack_dir_x + dy * g_attack_dir_y;
        if (dot >= ATTACK_ARC_COS_THRESHOLD) {
          // Apply damage and brief stun/knockback
          float prevHealth = e.health;
          e.health -= ATTACK_DAMAGE;
          if (e.health < 0.f) e.health = 0.f;
          // Count wolf kills and trigger boon after 3 kills
          if (prevHealth > 0.f && e.health <= 0.f && e.type == EnemyType::Wolf) {
            g_wolf_kills_since_choice += 1u;
            
            // Award currency for defeating enemies
            add_gold(10.0f + rng_float01() * 5.0f);
            if (g_elite_active) {
              add_essence(2.0f + rng_float01() * 2.0f);
            }
            
            // Update timed challenge progress if active
            if (g_timed_challenge_end > 0.0f && g_time_seconds < g_timed_challenge_end) {
              g_timed_challenge_progress++;
            }
            
            if ((g_phase == GamePhase::Explore || g_phase == GamePhase::Fight) && g_wolf_kills_since_choice >= 3u) {
              generate_choices();
              g_phase = GamePhase::Choose;
            }
          }
          e.feintEndTime = -1000.f; // cancel any feint
          e.lungeEndTime = -1000.f; // cancel any lunge
          // simple recover flag via state; wolf update may override but will respect cooldowns
          e.vx += dx * ATTACK_KNOCKBACK;
          e.vy += dy * ATTACK_KNOCKBACK;
        }
      }
      if ((g_time_seconds - g_attack_state_time) >= ATTACK_ACTIVE_SEC) {
        g_attack_state = AttackState::Recovery;
        g_attack_state_time = g_time_seconds;
      }
    } else if (g_attack_state == AttackState::Recovery) {
      if ((g_time_seconds - g_attack_state_time) >= ATTACK_RECOVERY_SEC) {
        g_attack_state = AttackState::Idle;
        g_attack_state_time = g_time_seconds;
      }
    }
  }

  // Remember rolling state for next frame
  g_prev_is_rolling = g_is_rolling;

  // ------------------------------------------------------------
  // Enemies tick (deterministic; driven entirely by WASM state)
  // ------------------------------------------------------------
  if (dtSeconds > 0.f) {
    // Advance player attack state timings
    switch (g_attack_state) {
      case AttackState::Windup:
        if ((g_time_seconds - g_attack_state_time) >= ATTACK_WINDUP_SEC) {
          g_attack_state = AttackState::Active;
          g_attack_state_time = g_time_seconds;
        }
        break;
      case AttackState::Active:
        if ((g_time_seconds - g_attack_state_time) >= ATTACK_ACTIVE_SEC) {
          g_attack_state = AttackState::Recovery;
          g_attack_state_time = g_time_seconds;
        }
        break;
      case AttackState::Recovery:
        if ((g_time_seconds - g_attack_state_time) >= ATTACK_RECOVERY_SEC) {
          g_attack_state = AttackState::Idle;
          g_attack_state_time = g_time_seconds;
        }
        break;
      case AttackState::Idle: default: break;
    }
    // Update scent field first (used by perception)
    scent_step(dtSeconds);
    // Update pack plan/roles once per frame (after morale/howl)
    // Morale recompute
    {
      unsigned int alive = 0u;
      for (int i = 0; i < (int)g_enemy_count; ++i) if (g_enemies[i].active) alive++;
      if (alive > g_pack_peak_wolves) g_pack_peak_wolves = (unsigned char)alive;
      float casualty = (g_pack_peak_wolves > 0) ? (1.f - ((float)alive / (float)g_pack_peak_wolves)) : 0.f;
      float hazard = 0.f; unsigned int sensed = 0u;
      for (int ei = 0; ei < (int)g_enemy_count; ++ei) {
        if (!g_enemies[ei].active) continue;
        float local = 0.f;
        for (int di = 0; di < (int)g_danger_count; ++di) {
          const DangerZone &dz = g_dangers[di]; if (g_time_seconds > dz.expiresAt) continue;
          float dx = g_enemies[ei].x - dz.x, dy = g_enemies[ei].y - dz.y; float d = vec_len(dx, dy);
          if (d < dz.radius) { local += dz.strength * (1.f - (d / dz.radius)); }
        }
        hazard += local; sensed++;
      }
      hazard = (sensed > 0u) ? (hazard / (float)sensed) : 0.f;
      float hunger = clamp01(g_time_seconds / 60.f);
      float denBonus = 0.f;
      if (g_den_radius > 0.f) {
        float dx = g_pos_x - g_den_x, dy = g_pos_y - g_den_y; float d = vec_len(dx, dy);
        if (d < g_den_radius * 1.4f) denBonus = 0.25f;
      }
      float preyWounded = 1.f - clamp01(g_hp);
      float targetMorale = 0.35f + hunger * 0.35f + denBonus * 0.5f + preyWounded * 0.2f - hazard * 0.5f - casualty * 0.6f;
      if (targetMorale < 0.f) targetMorale = 0.f; else if (targetMorale > 1.f) targetMorale = 1.f;
      float k = 1.5f * dtSeconds; if (k > 1.f) k = 1.f;
      g_pack_morale += (targetMorale - g_pack_morale) * k;
    }
    // Expire dangers
    for (int i = 0; i < (int)g_danger_count; ++i) {
      if (g_time_seconds > g_dangers[i].expiresAt) {
        int last = (int)g_danger_count - 1;
        if (i <= last) {
          g_dangers[i] = g_dangers[last];
          if (g_danger_count > 0) g_danger_count--;
        }
      }
    }
    // Howl logic
    if (g_time_seconds > g_howl_cooldown_until) {
      if (g_pack_morale > 0.75f) {
        if ((1.f - g_hp) > 0.35f) {
          int idx = enemy_alloc_slot();
          if (idx >= 0) {
            float ex = clamp01(g_pos_x + (rng_float01() * 0.4f - 0.2f));
            float ey = clamp01(g_pos_y + (rng_float01() * 0.4f - 0.2f));
            enemy_activate(idx, EnemyType::Wolf, ex, ey);
          }
          g_howl_cooldown_until = g_time_seconds + 8.f;
        } else {
          g_pack_plan = PackPlan::Encircle; g_pack_plan_time = g_time_seconds;
          g_howl_cooldown_until = g_time_seconds + 5.f;
        }
      }
    }
    update_pack_controller();
    enemy_tick_all(dtSeconds);
  }
  
  // Risk phase management
  if (g_phase == GamePhase::Risk) {
    update_risk_phase(dtSeconds);
    
    // Check for timed challenge completion
    if (g_timed_challenge_end > 0.0f && g_timed_challenge_progress >= g_timed_challenge_target) {
      // Success! Grant bonus and exit risk phase
      g_stamina = 1.0f; // Full stamina restore
      g_phase = GamePhase::PowerUp;
      g_timed_challenge_end = -1.0f;
    }
    
    // Check if should transition to Escalate
    if (g_risk_event_count == 0 && should_enter_escalation_phase()) {
      g_phase = GamePhase::Escalate;
      init_escalation_phase();
      trigger_escalation_event();
    }
  } else if (g_phase == GamePhase::Escalate) {
    // Escalate phase management
    update_escalation_phase(dtSeconds);
    
    // Check if should transition to CashOut
    if (should_enter_cashout_phase()) {
      g_phase = GamePhase::CashOut;
      init_cashout_phase();
    }
  } else if (g_phase == GamePhase::CashOut) {
    // CashOut phase - waiting for player decisions
    // Phase transitions are handled by export functions (buy_shop_item, etc.)
    
    // Exit cashout when player is done (could add a "leave shop" button)
    // For now, exit after spending most currency
    if (g_gold < 20.0f && g_essence < 3.0f) {
      g_phase = GamePhase::Explore;
      g_wolf_kills_since_choice = 0;
    }
  } else if (g_phase == GamePhase::Explore || g_phase == GamePhase::Fight) {
    // Check if should enter risk phase
    if (should_enter_risk_phase()) {
      g_phase = GamePhase::Risk;
      trigger_risk_event();
    }
  }
  
  // Apply curse modifiers to player stats
  if (g_curse_count > 0) {
    // Apply weakness curse to damage (handled in attack logic)
    // Apply slowness curse to movement
    float slowMod = get_curse_modifier(CurseType::Slowness);
    g_vel_x *= slowMod;
    g_vel_y *= slowMod;
    
    // Apply exhaustion curse to stamina regen (handled in stamina update)
  }
}

// Position getters
__attribute__((export_name("get_x")))
float get_x() { return g_pos_x; }

__attribute__((export_name("get_y")))
float get_y() { return g_pos_y; }

// Stamina getters/consumers
__attribute__((export_name("get_stamina")))
float get_stamina() { return g_stamina; }

// HP getter for UI HUD (0..1)
__attribute__((export_name("get_hp")))
float get_hp() { return g_hp; }

// Apply attack stamina cost immediately. Returns 1 if applied, 0 if no stamina (still clamps to 0).
__attribute__((export_name("on_attack")))
int on_attack() {
  // Enforce attack cooldown
  if ((g_time_seconds - g_last_attack_time) < ATTACK_COOLDOWN_SEC) { return 0; }
  if (g_stamina < STAMINA_ATTACK_COST) { return 0; }
  g_stamina -= STAMINA_ATTACK_COST;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_attack_time = g_time_seconds;
  // Start attack state machine if idle or recovery complete
  if (g_attack_state == AttackState::Idle || g_attack_state == AttackState::Recovery) {
    // Attack direction is player's current facing
    g_attack_dir_x = g_face_x;
    g_attack_dir_y = g_face_y;
    normalize(g_attack_dir_x, g_attack_dir_y);
    g_attack_state = AttackState::Windup;
    g_attack_state_time = g_time_seconds;
  }
  return 1;
}

// Attempt to start a roll: consumes start cost if any stamina remains. Returns 1 if applied, 0 otherwise.
__attribute__((export_name("on_roll_start")))
int on_roll_start() {
  // Enforce roll cooldown
  if ((g_time_seconds - g_last_roll_time) < ROLL_COOLDOWN_SEC) { return 0; }
  if (g_stamina < STAMINA_ROLL_START_COST) { return 0; }
  g_stamina -= STAMINA_ROLL_START_COST;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_roll_time = g_time_seconds;
  return 1;
}

// Set or clear blocking state and update facing direction.
// on: 0 = off, non-zero = on. When transitioning 0->1, records start time for parry window.
// Returns 1 if blocking state is active after this call, 0 if activation failed due to stamina
__attribute__((export_name("set_blocking")))
int set_blocking(int on, float faceX, float faceY) {
  // normalize facing input
  normalize(faceX, faceY);
  if (on) {
    if (!g_blocking) {
      g_block_start_time = g_time_seconds;
      // Apply block start cost once on press if any stamina remains
      if (g_stamina < STAMINA_BLOCK_START_COST) {
        // Not enough stamina to begin blocking
        return 0;
      }
      g_stamina -= STAMINA_BLOCK_START_COST;
      if (g_stamina < 0.f) g_stamina = 0.f;
    }
    g_blocking = 1;
    // keep facing updated while holding block
    g_block_face_x = faceX;
    g_block_face_y = faceY;
    // player facing follows block facing while blocking
    g_face_x = faceX;
    g_face_y = faceY;
    return 1;
  } else {
    g_blocking = 0;
    return 1;
  }
}

// Returns current blocking state (1 = blocking, 0 = not blocking)
__attribute__((export_name("get_block_state")))
int get_block_state() { return g_blocking ? 1 : 0; }

// Evaluate an incoming attack against current defensive state.
// Returns:
//  -1 => out of range / no effect (e.g., i-frames)
//   0 => hit (no block)
//   1 => normal block
//   2 => PERFECT PARRY
__attribute__((export_name("handle_incoming_attack")))
int handle_incoming_attack(float attackerX, float attackerY, float attackDirX, float attackDirY) {
  // i-frames while rolling
  if (g_is_rolling) return -1;

  // Check range
  float toSelfX = g_pos_x - attackerX;
  float toSelfY = g_pos_y - attackerY;
  float dist = vec_len(toSelfX, toSelfY);
  if (dist > ATTACK_RANGE) return -1;
  if (dist <= 0.f) return -1;
  toSelfX /= dist; toSelfY /= dist;

  // If blocking, determine facing adequacy
  if (g_blocking) {
    float faceDot = g_block_face_x * toSelfX + g_block_face_y * toSelfY;
    int facingOk = (faceDot >= BLOCK_FACING_COS_THRESHOLD);
    if (facingOk) {
      const float dt = g_time_seconds - g_block_start_time;
      if (dt >= 0.f && dt <= PERFECT_PARRY_WINDOW) {
        // Perfect parry: fully restore player stamina
        g_stamina = 1.0f;
        return 2; // PERFECT PARRY
      }
    }
    return 1; // normal block
  }

  // Not blocking => hit
  return 0;
}

// -------- Data getters for UI-only consumption --------
__attribute__((export_name("get_attack_cooldown")))
float get_attack_cooldown() { return ATTACK_COOLDOWN_SEC; }

__attribute__((export_name("get_roll_duration")))
float get_roll_duration() { return ROLL_DURATION_SEC; }

__attribute__((export_name("get_roll_cooldown")))
float get_roll_cooldown() { return ROLL_COOLDOWN_SEC; }

__attribute__((export_name("get_parry_window")))
float get_parry_window() { return PERFECT_PARRY_WINDOW; }

// Landmarks/exits getters
__attribute__((export_name("get_obstacle_count")))
unsigned int get_obstacle_count() { return (unsigned int)g_obstacle_count; }

__attribute__((export_name("get_obstacle_x")))
float get_obstacle_x(unsigned int idx) { return (idx < g_obstacle_count) ? g_obstacles_x[idx] : 0.f; }

__attribute__((export_name("get_obstacle_y")))
float get_obstacle_y(unsigned int idx) { return (idx < g_obstacle_count) ? g_obstacles_y[idx] : 0.f; }

__attribute__((export_name("get_obstacle_r")))
float get_obstacle_r(unsigned int idx) { return (idx < g_obstacle_count) ? g_obstacles_r[idx] : 0.f; }

__attribute__((export_name("get_landmark_count")))
unsigned int get_landmark_count() { return (unsigned int)g_landmark_count; }

__attribute__((export_name("get_landmark_x")))
float get_landmark_x(unsigned int idx) { return (idx < g_landmark_count) ? g_landmarks_x[idx] : 0.f; }

__attribute__((export_name("get_landmark_y")))
float get_landmark_y(unsigned int idx) { return (idx < g_landmark_count) ? g_landmarks_y[idx] : 0.f; }

__attribute__((export_name("get_exit_count")))
unsigned int get_exit_count() { return (unsigned int)g_exit_count; }

__attribute__((export_name("get_exit_x")))
float get_exit_x(unsigned int idx) { return (idx < g_exit_count) ? g_exits_x[idx] : 0.f; }

__attribute__((export_name("get_exit_y")))
float get_exit_y(unsigned int idx) { return (idx < g_exit_count) ? g_exits_y[idx] : 0.f; }

// ---------------- Enemy snapshot + controls (UI reads snapshot; UI forwards environment inputs) ----------------
__attribute__((export_name("get_player_latched")))
int get_player_latched() { return g_player_latched ? 1 : 0; }
__attribute__((export_name("get_enemy_count")))
unsigned int get_enemy_count() { return (unsigned int)g_enemy_count; }

__attribute__((export_name("get_enemy_x")))
float get_enemy_x(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].x : 0.f; }

__attribute__((export_name("get_enemy_y")))
float get_enemy_y(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].y : 0.f; }

__attribute__((export_name("get_enemy_type")))
unsigned int get_enemy_type(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? (unsigned int)g_enemies[idx].type : 0u; }

__attribute__((export_name("get_enemy_state")))
unsigned int get_enemy_state(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? (unsigned int)g_enemies[idx].state : 0u; }

// Environment inputs
__attribute__((export_name("set_wind")))
void set_wind(float windX, float windY) {
  g_wind_x = windX; g_wind_y = windY;
}

__attribute__((export_name("post_sound")))
void post_sound(float x, float y, float intensity) {
  // Store in a small ring; decay/processing can be added per-enemy
  const int cap = MAX_SOUND_PINGS;
  const int idx = (int)g_sound_count % cap;
  g_sounds[idx].x = clamp01(x);
  g_sounds[idx].y = clamp01(y);
  g_sounds[idx].intensity = intensity < 0.f ? 0.f : (intensity > 1.f ? 1.f : intensity);
  g_sounds[idx].timeSeconds = g_time_seconds;
  if (g_sound_count < MAX_SOUND_PINGS) g_sound_count++;
}

// Danger/den API (blackboard)
__attribute__((export_name("post_danger")))
void post_danger(float x, float y, float radius, float strength, float ttlSeconds) {
  if (radius <= 0.f || strength <= 0.f || ttlSeconds <= 0.f) return;
  int idx = (int)g_danger_count;
  if (idx < MAX_DANGER_ZONES) {
    g_dangers[idx].x = clamp01(x);
    g_dangers[idx].y = clamp01(y);
    g_dangers[idx].radius = radius;
    g_dangers[idx].strength = strength < 0.f ? 0.f : (strength > 1.f ? 1.f : strength);
    g_dangers[idx].expiresAt = g_time_seconds + ttlSeconds;
    g_danger_count++;
  } else {
    int oldest = 0; float tmin = g_dangers[0].expiresAt;
    for (int i = 1; i < MAX_DANGER_ZONES; ++i) if (g_dangers[i].expiresAt < tmin) { tmin = g_dangers[i].expiresAt; oldest = i; }
    g_dangers[oldest].x = clamp01(x);
    g_dangers[oldest].y = clamp01(y);
    g_dangers[oldest].radius = radius;
    g_dangers[oldest].strength = strength < 0.f ? 0.f : (strength > 1.f ? 1.f : strength);
    g_dangers[oldest].expiresAt = g_time_seconds + ttlSeconds;
  }
}

__attribute__((export_name("set_den")))
void set_den(float x, float y, float radius) {
  g_den_x = clamp01(x);
  g_den_y = clamp01(y);
  g_den_radius = (radius < 0.f) ? 0.f : radius;
}

// Debug getters for UI
__attribute__((export_name("get_pack_morale")))
float get_pack_morale() { return g_pack_morale; }

__attribute__((export_name("get_enemy_fatigue")))
float get_enemy_fatigue(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].fatigue : 0.f; }

// Optional UI getters for debugging pack logic
__attribute__((export_name("get_pack_plan")))
unsigned int get_pack_plan() { return (unsigned int)g_pack_plan; }

__attribute__((export_name("get_enemy_role")))
unsigned int get_enemy_role(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? (unsigned int)g_enemy_roles[idx] : (unsigned int)PackRole::None; }

// Debug/admin controls (optional)
__attribute__((export_name("clear_enemies")))
void clear_enemies() {
  for (int i = 0; i < MAX_ENEMIES; ++i) g_enemies[i].active = 0;
  g_enemy_count = 0;
}

// Spawn N wolves at pseudo-random positions (deterministic via g_rng). Returns number spawned.
__attribute__((export_name("spawn_wolves")))
unsigned int spawn_wolves(unsigned int count) {
  unsigned int spawned = 0u;
  for (unsigned int i = 0; i < count; ++i) {
    int idx = enemy_alloc_slot();
    if (idx < 0) break;
    float ex = 0.1f + 0.8f * rng_float01();
    float ey = 0.1f + 0.8f * rng_float01();
    enemy_activate(idx, EnemyType::Wolf, ex, ey);
    spawned += 1u;
  }
  // Refresh roles quickly; pack controller also updates each frame in update().
  update_pack_controller();
  return spawned;
}