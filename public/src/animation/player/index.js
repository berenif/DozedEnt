/**
 * Player Animation System - Modular Exports
 * 
 * This index provides centralized access to all player animation modules.
 * 
 * Quick Start:
 * ```javascript
 * import { AnimatedPlayer } from './animation/player/index.js'
 * import PlayerRenderer from './renderer/PlayerRenderer.js'
 * 
 * const player = new AnimatedPlayer(x, y, options)
 * const renderer = new PlayerRenderer(ctx, canvas)
 * 
 * // Game loop
 * player.update(deltaTime, input)
 * renderer.render(player.getPlayerState(), toCanvas, radius)
 * ```
 * 
 * Advanced Usage (Direct Module Access):
 * ```javascript
 * import {
 *   PlayerActionManager,
 *   PlayerStateViewModel,
 *   PlayerAnimationCoordinator
 * } from './animation/player/index.js'
 * 
 * // Build custom player with direct module control
 * ```
 */

// Refactored modular components
export { PlayerActionManager } from './manager/PlayerActionManager.js'
export { PlayerStateViewModel } from './viewmodel/PlayerStateViewModel.js'
export { PlayerAnimationCoordinator } from './coordinator/PlayerAnimationCoordinator.js'

// Main player class (refactored thin wrapper)
export { AnimatedPlayer } from './procedural/AnimatedPlayerRefactored.js'

// Integrated player controller with events and combos
export { IntegratedPlayerController } from './IntegratedPlayerController.js'

// Legacy export for backward compatibility
// Note: This will be removed in a future version
// Use AnimatedPlayerRefactored instead
export { AnimatedPlayer as AnimatedPlayerLegacy } from './procedural/player-animator.js'

// Procedural animation system
export { default as PlayerProceduralAnimator } from './procedural/player-procedural-animator.js'

// Physics-based animation system
export { PlayerPhysicsAnimator } from './physics/index.js'

/**
 * Default export: AnimatedPlayer (refactored)
 */
export { AnimatedPlayer as default } from './procedural/AnimatedPlayerRefactored.js'

