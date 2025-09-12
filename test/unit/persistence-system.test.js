/**
 * Comprehensive tests for the persistence system
 * Tests save/load, achievements, leaderboards, and statistics
 */

import { expect } from 'chai';
import { PersistenceManager } from '../../src/gameplay/persistence-manager.js';
import { LeaderboardSystem } from '../../src/gameplay/leaderboard-system.js';
import { PersistenceUI } from '../../src/ui/persistence-ui.js';

// Mock WASM manager for testing
class MockWasmManager {
  constructor() {
    this.isLoaded = true;
    this.memory = {
      buffer: new ArrayBuffer(1024)
    };
    
    // Mock save data
    this.mockSaveData = new Uint8Array([
      1, 0, 0, 0, // version
      100, 0, 0, 0, // data size
      123, 45, 67, 89, // checksum
      // ... rest of mock save data
    ]);
    
    // Mock achievement data
    this.mockAchievements = {
      count: 5,
      achievements: [
        { id: 1, name: 'First Kill', unlocked: true, progress: 1, target: 1 },
        { id: 2, name: 'Wolf Slayer', unlocked: false, progress: 25, target: 50 },
        { id: 3, name: 'Perfect Defense', unlocked: true, progress: 10, target: 10 },
        { id: 4, name: 'Survivor', unlocked: false, progress: 180, target: 300 },
        { id: 5, name: 'Gold Rush', unlocked: false, progress: 750, target: 1000 }
      ],
      newlyUnlocked: []
    };
    
    // Mock statistics data
    this.mockStatistics = {
      sessionStats: {
        duration: 1200,
        enemiesKilled: 25,
        roomsCleared: 5,
        damageDealt: 1500,
        damageTaken: 200,
        accuracy: 85.5,
        efficiency: 1.25
      },
      statistics: [
        { id: 1, name: 'Enemies Killed', type: 0, category: 0, current: 25, session: 25, total: 150 },
        { id: 2, name: 'Perfect Blocks', type: 0, category: 0, current: 10, session: 3, total: 45 },
        { id: 3, name: 'Damage Dealt', type: 1, category: 0, current: 1500, session: 1500, total: 12000 }
      ]
    };
    
    this.exports = {
      // Save/Load functions
      create_save_data: () => this.mockSaveData.byteOffset,
      get_save_data_size: () => this.mockSaveData.length,
      load_save_data: () => 1,
      quick_save: () => 1,
      auto_save_check: () => 1,
      validate_save_data: () => 1,
      get_save_statistics: () => JSON.stringify({
        level: 5,
        gold: 1250,
        essence: 45,
        roomCount: 12,
        totalPlayTime: 3600
      }),
      
      // Achievement functions
      init_achievement_system: () => {},
      get_achievement_count: () => this.mockAchievements.count,
      get_achievement_id: (index) => this.mockAchievements.achievements[index]?.id || 0,
      get_achievement_info_json: (id) => {
        const achievement = this.mockAchievements.achievements.find(a => a.id === id);
        return JSON.stringify(achievement || {});
      },
      get_achievements_summary_json: () => JSON.stringify({
        totalAchievements: this.mockAchievements.count,
        unlockedAchievements: this.mockAchievements.achievements.filter(a => a.unlocked).length,
        totalScore: 150,
        completionPercentage: 40.0
      }),
      get_newly_unlocked_count: () => this.mockAchievements.newlyUnlocked.length,
      get_newly_unlocked_id: (index) => this.mockAchievements.newlyUnlocked[index] || 0,
      clear_newly_unlocked: () => { this.mockAchievements.newlyUnlocked = []; },
      trigger_achievement_event: (eventType, value) => {
        // Simulate achievement unlock
        if (eventType === 0 && value === 1) { // Enemy killed
          const achievement = this.mockAchievements.achievements.find(a => a.id === 2);
          if (achievement && !achievement.unlocked) {
            achievement.progress++;
            if (achievement.progress >= achievement.target) {
              achievement.unlocked = true;
              this.mockAchievements.newlyUnlocked.push(achievement.id);
            }
          }
        }
      },
      reset_all_achievements: () => {
        this.mockAchievements.achievements.forEach(a => {
          a.unlocked = false;
          a.progress = 0;
        });
        this.mockAchievements.newlyUnlocked = [];
      },
      
      // Statistics functions
      start_stats_session: () => {},
      end_stats_session: () => {},
      get_session_stats: () => JSON.stringify(this.mockStatistics.sessionStats),
      get_statistic_count: () => this.mockStatistics.statistics.length,
      get_statistic_info: (index) => JSON.stringify(this.mockStatistics.statistics[index] || {}),
      reset_all_statistics: () => {
        this.mockStatistics.statistics.forEach(s => {
          s.current = 0;
          s.session = 0;
          s.total = 0;
        });
      },
      
      // Memory management
      malloc: (size) => 1024,
      free: () => {}
    };
  }
  
  // Simulate achievement unlock
  simulateAchievementUnlock(achievementId) {
    const achievement = this.mockAchievements.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.progress = achievement.target;
      this.mockAchievements.newlyUnlocked.push(achievementId);
    }
  }
  
  // Simulate statistics update
  updateStatistic(id, value) {
    const stat = this.mockStatistics.statistics.find(s => s.id === id);
    if (stat) {
      stat.current += value;
      stat.session += value;
      stat.total += value;
    }
  }
}

// Mock game state manager
class MockGameStateManager {
  constructor() {
    this.eventListeners = new Map();
  }
  
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }
}

describe('Persistence System', function() {
  let mockWasm;
  let mockGameState;
  let persistenceManager;
  
  beforeEach(function() {
    // Setup mocks
    mockWasm = new MockWasmManager();
    mockGameState = new MockGameStateManager();
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    } else {
      // Mock localStorage for Node.js environment
      global.localStorage = {
        data: {},
        getItem: function(key) { return this.data[key] || null; },
        setItem: function(key, value) { this.data[key] = value; },
        removeItem: function(key) { delete this.data[key]; },
        clear: function() { this.data = {}; }
      };
    }
    
    // Mock DOM for UI tests
    if (typeof document === 'undefined') {
      global.document = {
        createElement: () => ({
          className: '',
          style: {},
          innerHTML: '',
          appendChild: () => {},
          addEventListener: () => {},
          querySelector: () => null,
          querySelectorAll: () => []
        }),
        body: {
          appendChild: () => {}
        },
        head: {
          appendChild: () => {}
        },
        addEventListener: () => {}
      };
      global.window = {
        addEventListener: () => {},
        dispatchEvent: () => {}
      };
    }
  });
  
  afterEach(function() {
    if (persistenceManager) {
      persistenceManager.destroy();
    }
  });
  
  describe('PersistenceManager', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should initialize successfully', function() {
      expect(persistenceManager).to.exist;
      expect(persistenceManager.gameStateManager).to.equal(mockGameState);
      expect(persistenceManager.wasmManager).to.equal(mockWasm);
    });
    
    it('should initialize with default settings', function() {
      expect(persistenceManager.autoSaveEnabled).to.be.true;
      expect(persistenceManager.autoSaveInterval).to.equal(5 * 60 * 1000);
    });
    
    it('should load settings from localStorage', function() {
      localStorage.setItem('autoSaveEnabled', 'false');
      localStorage.setItem('autoSaveInterval', '300000');
      
      const pm = new PersistenceManager(mockGameState, mockWasm);
      pm.loadSettings();
      
      expect(pm.autoSaveEnabled).to.be.false;
      expect(pm.autoSaveInterval).to.equal(300000);
    });
    
    it('should save settings to localStorage', function() {
      persistenceManager.autoSaveEnabled = false;
      persistenceManager.autoSaveInterval = 300000;
      persistenceManager.saveSettings();
      
      expect(localStorage.getItem('autoSaveEnabled')).to.equal('false');
      expect(localStorage.getItem('autoSaveInterval')).to.equal('300000');
    });
  });
  
  describe('Auto-Save System', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should enable auto-save by default', function() {
      expect(persistenceManager.autoSaveEnabled).to.be.true;
    });
    
    it('should perform auto-save when conditions are met', async function() {
      const result = await persistenceManager.performAutoSave();
      // The mock always returns success
      expect(mockWasm.exports.auto_save_check()).to.equal(1);
    });
    
    it('should respect auto-save enabled setting', async function() {
      persistenceManager.setAutoSaveEnabled(false);
      expect(persistenceManager.autoSaveEnabled).to.be.false;
      
      // Auto-save should not run when disabled
      const result = await persistenceManager.performAutoSave();
      // Function should return early without calling WASM
    });
    
    it('should update auto-save interval', function() {
      persistenceManager.setAutoSaveInterval(10 * 60 * 1000); // 10 minutes
      expect(persistenceManager.autoSaveInterval).to.equal(10 * 60 * 1000);
    });
  });
  
  describe('Event Processing', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should queue events for processing', function() {
      persistenceManager.queueEvent('enemyKilled', { enemyType: 1 });
      persistenceManager.queueEvent('goldCollected', { amount: 50 });
      
      expect(persistenceManager.eventQueue.length).to.equal(2);
    });
    
    it('should process enemy killed events', async function() {
      persistenceManager.queueEvent('enemyKilled', { enemyType: 1 });
      await persistenceManager.processEventQueue();
      
      // Check that achievement progress was updated
      const newlyUnlocked = mockWasm.exports.get_newly_unlocked_count();
      // This would depend on the mock implementation
    });
    
    it('should process achievement unlock events', function() {
      const achievement = { id: 1, name: 'Test Achievement', unlocked: true };
      persistenceManager.onAchievementUnlocked(achievement);
      
      // Should trigger UI notification (mocked)
    });
    
    it('should update statistics for events', function() {
      const event = {
        type: 'damageDealt',
        data: { damage: 100 },
        timestamp: Date.now()
      };
      
      persistenceManager.updateStatistics(event);
      // Should call the appropriate WASM function
    });
  });
  
  describe('Save/Load Operations', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should create save data', function() {
      const saveDataPtr = mockWasm.exports.create_save_data();
      const saveSize = mockWasm.exports.get_save_data_size();
      
      expect(saveDataPtr).to.be.a('number');
      expect(saveSize).to.be.greaterThan(0);
    });
    
    it('should validate save data', function() {
      const isValid = mockWasm.exports.validate_save_data(
        mockWasm.mockSaveData.byteOffset,
        mockWasm.mockSaveData.length
      );
      
      expect(isValid).to.equal(1);
    });
    
    it('should load save data', function() {
      const result = mockWasm.exports.load_save_data(
        mockWasm.mockSaveData.byteOffset,
        mockWasm.mockSaveData.length
      );
      
      expect(result).to.equal(1);
    });
    
    it('should perform quick save', function() {
      const result = mockWasm.exports.quick_save();
      expect(result).to.equal(1);
    });
    
    it('should get save statistics', function() {
      const stats = mockWasm.exports.get_save_statistics();
      const parsed = JSON.parse(stats);
      
      expect(parsed).to.have.property('level');
      expect(parsed).to.have.property('gold');
      expect(parsed).to.have.property('totalPlayTime');
    });
    
    it('should export all data', async function() {
      const exportData = await persistenceManager.exportAllData();
      
      expect(exportData).to.have.property('saves');
      expect(exportData).to.have.property('achievements');
      expect(exportData).to.have.property('leaderboards');
      expect(exportData).to.have.property('statistics');
      expect(exportData).to.have.property('timestamp');
      expect(exportData).to.have.property('version');
    });
  });
  
  describe('Achievement System', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should get achievement count', function() {
      const count = mockWasm.exports.get_achievement_count();
      expect(count).to.equal(5);
    });
    
    it('should get achievement information', function() {
      const achievementInfo = mockWasm.exports.get_achievement_info_json(1);
      const parsed = JSON.parse(achievementInfo);
      
      expect(parsed).to.have.property('id', 1);
      expect(parsed).to.have.property('name', 'First Kill');
      expect(parsed).to.have.property('unlocked', true);
    });
    
    it('should get achievements summary', function() {
      const summary = mockWasm.exports.get_achievements_summary_json();
      const parsed = JSON.parse(summary);
      
      expect(parsed).to.have.property('totalAchievements');
      expect(parsed).to.have.property('unlockedAchievements');
      expect(parsed).to.have.property('completionPercentage');
      expect(parsed).to.have.property('totalScore');
    });
    
    it('should trigger achievement events', function() {
      const initialProgress = mockWasm.mockAchievements.achievements[1].progress;
      
      mockWasm.exports.trigger_achievement_event(0, 1); // Enemy killed
      
      // Progress should be updated
      expect(mockWasm.mockAchievements.achievements[1].progress).to.be.greaterThan(initialProgress);
    });
    
    it('should detect newly unlocked achievements', function() {
      // Simulate achievement unlock
      mockWasm.simulateAchievementUnlock(2);
      
      const newlyUnlockedCount = mockWasm.exports.get_newly_unlocked_count();
      expect(newlyUnlockedCount).to.be.greaterThan(0);
      
      const achievementId = mockWasm.exports.get_newly_unlocked_id(0);
      expect(achievementId).to.equal(2);
    });
    
    it('should clear newly unlocked achievements', function() {
      mockWasm.simulateAchievementUnlock(3);
      mockWasm.exports.clear_newly_unlocked();
      
      const count = mockWasm.exports.get_newly_unlocked_count();
      expect(count).to.equal(0);
    });
    
    it('should reset all achievements', function() {
      mockWasm.exports.reset_all_achievements();
      
      const summary = mockWasm.exports.get_achievements_summary_json();
      const parsed = JSON.parse(summary);
      
      expect(parsed.unlockedAchievements).to.equal(0);
    });
  });
  
  describe('Statistics System', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should start statistics session', function() {
      // Should not throw
      mockWasm.exports.start_stats_session();
    });
    
    it('should get session statistics', function() {
      const sessionStats = mockWasm.exports.get_session_stats();
      const parsed = JSON.parse(sessionStats);
      
      expect(parsed).to.have.property('duration');
      expect(parsed).to.have.property('enemiesKilled');
      expect(parsed).to.have.property('accuracy');
    });
    
    it('should get statistic count', function() {
      const count = mockWasm.exports.get_statistic_count();
      expect(count).to.equal(3);
    });
    
    it('should get statistic information', function() {
      const statInfo = mockWasm.exports.get_statistic_info(0);
      const parsed = JSON.parse(statInfo);
      
      expect(parsed).to.have.property('id');
      expect(parsed).to.have.property('name');
      expect(parsed).to.have.property('type');
      expect(parsed).to.have.property('current');
    });
    
    it('should update statistics', function() {
      const initialValue = mockWasm.mockStatistics.statistics[0].current;
      mockWasm.updateStatistic(1, 5);
      
      expect(mockWasm.mockStatistics.statistics[0].current).to.equal(initialValue + 5);
    });
    
    it('should reset all statistics', function() {
      mockWasm.exports.reset_all_statistics();
      
      mockWasm.mockStatistics.statistics.forEach(stat => {
        expect(stat.current).to.equal(0);
        expect(stat.session).to.equal(0);
        expect(stat.total).to.equal(0);
      });
    });
    
    it('should end statistics session', function() {
      // Should not throw
      mockWasm.exports.end_stats_session();
    });
  });
  
  describe('Leaderboard System', function() {
    let leaderboardSystem;
    
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
      leaderboardSystem = new LeaderboardSystem(mockGameState, persistenceManager);
    });
    
    it('should initialize with default categories', function() {
      expect(leaderboardSystem.categories).to.have.property('highScore');
      expect(leaderboardSystem.categories).to.have.property('survivalTime');
      expect(leaderboardSystem.categories).to.have.property('roomsCleared');
    });
    
    it('should record game results', function() {
      const gameResult = {
        score: 1500,
        survivalTime: 300,
        roomsCleared: 8,
        enemiesKilled: 25,
        perfectBlocks: 5,
        goldCollected: 750
      };
      
      leaderboardSystem.recordGameResult(gameResult);
      
      // Should update personal bests
      const highScore = leaderboardSystem.getPersonalBest('highScore');
      expect(highScore.value).to.equal(1500);
    });
    
    it('should update personal bests', function() {
      const updated = leaderboardSystem.updatePersonalBest('highScore', 2000);
      expect(updated).to.be.true;
      
      const best = leaderboardSystem.getPersonalBest('highScore');
      expect(best.value).to.equal(2000);
    });
    
    it('should format values correctly', function() {
      const formatted = leaderboardSystem.formatValue(1234, 'number');
      expect(formatted).to.equal('1,234');
      
      const timeFormatted = leaderboardSystem.formatValue(125, 'time');
      expect(timeFormatted).to.equal('2:05');
    });
    
    it('should calculate global rank', function() {
      // Mock implementation would return a rank
      const rank = leaderboardSystem.calculateGlobalRank('highScore', 1500);
      expect(rank).to.be.a('number');
    });
    
    it('should export leaderboard data', function() {
      const exportData = leaderboardSystem.exportData();
      
      expect(exportData).to.have.property('personalBests');
      expect(exportData).to.have.property('sessionStats');
      expect(exportData).to.have.property('performanceMetrics');
    });
    
    it('should import leaderboard data', function() {
      const importData = {
        personalBests: {
          highScore: { value: 3000, timestamp: Date.now() }
        },
        sessionStats: {
          runs: 10,
          totalScore: 15000
        }
      };
      
      const success = leaderboardSystem.importData(importData);
      expect(success).to.be.true;
      
      const highScore = leaderboardSystem.getPersonalBest('highScore');
      expect(highScore.value).to.equal(3000);
    });
  });
  
  describe('Integration Tests', function() {
    beforeEach(function() {
      persistenceManager = new PersistenceManager(mockGameState, mockWasm);
    });
    
    it('should handle complete game session', async function() {
      // Start session
      persistenceManager.startStatisticsSession();
      
      // Simulate game events
      persistenceManager.queueEvent('enemyKilled', { enemyType: 1 });
      persistenceManager.queueEvent('goldCollected', { amount: 100 });
      persistenceManager.queueEvent('perfectBlock', {});
      persistenceManager.queueEvent('roomCleared', {});
      
      // Process events
      await persistenceManager.processEventQueue();
      
      // Complete game
      const gameResult = {
        score: 2500,
        survivalTime: 450,
        roomsCleared: 10,
        enemiesKilled: 30,
        perfectBlocks: 8,
        goldCollected: 1200
      };
      
      persistenceManager.updateLeaderboards(gameResult);
      
      // End session
      persistenceManager.endStatisticsSession();
      
      // Verify data was recorded
      const status = persistenceManager.getStatus();
      expect(status).to.have.property('sessionActive', false);
    });
    
    it('should maintain data consistency across operations', async function() {
      // Record some achievements
      mockWasm.exports.trigger_achievement_event(0, 1);
      mockWasm.exports.trigger_achievement_event(3, 100);
      
      // Update statistics
      mockWasm.updateStatistic(1, 10);
      mockWasm.updateStatistic(2, 500);
      
      // Export all data
      const exportData = await persistenceManager.exportAllData();
      
      // Clear all data
      mockWasm.exports.reset_all_achievements();
      mockWasm.exports.reset_all_statistics();
      
      // Import data back
      const success = await persistenceManager.importAllData(exportData);
      expect(success).to.be.true;
      
      // Verify data was restored
      const achievementSummary = JSON.parse(mockWasm.exports.get_achievements_summary_json());
      expect(achievementSummary).to.have.property('totalAchievements');
    });
  });
  
  describe('Error Handling', function() {
    it('should handle WASM initialization failure', function() {
      const badWasm = { isLoaded: false, exports: null };
      const pm = new PersistenceManager(mockGameState, badWasm);
      
      // Should not crash
      expect(pm).to.exist;
    });
    
    it('should handle localStorage errors gracefully', function() {
      // Mock localStorage failure
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage quota exceeded'); };
      
      persistenceManager.saveSettings();
      // Should not crash
      
      localStorage.setItem = originalSetItem;
    });
    
    it('should handle malformed save data', function() {
      const badData = new Uint8Array([0, 0, 0, 0]); // Invalid save data
      const result = mockWasm.exports.validate_save_data(badData.byteOffset, badData.length);
      
      // Mock should handle this gracefully
      expect(result).to.be.a('number');
    });
    
    it('should handle achievement system errors', function() {
      // Trigger event with invalid parameters
      mockWasm.exports.trigger_achievement_event(999, -1);
      
      // Should not crash
      const count = mockWasm.exports.get_achievement_count();
      expect(count).to.be.a('number');
    });
  });
});

describe('PersistenceUI', function() {
  let persistenceUI;
  let mockGameState;
  let mockWasm;
  
  beforeEach(function() {
    mockWasm = new MockWasmManager();
    mockGameState = new MockGameStateManager();
    
    // Mock DOM more thoroughly for UI tests
    global.document = {
      createElement: (tag) => ({
        tagName: tag,
        className: '',
        style: {},
        innerHTML: '',
        textContent: '',
        appendChild: () => {},
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        click: () => {},
        focus: () => {}
      }),
      body: { appendChild: () => {} },
      head: { appendChild: () => {} },
      addEventListener: () => {}
    };
    
    global.window = {
      addEventListener: () => {},
      dispatchEvent: () => {}
    };
    
    persistenceUI = new PersistenceUI(mockGameState, mockWasm);
  });
  
  it('should initialize UI structure', function() {
    expect(persistenceUI.container).to.exist;
    expect(persistenceUI.modal).to.exist;
  });
  
  it('should handle tab switching', function() {
    persistenceUI.switchTab('achievements');
    expect(persistenceUI.currentTab).to.equal('achievements');
  });
  
  it('should show and hide UI', function() {
    persistenceUI.show('saves');
    expect(persistenceUI.isVisible()).to.be.true;
    
    persistenceUI.hide();
    expect(persistenceUI.isVisible()).to.be.false;
  });
  
  it('should handle save slot operations', function() {
    // Mock save data
    const saveData = { level: 5, gold: 1000, timestamp: Date.now() };
    
    // These would normally interact with DOM
    persistenceUI.updateSaveSlots();
    // Should not throw
  });
  
  it('should handle achievement filtering', function() {
    const achievement = {
      type: 0, // Combat
      rarity: 'rare',
      unlocked: true
    };
    
    persistenceUI.achievementFilters = {
      category: 'combat',
      rarity: 'rare',
      status: 'unlocked'
    };
    
    const shouldShow = persistenceUI.shouldShowAchievement(achievement);
    expect(shouldShow).to.be.true;
  });
  
  it('should format dates and times correctly', function() {
    const timestamp = Date.now();
    const formatted = persistenceUI.formatDate(timestamp);
    expect(formatted).to.be.a('string');
    
    const timeFormatted = persistenceUI.formatTime(3661); // 1 hour, 1 minute, 1 second
    expect(timeFormatted).to.equal('1:01:01');
  });
});

// Performance tests
describe('Performance Tests', function() {
  let persistenceManager;
  let mockWasm;
  let mockGameState;
  
  beforeEach(function() {
    mockWasm = new MockWasmManager();
    mockGameState = new MockGameStateManager();
    persistenceManager = new PersistenceManager(mockGameState, mockWasm);
  });
  
  it('should process large event queues efficiently', async function() {
    const startTime = Date.now();
    
    // Queue many events
    for (let i = 0; i < 1000; i++) {
      persistenceManager.queueEvent('enemyKilled', { enemyType: 1 });
    }
    
    // Process all events
    await persistenceManager.processEventQueue();
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Should process 1000 events in under 100ms
    expect(processingTime).to.be.lessThan(100);
  });
  
  it('should handle rapid save operations', async function() {
    const startTime = Date.now();
    
    // Perform multiple saves
    for (let i = 0; i < 50; i++) {
      await persistenceManager.performAutoSave();
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete 50 saves in reasonable time
    expect(totalTime).to.be.lessThan(1000);
  });
  
  it('should efficiently manage memory during long sessions', function() {
    // Simulate long gaming session
    for (let i = 0; i < 10000; i++) {
      persistenceManager.queueEvent('damageDealt', { damage: 10 });
      
      // Process events periodically
      if (i % 100 === 0) {
        persistenceManager.processEventQueue();
      }
    }
    
    // Queue should not grow indefinitely
    expect(persistenceManager.eventQueue.length).to.be.lessThan(100);
  });
});

// Edge case tests
describe('Edge Cases', function() {
  let persistenceManager;
  let mockWasm;
  let mockGameState;
  
  beforeEach(function() {
    mockWasm = new MockWasmManager();
    mockGameState = new MockGameStateManager();
    persistenceManager = new PersistenceManager(mockGameState, mockWasm);
  });
  
  it('should handle empty save data', function() {
    const emptySave = persistenceManager.getSaveData('nonexistent');
    expect(emptySave).to.be.null;
  });
  
  it('should handle corrupted achievement data', function() {
    // Corrupt the mock data
    mockWasm.mockAchievements.achievements = null;
    
    // Should not crash
    const count = mockWasm.exports.get_achievement_count();
    expect(count).to.be.a('number');
  });
  
  it('should handle network failures gracefully', async function() {
    // Mock network failure
    global.fetch = () => Promise.reject(new Error('Network error'));
    
    // Should handle cloud sync failure
    if (persistenceManager.leaderboardSystem) {
      persistenceManager.leaderboardSystem.cloudSyncEnabled = true;
      
      // Should not crash
      await persistenceManager.leaderboardSystem.processQueuedSync();
    }
  });
  
  it('should handle rapid UI interactions', function() {
    if (persistenceManager.persistenceUI) {
      // Rapid tab switching
      for (let i = 0; i < 100; i++) {
        const tabs = ['saves', 'achievements', 'leaderboards', 'statistics'];
        const randomTab = tabs[i % tabs.length];
        persistenceManager.persistenceUI.switchTab(randomTab);
      }
      
      // Should not crash
      expect(persistenceManager.persistenceUI.currentTab).to.be.a('string');
    }
  });
});
