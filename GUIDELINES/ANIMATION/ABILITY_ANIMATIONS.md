# ⚔️ Ability Animation System

**Location**: `public/src/animation/abilities/`  
**Last Updated**: October 1, 2025  
**Status**: ✅ **IN DEVELOPMENT**

## Overview

The Ability Animation System provides a framework for character-specific special abilities with custom animations, visual effects, and gameplay mechanics.

---

## File Structure

```
public/src/animation/abilities/
├── ability-animation-base.js    # Base class for abilities
└── warden-bash-animation.js     # Warden bash ability
```

---

## Base Class

**Location**: `public/src/animation/abilities/ability-animation-base.js`

Base class for creating ability animations:

```javascript
import { AbilityAnimationBase } from './animation/abilities/ability-animation-base.js'

class MyAbilityAnimation extends AbilityAnimationBase {
    constructor() {
        super({
            duration: 1.0,
            cooldown: 3.0,
            staminaCost: 30
        })
    }
    
    onStart(player, target) {
        // Called when ability starts
    }
    
    onUpdate(deltaTime) {
        // Called every frame
    }
    
    onEnd() {
        // Called when ability ends
    }
}
```

---

## Warden Bash Ability

**Location**: `public/src/animation/abilities/warden-bash-animation.js`

Example implementation of a character ability:

```javascript
import { WardenBashAnimation } from './animation/abilities/warden-bash-animation.js'

const bashAbility = new WardenBashAnimation()

// Activate ability
bashAbility.start(player, targetEnemy)

// Update in game loop
bashAbility.update(deltaTime)

// Check if active
if (bashAbility.isActive()) {
    // Ability is running
}

// Check cooldown
if (bashAbility.isOnCooldown()) {
    const remaining = bashAbility.getCooldownRemaining()
    console.log(`Cooldown: ${remaining.toFixed(1)}s`)
}
```

---

## Creating Custom Abilities

### Step 1: Define Ability Class

```javascript
import { AbilityAnimationBase } from './animation/abilities/ability-animation-base.js'

export class FireballAbility extends AbilityAnimationBase {
    constructor() {
        super({
            duration: 0.8,
            cooldown: 5.0,
            staminaCost: 40,
            manaCost: 20
        })
        
        this.projectile = null
    }
    
    onStart(player, target) {
        // Play charge-up animation
        player.setState('chargingFireball')
        
        // Visual effects
        this.spawnChargeParticles(player.position)
    }
    
    onUpdate(deltaTime) {
        const progress = this.getProgress()
        
        // Release at 50% of animation
        if (progress >= 0.5 && !this.projectile) {
            this.releaseProjectile()
        }
        
        // Update projectile
        if (this.projectile) {
            this.projectile.update(deltaTime)
        }
    }
    
    onEnd() {
        // Return player to normal state
        this.player.setState('idle')
    }
    
    releaseProjectile() {
        this.projectile = new Projectile({
            position: this.player.position,
            direction: this.player.facing,
            speed: 500,
            damage: 60,
            type: 'fireball'
        })
    }
    
    spawnChargeParticles(position) {
        // Spawn particle effects
    }
}
```

### Step 2: Integrate with Player

```javascript
import { AnimatedPlayer } from './animation/player/procedural/player-animator.js'
import { FireballAbility } from './animation/abilities/fireball-ability.js'

class MagePlayer extends AnimatedPlayer {
    constructor(x, y) {
        super(x, y)
        
        // Register abilities
        this.abilities = {
            fireball: new FireballAbility()
        }
    }
    
    useAbility(abilityName, target) {
        const ability = this.abilities[abilityName]
        
        if (!ability) {return false}
        
        // Check if can use
        if (ability.isOnCooldown()) {return false}
        if (this.stamina < ability.staminaCost) {return false}
        
        // Consume resources
        this.stamina -= ability.staminaCost
        
        // Start ability
        ability.start(this, target)
        
        return true
    }
    
    update(deltaTime, input) {
        super.update(deltaTime, input)
        
        // Update active abilities
        Object.values(this.abilities).forEach(ability => {
            ability.update(deltaTime)
        })
        
        // Check for ability input
        if (input.ability1) {
            this.useAbility('fireball', this.getTargetEnemy())
        }
    }
}
```

---

## Ability Properties

### Common Properties

```javascript
{
    duration: 1.0,        // Animation duration (seconds)
    cooldown: 3.0,        // Cooldown after use (seconds)
    staminaCost: 30,      // Stamina required
    manaCost: 0,          // Mana required (if applicable)
    canMoveWhileCasting: false,  // Allow movement
    canCancelEarly: false,       // Allow cancelling
    interruptible: true   // Can be interrupted by damage
}
```

---

## Ability States

### State Machine

```javascript
class AbilityAnimationBase {
    states = {
        READY: 'ready',
        CHARGING: 'charging',
        ACTIVE: 'active',
        RECOVERY: 'recovery',
        COOLDOWN: 'cooldown'
    }
}
```

### State Flow

```
READY → CHARGING → ACTIVE → RECOVERY → COOLDOWN → READY
```

---

## Integration with Animation Events

```javascript
import { AnimationEventSystem } from './animation/system/animation-events.js'

class ThunderStrikeAbility extends AbilityAnimationBase {
    constructor(eventSystem) {
        super({
            duration: 1.2,
            cooldown: 8.0
        })
        
        this.events = eventSystem
    }
    
    onStart(player, target) {
        // Emit event
        this.events.emit('ability.start', {
            ability: 'thunderStrike',
            player: player.id
        })
    }
    
    onHit(target) {
        this.events.emit('ability.hit', {
            ability: 'thunderStrike',
            target: target.id,
            damage: 100
        })
    }
}
```

---

## Visual Effects Integration

```javascript
class FlameSlashAbility extends AbilityAnimationBase {
    constructor(particleSystem) {
        super({ duration: 0.6 })
        this.particles = particleSystem
    }
    
    onUpdate(deltaTime) {
        const progress = this.getProgress()
        
        // Spawn trail particles during active frames
        if (progress >= 0.3 && progress <= 0.7) {
            this.spawnTrailParticles()
        }
        
        // Impact effect at 50%
        if (progress >= 0.5 && !this.impactSpawned) {
            this.spawnImpactEffect()
            this.impactSpawned = true
        }
    }
    
    spawnTrailParticles() {
        this.particles.spawn('flame_trail', this.player.weaponPosition, {
            count: 5,
            color: '#ff4400'
        })
    }
    
    spawnImpactEffect() {
        this.particles.spawn('explosion', this.target.position, {
            count: 20,
            color: '#ff0000'
        })
    }
}
```

---

## WASM Integration

Abilities can integrate with WASM for server-side validation:

```javascript
class WardenBashAbility extends AbilityAnimationBase {
    onStart(player, target) {
        // Call WASM function
        if (wasmModule && wasmModule.start_charging_bash) {
            wasmModule.start_charging_bash()
        }
    }
    
    onUpdate(deltaTime) {
        // Read bash state from WASM
        if (wasmModule && wasmModule.is_bash_active) {
            const isActive = wasmModule.is_bash_active()
            
            if (!isActive && this.isActive()) {
                this.end()
            }
        }
    }
}
```

---

## Related Documentation

- **[ANIMATION_ARCHITECTURE.md](./ANIMATION_ARCHITECTURE.md)** - System overview
- **[ANIMATION_EVENTS.md](./ANIMATION_EVENTS.md)** - Event system
- **[PLAYER_ANIMATIONS.md](./PLAYER_ANIMATIONS.md)** - Player animations

---

**Last Updated**: October 1, 2025  
**Status**: ✅ In Development

