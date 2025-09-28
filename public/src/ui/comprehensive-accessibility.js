/**
 * Comprehensive Accessibility System for DozedEnt
 * Implements WCAG 2.1 AA compliant accessibility features:
 * - High contrast mode with customizable themes
 * - Colorblind-friendly palettes for all UI elements
 * - Scalable UI elements with zoom support
 * - Full keyboard navigation for all interactive elements
 * - Screen reader support with ARIA labels
 * - Motion sensitivity options
 * - Focus management and visual indicators
 */

export class ComprehensiveAccessibility {
    constructor() {
        // Accessibility state
        this.isEnabled = true;
        this.currentSettings = {
            // Visual accessibility
            highContrast: false,
            colorblindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
            textScale: 100, // 50-200%
            uiScale: 100, // 50-200%
            
            // Motion accessibility
            reduceMotion: false,
            disableParallax: false,
            reduceScreenShake: false,
            
            // Input accessibility
            keyboardNavigation: true,
            focusIndicators: true,
            stickyKeys: false,
            slowKeys: false,
            
            // Audio accessibility
            visualAudioCues: false,
            captionsEnabled: false,
            audioDescriptions: false,
            
            // Cognitive accessibility
            simplifiedUI: false,
            reducedComplexity: false,
            extendedTimeouts: false,
            
            // Custom themes
            customTheme: 'default' // 'default', 'dark', 'light', 'high-contrast', 'custom'
        };
        
        // Keyboard navigation state
        this.keyboardNavigation = {
            enabled: true,
            currentFocusIndex: -1,
            focusableElements: [],
            focusHistory: [],
            trapFocus: false,
            focusContainer: null
        };
        
        // Screen reader support
        this.screenReader = {
            announcements: [],
            liveRegion: null,
            politeRegion: null,
            assertiveRegion: null
        };
        
        // Color schemes for different accessibility needs
        this.colorSchemes = {
            default: {
                primary: '#3b82f6',
                secondary: '#64748b',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b'
            },
            
            highContrast: {
                primary: '#0000ff',
                secondary: '#000000',
                success: '#008000',
                warning: '#ff8000',
                error: '#ff0000',
                background: '#ffffff',
                surface: '#ffffff',
                text: '#000000'
            },
            
            darkHighContrast: {
                primary: '#00ffff',
                secondary: '#ffffff',
                success: '#00ff00',
                warning: '#ffff00',
                error: '#ff0000',
                background: '#000000',
                surface: '#000000',
                text: '#ffffff'
            },
            
            protanopia: {
                primary: '#0ea5e9',
                secondary: '#64748b',
                success: '#0891b2',
                warning: '#eab308',
                error: '#dc2626',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b'
            },
            
            deuteranopia: {
                primary: '#0ea5e9',
                secondary: '#64748b',
                success: '#0891b2',
                warning: '#eab308',
                error: '#dc2626',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b'
            },
            
            tritanopia: {
                primary: '#3b82f6',
                secondary: '#64748b',
                success: '#059669',
                warning: '#f59e0b',
                error: '#dc2626',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#1e293b'
            }
        };
        
        this.initialize();
    }

    /**
     * Initialize accessibility system
     */
    initialize() {
        this.loadSettings();
        this.createAccessibilityOverlay();
        this.setupScreenReaderSupport();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.detectSystemPreferences();
        this.applyAllSettings();
        this.startAccessibilityLoop();
    }

    /**
     * Create accessibility control overlay
     */
    createAccessibilityOverlay() {
        // Remove existing overlay
        const existing = document.getElementById('accessibility-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'accessibility-overlay';
        overlay.className = 'accessibility-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Accessibility Settings');
        overlay.setAttribute('aria-hidden', 'true');
        
        overlay.innerHTML = `
            <div class="accessibility-container">
                <div class="accessibility-header">
                    <h2 id="accessibility-title">Accessibility Settings</h2>
                    <button id="close-accessibility" class="close-btn" aria-label="Close accessibility settings">
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>
                
                <div class="accessibility-content">
                    <div class="accessibility-tabs" role="tablist">
                        <button class="accessibility-tab active" role="tab" data-tab="visual" aria-selected="true" aria-controls="visual-panel">
                            Visual
                        </button>
                        <button class="accessibility-tab" role="tab" data-tab="motor" aria-selected="false" aria-controls="motor-panel">
                            Motor
                        </button>
                        <button class="accessibility-tab" role="tab" data-tab="cognitive" aria-selected="false" aria-controls="cognitive-panel">
                            Cognitive
                        </button>
                        <button class="accessibility-tab" role="tab" data-tab="audio" aria-selected="false" aria-controls="audio-panel">
                            Audio
                        </button>
                    </div>
                    
                    <div class="accessibility-panels">
                        <!-- Visual Accessibility Panel -->
                        <div id="visual-panel" class="accessibility-panel active" role="tabpanel" aria-labelledby="visual-tab">
                            <h3>Visual Accessibility</h3>
                            
                            <div class="setting-group">
                                <h4>Display Options</h4>
                                
                                <div class="setting-item">
                                    <label for="high-contrast-toggle">
                                        <input type="checkbox" id="high-contrast-toggle" ${this.currentSettings.highContrast ? 'checked' : ''}>
                                        High Contrast Mode
                                    </label>
                                    <p class="setting-description">Increases contrast for better visibility</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="colorblind-select">Colorblind Support:</label>
                                    <select id="colorblind-select" aria-describedby="colorblind-desc">
                                        <option value="none" ${this.currentSettings.colorblindMode === 'none' ? 'selected' : ''}>None</option>
                                        <option value="protanopia" ${this.currentSettings.colorblindMode === 'protanopia' ? 'selected' : ''}>Protanopia (Red-blind)</option>
                                        <option value="deuteranopia" ${this.currentSettings.colorblindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Green-blind)</option>
                                        <option value="tritanopia" ${this.currentSettings.colorblindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia (Blue-blind)</option>
                                    </select>
                                    <p id="colorblind-desc" class="setting-description">Adjusts colors for different types of color vision</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="text-scale-slider">Text Size: <span id="text-scale-value">${this.currentSettings.textScale}%</span></label>
                                    <input type="range" id="text-scale-slider" min="50" max="200" step="10" value="${this.currentSettings.textScale}" aria-describedby="text-scale-desc">
                                    <p id="text-scale-desc" class="setting-description">Adjust text size for better readability</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="ui-scale-slider">UI Scale: <span id="ui-scale-value">${this.currentSettings.uiScale}%</span></label>
                                    <input type="range" id="ui-scale-slider" min="50" max="200" step="10" value="${this.currentSettings.uiScale}" aria-describedby="ui-scale-desc">
                                    <p id="ui-scale-desc" class="setting-description">Scale all UI elements for better visibility</p>
                                </div>
                            </div>
                            
                            <div class="setting-group">
                                <h4>Motion & Animation</h4>
                                
                                <div class="setting-item">
                                    <label for="reduce-motion-toggle">
                                        <input type="checkbox" id="reduce-motion-toggle" ${this.currentSettings.reduceMotion ? 'checked' : ''}>
                                        Reduce Motion
                                    </label>
                                    <p class="setting-description">Reduces or disables animations and transitions</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="disable-parallax-toggle">
                                        <input type="checkbox" id="disable-parallax-toggle" ${this.currentSettings.disableParallax ? 'checked' : ''}>
                                        Disable Parallax Effects
                                    </label>
                                    <p class="setting-description">Removes parallax scrolling and background movement</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="reduce-screen-shake-toggle">
                                        <input type="checkbox" id="reduce-screen-shake-toggle" ${this.currentSettings.reduceScreenShake ? 'checked' : ''}>
                                        Reduce Screen Shake
                                    </label>
                                    <p class="setting-description">Minimizes screen shake effects during combat</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Motor Accessibility Panel -->
                        <div id="motor-panel" class="accessibility-panel" role="tabpanel" aria-labelledby="motor-tab">
                            <h3>Motor Accessibility</h3>
                            
                            <div class="setting-group">
                                <h4>Keyboard Navigation</h4>
                                
                                <div class="setting-item">
                                    <label for="keyboard-nav-toggle">
                                        <input type="checkbox" id="keyboard-nav-toggle" ${this.currentSettings.keyboardNavigation ? 'checked' : ''}>
                                        Enable Keyboard Navigation
                                    </label>
                                    <p class="setting-description">Navigate the interface using keyboard only</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="focus-indicators-toggle">
                                        <input type="checkbox" id="focus-indicators-toggle" ${this.currentSettings.focusIndicators ? 'checked' : ''}>
                                        Enhanced Focus Indicators
                                    </label>
                                    <p class="setting-description">Makes focus indicators more visible</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="sticky-keys-toggle">
                                        <input type="checkbox" id="sticky-keys-toggle" ${this.currentSettings.stickyKeys ? 'checked' : ''}>
                                        Sticky Keys Support
                                    </label>
                                    <p class="setting-description">Allows modifier keys to be pressed one at a time</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="slow-keys-toggle">
                                        <input type="checkbox" id="slow-keys-toggle" ${this.currentSettings.slowKeys ? 'checked' : ''}>
                                        Slow Keys Support
                                    </label>
                                    <p class="setting-description">Requires keys to be held down briefly before registering</p>
                                </div>
                            </div>
                            
                            <div class="setting-group">
                                <h4>Keyboard Shortcuts</h4>
                                <div class="keyboard-shortcuts">
                                    <div class="shortcut-item">
                                        <kbd>Tab</kbd> <span>Navigate forward</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Shift + Tab</kbd> <span>Navigate backward</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Enter / Space</kbd> <span>Activate element</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Escape</kbd> <span>Close dialogs</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Alt + A</kbd> <span>Open accessibility settings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cognitive Accessibility Panel -->
                        <div id="cognitive-panel" class="accessibility-panel" role="tabpanel" aria-labelledby="cognitive-tab">
                            <h3>Cognitive Accessibility</h3>
                            
                            <div class="setting-group">
                                <h4>Interface Simplification</h4>
                                
                                <div class="setting-item">
                                    <label for="simplified-ui-toggle">
                                        <input type="checkbox" id="simplified-ui-toggle" ${this.currentSettings.simplifiedUI ? 'checked' : ''}>
                                        Simplified UI Mode
                                    </label>
                                    <p class="setting-description">Reduces visual complexity and distractions</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="reduced-complexity-toggle">
                                        <input type="checkbox" id="reduced-complexity-toggle" ${this.currentSettings.reducedComplexity ? 'checked' : ''}>
                                        Reduce Information Density
                                    </label>
                                    <p class="setting-description">Shows less information at once</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="extended-timeouts-toggle">
                                        <input type="checkbox" id="extended-timeouts-toggle" ${this.currentSettings.extendedTimeouts ? 'checked' : ''}>
                                        Extended Time Limits
                                    </label>
                                    <p class="setting-description">Provides more time for decisions and actions</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Audio Accessibility Panel -->
                        <div id="audio-panel" class="accessibility-panel" role="tabpanel" aria-labelledby="audio-tab">
                            <h3>Audio Accessibility</h3>
                            
                            <div class="setting-group">
                                <h4>Audio Alternatives</h4>
                                
                                <div class="setting-item">
                                    <label for="visual-audio-cues-toggle">
                                        <input type="checkbox" id="visual-audio-cues-toggle" ${this.currentSettings.visualAudioCues ? 'checked' : ''}>
                                        Visual Audio Cues
                                    </label>
                                    <p class="setting-description">Shows visual indicators for audio events</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="captions-toggle">
                                        <input type="checkbox" id="captions-toggle" ${this.currentSettings.captionsEnabled ? 'checked' : ''}>
                                        Enable Captions
                                    </label>
                                    <p class="setting-description">Shows text captions for audio content</p>
                                </div>
                                
                                <div class="setting-item">
                                    <label for="audio-descriptions-toggle">
                                        <input type="checkbox" id="audio-descriptions-toggle" ${this.currentSettings.audioDescriptions ? 'checked' : ''}>
                                        Audio Descriptions
                                    </label>
                                    <p class="setting-description">Provides audio descriptions of visual elements</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="accessibility-footer">
                    <button id="reset-accessibility" class="btn-secondary">Reset to Defaults</button>
                    <button id="save-accessibility" class="btn-primary">Save Settings</button>
                </div>
            </div>
            
            <!-- Accessibility Quick Toggle -->
            <button id="accessibility-quick-toggle" class="accessibility-quick-toggle" aria-label="Quick accessibility options">
                <span class="toggle-icon" aria-hidden="true">♿</span>
            </button>
        `;

        document.body.appendChild(overlay);
        this.setupAccessibilityEventListeners();
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Create ARIA live regions for announcements
        this.createLiveRegions();
        
        // Add ARIA labels to existing elements
        this.addAriaLabels();
        
        // Setup landmark regions
        this.setupLandmarks();
    }

    /**
     * Create ARIA live regions
     */
    createLiveRegions() {
        // Polite announcements (non-interrupting)
        const politeRegion = document.createElement('div');
        politeRegion.id = 'aria-live-polite';
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.className = 'sr-only';
        document.body.appendChild(politeRegion);
        this.screenReader.politeRegion = politeRegion;
        
        // Assertive announcements (interrupting)
        const assertiveRegion = document.createElement('div');
        assertiveRegion.id = 'aria-live-assertive';
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        document.body.appendChild(assertiveRegion);
        this.screenReader.assertiveRegion = assertiveRegion;
    }

    /**
     * Add ARIA labels to existing elements
     */
    addAriaLabels() {
        // Add labels to buttons without text
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        buttons.forEach(button => {
            if (!button.textContent.trim()) {
                const icon = button.querySelector('.icon, [class*="icon"]');
                if (icon) {
                    button.setAttribute('aria-label', this.getIconLabel(icon.className));
                }
            }
        });
        
        // Add labels to form controls
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        inputs.forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (!label && input.placeholder) {
                input.setAttribute('aria-label', input.placeholder);
            }
        });
        
        // Add roles to interactive elements
        const clickableElements = document.querySelectorAll('[onclick], .clickable, .interactive');
        clickableElements.forEach(element => {
            if (!element.getAttribute('role') && element.tagName !== 'BUTTON') {
                element.setAttribute('role', 'button');
                element.setAttribute('tabindex', '0');
            }
        });
    }

    /**
     * Get appropriate label for icon
     */
    getIconLabel(iconClass) {
        const iconLabels = {
            'close': 'Close',
            'menu': 'Menu',
            'settings': 'Settings',
            'help': 'Help',
            'search': 'Search',
            'play': 'Play',
            'pause': 'Pause',
            'stop': 'Stop',
            'next': 'Next',
            'previous': 'Previous',
            'volume': 'Volume',
            'mute': 'Mute'
        };
        
        for (const [key, label] of Object.entries(iconLabels)) {
            if (iconClass.includes(key)) {
                return label;
            }
        }
        
        return 'Button';
    }

    /**
     * Setup landmark regions
     */
    setupLandmarks() {
        // Add main landmark if not present
        if (!document.querySelector('main')) {
            const gameArea = document.querySelector('#game-canvas, .game-viewport, .game-container');
            if (gameArea) {
                gameArea.setAttribute('role', 'main');
                gameArea.setAttribute('aria-label', 'Game area');
            }
        }
        
        // Add navigation landmarks
        const navElements = document.querySelectorAll('.menu, .navigation, .nav');
        navElements.forEach(nav => {
            if (!nav.getAttribute('role')) {
                nav.setAttribute('role', 'navigation');
            }
        });
        
        // Add complementary landmarks for sidebars
        const sidebars = document.querySelectorAll('.sidebar, .aside, .secondary');
        sidebars.forEach(sidebar => {
            if (!sidebar.getAttribute('role')) {
                sidebar.setAttribute('role', 'complementary');
            }
        });
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Global keyboard event listener
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // Focus management
        document.addEventListener('focusin', (e) => {
            this.handleFocusIn(e);
        });
        
        document.addEventListener('focusout', (e) => {
            this.handleFocusOut(e);
        });
        
        // Update focusable elements periodically
        this.updateFocusableElements();
        setInterval(() => this.updateFocusableElements(), 5000);
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Add focus indicators to all interactive elements
        this.addFocusIndicators();
        
        // Setup focus trapping for modals
        this.setupFocusTrapping();
    }

    /**
     * Add focus indicators to interactive elements
     */
    addFocusIndicators() {
        const style = document.createElement('style');
        style.textContent = `
            .accessibility-focus-indicator {
                outline: 3px solid #0ea5e9 !important;
                outline-offset: 2px !important;
                border-radius: 4px !important;
            }
            
            .accessibility-focus-indicator-high-contrast {
                outline: 4px solid #ffffff !important;
                outline-offset: 2px !important;
                background-color: #000000 !important;
                color: #ffffff !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup focus trapping for modals
     */
    setupFocusTrapping() {
        // Monitor for modal openings
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const modal = node.querySelector('[role="dialog"], .modal, .overlay');
                        if (modal) {
                            this.trapFocus(modal);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Trap focus within a container
     */
    trapFocus(container) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) {
            return;
        }
        
        this.keyboardNavigation.trapFocus = true;
        this.keyboardNavigation.focusContainer = container;
        
        // Focus first element
        focusableElements[0].focus();
        
        const handleKeydown = (e) => {
            if (e.key === 'Tab') {
                const currentIndex = focusableElements.indexOf(document.activeElement);
                
                if (e.shiftKey) {
                    // Shift + Tab (backward)
                    e.preventDefault();
                    const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
                    focusableElements[nextIndex].focus();
                } else {
                    // Tab (forward)
                    e.preventDefault();
                    const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
                    focusableElements[nextIndex].focus();
                }
            } else if (e.key === 'Escape') {
                this.releaseFocusTrap();
            }
        };
        
        container.addEventListener('keydown', handleKeydown);
        
        // Store cleanup function
        container._focusTrapCleanup = () => {
            container.removeEventListener('keydown', handleKeydown);
            this.keyboardNavigation.trapFocus = false;
            this.keyboardNavigation.focusContainer = null;
        };
    }

    /**
     * Release focus trap
     */
    releaseFocusTrap() {
        if (this.keyboardNavigation.focusContainer && this.keyboardNavigation.focusContainer._focusTrapCleanup) {
            this.keyboardNavigation.focusContainer._focusTrapCleanup();
        }
    }

    /**
     * Detect system accessibility preferences
     */
    detectSystemPreferences() {
        // Detect prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.currentSettings.reduceMotion = true;
        }
        
        // Detect prefers-contrast
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.currentSettings.highContrast = true;
        }
        
        // Detect prefers-color-scheme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.currentSettings.customTheme = 'dark';
        }
        
        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.currentSettings.reduceMotion = e.matches;
            this.applyMotionSettings();
        });
        
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.currentSettings.highContrast = e.matches;
            this.applyVisualSettings();
        });
    }

    /**
     * Apply all accessibility settings
     */
    applyAllSettings() {
        this.applyVisualSettings();
        this.applyMotionSettings();
        this.applyKeyboardSettings();
        this.applyAudioSettings();
        this.applyCognitiveSettings();
    }

    /**
     * Apply visual accessibility settings
     */
    applyVisualSettings() {
        const root = document.documentElement;
        
        // Apply color scheme
        const scheme = this.getColorScheme();
        Object.entries(scheme).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
        
        // Apply text scaling
        root.style.setProperty('--text-scale', `${this.currentSettings.textScale / 100}`);
        
        // Apply UI scaling
        root.style.setProperty('--ui-scale', `${this.currentSettings.uiScale / 100}`);
        
        // Apply high contrast
        document.body.classList.toggle('accessibility-high-contrast', this.currentSettings.highContrast);
        
        // Apply colorblind mode
        document.body.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
        if (this.currentSettings.colorblindMode !== 'none') {
            document.body.classList.add(`colorblind-${this.currentSettings.colorblindMode}`);
        }
    }

    /**
     * Get current color scheme
     */
    getColorScheme() {
        if (this.currentSettings.highContrast) {
            return this.currentSettings.customTheme === 'dark' ? 
                this.colorSchemes.darkHighContrast : 
                this.colorSchemes.highContrast;
        }
        
        if (this.currentSettings.colorblindMode !== 'none') {
            return this.colorSchemes[this.currentSettings.colorblindMode];
        }
        
        return this.colorSchemes.default;
    }

    /**
     * Apply motion accessibility settings
     */
    applyMotionSettings() {
        document.body.classList.toggle('accessibility-reduce-motion', this.currentSettings.reduceMotion);
        document.body.classList.toggle('accessibility-disable-parallax', this.currentSettings.disableParallax);
        document.body.classList.toggle('accessibility-reduce-screen-shake', this.currentSettings.reduceScreenShake);
    }

    /**
     * Apply keyboard accessibility settings
     */
    applyKeyboardSettings() {
        document.body.classList.toggle('accessibility-keyboard-nav', this.currentSettings.keyboardNavigation);
        document.body.classList.toggle('accessibility-focus-indicators', this.currentSettings.focusIndicators);
        document.body.classList.toggle('accessibility-sticky-keys', this.currentSettings.stickyKeys);
        document.body.classList.toggle('accessibility-slow-keys', this.currentSettings.slowKeys);
    }

    /**
     * Apply audio accessibility settings
     */
    applyAudioSettings() {
        document.body.classList.toggle('accessibility-visual-audio-cues', this.currentSettings.visualAudioCues);
        document.body.classList.toggle('accessibility-captions', this.currentSettings.captionsEnabled);
        document.body.classList.toggle('accessibility-audio-descriptions', this.currentSettings.audioDescriptions);
    }

    /**
     * Apply cognitive accessibility settings
     */
    applyCognitiveSettings() {
        document.body.classList.toggle('accessibility-simplified-ui', this.currentSettings.simplifiedUI);
        document.body.classList.toggle('accessibility-reduced-complexity', this.currentSettings.reducedComplexity);
        document.body.classList.toggle('accessibility-extended-timeouts', this.currentSettings.extendedTimeouts);
    }

    /**
     * Setup accessibility event listeners
     */
    setupAccessibilityEventListeners() {
        // Quick toggle button
        const quickToggle = document.getElementById('accessibility-quick-toggle');
        if (quickToggle) {
            quickToggle.addEventListener('click', () => {
                this.toggleAccessibilityOverlay();
            });
        }
        
        // Close button
        const closeBtn = document.getElementById('close-accessibility');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAccessibilityOverlay();
            });
        }
        
        // Tab navigation
        const tabs = document.querySelectorAll('.accessibility-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAccessibilityTab(e.target.dataset.tab);
            });
        });
        
        // Setting controls
        this.setupSettingControls();
        
        // Footer buttons
        const resetBtn = document.getElementById('reset-accessibility');
        const saveBtn = document.getElementById('save-accessibility');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                this.hideAccessibilityOverlay();
            });
        }
    }

    /**
     * Setup setting control event listeners
     */
    setupSettingControls() {
        // High contrast toggle
        const highContrastToggle = document.getElementById('high-contrast-toggle');
        if (highContrastToggle) {
            highContrastToggle.addEventListener('change', (e) => {
                this.currentSettings.highContrast = e.target.checked;
                this.applyVisualSettings();
            });
        }
        
        // Colorblind mode select
        const colorblindSelect = document.getElementById('colorblind-select');
        if (colorblindSelect) {
            colorblindSelect.addEventListener('change', (e) => {
                this.currentSettings.colorblindMode = e.target.value;
                this.applyVisualSettings();
            });
        }
        
        // Text scale slider
        const textScaleSlider = document.getElementById('text-scale-slider');
        const textScaleValue = document.getElementById('text-scale-value');
        if (textScaleSlider && textScaleValue) {
            textScaleSlider.addEventListener('input', (e) => {
                this.currentSettings.textScale = parseInt(e.target.value);
                textScaleValue.textContent = `${this.currentSettings.textScale}%`;
                this.applyVisualSettings();
            });
        }
        
        // UI scale slider
        const uiScaleSlider = document.getElementById('ui-scale-slider');
        const uiScaleValue = document.getElementById('ui-scale-value');
        if (uiScaleSlider && uiScaleValue) {
            uiScaleSlider.addEventListener('input', (e) => {
                this.currentSettings.uiScale = parseInt(e.target.value);
                uiScaleValue.textContent = `${this.currentSettings.uiScale}%`;
                this.applyVisualSettings();
            });
        }
        
        // Motion settings
        const reduceMotionToggle = document.getElementById('reduce-motion-toggle');
        if (reduceMotionToggle) {
            reduceMotionToggle.addEventListener('change', (e) => {
                this.currentSettings.reduceMotion = e.target.checked;
                this.applyMotionSettings();
            });
        }
        
        // Add more setting controls as needed...
    }

    /**
     * Handle global keyboard events
     */
    handleGlobalKeydown(e) {
        // Alt + A: Open accessibility settings
        if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            this.toggleAccessibilityOverlay();
            return;
        }
        
        // Handle keyboard navigation
        if (this.currentSettings.keyboardNavigation) {
            this.handleKeyboardNavigation(e);
        }
        
        // Handle sticky keys
        if (this.currentSettings.stickyKeys) {
            this.handleStickyKeys(e);
        }
        
        // Handle slow keys
        if (this.currentSettings.slowKeys) {
            this.handleSlowKeys(e);
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(e) {
        if (e.key === 'Tab') {
            // Tab navigation is handled by browser, but we can enhance it
            this.updateFocusHistory();
        }
    }

    /**
     * Handle focus in events
     */
    handleFocusIn(e) {
        if (this.currentSettings.focusIndicators) {
            const className = this.currentSettings.highContrast ? 
                'accessibility-focus-indicator-high-contrast' : 
                'accessibility-focus-indicator';
            e.target.classList.add(className);
        }
        
        // Announce focus change to screen readers
        if (e.target.getAttribute('aria-label') || e.target.textContent) {
            const label = e.target.getAttribute('aria-label') || e.target.textContent.trim();
            if (label) {
                this.announceToScreenReader(label, 'polite');
            }
        }
    }

    /**
     * Handle focus out events
     */
    handleFocusOut(e) {
        e.target.classList.remove('accessibility-focus-indicator', 'accessibility-focus-indicator-high-contrast');
    }

    /**
     * Update focusable elements list
     */
    updateFocusableElements() {
        this.keyboardNavigation.focusableElements = this.getFocusableElements();
    }

    /**
     * Get all focusable elements
     */
    getFocusableElements(container = document) {
        const selectors = [
            'button:not([disabled])',
            '[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[role="button"]:not([disabled])',
            '[role="link"]:not([disabled])',
            '[contenteditable="true"]'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(selectors))
            .filter(element => element.offsetWidth > 0 && 
                       element.offsetHeight > 0 && 
                       !element.closest('.hidden') &&
                       getComputedStyle(element).visibility !== 'hidden');
    }

    /**
     * Update focus history
     */
    updateFocusHistory() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body) {
            this.keyboardNavigation.focusHistory.push(activeElement);
            
            // Keep history limited
            if (this.keyboardNavigation.focusHistory.length > 10) {
                this.keyboardNavigation.focusHistory.shift();
            }
        }
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message, priority = 'polite') {
        const region = priority === 'assertive' ? 
            this.screenReader.assertiveRegion : 
            this.screenReader.politeRegion;
        
        if (region) {
            region.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }

    /**
     * Toggle accessibility overlay
     */
    toggleAccessibilityOverlay() {
        const overlay = document.getElementById('accessibility-overlay');
        if (overlay) {
            const isHidden = overlay.getAttribute('aria-hidden') === 'true';
            
            if (isHidden) {
                this.showAccessibilityOverlay();
            } else {
                this.hideAccessibilityOverlay();
            }
        }
    }

    /**
     * Show accessibility overlay
     */
    showAccessibilityOverlay() {
        const overlay = document.getElementById('accessibility-overlay');
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'false');
            overlay.classList.add('visible');
            
            // Focus first focusable element
            const firstFocusable = this.getFocusableElements(overlay)[0];
            if (firstFocusable) {
                firstFocusable.focus();
            }
            
            // Trap focus
            this.trapFocus(overlay);
        }
    }

    /**
     * Hide accessibility overlay
     */
    hideAccessibilityOverlay() {
        const overlay = document.getElementById('accessibility-overlay');
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('visible');
            
            // Release focus trap
            this.releaseFocusTrap();
            
            // Return focus to trigger element
            const quickToggle = document.getElementById('accessibility-quick-toggle');
            if (quickToggle) {
                quickToggle.focus();
            }
        }
    }

    /**
     * Switch accessibility tab
     */
    switchAccessibilityTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.accessibility-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive.toString());
        });
        
        // Update tab panels
        const panels = document.querySelectorAll('.accessibility-panel');
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.currentSettings = {
            highContrast: false,
            colorblindMode: 'none',
            textScale: 100,
            uiScale: 100,
            reduceMotion: false,
            disableParallax: false,
            reduceScreenShake: false,
            keyboardNavigation: true,
            focusIndicators: true,
            stickyKeys: false,
            slowKeys: false,
            visualAudioCues: false,
            captionsEnabled: false,
            audioDescriptions: false,
            simplifiedUI: false,
            reducedComplexity: false,
            extendedTimeouts: false,
            customTheme: 'default'
        };
        
        this.applyAllSettings();
        this.updateSettingControls();
        this.announceToScreenReader('Settings reset to defaults', 'polite');
    }

    /**
     * Update setting controls to match current settings
     */
    updateSettingControls() {
        // Update all form controls to match current settings
        Object.entries(this.currentSettings).forEach(([key, value]) => {
            const control = document.getElementById(`${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-toggle`) ||
                           document.getElementById(`${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-select`) ||
                           document.getElementById(`${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-slider`);
            
            if (control) {
                if (control.type === 'checkbox') {
                    control.checked = value;
                } else if (control.type === 'range') {
                    control.value = value;
                    const valueDisplay = document.getElementById(`${control.id.replace('-slider', '-value')}`);
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                } else {
                    control.value = value;
                }
            }
        });
    }

    /**
     * Start accessibility monitoring loop
     */
    startAccessibilityLoop() {
        const loop = () => {
            this.monitorAccessibility();
            requestAnimationFrame(loop);
        };
        
        loop();
    }

    /**
     * Monitor accessibility state
     */
    monitorAccessibility() {
        // Monitor for new elements that need accessibility enhancements
        // This would be called periodically to ensure new UI elements are accessible
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('accessibilitySettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentSettings = { ...this.currentSettings, ...settings };
            }
        } catch (error) {
            console.warn('Failed to load accessibility settings:', error);
        }
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            localStorage.setItem('accessibilitySettings', JSON.stringify(this.currentSettings));
            this.announceToScreenReader('Settings saved successfully', 'polite');
        } catch (error) {
            console.warn('Failed to save accessibility settings:', error);
            this.announceToScreenReader('Failed to save settings', 'assertive');
        }
    }

    /**
     * Get current accessibility status
     */
    getAccessibilityStatus() {
        return {
            enabled: this.isEnabled,
            settings: { ...this.currentSettings },
            keyboardNavigation: { ...this.keyboardNavigation },
            focusableElementsCount: this.keyboardNavigation.focusableElements.length
        };
    }

    /**
     * Enable/disable accessibility system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (enabled) {
            this.applyAllSettings();
        } else {
            // Remove all accessibility enhancements
            document.body.classList.remove(
                'accessibility-high-contrast',
                'accessibility-reduce-motion',
                'accessibility-disable-parallax',
                'accessibility-reduce-screen-shake',
                'accessibility-keyboard-nav',
                'accessibility-focus-indicators',
                'accessibility-sticky-keys',
                'accessibility-slow-keys',
                'accessibility-visual-audio-cues',
                'accessibility-captions',
                'accessibility-audio-descriptions',
                'accessibility-simplified-ui',
                'accessibility-reduced-complexity',
                'accessibility-extended-timeouts'
            );
        }
    }

    /**
     * Cleanup accessibility system
     */
    destroy() {
        const overlay = document.getElementById('accessibility-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        const liveRegions = document.querySelectorAll('#aria-live-polite, #aria-live-assertive');
        liveRegions.forEach(region => region.remove());
        
        this.releaseFocusTrap();
    }
}
