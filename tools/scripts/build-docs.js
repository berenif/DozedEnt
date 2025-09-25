#!/usr/bin/env node

/**
 * Documentation Build Script for Trystero Game Framework
 * 
 * This script builds documentation for the Trystero game development framework,
 * including API documentation, guides, and demo pages.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')

console.log('📚 Building Trystero Game Framework Documentation...')

// Use project root as the deployment directory
const docsDir = projectRoot

// Build API documentation
function buildApiDocs() {
  console.log('📖 Building API documentation...')
  
  const apiDoc = `# Trystero Game Framework API

## Core Networking

### \`joinRoom(config, roomId, [onJoinError])\`

Creates or joins a room for P2P communication.

**Parameters:**
- \`config\` - Configuration object
  - \`appId\` (required) - Unique app identifier
  - \`password\` (optional) - Encryption password
  - \`rtcConfig\` (optional) - Custom RTC configuration
  - \`turnConfig\` (optional) - TURN server configuration
- \`roomId\` - Room identifier string
- \`onJoinError\` (optional) - Error callback function

**Returns:** Room object with networking methods

### Room Methods

#### \`room.makeAction(actionId)\`
Creates a custom data action for sending/receiving data.

**Returns:** \`[sendFunction, receiveFunction, progressFunction]\`

#### \`room.addStream(stream, [targetPeers], [metadata])\`
Broadcasts media stream to peers.

#### \`room.onPeerJoin(callback)\`
Registers callback for peer join events.

#### \`room.onPeerLeave(callback)\`
Registers callback for peer leave events.

## Game Development Classes

### AnimatedPlayer

Complete player character with animation states and combat mechanics.

\`\`\`javascript
import AnimatedPlayer from 'trystero/dist/player-animator.js'

const player = new AnimatedPlayer(x, y, {
  health: 100,
  stamina: 100,
  speed: 250,
  attackDamage: 20
})
\`\`\`

**Methods:**
- \`update(deltaTime, input)\` - Update player state
- \`render(ctx)\` - Render to canvas
- \`attack()\` - Perform melee attack
- \`block()\` - Enter blocking stance
- \`roll()\` - Perform dodge roll

### WolfCharacter

AI-controlled wolf enemy with pack behaviors.

\`\`\`javascript
import WolfCharacter from 'trystero/dist/wolf-character.js'

const wolf = new WolfCharacter(x, y, {
  role: 'Alpha',
  intelligence: 0.9,
  aggression: 0.8
})
\`\`\`

**Methods:**
- \`update(deltaTime, player, obstacles)\` - Update AI behavior
- \`render(ctx)\` - Render wolf
- \`setMood(mood)\` - Set emotional state

### RollbackNetcode

Professional-grade netcode for synchronized multiplayer.

\`\`\`javascript
import {RollbackNetcode} from 'trystero/dist/rollback-netcode.js'

const netcode = new RollbackNetcode({
  room,
  inputDelay: 2,
  rollbackFrames: 7
})
\`\`\`

**Methods:**
- \`registerUpdate(callback)\` - Register game update function
- \`start()\` - Start synchronized game loop
- \`stop()\` - Stop game loop

### LobbySystem

Complete lobby and matchmaking system.

\`\`\`javascript
import LobbySystem from 'trystero/dist/enhanced-lobby-ui.js'

const lobby = new LobbySystem({
  maxPlayers: 4,
  gameMode: 'deathmatch',
  skillMatching: true
})
\`\`\`

**Methods:**
- \`createRoom(name, settings)\` - Create new room
- \`joinRoom(roomId)\` - Join existing room
- \`quickMatch()\` - Auto-join based on skill

### GameRenderer

High-performance rendering system with visual effects.

\`\`\`javascript
import GameRenderer from 'trystero/dist/game-renderer.js'

const renderer = new GameRenderer(canvas, {
  layers: ['background', 'game', 'effects', 'ui'],
  antialiasing: true
})
\`\`\`

**Methods:**
- \`renderLayer(name, callback)\` - Render to specific layer
- \`addParticleEffect(type, x, y)\` - Add particle effect
- \`shakeCamera(intensity, duration)\` - Camera shake effect

## Building Complete Games

Here's how to combine all systems for a complete multiplayer game:

\`\`\`javascript
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
\`\`\`

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
`

  writeFileSync(join(docsDir, 'API.md'), apiDoc)
  console.log('✅ API documentation built')
}

// Build getting started guide
function buildGettingStartedGuide() {
  console.log('🚀 Building getting started guide...')
  
  const guide = `# Getting Started with Trystero Game Framework

## Quick Start

### 1. Installation

\`\`\`bash
npm install trystero
\`\`\`

### 2. Basic Setup

\`\`\`javascript
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
\`\`\`

### 3. Add Multiplayer

\`\`\`javascript
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
\`\`\`

### 4. Add AI Enemies

\`\`\`javascript
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
\`\`\`

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
`

  writeFileSync(join(docsDir, 'GETTING_STARTED.md'), guide)
  console.log('✅ Getting started guide built')
}

// Build main index
function buildMainIndex() {
  console.log('🎮 Building main index...')
  
  // The index.html is already created manually in the root
  // This function is kept for compatibility but doesn't override the existing file
  console.log('✅ Main index already exists in root')
}

// Copy dist assets to docs folder for deployment
function copyDistAssets() {
  console.log('📦 Copying dist assets to docs folder...')
  
  const distPath = join(projectRoot, 'dist')
  const docsPath = join(projectRoot, 'docs')
  
  if (!existsSync(distPath)) {
    console.log('⚠️  No dist folder found, skipping asset copy')
    return
  }
  
  try {
    // Ensure docs/dist directory exists
    const docsDistPath = join(docsPath, 'dist')
    if (!existsSync(docsDistPath)) {
      mkdirSync(docsDistPath, { recursive: true })
    }
    
    // Copy dist contents to docs/dist (Windows compatible)
    if (process.platform === 'win32') {
      execSync(`xcopy "${distPath}\\*" "${docsDistPath}\\" /E /I /Y`, { stdio: 'inherit' })
    } else {
      execSync(`cp -r ${distPath}/* ${docsDistPath}/`, { stdio: 'inherit' })
    }
    
    // Copy WASM files to docs root for easy access
    const wasmPath = join(distPath, 'wasm')
    if (existsSync(wasmPath)) {
      if (process.platform === 'win32') {
        execSync(`copy "${wasmPath}\\*.wasm" "${docsPath}\\"`, { stdio: 'inherit' })
      } else {
        execSync(`cp ${wasmPath}/*.wasm ${docsPath}/`, { stdio: 'inherit' })
      }
    }
    
    // Copy core modules to docs root
    const corePath = join(distPath, 'core')
    if (existsSync(corePath)) {
      if (process.platform === 'win32') {
        execSync(`xcopy "${corePath}" "${docsPath}\\core\\" /E /I /Y`, { stdio: 'inherit' })
      } else {
        execSync(`cp -r ${corePath} ${docsPath}/`, { stdio: 'inherit' })
      }
    }
    
    // Copy animations to docs root
    const animationsPath = join(distPath, 'animations')
    if (existsSync(animationsPath)) {
      if (process.platform === 'win32') {
        execSync(`xcopy "${animationsPath}" "${docsPath}\\animations\\" /E /I /Y`, { stdio: 'inherit' })
      } else {
        execSync(`cp -r ${animationsPath} ${docsPath}/`, { stdio: 'inherit' })
      }
    }
    
    console.log('✅ Dist assets copied to docs folder')
    
  } catch (error) {
    console.error('❌ Error copying dist assets:', error.message)
    // Don't fail the build if copying fails
  }
}

// Main build function
async function buildDocs() {
  try {
    buildApiDocs()
    buildGettingStartedGuide()
    buildMainIndex()
    copyDistAssets()
    
    console.log('\\n🎉 Documentation build complete!')
    console.log('📁 Files created in root directory:')
    console.log('   - API.md')
    console.log('   - GETTING_STARTED.md')
    console.log('   - index.html (main landing page)')
    console.log('📁 Assets copied to docs folder:')
    console.log('   - dist/ (all built assets)')
    console.log('   - *.wasm (WASM modules)')
    console.log('   - core/ (networking modules)')
    console.log('   - animations/ (animation modules)')
    console.log('\\n🌐 Open docs/index.html in your browser to view the game')
    
  } catch (error) {
    console.error('❌ Error building documentation:', error)
    process.exit(1)
  }
}

// Run the build
buildDocs()