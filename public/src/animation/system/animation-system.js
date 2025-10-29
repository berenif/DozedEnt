/**
 * Animation System - Refactored modular animation system
 * 
 * This file provides a backwards-compatible export interface while using
 * the new modular architecture with separate files for each component.
 * 
 * Original file split into:
 * - AnimationFrame.js (data class)
 * - Animation.js (animation playback)
 * - AnimationController.js (animation management)
 * - procedural/ folder (9 procedural animation modules)
 * - CharacterAnimator.js (character animation system)
 * - WolfAnimator.js (wolf animation system)
 * - AnimationPresets.js (preset animations)
 * 
 * ARCHITECTURE: Follows ADR-004 File Size Enforcement
 * - Max file size: 500 lines
 * - Single Responsibility Principle
 * - Modular design for testability
 */

// Core animation classes
export { AnimationFrame } from './AnimationFrame.js';
export { Animation } from './Animation.js';
export { AnimationController } from './AnimationController.js';

// Procedural animation system
export { ProceduralAnimator } from './procedural/ProceduralAnimator.js';

// Character animators
export { CharacterAnimator } from './CharacterAnimator.js';
export { WolfAnimator } from './WolfAnimator.js';

// Presets
export { AnimationPresets } from './AnimationPresets.js';

// Utilities
export { toMilliseconds } from './utils.js';

// Default export for backwards compatibility
export default {
    AnimationFrame,
    Animation,
    AnimationController,
    ProceduralAnimator,
    CharacterAnimator,
    WolfAnimator,
    AnimationPresets
};
