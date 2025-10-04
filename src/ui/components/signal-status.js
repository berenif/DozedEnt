/**
 * SignalStatus UI Component
 * Displays network connection status and player information
 */
export class SignalStatus {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.options = {
            onPeerNameChange: options.onPeerNameChange || (() => {}),
            ...options
        }
        this.element = null
        this.currentData = {
            roomId: 'Not Connected',
            peerCount: 0,
            connectionQuality: 'Link idle - MQTT',
            peerName: 'BoldChick'
        }
    }

    /**
     * Initialize the SignalStatus component
     */
    init() {
        this.element = document.getElementById(this.containerId)
        if (!this.element) {
            throw new Error(`SignalStatus container with id "${this.containerId}" not found`)
        }
        
        this.render()
        this.attachEventListeners()
        return this
    }

    /**
     * Render the SignalStatus HTML structure
     */
    render() {
        this.element.innerHTML = `
            <div class="control-section" id="tile-signal-status">
                <h3>SIGNAL STATUS</h3>
                <p class="section-hint">Monitor your link before the next descent.</p>
                
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-label">ROOM ID</div>
                        <div class="status-value" id="room-id">${this.currentData.roomId}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">CONNECTED PLAYERS</div>
                        <div class="status-value" id="peer-count">${this.currentData.peerCount}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">NETWORK PROVIDER</div>
                        <div class="status-value" id="connection-quality">${this.currentData.connectionQuality}</div>
                    </div>
                    <div class="status-item">
                        <div class="status-label">YOUR PLAYER NAME</div>
                        <div class="status-value" id="peer-name">${this.currentData.peerName}</div>
                    </div>
                </div>
            </div>
        `
    }

    /**
     * Attach event listeners to the SignalStatus component
     */
    attachEventListeners() {
        // Add click handler for peer name to allow regeneration
        const peerNameElement = this.element.querySelector('#peer-name')
        if (peerNameElement) {
            peerNameElement.addEventListener('click', () => {
                this.options.onPeerNameChange()
            })
            peerNameElement.style.cursor = 'pointer'
            peerNameElement.title = 'Click to generate new name'
        }
    }

    /**
     * Update the room ID display
     */
    updateRoomId(roomId) {
        this.currentData.roomId = roomId || 'Not Connected'
        const element = this.element.querySelector('#room-id')
        if (element) {
            element.textContent = this.currentData.roomId
        }
    }

    /**
     * Update the peer count display
     */
    updatePeerCount(count) {
        this.currentData.peerCount = count || 0
        const element = this.element.querySelector('#peer-count')
        if (element) {
            element.textContent = this.currentData.peerCount
        }
    }

    /**
     * Update the connection quality display
     */
    updateConnectionQuality(quality, providerLabel = 'MQTT', isInRoom = false, remotePeerCount = 0) {
        let qualityText = quality
        
        if (!isInRoom) {
            qualityText = providerLabel ? `Link idle - ${providerLabel}` : 'Link idle'
        } else if (remotePeerCount > 0) {
            const allyLabel = remotePeerCount === 1 ? 'ally' : 'allies'
            qualityText = `Synced with ${remotePeerCount} ${allyLabel}`
        } else {
            qualityText = 'Gate open - awaiting allies'
        }
        
        this.currentData.connectionQuality = qualityText
        const element = this.element.querySelector('#connection-quality')
        if (element) {
            element.textContent = this.currentData.connectionQuality
        }
    }

    /**
     * Update the peer name display
     */
    updatePeerName(peerName) {
        this.currentData.peerName = peerName || 'Unknown'
        const element = this.element.querySelector('#peer-name')
        if (element) {
            element.textContent = this.currentData.peerName
        }
    }

    /**
     * Update all status information at once
     */
    updateStatus(statusData) {
        const {
            roomId,
            peerCount,
            connectionQuality,
            peerName,
            providerLabel,
            isInRoom,
            remotePeerCount
        } = statusData

        this.updateRoomId(roomId)
        this.updatePeerCount(peerCount)
        this.updateConnectionQuality(connectionQuality, providerLabel, isInRoom, remotePeerCount)
        this.updatePeerName(peerName)
    }

    /**
     * Get current status data
     */
    getCurrentData() {
        return { ...this.currentData }
    }

    /**
     * Show/hide the entire SignalStatus component
     */
    setVisible(visible) {
        const signalStatusTile = this.element.querySelector('#tile-signal-status')
        if (signalStatusTile) {
            signalStatusTile.style.display = visible ? '' : 'none'
        }
    }

    /**
     * Add visual indicator for connection state
     */
    setConnectionState(state) {
        const connectionElement = this.element.querySelector('#connection-quality')
        if (!connectionElement) return

        // Remove existing state classes
        connectionElement.classList.remove('connected', 'disconnected', 'connecting', 'error')
        
        // Add new state class
        switch (state) {
            case 'connected':
                connectionElement.classList.add('connected')
                break
            case 'disconnected':
                connectionElement.classList.add('disconnected')
                break
            case 'connecting':
                connectionElement.classList.add('connecting')
                break
            case 'error':
                connectionElement.classList.add('error')
                break
        }
    }

    /**
     * Add pulse animation to indicate activity
     */
    pulseActivity() {
        const statusGrid = this.element.querySelector('.status-grid')
        if (statusGrid) {
            statusGrid.classList.add('pulse')
            setTimeout(() => {
                statusGrid.classList.remove('pulse')
            }, 1000)
        }
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners if needed
        // This component uses minimal event handling, so cleanup is minimal
    }
}
