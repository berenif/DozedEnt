/**
 * Room Discovery Manager
 * Handles room discovery, announcement, and room information broadcasting
 */

import { broadcastManager } from './broadcast-manager.js'
import { roomCodeManager } from './room-code-manager.js'

export class RoomDiscoveryManager {
    constructor() {
        this.roomStore = null
        this.sendRoomInfo = null
        this.getRoomInfo = null
        this.sendRoomDiscovery = null
        this.getRoomDiscovery = null
        this.currentPeerName = null
        this.selectedProviderId = 'torrent'
        this.selfClientId = this.initSelfId()
        this.lastDiscoveryRequest = 0
        this.suppressDiscoveryUntil = 0
        this.discoveryCooldown = 2000 // 2 seconds
        this.suppressionTime = 1500 // 1.5 seconds
    }

    /**
     * Initialize self client ID
     * @returns {string} Self client ID
     */
    initSelfId() {
        try {
            const existing = localStorage.getItem('working-demo-self-id')
            if (existing) {return existing}
            const next = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
            localStorage.setItem('working-demo-self-id', next)
            return next
        } catch (error) {
            return Math.random().toString(36).slice(2)
        }
    }

    /**
     * Set up room discovery handlers
     * @param {Object} actions - Room actions from network manager
     * @param {string} providerId - Current provider ID
     * @param {string} peerName - Current peer name
     */
    setupDiscoveryHandlers(actions, providerId, peerName) {
        this.selectedProviderId = providerId
        this.currentPeerName = peerName

        if (actions.sendRoomInfo && actions.getRoomInfo) {
            this.sendRoomInfo = actions.sendRoomInfo
            this.getRoomInfo = actions.getRoomInfo
            this.setupRoomInfoHandler()
        }

        if (actions.sendRoomDiscovery && actions.getRoomDiscovery) {
            this.sendRoomDiscovery = actions.sendRoomDiscovery
            this.getRoomDiscovery = actions.getRoomDiscovery
            this.setupDiscoveryHandler()
        }

        // Set up broadcast channel handler
        broadcastManager.setMessageHandler(providerId, (data) => {
            this.handleBroadcastMessage(data, providerId)
        })
    }

    /**
     * Set up room info handler
     */
    setupRoomInfoHandler() {
        if (!this.getRoomInfo) {return}

        this.getRoomInfo((info) => {
            if (!info || !info.providerId) {return}
            const stored = this.recordDiscoveredRoom(info.providerId, info)
            if (stored && this.roomStore) {
                // Notify room store of update
                this.roomStore.notifyUpdate?.()
            }
        })
    }

    /**
     * Set up discovery handler
     */
    setupDiscoveryHandler() {
        if (!this.getRoomDiscovery) {return}

        this.getRoomDiscovery((payload) => {
            if (!payload || !this.sendRoomInfo || !this.currentPeerName) {return}
            if (payload.type === 'request') {
                this.respondToDiscovery()
            }
        })
    }

    /**
     * Handle broadcast channel messages
     * @param {Object} data - Message data
     * @param {string} providerId - Provider ID
     */
    handleBroadcastMessage(data, providerId) {
        if (!data) {return}

        if (data.type === 'room-broadcast') {
            const stored = this.recordDiscoveredRoom(providerId, data.roomInfo)
            if (stored && this.roomStore) {
                this.roomStore.notifyUpdate?.()
            }
        }

        if (data.type === 'discovery-request') {
            this.respondToDiscovery()
        }
    }

    /**
     * Discover rooms by sending discovery request
     * @returns {boolean} True if discovery request was sent
     */
    discoverRooms() {
        const now = Date.now()
        
        // Check cooldown
        if (now - this.lastDiscoveryRequest < this.discoveryCooldown) {
            return false
        }

        this.lastDiscoveryRequest = now
        this.suppressDiscoveryUntil = now + this.suppressionTime

        // Send discovery request through network
        if (this.sendRoomDiscovery) {
            this.sendRoomDiscovery({ 
                type: 'request', 
                requester: this.currentPeerName || 'Player', 
                timestamp: now 
            })
        }

        // Broadcast discovery request
        broadcastManager.broadcastDiscoveryRequest(
            this.selectedProviderId, 
            this.currentPeerName || 'Player'
        )

        return true
    }

    /**
     * Respond to discovery request by broadcasting room info
     */
    respondToDiscovery() {
        if (!this.currentPeerName) {return}

        const roomInfo = this.getCurrentRoomInfo()
        if (!roomInfo) {return}

        // Send through network if available
        if (this.sendRoomInfo) {
            this.sendRoomInfo(roomInfo)
        }

        // Broadcast room info
        broadcastManager.broadcastRoomInfo(this.selectedProviderId, roomInfo)

        // Record in local store
        this.recordDiscoveredRoom(this.selectedProviderId, roomInfo)
    }

    /**
     * Get current room information
     * @returns {Object|null} Current room info or null
     */
    getCurrentRoomInfo() {
        // This should be provided by the room manager
        // For now, return null - will be implemented by the coordinator
        return null
    }

    /**
     * Set current room information
     * @param {Object} roomInfo - Room information
     */
    setCurrentRoomInfo(roomInfo) {
        this.currentRoomInfo = roomInfo
    }

    /**
     * Record a discovered room
     * @param {string} providerId - Provider ID
     * @param {Object} info - Room information
     * @returns {Object|null} Recorded room info or null
     */
    recordDiscoveredRoom(providerId, info) {
        if (!info || !providerId) {return null}

        const now = Date.now()
        if (now < this.suppressDiscoveryUntil) {return null}

        const normalizedInfo = {
            ...info,
            lastSeen: now,
            providerId: providerId,
            roomId: info.roomId || info.id
        }

        if (!normalizedInfo.roomId) {return null}

        // Store in room store if available
        if (this.roomStore) {
            return this.roomStore.upsert(providerId, normalizedInfo)
        }

        return normalizedInfo
    }

    /**
     * Set room store reference
     * @param {Object} roomStore - Room store instance
     */
    setRoomStore(roomStore) {
        this.roomStore = roomStore
    }

    /**
     * Update provider ID
     * @param {string} providerId - New provider ID
     */
    updateProvider(providerId) {
        this.selectedProviderId = providerId
        broadcastManager.setMessageHandler(providerId, (data) => {
            this.handleBroadcastMessage(data, providerId)
        })
    }

    /**
     * Update peer name
     * @param {string} peerName - New peer name
     */
    updatePeerName(peerName) {
        this.currentPeerName = peerName
    }

    /**
     * Check if discovery is on cooldown
     * @returns {boolean} True if on cooldown
     */
    isOnCooldown() {
        const now = Date.now()
        return now - this.lastDiscoveryRequest < this.discoveryCooldown
    }

    /**
     * Get discovery cooldown remaining time
     * @returns {number} Cooldown remaining in milliseconds
     */
    getCooldownRemaining() {
        const now = Date.now()
        return Math.max(0, this.discoveryCooldown - (now - this.lastDiscoveryRequest))
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.sendRoomInfo = null
        this.getRoomInfo = null
        this.sendRoomDiscovery = null
        this.getRoomDiscovery = null
        this.roomStore = null
        broadcastManager.closeChannel(this.selectedProviderId)
    }
}

// Create singleton instance
export const roomDiscoveryManager = new RoomDiscoveryManager()

export default roomDiscoveryManager
