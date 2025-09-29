/**
 * Achievement System JavaScript Integration
 * 
 * Provides JavaScript interface for the WASM achievement system
 * Handles achievement display, notifications, and progress tracking
 */

class AchievementManager {
    constructor(wasmModule) {
        this.wasm = wasmModule;
        this.notificationQueue = [];
        this.isNotificationVisible = false;
        this.achievementCache = new Map();
        this.lastUpdateTime = 0;
        
        // Initialize achievement system
        this.wasm.init_achievement_system();
        
        // Set up notification display
        this.setupNotificationDisplay();
        
        // Start periodic achievement checking
        this.startAchievementChecking();

        // Track timers for cleanup
        this._intervals = new Set();
    }
    
    /**
     * Set up achievement notification display
     */
    setupNotificationDisplay() {
        // Create notification container if it doesn't exist
        let container = document.getElementById('achievement-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievement-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        this.notificationContainer = container;
    }
    
    /**
     * Start periodic achievement checking
     */
    startAchievementChecking() {
        const id = setInterval(() => {
            this.checkForNewAchievements();
        }, 1000); // Check every second
        this._intervals.add(id);
    }
    
    /**
     * Check for newly unlocked achievements
     */
    checkForNewAchievements() {
        try {
            const newlyUnlockedCount = this.wasm.get_newly_unlocked_count();
            
            if (newlyUnlockedCount > 0) {
                for (let i = 0; i < newlyUnlockedCount; i++) {
                    const achievementId = this.wasm.get_newly_unlocked_achievement(i);
                    this.showAchievementNotification(achievementId);
                }
                
                // Clear the newly unlocked list
                this.wasm.clear_newly_unlocked();
            }
        } catch (error) {
            console.error('Error checking for new achievements:', error);
        }
    }
    
    /**
     * Show achievement notification
     * @param {number} achievementId - Achievement ID
     */
    showAchievementNotification(achievementId) {
        try {
            const achievement = this.getAchievementById(achievementId);
            if (!achievement) return;
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            notification.style.cssText = `
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid ${this.getRarityColor(achievement.rarity)};
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 10px;
                color: white;
                font-family: 'Arial', sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                transform: translateX(400px);
                transition: transform 0.3s ease-in-out;
                max-width: 300px;
                pointer-events: auto;
            `;
            
            // Create notification content
            notification.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="
                        width: 24px;
                        height: 24px;
                        background: ${this.getRarityColor(achievement.rarity)};
                        border-radius: 50%;
                        margin-right: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                    ">🏆</div>
                    <div>
                        <div style="font-weight: bold; color: ${this.getRarityColor(achievement.rarity)};">
                            ${achievement.name}
                        </div>
                        <div style="font-size: 12px; color: #ccc;">
                            ${this.getRarityName(achievement.rarity)}
                        </div>
                    </div>
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    ${achievement.description}
                </div>
                ${achievement.goldReward > 0 ? `<div style="margin-top: 8px; font-size: 11px; color: #ffd700;">💰 +${achievement.goldReward} Gold</div>` : ''}
                ${achievement.essenceReward > 0 ? `<div style="font-size: 11px; color: #00bfff;">💎 +${achievement.essenceReward} Essence</div>` : ''}
            `;
            
            // Add to container
            this.notificationContainer.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Auto-remove after delay
            const removeTimeout = setTimeout(() => {
                notification.style.transform = 'translateX(400px)';
                const innerTimeout = setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
                // Track nested timeout IDs for optional future cleanup
                if (!this._timeouts) { this._timeouts = new Set(); }
                this._timeouts.add(innerTimeout);
            }, 5000);
            if (!this._timeouts) { this._timeouts = new Set(); }
            this._timeouts.add(removeTimeout);
            
        } catch (error) {
            console.error('Error showing achievement notification:', error);
        }
    }
    
    /**
     * Get achievement by ID
     * @param {number} id - Achievement ID
     * @returns {Object|null} Achievement object
     */
    getAchievementById(id) {
        try {
            // Check cache first
            if (this.achievementCache.has(id)) {
                return this.achievementCache.get(id);
            }
            
            // Get from WASM
            const achievementPtr = this.wasm.get_achievement_by_id(id);
            if (!achievementPtr) return null;
            
            // Parse achievement data (this would need proper memory reading)
            const achievement = {
                id: id,
                name: this.wasm.get_achievement_name(id),
                description: this.wasm.get_achievement_description(id),
                rarity: this.wasm.get_achievement_rarity(id),
                unlocked: this.wasm.is_achievement_unlocked(id),
                progress: this.wasm.get_achievement_progress(id),
                targetValue: this.wasm.get_achievement_target(id),
                goldReward: this.wasm.get_achievement_gold_reward(id),
                essenceReward: this.wasm.get_achievement_essence_reward(id),
                experienceReward: this.wasm.get_achievement_experience_reward(id)
            };
            
            // Cache the result
            this.achievementCache.set(id, achievement);
            return achievement;
            
        } catch (error) {
            console.error('Error getting achievement by ID:', error);
            return null;
        }
    }
    
    /**
     * Get all achievements
     * @returns {Array} Array of achievement objects
     */
    getAllAchievements() {
        try {
            const achievements = [];
            const count = this.wasm.get_achievement_count();
            
            for (let i = 0; i < count; i++) {
                const achievement = this.getAchievementById(i + 1);
                if (achievement) {
                    achievements.push(achievement);
                }
            }
            
            return achievements;
        } catch (error) {
            console.error('Error getting all achievements:', error);
            return [];
        }
    }
    
    /**
     * Get achievements by category
     * @param {number} category - Category filter (0=Combat, 1=Survival, 2=Exploration, 3=Economy)
     * @returns {Array} Array of achievement objects
     */
    getAchievementsByCategory(category = 0) {
        try {
            const achievements = this.getAllAchievements();
            return achievements.filter(achievement => {
                switch (category) {
                    case 0: // Combat
                        return achievement.type === 0 || achievement.type === 1 || achievement.type === 2;
                    case 1: // Survival
                        return achievement.type === 6 || achievement.type === 7;
                    case 2: // Exploration
                        return achievement.type === 3 || achievement.type === 9;
                    case 3: // Economy
                        return achievement.type === 4;
                    default:
                        return true;
                }
            });
        } catch (error) {
            console.error('Error getting achievements by category:', error);
            return [];
        }
    }
    
    /**
     * Get achievement statistics
     * @returns {Object} Achievement statistics
     */
    getAchievementStatistics() {
        try {
            const statsJson = this.wasm.get_achievement_summary_json();
            return JSON.parse(statsJson);
        } catch (error) {
            console.error('Error getting achievement statistics:', error);
            return null;
        }
    }
    
    /**
     * Get rarity color
     * @param {number} rarity - Rarity level
     * @returns {string} Color hex code
     */
    getRarityColor(rarity) {
        const colors = {
            0: '#9d9d9d', // Common - Gray
            1: '#1eff00', // Uncommon - Green
            2: '#0070dd', // Rare - Blue
            3: '#a335ee', // Epic - Purple
            4: '#ff8000'  // Legendary - Orange
        };
        return colors[rarity] || colors[0];
    }
    
    /**
     * Get rarity name
     * @param {number} rarity - Rarity level
     * @returns {string} Rarity name
     */
    getRarityName(rarity) {
        const names = {
            0: 'Common',
            1: 'Uncommon',
            2: 'Rare',
            3: 'Epic',
            4: 'Legendary'
        };
        return names[rarity] || names[0];
    }
    
    /**
     * Update achievement progress manually (for testing)
     * @param {number} type - Achievement type
     * @param {number} amount - Progress amount
     */
    updateProgress(type, amount) {
        try {
            this.wasm.update_achievement_progress(type, amount);
        } catch (error) {
            console.error('Error updating achievement progress:', error);
        }
    }
    
    /**
     * Unlock achievement manually (for testing)
     * @param {number} achievementId - Achievement ID
     */
    unlockAchievement(achievementId) {
        try {
            this.wasm.unlock_achievement(achievementId);
        } catch (error) {
            console.error('Error unlocking achievement:', error);
        }
    }
    
    /**
     * Reset all achievements (for testing)
     */
    resetAchievements() {
        try {
            this.wasm.reset_all_achievements();
            this.achievementCache.clear();
        } catch (error) {
            console.error('Error resetting achievements:', error);
        }
    }
    
    /**
     * Export achievements as JSON
     * @returns {string} JSON string of achievements
     */
    exportAchievements() {
        try {
            const achievements = this.getAllAchievements();
            const stats = this.getAchievementStatistics();
            
            return JSON.stringify({
                achievements: achievements,
                statistics: stats,
                exportTime: new Date().toISOString()
            }, null, 2);
        } catch (error) {
            console.error('Error exporting achievements:', error);
            return null;
        }
    }
    
    /**
     * Create achievement UI panel
     * @param {HTMLElement} container - Container element
     */
    createAchievementUI(container) {
        const ui = document.createElement('div');
        ui.className = 'achievement-ui';
        ui.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            color: white;
            font-family: Arial, sans-serif;
            max-height: 600px;
            overflow-y: auto;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Achievements';
        title.style.margin = '0';
        
        const stats = this.getAchievementStatistics();
        const statsText = stats ? `${stats.unlockedAchievements}/${stats.totalAchievements} (${stats.completionPercentage.toFixed(1)}%)` : 'Loading...';
        
        const statsDiv = document.createElement('div');
        statsDiv.textContent = statsText;
        statsDiv.style.fontSize = '14px';
        statsDiv.style.color = '#ccc';
        
        header.appendChild(title);
        header.appendChild(statsDiv);
        ui.appendChild(header);
        
        // Category tabs
        const categories = ['All', 'Combat', 'Survival', 'Exploration', 'Economy'];
        const categoryTabs = document.createElement('div');
        categoryTabs.style.cssText = `
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #333;
        `;
        
        categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.textContent = category;
            tab.style.cssText = `
                background: transparent;
                border: none;
                color: #ccc;
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            `;
            
            if (index === 0) {
                tab.style.color = 'white';
                tab.style.borderBottomColor = '#0070dd';
            }
            
            tab.addEventListener('click', () => {
                // Update active tab
                categoryTabs.querySelectorAll('button').forEach(t => {
                    t.style.color = '#ccc';
                    t.style.borderBottomColor = 'transparent';
                });
                tab.style.color = 'white';
                tab.style.borderBottomColor = '#0070dd';
                
                // Update achievements list
                this.updateAchievementList(achievementsList, index - 1);
            });
            
            categoryTabs.appendChild(tab);
        });
        
        ui.appendChild(categoryTabs);
        
        // Achievements list
        const achievementsList = document.createElement('div');
        achievementsList.className = 'achievements-list';
        
        ui.appendChild(achievementsList);
        
        // Initial load
        this.updateAchievementList(achievementsList, -1);
        
        container.appendChild(ui);
    }
    
    /**
     * Update achievement list display
     * @param {HTMLElement} container - Container element
     * @param {number} category - Category filter (-1 for all)
     */
    updateAchievementList(container, category = -1) {
        container.innerHTML = '';
        
        const achievements = category === -1 ? this.getAllAchievements() : this.getAchievementsByCategory(category);
        
        achievements.forEach(achievement => {
            const achievementDiv = document.createElement('div');
            achievementDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px;
                margin-bottom: 8px;
                background: ${achievement.unlocked ? 'rgba(0, 112, 221, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
                border: 1px solid ${achievement.unlocked ? '#0070dd' : '#333'};
                border-radius: 6px;
                opacity: ${achievement.unlocked ? '1' : '0.6'};
            `;
            
            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 40px;
                height: 40px;
                background: ${achievement.unlocked ? this.getRarityColor(achievement.rarity) : '#333'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                font-size: 20px;
            `;
            icon.textContent = achievement.unlocked ? '🏆' : '🔒';
            
            const content = document.createElement('div');
            content.style.flex = '1';
            
            const name = document.createElement('div');
            name.textContent = achievement.name;
            name.style.cssText = `
                font-weight: bold;
                color: ${achievement.unlocked ? this.getRarityColor(achievement.rarity) : '#666'};
                margin-bottom: 4px;
            `;
            
            const description = document.createElement('div');
            description.textContent = achievement.description;
            description.style.cssText = `
                font-size: 12px;
                color: #aaa;
                margin-bottom: 4px;
            `;
            
            const progress = document.createElement('div');
            if (achievement.targetValue > 1) {
                const percentage = Math.min((achievement.progress / achievement.targetValue) * 100, 100);
                progress.innerHTML = `
                    <div style="background: #333; height: 4px; border-radius: 2px; margin-top: 4px;">
                        <div style="background: ${this.getRarityColor(achievement.rarity)}; height: 100%; width: ${percentage}%; border-radius: 2px; transition: width 0.3s;"></div>
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">
                        ${achievement.progress}/${achievement.targetValue} (${percentage.toFixed(1)}%)
                    </div>
                `;
            }
            
            content.appendChild(name);
            content.appendChild(description);
            content.appendChild(progress);
            
            achievementDiv.appendChild(icon);
            achievementDiv.appendChild(content);
            container.appendChild(achievementDiv);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementManager;
} else if (typeof window !== 'undefined') {
    window.AchievementManager = AchievementManager;
}

/**
 * Lifecycle: provide explicit cleanup to prevent leaks when UI is torn down
 */
AchievementManager.prototype.destroy = function destroy() {
    try {
        if (this._intervals) {
            for (const id of this._intervals) { clearInterval(id); }
            this._intervals.clear();
        }
        if (this._timeouts) {
            for (const id of this._timeouts) { clearTimeout(id); }
            this._timeouts.clear();
        }
        this.notificationContainer = null;
    } catch (e) {
        // Best-effort cleanup
        console.warn('AchievementManager destroy encountered an issue:', e);
    }
};