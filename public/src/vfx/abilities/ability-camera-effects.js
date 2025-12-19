/**
 * AbilityCameraEffects - Camera effects for abilities
 * Provides:
 * - Screen shake
 * - Zoom effects
 * - Motion blur (future)
 * - Slow motion (future)
 */

export class AbilityCameraEffects {
    constructor(camera) {
        this.camera = camera;
        
        // Shake state
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
        
        // Zoom state
        this.targetZoom = 1.0;
        this.zoomDuration = 0;
        this.zoomProgress = 0;
        this.originalZoom = 1.0;
    }
    
    /**
     * Add camera shake
     * @param {number} intensity - Shake strength (pixels)
     * @param {number} duration - Shake duration (seconds)
     */
    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }
    
    /**
     * Zoom camera
     * @param {number} targetZoom - Target zoom level
     * @param {number} duration - Zoom duration (seconds)
     */
    zoom(targetZoom, duration) {
        this.originalZoom = this.camera.scale;
        this.targetZoom = targetZoom;
        this.zoomDuration = duration;
        this.zoomProgress = 0;
    }
    
    /**
     * Update effects
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.updateShake(deltaTime);
        this.updateZoom(deltaTime);
    }
    
    /**
     * Update shake effect
     */
    updateShake(deltaTime) {
        if (this.shakeDuration <= 0) {
            this.shakeIntensity = 0;
            this.shakeOffset = { x: 0, y: 0 };
            return;
        }
        
        this.shakeDuration -= deltaTime;
        
        // Calculate shake offset
        const intensity = this.shakeIntensity * (this.shakeDuration / 0.3);
        this.shakeOffset.x = (Math.random() - 0.5) * 2 * intensity;
        this.shakeOffset.y = (Math.random() - 0.5) * 2 * intensity;
        
        // Apply to camera
        if (this.camera) {
            this.camera.shakeX = this.shakeOffset.x;
            this.camera.shakeY = this.shakeOffset.y;
        }
    }
    
    /**
     * Update zoom effect
     */
    updateZoom(deltaTime) {
        if (this.zoomProgress >= this.zoomDuration) {
            return;
        }
        
        this.zoomProgress += deltaTime;
        const t = Math.min(1.0, this.zoomProgress / this.zoomDuration);
        
        // Ease out zoom
        const easedT = 1 - (1 - t)**3;
        const newZoom = this.originalZoom + (this.targetZoom - this.originalZoom) * easedT;
        
        if (this.camera) {
            this.camera.scale = newZoom;
        }
    }
    
    /**
     * Reset all effects
     */
    reset() {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.zoomProgress = this.zoomDuration;
        
        if (this.camera) {
            this.camera.shakeX = 0;
            this.camera.shakeY = 0;
        }
    }
}

