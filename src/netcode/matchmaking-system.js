/**
 * Advanced Matchmaking System
 * Features: Skill-based matching, ELO rating, queue management, region-based matching
 */

export class MatchmakingSystem {
  constructor(config = {}) {
    this.config = {
      minPlayersPerMatch: 2,
      maxPlayersPerMatch: 8,
      defaultRating: 1000,
      ratingDeviation: 350,
      kFactor: 32, // ELO K-factor
      maxSkillDifference: 200,
      queueTimeout: 30000,
      expandSearchInterval: 10000,
      expandSearchFactor: 1.5,
      regionPriority: true,
      enableBackfill: true,
      ...config
    }
    
    // Matchmaking queues by game mode
    this.queues = new Map()
    
    // Active matches
    this.activeMatches = new Map()
    
    // Player ratings database
    this.playerRatings = new Map()
    
    // Statistics
    this.stats = {
      totalMatches: 0,
      averageWaitTime: 0,
      successRate: 0,
      totalPlayers: 0
    }
    
    // Regions
    this.regions = ['na', 'eu', 'asia', 'sa', 'oce', 'auto']
    
    // Game modes that support matchmaking
    this.supportedModes = ['ranked', 'competitive', 'tournament']
  }
  
  /**
   * Add player to matchmaking queue
   */
  async addToQueue(player, preferences = {}) {
    const request = {
      playerId: player.id,
      playerName: player.name,
      rating: this.getPlayerRating(player.id),
      deviation: this.getPlayerDeviation(player.id),
      gameMode: preferences.gameMode || 'ranked',
      region: preferences.region || 'auto',
      teamSize: preferences.teamSize || 1,
      skillRange: preferences.skillRange || this.config.maxSkillDifference,
      joinTime: Date.now(),
      expandedSearches: 0,
      preferences: preferences
    }
    
    // Get or create queue for game mode
    if (!this.queues.has(request.gameMode)) {
      this.queues.set(request.gameMode, [])
    }
    
    const queue = this.queues.get(request.gameMode)
    
    // Check if player already in queue
    const existingIndex = queue.findIndex(r => r.playerId === request.playerId)
    if (existingIndex !== -1) {
      queue[existingIndex] = request // Update request
    } else {
      queue.push(request)
    }
    
    // Start matching process
    return this.findMatch(request)
  }
  
  /**
   * Remove player from all queues
   */
  removeFromQueue(playerId) {
    for (const [mode, queue] of this.queues) {
      const index = queue.findIndex(r => r.playerId === playerId)
      if (index !== -1) {
        queue.splice(index, 1)
        return true
      }
    }
    return false
  }
  
  /**
   * Find match for player
   */
  async findMatch(request) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkInterval = setInterval(() => {
        const queue = this.queues.get(request.gameMode) || []
        const elapsedTime = Date.now() - startTime
        
        // Expand search criteria over time
        if (elapsedTime > this.config.expandSearchInterval * (request.expandedSearches + 1)) {
          request.expandedSearches++
          request.skillRange *= this.config.expandSearchFactor
          
          // Also consider expanding region
          if (request.region !== 'auto' && request.expandedSearches > 2) {
            request.region = 'auto'
          }
        }
        
        // Try to form a match
        const match = this.tryFormMatch(request, queue)
        
        if (match) {
          clearInterval(checkInterval)
          
          // Remove matched players from queue
          for (const player of match.players) {
            this.removeFromQueue(player.playerId)
          }
          
          // Create match object
          const matchObj = this.createMatch(match)
          
          // Update statistics
          this.updateMatchmakingStats(match.players, elapsedTime)
          
          resolve(matchObj)
        }
        
        // Check timeout
        if (elapsedTime > this.config.queueTimeout) {
          clearInterval(checkInterval)
          this.removeFromQueue(request.playerId)
          
          // Try backfill if enabled
          if (this.config.enableBackfill) {
            const backfillMatch = this.tryBackfill(request)
            if (backfillMatch) {
              resolve(backfillMatch)
              return
            }
          }
          
          reject(new Error('Matchmaking timeout'))
        }
      }, 1000)
    })
  }
  
  /**
   * Try to form a match from queue
   */
  tryFormMatch(request, queue) {
    // Filter compatible players
    const candidates = queue.filter(other => {
      if (other.playerId === request.playerId) return false
      
      // Check skill compatibility
      const skillDiff = Math.abs(other.rating - request.rating)
      if (skillDiff > request.skillRange) return false
      
      // Check region compatibility
      if (request.region !== 'auto' && other.region !== 'auto') {
        if (request.region !== other.region) return false
      }
      
      // Check team size compatibility
      if (request.teamSize !== other.teamSize) return false
      
      return true
    })
    
    // Sort by best match quality
    candidates.sort((a, b) => {
      const scoreA = this.calculateMatchScore(request, a)
      const scoreB = this.calculateMatchScore(request, b)
      return scoreB - scoreA
    })
    
    // Check if we have enough players
    const requiredPlayers = this.getRequiredPlayers(request.gameMode, request.teamSize)
    
    if (candidates.length >= requiredPlayers - 1) {
      const selectedPlayers = candidates.slice(0, requiredPlayers - 1)
      
      return {
        players: [request, ...selectedPlayers],
        averageRating: this.calculateAverageRating([request, ...selectedPlayers]),
        quality: this.calculateMatchQuality([request, ...selectedPlayers])
      }
    }
    
    return null
  }
  
  /**
   * Calculate match score between two players
   */
  calculateMatchScore(player1, player2) {
    let score = 100
    
    // Skill difference penalty
    const skillDiff = Math.abs(player1.rating - player2.rating)
    score -= skillDiff / 10
    
    // Wait time bonus
    const waitTime = Math.min(
      Date.now() - player1.joinTime,
      Date.now() - player2.joinTime
    )
    score += waitTime / 1000 // 1 point per second waited
    
    // Region match bonus
    if (player1.region === player2.region && player1.region !== 'auto') {
      score += 20
    }
    
    // Similar preferences bonus
    if (player1.preferences.competitive === player2.preferences.competitive) {
      score += 10
    }
    
    return Math.max(0, score)
  }
  
  /**
   * Calculate match quality
   */
  calculateMatchQuality(players) {
    if (players.length < 2) return 0
    
    // Calculate rating variance
    const ratings = players.map(p => p.rating)
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length
    const stdDev = Math.sqrt(variance)
    
    // Lower standard deviation = better match quality
    const quality = Math.max(0, 100 - stdDev)
    
    // Apply wait time bonus
    const avgWaitTime = players.reduce((sum, p) => sum + (Date.now() - p.joinTime), 0) / players.length
    const waitBonus = Math.min(20, avgWaitTime / 1000) // Max 20 point bonus
    
    return Math.min(100, quality + waitBonus)
  }
  
  /**
   * Calculate average rating
   */
  calculateAverageRating(players) {
    const ratings = players.map(p => p.rating)
    return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
  }
  
  /**
   * Get required players for game mode
   */
  getRequiredPlayers(gameMode, teamSize) {
    const modePlayers = {
      'ranked': 2,
      'competitive': 4,
      'tournament': 8,
      'team': teamSize * 2
    }
    
    return modePlayers[gameMode] || this.config.minPlayersPerMatch
  }
  
  /**
   * Create match object
   */
  createMatch(matchData) {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const match = {
      id: matchId,
      players: matchData.players.map(p => ({
        id: p.playerId,
        name: p.playerName,
        rating: p.rating,
        team: null // Will be assigned by room
      })),
      averageRating: matchData.averageRating,
      quality: matchData.quality,
      gameMode: matchData.players[0].gameMode,
      region: this.selectBestRegion(matchData.players),
      createdAt: Date.now(),
      status: 'ready'
    }
    
    // Store active match
    this.activeMatches.set(matchId, match)
    
    // Update stats
    this.stats.totalMatches++
    
    return match
  }
  
  /**
   * Select best region for match
   */
  selectBestRegion(players) {
    const regionCounts = {}
    
    for (const player of players) {
      if (player.region !== 'auto') {
        regionCounts[player.region] = (regionCounts[player.region] || 0) + 1
      }
    }
    
    // Return most common region
    let bestRegion = 'auto'
    let maxCount = 0
    
    for (const [region, count] of Object.entries(regionCounts)) {
      if (count > maxCount) {
        maxCount = count
        bestRegion = region
      }
    }
    
    return bestRegion
  }
  
  /**
   * Try backfill into existing match
   */
  tryBackfill(request) {
    // Look for matches that need players
    for (const [matchId, match] of this.activeMatches) {
      if (match.status === 'waiting_for_players') {
        const ratingDiff = Math.abs(match.averageRating - request.rating)
        
        if (ratingDiff <= request.skillRange) {
          // Add player to existing match
          match.players.push({
            id: request.playerId,
            name: request.playerName,
            rating: request.rating,
            team: null
          })
          
          // Recalculate average rating
          const ratings = match.players.map(p => p.rating)
          match.averageRating = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
          
          return match
        }
      }
    }
    
    return null
  }
  
  /**
   * Update player rating after match
   */
  updatePlayerRating(playerId, won, opponentRating) {
    const currentRating = this.getPlayerRating(playerId)
    
    // Calculate expected score
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400))
    
    // Calculate new rating
    const actualScore = won ? 1 : 0
    const newRating = currentRating + this.config.kFactor * (actualScore - expectedScore)
    
    // Update rating
    this.setPlayerRating(playerId, Math.round(newRating))
    
    // Update deviation (decreases with more games)
    const currentDeviation = this.getPlayerDeviation(playerId)
    const newDeviation = Math.max(50, currentDeviation * 0.95)
    this.setPlayerDeviation(playerId, newDeviation)
    
    return newRating
  }
  
  /**
   * Get player rating
   */
  getPlayerRating(playerId) {
    const data = this.playerRatings.get(playerId)
    return data?.rating || this.config.defaultRating
  }
  
  /**
   * Set player rating
   */
  setPlayerRating(playerId, rating) {
    const data = this.playerRatings.get(playerId) || {}
    data.rating = rating
    data.lastUpdated = Date.now()
    this.playerRatings.set(playerId, data)
  }
  
  /**
   * Get player deviation
   */
  getPlayerDeviation(playerId) {
    const data = this.playerRatings.get(playerId)
    return data?.deviation || this.config.ratingDeviation
  }
  
  /**
   * Set player deviation
   */
  setPlayerDeviation(playerId, deviation) {
    const data = this.playerRatings.get(playerId) || {}
    data.deviation = deviation
    this.playerRatings.set(playerId, data)
  }
  
  /**
   * Update matchmaking statistics
   */
  updateMatchmakingStats(players, waitTime) {
    // Update average wait time
    const currentAvg = this.stats.averageWaitTime
    const totalMatches = this.stats.totalMatches
    this.stats.averageWaitTime = (currentAvg * (totalMatches - 1) + waitTime) / totalMatches
    
    // Update total players
    this.stats.totalPlayers += players.length
    
    // Calculate success rate (matches formed vs attempts)
    this.stats.successRate = this.stats.totalMatches / (this.stats.totalMatches + this.getQueueSize())
  }
  
  /**
   * Get total queue size
   */
  getQueueSize() {
    let total = 0
    for (const queue of this.queues.values()) {
      total += queue.length
    }
    return total
  }
  
  /**
   * Get queue status for a game mode
   */
  getQueueStatus(gameMode) {
    const queue = this.queues.get(gameMode) || []
    
    return {
      gameMode,
      playersInQueue: queue.length,
      averageRating: this.calculateAverageRating(queue),
      averageWaitTime: this.calculateAverageWaitTime(queue),
      estimatedTime: this.estimateMatchTime(gameMode, queue.length)
    }
  }
  
  /**
   * Calculate average wait time for queue
   */
  calculateAverageWaitTime(queue) {
    if (queue.length === 0) return 0
    
    const now = Date.now()
    const totalWait = queue.reduce((sum, p) => sum + (now - p.joinTime), 0)
    return Math.round(totalWait / queue.length)
  }
  
  /**
   * Estimate time to find match
   */
  estimateMatchTime(gameMode, queueSize) {
    const requiredPlayers = this.getRequiredPlayers(gameMode, 1)
    
    if (queueSize >= requiredPlayers) {
      return 5000 // 5 seconds if enough players
    }
    
    // Estimate based on historical data
    const playersNeeded = requiredPlayers - queueSize
    const estimatedTime = playersNeeded * 10000 // 10 seconds per player needed
    
    return Math.min(estimatedTime, this.config.queueTimeout)
  }
  
  /**
   * Get matchmaking statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      currentQueueSize: this.getQueueSize(),
      activeMatches: this.activeMatches.size,
      queuesByMode: this.getQueuesByMode()
    }
  }
  
  /**
   * Get queues by mode
   */
  getQueuesByMode() {
    const result = {}
    for (const [mode, queue] of this.queues) {
      result[mode] = {
        count: queue.length,
        averageRating: this.calculateAverageRating(queue),
        averageWaitTime: this.calculateAverageWaitTime(queue)
      }
    }
    return result
  }
  
  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalMatches: 0,
      averageWaitTime: 0,
      successRate: 0,
      totalPlayers: 0
    }
  }
  
  /**
   * Clear all queues
   */
  clearQueues() {
    for (const queue of this.queues.values()) {
      queue.length = 0
    }
  }
  
  /**
   * Get leaderboard
   */
  getLeaderboard(limit = 100) {
    const players = Array.from(this.playerRatings.entries())
      .map(([id, data]) => ({
        playerId: id,
        rating: data.rating,
        deviation: data.deviation,
        lastUpdated: data.lastUpdated
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
    
    return players
  }
}

export default MatchmakingSystem