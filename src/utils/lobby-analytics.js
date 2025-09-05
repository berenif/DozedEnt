/**
 * Lobby Analytics Module - Comprehensive analytics and statistics tracking
 * for the enhanced room lobby system
 */

export class LobbyAnalytics {
  constructor() {
    this.data = {
      // Room metrics
      rooms: {
        totalCreated: 0,
        totalCompleted: 0,
        totalAbandoned: 0,
        averageDuration: 0,
        averagePlayerCount: 0,
        peakConcurrent: 0,
        currentActive: 0,
        byType: new Map(),
        byGameMode: new Map(),
        byRegion: new Map(),
        hourlyActivity: new Array(24).fill(0),
        dailyActivity: new Array(7).fill(0)
      },
      
      // Player metrics
      players: {
        totalUnique: new Set(),
        totalSessions: 0,
        averageSessionDuration: 0,
        averageGamesPerSession: 0,
        peakConcurrent: 0,
        currentOnline: 0,
        retentionRate: 0,
        byRegion: new Map(),
        bySkillLevel: new Map(),
        connectionTypes: new Map()
      },
      
      // Match metrics
      matches: {
        totalStarted: 0,
        totalCompleted: 0,
        averageDuration: 0,
        averageQueueTime: 0,
        matchmakingSuccess: 0,
        matchmakingFailures: 0,
        quickPlayUsage: 0,
        byGameMode: new Map(),
        scoreDistribution: [],
        comebackWins: 0
      },
      
      // Chat metrics
      chat: {
        totalMessages: 0,
        messagesPerRoom: 0,
        averageMessageLength: 0,
        activeChatterPercentage: 0,
        reportedMessages: 0,
        emojiUsage: new Map(),
        languageDistribution: new Map()
      },
      
      // Performance metrics
      performance: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        connectionDrops: 0,
        reconnections: 0,
        errorRate: 0,
        apiCallsPerMinute: 0,
        bandwidthUsage: 0
      },
      
      // Engagement metrics
      engagement: {
        dailyActiveUsers: new Set(),
        weeklyActiveUsers: new Set(),
        monthlyActiveUsers: new Set(),
        averagePlayTime: 0,
        sessionFrequency: new Map(),
        featureUsage: new Map(),
        userJourneys: [],
        churnRate: 0
      }
    }
    
    // Time series data
    this.timeSeries = {
      roomsOverTime: [],
      playersOverTime: [],
      messagesOverTime: [],
      errorsOverTime: [],
      latencyOverTime: []
    }
    
    // Event log
    this.eventLog = []
    
    // Analytics configuration
    this.config = {
      sampleRate: 1.0, // Sample 100% of events
      retentionDays: 30,
      aggregationInterval: 60000, // 1 minute
      maxEventLogSize: 10000
    }
    
    // Start aggregation timer
    this.startAggregation()
  }
  
  /**
   * Track room creation event
   */
  trackRoomCreated(room) {
    this.data.rooms.totalCreated++
    this.data.rooms.currentActive++
    
    // Update peak concurrent
    if (this.data.rooms.currentActive > this.data.rooms.peakConcurrent) {
      this.data.rooms.peakConcurrent = this.data.rooms.currentActive
    }
    
    // Track by type
    const typeCount = this.data.rooms.byType.get(room.type) || 0
    this.data.rooms.byType.set(room.type, typeCount + 1)
    
    // Track by game mode
    const modeCount = this.data.rooms.byGameMode.get(room.settings.gameMode) || 0
    this.data.rooms.byGameMode.set(room.settings.gameMode, modeCount + 1)
    
    // Track by region
    const regionCount = this.data.rooms.byRegion.get(room.metadata.region) || 0
    this.data.rooms.byRegion.set(room.metadata.region, regionCount + 1)
    
    // Track hourly activity
    const hour = new Date().getHours()
    this.data.rooms.hourlyActivity[hour]++
    
    // Track daily activity
    const day = new Date().getDay()
    this.data.rooms.dailyActivity[day]++
    
    // Log event
    this.logEvent('room_created', {
      roomId: room.id,
      type: room.type,
      gameMode: room.settings.gameMode,
      maxPlayers: room.maxPlayers,
      region: room.metadata.region
    })
    
    // Update time series
    this.updateTimeSeries('rooms', this.data.rooms.currentActive)
  }
  
  /**
   * Track room completion event
   */
  trackRoomCompleted(room, duration) {
    this.data.rooms.totalCompleted++
    this.data.rooms.currentActive--
    
    // Update average duration
    this.data.rooms.averageDuration = this.calculateRunningAverage(
      this.data.rooms.averageDuration,
      duration,
      this.data.rooms.totalCompleted
    )
    
    // Update average player count
    this.data.rooms.averagePlayerCount = this.calculateRunningAverage(
      this.data.rooms.averagePlayerCount,
      room.players.length,
      this.data.rooms.totalCompleted
    )
    
    this.logEvent('room_completed', {
      roomId: room.id,
      duration: duration,
      playerCount: room.players.length,
      completionRate: (this.data.rooms.totalCompleted / this.data.rooms.totalCreated)
    })
  }
  
  /**
   * Track room abandonment
   */
  trackRoomAbandoned(room) {
    this.data.rooms.totalAbandoned++
    this.data.rooms.currentActive--
    
    this.logEvent('room_abandoned', {
      roomId: room.id,
      reason: 'host_left',
      playersAffected: room.players.length
    })
  }
  
  /**
   * Track player join event
   */
  trackPlayerJoined(player, room) {
    this.data.players.totalUnique.add(player.id)
    this.data.players.totalSessions++
    this.data.players.currentOnline++
    
    // Update peak concurrent
    if (this.data.players.currentOnline > this.data.players.peakConcurrent) {
      this.data.players.peakConcurrent = this.data.players.currentOnline
    }
    
    // Track by region
    if (player.region) {
      const regionCount = this.data.players.byRegion.get(player.region) || 0
      this.data.players.byRegion.set(player.region, regionCount + 1)
    }
    
    // Track by skill level
    const skillBracket = this.getSkillBracket(player.stats?.rating || 1000)
    const skillCount = this.data.players.bySkillLevel.get(skillBracket) || 0
    this.data.players.bySkillLevel.set(skillBracket, skillCount + 1)
    
    // Track engagement
    this.data.engagement.dailyActiveUsers.add(player.id)
    this.data.engagement.weeklyActiveUsers.add(player.id)
    this.data.engagement.monthlyActiveUsers.add(player.id)
    
    this.logEvent('player_joined', {
      playerId: player.id,
      roomId: room.id,
      isSpectator: player.role === 'spectator'
    })
    
    // Update time series
    this.updateTimeSeries('players', this.data.players.currentOnline)
  }
  
  /**
   * Track player leave event
   */
  trackPlayerLeft(player, sessionDuration) {
    this.data.players.currentOnline--
    
    // Update average session duration
    this.data.players.averageSessionDuration = this.calculateRunningAverage(
      this.data.players.averageSessionDuration,
      sessionDuration,
      this.data.players.totalSessions
    )
    
    this.logEvent('player_left', {
      playerId: player.id,
      sessionDuration: sessionDuration
    })
  }
  
  /**
   * Track match start
   */
  trackMatchStarted(room, queueTime) {
    this.data.matches.totalStarted++
    
    // Track queue time
    this.data.matches.averageQueueTime = this.calculateRunningAverage(
      this.data.matches.averageQueueTime,
      queueTime,
      this.data.matches.totalStarted
    )
    
    // Track by game mode
    const modeCount = this.data.matches.byGameMode.get(room.settings.gameMode) || 0
    this.data.matches.byGameMode.set(room.settings.gameMode, modeCount + 1)
    
    this.logEvent('match_started', {
      roomId: room.id,
      gameMode: room.settings.gameMode,
      playerCount: room.players.length,
      queueTime: queueTime
    })
  }
  
  /**
   * Track match completion
   */
  trackMatchCompleted(room, duration, scores) {
    this.data.matches.totalCompleted++
    
    // Update average duration
    this.data.matches.averageDuration = this.calculateRunningAverage(
      this.data.matches.averageDuration,
      duration,
      this.data.matches.totalCompleted
    )
    
    // Track score distribution
    this.data.matches.scoreDistribution.push(...scores)
    
    // Check for comeback wins (if applicable)
    if (this.isComeback(scores)) {
      this.data.matches.comebackWins++
    }
    
    this.logEvent('match_completed', {
      roomId: room.id,
      duration: duration,
      scores: scores,
      completionRate: (this.data.matches.totalCompleted / this.data.matches.totalStarted)
    })
  }
  
  /**
   * Track matchmaking attempt
   */
  trackMatchmaking(success, criteria, timeToMatch) {
    if (success) {
      this.data.matches.matchmakingSuccess++
    } else {
      this.data.matches.matchmakingFailures++
    }
    
    this.logEvent('matchmaking_attempt', {
      success: success,
      criteria: criteria,
      timeToMatch: timeToMatch,
      successRate: (this.data.matches.matchmakingSuccess / 
        (this.data.matches.matchmakingSuccess + this.data.matches.matchmakingFailures))
    })
  }
  
  /**
   * Track quick play usage
   */
  trackQuickPlay() {
    this.data.matches.quickPlayUsage++
    
    this.logEvent('quick_play_used', {
      totalUsage: this.data.matches.quickPlayUsage
    })
  }
  
  /**
   * Track chat message
   */
  trackChatMessage(message) {
    this.data.chat.totalMessages++
    
    // Update average message length
    this.data.chat.averageMessageLength = this.calculateRunningAverage(
      this.data.chat.averageMessageLength,
      message.length,
      this.data.chat.totalMessages
    )
    
    // Track emoji usage
    const emojis = this.extractEmojis(message)
    emojis.forEach(emoji => {
      const count = this.data.chat.emojiUsage.get(emoji) || 0
      this.data.chat.emojiUsage.set(emoji, count + 1)
    })
    
    // Detect language (simplified)
    const language = this.detectLanguage(message)
    const langCount = this.data.chat.languageDistribution.get(language) || 0
    this.data.chat.languageDistribution.set(language, langCount + 1)
    
    this.logEvent('chat_message', {
      length: message.length,
      hasEmoji: emojis.length > 0
    })
    
    // Update time series
    this.updateTimeSeries('messages', this.data.chat.totalMessages)
  }
  
  /**
   * Track performance metrics
   */
  trackPerformance(metrics) {
    // Update latency
    if (metrics.latency !== null && metrics.latency !== void 0) {
      this.data.performance.averageLatency = this.calculateRunningAverage(
        this.data.performance.averageLatency,
        metrics.latency,
        1000 // Sample size
      )
      
      // Update time series
      this.updateTimeSeries('latency', metrics.latency)
    }
    
    // Track connection drops
    if (metrics.connectionDrop) {
      this.data.performance.connectionDrops++
    }
    
    // Track reconnections
    if (metrics.reconnection) {
      this.data.performance.reconnections++
    }
    
    // Track errors
    if (metrics.error) {
      this.data.performance.errorRate++
      this.updateTimeSeries('errors', this.data.performance.errorRate)
    }
    
    // Track API calls
    if (metrics.apiCall) {
      this.data.performance.apiCallsPerMinute++
    }
    
    // Track bandwidth
    if (metrics.bandwidth) {
      this.data.performance.bandwidthUsage += metrics.bandwidth
    }
  }
  
  /**
   * Track feature usage
   */
  trackFeatureUsage(feature) {
    const count = this.data.engagement.featureUsage.get(feature) || 0
    this.data.engagement.featureUsage.set(feature, count + 1)
    
    this.logEvent('feature_used', {
      feature: feature,
      totalUsage: count + 1
    })
  }
  
  /**
   * Track user journey
   */
  trackUserJourney(userId, action) {
    // Find or create user journey
    let journey = this.data.engagement.userJourneys.find(j => j.userId === userId)
    if (!journey) {
      journey = {
        userId: userId,
        actions: [],
        startTime: Date.now()
      }
      this.data.engagement.userJourneys.push(journey)
    }
    
    journey.actions.push({
      action: action,
      timestamp: Date.now()
    })
    
    // Limit journey size
    if (this.data.engagement.userJourneys.length > 100) {
      this.data.engagement.userJourneys.shift()
    }
  }
  
  /**
   * Get analytics summary
   */
  getSummary() {
    return {
      rooms: {
        active: this.data.rooms.currentActive,
        totalCreated: this.data.rooms.totalCreated,
        completionRate: this.data.rooms.totalCompleted / this.data.rooms.totalCreated || 0,
        averageDuration: Math.round(this.data.rooms.averageDuration / 60000) + ' min',
        popularGameMode: this.getMostPopular(this.data.rooms.byGameMode),
        peakHour: this.data.rooms.hourlyActivity.indexOf(Math.max(...this.data.rooms.hourlyActivity))
      },
      players: {
        online: this.data.players.currentOnline,
        unique: this.data.players.totalUnique.size,
        averageSession: Math.round(this.data.players.averageSessionDuration / 60000) + ' min',
        peakConcurrent: this.data.players.peakConcurrent,
        topRegion: this.getMostPopular(this.data.players.byRegion)
      },
      matches: {
        completionRate: this.data.matches.totalCompleted / this.data.matches.totalStarted || 0,
        averageDuration: Math.round(this.data.matches.averageDuration / 60000) + ' min',
        averageQueueTime: Math.round(this.data.matches.averageQueueTime / 1000) + ' sec',
        matchmakingSuccess: this.data.matches.matchmakingSuccess / 
          (this.data.matches.matchmakingSuccess + this.data.matches.matchmakingFailures) || 0,
        quickPlayUsage: this.data.matches.quickPlayUsage
      },
      chat: {
        totalMessages: this.data.chat.totalMessages,
        averageLength: Math.round(this.data.chat.averageMessageLength),
        topEmoji: this.getMostPopular(this.data.chat.emojiUsage),
        primaryLanguage: this.getMostPopular(this.data.chat.languageDistribution)
      },
      performance: {
        averageLatency: Math.round(this.data.performance.averageLatency) + ' ms',
        connectionStability: 1 - (this.data.performance.connectionDrops / 
          this.data.players.totalSessions || 0),
        errorRate: this.data.performance.errorRate / this.eventLog.length || 0
      },
      engagement: {
        dau: this.data.engagement.dailyActiveUsers.size,
        wau: this.data.engagement.weeklyActiveUsers.size,
        mau: this.data.engagement.monthlyActiveUsers.size,
        dauWauRatio: this.data.engagement.dailyActiveUsers.size / 
          this.data.engagement.weeklyActiveUsers.size || 0,
        topFeature: this.getMostPopular(this.data.engagement.featureUsage)
      }
    }
  }
  
  /**
   * Get detailed report
   */
  getDetailedReport() {
    return {
      summary: this.getSummary(),
      trends: this.calculateTrends(),
      insights: this.generateInsights(),
      recommendations: this.generateRecommendations(),
      timeSeries: this.timeSeries,
      recentEvents: this.eventLog.slice(-100)
    }
  }
  
  /**
   * Calculate trends
   */
  calculateTrends() {
    const trends = {}
    
    // Room creation trend
    if (this.timeSeries.roomsOverTime.length > 1) {
      const recent = this.timeSeries.roomsOverTime.slice(-10)
      const older = this.timeSeries.roomsOverTime.slice(-20, -10)
      trends.roomGrowth = this.calculateGrowthRate(older, recent)
    }
    
    // Player growth trend
    if (this.timeSeries.playersOverTime.length > 1) {
      const recent = this.timeSeries.playersOverTime.slice(-10)
      const older = this.timeSeries.playersOverTime.slice(-20, -10)
      trends.playerGrowth = this.calculateGrowthRate(older, recent)
    }
    
    // Chat activity trend
    if (this.timeSeries.messagesOverTime.length > 1) {
      const recent = this.timeSeries.messagesOverTime.slice(-10)
      const older = this.timeSeries.messagesOverTime.slice(-20, -10)
      trends.chatActivity = this.calculateGrowthRate(older, recent)
    }
    
    return trends
  }
  
  /**
   * Generate insights
   */
  generateInsights() {
    const insights = []
    
    // Peak usage insight
    const peakHour = this.data.rooms.hourlyActivity.indexOf(
      Math.max(...this.data.rooms.hourlyActivity)
    )
    insights.push({
      type: 'peak_usage',
      message: `Peak activity occurs at ${peakHour}:00 with ${this.data.rooms.hourlyActivity[peakHour]} rooms created`,
      priority: 'high'
    })
    
    // Completion rate insight
    const completionRate = this.data.rooms.totalCompleted / this.data.rooms.totalCreated
    if (completionRate < 0.5) {
      insights.push({
        type: 'low_completion',
        message: `Room completion rate is ${(completionRate * 100).toFixed(1)}%, consider investigating abandonment reasons`,
        priority: 'high'
      })
    }
    
    // Matchmaking efficiency
    const mmSuccess = this.data.matches.matchmakingSuccess / 
      (this.data.matches.matchmakingSuccess + this.data.matches.matchmakingFailures)
    if (mmSuccess < 0.7) {
      insights.push({
        type: 'matchmaking_issues',
        message: `Matchmaking success rate is ${(mmSuccess * 100).toFixed(1)}%, consider adjusting criteria`,
        priority: 'medium'
      })
    }
    
    // Chat engagement
    const chattersRatio = this.data.chat.totalMessages / this.data.players.totalUnique.size
    insights.push({
      type: 'chat_engagement',
      message: `Average ${chattersRatio.toFixed(1)} messages per player`,
      priority: 'low'
    })
    
    return insights
  }
  
  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = []
    const summary = this.getSummary()
    
    // Room recommendations
    if (summary.rooms.completionRate < 0.6) {
      recommendations.push({
        category: 'rooms',
        recommendation: 'Implement auto-host migration to reduce room abandonment',
        impact: 'high'
      })
    }
    
    // Player recommendations
    if (summary.players.averageSession < '10 min') {
      recommendations.push({
        category: 'engagement',
        recommendation: 'Add more engaging features to increase session duration',
        impact: 'medium'
      })
    }
    
    // Performance recommendations
    if (summary.performance.averageLatency > '100 ms') {
      recommendations.push({
        category: 'performance',
        recommendation: 'Optimize network code to reduce latency',
        impact: 'high'
      })
    }
    
    // Matchmaking recommendations
    if (summary.matches.averageQueueTime > '30 sec') {
      recommendations.push({
        category: 'matchmaking',
        recommendation: 'Expand matchmaking criteria to reduce queue times',
        impact: 'medium'
      })
    }
    
    return recommendations
  }
  
  // Helper methods
  
  calculateRunningAverage(currentAvg, newValue, count) {
    return ((currentAvg * (count - 1)) + newValue) / count
  }
  
  getSkillBracket(rating) {
    if (rating < 800) {return 'bronze'}
    if (rating < 1000) {return 'silver'}
    if (rating < 1200) {return 'gold'}
    if (rating < 1500) {return 'platinum'}
    return 'diamond'
  }
  
  isComeback(scores) {
    // Simple comeback detection - can be made more sophisticated
    if (scores.length < 2) {return false}
    const winner = Math.max(...scores)
    const loser = Math.min(...scores)
    return (winner - loser) < (winner * 0.2) // Close game
  }
  
  extractEmojis(text) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    return text.match(emojiRegex) || []
  }
  
  detectLanguage(text) {
    // Simplified language detection
    if (/[а-яА-Я]/.test(text)) {return 'ru'}
    if (/[一-龯]/.test(text)) {return 'zh'}
    if (/[ぁ-ゔ]/.test(text)) {return 'ja'}
    if (/[가-힣]/.test(text)) {return 'ko'}
    return 'en'
  }
  
  getMostPopular(map) {
    if (map.size === 0) {return null}
    let maxCount = 0
    let mostPopular = null
    
    for (const [key, count] of map.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostPopular = key
      }
    }
    
    return mostPopular
  }
  
  calculateGrowthRate(older, recent) {
    const oldAvg = older.reduce((a, b) => a + b, 0) / older.length || 1
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length || 1
    return ((recentAvg - oldAvg) / oldAvg) * 100
  }
  
  updateTimeSeries(metric, value) {
    const series = this.timeSeries[`${metric}OverTime`]
    if (series) {
      series.push({
        timestamp: Date.now(),
        value: value
      })
      
      // Limit series size
      if (series.length > 1000) {
        series.shift()
      }
    }
  }
  
  logEvent(type, data) {
    this.eventLog.push({
      type: type,
      data: data,
      timestamp: Date.now()
    })
    
    // Limit log size
    if (this.eventLog.length > this.config.maxEventLogSize) {
      this.eventLog.shift()
    }
  }
  
  startAggregation() {
    // Clear any existing interval to avoid leaks when restarting aggregation
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval)
      this.aggregationInterval = null
    }
    // Store interval for cleanup
    this.aggregationInterval = setInterval(() => {
      // Reset per-minute counters
      this.data.performance.apiCallsPerMinute = 0
      
      // Clean up old data
      this.cleanupOldData()
    }, this.config.aggregationInterval)
  }
  
  cleanupOldData() {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000)
    
    // Clean event log
    this.eventLog = this.eventLog.filter(event => event.timestamp > cutoffTime)
    
    // Clean time series
    for (const key in this.timeSeries) {
      this.timeSeries[key] = this.timeSeries[key].filter(
        point => point.timestamp > cutoffTime
      )
    }
    
    // Reset daily/weekly/monthly active users periodically
    const now = new Date()
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      // Reset daily active users at midnight
      this.data.engagement.dailyActiveUsers.clear()
      
      if (now.getDay() === 0) {
        // Reset weekly active users on Sunday
        this.data.engagement.weeklyActiveUsers.clear()
      }
      
      if (now.getDate() === 1) {
        // Reset monthly active users on the 1st
        this.data.engagement.monthlyActiveUsers.clear()
      }
    }
  }
  
  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        config: this.config
      },
      data: this.data,
      timeSeries: this.timeSeries,
      summary: this.getSummary(),
      insights: this.generateInsights()
    }
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2)
    } else if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV(exportData)
    }
    
    return exportData
  }
  
  convertToCSV(data) {
    // Simplified CSV conversion
    const rows = []
    rows.push(['Metric', 'Value'])
    
    const summary = data.summary
    for (const category in summary) {
      for (const metric in summary[category]) {
        rows.push([`${category}.${metric}`, summary[category][metric]])
      }
    }
    
    return rows.map(row => row.join(',')).join('\n')
  }
  
  /**
   * Reset all analytics data
   */
  reset() {
    // Reset all counters and collections
    this.data = {
      rooms: {
        totalCreated: 0,
        totalCompleted: 0,
        totalAbandoned: 0,
        averageDuration: 0,
        averagePlayerCount: 0,
        peakConcurrent: 0,
        currentActive: 0,
        byType: new Map(),
        byGameMode: new Map(),
        byRegion: new Map(),
        hourlyActivity: new Array(24).fill(0),
        dailyActivity: new Array(7).fill(0)
      },
      players: {
        totalUnique: new Set(),
        totalSessions: 0,
        averageSessionDuration: 0,
        averageGamesPerSession: 0,
        peakConcurrent: 0,
        currentOnline: 0,
        retentionRate: 0,
        byRegion: new Map(),
        bySkillLevel: new Map(),
        connectionTypes: new Map()
      },
      matches: {
        totalStarted: 0,
        totalCompleted: 0,
        averageDuration: 0,
        averageQueueTime: 0,
        matchmakingSuccess: 0,
        matchmakingFailures: 0,
        quickPlayUsage: 0,
        byGameMode: new Map(),
        scoreDistribution: [],
        comebackWins: 0
      },
      chat: {
        totalMessages: 0,
        messagesPerRoom: 0,
        averageMessageLength: 0,
        activeChatterPercentage: 0,
        reportedMessages: 0,
        emojiUsage: new Map(),
        languageDistribution: new Map()
      },
      performance: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        connectionDrops: 0,
        reconnections: 0,
        errorRate: 0,
        apiCallsPerMinute: 0,
        bandwidthUsage: 0
      },
      engagement: {
        dailyActiveUsers: new Set(),
        weeklyActiveUsers: new Set(),
        monthlyActiveUsers: new Set(),
        averagePlayTime: 0,
        sessionFrequency: new Map(),
        featureUsage: new Map(),
        userJourneys: [],
        churnRate: 0
      }
    }
    
    // Reset time series
    this.timeSeries = {
      roomsOverTime: [],
      playersOverTime: [],
      messagesOverTime: [],
      errorsOverTime: [],
      latencyOverTime: []
    }
    
    // Reset event log
    this.eventLog = []
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Clear aggregation interval
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval)
      this.aggregationInterval = null
    }

    // Clear any stored data for tests
    this.eventLog = []
    this.timeSeries = {}
  }
}

export default LobbyAnalytics