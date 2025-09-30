# 🚀 Getting Started with Enhanced Trystero Game Framework

## Quick Start

### 1. Installation

```bash
npm install trystero
# Or clone the repository for development
git clone https://github.com/your-repo/trystero-game-framework.git
cd trystero-game-framework
npm install
```

### 2. Enhanced Basic Setup

```javascript
import {joinRoom} from 'trystero'
import AnimatedPlayer from 'trystero/dist/player-animator.js'
import {EnhancedLobbyUI} from 'trystero/dist/enhanced-lobby-ui.js'

// Initialize enhanced lobby system
const lobby = new EnhancedLobbyUI('lobby-container', 'my-game', {
  enableChat: true,
  enableSpectators: true,
  enableMatchmaking: true,
  maxRooms: 100
})

// Create a room with advanced features
const room = await lobby.roomManager.createRoom({
  name: 'Epic Battle Room',
  type: 'public',
  maxPlayers: 8,
  gameMode: 'deathmatch',
  timeLimit: 600,
  allowSpectators: true
})

// Create an enhanced player with WASM integration
const player = new AnimatedPlayer(100, 100, {
  health: 100,
  stamina: 100,
  speed: 250,
  particleSystem: particleSystem,
  soundSystem: soundSystem
})

// Enhanced game loop with WASM integration
function gameLoop() {
  requestAnimationFrame(gameLoop)
  
  // Update player with input
  const input = AnimatedPlayer.createInputFromKeys(keys)
  player.update(16, input) // 16ms delta time
  
  // Render player with camera
  const canvas = document.getElementById('gameCanvas')
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  player.render(ctx, camera)
}

gameLoop()
```

### 3. Add Multiplayer

```javascript
// Sync player position across peers
const [sendPosition, getPosition] = room.makeAction('position')

// Send position updates
setInterval(() => {
  sendPosition({
    x: player.x,
    y: player.y,
    state: player.currentState
  })
}, 1000/60) // 60 FPS

// Receive position updates
getPosition((data, peerId) => {
  // Update remote player positions
  updateRemotePlayer(peerId, data)
})
```

### 4. Add AI Enemies

```javascript
import WolfCharacter from 'trystero/dist/wolf-character.js'

// Create wolf pack
const wolves = [
  new WolfCharacter(500, 200, {role: 'Alpha'}),
  new WolfCharacter(550, 250, {role: 'Beta'})
]

// Update wolves in game loop
wolves.forEach(wolf => {
  wolf.update(16, player) // Update with player as target
  wolf.render(ctx)
})
```

## Next Steps

1. **Add Combat System** - Implement melee attacks and blocking
2. **Set up Rollback Netcode** - For competitive multiplayer
3. **Create Lobby System** - For matchmaking and room management
4. **Add Visual Effects** - Particle systems and camera effects
5. **Implement Audio** - Spatial sound system

## Examples

- [Complete Game Demo](complete-game.html)
- [Animation Showcase](animations-showcase.html)
- [Wolf AI Demo](wolf-animation-demo.html)
- [Lobby System Demo](enhanced-lobby-demo.html)

## Resources

- [Full API Documentation](../BUILD/API.md)
- [Animation System Guide](../ANIMATION/PLAYER_ANIMATIONS.md)
- [Wolf AI Documentation](../AI/WOLF_AI.md)
- [Lobby System Guide](../MULTIPLAYER/LOBBY_SYSTEM.md)
