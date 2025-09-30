/**
 * VFX Manager - Coordinates visual effects for abilities
 * Provides unified interface for particles, camera effects, and other VFX
 */

import { ParticleSystem } from '../../utils/particle-system.js';
import { CameraEffects } from '../../utils/camera-effects.js';

export class VFXManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Initialize particle system
        this.particles = new ParticleSystem();
        
        // Initialize camera effects
        this.camera = new CameraEffects(canvas);
        
        console.log('✨ VFX Manager initialized');
    }
    
    /**
     * Update all VFX systems
     * @param {number} deltaTime - Delta time in seconds
     */
    update(deltaTime) {
        if (this.particles) {
            this.particles.update(deltaTime);
        }
        
        if (this.camera) {
            this.camera.update(deltaTime);
        }
    }
    
    /**
     * Render all VFX systems
     * @param {CanvasRenderingContext2D} ctx - Canvas context (optional, uses own context if not provided)
     * @param {Object} cameraState - Camera state for coordinate transformation
     */
    render(ctx, cameraState) {
        // Use provided context or fall back to our own
        const renderCtx = ctx || this.ctx;
        
        if (!renderCtx) {
            console.warn('VFXManager: No valid rendering context available');
            return;
        }
        
        // Apply camera pre-render transformations
        if (this.camera) {
            this.camera.preRender(renderCtx);
        }
        
        // Render particles
        if (this.particles) {
            this.particles.render(renderCtx);
        }
        
        // Apply camera post-render effects
        if (this.camera) {
            this.camera.postRender(renderCtx);
        }
    }
    
    /**
     * Clear all active effects
     */
    clear() {
        if (this.particles) {
            this.particles.clear();
        }
        
        if (this.camera) {
            this.camera.shakeIntensity = 0;
            this.camera.targetZoom = 1.0;
        }
    }
}

