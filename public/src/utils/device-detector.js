/**
 * Device Detector Utility
 * Robust device detection for desktop vs mobile/touch devices
 * Following modular design principles
 */

export class DeviceDetector {
    constructor() {
        this.deviceInfo = this.detectDevice();
    }

    /**
     * Comprehensive device detection
     * @returns {Object} Device information
     */
    detectDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
        const platform = navigator.platform || '';

        // Check for touch capability
        const hasTouch = this.hasTouchCapability();

        // Check for mobile/tablet user agents
        const isMobileUA = this.isMobileUserAgent(userAgent);
        const isTabletUA = this.isTabletUserAgent(userAgent);

        // Check viewport size
        const isSmallViewport = window.innerWidth <= 768;

        // Check pointer type (fine = mouse, coarse = touch)
        const hasCoarsePointer = this.hasCoarsePointer();
        const hasFinePointer = this.hasFinePointer();

        // Determine device type with priority logic
        const isMobile = isMobileUA && !isTabletUA;
        const isTablet = isTabletUA;
        const isDesktop = !isMobile && !isTablet && !hasCoarsePointer && hasFinePointer;

        // Determine primary input method
        let primaryInput = 'unknown';
        if (isDesktop) {
            primaryInput = 'keyboard-mouse';
        } else if (hasTouch) {
            primaryInput = 'touch';
        }

        return {
            // Device type
            isMobile,
            isTablet,
            isDesktop,

            // Input capabilities
            hasTouch,
            hasKeyboard: !isMobile || isTablet,
            hasMouse: hasFinePointer,
            hasGamepad: 'getGamepads' in navigator,

            // Pointer precision
            hasCoarsePointer,
            hasFinePointer,

            // Primary input method
            primaryInput,

            // Viewport
            isSmallViewport,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,

            // Platform info
            platform,
            userAgent,

            // OS Detection
            isIOS: this.isIOS(userAgent, platform),
            isAndroid: this.isAndroid(userAgent),
            isWindows: this.isWindows(platform),
            isMac: this.isMac(platform),
            isLinux: this.isLinux(platform),

            // Browser
            browser: this.detectBrowser(userAgent)
        };
    }

    /**
     * Check for touch capability
     */
    hasTouchCapability() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    /**
     * Check for coarse pointer (touch/stylus)
     */
    hasCoarsePointer() {
        return window.matchMedia('(pointer: coarse)').matches;
    }

    /**
     * Check for fine pointer (mouse/trackpad)
     */
    hasFinePointer() {
        return window.matchMedia('(pointer: fine)').matches;
    }

    /**
     * Check if mobile user agent
     */
    isMobileUserAgent(userAgent) {
        const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile/i;
        return mobileRegex.test(userAgent);
    }

    /**
     * Check if tablet user agent
     */
    isTabletUserAgent(userAgent) {
        const tabletRegex = /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i;
        return tabletRegex.test(userAgent);
    }

    /**
     * Check if iOS device
     */
    isIOS(userAgent, platform) {
        return /iPad|iPhone|iPod/.test(platform) || 
               (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    /**
     * Check if Android device
     */
    isAndroid(userAgent) {
        return /android/i.test(userAgent);
    }

    /**
     * Check if Windows platform
     */
    isWindows(platform) {
        return /win/i.test(platform);
    }

    /**
     * Check if Mac platform
     */
    isMac(platform) {
        return /mac/i.test(platform) && navigator.maxTouchPoints <= 1;
    }

    /**
     * Check if Linux platform
     */
    isLinux(platform) {
        return /linux/i.test(platform) && !/android/i.test(navigator.userAgent);
    }

    /**
     * Detect browser
     */
    detectBrowser(userAgent) {
        if (/edg/i.test(userAgent)) {
            return 'edge';
        }
        if (/chrome|crios|crmo/i.test(userAgent)) {
            return 'chrome';
        }
        if (/firefox|fxios/i.test(userAgent)) {
            return 'firefox';
        }
        if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
            return 'safari';
        }
        if (/opr\//i.test(userAgent)) {
            return 'opera';
        }
        return 'unknown';
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        return this.deviceInfo;
    }

    /**
     * Check if should show mobile controls
     */
    shouldShowMobileControls() {
        return this.deviceInfo.primaryInput === 'touch' || 
               this.deviceInfo.isMobile || 
               (this.deviceInfo.isTablet && this.deviceInfo.hasTouch);
    }

    /**
     * Check if should show desktop controls
     */
    shouldShowDesktopControls() {
        return this.deviceInfo.primaryInput === 'keyboard-mouse' || 
               this.deviceInfo.isDesktop;
    }

    /**
     * Log device info for debugging
     */
    logDeviceInfo() {
        console.group('🔍 Device Detection');
        console.log('Device Type:', {
            Mobile: this.deviceInfo.isMobile,
            Tablet: this.deviceInfo.isTablet,
            Desktop: this.deviceInfo.isDesktop
        });
        console.log('Input Methods:', {
            Touch: this.deviceInfo.hasTouch,
            Keyboard: this.deviceInfo.hasKeyboard,
            Mouse: this.deviceInfo.hasMouse,
            Gamepad: this.deviceInfo.hasGamepad
        });
        console.log('Primary Input:', this.deviceInfo.primaryInput);
        console.log('Pointer Type:', {
            Coarse: this.deviceInfo.hasCoarsePointer,
            Fine: this.deviceInfo.hasFinePointer
        });
        console.log('Platform:', this.deviceInfo.platform);
        console.log('Browser:', this.deviceInfo.browser);
        console.log('Viewport:', `${this.deviceInfo.viewportWidth}x${this.deviceInfo.viewportHeight}`);
        console.log('Show Mobile Controls:', this.shouldShowMobileControls());
        console.log('Show Desktop Controls:', this.shouldShowDesktopControls());
        console.groupEnd();
    }

    /**
     * Listen for device changes (orientation, resize)
     */
    onDeviceChange(callback) {
        const handleChange = () => {
            this.deviceInfo = this.detectDevice();
            callback(this.deviceInfo);
        };

        window.addEventListener('resize', handleChange);
        window.addEventListener('orientationchange', handleChange);

        // Return cleanup function
        return () => {
            window.removeEventListener('resize', handleChange);
            window.removeEventListener('orientationchange', handleChange);
        };
    }
}

// Export singleton instance
export const deviceDetector = new DeviceDetector();

export default DeviceDetector;

