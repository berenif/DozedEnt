/**
 * Persistence UI Components - Save/Load, Achievements, and Leaderboards
 * Comprehensive UI system for all persistence features
 */

export class PersistenceUI {
  constructor(gameStateManager, wasmManager) {
    this.gameStateManager = gameStateManager;
    this.wasmManager = wasmManager;
    this.leaderboardSystem = null;
    
    // UI state
    this.currentTab = 'saves';
    this.selectedSaveSlot = null;
    this.achievementFilters = {
      category: 'all',
      rarity: 'all',
      status: 'all'
    };
    
    // UI elements
    this.container = null;
    this.modal = null;
    this.tabs = null;
    this.content = null;
    
    this.init();
  }
  
  /**
   * Initialize persistence UI system
   */
  init() {
    this.createUIStructure();
    this.setupEventListeners();
    this.loadInitialData();
  }
  
  /**
   * Create main UI structure
   */
  createUIStructure() {
    // Main container
    this.container = document.createElement('div');
    this.container.className = 'persistence-ui-container';
    this.container.style.display = 'none';
    
    // Modal backdrop
    this.modal = document.createElement('div');
    this.modal.className = 'persistence-modal';
    this.modal.innerHTML = `
      <div class="persistence-modal-content">
        <div class="persistence-header">
          <h2>Game Data & Progress</h2>
          <button class="close-btn" id="closePersistenceUI">&times;</button>
        </div>
        
        <div class="persistence-tabs">
          <button class="tab-btn active" data-tab="saves">💾 Saves</button>
          <button class="tab-btn" data-tab="achievements">🏆 Achievements</button>
          <button class="tab-btn" data-tab="leaderboards">📊 Leaderboards</button>
          <button class="tab-btn" data-tab="statistics">📈 Statistics</button>
        </div>
        
        <div class="persistence-content">
          <div id="saves-content" class="tab-content active">
            <div class="saves-section">
              <div class="saves-header">
                <h3>Save Games</h3>
                <div class="saves-actions">
                  <button id="quickSave" class="btn btn-primary">Quick Save</button>
                  <button id="autoSaveToggle" class="btn btn-secondary">Auto-Save: ON</button>
                </div>
              </div>
              <div class="save-slots" id="saveSlots">
                <!-- Save slots will be dynamically generated -->
              </div>
              <div class="save-import-export">
                <h4>Import/Export</h4>
                <div class="import-export-actions">
                  <button id="exportSave" class="btn btn-outline">Export Save</button>
                  <button id="importSave" class="btn btn-outline">Import Save</button>
                  <input type="file" id="saveFileInput" accept=".json" style="display: none;">
                </div>
              </div>
            </div>
          </div>
          
          <div id="achievements-content" class="tab-content">
            <div class="achievements-section">
              <div class="achievements-header">
                <h3>Achievements</h3>
                <div class="achievement-stats">
                  <span id="achievementProgress">0 / 0 Unlocked</span>
                  <span id="achievementScore">0 Points</span>
                </div>
              </div>
              
              <div class="achievement-filters">
                <select id="categoryFilter">
                  <option value="all">All Categories</option>
                  <option value="combat">Combat</option>
                  <option value="survival">Survival</option>
                  <option value="exploration">Exploration</option>
                  <option value="economy">Economy</option>
                </select>
                
                <select id="rarityFilter">
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
                
                <select id="statusFilter">
                  <option value="all">All</option>
                  <option value="unlocked">Unlocked</option>
                  <option value="locked">Locked</option>
                  <option value="progress">In Progress</option>
                </select>
              </div>
              
              <div class="achievements-grid" id="achievementsGrid">
                <!-- Achievements will be dynamically generated -->
              </div>
            </div>
          </div>
          
          <div id="leaderboards-content" class="tab-content">
            <div class="leaderboards-section">
              <div class="leaderboards-header">
                <h3>Leaderboards</h3>
                <div class="leaderboard-sync-status">
                  <span id="syncStatus">Offline Mode</span>
                  <button id="enableCloudSync" class="btn btn-small">Enable Cloud Sync</button>
                </div>
              </div>
              
              <div class="leaderboard-categories">
                <div class="category-tabs">
                  <button class="category-tab active" data-category="highScore">🏆 High Score</button>
                  <button class="category-tab" data-category="survivalTime">⏱️ Survival Time</button>
                  <button class="category-tab" data-category="roomsCleared">🏰 Rooms Cleared</button>
                  <button class="category-tab" data-category="enemiesKilled">⚔️ Enemies Killed</button>
                </div>
                
                <div class="leaderboard-content">
                  <div class="personal-best">
                    <h4>Your Best</h4>
                    <div id="personalBestDisplay">
                      <span class="pb-value">--</span>
                      <span class="pb-rank">Unranked</span>
                    </div>
                  </div>
                  
                  <div class="leaderboard-list" id="leaderboardList">
                    <!-- Leaderboard entries will be dynamically generated -->
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div id="statistics-content" class="tab-content">
            <div class="statistics-section">
              <div class="statistics-header">
                <h3>Statistics</h3>
                <div class="stats-period">
                  <select id="statsPeriod">
                    <option value="session">Current Session</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              
              <div class="statistics-grid" id="statisticsGrid">
                <!-- Statistics will be dynamically generated -->
              </div>
              
              <div class="session-summary">
                <h4>Current Session</h4>
                <div id="sessionSummary">
                  <!-- Session stats will be displayed here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.appendChild(this.modal);
    document.body.appendChild(this.container);
    
    // Cache frequently used elements
    this.tabs = this.container.querySelectorAll('.tab-btn');
    this.content = this.container.querySelector('.persistence-content');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Close modal
    this.container.querySelector('#closePersistenceUI').addEventListener('click', () => {
      this.hide();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
    
    // Save/Load actions
    this.setupSaveLoadListeners();
    
    // Achievement filters
    this.setupAchievementListeners();
    
    // Leaderboard actions
    this.setupLeaderboardListeners();
    
    // Statistics actions
    this.setupStatisticsListeners();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
  }
  
  /**
   * Setup save/load event listeners
   */
  setupSaveLoadListeners() {
    // Quick save
    this.container.querySelector('#quickSave').addEventListener('click', () => {
      this.performQuickSave();
    });
    
    // Auto-save toggle
    const autoSaveBtn = this.container.querySelector('#autoSaveToggle');
    autoSaveBtn.addEventListener('click', () => {
      this.toggleAutoSave();
    });
    
    // Import/Export
    this.container.querySelector('#exportSave').addEventListener('click', () => {
      this.exportSaveData();
    });
    
    this.container.querySelector('#importSave').addEventListener('click', () => {
      this.container.querySelector('#saveFileInput').click();
    });
    
    this.container.querySelector('#saveFileInput').addEventListener('change', (e) => {
      this.importSaveData(e.target.files[0]);
    });
  }
  
  /**
   * Setup achievement event listeners
   */
  setupAchievementListeners() {
    const filters = ['categoryFilter', 'rarityFilter', 'statusFilter'];
    
    filters.forEach(filterId => {
      this.container.querySelector(`#${filterId}`).addEventListener('change', (e) => {
        this.achievementFilters[filterId.replace('Filter', '')] = e.target.value;
        this.updateAchievementsDisplay();
      });
    });
  }
  
  /**
   * Setup leaderboard event listeners
   */
  setupLeaderboardListeners() {
    // Category tabs
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchLeaderboardCategory(e.target.dataset.category);
      });
    });
    
    // Cloud sync toggle
    this.container.querySelector('#enableCloudSync').addEventListener('click', () => {
      this.toggleCloudSync();
    });
  }
  
  /**
   * Setup statistics event listeners
   */
  setupStatisticsListeners() {
    this.container.querySelector('#statsPeriod').addEventListener('change', (e) => {
      this.updateStatisticsDisplay(e.target.value);
    });
  }
  
  /**
   * Load initial data
   */
  loadInitialData() {
    this.updateSaveSlots();
    this.updateAchievementsDisplay();
    this.updateLeaderboardsDisplay();
    this.updateStatisticsDisplay();
  }
  
  /**
   * Show the persistence UI
   */
  show(initialTab = 'saves') {
    this.container.style.display = 'flex';
    this.switchTab(initialTab);
    this.loadInitialData();
    
    // Focus management
    this.container.querySelector('.close-btn').focus();
  }
  
  /**
   * Hide the persistence UI
   */
  hide() {
    this.container.style.display = 'none';
  }
  
  /**
   * Check if UI is visible
   */
  isVisible() {
    return this.container.style.display !== 'none';
  }
  
  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    // Update tab buttons
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update content
    this.content.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-content`);
    });
    
    this.currentTab = tabName;
    
    // Load tab-specific data
    switch (tabName) {
      case 'saves':
        this.updateSaveSlots();
        break;
      case 'achievements':
        this.updateAchievementsDisplay();
        break;
      case 'leaderboards':
        this.updateLeaderboardsDisplay();
        break;
      case 'statistics':
        this.updateStatisticsDisplay();
        break;
    }
  }
  
  // ============================================================================
  // Save/Load Implementation
  // ============================================================================
  
  /**
   * Update save slots display
   */
  updateSaveSlots() {
    const slotsContainer = this.container.querySelector('#saveSlots');
    slotsContainer.innerHTML = '';
    
    // Create save slots (5 slots + quick save)
    const slots = [
      { id: 'quicksave', name: 'Quick Save', icon: '⚡' },
      { id: 'slot1', name: 'Save Slot 1', icon: '💾' },
      { id: 'slot2', name: 'Save Slot 2', icon: '💾' },
      { id: 'slot3', name: 'Save Slot 3', icon: '💾' },
      { id: 'slot4', name: 'Save Slot 4', icon: '💾' },
      { id: 'slot5', name: 'Save Slot 5', icon: '💾' }
    ];
    
    slots.forEach(slot => {
      const saveData = this.getSaveData(slot.id);
      const slotElement = this.createSaveSlotElement(slot, saveData);
      slotsContainer.appendChild(slotElement);
    });
  }
  
  /**
   * Create save slot element
   */
  createSaveSlotElement(slot, saveData) {
    const element = document.createElement('div');
    element.className = `save-slot ${saveData ? 'has-data' : 'empty'}`;
    
    if (saveData) {
      element.innerHTML = `
        <div class="slot-icon">${slot.icon}</div>
        <div class="slot-info">
          <h4>${slot.name}</h4>
          <p>Level ${saveData.level || 1} • Room ${saveData.roomCount || 0}</p>
          <p class="save-time">${this.formatDate(saveData.timestamp)}</p>
          <div class="save-stats">
            <span>💰 ${saveData.gold || 0}</span>
            <span>💎 ${saveData.essence || 0}</span>
            <span>⏱️ ${this.formatTime(saveData.totalPlayTime || 0)}</span>
          </div>
        </div>
        <div class="slot-actions">
          <button class="btn btn-primary" onclick="persistenceUI.loadSave('${slot.id}')">Load</button>
          <button class="btn btn-secondary" onclick="persistenceUI.saveTo('${slot.id}')">Save</button>
          <button class="btn btn-danger" onclick="persistenceUI.deleteSave('${slot.id}')">Delete</button>
        </div>
      `;
    } else {
      element.innerHTML = `
        <div class="slot-icon">${slot.icon}</div>
        <div class="slot-info">
          <h4>${slot.name}</h4>
          <p class="empty-text">Empty Slot</p>
        </div>
        <div class="slot-actions">
          <button class="btn btn-primary" onclick="persistenceUI.saveTo('${slot.id}')">Save Here</button>
        </div>
      `;
    }
    
    return element;
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
   * Perform quick save
   */
  performQuickSave() {
    try {
      if (this.wasmManager?.exports?.quick_save) {
        const result = this.wasmManager.exports.quick_save();
        if (result) {
          this.showNotification('Game saved successfully!', 'success');
          this.updateSaveSlots();
        } else {
          this.showNotification('Failed to save game', 'error');
        }
      }
    } catch (error) {
      console.error('Quick save failed:', error);
      this.showNotification('Save failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Save to specific slot
   */
  saveTo(slotId) {
    try {
      if (this.wasmManager?.exports?.create_save_data) {
        // Get save data from WASM
        const saveDataPtr = this.wasmManager.exports.create_save_data();
        const saveSize = this.wasmManager.exports.get_save_data_size();
        
        // Read save data from WASM memory
        const saveData = new Uint8Array(this.wasmManager.memory.buffer, saveDataPtr, saveSize);
        
        // Convert to base64 for storage
        const base64Data = btoa(String.fromCharCode.apply(null, saveData));
        
        // Add metadata
        const saveObject = {
          data: base64Data,
          timestamp: Date.now(),
          version: this.wasmManager.exports.get_save_version(),
          slotId: slotId
        };
        
        // Store in localStorage
        localStorage.setItem(`dozedent_save_${slotId}`, JSON.stringify(saveObject));
        
        this.showNotification(`Saved to ${slotId}!`, 'success');
        this.updateSaveSlots();
      }
    } catch (error) {
      console.error('Save failed:', error);
      this.showNotification('Save failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Load from specific slot
   */
  loadSave(slotId) {
    try {
      const saveData = this.getSaveData(slotId);
      if (!saveData) {
        this.showNotification('No save data found', 'error');
        return;
      }
      
      if (this.wasmManager?.exports?.load_save_data) {
        // Convert base64 back to binary
        const binaryString = atob(saveData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Allocate memory in WASM
        const ptr = this.wasmManager.exports.malloc(bytes.length);
        const wasmArray = new Uint8Array(this.wasmManager.memory.buffer, ptr, bytes.length);
        wasmArray.set(bytes);
        
        // Load the save data
        const result = this.wasmManager.exports.load_save_data(ptr, bytes.length);
        
        // Free allocated memory
        this.wasmManager.exports.free(ptr);
        
        if (result) {
          this.showNotification(`Loaded ${slotId}!`, 'success');
          this.hide();
          
          // Trigger game state update
          if (this.gameStateManager) {
            this.gameStateManager.emit('saveLoaded', { slotId, saveData });
          }
        } else {
          this.showNotification('Failed to load save data', 'error');
        }
      }
    } catch (error) {
      console.error('Load failed:', error);
      this.showNotification('Load failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Delete save slot
   */
  deleteSave(slotId) {
    if (confirm(`Are you sure you want to delete ${slotId}? This cannot be undone.`)) {
      localStorage.removeItem(`dozedent_save_${slotId}`);
      this.showNotification(`Deleted ${slotId}`, 'success');
      this.updateSaveSlots();
    }
  }
  
  /**
   * Toggle auto-save
   */
  toggleAutoSave() {
    const autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false';
    const newState = !autoSaveEnabled;
    
    localStorage.setItem('autoSaveEnabled', newState.toString());
    
    const btn = this.container.querySelector('#autoSaveToggle');
    btn.textContent = `Auto-Save: ${newState ? 'ON' : 'OFF'}`;
    btn.className = `btn ${newState ? 'btn-secondary' : 'btn-outline'}`;
    
    this.showNotification(`Auto-save ${newState ? 'enabled' : 'disabled'}`, 'info');
  }
  
  /**
   * Export save data
   */
  exportSaveData() {
    try {
      const exportData = {
        saves: {},
        achievements: this.getAchievementData(),
        leaderboards: this.getLeaderboardData(),
        statistics: this.getStatisticsData(),
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      // Collect all save slots
      for (let i = 1; i <= 5; i++) {
        const slotData = this.getSaveData(`slot${i}`);
        if (slotData) {
          exportData.saves[`slot${i}`] = slotData;
        }
      }
      
      const quickSave = this.getSaveData('quicksave');
      if (quickSave) {
        exportData.saves.quicksave = quickSave;
      }
      
      // Create download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `dozedent_save_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      this.showNotification('Save data exported!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Export failed: ' + error.message, 'error');
    }
  }
  
  /**
   * Import save data
   */
  async importSaveData(file) {
    if (!file) {return;}
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data
      if (!importData.version || !importData.timestamp) {
        throw new Error('Invalid save file format');
      }
      
      // Import saves
      if (importData.saves) {
        Object.entries(importData.saves).forEach(([slotId, saveData]) => {
          localStorage.setItem(`dozedent_save_${slotId}`, JSON.stringify(saveData));
        });
      }
      
      // Import other data (achievements, leaderboards, etc.)
      if (importData.achievements) {
        this.importAchievementData(importData.achievements);
      }
      
      if (importData.leaderboards) {
        this.importLeaderboardData(importData.leaderboards);
      }
      
      if (importData.statistics) {
        this.importStatisticsData(importData.statistics);
      }
      
      this.showNotification('Save data imported successfully!', 'success');
      this.loadInitialData();
      
    } catch (error) {
      console.error('Import failed:', error);
      this.showNotification('Import failed: ' + error.message, 'error');
    }
  }
  
  // ============================================================================
  // Achievements Implementation
  // ============================================================================
  
  /**
   * Update achievements display
   */
  updateAchievementsDisplay() {
    if (!this.wasmManager?.exports) {return;}
    
    const achievementsGrid = this.container.querySelector('#achievementsGrid');
    const progressSpan = this.container.querySelector('#achievementProgress');
    const scoreSpan = this.container.querySelector('#achievementScore');
    
    try {
      // Get achievement summary (create from individual functions if get_achievements_summary_json doesn't exist)
      let summary;
      if (typeof this.wasmManager.exports.get_achievements_summary_json === 'function') {
        const summaryJson = this.wasmManager.exports.get_achievements_summary_json();
        summary = JSON.parse(summaryJson);
      } else {
        // Create summary from individual achievement functions
        summary = this.createAchievementSummary();
      }
      
      // Update header stats
      progressSpan.textContent = `${summary.unlockedAchievements} / ${summary.totalAchievements} Unlocked`;
      scoreSpan.textContent = `${summary.totalScore} Points`;
      
      // Clear and rebuild grid
      achievementsGrid.innerHTML = '';
      
      // Check if the achievement functions exist
      if (typeof this.wasmManager.exports.get_achievement_count !== 'function') {
        console.warn('Achievement functions not available in WASM module');
        achievementsGrid.innerHTML = '<p class="warning">Achievement system not available</p>';
        return;
      }
      
      const achievementCount = this.wasmManager.exports.get_achievement_count();
      
      for (let i = 0; i < achievementCount; i++) {
        const achievementId = this.wasmManager.exports.get_achievement_id(i);
        const infoJson = this.wasmManager.exports.get_achievement_info_json(achievementId);
        const achievement = JSON.parse(infoJson);
        
        // Apply filters
        if (!this.shouldShowAchievement(achievement)) {continue;}
        
        const achievementElement = this.createAchievementElement(achievement);
        achievementsGrid.appendChild(achievementElement);
      }
      
    } catch (error) {
      console.error('Failed to update achievements display:', error);
      achievementsGrid.innerHTML = '<p class="error">Failed to load achievements</p>';
    }
  }
  
  /**
   * Create achievement summary from individual WASM functions
   */
  createAchievementSummary() {
    let totalAchievements = 0;
    let unlockedAchievements = 0;
    let totalScore = 0;
    
    try {
      // Get total achievements count
      if (typeof this.wasmManager.exports.get_achievement_count === 'function') {
        totalAchievements = this.wasmManager.exports.get_achievement_count();
      }
      
      // Count unlocked achievements and calculate score
      for (let i = 0; i < totalAchievements; i++) {
        try {
          const achievementId = this.wasmManager.exports.get_achievement_id(i);
          if (typeof this.wasmManager.exports.is_achievement_unlocked === 'function' && 
              this.wasmManager.exports.is_achievement_unlocked(achievementId)) {
            unlockedAchievements++;
          }
        } catch (error) {
          console.warn(`Error checking achievement ${i}:`, error);
        }
      }
      
      // Get total score if available
      if (typeof this.wasmManager.exports.get_total_achievement_score === 'function') {
        totalScore = this.wasmManager.exports.get_total_achievement_score();
      }
      
    } catch (error) {
      console.warn('Error creating achievement summary:', error);
    }
    
    return {
      totalAchievements,
      unlockedAchievements,
      totalScore
    };
  }
  
  /**
   * Create fallback session statistics when WASM function is not available
   */
  createFallbackSessionStats() {
    return {
      duration: 0,
      enemiesKilled: 0,
      roomsCleared: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
      experienceGained: 0,
      achievementsUnlocked: 0,
      accuracy: 0,
      efficiency: 0,
      perfectActions: 0,
      totalActions: 0,
      deathCount: 0
    };
  }
  
  /**
   * Check if achievement should be shown based on filters
   */
  shouldShowAchievement(achievement) {
    const filters = this.achievementFilters;
    
    // Category filter
    if (filters.category !== 'all') {
      // Map achievement types to categories
      const categoryMap = {
        0: 'combat', // ACHIEVEMENT_KILL_COUNT
        1: 'combat', // ACHIEVEMENT_DAMAGE_DEALT
        2: 'combat', // ACHIEVEMENT_PERFECT_BLOCKS
        3: 'exploration', // ACHIEVEMENT_ROOMS_CLEARED
        4: 'economy', // ACHIEVEMENT_GOLD_COLLECTED
        5: 'survival', // ACHIEVEMENT_SURVIVAL_TIME
        6: 'survival', // ACHIEVEMENT_CONSECUTIVE_WINS
      };
      
      const achievementCategory = categoryMap[achievement.type] || 'other';
      if (achievementCategory !== filters.category) {return false;}
    }
    
    // Rarity filter
    if (filters.rarity !== 'all') {
      const rarityNames = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const achievementRarity = rarityNames[achievement.rarityLevel] || 'common';
      if (achievementRarity !== filters.rarity) {return false;}
    }
    
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'unlocked' && !achievement.unlocked) {return false;}
      if (filters.status === 'locked' && achievement.unlocked) {return false;}
      if (filters.status === 'progress' && (achievement.unlocked || achievement.progress === 0)) {return false;}
    }
    
    return true;
  }
  
  /**
   * Create achievement element
   */
  createAchievementElement(achievement) {
    const element = document.createElement('div');
    element.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'} rarity-${achievement.rarity.toLowerCase()}`;
    
    const progressPercent = achievement.target > 0 ? 
      Math.min(100, (achievement.progress / achievement.target) * 100) : 0;
    
    const rarityIcons = {
      'Common': '🥉',
      'Uncommon': '🥈',
      'Rare': '🥇',
      'Epic': '💎',
      'Legendary': '👑'
    };
    
    element.innerHTML = `
      <div class="achievement-icon">
        ${rarityIcons[achievement.rarity] || '🏆'}
        ${achievement.unlocked ? '<div class="unlock-badge">✓</div>' : ''}
      </div>
      <div class="achievement-info">
        <h4>${achievement.name}</h4>
        <p>${achievement.description}</p>
        <div class="achievement-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="progress-text">${achievement.progress} / ${achievement.target}</span>
        </div>
        <div class="achievement-meta">
          <span class="rarity">${achievement.rarity}</span>
          ${achievement.unlocked ? `<span class="unlock-time">${this.formatDate(achievement.unlockedTime)}</span>` : ''}
        </div>
      </div>
      <div class="achievement-rewards">
        ${achievement.goldReward > 0 ? `<span>💰 ${achievement.goldReward}</span>` : ''}
        ${achievement.essenceReward > 0 ? `<span>💎 ${achievement.essenceReward}</span>` : ''}
        ${achievement.experienceReward > 0 ? `<span>⭐ ${achievement.experienceReward}</span>` : ''}
      </div>
    `;
    
    return element;
  }
  
  // ============================================================================
  // Leaderboards Implementation
  // ============================================================================
  
  /**
   * Update leaderboards display
   */
  updateLeaderboardsDisplay() {
    if (!this.leaderboardSystem) {
      this.container.querySelector('#leaderboardList').innerHTML = 
        '<p class="info">Leaderboard system not initialized</p>';
      return;
    }
    
    this.updateLeaderboardSyncStatus();
    this.updatePersonalBest();
    this.updateLeaderboardList();
  }
  
  /**
   * Update sync status display
   */
  updateLeaderboardSyncStatus() {
    const statusSpan = this.container.querySelector('#syncStatus');
    const syncBtn = this.container.querySelector('#enableCloudSync');
    
    if (this.leaderboardSystem.cloudSyncEnabled) {
      const queueStatus = this.leaderboardSystem.getSyncQueueStatus();
      statusSpan.textContent = `Online (${queueStatus.queueLength} queued)`;
      statusSpan.className = 'status-online';
      syncBtn.textContent = 'Disable Cloud Sync';
    } else {
      statusSpan.textContent = 'Offline Mode';
      statusSpan.className = 'status-offline';
      syncBtn.textContent = 'Enable Cloud Sync';
    }
  }
  
  /**
   * Switch leaderboard category
   */
  switchLeaderboardCategory(category) {
    // Update tab buttons
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    this.currentLeaderboardCategory = category;
    this.updatePersonalBest();
    this.updateLeaderboardList();
  }
  
  /**
   * Update personal best display
   */
  updatePersonalBest() {
    const category = this.currentLeaderboardCategory || 'highScore';
    const personalBest = this.leaderboardSystem.getPersonalBest(category);
    const formattedValue = this.leaderboardSystem.getFormattedPersonalBest(category);
    
    const pbDisplay = this.container.querySelector('#personalBestDisplay');
    pbDisplay.innerHTML = `
      <span class="pb-value">${formattedValue}</span>
      <span class="pb-rank">${personalBest.rank ? `#${personalBest.rank}` : 'Unranked'}</span>
    `;
  }
  
  /**
   * Update leaderboard list
   */
  updateLeaderboardList() {
    const category = this.currentLeaderboardCategory || 'highScore';
    const leaderboard = this.leaderboardSystem.getGlobalLeaderboard(category);
    const listContainer = this.container.querySelector('#leaderboardList');
    
    if (!leaderboard || leaderboard.length === 0) {
      listContainer.innerHTML = '<p class="info">No leaderboard data available</p>';
      return;
    }
    
    listContainer.innerHTML = '';
    
    leaderboard.slice(0, 10).forEach((entry, index) => {
      const entryElement = document.createElement('div');
      entryElement.className = `leaderboard-entry ${entry.playerId === this.leaderboardSystem.getPlayerId() ? 'own-entry' : ''}`;
      
      entryElement.innerHTML = `
        <div class="rank">#${index + 1}</div>
        <div class="player-name">${entry.playerName || 'Anonymous'}</div>
        <div class="score">${this.leaderboardSystem.formatValue(entry.value, this.leaderboardSystem.categories[category].format)}</div>
        <div class="timestamp">${this.formatDate(entry.timestamp)}</div>
      `;
      
      listContainer.appendChild(entryElement);
    });
  }
  
  /**
   * Toggle cloud sync
   */
  toggleCloudSync() {
    if (this.leaderboardSystem.cloudSyncEnabled) {
      this.leaderboardSystem.disableCloudSync();
      this.showNotification('Cloud sync disabled', 'info');
    } else {
      // In a real implementation, this would show a login dialog
      this.leaderboardSystem.enableCloudSync();
      this.showNotification('Cloud sync enabled', 'success');
    }
    
    this.updateLeaderboardSyncStatus();
  }
  
  // ============================================================================
  // Statistics Implementation
  // ============================================================================
  
  /**
   * Update statistics display
   */
  updateStatisticsDisplay(period = 'session') {
    if (!this.wasmManager?.exports) {return;}
    
    const statisticsGrid = this.container.querySelector('#statisticsGrid');
    const sessionSummary = this.container.querySelector('#sessionSummary');
    
    try {
      // Get statistics data from WASM
      let sessionData;
      if (typeof this.wasmManager.exports.get_session_stats === 'function') {
        const sessionStats = this.wasmManager.exports.get_session_stats();
        sessionData = JSON.parse(sessionStats);
      } else {
        // Create fallback session data
        sessionData = this.createFallbackSessionStats();
      }
      
      // Update session summary
      sessionSummary.innerHTML = `
        <div class="session-stat">
          <span class="stat-label">Duration:</span>
          <span class="stat-value">${this.formatTime(sessionData.duration)}</span>
        </div>
        <div class="session-stat">
          <span class="stat-label">Enemies Killed:</span>
          <span class="stat-value">${sessionData.enemiesKilled}</span>
        </div>
        <div class="session-stat">
          <span class="stat-label">Rooms Cleared:</span>
          <span class="stat-value">${sessionData.roomsCleared}</span>
        </div>
        <div class="session-stat">
          <span class="stat-label">Damage Dealt:</span>
          <span class="stat-value">${sessionData.damageDealt}</span>
        </div>
        <div class="session-stat">
          <span class="stat-label">Accuracy:</span>
          <span class="stat-value">${sessionData.accuracy.toFixed(1)}%</span>
        </div>
        <div class="session-stat">
          <span class="stat-label">Efficiency:</span>
          <span class="stat-value">${sessionData.efficiency.toFixed(2)} K/min</span>
        </div>
      `;
      
      // Update statistics grid
      statisticsGrid.innerHTML = '';
      
      // Check if the statistics functions exist
      if (typeof this.wasmManager.exports.get_statistic_count !== 'function') {
        console.warn('Statistics functions not available in WASM module');
        statisticsGrid.innerHTML = '<p class="warning">Statistics system not available</p>';
        return;
      }
      
      const statCount = this.wasmManager.exports.get_statistic_count();
      
      for (let i = 0; i < statCount; i++) {
        const statInfo = this.wasmManager.exports.get_statistic_info(i);
        const stat = JSON.parse(statInfo);
        
        const statElement = this.createStatisticElement(stat, period);
        statisticsGrid.appendChild(statElement);
      }
      
    } catch (error) {
      console.error('Failed to update statistics display:', error);
      statisticsGrid.innerHTML = '<p class="error">Failed to load statistics</p>';
    }
  }
  
  /**
   * Create statistic element
   */
  createStatisticElement(stat, period) {
    const element = document.createElement('div');
    element.className = 'statistic-item';
    
    const value = period === 'session' ? stat.session : stat.total;
    const categoryIcons = {
      0: '⚔️', // Combat
      1: '💀', // Survival
      2: '💰', // Economy
      3: '🏰', // Exploration
      4: '📈', // Progression
      5: '🎯', // Performance
      6: '👥', // Social
      7: '⚙️'  // Meta
    };
    
    element.innerHTML = `
      <div class="stat-icon">${categoryIcons[stat.category] || '📊'}</div>
      <div class="stat-info">
        <h4>${stat.name}</h4>
        <div class="stat-values">
          <span class="current-value">${this.formatStatValue(value, stat.type)}</span>
          ${stat.type === 0 ? `<span class="max-value">Max: ${this.formatStatValue(stat.maximum, stat.type)}</span>` : ''}
        </div>
      </div>
    `;
    
    return element;
  }
  
  /**
   * Format statistic value based on type
   */
  formatStatValue(value, type) {
    switch (type) {
      case 0: // Counter
      case 1: // Accumulator
        return Math.round(value).toLocaleString();
      case 2: // Maximum
      case 3: // Minimum
        return Math.round(value).toLocaleString();
      case 4: // Average
        return value.toFixed(2);
      case 5: // Rate
        return value.toFixed(2) + '/min';
      case 6: // Percentage
        return value.toFixed(1) + '%';
      default:
        return value.toString();
    }
  }
  
  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  /**
   * Format date for display
   */
  formatDate(timestamp) {
    if (!timestamp) {return 'Never';}
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  /**
   * Format time duration
   */
  formatTime(seconds) {
    if (!seconds || seconds < 0) {return '0:00';}
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } 
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    
  }
  
  /**
   * Get achievement data for export
   */
  getAchievementData() {
    try {
      if (this.wasmManager?.exports?.get_achievements_summary_json) {
        return JSON.parse(this.wasmManager.exports.get_achievements_summary_json());
      }
    } catch (error) {
      console.warn('Failed to get achievement data:', error);
    }
    return null;
  }
  
  /**
   * Get leaderboard data for export
   */
  getLeaderboardData() {
    return this.leaderboardSystem ? this.leaderboardSystem.exportData() : null;
  }
  
  /**
   * Get statistics data for export
   */
  getStatisticsData() {
    try {
      if (this.wasmManager?.exports?.get_session_stats) {
        return JSON.parse(this.wasmManager.exports.get_session_stats());
      }
    } catch (error) {
      console.warn('Failed to get statistics data:', error);
    }
    return null;
  }
  
  /**
   * Import achievement data
   */
  importAchievementData(data) {
    // Achievement data is managed by WASM, so we'd need to
    // restore it through the save system
    console.log('Achievement data import not yet implemented');
  }
  
  /**
   * Import leaderboard data
   */
  importLeaderboardData(data) {
    if (this.leaderboardSystem) {
      this.leaderboardSystem.importData(data);
    }
  }
  
  /**
   * Import statistics data
   */
  importStatisticsData(data) {
    // Statistics data is managed by WASM
    console.log('Statistics data import not yet implemented');
  }
  
  /**
   * Set leaderboard system reference
   */
  setLeaderboardSystem(leaderboardSystem) {
    this.leaderboardSystem = leaderboardSystem;
  }
}

// Global instance for easy access
window.persistenceUI = null;

/**
 * Initialize persistence UI
 */
export function initializePersistenceUI(gameStateManager, wasmManager) {
  if (!window.persistenceUI) {
    window.persistenceUI = new PersistenceUI(gameStateManager, wasmManager);
  }
  return window.persistenceUI;
}

/**
 * Show persistence UI with specific tab
 */
export function showPersistenceUI(tab = 'saves') {
  if (window.persistenceUI) {
    window.persistenceUI.show(tab);
  }
}
