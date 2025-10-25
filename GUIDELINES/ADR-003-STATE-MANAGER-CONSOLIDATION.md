# ADR-003: State Manager Consolidation

Status: Accepted  
Date: January 2025  
Deciders: Architecture Team

## Context
Multiple JS-side state managers duplicated gameplay state, diverged from WASM truth, and created maintenance burden.

## Decision
Consolidate on a single read-only JS facade over WASM (e.g., `WasmCoreState`). All gameplay state is owned and mutated in WASM. JS reads snapshots for rendering/UI/network serialization only.

## Implementation
- Remove/merge duplicate JS managers holding gameplay state.
- Introduce/standardize `WasmCoreState` with batched getters and caching.
- Ensure inputs flow JS → WASM (via `set_player_input` or specific actions).
- Update renderers/UI to read from `WasmCoreState`; no writes to gameplay state in JS.

## Consequences
✅ Single source of truth  
✅ Fewer desync/debug issues  
✅ Clear ownership boundaries  
❌ Requires refactors to remove legacy state mirrors

## Related
- ADR-001: Remove JavaScript Physics Simulation
- ADR-002: Math.random() Elimination
- GUIDELINES/AGENTS.md (Architecture principles)


