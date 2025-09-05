/**
 * TypeScript definitions for Rollback Netcode System
 */

export interface RollbackConfig {
  maxRollbackFrames?: number
  inputDelayFrames?: number
  maxPredictionFrames?: number
  syncTestInterval?: number
  frameRate?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface GameCallbacks {
  saveState: () => any
  loadState: (state: any) => void
  advanceFrame: (inputs: Map<string, any>) => void
  getChecksum?: () => number
}

export interface PlayerInfo {
  id: string
  local: boolean
  lastConfirmedFrame: number
  inputDelay: number
}

export interface FrameState {
  frame: number
  state: any
  checksum: number
}

export interface RollbackMetrics {
  currentFrame: number
  confirmedFrame: number
  rollbacks: number
  avgRollbackFrames: number
  predictions: number
  avgInputLatency: number
  players: number
}

export default class RollbackNetcode {
  constructor(config?: RollbackConfig)
  
  // Properties
  currentFrame: number
  confirmedFrame: number
  localPlayerId: string | null
  
  // Callbacks
  onSendInput: ((frame: number, input: any) => void) | null
  onSendSyncTest: ((frame: number, checksum: number) => void) | null
  onDesyncDetected?: (playerId: string, frame: number) => void
  
  // Methods
  initialize(gameCallbacks: GameCallbacks, localPlayerId: string): void
  addPlayer(playerId: string, inputDelay?: number): void
  removePlayer(playerId: string): void
  start(): void
  stop(): void
  getLocalInput(): any
  addInput(playerId: string, frame: number, input: any): void
  receiveRemoteInput(playerId: string, frame: number, input: any): void
  receiveSyncTest(playerId: string, frame: number, remoteChecksum: number): void
  getMetrics(): RollbackMetrics
}

// P2P Networking
export interface P2PConfig {
  iceServers?: RTCIceServer[]
  heartbeatInterval?: number
  connectionTimeout?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface SignalingChannel {
  sendOffer: (peerId: string, offer: RTCSessionDescriptionInit) => void
  sendAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => void
  sendIceCandidate: (peerId: string, candidate: RTCIceCandidate) => void
  onOffer?: (peerId: string, offer: RTCSessionDescriptionInit) => void
  onAnswer?: (peerId: string, answer: RTCSessionDescriptionInit) => void
  onIceCandidate?: (peerId: string, candidate: RTCIceCandidate) => void
}

export interface PeerStats {
  connected: boolean
  rtt: number | null
  packetLoss: number | null
  bytesReceived: number
  bytesSent: number
}

export class RollbackP2P {
  constructor(config?: P2PConfig)
  
  // Properties
  localPeerId: string
  
  // Callbacks
  onPeerConnected: ((peerId: string) => void) | null
  onPeerDisconnected: ((peerId: string) => void) | null
  onInputReceived: ((peerId: string, frame: number, input: any) => void) | null
  onSyncTestReceived: ((peerId: string, frame: number, checksum: number) => void) | null
  
  // Methods
  initialize(signalingChannel: SignalingChannel, localPeerId?: string): void
  connectToPeer(peerId: string): Promise<void>
  disconnectPeer(peerId: string): void
  disconnectAll(): void
  broadcastInput(frame: number, input: any): void
  broadcastSyncTest(frame: number, checksum: number): void
  getStats(peerId?: string): Promise<{ [peerId: string]: PeerStats }>
}

// Lobby System
export interface LobbyConfig {
  hostingMode?: 'dedicated_host' | 'mesh_p2p'
  maxPlayers?: number
  announceInterval?: number
  cleanupInterval?: number
  lobbyTimeout?: number
  rollbackConfig?: RollbackConfig
  p2pConfig?: P2PConfig
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface LobbyInfo {
  id: string
  name: string
  hostId: string
  hostingMode: 'dedicated_host' | 'mesh_p2p'
  maxPlayers: number
  currentPlayers: number
  gameConfig: any
  createdAt: number
  lastSeen?: number
}

export interface LobbyPlayer {
  id: string
  name: string
  ready: boolean
  isHost: boolean
  joinedAt: number
  peerId?: string
}

export class RollbackLobby {
  constructor(appId: string, config?: LobbyConfig)
  
  // Properties
  lobbyId: string | null
  localPlayerId: string
  isHost: boolean
  hostId: string | null
  rollbackNetcode: RollbackNetcode | null
  
  // Callbacks
  onLobbyListUpdate: ((lobbies: LobbyInfo[]) => void) | null
  onPlayerJoin: ((playerId: string, playerName: string) => void) | null
  onPlayerLeave: ((playerId: string) => void) | null
  onGameStart: (() => void) | null
  onHostMigration: ((newHostId: string) => void) | null
  
  // Methods
  createLobby(lobbyName: string, gameConfig?: any): Promise<string>
  joinLobby(lobbyId: string, playerName?: string): Promise<string>
  startGame(gameCallbacks: GameCallbacks): Promise<void>
  leaveLobby(): void
  getLobbies(): LobbyInfo[]
  getPlayers(): LobbyPlayer[]
  destroy(): void
}

export const HOSTING_MODE: {
  DEDICATED_HOST: 'dedicated_host'
  MESH_P2P: 'mesh_p2p'
}

// Deterministic Game
export interface DeterministicGameConfig {
  fixedTimestep?: number
  maxEntities?: number
  seed?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}

export interface GameEntity {
  id: number
  type: string
  alive: boolean
  [key: string]: any
}

export interface GamePlayer {
  id: string
  entityId: number
  score: number
  lives: number
  input: {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
    action: boolean
  }
}

export interface RenderState {
  frame: number
  entities: Array<GameEntity & { x: number; y: number }>
  players: Array<{ id: string; score: number; lives: number }>
}

export class DeterministicRandom {
  constructor(seed?: number)
  next(): number
  nextFloat(): number
  nextInt(min: number, max: number): number
  reset(seed?: number): void
  save(): { seed: number; current: number }
  load(state: { seed: number; current: number }): void
}

export class DeterministicGame {
  constructor(config?: DeterministicGameConfig)
  
  // Properties
  frame: number
  entities: Map<number, GameEntity>
  players: Map<string, GamePlayer>
  random: DeterministicRandom
  
  // Methods
  initialize(players: string[]): void
  createPlayer(playerId: string): void
  createEntity(id: number | null, type: string, data?: any): GameEntity
  destroyEntity(entityId: number): void
  advanceFrame(inputs: Map<string, any>): void
  saveState(): any
  loadState(state: any): void
  getChecksum(): number
  getRenderState(): RenderState
  
  // Override these in implementation
  onInitialize(): void
  onPlayerAction(playerId: string, player: GamePlayer): void
  onCollision(entity1: GameEntity, entity2: GameEntity): void
  updateGameLogic(): void
  onSaveState(): any
  onLoadState(state: any): void
  onGetChecksum(): number
}

// Fixed-point math utilities
export function toFixed(n: number): number
export function fromFixed(n: number): number
export function fixedAdd(a: number, b: number): number
export function fixedSub(a: number, b: number): number
export function fixedMul(a: number, b: number): number
export function fixedDiv(a: number, b: number): number
export function fixedSqrt(n: number): number
export function fixedSin(angle: number): number
export function fixedCos(angle: number): number