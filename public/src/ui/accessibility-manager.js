/**
 * Accessibility Manager for Modern Roguelite UI
 * Implements text scaling, colorblind presets, reduce motion, and shake toggle
 * Follows WCAG guidelines and modern accessibility best practices
 */

export class AccessibilityManager {
  constructor() {
    // Accessibility settings
    this.settings = {
      textScale: 100,
      colorblindMode: 'none',
      reduceMotion: false,
      screenShake: true,
      highContrast: false,
      focusIndicators: true,
      soundCues: true,
      hapticFeedback: true
    };
    
    // Colorblind filter definitions
    this.colorblindFilters = {
      protanopia: {
        name: 'Protanopia (Red-blind)',
        filter: 'url(#protanopia-filter)'
      },
      deuteranopia: {
        name: 'Deuteranopia (Green-blind)',
        filter: 'url(#deuteranopia-filter)'
      },
      tritanopia: {
        name: 'Tritanopia (Blue-blind)',
        filter: 'url(#tritanopia-filter)'
      }
    };
    
    // Media query listeners
    this.mediaQueries = new Map();
    
    this.initialize();
  }

  /**
   * Initialize accessibility system
   */
  initialize() {
    this.loadSettings();
    this.createColorblindFilters();
    this.setupMediaQueryListeners();
    this.applySettings();
    this.setupEventListeners();
  }

  /**
   * Load accessibility settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('roguelite-accessibility');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
    
    // Also check system preferences
    this.detectSystemPreferences();
  }

  /**
   * Save accessibility settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('roguelite-accessibility', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }

  /**
   * Detect system accessibility preferences
   */
  detectSystemPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.reduceMotion = true;
    }
    
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.settings.highContrast = true;
    }
    
    // Detect color scheme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark-theme', prefersDark);
  }

  /**
   * Setup media query listeners for system preference changes
   */
  setupMediaQueryListeners() {
    // Reduced motion
    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaQueries.set('reducedMotion', reducedMotionMQ);
    reducedMotionMQ.addListener((e) => {
      if (!this.settings.reduceMotion) { // Only if user hasn't manually set it
        this.updateReduceMotion(e.matches);
      }
    });
    
    // High contrast
    const highContrastMQ = window.matchMedia('(prefers-contrast: high)');
    this.mediaQueries.set('highContrast', highContrastMQ);
    highContrastMQ.addListener((e) => {
      this.updateHighContrast(e.matches);
    });
    
    // Color scheme
    const colorSchemeMQ = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueries.set('colorScheme', colorSchemeMQ);
    colorSchemeMQ.addListener((e) => {
      document.documentElement.classList.toggle('dark-theme', e.matches);
    });
  }

  /**
   * Setup event listeners for accessibility controls
   */
  setupEventListeners() {
    // Listen for settings changes from UI
    document.addEventListener('accessibility-setting-changed', (e) => {
      this.updateSetting(e.detail.setting, e.detail.value);
    });
    
    // Listen for keyboard navigation
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });
    
    // Listen for focus changes to manage focus indicators
    document.addEventListener('focusin', (e) => {
      this.handleFocusIn(e);
    });
    
    document.addEventListener('focusout', (e) => {
      this.handleFocusOut(e);
    });
  }

  /**
   * Create SVG colorblind filters
   */
  createColorblindFilters() {
    // Remove existing filters
    const existing = document.getElementById('accessibility-filters');
    if (existing) {
      existing.remove();
    }
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'accessibility-filters';
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    svg.setAttribute('aria-hidden', 'true');
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Protanopia filter (red-blind)
    const protanopiaFilter = this.createColorMatrix('protanopia-filter', [
      0.567, 0.433, 0, 0, 0,
      0.558, 0.442, 0, 0, 0,
      0, 0.242, 0.758, 0, 0,
      0, 0, 0, 1, 0
    ]);
    defs.appendChild(protanopiaFilter);
    
    // Deuteranopia filter (green-blind)
    const deuteranopiaFilter = this.createColorMatrix('deuteranopia-filter', [
      0.625, 0.375, 0, 0, 0,
      0.7, 0.3, 0, 0, 0,
      0, 0.3, 0.7, 0, 0,
      0, 0, 0, 1, 0
    ]);
    defs.appendChild(deuteranopiaFilter);
    
    // Tritanopia filter (blue-blind)
    const tritanopiaFilter = this.createColorMatrix('tritanopia-filter', [
      0.95, 0.05, 0, 0, 0,
      0, 0.433, 0.567, 0, 0,
      0, 0.475, 0.525, 0, 0,
      0, 0, 0, 1, 0
    ]);
    defs.appendChild(tritanopiaFilter);
    
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }

  /**
   * Create a color matrix filter
   */
  createColorMatrix(id, values) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;
    
    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', values.join(' '));
    
    filter.appendChild(colorMatrix);
    return filter;
  }

  /**
   * Apply all accessibility settings
   */
  applySettings() {
    this.updateTextScale(this.settings.textScale);
    this.updateColorblindMode(this.settings.colorblindMode);
    this.updateReduceMotion(this.settings.reduceMotion);
    this.updateScreenShake(this.settings.screenShake);
    this.updateHighContrast(this.settings.highContrast);
    this.updateFocusIndicators(this.settings.focusIndicators);
  }

  /**
   * Update a specific setting
   */
  updateSetting(setting, value) {
    if (!(setting in this.settings)) {
      console.warn(`Unknown accessibility setting: ${setting}`);
      return;
    }
    
    this.settings[setting] = value;
    this.saveSettings();
    
    // Apply the specific setting
    switch (setting) {
      case 'textScale':
        this.updateTextScale(value);
        break;
      case 'colorblindMode':
        this.updateColorblindMode(value);
        break;
      case 'reduceMotion':
        this.updateReduceMotion(value);
        break;
      case 'screenShake':
        this.updateScreenShake(value);
        break;
      case 'highContrast':
        this.updateHighContrast(value);
        break;
      case 'focusIndicators':
        this.updateFocusIndicators(value);
        break;
    }
    
    // Dispatch event for UI updates
    this.dispatchSettingChange(setting, value);
  }

  /**
   * Update text scale
   */
  updateTextScale(scale) {
    const scaleValue = Math.max(80, Math.min(200, scale)) / 100;
    document.documentElement.style.setProperty('--text-scale', scaleValue);
    
    // Also update any fixed font sizes that should scale
    const scalableElements = document.querySelectorAll('.scalable-text');
    scalableElements.forEach(element => {
      const baseFontSize = parseFloat(element.dataset.baseFontSize) || 16;
      element.style.fontSize = `${baseFontSize * scaleValue}px`;
    });
  }

  /**
   * Update colorblind mode
   */
  updateColorblindMode(mode) {
    // Remove existing colorblind classes
    document.documentElement.classList.remove(
      'colorblind-protanopia',
      'colorblind-deuteranopia',
      'colorblind-tritanopia'
    );
    
    // Apply new colorblind mode
    if (mode !== 'none' && this.colorblindFilters[mode]) {
      document.documentElement.classList.add(`colorblind-${mode}`);
    }
  }

  /**
   * Update reduce motion setting
   */
  updateReduceMotion(enabled) {
    document.documentElement.classList.toggle('reduce-motion', enabled);
    
    if (enabled) {
      // Disable all CSS animations and transitions
      this.injectReduceMotionCSS();
    } else {
      // Remove reduce motion CSS
      this.removeReduceMotionCSS();
    }
  }

  /**
   * Update screen shake setting
   */
  updateScreenShake(enabled) {
    document.documentElement.classList.toggle('no-screen-shake', !enabled);
    
    // Dispatch event for game systems to respect this setting
    const event = new CustomEvent('screen-shake-setting-changed', {
      detail: { enabled }
    });
    document.dispatchEvent(event);
  }

  /**
   * Update high contrast mode
   */
  updateHighContrast(enabled) {
    document.documentElement.classList.toggle('high-contrast', enabled);
    
    if (enabled) {
      // Apply high contrast styles
      document.documentElement.style.setProperty('--color-bg-primary', '#000000');
      document.documentElement.style.setProperty('--color-bg-secondary', '#111111');
      document.documentElement.style.setProperty('--color-text-primary', '#ffffff');
      document.documentElement.style.setProperty('--border-width', '2px');
    } else {
      // Reset to default values
      document.documentElement.style.removeProperty('--color-bg-primary');
      document.documentElement.style.removeProperty('--color-bg-secondary');
      document.documentElement.style.removeProperty('--color-text-primary');
      document.documentElement.style.removeProperty('--border-width');
    }
  }

  /**
   * Update focus indicators
   */
  updateFocusIndicators(enabled) {
    document.documentElement.classList.toggle('no-focus-indicators', !enabled);
  }

  /**
   * Inject CSS to disable animations when reduce motion is enabled
   */
  injectReduceMotionCSS() {
    const existingStyle = document.getElementById('reduce-motion-style');
    if (existingStyle) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'reduce-motion-style';
    style.textContent = `
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Remove reduce motion CSS
   */
  removeReduceMotionCSS() {
    const style = document.getElementById('reduce-motion-style');
    if (style) {
      style.remove();
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(e) {
    // Skip if user is typing in an input
    if (e.target.matches('input, textarea, [contenteditable]')) {
      return;
    }
    
    // Handle tab navigation
    if (e.key === 'Tab') {
      this.handleTabNavigation(e);
    }
    
    // Handle arrow key navigation for custom components
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.handleArrowNavigation(e);
    }
    
    // Handle Enter/Space for activation
    if (e.key === 'Enter' || e.key === ' ') {
      this.handleActivation(e);
    }
    
    // Handle Escape for closing modals/menus
    if (e.key === 'Escape') {
      this.handleEscape(e);
    }
  }

  /**
   * Handle tab navigation
   */
  handleTabNavigation(e) {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement);
    
    if (currentIndex === -1) {
      return;
    }
    
    let nextIndex;
    if (e.shiftKey) {
      // Shift+Tab (backward)
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    } else {
      // Tab (forward)
      nextIndex = currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1;
    }
    
    const nextElement = focusableElements[nextIndex];
    if (nextElement) {
      nextElement.focus();
      e.preventDefault();
    }
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowNavigation(e) {
    const target = e.target;
    
    // Handle grid navigation (like ability bar)
    if (target.matches('.ability-slot, .consumable-slot, .ultimate-slot')) {
      this.handleGridNavigation(e, target);
    }
    
    // Handle menu navigation
    if (target.matches('.menu-tab, .tab-button')) {
      this.handleMenuNavigation(e, target);
    }
  }

  /**
   * Handle grid navigation (ability bar, inventory)
   */
  handleGridNavigation(e, currentElement) {
    const container = currentElement.closest('.ability-bar, .inventory-grid');
    if (!container) {
      return;
    }
    
    const slots = Array.from(container.querySelectorAll('.ability-slot, .consumable-slot, .ultimate-slot, .inventory-slot'));
    const currentIndex = slots.indexOf(currentElement);
    
    if (currentIndex === -1) {
      return;
    }
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : slots.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < slots.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        // For now, just move to adjacent slots
        // Could implement proper grid navigation based on layout
        nextIndex = currentIndex;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      slots[nextIndex].focus();
      e.preventDefault();
    }
  }

  /**
   * Handle menu navigation
   */
  handleMenuNavigation(e, currentElement) {
    const container = currentElement.closest('.menu-tabs');
    if (!container) {
      return;
    }
    
    const tabs = Array.from(container.querySelectorAll('.menu-tab, .tab-button'));
    const currentIndex = tabs.indexOf(currentElement);
    
    if (currentIndex === -1) {
      return;
    }
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      tabs[nextIndex].focus();
      tabs[nextIndex].click(); // Activate the tab
      e.preventDefault();
    }
  }

  /**
   * Handle activation (Enter/Space)
   */
  handleActivation(e) {
    const target = e.target;
    
    // Handle button-like elements
    if (target.matches('button, [role="button"]')) {
      target.click();
      e.preventDefault();
    }
    
    // Handle tab activation
    if (target.matches('.menu-tab, .tab-button')) {
      target.click();
      e.preventDefault();
    }
    
    // Handle ability slot activation
    if (target.matches('.ability-slot, .consumable-slot, .ultimate-slot')) {
      this.activateAbilitySlot(target);
      e.preventDefault();
    }
  }

  /**
   * Handle escape key
   */
  handleEscape(e) {
    // Close any open modals or menus
    const openModal = document.querySelector('.menu-overlay:not(.hidden)');
    if (openModal) {
      const closeButton = openModal.querySelector('.close-menu');
      if (closeButton) {
        closeButton.click();
      }
      e.preventDefault();
    }
  }

  /**
   * Handle focus in events
   */
  handleFocusIn(e) {
    if (this.settings.focusIndicators) {
      e.target.classList.add('keyboard-focused');
    }
    
    // Announce focus changes for screen readers
    this.announceFocusChange(e.target);
  }

  /**
   * Handle focus out events
   */
  handleFocusOut(e) {
    e.target.classList.remove('keyboard-focused');
  }

  /**
   * Get all focusable elements
   */
  getFocusableElements() {
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])'
    ].join(', ');
    
    return Array.from(document.querySelectorAll(selectors))
      .filter(element => element.offsetWidth > 0 && element.offsetHeight > 0 &&
               !element.closest('.hidden') &&
               getComputedStyle(element).visibility !== 'hidden');
  }

  /**
   * Activate ability slot with keyboard
   */
  activateAbilitySlot(slot) {
    const slotType = slot.dataset.slot;
    
    // Dispatch activation event
    const event = new CustomEvent('ability-activated', {
      detail: { slot: slotType, inputType: 'keyboard' }
    });
    document.dispatchEvent(event);
  }

  /**
   * Announce focus changes for screen readers
   */
  announceFocusChange(element) {
    if (!this.settings.soundCues) {
      return;
    }
    
    // Get element description
    const description = element.getAttribute('aria-label') ||
                       element.getAttribute('title') ||
                       element.textContent ||
                       element.getAttribute('alt') ||
                       'Interactive element';
    
    // Create announcement
    this.announceToScreenReader(description);
  }

  /**
   * Announce text to screen readers
   */
  announceToScreenReader(text) {
    // Remove existing announcements
    const existing = document.getElementById('accessibility-announcement');
    if (existing) {
      existing.remove();
    }
    
    // Create new announcement element
    const announcement = document.createElement('div');
    announcement.id = 'accessibility-announcement';
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.remove();
      }
    }, 1000);
  }

  /**
   * Provide haptic feedback (if supported)
   */
  provideHapticFeedback(type = 'light') {
    if (!this.settings.hapticFeedback) {
      return;
    }
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        error: [50, 50, 50]
      };
      
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }

  /**
   * Dispatch setting change event
   */
  dispatchSettingChange(setting, value) {
    const event = new CustomEvent('accessibility-setting-updated', {
      detail: { setting, value, allSettings: { ...this.settings } }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Get available colorblind modes
   */
  getColorblindModes() {
    return {
      none: { name: 'None', description: 'Normal vision' },
      ...this.colorblindFilters
    };
  }

  /**
   * Test colorblind mode with preview
   */
  previewColorblindMode(mode) {
    // Temporarily apply the mode
    this.updateColorblindMode(mode);
    
    // Reset after preview duration
    setTimeout(() => {
      this.updateColorblindMode(this.settings.colorblindMode);
    }, 3000);
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.settings = {
      textScale: 100,
      colorblindMode: 'none',
      reduceMotion: false,
      screenShake: true,
      highContrast: false,
      focusIndicators: true,
      soundCues: true,
      hapticFeedback: true
    };
    
    this.saveSettings();
    this.applySettings();
    
    // Dispatch event
    this.dispatchSettingChange('all', this.settings);
  }

  /**
   * Cleanup and destroy accessibility manager
   */
  destroy() {
    // Remove media query listeners
    for (const [, mq] of this.mediaQueries) {
      mq.removeListener();
    }
    this.mediaQueries.clear();
    
    // Remove event listeners
    document.removeEventListener('accessibility-setting-changed', this.handleSettingChange);
    document.removeEventListener('keydown', this.handleKeyboardNavigation);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    
    // Remove injected styles
    this.removeReduceMotionCSS();
    
    // Remove SVG filters
    const filters = document.getElementById('accessibility-filters');
    if (filters) {
      filters.remove();
    }
  }
}