## DozedEnt Guidelines Index

Use this as your starting point. The project is WASM-first: keep gameplay logic in WebAssembly (C++), and use JavaScript only for rendering, input, and networking.

### Start here
- Architecture overview: [AGENTS.md](./AGENTS.md)
- Quick reference (rules, APIs, checklists): [UTILS/QUICK_REFERENCE.md](./UTILS/QUICK_REFERENCE.md)
- Development workflow: [BUILD/DEVELOPMENT_WORKFLOW.md](./BUILD/DEVELOPMENT_WORKFLOW.md)
- Canonical API surface: [BUILD/API.md](./BUILD/API.md)

### Systems and implementation
- Core world sim: [SYSTEMS/CORE_WORLD_SIMULATION.md](./SYSTEMS/CORE_WORLD_SIMULATION.md)
- Gameplay mechanics: [SYSTEMS/GAMEPLAY_MECHANICS.md](./SYSTEMS/GAMEPLAY_MECHANICS.md)
- Player characters: [SYSTEMS/PLAYER_CHARACTERS.md](./SYSTEMS/PLAYER_CHARACTERS.md)
- Input flags (bitmasks): [SYSTEMS/INPUT_FLAGS.md](./SYSTEMS/INPUT_FLAGS.md)

### Combat and animation
- Combat system: [FIGHT/COMBAT_SYSTEM.md](./FIGHT/COMBAT_SYSTEM.md)
- 5-button combat implementation: [FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md](./FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md)
- Player animations: [ANIMATION/PLAYER_ANIMATIONS.md](./ANIMATION/PLAYER_ANIMATIONS.md)
- Animation system index: [ANIMATION/ANIMATION_SYSTEM_INDEX.md](./ANIMATION/ANIMATION_SYSTEM_INDEX.md)

### AI (enemies)
- Enemy AI overview: [AI/ENEMY_AI.md](./AI/ENEMY_AI.md)
- Enemy template: [AI/ENEMY_TEMPLATE.md](./AI/ENEMY_TEMPLATE.md)
- Wolf AI: [AI/WOLF_AI.md](./AI/WOLF_AI.md)

### Multiplayer
- Lobby system: [MULTIPLAYER/LOBBY_SYSTEM.md](./MULTIPLAYER/LOBBY_SYSTEM.md)
- Room system: [MULTIPLAYER/ROOM_SYSTEM.md](./MULTIPLAYER/ROOM_SYSTEM.md)

### Build, test, deploy
- Build instructions: [UTILS/BUILD_INSTRUCTIONS.md](./UTILS/BUILD_INSTRUCTIONS.md)
- Testing: [BUILD/TESTING.md](./BUILD/TESTING.md)
- Deploy to GitHub Pages: [UTILS/DEPLOY_GITHUB_PAGES.md](./UTILS/DEPLOY_GITHUB_PAGES.md)
- Balance data (externalized constants): [UTILS/BALANCE_DATA.md](./UTILS/BALANCE_DATA.md)

### Notes
- Some code snippets are pseudocode to illustrate intent. Always implement and consume the real APIs from WASM headers/exports and JS bindings.

Last updated: September 2025

