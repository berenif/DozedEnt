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
  Electric_Field = 7   // Periodic shock damage in area
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
          // Continuous damage while in area
          if (g_time_seconds - h.lastTrigger >= 0.1f) {  // Apply every 0.1 seconds
            shouldTrigger = true;
            h.lastTrigger = g_time_seconds;
          }
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
  hazard_clear();
  
  // Determine number of hazards based on difficulty/progression
  int numHazards = 3 + (int)(rng_u32() % 5u);  // 3-7 hazards
  
  for (int i = 0; i < numHazards && g_hazard_count < MAX_HAZARDS; ++i) {
    Hazard& h = g_hazards[g_hazard_count];
    
    // Random hazard type
    h.type = (HazardType)(rng_u32() % 8u);
    
    // Random position (avoid player start and center)
    int attempts = 0;
    do {
      h.x = 0.1f + 0.8f * rng_float01();
      h.y = 0.1f + 0.8f * rng_float01();
      attempts++;
    } while (attempts < 20 && (
      (vec_len(h.x - g_pos_x, h.y - g_pos_y) < 0.15f) ||  // Too close to player start
      (vec_len(h.x - 0.5f, h.y - 0.5f) < 0.1f)  // Too close to center
    ));
    
    // Set hazard properties based on type
    switch (h.type) {
      case HazardType::Spike_Trap:
        h.radius = 0.025f + 0.015f * rng_float01();
        h.damage = SPIKE_TRAP_DAMAGE;
        h.cooldown = SPIKE_TRAP_COOLDOWN;
        h.duration = -1.f;  // Permanent
        break;
        
      case HazardType::Pit_Hole:
        h.radius = 0.03f + 0.02f * rng_float01();
        h.damage = PIT_HOLE_DAMAGE;
        h.cooldown = 0.f;
        h.duration = -1.f;
        break;
        
      case HazardType::Bear_Trap:
        h.radius = 0.02f + 0.01f * rng_float01();
        h.damage = BEAR_TRAP_DAMAGE;
        h.cooldown = 0.f;
        h.duration = -1.f;
        break;
        
      case HazardType::Poison_Gas:
        h.radius = 0.05f + 0.03f * rng_float01();
        h.damage = POISON_GAS_DAMAGE;
        h.cooldown = 0.1f;
        h.duration = 20.f + 10.f * rng_float01();  // 20-30 seconds
        break;
        
      case HazardType::Fire_Trap:
        h.radius = 0.04f + 0.02f * rng_float01();
        h.damage = FIRE_TRAP_DAMAGE;
        h.cooldown = 0.1f;
        h.duration = 15.f + 10.f * rng_float01();  // 15-25 seconds
        break;
        
      case HazardType::Ice_Patch:
        h.radius = 0.045f + 0.025f * rng_float01();
        h.damage = 0.f;  // No direct damage
        h.cooldown = 0.f;
        h.duration = -1.f;
        break;
        
      case HazardType::Spike_Wall:
        h.radius = 0.015f + 0.01f * rng_float01();
        h.damage = SPIKE_TRAP_DAMAGE * 1.5f;  // More damage
        h.cooldown = 0.5f;
        h.duration = -1.f;
        // Position near walls
        if (rng_u32() % 2) {
          h.x = (rng_u32() % 2) ? 0.05f : 0.95f;  // Left or right edge
        } else {
          h.y = (rng_u32() % 2) ? 0.05f : 0.95f;  // Top or bottom edge
        }
        break;
        
      case HazardType::Electric_Field:
        h.radius = 0.06f + 0.02f * rng_float01();
        h.damage = ELECTRIC_FIELD_DAMAGE;
        h.cooldown = 1.5f;
        h.duration = -1.f;
        break;
    }
    
    // Initialize state
    h.active = (rng_float01() > 0.3f);  // 70% start active
    h.triggered = false;
    h.lastTrigger = -1000.f;
    h.activateTime = h.active ? 0.f : (5.f + 10.f * rng_float01());  // Delayed activation
    
    // Check for overlap with obstacles
    bool overlaps = false;
    for (int j = 0; j < (int)g_obstacle_count; ++j) {
      float dx = h.x - g_obstacles_x[j];
      float dy = h.y - g_obstacles_y[j];
      float minDist = h.radius + g_obstacles_r[j] + 0.02f;
      if (dx * dx + dy * dy < minDist * minDist) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      g_hazard_count++;
    } else {
      i--;  // Retry this hazard
    }
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