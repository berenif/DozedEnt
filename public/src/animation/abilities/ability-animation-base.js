/**
 * AbilityAnimationBase - Base class for ability animations
 * Provides common functionality:
 * - Animation state management
 * - Timing utilities
 * - Transform calculations
 * - VFX integration
 */

export class AbilityAnimationBase {
    constructor(characterAnimator, vfxManager) {
        this.animator = characterAnimator;
        this.vfx = vfxManager;
        
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.loops = false;
    }
    
    /**
     * Play animation
     * @param {string} animationName - Animation to play
     * @param {number} duration - Animation duration (seconds)
     * @param {boolean} loop - Should animation loop
     */
    play(animationName, duration = 0.6, loop = false) {
        this.isPlaying = true;
        this.currentTime = 0;
        this.duration = duration;
        this.loops = loop;
        
        // Trigger animation state change
        this.onAnimationStart(animationName);
    }
    
    /**
     * Stop animation
     */
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.onAnimationEnd();
    }
    
    /**
     * Update animation timing
     * @param {number} deltaTime - Time since last update (seconds)
     * @returns {number} Normalized time (0-1)
     */
    updateTiming(deltaTime) {
        if (!this.isPlaying) {
            return 0;
        }
        
        this.currentTime += deltaTime;
        
        if (this.currentTime >= this.duration) {
            if (this.loops) {
                this.currentTime = 0;
            } else {
                this.stop();
                return 1.0;
            }
        }
        
        return this.currentTime / this.duration;
    }
    
    /**
     * Lerp between values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Ease out cubic
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Ease in cubic
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeInCubic(t) {
        return t * t * t;
    }
    
    /**
     * Override: Called when animation starts
     */
    onAnimationStart(animationName) {
        // Override in subclass
    }
    
    /**
     * Override: Called when animation ends
     */
    onAnimationEnd() {
        // Override in subclass
    }
}

