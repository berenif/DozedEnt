# 🥊 Combo System

**Location**: `public/src/animation/system/combo-system.js`  
**Last Updated**: October 1, 2025  
**Status**: ✅ **PRODUCTION READY**

## Overview

Fighting-game-style combo system with input buffering, special move recognition, damage multipliers, and cancel windows. Supports complex input sequences, timing requirements, and combo chaining.

---

## Quick Start

```javascript
import { ComboSystem } from './animation/system/combo-system.js'

const combos = new ComboSystem({
    comboWindow: 0.5,     // 0.5 seconds between inputs
    maxComboLength: 5,    // Max 5 inputs per combo
    onComboHit: (data) => {
        console.log(`${data.hits} hits! x${data.multiplier}`)
        applyDamage(data.damage)
    }
})

// Update in game loop
function update(deltaTime) {
    combos.processInput(input, deltaTime)
}
```

---

## Core Concepts

### Input Sequence

Combos are defined as sequences of inputs:

```javascript
['light', 'light', 'heavy']  // Light → Light → Heavy
```

### Combo Window

Time allowed between inputs to continue the combo (default: 0.5s):

```javascript
// If you input within 0.5s, combo continues
// If > 0.5s passes, combo resets
```

### Damage Multiplier

Multiplier increases with combo length (max 3x):

```javascript
Hit 1: x1.0 damage
Hit 2: x1.1 damage
Hit 3: x1.2 damage
...
Hit 20: x3.0 damage (capped)
```

---

## Built-in Combos

### Basic Combos

**Basic Combo** - `light → light → heavy`
```javascript
{
    damage: 50,
    knockback: 10,
    animation: 'combo_basic_finisher'
}
```

**Launcher** - `heavy → heavy → up`
```javascript
{
    damage: 40,
    knockback: 15,
    launchHeight: 20,  // Launches enemy upward
    animation: 'combo_launcher'
}
```

**Rushdown** - `light → light → light → light`
```javascript
{
    damage: 60,
    requiresRapidInput: true,  // Inputs must be fast
    animation: 'combo_rush'
}
```

### Advanced Combos

**Spin Slash** - `heavy → roll → heavy`
```javascript
{
    damage: 70,
    areaOfEffect: true,
    radius: 100,
    animation: 'combo_spin_slash'
}
```

**Counter Strike** - `block → light → heavy`
```javascript
{
    damage: 65,
    requiresPerfectTiming: true,
    timingWindow: 0.1,  // Must input within 100ms
    animation: 'combo_counter'
}
```

**Aerial Rave** - `jump → light → light → heavy`
```javascript
{
    damage: 55,
    requiresAirborne: true,  // Must be in air
    animation: 'combo_aerial'
}
```

### Special Moves (Fighting Game Style)

**Hadouken** - `down → forward → light`
```javascript
{
    damage: 30,
    projectile: true,
    animation: 'special_projectile',
    cooldown: 2
}
```

**Shoryuken** - `forward → down → forward → heavy`
```javascript
{
    damage: 45,
    knockback: 25,
    invincible: true,  // Invulnerability during move
    animation: 'special_uppercut',
    cooldown: 3
}
```

**Tatsu** - `down → back → roll`
```javascript
{
    damage: 35,
    hits: 3,
    movement: true,  // Moves player during animation
    animation: 'special_spin',
    cooldown: 2.5
}
```

---

## Registering Custom Combos

### Basic Combo

```javascript
combos.registerCombo('tripleSlash', ['light', 'light', 'heavy'], {
    damage: 50,
    knockback: 10,
    animation: 'combo_triple_finisher',
    cancelWindow: [0.4, 0.6]  // Can cancel between 40-60% of animation
})
```

### Special Move

```javascript
combos.registerSpecialMove('fireBlast', ['down', 'forward', 'special'], {
    damage: 40,
    projectile: true,
    animation: 'special_fire',
    cooldown: 3
})
```

### Advanced Requirements

```javascript
combos.registerCombo('perfectCounter', ['block', 'heavy'], {
    damage: 100,
    requiresPerfectTiming: true,  // Strict timing
    timingWindow: 0.05,           // 50ms window
    requiresGrounded: true,       // Must be on ground
    animation: 'perfect_counter'
})
```

---

## Input Types

### Attack Inputs
- `'light'` - Light attack (J key)
- `'heavy'` - Heavy attack (L key)
- `'special'` - Special attack (K key)
- `'roll'` - Roll/dodge
- `'block'` - Block
- `'jump'` - Jump

### Directional Inputs (for special moves)
- `'up'` - Up direction
- `'down'` - Down direction
- `'forward'` - Forward (relative to facing)
- `'back'` - Back (relative to facing)

**Note:** Left/right inputs are automatically converted to forward/back based on player facing direction.

---

## Processing Input

```javascript
import { ComboSystem } from './animation/system/combo-system.js'

const combos = new ComboSystem({
    comboWindow: 0.5,
    onComboHit: (data) => {
        applyComboEffects(data)
    }
})

// Game loop
function update(deltaTime) {
    const input = {
        lightAttack: keys['j'],
        heavyAttack: keys['l'],
        special: keys['k'],
        roll: keys['space'],
        block: keys['shift'],
        jump: keys['w'],
        up: keys['w'],
        down: keys['s'],
        left: keys['a'],
        right: keys['d']
    }
    
    // Set player state
    combos.setFacing(player.facing)
    combos.setGrounded(player.isGrounded)
    combos.setStamina(player.stamina)
    
    // Process inputs
    combos.processInput(input, deltaTime)
}
```

---

## Combo Requirements

### Rapid Input Requirement

```javascript
{
    requiresRapidInput: true  // Inputs must be <200ms apart
}
```

### Perfect Timing Requirement

```javascript
{
    requiresPerfectTiming: true,
    timingWindow: 0.1  // Must input within 100ms
}
```

### Airborne Requirement

```javascript
{
    requiresAirborne: true  // Must be in air
}
```

### Grounded Requirement

```javascript
{
    requiresGrounded: true  // Must be on ground
}
```

### Stamina Requirement

```javascript
{
    requiresStamina: true,
    staminaCost: 50  // Needs 50 stamina to execute
}
```

---

## Event Callbacks

### onComboStart

Triggered when combo begins:

```javascript
new ComboSystem({
    onComboStart: (data) => {
        console.log('Combo started with:', data.firstMove)
        showComboUI()
    }
})
```

### onComboHit

Triggered on each combo hit:

```javascript
new ComboSystem({
    onComboHit: (data) => {
        console.log(`Hit ${data.hits}! Damage: ${data.damage}`)
        applyDamage(data.damage)
        updateComboUI(data.hits, data.multiplier)
    }
})
```

**Data Structure:**
```javascript
{
    name: 'basicCombo',
    damage: 55.5,           // Final damage with multiplier
    hits: 3,                // Total hits in combo
    multiplier: 1.2,        // Current damage multiplier
    properties: {           // Combo properties
        animation: 'combo_basic_finisher',
        knockback: 10,
        // ... other properties
    }
}
```

### onComboEnd

Triggered when combo ends (timeout or max length):

```javascript
new ComboSystem({
    onComboEnd: (data) => {
        console.log(`Combo ended! ${data.hits} hits, x${data.maxMultiplier}`)
        showComboSummary(data.hits, data.maxMultiplier)
    }
})
```

### onSpecialMove

Triggered when special move is executed:

```javascript
new ComboSystem({
    onSpecialMove: (data) => {
        console.log('Special move:', data.name)
        triggerSpecialEffects(data.properties)
    }
})
```

---

## Cancel System

Cancel current move into another move during specific windows.

### Cancel Window

Define when a move can be cancelled:

```javascript
combos.registerCombo('slashCombo', ['light', 'light'], {
    damage: 30,
    cancelWindow: [0.4, 0.6]  // Can cancel between 40-60% of animation
})
```

### Cancelling Into Move

```javascript
// Attempt to cancel current move into new move
const success = combos.cancelInto('heavy')

if (success) {
    console.log('Successfully cancelled into heavy attack!')
}
```

---

## Combo Meter UI

Get current combo info for UI display:

```javascript
const meter = combos.getComboMeter()

console.log(meter)
// {
//     hits: 5,
//     multiplier: 1.4,
//     damage: 140,
//     timeRemaining: 0.3,
//     isActive: true
// }
```

### Built-in UI Renderer

```javascript
import { ComboUIRenderer } from './animation/system/combo-system.js'

const uiRenderer = new ComboUIRenderer(combos)

// Update and render
function render() {
    uiRenderer.update(deltaTime)
    uiRenderer.render(ctx, 100, 100)  // x, y position
}
```

**Displays:**
- Combo hit counter with color coding
- Damage multiplier
- Total damage
- Combo timer bar
- Current input sequence

---

## Special Move Buffer

Motion input buffering for complex sequences (fighting game style):

```javascript
// Buffer stores last 200ms of directional inputs
// Automatically checks for special move patterns

// Player inputs: down → forward → light (within 200ms)
// System detects "hadouken" pattern
```

Buffer configuration:

```javascript
new ComboSystem({
    bufferTime: 0.2  // 200ms input buffer
})
```

---

## Integration with WASM

The combo system can read animation progress from WASM:

```javascript
// WASM exports (if available):
// - get_player_anim_progress()
// - get_player_state_timer()
// - get_player_state_duration()

// System automatically uses these for cancel timing
```

---

## Complete Integration Example

```javascript
import { ComboSystem, ComboUIRenderer } from './animation/system/combo-system.js'
import { AnimationEventSystem } from './animation/system/animation-events.js'

// Create systems
const events = new AnimationEventSystem()
const combos = new ComboSystem({
    comboWindow: 0.6,
    maxComboLength: 10,
    onComboHit: (data) => {
        // Apply damage
        if (currentTarget) {
            currentTarget.takeDamage(data.damage)
        }
        
        // Trigger events
        events.emit('combo.hit', data)
        
        // Screen shake based on combo count
        const shakeIntensity = Math.min(0.5, data.hits * 0.05)
        events.emit('screen.shake', { intensity: shakeIntensity })
        
        // Slow motion on big combos
        if (data.hits >= 10) {
            events.emit('time.scale', { scale: 0.3, duration: 0.5 })
        }
    },
    onComboEnd: (data) => {
        showComboSummary(data.hits, data.maxMultiplier)
    }
})

// Create UI
const comboUI = new ComboUIRenderer(combos)

// Register custom combos
combos.registerCombo('superFinisher', ['light', 'light', 'heavy', 'special'], {
    damage: 100,
    animation: 'super_finisher',
    requiresRapidInput: true,
    cancelWindow: [0.5, 0.7]
})

// Game loop
function update(deltaTime) {
    // Set player state
    combos.setFacing(player.facing)
    combos.setGrounded(player.isGrounded)
    combos.setStamina(player.stamina)
    
    // Process input
    combos.processInput(input, deltaTime)
    
    // Update UI
    comboUI.update(deltaTime)
}

function render(ctx) {
    // Render combo UI
    comboUI.render(ctx, canvas.width - 200, 50)
}
```

---

## Helper Methods

### getCurrentComboString()

Get current combo as readable string:

```javascript
combos.getCurrentComboString()
// Returns: "light → light → heavy"
```

### reset()

Reset combo system:

```javascript
combos.reset()
// Clears current combo, resets multiplier
```

### getMoveProgress()

Get current animation progress (0-1):

```javascript
const progress = combos.getMoveProgress()
// Returns: 0.45 (45% through animation)
```

---

## Performance Considerations

### Input Buffer Cleanup

Old inputs are automatically removed from buffer:

```javascript
// Inputs older than bufferTime (200ms) are cleaned up
// No manual cleanup needed
```

### Combo Timeout

Combos automatically end after `comboWindow` expires:

```javascript
// No need to manually end combos
// System handles timeout automatically
```

---

## Troubleshooting

### Combo Not Triggering

```javascript
// Check if combo is registered
console.log(combos.combos.has('myCombo'))

// Check input sequence
console.log(combos.currentCombo)  // Current inputs

// Check requirements
combos.setGrounded(true)  // If combo requires grounded
combos.setStamina(100)    // If combo requires stamina
```

### Inputs Not Registering

```javascript
// Make sure you're calling processInput
combos.processInput(input, deltaTime)

// Check input format
const input = {
    lightAttack: true,  // Not just 'light'
    heavyAttack: false,
    // ... other inputs
}
```

### Cancel Not Working

```javascript
// Check if in cancel window
const progress = combos.getMoveProgress()
const cancelWindow = [0.4, 0.6]

console.log('Progress:', progress)
console.log('Can cancel:', progress >= 0.4 && progress <= 0.6)
```

---

## Related Documentation

- **[ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)** - System overview
- **[ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md)** - Event system
- **[PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)** - Player animation states

---

**Last Updated**: October 1, 2025  
**Status**: ✅ Production Ready

