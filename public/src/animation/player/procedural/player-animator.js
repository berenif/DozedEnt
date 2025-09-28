// Enhanced Player with Animation System Integration
// Provides a complete player character with roll, attack, block, and hurt animations

import { CharacterAnimator, AnimationPresets } from '../../system/animation-system.js'
import PlayerProceduralAnimator from './player-procedural-animator.js'
// SoundSystem and ParticleSystem imports removed - not used in this file

export class AnimatedPlayer {
    constructor(x = 400, y = 300, options = {}) {
        // Position - driven by WASM (normalized 0-1 coordinates)
        this.x = x
        this.y = y
        this.facing = 1 // 1 for right, -1 for left
        
        // Player stats - WASM will manage the core stats
        this.health = options.health || 100
        this.maxHealth = options.maxHealth || 100
        this.stamina = options.stamina || 100
        this.maxStamina = options.maxStamina || 100
        this._cachedHealth = this.health
        this._cachedStamina = this.stamina
        this.speed = options.speed || 250 // Base speed, actual speed is WASM-driven
        this.rollSpeed = options.rollSpeed || 500 // Base roll speed, actual speed is WASM-driven
        
        // State management - now primarily WASM-driven, this is for JS animation state
        this.state = 'idle' // idle, running, attacking, blocking, rolling, hurt, dead, jumping, doubleJumping, landing, wallSliding, dashing, chargingAttack
        this.previousState = 'idle'
        this.stateTimer = 0 // Managed by WASM now for core actions
        this.stateTime = 0 // Managed by WASM now
        this.stateDuration = 0 // Managed by WASM now
        this._prevNormTime = 0 // Managed by WASM now
        this._comboQueued = false // Logic related to combos will move to WASM
        this._currentAttackType = 'light' // Managed by WASM now
        this.invulnerable = false // Managed by WASM
        this.invulnerabilityTimer = 0 // Managed by WASM
        this.isGrounded = true // Driven by WASM
        this.jumpCount = 0 // Driven by WASM
        this.nearWall = false // Will be WASM-driven or removed
        this.dashCooldown = 0 // Will be WASM-driven or removed
        this.chargeTime = 0 // Will be WASM-driven or removed
        this.maxChargeTime = 1.5 // Will be WASM-driven or removed

        // Deterministic animation/event parameters - these are mostly cues for animation
        this.params = {
            roll: {
                duration: 0.4,
                iFrameStart: 0.08,
                iFrameEnd: 0.36,
                staminaCost: 25,
                cooldown: 0.8
            },
            attackLight: {
                duration: 0.4,
                activeStart: 0.28,
                activeEnd: 0.38,
                staminaCost: 12,
                cooldown: 0.5
            },
            attackHeavy: {
                duration: 0.62,
                activeStart: 0.32,
                activeEnd: 0.48,
                staminaCost: 24,
                cooldown: 0.8
            },
            comboWindow: { start: 0.55, end: 0.75 },
            parry: { duration: 0.22, window: 0.18, staminaCost: 10 }
        }
        
        // Animation system
        this.animator = new CharacterAnimator()
        this.animations = AnimationPresets.createPlayerAnimations()
        this.setupAnimations()
        
        // Player procedural animation orchestrator
        const proceduralOptions = options.proceduralOptions || options.proceduralConfig || options.proceduralModules || {}
        this.proceduralAnimator = new PlayerProceduralAnimator(proceduralOptions)
        
        // Action cooldowns - now WASM-driven
        this.attackCooldown = 0
        this.rollCooldown = 0
        this.blockHeld = false // WASM will manage the actual block state
        
        // Visual properties
        this.width = options.width || 32
        this.height = options.height || 32
        this.color = options.color || '#00ff88'
        this.sprite = options.sprite || null

        // Load sprite sheet if not provided
        if (!this.sprite) {
            this.loadSpriteSheet()
        }
        
        // Effects
        this.particleSystem = options.particleSystem || null
        this.soundSystem = options.soundSystem || null
        
        // Combat properties - now WASM-driven
        this.attackDamage = options.attackDamage || 20
        this.attackDamageHeavy = options.attackDamageHeavy || 35
        this.attackRange = options.attackRange || 60
        this.attackRangeHeavy = options.attackRangeHeavy || 80
        this.blockDamageReduction = options.blockDamageReduction || 0.5

        // Locomotion cadence and footsteps - these will be driven by WASM velocity feedback
        this.stridePhase = 0
        this.gaitRate = 1.4
        this._lastFootFlag = 0 // 0 left, 1 right alternating
        this.footstepIntervalBase = 0.28

        // Minimal IK proxy values (pelvis bob and foot locks for readability) - driven by WASM
        this.ik = {
            pelvisY: 0,
            pelvisRate: 10,
            left: { locked: false, y: 0 },
            right: { locked: false, y: 0 },
            stepHeight: 2
        }

        // Debug flag
        this.debugMode = false

        // Optional WASM module injection support for testing/integration
        try {
            if (options.wasmModule && !globalThis.wasmExports) {
                globalThis.wasmExports = options.wasmModule
            }
        } catch {
            // Ignore WASM module loading errors - fallback handling elsewhere
        }
    }

    loadSpriteSheet() {
        // Try to load sprite sheet with multiple possible paths
        this.sprite = new Image()
        
        // Try different possible paths based on where the demo is running from
        const possiblePaths = [
            './src/images/player-sprites.png',  // From demos/ directory
            '../src/images/player-sprites.png', // From public/ directory
            '../../src/images/player-sprites.png' // From deeper nested directories
        ]
        
        let currentPathIndex = 0
        
        const tryNextPath = () => {
            if (currentPathIndex < possiblePaths.length) {
                this.sprite.src = possiblePaths[currentPathIndex]
                currentPathIndex++
            } else {
                console.warn('Player sprite sheet not found at any expected location, using fallback rendering')
                console.log('To fix this: Run "node scripts/generate-sprite-sheet.js" or use create-sprite-sheet.html')
                this.sprite = null
            }
        }

        this.sprite.onload = () => {
            console.log(`Player sprite sheet loaded successfully from ${this.sprite.src}`)
        }

        this.sprite.onerror = () => {
            console.warn(`Player sprite sheet not found at ${this.sprite.src}, trying next path...`)
            tryNextPath()
        }
        
        // Start with the first path
        tryNextPath()
    }
    
    setupAnimations() {
        // Add all animations to the controller
        Object.entries(this.animations).forEach(([name, animation]) => {
            this.animator.addAnimation(name, animation)
        })
        
        // Start with idle animation
        this.animator.play('idle')
    }
    
    update(deltaTime, input = {}) {
        // Update timers - WASM manages core game timers
        this._prevNormTime = this.getNormalizedTime()
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime)
        this.rollCooldown = Math.max(0, this.rollCooldown - deltaTime)
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime // WASM manages invulnerability timer
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false
            }
        }
        
        // Handle state transitions
        // this.handleStateTransitions(input) // WASM now handles state transitions
        
        // Update based on current state
        // this.updateState(deltaTime, input) // WASM now handles state updates

        // Deterministic state event windows (hitboxes, i-frames)
        // this.applyStateEvents() // WASM now handles state events
        
        // Update simple IK before composing overlay
        this.updateIK(deltaTime)

        // 1. Forward inputs to WASM - 5-button combat system
        // Only send to WASM if not being managed externally (e.g., by GameStateManager)
        if (!globalThis.wasmInputManagedExternally) {
            let inputX = 0; let inputY = 0
            if (input.left) {inputX -= 1}
            if (input.right) {inputX += 1}
            if (input.up) {inputY -= 1}
            if (input.down) {inputY += 1}
            
            // New 5-button combat system: A1(light), A2(heavy), Block, Roll, Special
            globalThis.wasmExports?.set_player_input?.(
                inputX, inputY, 
                input.roll ? 1 : 0, 
                input.jump ? 1 : 0, 
                input.lightAttack ? 1 : 0, 
                input.heavyAttack ? 1 : 0, 
                input.block ? 1 : 0, 
                input.special ? 1 : 0
            )
        }

        // 2. Read state for rendering
        // Assuming 800x600 canvas for now. Convert WASM's 0-1 range to world coordinates.
        // The game-renderer.js is responsible for this scaling when passing player position to render.
        // For now, we'll directly set x and y, and let the renderer handle scaling.
        // WASM provides normalized coordinates; guard against NaN/Infinity
        const rx = globalThis.wasmExports?.get_x?.()
        const ry = globalThis.wasmExports?.get_y?.()
        
        // Debug logging for WASM position updates
        if (typeof rx === 'number' && typeof ry === 'number' && (rx !== 0.5 || ry !== 0.5)) {
            console.log('WASM position update:', rx, ry);
        }
        
        // Debug logging for NaN values
        if (typeof rx !== 'number' || typeof ry !== 'number' || !Number.isFinite(rx) || !Number.isFinite(ry)) {
            console.warn('WASM position returned invalid values:', { rx, ry, typeX: typeof rx, typeY: typeof ry });
            console.warn('WASM exports available:', !!globalThis.wasmExports);
            if (globalThis.wasmExports) {
                console.warn('WASM get_x function:', typeof globalThis.wasmExports.get_x);
                console.warn('WASM get_y function:', typeof globalThis.wasmExports.get_y);
            }
        }
        
        this.x = (typeof rx === 'number' && Number.isFinite(rx)) ? rx : 0.5
        this.y = (typeof ry === 'number' && Number.isFinite(ry)) ? ry : 0.5

        this.isGrounded = (globalThis.wasmExports?.get_is_grounded?.() === 1);
        this.jumpCount = globalThis.wasmExports?.get_jump_count?.();

        // Update animation system and cache transform
        // WASM will determine facing direction implicitly from movement and actions
        // Infer facing from velocity if available; preserve when nearly still
        const fx = globalThis.wasmExports?.get_vel_x?.()
        const fy = globalThis.wasmExports?.get_vel_y?.()
        if (typeof fx === 'number' && typeof fy === 'number') {
            const speed = Math.hypot(fx, fy)
            if (speed > 0.001) {
                this.facing = fx >= 0 ? 1 : -1
            }
        }

        if (this.animator && typeof this.animator.setFacing === 'function') {
            this.animator.setFacing(this.facing >= 0 ? 'right' : 'left')
        }
        // Query WASM overlay values if available
        const wx = (globalThis.wasmExports?.get_anim_offset_x?.() ?? 0)
        const wy = (globalThis.wasmExports?.get_anim_offset_y?.() ?? 0)
        const wsx = (globalThis.wasmExports?.get_anim_scale_x?.() ?? 1)
        const wsy = (globalThis.wasmExports?.get_anim_scale_y?.() ?? 1)
        const wrot = (globalThis.wasmExports?.get_anim_rotation?.() ?? 0)
        const wpelvis = (globalThis.wasmExports?.get_anim_pelvis_y?.() ?? 0)
        
        // Get the animation state from WASM and set it in the CharacterAnimator
        const wasmAnimState = globalThis.wasmExports?.get_player_anim_state?.()
        if (typeof wasmAnimState === 'number') {
            this.setState(this.getAnimStateName(wasmAnimState), true) // Pass true to indicate WASM-driven state
        }

        const velocityX = Number.isFinite(fx) ? fx : 0
        const velocityY = Number.isFinite(fy) ? fy : 0

        const baseTransform = this.animator.update(
            deltaTime,
            { x: this.x, y: this.y },
            { x: velocityX, y: velocityY },
            this.isGrounded
        ) || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 }

        const overlay = (globalThis.wasmExports && typeof wx === 'number') ? {
            scaleX: wsx,
            scaleY: wsy,
            rotation: wrot,
            offsetX: wx,
            offsetY: wy
        } : this.computePoseOverlay(input)

        const legLiftLeft = globalThis.wasmExports?.get_anim_leg_lift_left?.() ?? 0
        const legLiftRight = globalThis.wasmExports?.get_anim_leg_lift_right?.() ?? 0
        const breathing = globalThis.wasmExports?.get_anim_breathing_intensity?.() ?? 1
        const fatigue = globalThis.wasmExports?.get_anim_fatigue_factor?.() ?? 0
        const windResponse = globalThis.wasmExports?.get_anim_wind_response?.() ?? 0
        const groundAdapt = globalThis.wasmExports?.get_anim_ground_adapt?.() ?? 0
        const temperatureShiver = globalThis.wasmExports?.get_anim_temperature_shiver?.() ?? 0
        const clothSway = globalThis.wasmExports?.get_anim_cloth_sway?.() ?? 0
        const hairBounce = globalThis.wasmExports?.get_anim_hair_bounce?.() ?? 0
        const equipmentJiggle = globalThis.wasmExports?.get_anim_equipment_jiggle?.() ?? 0
        const momentumX = globalThis.wasmExports?.get_anim_momentum_x?.() ?? velocityX
        const momentumY = globalThis.wasmExports?.get_anim_momentum_y?.() ?? velocityY

        const normalizedTime = this.getNormalizedTime()

        const currentHealth = globalThis.wasmExports?.get_hp?.() ?? globalThis.wasmExports?.get_health?.() ?? this.health
        const currentStamina = globalThis.wasmExports?.get_stamina?.() ?? this.stamina
        this._cachedHealth = currentHealth
        this._cachedStamina = currentStamina

        const proceduralTransform = this.proceduralAnimator.update(deltaTime, {
            playerState: this.state,
            facing: this.facing,
            velocity: { x: velocityX, y: velocityY },
            momentum: { x: momentumX, y: momentumY },
            normalizedTime,
            isGrounded: this.isGrounded,
            pelvisOffset: wpelvis,
            breathing,
            fatigue,
            legLiftLeft,
            legLiftRight,
            groundOffset: groundAdapt,
            wind: windResponse,
            temperatureShiver,
            clothSway,
            hairBounce,
            equipmentJiggle,
            staminaRatio: this.maxStamina ? currentStamina / this.maxStamina : 1,
            healthRatio: this.maxHealth ? currentHealth / this.maxHealth : 1,
            attackStrength: this._currentAttackType === 'heavy' ? 1.35 : 1,
            attackType: this._currentAttackType,
            inputState: input,
            maxSpeed: this.speed,
            stridePhase: this.stridePhase,
            overlay
        })

        this.currentTransform = {
            scaleX: baseTransform.scaleX * (proceduralTransform.scaleX ?? 1),
            scaleY: baseTransform.scaleY * (proceduralTransform.scaleY ?? 1),
            rotation: baseTransform.rotation + (proceduralTransform.rotation ?? 0),
            offsetX: baseTransform.offsetX + (proceduralTransform.offsetX ?? 0),
            offsetY: baseTransform.offsetY + (proceduralTransform.offsetY ?? 0),
            trails: baseTransform.trails || [],
            skeleton: proceduralTransform.skeleton,
            secondaryMotion: proceduralTransform.secondaryMotion,
            environmental: proceduralTransform.environmental,
            debug: proceduralTransform.debug
        }
        
        // Physics handled by WASM

        // Stamina regeneration handled by WASM
    }

    // Returns a normalized [0,1] progress for the current player action/animation
    // Prefer authoritative WASM timers; fallback to current animation controller progress
    getNormalizedTime() {
        try {
            // If WASM provides an explicit attack state machine, derive normalized phase
            const get = (fn) => (typeof globalThis.wasmExports?.[fn] === 'function') ? globalThis.wasmExports[fn]() : void 0
            const attackState = get('get_attack_state') // 0 Idle, 1 Windup, 2 Active, 3 Recovery
            const stateStartTime = get('get_attack_state_time')
            const now = get('get_time_seconds')
            if (typeof attackState === 'number' && typeof stateStartTime === 'number' && typeof now === 'number') {
                const elapsed = Math.max(0, now - stateStartTime)
                let duration = 0
                if (attackState === 1) {duration = get('get_attack_windup_sec') ?? this.params.attackLight.duration}
                else if (attackState === 2) {duration = get('get_attack_active_sec') ?? this.params.attackLight.duration}
                else if (attackState === 3) {duration = get('get_attack_recovery_sec') ?? this.params.attackLight.duration}
                if (duration && duration > 0) {
                    return Math.max(0, Math.min(1, elapsed / duration))
                }
            }

            // Rolling phase if available
            const isRolling = get('get_is_rolling')
            if (isRolling === 1) {
                const rollDur = get('get_roll_duration') || this.params.roll.duration
                const playerStateTimer = get('get_player_state_timer')
                if (typeof playerStateTimer === 'number' && rollDur > 0) {
                    return Math.max(0, Math.min(1, playerStateTimer / rollDur))
                }
            }

            // Generic state timer normalization when duration is known locally
            const playerStateTimer = get('get_player_state_timer')
            if (typeof playerStateTimer === 'number') {
                let duration = 0
                switch (this.state) {
                    case 'rolling': duration = this.params.roll.duration; break
                    case 'attacking':
                        duration = this._currentAttackType === 'heavy' ? this.params.attackHeavy.duration : this.params.attackLight.duration
                        break
                    default:
                        duration = 0
                }
                if (duration > 0) {
                    return Math.max(0, Math.min(1, playerStateTimer / duration))
                }
            }
        } catch {
            // Ignore WASM timing errors - fallback to animation controller
        }

        // Fallback: use current animation controller progress
        try {
            const anim = this.animator?.controller?.currentAnimation
            if (anim && Array.isArray(anim.frames) && anim.frames.length > 1) {
                // Use frame index over total as coarse progress
                const coarse = anim.currentFrame / (anim.frames.length - 1)
                return Math.max(0, Math.min(1, coarse))
            }
        } catch {
            // Ignore animation controller errors - return default
        }

        return 0
    }

    startRoll(input) {
        // Trigger WASM roll action and handle visual/audio effects
        if (!globalThis.wasmExports?.on_roll_start?.()) {
            // WASM determined roll could not start (e.g., stamina, cooldown)
            return;
        }

        // Determine roll direction for local effects and WASM input
        let dirX = 0; let dirY = 0
        
        if (input.left) {dirX -= 1}
        if (input.right) {dirX += 1}
        if (input.up) {dirY -= 1}
        if (input.down) {dirY += 1}
        
        // If no direction input, roll in facing direction
        if (dirX === 0 && dirY === 0) {
            dirX = this.facing
        }
        
        // Normalize direction
        const length = Math.hypot(dirX, dirY)
        if (length > 0) {
            dirX /= length
            dirY /= length
        }
        
        this.rollDirection = { x: dirX, y: dirY }
        // Visual and audio effects only - core logic handled by WASM
        
        // Create roll effect
        if (this.particleSystem) {
            this.particleSystem.createDustCloud(this.x, this.y)
        }
        
        // Play roll sound
        if (this.soundSystem) {
            this.soundSystem.play('roll')
        }
    }
    
    startAttack(type = 'light') {
        // Trigger WASM attack action and handle visual/audio effects
        const p = type === 'heavy' ? this.params.attackHeavy : this.params.attackLight
        this._currentAttackType = type

        if (!globalThis.wasmExports?.on_attack?.(type === 'heavy' ? 1 : 0)) {
            // WASM determined attack could not start (e.g., stamina, cooldown)
            return;
        }
        
        // Play attack sound
        if (this.soundSystem) {
            this.soundSystem.play('attack')
        }
    }

    // Public input API helpers
    queueAttack(type = 'light') {
        // This logic is now handled in WASM
        if (this.canAttack()) { // This check will still use local state, but the actual decision is WASM's
            this.startAttack(type)
        } else if (this.state === 'attacking') {
            // This combo queuing needs to be moved to WASM if it affects gameplay
            this._comboQueued = true
        }
    }

    tryRoll(dir = null) {
        // dir: {x,y} optional; if absent uses current input/facing via startRoll caller
        // This logic is now handled by WASM, just call startRoll
        const input = {}
        if (dir && (dir.x || dir.y)) {
            input.left = dir.x < -0.5
            input.right = dir.x > 0.5
            input.up = dir.y < -0.5
            input.down = dir.y > 0.5
        }
        this.startRoll(input);
    }

    tryParry() {
        // Parry logic is now handled in WASM
        if (this.state === 'dead') { return }
        // Stamina check is now done in WASM
        // if (this.stamina < this.params.parry.staminaCost) { return }
        // Enter a brief blocking-like state with a success window; integrate with combat later
        // this.setState('blocking') // State is WASM-driven
        // this.stateTimer = this.params.parry.duration // State timing is WASM-driven
        // this.stateTime = 0 // State timing is WASM-driven
        // this.stateDuration = this.params.parry.duration // State timing is WASM-driven
        // this.stamina -= this.params.parry.staminaCost // Stamina cost is WASM-driven
        if (!globalThis.wasmExports?.on_parry?.()) { // Assuming a new WASM on_parry function
            return; // Parry failed in WASM
        }
        // Optional sfx
        if (this.soundSystem) { this.soundSystem.play('parry') }
    }
    
    executeAttack() {
        // This method will be simplified as WASM handles attack logic.
        // It will primarily be for visual effects and returning hit data for JS enemies.
        const isHeavy = this._currentAttackType === 'heavy'
        const range = isHeavy ? this.attackRangeHeavy : this.attackRange
        const damage = isHeavy ? this.attackDamageHeavy : this.attackDamage
        const hitboxX = this.x + (this.facing * range / 2)
        const hitboxY = this.y
        
        // Create attack effect
        if (this.particleSystem) {
            if (isHeavy) {
                this.particleSystem.createChargedSlash?.(hitboxX, hitboxY, this.facing, 1)
            } else {
                this.particleSystem.createSlashEffect(hitboxX, hitboxY, this.facing)
            }
        }
        
        // Return attack hitbox for collision detection (for JS-managed enemies)
        return {
            x: hitboxX,
            y: hitboxY,
            width: range,
            height: this.height,
            damage: damage
        }
    }
    
    startBlock() {
        // This function now primarily triggers the WASM block action and handles local effects
        if (!globalThis.wasmExports?.set_blocking?.(1, this.facing, 0)) {
            return; // Block failed in WASM (e.g., stamina)
        }
        // this.setState('blocking') // State is WASM-driven
        this.blockHeld = true
        
        // Create block effect
        if (this.particleSystem) {
            this.particleSystem.createShieldEffect(this.x, this.y)
        }
        
        // Play block sound
        if (this.soundSystem) {
            this.soundSystem.play('block')
        }
    }
    
    stopBlock() {
        // This function now primarily triggers the WASM block action
        globalThis.wasmExports?.set_blocking?.(0, this.facing, 0);
        // this.setState('idle') // State is WASM-driven
        this.blockHeld = false
    }
    
    takeDamage(damage, knockbackX = 0, knockbackY = 0) {
        // Damage calculation is now primarily WASM-driven
        // This function will be simplified or removed if WASM handles all damage and effects
        if (this.invulnerable || this.state === 'dead') {return false} // Invulnerable state is WASM-driven

        const actualDamage = damage
        
        // Reduce damage if blocking - WASM handles this logic
        if (this.state === 'blocking') {
            // actualDamage *= this.blockDamageReduction
            
            // Create block impact effect
            if (this.particleSystem) {
                this.particleSystem.createBlockImpact(this.x, this.y)
            }
            
            // Play block impact sound
            if (this.soundSystem) {
                this.soundSystem.play('blockImpact')
            }
        } else {
            // Not blocking, take full damage - visual/audio effects only
            if (this.particleSystem) {
                this.particleSystem.createBloodEffect(this.x, this.y)
            }

            if (this.soundSystem) {
                this.soundSystem.play('hurt')
            }
        }

        // Damage application and death check handled by WASM
        
        return true
    }
    
    die() {
        // Visual and audio effects only - death state handled by WASM
        if (this.particleSystem) {
            this.particleSystem.createDeathEffect(this.x, this.y)
        }

        if (this.soundSystem) {
            this.soundSystem.play('death')
        }
    }
    
    respawn(_x, _y) {
        // Visual and audio effects only - respawn logic handled by WASM
        if (this.particleSystem) {
            this.particleSystem.createRespawnEffect(this.x, this.y)
        }

        if (this.soundSystem) {
            this.soundSystem.play('respawn')
        }
    }
    
    setState(newState, wasmDriven = false) { // Added wasmDriven parameter
        if (this.state === newState) {return} // Prevent redundant state changes regardless of source

        this.previousState = this.state
        this.state = newState
        this.stateTime = 0
        this.stateDuration = 0
        this._prevNormTime = 0

        // Convert string state to numeric state for CharacterAnimator
        const numericState = this.stateNameToNumber(newState)

        // Update animation using CharacterAnimator's setAnimState method
        this.animator.setAnimState(numericState)
    }
    
    canAttack() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        const minCost = Math.min(this.params.attackLight.staminaCost, this.params.attackHeavy.staminaCost)
        return this.attackCooldown <= 0 && 
               this.stamina >= minCost && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'hurt'
    }
    
    canRoll() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        return this.rollCooldown <= 0 && 
               this.stamina >= this.params.roll.staminaCost && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    canBlock() {
        // This check is now primarily WASM-driven, this local version is for UI/client-side prediction
        return this.stamina > 0 && // Stamina also comes from WASM
               this.state !== 'dead' &&
               this.state !== 'rolling' &&
               this.state !== 'attacking' &&
               this.state !== 'hurt'
    }
    
    render(ctx, camera = null) {
        // Compute screen position from WASM-normalized coords using GameRenderer mapping if available
        let screenX = 0
        let screenY = 0
        const camX = camera?.x || 0
        const camY = camera?.y || 0
        
        // Debug logging for position tracking
        const debugPositions = false; // Set to true for debugging
        if (debugPositions && Math.random() < 0.01) { // Log occasionally to avoid spam
            console.log('AnimatedPlayer.render:', {
                playerPos: { x: this.x, y: this.y },
                camera: { x: camX, y: camY },
                hasGameRenderer: !!globalThis.gameRenderer,
                hasWasmToWorld: !!(globalThis.gameRenderer?.wasmToWorld)
            });
        }
        
        if (globalThis.gameRenderer && typeof globalThis.gameRenderer.wasmToWorld === 'function') {
            const pos = globalThis.gameRenderer.wasmToWorld(this.x || 0.5, this.y || 0.5)
            screenX = pos.x - camX
            screenY = pos.y - camY
        } else {
            // Fallback scaling if renderer mapping is unavailable
            const worldWidth = 800
            const worldHeight = 600
            screenX = (this.x || 0) * worldWidth - camX
            screenY = (this.y || 0) * worldHeight - camY
        }
        
        ctx.save()
        
        // Apply invulnerability flashing - this will be driven by WASM
        if (globalThis.wasmExports?.get_is_invulnerable?.() === 1) { // Assuming a WASM export for invulnerability
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3
        }
        
        // Get current animation frame
        const frame = this.animator.controller.getCurrentFrame()
        
        if (this.sprite && frame) {
            // Draw sprite animation with enhanced procedural transform
            ctx.save()
            const t = this.currentTransform || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 }
            const centerX = screenX + t.offsetX
            const centerY = screenY + t.offsetY
            ctx.translate(centerX, centerY)
            ctx.rotate(t.rotation)
            ctx.scale(this.facing < 0 ? -t.scaleX : t.scaleX, t.scaleY)
            
            // Render secondary motion effects first (behind character)
            if (t.secondaryMotion && this.debugMode) {
                this.renderSecondaryMotion(ctx, t.secondaryMotion)
            }
            
            // Draw main character sprite
            ctx.drawImage(
                this.sprite,
                frame.x, frame.y, frame.width, frame.height,
                -this.width/2, -this.height/2,
                this.width, this.height
            )
            
            // Render enhanced skeletal overlay if available and in debug mode
            if (t.skeleton && this.debugMode) {
                this.renderSkeletalOverlay(ctx, t.skeleton)
            }
            
            ctx.restore()
        } else {
            // Fallback to colored rectangle - ensure it's always visible
            ctx.fillStyle = this.color || '#4a90e2' // Default blue color
            
            // Apply state-based visual effects
            if (this.state === 'hurt') {
                ctx.fillStyle = '#ff4444'
            } else if (this.state === 'blocking') {
                ctx.fillStyle = '#4444ff'
            } else if (this.state === 'rolling') {
                ctx.fillStyle = '#ffff44'
            }
            
            // Draw a more visible rectangle
            const rectWidth = this.width || 32;
            const rectHeight = this.height || 32;
            
            ctx.fillRect(
                screenX - rectWidth/2,
                screenY - rectHeight/2,
                rectWidth,
                rectHeight
            );
            
            // Add a border to make it more visible
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                screenX - rectWidth/2,
                screenY - rectHeight/2,
                rectWidth,
                rectHeight
            );
            
            // Add a center dot to show exact position
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw health bar
        const barWidth = 40
        const barHeight = 4
        const barY = screenY - this.height/2 - 10
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight)
        
        // Health - get from WASM
        const currentHealth = Number.isFinite(this._cachedHealth) ? this._cachedHealth : (globalThis.wasmExports?.get_hp?.() ?? globalThis.wasmExports?.get_health?.() ?? this.health);
        const maxHealth = this.maxHealth; // Max health can still be local or WASM-driven if dynamic
        const healthPercent = currentHealth / maxHealth
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000'
        ctx.fillRect(screenX - barWidth/2, barY, barWidth * healthPercent, barHeight)
        
        // Stamina bar - get from WASM
        const staminaY = barY + 5
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth, 2)
        
        const currentStamina = Number.isFinite(this._cachedStamina) ? this._cachedStamina : (globalThis.wasmExports?.get_stamina?.() ?? this.stamina);
        const maxStamina = this.maxStamina; // Max stamina can still be local or WASM-driven if dynamic
        const staminaPercent = currentStamina / maxStamina
        ctx.fillStyle = '#00aaff'
        ctx.fillRect(screenX - barWidth/2, staminaY, barWidth * staminaPercent, 2)
        
        // Debug overlays
        if (this.debugMode) {
            this.renderDebug(ctx, camera, screenX, screenY)
        }

        ctx.restore()
    }

    computePoseOverlay(_input) {
        // Simple procedural layers approximation for readability and responsiveness
        // This can still be done in JS as it's purely visual
        const t = this.getNormalizedTime() // This needs to be driven by WASM state timings
        let scaleX = 1
        let scaleY = 1
        let rotation = 0
        const offsetX = 0
        let offsetY = this.ik?.pelvisY || 0

        // Lean with velocity when running - velocity should come from WASM
        // For now, using this.vx from CharacterAnimator.update's velocity parameter. This needs to be cleaned up.
        // The CharacterAnimator.update is already being passed vx, vy, which are currently local.
        // These local vx, vy are not updated from WASM, which is an issue.
        // Need to pass WASM-driven velocity to CharacterAnimator.update as well.
        // For now, let's assume CharacterAnimator is updated with correct velocity from WASM.
        // We need an export for WASM player velocity (get_vel_x, get_vel_y)
        const currentVx = globalThis.wasmExports?.get_vel_x?.() ?? 0;
        const currentVy = globalThis.wasmExports?.get_vel_y?.() ?? 0;
        const currentSpeed = Math.hypot(currentVx, currentVy);
        const playerSpeed = globalThis.wasmExports?.get_speed?.() ?? this.speed; // Assuming WASM provides player speed

        if (this.state === 'running') {
            const lean = Math.max(-0.15, Math.min(0.15, (currentVx / (playerSpeed || 1)) * 0.25))
            rotation += lean
        }

        // Block hunch
        if (this.state === 'blocking') {
            scaleY *= 0.98
            offsetY += 1
        }

        // Roll tuck
        if (this.state === 'rolling') {
            const w = (t < 0.5 ? t * 2 : (1 - t) * 2)
            scaleY *= 1 - 0.06 * w
            scaleX *= 1 + 0.04 * w
            rotation += (this.facing >= 0 ? 1 : -1) * 0.12 * w
        }

        // Attack slight forward push and recoil feel
        // These will be driven by WASM attack state timings and forces
        if (this.state === 'attacking') {
            // Placeholder: These values should come from WASM's animation overlay exports
            // if (t < 0.3) {
            //     offsetX += this.facing * 2 * (t / 0.3)
            // } else if (t > 0.6) {
            //     offsetX -= this.facing * 2 * ((t - 0.6) / 0.4)
            // }
        }

        return { scaleX, scaleY, rotation, offsetX, offsetY }
    }

    updateIK(deltaTime) {
        // Pelvis bob from WASM overlay if available
        const wasmPelvis = globalThis.wasmExports?.get_anim_pelvis_y?.()
        if (typeof wasmPelvis === 'number') {
            this.ik.pelvisY = wasmPelvis
        } else {
            this.ik.pelvisY = 0; // Fallback to 0 if WASM value not available
        }

        // Foot lock flags (alternating with steps) for future mask usage
        // These should also be driven by WASM if precise synchronization is needed
        const currentVx = globalThis.wasmExports?.get_vel_x?.() ?? 0;
        const currentVy = globalThis.wasmExports?.get_vel_y?.() ?? 0;
        const isMovingNow = Math.hypot(currentVx, currentVy) > 10
        if (isMovingNow) {
            // left foot considered planted near stridePhase ~ 0.0; right near ~0.5
            // The stridePhase needs to be driven by WASM's locomotion state.
            // For now, let's keep a local stridePhase but eventually it should be removed.
            this.stridePhase = (this.stridePhase + deltaTime * this.gaitRate) % 1; // Keep local for now
            const lf = (this.stridePhase < 0.25 || this.stridePhase > 0.75)
            this.ik.left.locked = lf
            this.ik.right.locked = !lf
        } else {
            this.ik.left.locked = false
            this.ik.right.locked = false
            this.stridePhase = 0; // Reset stride phase when idle
        }
    }

    renderDebug(ctx, camera, screenX, screenY) {
        const x = screenX
        const y = screenY - this.height / 2 - 18
        // Stride phase bar - needs to be updated based on WASM if stridePhase moves to WASM
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x - 24, y, 48, 4)
        ctx.fillStyle = '#00ffaa'
        ctx.fillRect(x - 24, y, 48 * (this.stridePhase % 1), 4)

        // Pelvis offset marker
        ctx.strokeStyle = '#ffaa00'
        ctx.beginPath()
        ctx.moveTo(x + 30, y + 2)
        ctx.lineTo(x + 30, y + 2 - (this.ik?.pelvisY || 0))
        ctx.stroke()

        // Event windows (attack/roll) - these timings are now WASM-driven
        // This will require WASM exports for current attack/roll state durations and normalized times
        const currentAttackState = globalThis.wasmExports?.get_attack_state?.() ?? 0; // Assuming a WASM export
        const currentAttackStateTime = globalThis.wasmExports?.get_attack_state_time?.() ?? 0; // Assuming a WASM export
        const totalGameTime = globalThis.wasmExports?.get_time_seconds?.() ?? 0; // Assuming a WASM export
        
        let norm = 0;
        if (currentAttackState === 1) { // Windup
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_windup_sec?.() ?? this.params.attackLight.duration);
        } else if (currentAttackState === 2) { // Active
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_active_sec?.() ?? this.params.attackLight.duration);
        } else if (currentAttackState === 3) { // Recovery
            norm = (totalGameTime - currentAttackStateTime) / (globalThis.wasmExports?.get_attack_recovery_sec?.() ?? this.params.attackLight.duration);
        }

        const barY = y + 8
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x - 24, barY, 48, 3)

        // These ranges should be driven by WASM exports if precise
        if (currentAttackState === 2) { // Active attack phase
            ctx.fillStyle = '#ff4477'
            // Placeholder: actual activeStart/End should come from WASM
            ctx.fillRect(x - 24 + 48 * 0.28, barY, 48 * (0.38 - 0.28), 3)
        }
        if (globalThis.wasmExports?.get_is_rolling?.() === 1) { // If rolling
            ctx.fillStyle = '#ffee55'
            // Placeholder: iFrameStart/End should come from WASM
            ctx.fillRect(x - 24 + 48 * 0.08, barY, 48 * (0.36 - 0.08), 3)
        }
        // Current norm marker
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x - 24 + 48 * norm - 1, barY - 1, 2, 5)

        ctx.restore()
    }
    
    // Helper function to convert numeric WASM state to string for internal use
    getAnimStateName(state) {
        switch(state) {
            case 0: return 'idle'
            case 1: return 'running'
            case 2: return 'attacking'
            case 3: return 'blocking'
            case 4: return 'rolling'
            case 5: return 'hurt'
            case 6: return 'dead'
            case 7: return 'jumping'
            case 8: return 'doubleJumping'
            case 9: return 'landing'
            case 10: return 'wallSliding'
            case 11: return 'dashing'
            case 12: return 'chargingAttack'
            default: return 'idle'
        }
    }

    // Helper function to convert string state to numeric for CharacterAnimator
    stateNameToNumber(stateName) {
        switch(stateName) {
            case 'idle': return 0
            case 'running': return 1
            case 'attacking': return 2
            case 'blocking': return 3
            case 'rolling': return 4
            case 'hurt': return 5
            case 'dead': return 6
            case 'jumping': return 7
            case 'doubleJumping': return 8
            case 'landing': return 9
            case 'wallSliding': return 10
            case 'dashing': return 11
            case 'chargingAttack': return 12
            default: return 0
        }
    }

    // Get animation state code for WASM integration
    getAnimationStateCode() {
        return this.stateNameToNumber(this.state);
    }
    
    // Get current animation info for debugging
    getAnimationInfo() {
        return {
            state: this.state, // Now directly reflecting the local state derived from WASM
            animation: this.animator.controller.currentAnimation?.name,
            frame: this.animator.controller.getCurrentFrame(),
            stateTimer: globalThis.wasmExports?.get_player_state_timer?.() ?? 0, // Assuming WASM exports player state timer
            invulnerable: globalThis.wasmExports?.get_is_invulnerable?.() === 1,
            
            // Enhanced procedural animation info
            proceduralData: this.currentTransform?.debug || null,
            skeletalData: this.currentTransform?.skeleton || null,
            secondaryMotion: this.currentTransform?.secondaryMotion || null,
            environmental: this.currentTransform?.environmental || null
        }
    }
    
    // Render secondary motion effects (cloth, hair, equipment)
    renderSecondaryMotion(ctx, secondaryMotion) {
        if (!secondaryMotion) {return}
        
        ctx.save()
        ctx.globalAlpha = 0.8
        
        // Render cloth physics
        if (secondaryMotion.cloth) {
            ctx.strokeStyle = '#4A4A4A'
            ctx.lineWidth = 2
            ctx.beginPath()
            secondaryMotion.cloth.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.position.x, point.position.y)
                } else {
                    ctx.lineTo(point.position.x, point.position.y)
                }
            })
            ctx.stroke()
        }
        
        // Render hair physics
        if (secondaryMotion.hair) {
            ctx.strokeStyle = '#8B4513'
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.beginPath()
            secondaryMotion.hair.forEach((segment, index) => {
                if (index === 0) {
                    ctx.moveTo(segment.position.x, segment.position.y)
                } else {
                    ctx.lineTo(segment.position.x, segment.position.y)
                }
            })
            ctx.stroke()
        }
        
        // Render equipment physics
        if (secondaryMotion.equipment) {
            secondaryMotion.equipment.forEach(item => {
                ctx.fillStyle = item.type === 'sword' ? '#C0C0C0' : '#8B4513'
                ctx.fillRect(item.position.x - 2, item.position.y - 1, 4, 2)
            })
        }
        
        ctx.restore()
    }
    
    // Render skeletal overlay for debugging and enhanced visualization
    renderSkeletalOverlay(ctx, skeleton) {
        if (!skeleton) {return}
        
        ctx.save()
        ctx.strokeStyle = '#00ff88'
        ctx.fillStyle = '#ffff44'
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.6
        
        // Draw bones
        this.drawBone(ctx, skeleton.torso, skeleton.head)
        this.drawBone(ctx, skeleton.torso, skeleton.pelvis)
        
        // Draw arms
        this.drawBone(ctx, skeleton.leftArm.shoulder, skeleton.leftArm.elbow)
        this.drawBone(ctx, skeleton.leftArm.elbow, skeleton.leftArm.hand)
        this.drawBone(ctx, skeleton.rightArm.shoulder, skeleton.rightArm.elbow)
        this.drawBone(ctx, skeleton.rightArm.elbow, skeleton.rightArm.hand)
        
        // Draw legs
        this.drawBone(ctx, skeleton.leftLeg.hip, skeleton.leftLeg.knee)
        this.drawBone(ctx, skeleton.leftLeg.knee, skeleton.leftLeg.foot)
        this.drawBone(ctx, skeleton.rightLeg.hip, skeleton.rightLeg.knee)
        this.drawBone(ctx, skeleton.rightLeg.knee, skeleton.rightLeg.foot)
        
        // Draw joints
        const joints = [
            skeleton.head, skeleton.torso, skeleton.pelvis,
            skeleton.leftArm.shoulder, skeleton.leftArm.elbow, skeleton.leftArm.hand,
            skeleton.rightArm.shoulder, skeleton.rightArm.elbow, skeleton.rightArm.hand,
            skeleton.leftLeg.hip, skeleton.leftLeg.knee, skeleton.leftLeg.foot,
            skeleton.rightLeg.hip, skeleton.rightLeg.knee, skeleton.rightLeg.foot
        ]
        
        joints.forEach(joint => {
            if (joint && typeof joint.x !== "undefined" && typeof joint.y !== "undefined") {
                ctx.beginPath()
                ctx.arc(joint.x, joint.y, 2, 0, Math.PI * 2)
                ctx.fill()
            }
        })
        
        ctx.restore()
    }
    
    // Helper method to draw bones
    drawBone(ctx, start, end) {
        if (!start || !end || typeof start.x === "undefined" || typeof end.x === "undefined") {return}
        
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
    }
    
    // Input helper to convert keyboard to player input - 5-button combat system
    static createInputFromKeys(keys) {
        return {
            // Movement
            left: keys.a || keys.arrowleft,
            right: keys.d || keys.arrowright,
            up: keys.w || keys.arrowup,
            down: keys.s || keys.arrowdown,
            
            // 5-Button Combat System
            lightAttack: keys.j || keys['1'],        // A1 = Light Attack
            heavyAttack: keys.k || keys['2'],        // A2 = Heavy Attack  
            block: keys.shift || keys['3'],          // Block = Hold to guard, tap to parry
            roll: keys.control || keys['4'],         // Roll = Dodge with i-frames
            special: keys.l || keys['5'],            // Special = Hero move
            
            // Legacy support
            attack: keys.j || keys[' '],             // Maps to light attack
            jump: keys.space || keys.z
        }
    }
    
    // New movement methods for enhanced animations
    // These methods now just trigger actions, WASM will handle state changes
    jump() {
        // WASM will drive the jump state, so we just trigger the action
        globalThis.wasmExports?.on_jump?.(); // New WASM function call for jumping
        if (this.particleSystem) {
            this.particleSystem.createDustCloud(this.x, this.y + this.height/2)
        }
        
        if (this.soundSystem) {
            this.soundSystem.play('jump')
        }
    }
    
}

export default AnimatedPlayer

// Static helper: attach a key to toggle debug overlays for a given player instance
AnimatedPlayer.attachDebugToggle = function(playerInstance, key = 'F3') {
    if (!playerInstance || playerInstance.__debugToggleAttached) { return }
    const targetKey = (key || 'F3').toLowerCase()
    const handler = (e) => {
        const k = (e.key || '').toLowerCase()
        if (k === targetKey.toLowerCase()) {
            playerInstance.debugMode = !playerInstance.debugMode
        }
    }
    try {
        addEventListener('keydown', handler)
        playerInstance.__debugToggleAttached = true
    } catch {
        // Ignore debug handler attachment errors
    }
}






