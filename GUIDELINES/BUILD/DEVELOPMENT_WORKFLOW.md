# 🧭 Development Workflow

Last Updated: October 2025  
Status: ✅ Production Ready

## Goals
- Keep gameplay logic in WASM (C++). JavaScript renders, forwards input, and handles networking.
- Maintain determinism: same seed + inputs → same outputs.
- Fast, repeatable loop with clear validation checkpoints.

## Quick Start
```powershell
# Windows
yarn wasm:build:dev || npm run wasm:build:dev
npm test
```
```bash
# macOS/Linux
npm run wasm:build:dev
npm test
```

For release checks:
```bash
npm run wasm:build
node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json
```

## Daily Flow
1) Edit C++ in `public/src/wasm/**` or balance JSON in `data/balance/**`.
2) Build debug: `npm run wasm:build:dev`.
3) Run tests: `npm test` (or targeted suites below).
4) Inspect exports/size: `node tools/scripts/generate-wasm-exports.js --verbose`.
5) Build prod: `npm run wasm:build`.
6) Commit artifacts if API/size changed:
   - `git add public/wasm/game.wasm WASM_EXPORTS.json`
   - `git commit -m "Update WASM build"`

## Commands
- `npm run wasm:build` — Production WASM build (O3, STANDALONE_WASM)
- `npm run wasm:build:dev` — Development build (assertions/logging)
- `npm run wasm:build:host` — Host-authoritative module
- `npm run wasm:build:all` — Build main + host modules

## Validation Checklist
- Build succeeds (no regressions)
- Golden test passes (deterministic replay)
- Core loop systems intact (movement/stamina/roll/block)
- Export manifest updated if API changed
- Binary size < 200KB; memory < 32MB

## Targeted Tests
```bash
npm run test:unit
npm run test:coverage
npm run test:integration
npm run test:performance
```

## Troubleshooting
- Build fails: ensure `emsdk` env loaded; try `npm run wasm:build:dev` for verbose logs.
- Missing export: regenerate manifest and verify in `WASM_EXPORTS.json`.
- Size regression: audit unused exports; prefer flat primitives.

## Best Practices
- JS never simulates physics/gameplay. Read-only bridge to WASM.
- Batch WASM reads once per frame to reduce boundary overhead.
- Keep exports flat (primitives/enums), avoid strings in hot paths.
- Update API docs when adding/removing exports.
