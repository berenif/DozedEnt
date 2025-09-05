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

        // Setup joystick
        this.setupJoystick();
    }

    setupJoystick() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        
        if (!joystickBase || !joystickKnob) return;

        let isJoystickActive = false;
        let joystickCenter = { x: 0, y: 0 };
        let currentDirection = null;

        const getJoystickCenter = () => {
            const rect = joystickBase.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        };

        const handleJoystickMove = (clientX, clientY) => {
            if (!isJoystickActive) return;

            const center = getJoystickCenter();
            const dx = clientX - center.x;
            const dy = clientY - center.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = joystickBase.offsetWidth / 2 - joystickKnob.offsetWidth / 2;

            let knobX = dx;
            let knobY = dy;

            if (distance > maxDistance) {
                const angle = Math.atan2(dy, dx);
                knobX = Math.cos(angle) * maxDistance;
                knobY = Math.sin(angle) * maxDistance;
            }

            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

            // Determine direction
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            let newDirection = null;

            if (distance > 20) {
                if (angle > -45 && angle <= 45) {
                    newDirection = 'right';
                } else if (angle > 45 && angle <= 135) {
                    newDirection = 'down';
                } else if (angle > -135 && angle <= -45) {
                    newDirection = 'up';
                } else {
                    newDirection = 'left';
                }
            }

            if (newDirection !== currentDirection) {
                if (currentDirection) {
                    this.handleDirectionRelease(currentDirection);
                }
                if (newDirection) {
                    this.handleDirectionPress(newDirection);
                }
                currentDirection = newDirection;
            }
        };

        const resetJoystick = () => {
            isJoystickActive = false;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            if (currentDirection) {
                this.handleDirectionRelease(currentDirection);
                currentDirection = null;
            }
        };

        // Touch events
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isJoystickActive = true;
            const touch = e.touches[0];
            handleJoystickMove(touch.clientX, touch.clientY);
        });

        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleJoystickMove(touch.clientX, touch.clientY);
        });

        joystickBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            resetJoystick();
        });

        joystickBase.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            resetJoystick();
        });

        // Mouse events for testing
        joystickBase.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isJoystickActive = true;
            handleJoystickMove(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (isJoystickActive) {
                e.preventDefault();
                handleJoystickMove(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isJoystickActive) {
                e.preventDefault();
                resetJoystick();
            }
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
        
        // Simulate keyboard events for the actual game
        const keyMap = {
            'up': 'w',
            'down': 's',
            'left': 'a',
            'right': 'd'
        };
        
        const key = keyMap[direction];
        if (key) {
            const event = new KeyboardEvent('keydown', {
                key: key,
                code: 'Key' + key.toUpperCase(),
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        }
    }

    handleDirectionRelease(direction) {
        this.pressedKeys.delete(direction);
        
        // Simulate keyboard release for the actual game
        const keyMap = {
            'up': 'w',
            'down': 's',
            'left': 'a',
            'right': 'd'
        };
        
        const key = keyMap[direction];
        if (key) {
            const event = new KeyboardEvent('keyup', {
                key: key,
                code: 'Key' + key.toUpperCase(),
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        }
    }

    handleAction(action) {
        if (this.isOnCooldown(action)) return;
        
        console.log(`Action: ${action}`);
        
        // Map actions to keyboard keys used by the game
        const actionKeyMap = {
            'attack': 'l',
            'roll': 'k',
            'block': 'm'
        };
        
        const key = actionKeyMap[action];
        if (key) {
            // Simulate keydown
            const keydownEvent = new KeyboardEvent('keydown', {
                key: key,
                code: 'Key' + key.toUpperCase(),
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(keydownEvent);
            
            // Simulate keyup after a short delay
            setTimeout(() => {
                const keyupEvent = new KeyboardEvent('keyup', {
                    key: key,
                    code: 'Key' + key.toUpperCase(),
                    bubbles: true,
                    cancelable: true
                });
                window.dispatchEvent(keyupEvent);
            }, 100);
        }
        
        switch(action) {
            case 'attack':
                this.performAttack();
                this.setCooldown(action, 500);
                break;
            case 'roll':
                this.performRoll();
                this.setCooldown(action, 1500);
                break;
            case 'block':
                this.performBlock();
                this.setCooldown(action, 1000);
                break;
            case 'jump':
                this.performJump();
                this.setCooldown(action, 200); // Short cooldown to prevent spam
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

    performRoll() {
        this.createVisualEffect('roll');
        // Add invulnerability frames during roll
        this.gameState.invulnerable = true;
        setTimeout(() => {
            this.gameState.invulnerable = false;
        }, 800);
    }

    performBlock() {
        this.createVisualEffect('block');
        // Add damage reduction while blocking
        this.gameState.blocking = true;
        setTimeout(() => {
            this.gameState.blocking = false;
        }, 1000);
    }

    performJump() {
        // Simulate spacebar press for jump
        const keydownEvent = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(keydownEvent);
        
        // Simulate keyup after a short delay
        setTimeout(() => {
            const keyupEvent = new KeyboardEvent('keyup', {
                key: ' ',
                code: 'Space',
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(keyupEvent);
        }, 100);
        
        this.createVisualEffect('jump');
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

    // Note: Player position is now handled by the main game (site.js)
    // This method is kept for compatibility but does nothing
    updatePlayerPosition(direction) {
        // Position updates are handled by the main game through keyboard events
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
            case 'roll':
                this.drawRollEffect(x, y);
                break;
            case 'block':
                this.drawBlockEffect(x, y);
                break;
            case 'jump':
                this.drawJumpEffect(x, y);
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

    drawRollEffect(x, y) {
        // Spinning roll effect
        this.ctx.strokeStyle = 'rgba(150, 150, 255, 0.6)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate((Math.PI / 2) * i);
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 25, 0, Math.PI);
                this.ctx.stroke();
                this.ctx.restore();
            }, i * 100);
        }
        
        setTimeout(() => {
            this.ctx.clearRect(x - 30, y - 30, 60, 60);
        }, 500);
    }

    drawBlockEffect(x, y) {
        // Shield/barrier effect
        this.ctx.strokeStyle = '#4488ff';
        this.ctx.fillStyle = 'rgba(68, 136, 255, 0.2)';
        this.ctx.lineWidth = 3;
        
        // Draw hexagonal shield
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = x + Math.cos(angle) * 35;
            const py = y + Math.sin(angle) * 35;
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        setTimeout(() => {
            this.ctx.clearRect(x - 40, y - 40, 80, 80);
        }, 600);
    }

    drawJumpEffect(x, y) {
        // Jump burst effect
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        
        // Draw upward burst rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.ctx.save();
                this.ctx.globalAlpha = 0.7 - i * 0.2;
                
                // Ring
                this.ctx.beginPath();
                this.ctx.arc(x, y + 20, 15 + i * 8, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Upward particles
                for (let j = 0; j < 5; j++) {
                    const angle = (j / 5) * Math.PI * 2;
                    const particleX = x + Math.cos(angle) * (10 + i * 5);
                    const particleY = y + 20 + Math.sin(angle) * (10 + i * 5);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(particleX, particleY - i * 10, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }, i * 50);
        }
        
        setTimeout(() => {
            this.ctx.clearRect(x - 40, y - 20, 80, 80);
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
        // Note: Movement is now handled by the main game through keyboard events
        // We don't need to update position here anymore
        
        // Regenerate energy slowly
        if (this.gameState.energy < this.gameState.maxEnergy) {
            this.updateEnergy(0.05);
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Note: The actual player is rendered by site.js as a blue div element
        // This canvas is only for visual effects like attacks, skills, etc.
        // We don't draw the player here to avoid duplicate visualization
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

// Log initialization
console.log('Mobile Game Controls initialized successfully!');