/**
 * Statistics Manager - Interface for WASM statistics system
 * Handles statistics retrieval, formatting, and session tracking
 */

export class StatisticsManager {
  constructor(wasmManager) {
    this.wasmManager = wasmManager;
    
    // Statistics cache
    this.statistics = new Map();
    this.sessionStats = null;
    this.historicalStats = [];
    
    // Update intervals
    this.updateInterval = 5000; // Update every 5 seconds
    this.updateTimer = null;
    
    // Categories for organization
    this.categories = {
      combat: 'Combat',
      survival: 'Survival',
      economy: 'Economy',
      exploration: 'Exploration',
      progression: 'Progression',
      performance: 'Performance',
      meta: 'Meta'
    };
    
    this.initialize();
  }
  
  /**
   * Initialize statistics system
   */
  initialize() {
    this.loadStatistics();
    this.startAutoUpdate();
    this.setupEventListeners();
  }
  
  /**
   * Load all statistics from WASM
   */
  loadStatistics() {
    if (!this.wasmManager.isLoaded) {
      console.warn('WASM not loaded, cannot load statistics');
      return;
    }
    
    try {
      // Get all statistics as JSON if available
      if (this.wasmManager.exports.get_all_statistics_json) {
        const jsonPtr = this.wasmManager.exports.get_all_statistics_json();
        const jsonStr = this.readString(jsonPtr, 8192);
        
        try {
          const stats = JSON.parse(jsonStr);
          this.processStatistics(stats);
        } catch (e) {
          console.warn('Failed to parse statistics JSON, using fallback');
          this.loadStatisticsFallback();
        }
      } else {
        this.loadStatisticsFallback();
      }
      
      // Load session statistics
      this.loadSessionStats();
      
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }
  
  /**
   * Fallback method to load statistics individually
   */
  loadStatisticsFallback() {
    // Define statistics manually based on what we know from the WASM
    const statsDefinitions = [
      { id: 'enemies_killed', name: 'Enemies Killed', category: 'combat', getter: 'get_enemies_killed' },
      { id: 'perfect_blocks', name: 'Perfect Blocks', category: 'combat', getter: 'get_perfect_blocks' },
      { id: 'damage_dealt', name: 'Total Damage Dealt', category: 'combat', getter: 'get_total_damage_dealt' },
      { id: 'damage_taken', name: 'Total Damage Taken', category: 'combat', getter: 'get_total_damage_taken' },
      { id: 'rolls_executed', name: 'Rolls Executed', category: 'combat', getter: 'get_rolls_executed' },
      { id: 'rooms_cleared', name: 'Rooms Cleared', category: 'exploration', getter: 'get_rooms_cleared' },
      { id: 'gold_earned', name: 'Gold Earned', category: 'economy', getter: 'get_gold' },
      { id: 'essence_earned', name: 'Essence Earned', category: 'economy', getter: 'get_essence' },
      { id: 'play_time', name: 'Total Play Time', category: 'meta', getter: 'get_total_play_time' },
      { id: 'current_level', name: 'Current Level', category: 'progression', getter: 'get_player_level' },
      { id: 'experience', name: 'Total Experience', category: 'progression', getter: 'get_experience' }
    ];
    
    statsDefinitions.forEach(def => {
      const value = this.wasmManager.exports[def.getter] ? 
        this.wasmManager.exports[def.getter]() : 0;
      
      this.statistics.set(def.id, {
        id: def.id,
        name: def.name,
        category: def.category,
        value: value,
        sessionValue: value,
        totalValue: value
      });
    });
  }
  
  /**
   * Process statistics from JSON
   * @param {Object} stats
   */
  processStatistics(stats) {
    if (Array.isArray(stats)) {
      stats.forEach(stat => {
        this.statistics.set(stat.id || stat.name, stat);
      });
    } else if (typeof stats === 'object') {
      Object.entries(stats).forEach(([key, value]) => {
        this.statistics.set(key, {
          id: key,
          name: this.formatStatName(key),
          value: value,
          category: this.guessCategory(key)
        });
      });
    }
  }
  
  /**
   * Load session statistics
   */
  loadSessionStats() {
    if (this.wasmManager.exports.get_session_statistics_json) {
      const jsonPtr = this.wasmManager.exports.get_session_statistics_json();
      const jsonStr = this.readString(jsonPtr, 2048);
      
      try {
        this.sessionStats = JSON.parse(jsonStr);
      } catch (e) {
        console.warn('Failed to parse session statistics');
        this.sessionStats = this.createDefaultSessionStats();
      }
    } else {
      this.sessionStats = this.createDefaultSessionStats();
    }
  }
  
  /**
   * Create default session statistics
   * @returns {Object}
   */
  createDefaultSessionStats() {
    return {
      startTime: Date.now(),
      duration: 0,
      enemiesKilled: 0,
      roomsCleared: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
      experienceGained: 0,
      achievementsUnlocked: 0,
      accuracy: 0,
      efficiency: 0
    };
  }
  
  /**
   * Get all statistics
   * @returns {Array}
   */
  getAllStatistics() {
    return Array.from(this.statistics.values());
  }
  
  /**
   * Get statistics by category
   * @param {string} category
   * @returns {Array}
   */
  getStatisticsByCategory(category) {
    return this.getAllStatistics().filter(stat => stat.category === category);
  }
  
  /**
   * Get session statistics
   * @returns {Object}
   */
  getSessionStats() {
    return this.sessionStats || this.createDefaultSessionStats();
  }
  
  /**
   * Get formatted statistic value
   * @param {string} statId
   * @returns {string}
   */
  getFormattedStatistic(statId) {
    const stat = this.statistics.get(statId);
    if (!stat) return 'N/A';
    
    return this.formatValue(stat.value, stat.type || this.guessType(statId));
  }
  
  /**
   * Format value based on type
   * @param {number} value
   * @param {string} type
   * @returns {string}
   */
  formatValue(value, type) {
    if (value === undefined || value === null) return '0';
    
    switch (type) {
      case 'time':
        return this.formatTime(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return this.formatNumber(Math.floor(value));
      case 'decimal':
        return value.toFixed(2);
      default:
        return this.formatNumber(Math.floor(value));
    }
  }
  
  /**
   * Format time in seconds
   * @param {number} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
  
  /**
   * Format number with commas
   * @param {number} num
   * @returns {string}
   */
  formatNumber(num) {
    return num.toLocaleString();
  }
  
  /**
   * Format stat name from key
   * @param {string} key
   * @returns {string}
   */
  formatStatName(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  /**
   * Guess category from stat key
   * @param {string} key
   * @returns {string}
   */
  guessCategory(key) {
    if (key.includes('kill') || key.includes('damage') || key.includes('block') || key.includes('attack')) {
      return 'combat';
    } else if (key.includes('gold') || key.includes('essence') || key.includes('item')) {
      return 'economy';
    } else if (key.includes('room') || key.includes('floor') || key.includes('explore')) {
      return 'exploration';
    } else if (key.includes('level') || key.includes('exp') || key.includes('skill')) {
      return 'progression';
    } else if (key.includes('time') || key.includes('play') || key.includes('session')) {
      return 'meta';
    } else if (key.includes('accuracy') || key.includes('rate') || key.includes('efficiency')) {
      return 'performance';
    } else {
      return 'survival';
    }
  }
  
  /**
   * Guess type from stat key
   * @param {string} key
   * @returns {string}
   */
  guessType(key) {
    if (key.includes('time')) return 'time';
    if (key.includes('rate') || key.includes('accuracy') || key.includes('percentage')) return 'percentage';
    if (key.includes('gold') || key.includes('cost')) return 'currency';
    return 'number';
  }
  
  /**
   * Update statistics from WASM
   */
  updateStatistics() {
    this.loadStatistics();
    
    // Dispatch update event
    window.dispatchEvent(new CustomEvent('statisticsUpdated', {
      detail: {
        statistics: this.getAllStatistics(),
        session: this.getSessionStats()
      }
    }));
  }
  
  /**
   * Start auto-update timer
   */
  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.updateStatistics();
    }, this.updateInterval);
  }
  
  /**
   * Stop auto-update timer
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Update on significant game events
    window.addEventListener('enemyKilled', () => {
      this.updateStatistics();
    });
    
    window.addEventListener('roomCleared', () => {
      this.updateStatistics();
    });
    
    window.addEventListener('phaseCompleted', () => {
      this.updateStatistics();
    });
    
    window.addEventListener('gameOver', () => {
      this.endSession();
    });
  }
  
  /**
   * Start a new session
   */
  startSession() {
    if (this.wasmManager.exports.start_statistics_session) {
      this.wasmManager.exports.start_statistics_session();
    }
    
    this.sessionStats = this.createDefaultSessionStats();
    this.updateStatistics();
  }
  
  /**
   * End current session
   */
  endSession() {
    if (this.wasmManager.exports.end_statistics_session) {
      this.wasmManager.exports.end_statistics_session();
    }
    
    // Save session to history
    if (this.sessionStats) {
      this.historicalStats.push({
        ...this.sessionStats,
        endTime: Date.now()
      });
      
      // Keep only last 100 sessions
      if (this.historicalStats.length > 100) {
        this.historicalStats.shift();
      }
      
      this.saveHistoricalStats();
    }
    
    this.updateStatistics();
  }
  
  /**
   * Get performance metrics
   * @returns {Object}
   */
  getPerformanceMetrics() {
    const stats = this.getAllStatistics();
    
    // Calculate various performance metrics
    const enemiesKilled = this.getStatValue('enemies_killed') || 0;
    const damageDealt = this.getStatValue('damage_dealt') || 0;
    const damageTaken = this.getStatValue('damage_taken') || 0;
    const roomsCleared = this.getStatValue('rooms_cleared') || 0;
    const playTime = this.getStatValue('play_time') || 1;
    
    return {
      killsPerMinute: (enemiesKilled / (playTime / 60)).toFixed(2),
      damagePerKill: enemiesKilled > 0 ? (damageDealt / enemiesKilled).toFixed(2) : 0,
      damageRatio: damageTaken > 0 ? (damageDealt / damageTaken).toFixed(2) : 'N/A',
      roomsPerHour: (roomsCleared / (playTime / 3600)).toFixed(2),
      survivalRate: this.calculateSurvivalRate(),
      efficiency: this.calculateEfficiency()
    };
  }
  
  /**
   * Get stat value by ID
   * @param {string} statId
   * @returns {number}
   */
  getStatValue(statId) {
    const stat = this.statistics.get(statId);
    return stat ? stat.value : 0;
  }
  
  /**
   * Calculate survival rate
   * @returns {number}
   */
  calculateSurvivalRate() {
    const gamesPlayed = this.getStatValue('games_played') || 0;
    const deaths = this.getStatValue('total_deaths') || 0;
    
    if (gamesPlayed === 0) return 0;
    return ((gamesPlayed - deaths) / gamesPlayed * 100).toFixed(1);
  }
  
  /**
   * Calculate efficiency score
   * @returns {number}
   */
  calculateEfficiency() {
    const damageDealt = this.getStatValue('damage_dealt') || 0;
    const damageTaken = this.getStatValue('damage_taken') || 1;
    const roomsCleared = this.getStatValue('rooms_cleared') || 0;
    const playTime = this.getStatValue('play_time') || 1;
    
    // Complex efficiency calculation
    const damageEfficiency = damageDealt / damageTaken;
    const clearanceRate = roomsCleared / (playTime / 60);
    
    return ((damageEfficiency * clearanceRate) * 10).toFixed(1);
  }
  
  /**
   * Get chart data for a statistic
   * @param {string} statId
   * @returns {Array}
   */
  getChartData(statId) {
    // This would return historical data for charting
    // For now, return mock data
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [10, 15, 12, 18, 22, 19, 25]
    };
  }
  
  /**
   * Read string from WASM memory
   * @param {number} ptr
   * @param {number} maxLength
   * @returns {string}
   */
  readString(ptr, maxLength) {
    const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
    let str = '';
    for (let i = 0; i < maxLength; i++) {
      const char = memory[ptr + i];
      if (char === 0) break;
      str += String.fromCharCode(char);
    }
    return str;
  }
  
  /**
   * Save historical statistics to localStorage
   */
  saveHistoricalStats() {
    try {
      localStorage.setItem('statisticsHistory', JSON.stringify(this.historicalStats));
    } catch (error) {
      console.warn('Failed to save statistics history:', error);
    }
  }
  
  /**
   * Load historical statistics from localStorage
   */
  loadHistoricalStats() {
    try {
      const saved = localStorage.getItem('statisticsHistory');
      if (saved) {
        this.historicalStats = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load statistics history:', error);
    }
  }
  
  /**
   * Export statistics data
   * @returns {Object}
   */
  exportData() {
    return {
      current: Array.from(this.statistics.entries()),
      session: this.sessionStats,
      historical: this.historicalStats,
      performance: this.getPerformanceMetrics()
    };
  }
  
  /**
   * Import statistics data
   * @param {Object} data
   */
  importData(data) {
    if (data.current) {
      this.statistics = new Map(data.current);
    }
    if (data.session) {
      this.sessionStats = data.session;
    }
    if (data.historical) {
      this.historicalStats = data.historical;
    }
  }
  
  /**
   * Reset all statistics
   */
  resetStatistics() {
    if (this.wasmManager.exports.reset_all_statistics) {
      this.wasmManager.exports.reset_all_statistics();
    }
    
    this.statistics.clear();
    this.sessionStats = this.createDefaultSessionStats();
    this.historicalStats = [];
    
    localStorage.removeItem('statisticsHistory');
    
    this.loadStatistics();
  }
}