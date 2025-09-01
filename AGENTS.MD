## Agent guide (WASM-first)

### Scope
- This repo hosts a tiny multiplayer playground with all game logic in WebAssembly (C++). JavaScript handles only rendering, input, and networking.
- Golden rule: keep every piece of game logic in the WASM module, not in JS. UI may read snapshots/exports and forward inputs. [[All logic in WASM]]

### Current WASM API surface
- Core sim:
  - `start()` — zeroes runtime state for dev.
  - `update(dirX, dirY, isRolling, dtSeconds)` — deterministic tick.
  - `get_x()`, `get_y()` — player position (normalized 0..1).
  - `get_stamina()` — stamina 0..1.
  - `on_attack()` — spends stamina; returns 1 if accepted.
  - `on_roll_start()` — applies roll start cost; 1 if accepted.
  - `set_blocking(on, faceX, faceY, nowSeconds)` — toggles/updates block; returns 1 if active.
  - `get_block_state()` — 1 if blocking, else 0.
  - `handle_incoming_attack(ax, ay, dirX, dirY, nowSeconds)` — -1 ignore, 0 hit, 1 block, 2 perfect parry.
- Run/loop scaffold:
  - `init_run(seed, start_weapon)` — deterministic run init.
  - `reset_run(new_seed)` — instant reseed/restart.
  - `get_phase()` — returns phase enum: Explore=0, Fight=1, Choose=2, PowerUp=3, Risk=4, Escalate=5, CashOut=6, Reset=7.
  - Choice getters: `get_choice_count()`, `get_choice_id(i)`, `get_choice_type(i)`, `get_choice_rarity(i)`, `get_choice_tags(i)`.
  - `commit_choice(choice_id)` — applies selection, exits Choose.

### JS contract (UI only)
- Per frame: call `update(...)`, then read `get_x/get_y`, `get_stamina` for HUD.
- Show choice overlay when `get_phase() === 2` (Choose). Populate from choice getters; invoke `commit_choice(id)` on click.
- Restart uses `reset_run(seed)`; JS must not change gameplay outcomes.

### Build
- PowerShell (Windows):
  ```powershell
  . .\emsdk\emsdk_env.ps1; em++ wasm\game.cpp -O3 -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s EXPORT_ALL=0 -s ALLOW_MEMORY_GROWTH=1 -o docs\game.wasm
  ```

### Determinism rules
- RNG lives in WASM; seed passed from JS. No `Math.random` in JS for gameplay.
- JS time is only for UI timers/animation; gameplay uses inputs and WASM’s deterministic timers.

### Extending choices/boons
- Add data and effect application in WASM. JS only renders labels and forwards `commit_choice(id)`.
- Keep snapshots/exports flat and compact; avoid JSON for runtime UI except behind debug flags.

### PR checklist
- Logic resides in WASM; JS only forwards inputs and renders.
- Deterministic with identical seed+inputs.
- Build command succeeds; `docs/game.wasm` updated.
- No regressions in `update`, stamina, roll, block/parry.
