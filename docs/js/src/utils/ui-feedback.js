// UI Feedback System for Enhanced Game Feel
// Provides damage numbers, status indicators, and more

export class DamageNumber {
    constructor(x, y, value, options = {}) {
        this.x = x
        this.y = y
        this.value = value
        this.startX = x
        this.startY = y
        
        // Visual properties
        this.color = options.color || '#ffffff'
        this.size = options.size || 24
        this.critical = options.critical || false
        this.heal = options.heal || false
        this.miss = options.miss || false
        
        // Animation properties
        this.lifetime = options.lifetime || 1.5
        this.age = 0
        this.velocityY = options.velocityY || -100
        this.velocityX = options.velocityX || (Math.random() - 0.5) * 50
        this.gravity = options.gravity || 200
        this.bounce = options.bounce || false
        this.bounceCount = 0
        this.maxBounces = 2
        
        // Style variations
        if (this.critical) {
            this.size *= 1.5
            this.color = options.color || '#ff6b6b'
            this.velocityY *= 1.3
        } else if (this.heal) {
            this.color = options.color || '#4ade80'
        } else if (this.miss) {
            this.color = options.color || '#94a3b8'
            this.value = 'MISS'
        }
        
        // Outline for better visibility
        this.outlineWidth = 3
        this.outlineColor = 'rgba(0, 0, 0, 0.8)'
    }

    update(deltaTime) {
        this.age += deltaTime
        
        // Apply physics
        this.velocityY += this.gravity * deltaTime
        this.x += this.velocityX * deltaTime
        this.y += this.velocityY * deltaTime
        
        // Bounce effect
        if (this.bounce && this.y > this.startY && this.bounceCount < this.maxBounces) {
            this.y = this.startY
            this.velocityY *= -0.5
            this.bounceCount++
        }
        
        // Slow down horizontal movement
        this.velocityX *= 0.98
        
        return this.age < this.lifetime
    }

    render(ctx) {
        const progress = this.age / this.lifetime
        const alpha = 1 - progress**2
        
        // Calculate animated size
        let animatedSize = this.size
        if (this.critical) {
            // Pulse effect for critical hits
            animatedSize *= 1 + Math.sin(this.age * 10) * 0.1
        }
        if (progress < 0.1) {
            // Pop-in effect
            animatedSize *= progress / 0.1
        }
        
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.font = `bold ${animatedSize}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Draw outline
        ctx.strokeStyle = this.outlineColor
        ctx.lineWidth = this.outlineWidth
        ctx.strokeText(this.value, this.x, this.y)
        
        // Draw text
        ctx.fillStyle = this.color
        ctx.fillText(this.value, this.x, this.y)
        
        // Add glow for critical hits
        if (this.critical && alpha > 0.5) {
            ctx.shadowColor = this.color
            ctx.shadowBlur = 10
            ctx.fillText(this.value, this.x, this.y)
        }
        
        ctx.restore()
    }
}


export class StatusIndicator {
    constructor(type, duration = 0) {
        this.type = type
        this.duration = duration // 0 = permanent
        this.elapsed = 0
        this.active = true
        this.pulse = 0
        this.icon = this.getIcon(type)
        this.color = this.getColor(type)
        this.size = 32
    }

    getIcon(type) {
        // Return emoji or symbol for status type
        const icons = {
            'poison': '☠️',
            'burn': '🔥',
            'freeze': '❄️',
            'stun': '💫',
            'shield': '🛡️',
            'speed': '💨',
            'strength': '💪',
            'regen': '❤️',
            'invincible': '✨',
            'confused': '❓',
            'slow': '🐌',
            'bleed': '🩸',
            'rage': '😤',
            'focus': '🎯',
            'stealth': '👁️'
        }
        return icons[type] || '❗'
    }

    getColor(type) {
        const colors = {
            'poison': '#4ade80',
            'burn': '#f97316',
            'freeze': '#60a5fa',
            'stun': '#fbbf24',
            'shield': '#3b82f6',
            'speed': '#a78bfa',
            'strength': '#ef4444',
            'regen': '#ec4899',
            'invincible': '#fbbf24',
            'confused': '#9333ea',
            'slow': '#6b7280',
            'bleed': '#dc2626',
            'rage': '#dc2626',
            'focus': '#0ea5e9',
            'stealth': '#6b7280'
        }
        return colors[type] || '#ffffff'
    }

    update(deltaTime) {
        if (!this.active) {return false}
        
        this.pulse += deltaTime * 3
        
        if (this.duration > 0) {
            this.elapsed += deltaTime
            if (this.elapsed >= this.duration) {
                this.active = false
                return false
            }
        }
        
        return true
    }

    render(ctx, x, y, index) {
        if (!this.active) {return}
        
        const offsetX = index * (this.size + 5)
        const pulseScale = 1 + Math.sin(this.pulse) * 0.1
        
        ctx.save()
        ctx.translate(x + offsetX, y)
        ctx.scale(pulseScale, pulseScale)
        
        // Draw background circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.beginPath()
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw colored ring
        ctx.strokeStyle = this.color
        ctx.lineWidth = 3
        ctx.stroke()
        
        // Draw icon
        ctx.font = `${this.size * 0.6}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(this.icon, 0, 0)
        
        // Draw duration if temporary
        if (this.duration > 0) {
            const remaining = this.duration - this.elapsed
            if (remaining < 10) {
                ctx.font = `bold ${this.size * 0.3}px Arial`
                ctx.fillStyle = remaining < 3 ? '#ef4444' : '#ffffff'
                ctx.fillText(Math.ceil(remaining), 0, this.size * 0.4)
            }
        }
        
        ctx.restore()
    }
}

export class HealthBar {
    constructor(maxHealth = 100) {
        this.maxHealth = maxHealth
        this.currentHealth = maxHealth
        this.displayHealth = maxHealth
        this.lastDamageTime = 0
        this.lastDamageAmount = 0
        this.shakeIntensity = 0
        
        // Visual properties
        this.width = 300
        this.height = 30
        this.x = 50
        this.y = 50
        
        // Segmented health bar
        this.segments = 10
        this.segmentValue = maxHealth / this.segments
    }

    takeDamage(amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount)
        this.lastDamageAmount = amount
        this.lastDamageTime = Date.now()
        this.shakeIntensity = Math.min(amount / this.maxHealth * 20, 10)
    }

    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
    }

    update() {
        // Animate display health
        const diff = this.currentHealth - this.displayHealth
        this.displayHealth += diff * 0.1
        
        // Decay shake
        this.shakeIntensity *= 0.9
    }

    render(ctx) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity
        
        ctx.save()
        ctx.translate(this.x + shakeX, this.y + shakeY)
        
        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, 0, this.width, this.height)
        
        // Draw damage preview (red bar showing recent damage)
        const timeSinceDamage = (Date.now() - this.lastDamageTime) / 1000
        if (timeSinceDamage < 1) {
            const damageAlpha = 1 - timeSinceDamage
            ctx.fillStyle = `rgba(255, 0, 0, ${damageAlpha * 0.5})`
            const damageWidth = (this.lastDamageAmount / this.maxHealth) * this.width
            const damageX = (this.displayHealth / this.maxHealth) * this.width
            ctx.fillRect(damageX, 0, damageWidth, this.height)
        }
        
        // Draw health bar
        const healthPercent = this.displayHealth / this.maxHealth
        const healthColor = this.getHealthColor(healthPercent)
        
        // Draw segmented health
        const segmentWidth = this.width / this.segments
        for (let i = 0; i < this.segments; i++) {
            const segmentHealth = Math.min(this.segmentValue, 
                this.displayHealth - i * this.segmentValue)
            const segmentPercent = segmentHealth / this.segmentValue
            
            if (segmentPercent > 0) {
                // Gradient for each segment
                const gradient = ctx.createLinearGradient(
                    i * segmentWidth, 0,
                    i * segmentWidth + segmentWidth * segmentPercent, 0
                )
                gradient.addColorStop(0, healthColor)
                gradient.addColorStop(1, this.lightenColor(healthColor, 20))
                
                ctx.fillStyle = gradient
                ctx.fillRect(
                    i * segmentWidth + 1,
                    2,
                    segmentWidth * segmentPercent - 2,
                    this.height - 4
                )
            }
        }
        
        // Draw segment dividers
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.lineWidth = 1
        for (let i = 1; i < this.segments; i++) {
            ctx.beginPath()
            ctx.moveTo(i * segmentWidth, 0)
            ctx.lineTo(i * segmentWidth, this.height)
            ctx.stroke()
        }
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 2
        ctx.strokeRect(0, 0, this.width, this.height)
        
        // Draw health text
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.lineWidth = 3
        const healthText = `${Math.ceil(this.displayHealth)} / ${this.maxHealth}`
        ctx.strokeText(healthText, this.width / 2, this.height / 2)
        ctx.fillText(healthText, this.width / 2, this.height / 2)
        
        ctx.restore()
    }

    getHealthColor(percent) {
        if (percent > 0.6) {return '#4ade80'}
        if (percent > 0.3) {return '#fbbf24'}
        return '#ef4444'
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16)
        const amt = Math.round(2.55 * percent)
        const R = (num >> 16) + amt
        const G = (num >> 8 & 0x00FF) + amt
        const B = (num & 0x0000FF) + amt
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1)
    }
}

export class UIFeedbackSystem {
    constructor() {
        this.damageNumbers = []
        this.statusIndicators = []
        this.healthBar = new HealthBar()
        this.notifications = []
        this.screenFlash = null
        
        // UI Transition animations
        this.transitions = []
        this.menuTransition = null
        this.sceneTransition = null
        this.fadeTransition = { active: false, fadeIn: true, alpha: 0, speed: 1, callback: null }
        this.slideTransition = { active: false, progress: 0, direction: 'left', speed: 1 }
        this.zoomTransition = { active: false, scale: 1, targetScale: 1, speed: 1 }
        this.curtainTransition = { active: false, progress: 0, closing: true, speed: 1 }
    }

    update(deltaTime) {
        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(dn => dn.update(deltaTime))
        
        
        // Update status indicators
        this.statusIndicators = this.statusIndicators.filter(si => si.update(deltaTime))
        
        // Update health bar
        this.healthBar.update(deltaTime)
        
        // Update notifications
        this.notifications = this.notifications.filter(n => {
            n.age += deltaTime
            return n.age < n.duration
        })
        
        // Update screen flash
        if (this.screenFlash) {
            this.screenFlash.alpha *= 0.9
            if (this.screenFlash.alpha < 0.01) {
                this.screenFlash = null
            }
        }
    }

    render(ctx) {
        // Render health bar
        this.healthBar.render(ctx)
        
        
        // Render status indicators
        this.statusIndicators.forEach((indicator, index) => {
            indicator.render(ctx, 50, 100, index)
        })
        
        // Render damage numbers
        this.damageNumbers.forEach(dn => dn.render(ctx))
        
        // Render notifications
        this.notifications.forEach((notification, index) => {
            this.renderNotification(ctx, notification, index)
        })
        
        // Render screen flash
        if (this.screenFlash) {
            ctx.save()
            ctx.globalAlpha = this.screenFlash.alpha
            ctx.fillStyle = this.screenFlash.color
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.restore()
        }
    }

    renderNotification(ctx, notification, index) {
        const alpha = 1 - (notification.age / notification.duration)**2
        const y = 200 + index * 40 - notification.age * 50
        
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.lineWidth = 4
        ctx.strokeText(notification.text, ctx.canvas.width / 2, y)
        
        // Fill
        ctx.fillStyle = notification.color || '#ffffff'
        ctx.fillText(notification.text, ctx.canvas.width / 2, y)
        
        ctx.restore()
    }

    // Public methods
    showDamage(x, y, amount, options = {}) {
        this.damageNumbers.push(new DamageNumber(x, y, amount, options))
    }


    addStatus(type, duration) {
        // Remove existing status of same type
        this.statusIndicators = this.statusIndicators.filter(si => si.type !== type)
        this.statusIndicators.push(new StatusIndicator(type, duration))
    }

    removeStatus(type) {
        this.statusIndicators = this.statusIndicators.filter(si => si.type !== type)
    }

    setHealth(current, max) {
        this.healthBar.currentHealth = current
        this.healthBar.maxHealth = max
    }

    takeDamage(amount) {
        this.healthBar.takeDamage(amount)
    }

    heal(amount) {
        this.healthBar.heal(amount)
    }

    showNotification(text, duration = 2, color = '#ffffff') {
        this.notifications.push({
            text,
            duration,
            color,
            age: 0
        })
    }

    flashScreen(color = '#ffffff', alpha = 0.5) {
        this.screenFlash = { color, alpha }
    }

    // Preset notifications
    levelUp(level) {
        this.showNotification(`LEVEL ${level}!`, 3, '#fbbf24')
        this.flashScreen('#fbbf24', 0.3)
    }

    questComplete(questName) {
        this.showNotification(`Quest Complete: ${questName}`, 3, '#4ade80')
    }

    newAbilityUnlocked(abilityName) {
        this.showNotification(`New Ability: ${abilityName}`, 3, '#60a5fa')
    }

    bossDefeated(bossName) {
        this.showNotification(`${bossName} DEFEATED!`, 4, '#ff6b6b')
        this.flashScreen('#ff6b6b', 0.5)
    }

    achievementUnlocked(achievementName) {
        this.showNotification(`Achievement: ${achievementName}`, 3, '#a78bfa')
    }
    
    // UI Transition Animation Methods
    startFadeTransition(fadeIn = true, duration = 1, callback = null) {
        this.fadeTransition.active = true
        this.fadeTransition.fadeIn = fadeIn
        this.fadeTransition.alpha = fadeIn ? 0 : 1
        this.fadeTransition.speed = 1 / duration
        this.fadeTransition.callback = callback
    }
    
    startSlideTransition(direction = 'left', duration = 0.5) {
        this.slideTransition.active = true
        this.slideTransition.progress = 0
        this.slideTransition.direction = direction
        this.slideTransition.speed = 1 / duration
    }
    
    startZoomTransition(fromScale = 1, toScale = 0, duration = 0.5) {
        this.zoomTransition.active = true
        this.zoomTransition.scale = fromScale
        this.zoomTransition.targetScale = toScale
        this.zoomTransition.speed = 1 / duration
    }
    
    startCurtainTransition(closing = true, duration = 0.8) {
        this.curtainTransition.active = true
        this.curtainTransition.progress = closing ? 0 : 1
        this.curtainTransition.closing = closing
        this.curtainTransition.speed = 1 / duration
    }
    
    renderTransitions(ctx) {
        const canvas = ctx.canvas
        
        // Update transitions
        const deltaTime = 1/60 // Assume 60fps for now
        
        // Fade transition
        if (this.fadeTransition.active) {
            if (this.fadeTransition.fadeIn) {
                this.fadeTransition.alpha += this.fadeTransition.speed * deltaTime
                if (this.fadeTransition.alpha >= 1) {
                    this.fadeTransition.alpha = 1
                    this.fadeTransition.active = false
                    if (this.fadeTransition.callback) {this.fadeTransition.callback()}
                }
            } else {
                this.fadeTransition.alpha -= this.fadeTransition.speed * deltaTime
                if (this.fadeTransition.alpha <= 0) {
                    this.fadeTransition.alpha = 0
                    this.fadeTransition.active = false
                    if (this.fadeTransition.callback) {this.fadeTransition.callback()}
                }
            }
        }
        
        if (this.fadeTransition.alpha < 1) {
            ctx.save()
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeTransition.alpha})`
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.restore()
        }
        
        // Slide transition
        if (this.slideTransition.active) {
            this.slideTransition.progress += this.slideTransition.speed * deltaTime
            if (this.slideTransition.progress >= 1) {
                this.slideTransition.progress = 1
                this.slideTransition.active = false
            }
            
            ctx.save()
            const offset = this.slideTransition.progress * canvas.width
            ctx.fillStyle = '#000'
            
            switch(this.slideTransition.direction) {
                case 'left':
                    ctx.fillRect(canvas.width - offset, 0, offset, canvas.height)
                    break
                case 'right':
                    ctx.fillRect(0, 0, offset, canvas.height)
                    break
                case 'up':
                    ctx.fillRect(0, canvas.height - offset * canvas.height / canvas.width, canvas.width, offset * canvas.height / canvas.width)
                    break
                case 'down':
                    ctx.fillRect(0, 0, canvas.width, offset * canvas.height / canvas.width)
                    break
            }
            ctx.restore()
        }
        
        // Curtain transition
        if (this.curtainTransition.active) {
            if (this.curtainTransition.closing) {
                this.curtainTransition.progress += this.curtainTransition.speed * deltaTime
                if (this.curtainTransition.progress >= 1) {
                    this.curtainTransition.progress = 1
                    this.curtainTransition.active = false
                }
            } else {
                this.curtainTransition.progress -= this.curtainTransition.speed * deltaTime
                if (this.curtainTransition.progress <= 0) {
                    this.curtainTransition.progress = 0
                    this.curtainTransition.active = false
                }
            }
        }
        
        if (this.curtainTransition.progress > 0) {
            ctx.save()
            const curtainHeight = canvas.height * this.curtainTransition.progress / 2
            
            // Top curtain
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, curtainHeight)
            
            // Bottom curtain
            ctx.fillRect(0, canvas.height - curtainHeight, canvas.width, curtainHeight)
            
            // Curtain edge decoration
            if (curtainHeight > 2) {
                ctx.strokeStyle = '#333'
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(0, curtainHeight)
                ctx.lineTo(canvas.width, curtainHeight)
                ctx.moveTo(0, canvas.height - curtainHeight)
                ctx.lineTo(canvas.width, canvas.height - curtainHeight)
                ctx.stroke()
            }
            ctx.restore()
        }
    }
}

export default UIFeedbackSystem
export { UIFeedbackSystem as UIFeedback }