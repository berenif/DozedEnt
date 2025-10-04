# WASM Utilities Guide

## Overview

This guide explains the WASM utility system in `public/src/utils/`. These utilities provide a layered architecture for loading, managing, and interacting with WebAssembly modules.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  Application Layer (Demos, UI Components)              │
├─────────────────────────────────────────────────────────┤
│  WasmManager (High-level game API)                     │
├─────────────────────────────────────────────────────────┤
│  WasmLazyLoader (Lazy loading, caching, retries)       │
├─────────────────────────────────────────────────────────┤
│  wasm.js (Core loader with WASI shim)                  │
├─────────────────────────────────────────────────────────┤
│  WebAssembly API (Browser primitive)                   │
└─────────────────────────────────────────────────────────┘
```

## Utility Files

### 1. `wasm.js` - Core Loader
**Purpose**: Lightweight, dependency-free WASM loader with minimal WASI shim

**When to use**:
- Simple demos that don't need retry logic
- Custom WASM modules (non-game)
- Maximum control over loading process
- SES-compatible environments

**Features**:
- Streaming instantiation support
- Minimal WASI shim (fd_write, random_get, clock_time_get, etc.)
- Deterministic PRNG fallback
- String codec utilities
- ~300 lines, zero dependencies

**Example**:
```javascript
import { loadWasm } from './utils/wasm.js';

const { exports, memory } = await loadWasm('path/to/module.wasm');
exports.start();
```

### 2. `wasm-lazy-loader.js` - Advanced Loader
**Purpose**: Production-ready loader with retry logic, caching, and diagnostics

**When to use**:
- Production applications
- Need retry logic for network issues
- Want module caching
- Need loading diagnostics
- Progressive loading strategies

**Features**:
- Retry logic (3 attempts with exponential backoff)
- Module caching
- Progress tracking
- Multiple fallback paths
- Timeout protection (30s load, 20s instantiation)
- Diagnostics and troubleshooting
- ~1300 lines

**Example**:
```javascript
import { globalWasmLoader } from './utils/wasm-lazy-loader.js';

const instance = await globalWasmLoader.loadModule('game', {
  onProgress: (progress) => {
    console.log(`Loading: ${(progress.progress * 100).toFixed(1)}%`);
  }
});
```

### 3. `wasm-manager.js` - Game Manager
**Purpose**: High-level game-specific API wrapper

**When to use**:
- Full game integration
- Need game-specific abstractions (player state, combat, phases)
- Want performance optimizations (state caching)
- Using the full game WASM module

**Features**:
- Game-specific API methods (getPlayerPosition, attack, roll, etc.)
- State caching for performance
- Fallback mode when WASM fails
- Performance monitoring
- Initialization lifecycle management
- Phase management
- ~2700 lines

**Example**:
```javascript
import { WasmManager } from './utils/wasm-manager.js';

const wasmManager = new WasmManager();
await wasmManager.initialize();

// High-level API
const pos = wasmManager.getPlayerPosition();
wasmManager.update(inputX, inputY, isRolling, deltaTime);
```

### 4. `wasm-helpers.js` - Advanced Utilities
**Purpose**: Advanced WASM utilities for power users

**When to use**:
- Custom memory management needed
- Module preloading/caching
- State serialization
- Debug/profiling WASM calls

**Features**:
- `WasmMemoryManager`: Manual memory allocation/deallocation
- `WasmModuleLoader`: Advanced module loading with validation
- `WasmStateSerializer`: Save/load WASM state
- `WasmDebugHelper`: Call logging and breakpoints
- ~640 lines

**Example**:
```javascript
import { createModuleLoader, createDebugHelper } from './utils/wasm-helpers.js';

const loader = createModuleLoader({ verbose: true });
const instance = await loader.load('game.wasm');

const debugger = createDebugHelper(instance, { 
  logCalls: true,
  breakpoints: ['update'] 
});
```

### 5. `wasm-string.js` - String Utilities
**Purpose**: Decode strings from WASM memory

**When to use**:
- WASM functions return string pointers
- Need to parse JSON from WASM
- Working with C-strings in WASM memory

**Features**:
- `decodeWasmString`: Convert pointer to JavaScript string
- `parseWasmJson`: Decode and parse JSON from WASM
- Automatic null-termination detection
- Error handling with fallbacks
- ~130 lines

**Example**:
```javascript
import { decodeWasmString, parseWasmJson } from './utils/wasm-string.js';

// WASM returns { ptr: 1024, len: 50 }
const str = decodeWasmString(wasmExports, ptrInfo);

// Parse JSON
const data = parseWasmJson(wasmExports, jsonPtr, {
  fallback: {},
  onError: (err) => console.warn(err)
});
```

## Decision Tree: Which Utility to Use?

```
START
  │
  ├─ Full game integration? ──YES──> Use WasmManager
  │                            (getPlayerPosition, attack, etc.)
  │
  ├─ Simple demo/custom module? ──YES──> Use wasm.js
  │                                (loadWasm, minimal overhead)
  │
  ├─ Production app with retry? ──YES──> Use WasmLazyLoader
  │                                (globalWasmLoader.loadModule)
  │
  ├─ Need memory management? ──YES──> Use wasm-helpers.js
  │                             (WasmMemoryManager)
  │
  └─ String/JSON from WASM? ──YES──> Use wasm-string.js
                              (decodeWasmString, parseWasmJson)
```

## Best Practices

### 1. Cache Busting
Always load the latest WASM with cache busting (see [wasm-loading.md](./wasm-loading.md)):

```javascript
// Automatic in WasmLazyLoader (cache: 'no-store')
const instance = await globalWasmLoader.loadModule('game');

// Manual in wasm.js
const response = await fetch('game.wasm', { cache: 'no-store' });
const { exports } = await loadWasm(response);
```

### 2. Error Handling
Always handle WASM loading errors gracefully:

```javascript
try {
  const instance = await globalWasmLoader.loadModule('game');
  // Use instance
} catch (error) {
  console.error('WASM failed to load:', error);
  // Show user-friendly error
  // Provide fallback or reload option
}
```

### 3. Memory Management
Let the utilities handle memory unless you have specific needs:

```javascript
// ✅ GOOD - Let loader handle memory
const { exports } = await loadWasm('module.wasm');

// ⚠️ ADVANCED - Manual memory management
const memory = new WebAssembly.Memory({ initial: 16, maximum: 256 });
const { exports } = await loadWasm('module.wasm', { env: { memory } });
```

### 4. WASI Compatibility
The built-in WASI shims handle most cases:

```javascript
// ✅ GOOD - Use built-in WASI
const { exports } = await loadWasm('module.wasm');
// Automatic WASI shim included

// ❌ BAD - Don't duplicate WASI logic
// Write your own WASI shim only if absolutely necessary
```

### 5. Performance Optimization
Use the right tool for the job:

```javascript
// Simple demo: wasm.js (minimal overhead)
const { exports } = await loadWasm('demo.wasm');

// Full game: WasmManager (state caching, batched reads)
const manager = new WasmManager();
await manager.initialize();
const state = manager.getPlayerState(); // Cached, batched read
```

## Common Patterns

### Pattern 1: Simple Demo
```javascript
import { loadWasm } from '../utils/wasm.js';

async function initDemo() {
  const { exports } = await loadWasm('game.wasm');
  
  if (typeof exports.init_run === 'function') {
    exports.init_run(BigInt(12345), 0);
  }
  
  function update(dt) {
    exports.update(dt);
    render(exports);
    requestAnimationFrame(() => update(dt));
  }
  
  update(1/60);
}
```

### Pattern 2: Production Game
```javascript
import { WasmManager } from '../utils/wasm-manager.js';

async function initGame() {
  const manager = new WasmManager();
  
  try {
    await manager.initialize();
    startGameLoop(manager);
  } catch (error) {
    showError('Game failed to load. Please refresh.');
  }
}

function startGameLoop(manager) {
  let lastTime = performance.now();
  
  function loop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    // Batched state read (cached)
    const state = manager.getPlayerState();
    manager.update(inputX, inputY, isRolling, dt);
    
    render(state);
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
}
```

### Pattern 3: Multiple Modules
```javascript
import { createModuleLoader } from '../utils/wasm-helpers.js';

const loader = createModuleLoader({ cache: true });

// Preload multiple modules
await loader.preloadModules([
  'game.wasm',
  'physics.wasm',
  'audio.wasm'
]);

// Use cached instances
const gameInstance = await loader.load('game.wasm');
const physicsInstance = await loader.load('physics.wasm');
```

## Anti-Patterns

### ❌ Don't: Duplicate WASI Logic
```javascript
// BAD - Reinventing the wheel
function createMyWasiShim() {
  return {
    fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
      // Duplicates wasm.js logic
    }
  };
}
```

**Instead**: Use `loadWasm` which includes WASI shim

### ❌ Don't: Ignore Cache Busting
```javascript
// BAD - May load stale WASM
fetch('game.wasm').then(/* ... */);
```

**Instead**: Use `cache: 'no-store'` or the lazy loader

### ❌ Don't: Call WASM on Every Frame Read
```javascript
// BAD - 4 WASM calls per frame
function render() {
  const x = exports.get_x();
  const y = exports.get_y();
  const stamina = exports.get_stamina();
  const health = exports.get_health();
  // ...
}
```

**Instead**: Use `WasmManager.getPlayerState()` (batched, cached)

### ❌ Don't: Ignore Loading Errors
```javascript
// BAD - Silent failure
const { exports } = await loadWasm('game.wasm');
```

**Instead**: Wrap in try-catch and show user feedback

## Performance Considerations

### Load Time Optimization
1. **Use streaming instantiation**: `loadWasm` does this automatically
2. **Preload critical modules**: Use `WasmModuleLoader.preloadModules()`
3. **Enable compression**: Server-side gzip/brotli
4. **Minimize module size**: Strip debug symbols in production

### Runtime Optimization
1. **Batch WASM calls**: Read multiple values at once
2. **Cache frequently read state**: Use `WasmManager` caching
3. **Minimize JS/WASM boundary crossings**: Do work in WASM
4. **Use typed arrays**: For bulk data transfer

### Memory Optimization
1. **Let WASM manage memory**: Use exported memory
2. **Avoid memory leaks**: Free allocated strings/buffers
3. **Monitor memory growth**: Track `memory.buffer.byteLength`
4. **Use memory growth carefully**: Set reasonable initial/max

## Troubleshooting

### Issue: WASM Won't Load
**Symptoms**: Fetch fails, instantiation errors

**Solutions**:
1. Check path is correct (relative to HTML file)
2. Verify CORS headers if loading from different origin
3. Check MIME type is `application/wasm`
4. Use diagnostics: `globalWasmLoader.runDiagnostics()`

### Issue: Missing Exports
**Symptoms**: `exports.function_name is not a function`

**Solutions**:
1. Verify function is exported in C++ with `extern "C"`
2. Check build outputs `WASM_EXPORTS.json`
3. Use `Object.keys(exports)` to see available exports
4. Rebuild WASM with correct export flags

### Issue: Memory Errors
**Symptoms**: Bounds errors, undefined behavior

**Solutions**:
1. Increase initial memory: `{ initial: 32 }` (pages)
2. Enable memory growth: `ALLOW_MEMORY_GROWTH=1` in build
3. Validate pointers before dereferencing
4. Check buffer indices are in bounds

### Issue: Determinism Broken
**Symptoms**: Same seed produces different results

**Solutions**:
1. Use deterministic time: WASI `clock_time_get` uses counter
2. Avoid `Math.random()` in JS gameplay code
3. Ensure same WASM version on all clients
4. Use fixed timestep (not wall clock time)

## TypeScript Definitions

TypeScript definitions are available in `wasm.d.ts`:

```typescript
import { loadWasm, WasmRuntime } from './utils/wasm.js';

const runtime: WasmRuntime = await loadWasm('module.wasm');
const exports = runtime.exports;
const memory = runtime.memory;
```

## Summary

- **wasm.js**: Lightweight loader for simple cases
- **wasm-lazy-loader.js**: Production loader with retry/caching
- **wasm-manager.js**: Game-specific high-level API
- **wasm-helpers.js**: Advanced utilities for power users
- **wasm-string.js**: String decoding utilities

Choose based on your needs:
- Simple demo → `wasm.js`
- Production app → `wasm-lazy-loader.js`
- Full game → `wasm-manager.js`
- Advanced features → `wasm-helpers.js`

Always handle errors, use cache busting, and batch WASM calls for best performance.
