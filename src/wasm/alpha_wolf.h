// Alpha Wolf System - Pack leader with unique abilities
#pragma once

#include "enemies.h"

// Forward declarations
enum class VocalizationType : unsigned char;

// Alpha wolf abilities
enum class AlphaAbility : unsigned char {
    None = 0,
    RallyPack = 1,        // Boost pack morale and coordination
    CoordinatedStrike = 2, // Synchronize pack attack
    Intimidate = 3,       // Reduce player stamina regeneration
    CallReinforcements = 4,// Summon additional wolves
    BerserkRage = 5       // Temporary damage and speed boost
};

// Alpha wolf data
struct AlphaWolf {
    int wolf_index;           // Index in g_enemies array (-1 if no alpha)
    AlphaAbility current_ability;
    float ability_cooldown;
    float last_ability_time;
    float leadership_bonus;   // Bonus to pack coordination (0.1-0.3)
    int successful_commands;  // Track successful coordinated attacks
    float intimidation_aura;  // Range of intimidation effect
    bool is_enraged;         // Berserk mode active
    float enrage_end_time;   // When berserk mode ends
};

static AlphaWolf g_alpha_wolf = {
    -1,                      // wolf_index
    AlphaAbility::None,      // current_ability
    0.0f,                    // ability_cooldown
    -1000.0f,               // last_ability_time
    0.2f,                    // leadership_bonus
    0,                       // successful_commands
    0.15f,                   // intimidation_aura
    false,                   // is_enraged
    0.0f                     // enrage_end_time
};

// Alpha ability cooldowns (in seconds)
static const float ALPHA_ABILITY_COOLDOWNS[] = {
    0.0f,   // None
    20.0f,  // RallyPack
    15.0f,  // CoordinatedStrike
    10.0f,  // Intimidate
    30.0f,  // CallReinforcements
    25.0f   // BerserkRage
};

// Check if a wolf should become alpha
static bool should_become_alpha(int wolf_index) {
    if (wolf_index < 0 || wolf_index >= MAX_ENEMIES) return false;
    Enemy& wolf = g_enemies[wolf_index];
    
    // Requirements for alpha status:
    // - High health (> 80%)
    // - High aggression (> 0.6)
    // - High intelligence (> 0.6)
    // - Not currently fleeing
    return wolf.active && 
           wolf.health > 0.8f && 
           wolf.aggression > 0.6f && 
           wolf.intelligence > 0.6f &&
           wolf.state != EnemyState::Retreat &&
           wolf.emotion != EmotionalState::Fearful;
}

// Assign alpha wolf
static void assign_alpha_wolf() {
    // Check if current alpha is still valid
    if (g_alpha_wolf.wolf_index >= 0) {
        if (!g_enemies[g_alpha_wolf.wolf_index].active || 
            g_enemies[g_alpha_wolf.wolf_index].health <= 0) {
            // Alpha died, need new alpha
            g_alpha_wolf.wolf_index = -1;
            
            // Mourn the fallen alpha
            for (int i = 0; i < g_enemy_count; ++i) {
                if (g_enemies[i].active && can_vocalize(i, VocalizationType::HowlMourning)) {
                    emit_vocalization(i, VocalizationType::HowlMourning, 1.0f);
                    break;
                }
            }
        }
    }
    
    // Find new alpha if needed
    if (g_alpha_wolf.wolf_index < 0) {
        int best_candidate = -1;
        float best_score = 0.0f;
        
        for (int i = 0; i < g_enemy_count; ++i) {
            if (!should_become_alpha(i)) continue;
            
            // Score based on attributes
            float score = g_enemies[i].health * 0.3f +
                         g_enemies[i].aggression * 0.3f +
                         g_enemies[i].intelligence * 0.2f +
                         g_enemies[i].coordination * 0.2f;
            
            if (score > best_score) {
                best_score = score;
                best_candidate = i;
            }
        }
        
        if (best_candidate >= 0) {
            g_alpha_wolf.wolf_index = best_candidate;
            g_enemy_roles[best_candidate] = (unsigned char)PackRole::Lead;
            
            // Boost alpha's stats
            g_enemies[best_candidate].aggression = fminf(g_enemies[best_candidate].aggression + 0.2f, 1.0f);
            g_enemies[best_candidate].coordination = 1.0f; // Perfect coordination
            g_enemies[best_candidate].morale = 1.0f; // Maximum morale
            
            // Announce new alpha with rally howl
            emit_vocalization(best_candidate, VocalizationType::HowlRally, 1.0f);
        }
    }
}

// Execute alpha ability
static void execute_alpha_ability(AlphaAbility ability) {
    if (g_alpha_wolf.wolf_index < 0) return;
    if (g_time_seconds - g_alpha_wolf.last_ability_time < ALPHA_ABILITY_COOLDOWNS[(int)ability]) return;
    
    Enemy& alpha = g_enemies[g_alpha_wolf.wolf_index];
    
    switch (ability) {
        case AlphaAbility::RallyPack:
            // Boost all pack members' morale and coordination
            g_pack_morale = fminf(g_pack_morale + 0.3f, 1.0f);
            
            for (int i = 0; i < g_enemy_count; ++i) {
                if (!g_enemies[i].active) continue;
                
                g_enemies[i].morale = fminf(g_enemies[i].morale + 0.25f, 1.0f);
                g_enemies[i].coordination = fminf(g_enemies[i].coordination + 0.2f, 1.0f);
                g_enemies[i].fatigue = fmaxf(g_enemies[i].fatigue - 0.3f, 0.0f); // Reduce fatigue
                
                // Change emotion to confident
                if (g_enemies[i].emotion == EmotionalState::Fearful || 
                    g_enemies[i].emotion == EmotionalState::Calm) {
                    g_enemies[i].emotion = EmotionalState::Confident;
                    g_enemies[i].emotionIntensity = 0.8f;
                }
            }
            
            emit_vocalization(g_alpha_wolf.wolf_index, VocalizationType::HowlRally, 1.0f);
            break;
            
        case AlphaAbility::CoordinatedStrike:
            // Synchronize pack attack
            g_pack_sync_timer = 1.0f;
            g_pack_plan = PackPlan::Commit;
            
            // Command all wolves to attack
            for (int i = 0; i < g_enemy_count; ++i) {
                if (!g_enemies[i].active || i == g_alpha_wolf.wolf_index) continue;
                
                g_enemies[i].state = EnemyState::Harass;
                g_enemies[i].targetLocked = 1;
                g_enemies[i].lastLungeTime = g_time_seconds - ENEMY_LUNGE_COOLDOWN + 0.5f; // Ready to lunge soon
            }
            
            emit_vocalization(g_alpha_wolf.wolf_index, VocalizationType::BarkCommand, 1.0f);
            g_alpha_wolf.successful_commands++;
            break;
            
        case AlphaAbility::Intimidate:
            // Reduce player stamina regeneration in aura
            {
                float dx = g_pos_x - alpha.x;
                float dy = g_pos_y - alpha.y;
                float dist = vec_len(dx, dy);
                
                if (dist < g_alpha_wolf.intimidation_aura) {
                    // Apply intimidation effect (handled in main update)
                    g_stamina_regen_mult = 0.3f; // 70% reduction
                }
            }
            
            emit_vocalization(g_alpha_wolf.wolf_index, VocalizationType::GrowlWarning, 1.0f);
            break;
            
        case AlphaAbility::CallReinforcements:
            // Summon 2-3 additional wolves if pack is small
            if (g_enemy_count < 6) {
                int reinforcements = 2 + (rng_float01() > 0.5f ? 1 : 0);
                
                for (int r = 0; r < reinforcements && g_enemy_count < MAX_ENEMIES; ++r) {
                    // Spawn new wolf near alpha
                    float angle = rng_float01() * 6.28f;
                    float dist = 0.2f + rng_float01() * 0.1f;
                    float spawn_x = alpha.x + cosf(angle) * dist;
                    float spawn_y = alpha.y + sinf(angle) * dist;
                    
                    // Clamp to bounds
                    spawn_x = fmaxf(0.05f, fminf(0.95f, spawn_x));
                    spawn_y = fmaxf(0.05f, fminf(0.95f, spawn_y));
                    
                    enemy_activate(g_enemy_count, EnemyType::Wolf, spawn_x, spawn_y);
                    
                    // New wolf starts aggressive
                    if (g_enemy_count > 0) {
                        Enemy& newWolf = g_enemies[g_enemy_count - 1];
                        newWolf.emotion = EmotionalState::Aggressive;
                        newWolf.emotionIntensity = 0.7f;
                        newWolf.aggression = 0.7f;
                        newWolf.noticed = 1;
                    }
                }
                
                emit_vocalization(g_alpha_wolf.wolf_index, VocalizationType::HowlHunt, 1.0f);
            }
            break;
            
        case AlphaAbility::BerserkRage:
            // Enter berserk mode - boost speed and damage
            g_alpha_wolf.is_enraged = true;
            g_alpha_wolf.enrage_end_time = g_time_seconds + 10.0f; // 10 second duration
            
            // Boost alpha stats
            alpha.aggression = 1.0f;
            alpha.emotion = EmotionalState::Aggressive;
            alpha.emotionIntensity = 1.0f;
            
            // Inspire nearby wolves
            for (int i = 0; i < g_enemy_count; ++i) {
                if (!g_enemies[i].active || i == g_alpha_wolf.wolf_index) continue;
                
                float dx = g_enemies[i].x - alpha.x;
                float dy = g_enemies[i].y - alpha.y;
                if (vec_len(dx, dy) < 0.3f) {
                    g_enemies[i].aggression = fminf(g_enemies[i].aggression + 0.3f, 1.0f);
                    g_enemies[i].emotion = EmotionalState::Aggressive;
                }
            }
            
            emit_vocalization(g_alpha_wolf.wolf_index, VocalizationType::GrowlAggressive, 1.0f);
            break;
            
        default:
            break;
    }
    
    g_alpha_wolf.last_ability_time = g_time_seconds;
    g_alpha_wolf.current_ability = ability;
}

// Choose appropriate alpha ability based on situation
static AlphaAbility choose_alpha_ability() {
    if (g_alpha_wolf.wolf_index < 0) return AlphaAbility::None;
    
    Enemy& alpha = g_enemies[g_alpha_wolf.wolf_index];
    
    // Check if berserk rage should end
    if (g_alpha_wolf.is_enraged && g_time_seconds > g_alpha_wolf.enrage_end_time) {
        g_alpha_wolf.is_enraged = false;
    }
    
    // Priority-based ability selection
    
    // 1. Call reinforcements if pack is too small
    if (g_enemy_count < 3 && g_time_seconds - g_alpha_wolf.last_ability_time > ALPHA_ABILITY_COOLDOWNS[(int)AlphaAbility::CallReinforcements]) {
        return AlphaAbility::CallReinforcements;
    }
    
    // 2. Rally pack if morale is low
    if (g_pack_morale < 0.4f && g_time_seconds - g_alpha_wolf.last_ability_time > ALPHA_ABILITY_COOLDOWNS[(int)AlphaAbility::RallyPack]) {
        return AlphaAbility::RallyPack;
    }
    
    // 3. Berserk rage if health is low
    if (alpha.health < 0.3f && !g_alpha_wolf.is_enraged && 
        g_time_seconds - g_alpha_wolf.last_ability_time > ALPHA_ABILITY_COOLDOWNS[(int)AlphaAbility::BerserkRage]) {
        return AlphaAbility::BerserkRage;
    }
    
    // 4. Coordinated strike when pack is ready
    if (g_pack_plan == PackPlan::Encircle && g_pack_sync_timer < 0.2f &&
        g_time_seconds - g_alpha_wolf.last_ability_time > ALPHA_ABILITY_COOLDOWNS[(int)AlphaAbility::CoordinatedStrike]) {
        
        // Check if enough wolves are in position
        int ready_count = 0;
        for (int i = 0; i < g_enemy_count; ++i) {
            if (!g_enemies[i].active) continue;
            if (g_enemies[i].state == EnemyState::Circle || g_enemies[i].state == EnemyState::Harass) {
                ready_count++;
            }
        }
        
        if (ready_count >= 3) {
            return AlphaAbility::CoordinatedStrike;
        }
    }
    
    // 5. Intimidate when player is close
    float dx = g_pos_x - alpha.x;
    float dy = g_pos_y - alpha.y;
    if (vec_len(dx, dy) < 0.2f && 
        g_time_seconds - g_alpha_wolf.last_ability_time > ALPHA_ABILITY_COOLDOWNS[(int)AlphaAbility::Intimidate]) {
        return AlphaAbility::Intimidate;
    }
    
    return AlphaAbility::None;
}

// Update alpha wolf system
static void update_alpha_wolf(float dt) {
    // Assign or reassign alpha if needed
    assign_alpha_wolf();
    
    if (g_alpha_wolf.wolf_index < 0) return;
    
    // Apply leadership bonus to pack
    for (int i = 0; i < g_enemy_count; ++i) {
        if (!g_enemies[i].active || i == g_alpha_wolf.wolf_index) continue;
        
        // Wolves near alpha get coordination bonus
        float dx = g_enemies[i].x - g_enemies[g_alpha_wolf.wolf_index].x;
        float dy = g_enemies[i].y - g_enemies[g_alpha_wolf.wolf_index].y;
        float dist = vec_len(dx, dy);
        
        if (dist < 0.4f) {
            float proximity_bonus = (0.4f - dist) / 0.4f; // 1.0 at distance 0, 0.0 at distance 0.4
            g_enemies[i].coordination = fminf(g_enemies[i].coordination + g_alpha_wolf.leadership_bonus * proximity_bonus * dt, 1.0f);
        }
    }
    
    // Apply berserk rage effects
    if (g_alpha_wolf.is_enraged) {
        Enemy& alpha = g_enemies[g_alpha_wolf.wolf_index];
        // Speed boost handled in movement code
        // Damage boost would be handled in combat code
    }
    
    // Choose and execute ability
    AlphaAbility ability = choose_alpha_ability();
    if (ability != AlphaAbility::None) {
        execute_alpha_ability(ability);
    }
}

// Get alpha wolf speed modifier
static float get_alpha_speed_modifier() {
    if (g_alpha_wolf.wolf_index < 0) return 1.0f;
    if (!g_alpha_wolf.is_enraged) return 1.1f; // Slight speed boost for alpha
    return 1.5f; // Significant speed boost when enraged
}

// Get alpha wolf damage modifier
static float get_alpha_damage_modifier() {
    if (g_alpha_wolf.wolf_index < 0) return 1.0f;
    if (!g_alpha_wolf.is_enraged) return 1.2f; // Slight damage boost for alpha
    return 2.0f; // Double damage when enraged
}