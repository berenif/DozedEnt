/**
 * Tutorial System
 * 
 * Comprehensive tutorial system for guiding players through each game phase
 * Provides interactive tutorials, tooltips, and phase-specific guidance
 */

export class TutorialSystem {
    constructor(wasmModule, gameRenderer) {
        this.wasm = wasmModule;
        this.renderer = gameRenderer;
        
        // Tutorial state
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.tutorialsCompleted = new Set();
        this.tutorialSettings = {
            enabled: true,
            showTooltips: true,
            autoAdvance: false,
            skipCompleted: true
        };
        
        // Tutorial data for each phase
        this.tutorialData = {
            // Explore Phase Tutorial
            explore: {
                id: 'explore',
                name: 'Exploration Phase',
                description: 'Learn how to explore and navigate the world',
                steps: [
                    {
                        id: 'movement',
                        title: 'Movement Controls',
                        content: 'Use WASD or arrow keys to move your character. You can move in all directions.',
                        type: 'instruction',
                        highlight: 'movement',
                        action: 'move_around'
                    },
                    {
                        id: 'camera',
                        title: 'Camera Control',
                        content: 'The camera follows your character automatically. You can zoom in/out with mouse wheel.',
                        type: 'instruction',
                        highlight: 'camera',
                        action: 'zoom_test'
                    },
                    {
                        id: 'interaction',
                        title: 'Interacting with Objects',
                        content: 'Press E or click on interactive objects to interact with them.',
                        type: 'instruction',
                        highlight: 'interaction',
                        action: 'interact_test'
                    },
                    {
                        id: 'exploration_complete',
                        title: 'Exploration Complete',
                        content: 'Great! You\'ve learned the basics of exploration. Move around to find enemies and progress.',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // Fight Phase Tutorial
            fight: {
                id: 'fight',
                name: 'Combat Phase',
                description: 'Master the 5-button combat system',
                steps: [
                    {
                        id: 'light_attack',
                        title: 'Light Attack (A1)',
                        content: 'Press A1 or left mouse button for quick, low-damage attacks. Great for combos!',
                        type: 'instruction',
                        highlight: 'combat_light',
                        action: 'light_attack'
                    },
                    {
                        id: 'heavy_attack',
                        title: 'Heavy Attack (A2)',
                        content: 'Press A2 or right mouse button for powerful, slow attacks. High damage but leaves you vulnerable.',
                        type: 'instruction',
                        highlight: 'combat_heavy',
                        action: 'heavy_attack'
                    },
                    {
                        id: 'block_parry',
                        title: 'Block and Parry',
                        content: 'Hold Block to reduce damage. Tap Block at the right moment for a perfect parry!',
                        type: 'instruction',
                        highlight: 'combat_block',
                        action: 'block_test'
                    },
                    {
                        id: 'roll_dodge',
                        title: 'Roll and Dodge',
                        content: 'Press Roll to dodge attacks and move quickly. Use it to escape danger!',
                        type: 'instruction',
                        highlight: 'combat_roll',
                        action: 'roll_test'
                    },
                    {
                        id: 'special_move',
                        title: 'Special Move',
                        content: 'Press Special for your character\'s unique ability. Each character has different special moves!',
                        type: 'instruction',
                        highlight: 'combat_special',
                        action: 'special_test'
                    },
                    {
                        id: 'combat_complete',
                        title: 'Combat Mastery',
                        content: 'Excellent! You\'ve learned the combat basics. Practice these moves to become a master fighter!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // Choose Phase Tutorial
            choose: {
                id: 'choose',
                name: 'Choice Phase',
                description: 'Learn about the choice system and upgrades',
                steps: [
                    {
                        id: 'choice_intro',
                        title: 'Making Choices',
                        content: 'After defeating enemies, you\'ll be offered choices. Each choice gives you different upgrades!',
                        type: 'instruction',
                        highlight: 'choice_system',
                        action: 'show_choices'
                    },
                    {
                        id: 'choice_types',
                        title: 'Choice Types',
                        content: 'Safe choices (green) are defensive. Spicy choices (red) are offensive. Weird choices (blue) are unique!',
                        type: 'instruction',
                        highlight: 'choice_types',
                        action: 'explain_types'
                    },
                    {
                        id: 'choice_rarity',
                        title: 'Choice Rarity',
                        content: 'Common (white), Uncommon (green), Rare (blue), Legendary (purple). Rarer choices are more powerful!',
                        type: 'instruction',
                        highlight: 'choice_rarity',
                        action: 'explain_rarity'
                    },
                    {
                        id: 'choice_selection',
                        title: 'Selecting Choices',
                        content: 'Click on a choice to select it. You can only pick one choice per round!',
                        type: 'instruction',
                        highlight: 'choice_selection',
                        action: 'select_choice'
                    },
                    {
                        id: 'choice_complete',
                        title: 'Choice Mastery',
                        content: 'Perfect! You understand the choice system. Choose wisely to build your character!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // PowerUp Phase Tutorial
            powerup: {
                id: 'powerup',
                name: 'Power-Up Phase',
                description: 'Learn about power-ups and temporary boosts',
                steps: [
                    {
                        id: 'powerup_intro',
                        title: 'Power-Ups Available',
                        content: 'Power-ups are temporary boosts that enhance your abilities for a short time.',
                        type: 'instruction',
                        highlight: 'powerup_system',
                        action: 'show_powerups'
                    },
                    {
                        id: 'powerup_types',
                        title: 'Power-Up Types',
                        content: 'Damage boost, speed boost, defense boost, and special abilities. Each has different effects!',
                        type: 'instruction',
                        highlight: 'powerup_types',
                        action: 'explain_powerup_types'
                    },
                    {
                        id: 'powerup_duration',
                        title: 'Power-Up Duration',
                        content: 'Power-ups last for a limited time. Use them strategically during combat!',
                        type: 'instruction',
                        highlight: 'powerup_duration',
                        action: 'show_duration'
                    },
                    {
                        id: 'powerup_complete',
                        title: 'Power-Up Mastery',
                        content: 'Great! You understand power-ups. Use them wisely to gain an advantage!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // Risk Phase Tutorial
            risk: {
                id: 'risk',
                name: 'Risk Phase',
                description: 'Learn about risk and reward mechanics',
                steps: [
                    {
                        id: 'risk_intro',
                        title: 'Risk Phase',
                        content: 'The Risk phase offers high rewards but comes with danger. Choose your risk level!',
                        type: 'instruction',
                        highlight: 'risk_system',
                        action: 'show_risk'
                    },
                    {
                        id: 'risk_levels',
                        title: 'Risk Levels',
                        content: 'Low risk = small rewards. High risk = big rewards but more danger. Choose wisely!',
                        type: 'instruction',
                        highlight: 'risk_levels',
                        action: 'explain_risk_levels'
                    },
                    {
                        id: 'risk_rewards',
                        title: 'Risk Rewards',
                        content: 'Higher risk means better loot, more gold, and rare items. But enemies are stronger too!',
                        type: 'instruction',
                        highlight: 'risk_rewards',
                        action: 'show_risk_rewards'
                    },
                    {
                        id: 'risk_escape',
                        title: 'Escaping Risk',
                        content: 'You can escape the Risk phase early if it gets too dangerous. Press Escape to leave!',
                        type: 'instruction',
                        highlight: 'risk_escape',
                        action: 'show_escape'
                    },
                    {
                        id: 'risk_complete',
                        title: 'Risk Mastery',
                        content: 'Excellent! You understand risk and reward. Take calculated risks for better rewards!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // Escalate Phase Tutorial
            escalate: {
                id: 'escalate',
                name: 'Escalation Phase',
                description: 'Learn about escalation and increasing difficulty',
                steps: [
                    {
                        id: 'escalate_intro',
                        title: 'Escalation Phase',
                        content: 'The Escalation phase increases difficulty but offers better rewards. Are you ready?',
                        type: 'instruction',
                        highlight: 'escalate_system',
                        action: 'show_escalation'
                    },
                    {
                        id: 'escalate_difficulty',
                        title: 'Increasing Difficulty',
                        content: 'Enemies become stronger, faster, and more numerous. Your skills will be tested!',
                        type: 'instruction',
                        highlight: 'escalate_difficulty',
                        action: 'show_difficulty_increase'
                    },
                    {
                        id: 'escalate_rewards',
                        title: 'Escalation Rewards',
                        content: 'Better rewards await those who survive the escalation. Rare items and massive gold!',
                        type: 'instruction',
                        highlight: 'escalate_rewards',
                        action: 'show_escalation_rewards'
                    },
                    {
                        id: 'escalate_complete',
                        title: 'Escalation Mastery',
                        content: 'Outstanding! You understand escalation. Push your limits for greater rewards!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // CashOut Phase Tutorial
            cashout: {
                id: 'cashout',
                name: 'Cash-Out Phase',
                description: 'Learn about cashing out and managing rewards',
                steps: [
                    {
                        id: 'cashout_intro',
                        title: 'Cash-Out Phase',
                        content: 'The Cash-Out phase lets you spend your hard-earned rewards. Time to shop!',
                        type: 'instruction',
                        highlight: 'cashout_system',
                        action: 'show_cashout'
                    },
                    {
                        id: 'cashout_shop',
                        title: 'Shopping',
                        content: 'Use your gold to buy weapons, armor, and items. Each purchase makes you stronger!',
                        type: 'instruction',
                        highlight: 'cashout_shop',
                        action: 'show_shop'
                    },
                    {
                        id: 'cashout_upgrades',
                        title: 'Upgrades',
                        content: 'Spend essence on permanent upgrades. These improvements last between runs!',
                        type: 'instruction',
                        highlight: 'cashout_upgrades',
                        action: 'show_upgrades'
                    },
                    {
                        id: 'cashout_save',
                        title: 'Saving Progress',
                        content: 'Your progress is automatically saved. You can also manually save your game!',
                        type: 'instruction',
                        highlight: 'cashout_save',
                        action: 'show_save'
                    },
                    {
                        id: 'cashout_complete',
                        title: 'Cash-Out Mastery',
                        content: 'Perfect! You understand the cash-out system. Spend wisely to grow stronger!',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            },
            
            // Reset Phase Tutorial
            reset: {
                id: 'reset',
                name: 'Reset Phase',
                description: 'Learn about resetting and starting over',
                steps: [
                    {
                        id: 'reset_intro',
                        title: 'Reset Phase',
                        content: 'The Reset phase prepares you for the next run. Your progress is preserved!',
                        type: 'instruction',
                        highlight: 'reset_system',
                        action: 'show_reset'
                    },
                    {
                        id: 'reset_progress',
                        title: 'Progress Preservation',
                        content: 'Your achievements, statistics, and unlocked content are saved permanently.',
                        type: 'instruction',
                        highlight: 'reset_progress',
                        action: 'show_progress_preservation'
                    },
                    {
                        id: 'reset_new_run',
                        title: 'Starting New Run',
                        content: 'Each new run offers fresh challenges and opportunities. No two runs are the same!',
                        type: 'instruction',
                        highlight: 'reset_new_run',
                        action: 'show_new_run'
                    },
                    {
                        id: 'reset_complete',
                        title: 'Reset Mastery',
                        content: 'Excellent! You understand the reset system. Ready for your next adventure?',
                        type: 'completion',
                        highlight: 'none',
                        action: 'none'
                    }
                ]
            }
        };
        
        this.init();
    }
    
    /**
     * Initialize tutorial system
     */
    init() {
        this.setupEventListeners();
        this.loadTutorialSettings();
        this.createTutorialUI();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for phase changes
        window.addEventListener('phaseTransition', (event) => {
            this.handlePhaseTransition(event.detail);
        });
        
        // Listen for tutorial requests
        window.addEventListener('requestTutorial', (event) => {
            this.startTutorial(event.detail.phase);
        });
        
        // Listen for tutorial completion
        window.addEventListener('tutorialCompleted', (event) => {
            this.handleTutorialCompletion(event.detail);
        });
    }
    
    /**
     * Create tutorial UI
     */
    createTutorialUI() {
        // Create tutorial overlay
        this.tutorialOverlay = document.createElement('div');
        this.tutorialOverlay.id = 'tutorial-overlay';
        this.tutorialOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: none;
            pointer-events: auto;
        `;
        
        // Create tutorial panel
        this.tutorialPanel = document.createElement('div');
        this.tutorialPanel.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            border: 2px solid #3498db;
            border-radius: 15px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            color: white;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        // Create tutorial content
        this.tutorialContent = document.createElement('div');
        this.tutorialContent.innerHTML = `
            <div class="tutorial-header">
                <h2 id="tutorial-title" style="margin: 0 0 10px 0; color: #3498db; font-size: 24px;"></h2>
                <p id="tutorial-description" style="margin: 0 0 20px 0; color: #bdc3c7; font-size: 16px;"></p>
            </div>
            <div class="tutorial-body">
                <div id="tutorial-step-content" style="margin-bottom: 20px; font-size: 18px; line-height: 1.6;"></div>
                <div class="tutorial-progress" style="margin-bottom: 20px;">
                    <div style="background: #34495e; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div id="tutorial-progress-bar" style="background: #3498db; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <div id="tutorial-step-counter" style="text-align: center; margin-top: 5px; color: #bdc3c7; font-size: 14px;"></div>
                </div>
            </div>
            <div class="tutorial-footer">
                <button id="tutorial-prev" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer; font-size: 16px;">Previous</button>
                <button id="tutorial-next" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer; font-size: 16px;">Next</button>
                <button id="tutorial-skip" style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px;">Skip Tutorial</button>
                <button id="tutorial-close" style="background: #34495e; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px;">Close</button>
            </div>
        `;
        
        this.tutorialPanel.appendChild(this.tutorialContent);
        this.tutorialOverlay.appendChild(this.tutorialPanel);
        document.body.appendChild(this.tutorialOverlay);
        
        // Setup button event listeners
        this.setupTutorialButtons();
    }
    
    /**
     * Setup tutorial button event listeners
     */
    setupTutorialButtons() {
        const prevBtn = document.getElementById('tutorial-prev');
        const nextBtn = document.getElementById('tutorial-next');
        const skipBtn = document.getElementById('tutorial-skip');
        const closeBtn = document.getElementById('tutorial-close');
        
        prevBtn.addEventListener('click', () => this.previousStep());
        nextBtn.addEventListener('click', () => this.nextStep());
        skipBtn.addEventListener('click', () => this.skipTutorial());
        closeBtn.addEventListener('click', () => this.closeTutorial());
    }
    
    /**
     * Handle phase transition
     */
    handlePhaseTransition(phaseData) {
        if (this.tutorialSettings.enabled && !this.tutorialsCompleted.has(phaseData.phase)) {
            // Auto-start tutorial for new phases
            setTimeout(() => {
                this.startTutorial(phaseData.phase);
            }, 1000);
        }
    }
    
    /**
     * Start tutorial for a specific phase
     */
    startTutorial(phase) {
        if (!this.tutorialSettings.enabled) return;
        
        const tutorial = this.tutorialData[phase];
        if (!tutorial) {
            console.warn(`No tutorial found for phase: ${phase}`);
            return;
        }
        
        this.currentTutorial = tutorial;
        this.currentStep = 0;
        this.isActive = true;
        
        this.showTutorial();
        this.updateTutorialDisplay();
    }
    
    /**
     * Show tutorial overlay
     */
    showTutorial() {
        this.tutorialOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Hide tutorial overlay
     */
    hideTutorial() {
        this.tutorialOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    /**
     * Update tutorial display
     */
    updateTutorialDisplay() {
        if (!this.currentTutorial) return;
        
        const step = this.currentTutorial.steps[this.currentStep];
        const totalSteps = this.currentTutorial.steps.length;
        
        // Update header
        document.getElementById('tutorial-title').textContent = this.currentTutorial.name;
        document.getElementById('tutorial-description').textContent = this.currentTutorial.description;
        
        // Update step content
        document.getElementById('tutorial-step-content').textContent = step.content;
        
        // Update progress
        const progress = ((this.currentStep + 1) / totalSteps) * 100;
        document.getElementById('tutorial-progress-bar').style.width = `${progress}%`;
        document.getElementById('tutorial-step-counter').textContent = `Step ${this.currentStep + 1} of ${totalSteps}`;
        
        // Update buttons
        const prevBtn = document.getElementById('tutorial-prev');
        const nextBtn = document.getElementById('tutorial-next');
        
        prevBtn.style.display = this.currentStep > 0 ? 'inline-block' : 'none';
        
        if (this.currentStep === totalSteps - 1) {
            nextBtn.textContent = 'Complete';
            nextBtn.style.background = '#f39c12';
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.style.background = '#27ae60';
        }
        
        // Handle step-specific actions
        this.handleStepAction(step);
    }
    
    /**
     * Handle step-specific actions
     */
    handleStepAction(step) {
        switch (step.action) {
            case 'move_around':
                this.highlightMovement();
                break;
            case 'light_attack':
                this.highlightCombat('light');
                break;
            case 'heavy_attack':
                this.highlightCombat('heavy');
                break;
            case 'block_test':
                this.highlightCombat('block');
                break;
            case 'roll_test':
                this.highlightCombat('roll');
                break;
            case 'special_test':
                this.highlightCombat('special');
                break;
            case 'show_choices':
                this.highlightChoices();
                break;
            case 'show_shop':
                this.highlightShop();
                break;
            default:
                this.clearHighlights();
                break;
        }
    }
    
    /**
     * Highlight movement controls
     */
    highlightMovement() {
        // This would highlight movement controls in the UI
        console.log('Highlighting movement controls');
    }
    
    /**
     * Highlight combat controls
     */
    highlightCombat(type) {
        // This would highlight specific combat controls
        console.log(`Highlighting combat control: ${type}`);
    }
    
    /**
     * Highlight choice system
     */
    highlightChoices() {
        // This would highlight the choice system UI
        console.log('Highlighting choice system');
    }
    
    /**
     * Highlight shop
     */
    highlightShop() {
        // This would highlight the shop UI
        console.log('Highlighting shop');
    }
    
    /**
     * Clear all highlights
     */
    clearHighlights() {
        // This would clear all UI highlights
        console.log('Clearing highlights');
    }
    
    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateTutorialDisplay();
        }
    }
    
    /**
     * Go to next step
     */
    nextStep() {
        const totalSteps = this.currentTutorial.steps.length;
        
        if (this.currentStep < totalSteps - 1) {
            this.currentStep++;
            this.updateTutorialDisplay();
        } else {
            this.completeTutorial();
        }
    }
    
    /**
     * Skip tutorial
     */
    skipTutorial() {
        if (this.currentTutorial) {
            this.tutorialsCompleted.add(this.currentTutorial.id);
            this.closeTutorial();
        }
    }
    
    /**
     * Complete tutorial
     */
    completeTutorial() {
        if (this.currentTutorial) {
            this.tutorialsCompleted.add(this.currentTutorial.id);
            this.saveTutorialProgress();
            
            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('tutorialCompleted', {
                detail: {
                    tutorial: this.currentTutorial,
                    timestamp: Date.now()
                }
            }));
            
            this.closeTutorial();
        }
    }
    
    /**
     * Close tutorial
     */
    closeTutorial() {
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.hideTutorial();
        this.clearHighlights();
    }
    
    /**
     * Load tutorial settings
     */
    loadTutorialSettings() {
        try {
            const saved = localStorage.getItem('tutorialSettings');
            if (saved) {
                this.tutorialSettings = { ...this.tutorialSettings, ...JSON.parse(saved) };
            }
            
            const completed = localStorage.getItem('tutorialsCompleted');
            if (completed) {
                this.tutorialsCompleted = new Set(JSON.parse(completed));
            }
        } catch (error) {
            console.warn('Failed to load tutorial settings:', error);
        }
    }
    
    /**
     * Save tutorial progress
     */
    saveTutorialProgress() {
        try {
            localStorage.setItem('tutorialSettings', JSON.stringify(this.tutorialSettings));
            localStorage.setItem('tutorialsCompleted', JSON.stringify([...this.tutorialsCompleted]));
        } catch (error) {
            console.warn('Failed to save tutorial progress:', error);
        }
    }
    
    /**
     * Get tutorial status
     */
    getTutorialStatus() {
        return {
            isActive: this.isActive,
            currentTutorial: this.currentTutorial?.id || null,
            currentStep: this.currentStep,
            completedTutorials: [...this.tutorialsCompleted],
            settings: this.tutorialSettings
        };
    }
    
    /**
     * Reset all tutorials
     */
    resetTutorials() {
        this.tutorialsCompleted.clear();
        this.saveTutorialProgress();
    }
    
    /**
     * Update tutorial settings
     */
    updateSettings(newSettings) {
        this.tutorialSettings = { ...this.tutorialSettings, ...newSettings };
        this.saveTutorialProgress();
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        if (this.tutorialOverlay) {
            this.tutorialOverlay.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorialSystem;
} else if (typeof window !== 'undefined') {
    window.TutorialSystem = TutorialSystem;
}