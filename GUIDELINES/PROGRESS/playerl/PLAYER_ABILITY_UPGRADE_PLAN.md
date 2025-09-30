# 🚀 Player Ability Upgrade Plan

**Date**: January 2025  
**Status**: Planning Phase  
**Objective**: Enhance player abilities across animation, combat, and physics systems

---

## 📋 Executive Summary

This plan outlines a comprehensive upgrade to player abilities, building on the existing 5-button combat system, animation framework, and physics integration. The upgrade focuses on character differentiation, ability progression, and deeper combat mechanics while maintaining WASM-first architecture.

### Current State Assessment

✅ **What We Have**:
- Complete 5-button combat system (Light/Heavy/Block/Roll/Special)
- 3 character types with unique weapons (Warden, Raider, Kensei)
- Basic combo system (up to 5 hits)
- Parry/block mechanics (120ms window)
- Roll i-frames (300ms invulnerability)
- Status effect framework (partial)
- Physics knockback and collision
- Player animation system with state machine

🟡 **What Needs Improvement**:
- Character-specific abilities are not fully implemented
- No ability progression/upgrade system
- Limited special move variety
- Status effects need expansion
- Animation polish for abilities
- Physics integration for abilities incomplete
- No resource management beyond stamina

---

## 🎯 Upgrade Goals

### Phase 1: Character-Specific Abilities (Weeks 1-3)
Fully implement unique abilities for each character with physics and animation integration.

### Phase 2: Ability Progression System (Weeks 4-5)
Add upgrade paths and ability unlocking through gameplay progression.

### Phase 3: Advanced Combat Mechanics (Weeks 6-7)
Expand combat depth with combos, cancels, and advanced techniques.

### Phase 4: Animation & VFX Polish (Week 8)
Enhance visual feedback and animation quality for all abilities.

---

## 📊 Phase Breakdown

## Phase 1: Character-Specific Abilities

### 🛡️ Warden - Shoulder Bash System

**Current**: Basic bash synergy (weapon property)  
**Upgrade**: Full shoulder bash ability with physics integration

#### Implementation

**WASM Core** (`public/src/wasm/managers/PlayerManager.cpp`):
```cpp
struct ShoulderBashState {
    bool is_active;
    float duration;
    float charge_time;
    float max_charge;
    Fixed force_multiplier;
    uint32_t targets_hit;
};

ShoulderBashState bash_state = {
    .is_active = false,
    .duration = 0.0f,
    .charge_time = 0.0f,
    .max_charge = 1.0f,
    .force_multiplier = Fixed::from_int(1),
    .targets_hit = 0
};

// Charge bash (hold special button)
void charge_shoulder_bash(float dt) {
    bash_state.charge_time += dt;
    bash_state.charge_time = std::min(bash_state.charge_time, bash_state.max_charge);
    
    // Slow movement during charge
    player_speed_multiplier = 0.5f;
    
    // Visual indicator scales with charge
    bash_state.force_multiplier = Fixed::from_float(1.0f + bash_state.charge_time);
}

// Execute bash (release special button)
void execute_shoulder_bash() {
    if (bash_state.charge_time < 0.3f) return; // Minimum charge
    
    bash_state.is_active = true;
    bash_state.duration = 0.6f; // Bash duration
    
    // Apply forward lunge
    Fixed bash_force = Fixed::from_int(15) * bash_state.force_multiplier;
    physics_manager->apply_impulse(
        player_body_id,
        FixedVector3(facing_x * bash_force, facing_y * bash_force, Fixed::zero())
    );
    
    // Create bash hitbox (large capsule)
    create_bash_hitbox();
    
    // Stamina cost scales with charge
    stamina -= 0.3f * bash_state.force_multiplier.to_float();
}

// Bash collision handling
void on_bash_hit(uint32_t target_id) {
    bash_state.targets_hit++;
    
    // Each enemy hit extends bash duration slightly
    bash_state.duration += 0.1f;
    
    // Apply massive knockback
    Fixed knockback = Fixed::from_int(50) * bash_state.force_multiplier;
    physics_manager->apply_impulse(target_id, /* direction */ knockback);
    
    // Stun target
    apply_status_effect(target_id, StatusEffect::STUNNED, 0.8f);
    
    // Restore some stamina on hit (reward aggression)
    stamina = std::min(1.0f, stamina + 0.1f);
}
```

**WASM Exports**:
```cpp
extern "C" {
    void start_charging_bash();
    void release_bash();
    float get_bash_charge_level();
    int get_bash_targets_hit();
    int is_bash_active();
}
```

**Animation** (`public/src/animation/player/warden-abilities.js`):
```javascript
class WardenBashAnimation {
    constructor(player) {
        this.player = player;
        this.chargeParticles = [];
    }
    
    updateChargeAnimation(chargeLevel, dt) {
        // Stance: lean forward, shield up
        this.player.body.rotation = -0.2 * chargeLevel;
        this.player.leftArm.y = -10 * chargeLevel; // Shield raised
        
        // Charge particles (orange glow)
        if (chargeLevel > 0.3) {
            this.spawnChargeParticle(chargeLevel);
        }
        
        // Camera shake at max charge
        if (chargeLevel >= 1.0) {
            cameraController.addShake(0.5, 0.1);
        }
    }
    
    executeBashAnimation() {
        // Rapid forward lunge animation
        const frames = [
            { time: 0.0, rotation: -0.2, offsetY: 0 },
            { time: 0.1, rotation: 0.3, offsetY: -5 }, // Wind up
            { time: 0.2, rotation: 0.0, offsetY: 0 },  // Impact
            { time: 0.6, rotation: 0.0, offsetY: 0 }   // Recovery
        ];
        
        animationSystem.playFrames('bash', frames);
        
        // Spawn impact VFX at frame 2
        setTimeout(() => this.spawnImpactEffect(), 200);
    }
    
    spawnImpactEffect() {
        // Large yellow shockwave
        visualEffects.createShockwave(
            this.player.x, this.player.y,
            { radius: 80, color: '#ffaa00', duration: 0.3 }
        );
        
        // Screen shake
        cameraController.addShake(2.0, 0.3);
        
        // Sound effect
        audioManager.play('heavy_impact');
    }
}
```

**JavaScript Integration** (`public/src/game/abilities/warden-abilities.js`):
```javascript
export class WardenAbilities {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.bashCharging = false;
        this.bashAnimation = new WardenBashAnimation(player);
    }
    
    update(dt, input) {
        // Hold special button to charge
        if (input.special && !this.bashCharging) {
            this.wasm._start_charging_bash();
            this.bashCharging = true;
        }
        
        // Release to execute
        if (!input.special && this.bashCharging) {
            this.wasm._release_bash();
            this.bashCharging = false;
            this.bashAnimation.executeBashAnimation();
        }
        
        // Update charge animation
        if (this.bashCharging) {
            const chargeLevel = this.wasm._get_bash_charge_level();
            this.bashAnimation.updateChargeAnimation(chargeLevel, dt);
        }
        
        // Update active bash
        if (this.wasm._is_bash_active()) {
            this.updateBashPhysics(dt);
        }
    }
    
    updateBashPhysics(dt) {
        // Query enemies in bash path
        const enemies = gameState.getActiveEnemies();
        enemies.forEach(enemy => {
            if (this.checkBashCollision(enemy)) {
                this.onBashHit(enemy);
            }
        });
    }
}
```

---

### ⚔️ Raider - Unstoppable Charge

**Current**: Hyperarmor on heavy attacks (weapon property)  
**Upgrade**: Full berserker charge ability with momentum mechanics

#### Implementation

**WASM Core** (`public/src/wasm/managers/PlayerManager.cpp`):
```cpp
struct BerserkerChargeState {
    bool is_active;
    float duration;
    Fixed speed_multiplier;
    int enemies_hit;
    bool hyperarmor;
    float damage_taken_reduction;
};

BerserkerChargeState charge_state = {
    .is_active = false,
    .duration = 0.0f,
    .speed_multiplier = Fixed::from_float(2.5f),
    .enemies_hit = 0,
    .hyperarmor = true,
    .damage_taken_reduction = 0.7f // 70% reduction
};

// Activate berserker charge
void activate_berserker_charge() {
    if (stamina < 0.4f) return; // Requires 40% stamina
    
    charge_state.is_active = true;
    charge_state.duration = 3.0f; // Long duration
    charge_state.enemies_hit = 0;
    
    // Apply forward impulse
    Fixed charge_force = Fixed::from_int(25);
    physics_manager->apply_impulse(
        player_body_id,
        FixedVector3(facing_x * charge_force, facing_y * charge_force, Fixed::zero())
    );
    
    // Activate hyperarmor
    player_hyperarmor = true;
    
    // Drain stamina over time during charge
    stamina -= 0.4f;
}

// Update charge mechanics
void update_berserker_charge(float dt) {
    if (!charge_state.is_active) return;
    
    charge_state.duration -= dt;
    
    // Maintain high speed
    RigidBody* player = physics_manager->get_body(player_body_id);
    Fixed current_speed = player->velocity.length();
    Fixed target_speed = Fixed::from_float(player_base_speed) * charge_state.speed_multiplier;
    
    if (current_speed < target_speed) {
        // Accelerate towards target speed
        FixedVector3 direction = player->velocity.normalized();
        physics_manager->apply_force(
            player_body_id,
            direction * Fixed::from_int(100)
        );
    }
    
    // Drain stamina
    stamina -= 0.2f * dt;
    
    // End if out of stamina or duration
    if (stamina <= 0 || charge_state.duration <= 0) {
        end_berserker_charge();
    }
}

// Collision during charge
void on_charge_collision(uint32_t target_id) {
    charge_state.enemies_hit++;
    
    // Damage scales with current velocity
    RigidBody* player = physics_manager->get_body(player_body_id);
    float momentum_damage = player->velocity.length().to_float() * 10.0f;
    
    apply_damage(target_id, momentum_damage);
    
    // Knockback perpendicular to charge direction
    Fixed knockback = Fixed::from_int(40);
    physics_manager->apply_impulse(target_id, /* perpendicular */ knockback);
    
    // Restore health on kill
    if (is_enemy_dead(target_id)) {
        health = std::min(max_health, health + 15.0f);
    }
}

// Damage reduction during charge
float process_incoming_damage(float damage) {
    if (charge_state.is_active) {
        return damage * (1.0f - charge_state.damage_taken_reduction);
    }
    return damage;
}
```

**Animation** (`public/src/animation/player/raider-abilities.js`):
```javascript
class RaiderChargeAnimation {
    updateChargeAnimation(dt) {
        // Aggressive forward-leaning pose
        player.body.rotation = 0.3;
        player.rightArm.rotation = -0.5; // Axe trailing
        
        // Speed lines
        this.spawnSpeedLines();
        
        // Red aura effect
        this.updateBerserkAura(dt);
        
        // Heavy footstep particles
        if (frameCount % 5 === 0) {
            this.spawnFootstepDust();
        }
    }
    
    spawnBerserkAura(dt) {
        // Pulsing red glow
        const aura = {
            x: player.x,
            y: player.y,
            radius: 40 + Math.sin(Date.now() * 0.01) * 10,
            color: 'rgba(255, 0, 0, 0.3)',
            blur: 20
        };
        visualEffects.drawGlow(aura);
    }
}
```

---

### 🗡️ Kensei - Flow State Dash

**Current**: Flow combo system (weapon property)  
**Upgrade**: Dash attack with combo extensions and positioning

#### Implementation

**WASM Core** (`public/src/wasm/managers/PlayerManager.cpp`):
```cpp
struct FlowDashState {
    bool is_active;
    float duration;
    int combo_level; // 0-3
    Fixed dash_distance;
    bool can_cancel;
    std::vector<FixedVector3> dash_targets;
};

FlowDashState dash_state = {
    .is_active = false,
    .duration = 0.0f,
    .combo_level = 0,
    .dash_distance = Fixed::from_float(3.0f),
    .can_cancel = false,
    .dash_targets = {}
};

// Execute flow dash
void execute_flow_dash(FixedVector3 direction) {
    if (stamina < 0.2f) return;
    
    dash_state.is_active = true;
    dash_state.duration = 0.3f; // Quick dash
    dash_state.can_cancel = false;
    
    // Instant teleport (dash feels instant)
    RigidBody* player = physics_manager->get_body(player_body_id);
    player->position += direction.normalized() * dash_state.dash_distance;
    
    // Spawn slash hitbox along dash path
    create_dash_slash_hitbox();
    
    // I-frames during dash
    player_invulnerable = true;
    
    // Stamina cost reduces with combo level
    float cost_reduction = dash_state.combo_level * 0.05f;
    stamina -= std::max(0.1f, 0.2f - cost_reduction);
}

// On dash hit enemy
void on_dash_hit(uint32_t target_id) {
    dash_state.combo_level++;
    dash_state.combo_level = std::min(3, dash_state.combo_level);
    
    // Store target for potential multi-dash
    dash_state.dash_targets.push_back(target_id);
    
    // Enable dash cancel (can dash again immediately)
    dash_state.can_cancel = true;
    
    // Restore stamina
    stamina = std::min(1.0f, stamina + 0.15f);
    
    // Damage scales with combo level
    float damage = 25.0f * (1.0f + dash_state.combo_level * 0.3f);
    apply_damage(target_id, damage);
}

// Multi-dash mechanic (dash to multiple enemies)
void chain_dash(uint32_t next_target_id) {
    if (!dash_state.can_cancel) return;
    if (dash_state.combo_level >= 3) return; // Max 3 chained dashes
    
    RigidBody* target = physics_manager->get_body(next_target_id);
    RigidBody* player = physics_manager->get_body(player_body_id);
    
    FixedVector3 direction = (target->position - player->position).normalized();
    execute_flow_dash(direction);
}
```

**Animation** (`public/src/animation/player/kensei-abilities.js`):
```javascript
class KenseiDashAnimation {
    executeDashAnimation(startPos, endPos) {
        // Blur trail effect
        const trail = {
            start: startPos,
            end: endPos,
            width: 30,
            color: '#00ffff',
            duration: 0.3
        };
        visualEffects.createMotionBlur(trail);
        
        // Slash effect along path
        this.createDashSlashVFX(startPos, endPos);
        
        // Afterimages
        this.spawnAfterimage(startPos);
        
        // Sound: whoosh
        audioManager.play('dash_whoosh');
    }
    
    createDashSlashVFX(start, end) {
        const slashes = 5;
        for (let i = 0; i < slashes; i++) {
            const t = i / slashes;
            const x = lerp(start.x, end.x, t);
            const y = lerp(start.y, end.y, t);
            
            setTimeout(() => {
                visualEffects.createSlashEffect(x, y, {
                    color: '#00ffff',
                    size: 40,
                    rotation: Math.random() * Math.PI
                });
            }, i * 20);
        }
    }
}
```

---

## Phase 2: Ability Progression System

### Upgrade Tree Structure

**WASM Data Structure** (`public/src/wasm/systems/AbilityUpgradeSystem.h`):
```cpp
enum class AbilityUpgradeType {
    // Warden
    BASH_CHARGE_SPEED,    // Charge bash faster
    BASH_DAMAGE,          // Increased bash damage
    BASH_RANGE,           // Larger bash hitbox
    BASH_STAMINA_REFUND,  // More stamina on hit
    
    // Raider
    CHARGE_DURATION,      // Longer charge duration
    CHARGE_DAMAGE_REDUCTION, // More damage reduction
    CHARGE_HEALING,       // Heal on enemy hit
    CHARGE_SPEED,         // Faster charge speed
    
    // Kensei
    DASH_DISTANCE,        // Longer dash range
    DASH_COMBO_WINDOW,    // Extended combo timing
    DASH_COOLDOWN,        // Shorter cooldown
    DASH_MULTITARGET      // Unlock 4th chained dash
};

struct AbilityUpgrade {
    AbilityUpgradeType type;
    int current_level;    // 0-3
    int max_level;
    float effect_per_level;
    int essence_cost[4];  // Cost for each level
    bool unlocked;
};

class AbilityUpgradeSystem {
public:
    void initialize();
    bool purchase_upgrade(AbilityUpgradeType type);
    float get_upgrade_modifier(AbilityUpgradeType type);
    std::vector<AbilityUpgrade> get_available_upgrades();
    
private:
    std::map<AbilityUpgradeType, AbilityUpgrade> upgrades_;
    int player_essence_;
};
```

### Progression Integration

**Essence Currency**:
- Earned from combat (1 essence per enemy kill)
- Bonus essence from perfect parries (2 essence)
- Combo bonuses (3+ combo = 2x essence)
- Phase rewards (5-10 essence per phase cleared)

**UI Integration** (`public/src/ui/ability-upgrade-menu.js`):
```javascript
class AbilityUpgradeMenu {
    render() {
        const upgrades = wasmModule._get_available_upgrades();
        
        // Render upgrade tree
        this.renderUpgradeTree(upgrades);
        
        // Display essence
        const essence = wasmModule._get_essence();
        this.essenceDisplay.textContent = `Essence: ${essence}`;
    }
    
    onUpgradeClick(upgradeType) {
        const success = wasmModule._purchase_upgrade(upgradeType);
        
        if (success) {
            this.playPurchaseAnimation();
            this.render(); // Refresh
        } else {
            this.showInsufficientEssenceError();
        }
    }
}
```

---

## Phase 3: Advanced Combat Mechanics

### Ability Combos

**Combo System** (`public/src/wasm/systems/ComboSystem.cpp`):
```cpp
struct ComboNode {
    std::string move_name;
    std::vector<ComboNode*> next_moves;
    float window_duration; // Time to input next move
    float damage_multiplier;
};

// Example: Warden combo tree
ComboNode warden_combos = {
    "light_attack", {
        { "light_attack", { /* next */ }, 0.5f, 1.2f },
        { "heavy_attack", { /* finisher */ }, 0.5f, 1.5f },
        { "shoulder_bash", { /* special */ }, 0.6f, 2.0f }
    }
};

class ComboSystem {
public:
    void input_move(const std::string& move);
    bool is_in_combo();
    float get_combo_damage_multiplier();
    void update(float dt);
    
private:
    ComboNode* current_node_;
    float combo_window_timer_;
    int combo_count_;
};
```

### Cancel System

**Attack Canceling** (`public/src/wasm/managers/CombatManager.cpp`):
```cpp
enum class CancelType {
    DASH_CANCEL,     // Cancel recovery with dash
    PARRY_CANCEL,    // Cancel into parry
    ROLL_CANCEL,     // Cancel into roll
    ABILITY_CANCEL   // Cancel into special ability
};

struct CancelWindow {
    float start_time;
    float end_time;
    CancelType allowed_cancel;
    float stamina_cost;
};

// Example: Heavy attack can be dash-canceled during recovery
void setup_cancel_windows() {
    heavy_attack_cancels = {
        { 0.4f, 0.6f, CancelType::DASH_CANCEL, 0.15f },
        { 0.0f, 0.2f, CancelType::PARRY_CANCEL, 0.1f }
    };
}

bool attempt_cancel(CancelType cancel_type) {
    float attack_time = get_current_attack_normalized_time();
    
    for (const auto& window : current_attack_cancels) {
        if (attack_time >= window.start_time && 
            attack_time <= window.end_time &&
            window.allowed_cancel == cancel_type) {
            
            if (stamina >= window.stamina_cost) {
                stamina -= window.stamina_cost;
                cancel_current_animation();
                return true;
            }
        }
    }
    return false;
}
```

---

## Phase 4: Animation & VFX Polish

### Enhanced Visual Effects

**Particle Systems** (`public/src/vfx/ability-particles.js`):
```javascript
class AbilityVFXManager {
    // Warden bash charge glow
    createBashChargeEffect(x, y, chargeLevel) {
        const particleCount = Math.floor(chargeLevel * 20);
        
        for (let i = 0; i < particleCount; i++) {
            particles.spawn({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 2,
                vy: -2 + Math.random(),
                color: '#ffaa00',
                size: 3 + Math.random() * 2,
                lifetime: 0.5,
                gravity: -0.5
            });
        }
        
        // Glow ring
        ctx.save();
        ctx.globalAlpha = chargeLevel * 0.5;
        ctx.fillStyle = '#ffaa00';
        ctx.filter = 'blur(10px)';
        ctx.beginPath();
        ctx.arc(x, y, 30 * chargeLevel, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Raider charge trail
    createChargeTrail(x, y, velocity) {
        // Speed lines
        for (let i = 0; i < 5; i++) {
            const offsetX = -velocity.x * (i + 1) * 10;
            const offsetY = -velocity.y * (i + 1) * 10;
            
            particles.spawn({
                x: x + offsetX,
                y: y + offsetY,
                vx: -velocity.x * 0.5,
                vy: -velocity.y * 0.5,
                color: '#ff0000',
                size: 15 - i * 2,
                lifetime: 0.2,
                alpha: 0.8 - i * 0.15
            });
        }
    }
    
    // Kensei dash afterimage
    createDashAfterimage(x, y, facing, comboLevel) {
        const color = `hsl(${180 + comboLevel * 30}, 100%, 50%)`;
        
        // Draw semi-transparent player silhouette
        ctx.save();
        ctx.globalAlpha = 0.3 - comboLevel * 0.05;
        ctx.fillStyle = color;
        ctx.filter = 'blur(3px)';
        
        // Draw simplified player shape
        ctx.fillRect(x - 15, y - 20, 30, 40);
        
        ctx.restore();
        
        // Fade out over time
        setTimeout(() => {
            // Remove afterimage
        }, 150);
    }
}
```

### Camera Effects

**Dynamic Camera** (`public/src/camera/ability-camera-effects.js`):
```javascript
class AbilityCameraController {
    // Bash impact zoom
    onBashImpact(impactForce) {
        // Quick zoom in
        camera.zoomTo(1.3, 0.1);
        
        // Zoom back out
        setTimeout(() => {
            camera.zoomTo(1.0, 0.3);
        }, 100);
        
        // Shake
        camera.shake(impactForce / 20, 0.2);
    }
    
    // Charge speed blur
    updateChargeCamera(velocity) {
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        
        if (speed > 5) {
            // Motion blur in direction of movement
            camera.setMotionBlur({
                angle: Math.atan2(velocity.y, velocity.x),
                intensity: (speed - 5) / 10
            });
        } else {
            camera.clearMotionBlur();
        }
    }
    
    // Dash bullet time
    onDashStart() {
        // Slow time briefly
        gameTime.setTimeScale(0.3, 0.1);
        
        // Zoom in slightly
        camera.zoomTo(1.15, 0.1);
        
        // Return to normal after dash
        setTimeout(() => {
            gameTime.setTimeScale(1.0, 0.2);
            camera.zoomTo(1.0, 0.2);
        }, 300);
    }
}
```

### Sound Design

**Audio Integration** (`public/src/audio/ability-sounds.js`):
```javascript
class AbilitySoundManager {
    loadAbilitySounds() {
        // Warden sounds
        this.sounds.bash_charge = new Audio('sfx/bash_charge.wav');
        this.sounds.bash_impact = new Audio('sfx/heavy_impact.wav');
        this.sounds.bash_whoosh = new Audio('sfx/bash_whoosh.wav');
        
        // Raider sounds
        this.sounds.charge_start = new Audio('sfx/roar.wav');
        this.sounds.charge_loop = new Audio('sfx/heavy_footsteps_loop.wav');
        this.sounds.charge_impact = new Audio('sfx/crash.wav');
        
        // Kensei sounds
        this.sounds.dash = new Audio('sfx/dash_whoosh.wav');
        this.sounds.dash_slash = new Audio('sfx/quick_slash.wav');
        this.sounds.multi_dash = new Audio('sfx/combo_whoosh.wav');
    }
    
    playBashSound(chargeLevel) {
        // Pitch shifts with charge level
        const sound = this.sounds.bash_charge.cloneNode();
        sound.playbackRate = 0.8 + chargeLevel * 0.4;
        sound.volume = 0.5 + chargeLevel * 0.3;
        sound.play();
    }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Character Abilities (Weeks 1-3)

#### Week 1: Warden Shoulder Bash
- [ ] Implement bash state in `PlayerManager.cpp`
- [ ] Add charge mechanics with force scaling
- [ ] Create bash hitbox system
- [ ] Add WASM exports for bash control
- [ ] Implement bash animation system
- [ ] Add charge particle effects
- [ ] Create impact VFX
- [ ] Integrate bash collision with physics
- [ ] Add sound effects
- [ ] Test and balance bash parameters

#### Week 2: Raider Berserker Charge
- [ ] Implement charge state in `PlayerManager.cpp`
- [ ] Add velocity maintenance system
- [ ] Create hyperarmor during charge
- [ ] Implement damage reduction
- [ ] Add WASM exports for charge
- [ ] Create charge animation with aura
- [ ] Add speed line particles
- [ ] Implement collision knockback
- [ ] Add healing on kill mechanic
- [ ] Test and balance charge parameters

#### Week 3: Kensei Flow Dash
- [ ] Implement dash state in `PlayerManager.cpp`
- [ ] Add instant teleport mechanic
- [ ] Create dash slash hitbox
- [ ] Implement combo chain system
- [ ] Add WASM exports for dash
- [ ] Create dash animation with blur
- [ ] Add afterimage effects
- [ ] Implement multi-dash targeting
- [ ] Add dash cancel windows
- [ ] Test and balance dash parameters

### Phase 2: Progression System (Weeks 4-5)

#### Week 4: Upgrade Infrastructure
- [ ] Create `AbilityUpgradeSystem` class
- [ ] Define upgrade tree data structures
- [ ] Implement essence currency system
- [ ] Add upgrade purchase logic
- [ ] Create WASM exports for upgrades
- [ ] Implement upgrade modifiers
- [ ] Add persistence/save system
- [ ] Test upgrade calculations

#### Week 5: Upgrade UI
- [ ] Design upgrade menu UI
- [ ] Create upgrade tree visualization
- [ ] Implement upgrade purchase flow
- [ ] Add essence display
- [ ] Create upgrade tooltips
- [ ] Add purchase animations
- [ ] Integrate with game progression
- [ ] Test UI responsiveness

### Phase 3: Advanced Mechanics (Weeks 6-7)

#### Week 6: Combo System
- [ ] Implement combo tree data structure
- [ ] Add combo input tracking
- [ ] Create combo damage scaling
- [ ] Add combo UI indicators
- [ ] Implement combo-specific VFX
- [ ] Test combo timing windows

#### Week 7: Cancel System
- [ ] Define cancel window system
- [ ] Implement cancel validation
- [ ] Add stamina costs for cancels
- [ ] Create cancel animations
- [ ] Add cancel VFX
- [ ] Test cancel timing and balance

### Phase 4: Polish (Week 8)

#### Week 8: VFX & Camera
- [ ] Polish all particle effects
- [ ] Enhance camera shake/zoom
- [ ] Add motion blur effects
- [ ] Implement time dilation
- [ ] Polish sound design
- [ ] Final balance pass
- [ ] Performance optimization
- [ ] Bug fixes and testing

---

## 🎯 Success Metrics

### Performance Targets
- [ ] Maintain 60 FPS on mobile during ability use
- [ ] Ability VFX overhead < 2ms per frame
- [ ] Physics calculations < 1ms per ability

### Gameplay Goals
- [ ] Each character feels distinct and specialized
- [ ] Abilities integrated smoothly with combat
- [ ] Progression system provides meaningful upgrades
- [ ] Combo/cancel systems increase skill ceiling
- [ ] Visual feedback is clear and satisfying

### Technical Requirements
- [ ] All ability logic in WASM (deterministic)
- [ ] No gameplay logic in JavaScript
- [ ] Multiplayer synchronization maintained
- [ ] Clean separation of concerns
- [ ] Comprehensive test coverage

---

## 🚀 Future Enhancements (Post-Launch)

### Advanced Abilities
- **Warden**: Counter-bash (parry into bash)
- **Raider**: Whirlwind spin attack
- **Kensei**: Perfect slice (frame-perfect timing attack)

### Ability Customization
- Ability modifiers (swap bash for shield wall)
- Synergy bonuses (specific ability combinations)
- Cosmetic variations (VFX customization)

### Ultimate Abilities
- Once-per-run super abilities
- Require 100 essence to unlock
- Dramatically powerful effects
- Unique animations and VFX

---

## 📚 Related Documentation

- [5-Button Combat Implementation](../FIGHT/5-BUTTON_COMBAT_IMPLEMENTATION.md)
- [Combat System Architecture](../FIGHT/COMBAT_SYSTEM.md)
- [Player Animations](../ANIMATION/PLAYER_ANIMATIONS.md)
- [Physics Integration](./PHYSICS_INTEGRATION_COMPLETE.md)
- [Player Characters](../SYSTEMS/PLAYER_CHARACTERS.md)
- [Status Effects](../FIGHT/COMBAT_FEATURES_IMPLEMENTED.md)

---

## 🎓 Implementation Notes

### WASM-First Principles
- All ability state and logic in C++
- JavaScript only handles rendering and input
- Deterministic execution for multiplayer
- No Math.random() for gameplay

### Animation Integration
- Abilities drive animation state machine
- VFX synchronized with ability timing
- Procedural animation for dynamic feedback
- Camera effects enhance impact

### Physics Integration
- Abilities use physics impulses
- Collision detection for ability hitboxes
- Knockback scaled by ability force
- Environmental interaction (walls, hazards)

### Balance Philosophy
- Abilities should feel powerful but fair
- Risk/reward trade-offs (stamina costs)
- Skill expression through timing/combos
- Counter-play opportunities for enemies

---

**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Estimated Timeline**: 8 weeks  
**Priority**: HIGH - Core gameplay enhancement  
**Architecture**: WASM-First, Deterministic, Multiplayer-Ready

---

*This plan builds upon the solid foundation of the existing combat, animation, and physics systems to create a deep, skill-based ability system that differentiates characters while maintaining the project's architectural principles.*

