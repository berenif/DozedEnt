// Enemy types, pack controller, AI behavior, collisions, sounds
#pragma once

#include "internal_core.h"
#include "wolf_anim_data.h"

enum class EnemyType : unsigned char { Wolf = 0, Dummy = 1 };
enum class EnemyState : unsigned char { Idle = 0, Seek = 1, Circle = 2, Harass = 3, Recover = 4, Ambush = 5, Flank = 6, Retreat = 7, Prowl = 8, Howl = 9 };

// Emotional states that affect behavior
enum class EmotionalState : unsigned char {
    Calm = 0,       // Default state, normal behavior
    Aggressive = 1, // More likely to attack
    Fearful = 2,    // More cautious, likely to retreat
    Desperate = 3,  // Will take risks, ignore fatigue
    Confident = 4,  // Better coordination, less hesitation
    Frustrated = 5, // More feints, unpredictable
    Hurt = 6        // Recently damaged, defensive behavior
};
enum class PackRole : unsigned char { Lead = 0, FlankL = 1, FlankR = 2, Harasser = 3, PupGuard = 4, Scout = 5, Ambusher = 6, None = 255 };

// Forward declarations
static void update_vocalization_system(float dt);
static void update_alpha_wolf(float dt);
static void update_scent_tracking(float dt);

#define MAX_ENEMIES 16
#define MAX_SOUND_PINGS 32

struct SoundPing { float x; float y; float intensity; float timeSeconds; };

struct EnemyMemory {
  float lastSeenX; float lastSeenY; float lastSeenTime;
  float lastScentX; float lastScentY; float lastScentStrength;
  float lastSeenConfidence; float lastScentConfidence;
  // Learning system
  float playerSpeed; float playerReactionTime;
  float successfulAttackAngle; int dodgePatternId;
  float lastPlayerBlockTime; float lastPlayerRollTime;
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
  // Enhanced AI fields
  float aggression; // 0-1, affects attack frequency
  float intelligence; // 0-1, affects tactical decisions
  float coordination; // 0-1, affects pack synchronization
  float morale; // 0-1, individual morale
  float lastCommunicationTime;
  unsigned char targetLocked; // is this wolf committed to current target
  float ambushReadyTime; // when ambush position reached
  float retreatUntilTime; // retreat until this time
  EmotionalState emotion; // Current emotional state
  float emotionIntensity; // 0-1, how strongly the emotion affects behavior
  float lastDamageTime; // When last took damage
  int successfulAttacks; // Number of successful attacks
  int failedAttacks; // Number of failed attacks
  WolfAnimData anim_data; // Procedural animation data
};

static Enemy g_enemies[MAX_ENEMIES];
static unsigned char g_enemy_count = 0;

static SoundPing g_sounds[MAX_SOUND_PINGS];
static unsigned char g_sound_count = 0;

// Tunables for enemies (externalized via balance_data)
#include "generated/balance_data.h"
#ifndef BAL_ENEMY_BASE_SPEED
#define BAL_ENEMY_BASE_SPEED 0.18
#endif
#ifndef BAL_ENEMY_CIRCLE_RADIUS
#define BAL_ENEMY_CIRCLE_RADIUS 0.08
#endif
#ifndef BAL_ENEMY_SEEK_RANGE
#define BAL_ENEMY_SEEK_RANGE 0.45
#endif
#ifndef BAL_ENEMY_HARASS_RANGE
#define BAL_ENEMY_HARASS_RANGE 0.11
#endif
#ifndef BAL_ENEMY_ACCEL
#define BAL_ENEMY_ACCEL 1.1
#endif
#ifndef BAL_ENEMY_FRICTION
#define BAL_ENEMY_FRICTION 2.0
#endif
#ifndef BAL_ENEMY_MAX_SPEED
#define BAL_ENEMY_MAX_SPEED 0.26
#endif
#ifndef BAL_ENEMY_LUNGE_RANGE
#define BAL_ENEMY_LUNGE_RANGE 0.125
#endif
#ifndef BAL_ENEMY_LUNGE_SPEED
#define BAL_ENEMY_LUNGE_SPEED 0.42
#endif
#ifndef BAL_ENEMY_LUNGE_DURATION
#define BAL_ENEMY_LUNGE_DURATION 0.16
#endif
#ifndef BAL_ENEMY_LUNGE_COOLDOWN
#define BAL_ENEMY_LUNGE_COOLDOWN 0.90
#endif
#ifndef BAL_ENEMY_FEINT_PROB
#define BAL_ENEMY_FEINT_PROB 0.35
#endif
#ifndef BAL_ENEMY_FEINT_DURATION
#define BAL_ENEMY_FEINT_DURATION 0.10
#endif
#ifndef BAL_ENEMY_MIN_CHASE_BEFORE_LUNGE
#define BAL_ENEMY_MIN_CHASE_BEFORE_LUNGE 0.75
#endif
#ifndef BAL_LATCH_DURATION
#define BAL_LATCH_DURATION 1.0
#endif
#ifndef BAL_LATCH_DRAG_SPEED
#define BAL_LATCH_DRAG_SPEED 0.22
#endif
static const float ENEMY_BASE_SPEED = (float)BAL_ENEMY_BASE_SPEED;
static const float ENEMY_CIRCLE_RADIUS = (float)BAL_ENEMY_CIRCLE_RADIUS;
static const float ENEMY_SEEK_RANGE = (float)BAL_ENEMY_SEEK_RANGE;
static const float ENEMY_HARASS_RANGE = (float)BAL_ENEMY_HARASS_RANGE;
static const float ENEMY_ACCEL = (float)BAL_ENEMY_ACCEL;
static const float ENEMY_FRICTION = (float)BAL_ENEMY_FRICTION;
static const float ENEMY_MAX_SPEED = (float)BAL_ENEMY_MAX_SPEED;
static const float ENEMY_LUNGE_RANGE = (float)BAL_ENEMY_LUNGE_RANGE;
static const float ENEMY_LUNGE_SPEED = (float)BAL_ENEMY_LUNGE_SPEED;
static const float ENEMY_LUNGE_DURATION = (float)BAL_ENEMY_LUNGE_DURATION;
static const float ENEMY_LUNGE_COOLDOWN = (float)BAL_ENEMY_LUNGE_COOLDOWN;
static const float ENEMY_FEINT_PROB = (float)BAL_ENEMY_FEINT_PROB;
static const float ENEMY_FEINT_DURATION = (float)BAL_ENEMY_FEINT_DURATION;
static const float ENEMY_MIN_CHASE_BEFORE_LUNGE = (float)BAL_ENEMY_MIN_CHASE_BEFORE_LUNGE;
static const float LATCH_DURATION = (float)BAL_LATCH_DURATION;
static const float LATCH_DRAG_SPEED = (float)BAL_LATCH_DRAG_SPEED;

// Prey cone avoidance constants
#ifndef BAL_PREY_CONE_COS
#define BAL_PREY_CONE_COS 0.5
#endif
#ifndef BAL_PREY_CONE_WEIGHT
#define BAL_PREY_CONE_WEIGHT 0.8
#endif
static const float PREY_CONE_COS = (float)BAL_PREY_CONE_COS;  // cos(60 deg) - threshold for player's facing cone
static const float PREY_CONE_WEIGHT = (float)BAL_PREY_CONE_WEIGHT;  // weight for avoidance when in player's cone

// Fatigue system constants
#ifndef BAL_FATIGUE_LUNGE_BONUS
#define BAL_FATIGUE_LUNGE_BONUS 0.15
#endif
#ifndef BAL_FATIGUE_PER_SPEED
#define BAL_FATIGUE_PER_SPEED 0.3
#endif
#ifndef BAL_FATIGUE_RECOVERY_PER_SEC
#define BAL_FATIGUE_RECOVERY_PER_SEC 0.2
#endif
static const float FATIGUE_LUNGE_BONUS = (float)BAL_FATIGUE_LUNGE_BONUS;  // fatigue gained from lunging
static const float FATIGUE_PER_SPEED = (float)BAL_FATIGUE_PER_SPEED;  // fatigue accumulation rate
static const float FATIGUE_RECOVERY_PER_SEC = (float)BAL_FATIGUE_RECOVERY_PER_SEC;  // fatigue recovery rate

// Danger zones (blackboard) and den
#define MAX_DANGER_ZONES 16
struct DangerZone { float x; float y; float radius; float strength; float expiresAt; };
static DangerZone g_dangers[MAX_DANGER_ZONES];
static unsigned char g_danger_count = 0;
static float g_den_x = 0.5f;
static float g_den_y = 0.5f;
static float g_den_radius = 0.f;

// Environmental awareness - terrain features
#define MAX_TERRAIN_FEATURES 32
enum class TerrainType : unsigned char { 
    HighGround = 0,  // Advantage for ambush
    LowGround = 1,   // Disadvantage, avoid
    Cover = 2,       // Good for stalking
    OpenField = 3,   // Good for circling
    Chokepoint = 4,  // Good for trapping
    Water = 5        // Slows movement
};

struct TerrainFeature {
    float x, y;
    float radius;
    TerrainType type;
    float advantage; // 0-1, how advantageous this terrain is
};

static TerrainFeature g_terrain[MAX_TERRAIN_FEATURES];
static unsigned char g_terrain_count = 0;

// Escalation modifiers (queried via exported accessors to avoid header coupling)
extern "C" float get_enemy_speed_modifier();

// Check terrain advantage at position
static float get_terrain_advantage(float x, float y, EnemyState state) {
    float advantage = 0.5f; // Default neutral
    
    for (int i = 0; i < g_terrain_count; ++i) {
        float dx = x - g_terrain[i].x;
        float dy = y - g_terrain[i].y;
        float dist2 = dx*dx + dy*dy;
        
        if (dist2 < g_terrain[i].radius * g_terrain[i].radius) {
            // Different terrain types benefit different states
            switch(g_terrain[i].type) {
                case TerrainType::HighGround:
                    if (state == EnemyState::Ambush) advantage += 0.3f;
                    break;
                case TerrainType::Cover:
                    if (state == EnemyState::Seek || state == EnemyState::Ambush) advantage += 0.2f;
                    break;
                case TerrainType::OpenField:
                    if (state == EnemyState::Circle) advantage += 0.2f;
                    break;
                case TerrainType::Chokepoint:
                    if (state == EnemyState::Harass) advantage += 0.25f;
                    break;
                case TerrainType::LowGround:
                    advantage -= 0.2f;
                    break;
                case TerrainType::Water:
                    advantage -= 0.1f; // Slight disadvantage
                    break;
            }
        }
    }
    
    return clamp01(advantage);
}

// Pack controller/roles
enum class PackPlan : unsigned char { Stalk = 0, Encircle = 1, Harass = 2, Commit = 3, Ambush = 4, Pincer = 5, Retreat = 6 };

// Pack communication messages
enum class PackMessage : unsigned char { TargetSpotted = 0, AttackNow = 1, Retreat = 2, Regroup = 3, FlankLeft = 4, FlankRight = 5 };
static PackPlan g_pack_plan = PackPlan::Stalk;
static float g_pack_plan_time = 0.f;
static float g_pack_morale = 0.7f;
static unsigned char g_enemy_roles[MAX_ENEMIES];

// Enhanced pack coordination
static float g_pack_sync_timer = 0.f; // for synchronized attacks
static float g_pack_last_success_time = -1000.f;
static float g_pack_last_failure_time = -1000.f;
static int g_pack_successful_hunts = 0;
static int g_pack_failed_hunts = 0;
static float g_player_skill_estimate = 0.5f; // 0-1, pack's estimate of player skill

// Wolf pack management system - maintain 3 active packs
#define MAX_WOLF_PACKS 3
#define PACK_RESPAWN_DELAY 30.0f // 30 seconds

struct WolfPack {
    unsigned char active;           // Is this pack slot active
    unsigned char alive;            // Is this pack still alive (has living members)
    unsigned char pack_id;          // Unique pack identifier
    float spawn_time;              // When this pack was spawned
    float death_time;              // When this pack was eliminated (-1 if alive)
    float respawn_timer;           // Countdown to respawn (-1 if not counting down)
    unsigned char member_count;     // Number of wolves in this pack
    unsigned char member_indices[6]; // Indices into g_enemies array (max 6 wolves per pack)
    float center_x, center_y;      // Pack spawn center
};

static WolfPack g_wolf_packs[MAX_WOLF_PACKS];
static unsigned char g_active_pack_count = 0;
static unsigned char g_next_pack_id = 1;

static inline void assign_default_roles() { for (int i = 0; i < MAX_ENEMIES; ++i) g_enemy_roles[i] = (unsigned char)PackRole::None; }

// Pack tracking variables used for morale and howl reinforcement
static unsigned char g_pack_peak_wolves = 0; // tracks peak active wolves in current encounter
static float g_howl_cooldown_until = -1000.f;

static void update_pack_controller() {
  float sumDist = 0.f; int count = 0; int healthyCount = 0;
  float avgFatigue = 0.f; float avgHealth = 0.f;
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue;
    float dx = g_pos_x - g_enemies[i].x; float dy = g_pos_y - g_enemies[i].y;
    sumDist += vec_len(dx, dy); 
    avgFatigue += g_enemies[i].fatigue;
    avgHealth += g_enemies[i].health;
    if (g_enemies[i].health > 0.5f) healthyCount++;
    count++;
  }
  if (count == 0) { g_pack_plan = PackPlan::Stalk; return; }
  float avgDist = sumDist / (float)count;
  avgFatigue /= (float)count;
  avgHealth /= (float)count;
  
  // Update player skill estimate based on pack performance
  float timeSinceSuccess = g_time_seconds - g_pack_last_success_time;
  float timeSinceFailure = g_time_seconds - g_pack_last_failure_time;
  if (timeSinceSuccess < 5.0f) g_player_skill_estimate *= 0.98f; // player is easier
  if (timeSinceFailure < 5.0f) {
    float newEstimate = g_player_skill_estimate * 1.02f;
    g_player_skill_estimate = (1.0f < newEstimate) ? 1.0f : newEstimate;
  }
  
  // Dynamic morale based on pack state and history
  g_pack_morale = avgHealth * 0.4f + (1.0f - avgFatigue) * 0.3f + (healthyCount / (float)count) * 0.3f;
  if (g_pack_successful_hunts > g_pack_failed_hunts) g_pack_morale += 0.1f;
  g_pack_morale = clamp01(g_pack_morale);
  
  PackPlan next = g_pack_plan;
  
  // Intelligent plan selection based on multiple factors
  if (avgHealth < 0.3f || avgFatigue > 0.8f) {
    next = PackPlan::Retreat; // Pack is too weak, retreat and recover
  } else if (avgDist > 0.35f) {
    // Far from player - decide between stalk and ambush
    if (g_player_skill_estimate < 0.4f && count >= 3) next = PackPlan::Ambush;
    else next = PackPlan::Stalk;
  } else if (avgDist > 0.16f) {
    // Medium distance - tactical options
    if (count >= 4 && g_pack_morale > 0.6f) next = PackPlan::Pincer;
    else next = PackPlan::Encircle;
  } else if (g_pack_morale > 0.65f && avgFatigue < 0.5f) {
    next = PackPlan::Commit; // Close and ready to attack
  } else {
    next = PackPlan::Harass; // Close but need to be cautious
  }
  
  if (next != g_pack_plan) { g_pack_plan = next; g_pack_plan_time = g_time_seconds; }

  int idxs[MAX_ENEMIES]; float dists[MAX_ENEMIES]; int n = 0;
  for (int i = 0; i < (int)g_enemy_count; ++i) if (g_enemies[i].active) { idxs[n] = i; float dx = g_pos_x - g_enemies[i].x; float dy = g_pos_y - g_enemies[i].y; dists[n] = dx*dx + dy*dy; n++; }
  
  // Dynamic role assignment based on pack plan
  for (int i = 0; i < n; ++i) g_enemy_roles[idxs[i]] = (unsigned char)PackRole::Harasser;
  
  if (n >= 1) {
    int leadK = 0; 
    // Select lead based on health, stamina, and intelligence
    for (int k = 1; k < n; ++k) {
      float leadScore = (1.0f / (dists[leadK] + 0.01f)) * g_enemies[idxs[leadK]].health * (1.0f - g_enemies[idxs[leadK]].fatigue);
      float kScore = (1.0f / (dists[k] + 0.01f)) * g_enemies[idxs[k]].health * (1.0f - g_enemies[idxs[k]].fatigue);
      if (kScore > leadScore) leadK = k;
    }
    int leadIdx = idxs[leadK]; 
    g_enemy_roles[leadIdx] = (unsigned char)PackRole::Lead;
    
    float fdx = g_pos_x - g_enemies[leadIdx].x; float fdy = g_pos_y - g_enemies[leadIdx].y; normalize(fdx, fdy);
    int leftIdx = -1, rightIdx = -1, scoutIdx = -1, ambusherIdx = -1;
    
    // Assign roles based on pack plan
    if (g_pack_plan == PackPlan::Ambush && n >= 3) {
      // Find best ambusher (furthest with good health)
      int ambK = 0;
      for (int k = 1; k < n; ++k) {
        if (k != leadK && dists[k] > dists[ambK] && g_enemies[idxs[k]].health > 0.6f) ambK = k;
      }
      ambusherIdx = idxs[ambK];
      g_enemy_roles[ambusherIdx] = (unsigned char)PackRole::Ambusher;
    }
    
    if (g_pack_plan == PackPlan::Pincer && n >= 4) {
      // Assign scouts for pincer movement
      for (int k = 0; k < n && scoutIdx < 0; ++k) {
        if (k != leadK && g_enemies[idxs[k]].stamina > 0.7f) {
          scoutIdx = idxs[k];
          g_enemy_roles[scoutIdx] = (unsigned char)PackRole::Scout;
        }
      }
    }
    
    // Standard flanker assignment
    for (int k = 0; k < n; ++k) {
      if (k == leadK) continue;
      int ei = idxs[k]; 
      if (ei == ambusherIdx || ei == scoutIdx) continue;
      float vx = g_enemies[ei].x - g_pos_x; float vy = g_enemies[ei].y - g_pos_y;
      float side = fdx * vy - fdy * vx;
      if (side > 0.f && leftIdx < 0) leftIdx = ei;
      else if (side < 0.f && rightIdx < 0) rightIdx = ei;
    }
    
    if (leftIdx >= 0) g_enemy_roles[leftIdx] = (unsigned char)PackRole::FlankL;
    if (rightIdx >= 0) g_enemy_roles[rightIdx] = (unsigned char)PackRole::FlankR;
    
    // Assign pup guard to furthest healthy wolf
    if (n >= 3) {
      int farK = 0; 
      for (int k = 1; k < n; ++k) {
        if (g_enemy_roles[idxs[k]] == (unsigned char)PackRole::Harasser && dists[k] > dists[farK]) farK = k;
      }
      g_enemy_roles[idxs[farK]] = (unsigned char)PackRole::PupGuard;
    }
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

// Update wolf's emotional state based on situation
static void update_emotional_state(Enemy &e, float dt) {
    // Decay emotion intensity over time
    e.emotionIntensity *= 0.98f;
    
    // Calculate emotional triggers
    float healthRatio = e.health;
    float fatigueLevel = e.fatigue;
    float successRate = (e.successfulAttacks + e.failedAttacks > 0) ? 
                       (float)e.successfulAttacks / (e.successfulAttacks + e.failedAttacks) : 0.5f;
    float timeSinceDamage = g_time_seconds - e.lastDamageTime;
    
    // Determine new emotional state
    EmotionalState newEmotion = e.emotion;
    float newIntensity = e.emotionIntensity;
    
    // Check for emotional triggers
    if (healthRatio < 0.3f && fatigueLevel > 0.7f) {
        // Low health and high fatigue = Fearful
        newEmotion = EmotionalState::Fearful;
        newIntensity = 0.8f;
    } else if (g_pack_morale > 0.7f && successRate > 0.6f) {
        // High morale and success = Confident
        newEmotion = EmotionalState::Confident;
        newIntensity = 0.7f;
    } else if (e.failedAttacks > 3 && e.successfulAttacks == 0) {
        // Multiple failures = Frustrated
        newEmotion = EmotionalState::Frustrated;
        newIntensity = 0.9f;
    } else if (healthRatio < 0.5f && g_pack_morale < 0.4f) {
        // Low health and low pack morale = Desperate
        newEmotion = EmotionalState::Desperate;
        newIntensity = 0.85f;
    } else if (timeSinceDamage < 2.0f) {
        // Recently damaged = Aggressive (revenge)
        newEmotion = EmotionalState::Aggressive;
        newIntensity = 0.75f;
    } else {
        // Default to calm
        newEmotion = EmotionalState::Calm;
        newIntensity = (0.3f > e.emotionIntensity) ? 0.3f : e.emotionIntensity;
    }
    
    // Smooth emotional transitions
    if (newEmotion != e.emotion) {
        e.emotion = newEmotion;
        e.emotionIntensity = newIntensity;
    } else {
        e.emotionIntensity = (e.emotionIntensity > newIntensity) ? e.emotionIntensity : newIntensity;
    }
    
    // Apply emotional effects to behavior modifiers
    switch(e.emotion) {
        case EmotionalState::Aggressive: {
            float newAggression = e.aggression + 0.2f * e.emotionIntensity;
            e.aggression = (1.0f < newAggression) ? 1.0f : newAggression;
            break;
        }
        case EmotionalState::Fearful:
            e.aggression *= (1.0f - 0.3f * e.emotionIntensity);
            e.morale *= (1.0f - 0.2f * e.emotionIntensity);
            break;
        case EmotionalState::Desperate:
            e.aggression = 1.0f; // Maximum aggression when desperate
            break;
        case EmotionalState::Confident: {
            float newCoord = e.coordination + 0.2f * e.emotionIntensity;
            e.coordination = (1.0f < newCoord) ? 1.0f : newCoord;
            float newIntel = e.intelligence + 0.1f * e.emotionIntensity;
            e.intelligence = (1.0f < newIntel) ? 1.0f : newIntel;
            break;
        }
        case EmotionalState::Frustrated:
            // Erratic behavior
            e.aggression = 0.5f + rng_float01() * 0.5f * e.emotionIntensity;
            break;
        case EmotionalState::Calm:
        default:
            // Calm state - no modifications
            break;
    }
}

static void update_enemy_wolf(Enemy &e, float dt) {
  // No longer need to assign an animation data slot; it's part of the Enemy struct
  WolfAnimData &anim_data = e.anim_data;
  anim_data.active = 1;

  // Update emotional state first
  update_emotional_state(e, dt);
  float toPlayerX = g_pos_x - e.x; float toPlayerY = g_pos_y - e.y; float dist = vec_len(toPlayerX, toPlayerY);
  float dirToPlayerX = toPlayerX, dirToPlayerY = toPlayerY; if (dist > 0.f) { dirToPlayerX /= dist; dirToPlayerY /= dist; }
  const float memDecay = 0.8f; e.mem.lastSeenConfidence -= memDecay * dt; if (e.mem.lastSeenConfidence < 0.f) e.mem.lastSeenConfidence = 0.f; e.mem.lastScentConfidence -= memDecay * dt; if (e.mem.lastScentConfidence < 0.f) e.mem.lastScentConfidence = 0.f;
  if (dist < ENEMY_SEEK_RANGE) { e.mem.lastSeenX = g_pos_x; e.mem.lastSeenY = g_pos_y; e.mem.lastSeenTime = g_time_seconds; e.mem.lastSeenConfidence = 1.f; if (!e.noticed) { e.noticed = 1; e.noticeAcquiredTime = g_time_seconds; } }
  const float SOUND_WINDOW = 1.0f; float heardX = 0.f, heardY = 0.f, heardW = 0.f;
  for (int i = 0; i < (int)g_sound_count; ++i) { const SoundPing &s = g_sounds[i]; float age = g_time_seconds - s.timeSeconds; if (age < 0.f || age > SOUND_WINDOW) continue; float dx = s.x - e.x, dy = s.y - e.y; float d = vec_len(dx, dy); const float maxHearing = 0.5f; if (d > maxHearing) continue; float weight = s.intensity * (1.f - (age / SOUND_WINDOW)) * (1.f - (d / maxHearing)); if (weight > heardW) { heardW = weight; heardX = s.x; heardY = s.y; } }
  float scentGX = 0.f, scentGY = 0.f; scent_gradient_at(e.x, e.y, scentGX, scentGY); float scentStrength = 0.f; { int ix = (int)(e.x * (SCENT_W - 1)); if (ix < 0) ix = 0; if (ix >= SCENT_W) ix = SCENT_W - 1; int iy = (int)(e.y * (SCENT_H - 1)); if (iy < 0) iy = 0; if (iy >= SCENT_H) iy = SCENT_H - 1; scentStrength = g_scent[iy][ix]; }
  if (scentStrength > e.mem.lastScentStrength) { e.mem.lastScentX = e.x; e.mem.lastScentY = e.y; e.mem.lastScentStrength = scentStrength; e.mem.lastScentConfidence = 1.f; }
  // Enhanced state selection based on pack plan and individual role
  EnemyState stateOut = e.state; 
  unsigned char role = (unsigned char)PackRole::None; 
  for (int i = 0; i < (int)g_enemy_count; ++i) if (&g_enemies[i] == &e) { role = g_enemy_roles[i]; break; }
  
  switch (g_pack_plan) { 
    case PackPlan::Stalk: stateOut = EnemyState::Seek; break; 
    case PackPlan::Encircle: stateOut = EnemyState::Circle; break; 
    case PackPlan::Harass: stateOut = EnemyState::Harass; break; 
    case PackPlan::Commit: stateOut = EnemyState::Harass; break;
    case PackPlan::Ambush: 
      stateOut = (role == (unsigned char)PackRole::Ambusher) ? EnemyState::Ambush : EnemyState::Seek; 
      break;
    case PackPlan::Pincer:
      stateOut = (role == (unsigned char)PackRole::Scout || role == (unsigned char)PackRole::FlankL || role == (unsigned char)PackRole::FlankR) ? EnemyState::Flank : EnemyState::Circle;
      break;
    case PackPlan::Retreat:
      stateOut = EnemyState::Retreat;
      break;
  }
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
  
  // Consider terrain advantages when moving
  float currentTerrainAdv = get_terrain_advantage(e.x, e.y, stateOut);
  
  // Look for better terrain nearby
  if (e.intelligence > 0.5f && currentTerrainAdv < 0.6f) {
    float bestX = e.x, bestY = e.y, bestAdv = currentTerrainAdv;
    const float SCAN_RADIUS = 0.15f;
    const int SCAN_POINTS = 8;
    
    for (int i = 0; i < SCAN_POINTS; ++i) {
      float angle = (float)i * (2.0f * 3.14159f / SCAN_POINTS);
      float testX = e.x + __builtin_cosf(angle) * SCAN_RADIUS;
      float testY = e.y + __builtin_sinf(angle) * SCAN_RADIUS;
      float testAdv = get_terrain_advantage(testX, testY, stateOut);
      
      if (testAdv > bestAdv) {
        bestAdv = testAdv;
        bestX = testX;
        bestY = testY;
      }
    }
    
    // Blend movement towards better terrain
    if (bestAdv > currentTerrainAdv + 0.1f) {
      float toTerrainX = bestX - e.x, toTerrainY = bestY - e.y;
      normalize(toTerrainX, toTerrainY);
      desiredDirX = desiredDirX * 0.7f + toTerrainX * 0.3f;
      desiredDirY = desiredDirY * 0.7f + toTerrainY * 0.3f;
      normalize(desiredDirX, desiredDirY);
    }
  }
  
  // Role-specific movement behaviors
  if (stateOut == EnemyState::Circle) {
    float tx = -dirToPlayerY, ty = dirToPlayerX;
    if (role == (unsigned char)PackRole::FlankL) { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.8f); }
    else if (role == (unsigned char)PackRole::FlankR) { desiredDirX = (dirToPlayerX * 0.4f - tx * 0.8f); desiredDirY = (dirToPlayerY * 0.4f - ty * 0.8f); }
    else { desiredDirX = (dirToPlayerX * 0.4f + tx * 0.6f); desiredDirY = (dirToPlayerY * 0.4f + ty * 0.6f); }
    normalize(desiredDirX, desiredDirY);
  } else if (stateOut == EnemyState::Ambush) {
    // Move to ambush position behind player's predicted path
    float predictX = g_pos_x + g_face_x * 0.3f;
    float predictY = g_pos_y + g_face_y * 0.3f;
    desiredDirX = predictX - e.x; desiredDirY = predictY - e.y;
    normalize(desiredDirX, desiredDirY);
    if (dist > 0.4f) cautious = 0.5f; // Move stealthily when far
    else e.ambushReadyTime = g_time_seconds; // Mark ready when in position
  } else if (stateOut == EnemyState::Flank) {
    // Wide flanking movement
    float angle = (role == (unsigned char)PackRole::FlankL) ? 1.2f : -1.2f;
    float cosA = __builtin_cosf(angle), sinA = __builtin_sinf(angle);
    desiredDirX = dirToPlayerX * cosA - dirToPlayerY * sinA;
    desiredDirY = dirToPlayerX * sinA + dirToPlayerY * cosA;
    normalize(desiredDirX, desiredDirY);
  } else if (stateOut == EnemyState::Retreat) {
    // Move away from player towards den or safe distance
    desiredDirX = -dirToPlayerX; desiredDirY = -dirToPlayerY;
    if (g_den_radius > 0.f) {
      float toDenX = g_den_x - e.x, toDenY = g_den_y - e.y;
      normalize(toDenX, toDenY);
      desiredDirX = desiredDirX * 0.5f + toDenX * 0.5f;
      desiredDirY = desiredDirY * 0.5f + toDenY * 0.5f;
    }
    normalize(desiredDirX, desiredDirY);
    e.retreatUntilTime = g_time_seconds + 3.0f; // Retreat for 3 seconds
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
    // Enhanced attack decision with learning, coordination, and emotions
    float fatigueThreshold = 0.7f;
    float cooldownMod = 1.0f;
    float rangeBonus = 0.0f;
    
    // Emotional state affects attack parameters
    switch(e.emotion) {
        case EmotionalState::Desperate:
            fatigueThreshold = 0.95f; // Attack even when exhausted
            cooldownMod = 0.5f; // Faster attacks
            break;
        case EmotionalState::Aggressive:
            fatigueThreshold = 0.85f;
            rangeBonus = 0.03f; // Slightly longer attack range
            break;
        case EmotionalState::Fearful:
            fatigueThreshold = 0.4f; // Only attack when fresh
            cooldownMod = 1.5f; // Slower attacks
            break;
        case EmotionalState::Confident:
            cooldownMod = 0.8f; // More frequent attacks
            break;
        case EmotionalState::Frustrated:
            // Random variation in attack timing
            cooldownMod = 0.5f + rng_float01();
            break;
        case EmotionalState::Calm:
        default:
            // Default behavior
            break;
    }
    
    bool shouldAttack = e.noticed && (g_time_seconds - e.noticeAcquiredTime) >= ENEMY_MIN_CHASE_BEFORE_LUNGE 
                       && dist > 0.f && dist < (ENEMY_LUNGE_RANGE + rangeBonus)
                       && (g_time_seconds - e.lastLungeTime) > (ENEMY_LUNGE_COOLDOWN * cooldownMod)
                       && e.fatigue < fatigueThreshold;
    
    // Coordinate attacks with pack
    if (shouldAttack && g_pack_plan == PackPlan::Commit) {
      // Check if other wolves are attacking for synchronized assault
      int attackingCount = 0;
      for (int i = 0; i < (int)g_enemy_count; ++i) {
        if (g_enemies[i].active && (g_enemies[i].lungeEndTime > g_time_seconds)) attackingCount++;
      }
      if (attackingCount == 0 && role == (unsigned char)PackRole::Lead) shouldAttack = true; // Lead initiates
      else if (attackingCount > 0 && attackingCount < 3) shouldAttack = true; // Join the attack
      else shouldAttack = false; // Too many attacking, wait
    }
    
    if (shouldAttack) {
      // Adaptive feint probability based on player skill estimate
      float adaptiveFeintProb = ENEMY_FEINT_PROB * (0.5f + g_player_skill_estimate);
      if (g_pack_plan == PackPlan::Commit) adaptiveFeintProb *= 0.4f;
      
      float doFeint = (rng_float01() < adaptiveFeintProb) ? 1.f : 0.f;
      
      // Predict player movement for better attack angle
      float predictedX = g_pos_x + (g_pos_x - e.mem.lastSeenX) * 0.2f;
      float predictedY = g_pos_y + (g_pos_y - e.mem.lastSeenY) * 0.2f;
      float predDirX = predictedX - e.x, predDirY = predictedY - e.y;
      normalize(predDirX, predDirY);
      
      e.lungeDirX = predDirX; e.lungeDirY = predDirY;
      if (doFeint > 0.5f) { e.feintEndTime = g_time_seconds + ENEMY_FEINT_DURATION; } 
      else { e.lungeEndTime = g_time_seconds + ENEMY_LUNGE_DURATION; }
      
      e.fatigue += FATIGUE_LUNGE_BONUS; if (e.fatigue > 1.f) e.fatigue = 1.f;
      e.lastLungeTime = g_time_seconds; 
      lungingNow = (e.lungeEndTime > g_time_seconds); 
      feintingNow = (e.feintEndTime > g_time_seconds);
    }
  }
  // Apply adaptive difficulty modifiers
  float adaptiveSpeedMod = 0.8f + g_player_skill_estimate * 0.4f; // 0.8 to 1.2 based on player skill
  // Apply global escalation enemy speed modifier if available
  float escalMod = get_enemy_speed_modifier();
  if (escalMod > 0.0f) adaptiveSpeedMod *= escalMod;
  float speed = ENEMY_BASE_SPEED * adaptiveSpeedMod; 
  if (stateOut == EnemyState::Harass) speed *= 0.85f; 
  if (g_pack_plan == PackPlan::Commit) speed *= 1.35f; 
  speed *= cautious;
  
  // Adaptive intelligence affects movement prediction
  speed *= (0.9f + e.intelligence * 0.2f);
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

  // --- Procedural Animation Calculations ---
  // Basic Leg Movement (Walk Cycle)
  float speed_magnitude = vec_len(e.vx, e.vy);
  float walk_cycle_phase = fmodf(g_time_seconds * 10.0f * speed_magnitude, 2.0f * 3.14159f);
  float leg_amplitude = 0.015f * (speed_magnitude / ENEMY_MAX_SPEED);

  // Front left leg (0)
  anim_data.leg_x[0] = -0.01f + sinf(walk_cycle_phase) * leg_amplitude;
  anim_data.leg_y[0] = 0.01f + fabsf(cosf(walk_cycle_phase)) * leg_amplitude * 0.5f;

  // Front right leg (1)
  anim_data.leg_x[1] = 0.01f + sinf(walk_cycle_phase + 3.14159f) * leg_amplitude;
  anim_data.leg_y[1] = 0.01f + fabsf(cosf(walk_cycle_phase + 3.14159f)) * leg_amplitude * 0.5f;

  // Hind left leg (2)
  anim_data.leg_x[2] = -0.015f + sinf(walk_cycle_phase + 3.14159f * 0.5f) * leg_amplitude * 0.8f;
  anim_data.leg_y[2] = 0.015f + fabsf(cosf(walk_cycle_phase + 3.14159f * 0.5f)) * leg_amplitude * 0.4f;

  // Hind right leg (3)
  anim_data.leg_x[3] = 0.015f + sinf(walk_cycle_phase + 3.14159f * 1.5f) * leg_amplitude * 0.8f;
  anim_data.leg_y[3] = 0.015f + fabsf(cosf(walk_cycle_phase + 3.14159f * 1.5f)) * leg_amplitude * 0.4f;

  // Spine Bend (based on turning)
  // Simplified for now, more complex logic later
  anim_data.spine_bend = e.vx * 0.1f; // Simple bend based on x-velocity

  // Tail Angle (based on emotion and speed)
  float target_tail_angle = 0.0f;
  if (e.emotion == EmotionalState::Aggressive || e.emotion == EmotionalState::Confident) {
      target_tail_angle = 0.5f; // Raised tail
  } else if (e.emotion == EmotionalState::Fearful || e.emotion == EmotionalState::Desperate) {
      target_tail_angle = -0.5f; // Tucked tail
  } else {
      target_tail_angle = 0.1f; // Neutral
  }
  // Add wagging when moving or excited
  if (speed_magnitude > 0.01f || e.emotion == EmotionalState::Confident) {
      target_tail_angle += sinf(g_time_seconds * 8.0f) * 0.2f;
  }
  anim_data.tail_angle = target_tail_angle;

  // Head Pitch/Yaw (based on state and player position)
  anim_data.head_pitch = 0.0f;
  anim_data.head_yaw = 0.0f;
  if (e.state == EnemyState::Prowl || e.state == EnemyState::Ambush) {
      anim_data.head_pitch = -0.2f; // Lowered head
  } else if (e.state == EnemyState::Howl) {
      anim_data.head_pitch = 0.5f; // Raised head for howling
  }
  // Simple head tracking towards player
  anim_data.head_yaw = atan2f(toPlayerY, toPlayerX) - atan2f(e.faceY, e.faceX);

  // Ear Rotation (based on emotion/alertness)
  float target_ear_rotation = 0.0f;
  if (e.emotion == EmotionalState::Aggressive || e.emotion == EmotionalState::Confident) {
      target_ear_rotation = -0.2f; // Ears forward
  } else if (e.emotion == EmotionalState::Fearful || e.emotion == EmotionalState::Hurt) {
      target_ear_rotation = 0.3f; // Ears flattened
  }
  anim_data.ear_rotation[0] = target_ear_rotation; // Left ear
  anim_data.ear_rotation[1] = target_ear_rotation; // Right ear

  // Body Stretch and Offset (for momentum/lunging/bobbing)
  anim_data.body_stretch = 1.0f;
  anim_data.body_offset_y = 0.0f;
  if (lungingNow) {
      anim_data.body_stretch = 1.2f; // Stretch during lunge
      anim_data.body_offset_y = -0.02f; // Lower body during lunge
  } else if (speed_magnitude > 0.01f) {
      // Bobbing while moving
      anim_data.body_offset_y = sinf(g_time_seconds * 12.0f * speed_magnitude) * 0.005f;
  }

  // Fur Ruffle (based on emotion/speed)
  anim_data.fur_ruffle = 0.0f;
  if (e.emotion == EmotionalState::Aggressive || e.emotion == EmotionalState::Fearful) {
      anim_data.fur_ruffle = e.emotionIntensity * 0.1f;
  }
  if (speed_magnitude > ENEMY_MAX_SPEED * 0.7f) {
      anim_data.fur_ruffle += (speed_magnitude / ENEMY_MAX_SPEED) * 0.05f;
  }
}

static void update_enemy(Enemy &e, float dt) {
  switch (e.type) {
    case EnemyType::Wolf: update_enemy_wolf(e, dt); break;
    case EnemyType::Dummy: default: { e.vx *= 0.98f; e.vy *= 0.98f; enemy_apply_world_collision(e, e.x + e.vx * dt, e.y + e.vy * dt); if (e.vx == 0.f && e.vy == 0.f) enemy_face_towards(e, g_pos_x, g_pos_y); } break;
  }
}

// Pack communication system
static void broadcast_pack_message(PackMessage msg, float senderX, float senderY) {
  const float COMM_RANGE = 0.4f; // Communication range
  for (int i = 0; i < (int)g_enemy_count; ++i) {
    if (!g_enemies[i].active) continue;
    float dx = g_enemies[i].x - senderX, dy = g_enemies[i].y - senderY;
    float dist = vec_len(dx, dy);
    if (dist < COMM_RANGE) {
      g_enemies[i].lastCommunicationTime = g_time_seconds;
      // React to message
      switch(msg) {
        case PackMessage::AttackNow:
          if (g_enemies[i].fatigue < 0.6f) g_enemies[i].targetLocked = 1;
          break;
        case PackMessage::Retreat:
          g_enemies[i].retreatUntilTime = g_time_seconds + 2.0f;
          break;
        case PackMessage::TargetSpotted: {
          float currentConf = g_enemies[i].mem.lastSeenConfidence;
          g_enemies[i].mem.lastSeenConfidence = (currentConf > 0.5f) ? currentConf : 0.5f;
          break;
        }
        case PackMessage::Regroup:
        case PackMessage::FlankLeft:
        case PackMessage::FlankRight:
        default:
          // Other messages handled elsewhere or ignored
          break;
      }
    }
  }
}

static inline void enemy_tick_all(float dtSeconds) {
  // Update pack controller first
  update_pack_controller();
  
  // Update new AI systems
  update_vocalization_system(dtSeconds);
  update_alpha_wolf(dtSeconds);
  update_scent_tracking(dtSeconds);
  
  // Check for coordinated actions
  static float lastCoordCheck = -1.0f;
  if (g_time_seconds - lastCoordCheck > 0.5f) { // Check every 0.5 seconds
    lastCoordCheck = g_time_seconds;
    
    // Count ready wolves for coordinated attack
    int readyCount = 0;
    for (int i = 0; i < (int)g_enemy_count; ++i) {
      if (!g_enemies[i].active) continue;
      float dx = g_pos_x - g_enemies[i].x, dy = g_pos_y - g_enemies[i].y;
      float dist = vec_len(dx, dy);
      if (dist < 0.2f && g_enemies[i].fatigue < 0.5f) readyCount++;
    }
    
    // Trigger coordinated attack if enough wolves ready
    if (readyCount >= 3 && g_pack_plan == PackPlan::Commit) {
      for (int i = 0; i < (int)g_enemy_count; ++i) {
        if (!g_enemies[i].active) continue;
        if (g_enemy_roles[i] == (unsigned char)PackRole::Lead) {
          broadcast_pack_message(PackMessage::AttackNow, g_enemies[i].x, g_enemies[i].y);
          break;
        }
      }
    }
  }
  
  // Update individual wolves
  for (int i = 0; i < (int)g_enemy_count; ++i) { 
    if (!g_enemies[i].active) continue; 
    if (g_enemies[i].health <= 0.f) { 
      g_enemies[i].active = 0; 
      g_pack_failed_hunts++; // Track failure
      continue; 
    } 
    update_enemy(g_enemies[i], dtSeconds); 
  }
}

static int enemy_alloc_slot() { for (int i = 0; i < MAX_ENEMIES; ++i) { if (!g_enemies[i].active) return i; } return -1; }

static void enemy_activate(int idx, EnemyType type, float x, float y) {
  Enemy &e = g_enemies[idx]; 
  e.active = 1; e.type = type; e.state = EnemyState::Idle; 
  e.x = clamp01(x); e.y = clamp01(y); e.vx = 0.f; e.vy = 0.f; 
  e.faceX = 1.f; e.faceY = 0.f; e.stamina = 1.f; e.health = 1.f; 
  e.mem = { e.x, e.y, g_time_seconds, e.x, e.y, 0.f, 0.f, 0.f, 0.f, 0.f, 0.f, 0, -1000.f, -1000.f }; 
  e.lastLungeTime = -1000.f; e.lungeEndTime = -1000.f; e.feintEndTime = -1000.f; 
  e.lungeDirX = 1.f; e.lungeDirY = 0.f; e.noticed = 0; e.noticeAcquiredTime = -1000.f; 
  e.fatigue = 0.f; e.searchSeed = (float)(rng_u32() % 1024) / 1024.0f; 
  // Initialize enhanced AI fields with variation
  e.aggression = 0.3f + rng_float01() * 0.4f; // 0.3-0.7
  e.intelligence = 0.4f + rng_float01() * 0.4f; // 0.4-0.8
  e.coordination = 0.5f + rng_float01() * 0.3f; // 0.5-0.8
  e.morale = 0.6f + rng_float01() * 0.2f; // 0.6-0.8
  e.lastCommunicationTime = -1000.f;
  e.targetLocked = 0;
  e.ambushReadyTime = -1000.f;
  e.retreatUntilTime = -1000.f;
  // Initialize emotional state
  e.emotion = EmotionalState::Calm;
  e.emotionIntensity = 0.3f;
  e.lastDamageTime = -1000.f;
  e.successfulAttacks = 0;
  e.failedAttacks = 0;
  if ((unsigned char)(idx + 1) > g_enemy_count) g_enemy_count = (unsigned char)(idx + 1);

  // Biome-specific attribute adjustments
  switch (g_current_biome) {
      case BiomeType::Forest:
          e.aggression += 0.1f;
          e.intelligence += 0.05f;
          break;
      case BiomeType::Swamp:
          // No direct speed attribute, but can affect movement in update_enemy_wolf
          e.health += 0.1f; // Tougher enemies
          e.stamina += 0.1f;
          break;
      case BiomeType::Mountains:
          e.coordination += 0.15f;
          e.intelligence += 0.1f;
          break;
      case BiomeType::Plains:
          // Speed is handled by adaptiveSpeedMod in update_enemy_wolf
          e.aggression += 0.2f;
          e.morale += 0.1f;
          break;
      default:
          break;
  }

  // Ensure attributes stay within valid ranges (0-1 for most)
  if (e.aggression > 1.0f) e.aggression = 1.0f;
  if (e.intelligence > 1.0f) e.intelligence = 1.0f;
  if (e.coordination > 1.0f) e.coordination = 1.0f;
  if (e.morale > 1.0f) e.morale = 1.0f;
  if (e.health > 1.0f) e.health = 1.0f;
  if (e.stamina > 1.0f) e.stamina = 1.0f;

}

// Expire time-limited danger zones
static inline void expire_dangers() {
  for (int i = 0; i < (int)g_danger_count; ++i) {
    if (g_time_seconds > g_dangers[i].expiresAt) {
      int last = (int)g_danger_count - 1;
      if (i <= last) {
        g_dangers[i] = g_dangers[last];
        if (g_danger_count > 0) g_danger_count--;
      }
    }
  }
}

// Spawn a clustered pack of wolves around a random center. Returns number spawned.
static unsigned int spawn_wolf_pack(unsigned int packSize) {
  if (packSize == 0u) return 0u;
  const float MIN_SPAWN_DISTANCE = 0.55f;
  const float MAX_SPAWN_DISTANCE = 0.85f;
  const float spread = 0.06f;

  // Adjust packSize based on biome
  switch (g_current_biome) {
      case BiomeType::Forest:
          packSize += (rng_u32() % 2); // 0 or 1 additional wolf
          break;
      case BiomeType::Swamp:
          packSize += (rng_u32() % 1); // 0 additional wolf (fewer but tougher enemies)
          break;
      case BiomeType::Mountains:
          packSize += (rng_u32() % 3); // 0-2 additional wolves
          break;
      case BiomeType::Plains:
          packSize += (rng_u32() % 2) + 1; // 1-2 additional wolves (more open, more enemies)
          break;
      default:
          break;
  }
  
  // Clamp packSize to MAX_ENEMIES
  if (packSize > MAX_ENEMIES) packSize = MAX_ENEMIES;

  float cx = 0.5f, cy = 0.5f;
  bool foundGoodLocation = false;
  for (int attempt = 0; attempt < 10; ++attempt) {
    const float margin = 0.18f;
    const float range = 1.f - margin - margin;
    cx = margin + range * rng_float01();
    cy = margin + range * rng_float01();
    float dx = cx - g_pos_x;
    float dy = cy - g_pos_y;
    float distToPlayer = vec_len(dx, dy);
    if (distToPlayer >= MIN_SPAWN_DISTANCE && distToPlayer <= MAX_SPAWN_DISTANCE) {
      foundGoodLocation = true;
      break;
    }
  }
  if (!foundGoodLocation) {
    float angle = rng_float01() * 2.f * 3.14159f;
    float spawnDist = MIN_SPAWN_DISTANCE + (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE) * rng_float01();
    cx = g_pos_x + __builtin_cosf(angle) * spawnDist;
    cy = g_pos_y + __builtin_sinf(angle) * spawnDist;
    cx = clamp01(cx);
    cy = clamp01(cy);
  }

  unsigned int spawned = 0u;
  for (unsigned int i = 0; i < packSize; ++i) {
    int idx = enemy_alloc_slot();
    if (idx < 0) break;
    float ox = rng_float01() * 2.f - 1.f;
    float oy = rng_float01() * 2.f - 1.f;
    normalize(ox, oy);
    float radius = spread * (0.4f + 0.6f * rng_float01());
    float ex = clamp01(cx + ox * radius);
    float ey = clamp01(cy + oy * radius);
    enemy_activate(idx, EnemyType::Wolf, ex, ey);
    spawned += 1u;
  }
  update_pack_controller();
  return spawned;
}

// Initialize wolf pack management system
static inline void init_wolf_pack_system() {
  for (int i = 0; i < MAX_WOLF_PACKS; ++i) {
    g_wolf_packs[i].active = 0;
    g_wolf_packs[i].alive = 0;
    g_wolf_packs[i].pack_id = 0;
    g_wolf_packs[i].spawn_time = -1.0f;
    g_wolf_packs[i].death_time = -1.0f;
    g_wolf_packs[i].respawn_timer = -1.0f;
    g_wolf_packs[i].member_count = 0;
    for (int j = 0; j < 6; ++j) {
      g_wolf_packs[i].member_indices[j] = 255; // Invalid index
    }
    g_wolf_packs[i].center_x = 0.5f;
    g_wolf_packs[i].center_y = 0.5f;
  }
  g_active_pack_count = 0;
  g_next_pack_id = 1;
}

// Create a new wolf pack and track it
static inline unsigned int create_tracked_wolf_pack(unsigned int packSize) {
  // Find empty pack slot
  int pack_slot = -1;
  for (int i = 0; i < MAX_WOLF_PACKS; ++i) {
    if (!g_wolf_packs[i].active) {
      pack_slot = i;
      break;
    }
  }
  
  if (pack_slot == -1) return 0; // No available pack slots
  
  // Spawn the actual wolves using existing spawn_wolf_pack function
  unsigned int spawned = spawn_wolf_pack(packSize);
  
  if (spawned > 0) {
    WolfPack &pack = g_wolf_packs[pack_slot];
    pack.active = 1;
    pack.alive = 1;
    pack.pack_id = g_next_pack_id++;
    pack.spawn_time = g_time_seconds;
    pack.death_time = -1.0f;
    pack.respawn_timer = -1.0f;
    pack.member_count = 0;
    
    // Track which enemies belong to this pack
    // Find the most recently spawned wolves
    int wolves_found = 0;
    for (int i = (int)g_enemy_count - 1; i >= 0 && wolves_found < (int)spawned; --i) {
      if (i < MAX_ENEMIES && g_enemies[i].active && g_enemies[i].type == EnemyType::Wolf) {
        if (pack.member_count < 6) { // Ensure we don't exceed member array bounds
          pack.member_indices[pack.member_count] = i;
          pack.member_count++;
          wolves_found++;
        }
      }
    }
    
    g_active_pack_count++;
  }
  
  return spawned;
}

// Check if a pack is still alive (has living members)
static inline unsigned char is_pack_alive(int pack_index) {
  if (pack_index < 0 || pack_index >= MAX_WOLF_PACKS) return 0;
  if (!g_wolf_packs[pack_index].active) return 0;
  
  WolfPack &pack = g_wolf_packs[pack_index];
  for (int i = 0; i < pack.member_count && i < 6; ++i) { // Bounds check member_count
    int enemy_idx = pack.member_indices[i];
    if (enemy_idx >= 0 && enemy_idx < MAX_ENEMIES && g_enemies[enemy_idx].active && g_enemies[enemy_idx].health > 0.0f) {
      return 1; // At least one wolf is alive
    }
  }
  return 0; // No living wolves found
}

// Update wolf pack system - check for dead packs and handle respawning
static inline void update_wolf_pack_system(float dtSeconds) {
  // Check each pack for death and start respawn timers
  for (int i = 0; i < MAX_WOLF_PACKS; ++i) {
    WolfPack &pack = g_wolf_packs[i];
    if (!pack.active) continue;
    
    if (pack.alive && !is_pack_alive(i)) {
      // Pack just died, start respawn timer
      pack.alive = 0;
      pack.death_time = g_time_seconds;
      pack.respawn_timer = PACK_RESPAWN_DELAY;
      g_active_pack_count--;
    }
    
    // Update respawn timer for dead packs
    if (!pack.alive && pack.respawn_timer > 0.0f) {
      pack.respawn_timer -= dtSeconds;
      
      if (pack.respawn_timer <= 0.0f) {
        // Time to respawn this pack
        pack.respawn_timer = -1.0f;
        
        // Determine pack size based on current game state
        unsigned int new_pack_size = 3 + (rng_u32() % 3); // 3-5 wolves
        
        // Adjust based on current biome
        switch (g_current_biome) {
          case BiomeType::Forest:
            new_pack_size += (rng_u32() % 2); // 0-1 additional
            break;
          case BiomeType::Mountains:
            new_pack_size += (rng_u32() % 3); // 0-2 additional
            break;
          case BiomeType::Plains:
            new_pack_size += 1 + (rng_u32() % 2); // 1-2 additional
            break;
          default:
            break;
        }
        
        // Clamp to reasonable limits
        if (new_pack_size > 6) new_pack_size = 6;
        
        // Respawn the pack
        unsigned int spawned = spawn_wolf_pack(new_pack_size);
        
        if (spawned > 0) {
          // Update pack tracking
          pack.alive = 1;
          pack.spawn_time = g_time_seconds;
          pack.death_time = -1.0f;
          pack.member_count = 0;
          
          // Track the new wolves
          int wolves_found = 0;
          for (int j = (int)g_enemy_count - 1; j >= 0 && wolves_found < (int)spawned; --j) {
            if (j < MAX_ENEMIES && g_enemies[j].active && g_enemies[j].type == EnemyType::Wolf) {
              // Check if this wolf is already tracked by another pack
              unsigned char already_tracked = 0;
              for (int k = 0; k < MAX_WOLF_PACKS; ++k) {
                if (k == i || !g_wolf_packs[k].active || !g_wolf_packs[k].alive) continue;
                for (int l = 0; l < g_wolf_packs[k].member_count && l < 6; ++l) {
                  if (g_wolf_packs[k].member_indices[l] == j) {
                    already_tracked = 1;
                    break;
                  }
                }
                if (already_tracked) break;
              }
              
              if (!already_tracked && pack.member_count < 6) {
                pack.member_indices[pack.member_count] = j;
                pack.member_count++;
                wolves_found++;
              }
            }
          }
          
          g_active_pack_count++;
        } else {
          // Failed to spawn, deactivate pack slot
          pack.active = 0;
        }
      }
    }
  }
  
  // Ensure we maintain 3 active packs by spawning new ones if needed
  while (g_active_pack_count < MAX_WOLF_PACKS) {
    unsigned int pack_size = 3 + (rng_u32() % 3); // 3-5 wolves
    if (create_tracked_wolf_pack(pack_size) == 0) {
      break; // Failed to create pack, stop trying
    }
  }
}

// Update pack morale and track casualties/den bonuses
static inline void update_pack_morale_and_peak(float dtSeconds) {
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

// Handle periodic howl-based reinforcement spawns based on pack morale
static inline void maybe_handle_howl_spawns() {
  if (g_time_seconds > g_howl_cooldown_until) {
    if (g_pack_morale > 0.75f) {
      if ((1.f - g_hp) > 0.35f) {
        int idx = enemy_alloc_slot();
        if (idx >= 0) {
          const float MIN_SPAWN_DISTANCE = 0.55f;
          const float MAX_SPAWN_DISTANCE = 0.75f;
          float angle = rng_float01() * 2.f * 3.14159f;
          float spawnDist = MIN_SPAWN_DISTANCE + (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE) * rng_float01();
          float ex = clamp01(g_pos_x + __builtin_cosf(angle) * spawnDist);
          float ey = clamp01(g_pos_y + __builtin_sinf(angle) * spawnDist);
          enemy_activate(idx, EnemyType::Wolf, ex, ey);
        }
        g_howl_cooldown_until = g_time_seconds + 8.f;
      } else {
        g_pack_plan = PackPlan::Encircle; g_pack_plan_time = g_time_seconds;
        g_howl_cooldown_until = g_time_seconds + 5.f;
      }
    }
  }
}


