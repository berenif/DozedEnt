# 🎬 Animation System Architecture

**Last Updated**: October 1, 2025  
**Status**: ✅ **COMPLETE REFERENCE**

## Overview

DozedEnt uses a **layered animation architecture** where multiple systems work together to create rich, responsive character animations. This document explains the actual implementation and how components interact.

---

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     WASM Game Logic                          │
│  (C++) - Physics, Combat, State Management                  │
│  Exports: get_x(), get_y(), get_player_anim_state(), etc.  │
└────────────────────┬────────────────────────────────────────┘
                     │ WASM Exports
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              JavaScript Animation Bridge                      │
│  public/src/demo/wasm-api.js - State translation            │
│  PLAYER_ANIM_CODES: Maps numeric states to string names     │
└────────────────────┬────────────────────────────────────────┘
                     │ Player State
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Player Animation Wrapper                        │
│  AnimatedPlayer (player-animator.js)                         │
│  - Manages sprite + skeleton rendering together              │
│  - Contains BOTH CharacterAnimator AND ProceduralAnimator   │
└─────┬───────────────────────────────────┬───────────────────┘
      │                                   │
      │ Sprite Frames                     │ Skeleton Poses
      ↓                                   ↓
┌─────────────────────┐     ┌────────────────────────────────┐
│  CharacterAnimator  │     │  PlayerProceduralAnimator     │
│  (animation-system) │     │  (procedural-animator.js)     │
│  - Frame-based      │     │  - 9 Animation Modules         │
│  - State machine    │     │  - IK, Spine, Locomotion       │
│  - Transitions      │     │  - Physics-based motion        │
└─────────────────────┘     └───────────────┬────────────────┘
                                            │
                         ┌──────────────────┼──────────────────┐
                         │                  │                  │
                    ┌────▼────┐      ┌──────▼─────┐    ┌─────▼──────┐
                    │ FootIK  │      │   Spine    │    │  ArmIK     │
                    │ Module  │      │   Module   │    │  Module    │
                    └─────────┘      └────────────┘    └────────────┘
                         ... 9 specialized modules total ...
                                            │
                                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Rendering Layer                           │
│  PlayerRenderer (→ TopDownPlayerRenderer)                   │
│  - Draws skeleton                                            │
│  - Adds indicators (attack, block, status)                  │
│  - Shadow, effects, trails                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **AnimatedPlayer** ⭐ Main Entry Point

**Location**: `public/src/animation/player/procedural/player-animator.js`

**Purpose**: High-level player character wrapper that combines sprite animations and skeletal animations.

**What it contains:**
```javascript
class AnimatedPlayer {
    constructor(x, y, options) {
        // Sprite animation system
        this.animator = new CharacterAnimator()
        this.animations = AnimationPresets.createPlayerAnimations()
        
        // Skeletal animation system
        this.proceduralAnimator = new PlayerProceduralAnimator()
    }
}
```

**Key Methods:**
- `update(deltaTime, input)` - Updates both sprite and skeleton animations
- `render(ctx, camera)` - Renders the character
- `takeDamage(damage, knockbackX, knockbackY)` - Handles damage reactions
- `setState(newState)` - Changes animation state

**Usage:**
```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'

const player = new AnimatedPlayer(x, y, {
    health: 100,
    stamina: 100,
    speed: 250
})

// Game loop
player.update(deltaTime, input)
player.render(ctx, camera)
```

---

### 2. **CharacterAnimator** - Sprite Frame System

**Location**: `public/src/animation/system/animation-system.js`

**Purpose**: Manages sprite sheet frame animations with state machine.

**Features:**
- Frame-based sprite animation
- State transitions with blending
- Timing and duration control
- Animation queuing and priorities

**States Managed:**
- `idle`, `running`, `attacking`, `blocking`, `rolling`, `hurt`, `dead`
- `jumping`, `doubleJumping`, `landing`, `wallSliding`, `dashing`, `chargingAttack`

**NOT the main controller** - it's one layer in the stack.

---

### 3. **PlayerProceduralAnimator** - Skeletal System

**Location**: `public/src/animation/player/procedural/player-procedural-animator.js`

**Purpose**: Orchestrates 9 specialized animation modules for biomechanically accurate motion.

**Architecture:**
```javascript
class PlayerProceduralAnimator {
    constructor(options) {
        this.rig = new PlayerProceduralRig() // 29-joint skeleton
        this.modules = {
            core: CorePostureModule,        // COM, breathing
            locomotion: LocomotionModule,   // Stride, footsteps
            footIK: FootIKModule,           // Leg IK solver
            spine: SpineModule,             // Multi-segment spine
            combat: CombatModule,           // Hand targets
            armIK: ArmIKModule,             // Arm IK solver
            headGaze: HeadGazeModule,       // Head stabilization
            secondary: SecondaryMotionModule, // Cloth, hair
            environment: EnvironmentModule   // Wind, ground
        }
    }
}
```

**Module Pipeline** (order matters):
1. **Core Posture** → Establishes center of mass and breathing
2. **Locomotion** → Calculates stride phase and foot targets
3. **Foot IK** → Solves leg positions (hip → knee → ankle → foot)
4. **Spine** → Multi-segment bending and counter-rotation
5. **Combat** → Determines hand targets for attacks/blocks
6. **Arm IK** → Solves arm positions (shoulder → elbow → wrist)
7. **Head Gaze** → Head stabilization and look-at
8. **Secondary Motion** → Cloth, hair, equipment physics
9. **Environment** → Wind, temperature, ground adaptation

**Output:** Skeleton joint positions + transform data

---

### 4. **PlayerRenderer** - Rendering System

**Location**: `public/src/renderer/PlayerRenderer.js` (alias for TopDownPlayerRenderer)

**Purpose**: Renders the animated skeleton with indicators and effects.

**Real Implementation:**
```javascript
// PlayerRenderer.js just imports TopDownPlayerRenderer
import TopDownPlayerRenderer from './player/TopDownPlayerRenderer.js'
export class PlayerRenderer extends TopDownPlayerRenderer {}
```

**TopDownPlayerRenderer Features:**
- Skeleton drawing (layers: legs → body → arms → head)
- Combat indicators (attack arcs, block shields)
- Status bars (health, stamina)
- Shadows and visual effects
- Rotation and scaling for top-down view

**Rendering Utilities** (`public/src/renderer/player/topdown/`):
- `skeleton.js` - Draw skeleton with proper layering
- `indicators.js` - Attack/block/roll visual feedback
- `shadow.js` - Soft gradient shadows
- `transform.js` - Rotation and positioning
- `scale.js` - Skeleton scaling utilities
- `utils.js` - Smooth interpolation helpers
- `debug-overlay.js` - Debug visualization

---

### 5. **EnhancedAnimationController** - Advanced State Management

**Location**: `public/src/animation/controller/enhanced-animation-controller.js`

**Purpose**: Optional advanced animation controller with IK, blending, and effects coordination.

**Features:**
- State machine with sub-states
- Animation blending layers (base, upper_body, additive)
- IK system integration (FABRIK solver)
- Effect coordination (particles, sound, camera)
- Event system for animation callbacks
- Performance tracking

**When to use:**
- Complex animation requirements
- Need advanced IK targeting
- Particle effect synchronization
- Camera shake/zoom effects
- Multi-layer animation blending

**Example:**
```javascript
import { EnhancedAnimationController } from './animation/controller/animation-controller.js'

const controller = new EnhancedAnimationController(visualEffects, audioManager)

// Listen to animation events
controller.addEventListener('hitFrame', (data) => {
    applyDamage(data.type)
})

// Update
controller.update(deltaTime, gameState)
```

---

### 6. **Physics Animation System** (Alternative)

**Location**: `public/src/animation/player/physics/index.js`

**Purpose**: Lightweight physics-based animation for top-down views.

**When to use:**
- Performance-critical scenarios
- Mobile optimization
- Simple top-down gameplay
- Many characters on screen

**Performance:**
- ~0.2ms update time (vs ~0.5-1ms for procedural)
- ~5KB memory (vs ~15KB for procedural)
- Fixed timestep physics (60-120 FPS effective)

**Usage:**
```javascript
import { PlayerPhysicsAnimator } from './animation/player/physics/index.js'

const animator = new PlayerPhysicsAnimator({
    fixedDt: 1/60,
    substeps: 2
})

const transform = animator.update(deltaTime, context)
```

**See:** [TOPDOWN_PHYSICS_ANIMATION.md](./TOPDOWN_PHYSICS_ANIMATION.md) for details.

---

## Supporting Systems

### Animation Events

**Location**: `public/src/animation/system/animation-events.js`

**Purpose**: Event system for animation callbacks and synchronization.

**Features:**
- Event listeners (`on`, `once`, `off`)
- Frame-specific events
- State transition events
- Global event bus

**Example:**
```javascript
import { AnimationEventSystem, AnimationEventPresets } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()

// Listen to attack events
events.on('attack.active', () => {
    console.log('Attack is active!')
})

// Attach to animation
const eventedAnim = AnimationEventPresets.attachToAnimation(
    animation,
    events,
    'combat'
)
```

**Event Types:**
- **Combat**: `attack.windup`, `attack.active`, `attack.hit`, `parry.success`, `block.impact`
- **Movement**: `footstep`, `jump.land`, `dash.start`, `wall.jump`
- **Effects**: `particle.spawn`, `sound.play`, `screen.shake`

---

### Combo System

**Location**: `public/src/animation/system/combo-system.js`

**Purpose**: Fighting-game-style combo system with input buffering.

**Features:**
- Combo chain detection
- Input buffering (200ms window)
- Special move recognition (hadouken, shoryuken patterns)
- Damage multipliers
- Cancel windows
- Perfect timing requirements

**Example:**
```javascript
import { ComboSystem } from './animation/system/combo-system.js'

const combos = new ComboSystem({
    comboWindow: 0.5,
    onComboHit: (data) => {
        console.log(`${data.hits} hit combo! x${data.multiplier}`)
    }
})

// Register custom combo
combos.registerCombo('tripleSlash', ['light', 'light', 'heavy'], {
    damage: 50,
    animation: 'combo_triple_finisher'
})

// Update in game loop
combos.processInput(input, deltaTime)
```

**Built-in Combos:**
- Basic: `light → light → heavy`
- Launcher: `heavy → heavy → up`
- Rushdown: `light → light → light → light`
- Spin Slash: `heavy → roll → heavy`
- Counter Strike: `block → light → heavy`

---

### Wolf Animation System

**Location**: `public/src/animation/enemy/wolf-animation.js`

**Purpose**: Complete animation system for wolf enemies.

**Features:**
- Procedural wolf locomotion (6 gait types)
- Pack coordination
- WASM integration for wolf state
- Behavioral animations (prowling, hunting, attacking)

**WASM Functions Used:**
```javascript
// Animation data from WASM
wasmModule.get_wolf_anim_active(wolfIndex)
wasmModule.get_wolf_anim_leg_x(wolfIndex, legIndex)
wasmModule.get_wolf_anim_leg_y(wolfIndex, legIndex)
wasmModule.get_wolf_anim_spine_bend(wolfIndex)
wasmModule.get_wolf_anim_head_pitch(wolfIndex)
wasmModule.get_wolf_anim_tail_angle(wolfIndex)
```

**See:** [PROCEDURAL_WOLF_ANIMATION_README.md](./PROCEDURAL_WOLF_ANIMATION_README.md)

---

### Ability Animations

**Location**: `public/src/animation/abilities/`

**Files:**
- `ability-animation-base.js` - Base class for ability animations
- `warden-bash-animation.js` - Warden bash ability animation

**Purpose:** Character-specific ability animation system.

**Example:**
```javascript
import { WardenBashAnimation } from './animation/abilities/warden-bash-animation.js'

const bashAnim = new WardenBashAnimation()
bashAnim.start(player, target)
bashAnim.update(deltaTime)
```

---

### Environmental Animations

**Location**: `public/src/animation/environmental/`

**Files:**
- `environmental-animations.js` - Weather, wind, ambient effects
- `particle-integration.js` - Particle system integration

**Purpose:** Animate environmental elements and coordinate with particle effects.

---

## WASM Integration

### Player Animation State Bridge

**Location**: `public/src/demo/wasm-api.js`

**WASM Exports for Player Animation:**
```javascript
// Required exports
get_player_anim_state()     // Returns numeric state code
get_player_state_timer()    // Animation time
get_x(), get_y()            // Position
get_vel_x(), get_vel_y()    // Velocity
get_is_grounded()           // Ground state
get_is_rolling()            // Roll state
get_block_state()           // Block state
get_stamina()               // Stamina ratio
get_hp()                    // Health ratio
```

**State Code Mapping:**
```javascript
export const PLAYER_ANIM_CODES = {
    idle: 0,
    running: 1,
    attacking: 2,
    blocking: 3,
    rolling: 4,
    hurt: 5,
    dead: 6,
    jumping: 7,
    doubleJumping: 8,
    landing: 9,
    wallSliding: 10,
    dashing: 11,
    chargingAttack: 12
}
```

**Usage in Renderer:**
```javascript
// Get state from WASM
const animCode = wasmModule.get_player_anim_state()
const stateName = PLAYER_ANIM_NAMES[animCode] || 'idle'

// Convert to player state object
const playerState = {
    x: wasmModule.get_x(),
    y: wasmModule.get_y(),
    vx: wasmModule.get_vel_x(),
    vy: wasmModule.get_vel_y(),
    anim: stateName,
    hp: wasmModule.get_hp(),
    stamina: wasmModule.get_stamina(),
    grounded: wasmModule.get_is_grounded()
}

// Render
playerRenderer.render(playerState, toCanvas, baseRadius)
```

---

## File Organization

### Actual File Paths

**Player Animation:**
```
public/src/animation/player/
├── physics/
│   └── index.js                      # PlayerPhysicsAnimator (lightweight)
└── procedural/
    ├── player-animator.js            # AnimatedPlayer (main wrapper) ⭐
    ├── player-procedural-animator.js # ProceduralAnimator (skeleton)
    ├── player-procedural-rig.js      # 29-joint skeleton definition
    └── modules/
        ├── arm-ik-module.js
        ├── combat-module.js
        ├── core-posture-module.js
        ├── environment-module.js
        ├── foot-ik-module.js
        ├── head-gaze-module.js
        ├── locomotion-module.js
        ├── secondary-motion-module.js
        └── spine-module.js
```

**Animation Controllers:**
```
public/src/animation/controller/
├── animation-controller.js           # Re-exports EnhancedAnimationController
└── enhanced-animation-controller.js  # Advanced state machine + IK
```

**Core Animation System:**
```
public/src/animation/system/
├── animation-system.js               # CharacterAnimator, AnimationPresets
├── animation-events.js               # Event system
├── animation-sync.js                 # Multiplayer sync
├── animation-performance.js          # Performance monitoring
└── combo-system.js                   # Combo detection
```

**Renderers:**
```
public/src/renderer/
├── PlayerRenderer.js                 # Alias for TopDownPlayerRenderer
├── WolfRenderer.js                   # Wolf rendering
└── player/
    ├── TopDownPlayerRenderer.js      # Main player renderer
    └── topdown/
        ├── debug-overlay.js
        ├── indicators.js             # Visual indicators
        ├── scale.js
        ├── shadow.js
        ├── skeleton.js               # Skeleton drawing
        ├── transform.js
        └── utils.js
```

**Enemy Animations:**
```
public/src/animation/enemy/
└── wolf-animation.js                 # WolfAnimationSystem
```

**Abilities:**
```
public/src/animation/abilities/
├── ability-animation-base.js
└── warden-bash-animation.js
```

**Environmental:**
```
public/src/animation/environmental/
├── environmental-animations.js
└── particle-integration.js
```

---

## Common Usage Patterns

### Pattern 1: Basic Player Animation

```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'

// Create player
const player = new AnimatedPlayer(400, 300)

// Game loop
function gameLoop(deltaTime) {
    const input = {
        left: keys['a'],
        right: keys['d'],
        up: keys['w'],
        down: keys['s'],
        attack: keys['j'],
        block: keys['k'],
        roll: keys['l']
    }
    
    player.update(deltaTime, input)
    player.render(ctx, camera)
}
```

### Pattern 2: WASM-Driven Animation

```javascript
import PlayerRenderer from './renderer/PlayerRenderer.js'

const renderer = new PlayerRenderer(ctx, canvas)

function gameLoop(deltaTime) {
    // WASM updates game logic
    wasmModule.update(deltaTime)
    
    // Read state from WASM
    const playerState = {
        x: wasmModule.get_x(),
        y: wasmModule.get_y(),
        vx: wasmModule.get_vel_x(),
        vy: wasmModule.get_vel_y(),
        anim: getAnimStateName(),
        hp: wasmModule.get_hp(),
        stamina: wasmModule.get_stamina(),
        grounded: wasmModule.get_is_grounded()
    }
    
    // Render
    renderer.render(playerState, toCanvas, 20)
}
```

### Pattern 3: Advanced Animation with Events

```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
import { AnimationEventSystem } from './animation/system/animation-events.js'

const player = new AnimatedPlayer(400, 300)
const events = new AnimationEventSystem()

// Listen to animation events
events.on('attack.active', () => {
    checkHitDetection()
})

events.on('footstep', (data) => {
    playFootstepSound(data.foot)
})

// Update
player.update(deltaTime, input)
```

### Pattern 4: Combo System Integration

```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
import { ComboSystem } from './animation/system/combo-system.js'

const player = new AnimatedPlayer(400, 300)
const combos = new ComboSystem({
    onComboHit: (data) => {
        showComboText(data.hits, data.multiplier)
        applyDamage(data.damage)
    }
})

function gameLoop(deltaTime) {
    combos.processInput(input, deltaTime)
    player.update(deltaTime, input)
}
```

---

## Performance Characteristics

### Animation System Comparison

| System | Update Time | Memory | Complexity | Use Case |
|--------|-------------|---------|-----------|----------|
| **CharacterAnimator** | ~0.1ms | <1KB | Low | Sprite frames only |
| **PlayerProceduralAnimator** | ~0.5-1ms | ~15KB | High | Detailed skeleton |
| **PlayerPhysicsAnimator** | ~0.2ms | ~5KB | Medium | Top-down optimized |
| **AnimatedPlayer** (full) | ~1-1.5ms | ~20KB | High | Complete character |

### Recommendations

**Use AnimatedPlayer (full system) when:**
- ✅ Need rich, detailed player animation
- ✅ Side-view or isometric perspective
- ✅ Single player or few characters
- ✅ Performance is not critical

**Use PlayerPhysicsAnimator when:**
- ✅ Top-down gameplay
- ✅ Performance critical (mobile, many entities)
- ✅ Simpler animation requirements

**Use CharacterAnimator alone when:**
- ✅ Sprite-only animation (no skeleton)
- ✅ Minimal computational overhead needed
- ✅ Legacy system compatibility

---

## Troubleshooting

### Common Issues

**Q: AnimatedPlayer is undefined**
```javascript
// ❌ Wrong import path (from old docs)
import AnimatedPlayer from './src/animation/player-animator.js'

// ✅ Correct import path
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
```

**Q: Skeleton not visible**
```javascript
// Make sure renderer is using PlayerRenderer, not just CharacterAnimator
import PlayerRenderer from './renderer/PlayerRenderer.js'

const renderer = new PlayerRenderer(ctx, canvas)
renderer.render(playerState, toCanvas, baseRadius)
```

**Q: Animation state not updating**
```javascript
// Check WASM state mapping
const animCode = wasmModule.get_player_anim_state()
const stateName = PLAYER_ANIM_NAMES[animCode] || 'idle'

console.log('Animation state:', animCode, '→', stateName)
```

**Q: Which animation controller to use?**
```javascript
// AnimatedPlayer already includes CharacterAnimator
// Don't create separate controller unless using advanced features

// ❌ Don't do this
const player = new AnimatedPlayer(x, y)
const controller = new CharacterAnimator() // Already inside AnimatedPlayer!

// ✅ Do this
const player = new AnimatedPlayer(x, y)
// CharacterAnimator is player.animator
```

---

## Related Documentation

- **[ANIMATION_SYSTEM_INDEX.md](./ANIMATION_SYSTEM_INDEX.md)** - System overview
- **[TOPDOWN_PHYSICS_ANIMATION.md](./TOPDOWN_PHYSICS_ANIMATION.md)** - Physics animation details
- **[HUMAN_MOTION_IMPROVEMENTS.md](./HUMAN_MOTION_IMPROVEMENTS.md)** - Procedural system design
- **[PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)** - Player animation states
- **[PROCEDURAL_WOLF_ANIMATION_README.md](./PROCEDURAL_WOLF_ANIMATION_README.md)** - Wolf animation
- **[ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md)** - Event system guide (NEW)
- **[COMBO_SYSTEM.md](./COMBO_SYSTEM.md)** - Combo system guide (NEW)

---

## Summary

The DozedEnt animation system is a **layered architecture** where:

1. **WASM** provides game logic and state
2. **AnimatedPlayer** wraps everything together
3. **CharacterAnimator** handles sprite frames
4. **PlayerProceduralAnimator** handles skeleton animation
5. **PlayerRenderer** draws the result

It's NOT "choose one system" - they work **together** to create rich animations.

---

**Last Updated**: October 1, 2025  
**Maintainer**: DozedEnt Team  
**Status**: ✅ Complete Reference

