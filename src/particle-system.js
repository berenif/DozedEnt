// Advanced Particle System for Game Feel Enhancement
// Provides various particle effects for combat, movement, and environmental interactions

export class Particle {
    constructor(x, y, config = {}) {
        this.x = x
        this.y = y
        this.vx = config.vx || 0
        this.vy = config.vy || 0
        this.ax = config.ax || 0  // acceleration x
        this.ay = config.ay || 0  // acceleration y
        this.life = config.life || 1.0
        this.maxLife = config.life || 1.0
        this.size = config.size || 4
        this.sizeDecay = config.sizeDecay || 0.98
        this.color = config.color || { r: 255, g: 255, b: 255 }
        this.alpha = config.alpha || 1.0
        this.alphaDecay = config.alphaDecay || 0.98
        this.rotation = config.rotation || 0
        this.rotationSpeed = config.rotationSpeed || 0
        this.trail = config.trail || false
        this.trailPositions = []
        this.blendMode = config.blendMode || 'source-over'
        this.glow = config.glow || false
        this.glowSize = config.glowSize || 2
        this.shape = config.shape || 'circle' // circle, square, star, triangle
        this.friction = config.friction || 1.0
        this.bounce = config.bounce || 0
        this.gravity = config.gravity || 0
        this.turbulence = config.turbulence || 0
        this.scaleWithVelocity = config.scaleWithVelocity || false
    }

    update(deltaTime) {
        // Apply physics
        this.vx *= this.friction
        this.vy *= this.friction
        this.vx += this.ax * deltaTime
        this.vy += (this.ay + this.gravity) * deltaTime
        
        // Apply turbulence
        if (this.turbulence > 0) {
            this.vx += (Math.random() - 0.5) * this.turbulence
            this.vy += (Math.random() - 0.5) * this.turbulence
        }
        
        // Update position
        this.x += this.vx * deltaTime
        this.y += this.vy * deltaTime
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime
        
        // Update trail
        if (this.trail) {
            this.trailPositions.push({ x: this.x, y: this.y, alpha: this.alpha })
            if (this.trailPositions.length > 10) {
                this.trailPositions.shift()
            }
        }
        
        // Decay properties
        this.life -= deltaTime
        this.size *= this.sizeDecay
        this.alpha *= this.alphaDecay
        
        // Bounce off boundaries
        if (this.bounce > 0) {
            if (this.x < 0 || this.x > 1280) {
                this.vx *= -this.bounce
                this.x = Math.max(0, Math.min(1280, this.x))
            }
            if (this.y < 0 || this.y > 720) {
                this.vy *= -this.bounce
                this.y = Math.max(0, Math.min(720, this.y))
            }
        }
        
        return this.life > 0 && this.alpha > 0.01 && this.size > 0.1
    }

    render(ctx) {
        ctx.save()
        
        // Set blend mode
        ctx.globalCompositeOperation = this.blendMode
        ctx.globalAlpha = this.alpha
        
        // Draw trail
        if (this.trail && this.trailPositions.length > 1) {
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.5})`
            ctx.lineWidth = this.size * 0.5
            ctx.lineCap = 'round'
            ctx.beginPath()
            this.trailPositions.forEach((pos, i) => {
                if (i === 0) {
                    ctx.moveTo(pos.x, pos.y)
                } else {
                    ctx.lineTo(pos.x, pos.y)
                }
            })
            ctx.stroke()
        }
        
        // Draw glow
        if (this.glow) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * this.glowSize)
            gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`)
            gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.size * this.glowSize, 0, Math.PI * 2)
            ctx.fill()
        }
        
        // Draw particle
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        
        let drawSize = this.size
        if (this.scaleWithVelocity) {
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
            drawSize *= (1 + speed * 0.1)
        }
        
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`
        
        switch (this.shape) {
            case 'square':
                ctx.fillRect(-drawSize/2, -drawSize/2, drawSize, drawSize)
                break
            case 'star':
                this.drawStar(ctx, 0, 0, 5, drawSize, drawSize * 0.5)
                break
            case 'triangle':
                ctx.beginPath()
                ctx.moveTo(0, -drawSize)
                ctx.lineTo(-drawSize * 0.866, drawSize * 0.5)
                ctx.lineTo(drawSize * 0.866, drawSize * 0.5)
                ctx.closePath()
                ctx.fill()
                break
            case 'circle':
            default:
                ctx.beginPath()
                ctx.arc(0, 0, drawSize, 0, Math.PI * 2)
                ctx.fill()
                break
        }
        
        ctx.restore()
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3
        let x = cx
        let y = cy
        const step = Math.PI / spikes

        ctx.beginPath()
        ctx.moveTo(cx, cy - outerRadius)
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius
            y = cy + Math.sin(rot) * outerRadius
            ctx.lineTo(x, y)
            rot += step

            x = cx + Math.cos(rot) * innerRadius
            y = cy + Math.sin(rot) * innerRadius
            ctx.lineTo(x, y)
            rot += step
        }
        
        ctx.lineTo(cx, cy - outerRadius)
        ctx.closePath()
        ctx.fill()
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = []
        this.emitters = []
    }

    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => particle.update(deltaTime))
        
        // Update emitters
        this.emitters = this.emitters.filter(emitter => {
            emitter.update(deltaTime)
            return emitter.active
        })
    }

    render(ctx) {
        // Sort particles by blend mode for better batching
        const particlesByBlendMode = {}
        this.particles.forEach(particle => {
            if (!particlesByBlendMode[particle.blendMode]) {
                particlesByBlendMode[particle.blendMode] = []
            }
            particlesByBlendMode[particle.blendMode].push(particle)
        })
        
        // Render particles grouped by blend mode
        for (const [blendMode, particles] of Object.entries(particlesByBlendMode)) {
            particles.forEach(particle => particle.render(ctx))
        }
    }

    addParticle(particle) {
        this.particles.push(particle)
    }

    addEmitter(emitter) {
        this.emitters.push(emitter)
        emitter.system = this
    }

    // Preset effects
    createBloodSplatter(x, y, direction = null) {
        const count = 15 + Math.random() * 10
        const baseSpeed = 150
        
        for (let i = 0; i < count; i++) {
            const angle = direction ? 
                direction + (Math.random() - 0.5) * Math.PI * 0.5 :
                Math.random() * Math.PI * 2
            const speed = baseSpeed * (0.5 + Math.random() * 0.5)
            const size = 2 + Math.random() * 4
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: { r: 180 + Math.random() * 40, g: 0, b: 0 },
                size: size,
                life: 0.5 + Math.random() * 0.5,
                gravity: 300,
                friction: 0.95,
                bounce: 0.3,
                alphaDecay: 0.95,
                sizeDecay: 0.98,
                trail: size > 3,
                blendMode: 'multiply'
            }))
        }
        
        // Add some mist particles
        for (let i = 0; i < 5; i++) {
            this.addParticle(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                color: { r: 150, g: 0, b: 0 },
                size: 15 + Math.random() * 10,
                life: 0.8,
                alpha: 0.3,
                alphaDecay: 0.96,
                sizeDecay: 1.01,
                blendMode: 'multiply'
            }))
        }
    }

    createHitSpark(x, y, color = { r: 255, g: 200, b: 100 }) {
        const count = 8 + Math.random() * 8
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
            const speed = 200 + Math.random() * 150
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + Math.random() * 3,
                life: 0.2 + Math.random() * 0.3,
                alphaDecay: 0.92,
                sizeDecay: 0.95,
                glow: true,
                glowSize: 3,
                shape: 'star',
                blendMode: 'screen',
                trail: true
            }))
        }
        
        // Central flash
        this.addParticle(new Particle(x, y, {
            color: { r: 255, g: 255, b: 255 },
            size: 30,
            life: 0.1,
            alpha: 0.8,
            alphaDecay: 0.85,
            sizeDecay: 1.15,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }))
    }

    createDustCloud(x, y, radius = 30) {
        const count = 10 + Math.random() * 10
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * radius
            const px = x + Math.cos(angle) * distance
            const py = y + Math.sin(angle) * distance
            
            this.addParticle(new Particle(px, py, {
                vx: (Math.random() - 0.5) * 30,
                vy: -Math.random() * 50 - 20,
                color: { r: 150, g: 130, b: 100 },
                size: 10 + Math.random() * 15,
                life: 0.8 + Math.random() * 0.4,
                alpha: 0.4,
                alphaDecay: 0.97,
                sizeDecay: 1.01,
                turbulence: 5,
                blendMode: 'multiply'
            }))
        }
    }

    createRollDust(x, y, direction) {
        const count = 5
        for (let i = 0; i < count; i++) {
            const offset = (i - count/2) * 10
            this.addParticle(new Particle(
                x - Math.cos(direction) * 20,
                y - Math.sin(direction) * 20 + offset,
                {
                    vx: -Math.cos(direction) * 50 + (Math.random() - 0.5) * 20,
                    vy: -Math.sin(direction) * 50 + (Math.random() - 0.5) * 20,
                    color: { r: 180, g: 160, b: 140 },
                    size: 8 + Math.random() * 4,
                    life: 0.4,
                    alpha: 0.5,
                    alphaDecay: 0.95,
                    sizeDecay: 1.02,
                    blendMode: 'multiply'
                }
            ))
        }
    }

    createBlockSpark(x, y, angle) {
        // Directional sparks
        for (let i = 0; i < 12; i++) {
            const sparkAngle = angle + (Math.random() - 0.5) * Math.PI * 0.3
            const speed = 250 + Math.random() * 150
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                color: { r: 255, g: 230, b: 150 },
                size: 1 + Math.random() * 2,
                life: 0.3,
                alphaDecay: 0.90,
                friction: 0.92,
                glow: true,
                glowSize: 4,
                shape: Math.random() > 0.5 ? 'star' : 'circle',
                blendMode: 'screen',
                trail: true,
                gravity: 100
            }))
        }
        
        // Impact ring
        this.addParticle(new Particle(x, y, {
            color: { r: 255, g: 255, b: 200 },
            size: 5,
            life: 0.2,
            alpha: 0.6,
            alphaDecay: 0.85,
            sizeDecay: 1.25,
            shape: 'circle',
            blendMode: 'screen',
            glow: true,
            glowSize: 3
        }))
    }

    createPerfectParryFlash(x, y) {
        // Large flash effect
        this.addParticle(new Particle(x, y, {
            color: { r: 100, g: 200, b: 255 },
            size: 100,
            life: 0.3,
            alpha: 0.8,
            alphaDecay: 0.90,
            sizeDecay: 1.08,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }))
        
        // Ring of particles
        const count = 16
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count
            const speed = 300
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: { r: 150, g: 200, b: 255 },
                size: 4,
                life: 0.5,
                alphaDecay: 0.94,
                friction: 0.90,
                glow: true,
                glowSize: 3,
                shape: 'star',
                blendMode: 'screen',
                trail: true
            }))
        }
    }

    createEnemyDeathExplosion(x, y) {
        // Main explosion
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 100 + Math.random() * 200
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: { 
                    r: 255, 
                    g: 100 + Math.random() * 100, 
                    b: Math.random() * 100 
                },
                size: 3 + Math.random() * 5,
                life: 0.5 + Math.random() * 0.5,
                gravity: 200,
                friction: 0.94,
                alphaDecay: 0.95,
                sizeDecay: 0.97,
                glow: true,
                glowSize: 2,
                blendMode: 'screen'
            }))
        }
        
        // Smoke
        for (let i = 0; i < 8; i++) {
            this.addParticle(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 50,
                vy: -Math.random() * 100 - 50,
                color: { r: 80, g: 80, b: 80 },
                size: 20 + Math.random() * 20,
                life: 1.0,
                alpha: 0.5,
                alphaDecay: 0.97,
                sizeDecay: 1.02,
                blendMode: 'multiply'
            }))
        }
    }

    createFootstep(x, y, size = 1) {
        const count = 3
        for (let i = 0; i < count; i++) {
            this.addParticle(new Particle(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 5,
                {
                    vx: (Math.random() - 0.5) * 20,
                    vy: -Math.random() * 30 - 10,
                    color: { r: 160, g: 140, b: 120 },
                    size: (3 + Math.random() * 2) * size,
                    life: 0.3,
                    alpha: 0.3,
                    alphaDecay: 0.94,
                    sizeDecay: 1.01,
                    blendMode: 'multiply'
                }
            ))
        }
    }

    clear() {
        this.particles = []
        this.emitters = []
    }
}

export class ParticleEmitter {
    constructor(x, y, config = {}) {
        this.x = x
        this.y = y
        this.active = true
        this.emissionRate = config.emissionRate || 10 // particles per second
        this.emissionTimer = 0
        this.lifetime = config.lifetime || Infinity
        this.age = 0
        this.particleConfig = config.particleConfig || {}
        this.spread = config.spread || Math.PI * 2
        this.direction = config.direction || 0
        this.system = null
    }

    update(deltaTime) {
        this.age += deltaTime
        if (this.age >= this.lifetime) {
            this.active = false
            return
        }

        this.emissionTimer += deltaTime
        const emissionInterval = 1 / this.emissionRate
        
        while (this.emissionTimer >= emissionInterval && this.active) {
            this.emissionTimer -= emissionInterval
            this.emit()
        }
    }

    emit() {
        if (!this.system) {return}
        
        const angle = this.direction + (Math.random() - 0.5) * this.spread
        const config = { ...this.particleConfig }
        
        if (config.speed) {
            config.vx = Math.cos(angle) * config.speed
            config.vy = Math.sin(angle) * config.speed
            delete config.speed
        }
        
        this.system.addParticle(new Particle(this.x, this.y, config))
    }

    setPosition(x, y) {
        this.x = x
        this.y = y
    }

    stop() {
        this.active = false
    }
}

export default ParticleSystem