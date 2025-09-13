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
    metrics.latency.min = Math.min(metrics.latency.min, latency)\n    metrics.latency.max = Math.max(metrics.latency.max, latency)
    
    // Add to samples (keep last 100)
    metrics.latency.samples.push(latency)
    if (metrics.latency.samples.length > 100) {
      metrics.latency.samples.shift()
    }\n    \n    // Calculate average\n    metrics.latency.avg = metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length\n    \n    // Calculate jitter (standard deviation)\n    const variance = metrics.latency.samples.reduce((acc, val) => {\n      return acc + Math.pow(val - metrics.latency.avg, 2)\n    }, 0) / metrics.latency.samples.length\n    \n    metrics.latency.jitter = Math.sqrt(variance)\n    \n    // Notify if latency changed significantly\n    if (this.eventHandlers.onPeerLatencyChanged) {\n      this.eventHandlers.onPeerLatencyChanged(peerId, latency)\n    }\n  }\n  \n  /**\n   * Update packet loss metrics\n   */\n  updatePacketLossMetrics(metrics) {\n    const total = metrics.packetLoss.sent\n    if (total > 0) {\n      metrics.packetLoss.lossRate = metrics.packetLoss.lost / total\n    }\n  }\n  \n  /**\n   * Start bandwidth test for a peer\n   */\n  startBandwidthTest(peerId) {\n    const metrics = this.peerMetrics.get(peerId)\n    if (!metrics) return\n    \n    const testId = `bandwidth_${Date.now()}`\n    const testData = new ArrayBuffer(1024) // 1KB test packet\n    \n    const bandwidthTest = {\n      testId,\n      startTime: performance.now(),\n      bytesSent: 0,\n      bytesReceived: 0,\n      packetsReceived: 0,\n      interval: null\n    }\n    \n    this.testing.bandwidthTests.set(peerId, bandwidthTest)\n    \n    // Send test packets for 5 seconds\n    let packetCount = 0\n    bandwidthTest.interval = setInterval(() => {\n      if (packetCount >= 50) { // Send 50 packets max\n        this.completeBandwidthTest(peerId)\n        return\n      }\n      \n      const testMessage = {\n        type: 'bandwidth_test',\n        testId,\n        packetId: packetCount++,\n        timestamp: performance.now(),\n        data: testData\n      }\n      \n      bandwidthTest.bytesSent += 1024\n      \n      if (this.networkCallbacks.sendToPeer) {\n        this.networkCallbacks.sendToPeer(peerId, testMessage)\n      }\n    }, 100) // Send every 100ms\n    \n    // Auto-complete after 10 seconds\n    setTimeout(() => {\n      this.completeBandwidthTest(peerId)\n    }, 10000)\n  }\n  \n  /**\n   * Handle bandwidth test packet\n   */\n  handleBandwidthTest(peerId, message) {\n    const bandwidthTest = this.testing.bandwidthTests.get(peerId)\n    if (!bandwidthTest || bandwidthTest.testId !== message.testId) {\n      return\n    }\n    \n    bandwidthTest.bytesReceived += (message.data ? message.data.byteLength : 1024)\n    bandwidthTest.packetsReceived++\n    \n    // Send acknowledgment\n    const ackMessage = {\n      type: 'bandwidth_ack',\n      testId: message.testId,\n      packetId: message.packetId,\n      timestamp: performance.now()\n    }\n    \n    if (this.networkCallbacks.sendToPeer) {\n      this.networkCallbacks.sendToPeer(peerId, ackMessage)\n    }\n  }\n  \n  /**\n   * Complete bandwidth test\n   */\n  completeBandwidthTest(peerId) {\n    const bandwidthTest = this.testing.bandwidthTests.get(peerId)\n    if (!bandwidthTest) return\n    \n    const metrics = this.peerMetrics.get(peerId)\n    if (!metrics) return\n    \n    const testDuration = (performance.now() - bandwidthTest.startTime) / 1000 // seconds\n    \n    if (testDuration > 0) {\n      const uploadBandwidth = (bandwidthTest.bytesSent * 8) / testDuration / 1000 // kbps\n      const downloadBandwidth = (bandwidthTest.bytesReceived * 8) / testDuration / 1000 // kbps\n      \n      metrics.bandwidth.upload = uploadBandwidth\n      metrics.bandwidth.download = downloadBandwidth\n      \n      // Add to measurements (keep last 10)\n      metrics.bandwidth.measurements.push({\n        timestamp: performance.now(),\n        upload: uploadBandwidth,\n        download: downloadBandwidth\n      })\n      \n      if (metrics.bandwidth.measurements.length > 10) {\n        metrics.bandwidth.measurements.shift()\n      }\n      \n      // Calculate averages\n      const measurements = metrics.bandwidth.measurements\n      metrics.bandwidth.avgUpload = measurements.reduce((a, b) => a + b.upload, 0) / measurements.length\n      metrics.bandwidth.avgDownload = measurements.reduce((a, b) => a + b.download, 0) / measurements.length\n      \n      metrics.lastBandwidthTest = performance.now()\n      \n      this.logger.info('Bandwidth test completed', {\n        peerId,\n        uploadBandwidth: uploadBandwidth.toFixed(2),\n        downloadBandwidth: downloadBandwidth.toFixed(2),\n        testDuration: testDuration.toFixed(2)\n      })\n      \n      if (this.eventHandlers.onBandwidthMeasured) {\n        this.eventHandlers.onBandwidthMeasured(peerId, {\n          upload: uploadBandwidth,\n          download: downloadBandwidth\n        })\n      }\n    }\n    \n    // Clean up\n    if (bandwidthTest.interval) {\n      clearInterval(bandwidthTest.interval)\n    }\n    this.testing.bandwidthTests.delete(peerId)\n    \n    // Schedule next test\n    setTimeout(() => {\n      if (this.testing.isRunning && this.peerMetrics.has(peerId)) {\n        this.startBandwidthTest(peerId)\n      }\n    }, this.config.bandwidthTestInterval)\n  }\n  \n  /**\n   * Update WebRTC metrics for a peer\n   */\n  updateWebRTCMetrics(peerId, connection) {\n    const metrics = this.peerMetrics.get(peerId)\n    if (!metrics || !connection) return\n    \n    // Update connection states\n    metrics.webrtc.iceConnectionState = connection.iceConnectionState\n    metrics.webrtc.dtlsState = connection.connectionState\n    \n    // Get statistics\n    connection.getStats().then(stats => {\n      stats.forEach(report => {\n        if (report.type === 'transport') {\n          metrics.webrtc.bytesReceived = report.bytesReceived || 0\n          metrics.webrtc.bytesSent = report.bytesSent || 0\n          metrics.webrtc.packetsReceived = report.packetsReceived || 0\n          metrics.webrtc.packetsSent = report.packetsSent || 0\n        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {\n          metrics.webrtc.selectedCandidatePair = {\n            localType: report.localCandidateType,\n            remoteType: report.remoteCandidateType,\n            priority: report.priority\n          }\n        }\n      })\n    }).catch(error => {\n      this.logger.warn('Failed to get WebRTC stats', { peerId, error: error.message })\n    })\n  }\n  \n  /**\n   * Update quality assessment for a peer\n   */\n  updatePeerQuality(peerId) {\n    const metrics = this.peerMetrics.get(peerId)\n    if (!metrics) return\n    \n    const oldQuality = metrics.quality.overall\n    \n    // Calculate quality score (0-100)\n    let score = 100\n    \n    // Latency penalty\n    if (metrics.latency.avg > this.config.latencyThreshold) {\n      score -= Math.min(40, (metrics.latency.avg - this.config.latencyThreshold) / 10)\n    }\n    \n    // Jitter penalty\n    if (metrics.latency.jitter > this.config.jitterThreshold) {\n      score -= Math.min(20, (metrics.latency.jitter - this.config.jitterThreshold) / 5)\n    }\n    \n    // Packet loss penalty\n    if (metrics.packetLoss.lossRate > this.config.packetLossThreshold) {\n      score -= Math.min(30, metrics.packetLoss.lossRate * 100)\n    }\n    \n    // Connection stability penalty\n    const stabilityPenalty = (metrics.stability.disconnections + metrics.stability.consecutiveTimeouts) * 5\n    score -= Math.min(20, stabilityPenalty)\n    \n    score = Math.max(0, Math.min(100, score))\n    metrics.quality.score = score\n    \n    // Determine quality rating\n    if (score >= 90) {\n      metrics.quality.overall = 'excellent'\n    } else if (score >= 75) {\n      metrics.quality.overall = 'good'\n    } else if (score >= 50) {\n      metrics.quality.overall = 'fair'\n    } else {\n      metrics.quality.overall = 'poor'\n    }\n    \n    // Update connection quality\n    if (metrics.latency.avg < 50 && metrics.packetLoss.lossRate < 0.01) {\n      metrics.quality.connection = 'excellent'\n    } else if (metrics.latency.avg < 100 && metrics.packetLoss.lossRate < 0.03) {\n      metrics.quality.connection = 'good'\n    } else if (metrics.latency.avg < 200 && metrics.packetLoss.lossRate < 0.05) {\n      metrics.quality.connection = 'fair'\n    } else {\n      metrics.quality.connection = 'poor'\n    }\n    \n    // Calculate stability\n    const uptime = performance.now() - metrics.stability.connectionStartTime\n    const disconnectionRate = metrics.stability.disconnections / Math.max(1, uptime / 60000) // per minute\n    metrics.quality.stability = Math.max(0, 1 - (disconnectionRate * 0.1))\n    \n    metrics.lastQualityUpdate = performance.now()\n    \n    // Notify if quality changed\n    if (oldQuality !== metrics.quality.overall && this.eventHandlers.onQualityChanged) {\n      this.eventHandlers.onQualityChanged(peerId, metrics.quality.overall)\n    }\n  }\n  \n  /**\n   * Update global network metrics\n   */\n  updateGlobalMetrics() {\n    const peers = Array.from(this.peerMetrics.values())\n    if (peers.length === 0) {\n      this.globalMetrics.overallQuality = 'unknown'\n      return\n    }\n    \n    // Calculate averages\n    this.globalMetrics.avgLatency = peers.reduce((sum, p) => sum + p.latency.avg, 0) / peers.length\n    this.globalMetrics.avgPacketLoss = peers.reduce((sum, p) => sum + p.packetLoss.lossRate, 0) / peers.length\n    this.globalMetrics.avgJitter = peers.reduce((sum, p) => sum + p.latency.jitter, 0) / peers.length\n    this.globalMetrics.avgBandwidth = peers.reduce((sum, p) => sum + p.bandwidth.avgDownload, 0) / peers.length\n    \n    // Calculate connection stability\n    const totalDisconnections = peers.reduce((sum, p) => sum + p.stability.disconnections, 0)\n    const avgUptime = peers.reduce((sum, p) => sum + (performance.now() - p.stability.connectionStartTime), 0) / peers.length\n    this.globalMetrics.connectionStability = Math.max(0, 1 - (totalDisconnections / Math.max(1, avgUptime / 60000)))\n    \n    // Determine overall quality\n    const qualityScores = peers.map(p => p.quality.score)\n    const avgQualityScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length\n    \n    if (avgQualityScore >= 90) {\n      this.globalMetrics.overallQuality = 'excellent'\n    } else if (avgQualityScore >= 75) {\n      this.globalMetrics.overallQuality = 'good'\n    } else if (avgQualityScore >= 50) {\n      this.globalMetrics.overallQuality = 'fair'\n    } else {\n      this.globalMetrics.overallQuality = 'poor'\n    }\n    \n    // Determine network condition\n    const oldCondition = this.globalMetrics.networkCondition\n    \n    if (this.globalMetrics.avgPacketLoss > 0.1 || this.globalMetrics.avgLatency > 300) {\n      this.globalMetrics.networkCondition = 'unstable'\n    } else if (this.globalMetrics.avgPacketLoss > 0.05 || this.globalMetrics.avgLatency > 200) {\n      this.globalMetrics.networkCondition = 'degraded'\n    } else {\n      this.globalMetrics.networkCondition = 'stable'\n    }\n    \n    // Notify if condition changed\n    if (oldCondition !== this.globalMetrics.networkCondition && this.eventHandlers.onNetworkConditionChanged) {\n      this.eventHandlers.onNetworkConditionChanged(this.globalMetrics.networkCondition)\n    }\n    \n    // Add to history\n    this.addMeasurementToHistory({\n      timestamp: performance.now(),\n      globalMetrics: { ...this.globalMetrics },\n      peerCount: peers.length\n    })\n  }\n  \n  /**\n   * Handle network message\n   */\n  handleMessage(message, senderId) {\n    switch (message.type) {\n      case 'network_ping':\n        this.handlePingRequest(senderId, message)\n        break\n        \n      case 'network_pong':\n        this.handlePingResponse(senderId, message)\n        break\n        \n      case 'bandwidth_test':\n        this.handleBandwidthTest(senderId, message)\n        break\n        \n      case 'bandwidth_ack':\n        // Handle bandwidth test acknowledgment\n        break\n        \n      default:\n        // Unknown message type\n        break\n    }\n  }\n  \n  /**\n   * Add measurement to history\n   */\n  addMeasurementToHistory(measurement) {\n    this.history.measurements.push(measurement)\n    \n    if (this.history.measurements.length > this.history.maxHistorySize) {\n      this.history.measurements.shift()\n    }\n  }\n  \n  /**\n   * Add event to history\n   */\n  addEventToHistory(event) {\n    this.history.events.push({\n      timestamp: performance.now(),\n      ...event\n    })\n    \n    if (this.history.events.length > this.history.maxHistorySize) {\n      this.history.events.shift()\n    }\n  }\n  \n  /**\n   * Get comprehensive diagnostics report\n   */\n  getDiagnosticsReport() {\n    const peers = Array.from(this.peerMetrics.values())\n    \n    return {\n      timestamp: performance.now(),\n      global: { ...this.globalMetrics },\n      peers: peers.map(peer => ({\n        peerId: peer.peerId,\n        connectionType: peer.connectionType,\n        region: peer.region,\n        latency: { ...peer.latency },\n        packetLoss: { ...peer.packetLoss },\n        bandwidth: { ...peer.bandwidth },\n        quality: { ...peer.quality },\n        stability: { ...peer.stability },\n        webrtc: { ...peer.webrtc }\n      })),\n      testing: {\n        isRunning: this.testing.isRunning,\n        activePings: this.testing.pingIntervals.size,\n        activeBandwidthTests: this.testing.bandwidthTests.size\n      },\n      history: {\n        measurementCount: this.history.measurements.length,\n        eventCount: this.history.events.length,\n        recentEvents: this.history.events.slice(-10)\n      }\n    }\n  }\n  \n  /**\n   * Get network recommendations\n   */\n  getNetworkRecommendations() {\n    const recommendations = []\n    const peers = Array.from(this.peerMetrics.values())\n    \n    // Global recommendations\n    if (this.globalMetrics.avgLatency > this.config.latencyThreshold) {\n      recommendations.push({\n        type: 'warning',\n        category: 'latency',\n        message: `High average latency detected (${this.globalMetrics.avgLatency.toFixed(0)}ms). Consider using closer servers or checking network conditions.`,\n        priority: 'high'\n      })\n    }\n    \n    if (this.globalMetrics.avgPacketLoss > this.config.packetLossThreshold) {\n      recommendations.push({\n        type: 'error',\n        category: 'packet_loss',\n        message: `High packet loss detected (${(this.globalMetrics.avgPacketLoss * 100).toFixed(1)}%). Check network stability.`,\n        priority: 'critical'\n      })\n    }\n    \n    if (this.globalMetrics.connectionStability < 0.9) {\n      recommendations.push({\n        type: 'warning',\n        category: 'stability',\n        message: 'Connection instability detected. Monitor for frequent disconnections.',\n        priority: 'medium'\n      })\n    }\n    \n    // Per-peer recommendations\n    peers.forEach(peer => {\n      if (peer.quality.overall === 'poor') {\n        recommendations.push({\n          type: 'warning',\n          category: 'peer_quality',\n          message: `Poor connection quality with peer ${peer.peerId}. Consider connection optimization.`,\n          priority: 'medium',\n          peerId: peer.peerId\n        })\n      }\n      \n      if (peer.packetLoss.consecutiveLoss > 5) {\n        recommendations.push({\n          type: 'error',\n          category: 'peer_packet_loss',\n          message: `Consecutive packet loss with peer ${peer.peerId}. Connection may be failing.`,\n          priority: 'high',\n          peerId: peer.peerId\n        })\n      }\n    })\n    \n    return recommendations.sort((a, b) => {\n      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 }\n      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)\n    })\n  }\n  \n  /**\n   * Export diagnostics data\n   */\n  exportDiagnosticsData(format = 'json') {\n    const data = {\n      exportTime: new Date().toISOString(),\n      diagnosticsReport: this.getDiagnosticsReport(),\n      recommendations: this.getNetworkRecommendations(),\n      fullHistory: {\n        measurements: this.history.measurements,\n        events: this.history.events\n      }\n    }\n    \n    switch (format) {\n      case 'json':\n        return JSON.stringify(data, null, 2)\n        \n      case 'csv':\n        // Convert to CSV format (simplified)\n        const csvRows = ['timestamp,peerId,latency,packetLoss,bandwidth,quality']\n        data.diagnosticsReport.peers.forEach(peer => {\n          csvRows.push(`${data.exportTime},${peer.peerId},${peer.latency.avg},${peer.packetLoss.lossRate},${peer.bandwidth.avgDownload},${peer.quality.overall}`)\n        })\n        return csvRows.join('\\n')\n        \n      default:\n        return data\n    }\n  }\n  \n  /**\n   * Reset all metrics and history\n   */\n  reset() {\n    // Stop all testing\n    this.stopAutomaticTesting()\n    \n    // Clear all metrics\n    this.peerMetrics.clear()\n    \n    // Reset global metrics\n    this.globalMetrics = {\n      overallQuality: 'unknown',\n      avgLatency: 0,\n      avgPacketLoss: 0,\n      avgJitter: 0,\n      avgBandwidth: 0,\n      connectionStability: 1.0,\n      networkCondition: 'stable'\n    }\n    \n    // Clear history\n    this.history.measurements = []\n    this.history.events = []\n    \n    this.logger.info('Network diagnostics system reset')\n  }\n  \n  /**\n   * Shutdown the diagnostics system\n   */\n  shutdown() {\n    this.stopAutomaticTesting()\n    this.reset()\n    \n    this.logger.info('Network diagnostics system shutdown')\n  }\n}\n\nexport default NetworkDiagnostics
