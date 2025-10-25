# 🧪 Testing Guide

Last Updated: October 2025  
Status: ✅ Production Ready

## Commands
```bash
npm test               # Default suite (CI-friendly)
npm run test:unit      # Unit tests
npm run test:coverage  # Coverage report
npm run test:all       # CI gate: unit + coverage thresholds
npm run test:integration
npm run test:performance
```

## Categories
- Unit: isolated modules and utilities
- Integration: WASM loading, renderer wiring, adapters
- Golden/Deterministic: scripted 60s inputs → identical end-state
- Performance: frame time, memory growth, boundary call counts

## Determinism Rules
- No `Math.random()` in gameplay; use WASM RNG. Seed JS RNG only for UI.
- Fixed timesteps inside WASM; JS uses `requestAnimationFrame` for rendering.
- Compare end-state hashes across runs/platforms.

## Golden Test Expectations
- Same seed + inputs → identical HP, stamina, position, phase, enemy counts.
- Pass if zero diffs across repeated runs and platforms.

## Coverage
- Focus on boundary logic and critical branches. Artifacts in `coverage/`.

## Debugging Failures
1) Re-run focused subset with grep or specific script.
2) Confirm identical WASM build across machines.
3) Ensure no JS gameplay logic slipped in.
4) Check exports via `WASM_EXPORTS.json`.

## CI Snippet
```yaml
- run: npm run wasm:build
- run: npm test
- run: node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json
```
