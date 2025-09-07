// Weapon system for character-specific weapons
// Follows WASM-first architecture principles
#pragma once

#include "internal_core.h"

// Weapon types for each character
enum class WeaponType : unsigned char {
  // Warden weapons - balanced and versatile
  WardenLongsword = 0,    // Default balanced weapon with shoulder bash synergy
  
  // Raider weapons - aggressive and momentum-based  
  RaiderGreataxe = 1,     // High damage, hyperarmor synergy
  
  // Kensei weapons - flow and reach focused
  KenseiKatana = 2,       // Flow combos, extended reach
  
  // Generic/starting weapon
  BasicSword = 3,         // Default weapon before character selection
  
  Count = 4
};

// Character types matching the PLAYER_CHARACTERS.md specification
enum class CharacterType : unsigned char {
  Warden = 0,   // Balanced Pressure
  Raider = 1,   // Momentum Bully  
  Kensei = 2,   // Flow and Reach
  None = 3,     // No character selected
  Count = 4     // Total count for array sizing
};

// Weapon stats structure
struct WeaponStats {
  float damage_multiplier;      // Multiplier for base damage
  float speed_multiplier;       // Attack speed modifier
  float stamina_cost_mult;      // Stamina cost modifier
  float reach_multiplier;       // Attack range modifier
  float crit_chance_bonus;      // Additional crit chance
  unsigned int special_tags;    // Special weapon properties (bit flags)
};

// Special weapon properties (bit flags)
#define WEAPON_TAG_HYPERARMOR     (1 << 0)  // Grants hyperarmor on heavy attacks
#define WEAPON_TAG_FLOW_COMBO     (1 << 1)  // Enables flow combo system
#define WEAPON_TAG_BASH_SYNERGY   (1 << 2)  // Synergizes with shoulder bash
#define WEAPON_TAG_MOMENTUM       (1 << 3)  // Builds momentum on hits
#define WEAPON_TAG_EXTENDED_REACH (1 << 4)  // Extended attack range
#define WEAPON_TAG_FAST_RECOVERY  (1 << 5)  // Faster recovery frames

// Global weapon state
static WeaponType g_current_weapon = WeaponType::BasicSword;
static CharacterType g_character_type = CharacterType::None;
static WeaponStats g_weapon_stats;

// Weapon definitions
static const WeaponStats WEAPON_STATS[(int)WeaponType::Count] = {
  // Warden Longsword - Balanced with bash synergy
  {
    .damage_multiplier = 1.0f,
    .speed_multiplier = 1.0f, 
    .stamina_cost_mult = 1.0f,
    .reach_multiplier = 1.0f,
    .crit_chance_bonus = 0.05f,
    .special_tags = WEAPON_TAG_BASH_SYNERGY | WEAPON_TAG_FAST_RECOVERY
  },
  
  // Raider Greataxe - High damage, hyperarmor
  {
    .damage_multiplier = 1.4f,
    .speed_multiplier = 0.8f,
    .stamina_cost_mult = 1.3f,
    .reach_multiplier = 1.1f,
    .crit_chance_bonus = 0.1f,
    .special_tags = WEAPON_TAG_HYPERARMOR | WEAPON_TAG_MOMENTUM
  },
  
  // Kensei Katana - Flow and reach
  {
    .damage_multiplier = 1.1f,
    .speed_multiplier = 1.2f,
    .stamina_cost_mult = 0.9f,
    .reach_multiplier = 1.3f,
    .crit_chance_bonus = 0.08f,
    .special_tags = WEAPON_TAG_FLOW_COMBO | WEAPON_TAG_EXTENDED_REACH
  },
  
  // Basic Sword - Default weapon
  {
    .damage_multiplier = 1.0f,
    .speed_multiplier = 1.0f,
    .stamina_cost_mult = 1.0f,
    .reach_multiplier = 1.0f,
    .crit_chance_bonus = 0.0f,
    .special_tags = 0
  }
};

// Character-weapon mapping
static const WeaponType CHARACTER_DEFAULT_WEAPONS[(int)CharacterType::Count] = {
  WeaponType::WardenLongsword,  // Warden
  WeaponType::RaiderGreataxe,   // Raider
  WeaponType::KenseiKatana,     // Kensei
  WeaponType::BasicSword        // None/Default
};

// Function declarations
static void init_weapon_system();
static void set_character_weapon(CharacterType character, WeaponType weapon);
static void apply_weapon_stats();
static bool weapon_has_tag(unsigned int tag);
static float get_weapon_damage_multiplier();
static float get_weapon_speed_multiplier();
static float get_weapon_stamina_cost_multiplier();
static float get_weapon_reach_multiplier();
static float get_weapon_crit_bonus();

// Initialize weapon system
static void init_weapon_system() {
  g_current_weapon = WeaponType::BasicSword;
  g_character_type = CharacterType::None;
  g_weapon_stats = WEAPON_STATS[(int)WeaponType::BasicSword];
}

// Set character and their default weapon
static void set_character_weapon(CharacterType character, WeaponType weapon) {
  g_character_type = character;
  g_current_weapon = weapon;
  
  // Apply weapon stats
  if ((int)weapon < (int)WeaponType::Count) {
    g_weapon_stats = WEAPON_STATS[(int)weapon];
    apply_weapon_stats();
  }
}

// Apply weapon stats to global combat multipliers
static void apply_weapon_stats() {
  // Update global combat multipliers based on weapon stats
  g_attack_damage_mult *= g_weapon_stats.damage_multiplier;
  g_crit_chance += g_weapon_stats.crit_chance_bonus;
  
  // Weapon-specific stamina costs will be applied in attack functions
  // Speed multipliers will be applied to attack timing constants
}

// Check if current weapon has a specific tag
static bool weapon_has_tag(unsigned int tag) {
  return (g_weapon_stats.special_tags & tag) != 0;
}

// Getter functions for weapon stats
static float get_weapon_damage_multiplier() {
  return g_weapon_stats.damage_multiplier;
}

static float get_weapon_speed_multiplier() {
  return g_weapon_stats.speed_multiplier;
}

static float get_weapon_stamina_cost_multiplier() {
  return g_weapon_stats.stamina_cost_mult;
}

static float get_weapon_reach_multiplier() {
  return g_weapon_stats.reach_multiplier;
}

static float get_weapon_crit_bonus() {
  return g_weapon_stats.crit_chance_bonus;
}

// Get character's default weapon
static WeaponType get_character_default_weapon(CharacterType character) {
  if ((int)character < (int)CharacterType::Count) {
    return CHARACTER_DEFAULT_WEAPONS[(int)character];
  }
  return WeaponType::BasicSword;
}

// Weapon-specific combat modifiers
static void apply_weapon_combat_modifiers(AttackType attack_type) {
  // Warden Longsword - Bash synergy
  if (g_current_weapon == WeaponType::WardenLongsword) {
    if (weapon_has_tag(WEAPON_TAG_BASH_SYNERGY)) {
      // Reduce recovery time after successful hits to enable bash follow-ups
      if (attack_type == AttackType::Light || attack_type == AttackType::Heavy) {
        // This would be applied in the combat system
      }
    }
  }
  
  // Raider Greataxe - Hyperarmor and momentum
  if (g_current_weapon == WeaponType::RaiderGreataxe) {
    if (weapon_has_tag(WEAPON_TAG_HYPERARMOR) && attack_type == AttackType::Heavy) {
      // Grant hyperarmor during heavy attack active frames
      // This would be implemented in the combat system
    }
  }
  
  // Kensei Katana - Flow combos
  if (g_current_weapon == WeaponType::KenseiKatana) {
    if (weapon_has_tag(WEAPON_TAG_FLOW_COMBO)) {
      // Enable flow combo system with extended timing windows
      // This would be implemented in the combo system
    }
  }
}
