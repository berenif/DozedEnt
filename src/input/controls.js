// Enhanced Mobile Game Controls - Integrated with InputManager
class MobileGameControls {
    constructor(inputManager = null) {
        this.inputManager = inputManager;
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
        
        // Enhanced touch support
        this.multiTouchEnabled = true;
        this.gestureSupport = {
            swipe: true,
            pinch: false, // Disabled for now
            longPress: true
        };
        
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
        // Enhanced action buttons with proper 5-button combat system mapping
        this.setupActionButtons();
        
        // Enhanced joystick (already handled by InputManager, but add visual enhancements)
        this.enhanceJoystick();
        
        // Setup gesture recognition
        this.setupGestures();
        
        // D-Pad controls (if present)
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
    }
    
    /**
     * Setup enhanced action buttons with 5-button combat system
     */
    setupActionButtons() {
        // Create enhanced action buttons if they don't exist
        this.createEnhancedActionButtons();
        
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            // Enhanced touch events with haptic feedback
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const action = this.getButtonAction(btn);
                this.handleActionStart(action, btn);
                this.vibrate(this.getVibrationIntensity(action));
                this.createRippleEffect(btn);
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const action = this.getButtonAction(btn);
                this.handleActionEnd(action, btn);
            });

            // Mouse events for desktop testing
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const action = this.getButtonAction(btn);
                this.handleActionStart(action, btn);
                this.createRippleEffect(btn);
            });
            
            btn.addEventListener('mouseup', (e) => {
                e.preventDefault();
                const action = this.getButtonAction(btn);
                this.handleActionEnd(action, btn);
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
        const joystickCenter = { x: 0, y: 0 };
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
            for (const touch of e.changedTouches) {
                this.touchPoints.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    target: e.target
                });
            }
        });

        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
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
        
        // Map actions to keyboard keys used by the game - 5-button combat system
        const actionKeyMap = {
            'lightAttack': 'j',     // A1 - Light Attack
            'heavyAttack': 'k',     // A2 - Heavy Attack
            'block': 'shift',       // Block - Hold to guard
            'roll': 'control',      // Roll - Dodge
            'special': 'l',         // Special - Hero move
            // Legacy
            'attack': 'j'           // Maps to light attack
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
            case 'lightAttack':
                this.performLightAttack();
                this.setCooldown(action, 350); // Fast attacks
                break;
            case 'heavyAttack':
                this.performHeavyAttack();
                this.setCooldown(action, 800); // Slower heavy attacks
                break;
            case 'special':
                this.performSpecial();
                this.setCooldown(action, 2000); // Long cooldown for hero moves
                break;
            case 'block':
                this.performBlock();
                this.setCooldown(action, 100); // Short cooldown for blocking
                break;
            case 'roll':
                this.performRoll();
                this.setCooldown(action, 800); // Roll cooldown matches WASM
                break;
            // Legacy
            case 'attack':
                this.performLightAttack(); // Maps to light attack
                this.setCooldown(action, 350);
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

    /**
     * Create enhanced action buttons for 5-button combat system
     */
    createEnhancedActionButtons() {
        const actionsContainer = document.getElementById('actions');
        if (!actionsContainer) return;
        
        // Check if enhanced buttons already exist
        if (actionsContainer.querySelector('[data-action="lightAttack"]')) return;
        
        // Clear existing buttons
        actionsContainer.innerHTML = '';
        
        // Create three-button layout (Left, Special, Right)
        const buttons = [
            { action: 'leftHand', emoji: '👊', title: 'Left Hand (J)', color: '#ffaa00' },
            { action: 'special3', emoji: '✨', title: 'Special / Roll (K + dir)', color: '#44ff44' },
            { action: 'rightHand', emoji: '✋', title: 'Right Hand (L)', color: '#ff4444' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'action-btn enhanced-btn';
            button.dataset.action = btn.action;
            button.title = btn.title;
            button.innerHTML = `
                <span class="btn-emoji">${btn.emoji}</span>
                <div class="cooldown-overlay" style="--btn-color: ${btn.color}"></div>
            `;
            button.style.setProperty('--btn-color', btn.color);
            actionsContainer.appendChild(button);
        });
    }
    
    /**
     * Get button action from element
     */
    getButtonAction(btn) {
        return btn.dataset.action || btn.id.replace('Btn', '').replace('-button', '');
    }
    
    /**
     * Get vibration intensity for action
     */
    getVibrationIntensity(action) {
        const intensities = {
            'lightAttack': 15,
            'heavyAttack': 30,
            'special': 40,
            'block': 10,
            'roll': 20,
            // Legacy
            'attack': 20
        };
        return intensities[action] || 15;
    }
    
    /**
     * Handle action start with enhanced feedback
     */
    handleActionStart(action, button) {
        if (this.isOnCooldown(action)) {
            this.vibrate(5); // Light vibration for cooldown feedback
            return;
        }
        
        // Visual feedback
        button.classList.add('pressed');
        
        // Handle action through InputManager if available
        if (this.inputManager) {
            // Drive three-button booleans on InputManager directly
            if (action === 'leftHand') this.inputManager.inputState.leftHand = true;
            if (action === 'rightHand') this.inputManager.inputState.rightHand = true;
            if (action === 'special3') this.inputManager.inputState.special3 = true;
            return;
        }
        
        // Fallback to legacy handling
        this.handleAction(action);
    }
    
    /**
     * Handle action end
     */
    handleActionEnd(action, button) {
        // Remove visual feedback and clear InputManager flags
        button.classList.remove('pressed');
        if (this.inputManager) {
            const action = this.getButtonAction(button);
            if (action === 'leftHand') this.inputManager.inputState.leftHand = false;
            if (action === 'rightHand') this.inputManager.inputState.rightHand = false;
            if (action === 'special3') this.inputManager.inputState.special3 = false;
        }
    }
    
    /**
     * Enhance joystick with visual improvements
     */
    enhanceJoystick() {
        const joystick = document.getElementById('joystick-base');
        if (!joystick) return;
        
        // Add glow effect on touch
        joystick.addEventListener('touchstart', () => {
            joystick.classList.add('active');
        });
        
        joystick.addEventListener('touchend', () => {
            joystick.classList.remove('active');
        });
        
        // Add directional indicators
        const indicators = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        indicators.forEach((dir, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'direction-indicator';
            indicator.textContent = dir;
            const angle = (index * 45) - 90; // Start from top
            indicator.style.transform = `rotate(${angle}deg) translateY(-65px) rotate(-${angle}deg)`;
            joystick.appendChild(indicator);
        });
    }
    
    /**
     * Setup gesture recognition
     */
    setupGestures() {
        if (!this.gestureSupport.swipe && !this.gestureSupport.longPress) return;
        
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        let longPressTimer = null;
        
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.mobile-controls')) return; // Skip for control elements
            
            touchStartTime = Date.now();
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            
            // Long press detection
            if (this.gestureSupport.longPress) {
                longPressTimer = setTimeout(() => {
                    this.handleLongPress(touch.clientX, touch.clientY);
                }, 800);
            }
        });
        
        document.addEventListener('touchmove', (_e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            const touchEndTime = Date.now();
            const touch = e.changedTouches[0];
            
            // Swipe detection
            if (this.gestureSupport.swipe && touchEndTime - touchStartTime < 500) {
                const deltaX = touch.clientX - touchStartPos.x;
                const deltaY = touch.clientY - touchStartPos.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > 50) {
                    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
                    this.handleSwipe(angle, distance);
                }
            }
        });
    }
    
    /**
     * Handle swipe gesture
     */
    handleSwipe(angle, _distance) {
        // Map swipe to actions
        if (angle > -45 && angle < 45) {
            // Right swipe - could be dodge right or special attack
            this.handleAction('special');
        } else if (angle > 45 && angle < 135) {
            // Down swipe - could be heavy attack
            this.handleAction('heavyAttack');
        } else if (angle > 135 || angle < -135) {
            // Left swipe - could be dodge left or block
            this.handleAction('block');
        } else {
            // Up swipe - could be light attack or jump
            this.handleAction('lightAttack');
        }
        
        this.vibrate(20);
    }
    
    /**
     * Handle long press gesture
     */
    handleLongPress(x, y) {
        // Long press could trigger special abilities or context menu
        this.handleAction('special');
        this.vibrate(50);
        
        // Create visual feedback
        const feedback = document.createElement('div');
        feedback.className = 'long-press-feedback';
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border: 3px solid #fff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            animation: longPressPulse 0.5s ease-out;
        `;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 500);
    }

    performAttack() {
        this.createVisualEffect('attack');
        this.updateScore(10);
    }
    
    performLightAttack() {
        this.createVisualEffect('lightAttack');
        this.updateScore(10);
    }
    
    performHeavyAttack() {
        this.createVisualEffect('heavyAttack');
        this.updateScore(20);
    }
    
    performSpecial() {
        this.createVisualEffect('special');
        this.updateScore(50);
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
    updatePlayerPosition(_direction) {
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

// Interface Switcher for Mobile Controls
class InterfaceSwitcher {
    constructor() {
        this.currentInterface = 'default'; // 'default', 'compact', 'minimal'
        this.mobileControls = null;
        this.init();
    }

    init() {
        this.mobileControls = document.getElementById('mobile-controls');
        this.switcherButton = document.getElementById('interface-switcher');
        
        if (!this.mobileControls || !this.switcherButton) {
            console.warn('Interface switcher elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadSavedInterface();
        this.updateInterface();
    }

    setupEventListeners() {
        this.switcherButton.addEventListener('click', () => {
            this.switchInterface();
        });

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateInterface();
            }, 100);
        });

        // Listen for resize events
        window.addEventListener('resize', () => {
            this.updateInterface();
        });
    }

    switchInterface() {
        const interfaces = ['default', 'compact', 'minimal'];
        const currentIndex = interfaces.indexOf(this.currentInterface);
        const nextIndex = (currentIndex + 1) % interfaces.length;
        
        this.currentInterface = interfaces[nextIndex];
        this.updateInterface();
        this.saveInterface();
        
        // Provide visual feedback
        this.switcherButton.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.switcherButton.style.transform = 'scale(1)';
        }, 200);
    }

    updateInterface() {
        if (!this.mobileControls) return;

        // Remove all interface classes
        this.mobileControls.classList.remove('interface-compact', 'interface-minimal');
        
        // Add current interface class
        if (this.currentInterface !== 'default') {
            this.mobileControls.classList.add(`interface-${this.currentInterface}`);
        }

        // Update switcher button icon
        const icons = {
            'default': '🔄',
            'compact': '📱',
            'minimal': '🎯'
        };
        this.switcherButton.textContent = icons[this.currentInterface];

        // Update quick stats visibility
        const centerSpacer = this.mobileControls.querySelector('.center-spacer');
        if (centerSpacer) {
            centerSpacer.style.display = this.currentInterface === 'compact' ? 'flex' : 'none';
        }

        // Update stats in compact interface
        if (this.currentInterface === 'compact') {
            this.updateQuickStats();
        }
    }

    updateQuickStats() {
        const healthStat = document.getElementById('health-stat');
        const scoreStat = document.getElementById('score-stat');
        const levelStat = document.getElementById('level-stat');

        if (healthStat && gameControls) {
            healthStat.textContent = gameControls.gameState.health;
        }
        if (scoreStat && gameControls) {
            scoreStat.textContent = gameControls.gameState.score;
        }
        if (levelStat && gameControls) {
            levelStat.textContent = gameControls.gameState.level;
        }
    }

    saveInterface() {
        try {
            localStorage.setItem('mobileInterface', this.currentInterface);
        } catch (e) {
            console.warn('Could not save interface preference:', e);
        }
    }

    loadSavedInterface() {
        try {
            const saved = localStorage.getItem('mobileInterface');
            if (saved && ['default', 'compact', 'minimal'].includes(saved)) {
                this.currentInterface = saved;
            }
        } catch (e) {
            console.warn('Could not load interface preference:', e);
        }
    }

    // Public method to get current interface
    getCurrentInterface() {
        return this.currentInterface;
    }

    // Public method to set interface programmatically
    setInterface(interfaceName) {
        if (['default', 'compact', 'minimal'].includes(interfaceName)) {
            this.currentInterface = interfaceName;
            this.updateInterface();
            this.saveInterface();
        }
    }
}

// Initialize the game controls
const gameControls = new MobileGameControls();

// Initialize interface switcher
const interfaceSwitcher = new InterfaceSwitcher();

// Update quick stats periodically for compact interface
setInterval(() => {
    if (interfaceSwitcher.getCurrentInterface() === 'compact') {
        interfaceSwitcher.updateQuickStats();
    }
}, 1000);

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
console.log('Interface Switcher initialized successfully!');