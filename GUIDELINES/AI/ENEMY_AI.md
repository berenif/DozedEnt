# 👾 Enemy AI Template

<div align="center">
  <h2>Modular Enemy Behavior System</h2>
  <p><strong>Reusable states • Adaptive tuning • Memory & emotions • Team tactics • Terrain-aware</strong></p>
</div>

---

## 🎯 Purpose

This document defines a generic, reusable template for implementing enemy AI across different enemy types. It is inspired by the Wolf AI but abstracted to fit solo enemies, squads, and bosses. Use this as a blueprint to design consistent, scalable, and performant enemy behaviors.

## 🔑 Core Concepts

- **State Machine First**: Clear, minimal states with explicit transitions.
- **Attributes Drive Behavior**: Enemy traits (aggression, intelligence, morale, stamina) modulate decision-making.
- **Learning & Memory**: Track player tendencies to adapt attacks and defenses.
- **Adaptive Difficulty**: Scale parameters based on observed player skill.
- **Environmental Awareness**: Leverage terrain features for positioning and tactics.
- **Communication (Optional)**: For group enemies, support role assignment and signals.

## 🧱 Recommended States

Start from these and customize per enemy:

- `Idle` – Passive scanning, recover stamina.
- `Patrol` – Waypoint movement, low alertness.
- `Investigate` – Move toward stimulus (sound/vision).
- `Alert` – Target acquired; evaluate range, terrain, allies.
- `Approach` – Close distance using cover/angles.
- `Strafe` – Maintain optimal range, probe with feints.
- `Attack` – Execute primary/secondary attacks based on openings.
- `Combo` (optional) – Chained attacks with risk/reward.
- `Retreat` – Disengage to heal, regroup, or bait.
- `Recover` – After stagger/whiff; defend or reposition.
- `Flee` (optional) – Break contact when morale is low.

State set should remain small; prefer parameterization over new states.

## 🧩 Roles (for Groups)

- `Leader` – Calls synchronized actions, sets focus target.
- `Bruiser` – Pressure and space control.
- `Skirmisher` – Harass, bait, flank.
- `Support` – Debuff, block lines, provide openings.
- `Scout` – Vision, lure, mark targets.

Assign roles dynamically from attributes and context (health, stamina, distance, line-of-sight).

## 📊 Attributes

- `aggression` (0–1): Attack frequency, risk tolerance.
- `intelligence` (0–1): Tactics, terrain use, feints, prediction.
- `coordination` (0–1): Team timing and spacing (groups only).
- `morale` (0–1): Confidence; gates retreat/flee and bravery.
- `stamina` (0–1): Gated actions, recovery windows.
- `awareness` (0–1): Perception radius, reaction latency.

Tune per archetype (e.g., grunt vs elite vs boss) and clamp during runtime adjustments.

## 🧠 Memory & Learning

Track compact, actionable signals:

- Player dodge timing and direction tendencies.
- Block/parry frequency and last timestamps.
- Preferred attack angles that landed.
- Player reaction time approximation.
- Recent damage exchanges (win/lose momentum).

Use rolling windows with decay to avoid overfitting. Update on significant events, not every frame.

## 📈 Adaptive Difficulty

Continuously estimate player skill (e.g., damage taken vs dealt, dodge rate, perfect-block rate, encounter time). Every N seconds:

- Adjust movement speed, attack cadence, feint chance, and reaction delays.
- Interpolate changes smoothly (e.g., 10% toward target per update).
- Respect per-enemy clamps to preserve identity.

Example target ranges:
- speed: 0.85×–1.15×
- aggression: 0.3–0.85
- reactionDelay: 90–220 ms

## 🌲 Terrain & Positioning

Define terrain features at runtime or bake-time:

- `HighGround`, `Cover`, `OpenField`, `Chokepoint`, `LowGround`, `Water` (extendable).

Behaviors:
- Prefer cover when approaching; avoid open field under low morale.
- Seek chokepoints for defense; take high ground for ranged.
- Re-evaluate preferred position when state changes or advantage falls below a threshold.

## 🗣️ Communication (Groups)

Support lightweight messages with range limits:

- `AttackNow`, `Retreat`, `TargetSpotted`, `NeedHelp`, `FlankLeft`, `Regroup`.
- Leaders can trigger synchronized windows (e.g., when ≥ K allies are ready).
- Receivers validate context before acting to avoid thrash.

## 💻 Reference Structures (Language-agnostic)

```cpp
// Emotional/morale states
enum class Emotion : unsigned char { Calm, Aggressive, Fearful, Desperate, Confident, Frustrated };

// Lightweight memory signals
struct EnemyMemory {
    float playerSpeed;
    float playerReactionTime;
    float successfulAttackAngle;
    int dodgePatternId;
    float lastPlayerBlockTime;
    float lastPlayerRollTime;
};

// Terrain feature
enum class TerrainType : unsigned char { HighGround, Cover, OpenField, Chokepoint, LowGround, Water };

struct TerrainFeature { float x, y, radius; TerrainType type; float advantage; };
```

## 🧮 Decision Loops

- Per-frame: perception, light filtering, local movement.
- Every tick (e.g., 100–200 ms): state evaluation, target selection, terrain scan if needed.
- Every N seconds: adaptive difficulty update, role reassignment (groups).

Prefer event-driven updates for costly work (e.g., on damage, on block, on ally signal).

## 🎮 Tuning Guidelines

- Keep transitions readable and testable; avoid hidden side-effects.
- Use cool-downs for expensive actions (feints, big attacks, scans).
- Gate risky choices by morale and stamina.
- Randomize within tight bounds to avoid predictability.

## 🚀 Performance

- Use fixed-size buffers and object pools.
- O(n) per-enemy logic; cap group coordination to nearby allies.
- Cache line-of-sight and terrain queries; stagger expensive scans.

## ✅ Implementation Checklist

- [ ] Define states and transitions for the enemy archetype.
- [ ] Declare attributes with min/max clamps.
- [ ] Implement perception (LOS, hearing, stimulus).
- [ ] Add memory signals with decay.
- [ ] Implement adaptive difficulty sampling and interpolation.
- [ ] Add terrain evaluation and preferred position logic.
- [ ] Implement attacks, feints, recoveries with cool-downs.
- [ ] (Groups) Add roles and communication messages.
- [ ] Write unit tests for transitions and edge cases.

## 🔮 Extension Ideas

- Specializations: fearless berserker, cautious sniper, trap-layer, summoner.
- Seasonal or biome behaviors; weather and day/night modifiers.
- Injury and impairment effects (limp, reduced accuracy).
- Boss phases with emotion-driven move sets.

---

Last updated: 2025-01


