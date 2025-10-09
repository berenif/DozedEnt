# WASM API Reference - Canonical Documentation

**Last Updated:** January 2025  
**Module Version:** game.wasm v1.0 (139+ exports)  
**Status:** Production Ready

---

## 📋 Table of Contents
- [Overview](#overview)
- [Core Simulation](#core-simulation)
- [Player State](#player-state)
- [Player Combat](#player-combat)
- [Player Abilities](#player-abilities)
- [Physics System](#physics-system)
- [Enemy System](#enemy-system)
- [Game Phases](#game-phases)
- [Upgrade System](#upgrade-system)
- [Data Types](#data-types)

---

## Overview

This document provides the **canonical API surface** for the DozedEnt WASM game module. All functions listed here are exported from `game.wasm` and available to JavaScript.

### Architecture Principles
- **WASM-First**: All game logic lives in WASM
- **Deterministic**: Same seed + inputs = same output
- **Read-Only JS**: JavaScript only reads state, never modifies
- **Flat Data**: All exports are primitives (no complex objects)

### Convention
- **Parameters**: All numeric unless specified
- **Returns**: `float` for positions/ratios, `int` for counts/IDs/flags
- **Coordinates**: World space 0.0-1.0 for x/y positions
- **Time**: Seconds as float unless specified
- **Flags**: `1` for true, `0` for false

---

## Core Simulation

### `init_run(seed: bigint, start_weapon: int) -> void`
Initialize a new game run with deterministic seed.

**Parameters:**
- `seed`: 64-bit RNG seed (BigInt)
- `start_weapon`: Starting weapon ID (0-10)

**Example:**
```javascript
exports.init_run(BigInt(12345), 0);
```

---

### `reset_run(new_seed: bigint) -> void`
Instantly restart the game with a new seed.

**Parameters:**
- `new_seed`: New 64-bit RNG seed

**Example:**
```javascript
exports.reset_run(BigInt(Date.now()));
```

---

### `update(delta_time: float) -> void`
Main game tick - advances simulation by delta_time seconds.

**Parameters:**
- `delta_time`: Frame time in seconds (typically 0.016 for 60fps)

**Example:**
```javascript
exports.update(0.016);
```

---

### `start() -> void`
Start or resume the game simulation.

---

### `set_player_input(input_x: float, input_y: float, rolling: int, jumping: int, light_attack: int, heavy_attack: int, blocking: int, special: int) -> void`
Set player input state for the current frame.

**Parameters:**
- `input_x, input_y`: Movement input (-1.0 to 1.0)
- `rolling`: Roll/dodge flag (0 or 1)
- `jumping`: Jump flag (0 or 1)
- `light_attack`: Light attack flag (0 or 1)
- `heavy_attack`: Heavy attack flag (0 or 1)
- `blocking`: Block flag (0 or 1)
- `special`: Special ability flag (0 or 1)

**Example:**
```javascript
exports.set_player_input(0.5, 0.0, 0, 0, 1, 0, 0, 0); // Move right and light attack
```

---

## Player State

### Position & Movement

#### `get_x() -> float`
Get player X position (0.0-1.0).

#### `get_y() -> float`
Get player Y position (0.0-1.0).

#### `get_vel_x() -> float`
Get player X velocity.

#### `get_vel_y() -> float`
Get player Y velocity.

#### `get_speed() -> float`
Get current player speed magnitude.

#### `get_facing_x() -> float`
Get player facing direction X component (-1.0 to 1.0).

#### `get_facing_y() -> float`
Get player facing direction Y component (-1.0 to 1.0).

---

### Resources

#### `get_hp() -> float`
Get current health (0.0-1.0 normalized).

#### `get_stamina() -> float`
Get current stamina (0.0-1.0 normalized).

#### `get_gold() -> int`
Get current gold currency.

#### `get_essence() -> int`
Get current essence currency (for upgrades).

---

### State Flags

#### `get_is_grounded() -> int`
Check if player is on ground. Returns 1 if grounded, 0 if airborne.

#### `get_jump_count() -> int`
Get number of jumps performed (for double-jump tracking).

#### `get_is_wall_sliding() -> int`
Check if player is sliding on wall. Returns 1 if sliding, 0 otherwise.

#### `get_is_rolling() -> int`
Check if player is currently rolling/dodging.

#### `get_is_invulnerable() -> int`
Check if player has invulnerability frames active.

---

## Player Combat

### Attack State

#### `get_attack_state() -> int`
Get current attack state enum.

**Returns:**
- `0`: Idle
- `1`: Windup
- `2`: Active
- `3`: Recovery

#### `on_light_attack() -> void`
Execute light attack input.

#### `on_heavy_attack() -> void`
Execute heavy attack input.

#### `on_special_attack() -> void`
Execute special attack input.

#### `on_attack() -> void`
Generic attack execution (context-dependent).

---

### Defense

#### `get_roll_state() -> int`
Get current roll/dodge state.

#### `on_roll_start() -> void`
Initiate dodge roll.

#### `get_roll_cooldown() -> float`
Get remaining roll cooldown in seconds.

#### `set_blocking(is_blocking: int) -> void`
Set blocking state. Pass 1 to block, 0 to release.

#### `get_block_state() -> int`
Get current block state.

---

### Combat Timing

#### `get_combo_count() -> int`
Get current combo hit count.

#### `get_combo_window_remaining() -> float`
Get remaining time to continue combo (seconds).

#### `get_can_counter() -> int`
Check if counterattack is available.

#### `get_counter_window_remaining() -> float`
Get remaining counter window time (seconds).

#### `get_parry_window() -> float`
Get parry timing window duration (seconds).

#### `get_has_hyperarmor() -> int`
Check if player has hyperarmor (cannot be interrupted).

#### `get_armor_value() -> float`
Get current armor value (damage reduction multiplier).

#### `can_feint_heavy() -> int`
Check if heavy attack can be cancelled/feinted.

---

### Advanced Attack Handling

#### `handle_incoming_attack(damage: float, attacker_x: float, attacker_y: float) -> void`
Process incoming attack from enemy.

**Parameters:**
- `damage`: Damage amount
- `attacker_x, attacker_y`: Attacker position for knockback direction

---

## Player Abilities

### Warden: Bash

#### `start_charging_bash() -> void`
Begin charging bash ability.

#### `release_bash() -> void`
Release charged bash attack.

#### `get_bash_charge_level() -> float`
Get current charge level (0.0-1.0).

#### `is_bash_active() -> int`
Check if bash is currently executing.

#### `is_bash_charging() -> int`
Check if bash is currently charging.

#### `get_bash_targets_hit() -> int`
Get number of enemies hit by current bash.

#### `get_bash_hitbox_x() -> float`
Get bash hitbox X position.

#### `get_bash_hitbox_y() -> float`
Get bash hitbox Y position.

#### `get_bash_hitbox_radius() -> float`
Get bash hitbox radius.

#### `is_bash_hitbox_active() -> int`
Check if bash hitbox is currently active.

#### `check_bash_collision(enemy_x: float, enemy_y: float, enemy_radius: float) -> int`
Check if enemy collides with bash hitbox.

---

### Raider: Berserker Charge

#### `start_berserker_charge() -> void`
Initiate berserker charge ability.

#### `cancel_berserker_charge() -> void`
Cancel ongoing berserker charge.

#### `is_berserker_charge_active() -> int`
Check if berserker charge is active.

#### `get_berserker_charge_duration() -> float`
Get remaining charge duration (seconds).

#### `get_berserker_targets_hit() -> int`
Get number of enemies hit during charge.

#### `get_berserker_speed_multiplier() -> float`
Get current speed multiplier during charge.

#### `get_berserker_charge_dir_x() -> float`
Get charge direction X component.

#### `get_berserker_charge_dir_y() -> float`
Get charge direction Y component.

#### `is_berserker_unstoppable() -> int`
Check if charge has unstoppable property.

---

### Kensei: Flow Dash

#### `execute_flow_dash() -> void`
Execute flow dash ability.

#### `cancel_flow_dash() -> void`
Cancel ongoing flow dash.

#### `is_flow_dash_active() -> int`
Check if flow dash is active.

#### `get_flow_dash_duration() -> float`
Get remaining dash duration (seconds).

#### `get_flow_dash_combo_level() -> int`
Get current combo level for flow dash.

#### `get_dash_progress() -> float`
Get dash completion progress (0.0-1.0).

#### `is_dash_invulnerable() -> int`
Check if dash grants invulnerability.

#### `can_dash_cancel() -> int`
Check if dash can cancel into other actions.

---

## Physics System

### Player Physics

#### `apply_physics_knockback(force_x: float, force_y: float) -> void`
Apply knockback force to player.

**Parameters:**
- `force_x, force_y`: Force vector (world space)

#### `get_physics_player_x() -> float`
Get physics-driven player X position.

#### `get_physics_player_y() -> float`
Get physics-driven player Y position.

#### `get_physics_player_vel_x() -> float`
Get physics-driven player X velocity.

#### `get_physics_player_vel_y() -> float`
Get physics-driven player Y velocity.

#### `sync_player_position_from_physics() -> void`
Sync game-state player position with physics body.

---

### Enemy Physics

#### `create_enemy_body(enemy_index: int, x: float, y: float, mass: float, radius: float) -> int`
Create physics body for enemy.

**Parameters:**
- `enemy_index`: Enemy array index (0-31)
- `x, y`: Initial position (0.0-1.0)
- `mass`: Body mass in kg
- `radius`: Collision radius

**Returns:** Physics body ID (0 if failed)

#### `destroy_enemy_body(enemy_index: int) -> void`
Remove enemy's physics body.

#### `get_enemy_body_x(enemy_index: int) -> float`
Get enemy body X position from physics.

#### `get_enemy_body_y(enemy_index: int) -> float`
Get enemy body Y position from physics.

#### `apply_enemy_knockback(enemy_index: int, force_x: float, force_y: float) -> void`
Apply knockback force to enemy.

#### `apply_attack_lunge(enemy_index: int, target_x: float, target_y: float, force: float) -> void`
Apply lunge force toward target.

#### `set_enemy_body_position(enemy_index: int, x: float, y: float) -> void`
Directly set enemy physics body position.

#### `get_enemy_body_count() -> int`
Get number of active enemy physics bodies.

#### `clear_all_enemy_bodies() -> void`
Remove all enemy physics bodies.

---

### Barrel Physics

#### `spawn_barrel(x: float, y: float) -> void`
Spawn physics barrel at position.

#### `throw_barrel(barrel_index: int, vel_x: float, vel_y: float) -> void`
Apply throw velocity to barrel.

#### `get_barrel_count() -> int`
Get number of active barrels.

#### `get_barrel_x(barrel_index: int) -> float`
Get barrel X position.

#### `get_barrel_y(barrel_index: int) -> float`
Get barrel Y position.

#### `get_barrel_vel_x(barrel_index: int) -> float`
Get barrel X velocity.

#### `get_barrel_vel_y(barrel_index: int) -> float`
Get barrel Y velocity.

#### `clear_all_barrels() -> void`
Remove all barrels.

---

### Performance

#### `get_physics_perf_ms() -> float`
Get last physics update time in milliseconds.

---

## Enemy System

### Enemy Management

#### `spawn_wolf(x: float, y: float) -> int`
Spawn single wolf enemy.

**Returns:** Enemy index, or -1 if failed

#### `spawn_wolves(count: int) -> void`
Spawn multiple wolves in formation.

#### `clear_enemies() -> void`
Remove all enemies.

#### `get_wolf_count() -> int`
Get number of active wolves.

#### `get_enemy_count() -> int`
Get total number of active enemies.

---

### Enemy State

#### `get_enemy_x(enemy_index: int) -> float`
Get enemy X position.

#### `get_enemy_y(enemy_index: int) -> float`
Get enemy Y position.

#### `get_enemy_vx(enemy_index: int) -> float`
Get enemy X velocity.

#### `get_enemy_vy(enemy_index: int) -> float`
Get enemy Y velocity.

#### `get_enemy_type(enemy_index: int) -> int`
Get enemy type ID.

#### `get_enemy_state(enemy_index: int) -> int`
Get enemy AI state enum.

**Returns:**
- `0`: Idle
- `1`: Patrol
- `2`: Chase
- `3`: Attack
- `4`: Flee
- `5`: Dead

#### `get_enemy_role(enemy_index: int) -> int`
Get pack role enum.

**Returns:**
- `0`: None
- `1`: Alpha
- `2`: Beta
- `3`: Scout

#### `get_enemy_fatigue(enemy_index: int) -> float`
Get enemy fatigue level (0.0-1.0).

---

### Wolf-Specific

#### `get_wolf_x(enemy_index: int) -> float`
Get wolf X position (alias for get_enemy_x).

#### `get_wolf_y(enemy_index: int) -> float`
Get wolf Y position (alias for get_enemy_y).

#### `get_wolf_state(enemy_index: int) -> int`
Get wolf state (alias for get_enemy_state).

#### `get_wolf_health(enemy_index: int) -> float`
Get wolf health (0.0-1.0).

#### `get_wolf_facing_x(enemy_index: int) -> float`
Get wolf facing direction X.

#### `get_wolf_facing_y(enemy_index: int) -> float`
Get wolf facing direction Y.

#### `get_wolf_body_stretch(enemy_index: int) -> float`
Get body stretch animation value.

#### `get_wolf_head_pitch(enemy_index: int) -> float`
Get head pitch angle (radians).

#### `get_wolf_head_yaw(enemy_index: int) -> float`
Get head yaw angle (radians).

#### `get_wolf_tail_wag(enemy_index: int) -> float`
Get tail wag animation value.

---

### Enemy Actions

#### `damage_wolf(enemy_index: int, damage: float) -> void`
Apply damage to wolf.

#### `remove_wolf(enemy_index: int) -> void`
Remove specific wolf.

---

## Game Phases

### Phase Management

#### `get_phase() -> int`
Get current game phase.

**Returns:**
- `0`: Explore
- `1`: Fight
- `2`: Choose
- `3`: PowerUp
- `4`: Risk
- `5`: Escalate
- `6`: CashOut
- `7`: Reset

#### `force_phase_transition(target_phase: int) -> void`
Force transition to specific phase (debug/testing).

---

### Explore Phase

#### `get_room_count() -> int`
Get number of rooms cleared.

#### `get_current_biome() -> int`
Get current biome type.

#### `get_time_seconds() -> float`
Get elapsed game time in seconds.

---

### Choose Phase

#### `get_choice_count() -> int`
Get number of available choices.

#### `get_choice_id(choice_index: int) -> int`
Get choice ID at index.

#### `get_choice_type(choice_index: int) -> int`
Get choice type enum.

#### `get_choice_rarity(choice_index: int) -> int`
Get choice rarity (0=common, 1=rare, 2=legendary).

#### `get_choice_tags(choice_index: int) -> int`
Get choice tag bitfield.

#### `commit_choice(choice_id: int) -> void`
Select and apply choice.

#### `generate_choices() -> void`
Force choice generation (for testing).

---

### Risk Phase

#### `get_curse_count() -> int`
Get number of active curses.

#### `get_curse_type(curse_index: int) -> int`
Get curse type enum.

#### `get_curse_intensity(curse_index: int) -> float`
Get curse strength (0.0-1.0).

#### `get_risk_multiplier() -> float`
Get risk/reward multiplier.

#### `get_elite_active() -> int`
Check if elite enemy is spawned.

#### `escape_risk() -> void`
Exit risk phase with rewards.

---

### Escalate Phase

#### `get_escalation_level() -> float`
Get escalation difficulty (0.0-1.0).

#### `get_spawn_rate_modifier() -> float`
Get enemy spawn rate multiplier.

#### `get_miniboss_active() -> int`
Check if miniboss is present.

#### `get_miniboss_x() -> float`
Get miniboss X position.

#### `get_miniboss_y() -> float`
Get miniboss Y position.

#### `damage_miniboss(damage: float) -> void`
Apply damage to miniboss.

---

## Upgrade System

### Upgrade Management

#### `upgrade_create_system() -> void`
Initialize upgrade system.

#### `upgrade_set_tree(tree_data: string_ptr) -> void`
Set upgrade tree configuration (advanced).

#### `upgrade_set_state(state_data: string_ptr) -> void`
Set upgrade state (save/load).

#### `upgrade_get_state() -> string_ptr`
Get upgrade state for persistence.

---

### Essence & Purchases

#### `upgrade_get_essence() -> int`
Get available essence currency.

#### `upgrade_add_essence(amount: int) -> void`
Add essence to player (rewards/testing).

#### `upgrade_can_purchase(upgrade_id: int) -> int`
Check if upgrade can be purchased.

#### `upgrade_purchase(upgrade_id: int) -> int`
Purchase upgrade. Returns 1 if successful, 0 if failed.

#### `upgrade_reset_class() -> void`
Reset all upgrades for current class.

---

### Effect Queries

#### `upgrade_get_effect_scalar(effect_id: int) -> float`
Get multiplier for specific effect.

**Example:**
```javascript
// Get damage multiplier from upgrades
const damageBonus = exports.upgrade_get_effect_scalar(0);
const finalDamage = baseDamage * damageBonus;
```

---

## Data Types

### Common Enums

#### Phase
```
0 = Explore
1 = Fight
2 = Choose
3 = PowerUp
4 = Risk
5 = Escalate
6 = CashOut
7 = Reset
```

#### EnemyState
```
0 = Idle
1 = Patrol
2 = Chase
3 = Attack
4 = Flee
5 = Dead
```

#### EnemyRole
```
0 = None
1 = Alpha
2 = Beta
3 = Scout
```

#### AttackState
```
0 = Idle
1 = Windup
2 = Active
3 = Recovery
```

---

## Usage Examples

### Basic Game Loop
```javascript
import { loadWasm } from './utils/wasm.js';

const { exports } = await loadWasm('./wasm/game.wasm');

// Initialize
exports.init_run(BigInt(12345), 0);

// Game loop
function update(dt) {
  // Set input
  exports.set_player_input(inputX, inputY, 0, 0, 0, 0, 0, 0);
  
  // Update simulation
  exports.update(dt);
  
  // Read state
  const playerX = exports.get_x();
  const playerY = exports.get_y();
  const hp = exports.get_hp();
  const stamina = exports.get_stamina();
  
  // Render
  renderPlayer(playerX, playerY);
  renderUI(hp, stamina);
  
  requestAnimationFrame(update);
}
```

---

### Spawn and Manage Enemies
```javascript
// Spawn wolves
exports.spawn_wolves(5);

// Query wolf count
const count = exports.get_enemy_count();

// Get wolf positions
for (let i = 0; i < count; i++) {
  const x = exports.get_enemy_x(i);
  const y = exports.get_enemy_y(i);
  const health = exports.get_wolf_health(i);
  
  renderWolf(x, y, health);
}

// Damage specific wolf
exports.damage_wolf(0, 25.0);
```

---

### Using Character Abilities
```javascript
// Warden - Bash
if (bashInput && !exports.is_bash_charging()) {
  exports.start_charging_bash();
}

if (!bashInput && exports.is_bash_charging()) {
  exports.release_bash();
  
  const hitCount = exports.get_bash_targets_hit();
  console.log(`Bash hit ${hitCount} enemies!`);
}

// Raider - Berserker Charge
if (chargeInput && !exports.is_berserker_charge_active()) {
  exports.start_berserker_charge();
}

// Kensei - Flow Dash
if (dashInput) {
  exports.execute_flow_dash();
}
```

---

### Physics Integration
```javascript
// Apply knockback to player
exports.apply_physics_knockback(10.0, 5.0);

// Sync positions
exports.sync_player_position_from_physics();

// Get physics-driven position
const physX = exports.get_physics_player_x();
const physY = exports.get_physics_player_y();

// Spawn and throw barrel
exports.spawn_barrel(0.5, 0.5);
exports.throw_barrel(0, 5.0, -3.0);
```

---

## Best Practices

### Determinism
- Always use BigInt for seeds
- Never use `Math.random()` for gameplay
- Use fixed timesteps for physics
- Avoid floating-point accumulation errors

### Performance
- Batch state reads once per frame
- Minimize WASM/JS boundary calls
- Use cached values when possible
- Profile regularly with browser devtools

### Error Handling
- Check function return values
- Validate indices before queries
- Wrap WASM calls in try-catch
- Log errors with context

### Testing
- Test with same seed for reproducibility
- Validate determinism with replay system
- Check edge cases (0 enemies, max enemies, etc.)
- Profile performance under load

---

## Version History

### v1.0 (January 2025)
- 139+ exports in public/wasm/game.wasm
- Complete physics system with fixed-point math
- Three character classes with unique abilities
- Full 8-phase core loop
- Upgrade system with essence currency
- Enemy AI with pack behaviors

---

**For implementation details, see:**
- [WASM Feature Implementation Guide](../WASM_FEATURE_IMPLEMENTATION_GUIDE.md)
- [Physics Documentation](../SYSTEMS/PHYSICS_API.md)
- [Agent Development Guide](../AGENTS.md)
- [Build Instructions](../UTILS/BUILD_INSTRUCTIONS.md)

