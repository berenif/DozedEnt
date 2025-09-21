/**
 * MultiplayerDemoUI Manager
 * Coordinates all UI components for the multiplayer demo
 */
import { RoomForge } from './components/room-forge.js'
import { SignalStatus } from './components/signal-status.js'
import { SquadRoster } from './components/squad-roster.js'
import { ChatIntegration } from './components/chat-integration.js'
import { LogPanel } from './components/log-panel.js'

export class MultiplayerDemoUI {
    constructor(options = {}) {
        this.options = {
            containerId: options.containerId || 'demo-container',
            onRoomCreate: options.onRoomCreate || (() => {}),
            onRoomJoin: options.onRoomJoin || (() => {}),
            onRoomLeave: options.onRoomLeave || (() => {}),
            onDiscoverRooms: options.onDiscoverRooms || (() => {}),
            onRefreshRooms: options.onRefreshRooms || (() => {}),
            onSendMessage: options.onSendMessage || (() => {}),
            onSendRandomMessage: options.onSendRandomMessage || (() => {}),
            onClearChat: options.onClearChat || (() => {}),
            onToggleMute: options.onToggleMute || (() => {}),
            onRefreshPeers: options.onRefreshPeers || (() => {}),
            onPingAllPeers: options.onPingAllPeers || (() => {}),
            onPeerNameChange: options.onPeerNameChange || (() => {}),
            onExportLogs: options.onExportLogs || (() => {}),
            ...options
        }
        
        this.components = {}
        this.isInitialized = false
        this.currentState = {
            isInRoom: false,
            isHostingRoom: false,
            currentPeerName: 'BoldChick',
            roomId: 'Not Connected',
            peerCount: 0,
            connectionQuality: 'Link idle - MQTT',
            selectedProvider: 'mqtt',
            peers: {},
            peerNames: new Map(),
            roomCreationCooldown: false,
            roomJoinCooldown: false,
            cooldownTime: 0
        }
    }

    /**
     * Initialize the MultiplayerDemoUI system
     */
    async init() {
        if (this.isInitialized) {
            console.warn('MultiplayerDemoUI already initialized')
            return this
        }

        try {
            // Initialize all components
            await this.initializeComponents()
            
            // Set up component coordination
            this.setupComponentCoordination()
            
            // Initial UI state
            this.updateUIState()
            
            this.isInitialized = true
            this.log('MultiplayerDemoUI initialized successfully', 'success')
            
            return this
        } catch (error) {
            console.error('Failed to initialize MultiplayerDemoUI:', error)
            throw error
        }
    }

    /**
     * Initialize all UI components
     */
    async initializeComponents() {
        // RoomForge component
        this.components.roomForge = new RoomForge('room-forge-container', {
            onRoomCreate: () => this.handleRoomCreate(),
            onRoomJoin: () => this.handleRoomJoin(),
            onRoomLeave: () => this.handleRoomLeave(),
            onDiscoverRooms: () => this.handleDiscoverRooms(),
            onRefreshRooms: () => this.handleRefreshRooms(),
            onProviderChange: (providerId) => this.handleProviderChange(providerId)
        }).init()

        // SignalStatus component
        this.components.signalStatus = new SignalStatus('signal-status-container', {
            onPeerNameChange: () => this.handlePeerNameChange()
        }).init()

        // SquadRoster component
        this.components.squadRoster = new SquadRoster('squad-roster-container', {
            onRefreshPeers: () => this.handleRefreshPeers(),
            onPingAllPeers: () => this.handlePingAllPeers(),
            onLeaveRoom: () => this.handleRoomLeave()
        }).init()

        // ChatIntegration component
        this.components.chatIntegration = new ChatIntegration('chat-integration-container', {
            onSendMessage: (message) => this.handleSendMessage(message),
            onSendRandomMessage: () => this.handleSendRandomMessage(),
            onClearChat: () => this.handleClearChat(),
            onToggleMute: (isMuted) => this.handleToggleMute(isMuted)
        }).init()

        // LogPanel component
        this.components.logPanel = new LogPanel('log-panel-container', {
            onExportLogs: (logs) => this.handleExportLogs(logs)
        }).init()
    }

    /**
     * Set up coordination between components
     */
    setupComponentCoordination() {
        // Set initial peer name for chat
        this.components.chatIntegration.setCurrentPeerName(this.currentState.currentPeerName)
    }

    /**
     * Handle room creation
     */
    handleRoomCreate() {
        this.log('Room creation requested', 'info')
        this.options.onRoomCreate()
    }

    /**
     * Handle room joining
     */
    handleRoomJoin() {
        this.log('Room join requested', 'info')
        this.options.onRoomJoin()
    }

    /**
     * Handle room leaving
     */
    handleRoomLeave() {
        this.log('Room leave requested', 'info')
        this.options.onRoomLeave()
    }

    /**
     * Handle room discovery
     */
    handleDiscoverRooms() {
        this.log('Room discovery requested', 'info')
        this.options.onDiscoverRooms()
    }

    /**
     * Handle room list refresh
     */
    handleRefreshRooms() {
        this.log('Room list refresh requested', 'info')
        this.options.onRefreshRooms()
    }

    /**
     * Handle provider change
     */
    handleProviderChange(providerId) {
        this.currentState.selectedProvider = providerId
        this.log(`Network provider changed to: ${providerId}`, 'info')
        this.updateUIState()
    }

    /**
     * Handle message sending
     */
    handleSendMessage(message) {
        this.log(`Sending message: ${message}`, 'info')
        this.options.onSendMessage(message)
    }

    /**
     * Handle random message sending
     */
    handleSendRandomMessage() {
        this.log('Sending random message', 'info')
        this.options.onSendRandomMessage()
    }

    /**
     * Handle chat clearing
     */
    handleClearChat() {
        this.log('Chat cleared', 'info')
        this.options.onClearChat()
    }

    /**
     * Handle chat mute toggle
     */
    handleToggleMute(isMuted) {
        this.log(`Chat ${isMuted ? 'muted' : 'unmuted'}`, 'info')
        this.options.onToggleMute(isMuted)
    }

    /**
     * Handle peer refresh
     */
    handleRefreshPeers() {
        this.log('Peer list refresh requested', 'info')
        this.options.onRefreshPeers()
    }

    /**
     * Handle ping all peers
     */
    handlePingAllPeers() {
        this.log('Ping all peers requested', 'info')
        this.options.onPingAllPeers()
    }

    /**
     * Handle peer name change
     */
    handlePeerNameChange() {
        this.log('Peer name change requested', 'info')
        this.options.onPeerNameChange()
    }

    /**
     * Handle log export
     */
    handleExportLogs(logs) {
        this.log('Logs exported', 'success')
        this.options.onExportLogs(logs)
    }

    /**
     * Update the entire UI state
     */
    updateUIState() {
        if (!this.isInitialized) return

        // Update room forge
        this.components.roomForge.updateButtonVisibility(
            this.currentState.isInRoom,
            this.currentState.roomCreationCooldown || this.currentState.roomJoinCooldown,
            this.currentState.cooldownTime
        )
        this.components.roomForge.updateNearbyRoomsVisibility(this.currentState.isInRoom)
        this.components.roomForge.setVisible(!this.currentState.isInRoom)

        // Update signal status
        this.components.signalStatus.updateStatus({
            roomId: this.currentState.roomId,
            peerCount: this.currentState.peerCount,
            connectionQuality: this.currentState.connectionQuality,
            peerName: this.currentState.currentPeerName,
            providerLabel: this.getProviderLabel(this.currentState.selectedProvider),
            isInRoom: this.currentState.isInRoom,
            remotePeerCount: Object.keys(this.currentState.peers).length
        })

        // Update squad roster
        this.components.squadRoster.updateSquadRoster({
            peers: this.currentState.peers,
            currentPeerName: this.currentState.currentPeerName,
            isInRoom: this.currentState.isInRoom,
            peerNames: this.currentState.peerNames
        })
        this.components.squadRoster.setVisible(this.currentState.isInRoom)

        // Update chat integration
        this.components.chatIntegration.setCurrentPeerName(this.currentState.currentPeerName)
    }

    /**
     * Update room list
     */
    updateRoomList(rooms) {
        if (!this.isInitialized || !this.components.roomForge) return
        this.components.roomForge.updateRoomList(rooms, this.getProviderLabel(this.currentState.selectedProvider))
    }

    /**
     * Update peer list
     */
    updatePeerList(peers, peerNames) {
        this.currentState.peers = peers || {}
        this.currentState.peerNames = peerNames || new Map()
        this.currentState.peerCount = Object.keys(this.currentState.peers).length + (this.currentState.isInRoom ? 1 : 0)
        this.updateUIState()
    }

    /**
     * Update room status
     */
    updateRoomStatus(roomId, isInRoom, isHostingRoom = false) {
        this.currentState.roomId = roomId || 'Not Connected'
        this.currentState.isInRoom = isInRoom
        this.currentState.isHostingRoom = isHostingRoom
        this.updateUIState()
    }

    /**
     * Update connection quality
     */
    updateConnectionQuality(quality) {
        this.currentState.connectionQuality = quality
        this.updateUIState()
    }

    /**
     * Update peer name
     */
    updatePeerName(peerName) {
        this.currentState.currentPeerName = peerName
        this.components.chatIntegration.setCurrentPeerName(peerName)
        this.updateUIState()
    }

    /**
     * Update cooldown status
     */
    updateCooldownStatus(creationCooldown, joinCooldown, cooldownTime) {
        this.currentState.roomCreationCooldown = creationCooldown
        this.currentState.roomJoinCooldown = joinCooldown
        this.currentState.cooldownTime = cooldownTime
        this.updateUIState()
    }

    /**
     * Add a log entry
     */
    log(message, type = 'info') {
        if (!this.isInitialized || !this.components.logPanel) return
        this.components.logPanel.addLog(message, type)
    }

    /**
     * Add a chat message
     */
    addChatMessage(sender, message, isSystem = false, isSelf = false) {
        if (!this.isInitialized || !this.components.chatIntegration) return
        this.components.chatIntegration.addChatMessage(sender, message, isSystem, isSelf)
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(message) {
        if (!this.isInitialized || !this.components.chatIntegration) return
        this.components.chatIntegration.handleIncomingMessage(message)
    }

    /**
     * Get provider label
     */
    getProviderLabel(providerId) {
        const labels = {
            torrent: 'Torrent (BitTorrent)',
            firebase: 'Firebase',
            ipfs: 'IPFS',
            mqtt: 'MQTT',
            supabase: 'Supabase'
        }
        return labels[providerId] || providerId
    }

    /**
     * Get current UI state
     */
    getCurrentState() {
        return { ...this.currentState }
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components[name]
    }

    /**
     * Clean up all components and resources
     */
    destroy() {
        if (!this.isInitialized) return

        // Destroy all components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy()
            }
        })

        this.components = {}
        this.isInitialized = false
    }
}
