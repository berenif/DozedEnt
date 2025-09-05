/**
 * TypeScript definitions for Host Authority System
 */

import RoomManager from './room-manager'

export interface HostAuthorityConfig {
  updateRate?: number
  stateSnapshotRate?: number
  inputBufferSize?: number
}

export interface PlayerInput {
  type: string
  timestamp: number
  [key: string]: any
}

export interface GameState {
  frameNumber: number
  timestamp: number
  players?: any[]
  [key: string]: any
}

export default class HostAuthority {
  constructor(roomManager: RoomManager)
  
  readonly roomManager: RoomManager
  readonly gameState: GameState | null
  readonly config: HostAuthorityConfig
  
  initializeGame(wasmSource: string | Response | ArrayBuffer | Uint8Array, gameConfig?: Record<string, any>): Promise<boolean>
  
  startGameLoop(): void
  stopGameLoop(): void
  
  handlePlayerAction(action: PlayerInput, playerId: string): void
  sendInput(input: PlayerInput): void
  
  receiveStateUpdate(state: GameState): void
  getGameState(): GameState | null
  
  destroy(): void
}