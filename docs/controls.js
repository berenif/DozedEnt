// Game Control System
class MobileGameControls {
    constructor() {
        this.pressedKeys = new Set();
        this.touchPoints = new Map();
        this.gameState = {
            health: 100,
            maxHealth: 100,
            energy: 50,
            maxEnergy: 50,
            score: 0,
            level: 1,
            position: { x: 50, y: 50 }
        };
        this.cooldowns = new Map();
        this.vibrationEnabled = true;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupControls();
        this.setupTouchHandlers();
        this.startGameLoop();
        this.initializeAudio();
    }

    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupControls() {
        // D-Pad controls
        const dpadButtons = document.querySelectorAll('.dpad-btn');
        dpadButtons.forEach(btn => {
            // Touch events for mobile
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDirectionPress(btn.dataset.direction);
                this.vibrate(10);
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDirectionRelease(btn.dataset.direction);
            });

            // Mouse events for desktop testing
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleDirectionPress(btn.dataset.direction);
            });
            
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.handleDirectionRelease(btn.dataset.direction);
            });
        });

        // Action buttons
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleAction(btn.dataset.action);
                this.vibrate(20);
                this.createRippleEffect(btn);
            });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleAction(btn.dataset.action);
                this.createRippleEffect(btn);
            });
        });

        // Skill buttons
        const skillButtons = document.querySelectorAll('.skill-btn');
        skillButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleSkill(btn.dataset.skill);
                this.vibrate(30);
                this.createRippleEffect(btn);
            });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleSkill(btn.dataset.skill);
                this.createRippleEffect(btn);
            });
        });

        // Item buttons
        const itemButtons = document.querySelectorAll('.item-btn');
        itemButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleItem(btn.dataset.item);
                this.vibrate(15);
            });

            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.handleItem(btn.dataset.item);
            });
        });
    }

    setupTouchHandlers() {
        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.mobile-controls')) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.mobile-controls')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Multi-touch support
        document.addEventListener('touchstart', (e) => {
            for (let touch of e.changedTouches) {
                this.touchPoints.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    target: e.target
                });
            }
        });

        document.addEventListener('touchend', (e) => {
            for (let touch of e.changedTouches) {
                this.touchPoints.delete(touch.identifier);
            }
        });
    }

    handleDirectionPress(direction) {
        this.pressedKeys.add(direction);
        console.log(`Moving: ${direction}`);
        this.updatePlayerPosition(direction);
    }

    handleDirectionRelease(direction) {
        this.pressedKeys.delete(direction);
    }

    handleAction(action) {
        if (this.isOnCooldown(action)) return;
        
        console.log(`Action: ${action}`);
        
        switch(action) {
            case 'attack':
                this.performAttack();
                this.setCooldown(action, 500);
                break;
            case 'jump':
                this.performJump();
                this.setCooldown(action, 1000);
                break;
            case 'dodge':
                this.performDodge();
                this.setCooldown(action, 2000);
                break;
        }
    }

    handleSkill(skill) {
        if (this.isOnCooldown(`skill-${skill}`)) return;
        
        console.log(`Skill activated: ${skill}`);
        
        const cooldownTimes = {
            '1': 3000,
            '2': 5000,
            '3': 8000,
            'ultimate': 30000
        };
        
        this.activateSkill(skill);
        this.setCooldown(`skill-${skill}`, cooldownTimes[skill]);
        this.updateSkillCooldown(skill, cooldownTimes[skill]);
        
        // Consume energy
        if (skill === 'ultimate') {
            this.updateEnergy(-30);
        } else {
            this.updateEnergy(-10);
        }
    }

    handleItem(item) {
        const itemCount = document.querySelector(`.item-btn[data-item="${item}"] .item-count`);
        let count = parseInt(itemCount.textContent);
        
        if (count > 0) {
            console.log(`Using item: ${item}`);
            count--;
            itemCount.textContent = count;
            
            if (item === 'potion') {
                this.updateHealth(25);
            }
            
            this.createItemEffect(item);
        }
    }

    performAttack() {
        this.createVisualEffect('attack');
        this.updateScore(10);
    }

    performJump() {
        this.createVisualEffect('jump');
    }

    performDodge() {
        this.createVisualEffect('dodge');
        // Add invulnerability frames
        this.gameState.invulnerable = true;
        setTimeout(() => {
            this.gameState.invulnerable = false;
        }, 500);
    }

    activateSkill(skill) {
        this.createVisualEffect(`skill-${skill}`);
        
        if (skill === 'ultimate') {
            this.createUltimateEffect();
        }
    }

    setCooldown(action, duration) {
        const btn = document.querySelector(`[data-action="${action}"]`) || 
                   document.querySelector(`[data-skill="${action.replace('skill-', '')}"]`);
        
        if (btn) {
            const cooldownEl = btn.querySelector('.cooldown') || btn.querySelector('.skill-cooldown');
            if (cooldownEl) {
                cooldownEl.style.animation = `cooldownSweep ${duration}ms linear`;
                setTimeout(() => {
                    cooldownEl.style.animation = '';
                }, duration);
            }
        }
        
        this.cooldowns.set(action, Date.now() + duration);
        setTimeout(() => {
            this.cooldowns.delete(action);
        }, duration);
    }

    isOnCooldown(action) {
        const cooldownEnd = this.cooldowns.get(action);
        return cooldownEnd && Date.now() < cooldownEnd;
    }

    updateSkillCooldown(skill, duration) {
        const btn = document.querySelector(`.skill-btn[data-skill="${skill}"]`);
        const cooldownEl = btn.querySelector('.skill-cooldown');
        
        let remaining = Math.ceil(duration / 1000);
        cooldownEl.textContent = remaining;
        
        const interval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                cooldownEl.textContent = remaining;
            } else {
                cooldownEl.textContent = '';
                clearInterval(interval);
            }
        }, 1000);
    }

    updatePlayerPosition(direction) {
        const speed = 5;
        switch(direction) {
            case 'up':
                this.gameState.position.y = Math.max(0, this.gameState.position.y - speed);
                break;
            case 'down':
                this.gameState.position.y = Math.min(100, this.gameState.position.y + speed);
                break;
            case 'left':
                this.gameState.position.x = Math.max(0, this.gameState.position.x - speed);
                break;
            case 'right':
                this.gameState.position.x = Math.min(100, this.gameState.position.x + speed);
                break;
        }
        
        this.updateMinimap();
    }

    updateMinimap() {
        const playerDot = document.querySelector('.player-position');
        playerDot.style.left = `${this.gameState.position.x}%`;
        playerDot.style.top = `${this.gameState.position.y}%`;
    }

    updateHealth(amount) {
        this.gameState.health = Math.max(0, Math.min(this.gameState.maxHealth, this.gameState.health + amount));
        const healthFill = document.querySelector('.health-fill');
        const healthText = document.querySelector('.health-text');
        
        healthFill.style.width = `${(this.gameState.health / this.gameState.maxHealth) * 100}%`;
        healthText.textContent = `${this.gameState.health}/${this.gameState.maxHealth}`;
        
        if (amount < 0) {
            healthFill.style.animation = 'shake 0.3s';
            setTimeout(() => {
                healthFill.style.animation = '';
            }, 300);
        }
    }

    updateEnergy(amount) {
        this.gameState.energy = Math.max(0, Math.min(this.gameState.maxEnergy, this.gameState.energy + amount));
        const energyFill = document.querySelector('.energy-fill');
        const energyText = document.querySelector('.energy-text');
        
        energyFill.style.width = `${(this.gameState.energy / this.gameState.maxEnergy) * 100}%`;
        energyText.textContent = `${this.gameState.energy}/${this.gameState.maxEnergy}`;
    }

    updateScore(points) {
        this.gameState.score += points;
        document.querySelector('.score').textContent = `Score: ${this.gameState.score}`;
        
        // Level up every 100 points
        if (this.gameState.score >= this.gameState.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.gameState.level++;
        document.querySelector('.level').textContent = `Lv. ${this.gameState.level}`;
        this.createLevelUpEffect();
        this.vibrate(100);
    }

    createRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255,255,255,0.5);
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: ripple 0.5s ease-out;
        `;
        
        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }

    createVisualEffect(type) {
        const x = (this.gameState.position.x / 100) * this.canvas.width;
        const y = (this.gameState.position.y / 100) * this.canvas.height;
        
        this.ctx.save();
        
        switch(type) {
            case 'attack':
                this.drawAttackEffect(x, y);
                break;
            case 'jump':
                this.drawJumpEffect(x, y);
                break;
            case 'dodge':
                this.drawDodgeEffect(x, y);
                break;
            default:
                if (type.startsWith('skill-')) {
                    this.drawSkillEffect(x, y, type.replace('skill-', ''));
                }
        }
        
        this.ctx.restore();
    }

    drawAttackEffect(x, y) {
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, Math.PI * 2);
        this.ctx.stroke();
        
        setTimeout(() => {
            this.ctx.clearRect(x - 35, y - 35, 70, 70);
        }, 200);
    }

    drawJumpEffect(x, y) {
        this.ctx.fillStyle = 'rgba(100, 255, 100, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        setTimeout(() => {
            this.ctx.clearRect(x - 25, y - 25, 50, 50);
        }, 300);
    }

    drawDodgeEffect(x, y) {
        this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.ctx.beginPath();
                this.ctx.arc(x - i * 10, y, 15, 0, Math.PI * 2);
                this.ctx.stroke();
            }, i * 50);
        }
        
        setTimeout(() => {
            this.ctx.clearRect(x - 50, y - 20, 100, 40);
        }, 400);
    }

    drawSkillEffect(x, y, skill) {
        const colors = {
            '1': '#ff6600',
            '2': '#00ccff',
            '3': '#ffff00',
            'ultimate': '#ff00ff'
        };
        
        this.ctx.fillStyle = colors[skill] || '#ffffff';
        this.ctx.globalAlpha = 0.5;
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 10 + i * 10, 0, Math.PI * 2);
                this.ctx.fill();
            }, i * 100);
        }
        
        setTimeout(() => {
            this.ctx.clearRect(x - 60, y - 60, 120, 120);
        }, 600);
    }

    createUltimateEffect() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255,215,0,0.3), transparent);
            pointer-events: none;
            z-index: 999;
            animation: ultimateFlash 1s ease-out;
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 1000);
    }

    createItemEffect(item) {
        const effect = document.createElement('div');
        effect.textContent = item === 'potion' ? '+HP' : '💥';
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${item === 'potion' ? '#00ff00' : '#ff6600'};
            font-size: 30px;
            font-weight: bold;
            pointer-events: none;
            z-index: 999;
            animation: floatUp 1s ease-out;
        `;
        
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 1000);
    }

    createLevelUpEffect() {
        const effect = document.createElement('div');
        effect.textContent = 'LEVEL UP!';
        effect.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ffd700;
            font-size: 40px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 999;
            animation: levelUpPulse 1.5s ease-out;
        `;
        
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 1500);
    }

    vibrate(duration) {
        if (this.vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }

    initializeAudio() {
        // Audio context for sound effects (requires user interaction to start)
        this.audioContext = null;
        
        document.addEventListener('touchstart', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    playSound(frequency, duration) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }

    startGameLoop() {
        const gameLoop = () => {
            // Update game state
            this.update();
            
            // Render
            this.render();
            
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }

    update() {
        // Handle continuous movement
        this.pressedKeys.forEach(direction => {
            this.updatePlayerPosition(direction);
        });
        
        // Regenerate energy slowly
        if (this.gameState.energy < this.gameState.maxEnergy) {
            this.updateEnergy(0.05);
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player
        const x = (this.gameState.position.x / 100) * this.canvas.width;
        const y = (this.gameState.position.y / 100) * this.canvas.height;
        
        this.ctx.fillStyle = this.gameState.invulnerable ? 'rgba(255,255,255,0.5)' : '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw player glow
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ff00';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
}

// Settings Management
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            width: 100px;
            height: 100px;
            opacity: 0;
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes floatUp {
        to {
            transform: translate(-50%, -150%);
            opacity: 0;
        }
    }
    
    @keyframes levelUpPulse {
        0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
        }
    }
    
    @keyframes ultimateFlash {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the game controls
const gameControls = new MobileGameControls();

// Prevent zooming on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Initialize the game controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gameControls = new MobileGameControls();
    });
} else {
    // DOM is already loaded
    window.gameControls = new MobileGameControls();
}

// Log initialization
console.log('Mobile Game Controls initialized successfully!');