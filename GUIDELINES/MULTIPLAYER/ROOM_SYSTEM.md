# 🏠 Lightweight Room Hosting System

<div align="center">
  <h2>🎮 Multiplayer Room Management with Host Authority</h2>
  <p><strong>P2P room system • Automatic host migration • WASM integration • Real-time updates</strong></p>
</div>

---

## 📌 Overview

A complete multiplayer room management solution built on Trystero's P2P infrastructure, featuring:
- 🌐 **Serverless Architecture** - No backend required, fully P2P
- 👑 **Host Authority** - Room creator manages authoritative game state
- 🔄 **Automatic Migration** - Seamless host handoff with state preservation
- ⚡ **WASM Performance** - Deterministic game logic in WebAssembly
- 🎆 **Live Updates** - Real-time room discovery and player count updates
- 🔒 **Security Features** - Password protection and input validation
- 📊 **Analytics Integration** - Room metrics and performance monitoring

## ✨ Features

- **Room Management**: Create, join, and leave rooms with automatic room discovery
- **Host Authority**: Room creator runs authoritative game logic in WASM
- **Live Updates**: Real-time room list updates showing player counts
- **Host Migration**: Automatic host migration when the current host leaves
- **WASM Integration**: Game state managed in WebAssembly for performance
- **Dark UI Theme**: Lobby UI aligned with the current game's aesthetic

## 🏗️ Architecture

### 📦 Core Components

1. **RoomManager** (`src/netcode/room-manager.js`)
   - Handles room lifecycle (create, join, leave)
   - Manages lobby connections for room discovery
   - Coordinates player communication
   - Implements host migration

2. **HostAuthority** (`src/netcode/host-authority.js`)
   - Manages authoritative game state
   - Integrates with WASM game modules
   - Processes player inputs
   - Broadcasts state updates

3. **RoomLobbyUI** (`src/netcode/room-lobby-ui.js`)
   - Provides UI for room selection
   - Shows live room list with player counts
   - Manages room creation and joining
   - Dark theme matching game aesthetic

## 🚀 Usage

### 🔧 Basic Setup

```javascript
import { RoomManager, HostAuthority, RoomLobbyUI } from 'trystero'

// Initialize room manager
const roomManager = new RoomManager('my-game-id', {
  // Optional configuration
  password: 'optional-encryption-key',
  relayUrls: ['wss://custom-relay.com']
})

// Initialize host authority
const hostAuthority = new HostAuthority(roomManager)

// Initialize UI
const lobbyUI = new RoomLobbyUI('lobby-container')
lobbyUI.setRoomManager(roomManager)

// Show lobby
lobbyUI.show()
```

### 🏠 Creating a Room

```javascript
// Create a room (becomes host)
const room = await roomManager.createRoom('My Game Room', 8, {
  gameMode: 'deathmatch',
  mapId: 'arena1'
})

// As host, initialize WASM game
if (roomManager.isHost) {
  await hostAuthority.initializeGame('game.wasm', {
    maxPlayers: 8
  })
  hostAuthority.startGameLoop()
}
```

### 🚪 Joining a Room

```javascript
// Get available rooms
const rooms = roomManager.getRoomList()

// Join a specific room
await roomManager.joinRoom(roomId)

// Or use quick play
const availableRoom = rooms.find(r => r.playerCount < r.maxPlayers)
if (availableRoom) {
  await roomManager.joinRoom(availableRoom.id)
}
```

### 🎮 Handling Game State

```javascript
// Host sends game state
roomManager.on('onPlayerAction', (action, playerId) => {
  // Process action in game logic
  hostAuthority.handlePlayerAction(action, playerId)
})

// Clients receive state updates
roomManager.on('onGameStateUpdate', (state) => {
  // Update local game rendering
  renderGameState(state)
})

// Send player input
hostAuthority.sendInput({
  type: 'move',
  dx: 1,
  dy: 0,
  timestamp: Date.now()
})
```

### 📦 WASM Game Interface

The WASM game module should export these functions:

```c
// Initialize game with config
void game_init(const char* config_json, int len);

// Create game state for max players
void* game_create_state(int max_players);

// Update game logic (called by host)
void game_update(void* state, float delta_time);

// Process player input
void game_handle_input(void* state, int player_index, 
                      const char* input_json, int len);

// Get current state as JSON
const char* game_get_state(void* state);
int game_get_state_size(void* state);

// Apply state snapshot (for clients)
void game_apply_state(void* state, const char* state_json, int len);

// Clean up
void game_destroy(void* state);
```

## 📡 Room Events

### 📋 RoomManager Events

```javascript
roomManager.on('onRoomListUpdate', (rooms) => {
  console.log('Available rooms:', rooms)
})

roomManager.on('onPlayerJoin', (playerId) => {
  console.log('Player joined:', playerId)
})

roomManager.on('onPlayerLeave', (playerId) => {
  console.log('Player left:', playerId)
})

roomManager.on('onHostMigration', (newHostId) => {
  console.log('New host:', newHostId)
})

roomManager.on('onGameStateUpdate', (state) => {
  console.log('Game state updated:', state)
})
```

## 🔄 Host Migration

When the current host leaves, the system automatically migrates host responsibilities:

1. Oldest player (by ID) becomes new host
2. New host starts running game loop
3. All players are notified of the change
4. Game state continuity is maintained

## 🔒 Security Considerations

- Room creators have full authority over game state
- All game logic runs on the host's machine
- Clients should validate received state for sanity
- Use password option for private rooms
- Consider implementing anti-cheat measures in WASM

## 🚀 Performance Tips

- Keep state updates small and frequent (10-30 Hz)
- Use delta compression for state updates
- Run game logic at fixed timestep (60 Hz)
- Buffer and interpolate on clients
- Implement client-side prediction for responsiveness

## 🎮 Demo Application

See `/demo/room-demo.html` for a complete working example with:
- Room creation and joining
- Live player movement
- Health bars and combat
- Host authority game state
- Responsive controls

## 🔨 Building WASM Games

To compile your C++ game to WASM:

```bash
# Install Emscripten SDK first
./scripts/build-wasm-host.sh

# Or manually:
emcc game.cpp -O3 \
  -s STANDALONE_WASM=1 \
  -s EXPORTED_FUNCTIONS='[...]' \
  -o game.wasm
```

## 🌐 Browser Compatibility

### ✅ Supported Browsers

- Requires WebRTC support
- Works in all modern browsers
- Mobile support with touch controls
- No server infrastructure needed