/**
 * TypeScript definitions for Room Lobby UI
 */

import RoomManager from './room-manager'

export interface RoomLobbyUIOptions {
  containerId?: string
}

export default class RoomLobbyUI {
  constructor(containerId?: string)
  
  readonly container: HTMLElement
  readonly roomManager: RoomManager | null
  readonly isInRoom: boolean
  
  setRoomManager(roomManager: RoomManager): void
  
  show(): void
  hide(): void
  
  onStartGame?: () => void
  
  refreshRoomList(): void
  updateRoomList(rooms: any[]): void
  updatePlayerList(): void
}