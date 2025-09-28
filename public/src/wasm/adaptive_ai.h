// Adaptive AI System - Dynamically adjusts difficulty based on player performance
#pragma once

#include "enemies.h"

// Player performance metrics
struct PlayerMetrics {
    float avgReactionTime;      // Average reaction time to threats
    float dodgeSuccessRate;      // Successful dodge percentage
    float blockSuccessRate;      // Successful block percentage
    float killRate;              // Kills per minute
    float damageAvoidanceRate;   // Percentage of attacks avoided
    float movementEfficiency;    // How well player uses movement
    int consecutiveDeaths;       // Deaths in a row
    int consecutiveKills;        // Kills in a row
    float lastUpdateTime;        // Last time metrics were updated
};

static PlayerMetrics g_player_metrics = {
    0.5f, 0.5f, 0.5f, 0.0f, 0.5f, 0.5f, 0, 0, 0.0f
};

// Difficulty parameters that can be adjusted
struct DifficultyParams {
    float wolfSpeed;             // Speed multiplier for wolves
    float wolfAggression;        // How aggressive wolves are
    float wolfIntelligence;      // How smart wolves are
    float packCoordination;      // How well pack coordinates
    float feintFrequency;        // How often wolves feint
    float attackCooldown;        // Time between attacks
    float reactionDelay;         // AI reaction time to player actions
    float visionRange;           // How far wolves can see
    float hearingRange;          // How far wolves can hear
};

static DifficultyParams g_difficulty = {
    1.0f, 0.5f, 0.5f, 0.5f, 0.35f, 0.9f, 0.2f, 0.45f, 0.5f
};

// Update player metrics based on events
static void update_player_metrics(float dt) {
    // Decay old metrics over time
    const float DECAY_RATE = 0.95f;
    g_player_metrics.avgReactionTime *= DECAY_RATE;
    g_player_metrics.dodgeSuccessRate *= DECAY_RATE;
    g_player_metrics.blockSuccessRate *= DECAY_RATE;
    
    // Update kill rate
    if (g_time_seconds - g_player_metrics.lastUpdateTime > 60.0f) {
        g_player_metrics.killRate = g_player_metrics.consecutiveKills / ((g_time_seconds - g_player_metrics.lastUpdateTime) / 60.0f);
        g_player_metrics.lastUpdateTime = g_time_seconds;
    }
}

// Calculate player skill level (0-1)
static float calculate_player_skill() {
    float skill = 0.0f;
    
    // Weight different metrics
    skill += g_player_metrics.dodgeSuccessRate * 0.25f;
    skill += g_player_metrics.blockSuccessRate * 0.20f;
    skill += g_player_metrics.damageAvoidanceRate * 0.25f;
    skill += g_player_metrics.movementEfficiency * 0.15f;
    skill += fminf(g_player_metrics.killRate / 5.0f, 1.0f) * 0.15f; // Cap at 5 kills/min
    
    // Adjust for streaks
    if (g_player_metrics.consecutiveDeaths > 3) {
        skill *= 0.7f; // Player struggling
    } else if (g_player_metrics.consecutiveKills > 5) {
        skill *= 1.3f; // Player doing well
    }
    
    return clamp01(skill);
}

// Adjust difficulty based on player performance
static void adapt_difficulty() {
    float playerSkill = calculate_player_skill();
    
    // Update global skill estimate for pack AI
    g_player_skill_estimate = playerSkill;
    
    // Smooth difficulty transitions
    const float ADAPT_RATE = 0.1f;
    
    // Adjust wolf parameters based on player skill
    float targetSpeed = 0.8f + playerSkill * 0.4f; // 0.8 to 1.2
    float targetAggression = 0.3f + playerSkill * 0.5f; // 0.3 to 0.8
    float targetIntelligence = 0.3f + playerSkill * 0.6f; // 0.3 to 0.9
    float targetCoordination = 0.3f + playerSkill * 0.6f; // 0.3 to 0.9
    float targetFeintFreq = 0.2f + playerSkill * 0.4f; // 0.2 to 0.6
    float targetCooldown = 1.2f - playerSkill * 0.5f; // 1.2 to 0.7
    float targetReaction = 0.4f - playerSkill * 0.3f; // 0.4 to 0.1
    float targetVision = 0.35f + playerSkill * 0.25f; // 0.35 to 0.6
    float targetHearing = 0.4f + playerSkill * 0.3f; // 0.4 to 0.7
    
    // Smooth transitions
    g_difficulty.wolfSpeed += (targetSpeed - g_difficulty.wolfSpeed) * ADAPT_RATE;
    g_difficulty.wolfAggression += (targetAggression - g_difficulty.wolfAggression) * ADAPT_RATE;
    g_difficulty.wolfIntelligence += (targetIntelligence - g_difficulty.wolfIntelligence) * ADAPT_RATE;
    g_difficulty.packCoordination += (targetCoordination - g_difficulty.packCoordination) * ADAPT_RATE;
    g_difficulty.feintFrequency += (targetFeintFreq - g_difficulty.feintFrequency) * ADAPT_RATE;
    g_difficulty.attackCooldown += (targetCooldown - g_difficulty.attackCooldown) * ADAPT_RATE;
    g_difficulty.reactionDelay += (targetReaction - g_difficulty.reactionDelay) * ADAPT_RATE;
    g_difficulty.visionRange += (targetVision - g_difficulty.visionRange) * ADAPT_RATE;
    g_difficulty.hearingRange += (targetHearing - g_difficulty.hearingRange) * ADAPT_RATE;
    
    // Apply difficulty to existing wolves
    for (int i = 0; i < MAX_ENEMIES; ++i) {
        if (!g_enemies[i].active) continue;
        
        // Update wolf attributes based on difficulty
        g_enemies[i].aggression = g_difficulty.wolfAggression * (0.8f + rng_float01() * 0.4f);
        g_enemies[i].intelligence = g_difficulty.wolfIntelligence * (0.8f + rng_float01() * 0.4f);
        g_enemies[i].coordination = g_difficulty.packCoordination * (0.8f + rng_float01() * 0.4f);
    }
}

// Track player action for learning
static void record_player_action(const char* action, bool success) {
    if (strcmp(action, "dodge") == 0) {
        float oldRate = g_player_metrics.dodgeSuccessRate;
        g_player_metrics.dodgeSuccessRate = oldRate * 0.9f + (success ? 0.1f : 0.0f);
    } else if (strcmp(action, "block") == 0) {
        float oldRate = g_player_metrics.blockSuccessRate;
        g_player_metrics.blockSuccessRate = oldRate * 0.9f + (success ? 0.1f : 0.0f);
    } else if (strcmp(action, "kill") == 0) {
        if (success) {
            g_player_metrics.consecutiveKills++;
            g_player_metrics.consecutiveDeaths = 0;
            g_pack_last_failure_time = g_time_seconds;
        }
    } else if (strcmp(action, "death") == 0) {
        g_player_metrics.consecutiveDeaths++;
        g_player_metrics.consecutiveKills = 0;
        g_pack_last_success_time = g_time_seconds;
    }
}

// Apply difficulty modifiers to wolf parameters
static float apply_difficulty_modifier(float baseValue, const char* paramType) {
    if (strcmp(paramType, "speed") == 0) {
        return baseValue * g_difficulty.wolfSpeed;
    } else if (strcmp(paramType, "aggression") == 0) {
        return baseValue * g_difficulty.wolfAggression;
    } else if (strcmp(paramType, "vision") == 0) {
        return baseValue * g_difficulty.visionRange;
    } else if (strcmp(paramType, "hearing") == 0) {
        return baseValue * g_difficulty.hearingRange;
    } else if (strcmp(paramType, "cooldown") == 0) {
        return baseValue * g_difficulty.attackCooldown;
    } else if (strcmp(paramType, "feint") == 0) {
        return baseValue * g_difficulty.feintFrequency;
    }
    return baseValue;
}

// Main adaptive AI update function
static void update_adaptive_ai(float dt) {
    static float lastAdaptTime = 0.0f;
    
    // Update metrics
    update_player_metrics(dt);
    
    // Adapt difficulty every 10 seconds
    if (g_time_seconds - lastAdaptTime > 10.0f) {
        adapt_difficulty();
        lastAdaptTime = g_time_seconds;
    }
}