/**
 * Kensei Flow Dash Animation
 * Handles visual effects for Kensei's teleport dash and combo chains
 */

export class KenseiDashAnimation {
    constructor(wasmModule, vfxManager) {
        this.wasm = wasmModule;
        this.vfx = vfxManager;
        
        // Animation state
        this.isDashing = false;
        this.dashProgress = 0;
        this.comboLevel = 0;
        this.targetHitFlash = 0;
        
        // Visual properties
        this.trailParticles = [];
        this.afterimages = [];
        this.slashEffects = [];
        this.dashGlow = 0;
        this.startPos = { x: 0, y: 0 };
        this.endPos = { x: 0, y: 0 };
    }
    
    /**
     * Start dash animation
     * @param {Object} start - Start position {x, y}
     * @param {Object} end - End position {x, y}
     * @param {number} comboLevel - Current combo level
     */
    startDash(start, end, comboLevel) {
        this.isDashing = true;
        this.dashProgress = 0;
        this.comboLevel = comboLevel;
        this.startPos = { ...start };
        this.endPos = { ...end };
        this.dashGlow = 1.0;
        
        // Spawn starting afterimage
        this.spawnAfterimage(start.x, start.y, comboLevel);
        
        console.log(`🎬 Started flow dash animation (Combo: ${comboLevel})`);
    }
    
    /**
     * Update dash animation
     * @param {number} progress - Dash progress (0-1)
     * @param {number} comboLevel - Current combo level
     * @param {boolean} isInvulnerable - I-frame status
     * @param {number} dt - Delta time
     */
    updateDash(progress, comboLevel, isInvulnerable, dt) {
        this.dashProgress = progress;
        this.comboLevel = comboLevel;
        
        // Spawn trail particles along dash path
        if (progress < 1.0) {
            const currentX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            const currentY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
            
            this.spawnTrailParticle(currentX, currentY, comboLevel);
            
            // Spawn afterimages at intervals
            if (Math.random() < 0.3) {
                this.spawnAfterimage(currentX, currentY, comboLevel);
            }
        }
        
        // Update existing particles and effects
        this.updateParticles(dt);
        this.updateAfterimages(dt);
        this.updateSlashEffects(dt);
        
        // Fade target hit flash
        if (this.targetHitFlash > 0) {
            this.targetHitFlash -= dt * 5.0;
        }
        
        // Fade glow
        this.dashGlow = Math.max(0, this.dashGlow - dt * 3.0);
    }
    
    /**
     * Handle target hit (trigger impact effects)
     * @param {number} comboLevel - Current combo level
     */
    onTargetHit(comboLevel) {
        this.targetHitFlash = 1.0;
        this.comboLevel = comboLevel;
        
        // Spawn slash effect at current position
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        this.spawnSlashEffect(playerX, playerY, comboLevel);
        
        // Spawn burst of particles
        for (let i = 0; i < 8; i++) {
            this.spawnImpactParticle(playerX, playerY, comboLevel);
        }
        
        // Spawn afterimage at hit position
        this.spawnAfterimage(playerX, playerY, comboLevel);
        
        console.log(`💥 Flow dash hit! Combo level: ${comboLevel}`);
    }
    
    /**
     * End dash animation
     * @param {number} finalCombo - Final combo level achieved
     */
    endDash(finalCombo) {
        this.isDashing = false;
        this.comboLevel = finalCombo;
        
        // Spawn final afterimage at end position
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        this.spawnAfterimage(playerX, playerY, finalCombo);
        
        console.log(`🎬 Ended flow dash animation (Final combo: ${finalCombo})`);
    }
    
    /**
     * Cancel dash animation early
     */
    cancelDash() {
        this.isDashing = false;
        this.trailParticles = [];
        this.dashGlow = 0;
        
        console.log('🎬 Cancelled flow dash animation');
    }
    
    /**
     * Spawn finisher effect (3+ combo)
     */
    spawnFinisherEffect() {
        console.log('🎆 Spawning flow state finisher effect!');
        
        const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
        const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
        
        // Spawn massive burst of particles
        for (let i = 0; i < 30; i++) {
            this.spawnImpactParticle(playerX, playerY, 3);
        }
        
        // Spawn multiple slash effects
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const angle = (i / 5) * Math.PI * 2;
                const offsetX = Math.cos(angle) * 0.05;
                const offsetY = Math.sin(angle) * 0.05;
                this.spawnSlashEffect(playerX + offsetX, playerY + offsetY, 3);
            }, i * 50);
        }
    }
    
    /**
     * Render dash effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera state
     */
    render(ctx, camera) {
        if (!this.isDashing && this.trailParticles.length === 0 && this.afterimages.length === 0 && this.slashEffects.length === 0) {
            return;
        }
        
        // Draw trail particles
        ctx.save();
        for (const particle of this.trailParticles) {
            const px = (particle.x - camera.x) * camera.scale;
            const py = (particle.y - camera.y) * camera.scale;
            
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Draw afterimages
        ctx.save();
        for (const afterimage of this.afterimages) {
            const ax = (afterimage.x - camera.x) * camera.scale;
            const ay = (afterimage.y - camera.y) * camera.scale;
            
            ctx.globalAlpha = afterimage.life * 0.3;
            ctx.fillStyle = afterimage.color;
            ctx.fillRect(ax - 15, ay - 20, 30, 40);
        }
        ctx.restore();
        
        // Draw slash effects
        ctx.save();
        for (const slash of this.slashEffects) {
            const sx = (slash.x - camera.x) * camera.scale;
            const sy = (slash.y - camera.y) * camera.scale;
            
            ctx.globalAlpha = slash.life;
            ctx.strokeStyle = slash.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const length = 40 * (1 + slash.combo * 0.2);
            ctx.moveTo(sx - length * Math.cos(slash.angle), sy - length * Math.sin(slash.angle));
            ctx.lineTo(sx + length * Math.cos(slash.angle), sy + length * Math.sin(slash.angle));
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw target hit flash
        if (this.targetHitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.targetHitFlash * 0.2;
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
        
        // Draw dash glow
        if (this.isDashing && this.dashGlow > 0) {
            const playerX = this.wasm.exports.get_x ? this.wasm.exports.get_x() : 0.5;
            const playerY = this.wasm.exports.get_y ? this.wasm.exports.get_y() : 0.5;
            
            const screenX = (playerX - camera.x) * camera.scale;
            const screenY = (playerY - camera.y) * camera.scale;
            
            ctx.save();
            ctx.globalAlpha = this.dashGlow * 0.5;
            ctx.fillStyle = this.getComboColor(this.comboLevel);
            ctx.beginPath();
            ctx.arc(screenX, screenY, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // ========================================
    // Particle System
    // ========================================
    
    /**
     * Get color based on combo level
     * @param {number} combo - Combo level
     * @returns {string} - Color string
     */
    getComboColor(combo) {
        const colors = ['#00ffff', '#00ffaa', '#44ffaa', '#88ffaa'];
        return colors[Math.min(combo, colors.length - 1)];
    }
    
    /**
     * Spawn trail particle
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} combo - Combo level
     */
    spawnTrailParticle(x, y, combo) {
        this.trailParticles.push({
            x: x + (Math.random() - 0.5) * 0.02,
            y: y + (Math.random() - 0.5) * 0.02,
            size: 3 + Math.random() * 3,
            color: this.getComboColor(combo),
            life: 1.0
        });
        
        // Limit particle count
        if (this.trailParticles.length > 100) {
            this.trailParticles.shift();
        }
    }
    
    /**
     * Spawn impact particle
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} combo - Combo level
     */
    spawnImpactParticle(x, y, combo) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.05;
        
        this.trailParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 3,
            color: this.getComboColor(combo),
            life: 1.0
        });
    }
    
    /**
     * Spawn afterimage
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} combo - Combo level
     */
    spawnAfterimage(x, y, combo) {
        this.afterimages.push({
            x: x,
            y: y,
            color: this.getComboColor(combo),
            life: 1.0
        });
        
        // Limit afterimage count
        if (this.afterimages.length > 10) {
            this.afterimages.shift();
        }
    }
    
    /**
     * Spawn slash effect
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} combo - Combo level
     */
    spawnSlashEffect(x, y, combo) {
        this.slashEffects.push({
            x: x,
            y: y,
            angle: Math.random() * Math.PI * 2,
            combo: combo,
            color: this.getComboColor(combo),
            life: 1.0
        });
        
        // Limit slash effect count
        if (this.slashEffects.length > 20) {
            this.slashEffects.shift();
        }
    }
    
    /**
     * Update trail particles
     * @param {number} dt - Delta time
     */
    updateParticles(dt) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const particle = this.trailParticles[i];
            
            // Update position with velocity
            if (particle.vx !== undefined) {
                particle.x += particle.vx * dt;
                particle.y += particle.vy * dt;
            }
            
            // Fade out
            particle.life -= dt * 2.5;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
    }
    
    /**
     * Update afterimages
     * @param {number} dt - Delta time
     */
    updateAfterimages(dt) {
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            const afterimage = this.afterimages[i];
            
            afterimage.life -= dt * 4.0;
            
            if (afterimage.life <= 0) {
                this.afterimages.splice(i, 1);
            }
        }
    }
    
    /**
     * Update slash effects
     * @param {number} dt - Delta time
     */
    updateSlashEffects(dt) {
        for (let i = this.slashEffects.length - 1; i >= 0; i--) {
            const slash = this.slashEffects[i];
            
            slash.life -= dt * 3.0;
            
            if (slash.life <= 0) {
                this.slashEffects.splice(i, 1);
            }
        }
    }
}

