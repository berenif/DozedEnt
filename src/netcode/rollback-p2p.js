/**
 * WebRTC P2P Input Exchange for Rollback Netcode
 * Handles peer connections and ultra-low latency input exchange
 */

import { createLogger } from '../utils/logger.js'
import { toJson, fromJson, genId } from '../utils.js'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

const HEARTBEAT_INTERVAL = 1000 // 1 second
const CONNECTION_TIMEOUT = 10000 // 10 seconds

class RollbackP2P {
  constructor(config = {}) {
    this.config = {
      iceServers: config.iceServers || ICE_SERVERS,
      heartbeatInterval: config.heartbeatInterval || HEARTBEAT_INTERVAL,
      connectionTimeout: config.connectionTimeout || CONNECTION_TIMEOUT,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Peer management
    this.localPeerId = genId()
    this.peers = new Map() // peerId -> peer connection info
    this.dataChannels = new Map() // peerId -> RTCDataChannel
    
    // Callbacks
    this.onPeerConnected = null
    this.onPeerDisconnected = null
    this.onInputReceived = null
    this.onSyncTestReceived = null
    
    // Connection state
    this.signalingChannel = null
    this.heartbeatIntervals = new Map()
  }
  
  /**
   * Initialize P2P system with signaling channel
   */
  initialize(signalingChannel, localPeerId = null) {
    if (localPeerId) {
      this.localPeerId = localPeerId
    }
    
    this.signalingChannel = signalingChannel
    this.setupSignalingHandlers()
    
    this.logger.info('P2P system initialized', { localPeerId: this.localPeerId })
  }
  
  /**
   * Set up signaling message handlers
   */
  setupSignalingHandlers() {
    if (!this.signalingChannel) {return}
    
    // Handle incoming offers
    this.signalingChannel.onOffer = async (peerId, offer) => {
      this.logger.debug('Received offer', { from: peerId })
      await this.handleOffer(peerId, offer)
    }
    
    // Handle incoming answers
    this.signalingChannel.onAnswer = async (peerId, answer) => {
      this.logger.debug('Received answer', { from: peerId })
      await this.handleAnswer(peerId, answer)
    }
    
    // Handle ICE candidates
    this.signalingChannel.onIceCandidate = async (peerId, candidate) => {
      await this.handleIceCandidate(peerId, candidate)
    }
  }
  
  /**
   * Connect to a peer
   */
  async connectToPeer(peerId) {
    if (this.peers.has(peerId)) {
      this.logger.warn('Already connected to peer', { peerId })
      return
    }
    
    this.logger.info('Connecting to peer', { peerId })
    
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers
    })
    
    // Store peer info
    const peerInfo = {
      id: peerId,
      connection: pc,
      isInitiator: true,
      connected: false,
      lastHeartbeat: Date.now()
    }
    this.peers.set(peerId, peerInfo)
    
    // Set up ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.signalingChannel) {
        this.signalingChannel.sendIceCandidate(peerId, event.candidate)
      }
    }
    
    // Create data channel for input exchange
    const dataChannel = pc.createDataChannel('rollback-inputs', {
      ordered: false, // We don't need ordering for inputs
      maxRetransmits: 0, // No retransmission for lowest latency
      negotiated: false
    })
    
    this.setupDataChannel(peerId, dataChannel)
    
    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    // Send offer through signaling
    if (this.signalingChannel) {
      this.signalingChannel.sendOffer(peerId, offer)
    }
    
    // Set connection timeout
    setTimeout(() => {
      if (!peerInfo.connected) {
        this.logger.warn('Connection timeout', { peerId })
        this.disconnectPeer(peerId)
      }
    }, this.config.connectionTimeout)
  }
  
  /**
   * Handle incoming offer
   */
  async handleOffer(peerId, offer) {
    if (this.peers.has(peerId)) {
      this.logger.warn('Peer already exists', { peerId })
      return
    }
    
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers
    })
    
    // Store peer info
    const peerInfo = {
      id: peerId,
      connection: pc,
      isInitiator: false,
      connected: false,
      lastHeartbeat: Date.now()
    }
    this.peers.set(peerId, peerInfo)
    
    // Set up ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && this.signalingChannel) {
        this.signalingChannel.sendIceCandidate(peerId, event.candidate)
      }
    }
    
    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      this.logger.debug('Data channel received', { peerId })
      this.setupDataChannel(peerId, event.channel)
    }
    
    // Set remote description and create answer
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    // Send answer through signaling
    if (this.signalingChannel) {
      this.signalingChannel.sendAnswer(peerId, answer)
    }
  }
  
  /**
   * Handle incoming answer
   */
  async handleAnswer(peerId, answer) {
    const peerInfo = this.peers.get(peerId)
    if (!peerInfo) {
      this.logger.warn('No peer found for answer', { peerId })
      return
    }
    
    await peerInfo.connection.setRemoteDescription(answer)
  }
  
  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(peerId, candidate) {
    const peerInfo = this.peers.get(peerId)
    if (!peerInfo) {
      this.logger.warn('No peer found for ICE candidate', { peerId })
      return
    }
    
    try {
      await peerInfo.connection.addIceCandidate(candidate)
    } catch (error) {
      this.logger.error('Failed to add ICE candidate', { peerId, error })
    }
  }
  
  /**
   * Set up data channel handlers
   */
  setupDataChannel(peerId, dataChannel) {
    this.dataChannels.set(peerId, dataChannel)
    
    dataChannel.onopen = () => {
      this.logger.info('Data channel opened', { peerId })
      
      const peerInfo = this.peers.get(peerId)
      if (peerInfo) {
        peerInfo.connected = true
      }
      
      // Start heartbeat
      this.startHeartbeat(peerId)
      
      // Notify connection
      if (this.onPeerConnected) {
        this.onPeerConnected(peerId)
      }
    }
    
    dataChannel.onclose = () => {
      this.logger.info('Data channel closed', { peerId })
      this.handlePeerDisconnection(peerId)
    }
    
    dataChannel.onerror = (error) => {
      this.logger.error('Data channel error', { peerId, error })
    }
    
    dataChannel.onmessage = (event) => {
      this.handleMessage(peerId, event.data)
    }
  }
  
  /**
   * Handle incoming message
   */
  handleMessage(peerId, data) {
    try {
      const message = fromJson(data)
      
      switch (message.type) {
        case 'input':
          if (this.onInputReceived) {
            this.onInputReceived(peerId, message.frame, message.input)
          }
          break
          
        case 'sync_test':
          if (this.onSyncTestReceived) {
            this.onSyncTestReceived(peerId, message.frame, message.checksum)
          }
          break
          
        case 'heartbeat': {
          const peerInfo = this.peers.get(peerId)
          if (peerInfo) {
            peerInfo.lastHeartbeat = Date.now()
          }
          break
        }
          
        default:
          this.logger.warn('Unknown message type', { type: message.type, peerId })
      }
    } catch (error) {
      this.logger.error('Failed to parse message', { peerId, error })
    }
  }
  
  /**
   * Send input to all peers
   */
  broadcastInput(frame, input) {
    const message = toJson({
      type: 'input',
      frame: frame,
      input: input,
      timestamp: Date.now()
    })
    
    for (const [peerId, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(message)
        } catch (error) {
          this.logger.error('Failed to send input', { peerId, error })
        }
      }
    }
  }
  
  /**
   * Send sync test to all peers
   */
  broadcastSyncTest(frame, checksum) {
    const message = toJson({
      type: 'sync_test',
      frame: frame,
      checksum: checksum,
      timestamp: Date.now()
    })
    
    for (const [peerId, channel] of this.dataChannels) {
      if (channel.readyState === 'open') {
        try {
          channel.send(message)
        } catch (error) {
          this.logger.error('Failed to send sync test', { peerId, error })
        }
      }
    }
  }
  
  /**
   * Start heartbeat for a peer
   */
  startHeartbeat(peerId) {
    // Clear existing heartbeat if any
    this.stopHeartbeat(peerId)
    
    const interval = setInterval(() => {
      const channel = this.dataChannels.get(peerId)
      if (channel && channel.readyState === 'open') {
        try {
          channel.send(toJson({ type: 'heartbeat', timestamp: Date.now() }))
        } catch (error) {
          this.logger.error('Failed to send heartbeat', { peerId, error })
        }
      }
      
      // Check for timeout
      const peerInfo = this.peers.get(peerId)
      if (peerInfo) {
        const timeSinceLastHeartbeat = Date.now() - peerInfo.lastHeartbeat
        if (timeSinceLastHeartbeat > this.config.connectionTimeout) {
          this.logger.warn('Peer heartbeat timeout', { peerId })
          this.disconnectPeer(peerId)
        }
      }
    }, this.config.heartbeatInterval)
    
    this.heartbeatIntervals.set(peerId, interval)
  }
  
  /**
   * Stop heartbeat for a peer
   */
  stopHeartbeat(peerId) {
    const interval = this.heartbeatIntervals.get(peerId)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(peerId)
    }
  }
  
  /**
   * Handle peer disconnection
   */
  handlePeerDisconnection(peerId) {
    this.stopHeartbeat(peerId)
    this.dataChannels.delete(peerId)
    
    const peerInfo = this.peers.get(peerId)
    if (peerInfo) {
      peerInfo.connected = false
    }
    
    if (this.onPeerDisconnected) {
      this.onPeerDisconnected(peerId)
    }
  }
  
  /**
   * Disconnect from a peer
   */
  disconnectPeer(peerId) {
    this.logger.info('Disconnecting peer', { peerId })
    
    // Close data channel
    const channel = this.dataChannels.get(peerId)
    if (channel) {
      channel.close()
    }
    
    // Close peer connection
    const peerInfo = this.peers.get(peerId)
    if (peerInfo && peerInfo.connection) {
      peerInfo.connection.close()
    }
    
    // Clean up
    this.stopHeartbeat(peerId)
    this.peers.delete(peerId)
    this.dataChannels.delete(peerId)
    
    if (this.onPeerDisconnected) {
      this.onPeerDisconnected(peerId)
    }
  }
  
  /**
   * Disconnect from all peers
   */
  disconnectAll() {
    for (const peerId of this.peers.keys()) {
      this.disconnectPeer(peerId)
    }
  }
  
  /**
   * Get connection statistics
   */
  async getStats(peerId = null) {
    const stats = {}
    
    const peerIds = peerId ? [peerId] : Array.from(this.peers.keys())
    
    for (const id of peerIds) {
      const peerInfo = this.peers.get(id)
      if (!peerInfo || !peerInfo.connection) {continue}
      
      const rtcStats = await peerInfo.connection.getStats()
      const peerStats = {
        connected: peerInfo.connected,
        rtt: null,
        packetLoss: null,
        bytesReceived: 0,
        bytesSent: 0
      }
      
      rtcStats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          peerStats.rtt = report.currentRoundTripTime * 1000 // Convert to ms
        }
        if (report.type === 'inbound-rtp') {
          peerStats.packetLoss = report.packetsLost
          peerStats.bytesReceived = report.bytesReceived
        }
        if (report.type === 'outbound-rtp') {
          peerStats.bytesSent = report.bytesSent
        }
      })
      
      stats[id] = peerStats
    }
    
    return stats
  }
}

export default RollbackP2P