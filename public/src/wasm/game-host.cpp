// DozedEnt WASM Host Module
// Host-authoritative multiplayer game logic

#include <cstdint>
#include <cstring>
#include <cstdlib>

// Game state structure (matches game.cpp)
struct GameState {
    float player_x[4];  // Support up to 4 players
    float player_y[4];
    float player_health[4];
    float player_stamina[4];
    uint32_t phase;
    uint32_t seed;
    uint32_t frame;
    uint32_t player_count;
};

// Global game state
static GameState* g_state = nullptr;

// Export functions with C linkage
extern "C" {
    
    // Initialize game
    int game_init() {
        if (g_state) {
            free(g_state);
        }
        g_state = (GameState*)malloc(sizeof(GameState));
        if (!g_state) return 0;
        
        memset(g_state, 0, sizeof(GameState));
        return 1;
    }
    
    // Create new game state
    void* game_create_state(uint32_t seed, uint32_t player_count) {
        if (!g_state) game_init();
        
        g_state->seed = seed;
        g_state->player_count = player_count;
        g_state->phase = 0;
        g_state->frame = 0;
        
        // Initialize players
        for (uint32_t i = 0; i < player_count && i < 4; i++) {
            g_state->player_x[i] = 400.0f + i * 50.0f;
            g_state->player_y[i] = 300.0f;
            g_state->player_health[i] = 100.0f;
            g_state->player_stamina[i] = 100.0f;
        }
        
        return g_state;
    }
    
    // Update game state
    void game_update(float delta_time) {
        if (!g_state) return;
        
        g_state->frame++;
        
        // Update all players
        for (uint32_t i = 0; i < g_state->player_count && i < 4; i++) {
            // Regenerate stamina
            g_state->player_stamina[i] += 20.0f * delta_time;
            if (g_state->player_stamina[i] > 100.0f) {
                g_state->player_stamina[i] = 100.0f;
            }
        }
    }
    
    // Handle player input
    void game_handle_input(uint32_t player_id, float input_x, float input_y, uint32_t buttons) {
        if (!g_state || player_id >= g_state->player_count || player_id >= 4) return;
        
        const float move_speed = 150.0f;
        const float delta = 1.0f / 60.0f;
        
        g_state->player_x[player_id] += input_x * move_speed * delta;
        g_state->player_y[player_id] += input_y * move_speed * delta;
        
        // Handle roll button (bit 0)
        if (buttons & 0x01) {
            if (g_state->player_stamina[player_id] >= 20.0f) {
                g_state->player_stamina[player_id] -= 20.0f;
            }
        }
    }
    
    // Get current state
    void* game_get_state() {
        return g_state;
    }
    
    // Get state size
    size_t game_get_state_size() {
        return sizeof(GameState);
    }
    
    // Apply state snapshot
    void game_apply_state(void* state_data, size_t size) {
        if (!g_state || !state_data || size != sizeof(GameState)) return;
        memcpy(g_state, state_data, sizeof(GameState));
    }
    
    // Clean up
    void game_destroy() {
        if (g_state) {
            free(g_state);
            g_state = nullptr;
        }
    }
    
    // Memory allocation functions required by Emscripten
    void* malloc(size_t size) {
        static uint8_t heap[2 * 1024 * 1024]; // 2MB heap
        static size_t heap_used = 0;
        
        // Align to 8 bytes
        size = (size + 7) & ~7;
        
        if (heap_used + size > sizeof(heap)) {
            return nullptr;
        }
        
        void* ptr = &heap[heap_used];
        heap_used += size;
        return ptr;
    }
    
    void free(void* ptr) {
        // Simple allocator doesn't support free
    }
}

// Main function required for standalone WASM
extern "C" int main() {
    // Initialize on load
    game_init();
    return 0;
}