// Minimal C++ game logic compiled to WASM
// - Maintains player position in normalized [0,1] space
// - Applies movement and collision against a vertical wall centered at x=0.5

#include <cmath>
#include "internal_core.h"
#include "obstacles.h"
#include "terrain_hazards.h"
#include "scent.h"
#include "enemies.h"
#include "wolf_vocalization.h"
#include "alpha_wolf.h"
#include "scent_tracking.h"
#include "choices.h"
#include "risk.h"
#include "escalate.h"
#include "cashout.h"
#include "anim_overlay.h"
#include "physics_backbone.h"
#include "force_propagation.h"
#include "constraint_logic.h"
#include "chemistry_system.h"
#include "world_simulation.h"
#include "weapons.h"

// External reference to world simulation
extern WorldSimulation g_world_sim;

// Include achievement and statistics systems
#include "achievement-system.h"
#include "statistics-system.h"
#include "adaptive_ai.h"

// Player input variables - 5-button combat system
static float g_input_x = 0.f;
static float g_input_y = 0.f;
static int g_input_is_rolling = 0;
static int g_input_is_jumping = 0;
static int g_input_light_attack = 0;    // A1 - Light attack
static int g_input_heavy_attack = 0;    // A2 - Heavy attack  
static int g_input_is_blocking = 0;     // Block - Hold to guard, tap to parry
static int g_input_special = 0;         // Special - Hero move

// Player animation state global
PlayerAnimState g_player_anim_state = PlayerAnimState_Idle;
static PlayerAnimState g_prev_player_anim_state = PlayerAnimState_Idle;

// Setter for player input - 5-button combat system
__attribute__((export_name("set_player_input")))
void set_player_input(float inputX, float inputY, int isRolling, int isJumping, int lightAttack, int heavyAttack, int isBlocking, int special) {
  g_input_x = inputX;
  g_input_y = inputY;
  g_input_is_rolling = isRolling;
  g_input_is_jumping = isJumping;
  g_input_light_attack = lightAttack;
  g_input_heavy_attack = heavyAttack;
  g_input_is_blocking = isBlocking;
  g_input_special = special;
}

int main() { return 0; }

// Player modifiers now centralized in internal_core.h

// Animation overlay moved to anim_overlay.h

// Pack tracking lives in enemies.h

/* Choices and landmarks now declared in choices.h/internal_core.h */

__attribute__((export_name("init_run")))
void init_run(unsigned long long seed, unsigned int start_weapon) {
  // Initialize weapon system
  init_weapon_system();
  
  // Set weapon based on start_weapon parameter
  if (start_weapon < (unsigned int)WeaponType::Count) {
    WeaponType weapon = (WeaponType)start_weapon;
    
    // Determine character type based on weapon
    CharacterType character = CharacterType::None;
    if (weapon == WeaponType::WardenLongsword) {
      character = CharacterType::Warden;
    } else if (weapon == WeaponType::RaiderGreataxe) {
      character = CharacterType::Raider;
    } else if (weapon == WeaponType::KenseiKatana) {
      character = CharacterType::Kensei;
    }
    
    set_character_weapon(character, weapon);
  }
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
  g_is_grounded = 1; // New: Player starts grounded
  g_jump_count = 0; // New: Jump counter
  init_choice_pool();  // Initialize the choice pool
  init_risk_phase();   // Initialize risk phase
  g_time_seconds = 0.f;
  g_room_count = 0;     // Reset room counter
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
  
  // Initialize wolf pack management system
  init_wolf_pack_system();
  // Clear wolf animation data
  reset_wolf_anim_data();
  
  // Initialize new AI systems
  init_vocalization_system();
  init_scent_tracking();
  g_alpha_wolf.wolf_index = -1; // Reset alpha wolf

  // Initialize physics system
  physics_init();
  
  // Initialize force propagation system
  force_propagation_init();
  
  // Initialize constraint system
  constraint_system_init();
  
  // Initialize chemistry system
  chemistry_system_init();
  
  // Initialize world simulation system
  world_simulation_init();

  // Initialize achievement and statistics systems
  init_achievement_system();
  initialize_statistics_system();
  start_stats_session();

  // Randomly select a biome for the new run
  g_current_biome = (BiomeType)(rng_u32() % (unsigned int)BiomeType::Count);
  
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

  // Generate a simple platform for jumping if not in a biome that generates complex platforms
  // This is a placeholder; more sophisticated platform generation should be biome-specific
  if (g_current_biome == BiomeType::Forest || g_current_biome == BiomeType::Plains) {
    g_obstacle_count = 1;
    g_obstacles_x[0] = 0.5f;
    g_obstacles_y[0] = 0.7f;
    g_obstacles_r[0] = 0.1f; // Represents a platform
  } else {
    g_obstacle_count = 0;
  }

  // Spawn initial wolf packs - create 3 packs to maintain constant pressure
  unsigned int initial_pack_size = 3;
  if (g_room_count < 3) {
    // First 3 rooms are shorter with fewer enemies
    initial_pack_size = 2 + (g_room_count > 0 ? 1 : 0);  // 2, 3, 3 enemies
  }
  
  // Create 3 initial tracked wolf packs
  for (int pack_num = 0; pack_num < MAX_WOLF_PACKS; ++pack_num) {
    create_tracked_wolf_pack(initial_pack_size);
  }
  
  // Initial role assignment for all spawned wolves
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

__attribute__((export_name("get_room_count")))
unsigned int get_room_count() { return g_room_count; }

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
    g_room_count++;  // Increment room count for early room spawn logic
    return 1;
  }
  return 0;
}

__attribute__((export_name("trigger_risk_event")))
void trigger_risk_event_export() {
  trigger_risk_event();
}

__attribute__((export_name("trigger_escalation_event")))
void trigger_escalation_event_export() {
  trigger_escalation_event();
}

__attribute__((export_name("exit_cashout")))
int exit_cashout() {
  if (g_phase != GamePhase::CashOut) return 0;
  g_phase = GamePhase::Explore;
  g_wolf_kills_since_choice = 0;
  g_room_count++;  // Increment room count for early room spawn logic
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

// Additional Risk phase exports
__attribute__((export_name("get_elite_active")))
int get_elite_active() { return g_elite_active ? 1 : 0; }

__attribute__((export_name("get_risk_event_count")))
unsigned int get_risk_event_count() { return g_risk_event_count; }

__attribute__((export_name("get_active_curse_count")))
unsigned int get_active_curse_count() { return g_curse_count; }

__attribute__((export_name("get_curse_type")))
unsigned int get_curse_type(unsigned int index) {
  if (index >= g_curse_count) return 0;
  return (unsigned int)g_active_curses[index].type;
}

__attribute__((export_name("get_curse_intensity")))
float get_curse_intensity(unsigned int index) {
  if (index >= g_curse_count) return 0.0f;
  return g_active_curses[index].intensity;
}

// Escalate phase exports
__attribute__((export_name("get_escalation_level")))
float get_escalation_level() { return g_escalation_level; }

// Phase initialization exports
__attribute__((export_name("init_risk_phase")))
void init_risk_phase_export() { init_risk_phase(); }

__attribute__((export_name("init_escalation_phase")))
void init_escalation_phase_export() { init_escalation_phase(); }

__attribute__((export_name("init_cashout_phase")))
void init_cashout_phase_export() { init_cashout_phase(); }

// Phase transition functions for testing/debugging
__attribute__((export_name("force_phase_transition")))
void force_phase_transition(unsigned int phase) {
  if (phase > 7) return; // Invalid phase
  g_phase = (GamePhase)phase;
  
  // Initialize the phase if needed
  switch (g_phase) {
    case GamePhase::Risk:
      init_risk_phase();
      trigger_risk_event();
      break;
    case GamePhase::Escalate:
      init_escalation_phase();
      trigger_escalation_event();
      break;
    case GamePhase::CashOut:
      init_cashout_phase();
      break;
    case GamePhase::Choose:
      generate_choices();
      break;
    default:
      break;
  }
}

__attribute__((export_name("generate_choices")))
void generate_choices_export() {
  generate_choices();
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
      
      // Apply specific effects based on tags from choices.h
      unsigned int tags = g_choices[i].tags;
      if (tags & TAG_STAMINA) { g_max_stamina += 0.1f; if (g_stamina > g_max_stamina) g_stamina = g_max_stamina; }
      if (tags & TAG_SPEED) { g_speed_mult *= 1.2f; }
      if (tags & TAG_DAMAGE) { g_attack_damage_mult *= 1.25f; }
      if (tags & TAG_DEFENSE) { g_defense_mult *= 1.25f; }
      if (tags & TAG_LIFESTEAL) { float nl = g_lifesteal + 0.15f; g_lifesteal = (nl > 0.6f) ? 0.6f : nl; }
      if (tags & TAG_COOLDOWN) { /* reserved */ }
      if (tags & TAG_TREASURE) { g_treasure_multiplier *= 1.5f; }
      if (tags & TAG_BURN) { /* reserved elemental */ }
      if (tags & TAG_FREEZE) { /* reserved elemental */ }
      if (tags & TAG_LIGHTNING) { /* reserved elemental */ }
      if (tags & TAG_POISON) { /* reserved elemental */ }
      if (tags & TAG_TELEPORT) { /* reserved */ }
      
      break;
    }
  }
  
  g_phase = GamePhase::Explore;
  g_choice_count = 0;
  g_wolf_kills_since_choice = 0;
  g_room_count++;  // Increment room count for early room spawn logic
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
void update(float dtSeconds) {
  // Advance simulation clock deterministically
  if (dtSeconds > 0.f) {
    g_time_seconds += dtSeconds;
  }
  // Normalize input direction if needed
  float len = g_input_x * g_input_x + g_input_y * g_input_y;
  if (len > 0.f) {
    // fast rsqrt approximation is unnecessary; use sqrt
    len = __builtin_sqrtf(len);
    g_input_x /= len;
    g_input_y /= len;
  }

  // Stun prevents all input
  if (g_is_stunned) {
    g_input_x = 0.f;
    g_input_y = 0.f;
    g_input_is_rolling = 0;
    g_input_light_attack = 0;
    g_input_heavy_attack = 0;
    g_input_is_blocking = 0;
    g_input_special = 0;
  }
  
  // Enhanced roll mechanics - different behavior for each roll state
  float speed_multiplier = 1.f;
  float friction_multiplier = 1.f;
  
  if (g_roll_state == RollState::Active) {
    speed_multiplier = ROLL_SPEED_MULTIPLIER;
    // During active roll, use roll direction instead of input
    g_input_x = g_roll_direction_x;
    g_input_y = g_roll_direction_y;
  } else if (g_roll_state == RollState::Sliding) {
    speed_multiplier = ROLL_SPEED_MULTIPLIER * 0.7f; // Maintain some speed
    friction_multiplier = ROLL_SLIDE_FRICTION; // Low traction
    // Continue in roll direction, ignore input during slide
    g_input_x = g_roll_direction_x * 0.5f; // Gradually reduce momentum
    g_input_y = g_roll_direction_y * 0.5f;
  }
  
  // Apply status effect modifiers to movement
  float status_speed_modifier = g_player_status_effects.get_movement_modifier();
  
  const float speed = (BASE_SPEED * g_speed_mult) * speed_multiplier * status_speed_modifier;
  const float acceleration = PLAYER_ACCEL * dtSeconds;
  const float friction = PLAYER_FRICTION * dtSeconds * friction_multiplier;

  // Update roll state machine
  if (g_roll_state == RollState::Active) {
    float roll_time = g_time_seconds - g_roll_start_time;
    if (roll_time >= ROLL_IFRAME_DURATION) {
      // Transition from active roll to sliding
      g_roll_state = RollState::Sliding;
    }
  } else if (g_roll_state == RollState::Sliding) {
    float roll_time = g_time_seconds - g_roll_start_time;
    if (roll_time >= (ROLL_IFRAME_DURATION + ROLL_SLIDE_DURATION)) {
      // End of roll sequence
      g_roll_state = RollState::Idle;
    }
  }
  
  // Update stun state
  if (g_is_stunned && g_time_seconds >= g_stun_end_time) {
    g_is_stunned = 0;
  }
  
  // Update hyperarmor state
  if (g_has_hyperarmor && g_time_seconds >= g_hyperarmor_end_time) {
    g_has_hyperarmor = 0;
  }
  
  // Update counter window
  if (g_can_counter && g_time_seconds >= g_counter_window_end) {
    g_can_counter = 0;
  }
  
  // Update combo window
  if (g_combo_count > 0 && g_time_seconds >= g_combo_window_end) {
    g_combo_count = 0;  // Reset combo if window expired
  }
  
  // Update status effects
  g_player_status_effects.update(dtSeconds, g_time_seconds);
  
  // Check if stunned by status effects
  if (g_player_status_effects.is_stunned()) {
    g_input_x = 0.f;
    g_input_y = 0.f;
    g_input_is_rolling = 0;
    g_input_light_attack = 0;
    g_input_heavy_attack = 0;
    g_input_is_blocking = 0;
    g_input_special = 0;
  }
  
  // Environmental detection (simplified - check boundaries)
  const float WALL_DETECTION_DISTANCE = 0.05f;
  const float LEDGE_DETECTION_DISTANCE = 0.1f;
  
  // Check for walls (arena boundaries)
  g_near_wall = 0;
  g_wall_distance = 999.0f;
  
  if (g_pos_x < WALL_DETECTION_DISTANCE || g_pos_x > (1.0f - WALL_DETECTION_DISTANCE)) {
    g_near_wall = 1;
    g_wall_distance = (g_pos_x < 0.5f) ? g_pos_x : (1.0f - g_pos_x);
  }
  if (g_pos_y < WALL_DETECTION_DISTANCE || g_pos_y > (1.0f - WALL_DETECTION_DISTANCE)) {
    g_near_wall = 1;
    float y_dist = (g_pos_y < 0.5f) ? g_pos_y : (1.0f - g_pos_y);
    if (y_dist < g_wall_distance) g_wall_distance = y_dist;
  }
  
  // Check for ledges (simplified - could be enhanced with terrain data)
  g_near_ledge = 0;
  g_ledge_distance = 999.0f;
  // This would normally check terrain data for actual ledges
  // For now, we'll consider extreme boundaries as potential ledges
  if (g_pos_x < LEDGE_DETECTION_DISTANCE || g_pos_x > (1.0f - LEDGE_DETECTION_DISTANCE) ||
      g_pos_y < LEDGE_DETECTION_DISTANCE || g_pos_y > (1.0f - LEDGE_DETECTION_DISTANCE)) {
    g_near_ledge = 1;
    g_ledge_distance = g_wall_distance;  // Use wall distance as approximation
  }
  
  // Cache rolling flag for combat checks - only true during i-frame period
  g_is_rolling = (g_roll_state == RollState::Active) ? 1 : 0;

  // Jump handling with improved mechanics
  static float g_last_jump_time = -1000.f;
  static int g_prev_is_grounded = 1;
  const float JUMP_BUFFER_TIME = 0.1f; // Allow jump input slightly before landing
  const float COYOTE_TIME = 0.15f; // Allow jump slightly after leaving platform
  static float g_left_ground_time = -1000.f;
  
  // Track when we left the ground
  if (!g_is_grounded && g_prev_is_grounded) {
    g_left_ground_time = g_time_seconds;
  }
  
  // Jump with buffer and coyote time
  if (g_input_is_jumping && (g_time_seconds - g_last_jump_time) > 0.2f) {
    bool canJump = false;
    
    if (g_is_grounded && g_jump_count == 0) {
      // Normal jump from ground
      canJump = true;
    } else if (!g_is_grounded && g_jump_count == 0 && 
               (g_time_seconds - g_left_ground_time) <= COYOTE_TIME) {
      // Coyote jump (recently left ground)
      canJump = true;
    } else if (g_jump_count == 1 && g_jump_count < MAX_JUMPS) {
      // Double jump
      canJump = true;
    }
    
    if (canJump) {
      float jumpPower = JUMP_POWER;
      if (g_jump_count == 1) {
        jumpPower *= 0.85f; // Slightly weaker double jump
      }
      
      g_vel_y = jumpPower;
      g_is_grounded = 0;
      g_jump_count++;
      g_last_jump_time = g_time_seconds;
      
      if (g_jump_count == 1) {
        g_player_anim_state = PlayerAnimState_Jumping;
      } else {
        g_player_anim_state = PlayerAnimState_DoubleJumping;
      }
    }
  }
  
  // Apply gravity if not grounded
  if (!g_is_grounded) {
      g_vel_y += GRAVITY * dtSeconds;
  }

  // Roll start cost is handled by on_roll_start() to allow UI gating

  // Release latch when time elapses
  if (g_player_latched && g_time_seconds >= g_latch_end_time) {
    g_player_latched = 0; g_latch_enemy_idx = -1;
  }

  // While holding block (and not rolling) or latched, target zero velocity
  bool haltMovement = ((g_input_is_blocking && !g_is_rolling) || g_player_latched);

  // Compute desired velocity from input
  float desiredVX = haltMovement ? 0.f : (g_input_x * speed);
  float desiredVY = haltMovement ? 0.f : (g_input_y * speed);

  // Smoothly steer velocity toward desired
  if (dtSeconds > 0.f) {
    g_vel_x += (desiredVX - g_vel_x) * acceleration;
    g_vel_y += (desiredVY - g_vel_y) * acceleration;
    // Friction damping
    float damp = 1.f - friction;
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

  // If movement halted due to block/latch, zero horizontal velocity
  if (haltMovement) { g_vel_x = 0.f; }

  // Integrate and resolve collisions against world and enemies
  float prevX = g_pos_x, prevY = g_pos_y;
  float nextX = clamp01(g_pos_x + g_vel_x * dtSeconds);
  float nextY = clamp01(g_pos_y + g_vel_y * dtSeconds);

  // Resolve player-obstacle collisions with improved platforming
  int was_grounded = g_is_grounded;
  g_is_grounded = 0; // Assume not grounded until collision detection proves otherwise
  g_prev_is_grounded = was_grounded;

  for (int i = 0; i < g_obstacle_count; ++i) {
      float ox = g_obstacles_x[i];
      float oy = g_obstacles_y[i];
      float oradius = g_obstacles_r[i];

      float dx = nextX - ox;
      float dy = nextY - oy;
      float dist = vec_len(dx, dy);
      float combined_radius = PLAYER_RADIUS + oradius;

      if (dist < combined_radius && dist > 0.f) {
          // Normalize collision vector
          dx /= dist;
          dy /= dist;
          
          // Calculate overlap
          float overlap = combined_radius - dist;
          
          // Determine collision type based on relative position and velocity
          float prev_dx = g_pos_x - ox;
          float prev_dy = g_pos_y - oy;
          float prev_dist = vec_len(prev_dx, prev_dy);
          
          // Check if this is a landing (falling onto platform from above)
          bool is_landing = (g_vel_y > 0.1f && dy > 0.5f && prev_dy > 0.3f);
          
          // Check if this is a ceiling hit (jumping into platform from below)
          bool is_ceiling = (g_vel_y < -0.1f && dy < -0.5f && prev_dy < -0.3f);
          
          // Check if this is a wall collision
          bool is_wall = (fabs(dx) > 0.6f);
          
          if (is_landing) {
              // Landing on top of platform
              nextY = oy - oradius - PLAYER_RADIUS;
              g_vel_y = 0.f;
              g_is_grounded = 1;
              g_jump_count = 0; // Reset jump count on landing
              if (!was_grounded) {
                  g_player_anim_state = PlayerAnimState_Landing;
              }
          } else if (is_ceiling) {
              // Hit ceiling
              nextY = oy + oradius + PLAYER_RADIUS;
              g_vel_y = 0.f;
          } else if (is_wall) {
              // Wall collision
              nextX = ox + dx * (oradius + PLAYER_RADIUS);
              g_vel_x *= 0.1f; // Reduce horizontal velocity when hitting walls
          } else {
              // General collision resolution
              nextX += dx * overlap * 0.5f;
              nextY += dy * overlap * 0.5f;
              
              // Reduce velocity in collision direction
              float vel_dot = g_vel_x * dx + g_vel_y * dy;
              if (vel_dot < 0) {
                  g_vel_x -= dx * vel_dot;
                  g_vel_y -= dy * vel_dot;
              }
          }
      }
  }
  
  // World boundary collision detection for all edges
  // Bottom boundary (ground)
  if (nextY >= 1.0f - PLAYER_RADIUS) {
      nextY = 1.0f - PLAYER_RADIUS;
      if (g_vel_y > 0) {
          g_vel_y = 0;
          g_is_grounded = 1;
          g_jump_count = 0;
          if (!was_grounded) {
              g_player_anim_state = PlayerAnimState_Landing;
          }
      }
  }
  
  // Top boundary
  if (nextY <= PLAYER_RADIUS) {
      nextY = PLAYER_RADIUS;
      if (g_vel_y < 0) {
          g_vel_y = 0;
      }
  }
  
  // Left boundary
  if (nextX <= PLAYER_RADIUS) {
      nextX = PLAYER_RADIUS;
      if (g_vel_x < 0) {
          g_vel_x = 0;
      }
  }
  
  // Right boundary
  if (nextX >= 1.0f - PLAYER_RADIUS) {
      nextX = 1.0f - PLAYER_RADIUS;
      if (g_vel_x > 0) {
          g_vel_x = 0;
      }
  }

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
          float damage = ATTACK_DAMAGE * g_attack_damage_mult * get_weapon_damage_multiplier();
          damage *= get_curse_modifier(CurseType::Weakness);
          if (e.type == EnemyType::Wolf) { damage *= g_wolf_damage_mult; }
          if (rng_float01() < (g_crit_chance + get_weapon_crit_bonus())) { damage *= 2.0f; }
          e.health -= damage;
          if (e.health < 0.f) e.health = 0.f;
          if (damage > 0.f && g_lifesteal > 0.f) { g_hp += damage * g_lifesteal; if (g_hp > 1.0f) g_hp = 1.0f; }
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
    // Update pack morale and track casualties
    update_pack_morale_and_peak(dtSeconds);
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
    // Update wolf pack management system (temporarily disabled for debugging)
    // update_wolf_pack_system(dtSeconds);
    
    // Howl-based reinforcement spawns
    maybe_handle_howl_spawns();
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
      g_room_count++;  // Increment room count for early room spawn logic
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
  
  // Passive HP regeneration
  if (dtSeconds > 0.f && g_hp_regen_per_sec > 0.f) {
    g_hp += g_hp_regen_per_sec * dtSeconds;
    if (g_hp > 1.0f) g_hp = 1.0f;
  }

  // Wall sliding detection
  static bool g_is_wall_sliding = false;
  static float g_wall_slide_timer = 0.f;
  
  // Check for wall sliding conditions
  if (!g_is_grounded && g_vel_y > 0.1f) {
      bool touching_wall = false;
      float wall_normal_x = 0.f;
      
      // Check if touching a wall
      for (int i = 0; i < g_obstacle_count; ++i) {
          float ox = g_obstacles_x[i];
          float oy = g_obstacles_y[i];
          float oradius = g_obstacles_r[i];
          
          float dx = g_pos_x - ox;
          float dy = g_pos_y - oy;
          float dist = vec_len(dx, dy);
          
          if (dist < (PLAYER_RADIUS + oradius + 0.01f) && fabs(dx) > 0.6f * dist) {
              touching_wall = true;
              wall_normal_x = dx > 0 ? 1.f : -1.f;
              break;
          }
      }
      
      // Check if player is trying to move into the wall
      bool moving_into_wall = (wall_normal_x > 0 && g_input_x > 0) || (wall_normal_x < 0 && g_input_x < 0);
      
      if (touching_wall && moving_into_wall && g_vel_y > 0.05f) {
          g_is_wall_sliding = true;
          g_wall_slide_timer = 0.f;
          // Reduce fall speed while wall sliding
          g_vel_y *= 0.6f;
      } else {
          if (g_is_wall_sliding) {
              g_wall_slide_timer += dtSeconds;
              if (g_wall_slide_timer > 0.1f) { // Small delay before stopping wall slide
                  g_is_wall_sliding = false;
              }
          }
      }
  } else {
      g_is_wall_sliding = false;
  }

  // Update player animation state with improved transitions
  PlayerAnimState new_state = g_player_anim_state;
  
  if (g_roll_state == RollState::Active || g_roll_state == RollState::Sliding) {
      new_state = PlayerAnimState_Rolling;
  } else if (g_attack_state != AttackState::Idle) {
      new_state = PlayerAnimState_Attacking;
  } else if (g_input_is_blocking && g_blocking) {
      new_state = PlayerAnimState_Blocking;
  } else if (g_is_wall_sliding) {
      new_state = PlayerAnimState_WallSliding;
  } else if (!g_is_grounded) {
      if (g_vel_y < -0.1f) {
          if (g_jump_count == 2) {
              new_state = PlayerAnimState_DoubleJumping;
          } else {
              new_state = PlayerAnimState_Jumping;
          }
      } else if (g_vel_y > 0.1f) {
          // Falling
          if (g_player_anim_state == PlayerAnimState_Jumping || 
              g_player_anim_state == PlayerAnimState_DoubleJumping) {
              // Keep current jumping state until landing
          } else {
              new_state = PlayerAnimState_Jumping; // Default falling animation
          }
      }
  } else if (g_is_grounded) {
      if (g_player_anim_state == PlayerAnimState_Jumping || 
          g_player_anim_state == PlayerAnimState_DoubleJumping ||
          g_player_anim_state == PlayerAnimState_WallSliding) {
          new_state = PlayerAnimState_Landing;
      } else if (g_player_anim_state == PlayerAnimState_Landing) {
          // Transition from landing after a brief moment
          static float landing_timer = 0.f;
          if (g_player_anim_state != g_prev_player_anim_state) {
              landing_timer = 0.f;
          }
          landing_timer += dtSeconds;
          
          if (landing_timer > 0.2f || vec_len(g_vel_x, g_vel_y) > 0.05f) {
              if (vec_len(g_vel_x, g_vel_y) > 0.05f) {
                  new_state = PlayerAnimState_Running;
              } else {
                  new_state = PlayerAnimState_Idle;
              }
          }
      } else {
          // Normal ground movement
          if (vec_len(g_vel_x, g_vel_y) > 0.05f) {
              new_state = PlayerAnimState_Running;
          } else {
              new_state = PlayerAnimState_Idle;
          }
      }
  }
  
  g_player_anim_state = new_state;

  // Record state start time when state changes (for UI timing)
  if (g_player_anim_state != g_prev_player_anim_state) {
    g_player_state_start_time = g_time_seconds;
    g_prev_player_anim_state = g_player_anim_state;
  }

  // Update physics system
  physics_step(dtSeconds);
  
  // PERFORMANCE FIX: Temporarily disable heavy systems that cause browser freeze
  // These systems process 64x64 grids (4096+ operations per frame) which is too expensive
  // TODO: Optimize these systems or make them run at lower frequency
  
  // Update force propagation system (lightweight)
  force_propagation_update(dtSeconds);
  
  // DISABLED: Update constraint system (can be expensive with many constraints)
  // constraint_system_update(dtSeconds);
  
  // DISABLED: Update chemistry system (64x64 grid = 4096 nodes per frame, causes freeze)
  // chemistry_system_update(dtSeconds);
  
  // DISABLED: Update world simulation system (can be expensive with weather/heat)
  // world_simulation_update(dtSeconds);

  // Update UI animation overlay values last so they're coherent with current frame state
  update_anim_overlay_internal();
}

// Position getters
__attribute__((export_name("get_x")))
float get_x() { return g_pos_x; }

// Enhanced animation overlay getters
__attribute__((export_name("get_anim_spine_curve")))
float get_anim_spine_curve() { return g_anim_spine_curve; }

__attribute__((export_name("get_anim_shoulder_rotation")))
float get_anim_shoulder_rotation() { return g_anim_shoulder_rotation; }

__attribute__((export_name("get_anim_head_bob_x")))
float get_anim_head_bob_x() { return g_anim_head_bob_x; }

__attribute__((export_name("get_anim_head_bob_y")))
float get_anim_head_bob_y() { return g_anim_head_bob_y; }

__attribute__((export_name("get_anim_arm_swing_left")))
float get_anim_arm_swing_left() { return g_anim_arm_swing_left; }

__attribute__((export_name("get_anim_arm_swing_right")))
float get_anim_arm_swing_right() { return g_anim_arm_swing_right; }

__attribute__((export_name("get_anim_leg_lift_left")))
float get_anim_leg_lift_left() { return g_anim_leg_lift_left; }

__attribute__((export_name("get_anim_leg_lift_right")))
float get_anim_leg_lift_right() { return g_anim_leg_lift_right; }

__attribute__((export_name("get_anim_torso_twist")))
float get_anim_torso_twist() { return g_anim_torso_twist; }

__attribute__((export_name("get_anim_breathing_intensity")))
float get_anim_breathing_intensity() { return g_anim_breathing_intensity; }

__attribute__((export_name("get_anim_fatigue_factor")))
float get_anim_fatigue_factor() { return g_anim_fatigue_factor; }

__attribute__((export_name("get_anim_momentum_x")))
float get_anim_momentum_x() { return g_anim_momentum_x; }

__attribute__((export_name("get_anim_momentum_y")))
float get_anim_momentum_y() { return g_anim_momentum_y; }

__attribute__((export_name("get_anim_cloth_sway")))
float get_anim_cloth_sway() { return g_anim_cloth_sway; }

__attribute__((export_name("get_anim_hair_bounce")))
float get_anim_hair_bounce() { return g_anim_hair_bounce; }

__attribute__((export_name("get_anim_equipment_jiggle")))
float get_anim_equipment_jiggle() { return g_anim_equipment_jiggle; }

__attribute__((export_name("get_anim_wind_response")))
float get_anim_wind_response() { return g_anim_wind_response; }

__attribute__((export_name("get_anim_ground_adapt")))
float get_anim_ground_adapt() { return g_anim_ground_adapt; }

__attribute__((export_name("get_anim_temperature_shiver")))
float get_anim_temperature_shiver() { return g_anim_temperature_shiver; }

__attribute__((export_name("get_y")))
float get_y() { return g_pos_y; }

// New: Velocity getters
__attribute__((export_name("get_vel_x")))
float get_vel_x() { return g_vel_x; }

__attribute__((export_name("get_vel_y")))
float get_vel_y() { return g_vel_y; }

// Stamina getters/consumers
__attribute__((export_name("get_stamina")))
float get_stamina() { return g_stamina; }

// HP getter for UI HUD (0..1)
__attribute__((export_name("get_hp")))
float get_hp() { return g_hp; }

// Get current biome
__attribute__((export_name("get_current_biome")))
unsigned int get_current_biome() { return (unsigned int)g_current_biome; }

// New export for player animation state
__attribute__((export_name("get_player_anim_state")))
unsigned int get_player_anim_state() {
    return (unsigned int)g_player_anim_state;
}

// New export for grounded state
__attribute__((export_name("get_is_grounded")))
unsigned int get_is_grounded() {
    return g_is_grounded;
}

// New export for jump count
__attribute__((export_name("get_jump_count")))
unsigned int get_jump_count() {
    return g_jump_count;
}

// New export for wall sliding state
__attribute__((export_name("get_is_wall_sliding")))
unsigned int get_is_wall_sliding() {
    return g_is_wall_sliding ? 1u : 0u;
}

// Time since current player state started (seconds)
__attribute__((export_name("get_player_state_timer")))
float get_player_state_timer() {
  if (g_player_state_start_time < 0.0f) return 0.0f;
  float dt = g_time_seconds - g_player_state_start_time;
  return dt < 0.0f ? 0.0f : dt;
}

// Current simulation clock (seconds)
__attribute__((export_name("get_time_seconds")))
float get_time_seconds() { return g_time_seconds; }

// Attack state and timings for UI
__attribute__((export_name("get_attack_state")))
unsigned int get_attack_state() { return (unsigned int)g_attack_state; }

__attribute__((export_name("get_attack_state_time")))
float get_attack_state_time() { return g_attack_state_time; }

__attribute__((export_name("get_attack_windup_sec")))
float get_attack_windup_sec() { return ATTACK_WINDUP_SEC; }

__attribute__((export_name("get_attack_active_sec")))
float get_attack_active_sec() { return ATTACK_ACTIVE_SEC; }

__attribute__((export_name("get_attack_recovery_sec")))
float get_attack_recovery_sec() { return ATTACK_RECOVERY_SEC; }

// Rolling/intangibility helpers
__attribute__((export_name("get_is_rolling")))
unsigned int get_is_rolling() { return g_is_rolling ? 1u : 0u; }

__attribute__((export_name("get_is_invulnerable")))
unsigned int get_is_invulnerable() {
  // Currently, rolling grants i-frames; extend here if other sources are added
  return g_is_rolling ? 1u : 0u;
}

// Enhanced roll state exports
__attribute__((export_name("get_roll_state")))
unsigned int get_roll_state() { return (unsigned int)g_roll_state; }

__attribute__((export_name("get_is_roll_sliding")))
unsigned int get_is_roll_sliding() { return (g_roll_state == RollState::Sliding) ? 1u : 0u; }

// Combo system exports
__attribute__((export_name("get_combo_count")))
int get_combo_count() { return g_combo_count; }

__attribute__((export_name("get_combo_window_remaining")))
float get_combo_window_remaining() { 
  return (g_time_seconds < g_combo_window_end) ? (g_combo_window_end - g_time_seconds) : 0.0f;
}

// Counter system exports
__attribute__((export_name("get_can_counter")))
int get_can_counter() { return g_can_counter; }

__attribute__((export_name("get_counter_window_remaining")))
float get_counter_window_remaining() {
  return (g_can_counter && g_time_seconds < g_counter_window_end) ? 
         (g_counter_window_end - g_time_seconds) : 0.0f;
}

// Armor system exports
__attribute__((export_name("get_has_hyperarmor")))
int get_has_hyperarmor() { return g_has_hyperarmor; }

__attribute__((export_name("get_armor_value")))
float get_armor_value() { return g_armor_value; }

__attribute__((export_name("set_armor_value")))
void set_armor_value(float value) { g_armor_value = value; }

// Environmental interaction exports
__attribute__((export_name("get_near_wall")))
int get_near_wall() { return g_near_wall; }

__attribute__((export_name("get_wall_distance")))
float get_wall_distance() { return g_wall_distance; }

__attribute__((export_name("get_near_ledge")))
int get_near_ledge() { return g_near_ledge; }

__attribute__((export_name("get_ledge_distance")))
float get_ledge_distance() { return g_ledge_distance; }

// Status effect exports
__attribute__((export_name("apply_burning")))
int apply_burning(float duration, float intensity) {
  StatusEffect effect = create_burning_effect(duration, intensity);
  return g_player_status_effects.apply_effect(effect) ? 1 : 0;
}

__attribute__((export_name("apply_stun")))
int apply_stun(float duration) {
  StatusEffect effect = create_stun_effect(duration);
  return g_player_status_effects.apply_effect(effect) ? 1 : 0;
}

__attribute__((export_name("apply_slow")))
int apply_slow(float duration, float intensity) {
  StatusEffect effect = create_slow_effect(duration, intensity);
  return g_player_status_effects.apply_effect(effect) ? 1 : 0;
}

__attribute__((export_name("apply_damage_boost")))
int apply_damage_boost(float duration, float intensity) {
  StatusEffect effect = create_damage_boost(duration, intensity);
  return g_player_status_effects.apply_effect(effect) ? 1 : 0;
}

__attribute__((export_name("get_status_effect_count")))
int get_status_effect_count() {
  return g_player_status_effects.get_active_effect_count();
}

__attribute__((export_name("has_status_effect")))
int has_status_effect(int effect_type) {
  return g_player_status_effects.has_effect((StatusEffectType)effect_type) ? 1 : 0;
}

__attribute__((export_name("remove_status_effect")))
void remove_status_effect(int effect_type) {
  g_player_status_effects.remove_effect((StatusEffectType)effect_type);
}

__attribute__((export_name("get_status_movement_modifier")))
float get_status_movement_modifier() {
  return g_player_status_effects.get_movement_modifier();
}

__attribute__((export_name("get_status_damage_modifier")))
float get_status_damage_modifier() {
  return g_player_status_effects.get_damage_modifier();
}

__attribute__((export_name("get_status_defense_modifier")))
float get_status_defense_modifier() {
  return g_player_status_effects.get_defense_modifier();
}

__attribute__((export_name("get_roll_time")))
float get_roll_time() { 
  if (g_roll_state == RollState::Idle) return 0.f;
  return g_time_seconds - g_roll_start_time;
}

// Stun system exports
__attribute__((export_name("get_is_stunned")))
unsigned int get_is_stunned() { return g_is_stunned ? 1u : 0u; }

__attribute__((export_name("get_stun_remaining")))
float get_stun_remaining() {
  if (!g_is_stunned) return 0.f;
  float remaining = g_stun_end_time - g_time_seconds;
  return remaining > 0.f ? remaining : 0.f;
}

// Apply stun to player (for enemy attacks that cause stun)
__attribute__((export_name("apply_player_stun")))
void apply_player_stun(float duration) {
  g_is_stunned = 1;
  g_stun_end_time = g_time_seconds + duration;
}

// Apply parry stun to specific enemy
__attribute__((export_name("apply_parry_stun")))
void apply_parry_stun(int enemy_index) {
  g_parry_stun_target = enemy_index;
  // Enemy stun logic would be handled in enemy system
  // For now, we just track which enemy was stunned
}

// Current movement speed cap (units per second)
__attribute__((export_name("get_speed")))
float get_speed() {
  float s = BASE_SPEED * g_speed_mult;
  if (g_is_rolling) s *= ROLL_SPEED_MULTIPLIER;
  return s;
}

// Optional: quick parry action helper (enters block with parry window)
__attribute__((export_name("on_parry")))
int on_parry() {
  // Apply block start cost if starting fresh
  if (!g_blocking) {
    if (g_stamina < STAMINA_BLOCK_START_COST) return 0;
    g_stamina -= STAMINA_BLOCK_START_COST;
    if (g_stamina < 0.f) g_stamina = 0.f;
  }
  g_blocking = 1;
  g_block_start_time = g_time_seconds;
  // Face current facing direction
  g_block_face_x = g_face_x;
  g_block_face_y = g_face_y;
  return 1;
}

// Light Attack (A1) - Fast, can combo
__attribute__((export_name("on_light_attack")))
int on_light_attack() {
  // Apply weapon speed modifier to cooldown (reduced for combos)
  float combo_modifier = (g_combo_count > 0 && g_time_seconds < g_combo_window_end) ? 0.7f : 1.0f;
  float weapon_cooldown = (ATTACK_COOLDOWN_SEC * combo_modifier) / get_weapon_speed_multiplier();
  if ((g_time_seconds - g_last_attack_time) < weapon_cooldown) { return 0; }
  
  // Apply weapon stamina cost modifier (reduced for combos)
  float stamina_modifier = (g_combo_count > 0) ? 0.8f : 1.0f;
  float weapon_stamina_cost = STAMINA_ATTACK_COST * stamina_modifier * get_weapon_stamina_cost_multiplier();
  if (g_stamina < weapon_stamina_cost) { return 0; }
  g_stamina -= weapon_stamina_cost;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_attack_time = g_time_seconds;
  
  // Update combo system
  if (g_time_seconds < g_combo_window_end && g_combo_count < MAX_COMBO_COUNT) {
    g_combo_count++;
  } else {
    g_combo_count = 1;  // Start new combo chain
  }
  g_combo_window_end = g_time_seconds + COMBO_WINDOW_DURATION;
  g_last_attack_type = AttackType::Light;
  
  // Start light attack state machine
  if (g_attack_state == AttackState::Idle || g_attack_state == AttackState::Recovery) {
    g_current_attack_type = AttackType::Light;
    g_attack_dir_x = g_face_x;
    g_attack_dir_y = g_face_y;
    normalize(g_attack_dir_x, g_attack_dir_y);
    g_attack_state = AttackState::Windup;
    g_attack_state_time = g_time_seconds;
  }
  return 1;
}

// Heavy Attack (A2) - Slower, more damage, can feint during windup
__attribute__((export_name("on_heavy_attack")))
int on_heavy_attack() {
  // Apply weapon speed modifier to cooldown (can combo from light)
  float combo_modifier = (g_combo_count > 0 && g_last_attack_type == AttackType::Light && g_time_seconds < g_combo_window_end) ? 0.8f : 1.0f;
  float weapon_cooldown = (ATTACK_COOLDOWN_SEC * combo_modifier) / get_weapon_speed_multiplier();
  if ((g_time_seconds - g_last_attack_time) < weapon_cooldown) { return 0; }
  
  // Apply weapon stamina cost modifier (heavy costs more, reduced in combos)
  float stamina_modifier = (g_combo_count > 0) ? 1.2f : 1.5f;
  float weapon_stamina_cost = STAMINA_ATTACK_COST * stamina_modifier * get_weapon_stamina_cost_multiplier();
  if (g_stamina < weapon_stamina_cost) { return 0; }
  g_stamina -= weapon_stamina_cost;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_attack_time = g_time_seconds;
  
  // Update combo system (heavy can chain from light)
  if (g_time_seconds < g_combo_window_end && g_last_attack_type == AttackType::Light && g_combo_count < MAX_COMBO_COUNT) {
    g_combo_count++;
  } else {
    g_combo_count = 1;  // Start new combo chain
  }
  g_combo_window_end = g_time_seconds + COMBO_WINDOW_DURATION;
  g_last_attack_type = AttackType::Heavy;
  
  // Start heavy attack state machine
  if (g_attack_state == AttackState::Idle || g_attack_state == AttackState::Recovery) {
    g_current_attack_type = AttackType::Heavy;
    g_attack_dir_x = g_face_x;
    g_attack_dir_y = g_face_y;
    normalize(g_attack_dir_x, g_attack_dir_y);
    g_attack_state = AttackState::Windup;
    g_attack_state_time = g_time_seconds;
    
    // Grant hyperarmor for Raider weapon during heavy attacks
    if (weapon_has_tag(WEAPON_TAG_HYPERARMOR)) {
      g_has_hyperarmor = 1;
      g_hyperarmor_end_time = g_time_seconds + HEAVY_WINDUP_SEC + HEAVY_ACTIVE_SEC;
    }
  }
  return 1;
}

// Special Attack - Hero move, unique per character
__attribute__((export_name("on_special_attack")))
int on_special_attack() {
  // Apply weapon speed modifier to cooldown (special can finish combos)
  float combo_modifier = (g_combo_count >= 3) ? 0.6f : 1.0f;  // Faster if used as combo finisher
  float weapon_cooldown = (ATTACK_COOLDOWN_SEC * 2.0f * combo_modifier) / get_weapon_speed_multiplier();
  if ((g_time_seconds - g_last_attack_time) < weapon_cooldown) { return 0; }
  
  // Apply weapon stamina cost modifier (special costs more, reduced as combo finisher)
  float stamina_modifier = (g_combo_count >= 3) ? 1.5f : 2.0f;
  float weapon_stamina_cost = STAMINA_ATTACK_COST * stamina_modifier * get_weapon_stamina_cost_multiplier();
  if (g_stamina < weapon_stamina_cost) { return 0; }
  g_stamina -= weapon_stamina_cost;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_attack_time = g_time_seconds;
  
  // Update combo system (special as combo finisher)
  if (g_time_seconds < g_combo_window_end && g_combo_count > 0) {
    g_combo_count++;  // Count the special as part of combo
    // Reset combo after special (it's a finisher)
    g_combo_window_end = g_time_seconds - 1.0f;  // End combo window
  } else {
    g_combo_count = 0;  // Special outside combo resets count
  }
  g_last_attack_type = AttackType::Special;
  
  // Start special attack state machine
  if (g_attack_state == AttackState::Idle || g_attack_state == AttackState::Recovery) {
    g_current_attack_type = AttackType::Special;
    g_attack_dir_x = g_face_x;
    g_attack_dir_y = g_face_y;
    normalize(g_attack_dir_x, g_attack_dir_y);
    g_attack_state = AttackState::Windup;
    g_attack_state_time = g_time_seconds;
  }
  return 1;
}

// Legacy attack function (for compatibility)
__attribute__((export_name("on_attack")))
int on_attack() {
  return on_light_attack(); // Default to light attack
}

// Attempt to start a roll: consumes start cost if any stamina remains. Returns 1 if applied, 0 otherwise.
__attribute__((export_name("on_roll_start")))
int on_roll_start() {
  // Can't roll if already rolling
  if (g_roll_state != RollState::Idle) { return 0; }
  
  // Enforce roll cooldown
  if ((g_time_seconds - g_last_roll_time) < ROLL_COOLDOWN_SEC) { return 0; }
  if (g_stamina < STAMINA_ROLL_START_COST) { return 0; }
  g_stamina -= STAMINA_ROLL_START_COST;
  if (g_stamina < 0.f) g_stamina = 0.f;
  g_last_roll_time = g_time_seconds;
  
  // Initialize roll state
  g_roll_state = RollState::Active;
  g_roll_start_time = g_time_seconds;
  
  // Set roll direction based on current input or facing direction
  if (g_input_x != 0.f || g_input_y != 0.f) {
    g_roll_direction_x = g_input_x;
    g_roll_direction_y = g_input_y;
    normalize(g_roll_direction_x, g_roll_direction_y);
  } else {
    // No input, roll in facing direction
    g_roll_direction_x = g_face_x;
    g_roll_direction_y = g_face_y;
  }
  
  return 1;
}

// Heavy attack feint - can cancel heavy attack during windup by blocking
__attribute__((export_name("can_feint_heavy")))
int can_feint_heavy() {
  return (g_current_attack_type == AttackType::Heavy && 
          g_attack_state == AttackState::Windup) ? 1 : 0;
}

// Set or clear blocking state and update facing direction.
// on: 0 = off, non-zero = on. When transitioning 0->1, records start time for parry window.
// Returns 1 if blocking state is active after this call, 0 if activation failed due to stamina
__attribute__((export_name("set_blocking")))
int set_blocking(int on, float faceX, float faceY) {
  // normalize facing input
  normalize(faceX, faceY);
  if (on) {
    // Heavy attack feinting - can cancel heavy attack during windup
    if (can_feint_heavy()) {
      g_attack_state = AttackState::Idle;
      g_current_attack_type = AttackType::Light; // Reset to default
    }
    
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
  // Check hyperarmor first (cannot be interrupted)
  if (g_has_hyperarmor && g_time_seconds < g_hyperarmor_end_time) {
    // Take damage but don't interrupt the attack
    return -1;
  }
  
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
      if (dt >= 0.f && dt <= PARRY_WINDOW) {
        // Perfect parry: fully restore player stamina, stun attacker, and enable counter
        g_stamina = 1.0f;
        g_can_counter = 1;
        g_counter_window_end = g_time_seconds + COUNTER_WINDOW_DURATION;
        
        // Apply 300ms stun to the attacker (this would be handled by enemy system)
        // For now, we signal that a parry stun should be applied
        apply_parry_stun(-1); // -1 means "whoever attacked us"
        
        return 2; // PERFECT PARRY (causes 300ms stun)
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
float get_parry_window() { return PARRY_WINDOW; }

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
  const float MIN_SPAWN_DISTANCE = 0.55f; // Outside player view
  const float MAX_SPAWN_DISTANCE = 0.85f;
  
  for (unsigned int i = 0; i < count; ++i) {
    int idx = enemy_alloc_slot();
    if (idx < 0) break;
    
    // Spawn wolves outside player's view in random directions
    float angle = rng_float01() * 2.f * 3.14159f;
    float spawnDist = MIN_SPAWN_DISTANCE + (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE) * rng_float01();
    float ex = clamp01(g_pos_x + cosf(angle) * spawnDist);
    float ey = clamp01(g_pos_y + sinf(angle) * spawnDist);
    enemy_activate(idx, EnemyType::Wolf, ex, ey);
    spawned += 1u;
  }
  // Refresh roles quickly; pack controller also updates each frame in update().
  update_pack_controller();
  return spawned;
}

// Wolf pack management API functions
__attribute__((export_name("get_wolf_pack_count")))
unsigned int get_wolf_pack_count() {
  // Count active packs dynamically to ensure accuracy
  unsigned int active_count = 0;
  for (int i = 0; i < MAX_WOLF_PACKS; ++i) {
    if (g_wolf_packs[i].active) {
      active_count++;
    }
  }
  return active_count;
}

__attribute__((export_name("debug_pack_system")))
unsigned int debug_pack_system() {
  // Return total number of active enemies for debugging
  unsigned int active_enemies = 0;
  for (int i = 0; i < MAX_ENEMIES; ++i) {
    if (g_enemies[i].active) active_enemies++;
  }
  return active_enemies;
}

__attribute__((export_name("debug_enemy_count_raw")))
unsigned int debug_enemy_count_raw() {
  // Return the raw g_enemy_count value
  return g_enemy_count;
}

__attribute__((export_name("get_wolf_pack_active")))
unsigned int get_wolf_pack_active(unsigned int pack_idx) {
  return (pack_idx < MAX_WOLF_PACKS && g_wolf_packs[pack_idx].active) ? 1 : 0;
}

__attribute__((export_name("get_wolf_pack_alive")))
unsigned int get_wolf_pack_alive(unsigned int pack_idx) {
  return (pack_idx < MAX_WOLF_PACKS && g_wolf_packs[pack_idx].active && g_wolf_packs[pack_idx].alive) ? 1 : 0;
}

__attribute__((export_name("get_wolf_pack_respawn_timer")))
float get_wolf_pack_respawn_timer(unsigned int pack_idx) {
  return (pack_idx < MAX_WOLF_PACKS && g_wolf_packs[pack_idx].active) ? g_wolf_packs[pack_idx].respawn_timer : -1.0f;
}

__attribute__((export_name("get_wolf_pack_member_count")))
unsigned int get_wolf_pack_member_count(unsigned int pack_idx) {
  return (pack_idx < MAX_WOLF_PACKS && g_wolf_packs[pack_idx].active) ? g_wolf_packs[pack_idx].member_count : 0;
}

// -------- Animation overlay getters (UI reads for rendering only) --------
__attribute__((export_name("get_anim_scale_x")))
float get_anim_scale_x() { return g_anim_scale_x; }

__attribute__((export_name("get_anim_scale_y")))
float get_anim_scale_y() { return g_anim_scale_y; }

__attribute__((export_name("get_anim_rotation")))
float get_anim_rotation() { return g_anim_rotation; }

__attribute__((export_name("get_anim_offset_x")))
float get_anim_offset_x() { return g_anim_offset_x; }

__attribute__((export_name("get_anim_offset_y")))
float get_anim_offset_y() { return g_anim_offset_y; }

__attribute__((export_name("get_anim_pelvis_y")))
float get_anim_pelvis_y() { return g_anim_pelvis_y; }

// -------- Wolf Animation Data Getters (UI reads for rendering only) --------
__attribute__((export_name("get_wolf_anim_count")))
unsigned int get_wolf_anim_count() { return g_enemy_count; }

__attribute__((export_name("get_wolf_anim_active")))
unsigned int get_wolf_anim_active(unsigned int idx) { return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].anim_data.active : 0u; }

__attribute__((export_name("get_wolf_anim_leg_x")))
float get_wolf_anim_leg_x(unsigned int wolf_idx, unsigned int leg_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active && leg_idx < 4) ? g_enemies[wolf_idx].anim_data.leg_x[leg_idx] : 0.f; }

__attribute__((export_name("get_wolf_anim_leg_y")))
float get_wolf_anim_leg_y(unsigned int wolf_idx, unsigned int leg_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active && leg_idx < 4) ? g_enemies[wolf_idx].anim_data.leg_y[leg_idx] : 0.f; }

__attribute__((export_name("get_wolf_anim_spine_bend")))
float get_wolf_anim_spine_bend(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.spine_bend : 0.f; }

__attribute__((export_name("get_wolf_anim_tail_angle")))
float get_wolf_anim_tail_angle(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.tail_angle : 0.f; }

__attribute__((export_name("get_wolf_anim_head_pitch")))
float get_wolf_anim_head_pitch(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.head_pitch : 0.f; }

__attribute__((export_name("get_wolf_anim_head_yaw")))
float get_wolf_anim_head_yaw(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.head_yaw : 0.f; }

__attribute__((export_name("get_wolf_anim_ear_rotation")))
float get_wolf_anim_ear_rotation(unsigned int wolf_idx, unsigned int ear_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active && ear_idx < 2) ? g_enemies[wolf_idx].anim_data.ear_rotation[ear_idx] : 0.f; }

__attribute__((export_name("get_wolf_anim_body_stretch")))
float get_wolf_anim_body_stretch(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.body_stretch : 0.f; }

__attribute__((export_name("get_wolf_anim_body_offset_y")))
float get_wolf_anim_body_offset_y(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.body_offset_y : 0.f; }

__attribute__((export_name("get_wolf_anim_fur_ruffle")))
float get_wolf_anim_fur_ruffle(unsigned int wolf_idx) { return (wolf_idx < g_enemy_count && g_enemies[wolf_idx].active) ? g_enemies[wolf_idx].anim_data.fur_ruffle : 0.f; }

// ============================================================================
// Enhanced AI System Exports
// ============================================================================

// Vocalization System
__attribute__((export_name("get_vocalization_count")))
int get_vocalization_count() { return (int)g_vocalization_count; }

__attribute__((export_name("get_vocalization_type")))
int get_vocalization_type(unsigned int idx) { 
  return (idx < g_vocalization_count) ? (int)g_vocalizations[idx].type : 0; 
}

__attribute__((export_name("get_vocalization_x")))
float get_vocalization_x(unsigned int idx) { 
  return (idx < g_vocalization_count) ? g_vocalizations[idx].x : 0.f; 
}

__attribute__((export_name("get_vocalization_y")))
float get_vocalization_y(unsigned int idx) { 
  return (idx < g_vocalization_count) ? g_vocalizations[idx].y : 0.f; 
}

__attribute__((export_name("get_vocalization_intensity")))
float get_vocalization_intensity(unsigned int idx) { 
  return (idx < g_vocalization_count) ? g_vocalizations[idx].intensity : 0.f; 
}

__attribute__((export_name("get_vocalization_wolf_index")))
int get_vocalization_wolf_index(unsigned int idx) { 
  return (idx < g_vocalization_count) ? (int)g_vocalizations[idx].wolf_index : -1; 
}

// Alpha Wolf System
__attribute__((export_name("get_alpha_wolf_index")))
int get_alpha_wolf_index() { return g_alpha_wolf.wolf_index; }

__attribute__((export_name("get_alpha_ability")))
int get_alpha_ability() { 
  return (g_alpha_wolf.wolf_index >= 0) ? (int)g_alpha_wolf.current_ability : 0; 
}

__attribute__((export_name("get_alpha_is_enraged")))
int get_alpha_is_enraged() { 
  return (g_alpha_wolf.wolf_index >= 0 && g_alpha_wolf.is_enraged) ? 1 : 0; 
}

__attribute__((export_name("get_alpha_leadership_bonus")))
float get_alpha_leadership_bonus() { 
  return (g_alpha_wolf.wolf_index >= 0) ? g_alpha_wolf.leadership_bonus : 0.f; 
}

// Territory System
__attribute__((export_name("get_territory_count")))
int get_territory_count() { return (int)g_territory_count; }

__attribute__((export_name("get_territory_x")))
float get_territory_x(unsigned int idx) { 
  return (idx < g_territory_count) ? g_territories[idx].center_x : 0.f; 
}

__attribute__((export_name("get_territory_y")))
float get_territory_y(unsigned int idx) { 
  return (idx < g_territory_count) ? g_territories[idx].center_y : 0.f; 
}

__attribute__((export_name("get_territory_radius")))
float get_territory_radius(unsigned int idx) { 
  return (idx < g_territory_count) ? g_territories[idx].radius : 0.f; 
}

__attribute__((export_name("get_territory_strength")))
float get_territory_strength(unsigned int idx) { 
  return (idx < g_territory_count) ? g_territories[idx].strength : 0.f; 
}

// Scent System
__attribute__((export_name("get_scent_strength_at")))
float get_scent_strength_at_export(float x, float y) { 
  return get_scent_strength_at(x, y); 
}

__attribute__((export_name("get_scent_marker_count")))
int get_scent_marker_count() { return (int)g_scent_marker_count; }

__attribute__((export_name("get_scent_marker_x")))
float get_scent_marker_x(unsigned int idx) { 
  return (idx < g_scent_marker_count) ? g_scent_markers[idx].x : 0.f; 
}

__attribute__((export_name("get_scent_marker_y")))
float get_scent_marker_y(unsigned int idx) { 
  return (idx < g_scent_marker_count) ? g_scent_markers[idx].y : 0.f; 
}

__attribute__((export_name("get_scent_marker_strength")))
float get_scent_marker_strength(unsigned int idx) { 
  return (idx < g_scent_marker_count) ? g_scent_markers[idx].strength : 0.f; 
}

// Enemy Emotional State
__attribute__((export_name("get_enemy_emotion")))
int get_enemy_emotion(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? (int)g_enemies[idx].emotion : 0; 
}

__attribute__((export_name("get_enemy_emotion_intensity")))
float get_enemy_emotion_intensity(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].emotionIntensity : 0.f; 
}

__attribute__((export_name("get_enemy_aggression")))
float get_enemy_aggression(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].aggression : 0.f; 
}

__attribute__((export_name("get_enemy_intelligence")))
float get_enemy_intelligence(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].intelligence : 0.f; 
}

__attribute__((export_name("get_enemy_coordination")))
float get_enemy_coordination(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].coordination : 0.f; 
}

__attribute__((export_name("get_enemy_morale")))
float get_enemy_morale(unsigned int idx) { 
  return (idx < g_enemy_count && g_enemies[idx].active) ? g_enemies[idx].morale : 0.f; 
}

// Pack Information (duplicates removed - already defined above)

__attribute__((export_name("get_pack_sync_timer")))
float get_pack_sync_timer() { return g_pack_sync_timer; }

// Adaptive AI Information
__attribute__((export_name("get_player_skill_estimate")))
float get_player_skill_estimate() { return g_player_skill_estimate; }

__attribute__((export_name("get_difficulty_wolf_speed")))
float get_difficulty_wolf_speed() { return g_difficulty.wolfSpeed; }

__attribute__((export_name("get_difficulty_wolf_aggression")))
float get_difficulty_wolf_aggression() { return g_difficulty.wolfAggression; }

__attribute__((export_name("get_difficulty_wolf_intelligence")))
float get_difficulty_wolf_intelligence() { return g_difficulty.wolfIntelligence; }

// ============================================================================
// Weapon System Exports
// ============================================================================

// Get current weapon type
__attribute__((export_name("get_current_weapon")))
int get_current_weapon() {
  return (int)g_current_weapon;
}

// Get current character type
__attribute__((export_name("get_character_type")))
int get_character_type() {
  return (int)g_character_type;
}

// Set character and weapon
__attribute__((export_name("set_character_and_weapon")))
void set_character_and_weapon(int character, int weapon) {
  if (character >= 0 && character < (int)CharacterType::Count &&
      weapon >= 0 && weapon < (int)WeaponType::Count) {
    set_character_weapon((CharacterType)character, (WeaponType)weapon);
  }
}

// Get weapon damage multiplier
__attribute__((export_name("get_weapon_damage_mult")))
float get_weapon_damage_mult() {
  return get_weapon_damage_multiplier();
}

// Get weapon speed multiplier
__attribute__((export_name("get_weapon_speed_mult")))
float get_weapon_speed_mult() {
  return get_weapon_speed_multiplier();
}

// Get weapon reach multiplier
__attribute__((export_name("get_weapon_reach_mult")))
float get_weapon_reach_mult() {
  return get_weapon_reach_multiplier();
}

// Check if weapon has specific tag
__attribute__((export_name("weapon_has_hyperarmor")))
int weapon_has_hyperarmor() {
  return weapon_has_tag(WEAPON_TAG_HYPERARMOR) ? 1 : 0;
}

__attribute__((export_name("weapon_has_flow_combo")))
int weapon_has_flow_combo() {
  return weapon_has_tag(WEAPON_TAG_FLOW_COMBO) ? 1 : 0;
}

__attribute__((export_name("weapon_has_bash_synergy")))
int weapon_has_bash_synergy() {
  return weapon_has_tag(WEAPON_TAG_BASH_SYNERGY) ? 1 : 0;
}

// ============================================================================
// Environment System Exports
// ============================================================================

// Generate environment for specific biome
__attribute__((export_name("generate_environment")))
void generate_environment(int biome_type, int seed) {
  g_world_sim.generate_environment(static_cast<BiomeType>(biome_type), static_cast<uint32_t>(seed));
}


// Get environment object count
__attribute__((export_name("get_environment_object_count")))
int get_environment_object_count() {
  return static_cast<int>(g_world_sim.environment_object_count);
}

// Get environment object data
__attribute__((export_name("get_environment_object_type")))
int get_environment_object_type(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return -1;
  return static_cast<int>(g_world_sim.environment_objects[index].type);
}

__attribute__((export_name("get_environment_object_x")))
float get_environment_object_x(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0.0f;
  return g_world_sim.environment_objects[index].position.x;
}

__attribute__((export_name("get_environment_object_y")))
float get_environment_object_y(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0.0f;
  return g_world_sim.environment_objects[index].position.y;
}

__attribute__((export_name("get_environment_object_width")))
float get_environment_object_width(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0.0f;
  return g_world_sim.environment_objects[index].size.x;
}

__attribute__((export_name("get_environment_object_height")))
float get_environment_object_height(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0.0f;
  return g_world_sim.environment_objects[index].size.y;
}

__attribute__((export_name("get_environment_object_is_interactable")))
int get_environment_object_is_interactable(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0;
  return g_world_sim.environment_objects[index].is_interactable ? 1 : 0;
}

__attribute__((export_name("get_environment_object_is_solid")))
int get_environment_object_is_solid(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0;
  return g_world_sim.environment_objects[index].is_solid ? 1 : 0;
}

__attribute__((export_name("get_environment_object_state_flags")))
int get_environment_object_state_flags(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.environment_object_count)) return 0;
  return static_cast<int>(g_world_sim.environment_objects[index].state_flags);
}

// Weather system exports
__attribute__((export_name("get_weather_rain_intensity")))
float get_weather_rain_intensity() {
  return g_world_sim.weather.rain_intensity;
}



__attribute__((export_name("get_weather_humidity")))
float get_weather_humidity() {
  return g_world_sim.weather.humidity;
}

__attribute__((export_name("is_lightning_active")))
int is_lightning_active() {
  return g_world_sim.weather.lightning_active ? 1 : 0;
}

// Terrain and physics integration exports
__attribute__((export_name("get_terrain_friction")))
float get_terrain_friction(float world_x, float world_y) {
  // Convert world coordinates to terrain grid coordinates
  int grid_x = (int)((world_x / 3840.0f) * TERRAIN_GRID_SIZE);
  int grid_y = (int)((world_y / 2160.0f) * TERRAIN_GRID_SIZE);
  
  if (grid_x < 0 || grid_x >= TERRAIN_GRID_SIZE || grid_y < 0 || grid_y >= TERRAIN_GRID_SIZE) {
    return 0.5f; // Default friction
  }
  
  float base_kf = g_world_sim.terrain[grid_x][grid_y].material.kinetic_friction;
  float rain_factor = (1.0f - g_world_sim.weather.rain_intensity * 0.3f);
  if (rain_factor < 0.1f) rain_factor = 0.1f;
  return base_kf * rain_factor;
}

__attribute__((export_name("get_terrain_temperature")))
float get_terrain_temperature(float world_x, float world_y) {
  int grid_x = (int)((world_x / 3840.0f) * TERRAIN_GRID_SIZE);
  int grid_y = (int)((world_y / 2160.0f) * TERRAIN_GRID_SIZE);
  
  if (grid_x < 0 || grid_x >= TERRAIN_GRID_SIZE || grid_y < 0 || grid_y >= TERRAIN_GRID_SIZE) {
    return 20.0f; // Default temperature
  }
  
  return g_world_sim.terrain[grid_x][grid_y].temperature;
}

__attribute__((export_name("set_terrain_elevation")))
void set_terrain_elevation(float x, float y, float elevation) {
  int grid_x = (int)(x * TERRAIN_GRID_SIZE);
  int grid_y = (int)(y * TERRAIN_GRID_SIZE);
  if (grid_x < 0 || grid_x >= TERRAIN_GRID_SIZE || grid_y < 0 || grid_y >= TERRAIN_GRID_SIZE) {
    return;
  }
  g_world_sim.terrain[grid_x][grid_y].elevation = elevation;
}


// Environmental hazards

// Hazard functions are now provided by terrain_hazards.h to avoid duplicates

__attribute__((export_name("get_hazard_intensity")))
float get_hazard_intensity(int index) {
  if (index < 0 || index >= static_cast<int>(g_world_sim.hazard_count)) return 0.0f;
  return g_world_sim.hazards[index].intensity;
}

// Check if player is in hazardous area
__attribute__((export_name("check_player_in_hazard")))
int check_player_in_hazard(float player_x, float player_y) {
  for (uint32_t i = 0; i < g_world_sim.hazard_count; i++) {
    HazardVolume& hazard = g_world_sim.hazards[i];
    float dx = player_x - hazard.position.x;
    float dy = player_y - hazard.position.y;
    float distance = sqrt(dx * dx + dy * dy);
    
    if (distance <= hazard.radius) {
      return static_cast<int>(hazard.type);
    }
  }
  return -1; // No hazard
}

// Environmental interactions
__attribute__((export_name("interact_with_environment_object")))
int interact_with_environment_object(int object_index) {
  if (object_index < 0 || object_index >= static_cast<int>(g_world_sim.environment_object_count)) {
    return 0; // Failed
  }
  
  EnvironmentObject& obj = g_world_sim.environment_objects[object_index];
  
  if (!obj.is_interactable) {
    return 0; // Not interactable
  }
  
  // Handle different interaction types
  switch (obj.type) {
    case ENV_CHEST:
      obj.state_flags |= 1; // Mark as opened
      return 1; // Success
      
    case ENV_LEVER:
      obj.state_flags ^= 2; // Toggle activated state
      return 1; // Success
      
    case ENV_DOOR:
      if ((obj.state_flags & 4) == 0) { // Not locked
        obj.state_flags ^= 1; // Toggle open/closed
        return 1; // Success
      }
      return 0; // Locked
      
    default:
      return 0; // No interaction defined
  }
}