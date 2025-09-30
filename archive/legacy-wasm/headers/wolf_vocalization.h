// Wolf Vocalization System - WASM Implementation
// Implements howls, growls, barks for pack communication
#pragma once

#include "enemies.h" // Access enemy structs and pack data

// Vocalization types for wolves
enum class VocalizationType : unsigned char {
    None = 0,
    HowlRally = 1,      // Rally pack members to location
    HowlHunt = 2,       // Signal start of coordinated hunt
    HowlVictory = 3,    // Celebrate successful kill
    HowlMourning = 4,   // Mourn fallen pack member
    GrowlWarning = 5,   // Warn target to back off
    GrowlAggressive = 6,// Pre-attack intimidation
    GrowlDefensive = 7, // Defensive stance warning
    BarkAlert = 8,      // Alert pack to danger
    BarkCommand = 9,    // Alpha giving orders
    BarkAcknowledge = 10,// Acknowledge alpha command
    WhineSubmission = 11,// Submission to alpha
    WhineDistress = 12  // Call for help
};

// Vocalization data structure
struct Vocalization {
    VocalizationType type;
    float x, y;              // Position of vocalizing wolf
    float range;             // How far the sound travels
    float timestamp;         // When the vocalization occurred
    unsigned char wolf_index; // Which wolf made the sound
    float intensity;         // Volume/urgency (0-1)
};

#define MAX_VOCALIZATIONS 16
static Vocalization g_vocalizations[MAX_VOCALIZATIONS];
static unsigned char g_vocalization_count = 0;

// Vocalization ranges (in normalized units)
static const float VOCALIZATION_RANGES[] = {
    0.0f,   // None
    0.8f,   // HowlRally - long range
    1.0f,   // HowlHunt - very long range
    0.6f,   // HowlVictory - medium range
    0.7f,   // HowlMourning - medium-long range
    0.2f,   // GrowlWarning - short range
    0.15f,  // GrowlAggressive - very short range
    0.1f,   // GrowlDefensive - very short range
    0.3f,   // BarkAlert - medium-short range
    0.25f,  // BarkCommand - short-medium range
    0.2f,   // BarkAcknowledge - short range
    0.15f,  // WhineSubmission - very short range
    0.25f   // WhineDistress - short-medium range
};

// Vocalization cooldowns (in seconds)
static const float VOCALIZATION_COOLDOWNS[] = {
    0.0f,   // None
    10.0f,  // HowlRally
    15.0f,  // HowlHunt
    5.0f,   // HowlVictory
    20.0f,  // HowlMourning
    3.0f,   // GrowlWarning
    2.0f,   // GrowlAggressive
    2.5f,   // GrowlDefensive
    1.0f,   // BarkAlert
    1.5f,   // BarkCommand
    1.0f,   // BarkAcknowledge
    2.0f,   // WhineSubmission
    3.0f    // WhineDistress
};

// Track last vocalization time for each wolf
static float g_wolf_last_vocalization[MAX_ENEMIES];
static VocalizationType g_wolf_last_vocalization_type[MAX_ENEMIES];

// Initialize vocalization system
static void init_vocalization_system() {
    g_vocalization_count = 0;
    for (int i = 0; i < MAX_ENEMIES; ++i) {
        g_wolf_last_vocalization[i] = -1000.f;
        g_wolf_last_vocalization_type[i] = VocalizationType::None;
    }
}

// Check if a wolf can vocalize
static bool can_vocalize(int wolf_index, VocalizationType type) {
    if (wolf_index < 0 || wolf_index >= MAX_ENEMIES) return false;
    if (!g_enemies[wolf_index].active) return false;
    
    float cooldown = VOCALIZATION_COOLDOWNS[(int)type];
    return (g_time_seconds - g_wolf_last_vocalization[wolf_index]) >= cooldown;
}

// Emit a vocalization
static void emit_vocalization(int wolf_index, VocalizationType type, float intensity = 1.0f) {
    if (!can_vocalize(wolf_index, type)) return;
    if (g_vocalization_count >= MAX_VOCALIZATIONS) {
        // Overwrite oldest vocalization
        g_vocalization_count = 0;
    }
    
    Vocalization& v = g_vocalizations[g_vocalization_count];
    v.type = type;
    v.x = g_enemies[wolf_index].x;
    v.y = g_enemies[wolf_index].y;
    v.range = VOCALIZATION_RANGES[(int)type];
    v.timestamp = g_time_seconds;
    v.wolf_index = wolf_index;
    v.intensity = intensity;
    
    g_vocalization_count++;
    g_wolf_last_vocalization[wolf_index] = g_time_seconds;
    g_wolf_last_vocalization_type[wolf_index] = type;
}

// Process vocalizations - wolves react to sounds
static void process_vocalizations() {
    for (int v = 0; v < g_vocalization_count; ++v) {
        Vocalization& vocal = g_vocalizations[v];
        
        // Remove old vocalizations (older than 2 seconds)
        if (g_time_seconds - vocal.timestamp > 2.0f) {
            // Shift remaining vocalizations
            for (int i = v; i < g_vocalization_count - 1; ++i) {
                g_vocalizations[i] = g_vocalizations[i + 1];
            }
            g_vocalization_count--;
            v--;
            continue;
        }
        
        // Process reactions from other wolves
        for (int i = 0; i < MAX_ENEMIES; ++i) {
            if (!g_enemies[i].active) continue;
            if (i == vocal.wolf_index) continue; // Don't react to own sound
            
            float dx = g_enemies[i].x - vocal.x;
            float dy = g_enemies[i].y - vocal.y;
            float dist = vec_len(dx, dy);
            
            if (dist > vocal.range) continue; // Out of range
            
            // React based on vocalization type
            switch (vocal.type) {
                case VocalizationType::HowlRally:
                    // Move towards rally point
                    if (g_enemies[i].state == EnemyState::Idle || g_enemies[i].state == EnemyState::Prowl) {
                        g_enemies[i].state = EnemyState::Seek;
                        g_enemies[i].mem.lastSeenX = vocal.x;
                        g_enemies[i].mem.lastSeenY = vocal.y;
                    }
                    break;
                    
                case VocalizationType::HowlHunt:
                    // Increase aggression and coordination
                    g_enemies[i].aggression = fminf(g_enemies[i].aggression + 0.2f, 1.0f);
                    g_enemies[i].coordination = fminf(g_enemies[i].coordination + 0.3f, 1.0f);
                    if (g_enemies[i].emotion == EmotionalState::Calm) {
                        g_enemies[i].emotion = EmotionalState::Aggressive;
                        g_enemies[i].emotionIntensity = 0.7f;
                    }
                    break;
                    
                case VocalizationType::BarkAlert:
                    // Switch to alert state
                    if (g_enemies[i].state == EnemyState::Idle) {
                        g_enemies[i].state = EnemyState::Seek;
                        g_enemies[i].noticed = 1;
                    }
                    break;
                    
                case VocalizationType::BarkCommand:
                    // Follow alpha's command (increase coordination)
                    g_enemies[i].coordination = fminf(g_enemies[i].coordination + 0.1f, 1.0f);
                    g_enemies[i].targetLocked = 1;
                    break;
                    
                case VocalizationType::WhineDistress:
                    // Help pack member in distress
                    if (dist < 0.3f && g_enemies[i].state != EnemyState::Harass) {
                        g_enemies[i].state = EnemyState::Seek;
                        g_enemies[i].mem.lastSeenX = vocal.x;
                        g_enemies[i].mem.lastSeenY = vocal.y;
                    }
                    break;
                    
                case VocalizationType::GrowlWarning:
                    // Backup the warning wolf
                    if (dist < 0.2f) {
                        g_enemies[i].aggression = fminf(g_enemies[i].aggression + 0.1f, 1.0f);
                    }
                    break;
                    
                default:
                    break;
            }
        }
    }
}

// Determine appropriate vocalization based on wolf state and emotion
static VocalizationType choose_vocalization(int wolf_index) {
    Enemy& wolf = g_enemies[wolf_index];
    
    // Alpha wolf has special vocalizations
    bool is_alpha = (g_enemy_roles[wolf_index] == (unsigned char)PackRole::Lead);
    
    // Check emotional state first
    switch (wolf.emotion) {
        case EmotionalState::Aggressive:
            if (wolf.state == EnemyState::Harass) {
                return is_alpha ? VocalizationType::BarkCommand : VocalizationType::GrowlAggressive;
            }
            break;
            
        case EmotionalState::Fearful:
            if (wolf.health < 0.3f) {
                return VocalizationType::WhineDistress;
            }
            return VocalizationType::GrowlDefensive;
            
        case EmotionalState::Desperate:
            return VocalizationType::WhineDistress;
            
        case EmotionalState::Confident:
            if (is_alpha && g_pack_plan == PackPlan::Commit) {
                return VocalizationType::HowlHunt;
            }
            break;
            
        case EmotionalState::Hurt:
            if (wolf.health < 0.5f) {
                return VocalizationType::WhineDistress;
            }
            break;
            
        default:
            break;
    }
    
    // Check state-based vocalizations
    switch (wolf.state) {
        case EnemyState::Howl:
            // Victory howl after successful kill
            if (g_pack_last_success_time > g_pack_last_failure_time && 
                g_time_seconds - g_pack_last_success_time < 2.0f) {
                return VocalizationType::HowlVictory;
            }
            // Rally howl when regrouping
            if (g_pack_plan == PackPlan::Retreat) {
                return VocalizationType::HowlRally;
            }
            // Hunt howl when starting coordinated attack
            if (g_pack_plan == PackPlan::Commit && is_alpha) {
                return VocalizationType::HowlHunt;
            }
            break;
            
        case EnemyState::Seek:
            // Alert bark when spotting player
            if (wolf.noticed && g_time_seconds - wolf.noticeAcquiredTime < 0.5f) {
                return VocalizationType::BarkAlert;
            }
            break;
            
        case EnemyState::Circle:
            // Command bark from alpha during circling
            if (is_alpha && g_pack_sync_timer > 0.8f) {
                return VocalizationType::BarkCommand;
            }
            break;
            
        case EnemyState::Harass:
            // Aggressive growl before attack
            if (wolf.lastLungeTime > 0 && g_time_seconds - wolf.lastLungeTime < 0.5f) {
                return VocalizationType::GrowlAggressive;
            }
            break;
            
        case EnemyState::Retreat:
            // Defensive growl when retreating
            if (wolf.health < 0.5f) {
                return VocalizationType::GrowlDefensive;
            }
            break;
            
        default:
            break;
    }
    
    return VocalizationType::None;
}

// Update vocalization system each frame
static void update_vocalization_system(float dt) {
    // Process existing vocalizations
    process_vocalizations();
    
    // Check if any wolf should vocalize
    for (int i = 0; i < MAX_ENEMIES; ++i) {
        if (!g_enemies[i].active) continue;
        
        VocalizationType vocal_type = choose_vocalization(i);
        if (vocal_type != VocalizationType::None) {
            // Calculate intensity based on emotional state
            float intensity = g_enemies[i].emotionIntensity;
            if (g_enemies[i].emotion == EmotionalState::Desperate || 
                g_enemies[i].emotion == EmotionalState::Aggressive) {
                intensity = fminf(intensity * 1.5f, 1.0f);
            }
            
            emit_vocalization(i, vocal_type, intensity);
        }
    }
}