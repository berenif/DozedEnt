// Hostile terrain mechanics: traps, holes, and other environmental hazards
#pragma once

#include "internal_core.h"
#include <math.h>

// Hazard types
enum class HazardType : unsigned char {
  Spike_Trap = 0,      // Periodic damage when stepped on
  Pit_Hole = 1,        // Fall damage and temporary immobilization
  Bear_Trap = 2,       // Snare that immobilizes and damages
  Poison_Gas = 3,      // Area effect damage over time
  Fire_Trap = 4,       // Burning damage over time
  Ice_Patch = 5,       // Slippery surface, loss of control
  Spike_Wall = 6,      // Wall-mounted spikes that extend periodically
  Electric_Field = 7,  // Periodic shock damage in area
  // Biome-specific hazards
  Foliage = 8,         // Dense vegetation, concealment
  Mud = 9,             // Slowing mud pits
  Water = 10,          // Slow-moving water
  Quicksand = 11,      // Trapping quicksand
  Ice = 12,            // Ice patches (alias for Ice_Patch for biome consistency)
  Rockfall = 13,       // Falling rocks
  TallGrass = 14,      // Concealing tall grass
  Wind = 15            // Strong wind effects
};

// Hazard state
struct Hazard {
  HazardType type;
  float x, y;           // Position in normalized space
  float radius;         // Effect radius
  float damage;         // Damage per activation
  float cooldown;       // Time between activations
  float lastTrigger;    // Last trigger time
  bool active;          // Is hazard currently active
  bool triggered;       // Has been triggered by player/enemy
  float duration;       // How long effect lasts (-1 for permanent)
  float activateTime;   // When hazard becomes active
};

// Maximum number of hazards
#define MAX_HAZARDS 24
static unsigned char g_hazard_count = 0;
static Hazard g_hazards[MAX_HAZARDS];

// Player hazard interaction state
static float g_last_hazard_damage_time = -1000.f;
static int g_player_trapped = 0;  // Is player caught in a trap
static float g_trap_release_time = -1000.f;  // When player escapes trap
static float g_player_slow_until = -1000.f;  // Ice patch effect
static float g_player_burn_until = -1000.f;  // Fire effect
static float g_player_poison_until = -1000.f;  // Poison effect

// Hazard configuration
static const float SPIKE_TRAP_DAMAGE = 0.15f;     // 15% HP per hit
static const float PIT_HOLE_DAMAGE = 0.25f;       // 25% HP fall damage
static const float BEAR_TRAP_DAMAGE = 0.20f;      // 20% HP initial damage
static const float POISON_GAS_DAMAGE = 0.05f;     // 5% HP per second
static const float FIRE_TRAP_DAMAGE = 0.08f;      // 8% HP per second
static const float ELECTRIC_FIELD_DAMAGE = 0.12f; // 12% HP per shock

static const float SPIKE_TRAP_COOLDOWN = 2.0f;    // Spikes retract/extend every 2 seconds
static const float BEAR_TRAP_HOLD_TIME = 3.0f;    // Hold player for 3 seconds
static const float PIT_HOLE_STUN_TIME = 2.0f;     // Stun for 2 seconds after fall
static const float ICE_PATCH_DURATION = 1.5f;     // Slip effect lasts 1.5 seconds
static const float FIRE_TRAP_DURATION = 3.0f;     // Burn for 3 seconds
static const float POISON_GAS_DURATION = 5.0f;    // Poison for 5 seconds

// Add a hazard to the world
static inline void add_hazard(float x, float y, float radius, HazardType type, float damage, float cooldown) {
  if (g_hazard_count >= MAX_HAZARDS) return;
  
  Hazard& h = g_hazards[g_hazard_count];
  h.type = type;
  h.x = clamp01(x);
  h.y = clamp01(y);
  h.radius = radius;
  h.damage = damage;
  h.cooldown = cooldown;
  h.lastTrigger = -1000.f;
  h.active = true;
  h.triggered = false;
  h.duration = -1.f; // Permanent by default
  h.activateTime = 0.f; // Active immediately
  
  g_hazard_count++;
}

// Clear all hazards
static inline void hazard_clear() { 
  g_hazard_count = 0;
  g_player_trapped = 0;
  g_trap_release_time = -1000.f;
  g_player_slow_until = -1000.f;
  g_player_burn_until = -1000.f;
  g_player_poison_until = -1000.f;
}

// Check if position overlaps with any hazard
static inline int hazard_check_overlap(float px, float py, float pRadius) {
  for (int i = 0; i < (int)g_hazard_count; ++i) {
    if (!g_hazards[i].active) continue;
    
    float dx = px - g_hazards[i].x;
    float dy = py - g_hazards[i].y;
    float totalRadius = pRadius + g_hazards[i].radius;
    
    if (dx * dx + dy * dy < totalRadius * totalRadius) {
      return i;  // Return hazard index
    }
  }
  return -1;  // No overlap
}

// Apply damage to player from hazard
static inline void apply_hazard_damage(float damage, HazardType type) {
  // Apply damage to player HP
  g_hp -= damage;
  if (g_hp < 0.f) g_hp = 0.f;
  
  // Sync with save system health
  g_health = (int)(g_hp * g_max_health);
  
  g_last_hazard_damage_time = g_time_seconds;
  
  // Apply status effects based on hazard type
  switch (type) {
    case HazardType::Fire_Trap:
      g_player_burn_until = g_time_seconds + FIRE_TRAP_DURATION;
      break;
    case HazardType::Poison_Gas:
      g_player_poison_until = g_time_seconds + POISON_GAS_DURATION;
      break;
    case HazardType::Ice_Patch:
      g_player_slow_until = g_time_seconds + ICE_PATCH_DURATION;
      break;
    default:
      break;
  }
}

// Update hazard states and check for player interaction
static inline void update_hazards(float dt) {
  // Update status effects
  if (g_time_seconds < g_player_burn_until) {
    apply_hazard_damage(FIRE_TRAP_DAMAGE * dt, HazardType::Fire_Trap);
  }
  
  if (g_time_seconds < g_player_poison_until) {
    apply_hazard_damage(POISON_GAS_DAMAGE * dt, HazardType::Poison_Gas);
  }
  
  // Check if player escapes trap
  if (g_player_trapped && g_time_seconds >= g_trap_release_time) {
    g_player_trapped = 0;
  }
  
  // Check each hazard
  for (int i = 0; i < (int)g_hazard_count; ++i) {
    Hazard& h = g_hazards[i];
    
    // Skip inactive hazards
    if (!h.active) {
      if (g_time_seconds >= h.activateTime) {
        h.active = true;
      } else {
        continue;
      }
    }
    
    // Check if player is in hazard area
    float dx = g_pos_x - h.x;
    float dy = g_pos_y - h.y;
    float dist2 = dx * dx + dy * dy;
    float radius2 = h.radius * h.radius;
    
    if (dist2 < radius2) {
      // Player is in hazard area
      bool shouldTrigger = false;
      
      switch (h.type) {
        case HazardType::Spike_Trap:
          // Periodic activation
          if (g_time_seconds - h.lastTrigger >= h.cooldown) {
            shouldTrigger = true;
            h.lastTrigger = g_time_seconds;
          }
          break;
          
        case HazardType::Pit_Hole:
          // One-time trigger
          if (!h.triggered && !g_is_rolling) {
            shouldTrigger = true;
            h.triggered = true;
            g_player_trapped = 1;
            g_trap_release_time = g_time_seconds + PIT_HOLE_STUN_TIME;
          }
          break;
          
        case HazardType::Bear_Trap:
          // One-time trigger with hold
          if (!h.triggered && !g_is_rolling) {
            shouldTrigger = true;
            h.triggered = true;
            g_player_trapped = 1;
            g_trap_release_time = g_time_seconds + BEAR_TRAP_HOLD_TIME;
          }
          break;
          
        case HazardType::Poison_Gas:
        case HazardType::Fire_Trap:
          // Continuous damage while in area (damage per second scaled by dt)
          apply_hazard_damage(h.damage * dt, h.type);
          break;
          
        case HazardType::Ice_Patch:
          // Apply slow effect
          if (!g_is_rolling) {
            g_player_slow_until = g_time_seconds + 0.5f;  // Refresh slow
          }
          break;
          
        case HazardType::Spike_Wall:
          // Periodic extension
          {
            float cycle = g_time_seconds - floorf(g_time_seconds / 3.0f) * 3.0f;  // 3 second cycle
            if (cycle < 1.5f && g_time_seconds - h.lastTrigger >= 0.5f) {
              shouldTrigger = true;
              h.lastTrigger = g_time_seconds;
            }
          }
          break;
          
        case HazardType::Electric_Field:
          // Periodic shocks
          if (g_time_seconds - h.lastTrigger >= 1.5f) {
            shouldTrigger = true;
            h.lastTrigger = g_time_seconds;
          }
          break;
          
        // Biome-specific hazards
        case HazardType::Foliage:
        case HazardType::TallGrass:
          // Concealment hazards - no damage, just visual effect
          break;
          
        case HazardType::Mud:
          // Slowing effect
          if (!g_is_rolling) {
            g_player_slow_until = g_time_seconds + 0.5f;
          }
          break;
          
        case HazardType::Water:
          // Slight slowing
          if (!g_is_rolling) {
            g_player_slow_until = g_time_seconds + 0.3f;
          }
          break;
          
        case HazardType::Quicksand:
          // Trapping hazard
          if (!h.triggered && !g_is_rolling) {
            shouldTrigger = true;
            h.triggered = true;
            g_player_trapped = 1;
            g_trap_release_time = g_time_seconds + 4.0f; // Longer than bear trap
          }
          break;
          
        case HazardType::Ice:
          // Same as Ice_Patch
          if (!g_is_rolling) {
            g_player_slow_until = g_time_seconds + 0.5f;
          }
          break;
          
        case HazardType::Rockfall:
          // Periodic falling rocks
          if (g_time_seconds - h.lastTrigger >= 2.0f) {
            shouldTrigger = true;
            h.lastTrigger = g_time_seconds;
          }
          break;
          
        case HazardType::Wind:
          // Wind effect - pushes player
          // Could add wind force here in the future
          break;
      }
      
      // Apply damage if triggered
      if (shouldTrigger && !g_is_rolling) {  // Rolling gives i-frames
        apply_hazard_damage(h.damage, h.type);
      }
    }
  }
}

// Generate hazards for the level
static void generate_hazards() {
  // Clear existing hazards
  g_hazard_count = 0;
  // Generate hazards based on the current biome
  switch (g_current_biome) {
    case BiomeType::Forest:
      // Forest: more dense foliage, mud pits
      for (int i = 0; i < 5; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.05f + rng_float01() * 0.05f, HazardType::Foliage, 0.2f, 5.0f);
      }
      for (int i = 0; i < 2; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.08f + rng_float01() * 0.07f, HazardType::Mud, 0.4f, 10.0f);
      }
      break;
    case BiomeType::Swamp:
      // Swamp: slow-moving water, quicksand, poisonous gas pockets
      for (int i = 0; i < 4; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.1f + rng_float01() * 0.1f, HazardType::Water, 0.6f, 8.0f);
      }
      for (int i = 0; i < 2; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.07f + rng_float01() * 0.06f, HazardType::Quicksand, 0.7f, 12.0f);
      }
      for (int i = 0; i < 2; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.04f + rng_float01() * 0.04f, HazardType::Poison_Gas, 0.3f, 7.0f);
      }
      break;
    case BiomeType::Mountains:
      // Mountains: slippery ice patches, rockfalls
      for (int i = 0; i < 3; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.06f + rng_float01() * 0.06f, HazardType::Ice, 0.8f, 6.0f);
      }
      for (int i = 0; i < 2; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.09f + rng_float01() * 0.08f, HazardType::Rockfall, 0.5f, 9.0f);
      }
      break;
    case BiomeType::Plains:
      // Plains: tall grass (concealment), occasional strong winds
      for (int i = 0; i < 6; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.05f + rng_float01() * 0.05f, HazardType::TallGrass, 0.1f, 4.0f);
      }
      if (rng_float01() < 0.3f) { // 30% chance of strong winds
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.15f + rng_float01() * 0.1f, HazardType::Wind, 0.7f, 15.0f);
      }
      break;
    default:
      // Default: basic hazards
      for (int i = 0; i < 3; ++i) {
        add_hazard(0.1f + 0.8f * rng_float01(), 0.1f + 0.8f * rng_float01(), 0.05f + rng_float01() * 0.05f, HazardType::Foliage, 0.2f, 5.0f);
      }
      break;
  }
}

// Check if enemy should avoid hazard
static inline int enemy_should_avoid_hazard(float ex, float ey, float eRadius) {
  for (int i = 0; i < (int)g_hazard_count; ++i) {
    if (!g_hazards[i].active) continue;
    
    // Enemies avoid most hazards except ice patches
    if (g_hazards[i].type == HazardType::Ice_Patch) continue;
    
    float dx = ex - g_hazards[i].x;
    float dy = ey - g_hazards[i].y;
    float avoidRadius = g_hazards[i].radius + eRadius + 0.03f;  // Extra margin
    
    if (dx * dx + dy * dy < avoidRadius * avoidRadius) {
      return 1;
    }
  }
  return 0;
}

// Get movement speed modifier from hazards
static inline float get_hazard_speed_modifier() {
  float modifier = 1.0f;
  
  // Ice patch slow
  if (g_time_seconds < g_player_slow_until) {
    modifier *= 0.3f;  // 70% slower on ice
  }
  
  // Trapped (bear trap or pit)
  if (g_player_trapped) {
    modifier = 0.0f;  // Can't move
  }
  
  return modifier;
}

// Export functions for WASM interface
extern "C" {

__attribute__((export_name("get_hazard_count")))
unsigned int get_hazard_count() { 
  return (unsigned int)g_hazard_count; 
}

__attribute__((export_name("get_hazard_x")))
float get_hazard_x(unsigned int idx) { 
  return (idx < g_hazard_count) ? g_hazards[idx].x : 0.f; 
}

__attribute__((export_name("get_hazard_y")))
float get_hazard_y(unsigned int idx) { 
  return (idx < g_hazard_count) ? g_hazards[idx].y : 0.f; 
}

__attribute__((export_name("get_hazard_radius")))
float get_hazard_radius(unsigned int idx) { 
  return (idx < g_hazard_count) ? g_hazards[idx].radius : 0.f; 
}

__attribute__((export_name("get_hazard_type")))
unsigned int get_hazard_type(unsigned int idx) { 
  return (idx < g_hazard_count) ? (unsigned int)g_hazards[idx].type : 0; 
}

__attribute__((export_name("get_hazard_active")))
int get_hazard_active(unsigned int idx) { 
  return (idx < g_hazard_count) ? (g_hazards[idx].active ? 1 : 0) : 0; 
}

__attribute__((export_name("is_player_trapped")))
int is_player_trapped() { 
  return g_player_trapped; 
}

__attribute__((export_name("is_player_burning")))
int is_player_burning() { 
  return (g_time_seconds < g_player_burn_until) ? 1 : 0; 
}

__attribute__((export_name("is_player_poisoned")))
int is_player_poisoned() { 
  return (g_time_seconds < g_player_poison_until) ? 1 : 0; 
}

__attribute__((export_name("is_player_slowed")))
int is_player_slowed() { 
  return (g_time_seconds < g_player_slow_until) ? 1 : 0; 
}

}  // extern "C"