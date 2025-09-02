// Escalate phase: density, modifiers, and miniboss interrupts
#pragma once

#include <cmath>

// Escalation types
enum class EscalationType : unsigned char {
  Density = 0,       // More enemies spawn
  Modifiers = 1,     // Enemies get buffs
  MiniBoss = 2,      // Spawn miniboss
  Frenzy = 3,        // All enemies attack faster
  Swarm = 4          // Coordinated enemy attacks
};

// Enemy modifier types
enum class EnemyModifier : unsigned char {
  Armored = 0,       // Takes less damage
  Swift = 1,         // Moves faster
  Regenerating = 2,  // Heals over time
  Explosive = 3,     // Damages on death
  Venomous = 4       // Attacks apply poison
};

struct EscalationEvent {
  EscalationType type;
  float intensity;      // 0.0 to 1.0
  float startTime;
  float duration;
  unsigned int data;    // Type-specific data
};

struct MiniBoss {
  float x, y;
  float health;
  float maxHealth;
  float speed;
  float damage;
  float attackCooldown;
  float lastAttackTime;
  bool isActive;
  unsigned int modifiers; // Bit flags for modifiers
};

#define MAX_ESCALATION_EVENTS 6
#define MAX_ENEMY_MODIFIERS 3

static EscalationEvent g_escalation_events[MAX_ESCALATION_EVENTS];
static unsigned char g_escalation_count = 0;
static float g_escalation_level = 0.0f; // 0.0 to 1.0, increases over time
static MiniBoss g_miniboss;
static float g_spawn_rate_multiplier = 1.0f;
static float g_enemy_speed_multiplier = 1.0f;
static float g_enemy_damage_multiplier = 1.0f;
static unsigned int g_global_enemy_modifiers = 0;

// Initialize escalation phase
static void init_escalation_phase() {
  g_escalation_count = 0;
  g_escalation_level = 0.0f;
  g_spawn_rate_multiplier = 1.0f;
  g_enemy_speed_multiplier = 1.0f;
  g_enemy_damage_multiplier = 1.0f;
  g_global_enemy_modifiers = 0;
  g_miniboss.isActive = false;
}

// Generate escalation event based on current level
static EscalationEvent generate_escalation_event() {
  EscalationEvent event;
  
  // Higher escalation level = more dangerous events
  unsigned int roll = rng_u32() % 100;
  float levelBonus = g_escalation_level * 30.0f;
  
  if (roll + levelBonus < 25) {
    // Density increase
    event.type = EscalationType::Density;
    event.intensity = 0.3f + g_escalation_level * 0.4f;
    event.duration = 20.0f + rng_float01() * 20.0f;
  } else if (roll + levelBonus < 45) {
    // Enemy modifiers
    event.type = EscalationType::Modifiers;
    event.data = rng_u32() % 5; // Random modifier type
    event.intensity = 0.4f + g_escalation_level * 0.3f;
    event.duration = 30.0f;
  } else if (roll + levelBonus < 60) {
    // MiniBoss spawn
    event.type = EscalationType::MiniBoss;
    event.intensity = 0.5f + g_escalation_level * 0.5f;
    event.duration = 0.0f; // Instant
  } else if (roll + levelBonus < 80) {
    // Frenzy mode
    event.type = EscalationType::Frenzy;
    event.intensity = 0.4f + g_escalation_level * 0.4f;
    event.duration = 15.0f;
  } else {
    // Swarm attack
    event.type = EscalationType::Swarm;
    event.intensity = 0.5f + g_escalation_level * 0.3f;
    event.duration = 10.0f;
  }
  
  event.startTime = g_time_seconds;
  return event;
}

// Spawn a miniboss
static void spawn_miniboss(float intensity) {
  if (g_miniboss.isActive) return; // Already have one
  
  g_miniboss.x = 0.2f + rng_float01() * 0.6f;
  g_miniboss.y = 0.2f + rng_float01() * 0.6f;
  g_miniboss.maxHealth = 50.0f + intensity * 50.0f;
  g_miniboss.health = g_miniboss.maxHealth;
  g_miniboss.speed = 0.15f + intensity * 0.1f;
  g_miniboss.damage = 20.0f + intensity * 20.0f;
  g_miniboss.attackCooldown = 2.0f - intensity * 0.5f;
  g_miniboss.lastAttackTime = g_time_seconds;
  g_miniboss.isActive = true;
  
  // Add random modifiers based on intensity
  g_miniboss.modifiers = 0;
  if (intensity > 0.3f && rng_float01() < 0.5f) {
    g_miniboss.modifiers |= (1 << (unsigned int)EnemyModifier::Armored);
  }
  if (intensity > 0.5f && rng_float01() < 0.4f) {
    g_miniboss.modifiers |= (1 << (unsigned int)EnemyModifier::Swift);
  }
  if (intensity > 0.7f && rng_float01() < 0.3f) {
    g_miniboss.modifiers |= (1 << (unsigned int)EnemyModifier::Regenerating);
  }
}

// Update miniboss
static void update_miniboss(float dt) {
  if (!g_miniboss.isActive) return;
  
  // Regeneration
  if (g_miniboss.modifiers & (1 << (unsigned int)EnemyModifier::Regenerating)) {
    g_miniboss.health = fminf(g_miniboss.maxHealth, g_miniboss.health + dt * 2.0f);
  }
  
  // Movement towards player
  float dx = g_pos_x - g_miniboss.x;
  float dy = g_pos_y - g_miniboss.y;
  float dist = sqrtf(dx * dx + dy * dy);
  
  if (dist > 0.01f) {
    float speed = g_miniboss.speed;
    if (g_miniboss.modifiers & (1 << (unsigned int)EnemyModifier::Swift)) {
      speed *= 1.5f;
    }
    
    g_miniboss.x += (dx / dist) * speed * dt;
    g_miniboss.y += (dy / dist) * speed * dt;
  }
  
  // Attack if in range
  if (dist < 0.1f && g_time_seconds - g_miniboss.lastAttackTime > g_miniboss.attackCooldown) {
    // Deal damage to player
    float damage = g_miniboss.damage;
    if (g_miniboss.modifiers & (1 << (unsigned int)EnemyModifier::Venomous)) {
      // Apply poison effect
      apply_curse(CurseType::Weakness, 0.3f, 10.0f);
    }
    
    // Apply damage (this would need to be integrated with main health system)
    g_stamina = fmaxf(0.0f, g_stamina - damage * 0.01f);
    g_miniboss.lastAttackTime = g_time_seconds;
  }
  
  // Check if defeated
  if (g_miniboss.health <= 0.0f) {
    g_miniboss.isActive = false;
    
    // Explosive modifier damages player on death
    if (g_miniboss.modifiers & (1 << (unsigned int)EnemyModifier::Explosive)) {
      if (dist < 0.2f) {
        g_stamina = fmaxf(0.0f, g_stamina - 0.2f);
      }
    }
    
    // Grant reward for defeating miniboss
    g_escalation_level = fmaxf(0.0f, g_escalation_level - 0.2f);
  }
}

// Update escalation phase
static void update_escalation_phase(float dt) {
  // Gradually increase escalation level
  g_escalation_level = fminf(1.0f, g_escalation_level + dt * 0.01f);
  
  // Update miniboss
  update_miniboss(dt);
  
  // Process escalation events
  for (int i = 0; i < g_escalation_count; ++i) {
    EscalationEvent& event = g_escalation_events[i];
    float elapsed = g_time_seconds - event.startTime;
    
    if (elapsed > event.duration && event.duration > 0.0f) {
      // Event expired, remove it
      for (int j = i; j < g_escalation_count - 1; ++j) {
        g_escalation_events[j] = g_escalation_events[j + 1];
      }
      g_escalation_count--;
      i--;
      
      // Remove event effects
      switch (event.type) {
        case EscalationType::Density:
          g_spawn_rate_multiplier = fmaxf(1.0f, g_spawn_rate_multiplier - event.intensity);
          break;
        case EscalationType::Modifiers:
          g_global_enemy_modifiers &= ~(1 << event.data);
          break;
        case EscalationType::Frenzy:
          g_enemy_speed_multiplier = fmaxf(1.0f, g_enemy_speed_multiplier - event.intensity * 0.5f);
          break;
        default:
          break;
      }
    }
  }
}

// Trigger escalation event
static void trigger_escalation_event() {
  if (g_escalation_count >= MAX_ESCALATION_EVENTS) return;
  
  EscalationEvent event = generate_escalation_event();
  
  switch (event.type) {
    case EscalationType::Density:
      g_spawn_rate_multiplier += event.intensity;
      break;
      
    case EscalationType::Modifiers:
      g_global_enemy_modifiers |= (1 << event.data);
      g_enemy_damage_multiplier += event.intensity * 0.3f;
      break;
      
    case EscalationType::MiniBoss:
      spawn_miniboss(event.intensity);
      break;
      
    case EscalationType::Frenzy:
      g_enemy_speed_multiplier += event.intensity * 0.5f;
      break;
      
    case EscalationType::Swarm:
      // Spawn wave of enemies - this will be handled by the main game loop
      // by checking g_spawn_rate_multiplier
      g_spawn_rate_multiplier += event.intensity * 2.0f;
      break;
  }
  
  g_escalation_events[g_escalation_count++] = event;
}

// Check if should enter escalation phase
static bool should_enter_escalation_phase() {
  // Enter after completing risk phase or after many choices
  return (g_total_choices_offered >= 15 && rng_float01() < 0.4f);
}

// Get escalation modifiers for enemy stats
__attribute__((export_name("get_enemy_speed_modifier")))
float get_enemy_speed_modifier() {
  return g_enemy_speed_multiplier;
}

__attribute__((export_name("get_enemy_damage_modifier")))
float get_enemy_damage_modifier() {
  return g_enemy_damage_multiplier;
}

__attribute__((export_name("get_spawn_rate_modifier")))
float get_spawn_rate_modifier() {
  return g_spawn_rate_multiplier;
}

// Export functions for miniboss
__attribute__((export_name("get_miniboss_active")))
int get_miniboss_active() {
  return g_miniboss.isActive ? 1 : 0;
}

__attribute__((export_name("get_miniboss_x")))
float get_miniboss_x() {
  return g_miniboss.x;
}

__attribute__((export_name("get_miniboss_y")))
float get_miniboss_y() {
  return g_miniboss.y;
}

__attribute__((export_name("get_miniboss_health")))
float get_miniboss_health() {
  return g_miniboss.health / g_miniboss.maxHealth;
}

__attribute__((export_name("damage_miniboss")))
void damage_miniboss(float damage) {
  if (!g_miniboss.isActive) return;
  
  float actualDamage = damage;
  if (g_miniboss.modifiers & (1 << (unsigned int)EnemyModifier::Armored)) {
    actualDamage *= 0.5f; // Armored takes half damage
  }
  
  g_miniboss.health -= actualDamage;
}