# 🎮 DozedEnt - WebAssembly Survival Game

[![Deploy Status](https://github.com/berenif/DozedEnt/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/berenif/DozedEnt/actions)
[![Game Status](https://img.shields.io/badge/status-playable-brightgreen)](https://berenif.github.io/DozedEnt/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**🚀 [Play Live Demo](https://berenif.github.io/DozedEnt/) | 📖 [Documentation](GUIDELINES/AGENTS.md) | 🛠️ [Development Guide](GUIDELINES/BUILD/DEVELOPMENT_WORKFLOW.md)**

---

## 🌟 Project Overview

**DozedEnt** is a cutting-edge **WebAssembly-first multiplayer survival game** featuring advanced AI, responsive combat, and serverless P2P networking. Built with performance and determinism as core principles, it demonstrates modern web game development techniques.

### 🆕 Latest: Premium Mobile Experience (v2.0)
We've completely overhauled the mobile UI with:
- ✨ **Modern Design**: Vibrant gradients, glass-morphism, multi-layer shadows
- 🎮 **Enhanced Controls**: Color-coded buttons, glow effects, improved feedback
- 📚 **Tutorial System**: Optional onboarding for new players
- ⚡ **Rich Interactions**: Animations, haptics, visual effects
- 📱 **Optimized**: GPU-accelerated, < 1% FPS impact

👉 [See Full Details](IMPROVEMENTS_SUMMARY.md) | [Try Demo](public/mobile-demo.html)

### ⚡ Key Features
- **🎯 5-Button Combat** - Responsive fighting system with precise timing
- **🧠 Intelligent AI** - Advanced wolf pack behavior with coordinated strategies
- **🔄 8-Phase Game Loop** - Complete roguelike progression system
- **🌐 P2P Multiplayer** - Serverless networking with multiple backends
- **📱 Cross-Platform** - Desktop and mobile with optimized controls

### 🚀 Quick Start

1. **Start Development Server**:
   ```bash
   npm run dev
   ```
   This starts the server on `http://localhost:8080` with proper ES module support.

2. **Open in Browser**:
   - Main game: `http://localhost:8080`
   - WASM testing: `http://localhost:8080/public/test-wasm.html`

⚠️ **Important**: Use `http://localhost:8080` (not 5501) to avoid MIME type issues with ES modules.

### 🛠️ Troubleshooting MIME Type Issues

If you get "type MIME interdit" errors:

1. **Stop any other servers** running on port 8080 or 5501
2. **Use only the project's server**: `npm run dev`
3. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check browser console** for detailed error messages

The project's server automatically serves:
- JavaScript files with `application/javascript` MIME type
- WASM files with `application/wasm` MIME type
- Includes CORS headers for ES module loading
- **⚡ High Performance** - Native-speed WASM core, <16ms frame times

---

## 🚀 Quick Start for Developers

**CRITICAL**: Always read the [GUIDELINES](GUIDELINES/README.md) first before making any changes to the codebase.

### 🏗️ Architecture Overview
- **WASM-First**: All game logic in WebAssembly (C++)
- **JavaScript**: Only for rendering, input, and networking
- **Deterministic**: Same inputs = same outputs across all clients
- **Performance**: Native-speed game logic with minimal JS overhead

### 🎯 Golden Rules
1. **Keep ALL game logic in WASM** - No gameplay decisions in JavaScript
2. **UI reads state snapshots** - JS only visualizes WASM-exported data
3. **Inputs flow through WASM** - All player actions processed by WASM first
4. **Deterministic by design** - Same seed + inputs = same outcome everywhere

---

## 📚 Documentation Index

### 🎯 Core System References
| Topic | File | Quick Description |
|-------|------|-------------------|
| **Main Architecture** | [`GUIDELINES/AGENTS.md`](./GUIDELINES/AGENTS.md) | ⭐ WASM-first architecture, API reference, build process |
| **Source Module Overview** | [`GUIDELINES/Feature-overview.md`](./GUIDELINES/Feature-overview.md) | Directory-by-directory summary of major `src/` systems |
| **Development Workflow** | [`GUIDELINES/BUILD/DEVELOPMENT_WORKFLOW.md`](./GUIDELINES/BUILD/DEVELOPMENT_WORKFLOW.md) | ⭐ Complete development cycle and best practices |
| **Combat System** | [`GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md`](./GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md) | Complete 5-button combat implementation |
| **Getting Started** | [`GETTING_STARTED.md`](./GETTING_STARTED.md) | Quick setup and basic examples |

### 🤖 AI & Enemy Systems
| Component | File | Purpose |
|-----------|------|---------|
| **AI Template** | [`GUIDELINES/AI/ENEMY_TEMPLATE.md`](./GUIDELINES/AI/ENEMY_TEMPLATE.md) | Baseline rules for all enemy AI |
| **AI System** | [`GUIDELINES/AI/ENEMY_AI.md`](./GUIDELINES/AI/ENEMY_AI.md) | Modular behavior system overview |
| **Wolf AI** | [`GUIDELINES/AI/WOLF_AI.md`](./GUIDELINES/AI/WOLF_AI.md) | Specific wolf pack AI implementation |

### 🎬 Animation Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Animation Index** | [`GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md`](./GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md) | Animation architecture overview |
| **Player Animations** | [`GUIDELINES/ANIMATION/PLAYER_ANIMATIONS.md`](./GUIDELINES/ANIMATION/PLAYER_ANIMATIONS.md) | Player animation states and transitions |
| **Wolf Body System** | [`GUIDELINES/ANIMATION/WOLF_BODY_SYSTEM_README.md`](./GUIDELINES/ANIMATION/WOLF_BODY_SYSTEM_README.md) | Wolf animation implementation |

### 🎮 Game Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Core Loop** | [`GUIDELINES/GAME/IMPLEMENTATION_SUMMARY.md`](./GUIDELINES/GAME/IMPLEMENTATION_SUMMARY.md) | 8-phase game loop implementation |
| **Core Loop Checklist** | [`GUIDELINES/GAME/CORE_LOOP_CHECKLIST.md`](./GUIDELINES/GAME/CORE_LOOP_CHECKLIST.md) | Validation checklist for core loop |
| **Combat System** | [`GUIDELINES/SYSTEMS/COMBAT_SYSTEM.md`](./GUIDELINES/SYSTEMS/COMBAT_SYSTEM.md) | Detailed combat mechanics |
| **Gameplay Mechanics** | [`GUIDELINES/SYSTEMS/GAMEPLAY_MECHANICS.md`](./GUIDELINES/SYSTEMS/GAMEPLAY_MECHANICS.md) | Core gameplay systems |
| **World Simulation** | [`GUIDELINES/SYSTEMS/CORE_WORLD_SIMULATION.md`](./GUIDELINES/SYSTEMS/CORE_WORLD_SIMULATION.md) | World state management |
| **Player Characters** | [`GUIDELINES/SYSTEMS/PLAYER_CHARACTERS.md`](./GUIDELINES/SYSTEMS/PLAYER_CHARACTERS.md) | Character system design |

### 🌐 Multiplayer Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Lobby System** | [`GUIDELINES/MULTIPLAYER/LOBBY_SYSTEM.md`](./GUIDELINES/MULTIPLAYER/LOBBY_SYSTEM.md) | Matchmaking and lobby management |
| **Room System** | [`GUIDELINES/MULTIPLAYER/ROOM_SYSTEM.md`](./GUIDELINES/MULTIPLAYER/ROOM_SYSTEM.md) | Room-based multiplayer architecture |

### 🛠️ Development Tools
| Component | File | Purpose |
|-----------|------|---------|
| **Build Instructions** | [`GUIDELINES/UTILS/BUILD_INSTRUCTIONS.md`](./GUIDELINES/UTILS/BUILD_INSTRUCTIONS.md) | How to build the WASM module |
| **GitHub Pages Deploy** | [`GUIDELINES/UTILS/DEPLOY_GITHUB_PAGES.md`](./GUIDELINES/UTILS/DEPLOY_GITHUB_PAGES.md) | Deployment process |
| **Testing** | [`GUIDELINES/BUILD/TESTING.md`](./GUIDELINES/BUILD/TESTING.md) | Testing framework and procedures |
| **Test Coverage** | [`GUIDELINES/UTILS/TEST_COVERAGE_IMPROVEMENTS.md`](./GUIDELINES/UTILS/TEST_COVERAGE_IMPROVEMENTS.md) | Testing improvements |

---

## 🔍 Quick Reference Checklists

### ✅ Before Making Changes
- [ ] Read [`GUIDELINES/AGENTS.md`](./GUIDELINES/AGENTS.md) for architecture principles
- [ ] Check if changes affect WASM/JS boundary
- [ ] Ensure deterministic behavior is maintained
- [ ] Verify no gameplay logic goes into JavaScript

### ✅ Combat System Changes
- [ ] Review [`GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md`](./GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md)
- [ ] Check [`GUIDELINES/SYSTEMS/COMBAT_SYSTEM.md`](./GUIDELINES/SYSTEMS/COMBAT_SYSTEM.md) for mechanics
- [ ] Validate timing windows and state machines
- [ ] Test input buffer and responsiveness

### ✅ AI/Enemy Changes
- [ ] Follow [`GUIDELINES/AI/ENEMY_TEMPLATE.md`](./GUIDELINES/AI/ENEMY_TEMPLATE.md) guidelines
- [ ] Check [`GUIDELINES/AI/ENEMY_AI.md`](./GUIDELINES/AI/ENEMY_AI.md) for system integration
- [ ] Ensure AI logic stays in WASM
- [ ] Test deterministic behavior

### ✅ Animation Changes
- [ ] Review [`GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md`](./GUIDELINES/ANIMATION/ANIMATION_SYSTEM_INDEX.md)
- [ ] Check state transitions in relevant animation public
- [ ] Ensure animations don't affect game logic
- [ ] Validate performance impact

### ✅ Core Loop Changes
- [ ] Review [`GUIDELINES/GAME/IMPLEMENTATION_SUMMARY.md`](./GUIDELINES/GAME/IMPLEMENTATION_SUMMARY.md)
- [ ] Use [`GUIDELINES/GAME/CORE_LOOP_CHECKLIST.md`](./GUIDELINES/GAME/CORE_LOOP_CHECKLIST.md) for validation
- [ ] Test all 8 phases (Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset)
- [ ] Verify deterministic phase transitions

---

## 🎯 Common Tasks & References

### Adding New Features
1. **Start with**: [`GUIDELINES/AGENTS.md`](./GUIDELINES/AGENTS.md) - Architecture principles
2. **Plan with**: Relevant system documentation (AI, Animation, Game, etc.)
3. **Implement in**: WASM first, then JS integration layer
4. **Test with**: [`GUIDELINES/BUILD/TESTING.md`](./GUIDELINES/BUILD/TESTING.md) procedures

### Debugging Issues
1. **Architecture problems**: [`GUIDELINES/AGENTS.md`](./GUIDELINES/AGENTS.md) troubleshooting section
2. **Combat issues**: [`GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md`](./GUIDELINES/FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md)
3. **AI behavior**: [`GUIDELINES/AI/ENEMY_AI.md`](./GUIDELINES/AI/ENEMY_AI.md) or [`GUIDELINES/AI/WOLF_AI.md`](./GUIDELINES/AI/WOLF_AI.md)
4. **Animation glitches**: [`GUIDELINES/ANIMATION/PLAYER_ANIMATIONS.md`](./GUIDELINES/ANIMATION/PLAYER_ANIMATIONS.md)

### Performance Optimization
1. **WASM optimization**: [`GUIDELINES/AGENTS.md`](./GUIDELINES/AGENTS.md) performance section
2. **Build optimization**: [`GUIDELINES/UTILS/BUILD_INSTRUCTIONS.md`](./GUIDELINES/UTILS/BUILD_INSTRUCTIONS.md)
3. **Testing performance**: [`GUIDELINES/UTILS/TEST_COVERAGE_IMPROVEMENTS.md`](./GUIDELINES/UTILS/TEST_COVERAGE_IMPROVEMENTS.md)

---

## 🧠 AI Agent Memory Aids

### Key Concepts to Remember
- **60+ WASM API functions** - Complete game state accessible from JS
- **8-phase core loop** - Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset
- **5-button combat** - Light Attack, Heavy Attack, Block/Parry, Roll, Special
- **Deterministic RNG** - All randomness handled in WASM with seeds
- **Performance targets** - <16ms frame time, <32MB memory, 60+ FPS

### File Naming Conventions
- **Core architecture**: `GUIDELINES/AGENTS.md` (main reference)
- **Implementation guides**: `*_IMPLEMENTATION.md`
- **System overviews**: `*_SYSTEM.md`
- **Quick references**: `*_INDEX.md`
- **Checklists**: `*_CHECKLIST.md`

---

## 📁 Directory Structure

```
GUIDELINES/
├── README.md                    # 📋 Main index and navigation
├── QUICK_REFERENCE.md          # ⚡ Essential info at a glance  
├── DEVELOPMENT_WORKFLOW.md     # 🛠️ Complete development cycle
├── AGENTS.md                   # 🏗️ Core WASM-first architecture
├── 5-BUTTON_COMBAT_IMPLEMENTATION.md # ⚔️ Combat system details
├── GETTING_STARTED.md          # 🚀 Quick setup guide
├── TESTING.md                  # 🧪 Testing procedures
├── AI/                         # 🤖 Enemy and AI behavior
│   ├── ENEMY_TEMPLATE.md       # Template for all enemies
│   ├── ENEMY_AI.md            # AI system overview
│   └── WOLF_AI.md             # Wolf-specific AI
├── ANIMATION/                  # 🎬 Animation systems
│   ├── ANIMATION_SYSTEM_INDEX.md
│   ├── PLAYER_ANIMATIONS.md
│   └── WOLF_BODY_SYSTEM_README.md
├── SYSTEMS/                    # 🎮 Core game mechanics
│   ├── COMBAT_SYSTEM.md        # Combat mechanics detail
│   ├── GAMEPLAY_MECHANICS.md   # Core gameplay systems
│   ├── CORE_WORLD_SIMULATION.md # World state management
│   └── PLAYER_CHARACTERS.md    # Character system design
├── GAME/                       # 🔄 Game loop and flow
│   ├── IMPLEMENTATION_SUMMARY.md # 8-phase core loop
│   └── CORE_LOOP_CHECKLIST.md   # Validation checklist
├── MULTIPLAYER/                # 🌐 Networking systems
│   ├── LOBBY_SYSTEM.md         # Matchmaking and lobbies
│   └── ROOM_SYSTEM.md          # Room-based multiplayer
└── UTILS/                      # 🔧 Development tools
    ├── BUILD_INSTRUCTIONS.md   # WASM build process
    ├── DEPLOY_GITHUB_PAGES.md  # Deployment guide
    └── TEST_COVERAGE_IMPROVEMENTS.md # Testing improvements
```

---

*Last updated: January 2025*  
*This index is designed to help AI agents quickly navigate and understand the codebase architecture.*
