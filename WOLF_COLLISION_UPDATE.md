# Wolf-to-Wolf Collision Update

**Date**: October 10, 2025  
**Status**: ✅ **IMPLEMENTED**

## Summary

Added collision detection between wolves to prevent them from overlapping and passing through each other.

## Problem

Previously, wolves could move through each other because their physics bodies were configured with a collision mask that excluded the `Enemy` collision layer. This meant wolves would only collide with:
- Player
- Environment (walls, obstacles)

But **NOT** with other wolves/enemies.

## Solution

Updated the wolf physics body creation in `PhysicsManager::create_wolf_body()` to include the `Enemy` layer in the collision mask.

### Code Changes

**File**: `public/src/wasm/physics/PhysicsManager.cpp`

**Before**:
```cpp
wolf_body.collision_mask = CollisionLayers::Player | CollisionLayers::Environment;
```

**After**:
```cpp
wolf_body.collision_mask = CollisionLayers::Player | CollisionLayers::Enemy | CollisionLayers::Environment;
```

## How It Works

### Collision Layer System

The game uses a bitmask-based collision layer system:
- Each body has a `collision_layer` (what layer it belongs to)
- Each body has a `collision_mask` (what layers it can collide with)

Two bodies collide if:
1. Body A's mask includes Body B's layer, AND
2. Body B's mask includes Body A's layer

### Wolf Collision Configuration

Wolves are now configured to:
- **Layer**: `Enemy` (they are enemies)
- **Mask**: `Player | Enemy | Environment` (they can collide with all these)

This means wolves will now:
- ✅ Collide with the player (for combat)
- ✅ Collide with other wolves (prevents overlap)
- ✅ Collide with environment (walls, obstacles)

## Additional Systems

The `WolfManager` also includes a **separation force** system (lines 1298-1330 in `WolfManager.cpp`) that provides additional smoothing to prevent wolves from clumping together too tightly:

```cpp
FixedVector3 WolfManager::calculate_separation_force(const Wolf& wolf) const {
    constexpr float SEPARATION_DISTANCE = 0.1f;  // Minimum distance between wolves
    constexpr float SEPARATION_STRENGTH = 0.05f;
    
    // Calculates a force that pushes wolves apart when they get too close
    // This works in conjunction with physics collision detection
}
```

This creates natural spacing between wolves during pack behavior.

## Build Information

- **WASM Module**: Rebuilt successfully
- **Output**: `public/wasm/game.wasm` (208.5 KB)
- **Exports**: 153 functions
- **Build Time**: ~5-10 seconds

## Testing

To test wolf-to-wolf collision:

1. Open the game in browser
2. Spawn multiple wolves using the spawn system
3. Observe that wolves:
   - Cannot pass through each other
   - Push each other slightly when moving
   - Maintain natural spacing during pack behavior
   - Still collide with player and environment

## Related Files

- `public/src/wasm/physics/PhysicsManager.cpp` - Physics body creation
- `public/src/wasm/physics/CollisionLayers.h` - Collision layer definitions
- `public/src/wasm/managers/WolfManager.cpp` - Wolf AI and separation forces
- `public/src/wasm/physics/PhysicsTypes.h` - RigidBody structure

## Technical Details

### Physics Integration

Wolves use the `PhysicsManager` for deterministic, fixed-point collision detection:

1. Each wolf has a `physics_body_id` that references a `RigidBody`
2. During `update_wolf_physics()`, the wolf's AI-driven velocity is applied to the physics body
3. The physics system resolves collisions and updates position
4. The resolved position/velocity is read back into the wolf's state

### Performance

Wolf-to-wolf collision detection is optimized:
- Uses sphere-sphere collision (simple and fast)
- Bodies can sleep when not moving (skips physics)
- Collision mask filtering reduces unnecessary checks

## Future Enhancements

Potential improvements for wolf collision behavior:

1. **Dynamic Collision Radius**: Adjust wolf collision radius based on state (crouched when attacking)
2. **Pack Formation**: Use collision to maintain specific pack formations
3. **Collision Response**: Different collision responses based on wolf emotion/state
4. **Collision Events**: Trigger pack communication when wolves collide

---

**Status**: ✅ Production Ready  
**Last Updated**: October 10, 2025  
**Version**: 1.0

