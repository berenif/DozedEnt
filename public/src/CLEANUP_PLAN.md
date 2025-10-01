# Public/Src Cleanup Plan
**Date:** October 1, 2025  
**Status:** Proposed  
**Goal:** Remove dead code, duplicates, and code smells from `public/src/`

---

## Executive Summary

After reviewing the 223 JS/TS files in `public/src/`, I've identified significant technical debt:

- **13 duplicate/overlapping implementations** across audio, input, save/load, and UI systems
- **27 CSS files** with likely overlap (need consolidation)
- **55+ TODO/FIXME comments** indicating incomplete features
- **Multiple unused netcode providers** (IPFS, Torrent, Nostr, Supabase not in production use)
- **3 different wolf AI implementations** needing consolidation
- **Abandoned animation experiments** in procedural/ folder

**Estimated Impact:** Removing ~40-60 files (~25-30% reduction) while improving maintainability

---

## Priority 1: Critical Duplicates (High Impact, Low Risk)

### 1.1 Input System Consolidation ⚠️ CRITICAL

**Problem:** 3 competing input manager implementations causing confusion

**Files:**
- `input/input-manager.js` (790 lines) - Legacy 5-button system
- `managers/unified-input-manager.js` (943 lines) - Modern unified system
- `ui/input-manager.js` (~200 lines) - UI-only variant

**Current State:**
- `demo/main.js` uses `managers/input-migration-adapter.js` which wraps `managers/unified-input-manager.js`
- `input/input-manager.js` imports `ThreeButtonInputAdapter.js` (newer 3-button system)
- Conflicting approaches: 3-button vs 5-button vs unified

**Recommended Action:**
1. ✅ **KEEP:** `managers/unified-input-manager.js` (most complete, 943 lines)
2. ✅ **KEEP:** `input/ThreeButtonInputAdapter.js` (new 3-button system)
3. ✅ **KEEP:** `managers/input-migration-adapter.js` (compatibility layer)
4. ❌ **REMOVE:** `input/input-manager.js` (duplicate of unified)
5. ❌ **REMOVE:** `ui/input-manager.js` (UI-specific, outdated)
6. 🔧 **UPDATE:** `demo/main.js` to import from correct locations

**Risk:** Medium - Need to verify all import paths are updated

---

### 1.2 Audio System Consolidation

**Problem:** 2 audio manager implementations with wrapper pattern

**Files:**
- `audio/audio-manager.js` (46 lines) - Thin wrapper
- `audio/enhanced-audio-manager.js` (1283 lines) - Full implementation
- `audio/audio-integration.js` - Integration glue
- `audio/phase-audio-system.js` - Phase-specific audio

**Current State:**
- `audio-manager.js` wraps `enhanced-audio-manager.js` for backward compatibility
- Wrapper is necessary but could be simplified

**Recommended Action:**
1. ✅ **KEEP:** `audio/enhanced-audio-manager.js` (core implementation)
2. ✅ **KEEP:** `audio/audio-manager.js` (compatibility wrapper, simplify if possible)
3. ⚠️ **REVIEW:** `audio/audio-integration.js` - May be redundant with enhanced manager
4. ⚠️ **REVIEW:** `audio/phase-audio-system.js` - Integrate into enhanced manager

**Risk:** Low - Wrapper pattern is clean

---

### 1.3 Save/Load System Consolidation

**Problem:** Duplicate save/load implementations

**Files:**
- `game/save-load-manager.js` - One implementation
- `game/save-load-integration.js` - Another implementation (also has `SaveLoadManager` class)
- `game/persistence-manager.js` - Overlapping functionality

**Recommended Action:**
1. ⚠️ **AUDIT:** Determine which is actively used
2. ❌ **REMOVE:** Duplicate implementation
3. 🔧 **MERGE:** Functionality into single manager

**Risk:** Medium - Need to check for feature differences

---

### 1.4 Achievement System Consolidation

**Problem:** Duplicate achievement implementations

**Files:**
- `game/achievement-manager.js` (exported `AchievementManager`)
- `game/achievement-integration.js` (also has `AchievementManager` class, not exported)

**Recommended Action:**
1. ✅ **KEEP:** `game/achievement-manager.js` (exported)
2. ❌ **REMOVE:** `game/achievement-integration.js` (duplicate, not exported)

**Risk:** Low - Clear duplicate

---

## Priority 2: Unused Netcode Providers (Medium Impact, Low Risk)

### 2.1 Inactive Network Providers

**Problem:** Multiple netcode providers that aren't used in production

**Files to Remove:**
- `netcode/ipfs.js` + `ipfs.d.ts` - IPFS provider (not in production)
- `netcode/torrent.js` + `torrent.d.ts` - Torrent provider (experimental)
- `netcode/nostr.js` - Nostr protocol (experimental)
- `netcode/supabase.js` + `supabase.d.ts` - Supabase provider (not configured)
- `netcode/firebase.js` + `firebase.d.ts` - Firebase provider (not configured)

**Currently Used:**
- `netcode/mqtt.js` - **ACTIVE** (main production provider)
- `netcode/peer.js` - **ACTIVE** (P2P fallback)
- `netcode/room.js` - **ACTIVE** (room management)

**Recommended Action:**
1. ❌ **REMOVE:** ipfs, torrent, nostr, supabase, firebase implementations
2. ✅ **KEEP:** mqtt, peer, room (active in production)
3. 🔧 **UPDATE:** `network-provider-manager.js` to remove references

**Risk:** Low - These are clearly unused experiments

---

### 2.2 Rollback Netcode System Audit

**Files:**
- `netcode/rollback-netcode.js` + `.d.ts` (30 TODOs!)
- `netcode/rollback-p2p.js` + `.d.ts`
- `netcode/rollback-lobby.js` + `.d.ts`
- `netcode/rollback-performance-optimizer.js`

**Question:** Is rollback netcode actually implemented/used?

**Recommended Action:**
1. ⚠️ **AUDIT:** Check if rollback is functional or experimental
2. If experimental → Move to `/demos` or `/experimental`
3. If dead → Remove entirely

**Risk:** Medium - Need to verify usage

---

## Priority 3: Wolf AI Consolidation (Medium Impact, Medium Risk)

### 3.1 Multiple Wolf AI Implementations

**Problem:** 3 different wolf AI systems

**Files:**
- `ai/wolf-ai.js` - Original implementation (1 TODO)
- `ai/wolf-ai-enhanced.js` - Enhanced version (5 classes, 1197 lines)
- `ai/wolf-ai-wasm-integration.js` - WASM integration layer (2 TODOs)

**Recommended Action:**
1. ⚠️ **AUDIT:** Which is currently used?
2. ✅ **KEEP:** Most recent/complete version
3. ❌ **REMOVE:** Older implementations
4. 🔧 **DOCUMENT:** Decision in AGENTS.md

**Risk:** Medium - Wolf AI is complex, need careful testing

---

### 3.2 Wolf Animation Cleanup

**Problem:** Multiple overlapping wolf animation implementations

**Files:**
- `animation/enemy/wolf-animation.js`
- `animation/enemy/wolf-animator.js`
- `animation/enemy/wolf-body.js`
- `animation/enemy/wolf-body-variations.js`
- `animation/enemy/wolf-body-physics.js`
- `animation/enemy/enhanced-wolf-body.js`
- `animation/enemy/enhanced-wolf-integration.js`
- `animation/enemy/enhanced-wolf-procedural.js`
- `animation/enemy/wolf-procedural.js` (22 TODOs!)
- `animation/enemy/realistic-wolf-physics.js`
- `animation/enemy/wolf-anatomy.js`
- `animation/enemy/advanced-fur-system.js`

**Recommended Action:**
1. ⚠️ **AUDIT:** Map the dependency chain
2. ✅ **KEEP:** Core implementation + WASM integration
3. ❌ **REMOVE:** Experimental variations and duplicates
4. 📦 **ARCHIVE:** Advanced features (fur, anatomy) to `/experimental` if incomplete

**Risk:** High - Complex animation system, need thorough testing

---

## Priority 4: CSS Consolidation (Medium Impact, Low Risk)

### 4.1 CSS File Audit

**Problem:** 27 CSS files with likely overlap

**Files (by category):**

**Core UI:**
- `base.css`
- `common.css`
- `ui.css`
- `styles.css` ⚠️ Likely duplicate
- `site.css` ⚠️ Likely duplicate

**Layout:**
- `responsive.css`
- `mobile.css`
- `desktop-ui.css`
- `game-viewport.css`

**Combat/Gameplay:**
- `combat.css`
- `combat-ui-optimizer.css` ⚠️ Merge into combat.css
- `player.css`
- `enemies.css`

**Accessibility:**
- `comprehensive-accessibility.css`
- `reduced-cognitive-load.css` ⚠️ Merge into comprehensive
- `threat-awareness-ui.css`

**UI Systems:**
- `loading.css`
- `phases.css`
- `roguelike-hud.css`
- `modern-roguelite-ui.css` ⚠️ Duplicate?
- `persistence-ui.css`
- `death-feedback-system.css`
- `stable-ui-layouts.css`
- `critical-ui-hierarchy.css`

**Effects:**
- `ambient.css`
- `world.css`

**Multiplayer:**
- `working-multiplayer-demo.css` ⚠️ Demo-only

**Recommended Action:**
1. ⚠️ **AUDIT:** Check actual usage in HTML files
2. 🔧 **MERGE:** Overlapping files (styles/site/common → base.css)
3. ❌ **REMOVE:** Unused demo CSS
4. 📦 **ORGANIZE:** Group related CSS into folders (ui/, gameplay/, effects/)

**Risk:** Low - CSS is easy to test visually

---

## Priority 5: Unused/Experimental Files (Low Impact, Low Risk)

### 5.1 Dead Code Files

**Files to Remove:**

**Unused Integrations:**
- `game/replay-system.js` (1 TODO, unused?)
- `effects/phase-transition-effects.js`
- `effects/visual-effects-integration.js` (may be obsolete)

**Duplicate UI Managers:**
- `ui/enhanced-ui-manager.js` vs `ui/desktop-ui-manager.js`
- `ui/enhanced-ui-integration.js`

**Unused Input:**
- `input/integration-example.js` - Example code
- `input/README.md` - Outdated docs (3 TODOs)

**Demo/Test Files:**
- `netcode/rollup.config.animations.js` - Build config in wrong location
- `netcode/rollup.config.wolf.js` - Build config in wrong location
- `utils/dead-code-eliminator.js` - Ironic
- `utils/test-utilities.js` - Should be in `/test`
- `utils/test-runner.js` - Should be in `/test`
- `utils/coverage-reporter.js` - Should be in `/test`

**Recommended Action:**
1. ❌ **REMOVE:** All files above
2. 📦 **MOVE:** Test utilities to `/test` folder
3. 📦 **MOVE:** Build configs to `/tools/config`

**Risk:** Very Low - These are clearly unused

---

### 5.2 Procedural Animation Experiments

**Problem:** Large procedural animation system that may be incomplete

**Files:**
- `animation/procedural/procedural-wolf-integration.js` (8 TODOs)
- `animation/procedural/realistic-procedural-animator.js`
- `animation/player/procedural/` (entire folder, 9 files)

**Recommended Action:**
1. ⚠️ **AUDIT:** Is procedural animation system used?
2. If unused → 📦 **MOVE** to `/experimental` or `/archive`
3. If used → 📝 **DOCUMENT** completion status

**Risk:** Medium - Large feature, need to verify usage

---

## Priority 6: TypeScript Declaration Files

### 6.1 Orphaned .d.ts Files

**Files:**
- `netcode/*.d.ts` (8 files) - Many for removed providers
- `utils/wasm.d.ts` - Outdated?

**Recommended Action:**
1. ⚠️ **AUDIT:** Which .d.ts files match active .js files
2. ❌ **REMOVE:** Orphaned declarations
3. 🔧 **UPDATE:** Outdated type definitions

**Risk:** Low - Type definitions don't affect runtime

---

## Implementation Strategy

### Phase 1: Safe Removals (Week 1)
1. Remove unused netcode providers (ipfs, torrent, nostr, supabase, firebase)
2. Remove demo/test files from src/ (move to proper locations)
3. Remove orphaned .d.ts files
4. Remove duplicate achievement-integration.js

**Expected Reduction:** ~15-20 files

---

### Phase 2: Input System Consolidation (Week 1-2)
1. Audit all input manager usages
2. Update imports to unified system
3. Remove legacy input managers
4. Test thoroughly on desktop + mobile + gamepad

**Expected Reduction:** ~2-3 files  
**Risk:** Medium - Requires testing

---

### Phase 3: Wolf AI/Animation Consolidation (Week 2)
1. Audit wolf AI usage
2. Map wolf animation dependencies
3. Consolidate into single system
4. Archive experimental features

**Expected Reduction:** ~8-12 files  
**Risk:** High - Requires extensive testing

---

### Phase 4: CSS Consolidation (Week 2-3)
1. Audit CSS usage in HTML
2. Merge overlapping stylesheets
3. Organize into logical folders
4. Update HTML references

**Expected Reduction:** ~8-12 files (merged)  
**Risk:** Low

---

### Phase 5: Audio/Save System Cleanup (Week 3)
1. Audit save/load implementations
2. Consolidate into single system
3. Simplify audio integration

**Expected Reduction:** ~3-5 files  
**Risk:** Medium

---

## Code Smells Identified

### 1. God Classes
- ❌ `animation/player/procedural/player-animator.js` (1194 lines)
- ❌ `utils/wasm-lazy-loader.js` (1293 lines)
- ❌ `audio/enhanced-audio-manager.js` (1283 lines)

**Action:** Split into smaller focused classes

---

### 2. Configuration Scattered
- Build configs in `/netcode`
- Protocol versions in `/config`
- Environment config in `/utils`

**Action:** Consolidate into `/config` folder

---

### 3. Poor Separation of Concerns
- Rollup configs in `/netcode` instead of `/tools`
- Test utilities in `/utils` instead of `/test`
- Demo code mixed with production

**Action:** Reorganize by concern

---

### 4. Incomplete Features (55+ TODOs)
- `netcode/rollback-netcode.d.ts` (30 TODOs!)
- `animation/enemy/wolf-procedural.js` (22 TODOs)
- Many files with 1-8 TODOs

**Action:**
1. Complete or remove incomplete features
2. Document intentional TODOs with issue numbers

---

## Success Metrics

**Before Cleanup:**
- 223 JS/TS files
- 27 CSS files
- 55+ TODO comments
- ~50,000 lines of code

**After Cleanup (Target):**
- ~160-180 files (~25% reduction)
- ~18-20 CSS files (~30% reduction)
- <30 documented TODOs
- ~35,000-40,000 lines (~20% reduction)

**Quality Improvements:**
- ✅ Single input system (not 3)
- ✅ Clear audio architecture
- ✅ One wolf AI implementation
- ✅ Organized CSS structure
- ✅ No duplicate managers

---

## Risks & Mitigation

### High Risk Items
1. **Wolf AI consolidation** - Complex, needs extensive testing
   - *Mitigation:* Comprehensive test suite, staged rollout
   
2. **Input system migration** - Used everywhere
   - *Mitigation:* Keep compatibility layer, test all input methods

### Medium Risk Items  
3. **Save/Load consolidation** - User data involved
   - *Mitigation:* Ensure backward compatibility, migration script
   
4. **Rollback netcode audit** - May break multiplayer
   - *Mitigation:* Test in isolated environment first

### Low Risk Items
5. **CSS consolidation** - Visual only
   - *Mitigation:* Visual regression testing
   
6. **Removing unused providers** - Not in production
   - *Mitigation:* Keep in git history, can restore if needed

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Prioritize phases** based on project timeline
3. **Create GitHub issues** for each phase
4. **Set up feature branches** for each major change
5. **Begin Phase 1** (safe removals)

---

## Questions for Decision

1. ❓ Is rollback netcode actively used or experimental?
2. ❓ Which wolf AI implementation is production?
3. ❓ Is procedural animation system complete?
4. ❓ Should we keep netcode providers for future use?
5. ❓ Priority: Performance vs maintainability vs features?

---

**Document Version:** 1.0  
**Last Updated:** October 1, 2025  
**Author:** AI Code Review  
**Status:** Awaiting Approval

