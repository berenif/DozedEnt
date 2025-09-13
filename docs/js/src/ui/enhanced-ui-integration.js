/**
 * Enhanced UI Integration System for DozedEnt
 * Integrates all enhanced UI systems:
 * - Death/Failure Feedback System
 * - Combat UI Optimizer
 * - Threat Awareness UI
 * - Choice System Clarity
 * - Comprehensive Accessibility
 * 
 * Provides unified initialization, coordination, and management
 * Follows WASM-first architecture principles
 */

import { DeathFeedbackSystem } from './death-feedback-system.js';
import { CombatUIOptimizer } from './combat-ui-optimizer.js';
import { ThreatAwarenessUI } from './threat-awareness-ui.js';
import { ChoiceSystemClarity } from './choice-system-clarity.js';
import { ComprehensiveAccessibility } from './comprehensive-accessibility.js';

export class EnhancedUIIntegration {
    constructor(wasmManager, canvas, audioManager) {
        this.wasmManager = wasmManager;
        this.canvas = canvas;
        this.audioManager = audioManager;
        
        // UI System instances
        this.systems = {
            deathFeedback: null,
            combatOptimizer: null,
            threatAwareness: null,
            choiceClarity: null,
            accessibility: null
        };
        
        // Integration state
        this.isInitialized = false;
        this.isEnabled = true;
        this.currentPhase = 0;
        this.lastPhase = -1;
        
        // Event coordination
        this.eventListeners = new Map();
        this.systemEvents = [];
        
        // Performance monitoring
        this.performanceMetrics = {
            initTime: 0,
            updateTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            systemsActive: 0
        };
        
        // Settings management
        this.globalSettings = {
            enableDeathFeedback: true,
            enableCombatOptimization: true,
            enableThreatAwareness: true,
            enableChoiceClarity: true,
            enableAccessibility: true,
            
            // Performance settings
            adaptiveQuality: true,
            maxFPS: 60,
            memoryLimit: 100, // MB
            
            // Integration settings
            crossSystemCommunication: true,
            unifiedStyling: true,
            coordinatedAnimations: true
        };
        
        this.initialize();
    }

    /**
     * Initialize all enhanced UI systems
     */
    async initialize() {
        const startTime = performance.now();
        
        try {
            console.log('🎮 Initializing Enhanced UI Systems...');
            
            // Load global settings
            this.loadGlobalSettings();
            
            // Initialize accessibility first (foundation for other systems)
            if (this.globalSettings.enableAccessibility) {
                await this.initializeAccessibility();
            }
            
            // Initialize core systems
            await this.initializeCoreSystemsParallel();
            
            // Setup system coordination
            this.setupSystemCoordination();
            
            // Setup global event handling
            this.setupGlobalEventHandling();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Load and apply CSS
            this.loadEnhancedStyles();
            
            // Start integration loop
            this.startIntegrationLoop();
            
            this.isInitialized = true;
            this.performanceMetrics.initTime = performance.now() - startTime;
            
            console.log(`✅ Enhanced UI Systems initialized in ${this.performanceMetrics.initTime.toFixed(2)}ms`);
            
            // Announce to accessibility system
            if (this.systems.accessibility) {
                this.systems.accessibility.announceToScreenReader(
                    'Enhanced UI systems loaded successfully', 
                    'polite'
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced UI Systems:', error);
            throw error;
        }
    }

    /**
     * Initialize accessibility system first
     */
    async initializeAccessibility() {
        try {
            this.systems.accessibility = new ComprehensiveAccessibility();
            console.log('✅ Accessibility system initialized');
        } catch (error) {
            console.error('❌ Failed to initialize accessibility system:', error);
            // Continue without accessibility if it fails
        }
    }

    /**
     * Initialize core systems in parallel for better performance
     */
    async initializeCoreSystemsParallel() {
        const initPromises = [];
        
        // Death Feedback System
        if (this.globalSettings.enableDeathFeedback) {
            initPromises.push(
                this.initializeSystem('deathFeedback', () => 
                    new DeathFeedbackSystem(this.wasmManager)
                )
            );
        }
        
        // Combat UI Optimizer
        if (this.globalSettings.enableCombatOptimization) {
            initPromises.push(
                this.initializeSystem('combatOptimizer', () => 
                    new CombatUIOptimizer(this.wasmManager)
                )
            );
        }
        
        // Threat Awareness UI
        if (this.globalSettings.enableThreatAwareness) {
            initPromises.push(
                this.initializeSystem('threatAwareness', () => 
                    new ThreatAwarenessUI(this.wasmManager, this.canvas, this.audioManager)
                )
            );
        }
        
        // Choice System Clarity
        if (this.globalSettings.enableChoiceClarity) {
            initPromises.push(
                this.initializeSystem('choiceClarity', () => 
                    new ChoiceSystemClarity(this.wasmManager)
                )
            );
        }
        
        // Wait for all systems to initialize
        const results = await Promise.allSettled(initPromises);
        
        // Log results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`✅ ${result.value} initialized`);
            } else {
                console.error(`❌ System initialization failed:`, result.reason);
            }
        });
    }

    /**
     * Initialize individual system with error handling
     */
    async initializeSystem(systemName, initFunction) {
        try {
            this.systems[systemName] = initFunction();
            return `${systemName} system`;
        } catch (error) {
            console.error(`Failed to initialize ${systemName}:`, error);
            this.systems[systemName] = null;
            throw error;
        }
    }

    /**
     * Setup coordination between systems
     */
    setupSystemCoordination() {
        // Combat state coordination
        this.coordinateCombatSystems();
        
        // Phase transition coordination
        this.coordinatePhaseTransitions();
        
        // Accessibility coordination
        this.coordinateAccessibility();
        
        // Performance coordination
        this.coordinatePerformance();
    }

    /**
     * Coordinate combat-related systems
     */
    coordinateCombatSystems() {
        if (!this.systems.combatOptimizer || !this.systems.threatAwareness) {
            return;
        }

        // Share combat state between systems
        const updateCombatState = () => {
            const combatMetrics = this.systems.combatOptimizer.getCombatMetrics();
            
            if (combatMetrics.isInCombat) {
                // Enable threat awareness during combat
                this.systems.threatAwareness.setEnabled(true);
                
                // Adjust threat awareness based on combat intensity
                const settings = {
                    indicatorOpacity: Math.min(1.0, 0.6 + combatMetrics.combatIntensity * 0.4),
                    indicatorScale: Math.min(1.5, 1.0 + combatMetrics.combatIntensity * 0.5)
                };
                this.systems.threatAwareness.updateSettings(settings);
            } else {
                // Reduce threat awareness when not in combat
                this.systems.threatAwareness.setEnabled(false);
            }
        };

        // Update every 100ms during combat
        setInterval(updateCombatState, 100);
    }

    /**
     * Coordinate phase transitions
     */
    coordinatePhaseTransitions() {
        // Monitor phase changes from WASM
        const checkPhaseChange = () => {
            if (!this.wasmManager || !this.wasmManager.exports) {
                return;
            }

            try {
                const currentPhase = this.wasmManager.exports.get_phase?.() || 0;
                
                if (currentPhase !== this.lastPhase) {
                    this.handlePhaseTransition(this.lastPhase, currentPhase);
                    this.lastPhase = currentPhase;
                }
            } catch (error) {
                console.error('Error checking phase change:', error);
            }
        };

        // Check phase changes at 30 FPS
        setInterval(checkPhaseChange, 33);
    }

    /**
     * Handle phase transitions
     */
    handlePhaseTransition(fromPhase, toPhase) {
        console.log(`🔄 Phase transition: ${fromPhase} → ${toPhase}`);
        
        // Announce phase change to accessibility
        if (this.systems.accessibility) {
            const phaseName = this.getPhaseName(toPhase);
            this.systems.accessibility.announceToScreenReader(
                `Entering ${phaseName} phase`, 
                'polite'
            );
        }
        
        // Handle specific phase transitions
        switch (toPhase) {
            case 1: // Fight phase
                this.handleFightPhaseStart();
                break;
                
            case 2: // Choice phase
                this.handleChoicePhaseStart();
                break;
                
            case 7: // Reset phase (death)
                this.handleDeathPhaseStart();
                break;
        }
        
        // Emit phase change event
        this.emitSystemEvent('phaseChange', {
            fromPhase,
            toPhase,
            phaseName: this.getPhaseName(toPhase)
        });
    }

    /**
     * Handle fight phase start
     */
    handleFightPhaseStart() {
        // Activate combat optimizer
        if (this.systems.combatOptimizer) {
            this.systems.combatOptimizer.setTestCombatMode(true, 0.6);
        }
        
        // Enable threat awareness
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.setEnabled(true);
        }
    }

    /**
     * Handle choice phase start
     */
    handleChoicePhaseStart() {
        if (!this.systems.choiceClarity || !this.wasmManager) {
            return;
        }

        try {
            // Get choices from WASM
            const choiceCount = this.wasmManager.exports.get_choice_count?.() || 0;
            const choices = [];
            
            for (let i = 0; i < choiceCount; i++) {
                const choice = {
                    id: this.wasmManager.exports.get_choice_id?.(i) || i,
                    type: this.wasmManager.exports.get_choice_type?.(i) || 0,
                    rarity: this.wasmManager.exports.get_choice_rarity?.(i) || 0,
                    tags: this.wasmManager.exports.get_choice_tags?.(i) || 0
                };
                choices.push(choice);
            }
            
            // Show enhanced choice system
            if (choices.length > 0) {
                this.systems.choiceClarity.show(choices);
            }
            
        } catch (error) {
            console.error('Error handling choice phase:', error);
        }
    }

    /**
     * Handle death phase start
     */
    handleDeathPhaseStart() {
        if (!this.systems.deathFeedback) {
            return;
        }

        // Gather death data
        const deathData = {
            cause: 'unknown', // Would be determined from WASM
            timestamp: Date.now(),
            phase: this.lastPhase
        };
        
        // Show death feedback after a brief delay
        setTimeout(() => {
            this.systems.deathFeedback.show(deathData);
        }, 1000);
    }

    /**
     * Get phase name for display
     */
    getPhaseName(phase) {
        const phaseNames = {
            0: 'Explore',
            1: 'Fight',
            2: 'Choose',
            3: 'PowerUp',
            4: 'Risk',
            5: 'Escalate',
            6: 'CashOut',
            7: 'Reset'
        };
        
        return phaseNames[phase] || 'Unknown';
    }

    /**
     * Coordinate accessibility across systems
     */
    coordinateAccessibility() {
        if (!this.systems.accessibility) {
            return;
        }

        // Apply accessibility settings to all systems
        const applyAccessibilitySettings = () => {
            const settings = this.systems.accessibility.currentSettings;
            
            // Apply to combat optimizer
            if (this.systems.combatOptimizer) {
                this.systems.combatOptimizer.updateSettings({
                    enlargeClickTargets: settings.keyboardNavigation,
                    reduceAnimations: settings.reduceMotion,
                    animationReductionFactor: settings.reduceMotion ? 0.1 : 0.3
                });
            }
            
            // Apply to threat awareness
            if (this.systems.threatAwareness) {
                this.systems.threatAwareness.updateSettings({
                    colorBlindMode: settings.colorblindMode,
                    reducedMotion: settings.reduceMotion,
                    indicatorScale: settings.uiScale / 100
                });
            }
            
            // Apply to choice system
            if (this.systems.choiceClarity) {
                // Choice system would have accessibility settings too
            }
        };

        // Apply settings initially and when they change
        applyAccessibilitySettings();
        
        // Listen for accessibility setting changes
        // (This would need to be implemented in the accessibility system)
    }

    /**
     * Coordinate performance across systems
     */
    coordinatePerformance() {
        if (!this.globalSettings.adaptiveQuality) {
            return;
        }

        const monitorPerformance = () => {
            const metrics = this.getPerformanceMetrics();
            
            // If performance is poor, reduce quality
            if (metrics.averageFPS < 45) {
                this.reduceQuality();
            } else if (metrics.averageFPS > 55 && metrics.qualityReduced) {
                this.restoreQuality();
            }
        };

        setInterval(monitorPerformance, 5000); // Check every 5 seconds
    }

    /**
     * Reduce quality for better performance
     */
    reduceQuality() {
        console.log('📉 Reducing UI quality for better performance');
        
        // Reduce threat awareness quality
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.updateSettings({
                indicatorOpacity: 0.6,
                reducedMotion: true
            });
        }
        
        // Reduce combat optimizer effects
        if (this.systems.combatOptimizer) {
            this.systems.combatOptimizer.updateSettings({
                reduceAnimations: true,
                animationReductionFactor: 0.1
            });
        }
        
        this.performanceMetrics.qualityReduced = true;
    }

    /**
     * Restore quality when performance improves
     */
    restoreQuality() {
        console.log('📈 Restoring UI quality');
        
        // Restore threat awareness quality
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.updateSettings({
                indicatorOpacity: 0.8,
                reducedMotion: false
            });
        }
        
        // Restore combat optimizer effects
        if (this.systems.combatOptimizer) {
            this.systems.combatOptimizer.updateSettings({
                reduceAnimations: false,
                animationReductionFactor: 0.3
            });
        }
        
        this.performanceMetrics.qualityReduced = false;
    }

    /**
     * Setup global event handling
     */
    setupGlobalEventHandling() {
        // Game restart event
        document.addEventListener('gameRestart', () => {
            this.handleGameRestart();
        });
        
        // Choice selected event
        document.addEventListener('choiceSelected', (e) => {
            this.handleChoiceSelected(e.detail);
        });
        
        // Window resize event
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // Visibility change event
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    /**
     * Handle game restart
     */
    handleGameRestart() {
        console.log('🔄 Handling game restart');
        
        // Reset all systems
        Object.values(this.systems).forEach(system => {
            if (system && typeof system.reset === 'function') {
                system.reset();
            }
        });
        
        // Reset integration state
        this.currentPhase = 0;
        this.lastPhase = -1;
        
        // Announce to accessibility
        if (this.systems.accessibility) {
            this.systems.accessibility.announceToScreenReader(
                'Game restarted', 
                'polite'
            );
        }
    }

    /**
     * Handle choice selected
     */
    handleChoiceSelected(detail) {
        console.log('✅ Choice selected:', detail);
        
        // Hide choice system
        if (this.systems.choiceClarity) {
            this.systems.choiceClarity.hide();
        }
        
        // Announce to accessibility
        if (this.systems.accessibility) {
            this.systems.accessibility.announceToScreenReader(
                'Choice selected, continuing game', 
                'polite'
            );
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Update threat awareness canvas
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.resizeCanvas();
        }
        
        // Update other systems that need resize handling
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        if (!isVisible) {
            // Pause non-essential systems when tab is hidden
            this.pauseNonEssentialSystems();
        } else {
            // Resume systems when tab becomes visible
            this.resumeNonEssentialSystems();
        }
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        let fpsHistory = [];
        
        const monitorFrame = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            frameCount++;
            
            if (deltaTime >= 1000) { // Every second
                const fps = (frameCount * 1000) / deltaTime;
                fpsHistory.push(fps);
                
                // Keep only last 10 seconds of data
                if (fpsHistory.length > 10) {
                    fpsHistory.shift();
                }
                
                // Update performance metrics
                this.performanceMetrics.averageFPS = 
                    fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
                this.performanceMetrics.systemsActive = 
                    Object.values(this.systems).filter(s => s !== null).length;
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitorFrame);
        };
        
        monitorFrame();
    }

    /**
     * Load enhanced styles
     */
    loadEnhancedStyles() {
        const stylesheets = [
            'js/src/css/death-feedback-system.css',
            'js/src/css/combat-ui-optimizer.css',
            'js/src/css/threat-awareness-ui.css',
            'js/src/css/comprehensive-accessibility.css'
        ];
        
        stylesheets.forEach(href => {
            // Check if already loaded
            if (document.querySelector(`link[href="${href}"]`)) {
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    /**
     * Start integration loop
     */
    startIntegrationLoop() {
        const integrationLoop = () => {
            if (this.isEnabled) {
                this.updateIntegration();
            }
            
            requestAnimationFrame(integrationLoop);
        };
        
        integrationLoop();
    }

    /**
     * Update integration systems
     */
    updateIntegration() {
        const startTime = performance.now();
        
        // Update system coordination
        this.updateSystemCoordination();
        
        // Update performance monitoring
        this.updatePerformanceMonitoring();
        
        // Update cross-system communication
        this.updateCrossSystemCommunication();
        
        this.performanceMetrics.updateTime = performance.now() - startTime;
    }

    /**
     * Update system coordination
     */
    updateSystemCoordination() {
        // This would handle real-time coordination between systems
        // For example, sharing state between combat optimizer and threat awareness
    }

    /**
     * Update performance monitoring
     */
    updatePerformanceMonitoring() {
        // Monitor memory usage
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = 
                performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
    }

    /**
     * Update cross-system communication
     */
    updateCrossSystemCommunication() {
        if (!this.globalSettings.crossSystemCommunication) {
            return;
        }

        // Process queued system events
        while (this.systemEvents.length > 0) {
            const event = this.systemEvents.shift();
            this.processSystemEvent(event);
        }
    }

    /**
     * Emit system event
     */
    emitSystemEvent(type, data) {
        this.systemEvents.push({
            type,
            data,
            timestamp: performance.now()
        });
    }

    /**
     * Process system event
     */
    processSystemEvent(event) {
        // Handle different types of system events
        switch (event.type) {
            case 'phaseChange':
                // Already handled in handlePhaseTransition
                break;
                
            case 'combatStateChange':
                this.handleCombatStateChange(event.data);
                break;
                
            case 'performanceWarning':
                this.handlePerformanceWarning(event.data);
                break;
        }
    }

    /**
     * Pause non-essential systems
     */
    pauseNonEssentialSystems() {
        // Pause threat awareness animations
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.setEnabled(false);
        }
    }

    /**
     * Resume non-essential systems
     */
    resumeNonEssentialSystems() {
        // Resume threat awareness
        if (this.systems.threatAwareness) {
            this.systems.threatAwareness.setEnabled(true);
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.isEnabled,
            systems: Object.keys(this.systems).reduce((status, key) => {
                status[key] = this.systems[key] !== null;
                return status;
            }, {}),
            performance: this.getPerformanceMetrics(),
            settings: { ...this.globalSettings }
        };
    }

    /**
     * Update global settings
     */
    updateGlobalSettings(newSettings) {
        this.globalSettings = { ...this.globalSettings, ...newSettings };
        this.saveGlobalSettings();
        
        // Apply settings to systems
        this.applyGlobalSettings();
    }

    /**
     * Apply global settings to all systems
     */
    applyGlobalSettings() {
        // This would apply global settings to individual systems
        // For example, enabling/disabling systems based on settings
    }

    /**
     * Load global settings
     */
    loadGlobalSettings() {
        try {
            const saved = localStorage.getItem('enhancedUISettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.globalSettings = { ...this.globalSettings, ...settings };
            }
        } catch (error) {
            console.warn('Failed to load enhanced UI settings:', error);
        }
    }

    /**
     * Save global settings
     */
    saveGlobalSettings() {
        try {
            localStorage.setItem('enhancedUISettings', JSON.stringify(this.globalSettings));
        } catch (error) {
            console.warn('Failed to save enhanced UI settings:', error);
        }
    }

    /**
     * Enable/disable the entire system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Enable/disable individual systems
        Object.values(this.systems).forEach(system => {
            if (system && typeof system.setEnabled === 'function') {
                system.setEnabled(enabled);
            }
        });
    }

    /**
     * Cleanup all systems
     */
    destroy() {
        console.log('🧹 Cleaning up Enhanced UI Systems...');
        
        // Destroy all systems
        Object.values(this.systems).forEach(system => {
            if (system && typeof system.destroy === 'function') {
                try {
                    system.destroy();
                } catch (error) {
                    console.error('Error destroying system:', error);
                }
            }
        });
        
        // Clear references
        Object.keys(this.systems).forEach(key => {
            this.systems[key] = null;
        });
        
        // Remove event listeners
        this.eventListeners.forEach((listener, event) => {
            document.removeEventListener(event, listener);
        });
        this.eventListeners.clear();
        
        // Clear state
        this.isInitialized = false;
        this.isEnabled = false;
        this.systemEvents.length = 0;
        
        console.log('✅ Enhanced UI Systems cleanup complete');
    }
}
