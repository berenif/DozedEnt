# Player Animation System - Modular Architecture

## Overview

The player animation system has been refactored into a modular, single-responsibility architecture. The old god-class `AnimatedPlayer` (1221 lines) has been split into focused modules following the Manager/ViewModel/Coordinator pattern.

## Architecture

### Core Modules

#### 1. **PlayerActionManager** (`manager/PlayerActionManager.js`)
**Responsibility**: Business logic for player actions
- WASM bridge calls (roll, attack, block, parry, jump)
- Action validation and cooldown checks
- Audio/visual effect triggers (non-gameplay)
- Input forwarding to WASM

**Does NOT**:
- Handle rendering/drawing
- Manage animation state
- Calculate transforms

#### 2. **PlayerStateViewModel** (`viewmodel/PlayerStateViewModel.js`)
**Responsibility**: State reading and UI derivation
- Reading WASM state exports
- Deriving UI/render state (hp/stamina ratios, anim state names)
- Providing cached state snapshots
- State name/code conversions

**Does NOT**:
- Mutate game state
- Handle rendering
- Process input

#### 3. **PlayerAnimationCoordinator** (`coordinator/PlayerAnimationCoordinator.js`)
**Responsibility**: Animation composition
- Composing CharacterAnimator + ProceduralAnimator
- Providing unified transform output
- Managing animation state transitions
- Coordinating between animation systems

**Does NOT**:
- Handle game logic
- Render directly
- Process input
- Make WASM calls (reads state only)

#### 4. **AnimatedPlayer** (`procedural/AnimatedPlayerRefactored.js`)
**Responsibility**: Thin facade coordinating all modules
- Coordinates ActionManager, StateViewModel, AnimationCoordinator
- Provides backward-compatible API
- Delegates all responsibilities to appropriate modules

**Does NOT**:
- Render (use `TopDownPlayerRenderer` instead)
- Contain complex logic (delegated to modules)

## File Sizes

| File | Lines | Status |
|------|-------|--------|
| `PlayerActionManager.js` | ~280 | ✅ Under 500 |
| `PlayerStateViewModel.js` | ~320 | ✅ Under 500 |
| `PlayerAnimationCoordinator.js` | ~260 | ✅ Under 500 |
| `AnimatedPlayerRefactored.js` | ~400 | ✅ Under 500 |
| **Total (modular)** | ~1260 | ✅ Each file focused |
| `player-animator.js` (old) | 1221 | ❌ Violates 500-line rule |

## Migration Guide

### For New Code

```javascript
// Use the refactored version
import { AnimatedPlayer } from './animation/player/procedural/AnimatedPlayerRefactored.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

const player = new AnimatedPlayer(x, y, options)
const renderer = new PlayerRenderer(ctx, canvas)

// Game loop
player.update(deltaTime, input)
renderer.render(player.getPlayerState(), toCanvas, radius)
```

### For Existing Code

The refactored `AnimatedPlayer` maintains backward compatibility:

```javascript
// Old code continues to work
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'

const player = new AnimatedPlayer(x, y, options)
player.update(deltaTime, input)

// Deprecated but still works (with warning)
player.render(ctx, camera)

// Recommended: use dedicated renderer
renderer.render(player.getPlayerState(), toCanvas, radius)
```

### Direct Module Usage (Advanced)

For maximum modularity and testability:

```javascript
import PlayerActionManager from './animation/player/manager/PlayerActionManager.js'
import PlayerStateViewModel from './animation/player/viewmodel/PlayerStateViewModel.js'
import PlayerAnimationCoordinator from './animation/player/coordinator/PlayerAnimationCoordinator.js'

// Create modules independently
const actionManager = new PlayerActionManager({ wasmExports, particleSystem, soundSystem })
const stateViewModel = new PlayerStateViewModel({ wasmExports, maxHealth, maxStamina })
const animCoordinator = new PlayerAnimationCoordinator({ proceduralOptions })

// Use in custom player class
class CustomPlayer {
    constructor() {
        this.actions = actionManager
        this.state = stateViewModel
        this.animation = animCoordinator
    }
    
    update(deltaTime, input) {
        this.actions.update(deltaTime)
        this.actions.setPlayerInput(input)
        
        const playerState = this.state.getPlayerState()
        const proceduralValues = this.state.getProceduralValues()
        const overlay = this.state.getAnimationOverlay()
        
        this.transform = this.animation.update(deltaTime, playerState, proceduralValues, overlay)
    }
}
```

## Benefits

### ✅ Single Responsibility Principle
- Each file does one thing well
- Easy to understand and modify
- Clear separation of concerns

### ✅ Modular Design
- Components are interchangeable
- Easy to test in isolation
- Can be reused in different contexts

### ✅ File Size Compliance
- All files under 500 lines
- No god classes
- Easy to navigate and maintain

### ✅ Dependency Injection
- Modules accept dependencies via constructor
- Easy to mock for testing
- Reduces tight coupling

### ✅ Testability
- Each module can be tested independently
- Clear input/output contracts
- No hidden dependencies

## Rendering

**IMPORTANT**: `AnimatedPlayer` no longer handles rendering. Use dedicated renderers:

```javascript
// ✅ CORRECT: Use dedicated renderer
import PlayerRenderer from './renderer/PlayerRenderer.js'
const renderer = new PlayerRenderer(ctx, canvas, { debugLogging: false })
renderer.render(player.getPlayerState(), toCanvas, radius)

// ❌ WRONG: Don't use AnimatedPlayer.render()
player.render(ctx, camera) // Deprecated
```

## Debug Mode

```javascript
// Enable debug mode
player.setDebugMode(true)

// Or use keyboard toggle (F3 by default)
AnimatedPlayer.attachDebugToggle(player, 'F3')
```

## API Reference

### AnimatedPlayer

#### Constructor
```javascript
new AnimatedPlayer(x, y, options)
```

**Options**:
- `wasmModule`: WASM exports object
- `particleSystem`: Particle system instance
- `soundSystem`: Sound system instance
- `proceduralOptions`: Options for procedural animator
- `maxHealth`: Maximum health (default: 100)
- `maxStamina`: Maximum stamina (default: 100)
- `debugMode`: Enable debug mode (default: false)

#### Methods

**Update Loop**:
- `update(deltaTime, input)` - Main update loop
- `getPlayerState()` - Get current state snapshot
- `getCurrentTransform()` - Get transform for rendering
- `getAnimationInfo()` - Get debug info

**Actions**:
- `startRoll(input)` - Start roll/dodge
- `startAttack(type)` - Start attack ('light' or 'heavy')
- `tryParry()` - Attempt parry
- `startBlock()` - Start blocking
- `stopBlock()` - Stop blocking
- `jump()` - Attempt jump

**State Queries**:
- `canAttack()` - Check if can attack (client-side)
- `canRoll()` - Check if can roll (client-side)
- `canBlock()` - Check if can block (client-side)
- `getNormalizedTime()` - Get action progress (0-1)

**Deprecated**:
- `render(ctx, camera)` - Use `TopDownPlayerRenderer` instead

## Testing

Each module can be tested independently:

```javascript
// Test ActionManager
const mockWasm = {
    on_roll_start: () => 1,
    on_attack: (type) => 1,
    // ...
}
const actionManager = new PlayerActionManager({ wasmExports: mockWasm })
const result = actionManager.tryRoll(input, facing)
assert(result === true)

// Test StateViewModel
const stateViewModel = new PlayerStateViewModel({ wasmExports: mockWasm })
const state = stateViewModel.getPlayerState()
assert(state.x === 0.5)
```

## Performance

- No change in runtime performance
- Better code organization enables future optimizations
- Easier to identify and fix performance bottlenecks
- Modular architecture enables code splitting

## Future Enhancements

### Planned
- Add unit tests for each module
- Create integration tests
- Add TypeScript definitions
- Document all WASM exports used
- Add performance profiling hooks

### Possible Extensions
- `PlayerNetworkSync` - Multiplayer state synchronization
- `PlayerAIController` - AI-controlled players
- `PlayerReplaySystem` - Input recording/playback
- `PlayerAbilityManager` - Special abilities system

## Support

For issues or questions:
1. Check this README
2. Review module source code (each file is < 400 lines)
3. Check ANIMATION documentation in `GUIDELINES/ANIMATION/`
4. Review WASM API in `GUIDELINES/BUILD/API.md`

---

**Status**: ✅ **Refactoring Complete**  
**Date**: October 1, 2025  
**Compliance**: Single Responsibility, File Size < 500 lines, Modular Design

