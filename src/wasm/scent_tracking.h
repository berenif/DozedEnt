// Enhanced Scent Tracking System - Territory marking and trail following
#pragma once

#include "scent.h"
#include "enemies.h"

// Scent types for different purposes
enum class ScentType : unsigned char {
    Player = 0,      // Player's scent trail
    Wolf = 1,        // Wolf scent (for pack communication)
    Territory = 2,   // Territory marking
    Prey = 3,        // Prey animal scent (future)
    Danger = 4       // Warning scent (avoid area)
};

// Scent marker for territory
struct ScentMarker {
    float x, y;
    float strength;      // 0-1, decays over time
    float timestamp;
    ScentType type;
    unsigned char owner_id; // Which wolf marked this (for territory)
};

#define MAX_SCENT_MARKERS 64
static ScentMarker g_scent_markers[MAX_SCENT_MARKERS];
static unsigned char g_scent_marker_count = 0;

// Territory data
struct Territory {
    float center_x, center_y;
    float radius;
    unsigned char pack_id;
    float strength;  // How well defended (0-1)
    float last_marked_time;
};

#define MAX_TERRITORIES 4
static Territory g_territories[MAX_TERRITORIES];
static unsigned char g_territory_count = 0;

// Initialize scent tracking system
static void init_scent_tracking() {
    g_scent_marker_count = 0;
    g_territory_count = 0;
    scent_clear();
}

// Add a scent marker
static void add_scent_marker(float x, float y, ScentType type, unsigned char owner_id = 255) {
    if (g_scent_marker_count >= MAX_SCENT_MARKERS) {
        // Overwrite oldest marker
        float oldest_time = g_scent_markers[0].timestamp;
        int oldest_idx = 0;
        
        for (int i = 1; i < MAX_SCENT_MARKERS; ++i) {
            if (g_scent_markers[i].timestamp < oldest_time) {
                oldest_time = g_scent_markers[i].timestamp;
                oldest_idx = i;
            }
        }
        
        g_scent_marker_count = oldest_idx;
    }
    
    ScentMarker& marker = g_scent_markers[g_scent_marker_count];
    marker.x = x;
    marker.y = y;
    marker.strength = 1.0f;
    marker.timestamp = g_time_seconds;
    marker.type = type;
    marker.owner_id = owner_id;
    
    g_scent_marker_count++;
}

// Mark territory
static void mark_territory(float x, float y, unsigned char pack_id) {
    // Add scent marker
    add_scent_marker(x, y, ScentType::Territory, pack_id);
    
    // Check if this is within existing territory
    for (int i = 0; i < g_territory_count; ++i) {
        if (g_territories[i].pack_id != pack_id) continue;
        
        float dx = x - g_territories[i].center_x;
        float dy = y - g_territories[i].center_y;
        float dist = vec_len(dx, dy);
        
        if (dist < g_territories[i].radius * 1.5f) {
            // Strengthen existing territory
            g_territories[i].strength = fminf(g_territories[i].strength + 0.1f, 1.0f);
            g_territories[i].last_marked_time = g_time_seconds;
            
            // Expand territory slightly
            g_territories[i].radius = fminf(g_territories[i].radius * 1.05f, 0.5f);
            return;
        }
    }
    
    // Create new territory if space available
    if (g_territory_count < MAX_TERRITORIES) {
        Territory& terr = g_territories[g_territory_count];
        terr.center_x = x;
        terr.center_y = y;
        terr.radius = 0.15f;
        terr.pack_id = pack_id;
        terr.strength = 0.5f;
        terr.last_marked_time = g_time_seconds;
        g_territory_count++;
    }
}

// Check if position is in wolf territory
static bool is_in_territory(float x, float y, unsigned char pack_id) {
    for (int i = 0; i < g_territory_count; ++i) {
        if (g_territories[i].pack_id != pack_id) continue;
        
        float dx = x - g_territories[i].center_x;
        float dy = y - g_territories[i].center_y;
        float dist = vec_len(dx, dy);
        
        if (dist < g_territories[i].radius) {
            return true;
        }
    }
    return false;
}

// Get territory strength at position
static float get_territory_strength(float x, float y, unsigned char pack_id) {
    float max_strength = 0.0f;
    
    for (int i = 0; i < g_territory_count; ++i) {
        if (g_territories[i].pack_id != pack_id) continue;
        
        float dx = x - g_territories[i].center_x;
        float dy = y - g_territories[i].center_y;
        float dist = vec_len(dx, dy);
        
        if (dist < g_territories[i].radius) {
            float strength = g_territories[i].strength * (1.0f - dist / g_territories[i].radius);
            max_strength = fmaxf(max_strength, strength);
        }
    }
    
    return max_strength;
}

// Follow scent trail
static void follow_scent_trail(Enemy& wolf) {
    float best_scent = 0.0f;
    float best_x = wolf.x;
    float best_y = wolf.y;
    
    // Sample scent gradient
    float gx, gy;
    scent_gradient_at(wolf.x, wolf.y, gx, gy);
    
    // Also check scent markers
    for (int i = 0; i < g_scent_marker_count; ++i) {
        ScentMarker& marker = g_scent_markers[i];
        
        // Decay old markers
        float age = g_time_seconds - marker.timestamp;
        if (age > 30.0f) continue; // Too old
        
        marker.strength = fmaxf(0.0f, 1.0f - age / 30.0f);
        
        // Only follow player scent
        if (marker.type != ScentType::Player) continue;
        
        float dx = marker.x - wolf.x;
        float dy = marker.y - wolf.y;
        float dist = vec_len(dx, dy);
        
        if (dist > 0.5f) continue; // Too far
        
        float scent_strength = marker.strength / (1.0f + dist * 2.0f);
        
        if (scent_strength > best_scent) {
            best_scent = scent_strength;
            best_x = marker.x;
            best_y = marker.y;
        }
    }
    
    // Update wolf memory with scent information
    if (best_scent > 0.1f) {
        wolf.mem.lastScentX = best_x;
        wolf.mem.lastScentY = best_y;
        wolf.mem.lastScentStrength = best_scent;
        wolf.mem.lastScentConfidence = best_scent;
        
        // Move towards stronger scent
        if (gx != 0 || gy != 0) {
            wolf.mem.lastSeenX = wolf.x + gx * 0.1f;
            wolf.mem.lastSeenY = wolf.y + gy * 0.1f;
        }
    }
}

// Update scent tracking system
static void update_scent_tracking(float dt) {
    // Update scent field (already handled by scent_step)
    
    // Add player scent markers periodically
    static float last_player_marker_time = 0.0f;
    if (g_time_seconds - last_player_marker_time > 2.0f) {
        add_scent_marker(g_pos_x, g_pos_y, ScentType::Player);
        last_player_marker_time = g_time_seconds;
    }
    
    // Decay territory strength
    for (int i = 0; i < g_territory_count; ++i) {
        float age = g_time_seconds - g_territories[i].last_marked_time;
        if (age > 60.0f) {
            // Territory fades after 1 minute without marking
            g_territories[i].strength = fmaxf(0.0f, g_territories[i].strength - dt * 0.1f);
            
            // Remove dead territories
            if (g_territories[i].strength <= 0.0f) {
                // Shift remaining territories
                for (int j = i; j < g_territory_count - 1; ++j) {
                    g_territories[j] = g_territories[j + 1];
                }
                g_territory_count--;
                i--;
            }
        }
    }
    
    // Wolves mark territory periodically
    static float last_territory_mark_time = 0.0f;
    if (g_time_seconds - last_territory_mark_time > 5.0f) {
        // Alpha wolf marks territory
        if (g_alpha_wolf.wolf_index >= 0 && g_enemies[g_alpha_wolf.wolf_index].active) {
            Enemy& alpha = g_enemies[g_alpha_wolf.wolf_index];
            mark_territory(alpha.x, alpha.y, 0); // Pack ID 0 for now
        }
        
        last_territory_mark_time = g_time_seconds;
    }
    
    // Update wolf scent tracking
    for (int i = 0; i < g_enemy_count; ++i) {
        if (!g_enemies[i].active) continue;
        
        Enemy& wolf = g_enemies[i];
        
        // Follow scent when searching
        if (wolf.state == EnemyState::Seek || wolf.state == EnemyState::Prowl) {
            follow_scent_trail(wolf);
        }
        
        // Get territorial advantage
        bool in_territory = is_in_territory(wolf.x, wolf.y, 0);
        if (in_territory) {
            // Boost morale and aggression in own territory
            float territory_bonus = get_territory_strength(wolf.x, wolf.y, 0);
            wolf.morale = fminf(wolf.morale + territory_bonus * 0.1f * dt, 1.0f);
            
            if (wolf.emotion == EmotionalState::Calm) {
                wolf.emotion = EmotionalState::Confident;
                wolf.emotionIntensity = territory_bonus * 0.5f;
            }
        }
    }
}

// Get scent strength at position (for export)
static float get_scent_strength_at(float x, float y) {
    int ix = (int)(x * (SCENT_W - 1));
    int iy = (int)(y * (SCENT_H - 1));
    
    if (ix < 0) ix = 0;
    if (ix >= SCENT_W) ix = SCENT_W - 1;
    if (iy < 0) iy = 0;
    if (iy >= SCENT_H) iy = SCENT_H - 1;
    
    return g_scent[iy][ix];
}

// Check if wolf can smell player
static bool can_smell_player(int wolf_index) {
    if (wolf_index < 0 || wolf_index >= MAX_ENEMIES) return false;
    if (!g_enemies[wolf_index].active) return false;
    
    Enemy& wolf = g_enemies[wolf_index];
    
    // Check scent field
    float scent = get_scent_strength_at(wolf.x, wolf.y);
    
    // Wolves have enhanced smell based on intelligence
    float smell_threshold = 0.1f * (2.0f - wolf.intelligence);
    
    return scent > smell_threshold;
}