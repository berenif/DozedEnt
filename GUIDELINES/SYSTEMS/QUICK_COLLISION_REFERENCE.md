# Quick Collision Reference

## Collision Damage Table

| Wolf State | Player State | Damage | Notes |
|-----------|-------------|--------|-------|
| **Attack** | Not Blocking | **15 HP** | Full attack damage |
| **Attack** | Blocking (front) | **3 HP** | 80% damage reduction |
| **Attack** | Blocking (back) | **15 HP** | Can't block from behind |
| **Idle/Patrol** | Not Blocking | **5-10 HP** | Scales with collision force |
| **Idle/Patrol** | Blocking (front) | **1-2 HP** | Minimal damage |
| **Strafe** | Not Blocking | **8-12 HP** | Movement collision |

## Code Locations

### Main Implementation
```
public/src/wasm/coordinators/GameCoordinator.cpp
  - process_collision_events()        (line ~225)
  - handle_player_wolf_collision()    (line ~265)
```

### Configuration
```cpp
// In GameCoordinator.cpp:handle_player_wolf_collision()

float base_damage = 5.0f;           // Base collision damage
float impulse_scale = 0.5f;          // Impulse multiplier
float max_damage = 50.0f;            // Damage cap
float block_reduction = 0.2f;        // Block damage multiplier
float block_cone_dot = 0.5f;         // Block cone angle (60°)
float block_stamina_cost = 0.1f;    // Stamina per block
```

## Quick Test

1. **Build WASM**: `npm run wasm:build`
2. **Open Demo**: `public/demos/player-wolf-collision-test.html`
3. **Spawn Wolf**: Click button
4. **Test Block**: Hold Space while facing wolf

## Debug Commands

```javascript
// In browser console with WASM loaded

// Get collision event count
wasmInstance.exports.physics_get_event_count()

// Get physics performance
wasmInstance.exports.get_physics_perf_ms()

// Get player health
wasmInstance.exports.get_player_health()

// Spawn wolf at position
wasmInstance.exports.spawn_wolf(0.5, 0.5, 0) // x, y, type
```

## Common Issues

### "No damage on collision"
- Check: `physics_get_event_count() > 0`
- Verify: Wolf has `physics_body_id > 0`
- Check: Collision masks include Player layer

### "Too much damage"
- Reduce: `base_damage` value
- Reduce: `impulse_scale` multiplier
- Lower: `max_damage` cap

### "Block not working"
- Verify: `is_blocking` flag is true
- Check: Player facing direction updated
- Increase: `block_cone_dot` threshold

## Performance Monitoring

```javascript
// Monitor collision processing
setInterval(() => {
    const events = wasmInstance.exports.physics_get_event_count();
    console.log(`Collision events: ${events}`);
}, 1000);
```

## Extending the System

### Add Collision Cooldown
```cpp
// In Wolf struct, add:
float last_collision_time = 0.0f;

// In handle_player_wolf_collision():
float current_time = game_state_manager_.get_game_time();
if (current_time - wolf->last_collision_time < 0.5f) {
    return; // Skip if collision too recent
}
wolf->last_collision_time = current_time;
```

### Add Knockback
```cpp
// After damage calculation:
Fixed knockback_force = Fixed::from_float(100.0f);
FixedVector3 knockback_dir(
    Fixed::from_float(player_x - wolf_x),
    Fixed::from_float(player_y - wolf_y),
    Fixed::from_int(0)
);
knockback_dir = knockback_dir.normalized();
physics_manager_.apply_impulse(
    PLAYER_BODY_ID,
    knockback_dir * knockback_force
);
```

### Add Sound Effects
```cpp
// In handle_player_wolf_collision():
if (blocked) {
    // Trigger block sound
    coordinator_->get_audio_manager().play_sound("block");
} else {
    // Trigger hit sound
    coordinator_->get_audio_manager().play_sound("hit");
}
```

---

**Quick Reference v1.0**  
**Last Updated**: October 10, 2025

