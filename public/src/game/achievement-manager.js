/**
 * Achievement Manager - Bridge between WASM achievements and JavaScript UI
 * Handles achievement tracking, notifications, and persistence
 */

export class AchievementManager {
  constructor(wasmManager, uiManager) {
    this.wasmManager = wasmManager;
    this.uiManager = uiManager;
    
    // Achievement tracking
    this.achievements = new Map();
    this.unlockedAchievements = new Set();
    this.recentlyUnlocked = [];
    this.lastCheckedCount = 0;
    
    // Check interval for new achievements
    this.checkInterval = 1000; // Check every second
    this.checkTimer = null;
    
    // Achievement categories
    this.categories = {
      combat: 'Combat',
      exploration: 'Exploration',
      collection: 'Collection',
      mastery: 'Mastery',
      special: 'Special'
    };
    
    // Achievement rarities for display
    this.rarities = {
      0: { name: 'Common', color: '#9CA3AF', icon: '⭐' },
      1: { name: 'Uncommon', color: '#10B981', icon: '⭐⭐' },
      2: { name: 'Rare', color: '#3B82F6', icon: '⭐⭐⭐' },
      3: { name: 'Epic', color: '#8B5CF6', icon: '⭐⭐⭐⭐' },
      4: { name: 'Legendary', color: '#F59E0B', icon: '⭐⭐⭐⭐⭐' }
    };
    
    this.initialize();
  }
  
  /**
   * Initialize achievement system
   */
  initialize() {
    this.loadAchievements();
    this.startCheckingForAchievements();
    this.setupEventListeners();
  }
  
  /**
   * Load all achievements from WASM
   */
  loadAchievements() {
    if (!this.wasmManager.isLoaded) {
      console.warn('WASM not loaded, cannot load achievements');
      return;
    }
    
    try {
      const count = this.wasmManager.exports.get_achievement_count();
      console.log(`Loading ${count} achievements from WASM`);
      
      for (let i = 0; i < count; i++) {
        const achievement = this.getAchievementData(i);
        if (achievement) {
          this.achievements.set(achievement.id, achievement);
          
          if (achievement.unlocked) {
            this.unlockedAchievements.add(achievement.id);
          }
        }
      }
      
      // Load unlocked flags
      const unlockedFlags = this.wasmManager.exports.get_unlocked_achievements_flags();
      this.updateUnlockedFromFlags(unlockedFlags);
      
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  }
  
  /**
   * Get achievement data from WASM
   * @param {number} index - Achievement index
   * @returns {Object|null} Achievement data
   */
  getAchievementData(index) {
    try {
      const id = this.wasmManager.exports.get_achievement_id(index);
      if (id === 0) {return null;}
      
      // Get name string
      const namePtr = this.wasmManager.exports.get_achievement_name ? 
        this.wasmManager.exports.get_achievement_name(id) : null;
      const name = namePtr ? this.readString(namePtr, 32) : `Achievement ${id}`;
      
      // Get description string  
      const descPtr = this.wasmManager.exports.get_achievement_description ?
        this.wasmManager.exports.get_achievement_description(id) : null;
      const description = descPtr ? this.readString(descPtr, 128) : 'Complete this achievement';
      
      // Get other data
      const progress = this.wasmManager.exports.get_achievement_progress(id);
      const requirement = this.wasmManager.exports.get_achievement_requirement ?
        this.wasmManager.exports.get_achievement_requirement(id) : 1;
      const flags = this.wasmManager.exports.get_achievement_flags(id);
      
      // Parse flags
      const isHidden = (flags & 0x01) !== 0;
      const isSecret = (flags & 0x02) !== 0;
      const isMissable = (flags & 0x04) !== 0;
      const category = (flags >> 8) & 0x0F;
      const rarity = (flags >> 12) & 0x0F;
      
      return {
        id,
        name,
        description,
        progress,
        requirement,
        unlocked: this.unlockedAchievements.has(id),
        isHidden,
        isSecret,
        isMissable,
        category: this.getCategoryName(category),
        rarity: Math.min(rarity, 4),
        icon: this.getAchievementIcon(id, category),
        rewards: this.getAchievementRewards(id)
      };
      
    } catch (error) {
      console.error(`Failed to get achievement data for index ${index}:`, error);
      return null;
    }
  }
  
  /**
   * Read string from WASM memory
   * @param {number} ptr - Pointer to string
   * @param {number} maxLength - Maximum string length
   * @returns {string}
   */
  readString(ptr, maxLength) {
    const memory = new Uint8Array(this.wasmManager.exports.memory.buffer);
    let str = '';
    for (let i = 0; i < maxLength; i++) {
      const char = memory[ptr + i];
      if (char === 0) {break;}
      str += String.fromCharCode(char);
    }
    return str;
  }
  
  /**
   * Get category name from category ID
   * @param {number} categoryId
   * @returns {string}
   */
  getCategoryName(categoryId) {
    const categories = ['combat', 'exploration', 'collection', 'mastery', 'special'];
    return this.categories[categories[categoryId]] || 'General';
  }
  
  /**
   * Get achievement icon based on ID and category
   * @param {number} id
   * @param {number} category
   * @returns {string}
   */
  getAchievementIcon(id, category) {
    // Map achievements to icons based on their ID or category
    const iconMap = {
      1: '🗡️',   // First Blood
      2: '🐺',   // Wolf Slayer
      3: '👑',   // Apex Predator
      4: '💀',   // Death Incarnate
      5: '🛡️',   // Perfect Defense
      6: '⚔️',   // Parry Master
      7: '⏰',   // Survivor
      8: '💪',   // Endurance Test
      9: '🗺️',   // Explorer
      10: '🏰',  // Dungeon Crawler
      11: '🌟',  // Master Explorer
      12: '💰',  // Treasure Hunter
      13: '✨',  // Golden Touch
      14: '👻',  // Untouchable
      15: '🎯',  // Precision
      16: '🥋',  // Combat Expert
      17: '🏆',  // Legendary Warrior
      18: '🎲',  // Risk Taker
      19: '🎰',  // High Roller
      20: '🔥',  // Win Streak
      21: '⚡'   // Unstoppable
    };
    
    return iconMap[id] || '🏅';
  }
  
  /**
   * Get achievement rewards
   * @param {number} id
   * @returns {Object}
   */
  getAchievementRewards(id) {
    // Get rewards from WASM if available
    const gold = this.wasmManager.exports.get_achievement_gold_reward ?
      this.wasmManager.exports.get_achievement_gold_reward(id) : 0;
    const essence = this.wasmManager.exports.get_achievement_essence_reward ?
      this.wasmManager.exports.get_achievement_essence_reward(id) : 0;
    const experience = this.wasmManager.exports.get_achievement_experience_reward ?
      this.wasmManager.exports.get_achievement_experience_reward(id) : 0;
    
    return { gold, essence, experience };
  }
  
  /**
   * Update unlocked achievements from flags
   * @param {number} flags
   */
  updateUnlockedFromFlags(flags) {
    for (let i = 0; i < 64; i++) {
      if (flags & (1n << BigInt(i))) {
        this.unlockedAchievements.add(i + 1);
      }
    }
  }
  
  /**
   * Start checking for new achievements
   */
  startCheckingForAchievements() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    this.checkTimer = setInterval(() => {
      this.checkForNewAchievements();
    }, this.checkInterval);
  }
  
  /**
   * Check for newly unlocked achievements
   */
  checkForNewAchievements() {
    if (!this.wasmManager.isLoaded) {return;}
    
    try {
      // Get current unlocked count
      const newCount = this.wasmManager.exports.get_newly_unlocked_count();
      
      if (newCount > this.lastCheckedCount) {
        // Process new achievements
        for (let i = this.lastCheckedCount; i < newCount; i++) {
          const achievementId = this.wasmManager.exports.get_newly_unlocked_id(i);
          this.onAchievementUnlocked(achievementId);
        }
        
        this.lastCheckedCount = newCount;
      }
      
      // Also check flags for any missed achievements
      const unlockedFlags = this.wasmManager.exports.get_unlocked_achievements_flags();
      for (let i = 0; i < 64; i++) {
        const id = i + 1;
        const isUnlocked = (unlockedFlags & (1n << BigInt(i))) !== 0n;
        
        if (isUnlocked && !this.unlockedAchievements.has(id)) {
          this.onAchievementUnlocked(id);
        }
      }
      
    } catch (error) {
      console.error('Error checking for achievements:', error);
    }
  }
  
  /**
   * Handle achievement unlock
   * @param {number} achievementId
   */
  onAchievementUnlocked(achievementId) {
    if (this.unlockedAchievements.has(achievementId)) {
      return; // Already unlocked
    }
    
    this.unlockedAchievements.add(achievementId);
    this.recentlyUnlocked.push(achievementId);
    
    // Update achievement data
    const achievement = this.achievements.get(achievementId);
    if (achievement) {
      achievement.unlocked = true;
      achievement.unlockedTime = Date.now();
      
      // Show notification
      this.showAchievementNotification(achievement);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('achievementUnlocked', {
        detail: achievement
      }));
      
      // Save to localStorage
      this.saveUnlockedAchievements();
      
      // Play sound based on rarity
      this.playAchievementSound(achievement.rarity);
    }
  }
  
  /**
   * Show achievement notification
   * @param {Object} achievement
   */
  showAchievementNotification(achievement) {
    if (this.uiManager && this.uiManager.showAchievementPopup) {
      this.uiManager.showAchievementPopup(achievement);
    } else {
      // Fallback notification
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'achievement',
          message: `Achievement Unlocked: ${achievement.name}`,
          duration: 5000,
          achievement: achievement
        }
      }));
    }
  }
  
  /**
   * Play achievement sound based on rarity
   * @param {number} rarity
   */
  playAchievementSound(rarity) {
    window.dispatchEvent(new CustomEvent('playSound', {
      detail: {
        sound: 'achievement',
        volume: 0.5 + (rarity * 0.1),
        pitch: 1.0 + (rarity * 0.05)
      }
    }));
  }
  
  /**
   * Get all achievements
   * @returns {Array}
   */
  getAllAchievements() {
    return Array.from(this.achievements.values());
  }
  
  /**
   * Get achievements by category
   * @param {string} category
   * @returns {Array}
   */
  getAchievementsByCategory(category) {
    return this.getAllAchievements().filter(a => a.category === category);
  }
  
  /**
   * Get unlocked achievements
   * @returns {Array}
   */
  getUnlockedAchievements() {
    return this.getAllAchievements().filter(a => a.unlocked);
  }
  
  /**
   * Get locked achievements
   * @returns {Array}
   */
  getLockedAchievements() {
    return this.getAllAchievements().filter(a => !a.unlocked && !a.isSecret);
  }
  
  /**
   * Get achievement progress percentage
   * @param {number} achievementId
   * @returns {number}
   */
  getAchievementProgress(achievementId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {return 0;}
    
    return Math.min(100, (achievement.progress / achievement.requirement) * 100);
  }
  
  /**
   * Get overall completion percentage
   * @returns {number}
   */
  getCompletionPercentage() {
    if (this.wasmManager.exports.get_achievement_completion_percentage) {
      return this.wasmManager.exports.get_achievement_completion_percentage();
    }
    
    const total = this.achievements.size;
    if (total === 0) {return 0;}
    
    const unlocked = this.unlockedAchievements.size;
    return (unlocked / total) * 100;
  }
  
  /**
   * Get achievement score
   * @returns {number}
   */
  getAchievementScore() {
    if (this.wasmManager.exports.get_achievement_score) {
      return this.wasmManager.exports.get_achievement_score();
    }
    
    let score = 0;
    this.unlockedAchievements.forEach(id => {
      const achievement = this.achievements.get(id);
      if (achievement) {
        score += (achievement.rarity + 1) * 100;
      }
    });
    
    return score;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for game events that might trigger achievements
    window.addEventListener('enemyKilled', () => {
      this.checkForNewAchievements();
    });
    
    window.addEventListener('roomCleared', () => {
      this.checkForNewAchievements();
    });
    
    window.addEventListener('goldCollected', () => {
      this.checkForNewAchievements();
    });
    
    window.addEventListener('perfectBlock', () => {
      this.checkForNewAchievements();
    });
    
    window.addEventListener('phaseCompleted', () => {
      this.checkForNewAchievements();
    });
  }
  
  /**
   * Save unlocked achievements to localStorage
   */
  saveUnlockedAchievements() {
    const unlockedArray = Array.from(this.unlockedAchievements);
    localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedArray));
  }
  
  /**
   * Load unlocked achievements from localStorage
   */
  loadUnlockedAchievements() {
    try {
      const saved = localStorage.getItem('unlockedAchievements');
      if (saved) {
        const unlockedArray = JSON.parse(saved);
        unlockedArray.forEach(id => this.unlockedAchievements.add(id));
      }
    } catch (error) {
      console.warn('Failed to load unlocked achievements:', error);
    }
  }
  
  /**
   * Reset all achievements (for debugging)
   */
  resetAchievements() {
    this.unlockedAchievements.clear();
    this.recentlyUnlocked = [];
    this.lastCheckedCount = 0;
    localStorage.removeItem('unlockedAchievements');
    
    // Reset in WASM if function available
    if (this.wasmManager.exports.reset_achievements) {
      this.wasmManager.exports.reset_achievements();
    }
    
    // Reload achievements
    this.loadAchievements();
  }
  
  /**
   * Export achievement data
   * @returns {Object}
   */
  exportData() {
    return {
      unlocked: Array.from(this.unlockedAchievements),
      score: this.getAchievementScore(),
      completion: this.getCompletionPercentage(),
      achievements: Array.from(this.achievements.values())
    };
  }
  
  /**
   * Import achievement data
   * @param {Object} data
   */
  importData(data) {
    if (data.unlocked) {
      this.unlockedAchievements = new Set(data.unlocked);
      this.saveUnlockedAchievements();
    }
  }
}