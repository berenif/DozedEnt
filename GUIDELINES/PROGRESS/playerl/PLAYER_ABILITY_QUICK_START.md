# 🎮 Player Ability Upgrade - Quick Start Guide

**Goal**: Implement character-specific abilities with WASM-first architecture  
**Timeline**: 8 weeks  
**Start Here**: Week 1 - Warden Shoulder Bash

---

## 🚀 Getting Started (Day 1)

### 1. Read the Full Plan
📖 **[PLAYER_ABILITY_UPGRADE_PLAN.md](./PLAYER_ABILITY_UPGRADE_PLAN.md)**

### 2. Understand Current Systems
Review these existing implementations:
- ✅ [5-Button Combat](../FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md) - Base combat system
- ✅ [Combat System](../FIGHT/COMBAT_SYSTEM.md) - Combat architecture
- ✅ [Player Animations](../ANIMATION/PLAYER_ANIMATIONS.md) - Animation framework
- ✅ [Physics Integration](./PHYSICS_INTEGRATION_COMPLETE.md) - Knockback/collision

### 3. Set Up Development Environment
```bash
# Ensure WASM build tools are working
npm run wasm:build

# Test current game state
npm run serve
# Visit http://localhost:3000/docs/index.html
```

---

## 📋 Week 1: Warden Shoulder Bash (Days 1-5)

### Day 1: WASM Core Implementation

**File**: `public/src/wasm/managers/PlayerManager.cpp`

**Add Bash State Structure**:
```cpp
// At top of file
struct ShoulderBashState {
    bool is_active;
    float duration;
    float charge_time;
    float max_charge;
    Fixed force_multiplier;
    uint32_t targets_hit;
};

// In PlayerManager class
ShoulderBashState bash_state_;
```

**Add Bash Methods**:
```cpp
void PlayerManager::start_charging_bash() {
    if (combat_state_.stamina < 0.2f) return;
    bash_state_.charge_time = 0.0f;
}

void PlayerManager::update_bash_charge(float dt) {
    bash_state_.charge_time += dt;
    bash_state_.charge_time = std::min(bash_state_.charge_time, bash_state_.max_charge);
}

void PlayerManager::release_bash() {
    if (bash_state_.charge_time < 0.3f) return;
    
    bash_state_.is_active = true;
    bash_state_.duration = 0.6f;
    
    // Apply physics impulse
    Fixed force = Fixed::from_int(15) * Fixed::from_float(1.0f + bash_state_.charge_time);
    // ... physics integration
}
```

**Build & Test**:
```bash
npm run wasm:build
# Check for compilation errors
```

---

### Day 2: WASM Exports

**File**: `public/src/wasm/game_refactored.cpp`

**Add Exports**:
```cpp
extern "C" {

__attribute__((export_name("start_charging_bash")))
void start_charging_bash() {
    if (!game_state) return;
    game_state->player_manager->start_charging_bash();
}

__attribute__((export_name("release_bash")))
void release_bash() {
    if (!game_state) return;
    game_state->player_manager->release_bash();
}

__attribute__((export_name("get_bash_charge_level")))
float get_bash_charge_level() {
    if (!game_state) return 0.0f;
    return game_state->player_manager->get_bash_charge_level();
}

__attribute__((export_name("is_bash_active")))
int is_bash_active() {
    if (!game_state) return 0;
    return game_state->player_manager->is_bash_active() ? 1 : 0;
}

} // extern "C"
```

**Update CMakeLists.txt**:
```cmake
# Ensure PlayerManager.cpp is included
set(SOURCES
    # ... existing sources ...
    managers/PlayerManager.cpp
)
```

**Build & Verify**:
```bash
npm run wasm:build
node -e "const fs=require('fs'); const wasm=fs.readFileSync('public/game.wasm'); console.log('Size:', wasm.length, 'bytes');"
```

---

### Day 3: JavaScript Integration

**File**: `public/src/game/abilities/warden-abilities.js`

**Create File**:
```javascript
export class WardenAbilities {
    constructor(wasmModule, player) {
        this.wasm = wasmModule;
        this.player = player;
        this.bashCharging = false;
        this.chargeStartTime = 0;
    }
    
    update(dt, input) {
        // Start charging
        if (input.special && !this.bashCharging) {
            this.wasm._start_charging_bash();
            this.bashCharging = true;
            this.chargeStartTime = performance.now();
        }
        
        // Release bash
        if (!input.special && this.bashCharging) {
            this.wasm._release_bash();
            this.bashCharging = false;
            
            const chargeLevel = this.wasm._get_bash_charge_level();
            this.onBashExecute(chargeLevel);
        }
        
        // Update charge visuals
        if (this.bashCharging) {
            const chargeLevel = this.wasm._get_bash_charge_level();
            this.updateChargeEffect(chargeLevel);
        }
    }
    
    updateChargeEffect(chargeLevel) {
        // Emit charge particles
        if (Math.random() < chargeLevel) {
            particleSystem.emit({
                x: this.player.x,
                y: this.player.y,
                color: '#ffaa00',
                size: 3,
                lifetime: 0.5
            });
        }
    }
    
    onBashExecute(chargeLevel) {
        // Spawn impact effect
        visualEffects.createShockwave(
            this.player.x, 
            this.player.y,
            { radius: 60 * chargeLevel, color: '#ffaa00' }
        );
        
        // Camera shake
        cameraController.shake(chargeLevel * 2, 0.3);
        
        // Sound
        audioManager.play('bash_impact', { volume: 0.5 + chargeLevel * 0.5 });
    }
}
```

**Integrate in Main Game**:
```javascript
// In public/src/game/main-game-loop.js
import { WardenAbilities } from './abilities/warden-abilities.js';

// In game initialization
if (playerCharacter === 'warden') {
    this.abilities = new WardenAbilities(wasmModule, player);
}

// In game update loop
this.abilities?.update(deltaTime, input);
```

---

### Day 4: Animation System

**File**: `public/src/animation/player/ability-animations.js`

**Create Bash Animation**:
```javascript
export class BashAnimation {
    constructor(player) {
        this.player = player;
    }
    
    playChargeAnimation(chargeLevel) {
        // Lean forward based on charge
        this.player.body.rotation = -0.2 * chargeLevel;
        this.player.body.offsetY = -5 * chargeLevel;
        
        // Shield raised
        this.player.leftArm.y = -10 * chargeLevel;
        this.player.leftArm.rotation = -0.3 * chargeLevel;
    }
    
    playBashAnimation() {
        const timeline = [
            { time: 0.0, pose: 'charge', blend: 1.0 },
            { time: 0.1, pose: 'lunge', blend: 1.0 },
            { time: 0.3, pose: 'impact', blend: 1.0 },
            { time: 0.6, pose: 'recovery', blend: 0.0 }
        ];
        
        this.player.animationSystem.playTimeline('bash', timeline);
    }
}
```

**Test Animation**:
```bash
# Open browser dev tools
# Press Special button (L or 5)
# Verify charge animation plays
# Release to see bash animation
```

---

### Day 5: Testing & Polish

**Create Test Page**: `public/demos/bash-ability-test.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Bash Ability Test</title>
    <style>
        canvas { border: 1px solid #000; background: #222; }
        #controls { margin: 10px; }
        button { padding: 10px; margin: 5px; }
    </style>
</head>
<body>
    <canvas id="game" width="800" height="600"></canvas>
    <div id="controls">
        <button id="charge">Hold to Charge (Space)</button>
        <button id="release">Release Bash</button>
        <div id="stats">
            <p>Charge Level: <span id="chargeLevel">0%</span></p>
            <p>Bash Active: <span id="bashActive">No</span></p>
            <p>Targets Hit: <span id="targetsHit">0</span></p>
        </div>
    </div>
    
    <script type="module">
        import { WardenAbilities } from '../src/game/abilities/warden-abilities.js';
        
        // Initialize WASM
        const response = await fetch('../game.wasm');
        const buffer = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(buffer);
        
        const wasm = instance.exports;
        wasm.init_run(Date.now(), 0); // Initialize game
        
        // Create abilities
        const abilities = new WardenAbilities(wasm, player);
        
        // Input handling
        let charging = false;
        
        document.getElementById('charge').addEventListener('mousedown', () => {
            charging = true;
            abilities.update(0.016, { special: true });
        });
        
        document.getElementById('charge').addEventListener('mouseup', () => {
            charging = false;
            abilities.update(0.016, { special: false });
        });
        
        // Update loop
        function gameLoop() {
            // Update WASM
            wasm.update(0, 0, 0, 1/60);
            
            // Update UI
            if (charging) {
                const level = wasm.get_bash_charge_level();
                document.getElementById('chargeLevel').textContent = 
                    Math.floor(level * 100) + '%';
            }
            
            document.getElementById('bashActive').textContent = 
                wasm.is_bash_active() ? 'Yes' : 'No';
            
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    </script>
</body>
</html>
```

**Test Checklist**:
- [ ] Bash charges when holding special button
- [ ] Charge level increases over time (0-100%)
- [ ] Release executes bash at correct force
- [ ] Visual effects scale with charge level
- [ ] Camera shakes on impact
- [ ] Sound plays at correct volume
- [ ] Stamina drains appropriately
- [ ] Physics impulse applies correctly

---

## 🎯 Success Criteria (Week 1)

### Functionality
- ✅ Bash can be charged and released
- ✅ Charge level affects bash force
- ✅ Stamina cost is correct
- ✅ Physics impulse works

### Visual
- ✅ Charge particles spawn
- ✅ Impact shockwave appears
- ✅ Animation plays smoothly
- ✅ Camera shake feels impactful

### Performance
- ✅ 60 FPS maintained
- ✅ No frame drops during bash
- ✅ WASM size < 50KB

### Code Quality
- ✅ All logic in WASM
- ✅ No gameplay code in JS
- ✅ Clean separation of concerns
- ✅ Code compiles without warnings

---

## 📚 Troubleshooting

### WASM Won't Compile
```bash
# Check error messages
npm run wasm:build 2>&1 | tee build.log

# Common issues:
# - Missing semicolons
# - Undefined references (check includes)
# - Type mismatches (Fixed vs float)
```

### Bash Not Charging
```javascript
// Debug in browser console
console.log('Bash charging:', wasm._start_charging_bash());
console.log('Charge level:', wasm._get_bash_charge_level());
console.log('Stamina:', wasm._get_stamina());

// Check if special button is mapped correctly
```

### Physics Not Working
```javascript
// Verify physics manager exists
console.log('Player body ID:', wasm._get_player_body_id());
console.log('Player velocity:', wasm._get_physics_player_vel_x());

// Check if physics is updating
setInterval(() => {
    console.log('Pos:', wasm._get_x(), wasm._get_y());
}, 1000);
```

---

## 🚀 Next Steps

After completing Week 1:
1. **Commit your changes** with clear commit message
2. **Review the code** with team
3. **Gather feedback** from playtest
4. **Adjust balance** if needed
5. **Move to Week 2**: Raider Berserker Charge

---

## 📖 Additional Resources

### Documentation
- [Full Upgrade Plan](./PLAYER_ABILITY_UPGRADE_PLAN.md)
- [WASM API Reference](../BUILD/API.md)
- [Physics Integration](./PHYSICS_INTEGRATION_COMPLETE.md)
- [Combat System](../FIGHT/COMBAT_SYSTEM.md)

### Code Examples
- Existing combat: `public/src/wasm/managers/CombatManager.cpp`
- Physics knockback: `public/src/wasm/managers/GameStateManager.cpp`
- Player animation: `public/src/animation/player/procedural/player-animator.js`

### Tools
- WASM debugger: Chrome DevTools → Sources → WASM modules
- Performance profiler: Chrome DevTools → Performance
- Network inspector: Check WASM loading time

---

**Ready to start?** Begin with Day 1 and follow the guide step by step! 🎮

