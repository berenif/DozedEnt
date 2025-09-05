# Player Animation System Documentation

## Overview

The player animation system provides a complete set of character animations including idle, movement, combat, and defensive actions. The system is built on top of the modular animation framework and includes smooth transitions, procedural effects, and state management.

## Table of Contents

1. [Animation States](#animation-states)
2. [Animation Implementation](#animation-implementation)
3. [Controls and Input](#controls-and-input)
4. [State Transitions](#state-transitions)
5. [Visual Effects](#visual-effects)
6. [API Reference](#api-reference)
7. [Usage Examples](#usage-examples)
8. [Performance Considerations](#performance-considerations)

## Animation States

### 1. Idle Animation
- **State**: `idle`
- **Description**: Default resting animation when the player is not performing any action
- **Duration**: Looped continuously
- **Frames**: 4 frames at 200ms each
- **Triggers**: Automatically set when no input is detected
- **Visual**: Subtle breathing animation with procedural enhancement

### 2. Running Animation
- **State**: `running`
- **Description**: Movement animation when the player is moving
- **Duration**: Looped while moving
- **Frames**: 6 frames at 100ms each
- **Triggers**: Any directional input (WASD or arrow keys)
- **Visual**: Running cycle with speed-based frame rate adjustment

### 3. Attack Animation
- **State**: `attacking`
- **Description**: Melee attack animation
- **Duration**: 0.4 seconds (non-looping)
- **Frames**: 4 frames (anticipation, swing, impact, recovery)
- **Triggers**: Space bar or J key
- **Cooldown**: 0.6 seconds
- **Stamina Cost**: 15 points
- **Features**:
  - Anticipation frame for telegraphing
  - Attack hitbox spawns at frame 3
  - Damage dealt: 20 points
  - Attack range: 60 pixels

### 4. Block Animation
- **State**: `blocking`
- **Description**: Defensive stance that reduces incoming damage
- **Duration**: Held as long as input is pressed
- **Frames**: 1 frame (static defensive pose)
- **Triggers**: Hold Shift or K key
- **Damage Reduction**: 50% of incoming damage
- **Movement Speed**: Reduced to 30% while blocking
- **Visual Effects**: Shield particle effect, blue tint

### 5. Roll Animation
- **State**: `rolling`
- **Description**: Evasive dodge roll with invulnerability frames
- **Duration**: 0.4 seconds
- **Frames**: 4 frames at 50ms each
- **Triggers**: Ctrl or L key
- **Cooldown**: 0.8 seconds
- **Stamina Cost**: 25 points
- **Features**:
  - Complete invulnerability during roll
  - Increased movement speed (2x normal)
  - Direction based on current movement or facing
  - Dust cloud particle effect

### 6. Hurt Animation
- **State**: `hurt`
- **Description**: Damage reaction animation
- **Duration**: 0.3 seconds
- **Frames**: 2 frames at 100ms each
- **Triggers**: When taking damage (not blocking)
- **Features**:
  - Knockback effect based on damage source
  - Red flash visual feedback
  - Temporary movement impediment
  - Blood particle effect

### 7. Death Animation
- **State**: `dead`
- **Description**: Player death state
- **Duration**: Permanent until respawn
- **Triggers**: Health reaches 0
- **Features**:
  - Animation stops on last frame
  - Death particle effect
  - No input accepted
  - Requires respawn to recover

## Animation Implementation

### Core Classes

#### AnimatedPlayer Class
```javascript
import AnimatedPlayer from './src/animation/player-animator.js'

const player = new AnimatedPlayer(x, y, {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    speed: 250,
    rollSpeed: 500,
    attackDamage: 20,
    attackRange: 60,
    particleSystem: particleSystem,
    soundSystem: soundSystem
})
```

#### Animation Controller Integration
The player uses the `CharacterAnimator` class which manages:
- Animation state transitions
- Frame blending between animations
- Procedural animation overlays
- Animation speed adjustments

### Animation Data Structure

```javascript
const playerAnimations = {
    idle: new Animation('idle', [
        new AnimationFrame(0, 0, 32, 32, 200),
        new AnimationFrame(32, 0, 32, 32, 200),
        new AnimationFrame(64, 0, 32, 32, 200),
        new AnimationFrame(96, 0, 32, 32, 200)
    ]),
    run: new Animation('run', [
        new AnimationFrame(0, 32, 32, 32, 100),
        new AnimationFrame(32, 32, 32, 32, 100),
        new AnimationFrame(64, 32, 32, 32, 100),
        new AnimationFrame(96, 32, 32, 32, 100),
        new AnimationFrame(128, 32, 32, 32, 100),
        new AnimationFrame(160, 32, 32, 32, 100)
    ]),
    attack: new Animation('attack', [
        new AnimationFrame(0, 64, 32, 32, 50),
        new AnimationFrame(32, 64, 32, 32, 50),
        new AnimationFrame(64, 64, 32, 32, 100),
        new AnimationFrame(96, 64, 32, 32, 50)
    ], { loop: false }),
    block: new Animation('block', [
        new AnimationFrame(0, 96, 32, 32, 100)
    ], { loop: false }),
    roll: new Animation('roll', [
        new AnimationFrame(0, 128, 32, 32, 50),
        new AnimationFrame(32, 128, 32, 32, 50),
        new AnimationFrame(64, 128, 32, 32, 50),
        new AnimationFrame(96, 128, 32, 32, 50)
    ], { loop: false }),
    hurt: new Animation('hurt', [
        new AnimationFrame(0, 160, 32, 32, 100),
        new AnimationFrame(32, 160, 32, 32, 100)
    ], { loop: false })
}
```

## Controls and Input

### Default Control Scheme

| Action | Primary Key | Alternative Key |
|--------|------------|-----------------|
| Move Up | W | Arrow Up |
| Move Down | S | Arrow Down |
| Move Left | A | Arrow Left |
| Move Right | D | Arrow Right |
| Attack | Space | J |
| Block (Hold) | Shift | K |
| Roll/Dodge | Ctrl | L |

### Input Processing

```javascript
// Convert keyboard input to player input format
const input = AnimatedPlayer.createInputFromKeys(keys)

// Input structure
const playerInput = {
    left: boolean,
    right: boolean,
    up: boolean,
    down: boolean,
    attack: boolean,
    block: boolean,
    roll: boolean
}

// Update player with input
player.update(deltaTime, input)
```

## State Transitions

### State Machine Rules

```
IDLE -> RUNNING: Movement input detected
IDLE -> ATTACKING: Attack input (if cooldown expired)
IDLE -> BLOCKING: Block input held
IDLE -> ROLLING: Roll input (if cooldown expired)

RUNNING -> IDLE: No movement input
RUNNING -> ATTACKING: Attack input
RUNNING -> BLOCKING: Block input held
RUNNING -> ROLLING: Roll input

ATTACKING -> IDLE: Animation complete
BLOCKING -> IDLE: Block input released
ROLLING -> IDLE: Animation complete
HURT -> IDLE: Animation complete

ANY STATE -> HURT: Damage taken (except during roll)
ANY STATE -> DEAD: Health reaches 0
```

### Priority System

1. **Death** - Highest priority, overrides all states
2. **Hurt** - Interrupts most actions except roll
3. **Roll** - High priority, provides invulnerability
4. **Attack** - Cannot be interrupted once started
5. **Block** - Can be cancelled at any time
6. **Movement** - Lowest priority

## Visual Effects

### Particle Effects

Each animation state triggers specific particle effects:

- **Attack**: Slash effect in attack direction
- **Block**: Shield shimmer effect
- **Roll**: Dust cloud trail
- **Hurt**: Blood splatter effect
- **Death**: Explosion of particles

### Color Indicators

- **Normal**: Player's default color (#00ff88)
- **Blocking**: Blue tint (#4444ff)
- **Rolling**: Yellow tint (#ffff44)
- **Hurt**: Red flash (#ff4444)
- **Invulnerable**: Flashing transparency

### UI Feedback

- Health bar above player (color-coded)
- Stamina bar below health
- State indicator text
- Cooldown timers
- Damage numbers

## API Reference

### AnimatedPlayer Methods

#### Constructor
```javascript
new AnimatedPlayer(x, y, options)
```

#### Core Methods
```javascript
// Update player state and animations
player.update(deltaTime, input)

// Render player to canvas
player.render(ctx, camera)

// Deal damage to player
player.takeDamage(damage, knockbackX, knockbackY)

// Respawn player at position
player.respawn(x, y)

// Get current animation info
player.getAnimationInfo()
```

#### State Checks
```javascript
player.canAttack()  // Check if attack is available
player.canRoll()    // Check if roll is available
player.canBlock()   // Check if block is available
```

#### Properties
```javascript
player.x, player.y          // Position
player.vx, player.vy        // Velocity
player.health               // Current health
player.stamina              // Current stamina
player.state                // Current animation state
player.facing               // Direction (-1 or 1)
player.invulnerable         // Invulnerability status
```

## Usage Examples

### Basic Implementation

```html
<!DOCTYPE html>
<html>
<head>
    <title>Player Animation Example</title>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    
    <script type="module">
        import AnimatedPlayer from './src/animation/player-animator.js'
        
        const canvas = document.getElementById('gameCanvas')
        const ctx = canvas.getContext('2d')
        
        // Create player
        const player = new AnimatedPlayer(400, 300)
        
        // Input handling
        const keys = {}
        document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
        document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)
        
        // Game loop
        let lastTime = 0
        function gameLoop(timestamp) {
            const deltaTime = (timestamp - lastTime) / 1000
            lastTime = timestamp
            
            // Update
            const input = AnimatedPlayer.createInputFromKeys(keys)
            player.update(deltaTime, input)
            
            // Render
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            player.render(ctx)
            
            requestAnimationFrame(gameLoop)
        }
        
        requestAnimationFrame(gameLoop)
    </script>
</body>
</html>
```

### Advanced Integration

```javascript
// With particle and sound systems
import { ParticleSystem } from './particle-system.js'
import { SoundSystem } from './sound-system.js'

const particleSystem = new ParticleSystem()
const soundSystem = new SoundSystem()

const player = new AnimatedPlayer(400, 300, {
    particleSystem: particleSystem,
    soundSystem: soundSystem,
    health: 150,
    attackDamage: 25
})

// Combat interaction
function checkCombat() {
    if (player.state === 'attacking' && player.attackExecuted) {
        const hitbox = player.executeAttack()
        // Check collision with enemies
        enemies.forEach(enemy => {
            if (checkCollision(hitbox, enemy)) {
                enemy.takeDamage(hitbox.damage)
            }
        })
    }
}

// Damage handling
function onEnemyAttack(enemy) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
    const knockbackX = Math.cos(angle)
    const knockbackY = Math.sin(angle)
    
    player.takeDamage(enemy.damage, knockbackX, knockbackY)
}
```

## Performance Considerations

### Optimization Tips

1. **Sprite Batching**: Use sprite sheets for all animations
2. **Frame Caching**: Pre-calculate animation frames
3. **State Pooling**: Reuse state objects to reduce GC
4. **Conditional Rendering**: Only update visible animations
5. **Delta Time**: Use proper delta time for frame-independent animation

### Memory Management

```javascript
// Efficient animation loading
const spriteSheet = new Image()
spriteSheet.src = 'player-animations.png'

spriteSheet.onload = () => {
    player.sprite = spriteSheet
}

// Clean up when not needed
player.animator.controller.stop()
```

### Performance Metrics

- Animation Update: ~0.1ms per frame
- State Transitions: ~0.05ms
- Particle Effects: ~0.2ms per effect
- Total overhead: < 1ms per frame

## Demo and Testing

A complete demo showcasing all player animations is available at:
`/demo/player-animations-demo.html`

### Features in Demo:
- Full movement and combat controls
- Enemy AI for combat testing
- Health and stamina management
- Visual feedback for all states
- Debug information display
- Test buttons for various scenarios

### Testing Animations:
1. **Movement**: Use WASD or arrow keys
2. **Combat**: Space to attack, approach enemies
3. **Defense**: Hold Shift to block incoming attacks
4. **Evasion**: Press Ctrl to roll through attacks
5. **Damage**: Press H to simulate taking damage

## Troubleshooting

### Common Issues

1. **Animation not playing**: Check state transitions and cooldowns
2. **Stuttering**: Ensure proper delta time calculation
3. **Input lag**: Verify input handling is in update loop
4. **Visual glitches**: Check sprite sheet alignment

### Debug Mode

```javascript
// Enable debug rendering
player.debugMode = true

// Log animation info
console.log(player.getAnimationInfo())
```

## Future Enhancements

- Combo attack system
- Air attacks and jumps
- Weapon-specific animations
- Customizable animation speeds
- Network synchronization support
- Animation event callbacks
- Advanced particle integration

## Conclusion

The player animation system provides a robust foundation for character control and visual feedback. With smooth transitions, responsive controls, and extensive customization options, it can be adapted to various game genres and styles.