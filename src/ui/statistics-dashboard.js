/**
 * Statistics Dashboard - Comprehensive statistics visualization
 * Displays player performance metrics, charts, and personal records
 */

export class StatisticsDashboard {
  constructor(statisticsManager) {
    this.statisticsManager = statisticsManager;
    
    // Dashboard state
    this.isDashboardOpen = false;
    this.selectedCategory = 'overview';
    this.selectedTimeRange = 'session';
    this.chartType = 'line';
    
    // Chart instance (placeholder for future chart library integration)
    this.activeChart = null;
    
    this.initialize();
  }
  
  /**
   * Initialize statistics dashboard
   */
  initialize() {
    this.createDashboard();
    this.createMiniWidget();
    this.setupEventListeners();
    this.injectStyles();
    this.updateDashboard();
  }
  
  /**
   * Create main dashboard interface
   */
  createDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'statistics-dashboard';
    dashboard.className = 'statistics-dashboard hidden';
    dashboard.innerHTML = `
      <div class="dashboard-content">
        <div class="dashboard-header">
          <h2>Statistics Dashboard</h2>
          <button class="close-button" id="close-dashboard">×</button>
        </div>
        
        <div class="dashboard-summary">
          <div class="summary-card">
            <div class="summary-icon">⚔️</div>
            <div class="summary-data">
              <div class="summary-value" id="summary-kills">0</div>
              <div class="summary-label">Enemies Killed</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">🏰</div>
            <div class="summary-data">
              <div class="summary-value" id="summary-rooms">0</div>
              <div class="summary-label">Rooms Cleared</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">💰</div>
            <div class="summary-data">
              <div class="summary-value" id="summary-gold">0</div>
              <div class="summary-label">Gold Earned</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon">⏱️</div>
            <div class="summary-data">
              <div class="summary-value" id="summary-playtime">0s</div>
              <div class="summary-label">Play Time</div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-tabs">
          <button class="tab-button active" data-tab="overview">Overview</button>
          <button class="tab-button" data-tab="combat">Combat</button>
          <button class="tab-button" data-tab="economy">Economy</button>
          <button class="tab-button" data-tab="exploration">Exploration</button>
          <button class="tab-button" data-tab="progression">Progression</button>
          <button class="tab-button" data-tab="performance">Performance</button>
        </div>
        
        <div class="dashboard-filters">
          <div class="time-range-selector">
            <label>Time Range:</label>
            <select id="time-range-select">
              <option value="session">Current Session</option>
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div class="chart-type-selector">
            <button class="chart-type-btn active" data-type="line" title="Line Chart">📈</button>
            <button class="chart-type-btn" data-type="bar" title="Bar Chart">📊</button>
            <button class="chart-type-btn" data-type="pie" title="Pie Chart">🥧</button>
          </div>
        </div>
        
        <div class="dashboard-body">
          <div class="statistics-panel" id="statistics-panel">
            <!-- Statistics content loaded here -->
          </div>
          
          <div class="chart-panel">
            <div class="chart-header">
              <h3 id="chart-title">Performance Over Time</h3>
              <button class="chart-refresh" id="refresh-chart">🔄</button>
            </div>
            <div class="chart-container" id="chart-container">
              <canvas id="statistics-chart"></canvas>
            </div>
          </div>
        </div>
        
        <div class="dashboard-footer">
          <div class="performance-metrics">
            <h3>Performance Metrics</h3>
            <div class="metrics-grid" id="performance-metrics">
              <!-- Performance metrics loaded here -->
            </div>
          </div>
          
          <div class="dashboard-actions">
            <button class="action-btn" id="export-stats">📥 Export</button>
            <button class="action-btn" id="reset-stats">🔄 Reset</button>
            <button class="action-btn" id="share-stats">📤 Share</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dashboard);
  }
  
  /**
   * Create mini statistics widget
   */
  createMiniWidget() {
    const widget = document.createElement('div');
    widget.id = 'stats-widget';
    widget.className = 'stats-widget';
    widget.innerHTML = `
      <button class="widget-toggle" id="open-dashboard" title="Statistics">
        <span class="widget-icon">📊</span>
        <div class="widget-preview">
          <span class="widget-stat" id="widget-kills">0 kills</span>
          <span class="widget-stat" id="widget-time">0:00</span>
        </div>
      </button>
      
      <div class="widget-expanded hidden" id="widget-expanded">
        <h4>Quick Stats</h4>
        <div class="quick-stats-grid">
          <div class="quick-stat">
            <span class="quick-label">K/D:</span>
            <span class="quick-value" id="quick-kd">0.0</span>
          </div>
          <div class="quick-stat">
            <span class="quick-label">Accuracy:</span>
            <span class="quick-value" id="quick-accuracy">0%</span>
          </div>
          <div class="quick-stat">
            <span class="quick-label">Efficiency:</span>
            <span class="quick-value" id="quick-efficiency">0</span>
          </div>
          <div class="quick-stat">
            <span class="quick-label">Score:</span>
            <span class="quick-value" id="quick-score">0</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(widget);
  }
  
  /**
   * Update dashboard with current statistics
   */
  updateDashboard() {
    // Update summary cards
    this.updateSummaryCards();
    
    // Update statistics panel based on selected category
    this.updateStatisticsPanel();
    
    // Update performance metrics
    this.updatePerformanceMetrics();
    
    // Update chart
    this.updateChart();
    
    // Update widget
    this.updateWidget();
  }
  
  /**
   * Update summary cards
   */
  updateSummaryCards() {
    const stats = this.statisticsManager.getAllStatistics();
    
    // Update each summary card
    document.getElementById('summary-kills').textContent = 
      this.statisticsManager.getFormattedStatistic('enemies_killed');
    document.getElementById('summary-rooms').textContent = 
      this.statisticsManager.getFormattedStatistic('rooms_cleared');
    document.getElementById('summary-gold').textContent = 
      this.statisticsManager.getFormattedStatistic('gold_earned');
    document.getElementById('summary-playtime').textContent = 
      this.statisticsManager.getFormattedStatistic('play_time');
  }
  
  /**
   * Update statistics panel
   */
  updateStatisticsPanel() {
    const panel = document.getElementById('statistics-panel');
    let stats;
    
    if (this.selectedCategory === 'overview') {
      stats = this.statisticsManager.getAllStatistics();
    } else {
      stats = this.statisticsManager.getStatisticsByCategory(this.selectedCategory);
    }
    
    // Build statistics HTML
    const statsHTML = this.selectedCategory === 'overview' ? 
      this.buildOverviewHTML() : this.buildCategoryHTML(stats);
    
    panel.innerHTML = statsHTML;
  }
  
  /**
   * Build overview HTML
   * @returns {string}
   */
  buildOverviewHTML() {
    const categories = Object.keys(this.statisticsManager.categories);
    
    let html = '<div class="overview-grid">';
    
    categories.forEach(category => {
      const categoryStats = this.statisticsManager.getStatisticsByCategory(category);
      const topStats = categoryStats.slice(0, 3);
      
      html += `
        <div class="category-section">
          <h4>${this.statisticsManager.categories[category]}</h4>
          <div class="stat-list">
            ${topStats.map(stat => `
              <div class="stat-item">
                <span class="stat-name">${stat.name}:</span>
                <span class="stat-value">${this.statisticsManager.formatValue(stat.value, stat.type)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Build category HTML
   * @param {Array} stats
   * @returns {string}
   */
  buildCategoryHTML(stats) {
    let html = '<div class="category-stats">';
    
    stats.forEach(stat => {
      const progress = this.getStatProgress(stat);
      
      html += `
        <div class="detailed-stat">
          <div class="stat-header">
            <span class="stat-name">${stat.name}</span>
            <span class="stat-value">${this.statisticsManager.formatValue(stat.value, stat.type)}</span>
          </div>
          ${progress ? `
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${progress}%</span>
            </div>
          ` : ''}
          ${stat.sessionValue !== undefined ? `
            <div class="stat-session">
              <span class="session-label">Session:</span>
              <span class="session-value">${this.statisticsManager.formatValue(stat.sessionValue, stat.type)}</span>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Get statistic progress percentage
   * @param {Object} stat
   * @returns {number|null}
   */
  getStatProgress(stat) {
    // Calculate progress for stats with targets
    if (stat.target) {
      return Math.min(100, (stat.value / stat.target) * 100);
    }
    return null;
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const metrics = this.statisticsManager.getPerformanceMetrics();
    const metricsGrid = document.getElementById('performance-metrics');
    
    metricsGrid.innerHTML = `
      <div class="metric">
        <span class="metric-label">Kills/Min:</span>
        <span class="metric-value">${metrics.killsPerMinute}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Damage/Kill:</span>
        <span class="metric-value">${metrics.damagePerKill}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Damage Ratio:</span>
        <span class="metric-value">${metrics.damageRatio}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Rooms/Hour:</span>
        <span class="metric-value">${metrics.roomsPerHour}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Survival Rate:</span>
        <span class="metric-value">${metrics.survivalRate}%</span>
      </div>
      <div class="metric">
        <span class="metric-label">Efficiency:</span>
        <span class="metric-value">${metrics.efficiency}</span>
      </div>
    `;
  }
  
  /**
   * Update chart
   */
  updateChart() {
    const canvas = document.getElementById('statistics-chart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get chart data based on selected category
    const chartData = this.getChartData();
    
    // Draw chart based on type
    switch (this.chartType) {
      case 'line':
        this.drawLineChart(ctx, chartData);
        break;
      case 'bar':
        this.drawBarChart(ctx, chartData);
        break;
      case 'pie':
        this.drawPieChart(ctx, chartData);
        break;
    }
  }
  
  /**
   * Get chart data
   * @returns {Object}
   */
  getChartData() {
    // Get data from statistics manager
    // This is simplified - in production you'd use a proper charting library
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Enemies Killed',
        data: [12, 19, 15, 25, 22, 30, 28],
        color: '#4fbdba'
      }]
    };
  }
  
  /**
   * Draw line chart
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} data
   */
  drawLineChart(ctx, data) {
    const canvas = ctx.canvas;
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw data
    if (data.datasets && data.datasets[0]) {
      const dataset = data.datasets[0];
      const maxValue = Math.max(...dataset.data);
      const xStep = width / (dataset.data.length - 1);
      
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = canvas.height - padding - (value / maxValue) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw point
        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.stroke();
      
      // Draw labels
      ctx.fillStyle = '#999';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      
      data.labels.forEach((label, index) => {
        const x = padding + index * xStep;
        ctx.fillText(label, x, canvas.height - padding + 20);
      });
    }
  }
  
  /**
   * Draw bar chart
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} data
   */
  drawBarChart(ctx, data) {
    const canvas = ctx.canvas;
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw bars
    if (data.datasets && data.datasets[0]) {
      const dataset = data.datasets[0];
      const maxValue = Math.max(...dataset.data);
      const barWidth = width / dataset.data.length * 0.8;
      const barSpacing = width / dataset.data.length * 0.2;
      
      dataset.data.forEach((value, index) => {
        const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
        const barHeight = (value / maxValue) * height;
        const y = canvas.height - padding - barHeight;
        
        ctx.fillStyle = dataset.color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value on top
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
      });
      
      // Draw labels
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      
      data.labels.forEach((label, index) => {
        const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
        ctx.fillText(label, x, canvas.height - padding + 20);
      });
    }
  }
  
  /**
   * Draw pie chart
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} data
   */
  drawPieChart(ctx, data) {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;
    
    if (data.datasets && data.datasets[0]) {
      const dataset = data.datasets[0];
      const total = dataset.data.reduce((a, b) => a + b, 0);
      let currentAngle = -Math.PI / 2;
      
      const colors = ['#4fbdba', '#e94560', '#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#ec4899'];
      
      dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        
        // Draw slice
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.labels[index], labelX, labelY);
        
        currentAngle += sliceAngle;
      });
    }
  }
  
  /**
   * Update widget display
   */
  updateWidget() {
    const kills = this.statisticsManager.getStatValue('enemies_killed');
    const playTime = this.statisticsManager.getStatValue('play_time');
    
    document.getElementById('widget-kills').textContent = `${kills} kills`;
    document.getElementById('widget-time').textContent = this.formatShortTime(playTime);
    
    // Update quick stats if expanded
    const expanded = document.getElementById('widget-expanded');
    if (!expanded.classList.contains('hidden')) {
      const metrics = this.statisticsManager.getPerformanceMetrics();
      document.getElementById('quick-kd').textContent = metrics.damageRatio;
      document.getElementById('quick-accuracy').textContent = '0%'; // TODO: Get from WASM
      document.getElementById('quick-efficiency').textContent = metrics.efficiency;
      document.getElementById('quick-score').textContent = '0'; // TODO: Calculate score
    }
  }
  
  /**
   * Format time for widget
   * @param {number} seconds
   * @returns {string}
   */
  formatShortTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Open dashboard
   */
  openDashboard() {
    const dashboard = document.getElementById('statistics-dashboard');
    dashboard.classList.remove('hidden');
    this.isDashboardOpen = true;
    this.updateDashboard();
  }
  
  /**
   * Close dashboard
   */
  closeDashboard() {
    const dashboard = document.getElementById('statistics-dashboard');
    dashboard.classList.add('hidden');
    this.isDashboardOpen = false;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Dashboard controls
    document.getElementById('close-dashboard').addEventListener('click', () => {
      this.closeDashboard();
    });
    
    document.getElementById('open-dashboard').addEventListener('click', () => {
      this.openDashboard();
    });
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedCategory = tab.dataset.tab;
        this.updateStatisticsPanel();
      });
    });
    
    // Time range selector
    document.getElementById('time-range-select').addEventListener('change', (e) => {
      this.selectedTimeRange = e.target.value;
      this.updateDashboard();
    });
    
    // Chart type selector
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.chartType = btn.dataset.type;
        this.updateChart();
      });
    });
    
    // Refresh chart
    document.getElementById('refresh-chart').addEventListener('click', () => {
      this.updateChart();
    });
    
    // Actions
    document.getElementById('export-stats').addEventListener('click', () => {
      this.exportStatistics();
    });
    
    document.getElementById('reset-stats').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all statistics?')) {
        this.statisticsManager.resetStatistics();
        this.updateDashboard();
      }
    });
    
    document.getElementById('share-stats').addEventListener('click', () => {
      this.shareStatistics();
    });
    
    // Widget hover
    let hoverTimeout;
    document.getElementById('stats-widget').addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      document.getElementById('widget-expanded').classList.remove('hidden');
      this.updateWidget();
    });
    
    document.getElementById('stats-widget').addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        document.getElementById('widget-expanded').classList.add('hidden');
      }, 500);
    });
    
    // Listen for statistics updates
    window.addEventListener('statisticsUpdated', () => {
      if (this.isDashboardOpen) {
        this.updateDashboard();
      } else {
        this.updateWidget();
      }
    });
    
    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        if (this.isDashboardOpen) {
          this.closeDashboard();
        } else {
          this.openDashboard();
        }
      }
    });
  }
  
  /**
   * Export statistics
   */
  exportStatistics() {
    const data = this.statisticsManager.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Share statistics
   */
  shareStatistics() {
    const metrics = this.statisticsManager.getPerformanceMetrics();
    const text = `My Game Stats:\n` +
      `Enemies Killed: ${this.statisticsManager.getStatValue('enemies_killed')}\n` +
      `Rooms Cleared: ${this.statisticsManager.getStatValue('rooms_cleared')}\n` +
      `Efficiency: ${metrics.efficiency}\n` +
      `Play Time: ${this.statisticsManager.getFormattedStatistic('play_time')}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Game Statistics',
        text: text
      });
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Statistics copied to clipboard!');
    }
  }
  
  /**
   * Inject CSS styles
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Statistics Dashboard */
      .statistics-dashboard {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      }
      
      .statistics-dashboard.hidden {
        display: none;
      }
      
      .dashboard-content {
        background: #1a1a2e;
        border-radius: 10px;
        padding: 30px;
        max-width: 1400px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #16213e;
      }
      
      .dashboard-header h2 {
        margin: 0;
        color: #fff;
        font-size: 28px;
      }
      
      /* Summary Cards */
      .dashboard-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .summary-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
        border-radius: 10px;
        border: 1px solid #4fbdba;
      }
      
      .summary-icon {
        font-size: 36px;
      }
      
      .summary-value {
        font-size: 28px;
        font-weight: bold;
        color: #4fbdba;
      }
      
      .summary-label {
        font-size: 14px;
        color: #999;
        text-transform: uppercase;
      }
      
      /* Tabs */
      .dashboard-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        overflow-x: auto;
      }
      
      .tab-button {
        padding: 10px 20px;
        background: transparent;
        border: 1px solid #0f3460;
        color: #999;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;
      }
      
      .tab-button:hover {
        background: #0f3460;
        color: #fff;
      }
      
      .tab-button.active {
        background: #4fbdba;
        border-color: #4fbdba;
        color: #fff;
      }
      
      /* Filters */
      .dashboard-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: #16213e;
        border-radius: 8px;
      }
      
      .time-range-selector {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #999;
      }
      
      .time-range-selector select {
        padding: 8px;
        background: #0f3460;
        border: 1px solid #16213e;
        color: #fff;
        border-radius: 5px;
        cursor: pointer;
      }
      
      .chart-type-selector {
        display: flex;
        gap: 5px;
      }
      
      .chart-type-btn {
        width: 36px;
        height: 36px;
        background: #0f3460;
        border: 1px solid #16213e;
        border-radius: 5px;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s ease;
      }
      
      .chart-type-btn:hover {
        background: #16213e;
      }
      
      .chart-type-btn.active {
        background: #4fbdba;
        border-color: #4fbdba;
      }
      
      /* Dashboard Body */
      .dashboard-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      @media (max-width: 1024px) {
        .dashboard-body {
          grid-template-columns: 1fr;
        }
      }
      
      /* Statistics Panel */
      .statistics-panel {
        background: #16213e;
        border-radius: 8px;
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }
      
      .category-section h4 {
        margin: 0 0 10px 0;
        color: #4fbdba;
        font-size: 16px;
      }
      
      .stat-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 5px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      
      .stat-name {
        color: #999;
        font-size: 13px;
      }
      
      .stat-value {
        color: #fff;
        font-weight: bold;
        font-size: 13px;
      }
      
      .category-stats {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .detailed-stat {
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        border-left: 3px solid #4fbdba;
      }
      
      .stat-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .stat-header .stat-name {
        color: #fff;
        font-size: 15px;
        font-weight: bold;
      }
      
      .stat-header .stat-value {
        color: #4fbdba;
        font-size: 18px;
        font-weight: bold;
      }
      
      .stat-progress {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
      }
      
      .progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4fbdba, #7ecdc9);
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 12px;
        color: #999;
      }
      
      .stat-session {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(79, 189, 186, 0.2);
        font-size: 12px;
      }
      
      .session-label {
        color: #666;
      }
      
      .session-value {
        color: #999;
      }
      
      /* Chart Panel */
      .chart-panel {
        background: #16213e;
        border-radius: 8px;
        padding: 20px;
      }
      
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .chart-header h3 {
        margin: 0;
        color: #fff;
        font-size: 18px;
      }
      
      .chart-refresh {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        transition: transform 0.3s ease;
      }
      
      .chart-refresh:hover {
        transform: rotate(180deg);
      }
      
      .chart-container {
        position: relative;
        height: 300px;
      }
      
      #statistics-chart {
        width: 100%;
        height: 100%;
      }
      
      /* Performance Metrics */
      .dashboard-footer {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        padding-top: 20px;
        border-top: 1px solid #16213e;
      }
      
      .performance-metrics h3 {
        margin: 0 0 15px 0;
        color: #4fbdba;
        font-size: 18px;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }
      
      .metric {
        display: flex;
        flex-direction: column;
        padding: 10px;
        background: #16213e;
        border-radius: 5px;
        border: 1px solid #0f3460;
      }
      
      .metric-label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
      }
      
      .metric-value {
        font-size: 20px;
        font-weight: bold;
        color: #4fbdba;
      }
      
      /* Dashboard Actions */
      .dashboard-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .action-btn {
        padding: 10px 20px;
        background: #0f3460;
        border: 1px solid #16213e;
        color: #fff;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .action-btn:hover {
        background: #4fbdba;
        transform: translateY(-2px);
      }
      
      /* Stats Widget */
      .stats-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
      }
      
      .widget-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 15px;
        background: rgba(22, 33, 62, 0.9);
        border: 2px solid #0f3460;
        border-radius: 25px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .widget-toggle:hover {
        background: rgba(79, 189, 186, 0.9);
        transform: scale(1.05);
      }
      
      .widget-icon {
        font-size: 24px;
      }
      
      .widget-preview {
        display: flex;
        flex-direction: column;
        font-size: 12px;
      }
      
      .widget-stat {
        color: #ccc;
      }
      
      .widget-expanded {
        position: absolute;
        bottom: 60px;
        right: 0;
        background: rgba(22, 33, 62, 0.95);
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
        min-width: 200px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      }
      
      .widget-expanded.hidden {
        display: none;
      }
      
      .widget-expanded h4 {
        margin: 0 0 10px 0;
        color: #4fbdba;
        font-size: 14px;
      }
      
      .quick-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .quick-stat {
        display: flex;
        flex-direction: column;
      }
      
      .quick-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
      }
      
      .quick-value {
        font-size: 16px;
        font-weight: bold;
        color: #4fbdba;
      }
    `;
    
    document.head.appendChild(style);
  }
}