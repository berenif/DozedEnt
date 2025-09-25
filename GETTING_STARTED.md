# Getting Started with Trystero Game Framework

## Quick Start

### 1. Installation

```bash
npm install trystero
```

### 2. Basic Setup

```javascript
import {joinRoom} from 'trystero'
import AnimatedPlayer from 'trystero/dist/player-animator.js'

// Create a room
const room = joinRoom({appId: 'my-game'}, 'game-room')

// Create a player
const player = new AnimatedPlayer(100, 100)

// Game loop
function gameLoop() {
  requestAnimationFrame(gameLoop)
  
  // Update player
  player.update(16, {}) // 16ms delta time
  
  // Render player
  const canvas = document.getElementById('gameCanvas')
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  player.render(ctx)
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

- [Full API Documentation](API.md)
- [Animation System Guide](PLAYER_ANIMATIONS.md)
- [Wolf AI Documentation](WOLF_AI.md)
- [Lobby System Guide](LOBBY_SYSTEM.md)
