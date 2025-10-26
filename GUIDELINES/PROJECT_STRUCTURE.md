# 📁 DozedEnt Project Structure

## 🎯 GitHub Pages Optimized Structure

This document outlines the improved project structure following GitHub Pages best practices and modern web development standards.

---

## 🏗️ Directory Structure

```
DozedEnt/
├── 📄 README.md                    # Main project documentation
├── 📄 LICENSE                      # MIT License
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 package-lock.json            # Dependency lock file
├── 📄 _config.yml                  # Jekyll configuration (root)
├── 📄 game.wasm                    # Main WebAssembly module
├── 📄 favicon.ico                  # Site favicon
├── 📄 mocha.opts                   # Mocha test configuration
├── 📄 index.html                   # Root redirect to public/
├── 📄 GETTING_STARTED.md           # Getting started guide
├── 📄 BUILD_REPORT.json            # Build report data
├── 📄 BUILD_REPORT.md              # Build report documentation
├── 📄 WASM_EXPORTS.json            # WASM exports reference
├── 📄 serve-dev.js                 # Development server
├── 📄 test-wasm-node.js            # WASM testing utility
├── 📄 tmp_modify.py                # Temporary modification script
│
├── 📂 public/                      # 🌐 GitHub Pages deployment directory
│   ├── 📄 index.html               # Main game page
│   ├── 📄 favicon.ico              # Site favicon
│   ├── 📄 _config.yml              # Jekyll configuration for GitHub Pages
│   ├── 📄 _headers                  # HTTP headers configuration
│   ├── 📄 IMPLEMENTATION_STATUS_SUMMARY.md
│   ├── 📄 demo.html                # Demo page
│   ├── 📄 multiplayer.html         # Multiplayer demo
│   ├── 📄 wasm-test.html           # WASM testing page
│   ├── 📄 test-animation.html      # Animation testing
│   ├── 📄 test-player-movement.html # Player movement testing
│   ├── 📄 create-sprite-sheet.html # Sprite sheet creation
│   ├── 📄 integration-test.js      # Integration testing
│   ├── 📄 WASM_EXPORTS.json        # WASM exports reference
│   ├── 📂 src/                     # JavaScript source modules
│   │   ├── 📂 ai/                  # Enemy AI systems
│   │   ├── 📂 animation/           # Animation systems ⭐ **DUAL SYSTEM**
│   │   │   ├── 📂 player/          # Player animation systems
│   │   │   │   ├── 📂 physics/     # Top-down physics animation
│   │   │   │   │   └── index.js    # PlayerPhysicsAnimator
│   │   │   │   ├── 📂 procedural/  # Biomechanical procedural animation
│   │   │   │   │   ├── player-animator.js        # AnimatedPlayer (main wrapper)
│   │   │   │   │   ├── player-procedural-animator.js # ProceduralAnimator
│   │   │   │   │   ├── player-procedural-rig.js  # 29-joint skeleton
│   │   │   │   │   ├── AnimatedPlayerRefactored.js # Refactored player
│   │   │   │   │   └── 📂 modules/ # 9 animation modules
│   │   │   │   │       ├── arm-ik-module.js
│   │   │   │   │       ├── combat-module.js
│   │   │   │   │       ├── core-posture-module.js
│   │   │   │   │       ├── environment-module.js
│   │   │   │   │       ├── foot-ik-module.js
│   │   │   │   │       ├── head-gaze-module.js
│   │   │   │   │       ├── locomotion-module.js
│   │   │   │   │       ├── secondary-motion-module.js
│   │   │   │   │       └── spine-module.js
│   │   │   │   ├── 📂 coordinator/ # Animation coordination
│   │   │   │   │   └── PlayerAnimationCoordinator.js
│   │   │   │   ├── 📂 manager/     # Player action management
│   │   │   │   │   └── PlayerActionManager.js
│   │   │   │   ├── 📂 viewmodel/   # Player state view model
│   │   │   │   │   └── PlayerStateViewModel.js
│   │   │   │   └── IntegratedPlayerController.js # Complete integration
│   │   │   ├── 📂 abilities/       # Character ability animations
│   │   │   │   ├── ability-animation-base.js
│   │   │   │   ├── warden-bash-animation.js
│   │   │   │   ├── raider-charge-animation.js
│   │   │   │   └── kensei-dash-animation.js
│   │   │   ├── 📂 system/          # Core animation systems
│   │   │   │   ├── animation-system.js      # CharacterAnimator
│   │   │   │   ├── animation-events.js      # Event system
│   │   │   │   ├── animation-sync.js        # Multiplayer sync
│   │   │   │   ├── animation-performance.js # Performance monitoring
│   │   │   │   └── combo-system.js          # Combo detection
│   │   │   └── 📂 enemy/           # Enemy animation systems
│   │   │       └── wolf-animation.js        # Wolf animation system
│   │   ├── 📂 renderer/            # Rendering systems ⭐ **NEW**
│   │   │   └── 📂 player/          # Player rendering
│   │   │       ├── TopDownPlayerRenderer.js  # Dual animation system renderer
│   │   │       └── 📂 topdown/     # Top-down rendering utilities
│   │   │           ├── skeleton.js   # Skeleton drawing
│   │   │           ├── indicators.js # Visual indicators
│   │   │           ├── transform.js  # Transform utilities
│   │   │           ├── shadow.js     # Shadow rendering
│   │   │           ├── scale.js      # Scaling utilities
│   │   │           └── utils.js      # Helper functions
│   │   ├── 📂 audio/               # Audio management
│   │   ├── 📂 css/                 # Stylesheets
│   │   ├── 📂 effects/             # Visual effects
│   │   ├── 📂 game/                # Core game logic ⭐ **ENHANCED**
│   │   │   ├── 📂 abilities/       # Character abilities
│   │   │   │   ├── ability-manager.js       # Ability coordination
│   │   │   │   ├── warden-abilities.js      # Warden bash ability
│   │   │   │   ├── raider-abilities.js      # Raider charge ability
│   │   │   │   └── kensei-abilities.js      # Kensei dash ability
│   │   │   ├── 📂 coordinators/    # Game coordinators ⭐ **NEW**
│   │   │   │   ├── AbilityCoordinator.js    # Ability system coordination
│   │   │   │   ├── InputCoordinator.js      # Input processing coordination
│   │   │   │   ├── RenderingCoordinator.js  # Rendering coordination
│   │   │   │   ├── SpawnCoordinator.js      # Entity spawning coordination
│   │   │   │   └── StateCoordinator.js      # Game state coordination
│   │   │   ├── 📂 input/           # Input handling
│   │   │   │   └── InputMapper.js           # Input mapping system
│   │   │   ├── 📂 loop/            # Game loop management
│   │   │   │   ├── GameLoopCoordinator.js   # Main game loop
│   │   │   │   └── MVPLoop.js               # MVP loop implementation
│   │   │   ├── 📂 progression/     # Character progression
│   │   │   │   └── progression-manager.js   # Progression system
│   │   │   ├── 📂 renderer/        # Game renderer
│   │   │   │   └── GameRenderer.js          # Main game renderer
│   │   │   ├── 📂 replay/          # Replay system ⭐ **NEW**
│   │   │   │   ├── ReplayManager.js         # Replay recording/playback
│   │   │   │   ├── ReplayRecorder.js        # Recording functionality
│   │   │   │   └── ReplayPlayer.js          # Playback functionality
│   │   │   ├── 📂 state/           # State management ⭐ **NEW**
│   │   │   │   └── WasmCoreState.js         # WASM state facade
│   │   │   └── 📂 ui/              # UI management
│   │   │       └── UIManager.js             # UI coordination
│   │   ├── 📂 gameentity/          # Game entities
│   │   │   ├── wolf-character.js           # Wolf character class
│   │   │   └── controls.js                # Mobile game controls
│   │   ├── 📂 gameplay/            # Gameplay systems
│   │   ├── 📂 images/              # Image assets
│   │   ├── 📂 input/               # Input handling
│   │   ├── 📂 lobby/               # Lobby system
│   │   ├── 📂 multiplayer/         # Multiplayer features
│   │   ├── 📂 netcode/             # Networking code
│   │   ├── 📂 ui/                  # User interface
│   │   ├── 📂 utils/               # Utility functions
│   │   ├── 📂 wasm/                # WebAssembly integration ⭐ **MODULAR**
│   │   │   ├── 📂 initializer/    # WASM initialization
│   │   │   │   ├── WasmInitializer.js    # Module loading
│   │   │   │   └── runtime.js            # Runtime initialization
│   │   │   ├── 📂 core/           # Core WASM state management
│   │   │   │   ├── WasmCoreState.js      # State reading and caching
│   │   │   │   └── WasmCombatSystem.js   # Combat operations
│   │   │   ├── 📂 phases/         # Phase management
│   │   │   │   └── WasmPhaseManagers.js  # Phase-specific functions
│   │   │   ├── 📂 world/          # World simulation
│   │   │   │   └── WasmWorldSimulation.js # World state management
│   │   │   ├── 📂 managers/       # WASM managers (C++)
│   │   │   │   ├── PlayerManager.h/.cpp   # Player state management
│   │   │   │   ├── CombatManager.h/.cpp  # Combat system
│   │   │   │   ├── GameStateManager.h/.cpp # Game state
│   │   │   │   └── InputManager.h/.cpp    # Input processing
│   │   │   ├── 📂 coordinators/   # WASM coordinators (C++)
│   │   │   │   └── GameCoordinator.h/.cpp # Main game coordination
│   │   │   ├── 📂 physics/        # Physics system (C++)
│   │   │   │   ├── PhysicsManager.h/.cpp # Physics simulation
│   │   │   │   ├── PhysicsTypes.h         # Physics data types
│   │   │   │   ├── FixedPoint.h           # Fixed-point math
│   │   │   │   └── SkeletonPhysics.h      # Skeleton physics
│   │   │   ├── 📂 progression/    # Character progression (C++)
│   │   │   │   ├── AbilityUpgradeSystem.h/.cpp # Ability upgrades
│   │   │   │   └── ProgressionManager.h/.cpp   # Progression logic
│   │   │   ├── game_refactored.cpp        # Main WASM entry point
│   │   │   ├── WasmTypes.d.ts            # TypeScript definitions
│   │   │   └── README.md                  # WASM documentation
│   │   ├── 📂 sound/               # Sound system
│   │   ├── 📂 managers/            # Game managers
│   │   ├── 📂 config/              # Configuration files
│   │   ├── 📂 demo/                # Demo components
│   │   └── 📂 templates/           # Template files
│   ├── 📂 core/                    # Core networking modules
│   ├── 📂 wasm/                    # WebAssembly modules
│   │   ├── 📄 game.wasm            # Main game engine
│   │   └── 📄 game-host.wasm       # Host-authoritative module
│   └── 📂 data/                    # Game data
│       └── 📂 balance/             # Balance configuration
│           ├── 📄 enemies.json     # Enemy stats
│           └── 📄 player.json      # Player stats
│
├── 📂 public/src/wasm/             # 💻 C++ WebAssembly Source (WASM logic) ⭐ **WASM-FIRST**
│   ├── 📄 game_refactored.cpp      # Main game entry point with WASM exports
│   ├── 📄 GameGlobals.cpp          # Global game state
│   ├── 📄 GameGlobals.h            # Global state header
│   ├── 📂 managers/                # Manager pattern (single responsibility)
│   │   ├── 📄 CombatManager.cpp/h    # Combat system (attack, block, parry)
│   │   ├── 📄 GameStateManager.cpp/h # Game state & phase management
│   │   ├── 📄 InputManager.cpp/h     # Input processing & validation
│   │   ├── 📄 PlayerManager.cpp/h    # Player state & resources
│   │   ├── 📄 WolfManager.cpp/h      # Wolf AI and behavior
│   │   └── 📄 README.md              # Manager documentation
│   ├── 📂 coordinators/            # Coordinator pattern (orchestration)
│   │   └── 📄 GameCoordinator.cpp/h  # Coordinates all managers
│   ├── 📂 physics/                 # Physics system (deterministic)
│   │   ├── 📄 PhysicsManager.cpp/h   # Physics simulation
│   │   ├── 📄 PhysicsTypes.h         # Physics type definitions
│   │   └── 📄 FixedPoint.h           # Fixed-point math for determinism
│   ├── 📂 progression/             # Character progression (C++)
│   │   ├── 📄 AbilityUpgradeSystem.cpp/h # Ability upgrades
│   │   └── 📄 ProgressionManager.cpp/h   # Progression logic
│   ├── 📂 entities/                # Game entities (C++)
│   │   └── 📄 PhysicsBarrel.cpp    # Physics-enabled barrel entity
│   └── 📂 generated/               # Auto-generated files
│       └── 📄 balance_data.h       # Balance data from JSON
│
├── 📂 data/                        # 📊 Game data
│   └── 📂 balance/                 # Balance configuration
│       ├── 📄 enemies.json         # Enemy stats
│       └── 📄 player.json          # Player stats
│
├── 📂 GUIDELINES/                  # 📚 Development documentation
│   ├── 📄 AGENTS.md                # Main architecture guide ⭐ **PRIMARY REFERENCE**
│   ├── 📄 PROJECT_STRUCTURE.md     # This file - Project layout
│   ├── 📄 PUBLIC_DEPLOYMENT.md     # Deployment guide
│   ├── 📄 SERVER_CONFIG.md         # Server configuration
│   ├── 📄 WASM_FEATURE_IMPLEMENTATION_GUIDE.md # WASM feature guide
│   ├── 📂 ADR/                     # Architecture Decision Records ⭐ **NEW**
│   │   ├── 📄 ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md # Physics consolidation
│   │   ├── 📄 ADR-002-MATH-RANDOM-ELIMINATION.md   # RNG determinism
│   │   └── 📄 ADR-003-STATE-MANAGER-CONSOLIDATION.md # State management
│   ├── 📂 AI/                      # AI documentation (3 files)
│   │   ├── 📄 ENEMY_AI.md          # Enemy AI system overview
│   │   ├── 📄 ENEMY_TEMPLATE.md    # Enemy design template
│   │   └── 📄 WOLF_AI.md           # Wolf-specific AI
│   ├── 📂 ANIMATION/               # Animation documentation (13 files)
│   │   ├── 📄 ANIMATION_SYSTEM_INDEX.md         # System overview ⭐
│   │   ├── 📄 ANIMATION_ARCHITECTURE.md         # Architecture details
│   │   ├── 📄 TOPDOWN_PHYSICS_ANIMATION.md      # Physics animation
│   │   ├── 📄 PLAYER_ANIMATIONS.md              # Player animations
│   │   ├── 📄 ANIMATION_EVENTS.md               # Event system
│   │   ├── 📄 COMBO_SYSTEM.md                   # Combo system
│   │   ├── 📄 ABILITY_ANIMATIONS.md             # Ability animations
│   │   ├── 📄 HUMAN_MOTION_IMPROVEMENTS.md      # Procedural design
│   │   └── [5 more files]          # Additional animation docs
│   ├── 📂 BUILD/                   # Build documentation (4 files)
│   │   ├── 📄 API.md               # WASM API reference ⭐ **CANONICAL**
│   │   ├── 📄 DEVELOPMENT_WORKFLOW.md # Development cycle
│   │   ├── 📄 TESTING.md           # Testing framework
│   │   └── 📄 WASM_BUILD_WORKFLOW.md # Build workflow
│   ├── 📂 FIGHT/                   # Combat documentation (5 files)
│   │   ├── 📄 COMBAT_SYSTEM.md     # Combat system overview
│   │   ├── 📄 3-BUTTON_COMBAT_IMPLEMENTATION.md # Combat controls
│   │   └── [3 more files]          # Combat implementation docs
│   ├── 📂 GAME/                    # Game loop documentation (3 files)
│   │   ├── 📄 GAME_FEATURES_SUMMARY.md # Core loop features
│   │   ├── 📄 CORE_LOOP_CHECKLIST.md # Validation checklist
│   │   └── 📄 EMERGENT_GAMEPLAY_EXAMPLES.md # Gameplay examples
│   ├── 📂 MULTIPLAYER/             # Multiplayer documentation (7 files)
│   │   ├── 📄 LOBBY_SYSTEM.md      # Lobby implementation
│   │   ├── 📄 ROOM_SYSTEM.md       # Room system
│   │   └── [5 more files]          # Network implementation docs
│   ├── 📂 SKELETON/                # Skeleton system (5 files)
│   │   ├── 📄 README.md            # Skeleton overview
│   │   └── [4 more files]          # Skeleton implementation
│   ├── 📂 SYSTEMS/                 # Systems documentation (13 files)
│   │   ├── 📄 PHYSICS_ARCHITECTURE.md # Physics system
│   │   ├── 📄 GAMEPLAY_MECHANICS.md   # Gameplay mechanics
│   │   ├── 📄 QUICK_COLLISION_REFERENCE.md # Collision reference
│   │   └── [10 more files]         # System documentation
│   ├── 📂 UI/                      # UI documentation (8 files)
│   │   ├── 📄 ENHANCED_UI_SYSTEMS_README.md # UI systems
│   │   └── [7 more files]          # UI implementation docs
│   ├── 📂 UTILS/                   # Utilities documentation (10 files)
│   │   ├── 📄 BUILD_INSTRUCTIONS.md # Build instructions
│   │   ├── 📄 BALANCE_DATA.md      # Balance data guide
│   │   ├── 📄 MIGRATION_GUIDE.md   # Migration guide
│   │   └── [7 more files]          # Utility documentation
│   └── 📂 WASM/                    # WASM documentation (7 files)
│       ├── 📄 DEMO_DEVELOPMENT.md  # Feature implementation
│       ├── 📄 README.md            # WASM overview
│       └── [5 more files]          # WASM implementation docs
│
├── 📂 archive/                     # 🗄️ Legacy code archive
│   └── 📂 legacy-wasm/             # Archived WASM files (cleanup Sept 2025)
│       ├── 📄 README.md            # Archive documentation
│       ├── 📄 game.cpp             # Original monolithic implementation (2,745 lines)
│       └── 📂 headers/             # 27 legacy header-only files
│           ├── 📄 enemies.h        # Enemy AI definitions (1,354 lines)
│           ├── 📄 internal_core.h  # Core game structures
│           ├── 📄 status_effects.h # Status effect system
│           └── ... 24 more files   # See CLEANUP_PLAN.md
│
├── 📂 tools/                       # 🛠️ Development tools
│   ├── 📄 API.md                   # API documentation
│   ├── 📄 GETTING_STARTED.md       # Tools getting started
│   ├── 📂 config/                  # Configuration files
│   │   ├── 📄 eslint.config.js     # ESLint configuration
│   │   ├── 📄 playwright.config.js # Playwright configuration
│   │   ├── 📄 rollup.config.js     # Main Rollup config
│   │   ├── 📄 rollup.config.animations.js # Animations build
│   │   └── 📄 rollup.config.wolf.js # Wolf build config
│   ├── 📂 scripts/                 # Build and utility scripts
│   │   ├── 📄 build-docs.js        # Documentation builder
│   │   ├── 📄 build-public.js      # Public build script
│   │   ├── 📄 build-wasm.sh        # WASM build script
│   │   ├── 📄 build-wasm.ps1       # WASM build script (Windows)
│   │   ├── 📄 deploy.sh            # Deployment script
│   │   ├── 📄 server.js            # Development server
│   │   ├── 📄 generate-balance.js  # Balance data generator
│   │   ├── 📄 generate-sprite-sheet.js # Sprite sheet generator
│   │   ├── 📄 performance-optimizer.js # Performance optimization
│   │   └── [25+ more build scripts]
│   └── 📂 build/                   # Build tools and utilities
│
├── 📂 test/                        # 🧪 Test files
│   ├── 📂 unit/                    # Unit tests (61+ files) ⭐ **ENHANCED**
│   │   ├── 📂 coordinators/        # Coordinator tests ⭐ **NEW**
│   │   │   ├── AbilityCoordinator.test.js
│   │   │   ├── InputCoordinator.test.js
│   │   │   ├── RenderingCoordinator.test.js
│   │   │   ├── SpawnCoordinator.test.js
│   │   │   └── StateCoordinator.test.js
│   │   ├── 📂 replay/              # Replay system tests ⭐ **NEW**
│   │   │   ├── ReplayManager.test.js
│   │   │   ├── ReplayRecorder.test.js
│   │   │   └── ReplayPlayer.test.js
│   │   ├── 📂 state/               # State management tests ⭐ **NEW**
│   │   │   └── WasmCoreState.test.js
│   │   └── [53+ other test files]  # Existing unit tests
│   ├── 📂 integration/             # Integration tests (3 files)
│   ├── 📂 performance/             # Performance tests (2 files)
│   ├── 📂 ai/                      # AI tests (1 file)
│   ├── 📂 animation/               # Animation tests (1 file)
│   ├── 📂 physics/                 # Physics tests (2 files)
│   ├── 📂 certs/                   # Test certificates
│   ├── 📄 run-coordinator-tests.js # Coordinator test runner ⭐ **NEW**
│   ├── 📄 run-ui-tests.js          # UI test runner
│   ├── 📄 [20+ test spec files]    # Various test specifications
│   ├── 📄 setup.js                 # Test setup
│   ├── 📄 setup-browser-mocks.js   # Browser environment mocks
│   ├── 📄 tests.js                 # Test runner
│   └── 📄 [10+ test HTML files]    # Browser test pages
│
├── 📂 demos/                       # 🎮 Demo files
│   ├── 📄 comprehensive-module-test.html
│   ├── 📄 test-module-loading.html
│   └── 📂 dist/                    # Demo distribution files
│
├── 📂 build/                       # 📦 Build artifacts
│   ├── 📄 _config.yml              # Build configuration
│   ├── 📄 index.js                 # Built index
│   ├── 📄 README.md                # Build documentation
│   ├── 📂 animations/              # Animation builds
│   ├── 📂 core/                    # Core builds
│   ├── 📂 legacy/                  # Legacy builds
│   ├── 📂 reports/                 # Build reports
│   ├── 📂 sourcemaps/              # Source maps
│   └── 📂 wasm/                    # WASM builds
│
├── 📂 dist/                        # 📦 Distribution files
│   ├── 📄 index.js                 # Distribution index
│   ├── 📄 README.md                # Distribution documentation
│   ├── 📂 animations/              # Animation distributions
│   ├── 📂 core/                    # Core distributions
│   ├── 📂 legacy/                  # Legacy distributions
│   ├── 📂 reports/                 # Distribution reports
│   ├── 📂 sourcemaps/              # Source maps
│   └── 📂 wasm/                    # WASM distributions
│
├── 📂 coverage/                    # 📊 Test coverage reports
│   ├── 📄 index.html               # Coverage report
│   ├── 📄 coverage-final.json      # Coverage data
│   ├── 📄 lcov.info                # LCOV coverage data
│   └── 📂 lcov-report/             # LCOV report files
│
├── 📂 emsdk/                       # 🔧 Emscripten SDK
│   ├── 📄 emsdk.py                 # Emscripten SDK manager
│   ├── 📄 emsdk_env.sh             # Environment setup (Linux/Mac)
│   ├── 📄 emsdk_env.bat            # Environment setup (Windows)
│   ├── 📄 emsdk_env.ps1            # Environment setup (PowerShell)
│   ├── 📂 upstream/                # Upstream Emscripten
│   ├── 📂 node/                    # Node.js for Emscripten
│   ├── 📂 python/                  # Python for Emscripten
│   └── 📂 [build tools and configs]
│
├── 📂 test-results/                # 🧪 Test results
├── 📂 node_modules/                # 📦 Node.js dependencies
└── 📄 .gitignore                   # Git ignore rules
```

---

## 🎯 Key Improvements

### 1. 🌐 GitHub Pages Structure
- **`public/` directory** - Standard GitHub Pages deployment folder
- **Proper Jekyll configuration** - Optimized for WebAssembly and modern JS
- **Asset organization** - Clean separation of deployment assets
- **Automated deployment** - GitHub Actions workflow for CI/CD

### 2. 🛠️ Development Organization
- **`tools/` directory** - Centralized development tools
- **Configuration separation** - All configs in `tools/config/`
- **Script organization** - Build and utility scripts in `tools/scripts/`
- **Demo separation** - Example files in dedicated `demos/` folder

### 3. 🏗️ Coordinator Pattern Implementation ⭐ **NEW**
- **Game Coordinators** - `public/src/game/coordinators/` for game logic coordination
- **Single Responsibility** - Each coordinator handles one specific concern
- **Modular Design** - Easy to test, maintain, and extend
- **Clear Separation** - Ability, Input, Rendering, Spawn, and State coordination

### 4. 🎮 State Management ⭐ **NEW**
- **WasmCoreState** - Single source of truth facade over WASM
- **Replay System** - Complete replay recording and playback functionality
- **State Coordination** - Centralized state management through StateCoordinator
- **Read-Only JS** - JavaScript reads WASM state, never mutates

### 5. 📚 Documentation Structure
- **Architecture Decision Records (ADRs)** - `GUIDELINES/ADR/` for key decisions
- **Comprehensive README** - Clear project overview and quick start
- **Live demo documentation** - Dedicated public/README.md for GitHub Pages
- **Maintained guidelines** - Enhanced GUIDELINES/ structure with ADRs
- **Project structure guide** - This document for navigation

### 6. ⚡ Performance Optimization
- **Asset optimization** - Proper MIME types for WASM files
- **Build optimization** - Efficient bundling and minification
- **Caching strategy** - Proper cache headers for static assets
- **Load time optimization** - Lazy loading and code splitting

---

## 🚀 Deployment Process

### GitHub Pages Deployment
1. **Automatic Triggers** - Push to main/master branch
2. **Build Process** - GitHub Actions builds WASM and bundles JS
3. **Asset Processing** - Copies optimized assets to public/
4. **Jekyll Processing** - GitHub Pages serves with proper MIME types
5. **Live Update** - Site updates automatically within minutes

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:all

# Test the build
npm test
```

---

## 📋 File Purpose Guide

### Core Game Files
- **`game.wasm`** - Main WebAssembly game engine
- **`public/index.html`** - Main game page with UI elements
- **`public/src/`** - JavaScript game modules and UI
- **`src/game_refactored.cpp`** - C++ game logic (compiled to WASM)

### Configuration Files
- **`package.json`** - Node.js project configuration
- **`_config.yml`** - Jekyll configuration for GitHub Pages
- **`tools/config/*.js`** - Build tool configurations

### Documentation
- **`README.md`** - Main project documentation
- **`GUIDELINES/`** - Comprehensive development guides
- **`PROJECT_STRUCTURE.md`** - This structure guide
- **`GETTING_STARTED.md`** - Getting started guide
- **`BUILD_REPORT.md`** - Build documentation

### Development Tools
- **`tools/scripts/`** - Build and utility scripts (34 files)
- **`tools/config/`** - Configuration files (5 files)
- **`tools/build/`** - Build tools and utilities
- **`emsdk/`** - Emscripten SDK for WASM compilation

---

## 🔄 Recent Improvements (January 2025)

### Architecture Enhancements ⭐
- ✅ **Coordinator Pattern** - Modular game logic coordination (`public/src/game/coordinators/`)
- ✅ **State Management** - Single source of truth with WasmCoreState facade
- ✅ **Replay System** - Complete replay recording and playback functionality
- ✅ **ADR Documentation** - Architecture Decision Records for key decisions
- ✅ **Test Coverage** - Enhanced test suite with coordinator, replay, and state tests

### Code Quality & Organization
- ✅ Clean separation of concerns with coordinator pattern
- ✅ Single Responsibility Principle enforced (<500 lines per file)
- ✅ Modular design with clear interfaces
- ✅ Improved developer experience with better organization
- ✅ Better project maintainability with focused modules

### Documentation & Structure
- ✅ Accurate documentation of actual structure
- ✅ WASM-first architecture properly documented
- ✅ ADR system for tracking architectural decisions
- ✅ Enhanced GUIDELINES structure with subdirectories
- ✅ Clear file organization and navigation

### Development Workflow
- ✅ GitHub Pages best practices maintained
- ✅ Automated CI/CD deployment
- ✅ Organized development tools in `tools/`
- ✅ Comprehensive test infrastructure
- ✅ Clear build and deployment processes

---

## 📝 Next Steps

1. **Continue Coordinator Implementation** - Expand coordinator pattern to remaining systems
2. **Enhance Replay System** - Add replay analysis and debugging tools
3. **Test Coverage** - Increase test coverage to >10% (currently 5.15%)
4. **Documentation** - Keep ADRs updated with new architectural decisions
5. **Performance** - Profile and optimize coordinator interactions
6. **Maintain structure accuracy** - Keep this document updated with actual project changes

---

## 📖 Related Documentation

- **[AGENTS.md](./AGENTS.md)** - Primary architecture guide and development principles
- **[ADR-001](./ADR/ADR-001-REMOVE-JAVASCRIPT-PHYSICS.md)** - JavaScript physics removal
- **[ADR-002](./ADR/ADR-002-MATH-RANDOM-ELIMINATION.md)** - Math.random() elimination
- **[ADR-003](./ADR/ADR-003-STATE-MANAGER-CONSOLIDATION.md)** - State manager consolidation

---

*Last Updated: January 2025*  
*This structure follows GitHub Pages best practices while maintaining the WASM-first architecture, coordinator pattern, and comprehensive documentation system.*
