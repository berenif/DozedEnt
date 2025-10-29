/**
 * CharacterAnimator - Complete character animation system
 * Combines sprite-based and procedural animations
 */

import { AnimationController } from './AnimationController.js';
import { ProceduralAnimator } from './procedural/ProceduralAnimator.js';

export class CharacterAnimator {
    constructor() {
        this.controller = new AnimationController();
        this.procedural = new ProceduralAnimator();
        this.animations = Object.create(null);
        this.currentAnimation = null;
        
        // Event system integration
        this.eventSystem = null;
        this.eventListeners = new Map();

        // Initialize procedural animation instances
        this._initializeProceduralAnimations();
        
        // Initialize state
        this._initializeState();
    }

    _initializeProceduralAnimations() {
        this.breathing = this.procedural.createBreathingAnimation({
            intensity: 0.012,
            speed: 1.8,
            asymmetry: 0.15
        });
        this.squashStretch = this.procedural.createSquashStretch();
        this.wobble = this.procedural.createWobble();
        this.anticipation = this.procedural.createAnticipation();
        this.trail = this.procedural.createTrailEffect();

        this.advancedIK = this.procedural.createAdvancedIK({
            armLength: 22,
            forearmLength: 18,
            damping: 0.75,
            stiffness: 0.4
        });
        this.secondaryMotion = this.procedural.createSecondaryMotion({
            segments: 4,
            length: 12,
            damping: 0.82,
            stiffness: 0.25,
            gravity: 0.3,
            windStrength: 0.08
        });
        this.momentumSystem = this.procedural.createMomentumSystem({
            maxMomentum: 8,
            momentumDecay: 0.88,
            momentumInfluence: 0.25,
            directionSmoothing: 0.75
        });
    }

    _initializeState() {
        this.state = 0; // numeric state code; default to idle
        this.stateName = 'idle';
        this.facing = 'right';
        this.moving = false;
        this.attacking = false;
        this.blocking = false;
        this.rolling = false;
        this.hurt = false;
        this.jumping = false;
        this.doubleJumping = false;
        this.wallSliding = false;
        this.dashing = false;
        this.charging = false;
        this.dead = false;
        this.landing = false;
        
        // Animation blending
        this.blendFactors = {
            idle: 1,
            running: 0,
            attacking: 0,
            blocking: 0,
            rolling: 0,
            hurt: 0,
            jumping: 0,
            doubleJumping: 0,
            landing: 0,
            wallSliding: 0,
            dashing: 0,
            chargingAttack: 0,
            dead: 0
        };
        
        this.targetBlendFactors = { ...this.blendFactors };
        this.blendSpeed = 0.2;

        // Internal timers for temporary states
        this.hurtTimer = 0;
        this.attackTimer = 0;
        this.rollTimer = 0;
    }

    resetActionTimers() {
        this.hurtTimer = 0;
        this.attackTimer = 0;
        this.rollTimer = 0;
    }

    addAnimation(name, animation) {
        if (!animation) {
            return;
        }
        const key = name || (animation && animation.name);
        if (!key) {
            return;
        }
        this.animations[key] = animation;
        this.controller.addAnimation(key, animation);
    }

    play(name, options = {}) {
        if (!name || !this.animations[name]) {
            return;
        }
        this.controller.play(name, options);
        this.currentAnimation = this.controller.currentAnimation;
        if (typeof name === 'string') {
            this.stateName = name;
        }
    }

    // Helper function to convert numeric WASM state to string for internal use
    getAnimStateName(state) {
        const stateNames = [
            'idle', 'running', 'attacking', 'blocking', 'rolling', 'hurt', 
            'dead', 'jumping', 'doubleJumping', 'landing', 'wallSliding', 
            'dashing', 'chargingAttack'
        ];
        return stateNames[state] || 'idle';
    }

    setAnimState(newState) {
        if (this.state === newState) {
            return;
        }
        this.resetActionTimers();

        const previousState = this.state;
        const previousStateName = this.stateName;
        
        this.state = newState;
        this.stateName = this.getAnimStateName(newState);
        
        // Emit state change event
        this.emit('stateChange', {
            fromState: previousState,
            toState: newState,
            fromStateName: previousStateName,
            toStateName: this.stateName
        });
        
        // Update target blend factors
        Object.keys(this.targetBlendFactors).forEach(key => {
            this.targetBlendFactors[key] = 0;
        });
        this.targetBlendFactors[this.stateName] = 1;
        
        // Play animation based on state
        this.play(this.stateName, { transition: 0.1 });
        
        // Trigger procedural animations
        this._triggerProceduralForState(newState);
    }

    _triggerProceduralForState(newState) {
        switch(newState) {
            case 2: // Attacking
                this.anticipation.trigger();
                break;
            case 5: // Hurt
                this.squashStretch.trigger();
                this.wobble.impulse(10);
                break;
            case 4: // Rolling
                this.trail.clear();
                break;
            case 7: // Jumping
                this.squashStretch.trigger();
                break;
            case 8: // DoubleJumping
                this.wobble.impulse(5);
                this.trail.clear();
                break;
            case 9: // Landing
                this.squashStretch.trigger();
                this.wobble.impulse(15);
                break;
            case 11: // Dashing
                this.trail.clear();
                break;
            case 12: // ChargingAttack
                this.anticipation.trigger();
                this.wobble.impulse(3);
                break;
            case 6: // Death
                this.squashStretch.trigger();
                this.wobble.impulse(20);
                break;
        }
    }

    update(deltaTime, position, velocity = { x: 0, y: 0 }, isGrounded = true) {
        // Update state timers
        this._updateTimers(deltaTime);

        // Update animation controller
        this.controller.update(deltaTime);

        // Update blend factors
        this._updateBlendFactors();

        // Update procedural animations
        const proceduralData = this._updateProceduralAnimations(deltaTime, position, velocity, isGrounded);

        // Combine all transformations
        return this._combineTransforms(proceduralData);
    }

    _updateTimers(deltaTime) {
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            if (this.hurtTimer <= 0 && this.state === 5) {
                this.setAnimState(0); // Idle
            }
        }
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0 && this.state === 2) {
                this.setAnimState(0); // Idle
            }
        }
        if (this.rollTimer > 0) {
            this.rollTimer -= deltaTime;
            if (this.rollTimer <= 0 && this.state === 4) {
                this.setAnimState(0); // Idle
            }
        }
    }

    _updateBlendFactors() {
        Object.keys(this.blendFactors).forEach(key => {
            const diff = this.targetBlendFactors[key] - this.blendFactors[key];
            this.blendFactors[key] += diff * this.blendSpeed;
        });
    }

    _updateProceduralAnimations(deltaTime, position, velocity, isGrounded) {
        // Update enhanced breathing with state modulation
        this.breathing.modulateForState(this.stateName);
        const breathing = this.breathing.update(deltaTime);

        // Update momentum system
        const momentumData = this.momentumSystem.update(deltaTime, velocity.x, velocity.y, isGrounded);

        // Update secondary motion (initialize if needed)
        if (this.secondaryMotion.segments.length === 0) {
            this.secondaryMotion.initialize(position.x, position.y - 8);
        }
        const secondaryMotion = this.secondaryMotion.update(deltaTime, position.x, position.y - 8);

        // Update other procedural animations
        const squashStretch = this.squashStretch.update(deltaTime);
        const wobble = this.wobble.update(deltaTime);
        const anticipation = this.anticipation.update(deltaTime);
        const trails = this.trail.update(deltaTime, position);

        return {
            breathing,
            momentumData,
            secondaryMotion,
            squashStretch,
            wobble,
            anticipation,
            trails
        };
    }

    _combineTransforms(proceduralData) {
        const { breathing, momentumData, secondaryMotion, squashStretch, wobble, anticipation, trails } = proceduralData;

        const transform = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            trails: trails,
            secondaryMotion: secondaryMotion,
            momentum: momentumData,
            ik: null // Will be set if weapon/arms are used
        };

        // Apply enhanced breathing
        if (this.blendFactors.idle > 0 || this.blendFactors.running > 0) {
            transform.scaleX *= breathing.scaleX;
            transform.scaleY *= breathing.scaleY;
            transform.offsetY += breathing.offsetY;
        }

        // Apply momentum-based adjustments
        transform.rotation += momentumData.leanAngle;
        transform.scaleY *= (1 + momentumData.stretchFactor);
        transform.offsetY += momentumData.bounceFactor * Math.sin(Date.now() * 0.01);

        // Apply squash/stretch
        transform.scaleX *= squashStretch.scaleX;
        transform.scaleY *= squashStretch.scaleY;

        // Apply wobble
        transform.scaleX *= wobble.scaleX;
        transform.scaleY *= wobble.scaleY;
        transform.rotation += wobble.rotation;

        // Apply anticipation
        if (this.stateName === 'attacking' || this.stateName === 'chargingAttack') {
            transform.scaleX *= anticipation.scaleX;
            transform.scaleY *= anticipation.scaleY;
            transform.offsetX += anticipation.offsetX;
        }

        // Apply facing direction
        if (this.facing === 'left') {
            transform.scaleX *= -1;
        }

        return transform;
    }

    setFacing(direction) {
        this.facing = direction;
    }
    
    // Event system integration
    setEventSystem(eventSystem) {
        this.eventSystem = eventSystem;
    }
    
    on(eventName, callback, context = null) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        
        const listener = { callback, context, once: false };
        this.eventListeners.get(eventName).add(listener);
        
        if (this.eventSystem) {
            return this.eventSystem.on(eventName, callback, context);
        }
        
        return () => this.off(eventName, callback);
    }
    
    once(eventName, callback, context = null) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        
        const listener = { callback, context, once: true };
        this.eventListeners.get(eventName).add(listener);
        
        if (this.eventSystem) {
            return this.eventSystem.once(eventName, callback, context);
        }
        
        return () => this.off(eventName, callback);
    }
    
    off(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            return false;
        }
        
        const listeners = this.eventListeners.get(eventName);
        for (const listener of listeners) {
            if (listener.callback === callback) {
                listeners.delete(listener);
                break;
            }
        }
        
        if (listeners.size === 0) {
            this.eventListeners.delete(eventName);
        }
        
        if (this.eventSystem) {
            this.eventSystem.off(eventName, callback);
        }
        
        return true;
    }
    
    emit(eventName, data = {}) {
        if (this.eventListeners.has(eventName)) {
            const listeners = Array.from(this.eventListeners.get(eventName));
            
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data);
                    } else {
                        listener.callback(data);
                    }
                    
                    if (listener.once) {
                        this.eventListeners.get(eventName).delete(listener);
                    }
                } catch (error) {
                    console.error(`Error in animation event listener for ${eventName}:`, error);
                }
            }
        }
        
        if (this.eventSystem) {
            this.eventSystem.emit(eventName, data);
        }
    }

    // Action triggers
    triggerHurt() {
        this.setAnimState(5);
        this.hurtTimer = 300;
        this.emit('hurt', { timer: this.hurtTimer });
    }

    triggerAttack() {
        this.setAnimState(2);
        this.attackTimer = 400;
        this.emit('attack', { timer: this.attackTimer });
    }

    triggerRoll() {
        this.setAnimState(4);
        this.rollTimer = 400;
        this.emit('roll', { timer: this.rollTimer });
    }

    triggerBlock() {
        this.setAnimState(3);
        this.emit('block');
    }

    releaseBlock() {
        if (this.state === 3) {
            this.setAnimState(0);
            this.emit('blockRelease');
        }
    }

    setMoving(isMoving) {
        this.moving = isMoving;
        if (isMoving && this.state === 0) {
            this.setAnimState(1);
        } else if (!isMoving && this.state === 1) {
            this.setAnimState(0);
        }
    }
}
