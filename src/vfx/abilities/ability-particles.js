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

