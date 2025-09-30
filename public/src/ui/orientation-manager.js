/**
 * OrientationManager coordinates the mobile orientation overlay and start gating.
 * It ensures the game only starts when devices that require landscape orientation
 * are correctly aligned, pausing and resuming the game loop as needed.
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

    this.boundEvaluateOrientation = this.queueOrientationEvaluation.bind(this);
    this.boundHandleVisibility = this.handleVisibilityChange.bind(this);
    this.boundHandleOverlayStart = this.handleOverlayStartClick.bind(this);
  }

  /**
   * Prepare DOM references and attach listeners.
   */
  initialize() {
    this.overlayElement = document.getElementById(this.overlayId);
    this.startButton = document.getElementById(this.overlayStartButtonId);

    if (this.startButton) {
      this.startButton.addEventListener('click', this.boundHandleOverlayStart);
    }

    window.addEventListener('orientationchange', this.boundEvaluateOrientation);
    window.addEventListener('resize', this.boundEvaluateOrientation);

    if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
      window.screen.orientation.addEventListener('change', this.boundEvaluateOrientation);
    }

    document.addEventListener('visibilitychange', this.boundHandleVisibility);
  }

  /**
   * Clean up listeners.
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

    if (this.orientationChangeTimer) {
      clearTimeout(this.orientationChangeTimer);
      this.orientationChangeTimer = null;
    }
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
    callback();
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
