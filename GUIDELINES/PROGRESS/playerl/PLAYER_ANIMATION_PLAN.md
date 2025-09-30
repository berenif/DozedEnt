# 🎬 Player Animation Implementation Plan

**Date**: January 2025  
**Status**: Ready for Implementation  
**Context**: Week 1 Complete (Bash WASM), Moving to Animation Integration

---

## 📋 Executive Summary

This plan details the animation implementation for the player ability system, building on the completed WASM foundation (Warden shoulder bash) and integrating with the existing `CharacterAnimator` and procedural animation systems.

### Current State ✅
- ✅ Warden bash WASM logic complete (PlayerManager.cpp)
- ✅ WASM exports ready (8 functions)
- ✅ CharacterAnimator system operational
- ✅ Procedural animation framework active
- ✅ 12 animation states implemented (idle → chargingAttack)

### Implementation Goals 🎯
1. **Integrate bash animations** with existing CharacterAnimator
2. **Create visual effects** for charge/impact/trail
3. **Implement ability animations** for all 3 characters
4. **Build demo pages** for testing and validation
5. **Maintain WASM-first architecture** (animations are visual only)

---

## 🗂️ File Structure Plan

Following single responsibility principle (max 500 lines per file):

```
public/src/
├── game/
│   └── abilities/
│       ├── ability-manager.js              [Core coordinator - 300 lines]
│       ├── warden-abilities.js             [Warden bash logic - 400 lines]
│       ├── raider-abilities.js             [Raider charge - 400 lines]
│       └── kensei-abilities.js             [Kensei dash - 400 lines]
├── animation/
│   └── abilities/
│       ├── ability-animation-base.js       [Base class - 200 lines]
│       ├── warden-bash-animation.js        [Bash visuals - 450 lines]
│       ├── raider-charge-animation.js      [Charge visuals - 450 lines]
│       └── kensei-dash-animation.js        [Dash visuals - 450 lines]
├── vfx/
│   └── abilities/
│       ├── ability-particles.js            [Particle system - 400 lines]
│       ├── ability-effects.js              [VFX manager - 350 lines]
│       └── ability-camera-effects.js       [Camera shake/zoom - 250 lines]
└── demo/
    └── abilities/
        ├── bash-demo.html                  [Bash test page]
        ├── charge-demo.html                [Charge test page]
        └── dash-demo.html                  [Dash test page]
```

---

## 📅 Implementation Timeline

### Week 1 (Days 3-5): Warden Bash Animation - CURRENT PRIORITY

**Day 3: JavaScript Integration & Base Classes** (4-5 hours)
- Create `ability-manager.js` - Core coordinator
- Create `ability-animation-base.js` - Shared animation logic
- Create `warden-abilities.js` - Bash input handling
- Integrate with existing game loop

**Day 4: Bash Animation & VFX** (5-6 hours)
- Create `warden-bash-animation.js` - Charge/execute animations
- Create `ability-particles.js` - Particle system
- Create `ability-effects.js` - VFX manager
- Implement charging glow effect
- Implement impact shockwave

**Day 5: Demo & Polish** (3-4 hours)
- Create `bash-demo.html` - Standalone test page
- Add camera shake/zoom effects
- Polish timing and visual feedback
- Performance testing
- Documentation

### Week 2: Raider Charge Animation
**Days 6-10**: Follow same pattern as Week 1 for Raider berserker charge

### Week 3: Kensei Dash Animation
**Days 11-15**: Follow same pattern for Kensei flow dash

---

## 🎯 Phase 1: Warden Bash Animation (Days 3-5)

### Day 3: Core Integration

#### 1. Ability Manager (`public/src/game/abilities/ability-manager.js`)

**Purpose**: Coordinate all character abilities, handle input, manage state

```javascript
/**
 * AbilityManager - Central coordinator for character-specific abilities
 * Responsibilities:
 * - Route input to active ability
 * - Manage ability state transitions
 * - Coordinate with animation system
 * - Handle WASM integration
 */

export class AbilityManager {
    constructor(wasmModule, animationSystem, vfxManager) {
        this.wasm = wasmModule;
        this.animSystem = animationSystem;
        this.vfx = vfxManager;
        
        this.activeAbility = null;
        this.abilities = new Map();
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateDuration = 0;
    }
    
    /**
     * Register a character's abilities
     * @param {string} characterType - 'warden', 'raider', 'kensei'
     * @param {Object} abilityInstance - Character ability class instance
     */
    registerAbility(characterType, abilityInstance) {
        this.abilities.set(characterType, abilityInstance);
    }
    
    /**
     * Set active character ability
     * @param {string} characterType - Active character
     */
    setActiveCharacter(characterType) {
        const ability = this.abilities.get(characterType);
        if (!ability) {
            console.warn(`[AbilityManager] No ability registered for ${characterType}`);
            return;
        }
        this.activeAbility = ability;
    }
    
    /**
     * Main update loop - called every frame
     * @param {number} deltaTime - Time since last update (seconds)
     * @param {Object} input - Current input state
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, input, gameState) {
        const startTime = performance.now();
        
        if (!this.activeAbility) {
            return;
        }
        
        // Update active ability
        this.activeAbility.update(deltaTime, input, gameState);
        
        // Track performance
        this.updateDuration = performance.now() - startTime;
        if (this.updateDuration > 2.0) {
            console.warn(`[AbilityManager] Slow update: ${this.updateDuration.toFixed(2)}ms`);
        }
    }
    
    /**
     * Render ability VFX
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (!this.activeAbility) {
            return;
        }
        this.activeAbility.render(ctx, camera);
    }
    
    /**
     * Get performance metrics
     * @returns {Object} Performance data
     */
    getMetrics() {
        return {
            updateTime: this.updateDuration,
            activeAbility: this.activeAbility?.constructor.name || 'none'
        };
    }
}
```

#### 2. Ability Animation Base (`public/src/animation/abilities/ability-animation-base.js`)

**Purpose**: Shared animation logic for all abilities

```javascript
/**
 * AbilityAnimationBase - Base class for ability animations
 * Provides common functionality:
 * - Animation state management
 * - Timing utilities
 * - Transform calculations
 * - VFX integration
 */

export class AbilityAnimationBase {
    constructor(characterAnimator, vfxManager) {
        this.animator = characterAnimator;
        this.vfx = vfxManager;
        
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.loops = false;
    }
    
    /**
     * Play animation
     * @param {string} animationName - Animation to play
     * @param {number} duration - Animation duration (seconds)
     * @param {boolean} loop - Should animation loop
     */
    play(animationName, duration = 0.6, loop = false) {
        this.isPlaying = true;
        this.currentTime = 0;
        this.duration = duration;
        this.loops = loop;
        
        // Trigger animation state change
        this.onAnimationStart(animationName);
    }
    
    /**
     * Stop animation
     */
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.onAnimationEnd();
    }
    
    /**
     * Update animation timing
     * @param {number} deltaTime - Time since last update (seconds)
     * @returns {number} Normalized time (0-1)
     */
    updateTiming(deltaTime) {
        if (!this.isPlaying) {
            return 0;
        }
        
        this.currentTime += deltaTime;
        
        if (this.currentTime >= this.duration) {
            if (this.loops) {
                this.currentTime = 0;
            } else {
                this.stop();
                return 1.0;
            }
        }
        
        return this.currentTime / this.duration;
    }
    
    /**
     * Lerp between values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Ease out cubic
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Ease in cubic
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeInCubic(t) {
        return t * t * t;
    }
    
    /**
     * Override: Called when animation starts
     */
    onAnimationStart(animationName) {
        // Override in subclass
    }
    
    /**
     * Override: Called when animation ends
     */
    onAnimationEnd() {
        // Override in subclass
    }
}
```

#### 3. Warden Abilities (`public/src/game/abilities/warden-abilities.js`)

**Purpose**: Handle Warden bash input and WASM integration

```javascript
/**
 * WardenAbilities - Warden character abilities
 * Implements:
 * - Shoulder bash charging
 * - Bash execution
 * - WASM state synchronization
 * - Animation triggers
 */

import { AbilityAnimationBase } from '../../animation/abilities/ability-animation-base.js';

export class WardenAbilities {
    constructor(wasmModule, animationSystem, vfxManager) {
        this.wasm = wasmModule;
        this.animSystem = animationSystem;
        this.vfx = vfxManager;
        
        // Create bash animation controller
        this.bashAnimation = new WardenBashAnimation(animationSystem, vfxManager);
        
        // State tracking
        this.isCharging = false;
        this.wasChargingLastFrame = false;
        this.bashExecuted = false;
        
        // Input tracking
        this.specialKeyDown = false;
    }
    
    /**
     * Update ability state
     * @param {number} deltaTime - Time since last update (seconds)
     * @param {Object} input - Current input state
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, input, gameState) {
        // Check if special button is held (E key or gamepad button)
        const specialPressed = input.special || input.keys?.e || false;
        
        // Detect press (rising edge)
        const justPressed = specialPressed && !this.specialKeyDown;
        const justReleased = !specialPressed && this.specialKeyDown;
        this.specialKeyDown = specialPressed;
        
        // Start charging on press
        if (justPressed && !this.isCharging) {
            this.startCharging();
        }
        
        // Update charge animation if charging
        if (this.isCharging) {
            this.updateCharging(deltaTime);
        }
        
        // Execute bash on release
        if (justReleased && this.isCharging) {
            this.executeBash();
        }
        
        // Update active bash
        if (this.wasm._is_bash_active && this.wasm._is_bash_active()) {
            this.updateActiveBash(deltaTime, gameState);
        }
        
        // Update animation
        this.bashAnimation.update(deltaTime);
    }
    
    /**
     * Start bash charging
     */
    startCharging() {
        // Call WASM to start charging
        if (this.wasm._start_charging_bash) {
            this.wasm._start_charging_bash();
        }
        
        this.isCharging = true;
        this.bashExecuted = false;
        
        // Start charge animation
        this.bashAnimation.startCharging();
    }
    
    /**
     * Update bash charging
     * @param {number} deltaTime - Time since last update
     */
    updateCharging(deltaTime) {
        // Get charge level from WASM
        const chargeLevel = this.wasm._get_bash_charge_level ? 
            this.wasm._get_bash_charge_level() : 0;
        
        // Update charge animation with current level
        this.bashAnimation.updateChargeLevel(chargeLevel, deltaTime);
    }
    
    /**
     * Execute bash on release
     */
    executeBash() {
        // Call WASM to release bash
        if (this.wasm._release_bash) {
            this.wasm._release_bash();
        }
        
        this.isCharging = false;
        this.bashExecuted = true;
        
        // Play bash execution animation
        this.bashAnimation.executeBash();
    }
    
    /**
     * Update active bash state
     * @param {number} deltaTime - Time since last update
     * @param {Object} gameState - Current game state
     */
    updateActiveBash(deltaTime, gameState) {
        // Get targets hit count
        const targetsHit = this.wasm._get_bash_targets_hit ? 
            this.wasm._get_bash_targets_hit() : 0;
        
        // Update bash animation with hit count
        this.bashAnimation.updateBashActive(targetsHit);
        
        // TODO: Query enemies for collision detection in JS
        // (Collision handled in WASM, but we can add VFX here)
    }
    
    /**
     * Render ability VFX
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        this.bashAnimation.render(ctx, camera);
    }
    
    /**
     * Check if ability can be used
     * @returns {boolean} Can use ability
     */
    canUse() {
        return this.wasm._can_bash ? this.wasm._can_bash() : true;
    }
}

/**
 * WardenBashAnimation - Visual effects for shoulder bash
 */
class WardenBashAnimation extends AbilityAnimationBase {
    constructor(animationSystem, vfxManager) {
        super(animationSystem, vfxManager);
        
        this.charging = false;
        this.chargeLevel = 0;
        this.chargeParticles = [];
        this.impactEffects = [];
    }
    
    /**
     * Start charging animation
     */
    startCharging() {
        this.charging = true;
        this.chargeLevel = 0;
        this.chargeParticles = [];
    }
    
    /**
     * Update charge level
     * @param {number} level - Charge level (0-1)
     * @param {number} deltaTime - Time delta
     */
    updateChargeLevel(level, deltaTime) {
        this.chargeLevel = level;
        
        // Spawn charge particles based on level
        if (level > 0.3) {
            this.spawnChargeParticles(level);
        }
        
        // Camera shake at max charge
        if (level >= 1.0 && this.vfx.camera) {
            this.vfx.camera.shake(0.5, 0.1);
        }
    }
    
    /**
     * Execute bash animation
     */
    executeBash() {
        this.charging = false;
        this.play('bash_execute', 0.6, false);
        
        // Spawn impact effect
        this.spawnImpactEffect();
        
        // Camera effects
        if (this.vfx.camera) {
            this.vfx.camera.shake(2.0, 0.3);
            this.vfx.camera.zoom(1.2, 0.1);
        }
    }
    
    /**
     * Update active bash
     * @param {number} targetsHit - Number of targets hit
     */
    updateBashActive(targetsHit) {
        // Spawn additional effects for each hit
        if (targetsHit > 0) {
            this.spawnHitEffect(targetsHit);
        }
    }
    
    /**
     * Spawn charge particles
     * @param {number} level - Charge level (0-1)
     */
    spawnChargeParticles(level) {
        // Implementation in Day 4
    }
    
    /**
     * Spawn impact effect
     */
    spawnImpactEffect() {
        // Implementation in Day 4
    }
    
    /**
     * Spawn hit effect
     * @param {number} count - Hit count
     */
    spawnHitEffect(count) {
        // Implementation in Day 4
    }
    
    /**
     * Render animation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        // Render charge particles
        this.chargeParticles.forEach(particle => {
            // Render particle (implementation in Day 4)
        });
        
        // Render impact effects
        this.impactEffects.forEach(effect => {
            // Render effect (implementation in Day 4)
        });
    }
    
    /**
     * Update animation
     * @param {number} deltaTime - Time delta
     */
    update(deltaTime) {
        const t = this.updateTiming(deltaTime);
        
        // Update charge particles
        this.chargeParticles = this.chargeParticles.filter(p => {
            p.lifetime -= deltaTime;
            return p.lifetime > 0;
        });
        
        // Update impact effects
        this.impactEffects = this.impactEffects.filter(e => {
            e.lifetime -= deltaTime;
            return e.lifetime > 0;
        });
    }
}
```

### Day 3 Deliverables:
- ✅ `ability-manager.js` created
- ✅ `ability-animation-base.js` created
- ✅ `warden-abilities.js` created
- ✅ Integration with existing game loop
- ✅ WASM bash functions connected
- ✅ Input handling functional

---

### Day 4: Visual Effects & Particles

#### 4. Ability Particles (`public/src/vfx/abilities/ability-particles.js`)

**Purpose**: Particle system for ability visual effects

```javascript
/**
 * AbilityParticleSystem - Particle effects for abilities
 * Manages:
 * - Particle spawning and lifecycle
 * - Physics simulation
 * - Rendering
 * - Performance optimization
 */

export class AbilityParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 1000;
        
        // Performance tracking
        this.particleCount = 0;
        this.renderTime = 0;
    }
    
    /**
     * Spawn charge particles
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} chargeLevel - Charge intensity (0-1)
     * @returns {Array} Spawned particles
     */
    spawnChargeParticles(x, y, chargeLevel) {
        const count = Math.floor(chargeLevel * 20);
        const newParticles = [];
        
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                break;
            }
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            const particle = {
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed * 0.01,
                vy: Math.sin(angle) * speed * 0.01 - 0.5,
                size: 2 + Math.random() * 3,
                color: this.getChargeColor(chargeLevel),
                alpha: 0.8,
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.8,
                type: 'charge'
            };
            
            this.particles.push(particle);
            newParticles.push(particle);
        }
        
        return newParticles;
    }
    
    /**
     * Get charge glow color based on level
     * @param {number} level - Charge level (0-1)
     * @returns {string} CSS color
     */
    getChargeColor(level) {
        // Orange to bright yellow as charge increases
        const hue = 30 + level * 30; // 30° (orange) to 60° (yellow)
        return `hsl(${hue}, 100%, 60%)`;
    }
    
    /**
     * Spawn impact shockwave
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} force - Impact force (affects size)
     * @returns {Object} Shockwave effect
     */
    spawnImpactShockwave(x, y, force) {
        const shockwave = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: 60 + force * 40,
            width: 6,
            color: '#ffaa00',
            alpha: 1.0,
            lifetime: 0.3,
            maxLifetime: 0.3,
            type: 'shockwave'
        };
        
        this.particles.push(shockwave);
        return shockwave;
    }
    
    /**
     * Spawn hit sparks
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} count - Number of sparks
     */
    spawnHitSparks(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                break;
            }
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            
            const spark = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * 0.01,
                vy: Math.sin(angle) * speed * 0.01,
                size: 3 + Math.random() * 2,
                color: '#ffff00',
                alpha: 1.0,
                lifetime: 0.3 + Math.random() * 0.2,
                maxLifetime: 0.5,
                gravity: 0.3,
                type: 'spark'
            };
            
            this.particles.push(spark);
        }
    }
    
    /**
     * Update all particles
     * @param {number} deltaTime - Time since last update (seconds)
     */
    update(deltaTime) {
        this.particleCount = this.particles.length;
        
        this.particles = this.particles.filter(particle => {
            // Update lifetime
            particle.lifetime -= deltaTime;
            if (particle.lifetime <= 0) {
                return false;
            }
            
            // Update based on type
            switch (particle.type) {
                case 'charge':
                case 'spark':
                    this.updatePhysicsParticle(particle, deltaTime);
                    break;
                case 'shockwave':
                    this.updateShockwave(particle, deltaTime);
                    break;
            }
            
            // Update alpha based on lifetime
            particle.alpha = particle.lifetime / particle.maxLifetime;
            
            return true;
        });
    }
    
    /**
     * Update physics-based particle
     * @param {Object} particle - Particle to update
     * @param {number} deltaTime - Time delta
     */
    updatePhysicsParticle(particle, deltaTime) {
        // Apply gravity if present
        if (particle.gravity) {
            particle.vy += particle.gravity * deltaTime;
        }
        
        // Update position
        particle.x += particle.vx * deltaTime * 60;
        particle.y += particle.vy * deltaTime * 60;
        
        // Apply drag
        particle.vx *= 0.98;
        particle.vy *= 0.98;
    }
    
    /**
     * Update shockwave effect
     * @param {Object} shockwave - Shockwave to update
     * @param {number} deltaTime - Time delta
     */
    updateShockwave(shockwave, deltaTime) {
        const progress = 1 - (shockwave.lifetime / shockwave.maxLifetime);
        shockwave.radius = shockwave.maxRadius * this.easeOutCubic(progress);
    }
    
    /**
     * Render all particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        const startTime = performance.now();
        
        ctx.save();
        
        this.particles.forEach(particle => {
            // Convert world to screen coordinates
            const screenX = (particle.x - camera.x) * camera.scale + camera.width / 2;
            const screenY = (particle.y - camera.y) * camera.scale + camera.height / 2;
            
            // Render based on type
            switch (particle.type) {
                case 'charge':
                case 'spark':
                    this.renderParticle(ctx, particle, screenX, screenY, camera.scale);
                    break;
                case 'shockwave':
                    this.renderShockwave(ctx, particle, screenX, screenY, camera.scale);
                    break;
            }
        });
        
        ctx.restore();
        
        this.renderTime = performance.now() - startTime;
    }
    
    /**
     * Render basic particle
     */
    renderParticle(ctx, particle, x, y, scale) {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render shockwave
     */
    renderShockwave(ctx, shockwave, x, y, scale) {
        ctx.globalAlpha = shockwave.alpha;
        ctx.strokeStyle = shockwave.color;
        ctx.lineWidth = shockwave.width * scale;
        ctx.beginPath();
        ctx.arc(x, y, shockwave.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
     * Ease out cubic
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            particleCount: this.particleCount,
            renderTime: this.renderTime
        };
    }
}
```

#### 5. Ability Camera Effects (`public/src/vfx/abilities/ability-camera-effects.js`)

**Purpose**: Camera shake, zoom, and motion blur for abilities

```javascript
/**
 * AbilityCameraEffects - Camera effects for abilities
 * Provides:
 * - Screen shake
 * - Zoom effects
 * - Motion blur (future)
 * - Slow motion (future)
 */

export class AbilityCameraEffects {
    constructor(camera) {
        this.camera = camera;
        
        // Shake state
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
        
        // Zoom state
        this.targetZoom = 1.0;
        this.zoomDuration = 0;
        this.zoomProgress = 0;
        this.originalZoom = 1.0;
    }
    
    /**
     * Add camera shake
     * @param {number} intensity - Shake strength (pixels)
     * @param {number} duration - Shake duration (seconds)
     */
    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }
    
    /**
     * Zoom camera
     * @param {number} targetZoom - Target zoom level
     * @param {number} duration - Zoom duration (seconds)
     */
    zoom(targetZoom, duration) {
        this.originalZoom = this.camera.scale;
        this.targetZoom = targetZoom;
        this.zoomDuration = duration;
        this.zoomProgress = 0;
    }
    
    /**
     * Update effects
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.updateShake(deltaTime);
        this.updateZoom(deltaTime);
    }
    
    /**
     * Update shake effect
     */
    updateShake(deltaTime) {
        if (this.shakeDuration <= 0) {
            this.shakeIntensity = 0;
            this.shakeOffset = { x: 0, y: 0 };
            return;
        }
        
        this.shakeDuration -= deltaTime;
        
        // Calculate shake offset
        const intensity = this.shakeIntensity * (this.shakeDuration / 0.3);
        this.shakeOffset.x = (Math.random() - 0.5) * 2 * intensity;
        this.shakeOffset.y = (Math.random() - 0.5) * 2 * intensity;
        
        // Apply to camera
        if (this.camera) {
            this.camera.shakeX = this.shakeOffset.x;
            this.camera.shakeY = this.shakeOffset.y;
        }
    }
    
    /**
     * Update zoom effect
     */
    updateZoom(deltaTime) {
        if (this.zoomProgress >= this.zoomDuration) {
            return;
        }
        
        this.zoomProgress += deltaTime;
        const t = Math.min(1.0, this.zoomProgress / this.zoomDuration);
        
        // Ease out zoom
        const easedT = 1 - Math.pow(1 - t, 3);
        const newZoom = this.originalZoom + (this.targetZoom - this.originalZoom) * easedT;
        
        if (this.camera) {
            this.camera.scale = newZoom;
        }
    }
    
    /**
     * Reset all effects
     */
    reset() {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.zoomProgress = this.zoomDuration;
    }
}
```

#### Complete WardenBashAnimation Implementation

Update `warden-abilities.js` with full VFX implementation:

```javascript
/**
 * WardenBashAnimation - Complete implementation with VFX
 */
class WardenBashAnimation extends AbilityAnimationBase {
    constructor(animationSystem, vfxManager) {
        super(animationSystem, vfxManager);
        
        this.charging = false;
        this.chargeLevel = 0;
        this.particleSystem = vfxManager.particles;
        this.cameraEffects = vfxManager.camera;
        
        // Glow effect
        this.chargeGlow = {
            radius: 0,
            alpha: 0
        };
    }
    
    /**
     * Spawn charge particles
     */
    spawnChargeParticles(level) {
        // Get player position from WASM
        const playerX = this.wasm?._get_x ? this.wasm._get_x() : 0;
        const playerY = this.wasm?._get_y ? this.wasm._get_y() : 0;
        
        this.particleSystem.spawnChargeParticles(playerX, playerY, level);
        
        // Update glow effect
        this.chargeGlow.radius = 30 * level;
        this.chargeGlow.alpha = level * 0.5;
    }
    
    /**
     * Spawn impact effect
     */
    spawnImpactEffect() {
        const playerX = this.wasm?._get_x ? this.wasm._get_x() : 0;
        const playerY = this.wasm?._get_y ? this.wasm._get_y() : 0;
        
        // Get charge level for impact force
        const force = this.chargeLevel;
        
        // Spawn shockwave
        this.particleSystem.spawnImpactShockwave(playerX, playerY, force);
        
        // Spawn sparks
        this.particleSystem.spawnHitSparks(playerX, playerY, 20);
        
        // Camera effects
        this.cameraEffects?.shake(3.0 * force, 0.3);
        this.cameraEffects?.zoom(1.2, 0.1);
        
        // Reset zoom after delay
        setTimeout(() => {
            this.cameraEffects?.zoom(1.0, 0.3);
        }, 100);
    }
    
    /**
     * Spawn hit effect for each target
     */
    spawnHitEffect(count) {
        // Additional effects for multi-hit
        if (count > 1) {
            this.cameraEffects?.shake(1.5, 0.2);
        }
    }
    
    /**
     * Render charge glow
     */
    renderChargeGlow(ctx, camera) {
        if (this.chargeGlow.alpha <= 0) {
            return;
        }
        
        const playerX = this.wasm?._get_x ? this.wasm._get_x() : 0;
        const playerY = this.wasm?._get_y ? this.wasm._get_y() : 0;
        
        // Convert to screen coordinates
        const screenX = (playerX - camera.x) * camera.scale + camera.width / 2;
        const screenY = (playerY - camera.y) * camera.scale + camera.height / 2;
        
        // Draw glow
        ctx.save();
        ctx.globalAlpha = this.chargeGlow.alpha;
        ctx.fillStyle = '#ffaa00';
        ctx.filter = 'blur(10px)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.chargeGlow.radius * camera.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    /**
     * Render animation
     */
    render(ctx, camera) {
        // Render charge glow
        if (this.charging) {
            this.renderChargeGlow(ctx, camera);
        }
    }
}
```

### Day 4 Deliverables:
- ✅ `ability-particles.js` created
- ✅ `ability-camera-effects.js` created
- ✅ Complete WardenBashAnimation implementation
- ✅ Charge particles working
- ✅ Impact shockwave working
- ✅ Camera shake/zoom working

---

### Day 5: Demo & Polish

#### 6. Bash Demo Page (`public/demo/abilities/bash-demo.html`)

**Purpose**: Standalone test page for shoulder bash

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warden Shoulder Bash Demo</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background: #1a1a1a;
            color: #fff;
            overflow: hidden;
        }
        
        canvas {
            display: block;
            background: linear-gradient(to bottom, #2c3e50, #34495e);
        }
        
        .ui-overlay {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .charge-bar {
            width: 200px;
            height: 30px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .charge-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff6600, #ffaa00);
            width: 0%;
            transition: width 0.05s;
        }
        
        .controls {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 8px;
        }
        
        .key-hint {
            display: inline-block;
            background: #333;
            padding: 5px 10px;
            border-radius: 4px;
            margin: 5px;
            font-weight: bold;
        }
        
        .metrics {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    
    <div class="ui-overlay">
        <h2>🛡️ Warden Shoulder Bash</h2>
        <div>Status: <span id="status">Ready</span></div>
        <div>Charge: <span id="chargeLevel">0%</span></div>
        <div class="charge-bar">
            <div class="charge-fill" id="chargeFill"></div>
        </div>
        <div style="margin-top: 10px;">
            Targets Hit: <span id="targetsHit">0</span>
        </div>
    </div>
    
    <div class="controls">
        <div><span class="key-hint">E</span> Hold to Charge Bash</div>
        <div><span class="key-hint">WASD</span> Move</div>
        <div><span class="key-hint">R</span> Reset Demo</div>
    </div>
    
    <div class="metrics">
        <div>FPS: <span id="fps">60</span></div>
        <div>Particles: <span id="particles">0</span></div>
        <div>Update: <span id="updateTime">0.0ms</span></div>
        <div>Render: <span id="renderTime">0.0ms</span></div>
    </div>
    
    <script type="module">
        import { AbilityManager } from '../../src/game/abilities/ability-manager.js';
        import { WardenAbilities } from '../../src/game/abilities/warden-abilities.js';
        import { AbilityParticleSystem } from '../../src/vfx/abilities/ability-particles.js';
        import { AbilityCameraEffects } from '../../src/vfx/abilities/ability-camera-effects.js';
        import { CharacterAnimator } from '../../src/animation/system/animation-system.js';
        
        // Canvas setup
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Camera
        const camera = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            scale: 1.0,
            shakeX: 0,
            shakeY: 0
        };
        
        // Mock WASM module
        let bashChargeLevel = 0;
        let bashActive = false;
        let bashCharging = false;
        let bashTargets = 0;
        
        const mockWasm = {
            _start_charging_bash: () => {
                bashCharging = true;
                bashChargeLevel = 0;
            },
            _release_bash: () => {
                if (bashChargeLevel >= 0.3) {
                    bashActive = true;
                    bashCharging = false;
                    setTimeout(() => {
                        bashActive = false;
                        bashTargets = Math.floor(Math.random() * 3) + 1;
                    }, 600);
                }
            },
            _get_bash_charge_level: () => bashChargeLevel,
            _is_bash_active: () => bashActive ? 1 : 0,
            _is_bash_charging: () => bashCharging ? 1 : 0,
            _get_bash_targets_hit: () => bashTargets,
            _can_bash: () => true,
            _get_x: () => 0,
            _get_y: () => 0
        };
        
        // Systems
        const particles = new AbilityParticleSystem();
        const cameraEffects = new AbilityCameraEffects(camera);
        const animator = new CharacterAnimator();
        
        const vfxManager = {
            particles: particles,
            camera: cameraEffects
        };
        
        const abilityManager = new AbilityManager(mockWasm, animator, vfxManager);
        const wardenAbilities = new WardenAbilities(mockWasm, animator, vfxManager);
        abilityManager.registerAbility('warden', wardenAbilities);
        abilityManager.setActiveCharacter('warden');
        
        // Input
        const keys = {};
        window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
        
        // Reset
        window.addEventListener('keydown', e => {
            if (e.key.toLowerCase() === 'r') {
                bashChargeLevel = 0;
                bashActive = false;
                bashCharging = false;
                bashTargets = 0;
                particles.clear();
                cameraEffects.reset();
            }
        });
        
        // UI updates
        function updateUI() {
            document.getElementById('status').textContent = 
                bashActive ? 'BASHING!' :
                bashCharging ? 'Charging...' : 'Ready';
            
            document.getElementById('chargeLevel').textContent = 
                Math.floor(bashChargeLevel * 100) + '%';
            
            document.getElementById('chargeFill').style.width = 
                (bashChargeLevel * 100) + '%';
            
            document.getElementById('targetsHit').textContent = bashTargets;
        }
        
        // Game loop
        let lastTime = performance.now();
        let fpsCounter = 0;
        let fpsTime = 0;
        
        function gameLoop(currentTime) {
            const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
            lastTime = currentTime;
            
            // FPS counter
            fpsCounter++;
            fpsTime += deltaTime;
            if (fpsTime >= 1.0) {
                document.getElementById('fps').textContent = fpsCounter;
                fpsCounter = 0;
                fpsTime = 0;
            }
            
            // Update charge level (mock)
            if (bashCharging) {
                bashChargeLevel = Math.min(1.0, bashChargeLevel + deltaTime);
            }
            
            // Update systems
            const updateStart = performance.now();
            const input = {
                special: keys.e || false,
                keys: keys
            };
            abilityManager.update(deltaTime, input, {});
            particles.update(deltaTime);
            cameraEffects.update(deltaTime);
            const updateTime = performance.now() - updateStart;
            
            // Render
            const renderStart = performance.now();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#34495e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw player (simple circle)
            ctx.save();
            ctx.translate(camera.shakeX, camera.shakeY);
            ctx.fillStyle = bashCharging ? '#ffaa00' : '#00ff88';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Render particles
            particles.render(ctx, camera);
            
            // Render abilities
            abilityManager.render(ctx, camera);
            
            const renderTime = performance.now() - renderStart;
            
            // Update metrics
            document.getElementById('particles').textContent = particles.particleCount;
            document.getElementById('updateTime').textContent = updateTime.toFixed(2) + 'ms';
            document.getElementById('renderTime').textContent = renderTime.toFixed(2) + 'ms';
            
            // Update UI
            updateUI();
            
            requestAnimationFrame(gameLoop);
        }
        
        // Start
        requestAnimationFrame(gameLoop);
        
        // Resize handler
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            camera.width = canvas.width;
            camera.height = canvas.height;
        });
    </script>
</body>
</html>
```

### Day 5 Deliverables:
- ✅ `bash-demo.html` complete
- ✅ UI overlay with charge meter
- ✅ Performance metrics display
- ✅ Standalone testing functional
- ✅ Documentation updated

---

## 🎯 Success Criteria

### Week 1 Complete When:
- [ ] Player can hold E to charge bash
- [ ] Charge particles appear and scale with charge level
- [ ] Charge glow effect visible
- [ ] Release E executes bash with shockwave
- [ ] Camera shakes on impact
- [ ] Demo page fully functional
- [ ] 60 FPS maintained on desktop
- [ ] No linter errors
- [ ] All WASM exports connected

### Performance Targets:
- Update time: < 2ms per frame
- Particle render: < 1ms with 100+ particles
- No memory leaks
- Smooth 60 FPS

---

## 📊 Next Weeks (Weeks 2-3)

### Week 2: Raider Charge
Follow same structure:
- Day 6-7: Create `raider-abilities.js` + animation base
- Day 8-9: Speed lines, aura effects, trail particles
- Day 10: `charge-demo.html` + polish

### Week 3: Kensei Dash
Follow same structure:
- Day 11-12: Create `kensei-abilities.js` + animation base
- Day 13-14: Motion blur, afterimages, slash effects
- Day 15: `dash-demo.html` + polish

---

## 🔧 Integration with Existing Systems

### CharacterAnimator Integration
```javascript
// In main game loop, check ability state
if (wasmModule._is_bash_charging()) {
    characterAnimator.setAnimState(12); // chargingAttack state
} else if (wasmModule._is_bash_active()) {
    characterAnimator.setAnimState(2); // attacking state
}
```

### Particle System Integration
```javascript
// Abilities use dedicated particle system
// Main game particles remain separate
const gameParticles = new ParticleSystem();
const abilityParticles = new AbilityParticleSystem();
```

### Camera Integration
```javascript
// Ability camera effects apply to main camera
const mainCamera = gameRenderer.camera;
const abilityCamera = new AbilityCameraEffects(mainCamera);
```

---

## 📚 Related Documentation

- [Week 1 Progress](./WEEK1_PROGRESS.md) - Current implementation status
- [Player Ability Plan](./PLAYER_ABILITY_UPGRADE_PLAN.md) - Full 8-week roadmap
- [Animation System](../../ANIMATION/ANIMATION_SYSTEM_INDEX.md) - Core animation docs
- [Player Animations](../../ANIMATION/PLAYER_ANIMATIONS.md) - Existing player animation
- [WASM API](../../API.md) - WASM function reference

---

## 🎓 Architecture Notes

### WASM-First Principles ✅
- All ability **logic** in WASM (charging, timing, damage)
- JavaScript handles **visual only** (particles, camera, rendering)
- Deterministic execution maintained
- Multiplayer-safe

### File Organization ✅
- Max 500 lines per file
- Single responsibility (animation separate from logic)
- Clear separation: abilities/ animation/ vfx/
- Demo pages in demo/abilities/

### Performance ✅
- Particle pooling (max 1000)
- Efficient rendering (batch draws)
- Performance metrics tracked
- 60 FPS target maintained

---

**Status**: ✅ **READY FOR WEEK 1 DAYS 3-5**  
**Estimated Time**: 12-15 hours  
**Priority**: HIGH - Foundation for all ability animations

---

*This plan builds on the completed WASM foundation and provides a clear path to visual implementation while maintaining architectural principles.*

