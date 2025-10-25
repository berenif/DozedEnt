# 🎬 Animation System Documentation

**Last Updated**: October 1, 2025  
**DozedEnt WASM Multiplayer Survival Game**

---

## 🚀 Quick Start

### New to the animation system?

**START HERE**: [ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)

This document explains:
- ✅ How all animation systems work together
- ✅ Actual file paths and imports
- ✅ WASM integration details
- ✅ Common usage patterns
- ✅ Troubleshooting guide

### Want to animate your player?

```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'

const player = new AnimatedPlayer(x, y, { health: 100, stamina: 100 })

// Game loop
player.update(deltaTime, input)
player.render(ctx, camera)
```

See: [PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)

---

## 📚 Documentation Index

### Essential Reading

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)** ⭐ | Complete system overview | **READ FIRST** |
| **[PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)** | Player animation states and API | Animating player characters |
| **[ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md)** | Event system for callbacks | Syncing logic with animations |
| **[COMBO_SYSTEM.md](./COMBO_SYSTEM.md)** | Fighting game combos | Adding combo attacks |

### System Documentation

| Document | Purpose |
|----------|---------|
| **[ANIMATION_SYSTEM_INDEX.md](./ANIMATION_SYSTEM_INDEX.md)** | Quick reference and overview |
| **[TOPDOWN_PHYSICS_ANIMATION.md](./TOPDOWN_PHYSICS_ANIMATION.md)** | Lightweight physics animation |
| **[HUMAN_MOTION_IMPROVEMENTS.md](./HUMAN_MOTION_IMPROVEMENTS.md)** | Procedural animation design |
| **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** | Implementation details |
| **[ANIMATION_UPDATE_SUMMARY.md](./ANIMATION_UPDATE_SUMMARY.md)** | Recent changes |

### Specialized Systems

| Document | Purpose |
|----------|---------|
| **[ABILITY_ANIMATIONS.md](./ABILITY_ANIMATIONS.md)** | Special abilities system |
| **[PROCEDURAL_WOLF_ANIMATION_README.md](./PROCEDURAL_WOLF_ANIMATION_README.md)** | Wolf enemy animations |
| **[WOLF_BODY_SYSTEM_README.md](./WOLF_BODY_SYSTEM_README.md)** | Wolf body rendering |

---

## 🎯 Common Tasks

### Task: Animate a Player Character

1. Read: [ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md) - System Overview
2. Read: [PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md) - Player API
3. Import `AnimatedPlayer` from `public/src/animation/player/procedural/player-animator.js`
4. Create player, update in game loop

### Task: Add Combat Events

1. Read: [ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md) - Event System
2. Import `AnimationEventSystem`
3. Register event listeners
4. Emit events from animation callbacks

### Task: Create Combo Attacks

1. Read: [COMBO_SYSTEM.md](./COMBO_SYSTEM.md) - Combo System
2. Import `ComboSystem`
3. Register custom combos
4. Process input in game loop

### Task: Add Special Ability

1. Read: [ABILITY_ANIMATIONS.md](./ABILITY_ANIMATIONS.md) - Ability System
2. Extend `AbilityAnimationBase`
3. Implement `onStart`, `onUpdate`, `onEnd`
4. Integrate with player class

### Task: Optimize for Top-Down View

1. Read: [TOPDOWN_PHYSICS_ANIMATION.md](./TOPDOWN_PHYSICS_ANIMATION.md) - Physics Animation
2. Use `PlayerPhysicsAnimator` instead of `PlayerProceduralAnimator`
3. Configure fixed timestep physics
4. Render with `TopDownPlayerRenderer`

---

## 🏗️ System Architecture

### Layered Design

```
WASM (C++)
    ↓
JavaScript Bridge
    ↓
AnimatedPlayer Wrapper
    ↓
┌─────────────────┬─────────────────────┐
│                 │                     │
CharacterAnimator  PlayerProceduralAnimator
(Sprite Frames)    (Skeleton + IK)
    ↓                     ↓
┌──────────────────────────────────────┐
│          PlayerRenderer              │
│       (Skeleton + Indicators)        │
└──────────────────────────────────────┘
```

**Key Insight**: Systems work **together**, not as alternatives.

---

## 📁 File Locations (Actual Paths)

### Player Animation

```
public/src/animation/player/
├── procedural/
│   ├── player-animator.js            ⭐ AnimatedPlayer (main)
│   ├── player-procedural-animator.js  (skeleton system)
│   └── modules/                       (9 IK/spine modules)
└── physics/
    └── index.js                       (lightweight physics)
```

### Controllers

```
public/src/animation/controller/
├── animation-controller.js
└── enhanced-animation-controller.js   (advanced features)
```

### Core Systems

```
public/src/animation/system/
├── animation-system.js                (CharacterAnimator)
├── animation-events.js                (event system)
├── animation-sync.js                  (multiplayer)
├── animation-performance.js           (profiling)
└── combo-system.js                    (combos)
```

### Renderers

```
public/src/renderer/
├── PlayerRenderer.js                  (alias for TopDownPlayerRenderer)
└── player/
    ├── TopDownPlayerRenderer.js       ⭐ Main renderer
    └── topdown/                       (utilities)
```

---

## ⚠️ Important Notes

### Import Paths

**✅ CORRECT:**
```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
import PlayerRenderer from './renderer/PlayerRenderer.js'
import { AnimationEventSystem } from './animation/system/animation-events.js'
```

**❌ WRONG (from old docs):**
```javascript
import AnimatedPlayer from './src/animation/player-animator.js'  // ❌ Wrong path
import { CharacterAnimator } from './animation/player-animator.js'  // ❌ Wrong class
```

### System Relationships

- **AnimatedPlayer** = High-level wrapper containing **both** CharacterAnimator and PlayerProceduralAnimator
- **CharacterAnimator** = Sprite frame animation (part of AnimatedPlayer)
- **PlayerProceduralAnimator** = Skeleton animation (part of AnimatedPlayer)
- **PlayerRenderer** = Alias for TopDownPlayerRenderer (renders the result)

### WASM Integration

Player state flows from WASM → JavaScript:

```javascript
// WASM exports
const animCode = wasmModule.get_player_anim_state()  // 0-12
const stateName = PLAYER_ANIM_NAMES[animCode]        // 'idle', 'running', etc.

// Use in renderer
renderer.render({ anim: stateName, x, y, vx, vy, hp, stamina }, toCanvas, radius)
```

---

## 🎓 Learning Path

### Beginner

1. Read [ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md) - Understand the full picture
2. Read [PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md) - Learn player API
3. Try basic example: Create AnimatedPlayer, render it
4. Experiment with different animation states

### Intermediate

5. Read [ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md) - Learn event system
6. Add event listeners for attack/damage/footsteps
7. Read [COMBO_SYSTEM.md](./COMBO_SYSTEM.md) - Learn combo system
8. Create custom combo sequences

### Advanced

9. Read [TOPDOWN_PHYSICS_ANIMATION.md](./TOPDOWN_PHYSICS_ANIMATION.md) - Performance optimization
10. Read [HUMAN_MOTION_IMPROVEMENTS.md](./HUMAN_MOTION_IMPROVEMENTS.md) - Procedural system internals
11. Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Module details
12. Create custom animation modules or abilities

---

## 🐛 Troubleshooting

### Common Issues

**Q: "Cannot find module 'player-animator.js'"**
- Check import path - correct path is `./animation/player/procedural/player-animator.js`
- Use named import: `import { AnimatedPlayer } from ...`

**Q: "Skeleton not rendering"**
- Make sure you're using `PlayerRenderer` or `TopDownPlayerRenderer`
- AnimatedPlayer automatically uses skeleton system
- Check that `player.render(ctx, camera)` is called

**Q: "Which animation controller should I use?"**
- **AnimatedPlayer** - Use this for player characters (includes everything)
- **EnhancedAnimationController** - Only if you need advanced IK/blending features
- **CharacterAnimator** - Already inside AnimatedPlayer, don't create separately

**Q: "Animation state not updating from WASM"**
```javascript
// Check state mapping
console.log('WASM code:', wasmModule.get_player_anim_state())
console.log('State name:', PLAYER_ANIM_NAMES[wasmModule.get_player_anim_state()])
```

---

## 📊 Feature Matrix

| Feature | AnimatedPlayer | PhysicsAnimator | CharacterAnimator |
|---------|---------------|-----------------|-------------------|
| **Sprite Frames** | ✅ | ❌ | ✅ |
| **Skeleton Animation** | ✅ | ✅ | ❌ |
| **IK Solvers** | ✅ (4 solvers) | ✅ (1 solver) | ❌ |
| **Performance** | Medium | High | High |
| **Use Case** | Full player | Top-down | Sprites only |

---

## 🚧 Future Enhancements

See individual documentation files for detailed roadmaps:

- **Physics Animation**: Ground contact detection, slope adaptation
- **Combo System**: More special moves, custom input patterns
- **Ability System**: More abilities, cooldown UI, effect templates
- **Event System**: Priority queues, filtered listeners
- **Wolf Animation**: GPU acceleration, seasonal adaptations

---

## 📖 Quick Reference

### Create Player
```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
const player = new AnimatedPlayer(x, y, { health: 100, stamina: 100 })
```

### Update & Render
```javascript
player.update(deltaTime, input)
player.render(ctx, camera)
```

### Listen to Events
```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'
const events = new AnimationEventSystem()
events.on('attack.active', () => checkHitDetection())
```

### Register Combo
```javascript
import { ComboSystem } from './animation/system/combo-system.js'
const combos = new ComboSystem({ comboWindow: 0.5 })
combos.registerCombo('myCombo', ['light', 'light', 'heavy'], { damage: 50 })
```

---

## 🤝 Contributing

When adding new features:

1. **Follow architecture** - LayeRed design, WASM-first
2. **Update documentation** - Keep this README and relevant docs current
3. **Add examples** - Include working code examples
4. **Test thoroughly** - Ensure 60 FPS performance
5. **File organization** - Follow existing structure in `public/src/`

---

## 📞 Support

Questions? Check these in order:

1. **[ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)** - Complete system overview
2. Specific topic docs (Player, Events, Combos, etc.)
3. Code examples in documentation
4. Troubleshooting sections

---

**Status**: ✅ **Documentation Complete**  
**Last Updated**: October 1, 2025  
**Maintainer**: DozedEnt Team

**Happy Animating! 🎬**

