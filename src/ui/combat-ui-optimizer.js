/**
 * Combat UI Optimizer for DozedEnt
 * Optimizes UI elements for high-pressure combat situations
 * - Larger click targets for better accuracy under stress
 * - Reduced animation distractions during combat
 * - Critical information positioning for minimal eye movement
 * - Adaptive UI scaling based on combat intensity
 * 
 * Follows WASM-first architecture - only modifies UI presentation
 */

export class CombatUIOptimizer {
    constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.isInCombat = false;
        this.combatIntensity = 0; // 0-1 scale
        this.lastCombatCheck = 0;
        
        // UI optimization settings
        this.settings = {
            enableCombatMode: true,
            enlargeClickTargets: true,
            reduceAnimations: true,
            repositionCriticalInfo: true,
            adaptiveScaling: true,
            combatModeThreshold: 0.3, // Combat intensity threshold to activate optimizations
            maxTargetScale: 1.5, // Maximum scale for click targets
            animationReductionFactor: 0.3 // How much to reduce animations (0 = no animations, 1 = full animations)
        };
        
        // Original UI states for restoration
        this.originalStates = new Map();
        this.optimizedElements = new Set();
        
        // Combat state tracking
        this.combatMetrics = {
            enemyCount: 0,
            playerHealth: 1.0,
            playerStamina: 1.0,
            recentDamage: 0,
            timeInCombat: 0,
            actionFrequency: 0
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            frameTime: 0,
            updateFrequency: 60, // Target 60 FPS
            lastOptimizationTime: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize the combat UI optimizer
     */
    initialize() {
        this.createCombatModeIndicator();
        this.setupPerformanceMonitoring();
        this.startOptimizationLoop();
        this.loadUserPreferences();
    }

    /**
     * Create combat mode indicator
     */
    createCombatModeIndicator() {
        // Remove existing indicator
        const existing = document.getElementById('combat-mode-indicator');
        if (existing) {
            existing.remove();
        }

        const indicator = document.createElement('div');
        indicator.id = 'combat-mode-indicator';
        indicator.className = 'combat-mode-indicator hidden';
        indicator.innerHTML = `
            <div class="combat-mode-content">
                <div class="combat-mode-icon">⚔️</div>
                <div class="combat-mode-text">Combat Mode Active</div>
                <div class="combat-intensity-bar">
                    <div class="combat-intensity-fill" id="combat-intensity-fill"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        let lastFrameTime = performance.now();
        
        const measurePerformance = () => {
            const currentTime = performance.now();
            this.performanceMetrics.frameTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;
            
            requestAnimationFrame(measurePerformance);
        };
        
        measurePerformance();
    }

    /**
     * Start the optimization loop
     */
    startOptimizationLoop() {
        const optimizationLoop = () => {
            this.updateCombatState();
            this.updateOptimizations();
            
            // Run at 30 FPS to reduce overhead
            setTimeout(() => requestAnimationFrame(optimizationLoop), 33);
        };
        
        optimizationLoop();
    }

    /**
     * Update combat state from WASM
     */
    updateCombatState() {
        if (!this.wasmManager || !this.wasmManager.exports) {
            return;
        }

        try {
            // Get basic combat metrics from WASM
            const currentPhase = this.wasmManager.exports.get_phase?.() || 0;
            const playerHealth = this.wasmManager.exports.get_hp?.() || 1.0;
            const playerStamina = this.wasmManager.exports.get_stamina?.() || 1.0;
            const enemyCount = this.wasmManager.exports.get_enemy_count?.() || 0;
            
            // Update metrics
            this.combatMetrics.playerHealth = playerHealth;
            this.combatMetrics.playerStamina = playerStamina;
            this.combatMetrics.enemyCount = enemyCount;
            
            // Determine if in combat (Fight phase or enemies present)
            const wasInCombat = this.isInCombat;
            this.isInCombat = (currentPhase === 1) || (enemyCount > 0);
            
            // Update time in combat
            if (this.isInCombat) {
                this.combatMetrics.timeInCombat += 0.033; // Approximate 30 FPS
            } else {
                this.combatMetrics.timeInCombat = 0;
            }
            
            // Calculate combat intensity
            this.calculateCombatIntensity();
            
            // Handle combat state changes
            if (this.isInCombat && !wasInCombat) {
                this.onCombatStart();
            } else if (!this.isInCombat && wasInCombat) {
                this.onCombatEnd();
            }
            
        } catch (error) {
            console.error('Error updating combat state:', error);
        }
    }

    /**
     * Calculate combat intensity based on multiple factors
     */
    calculateCombatIntensity() {
        let intensity = 0;
        
        // Base intensity from being in combat
        if (this.isInCombat) {
            intensity += 0.3;
        }
        
        // Enemy count factor (more enemies = higher intensity)
        intensity += Math.min(0.3, this.combatMetrics.enemyCount * 0.1);
        
        // Health factor (lower health = higher intensity)
        intensity += (1 - this.combatMetrics.playerHealth) * 0.2;
        
        // Stamina factor (lower stamina = higher intensity)
        intensity += (1 - this.combatMetrics.playerStamina) * 0.15;
        
        // Time in combat factor (longer combat = higher intensity)
        intensity += Math.min(0.05, this.combatMetrics.timeInCombat * 0.01);
        
        // Performance factor (lower FPS = higher intensity for UI optimization)
        if (this.performanceMetrics.frameTime > 20) { // Below 50 FPS
            intensity += 0.1;
        }
        
        this.combatIntensity = Math.min(1.0, intensity);
        
        // Update intensity indicator
        this.updateCombatIntensityIndicator();
    }

    /**
     * Update combat intensity indicator
     */
    updateCombatIntensityIndicator() {
        const indicator = document.getElementById('combat-mode-indicator');
        const intensityFill = document.getElementById('combat-intensity-fill');
        
        if (!indicator || !intensityFill) {
            return;
        }

        const shouldShow = this.combatIntensity >= this.settings.combatModeThreshold;
        
        if (shouldShow) {
            indicator.classList.remove('hidden');
            intensityFill.style.width = `${this.combatIntensity * 100}%`;
            
            // Color based on intensity
            if (this.combatIntensity > 0.7) {
                intensityFill.style.background = '#dc2626'; // Red - high intensity
            } else if (this.combatIntensity > 0.5) {
                intensityFill.style.background = '#f59e0b'; // Orange - medium intensity
            } else {
                intensityFill.style.background = '#10b981'; // Green - low intensity
            }
        } else {
            indicator.classList.add('hidden');
        }
    }

    /**
     * Handle combat start
     */
    onCombatStart() {
        console.log('Combat started - activating UI optimizations');
        this.applyAllOptimizations();
    }

    /**
     * Handle combat end
     */
    onCombatEnd() {
        console.log('Combat ended - restoring normal UI');
        this.restoreAllOptimizations();
    }

    /**
     * Update optimizations based on current state
     */
    updateOptimizations() {
        const shouldOptimize = this.combatIntensity >= this.settings.combatModeThreshold;
        
        if (shouldOptimize && this.settings.enableCombatMode) {
            this.applyAdaptiveOptimizations();
        } else if (!shouldOptimize) {
            this.restoreAllOptimizations();
        }
    }

    /**
     * Apply all combat optimizations
     */
    applyAllOptimizations() {
        if (this.settings.enlargeClickTargets) {
            this.enlargeClickTargets();
        }
        
        if (this.settings.reduceAnimations) {
            this.reduceAnimations();
        }
        
        if (this.settings.repositionCriticalInfo) {
            this.repositionCriticalInfo();
        }
        
        if (this.settings.adaptiveScaling) {
            this.applyAdaptiveScaling();
        }
        
        this.optimizeCriticalElements();
        this.reduceDOMUpdates();
    }

    /**
     * Apply adaptive optimizations based on intensity
     */
    applyAdaptiveOptimizations() {
        const intensityFactor = this.combatIntensity;
        
        // Scale optimizations based on intensity
        if (this.settings.enlargeClickTargets) {
            this.enlargeClickTargets(1 + (intensityFactor * (this.settings.maxTargetScale - 1)));
        }
        
        if (this.settings.reduceAnimations) {
            this.reduceAnimations(1 - (intensityFactor * (1 - this.settings.animationReductionFactor)));
        }
    }

    /**
     * Enlarge click targets for better accuracy under stress
     */
    enlargeClickTargets(scaleFactor = 1.3) {
        const clickableSelectors = [
            '.priority-ability-slot',
            '.stable-ability-button',
            '.ability-slot',
            'button[data-action]',
            '.choice-card',
            '.shop-item',
            '.menu-button'
        ];
        
        clickableSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.optimizedElements.has(element)) {
                    // Store original state
                    this.originalStates.set(element, {
                        transform: element.style.transform || '',
                        padding: element.style.padding || '',
                        minWidth: element.style.minWidth || '',
                        minHeight: element.style.minHeight || ''
                    });
                    this.optimizedElements.add(element);
                }
                
                // Apply scaling
                element.style.transform = `scale(${scaleFactor})`;
                element.style.transformOrigin = 'center';
                
                // Increase padding for better touch targets
                const currentPadding = parseInt(getComputedStyle(element).padding) || 8;
                element.style.padding = `${Math.max(12, currentPadding * scaleFactor)}px`;
                
                // Ensure minimum touch target size (44px recommended)
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
                
                // Add combat mode class for additional styling
                element.classList.add('combat-optimized');
            });
        });
    }

    /**
     * Reduce animations to minimize distractions
     */
    reduceAnimations(animationFactor = 0.3) {
        // Create or update animation reduction style
        let styleElement = document.getElementById('combat-animation-reduction');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'combat-animation-reduction';
            document.head.appendChild(styleElement);
        }
        
        const animationDuration = animationFactor;
        const transitionDuration = animationFactor;
        
        styleElement.textContent = `
            .combat-mode-active * {
                animation-duration: ${animationDuration}s !important;
                transition-duration: ${transitionDuration}s !important;
            }
            
            .combat-mode-active .damage-number {
                animation-duration: ${animationDuration * 0.5}s !important;
            }
            
            .combat-mode-active .particle-effect {
                display: none !important;
            }
            
            .combat-mode-active .screen-shake {
                animation-duration: ${animationDuration * 0.2}s !important;
            }
            
            .combat-mode-active .floating-text {
                animation: none !important;
            }
        `;
        
        // Apply combat mode class to body
        document.body.classList.add('combat-mode-active');
    }

    /**
     * Reposition critical information for minimal eye movement
     */
    repositionCriticalInfo() {
        // Move health and stamina to center-bottom for easier viewing
        const healthBar = document.querySelector('.critical-health-bar, .health-bar');
        const staminaBar = document.querySelector('.critical-stamina-bar, .stamina-bar');
        
        if (healthBar && !this.optimizedElements.has(healthBar)) {
            this.originalStates.set(healthBar, {
                position: healthBar.style.position || '',
                top: healthBar.style.top || '',
                left: healthBar.style.left || '',
                transform: healthBar.style.transform || '',
                zIndex: healthBar.style.zIndex || ''
            });
            this.optimizedElements.add(healthBar);
            
            // Position at bottom center
            healthBar.style.position = 'fixed';
            healthBar.style.bottom = '120px';
            healthBar.style.left = '50%';
            healthBar.style.transform = 'translateX(-50%) scale(1.2)';
            healthBar.style.zIndex = '9999';
            healthBar.classList.add('combat-repositioned');
        }
        
        if (staminaBar && !this.optimizedElements.has(staminaBar)) {
            this.originalStates.set(staminaBar, {
                position: staminaBar.style.position || '',
                top: staminaBar.style.top || '',
                left: staminaBar.style.left || '',
                transform: staminaBar.style.transform || '',
                zIndex: staminaBar.style.zIndex || ''
            });
            this.optimizedElements.add(staminaBar);
            
            // Position below health bar
            staminaBar.style.position = 'fixed';
            staminaBar.style.bottom = '90px';
            staminaBar.style.left = '50%';
            staminaBar.style.transform = 'translateX(-50%) scale(1.2)';
            staminaBar.style.zIndex = '9999';
            staminaBar.classList.add('combat-repositioned');
        }
        
        // Hide non-essential UI elements
        const nonEssentialSelectors = [
            '.minimap-container',
            '.objective-breadcrumb',
            '.info-cluster:not(.survival-cluster)',
            '.status-effects:not(.priority-status-effects)',
            '.damage-numbers:not(.critical-damage)',
            '.notification:not(.critical-notification)'
        ];
        
        nonEssentialSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.optimizedElements.has(element)) {
                    this.originalStates.set(element, {
                        display: element.style.display || '',
                        opacity: element.style.opacity || ''
                    });
                    this.optimizedElements.add(element);
                }
                
                element.style.opacity = '0.3';
                element.classList.add('combat-dimmed');
            });
        });
    }

    /**
     * Apply adaptive scaling based on screen size and combat intensity
     */
    applyAdaptiveScaling() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const aspectRatio = screenWidth / screenHeight;
        
        // Calculate optimal UI scale
        let uiScale = 1.0;
        
        // Adjust for screen size
        if (screenWidth < 1024) {
            uiScale *= 1.1; // Slightly larger on smaller screens
        }
        
        // Adjust for combat intensity
        uiScale *= (1 + this.combatIntensity * 0.2);
        
        // Apply scaling to UI root
        const uiRoot = document.querySelector('.enhanced-ui-container, .modern-roguelite-ui');
        if (uiRoot && !this.optimizedElements.has(uiRoot)) {
            this.originalStates.set(uiRoot, {
                transform: uiRoot.style.transform || '',
                transformOrigin: uiRoot.style.transformOrigin || ''
            });
            this.optimizedElements.add(uiRoot);
        }
        
        if (uiRoot) {
            uiRoot.style.transform = `scale(${uiScale})`;
            uiRoot.style.transformOrigin = 'center';
            uiRoot.classList.add('combat-scaled');
        }
    }

    /**
     * Optimize critical UI elements for performance
     */
    optimizeCriticalElements() {
        // Disable expensive visual effects during combat
        const expensiveSelectors = [
            '.particle-system',
            '.background-animation',
            '.ambient-effect',
            '.decorative-element'
        ];
        
        expensiveSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.optimizedElements.has(element)) {
                    this.originalStates.set(element, {
                        display: element.style.display || ''
                    });
                    this.optimizedElements.add(element);
                }
                
                element.style.display = 'none';
                element.classList.add('combat-hidden');
            });
        });
        
        // Optimize text rendering
        const textElements = document.querySelectorAll('.damage-number, .floating-text');
        textElements.forEach(element => {
            element.style.textRendering = 'optimizeSpeed';
            element.style.fontSmooth = 'never';
        });
    }

    /**
     * Reduce DOM update frequency for better performance
     */
    reduceDOMUpdates() {
        // Batch DOM updates and reduce frequency
        if (this.performanceMetrics.frameTime > 16) { // Below 60 FPS
            // Reduce update frequency for non-critical elements
            const nonCriticalElements = document.querySelectorAll(
                '.minimap, .background-effect, .ambient-animation'
            );
            
            nonCriticalElements.forEach(element => {
                element.classList.add('low-priority-updates');
            });
        }
    }

    /**
     * Restore all optimizations to original state
     */
    restoreAllOptimizations() {
        // Restore all optimized elements
        this.optimizedElements.forEach(element => {
            const originalState = this.originalStates.get(element);
            if (originalState) {
                Object.keys(originalState).forEach(property => {
                    element.style[property] = originalState[property];
                });
            }
            
            // Remove combat classes
            element.classList.remove(
                'combat-optimized',
                'combat-repositioned',
                'combat-dimmed',
                'combat-scaled',
                'combat-hidden',
                'low-priority-updates'
            );
        });
        
        // Clear tracking sets
        this.optimizedElements.clear();
        this.originalStates.clear();
        
        // Remove combat mode class from body
        document.body.classList.remove('combat-mode-active');
        
        // Remove animation reduction styles
        const styleElement = document.getElementById('combat-animation-reduction');
        if (styleElement) {
            styleElement.remove();
        }
    }

    /**
     * Load user preferences for combat optimizations
     */
    loadUserPreferences() {
        try {
            const savedSettings = localStorage.getItem('combatUISettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsedSettings };
            }
        } catch (error) {
            console.warn('Failed to load combat UI settings:', error);
        }
    }

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('combatUISettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save combat UI settings:', error);
        }
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveUserPreferences();
        
        // Re-apply optimizations if in combat
        if (this.isInCombat) {
            this.restoreAllOptimizations();
            this.applyAllOptimizations();
        }
    }

    /**
     * Get current combat metrics for debugging
     */
    getCombatMetrics() {
        return {
            ...this.combatMetrics,
            combatIntensity: this.combatIntensity,
            isInCombat: this.isInCombat,
            optimizedElementsCount: this.optimizedElements.size,
            frameTime: this.performanceMetrics.frameTime
        };
    }

    /**
     * Force enable/disable combat mode for testing
     */
    setTestCombatMode(enabled, intensity = 0.8) {
        if (enabled) {
            this.isInCombat = true;
            this.combatIntensity = intensity;
            this.applyAllOptimizations();
        } else {
            this.isInCombat = false;
            this.combatIntensity = 0;
            this.restoreAllOptimizations();
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.restoreAllOptimizations();
        
        const indicator = document.getElementById('combat-mode-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        const styleElement = document.getElementById('combat-animation-reduction');
        if (styleElement) {
            styleElement.remove();
        }
    }
}
