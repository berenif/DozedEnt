### Rule: Always load the latest WASM in demos

- Prefer the path `wasm/game.wasm` for demos in `public/`.
- The demo resolver appends a cache-busting query `?v=<buildTime>` (from `window.__BUILD__`) or `Date.now()` fallback, so the browser fetches the newest binary after each build.
- All WASM fetches default to `cache: 'no-store'` in:
  - `public/src/utils/wasm.js`
  - `public/src/utils/wasm-helpers.js`
  - `public/src/utils/wasm-lazy-loader.js` (overridable via `fetchOptions.cache`)

Operational notes
- Ensure builds output to `public/wasm/game.wasm` (already done by build scripts).
- If you need browser caching in production, pass an explicit `fetchOptions.cache` or serve versioned filenames and remove the query param logic.
- `window.__BUILD__` is injected into HTML by the public build; if unavailable, the resolver falls back to `Date.now()` so reloads still break cache.


