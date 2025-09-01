// Enemy types, pack controller, AI behavior, collisions, sounds
#pragma once

enum class EnemyType : unsigned char { Wolf = 0, Dummy = 1 };
enum class EnemyState : unsigned char { Idle = 0, Seek = 1, Circle = 2, Harass = 3, Recover = 4 };
enum class PackRole : unsigned char { Lead = 0, FlankL = 1, FlankR = 2, Harasser = 3, PupGuard = 4, None = 255 };

#define MAX_ENEMIES 16
#define MAX_SOUND_PINGS 32

struct SoundPing { float x; float y; float intensity; float timeSeconds; };

struct EnemyMemory {
  float lastSeenX; float lastSeenY; float lastSeenTime;
  float lastScentX; float lastScentY; float lastScentStrength;
  float lastSeenConfidence; float lastScentConfidence;
};

struct Enemy {
  unsigned char active;
  EnemyType type;
  EnemyState state;
  float x, y;
  float vx, vy;
  float faceX, faceY;
  float stamina;
  float health;
  EnemyMemory mem;
  float lastLungeTime;
  float lungeEndTime;
  float feintEndTime;
  float lungeDirX, lungeDirY;
  unsigned char noticed;
  float noticeAcquiredTime;
  // Extended fields
  float fatigue;
  float searchSeed;
};

static Enemy g_enemies[MAX_ENEMIES];
static unsigned char g_enemy_count = 0;

static SoundPing g_sounds[MAX_SOUND_PINGS];
static unsigned char g_sound_count = 0;

// Tunables for enemies
static const float ENEMY_BASE_SPEED = 0.18f;
static const float ENEMY_CIRCLE_RADIUS = 0.08f;
static const float ENEMY_SEEK_RANGE = 0.45f;
static const float ENEMY_HARASS_RANGE = 0.11f;
static const float ENEMY_ACCEL = 1.1f;
static const float ENEMY_FRICTION = 2.0f;
static const float ENEMY_MAX_SPEED = 0.26f;
static const float ENEMY_LUNGE_RANGE = 0.125f;
static const float ENEMY_LUNGE_SPEED = 0.42f;
static const float ENEMY_LUNGE_DURATION = 0.16f;
static const float ENEMY_LUNGE_COOLDOWN = 0.90f;
static const float ENEMY_FEINT_PROB = 0.35f;
static const float ENEMY_FEINT_DURATION = 0.10f;
static const float ENEMY_MIN_CHASE_BEFORE_LUNGE = 0.75f;
static const float LATCH_DURATION = 1.0f;
static const float LATCH_DRAG_SPEED = 0.22f;

// Prey cone avoidance constants
static const float PREY_CONE_COS = 0.5f;  // cos(60 deg) - threshold for player's facing cone
static const float PREY_CONE_WEIGHT = 0.8f;  // weight for avoidance when in player's cone

// Fatigue system constants
static const float FATIGUE_LUNGE_BONUS = 0.15f;  // fatigue gained from lunging
static const float FATIGUE_PER_SPEED = 0.3f;  // fatigue accumulation rate
static const float FATIGUE_RECOVERY_PER_SEC = 0.2f;  // fatigue recovery rate

// Danger zones (blackboard) and den
#define MAX_DANGER_ZONES 16
struct DangerZone { float x; float y; float radius; float strength; float expiresAt; };
static DangerZone g_dangers[MAX_DANGER_ZONES];
static unsigned char g_danger_count = 0;
static float g_den_x = 0.5f;
static float g_den_y = 0.5f;
static float g_den_radius = 0.f;

// Pack controller/roles
enum class PackPlan : unsigned char { Stalk = 0, Encircle = 1, Harass = 2, Commit = 3 };
static PackPlan g_pack_plan = PackPlan::Stalk;
static float g_pack_plan_time = 0.f;
static float g_pack_morale = 0.7f;
static unsigned char g_enemy_roles[MAX_ENEMIES];

static inline void assign_default_roles() { for (int i = 0; i < MAX_ENEMIES; ++i) g_enemy_roles[i] = (unsigned char)PackRole::None; }

static void update_pack_controller() {
  float sumDist = 0.f; int count = 0;
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue;
    float dx = g_pos_x - g_enemies[i].x; float dy = g_pos_y - g_enemies[i].y;
    sumDist += vec_len(dx, dy); count++;
  }
  if (count == 0) { g_pack_plan = PackPlan::Stalk; return; }
  float avgDist = sumDist / (float)count;
  PackPlan next = g_pack_plan;
  if (avgDist > 0.35f) next = PackPlan::Stalk;
  else if (avgDist > 0.16f) next = PackPlan::Encircle;
  else if (g_pack_morale > 0.65f) next = PackPlan::Commit; else next = PackPlan::Harass;
  if (next != g_pack_plan) { g_pack_plan = next; g_pack_plan_time = g_time_seconds; }

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
      float side = fdx * vy - fdy * vx;
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
  float dx = tx - e.x; float dy = ty - e.y; normalize(dx, dy); e.faceX = dx; e.faceY = dy;
}

static void enemy_apply_world_collision(Enemy &e, float nextX, float nextY) {
  float nx = nextX, ny = nextY;
  resolve_obstacle_collision(e.x, e.y, nx, ny);
  const float rr = PLAYER_RADIUS + ENEMY_RADIUS;
  float dx = nx - g_pos_x; float dy = ny - g_pos_y;
  float d2 = dx * dx + dy * dy; float r2 = rr * rr;
  if (d2 < r2) {
    float d = __builtin_sqrtf(d2);
    if (d > 1e-5f) { float push = (rr - d) + 1e-4f; nx += (dx / d) * push; ny += (dy / d) * push; }
    else {
      float ndx = nx - e.x, ndy = ny - e.y; if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
      float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
      nx += ndx * (rr + 1e-3f); ny += ndy * (rr + 1e-3f);
    }
  }
  e.x = clamp01(nx); e.y = clamp01(ny);
}

static inline void resolve_player_enemy_collisions(float prevX, float prevY, float &nx, float &ny) {
  nx = clamp01(nx); ny = clamp01(ny);
  const float rr = PLAYER_RADIUS + ENEMY_RADIUS; const float r2 = rr * rr;
  for (int iter = 0; iter < 2; ++iter) {
    for (int i = 0; i < (int)g_enemy_count; ++i) {
      const Enemy &e = g_enemies[i]; if (!e.active) continue;
      float dx = nx - e.x; float dy = ny - e.y; float d2 = dx * dx + dy * dy;
      if (d2 < r2) {
        float d = __builtin_sqrtf(d2);
        if (d > 1e-5f) { float push = (rr - d) + 1e-4f; nx += (dx / d) * push; ny += (dy / d) * push; }
        else {
          float ndx = nx - prevX, ndy = ny - prevY; if (ndx == 0.f && ndy == 0.f) { ndx = 1.f; ndy = 0.f; }
          float l = vec_len(ndx, ndy); if (l > 0.f) { ndx /= l; ndy /= l; }
          nx += ndx * (rr + 1e-3f); ny += ndy * (rr + 1e-3f);
        }
        if (nx < 0.f) nx = 0.f; else if (nx > 1.f) nx = 1.f;
        if (ny < 0.f) ny = 0.f; else if (ny > 1.f) ny = 1.f;
      }
    }
  }
}

// Forward declaration for incoming attack used by wolves
int handle_incoming_attack(float attackerX, float attackerY, float attackDirX, float attackDirY);

static void update_enemy_wolf(Enemy &e, float dt) {
  float toPlayerX = g_pos_x - e.x; float toPlayerY = g_pos_y - e.y; float dist = vec_len(toPlayerX, toPlayerY);
  float dirToPlayerX = toPlayerX, dirToPlayerY = toPlayerY; if (dist > 0.f) { dirToPlayerX /= dist; dirToPlayerY /= dist; }
  const float memDecay = 0.8f; e.mem.lastSeenConfidence -= memDecay * dt; if (e.mem.lastSeenConfidence < 0.f) e.mem.lastSeenConfidence = 0.f; e.mem.lastScentConfidence -= memDecay * dt; if (e.mem.lastScentConfidence < 0.f) e.mem.lastScentConfidence = 0.f;
  if (dist < ENEMY_SEEK_RANGE) { e.mem.lastSeenX = g_pos_x; e.mem.lastSeenY = g_pos_y; e.mem.lastSeenTime = g_time_seconds; e.mem.lastSeenConfidence = 1.f; if (!e.noticed) { e.noticed = 1; e.noticeAcquiredTime = g_time_seconds; } }
  const float SOUND_WINDOW = 1.0f; float heardX = 0.f, heardY = 0.f, heardW = 0.f;
  for (int i = 0; i < (int)g_sound_count; ++i) { const SoundPing &s = g_sounds[i]; float age = g_time_seconds - s.timeSeconds; if (age < 0.f || age > SOUND_WINDOW) continue; float dx = s.x - e.x, dy = s.y - e.y; float d = vec_len(dx, dy); const float maxHearing = 0.5f; if (d > maxHearing) continue; float weight = s.intensity * (1.f - (age / SOUND_WINDOW)) * (1.f - (d / maxHearing)); if (weight > heardW) { heardW = weight; heardX = s.x; heardY = s.y; } }
  float scentGX = 0.f, scentGY = 0.f; scent_gradient_at(e.x, e.y, scentGX, scentGY); float scentStrength = 0.f; { int ix = (int)(e.x * (SCENT_W - 1)); if (ix < 0) ix = 0; if (ix >= SCENT_W) ix = SCENT_W - 1; int iy = (int)(e.y * (SCENT_H - 1)); if (iy < 0) iy = 0; if (iy >= SCENT_H) iy = SCENT_H - 1; scentStrength = g_scent[iy][ix]; }
  if (scentStrength > e.mem.lastScentStrength) { e.mem.lastScentX = e.x; e.mem.lastScentY = e.y; e.mem.lastScentStrength = scentStrength; e.mem.lastScentConfidence = 1.f; }
  EnemyState stateOut = e.state; switch (g_pack_plan) { case PackPlan::Stalk: stateOut = EnemyState::Seek; break; case PackPlan::Encircle: stateOut = EnemyState::Circle; break; case PackPlan::Harass: stateOut = EnemyState::Harass; break; case PackPlan::Commit: stateOut = EnemyState::Harass; break; }
  float desiredDirX = 0.f, desiredDirY = 0.f; float cautious = 1.f;
  if (dist < ENEMY_SEEK_RANGE) { desiredDirX = dirToPlayerX; desiredDirY = dirToPlayerY; }
  else if (heardW > 0.f) { desiredDirX = heardX - e.x; desiredDirY = heardY - e.y; normalize(desiredDirX, desiredDirY); cautious = 0.75f; }
  else if (e.mem.lastSeenConfidence > 0.1f) { desiredDirX = e.mem.lastSeenX - e.x; desiredDirY = e.mem.lastSeenY - e.y; normalize(desiredDirX, desiredDirY); }
  else { desiredDirX = scentGX - g_wind_x * 0.25f; desiredDirY = scentGY - g_wind_y * 0.25f; normalize(desiredDirX, desiredDirY); }
  // Short-term search pattern around last seen target
  if (e.mem.lastSeenConfidence > 0.f && dist >= ENEMY_SEEK_RANGE && heardW == 0.f) {
    const float minR = 0.08f, maxR = 0.32f;
    float targetR = minR + (1.f - e.mem.lastSeenConfidence) * (maxR - minR);
    float dxs = e.x - e.mem.lastSeenX, dys = e.y - e.mem.lastSeenY; float ds = vec_len(dxs, dys);
    if (ds > 1e-4f) { dxs /= ds; dys /= ds; }
    float tx = -dys, ty = dxs;
    float wTangential = (ds > (targetR * 0.85f) && ds < (targetR * 1.15f)) ? 1.f : (ds < targetR ? 0.2f : 0.4f);
    float wRadial = 1.f - wTangential;
    float radialSign = (ds < targetR) ? 1.f : -0.6f;
    float sx = dxs * radialSign * wRadial + tx * wTangential;
    float sy = dys * radialSign * wRadial + ty * wTangential;
    normalize(sx, sy);
    if (heardW == 0.f && dist >= ENEMY_SEEK_RANGE) { desiredDirX = desiredDirX * 0.6f + sx * 0.4f; desiredDirY = desiredDirY * 0.6f + sy * 0.4f; normalize(desiredDirX, desiredDirY); }
  }
  unsigned char role = (unsigned char)PackRole::None; for (int i = 0; i < (int)g_enemy_count; ++i) if (&g_enemies[i] == &e) { role = g_enemy_roles[i]; break; }
  if (stateOut == EnemyState::Circle) {
    float tx = -dirToPlayerY, ty = dirToPlayerX;
    if (role == (unsigned char)PackRole::FlankL) { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.8f); }
    else if (role == (unsigned char)PackRole::FlankR) { desiredDirX = (dirToPlayerX * 0.4f - tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f - ty * 0.8f); }
    else { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.6f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.6f); }
    normalize(desiredDirX, desiredDirY);
  }
  float sepX = 0.f, sepY = 0.f; for (int i = 0; i < (int)g_enemy_count; ++i) { if (!g_enemies[i].active) continue; if (&g_enemies[i] == &e) continue; float dx = e.x - g_enemies[i].x; float dy = e.y - g_enemies[i].y; float d2 = dx*dx + dy*dy; const float sepRadius = 0.03f; if (d2 < sepRadius*sepRadius && d2 > 0.f) { float inv = 1.f / d2; sepX += dx * inv; sepY += dy * inv; } }
  desiredDirX += sepX * 0.6f; desiredDirY += sepY * 0.6f; normalize(desiredDirX, desiredDirY);
  // Avoid danger zones and player's facing cone
  float avoidX = 0.f, avoidY = 0.f;
  for (int i = 0; i < (int)g_danger_count; ++i) {
    const DangerZone &dz = g_dangers[i]; if (g_time_seconds > dz.expiresAt) continue;
    float dx = e.x - dz.x, dy = e.y - dz.y; float d2 = dx*dx + dy*dy; float r = dz.radius; float r2 = r*r;
    if (d2 < r2 && d2 > 1e-6f) { float d = __builtin_sqrtf(d2); float w = dz.strength * (1.f - (d / r)); avoidX += (dx / d) * w; avoidY += (dy / d) * w; }
  }
  { float toWolfX = e.x - g_pos_x; float toWolfY = e.y - g_pos_y; float dl = vec_len(toWolfX, toWolfY); if (dl > 1e-5f) { toWolfX /= dl; toWolfY /= dl; } float dot = g_face_x * toWolfX + g_face_y * toWolfY; if (dot > PREY_CONE_COS) { avoidX += g_face_x * (PREY_CONE_WEIGHT * (dot - PREY_CONE_COS)); avoidY += g_face_y * (PREY_CONE_WEIGHT * (dot - PREY_CONE_COS)); cautious *= 0.9f; } }
  if (avoidX != 0.f || avoidY != 0.f) { desiredDirX += (-avoidX); desiredDirY += (-avoidY); normalize(desiredDirX, desiredDirY); }
  bool lungingNow = (g_time_seconds < e.lungeEndTime); bool feintingNow = (g_time_seconds < e.feintEndTime);
  if (!lungingNow && !feintingNow) {
    if (e.noticed && (g_time_seconds - e.noticeAcquiredTime) >= ENEMY_MIN_CHASE_BEFORE_LUNGE && dist > 0.f && dist < ENEMY_LUNGE_RANGE && (g_time_seconds - e.lastLungeTime) > ENEMY_LUNGE_COOLDOWN) {
      float doFeint = (rng_float01() < (g_pack_plan == PackPlan::Commit ? (ENEMY_FEINT_PROB * 0.4f) : ENEMY_FEINT_PROB)) ? 1.f : 0.f;
      e.lungeDirX = dirToPlayerX; e.lungeDirY = dirToPlayerY;
      if (doFeint > 0.5f) { e.feintEndTime = g_time_seconds + ENEMY_FEINT_DURATION; } else { e.lungeEndTime = g_time_seconds + ENEMY_LUNGE_DURATION; }
      e.fatigue += FATIGUE_LUNGE_BONUS; if (e.fatigue > 1.f) e.fatigue = 1.f;
      e.lastLungeTime = g_time_seconds; lungingNow = (e.lungeEndTime > g_time_seconds); feintingNow = (e.feintEndTime > g_time_seconds);
    }
  }
  float speed = ENEMY_BASE_SPEED; if (stateOut == EnemyState::Harass) speed *= 0.85f; if (g_pack_plan == PackPlan::Commit) speed *= 1.35f; speed *= cautious;
  float desiredVX, desiredVY; if (lungingNow) { desiredVX = e.lungeDirX * ENEMY_LUNGE_SPEED; desiredVY = e.lungeDirY * ENEMY_LUNGE_SPEED; }
  else if (feintingNow) { desiredVX = e.lungeDirX * (ENEMY_LUNGE_SPEED * 0.5f); desiredVY = e.lungeDirY * (ENEMY_LUNGE_SPEED * 0.5f); }
  else { desiredVX = desiredDirX * speed + g_wind_x * 0.02f; desiredVY = desiredDirY * speed + g_wind_y * 0.02f; }
  e.vx += (desiredVX - e.vx) * (ENEMY_ACCEL * dt); e.vy += (desiredVY - e.vy) * (ENEMY_ACCEL * dt);
  float f = 1.f - (ENEMY_FRICTION * dt); if (f < 0.f) f = 0.f; e.vx *= f; e.vy *= f;
  float sp = vec_len(e.vx, e.vy); if (sp > ENEMY_MAX_SPEED && sp > 0.f) { float scale = ENEMY_MAX_SPEED / sp; e.vx *= scale; e.vy *= scale; }
  const float nx = e.x + e.vx * dt; const float ny = e.y + e.vy * dt; enemy_apply_world_collision(e, nx, ny);
  // Fatigue update
  { float spd = vec_len(e.vx, e.vy); float exert = (spd > 0.f) ? (spd / ENEMY_MAX_SPEED) : 0.f; float df = (exert * FATIGUE_PER_SPEED - FATIGUE_RECOVERY_PER_SEC) * dt; e.fatigue += df; if (e.fatigue < 0.f) e.fatigue = 0.f; else if (e.fatigue > 1.f) e.fatigue = 1.f; }
  if (lungingNow) {
    float toPlayerX2 = g_pos_x - e.x; float toPlayerY2 = g_pos_y - e.y; float dist2 = vec_len(toPlayerX2, toPlayerY2);
    if (dist2 <= ATTACK_RANGE) {
      int result = handle_incoming_attack(e.x, e.y, e.lungeDirX, e.lungeDirY);
      if (result == 0 && !g_player_latched) {
        float toPlayerDirX = (dist2 > 0.f) ? (toPlayerX2 / dist2) : e.lungeDirX; float toPlayerDirY = (dist2 > 0.f) ? (toPlayerY2 / dist2) : e.lungeDirY;
        float facingDot = g_face_x * toPlayerDirX + g_face_y * toPlayerDirY;
        if (facingDot < -0.5f) { g_player_latched = 1; g_latch_end_time = g_time_seconds + LATCH_DURATION; for (int i = 0; i < (int)g_enemy_count; ++i) if (&g_enemies[i] == &e) { g_latch_enemy_idx = i; break; } }
      }
    }
  }
  e.state = stateOut; enemy_face_towards(e, g_pos_x, g_pos_y);
}

static void update_enemy(Enemy &e, float dt) {
  switch (e.type) {
    case EnemyType::Wolf: update_enemy_wolf(e, dt); break;
    case EnemyType::Dummy: default: { e.vx *= 0.98f; e.vy *= 0.98f; enemy_apply_world_collision(e, e.x + e.vx * dt, e.y + e.vy * dt); if (e.vx == 0.f && e.vy == 0.f) enemy_face_towards(e, g_pos_x, g_pos_y); } break;
  }
}

static inline void enemy_tick_all(float dtSeconds) {
  for (int i = 0; i < (int)g_enemy_count; ++i) { if (!g_enemies[i].active) continue; if (g_enemies[i].health <= 0.f) { g_enemies[i].active = 0; continue; } update_enemy(g_enemies[i], dtSeconds); }
}

static int enemy_alloc_slot() { for (int i = 0; i < MAX_ENEMIES; ++i) { if (!g_enemies[i].active) return i; } return -1; }

static void enemy_activate(int idx, EnemyType type, float x, float y) {
  Enemy &e = g_enemies[idx]; e.active = 1; e.type = type; e.state = EnemyState::Idle; e.x = clamp01(x); e.y = clamp01(y); e.vx = 0.f; e.vy = 0.f; e.faceX = 1.f; e.faceY = 0.f; e.stamina = 1.f; e.health = 1.f; e.mem = { e.x, e.y, g_time_seconds, e.x, e.y, 0.f, 0.f, 0.f }; e.lastLungeTime = -1000.f; e.lungeEndTime = -1000.f; e.feintEndTime = -1000.f; e.lungeDirX = 1.f; e.lungeDirY = 0.f; e.noticed = 0; e.noticeAcquiredTime = -1000.f; e.fatigue = 0.f; e.searchSeed = (float)(rng_u32() % 1024) / 1024.0f; if ((unsigned char)(idx + 1) > g_enemy_count) g_enemy_count = (unsigned char)(idx + 1);
}


