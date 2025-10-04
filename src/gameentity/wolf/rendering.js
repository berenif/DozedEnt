export function render(ctx, camera) {
    // Draw procedural animation overlays from WASM data
    if (this.wasmModule) {
        try {
            const wolfId = this.id;

            // Check if wolf animation is active
            const isActive = typeof this.wasmModule.get_wolf_anim_active === 'function' ? 
                this.wasmModule.get_wolf_anim_active(wolfId) : false;

            if (!isActive) {return;}

            // Apply spine bend
            const spineBend = typeof this.wasmModule.get_wolf_anim_spine_bend === 'function' ? 
                this.wasmModule.get_wolf_anim_spine_bend(wolfId) : 0;
            // ctx.rotate(spineBend); // This would rotate the whole canvas, need to rotate individual parts

            // Apply body offset (bobbing)
            const bodyOffsetY = typeof this.wasmModule.get_wolf_anim_body_offset_y === 'function' ? 
                this.wasmModule.get_wolf_anim_body_offset_y(wolfId) : 0;
            ctx.translate(0, bodyOffsetY);

            // Render legs procedurally
            for (let i = 0; i < 4; i++) {
                const legX = typeof this.wasmModule.get_wolf_anim_leg_x === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_x(wolfId, i) : 0;
                const legY = typeof this.wasmModule.get_wolf_anim_leg_y === 'function' ? 
                    this.wasmModule.get_wolf_anim_leg_y(wolfId, i) : 0;
                // Draw leg at (this.position.x + legX, this.position.y + legY)
                // This requires more granular drawing, currently drawWolfBody handles full body
                // For now, we will draw simple circles for leg positions as a debug visual
                ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(this.position.x - camera.x + legX, this.position.y - camera.y + legY, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            // Reset translation after drawing specific elements that use it
            ctx.translate(0, -bodyOffsetY);
        } catch (error) {
            console.warn('WASM function call failed in wolf render:', error);
            // Continue with fallback rendering
        }
    }

    // Render the wolf with realistic features using the animation system
    this.animationSystem.renderAnimatedWolf(ctx, this, camera)
}

export function drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(0, this.height / 2 + 5, this.width / 3, 8, 0, 0, Math.PI * 2)
    ctx.fill()
}

export function drawTail(ctx) {
    ctx.save()
    ctx.translate(-this.width * 0.35, -this.height * 0.1)
    ctx.rotate(this.tailPosition)

    // Tail shape
    ctx.fillStyle = this.colors.primary
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-15, 5, -25, 15)
    ctx.quadraticCurveTo(-20, 20, -10, 18)
    ctx.quadraticCurveTo(-5, 10, 0, 0)
    ctx.fill()

    // Tail fur detail
    ctx.strokeStyle = this.colors.secondary
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-5, 5)
    ctx.lineTo(-15, 12)
    ctx.moveTo(-10, 8)
    ctx.lineTo(-20, 15)
    ctx.stroke()

    ctx.restore()
}

export function drawHindLegs(ctx) {
    // Left hind leg
    const legOffset = this.state === 'running' ? Math.sin(this.animationFrame * 0.5) * 5 : 0

    ctx.fillStyle = this.colors.primary
    ctx.fillRect(-this.width * 0.25, this.height * 0.2 + legOffset, 8, 20)

    // Right hind leg
    ctx.fillRect(-this.width * 0.15, this.height * 0.2 - legOffset, 8, 20)

    // Paws
    ctx.fillStyle = this.colors.secondary
    ctx.fillRect(-this.width * 0.25, this.height * 0.35 + legOffset, 10, 5)
    ctx.fillRect(-this.width * 0.15, this.height * 0.35 - legOffset, 10, 5)
}

export function drawBody(ctx) {
    // Main body with breathing animation
    const breathY = this.breathingOffset

    ctx.fillStyle = this.colors.primary
    ctx.beginPath()
    ctx.ellipse(0, breathY, this.width * 0.35, this.height * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()

    // Belly
    ctx.fillStyle = this.colors.belly
    ctx.beginPath()
    ctx.ellipse(0, breathY + this.height * 0.1, this.width * 0.3, this.height * 0.15, 0, 0, Math.PI)
    ctx.fill()

    // Fur texture
    this.drawFurTexture(ctx, 0, breathY, this.width * 0.35, this.height * 0.25)
}

export function drawFrontLegs(ctx) {
    const legOffset = this.state === 'running' ? Math.sin(this.animationFrame * 0.5 + Math.PI) * 5 : 0

    // Left front leg
    ctx.fillStyle = this.colors.primary
    ctx.fillRect(this.width * 0.15, this.height * 0.15 + legOffset, 8, 25)

    // Right front leg
    ctx.fillRect(this.width * 0.25, this.height * 0.15 - legOffset, 8, 25)

    // Paws with claws
    ctx.fillStyle = this.colors.secondary
    ctx.fillRect(this.width * 0.15, this.height * 0.35 + legOffset, 10, 5)
    ctx.fillRect(this.width * 0.25, this.height * 0.35 - legOffset, 10, 5)

    // Claws
    ctx.fillStyle = this.colors.claws
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(this.width * 0.15 + i * 3, this.height * 0.38 + legOffset, 2, 3)
        ctx.fillRect(this.width * 0.25 + i * 3, this.height * 0.38 - legOffset, 2, 3)
    }
}

export function drawNeck(ctx) {
    ctx.fillStyle = this.colors.primary
    ctx.beginPath()
    ctx.moveTo(this.width * 0.15, -this.height * 0.1)
    ctx.quadraticCurveTo(this.width * 0.25, -this.height * 0.05, this.width * 0.3, -this.height * 0.15)
    ctx.quadraticCurveTo(this.width * 0.25, this.height * 0.05, this.width * 0.15, this.height * 0.1)
    ctx.fill()
}

export function drawHead(ctx) {
    ctx.save()
    ctx.translate(this.width * 0.35, -this.height * 0.15)

    // Head shape (more wolf-like with pronounced snout)
    ctx.fillStyle = this.colors.primary
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(10, -5, 15, 0) // Top of head
    ctx.quadraticCurveTo(20, 3, 25, 5)   // Snout top
    ctx.lineTo(28, 8)                    // Nose tip
    ctx.quadraticCurveTo(25, 10, 20, 10) // Snout bottom
    ctx.quadraticCurveTo(10, 8, 0, 10)   // Jaw
    ctx.quadraticCurveTo(-5, 5, 0, 0)    // Back of head
    ctx.fill()

    // Ears
    this.drawEars(ctx)

    // Snout detail
    ctx.fillStyle = this.colors.secondary
    ctx.beginPath()
    ctx.moveTo(20, 5)
    ctx.quadraticCurveTo(25, 6, 28, 8)
    ctx.quadraticCurveTo(25, 9, 20, 9)
    ctx.fill()

    // Nose
    ctx.fillStyle = this.colors.nose
    ctx.beginPath()
    ctx.arc(28, 8, 2, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    this.drawEye(ctx)

    // Teeth (visible when attacking or lunging)
    if (this.state === 'attacking' || this.state === 'lunging') {
        this.drawTeeth(ctx)
    }

    ctx.restore()
}

export function drawEars(ctx) {
    ctx.save()

    // Left ear
    ctx.save()
    ctx.translate(5, -3)
    ctx.rotate(this.earRotation)
    ctx.fillStyle = this.colors.primary
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-3, -8)
    ctx.lineTo(3, -8)
    ctx.closePath()
    ctx.fill()

    // Inner ear
    ctx.fillStyle = this.colors.belly
    ctx.beginPath()
    ctx.moveTo(0, -2)
    ctx.lineTo(-1, -6)
    ctx.lineTo(1, -6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Right ear (slightly behind)
    ctx.save()
    ctx.translate(8, -2)
    ctx.rotate(this.earRotation)
    ctx.fillStyle = this.colors.secondary
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-2, -7)
    ctx.lineTo(3, -7)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.restore()
}

export function drawEye(ctx) {
    // Eye glow for dramatic effect
    if (this.state === 'prowling' || this.state === 'lunging') {
        ctx.shadowColor = this.colors.eyes
        ctx.shadowBlur = 5
    }

    // Eye white
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(12, 3, 4, 3, -0.2, 0, Math.PI * 2)
    ctx.fill()

    // Iris
    ctx.fillStyle = this.colors.eyes
    ctx.beginPath()
    ctx.arc(13, 3, 2, 0, Math.PI * 2)
    ctx.fill()

    // Pupil
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(13.5, 3, 1, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
}

export function drawTeeth(ctx) {
    ctx.fillStyle = '#ffffff'

    // Upper fangs
    ctx.beginPath()
    ctx.moveTo(22, 9)
    ctx.lineTo(21, 11)
    ctx.lineTo(23, 11)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(25, 9)
    ctx.lineTo(24, 11)
    ctx.lineTo(26, 11)
    ctx.closePath()
    ctx.fill()
}

export function drawFurTexture(ctx, x, y, width, height) {
    ctx.strokeStyle = this.colors.secondary
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.3

    // Draw fur lines based on unique pattern
    const furLines = 8
    for (let i = 0; i < furLines; i++) {
        const offsetX = (Math.sin(this.furPattern * i * 10) * width * 0.3)
        const offsetY = (i / furLines) * height - height / 2

        ctx.beginPath()
        ctx.moveTo(x + offsetX, y + offsetY)
        ctx.lineTo(x + offsetX + 5, y + offsetY + 3)
        ctx.stroke()
    }

    ctx.globalAlpha = 1
}

export function drawLungeEffect(ctx) {
    // Motion blur effect during lunge
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = this.colors.primary

    // Draw motion trails
    for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.3 / i
        ctx.save()
        ctx.translate(-i * 10 * this.facing, 0)
        ctx.scale(1 - i * 0.1, 1 - i * 0.1)

        // Simplified body shape for motion blur
        ctx.beginPath()
        ctx.ellipse(0, 0, this.width * 0.3, this.height * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    ctx.restore()

    // Speed lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
        const y = -this.height / 2 + (i / 4) * this.height
        ctx.beginPath()
        ctx.moveTo(-this.width * 0.5 * this.facing, y)
        ctx.lineTo(-this.width * 0.8 * this.facing, y)
        ctx.stroke()
    }
}

export function drawHealthBar(ctx) {
    if (this.health >= this.maxHealth) {return}

    ctx.save()
    ctx.scale(1 / this.size, 1 / this.size)

    const barWidth = 60
    const barHeight = 6
    const barY = -this.height * 0.5 - 20

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight)

    // Health
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : 
                    healthPercent > 0.25 ? '#ff9800' : '#f44336'
    ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight)

    // Border
    ctx.strokeStyle = this.isAlpha ? '#ffd700' : '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight)

    // Alpha crown icon
    if (this.isAlpha) {
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('ðŸ‘‘', 0, barY - 5)
    }

    ctx.restore()
}
