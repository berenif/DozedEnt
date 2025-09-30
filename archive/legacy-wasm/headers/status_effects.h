#pragma once

// Enhanced Status Effect System for Combat
// This system provides comprehensive status effects including DoT, control effects, and buffs/debuffs

enum class StatusEffectType : unsigned char {
    // Damage over time
    BURNING = 0,        // Fire damage over time
    BLEEDING = 1,       // Physical damage over time
    POISONED = 2,       // Poison damage + reduced healing
    FROZEN = 3,         // Ice damage + slowed movement
    SHOCKED = 4,        // Electric damage + mini-stuns
    
    // Control effects
    STUNNED = 5,        // Cannot act
    ROOTED = 6,         // Cannot move but can attack
    SLOWED = 7,         // Reduced movement speed
    SILENCED = 8,       // Cannot use special abilities
    BLINDED = 9,        // Reduced accuracy
    
    // Combat states
    HITSTUN = 10,       // Brief stun from being hit
    BLOCKSTUN = 11,     // Recovery from blocking
    KNOCKBACK = 12,     // Being pushed back
    KNOCKDOWN = 13,     // On the ground
    
    // Buffs
    DAMAGE_BOOST = 14,  // Increased damage output
    SPEED_BOOST = 15,   // Increased movement speed
    ARMOR_BOOST = 16,   // Damage reduction
    LIFESTEAL = 17,     // Heal on damage dealt
    BERSERK = 18,       // Damage up, defense down
    
    // Debuffs
    WEAKENED = 19,      // Reduced damage output
    VULNERABLE = 20,    // Increased damage taken
    EXHAUSTED = 21,     // Reduced stamina regen
    CURSED = 22,        // Various negative effects
    
    MAX_EFFECT_TYPE
};

struct StatusEffect {
    StatusEffectType type;
    float duration;           // Remaining time in seconds
    float intensity;          // Effect strength (0.0 to 1.0)
    float tick_rate;          // How often effect applies (for DoT)
    float last_tick_time;     // When effect last applied
    unsigned int stacks;      // How many instances are active
    unsigned int max_stacks;  // Maximum stacks allowed
    bool can_stack;           // Whether multiple instances combine
    unsigned int source_id;   // Who applied this effect
    
    StatusEffect() : 
        type(StatusEffectType::BURNING),
        duration(0.0f),
        intensity(0.0f),
        tick_rate(0.5f),  // Default tick every 0.5 seconds
        last_tick_time(0.0f),
        stacks(1),
        max_stacks(1),
        can_stack(false),
        source_id(0) {}
    
    bool is_expired() const {
        return duration <= 0.0f;
    }
    
    bool should_tick(float current_time) const {
        return (current_time - last_tick_time) >= tick_rate;
    }
    
    float get_damage_per_tick() const {
        switch (type) {
            case StatusEffectType::BURNING:
                return intensity * 0.05f;  // 5% HP per tick at max intensity
            case StatusEffectType::BLEEDING:
                return intensity * 0.03f;  // 3% HP per tick
            case StatusEffectType::POISONED:
                return intensity * 0.02f;  // 2% HP per tick
            case StatusEffectType::FROZEN:
                return intensity * 0.01f;  // 1% HP per tick
            case StatusEffectType::SHOCKED:
                return intensity * 0.04f;  // 4% HP per tick
            default:
                return 0.0f;
        }
    }
    
    float get_movement_modifier() const {
        switch (type) {
            case StatusEffectType::FROZEN:
                return 1.0f - (intensity * 0.5f);  // Up to 50% slow
            case StatusEffectType::SLOWED:
                return 1.0f - (intensity * 0.4f);  // Up to 40% slow
            case StatusEffectType::ROOTED:
                return 0.0f;  // No movement
            case StatusEffectType::SPEED_BOOST:
                return 1.0f + (intensity * 0.3f);  // Up to 30% faster
            case StatusEffectType::EXHAUSTED:
                return 1.0f - (intensity * 0.2f);  // Up to 20% slow
            default:
                return 1.0f;
        }
    }
    
    float get_damage_modifier() const {
        switch (type) {
            case StatusEffectType::DAMAGE_BOOST:
                return 1.0f + (intensity * 0.25f);  // Up to 25% more damage
            case StatusEffectType::WEAKENED:
                return 1.0f - (intensity * 0.3f);   // Up to 30% less damage
            case StatusEffectType::BERSERK:
                return 1.0f + (intensity * 0.5f);   // Up to 50% more damage
            default:
                return 1.0f;
        }
    }
    
    float get_defense_modifier() const {
        switch (type) {
            case StatusEffectType::ARMOR_BOOST:
                return 1.0f - (intensity * 0.3f);   // Up to 30% damage reduction
            case StatusEffectType::VULNERABLE:
                return 1.0f + (intensity * 0.25f);  // Up to 25% more damage taken
            case StatusEffectType::BERSERK:
                return 1.0f + (intensity * 0.3f);   // Up to 30% more damage taken
            default:
                return 1.0f;
        }
    }
};

// Maximum active status effects per entity
const int MAX_STATUS_EFFECTS = 16;

// Status effect manager for a single entity
class StatusEffectManager {
private:
    StatusEffect effects[MAX_STATUS_EFFECTS];
    int effect_count;
    float total_movement_modifier;
    float total_damage_modifier;
    float total_defense_modifier;
    
public:
    StatusEffectManager() : 
        effect_count(0),
        total_movement_modifier(1.0f),
        total_damage_modifier(1.0f),
        total_defense_modifier(1.0f) {}
    
    void update(float dt, float current_time) {
        // Reset modifiers
        total_movement_modifier = 1.0f;
        total_damage_modifier = 1.0f;
        total_defense_modifier = 1.0f;
        
        // Update all effects
        for (int i = 0; i < effect_count; i++) {
            StatusEffect& effect = effects[i];
            
            // Update duration
            effect.duration -= dt;
            
            // Apply modifiers
            total_movement_modifier *= effect.get_movement_modifier();
            total_damage_modifier *= effect.get_damage_modifier();
            total_defense_modifier *= effect.get_defense_modifier();
            
            // Check for tick effects
            if (effect.should_tick(current_time)) {
                effect.last_tick_time = current_time;
                // Damage would be applied here
            }
        }
        
        // Remove expired effects
        int write_index = 0;
        for (int i = 0; i < effect_count; i++) {
            if (!effects[i].is_expired()) {
                if (write_index != i) {
                    effects[write_index] = effects[i];
                }
                write_index++;
            }
        }
        effect_count = write_index;
    }
    
    bool apply_effect(const StatusEffect& new_effect) {
        // Check if effect already exists
        for (int i = 0; i < effect_count; i++) {
            if (effects[i].type == new_effect.type) {
                if (effects[i].can_stack && effects[i].stacks < effects[i].max_stacks) {
                    // Stack the effect
                    effects[i].stacks++;
                    effects[i].intensity = (effects[i].intensity + new_effect.intensity > 1.0f) ? 
                                          1.0f : effects[i].intensity + new_effect.intensity;
                    effects[i].duration = (effects[i].duration > new_effect.duration) ? 
                                        effects[i].duration : new_effect.duration;
                } else {
                    // Refresh duration and intensity
                    effects[i].duration = new_effect.duration;
                    effects[i].intensity = (effects[i].intensity > new_effect.intensity) ? 
                                         effects[i].intensity : new_effect.intensity;
                }
                return true;
            }
        }
        
        // Add new effect if space available
        if (effect_count < MAX_STATUS_EFFECTS) {
            effects[effect_count] = new_effect;
            effect_count++;
            return true;
        }
        
        return false;  // No space for new effect
    }
    
    void remove_effect(StatusEffectType type) {
        int write_index = 0;
        for (int i = 0; i < effect_count; i++) {
            if (effects[i].type != type) {
                if (write_index != i) {
                    effects[write_index] = effects[i];
                }
                write_index++;
            }
        }
        effect_count = write_index;
    }
    
    bool has_effect(StatusEffectType type) const {
        for (int i = 0; i < effect_count; i++) {
            if (effects[i].type == type) {
                return true;
            }
        }
        return false;
    }
    
    float get_effect_intensity(StatusEffectType type) const {
        for (int i = 0; i < effect_count; i++) {
            if (effects[i].type == type) {
                return effects[i].intensity;
            }
        }
        return 0.0f;
    }
    
    // Check control effects
    bool is_stunned() const {
        return has_effect(StatusEffectType::STUNNED) || 
               has_effect(StatusEffectType::HITSTUN) ||
               has_effect(StatusEffectType::KNOCKDOWN);
    }
    
    bool is_rooted() const {
        return has_effect(StatusEffectType::ROOTED);
    }
    
    bool is_silenced() const {
        return has_effect(StatusEffectType::SILENCED);
    }
    
    // Get total modifiers
    float get_movement_modifier() const { return total_movement_modifier; }
    float get_damage_modifier() const { return total_damage_modifier; }
    float get_defense_modifier() const { return total_defense_modifier; }
    
    // Get effect count for UI
    int get_active_effect_count() const { return effect_count; }
    
    // Get effect at index for UI
    const StatusEffect* get_effect_at(int index) const {
        if (index >= 0 && index < effect_count) {
            return &effects[index];
        }
        return nullptr;
    }
};

// Global player status effect manager
static StatusEffectManager g_player_status_effects;

// Helper functions to create common status effects
inline StatusEffect create_burning_effect(float duration, float intensity) {
    StatusEffect effect;
    effect.type = StatusEffectType::BURNING;
    effect.duration = duration;
    effect.intensity = intensity;
    effect.tick_rate = 0.5f;  // Tick every 0.5 seconds
    effect.can_stack = true;
    effect.max_stacks = 3;
    return effect;
}

inline StatusEffect create_stun_effect(float duration) {
    StatusEffect effect;
    effect.type = StatusEffectType::STUNNED;
    effect.duration = duration;
    effect.intensity = 1.0f;
    effect.can_stack = false;
    return effect;
}

inline StatusEffect create_slow_effect(float duration, float intensity) {
    StatusEffect effect;
    effect.type = StatusEffectType::SLOWED;
    effect.duration = duration;
    effect.intensity = intensity;
    effect.can_stack = false;
    return effect;
}

inline StatusEffect create_damage_boost(float duration, float intensity) {
    StatusEffect effect;
    effect.type = StatusEffectType::DAMAGE_BOOST;
    effect.duration = duration;
    effect.intensity = intensity;
    effect.can_stack = false;
    return effect;
}