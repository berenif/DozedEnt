export function setupOrientation(OrientationManager) {
  const orientationManager = new OrientationManager({
    detectMobileDevice: () => {
      const userAgent = (navigator.userAgent || '').toLowerCase();
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const smallViewport = window.innerWidth <= 768;
      const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|ipad|tablet/;
      return mobileRegex.test(userAgent) || hasTouch || smallViewport;
    },
    onOrientationChange: (isLandscape) => {
      console.log('[Orientation] changed:', isLandscape ? 'landscape' : 'portrait');
    }
  });

  orientationManager.initialize();

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'flex';
      console.log('Mobile controls enabled');
    }

    orientationManager.evaluateOrientation();
  }

  return orientationManager;
}
