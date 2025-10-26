<!-- one-shot plan template: fill placeholders like [FEATURE], [FILES], [EXPORTS] -->
# One‑Shot Plan Template (Generic)

## How to Use
- Replace placeholders [LIKE_THIS].
- Keep files ≤ 500 lines; split early at ~400 lines.
- Follow WASM-first rules: gameplay in C++, JS is render/input/network only.

## 1) Scope
- Feature: [FEATURE]
- Goals: [PRIMARY_GOALS]
- Non-goals: [NON_GOALS]
- Affected areas: [MODULES/SYSTEMS]

## 2) Success Criteria & Budgets
- 60 FPS target; JS render ≤ 0.5 ms; WASM update ≤ 1.0 ms; snapshot ≤ 0.3 ms.
- No NaNs; stable data shapes; zero linter errors.
- Deterministic: same seed+inputs → identical state hash.

## 3) Architecture Compliance (WASM‑First)
- Gameplay/state in `public/src/wasm/`.
- JS reads snapshots via `WasmCoreState` and renders only.
- No `Math.random()` on gameplay paths; no JS physics.
- Reference ADRs: ADR‑001, ADR‑002, ADR‑003.

## 4) Approach (High Level)
- Add/adjust WASM logic → export minimal flat getters.
- Extend `WasmCoreState` to batch read once/frame.
- Render via focused renderer; no logic in UI.
- Guard with feature flag and safe fallback.

## 5) Files to Change (under public/src/)
- WASM (C++):
  - [WASM_FILES_TO_EDIT]
- JavaScript:
  - State bridge: `game/state/WasmCoreState.js` (add [STATE_METHOD])
  - Renderer: [RENDERER_FILE] (new or update)
  - Wire-up: `game/renderer/GameRenderer.js` (call renderer)
  - Coordinator: `game/coordinators/RenderingCoordinator.js` (ensure state passed)
  - UI toggle: [UI_TOGGLE_FILE]

## 6) API Changes (WASM Exports)
- Add exports (EMSCRIPTEN_KEEPALIVE): [EXPORTS]
- Prefer flat primitives; optional bulk writer to linear memory.

## 7) Build & Export Wiring
- Ensure build scripts export required symbols and verify post-build.
- Add to `tools/scripts/build-wasm.(sh|ps1)` EXPORTED_FUNCTIONS.
- Post-build check: `tools/scripts/verify-*-exports.js`.

Commands
```bash
npm run wasm:build
npm run wasm:verify:skeleton   # or your feature-specific verify script
```

## 8) Feature Flags & Fallbacks
- URL param `?[FEATURE_FLAG]=1` + localStorage persistence.
- Hotkeys: [HOTKEYS]
- If export missing or non-finite data detected → disable overlay without throwing.

## 9) Data Contract & Versioning
- Contract: [CONTRACT_SHAPE]
- Optional `get_api_version()` or rely on `WASM_EXPORTS.json` manifest.
- Validate shape in unit tests; freeze returned objects.

## 10) Performance Instrumentation
- Time snapshot and render; keep rolling averages; gated by `?perf=1`.
- Batch WASM calls; at most [MAX_CALLS] per frame (prefer 1 via bulk).

## 11) Determinism & Precision
- Clamp `deltaTime` in WASM where needed; avoid timing from JS.
- No floating jitter in contracts: round to 1e‑3 when mapping to pixels.

## 12) Rendering Alignment
- Use shared scale/camera utils (e.g., `renderer/player/topdown/`).
- Single `METERS_TO_PIXELS` source of truth.

## 13) Testing Plan
- Unit
  - `test/unit/state/[STATE_TEST].test.js`: contract shape, numbers only, immutability.
  - `test/unit/coordinators/[COORD_TEST].test.js`: snapshot passed once/frame.
- Integration
  - Update `test/integration/*.js` to cover end-to-end path.
- Visual (optional)
  - Golden frame tolerance on demo page (±2%).
- Node smoke (WASM)
  - `npm run wasm:smoke:node` to instantiate and call key exports.

## 14) CI Gates
- Build wasm; verify required exports; run unit + integration + smoke.
- Fail CI if exports missing or lints fail.

## 15) Rollout & Rollback
- Phase 1: JS-only demo or renderer preview.
- Phase 2: WASM exports + state bridge + renderer integration.
- Phase 3: Enable flag by default after perf validation.
- Rollback: hide renderer call in `GameRenderer` and leave exports intact.

## 16) Risks & Safety Guards
- Bounds check indices in getters; return safe defaults.
- Validate input parameters; assert in dev builds.
- File size guardrails: split >400 lines; never >500 lines.

## 17) TODO Checklist
- [ ] Define precise contract [CONTRACT_SHAPE]
- [ ] Implement WASM changes [WASM_FILES_TO_EDIT]
- [ ] Add exports [EXPORTS]
- [ ] Update build scripts (exports + verify)
- [ ] Extend `WasmCoreState` [STATE_METHOD]
- [ ] Implement renderer [RENDERER_FILE]
- [ ] Wire `GameRenderer` and coordinator
- [ ] Add feature flag + persistence
- [ ] Add perf instrumentation (optional `?perf=1`)
- [ ] Unit/integration/visual tests
- [ ] CI script updates
- [ ] Verify performance budgets

## 18) Fill‑In Snippets
- EXPORTED_FUNCTIONS addition (append your symbols):
```text
"_your_export_1","_your_export_2"
```

- WasmCoreState contract example:
```javascript
get[Feature]Snapshot() {
  const ex = this.exports;
  const n = ex.get_[feature]_count?.() ?? 0;
  const items = new Array(n);
  for (let i = 0; i < n; i++) {
    items[i] = [ex.get_[feature]_x?.(i) ?? 0, ex.get_[feature]_y?.(i) ?? 0];
  }
  return Object.freeze({ items });
}
```


