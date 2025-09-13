/**
 * Leaderboard System - Advanced ranking and statistics tracking
 * Features global leaderboards, personal bests, and competitive rankings
 */

export class LeaderboardSystem {
  constructor(gameStateManager, storageManager) {
    this.gameStateManager = gameStateManager;
    this.storageManager = storageManager;
    
    // Leaderboard categories
    this.categories = {
      highScore: {
        name: 'High Score',
        description: 'Highest total score achieved',
        sortOrder: 'desc',
        format: 'number',
        icon: '🏆'
      },
      survivalTime: {
        name: 'Survival Time',
        description: 'Longest survival time',
        sortOrder: 'desc',
        format: 'time',
        icon: '⏱️'
      },
      roomsCleared: {
        name: 'Rooms Cleared',
        description: 'Most rooms cleared in a single run',
        sortOrder: 'desc',
        format: 'number',
        icon: '🏰'
      },
      enemiesKilled: {
        name: 'Enemy Slayer',
        description: 'Most enemies killed in a single run',
        sortOrder: 'desc',
        format: 'number',
        icon: '⚔️'
      },
      perfectBlocks: {
        name: 'Perfect Defense',
        description: 'Most perfect blocks in a single run',
        sortOrder: 'desc',
        format: 'number',
        icon: '🛡️'
      },
      goldCollected: {
        name: 'Gold Rush',
        description: 'Most gold collected in a single run',
        sortOrder: 'desc',
        format: 'currency',
        icon: '💰'
      },
      winStreak: {
        name: 'Win Streak',
        description: 'Longest consecutive wins',
        sortOrder: 'desc',
        format: 'number',
        icon: '🔥'
      },
      speedRun: {
        name: 'Speed Run',
        description: 'Fastest completion time',
        sortOrder: 'asc',
        format: 'time',
        icon: '⚡'
      },
      noHitRun: {
        name: 'Untouchable',
        description: 'Furthest progress without taking damage',
        sortOrder: 'desc',
        format: 'number',
        icon: '👻'
      },
      achievement: {
        name: 'Achievement Hunter',
        description: 'Most achievements unlocked',
        sortOrder: 'desc',
        format: 'number',
        icon: '🏅'
      }
    };
    
    // Local storage for personal bests
    this.personalBests = new Map();
    
    // Global leaderboards (would sync with server)
    this.globalLeaderboards = new Map();
    
    // Session statistics
    this.sessionStats = {
      startTime: Date.now(),
      runs: 0,
      totalScore: 0,
      totalTime: 0,
      bestRun: null
    };
    
    // Ranking tiers
    this.tiers = [
      { name: 'Bronze', threshold: 0, color: '#CD7F32', icon: '🥉' },
      { name: 'Silver', threshold: 1000, color: '#C0C0C0', icon: '🥈' },
      { name: 'Gold', threshold: 5000, color: '#FFD700', icon: '🥇' },
      { name: 'Platinum', threshold: 15000, color: '#E5E4E2', icon: '💎' },
      { name: 'Diamond', threshold: 50000, color: '#B9F2FF', icon: '💍' },
      { name: 'Master', threshold: 100000, color: '#FF6B6B', icon: '👑' },
      { name: 'Grandmaster', threshold: 250000, color: '#9B59B6', icon: '⭐' },
      { name: 'Legend', threshold: 500000, color: '#FF1493', icon: '🌟' }
    ];
    
    // Performance tracking
    this.performanceMetrics = {
      accuracy: 0,
      efficiency: 0,
      consistency: 0,
      adaptability: 0,
      mastery: 0
    };
    
    // Cloud sync properties
    this.cloudSyncEnabled = false;
    this.leaderboardApiUrl = 'https://api.dozedent.com/leaderboards';
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.syncIntervalId = null;
    this.authToken = null;
    this.clientId = this.generateClientId();
    this.currentSessionId = this.generateSessionId();
    
    this.init();
  }
  
  /**
   * Initialize leaderboard system
   */
  init() {
    this.loadPersonalBests();
    this.loadGlobalLeaderboards();
    this.setupEventListeners();
    this.initializePerformanceMetrics();
  }
  
  /**
   * Initialize performance metrics
   */
  initializePerformanceMetrics() {
    // Initialize with default values
    this.performanceMetrics = {
      accuracy: 0,
      efficiency: 0,
      consistency: 0,
      adaptability: 0,
      mastery: 0
    };
  }

  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // Listen for game completion
    window.addEventListener('gameCompleted', (event) => {
      this.recordGameResult(event.detail);
    });
    
    // Listen for personal records
    window.addEventListener('personalRecord', (event) => {
      this.handlePersonalRecord(event.detail);
    });
    
    // Listen for achievement unlocks
    window.addEventListener('achievementUnlocked', (event) => {
      this.updateAchievementLeaderboard(event.detail);
    });
    
    // Listen for session updates
    window.addEventListener('sessionUpdate', (event) => {
      this.updateSessionStats(event.detail);
    });
  }
  
  /**
   * Record game result and update leaderboards
   */
  recordGameResult(gameResult) {
    const {
      score,
      survivalTime,
      roomsCleared,
      enemiesKilled,
      perfectBlocks,
      goldCollected,
      damageTaken,
      completionTime,
      achievements
    } = gameResult;
    
    // Update session stats
    this.sessionStats.runs++;
    this.sessionStats.totalScore += score;
    this.sessionStats.totalTime += survivalTime;
    
    if (!this.sessionStats.bestRun || score > this.sessionStats.bestRun.score) {
      this.sessionStats.bestRun = { ...gameResult };
    }
    
    // Check and update personal bests
    const updates = [];
    
    if (this.updatePersonalBest('highScore', score)) {
      updates.push({ category: 'highScore', value: score, isNew: true });
    }
    
    if (this.updatePersonalBest('survivalTime', survivalTime)) {
      updates.push({ category: 'survivalTime', value: survivalTime, isNew: true });
    }
    
    if (this.updatePersonalBest('roomsCleared', roomsCleared)) {
      updates.push({ category: 'roomsCleared', value: roomsCleared, isNew: true });
    }
    
    if (this.updatePersonalBest('enemiesKilled', enemiesKilled)) {
      updates.push({ category: 'enemiesKilled', value: enemiesKilled, isNew: true });
    }
    
    if (this.updatePersonalBest('perfectBlocks', perfectBlocks)) {
      updates.push({ category: 'perfectBlocks', value: perfectBlocks, isNew: true });
    }
    
    if (this.updatePersonalBest('goldCollected', goldCollected)) {
      updates.push({ category: 'goldCollected', value: goldCollected, isNew: true });
    }
    
    // Check for no-hit run
    if (damageTaken === 0 && roomsCleared > 0) {
      if (this.updatePersonalBest('noHitRun', roomsCleared)) {
        updates.push({ category: 'noHitRun', value: roomsCleared, isNew: true });
      }
    }
    
    // Check for speed run (if completed)
    if (completionTime && completionTime > 0) {
      const currentBest = this.personalBests.get('speedRun');
      if (!currentBest || completionTime < currentBest.value) {
        this.updatePersonalBest('speedRun', completionTime);
        updates.push({ category: 'speedRun', value: completionTime, isNew: true });
      }
    }
    
    // Update achievement count
    const achievementCount = this.getUnlockedAchievementCount();
    if (this.updatePersonalBest('achievement', achievementCount)) {
      updates.push({ category: 'achievement', value: achievementCount, isNew: true });
    }
    
    // Save updated personal bests
    this.savePersonalBests();
    
    // Trigger UI updates for new records
    if (updates.length > 0) {
      window.dispatchEvent(new CustomEvent('personalRecordsUpdated', {
        detail: { updates, gameResult }
      }));
    }
    
    // Submit to global leaderboards (if online)
    this.submitToGlobalLeaderboards(gameResult);
    
    // Update performance metrics
    this.updatePerformanceMetrics(gameResult);
    
    // Check for tier progression
    this.checkTierProgression(score);
  }
  
  /**
   * Update personal best for a category
   */
  updatePersonalBest(category, value) {
    const categoryInfo = this.categories[category];
    if (!categoryInfo) {return false;}
    
    const current = this.personalBests.get(category);
    const isImprovement = !current || 
      (categoryInfo.sortOrder === 'desc' && value > current.value) ||
      (categoryInfo.sortOrder === 'asc' && value < current.value);
    
    if (isImprovement) {
      this.personalBests.set(category, {
        value: value,
        timestamp: Date.now(),
        rank: this.calculateGlobalRank(category, value)
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * Get personal best for a category
   */
  getPersonalBest(category) {
    return this.personalBests.get(category) || { value: 0, timestamp: 0, rank: null };
  }
  
  /**
   * Get formatted personal best value
   */
  getFormattedPersonalBest(category) {
    const best = this.getPersonalBest(category);
    const categoryInfo = this.categories[category];
    
    if (!categoryInfo || best.value === 0) {return 'N/A';}
    
    return this.formatValue(best.value, categoryInfo.format);
  }
  
  /**
   * Format value based on format type
   */
  formatValue(value, format) {
    switch (format) {
      case 'time':
        return this.formatTime(value);
      case 'currency':
        return this.formatCurrency(value);
      case 'number':
        return this.formatNumber(value);
      default:
        return value.toString();
    }
  }
  
  /**
   * Format time in seconds to readable format
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0').substring(0, 1)}`;
    } 
      return `${secs}.${ms.toString().padStart(3, '0')}s`;
    
  }
  
  /**
   * Format currency
   */
  formatCurrency(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
  
  /**
   * Format number with commas
   */
  formatNumber(value) {
    return value.toLocaleString();
  }
  
  /**
   * Calculate global rank for a value (simulated)
   */
  calculateGlobalRank(category, value) {
    const globalBoard = this.globalLeaderboards.get(category) || [];
    const categoryInfo = this.categories[category];
    
    let rank = 1;
    for (const entry of globalBoard) {
      if ((categoryInfo.sortOrder === 'desc' && entry.value > value) ||
          (categoryInfo.sortOrder === 'asc' && entry.value < value)) {
        rank++;
      }
    }
    
    return rank;
  }
  
  /**
   * Submit scores to global leaderboards
   */
  async submitToGlobalLeaderboards(gameResult) {
    // In a real implementation, this would submit to a server
    // For now, we'll simulate local global leaderboards
    
    const playerEntry = {
      playerId: this.getPlayerId(),
      playerName: this.getPlayerName(),
      timestamp: Date.now(),
      gameResult: gameResult
    };
    
    // Update each relevant category
    Object.keys(this.categories).forEach(category => {
      const value = this.extractValueForCategory(category, gameResult);
      if (value > 0) {
        this.updateGlobalLeaderboard(category, {
          ...playerEntry,
          value: value
        });
      }
    });
    
    this.saveGlobalLeaderboards();
    
    // Also attempt cloud sync if enabled
    if (this.cloudSyncEnabled) {
      this.syncToCloud(gameResult);
    }
  }
  
  /**
   * Enhanced cloud sync capabilities
   */
  async syncToCloud(gameResult) {
    try {
      if (!navigator.onLine) {
        this.queueForLaterSync(gameResult);
        return;
      }
      
      const playerName = this.getPlayerName() || 'Anonymous';
      const submission = {
        playerName,
        playerId: this.getPlayerId(),
        timestamp: Date.now(),
        gameResult,
        clientId: this.getClientId(),
        gameVersion: this.getGameVersion(),
        sessionId: this.getCurrentSessionId()
      };
      
      // Submit to cloud leaderboards
      await this.submitToCloudLeaderboards(submission);
      
    } catch (error) {
      console.warn('Cloud sync failed, queuing for later:', error);
      this.queueForLaterSync(gameResult);
    }
  }
  
  /**
   * Submit to cloud leaderboards
   */
  async submitToCloudLeaderboards(submission) {
    const endpoint = this.getLeaderboardEndpoint();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'X-Client-Version': this.getGameVersion()
      },
      body: JSON.stringify(submission)
    });
    
    if (!response.ok) {
      throw new Error(`Cloud sync failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Update local cache with server rankings
    if (result.rankings) {
      this.updateLocalRankingsCache(result.rankings);
    }
    
    return result;
  }
  
  /**
   * Queue for later sync when offline
   */
  queueForLaterSync(gameResult) {
    try {
      const queue = JSON.parse(localStorage.getItem('leaderboardSyncQueue') || '[]');
      queue.push({
        gameResult,
        timestamp: Date.now(),
        attempts: 0,
        playerId: this.getPlayerId()
      });
      
      // Keep only last 100 entries
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }
      
      localStorage.setItem('leaderboardSyncQueue', JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to queue sync:', error);
    }
  }
  
  /**
   * Process queued sync operations
   */
  async processQueuedSync() {
    if (!navigator.onLine || !this.cloudSyncEnabled) {return;}
    
    try {
      const queue = JSON.parse(localStorage.getItem('leaderboardSyncQueue') || '[]');
      if (queue.length === 0) {return;}
      
      const processed = [];
      const batchSize = 5; // Process in batches to avoid overwhelming server
      
      for (let i = 0; i < Math.min(queue.length, batchSize); i++) {
        const item = queue[i];
        
        try {
          await this.syncToCloud(item.gameResult);
          processed.push(item);
        } catch (error) {
          item.attempts = (item.attempts || 0) + 1;
          
          // Remove items that have failed too many times (> 3 attempts)
          if (item.attempts > 3) {
            processed.push(item);
            console.warn('Dropping sync item after 3 failed attempts:', error);
          }
        }
      }
      
      // Remove processed items
      const remainingQueue = queue.filter(item => !processed.includes(item));
      localStorage.setItem('leaderboardSyncQueue', JSON.stringify(remainingQueue));
      
    } catch (error) {
      console.warn('Failed to process sync queue:', error);
    }
  }
  
  /**
   * Extract value for specific category from game result
   */
  extractValueForCategory(category, gameResult) {
    switch (category) {
      case 'highScore': return gameResult.score || 0;
      case 'survivalTime': return gameResult.survivalTime || 0;
      case 'roomsCleared': return gameResult.roomsCleared || 0;
      case 'enemiesKilled': return gameResult.enemiesKilled || 0;
      case 'perfectBlocks': return gameResult.perfectBlocks || 0;
      case 'goldCollected': return gameResult.goldCollected || 0;
      case 'speedRun': return gameResult.completionTime || 0;
      case 'noHitRun': return gameResult.damageTaken === 0 ? gameResult.roomsCleared : 0;
      case 'achievement': return this.getUnlockedAchievementCount();
      default: return 0;
    }
  }
  
  /**
   * Update global leaderboard for category
   */
  updateGlobalLeaderboard(category, entry) {
    if (!this.globalLeaderboards.has(category)) {
      this.globalLeaderboards.set(category, []);
    }
    
    const board = this.globalLeaderboards.get(category);
    const categoryInfo = this.categories[category];
    
    // Remove existing entry for this player
    const existingIndex = board.findIndex(e => e.playerId === entry.playerId);
    if (existingIndex >= 0) {
      board.splice(existingIndex, 1);
    }
    
    // Add new entry
    board.push(entry);
    
    // Sort board
    board.sort((a, b) => categoryInfo.sortOrder === 'desc' ? b.value - a.value : a.value - b.value);
    
    // Keep top 100
    if (board.length > 100) {
      board.splice(100);
    }
  }
  
  /**
   * Get global leaderboard for category
   */
  getGlobalLeaderboard(category, limit = 10) {
    const board = this.globalLeaderboards.get(category) || [];
    return board.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      playerName: entry.playerName,
      value: entry.value,
      formattedValue: this.formatValue(entry.value, this.categories[category].format),
      timestamp: entry.timestamp,
      isCurrentPlayer: entry.playerId === this.getPlayerId()
    }));
  }
  
  /**
   * Get player's rank in global leaderboard
   */
  getPlayerGlobalRank(category) {
    const board = this.globalLeaderboards.get(category) || [];
    const playerId = this.getPlayerId();
    
    const playerIndex = board.findIndex(entry => entry.playerId === playerId);
    return playerIndex >= 0 ? playerIndex + 1 : null;
  }
  
  /**
   * Get current tier based on total score
   */
  getCurrentTier(totalScore = null) {
    const score = totalScore || this.getTotalScore();
    
    for (let i = this.tiers.length - 1; i >= 0; i--) {
      if (score >= this.tiers[i].threshold) {
        return {
          ...this.tiers[i],
          progress: this.calculateTierProgress(score, i)
        };
      }
    }
    
    return this.tiers[0];
  }
  
  /**
   * Calculate progress to next tier
   */
  calculateTierProgress(score, tierIndex) {
    if (tierIndex >= this.tiers.length - 1) {
      return 1; // Max tier
    }
    
    const currentTier = this.tiers[tierIndex];
    const nextTier = this.tiers[tierIndex + 1];
    
    const progress = (score - currentTier.threshold) / (nextTier.threshold - currentTier.threshold);
    return Math.min(1, Math.max(0, progress));
  }
  
  /**
   * Check for tier progression
   */
  checkTierProgression(newScore) {
    const oldTier = this.getCurrentTier(this.getTotalScore() - newScore);
    const newTier = this.getCurrentTier();
    
    if (newTier.name !== oldTier.name) {
      window.dispatchEvent(new CustomEvent('tierProgression', {
        detail: { oldTier, newTier, score: newScore }
      }));
    }
  }
  
  /**
   * Get total score across all categories
   */
  getTotalScore() {
    let total = 0;
    
    this.personalBests.forEach((best, category) => {
      const categoryInfo = this.categories[category];
      if (categoryInfo && categoryInfo.format === 'number') {
        total += best.value;
      }
    });
    
    return total;
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(gameResult) {
    const {
      accuracy,
      hitRate,
      blockRate,
      survivalTime,
      roomsCleared,
      enemiesKilled,
      damageTaken,
      damageDealt
    } = gameResult;
    
    // Calculate new metrics
    const newMetrics = {
      accuracy: accuracy || (hitRate || 0),
      efficiency: roomsCleared > 0 ? (enemiesKilled / roomsCleared) : 0,
      consistency: this.calculateConsistency(),
      adaptability: this.calculateAdaptability(gameResult),
      mastery: this.calculateMastery(gameResult)
    };
    
    // Smooth update with exponential moving average
    const alpha = 0.1; // Smoothing factor
    Object.keys(newMetrics).forEach(metric => {
      this.performanceMetrics[metric] = 
        this.performanceMetrics[metric] * (1 - alpha) + newMetrics[metric] * alpha;
    });
  }
  
  /**
   * Calculate consistency metric
   */
  calculateConsistency() {
    // Based on variance in recent scores
    const recentScores = this.getRecentScores(10);
    if (recentScores.length < 2) {return 0;}
    
    const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, score) => sum + (score - mean)**2, 0) / recentScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to 0-1 scale (lower deviation = higher consistency)
    return Math.max(0, 1 - (standardDeviation / mean));
  }
  
  /**
   * Calculate adaptability metric
   */
  calculateAdaptability(gameResult) {
    // Based on performance across different game phases and situations
    const phasePerformance = gameResult.phasePerformance || {};
    const phases = Object.keys(phasePerformance);
    
    if (phases.length === 0) {return 0.5;}
    
    const performanceValues = phases.map(phase => phasePerformance[phase] || 0);
    const minPerformance = Math.min(...performanceValues);
    const maxPerformance = Math.max(...performanceValues);
    
    // Higher adaptability = more consistent performance across phases
    return maxPerformance > 0 ? (minPerformance / maxPerformance) : 0;
  }
  
  /**
   * Calculate mastery metric
   */
  calculateMastery(gameResult) {
    // Based on advanced techniques and achievements
    const {
      perfectBlocks,
      combos,
      specialMoves,
      achievements
    } = gameResult;
    
    const masteryScore = 
      (perfectBlocks || 0) * 0.1 +
      (combos || 0) * 0.15 +
      (specialMoves || 0) * 0.2 +
      (achievements || 0) * 0.05;
    
    return Math.min(1, masteryScore / 100); // Normalize to 0-1
  }
  
  /**
   * Get recent scores for analysis
   */
  getRecentScores(count = 10) {
    // In a real implementation, this would fetch from persistent storage
    return []; // Placeholder
  }
  
  /**
   * Get unlocked achievement count
   */
  getUnlockedAchievementCount() {
    // This would interface with the achievement system
    return 0; // Placeholder
  }
  
  /**
   * Get player ID
   */
  getPlayerId() {
    // Generate or retrieve persistent player ID
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'player_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('playerId', playerId);
    }
    return playerId;
  }
  
  /**
   * Get player name
   */
  getPlayerName() {
    return localStorage.getItem('playerName') || 'Anonymous';
  }
  
  /**
   * Set player name
   */
  setPlayerName(name) {
    localStorage.setItem('playerName', name);
  }
  
  /**
   * Load personal bests from storage
   */
  loadPersonalBests() {
    try {
      const stored = localStorage.getItem('personalBests');
      if (stored) {
        const data = JSON.parse(stored);
        this.personalBests = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load personal bests:', error);
    }
  }
  
  /**
   * Save personal bests to storage
   */
  savePersonalBests() {
    try {
      const data = Object.fromEntries(this.personalBests);
      localStorage.setItem('personalBests', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save personal bests:', error);
    }
  }
  
  /**
   * Load global leaderboards from storage
   */
  loadGlobalLeaderboards() {
    try {
      const stored = localStorage.getItem('globalLeaderboards');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([category, board]) => {
          this.globalLeaderboards.set(category, board);
        });
      }
    } catch (error) {
      console.warn('Failed to load global leaderboards:', error);
    }
  }
  
  /**
   * Save global leaderboards to storage
   */
  saveGlobalLeaderboards() {
    try {
      const data = Object.fromEntries(this.globalLeaderboards);
      localStorage.setItem('globalLeaderboards', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save global leaderboards:', error);
    }
  }
  
  /**
   * Get leaderboard summary for UI
   */
  getLeaderboardSummary() {
    const summary = {};
    
    Object.keys(this.categories).forEach(category => {
      const categoryInfo = this.categories[category];
      const personalBest = this.getPersonalBest(category);
      const globalRank = this.getPlayerGlobalRank(category);
      
      summary[category] = {
        ...categoryInfo,
        personalBest: this.formatValue(personalBest.value, categoryInfo.format),
        globalRank: globalRank || 'Unranked',
        lastImproved: personalBest.timestamp
      };
    });
    
    return summary;
  }
  
  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessionTime = Date.now() - this.sessionStats.startTime;
    const averageScore = this.sessionStats.runs > 0 ? 
      this.sessionStats.totalScore / this.sessionStats.runs : 0;
    
    return {
      ...this.sessionStats,
      sessionTime: sessionTime,
      averageScore: averageScore,
      currentTier: this.getCurrentTier(),
      performanceMetrics: { ...this.performanceMetrics }
    };
  }
  
  /**
   * Reset session statistics
   */
  resetSessionStats() {
    this.sessionStats = {
      startTime: Date.now(),
      runs: 0,
      totalScore: 0,
      totalTime: 0,
      bestRun: null
    };
  }
  
  /**
   * Export leaderboard data
   */
  exportData() {
    return {
      personalBests: Object.fromEntries(this.personalBests),
      globalLeaderboards: Object.fromEntries(this.globalLeaderboards),
      sessionStats: this.sessionStats,
      performanceMetrics: this.performanceMetrics,
      playerId: this.getPlayerId(),
      playerName: this.getPlayerName(),
      currentTier: this.getCurrentTier()
    };
  }
  
  /**
   * Import leaderboard data
   */
  importData(data) {
    try {
      if (data.personalBests) {
        this.personalBests = new Map(Object.entries(data.personalBests));
      }
      
      if (data.globalLeaderboards) {
        this.globalLeaderboards = new Map(Object.entries(data.globalLeaderboards));
      }
      
      if (data.sessionStats) {
        this.sessionStats = { ...this.sessionStats, ...data.sessionStats };
      }
      
      if (data.performanceMetrics) {
        this.performanceMetrics = { ...this.performanceMetrics, ...data.performanceMetrics };
      }
      
      this.savePersonalBests();
      this.saveGlobalLeaderboards();
      
      return true;
    } catch (error) {
      console.error('Failed to import leaderboard data:', error);
      return false;
    }
  }
  
  /**
   * Clear all leaderboard data
   */
  clearData() {
    this.personalBests.clear();
    this.globalLeaderboards.clear();
    this.resetSessionStats();
    this.performanceMetrics = {
      accuracy: 0,
      efficiency: 0,
      consistency: 0,
      adaptability: 0,
      mastery: 0
    };
    
    localStorage.removeItem('personalBests');
    localStorage.removeItem('globalLeaderboards');
  }
  
  // ============================================================================
  // Cloud Sync Helper Methods
  // ============================================================================
  
  /**
   * Generate unique client ID
   */
  generateClientId() {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
      clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('clientId', clientId);
    }
    return clientId;
  }
  
  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Get client ID
   */
  getClientId() {
    return this.clientId;
  }
  
  /**
   * Get current session ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }
  
  /**
   * Get game version
   */
  getGameVersion() {
    return '1.0.0'; // Should be dynamically determined
  }
  
  /**
   * Get auth token for cloud sync
   */
  getAuthToken() {
    return this.authToken || localStorage.getItem('authToken') || 'anonymous';
  }
  
  /**
   * Set auth token
   */
  setAuthToken(token) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }
  
  /**
   * Get leaderboard endpoint URL
   */
  getLeaderboardEndpoint() {
    return this.leaderboardApiUrl;
  }
  
  /**
   * Update local rankings cache
   */
  updateLocalRankingsCache(rankings) {
    try {
      localStorage.setItem('leaderboardRankingsCache', JSON.stringify({
        rankings,
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000 // 30 minutes
      }));
    } catch (error) {
      console.warn('Failed to update rankings cache:', error);
    }
  }
  
  /**
   * Get cached rankings
   */
  getCachedRankings() {
    try {
      const cached = localStorage.getItem('leaderboardRankingsCache');
      if (!cached) {return null;}
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp > data.ttl) {
        localStorage.removeItem('leaderboardRankingsCache');
        return null;
      }
      
      return data.rankings;
    } catch (error) {
      console.warn('Failed to get cached rankings:', error);
      return null;
    }
  }
  
  /**
   * Enable cloud sync
   */
  enableCloudSync(apiUrl, authToken) {
    this.cloudSyncEnabled = true;
    if (apiUrl) {this.leaderboardApiUrl = apiUrl;}
    if (authToken) {this.setAuthToken(authToken);}
    
    // Start periodic sync processing
    this.startPeriodicSync();
  }
  
  /**
   * Disable cloud sync
   */
  disableCloudSync() {
    this.cloudSyncEnabled = false;
    this.stopPeriodicSync();
  }
  
  /**
   * Start periodic sync processing
   */
  startPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    this.syncIntervalId = setInterval(() => {
      this.processQueuedSync();
    }, this.syncInterval);
    
    // Also process on network reconnection
    window.addEventListener('online', () => {
      setTimeout(() => this.processQueuedSync(), 1000);
    });
  }
  
  /**
   * Stop periodic sync processing
   */
  stopPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
  
  /**
   * Get sync queue status
   */
  getSyncQueueStatus() {
    try {
      const queue = JSON.parse(localStorage.getItem('leaderboardSyncQueue') || '[]');
      return {
        queueLength: queue.length,
        cloudSyncEnabled: this.cloudSyncEnabled,
        isOnline: navigator.onLine,
        lastSyncAttempt: localStorage.getItem('lastSyncAttempt'),
        nextSyncIn: this.syncIntervalId ? this.syncInterval : null
      };
    } catch (error) {
      return {
        queueLength: 0,
        cloudSyncEnabled: this.cloudSyncEnabled,
        isOnline: navigator.onLine,
        error: error.message
      };
    }
  }
}
