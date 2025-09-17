/**
 * Will-Change Optimizer - Manages CSS will-change property dynamically
 * Reduces memory consumption by only applying will-change when needed
 */

export class WillChangeOptimizer {
  constructor() {
    this.activeElements = new Set();
    this.transformingElements = new Map();
    // More conservative budget - browser limit is typically 3x surface area
    // Using 1079808px as mentioned in the error, with 70% safety margin
    this.memoryBudget = 323942; // Conservative budget for will-change (30% of limit)
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
      // Try to free up some memory by disabling oldest elements
      this.cleanupOldestElements();
      
      // Check again after cleanup
      if (this.currentUsage + memoryImpact > this.memoryBudget) {
        // Silently skip optimization to avoid console spam
        return;
      }
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
   * Cleanup oldest elements to free memory
   */
  cleanupOldestElements() {
    const elementsToCleanup = Math.min(3, Math.floor(this.activeElements.size / 2));
    let cleaned = 0;
    
    for (const element of this.activeElements) {
      if (cleaned >= elementsToCleanup) break;
      
      // Disable will-change for this element
      if (element && element.style) {
        element.style.willChange = 'auto';
        this.activeElements.delete(element);
        
        // Calculate memory freed
        const rect = element.getBoundingClientRect();
        const memoryFreed = rect.width * rect.height;
        this.currentUsage = Math.max(0, this.currentUsage - memoryFreed);
        
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} will-change elements to free memory`);
    }
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
