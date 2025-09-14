/**
 * Persistence Manager - Central coordinator for all persistence systems
 * Integrates save/load, achievements, leaderboards, and statistics
 */

import { LeaderboardSystem } from './leaderboard-system.js';
import { initializePersistenceUI } from '../ui/persistence-ui.js';

export class PersistenceManager {
  constructor(gameStateManager, wasmManager) {
    this.gameStateManager = gameStateManager;
    this.wasmManager = wasmManager;
    
    // Component systems
    this.leaderboardSystem = null;
    this.persistenceUI = null;
    
    // Auto-save settings
    this.autoSaveEnabled = true;
    this.autoSaveInterval = 5 * 60 * 1000; // 5 minutes
    this.autoSaveTimer = null;
    this.lastAutoSave = 0;
    
    // Event tracking
    this.eventQueue = [];
    this.processingEvents = false;
    
    // Statistics session
    this.sessionActive = false;
    this.sessionStartTime = 0;
    
    this.init();
  }
  
  /**
   * Initialize persistence manager
   */
  init() {
    this.initializeSubSystems();
    this.setupEventListeners();
    this.loadSettings();
    this.startAutoSave();
    this.startStatisticsSession();
  }
  
  /**
   * Initialize all sub-systems
   */
  initializeSubSystems() {
    // Initialize leaderboard system
    this.leaderboardSystem = new LeaderboardSystem(this.gameStateManager, this);
    
    // Initialize persistence UI
    this.persistenceUI = initializePersistenceUI(this.gameStateManager, this.wasmManager);
    if (this.persistenceUI) {
      this.persistenceUI.setLeaderboardSystem(this.leaderboardSystem);
    }
    
    // Initialize WASM systems
    if (this.wasmManager?.exports) {
      // Initialize achievement system
      if (this.wasmManager.exports.init_achievement_system) {
        this.wasmManager.exports.init_achievement_system();
      }
      
      // Initialize statistics system
      if (this.wasmManager.exports.start_stats_session) {
        this.wasmManager.exports.start_stats_session();
      }
    }
  }
  
  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // Game state events
    if (this.gameStateManager) {
      this.gameStateManager.on('stateUpdated', (state) => {
        this.onGameStateUpdated(state);
      });
      
      this.gameStateManager.on('gameStopped', () => {
        this.onGameStopped();
      });
      
      this.gameStateManager.on('gameStarted', () => {
        this.onGameStarted();
      });
    }
    
    // Custom game events
    window.addEventListener('enemyKilled', (event) => {
      this.queueEvent('enemyKilled', event.detail);
    });
    
    window.addEventListener('perfectBlock', (event) => {
      this.queueEvent('perfectBlock', event.detail);
    });
    
    window.addEventListener('roomCleared', (event) => {
      this.queueEvent('roomCleared', event.detail);
    });
    
    window.addEventListener('goldCollected', (event) => {
      this.queueEvent('goldCollected', event.detail);
    });
    
    window.addEventListener('damageDealt', (event) => {
      this.queueEvent('damageDealt', event.detail);
    });
    
    window.addEventListener('damageTaken', (event) => {
      this.queueEvent('damageTaken', event.detail);
    });
    
    window.addEventListener('rollExecuted', (event) => {
      this.queueEvent('rollExecuted', event.detail);
    });
    
    window.addEventListener('gameCompleted', (event) => {
      this.queueEvent('gameCompleted', event.detail);
    });
    
    window.addEventListener('playerDeath', (event) => {
      this.queueEvent('playerDeath', event.detail);
    });
    
    window.addEventListener('achievementUnlocked', (event) => {
      this.onAchievementUnlocked(event.detail);
    });
    
    window.addEventListener('phaseCompleted', (event) => {
      this.queueEvent('phaseCompleted', event.detail);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });
    
    // Page visibility for auto-save
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performAutoSave();
      }
    });
    
    // Before unload
    window.addEventListener('beforeunload', () => {
      this.performAutoSave();
      this.endStatisticsSession();
    });
  }
  
  /**
   * Load persistence settings
   */
  loadSettings() {
    try {
      this.autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false';
      
      const savedInterval = localStorage.getItem('autoSaveInterval');
      if (savedInterval) {
        this.autoSaveInterval = parseInt(savedInterval);
      }
    } catch (error) {
      console.warn('Failed to load persistence settings:', error);
    }
  }
  
  /**
   * Save persistence settings
   */
  saveSettings() {
    try {
      localStorage.setItem('autoSaveEnabled', this.autoSaveEnabled.toString());
      localStorage.setItem('autoSaveInterval', this.autoSaveInterval.toString());
    } catch (error) {
      console.warn('Failed to save persistence settings:', error);
    }
  }
  
  // ============================================================================
  // Event Processing
  // ============================================================================
  
  /**
   * Queue event for processing
   */
  queueEvent(eventType, eventData) {
    this.eventQueue.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });
    
    // Process events if not already processing
    if (!this.processingEvents) {
      this.processEventQueue();
    }
  }
  
  /**
   * Process queued events
   */
  async processEventQueue() {
    if (this.processingEvents || this.eventQueue.length === 0) {return;}
    
    this.processingEvents = true;
    
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.processingEvents = false;
    }
  }
  
  /**
   * Process individual event
   */
  processEvent(event) {
    try {
      // Update statistics
      this.updateStatistics(event);
      
      // Update achievements
      this.updateAchievements(event);
      
      // Update leaderboards if game completed
      if (event.type === 'gameCompleted') {
        this.updateLeaderboards(event.data);
      }
      
    } catch (error) {
      console.error(`Error processing ${event.type} event:`, error);
    }
  }
  
  /**
   * Update statistics for event
   */
  updateStatistics(event) {
    if (!this.wasmManager?.exports) {return;}
    
    try {
      switch (event.type) {
        case 'enemyKilled':
          if (this.wasmManager.exports.on_enemy_killed_stats) {
            this.wasmManager.exports.on_enemy_killed_stats(event.data.enemyType || 0);
          }
          break;
          
        case 'perfectBlock':
          if (this.wasmManager.exports.on_perfect_block_stats) {
            this.wasmManager.exports.on_perfect_block_stats();
          }
          break;
          
        case 'damageDealt':
          if (this.wasmManager.exports.on_attack_landed_stats) {
            this.wasmManager.exports.on_attack_landed_stats(event.data.damage || 0);
          }
          break;
          
        case 'damageTaken':
          if (this.wasmManager.exports.on_damage_taken_stats) {
            this.wasmManager.exports.on_damage_taken_stats(event.data.damage || 0);
          }
          break;
          
        case 'rollExecuted':
          if (this.wasmManager.exports.on_roll_executed_stats) {
            this.wasmManager.exports.on_roll_executed_stats();
          }
          break;
          
        case 'roomCleared':
          if (this.wasmManager.exports.on_room_cleared_stats) {
            this.wasmManager.exports.on_room_cleared_stats();
          }
          break;
          
        case 'goldCollected':
          if (this.wasmManager.exports.on_gold_earned_stats) {
            this.wasmManager.exports.on_gold_earned_stats(event.data.amount || 0);
          }
          break;
          
        case 'gameCompleted':
          if (this.wasmManager.exports.on_game_completed_stats) {
            this.wasmManager.exports.on_game_completed_stats(event.data.survivalTime || 0);
          }
          break;
          
        case 'playerDeath':
          if (this.wasmManager.exports.on_player_death_stats) {
            this.wasmManager.exports.on_player_death_stats();
          }
          break;
      }
    } catch (error) {
      console.error('Statistics update failed:', error);
    }
  }
  
  /**
   * Update achievements for event
   */
  updateAchievements(event) {
    if (!this.wasmManager?.exports?.trigger_achievement_event) {return;}
    
    try {
      const eventTypeMap = {
        'enemyKilled': 0,
        'perfectBlock': 1,
        'roomCleared': 2,
        'goldCollected': 3,
        'damageDealt': 4,
        'gameCompleted': 5,
        'playerDeath': 6,
        'phaseCompleted': 7
      };
      
      const eventTypeId = eventTypeMap[event.type];
      if (eventTypeId !== undefined) {
        const value = event.data?.amount || event.data?.damage || event.data?.phase || 1;
        this.wasmManager.exports.trigger_achievement_event(eventTypeId, value);
      }
      
      // Check for newly unlocked achievements
      this.checkNewlyUnlockedAchievements();
      
    } catch (error) {
      console.error('Achievement update failed:', error);
    }
  }
  
  /**
   * Check for newly unlocked achievements
   */
  checkNewlyUnlockedAchievements() {
    if (!this.wasmManager?.exports) {return;}
    
    try {
      const newlyUnlockedCount = this.wasmManager.exports.get_newly_unlocked_count();
      
      for (let i = 0; i < newlyUnlockedCount; i++) {
        const achievementId = this.wasmManager.exports.get_newly_unlocked_id(i);
        const achievementInfo = this.wasmManager.exports.get_achievement_info_json(achievementId);
        const achievement = JSON.parse(achievementInfo);
        
        // Dispatch achievement unlocked event
        window.dispatchEvent(new CustomEvent('achievementUnlocked', {
          detail: achievement
        }));
      }
      
      // Clear newly unlocked list
      if (newlyUnlockedCount > 0) {
        this.wasmManager.exports.clear_newly_unlocked();
      }
      
    } catch (error) {
      console.error('Failed to check newly unlocked achievements:', error);
    }
  }
  
  /**
   * Update leaderboards with game result
   */
  updateLeaderboards(gameResult) {
    if (this.leaderboardSystem) {
      this.leaderboardSystem.recordGameResult(gameResult);
    }
  }
  
  // ============================================================================
  // Game State Events
  // ============================================================================
  
  /**
   * Handle game state updates
   */
  onGameStateUpdated(state) {
    // Check for auto-save conditions
    if (this.shouldAutoSave(state)) {
      this.performAutoSave();
    }
  }
  
  /**
   * Handle game started
   */
  onGameStarted() {
    this.startStatisticsSession();
    
    // Clear event queue
    this.eventQueue = [];
  }
  
  /**
   * Handle game stopped
   */
  onGameStopped() {
    this.performAutoSave();
    this.endStatisticsSession();
  }
  
  /**
   * Handle achievement unlocked
   */
  onAchievementUnlocked(achievement) {
    // Show notification
    this.showAchievementNotification(achievement);
    
    // Update leaderboard achievement count
    if (this.leaderboardSystem) {
      this.leaderboardSystem.updateAchievementLeaderboard(achievement);
    }
  }
  
  // ============================================================================
  // Auto-Save System
  // ============================================================================
  
  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    if (this.autoSaveEnabled) {
      this.autoSaveTimer = setInterval(() => {
        this.performAutoSave();
      }, this.autoSaveInterval);
    }
  }
  
  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  /**
   * Check if auto-save should be performed
   */
  shouldAutoSave(state) {
    if (!this.autoSaveEnabled) {return false;}
    
    const now = Date.now();
    const timeSinceLastSave = now - this.lastAutoSave;
    
    // Time-based auto-save
    if (timeSinceLastSave >= this.autoSaveInterval) {
      return true;
    }
    
    // Event-based auto-save conditions
    if (state) {
      // Phase transitions
      if (state.phaseChanged) {
        return true;
      }
      
      // Significant progress
      if (state.roomsCleared && state.roomsCleared % 5 === 0) {
        return true;
      }
      
      // Level ups
      if (state.levelGained) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Perform auto-save
   */
  performAutoSave() {
    if (!this.autoSaveEnabled || !this.wasmManager?.exports) {return;}
    
    try {
      // Check if the auto_save_check function exists
      if (typeof this.wasmManager.exports.auto_save_check === 'function') {
        const result = this.wasmManager.exports.auto_save_check();
        if (result) {
          this.lastAutoSave = Date.now();
          console.log('Auto-save completed');
          
          // Dispatch auto-save event
          window.dispatchEvent(new CustomEvent('autoSaveCompleted', {
            detail: { timestamp: this.lastAutoSave }
          }));
        }
      } else {
        // Auto-save function not available - this is expected in fallback mode
        console.info('Auto-save function not available in WASM module (fallback mode)');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
  
  /**
   * Enable/disable auto-save
   */
  setAutoSaveEnabled(enabled) {
    this.autoSaveEnabled = enabled;
    this.saveSettings();
    
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }
  
  /**
   * Set auto-save interval
   */
  setAutoSaveInterval(intervalMs) {
    this.autoSaveInterval = Math.max(60000, intervalMs); // Minimum 1 minute
    this.saveSettings();
    
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }
  
  // ============================================================================
  // Statistics Session Management
  // ============================================================================
  
  /**
   * Start statistics session
   */
  startStatisticsSession() {
    if (this.sessionActive) {
      this.endStatisticsSession();
    }
    
    if (this.wasmManager?.exports?.start_stats_session) {
      this.wasmManager.exports.start_stats_session();
      this.sessionActive = true;
      this.sessionStartTime = Date.now();
    }
  }
  
  /**
   * End statistics session
   */
  endStatisticsSession() {
    if (this.sessionActive && this.wasmManager?.exports?.end_stats_session) {
      this.wasmManager.exports.end_stats_session();
      this.sessionActive = false;
    }
  }
  
  // ============================================================================
  // UI Integration
  // ============================================================================
  
  /**
   * Show persistence UI
   */
  showPersistenceUI(tab = 'saves') {
    if (this.persistenceUI) {
      this.persistenceUI.show(tab);
    }
  }
  
  /**
   * Hide persistence UI
   */
  hidePersistenceUI() {
    if (this.persistenceUI) {
      this.persistenceUI.hide();
    }
  }
  
  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Ctrl+S or Cmd+S for quick save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.performQuickSave();
    }
    
    // F5 for save/load menu
    if (event.key === 'F5') {
      event.preventDefault();
      this.showPersistenceUI('saves');
    }
    
    // F6 for achievements
    if (event.key === 'F6') {
      event.preventDefault();
      this.showPersistenceUI('achievements');
    }
    
    // F7 for leaderboards
    if (event.key === 'F7') {
      event.preventDefault();
      this.showPersistenceUI('leaderboards');
    }
    
    // F8 for statistics
    if (event.key === 'F8') {
      event.preventDefault();
      this.showPersistenceUI('statistics');
    }
  }
  
  /**
   * Perform quick save
   */
  performQuickSave() {
    if (!this.wasmManager?.exports?.quick_save) {return;}
    
    try {
      const result = this.wasmManager.exports.quick_save();
      if (result) {
        this.showNotification('Game saved!', 'success');
      } else {
        this.showNotification('Save failed', 'error');
      }
    } catch (error) {
      console.error('Quick save failed:', error);
      this.showNotification('Save error: ' + error.message, 'error');
    }
  }
  
  /**
   * Show achievement notification
   */
  showAchievementNotification(achievement) {
    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-icon">🏆</div>
        <div class="achievement-text">
          <h4>Achievement Unlocked!</h4>
          <p>${achievement.name}</p>
        </div>
      </div>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f39c12, #e67e22);
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10002;
      animation: slideInAchievement 0.5s ease;
      max-width: 300px;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInAchievement {
        from {
          transform: translateX(100%) scale(0.8);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
      .achievement-notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .achievement-icon {
        font-size: 32px;
      }
      .achievement-text h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: bold;
      }
      .achievement-text p {
        margin: 0;
        font-size: 13px;
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideInAchievement 0.3s ease reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 4000);
    
    // Play achievement sound if available
    this.playAchievementSound();
  }
  
  /**
   * Show general notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    
    // Set background color based on type
    const colors = {
      success: '#27ae60',
      error: '#e74c3c',
      info: '#3498db',
      warning: '#f39c12'
    };
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  /**
   * Play achievement sound
   */
  playAchievementSound() {
    try {
      // Try to play achievement sound
      const audio = new Audio('assets/audio/ui/achievement.ogg');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore audio play failures
      });
    } catch (error) {
      // Ignore audio errors
    }
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Get persistence status
   */
  getStatus() {
    return {
      autoSaveEnabled: this.autoSaveEnabled,
      autoSaveInterval: this.autoSaveInterval,
      lastAutoSave: this.lastAutoSave,
      sessionActive: this.sessionActive,
      sessionStartTime: this.sessionStartTime,
      eventQueueLength: this.eventQueue.length,
      leaderboardSyncEnabled: this.leaderboardSystem?.cloudSyncEnabled || false
    };
  }
  
  /**
   * Export all persistence data
   */
  exportAllData() {
    const data = {
      saves: {},
      achievements: null,
      leaderboards: null,
      statistics: null,
      settings: {
        autoSaveEnabled: this.autoSaveEnabled,
        autoSaveInterval: this.autoSaveInterval
      },
      timestamp: Date.now(),
      version: '1.0.0'
    };
    
    // Collect save slots
    for (let i = 1; i <= 5; i++) {
      const slotData = this.getSaveData(`slot${i}`);
      if (slotData) {
        data.saves[`slot${i}`] = slotData;
      }
    }
    
    const quickSave = this.getSaveData('quicksave');
    if (quickSave) {
      data.saves.quicksave = quickSave;
    }
    
    // Get achievement data
    if (this.wasmManager?.exports?.get_achievements_summary_json) {
      try {
        data.achievements = JSON.parse(this.wasmManager.exports.get_achievements_summary_json());
      } catch (error) {
        console.warn('Failed to export achievements:', error);
      }
    }
    
    // Get leaderboard data
    if (this.leaderboardSystem) {
      data.leaderboards = this.leaderboardSystem.exportData();
    }
    
    // Get statistics data
    if (this.wasmManager?.exports?.get_session_stats) {
      try {
        data.statistics = JSON.parse(this.wasmManager.exports.get_session_stats());
      } catch (error) {
        console.warn('Failed to export statistics:', error);
      }
    }
    
    return data;
  }
  
  /**
   * Import all persistence data
   */
  importAllData(data) {
    try {
      // Import saves
      if (data.saves) {
        Object.entries(data.saves).forEach(([slotId, saveData]) => {
          localStorage.setItem(`dozedent_save_${slotId}`, JSON.stringify(saveData));
        });
      }
      
      // Import settings
      if (data.settings) {
        this.autoSaveEnabled = data.settings.autoSaveEnabled !== false;
        this.autoSaveInterval = data.settings.autoSaveInterval || this.autoSaveInterval;
        this.saveSettings();
        
        if (this.autoSaveEnabled) {
          this.startAutoSave();
        }
      }
      
      // Import leaderboard data
      if (data.leaderboards && this.leaderboardSystem) {
        this.leaderboardSystem.importData(data.leaderboards);
      }
      
      this.showNotification('All data imported successfully!', 'success');
      return true;
      
    } catch (error) {
      console.error('Import failed:', error);
      this.showNotification('Import failed: ' + error.message, 'error');
      return false;
    }
  }
  
  /**
   * Clear all persistence data
   */
  clearAllData() {
    // Clear saves
    for (let i = 1; i <= 5; i++) {
      localStorage.removeItem(`dozedent_save_slot${i}`);
    }
    localStorage.removeItem('dozedent_save_quicksave');
    
    // Clear achievements (WASM)
    if (this.wasmManager?.exports?.reset_all_achievements) {
      this.wasmManager.exports.reset_all_achievements();
    }
    
    // Clear statistics (WASM)
    if (this.wasmManager?.exports?.reset_all_statistics) {
      this.wasmManager.exports.reset_all_statistics();
    }
    
    // Clear leaderboards
    if (this.leaderboardSystem) {
      this.leaderboardSystem.clearData();
    }
    
    // Clear settings
    localStorage.removeItem('autoSaveEnabled');
    localStorage.removeItem('autoSaveInterval');
    
    this.showNotification('All data cleared', 'info');
  }
  
  /**
   * Get save data for slot
   */
  getSaveData(slotId) {
    try {
      const data = localStorage.getItem(`dozedent_save_${slotId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Failed to load save data for ${slotId}:`, error);
      return null;
    }
  }
  
  /**
   * Cleanup on destroy
   */
  destroy() {
    this.stopAutoSave();
    this.endStatisticsSession();
    
    if (this.leaderboardSystem) {
      this.leaderboardSystem.stopPeriodicSync();
    }
  }
}
