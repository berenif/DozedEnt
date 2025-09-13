/**
 * Performance Integration - Coordinates all performance optimization systems
 * Provides a unified interface for managing frame time, will-change, and other optimizations
 */

import { globalFrameTimeOptimizer } from './frame-time-optimizer.js';
import { globalWillChangeOptimizer } from './will-change-optimizer.js';

export class PerformanceIntegration {
  constructor() {
    this.isEnabled = true;
    this.optimizers = {
      frameTime: globalFrameTimeOptimizer,
      willChange: globalWillChangeOptimizer
    };
    
    // Integration metrics
    this.metrics = {
      totalOptimizations: 0,
      performanceGain: 0,
      memoryReduced: 0
    };
    
    console.log('🚀 Performance integration system initialized');
  }
  
  /**
   * Initialize all performance systems
   */
  initialize() {
    // Set up canvas will-change optimization
    this.setupCanvasOptimization();
    
    // Set up player element optimization
    this.setupPlayerOptimization();
    
    // Set up automatic cleanup
    this.setupAutomaticCleanup();
    
    console.log('✅ Performance systems integrated');
  }
  
  /**
   * Setup canvas will-change optimization
   */
  setupCanvasOptimization() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    let isMoving = false;
    let lastTransform = canvas.style.transform;
    
    // Monitor canvas transform changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const currentTransform = canvas.style.transform;
          const nowMoving = currentTransform !== lastTransform;
          
          if (nowMoving !== isMoving) {
            isMoving = nowMoving;
            this.optimizers.willChange.optimizeCanvas(canvas, isMoving);
          }
          
          lastTransform = currentTransform;
        }
      });
    });
    
    observer.observe(canvas, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  /**
   * Setup player element optimization
   */
  setupPlayerOptimization() {
    // Monitor player elements for movement
    const checkPlayerMovement = () => {
      const players = document.querySelectorAll('.player');
      
      players.forEach(player => {
        const currentTransform = player.style.transform;
        const lastTransform = player.dataset.lastTransform || '';
        const isMoving = currentTransform !== lastTransform;
        
        this.optimizers.willChange.optimizePlayer(player, isMoving);
        player.dataset.lastTransform = currentTransform;
      });
    };
    
    // Check every 100ms
    setInterval(checkPlayerMovement, 100);
  }
  
  /**
   * Setup automatic cleanup
   */
  setupAutomaticCleanup() {
    // Clean up will-change properties every 5 seconds
    setInterval(() => {
      const metrics = this.optimizers.willChange.getMetrics();
      
      // If memory usage is high, trigger cleanup
      if (parseFloat(metrics.memoryUtilization) > 80) {
        console.warn('🧹 High memory usage detected, cleaning up will-change properties');
        this.optimizers.willChange.emergencyCleanup();
      }
    }, 5000);
  }
  
  /**
   * Get comprehensive performance metrics
   */
  getMetrics() {
    const frameTimeMetrics = this.optimizers.frameTime.getMetrics();
    const willChangeMetrics = this.optimizers.willChange.getMetrics();
    
    return {
      frameTime: frameTimeMetrics,
      willChange: willChangeMetrics,
      integration: this.metrics,
      overall: {
        isOptimal: frameTimeMetrics.isOptimal && parseFloat(willChangeMetrics.memoryUtilization) < 80,
        performanceScore: this.calculatePerformanceScore(frameTimeMetrics, willChangeMetrics)
      }
    };
  }
  
  /**
   * Calculate overall performance score (0-100)
   */
  calculatePerformanceScore(frameTimeMetrics, willChangeMetrics) {
    let score = 100;
    
    // Deduct points for poor frame time
    if (frameTimeMetrics.averageFrameTime > frameTimeMetrics.targetFrameTime) {
      const ratio = frameTimeMetrics.averageFrameTime / frameTimeMetrics.targetFrameTime;
      score -= Math.min(50, (ratio - 1) * 25);
    }
    
    // Deduct points for high memory usage
    const memoryUsage = parseFloat(willChangeMetrics.memoryUtilization);
    if (memoryUsage > 50) {
      score -= Math.min(30, (memoryUsage - 50) * 0.6);
    }
    
    return Math.max(0, Math.round(score));
  }
  
  /**
   * Emergency performance recovery
   */
  emergencyRecovery() {
    console.warn('🚨 Emergency performance recovery triggered');
    
    // Trigger all emergency optimizations
    this.optimizers.frameTime.applyEmergencyOptimizations();
    this.optimizers.willChange.emergencyCleanup();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('✅ Emergency recovery completed');
  }
  
  /**
   * Reset all performance systems
   */
  reset() {
    this.optimizers.frameTime.reset();
    this.optimizers.willChange.emergencyCleanup();
    
    this.metrics = {
      totalOptimizations: 0,
      performanceGain: 0,
      memoryReduced: 0
    };
    
    console.log('🔄 Performance systems reset');
  }
}

// Global instance
export const globalPerformanceIntegration = new PerformanceIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    globalPerformanceIntegration.initialize();
  });
} else {
  globalPerformanceIntegration.initialize();
}

// Expose to global scope for debugging
window.performanceIntegration = globalPerformanceIntegration;
