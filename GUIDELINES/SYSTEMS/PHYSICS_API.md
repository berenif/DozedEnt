# Physics System API Reference

**Version:** 1.0  
**Status:** Production  
**Last Updated:** January 2025

---

## 📋 Table of Contents
- [Overview](#overview)
- [Player Physics API](#player-physics-api)
- [Enemy Physics API](#enemy-physics-api)
- [Barrel Physics API](#barrel-physics-api)
- [Performance Monitoring](#performance-monitoring)
- [JavaScript Integration Examples](#javascript-integration-examples)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

This document provides detailed API reference for all physics-related WASM exports. All functions are available through the `exports` object after loading `game.wasm`.

### Coordinate System
- **World Space:** 0.0 to 1.0 for both X and Y axes
- **Origin:** Top-left corner (0, 0)
- **Units:** Normalized (1.0 = full screen dimension)

### Force Units
- **Force:** Arbitrary game units (typical range: 5-50)
- **Mass:** Kilograms (typical: 60-80 for humanoids)
- **Velocity:** World units per second

### Return Values
- **Success/Failure:** `1` for success, `0` for failure
- **Invalid Indices:** Returns `0.0` for positions, `-1` for IDs
- **Body IDs:** Non-zero uint32_t values, `0` indicates failure

---

## Player Physics API

### Force Application

#### `apply_physics_knockback(force_x: float, force_y: float) -> void`

Applies instant knockback force to the player.

**Parameters:**
- `force_x` (float): Horizontal force component (-50 to 50 typical)
- `force_y` (float): Vertical force component (-50 to 50 typical)

**Behavior:**
- Converts force to acceleration (F = ma)
- Applied as impulse (instantaneous velocity change)
- Affects next physics tick
- Knockback decays naturally via drag

**Example:**
```javascript
// Knockback from right-side attack
exports.apply_physics_knockback(-20.0, 0.0);

// Knockback with upward lift
exports.apply_physics_knockback(-15.0, -10.0);
```

**Use Cases:**
- Enemy attack hit reactions
- Explosion forces
- Environmental hazards
- Parry/block pushback

---

### State Queries

#### `get_physics_player_x() -> float`

Get player X position from physics simulation.

**Returns:** X coordinate (0.0-1.0)

**Notes:**
- Always returns physics-authoritative position
- May differ from gameplay position before sync
- Call `sync_player_position_from_physics()` to update game state

---

#### `get_physics_player_y() -> float`

Get player Y position from physics simulation.

**Returns:** Y coordinate (0.0-1.0)

---

#### `get_physics_player_vel_x() -> float`

Get player X velocity component.

**Returns:** Velocity in world units per second

**Typical Values:**
- `-10.0 to 10.0`: Normal movement
- `-30.0 to 30.0`: Dash/charge speeds
- `> 50.0`: Extreme knockback

---

#### `get_physics_player_vel_y() -> float`

Get player Y velocity component.

**Returns:** Velocity in world units per second

---

### Synchronization

#### `sync_player_position_from_physics() -> void`

Synchronizes gameplay position with physics position.

**Behavior:**
- Copies physics body position to game state
- Updates player X/Y for rendering
- Should be called after physics updates
- Typically once per frame

**Example:**
```javascript
function update(dt) {
  exports.update(dt);                          // Update physics
  exports.sync_player_position_from_physics(); // Sync positions
  
  const x = exports.get_x();                   // Now reflects physics
  const y = exports.get_y();
  renderPlayer(x, y);
}
```

**When to Call:**
- After `update()` each frame
- After applying knockback
- Before reading positions for rendering

---

## Enemy Physics API

### Body Management

#### `create_enemy_body(enemy_index: int, x: float, y: float, mass: float, radius: float) -> uint32_t`

Creates a physics body for an enemy entity.

**Parameters:**
- `enemy_index` (int): Enemy array slot (0-31)
- `x, y` (float): Initial position (0.0-1.0)
- `mass` (float): Body mass in kilograms (40-100 typical)
- `radius` (float): Collision sphere radius (0.2-0.5 typical)

**Returns:**
- `uint32_t`: Physics body ID (non-zero on success)
- `0`: Creation failed (max bodies reached, invalid index)

**Example:**
```javascript
// Create wolf body at center with 70kg mass and 0.35 radius
const bodyId = exports.create_enemy_body(0, 0.5, 0.5, 70.0, 0.35);

if (bodyId === 0) {
  console.error('Failed to create enemy physics body');
}
```

**Notes:**
- Must be called after enemy spawned in game state
- Body ID is stored in enemy tracking structure
- Automatically participates in collision detection
- Position synced with game state each frame

---

#### `destroy_enemy_body(enemy_index: int) -> void`

Removes an enemy's physics body and releases resources.

**Parameters:**
- `enemy_index` (int): Enemy array slot to remove

**Behavior:**
- Removes body from simulation
- Frees body ID for reuse
- Clears tracking in game state
- Safe to call even if no body exists

**Example:**
```javascript
// Remove enemy physics body when enemy dies
exports.destroy_enemy_body(enemyIndex);
```

**When to Call:**
- Enemy death
- Enemy despawn (too far from player)
- Level transition
- Game reset

---

### Position Queries

#### `get_enemy_body_x(enemy_index: int) -> float`

Get enemy physics body X position.

**Parameters:**
- `enemy_index` (int): Enemy array slot (0-31)

**Returns:**
- `float`: X coordinate (0.0-1.0)
- `0.0`: Invalid index or no body

**Example:**
```javascript
const enemyX = exports.get_enemy_body_x(0);
if (enemyX > 0.0) {
  renderEnemy(enemyX, enemyY);
}
```

---

#### `get_enemy_body_y(enemy_index: int) -> float`

Get enemy physics body Y position.

**Parameters:**
- `enemy_index` (int): Enemy array slot (0-31)

**Returns:**
- `float`: Y coordinate (0.0-1.0)
- `0.0`: Invalid index or no body

---

### Force Application

#### `apply_enemy_knockback(enemy_index: int, force_x: float, force_y: float) -> void`

Apply knockback force to enemy.

**Parameters:**
- `enemy_index` (int): Enemy to affect (0-31)
- `force_x, force_y` (float): Force vector

**Behavior:**
- Applies instant impulse to enemy velocity
- Direction and magnitude from force vector
- Enemy mass affects final velocity change
- Knockback decays via drag

**Example:**
```javascript
// Player attacks enemy from left
const attackDir = {x: 1.0, y: 0.0};
const knockbackForce = 25.0;

exports.apply_enemy_knockback(
  enemyIndex,
  attackDir.x * knockbackForce,
  attackDir.y * knockbackForce
);
```

**Use Cases:**
- Attack hit reactions
- Shield bash effects
- Spell impacts
- Environmental forces

---

#### `apply_attack_lunge(enemy_index: int, target_x: float, target_y: float, force: float) -> void`

Apply directional lunge force toward target.

**Parameters:**
- `enemy_index` (int): Enemy to lunge (0-31)
- `target_x, target_y` (float): Target position (0.0-1.0)
- `force` (float): Lunge force magnitude (10-40 typical)

**Behavior:**
- Calculates direction from enemy to target
- Normalizes direction vector
- Applies force in that direction
- Results in smooth approach motion

**Example:**
```javascript
// Wolf lunges toward player
const playerX = exports.get_x();
const playerY = exports.get_y();

exports.apply_attack_lunge(wolfIndex, playerX, playerY, 30.0);
```

**Use Cases:**
- Enemy attack lunges
- Charge attacks
- Dash moves
- Closing distance smoothly

---

#### `set_enemy_body_position(enemy_index: int, x: float, y: float) -> void`

Directly set enemy physics body position (teleport).

**Parameters:**
- `enemy_index` (int): Enemy to move (0-31)
- `x, y` (float): New position (0.0-1.0)

**Behavior:**
- Instantly moves body to new position
- Clears velocity (stops movement)
- Should be used sparingly (breaks physics continuity)
- Resets sleep state

**Example:**
```javascript
// Teleport enemy to spawn point
exports.set_enemy_body_position(enemyIndex, 0.8, 0.2);
```

**Use Cases:**
- Enemy spawning
- Teleport abilities
- Respawn mechanics
- Debug/testing

**⚠️ Warning:** Overuse breaks physics immersion. Prefer forces for movement.

---

### Body Management

#### `get_enemy_body_count() -> int`

Get number of active enemy physics bodies.

**Returns:** Count of bodies (0-32)

**Example:**
```javascript
const bodyCount = exports.get_enemy_body_count();
console.log(`Active enemy physics bodies: ${bodyCount}`);
```

---

#### `clear_all_enemy_bodies() -> void`

Remove all enemy physics bodies.

**Behavior:**
- Destroys all enemy bodies
- Clears all tracking
- Frees all body IDs
- Fast cleanup for level transitions

**Example:**
```javascript
// Clear level
exports.clear_enemies();           // Clear game state
exports.clear_all_enemy_bodies(); // Clear physics
```

---

## Barrel Physics API

### Spawning

#### `spawn_barrel(x: float, y: float) -> void`

Spawn physics barrel at position.

**Parameters:**
- `x, y` (float): Spawn position (0.0-1.0)

**Behavior:**
- Creates physics body with barrel properties
- Mass: 40kg
- Radius: 0.25
- Drag: 0.9 (rolls to stop)
- Restitution: 0.5 (bouncy)

**Example:**
```javascript
// Spawn barrel at center
exports.spawn_barrel(0.5, 0.5);
```

---

#### `throw_barrel(barrel_index: int, vel_x: float, vel_y: float) -> void`

Apply throw velocity to barrel.

**Parameters:**
- `barrel_index` (int): Barrel to throw (0-based)
- `vel_x, vel_y` (float): Initial velocity vector

**Example:**
```javascript
// Throw barrel to the right
exports.throw_barrel(0, 15.0, -5.0);
```

---

### Queries

#### `get_barrel_count() -> int`

Get number of active barrels.

**Returns:** Barrel count (0-50 max)

---

#### `get_barrel_x(barrel_index: int) -> float`

Get barrel X position.

**Returns:** X coordinate (0.0-1.0) or 0.0 if invalid

---

#### `get_barrel_y(barrel_index: int) -> float`

Get barrel Y position.

**Returns:** Y coordinate (0.0-1.0) or 0.0 if invalid

---

#### `get_barrel_vel_x(barrel_index: int) -> float`

Get barrel X velocity.

**Returns:** Velocity in world units/sec

---

#### `get_barrel_vel_y(barrel_index: int) -> float`

Get barrel Y velocity.

**Returns:** Velocity in world units/sec

---

### Cleanup

#### `clear_all_barrels() -> void`

Remove all barrels from simulation.

---

## Performance Monitoring

### `get_physics_perf_ms() -> float`

Get last physics update time in milliseconds.

**Returns:** Time taken for last physics step (0.1-10.0ms typical)

**Example:**
```javascript
function update(dt) {
  exports.update(dt);
  
  const physicsTime = exports.get_physics_perf_ms();
  
  if (physicsTime > 5.0) {
    console.warn(`Physics taking ${physicsTime}ms - consider optimization`);
  }
}
```

**Use Cases:**
- Performance profiling
- Adaptive quality settings
- Debug overlays
- Performance budgeting

---

## JavaScript Integration Examples

### Basic Knockback System

```javascript
class CombatRenderer {
  constructor(wasmExports) {
    this.wasm = wasmExports;
  }
  
  onPlayerHit(attackerX, attackerY, damage) {
    // Calculate knockback direction
    const playerX = this.wasm.get_x();
    const playerY = this.wasm.get_y();
    
    const dirX = playerX - attackerX;
    const dirY = playerY - attackerY;
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Normalize and apply force
    if (length > 0) {
      const force = damage * 2.0; // Scale with damage
      this.wasm.apply_physics_knockback(
        (dirX / length) * force,
        (dirY / length) * force
      );
    }
    
    // Apply damage
    // ... game logic ...
  }
}
```

---

### Enemy Physics Management

```javascript
class EnemyManager {
  constructor(wasmExports) {
    this.wasm = wasmExports;
    this.enemies = [];
  }
  
  spawnEnemy(x, y, type) {
    // Find free slot
    const index = this.findFreeSlot();
    
    // Create physics body
    const mass = 70.0;
    const radius = 0.35;
    const bodyId = this.wasm.create_enemy_body(index, x, y, mass, radius);
    
    if (bodyId === 0) {
      console.error('Failed to create enemy body');
      return null;
    }
    
    // Track enemy
    const enemy = {
      index,
      bodyId,
      type,
      health: 100
    };
    
    this.enemies[index] = enemy;
    return enemy;
  }
  
  killEnemy(index) {
    // Destroy physics body
    this.wasm.destroy_enemy_body(index);
    
    // Clear tracking
    this.enemies[index] = null;
  }
  
  update() {
    // Sync positions from physics
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy) continue;
      
      const x = this.wasm.get_enemy_body_x(i);
      const y = this.wasm.get_enemy_body_y(i);
      
      // Render enemy at physics position
      this.renderEnemy(enemy, x, y);
    }
  }
}
```

---

### Barrel Throw System

```javascript
class BarrelSystem {
  constructor(wasmExports) {
    this.wasm = wasmExports;
  }
  
  spawnAndThrowBarrel(x, y, direction, power) {
    // Spawn barrel
    this.wasm.spawn_barrel(x, y);
    
    // Get barrel index (last spawned)
    const barrelCount = this.wasm.get_barrel_count();
    const barrelIndex = barrelCount - 1;
    
    // Apply throw velocity
    const throwSpeed = power * 20.0;
    this.wasm.throw_barrel(
      barrelIndex,
      direction.x * throwSpeed,
      direction.y * throwSpeed
    );
  }
  
  renderBarrels() {
    const count = this.wasm.get_barrel_count();
    
    for (let i = 0; i < count; i++) {
      const x = this.wasm.get_barrel_x(i);
      const y = this.wasm.get_barrel_y(i);
      const vx = this.wasm.get_barrel_vel_x(i);
      const vy = this.wasm.get_barrel_vel_y(i);
      
      // Render barrel with motion blur based on velocity
      const speed = Math.sqrt(vx * vx + vy * vy);
      this.drawBarrel(x, y, speed);
    }
  }
}
```

---

## Common Patterns

### Pattern 1: Apply Force Based on Attack

```javascript
function applyAttackKnockback(targetIndex, attackerX, attackerY, attackPower) {
  const targetX = exports.get_enemy_body_x(targetIndex);
  const targetY = exports.get_enemy_body_y(targetIndex);
  
  // Calculate direction
  const dx = targetX - attackerX;
  const dy = targetY - attackerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > 0.001) {
    const force = attackPower * 15.0;
    exports.apply_enemy_knockback(
      targetIndex,
      (dx / dist) * force,
      (dy / dist) * force
    );
  }
}
```

---

### Pattern 2: Enemy Charge Attack

```javascript
function chargeAtPlayer(enemyIndex) {
  const playerX = exports.get_x();
  const playerY = exports.get_y();
  
  // Lunge toward player with high force
  const lungeForce = 35.0;
  exports.apply_attack_lunge(enemyIndex, playerX, playerY, lungeForce);
}
```

---

### Pattern 3: Environmental Push

```javascript
function applyWindForce(bodyType, bodyIndex, windX, windY) {
  const windForce = 5.0; // Constant push
  
  if (bodyType === 'player') {
    exports.apply_physics_knockback(windX * windForce, windY * windForce);
  } else if (bodyType === 'enemy') {
    exports.apply_enemy_knockback(bodyIndex, windX * windForce, windY * windForce);
  }
}
```

---

## Troubleshooting

### Bodies Not Moving

**Symptoms:** Physics bodies remain static after applying force

**Causes:**
- Body is kinematic (set to static)
- Mass is too high (inverse mass too low)
- Force is too small
- Body is sleeping

**Solutions:**
```javascript
// Check body properties
const bodyId = exports.create_enemy_body(index, x, y, 70.0, 0.35);

// Apply sufficient force
exports.apply_enemy_knockback(index, 20.0, 0.0); // Not 2.0

// Wake body if sleeping
exports.set_enemy_body_position(index, x, y); // Resets sleep state
```

---

### Bodies Moving Too Fast

**Symptoms:** Bodies teleporting or passing through walls

**Causes:**
- Forces too large
- Timestep too long
- Missing collision resolution

**Solutions:**
```javascript
// Clamp forces
const MAX_FORCE = 50.0;
const clampedForceX = Math.min(Math.max(forceX, -MAX_FORCE), MAX_FORCE);

// Reduce force magnitude
exports.apply_physics_knockback(forceX * 0.5, forceY * 0.5);
```

---

### Jittery Movement

**Symptoms:** Bodies vibrate or stutter

**Causes:**
- Reading physics position without sync
- Mixing physics and non-physics movement
- Fixed timestep interpolation missing

**Solutions:**
```javascript
// Always sync before reading
exports.sync_player_position_from_physics();
const x = exports.get_x(); // Now stable
```

---

### Memory Leaks

**Symptoms:** Performance degrades over time

**Causes:**
- Not destroying bodies when enemies die
- Creating bodies repeatedly without cleanup

**Solutions:**
```javascript
// Always pair create with destroy
exports.destroy_enemy_body(enemyIndex);

// Periodic cleanup
exports.clear_all_enemy_bodies(); // On level transition
```

---

## Best Practices

### ✅ Do

- Call `sync_player_position_from_physics()` after `update()`
- Destroy bodies when entities are removed
- Use forces for smooth movement
- Clamp force magnitudes
- Monitor `get_physics_perf_ms()` regularly

### ❌ Don't

- Set positions directly for movement (breaks physics)
- Apply forces every frame for constant movement
- Mix physics and direct position updates
- Forget to create bodies for new enemies
- Apply extremely large forces (> 100.0)

---

## Related Documentation

- [Physics Architecture](./PHYSICS_ARCHITECTURE.md) - System design
- [Physics Optimization](./PHYSICS_OPTIMIZATION.md) - Performance tuning
- [WASM API Reference](../BUILD/API.md) - All WASM exports
- See `GUIDELINES/BUILD/API.md` and `GUIDELINES/SYSTEMS/PHYSICS_ARCHITECTURE.md` for integration details.

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintained by:** DozedEnt Development Team

