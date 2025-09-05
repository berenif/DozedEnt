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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('📚 Building Trystero Game Framework Documentation...')

// Ensure docs directory exists
const docsDir = join(projectRoot, 'docs')
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true })
}

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

// Build demo index
function buildDemoIndex() {
  console.log('🎮 Building demo index...')
  
  const demoIndex = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trystero Game Framework - Demos</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 40px;
            font-size: 2.5em;
        }
        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .demo-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 2px solid transparent;
        }
        .demo-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        .demo-card h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .demo-card p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .demo-link {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s ease;
        }
        .demo-link:hover {
            transform: scale(1.05);
        }
        .feature-list {
            text-align: left;
            margin: 20px 0;
        }
        .feature-list li {
            margin: 8px 0;
            color: #555;
        }
        .emoji {
            font-size: 2em;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Trystero Game Framework Demos</h1>
        
        <div class="demo-grid">
            <div class="demo-card">
                <div class="emoji">⚔️</div>
                <h3>Complete Game Demo</h3>
                <p>Full multiplayer survival game showcasing all systems working together.</p>
                <ul class="feature-list">
                    <li>✅ Player animations & combat</li>
                    <li>✅ Wolf AI pack behavior</li>
                    <li>✅ Rollback netcode</li>
                    <li>✅ Lobby system</li>
                </ul>
                <a href="complete-game.html" class="demo-link">Play Demo</a>
            </div>
            
            <div class="demo-card">
                <div class="emoji">🎭</div>
                <h3>Animation Showcase</h3>
                <p>Interactive demo of the player animation system with all states and transitions.</p>
                <ul class="feature-list">
                    <li>✅ 7 animation states</li>
                    <li>✅ Smooth transitions</li>
                    <li>✅ Combat mechanics</li>
                    <li>✅ Visual effects</li>
                </ul>
                <a href="animations-showcase.html" class="demo-link">View Demo</a>
            </div>
            
            <div class="demo-card">
                <div class="emoji">🐺</div>
                <h3>Wolf AI Demo</h3>
                <p>Advanced AI system demonstration with pack behaviors and adaptive difficulty.</p>
                <ul class="feature-list">
                    <li>✅ Pack intelligence</li>
                    <li>✅ Adaptive difficulty</li>
                    <li>✅ Environmental awareness</li>
                    <li>✅ Memory system</li>
                </ul>
                <a href="wolf-animation-demo.html" class="demo-link">Watch AI</a>
            </div>
            
            <div class="demo-card">
                <div class="emoji">🏠</div>
                <h3>Lobby System Demo</h3>
                <p>Complete multiplayer lobby with matchmaking and room management.</p>
                <ul class="feature-list">
                    <li>✅ Room creation</li>
                    <li>✅ Skill-based matching</li>
                    <li>✅ Real-time chat</li>
                    <li>✅ Spectator mode</li>
                </ul>
                <a href="enhanced-lobby-demo.html" class="demo-link">Join Lobby</a>
            </div>
            
            <div class="demo-card">
                <div class="emoji">🌀</div>
                <h3>Rollback Demo</h3>
                <p>Professional netcode demonstration with frame-perfect synchronization.</p>
                <ul class="feature-list">
                    <li>✅ Rollback & prediction</li>
                    <li>✅ Deterministic simulation</li>
                    <li>✅ Lag compensation</li>
                    <li>✅ Frame synchronization</li>
                </ul>
                <a href="rollback-demo.html" class="demo-link">Test Netcode</a>
            </div>
            
            <div class="demo-card">
                <div class="emoji">🎨</div>
                <h3>Game Renderer Demo</h3>
                <p>High-performance rendering system with visual effects and optimizations.</p>
                <ul class="feature-list">
                    <li>✅ Layer management</li>
                    <li>✅ Particle systems</li>
                    <li>✅ Camera effects</li>
                    <li>✅ Performance optimization</li>
                </ul>
                <a href="renderer-demo.html" class="demo-link">See Effects</a>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #eee;">
            <p style="color: #666; font-size: 1.1em;">
                🚀 <strong>Ready to build your own game?</strong><br>
                Check out the <a href="GETTING_STARTED.md" style="color: #667eea;">Getting Started Guide</a> 
                and <a href="API.md" style="color: #667eea;">API Documentation</a>
            </p>
        </div>
    </div>
</body>
</html>`

  writeFileSync(join(docsDir, 'index.html'), demoIndex)
  console.log('✅ Demo index built')
}

// Main build function
async function buildDocs() {
  try {
    buildApiDocs()
    buildGettingStartedGuide()
    buildDemoIndex()
    
    console.log('\\n🎉 Documentation build complete!')
    console.log('📁 Files created in /docs directory:')
    console.log('   - API.md')
    console.log('   - GETTING_STARTED.md')
    console.log('   - index.html')
    console.log('\\n🌐 Open docs/index.html in your browser to view the demos')
    
  } catch (error) {
    console.error('❌ Error building documentation:', error)
    process.exit(1)
  }
}

// Run the build
buildDocs()