/**
 * TypeScript definitions for Rollback Lobby module
 */

import type RollbackNetcode from './rollback-netcode'
import type { RollbackConfig, GameCallbacks } from './rollback-netcode'
import type { P2PConfig } from './rollback-p2p'

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