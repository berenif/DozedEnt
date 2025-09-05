export {getRelaySockets, joinRoom, selfId} from './nostr.js'
export {default as RoomManager} from './room-manager.js'
export {default as HostAuthority} from './host-authority.js'
export {default as RoomLobbyUI} from './room-lobby-ui.js'

// Visual & Animation Features
export {
  AnimationFrame,
  Animation,
  AnimationController,
  ProceduralAnimator,
  CharacterAnimator,
  AnimationPresets,
  default as AnimationSystem
} from './animation-system.js'
export {default as CameraEffects} from './camera-effects.js'
export {
  Particle,
  ParticleSystem,
  ParticleEmitter,
  default as ParticleSystemDefault
} from './particle-system.js'
export {
  GameFeelEnhancer,
  getGameFeelEnhancer,
  default as GameFeelEnhancerDefault
} from './game-feel-enhancer.js'

// UI & Feedback Features
export {
  DamageNumber,
  ComboCounter,
  StatusIndicator,
  HealthBar,
  UIFeedbackSystem,
  default as UIFeedbackSystemDefault
} from './ui-feedback.js'
export {
  EnhancedLobbyUI,
  default as EnhancedLobbyUIDefault
} from './enhanced-lobby-ui.js'
export {
  LobbyAnalytics,
  default as LobbyAnalyticsDefault
} from './utils/lobby-analytics.js'

// Rollback Netcode exports
export {default as RollbackNetcode} from './rollback-netcode.js'
export {default as RollbackP2P} from './rollback-p2p.js'
export {RollbackLobby, HOSTING_MODE} from './rollback-lobby.js'
export {
  DeterministicGame,
  DeterministicRandom,
  toFixed,
  fromFixed,
  fixedAdd,
  fixedSub,
  fixedMul,
  fixedDiv,
  fixedSqrt,
  fixedSin,
  fixedCos
} from './deterministic-game.js'
