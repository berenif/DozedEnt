# 🛠️ WASM Feature Implementation Guide

**Complete reference for implementing new features and demos in the DozedEnt WASM-first architecture.**

Last Updated: September 30, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Build System Requirements](#build-system-requirements)
3. [File Structure](#file-structure)
4. [WASM Module Setup](#wasm-module-setup)
5. [Adding New Features](#adding-new-features)
6. [Creating Demos](#creating-demos)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## Overview

This guide documents everything needed to implement new features in the WASM-first architecture. Use this as a reference when:

- Adding new game systems (physics, AI, combat, etc.)
- Creating new demos to showcase features
- Debugging build or initialization issues
- Onboarding new developers to the codebase

**Architecture Principle**: ALL game logic in C++ WASM, JavaScript only for rendering/input/networking.

---

## Build System Requirements

### 1. File Locations

**Current Structure** (as of latest refactor):
```
public/src/wasm/
├── game_refactored.cpp          # Main entry point with WASM exports
├── GameGlobals.cpp/h             # Global state
├── managers/                     # Manager pattern classes
│   ├── CombatManager.cpp/h
│   ├── GameStateManager.cpp/h
│   ├── InputManager.cpp/h
│   └── PlayerManager.cpp/h
├── coordinators/                 # Coordinator pattern
│   └── GameCoordinator.cpp/h
├── physics/                      # Physics system
│   ├── PhysicsManager.cpp/h
│   ├── PhysicsTypes.h
│   └── FixedPoint.h
└── generated/                    # Auto-generated files
    └── balance_data.h
```

### 2. Build Script Configuration

**Location**: `tools/scripts/build-wasm.ps1` and `tools/scripts/build-wasm.sh`

**Required Updates When Adding Files**:

```powershell
# PowerShell (build-wasm.ps1)
$sourceFiles = @(
    "public/src/wasm/game_refactored.cpp",
    "public/src/wasm/GameGlobals.cpp",
    "public/src/wasm/managers/CombatManager.cpp",
    "public/src/wasm/managers/GameStateManager.cpp",
    "public/src/wasm/managers/InputManager.cpp",
    "public/src/wasm/managers/PlayerManager.cpp",
    "public/src/wasm/coordinators/GameCoordinator.cpp",
    "public/src/wasm/physics/PhysicsManager.cpp"
    # ADD YOUR NEW .cpp FILES HERE
)
```

```bash
# Bash (build-wasm.sh)
SOURCE_FILES="public/src/wasm/game_refactored.cpp public/src/wasm/GameGlobals.cpp ... YOUR_NEW_FILE.cpp"
```

**Include Paths**:
```
-Ipublic/src/wasm
-Ipublic/src/wasm/managers
-Ipublic/src/wasm/coordinators
-Ipublic/src/wasm/physics
# Add new include paths as needed
```

### 3. Build Commands

```bash
npm run wasm:build           # Production build (O3 optimization)
npm run wasm:build:dev       # Development build (O1, debug symbols)
npm run wasm:build:host      # Host-authoritative module
npm run wasm:build:all       # Build all modules
```

**Output**: `game.wasm` in project root (~18-50 KB depending on features)

---

## File Structure

### C++ Source Files

**Required Structure for New Managers**:

```cpp
// MyNewManager.h
#pragma once

class MyNewManager {
public:
    MyNewManager();
    ~MyNewManager() = default;
    
    void update(float delta_time);
    void reset();
    
    // Getters for WASM exports
    float get_some_value() const { return value_; }
    
private:
    float value_;
    // Keep state private
};
```

```cpp
// MyNewManager.cpp
#include "MyNewManager.h"
#include "../GameGlobals.h"
#include <cmath>
#include <algorithm>  // Required for std::min, std::max

MyNewManager::MyNewManager() : value_(0.0f) {
    // Initialize
}

void MyNewManager::update(float delta_time) {
    // Update logic
}
```

**Required Includes**:
- `<cmath>` - For math functions (sqrt, sin, cos, etc.)
- `<algorithm>` - For std::min, std::max, std::clamp
- `"../GameGlobals.h"` - For global state access
- Relative paths for cross-directory includes: `"../physics/PhysicsManager.h"`

---

## WASM Module Setup

### 1. Adding New WASM Exports

**Location**: `public/src/wasm/game_refactored.cpp`

```cpp
extern "C" {

// Export your new function
__attribute__((export_name("my_new_function")))
float my_new_function(float param1, int param2) {
    return g_coordinator.get_my_manager().compute(param1, param2);
}

// Export getter functions
__attribute__((export_name("get_my_value")))
float get_my_value() {
    return g_coordinator.get_my_manager().get_some_value();
}

} // extern "C"
```

**Supported Parameter Types**:
- Primitives: `int`, `float`, `double`
- BigInt: `int64_t` (with `-s WASM_BIGINT=1`)
- Pointers: `void*`, `char*` (for string passing)

**NOT Supported**:
- C++ classes/structs (use pointers or flatten to primitives)
- std::string (convert to C strings)
- Complex return types (return pointers or use out parameters)

### 2. JavaScript WASM Initialization

**Complete initialization pattern for demos**:

```javascript
// Create minimal WASI shim
function createWasiShim(getMemory) {
    return {
        fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
            let written = 0;
            const memory = getMemory();
            const dataView = new DataView(memory.buffer);
            const bytes = new Uint8Array(memory.buffer);
            let offset = iovPtr >>> 0;
            
            for (let i = 0; i < (iovCnt >>> 0); i++) {
                const ptr = dataView.getUint32(offset, true);
                const len = dataView.getUint32(offset + 4, true);
                offset += 8;
                const chunk = bytes.subarray(ptr, ptr + len);
                const text = new TextDecoder().decode(chunk);
                if (fd === 1) console.log(text);
                else if (fd === 2) console.error(text);
                written += len;
            }
            dataView.setUint32(nwrittenPtr >>> 0, written >>> 0, true);
            return 0;
        },
        proc_exit: (code) => { throw new Error(`WASI proc_exit: ${code}`); },
        random_get: (ptr, len) => {
            const memory = getMemory();
            const view = new Uint8Array(memory.buffer, ptr, len);
            crypto.getRandomValues(view);
            return 0;
        },
        clock_time_get: (_id, _precision, timePtr) => {
            const nowNs = BigInt(Date.now()) * 1000000n;
            const memory = getMemory();
            const dataView = new DataView(memory.buffer);
            dataView.setBigUint64(timePtr >>> 0, nowNs, true);
            return 0;
        },
        args_sizes_get: (argcPtr, argvBufSizePtr) => {
            const memory = getMemory();
            const dataView = new DataView(memory.buffer);
            dataView.setUint32(argcPtr >>> 0, 0, true);
            dataView.setUint32(argvBufSizePtr >>> 0, 0, true);
            return 0;
        },
        args_get: () => 0,
        environ_sizes_get: (envcPtr, envBufSizePtr) => {
            const memory = getMemory();
            const dataView = new DataView(memory.buffer);
            dataView.setUint32(envcPtr >>> 0, 0, true);
            dataView.setUint32(envBufSizePtr >>> 0, 0, true);
            return 0;
        },
        environ_get: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0
    };
}

async function initWasm() {
    try {
        const response = await fetch('../../game.wasm');
        if (!response.ok) {
            throw new Error(`Failed to load WASM: ${response.status}`);
        }
        
        const bytes = await response.arrayBuffer();
        
        // Compile module to check if it exports memory
        const module = await WebAssembly.compile(bytes);
        const moduleExports = WebAssembly.Module.exports(module);
        const exportsMemory = moduleExports.some(exp => exp.name === 'memory' && exp.kind === 'memory');
        
        console.log('WASM module exports memory:', exportsMemory);
        
        let memory;
        let imports = {
            env: {}  // Always provide env object
        };
        
        if (!exportsMemory) {
            // Module doesn't export memory, we need to provide it
            memory = new WebAssembly.Memory({ initial: 16, maximum: 256 });
            console.log('Providing JS memory to WASM');
            imports.env.memory = memory;
        } else {
            // Module exports its own memory
            console.log('WASM will use its own exported memory');
        }
        
        // Add standard env imports that WASM needs
        imports.env.abort = () => { throw new Error('wasm abort'); };
        imports.env.abort_ = () => { throw new Error('wasm abort_'); };
        imports.env.emscripten_notify_memory_growth = (memoryIndex) => {
            // Called when WASM memory grows (ALLOW_MEMORY_GROWTH=1)
        };
        
        // Memory getter for WASI shim
        const getMemory = () => memory;
        const wasiShim = createWasiShim(getMemory);
        imports.wasi_snapshot_preview1 = wasiShim;
        
        // Instantiate (returns Instance when passing Module)
        const instance = await WebAssembly.instantiate(module, imports);
        
        wasmExports = instance.exports;
        
        // Get the actual memory being used
        if (wasmExports.memory) {
            memory = wasmExports.memory;
            console.log('Using WASM exported memory');
        } else if (!memory) {
            throw new Error('No memory available');
        }
        
        // Check available functions
        console.log('Available WASM exports:', Object.keys(wasmExports).sort());
        
        // Initialize WASM
        if (typeof wasmExports.init_run === 'function') {
            wasmExports.init_run(BigInt(12345), 0);
        }
        
        return wasmExports;
        
    } catch (error) {
        console.error('WASM initialization failed:', error);
        throw error;
    }
}
```

**Critical Import Requirements**:

1. **`env` object** - Always required, even if empty
2. **`env.abort` and `env.abort_`** - Error handling functions
3. **`env.emscripten_notify_memory_growth`** - Required for `ALLOW_MEMORY_GROWTH=1`
4. **`env.memory`** - Only if WASM doesn't export its own
5. **`wasi_snapshot_preview1`** - Full WASI shim for file I/O, time, etc.

---

## Adding New Features

### Step-by-Step Process

#### 1. **Create C++ Manager/System**

```bash
# Create new manager files
touch public/src/wasm/managers/MyFeatureManager.h
touch public/src/wasm/managers/MyFeatureManager.cpp
```

**Header Template**:
```cpp
#pragma once

/**
 * MyFeatureManager - Brief description
 * Follows single responsibility principle
 */
class MyFeatureManager {
public:
    MyFeatureManager();
    ~MyFeatureManager() = default;
    
    // Main update loop
    void update(float delta_time);
    
    // Public interface
    void perform_action(float param);
    
    // Getters for WASM exports
    float get_value() const { return value_; }
    bool is_active() const { return active_; }
    
private:
    // Private state
    float value_;
    bool active_;
    
    // Private helpers
    void internal_logic();
};
```

#### 2. **Add to GameCoordinator**

```cpp
// coordinators/GameCoordinator.h
#include "../managers/MyFeatureManager.h"

class GameCoordinator {
private:
    MyFeatureManager my_feature_manager_;
    
public:
    MyFeatureManager& get_my_feature_manager() { return my_feature_manager_; }
};
```

```cpp
// coordinators/GameCoordinator.cpp
void GameCoordinator::update(float dirX, float dirY, bool isRolling, float dtSeconds) {
    // ... existing updates ...
    my_feature_manager_.update(dtSeconds);
}
```

#### 3. **Export WASM Functions**

```cpp
// game_refactored.cpp
extern "C" {

__attribute__((export_name("perform_my_action")))
void perform_my_action(float param) {
    g_coordinator.get_my_feature_manager().perform_action(param);
}

__attribute__((export_name("get_my_value")))
float get_my_value() {
    return g_coordinator.get_my_feature_manager().get_value();
}

__attribute__((export_name("is_my_feature_active")))
int is_my_feature_active() {
    return g_coordinator.get_my_feature_manager().is_active() ? 1 : 0;
}

} // extern "C"
```

#### 4. **Update Build Scripts**

Add your files to both `build-wasm.ps1` and `build-wasm.sh`:

```powershell
$sourceFiles = @(
    # ... existing files ...
    "public/src/wasm/managers/MyFeatureManager.cpp"
)
```

#### 5. **Build WASM**

```bash
npm run wasm:build
```

Check output for your new exports:
```
Export manifest: game.wasm -> 58 exports { ... }
```

#### 6. **Create JavaScript Integration**

```javascript
// In your demo or main game
function useMyFeature() {
    if (typeof wasmExports.perform_my_action === 'function') {
        wasmExports.perform_my_action(42.0);
        
        const value = wasmExports.get_my_value();
        const isActive = wasmExports.is_my_feature_active();
        
        console.log(`Value: ${value}, Active: ${isActive}`);
    }
}
```

---

## Creating Demos

### Demo Template Structure

**Location**: `public/demos/my-feature-demo.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Feature Demo - DozedEnt</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
            color: #eee;
            overflow: hidden;
        }
        
        #canvas {
            display: block;
            margin: 20px auto;
            border: 2px solid #4ecdc4;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(78, 205, 196, 0.3);
        }
        
        #controls {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.85);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #4ecdc4;
            min-width: 280px;
        }
        
        button {
            padding: 12px;
            background: linear-gradient(135deg, #4ecdc4 0%, #3aa8a0 100%);
            border: none;
            border-radius: 6px;
            color: #1a1a2e;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(78, 205, 196, 0.5);
        }
    </style>
</head>
<body>
    <div id="loading">Loading WASM...</div>
    <canvas id="canvas" width="800" height="600"></canvas>
    
    <div id="controls">
        <h3>⚡ My Feature Demo</h3>
        <button onclick="triggerFeature()">Trigger Feature</button>
        <div id="stats"></div>
    </div>
    
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let wasmExports = null;
        let isInitialized = false;
        
        // [INSERT WASM INITIALIZATION CODE FROM ABOVE]
        
        async function init() {
            wasmExports = await initWasm();
            isInitialized = true;
            document.getElementById('loading').style.display = 'none';
            requestAnimationFrame(render);
        }
        
        function triggerFeature() {
            if (!wasmExports || !isInitialized) return;
            wasmExports.perform_my_action(42.0);
        }
        
        function render(currentTime) {
            if (!wasmExports || !isInitialized) {
                requestAnimationFrame(render);
                return;
            }
            
            try {
                // Update WASM (just deltaTime - no inputs!)
                wasmExports.update(1/60);
                
                // Get state
                const value = wasmExports.get_my_value();
                const isActive = wasmExports.is_my_feature_active();
                
                // Clear canvas
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw visualization
                // ... your rendering code ...
                
                // Update stats
                document.getElementById('stats').innerHTML = `
                    <div>Value: ${value.toFixed(2)}</div>
                    <div>Active: ${isActive ? 'Yes' : 'No'}</div>
                `;
            } catch (error) {
                console.error('Render error:', error);
                return;
            }
            
            requestAnimationFrame(render);
        }
        
        // Initialize when page loads
        init();
    </script>
</body>
</html>
```

### Demo Best Practices

1. **Always check function existence** before calling WASM exports
2. **Handle errors gracefully** with try-catch blocks
3. **Provide fallback behavior** if WASM features aren't available
4. **Log initialization steps** for debugging
5. **Show loading state** while WASM initializes
6. **Use requestAnimationFrame** for smooth rendering
7. **Limit update rate** (cap deltaTime to prevent spiral of death)

---

## Common Patterns

### 1. Reading Multiple Values from WASM

```javascript
function getGameState() {
    return {
        position: {
            x: wasmExports.get_x(),
            y: wasmExports.get_y()
        },
        velocity: {
            x: wasmExports.get_vel_x(),
            y: wasmExports.get_vel_y()
        },
        health: wasmExports.get_health(),
        stamina: wasmExports.get_stamina()
    };
}

// Call once per frame
const state = getGameState();
render(state);
```

### 1.5. Correct Update Function Signature

⚠️ **CRITICAL**: The `update()` function signature has changed!

**Current (Correct)**:
```cpp
// C++ signature - only takes delta_time
void update(float delta_time) {
    g_coordinator.update(delta_time);
}
```

```javascript
// JavaScript - pass only deltaTime
wasmExports.update(deltaTime);  // ✅ CORRECT
```

**Common Mistake**:
```javascript
// ❌ WRONG - Don't pass input parameters
wasmExports.update(dirX, dirY, isRolling, deltaTime);  // Old signature, WRONG!
```

When JavaScript passes more parameters than the C++ function expects, **only the first N parameters are read**. The rest are ignored. So if you call `update(0, 0, 0, deltaTime)`, the C++ receives `delta_time = 0` and your game won't update!

**For setting player input**, use the separate `set_player_input()` function:
```javascript
wasmExports.set_player_input(inputX, inputY, isRolling, isJumping, 
                             lightAttack, heavyAttack, isBlocking, specialAttack);
```

### 2. Passing Parameters to WASM

⚠️ **CRITICAL**: Parameter count MUST match C++ function signature!

```javascript
// ✅ CORRECT - Matches C++ signature: void update(float delta_time)
wasmExports.update(deltaTime);

// ❌ WRONG - Passes 4 params but C++ only expects 1
wasmExports.update(dirX, dirY, isRolling, deltaTime);  // Only dirX is used!

// Boolean as integer (0 or 1)
wasmExports.set_blocking(isBlocking ? 1 : 0);

// BigInt for 64-bit values (int64_t in C++)
wasmExports.init_run(BigInt(Date.now()), 0);
```

**Rule**: Always verify the C++ function signature before calling from JavaScript. Extra parameters are **silently ignored**, which can cause bugs!

### 3. Deterministic Frame Update

```javascript
const FIXED_TIMESTEP = 1/60;  // 60 FPS
let accumulator = 0;
let lastTime = performance.now();

function update(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    accumulator += deltaTime;
    
    // Fixed timestep updates
    while (accumulator >= FIXED_TIMESTEP) {
        wasmExports.update(inputX, inputY, isRolling, FIXED_TIMESTEP);
        accumulator -= FIXED_TIMESTEP;
    }
    
    render();
    requestAnimationFrame(update);
}
```

### 4. Error Boundary Pattern

```javascript
async function safeInitWasm() {
    try {
        const exports = await initWasm();
        
        // Validate required functions exist
        const required = ['init_run', 'update', 'get_x', 'get_y'];
        for (const fn of required) {
            if (typeof exports[fn] !== 'function') {
                throw new Error(`Required function '${fn}' not found`);
            }
        }
        
        return exports;
    } catch (error) {
        console.error('WASM initialization failed:', error);
        showErrorUI(`Failed to load game: ${error.message}`);
        return null;
    }
}
```

### 5. Debugging Physics Issues

**Pattern for debugging physics that doesn't work**:

```javascript
// 1. Log initial state after initialization
if (typeof wasmExports.get_physics_player_x === 'function') {
    console.log('Initial physics state:');
    console.log('  Position:', wasmExports.get_physics_player_x(), wasmExports.get_physics_player_y());
    console.log('  Velocity:', wasmExports.get_physics_player_vel_x(), wasmExports.get_physics_player_vel_y());
}

// 2. Log when applying forces
function applyKnockback(dx, dy, force) {
    console.log(`Applying knockback: direction=(${dx}, ${dy}), force=${force}`);
    wasmExports.apply_physics_knockback(dx, dy, force);
    
    // Log immediate result
    const vx = wasmExports.get_physics_player_vel_x();
    const vy = wasmExports.get_physics_player_vel_y();
    console.log(`  New velocity: (${vx.toFixed(3)}, ${vy.toFixed(3)})`);
}

// 3. Log during update to see if position changes
let debugFrame = 0;
function render() {
    wasmExports.update(deltaTime);
    
    // Log every 60 frames
    if (debugFrame++ % 60 === 0) {
        const px = wasmExports.get_physics_player_x();
        const py = wasmExports.get_physics_player_y();
        const vx = wasmExports.get_physics_player_vel_x();
        const vy = wasmExports.get_physics_player_vel_y();
        console.log(`Frame ${debugFrame}: pos=(${px.toFixed(3)}, ${py.toFixed(3)}), vel=(${vx.toFixed(3)}, ${vy.toFixed(3)})`);
    }
    
    // ... rendering code ...
    requestAnimationFrame(render);
}
```

**Common Issues This Reveals**:
- ✅ Velocity changes but position stays the same → Check if update() is called with correct parameters
- ✅ Position and velocity both stay at defaults → Physics body not created, check initialization
- ✅ Nothing happens when calling functions → Function doesn't exist or parameters wrong
- ✅ Velocity becomes NaN → Math error in physics calculations

---

## Troubleshooting Checklist

### Build Issues

- [ ] All `.cpp` files added to build scripts (both `.ps1` and `.sh`)
- [ ] Include paths added for new directories
- [ ] All `#include` statements use correct relative paths
- [ ] Missing includes added (`<algorithm>`, `<cmath>`, etc.)
- [ ] No syntax errors in C++ code
- [ ] Balance data generated successfully

**Commands**:
```bash
npm run wasm:build:dev  # For detailed error messages
```

### Initialization Issues

- [ ] `env` object always provided in imports
- [ ] `env.abort` and `env.abort_` functions defined
- [ ] `env.emscripten_notify_memory_growth` defined
- [ ] WASI shim complete with all required functions
- [ ] Memory handling correct (check if module exports memory)
- [ ] Correct instantiate return type handling (Instance vs {instance, module})

**Debug logging**:
```javascript
console.log('WASM module exports memory:', exportsMemory);
console.log('Available WASM exports:', Object.keys(wasmExports).sort());
```

### Runtime Issues

- [ ] Functions exist before calling: `typeof wasmExports.fn === 'function'`
- [ ] Correct parameter types (float, int, BigInt)
- [ ] **Update called with CORRECT number of parameters**: `update(deltaTime)` NOT `update(dirX, dirY, isRolling, dt)`
- [ ] Parameter count matches C++ function signature (extra params are ignored!)
- [ ] Delta time reasonable (<0.1 seconds)
- [ ] No infinite loops in render function
- [ ] Try-catch blocks around WASM calls

**⚠️ Critical**: If you pass more parameters than the C++ function expects, the extra ones are **silently ignored**. This can cause subtle bugs where `update(0, 0, 0, deltaTime)` passes `0` as deltaTime!

### Memory Issues

- [ ] Check if WASM exports memory before accessing
- [ ] Use memory getter pattern in WASI shim
- [ ] Don't provide memory if WASM exports it
- [ ] Memory buffer accessed after instantiation completes

### Physics System Issues

#### Problem: Player "Teleporting" or Moving Too Fast

**Symptoms:**
- Player position jumps in large increments
- Movement appears instant or "teleporting"
- Velocity values extremely high (>10 in normalized 0-1 space)

**Common Causes & Fixes:**

1. **Force Values Too High for Normalized World Space**
   
   **Problem**: Using force values designed for meter-scale physics (20-50) in normalized 0-1 space
   
   ```javascript
   // ❌ WRONG - Way too high for 0-1 space
   applyKnockback(1, 0, 20);  // Velocity = 45+ units/s = teleporting
   
   // ✅ CORRECT - Appropriate for 0-1 normalized space
   applyKnockback(1, 0, 0.3);  // Velocity = 0.5-1.5 units/s = smooth
   ```
   
   **Rule of Thumb**: For 0-1 normalized space, force values should be **0.1 - 1.0**
   - Light knockback: `0.2 - 0.4`
   - Medium knockback: `0.5 - 0.8`
   - Heavy knockback: `1.0 - 2.0`

2. **Gravity Enabled in Top-Down Games**
   
   **Problem**: Default `PhysicsConfig` has Earth gravity (`-9.81 m/s²`) enabled
   
   ```cpp
   // ❌ WRONG - Gravity pulls player down
   PhysicsConfig physics_config;  // Defaults to gravity enabled
   physics_manager_.initialize(physics_config);
   
   // ✅ CORRECT - Disable gravity for top-down
   PhysicsConfig physics_config;
   physics_config.gravity = FixedVector3::zero();  // No gravity
   physics_manager_.initialize(physics_config);
   ```

3. **Drag Too High (Slow Deceleration)**
   
   **Problem**: Default drag `0.98` means player keeps 98% velocity = very slow slowdown
   
   ```cpp
   // Drag values and their feel:
   player_body.drag = Fixed::from_float(0.98f);  // Floaty (5-6 second stop)
   player_body.drag = Fixed::from_float(0.88f);  // Responsive (1-2 second stop) ✅
   player_body.drag = Fixed::from_float(0.80f);  // Snappy (0.5-1 second stop)
   ```

4. **Variable Timestep Causing Jumps**
   
   **Problem**: Passing variable delta time directly to physics can cause multi-step updates
   
   ```javascript
   // ❌ WRONG - Variable timestep
   function render(currentTime) {
       const dt = (currentTime - lastTime) / 1000;
       wasmExports.update(dt);  // Can be 16ms, 30ms, or 50ms
   }
   
   // ✅ CORRECT - Fixed timestep accumulator
   let accumulator = 0;
   const FIXED_DT = 1/60;
   
   function render(currentTime) {
       const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
       accumulator += dt;
       
       // Multiple small steps instead of one big jump
       while (accumulator >= FIXED_DT && steps < 4) {
           wasmExports.update(FIXED_DT);
           accumulator -= FIXED_DT;
           steps++;
       }
   }
   ```

**Checklist:**
- [ ] Force values appropriate for world scale (0.1-2.0 for normalized 0-1 space)
- [ ] Gravity disabled for top-down games (`gravity = zero()`)
- [ ] Drag value tuned for desired feel (0.85-0.92 recommended)
- [ ] Fixed timestep loop implemented in render function
- [ ] Delta time capped to prevent spiral of death (max 0.05s)

---

## Quick Reference

### File Locations

```
public/src/wasm/               # C++ source files
tools/scripts/                 # Build scripts
public/demos/                  # Feature demos
GUIDELINES/                    # Documentation
game.wasm                      # Built WASM (root)
```

### Build Commands

```bash
npm run wasm:build             # Production build
npm run wasm:build:dev         # Debug build
```

### Key Export Pattern

```cpp
extern "C" {
__attribute__((export_name("function_name")))
return_type function_name(params) {
    return g_coordinator.get_manager().method();
}
}
```

### JavaScript Call Pattern

```javascript
if (typeof wasmExports.function_name === 'function') {
    const result = wasmExports.function_name(params);
}
```

---

## Additional Resources

- [AGENTS.md](../AGENTS.md) - Complete architecture guide
- [PHYSICS_INTEGRATION_COMPLETE.md](./PHYSICS_INTEGRATION_COMPLETE.md) - Complete physics API reference & integration guide
- [PHYSICS_COMBAT_ENHANCEMENTS_SUMMARY.md](./PHYSICS_COMBAT_ENHANCEMENTS_SUMMARY.md) - Implementation details & sprint summary
- [QUICK_START_PHYSICS.md](./QUICK_START_PHYSICS.md) - 5-minute physics quick start guide
- [PHYSICS_QUICK_WINS.md](./PHYSICS_QUICK_WINS.md) - Physics implementation examples
- [BUILD/DEVELOPMENT_WORKFLOW.md](../BUILD/DEVELOPMENT_WORKFLOW.md) - Development cycle guide
- [BUILD/API.md](../BUILD/API.md) - Canonical WASM API reference

---

**Last Updated**: September 30, 2025  
**Maintainer**: DozedEnt Development Team

For questions or issues, refer to the troubleshooting section or check existing demos in `public/demos/`.

