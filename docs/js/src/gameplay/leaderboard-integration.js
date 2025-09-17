/**
 * Leaderboard Integration
 * 
 * Integrates the WASM leaderboard system with the JavaScript leaderboard system
 * Provides seamless data flow between WASM game logic and leaderboard tracking
 */

export class LeaderboardIntegration {
    constructor(wasmModule, leaderboardSystem) {
        this.wasm = wasmModule;
        this.leaderboardSystem = leaderboardSystem;
        
        // Integration state
        this.isInitialized = false;
        this.lastStatsUpdate = 0;
        this.statsUpdateInterval = 1000; // Update every second
        
        // Performance tracking
        this.performanceMetrics = {
            accuracy: 0,
            efficiency: 0,
            consistency: 0,
            adaptability: 0,
            mastery: 0
        };
        
        // Session tracking
        this.sessionStartTime = Date.now();
        this.runsCompleted = 0;
        this.totalScore = 0;
        this.bestRun = null;
        
        this.init();
    }
    
    /**
     * Initialize leaderboard integration
     */
    init() {
        this.setupWASMIntegration();
        this.setupEventListeners();
        this.startStatsMonitoring();
        this.isInitialized = true;
    }
    
    /**
     * Setup WASM integration
     */
    setupWASMIntegration() {
        // Verify WASM module has required exports
        const requiredExports = [
            'get_current_game_stats',
            'get_performance_metrics',
            'get_current_tier_info',
            'get_leaderboard_categories',
            'get_session_stats',
            'reset_leaderboard_stats'
        ];
        
        const missingExports = requiredExports.filter(exportName => 
            !this.wasm[exportName]
        );
        
        if (missingExports.length > 0) {
            console.warn('Missing WASM exports for leaderboard integration:', missingExports);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game completion
        window.addEventListener('gameCompleted', (event) => {
            this.handleGameCompletion(event.detail);
        });
        
        // Listen for game start
        window.addEventListener('gameStarted', (event) => {
            this.handleGameStart(event.detail);
        });
        
        // Listen for phase transitions
        window.addEventListener('phaseTransition', (event) => {
            this.handlePhaseTransition(event.detail);
        });
        
        // Listen for achievement unlocks
        window.addEventListener('achievementUnlocked', (event) => {
            this.handleAchievementUnlock(event.detail);
        });
        
        // Listen for personal records
        window.addEventListener('personalRecord', (event) => {
            this.handlePersonalRecord(event.detail);
        });
    }
    
    /**
     * Start statistics monitoring
     */
    startStatsMonitoring() {
        this.statsInterval = setInterval(() => {
            this.updateStatsFromWASM();
        }, this.statsUpdateInterval);
    }
    
    /**
     * Update statistics from WASM
     */
    updateStatsFromWASM() {
        try {
            // Get current game stats from WASM
            const gameStatsJson = this.wasm.get_current_game_stats();
            const gameStats = JSON.parse(gameStatsJson);
            
            // Get performance metrics from WASM
            const performanceJson = this.wasm.get_performance_metrics();
            const performance = JSON.parse(performanceJson);
            
            // Get tier information from WASM
            const tierJson = this.wasm.get_current_tier_info();
            const tierInfo = JSON.parse(tierJson);
            
            // Update performance metrics
            this.performanceMetrics = {
                accuracy: performance.accuracy || 0,
                efficiency: performance.efficiency || 0,
                consistency: performance.consistency || 0,
                adaptability: performance.adaptability || 0,
                mastery: performance.mastery || 0
            };
            
            // Dispatch stats update event
            window.dispatchEvent(new CustomEvent('leaderboardStatsUpdate', {
                detail: {
                    gameStats,
                    performance: this.performanceMetrics,
                    tierInfo,
                    timestamp: Date.now()
                }
            }));
            
            this.lastStatsUpdate = Date.now();
            
        } catch (error) {
            console.error('Error updating stats from WASM:', error);
        }
    }
    
    /**
     * Handle game completion
     */
    handleGameCompletion(gameResult) {
        try {
            // Get final stats from WASM
            const finalStatsJson = this.wasm.get_current_game_stats();
            const finalStats = JSON.parse(finalStatsJson);
            
            // Get performance metrics
            const performanceJson = this.wasm.get_performance_metrics();
            const performance = JSON.parse(performanceJson);
            
            // Get tier information
            const tierJson = this.wasm.get_current_tier_info();
            const tierInfo = JSON.parse(tierJson);
            
            // Create comprehensive game result
            const comprehensiveResult = {
                ...gameResult,
                ...finalStats,
                performance: this.performanceMetrics,
                tierInfo: tierInfo,
                sessionStats: this.getSessionStats(),
                timestamp: Date.now()
            };
            
            // Submit to leaderboard system
            this.leaderboardSystem.recordGameResult(comprehensiveResult);
            
            // Update session stats
            this.runsCompleted++;
            this.totalScore += finalStats.score || 0;
            
            if (!this.bestRun || finalStats.score > this.bestRun.score) {
                this.bestRun = {
                    score: finalStats.score,
                    time: finalStats.survivalTime,
                    timestamp: Date.now()
                };
            }
            
            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('leaderboardGameCompleted', {
                detail: comprehensiveResult
            }));
            
        } catch (error) {
            console.error('Error handling game completion:', error);
        }
    }
    
    /**
     * Handle game start
     */
    handleGameStart(gameData) {
        try {
            // Reset WASM leaderboard stats
            this.wasm.reset_leaderboard_stats();
            
            // Update session start time
            this.sessionStartTime = Date.now();
            
            // Dispatch start event
            window.dispatchEvent(new CustomEvent('leaderboardGameStarted', {
                detail: {
                    sessionStartTime: this.sessionStartTime,
                    gameData
                }
            }));
            
        } catch (error) {
            console.error('Error handling game start:', error);
        }
    }
    
    /**
     * Handle phase transition
     */
    handlePhaseTransition(phaseData) {
        try {
            // Get current stats for phase-specific tracking
            const currentStatsJson = this.wasm.get_current_game_stats();
            const currentStats = JSON.parse(currentStatsJson);
            
            // Dispatch phase transition event
            window.dispatchEvent(new CustomEvent('leaderboardPhaseTransition', {
                detail: {
                    phaseData,
                    currentStats,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error handling phase transition:', error);
        }
    }
    
    /**
     * Handle achievement unlock
     */
    handleAchievementUnlock(achievementData) {
        try {
            // Update achievement count in leaderboard system
            const achievementCount = this.getUnlockedAchievementCount();
            
            // Dispatch achievement event
            window.dispatchEvent(new CustomEvent('leaderboardAchievementUnlocked', {
                detail: {
                    achievementData,
                    totalAchievements: achievementCount,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error handling achievement unlock:', error);
        }
    }
    
    /**
     * Handle personal record
     */
    handlePersonalRecord(recordData) {
        try {
            // Get current stats to verify record
            const currentStatsJson = this.wasm.get_current_game_stats();
            const currentStats = JSON.parse(currentStatsJson);
            
            // Dispatch personal record event
            window.dispatchEvent(new CustomEvent('leaderboardPersonalRecord', {
                detail: {
                    recordData,
                    currentStats,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error handling personal record:', error);
        }
    }
    
    /**
     * Get current game statistics
     */
    getCurrentGameStats() {
        try {
            const statsJson = this.wasm.get_current_game_stats();
            return JSON.parse(statsJson);
        } catch (error) {
            console.error('Error getting current game stats:', error);
            return null;
        }
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        try {
            const metricsJson = this.wasm.get_performance_metrics();
            return JSON.parse(metricsJson);
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            return this.performanceMetrics;
        }
    }
    
    /**
     * Get current tier information
     */
    getCurrentTierInfo() {
        try {
            const tierJson = this.wasm.get_current_tier_info();
            return JSON.parse(tierJson);
        } catch (error) {
            console.error('Error getting tier info:', error);
            return null;
        }
    }
    
    /**
     * Get leaderboard categories
     */
    getLeaderboardCategories() {
        try {
            const categoriesJson = this.wasm.get_leaderboard_categories();
            return JSON.parse(categoriesJson);
        } catch (error) {
            console.error('Error getting leaderboard categories:', error);
            return null;
        }
    }
    
    /**
     * Get session statistics
     */
    getSessionStats() {
        try {
            const sessionJson = this.wasm.get_session_stats();
            const wasmSessionStats = JSON.parse(sessionJson);
            
            // Combine with local session stats
            return {
                ...wasmSessionStats,
                localSessionStartTime: this.sessionStartTime,
                runsCompleted: this.runsCompleted,
                totalScore: this.totalScore,
                bestRun: this.bestRun,
                performanceMetrics: this.performanceMetrics
            };
        } catch (error) {
            console.error('Error getting session stats:', error);
            return {
                sessionStartTime: this.sessionStartTime,
                runsCompleted: this.runsCompleted,
                totalScore: this.totalScore,
                bestRun: this.bestRun,
                performanceMetrics: this.performanceMetrics
            };
        }
    }
    
    /**
     * Get unlocked achievement count
     */
    getUnlockedAchievementCount() {
        // This would integrate with the achievement system
        // For now, return a placeholder
        return 0;
    }
    
    /**
     * Submit current stats to leaderboard
     */
    submitCurrentStats() {
        try {
            const gameStats = this.getCurrentGameStats();
            if (gameStats) {
                this.leaderboardSystem.recordGameResult(gameStats);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error submitting current stats:', error);
            return false;
        }
    }
    
    /**
     * Get leaderboard summary
     */
    getLeaderboardSummary() {
        try {
            const categories = this.getLeaderboardCategories();
            const tierInfo = this.getCurrentTierInfo();
            const performance = this.getPerformanceMetrics();
            const sessionStats = this.getSessionStats();
            
            return {
                categories,
                tierInfo,
                performance,
                sessionStats,
                lastUpdate: this.lastStatsUpdate,
                isInitialized: this.isInitialized
            };
        } catch (error) {
            console.error('Error getting leaderboard summary:', error);
            return null;
        }
    }
    
    /**
     * Reset all statistics
     */
    resetAllStats() {
        try {
            // Reset WASM stats
            this.wasm.reset_leaderboard_stats();
            
            // Reset local stats
            this.sessionStartTime = Date.now();
            this.runsCompleted = 0;
            this.totalScore = 0;
            this.bestRun = null;
            this.performanceMetrics = {
                accuracy: 0,
                efficiency: 0,
                consistency: 0,
                adaptability: 0,
                mastery: 0
            };
            
            // Reset leaderboard system
            this.leaderboardSystem.resetSessionStats();
            
            // Dispatch reset event
            window.dispatchEvent(new CustomEvent('leaderboardStatsReset', {
                detail: {
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error resetting stats:', error);
        }
    }
    
    /**
     * Export leaderboard data
     */
    exportData() {
        try {
            const wasmData = {
                currentStats: this.getCurrentGameStats(),
                performance: this.getPerformanceMetrics(),
                tierInfo: this.getCurrentTierInfo(),
                categories: this.getLeaderboardCategories(),
                sessionStats: this.getSessionStats()
            };
            
            const leaderboardData = this.leaderboardSystem.exportData();
            
            return {
                wasmData,
                leaderboardData,
                integrationStats: {
                    isInitialized: this.isInitialized,
                    lastUpdate: this.lastStatsUpdate,
                    sessionStartTime: this.sessionStartTime
                }
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }
    
    /**
     * Import leaderboard data
     */
    importData(data) {
        try {
            if (data.leaderboardData) {
                this.leaderboardSystem.importData(data.leaderboardData);
            }
            
            if (data.integrationStats) {
                this.sessionStartTime = data.integrationStats.sessionStartTime || Date.now();
                this.isInitialized = data.integrationStats.isInitialized || false;
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
    
    /**
     * Get integration status
     */
    getIntegrationStatus() {
        return {
            isInitialized: this.isInitialized,
            lastUpdate: this.lastStatsUpdate,
            sessionStartTime: this.sessionStartTime,
            runsCompleted: this.runsCompleted,
            totalScore: this.totalScore,
            bestRun: this.bestRun,
            performanceMetrics: this.performanceMetrics,
            wasmExportsAvailable: this.checkWASMExports()
        };
    }
    
    /**
     * Check WASM exports availability
     */
    checkWASMExports() {
        const requiredExports = [
            'get_current_game_stats',
            'get_performance_metrics',
            'get_current_tier_info',
            'get_leaderboard_categories',
            'get_session_stats',
            'reset_leaderboard_stats'
        ];
        
        return requiredExports.reduce((acc, exportName) => {
            acc[exportName] = !!this.wasm[exportName];
            return acc;
        }, {});
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeaderboardIntegration;
} else if (typeof window !== 'undefined') {
    window.LeaderboardIntegration = LeaderboardIntegration;
}