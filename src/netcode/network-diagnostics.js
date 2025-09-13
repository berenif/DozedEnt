/**
 * Network Diagnostics and Quality Metrics System
 * Provides comprehensive network monitoring, quality assessment, and debugging tools
 * for multiplayer game networking
 */

import { createLogger } from '../utils/logger.js'

// Constants for network diagnostics
const MEASUREMENT_WINDOW = 60000 // 1 minute measurement windows
const PING_INTERVAL = 1000 // 1 second between pings
const BANDWIDTH_TEST_INTERVAL = 30000 // 30 seconds between bandwidth tests
const QUALITY_UPDATE_INTERVAL = 5000 // 5 seconds between quality updates
const PACKET_LOSS_THRESHOLD = 0.05 // 5% packet loss threshold
const LATENCY_THRESHOLD = 150 // 150ms latency threshold
const JITTER_THRESHOLD = 50 // 50ms jitter threshold

export class NetworkDiagnostics {
  constructor(config = {}) {
    this.config = {
      measurementWindow: config.measurementWindow || MEASUREMENT_WINDOW,
      pingInterval: config.pingInterval || PING_INTERVAL,
      bandwidthTestInterval: config.bandwidthTestInterval || BANDWIDTH_TEST_INTERVAL,
      qualityUpdateInterval: config.qualityUpdateInterval || QUALITY_UPDATE_INTERVAL,
      packetLossThreshold: config.packetLossThreshold || PACKET_LOSS_THRESHOLD,
      latencyThreshold: config.latencyThreshold || LATENCY_THRESHOLD,
      jitterThreshold: config.jitterThreshold || JITTER_THRESHOLD,
      enableAutomaticTesting: config.enableAutomaticTesting !== false,
      enableDetailedLogging: config.enableDetailedLogging !== false,
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Per-peer metrics
    this.peerMetrics = new Map() // peerId -> PeerMetrics
    
    // Global network state
    this.globalMetrics = {
      overallQuality: 'unknown',
      avgLatency: 0,
      avgPacketLoss: 0,
      avgJitter: 0,
      avgBandwidth: 0,
      connectionStability: 1.0,
      networkCondition: 'stable'
    }
    
    // Testing infrastructure
    this.testing = {
      pingIntervals: new Map(), // peerId -> interval
      bandwidthTests: new Map(), // peerId -> test state
      qualityUpdateInterval: null,
      isRunning: false
    }
    
    // Network callbacks
    this.networkCallbacks = {
      sendToPeer: null,        // (peerId, message) => void
      broadcastMessage: null,  // (message) => void
      getPeerConnection: null  // (peerId) => RTCPeerConnection
    }
    
    // Event handlers
    this.eventHandlers = {
      onQualityChanged: null,      // (peerId, quality) => void
      onNetworkConditionChanged: null, // (condition) => void
      onPeerLatencyChanged: null,  // (peerId, latency) => void
      onPacketLossDetected: null,  // (peerId, lossRate) => void
      onBandwidthMeasured: null    // (peerId, bandwidth) => void
    }
    
    // Diagnostic history
    this.history = {
      measurements: [], // Historical measurements
      events: [],       // Network events
      maxHistorySize: 1000
    }
  }
  
  /**
   * Initialize the network diagnostics system
   */
  initialize(networkCallbacks, eventHandlers = {}) {
    this.networkCallbacks = { ...this.networkCallbacks, ...networkCallbacks }
    this.eventHandlers = { ...this.eventHandlers, ...eventHandlers }
    
    if (this.config.enableAutomaticTesting) {
      this.startAutomaticTesting()
    }
    
    this.logger.info('Network diagnostics system initialized', {
      enableAutomaticTesting: this.config.enableAutomaticTesting,
      measurementWindow: this.config.measurementWindow
    })
  }
  
  /**
   * Add a peer to monitoring
   */
  addPeer(peerId, initialInfo = {}) {
    if (this.peerMetrics.has(peerId)) return
    
    const peerMetrics = {
      peerId,
      
      // Connection info
      connectionType: initialInfo.connectionType || 'unknown',
      region: initialInfo.region || 'unknown',
      
      // Latency metrics
      latency: {
        current: 0,
        min: Infinity,
        max: 0,
        avg: 0,
        samples: [],
        jitter: 0
      },
      
      // Packet loss metrics
      packetLoss: {
        sent: 0,
        received: 0,
        lost: 0,
        lossRate: 0,
        consecutiveLoss: 0
      },
      
      // Bandwidth metrics
      bandwidth: {
        upload: 0,
        download: 0,
        avgUpload: 0,
        avgDownload: 0,
        measurements: []
      },
      
      // Quality assessment
      quality: {
        overall: 'unknown',
        connection: 'unknown',
        stability: 1.0,
        score: 0
      },
      
      // Connection stability
      stability: {
        disconnections: 0,
        reconnections: 0,
        consecutiveTimeouts: 0,
        uptime: 0,
        connectionStartTime: performance.now()
      },
      
      // WebRTC specific metrics
      webrtc: {
        iceConnectionState: 'unknown',
        dtlsState: 'unknown',
        selectedCandidatePair: null,
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0
      },
      
      // Timestamps
      lastPing: 0,
      lastBandwidthTest: 0,
      lastQualityUpdate: 0,
      lastSeen: performance.now()
    }
    
    this.peerMetrics.set(peerId, peerMetrics)
    
    // Start monitoring this peer
    if (this.testing.isRunning) {
      this.startPeerMonitoring(peerId)
    }
    
    this.logger.info('Peer added to network diagnostics', { peerId })
  }
  
  /**
   * Remove a peer from monitoring
   */
  removePeer(peerId) {
    this.stopPeerMonitoring(peerId)
    this.peerMetrics.delete(peerId)
    
    this.logger.info('Peer removed from network diagnostics', { peerId })
  }
  
  /**
   * Start automatic testing for all peers
   */
  startAutomaticTesting() {
    if (this.testing.isRunning) return
    
    this.testing.isRunning = true
    
    // Start ping tests for all peers
    for (const peerId of this.peerMetrics.keys()) {
      this.startPeerMonitoring(peerId)
    }
    
    // Start global quality updates
    this.testing.qualityUpdateInterval = setInterval(() => {
      this.updateGlobalMetrics()
    }, this.config.qualityUpdateInterval)
    
    this.logger.info('Automatic network testing started')
  }
  
  /**
   * Stop automatic testing
   */
  stopAutomaticTesting() {
    if (!this.testing.isRunning) return
    
    this.testing.isRunning = false
    
    // Stop all peer monitoring
    for (const peerId of this.peerMetrics.keys()) {
      this.stopPeerMonitoring(peerId)
    }
    
    // Stop global updates
    if (this.testing.qualityUpdateInterval) {
      clearInterval(this.testing.qualityUpdateInterval)
      this.testing.qualityUpdateInterval = null
    }
    
    this.logger.info('Automatic network testing stopped')
  }
  
  /**
   * Start monitoring a specific peer
   */
  startPeerMonitoring(peerId) {
    // Start ping testing
    if (!this.testing.pingIntervals.has(peerId)) {
      const pingInterval = setInterval(() => {
        this.sendPing(peerId)
      }, this.config.pingInterval)
      
      this.testing.pingIntervals.set(peerId, pingInterval)
    }
    
    // Schedule bandwidth testing
    setTimeout(() => {
      this.startBandwidthTest(peerId)
    }, Math.random() * this.config.bandwidthTestInterval)
  }
  
  /**
   * Stop monitoring a specific peer
   */
  stopPeerMonitoring(peerId) {
    // Stop ping testing
    const pingInterval = this.testing.pingIntervals.get(peerId)
    if (pingInterval) {
      clearInterval(pingInterval)
      this.testing.pingIntervals.delete(peerId)
    }
    
    // Stop bandwidth testing
    const bandwidthTest = this.testing.bandwidthTests.get(peerId)
    if (bandwidthTest && bandwidthTest.interval) {
      clearInterval(bandwidthTest.interval)
      this.testing.bandwidthTests.delete(peerId)
    }
  }
  
  /**
   * Send ping to a peer
   */
  sendPing(peerId) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    const pingId = `ping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = performance.now()
    
    const pingMessage = {
      type: 'network_ping',
      pingId,
      timestamp,
      sendTime: timestamp
    }
    
    metrics.lastPing = timestamp
    metrics.packetLoss.sent++
    
    if (this.networkCallbacks.sendToPeer) {
      this.networkCallbacks.sendToPeer(peerId, pingMessage)
    }
    
    // Set timeout for packet loss detection
    setTimeout(() => {
      this.checkPingTimeout(peerId, pingId)
    }, 5000) // 5 second timeout
  }
  
  /**
   * Handle ping response
   */
  handlePingResponse(peerId, message) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    const now = performance.now()
    const latency = now - message.timestamp
    
    // Update latency metrics
    this.updateLatencyMetrics(metrics, latency)
    
    // Update packet loss (successful reception)
    metrics.packetLoss.received++
    metrics.packetLoss.consecutiveLoss = 0
    metrics.lastSeen = now
    
    // Update quality
    this.updatePeerQuality(peerId)
    
    if (this.config.enableDetailedLogging) {
      this.logger.debug('Ping response received', {
        peerId,
        latency,
        avgLatency: metrics.latency.avg
      })
    }
  }
  
  /**
   * Handle ping request (respond to ping)
   */
  handlePingRequest(peerId, message) {
    const pongMessage = {
      type: 'network_pong',
      pingId: message.pingId,
      timestamp: message.timestamp,
      responseTime: performance.now()
    }
    
    if (this.networkCallbacks.sendToPeer) {
      this.networkCallbacks.sendToPeer(peerId, pongMessage)
    }
  }
  
  /**
   * Check for ping timeout (packet loss)
   */
  checkPingTimeout(peerId, pingId) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    // If we haven't received a response, count as packet loss
    const timeSinceLastSeen = performance.now() - metrics.lastSeen
    if (timeSinceLastSeen > 5000) {
      metrics.packetLoss.lost++
      metrics.packetLoss.consecutiveLoss++
      
      this.updatePacketLossMetrics(metrics)
      this.updatePeerQuality(peerId)
      
      if (this.eventHandlers.onPacketLossDetected) {
        this.eventHandlers.onPacketLossDetected(peerId, metrics.packetLoss.lossRate)
      }
    }
  }
  
  /**
   * Update latency metrics for a peer
   */
  updateLatencyMetrics(metrics, latency) {
    metrics.latency.current = latency
    metrics.latency.min = Math.min(metrics.latency.min, latency)
    metrics.latency.max = Math.max(metrics.latency.max, latency)
    
    // Add to samples (keep last 100)
    metrics.latency.samples.push(latency)
    if (metrics.latency.samples.length > 100) {
      metrics.latency.samples.shift()
    }
    
    // Calculate average
    metrics.latency.avg = metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length
    
    // Calculate jitter (standard deviation)
    const variance = metrics.latency.samples.reduce((acc, val) => {
      return acc + Math.pow(val - metrics.latency.avg, 2)
    }, 0) / metrics.latency.samples.length
    
    metrics.latency.jitter = Math.sqrt(variance)
    
    // Notify if latency changed significantly
    if (this.eventHandlers.onPeerLatencyChanged) {
      this.eventHandlers.onPeerLatencyChanged(peerId, latency)
    }
  }
  
  /**
   * Update packet loss metrics
   */
  updatePacketLossMetrics(metrics) {
    const total = metrics.packetLoss.sent
    if (total > 0) {
      metrics.packetLoss.lossRate = metrics.packetLoss.lost / total
    }
  }
  
  /**
   * Start bandwidth test for a peer
   */
  startBandwidthTest(peerId) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    const testId = `bandwidth_${Date.now()}`
    const testData = new ArrayBuffer(1024) // 1KB test packet
    
    const bandwidthTest = {
      testId,
      startTime: performance.now(),
      bytesSent: 0,
      bytesReceived: 0,
      packetsReceived: 0,
      interval: null
    }
    
    this.testing.bandwidthTests.set(peerId, bandwidthTest)
    
    // Send test packets for 5 seconds
    let packetCount = 0
    bandwidthTest.interval = setInterval(() => {
      if (packetCount >= 50) { // Send 50 packets max
        this.completeBandwidthTest(peerId)
        return
      }
      
      const testMessage = {
        type: 'bandwidth_test',
        testId,
        packetId: packetCount++,
        timestamp: performance.now(),
        data: testData
      }
      
      bandwidthTest.bytesSent += 1024
      
      if (this.networkCallbacks.sendToPeer) {
        this.networkCallbacks.sendToPeer(peerId, testMessage)
      }
    }, 100) // Send every 100ms
    
    // Auto-complete after 10 seconds
    setTimeout(() => {
      this.completeBandwidthTest(peerId)
    }, 10000)
  }
  
  /**
   * Handle bandwidth test packet
   */
  handleBandwidthTest(peerId, message) {
    const bandwidthTest = this.testing.bandwidthTests.get(peerId)
    if (!bandwidthTest || bandwidthTest.testId !== message.testId) {
      return
    }
    
    bandwidthTest.bytesReceived += (message.data ? message.data.byteLength : 1024)
    bandwidthTest.packetsReceived++
    
    // Send acknowledgment
    const ackMessage = {
      type: 'bandwidth_ack',
      testId: message.testId,
      packetId: message.packetId,
      timestamp: performance.now()
    }
    
    if (this.networkCallbacks.sendToPeer) {
      this.networkCallbacks.sendToPeer(peerId, ackMessage)
    }
  }
  
  /**
   * Complete bandwidth test
   */
  completeBandwidthTest(peerId) {
    const bandwidthTest = this.testing.bandwidthTests.get(peerId)
    if (!bandwidthTest) return
    
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    const testDuration = (performance.now() - bandwidthTest.startTime) / 1000 // seconds
    
    if (testDuration > 0) {
      const uploadBandwidth = (bandwidthTest.bytesSent * 8) / testDuration / 1000 // kbps
      const downloadBandwidth = (bandwidthTest.bytesReceived * 8) / testDuration / 1000 // kbps
      
      metrics.bandwidth.upload = uploadBandwidth
      metrics.bandwidth.download = downloadBandwidth
      
      // Add to measurements (keep last 10)
      metrics.bandwidth.measurements.push({
        timestamp: performance.now(),
        upload: uploadBandwidth,
        download: downloadBandwidth
      })
      
      if (metrics.bandwidth.measurements.length > 10) {
        metrics.bandwidth.measurements.shift()
      }
      
      // Calculate averages
      const measurements = metrics.bandwidth.measurements
      metrics.bandwidth.avgUpload = measurements.reduce((a, b) => a + b.upload, 0) / measurements.length
      metrics.bandwidth.avgDownload = measurements.reduce((a, b) => a + b.download, 0) / measurements.length
      
      metrics.lastBandwidthTest = performance.now()
      
      this.logger.info('Bandwidth test completed', {
        peerId,
        uploadBandwidth: uploadBandwidth.toFixed(2),
        downloadBandwidth: downloadBandwidth.toFixed(2),
        testDuration: testDuration.toFixed(2)
      })
      
      if (this.eventHandlers.onBandwidthMeasured) {
        this.eventHandlers.onBandwidthMeasured(peerId, {
          upload: uploadBandwidth,
          download: downloadBandwidth
        })
      }
    }
    
    // Clean up
    if (bandwidthTest.interval) {
      clearInterval(bandwidthTest.interval)
    }
    this.testing.bandwidthTests.delete(peerId)
    
    // Schedule next test
    setTimeout(() => {
      if (this.testing.isRunning && this.peerMetrics.has(peerId)) {
        this.startBandwidthTest(peerId)
      }
    }, this.config.bandwidthTestInterval)
  }
  
  /**
   * Update WebRTC metrics for a peer
   */
  updateWebRTCMetrics(peerId, connection) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics || !connection) return
    
    // Update connection states
    metrics.webrtc.iceConnectionState = connection.iceConnectionState
    metrics.webrtc.dtlsState = connection.connectionState
    
    // Get statistics
    connection.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'transport') {
          metrics.webrtc.bytesReceived = report.bytesReceived || 0
          metrics.webrtc.bytesSent = report.bytesSent || 0
          metrics.webrtc.packetsReceived = report.packetsReceived || 0
          metrics.webrtc.packetsSent = report.packetsSent || 0
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          metrics.webrtc.selectedCandidatePair = {
            localType: report.localCandidateType,
            remoteType: report.remoteCandidateType,
            priority: report.priority
          }
        }
      })
    }).catch(error => {
      this.logger.warn('Failed to get WebRTC stats', { peerId, error: error.message })
    })
  }
  
  /**
   * Update quality assessment for a peer
   */
  updatePeerQuality(peerId) {
    const metrics = this.peerMetrics.get(peerId)
    if (!metrics) return
    
    const oldQuality = metrics.quality.overall
    
    // Calculate quality score (0-100)
    let score = 100
    
    // Latency penalty
    if (metrics.latency.avg > this.config.latencyThreshold) {
      score -= Math.min(40, (metrics.latency.avg - this.config.latencyThreshold) / 10)
    }
    
    // Jitter penalty
    if (metrics.latency.jitter > this.config.jitterThreshold) {
      score -= Math.min(20, (metrics.latency.jitter - this.config.jitterThreshold) / 5)
    }
    
    // Packet loss penalty
    if (metrics.packetLoss.lossRate > this.config.packetLossThreshold) {
      score -= Math.min(30, metrics.packetLoss.lossRate * 100)
    }
    
    // Connection stability penalty
    const stabilityPenalty = (metrics.stability.disconnections + metrics.stability.consecutiveTimeouts) * 5
    score -= Math.min(20, stabilityPenalty)
    
    score = Math.max(0, Math.min(100, score))
    metrics.quality.score = score
    
    // Determine quality rating
    if (score >= 90) {
      metrics.quality.overall = 'excellent'
    } else if (score >= 75) {
      metrics.quality.overall = 'good'
    } else if (score >= 50) {
      metrics.quality.overall = 'fair'
    } else {
      metrics.quality.overall = 'poor'
    }
    
    // Update connection quality
    if (metrics.latency.avg < 50 && metrics.packetLoss.lossRate < 0.01) {
      metrics.quality.connection = 'excellent'
    } else if (metrics.latency.avg < 100 && metrics.packetLoss.lossRate < 0.03) {
      metrics.quality.connection = 'good'
    } else if (metrics.latency.avg < 200 && metrics.packetLoss.lossRate < 0.05) {
      metrics.quality.connection = 'fair'
    } else {
      metrics.quality.connection = 'poor'
    }
    
    // Calculate stability
    const uptime = performance.now() - metrics.stability.connectionStartTime
    const disconnectionRate = metrics.stability.disconnections / Math.max(1, uptime / 60000) // per minute
    metrics.quality.stability = Math.max(0, 1 - (disconnectionRate * 0.1))
    
    metrics.lastQualityUpdate = performance.now()
    
    // Notify if quality changed
    if (oldQuality !== metrics.quality.overall && this.eventHandlers.onQualityChanged) {
      this.eventHandlers.onQualityChanged(peerId, metrics.quality.overall)
    }
  }
  
  /**
   * Update global network metrics
   */
  updateGlobalMetrics() {
    const peers = Array.from(this.peerMetrics.values())
    if (peers.length === 0) {
      this.globalMetrics.overallQuality = 'unknown'
      return
    }
    
    // Calculate averages
    this.globalMetrics.avgLatency = peers.reduce((sum, p) => sum + p.latency.avg, 0) / peers.length
    this.globalMetrics.avgPacketLoss = peers.reduce((sum, p) => sum + p.packetLoss.lossRate, 0) / peers.length
    this.globalMetrics.avgJitter = peers.reduce((sum, p) => sum + p.latency.jitter, 0) / peers.length
    this.globalMetrics.avgBandwidth = peers.reduce((sum, p) => sum + p.bandwidth.avgDownload, 0) / peers.length
    
    // Calculate connection stability
    const totalDisconnections = peers.reduce((sum, p) => sum + p.stability.disconnections, 0)
    const avgUptime = peers.reduce((sum, p) => sum + (performance.now() - p.stability.connectionStartTime), 0) / peers.length
    this.globalMetrics.connectionStability = Math.max(0, 1 - (totalDisconnections / Math.max(1, avgUptime / 60000)))
    
    // Determine overall quality
    const qualityScores = peers.map(p => p.quality.score)
    const avgQualityScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    
    if (avgQualityScore >= 90) {
      this.globalMetrics.overallQuality = 'excellent'
    } else if (avgQualityScore >= 75) {
      this.globalMetrics.overallQuality = 'good'
    } else if (avgQualityScore >= 50) {
      this.globalMetrics.overallQuality = 'fair'
    } else {
      this.globalMetrics.overallQuality = 'poor'
    }
    
    // Determine network condition
    const oldCondition = this.globalMetrics.networkCondition
    
    if (this.globalMetrics.avgPacketLoss > 0.1 || this.globalMetrics.avgLatency > 300) {
      this.globalMetrics.networkCondition = 'unstable'
    } else if (this.globalMetrics.avgPacketLoss > 0.05 || this.globalMetrics.avgLatency > 200) {
      this.globalMetrics.networkCondition = 'degraded'
    } else {
      this.globalMetrics.networkCondition = 'stable'
    }
    
    // Notify if condition changed
    if (oldCondition !== this.globalMetrics.networkCondition && this.eventHandlers.onNetworkConditionChanged) {
      this.eventHandlers.onNetworkConditionChanged(this.globalMetrics.networkCondition)
    }
    
    // Add to history
    this.addMeasurementToHistory({
      timestamp: performance.now(),
      globalMetrics: { ...this.globalMetrics },
      peerCount: peers.length
    })
  }
  
  /**
   * Handle network message
   */
  handleMessage(message, senderId) {
    switch (message.type) {
      case 'network_ping':
        this.handlePingRequest(senderId, message)
        break
        
      case 'network_pong':
        this.handlePingResponse(senderId, message)
        break
        
      case 'bandwidth_test':
        this.handleBandwidthTest(senderId, message)
        break
        
      case 'bandwidth_ack':
        // Handle bandwidth test acknowledgment
        break
        
      default:
        // Unknown message type
        break
    }
  }
  
  /**
   * Add measurement to history
   */
  addMeasurementToHistory(measurement) {
    this.history.measurements.push(measurement)
    
    if (this.history.measurements.length > this.history.maxHistorySize) {
      this.history.measurements.shift()
    }
  }
  
  /**
   * Add event to history
   */
  addEventToHistory(event) {
    this.history.events.push({
      timestamp: performance.now(),
      ...event
    })
    
    if (this.history.events.length > this.history.maxHistorySize) {
      this.history.events.shift()
    }
  }
  
  /**
   * Get comprehensive diagnostics report
   */
  getDiagnosticsReport() {
    const peers = Array.from(this.peerMetrics.values())
    
    return {
      timestamp: performance.now(),
      global: { ...this.globalMetrics },
      peers: peers.map(peer => ({
        peerId: peer.peerId,
        connectionType: peer.connectionType,
        region: peer.region,
        latency: { ...peer.latency },
        packetLoss: { ...peer.packetLoss },
        bandwidth: { ...peer.bandwidth },
        quality: { ...peer.quality },
        stability: { ...peer.stability },
        webrtc: { ...peer.webrtc }
      })),
      testing: {
        isRunning: this.testing.isRunning,
        activePings: this.testing.pingIntervals.size,
        activeBandwidthTests: this.testing.bandwidthTests.size
      },
      history: {
        measurementCount: this.history.measurements.length,
        eventCount: this.history.events.length,
        recentEvents: this.history.events.slice(-10)
      }
    }
  }
  
  /**
   * Get network recommendations
   */
  getNetworkRecommendations() {
    const recommendations = []
    const peers = Array.from(this.peerMetrics.values())
    
    // Global recommendations
    if (this.globalMetrics.avgLatency > this.config.latencyThreshold) {
      recommendations.push({
        type: 'warning',
        category: 'latency',
        message: `High average latency detected (${this.globalMetrics.avgLatency.toFixed(0)}ms). Consider using closer servers or checking network conditions.`,
        priority: 'high'
      })
    }
    
    if (this.globalMetrics.avgPacketLoss > this.config.packetLossThreshold) {
      recommendations.push({
        type: 'error',
        category: 'packet_loss',
        message: `High packet loss detected (${(this.globalMetrics.avgPacketLoss * 100).toFixed(1)}%). Check network stability.`,
        priority: 'critical'
      })
    }
    
    if (this.globalMetrics.connectionStability < 0.9) {
      recommendations.push({
        type: 'warning',
        category: 'stability',
        message: 'Connection instability detected. Monitor for frequent disconnections.',
        priority: 'medium'
      })
    }
    
    // Per-peer recommendations
    peers.forEach(peer => {
      if (peer.quality.overall === 'poor') {
        recommendations.push({
          type: 'warning',
          category: 'peer_quality',
          message: `Poor connection quality with peer ${peer.peerId}. Consider connection optimization.`,
          priority: 'medium',
          peerId: peer.peerId
        })
      }
      
      if (peer.packetLoss.consecutiveLoss > 5) {
        recommendations.push({
          type: 'error',
          category: 'peer_packet_loss',
          message: `Consecutive packet loss with peer ${peer.peerId}. Connection may be failing.`,
          priority: 'high',
          peerId: peer.peerId
        })
      }
    })
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    })
  }
  
  /**
   * Export diagnostics data
   */
  exportDiagnosticsData(format = 'json') {
    const data = {
      exportTime: new Date().toISOString(),
      diagnosticsReport: this.getDiagnosticsReport(),
      recommendations: this.getNetworkRecommendations(),
      fullHistory: {
        measurements: this.history.measurements,
        events: this.history.events
      }
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
        
      case 'csv':
        // Convert to CSV format (simplified)
        const csvRows = ['timestamp,peerId,latency,packetLoss,bandwidth,quality']
        data.diagnosticsReport.peers.forEach(peer => {
          csvRows.push(`${data.exportTime},${peer.peerId},${peer.latency.avg},${peer.packetLoss.lossRate},${peer.bandwidth.avgDownload},${peer.quality.overall}`)
        })
        return csvRows.join('\n')
        
      default:
        return data
    }
  }
  
  /**
   * Reset all metrics and history
   */
  reset() {
    // Stop all testing
    this.stopAutomaticTesting()
    
    // Clear all metrics
    this.peerMetrics.clear()
    
    // Reset global metrics
    this.globalMetrics = {
      overallQuality: 'unknown',
      avgLatency: 0,
      avgPacketLoss: 0,
      avgJitter: 0,
      avgBandwidth: 0,
      connectionStability: 1.0,
      networkCondition: 'stable'
    }
    
    // Clear history
    this.history.measurements = []
    this.history.events = []
    
    this.logger.info('Network diagnostics system reset')
  }
  
  /**
   * Shutdown the diagnostics system
   */
  shutdown() {
    this.stopAutomaticTesting()
    this.reset()
    
    this.logger.info('Network diagnostics system shutdown')
  }
}

export default NetworkDiagnostics
