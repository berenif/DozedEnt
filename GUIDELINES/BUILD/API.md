# Trystero Game Framework API

## Core Networking

### `joinRoom(config, roomId, [onJoinError])`

Creates or joins a room for P2P communication.

**Parameters:**
- `config` - Configuration object
  - `appId` (required) - Unique app identifier
  - `password` (optional) - Encryption password
  - `rtcConfig` (optional) - Custom RTC configuration
  - `turnConfig` (optional) - TURN server configuration
- `roomId` - Room identifier string
- `onJoinError` (optional) - Error callback function

**Returns:** Room object with networking methods

### Room Methods

#### `room.makeAction(actionId)`
Creates a custom data action for sending/receiving data.

**Returns:** `[sendFunction, receiveFunction, progressFunction]`

#### `room.addStream(stream, [targetPeers], [metadata])`
Broadcasts media stream to peers.

#### `room.onPeerJoin(callback)`
Registers callback for peer join events.

#### `room.onPeerLeave(callback)`
Registers callback for peer leave events.

## Game Development Classes

### AnimatedPlayer

Complete player character with animation states and combat mechanics.

```javascript
import AnimatedPlayer from 'trystero/dist/player-animator.js'

const player = new AnimatedPlayer(x, y, {
  health: 100,
  stamina: 100,
  speed: 250,
  attackDamage: 20
})
```

**Methods:**
- `update(deltaTime, input)` - Update player state
- `render(ctx)` - Render to canvas
- `attack()` - Perform melee attack
- `block()` - Enter blocking stance
- `roll()` - Perform dodge roll

### WolfCharacter

AI-controlled wolf enemy with pack behaviors.

```javascript
import WolfCharacter from 'trystero/dist/wolf-character.js'

const wolf = new WolfCharacter(x, y, {
  role: 'Alpha',
  intelligence: 0.9,
  aggression: 0.8
})
```

**Methods:**
- `update(deltaTime, player, obstacles)` - Update AI behavior
- `render(ctx)` - Render wolf
- `setMood(mood)` - Set emotional state

### RollbackNetcode

Professional-grade netcode for synchronized multiplayer.

```javascript
import {RollbackNetcode} from 'trystero/dist/rollback-netcode.js'

const netcode = new RollbackNetcode({
  room,
  inputDelay: 2,
  rollbackFrames: 7
})
```

**Methods:**
- `registerUpdate(callback)` - Register game update function
- `start()` - Start synchronized game loop
- `stop()` - Stop game loop

### LobbySystem

Complete lobby and matchmaking system.

```javascript
import LobbySystem from 'trystero/dist/enhanced-lobby-ui.js'

const lobby = new LobbySystem({
  maxPlayers: 4,
  gameMode: 'deathmatch',
  skillMatching: true
})
```

**Methods:**
- `createRoom(name, settings)` - Create new room
- `joinRoom(roomId)` - Join existing room
- `quickMatch()` - Auto-join based on skill

### GameRenderer

High-performance rendering system with visual effects.

```javascript
import GameRenderer from 'trystero/dist/game-renderer.js'

const renderer = new GameRenderer(canvas, {
  layers: ['background', 'game', 'effects', 'ui'],
  antialiasing: true
})
```

**Methods:**
- `renderLayer(name, callback)` - Render to specific layer
- `addParticleEffect(type, x, y)` - Add particle effect
- `shakeCamera(intensity, duration)` - Camera shake effect

## Building Complete Games

Here's how to combine all systems for a complete multiplayer game:

```javascript
import {joinRoom} from 'trystero'
import AnimatedPlayer from 'trystero/dist/player-animator.js'
import WolfCharacter from 'trystero/dist/wolf-character.js'
import {RollbackNetcode} from 'trystero/dist/rollback-netcode.js'
import LobbySystem from 'trystero/dist/enhanced-lobby-ui.js'
import GameRenderer from 'trystero/dist/game-renderer.js'

// 1. Set up lobby
const lobby = new LobbySystem({
  maxPlayers: 4,
  gameMode: 'survival'
})

// 2. When game starts, initialize networking
lobby.onGameStart(roomId => {
  const room = joinRoom({appId: 'my-game'}, roomId)
  
  // 3. Set up rollback netcode
  const netcode = new RollbackNetcode({room, inputDelay: 2})
  
  // 4. Initialize game renderer
  const renderer = new GameRenderer(canvas, {
    layers: ['background', 'game', 'effects', 'ui']
  })
  
  // 5. Create player character
  const player = new AnimatedPlayer(100, 100)
  
  // 6. Spawn AI enemies
  const wolves = [
    new WolfCharacter(500, 200, {role: 'Alpha'}),
    new WolfCharacter(550, 250, {role: 'Beta'})
  ]
  
  // 7. Game loop with rollback
  netcode.registerUpdate((inputs, frame) => {
    player.update(deltaTime, inputs[selfId])
    wolves.forEach(wolf => wolf.update(deltaTime, player))
    
    renderer.clear()
    renderer.renderLayer('game', () => {
      player.render(renderer.ctx)
      wolves.forEach(wolf => wolf.render(renderer.ctx))
    })
  })
  
  netcode.start()
})
```

## Data-Driven Balance (WASM)

- Constants for movement/combat/enemy tuning are externalized under `data/balance/`.
- A generator creates `src/wasm/generated/balance_data.h` which is included by WASM headers.

Build scripts automatically run the generator; you can also run:

```bash
npm run balance:gen
```

## Performance Tips

1. **Use object pooling** for frequently created/destroyed objects
2. **Batch render calls** using the GameRenderer layer system
3. **Limit particle effects** to maintain 60 FPS
4. **Use rollback netcode** for competitive multiplayer
5. **Profile with PerformanceMonitor** for optimization

## Browser Compatibility

- Modern browsers with WebRTC support
- ES2020+ features required
- Canvas 2D rendering
- Web Audio API for sound effects

## License

MIT License - see LICENSE file for details.
