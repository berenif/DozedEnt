# 🛠️ Development Workflow Guide

## 🎯 For AI Agents: Complete Development Cycle

This guide consolidates the most important workflow information from across the documentation to provide a single reference for development tasks.

---

## 🚀 Quick Start Workflow

### 1. Understanding the Codebase (First Time)
```
1. Read QUICK_REFERENCE.md (5 min) → Core concepts
2. Skim AGENTS.md (10 min) → Architecture details  
3. Check specific system docs as needed → Deep dive
```

### 2. Making Changes
```
1. Identify affected systems (AI, Combat, Animation, etc.)
2. Read relevant documentation sections
3. Plan changes in WASM first, JS integration second
4. Implement with deterministic behavior in mind
5. Test with golden test validation
6. Update documentation if API changes
```

### 3. Common Development Tasks
```
Adding Feature → Plan in WASM → Implement → Export functions → JS integration
Fixing Bug → Identify system → Check docs → Test determinism → Validate fix
Performance → Profile WASM/JS boundary → Optimize bottlenecks → Measure
```

---

## 🎮 System-Specific Workflows

### Combat System Changes
**Files to check**: `5-BUTTON_COMBAT_IMPLEMENTATION.md`, `GAME/COMBAT_SYSTEM.md`

```
1. Review timing windows (120ms parry, 300ms i-frames)
2. Check state machine transitions
3. Validate input buffer behavior (120ms)
4. Test feinting and canceling mechanics
5. Ensure deterministic execution
6. Performance test (< 1ms per frame)
```

**Key validation points**:
- All combat logic in WASM ✓
- Timing constants match specification ✓
- State transitions are predictable ✓
- No JavaScript gameplay decisions ✓

### AI/Enemy System Changes  
**Files to check**: `AI/ENEMY_TEMPLATE.md`, `AI/ENEMY_AI.md`, `AI/WOLF_AI.md`

```
1. Follow enemy template structure
2. Implement behavior in WASM
3. Use deterministic decision making
4. Test with different player behaviors
5. Validate performance impact
6. Check multiplayer synchronization
```

**Key validation points**:
- AI logic entirely in WASM ✓
- No Math.random() usage ✓
- Deterministic state transitions ✓
- Performance within targets ✓

### Animation System Changes
**Files to check**: `ANIMATION/ANIMATION_SYSTEM_INDEX.md`, `ANIMATION/PLAYER_ANIMATIONS.md`

```
1. Review animation state machine
2. Check integration with game logic
3. Ensure animations don't affect gameplay
4. Test state transitions
5. Validate performance impact
6. Check visual consistency
```

**Key validation points**:
- Animations are visual-only ✓
- Game logic drives animation states ✓
- No gameplay decisions in animation code ✓
- Performance maintained ✓

### Core Game Loop Changes
**Files to check**: `GAME/IMPLEMENTATION_SUMMARY.md`, `GAME/CORE_LOOP_CHECKLIST.md`

```
1. Understand 8-phase structure
2. Plan changes within phase constraints  
3. Maintain phase transition logic
4. Test complete loop cycles
5. Validate choice generation
6. Check deterministic behavior
```

**Key validation points**:
- All 8 phases functional ✓
- Phase transitions deterministic ✓
- Choice system working ✓
- Complete loop tested ✓

---

## 🧪 Testing Workflow

### Pre-Commit Testing Checklist
```bash
# 1. Run unit tests
npm run test:unit

# 2. Run integration tests  
npm run test:integration

# 3. Golden test (deterministic validation)
npm run test:golden

# 4. Performance validation
npm run test:performance

# 5. Full test suite
npm test
```

### Golden Test Validation (Critical)
**Purpose**: Ensures deterministic behavior across all systems

```
1. Run 60-second input script
2. Compare end-state across multiple runs
3. Verify identical results every time
4. Test on different platforms
5. Validate network synchronization
```

**If golden test fails**:
- Check for Math.random() usage in gameplay
- Verify WASM RNG seed consistency  
- Look for timing-dependent behavior
- Check floating point precision issues

### Performance Testing
**Targets**: <16ms frame time, <32MB memory, 60+ FPS

```
1. Profile WASM/JS boundary calls
2. Monitor memory allocation patterns
3. Check for GC pressure spikes
4. Validate frame timing consistency
5. Test under load conditions
```

---

## 🔧 Build & Deploy Workflow

### Local Development Build
```bash
# Windows PowerShell
. .\emsdk\emsdk_env.ps1
em++ wasm\game.cpp -O3 -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -o docs\game.wasm

# Linux/macOS
source ./emsdk/emsdk_env.sh  
em++ wasm/game.cpp -O3 -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -o docs/game.wasm
```

### Production Build
```bash
# Full optimization build
em++ wasm/game.cpp \
    -O3 \
    -s STANDALONE_WASM=1 \
    -s WASM_BIGINT=1 \
    -s EXPORT_ALL=0 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -o docs/game.wasm
```

### Deploy to GitHub Pages
**File**: `UTILS/DEPLOY_GITHUB_PAGES.md`

```
1. Build optimized WASM module
2. Commit to main branch
3. GitHub Actions automatically deploys
4. Test deployed version
5. Monitor performance metrics
```

---

## 🚨 Troubleshooting Workflow

### Common Issues & Solutions

#### WASM Module Won't Load
```javascript
// Debug WASM loading
fetch('game.wasm')
    .then(response => response.arrayBuffer())
    .then(bytes => WebAssembly.instantiate(bytes))
    .catch(error => console.error('WASM load failed:', error));
```

**Common causes**:
- CORS issues with local server
- WASM binary corruption
- Missing Emscripten flags
- Browser compatibility

#### Multiplayer Desync
**Symptoms**: Different game states across clients

```
1. Verify WASM module versions match
2. Check seed synchronization
3. Look for Math.random() usage
4. Validate input timestamp handling
5. Test deterministic replay
```

#### Performance Issues
**Symptoms**: Frame drops, memory growth, GC spikes

```
1. Profile WASM/JS boundary overhead
2. Reduce state export frequency  
3. Check for memory leaks
4. Optimize update loop
5. Use requestAnimationFrame properly
```

#### Combat System Issues
**Symptoms**: Unresponsive input, timing problems

```
1. Check input buffer (120ms)
2. Validate state machine transitions
3. Test timing windows
4. Verify deterministic execution
5. Check stamina calculations
```

---

## 📋 Code Review Checklist

### Architecture Compliance
- [ ] All game logic in WASM
- [ ] JavaScript only for UI/rendering/networking
- [ ] Deterministic execution maintained
- [ ] No Math.random() in gameplay paths
- [ ] State flow follows WASM → JS pattern

### Performance Requirements
- [ ] Frame time ≤ 16ms
- [ ] Memory growth < 10MB per session
- [ ] WASM memory < 32MB total
- [ ] No GC pressure spikes
- [ ] Network latency < 100ms

### Testing Requirements
- [ ] Golden test passes
- [ ] Unit tests cover new functionality
- [ ] Integration tests validate system interaction
- [ ] Performance benchmarks maintained
- [ ] Cross-platform compatibility verified

### Documentation Updates
- [ ] API changes documented
- [ ] Architecture diagrams updated if needed
- [ ] Quick reference updated for new patterns
- [ ] Examples added for complex features

---

## 🎯 Success Metrics

### Development Velocity
- **Setup time**: < 5 minutes to understand changes needed
- **Implementation time**: Focused on actual logic, not navigation
- **Testing time**: Automated validation of core requirements
- **Documentation time**: Minimal updates needed for standard changes

### Code Quality
- **Deterministic**: 100% reproducible behavior
- **Performance**: All targets consistently met
- **Maintainable**: Clear separation of concerns
- **Testable**: Comprehensive automated validation

### Team Efficiency  
- **Onboarding**: New AI agents productive immediately
- **Consistency**: All changes follow established patterns
- **Reliability**: Rare regressions or architectural violations
- **Scalability**: Easy to extend without major refactoring

---

*This workflow guide consolidates best practices from across the documentation to enable efficient, high-quality development.*
