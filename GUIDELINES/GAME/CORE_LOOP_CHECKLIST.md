## Core loop feature checklist

Use this template every time you add or change a feature that touches the loop: Explore → Fight → Choose → PowerUp → Risk → Escalate → CashOut → Reset.

Duplicate the blocks below for each feature and check items off before merging.

## 🚀 Ongoing Improvements & Future Work

### High Priority
- [ ] **Enhanced Choice Variety** - Expand from 18 to 30+ choices with more diverse mechanics
- [ ] **Save/Load System** - Persistent progression across sessions
- [ ] **Achievement System** - Track player milestones and unlockables
- [ ] **Leaderboards** - Competitive scoring and rankings
- [ ] **Tutorial System** - Phase-specific guidance for new players

### Medium Priority
- [ ] **Advanced Multiplayer Features** - Spectator mode, team play, tournaments
- [ ] **Visual Polish** - Enhanced animations and particle effects
- [ ] **Audio System** - Dynamic music and sound effects per phase
- [ ] **Modding Support** - Custom choice/curse/enemy definitions
- [ ] **Analytics Dashboard** - Player behavior and balance insights

### Technical Debt
- [ ] **Performance Optimization** - Reduce WASM binary size and memory usage
- [ ] **Code Splitting** - Separate concerns into focused modules
- [ ] **Error Handling** - Comprehensive error boundaries and recovery
- [ ] **Accessibility** - Screen reader support and keyboard navigation
- [ ] **Mobile Optimization** - Touch controls and responsive design

### Feature summary
- **Name**: _e.g., Dash i-frame tuning_
- **Target phase(s)**: _Explore/Fight/Choose/..._
- **Seeds tested**: _e.g., 12345, 67890_
- **Owner/Date**: _who, when_

### Universal (must pass for every feature)
- [ ] Logic is entirely in WASM (C++); JS only forwards inputs/renders UI
- [ ] Deterministic with identical seed + input script (golden run matches)
- [ ] API surface minimal: exports only flat getters/setters; no JSON
- [ ] Snapshots remain compact/flat; no perf regressions in frame time
- [ ] Build succeeds and `public/game.wasm` updated
- [ ] Docs updated (`AGENTS.md` and this checklist entry)
- [ ] Balance JSON changes reflected in `src/wasm/generated/balance_data.h`
- [ ] Golden tests re-run after balance tuning
- [ ] All new exports documented in `BUILD/API.md`
- [ ] Performance impact assessed (frame time ≤ 16ms target)
- [ ] Memory usage validated (no leaks, stays within limits)
- [ ] Cross-platform compatibility verified

### Explore
- [ ] Room geometry/hazards resolved in WASM, deterministic per seed
- [ ] Landmarks/exits exposed via snapshot for UI only

### Fight
- [ ] Movement, stamina, i-frames/guard resolved in WASM
- [ ] Telegraph timings and cancel windows are data-driven in WASM
- [ ] Block/parry results come from `handle_incoming_attack` only

### Choose
- [] Choice generation in WASM respects pools/exclusions/pity timers
- [ ] Three options follow shape: Safe / Spicy / Weird
- [ ] UI reads via `get_choice_*` and commits with `commit_choice(id)`



### 📈 Phase: Escalate
- [ ] **Difficulty Scaling** - Enemy density increases properly via `get_escalation_level()`
- [ ] **Modifier System** - Environmental challenges added (5 enemy modifiers)
- [ ] **Miniboss Spawns** - Interrupt events deterministic with `get_miniboss_*` functions
- [ ] **Mechanical Complexity** - New problems, not just stat inflation
- [ ] **Data-Driven Design** - Uses tags/systems over hardcoded values
- [ ] **Player Adaptation** - Forces strategy changes
- [ ] **Escalation Events** - Trigger system via `trigger_escalation_event()`
- [ ] **Enemy Scaling** - Multiplier system (`get_spawn_rate_modifier()`, etc.)



### Reset
- [ ] Instant restart via `reset_run(seed)` reproduces clean state
- [ ] Early rooms short to regain flow; spawn logic deterministic

### Testing & verification
- [ ] Golden test: 60s input script produces identical end-state
- [ ] Performance: no GC churn/regressions; memory stays within limits
- [ ] Cross-platform compatibility: Windows, Mac, Linux tested
- [ ] Browser compatibility: Chrome, Firefox, Safari, Edge tested
- [ ] Network synchronization: Multiplayer consistency verified
- [ ] Stress testing: Extended gameplay sessions (>2 hours) stable
- [ ] Memory leak testing: No memory growth over time
- [ ] WASM module validation: All exports functional and deterministic
- [ ] Save/load system integration testing
- [ ] Complete 8-phase loop integration testing
