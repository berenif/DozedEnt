#include "GameStateManager.h"
#include "../core/GameGlobals.h"
#include <algorithm>

GameStateManager::GameStateManager() {
    // Initialize with default state
    state_ = {};
}

void GameStateManager::initialize(unsigned long long seed, unsigned int start_weapon) {
    // Set RNG seed
    set_rng_seed(seed ? seed : 1);
    
    // Initialize core state
    state_.current_phase = GamePhase::Explore;
    state_.room_count = 0;
    state_.rooms_cleared = 0;
    state_.wolf_kills_since_choice = 0;
    state_.game_time = 0.0f;
    state_.total_play_time = 0.0f;
    state_.gold = 0;
    state_.essence = 0;
    state_.is_paused = false;
    
    // Initialize biome and spawn
    initialize_biome();
    initialize_spawn_position();
    
    // TODO: Initialize weapon system with start_weapon
    
    state_.is_initialized = true;
}

void GameStateManager::reset(unsigned long long new_seed) {
    // Preserve total play time
    float preserved_play_time = state_.total_play_time;
    
    // Reset state
    initialize(new_seed, 0);  // TODO: Get current weapon
    
    // Restore preserved values
    state_.total_play_time = preserved_play_time;
}

void GameStateManager::update(float delta_time) {
    if (!state_.is_initialized || state_.is_paused) return;
    
    if (delta_time > 0.0f) {
        state_.game_time += delta_time;
        state_.total_play_time += delta_time;
    }
    
    // Update RNG state periodically to maintain entropy
    advance_rng();
}

void GameStateManager::shutdown() {
    state_.is_initialized = false;
}

void GameStateManager::transition_to_phase(GamePhase new_phase) {
    if (!can_transition_to_phase(new_phase)) return;
    
    GamePhase old_phase = state_.current_phase;
    state_.current_phase = new_phase;
    
    // Execute phase-specific logic
    switch (new_phase) {
        case GamePhase::Explore:
            enter_explore_phase();
            break;
        case GamePhase::Fight:
            enter_fight_phase();
            break;
        case GamePhase::Choose:
            enter_choose_phase();
            break;
        case GamePhase::PowerUp:
            enter_powerup_phase();
            break;
        case GamePhase::Risk:
            enter_risk_phase();
            break;
        case GamePhase::Escalate:
            enter_escalate_phase();
            break;
        case GamePhase::CashOut:
            enter_cashout_phase();
            break;
        case GamePhase::Reset:
            enter_reset_phase();
            break;
    }
}

bool GameStateManager::can_transition_to_phase(GamePhase target_phase) const {
    // Define valid phase transitions
    switch (state_.current_phase) {
        case GamePhase::Explore:
            return target_phase == GamePhase::Fight || target_phase == GamePhase::Reset;
        case GamePhase::Fight:
            return target_phase == GamePhase::Choose || target_phase == GamePhase::Reset;
        case GamePhase::Choose:
            return target_phase == GamePhase::PowerUp || target_phase == GamePhase::Reset;
        case GamePhase::PowerUp:
            return target_phase == GamePhase::Risk || target_phase == GamePhase::Explore || target_phase == GamePhase::Reset;
        case GamePhase::Risk:
            return target_phase == GamePhase::Escalate || target_phase == GamePhase::Explore || target_phase == GamePhase::Reset;
        case GamePhase::Escalate:
            return target_phase == GamePhase::CashOut || target_phase == GamePhase::Reset;
        case GamePhase::CashOut:
            return target_phase == GamePhase::Explore || target_phase == GamePhase::Reset;
        case GamePhase::Reset:
            return target_phase == GamePhase::Explore;
        default:
            return false;
    }
}

void GameStateManager::force_phase_transition(GamePhase target_phase) {
    state_.current_phase = target_phase;
    transition_to_phase(target_phase);
}

void GameStateManager::advance_room() {
    state_.room_count++;
}

void GameStateManager::complete_room() {
    state_.rooms_cleared++;
    advance_room();
}

unsigned int GameStateManager::get_random_u32() {
    advance_rng();
    return static_cast<unsigned int>(state_.rng_state);
}

float GameStateManager::get_random_float() {
    return static_cast<float>(get_random_u32()) / static_cast<float>(0xFFFFFFFF);
}

void GameStateManager::set_rng_seed(unsigned long long seed) {
    state_.rng_seed = seed;
    state_.rng_state = seed;
}

void GameStateManager::add_gold(int amount) {
    state_.gold = std::max(0, state_.gold + amount);
}

void GameStateManager::add_essence(int amount) {
    state_.essence = std::max(0, state_.essence + amount);
}

bool GameStateManager::spend_gold(int amount) {
    if (state_.gold >= amount) {
        state_.gold -= amount;
        return true;
    }
    return false;
}

bool GameStateManager::spend_essence(int amount) {
    if (state_.essence >= amount) {
        state_.essence -= amount;
        return true;
    }
    return false;
}

void GameStateManager::pause() {
    state_.is_paused = true;
}

void GameStateManager::resume() {
    state_.is_paused = false;
}

void GameStateManager::toggle_pause() {
    state_.is_paused = !state_.is_paused;
}

void GameStateManager::enter_explore_phase() {
    // Reset wolf kill counter
    state_.wolf_kills_since_choice = 0;
    
    // TODO: Generate new room layout
    // TODO: Spawn initial enemies if needed
}

void GameStateManager::enter_fight_phase() {
    // TODO: Spawn combat enemies
    // TODO: Set up combat environment
}

void GameStateManager::enter_choose_phase() {
    // TODO: Generate choices
    // TODO: Present choice UI
}

void GameStateManager::enter_powerup_phase() {
    // TODO: Apply selected choice effects
}

void GameStateManager::enter_risk_phase() {
    // TODO: Initialize risk mechanics
    // TODO: Apply curses and modifiers
}

void GameStateManager::enter_escalate_phase() {
    // TODO: Increase difficulty
    // TODO: Spawn minibosses
}

void GameStateManager::enter_cashout_phase() {
    // TODO: Initialize shop
    // TODO: Calculate rewards
}

void GameStateManager::enter_reset_phase() {
    // Clean restart preparation
    reset_progression_state();
    transition_to_phase(GamePhase::Explore);
}

void GameStateManager::initialize_biome() {
    // Randomly select biome
    state_.current_biome = static_cast<BiomeType>(get_random_u32() % static_cast<unsigned int>(BiomeType::Count));
}

void GameStateManager::initialize_spawn_position() {
    // TODO: Set deterministic spawn position based on RNG
    // This should coordinate with PlayerManager
}

void GameStateManager::reset_progression_state() {
    state_.room_count = 0;
    state_.wolf_kills_since_choice = 0;
    // Note: Don't reset rooms_cleared as it's a cumulative stat
}

void GameStateManager::advance_rng() {
    // Linear Congruential Generator (LCG) - same as original
    state_.rng_state = state_.rng_state * 1664525 + 1013904223;
}

