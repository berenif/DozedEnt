# ADR-002: Eliminate Math.random() From Gameplay

Status: Accepted  
Date: January 2025  
Deciders: Architecture Team

## Context
`Math.random()` breaks determinism across clients and platforms, causing desync in multiplayer and non-reproducible tests.

## Decision
Remove all uses of `Math.random()` from gameplay paths. Use deterministic RNG inside WASM; allow seeded JS RNG only for UI/visual polish.

## Implementation
- Gameplay randomness lives in C++ RNG (LCG or equivalent); all effects derived from seed.
- JS may import a seeded RNG for UI-only flair (particles/colors) with seeds synced from WASM.
- Lint rule and code review gate: no `Math.random()` in gameplay modules.

### Wrong
```javascript
// Non-deterministic gameplay
if (Math.random() < 0.25) {
  crit = true;
}
```

### Correct
```javascript
// Deterministic via WASM export
const r = wasmModule.get_random_float();
const crit = r < 0.25;
```

## Consequences
✅ Deterministic replays and multiplayer sync  
✅ Stable cross-platform behavior  
❌ Must plumb new randomness needs through WASM exports

## Related
- ADR-001: Remove JavaScript Physics Simulation
- ADR-003: State Manager Consolidation
- GUIDELINES/AGENTS.md (Determinism rules)


