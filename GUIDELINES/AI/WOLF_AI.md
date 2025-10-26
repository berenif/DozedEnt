# 🐺 Wolf AI Enhancements

<div align="center">
  <h2>🦾 Advanced Predator AI System</h2>
  <p><strong>Intelligent pack hunting • Adaptive difficulty • Emotional states • Environmental awareness</strong></p>
</div>

---

## 🎯 Overview

The wolf AI system represents the pinnacle of enemy AI implementation, featuring sophisticated behavioral patterns that create truly challenging and unpredictable encounters. All logic runs deterministically in WASM for seamless multiplayer synchronization:

- 🦾 **Advanced Pack Intelligence** - Coordinated hunting strategies with 7 distinct plans
- 📈 **Dynamic Adaptive Difficulty** - Real-time AI that learns and adapts to player behavior
- 🌲 **Environmental Awareness** - Tactical use of 6 terrain types for positioning
- 🧠 **Enhanced Memory System** - Remembers player patterns and predicts movements
- 💔 **Emotional State Machine** - 6 emotional states affecting behavior and performance
- ⚡ **WASM Integration** - All AI logic runs deterministically for multiplayer consistency

## 🔑 Key Enhancements

### 1️⃣ Advanced Hunting Patterns & Pack Behaviors
- **New States**: Added `Ambush`, `Flank`, and `Retreat` states for more tactical options
- **Pack Plans**: Expanded from 4 to 7 plans including `Ambush`, `Pincer`, and `Retreat`
- **New Roles**: Added `Scout` and `Ambusher` roles for specialized pack members
- **Dynamic Role Assignment**: Roles now assigned based on health, stamina, and position
- **Coordinated Attacks**: Pack members synchronize attacks when in `Commit` plan

### 2️⃣ Adaptive AI Difficulty System
- **Player Skill Estimation**: Tracks player performance metrics (dodge rate, block rate, kill rate)
- **Dynamic Difficulty Adjustment**: Wolf speed, aggression, and intelligence adapt to player skill
- **Smooth Transitions**: Difficulty changes gradually to avoid jarring gameplay shifts
- **Performance-Based Scaling**: Speed scales 0.8x-1.2x, aggression 0.3x-0.8x based on player skill

### 3️⃣ Environmental Awareness & Terrain Exploitation
- **Terrain Types**: 6 terrain types (HighGround, Cover, OpenField, Chokepoint, LowGround, Water)
- **Tactical Movement**: Wolves seek advantageous terrain based on their current state
- **Intelligent Positioning**: Higher intelligence wolves actively scan for better positions
- **State-Specific Benefits**: Different terrains benefit different hunting strategies

### 4️⃣ Enhanced Memory & Learning System
- **Extended Memory**: Tracks player speed, reaction time, and dodge patterns
- **Attack Pattern Learning**: Remembers successful attack angles and player responses
- **Predictive Movement**: Uses player movement history to predict future positions
- **Adaptive Feinting**: Feint frequency adjusts based on player skill estimate

### 5️⃣ Communication System
- **Pack Messages**: 6 message types for coordination (AttackNow, Retreat, TargetSpotted, etc.)
- **Range-Based Communication**: Messages propagate within 0.4 unit radius
- **Synchronized Actions**: Lead wolf can trigger coordinated pack attacks
- **Response Behaviors**: Wolves react appropriately to received messages

### 6️⃣ Emotional States & Morale System
- **5 Emotional States**: Calm, Aggressive, Fearful, Desperate, Confident, Frustrated
- **Dynamic Emotions**: States change based on health, fatigue, success rate, and damage
- **Behavioral Modifiers**: Emotions affect attack frequency, range, and cooldowns
- **Individual Morale**: Each wolf tracks personal morale affecting decision-making
- **Pack Morale**: Overall pack morale influences strategy selection

### 7️⃣ Individual Wolf Attributes
- **Aggression** (0.3-0.7): Affects attack frequency and risk-taking
- **Intelligence** (0.4-0.8): Influences tactical decisions and terrain usage
- **Coordination** (0.5-0.8): Determines pack synchronization effectiveness
- **Morale** (0.6-0.8): Individual confidence affecting performance

## 💻 Technical Implementation

### 📁 New Data Structures
```cpp
// Emotional states
enum class EmotionalState : unsigned char {
    Calm, Aggressive, Fearful, Desperate, Confident, Frustrated
};

// Enhanced enemy memory
struct EnemyMemory {
    // ... existing fields ...
    float playerSpeed;
    float playerReactionTime;
    float successfulAttackAngle;
    int dodgePatternId;
    float lastPlayerBlockTime;
    float lastPlayerRollTime;
};

// Terrain features
struct TerrainFeature {
    float x, y, radius;
    TerrainType type;
    float advantage;
};
```

### 🧮 Key Algorithms

#### Adaptive Difficulty
- Continuously monitors player performance
- Adjusts wolf parameters every 10 seconds
- Smooth transitions using interpolation (10% per update)

#### Pack Coordination
- Pack controller enforces a pressure budget: at most one wolf in commit range and one in probe range; others threaten from ≥1.5× attack range.
- Role assignment based on position and capabilities, with a 6–10 s role lock window to avoid thrash.
- Synchronized attacks can be triggered when ≥3 wolves are ready, with communication jitter (±80–160 ms) and small range-based drop chance (3–5%) for non-critical messages to keep behavior organic.

#### Emotional State Machine
- Updates based on health, fatigue, and combat outcomes
- Smooth emotional transitions with intensity decay
- Emotions directly modify behavior parameters

#### Injury–Emotion Coupling
- At HP thresholds (~70/40/20%), apply limp modifiers (reduced acceleration/turn rate), increase fear, reduce feints, and raise pack-call likelihood.

#### Adaptive Cadence Over Raw Stats
- Prefer scaling attack cadence, feint probability, and strafe radius with estimated player skill; smooth via ~10% interpolation per update rather than large speed/damage swings.

#### Shuffle-Bag Plan/Telegraph Selection
- Use non-repeating shuffle-bags for hunting plans and telegraph tiers to avoid streaks while remaining deterministic.

## 🎮 Gameplay Impact

### 📈 Increased Challenge
- Wolves adapt to player skill level
- More unpredictable with emotional states
- Better coordination in pack attacks

### ♟️ Strategic Depth
- Terrain becomes tactically important
- Wolves use environment to their advantage
- Players must consider positioning more carefully

### 🌀 Dynamic Experience
- No two encounters play the same
- Wolves learn from player behavior
- Emotional responses create memorable moments

## 🚀 Performance Considerations
- All enhancements optimized for real-time performance
- Minimal memory overhead with fixed-size arrays
- Efficient algorithms with O(n) complexity for pack operations
 - Stagger terrain scans across ticks; cap group coordination to nearby wolves
 - Batch RNG draws and reuse plan bags per pack for determinism and cache behavior

## 🛡️ Fairness & Anti-Frustration
- Mercy window: after the player takes 2 hits in 2 seconds, all attackers back off for 0.8–1.2 seconds.
- Anti corner-lock: if ≥2 wolves occupy a ≤30° arc facing the player, one yields position.
- Guaranteed whiff-punish windows on heavy attacks.

## 🎚️ Suggested Parameter Dials
- Reaction delay: 110–220 ms (emotion- and skill-modified)
- Engage cooldown per wolf: 1.5–2.5 s after attack/whiff
- Pressure budget: 1 commit, 1 probe, others threaten at ≥1.5× range
- Feint rate: base 6–10%, cap 20% under high frustration; 0% when stamina < 0.3
- Flank evaluation cadence: every 1.2–1.8 s
- Communication jitter: ±80–160 ms; 3–5% drop beyond 0.35 units

## 🧪 Telemetry & Tests
- Export per-encounter counters: attack cadence, time-in-contact, flank attempts, feint success, mercy-window triggers.
- Unit tests: pressure budget invariants, role lock timing, mercy-window activation/deactivation, shuffle-bag no immediate repeat.

## 🔮 Future Improvements

### 🔴 High Priority
- [ ] **Vocalization System** - Howls, growls, and barks for communication
- [ ] **Alpha Wolf** - Pack leader with unique abilities and commands
- [ ] **Scent Tracking** - Follow player trails and mark territory

### 🟡 Medium Priority
- [ ] **Seasonal Behaviors** - Different tactics in winter vs summer
- [ ] **Wolf Families** - Protective behaviors around pups
- [ ] **Territory System** - Defend and expand pack territory

### 🟢 Nice to Have
- [ ] **Weather Effects** - Behavior changes in rain/snow/fog
- [ ] **Day/Night Cycle** - Nocturnal hunting advantages
- [ ] **Injury System** - Limping, reduced speed when wounded
- [ ] **Pack Rivalries** - Multiple packs competing for territory

---

*Last updated: January 2025*