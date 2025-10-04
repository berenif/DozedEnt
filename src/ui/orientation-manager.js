/**
 * Enhanced OrientationManager with delightful UX features
 * - Haptic feedback for touch interactions
 * - Smooth transitions and animations
 * - Wake Lock API for uninterrupted gameplay
 * - Celebration animations on successful orientation
 * - Battery-aware optimizations
 */
export class OrientationManager {
  constructor({
    overlayId = 'orientation-overlay',
    overlayStartButtonId = 'overlay-start',
    detectMobileDevice,
    onPauseForOverlay,
    onResumeFromOverlay,
    onOrientationChange
  } = {}) {
    this.overlayId = overlayId;
    this.overlayStartButtonId = overlayStartButtonId;
    this.detectMobileDevice = detectMobileDevice || defaultDetectMobileDevice;
    this.onPauseForOverlay = onPauseForOverlay || (() => {});
    this.onResumeFromOverlay = onResumeFromOverlay || (() => {});
    this.onOrientationChange = onOrientationChange || (() => {});

    this.overlayElement = null;
    this.startButton = null;
    this.pendingStartCallback = null;
    this.wasPausedForOverlay = false;
    this.orientationChangeTimer = null;
    this.wakeLock = null;
    this.isFullscreen = false;
    this.celebrationShown = false;

    this.boundEvaluateOrientation = this.queueOrientationEvaluation.bind(this);
    this.boundHandleVisibility = this.handleVisibilityChange.bind(this);
    this.boundHandleOverlayStart = this.handleOverlayStartClick.bind(this);
    this.boundHandleFullscreenChange = this.handleFullscreenChange.bind(this);
  }

  /**
   * Prepare DOM references and attach listeners.
   */
  initialize() {
    this.overlayElement = document.getElementById(this.overlayId);
    this.startButton = document.getElementById(this.overlayStartButtonId);

    if (this.startButton) {
      this.startButton.addEventListener('click', this.boundHandleOverlayStart);
      // Add haptic feedback and ripple effect on touch
      this.startButton.addEventListener('touchstart', this.handleButtonTouchStart.bind(this), { passive: true });
      this.startButton.addEventListener('touchend', this.handleButtonTouchEnd.bind(this), { passive: true });
    }

    window.addEventListener('orientationchange', this.boundEvaluateOrientation);
    window.addEventListener('resize', this.boundEvaluateOrientation);

    if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
      window.screen.orientation.addEventListener('change', this.boundEvaluateOrientation);
    }

    document.addEventListener('visibilitychange', this.boundHandleVisibility);
    document.addEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
    
    // Add device motion for tilt-based encouragement
    if (window.DeviceOrientationEvent && this.detectMobileDevice()) {
      this.initializeDeviceMotion();
    }
    
    // Initialize animation particles
    this.initializeParticles();
  }

  /**
   * Clean up listeners and resources.
   */
  destroy() {
    if (this.startButton) {
      this.startButton.removeEventListener('click', this.boundHandleOverlayStart);
    }

    window.removeEventListener('orientationchange', this.boundEvaluateOrientation);
    window.removeEventListener('resize', this.boundEvaluateOrientation);

    if (window.screen && window.screen.orientation && window.screen.orientation.removeEventListener) {
      window.screen.orientation.removeEventListener('change', this.boundEvaluateOrientation);
    }

    document.removeEventListener('visibilitychange', this.boundHandleVisibility);
    document.removeEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);

    if (this.orientationChangeTimer) {
      clearTimeout(this.orientationChangeTimer);
      this.orientationChangeTimer = null;
    }
    
    // Release wake lock
    this.releaseWakeLock();
  }

  /**
   * Request that the game starts once orientation requirements are satisfied.
   * @param {Function} startCallback - Invoked when landscape orientation is confirmed.
   */
  requestStart(startCallback) {
    if (typeof startCallback !== 'function') {
      return;
    }

    if (!this.detectMobileDevice()) {
      startCallback();
      return;
    }

    this.pendingStartCallback = startCallback;

    if (this.isInLandscapeOrientation()) {
      this.hideOverlay();
      this.executePendingStart();
    } else {
      this.showOverlay();
    }
  }

  /**
   * Force an orientation evaluation after a short debounce window.
   */
  queueOrientationEvaluation() {
    if (this.orientationChangeTimer) {
      clearTimeout(this.orientationChangeTimer);
    }

    this.orientationChangeTimer = setTimeout(() => {
      this.orientationChangeTimer = null;
      this.evaluateOrientation();
    }, 100);
  }

  /**
   * Evaluate orientation state and act on overlays/pending start callbacks.
   */
  evaluateOrientation() {
    const isMobile = this.detectMobileDevice();
    const isLandscape = this.isInLandscapeOrientation();

    this.onOrientationChange(isLandscape);

    if (!isMobile) {
      this.hideOverlay();
      this.executePendingStart();
      return;
    }

    if (isLandscape) {
      this.hideOverlay();
      this.executePendingStart();
    } else {
      this.showOverlay();
    }
  }

  /**
   * Determine whether the current viewport is landscape.
   * @returns {boolean}
   */
  isInLandscapeOrientation() {
    return window.innerWidth >= window.innerHeight;
  }

  /**
   * Handle visibility changes to re-check orientation when returning to the tab.
   */
  handleVisibilityChange() {
    if (!document.hidden) {
      this.queueOrientationEvaluation();
    }
  }

  /**
   * Show the orientation overlay and pause gameplay if needed.
   */
  showOverlay() {
    if (!this.overlayElement) {
      return;
    }

    this.overlayElement.style.display = 'flex';
    document.body.classList.add('orientation-overlay-active');

    if (!this.wasPausedForOverlay) {
      this.onPauseForOverlay();
      this.wasPausedForOverlay = true;
    }
  }

  /**
   * Hide the orientation overlay and resume gameplay if we previously paused it.
   */
  hideOverlay() {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none';
    }

    document.body.classList.remove('orientation-overlay-active');

    if (this.wasPausedForOverlay) {
      this.onResumeFromOverlay();
      this.wasPausedForOverlay = false;
    }
  }

  /**
   * Handle clicks on the overlay start button.
   */
  handleOverlayStartClick() {
    this.requestFullscreenAndOrientationLock();
    this.hideOverlay();
    this.executePendingStart();
  }

  /**
   * Request fullscreen and lock orientation to landscape on mobile devices.
   * This provides the best immersive experience for mobile gameplay.
   */
  async requestFullscreenAndOrientationLock() {
    // First, request fullscreen if on mobile
    if (this.detectMobileDevice()) {
      try {
        const element = document.documentElement;
        
        // Try different fullscreen API methods for cross-browser compatibility
        if (element.requestFullscreen) {
          await element.requestFullscreen({ navigationUI: 'hide' });
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        
        console.log('✅ Entered fullscreen mode');
      } catch (error) {
        console.warn('⚠️ Could not enter fullscreen:', error.message);
        // Continue even if fullscreen fails
      }
    }
    
    // Then lock orientation to landscape
    this.requestOrientationLock();
  }

  /**
   * Attempt to lock the screen orientation to landscape when supported.
   */
  requestOrientationLock() {
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock('landscape').catch((error) => {
        console.warn('⚠️ Could not lock orientation:', error.message);
        // Many browsers will reject this; failure is acceptable.
      });
    }
  }

  /**
   * Execute the pending start callback, if any.
   */
  executePendingStart() {
    if (!this.pendingStartCallback) {
      return;
    }

    const callback = this.pendingStartCallback;
    this.pendingStartCallback = null;
    
    // Show celebration animation before starting
    if (!this.celebrationShown) {
      this.showCelebrationAnimation();
      this.celebrationShown = true;
    }
    
    callback();
  }
  
  /**
   * Handle button touch start with haptic feedback
   */
  handleButtonTouchStart(event) {
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
    
    // Add pressed visual state
    if (this.startButton) {
      this.startButton.classList.add('pressed');
      this.createRippleEffect(event);
    }
  }
  
  /**
   * Handle button touch end
   */
  handleButtonTouchEnd(event) {
    // Remove pressed visual state
    if (this.startButton) {
      this.startButton.classList.remove('pressed');
    }
  }
  
  /**
   * Trigger haptic feedback if available
   */
  triggerHapticFeedback(intensity = 'medium') {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10, 50, 10],
      celebration: [20, 50, 20, 50, 20, 50, 20]
    };
    
    navigator.vibrate(patterns[intensity] || patterns.medium);
  }
  
  /**
   * Create ripple effect on button press
   */
  createRippleEffect(event) {
    if (!this.startButton) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    
    const rect = this.startButton.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.touches ? event.touches[0].clientX - rect.left : rect.width / 2;
    const y = event.touches ? event.touches[0].clientY - rect.top : rect.height / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x - size / 2 + 'px';
    ripple.style.top = y - size / 2 + 'px';
    
    this.startButton.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  /**
   * Show celebration animation when transitioning to landscape
   */
  showCelebrationAnimation() {
    if (!this.overlayElement) return;
    
    const celebration = document.createElement('div');
    celebration.className = 'celebration-animation';
    celebration.innerHTML = '🎉✨🎮✨🎉';
    
    this.overlayElement.appendChild(celebration);
    this.triggerHapticFeedback('celebration');
    
    // Add success checkmark
    this.showSuccessCheckmark();
    
    setTimeout(() => {
      celebration.classList.add('fade-out');
      setTimeout(() => celebration.remove(), 300);
    }, 1500);
  }
  
  /**
   * Show success checkmark animation
   */
  showSuccessCheckmark() {
    const checkmark = document.createElement('div');
    checkmark.className = 'success-checkmark show';
    checkmark.innerHTML = `
      <svg viewBox="0 0 100 100">
        <path d="M20,50 L40,70 L80,30" stroke="#4ade80" stroke-width="8" fill="none" />
      </svg>
    `;
    document.body.appendChild(checkmark);
    
    setTimeout(() => {
      checkmark.classList.remove('show');
      setTimeout(() => checkmark.remove(), 500);
    }, 1500);
  }
  
  /**
   * Initialize device motion for tilt detection
   */
  initializeDeviceMotion() {
    let lastAlpha = null;
    
    window.addEventListener('deviceorientation', (event) => {
      if (!this.overlayElement || this.overlayElement.style.display === 'none') return;
      
      const alpha = event.alpha; // Rotation around z-axis
      if (lastAlpha !== null && Math.abs(alpha - lastAlpha) > 20) {
        // User is rotating device - add encouragement animation
        this.addEncouragementPulse();
      }
      lastAlpha = alpha;
    }, { passive: true });
  }
  
  /**
   * Add encouraging pulse animation when user rotates device
   */
  addEncouragementPulse() {
    const rotationIcon = this.overlayElement?.querySelector('.rotation-icon');
    if (!rotationIcon) return;
    
    rotationIcon.classList.remove('pulse-encourage');
    // Force reflow to restart animation
    void rotationIcon.offsetWidth;
    rotationIcon.classList.add('pulse-encourage');
    
    setTimeout(() => {
      rotationIcon.classList.remove('pulse-encourage');
    }, 600);
  }
  
  /**
   * Initialize floating particles in overlay
   */
  initializeParticles() {
    if (!this.overlayElement) return;
    
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles-container';
    
    // Create floating particle elements
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.animationDuration = (5 + Math.random() * 5) + 's';
      particlesContainer.appendChild(particle);
    }
    
    this.overlayElement.appendChild(particlesContainer);
  }
  
  /**
   * Handle fullscreen change events
   */
  handleFullscreenChange() {
    this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    
    if (this.isFullscreen) {
      console.log('✅ Entered fullscreen mode');
      // Request wake lock when entering fullscreen
      this.requestWakeLock();
    } else {
      console.log('📱 Exited fullscreen mode');
      this.releaseWakeLock();
    }
  }
  
  /**
   * Request wake lock to prevent screen from sleeping during gameplay
   */
  async requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      console.log('⚠️ Wake Lock API not supported');
      return;
    }
    
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('✅ Wake lock activated - screen will stay on');
      
      // Re-acquire wake lock if visibility changes
      this.wakeLock.addEventListener('release', () => {
        console.log('📱 Wake lock released');
      });
    } catch (error) {
      console.warn('⚠️ Could not acquire wake lock:', error.message);
    }
  }
  
  /**
   * Release wake lock
   */
  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (error) {
        console.warn('⚠️ Error releasing wake lock:', error.message);
      }
    }
  }
}

function defaultDetectMobileDevice() {
  const userAgent = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const hasTouch = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 2;
  const smallViewport = window.innerWidth <= 768;
  const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/;
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/;

  return mobileRegex.test(userAgent) || tabletRegex.test(userAgent) || hasTouch || smallViewport;
}

export default OrientationManager;
