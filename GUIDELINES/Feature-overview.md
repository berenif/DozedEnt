# Source Module Feature Overview

This guide mirrors the `public/src/` directory so you can quickly map gameplay systems to their owning modules. Each section highlights flagship responsibilities, integration points, and reference files to explore next.

- [Animation (`public/src/animation/`)](#animation-publicsrcanimation) ⭐ **DUAL SYSTEM**
- [Game Logic (`public/src/game/`)](#game-logic-publicsrcgame) ⭐ **CHARACTER ABILITIES**
- [WASM Integration (`public/src/wasm/`)](#wasm-integration-publicsrcwasm) ⭐ **MODULAR**
- [Renderer (`public/src/renderer/`)](#renderer-publicsrcrenderer) ⭐ **DUAL ANIMATION**
- [Entities (`public/src/gameentity/`)](#entities-publicsrcgameentity)
- [Networking (`public/src/netcode/`)](#networking-publicsrcnetcode)
- [UI (`public/src/ui/`)](#ui-publicsrcui)
- [Utilities (`public/src/utils/`)](#utilities-publicsrcutils)
- [Demo (`public/src/demo/`)](#demo-publicsrcdemo)
- [Assets & Media (`public/src/images/`, `public/data/`)](#assets--media-publicsrcimages-publicdata)

---

## Animation (`public/src/animation/`) ⭐ **DUAL SYSTEM**

**Focus:** Dual animation systems for different gameplay views with modular architecture.

- [**Player Physics Animation**](../public/src/animation/player/physics/index.js) - Lightweight physics-based animation optimized for top-down gameplay with ~0.2ms update time and 5KB memory footprint.
- [**Player Procedural Animation**](../public/src/animation/player/procedural/player-animator.js) - Biomechanically accurate human motion with 9 specialized modules, IK solvers, and multi-segment spine for side-view gameplay.
- [**Animation Coordinator**](../public/src/animation/player/coordinator/PlayerAnimationCoordinator.js) - Composes CharacterAnimator + ProceduralAnimator with unified transform output.
- [**Character Abilities**](../public/src/animation/abilities/) - Warden bash, Raider charge, and Kensei dash animations with custom effects.
- [**Animation Events**](../public/src/animation/system/animation-events.js) - Event-driven architecture for synchronizing game logic, visual effects, and audio.

**Integration notes:** Use `TopDownPlayerRenderer` for unified rendering interface supporting both animation systems. Physics system for top-down gameplay, procedural system for side-view/isometric perspectives.

**Further reading:** [`GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md`](../GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md).

## Game Logic (`public/src/game/`) ⭐ **CHARACTER ABILITIES**

**Focus:** Character abilities, progression systems, and game state management.

- [**Ability Manager**](../public/src/game/abilities/ability-manager.js) - Coordinates character-specific abilities with WASM integration for Warden, Raider, and Kensei classes.
- [**Warden Abilities**](../public/src/game/abilities/warden-abilities.js) - Shield bash with knockback mechanics and defensive animations.
- [**Raider Abilities**](../public/src/game/abilities/raider-abilities.js) - Forward dash attack with aggressive, mobile animations.
- [**Kensei Abilities**](../public/src/game/abilities/kensei-abilities.js) - Teleport with counter-attack and precise, evasive animations.
- [**Progression Manager**](../public/src/game/progression/progression-manager.js) - Character progression and ability upgrade systems.

**Integration notes:** Abilities follow WASM-first architecture with logic in C++ and visual effects in JavaScript. Each ability has cooldowns, stamina costs, and unique animations.

**Further reading:** See `GUIDELINES/ANIMATION/` for character animation details and `GUIDELINES/IMPLEMENTATION_STATUS_SUMMARY.md` for overall implementation status.

## WASM Integration (`public/src/wasm/`) ⭐ **MODULAR**

**Focus:** Modular WASM management system with focused, maintainable components.

- [**WasmManager**](../public/src/wasm/wasm-manager.js) - Main orchestrator with lazy loading, performance metrics, and fallback strategies.
- [**WasmInitializer**](../public/src/wasm/initializer/WasmInitializer.js) - Module loading with multiple fallback strategies and comprehensive error handling.
- [**WasmCoreState**](../public/src/wasm/core/WasmCoreState.js) - Core game state reading with performance optimization and state caching.
- [**WasmCombatSystem**](../public/src/wasm/core/WasmCombatSystem.js) - Combat operations and telemetry with caching.
- [**WasmPhaseManagers**](../public/src/wasm/phases/WasmPhaseManagers.js) - Phase-specific functions for all 8 game phases.
- [**WasmWorldSimulation**](../public/src/wasm/world/WasmWorldSimulation.js) - World state management and simulation.

**Integration notes:** All gameplay logic resides in C++ WASM modules. JavaScript only handles rendering, input forwarding, and networking. Follow Manager/ViewModel/Coordinator patterns for clean architecture.

**Further reading:** [`GUIDELINES/BUILD/API.md`](../GUIDELINES/BUILD/API.md) for complete WASM API reference.

## Renderer (`public/src/renderer/`) ⭐ **DUAL ANIMATION**

**Focus:** Unified rendering interface supporting both animation systems.

- [**TopDownPlayerRenderer**](../public/src/renderer/player/TopDownPlayerRenderer.js) - Unified renderer supporting both physics and procedural animation systems with runtime mode selection.
- [**Top-Down Utilities**](../public/src/renderer/player/topdown/) - Complete rendering pipeline with skeleton drawing, indicators, shadows, and transforms.
- [**WolfRenderer**](../public/src/renderer/WolfRenderer.js) - Wolf rendering with pack coordination and emotional state visualization.

**Integration notes:** Use `TopDownPlayerRenderer` with mode selection (`'physics'` or `'procedural'`) based on gameplay requirements. Physics mode for top-down gameplay, procedural mode for side-view/isometric perspectives.

**Further reading:** [`GUIDELINES/ANIMATION/TOPDOWN_PHYSICS_ANIMATION.md`](../GUIDELINES/ANIMATION/TOPDOWN_PHYSICS_ANIMATION.md) for physics animation details.

## Entities (`public/src/gameentity/`)

**Focus:** Game entities and mobile controls.

- [**WolfCharacter**](../public/src/gameentity/wolf-character.js) - Wolf character class with physics, pack roles, deterministic fur coloration, and animation orchestration driven by WASM state.
- [**MobileGameControls**](../public/src/gameentity/controls.js) - Enhanced on-screen controls with gesture detection, haptics, and ripple feedback tied into the shared InputManager.

**Integration notes:** Inject `WolfAnimationSystem` and WASM module into `WolfCharacter` to share skeletal data. For `MobileGameControls`, pass the `InputManager` so touch events feed the WASM-first pipeline.

**Further reading:** [`GUIDELINES/AI/WOLF_AI.md`](../GUIDELINES/AI/WOLF_AI.md) for wolf AI details.

## Networking (`public/src/netcode/`)

**Focus:** P2P networking with multiple backends and host authority.

- [**Network Provider Manager**](../public/src/netcode/network-provider-manager.js) - Abstracts network provider implementation details with unified interface for Trystero backends (torrent, IPFS, MQTT, Supabase).
- [**Host Authority Loop**](../public/src/netcode/host-authority.js) - Runs authoritative WASM tick, buffers player inputs deterministically, and streams state snapshots.
- [**Rollback Netcode**](../public/src/netcode/rollback-netcode.js) - GGPO-style prediction, frame history compression, and multi-stage desync detection.
- [**Room Manager**](../public/src/lobby/room-manager.js) - Room lifecycle, deterministic ID generation, player identity storage, and friendly error messaging.

**Integration notes:** Netcode layers depend on `RoomManager` events and `WasmManager` exports for state serialization. Host authority requires `loadWasm` and JSON helpers. When enabling rollback, register `saveState`, `loadState`, and checksum callbacks backed by WASM exports.

**Further reading:** [`GUIDELINES/MULTIPLAYER/MULTIPLAYER_IMPLEMENTATION.md`](../GUIDELINES/MULTIPLAYER/MULTIPLAYER_IMPLEMENTATION.md) for networking details.

## UI (`public/src/ui/`)

**Focus:** Enhanced HUD, accessibility, and performance visibility.

- [**Enhanced UI Manager**](../public/src/ui/enhanced-ui-manager.js) - Rebuilds HUD with stable layouts, prioritized health/stamina zones, ability bars, and progressive disclosure clusters.
- [**Roguelike HUD**](../public/src/ui/roguelike-hud.js) - Fully themed overlay including minimap, status effects, quick inventory, and control reference panels.
- [**Performance Dashboard**](../public/src/ui/performance-dashboard.js) - Live frame, memory, WASM-call metrics, and LOD controls backed by profiler/LOD utilities.

**Integration notes:** Most UI managers listen for `GameStateManager` events and call into `WasmManager` for stat snapshots. Attach `PerformanceDashboard` after initializing `globalProfiler` and `globalLODSystem`.

**Further reading:** [`GUIDELINES/UI/ENHANCED_UI_SYSTEMS_README.md`](../GUIDELINES/UI/ENHANCED_UI_SYSTEMS_README.md) for UI details.

## Utilities (`public/src/utils/`)

**Focus:** Shared infrastructure for determinism, performance, and WASM orchestration.

- [**WasmManager**](../public/src/utils/wasm-manager.js) - Main WASM orchestrator with lazy loading strategies, seeds JS RNG streams, exposes performance metrics, and falls back to multiple `game.wasm` URLs.
- [**Deterministic RNG**](../public/src/utils/rng.js) - Xorshift64* streams for JS-side visuals while syncing seeds from WASM exports.
- [**Performance LOD System**](../public/src/utils/performance-lod-system.js) - Adaptively tunes rendering detail and entity update frequency based on frame timing targets.
- [**Deterministic ID Generator**](../public/src/utils/deterministic-id-generator.js) - Reproducible room/player IDs used throughout lobby and persistence flows.

**Integration notes:** Utilities are intended to be singleton/shared instances (e.g., `globalWasmLoader`, `globalMemoryOptimizer`). Import them rather than recreating per system to avoid redundant resource usage.

**Further reading:** [`GUIDELINES/UTILS/QUICK_REFERENCE.md`](../GUIDELINES/UTILS/QUICK_REFERENCE.md) for utility details.

## Demo (`public/src/demo/`)

**Focus:** Demo components and game loop integration.

- [**Main Demo**](../public/src/demo/main.js) - Main demo page with complete game loop integration.
- [**Game Loop**](../public/src/demo/game-loop.js) - Game loop creation with WASM API, renderer, and ability manager integration.
- [**Guidelines Data**](../public/src/demo/guidelines-data.js) - Feature data for guidelines showcase.
- [**Guidelines Showcase**](../public/src/demo/guidelines-showcase.js) - Interactive guidelines demonstration.
- [**Progression Demo**](../public/src/demo/progression-demo.js) - Character progression system demonstration.

**Integration notes:** Demo components demonstrate best practices for integrating WASM, animation systems, abilities, and UI. Use as reference for implementing new features.

**Further reading:** [`GUIDELINES/WASM/DEMO_DEVELOPMENT.md`](../GUIDELINES/WASM/DEMO_DEVELOPMENT.md) for demo development details.

## Assets & Media (`public/src/images/`, `public/data/`)

**Focus:** Art, audio, and auxiliary data referenced by runtime modules.

- [**Images**](../public/src/images/) include player sprite atlases, hand reference art, and favicon resources.
- [**Game Data**](../public/data/) contains balance configuration (`balance/enemies.json`, `balance/player.json`) and demo data for WASM packaging.
- [**WASM Modules**](../public/wasm/) contains compiled WebAssembly modules (`game.wasm`, `game-host.wasm`).

**Integration notes:** Asset directories are served statically. When adding new media, ensure filenames map to identifiers expected by animation systems, UI modules, or WASM exports. Balance data is loaded at startup for deterministic gameplay.

**Further reading:** [`GUIDELINES/UTILS/BALANCE_DATA.md`](../GUIDELINES/UTILS/BALANCE_DATA.md) for data management details.
