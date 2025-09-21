/**
 * ProviderRoomStore keeps discovered rooms scoped by network provider.
 */

export class ProviderRoomStore {
  constructor() {
    this.roomsByProvider = new Map()
  }

  upsert(providerId, roomData = {}) {
    const normalized = normalizeRoom(providerId, roomData)
    if (!normalized) {return null}

    let providerRooms = this.roomsByProvider.get(providerId)
    if (!providerRooms) {
      providerRooms = new Map()
      this.roomsByProvider.set(providerId, providerRooms)
    }

    normalized.lastSeen = Date.now()
    providerRooms.set(normalized.id, normalized)
    return normalized
  }

  getRooms(providerId) {
    const providerRooms = this.roomsByProvider.get(providerId)
    if (!providerRooms) {return []}
    return Array.from(providerRooms.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
  }

  remove(providerId, roomId) {
    const providerRooms = this.roomsByProvider.get(providerId)
    if (!providerRooms) {return false}
    const didRemove = providerRooms.delete(roomId)
    if (providerRooms.size === 0) {
      this.roomsByProvider.delete(providerId)
    }
    return didRemove
  }

  clearProvider(providerId) {
    return this.roomsByProvider.delete(providerId)
  }

  clearAll() {
    this.roomsByProvider.clear()
  }

  cleanup(ttlMs = 30000) {
    const now = Date.now()
    let changed = false

    for (const [providerId, providerRooms] of this.roomsByProvider.entries()) {
      for (const [roomId, room] of providerRooms.entries()) {
        if (now - room.lastSeen > ttlMs) {
          providerRooms.delete(roomId)
          changed = true
        }
      }

      if (providerRooms.size === 0) {
        this.roomsByProvider.delete(providerId)
      }
    }

    return changed
  }
}

function normalizeRoom(providerId, rawRoom) {
  if (!providerId) {return null}
  const roomId = rawRoom.roomId || rawRoom.id
  if (!roomId) {return null}

  const normalized = {
    id: roomId,
    providerId,
    name: String(rawRoom.roomName || rawRoom.name || `Room ${roomId}`),
    playerCount: toNumber(rawRoom.playerCount, 0),
    maxPlayers: toNumber(rawRoom.maxPlayers, 0),
    hostName: String(rawRoom.hostName || rawRoom.host || 'Unknown'),
    lastSeen: Date.now()
  }

  if (Number.isFinite(rawRoom.lastSeen)) {
    normalized.lastSeen = rawRoom.lastSeen
  }

  return normalized
}

function toNumber(value, fallback) {
  const coerced = Number(value)
  return Number.isFinite(coerced) ? coerced : fallback
}

export default ProviderRoomStore
