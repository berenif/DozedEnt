# 🎯 Animation Event System

**Location**: `public/src/animation/system/animation-events.js`  
**Last Updated**: October 1, 2025  
**Status**: ✅ **PRODUCTION READY**

## Overview

The Animation Event System provides a powerful event-driven architecture for synchronizing game logic, visual effects, audio, and UI with animation keyframes. It enables loose coupling between animation and game systems through a publish-subscribe pattern.

---

## Core Components

### 1. AnimationEventSystem

Central event bus for animation callbacks.

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()
```

**Key Methods:**
- `on(eventName, callback, context)` - Register event listener
- `once(eventName, callback, context)` - One-time event listener
- `off(eventName, callback)` - Remove event listener
- `emit(eventName, data)` - Trigger event
- `addGlobalListener(callback)` - Listen to ALL events
- `clear()` - Remove all listeners

---

## Basic Usage

### Listening to Events

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()

// Register event listener
events.on('attack.active', (data) => {
    console.log('Attack is now active!')
    checkHitDetection()
})

// One-time listener
events.once('death.complete', (data) => {
    triggerGameOver()
})

// Remove listener
const unsubscribe = events.on('footstep', handleFootstep)
unsubscribe() // Remove listener
```

### Emitting Events

```javascript
// Emit simple event
events.emit('jump.start')

// Emit event with data
events.emit('attack.hit', {
    target: enemy,
    damage: 50,
    critical: true
})
```

---

## Frame-Specific Events

Trigger events at specific animation frames.

### Register Frame Events

```javascript
// Register event at frame 3 of attack animation
events.registerFrameEvent('attack', 3, {
    type: 'attack.active',
    damage: 50,
    range: 100
})

// Trigger frame events
events.triggerFrameEvents('attack', 3)
```

### Example: Attack Animation

```javascript
// Setup attack animation events
events.registerFrameEvent('attack', 0, {
    type: 'attack.windup',
    data: { anticipation: true }
})

events.registerFrameEvent('attack', 2, {
    type: 'attack.active',
    data: { hitbox: true }
})

events.registerFrameEvent('attack', 4, {
    type: 'attack.recovery',
    data: { vulnerable: true }
})
```

---

## State Transition Events

React to animation state changes.

### Register State Events

```javascript
// Trigger event when transitioning from idle to attacking
events.registerStateEvent('idle', 'attacking', {
    type: 'combat.start',
    priority: 'high'
})

// Trigger state transition
events.triggerStateEvents('idle', 'attacking')
// → Emits 'combat.start' + generic 'stateChange' event
```

---

## EventedAnimation

Wrapper class for animations with event support.

```javascript
import { EventedAnimation } from './animation/system/animation-events.js'

const eventedAnim = new EventedAnimation(animation, eventSystem)

// Add event at specific frame
eventedAnim.addFrameEvent(3, 'attack.active', { damage: 50 })

// Add event at normalized time (0-1)
eventedAnim.addTimeEvent(0.5, 'attack.peak')

// Update in game loop
eventedAnim.update(deltaTime)
```

---

## Event Presets

Pre-configured event sets for common scenarios.

### Combat Events

```javascript
import { AnimationEventPresets } from './animation/system/animation-events.js'

const combatEvents = AnimationEventPresets.createCombatEvents(eventSystem)

// Available combat events:
combatEvents.attackWindup()      // Attack starting
combatEvents.attackActive()      // Attack can deal damage
combatEvents.attackRecovery()    // Attack recovery phase
combatEvents.attackHit(target)   // Attack connected
combatEvents.attackMiss()        // Attack missed

combatEvents.comboWindow()       // Combo input window open
combatEvents.comboSuccess(count) // Combo achieved
combatEvents.comboBreak()        // Combo broken

combatEvents.blockStart()        // Block started
combatEvents.blockImpact(damage) // Block received hit
combatEvents.blockRelease()      // Block released

combatEvents.parryWindow()       // Parry timing window
combatEvents.parrySuccess()      // Successful parry
combatEvents.parryFail()         // Failed parry

combatEvents.dodgeStart()        // Dodge started
combatEvents.dodgeIFrames()      // Invulnerability frames active
combatEvents.dodgeEnd()          // Dodge finished
```

### Movement Events

```javascript
const movementEvents = AnimationEventPresets.createMovementEvents(eventSystem)

// Basic movement
movementEvents.moveStart(direction)
movementEvents.moveStop()
movementEvents.turnAround(newDirection)

// Jump events
movementEvents.jumpStart()
movementEvents.jumpApex()
movementEvents.jumpLand(fallHeight)
movementEvents.doubleJump()

// Dash events
movementEvents.dashStart(direction)
movementEvents.dashEnd()

// Wall events
movementEvents.wallSlideStart()
movementEvents.wallSlideEnd()
movementEvents.wallJump()

// Footsteps
movementEvents.footstep('left')
movementEvents.footstep('right')
```

### Effect Events

```javascript
const effectEvents = AnimationEventPresets.createEffectEvents(eventSystem)

// Visual effects
effectEvents.particleSpawn('blood', { x: 100, y: 200 })
effectEvents.trailStart()
effectEvents.trailEnd()

// Sound effects
effectEvents.soundPlay('sword_swing')
effectEvents.soundStop('ambient_music')

// Screen effects
effectEvents.screenShake(0.5)       // intensity 0-1
effectEvents.screenFlash('#ff0000') // red flash
effectEvents.slowMotion(0.5)        // 50% speed
```

---

## Auto-Attach Events to Animations

Automatically attach event presets to animations.

```javascript
import { AnimationEventPresets } from './animation/system/animation-events.js'

// Attach combat events to attack animation
const attackAnim = AnimationEventPresets.attachToAnimation(
    attackAnimation,
    eventSystem,
    'combat'
)

// Automatically adds:
// - attack.windup at 20%
// - attack.active at 50%
// - attack.recovery at 80%
// - combo.window at 60%
```

**Preset Types:**
- `'combat'` - Attack, block, parry, roll animations
- `'movement'` - Jump, run, dash, wall animations
- `'damage'` - Hurt, death animations

---

## Global Event Listener

Listen to ALL events for debugging or logging.

```javascript
// Add global listener
const unsubscribe = events.addGlobalListener((eventName, data) => {
    console.log(`[Event] ${eventName}`, data)
})

// Remove global listener
unsubscribe()
```

---

## Integration Examples

### Example 1: Combat System

```javascript
import { AnimationEventSystem, AnimationEventPresets } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()
const combatEvents = AnimationEventPresets.createCombatEvents(events)

// Listen to attack events
events.on('attack.active', () => {
    const hitbox = player.getAttackHitbox()
    
    enemies.forEach(enemy => {
        if (hitbox.intersects(enemy.bounds)) {
            enemy.takeDamage(player.attackDamage)
            combatEvents.attackHit(enemy)
        }
    })
})

// Listen to parry events
events.on('parry.success', () => {
    player.gainStamina(20)
    slowMotion(0.3, 0.5) // 30% speed for 0.5s
    events.emit('screen.flash', { color: '#00ffff' })
})

// Listen to combo events
events.on('combo.success', (data) => {
    showComboUI(data.comboCount, data.multiplier)
    cameraShake(data.comboCount * 0.1)
})
```

### Example 2: Sound Integration

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()
const soundManager = new SoundManager()

// Attack sounds
events.on('attack.windup', () => {
    soundManager.play('sword_whoosh')
})

events.on('attack.hit', (data) => {
    soundManager.play(data.critical ? 'critical_hit' : 'normal_hit')
})

// Movement sounds
events.on('footstep', (data) => {
    const surface = player.currentSurface
    soundManager.play(`footstep_${surface}`)
})

events.on('jump.land', (data) => {
    const volume = Math.min(1, data.fallHeight / 100)
    soundManager.play('land', { volume })
})
```

### Example 3: Particle Effects

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()
const particleSystem = new ParticleSystem()

// Attack effects
events.on('attack.active', () => {
    const weaponPos = player.getWeaponPosition()
    particleSystem.spawn('slash_trail', weaponPos, {
        color: '#ff4444',
        count: 10
    })
})

// Damage effects
events.on('damage.taken', (data) => {
    particleSystem.spawn('blood_spray', player.position, {
        count: 20,
        velocity: data.knockback
    })
})

// Dodge effects
events.on('dodge.start', () => {
    particleSystem.spawn('dust_cloud', player.position, {
        count: 15,
        color: '#aaaaaa'
    })
})
```

### Example 4: UI Updates

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()

// Update UI based on animation states
events.on('stateChange', (data) => {
    updateStateIndicator(data.toState)
})

// Show combo counter
events.on('combo.hit', (data) => {
    comboUI.show(data.hits, data.multiplier)
})

// Flash health bar on damage
events.on('damage.taken', (data) => {
    healthBar.flash('#ff0000')
    healthBar.setValue(data.newHealth)
})

// Update stamina bar
events.on('attack.active', (data) => {
    staminaBar.decrease(data.staminaCost)
})
```

---

## Performance Considerations

### Event Queue Processing

The event system uses a queue to prevent recursive event calls:

```javascript
// Events are queued
events.emit('attack.hit')
events.emit('combo.window')
events.emit('particle.spawn')

// Then processed in order
// This prevents recursive event loops
```

### Cleanup

Always remove listeners when no longer needed:

```javascript
// Store unsubscribe function
const unsubscribe = events.on('attack.active', handler)

// Clean up when component is destroyed
function cleanup() {
    unsubscribe()
}

// Or clear all listeners
events.clear()
```

---

## Event Types Reference

### Combat Events

| Event | Data | When Triggered |
|-------|------|----------------|
| `attack.windup` | `{}` | Attack animation starts |
| `attack.active` | `{ damage, range }` | Hitbox becomes active |
| `attack.recovery` | `{}` | Attack recovery phase |
| `attack.hit` | `{ target, damage, critical }` | Attack connects with target |
| `attack.miss` | `{}` | Attack completes without hitting |
| `combo.window` | `{ duration }` | Combo input window opens |
| `combo.success` | `{ comboCount, multiplier }` | Combo executed |
| `combo.break` | `{ hits }` | Combo chain broken |
| `block.start` | `{}` | Block starts |
| `block.hold` | `{ duration }` | Block held |
| `block.impact` | `{ damage, blocked }` | Block receives hit |
| `block.release` | `{}` | Block ends |
| `parry.window` | `{ duration }` | Parry window active |
| `parry.success` | `{}` | Successful parry |
| `parry.fail` | `{}` | Parry attempt failed |
| `dodge.start` | `{ direction }` | Dodge begins |
| `dodge.iframes` | `{}` | Invulnerability active |
| `dodge.end` | `{}` | Dodge completes |

### Movement Events

| Event | Data | When Triggered |
|-------|------|----------------|
| `move.start` | `{ direction }` | Movement begins |
| `move.stop` | `{}` | Movement stops |
| `turn` | `{ direction }` | Character turns around |
| `jump.start` | `{}` | Jump initiated |
| `jump.apex` | `{ height }` | Jump peak reached |
| `jump.land` | `{ fallHeight }` | Landing from jump |
| `jump.double` | `{}` | Double jump used |
| `dash.start` | `{ direction }` | Dash begins |
| `dash.end` | `{}` | Dash completes |
| `wall.slide.start` | `{}` | Wall slide begins |
| `wall.slide.end` | `{}` | Wall slide ends |
| `wall.jump` | `{}` | Wall jump performed |
| `footstep` | `{ foot }` | Footstep animation frame |

### State Events

| Event | Data | When Triggered |
|-------|------|----------------|
| `stateChange` | `{ fromState, toState }` | Animation state changes |
| `stateEnter` | `{ state }` | Entering new state |
| `stateExit` | `{ state, stateTime }` | Leaving current state |
| `animationComplete` | `{ animation }` | Animation finished |

### Effect Events

| Event | Data | When Triggered |
|-------|------|----------------|
| `particle.spawn` | `{ type, position }` | Particle effect triggered |
| `trail.start` | `{}` | Motion trail begins |
| `trail.end` | `{}` | Motion trail ends |
| `sound.play` | `{ sound }` | Sound effect triggered |
| `sound.stop` | `{ sound }` | Sound stopped |
| `screen.shake` | `{ intensity }` | Screen shake requested |
| `screen.flash` | `{ color }` | Screen flash requested |
| `time.scale` | `{ scale }` | Time scale change |

---

## Global Event Bus

A global event bus is exported for convenience:

```javascript
import { globalAnimationEvents } from './animation/system/animation-events.js'

// Use globally
globalAnimationEvents.on('attack.active', handler)
```

**Note:** Using a global event bus can make debugging harder. Consider creating separate event systems for different subsystems.

---

## Troubleshooting

### Events Not Firing

```javascript
// Make sure you're emitting events
events.emit('attack.active', { damage: 50 })

// Check if listener is registered
console.log(events.listeners.has('attack.active'))
```

### Memory Leaks

```javascript
// Always unsubscribe when done
const unsubscribe = events.on('attack.active', handler)

// Later
unsubscribe()

// Or clear all
events.clear()
```

### Event Order Issues

```javascript
// Events are processed in order
events.emit('first')  // Processed first
events.emit('second') // Processed second
events.emit('third')  // Processed third

// Use priority if needed (implement custom priority queue)
```

---

## Related Documentation

- **[ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)** - System overview
- **[COMBO_SYSTEM.md](./COMBO_SYSTEM.md)** - Combo system using events
- **[PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)** - Player animation states

---

**Last Updated**: October 1, 2025  
**Status**: ✅ Production Ready

