/**
 * WardenBashAnimation - Complete visual effects for shoulder bash
 * Implements:
 * - Charge glow effect
 * - Charge particle management
 * - Impact VFX coordination
 * - Camera effect triggers
 * - Hit effect management
 */

import { AbilityAnimationBase } from './ability-animation-base.js';

export class WardenBashAnimation extends AbilityAnimationBase {
    constructor(wasmModule, vfxManager = {}) {
        super({ duration: 0.6, cooldown: 2.0, staminaCost: 20 })
        this.wasm = wasmModule || null
        this.particleSystem = vfxManager.particles || null
        this.cameraEffects = vfxManager.camera || null
        this.audio = vfxManager.audio || null
        this.chargeLevel = 0
        this.lastChargeParticleTime = 0
        this.chargeParticleInterval = 0.05
        this.chargeGlow = { radius: 0, alpha: 0 }
    }
    
    /**
     * Start charging animation
     */
    startCharging() {
        // Transition from READY → CHARGING
        if (!this.isReady()) {return false}
        this._switchState(this.states.CHARGING)
        this.chargeLevel = 0
        if (this.audio?.play) { this.audio.play('bash_charge_start') }
        return true
    }
    
    /**
     * Update charge level
     * @param {number} level - Charge level (0-1)
     * @param {number} deltaTime - Time delta
     */
    updateChargeLevel(level, deltaTime) {
        // Only meaningful during CHARGING; level 0..1
        this.chargeLevel = Math.max(0, Math.min(1, level))
        const dt = Number.isFinite(deltaTime) ? deltaTime : 0
        if (this.state === this.states.CHARGING && this.chargeLevel > 0.3) {
            this.lastChargeParticleTime += dt
            if (this.lastChargeParticleTime >= this.chargeParticleInterval) {
                this.spawnChargeParticles(this.chargeLevel)
                this.lastChargeParticleTime = 0
            }
        }
        // Glow
        this.chargeGlow.radius = 30 * this.chargeLevel
        this.chargeGlow.alpha = this.chargeLevel * 0.5
        if (this.chargeLevel >= 1 && this.cameraEffects?.shake) {
            this.cameraEffects.shake(0.5, 0.1)
        }
    }
    
    /**
     * Execute bash animation
     */
    executeBash() {
        // CHARGING → ACTIVE
        if (this.state !== this.states.CHARGING && !this.isReady()) {return false}
        this._switchState(this.states.ACTIVE)
        if (this.audio?.play) { this.audio.play('bash_execute') }
        this.spawnImpactEffect()
        // Notify WASM if available (purely visual here; gameplay is WASM-only)
        try { this.wasm?.start_warden_bash && this.wasm.start_warden_bash() } catch {}
        return true
    }
    
    /**
     * Update active bash
     * @param {number} targetsHit - Number of targets hit
     */
    updateBashActive(targetsHit) {
        if (!this.isActive()) {return}
        if (targetsHit > 0) { this.spawnHitEffect(targetsHit) }
    }
    
    /**
     * Spawn charge particles
     */
    spawnChargeParticles(level) {
        const x = this._getPlayerX()
        const y = this._getPlayerY()
        if (this.particleSystem?.spawnChargeParticles) {
            this.particleSystem.spawnChargeParticles(x, y, level)
        }
    }
    
    /**
     * Spawn impact effect
     */
    spawnImpactEffect() {
        const x = this._getPlayerX()
        const y = this._getPlayerY()
        const force = this.chargeLevel
        if (this.particleSystem?.spawnImpactShockwave) {
            this.particleSystem.spawnImpactShockwave(x, y, force)
        }
        if (this.particleSystem?.spawnHitSparks) {
            this.particleSystem.spawnHitSparks(x, y, 20)
        }
        if (this.cameraEffects?.shake) {
            this.cameraEffects.shake(3 * force, 0.3)
        }
        if (this.cameraEffects?.zoom) {
            this.cameraEffects.zoom(1.2, 0.1)
            setTimeout(() => {
                try { this.cameraEffects && this.cameraEffects.zoom(1.0, 0.3) } catch {}
            }, 100)
        }
    }
    
    /**
     * Spawn hit effect for each target
     */
    spawnHitEffect(count) {
        if (count > 1 && this.cameraEffects?.shake) {
            this.cameraEffects.shake(1.5, 0.2)
        }
    }
    
    /**
     * Render charge glow
     */
    renderChargeGlow(ctx, camera) {
        if (this.chargeGlow.alpha <= 0) { return }
        const playerX = this._getPlayerX()
        const playerY = this._getPlayerY()
        const screenX = (playerX - camera.x) * camera.scale + camera.width / 2
        const screenY = (playerY - camera.y) * camera.scale + camera.height / 2
        ctx.save()
        ctx.globalAlpha = this.chargeGlow.alpha
        ctx.fillStyle = '#ffaa00'
        ctx.filter = 'blur(10px)'
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.chargeGlow.radius * camera.scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
    
    /**
     * Render animation
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (this.isCharging()) {
            this.renderChargeGlow(ctx, camera)
        }
    }
    
    /**
     * Update animation
     * @param {number} deltaTime - Time delta
     */
    update(deltaTime) {
        super.update(deltaTime)
        // Keep glow pulsing slightly while charging
        if (this.isCharging()) {
            const pulse = 0.05 * Math.sin(Date.now() * 0.02)
            this.chargeGlow.alpha = Math.max(0, Math.min(1, this.chargeGlow.alpha + pulse))
        }
    }

    // Base hook overrides
    onStart(_player, _target) { /* visual prep only */ }
    onCharging(_dt) { return this.chargeLevel >= 1 }
    onActivate() { /* impact happens on executeBash; keep active until duration elapses */ }
    onEnd() { /* fall-through to recovery handled by base */ }

    _getPlayerX() { try { return (this.wasm?.exports?.get_x ? this.wasm.exports.get_x() : 0.5) } catch { return 0.5 } }
    _getPlayerY() { try { return (this.wasm?.exports?.get_y ? this.wasm.exports.get_y() : 0.5) } catch { return 0.5 } }
}

