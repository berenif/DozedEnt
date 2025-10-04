# WASM Utilities API Reference

## Quick Reference

| Utility | Primary Use Case | Import |
|---------|-----------------|--------|
| `wasm.js` | Simple demos, custom modules | `import { loadWasm } from './utils/wasm.js'` |
| `wasm-lazy-loader.js` | Production apps, retry logic | `import { globalWasmLoader } from './utils/wasm-lazy-loader.js'` |
| `wasm-manager.js` | Full game integration | `import { WasmManager } from './utils/wasm-manager.js'` |
| `wasm-helpers.js` | Advanced utilities | `import { createModuleLoader } from './utils/wasm-helpers.js'` |
| `wasm-string.js` | String decoding | `import { decodeWasmString } from './utils/wasm-string.js'` |

## wasm.js

### `loadWasm(source, imports?)`
Load and instantiate a WebAssembly module.

**Parameters:**
- `source` (string | Response | ArrayBuffer | Uint8Array): WASM source
- `imports` (object, optional): Import object to merge with defaults

**Returns:** `Promise<WasmRuntime>`
```typescript
interface WasmRuntime {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
  memory: WebAssembly.Memory;
  exports: Record<string, any>;
}
```

**Example:**
```javascript
const { exports, memory } = await loadWasm('game.wasm');
```

### `createStringCodec(runtime)`
Create helpers to pass strings between JS and WASM.

**Parameters:**
- `runtime` (object): Object with `memory` and `exports` properties

**Returns:** `StringCodec`
```typescript
interface StringCodec {
  toWasm: (str: string) => {ptr: number, len: number};
  fromWasm: (ptr: number, len: number) => string;
}
```

**Example:**
```javascript
const codec = createStringCodec({ memory, exports });
const { ptr, len } = codec.toWasm('Hello');
const str = codec.fromWasm(ptr, len);
```

### `initWasmGame(params)`
Initialize a WASM game module with lifecycle hooks.

**Parameters:**
```typescript
interface InitParams {
  source: WasmSource;
  imports?: Record<string, any>;
  onReady?: (api: GameAPI) => void;
}
```

**Returns:** `Promise<Record<string, any>>` (WASM exports)

**Example:**
```javascript
const exports = await initWasmGame({
  source: 'game.wasm',
  onReady: (api) => {
    api.start();
    setInterval(() => api.update(1/60), 16);
  }
});
```

## wasm-lazy-loader.js

### `WasmLazyLoader`
Advanced WASM loader with retry logic and caching.

#### Constructor
```javascript
const loader = new WasmLazyLoader();
```

#### `loadModule(moduleName, options?)`
Load a WASM module with retry logic.

**Parameters:**
- `moduleName` (string): Module identifier (e.g., 'game')
- `options` (object, optional):
  - `imports` (object): Import object
  - `onProgress` (function): Progress callback
  - `strategy` (string): Loading strategy
  - `fetchOptions` (object): Fetch options

**Returns:** `Promise<WebAssembly.Instance>`

**Example:**
```javascript
const instance = await globalWasmLoader.loadModule('game', {
  onProgress: ({ loaded, total, progress }) => {
    console.log(`${(progress * 100).toFixed(1)}%`);
  }
});
```

#### `preloadCriticalModules(moduleNames?)`
Preload modules in background.

**Parameters:**
- `moduleNames` (string[], optional): Modules to preload (default: ['game'])

**Example:**
```javascript
await globalWasmLoader.preloadCriticalModules(['game', 'physics']);
```

#### `unloadModule(moduleName)`
Remove module from cache.

**Parameters:**
- `moduleName` (string): Module to unload

**Returns:** `boolean` (true if unloaded, false if not found)

#### `clearCache()`
Clear all cached modules.

#### `getStats()`
Get loading statistics.

**Returns:**
```typescript
interface Stats {
  modulesLoaded: number;
  totalLoadTime: number;
  cacheHits: number;
  cacheMisses: number;
  loadedModules: number;
  loadingInProgress: number;
  averageLoadTime: number;
  cacheHitRate: number;
}
```

#### `runDiagnostics(moduleName?)`
Run comprehensive WASM diagnostics.

**Returns:** `Promise<object>`

**Example:**
```javascript
const diagnostics = await globalWasmLoader.runDiagnostics('game');
console.log(diagnostics);
```

#### `configure(options)`
Update loader configuration.

**Parameters:**
- `options` (object): Configuration options
  - `preloadCritical` (boolean)
  - `enableCompression` (boolean)
  - `cacheModules` (boolean)
  - `loadTimeout` (number)
  - `instantiationTimeout` (number)
  - `retryAttempts` (number)
  - `debugMode` (boolean)

**Example:**
```javascript
globalWasmLoader.configure({
  retryAttempts: 5,
  debugMode: true
});
```

### Global Instance
```javascript
import { globalWasmLoader } from './utils/wasm-lazy-loader.js';
```

## wasm-manager.js

### `WasmManager`
High-level game API wrapper with state caching.

#### Constructor
```javascript
const manager = new WasmManager();
```

#### `initialize()`
Initialize the WASM game module.

**Returns:** `Promise<boolean>` (success status)

**Example:**
```javascript
const success = await manager.initialize();
if (success) {
  // Start game loop
}
```

#### Game State Methods

##### `getPlayerPosition()`
**Returns:** `{x: number, y: number}`

##### `getPlayerState()`
Get batched player state (cached, optimized).

**Returns:**
```typescript
interface PlayerState {
  x: number;
  y: number;
  stamina: number;
  phase: number;
  health: number;
  gold: number;
  essence: number;
  velX: number;
  velY: number;
  isRolling: number;
  isBlocking: number;
  animState: number;
}
```

##### `update(dirX, dirY, isRolling, deltaTime)`
Update game simulation.

**Parameters:**
- `dirX` (number): X direction (-1 to 1)
- `dirY` (number): Y direction (-1 to 1)
- `isRolling` (boolean): Is player rolling
- `deltaTime` (number): Delta time in seconds

#### Combat Methods

##### `lightAttack()`
**Returns:** `boolean` (success)

##### `heavyAttack()`
**Returns:** `boolean` (success)

##### `specialAttack()`
**Returns:** `boolean` (success)

##### `startRoll()`
**Returns:** `boolean` (success)

##### `setBlocking(isBlocking, faceX, faceY)`
**Parameters:**
- `isBlocking` (boolean)
- `faceX` (number): Face direction X
- `faceY` (number): Face direction Y

**Returns:** `boolean` (block state)

##### `isBlocking()`
**Returns:** `boolean`

##### `getCombatTelemetry()`
Get comprehensive combat state (cached).

**Returns:**
```typescript
interface CombatTelemetry {
  comboCount: number;
  comboWindowRemaining: number;
  parryWindow: number;
  counterWindowRemaining: number;
  canCounter: boolean;
  hyperarmorActive: boolean;
  armorValue: number;
  isBlocking: boolean;
  isRolling: boolean;
  // ... many more fields
}
```

#### Performance Methods

##### `getPerformanceMetrics()`
**Returns:**
```typescript
interface PerformanceMetrics {
  wasmCallCount: number;
  totalWasmTime: number;
  avgFrameTime: number;
  lastFrameTime: number;
}
```

#### Utility Methods

##### `isFallback()`
Check if running in fallback mode.

**Returns:** `boolean`

##### `checkWasm2Features()`
Check WASM 2.0 feature support.

**Returns:**
```typescript
interface Wasm2Features {
  simd: boolean;
  bulkMemory: boolean;
  exceptions: boolean;
  multipleMemories: boolean;
  bigInt: boolean;
}
```

##### `getDiagnostics()`
Get WASM diagnostics.

**Returns:**
```typescript
interface Diagnostics {
  isLoaded: boolean;
  isFallbackMode: boolean;
  hasExports: boolean;
  exportCount: number;
  runSeed: string;
  wasm2Features: Wasm2Features;
}
```

## wasm-helpers.js

### `WasmMemoryManager`
Manual memory management for WASM.

#### Constructor
```javascript
const memManager = new WasmMemoryManager(memory, options);
```

**Options:**
- `pageSize` (number): Default 65536
- `maxPages` (number): Default 32768
- `growthFactor` (number): Default 2
- `verbose` (boolean): Default false

#### `allocate(size)`
**Returns:** `number` (pointer)

#### `free(ptr)`
**Parameters:** `ptr` (number)

#### `getStats()`
**Returns:**
```typescript
interface MemoryStats {
  totalPages: number;
  usedBytes: number;
  freeBytes: number;
  peakBytes: number;
  allocations: number;
  fragmentation: number;
}
```

### `WasmModuleLoader`
Advanced module loading with caching.

#### Constructor
```javascript
const loader = new WasmModuleLoader(options);
```

**Options:**
- `cache` (boolean): Enable caching
- `validate` (boolean): Validate modules
- `streaming` (boolean): Use streaming instantiation
- `verbose` (boolean): Verbose logging

#### `load(source, importObject?)`
**Returns:** `Promise<WebAssembly.Instance>`

#### `preloadModules(urls)`
**Returns:** `Promise<Map<string, WebAssembly.Instance>>`

#### `clearCache()`
Clear module cache.

### `WasmStateSerializer`
Serialize/deserialize WASM state.

#### Constructor
```javascript
const serializer = new WasmStateSerializer(memory, exports);
```

#### `serialize(schema)`
**Parameters:** `schema` (object)
**Returns:** `object` (serialized state)

#### `deserialize(state, schema)`
**Parameters:**
- `state` (object): Serialized state
- `schema` (object): State schema

### `WasmDebugHelper`
Debug and profile WASM calls.

#### Constructor
```javascript
const debugger = new WasmDebugHelper(instance, options);
```

**Options:**
- `logCalls` (boolean): Log all WASM calls
- `logMemory` (boolean): Log memory operations
- `breakpoints` (string[]): Function names to break on

#### `dumpMemory(offset, length, format?)`
**Parameters:**
- `offset` (number)
- `length` (number)
- `format` (string): 'hex' | 'ascii' | 'i32' | 'f32'

**Returns:** `string`

#### `getCallStats()`
**Returns:**
```typescript
Record<string, {
  count: number;
  avgTimeBetweenCalls: number;
}>
```

#### `reset()`
Reset debug state.

### Factory Functions

```javascript
import { 
  createMemoryManager,
  createModuleLoader,
  createStateSerializer,
  createDebugHelper
} from './utils/wasm-helpers.js';
```

## wasm-string.js

### `decodeWasmString(wasmExports, value, explicitLength?)`
Decode a string from WASM memory.

**Parameters:**
- `wasmExports` (object): WASM exports with memory
- `value` (number | object): Pointer or `{ptr, len}` object
- `explicitLength` (number, optional): String length

**Returns:** `string | null`

**Example:**
```javascript
// Pointer only (null-terminated)
const str = decodeWasmString(exports, 1024);

// Pointer + length
const str = decodeWasmString(exports, { ptr: 1024, len: 50 });

// Explicit length
const str = decodeWasmString(exports, 1024, 50);
```

### `parseWasmJson(wasmExports, value, options?)`
Decode and parse JSON from WASM memory.

**Parameters:**
- `wasmExports` (object): WASM exports
- `value` (number | object): Pointer info
- `options` (object, optional):
  - `fallback` (any): Fallback value on error
  - `explicitLength` (number): String length
  - `onError` (function): Error handler

**Returns:** `any` (parsed JSON or fallback)

**Example:**
```javascript
const data = parseWasmJson(exports, jsonPtr, {
  fallback: {},
  onError: (error, rawStr) => {
    console.error('Parse failed:', error);
  }
});
```

## TypeScript Definitions

All utilities include TypeScript definitions in `wasm.d.ts`:

```typescript
import { loadWasm, WasmRuntime } from './utils/wasm.js';
import { WasmManager } from './utils/wasm-manager.js';
import { globalWasmLoader } from './utils/wasm-lazy-loader.js';
```

## Error Handling

All utilities throw errors that should be caught:

```javascript
try {
  const { exports } = await loadWasm('game.wasm');
} catch (error) {
  if (error.message.includes('fetch')) {
    // Network error
  } else if (error.message.includes('instantiate')) {
    // WASM instantiation error
  } else if (error.message.includes('timeout')) {
    // Timeout error
  }
}
```

## See Also

- [UTILITIES_GUIDE.md](./UTILITIES_GUIDE.md) - Complete usage guide
- [DEMO_DEVELOPMENT.md](./DEMO_DEVELOPMENT.md) - Demo development guide
- [wasm-loading.md](./wasm-loading.md) - Cache busting rules
