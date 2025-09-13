# 🛠️ WASM-First Game Build Instructions

## Overview

This document provides comprehensive instructions for building the **DozedEnt WASM-first game framework**, including C++ game logic compilation to WebAssembly, balance data generation, and deployment to GitHub Pages.

> **Architecture**: All game logic lives in WASM (C++). JavaScript handles only rendering, input, and networking.

## Prerequisites

- **Node.js 20+** and npm installed
- **Emscripten SDK** (vendored in `emsdk/` directory)
- **Git** for version control
- **Modern web browser** with WebAssembly support

## 🚀 Primary Build Commands

### Install Dependencies
```bash
npm install
```

### WASM Production Build
```bash
npm run wasm:build        # Builds optimized game.wasm
```
**Output**: `./game.wasm` (~43KB optimized)

### WASM Development Build
```bash
npm run wasm:build:dev    # Builds with debug info and assertions
```
**Output**: `./game.wasm` (larger, with debugging)

### Host-Authoritative WASM
```bash
npm run wasm:build:host   # Builds multiplayer host module
```
**Output**: `./game-host.wasm`

### Build All WASM Modules
```bash
npm run wasm:build:all    # Builds both game.wasm and game-host.wasm
```

## 🔧 Build Process Details

### What Happens During Build

1. **Environment Setup**: Initializes Emscripten SDK from `emsdk/`
2. **Balance Generation**: Runs `generate-balance.cjs` to create `src/wasm/generated/balance_data.h`
3. **C++ Compilation**: Compiles `src/wasm/game.cpp` with all dependencies
4. **Optimization**: Applies `-O3` optimization and WASM-specific flags
5. **Output**: Generates standalone `.wasm` files in project root

### Build Flags Used

```bash
# Production build flags
em++ src/wasm/game.cpp \
    -O3 \                           # Maximum optimization
    -s STANDALONE_WASM=1 \          # Standalone WASM without JS glue
    -s WASM_BIGINT=1 \             # BigInt support for 64-bit integers
    -s EXPORT_ALL=0 \              # Export only marked functions
    -s ALLOW_MEMORY_GROWTH=1 \     # Dynamic memory allocation
    -o ./game.wasm
```

## 📁 Project Structure

```
DozedEnt/
├── src/wasm/                    # C++ game logic (WASM source)
│   ├── game.cpp                 # Main game module
│   ├── game-host.cpp           # Host-authoritative module
│   ├── internal_core.h         # Core game structures
│   ├── enemies.h               # Wolf AI and pack behavior
│   ├── choices.h               # Choice system logic
│   ├── weapons.h               # Combat system
│   └── generated/              # Auto-generated files
│       └── balance_data.h      # Generated from JSON
├── data/balance/               # Externalized game constants
│   ├── player.json             # Player stats and abilities
│   └── enemies.json            # Enemy stats and behaviors
├── emsdk/                      # Emscripten SDK (vendored)
├── tools/scripts/              # Build automation
│   ├── build-wasm.ps1         # Windows WASM build
│   ├── build-wasm.sh          # Linux/macOS WASM build
│   └── generate-balance.cjs    # Balance data generator
├── docs/                       # GitHub Pages deployment
│   ├── game.wasm              # Deployed game module
│   ├── index.html             # Game UI
│   └── js/src/               # JavaScript integration layer
├── src/                        # JavaScript integration layer
│   ├── ui/                    # UI components (rendering only)
│   ├── input/                 # Input handling (forward to WASM)
│   ├── audio/                 # Audio system
│   └── netcode/              # Multiplayer networking
├── test/                      # Testing infrastructure
│   ├── unit/                  # 50+ unit test files
│   └── setup-browser-mocks.js # Comprehensive API mocking
├── GUIDELINES/                 # Complete documentation
├── game.wasm                   # Built game module (output)
└── game-host.wasm             # Built host module (output)
```

## 🧪 Testing & Validation

### Local Development Server
```bash
# Start development server
npm run dev

# Or use Python HTTP server
cd docs
python3 -m http.server 8080
```

### Build Validation
```bash
# Test WASM build
npm run wasm:build
ls -la game.wasm          # Should exist and be ~43KB

# Run unit tests
npm run test:unit

# Run full test suite
npm test
```

### Performance Validation
- **Binary Size**: game.wasm should be ~43KB optimized
- **Load Time**: < 100ms WASM instantiation
- **Frame Rate**: 60+ FPS with < 16ms frame time
- **Memory Usage**: < 32MB total WASM memory

## 🔗 WASM Integration in JavaScript

### Loading WASM Module
```javascript
// Using WasmManager (recommended)
import { WasmManager } from './src/wasm/wasm-manager.js';

const wasmManager = new WasmManager();
await wasmManager.initialize();

// Access WASM exports
const wasmModule = wasmManager.exports;
```

### Basic Game Loop Integration
```javascript
// Initialize game
wasmModule.init_run(12345, 0);  // seed, start_weapon

// Game loop
function gameLoop(deltaTime) {
    // 1. Forward inputs to WASM
    wasmModule.update(inputX, inputY, isRolling, deltaTime);
    
    // 2. Read state for rendering
    const playerX = wasmModule.get_x();
    const playerY = wasmModule.get_y();
    const stamina = wasmModule.get_stamina();
    const phase = wasmModule.get_phase();
    
    // 3. Update UI (JavaScript rendering only)
    renderPlayer(playerX, playerY);
    updateStaminaBar(stamina);
    handlePhaseTransitions(phase);
    
    requestAnimationFrame(gameLoop);
}
```

## 🚨 Troubleshooting

### WASM Build Failures

#### Emscripten Not Found
```bash
# Initialize Emscripten environment
source ./emsdk/emsdk_env.sh  # Linux/macOS
# OR
.\emsdk\emsdk_env.ps1       # Windows PowerShell
```

#### Balance Generation Fails
```bash
# Manually generate balance data
node tools/scripts/generate-balance.cjs

# Check JSON syntax
npx jsonlint data/balance/player.json
npx jsonlint data/balance/enemies.json
```

#### Build Optimization Issues
```bash
# Try development build first
npm run wasm:build:dev

# If dev works, then try production
npm run wasm:build
```

### Runtime Issues

#### WASM Module Won't Load
```javascript
// Debug WASM loading
fetch('game.wasm')
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.instantiate(bytes))
    .catch(error => console.error('WASM load failed:', error));
```

**Common causes**:
- CORS issues with local server
- WASM binary corruption  
- Missing Emscripten flags
- Browser compatibility

#### Multiplayer Desync
**Symptoms**: Different game states across clients

```bash
# Verify deterministic behavior
npm run test:golden
```

**Check for**:
- WASM module versions match
- Seed synchronization
- Math.random() usage in gameplay
- Input timestamp handling

## 📈 Performance Optimization

### Build Optimization
```bash
# Maximum optimization
npm run wasm:build          # Uses -O3 optimization

# Profile build size
ls -la game.wasm            # Should be ~43KB
wasm-opt --print-size game.wasm
```

### Runtime Optimization
1. **Batch WASM calls**: Read all state once per frame
2. **Minimize boundary crossings**: Group related operations
3. **Profile regularly**: Use browser dev tools
4. **Memory management**: Monitor WASM memory usage

### Performance Targets
| Metric | Target | Critical |
|--------|--------|---------|
| Build Size | ~43KB | <100KB |
| Load Time | <100ms | <500ms |
| Frame Time | <16ms | <33ms |
| Memory | <32MB | <64MB |

## 🚀 Deployment

### GitHub Pages (Automatic)
```bash
# Build and commit
npm run wasm:build
git add game.wasm docs/
git commit -m "Update WASM build"
git push origin main

# GitHub Actions will deploy automatically
```

### Manual Deployment
```bash
# Copy WASM to docs for GitHub Pages
cp game.wasm docs/
cp game-host.wasm docs/wasm/

# Validate deployment
npm run validate:github-pages
```

## 📚 Related Documentation

- **[BUILD/API.md](../BUILD/API.md)** - Complete WASM API reference
- **[BUILD/DEVELOPMENT_WORKFLOW.md](../BUILD/DEVELOPMENT_WORKFLOW.md)** - Development process
- **[BUILD/TESTING.md](../BUILD/TESTING.md)** - Testing framework
- **[AGENTS.md](../AGENTS.md)** - Architecture overview
- **[UTILS/QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference for AI agents

---

*This build guide is specifically for the WASM-first DozedEnt game architecture. For questions about the build process, consult the BUILD/ documentation folder.*