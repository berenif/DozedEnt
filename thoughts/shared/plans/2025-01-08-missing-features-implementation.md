# Missing Features Implementation Plan

## Overview

This plan addresses the remaining unimplemented features from the game's "Future Improvements" section, focusing on integrating existing WASM systems with JavaScript UI and adding missing gameplay features.

## Current State Analysis

After analyzing the codebase, I found that while the WASM backend has comprehensive implementations for save/load, achievements, and statistics systems, several features lack proper JavaScript integration and UI components. The following features need implementation:

### Already Implemented in WASM but Need JS Integration:
- Save/Load system (`save-load-system.h` exists)
- Achievement tracking (`achievement-system.h` exists)
- Statistics tracking (`statistics-system.h` exists)
- Leaderboards (`leaderboard-system.js` partially exists)

### Not Yet Implemented:
- More choice variety (current: 18 choices)
- Multiplayer phase synchronization
- Visual effects for phase transitions
- Audio cues for phase changes
- Tutorial for each phase

### Key Discoveries:
- WASM exports are already defined for save/load operations: `create_save_data`, `load_save_data`, `quick_save`, `auto_save_check`
- Achievement system has 21 pre-defined achievements with full tracking: `get_achievement_*` exports
- Statistics system tracks 32 different metrics: `get_statistic_*` exports
- Leaderboard JavaScript exists but lacks server integration

## Desired End State

After implementation:
- Players can save and load their game progress with a clean UI
- Achievement notifications appear when unlocked with appropriate visual/audio feedback
- Statistics are displayed in a comprehensive dashboard
- Leaderboards show global rankings (when server is available) and local personal bests
- Phase transitions have smooth visual and audio effects
- New players have access to interactive tutorials for each phase
- Multiplayer games stay synchronized across phase transitions
- Choice variety increased from 18 to at least 30 choices

### Verification Criteria:
- Save/load works reliably across browser sessions
- Achievement unlock notifications display correctly
- Statistics update in real-time during gameplay
- Phase transitions feel smooth and polished
- Tutorial helps new players understand each phase
- Multiplayer phase sync prevents desync issues

## What We're NOT Doing

- Building a backend server for cloud saves (using local storage only)
- Creating a real leaderboard server (local leaderboards only)
- Adding Steam/platform-specific achievements
- Implementing cloud sync for statistics
- Creating cutscenes or elaborate animations
- Adding voice-over tutorials

## Implementation Approach

We'll implement features in order of impact and dependency:
1. First, complete JavaScript integration for existing WASM systems
2. Add UI components for save/load, achievements, and statistics
3. Implement phase transition effects and audio cues
4. Add tutorial system
5. Enhance multiplayer synchronization
6. Expand choice variety

---

## Phase 1: Save/Load System JavaScript Integration

### Overview
Connect the existing WASM save/load system to JavaScript and create UI for save management.

### Changes Required:

#### 1. Save/Load Manager
**File**: `src/game/save-load-manager.js` (new)
**Changes**: Create manager to handle save/load operations

```javascript
import { WasmManager } from '../wasm/wasm-manager.js';

export class SaveLoadManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    this.saveSlots = 3;
    this.autoSaveEnabled = true;
    this.autoSaveInterval = 60000; // 1 minute
  }
  
  async saveGame(slotIndex) {
    const saveDataPtr = this.wasmManager.exports.create_save_data();
    const saveSize = this.wasmManager.exports.get_save_data_size();
    const saveData = new Uint8Array(this.wasmManager.memory.buffer, saveDataPtr, saveSize);
    
    // Store in localStorage
    const key = `game_save_slot_${slotIndex}`;
    const saveString = btoa(String.fromCharCode(...saveData));
    localStorage.setItem(key, saveString);
    
    // Store metadata
    const metadata = {
      timestamp: Date.now(),
      version: this.wasmManager.exports.get_save_version(),
      info: this.wasmManager.exports.get_save_statistics()
    };
    localStorage.setItem(`${key}_meta`, JSON.stringify(metadata));
    
    return true;
  }
  
  async loadGame(slotIndex) {
    const key = `game_save_slot_${slotIndex}`;
    const saveString = localStorage.getItem(key);
    if (!saveString) return false;
    
    const saveData = Uint8Array.from(atob(saveString), c => c.charCodeAt(0));
    const result = this.wasmManager.exports.load_save_data(saveData, saveData.length);
    
    return result === 1;
  }
}
```

#### 2. Save/Load UI Component
**File**: `src/ui/save-load-ui.js` (new)
**Changes**: Create UI for save/load operations

```javascript
export class SaveLoadUI {
  constructor(saveLoadManager) {
    this.saveLoadManager = saveLoadManager;
    this.createUI();
  }
  
  createUI() {
    // Create save/load menu with slot selection
    // Add quick save/load buttons
    // Display save metadata (level, gold, play time)
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Save data persists in localStorage: `localStorage.getItem('game_save_slot_0') !== null`
- [ ] Load restores game state: `wasmManager.exports.load_save_data() === 1`
- [ ] Auto-save triggers periodically: `wasmManager.exports.auto_save_check() === 1`
- [ ] Save validation passes: `wasmManager.exports.validate_save_data() === 1`

#### Manual Verification:
- [ ] Save menu appears when pressing F5 or clicking save button
- [ ] Load menu shows all saved games with metadata
- [ ] Loading a save restores player position, stats, and inventory
- [ ] Auto-save indicator appears when auto-saving

---

## Phase 2: Achievement System UI Integration

### Overview
Create achievement notification system and achievement viewer UI.

### Changes Required:

#### 1. Achievement Manager Integration
**File**: `src/game/achievement-manager.js` (new)
**Changes**: Bridge between WASM achievements and JavaScript UI

```javascript
export class AchievementManager {
  constructor(wasmManager, uiManager) {
    this.wasmManager = wasmManager;
    this.uiManager = uiManager;
    this.checkInterval = 1000; // Check every second
    this.lastCheckedCount = 0;
  }
  
  checkNewAchievements() {
    const newCount = this.wasmManager.exports.get_newly_unlocked_count();
    if (newCount > this.lastCheckedCount) {
      for (let i = this.lastCheckedCount; i < newCount; i++) {
        const achievementId = this.wasmManager.exports.get_newly_unlocked_id(i);
        this.showAchievementNotification(achievementId);
      }
      this.lastCheckedCount = newCount;
    }
  }
  
  showAchievementNotification(achievementId) {
    const info = JSON.parse(this.wasmManager.exports.get_achievement_info_json(achievementId));
    this.uiManager.showAchievementPopup(info);
  }
}
```

#### 2. Achievement UI Component
**File**: `src/ui/achievement-ui.js` (new)
**Changes**: Achievement notifications and viewer

```javascript
export class AchievementUI {
  constructor() {
    this.notificationQueue = [];
    this.createNotificationSystem();
    this.createAchievementViewer();
  }
  
  showAchievementPopup(achievementInfo) {
    // Create animated popup with achievement details
    // Play sound based on rarity
    // Add to achievement log
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Achievement unlock detection works: `get_newly_unlocked_count() > 0`
- [ ] Achievement data retrieval works: `get_achievement_info_json() returns valid JSON`
- [ ] Achievement progress tracking: `get_achievement_progress() updates correctly`

#### Manual Verification:
- [ ] Achievement popup appears when unlocked
- [ ] Different rarities have different visual/audio effects
- [ ] Achievement viewer shows all achievements with progress
- [ ] Hidden achievements display correctly

---

## Phase 3: Statistics Dashboard

### Overview
Create comprehensive statistics display showing player performance metrics.

### Changes Required:

#### 1. Statistics Manager
**File**: `src/game/statistics-manager.js` (new)
**Changes**: Interface for statistics system

```javascript
export class StatisticsManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    this.updateInterval = 5000; // Update every 5 seconds
  }
  
  getStatistics() {
    return JSON.parse(this.wasmManager.exports.get_all_statistics_json());
  }
  
  getSessionStats() {
    return JSON.parse(this.wasmManager.exports.get_session_statistics_json());
  }
}
```

#### 2. Statistics UI
**File**: `src/ui/statistics-dashboard.js` (new)
**Changes**: Statistics visualization dashboard

```javascript
export class StatisticsDashboard {
  constructor(statisticsManager) {
    this.statisticsManager = statisticsManager;
    this.createDashboard();
  }
  
  createDashboard() {
    // Create tabbed interface for different stat categories
    // Add charts for performance over time
    // Display personal records
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Statistics update in real-time: `update_statistic() modifies values`
- [ ] Session tracking works: `get_session_statistics_json() returns current session`
- [ ] Historical data persists: `get_statistic_history() returns past data`

#### Manual Verification:
- [ ] Dashboard displays all statistics categories
- [ ] Charts update with new data
- [ ] Personal bests are highlighted
- [ ] Export statistics to JSON works

---

## Phase 4: Phase Transition Effects

### Overview
Add visual and audio effects for phase transitions to enhance game feel.

### Changes Required:

#### 1. Phase Transition Manager
**File**: `src/effects/phase-transition-manager.js` (new)
**Changes**: Coordinate transition effects

```javascript
export class PhaseTransitionManager {
  constructor(visualEffectsManager, audioManager, gameStateManager) {
    this.vfx = visualEffectsManager;
    this.audio = audioManager;
    this.gameState = gameStateManager;
    
    this.transitions = {
      'explore_to_fight': { duration: 1000, effect: 'fade_to_red' },
      'fight_to_choose': { duration: 1500, effect: 'victory_flash' },
      'choose_to_powerup': { duration: 800, effect: 'power_surge' },
      // ... more transitions
    };
  }
  
  async triggerTransition(fromPhase, toPhase) {
    const key = `${fromPhase}_to_${toPhase}`;
    const transition = this.transitions[key];
    
    // Play transition sound
    this.audio.playTransitionSound(toPhase);
    
    // Trigger visual effect
    await this.vfx.playTransitionEffect(transition.effect, transition.duration);
  }
}
```

#### 2. Visual Effects Enhancement
**File**: `src/effects/visual-effects-manager.js`
**Changes**: Add phase transition effects

```javascript
// Add to existing VisualEffectsManager
playTransitionEffect(effectType, duration) {
  switch(effectType) {
    case 'fade_to_red':
      // Screen tints red for combat
      break;
    case 'victory_flash':
      // Bright flash with particles
      break;
    case 'power_surge':
      // Energy waves emanating from player
      break;
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Transition triggers on phase change: `phase_transition event fires`
- [ ] Effects complete within duration: `transition.duration matches actual time`
- [ ] No performance drops during transitions: `frame time < 20ms`

#### Manual Verification:
- [ ] Visual effects play smoothly
- [ ] Audio cues match phase changes
- [ ] Transitions feel polished and responsive
- [ ] No jarring cuts between phases

---

## Phase 5: Tutorial System

### Overview
Implement interactive tutorials for each game phase to help new players.

### Changes Required:

#### 1. Tutorial Manager
**File**: `src/tutorial/tutorial-manager.js` (new)
**Changes**: Tutorial orchestration system

```javascript
export class TutorialManager {
  constructor(gameStateManager, uiManager) {
    this.gameState = gameStateManager;
    this.ui = uiManager;
    
    this.tutorials = {
      explore: ['Move with WASD', 'Find the exit', 'Avoid hazards'],
      fight: ['Attack with left click', 'Block with right click', 'Manage stamina'],
      choose: ['Select one of three options', 'Read descriptions carefully'],
      // ... more tutorials
    };
    
    this.completedTutorials = new Set(this.loadCompletedTutorials());
  }
  
  showPhaseTutorial(phase) {
    if (this.completedTutorials.has(phase)) return;
    
    const steps = this.tutorials[phase];
    this.ui.showTutorialOverlay(steps);
  }
}
```

#### 2. Tutorial UI Overlay
**File**: `src/ui/tutorial-overlay.js` (new)
**Changes**: Tutorial display component

```javascript
export class TutorialOverlay {
  constructor() {
    this.currentStep = 0;
    this.steps = [];
  }
  
  showTutorialOverlay(steps) {
    // Create overlay with step-by-step instructions
    // Highlight relevant UI elements
    // Track completion
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Tutorial triggers on first phase encounter: `localStorage tutorial flags`
- [ ] Tutorial completion tracked: `completedTutorials.has(phase)`
- [ ] Skip tutorial option works: `tutorial can be dismissed`

#### Manual Verification:
- [ ] Tutorial appears for new players
- [ ] Instructions are clear and helpful
- [ ] UI elements are highlighted appropriately
- [ ] Tutorial can be replayed from settings

---

## Phase 6: Multiplayer Phase Synchronization

### Overview
Ensure all players transition between phases simultaneously in multiplayer games.

### Changes Required:

#### 1. Phase Sync Protocol
**File**: `src/netcode/phase-sync.js` (new)
**Changes**: Phase synchronization for multiplayer

```javascript
export class PhaseSyncManager {
  constructor(hostAuthority, roomManager) {
    this.hostAuthority = hostAuthority;
    this.roomManager = roomManager;
    this.pendingTransitions = new Map();
  }
  
  requestPhaseTransition(newPhase) {
    if (this.hostAuthority.isHost()) {
      // Host decides when to transition
      this.broadcastPhaseTransition(newPhase);
    } else {
      // Clients request transition
      this.sendTransitionRequest(newPhase);
    }
  }
  
  broadcastPhaseTransition(newPhase) {
    const message = {
      type: 'phase_transition',
      phase: newPhase,
      timestamp: Date.now()
    };
    this.roomManager.broadcast(message);
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] All clients receive phase transition: `onPhaseTransition callback fires`
- [ ] Phases stay synchronized: `all clients report same phase`
- [ ] No desync during transitions: `checksum validation passes`

#### Manual Verification:
- [ ] All players see phase changes simultaneously
- [ ] No player gets stuck in wrong phase
- [ ] Smooth transition for all players
- [ ] Host migration preserves phase state

---

## Phase 7: Expanded Choice Variety

### Overview
Add 12+ new choices to increase variety from 18 to 30+.

### Changes Required:

#### 1. New Choice Definitions
**File**: `src/wasm/choices.h`
**Changes**: Add new choice definitions

```cpp
// Add to existing choices array
{"Berserker Rage", "Damage +50% but Defense -25%", SPICY, RARE, TAG_OFFENSIVE | TAG_RISKY},
{"Shadow Step", "Become untargetable for 2s after rolling", WEIRD, EPIC, TAG_DEFENSIVE | TAG_MOBILITY},
{"Life Steal", "Heal for 20% of damage dealt", SAFE, UNCOMMON, TAG_SUSTAIN},
{"Chain Lightning", "Attacks chain to 3 enemies", SPICY, RARE, TAG_OFFENSIVE | TAG_AOE},
// ... more choices
```

#### 2. Choice Balance Data
**File**: `public/data/balance/choices.json`
**Changes**: Add balance data for new choices

```json
{
  "berserker_rage": {
    "damage_multiplier": 1.5,
    "defense_multiplier": 0.75,
    "duration": -1
  },
  "shadow_step": {
    "invulnerability_duration": 2.0,
    "trigger": "on_roll",
    "cooldown": 10.0
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Choice generation includes new choices: `get_choice_count() can return > 18`
- [ ] New choices apply effects correctly: `player stats change as expected`
- [ ] Tag exclusion works with new choices: `conflicting tags don't appear together`
- [ ] Pity timer considers new choices: `rare choices appear appropriately`

#### Manual Verification:
- [ ] New choices appear in selection screen
- [ ] Choice effects work as described
- [ ] Synergies between choices feel balanced
- [ ] No overpowered combinations exist

---

## Testing Strategy

### Unit Tests:
- Save/Load data integrity
- Achievement unlock conditions
- Statistics calculation accuracy
- Phase transition timing
- Choice effect application

### Integration Tests:
- Save/Load across browser sessions
- Achievement system with UI notifications
- Statistics dashboard real-time updates
- Multiplayer phase synchronization
- Tutorial flow completion

### Manual Testing Steps:
1. Start new game and verify tutorial appears
2. Complete first room and check phase transition effects
3. Unlock an achievement and verify notification
4. Save game and reload browser
5. Load saved game and verify state restoration
6. Check statistics dashboard for accurate data
7. Join multiplayer game and verify phase sync
8. Test all new choices for proper effects

## Performance Considerations

- Save/Load operations should complete in < 100ms
- Achievement checks should not impact frame rate
- Statistics updates batched to avoid frequent DOM updates
- Phase transitions pre-loaded to avoid loading stutters
- Tutorial overlays use CSS animations for smoothness

## Migration Notes

- Existing saves will need version checking
- Achievement progress may need recalculation
- Statistics from before implementation won't be available
- Tutorial completion flags stored separately from saves

## References

- Original ticket: Current "Future Improvements" section in `GUIDELINES/GAME/IMPLEMENTATION_SUMMARY.md`
- Save/Load implementation: `src/wasm/save-load-system.h`
- Achievement system: `src/wasm/achievement-system.h`
- Statistics system: `src/wasm/statistics-system.h`
- Existing UI managers: `src/ui/enhanced-ui-manager.js`
- Phase system: `src/wasm/internal_core.h`