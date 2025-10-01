# Migration Guide - New Modular Architecture with Events & Combos

**Date**: October 1, 2025  
**Status**: ✅ Ready for Use

## Overview

This guide helps you migrate from the old `AnimatedPlayer` god class to the new modular architecture with integrated event hooks and combo system.

## What's New?

### ✅ Modular Architecture
- **PlayerActionManager**: Business logic for actions (WASM calls)
- **PlayerStateViewModel**: State reading and UI derivation
- **PlayerAnimationCoordinator**: Animation composition
- **AnimatedPlayer**: Thin facade coordinating all modules

### ✅ Animation Events
- **AnimationEventSystem**: Event-driven architecture for action timing
- Attack/block/roll/parry event hooks
- Footstep events
- State change notifications
- Custom event registration

### ✅ Combo System
- **ComboSystem**: Fighting game-style combo detection
- Built-in combos (basic, launcher, rushdown, spin slash, etc.)
- Custom combo registration
- Combo UI renderer
- Special move support
- Cancel windows

### ✅ Separated Rendering
- No more `player.render()` mixing concerns
- Dedicated `TopDownPlayerRenderer` for all rendering
- Player provides state snapshots
- Clean separation of concerns

## Migration Paths

### Quick Migration (Minimal Changes)

**Old Code:**
```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'

const player = new AnimatedPlayer(x, y, options)
player.update(deltaTime, input)
player.render(ctx, camera)
```

**New Code (Simple Update):**
```javascript
// Just change the import path - everything else works!
import { AnimatedPlayer } from './animation/player/index.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

const player = new AnimatedPlayer(x, y, options)
const renderer = new PlayerRenderer(ctx, canvas)

player.update(deltaTime, input)
// Separate rendering from logic
renderer.render(player.getPlayerState(), toCanvas, baseRadius)
```

**Benefits**: ✅ Immediate compliance with guidelines, no behavior changes

### Recommended Migration (With Events)

Add event hooks for better game feel:

```javascript
import { AnimatedPlayer } from './animation/player/index.js'
import { AnimationEventSystem } from './animation/system/animation-events.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

const player = new AnimatedPlayer(x, y, options)
const renderer = new PlayerRenderer(ctx, canvas)
const events = new AnimationEventSystem()

// Add event listeners
events.on('attack.active', () => {
    console.log('💥 Attack hitbox active!')
    checkHitDetection()
})

events.on('dodge.iframes', () => {
    console.log('🛡️ I-frames active')
    player.invulnerable = true
})

events.on('footstep', (data) => {
    playSound(`footstep_${data.foot}`)
    spawnDustParticle()
})

// In your update loop
player.update(deltaTime, input)

// Trigger events based on state
if (player.state === 'attacking') {
    const normalized = player.getNormalizedTime()
    if (normalized >= 0.5 && normalized < 0.6) {
        events.emit('attack.active')
    }
}

renderer.render(player.getPlayerState(), toCanvas, baseRadius)
```

**Benefits**: ✅ Better feedback, easier timing, cleaner code

### Advanced Migration (Full Integration)

Use the complete integrated system with combos:

```javascript
import { IntegratedPlayerController } from './animation/player/index.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'

const playerController = new IntegratedPlayerController(x, y, {
    maxHealth: 100,
    maxStamina: 100,
    debugMode: false,
    comboWindow: 0.6,
    maxComboLength: 8
})

const renderer = new PlayerRenderer(ctx, canvas)

// Register custom combos
playerController.registerCombo('myCombo', ['light', 'light', 'heavy'], {
    damage: 55,
    knockback: 12,
    animation: 'combo_custom'
})

// Listen to combo events
playerController.on('combo.hit', (data) => {
    console.log(`💥 ${data.hits} hit combo! x${data.multiplier}`)
    showComboText(data)
})

playerController.on('parry.success', () => {
    console.log('✨ Perfect parry!')
    slowMotion(0.3, 0.5)
})

// Update (handles everything)
playerController.update(deltaTime, input)

// Render player
renderer.render(playerController.getPlayerState(), toCanvas, baseRadius)

// Render combo UI
playerController.renderComboUI(ctx)
```

**Benefits**: ✅ Complete feature set, best game feel, maximum flexibility

## Step-by-Step Migration

### Step 1: Update Imports

**Before:**
```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
```

**After (Option A - Simple):**
```javascript
import { AnimatedPlayer } from './animation/player/index.js'
```

**After (Option B - Full Featured):**
```javascript
import { IntegratedPlayerController } from './animation/player/index.js'
```

### Step 2: Create Renderer

**Add:**
```javascript
import PlayerRenderer from './renderer/PlayerRenderer.js'

const renderer = new PlayerRenderer(ctx, canvas, {
    mode: 'physics', // or 'procedural'
    debugLogging: false
})
```

### Step 3: Separate Rendering

**Before:**
```javascript
player.render(ctx, camera)
```

**After:**
```javascript
const playerState = player.getPlayerState()
renderer.render(playerState, toCanvas, baseRadius)
```

### Step 4: Add Event Hooks (Optional)

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

const events = new AnimationEventSystem()

// Attack timing
events.on('attack.windup', () => {
    /* Prepare attack animation */
})

events.on('attack.active', () => {
    /* Check hit detection */
})

events.on('attack.recovery', () => {
    /* End attack */
})

// In update loop, emit events based on state
```

### Step 5: Add Combo System (Optional)

```javascript
import { ComboSystem, ComboUIRenderer } from './animation/system/combo-system.js'

const comboSystem = new ComboSystem({
    comboWindow: 0.5,
    onComboHit: (data) => {
        console.log(`Combo: ${data.hits} hits!`)
    }
})

const comboUI = new ComboUIRenderer(comboSystem)

// In update loop
comboSystem.processInput(input, deltaTime)
comboUI.update(deltaTime)

// In render
comboUI.render(ctx, x, y)
```

### Step 6: Test Everything

Run your game and verify:
- [ ] Player moves correctly
- [ ] Animations play correctly
- [ ] Actions (attack/roll/block) work
- [ ] No console errors
- [ ] Performance is same or better

## API Changes

### AnimatedPlayer (Refactored)

**Unchanged Methods:**
- `update(deltaTime, input)` - Main update loop
- `startRoll(input)` - Start roll
- `startAttack(type)` - Start attack
- `startBlock()` - Start blocking
- `stopBlock()` - Stop blocking
- `canAttack()` - Check if can attack
- `canRoll()` - Check if can roll
- `canBlock()` - Check if can block

**New Methods:**
- `getPlayerState()` - Get complete state snapshot
- `getCurrentTransform()` - Get transform for rendering
- `setDebugMode(enabled)` - Toggle debug mode

**Deprecated Methods:**
- `render(ctx, camera)` - Use `PlayerRenderer` instead (still works with warning)

### IntegratedPlayerController (New)

**All AnimatedPlayer methods, plus:**
- `on(eventName, callback, context)` - Register event listener
- `registerCombo(name, sequence, properties)` - Add custom combo
- `renderComboUI(ctx)` - Render combo overlay
- `getComboMeter()` - Get combo state
- `destroy()` - Clean up

## Common Migration Patterns

### Pattern 1: Simple Games

**Before:**
```javascript
function gameLoop() {
    player.update(dt, input)
    player.render(ctx, camera)
}
```

**After:**
```javascript
function gameLoop() {
    player.update(dt, input)
    renderer.render(player.getPlayerState(), toCanvas, baseRadius)
}
```

### Pattern 2: Games with Effects

**Before:**
```javascript
function gameLoop() {
    player.update(dt, input)
    
    if (player.state === 'attacking') {
        spawnAttackEffect()
    }
    
    player.render(ctx, camera)
}
```

**After:**
```javascript
// Setup (once)
playerController.on('attack.active', () => {
    spawnAttackEffect()
})

// Game loop
function gameLoop() {
    playerController.update(dt, input) // Events fire automatically
    renderer.render(playerController.getPlayerState(), toCanvas, baseRadius)
}
```

### Pattern 3: Games with Combos

**Before:**
```javascript
let attackCount = 0
let lastAttackTime = 0

function gameLoop() {
    const now = Date.now()
    
    if (input.attack) {
        if (now - lastAttackTime < 500) {
            attackCount++
        } else {
            attackCount = 1
        }
        lastAttackTime = now
    }
    
    if (attackCount >= 3) {
        // Execute combo
        attackCount = 0
    }
    
    player.update(dt, input)
    player.render(ctx, camera)
}
```

**After:**
```javascript
// Setup (once)
playerController.registerCombo('myCombo', ['light', 'light', 'light'], {
    damage: 60
})

playerController.on('combo.hit', (data) => {
    // Combo executed automatically!
    console.log(`${data.hits} hit combo!`)
})

// Game loop
function gameLoop() {
    playerController.update(dt, input) // Combos detected automatically
    renderer.render(playerController.getPlayerState(), toCanvas, baseRadius)
    playerController.renderComboUI(ctx)
}
```

## Testing Checklist

After migration, test:

### Core Functionality
- [ ] Player moves in all directions
- [ ] Player responds to input correctly
- [ ] Animations play for each state
- [ ] State transitions work (idle → running → attacking, etc.)

### Actions
- [ ] Light attack works
- [ ] Heavy attack works
- [ ] Roll/dodge works
- [ ] Block works
- [ ] Parry works (if implemented)
- [ ] Jump works (if implemented)

### Events (if using)
- [ ] Attack events fire at correct times
- [ ] Footstep events fire during running
- [ ] State change events fire
- [ ] Custom events work

### Combos (if using)
- [ ] Built-in combos work
- [ ] Custom combos work
- [ ] Combo UI displays
- [ ] Combo timing windows work
- [ ] Combo multiplier increases

### Performance
- [ ] Frame rate is stable (60 FPS)
- [ ] No memory leaks
- [ ] No console errors
- [ ] Debug mode works

## Troubleshooting

### Issue: Player not rendering

**Solution**: Make sure you're using the renderer:
```javascript
import PlayerRenderer from './renderer/PlayerRenderer.js'
const renderer = new PlayerRenderer(ctx, canvas)
renderer.render(player.getPlayerState(), toCanvas, baseRadius)
```

### Issue: Events not firing

**Solution**: Make sure you're emitting events:
```javascript
// Manual event emission in your update loop
if (player.state === 'attacking') {
    const normalized = player.getNormalizedTime()
    if (normalized >= 0.5 && normalized < 0.6) {
        events.emit('attack.active')
    }
}

// OR use IntegratedPlayerController (automatic)
const playerController = new IntegratedPlayerController(x, y, options)
playerController.update(deltaTime, input) // Events fire automatically
```

### Issue: Combos not detected

**Solution**: Make sure combo system is being updated:
```javascript
comboSystem.processInput(input, deltaTime)

// OR use IntegratedPlayerController (automatic)
playerController.update(deltaTime, input) // Combos detected automatically
```

### Issue: "renderVelocity is not defined"

**Solution**: You're likely still using old TopDownPlayerRenderer. The fix is already applied, just pull latest:
```bash
git pull origin main
```

### Issue: Too many console logs

**Solution**: Disable debug logging:
```javascript
player.setDebugMode(false)

// OR for renderer
const renderer = new PlayerRenderer(ctx, canvas, {
    debugLogging: false
})
```

## Examples

### Complete Example

See `public/demos/integrated-player-demo.html` for a full working example with:
- ✅ Refactored modular architecture
- ✅ Animation event hooks
- ✅ Combo system
- ✅ Separated rendering
- ✅ Debug mode
- ✅ Complete UI

### Simple Example

See `public/src/demo/integrated-player-example.js` for implementation details.

## Support

For issues:
1. Check this migration guide
2. Review `public/src/animation/player/README.md`
3. Check `public/src/REFACTORING_SUMMARY.md`
4. Look at example code in `public/demos/`
5. Check console for errors (F12)

## Summary

| Feature | Before | After | Benefit |
|---------|--------|-------|---------|
| **File Size** | 1221 lines | 4 files < 500 lines | ✅ Maintainable |
| **Rendering** | Mixed in player | Separated | ✅ Clean architecture |
| **Events** | Manual timing | Event hooks | ✅ Better feedback |
| **Combos** | Custom code | Built-in system | ✅ Fighting game mechanics |
| **Testability** | Difficult | Easy | ✅ Modular components |
| **Extensibility** | Hard to add features | Easy | ✅ Plugin architecture |

---

**Migration Status**: ✅ **Ready for Production**  
**Backward Compatibility**: ✅ **100% Compatible**  
**Recommended Approach**: Gradual migration starting with rendering separation

