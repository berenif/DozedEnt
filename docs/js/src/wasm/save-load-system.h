#pragma once

#include "internal_core.h"
#include <cstring>
#include <cstdlib>

// ============================================================================
// Save/Load System - WASM Implementation
// Handles game state serialization and deserialization for save games
// Based on WASM-first architecture principles
// ============================================================================

// Save data version for compatibility checking
#define SAVE_DATA_VERSION 1
#define MAX_SAVE_DATA_SIZE 8192

// Save data header structure
struct SaveDataHeader {
    uint32_t version;
    uint32_t dataSize;
    uint32_t checksum;
    uint64_t timestamp;
    char gameVersion[16];
    uint32_t reserved[4];
};

// Complete game state for saving
struct GameSaveData {
    SaveDataHeader header;
    
    // Core game state
    float playerX, playerY;
    float stamina;
    int health, maxHealth;
    int currentPhase;
    int roomCount;
    uint64_t seed;
    
    // Player progression
    int level;
    int experience;
    int skillPoints;
    uint32_t unlockedSkills;
    
    // Inventory and equipment
    int gold, essence;
    int currentWeapon;
    int equippedArmor;
    uint32_t inventory[32]; // Item IDs
    uint32_t inventoryCount;
    
    // Choice history and progression
    uint32_t choiceHistory[64];
    uint32_t choiceCount;
    int pityTimer;
    int superPityTimer;
    
    // Active effects and curses
    uint32_t activeCurses;
    float curseIntensities[8];
    uint32_t activeBuffs;
    float buffDurations[16];
    
    // Statistics
    int enemiesKilled;
    int roomsCleared;
    int totalDamageDealt;
    int totalDamageTaken;
    int perfectBlocks;
    int rollsExecuted;
    float totalPlayTime;
    
    // Achievement progress
    uint64_t achievementFlags;
    uint32_t achievementProgress[32];
    
    // Settings
    float masterVolume;
    float sfxVolume;
    float musicVolume;
    uint32_t controlSettings;
    
    // Reserved for future expansion
    uint32_t reserved[64];
};

// Global save data instance
static GameSaveData g_saveData;
static bool g_saveDataValid = false;

// ============================================================================
// Save System Functions
// ============================================================================

/**
 * Calculate checksum for save data
 */
uint32_t calculateSaveChecksum(const GameSaveData* saveData) {
    uint32_t checksum = 0;
    const uint8_t* data = (const uint8_t*)saveData + sizeof(SaveDataHeader);
    uint32_t size = sizeof(GameSaveData) - sizeof(SaveDataHeader);
    
    for (uint32_t i = 0; i < size; i++) {
        checksum = ((checksum << 5) + checksum) + data[i];
    }
    
    return checksum;
}

/**
 * Serialize current game state to save data
 */
void serializeGameState() {
    // Clear save data
    memset(&g_saveData, 0, sizeof(GameSaveData));
    
    // Fill header
    g_saveData.header.version = SAVE_DATA_VERSION;
    g_saveData.header.dataSize = sizeof(GameSaveData);
    g_saveData.header.timestamp = (uint64_t)(g_game_time * 1000); // Convert to milliseconds
    strcpy(g_saveData.header.gameVersion, "1.0.0");
    
    // Core game state
    g_saveData.playerX = g_player_x;
    g_saveData.playerY = g_player_y;
    g_saveData.stamina = g_stamina;
    g_saveData.health = g_health;
    g_saveData.maxHealth = g_max_health;
    g_saveData.currentPhase = (int)g_phase;
    g_saveData.roomCount = g_room_count;
    g_saveData.seed = g_rng_seed;
    
    // Player progression
    g_saveData.level = g_player_level;
    g_saveData.experience = g_experience;
    g_saveData.skillPoints = g_skill_points;
    g_saveData.unlockedSkills = g_unlocked_skills;
    
    // Currency and equipment
    g_saveData.gold = g_gold;
    g_saveData.essence = g_essence;
    g_saveData.currentWeapon = g_current_weapon;
    g_saveData.equippedArmor = g_equipped_armor;
    
    // Copy inventory
    g_saveData.inventoryCount = g_inventory_count;
    for (uint32_t i = 0; i < g_inventory_count && i < 32; i++) {
        g_saveData.inventory[i] = g_inventory[i];
    }
    
    // Choice history
    g_saveData.choiceCount = g_choice_history_count;
    for (uint32_t i = 0; i < g_choice_history_count && i < 64; i++) {
        g_saveData.choiceHistory[i] = g_choice_history[i];
    }
    g_saveData.pityTimer = g_pity_timer;
    g_saveData.superPityTimer = g_super_pity_timer;
    
    // Active effects
    g_saveData.activeCurses = g_active_curses;
    for (int i = 0; i < 8; i++) {
        g_saveData.curseIntensities[i] = g_curse_intensities[i];
    }
    g_saveData.activeBuffs = g_active_buffs;
    for (int i = 0; i < 16; i++) {
        g_saveData.buffDurations[i] = g_buff_durations[i];
    }
    
    // Statistics
    g_saveData.enemiesKilled = g_enemies_killed;
    g_saveData.roomsCleared = g_rooms_cleared;
    g_saveData.totalDamageDealt = g_total_damage_dealt;
    g_saveData.totalDamageTaken = g_total_damage_taken;
    g_saveData.perfectBlocks = g_perfect_blocks;
    g_saveData.rollsExecuted = g_rolls_executed;
    g_saveData.totalPlayTime = g_total_play_time;
    
    // Achievements
    g_saveData.achievementFlags = g_achievement_flags;
    for (int i = 0; i < 32; i++) {
        g_saveData.achievementProgress[i] = g_achievement_progress[i];
    }
    
    // Settings
    g_saveData.masterVolume = g_master_volume;
    g_saveData.sfxVolume = g_sfx_volume;
    g_saveData.musicVolume = g_music_volume;
    g_saveData.controlSettings = g_control_settings;
    
    // Calculate and set checksum
    g_saveData.header.checksum = calculateSaveChecksum(&g_saveData);
    
    g_saveDataValid = true;
}

/**
 * Deserialize save data to current game state
 */
bool deserializeGameState(const GameSaveData* saveData) {
    if (!saveData) return false;
    
    // Verify header
    if (saveData->header.version != SAVE_DATA_VERSION) {
        return false; // Incompatible version
    }
    
    if (saveData->header.dataSize != sizeof(GameSaveData)) {
        return false; // Size mismatch
    }
    
    // Verify checksum
    uint32_t calculatedChecksum = calculateSaveChecksum(saveData);
    if (calculatedChecksum != saveData->header.checksum) {
        return false; // Data corruption
    }
    
    // Restore core game state
    g_player_x = saveData->playerX;
    g_player_y = saveData->playerY;
    g_stamina = saveData->stamina;
    g_health = saveData->health;
    g_max_health = saveData->maxHealth;
    g_phase = (Phase)saveData->currentPhase;
    g_room_count = saveData->roomCount;
    g_rng_seed = saveData->seed;
    
    // Restore player progression
    g_player_level = saveData->level;
    g_experience = saveData->experience;
    g_skill_points = saveData->skillPoints;
    g_unlocked_skills = saveData->unlockedSkills;
    
    // Restore currency and equipment
    g_gold = saveData->gold;
    g_essence = saveData->essence;
    g_current_weapon = saveData->currentWeapon;
    g_equipped_armor = saveData->equippedArmor;
    
    // Restore inventory
    g_inventory_count = saveData->inventoryCount;
    for (uint32_t i = 0; i < saveData->inventoryCount && i < MAX_INVENTORY_SIZE; i++) {
        g_inventory[i] = saveData->inventory[i];
    }
    
    // Restore choice history
    g_choice_history_count = saveData->choiceCount;
    for (uint32_t i = 0; i < saveData->choiceCount && i < MAX_CHOICE_HISTORY; i++) {
        g_choice_history[i] = saveData->choiceHistory[i];
    }
    g_pity_timer = saveData->pityTimer;
    g_super_pity_timer = saveData->superPityTimer;
    
    // Restore active effects
    g_active_curses = saveData->activeCurses;
    for (int i = 0; i < 8; i++) {
        g_curse_intensities[i] = saveData->curseIntensities[i];
    }
    g_active_buffs = saveData->activeBuffs;
    for (int i = 0; i < 16; i++) {
        g_buff_durations[i] = saveData->buffDurations[i];
    }
    
    // Restore statistics
    g_enemies_killed = saveData->enemiesKilled;
    g_rooms_cleared = saveData->roomsCleared;
    g_total_damage_dealt = saveData->totalDamageDealt;
    g_total_damage_taken = saveData->totalDamageTaken;
    g_perfect_blocks = saveData->perfectBlocks;
    g_rolls_executed = saveData->rollsExecuted;
    g_total_play_time = saveData->totalPlayTime;
    
    // Restore achievements
    g_achievement_flags = saveData->achievementFlags;
    for (int i = 0; i < 32; i++) {
        g_achievement_progress[i] = saveData->achievementProgress[i];
    }
    
    // Restore settings
    g_master_volume = saveData->masterVolume;
    g_sfx_volume = saveData->sfxVolume;
    g_music_volume = saveData->musicVolume;
    g_control_settings = saveData->controlSettings;
    
    return true;
}

// ============================================================================
// WASM Export Functions
// ============================================================================

/**
 * Create save data and return pointer for JavaScript to read
 */
__attribute__((export_name("create_save_data")))
const uint8_t* create_save_data() {
    serializeGameState();
    return (const uint8_t*)&g_saveData;
}

/**
 * Get save data size
 */
__attribute__((export_name("get_save_data_size")))
uint32_t get_save_data_size() {
    return sizeof(GameSaveData);
}

/**
 * Load game from save data provided by JavaScript
 */
__attribute__((export_name("load_save_data")))
int load_save_data(const uint8_t* saveDataPtr, uint32_t dataSize) {
    if (!saveDataPtr || dataSize != sizeof(GameSaveData)) {
        return 0; // Invalid input
    }
    
    const GameSaveData* saveData = (const GameSaveData*)saveDataPtr;
    
    if (deserializeGameState(saveData)) {
        // Reinitialize game systems with loaded data
        reinitialize_game_systems();
        return 1; // Success
    }
    
    return 0; // Failed to load
}

/**
 * Check if save data is valid
 */
__attribute__((export_name("is_save_data_valid")))
int is_save_data_valid() {
    return g_saveDataValid ? 1 : 0;
}

/**
 * Get save data timestamp
 */
__attribute__((export_name("get_save_timestamp")))
uint64_t get_save_timestamp() {
    return g_saveDataValid ? g_saveData.header.timestamp : 0;
}

/**
 * Get save data version
 */
__attribute__((export_name("get_save_version")))
uint32_t get_save_version() {
    return SAVE_DATA_VERSION;
}

/**
 * Validate save data without loading
 */
__attribute__((export_name("validate_save_data")))
int validate_save_data(const uint8_t* saveDataPtr, uint32_t dataSize) {
    if (!saveDataPtr || dataSize != sizeof(GameSaveData)) {
        return 0;
    }
    
    const GameSaveData* saveData = (const GameSaveData*)saveDataPtr;
    
    // Check version
    if (saveData->header.version != SAVE_DATA_VERSION) {
        return 0;
    }
    
    // Check size
    if (saveData->header.dataSize != sizeof(GameSaveData)) {
        return 0;
    }
    
    // Check checksum
    uint32_t calculatedChecksum = calculateSaveChecksum(saveData);
    if (calculatedChecksum != saveData->header.checksum) {
        return 0;
    }
    
    return 1; // Valid
}

/**
 * Get save data info as JSON-like string (for debugging)
 */
__attribute__((export_name("get_save_info")))
const char* get_save_info() {
    static char infoBuffer[512];
    
    if (!g_saveDataValid) {
        strcpy(infoBuffer, "No save data available");
        return infoBuffer;
    }
    
    // Format basic save info
    snprintf(infoBuffer, sizeof(infoBuffer),
        "Version:%d,Level:%d,Gold:%d,Essence:%d,Room:%d,PlayTime:%.1f",
        g_saveData.header.version,
        g_saveData.level,
        g_saveData.gold,
        g_saveData.essence,
        g_saveData.roomCount,
        g_saveData.totalPlayTime
    );
    
    return infoBuffer;
}

/**
 * Quick save current state
 */
__attribute__((export_name("quick_save")))
int quick_save() {
    serializeGameState();
    return g_saveDataValid ? 1 : 0;
}

/**
 * Auto-save trigger (called periodically by game loop)
 */
__attribute__((export_name("auto_save_check")))
int auto_save_check() {
    // Auto-save conditions:
    // - Phase transitions
    // - Every 5 minutes of play time
    // - After significant events (boss kills, rare item acquisition)
    
    static float lastAutoSaveTime = 0;
    static Phase lastAutoSavePhase = Explore;
    
    bool shouldAutoSave = false;
    
    // Time-based auto-save (5 minutes)
    if (g_total_play_time - lastAutoSaveTime >= 300.0f) {
        shouldAutoSave = true;
        lastAutoSaveTime = g_total_play_time;
    }
    
    // Phase transition auto-save
    if (g_phase != lastAutoSavePhase) {
        shouldAutoSave = true;
        lastAutoSavePhase = g_phase;
    }
    
    // Event-based auto-save
    if (g_enemies_killed > 0 && g_enemies_killed % 10 == 0) {
        shouldAutoSave = true;
    }
    
    if (shouldAutoSave) {
        return quick_save();
    }
    
    return 0; // No save needed
}

/**
 * Clear save data
 */
__attribute__((export_name("clear_save_data")))
void clear_save_data() {
    memset(&g_saveData, 0, sizeof(GameSaveData));
    g_saveDataValid = false;
}

/**
 * Export save data as base64 string for sharing
 */
__attribute__((export_name("export_save_base64")))
const char* export_save_base64() {
    // This would require base64 encoding implementation
    // For now, return a placeholder
    return "BASE64_ENCODED_SAVE_DATA";
}

/**
 * Import save data from base64 string
 */
__attribute__((export_name("import_save_base64")))
int import_save_base64(const char* base64Data) {
    // This would require base64 decoding implementation
    // For now, return failure
    return 0;
}

// ============================================================================
// Helper Functions for Save System
// ============================================================================

/**
 * Reinitialize game systems after loading
 */
void reinitialize_game_systems() {
    // Reinitialize RNG with loaded seed
    init_rng(g_rng_seed);
    
    // Validate loaded data ranges
    g_player_x = clamp(g_player_x, 0.0f, 1.0f);
    g_player_y = clamp(g_player_y, 0.0f, 1.0f);
    g_stamina = clamp(g_stamina, 0.0f, 1.0f);
    g_health = clamp(g_health, 0, g_max_health);
    
    // Reinitialize phase-specific systems
    switch (g_phase) {
        case Explore:
            init_explore_phase();
            break;
        case Fight:
            init_fight_phase();
            break;
        case Choose:
            init_choice_phase();
            break;
        case PowerUp:
            init_powerup_phase();
            break;
        case Risk:
            init_risk_phase();
            break;
        case Escalate:
            init_escalate_phase();
            break;
        case CashOut:
            init_cashout_phase();
            break;
        case Reset:
            init_reset_phase();
            break;
    }
    
    // Reinitialize AI systems with loaded state
    reinitialize_ai_systems();
    
    // Apply loaded buffs and curses
    apply_loaded_effects();
    
    // Reinitialize achievement system with loaded progress
    reinitialize_achievement_system();
    
    // Validate inventory and equipment
    validate_inventory_state();
    
    // Recalculate derived stats
    recalculate_player_stats();
}

/**
 * Apply loaded effects and validate them
 */
void apply_loaded_effects() {
    // Apply active curses with intensity validation
    for (int i = 0; i < 8; i++) {
        if (g_active_curses & (1 << i)) {
            g_curse_intensities[i] = clamp(g_curse_intensities[i], 0.0f, 10.0f);
            apply_curse_effect(i, g_curse_intensities[i]);
        }
    }
    
    // Apply active buffs with duration validation
    for (int i = 0; i < 16; i++) {
        if (g_active_buffs & (1 << i)) {
            g_buff_durations[i] = fmax(g_buff_durations[i], 0.0f);
            apply_buff_effect(i, g_buff_durations[i]);
        }
    }
}

/**
 * Validate inventory state after loading
 */
void validate_inventory_state() {
    // Ensure inventory count is within bounds
    g_inventory_count = clamp(g_inventory_count, 0, MAX_INVENTORY_SIZE);
    
    // Validate item IDs in inventory
    for (uint32_t i = 0; i < g_inventory_count; i++) {
        if (!is_valid_item_id(g_inventory[i])) {
            // Remove invalid item by shifting array
            for (uint32_t j = i; j < g_inventory_count - 1; j++) {
                g_inventory[j] = g_inventory[j + 1];
            }
            g_inventory_count--;
            i--; // Re-check this index
        }
    }
    
    // Validate equipped items
    if (!is_valid_weapon_id(g_current_weapon)) {
        g_current_weapon = 0; // Default weapon
    }
    
    if (!is_valid_armor_id(g_equipped_armor)) {
        g_equipped_armor = 0; // No armor
    }
}

/**
 * Recalculate derived player stats
 */
void recalculate_player_stats() {
    // Recalculate max health based on level and equipment
    int baseHealth = 100;
    int levelBonus = g_player_level * 10;
    int equipmentBonus = get_armor_health_bonus(g_equipped_armor);
    g_max_health = baseHealth + levelBonus + equipmentBonus;
    
    // Ensure current health doesn't exceed max
    if (g_health > g_max_health) {
        g_health = g_max_health;
    }
    
    // Recalculate other derived stats
    update_combat_stats();
    update_movement_stats();
}

/**
 * Get comprehensive save statistics for UI display
 */
__attribute__((export_name("get_save_statistics")))
const char* get_save_statistics() {
    static char statsBuffer[1024];
    
    if (!g_saveDataValid) {
        strcpy(statsBuffer, "No save data available");
        return statsBuffer;
    }
    
    // Format comprehensive statistics
    snprintf(statsBuffer, sizeof(statsBuffer),
        "{"
        "\"level\":%d,"
        "\"experience\":%d,"
        "\"gold\":%d,"
        "\"essence\":%d,"
        "\"roomCount\":%d,"
        "\"enemiesKilled\":%d,"
        "\"perfectBlocks\":%d,"
        "\"totalDamageDealt\":%d,"
        "\"totalDamageTaken\":%d,"
        "\"rollsExecuted\":%d,"
        "\"totalPlayTime\":%.2f,"
        "\"achievementsUnlocked\":%d,"
        "\"currentWeapon\":%d,"
        "\"equippedArmor\":%d,"
        "\"inventoryCount\":%d,"
        "\"activeCurses\":%d,"
        "\"activeBuffs\":%d,"
        "\"phase\":%d"
        "}",
        g_saveData.level,
        g_saveData.experience,
        g_saveData.gold,
        g_saveData.essence,
        g_saveData.roomCount,
        g_saveData.enemiesKilled,
        g_saveData.perfectBlocks,
        g_saveData.totalDamageDealt,
        g_saveData.totalDamageTaken,
        g_saveData.rollsExecuted,
        g_saveData.totalPlayTime,
        __builtin_popcountll(g_saveData.achievementFlags),
        g_saveData.currentWeapon,
        g_saveData.equippedArmor,
        g_saveData.inventoryCount,
        __builtin_popcount(g_saveData.activeCurses),
        __builtin_popcount(g_saveData.activeBuffs),
        g_saveData.currentPhase
    );
    
    return statsBuffer;
}