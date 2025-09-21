/**
 * RoomForge UI Component
 * Handles room creation, joining, and discovery functionality
 */
export class RoomForge {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.options = {
            onRoomCreate: options.onRoomCreate || (() => {}),
            onRoomJoin: options.onRoomJoin || (() => {}),
            onRoomLeave: options.onRoomLeave || (() => {}),
            onDiscoverRooms: options.onDiscoverRooms || (() => {}),
            onRefreshRooms: options.onRefreshRooms || (() => {}),
            ...options
        }
        this.element = null
        this.isVisible = true
    }

    /**
     * Initialize the RoomForge component
     */
    init() {
        this.element = document.getElementById(this.containerId)
        if (!this.element) {
            throw new Error(`RoomForge container with id "${this.containerId}" not found`)
        }
        
        this.render()
        this.attachEventListeners()
        return this
    }

    /**
     * Render the RoomForge HTML structure
     */
    render() {
        this.element.innerHTML = `
            <div class="control-section" id="tile-room-management">
                <h3>ROOM FORGE</h3>
                <p class="section-hint">Select a realm, forge your gate, and rally allies.</p>
                
                <div class="field-group">
                    <label for="network-provider" class="field-label">NETWORK PROVIDER</label>
                    <select id="network-provider">
                        <option value="torrent">Torrent (BitTorrent)</option>
                        <option value="firebase">Firebase</option>
                        <option value="ipfs">IPFS</option>
                        <option value="mqtt" selected>MQTT</option>
                        <option value="supabase">Supabase</option>
                    </select>
                    <p class="field-hint">Each provider shifts how quickly explorers uncover your shard.</p>
                </div>
                
                <div class="field-group">
                    <label for="room-id-input" class="field-label">ROOM ID</label>
                    <input type="text" id="room-id-input" placeholder="Enter room ID to join" value="8x99xr">
                </div>
                
                <div class="button-row primary-actions">
                    <button class="btn primary" id="create-room-btn">CREATE ROOM</button>
                    <button class="btn" id="join-room-btn">JOIN ROOM</button>
                    <button class="btn danger" id="leave-room-btn">Leave Room</button>
                </div>
                
                <div class="rooms-toolbar">
                    <div class="rooms-toolbar-left">Nearby Gateways</div>
                    <div class="rooms-toolbar-right">
                        <button class="btn sm" id="discover-rooms-btn">DISCOVER</button>
                        <button class="btn sm" id="refresh-rooms-btn">REFRESH</button>
                    </div>
                </div>
                
                <div class="room-list" id="room-list">
                    <div class="room-item no-rooms">
                        <div class="room-name">No rooms discovered for MQTT</div>
                        <div class="room-details">
                            <span class="room-hint">Try "Discover Rooms" or "Refresh Room List"</span>
                        </div>
                    </div>
                </div>
                
                <div class="rooms-hint">Tip: Tap a gateway to engulf the code, then press Join.</div>
            </div>
        `
    }

    /**
     * Attach event listeners to the RoomForge component
     */
    attachEventListeners() {
        // Network provider selection
        const networkProviderSelect = this.element.querySelector('#network-provider')
        if (networkProviderSelect) {
            networkProviderSelect.addEventListener('change', (event) => {
                this.options.onProviderChange?.(event.target.value)
            })
        }

        // Room management buttons
        const createRoomBtn = this.element.querySelector('#create-room-btn')
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                this.options.onRoomCreate()
            })
        }

        const joinRoomBtn = this.element.querySelector('#join-room-btn')
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                this.options.onRoomJoin()
            })
        }

        const leaveRoomBtn = this.element.querySelector('#leave-room-btn')
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                this.options.onRoomLeave()
            })
        }

        // Discovery buttons
        const discoverRoomsBtn = this.element.querySelector('#discover-rooms-btn')
        if (discoverRoomsBtn) {
            discoverRoomsBtn.addEventListener('click', () => {
                this.options.onDiscoverRooms()
            })
        }

        const refreshRoomsBtn = this.element.querySelector('#refresh-rooms-btn')
        if (refreshRoomsBtn) {
            refreshRoomsBtn.addEventListener('click', () => {
                this.options.onRefreshRooms()
            })
        }
    }

    /**
     * Update the room list display
     */
    updateRoomList(rooms, providerLabel = 'MQTT') {
        const roomList = this.element.querySelector('#room-list')
        if (!roomList) return

        if (rooms.length === 0) {
            roomList.innerHTML = `
                <div class="room-item no-rooms">
                    <div class="room-name">No rooms discovered for ${providerLabel}</div>
                    <div class="room-details">
                        <span class="room-hint">Try "Discover Rooms" or "Refresh Room List"</span>
                    </div>
                </div>
            `
        } else {
            roomList.innerHTML = rooms.map(room => {
                const isFull = room.playerCount >= room.maxPlayers
                const statusClass = isFull ? 'full' : 'available'
                const timeAgo = this.getTimeAgo(room.lastSeen)
                
                return `
                    <div class="room-item ${statusClass}" onclick="selectRoom('${room.id}')">
                        <div class="room-row">
                            <div class="room-main">
                                <div class="room-name">${room.name}</div>
                                <div class="room-details">
                                    <span class="room-id">ID: ${room.id}</span>
                                    <span class="room-players">${room.playerCount}/${room.maxPlayers}</span>
                                    <span class="room-time">Seen: ${timeAgo}</span>
                                </div>
                            </div>
                            <button class="btn sm join-btn" onclick="joinSelectedRoom('${room.id}'); event.stopPropagation();" ${isFull ? 'disabled' : ''}>Join</button>
                        </div>
                    </div>
                `
            }).join('')
        }
    }

    /**
     * Update button visibility based on room state
     */
    updateButtonVisibility(isInRoom, isOnCooldown = false, cooldownTime = 0) {
        const joinBtn = this.element.querySelector('#join-room-btn')
        const leaveBtn = this.element.querySelector('#leave-room-btn')
        const createBtn = this.element.querySelector('#create-room-btn')

        if (isInRoom) {
            // Player is in a room - hide join button, show leave button
            if (joinBtn) joinBtn.style.display = 'none'
            if (leaveBtn) leaveBtn.style.display = 'inline-block'
            if (createBtn) createBtn.style.display = 'none'
        } else {
            // Player is not in a room - show join button, hide leave button
            if (joinBtn) {
                if (isOnCooldown && cooldownTime > 0) {
                    const minutes = Math.floor(cooldownTime / 60)
                    const seconds = cooldownTime % 60
                    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                    joinBtn.textContent = `⏰ Join Timeout: ${timeString}`
                    joinBtn.style.opacity = '0.6'
                    joinBtn.style.cursor = 'not-allowed'
                } else {
                    joinBtn.textContent = 'JOIN ROOM'
                    joinBtn.style.opacity = '1'
                    joinBtn.style.cursor = 'pointer'
                }
                joinBtn.style.display = 'inline-block'
            }
            if (leaveBtn) leaveBtn.style.display = 'none'
            
            if (createBtn) {
                if (isOnCooldown && cooldownTime > 0) {
                    const minutes = Math.floor(cooldownTime / 60)
                    const seconds = cooldownTime % 60
                    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                    createBtn.textContent = `⏰ Timeout: ${timeString}`
                    createBtn.style.opacity = '0.6'
                    createBtn.style.cursor = 'not-allowed'
                } else {
                    createBtn.textContent = 'CREATE ROOM'
                    createBtn.style.opacity = '1'
                    createBtn.style.cursor = 'pointer'
                }
                createBtn.style.display = 'inline-block'
            }
        }
    }

    /**
     * Update nearby rooms UI visibility
     */
    updateNearbyRoomsVisibility(shouldHide) {
        const selectors = ['.rooms-toolbar', '.rooms-hint', '#room-list']
        selectors.forEach(selector => {
            const elements = this.element.querySelectorAll(selector)
            elements.forEach(el => {
                el.style.display = shouldHide ? 'none' : ''
            })
        })

        // Update discovery buttons
        const discoveryButtons = this.element.querySelectorAll('#discover-rooms-btn, #refresh-rooms-btn')
        discoveryButtons.forEach(btn => {
            btn.disabled = shouldHide
            btn.style.opacity = shouldHide ? '0.6' : '1'
            btn.style.cursor = shouldHide ? 'not-allowed' : 'pointer'
            if (shouldHide && document.activeElement === btn) {
                btn.blur()
            }
        })
    }

    /**
     * Get the current room ID input value
     */
    getRoomIdInput() {
        const input = this.element.querySelector('#room-id-input')
        return input ? input.value.trim() : ''
    }

    /**
     * Set the room ID input value
     */
    setRoomIdInput(value) {
        const input = this.element.querySelector('#room-id-input')
        if (input) {
            input.value = value
        }
    }

    /**
     * Get the selected network provider
     */
    getSelectedProvider() {
        const select = this.element.querySelector('#network-provider')
        return select ? select.value : 'mqtt'
    }

    /**
     * Set the network provider
     */
    setSelectedProvider(providerId) {
        const select = this.element.querySelector('#network-provider')
        if (select) {
            select.value = providerId
        }
    }

    /**
     * Show/hide the entire RoomForge component
     */
    setVisible(visible) {
        this.isVisible = visible
        const roomManagementTile = this.element.querySelector('#tile-room-management')
        if (roomManagementTile) {
            roomManagementTile.style.display = visible ? '' : 'none'
        }
    }

    /**
     * Helper function to format time ago
     */
    getTimeAgo(timestamp) {
        const now = Date.now()
        const diff = now - timestamp
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        
        if (seconds < 60) return `${seconds}s ago`
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return 'long ago'
    }

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove event listeners if needed
        // This component uses event delegation, so cleanup is minimal
    }
}
