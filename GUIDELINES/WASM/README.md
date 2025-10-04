# WASM Utilities & Development Guide

## 📚 Documentation Index

This directory contains comprehensive guides for working with WebAssembly in the DozedEnt project.

### Core Documentation

1. **[UTILITIES_GUIDE.md](./UTILITIES_GUIDE.md)** - Complete guide to WASM utilities
   - Architecture overview
   - When to use each utility
   - Best practices and anti-patterns
   - Performance considerations
   - Troubleshooting

2. **[UTILITIES_API.md](./UTILITIES_API.md)** - API reference
   - Function signatures
   - Parameters and return types
   - TypeScript definitions
   - Code examples

3. **[DEMO_DEVELOPMENT.md](./DEMO_DEVELOPMENT.md)** - Step-by-step demo guide
   - Creating new demos
   - Best practices
   - Common patterns
   - Checklist

4. **[wasm-loading.md](./wasm-loading.md)** - Cache busting rules
   - Loading strategies
   - Cache control
   - Build integration

## 🚀 Quick Start

### For Simple Demos
```javascript
import { loadWasm } from '../../utils/wasm.js';

const { exports } = await loadWasm('../../wasm/game.wasm');
exports.init_run(BigInt(12345), 0);

function loop(dt) {
  exports.update(dt);
  render(exports);
  requestAnimationFrame(() => loop(dt));
}
```

### For Production Apps
```javascript
import { globalWasmLoader } from '../utils/wasm-lazy-loader.js';

const instance = await globalWasmLoader.loadModule('game', {
  onProgress: (p) => console.log(`${(p.progress * 100).toFixed(1)}%`)
});
```

### For Full Game Integration
```javascript
import { WasmManager } from '../utils/wasm-manager.js';

const manager = new WasmManager();
await manager.initialize();

const state = manager.getPlayerState(); // Cached, batched
manager.update(inputX, inputY, isRolling, dt);
```

## 🛠️ Available Utilities

| File | Lines | Purpose | Use When |
|------|-------|---------|----------|
| `wasm.js` | ~320 | Lightweight loader + WASI | Simple demos, custom modules |
| `wasm-lazy-loader.js` | ~1315 | Production loader | Retry logic, caching needed |
| `wasm-manager.js` | ~2746 | Game API wrapper | Full game integration |
| `wasm-helpers.js` | ~640 | Advanced utilities | Memory mgmt, debugging |
| `wasm-string.js` | ~133 | String decoding | WASM returns strings |

## 📖 Key Concepts

### 1. WASI Shim
All loaders include a WASI shim that provides:
- `fd_write` - Console output
- `random_get` - Deterministic PRNG
- `clock_time_get` - Deterministic time
- `proc_exit` - Exit handling
- Standard WASI environment

**Don't duplicate this logic** - use `loadWasm` from `wasm.js`.

### 2. Cache Busting
All fetches use `cache: 'no-store'` by default to ensure latest WASM is loaded.

See [wasm-loading.md](./wasm-loading.md) for details.

### 3. Error Handling
Always wrap WASM operations in try-catch:
```javascript
try {
  const { exports } = await loadWasm('game.wasm');
} catch (error) {
  console.error('WASM load failed:', error);
  // Show user-friendly error
}
```

### 4. Feature Detection
Check for optional functions:
```javascript
if (typeof exports.special_function === 'function') {
  exports.special_function();
} else {
  console.warn('Feature not available');
}
```

### 5. Determinism
Use fixed seeds for reproducibility:
```javascript
// ✅ GOOD - Reproducible
exports.init_run(BigInt(12345), 0);

// ❌ BAD - Non-deterministic
exports.init_run(BigInt(Date.now()), 0);
```

## 🎯 Decision Matrix

```
Need full game API? 
  └─ YES → Use WasmManager
  
Need retry/caching?
  └─ YES → Use WasmLazyLoader
  
Simple demo?
  └─ YES → Use wasm.js
  
Advanced features?
  └─ Memory mgmt → WasmMemoryManager
  └─ Debugging → WasmDebugHelper
  └─ Strings → wasm-string.js
```

## ✅ Recent Improvements

### Physics Knockback Demo
**Before**: 
- ~150 lines of duplicate WASI shim logic
- Manual memory management
- Complex instantiation logic

**After**:
- Uses `loadWasm` from `wasm.js` (3 lines)
- Automatic WASI shim
- Improved error handling
- Better logging with emojis
- Feature detection
- TypeScript-ready

**Changes**:
- Removed 90+ lines of duplicate code
- Added comprehensive error messages
- Improved determinism testing
- Better console feedback

## 📋 Checklist for New Demos

- [ ] Use `loadWasm` from `wasm.js` (not duplicate WASI)
- [ ] Add error handling with user-friendly messages
- [ ] Use deterministic seed (e.g., `BigInt(12345)`)
- [ ] Feature detection for optional functions
- [ ] Console logging for debugging
- [ ] Visual feedback for actions
- [ ] Reset functionality
- [ ] FPS counter or performance monitoring
- [ ] Comments explaining non-obvious code
- [ ] Test in multiple browsers

## 🐛 Common Issues

### WASM Won't Load
**Symptom**: Fetch fails or instantiation errors

**Solutions**:
1. Check path is correct
2. Verify MIME type is `application/wasm`
3. Check CORS headers
4. Run diagnostics: `globalWasmLoader.runDiagnostics()`

### Missing Exports
**Symptom**: `exports.function_name is not a function`

**Solutions**:
1. Check `WASM_EXPORTS.json` for available exports
2. Use `Object.keys(exports)` to list exports
3. Rebuild WASM with correct exports
4. Add feature detection

### Memory Errors
**Symptom**: Bounds errors, crashes

**Solutions**:
1. Increase initial memory
2. Enable `ALLOW_MEMORY_GROWTH=1` in build
3. Validate pointers before use
4. Check array indices

### Determinism Broken
**Symptom**: Same seed produces different results

**Solutions**:
1. Use WASM RNG, not `Math.random()`
2. Use deterministic time (not `Date.now()`)
3. Ensure same WASM version everywhere
4. Use fixed timestep

## 🔧 Build Integration

### Building WASM
```bash
npm run wasm:build        # Production build
npm run wasm:build:dev    # Development with assertions
npm run wasm:build:all    # Build all modules
```

### Output Locations
- Main module: `public/wasm/game.wasm`
- Host module: `public/wasm/game-host.wasm`
- Exports: `public/WASM_EXPORTS.json`

## 📚 Further Reading

- [AGENTS.md](../AGENTS.md) - Architecture overview
- [WASM_FEATURE_IMPLEMENTATION_GUIDE.md](../WASM_FEATURE_IMPLEMENTATION_GUIDE.md) - Feature dev guide
- [BUILD/API.md](../BUILD/API.md) - Canonical WASM API
- [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) - Project layout

## 💡 Tips

1. **Start simple**: Use `wasm.js` for demos
2. **Upgrade as needed**: Move to `WasmLazyLoader` for production
3. **Batch reads**: Use `WasmManager.getPlayerState()` for performance
4. **Log everything**: Use console.log liberally during development
5. **Test determinism**: Same seed + inputs = same output
6. **Handle errors**: Always wrap WASM ops in try-catch
7. **Check features**: Use feature detection for optional functions
8. **Document examples**: Keep demos as living documentation

## 🎓 Learning Path

1. Read [UTILITIES_GUIDE.md](./UTILITIES_GUIDE.md)
2. Try the [DEMO_DEVELOPMENT.md](./DEMO_DEVELOPMENT.md) tutorial
3. Study existing demos in `public/src/demos/`
4. Reference [UTILITIES_API.md](./UTILITIES_API.md) as needed
5. Consult [AGENTS.md](../AGENTS.md) for architecture

## 📞 Support

- Check [Troubleshooting](#-common-issues) section
- Review existing demos for patterns
- Run diagnostics: `globalWasmLoader.runDiagnostics()`
- Check browser console for detailed errors

---

**Last Updated**: 2025-10-04
**Maintainer**: DozedEnt Development Team
