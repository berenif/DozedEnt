#pragma once
#include <cstdint>

/**
 * GameStateManager - Manages overall game state, phases, and core game loop coordination
 * Follows single responsibility principle for game state management
 */
class GameStateManager {
public:
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

    enum class BiomeType {
        Forest = 0,
        Desert = 1,
        Mountain = 2,
        Swamp = 3,
        Count = 4
    };

    struct EnemyBodyMapping {
        uint32_t physics_body_id;
        int enemy_index;  // Index in enemy array
        bool active;
    };

    struct GameState {
        // Core game state
        GamePhase current_phase = GamePhase::Explore;
        BiomeType current_biome = BiomeType::Forest;
        
        // Progression
        int room_count = 0;
        int rooms_cleared = 0;
        int wolf_kills_since_choice = 0;
        
        // Timing
        float game_time = 0.0f;
        float total_play_time = 0.0f;
        
        // RNG state
        unsigned long long rng_seed = 1;
        unsigned long long rng_state = 1;
        
        // Currency
        int gold = 0;
        int essence = 0;
        
        // Enemy physics tracking
        int enemy_count = 0;
        static constexpr int MAX_ENEMIES = 32;
        EnemyBodyMapping enemy_bodies[MAX_ENEMIES];
        
        // Flags
        bool is_initialized = false;
        bool is_paused = false;
    };

    GameStateManager();
    ~GameStateManager() = default;

    // Core lifecycle
    void initialize(unsigned long long seed, unsigned int start_weapon);
    void reset(unsigned long long new_seed);
    void update(float delta_time);
    void shutdown();
    
    // Phase management
    void transition_to_phase(GamePhase new_phase);
    bool can_transition_to_phase(GamePhase target_phase) const;
    void force_phase_transition(GamePhase target_phase);
    
    // Room progression
    void advance_room();
    void complete_room();
    
    // RNG management
    unsigned int get_random_u32();
    float get_random_float();
    void set_rng_seed(unsigned long long seed);
    
    // Currency management
    void add_gold(int amount);
    void add_essence(int amount);
    bool spend_gold(int amount);
    bool spend_essence(int amount);
    
    // State queries
    const GameState& get_state() const { return state_; }
    GamePhase get_current_phase() const { return state_.current_phase; }
    BiomeType get_current_biome() const { return state_.current_biome; }
    int get_room_count() const { return state_.room_count; }
    int get_rooms_cleared() const { return state_.rooms_cleared; }
    float get_game_time() const { return state_.game_time; }
    float get_total_play_time() const { return state_.total_play_time; }
    int get_gold() const { return state_.gold; }
    int get_essence() const { return state_.essence; }
    bool is_initialized() const { return state_.is_initialized; }
    bool is_paused() const { return state_.is_paused; }
    
    // Enemy physics queries
    int get_enemy_count() const { return state_.enemy_count; }
    uint32_t get_enemy_body_id(int enemy_index) const;
    int get_enemy_index_for_body(uint32_t body_id) const;
    
    // Enemy physics management
    uint32_t register_enemy_body(int enemy_index, uint32_t physics_body_id);
    void unregister_enemy_body(int enemy_index);
    void clear_all_enemy_bodies();
    
    // Game control
    void pause();
    void resume();
    void toggle_pause();

private:
    GameState state_;
    
    // Phase transition helpers
    void enter_explore_phase();
    void enter_fight_phase();
    void enter_choose_phase();
    void enter_powerup_phase();
    void enter_risk_phase();
    void enter_escalate_phase();
    void enter_cashout_phase();
    void enter_reset_phase();
    
    // Initialization helpers
    void initialize_biome();
    void initialize_spawn_position();
    void reset_progression_state();
    
    // RNG helpers
    void advance_rng();
};

