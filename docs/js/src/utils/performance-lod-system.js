/**
 * Level of Detail (LOD) System for Performance Optimization
 * Reduces rendering complexity for distant entities
 */

export class PerformanceLODSystem {
  constructor() {
    // LOD distance thresholds (in world units)
    this.LOD_THRESHOLDS = {
      FULL_DETAIL: 300,     // Full detail rendering
      REDUCED_DETAIL: 600,  // Reduced detail rendering
      MINIMAL_DETAIL: 1000, // Minimal detail rendering
      CULLED: 1500         // Don't render at all
    };
    
    // Performance targets
    this.TARGET_FRAME_TIME = 16.67; // 60 FPS
    this.MAX_ENTITIES_FULL_DETAIL = 20;
    this.MAX_ENTITIES_REDUCED_DETAIL = 50;
    
    // Adaptive performance tracking
    this.frameTimeHistory = [];
    this.maxHistorySize = 60; // 1 second at 60fps
    this.lastAdjustmentTime = 0;
    this.adjustmentCooldown = 1000; // 1 second
    
    // Current performance state
    this.currentQualityLevel = 1.0; // 0.0 to 1.0
    this.entityCounts = {
      fullDetail: 0,
      reducedDetail: 0,
      minimalDetail: 0,
      culled: 0
    };
  }

  /**
   * Update performance metrics and adjust quality if needed
   * @param {number} frameTime - Current frame time in ms
   */
  updatePerformanceMetrics(frameTime) {
    // Track frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }

    // Check if we need to adjust quality
    const now = performance.now();
    if (now - this.lastAdjustmentTime > this.adjustmentCooldown) {
      this.adjustQualityLevel();
      this.lastAdjustmentTime = now;
    }
  }

  /**
   * Automatically adjust quality level based on performance
   * @private
   */
  adjustQualityLevel() {
    if (this.frameTimeHistory.length < 30) return; // Need enough samples

    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
    const p95FrameTime = this.frameTimeHistory.sort((a, b) => a - b)[Math.floor(this.frameTimeHistory.length * 0.95)];

    // Adjust quality based on performance
    if (p95FrameTime > this.TARGET_FRAME_TIME * 1.5) {
      // Performance is poor, reduce quality
      this.currentQualityLevel = Math.max(0.3, this.currentQualityLevel - 0.1);
      console.log(`LOD: Reducing quality to ${(this.currentQualityLevel * 100).toFixed(0)}% (Frame time: ${p95FrameTime.toFixed(1)}ms)`);
    } else if (avgFrameTime < this.TARGET_FRAME_TIME * 0.8 && this.currentQualityLevel < 1.0) {
      // Performance is good, increase quality
      this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + 0.05);
      console.log(`LOD: Increasing quality to ${(this.currentQualityLevel * 100).toFixed(0)}% (Frame time: ${avgFrameTime.toFixed(1)}ms)`);
    }
  }

  /**
   * Calculate LOD level for an entity based on distance and performance
   * @param {Object} entity - Entity to calculate LOD for
   * @param {Object} camera - Camera position
   * @returns {Object} LOD information
   */
  calculateEntityLOD(entity, camera) {
    // Calculate distance from camera
    const dx = entity.x - camera.x;
    const dy = entity.y - camera.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Apply quality scaling to distance thresholds
    const qualityMultiplier = 1.0 / this.currentQualityLevel;
    const adjustedThresholds = {
      FULL_DETAIL: this.LOD_THRESHOLDS.FULL_DETAIL * qualityMultiplier,
      REDUCED_DETAIL: this.LOD_THRESHOLDS.REDUCED_DETAIL * qualityMultiplier,
      MINIMAL_DETAIL: this.LOD_THRESHOLDS.MINIMAL_DETAIL * qualityMultiplier,
      CULLED: this.LOD_THRESHOLDS.CULLED * qualityMultiplier
    };

    let lodLevel, shouldRender, updateFrequency, renderDetail;

    if (distance < adjustedThresholds.FULL_DETAIL) {
      lodLevel = 'FULL_DETAIL';
      shouldRender = true;
      updateFrequency = 1.0; // Every frame
      renderDetail = 1.0;
      this.entityCounts.fullDetail++;
    } else if (distance < adjustedThresholds.REDUCED_DETAIL) {
      lodLevel = 'REDUCED_DETAIL';
      shouldRender = true;
      updateFrequency = 0.5; // Every other frame
      renderDetail = 0.7;
      this.entityCounts.reducedDetail++;
    } else if (distance < adjustedThresholds.MINIMAL_DETAIL) {
      lodLevel = 'MINIMAL_DETAIL';
      shouldRender = true;
      updateFrequency = 0.25; // Every 4th frame
      renderDetail = 0.3;
      this.entityCounts.minimalDetail++;
    } else if (distance < adjustedThresholds.CULLED) {
      lodLevel = 'CULLED';
      shouldRender = false;
      updateFrequency = 0.1; // Every 10th frame (minimal updates)
      renderDetail = 0.0;
      this.entityCounts.culled++;
    } else {
      // Too far away, don't process at all
      return { shouldRender: false, shouldUpdate: false };
    }

    // Additional checks for entity limits
    if (lodLevel === 'FULL_DETAIL' && this.entityCounts.fullDetail > this.MAX_ENTITIES_FULL_DETAIL) {
      lodLevel = 'REDUCED_DETAIL';
      renderDetail = 0.7;
    } else if (lodLevel === 'REDUCED_DETAIL' && this.entityCounts.reducedDetail > this.MAX_ENTITIES_REDUCED_DETAIL) {
      lodLevel = 'MINIMAL_DETAIL';
      renderDetail = 0.3;
    }

    return {
      lodLevel,
      distance,
      shouldRender,
      shouldUpdate: Math.random() < updateFrequency,
      renderDetail,
      updateFrequency
    };
  }

  /**
   * Apply LOD optimizations to rendering parameters
   * @param {Object} lodInfo - LOD information from calculateEntityLOD
   * @returns {Object} Optimized rendering parameters
   */
  getOptimizedRenderParams(lodInfo) {
    const params = {
      skipShadow: false,
      skipParticles: false,
      skipAnimation: false,
      reducedPolygons: false,
      simplifiedTextures: false,
      skipSecondaryEffects: false
    };

    switch (lodInfo.lodLevel) {
      case 'FULL_DETAIL':
        // No optimizations
        break;
        
      case 'REDUCED_DETAIL':
        params.skipSecondaryEffects = true;
        params.reducedPolygons = true;
        break;
        
      case 'MINIMAL_DETAIL':
        params.skipShadow = true;
        params.skipParticles = true;
        params.skipSecondaryEffects = true;
        params.reducedPolygons = true;
        params.simplifiedTextures = true;
        break;
        
      case 'CULLED':
        // Entity shouldn't be rendered
        params.skipAll = true;
        break;
    }

    return params;
  }

  /**
   * Reset entity counts for new frame
   */
  resetFrameCounts() {
    this.entityCounts = {
      fullDetail: 0,
      reducedDetail: 0,
      minimalDetail: 0,
      culled: 0
    };
  }

  /**
   * Get current performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    const avgFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length 
      : 0;
    
    return {
      qualityLevel: this.currentQualityLevel,
      avgFrameTime,
      entityCounts: { ...this.entityCounts },
      thresholds: this.LOD_THRESHOLDS,
      targetFrameTime: this.TARGET_FRAME_TIME
    };
  }

  /**
   * Manual quality override (for user settings)
   * @param {number} quality - Quality level 0.0 to 1.0
   */
  setQualityLevel(quality) {
    this.currentQualityLevel = Math.max(0.1, Math.min(1.0, quality));
    console.log(`LOD: Manual quality set to ${(this.currentQualityLevel * 100).toFixed(0)}%`);
  }

  /**
   * Check if frustum culling should be applied
   * @param {Object} entity - Entity to check
   * @param {Object} camera - Camera with bounds
   * @returns {boolean} True if entity is visible
   */
  isEntityInFrustum(entity, camera) {
    // Simple frustum culling
    const margin = 100; // Margin for entities just outside view
    
    return (
      entity.x + entity.width > camera.x - margin &&
      entity.x < camera.x + camera.width + margin &&
      entity.y + entity.height > camera.y - margin &&
      entity.y < camera.y + camera.height + margin
    );
  }
}

// Global instance for easy access
export const globalLODSystem = new PerformanceLODSystem();
