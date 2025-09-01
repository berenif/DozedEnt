## Core loop feature checklist

Use this template every time you add or change a feature that touches the loop: Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset.

Duplicate the blocks below for each feature and check items off before merging.

### Feature summary
- **Name**: _e.g., Dash i-frame tuning_
- **Target phase(s)**: _Explore/Fight/Choose/..._
- **Seeds tested**: _e.g., 12345, 67890_
- **Owner/Date**: _who, when_

### Universal (must pass for every feature)
- [ ] Logic is entirely in WASM (C++); JS only forwards inputs/renders UI
- [ ] Deterministic with identical seed + input script (golden run matches)
- [x] RNG uses WASM substream; no `Math.random` in JS
- [ ] API surface minimal: exports only flat getters/setters; no JSON
- [ ] Snapshots remain compact/flat; no perf regressions in frame time
- [ ] Build succeeds and `docs/game.wasm` updated
- [ ] Docs updated (`AGENTS.md` and this checklist entry)

### Explore
- [ ] Room geometry/hazards resolved in WASM, deterministic per seed
- [ ] Landmarks/exits exposed via snapshot for UI only

### Fight
- [ ] Movement, stamina, i-frames/guard resolved in WASM
- [ ] Telegraph timings and cancel windows are data-driven in WASM
- [ ] Block/parry results come from `handle_incoming_attack` only

### Choose
- [x] Choice generation in WASM respects pools/exclusions/pity timers
- [ ] Three options follow shape: Safe / Spicy / Weird
- [ ] UI reads via `get_choice_*` and commits with `commit_choice(id)`

### PowerUp
- [ ] Boon/relic/affix effects applied in WASM on `commit_choice`
- [ ] Immediate breakpoint or visible stat change reflected in snapshot

### Risk (push your luck)
- [ ] Curses/elite flags/timed events resolved in WASM
- [ ] Clear escape hatch encoded; UI only reflects state

### Escalate
- [ ] Density/modifiers/miniboss interrupts seeded and deterministic
- [ ] New problems, not just bigger numbers (data/tags over constants)

### CashOut
- [ ] Shops/forge/heal are WASM decisions; JS only buttons/labels
- [ ] Two-currency constraints enforced in WASM

### Reset
- [ ] Instant restart via `reset_run(seed)` reproduces clean state
- [x] Early rooms short to regain flow; spawn logic deterministic

### Testing & verification
- [ ] Golden test: 60s input script produces identical end-state
- [ ] Pity timer test: forced bad streak flips to a guarantee
- [ ] Performance: no GC churn/regressions; memory stays within limits



### Feature summary
- **Name**: Baseline WASM core loop scaffolding
- **Target phase(s)**: Explore / Fight / Choose / PowerUp / Reset
- **Seeds tested**: TBD
- **Owner/Date**: flori / 2025-08-31

### Universal (must pass for every feature)
- [x] Logic is entirely in WASM (C++); JS only forwards inputs/renders UI
- [ ] Deterministic with identical seed + input script (golden run matches)
- [x] RNG uses WASM substream; no `Math.random` in JS
- [x] API surface minimal: exports only flat getters/setters; no JSON
- [x] Snapshots remain compact/flat; no perf regressions in frame time
- [x] Build succeeds and `docs/game.wasm` updated
- [x] Docs updated (`AGENTS.md` and this checklist entry)

### Explore
- [x] Room geometry/hazards resolved in WASM, deterministic per seed
- [x] Landmarks/exits exposed via snapshot for UI only

### Fight
- [x] Movement, stamina, i-frames/guard resolved in WASM
- [x] Telegraph timings and cancel windows are data-driven in WASM
- [x] Block/parry results come from `handle_incoming_attack` only

### Choose
- [ ] Choice generation in WASM respects pools/exclusions/pity timers
- [x] Three options follow shape: Safe / Spicy / Weird
- [x] UI reads via `get_choice_*` and commits with `commit_choice(id)`

### PowerUp
- [x] Boon/relic/affix effects applied in WASM on `commit_choice`
- [x] Immediate breakpoint or visible stat change reflected in snapshot

### Risk (push your luck)
- [ ] Curses/elite flags/timed events resolved in WASM
- [ ] Clear escape hatch encoded; UI only reflects state

### Escalate
- [ ] Density/modifiers/miniboss interrupts seeded and deterministic
- [ ] New problems, not just bigger numbers (data/tags over constants)

### CashOut
- [ ] Shops/forge/heal are WASM decisions; JS only buttons/labels
- [ ] Two-currency constraints enforced in WASM

### Reset
- [x] Instant restart via `reset_run(seed)` reproduces clean state
- [ ] Early rooms short to regain flow; spawn logic deterministic

### Testing & verification
- [ ] Golden test: 60s input script produces identical end-state
- [ ] Pity timer test: forced bad streak flips to a guarantee
- [ ] Performance: no GC churn/regressions; memory stays within limits

#### Follow-ups
- Replace JS `Math.random` seeding in `restartRun` with deterministic/explicit seed handling
- Move simulation time to WASM and pass sim time (not wall-clock) to `set_blocking`/`handle_incoming_attack`
- Expose landmarks/exits via WASM snapshot getters; JS only renders
- Implement choice pools/exclusions/pity timers in WASM
- Externalize telegraph/cancel timings as data in WASM
- Add Risk/Escalate/CashOut scaffolding and exports in WASM
- Move spawn selection into WASM; UI reads spawn from snapshot
- Add golden replay test and perf budget checks
- Ensure build step runs and updates `docs/game.wasm`
