/**
 * AbilityAnimationBase - Base class for ability animations
 * Provides common functionality:
 * - Animation state management
 * - Timing utilities
 * - Transform calculations
 * - VFX integration
 */

export class AbilityAnimationBase {
    constructor(config = {}) {
        this.states = {
            READY: 'ready',
            CHARGING: 'charging',
            ACTIVE: 'active',
            RECOVERY: 'recovery',
            COOLDOWN: 'cooldown'
        }
        this.state = this.states.READY
        this._timeInState = 0
        this._cooldownRemaining = 0
        this.player = null
        this.target = null
        this.animator = config.animator || null
        this.vfx = config.vfx || null
        this.duration = Number.isFinite(config.duration) ? config.duration : 0.6
        this.cooldown = Number.isFinite(config.cooldown) ? config.cooldown : 2.0
        this.staminaCost = Number.isFinite(config.staminaCost) ? config.staminaCost : 15
        this.manaCost = Number.isFinite(config.manaCost) ? config.manaCost : 0
        this.canMoveWhileCasting = !!config.canMoveWhileCasting
        this.canCancelEarly = !!config.canCancelEarly
        this.interruptible = config.interruptible !== false
    }

    // Lifecycle
    start(player, target) {
        if (!this.isReady()) {return false}
        this.player = player
        this.target = target || null
        this._switchState(this.states.CHARGING)
        this.onStart(player, target)
        return true
    }

    update(deltaTime) {
        const dt = Number.isFinite(deltaTime) ? deltaTime : 0
        // Cooldown timer always counts down
        if (this._cooldownRemaining > 0) {
            this._cooldownRemaining = Math.max(0, this._cooldownRemaining - dt)
        }

        this._timeInState += dt

        switch (this.state) {
            case this.states.CHARGING: {
                const proceed = this.onCharging(dt)
                if (proceed === true || this._timeInState >= Math.max(0.01, this.duration * 0.25)) {
                    this._switchState(this.states.ACTIVE)
                    this.onActivate()
                }
                break
            }
            case this.states.ACTIVE: {
                this.onUpdate(dt)
                if (this._timeInState >= this.duration) {
                    this._switchState(this.states.RECOVERY)
                    this.onEnd()
                }
                break
            }
            case this.states.RECOVERY: {
                const recoverTime = Math.min(0.4, this.duration * 0.5)
                if (this._timeInState >= recoverTime) {
                    this._switchState(this.states.COOLDOWN)
                    this._cooldownRemaining = this.cooldown
                }
                break
            }
            case this.states.COOLDOWN: {
                if (this._cooldownRemaining <= 0) {
                    this._switchState(this.states.READY)
                }
                break
            }
            default: break
        }
    }

    end() {
        if (this.state === this.states.ACTIVE) {
            this.onEnd()
            this._switchState(this.states.RECOVERY)
        }
    }

    interrupt() {
        if (!this.interruptible) {return false}
        if (this.state === this.states.ACTIVE || this.state === this.states.CHARGING) {
            this.onInterrupted()
            this._switchState(this.states.COOLDOWN)
            this._cooldownRemaining = this.cooldown
            return true
        }
        return false
    }

    // Queries
    isActive() { return this.state === this.states.ACTIVE }
    isCharging() { return this.state === this.states.CHARGING }
    isOnCooldown() { return this.state === this.states.COOLDOWN && this._cooldownRemaining > 0 }
    isReady() { return this.state === this.states.READY }
    getCooldownRemaining() { return this._cooldownRemaining }
    getProgress() { return this.duration > 0 ? Math.min(1, Math.max(0, this._timeInState / this.duration)) : 0 }

    // Hooks for subclasses
    onStart(_player, _target) {}
    onCharging(_dt) { return false }
    onActivate() {}
    onUpdate(_dt) {}
    onEnd() {}
    onInterrupted() {}

    // Utilities
    lerp(a, b, t) { return a + (b - a) * t }
    easeOutCubic(t) { return 1 - (1 - t) ** 3; }
    easeInCubic(t) { return t * t * t }

    _switchState(next) {
        this.state = next
        this._timeInState = 0
    }
}

