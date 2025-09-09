# 🎮 Enhanced Enemy Character Template & Design Guidelines

## Overview
This document outlines the comprehensive standardized rules and patterns for building enemy characters in the game. All enemy implementations follow these guidelines to ensure consistency, maintainability, optimal gameplay experience, and seamless integration with the WASM-first architecture.

---

## Core Enemy Structure

### 1. Enhanced Base Properties

Every enemy character MUST include these fundamental properties with WASM integration:

```javascript
// Position and Physics (WASM-managed)
position: { x, y }           // Managed by WASM physics
velocity: { x: 0, y: 0 }     // Calculated in WASM
acceleration: { x: 0, y: 0 } // Applied in WASM

// Dimensions (WASM collision)
width: [enemy-specific]      // Used for WASM collision detection
height: [enemy-specific]     // Used for WASM collision detection
facing: 1                    // 1 for right, -1 for left

// Combat Properties (WASM-managed)
health: [base-health]        // Managed by WASM combat system
maxHealth: [base-health]    // Set by WASM initialization
damage: [base-damage]        // Calculated by WASM
attackRange: [attack-distance] // Used by WASM AI
detectionRange: [detection-distance] // Used by WASM perception

// Movement Properties (WASM-physics)
speed: [base-speed]          // Base movement speed
maxSpeed: [max-speed]        // Maximum velocity cap
friction: 0.85              // Standard friction value
isGrounded: true            // Ground collision state

// Enhanced State Management
state: 'idle'               // Current animation/behavior state
animationFrame: 0           // Current animation frame
animationTime: 0            // Animation timing
animationSpeed: 0.1         // Animation playback speed

// AI Attributes (WASM-managed)
aggression: 0.5             // Attack frequency (0-1)
intelligence: 0.6           // Tactical decision making (0-1)
coordination: 0.7           // Pack behavior (0-1)
morale: 0.8                 // Confidence level (0-1)
stamina: 1.0                // Action availability (0-1)
awareness: 0.9              // Perception radius (0-1)

// Emotional State (WASM-managed)
emotionalState: 'calm'      // Current emotional state
emotionalIntensity: 0.0     // Emotional intensity (0-1)
```

### 2. Enemy Type System

Each enemy should have a type system with variations:

```javascript
type: 'normal' // normal, elite, boss, special
size: getEnemySize() // Size multiplier based on type
```

**Standard Size Multipliers:**
- Normal: 1.0
- Elite: 1.2-1.3
- Boss: 1.5-2.0
- Special: Variable (0.8-1.5)

### 3. Visual Properties

Essential visual characteristics:

```javascript
colors: getEnemyColors() // Type-specific color scheme
uniquePattern: Math.random() // Unique visual identifier
// Animation-specific properties (tail, ears, wings, etc.)
```

---

## State Machine Architecture

### Required States

Every enemy MUST implement these core states:

1. **idle** - Default resting state
2. **moving** (walking/running/flying) - Movement states
3. **attacking** - Active attack state
4. **hurt** - Damage reaction state
5. **death** - Death sequence state

### Optional Advanced States

Based on enemy complexity:

- **prowling/stalking** - Pre-attack positioning
- **charging** - Attack preparation
- **defensive** - Blocking/defending
- **fleeing** - Escape behavior
- **special_ability** - Unique ability states

### State Transition Rules

```javascript
setState(newState) {
    if (this.state !== newState) {
        this.state = newState
        this.animationFrame = 0
        this.animationTime = 0
        // Trigger state-specific initialization
    }
}
```

---

## AI Behavior Patterns

### 1. Detection System

```javascript
// Player detection logic
getDistanceTo(target) {
    const dx = this.position.x - target.position.x
    const dy = this.position.y - target.position.y
    return Math.sqrt(dx * dx + dy * dy)
}

// Behavior based on distance
if (distance < attackRange) {
    // Attack
} else if (distance < detectionRange) {
    // Pursue/Prepare
} else {
    // Patrol/Idle
}
```

### 2. Movement Patterns

**Basic Movement:**
```javascript
moveTowards(target, speed = null) {
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 0) {
        const moveSpeed = speed || this.speed
        this.velocity.x = (dx / distance) * moveSpeed
        this.velocity.y = (dy / distance) * moveSpeed
        this.facing = dx > 0 ? 1 : -1
    }
}
```

### 3. Attack Patterns

Every enemy should have:
- **Primary Attack** - Basic attack pattern
- **Attack Cooldown** - Time between attacks
- **Attack Telegraph** - Visual warning before attack

```javascript
attack(target) {
    const distance = this.getDistanceTo(target)
    
    if (distance <= this.attackRange) {
        this.setState('attacking')
        // Apply damage after animation frame
        return true
    }
    return false
}
```

---

## Special Abilities System

### Structure for Special Abilities

```javascript
abilities: {
    ABILITY_NAME: {
        name: 'Display Name',
        cooldown: [milliseconds],
        lastUsed: 0,
        effect: 'Description',
        // Ability-specific properties
    }
}
```

### Ability Implementation Pattern

```javascript
useAbility(abilityName, target = null) {
    const ability = this.abilities[abilityName]
    if (!ability) return false
    
    const now = Date.now()
    if (now - ability.lastUsed < ability.cooldown) {
        return false
    }
    
    ability.lastUsed = now
    // Execute ability logic
    return true
}
```

---

## Animation System Integration

### 1. Animation Properties

Each enemy needs animation-specific properties:

```javascript
// Core animation properties
animationSystem: new EnemyAnimationSystem()

// Body part positions (as needed)
legPositions: []
tailSegments: []
wingPositions: []

// Animation modifiers
bodyBob: 0
headBob: 0
bodyStretch: 1

// Visual effects
particleSystem: null
```

### 2. Animation States Mapping

Map each state to specific animations:

```javascript
const animationMap = {
    'idle': 'idleAnimation',
    'walking': 'walkCycle',
    'running': 'runCycle',
    'attacking': 'attackSequence',
    'hurt': 'hurtReaction',
    'death': 'deathAnimation'
}
```

---

## Damage & Health System

### Taking Damage

```javascript
takeDamage(amount) {
    this.health -= amount
    this.setState('hurt')
    
    // Knockback effect
    this.velocity.x = -this.facing * [knockback-force]
    this.velocity.y = -[vertical-knockback]
    
    if (this.health <= 0) {
        this.health = 0
        this.setState('death')
        this.onDeath()
    }
}
```

### Health Bar Rendering

```javascript
drawHealthBar(ctx) {
    if (this.health >= this.maxHealth) return
    
    // Position above enemy
    const barWidth = 60
    const barHeight = 6
    const barY = -this.height * 0.5 - 20
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(-barWidth/2, barY, barWidth, barHeight)
    
    // Health
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = getHealthColor(healthPercent)
    ctx.fillRect(-barWidth/2, barY, barWidth * healthPercent, barHeight)
}
```

---

## Rendering Pipeline

### Standard Render Method

```javascript
render(ctx, camera) {
    ctx.save()
    
    // Apply camera transform
    ctx.translate(
        this.position.x - camera.x,
        this.position.y - camera.y
    )
    
    // Apply facing direction
    ctx.scale(this.facing, 1)
    
    // Apply size scaling
    ctx.scale(this.size, this.size)
    
    // Render layers in order:
    this.drawShadow(ctx)
    this.drawBackLimbs(ctx)
    this.drawBody(ctx)
    this.drawFrontLimbs(ctx)
    this.drawHead(ctx)
    this.drawEffects(ctx)
    this.drawHealthBar(ctx)
    
    ctx.restore()
}
```

---

## Update Loop

### Standard Update Pattern

```javascript
update(deltaTime, player, gameState) {
    // 1. Update animations
    this.animationTime += deltaTime
    this.animationFrame = Math.floor(this.animationTime / this.animationSpeed)
    
    // 2. Apply animation system
    if (this.animationSystem) {
        this.animationSystem.applyAnimation(this, deltaTime)
    }
    
    // 3. AI decision making
    this.updateAI(deltaTime, player)
    
    // 4. Update physics
    this.velocity.x += this.acceleration.x * deltaTime
    this.velocity.y += this.acceleration.y * deltaTime
    
    // 5. Apply friction
    this.velocity.x *= this.friction
    this.velocity.y *= this.friction
    
    // 6. Update position
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    
    // 7. Reset acceleration
    this.acceleration.x = 0
    this.acceleration.y = 0
    
    // 8. Update special systems (particles, effects, etc.)
    this.updateSpecialSystems(deltaTime)
}
```

---

## Enemy Variants & Specialization

### Type-Based Modifications

When creating enemy variants:

1. **Stats Scaling:**
   - Health: ×1.0 to ×2.0 based on difficulty
   - Damage: ×1.0 to ×1.5 based on role
   - Speed: ×0.8 to ×1.3 based on agility
   - Detection Range: ×1.0 to ×1.5 based on awareness

2. **Visual Differentiation:**
   - Unique color schemes per type
   - Size variations
   - Special visual effects (glow, particles)
   - Distinctive markings or features

3. **Behavioral Differences:**
   - Aggression levels
   - Attack patterns
   - Movement strategies
   - Special abilities

---

## Performance Optimization Guidelines

### 1. Object Pooling

Reuse enemy instances when possible:

```javascript
class EnemyPool {
    constructor(enemyClass, poolSize) {
        this.pool = []
        this.active = []
        // Initialize pool
    }
    
    spawn(x, y, type) {
        // Get from pool or create new
    }
    
    despawn(enemy) {
        // Return to pool
    }
}
```

### 2. LOD (Level of Detail) System

Reduce complexity based on distance:

```javascript
if (distanceToCamera > FAR_DISTANCE) {
    // Skip complex animations
    // Reduce particle effects
    // Simplify rendering
}
```

### 3. Update Throttling

```javascript
// Update AI less frequently for distant enemies
if (distanceToPlayer > LONG_RANGE) {
    if (frameCount % 3 === 0) {
        this.updateAI(deltaTime, player)
    }
}
```

---

## Sound Integration

### Sound Events Mapping

```javascript
const soundEvents = {
    'spawn': 'enemy_spawn_sound',
    'idle': 'enemy_idle_sound',
    'alert': 'enemy_alert_sound',
    'attack': 'enemy_attack_sound',
    'hurt': 'enemy_hurt_sound',
    'death': 'enemy_death_sound'
}
```

### Playing Sounds

```javascript
playSound(eventType) {
    if (this.soundSystem) {
        this.soundSystem.playAtPosition(
            soundEvents[eventType],
            this.position.x,
            this.position.y,
            { volume: this.getSoundVolume() }
        )
    }
}
```

---

## Group/Pack Behavior (Optional)

For enemies that work in groups:

### 1. Pack Structure

```javascript
packId: null
packRole: 'member' // leader, member, scout, etc.
packMembers: []
```

### 2. Communication System

```javascript
// Broadcast to pack
broadcastToPack(message) {
    this.packMembers.forEach(member => {
        member.receiveMessage(message)
    })
}

// Coordinate attacks
coordinateAttack(target) {
    // Calculate positions
    // Assign roles
    // Synchronize timing
}
```

### 3. Formation Movement

```javascript
updatePackFormation(leaderPosition, formationIndex, totalPack) {
    // Calculate formation offset
    // Move to formation position
    // Maintain spacing
}
```

---

## Special Effects & Polish

### 1. Particle Effects

Integrate particle systems for:
- Attack impacts
- Movement dust/trails
- Special ability effects
- Death particles

### 2. Screen Effects

Trigger camera/screen effects for:
- Heavy attacks (screen shake)
- Boss encounters (zoom effects)
- Special abilities (color filters)

### 3. Visual Feedback

Provide clear visual feedback for:
- State changes (color shifts)
- Damage taken (flash/shake)
- Charging attacks (glow buildup)
- Status effects (visual indicators)

---

## Testing Checklist

Before considering an enemy complete, verify:

- [ ] All required states are implemented
- [ ] Smooth state transitions
- [ ] Balanced stats (health, damage, speed)
- [ ] Clear attack telegraphs
- [ ] Proper collision detection
- [ ] Health bar displays correctly
- [ ] Death sequence completes properly
- [ ] No memory leaks (proper cleanup)
- [ ] Sounds play at appropriate times
- [ ] Visual effects render correctly
- [ ] AI behaves predictably
- [ ] Performance is optimized
- [ ] Special abilities work as intended
- [ ] Group behavior (if applicable) functions correctly

---

## Code Organization

### File Structure

```
src/
├── enemies/
│   ├── base-enemy.js          // Base class
│   ├── [enemy-name]/
│   │   ├── [enemy-name].js    // Main class
│   │   ├── [enemy-name]-ai.js // AI behavior
│   │   ├── [enemy-name]-animation.js // Animations
│   │   └── [enemy-name]-abilities.js // Special abilities
```

### Class Hierarchy

```javascript
BaseEnemy
├── MeleeEnemy
│   ├── WolfCharacter
│   ├── BearCharacter
│   └── ...
├── RangedEnemy
│   ├── ArcherCharacter
│   └── ...
└── BossEnemy
    ├── AlphaWolf
    └── ...
```

---

## Example Implementation Checklist

When implementing a new enemy:

1. **Define Core Properties**
   - Set base stats
   - Define dimensions
   - Choose enemy type

2. **Implement States**
   - Create state machine
   - Define state transitions
   - Add state-specific behavior

3. **Create AI Behavior**
   - Implement detection
   - Add movement patterns
   - Define attack logic

4. **Add Animations**
   - Create animation system
   - Map states to animations
   - Add procedural animations

5. **Implement Combat**
   - Add attack patterns
   - Implement damage system
   - Add special abilities

6. **Polish & Effects**
   - Add particle effects
   - Integrate sounds
   - Add visual feedback

7. **Optimize & Test**
   - Profile performance
   - Test all states
   - Balance gameplay

---

## Notes

- Always prioritize gameplay clarity over visual complexity
- Ensure enemies are fun to fight against, not just challenging
- Maintain consistent difficulty scaling across enemy types
- Consider accessibility (clear visual/audio cues)
- Document any enemy-specific quirks or special behaviors
- Test enemies in various game scenarios and difficulties

---

*This template should be referenced whenever creating new enemy characters. Update this document as new patterns or best practices emerge.*