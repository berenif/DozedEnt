/**
 * Multiplayer Demo Coordinator
 * Orchestrates all multiplayer demo components and manages the overall state
 */

import NetworkProviderManager from '../netcode/network-provider-manager.js'
import { peerNameGenerator } from '../utils/peer-name-generator.js'
import { ProviderRoomStore } from '../utils/provider-room-store.js'
import { AlertTypes, initializeGlobalAlertSystem, showAlert } from '../ui/alert-system.js'
import { roomCodeManager } from '../utils/room-code-manager.js'
import { broadcastManager } from '../utils/broadcast-manager.js'
import { peerLatencyManager } from '../utils/peer-latency-manager.js'
import { roomDiscoveryManager } from '../utils/room-discovery-manager.js'

export class MultiplayerDemoCoordinator {
    constructor(options = {}) {
        this.options = {
            storageKeys: {
                playerName: 'working-demo-player-name',
                roomCode: 'working-demo-last-room-code'
            },
            connectionStates: {
                idle: 'Not connected',
                connecting: 'Linking...',
                linked: 'Linked',
                reconnecting: 'Reconnecting...'
            },
            intervals: {
                passiveRefresh: 10000, // 10 seconds
                broadcastRefresh: 20000, // 20 seconds
                statusUpdate: 2000, // 2 seconds
                roomCleanup: 6000 // 6 seconds
            },
            ...options
        }

        // Core components
        this.networkManager = null
        this.roomStore = new ProviderRoomStore()
        this.room = null
        this.currentPeerName = null
        this.selectedProviderId = 'torrent'
        this.connectionState = 'idle'
        this.isHosting = false
        this.isInRoom = false

        // Action handlers
        this.sendPeerInfo = null
        this.getPeerInfo = null
        this.sendPing = null
        this.getPing = null
        this.sendRoomInfo = null
        this.getRoomInfo = null
        this.sendRoomDiscovery = null
        this.getRoomDiscovery = null

        // Timers
        this.broadcastTimer = null
        this.statusTimer = null
        this.refreshTimer = null
        this.cleanupTimer = null

        // Event handlers
        this.eventHandlers = {
            onConnectionStateChange: null,
            onPlayerListUpdate: null,
            onRoomListUpdate: null,
            onError: null
        }
    }

    /**
     * Initialize the coordinator
     */
    async init() {
        try {
            this.setupNetworkManager()
            this.restoreFromStorage()
            this.initializeBroadcastChannel()
            this.initializeRoomDiscovery()
            this.startTimers()
            this.updateConnectionState('idle')
            
            // Initialize global alert system
            initializeGlobalAlertSystem({
                containerId: 'toast-stack',
                toastLifetime: 4800,
                alertCooldown: 1600,
                maxActiveAlerts: 3,
                enableSpamProtection: true,
                enableAccessibility: true
            })

            console.log('MultiplayerDemoCoordinator initialized')
        } catch (error) {
            console.error('Failed to initialize coordinator:', error)
            this.handleError(error)
        }
    }

    /**
     * Set up network manager with event handlers
     */
    setupNetworkManager() {
        if (this.networkManager) return

        this.networkManager = new NetworkProviderManager()

        this.networkManager.on('onProviderChanged', (providerId) => {
            this.selectedProviderId = providerId
            this.updateRoomList()
            this.updateConnectionSummary()
        })

        this.networkManager.on('onRoomCreated', (roomId) => {
            this.updateConnectionState('linked')
            this.showStatusToast(`Room ${roomCodeManager.formatRoomCode(roomId)} ready`, AlertTypes.SUCCESS)
        })

        this.networkManager.on('onRoomJoined', (roomId) => {
            this.updateConnectionState('linked')
            this.showStatusToast(`Joined room ${roomCodeManager.formatRoomCode(roomId)}`, AlertTypes.SUCCESS)
        })

        this.networkManager.on('onRoomLeft', () => {
            this.handleRoomClosed()
        })

        this.networkManager.on('onPeerJoined', () => {
            this.announceSelf()
            this.updatePlayersList()
        })

        this.networkManager.on('onPeerLeft', (peerId) => {
            peerLatencyManager.removePeer(peerId)
            this.updatePlayersList()
        })

        this.networkManager.on('onError', (error) => {
            console.error('Network error:', error)
            this.showStatusToast(error.message || 'Network error', AlertTypes.ERROR)
            this.updateConnectionState(this.isInRoom ? 'reconnecting' : 'idle')
        })
    }

    /**
     * Restore data from localStorage
     */
    restoreFromStorage() {
        try {
            const storedName = localStorage.getItem(this.options.storageKeys.playerName)
            if (storedName) {
                this.currentPeerName = storedName
            }

            const storedCode = roomCodeManager.loadRoomCode()
            if (storedCode) {
                const formatted = roomCodeManager.formatRoomCode(storedCode)
                roomCodeManager.updateRoomCodeStatus(
                    document.getElementById('room-code-status'),
                    roomCodeManager.isValidRoomCode(storedCode)
                )
            }
        } catch (_) {
            // Ignore localStorage errors
        }

        if (!this.currentPeerName) {
            this.generatePeerName()
        }
    }

    /**
     * Generate a new peer name
     * @param {boolean} force - Force generation even if name exists
     */
    generatePeerName(force = false) {
        if (this.currentPeerName && !force) return this.currentPeerName

        const name = peerNameGenerator.generateName()
        this.currentPeerName = name
        this.saveName(name)
        return name
    }

    /**
     * Save peer name to localStorage
     * @param {string} name - Name to save
     */
    saveName(name) {
        try {
            localStorage.setItem(this.options.storageKeys.playerName, name)
        } catch (_) {
            // Ignore localStorage errors
        }
    }

    /**
     * Ensure provider is initialized
     * @param {string} providerId - Provider ID to ensure
     */
    async ensureProvider(providerId) {
        this.setupNetworkManager()
        const provider = this.networkManager.getCurrentProvider()
        
        if (!provider || provider.id !== providerId) {
            const ready = await this.networkManager.initializeProvider(providerId)
            if (!ready) {
                throw new Error(`Could not initialize ${this.getProviderLabel(providerId)}`)
            }
        }
    }

    /**
     * Create a room
     * @param {string} desiredRoomId - Desired room ID (optional)
     */
    async createRoom(desiredRoomId = null) {
        await this.ensureProvider(this.selectedProviderId)
        
        const roomId = desiredRoomId || roomCodeManager.generateRoomId()
        this.updateConnectionState('connecting')
        this.isHosting = true

        this.room = await this.networkManager.createRoom(roomId)
        this.afterRoomEntered(roomId)
        this.startPeerActions()
        this.updateConnectionState('linked')
    }

    /**
     * Join a room
     * @param {string} roomCode - Room code to join
     */
    async joinRoom(roomCode) {
        const formatted = roomCodeManager.formatRoomCode(roomCode)
        const rawCode = formatted.replace(/[^A-Z0-9]/g, '')
        
        if (!roomCodeManager.isValidRoomCode(rawCode)) {
            throw new Error('Bad code. Codes are 6 chars like 2K7-X9R.')
        }

        await this.ensureProvider(this.selectedProviderId)
        this.updateConnectionState('connecting')
        this.isHosting = false

        if (this.room) {
            await this.leaveRoom()
        }

        this.room = await this.networkManager.joinRoom(rawCode)
        this.afterRoomEntered(rawCode)
        this.startPeerActions()
        this.updateConnectionState('linked')
    }

    /**
     * Leave the current room
     */
    async leaveRoom() {
        if (!this.networkManager || !this.isInRoom) return

        await this.networkManager.leaveRoom()
        this.handleRoomClosed()
        this.showStatusToast('You left the room', AlertTypes.INFO)
    }

    /**
     * Discover rooms
     */
    async discoverRooms() {
        const success = roomDiscoveryManager.discoverRooms()
        if (!success) {
            this.showStatusToast('Discovery cooling down', AlertTypes.INFO)
            return
        }

        this.showStatusToast('Looking for nearby rooms...', AlertTypes.INFO)
    }

    /**
     * Refresh room list
     * @param {boolean} isPassive - Whether this is a passive refresh
     */
    refreshRoomList(isPassive = false) {
        if (!isPassive) {
            roomDiscoveryManager.suppressDiscoveryUntil = Date.now() + 1000
        }
        this.updateRoomList()
        
        if (!isPassive) {
            this.showStatusToast('Nearby rooms refreshed', AlertTypes.INFO)
        }
    }

    /**
     * Handle room entered
     * @param {string} roomId - Room ID
     */
    afterRoomEntered(roomId) {
        this.isInRoom = true
        const formatted = roomCodeManager.formatRoomCode(roomId)
        
        // Update UI elements if they exist
        const roomIdElement = document.getElementById('room-id')
        const roomCopyButton = document.getElementById('room-copy-button')
        const leaveButton = document.getElementById('leave-room-button')

        if (roomIdElement) {
            roomIdElement.textContent = formatted
            roomIdElement.dataset.roomCode = roomId
        }

        if (roomCopyButton) {
            roomCopyButton.disabled = false
        }

        if (leaveButton) {
            leaveButton.hidden = false
        }

        roomCodeManager.saveRoomCode(roomId)
        this.updatePlayersList()
        this.broadcastOwnRoom()
        this.updateConnectionSummary()
    }

    /**
     * Handle room closed
     */
    handleRoomClosed() {
        this.isInRoom = false
        this.isHosting = false
        this.room = null
        this.clearActionHandlers()
        peerLatencyManager.clearAllPeers()
        peerLatencyManager.stopPingLoop()
        
        // Clear room info from discovery manager
        roomDiscoveryManager.setCurrentRoomInfo(null)
        
        this.updateConnectionState('idle')

        // Update UI elements if they exist
        const roomIdElement = document.getElementById('room-id')
        const roomCopyButton = document.getElementById('room-copy-button')
        const leaveButton = document.getElementById('leave-room-button')

        if (roomIdElement) {
            roomIdElement.textContent = 'Not connected'
            delete roomIdElement.dataset.roomCode
        }

        if (roomCopyButton) {
            roomCopyButton.disabled = true
        }

        if (leaveButton) {
            leaveButton.hidden = true
        }

        this.updatePlayersList()
        this.updateConnectionSummary()
    }

    /**
     * Start peer actions
     */
    startPeerActions() {
        if (!this.room || !this.networkManager) return

        const actions = {
            peerInfo: this.networkManager.createAction('peerInfo'),
            roomInfo: this.networkManager.createAction('roomInfo'),
            roomDisc: this.networkManager.createAction('roomDisc'),
            ping: this.networkManager.createAction('ping')
        }

        this.sendPeerInfo = actions.peerInfo[0]
        this.getPeerInfo = actions.peerInfo[1]
        this.sendRoomInfo = actions.roomInfo[0]
        this.getRoomInfo = actions.roomInfo[1]
        this.sendRoomDiscovery = actions.roomDisc[0]
        this.getRoomDiscovery = actions.roomDisc[1]
        this.sendPing = actions.ping[0]
        this.getPing = actions.ping[1]

        // Set up handlers
        peerLatencyManager.setupPingHandler(this.getPing, this.sendPing)
        peerLatencyManager.setupPeerInfoHandler(this.getPeerInfo)
        peerLatencyManager.startPingLoop(this.sendPing)

        roomDiscoveryManager.setupDiscoveryHandlers(
            {
                sendRoomInfo: this.sendRoomInfo,
                getRoomInfo: this.getRoomInfo,
                sendRoomDiscovery: this.sendRoomDiscovery,
                getRoomDiscovery: this.getRoomDiscovery
            },
            this.selectedProviderId,
            this.currentPeerName
        )

        this.announceSelf()
        this.broadcastOwnRoom()
    }

    /**
     * Clear action handlers
     */
    clearActionHandlers() {
        this.sendPeerInfo = null
        this.getPeerInfo = null
        this.sendPing = null
        this.getPing = null
        this.sendRoomInfo = null
        this.getRoomInfo = null
        this.sendRoomDiscovery = null
        this.getRoomDiscovery = null
    }

    /**
     * Announce self to other peers
     */
    announceSelf() {
        if (!this.sendPeerInfo || !this.currentPeerName) return
        const selfId = this.getSelfPeerId()
        peerLatencyManager.announceSelf(this.sendPeerInfo, selfId, this.currentPeerName)
    }

    /**
     * Get self peer ID
     * @returns {string} Self peer ID
     */
    getSelfPeerId() {
        if (!this.room || typeof this.room.getSelfId !== 'function') return 'self'
        return this.room.getSelfId()
    }

    /**
     * Broadcast own room
     */
    broadcastOwnRoom() {
        if (!this.isInRoom || !this.currentPeerName) return
        
        // Update room discovery manager with current room info
        const roomInfo = this.getCurrentRoomInfoForDiscovery()
        roomDiscoveryManager.setCurrentRoomInfo(roomInfo)
        
        roomDiscoveryManager.respondToDiscovery()
    }

    /**
     * Get current room info for discovery
     * @returns {Object|null} Current room info
     */
    getCurrentRoomInfoForDiscovery() {
        if (!this.isInRoom || !this.currentPeerName) return null
        
        const peers = typeof this.networkManager?.getPeers === 'function' ? this.networkManager.getPeers() : {}
        const roomId = this.room ? this.room.getSelfId?.() : null
        
        if (!roomId) return null
        
        return {
            id: roomId,
            roomId: roomId,
            name: `Room ${roomCodeManager.formatRoomCode(roomId)}`,
            playerCount: Object.keys(peers || {}).length + 1,
            maxPlayers: 8,
            hostName: this.currentPeerName,
            providerId: this.selectedProviderId,
            creatorId: roomDiscoveryManager.selfClientId,
            lastSeen: Date.now()
        }
    }

    /**
     * Update connection state
     * @param {string} state - New connection state
     */
    updateConnectionState(state) {
        this.connectionState = state
        const statusText = this.options.connectionStates[state] || this.options.connectionStates.idle
        
        // Update UI element if it exists
        const statusElement = document.getElementById('connection-status-text')
        if (statusElement) {
            statusElement.textContent = statusText
        }

        this.announceStatus(statusText)
        this.updateConnectionSummary()

        if (this.eventHandlers.onConnectionStateChange) {
            this.eventHandlers.onConnectionStateChange(state, statusText)
        }
    }

    /**
     * Update connection summary
     */
    updateConnectionSummary() {
        const providerLabel = this.getProviderLabel(this.selectedProviderId)
        const qualityElement = document.getElementById('connection-quality')
        
        if (qualityElement) {
            if (!this.isInRoom) {
                qualityElement.textContent = `Idle (${providerLabel})`
            } else {
                qualityElement.textContent = `${this.options.connectionStates[this.connectionState] || 'Linked'} (${providerLabel})`
            }
        }
    }

    /**
     * Update players list
     */
    updatePlayersList() {
        const listElement = document.getElementById('players-list')
        const countElement = document.getElementById('players-count')
        
        if (!listElement) return

        const peers = this.isInRoom && typeof this.networkManager?.getPeers === 'function' 
            ? this.networkManager.getPeers() 
            : {}

        const entries = []

        if (this.isInRoom && this.currentPeerName) {
            entries.push({
                peerId: this.getSelfPeerId(),
                name: this.currentPeerName,
                latency: 0,
                isSelf: true
            })
        }

        Object.keys(peers || {}).forEach((peerId) => {
            entries.push({
                peerId,
                name: peerLatencyManager.getPeerName(peerId) || `Player ${peerId.slice(0, 4).toUpperCase()}`,
                latency: peerLatencyManager.getPeerLatency(peerId),
                isSelf: false
            })
        })

        if (entries.length === 0) {
            listElement.innerHTML = '<li class="player-item empty" role="listitem">No players connected</li>'
            this.announcePlayers(0)
            return
        }

        const markup = entries.map((entry) => {
            const latency = entry.isSelf ? 'You' : (typeof entry.latency === 'number' ? `${entry.latency} ms` : '-- ms')
            const avatar = entry.name.charAt(0).toUpperCase()
            const status = entry.isSelf ? 'You' : 'Ally'
            return `
                <li class="player-item${entry.isSelf ? ' self' : ''}" role="listitem">
                    <span class="player-avatar" aria-hidden="true">${avatar}</span>
                    <span class="player-details">
                        <span class="player-name">${entry.name}</span>
                        <span class="player-meta">${status} | ${latency}</span>
                    </span>
                </li>
            `
        }).join('')

        listElement.innerHTML = markup
        this.announcePlayers(entries.length)

        // Update count element
        if (countElement) {
            const totalPlayers = this.isInRoom ? entries.length : 0
            const countLabel = totalPlayers === 1 ? '1 online' : `${totalPlayers} online`
            countElement.textContent = countLabel
        }

        if (this.eventHandlers.onPlayerListUpdate) {
            this.eventHandlers.onPlayerListUpdate(entries)
        }
    }

    /**
     * Update room list
     */
    updateRoomList() {
        const roomListElement = document.getElementById('room-list')
        if (!roomListElement) return

        const rooms = this.roomStore.getRooms(this.selectedProviderId)
        
        if (!rooms || rooms.length === 0) {
            roomListElement.innerHTML = `
                <div class="room-item empty" role="listitem">
                    <div class="room-name">No rooms yet</div>
                    <div class="room-details">Nearby rooms: No rooms found. Hit Discover, then pick one.</div>
                </div>
            `
            return
        }

        const sorted = [...rooms].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
        roomListElement.innerHTML = sorted.map(this.renderRoomRow).join('')

        if (this.eventHandlers.onRoomListUpdate) {
            this.eventHandlers.onRoomListUpdate(rooms)
        }
    }

    /**
     * Render room row HTML
     * @param {Object} roomInfo - Room information
     * @returns {string} HTML string
     */
    renderRoomRow(roomInfo) {
        const isFull = roomInfo.playerCount >= (roomInfo.maxPlayers || 8)
        const buttonLabel = isFull ? 'Full' : 'Join'
        const disabledAttr = isFull ? 'disabled' : ''
        const code = roomCodeManager.formatRoomCode(roomInfo.roomId || roomInfo.id || '')
        const seenMs = roomInfo.lastSeen ? Date.now() - roomInfo.lastSeen : 0
        const seenLabel = !seenMs ? 'just now' : seenMs < 60000 ? `${Math.max(1, Math.floor(seenMs / 1000))}s ago` : `${Math.floor(seenMs / 60000)}m ago`
        
        return `
            <div class="room-item" role="listitem" data-room="${roomInfo.roomId || roomInfo.id}">
                <div class="room-row">
                    <div class="room-main">
                        <div class="room-name">${roomInfo.name || `Room ${code || ''}`}</div>
                        <div class="room-details">
                            <span>${code || '---'}</span>
                            <span>${roomInfo.playerCount || 0}/${roomInfo.maxPlayers || 8}</span>
                            <span>${seenLabel}</span>
                        </div>
                    </div>
                    <button type="button" class="button button-quiet join-room-button" data-room="${roomInfo.roomId || roomInfo.id}" ${disabledAttr}>${buttonLabel}</button>
                </div>
            </div>
        `
    }

    /**
     * Start all timers
     */
    startTimers() {
        // Status update timer
        this.statusTimer = setInterval(() => {
            this.updateStatus()
        }, this.options.intervals.statusUpdate)

        // Passive refresh timer
        this.refreshTimer = setInterval(() => {
            this.refreshRoomList(true)
        }, this.options.intervals.passiveRefresh)

        // Room cleanup timer
        this.cleanupTimer = setInterval(() => {
            this.pruneRoomStore()
        }, this.options.intervals.roomCleanup)

        // Broadcast timer
        this.broadcastTimer = setInterval(() => {
            if (this.isInRoom) {
                this.broadcastOwnRoom()
            }
        }, this.options.intervals.broadcastRefresh)
    }

    /**
     * Stop all timers
     */
    stopTimers() {
        if (this.statusTimer) {
            clearInterval(this.statusTimer)
            this.statusTimer = null
        }
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer)
            this.refreshTimer = null
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
            this.cleanupTimer = null
        }
        if (this.broadcastTimer) {
            clearInterval(this.broadcastTimer)
            this.broadcastTimer = null
        }
    }

    /**
     * Update status
     */
    updateStatus() {
        if (!this.networkManager) return

        const peers = typeof this.networkManager.getPeers === 'function' ? this.networkManager.getPeers() : {}
        const remoteCount = Object.keys(peers || {}).length
        const totalPlayers = this.isInRoom ? remoteCount + 1 : 0

        this.updatePlayersList()
    }

    /**
     * Prune room store
     */
    pruneRoomStore() {
        const removed = this.roomStore.cleanup(this.isInRoom ? 60000 : 30000)
        if (removed) {
            this.updateRoomList()
        }
    }

    /**
     * Initialize broadcast channel
     */
    initializeBroadcastChannel() {
        if (!broadcastManager.isBroadcastSupported()) return
        broadcastManager.getChannel(this.selectedProviderId)
    }

    /**
     * Initialize room discovery system
     */
    initializeRoomDiscovery() {
        // Set up room store in discovery manager
        roomDiscoveryManager.setRoomStore(this.roomStore)
        
        // Override room store notifyUpdate to trigger UI updates
        this.roomStore.notifyUpdate = () => {
            this.updateRoomList()
        }
        
        // Set up broadcast channel handler
        broadcastManager.setMessageHandler(this.selectedProviderId, (data) => {
            roomDiscoveryManager.handleBroadcastMessage(data, this.selectedProviderId)
        })
        
        // Update provider and peer name
        roomDiscoveryManager.updateProvider(this.selectedProviderId)
        roomDiscoveryManager.updatePeerName(this.currentPeerName)
    }

    /**
     * Update provider
     * @param {string} providerId - New provider ID
     */
    updateProvider(providerId) {
        this.selectedProviderId = providerId
        roomDiscoveryManager.updateProvider(providerId)
        broadcastManager.closeChannel(this.selectedProviderId)
        broadcastManager.getChannel(providerId)
        
        // Update broadcast channel handler for new provider
        broadcastManager.setMessageHandler(providerId, (data) => {
            roomDiscoveryManager.handleBroadcastMessage(data, providerId)
        })
        
        this.updateRoomList()
        this.updateConnectionSummary()
    }

    /**
     * Update peer name
     * @param {string} name - New peer name
     */
    updatePeerName(name) {
        this.currentPeerName = name || this.generatePeerName(true)
        this.saveName(this.currentPeerName)

        // Update room discovery manager
        roomDiscoveryManager.updatePeerName(this.currentPeerName)

        // Update UI element if it exists
        const peerNameElement = document.getElementById('peer-name')
        if (peerNameElement) {
            peerNameElement.textContent = this.currentPeerName
        }

        if (this.room && this.sendPeerInfo) {
            const selfId = this.getSelfPeerId()
            peerLatencyManager.updatePeerName(this.sendPeerInfo, selfId, this.currentPeerName)
        }

        this.updatePlayersList()
    }

    /**
     * Get provider label
     * @param {string} providerId - Provider ID
     * @returns {string} Provider label
     */
    getProviderLabel(providerId = this.selectedProviderId) {
        const labels = {
            torrent: 'WebTorrent',
            mqtt: 'MQTT',
            firebase: 'Firebase',
            ipfs: 'IPFS',
            supabase: 'Supabase'
        }
        return labels[providerId] || 'Custom'
    }

    /**
     * Show status toast
     * @param {string} message - Message to show
     * @param {string} type - Alert type
     */
    showStatusToast(message, type = AlertTypes.INFO) {
        showAlert(message, type)
    }

    /**
     * Announce players count
     * @param {number} count - Player count
     */
    announcePlayers(count) {
        const announcer = document.getElementById('players-announcer')
        if (announcer) {
            announcer.textContent = `Players: ${count}`
        }
    }

    /**
     * Announce status
     * @param {string} message - Status message
     */
    announceStatus(message) {
        const announcer = document.getElementById('status-announcer')
        if (announcer) {
            announcer.textContent = `Status update: ${message}`
        }
    }

    /**
     * Handle error
     * @param {Error} error - Error to handle
     */
    handleError(error) {
        console.error('Coordinator error:', error)
        this.showStatusToast(error.message || 'Something went wrong', AlertTypes.ERROR)
        this.updateConnectionState(this.isInRoom ? 'reconnecting' : 'idle')

        if (this.eventHandlers.onError) {
            this.eventHandlers.onError(error)
        }
    }

    /**
     * Set event handler
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    on(eventName, handler) {
        if (this.eventHandlers.hasOwnProperty(eventName)) {
            this.eventHandlers[eventName] = handler
        }
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return {
            isInRoom: this.isInRoom,
            isHosting: this.isHosting,
            connectionState: this.connectionState,
            selectedProviderId: this.selectedProviderId,
            currentPeerName: this.currentPeerName,
            roomId: this.room ? this.room.getSelfId?.() : null
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopTimers()
        this.clearActionHandlers()
        peerLatencyManager.destroy()
        roomDiscoveryManager.destroy()
        broadcastManager.destroy()
        
        if (this.networkManager) {
            this.networkManager.leaveRoom()
        }
    }
}

export default MultiplayerDemoCoordinator
