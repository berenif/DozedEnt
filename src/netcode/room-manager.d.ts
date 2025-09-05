/**
 * TypeScript definitions for Room Manager
 */

export interface RoomInfo {
  id: string
  name: string
  hostId: string
  players: string[]
  maxPlayers: number
  gameSettings: Record<string, any>
  createdAt: number
  playerCount?: number
}

export interface RoomManagerConfig {
  appId?: string
  password?: string
  rtcConfig?: RTCConfiguration
  relayUrls?: string[]
  [key: string]: any
}

export interface RoomManagerEvents {
  onRoomListUpdate: (rooms: RoomInfo[]) => void
  onPlayerJoin: (playerId: string) => void
  onPlayerLeave: (playerId: string) => void
  onGameStateUpdate: (gameState: any) => void
  onHostMigration: (newHostId: string) => void
}

export default class RoomManager {
  constructor(appId: string, config?: RoomManagerConfig)
  
  readonly appId: string
  readonly currentRoom: RoomInfo | null
  readonly isHost: boolean
  
  createRoom(roomName: string, maxPlayers?: number, gameSettings?: Record<string, any>): Promise<RoomInfo>
  joinRoom(roomId: string): Promise<RoomInfo>
  leaveRoom(): Promise<void>
  
  sendGameState(gameState: any): void
  sendPlayerAction(action: any): void
  
  getRoomList(): RoomInfo[]
  
  on<K extends keyof RoomManagerEvents>(event: K, callback: RoomManagerEvents[K]): void
  
  onPlayerAction?: (action: any, playerId: string) => void
  
  destroy(): Promise<void>
}