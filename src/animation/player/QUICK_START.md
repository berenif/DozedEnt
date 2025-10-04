# Quick Start - Refactored Player Animation System

## TL;DR

```javascript
// New modular approach (recommended)
import { AnimatedPlayer } from './animation/player/index.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

const player = new AnimatedPlayer(400, 300, { maxHealth: 100, maxStamina: 100 })
const renderer = new PlayerRenderer(ctx, canvas, { debugLogging: false })

function gameLoop(deltaTime) {
    // 1. Update player (handles input, WASM, animations)
    player.update(deltaTime, input)
    
    // 2. Render using dedicated renderer
    const playerState = player.getPlayerState()
    renderer.render(playerState, toCanvas, baseRadius)
}
```

## What Changed?

### ✅ Fixed Bugs
1. **`renderVelocity` scoping bug** - Fixed in `TopDownPlayerRenderer`
2. **Logging noise** - Added `debugLogging` flag (default: off)

### ✅ Architecture Improvements
Old god class (1221 lines) → 4 focused modules (< 500 lines each):

| Module | Purpose | Lines |
|--------|---------|-------|
| **PlayerActionManager** | WASM calls, actions | 280 |
| **PlayerStateViewModel** | State reading, UI data | 320 |
| **PlayerAnimationCoordinator** | Animation composition | 260 |
| **AnimatedPlayer** | Thin facade | 400 |

### ✅ Compliance
- ✅ All files < 500 lines
- ✅ Single responsibility per module
- ✅ Modular, testable, reusable
- ✅ No rendering in player logic
- ✅ Clean separation of concerns

## Migration Guide

### Your Existing Code Still Works!

```javascript
// Old code (still works, no changes needed)
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
const player = new AnimatedPlayer(x, y, options)
player.update(deltaTime, input)
player.render(ctx, camera) // Deprecated but functional
```

### Recommended Migration (Simple)

```javascript
// Step 1: Change import to new version
import { AnimatedPlayer } from './animation/player/index.js'
// or
import { AnimatedPlayer } from './animation/player/procedural/AnimatedPlayerRefactored.js'

// Step 2: Create dedicated renderer
import PlayerRenderer from './renderer/PlayerRenderer.js'
const renderer = new PlayerRenderer(ctx, canvas)

// Step 3: Update render call
// OLD: player.render(ctx, camera)
// NEW:
renderer.render(player.getPlayerState(), toCanvas, baseRadius)
```

## Usage Examples

### Basic Setup

```javascript
import { AnimatedPlayer } from './animation/player/index.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

// Create player
const player = new AnimatedPlayer(400, 300, {
    maxHealth: 100,
    maxStamina: 100,
    debugMode: false,
    particleSystem: myParticleSystem,
    soundSystem: mySoundSystem
})

// Create renderer
const renderer = new PlayerRenderer(ctx, canvas, {
    mode: 'physics', // or 'procedural'
    debugLogging: false
})

// Enable debug mode with F3
AnimatedPlayer.attachDebugToggle(player, 'F3')
```

### Game Loop

```javascript
function update(deltaTime) {
    // Handle input
    const input = AnimatedPlayer.createInputFromKeys(keys)
    
    // Update player
    player.update(deltaTime, input)
    
    // Render
    const state = player.getPlayerState()
    renderer.render(state, toCanvas, 20) // 20 = base radius
}
```

### Actions

```javascript
// Roll/dodge
player.startRoll(input)

// Attack
player.startAttack('light')  // or 'heavy'
player.queueAttack('heavy')  // for combos

// Block
player.startBlock()
player.stopBlock()

// Parry
player.tryParry()

// Jump
player.jump()
```

### State Queries

```javascript
// Get full state
const state = player.getPlayerState()
console.log(state.x, state.y, state.hp, state.stamina)

// Check availability (client-side prediction)
if (player.canAttack()) {
    player.startAttack('light')
}

if (player.canRoll()) {
    player.startRoll(input)
}

// Get animation info
const info = player.getAnimationInfo()
console.log(info.state, info.frame)
```

## Advanced: Direct Module Usage

```javascript
import {
    PlayerActionManager,
    PlayerStateViewModel,
    PlayerAnimationCoordinator
} from './animation/player/index.js'

// Create modules independently
const actions = new PlayerActionManager({ wasmExports })
const state = new PlayerStateViewModel({ wasmExports })
const animation = new PlayerAnimationCoordinator({ proceduralOptions })

// Use in custom player
class MyPlayer {
    update(deltaTime, input) {
        actions.update(deltaTime)
        actions.setPlayerInput(input)
        
        const playerState = state.getPlayerState()
        const proceduralValues = state.getProceduralValues()
        const overlay = state.getAnimationOverlay()
        
        this.transform = animation.update(deltaTime, playerState, proceduralValues, overlay)
    }
}
```

## Debugging

```javascript
// Enable debug mode
player.setDebugMode(true)

// Or with keyboard toggle
AnimatedPlayer.attachDebugToggle(player, 'F3')

// Enable renderer debug logging
const renderer = new PlayerRenderer(ctx, canvas, { debugLogging: true })

// Enable physics debug overlay
const renderer = new PlayerRenderer(ctx, canvas, { 
    mode: 'physics',
    physics: { debug: true }
})
```

## Common Issues

### Q: Player not moving?
**A**: Check that WASM is loaded and inputs are forwarded:
```javascript
console.log(player.getPlayerState())
// Should show changing x, y, vx, vy
```

### Q: Animation not updating?
**A**: Verify deltaTime is reasonable:
```javascript
// Should be ~0.016 for 60 FPS
player.update(deltaTime, input)
```

### Q: Render not showing?
**A**: Check renderer setup:
```javascript
// Ensure toCanvas function is correct
const toCanvas = (x, y) => ({
    x: x * worldWidth,
    y: y * worldHeight
})

renderer.render(player.getPlayerState(), toCanvas, baseRadius)
```

### Q: Using old player-animator.js?
**A**: Gradually migrate to new version:
```javascript
// Step 1: Import from new location (same behavior)
import { AnimatedPlayer } from './animation/player/index.js'

// Step 2: Use dedicated renderer when ready
import PlayerRenderer from './renderer/PlayerRenderer.js'
```

## Performance Tips

1. **Reuse state snapshot** - Call `getPlayerState()` once per frame
2. **Disable debug logging** - Set `debugLogging: false` in production
3. **Use physics mode for top-down** - More efficient for simpler views
4. **Cache renderer instance** - Don't recreate every frame

## Documentation

- **Full API**: See `public/src/animation/player/README.md`
- **Architecture**: See `public/src/REFACTORING_SUMMARY.md`
- **Animation System**: See `GUIDELINES/ANIMATION/README.md`
- **WASM API**: See `GUIDELINES/BUILD/API.md`

## Support

1. Check this quick start
2. Review module README files
3. Check animation guidelines
4. Inspect module source (each < 400 lines!)

---

**Ready to use!** The new architecture is fully backward compatible while providing better organization, testability, and maintainability.

