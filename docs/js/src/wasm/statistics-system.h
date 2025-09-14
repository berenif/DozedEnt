#pragma once

#include "internal_core.h"
#include <cstring>
#include <cmath>

// ============================================================================
// Statistics System - WASM Implementation  
// Comprehensive player performance tracking and analytics
// Based on WASM-first architecture principles
// ============================================================================

#define MAX_STAT_CATEGORIES 32
#define MAX_STAT_NAME_LENGTH 32
#define MAX_SESSION_HISTORY 100

// Statistic types
enum StatisticType {
    STAT_COUNTER,        // Simple incrementing counter
    STAT_ACCUMULATOR,    // Accumulates values over time
    STAT_MAXIMUM,        // Tracks maximum value achieved
    STAT_MINIMUM,        // Tracks minimum value achieved
    STAT_AVERAGE,        // Calculates running average
    STAT_RATE,           // Tracks rate per unit time
    STAT_PERCENTAGE,     // Tracks success/failure ratio
    STAT_DISTRIBUTION    // Tracks value distribution
};

// Time periods for statistics
enum StatisticPeriod {
    PERIOD_SESSION,      // Current play session
    PERIOD_DAILY,        // Last 24 hours
    PERIOD_WEEKLY,       // Last 7 days
    PERIOD_MONTHLY,      // Last 30 days
    PERIOD_ALL_TIME      // All recorded time
};

// Statistic categories
enum StatisticCategory {
    CATEGORY_COMBAT,     // Combat-related stats
    CATEGORY_SURVIVAL,   // Survival and endurance
    CATEGORY_ECONOMY,    // Gold, items, shopping
    CATEGORY_EXPLORATION,// Room clearing, discovery
    CATEGORY_PROGRESSION,// Leveling, experience
    CATEGORY_PERFORMANCE,// Accuracy, efficiency
    CATEGORY_SOCIAL,     // Multiplayer interactions
    CATEGORY_META        // Game system usage
};

// Individual statistic structure
struct GameStatistic {
    uint32_t id;
    StatisticType type;
    StatisticCategory category;
    char name[MAX_STAT_NAME_LENGTH];
    
    // Current values
    double currentValue;
    double sessionValue;
    double totalValue;
    
    // Historical tracking
    double dailyValues[7];     // Last 7 days
    double weeklyValues[4];    // Last 4 weeks
    double monthlyValues[12];  // Last 12 months
    
    // Additional data for complex stats
    uint32_t sampleCount;      // For averages
    double minimumValue;
    double maximumValue;
    uint64_t firstRecorded;    // Timestamp of first record
    uint64_t lastUpdated;      // Timestamp of last update
    
    // For percentage/ratio stats
    uint32_t successCount;
    uint32_t attemptCount;
};

// Session tracking structure
struct SessionStats {
    uint64_t startTime;
    uint64_t endTime;
    double duration;
    
    // Key metrics for this session
    uint32_t enemiesKilled;
    uint32_t roomsCleared;
    uint32_t damageDealt;
    uint32_t damageTaken;
    uint32_t goldEarned;
    uint32_t experienceGained;
    uint32_t achievementsUnlocked;
    
    // Performance metrics
    double accuracy;
    double efficiency;
    uint32_t perfectActions;
    uint32_t totalActions;
    
    // Game flow
    uint32_t phasesCompleted;
    uint32_t deathCount;
    uint32_t saveCount;
};

// Global statistics data
static GameStatistic g_statistics[MAX_STAT_CATEGORIES];
static uint32_t g_statistic_count = 0;
static SessionStats g_session_history[MAX_SESSION_HISTORY];
static uint32_t g_session_count = 0;
static uint32_t g_current_session_index = 0;

// Current session tracking
static SessionStats g_current_session;
static bool g_session_active = false;

// ============================================================================
// Statistics Initialization
// ============================================================================

// Forward declarations
void add_statistic(uint32_t id, StatisticType type, StatisticCategory category, const char* name);
void end_statistics_session();

void initialize_statistics_system() {
    g_statistic_count = 0;
    g_session_count = 0;
    g_current_session_index = 0;
    g_session_active = false;
    
    memset(g_statistics, 0, sizeof(g_statistics));
    memset(g_session_history, 0, sizeof(g_session_history));
    memset(&g_current_session, 0, sizeof(SessionStats));
    
    // Initialize core combat statistics
    add_statistic(1, STAT_COUNTER, CATEGORY_COMBAT, "Total Enemies Killed");
    add_statistic(2, STAT_COUNTER, CATEGORY_COMBAT, "Perfect Blocks Performed");
    add_statistic(3, STAT_COUNTER, CATEGORY_COMBAT, "Attacks Landed");
    add_statistic(4, STAT_COUNTER, CATEGORY_COMBAT, "Attacks Missed");
    add_statistic(5, STAT_ACCUMULATOR, CATEGORY_COMBAT, "Total Damage Dealt");
    add_statistic(6, STAT_ACCUMULATOR, CATEGORY_COMBAT, "Total Damage Taken");
    add_statistic(7, STAT_COUNTER, CATEGORY_COMBAT, "Rolls Executed");
    add_statistic(8, STAT_COUNTER, CATEGORY_COMBAT, "Successful Parries");
    
    // Survival statistics
    add_statistic(9, STAT_MAXIMUM, CATEGORY_SURVIVAL, "Longest Survival Time");
    add_statistic(10, STAT_COUNTER, CATEGORY_SURVIVAL, "Total Deaths");
    add_statistic(11, STAT_COUNTER, CATEGORY_SURVIVAL, "Games Completed");
    add_statistic(12, STAT_COUNTER, CATEGORY_SURVIVAL, "No-Hit Runs");
    add_statistic(13, STAT_MAXIMUM, CATEGORY_SURVIVAL, "Longest Win Streak");
    
    // Economy statistics
    add_statistic(14, STAT_ACCUMULATOR, CATEGORY_ECONOMY, "Total Gold Earned");
    add_statistic(15, STAT_ACCUMULATOR, CATEGORY_ECONOMY, "Total Gold Spent");
    add_statistic(16, STAT_ACCUMULATOR, CATEGORY_ECONOMY, "Total Essence Earned");
    add_statistic(17, STAT_COUNTER, CATEGORY_ECONOMY, "Items Purchased");
    add_statistic(18, STAT_COUNTER, CATEGORY_ECONOMY, "Rare Items Found");
    
    // Exploration statistics
    add_statistic(19, STAT_COUNTER, CATEGORY_EXPLORATION, "Total Rooms Cleared");
    add_statistic(20, STAT_COUNTER, CATEGORY_EXPLORATION, "Secret Areas Found");
    add_statistic(21, STAT_COUNTER, CATEGORY_EXPLORATION, "Treasure Chests Opened");
    add_statistic(22, STAT_MAXIMUM, CATEGORY_EXPLORATION, "Deepest Floor Reached");
    
    // Progression statistics
    add_statistic(23, STAT_MAXIMUM, CATEGORY_PROGRESSION, "Highest Level Reached");
    add_statistic(24, STAT_ACCUMULATOR, CATEGORY_PROGRESSION, "Total Experience Gained");
    add_statistic(25, STAT_COUNTER, CATEGORY_PROGRESSION, "Skills Unlocked");
    add_statistic(26, STAT_COUNTER, CATEGORY_PROGRESSION, "Achievements Earned");
    
    // Performance statistics
    add_statistic(27, STAT_PERCENTAGE, CATEGORY_PERFORMANCE, "Combat Accuracy");
    add_statistic(28, STAT_PERCENTAGE, CATEGORY_PERFORMANCE, "Block Success Rate");
    add_statistic(29, STAT_AVERAGE, CATEGORY_PERFORMANCE, "Average Session Score");
    add_statistic(30, STAT_RATE, CATEGORY_PERFORMANCE, "Kills Per Minute");
    
    // Meta statistics
    add_statistic(31, STAT_ACCUMULATOR, CATEGORY_META, "Total Play Time");
    add_statistic(32, STAT_COUNTER, CATEGORY_META, "Games Played");
}

void add_statistic(uint32_t id, StatisticType type, StatisticCategory category, const char* name) {
    if (g_statistic_count >= MAX_STAT_CATEGORIES) return;
    
    GameStatistic* stat = &g_statistics[g_statistic_count];
    
    stat->id = id;
    stat->type = type;
    stat->category = category;
    strncpy(stat->name, name, MAX_STAT_NAME_LENGTH - 1);
    stat->name[MAX_STAT_NAME_LENGTH - 1] = '\0';
    
    // Initialize values based on type
    stat->currentValue = 0.0;
    stat->sessionValue = 0.0;
    stat->totalValue = 0.0;
    stat->sampleCount = 0;
    stat->successCount = 0;
    stat->attemptCount = 0;
    
    if (type == STAT_MINIMUM) {
        stat->minimumValue = INFINITY;
        stat->maximumValue = 0.0;
    } else {
        stat->minimumValue = 0.0;
        stat->maximumValue = 0.0;
    }
    
    stat->firstRecorded = 0;
    stat->lastUpdated = 0;
    
    memset(stat->dailyValues, 0, sizeof(stat->dailyValues));
    memset(stat->weeklyValues, 0, sizeof(stat->weeklyValues));
    memset(stat->monthlyValues, 0, sizeof(stat->monthlyValues));
    
    g_statistic_count++;
}

// ============================================================================
// Session Management
// ============================================================================

void start_statistics_session() {
    if (g_session_active) {
        end_statistics_session();
    }
    
    memset(&g_current_session, 0, sizeof(SessionStats));
    g_current_session.startTime = (uint64_t)(g_time_seconds * 1000);
    g_session_active = true;
    
    // Reset session values for all statistics
    for (uint32_t i = 0; i < g_statistic_count; i++) {
        g_statistics[i].sessionValue = 0.0;
    }
}

void end_statistics_session() {
    if (!g_session_active) return;
    
    g_current_session.endTime = (uint64_t)(g_time_seconds * 1000);
    g_current_session.duration = (g_current_session.endTime - g_current_session.startTime) / 1000.0;
    
    // Calculate session performance metrics
    if (g_current_session.totalActions > 0) {
        g_current_session.accuracy = (double)g_current_session.perfectActions / g_current_session.totalActions;
    }
    
    if (g_current_session.duration > 0) {
        g_current_session.efficiency = g_current_session.enemiesKilled / g_current_session.duration;
    }
    
    // Store session in history
    if (g_session_count < MAX_SESSION_HISTORY) {
        g_session_history[g_session_count] = g_current_session;
        g_current_session_index = g_session_count;
        g_session_count++;
    } else {
        // Rotate history (remove oldest)
        for (uint32_t i = 0; i < MAX_SESSION_HISTORY - 1; i++) {
            g_session_history[i] = g_session_history[i + 1];
        }
        g_session_history[MAX_SESSION_HISTORY - 1] = g_current_session;
        g_current_session_index = MAX_SESSION_HISTORY - 1;
    }
    
    g_session_active = false;
}

// ============================================================================
// Statistics Recording Functions
// ============================================================================

GameStatistic* find_statistic_by_id(uint32_t id) {
    for (uint32_t i = 0; i < g_statistic_count; i++) {
        if (g_statistics[i].id == id) {
            return &g_statistics[i];
        }
    }
    return nullptr;
}

void record_statistic(uint32_t id, double value) {
    GameStatistic* stat = find_statistic_by_id(id);
    if (!stat) return;
    
    uint64_t currentTime = (uint64_t)(g_time_seconds * 1000);
    
    if (stat->firstRecorded == 0) {
        stat->firstRecorded = currentTime;
    }
    stat->lastUpdated = currentTime;
    
    switch (stat->type) {
        case STAT_COUNTER:
            stat->currentValue += value;
            stat->sessionValue += value;
            stat->totalValue += value;
            break;
            
        case STAT_ACCUMULATOR:
            stat->currentValue += value;
            stat->sessionValue += value;
            stat->totalValue += value;
            break;
            
        case STAT_MAXIMUM:
            if (value > stat->maximumValue) {
                stat->maximumValue = value;
                stat->currentValue = value;
            }
            if (value > stat->sessionValue) {
                stat->sessionValue = value;
            }
            break;
            
        case STAT_MINIMUM:
            if (value < stat->minimumValue || stat->minimumValue == INFINITY) {
                stat->minimumValue = value;
                stat->currentValue = value;
            }
            if (value < stat->sessionValue || stat->sessionValue == 0) {
                stat->sessionValue = value;
            }
            break;
            
        case STAT_AVERAGE:
            stat->totalValue += value;
            stat->sampleCount++;
            stat->currentValue = stat->totalValue / stat->sampleCount;
            stat->sessionValue = (stat->sessionValue * (stat->sampleCount - 1) + value) / stat->sampleCount;
            break;
            
        case STAT_RATE:
            // Rate calculations need time context
            if (g_session_active && g_current_session.duration > 0) {
                stat->sessionValue = stat->totalValue / g_current_session.duration;
                stat->currentValue = stat->sessionValue;
            }
            break;
            
        case STAT_PERCENTAGE:
            // This should be updated via record_percentage_statistic
            break;
            
        case STAT_DISTRIBUTION:
            // Complex distribution tracking would go here
            break;
    }
}

void record_percentage_statistic(uint32_t id, bool success) {
    GameStatistic* stat = find_statistic_by_id(id);
    if (!stat || stat->type != STAT_PERCENTAGE) return;
    
    stat->attemptCount++;
    if (success) {
        stat->successCount++;
    }
    
    if (stat->attemptCount > 0) {
        stat->currentValue = (double)stat->successCount / stat->attemptCount * 100.0;
        stat->totalValue = stat->currentValue;
    }
    
    stat->lastUpdated = (uint64_t)(g_time_seconds * 1000);
}

// ============================================================================
// Event Handlers for Automatic Statistics Recording
// ============================================================================

void on_enemy_killed_stats(uint32_t enemyType) {
    record_statistic(1, 1); // Total Enemies Killed
    g_current_session.enemiesKilled++;
    
    // Update kills per minute
    if (g_session_active && g_current_session.duration > 0) {
        double killsPerMinute = g_current_session.enemiesKilled / (g_current_session.duration / 60.0);
        record_statistic(30, killsPerMinute);
    }
}

void on_perfect_block_stats() {
    record_statistic(2, 1); // Perfect Blocks Performed
    record_statistic(8, 1); // Successful Parries
    g_current_session.perfectActions++;
    g_current_session.totalActions++;
    
    // Update block success rate
    record_percentage_statistic(28, true);
}

void on_attack_landed_stats(uint32_t damage) {
    record_statistic(3, 1); // Attacks Landed
    record_statistic(5, damage); // Total Damage Dealt
    g_current_session.damageDealt += damage;
    g_current_session.totalActions++;
    
    // Update combat accuracy
    record_percentage_statistic(27, true);
}

void on_attack_missed_stats() {
    record_statistic(4, 1); // Attacks Missed
    g_current_session.totalActions++;
    
    // Update combat accuracy
    record_percentage_statistic(27, false);
}

void on_damage_taken_stats(uint32_t damage) {
    record_statistic(6, damage); // Total Damage Taken
    g_current_session.damageTaken += damage;
}

void on_roll_executed_stats() {
    record_statistic(7, 1); // Rolls Executed
    g_current_session.totalActions++;
}

void on_player_death_stats() {
    record_statistic(10, 1); // Total Deaths
    g_current_session.deathCount++;
}

void on_game_completed_stats(double survivalTime) {
    record_statistic(9, survivalTime); // Longest Survival Time
    record_statistic(11, 1); // Games Completed
    
    // Check for no-hit run
    if (g_current_session.damageTaken == 0) {
        record_statistic(12, 1); // No-Hit Runs
    }
}

void on_gold_earned_stats(uint32_t amount) {
    record_statistic(14, amount); // Total Gold Earned
    g_current_session.goldEarned += amount;
}

void on_gold_spent_stats(uint32_t amount) {
    record_statistic(15, amount); // Total Gold Spent
}

void on_essence_earned_stats(uint32_t amount) {
    record_statistic(16, amount); // Total Essence Earned
}

void on_item_purchased_stats() {
    record_statistic(17, 1); // Items Purchased
}

void on_rare_item_found_stats() {
    record_statistic(18, 1); // Rare Items Found
}

void on_room_cleared_stats() {
    record_statistic(19, 1); // Total Rooms Cleared
    g_current_session.roomsCleared++;
}

void on_secret_found_stats() {
    record_statistic(20, 1); // Secret Areas Found
}

void on_treasure_opened_stats() {
    record_statistic(21, 1); // Treasure Chests Opened
}

void on_floor_reached_stats(uint32_t floor) {
    record_statistic(22, floor); // Deepest Floor Reached
}

void on_level_gained_stats(uint32_t level) {
    record_statistic(23, level); // Highest Level Reached
}

void on_experience_gained_stats(uint32_t experience) {
    record_statistic(24, experience); // Total Experience Gained
    g_current_session.experienceGained += experience;
}

void on_skill_unlocked_stats() {
    record_statistic(25, 1); // Skills Unlocked
}

void on_achievement_unlocked_stats() {
    record_statistic(26, 1); // Achievements Earned
    g_current_session.achievementsUnlocked++;
}

void on_game_played_stats() {
    record_statistic(32, 1); // Games Played
}

// ============================================================================
// WASM Export Functions
// ============================================================================

/**
 * Get statistic value by ID
 */
__attribute__((export_name("get_statistic_value")))
double get_statistic_value(uint32_t id, uint32_t period) {
    GameStatistic* stat = find_statistic_by_id(id);
    if (!stat) return 0.0;
    
    switch ((StatisticPeriod)period) {
        case PERIOD_SESSION:
            return stat->sessionValue;
        case PERIOD_ALL_TIME:
            return stat->totalValue;
        default:
            return stat->currentValue;
    }
}

/**
 * Get statistic count
 */
__attribute__((export_name("get_statistic_count")))
uint32_t get_statistic_count() {
    return g_statistic_count;
}

/**
 * Get statistic info by index
 */
__attribute__((export_name("get_statistic_info")))
const char* get_statistic_info(uint32_t index) {
    static char infoBuffer[256];
    
    if (index >= g_statistic_count) {
        strcpy(infoBuffer, "Invalid index");
        return infoBuffer;
    }
    
    GameStatistic* stat = &g_statistics[index];
    
    snprintf(infoBuffer, sizeof(infoBuffer),
        "{"
        "\"id\":%d,"
        "\"name\":\"%s\","
        "\"type\":%d,"
        "\"category\":%d,"
        "\"current\":%.2f,"
        "\"session\":%.2f,"
        "\"total\":%.2f,"
        "\"minimum\":%.2f,"
        "\"maximum\":%.2f"
        "}",
        stat->id,
        stat->name,
        stat->type,
        stat->category,
        stat->currentValue,
        stat->sessionValue,
        stat->totalValue,
        stat->minimumValue,
        stat->maximumValue
    );
    
    return infoBuffer;
}

/**
 * Get current session statistics
 */
__attribute__((export_name("get_session_stats")))
const char* get_session_stats() {
    static char sessionBuffer[512];
    
    if (!g_session_active) {
        strcpy(sessionBuffer, "No active session");
        return sessionBuffer;
    }
    
    double currentDuration = (g_time_seconds * 1000 - g_current_session.startTime) / 1000.0;
    
    snprintf(sessionBuffer, sizeof(sessionBuffer),
        "{"
        "\"duration\":%.2f,"
        "\"enemiesKilled\":%d,"
        "\"roomsCleared\":%d,"
        "\"damageDealt\":%d,"
        "\"damageTaken\":%d,"
        "\"goldEarned\":%d,"
        "\"experienceGained\":%d,"
        "\"achievementsUnlocked\":%d,"
        "\"accuracy\":%.2f,"
        "\"efficiency\":%.2f,"
        "\"perfectActions\":%d,"
        "\"totalActions\":%d,"
        "\"deathCount\":%d"
        "}",
        currentDuration,
        g_current_session.enemiesKilled,
        g_current_session.roomsCleared,
        g_current_session.damageDealt,
        g_current_session.damageTaken,
        g_current_session.goldEarned,
        g_current_session.experienceGained,
        g_current_session.achievementsUnlocked,
        g_current_session.totalActions > 0 ? (double)g_current_session.perfectActions / g_current_session.totalActions * 100.0 : 0.0,
        currentDuration > 0 ? g_current_session.enemiesKilled / currentDuration : 0.0,
        g_current_session.perfectActions,
        g_current_session.totalActions,
        g_current_session.deathCount
    );
    
    return sessionBuffer;
}

/**
 * Start new statistics session
 */
__attribute__((export_name("start_stats_session")))
void start_stats_session() {
    start_statistics_session();
}

/**
 * End current statistics session
 */
__attribute__((export_name("end_stats_session")))
void end_stats_session() {
    end_statistics_session();
}

/**
 * Reset all statistics
 */
__attribute__((export_name("reset_all_statistics")))
void reset_all_statistics() {
    for (uint32_t i = 0; i < g_statistic_count; i++) {
        GameStatistic* stat = &g_statistics[i];
        stat->currentValue = 0.0;
        stat->sessionValue = 0.0;
        stat->totalValue = 0.0;
        stat->sampleCount = 0;
        stat->successCount = 0;
        stat->attemptCount = 0;
        stat->minimumValue = (stat->type == STAT_MINIMUM) ? INFINITY : 0.0;
        stat->maximumValue = 0.0;
        stat->firstRecorded = 0;
        stat->lastUpdated = 0;
        
        memset(stat->dailyValues, 0, sizeof(stat->dailyValues));
        memset(stat->weeklyValues, 0, sizeof(stat->weeklyValues));
        memset(stat->monthlyValues, 0, sizeof(stat->monthlyValues));
    }
    
    g_session_count = 0;
    memset(g_session_history, 0, sizeof(g_session_history));
}
