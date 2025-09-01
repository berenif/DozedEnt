/**
 * Simple multiplayer game example for host authority system
 * Compile with: emcc game-host.cpp -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS='["_game_init","_game_create_state","_game_update","_game_handle_input","_game_get_state","_game_get_state_size","_game_apply_state","_game_destroy","_malloc","_free"]' -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' -o game-host.wasm
 */

#include <cstdlib>
#include <cstring>
#include <cmath>
#include <vector>
#include <string>
#include <sstream>

#define MAX_PLAYERS 16
#define WORLD_WIDTH 1280
#define WORLD_HEIGHT 720
#define PLAYER_SPEED 200.0f // pixels per second
#define PLAYER_RADIUS 16.0f

// External JS functions
extern "C" {
    void js_log(const char* msg, int len);
    double js_get_timestamp();
    double js_random();
    void js_broadcast_state(const char* json, int len);
}

// Player state
struct Player {
    int id;
    float x, y;
    float vx, vy;
    int health;
    int score;
    bool active;
    float lastInputTime;
    
    Player() : id(-1), x(0), y(0), vx(0), vy(0), health(100), score(0), active(false), lastInputTime(0) {}
};

// Game state
struct GameState {
    Player players[MAX_PLAYERS];
    int maxPlayers;
    int frameNumber;
    double lastUpdateTime;
    float worldWidth;
    float worldHeight;
    
    GameState() : maxPlayers(8), frameNumber(0), lastUpdateTime(0), 
                  worldWidth(WORLD_WIDTH), worldHeight(WORLD_HEIGHT) {
        for (int i = 0; i < MAX_PLAYERS; i++) {
            players[i].id = i;
            players[i].x = worldWidth / 2 + (js_random() - 0.5) * 200;
            players[i].y = worldHeight / 2 + (js_random() - 0.5) * 200;
        }
    }
};

// Global state buffer for JSON serialization
static char* g_stateJsonBuffer = nullptr;
static size_t g_stateJsonBufferSize = 0;

// Helper function to serialize game state to JSON
std::string serializeGameState(const GameState* state) {
    std::ostringstream json;
    json << "{";
    json << "\"frameNumber\":" << state->frameNumber << ",";
    json << "\"worldWidth\":" << state->worldWidth << ",";
    json << "\"worldHeight\":" << state->worldHeight << ",";
    json << "\"players\":[";
    
    bool first = true;
    for (int i = 0; i < state->maxPlayers; i++) {
        if (state->players[i].active) {
            if (!first) json << ",";
            first = false;
            
            const Player& p = state->players[i];
            json << "{";
            json << "\"id\":" << p.id << ",";
            json << "\"x\":" << p.x << ",";
            json << "\"y\":" << p.y << ",";
            json << "\"vx\":" << p.vx << ",";
            json << "\"vy\":" << p.vy << ",";
            json << "\"health\":" << p.health << ",";
            json << "\"score\":" << p.score;
            json << "}";
        }
    }
    
    json << "]}";
    return json.str();
}

// Helper function to parse input JSON (simplified)
void parseInput(const char* inputJson, int playerIndex, GameState* state) {
    // Simple parsing for movement input
    // Expected format: {"type":"move","dx":0.5,"dy":-0.3}
    
    Player& player = state->players[playerIndex];
    if (!player.active) {
        player.active = true;
    }
    
    // Extract dx and dy from JSON (simplified parsing)
    float dx = 0, dy = 0;
    const char* dxStr = strstr(inputJson, "\"dx\":");
    const char* dyStr = strstr(inputJson, "\"dy\":");
    
    if (dxStr) {
        dx = atof(dxStr + 5);
    }
    if (dyStr) {
        dy = atof(dyStr + 5);
    }
    
    // Normalize input vector
    float mag = sqrt(dx * dx + dy * dy);
    if (mag > 0.1f) {
        dx /= mag;
        dy /= mag;
    }
    
    // Update player velocity
    player.vx = dx * PLAYER_SPEED;
    player.vy = dy * PLAYER_SPEED;
    player.lastInputTime = js_get_timestamp();
    
    // Check for action type
    if (strstr(inputJson, "\"type\":\"attack\"")) {
        // Handle attack action
        // Find nearest player and deal damage
        for (int i = 0; i < state->maxPlayers; i++) {
            if (i != playerIndex && state->players[i].active) {
                float dist = sqrt(pow(state->players[i].x - player.x, 2) + 
                                pow(state->players[i].y - player.y, 2));
                if (dist < 50.0f) {
                    state->players[i].health -= 10;
                    player.score += 10;
                    if (state->players[i].health <= 0) {
                        state->players[i].active = false;
                        player.score += 100;
                    }
                }
            }
        }
    }
}

extern "C" {

// Initialize game with configuration
void game_init(const char* configJson, int configLen) {
    // Parse config if needed
    char msg[] = "Game initialized";
    js_log(msg, sizeof(msg) - 1);
}

// Create a new game state
GameState* game_create_state(int maxPlayers) {
    GameState* state = new GameState();
    state->maxPlayers = (maxPlayers > 0 && maxPlayers <= MAX_PLAYERS) ? maxPlayers : 8;
    state->lastUpdateTime = js_get_timestamp();
    return state;
}

// Update game logic
void game_update(GameState* state, float deltaTime) {
    if (!state) return;
    
    state->frameNumber++;
    
    // Update all active players
    for (int i = 0; i < state->maxPlayers; i++) {
        Player& player = state->players[i];
        if (!player.active) continue;
        
        // Apply velocity
        player.x += player.vx * (deltaTime / 1000.0f);
        player.y += player.vy * (deltaTime / 1000.0f);
        
        // Keep players in bounds
        if (player.x < PLAYER_RADIUS) {
            player.x = PLAYER_RADIUS;
            player.vx = 0;
        }
        if (player.x > state->worldWidth - PLAYER_RADIUS) {
            player.x = state->worldWidth - PLAYER_RADIUS;
            player.vx = 0;
        }
        if (player.y < PLAYER_RADIUS) {
            player.y = PLAYER_RADIUS;
            player.vy = 0;
        }
        if (player.y > state->worldHeight - PLAYER_RADIUS) {
            player.y = state->worldHeight - PLAYER_RADIUS;
            player.vy = 0;
        }
        
        // Apply friction
        player.vx *= 0.95f;
        player.vy *= 0.95f;
        
        // Deactivate players who haven't sent input in a while
        double now = js_get_timestamp();
        if (now - player.lastInputTime > 10000) { // 10 seconds timeout
            player.active = false;
        }
    }
    
    // Simple collision detection between players
    for (int i = 0; i < state->maxPlayers; i++) {
        if (!state->players[i].active) continue;
        
        for (int j = i + 1; j < state->maxPlayers; j++) {
            if (!state->players[j].active) continue;
            
            Player& p1 = state->players[i];
            Player& p2 = state->players[j];
            
            float dx = p2.x - p1.x;
            float dy = p2.y - p1.y;
            float dist = sqrt(dx * dx + dy * dy);
            
            if (dist < PLAYER_RADIUS * 2 && dist > 0) {
                // Push players apart
                float overlap = PLAYER_RADIUS * 2 - dist;
                dx /= dist;
                dy /= dist;
                
                p1.x -= dx * overlap * 0.5f;
                p1.y -= dy * overlap * 0.5f;
                p2.x += dx * overlap * 0.5f;
                p2.y += dy * overlap * 0.5f;
            }
        }
    }
}

// Handle player input
void game_handle_input(GameState* state, int playerIndex, const char* inputJson, int inputLen) {
    if (!state || playerIndex < 0 || playerIndex >= state->maxPlayers) return;
    
    parseInput(inputJson, playerIndex, state);
}

// Get current game state as JSON
const char* game_get_state(GameState* state) {
    if (!state) return nullptr;
    
    std::string json = serializeGameState(state);
    
    // Resize buffer if needed
    if (json.size() + 1 > g_stateJsonBufferSize) {
        if (g_stateJsonBuffer) free(g_stateJsonBuffer);
        g_stateJsonBufferSize = json.size() + 1024; // Add some extra space
        g_stateJsonBuffer = (char*)malloc(g_stateJsonBufferSize);
    }
    
    strcpy(g_stateJsonBuffer, json.c_str());
    return g_stateJsonBuffer;
}

// Get size of state JSON
int game_get_state_size(GameState* state) {
    if (!state || !g_stateJsonBuffer) return 0;
    return strlen(g_stateJsonBuffer);
}

// Apply state snapshot (for clients)
void game_apply_state(GameState* state, const char* stateJson, int jsonLen) {
    if (!state || !stateJson) return;
    
    // Parse JSON and update state
    // This is a simplified version - in production you'd want proper JSON parsing
    
    // Extract frame number
    const char* frameStr = strstr(stateJson, "\"frameNumber\":");
    if (frameStr) {
        state->frameNumber = atoi(frameStr + 14);
    }
    
    // Extract players array
    const char* playersStr = strstr(stateJson, "\"players\":[");
    if (!playersStr) return;
    
    // Reset all players
    for (int i = 0; i < MAX_PLAYERS; i++) {
        state->players[i].active = false;
    }
    
    // Parse each player
    const char* playerStart = playersStr + 11;
    while (*playerStart && *playerStart != ']') {
        if (*playerStart == '{') {
            // Parse player object
            int id = -1;
            float x = 0, y = 0, vx = 0, vy = 0;
            int health = 100, score = 0;
            
            const char* idStr = strstr(playerStart, "\"id\":");
            if (idStr && idStr < strstr(playerStart, "}")) {
                id = atoi(idStr + 5);
            }
            
            if (id >= 0 && id < MAX_PLAYERS) {
                const char* xStr = strstr(playerStart, "\"x\":");
                const char* yStr = strstr(playerStart, "\"y\":");
                const char* vxStr = strstr(playerStart, "\"vx\":");
                const char* vyStr = strstr(playerStart, "\"vy\":");
                const char* healthStr = strstr(playerStart, "\"health\":");
                const char* scoreStr = strstr(playerStart, "\"score\":");
                
                if (xStr) state->players[id].x = atof(xStr + 4);
                if (yStr) state->players[id].y = atof(yStr + 4);
                if (vxStr) state->players[id].vx = atof(vxStr + 5);
                if (vyStr) state->players[id].vy = atof(vyStr + 5);
                if (healthStr) state->players[id].health = atoi(healthStr + 9);
                if (scoreStr) state->players[id].score = atoi(scoreStr + 8);
                
                state->players[id].active = true;
                state->players[id].id = id;
            }
            
            // Move to next player
            playerStart = strstr(playerStart, "}");
            if (!playerStart) break;
        }
        playerStart++;
    }
}

// Clean up game state
void game_destroy(GameState* state) {
    if (state) {
        delete state;
    }
    if (g_stateJsonBuffer) {
        free(g_stateJsonBuffer);
        g_stateJsonBuffer = nullptr;
        g_stateJsonBufferSize = 0;
    }
}

} // extern "C"