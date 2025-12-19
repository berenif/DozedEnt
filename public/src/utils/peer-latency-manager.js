/**
 * Peer Latency Manager
 * Handles peer latency tracking and ping/pong communication
 */

export class PeerLatencyManager {
    constructor() {
        this.peerLatency = new Map()
        this.peerNames = new Map()
        this.pingTimer = null
        this.pingInterval = 5000 // 5 seconds
        this.isActive = false
    }

    /**
     * Start the ping loop
     * @param {Function} sendPing - Function to send ping messages
     */
    startPingLoop(sendPing) {
        this.stopPingLoop()
        if (!sendPing) {return}

        this.sendPing = sendPing
        this.isActive = true

        this.pingTimer = setInterval(() => {
            if (this.sendPing) {
                this.sendPing({ 
                    type: 'ping-request', 
                    sentAt: performance.now() 
                })
            }
        }, this.pingInterval)
    }

    /**
     * Stop the ping loop
     */
    stopPingLoop() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer)
            this.pingTimer = null
        }
        this.isActive = false
        this.sendPing = null
    }

    /**
     * Handle incoming ping messages
     * @param {Function} getPing - Function to receive ping messages
     * @param {Function} sendPing - Function to send ping responses
     */
    setupPingHandler(getPing, sendPing) {
        if (!getPing) {return}

        getPing((payload, peerId) => {
            if (!payload || !peerId) {return}

            if (payload.type === 'ping-response' && typeof payload.sentAt === 'number') {
                // Calculate latency from ping response
                const delta = performance.now() - payload.sentAt
                this.peerLatency.set(peerId, Math.max(0, Math.round(delta)))
            }

            if (payload.type === 'ping-request') {
                // Respond to ping request
                if (sendPing) {
                    sendPing({ 
                        type: 'ping-response', 
                        sentAt: payload.sentAt || performance.now() 
                    })
                }
            }
        })
    }

    /**
     * Handle peer info messages (name updates)
     * @param {Function} getPeerInfo - Function to receive peer info messages
     */
    setupPeerInfoHandler(getPeerInfo) {
        if (!getPeerInfo) {return}

        getPeerInfo((payload) => {
            if (!payload || !payload.peerId) {return}
            if (payload.peerName) {
                this.peerNames.set(payload.peerId, payload.peerName)
            }
        })
    }

    /**
     * Announce self to other peers
     * @param {Function} sendPeerInfo - Function to send peer info
     * @param {string} selfId - Self peer ID
     * @param {string} peerName - Peer name
     */
    announceSelf(sendPeerInfo, selfId, peerName) {
        if (!sendPeerInfo || !selfId || !peerName) {return}
        sendPeerInfo({ 
            type: 'intro', 
            peerId: selfId, 
            peerName: peerName 
        })
    }

    /**
     * Update peer name
     * @param {Function} sendPeerInfo - Function to send peer info
     * @param {string} selfId - Self peer ID
     * @param {string} peerName - New peer name
     */
    updatePeerName(sendPeerInfo, selfId, peerName) {
        if (!sendPeerInfo || !selfId || !peerName) {return}
        sendPeerInfo({ 
            type: 'update', 
            peerId: selfId, 
            peerName: peerName 
        })
    }

    /**
     * Get latency for a specific peer
     * @param {string} peerId - Peer ID
     * @returns {number|null} Latency in milliseconds or null if unknown
     */
    getPeerLatency(peerId) {
        return this.peerLatency.get(peerId) || null
    }

    /**
     * Get name for a specific peer
     * @param {string} peerId - Peer ID
     * @returns {string|null} Peer name or null if unknown
     */
    getPeerName(peerId) {
        return this.peerNames.get(peerId) || null
    }

    /**
     * Get all peer information
     * @returns {Array} Array of peer info objects
     */
    getAllPeers() {
        const peers = []
        
        // Add self peer
        peers.push({
            peerId: 'self',
            name: 'You',
            latency: 0,
            isSelf: true
        })

        // Add other peers
        for (const [peerId, latency] of this.peerLatency.entries()) {
            peers.push({
                peerId,
                name: this.peerNames.get(peerId) || `Player ${peerId.slice(0, 4).toUpperCase()}`,
                latency,
                isSelf: false
            })
        }

        return peers
    }

    /**
     * Remove a peer from tracking
     * @param {string} peerId - Peer ID to remove
     */
    removePeer(peerId) {
        this.peerLatency.delete(peerId)
        this.peerNames.delete(peerId)
    }

    /**
     * Clear all peer data
     */
    clearAllPeers() {
        this.peerLatency.clear()
        this.peerNames.clear()
    }

    /**
     * Get latency statistics
     * @returns {Object} Latency statistics
     */
    getLatencyStats() {
        const latencies = Array.from(this.peerLatency.values())
        
        if (latencies.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                median: 0
            }
        }

        const sorted = latencies.sort((a, b) => a - b)
        const average = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
        const median = sorted[Math.floor(sorted.length / 2)]

        return {
            count: latencies.length,
            average: Math.round(average),
            min: Math.min(...latencies),
            max: Math.max(...latencies),
            median: Math.round(median)
        }
    }

    /**
     * Check if ping loop is active
     * @returns {boolean} True if ping loop is running
     */
    isPingActive() {
        return this.isActive
    }

    /**
     * Set ping interval
     * @param {number} interval - Interval in milliseconds
     */
    setPingInterval(interval) {
        this.pingInterval = Math.max(1000, interval) // Minimum 1 second
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopPingLoop()
        this.clearAllPeers()
    }
}

// Create singleton instance
export const peerLatencyManager = new PeerLatencyManager()

export default peerLatencyManager
