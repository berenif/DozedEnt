// Choice scaffolding for run loop with pools, exclusions, and pity timers
#pragma once

// Choice types following the Safe/Spicy/Weird paradigm
enum class ChoiceType : unsigned char {
  Passive = 0,   // Safe: stat boosts, simple upgrades
  Active = 1,    // Spicy: new abilities, combat modifiers
  Economy = 2,   // Weird: risk/reward, currency manipulation
  Defensive = 3, // Safe variant: shields, healing
  Offensive = 4, // Spicy variant: damage, combos
  Utility = 5    // Weird variant: movement, special effects
};

// Rarity tiers
enum class ChoiceRarity : unsigned char {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Legendary = 3
};

// Choice tags for synergies and exclusions
enum ChoiceTags : unsigned int {
  TAG_STAMINA = 1 << 0,
  TAG_SPEED = 1 << 1,
  TAG_DAMAGE = 1 << 2,
  TAG_DEFENSE = 1 << 3,
  TAG_LIFESTEAL = 1 << 4,
  TAG_COOLDOWN = 1 << 5,
  TAG_AREA = 1 << 6,
  TAG_PIERCE = 1 << 7,
  TAG_BURN = 1 << 8,
  TAG_FREEZE = 1 << 9,
  TAG_LIGHTNING = 1 << 10,
  TAG_POISON = 1 << 11,
  TAG_BLEED = 1 << 12,
  TAG_KNOCKBACK = 1 << 13,
  TAG_PULL = 1 << 14,
  TAG_TELEPORT = 1 << 15
};

struct Choice {
  unsigned int id;
  unsigned char type;   // ChoiceType
  unsigned char rarity; // ChoiceRarity
  unsigned int tags;    // Bitfield of ChoiceTags
};

// Choice pool management
#define MAX_CHOICE_POOL 64
#define MAX_TAKEN_CHOICES 32

struct ChoicePool {
  Choice choices[MAX_CHOICE_POOL];
  unsigned int count;
  unsigned int takenIds[MAX_TAKEN_CHOICES];
  unsigned int takenCount;
};

static Choice g_choices[3];
static unsigned char g_choice_count = 0;
static int g_non_rare_choice_streak = 0;
static int g_total_choices_offered = 0;
static ChoicePool g_choice_pool;

// Initialize the choice pool with predefined choices
static void init_choice_pool() {
  g_choice_pool.count = 0;
  g_choice_pool.takenCount = 0;
  
  // Define base choices for each type and rarity
  // Safe choices (Passive/Defensive)
  g_choice_pool.choices[g_choice_pool.count++] = {1001, (unsigned char)ChoiceType::Passive, (unsigned char)ChoiceRarity::Common, TAG_STAMINA};
  g_choice_pool.choices[g_choice_pool.count++] = {1002, (unsigned char)ChoiceType::Passive, (unsigned char)ChoiceRarity::Common, TAG_SPEED};
  g_choice_pool.choices[g_choice_pool.count++] = {1003, (unsigned char)ChoiceType::Defensive, (unsigned char)ChoiceRarity::Common, TAG_DEFENSE};
  g_choice_pool.choices[g_choice_pool.count++] = {1004, (unsigned char)ChoiceType::Defensive, (unsigned char)ChoiceRarity::Uncommon, TAG_DEFENSE | TAG_STAMINA};
  g_choice_pool.choices[g_choice_pool.count++] = {1005, (unsigned char)ChoiceType::Passive, (unsigned char)ChoiceRarity::Rare, TAG_STAMINA | TAG_SPEED};
  
  // Spicy choices (Active/Offensive)
  g_choice_pool.choices[g_choice_pool.count++] = {2001, (unsigned char)ChoiceType::Active, (unsigned char)ChoiceRarity::Common, TAG_DAMAGE};
  g_choice_pool.choices[g_choice_pool.count++] = {2002, (unsigned char)ChoiceType::Offensive, (unsigned char)ChoiceRarity::Common, TAG_DAMAGE | TAG_KNOCKBACK};
  g_choice_pool.choices[g_choice_pool.count++] = {2003, (unsigned char)ChoiceType::Active, (unsigned char)ChoiceRarity::Uncommon, TAG_DAMAGE | TAG_AREA};
  g_choice_pool.choices[g_choice_pool.count++] = {2004, (unsigned char)ChoiceType::Offensive, (unsigned char)ChoiceRarity::Uncommon, TAG_DAMAGE | TAG_PIERCE};
  g_choice_pool.choices[g_choice_pool.count++] = {2005, (unsigned char)ChoiceType::Active, (unsigned char)ChoiceRarity::Rare, TAG_DAMAGE | TAG_BURN};
  g_choice_pool.choices[g_choice_pool.count++] = {2006, (unsigned char)ChoiceType::Offensive, (unsigned char)ChoiceRarity::Legendary, TAG_DAMAGE | TAG_AREA | TAG_BURN};
  
  // Weird choices (Economy/Utility)
  g_choice_pool.choices[g_choice_pool.count++] = {3001, (unsigned char)ChoiceType::Economy, (unsigned char)ChoiceRarity::Common, TAG_COOLDOWN};
  g_choice_pool.choices[g_choice_pool.count++] = {3002, (unsigned char)ChoiceType::Utility, (unsigned char)ChoiceRarity::Common, TAG_TELEPORT};
  g_choice_pool.choices[g_choice_pool.count++] = {3003, (unsigned char)ChoiceType::Economy, (unsigned char)ChoiceRarity::Uncommon, TAG_LIFESTEAL};
  g_choice_pool.choices[g_choice_pool.count++] = {3004, (unsigned char)ChoiceType::Utility, (unsigned char)ChoiceRarity::Uncommon, TAG_FREEZE};
  g_choice_pool.choices[g_choice_pool.count++] = {3005, (unsigned char)ChoiceType::Economy, (unsigned char)ChoiceRarity::Rare, TAG_LIFESTEAL | TAG_DAMAGE};
  g_choice_pool.choices[g_choice_pool.count++] = {3006, (unsigned char)ChoiceType::Utility, (unsigned char)ChoiceRarity::Legendary, TAG_TELEPORT | TAG_LIGHTNING};
}

// Check if a choice has been taken
static bool is_choice_taken(unsigned int id) {
  for (unsigned int i = 0; i < g_choice_pool.takenCount; ++i) {
    if (g_choice_pool.takenIds[i] == id) return true;
  }
  return false;
}

// Mark a choice as taken
static void mark_choice_taken(unsigned int id) {
  if (g_choice_pool.takenCount < MAX_TAKEN_CHOICES) {
    g_choice_pool.takenIds[g_choice_pool.takenCount++] = id;
  }
}

// Check if choices have conflicting tags (exclusion system)
static bool has_tag_conflict(unsigned int tags1, unsigned int tags2) {
  // Elemental exclusions: can't have multiple elements
  const unsigned int elementalTags = TAG_BURN | TAG_FREEZE | TAG_LIGHTNING | TAG_POISON;
  if ((tags1 & elementalTags) && (tags2 & elementalTags)) {
    // If both have elemental tags and they're different, conflict
    return (tags1 & elementalTags) != (tags2 & elementalTags);
  }
  return false;
}

// Get current player tags (from taken choices)
static unsigned int get_player_tags() {
  unsigned int tags = 0;
  for (unsigned int i = 0; i < g_choice_pool.takenCount; ++i) {
    for (unsigned int j = 0; j < g_choice_pool.count; ++j) {
      if (g_choice_pool.choices[j].id == g_choice_pool.takenIds[i]) {
        tags |= g_choice_pool.choices[j].tags;
        break;
      }
    }
  }
  return tags;
}

// Roll a choice from the pool with exclusions
static Choice roll_choice_from_pool(unsigned int slot) {
  unsigned int playerTags = get_player_tags();
  
  // Determine target type based on slot (Safe/Spicy/Weird pattern)
  ChoiceType targetType;
  if (slot == 0) {
    // Safe slot: Passive or Defensive
    targetType = (rng_u32() % 2 == 0) ? ChoiceType::Passive : ChoiceType::Defensive;
  } else if (slot == 1) {
    // Spicy slot: Active or Offensive
    targetType = (rng_u32() % 2 == 0) ? ChoiceType::Active : ChoiceType::Offensive;
  } else {
    // Weird slot: Economy or Utility
    targetType = (rng_u32() % 2 == 0) ? ChoiceType::Economy : ChoiceType::Utility;
  }
  
  // Determine rarity with weighted probabilities
  ChoiceRarity targetRarity;
  unsigned int rarityRoll = rng_u32() % 100;
  if (rarityRoll < 50) {
    targetRarity = ChoiceRarity::Common;
  } else if (rarityRoll < 80) {
    targetRarity = ChoiceRarity::Uncommon;
  } else if (rarityRoll < 95) {
    targetRarity = ChoiceRarity::Rare;
  } else {
    targetRarity = ChoiceRarity::Legendary;
  }
  
  // Collect valid choices
  Choice validChoices[MAX_CHOICE_POOL];
  unsigned int validCount = 0;
  
  for (unsigned int i = 0; i < g_choice_pool.count; ++i) {
    const Choice& c = g_choice_pool.choices[i];
    
    // Skip if already taken
    if (is_choice_taken(c.id)) continue;
    
    // Skip if wrong type
    if (c.type != (unsigned char)targetType) continue;
    
    // Skip if has tag conflicts
    if (has_tag_conflict(c.tags, playerTags)) continue;
    
    // Add to valid choices (prefer matching rarity but allow others)
    if (c.rarity == (unsigned char)targetRarity) {
      // Priority for matching rarity
      validChoices[validCount++] = c;
    } else if (validCount == 0 || rng_u32() % 3 == 0) {
      // Fallback to other rarities if needed
      validChoices[validCount++] = c;
    }
  }
  
  // If no valid choices, create a generic one
  if (validCount == 0) {
    Choice generic;
    generic.id = 9000 + rng_u32() % 1000;
    generic.type = (unsigned char)targetType;
    generic.rarity = (unsigned char)targetRarity;
    generic.tags = 1u << (rng_u32() % 8);
    return generic;
  }
  
  // Select from valid choices
  return validChoices[rng_u32() % validCount];
}

// Legacy function for compatibility
static inline Choice roll_choice(unsigned int index) {
  return roll_choice_from_pool(index);
}

// Apply pity timer with improved logic
static inline void apply_pity_timer_to_choices() {
  bool hasRare = false;
  bool hasLegendary = false;
  
  for (int i = 0; i < (int)g_choice_count; ++i) {
    if (g_choices[i].rarity >= (unsigned char)ChoiceRarity::Rare) {
      hasRare = true;
    }
    if (g_choices[i].rarity >= (unsigned char)ChoiceRarity::Legendary) {
      hasLegendary = true;
    }
  }
  
  // Pity timer for rare choices
  if (!hasRare) {
    g_non_rare_choice_streak++;
    
    // Guarantee a rare after 3 rounds without one
    if (g_non_rare_choice_streak >= 3) {
      int upgradeIdx = (int)(rng_u32() % g_choice_count);
      g_choices[upgradeIdx].rarity = (unsigned char)ChoiceRarity::Rare;
      g_non_rare_choice_streak = 0;
    }
  } else {
    g_non_rare_choice_streak = 0;
  }
  
  // Super pity: guarantee legendary after 10 total choice rounds
  if (!hasLegendary && g_total_choices_offered >= 30) {
    int upgradeIdx = (int)(rng_u32() % g_choice_count);
    g_choices[upgradeIdx].rarity = (unsigned char)ChoiceRarity::Legendary;
  }
}

// Generate choices with the new system
static void generate_choices() {
  g_choice_count = 3;
  
  // Generate one of each type (Safe/Spicy/Weird)
  for (int i = 0; i < 3; ++i) {
    g_choices[i] = roll_choice_from_pool((unsigned int)i);
  }
  
  // Apply pity timer
  apply_pity_timer_to_choices();
  
  // Track total choices offered
  g_total_choices_offered += 3;
}