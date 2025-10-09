// Skeleton demo adapter module
// Provides the interface expected by interactive-skeleton-physics.html

import { SkeletonManager } from '../skeleton/SkeletonManager.js';
import { createCanvasRenderer, applyPose } from './SkeletonFactory.js';

/**
 * Create a human skeleton with the specified height
 * @param {number} height - Height in meters (default: 1.7)
 * @returns {Object} Skeleton instance
 */
export async function createHumanSkeleton(height = 1.7) {
    const manager = new SkeletonManager();
    const skeleton = await manager.initializePreferred();
    
    // Apply default pose
    try {
        applyPose(skeleton, 'apose');
    } catch (error) {
        console.warn('Could not apply default pose:', error);
    }
    
    return skeleton;
}

// Re-export the factory functions
export { createCanvasRenderer, applyPose };
