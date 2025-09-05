// Risk phase: push your luck mechanics with curses, elite flags, and timed events
#pragma once

// Risk event types
enum class RiskEventType : unsigned char {
  Curse = 0,       // Negative modifier that persists
  Elite = 1,       // Spawn elite enemy
  TimedChallenge = 2, // Complete objective within time limit
  Gamble = 3,      // Risk resources for rewards
  Trap = 4         // Environmental hazard
};

// Curse types
enum class CurseType : unsigned char {
  Weakness = 0,    // Reduced damage
  Fragility = 1,   // Reduced defense
  Exhaustion = 2,  // Reduced stamina regen
  Slowness = 3,    // Reduced movement speed
  Blindness = 4    // Reduced vision/awareness
};

struct RiskEvent {
  RiskEventType type;
  float startTime;
  float duration;
  float intensity;  // 0.0 to 1.0
  unsigned int data; // Type-specific data (e.g., curse type)
};

struct ActiveCurse {
  CurseType type;
  float intensity;
  float remainingDuration;
  bool isPermanent;
};

#define MAX_RISK_EVENTS 8
#define MAX_ACTIVE_CURSES 4

static RiskEvent g_risk_events[MAX_RISK_EVENTS];
static unsigned char g_risk_event_count = 0;
static ActiveCurse g_active_curses[MAX_ACTIVE_CURSES];
static unsigned char g_curse_count = 0;
static float g_risk_multiplier = 1.0f; // Increases rewards but also danger
static bool g_elite_active = false;
static float g_timed_challenge_end = -1.0f;
static unsigned int g_timed_challenge_target = 0;
static unsigned int g_timed_challenge_progress = 0;

// Initialize risk phase
static void init_risk_phase() {
  g_risk_event_count = 0;
  g_curse_count = 0;
  g_risk_multiplier = 1.0f;
  g_elite_active = false;
  g_timed_challenge_end = -1.0f;
  g_timed_challenge_target = 0;
  g_timed_challenge_progress = 0;
}

// Generate a risk event based on current state
static RiskEvent generate_risk_event() {
  RiskEvent event;
  
  // Weighted random selection
  unsigned int roll = rng_u32() % 100;
  
  if (roll < 30) {
    // Curse event
    event.type = RiskEventType::Curse;
    event.data = rng_u32() % 5; // Random curse type
    event.intensity = 0.3f + (rng_float01() * 0.4f);
    event.duration = 30.0f + (rng_float01() * 30.0f);
  } else if (roll < 50) {
    // Elite spawn
    event.type = RiskEventType::Elite;
    event.intensity = 0.5f + (rng_float01() * 0.5f);
    event.duration = 0.0f; // Instant
  } else if (roll < 70) {
    // Timed challenge
    event.type = RiskEventType::TimedChallenge;
    event.duration = 15.0f + (rng_float01() * 15.0f);
    event.data = 3 + (rng_u32() % 5); // Target kills/objectives
    event.intensity = 0.6f;
  } else if (roll < 90) {
    // Gamble
    event.type = RiskEventType::Gamble;
    event.intensity = 0.5f; // Risk level
    event.duration = 5.0f; // Decision time
  } else {
    // Trap
    event.type = RiskEventType::Trap;
    event.intensity = 0.4f + (rng_float01() * 0.4f);
    event.duration = 10.0f;
  }
  
  event.startTime = g_time_seconds;
  return event;
}

// Apply a curse to the player
static void apply_curse(CurseType type, float intensity, float duration, bool permanent = false) {
  if (g_curse_count >= MAX_ACTIVE_CURSES) {
    // Replace the weakest non-permanent curse
    int weakestIdx = -1;
    float weakestIntensity = 1.0f;
    for (int i = 0; i < MAX_ACTIVE_CURSES; ++i) {
      if (!g_active_curses[i].isPermanent && g_active_curses[i].intensity < weakestIntensity) {
        weakestIdx = i;
        weakestIntensity = g_active_curses[i].intensity;
      }
    }
    if (weakestIdx >= 0) {
      g_active_curses[weakestIdx].type = type;
      g_active_curses[weakestIdx].intensity = intensity;
      g_active_curses[weakestIdx].remainingDuration = duration;
      g_active_curses[weakestIdx].isPermanent = permanent;
    }
  } else {
    g_active_curses[g_curse_count].type = type;
    g_active_curses[g_curse_count].intensity = intensity;
    g_active_curses[g_curse_count].remainingDuration = duration;
    g_active_curses[g_curse_count].isPermanent = permanent;
    g_curse_count++;
  }
}

// Update risk events and curses
static void update_risk_phase(float dt) {
  // Update active curses
  for (int i = 0; i < g_curse_count; ++i) {
    if (!g_active_curses[i].isPermanent) {
      g_active_curses[i].remainingDuration -= dt;
      if (g_active_curses[i].remainingDuration <= 0.0f) {
        // Remove expired curse
        for (int j = i; j < g_curse_count - 1; ++j) {
          g_active_curses[j] = g_active_curses[j + 1];
        }
        g_curse_count--;
        i--;
      }
    }
  }
  
  // Update timed challenge
  if (g_timed_challenge_end > 0.0f && g_time_seconds > g_timed_challenge_end) {
    // Failed timed challenge - apply penalty
    apply_curse(CurseType::Weakness, 0.5f, 60.0f);
    g_timed_challenge_end = -1.0f;
    g_timed_challenge_target = 0;
    g_timed_challenge_progress = 0;
  }
  
  // Process risk events
  for (int i = 0; i < g_risk_event_count; ++i) {
    RiskEvent& event = g_risk_events[i];
    float elapsed = g_time_seconds - event.startTime;
    
    if (elapsed > event.duration && event.duration > 0.0f) {
      // Event expired, remove it
      for (int j = i; j < g_risk_event_count - 1; ++j) {
        g_risk_events[j] = g_risk_events[j + 1];
      }
      g_risk_event_count--;
      i--;
    }
  }
}

// Trigger a risk event
static void trigger_risk_event() {
  if (g_risk_event_count >= MAX_RISK_EVENTS) return;
  
  RiskEvent event = generate_risk_event();
  
  switch (event.type) {
    case RiskEventType::Curse:
      apply_curse((CurseType)event.data, event.intensity, event.duration);
      break;
      
    case RiskEventType::Elite:
      g_elite_active = true;
      // Spawn logic will check this flag
      break;
      
    case RiskEventType::TimedChallenge:
      g_timed_challenge_end = g_time_seconds + event.duration;
      g_timed_challenge_target = event.data;
      g_timed_challenge_progress = 0;
      break;
      
    case RiskEventType::Gamble:
      // Reduce stamina but increase risk multiplier
      g_stamina *= (1.0f - event.intensity * 0.5f);
      g_risk_multiplier += event.intensity;
      break;
      
    case RiskEventType::Trap:
      // Create danger zones
      for (int i = 0; i < 3; ++i) {
        if (g_danger_count < MAX_DANGER_ZONES) {
          g_dangers[g_danger_count].x = rng_float01();
          g_dangers[g_danger_count].y = rng_float01();
          g_dangers[g_danger_count].radius = 0.1f + event.intensity * 0.1f;
          g_dangers[g_danger_count].strength = event.intensity;
          g_dangers[g_danger_count].expiresAt = g_time_seconds + event.duration;
          g_danger_count++;
        }
      }
      break;
  }
  
  g_risk_events[g_risk_event_count++] = event;
}

// Get curse modifier for a specific stat
static float get_curse_modifier(CurseType type) {
  float modifier = 1.0f;
  for (int i = 0; i < g_curse_count; ++i) {
    if (g_active_curses[i].type == type) {
      modifier *= (1.0f - g_active_curses[i].intensity * 0.5f);
    }
  }
  return modifier;
}

// Check if should enter risk phase
static bool should_enter_risk_phase() {
  // Enter risk phase after certain conditions
  // For example: after 3 choice rounds, or after defeating certain enemies
  return (g_total_choices_offered >= 9 && rng_float01() < 0.3f);
}

// Get escape hatch cost (stamina or health)
static float get_risk_escape_cost() {
  return 0.3f + (g_risk_multiplier - 1.0f) * 0.2f;
}

// Attempt to escape risk phase
static bool attempt_risk_escape() {
  float cost = get_risk_escape_cost();
  if (g_stamina >= cost) {
    g_stamina -= cost;
    // Clear non-permanent curses
    int newCount = 0;
    for (int i = 0; i < g_curse_count; ++i) {
      if (g_active_curses[i].isPermanent) {
        if (i != newCount) {
          g_active_curses[newCount] = g_active_curses[i];
        }
        newCount++;
      }
    }
    g_curse_count = newCount;
    
    // Reset risk state
    g_risk_event_count = 0;
    g_risk_multiplier = 1.0f;
    g_elite_active = false;
    g_timed_challenge_end = -1.0f;
    
    return true;
  }
  return false;
}