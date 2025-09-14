#pragma once

#include "internal_core.h"
#include <cstring>

// ============================================================================
// Achievement System - WASM Implementation
// Handles achievement tracking, unlocking, and progress monitoring
// Based on WASM-first architecture principles
// ============================================================================

#define MAX_ACHIEVEMENTS 64
#define MAX_ACHIEVEMENT_NAME_LENGTH 32
#define MAX_ACHIEVEMENT_DESC_LENGTH 128

// Achievement types
enum AchievementType {
    ACHIEVEMENT_KILL_COUNT,        // Kill X enemies
    ACHIEVEMENT_DAMAGE_DEALT,      // Deal X total damage
    ACHIEVEMENT_PERFECT_BLOCKS,    // Perform X perfect blocks
    ACHIEVEMENT_ROOMS_CLEARED,     // Clear X rooms
    ACHIEVEMENT_GOLD_COLLECTED,    // Collect X gold
    ACHIEVEMENT_SURVIVAL_TIME,     // Survive for X seconds
    ACHIEVEMENT_CONSECUTIVE_WINS,  // Win X games in a row
    ACHIEVEMENT_PHASE_SPECIFIC,    // Complete specific phase actions
    ACHIEVEMENT_SPECIAL_CONDITION, // Special gameplay conditions
    ACHIEVEMENT_COLLECTION,        // Collect specific items
    ACHIEVEMENT_MASTERY           // Master specific skills
};

// Achievement rarity levels
enum AchievementRarity {
    RARITY_COMMON = 0,
    RARITY_UNCOMMON = 1,
    RARITY_RARE = 2,
    RARITY_EPIC = 3,
    RARITY_LEGENDARY = 4
};

// Achievement flags
#define ACHIEVEMENT_HIDDEN      (1 << 0)  // Hidden until unlocked
#define ACHIEVEMENT_PROGRESSIVE (1 << 1)  // Shows progress
#define ACHIEVEMENT_SECRET      (1 << 2)  // Secret achievement
#define ACHIEVEMENT_MISSABLE    (1 << 3)  // Can be missed permanently

// Achievement structure
struct Achievement {
    uint32_t id;
    AchievementType type;
    AchievementRarity rarity;
    uint32_t flags;
    
    char name[MAX_ACHIEVEMENT_NAME_LENGTH];
    char description[MAX_ACHIEVEMENT_DESC_LENGTH];
    
    uint32_t targetValue;      // Target value to reach
    uint32_t currentProgress;  // Current progress
    bool unlocked;             // Whether achievement is unlocked
    uint64_t unlockedTime;     // When it was unlocked (timestamp)
    
    // Rewards
    uint32_t goldReward;
    uint32_t essenceReward;
    uint32_t experienceReward;
    
    // Conditions
    uint32_t requiredPhase;    // Specific phase requirement (0 = any)
    uint32_t requiredWeapon;   // Specific weapon requirement (0 = any)
    uint32_t requiredLevel;    // Minimum level requirement
};

// Global achievement data
static Achievement g_achievements[MAX_ACHIEVEMENTS];
static uint32_t g_achievement_count = 0;
static uint64_t g_achievement_flags = 0;     // Bitfield for unlocked achievements
static uint32_t g_achievement_progress[MAX_ACHIEVEMENTS];
static uint32_t g_newly_unlocked[8] = {0};   // Recently unlocked achievements (for UI)
static uint32_t g_newly_unlocked_count = 0;

// Statistics for achievement tracking
static uint32_t g_session_kills = 0;
static uint32_t g_session_damage = 0;
static uint32_t g_session_blocks = 0;
static uint32_t g_consecutive_wins = 0;
static float g_session_start_time = 0;

// ============================================================================
// Achievement Definitions
// ============================================================================

// Forward declarations
void add_achievement(uint32_t id, AchievementType type, AchievementRarity rarity, uint32_t flags,
                    const char* name, const char* description, uint32_t targetValue,
                    uint32_t goldReward, uint32_t essenceReward, uint32_t experienceReward);
void unlock_achievement(uint32_t achievementId);
void trigger_achievement_effects(uint32_t achievementId);
Achievement* get_achievement_by_id(uint32_t id);
void check_special_achievements();
void check_room_achievements();

void initialize_achievements() {
    g_achievement_count = 0;
    memset(g_achievements, 0, sizeof(g_achievements));
    memset(g_achievement_progress, 0, sizeof(g_achievement_progress));
    
    // Combat achievements
    add_achievement(1, ACHIEVEMENT_KILL_COUNT, RARITY_COMMON, 0,
        "First Blood", "Kill your first enemy", 1, 10, 0, 50);
    
    add_achievement(2, ACHIEVEMENT_KILL_COUNT, RARITY_UNCOMMON, ACHIEVEMENT_PROGRESSIVE,
        "Wolf Slayer", "Kill 50 wolves", 50, 25, 5, 100);
    
    add_achievement(3, ACHIEVEMENT_KILL_COUNT, RARITY_RARE, ACHIEVEMENT_PROGRESSIVE,
        "Apex Predator", "Kill 200 enemies", 200, 50, 15, 200);
    
    add_achievement(4, ACHIEVEMENT_KILL_COUNT, RARITY_LEGENDARY, ACHIEVEMENT_PROGRESSIVE,
        "Death Incarnate", "Kill 1000 enemies", 1000, 200, 50, 500);
    
    // Perfect combat achievements
    add_achievement(5, ACHIEVEMENT_PERFECT_BLOCKS, RARITY_UNCOMMON, ACHIEVEMENT_PROGRESSIVE,
        "Perfect Defense", "Perform 25 perfect blocks", 25, 30, 10, 150);
    
    add_achievement(6, ACHIEVEMENT_PERFECT_BLOCKS, RARITY_EPIC, ACHIEVEMENT_PROGRESSIVE,
        "Parry Master", "Perform 100 perfect blocks", 100, 75, 25, 300);
    
    // Survival achievements
    add_achievement(7, ACHIEVEMENT_SURVIVAL_TIME, RARITY_COMMON, 0,
        "Survivor", "Survive for 5 minutes", 300, 15, 0, 75);
    
    add_achievement(8, ACHIEVEMENT_SURVIVAL_TIME, RARITY_RARE, ACHIEVEMENT_PROGRESSIVE,
        "Endurance Test", "Survive for 30 minutes", 1800, 100, 30, 400);
    
    // Progression achievements
    add_achievement(9, ACHIEVEMENT_ROOMS_CLEARED, RARITY_COMMON, ACHIEVEMENT_PROGRESSIVE,
        "Explorer", "Clear 10 rooms", 10, 20, 5, 100);
    
    add_achievement(10, ACHIEVEMENT_ROOMS_CLEARED, RARITY_UNCOMMON, ACHIEVEMENT_PROGRESSIVE,
        "Dungeon Crawler", "Clear 50 rooms", 50, 40, 15, 200);
    
    add_achievement(11, ACHIEVEMENT_ROOMS_CLEARED, RARITY_EPIC, ACHIEVEMENT_PROGRESSIVE,
        "Master Explorer", "Clear 200 rooms", 200, 100, 40, 500);
    
    // Economic achievements
    add_achievement(12, ACHIEVEMENT_GOLD_COLLECTED, RARITY_COMMON, ACHIEVEMENT_PROGRESSIVE,
        "Treasure Hunter", "Collect 1000 gold", 1000, 25, 0, 125);
    
    add_achievement(13, ACHIEVEMENT_GOLD_COLLECTED, RARITY_RARE, ACHIEVEMENT_PROGRESSIVE,
        "Golden Touch", "Collect 10000 gold", 10000, 75, 25, 350);
    
    // Special condition achievements
    add_achievement(14, ACHIEVEMENT_SPECIAL_CONDITION, RARITY_EPIC, ACHIEVEMENT_SECRET,
        "Untouchable", "Complete a room without taking damage", 1, 100, 30, 400);
    
    add_achievement(15, ACHIEVEMENT_SPECIAL_CONDITION, RARITY_LEGENDARY, ACHIEVEMENT_SECRET | ACHIEVEMENT_HIDDEN,
        "Ghost Walker", "Complete 10 rooms without being detected", 10, 250, 75, 750);
    
    // Mastery achievements
    add_achievement(16, ACHIEVEMENT_MASTERY, RARITY_RARE, 0,
        "Combat Expert", "Master all basic combat techniques", 1, 60, 20, 250);
    
    add_achievement(17, ACHIEVEMENT_MASTERY, RARITY_LEGENDARY, ACHIEVEMENT_HIDDEN,
        "Legendary Warrior", "Achieve perfection in combat", 1, 500, 100, 1000);
    
    // Phase-specific achievements
    add_achievement(18, ACHIEVEMENT_PHASE_SPECIFIC, RARITY_UNCOMMON, 0,
        "Risk Taker", "Complete 5 risk phases successfully", 5, 40, 10, 180);
    
    add_achievement(19, ACHIEVEMENT_PHASE_SPECIFIC, RARITY_RARE, 0,
        "High Roller", "Complete a risk phase with 5x multiplier", 1, 80, 25, 350);
    
    // Consecutive achievements
    add_achievement(20, ACHIEVEMENT_CONSECUTIVE_WINS, RARITY_RARE, ACHIEVEMENT_PROGRESSIVE,
        "Win Streak", "Win 5 games in a row", 5, 60, 20, 300);
    
    add_achievement(21, ACHIEVEMENT_CONSECUTIVE_WINS, RARITY_LEGENDARY, ACHIEVEMENT_PROGRESSIVE,
        "Unstoppable", "Win 20 games in a row", 20, 200, 75, 800);
}

void add_achievement(uint32_t id, AchievementType type, AchievementRarity rarity, uint32_t flags,
                    const char* name, const char* description, uint32_t targetValue,
                    uint32_t goldReward, uint32_t essenceReward, uint32_t experienceReward) {
    
    if (g_achievement_count >= MAX_ACHIEVEMENTS) return;
    
    Achievement* achievement = &g_achievements[g_achievement_count];
    
    achievement->id = id;
    achievement->type = type;
    achievement->rarity = rarity;
    achievement->flags = flags;
    achievement->targetValue = targetValue;
    achievement->currentProgress = 0;
    achievement->unlocked = false;
    achievement->unlockedTime = 0;
    achievement->goldReward = goldReward;
    achievement->essenceReward = essenceReward;
    achievement->experienceReward = experienceReward;
    achievement->requiredPhase = 0;
    achievement->requiredWeapon = 0;
    achievement->requiredLevel = 0;
    
    strncpy(achievement->name, name, MAX_ACHIEVEMENT_NAME_LENGTH - 1);
    strncpy(achievement->description, description, MAX_ACHIEVEMENT_DESC_LENGTH - 1);
    achievement->name[MAX_ACHIEVEMENT_NAME_LENGTH - 1] = '\0';
    achievement->description[MAX_ACHIEVEMENT_DESC_LENGTH - 1] = '\0';
    
    g_achievement_count++;
}

// ============================================================================
// Achievement Tracking Functions
// ============================================================================

void update_achievement_progress(uint32_t achievementId, uint32_t progress) {
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].id == achievementId && !g_achievements[i].unlocked) {
            g_achievements[i].currentProgress = progress;
            g_achievement_progress[i] = progress;
            
            // Check if achievement is unlocked
            if (progress >= g_achievements[i].targetValue) {
                unlock_achievement(achievementId);
            }
            break;
        }
    }
}

void increment_achievement_progress(uint32_t achievementId, uint32_t increment = 1) {
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].id == achievementId && !g_achievements[i].unlocked) {
            g_achievements[i].currentProgress += increment;
            g_achievement_progress[i] = g_achievements[i].currentProgress;
            
            // Check if achievement is unlocked
            if (g_achievements[i].currentProgress >= g_achievements[i].targetValue) {
                unlock_achievement(achievementId);
            }
            break;
        }
    }
}

void unlock_achievement(uint32_t achievementId) {
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].id == achievementId && !g_achievements[i].unlocked) {
            g_achievements[i].unlocked = true;
            g_achievements[i].unlockedTime = (uint64_t)(g_time_seconds * 1000);
            g_achievement_flags |= (1ULL << (achievementId - 1));
            
            // Grant rewards
            g_gold += g_achievements[i].goldReward;
            g_essence += g_achievements[i].essenceReward;
            g_experience += g_achievements[i].experienceReward;
            
            // Add to newly unlocked list for UI notification
            if (g_newly_unlocked_count < 8) {
                g_newly_unlocked[g_newly_unlocked_count] = achievementId;
                g_newly_unlocked_count++;
            }
            
            // Trigger achievement unlock effects
            trigger_achievement_effects(achievementId);
            break;
        }
    }
}

void trigger_achievement_effects(uint32_t achievementId) {
    // Visual and audio effects for achievement unlock
    // This would trigger JavaScript events for UI feedback
    
    Achievement* achievement = get_achievement_by_id(achievementId);
    if (!achievement) return;
    
    // Different effects based on rarity
    switch (achievement->rarity) {
        case RARITY_COMMON:
            // Simple notification
            break;
        case RARITY_UNCOMMON:
            // Enhanced notification with sound
            break;
        case RARITY_RARE:
            // Screen flash and special sound
            break;
        case RARITY_EPIC:
            // Screen shake, particles, and fanfare
            break;
        case RARITY_LEGENDARY:
            // Full screen celebration with extended effects
            break;
    }
}

Achievement* get_achievement_by_id(uint32_t achievementId) {
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].id == achievementId) {
            return &g_achievements[i];
        }
    }
    return nullptr;
}

// ============================================================================
// Event Handlers for Achievement Tracking
// ============================================================================

void on_enemy_killed(uint32_t enemyType) {
    g_session_kills++;
    
    // Update kill-based achievements
    increment_achievement_progress(1); // First Blood
    increment_achievement_progress(2); // Wolf Slayer
    increment_achievement_progress(3); // Apex Predator
    increment_achievement_progress(4); // Death Incarnate
    
    // Check for special conditions
    check_special_achievements();
}

void on_perfect_block() {
    g_session_blocks++;
    
    // Update perfect block achievements
    increment_achievement_progress(5); // Perfect Defense
    increment_achievement_progress(6); // Parry Master
}

void on_room_cleared() {
    // Room cleared - increment session counter
    
    // Update room clearing achievements
    increment_achievement_progress(9);  // Explorer
    increment_achievement_progress(10); // Dungeon Crawler
    increment_achievement_progress(11); // Master Explorer
    
    // Check for special room completion conditions
    check_room_achievements();
}

void on_gold_collected(uint32_t amount) {
    // Update gold collection achievements
    increment_achievement_progress(12, amount); // Treasure Hunter
    increment_achievement_progress(13, amount); // Golden Touch
}

void on_damage_dealt(uint32_t damage) {
    g_session_damage += damage;
}

void on_game_won() {
    g_consecutive_wins++;
    
    // Update win streak achievements
    update_achievement_progress(20, g_consecutive_wins); // Win Streak
    update_achievement_progress(21, g_consecutive_wins); // Unstoppable
}

void on_game_lost() {
    g_consecutive_wins = 0; // Reset win streak
}

void on_phase_completed(GamePhase phase) {
    if (phase == GamePhase::Risk) {
        increment_achievement_progress(18); // Risk Taker
        
        // Check for high multiplier
        if (g_risk_multiplier >= 5.0f) {
            increment_achievement_progress(19); // High Roller
        }
    }
}

void check_special_achievements() {
    // Check for "Untouchable" - complete room without damage
    static uint32_t damageAtRoomStart = 0;
    static bool roomStartTracked = false;
    
    if (g_phase == GamePhase::Explore && !roomStartTracked) {
        damageAtRoomStart = g_session_damage;
        roomStartTracked = true;
    }
    
    if (g_phase == GamePhase::Choose && roomStartTracked) {
        if (g_session_damage == damageAtRoomStart) {
            increment_achievement_progress(14); // Untouchable
        }
        roomStartTracked = false;
    }
}

void check_room_achievements() {
    // Additional room-based achievement checks can be added here
}

void check_survival_achievements() {
    float survivalTime = g_time_seconds - g_session_start_time;
    
    // Update survival time achievements
    if (survivalTime >= 300) { // 5 minutes
        update_achievement_progress(7, 1); // Survivor
    }
    
    if (survivalTime >= 1800) { // 30 minutes
        update_achievement_progress(8, 1); // Endurance Test
    }
}

void check_mastery_achievements() {
    // Check for combat mastery
    bool combatMastery = (g_session_blocks >= 50 && 
                         g_session_kills >= 100);
    
    if (combatMastery) {
        update_achievement_progress(16, 1); // Combat Expert
    }
    
    // Check for legendary mastery (very high standards)
    bool legendaryMastery = (g_session_blocks >= 500 &&
                            g_session_kills >= 1000 &&
                            g_consecutive_wins >= 10);
    
    if (legendaryMastery) {
        update_achievement_progress(17, 1); // Legendary Warrior
    }
}

// ============================================================================
// WASM Export Functions
// ============================================================================

__attribute__((export_name("get_achievement_count")))
uint32_t get_achievement_count() {
    return g_achievement_count;
}

__attribute__((export_name("get_achievement_id")))
uint32_t get_achievement_id(uint32_t index) {
    if (index >= g_achievement_count) return 0;
    return g_achievements[index].id;
}

__attribute__((export_name("get_achievement_name")))
const char* get_achievement_name(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->name : "";
}

__attribute__((export_name("get_achievement_description")))
const char* get_achievement_description(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->description : "";
}

__attribute__((export_name("get_achievement_progress")))
uint32_t get_achievement_progress(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->currentProgress : 0;
}

__attribute__((export_name("get_achievement_target")))
uint32_t get_achievement_target(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->targetValue : 0;
}

__attribute__((export_name("is_achievement_unlocked")))
int is_achievement_unlocked(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return (achievement && achievement->unlocked) ? 1 : 0;
}

__attribute__((export_name("get_achievement_rarity")))
uint32_t get_achievement_rarity(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? (uint32_t)achievement->rarity : 0;
}

__attribute__((export_name("get_achievement_flags")))
uint32_t get_achievement_flags(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->flags : 0;
}

__attribute__((export_name("get_unlocked_achievements_flags")))
uint64_t get_unlocked_achievements_flags() {
    return g_achievement_flags;
}

__attribute__((export_name("get_newly_unlocked_count")))
uint32_t get_newly_unlocked_count() {
    return g_newly_unlocked_count;
}

__attribute__((export_name("get_newly_unlocked_id")))
uint32_t get_newly_unlocked_id(uint32_t index) {
    if (index >= g_newly_unlocked_count) return 0;
    return g_newly_unlocked[index];
}

__attribute__((export_name("clear_newly_unlocked")))
void clear_newly_unlocked() {
    g_newly_unlocked_count = 0;
    memset(g_newly_unlocked, 0, sizeof(g_newly_unlocked));
}

__attribute__((export_name("get_achievement_unlock_time")))
uint64_t get_achievement_unlock_time(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    return achievement ? achievement->unlockedTime : 0;
}

__attribute__((export_name("get_total_achievement_score")))
uint32_t get_total_achievement_score() {
    uint32_t totalScore = 0;
    
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].unlocked) {
            // Score based on rarity
            switch (g_achievements[i].rarity) {
                case RARITY_COMMON: totalScore += 10; break;
                case RARITY_UNCOMMON: totalScore += 25; break;
                case RARITY_RARE: totalScore += 50; break;
                case RARITY_EPIC: totalScore += 100; break;
                case RARITY_LEGENDARY: totalScore += 250; break;
            }
        }
    }
    
    return totalScore;
}

__attribute__((export_name("get_achievement_completion_percentage")))
float get_achievement_completion_percentage() {
    if (g_achievement_count == 0) return 0.0f;
    
    uint32_t unlockedCount = 0;
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        if (g_achievements[i].unlocked) {
            unlockedCount++;
        }
    }
    
    return (float)unlockedCount / (float)g_achievement_count * 100.0f;
}

__attribute__((export_name("force_unlock_achievement")))
int force_unlock_achievement(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    if (achievement && !achievement->unlocked) {
        unlock_achievement(achievementId);
        return 1;
    }
    return 0;
}

__attribute__((export_name("reset_achievement_progress")))
void reset_achievement_progress(uint32_t achievementId) {
    Achievement* achievement = get_achievement_by_id(achievementId);
    if (achievement) {
        achievement->currentProgress = 0;
        achievement->unlocked = false;
        achievement->unlockedTime = 0;
        g_achievement_flags &= ~(1ULL << (achievementId - 1));
    }
}

__attribute__((export_name("reset_all_achievements")))
void reset_all_achievements() {
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        g_achievements[i].currentProgress = 0;
        g_achievements[i].unlocked = false;
        g_achievements[i].unlockedTime = 0;
    }
    
    g_achievement_flags = 0;
    g_newly_unlocked_count = 0;
    memset(g_newly_unlocked, 0, sizeof(g_newly_unlocked));
    memset(g_achievement_progress, 0, sizeof(g_achievement_progress));
}

__attribute__((export_name("update_achievements")))
void update_achievements() {
    // Called periodically to check for time-based and complex achievements
    check_survival_achievements();
    check_mastery_achievements();
}

__attribute__((export_name("init_achievement_system")))
void init_achievement_system() {
    initialize_achievements();
    g_session_start_time = g_time_seconds;
    g_session_kills = 0;
    g_session_damage = 0;
    g_session_blocks = 0;
}

/**
 * Reinitialize achievement system after loading save data
 */
void reinitialize_achievement_system() {
    // Restore achievement progress from loaded data
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        Achievement* achievement = &g_achievements[i];
        
        // Check if achievement was unlocked (using bit flags)
        bool wasUnlocked = (g_achievement_flags & (1ULL << (achievement->id - 1))) != 0;
        
        if (wasUnlocked && !achievement->unlocked) {
            achievement->unlocked = true;
            // Don't trigger unlock event since it was already unlocked
        }
        
        // Restore progress from global progress array
        if (achievement->id <= 32) {
            achievement->currentProgress = g_achievement_progress[achievement->id - 1];
        }
    }
}

/**
 * Get achievement information as JSON string
 */
__attribute__((export_name("get_achievement_info_json")))
const char* get_achievement_info_json(uint32_t achievementId) {
    static char jsonBuffer[512];
    
    Achievement* achievement = get_achievement_by_id(achievementId);
    if (!achievement) {
        strcpy(jsonBuffer, "{}");
        return jsonBuffer;
    }
    
    const char* rarityNames[] = {"Common", "Uncommon", "Rare", "Epic", "Legendary"};
    const char* rarityName = (achievement->rarity < 5) ? rarityNames[achievement->rarity] : "Unknown";
    
    snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{"
        "\"id\":%d,"
        "\"name\":\"%s\","
        "\"description\":\"%s\","
        "\"type\":%d,"
        "\"rarity\":\"%s\","
        "\"rarityLevel\":%d,"
        "\"flags\":%d,"
        "\"progress\":%d,"
        "\"target\":%d,"
        "\"unlocked\":%s,"
        "\"unlockedTime\":%llu,"
        "\"goldReward\":%d,"
        "\"essenceReward\":%d,"
        "\"experienceReward\":%d,"
        "\"isHidden\":%s,"
        "\"isProgressive\":%s,"
        "\"isSecret\":%s"
        "}",
        achievement->id,
        achievement->name,
        achievement->description,
        achievement->type,
        rarityName,
        achievement->rarity,
        achievement->flags,
        achievement->currentProgress,
        achievement->targetValue,
        achievement->unlocked ? "true" : "false",
        achievement->unlockedTime,
        achievement->goldReward,
        achievement->essenceReward,
        achievement->experienceReward,
        (achievement->flags & ACHIEVEMENT_HIDDEN) ? "true" : "false",
        (achievement->flags & ACHIEVEMENT_PROGRESSIVE) ? "true" : "false",
        (achievement->flags & ACHIEVEMENT_SECRET) ? "true" : "false"
    );
    
    return jsonBuffer;
}

/**
 * Get all achievements summary as JSON
 */
__attribute__((export_name("get_achievements_summary_json")))
const char* get_achievements_summary_json() {
    static char summaryBuffer[2048];
    
    uint32_t totalAchievements = g_achievement_count;
    uint32_t unlockedAchievements = 0;
    uint32_t totalScore = 0;
    uint32_t rarityCount[5] = {0}; // Count by rarity
    uint32_t rarityUnlocked[5] = {0}; // Unlocked by rarity
    
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        Achievement* achievement = &g_achievements[i];
        
        if (achievement->rarity < 5) {
            rarityCount[achievement->rarity]++;
            
            if (achievement->unlocked) {
                rarityUnlocked[achievement->rarity]++;
                unlockedAchievements++;
                
                // Calculate score based on rarity
                switch (achievement->rarity) {
                    case RARITY_COMMON: totalScore += 10; break;
                    case RARITY_UNCOMMON: totalScore += 25; break;
                    case RARITY_RARE: totalScore += 50; break;
                    case RARITY_EPIC: totalScore += 100; break;
                    case RARITY_LEGENDARY: totalScore += 250; break;
                }
            }
        }
    }
    
    float completionPercentage = totalAchievements > 0 ? 
        (float)unlockedAchievements / (float)totalAchievements * 100.0f : 0.0f;
    
    snprintf(summaryBuffer, sizeof(summaryBuffer),
        "{"
        "\"totalAchievements\":%d,"
        "\"unlockedAchievements\":%d,"
        "\"completionPercentage\":%.1f,"
        "\"totalScore\":%d,"
        "\"rarityBreakdown\":{"
        "\"common\":{\"total\":%d,\"unlocked\":%d},"
        "\"uncommon\":{\"total\":%d,\"unlocked\":%d},"
        "\"rare\":{\"total\":%d,\"unlocked\":%d},"
        "\"epic\":{\"total\":%d,\"unlocked\":%d},"
        "\"legendary\":{\"total\":%d,\"unlocked\":%d}"
        "},"
        "\"newlyUnlockedCount\":%d"
        "}",
        totalAchievements,
        unlockedAchievements,
        completionPercentage,
        totalScore,
        rarityCount[0], rarityUnlocked[0], // Common
        rarityCount[1], rarityUnlocked[1], // Uncommon
        rarityCount[2], rarityUnlocked[2], // Rare
        rarityCount[3], rarityUnlocked[3], // Epic
        rarityCount[4], rarityUnlocked[4], // Legendary
        g_newly_unlocked_count
    );
    
    return summaryBuffer;
}

/**
 * Get achievements by category
 */
__attribute__((export_name("get_achievements_by_category_json")))
const char* get_achievements_by_category_json(uint32_t categoryFilter) {
    static char categoryBuffer[1024];
    
    // This is a simplified version - in a real implementation you'd want
    // to categorize achievements and return filtered results
    strcpy(categoryBuffer, "{\"achievements\":[");
    
    bool first = true;
    for (uint32_t i = 0; i < g_achievement_count; i++) {
        Achievement* achievement = &g_achievements[i];
        
        // Simple category filtering based on achievement type
        bool includeInCategory = false;
        switch (categoryFilter) {
            case 0: // Combat
                includeInCategory = (achievement->type == ACHIEVEMENT_KILL_COUNT ||
                                   achievement->type == ACHIEVEMENT_DAMAGE_DEALT ||
                                   achievement->type == ACHIEVEMENT_PERFECT_BLOCKS);
                break;
            case 1: // Survival
                includeInCategory = (achievement->type == ACHIEVEMENT_SURVIVAL_TIME ||
                                   achievement->type == ACHIEVEMENT_CONSECUTIVE_WINS);
                break;
            case 2: // Exploration
                includeInCategory = (achievement->type == ACHIEVEMENT_ROOMS_CLEARED ||
                                   achievement->type == ACHIEVEMENT_COLLECTION);
                break;
            case 3: // Economy
                includeInCategory = (achievement->type == ACHIEVEMENT_GOLD_COLLECTED);
                break;
            default:
                includeInCategory = true; // All achievements
                break;
        }
        
        if (includeInCategory) {
            if (!first) {
                strcat(categoryBuffer, ",");
            }
            
            char achievementEntry[128];
            snprintf(achievementEntry, sizeof(achievementEntry),
                "{\"id\":%d,\"name\":\"%s\",\"unlocked\":%s,\"progress\":%d,\"target\":%d}",
                achievement->id,
                achievement->name,
                achievement->unlocked ? "true" : "false",
                achievement->currentProgress,
                achievement->targetValue
            );
            
            strcat(categoryBuffer, achievementEntry);
            first = false;
        }
    }
    
    strcat(categoryBuffer, "]}");
    return categoryBuffer;
}

/**
 * Trigger achievement check for specific event
 */
__attribute__((export_name("trigger_achievement_event")))
void trigger_achievement_event(uint32_t eventType, uint32_t value) {
    switch (eventType) {
        case 0: // Enemy killed
            on_enemy_killed(value);
            break;
        case 1: // Perfect block
            on_perfect_block();
            break;
        case 2: // Room cleared
            on_room_cleared();
            break;
        case 3: // Gold collected
            on_gold_collected(value);
            break;
        case 4: // Damage dealt
            on_damage_dealt(value);
            break;
        case 5: // Game won
            on_game_won();
            break;
        case 6: // Game lost
            on_game_lost();
            break;
        case 7: // Phase completed
            on_phase_completed((GamePhase)value);
            break;
        default:
            break;
    }
}