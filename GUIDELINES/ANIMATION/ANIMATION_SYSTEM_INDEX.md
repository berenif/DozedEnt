# Animation System Documentation Index

## Complete Animation System Overview

The game's animation system provides comprehensive character animations with smooth transitions, procedural effects, and state management. This documentation covers all aspects of the animation implementation.

## Core Documentation

### 1. [Player Animations](./PLAYER_ANIMATIONS.md)
Complete documentation for all player character animations including:
- **Roll Animation**: Evasive dodge with invulnerability frames
- **Attack Animation**: Melee combat with hitbox generation
- **Block Animation**: Defensive stance with damage reduction
- **Hurt Animation**: Damage reaction with knockback
- **Movement Animations**: Idle and running states
- **Death Animation**: Game over state

### 2. Animation System Architecture

#### Core Components

1. **Animation Frame System** (`src/animation/animation-system.js`)
   - Frame-based sprite animation
   - Timing and duration control
   - Looping and one-shot animations

2. **Animation Controller** (`src/animation/animation-system.js`)
   - State machine for animation transitions
   - Smooth blending between animations
   - Animation queueing and priorities

3. **Character Animator** (`src/animation/animation-system.js`)
   - High-level character animation management
   - Procedural animation overlays
   - State-based animation selection

4. **Player Animator** (`src/animation/player-animator.js`)
   - Complete player implementation
   - Input handling and state management
   - Combat system integration

## Quick Start Guide

### Basic Setup

```javascript
import AnimatedPlayer from './src/animation/player-animator.js'

// Create an animated player
const player = new AnimatedPlayer(x, y, {
    health: 100,
    stamina: 100,
    speed: 250
})

// In your game loop
function update(deltaTime) {
    const input = AnimatedPlayer.createInputFromKeys(keys)
    player.update(deltaTime, input)
}

function render(ctx) {
    player.render(ctx)
}
```

### Animation States

| State | Trigger | Duration | Effects |
|-------|---------|----------|---------|
| **Idle** | No input | Continuous | Breathing animation |
| **Running** | WASD/Arrows | While moving | Speed-based animation |
| **Attack** | Space/J | 0.4s | Damage dealing, particles |
| **Block** | Shift/K (hold) | While held | 50% damage reduction |
| **Roll** | Ctrl/L | 0.4s | Invulnerability, speed boost |
| **Hurt** | Take damage | 0.3s | Knockback, red flash |
| **Dead** | Health = 0 | Until respawn | No input accepted |



## Animation Features

### Visual Effects

1. **Particle Systems**
   - Attack slash effects
   - Roll dust clouds
   - Block shield shimmer
   - Damage blood effects
   - Death explosions

2. **Color Feedback**
   - State-based color changes
   - Invulnerability flashing
   - Health-based tinting
   - Team color support

3. **UI Integration**
   - Health bars
   - Stamina bars
   - State indicators
   - Cooldown timers

### Performance Optimizations

1. **Efficient Rendering**
   - Sprite sheet usage
   - Frame caching
   - Conditional updates
   - Viewport culling

2. **State Management**
   - Minimal state transitions
   - Pooled objects
   - Optimized collision detection
   - Delta time compensation

## API Reference

### AnimatedPlayer Class

```javascript
class AnimatedPlayer {
    // Constructor
    constructor(x, y, options)
    
    // Core Methods
    update(deltaTime, input)
    render(ctx, camera)
    
    // Combat Methods
    takeDamage(damage, knockbackX, knockbackY)
    executeAttack()
    startBlock()
    stopBlock()
    
    // Movement Methods
    startRoll(input)
    handleMovement(deltaTime, input, speedMultiplier)
    
    // State Methods
    setState(newState)
    canAttack()
    canRoll()
    canBlock()
    
    // Utility Methods
    respawn(x, y)
    getAnimationInfo()
    
    // Static Methods
    static createInputFromKeys(keys)
}
```

### Animation Presets

```javascript
import { AnimationPresets } from './src/animation/animation-system.js'

// Get player animations
const playerAnimations = AnimationPresets.createPlayerAnimations()

// Get enemy animations
const wolfAnimations = AnimationPresets.createWolfAnimations()

// Get effect animations
const effectAnimations = AnimationPresets.createEffectAnimations()
```

## Integration Examples

### With Particle System

```javascript
import { ParticleSystem } from './src/particle-system.js'

const particles = new ParticleSystem()
const player = new AnimatedPlayer(x, y, {
    particleSystem: particles
})

// In render loop
particles.render(ctx)
```

### With Sound System

```javascript
import { SoundSystem } from './src/sound-system.js'

const sounds = new SoundSystem()
const player = new AnimatedPlayer(x, y, {
    soundSystem: sounds
})
```

### With Game Renderer

```javascript
import { GameRenderer } from './src/game-renderer.js'

const renderer = new GameRenderer(canvas)
renderer.addEntity(player)
renderer.render()
```

## Controls Reference

### Keyboard Controls

| Key | Action | Alternative |
|-----|--------|-------------|
| **z** | Move Up | ↑ Arrow |
| **q** | Move Left | ← Arrow |
| **s** | Move Down | ↓ Arrow |
| **d** | Move Right | → Arrow |
| **Space** | Attack | J |
| **Shift** | Block (Hold) | K |
| **Ctrl** | Roll/Dodge | L |

### Gamepad Support (Future)

- Left Stick: Movement
- A/X Button: Attack
- B/Circle: Roll
- Right Trigger: Block

## Testing and Debugging

### Debug Mode

```javascript
// Enable debug rendering
player.debugMode = true

// Log animation state
console.log(player.getAnimationInfo())

// Monitor performance
console.log(`Update time: ${updateTime}ms`)
console.log(`Render time: ${renderTime}ms`)
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Animation stuttering | Inconsistent delta time | Use frame limiting |
| Input lag | Processing order | Update input first |
| State stuck | Missing transition | Check state machine |
| Visual glitches | Sprite alignment | Verify frame coordinates |

## File Structure

```

```

## Future Enhancements

### Planned Features

1. **Advanced Combat**
   - Combo system
   - Special attacks
   - Weapon animations
   - Ranged attacks

2. **Movement Extensions**
   - Jump animations
   - Wall sliding
   - Climbing
   - Swimming

3. **Multiplayer Support**
   - Animation synchronization
   - Lag compensation
   - State prediction
   - Rollback netcode

4. **Customization**
   - Character skins
   - Animation modding
   - Speed adjustments
   - Effect variations

## Contributing

To add new animations:

1. Define animation frames in `AnimationPresets`
2. Add state to `AnimatedPlayer` class
3. Implement state transition logic
4. Add input handling
5. Create visual effects
6. Update documentation

## Support

For questions or issues:
- Check the [Player Animations Documentation](./PLAYER_ANIMATIONS.md)
