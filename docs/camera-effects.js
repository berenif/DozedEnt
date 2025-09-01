// Camera Effects System for Enhanced Game Feel
// Provides screen shake, zoom effects, and other camera manipulations

export class CameraEffects {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        
        // Screen shake properties
        this.shakeIntensity = 0
        this.shakeDecay = 0.9
        this.shakeOffset = { x: 0, y: 0 }
        this.traumaExponent = 2 // Higher = more dramatic shake falloff
        
        // Zoom properties
        this.baseZoom = 1.0
        this.currentZoom = 1.0
        this.targetZoom = 1.0
        this.zoomSpeed = 0.1
        
        // Camera position (for smooth following)
        this.position = { x: 0, y: 0 }
        this.targetPosition = { x: 0, y: 0 }
        this.followSpeed = 0.1
        
        // Rotation effects
        this.rotation = 0
        this.targetRotation = 0
        this.rotationSpeed = 0.1
        
        // Chromatic aberration for impacts
        this.chromaticAberration = 0
        this.chromaticDecay = 0.9
        
        // Motion blur accumulator
        this.motionBlurFrames = []
        this.motionBlurEnabled = false
        this.motionBlurStrength = 0.5
        
        // Flash effects
        this.flashColor = null
        this.flashAlpha = 0
        this.flashDecay = 0.85
        
        // Vignette effect
        this.vignetteIntensity = 0
        this.vignetteTargetIntensity = 0
        this.vignetteSpeed = 0.1
        
        // Slow motion effect
        this.timeScale = 1.0
        this.targetTimeScale = 1.0
        this.timeScaleSpeed = 0.1
        
        // Screen distortion for special effects
        this.distortionWaves = []
    }

    update(deltaTime) {
        // Update screen shake
        if (this.shakeIntensity > 0.01) {
            const shake = this.shakeIntensity**this.traumaExponent
            this.shakeOffset.x = (Math.random() - 0.5) * 2 * shake * 20
            this.shakeOffset.y = (Math.random() - 0.5) * 2 * shake * 20
            this.shakeIntensity *= this.shakeDecay
        } else {
            this.shakeOffset.x = 0
            this.shakeOffset.y = 0
            this.shakeIntensity = 0
        }
        
        // Update zoom
        this.currentZoom += (this.targetZoom - this.currentZoom) * this.zoomSpeed
        
        // Update position
        this.position.x += (this.targetPosition.x - this.position.x) * this.followSpeed
        this.position.y += (this.targetPosition.y - this.position.y) * this.followSpeed
        
        // Update rotation
        this.rotation += (this.targetRotation - this.rotation) * this.rotationSpeed
        
        // Update chromatic aberration
        if (this.chromaticAberration > 0.01) {
            this.chromaticAberration *= this.chromaticDecay
        } else {
            this.chromaticAberration = 0
        }
        
        // Update flash
        if (this.flashAlpha > 0.01) {
            this.flashAlpha *= this.flashDecay
        } else {
            this.flashAlpha = 0
            this.flashColor = null
        }
        
        // Update vignette
        this.vignetteIntensity += (this.vignetteTargetIntensity - this.vignetteIntensity) * this.vignetteSpeed
        
        // Update time scale
        this.timeScale += (this.targetTimeScale - this.timeScale) * this.timeScaleSpeed
        
        // Update distortion waves
        this.distortionWaves = this.distortionWaves.filter(wave => {
            wave.radius += wave.speed * deltaTime
            wave.alpha *= 0.95
            return wave.alpha > 0.01 && wave.radius < Math.max(this.canvas.width, this.canvas.height)
        })
    }

    // Apply camera transformations before rendering
    preRender(ctx) {
        ctx.save()
        
        // Apply camera transformations
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
        ctx.scale(this.currentZoom, this.currentZoom)
        ctx.rotate(this.rotation)
        ctx.translate(
            -this.canvas.width / 2 + this.shakeOffset.x - this.position.x,
            -this.canvas.height / 2 + this.shakeOffset.y - this.position.y
        )
        
        // Store motion blur frame if enabled
        if (this.motionBlurEnabled && this.motionBlurFrames.length < 3) {
            const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            this.motionBlurFrames.push(imageData)
        }
    }

    // Apply post-processing effects after rendering
    postRender(ctx) {
        ctx.restore()
        
        // Apply chromatic aberration
        if (this.chromaticAberration > 0) {
            this.applyChromaticAberration(ctx)
        }
        
        // Apply motion blur
        if (this.motionBlurEnabled && this.motionBlurFrames.length > 0) {
            this.applyMotionBlur(ctx)
        }
        
        // Apply distortion waves
        if (this.distortionWaves.length > 0) {
            this.applyDistortionWaves(ctx)
        }
        
        // Apply vignette
        if (this.vignetteIntensity > 0) {
            this.applyVignette(ctx)
        }
        
        // Apply flash effect
        if (this.flashAlpha > 0 && this.flashColor) {
            ctx.save()
            ctx.globalAlpha = this.flashAlpha
            ctx.fillStyle = this.flashColor
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
            ctx.restore()
        }
    }

    applyChromaticAberration(ctx) {
        ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        const offset = Math.floor(this.chromaticAberration * 5)
        
        // Create temporary canvas for channel shifting
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = this.canvas.width
        tempCanvas.height = this.canvas.height
        const tempCtx = tempCanvas.getContext('2d')
        
        // Draw original
        tempCtx.drawImage(this.canvas, 0, 0)
        
        // Shift red channel
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = '#00ffff'
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.globalCompositeOperation = 'screen'
        ctx.drawImage(tempCanvas, -offset, 0)
        ctx.restore()
        
        // Shift blue channel
        ctx.save()
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = '#ffff00'
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.globalCompositeOperation = 'screen'
        ctx.drawImage(tempCanvas, offset, 0)
        ctx.restore()
    }

    applyMotionBlur(ctx) {
        ctx.save()
        ctx.globalAlpha = this.motionBlurStrength / this.motionBlurFrames.length
        
        this.motionBlurFrames.forEach((frame, index) => {
            ctx.putImageData(frame, 0, 0)
        })
        
        ctx.restore()
        
        // Remove old frames
        if (this.motionBlurFrames.length >= 3) {
            this.motionBlurFrames.shift()
        }
    }

    applyDistortionWaves(ctx) {
        this.distortionWaves.forEach(wave => {
            ctx.save()
            ctx.globalAlpha = wave.alpha * 0.3
            ctx.strokeStyle = wave.color || 'white'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
        })
    }

    applyVignette(ctx) {
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, 
            Math.max(this.canvas.width, this.canvas.height) * 0.7
        )
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteIntensity})`)
        
        ctx.save()
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.restore()
    }

    // Effect triggers
    shake(intensity = 0.5, decay = 0.9) {
        this.shakeIntensity = Math.min(1, this.shakeIntensity + intensity)
        this.shakeDecay = decay
    }

    zoom(scale, speed = 0.1) {
        this.targetZoom = scale * this.baseZoom
        this.zoomSpeed = speed
    }

    flash(color = 'white', intensity = 1.0) {
        this.flashColor = color
        this.flashAlpha = intensity
    }

    setVignette(intensity, speed = 0.1) {
        this.vignetteTargetIntensity = Math.max(0, Math.min(1, intensity))
        this.vignetteSpeed = speed
    }

    slowMotion(scale = 0.5, speed = 0.1) {
        this.targetTimeScale = scale
        this.timeScaleSpeed = speed
    }

    normalSpeed(speed = 0.1) {
        this.targetTimeScale = 1.0
        this.timeScaleSpeed = speed
    }

    addDistortionWave(x, y, speed = 200, color = 'white') {
        this.distortionWaves.push({
            x, y,
            radius: 0,
            speed,
            alpha: 1.0,
            color
        })
    }

    setChromaticAberration(intensity) {
        this.chromaticAberration = Math.max(0, Math.min(1, intensity))
    }

    setMotionBlur(enabled, strength = 0.5) {
        this.motionBlurEnabled = enabled
        this.motionBlurStrength = strength
        if (!enabled) {
            this.motionBlurFrames = []
        }
    }

    followTarget(x, y, speed = 0.1) {
        this.targetPosition.x = x
        this.targetPosition.y = y
        this.followSpeed = speed
    }

    // Preset camera effects for common scenarios
    hitStop(duration = 50) {
        this.slowMotion(0.1, 0.9)
        setTimeout(() => this.normalSpeed(0.3), duration)
    }

    bigImpact() {
        this.shake(0.8, 0.85)
        this.zoom(1.05, 0.3)
        this.flash('white', 0.7)
        this.setChromaticAberration(0.3)
        setTimeout(() => this.zoom(1.0, 0.1), 100)
    }

    smallImpact() {
        this.shake(0.3, 0.9)
        this.zoom(1.02, 0.5)
        this.flash('white', 0.3)
    }

    criticalHit() {
        this.shake(1.0, 0.8)
        this.zoom(1.1, 0.5)
        this.flash('#ff6b6b', 0.8)
        this.setChromaticAberration(0.5)
        this.hitStop(80)
        setTimeout(() => this.zoom(1.0, 0.05), 150)
    }

    playerDamaged() {
        this.shake(0.4, 0.88)
        this.flash('red', 0.4)
        this.setVignette(0.3, 0.5)
        setTimeout(() => this.setVignette(0, 0.1), 500)
    }

    playerDeath() {
        this.shake(1.0, 0.95)
        this.zoom(0.9, 0.02)
        this.flash('red', 1.0)
        this.setVignette(0.8, 0.05)
        this.slowMotion(0.3, 0.05)
    }

    enemyDeath() {
        this.shake(0.6, 0.85)
        this.zoom(1.08, 0.4)
        this.flash('white', 0.5)
        this.addDistortionWave(this.canvas.width / 2, this.canvas.height / 2, 300)
        setTimeout(() => this.zoom(1.0, 0.1), 100)
    }

    blockSuccess() {
        this.shake(0.2, 0.92)
        this.flash('#4a90e2', 0.3)
        this.zoom(1.01, 0.8)
        setTimeout(() => this.zoom(1.0, 0.3), 50)
    }

    perfectParry() {
        this.shake(0.5, 0.9)
        this.flash('#00ffff', 0.6)
        this.zoom(1.15, 0.7)
        this.setChromaticAberration(0.4)
        this.hitStop(100)
        this.addDistortionWave(this.canvas.width / 2, this.canvas.height / 2, 400, '#00ffff')
        setTimeout(() => this.zoom(1.0, 0.05), 200)
    }

    rollDodge() {
        this.zoom(1.03, 0.5)
        this.setMotionBlur(true, 0.3)
        setTimeout(() => {
            this.zoom(1.0, 0.3)
            this.setMotionBlur(false)
        }, 200)
    }

    reset() {
        this.shakeIntensity = 0
        this.currentZoom = 1.0
        this.targetZoom = 1.0
        this.position = { x: 0, y: 0 }
        this.targetPosition = { x: 0, y: 0 }
        this.rotation = 0
        this.targetRotation = 0
        this.chromaticAberration = 0
        this.flashAlpha = 0
        this.vignetteIntensity = 0
        this.vignetteTargetIntensity = 0
        this.timeScale = 1.0
        this.targetTimeScale = 1.0
        this.distortionWaves = []
        this.motionBlurFrames = []
        this.motionBlurEnabled = false
    }
}

export default CameraEffects