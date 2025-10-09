# 🔗 Features → Source Files and Folders

Authoritative mapping from documented physics features to their primary source locations. Keep gameplay logic in C++/WASM; JS is for rendering/input/networking.

See `GUIDELINES/SYSTEMS/PHYSICS_ARCHITECTURE.md` and `GUIDELINES/BUILD/API.md` for technical specifications and APIs.

---

## Core Physics Systems

- Physics backbone (Phase 0.5 implementation)
  - Fixed-point math: `src/physics/FixedPoint.h`
  - Types: `src/physics/PhysicsTypes.h` (FixedVector3, RigidBody, PhysicsConfig)
  - Manager: `src/physics/PhysicsManager.h`, `src/physics/PhysicsManager.cpp`
  
- Physics backbone (Future phases - reference only)
  - Headers: `public/src/wasm/physics_backbone.h`
  - Future implementations:
    - `src/physics/CollisionManager.h`, `src/physics/CollisionManager.cpp`
    - `src/physics/ForceIntegrator.h`, `src/physics/ForceIntegrator.cpp`
    - `src/physics/SpatialPartition.h`, `src/physics/SpatialPartition.cpp`

- World/Chemistry/Environment
  - Headers: `public/src/wasm/chemistry_system.h`, `public/src/wasm/world_simulation.h`
  - Implementations (target):
    - `src/world/ChemistrySystem.h`, `src/world/ChemistrySystem.cpp`
    - `src/world/WeatherSystem.h/.cpp` (if split)
    - `src/world/TerrainSystem.h/.cpp` (if split)

---

## Player and Entities

- Player entity (physics-driven)
  - Current: `src/managers/PlayerManager.*` (being refactored)
  - Target (Phase 1): `src/entities/PlayerEntity.h`, `src/entities/PlayerEntity.cpp`

- Physics barrels (Phase 0.5 Week 2)
  - Implementation: `src/entities/PhysicsBarrel.h`, `src/entities/PhysicsBarrel.cpp`
  - WASM exports: `src/game_refactored.cpp` (spawn_barrel, throw_barrel, get_barrel_*)

- Enemy entity + AI forces (Future)
  - Target: `src/entities/EnemyEntity.h`, `src/entities/EnemyEntity.cpp`
  - Ragdoll: `src/entities/RagdollSystem.h`, `src/entities/RagdollSystem.cpp`

---

## Combat (Physics-Driven)

- Combat system integration (Phase 0.5 Week 1)
  - Extended: `src/managers/CombatManager.h`, `src/managers/CombatManager.cpp`
  - Added methods: `apply_knockback_impulse()`, `apply_attack_lunge()`
  - Integrates with: `PhysicsManager` via dependency injection

- Advanced combat (Future phases)
  - Target:
    - `src/combat/PhysicsCombatSystem.h`, `src/combat/PhysicsCombatSystem.cpp`
    - `src/combat/DamageCalculation.cpp`
    - `src/combat/AttackController.h`, `src/combat/AttackController.cpp`

---

## Direct Interaction

- Grab / Throw / Push-Pull
  - New (target):
    - `src/interaction/GrabSystem.h`, `src/interaction/GrabSystem.cpp`
    - `src/interaction/PushPullSystem.cpp`
    - `src/interaction/EnvironmentalCombat.h`, `src/interaction/EnvironmentalCombat.cpp`

---

## Demos / Quick Wins (WASM-first with JS viz)

- Physics Knockback Demo (Phase 0.5 Week 1)
  - HTML/JS: `public/demos/physics-knockback-demo.html`
  - Tests: Knockback impulse, attack lunges, velocity visualization
  - WASM exports: `apply_physics_knockback()`, `get_physics_player_*`

- Physics Barrel Demo (Phase 0.5 Week 2)
  - HTML/JS: `public/demos/physics-barrel-demo.html`
  - Tests: Barrel spawning, throwing, collision, momentum damage
  - WASM exports: `spawn_barrel()`, `throw_barrel()`, `get_barrel_*`

- Future Quick Wins:
  - Bouncing Ball: `demos/bouncing-ball-physics.cpp`
  - Ice Surface: `src/demo/surface-friction-demo.cpp`
  - Wind Zone: `src/demo/wind-zone-demo.cpp`

---

## Build and WASM Exports

- Build system
  - `src/CMakeLists.txt`
  - Scripts: `tools/scripts/`

- WASM integration entry
  - `src/game_refactored.cpp` (export wiring)

---

## Networking/Multiplayer (reference)

- Coordinator and room management (JS UI glue only)
  - `public/src/multiplayer/` and `public/multiplayer.html`

---

## Notes

- When creating new C++ files, keep them under `src/` with focused responsibilities per file.
- Avoid adding gameplay logic to `public/` JS; only render, input, and networking live there.


