// DozedEnt WASM Game Module
// Main game logic implementation

#include <cstdint>
#include <cstring>
#include <cmath>

// Include generated balance data
#include "generated/balance_data.h"

// Game state structure
struct GameState {
    float player_x;
    float player_y;
    float player_health;
    float player_stamina;
    float player_stamina_max;
    uint32_t phase;
    uint32_t seed;
    uint32_t frame;
    bool is_rolling;
    uint32_t weapon;
    uint32_t score;
    uint32_t kills;
};

// Global game state
static GameState g_state = {};

// Random number generator (xorshift)
static uint32_t rng_state = 12345;

static uint32_t xorshift32() {
    rng_state ^= rng_state << 13;
    rng_state ^= rng_state >> 17;
    rng_state ^= rng_state << 5;
    return rng_state;
}

// Export functions with C linkage
extern "C" {
    
    // Initialize game with seed and starting weapon
    void init_run(uint32_t seed, uint32_t start_weapon) {
        rng_state = seed ? seed : 12345;
        memset(&g_state, 0, sizeof(g_state));
        g_state.seed = seed;
        g_state.weapon = start_weapon;
        g_state.player_health = 100.0f;
        g_state.player_stamina = 100.0f;
        g_state.player_stamina_max = 100.0f;
        g_state.player_x = 400.0f;
        g_state.player_y = 300.0f;
        g_state.phase = 0;
        g_state.frame = 0;
    }
    
    // Update game state
    void update(float input_x, float input_y, bool is_rolling, float delta_time) {
        g_state.frame++;
        
        // Basic movement
        const float move_speed = is_rolling ? 300.0f : 150.0f;
        g_state.player_x += input_x * move_speed * delta_time;
        g_state.player_y += input_y * move_speed * delta_time;
        
        // Stamina management
        if (is_rolling && g_state.player_stamina > 0) {
            g_state.player_stamina -= 30.0f * delta_time;
            if (g_state.player_stamina < 0) g_state.player_stamina = 0;
        } else if (!is_rolling) {
            g_state.player_stamina += 20.0f * delta_time;
            if (g_state.player_stamina > g_state.player_stamina_max) {
                g_state.player_stamina = g_state.player_stamina_max;
            }
        }
        
        g_state.is_rolling = is_rolling;
    }
    
    // Getters for game state
    float get_x() { return g_state.player_x; }
    float get_y() { return g_state.player_y; }
    float get_health() { return g_state.player_health; }
    float get_stamina() { return g_state.player_stamina; }
    float get_stamina_max() { return g_state.player_stamina_max; }
    uint32_t get_phase() { return g_state.phase; }
    uint32_t get_seed() { return g_state.seed; }
    uint32_t get_frame() { return g_state.frame; }
    bool get_is_rolling() { return g_state.is_rolling; }
    uint32_t get_weapon() { return g_state.weapon; }
    uint32_t get_score() { return g_state.score; }
    uint32_t get_kills() { return g_state.kills; }
    
    // Input handling
    void set_player_input(float x, float y, uint32_t buttons) {
        // Process input
        bool roll_button = (buttons & 0x01) != 0;
        update(x, y, roll_button, 1.0f / 60.0f);
    }
    
    // Combat functions
    void player_attack(uint32_t attack_type) {
        // Handle player attack
        g_state.player_stamina -= 10.0f;
        if (g_state.player_stamina < 0) g_state.player_stamina = 0;
    }
    
    void handle_incoming_attack(float damage, uint32_t attack_type) {
        // Handle incoming damage
        if (!g_state.is_rolling) {
            g_state.player_health -= damage;
            if (g_state.player_health < 0) g_state.player_health = 0;
        }
    }
    
    // Phase management
    void set_phase(uint32_t phase) {
        g_state.phase = phase;
    }
    
    void advance_phase() {
        g_state.phase++;
    }
    
    // Choice system
    uint32_t get_choice_count() {
        // Return number of available choices
        return 3;
    }
    
    uint32_t get_choice_id(uint32_t index) {
        // Return choice ID at index
        return index + 1;
    }
    
    void commit_choice(uint32_t choice_id) {
        // Apply selected choice
        g_state.score += 100;
    }
    
    // Wolf/enemy functions
    uint32_t get_wolf_count() {
        return 0; // No wolves yet
    }
    
    float get_wolf_x(uint32_t index) {
        return 0.0f;
    }
    
    float get_wolf_y(uint32_t index) {
        return 0.0f;
    }
    
    // Memory management
    void* game_malloc(size_t size) {
        static uint8_t heap[1024 * 1024]; // 1MB heap
        static size_t heap_used = 0;
        
        if (heap_used + size > sizeof(heap)) {
            return nullptr;
        }
        
        void* ptr = &heap[heap_used];
        heap_used += size;
        return ptr;
    }
    
    void game_free(void* ptr) {
        // Simple allocator doesn't support free
    }
    
    // Main function required for standalone WASM
    int main() {
        // Initialize on load
        init_run(12345, 0);
        return 0;
    }
}