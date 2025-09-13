/**
 * Will-Change Optimizer - Manages CSS will-change property dynamically
 * Reduces memory consumption by only applying will-change when needed
 */

export class WillChangeOptimizer {
  constructor() {
    this.activeElements = new Set();
    this.transformingElements = new Map();
    this.memoryBudget = 783360; // Browser memory budget for will-change
    this.currentUsage = 0;
    
    // Performance monitoring
    this.metrics = {
      elementsOptimized: 0,
      memoryReduced: 0,
      activationsThisFrame: 0
    };
    
    console.log('🎨 Will-change optimizer initialized');
  }
  
  /**
   * Enable will-change for an element when it starts transforming
   */
  enableWillChange(element, properties = 'transform') {
    if (!element || this.activeElements.has(element)) {
      return;
    }
    
    // Calculate memory impact
    const rect = element.getBoundingClientRect();
    const memoryImpact = rect.width * rect.height;
    
    // Check if we're within budget
    if (this.currentUsage + memoryImpact > this.memoryBudget) {
      console.warn('⚠️ Will-change budget exceeded, skipping optimization');
      return;
    }
    
    element.style.willChange = properties;
    this.activeElements.add(element);
    this.currentUsage += memoryImpact;
    this.metrics.activationsThisFrame++;
    
    // Auto-disable after a timeout if not manually disabled
    const timeoutId = setTimeout(() => {
      this.disableWillChange(element);
    }, 1000); // 1 second timeout
    
    this.transformingElements.set(element, timeoutId);
  }
  
  /**
   * Disable will-change for an element when transformation ends
   */
  disableWillChange(element) {
    if (!element || !this.activeElements.has(element)) {
      return;
    }
    
    // Clear timeout if exists
    const timeoutId = this.transformingElements.get(element);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.transformingElements.delete(element);
    }
    
    // Calculate memory freed
    const rect = element.getBoundingClientRect();
    const memoryFreed = rect.width * rect.height;
    
    element.style.willChange = 'auto';
    this.activeElements.delete(element);
    this.currentUsage = Math.max(0, this.currentUsage - memoryFreed);
    this.metrics.elementsOptimized++;
    this.metrics.memoryReduced += memoryFreed;
  }
  
  /**
   * Optimize canvas element will-change based on camera movement
   */
  optimizeCanvas(canvas, isMoving) {
    if (isMoving) {
      this.enableWillChange(canvas, 'transform');
    } else {
      // Delay disabling to avoid flickering
      setTimeout(() => {
        if (!this.isCameraMoving(canvas)) {
          this.disableWillChange(canvas);
        }
      }, 100);
    }
  }
  
  /**
   * Optimize player elements based on movement
   */
  optimizePlayer(playerElement, isMoving) {
    if (isMoving) {
      this.enableWillChange(playerElement, 'transform');
    } else {
      // Disable after movement stops
      setTimeout(() => {
        this.disableWillChange(playerElement);
      }, 50);
    }
  }
  
  /**
   * Check if camera is currently moving (heuristic)
   */
  isCameraMoving(canvas) {
    const transform = canvas.style.transform;
    // Store previous transform to detect changes
    if (!this.previousTransform) {
      this.previousTransform = transform;
      return false;
    }
    
    const isMoving = this.previousTransform !== transform;
    this.previousTransform = transform;
    return isMoving;
  }
  
  /**
   * Emergency cleanup - disable all will-change properties
   */
  emergencyCleanup() {
    console.warn('🚨 Emergency will-change cleanup triggered');
    
    this.activeElements.forEach(element => {
      if (element && element.style) {
        element.style.willChange = 'auto';
      }
    });
    
    this.transformingElements.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    
    this.activeElements.clear();
    this.transformingElements.clear();
    this.currentUsage = 0;
    
    console.log('✅ Emergency cleanup completed');
  }
  
  /**
   * Get current optimization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeElements: this.activeElements.size,
      currentMemoryUsage: this.currentUsage,
      memoryBudget: this.memoryBudget,
      memoryUtilization: (this.currentUsage / this.memoryBudget * 100).toFixed(1) + '%'
    };
  }
  
  /**
   * Reset frame metrics
   */
  resetFrameMetrics() {
    this.metrics.activationsThisFrame = 0;
  }
}

// Global instance
export const globalWillChangeOptimizer = new WillChangeOptimizer();

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
  globalWillChangeOptimizer.emergencyCleanup();
});
