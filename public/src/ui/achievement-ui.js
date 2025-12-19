/**
 * Achievement UI - Visual components for achievement system
 * Handles achievement notifications, viewer, and progress tracking
 */

export class AchievementUI {
  constructor(achievementManager) {
    this.achievementManager = achievementManager;
    
    // Notification queue
    this.notificationQueue = [];
    this.isShowingNotification = false;
    
    // UI state
    this.isViewerOpen = false;
    this.selectedCategory = 'all';
    this.sortBy = 'progress'; // 'progress', 'name', 'rarity'
    
    this.initialize();
  }
  
  /**
   * Initialize achievement UI
   */
  initialize() {
    this.createNotificationSystem();
    this.createAchievementViewer();
    this.createProgressTracker();
    this.setupEventListeners();
    this.injectStyles();
  }
  
  /**
   * Create notification system for achievement unlocks
   */
  createNotificationSystem() {
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'achievement-notifications';
    notificationContainer.className = 'achievement-notifications';
    document.body.appendChild(notificationContainer);
  }
  
  /**
   * Create achievement viewer modal
   */
  createAchievementViewer() {
    const viewer = document.createElement('div');
    viewer.id = 'achievement-viewer';
    viewer.className = 'achievement-viewer hidden';
    viewer.innerHTML = `
      <div class="achievement-viewer-content">
        <div class="achievement-viewer-header">
          <h2>Achievements</h2>
          <div class="achievement-stats">
            <div class="stat-item">
              <span class="stat-value" id="achievement-score">0</span>
              <span class="stat-label">Score</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="achievement-completion">0%</span>
              <span class="stat-label">Complete</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="achievement-unlocked">0/0</span>
              <span class="stat-label">Unlocked</span>
            </div>
          </div>
          <button class="close-button" id="close-achievement-viewer">×</button>
        </div>
        
        <div class="achievement-filters">
          <div class="category-tabs">
            <button class="category-tab active" data-category="all">All</button>
            <button class="category-tab" data-category="Combat">Combat</button>
            <button class="category-tab" data-category="Exploration">Exploration</button>
            <button class="category-tab" data-category="Collection">Collection</button>
            <button class="category-tab" data-category="Mastery">Mastery</button>
            <button class="category-tab" data-category="Special">Special</button>
          </div>
          
          <div class="sort-options">
            <label>Sort by:</label>
            <select id="achievement-sort">
              <option value="progress">Progress</option>
              <option value="name">Name</option>
              <option value="rarity">Rarity</option>
              <option value="locked">Locked First</option>
              <option value="unlocked">Unlocked First</option>
            </select>
          </div>
        </div>
        
        <div class="achievement-list" id="achievement-list">
          <!-- Achievements populated here -->
        </div>
      </div>
    `;
    
    document.body.appendChild(viewer);
  }
  
  /**
   * Create progress tracker widget
   */
  createProgressTracker() {
    const tracker = document.createElement('div');
    tracker.id = 'achievement-tracker';
    tracker.className = 'achievement-tracker';
    tracker.innerHTML = `
      <button class="tracker-button" id="open-achievements" title="Achievements">
        <span class="tracker-icon">🏆</span>
        <span class="tracker-progress" id="tracker-progress">0%</span>
      </button>
      
      <div class="recent-achievements hidden" id="recent-achievements">
        <h3>Recent Achievements</h3>
        <div class="recent-list" id="recent-list">
          <!-- Recent achievements populated here -->
        </div>
      </div>
    `;
    
    document.body.appendChild(tracker);
  }
  
  /**
   * Show achievement popup notification
   * @param {Object} achievement
   */
  showAchievementPopup(achievement) {
    // Queue the notification
    this.notificationQueue.push(achievement);
    
    // Process queue if not already showing
    if (!this.isShowingNotification) {
      this.processNotificationQueue();
    }
  }
  
  /**
   * Process notification queue
   */
  processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      this.isShowingNotification = false;
      return;
    }
    
    this.isShowingNotification = true;
    const achievement = this.notificationQueue.shift();
    
    // Create notification element
    const notification = this.createNotificationElement(achievement);
    const container = document.getElementById('achievement-notifications');
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Play sound effect based on rarity
    this.playUnlockSound(achievement.rarity);
    
    // Add particle effects for epic/legendary
    if (achievement.rarity >= 3) {
      this.createParticleEffect(notification, achievement.rarity);
    }
    
    // Wait and animate out
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      
      setTimeout(() => {
        notification.remove();
        // Process next in queue
        this.processNotificationQueue();
      }, 500);
    }, 4000 + (achievement.rarity * 1000)); // Longer display for rarer achievements
  }
  
  /**
   * Create notification element
   * @param {Object} achievement
   * @returns {HTMLElement}
   */
  createNotificationElement(achievement) {
    const rarity = this.achievementManager.rarities[achievement.rarity];
    
    const notification = document.createElement('div');
    notification.className = `achievement-notification rarity-${achievement.rarity}`;
    notification.innerHTML = `
      <div class="achievement-glow"></div>
      <div class="achievement-content">
        <div class="achievement-header">
          <span class="achievement-label">ACHIEVEMENT UNLOCKED</span>
          <span class="achievement-rarity" style="color: ${rarity.color}">${rarity.name}</span>
        </div>
        <div class="achievement-body">
          <div class="achievement-icon-large">${achievement.icon}</div>
          <div class="achievement-details">
            <h3 class="achievement-name">${achievement.name}</h3>
            <p class="achievement-description">${achievement.description}</p>
            ${this.getRewardsHTML(achievement.rewards)}
          </div>
        </div>
        <div class="achievement-stars">
          ${rarity.icon}
        </div>
      </div>
    `;
    
    return notification;
  }
  
  /**
   * Get rewards HTML
   * @param {Object} rewards
   * @returns {string}
   */
  getRewardsHTML(rewards) {
    if (!rewards || (!rewards.gold && !rewards.essence && !rewards.experience)) {
      return '';
    }
    
    let html = '<div class="achievement-rewards">';
    
    if (rewards.gold > 0) {
      html += `<span class="reward-item">💰 ${rewards.gold} Gold</span>`;
    }
    if (rewards.essence > 0) {
      html += `<span class="reward-item">✨ ${rewards.essence} Essence</span>`;
    }
    if (rewards.experience > 0) {
      html += `<span class="reward-item">⭐ ${rewards.experience} XP</span>`;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Play unlock sound effect
   * @param {number} rarity
   */
  playUnlockSound(rarity) {
    // Dispatch sound event for audio manager
    window.dispatchEvent(new CustomEvent('playSound', {
      detail: {
        sound: `achievement_${rarity}`,
        fallback: 'achievement_unlock',
        volume: 0.5 + (rarity * 0.1)
      }
    }));
  }
  
  /**
   * Create particle effect for rare achievements
   * @param {HTMLElement} element
   * @param {number} rarity
   */
  createParticleEffect(element, rarity) {
    const particleCount = 10 + (rarity * 5);
    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#9370DB', '#00CED1'];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'achievement-particle';
      particle.style.setProperty('--particle-color', colors[rarity]);
      particle.style.setProperty('--particle-delay', `${Math.random() * 0.5}s`);
      particle.style.setProperty('--particle-duration', `${1 + Math.random()}s`);
      particle.style.setProperty('--particle-x', `${(Math.random() - 0.5) * 200}px`);
      particle.style.setProperty('--particle-y', `${(Math.random() - 0.5) * 200}px`);
      
      element.appendChild(particle);
      
      // Remove particle after animation
      setTimeout(() => particle.remove(), 2000);
    }
  }
  
  /**
   * Open achievement viewer
   */
  openViewer() {
    const viewer = document.getElementById('achievement-viewer');
    viewer.classList.remove('hidden');
    this.isViewerOpen = true;
    
    this.updateViewerStats();
    this.populateAchievementList();
  }
  
  /**
   * Close achievement viewer
   */
  closeViewer() {
    const viewer = document.getElementById('achievement-viewer');
    viewer.classList.add('hidden');
    this.isViewerOpen = false;
  }
  
  /**
   * Update viewer statistics
   */
  updateViewerStats() {
    const score = this.achievementManager.getAchievementScore();
    const completion = this.achievementManager.getCompletionPercentage();
    const unlocked = this.achievementManager.getUnlockedAchievements().length;
    const total = this.achievementManager.getAllAchievements().length;
    
    document.getElementById('achievement-score').textContent = score.toLocaleString();
    document.getElementById('achievement-completion').textContent = `${completion.toFixed(1)}%`;
    document.getElementById('achievement-unlocked').textContent = `${unlocked}/${total}`;
  }
  
  /**
   * Populate achievement list in viewer
   */
  populateAchievementList() {
    const list = document.getElementById('achievement-list');
    let achievements = this.achievementManager.getAllAchievements();
    
    // Filter by category
    if (this.selectedCategory !== 'all') {
      achievements = achievements.filter(a => a.category === this.selectedCategory);
    }
    
    // Sort achievements
    achievements = this.sortAchievements(achievements, this.sortBy);
    
    // Build HTML
    list.innerHTML = achievements.map(achievement => 
      this.createAchievementCard(achievement)
    ).join('');
  }
  
  /**
   * Sort achievements
   * @param {Array} achievements
   * @param {string} sortBy
   * @returns {Array}
   */
  sortAchievements(achievements, sortBy) {
    const sorted = [...achievements];
    
    switch (sortBy) {
      case 'progress':
        sorted.sort((a, b) => {
          const progressA = this.achievementManager.getAchievementProgress(a.id);
          const progressB = this.achievementManager.getAchievementProgress(b.id);
          return progressB - progressA;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rarity':
        sorted.sort((a, b) => b.rarity - a.rarity);
        break;
      case 'locked':
        sorted.sort((a, b) => {
          if (a.unlocked === b.unlocked) {return 0;}
          return a.unlocked ? 1 : -1;
        });
        break;
      case 'unlocked':
        sorted.sort((a, b) => {
          if (a.unlocked === b.unlocked) {return 0;}
          return a.unlocked ? -1 : 1;
        });
        break;
    }
    
    return sorted;
  }
  
  /**
   * Create achievement card HTML
   * @param {Object} achievement
   * @returns {string}
   */
  createAchievementCard(achievement) {
    const rarity = this.achievementManager.rarities[achievement.rarity];
    const progress = this.achievementManager.getAchievementProgress(achievement.id);
    const isLocked = !achievement.unlocked;
    const isSecret = achievement.isSecret && isLocked;
    
    return `
      <div class="achievement-card ${isLocked ? 'locked' : 'unlocked'} rarity-${achievement.rarity}">
        <div class="achievement-card-icon">
          ${isSecret ? '❓' : achievement.icon}
        </div>
        <div class="achievement-card-content">
          <div class="achievement-card-header">
            <h4 class="achievement-card-name">
              ${isSecret ? '???' : achievement.name}
            </h4>
            <span class="achievement-card-rarity" style="color: ${rarity.color}">
              ${rarity.icon}
            </span>
          </div>
          <p class="achievement-card-description">
            ${isSecret ? 'Hidden achievement' : achievement.description}
          </p>
          ${!isLocked ? '' : `
            <div class="achievement-progress-bar">
              <div class="achievement-progress-fill" style="width: ${progress}%"></div>
              <span class="achievement-progress-text">
                ${achievement.progress}/${achievement.requirement}
              </span>
            </div>
          `}
          ${achievement.unlocked ? `
            <div class="achievement-unlocked-time">
              Unlocked ${this.formatTime(achievement.unlockedTime)}
            </div>
          ` : ''}
          ${this.getRewardsHTML(achievement.rewards)}
        </div>
      </div>
    `;
  }
  
  /**
   * Update progress tracker
   */
  updateProgressTracker() {
    const completion = this.achievementManager.getCompletionPercentage();
    document.getElementById('tracker-progress').textContent = `${completion.toFixed(0)}%`;
    
    // Update recent achievements
    const recent = this.achievementManager.recentlyUnlocked.slice(-3);
    if (recent.length > 0) {
      const recentList = document.getElementById('recent-list');
      recentList.innerHTML = recent.map(id => {
        const achievement = this.achievementManager.achievements.get(id);
        if (!achievement) {return '';}
        
        return `
          <div class="recent-achievement">
            <span class="recent-icon">${achievement.icon}</span>
            <span class="recent-name">${achievement.name}</span>
          </div>
        `;
      }).join('');
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Viewer controls
    document.getElementById('close-achievement-viewer').addEventListener('click', () => {
      this.closeViewer();
    });
    
    document.getElementById('open-achievements').addEventListener('click', () => {
      this.openViewer();
    });
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => 
          t.classList.remove('active')
        );
        tab.classList.add('active');
        this.selectedCategory = tab.dataset.category;
        this.populateAchievementList();
      });
    });
    
    // Sort dropdown
    document.getElementById('achievement-sort').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.populateAchievementList();
    });
    
    // Show recent on hover
    let hoverTimeout;
    document.getElementById('achievement-tracker').addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      document.getElementById('recent-achievements').classList.remove('hidden');
    });
    
    document.getElementById('achievement-tracker').addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        document.getElementById('recent-achievements').classList.add('hidden');
      }, 500);
    });
    
    // Listen for achievement unlocks
    window.addEventListener('achievementUnlocked', (e) => {
      this.showAchievementPopup(e.detail);
      this.updateProgressTracker();
      
      if (this.isViewerOpen) {
        this.updateViewerStats();
        this.populateAchievementList();
      }
    });
    
    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'a' && e.ctrlKey) {
        e.preventDefault();
        if (this.isViewerOpen) {
          this.closeViewer();
        } else {
          this.openViewer();
        }
      }
    });
  }
  
  /**
   * Format time ago
   * @param {number} timestamp
   * @returns {string}
   */
  formatTime(timestamp) {
    if (!timestamp) {return 'Never';}
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } 
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    
  }
  
  /**
   * Inject CSS styles
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Achievement Notifications */
      .achievement-notifications {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        pointer-events: none;
      }
      
      .achievement-notification {
        position: relative;
        width: 400px;
        margin-bottom: 15px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto;
      }
      
      .achievement-notification.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .achievement-notification.hide {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
      }
      
      .achievement-glow {
        position: absolute;
        inset: -2px;
        background: linear-gradient(45deg, #FFD700, #FFA500, #FF69B4, #9370DB);
        border-radius: 10px;
        opacity: 0.8;
        filter: blur(10px);
        animation: glow 2s ease-in-out infinite;
      }
      
      @keyframes glow {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      
      .achievement-content {
        position: relative;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid rgba(79, 189, 186, 0.5);
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .achievement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(79, 189, 186, 0.3);
      }
      
      .achievement-label {
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 2px;
        color: #4fbdba;
        text-transform: uppercase;
      }
      
      .achievement-rarity {
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .achievement-body {
        display: flex;
        gap: 15px;
        align-items: center;
      }
      
      .achievement-icon-large {
        font-size: 48px;
        min-width: 60px;
        text-align: center;
      }
      
      .achievement-details {
        flex: 1;
      }
      
      .achievement-name {
        margin: 0 0 5px 0;
        font-size: 18px;
        font-weight: bold;
        color: #fff;
      }
      
      .achievement-description {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #ccc;
      }
      
      .achievement-rewards {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .reward-item {
        font-size: 12px;
        padding: 2px 8px;
        background: rgba(79, 189, 186, 0.2);
        border: 1px solid rgba(79, 189, 186, 0.5);
        border-radius: 4px;
        color: #4fbdba;
      }
      
      .achievement-stars {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 14px;
      }
      
      /* Rarity-specific styles */
      .rarity-0 .achievement-glow { background: linear-gradient(45deg, #9CA3AF, #6B7280); }
      .rarity-1 .achievement-glow { background: linear-gradient(45deg, #10B981, #059669); }
      .rarity-2 .achievement-glow { background: linear-gradient(45deg, #3B82F6, #2563EB); }
      .rarity-3 .achievement-glow { background: linear-gradient(45deg, #8B5CF6, #7C3AED); }
      .rarity-4 .achievement-glow { background: linear-gradient(45deg, #F59E0B, #D97706); }
      
      /* Particles */
      .achievement-particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--particle-color);
        border-radius: 50%;
        pointer-events: none;
        animation: particle-float var(--particle-duration) ease-out var(--particle-delay) forwards;
      }
      
      @keyframes particle-float {
        0% {
          transform: translate(0, 0) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(var(--particle-x), var(--particle-y)) scale(1);
          opacity: 0;
        }
      }
      
      /* Achievement Viewer */
      .achievement-viewer {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      }
      
      .achievement-viewer.hidden {
        display: none;
      }
      
      .achievement-viewer-content {
        background: #1a1a2e;
        border-radius: 10px;
        padding: 30px;
        max-width: 1200px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .achievement-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #16213e;
      }
      
      .achievement-viewer-header h2 {
        margin: 0;
        color: #fff;
        font-size: 28px;
      }
      
      .achievement-stats {
        display: flex;
        gap: 30px;
      }
      
      .stat-item {
        text-align: center;
      }
      
      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #4fbdba;
      }
      
      .stat-label {
        display: block;
        font-size: 12px;
        color: #999;
        text-transform: uppercase;
        margin-top: 5px;
      }
      
      /* Achievement Filters */
      .achievement-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: #16213e;
        border-radius: 8px;
      }
      
      .category-tabs {
        display: flex;
        gap: 10px;
      }
      
      .category-tab {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #0f3460;
        color: #999;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .category-tab:hover {
        background: #0f3460;
        color: #fff;
      }
      
      .category-tab.active {
        background: #4fbdba;
        border-color: #4fbdba;
        color: #fff;
      }
      
      .sort-options {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #999;
      }
      
      .sort-options select {
        padding: 8px;
        background: #0f3460;
        border: 1px solid #16213e;
        color: #fff;
        border-radius: 5px;
        cursor: pointer;
      }
      
      /* Achievement List */
      .achievement-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 15px;
      }
      
      .achievement-card {
        display: flex;
        gap: 15px;
        padding: 15px;
        background: #16213e;
        border: 2px solid #0f3460;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      
      .achievement-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      }
      
      .achievement-card.unlocked {
        border-color: #4fbdba;
        background: linear-gradient(135deg, #16213e 0%, #1e3a5f 100%);
      }
      
      .achievement-card.locked {
        opacity: 0.7;
      }
      
      .achievement-card-icon {
        font-size: 36px;
        min-width: 50px;
        text-align: center;
      }
      
      .achievement-card.locked .achievement-card-icon {
        filter: grayscale(1);
        opacity: 0.5;
      }
      
      .achievement-card-content {
        flex: 1;
      }
      
      .achievement-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .achievement-card-name {
        margin: 0;
        font-size: 16px;
        font-weight: bold;
        color: #fff;
      }
      
      .achievement-card-rarity {
        font-size: 12px;
      }
      
      .achievement-card-description {
        margin: 0 0 10px 0;
        font-size: 13px;
        color: #999;
        line-height: 1.4;
      }
      
      .achievement-progress-bar {
        position: relative;
        height: 20px;
        background: #0f3460;
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
      }
      
      .achievement-progress-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #4fbdba, #7ecdc9);
        transition: width 0.3s ease;
      }
      
      .achievement-progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 11px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      
      .achievement-unlocked-time {
        font-size: 11px;
        color: #666;
        margin-top: 5px;
      }
      
      /* Progress Tracker */
      .achievement-tracker {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
      }
      
      .tracker-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 15px;
        background: rgba(22, 33, 62, 0.9);
        border: 2px solid #0f3460;
        border-radius: 25px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .tracker-button:hover {
        background: rgba(79, 189, 186, 0.9);
        transform: scale(1.05);
      }
      
      .tracker-icon {
        font-size: 24px;
      }
      
      .tracker-progress {
        font-size: 14px;
        font-weight: bold;
      }
      
      .recent-achievements {
        position: absolute;
        bottom: 60px;
        left: 0;
        background: rgba(22, 33, 62, 0.95);
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
        min-width: 200px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      }
      
      .recent-achievements.hidden {
        display: none;
      }
      
      .recent-achievements h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #4fbdba;
      }
      
      .recent-achievement {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 0;
        font-size: 13px;
        color: #ccc;
      }
      
      .recent-icon {
        font-size: 18px;
      }
    `;
    
    document.head.appendChild(style);
  }
}