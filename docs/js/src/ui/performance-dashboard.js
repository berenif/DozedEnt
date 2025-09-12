/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics display and controls
 */

import { globalProfiler } from '../utils/performance-profiler.js';
import { globalLODSystem } from '../utils/performance-lod-system.js';
import { globalMemoryOptimizer } from '../utils/memory-optimizer.js';

export class PerformanceDashboard {
  constructor() {
    this.isVisible = false;
    this.updateInterval = null;
    this.element = null;
    this.charts = {};
    
    this.config = {
      updateFrequency: 1000, // Update every second
      chartHistorySize: 60, // 1 minute of data
      alertThresholds: {
        frameTime: 20, // ms
        memoryUsage: 100, // MB
        poolHitRate: 70 // %
      }
    };
    
    this.data = {
      frameTime: [],
      fps: [],
      memoryUsage: [],
      wasmCalls: [],
      poolHitRate: []
    };
    
    this.createDashboard();
  }

  /**
   * Create the dashboard UI
   * @private
   */
  createDashboard() {
    this.element = document.createElement('div');
    this.element.id = 'performance-dashboard';
    this.element.className = 'performance-dashboard hidden';
    
    this.element.innerHTML = `
      <div class="dashboard-header">
        <h3>🔍 Performance Monitor</h3>
        <div class="dashboard-controls">
          <button id="perf-toggle-profiler" class="btn-small">Start Profiling</button>
          <button id="perf-export-data" class="btn-small">Export Data</button>
          <button id="perf-force-gc" class="btn-small">Force GC</button>
          <button id="perf-close" class="btn-close">×</button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>Frame Performance</h4>
            <div class="metric-value" id="frame-time">0.0ms</div>
            <div class="metric-label">Frame Time</div>
            <div class="metric-chart" id="frame-time-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>FPS</h4>
            <div class="metric-value" id="fps-value">60.0</div>
            <div class="metric-label">Frames Per Second</div>
            <div class="metric-chart" id="fps-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>Memory Usage</h4>
            <div class="metric-value" id="memory-usage">0MB</div>
            <div class="metric-label">JS Heap Size</div>
            <div class="metric-chart" id="memory-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>WASM Calls</h4>
            <div class="metric-value" id="wasm-calls">0</div>
            <div class="metric-label">Calls Per Frame</div>
            <div class="metric-chart" id="wasm-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>Pool Efficiency</h4>
            <div class="metric-value" id="pool-hit-rate">0%</div>
            <div class="metric-label">Hit Rate</div>
            <div class="metric-chart" id="pool-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>LOD Quality</h4>
            <div class="metric-value" id="lod-quality">100%</div>
            <div class="metric-label">Rendering Quality</div>
            <div class="lod-controls">
              <input type="range" id="lod-slider" min="10" max="100" value="100">
              <label>Manual Override</label>
            </div>
          </div>
        </div>
        
        <div class="alerts-section">
          <h4>Performance Alerts</h4>
          <div class="alerts-list" id="alerts-list"></div>
        </div>
        
        <div class="details-section">
          <h4>Detailed Metrics</h4>
          <div class="details-tabs">
            <button class="tab-button active" data-tab="overview">Overview</button>
            <button class="tab-button" data-tab="memory">Memory</button>
            <button class="tab-button" data-tab="rendering">Rendering</button>
            <button class="tab-button" data-tab="wasm">WASM</button>
          </div>
          <div class="details-content">
            <div class="tab-content active" id="tab-overview">
              <div class="stats-grid" id="overview-stats"></div>
            </div>
            <div class="tab-content" id="tab-memory">
              <div class="stats-grid" id="memory-stats"></div>
            </div>
            <div class="tab-content" id="tab-rendering">
              <div class="stats-grid" id="rendering-stats"></div>
            </div>
            <div class="tab-content" id="tab-wasm">
              <div class="stats-grid" id="wasm-stats"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.addStyles();
    this.attachEventListeners();
    document.body.appendChild(this.element);
  }

  /**
   * Add CSS styles for the dashboard
   * @private
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .performance-dashboard {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 800px;
        max-height: 80vh;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        overflow-y: auto;
        transition: opacity 0.3s ease;
      }
      
      .performance-dashboard.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .dashboard-header h3 {
        margin: 0;
        font-size: 16px;
      }
      
      .dashboard-controls {
        display: flex;
        gap: 8px;
      }
      
      .btn-small {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .btn-small:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .btn-close {
        padding: 2px 8px;
        background: rgba(255, 0, 0, 0.3);
        border: 1px solid rgba(255, 0, 0, 0.5);
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .dashboard-content {
        padding: 15px;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .metric-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 10px;
        text-align: center;
      }
      
      .metric-card h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #aaa;
      }
      
      .metric-value {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .metric-label {
        font-size: 10px;
        color: #888;
        margin-bottom: 8px;
      }
      
      .metric-chart {
        height: 40px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
        position: relative;
        overflow: hidden;
      }
      
      .lod-controls {
        margin-top: 8px;
      }
      
      .lod-controls input {
        width: 100%;
        margin-bottom: 4px;
      }
      
      .lod-controls label {
        font-size: 10px;
        color: #888;
      }
      
      .alerts-section {
        margin-bottom: 20px;
      }
      
      .alerts-section h4 {
        margin: 0 0 10px 0;
        color: #ff6b6b;
      }
      
      .alerts-list {
        max-height: 100px;
        overflow-y: auto;
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.2);
        border-radius: 4px;
        padding: 8px;
      }
      
      .alert-item {
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 11px;
      }
      
      .alert-item:last-child {
        border-bottom: none;
      }
      
      .details-section h4 {
        margin: 0 0 10px 0;
      }
      
      .details-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .tab-button {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .tab-button.active {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
      }
      
      .tab-content {
        display: none;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 10px;
        min-height: 150px;
      }
      
      .tab-content.active {
        display: block;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .stat-label {
        color: #aaa;
      }
      
      .stat-value {
        color: white;
        font-weight: bold;
      }
      
      .chart-bar {
        position: absolute;
        bottom: 0;
        width: 2px;
        background: #4CAF50;
        transition: height 0.3s ease;
      }
      
      .chart-bar.warning {
        background: #FFC107;
      }
      
      .chart-bar.danger {
        background: #F44336;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    // Toggle profiler
    this.element.querySelector('#perf-toggle-profiler').addEventListener('click', () => {
      this.toggleProfiler();
    });
    
    // Export data
    this.element.querySelector('#perf-export-data').addEventListener('click', () => {
      this.exportData();
    });
    
    // Force garbage collection
    this.element.querySelector('#perf-force-gc').addEventListener('click', () => {
      globalMemoryOptimizer.forceGarbageCollection();
    });
    
    // Close dashboard
    this.element.querySelector('#perf-close').addEventListener('click', () => {
      this.hide();
    });
    
    // LOD quality slider
    this.element.querySelector('#lod-slider').addEventListener('input', (e) => {
      const quality = parseInt(e.target.value) / 100;
      globalLODSystem.setQualityLevel(quality);
    });
    
    // Tab switching
    this.element.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  /**
   * Toggle profiler on/off
   * @private
   */
  toggleProfiler() {
    const button = this.element.querySelector('#perf-toggle-profiler');
    
    if (globalProfiler.isEnabled) {
      globalProfiler.stop();
      button.textContent = 'Start Profiling';
    } else {
      globalProfiler.start();
      button.textContent = 'Stop Profiling';
    }
  }

  /**
   * Export performance data
   * @private
   */
  exportData() {
    const data = {
      profiler: globalProfiler.getDetailedReport(),
      lod: globalLODSystem.getPerformanceStats(),
      memory: globalMemoryOptimizer.getMemoryStats(),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-data-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Switch dashboard tab
   * @param {string} tabName - Tab to switch to
   * @private
   */
  switchTab(tabName) {
    // Update buttons
    this.element.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content
    this.element.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  /**
   * Show the dashboard
   */
  show() {
    this.isVisible = true;
    this.element.classList.remove('hidden');
    
    // Start updating
    this.startUpdating();
  }

  /**
   * Hide the dashboard
   */
  hide() {
    this.isVisible = false;
    this.element.classList.add('hidden');
    
    // Stop updating
    this.stopUpdating();
  }

  /**
   * Toggle dashboard visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Start periodic updates
   * @private
   */
  startUpdating() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.updateFrequency);
    
    // Initial update
    this.updateMetrics();
  }

  /**
   * Stop periodic updates
   * @private
   */
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update all metrics displays
   * @private
   */
  updateMetrics() {
    if (!this.isVisible) return;
    
    try {
      const profilerSummary = globalProfiler.getMetricsSummary();
      const lodStats = globalLODSystem.getPerformanceStats();
      const memoryStats = globalMemoryOptimizer.getMemoryStats();
      const poolEfficiency = globalMemoryOptimizer.getPoolEfficiency();
      
      // Update main metrics
      this.updateMetricCard('frame-time', `${profilerSummary.frameTime.current.toFixed(1)}ms`);
      this.updateMetricCard('fps-value', profilerSummary.fps.toFixed(1));
      this.updateMetricCard('memory-usage', `${(memoryStats.used / 1024 / 1024).toFixed(1)}MB`);
      this.updateMetricCard('wasm-calls', profilerSummary.wasmCalls.callsPerFrame.toFixed(1));
      this.updateMetricCard('pool-hit-rate', poolEfficiency.hitRate);
      this.updateMetricCard('lod-quality', `${(lodStats.qualityLevel * 100).toFixed(0)}%`);
      
      // Update charts
      this.updateChart('frame-time-chart', profilerSummary.frameTime.current, this.config.alertThresholds.frameTime);
      this.updateChart('fps-chart', profilerSummary.fps, 60);
      this.updateChart('memory-chart', memoryStats.used / 1024 / 1024, this.config.alertThresholds.memoryUsage);
      
      // Update alerts
      this.updateAlerts();
      
      // Update detailed tabs
      this.updateDetailedStats(profilerSummary, lodStats, memoryStats, poolEfficiency);
      
    } catch (error) {
      console.error('Dashboard update error:', error);
    }
  }

  /**
   * Update a metric card value
   * @param {string} id - Element ID
   * @param {string} value - New value
   * @private
   */
  updateMetricCard(id, value) {
    const element = this.element.querySelector(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Update a chart display
   * @param {string} chartId - Chart element ID
   * @param {number} value - Current value
   * @param {number} threshold - Alert threshold
   * @private
   */
  updateChart(chartId, value, threshold) {
    const chart = this.element.querySelector(`#${chartId}`);
    if (!chart) return;
    
    // Add data point
    const dataKey = chartId.replace('-chart', '');
    if (!this.data[dataKey]) this.data[dataKey] = [];
    
    this.data[dataKey].push(value);
    if (this.data[dataKey].length > this.config.chartHistorySize) {
      this.data[dataKey].shift();
    }
    
    // Update chart bars
    chart.innerHTML = '';
    const maxValue = Math.max(...this.data[dataKey], threshold);
    
    this.data[dataKey].forEach((val, index) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.left = `${(index / this.config.chartHistorySize) * 100}%`;
      bar.style.height = `${(val / maxValue) * 100}%`;
      
      // Color based on threshold
      if (val > threshold * 1.2) {
        bar.classList.add('danger');
      } else if (val > threshold) {
        bar.classList.add('warning');
      }
      
      chart.appendChild(bar);
    });
  }

  /**
   * Update alerts display
   * @private
   */
  updateAlerts() {
    const alertsList = this.element.querySelector('#alerts-list');
    if (!alertsList) return;
    
    const report = globalProfiler.getDetailedReport();
    const recentAlerts = report.alerts.slice(-5); // Last 5 alerts
    
    alertsList.innerHTML = '';
    
    if (recentAlerts.length === 0) {
      alertsList.innerHTML = '<div class="alert-item">No recent alerts</div>';
      return;
    }
    
    recentAlerts.forEach(alert => {
      const alertElement = document.createElement('div');
      alertElement.className = 'alert-item';
      alertElement.innerHTML = `
        <strong>${alert.type}</strong>: ${alert.message}
        <br><small>Frame ${alert.frame}</small>
      `;
      alertsList.appendChild(alertElement);
    });
  }

  /**
   * Update detailed statistics tabs
   * @param {Object} profilerSummary - Profiler summary
   * @param {Object} lodStats - LOD statistics
   * @param {Object} memoryStats - Memory statistics
   * @param {Object} poolEfficiency - Pool efficiency data
   * @private
   */
  updateDetailedStats(profilerSummary, lodStats, memoryStats, poolEfficiency) {
    // Overview tab
    this.updateStatsGrid('overview-stats', {
      'Runtime': `${(profilerSummary.runtime / 1000).toFixed(1)}s`,
      'Total Frames': profilerSummary.frameCount,
      'Avg Frame Time': `${profilerSummary.frameTime.average.toFixed(2)}ms`,
      'P95 Frame Time': `${profilerSummary.frameTime.p95.toFixed(2)}ms`,
      'WASM Calls': profilerSummary.wasmCalls.count,
      'LOD Quality': `${(lodStats.qualityLevel * 100).toFixed(0)}%`
    });
    
    // Memory tab
    this.updateStatsGrid('memory-stats', {
      'Used Memory': `${(memoryStats.used / 1024 / 1024).toFixed(1)}MB`,
      'Allocated Memory': `${(memoryStats.allocated / 1024 / 1024).toFixed(1)}MB`,
      'Peak Usage': `${(memoryStats.peakUsage / 1024 / 1024).toFixed(1)}MB`,
      'GC Count': memoryStats.gcCount,
      'Pool Hits': poolEfficiency.hits,
      'Pool Misses': poolEfficiency.misses
    });
    
    // Rendering tab
    this.updateStatsGrid('rendering-stats', {
      'Full Detail Entities': lodStats.entityCounts.fullDetail,
      'Reduced Detail': lodStats.entityCounts.reducedDetail,
      'Minimal Detail': lodStats.entityCounts.minimalDetail,
      'Culled Entities': lodStats.entityCounts.culled,
      'Quality Level': `${(lodStats.qualityLevel * 100).toFixed(0)}%`,
      'Target Frame Time': `${lodStats.targetFrameTime.toFixed(1)}ms`
    });
    
    // WASM tab
    this.updateStatsGrid('wasm-stats', {
      'Total WASM Calls': profilerSummary.wasmCalls.count,
      'Avg Call Time': `${profilerSummary.wasmCalls.averageTime.toFixed(3)}ms`,
      'Calls Per Frame': profilerSummary.wasmCalls.callsPerFrame.toFixed(2),
      'Total WASM Time': `${profilerSummary.wasmCalls.totalTime.toFixed(1)}ms`,
      'WASM Efficiency': `${((profilerSummary.wasmCalls.totalTime / profilerSummary.runtime) * 100).toFixed(1)}%`,
      'Cache Hit Rate': 'N/A' // Would need additional tracking
    });
  }

  /**
   * Update a statistics grid
   * @param {string} gridId - Grid element ID
   * @param {Object} stats - Statistics object
   * @private
   */
  updateStatsGrid(gridId, stats) {
    const grid = this.element.querySelector(`#${gridId}`);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(stats).forEach(([label, value]) => {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      statItem.innerHTML = `
        <span class="stat-label">${label}:</span>
        <span class="stat-value">${value}</span>
      `;
      grid.appendChild(statItem);
    });
  }
}

// Create global dashboard instance
export const globalDashboard = new PerformanceDashboard();

// Add keyboard shortcut to toggle dashboard (Ctrl+Shift+P)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    globalDashboard.toggle();
  }
});
