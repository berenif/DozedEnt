/**
 * Statistics Integration
 * 
 * Integrates the WASM statistics system with the JavaScript frontend
 * Provides comprehensive player performance tracking and analytics
 */

export class StatisticsIntegration {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        
        // Statistics categories
        this.categories = {
            COMBAT: 0,
            SURVIVAL: 1,
            ECONOMY: 2,
            EXPLORATION: 3,
            PROGRESSION: 4,
            PERFORMANCE: 5,
            SOCIAL: 6,
            META: 7
        };
        
        // Statistics types
        this.types = {
            COUNTER: 0,
            ACCUMULATOR: 1,
            MAXIMUM: 2,
            MINIMUM: 3,
            AVERAGE: 4,
            RATE: 5,
            PERCENTAGE: 6,
            DISTRIBUTION: 7
        };
        
        // Time periods
        this.periods = {
            SESSION: 0,
            DAILY: 1,
            WEEKLY: 2,
            MONTHLY: 3,
            ALL_TIME: 4
        };
        
        // Statistics cache
        this.statisticsCache = new Map();
        this.lastUpdate = 0;
        this.updateInterval = 5000; // Update every 5 seconds
        
        // Performance metrics
        this.performanceMetrics = {
            accuracy: 0,
            efficiency: 0,
            consistency: 0,
            adaptability: 0,
            mastery: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize statistics integration
     */
    init() {
        this.setupEventListeners();
        this.startPeriodicUpdate();
        this.loadStatisticsFromWASM();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game events
        window.addEventListener('gameStarted', () => {
            this.startNewSession();
        });
        
        window.addEventListener('gameCompleted', (event) => {
            this.endCurrentSession(event.detail);
        });
        
        window.addEventListener('phaseTransition', (event) => {
            this.handlePhaseTransition(event.detail);
        });
        
        window.addEventListener('achievementUnlocked', (event) => {
            this.handleAchievementUnlocked(event.detail);
        });
    }
    
    /**
     * Start periodic update
     */
    startPeriodicUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateStatisticsFromWASM();
        }, this.updateInterval);
    }
    
    /**
     * Load statistics from WASM
     */
    loadStatisticsFromWASM() {
        try {
            const count = this.wasm.get_statistic_count();
            
            for (let i = 0; i < count; i++) {
                const statInfo = this.wasm.get_statistic_info(i);
                const stat = JSON.parse(statInfo);
                
                this.statisticsCache.set(stat.id, stat);
            }
            
            this.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('Error loading statistics from WASM:', error);
        }
    }
    
    /**
     * Update statistics from WASM
     */
    updateStatisticsFromWASM() {
        try {
            // Get current session stats
            const sessionStatsJson = this.wasm.get_session_stats();
            const sessionStats = JSON.parse(sessionStatsJson);
            
            // Update performance metrics
            this.performanceMetrics = {
                accuracy: sessionStats.accuracy || 0,
                efficiency: sessionStats.efficiency || 0,
                consistency: this.calculateConsistency(),
                adaptability: this.calculateAdaptability(),
                mastery: this.calculateMastery()
            };
            
            // Dispatch update event
            window.dispatchEvent(new CustomEvent('statisticsUpdated', {
                detail: {
                    sessionStats,
                    performanceMetrics: this.performanceMetrics,
                    timestamp: Date.now()
                }
            }));
            
            this.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('Error updating statistics from WASM:', error);
        }
    }
    
    /**
     * Start new statistics session
     */
    startNewSession() {
        try {
            this.wasm.start_stats_session();
            
            // Dispatch session start event
            window.dispatchEvent(new CustomEvent('statisticsSessionStarted', {
                detail: {
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error starting statistics session:', error);
        }
    }
    
    /**
     * End current statistics session
     */
    endCurrentSession(gameResult) {
        try {
            this.wasm.end_stats_session();
            
            // Get final session stats
            const finalStats = this.getSessionStatistics();
            
            // Dispatch session end event
            window.dispatchEvent(new CustomEvent('statisticsSessionEnded', {
                detail: {
                    gameResult,
                    finalStats,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error ending statistics session:', error);
        }
    }
    
    /**
     * Handle phase transition
     */
    handlePhaseTransition(phaseData) {
        try {
            // Update phase-specific statistics
            const currentStats = this.getSessionStatistics();
            
            // Dispatch phase transition event
            window.dispatchEvent(new CustomEvent('statisticsPhaseTransition', {
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
     * Handle achievement unlocked
     */
    handleAchievementUnlocked(achievementData) {
        try {
            // Update achievement statistics
            const achievementCount = this.getStatisticValue(26); // Achievements Earned
            
            // Dispatch achievement event
            window.dispatchEvent(new CustomEvent('statisticsAchievementUnlocked', {
                detail: {
                    achievementData,
                    achievementCount,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error handling achievement unlock:', error);
        }
    }
    
    /**
     * Get statistic value by ID
     */
    getStatisticValue(id, period = this.periods.ALL_TIME) {
        try {
            return this.wasm.get_statistic_value(id, period);
        } catch (error) {
            console.error('Error getting statistic value:', error);
            return 0;
        }
    }
    
    /**
     * Get statistic information by ID
     */
    getStatisticInfo(id) {
        return this.statisticsCache.get(id) || null;
    }
    
    /**
     * Get all statistics
     */
    getAllStatistics() {
        const stats = {};
        
        for (const [id, stat] of this.statisticsCache) {
            stats[id] = {
                ...stat,
                sessionValue: this.getStatisticValue(id, this.periods.SESSION),
                allTimeValue: this.getStatisticValue(id, this.periods.ALL_TIME)
            };
        }
        
        return stats;
    }
    
    /**
     * Get statistics by category
     */
    getStatisticsByCategory(category) {
        const stats = {};
        
        for (const [id, stat] of this.statisticsCache) {
            if (stat.category === category) {
                stats[id] = {
                    ...stat,
                    sessionValue: this.getStatisticValue(id, this.periods.SESSION),
                    allTimeValue: this.getStatisticValue(id, this.periods.ALL_TIME)
                };
            }
        }
        
        return stats;
    }
    
    /**
     * Get session statistics
     */
    getSessionStatistics() {
        try {
            const sessionStatsJson = this.wasm.get_session_stats();
            return JSON.parse(sessionStatsJson);
        } catch (error) {
            console.error('Error getting session statistics:', error);
            return null;
        }
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Get combat statistics
     */
    getCombatStatistics() {
        return {
            enemiesKilled: this.getStatisticValue(1),
            perfectBlocks: this.getStatisticValue(2),
            attacksLanded: this.getStatisticValue(3),
            attacksMissed: this.getStatisticValue(4),
            damageDealt: this.getStatisticValue(5),
            damageTaken: this.getStatisticValue(6),
            rollsExecuted: this.getStatisticValue(7),
            successfulParries: this.getStatisticValue(8),
            combatAccuracy: this.getStatisticValue(27),
            blockSuccessRate: this.getStatisticValue(28),
            killsPerMinute: this.getStatisticValue(30)
        };
    }
    
    /**
     * Get survival statistics
     */
    getSurvivalStatistics() {
        return {
            longestSurvivalTime: this.getStatisticValue(9),
            totalDeaths: this.getStatisticValue(10),
            gamesCompleted: this.getStatisticValue(11),
            noHitRuns: this.getStatisticValue(12),
            longestWinStreak: this.getStatisticValue(13)
        };
    }
    
    /**
     * Get economy statistics
     */
    getEconomyStatistics() {
        return {
            totalGoldEarned: this.getStatisticValue(14),
            totalGoldSpent: this.getStatisticValue(15),
            totalEssenceEarned: this.getStatisticValue(16),
            itemsPurchased: this.getStatisticValue(17),
            rareItemsFound: this.getStatisticValue(18)
        };
    }
    
    /**
     * Get exploration statistics
     */
    getExplorationStatistics() {
        return {
            totalRoomsCleared: this.getStatisticValue(19),
            secretAreasFound: this.getStatisticValue(20),
            treasureChestsOpened: this.getStatisticValue(21),
            deepestFloorReached: this.getStatisticValue(22)
        };
    }
    
    /**
     * Get progression statistics
     */
    getProgressionStatistics() {
        return {
            highestLevelReached: this.getStatisticValue(23),
            totalExperienceGained: this.getStatisticValue(24),
            skillsUnlocked: this.getStatisticValue(25),
            achievementsEarned: this.getStatisticValue(26)
        };
    }
    
    /**
     * Get meta statistics
     */
    getMetaStatistics() {
        return {
            totalPlayTime: this.getStatisticValue(31),
            gamesPlayed: this.getStatisticValue(32)
        };
    }
    
    /**
     * Calculate consistency metric
     */
    calculateConsistency() {
        // This would analyze recent performance variance
        // For now, return a placeholder
        return 0.75;
    }
    
    /**
     * Calculate adaptability metric
     */
    calculateAdaptability() {
        // This would analyze performance across different game phases
        // For now, return a placeholder
        return 0.65;
    }
    
    /**
     * Calculate mastery metric
     */
    calculateMastery() {
        // This would analyze advanced techniques and achievements
        // For now, return a placeholder
        return 0.55;
    }
    
    /**
     * Get statistics summary
     */
    getStatisticsSummary() {
        return {
            combat: this.getCombatStatistics(),
            survival: this.getSurvivalStatistics(),
            economy: this.getEconomyStatistics(),
            exploration: this.getExplorationStatistics(),
            progression: this.getProgressionStatistics(),
            meta: this.getMetaStatistics(),
            performance: this.getPerformanceMetrics(),
            session: this.getSessionStatistics(),
            lastUpdate: this.lastUpdate
        };
    }
    
    /**
     * Export statistics data
     */
    exportStatistics() {
        return {
            allStatistics: this.getAllStatistics(),
            summary: this.getStatisticsSummary(),
            cache: Object.fromEntries(this.statisticsCache),
            performanceMetrics: this.performanceMetrics,
            lastUpdate: this.lastUpdate
        };
    }
    
    /**
     * Reset all statistics
     */
    resetAllStatistics() {
        try {
            this.wasm.reset_all_statistics();
            this.statisticsCache.clear();
            this.performanceMetrics = {
                accuracy: 0,
                efficiency: 0,
                consistency: 0,
                adaptability: 0,
                mastery: 0
            };
            
            // Dispatch reset event
            window.dispatchEvent(new CustomEvent('statisticsReset', {
                detail: {
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('Error resetting statistics:', error);
        }
    }
    
    /**
     * Get integration status
     */
    getIntegrationStatus() {
        return {
            isInitialized: true,
            lastUpdate: this.lastUpdate,
            cacheSize: this.statisticsCache.size,
            performanceMetrics: this.performanceMetrics,
            wasmExportsAvailable: this.checkWASMExports()
        };
    }
    
    /**
     * Check WASM exports availability
     */
    checkWASMExports() {
        const requiredExports = [
            'get_statistic_value',
            'get_statistic_count',
            'get_statistic_info',
            'get_session_stats',
            'start_stats_session',
            'end_stats_session',
            'reset_all_statistics'
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
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.statisticsCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsIntegration;
} else if (typeof window !== 'undefined') {
    window.StatisticsIntegration = StatisticsIntegration;
}