/**
 * Audio Manager - Handles audio context initialization and wolf vocalizations
 * Separated from main site.js for better organization and error handling
 */

import { idGenerator } from '../utils/deterministic-id-generator.js'

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.wolfSounds = {};
    this.isInitialized = false;
    this.userInteracted = false;
    this.activeVocalizations = new Map();
    
    this.vocalizationTypes = {
      HOWL: 'howl',
      GROWL: 'growl',
      BARK: 'bark',
      WHINE: 'whine',
      SNARL: 'snarl'
    };
  }

  /**
   * Initialize audio context after user interaction
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully');
      }

      // Create wolf sounds
      await this.createWolfSounds();
      
      this.isInitialized = true;
      console.log('AudioContext initialized successfully');
      
      return true;
    } catch (error) {
      console.warn('Failed to initialize AudioContext:', error);
      return false;
    }
  }

  /**
   * Handle first user interaction to enable audio
   */
  onFirstUserInteraction() {
    if (this.userInteracted) return;
    
    this.userInteracted = true;
    this.initialize().catch(console.warn);
    
    // Remove event listeners after first interaction
    document.removeEventListener('click', this.onFirstUserInteraction);
    document.removeEventListener('keydown', this.onFirstUserInteraction);
    document.removeEventListener('touchstart', this.onFirstUserInteraction);
  }

  /**
   * Create wolf sound effects
   * @private
   */
  async createWolfSounds() {
    if (!this.audioContext) return;

    try {
      // Create oscillator-based sounds for different vocalizations
      this.wolfSounds = {
        [this.vocalizationTypes.HOWL]: this.createHowlSound(),
        [this.vocalizationTypes.GROWL]: this.createGrowlSound(),
        [this.vocalizationTypes.BARK]: this.createBarkSound(),
        [this.vocalizationTypes.WHINE]: this.createWhineSound(),
        [this.vocalizationTypes.SNARL]: this.createSnarlSound()
      };
    } catch (error) {
      console.warn('Failed to create wolf sounds:', error);
    }
  }

  /**
   * Create howl sound effect
   * @private
   */
  createHowlSound() {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 2);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 2);
    };
  }

  /**
   * Create growl sound effect
   * @private
   */
  createGrowlSound() {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 1);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 1);
    };
  }

  /**
   * Create bark sound effect
   * @private
   */
  createBarkSound() {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    };
  }

  /**
   * Create whine sound effect
   * @private
   */
  createWhineSound() {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    };
  }

  /**
   * Create snarl sound effect
   * @private
   */
  createSnarlSound() {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(120, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(180, this.audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    };
  }

  /**
   * Play wolf vocalization
   * @param {string} type - Vocalization type
   * @param {Object} options - Play options
   */
  playVocalization(type, options = {}) {
    if (!this.isInitialized || !this.wolfSounds[type]) {
      console.warn('Audio not initialized or sound not found:', type);
      return;
    }

    try {
      this.wolfSounds[type]();
      
      // Add visual effect if element provided
      if (options.element) {
        this.addVocalizationVisual(options.element, type);
      }
    } catch (error) {
      console.warn('Failed to play wolf sound:', error);
    }
  }

  /**
   * Add visual effect for vocalization
   * @param {HTMLElement} element - Element to add effect to
   * @param {string} type - Vocalization type
   */
  addVocalizationVisual(element, type) {
    if (!element) return;

    const visualId = idGenerator.generateVisualId();
    const startTime = Date.now();
    
    // Store visual data
    this.activeVocalizations.set(visualId, {
      element,
      type,
      startTime,
      duration: this.getVocalizationDuration(type)
    });

    // Add CSS class for visual effect
    element.classList.add(`vocalization-${type}`);
    element.setAttribute('data-vocalization-id', visualId);

    // Remove effect after duration
    setTimeout(() => {
      this.removeVocalizationVisual(visualId);
    }, this.getVocalizationDuration(type));
  }

  /**
   * Remove vocalization visual effect
   * @param {string} visualId - Visual effect ID
   */
  removeVocalizationVisual(visualId) {
    const visual = this.activeVocalizations.get(visualId);
    if (!visual) return;

    visual.element.classList.remove(`vocalization-${visual.type}`);
    visual.element.removeAttribute('data-vocalization-id');
    this.activeVocalizations.delete(visualId);
  }

  /**
   * Get duration for vocalization type
   * @param {string} type - Vocalization type
   * @returns {number} Duration in milliseconds
   */
  getVocalizationDuration(type) {
    const durations = {
      [this.vocalizationTypes.HOWL]: 2000,
      [this.vocalizationTypes.GROWL]: 1000,
      [this.vocalizationTypes.BARK]: 200,
      [this.vocalizationTypes.WHINE]: 500,
      [this.vocalizationTypes.SNARL]: 300
    };
    
    return durations[type] || 1000;
  }

  /**
   * Update vocalization visuals (called in render loop)
   */
  updateVocalizationVisuals() {
    const now = Date.now();
    
    for (const [visualId, visual] of this.activeVocalizations) {
      const elapsed = now - visual.startTime;
      const progress = Math.min(elapsed / visual.duration, 1);
      
      this.updateVocalizationVisual(visual.element, progress);
    }
  }

  /**
   * Update individual vocalization visual
   * @param {HTMLElement} element - Element to update
   * @param {number} progress - Progress (0-1)
   */
  updateVocalizationVisual(element, progress) {
    if (!element) return;

    // Apply visual effects based on progress
    const intensity = Math.sin(progress * Math.PI); // Fade in/out
    const scale = 1 + (intensity * 0.1); // Slight scale effect
    
    element.style.transform = `scale(${scale})`;
    element.style.filter = `brightness(${1 + intensity * 0.2})`;
  }

  /**
   * Create vocalization test controls
   * @param {HTMLElement} container - Container to add controls to
   */
  createVocalizationTestControls(container) {
    if (!container) return;

    const testSection = document.createElement('div');
    testSection.innerHTML = `
      <h3>Wolf Vocalization Test</h3>
      <div class="vocalization-buttons">
        ${Object.values(this.vocalizationTypes).map(type => 
          `<button onclick="audioManager.testVocalization('${type}')" class="test-btn">${type.toUpperCase()}</button>`
        ).join('')}
      </div>
    `;

    container.appendChild(testSection);
  }

  /**
   * Test vocalization (for debugging)
   * @param {string} type - Vocalization type to test
   */
  testVocalization(type) {
    if (!Object.values(this.vocalizationTypes).includes(type)) {
      console.warn('Invalid vocalization type:', type);
      return;
    }

    this.playVocalization(type);
    console.log(`Testing vocalization: ${type}`);
  }

  /**
   * Setup event listeners for user interaction
   */
  setupEventListeners() {
    // Bind the method to preserve 'this' context
    this.onFirstUserInteraction = this.onFirstUserInteraction.bind(this);
    
    document.addEventListener('click', this.onFirstUserInteraction);
    document.addEventListener('keydown', this.onFirstUserInteraction);
    document.addEventListener('touchstart', this.onFirstUserInteraction);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.activeVocalizations.clear();
    this.wolfSounds = {};
    this.isInitialized = false;
  }
}
