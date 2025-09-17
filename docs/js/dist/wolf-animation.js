// Advanced Particle System for Game Feel Enhancement
// Provides various particle effects for combat, movement, and environmental interactions

class Particle {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.ax = config.ax || 0;  // acceleration x
        this.ay = config.ay || 0;  // acceleration y
        this.life = config.life || 1.0;
        this.maxLife = config.life || 1.0;
        this.size = config.size || 4;
        this.sizeDecay = config.sizeDecay || 0.98;
        this.color = config.color || { r: 255, g: 255, b: 255 };
        this.alpha = config.alpha || 1.0;
        this.alphaDecay = config.alphaDecay || 0.98;
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.trail = config.trail || false;
        this.trailPositions = [];
        this.blendMode = config.blendMode || 'source-over';
        this.glow = config.glow || false;
        this.glowSize = config.glowSize || 2;
        this.shape = config.shape || 'circle'; // circle, square, star, triangle
        this.friction = config.friction || 1.0;
        this.bounce = config.bounce || 0;
        this.gravity = config.gravity || 0;
        this.turbulence = config.turbulence || 0;
        this.scaleWithVelocity = config.scaleWithVelocity || false;
    }

    update(deltaTime) {
        // Apply physics
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vx += this.ax * deltaTime;
        this.vy += (this.ay + this.gravity) * deltaTime;
        
        // Apply turbulence
        if (this.turbulence > 0) {
            let s = Number((globalThis.runSeedForVisuals ?? 1n) % 2147483647n);
            s = (s * 48271) % 2147483647;
            const n1 = (s / 2147483647) - 0.5;
            s = (s * 48271) % 2147483647;
            const n2 = (s / 2147483647) - 0.5;
            this.vx += n1 * this.turbulence;
            this.vy += n2 * this.turbulence;
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Update trail
        if (this.trail) {
            this.trailPositions.push({ x: this.x, y: this.y, alpha: this.alpha });
            if (this.trailPositions.length > 10) {
                this.trailPositions.shift();
            }
        }
        
        // Decay properties
        this.life -= deltaTime;
        this.size *= this.sizeDecay;
        this.alpha *= this.alphaDecay;
        
        // Bounce off boundaries
        if (this.bounce > 0) {
            if (this.x < 0 || this.x > 1280) {
                this.vx *= -this.bounce;
                this.x = Math.max(0, Math.min(1280, this.x));
            }
            if (this.y < 0 || this.y > 720) {
                this.vy *= -this.bounce;
                this.y = Math.max(0, Math.min(720, this.y));
            }
        }
        
        return this.life > 0 && this.alpha > 0.01 && this.size > 0.1
    }

    render(ctx) {
        ctx.save();
        
        // Set blend mode
        ctx.globalCompositeOperation = this.blendMode;
        ctx.globalAlpha = this.alpha;
        
        // Draw trail
        if (this.trail && this.trailPositions.length > 1) {
            ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.5})`;
            ctx.lineWidth = this.size * 0.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            this.trailPositions.forEach((pos, i) => {
                if (i === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.lineTo(pos.x, pos.y);
                }
            });
            ctx.stroke();
        }
        
        // Draw glow
        if (this.glow) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * this.glowSize);
            gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`);
            gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * this.glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw particle
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        let drawSize = this.size;
        if (this.scaleWithVelocity) {
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            drawSize *= (1 + speed * 0.1);
        }
        
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        
        switch (this.shape) {
            case 'square':
                ctx.fillRect(-drawSize/2, -drawSize/2, drawSize, drawSize);
                break
            case 'star':
                this.drawStar(ctx, 0, 0, 5, drawSize, drawSize * 0.5);
                break
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -drawSize);
                ctx.lineTo(-drawSize * 0.866, drawSize * 0.5);
                ctx.lineTo(drawSize * 0.866, drawSize * 0.5);
                ctx.closePath();
                ctx.fill();
                break
            case 'circle':
            default:
                ctx.beginPath();
                ctx.arc(0, 0, drawSize, 0, Math.PI * 2);
                ctx.fill();
                break
        }
        
        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x;
        let y;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

class ParticleEmitter {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.emissionRate = config.emissionRate || 10; // particles per second
        this.emissionTimer = 0;
        this.lifetime = config.lifetime || Infinity;
        this.age = 0;
        this.particleConfig = config.particleConfig || {};
        this.spread = config.spread || Math.PI * 2;
        this.direction = config.direction || 0;
        this.system = null;
    }

    update(deltaTime) {
        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.active = false;
            return
        }

        this.emissionTimer += deltaTime;
        const emissionInterval = 1 / this.emissionRate;
        
        while (this.emissionTimer >= emissionInterval && this.active) {
            this.emissionTimer -= emissionInterval;
            this.emit();
        }
    }

    emit() {
        if (!this.system) {return}
        
        const angle = this.direction + (Math.random() - 0.5) * this.spread;
        const config = { ...this.particleConfig };
        
        if (config.speed) {
            config.vx = Math.cos(angle) * config.speed;
            config.vy = Math.sin(angle) * config.speed;
            delete config.speed;
        }
        
        this.system.addParticle(new Particle(this.x, this.y, config));
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    stop() {
        this.active = false;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.emitters = [];
    }

    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => particle.update(deltaTime));
        
        // Update emitters
        this.emitters = this.emitters.filter(emitter => {
            emitter.update(deltaTime);
            return emitter.active
        });
    }

    render(ctx) {
        // Sort particles by blend mode for better batching
        const particlesByBlendMode = {};
        this.particles.forEach(particle => {
            if (!particlesByBlendMode[particle.blendMode]) {
                particlesByBlendMode[particle.blendMode] = [];
            }
            particlesByBlendMode[particle.blendMode].push(particle);
        });
        
        // Render particles grouped by blend mode
        for (const [, particles] of Object.entries(particlesByBlendMode)) {
            particles.forEach(particle => particle.render(ctx));
        }
    }

    addParticle(particle) {
        this.particles.push(particle);
    }

    addEmitter(emitter) {
        this.emitters.push(emitter);
        emitter.system = this;
    }

    // Emit a burst of particles from an effect definition
    emit(x, y, effect = {}) {
        const count = Math.max(1, Math.round(((effect.emitRate || 4) / 60)));
        const angleMin = (effect.emitAngle && typeof effect.emitAngle.min === 'number') ? effect.emitAngle.min : 0;
        const angleMax = (effect.emitAngle && typeof effect.emitAngle.max === 'number') ? effect.emitAngle.max : Math.PI * 2;
        const spdMin = (effect.particleSpeed && typeof effect.particleSpeed.min === 'number') ? effect.particleSpeed.min : 20;
        const spdMax = (effect.particleSpeed && typeof effect.particleSpeed.max === 'number') ? effect.particleSpeed.max : 60;
        const sizeMin = (effect.particleSize && typeof effect.particleSize.min === 'number') ? effect.particleSize.min : 2;
        const sizeMax = (effect.particleSize && typeof effect.particleSize.max === 'number') ? effect.particleSize.max : 5;
        const lifeSec = typeof effect.particleLife === 'number' ? Math.max(0.05, effect.particleLife / 1000) : 0.4;
        let color = { r: 200, g: 200, b: 200 };
        let alpha = 0.6;
        if (typeof effect.particleColor === 'string') {
            const m = effect.particleColor.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)/i);
            if (m) {
                color = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
                alpha = (typeof m[4] !== 'undefined' && m[4] !== null) ? Number(m[4]) : 1;
            }
        }
        let seed = Number((globalThis.runSeedForVisuals ?? 1n) % 0xffffffffn) >>> 0;
        for (let i = 0; i < count; i++) {
            // cheap LCG
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const r1 = seed / 4294967296;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const r2 = seed / 4294967296;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const r3 = seed / 4294967296;
            const angle = angleMin + r1 * (angleMax - angleMin);
            const speed = spdMin + r2 * (spdMax - spdMin);
            const size = sizeMin + r3 * (sizeMax - sizeMin);
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size,
                life: lifeSec,
                alpha,
                gravity: typeof effect.gravity === 'number' ? effect.gravity : 0,
                alphaDecay: 0.96,
                sizeDecay: effect.expanding ? 1.02 : 0.98,
                glow: !!effect.expanding,
                blendMode: effect.expanding ? 'screen' : 'source-over'
            }));
        }
    }

    // Preset effects
    createBloodSplatter(x, y, direction = null) {
        const baseSeed = Number((globalThis.runSeedForVisuals ?? 1n) % 0xffffffffn);
        let seed = baseSeed >>> 0;
        const count = 15 + ((seed = (seed * 1664525 + 1013904223) >>> 0), (seed / 4294967296) * 10);
        const baseSpeed = 150;
        
        for (let i = 0; i < count; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const rA = seed / 4294967296;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const rB = seed / 4294967296;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const rC = seed / 4294967296;
            const angle = direction ? 
                direction + (rA - 0.5) * Math.PI * 0.5 :
                rA * Math.PI * 2;
            const speed = baseSpeed * (0.5 + rB * 0.5);
            const size = 2 + rC * 4;
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: { r: 180 + Math.floor(((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296) * 40), g: 0, b: 0 },
                size: size,
                life: 0.5 + (((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296)) * 0.5,
                gravity: 300,
                friction: 0.95,
                bounce: 0.3,
                alphaDecay: 0.95,
                sizeDecay: 0.98,
                trail: size > 3,
                blendMode: 'multiply'
            }));
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
            }));
        }
    }

    createHitSpark(x, y, color = { r: 255, g: 200, b: 100 }) {
        let seed = Number((globalThis.runSeedForVisuals ?? 1n) % 0xffffffffn) >>> 0;
        const count = 8 + (((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296) * 8);
        
        for (let i = 0; i < count; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const angle = (Math.PI * 2 * i) / count + (seed / 4294967296) * 0.5;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const speed = 200 + (seed / 4294967296) * 150;
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + (((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296) * 3),
                life: 0.2 + (((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296) * 0.3),
                alphaDecay: 0.92,
                sizeDecay: 0.95,
                glow: true,
                glowSize: 3,
                shape: 'star',
                blendMode: 'screen',
                trail: true
            }));
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
        }));
    }

    createDustCloud(x, y, radius = 30) {
        const count = 10 + Math.random() * 10;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;
            
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
            }));
        }
    }

    createRollDust(x, y, direction) {
        const count = 5;
        for (let i = 0; i < count; i++) {
            const offset = (i - count/2) * 10;
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
            ));
        }
    }

    createBlockSpark(x, y, angle) {
        // Directional sparks
        for (let i = 0; i < 12; i++) {
            const sparkAngle = angle + (Math.random() - 0.5) * Math.PI * 0.3;
            const speed = 250 + Math.random() * 150;
            
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
            }));
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
        }));
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
        }));
        
        // Ring of particles
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 300;
            
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
            }));
        }
    }

    createEnemyDeathExplosion(x, y) {
        // Main explosion
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            
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
            }));
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
            }));
        }
    }

    createFootstep(x, y, size = 1) {
        const count = 3;
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
            ));
        }
    }

    clear() {
        this.particles = [];
        this.emitters = [];
    }

    // Compatibility helpers used by other modules (e.g., player-animator)
    // These map high-level effect names to our existing particle primitives
    createSlashEffect(x, y, facing = 1) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const speed = 250 + Math.random() * 150;
            const spreadY = (Math.random() - 0.5) * 0.4;
            this.addParticle(new Particle(x, y + (Math.random() - 0.5) * 20, {
                vx: facing * speed + (Math.random() - 0.5) * 60,
                vy: spreadY * speed * 0.2,
                color: { r: 255, g: 230, b: 120 },
                size: 2 + Math.random() * 2,
                life: 0.25 + Math.random() * 0.2,
                alphaDecay: 0.92,
                sizeDecay: 0.96,
                glow: true,
                glowSize: 3,
                shape: 'star',
                blendMode: 'screen',
                trail: true
            }));
        }
        // Central flash
        this.addParticle(new Particle(x + facing * 10, y, {
            color: { r: 255, g: 255, b: 200 },
            size: 24,
            life: 0.12,
            alpha: 0.8,
            alphaDecay: 0.85,
            sizeDecay: 1.18,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }));
    }

    createShieldEffect(x, y) {
        const ring = 12;
        for (let i = 0; i < ring; i++) {
            const angle = (Math.PI * 2 * i) / ring;
            const speed = 120 + Math.random() * 80;
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: { r: 120, g: 180, b: 255 },
                size: 2,
                life: 0.25,
                alphaDecay: 0.92,
                sizeDecay: 0.98,
                glow: true,
                glowSize: 3,
                shape: 'circle',
                blendMode: 'screen'
            }));
        }
        // Soft protective flash
        this.addParticle(new Particle(x, y, {
            color: { r: 180, g: 220, b: 255 },
            size: 30,
            life: 0.18,
            alpha: 0.5,
            alphaDecay: 0.9,
            sizeDecay: 1.12,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }));
    }

    createBlockImpact(x, y) {
        this.createBlockSpark(x, y, 0);
    }

    createBloodEffect(x, y) {
        this.createBloodSplatter(x, y);
    }

    createDeathEffect(x, y) {
        this.createEnemyDeathExplosion(x, y);
    }

    createRespawnEffect(x, y) {
        this.createDustCloud(x, y, 40);
        this.addParticle(new Particle(x, y, {
            color: { r: 180, g: 255, b: 255 },
            size: 60,
            life: 0.4,
            alpha: 0.6,
            alphaDecay: 0.9,
            sizeDecay: 1.1,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }));
    }

    startChargingEffect(x, y) {
        const emitter = new ParticleEmitter(x, y, {
            emissionRate: 20,
            lifetime: 1.5,
            particleConfig: {
                color: { r: 120, g: 200, b: 255 },
                size: 3,
                life: 0.4,
                alpha: 0.7,
                alphaDecay: 0.94,
                sizeDecay: 0.98,
                glow: true,
                glowSize: 2,
                shape: 'circle',
                speed: 30,
                rotationSpeed: 3
            },
            spread: Math.PI * 2,
            direction: 0
        });
        this.addEmitter(emitter);
        return emitter
    }

    createChargedSlash(x, y, facing = 1, chargePercent = 0) {
        this.createSlashEffect(x, y, facing);
        const extra = Math.floor(6 * Math.max(0, Math.min(1, chargePercent)));
        for (let i = 0; i < extra; i++) {
            this.addParticle(new Particle(x, y + (Math.random() - 0.5) * 20, {
                vx: facing * (300 + Math.random() * 200),
                vy: (Math.random() - 0.5) * 40,
                color: { r: 255, g: 255, b: 180 },
                size: 3 + Math.random() * 2,
                life: 0.3,
                alphaDecay: 0.9,
                sizeDecay: 0.95,
                glow: true,
                glowSize: 3,
                shape: 'star',
                blendMode: 'screen',
                trail: true
            }));
        }
        // Bigger flash based on charge
        this.addParticle(new Particle(x + facing * 15, y, {
            color: { r: 255, g: 255, b: 220 },
            size: 30 + chargePercent * 20,
            life: 0.14 + chargePercent * 0.1,
            alpha: 0.85,
            alphaDecay: 0.88,
            sizeDecay: 1.2,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }));
    }

    createDashTrail(x, y, dirX = 1, dirY = 0) {
        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const nx = dirX / len;
        const ny = dirY / len;
        for (let i = 0; i < 4; i++) {
            this.addParticle(new Particle(
                x - nx * (10 + i * 3),
                y - ny * (10 + i * 3),
                {
                    vx: -nx * 80 + (Math.random() - 0.5) * 20,
                    vy: -ny * 80 + (Math.random() - 0.5) * 20,
                    color: { r: 200, g: 220, b: 255 },
                    size: 3,
                    life: 0.25,
                    alpha: 0.5,
                    alphaDecay: 0.9,
                    sizeDecay: 0.98,
                    glow: true,
                    glowSize: 2,
                    blendMode: 'screen'
                }
            ));
        }
    }

    createLandingImpact(x, y, strength = 1) {
        const radius = 30 + 40 * Math.max(0, Math.min(1, strength));
        this.createDustCloud(x, y, radius);
        // Quick flash at feet
        this.addParticle(new Particle(x, y, {
            color: { r: 255, g: 255, b: 255 },
            size: 20 * strength,
            life: 0.12,
            alpha: 0.6,
            alphaDecay: 0.88,
            sizeDecay: 1.2,
            glow: true,
            glowSize: 2,
            blendMode: 'screen'
        }));
    }

    createSparkle(x, y) {
        this.addParticle(new Particle(x, y, {
            color: { r: 255, g: 255, b: 200 },
            size: 3 + Math.random() * 2,
            life: 0.3,
            alpha: 0.9,
            alphaDecay: 0.92,
            sizeDecay: 0.97,
            glow: true,
            glowSize: 3,
            shape: 'star',
            blendMode: 'screen'
        }));
    }
}

// Enhanced Wolf Animation System
// Provides advanced animations, procedural movements, and visual effects for wolves


class WolfAnimationSystem {
    constructor() {
        // Animation definitions for different wolf states
        this.animations = new Map();
        this.proceduralAnimations = new Map();
        this.particleEffects = new Map();
        this._dt = 0;
        this.wasmModule = null; // To hold the WASM module instance
        
        this.initializeAnimations();
        this.initializeProceduralAnimations();
        this.initializeParticleEffects();
    }
    
    setWasmModule(wasmModule) {
        this.wasmModule = wasmModule;
    }
    
    // --- Helpers: seeded RNG, smoothing, math ---
    _seedWolf(wolf) {
        if (wolf._animSeed === null) {
            // Derive a stable-ish seed from existing visual-only properties
            const fx = Math.floor((wolf.position?.x || 0) * 1000) & 0xffff;
            const fy = Math.floor((wolf.position?.y || 0) * 1000) & 0xffff;
            const fp = Math.floor(((wolf.furPattern || 0.5) * 1e6)) & 0xffff;
            wolf._animSeed = ((fx << 16) ^ fy ^ (fp << 1)) >>> 0;
        }
        if (wolf._animRngState === null) { wolf._animRngState = wolf._animSeed >>> 0; }
    }
    _rand(wolf) {
        // xorshift32
        this._seedWolf(wolf);
        let x = wolf._animRngState | 0;
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        wolf._animRngState = x >>> 0;
        return (wolf._animRngState & 0xffffffff) / 0x100000000
    }
    _chance(wolf, p) { return this._rand(wolf) < p }
    _lerp(a, b, t) { return a + (b - a) * t }
    _smoothNumber(current, target, rate) {
        const dt = this._dt || 0.016;
        const t = Math.min(1, Math.max(0, rate * dt));
        return this._lerp(current, target, t)
    }
    _smoothProp(wolf, key, target, rate = 8) {
        const cur = wolf[key] !== null ? wolf[key] : target;
        wolf[key] = this._smoothNumber(cur, target, rate);
    }
    _updateSmoothedVelocity(wolf) {
        const vx = wolf.velocity?.x || 0;
        const vy = wolf.velocity?.y || 0;
        wolf._smVelX = this._smoothNumber(wolf._smVelX || 0, vx, 10);
        wolf._smVelY = this._smoothNumber(wolf._smVelY || 0, vy, 10);
    }
    
    initializeAnimations() {
        // Idle animation - subtle breathing and ear twitches
        this.animations.set('idle', {
            breathing: {
                amplitude: 2,
                frequency: 0.002,
                offset: 0
            },
            earTwitch: {
                probability: 0.001,
                duration: 300,
                maxRotation: 0.2
            },
            tailSway: {
                amplitude: 0.1,
                frequency: 0.003
            },
            blinking: {
                probability: 0.002,
                duration: 150
            }
        });
        
        // Walking animation
        this.animations.set('walking', {
            legCycle: {
                frequency: 0.008,
                amplitude: 8,
                phaseOffset: Math.PI
            },
            bodyBob: {
                amplitude: 2,
                frequency: 0.016
            },
            headBob: {
                amplitude: 1.5,
                frequency: 0.008
            },
            tailSway: {
                amplitude: 0.2,
                frequency: 0.008
            }
        });
        
        // Running animation
        this.animations.set('running', {
            legCycle: {
                frequency: 0.015,
                amplitude: 12,
                phaseOffset: Math.PI,
                stretchFactor: 1.2
            },
            bodyBob: {
                amplitude: 4,
                frequency: 0.03
            },
            headBob: {
                amplitude: 3,
                frequency: 0.015
            },
            tailStream: {
                amplitude: 0.4,
                frequency: 0.02,
                streamEffect: true
            },
            earsPinned: true
        });
        
        // Prowling animation (stalking)
        this.animations.set('prowling', {
            legCycle: {
                frequency: 0.004,
                amplitude: 5,
                phaseOffset: Math.PI,
                careful: true // Careful foot placement
            },
            bodyLowered: {
                lowerAmount: 10,
                sway: 1
            },
            headLowered: {
                lowerAmount: 5,
                scanning: true,
                scanSpeed: 0.002
            },
            tailStill: {
                tipTwitch: 0.01,
                frequency: 0.005
            },
            earsForward: {
                rotation: -0.3,
                alertness: 1.0
            }
        });
        
        // Lunging animation
        this.animations.set('lunging', {
            bodyStretch: {
                stretchFactor: 1.3,
                compressionStart: 0.8, // Compress before launch
                extensionPeak: 1.5
            },
            legsExtended: {
                frontExtension: 20,
                rearExtension: 15,
                clawsOut: true
            },
            mouthOpen: {
                openAmount: 0.8,
                teethVisible: true
            },
            earsBack: {
                rotation: 0.5
            },
            furRipple: {
                intensity: 0.3,
                speed: 0.02
            }
        });
        
        // Attacking animation
        this.animations.set('attacking', {
            biteSequence: [
                { jaw: 0, duration: 100 },
                { jaw: 0.9, duration: 50 },
                { jaw: 0.7, duration: 100 },
                { jaw: 0, duration: 150 }
            ],
            headShake: {
                amplitude: 5,
                frequency: 0.05
            },
            clawSwipe: {
                swipeSpeed: 0.03,
                swipeArc: Math.PI / 3
            },
            bodyTense: {
                tensionLevel: 0.8
            }
        });
        
        // Howling animation
        this.animations.set('howling', {
            headTilt: {
                startAngle: 0,
                endAngle: -Math.PI / 4,
                duration: 1000
            },
            mouthOpen: {
                openAmount: 0.6,
                vibration: 0.02
            },
            chestExpansion: {
                expansionAmount: 1.2,
                frequency: 0.003
            },
            tailRaised: {
                angle: 0.3
            },
            soundWaves: {
                frequency: 0.01,
                amplitude: 2,
                visible: true
            }
        });
        
        // Hurt animation
        this.animations.set('hurt', {
            flinch: {
                intensity: 10,
                duration: 200,
                direction: 'away'
            },
            earsFlat: {
                rotation: 0.6
            },
            tailTucked: {
                tuckAmount: 0.8
            },
            whimper: {
                mouthOpen: 0.2,
                duration: 300
            },
            bodyShake: {
                amplitude: 3,
                frequency: 0.1,
                dampening: 0.9
            }
        });
        
        // Death animation
        this.animations.set('death', {
            collapse: {
                stages: [
                    { legs: 'buckle', duration: 300 },
                    { body: 'fall', duration: 400 },
                    { final: 'limp', duration: 500 }
                ]
            },
            fadeOut: {
                startDelay: 1000,
                duration: 2000
            }
        });
    }
    
    initializeProceduralAnimations() {
        // Procedural leg movement system
        this.proceduralAnimations.set('legIK', {
            calculateLegPosition: (wolf, legIndex, time) => {
                const anim = this.animations.get(wolf.state);
                if (!anim || !anim.legCycle) {return { x: 0, y: 0 }}
                
                const cycle = anim.legCycle;
                const phase = legIndex % 2 === 0 ? 0 : cycle.phaseOffset;
                const t = time * cycle.frequency + phase;
                
                // Create realistic leg movement pattern
                const x = Math.sin(t) * cycle.amplitude * 0.5;
                const y = Math.max(0, Math.sin(t * 2)) * cycle.amplitude;
                
                // Add careful foot placement for prowling
                if (cycle.careful) {
                    return {
                        x: x * 0.5,
                        y: y * 0.7,
                        placement: 'careful'
                    }
                }
                
                return { x, y }
            }
        });
        
        // Procedural tail physics
        this.proceduralAnimations.set('tailPhysics', {
            segments: 5,
            calculateTailCurve: (wolf, time) => {
                const anim = this.animations.get(wolf.state);
                const segments = [];
                
                for (let i = 0; i < 5; i++) {
                    const delay = i * 0.1;
                    let angle = 0;
                    
                    if (anim?.tailSway) {
                        angle = Math.sin(time * anim.tailSway.frequency - delay) * 
                               anim.tailSway.amplitude * (1 - i * 0.15);
                    } else if (anim?.tailStream) {
                        // Streaming effect for running
                        angle = Math.sin(time * anim.tailStream.frequency - delay) * 
                               anim.tailStream.amplitude * (1 + i * 0.1);
                    } else if (anim?.tailTucked) {
                        angle = anim.tailTucked.tuckAmount * (1 + i * 0.2);
                    }
                    
                    segments.push({
                        angle,
                        length: 8 - i * 0.5
                    });
                }
                
                return segments
            }
        });
        
        // Procedural fur animation
        this.proceduralAnimations.set('furDynamics', {
            calculateFurMovement: (wolf, time, windStrength = 0) => {
                const speed = Math.sqrt(wolf.velocity.x ** 2 + wolf.velocity.y ** 2);
                const windEffect = Math.sin(time * 0.005) * windStrength;
                
                return {
                    ripple: speed > 200 ? Math.sin(time * 0.02) * 0.2 : 0,
                    flow: windEffect + (speed / 1000),
                    ruffled: wolf.state === 'hurt' || wolf.state === 'attacking'
                }
            }
        });
        
        // Procedural breathing
        this.proceduralAnimations.set('breathing', {
            calculateBreathing: (wolf, time) => {
                const baseRate = 0.002;
                const stateMultiplier = {
                    idle: 1,
                    walking: 1.2,
                    running: 2,
                    prowling: 0.8,
                    attacking: 1.5,
                    hurt: 1.8,
                    howling: 1.3
                };
                
                const rate = baseRate * (stateMultiplier[wolf.state] || 1);
                const depth = wolf.state === 'running' ? 4 : 2;
                
                return {
                    chestExpansion: Math.sin(time * rate) * depth,
                    bellyExpansion: Math.sin(time * rate - 0.2) * depth * 0.7
                }
            }
        });
    }
    
    initializeParticleEffects() {
        // Dust particles for running
        this.particleEffects.set('runDust', {
            emitRate: 5,
            particleLife: 500,
            particleSpeed: { min: 20, max: 50 },
            particleSize: { min: 2, max: 5 },
            particleColor: 'rgba(139, 115, 85, 0.4)',
            emitAngle: { min: Math.PI * 0.4, max: Math.PI * 0.6 },
            gravity: 50
        });
        
        // Blood particles for attacks
        this.particleEffects.set('bloodSplatter', {
            emitRate: 20,
            particleLife: 800,
            particleSpeed: { min: 100, max: 200 },
            particleSize: { min: 1, max: 3 },
            particleColor: 'rgba(139, 0, 0, 0.7)',
            emitAngle: { min: 0, max: Math.PI * 2 },
            gravity: 200
        });
        
        // Saliva/foam for attacking
        this.particleEffects.set('attackFoam', {
            emitRate: 8,
            particleLife: 300,
            particleSpeed: { min: 50, max: 100 },
            particleSize: { min: 1, max: 2 },
            particleColor: 'rgba(255, 255, 255, 0.6)',
            emitAngle: { min: -Math.PI / 6, max: Math.PI / 6 },
            gravity: 100
        });
        
        // Sound waves for howling
        this.particleEffects.set('soundWaves', {
            emitRate: 2,
            particleLife: 1500,
            particleSpeed: { min: 100, max: 100 },
            particleSize: { min: 20, max: 40 },
            particleColor: 'rgba(255, 255, 255, 0.2)',
            emitAngle: { min: -Math.PI / 8, max: Math.PI / 8 },
            gravity: 0,
            expanding: true
        });
    }
    
    // Apply animation to wolf
    applyAnimation(wolf, deltaTime) {
        if (!this.wasmModule) { return } // Ensure WASM module is loaded
        this._dt = deltaTime;

        // Find the index of this wolf in the WASM enemies array
        // This assumes a direct mapping from the JS wolf object to the WASM enemy array index
        // In a more complex scenario, you might need a lookup table or pass the index from WASM
        const wolfIndex = wolf.id; // Assuming wolf.id corresponds to WASM enemy array index
        // Check if wolf animation is active with safety check
        const isActive = typeof this.wasmModule.get_wolf_anim_active === 'function' ? 
            this.wasmModule.get_wolf_anim_active(wolfIndex) : false;
        if (!isActive) { return } // Only animate active wolves

        const time = (typeof globalThis.wasmExports?.get_time_seconds === 'function') 
            ? globalThis.wasmExports.get_time_seconds() 
            : performance.now() / 1000;
        const state = wolf.state;
        const animation = this.animations.get(state);
        
        if (!animation) {return}
        
        // Track state transitions for gentle blend-in
        if (wolf._lastAnimState !== state) {
            wolf._lastAnimState = state;
            wolf._stateBlend = 0;
        }
        wolf._stateBlend = Math.min(1, (wolf._stateBlend || 0) + deltaTime * 6);
        
        // Smooth velocity for secondary motion
        this._updateSmoothedVelocity(wolf);
        
        // Apply procedural animations (now fetching from WASM)
        this.applyProceduralAnimations(wolf, wolfIndex, time);
        
        // Apply state-specific animations
        switch (state) {
            case 'idle':
                this.applyIdleAnimation(wolf, animation, time);
                break
            case 'walking':
            case 'running':
                this.applyLocomotionAnimation(wolf, animation, time);
                break
            case 'prowling':
                this.applyProwlingAnimation(wolf, animation, time);
                break
            case 'lunging':
                this.applyLungingAnimation(wolf, animation, time);
                break
            case 'attacking':
                this.applyAttackingAnimation(wolf, animation, time);
                break
            case 'howling':
                this.applyHowlingAnimation(wolf, animation, time);
                break
            case 'hurt':
                this.applyHurtAnimation(wolf, animation, time);
                break
        }
        
        // Update particle effects
        this.updateParticleEffects(wolf, deltaTime);
    }
    
    applyProceduralAnimations(wolf, wolfIndex, time) {
        if (!this.wasmModule) { return }

        // Get procedural animation data from WASM with safety checks
        const animData = {
            active: typeof this.wasmModule.get_wolf_anim_active === 'function' ? 
                this.wasmModule.get_wolf_anim_active(wolfIndex) : false,
            leg_x: [
                typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_x(wolfIndex, 0) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_x(wolfIndex, 1) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_x(wolfIndex, 2) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_x(wolfIndex, 3) : 0
            ],
            leg_y: [
                typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_y(wolfIndex, 0) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_y(wolfIndex, 1) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_y(wolfIndex, 2) : 0,
                typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_y(wolfIndex, 3) : 0
            ],
            spine_bend: typeof this.wasmModule.get_wolf_anim_spine_bend === 'function' ? 
                this.wasmModule.get_wolf_anim_spine_bend(wolfIndex) : 0,
            tail_angle: typeof this.wasmModule.get_wolf_anim_tail_angle === 'function' ? 
                this.wasmModule.get_wolf_anim_tail_angle(wolfIndex) : 0,
            head_pitch: typeof this.wasmModule.get_wolf_anim_head_pitch === 'function' ? 
                this.wasmModule.get_wolf_anim_head_pitch(wolfIndex) : 0,
            head_yaw: typeof this.wasmModule.get_wolf_anim_head_yaw === 'function' ? 
                this.wasmModule.get_wolf_anim_head_yaw(wolfIndex) : 0,
            ear_rotation: [
                typeof this.wasmModule.get_wolf_anim_ear_rotation === 'function' ? 
                    this.wasmModule.get_wolf_anim_ear_rotation(wolfIndex, 0) : 0,
                typeof this.wasmModule.get_wolf_anim_ear_rotation === 'function' ? 
                    this.wasmModule.get_wolf_anim_ear_rotation(wolfIndex, 1) : 0
            ],
            body_stretch: typeof this.wasmModule.get_wolf_anim_body_stretch === 'function' ? 
                this.wasmModule.get_wolf_anim_body_stretch(wolfIndex) : 1,
            body_offset_y: typeof this.wasmModule.get_wolf_anim_body_offset_y === 'function' ? 
                this.wasmModule.get_wolf_anim_body_offset_y(wolfIndex) : 0,
            fur_ruffle: typeof this.wasmModule.get_wolf_anim_fur_ruffle === 'function' ? 
                this.wasmModule.get_wolf_anim_fur_ruffle(wolfIndex) : 0,
        };

        // Update wolf object with WASM data
        wolf.legPositions = animData.leg_x.map((x, i) => ({ x, y: animData.leg_y[i] }));
        wolf.spineBend = animData.spine_bend;
        wolf.tailPosition = animData.tail_angle; // Using existing property for now
        wolf.headPitch = animData.head_pitch;
        wolf.headYaw = animData.head_yaw;
        wolf.earRotation = animData.ear_rotation[0]; // Using one ear rotation for simplicity
        wolf.bodyStretch = animData.body_stretch;
        wolf.bodyBob = animData.body_offset_y; // Using existing property for now
        wolf.furMovement = { ripple: animData.fur_ruffle, flow: 0, ruffled: animData.fur_ruffle > 0.05 }; // Map to existing furMovement structure

        // The old procedural animations are now driven by WASM, so these can be removed/modified
        // Apply breathing (still JS-driven for now)
        const breathing = this.proceduralAnimations.get('breathing');
        const breath = breathing.calculateBreathing(wolf, time);
        wolf.breathingOffset = breath.chestExpansion;
        wolf.bellyOffset = breath.bellyExpansion;
    }
    
    applyIdleAnimation(wolf, animation, time) {
        // Ear twitching (can be driven by WASM ear_rotation)
        this._smoothProp(wolf, 'earRotation', wolf.earRotation || 0, 8); // Use WASM data
        
        // Blinking
        if (this._chance(wolf, animation.blinking.probability)) {
            wolf.blinkTime = time;
            wolf.blinkDuration = animation.blinking.duration;
        }
        
        wolf.isBlinking = wolf.blinkTime && time - wolf.blinkTime < wolf.blinkDuration;
    }
    
    applyLocomotionAnimation(wolf, animation, _time) {
        // Leg animation is now driven by WASM `wolf.legPositions`
        // Body bobbing (can be driven by WASM body_offset_y)
        this._smoothProp(wolf, 'bodyBob', wolf.bodyBob || 0, 10); // Use WASM data
        this._smoothProp(wolf, 'headBob', wolf.headBob || 0, 10); // Placeholder, WASM head_pitch/yaw will be more direct
        
        // Ears pinned back when running fast (can be driven by WASM ear_rotation)
        if (animation.earsPinned) {
            this._smoothProp(wolf, 'earRotation', wolf.earRotation || 0.4, 12); // Use WASM data
        }
    }
    
    applyProwlingAnimation(wolf, animation, time) {
        // Lower body position (can be driven by WASM body_offset_y)
        this._smoothProp(wolf, 'bodyLowered', (wolf.bodyBob || 0) * 1000, 10); // Map bodyBob to bodyLowered
        this._smoothProp(wolf, 'bodySway', Math.sin(time * 0.002) * 1, 10); // Retain JS sway for now
        
        // Head scanning movement (can be driven by WASM head_yaw)
        if (animation.headLowered.scanning) {
            wolf.headScan = wolf.headYaw; // Use WASM data
        }
        
        // Alert ears (can be driven by WASM ear_rotation)
        this._smoothProp(wolf, 'earRotation', wolf.earRotation || 0, 10); // Use WASM data
        this._smoothProp(wolf, 'earAlertness', wolf.earRotation ? 1 : 0, 10); // Map earRotation to alertness
        
        // Careful leg placement is now driven by WASM `wolf.legPositions`
    }
    
    applyLungingAnimation(wolf, animation, _time) {
        // Body stretch effect is now driven by WASM `wolf.bodyStretch`
        this._smoothProp(wolf, 'bodyStretch', wolf.bodyStretch || 1, 14); // Use WASM data
        
        // Legs extended
        wolf.frontLegExtension = (wolf.bodyStretch - 1) * 20; // Derive from WASM stretch
        wolf.rearLegExtension = (wolf.bodyStretch - 1) * 15; // Derive from WASM stretch
        wolf.clawsOut = wolf.bodyStretch > 1.1; // Derive from WASM stretch
        
        // Mouth open with teeth
        wolf.mouthOpen = animation.mouthOpen.openAmount; // Still JS-driven
        wolf.teethVisible = animation.mouthOpen.teethVisible; // Still JS-driven
        
        // Fur ripple effect (now driven by WASM fur_ruffle)
        wolf.furRipple = wolf.furMovement?.ripple || 0;
    }
    
    applyAttackingAnimation(wolf, animation, time) {
        // Bite sequence (still JS-driven for now)
        if (!wolf.biteSequenceIndex) {wolf.biteSequenceIndex = 0;}
        if (!wolf.biteSequenceTime) {wolf.biteSequenceTime = time;}
        
        const currentBite = animation.biteSequence[wolf.biteSequenceIndex];
        const elapsed = time - wolf.biteSequenceTime;
        
        if (elapsed < currentBite.duration) {
            wolf.jawOpen = currentBite.jaw;
        } else {
            wolf.biteSequenceIndex = (wolf.biteSequenceIndex + 1) % animation.biteSequence.length;
            wolf.biteSequenceTime = time;
        }
        
        // Head shake (can be driven by WASM head_yaw/pitch or new shake param)
        this._smoothProp(wolf, 'headShake', Math.sin(time * animation.headShake.frequency) * animation.headShake.amplitude, 18);
        
        // Body tension (can be driven by WASM body_stretch/fur_ruffle)
        wolf.bodyTension = animation.bodyTense.tensionLevel;
    }
    
    applyHowlingAnimation(wolf, animation, time) {
        if (!wolf.howlStartTime) {wolf.howlStartTime = time;}
        
        Math.min((time - wolf.howlStartTime) / animation.headTilt.duration, 1);
        
        // Head tilting back (can be driven by WASM head_pitch)
        wolf.headTilt = wolf.headPitch; // Use WASM data
        
        // Mouth vibration (still JS-driven)
        wolf.mouthOpen = animation.mouthOpen.openAmount;
        wolf.mouthVibration = Math.sin(time * 0.05) * animation.mouthOpen.vibration;
        
        // Chest expansion for breath (still JS-driven for now)
        this._smoothProp(wolf, 'chestExpansion', 1 + Math.sin(time * animation.chestExpansion.frequency) * 
                             (animation.chestExpansion.expansionAmount - 1), 10);
        
        // Sound wave effect (still JS-driven)
        if (animation.soundWaves.visible) {
            wolf.soundWavePhase = time * animation.soundWaves.frequency;
            wolf.soundWaveAmplitude = animation.soundWaves.amplitude;
        }
    }
    
    applyHurtAnimation(wolf, animation, time) {
        if (!wolf.hurtStartTime) {wolf.hurtStartTime = time;}
        
        const hurtElapsed = time - wolf.hurtStartTime;
        
        // Flinch effect (still JS-driven)
        if (hurtElapsed < animation.flinch.duration) {
            const flinchProgress = hurtElapsed / animation.flinch.duration;
            wolf.flinchOffset = animation.flinch.intensity * (1 - flinchProgress);
        }
        
        // Body shake with dampening (still JS-driven)
        const shakeFactor = animation.bodyShake.dampening**(hurtElapsed / 100);
        this._smoothProp(wolf, 'bodyShake', Math.sin(time * animation.bodyShake.frequency) * 
                        animation.bodyShake.amplitude * shakeFactor, 18);
        
        // Ears and tail position (can be driven by WASM ear_rotation/tail_angle)
        this._smoothProp(wolf, 'earRotation', wolf.earRotation || animation.earsFlat.rotation, 14); // Use WASM data
        this._smoothProp(wolf, 'tailTucked', wolf.tailPosition || animation.tailTucked.tuckAmount, 14); // Use WASM data
    }
    
    updateParticleEffects(wolf, deltaTime) {
        if (!wolf.particleSystem) {
            wolf.particleSystem = new ParticleSystem();
        }
        
        // Emit dust when running
        if (wolf.state === 'running' && wolf.isGrounded) {
            const dustEffect = this.particleEffects.get('runDust');
            const ex = wolf.position.x - wolf.facing * 20;
            const ey = wolf.position.y + wolf.height / 2;
            if (typeof wolf.particleSystem.emit === 'function') {
                wolf.particleSystem.emit(ex, ey, dustEffect);
            } else if (typeof wolf.particleSystem.createDustCloud === 'function') {
                wolf.particleSystem.createDustCloud(ex, ey, 20);
            }
        }
        
        // Emit sound waves when howling
        if (wolf.state === 'howling') {
            const soundEffect = this.particleEffects.get('soundWaves');
            const ex = wolf.position.x + wolf.facing * 30;
            const ey = wolf.position.y - wolf.height / 4;
            if (typeof wolf.particleSystem.emit === 'function') {
                wolf.particleSystem.emit(ex, ey, soundEffect);
            } else if (typeof wolf.particleSystem.createSparkle === 'function') {
                wolf.particleSystem.createSparkle(ex, ey);
            }
        }
        
        // Update all particles
        wolf.particleSystem.update(deltaTime);
    }
    
    // Enhanced rendering with all animation effects
    renderAnimatedWolf(ctx, wolf, camera) {
        // Performance optimization: Check if wolf should be rendered
        const distance = Math.sqrt(
            (wolf.position.x - camera.x) ** 2 + 
            (wolf.position.y - camera.y) ** 2
        );
        
        // LOD-based rendering optimization
        if (distance > 1500) {return;} // Don't render very distant wolves
        
        const isDetailed = distance < 500;
        const isReduced = distance < 1000;
        
        ctx.save();
        
        // Calculate screen position
        const screenX = wolf.position.x - camera.x;
        const screenY = wolf.position.y - camera.y;
        
        // Apply transformations
        ctx.translate(screenX, screenY);
        
        // Secondary motion from smoothed velocity
        const svx = wolf._smVelX || 0;
        const svy = wolf._smVelY || 0;
        const speed = Math.sqrt(svx * svx + svy * svy);
        const leanAngle = wolf.spineBend || 0; // Use WASM spine_bend
        if (leanAngle) { ctx.rotate(leanAngle); }
        
        // Apply body stretch for lunging
        const runStretch = 1 + Math.min(speed / (wolf.maxSpeed || 350), 1) * 0.05;
        const stretchX = (wolf.bodyStretch || 1) * runStretch;
        const stretchY = 2 - stretchX; // Inverse stretch to maintain volume
        ctx.scale(wolf.size * wolf.facing * stretchX, wolf.size * stretchY);
        
        // Apply body shake for hurt animation
        if (wolf.bodyShake) {
            ctx.translate(wolf.bodyShake, 0);
        }
        
        // Apply flinch offset
        if (wolf.flinchOffset) {
            ctx.translate(-wolf.facing * wolf.flinchOffset, -wolf.flinchOffset * 0.5);
        }
        
        // Draw shadow with animation (skip for distant wolves)
        if (isReduced) {
            this.drawAnimatedShadow(ctx, wolf);
        }
        
        // Draw animated body parts with LOD
        if (isDetailed) {
            // Full detail rendering
            this.drawAnimatedTail(ctx, wolf);
            this.drawAnimatedLegs(ctx, wolf, 'hind');
            this.drawAnimatedBody(ctx, wolf);
            this.drawAnimatedLegs(ctx, wolf, 'front');
            this.drawAnimatedNeck(ctx, wolf);
            this.drawAnimatedHead(ctx, wolf);
        } else if (isReduced) {
            // Reduced detail rendering - skip some parts
            this.drawAnimatedBody(ctx, wolf);
            this.drawAnimatedHead(ctx, wolf);
        } else {
            // Minimal detail - just basic shape
            this.drawSimplifiedWolf(ctx, wolf);
        }
        
        // Draw particle effects only for nearby wolves
        if (isDetailed && wolf.particleSystem) {
            wolf.particleSystem.render(ctx, camera);
        }
        
        // Draw UI elements only for close wolves
        if (isReduced) {
            this.drawWolfUI(ctx, wolf);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw simplified wolf for distant LOD
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} wolf - Wolf object
     */
    drawSimplifiedWolf(ctx, wolf) {
        // Draw simple wolf shape for distant rendering
        ctx.fillStyle = wolf.color || '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, 0, wolf.size * 20, wolf.size * 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple head
        ctx.beginPath();
        ctx.ellipse(wolf.facing * wolf.size * 15, -wolf.size * 8, wolf.size * 8, wolf.size * 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawAnimatedShadow(ctx, wolf) {
        const speed = Math.sqrt((wolf._smVelX||0)**2 + (wolf._smVelY||0)**2);
        const moveScale = 1 + Math.min(speed / (wolf.maxSpeed || 350), 1) * 0.15;
        const shadowScale = wolf.state === 'lunging' ? 1.2 * moveScale : moveScale;
        const shadowAlpha = wolf.isGrounded ? 0.32 : 0.12;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, wolf.height / 2 + 5, wolf.width / 3 * shadowScale, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawAnimatedTail(ctx, wolf) {
        ctx.save();
        
        // Base tail position
        const baseTailX = -wolf.width * 0.35;
        let baseTailY = -wolf.height * 0.1;
        
        // Adjust for body lowered (prowling)
        if (wolf.bodyLowered) {
            baseTailY += wolf.bodyLowered * 0.5;
        }
        
        ctx.translate(baseTailX, baseTailY);
        
        // Draw segmented tail with physics
        if (wolf.tailSegments) {
            let currentX = 0;
            let currentY = 0;
            let currentAngle = wolf.tailPosition || 0; // Use WASM tail_angle
            
            wolf.tailSegments.forEach((segment, i) => {
                ctx.save();
                ctx.translate(currentX, currentY);
                ctx.rotate(currentAngle + segment.angle);
                
                // Tail segment
                const segmentWidth = 8 - i * 1.2;
                const segmentLength = segment.length;
                
                ctx.fillStyle = i % 2 === 0 ? wolf.colors.primary : wolf.colors.secondary;
                ctx.fillRect(0, -segmentWidth/2, segmentLength, segmentWidth);
                
                // Update position for next segment
                currentX += Math.cos(currentAngle + segment.angle) * segmentLength;
                currentY += Math.sin(currentAngle + segment.angle) * segmentLength;
                currentAngle += segment.angle;
                
                ctx.restore();
            });
        } else {
            // Fallback simple tail
            ctx.rotate(wolf.tailPosition || 0);
            ctx.fillStyle = wolf.colors.primary;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-15, 5, -25, 15);
            ctx.quadraticCurveTo(-20, 20, -10, 18);
            ctx.quadraticCurveTo(-5, 10, 0, 0);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawAnimatedLegs(ctx, wolf, type) {
        const legPositions = wolf.legPositions || []; // Now populated from WASM
        const isHind = type === 'hind';
        const startIndex = isHind ? 0 : 2;
        
        for (let i = startIndex; i < startIndex + 2; i++) {
            const legPos = legPositions[i] || { x: 0, y: 0 };
            const baseX = isHind ? 
                -wolf.width * (0.25 - (i % 2) * 0.1) : 
                wolf.width * (0.15 + (i % 2) * 0.1);
            const baseY = wolf.height * 0.2;
            
            ctx.save();
            ctx.translate(baseX + legPos.x * 100, baseY + legPos.y * 100); // Scale WASM values
            
            // Upper leg
            ctx.fillStyle = wolf.colors.primary;
            ctx.fillRect(0, 0, 10, 15 - legPos.y * 50); // Adjust size based on WASM y-pos
            
            // Lower leg
            ctx.translate(0, 15 - legPos.y * 50);
            ctx.rotate(legPos.y * 0.05); // Slight rotation based on movement
            ctx.fillRect(0, 0, 8, 10 + legPos.y * 50);
            
            // Paw
            ctx.translate(0, 10 + legPos.y * 50);
            ctx.fillStyle = wolf.colors.secondary;
            ctx.fillRect(-1, 0, 10, 5);
            
            // Claws (visible when attacking or lunging)
            if (wolf.clawsOut) {
                ctx.fillStyle = wolf.colors.claws;
                for (let j = 0; j < 3; j++) {
                    ctx.fillRect(j * 3, 4, 2, 4);
                }
            }
            
            ctx.restore();
        }
    }
    
    drawAnimatedBody(ctx, wolf) {
        ctx.save();
        
        // Apply body lowered for prowling (now driven by WASM bodyBob)
        if (wolf.bodyBob) {
            ctx.translate(0, wolf.bodyBob * 100); // Scale WASM body_offset_y
        }
        
        // Apply body bob for movement (now directly from WASM bodyBob)
        // No longer need separate wolf.bodyLowered, consolidate to wolf.bodyBob
        
        // Main body with breathing
        const breathY = wolf.breathingOffset || 0;
        const chestExpansion = wolf.chestExpansion || 1;
        
        ctx.fillStyle = wolf.colors.primary;
        ctx.beginPath();
        ctx.ellipse(0, breathY, wolf.width * 0.35 * chestExpansion * (wolf.bodyStretch || 1), wolf.height * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly with separate breathing
        const bellyY = breathY + (wolf.bellyOffset || 0);
        ctx.fillStyle = wolf.colors.belly;
        ctx.beginPath();
        ctx.ellipse(0, bellyY + wolf.height * 0.1, wolf.width * 0.3 * (wolf.bodyStretch || 1), wolf.height * 0.15, 0, 0, Math.PI);
        ctx.fill();
        
        // Animated fur texture
        if (wolf.furMovement) {
            this.drawAnimatedFur(ctx, wolf, 0, breathY, wolf.width * 0.35, wolf.height * 0.25);
        }
        
        ctx.restore();
    }
    
    drawAnimatedNeck(ctx, wolf) {
        ctx.save();
        
        // Apply head bob (now derived from WASM body_offset_y)
        if (wolf.bodyBob) {
            ctx.translate(0, wolf.bodyBob * 50); // Scale WASM body_offset_y
        }
        
        ctx.fillStyle = wolf.colors.primary;
        ctx.beginPath();
        ctx.moveTo(wolf.width * 0.15, -wolf.height * 0.1);
        ctx.quadraticCurveTo(wolf.width * 0.25, -wolf.height * 0.05, wolf.width * 0.3, -wolf.height * 0.15);
        ctx.quadraticCurveTo(wolf.width * 0.25, wolf.height * 0.05, wolf.width * 0.15, wolf.height * 0.1);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawAnimatedHead(ctx, wolf) {
        ctx.save();
        ctx.translate(wolf.width * 0.35, -wolf.height * 0.15);
        
        // Apply head tilt for howling (now driven by WASM head_pitch)
        if (wolf.headPitch) {
            ctx.rotate(wolf.headPitch);
        }
        
        // Apply head shake for attacking (still JS-driven for now)
        if (wolf.headShake) {
            ctx.translate(wolf.headShake, 0);
        }
        
        // Apply head scan for prowling (now driven by WASM head_yaw)
        if (wolf.headYaw) {
            ctx.rotate(wolf.headYaw);
        }
        
        // Apply head bob (now derived from WASM body_offset_y)
        if (wolf.bodyBob) {
            ctx.translate(0, wolf.bodyBob * 50); // Scale WASM body_offset_y
        }
        
        // Head shape
        ctx.fillStyle = wolf.colors.primary;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, -5, 15, 0);
        ctx.quadraticCurveTo(20, 3, 25, 5);
        ctx.lineTo(28, 8);
        ctx.quadraticCurveTo(25, 10, 20, 10);
        ctx.quadraticCurveTo(10, 8, 0, 10);
        ctx.quadraticCurveTo(-5, 5, 0, 0);
        ctx.fill();
        
        // Animated ears
        this.drawAnimatedEars(ctx, wolf);
        
        // Animated mouth
        this.drawAnimatedMouth(ctx, wolf);
        
        // Animated eyes
        this.drawAnimatedEyes(ctx, wolf);
        
        // Sound waves for howling
        if (wolf.soundWavePhase !== null) {
            this.drawSoundWaves(ctx, wolf);
        }
        
        ctx.restore();
    }
    
    drawAnimatedEars(ctx, wolf) {
        const baseRotation = wolf.earRotation || 0; // Use WASM ear_rotation
        const alertness = wolf.earAlertness || 0;
        
        // Left ear
        ctx.save();
        ctx.translate(5, -3);
        ctx.rotate(baseRotation - alertness * 0.1);
        
        ctx.fillStyle = wolf.colors.primary;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-3, -8 - alertness * 2);
        ctx.lineTo(3, -8 - alertness * 2);
        ctx.closePath();
        ctx.fill();
        
        // Inner ear
        ctx.fillStyle = wolf.colors.belly;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(-1, -6 - alertness);
        ctx.lineTo(1, -6 - alertness);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Right ear
        ctx.save();
        ctx.translate(8, -2);
        ctx.rotate(baseRotation + alertness * 0.1);
        
        ctx.fillStyle = wolf.colors.secondary;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-2, -7 - alertness * 2);
        ctx.lineTo(3, -7 - alertness * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    drawAnimatedMouth(ctx, wolf) {
        const mouthOpen = wolf.mouthOpen || wolf.jawOpen || 0;
        const mouthVibration = wolf.mouthVibration || 0;
        
        // Snout
        ctx.fillStyle = wolf.colors.secondary;
        ctx.beginPath();
        ctx.moveTo(20, 5);
        ctx.quadraticCurveTo(25, 6, 28, 8);
        ctx.quadraticCurveTo(25, 9 + mouthOpen * 3, 20, 9 + mouthOpen * 3);
        ctx.fill();
        
        // Open mouth
        if (mouthOpen > 0) {
            // Jaw
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.moveTo(20, 9);
            ctx.quadraticCurveTo(24, 9 + mouthOpen * 5 + mouthVibration, 
                                 28, 9 + mouthOpen * 3 + mouthVibration);
            ctx.quadraticCurveTo(24, 11 + mouthOpen * 5 + mouthVibration, 
                                 20, 11 + mouthOpen * 5);
            ctx.fill();
            
            // Teeth
            if (wolf.teethVisible || mouthOpen > 0.5) {
                ctx.fillStyle = '#ffffff';
                
                // Upper fangs
                ctx.beginPath();
                ctx.moveTo(22, 9);
                ctx.lineTo(21, 11 + mouthOpen * 2);
                ctx.lineTo(23, 11 + mouthOpen * 2);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(25, 9);
                ctx.lineTo(24, 11 + mouthOpen * 2);
                ctx.lineTo(26, 11 + mouthOpen * 2);
                ctx.closePath();
                ctx.fill();
                
                // Lower fangs
                if (mouthOpen > 0.7) {
                    ctx.beginPath();
                    ctx.moveTo(23, 11 + mouthOpen * 4);
                    ctx.lineTo(22, 9 + mouthOpen * 4);
                    ctx.lineTo(24, 9 + mouthOpen * 4);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            
            // Tongue
            if (mouthOpen > 0.3 && wolf.state !== 'attacking') {
                ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
                ctx.beginPath();
                ctx.ellipse(24, 10 + mouthOpen * 3, 3, 2 + mouthOpen * 2, 0.2, 0, Math.PI);
                ctx.fill();
            }
        }
        
        // Nose
        ctx.fillStyle = wolf.colors.nose;
        ctx.beginPath();
        ctx.arc(28, 8, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawAnimatedEyes(ctx, wolf) {
        // Check if blinking
        if (wolf.isBlinking) {
            // Closed eye line
            ctx.strokeStyle = wolf.colors.secondary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, 3);
            ctx.lineTo(16, 3);
            ctx.stroke();
            return
        }
        
        // Eye glow effect
        if (wolf.state === 'prowling' || wolf.state === 'lunging' || wolf.state === 'attacking') {
            ctx.shadowColor = wolf.colors.eyes;
            ctx.shadowBlur = 8;
        }
        
        // Eye white
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(12, 3, 4, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Iris with dynamic size
        const pupilDilation = wolf.state === 'attacking' ? 0.7 : 
                             wolf.state === 'prowling' ? 0.5 : 0.3;
        ctx.fillStyle = wolf.colors.eyes;
        ctx.beginPath();
        ctx.arc(13, 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(13.5, 3, 1 * (1 - pupilDilation), 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(12, 2, 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
    
    drawAnimatedFur(ctx, wolf, x, y, width, height) {
        ctx.strokeStyle = wolf.colors.secondary;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.4;
        
        const furLines = 12;
        const ripple = (wolf.furMovement?.ripple || 0) + wolf.furRuffle; // Use WASM fur_ruffle
        const flow = wolf.furMovement?.flow || 0;
        const ruffled = wolf.furMovement?.ruffled || false;
        
        for (let i = 0; i < furLines; i++) {
            const angle = (i / furLines) * Math.PI * 2;
            const baseX = x + Math.cos(angle) * width * 0.7;
            const baseY = y + Math.sin(angle) * height * 0.7;
            
            // Add movement to fur
            const offsetX = Math.sin(wolf.animationTime * 0.01 + i) * ripple * 10;
            const offsetY = Math.cos(wolf.animationTime * 0.01 + i) * ripple * 5;
            
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            
            if (ruffled) {
                // Spiky fur when agitated
                ctx.lineTo(baseX + Math.cos(angle) * 8 + offsetX, 
                          baseY + Math.sin(angle) * 8 + offsetY);
            } else {
                // Smooth fur
                ctx.quadraticCurveTo(
                    baseX + Math.cos(angle) * 4 + offsetX * 0.5,
                    baseY + Math.sin(angle) * 4 + offsetY * 0.5,
                    baseX + Math.cos(angle + flow) * 6 + offsetX,
                    baseY + Math.sin(angle + flow) * 6 + offsetY
                );
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawSoundWaves(ctx, wolf) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = wolf.colors.eyes;
        ctx.lineWidth = 2;
        
        // Draw expanding circular waves
        for (let i = 0; i < 3; i++) {
            const phase = wolf.soundWavePhase + i * Math.PI / 3;
            const radius = 10 + Math.sin(phase) * wolf.soundWaveAmplitude + i * 15;
            const alpha = 0.3 - i * 0.1;
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(30, 5, radius, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawWolfUI(ctx, wolf) {
        // Draw health bar for special wolves
        if (wolf.isAlpha || wolf.health < wolf.maxHealth) {
            ctx.save();
            ctx.scale(1 / wolf.size, 1 / wolf.size);
            
            const barWidth = 60;
            const barHeight = 6;
            const barY = -wolf.height * 0.5 - 20;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
            
            // Health
            const healthPercent = wolf.health / wolf.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : 
                           healthPercent > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
            
            // Border
            ctx.strokeStyle = wolf.isAlpha ? '#ffd700' : '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
            
            // Status icons
            if (wolf.isAlpha) {
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('👑', 0, barY - 5);
            }
            
            // State indicator
            if (wolf.state === 'prowling') {
                ctx.fillText('👁', -35, barY + 5);
            } else if (wolf.state === 'howling') {
                ctx.fillText('🔊', -35, barY + 5);
            }
            
            ctx.restore();
        }
        
        // Draw charge indicator for lunge
        if (wolf.lungeState?.charging) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            
            const chargePercent = wolf.lungeState.chargeTime / wolf.lungeState.maxChargeTime;
            const indicatorRadius = 15;
            
            // Charging circle
            ctx.strokeStyle = `hsl(${chargePercent * 60}, 100%, 50%)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -wolf.height * 0.7, indicatorRadius, 
                   -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargePercent);
            ctx.stroke();
            
            // Pulse effect
            if (chargePercent >= 1) {
                ctx.globalAlpha = 0.3 + Math.sin(wolf.animationTime * 0.01) * 0.3;
                ctx.strokeStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(0, -wolf.height * 0.7, indicatorRadius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
}

export { WolfAnimationSystem, WolfAnimationSystem as default };
