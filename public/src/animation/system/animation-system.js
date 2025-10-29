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

// Import all modules for default export
import { AnimationFrame } from './AnimationFrame.js';
import { Animation } from './Animation.js';
import { AnimationController } from './AnimationController.js';
import { ProceduralAnimator } from './procedural/ProceduralAnimator.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { WolfAnimator } from './WolfAnimator.js';
import { AnimationPresets } from './AnimationPresets.js';
import { toMilliseconds } from './utils.js';

// Re-export all modules as named exports
export { AnimationFrame, Animation, AnimationController, ProceduralAnimator, CharacterAnimator, WolfAnimator, AnimationPresets, toMilliseconds };

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
