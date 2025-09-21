/**
 * Broadcast Manager
 * Handles BroadcastChannel communication for room discovery across tabs/windows
 */

export class BroadcastManager {
    constructor() {
        this.channels = new Map()
        this.messageHandlers = new Map()
        this.isSupported = typeof BroadcastChannel !== 'undefined'
    }

    /**
     * Create or get a broadcast channel for a specific provider
     * @param {string} providerId - Network provider ID
     * @returns {BroadcastChannel|null} Broadcast channel or null if not supported
     */
    getChannel(providerId) {
        if (!this.isSupported) return null

        if (this.channels.has(providerId)) {
            return this.channels.get(providerId)
        }

        try {
            const channelName = `room-discovery-${providerId}`
            const channel = new BroadcastChannel(channelName)
            
            // Set up message handler
            channel.addEventListener('message', (event) => {
                this.handleMessage(providerId, event)
            })

            this.channels.set(providerId, channel)
            return channel
        } catch (error) {
            console.error('Failed to create broadcast channel:', error)
            return null
        }
    }

    /**
     * Close a broadcast channel
     * @param {string} providerId - Network provider ID
     */
    closeChannel(providerId) {
        const channel = this.channels.get(providerId)
        if (channel) {
            channel.close()
            this.channels.delete(providerId)
            this.messageHandlers.delete(providerId)
        }
    }

    /**
     * Close all broadcast channels
     */
    closeAllChannels() {
        for (const [providerId, channel] of this.channels.entries()) {
            channel.close()
        }
        this.channels.clear()
        this.messageHandlers.clear()
    }

    /**
     * Send a message through a provider's broadcast channel
     * @param {string} providerId - Network provider ID
     * @param {Object} message - Message to send
     */
    sendMessage(providerId, message) {
        const channel = this.getChannel(providerId)
        if (!channel) return

        try {
            const messageWithTimestamp = {
                ...message,
                timestamp: Date.now()
            }
            channel.postMessage(messageWithTimestamp)
        } catch (error) {
            console.error('Failed to send broadcast message:', error)
        }
    }

    /**
     * Set up message handler for a provider
     * @param {string} providerId - Network provider ID
     * @param {Function} handler - Message handler function
     */
    setMessageHandler(providerId, handler) {
        this.messageHandlers.set(providerId, handler)
    }

    /**
     * Handle incoming broadcast messages
     * @param {string} providerId - Network provider ID
     * @param {MessageEvent} event - Message event
     */
    handleMessage(providerId, event) {
        if (!event?.data) return

        const handler = this.messageHandlers.get(providerId)
        if (handler) {
            handler(event.data, providerId)
        }
    }

    /**
     * Broadcast room discovery request
     * @param {string} providerId - Network provider ID
     * @param {string} requester - Name of the requester
     */
    broadcastDiscoveryRequest(providerId, requester) {
        this.sendMessage(providerId, {
            type: 'discovery-request',
            providerId,
            requester,
            timestamp: Date.now()
        })
    }

    /**
     * Broadcast room information
     * @param {string} providerId - Network provider ID
     * @param {Object} roomInfo - Room information to broadcast
     */
    broadcastRoomInfo(providerId, roomInfo) {
        this.sendMessage(providerId, {
            type: 'room-broadcast',
            roomInfo,
            timestamp: Date.now()
        })
    }

    /**
     * Check if BroadcastChannel is supported
     * @returns {boolean} True if supported
     */
    isBroadcastSupported() {
        return this.isSupported
    }

    /**
     * Get all active channels
     * @returns {Array<string>} Array of provider IDs with active channels
     */
    getActiveChannels() {
        return Array.from(this.channels.keys())
    }

    /**
     * Get channel status for a provider
     * @param {string} providerId - Network provider ID
     * @returns {Object} Channel status information
     */
    getChannelStatus(providerId) {
        const channel = this.channels.get(providerId)
        return {
            providerId,
            isActive: !!channel,
            isSupported: this.isSupported,
            hasHandler: this.messageHandlers.has(providerId)
        }
    }

    /**
     * Clean up all resources
     */
    destroy() {
        this.closeAllChannels()
    }
}

// Create singleton instance
export const broadcastManager = new BroadcastManager()

export default broadcastManager
