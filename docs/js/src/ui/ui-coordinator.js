/**
 * UI Coordinator - Manages conflicts between multiple UI systems
 * Ensures proper initialization order and prevents overlapping elements
 * Follows WASM-first architecture principles
 */

export class UICoordinator {
    constructor() {
        this.activeSystems = new Set();
        this.systemPriorities = new Map();
        this.conflictResolutions = new Map();
        this.initialized = false;
        
        // Define system priorities (higher number = higher priority)
        this.systemPriorities.set('enhanced-ui', 100);
        this.systemPriorities.set('modern-roguelite-ui', 90);
        this.systemPriorities.set('roguelike-hud', 80);
        this.systemPriorities.set('combat-feedback', 70);
        this.systemPriorities.set('mobile-controls', 60);
        this.systemPriorities.set('base-ui', 50);
        
        // Define conflict resolution strategies
        this.setupConflictResolutions();
    }
    
    /**
     * Initialize the UI coordinator
     */
    initialize() {
        if (this.initialized) {
            console.warn('UICoordinator already initialized');
            return;
        }
        
        console.log('🎛️ Initializing UI Coordinator...');
        
        // Apply global UI fixes
        this.applyGlobalUIFixes();
        
        // Setup system coordination
        this.setupSystemCoordination();
        
        this.initialized = true;
        console.log('✅ UI Coordinator initialized');
    }
    
    /**
     * Register a UI system
     */
    registerSystem(systemName, systemInstance) {
        if (this.activeSystems.has(systemName)) {
            console.warn(`UI system '${systemName}' already registered`);
            return false;
        }
        
        const priority = this.systemPriorities.get(systemName) || 0;
        console.log(`📝 Registering UI system: ${systemName} (priority: ${priority})`);
        
        this.activeSystems.add(systemName);
        
        // Apply conflict resolutions
        this.resolveConflicts(systemName);
        
        return true;
    }
    
    /**
     * Unregister a UI system
     */
    unregisterSystem(systemName) {
        if (!this.activeSystems.has(systemName)) {
            return false;
        }
        
        console.log(`🗑️ Unregistering UI system: ${systemName}`);
        this.activeSystems.delete(systemName);
        
        return true;
    }
    
    /**
     * Setup conflict resolution strategies
     */
    setupConflictResolutions() {
        // Enhanced UI vs Roguelike HUD conflicts
        this.conflictResolutions.set('enhanced-ui+roguelike-hud', () => {
            console.log('🔧 Resolving Enhanced UI + Roguelike HUD conflicts');
            
            // Hide duplicate health/stamina bars from roguelike HUD
            const roguelikeHealth = document.querySelector('.roguelike-health-bar');
            const roguelikeStamina = document.querySelector('.roguelike-stamina-bar');
            
            if (roguelikeHealth) {
                roguelikeHealth.style.display = 'none';
            }
            if (roguelikeStamina) {
                roguelikeStamina.style.display = 'none';
            }
            
            // Adjust positioning to avoid overlaps
            const debugHud = document.getElementById('debug-hud');
            if (debugHud) {
                debugHud.style.top = '140px'; // Move below enhanced UI elements
            }
        });
        
        // Modern Roguelite UI vs Enhanced UI conflicts
        this.conflictResolutions.set('modern-roguelite-ui+enhanced-ui', () => {
            console.log('🔧 Resolving Modern Roguelite UI + Enhanced UI conflicts');
            
            // Disable modern roguelite UI if enhanced UI is active
            const modernUI = document.getElementById('modern-roguelite-ui');
            if (modernUI) {
                modernUI.style.display = 'none';
            }
        });
        
        // Mobile controls positioning conflicts
        this.conflictResolutions.set('mobile-controls+*', () => {
            console.log('🔧 Resolving Mobile Controls positioning conflicts');
            
            // Ensure mobile controls don't overlap with other UI elements
            const mobileControls = document.querySelector('.mobile-controls');
            if (mobileControls && window.innerWidth <= 768) {
                // Adjust bottom padding for viewport to accommodate mobile controls
                const viewport = document.getElementById('viewport');
                if (viewport) {
                    viewport.style.paddingBottom = '200px';
                }
            }
        });
    }
    
    /**
     * Resolve conflicts between systems
     */
    resolveConflicts(newSystemName) {
        // Check for specific conflict resolutions
        for (const [conflictKey, resolver] of this.conflictResolutions.entries()) {
            const systems = conflictKey.split('+');
            
            if (systems.includes(newSystemName) || systems.includes('*')) {
                // Check if all required systems are active
                const requiredSystems = systems.filter(s => s !== '*');
                const allActive = requiredSystems.every(s => 
                    this.activeSystems.has(s) || s === newSystemName
                );
                
                if (allActive) {
                    try {
                        resolver();
                    } catch (error) {
                        console.error(`Error resolving conflict ${conflictKey}:`, error);
                    }
                }
            }
        }
    }
    
    /**
     * Apply global UI fixes
     */
    applyGlobalUIFixes() {
        console.log('🔧 Applying global UI fixes...');
        
        // Fix z-index conflicts
        this.fixZIndexConflicts();
        
        // Fix positioning overlaps
        this.fixPositioningOverlaps();
        
        // Fix responsive design issues
        this.fixResponsiveIssues();
        
        console.log('✅ Global UI fixes applied');
    }
    
    /**
     * Fix z-index conflicts
     */
    fixZIndexConflicts() {
        // Ensure loading screen is always on top
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.zIndex = 'var(--z-loading)';
        }
        
        // Fix phase overlays
        const phaseOverlays = document.querySelectorAll('.phase-overlay');
        phaseOverlays.forEach(overlay => {
            overlay.style.zIndex = 'var(--z-overlays)';
        });
        
        // Fix modal overlays
        const modalOverlays = document.querySelectorAll('.death-feedback-overlay, .choice-overlay');
        modalOverlays.forEach(overlay => {
            overlay.style.zIndex = 'var(--z-modals)';
        });
    }
    
    /**
     * Fix positioning overlaps
     */
    fixPositioningOverlaps() {
        // Ensure UI elements don't overlap
        const connectionStatus = document.getElementById('connectionStatus');
        const playerCount = document.getElementById('playerCount');
        const debugHud = document.getElementById('debug-hud');
        
        // Adjust positions to prevent overlaps
        if (connectionStatus) {
            connectionStatus.style.top = '20px';
            connectionStatus.style.right = '20px';
        }
        
        if (playerCount) {
            playerCount.style.top = '20px';
            playerCount.style.left = '20px';
        }
        
        if (debugHud) {
            debugHud.style.top = '60px';
            debugHud.style.left = '20px';
        }
    }
    
    /**
     * Fix responsive design issues
     */
    fixResponsiveIssues() {
        // Add responsive classes based on screen size
        const updateResponsiveClasses = () => {
            const body = document.body;
            const width = window.innerWidth;
            
            body.classList.remove('mobile', 'tablet', 'desktop');
            
            if (width <= 480) {
                body.classList.add('mobile');
            } else if (width <= 768) {
                body.classList.add('tablet');
            } else {
                body.classList.add('desktop');
            }
        };
        
        updateResponsiveClasses();
        window.addEventListener('resize', updateResponsiveClasses);
    }
    
    /**
     * Setup system coordination
     */
    setupSystemCoordination() {
        // Monitor for new UI elements being added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleNewUIElement(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Handle new UI elements
     */
    handleNewUIElement(element) {
        // Apply consistent styling to new UI elements
        if (element.classList.contains('ui-overlay')) {
            element.style.zIndex = 'var(--z-game-ui)';
        }
        
        if (element.classList.contains('phase-overlay')) {
            element.style.zIndex = 'var(--z-overlays)';
        }
        
        if (element.classList.contains('modal')) {
            element.style.zIndex = 'var(--z-modals)';
        }
    }
    
    /**
     * Get active systems
     */
    getActiveSystems() {
        return Array.from(this.activeSystems);
    }
    
    /**
     * Check if system is active
     */
    isSystemActive(systemName) {
        return this.activeSystems.has(systemName);
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.activeSystems.clear();
        this.systemPriorities.clear();
        this.conflictResolutions.clear();
        this.initialized = false;
        
        console.log('🗑️ UI Coordinator destroyed');
    }
}

// Global instance
export const uiCoordinator = new UICoordinator();
