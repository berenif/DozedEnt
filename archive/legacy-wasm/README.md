# Legacy WASM Files Archive

These files were part of the original monolithic game.cpp architecture.
Archived during cleanup on 2025-09-30.

## Contents
- `game.cpp` - Original 2,745-line monolithic implementation (NOT compiled in current build)
- `headers/` - Legacy header-only files (to be added in Phase 3)

## Why Archived?

The codebase underwent a major refactoring to implement the **Manager/Coordinator pattern**:

### Current Architecture (Active)
- `game_refactored.cpp` - Main entry point
- `game-host.cpp` - Host-authoritative module
- `GameGlobals.cpp/h` - Global game state
- `managers/` - 4 focused managers (Combat, GameState, Input, Player)
- `coordinators/` - GameCoordinator orchestrates managers
- `physics/` - PhysicsManager with deterministic fixed-point math

### Legacy Architecture (Archived)
- `game.cpp` - Single monolithic file with all game logic
- 27+ header-only files with mixed responsibilities
- No clear separation of concerns
- Difficult to test and extend

## Restoration

If any functionality is needed:
1. Review the file in this archive
2. Extract relevant code
3. Refactor into appropriate manager (follow single responsibility principle)
4. Follow `GUIDELINES/PROGRESS/WASM_FEATURE_IMPLEMENTATION_GUIDE.md`

**Do NOT simply copy files back - refactor properly!**

## Build Verification

After archiving `game.cpp`:
- Build scripts updated to use `game_refactored.cpp`
- All tests passing
- Binary size: ~43KB (no increase)
- No functionality lost - all features reimplemented in refactored architecture

---

**See**: `GUIDELINES/CLEANUP_PLAN.md` for complete cleanup documentation.

