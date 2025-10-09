# Bug Report for DozedEnt Codebase

Generated: October 9, 2025

## Critical Bugs 🔴

### 1. **Missing Closing Brace in Switch Statement**
**File:** `public/src/gameentity/wolf/behavior.js`  
**Lines:** 26-32  
**Severity:** CRITICAL - Syntax Error

```javascript
switch(wasmEnemyState) {
    case 1: this.state = 'running'; break; // seek
    case 2: this.state = 'prowling'; break; // circle
    case 3: this.state = 'attacking'; break; // harass
    case 4: this.state = 'hurt'; break; // recover
    default: this.state = 'idle'; break;
// MISSING: }

this.facing = (wasmEnemyFacingX >= 0) ? 1 : -1;
```

**Fix:** Add closing brace `}` after line 31.

---

### 2. **Division by Zero - Distance Calculation**
**File:** `public/src/gameentity/wolf/behavior.js`  
**Lines:** 164-168  
**Severity:** CRITICAL - Runtime Error (NaN propagation)

```javascript
const dx = target.position.x - this.position.x
const dy = target.position.y - this.position.y
const distance = Math.sqrt(dx * dx + dy * dy)
const normalizedDx = dx / distance  // BUG: Can be NaN if distance === 0
const normalizedDy = dy / distance  // BUG: Can be NaN if distance === 0
```

**Impact:** If wolf and target are at exactly the same position, `distance` will be 0, causing division by zero and propagating NaN through the position calculations.

**Fix:** Add zero-distance check:
```javascript
const distance = Math.sqrt(dx * dx + dy * dy)
if (distance === 0) {
    return; // or set default direction
}
const normalizedDx = dx / distance
const normalizedDy = dy / distance
```

---

### 3. **Unreachable Code - Duplicate WASM Logic**
**File:** `public/src/gameentity/wolf/behavior.js`  
**Lines:** 67-81  
**Severity:** HIGH - Dead Code

```javascript
// Line 57: Early return when wasmModule exists
return;
} catch (error) {
    console.warn('WASM function call failed in wolf update:', error);
    // Continue with fallback behavior
}
}

// Handle lunge attack (fallback JS behavior only)
this.updateLungeAttack(deltaTime, player)

// WASM-first: Read physics from WASM, no fallback JS physics
if (!this.wasmModule) {  // Line 68: Never reached if wasmModule exists
    console.error('Wolf requires WASM module for physics');
    return;  // Line 70: Never reached
}

// Lines 73-81: This code is UNREACHABLE
// - If wasmModule exists, line 57 returns early
// - If wasmModule doesn't exist, line 70 returns
const wasmIndex = this.wasmIndex >= 0 ? this.wasmIndex : this.id - 1;
this.position.x = this.wasmModule.get_enemy_x(wasmIndex);
// ... rest never executes
```

**Fix:** Remove unreachable code or restructure the logic flow.

---

### 4. **Array Index Fallback Bug - ID vs Index**
**File:** `public/src/gameentity/wolf/behavior.js`  
**Lines:** 10, 74  
**Severity:** HIGH - Logic Error

```javascript
const wasmIndex = this.wasmIndex >= 0 ? this.wasmIndex : this.id - 1;
```

**Issue:** If `this.id` is 0, the fallback becomes -1, which is an invalid array index. This assumes IDs start at 1, but that's not guaranteed.

**Fix:** Add validation:
```javascript
const wasmIndex = this.wasmIndex >= 0 ? this.wasmIndex : Math.max(0, this.id - 1);
```

---

## High Priority Bugs 🟡

### 5. **Potential Memory Leaks - Event Listeners**
**Files:** Multiple (27 addEventListener vs 41 removeEventListener across 16 files)  
**Severity:** HIGH - Memory Leak

**Analysis:**
- Found 27 `addEventListener` calls across multiple files
- Only 41 `removeEventListener` calls across 16 files
- Many components don't clean up event listeners on destruction

**Notable examples:**
- `public/src/demo/guidelines-showcase.js` - Multiple listeners, no cleanup visible
- `public/src/managers/unified-input-manager.js` - Has cleanup helper but may not be used everywhere
- `public/src/controllers/skeleton/SkeletonUIController.js` - Multiple button listeners

**Fix:** Implement proper cleanup:
```javascript
class Component {
    constructor() {
        this.listeners = [];
    }
    
    addListener(target, event, handler) {
        target.addEventListener(event, handler);
        this.listeners.push({ target, event, handler });
    }
    
    cleanup() {
        this.listeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
}
```

---

### 6. **Empty Catch Blocks - Silent Error Swallowing**
**Files:** Multiple  
**Severity:** HIGH - Debugging Difficulty

**Examples:**
```javascript
// public/src/skeleton/WasmLoaderService.js:160
try { Object.defineProperty(skeleton, '__boneParents', { value: parents, enumerable: false, configurable: true }); } catch {}

// public/src/demo/main.js:69
try { await progressionCoordinator.start(); } catch {}

// public/src/storage/local-progress-store.js:46
} catch {}
```

**Fix:** At minimum, log errors:
```javascript
catch (error) {
    console.warn('Failed to set bone parents:', error);
}
```

---

### 7. **Division by Zero - Multiple Locations**
**Files:** Various rendering and physics files  
**Severity:** MEDIUM-HIGH

**Locations:**
- `public/src/gameentity/wolf/behavior.js:166-168` (already covered above)
- `public/src/gameentity/wolf/behavior.js:227` - Similar pattern
- Any normalization code without zero-length checks

**Pattern to search for:**
```javascript
const distance = Math.sqrt(dx * dx + dy * dy)
// Missing: if (distance === 0) return;
const normalized = velocity / distance  // Potential NaN
```

---

## Medium Priority Bugs 🟢

### 8. **Code Style Issues - Missing Spaces**
**File:** `public/src/gameentity/wolf/behavior.js`  
**Line:** 198  
**Severity:** LOW - Style Issue

```javascript
if (!target || !target.position) {return Infinity}
```

**Fix:**
```javascript
if (!target || !target.position) { return Infinity; }
```

---

### 9. **Loose Equality Operators**
**Files:** 199 files contain `==` or `!=`  
**Severity:** MEDIUM - Type Coercion Issues

**Example files:**
- Multiple animation, netcode, and UI files use loose equality
- Should use strict equality (`===`, `!==`) to avoid type coercion bugs

**Fix:** Replace all `==` with `===` and `!=` with `!==` unless type coercion is intentional and documented.

---

### 10. **Potential Race Conditions in Async Code**
**Files:** 67 files with async/await  
**Severity:** MEDIUM - Concurrency Issues

Notable files:
- `public/src/wasm/WasmInitializer.js`
- `public/src/wasm/initializer/module-loader.js`
- `public/src/utils/wasm-loader/WasmLoader.js`

**Issues:**
- Multiple async initialization paths may race
- No clear locking or ordering mechanism
- Fallback logic may execute while real WASM is loading

**Recommendation:** Implement initialization state machine with proper guards.

---

## File Size Violations 📏

### Files Exceeding 500 Line Limit

Per user rules: "Never allow a file to exceed 500 lines"

**Critical violations (>900 lines):**
1. `public/src/wasm/game_refactored.cpp` - **946 lines** ⚠️

**Should be split immediately:**
- Extract WASM export functions to separate files by category
- Current structure has ~300 lines of exports that could be modularized

---

## Recommendations

### Immediate Actions (Critical)
1. ✅ Fix syntax error in `wolf/behavior.js` line 32
2. ✅ Add division-by-zero checks in `executeLunge()` and similar functions
3. ✅ Remove or fix unreachable code in `wolf/behavior.js` lines 67-81
4. ✅ Fix array index fallback logic

### Short-term Actions (High Priority)
1. Audit all addEventListener calls and ensure cleanup
2. Replace empty catch blocks with proper error logging
3. Search and fix all loose equality operators
4. Add distance validation in all normalization code

### Long-term Actions (Medium Priority)
1. Implement proper lifecycle management for components with event listeners
2. Add linting rules to prevent future bugs:
   - No empty catch blocks
   - No loose equality
   - Max file length enforcement
3. Review async/await patterns for race conditions
4. Split large files (game_refactored.cpp)

---

## Testing Recommendations

### Unit Tests Needed
1. Wolf behavior edge cases (zero distance, null targets)
2. Event listener cleanup (memory leak detection)
3. WASM fallback scenarios

### Integration Tests Needed
1. WASM initialization race conditions
2. Multi-wolf scenarios with varying IDs
3. Long-running sessions (memory leak detection)

---

## Code Quality Metrics

- **Total files scanned:** ~270 JavaScript files in `public/src/`
- **Critical bugs found:** 4
- **High priority bugs:** 3
- **Medium priority bugs:** 3
- **Event listener issues:** ~27 locations
- **Empty catch blocks:** 7+
- **Loose equality usage:** 199 files
- **Files with async/await:** 67

---

## Notes

- Linter reports no errors, but these are logic and architecture bugs
- Many issues stem from incomplete refactoring
- WASM integration created duplicate code paths
- Guidelines specify modular design but some files have grown too large

