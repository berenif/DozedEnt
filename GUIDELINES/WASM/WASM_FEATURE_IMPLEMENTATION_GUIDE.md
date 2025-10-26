# 🧩 WASM Feature Implementation Guide

Last Updated: October 2025  
Status: ✅ Production Ready

## Scope
How to add a new gameplay feature/endpoints to the `game.wasm` module while preserving determinism and the documented API style.

## High-Level Steps
1) Implement C++ logic in `public/src/wasm/**` (manager or coordinator)
2) Expose flat exports (primitives only) via `extern "C"` functions
3) Rebuild WASM and regenerate export manifest
4) Read new exports from JS (renderers/UI only); never mutate gameplay in JS

## Example: Add a Getter + Action
```cpp
// public/src/wasm/managers/MyFeatureManager.cpp
// (pseudo-code) maintain state and deterministic updates

// Export surface (keep flat)
extern "C" {
    // Getter
    float get_myfeature_value();

    // Action (input-only)
    void trigger_myfeature_action(int param);
}
```

Build and manifest:
```bash
npm run wasm:build
node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json
```

Consume in JS (read-only):
```javascript
// public/src/wasm/core/WasmCoreState.js (or relevant reader)
const value = wasmModule.get_myfeature_value();
// Render/UI uses value; actions are forwarded inputs → WASM
```

## Export Design Rules
- Flat primitives only (float/int); avoid structs/strings across boundary
- Prefer getters that return one scalar per call; batch reads per frame in JS
- Keep names consistent with existing API (get_*, set_*, is_*, start_*, etc.)
- Document enums in `GUIDELINES/BUILD/API.md` when adding new ones

## Determinism Checklist
- No `Math.random()` in gameplay; use internal deterministic RNG
- No time-based logic from JS; use WASM tick counters
- Inputs must be explicit parameters or `set_player_input` flags

## Performance Tips
- Group read calls once per frame; cache values in a JS view model
- Avoid unnecessary exports; prefer internal helpers in C++
- Keep binary size in check; remove dead exports before merging

## Testing
- Add/extend golden test expectations if new state affects outcomes
- Validate export presence in `WASM_EXPORTS.json`
- Run `npm run wasm:build:dev` and `npm test` locally across platforms


