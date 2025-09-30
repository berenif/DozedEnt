#pragma once

/**
 * GameGlobals.h - Shared types and minimal global state
 * Contains only essential shared definitions and temporary globals during refactoring
 */

// Forward declarations
class GameCoordinator;

// Global coordinator instance (temporary during refactoring)
extern GameCoordinator* g_game_coordinator;

// Temporary globals (to be removed as refactoring progresses)
extern bool g_is_stunned;
extern float g_stamina;

// Animation states (shared between systems)
enum class PlayerAnimState {
    Idle = 0,
    Walking = 1,
    Running = 2,
    Rolling = 3,
    Jumping = 4,
    Attacking = 5,
    Blocking = 6,
    Stunned = 7
};

// Biome types (shared)
enum class BiomeType {
    Forest = 0,
    Desert = 1,
    Mountain = 2,
    Swamp = 3,
    Count = 4
};

// Weapon types (shared)
enum class WeaponType {
    None = 0,
    WardenLongsword = 1,
    RaiderGreataxe = 2,
    KenseiKatana = 3,
    Count = 4
};

// Character types (shared)
enum class CharacterType {
    None = 0,
    Warden = 1,
    Raider = 2,
    Kensei = 3,
    Count = 4
};

// Game phases (shared)
enum class GamePhase {
    Explore = 0,
    Fight = 1,
    Choose = 2,
    PowerUp = 3,
    Risk = 4,
    Escalate = 5,
    CashOut = 6,
    Reset = 7
};

// Utility functions
inline float clamp(float value, float min_val, float max_val) {
    return (value < min_val) ? min_val : (value > max_val) ? max_val : value;
}

inline int clamp(int value, int min_val, int max_val) {
    return (value < min_val) ? min_val : (value > max_val) ? max_val : value;
}

