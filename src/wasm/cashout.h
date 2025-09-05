// CashOut phase: shops, forge, heal mechanics with two-currency system
#pragma once

#include <cmath>

// Additional tags for shop items
#define TAG_CRIT (1 << 16)
#define TAG_BLOCK (1 << 17)
#define TAG_INSTANT (1 << 18)
#define TAG_HEAL (1 << 19)
#define TAG_PERMANENT (1 << 20)
#define TAG_RANDOM (1 << 21)
#define TAG_SPECIAL (1 << 22)

// Currency types
enum class CurrencyType : unsigned char {
  Gold = 0,     // Primary currency from enemies
  Essence = 1   // Special currency from challenges
};

// Shop item types
enum class ShopItemType : unsigned char {
  Weapon = 0,       // Damage upgrades
  Armor = 1,        // Defense upgrades
  Consumable = 2,   // One-time use items
  Blessing = 3,     // Permanent buffs
  Mystery = 4       // Random powerful item
};

// Forge upgrade types
enum class ForgeUpgrade : unsigned char {
  Sharpen = 0,      // Increase damage
  Reinforce = 1,    // Increase defense
  Enchant = 2,      // Add special effect
  Reroll = 3        // Change item properties
};

struct ShopItem {
  ShopItemType type;
  unsigned int id;
  float goldCost;
  float essenceCost;
  float power;      // Item strength/quality
  unsigned int tags;
  bool purchased;
};

struct ForgeOption {
  ForgeUpgrade type;
  float goldCost;
  float essenceCost;
  float successChance;
  bool available;
};

#define MAX_SHOP_ITEMS 6
#define MAX_FORGE_OPTIONS 4

static float g_gold = 100.0f;
static float g_essence = 10.0f;
static ShopItem g_shop_items[MAX_SHOP_ITEMS];
static unsigned char g_shop_item_count = 0;
static ForgeOption g_forge_options[MAX_FORGE_OPTIONS];
static unsigned char g_forge_option_count = 0;
static float g_heal_gold_cost = 50.0f;
static float g_heal_essence_cost = 5.0f;
static float g_reroll_cost = 20.0f;
static unsigned int g_shop_rerolls = 0;

// Forward declarations
static void generate_shop_items();
static void generate_forge_options();
static unsigned int generate_item_tags(ShopItemType type);
static void apply_shop_item_effect(const ShopItem& item);
static void apply_forge_upgrade(ForgeUpgrade type);

// Initialize cashout phase
static void init_cashout_phase() {
  g_shop_item_count = 0;
  g_forge_option_count = 0;
  g_shop_rerolls = 0;
  
  // Generate shop items
  generate_shop_items();
  
  // Generate forge options
  generate_forge_options();
}

// Generate shop items based on current game state
static void generate_shop_items() {
  g_shop_item_count = 3 + (rng_u32() % 3); // 3-5 items
  
  for (int i = 0; i < g_shop_item_count; ++i) {
    ShopItem& item = g_shop_items[i];
    
    // Weighted random selection
    unsigned int roll = rng_u32() % 100;
    
    if (roll < 30) {
      item.type = ShopItemType::Weapon;
      item.power = 0.3f + rng_float01() * 0.4f;
      item.goldCost = 50.0f + item.power * 100.0f;
      item.essenceCost = 0.0f;
    } else if (roll < 55) {
      item.type = ShopItemType::Armor;
      item.power = 0.3f + rng_float01() * 0.4f;
      item.goldCost = 40.0f + item.power * 80.0f;
      item.essenceCost = 0.0f;
    } else if (roll < 75) {
      item.type = ShopItemType::Consumable;
      item.power = 0.5f + rng_float01() * 0.3f;
      item.goldCost = 20.0f + item.power * 30.0f;
      item.essenceCost = 0.0f;
    } else if (roll < 90) {
      item.type = ShopItemType::Blessing;
      item.power = 0.6f + rng_float01() * 0.4f;
      item.goldCost = 80.0f + item.power * 120.0f;
      item.essenceCost = 5.0f + item.power * 10.0f;
    } else {
      item.type = ShopItemType::Mystery;
      item.power = 0.7f + rng_float01() * 0.3f;
      item.goldCost = 100.0f;
      item.essenceCost = 10.0f;
    }
    
    item.id = rng_u32();
    item.tags = generate_item_tags(item.type);
    item.purchased = false;
    
    // Apply shop reroll discount
    if (g_shop_rerolls > 0) {
      item.goldCost *= (1.0f - fminf(0.3f, g_shop_rerolls * 0.05f));
    }
  }
}

// Generate forge options
static void generate_forge_options() {
  g_forge_option_count = MAX_FORGE_OPTIONS;
  
  // Sharpen - always available
  g_forge_options[0].type = ForgeUpgrade::Sharpen;
  g_forge_options[0].goldCost = 30.0f;
  g_forge_options[0].essenceCost = 0.0f;
  g_forge_options[0].successChance = 0.8f;
  g_forge_options[0].available = true;
  
  // Reinforce - always available
  g_forge_options[1].type = ForgeUpgrade::Reinforce;
  g_forge_options[1].goldCost = 25.0f;
  g_forge_options[1].essenceCost = 0.0f;
  g_forge_options[1].successChance = 0.85f;
  g_forge_options[1].available = true;
  
  // Enchant - requires essence
  g_forge_options[2].type = ForgeUpgrade::Enchant;
  g_forge_options[2].goldCost = 50.0f;
  g_forge_options[2].essenceCost = 8.0f;
  g_forge_options[2].successChance = 0.7f;
  g_forge_options[2].available = (g_essence >= 8.0f);
  
  // Reroll - risky but potentially powerful
  g_forge_options[3].type = ForgeUpgrade::Reroll;
  g_forge_options[3].goldCost = 40.0f;
  g_forge_options[3].essenceCost = 5.0f;
  g_forge_options[3].successChance = 0.6f;
  g_forge_options[3].available = true;
}

// Generate item tags based on type
static unsigned int generate_item_tags(ShopItemType type) {
  unsigned int tags = 0;
  
  switch (type) {
    case ShopItemType::Weapon:
      tags |= TAG_DAMAGE;
      if (rng_float01() < 0.3f) tags |= TAG_CRIT;
      break;
    case ShopItemType::Armor:
      tags |= TAG_DEFENSE;
      if (rng_float01() < 0.3f) tags |= TAG_BLOCK;
      break;
    case ShopItemType::Consumable:
      tags |= TAG_INSTANT;
      if (rng_float01() < 0.5f) tags |= TAG_HEAL;
      break;
    case ShopItemType::Blessing:
      tags |= TAG_PERMANENT;
      if (rng_float01() < 0.4f) tags |= TAG_STAMINA;
      break;
    case ShopItemType::Mystery:
      tags |= TAG_RANDOM;
      // Add multiple random tags
      if (rng_float01() < 0.5f) tags |= TAG_DAMAGE;
      if (rng_float01() < 0.5f) tags |= TAG_DEFENSE;
      if (rng_float01() < 0.3f) tags |= TAG_SPECIAL;
      break;
  }
  
  return tags;
}

// Purchase shop item
static bool purchase_shop_item(unsigned int index) {
  if (index >= g_shop_item_count) return false;
  
  ShopItem& item = g_shop_items[index];
  if (item.purchased) return false;
  
  if (g_gold >= item.goldCost && g_essence >= item.essenceCost) {
    g_gold -= item.goldCost;
    g_essence -= item.essenceCost;
    item.purchased = true;
    
    // Apply item effects
    apply_shop_item_effect(item);
    
    return true;
  }
  
  return false;
}

// Apply shop item effect
static void apply_shop_item_effect(const ShopItem& item) {
  switch (item.type) {
    case ShopItemType::Weapon:
      g_attack_damage_mult += item.power * 0.3f;
      break;
    case ShopItemType::Armor:
      g_defense_mult += item.power * 0.25f;
      break;
    case ShopItemType::Consumable:
      // Immediate effect
      if (item.tags & TAG_HEAL) {
        g_stamina = fminf(1.0f, g_stamina + item.power);
      }
      break;
    case ShopItemType::Blessing:
      // Permanent buff
      g_max_stamina += item.power * 0.2f;
      g_stamina_regen_mult += item.power * 0.15f;
      break;
    case ShopItemType::Mystery:
      // Random powerful effect
      float roll = rng_float01();
      if (roll < 0.33f) {
        g_attack_damage_mult += item.power * 0.5f;
      } else if (roll < 0.66f) {
        g_defense_mult += item.power * 0.4f;
      } else {
        g_max_stamina += item.power * 0.3f;
        g_stamina = g_max_stamina;
      }
      break;
  }
}

// Use forge
static bool use_forge(unsigned int option_index) {
  if (option_index >= g_forge_option_count) return false;
  
  ForgeOption& option = g_forge_options[option_index];
  if (!option.available) return false;
  
  if (g_gold >= option.goldCost && g_essence >= option.essenceCost) {
    g_gold -= option.goldCost;
    g_essence -= option.essenceCost;
    
    // Roll for success
    if (rng_float01() < option.successChance) {
      apply_forge_upgrade(option.type);
      return true;
    } else {
      // Forge failed - minor penalty
      g_stamina *= 0.9f;
    }
  }
  
  return false;
}

// Apply forge upgrade
static void apply_forge_upgrade(ForgeUpgrade type) {
  switch (type) {
    case ForgeUpgrade::Sharpen:
      g_attack_damage_mult += 0.15f;
      break;
    case ForgeUpgrade::Reinforce:
      g_defense_mult += 0.12f;
      break;
    case ForgeUpgrade::Enchant:
      // Add special effect
      g_attack_damage_mult += 0.1f;
      g_defense_mult += 0.1f;
      g_stamina_regen_mult += 0.2f;
      break;
    case ForgeUpgrade::Reroll:
      // Randomize stats
      float oldTotal = g_attack_damage_mult + g_defense_mult;
      g_attack_damage_mult = 1.0f + rng_float01() * oldTotal * 0.6f;
      g_defense_mult = 1.0f + rng_float01() * oldTotal * 0.6f;
      break;
  }
}

// Purchase heal
static bool purchase_heal() {
  if (g_gold >= g_heal_gold_cost && g_essence >= g_heal_essence_cost) {
    g_gold -= g_heal_gold_cost;
    g_essence -= g_heal_essence_cost;
    
    // Full heal
    g_stamina = g_max_stamina;
    
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
    
    // Increase heal cost for next time
    g_heal_gold_cost *= 1.5f;
    g_heal_essence_cost *= 1.3f;
    
    return true;
  }
  
  return false;
}

// Reroll shop
static bool reroll_shop() {
  if (g_gold >= g_reroll_cost) {
    g_gold -= g_reroll_cost;
    g_shop_rerolls++;
    g_reroll_cost *= 1.5f; // Increase cost for next reroll
    
    generate_shop_items();
    return true;
  }
  
  return false;
}

// Check if should enter cashout phase
static bool should_enter_cashout_phase() {
  // Enter after escalation or after accumulating enough currency
  return (g_gold >= 150.0f || g_essence >= 15.0f) && rng_float01() < 0.4f;
}

// Export functions for UI
__attribute__((export_name("get_gold")))
float get_gold() {
  return g_gold;
}

__attribute__((export_name("get_essence")))
float get_essence() {
  return g_essence;
}

__attribute__((export_name("get_shop_item_count")))
unsigned int get_shop_item_count() {
  return g_shop_item_count;
}

__attribute__((export_name("get_shop_item_type")))
unsigned int get_shop_item_type(unsigned int index) {
  return (index < g_shop_item_count) ? (unsigned int)g_shop_items[index].type : 0;
}

__attribute__((export_name("get_shop_item_cost_gold")))
float get_shop_item_cost_gold(unsigned int index) {
  return (index < g_shop_item_count) ? g_shop_items[index].goldCost : 0.0f;
}

__attribute__((export_name("get_shop_item_cost_essence")))
float get_shop_item_cost_essence(unsigned int index) {
  return (index < g_shop_item_count) ? g_shop_items[index].essenceCost : 0.0f;
}

__attribute__((export_name("buy_shop_item")))
int buy_shop_item(unsigned int index) {
  return purchase_shop_item(index) ? 1 : 0;
}

__attribute__((export_name("buy_heal")))
int buy_heal() {
  return purchase_heal() ? 1 : 0;
}

__attribute__((export_name("reroll_shop")))
int reroll_shop_items() {
  return reroll_shop() ? 1 : 0;
}

__attribute__((export_name("use_forge_option")))
int use_forge_option(unsigned int index) {
  return use_forge(index) ? 1 : 0;
}

// Add currency (called when defeating enemies or completing challenges)
static void add_gold(float amount) {
  g_gold += amount * g_risk_multiplier; // Risk multiplier affects rewards
}

static void add_essence(float amount) {
  g_essence += amount;
}