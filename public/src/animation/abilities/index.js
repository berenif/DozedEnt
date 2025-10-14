/**
 * Ability Animation System - Centralized Exports
 * 
 * This index provides centralized access to all ability animation modules.
 * 
 * Quick Start:
 * ```javascript
 * import { AbilityManager, FireballAbility, ThunderStrikeAbility } from './animation/abilities/index.js'
 * 
 * const abilityManager = new AbilityManager(player)
 * abilityManager.registerAbility('fireball', FireballAbility, { hotkey: '1' })
 * abilityManager.registerAbility('thunder', ThunderStrikeAbility, { hotkey: '2' })
 * 
 * // Use abilities
 * abilityManager.useAbility('fireball', target)
 * ```
 */

// Base classes
export { AbilityAnimationBase } from './ability-animation-base.js'
export { AbilityManager } from './ability-manager.js'

// Character-specific abilities
export { WardenBashAnimation } from './warden-bash-animation.js'
export { KenseiDashAnimation } from './kensei-dash-animation.js'
export { RaiderChargeAnimation } from './raider-charge-animation.js'

// New abilities
export { FireballAbility } from './fireball-ability.js'
export { ThunderStrikeAbility } from './thunder-strike-ability.js'
export { HealAbility } from './heal-ability.js'

// Default export: AbilityManager
export { AbilityManager as default } from './ability-manager.js'
