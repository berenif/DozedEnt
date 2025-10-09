# Balance Data Reference

This directory contains all game balance data in JSON format. Values are loaded by the WASM game module and can be adjusted without recompiling.

## 📋 Table of Contents
- [Overview](#overview)
- [File Structure](#file-structure)
- [Player Balance](#player-balance)
- [Enemy Balance](#enemy-balance)
- [Physics Balance](#physics-balance)
- [Upgrade Economy](#upgrade-economy)
- [Tuning Guide](#tuning-guide)
- [Testing Balance Changes](#testing-balance-changes)

---

## Overview

Balance data is separated into logical domains to enable independent tuning. All values are read-only at runtime and require a game restart to take effect.

### Design Principles
- **Data-Driven**: Gameplay values externalized from code
- **Tunable**: Easy to adjust without programming knowledge
- **Documented**: Each value includes context and units
- **Testable**: Changes can be validated with automated tests

---

## File Structure

```
data/balance/
├── README.md          # This file
├── player.json        # Player movement, stamina, combat
├── enemies.json       # Enemy AI, spawning, pack behavior
├── physics.json       # Physics simulation parameters
└── upgrades.json      # Upgrade costs and effects
```

---

## Player Balance

**File:** `player.json`

### Movement
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `baseSpeed` | 0.6 | units/sec | Normal walking speed |
| `rollSpeedMultiplier` | 2.6 | multiplier | Roll speed relative to base |
| `acceleration` | 12.0 | units/sec² | Movement responsiveness |
| `friction` | 9.0 | units/sec² | Deceleration rate |

**Tuning:**
- Increase `baseSpeed` for faster gameplay
- Increase `acceleration` for more responsive controls
- Decrease `friction` for "slippery" feel

---

### Stamina
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `regenPerSec` | 0.35 | fraction/sec | Passive stamina regeneration |
| `rollStartCost` | 0.15 | fraction | Instant cost to start roll |
| `blockDrainPerSec` | 0.25 | fraction/sec | Stamina drain while blocking |

**Tuning:**
- Increase `regenPerSec` for more forgiving stamina management
- Increase `rollStartCost` to discourage spam rolling
- Balance `blockDrainPerSec` with enemy attack frequency

---

### Combat Timing
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `parryWindow` | 0.12 | seconds | Perfect parry timing window |
| `rollIFrameDuration` | 0.3 | seconds | Invulnerability during roll |
| `attackCooldown` | 0.25 | seconds | Time between attacks |

**Tuning:**
- Larger `parryWindow` makes combat more forgiving
- Longer `rollIFrameDuration` makes dodging easier
- Shorter `attackCooldown` increases DPS

---

### Attack Properties
| Attack Type | Windup | Active | Recovery | Damage |
|-------------|--------|--------|----------|--------|
| Light | 0.05s | 0.08s | 0.12s | 15 |
| Heavy | 0.15s | 0.12s | 0.25s | 35 |
| Special | 0.10s | 0.15s | 0.20s | 25 |

**Tuning:**
- Increase windup for more telegraphed attacks
- Increase recovery to add risk to missed attacks
- Balance damage relative to attack speed

---

## Enemy Balance

**File:** `enemies.json`

### Wolf AI
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `baseSpeed` | 0.18 | units/sec | Normal movement speed |
| `maxSpeed` | 0.26 | units/sec | Maximum speed (sprinting) |
| `lungeSpeed` | 0.42 | units/sec | Attack lunge speed |
| `seekRange` | 0.45 | units | Detection range |

**Tuning:**
- Increase `baseSpeed` for more aggressive enemies
- Increase `seekRange` for earlier engagement
- Adjust `lungeSpeed` to change attack dodge difficulty

---

### Pack Behavior
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `maxPacks` | 3 | count | Maximum simultaneous packs |
| `respawnDelay` | 5.0 | seconds | Time before pack respawns |
| `commRange` | 0.3 | units | Pack communication range |

**Tuning:**
- Increase `maxPacks` for higher difficulty
- Decrease `respawnDelay` for relentless pressure
- Increase `commRange` for better pack coordination

---

### Fatigue System
| Parameter | Value | Description |
|-----------|-------|-------------|
| `fatiguePerSpeed` | 0.08 | Fatigue gain per speed unit |
| `fatigueRecoveryPerSec` | 0.2 | Recovery rate when idle |
| `fatigueLungeBonus` | 0.15 | Lunge cooldown reduction when rested |

**Tuning:**
- Increase `fatiguePerSpeed` to punish aggressive enemies
- Increase recovery for less fatigue impact
- Adjust lunge bonus to reward wolf stamina management

---

## Physics Balance

**File:** `physics.json`

### Simulation Parameters
| Parameter | Value | Unit | Description |
|-----------|-------|------|-------------|
| `timestepMicros` | 8333 | microseconds | Fixed timestep (120 Hz) |
| `maxIterations` | 4 | count | Max substeps per frame |
| `maxVelocity` | 50.0 | units/sec | Velocity clamp |

**Tuning:**
- Decrease `timestepMicros` for smoother physics (higher CPU cost)
- Increase `maxIterations` to handle lag spikes better
- Adjust `maxVelocity` to prevent extreme knockbacks

---

### Body Properties
| Entity | Mass (kg) | Radius | Drag | Restitution |
|--------|-----------|--------|------|-------------|
| Player | 70.0 | 0.5 | 0.88 | 0.3 |
| Enemy | 70.0 | 0.35 | 0.9 | 0.4 |
| Barrel | 40.0 | 0.25 | 0.9 | 0.5 |

**Tuning:**
- Increase mass to reduce knockback susceptibility
- Increase drag for faster stopping
- Increase restitution for bouncier collisions

---

### Knockback Forces
| Source | Force | Notes |
|--------|-------|-------|
| Light Attack | 15.0 | Standard attack |
| Heavy Attack | 30.0 | Telegraphed, high impact |
| Bash | 50.0 | Warden special |
| Parry | 20.0 | Counterattack |

**Tuning:**
- Scale all forces proportionally for consistent feel
- Balance forces relative to body masses
- Consider force * mass = knockback velocity

---

### Sleep System
| Parameter | Value | Description |
|-----------|-------|-------------|
| `velocityThreshold` | 0.01 | Speed below which body can sleep |
| `timeThresholdMicros` | 500000 | Time below threshold before sleeping (0.5s) |
| `wakeVelocity` | 0.1 | Minimum velocity to wake body |

**Tuning:**
- Increase `velocityThreshold` for more aggressive sleeping
- Decrease `timeThresholdMicros` for faster optimization
- Adjust `wakeVelocity` to prevent premature waking

---

## Upgrade Economy

**File:** `upgrades.json`

### Essence Currency
| Source | Essence | Notes |
|--------|---------|-------|
| Room Clear | 10 | Base reward |
| Elite Kill | 25 | Rare enemy |
| Boss Kill | 100 | Major milestone |
| Choice Rejected | 5 | Reward for skipping |

**Tuning:**
- Increase room clear reward for faster progression
- Balance elite/boss rewards relative to difficulty
- Adjust rejection reward to encourage strategic choices

---

### Upgrade Tiers
| Tier | Cost | Effect Multiplier | Requirements |
|------|------|-------------------|--------------|
| 1 | 50 essence | 1.1x | None |
| 2 | 100 essence | 1.25x | Tier 1 |
| 3 | 200 essence | 1.5x | Tier 2 |
| 4 | 400 essence | 2.0x | Tier 3 |

**Tuning:**
- Adjust costs to control progression speed
- Scale effect multipliers for balanced power curve
- Consider exponential cost growth for long runs

---

### Upgrade Categories

#### Combat Upgrades
- **Damage:** +10% per tier (max 4 tiers)
- **Attack Speed:** +8% per tier (max 4 tiers)
- **Crit Chance:** +5% per tier (max 3 tiers)
- **Crit Multiplier:** +25% per tier (max 3 tiers)

#### Defense Upgrades
- **Max Health:** +25 HP per tier (max 4 tiers)
- **Armor:** +5 per tier (max 4 tiers)
- **Block Efficiency:** +10% per tier (max 3 tiers)
- **Dodge Chance:** +5% per tier (max 3 tiers)

#### Mobility Upgrades
- **Move Speed:** +10% per tier (max 3 tiers)
- **Roll Distance:** +15% per tier (max 3 tiers)
- **Roll Cooldown:** -10% per tier (max 3 tiers)
- **Stamina Regen:** +20% per tier (max 4 tiers)

#### Utility Upgrades
- **Gold Find:** +15% per tier (max 3 tiers)
- **Essence Find:** +20% per tier (max 3 tiers)
- **Healing Efficiency:** +15% per tier (max 3 tiers)
- **Curse Resistance:** +10% per tier (max 3 tiers)

**Tuning:**
- Balance per-tier bonuses across categories
- Consider diminishing returns for high tiers
- Ensure no single upgrade path dominates

---

### Class-Specific Upgrades

#### Warden (Tank)
- **Bash Damage:** Tier 2, 100 essence, 1.5x effect
- **Bash Radius:** Tier 2, 100 essence, 1.3x radius
- **Bash Cooldown:** Tier 3, 200 essence, 0.7x cooldown
- **Shield Mastery:** Tier 4, 400 essence, 2.0x block power

#### Raider (Bruiser)
- **Charge Duration:** Tier 2, 100 essence, 1.5x duration
- **Charge Speed:** Tier 2, 100 essence, 1.3x speed
- **Charge Armor:** Tier 3, 200 essence, 2.0x armor during charge
- **Berserker Rage:** Tier 4, 400 essence, 2.5x damage

#### Kensei (Assassin)
- **Dash Invulnerability:** Tier 2, 100 essence, 1.5x duration
- **Dash Combo:** Tier 2, 100 essence, 1.4x combo damage
- **Dash Cooldown:** Tier 3, 200 essence, 0.6x cooldown
- **Flow Mastery:** Tier 4, 400 essence, 3.0x special damage

**Tuning:**
- Ensure class identity remains distinct
- Balance tier 4 upgrades as "build-defining"
- Consider synergies between upgrades

---

### Reset System
| Parameter | Value | Description |
|-----------|-------|-------------|
| `baseGold` | 100 | Base gold cost to reset |
| `perUpgrade` | 50 | Additional cost per upgrade |
| `essenceRefundPercent` | 0.8 | Essence refund (80%) |

**Tuning:**
- Increase reset cost to discourage experimentation
- Increase refund percent to encourage build pivots
- Balance gold cost relative to earning rate

---

## Tuning Guide

### Before Changing Values
1. **Document Current Behavior:** Record gameplay feel, player feedback
2. **Identify Problem:** Too easy/hard, too fast/slow, unfun mechanic
3. **Hypothesize Solution:** Which values affect the problem?
4. **Make Small Changes:** 10-20% adjustments, not 2x changes

### Testing Changes
1. **Playtest:** Manual testing with specific scenarios
2. **Golden Tests:** Run deterministic replay tests
3. **Performance Tests:** Verify no performance regressions
4. **Player Feedback:** Gather subjective opinions

### Common Tuning Patterns

#### Making Combat Easier
- Increase player damage (`lightAttack.damage`, `heavyAttack.damage`)
- Increase stamina regen (`stamina.regenPerSec`)
- Increase parry window (`timing.parryWindow`)
- Decrease enemy speed (`enemy.baseSpeed`)

#### Making Combat Harder
- Decrease player damage
- Increase enemy health/count
- Decrease stamina regen
- Increase enemy aggression (`enemy.feintProb`, `enemy.lungeSpeed`)

#### Speeding Up Gameplay
- Increase movement speeds (`player.baseSpeed`, `enemy.baseSpeed`)
- Decrease attack timings (windup, recovery)
- Increase physics knockback forces

#### Slowing Down Gameplay
- Decrease speeds
- Increase attack timings
- Add more recovery frames
- Increase costs (stamina, cooldowns)

---

## Testing Balance Changes

### Automated Tests

```bash
# Run golden test with new values
npm run test:golden

# Performance test
npm run test:performance

# Full unit test suite
npm run test:unit
```

### Manual Testing Scenarios

1. **Early Game (Room 1-3):**
   - Can player survive with minimal upgrades?
   - Is learning curve appropriate?

2. **Mid Game (Room 4-7):**
   - Does difficulty scale properly?
   - Are upgrade choices meaningful?

3. **Late Game (Room 8+):**
   - Is endgame challenging but fair?
   - Do builds feel powerful?

4. **Boss Fights:**
   - Is there a skill ceiling?
   - Can skilled players no-hit?

5. **Multiplayer:**
   - Does co-op trivialize difficulty?
   - Do classes synergize?

---

## Version History

### v1.0 (January 2025)
- Initial balance data externalization
- Player, enemy, physics, upgrade systems
- Documented tuning guidelines

### Planned (v1.1)
- Boss-specific balance data
- Biome difficulty scaling
- Weather/hazard parameters
- Achievement thresholds

---

## Related Documentation

- [WASM API Reference](../../GUIDELINES/BUILD/API.md) - How values are loaded
- [Physics Architecture](../../GUIDELINES/SYSTEMS/PHYSICS_ARCHITECTURE.md) - Physics system details
- [Upgrade System](../../GUIDELINES/SYSTEMS/UPGRADE_SYSTEM.md) - Upgrade implementation
- [Testing Guide](../../GUIDELINES/BUILD/TESTING.md) - Validation procedures

---

**Maintained by:** DozedEnt Development Team  
**Last Updated:** January 2025

