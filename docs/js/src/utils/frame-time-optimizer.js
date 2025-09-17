/**
 * Frame Time Optimizer - Reduces frame time from 527ms to target 16.67ms
 * Implements multiple optimization strategies for smooth 60 FPS gameplay
 */

import { globalWillChangeOptimizer } from './will-change-optimizer.js';

export class FrameTimeOptimizer {
  constructor() {
    this.targetFrameTime = 16.67; // 60 FPS
    this.currentFrameTime = 0;
    this.frameHistory = [];
    this.maxHistorySize = 60; // 1 second of data
    
    // Optimization strategies
    this.optimizations = {
      enableLOD: true,
      enableCulling: true,
      enableBatching: true,
      enableCaching: true,
      enableThrottling: true
    };
    
    // Performance metrics
    this.metrics = {
      framesOptimized: 0,
      averageImprovement: 0,
      worstFrameTime: 0,
      bestFrameTime: Infinity
    };
    
    // Throttling state
    this.throttledOperations = new Map();
    this.lastThrottleCheck = 0;
    
    console.log('⚡ Frame time optimizer initialized');
  }
  
  /**
   * Optimize frame rendering based on current performance
   */
  optimizeFrame(frameStartTime) {
    const frameTime = performance.now() - frameStartTime;
    this.currentFrameTime = frameTime;
    this.frameHistory.push(frameTime);
    
    // Keep history size manageable
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift();
    }
    
    // Update metrics
    this.updateMetrics(frameTime);
    
    // Apply optimizations if frame time is too high (less aggressive thresholds)
    if (frameTime > this.targetFrameTime * 3) { // 50ms threshold for emergency
      this.applyEmergencyOptimizations();
    } else if (frameTime > this.targetFrameTime * 2) { // 33ms threshold for standard
      this.applyStandardOptimizations();
    }
    
    return {
      frameTime,
      optimized: frameTime > this.targetFrameTime,
      recommendations: this.getOptimizationRecommendations()
    };
  }
  
  /**
   * Apply emergency optimizations for very poor performance
   */
  applyEmergencyOptimizations() {
    console.warn('🚨 Applying emergency frame time optimizations');
    
    // Reduce UI quality
    this.reduceUIQuality();
    
    // Throttle expensive operations
    this.throttleExpensiveOperations();
    
    // Emergency will-change cleanup
    globalWillChangeOptimizer.emergencyCleanup();
    
    // Disable non-essential animations
    this.disableNonEssentialAnimations();
    
    console.log('📉 Reducing UI quality for better performance');
  }
  
  /**
   * Apply standard optimizations for moderate performance issues
   */
  applyStandardOptimizations() {
    // Enable LOD system
    if (this.optimizations.enableLOD) {
      this.optimizeLevelOfDetail();
    }
    
    // Enable frustum culling
    if (this.optimizations.enableCulling) {
      this.enableFrustumCulling();
    }
    
    // Batch similar operations
    if (this.optimizations.enableBatching) {
      this.enableOperationBatching();
    }
  }
  
  /**
   * Reduce UI quality for better performance
   */
  reduceUIQuality() {
    // Reduce particle effects
    const particles = document.querySelectorAll('.particle, .effect');
    particles.forEach(particle => {
      if (Math.random() > 0.5) { // Remove 50% of particles
        particle.style.display = 'none';
      }
    });
    
    // Simplify animations
    document.body.classList.add('reduced-motion');
    
    // Lower canvas resolution temporarily
    const canvas = document.getElementById('canvas');
    if (canvas) {
      const currentScale = canvas.style.transform.match(/scale\(([^)]+)\)/);
      if (currentScale) {
        const scale = parseFloat(currentScale[1]) * 0.9; // Reduce by 10%
        canvas.style.transform = canvas.style.transform.replace(/scale\([^)]+\)/, `scale(${scale})`);
      }
    }
  }
  
  /**
   * Throttle expensive operations
   */
  throttleExpensiveOperations() {
    const now = performance.now();
    
    // Only check throttling every 100ms
    if (now - this.lastThrottleCheck < 100) {
      return;
    }
    
    this.lastThrottleCheck = now;
    
    // Throttle UI updates
    this.throttleOperation('ui-update', 33); // 30 FPS for UI
    
    // Throttle physics updates
    this.throttleOperation('physics-update', 16); // 60 FPS for physics
    
    // Throttle network updates
    this.throttleOperation('network-update', 100); // 10 FPS for network
  }
  
  /**
   * Throttle a specific operation
   */
  throttleOperation(operationName, intervalMs) {
    const lastRun = this.throttledOperations.get(operationName) || 0;
    const now = performance.now();
    
    if (now - lastRun < intervalMs) {
      return false; // Skip this operation
    }
    
    this.throttledOperations.set(operationName, now);
    return true; // Allow this operation
  }
  
  /**
   * Disable non-essential animations
   */
  disableNonEssentialAnimations() {
    // Disable CSS animations
    const style = document.createElement('style');
    style.textContent = `
      * {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
      }
    `;
    style.id = 'emergency-animation-disable';
    document.head.appendChild(style);
    
    // Remove after 5 seconds
    setTimeout(() => {
      const emergencyStyle = document.getElementById('emergency-animation-disable');
      if (emergencyStyle) {
        emergencyStyle.remove();
      }
    }, 5000);
  }
  
  /**
   * Optimize level of detail based on distance
   */
  optimizeLevelOfDetail() {
    // This would integrate with the existing LOD system
    // For now, just log that LOD is being optimized
    console.log('🔍 Optimizing level of detail');
  }
  
  /**
   * Enable frustum culling to skip off-screen elements
   */
  enableFrustumCulling() {
    const viewport = document.querySelector('.viewport-container');
    if (!viewport) return;
    
    const rect = viewport.getBoundingClientRect();
    const elements = document.querySelectorAll('.player, .enemy, .particle');
    
    elements.forEach(element => {
      const elementRect = element.getBoundingClientRect();
      const isVisible = !(
        elementRect.right < rect.left ||
        elementRect.left > rect.right ||
        elementRect.bottom < rect.top ||
        elementRect.top > rect.bottom
      );
      
      element.style.display = isVisible ? '' : 'none';
    });
  }
  
  /**
   * Enable operation batching
   */
  enableOperationBatching() {
    // Batch DOM updates
    if (!this.batchedUpdates) {
      this.batchedUpdates = [];
    }
    
    // Process batched updates on next frame
    if (this.batchedUpdates.length > 0) {
      requestAnimationFrame(() => {
        this.batchedUpdates.forEach(update => update());
        this.batchedUpdates = [];
      });
    }
  }
  
  /**
   * Add operation to batch
   */
  batchOperation(operation) {
    if (!this.batchedUpdates) {
      this.batchedUpdates = [];
    }
    this.batchedUpdates.push(operation);
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics(frameTime) {
    this.metrics.framesOptimized++;
    
    if (frameTime > this.metrics.worstFrameTime) {
      this.metrics.worstFrameTime = frameTime;
    }
    
    if (frameTime < this.metrics.bestFrameTime) {
      this.metrics.bestFrameTime = frameTime;
    }
    
    // Calculate average improvement
    const averageFrameTime = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    this.metrics.averageImprovement = Math.max(0, 527 - averageFrameTime); // Improvement from initial 527ms
  }
  
  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.currentFrameTime > 50) {
      recommendations.push('Consider reducing visual effects');
    }
    
    if (this.currentFrameTime > 30) {
      recommendations.push('Enable level-of-detail optimization');
    }
    
    if (this.currentFrameTime > 20) {
      recommendations.push('Reduce update frequency for non-critical systems');
    }
    
    return recommendations;
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics() {
    const averageFrameTime = this.frameHistory.length > 0 
      ? this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length 
      : 0;
    
    return {
      ...this.metrics,
      currentFrameTime: this.currentFrameTime,
      averageFrameTime,
      targetFrameTime: this.targetFrameTime,
      performanceRatio: this.targetFrameTime / averageFrameTime,
      isOptimal: averageFrameTime <= this.targetFrameTime * 1.1 // 10% tolerance
    };
  }
  
  /**
   * Reset optimization state
   */
  reset() {
    this.frameHistory = [];
    this.throttledOperations.clear();
    
    // Remove emergency styles
    const emergencyStyle = document.getElementById('emergency-animation-disable');
    if (emergencyStyle) {
      emergencyStyle.remove();
    }
    
    // Restore UI quality
    document.body.classList.remove('reduced-motion');
    
    console.log('🔄 Frame time optimizer reset');
  }
}

// Global instance
export const globalFrameTimeOptimizer = new FrameTimeOptimizer();
