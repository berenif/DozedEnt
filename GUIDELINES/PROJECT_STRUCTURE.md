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
│   ├── 📄 ANIMATION_IMPLEMENTATION_SUMMARY.md
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
│   │   ├── 📂 animation/           # Animation systems
│   │   ├── 📂 audio/               # Audio management
│   │   ├── 📂 css/                 # Stylesheets
│   │   ├── 📂 effects/             # Visual effects
│   │   ├── 📂 game/                # Core game logic
│   │   ├── 📂 gameentity/          # Game entities
│   │   ├── 📂 gameplay/            # Gameplay systems
│   │   ├── 📂 images/              # Image assets
│   │   ├── 📂 input/               # Input handling
│   │   ├── 📂 lobby/               # Lobby system
│   │   ├── 📂 multiplayer/         # Multiplayer features
│   │   ├── 📂 netcode/             # Networking code
│   │   ├── 📂 ui/                  # User interface
│   │   ├── 📂 utils/               # Utility functions
│   │   ├── 📂 wasm/                # WebAssembly integration
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
├── 📂 src/                         # 💻 C++ Source code (WASM)
│   ├── 📄 CMakeLists.txt           # CMake build configuration
│   ├── 📄 game_refactored.cpp      # Main game logic (C++)
│   ├── 📄 FEATURES_TO_SOURCE_MAP.md # Feature mapping documentation
│   ├── 📄 PHYSICS_PROGRESS.md      # Physics implementation progress
│   ├── 📄 README_REFACTORING.md    # Refactoring documentation
│   ├── 📂 coordinators/            # Game coordinators
│   │   ├── 📄 GameCoordinator.cpp  # Game coordination logic
│   │   └── 📄 GameCoordinator.h    # Game coordinator header
│   ├── 📂 core/                    # Core game systems
│   │   ├── 📄 GameGlobals.cpp      # Global game state
│   │   └── 📄 GameGlobals.h        # Global game state header
│   ├── 📂 managers/                # Game managers
│   │   ├── 📄 CombatManager.cpp    # Combat system
│   │   ├── 📄 CombatManager.h      # Combat system header
│   │   ├── 📄 GameStateManager.cpp # Game state management
│   │   ├── 📄 GameStateManager.h   # Game state header
│   │   ├── 📄 InputManager.cpp     # Input handling
│   │   ├── 📄 InputManager.h       # Input handling header
│   │   ├── 📄 PlayerManager.cpp    # Player management
│   │   ├── 📄 PlayerManager.h      # Player management header
│   │   ├── 📄 input-system-test.js # Input system testing
│   │   └── 📄 README.md            # Managers documentation
│   └── 📂 wasm/                    # WebAssembly integration
│       └── 📂 generated/           # Generated WASM files
│           └── 📄 balance_data.h   # Balance data header
│
├── 📂 data/                        # 📊 Game data
│   └── 📂 balance/                 # Balance configuration
│       ├── 📄 enemies.json         # Enemy stats
│       └── 📄 player.json          # Player stats
│
├── 📂 GUIDELINES/                  # 📚 Development documentation
│   ├── 📄 AGENTS.md                # Main architecture guide
│   ├── 📄 API.md                   # API documentation
│   ├── 📄 Feature-overview.md      # Feature overview
│   ├── 📄 MIME_TYPE_FIX.md         # MIME type fixes
│   ├── 📄 PROJECT_STRUCTURE.md     # This file
│   ├── 📄 PUBLIC_DEPLOYMENT.md     # Deployment guide
│   ├── 📂 AI/                      # AI documentation
│   ├── 📂 ANIMATION/               # Animation documentation
│   ├── 📂 BUILD/                   # Build documentation
│   ├── 📂 FIGHT/                   # Combat documentation
│   ├── 📂 GAME/                    # Game loop documentation
│   ├── 📂 MULTIPLAYER/             # Multiplayer documentation
│   ├── 📂 PAST CHOICES/            # Past choice documentation
│   ├── 📂 PROGRESS/                # Progress documentation
│   ├── 📂 SYSTEMS/                 # Systems documentation
│   ├── 📂 UI/                      # UI documentation
│   └── 📂 UTILS/                   # Utilities documentation
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
│   ├── 📂 unit/                    # Unit tests (53 files)
│   ├── 📂 integration/             # Integration tests
│   ├── 📂 performance/             # Performance tests
│   ├── 📂 ai/                      # AI tests
│   ├── 📂 animation/               # Animation tests
│   ├── 📂 certs/                   # Test certificates
│   ├── 📄 [20+ test spec files]    # Various test specifications
│   ├── 📄 setup.js                 # Test setup
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

### 3. 📚 Documentation Structure
- **Comprehensive README** - Clear project overview and quick start
- **Live demo documentation** - Dedicated public/README.md for GitHub Pages
- **Maintained guidelines** - Existing GUIDELINES/ structure preserved
- **Project structure guide** - This document for navigation

### 4. ⚡ Performance Optimization
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

## 🔄 Migration Benefits

### Before (Issues)
- ❌ Mixed deployment and development files
- ❌ Cluttered root directory
- ❌ Manual deployment process
- ❌ Inconsistent asset organization
- ❌ Difficult navigation for new developers
- ❌ Incorrect documentation of actual structure

### After (Improvements)
- ✅ Clean separation of concerns
- ✅ GitHub Pages best practices
- ✅ Automated CI/CD deployment
- ✅ Organized development tools
- ✅ Clear documentation structure
- ✅ Improved developer experience
- ✅ Better project maintainability
- ✅ Accurate documentation of actual structure
- ✅ WASM-first architecture properly documented

---

## 📝 Next Steps

1. **Update repository settings** - Enable GitHub Pages from public/ folder
2. **Configure custom domain** (optional) - Add CNAME file to public/
3. **Test deployment** - Verify automated build and deploy process
4. **Update documentation links** - Ensure all internal links work
5. **Monitor performance** - Check load times and optimization
6. **Maintain structure accuracy** - Keep this document updated with actual project changes

---

*This structure follows GitHub Pages best practices while maintaining the existing WASM-first architecture and comprehensive documentation system.*
