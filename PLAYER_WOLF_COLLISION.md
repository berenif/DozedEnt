# Player-Wolf Collision System

**Date**: October 10, 2025  
**Status**: ✅ **IMPLEMENTED**

## Summary

Added collision response system that allows wolves to deal damage to the player when they collide. The system processes physics collision events and applies appropriate game logic based on collision context.

## Problem

Previously, while the physics system was detecting collisions between wolves and the player (separation and bounce), there was no game logic responding to these collisions. Wolves could physically collide with the player but wouldn't deal any damage.

## Solution

Implemented a collision event processing system in `GameCoordinator` that:
1. Processes collision events from the physics system each frame
2. Identifies player-wolf collisions
3. Applies damage based on collision context (wolf state, impulse magnitude)
4. Respects player blocking mechanics

### Code Changes

**Files Modified**:
- `public/src/wasm/coordinators/GameCoordinator.h`
- `public/src/wasm/coordinators/GameCoordinator.cpp`

**New Methods**:
```cpp
void GameCoordinator::process_collision_events()
void GameCoordinator::handle_player_wolf_collision(uint32_t wolf_body_id, float impulse_magnitude)
```

## How It Works

### 1. Collision Event Flow

```
PhysicsManager
    ↓ (detects collision)
CollisionEvent → PhysicsEventQueue
    ↓ (processed each frame)
GameCoordinator::process_collision_events()
    ↓ (identifies player-wolf collision)
GameCoordinator::handle_player_wolf_collision()
    ↓ (calculates damage)
PlayerManager::take_damage()
```

### 2. Collision Event Processing

During each game update:
1. **Physics Update**: PhysicsManager detects collisions and generates `CollisionEvent` objects
2. **Event Queue**: Events are pushed to `PhysicsEventQueue` (capacity: 256 events)
3. **Event Processing**: `GameCoordinator::process_collision_events()` reads and processes all events
4. **Collision Response**: When a player-wolf collision is detected, `handle_player_wolf_collision()` is called
5. **Event Cleanup**: All processed events are cleared from the queue

### 3. Damage Calculation

The damage dealt by wolf collisions depends on several factors:

#### Wolf State
- **Attacking Wolf**: Deals full attack damage (from wolf's `damage` stat, typically 15 HP)
- **Non-Attacking Wolf**: Deals collision damage based on impulse magnitude

#### Impulse Scaling
For non-attacking wolves:
```cpp
float base_damage = 5.0f;
float impulse_scale = impulse_magnitude * 0.5f;
float damage = base_damage * (1.0f + impulse_scale);
```

#### Damage Range
- Minimum: 1 HP
- Maximum: 50 HP
- Typical non-attacking collision: 5-15 HP
- Attacking wolf: 15-20 HP (based on wolf's damage stat)

### 4. Block Mechanics

Players can block wolf collisions if:
1. Player is actively blocking (`is_blocking = true`)
2. Wolf is in front of player (within ~60° cone)

**Block Effectiveness**:
- Absorbs 80% of damage (player takes only 20%)
- Consumes 0.1 stamina per blocked collision
- Uses dot product to check if wolf is in front:
  ```cpp
  float dot = direction_to_wolf · player_facing_direction
  if (dot > 0.5f) { /* Block is effective */ }
  ```

### 5. Collision Types

The system handles different collision scenarios:

| Wolf State | Player State | Damage | Notes |
|-----------|-------------|--------|-------|
| Attack | Not Blocking | Full (15 HP) | Wolf's attack connects |
| Attack | Blocking (front) | Reduced (3 HP) | Successful block |
| Attack | Blocking (back) | Full (15 HP) | Cannot block from behind |
| Idle/Patrol | Not Blocking | Low (5-10 HP) | Bump damage |
| Idle/Patrol | Blocking (front) | Minimal (1-2 HP) | Blocked bump |
| Strafe/Approach | Not Blocking | Medium (8-12 HP) | Movement collision |

## Integration with Wolf AI

The collision system integrates with wolf AI:

### Successful Attacks
When a wolf in Attack state collides with the player:
```cpp
if (colliding_wolf->state == WolfState::Attack) {
    colliding_wolf->successful_attacks++;
}
```

This tracks successful attacks for:
- Adaptive difficulty system
- Wolf emotional state (confidence/frustration)
- Pack coordination bonuses

### Attack Telegraphing
Wolves telegraph attacks before collision:
1. **Anticipation Phase** (0.3s): Wolf crouches, body_stretch = 0.7
2. **Execute Phase** (0.2s): Wolf lunges, body_stretch = 1.3
3. **Collision Window**: Damage is dealt during execute phase
4. **Recovery Phase** (0.3s): Wolf recovers, body_stretch = 1.0

## Performance Considerations

### Event Queue Management
- **Capacity**: 256 collision events per frame
- **Overflow Handling**: Oldest events are overwritten when full
- **Cleanup**: Queue is cleared after processing each frame
- **Processing Cost**: O(n * m) where n = events, m = wolves (typically < 10)

### Optimization Strategies
1. **Early Exit**: Skip non-player collisions immediately
2. **Wolf Lookup**: Cache wolf count to avoid repeated queries
3. **Distance Checks**: Use squared distance when possible
4. **Event Batching**: Process all events in single pass

## Testing

### Manual Testing
1. Open game in browser
2. Spawn a wolf using the spawn system
3. Let wolf approach and attack
4. Observe:
   - Player health decreases on collision
   - Attacking wolves deal more damage
   - Blocking reduces damage
   - Collision impulse affects damage magnitude

### Expected Behavior
- **Idle Wolf Bump**: 5-10 HP damage
- **Attacking Wolf (no block)**: 15 HP damage
- **Attacking Wolf (blocked)**: 3 HP damage
- **Multiple Wolves**: Each collision is processed separately

### Debug Info
Check console for collision events:
```javascript
// JavaScript console
wasmInstance.exports.physics_get_event_count()  // Get collision count
```

## Related Systems

### Physics System
- **PhysicsManager**: Detects sphere-sphere collisions
- **Collision Layers**: Player (layer 1) vs Enemy (layer 2)
- **Collision Masks**: Configured for player-wolf interaction
- **Impulse Calculation**: Based on relative velocity and mass

### Wolf AI System
- **WolfManager**: Manages wolf behavior and attacks
- **Attack States**: Anticipation → Execute → Recovery
- **Emotional AI**: Tracks successful/failed attacks
- **Pack Coordination**: Multiple wolves can attack simultaneously

### Combat System
- **CombatManager**: Handles player blocking state
- **Block Window**: Player must face attacker
- **Stamina Cost**: Blocking consumes stamina
- **Block Feedback**: Reduce damage and track blocks

## Future Enhancements

### Short-term Improvements
1. **Collision Cooldown**: Prevent damage-over-time from prolonged contact
2. **Knockback Direction**: Apply knockback based on collision normal
3. **Hit Reactions**: Trigger player stagger/flinch animations
4. **Sound Effects**: Play collision sounds based on impact force

### Medium-term Enhancements
1. **Collision Types**: Different damage for bite vs body slam
2. **Wolf Attack Variety**: Different attack patterns with unique collision profiles
3. **Player Dodging**: i-frames during roll to avoid collision damage
4. **Counter-Attack Window**: Perfect block allows instant counter

### Long-term Enhancements
1. **Environment Collisions**: Wolves can slam player into walls for bonus damage
2. **Pack Collision Tactics**: Coordinated collisions from multiple wolves
3. **Collision Prediction**: AI anticipates player movement for better attacks
4. **Dynamic Hitboxes**: Attack-specific hitbox shapes and sizes

## Configuration

### Tunable Parameters

**Damage Values** (in GameCoordinator.cpp):
```cpp
float base_damage = 5.0f;           // Base collision damage
float impulse_scale = 0.5f;          // Impulse contribution to damage
float max_damage = 50.0f;            // Damage cap
float block_reduction = 0.2f;        // Block damage multiplier (20%)
float block_cone_dot = 0.5f;         // Block cone angle (~60°)
float block_stamina_cost = 0.1f;    // Stamina consumed per block
```

**Wolf Attack Damage** (in wolf stats):
```cpp
wolf.base_damage = 15.0f;           // Standard wolf attack
wolf.damage *= emotion_modifier;     // Modified by emotional state
```

## Build Information

- **WASM Module**: Successfully rebuilt
- **Output**: `public/wasm/game.wasm` (215.4 KB)
- **Exports**: 153 functions
- **Build Time**: ~10-15 seconds

## Related Files

- `public/src/wasm/coordinators/GameCoordinator.h` - Collision processing declaration
- `public/src/wasm/coordinators/GameCoordinator.cpp` - Collision processing implementation
- `public/src/wasm/physics/PhysicsManager.cpp` - Collision detection
- `public/src/wasm/physics/PhysicsEvents.h` - Collision event structure
- `public/src/wasm/managers/WolfManager.cpp` - Wolf AI and attack logic
- `public/src/wasm/managers/PlayerManager.cpp` - Player damage handling
- `public/src/wasm/managers/CombatManager.cpp` - Block state management

## Technical Details

### Collision Event Structure
```cpp
struct CollisionEvent {
    uint32_t bodyA;           // First body ID (0 = player)
    uint32_t bodyB;           // Second body ID (wolf physics body)
    float nx, ny, nz;         // Collision normal (direction)
    float px, py, pz;         // Contact point (world space)
    float impulse;            // Impulse magnitude (force)
};
```

### Player Body Configuration
```cpp
// Player body (ID 0, Kinematic)
collision_layer = CollisionLayers::Player;
collision_mask = CollisionLayers::Enemy | CollisionLayers::Environment;
mass = 70 kg
radius = 0.05 (5% of world space)
```

### Wolf Body Configuration
```cpp
// Wolf body (Dynamic)
collision_layer = CollisionLayers::Enemy;
collision_mask = CollisionLayers::Player | CollisionLayers::Enemy | CollisionLayers::Environment;
mass = 50 kg
radius = ~0.04-0.06 (varies by wolf type)
```

## Troubleshooting

### Issue: No Damage on Collision

**Possible Causes**:
1. Collision events not being generated
2. Wolf physics body not created
3. Collision layer masks incorrect

**Solutions**:
```cpp
// Check collision event count
int event_count = physics_get_event_count();

// Verify wolf has physics body
const Wolf* wolf = wolf_manager.get_wolf(0);
assert(wolf->physics_body_id > 0);

// Check collision masks
const RigidBody* body = physics_manager.get_body(wolf->physics_body_id);
assert(body->collision_mask & CollisionLayers::Player);
```

### Issue: Too Much Damage

**Possible Causes**:
1. Multiple collision events per frame
2. Impulse scaling too high
3. No collision cooldown

**Solutions**:
- Add per-wolf collision cooldown timer
- Reduce impulse_scale multiplier
- Clamp damage to lower maximum

### Issue: Blocks Not Working

**Possible Causes**:
1. Player facing direction not updated
2. Block state not set correctly
3. Dot product threshold too strict

**Solutions**:
- Verify player facing direction updates with input
- Check `is_blocking` flag in CombatManager
- Increase block_cone_dot threshold (less strict)

---

**Status**: ✅ Production Ready  
**Last Updated**: October 10, 2025  
**Version**: 1.0

