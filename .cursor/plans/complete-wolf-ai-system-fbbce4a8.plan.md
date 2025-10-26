<!-- fbbce4a8-e41d-4468-a37b-06e0e546a8a4 f6ae2787-d01c-4b99-8cb5-b04503276d4f -->
# Complete Wolf AI System (One-Shot) - REVISED

## 1) Scope
- Feature: Complete wolf AI with terrain, communication, fairness, full pack coordination
- Goals: 6 terrain types, 7 pack messages, pressure budget, mercy window, shuffle-bags, injury coupling, all 7 pack plans, 30+ WASM exports
- Non-goals: Boss wolves, scent tracking, vocalization audio (future enhancements)
- Affected areas: WolfManager, WolfTypes, game_refactored exports, NEW WolfStateManager facade
- **REVISED**: Split large files, phased exports, dedicated JS facade, scaling strategy

## 2) Success Criteria & Budgets
- 60 FPS; WASM wolf update ≤0.5ms (8 wolves), ≤0.4ms (16 wolves); snapshot read ≤0.3ms
- Memory: ≤400 bytes per wolf (core + terrain + messages + history) = ~3.2KB for 8 wolves
- Pressure budget enforced (max 1 commit + 1 probe attacker)
- Shuffle-bags prevent immediate attack/plan repeats
- Deterministic: same seed → identical wolf behavior
- All 12 states use terrain when intelligence >0.6
- Tests >80% coverage on new systems
- **NEW**: No file exceeds 500 lines; all coordination via GameCoordinator

## 3) Architecture Compliance (WASM-First)
- All AI logic in `public/src/wasm/managers/WolfManager` and `wolves/` subdirectory
- JS reads via `WasmCoreState.getWolfState().getSnapshot()` batched once per frame
- No JS AI logic; render-only in `WolfRenderer.js`
- Deterministic RNG via coordinator->get_game_state_manager().get_random_float()
- Reference: ADR-001 (no JS physics), ADR-002 (no Math.random), ADR-003 (single state source)

## 4) Approach (High Level)
- Add 5 new C++ subsystems: TerrainSystem, Communication, FairnessSystem, ShuffleBag, PredictiveMovement
- Extend Wolf/Pack structs with new fields (terrain_scan_timer, received_messages, role_lock_timer, etc.)
- Implement missing pack plan executors (Ambush, Flank, Distract, Regroup, Retreat)
- Export 30+ functions for detailed wolf/pack/terrain state
- Batch reads in WolfStateManager.js facade over WasmCoreState
- Feature flag: `?wolfai=1` with localStorage persistence

## 5) Files to Change (Organized by Size Limit)

### WASM C++ (New - Systems):
- `wolves/systems/TerrainSystem.h` (~120 lines): TerrainType enum, TerrainFeature struct
- `wolves/systems/TerrainSystem.cpp` (~180 lines): Scan/evaluate methods
- `wolves/systems/Communication.h` (~90 lines): PackMessage enum, Message struct, MessageQueue class
- `wolves/systems/Communication.cpp` (~140 lines): Message broadcast, jitter, drop logic
- `wolves/systems/FairnessSystem.h` (~110 lines): Pressure budget, mercy window declarations
- `wolves/systems/FairnessSystem.cpp` (~240 lines): Implementation of fairness patterns
- `wolves/systems/ShuffleBag.h` (~80 lines): Template class for deterministic non-repeating selection

### WASM C++ (New - Behaviors):
- `wolves/behaviors/PackBehaviors.h` (~80 lines): Pack plan executor declarations
- `wolves/behaviors/PackBehaviors.cpp` (~200 lines): Ambush, Flank, Distract, Regroup, Retreat executors
- `wolves/behaviors/PredictiveMovement.h` (~60 lines): Player tracking declarations
- `wolves/behaviors/PredictiveMovement.cpp` (~140 lines): Velocity tracking, target prediction

### WASM C++ (New - Core Types):
- `wolves/core/WolfBehaviorData.h` (~100 lines): NEW - Split behavioral fields from WolfTypes.h
- `wolves/core/PackData.h` (~80 lines): NEW - Split pack-specific data

### WASM C++ (Modified):
- `WolfManager.h` (~120 lines after): Add system pointers, coordinate methods (NO direct pack executors)
- `WolfManager.cpp` (~280 lines after): Integration only - delegate to system classes
- `wolves/core/WolfTypes.h` (~150 lines after): Core wolf data only, behavioral data moved to WolfBehaviorData.h
- `wolves/StateMachine.cpp` (~200 lines after): Integrate terrain preferences in state behaviors
- `game_refactored.cpp` (~50 lines added): Add wolf/pack/terrain exports in 3 phases

### JavaScript (New):
- `game/state/WolfStateManager.js` (~180 lines): NEW - Dedicated wolf state facade with batched reads
- `renderer/enemy/WolfSnapshotReader.js` (~120 lines): NEW - Helper for reading wolf snapshots efficiently

### JavaScript (Modified):
- `game/state/WasmCoreState.js` (~20 lines added): Add getWolfState() that returns WolfStateManager instance
- `renderer/WolfRenderer.js` (Phase 2): Update to use WolfStateManager.getSnapshot() instead of direct calls

### Balance Data:
- `data/balance/enemies.json` (~80 lines added): Add wolf.pressure, wolf.fairness, wolf.communication, wolf.terrain, wolf.roles sections
- `tools/scripts/generate-balance.cjs` (~40 lines added): Parse wolf config → generate `public/src/wasm/generated/WolfBalance.h` (or extend `balance_data.h`)

**Total New Files**: 13 | **Modified Files**: 7 | **All Files <500 Lines**: ✅

## 6) API Changes (WASM Exports) - Phased Delivery

### Phase 1A: Core Wolf State (5 exports) - PRIORITY 1
Add to `game_refactored.cpp`:
```cpp
EMSCRIPTEN_KEEPALIVE float get_wolf_health(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_wolf_state(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_wolf_emotion(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_x(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_y(int wolf_index);
```
**Validation**: `npm run wasm:verify:wolf-core` - checks 5 exports exist

### Phase 1B: Pack Basics (3 exports) - PRIORITY 1
```cpp
EMSCRIPTEN_KEEPALIVE int get_pack_count();
EMSCRIPTEN_KEEPALIVE int get_pack_plan(int pack_index);
EMSCRIPTEN_KEEPALIVE float get_pack_morale(int pack_index);
```
**Validation**: `npm run wasm:verify:wolf-core` - checks 8 total exports

### Phase 2A: Terrain System (4 exports) - PRIORITY 2
```cpp
EMSCRIPTEN_KEEPALIVE int get_terrain_feature_count();
EMSCRIPTEN_KEEPALIVE float get_terrain_feature_x(int feature_index);
EMSCRIPTEN_KEEPALIVE float get_terrain_feature_y(int feature_index);
EMSCRIPTEN_KEEPALIVE int get_terrain_feature_type(int feature_index);
```
**Validation**: `npm run wasm:verify:wolf-advanced` - checks 12 total exports

### Phase 2B: Advanced Wolf State (10 exports) - PRIORITY 2
```cpp
EMSCRIPTEN_KEEPALIVE float get_wolf_aggression(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_morale(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_stamina(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_wolf_pack_id(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_wolf_pack_role(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_limp_severity(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_facing_x(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_facing_y(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_pack_wolf_count(int pack_index);
EMSCRIPTEN_KEEPALIVE int get_pack_leader_index(int pack_index);
```
**Validation**: `npm run wasm:verify:wolf-advanced` - checks 22 total exports

### Phase 3: Performance Metrics (8 exports) - PRIORITY 3
```cpp
EMSCRIPTEN_KEEPALIVE float get_wolf_body_stretch(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_head_yaw(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_tail_wag(int wolf_index);
EMSCRIPTEN_KEEPALIVE float get_wolf_attack_success_rate();
EMSCRIPTEN_KEEPALIVE float get_pack_coordination_bonus();
EMSCRIPTEN_KEEPALIVE float get_player_skill_estimate();
EMSCRIPTEN_KEEPALIVE int get_wolf_message_count(int wolf_index);
EMSCRIPTEN_KEEPALIVE int get_wolf_last_message_type(int wolf_index);
```
**Validation**: `npm run wasm:verify:wolf-complete` - checks all 30 exports

**Total**: 30 new exports | **All bounds-checked** | **Phased validation gates**

## 7) Build & Export Wiring

Update `tools/scripts/build-wasm.ps1` and `build-wasm.sh`:
```bash
EXPORTED_FUNCTIONS="...,_get_wolf_health,_get_wolf_state,_get_wolf_emotion,_get_wolf_aggression,_get_wolf_morale,_get_pack_count,_get_pack_plan,_get_terrain_feature_count,_get_terrain_feature_x,_get_terrain_feature_y,_get_terrain_feature_type,_get_wolf_limp_severity,..."
```

Post-build verification:
```bash
npm run wasm:build
node tools/scripts/verify-wolf-exports.js  # NEW script to check 30 exports exist
```

## 8) Feature Flags & Fallbacks

- URL param: `?wolfai=1` (enable advanced AI features)
- Hotkey: `W` (toggle wolf AI debug overlay)
- If any export missing or NaN detected → disable advanced features, fallback to basic AI
- LocalStorage key: `dozedent_wolf_ai_enabled`

## 9) Manager Coordination Patterns

### WolfManager Dependencies
WolfManager coordinates through GameCoordinator - NO direct manager-to-manager calls:

```cpp
class WolfManager {
    GameCoordinator* coordinator_;
    
    // Get player state (for AI decisions)
    void update_wolf_target(Wolf& wolf) {
        auto& player_mgr = coordinator_->get_player_manager();
        float player_x = player_mgr.get_position_x();
        float player_y = player_mgr.get_position_y();
        float player_health = player_mgr.get_health();
        // ... use for AI logic
    }
    
    // Apply wolf attack damage
    void execute_wolf_attack(Wolf& wolf) {
        auto& combat_mgr = coordinator_->get_combat_manager();
        combat_mgr.apply_wolf_attack(wolf.damage, wolf.x, wolf.y);
    }
    
    // Get deterministic RNG
    float get_random_float() {
        return coordinator_->get_game_state_manager().get_random_float();
    }
    
    // Create/update wolf physics bodies
    void spawn_wolf_body(Wolf& wolf) {
        auto& physics_mgr = coordinator_->get_physics_manager();
        wolf.physics_body_id = physics_mgr.create_wolf_body(
            Fixed::to_float(wolf.x), 
            Fixed::to_float(wolf.y)
        );
    }
};
```

### Manager Interface Contract
- **PlayerManager**: `get_position_x/y()`, `get_velocity_x/y()`, `get_health()`
- **CombatManager**: `apply_wolf_attack(damage, x, y)`, `register_player_dodge()`, `register_player_block()`
- **PhysicsManager**: `create_wolf_body(x, y)`, `destroy_body(id)`, `check_collision(body_id)`
- **GameStateManager**: `get_random_float()`, `get_frame_count()`, `get_delta_time()`

**All coordination flows through GameCoordinator - enforces single responsibility**

## 10) Memory Budget Breakdown

Per-wolf memory allocation:
```cpp
struct Wolf {
    // Core state: ~120 bytes
    uint32_t id, pack_id, physics_body_id;
    Fixed x, y, vx, vy, facing_x, facing_y;
    float health, stamina, morale, aggression, intelligence;
    WolfState state, prev_state;
    EmotionalState emotion;
    PackRole role;
    float state_timer, decision_timer, attack_cooldown;
    
    // Terrain cache: ~64 bytes
    TerrainFeature nearby_features[4];  // 4 * 16 bytes
    float terrain_scan_timer;
    
    // Communication: ~64 bytes
    PackMessage received_messages[8];  // 8 * 8 bytes
    uint8_t message_count;
    
    // Predictive tracking: ~64 bytes
    float player_velocity_history[8][2];  // 8 frames * 2 floats * 4 bytes
    uint8_t velocity_index;
    
    // Animation/visual: ~48 bytes
    float body_stretch, head_yaw, tail_wag;
    float limp_severity, engage_cooldown;
    
    // Other: ~40 bytes
    float role_lock_timer, health_at_state_enter;
    uint32_t target_player_id;
};
// Total: ~400 bytes per wolf
```

**Scaling:**
- 8 wolves: ~3.2 KB ✅
- 16 wolves: ~6.4 KB ✅
- 32 wolves: ~12.8 KB ⚠️ (consider culling distant wolves)

**Global shared data:**
- Terrain features (game-wide): ~1 KB (64 features * 16 bytes)
- Pack data: ~256 bytes per pack (8 packs max = 2 KB)
- Shuffle-bag templates: ~512 bytes (attack/plan bags)

**Total memory budget: <20 KB for full wolf AI system (32 wolves, 8 packs)**

## 11) Shuffle-Bag Algorithm (Corrected O(1) draw)

Deterministic non-repeating random selection using refillable bags:

```cpp
template<typename T>
class ShuffleBag {
private:
    std::vector<T> current_bag_;    // Items remaining in current shuffle
    std::vector<T> template_bag_;   // Original set of items
    GameCoordinator* coordinator_;  // For deterministic RNG
    
public:
    ShuffleBag(GameCoordinator* coord) : coordinator_(coord) {}
    
    void init(const std::vector<T>& items) {
        template_bag_ = items;
        refill();
    }
    
    T draw() {
        if (current_bag_.empty()) {
            refill();  // Reshuffle when empty
        }
        // Use deterministic RNG from coordinator
        float rand_val = coordinator_->get_game_state_manager().get_random_float();
        size_t idx = static_cast<size_t>(rand_val * current_bag_.size());
        std::swap(current_bag_[idx], current_bag_.back());
        T item = current_bag_.back();
        current_bag_.pop_back();
        return item;
    }
    
private:
    void refill() {
        current_bag_ = template_bag_;  // Copy template
        if (current_bag_.empty()) return;
        // Fisher-Yates shuffle using deterministic RNG
        for (size_t i = current_bag_.size() - 1; i > 0; --i) {
            float rand_val = coordinator_->get_game_state_manager().get_random_float();
            size_t j = static_cast<size_t>(rand_val * (i + 1));
            std::swap(current_bag_[i], current_bag_[j]);
        }
    }
};

// Usage example:
ShuffleBag<AttackType> attack_bag(coordinator);
attack_bag.init({AttackType::Bite, AttackType::Lunge, AttackType::Swipe, AttackType::Pounce});

// Each wolf gets unique attacks until bag empty, then reshuffles
AttackType next_attack = attack_bag.draw();  // Never immediate repeat
```

**Benefits:**
- **Deterministic**: Same seed → same shuffle sequence
- **No immediate repeats**: Bag must empty before item can appear again
- **Feels random**: Player doesn't notice pattern within shuffle
- **Performance**: O(1) draw, O(n) refill (amortized to O(1))

## 12) Wolf Count Scaling Strategy

Handle varying wolf counts without performance degradation:

### Performance Targets by Wolf Count
| Wolves | Per-Wolf Budget | Total Budget | Strategy |
|--------|----------------|--------------|----------|
| 1-8    | 0.5ms          | 4ms (24%)    | Full AI, all features |
| 9-16   | 0.4ms          | 6.4ms (38%)  | Stagger terrain scans |
| 17-32  | 0.3ms          | 9.6ms (57%)  | LOD: distant wolves simplified |
| 33+    | N/A            | N/A          | Hard cap at 32 wolves |

### Level-of-Detail (LOD) System
```cpp
void WolfManager::update(float delta_time) {
    for (Wolf& wolf : wolves_) {
        // Always update critical systems
        update_wolf_state_machine(wolf, delta_time);
        update_wolf_physics(wolf, delta_time);
        
        // Stagger expensive updates based on wolf ID
        if (wolves_.size() <= 8) {
            // Full AI for 8 or fewer wolves
            update_wolf_terrain_scan(wolf, delta_time);
            update_wolf_communication(wolf, delta_time);
            update_wolf_predictive_movement(wolf, delta_time);
        } else {
            // Stagger scans across multiple frames
            if (coordinator_->get_frame_count() % 2 == wolf.id % 2) {
                update_wolf_terrain_scan(wolf, delta_time);
            }
            
            // Distance-based LOD
            float dist_to_player = calculate_distance_to_player(wolf);
            if (dist_to_player < 5.0f) {
                // Close wolves get full AI
                update_wolf_communication(wolf, delta_time);
                update_wolf_predictive_movement(wolf, delta_time);
            } else if (coordinator_->get_frame_count() % 4 == wolf.id % 4) {
                // Distant wolves update 1/4 frequency
                update_wolf_communication(wolf, delta_time * 4.0f);
            }
        }
    }
}
```

### Wolf Spawning Limits
```cpp
constexpr int MAX_WOLVES_NORMAL = 16;    // Normal gameplay
constexpr int MAX_WOLVES_ESCALATE = 24;  // Escalate phase
constexpr int MAX_WOLVES_ABSOLUTE = 32;  // Hard cap

bool can_spawn_wolf() const {
    int limit = (phase == Phase::Escalate) ? MAX_WOLVES_ESCALATE : MAX_WOLVES_NORMAL;
    return wolves_.size() < limit;
}
```

## 13) Data Contract

WolfSnapshot shape:
```javascript
{
  position: [x, y],
  velocity: [vx, vy],
  facing: [fx, fy],
  health: float, // 0-1
  state: int, // WolfState enum
  emotion: int, // EmotionalState enum
  packId: int,
  packRole: int,
  aggression: float,
  morale: float,
  limpSeverity: float, // 0-1
  bodyStretch: float,
  headYaw: float,
  tailWag: float
}
```

PackSnapshot shape:
```javascript
{
  packId: int,
  plan: int, // PackPlan enum
  morale: float,
  wolfCount: int,
  leaderIndex: int
}
```

TerrainFeature shape:
```javascript
{
  position: [x, y],
  type: int, // TerrainType enum
  radius: float
}
```

## 10) Key Implementation Details

### Terrain Integration
- Scan every 1.2-1.8s (staggered per wolf)
- Intelligence >0.6 actively seeks terrain
- Approach → prefer Cover; Retreat → seek Chokepoint; Ambush → require Cover

### Communication
- Range: 0.4 units
- Jitter: ±80-160ms
- Drop: 3-5% beyond 0.35 units
- Leader sends AttackNow when ≥3 wolves ready
- Wolves send NeedHelp at <30% HP

### Fairness
- Max 1 commit (attack_range), 1 probe (attack_range * 1.5)
- Engage cooldown: 1.5-2.5s per wolf
- Mercy: 2 hits in 2s → all back off 0.8-1.2s
- Anti-corner: ≥2 wolves in ≤30° arc → furthest yields

### Shuffle-Bags
- Per-wolf attack bag (4 types)
- Per-pack plan bag (7 plans)
- Reshuffle when empty
- Use coordinator RNG

### Injury-Emotion
- 70% HP: speed *=0.85, turn_rate *=0.9
- 40% HP: fear +0.2, feint chance -50%
- 20% HP: Desperate, send NeedHelp

### Predictive Movement
- Track player velocity (8-frame window)
- Intelligence >0.7 leads target by 0.5-1.0s
- Use for Ambush positioning, Flank routes

## 14) Enhanced Testing Plan

### Unit Tests (`test/unit/ai/wolf-ai.test.js` ~350 lines)

#### Fairness System Tests
```javascript
describe('WolfManager Fairness', () => {
    it('enforces pressure budget (max 1 commit + 1 probe)', () => {
        spawnWolves(5);
        for (let i = 0; i < 100; i++) {
            wasmModule.update(0.016);
            const activeWolves = getActiveAttackers();
            expect(activeWolves.commit).to.be.lte(1);
            expect(activeWolves.probe).to.be.lte(1);
        }
    });
    
    it('activates mercy window after 2 hits in 2s', () => {
        spawnWolves(3);
        damagePlayer(2, 1.5); // 2 hits in 1.5 seconds
        updateFrames(10);
        expect(allWolvesBacked()).to.be.true;
    });
    
    it('enforces role locks for 6-10 seconds', () => {
        const wolf = spawnWolf();
        const initialRole = getWolfRole(wolf);
        updateFrames(300); // 5 seconds
        expect(getWolfRole(wolf)).to.equal(initialRole);
        updateFrames(360); // +6 seconds = 11 total
        // Role may have changed by now
    });
});
```

#### Shuffle-Bag Tests
```javascript
describe('ShuffleBag', () => {
    it('prevents immediate repeats', () => {
        const bag = [AttackType.Bite, AttackType.Lunge, AttackType.Swipe];
        const draws = drawMultiple(bag, 10);
        for (let i = 1; i < draws.length; i++) {
            expect(draws[i]).to.not.equal(draws[i-1]);
        }
    });
    
    it('is deterministic with same seed', () => {
        wasmModule.init_run(12345, 0);
        const sequence1 = drawAttacks(20);
        
        wasmModule.init_run(12345, 0);
        const sequence2 = drawAttacks(20);
        
        expect(sequence1).to.deep.equal(sequence2);
    });
});
```

#### Communication Tests
```javascript
describe('Wolf Communication', () => {
    it('respects range limit (0.4 units)', () => {
        const wolves = spawnWolvesAtDistance(0.5);
        broadcastMessage(wolves[0], MessageType.AttackNow);
        expect(wolves[1].receivedMessage).to.be.false;
    });
    
    it('applies jitter (80-160ms)', () => {
        const times = measureMessageTimes(100);
        expect(times.mean).to.be.within(0.08, 0.16);
    });
    
    it('drops 3-5% beyond 0.35 units', () => {
        const dropRate = measureDropRate(1000, 0.38);
        expect(dropRate).to.be.within(0.03, 0.05);
    });
});
```

#### Terrain Tests
```javascript
describe('Terrain System', () => {
    it('prefers cover when approaching (intelligence >0.6)', () => {
        const wolf = spawnIntelligentWolf(0.7);
        wolf.state = WolfState.Approach;
        updateFrames(60);
        const nearCover = isNearTerrainType(wolf, TerrainType.Cover);
        expect(nearCover).to.be.true;
    });
    
    it('scans terrain every 1.2-1.8s', () => {
        const wolf = spawnWolf();
        const scanTimes = measureScanTimes(wolf, 100);
        expect(scanTimes.mean).to.be.within(1.2, 1.8);
    });
});
```

#### Bounds Checking Tests (NEW)
```javascript
describe('WASM Export Bounds Checking', () => {
    it('returns 0 for invalid wolf index', () => {
        expect(wasmModule.get_wolf_health(-1)).to.equal(0);
        expect(wasmModule.get_wolf_health(999)).to.equal(0);
    });
    
    it('returns 0 for invalid pack index', () => {
        expect(wasmModule.get_pack_morale(-1)).to.equal(0);
        expect(wasmModule.get_pack_morale(100)).to.equal(0);
    });
    
    it('handles NaN inputs gracefully', () => {
        expect(() => wasmModule.get_wolf_health(NaN)).to.not.throw();
    });
});
```

#### Determinism Tests (NEW)
```javascript
describe('Deterministic Behavior', () => {
    it('produces identical terrain scans with same seed', () => {
        wasmModule.init_run(12345, 0);
        spawnWolves(3);
        updateFrames(120);
        const features1 = getTerrainFeatures();
        
        wasmModule.init_run(12345, 0);
        spawnWolves(3);
        updateFrames(120);
        const features2 = getTerrainFeatures();
        
        expect(features1).to.deep.equal(features2);
    });
    
    it('produces identical pack plans with same seed', () => {
        wasmModule.init_run(67890, 0);
        const pack1 = spawnPackAndGetPlan(5);
        
        wasmModule.init_run(67890, 0);
        const pack2 = spawnPackAndGetPlan(5);
        
        expect(pack1.plans).to.deep.equal(pack2.plans);
    });
});
```

### Integration Tests (`test/integration/wolf-pack-behavior.js` ~250 lines)
- Full pack scenario (spawn 5 wolves, verify coordination)
- Terrain utilization (wolves seek cover when approaching)
- Fairness compliance (never >2 active attackers)
- Pack plan execution (Ambush, Flank, Regroup all work)
- Emotional state transitions (Calm → Aggressive → Desperate)

### Performance Tests (`test/performance/wolf-ai-perf.js` ~150 lines)
```javascript
describe('Wolf AI Performance', () => {
    it('8 wolves: <0.5ms per wolf, <4ms total', () => {
        spawnWolves(8);
        const times = measureUpdateTimes(100);
        expect(times.perWolf).to.be.lte(0.5);
        expect(times.total).to.be.lte(4.0);
    });
    
    it('16 wolves: <0.4ms per wolf, <6.4ms total', () => {
        spawnWolves(16);
        const times = measureUpdateTimes(100);
        expect(times.perWolf).to.be.lte(0.4);
        expect(times.total).to.be.lte(6.4);
    });
    
    it('memory: <400 bytes per wolf', () => {
        const initialMem = getMemoryUsage();
        spawnWolves(8);
        const finalMem = getMemoryUsage();
        const perWolf = (finalMem - initialMem) / 8;
        expect(perWolf).to.be.lte(400);
    });
    
    it('snapshot read: <0.3ms for 8 wolves', () => {
        spawnWolves(8);
        const times = measureSnapshotTimes(100);
        expect(times.mean).to.be.lte(0.3);
    });
});
```

### Node Smoke Tests (`test/unit/wasm/wolf-exports.test.js` NEW ~100 lines)
```javascript
describe('WASM Wolf Exports', () => {
    it('all Phase 1A exports exist', () => {
        expect(wasmModule.get_wolf_health).to.be.a('function');
        expect(wasmModule.get_wolf_state).to.be.a('function');
        expect(wasmModule.get_wolf_emotion).to.be.a('function');
        expect(wasmModule.get_wolf_x).to.be.a('function');
        expect(wasmModule.get_wolf_y).to.be.a('function');
    });
    
    it('can instantiate WASM and call Phase 1A exports', () => {
        // Minimal call that does not rely on spawn/get_wolf_count
        wasmModule.init_run?.(12345, 0);
        // Allow index 0 reads to be bounds-checked and return defaults if not spawned
        expect(() => wasmModule.get_wolf_health(0)).to.not.throw();
    });
});
```

**Total Test Coverage Target: >80% for new wolf AI systems**

## 12) Balance Data Structure

`data/balance/enemies.json`:
```json
{
  "wolf": {
    "pressure": { "maxCommitAttackers": 1, "maxProbeAttackers": 1, "threatDistanceMult": 1.5, "engageCooldownMin": 1.5, "engageCooldownMax": 2.5 },
    "fairness": { "mercyWindow": [0.8, 1.2], "mercyHitThreshold": 2, "mercyTimeWindow": 2.0, "antiCornerArc": 30 },
    "communication": { "range": 0.4, "jitterMin": 0.08, "jitterMax": 0.16, "dropChance": 0.04 },
    "terrain": { "scanIntervalMin": 1.2, "scanIntervalMax": 1.8, "intelligenceThreshold": 0.6 },
    "roles": { "lockDurationMin": 6.0, "lockDurationMax": 10.0 }
  }
}
```

Generate `public/src/wasm/managers/generated/WolfBalance.h` via `node tools/scripts/generate-balance.cjs`

## 15) Rollout Phases (Revised for Phased Delivery)

### Phase 1: Core Foundation (40% of work, 2-3 days)
**WASM C++:**
- Create directory structure (`wolves/systems/`, `wolves/behaviors/`, `wolves/core/`)
- Implement `ShuffleBag.h` template
- Split `WolfTypes.h` into `WolfCore.h` + `WolfBehaviorData.h` + `PackData.h`
- Update `WolfManager.h/cpp` with system coordination (NOT implementations)

**JavaScript:**
- Create `game/state/WolfStateManager.js` facade (empty methods)
- Add `WasmCoreState.getWolfState()` accessor

**WASM Exports (Phase 1A + 1B):**
- Add 8 core exports (wolf state + pack basics)
- Create `tools/scripts/verify-wolf-exports.js` validation script

**Tests:**
- Node smoke tests for Phase 1A/1B exports
- Unit tests for WolfStateManager shape

**Gate:** `npm run wasm:verify:wolf-core` passes; all 8 exports exist

---

### Phase 2: Subsystems (35% of work, 3-4 days)
**WASM C++:**
- Implement `TerrainSystem.h/cpp` (~300 lines total)
- Implement `Communication.h/cpp` (~230 lines total)
- Implement `FairnessSystem.h/cpp` (~350 lines total)
- Integrate systems into `WolfManager::update()`

**WASM Exports (Phase 2A + 2B):**
- Add 14 exports (terrain + advanced wolf state)
- Update `WolfStateManager.js` with real implementations

**Balance Data:**
- Add wolf config sections to `enemies.json`
- Update `generate-balance.cjs` to parse wolf config

**Tests:**
- Unit tests for terrain preferences, communication range/jitter, fairness budget
- Integration test: 5-wolf pack with terrain utilization
- Determinism tests for terrain scans

**Gate:** `npm run wasm:verify:wolf-advanced` passes; all 22 exports exist

---

### Phase 3: Behaviors & Polish (25% of work, 2-3 days)
**WASM C++:**
- Implement `PackBehaviors.h/cpp` (~280 lines total)
- Implement `PredictiveMovement.h/cpp` (~200 lines total)
- Integrate into pack coordination
- Add injury-emotion coupling, HP threshold effects

**WASM Exports (Phase 3):**
- Add final 8 performance metric exports
- Complete `WolfStateManager.js` with all methods

**JavaScript:**
- Update `WolfRenderer.js` to use new snapshot data
- Add debug overlay for `?wolfai=1` mode

**Tests:**
- Unit tests for shuffle-bags, pack behaviors, predictive movement
- Integration tests for full pack scenarios
- Performance tests (8, 16 wolves)
- Bounds checking and edge case tests

**Gate:** `npm run wasm:verify:wolf-complete` passes; all 30 exports exist; all tests pass

---

### Phase 4: Validation & Rollout (1-2 days)
- Feature flag enabled by default (`?wolfai=1`)
- Monitor performance metrics in production
- Collect player feedback
- Tune balance parameters based on data
- Create ADR document for wolf AI architecture

**Final Gate:** Performance budgets met; >80% test coverage; no regressions

**Total Timeline: 8-12 days** (assuming full-time focus)

## 16) Success Checklist (Updated)

### Architecture Compliance
- [ ] No file exceeds 500 lines (all 13 new + 7 modified files)
- [ ] All managers coordinate through GameCoordinator (no direct calls)
- [ ] WolfStateManager facade <200 lines (not expanding WasmCoreState)
- [ ] All RNG uses `coordinator_->get_game_state_manager().get_random_float()`
- [ ] All coordination flows through GameCoordinator

### Subsystems & Code
- [ ] 7 new C++ system files implemented (Terrain, Communication, Fairness, ShuffleBag, PackBehaviors, PredictiveMovement, split types)
- [ ] Wolf/Pack structs split into focused files (<150 lines each)
- [ ] All 7 pack plans fully executable (Ambush, Flank, Distract, Regroup, Retreat, Pincer, Commit)
- [ ] ShuffleBag template with Fisher-Yates deterministic shuffle
- [ ] HP threshold effects with limp/speed modifiers

### WASM Exports (Phased)
- [ ] Phase 1A: 5 core wolf exports (health, state, emotion, x, y)
- [ ] Phase 1B: 3 pack basics (count, plan, morale)
- [ ] Phase 2A: 4 terrain exports (count, x, y, type)
- [ ] Phase 2B: 10 advanced wolf exports (aggression, limp, facing, etc.)
- [ ] Phase 3: 8 performance metrics (body stretch, attack success, skill estimate)
- [ ] **Total: 30 exports, all bounds-checked**

### JavaScript Integration
- [ ] WolfStateManager.js created (~180 lines)
- [ ] WolfSnapshotReader.js helper created (~120 lines)
- [ ] WasmCoreState.getWolfState() accessor added (~20 lines)
- [ ] WolfRenderer.js updated to use snapshots (~30 lines modified)
- [ ] Batched snapshot reads <0.3ms for 8 wolves

### Balance & Configuration
- [ ] Wolf config sections added to enemies.json (~80 lines)
- [ ] generate-balance.cjs updated for wolf config (~40 lines)
- [ ] WolfBalance.h generated and included in build

### Testing (>80% Coverage)
- [ ] Unit tests: Fairness budget enforcement
- [ ] Unit tests: Mercy window activation
- [ ] Unit tests: Role lock duration
- [ ] Unit tests: Shuffle-bag no immediate repeats
- [ ] Unit tests: Communication range/jitter/drop
- [ ] Unit tests: Terrain preferences by intelligence
- [ ] Unit tests: Bounds checking (invalid indices)
- [ ] Unit tests: Determinism (terrain scans, pack plans)
- [ ] Integration tests: Full pack coordination
- [ ] Integration tests: Terrain utilization
- [ ] Performance tests: 8 wolves (<0.5ms per wolf, <4ms total)
- [ ] Performance tests: 16 wolves (<0.4ms per wolf, <6.4ms total)
- [ ] Performance tests: Memory (<400 bytes per wolf)
- [ ] Performance tests: Snapshot reads (<0.3ms)
- [ ] Node smoke tests: All exports exist and callable

### Build & Validation
- [ ] verify-wolf-exports.js script created
- [ ] `npm run wasm:verify:wolf-core` passes (Phase 1A+1B)
- [ ] `npm run wasm:verify:wolf-advanced` passes (Phase 2A+2B)
- [ ] `npm run wasm:verify:wolf-complete` passes (all 30 exports)
- [ ] Build scripts updated with new EXPORTED_FUNCTIONS
- [ ] WASM_EXPORTS.json regenerated with all wolf exports

### Performance & Scaling
- [ ] 8 wolves: <0.5ms per wolf, <4ms total (24% frame time)
- [ ] 16 wolves: <0.4ms per wolf, <6.4ms total (38% frame time)
- [ ] Memory: <400 bytes per wolf, <20KB total system
- [ ] LOD system implemented for 17+ wolves
- [ ] Hard cap at 32 wolves enforced
- [ ] Deterministic replay validated (same seed → same behavior)

### Feature Flags & Rollout
- [ ] Feature flag `?wolfai=1` with localStorage persistence
- [ ] Graceful fallback if exports missing
- [ ] Debug overlay (hotkey `W`)
- [ ] Performance monitoring enabled
- [ ] All 4 rollout phases completed

### Documentation (Optional but Recommended)
- [ ] ADR document for wolf AI architecture decisions
- [ ] Update GUIDELINES/AI/WOLF_AI.md with new systems
- [ ] Comment complex algorithms (shuffle-bag, terrain scan)

**Total Checklist Items: 60+ | Target: All ✅ before production rollout**

---

### Priority To-Dos (Phase 1 - Start Here)

1. [ ] Create directory structure: `wolves/systems/`, `wolves/behaviors/`, `wolves/core/`
2. [ ] Implement `ShuffleBag.h` template (~80 lines)
3. [ ] Split `WolfTypes.h` into 3 focused files (~150 lines each)
4. [ ] Create `WolfStateManager.js` facade skeleton (~180 lines)
5. [ ] Add Phase 1A exports (5 core wolf state)
6. [ ] Add Phase 1B exports (3 pack basics)
7. [ ] Create `verify-wolf-exports.js` validation script
8. [ ] Write node smoke tests for Phase 1 exports
9. [ ] Validate `npm run wasm:verify:wolf-core` passes

**Then proceed to Phase 2 as outlined in section 15**