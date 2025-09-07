# 🎮 DozedEnt Game Development Guidelines

## 🚀 Quick Start for AI Agents

**CRITICAL**: Always read this file first before making any changes to the codebase.

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
| **Quick Reference** | [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) | ⭐ Essential info, checklists, and common patterns |
| **Development Workflow** | [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) | ⭐ Complete development cycle and best practices |
| **Main Architecture** | [`AGENTS.md`](./AGENTS.md) | WASM-first architecture, API reference, build process |
| **Combat System** | [`5-BUTTON_COMBAT_IMPLEMENTATION.md`](./5-BUTTON_COMBAT_IMPLEMENTATION.md) | Complete 5-button combat implementation |
| **Getting Started** | [`GETTING_STARTED.md`](./GETTING_STARTED.md) | Quick setup and basic examples |

### 🤖 AI & Enemy Systems
| Component | File | Purpose |
|-----------|------|---------|
| **AI Template** | [`AI/ENEMY_TEMPLATE.md`](./AI/ENEMY_TEMPLATE.md) | Baseline rules for all enemy AI |
| **AI System** | [`AI/ENEMY_AI.md`](./AI/ENEMY_AI.md) | Modular behavior system overview |
| **Wolf AI** | [`AI/WOLF_AI.md`](./AI/WOLF_AI.md) | Specific wolf pack AI implementation |

### 🎬 Animation Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Animation Index** | [`ANIMATION/ANIMATION_SYSTEM_INDEX.md`](./ANIMATION/ANIMATION_SYSTEM_INDEX.md) | Animation architecture overview |
| **Player Animations** | [`ANIMATION/PLAYER_ANIMATIONS.md`](./ANIMATION/PLAYER_ANIMATIONS.md) | Player animation states and transitions |
| **Wolf Body System** | [`ANIMATION/WOLF_BODY_SYSTEM_README.md`](./ANIMATION/WOLF_BODY_SYSTEM_README.md) | Wolf animation implementation |

### 🎮 Game Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Core Loop** | [`GAME/IMPLEMENTATION_SUMMARY.md`](./GAME/IMPLEMENTATION_SUMMARY.md) | 8-phase game loop implementation |
| **Core Loop Checklist** | [`GAME/CORE_LOOP_CHECKLIST.md`](./GAME/CORE_LOOP_CHECKLIST.md) | Validation checklist for core loop |
| **Combat System** | [`SYSTEMS/COMBAT_SYSTEM.md`](./SYSTEMS/COMBAT_SYSTEM.md) | Detailed combat mechanics |
| **Gameplay Mechanics** | [`SYSTEMS/GAMEPLAY_MECHANICS.md`](./SYSTEMS/GAMEPLAY_MECHANICS.md) | Core gameplay systems |
| **World Simulation** | [`SYSTEMS/CORE_WORLD_SIMULATION.md`](./SYSTEMS/CORE_WORLD_SIMULATION.md) | World state management |
| **Player Characters** | [`SYSTEMS/PLAYER_CHARACTERS.md`](./SYSTEMS/PLAYER_CHARACTERS.md) | Character system design |

### 🌐 Multiplayer Systems
| Component | File | Purpose |
|-----------|------|---------|
| **Lobby System** | [`MULTIPLAYER/LOBBY_SYSTEM.md`](./MULTIPLAYER/LOBBY_SYSTEM.md) | Matchmaking and lobby management |
| **Room System** | [`MULTIPLAYER/ROOM_SYSTEM.md`](./MULTIPLAYER/ROOM_SYSTEM.md) | Room-based multiplayer architecture |

### 🛠️ Development Tools
| Component | File | Purpose |
|-----------|------|---------|
| **Build Instructions** | [`UTILS/BUILD_INSTRUCTIONS.md`](./UTILS/BUILD_INSTRUCTIONS.md) | How to build the WASM module |
| **GitHub Pages Deploy** | [`UTILS/DEPLOY_GITHUB_PAGES.md`](./UTILS/DEPLOY_GITHUB_PAGES.md) | Deployment process |
| **Testing** | [`TESTING.md`](./TESTING.md) | Testing framework and procedures |
| **Test Coverage** | [`UTILS/TEST_COVERAGE_IMPROVEMENTS.md`](./UTILS/TEST_COVERAGE_IMPROVEMENTS.md) | Testing improvements |

---

## 🔍 Quick Reference Checklists

### ✅ Before Making Changes
- [ ] Read [`AGENTS.md`](./AGENTS.md) for architecture principles
- [ ] Check if changes affect WASM/JS boundary
- [ ] Ensure deterministic behavior is maintained
- [ ] Verify no gameplay logic goes into JavaScript

### ✅ Combat System Changes
- [ ] Review [`5-BUTTON_COMBAT_IMPLEMENTATION.md`](./5-BUTTON_COMBAT_IMPLEMENTATION.md)
- [ ] Check [`SYSTEMS/COMBAT_SYSTEM.md`](./SYSTEMS/COMBAT_SYSTEM.md) for mechanics
- [ ] Validate timing windows and state machines
- [ ] Test input buffer and responsiveness

### ✅ AI/Enemy Changes
- [ ] Follow [`AI/ENEMY_TEMPLATE.md`](./AI/ENEMY_TEMPLATE.md) guidelines
- [ ] Check [`AI/ENEMY_AI.md`](./AI/ENEMY_AI.md) for system integration
- [ ] Ensure AI logic stays in WASM
- [ ] Test deterministic behavior

### ✅ Animation Changes
- [ ] Review [`ANIMATION/ANIMATION_SYSTEM_INDEX.md`](./ANIMATION/ANIMATION_SYSTEM_INDEX.md)
- [ ] Check state transitions in relevant animation docs
- [ ] Ensure animations don't affect game logic
- [ ] Validate performance impact

### ✅ Core Loop Changes
- [ ] Review [`GAME/IMPLEMENTATION_SUMMARY.md`](./GAME/IMPLEMENTATION_SUMMARY.md)
- [ ] Use [`GAME/CORE_LOOP_CHECKLIST.md`](./GAME/CORE_LOOP_CHECKLIST.md) for validation
- [ ] Test all 8 phases (Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset)
- [ ] Verify deterministic phase transitions

---

## 🎯 Common Tasks & References

### Adding New Features
1. **Start with**: [`AGENTS.md`](./AGENTS.md) - Architecture principles
2. **Plan with**: Relevant system documentation (AI, Animation, Game, etc.)
3. **Implement in**: WASM first, then JS integration layer
4. **Test with**: [`TESTING.md`](./TESTING.md) procedures

### Debugging Issues
1. **Architecture problems**: [`AGENTS.md`](./AGENTS.md) troubleshooting section
2. **Combat issues**: [`5-BUTTON_COMBAT_IMPLEMENTATION.md`](./5-BUTTON_COMBAT_IMPLEMENTATION.md)
3. **AI behavior**: [`AI/ENEMY_AI.md`](./AI/ENEMY_AI.md) or [`AI/WOLF_AI.md`](./AI/WOLF_AI.md)
4. **Animation glitches**: [`ANIMATION/PLAYER_ANIMATIONS.md`](./ANIMATION/PLAYER_ANIMATIONS.md)

### Performance Optimization
1. **WASM optimization**: [`AGENTS.md`](./AGENTS.md) performance section
2. **Build optimization**: [`UTILS/BUILD_INSTRUCTIONS.md`](./UTILS/BUILD_INSTRUCTIONS.md)
3. **Testing performance**: [`UTILS/TEST_COVERAGE_IMPROVEMENTS.md`](./UTILS/TEST_COVERAGE_IMPROVEMENTS.md)

---

## 🧠 AI Agent Memory Aids

### Key Concepts to Remember
- **60+ WASM API functions** - Complete game state accessible from JS
- **8-phase core loop** - Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset
- **5-button combat** - Light Attack, Heavy Attack, Block/Parry, Roll, Special
- **Deterministic RNG** - All randomness handled in WASM with seeds
- **Performance targets** - <16ms frame time, <32MB memory, 60+ FPS

### File Naming Conventions
- **Core architecture**: `AGENTS.md` (main reference)
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
