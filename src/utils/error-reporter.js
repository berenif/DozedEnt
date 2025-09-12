/**
 * Comprehensive Error Reporting and Debugging Tools
 * Collects, analyzes, and reports errors across all game systems
 */

import { createLogger } from './logger.js';
import { gameErrorHandler } from './game-error-handler.js';
import { networkErrorRecovery } from './network-error-recovery.js';
import { browserAPIFallbacks } from './browser-api-fallbacks.js';
import { inputValidator } from './input-validator.js';

export class ErrorReporter {
  constructor() {
    this.logger = createLogger('ErrorReporter');
    
    // Error collection and analysis
    this.errorCollection = {
      errors: [],
      maxErrors: 1000,
      categories: new Map(),
      patterns: new Map(),
      criticalErrors: [],
      recentErrors: []
    };
    
    // System diagnostics
    this.systemDiagnostics = {
      browser: {},
      performance: {},
      memory: {},
      network: {},
      wasm: {},
      lastUpdate: 0
    };
    
    // Error reporting configuration
    this.reportingConfig = {
      enabled: true,
      autoReport: false,
      reportEndpoint: null,
      reportThreshold: 10, // Report after 10 errors
      reportInterval: 300000, // 5 minutes
      lastReport: 0
    };
    
    // Debug tools
    this.debugTools = {
      consoleCommands: new Map(),
      errorFilters: new Set(),
      debugMode: false,
      verboseLogging: false
    };
    
    this.initializeErrorReporting();
    this.setupDebugTools();
  }

  /**
   * Initialize error reporting system
   */
  initializeErrorReporting() {
    // Global error handlers
    window.addEventListener('error', (event) => {
      this.reportError('javascript', event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: 'global_error_handler'
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError('promise', event.reason, {
        promise: event.promise,
        source: 'unhandled_promise_rejection'
      });
    });
    
    // Performance observer for long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              this.reportPerformanceIssue('long_task', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          }
        });
        
        perfObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        this.logger.warn('Performance observer not supported:', error);
      }
    }
    
    // Memory monitoring
    this.startMemoryMonitoring();
    
    // Periodic system diagnostics
    setInterval(() => this.updateSystemDiagnostics(), 30000); // Every 30 seconds
  }

  /**
   * Setup debug tools and console commands
   */
  setupDebugTools() {
    // Register console commands
    this.debugTools.consoleCommands.set('errorReport', () => this.generateErrorReport());
    this.debugTools.consoleCommands.set('clearErrors', () => this.clearErrors());
    this.debugTools.consoleCommands.set('debugMode', (enabled) => this.setDebugMode(enabled));
    this.debugTools.consoleCommands.set('errorStats', () => this.getErrorStatistics());
    this.debugTools.consoleCommands.set('systemDiag', () => this.getSystemDiagnostics());
    this.debugTools.consoleCommands.set('exportErrors', () => this.exportErrorLog());
    
    // Make debug tools globally accessible
    if (typeof globalThis !== 'undefined') {
      globalThis.gameDebug = {
        errorReport: () => this.generateErrorReport(),
        clearErrors: () => this.clearErrors(),
        debugMode: (enabled) => this.setDebugMode(enabled),
        errorStats: () => this.getErrorStatistics(),
        systemDiag: () => this.getSystemDiagnostics(),
        exportErrors: () => this.exportErrorLog(),
        showErrorUI: () => this.showErrorReportUI()
      };
    }
  }

  /**
   * Report an error to the system
   */
  reportError(category, error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      category,
      message: error.message || String(error),
      stack: error.stack,
      timestamp: new Date().toISOString(),
      performanceTime: performance.now(),
      context: { ...context },
      severity: this.determineSeverity(category, error, context),
      userAgent: navigator.userAgent,
      url: location.href
    };
    
    // Add to error collection
    this.errorCollection.errors.push(errorEntry);
    
    // Update category counts
    const categoryCount = this.errorCollection.categories.get(category) || 0;
    this.errorCollection.categories.set(category, categoryCount + 1);
    
    // Check for error patterns
    this.analyzeErrorPatterns(errorEntry);
    
    // Handle critical errors immediately
    if (errorEntry.severity === 'critical') {
      this.errorCollection.criticalErrors.push(errorEntry);
      this.handleCriticalError(errorEntry);
    }
    
    // Maintain recent errors list
    this.errorCollection.recentErrors.push(errorEntry);
    if (this.errorCollection.recentErrors.length > 50) {
      this.errorCollection.recentErrors.shift();
    }
    
    // Trim error collection if too large
    if (this.errorCollection.errors.length > this.errorCollection.maxErrors) {
      this.errorCollection.errors.shift();
    }
    
    // Log error
    this.logger.error(`[${category}] ${error.message}`, error, context);
    
    // Check if we should auto-report
    if (this.shouldAutoReport()) {
      this.sendErrorReport();
    }
    
    // Update debug UI if visible
    this.updateDebugUI();
  }

  /**
   * Report performance issue
   */
  reportPerformanceIssue(type, details) {
    this.reportError('performance', new Error(`Performance issue: ${type}`), {
      performanceType: type,
      details
    });
  }

  /**
   * Determine error severity
   */
  determineSeverity(category, error, context) {
    // Critical errors that break core functionality
    if (category === 'wasm' && context.function === 'update') {
      return 'critical';
    }
    
    if (category === 'javascript' && error.message.includes('ReferenceError')) {
      return 'critical';
    }
    
    if (category === 'network' && context.type === 'connection_drop') {
      return 'high';
    }
    
    if (category === 'performance' && context.details?.duration > 100) {
      return 'medium';
    }
    
    // Default severity
    return 'low';
  }

  /**
   * Analyze error patterns for recurring issues
   */
  analyzeErrorPatterns(errorEntry) {
    const pattern = `${errorEntry.category}:${errorEntry.message}`;
    const patternCount = this.errorCollection.patterns.get(pattern) || 0;
    this.errorCollection.patterns.set(pattern, patternCount + 1);
    
    // Alert on recurring patterns
    if (patternCount >= 5) {
      this.logger.warn(`Recurring error pattern detected: ${pattern} (${patternCount} occurrences)`);
      
      // Create pattern analysis error
      this.reportError('pattern_analysis', new Error(`Recurring error: ${pattern}`), {
        originalCategory: errorEntry.category,
        occurrences: patternCount,
        pattern
      });
    }
  }

  /**
   * Handle critical errors that require immediate attention
   */
  handleCriticalError(errorEntry) {
    this.logger.error('CRITICAL ERROR DETECTED:', errorEntry);
    
    // Show immediate user notification
    this.showCriticalErrorNotification(errorEntry);
    
    // Attempt automatic recovery if possible
    this.attemptErrorRecovery(errorEntry);
    
    // Force error report for critical errors
    if (this.reportingConfig.enabled) {
      setTimeout(() => this.sendErrorReport(true), 1000);
    }
  }

  /**
   * Attempt automatic error recovery
   */
  attemptErrorRecovery(errorEntry) {
    switch (errorEntry.category) {
      case 'wasm':
        // Delegate to game error handler
        if (gameErrorHandler) {
          gameErrorHandler.handleWasmError(
            errorEntry.context.function || 'unknown',
            new Error(errorEntry.message),
            errorEntry.context
          );
        }
        break;
        
      case 'network':
        // Delegate to network error recovery
        if (networkErrorRecovery) {
          networkErrorRecovery.handleConnectionDrop(
            new Error(errorEntry.message),
            errorEntry.context
          );
        }
        break;
        
      case 'memory':
        // Attempt garbage collection
        this.attemptMemoryRecovery();
        break;
        
      default:
        this.logger.warn('No automatic recovery available for category:', errorEntry.category);
    }
  }

  /**
   * Attempt memory recovery
   */
  attemptMemoryRecovery() {
    try {
      // Force garbage collection if available
      if (typeof gc === 'function') {
        gc();
        this.logger.log('Forced garbage collection');
      }
      
      // Clear caches and temporary data
      this.clearTemporaryData();
      
    } catch (error) {
      this.logger.error('Memory recovery failed:', error);
    }
  }

  /**
   * Clear temporary data to free memory
   */
  clearTemporaryData() {
    // Clear old errors (keep only recent ones)
    if (this.errorCollection.errors.length > 100) {
      this.errorCollection.errors = this.errorCollection.errors.slice(-100);
    }
    
    // Clear old patterns
    for (const [pattern, count] of this.errorCollection.patterns) {
      if (count < 2) { // Remove patterns that only occurred once
        this.errorCollection.patterns.delete(pattern);
      }
    }
    
    this.logger.log('Temporary data cleared for memory recovery');
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (typeof performance !== 'undefined' && performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        const memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: performance.now()
        };
        
        // Check for memory issues
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          this.reportError('memory', new Error('High memory usage detected'), {
            usage: memoryUsage,
            usagePercent: usagePercent.toFixed(1)
          });
        }
        
        this.systemDiagnostics.memory = memoryUsage;
      }, 10000); // Every 10 seconds
    }
  }

  /**
   * Update system diagnostics
   */
  updateSystemDiagnostics() {
    this.systemDiagnostics.lastUpdate = performance.now();
    
    // Browser info
    this.systemDiagnostics.browser = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency
    };
    
    // Performance info
    if (typeof performance !== 'undefined' && performance.timing) {
      this.systemDiagnostics.performance = {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    }
    
    // Network info
    if (networkErrorRecovery) {
      this.systemDiagnostics.network = networkErrorRecovery.getNetworkStatus();
    }
    
    // WASM info (would need to be provided by WASM manager)
    if (typeof globalThis !== 'undefined' && globalThis.wasmExports) {
      this.systemDiagnostics.wasm = {
        loaded: true,
        exportCount: Object.keys(globalThis.wasmExports).length
      };
    }
  }

  /**
   * Check if we should automatically report errors
   */
  shouldAutoReport() {
    if (!this.reportingConfig.autoReport || !this.reportingConfig.enabled) {
      return false;
    }
    
    const now = performance.now();
    const timeSinceLastReport = now - this.reportingConfig.lastReport;
    
    // Report if we have enough errors or enough time has passed
    return (
      this.errorCollection.errors.length >= this.reportingConfig.reportThreshold ||
      timeSinceLastReport >= this.reportingConfig.reportInterval
    );
  }

  /**
   * Send error report
   */
  async sendErrorReport(forceSend = false) {
    if (!this.reportingConfig.enabled && !forceSend) {
      return;
    }
    
    try {
      const report = this.generateErrorReport();
      
      if (this.reportingConfig.reportEndpoint) {
        // Send to configured endpoint
        await fetch(this.reportingConfig.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
        
        this.logger.log('Error report sent successfully');
      } else {
        // Log report locally
        console.group('🚨 Error Report');
        console.log(report);
        console.groupEnd();
      }
      
      this.reportingConfig.lastReport = performance.now();
      
    } catch (error) {
      this.logger.error('Failed to send error report:', error);
    }
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport() {
    const report = {
      timestamp: new Date().toISOString(),
      reportId: this.generateErrorId(),
      
      // Error summary
      errorSummary: {
        totalErrors: this.errorCollection.errors.length,
        criticalErrors: this.errorCollection.criticalErrors.length,
        recentErrors: this.errorCollection.recentErrors.length,
        categories: Object.fromEntries(this.errorCollection.categories),
        patterns: Object.fromEntries(this.errorCollection.patterns)
      },
      
      // Recent errors (last 20)
      recentErrors: this.errorCollection.recentErrors.slice(-20),
      
      // Critical errors (all)
      criticalErrors: this.errorCollection.criticalErrors,
      
      // System diagnostics
      systemDiagnostics: { ...this.systemDiagnostics },
      
      // Component status
      componentStatus: {
        gameErrorHandler: gameErrorHandler ? gameErrorHandler.getErrorStats() : null,
        networkErrorRecovery: networkErrorRecovery ? networkErrorRecovery.getNetworkStatus() : null,
        browserAPIFallbacks: browserAPIFallbacks ? browserAPIFallbacks.getAPIReport() : null,
        inputValidator: inputValidator ? inputValidator.getValidationStats() : null
      },
      
      // Browser capabilities
      browserCapabilities: this.getBrowserCapabilities(),
      
      // Performance metrics
      performanceMetrics: this.getPerformanceMetrics()
    };
    
    return report;
  }

  /**
   * Get browser capabilities
   */
  getBrowserCapabilities() {
    return {
      webAssembly: typeof WebAssembly !== 'undefined',
      webGL: !!document.createElement('canvas').getContext('webgl'),
      webAudio: !!(window.AudioContext || window.webkitAudioContext),
      webRTC: !!window.RTCPeerConnection,
      gamepad: !!navigator.getGamepads,
      fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
      pointerLock: !!(document.pointerLockElement !== undefined),
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      webWorker: typeof Worker !== 'undefined'
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    if (typeof performance !== 'undefined') {
      // Navigation timing
      if (performance.timing) {
        metrics.navigation = {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          domComplete: performance.timing.domComplete - performance.timing.navigationStart
        };
      }
      
      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      metrics.paint = {};
      paintEntries.forEach(entry => {
        metrics.paint[entry.name] = entry.startTime;
      });
      
      // Memory (if available)
      if (performance.memory) {
        metrics.memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
    }
    
    return metrics;
  }

  /**
   * Show critical error notification
   */
  showCriticalErrorNotification(errorEntry) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 20px 24px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 10002;
      max-width: 500px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
    `;
    
    notification.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
      <div style="font-weight: 600; font-size: 18px; margin-bottom: 12px;">Critical Error Detected</div>
      <div style="margin-bottom: 16px; line-height: 1.4; font-size: 14px;">
        ${errorEntry.message}
      </div>
      <div style="font-size: 12px; opacity: 0.8; margin-bottom: 16px;">
        Error ID: ${errorEntry.id}
      </div>
      <div>
        <button onclick="location.reload()" style="
          background: white;
          color: #dc3545;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          margin-right: 8px;
        ">Reload Game</button>
        <button onclick="gameDebug.showErrorUI()" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 8px;
        ">Debug Info</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.1);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Dismiss</button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Show error report UI
   */
  showErrorReportUI() {
    const report = this.generateErrorReport();
    
    const ui = document.createElement('div');
    ui.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      background: #2c3e50;
      color: white;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 10003;
      font-family: monospace;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    ui.innerHTML = `
      <div style="padding: 16px; background: #34495e; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0;">🔧 Error Report & Debug Tools</h3>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Close</button>
      </div>
      <div style="flex: 1; overflow: auto; padding: 16px;">
        <div style="margin-bottom: 16px;">
          <h4>Error Summary</h4>
          <p>Total Errors: ${report.errorSummary.totalErrors}</p>
          <p>Critical Errors: ${report.errorSummary.criticalErrors}</p>
          <p>Recent Errors: ${report.errorSummary.recentErrors}</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <h4>Error Categories</h4>
          <pre>${JSON.stringify(report.errorSummary.categories, null, 2)}</pre>
        </div>
        
        <div style="margin-bottom: 16px;">
          <h4>Recent Errors</h4>
          <div style="max-height: 200px; overflow: auto; background: #1a1a1a; padding: 8px; border-radius: 4px;">
            <pre>${JSON.stringify(report.recentErrors, null, 2)}</pre>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <h4>System Diagnostics</h4>
          <div style="max-height: 200px; overflow: auto; background: #1a1a1a; padding: 8px; border-radius: 4px;">
            <pre>${JSON.stringify(report.systemDiagnostics, null, 2)}</pre>
          </div>
        </div>
      </div>
      <div style="padding: 16px; background: #34495e; display: flex; gap: 8px;">
        <button onclick="gameDebug.exportErrors()" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Export Log</button>
        <button onclick="gameDebug.clearErrors()" style="
          background: #f39c12;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Clear Errors</button>
        <button onclick="console.log(gameDebug.errorReport())" style="
          background: #2ecc71;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
        ">Log to Console</button>
      </div>
    `;
    
    document.body.appendChild(ui);
  }

  /**
   * Export error log as downloadable file
   */
  exportErrorLog() {
    const report = this.generateErrorReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.logger.log('Error log exported');
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const stats = {
      totalErrors: this.errorCollection.errors.length,
      categories: Object.fromEntries(this.errorCollection.categories),
      patterns: Object.fromEntries(this.errorCollection.patterns),
      criticalErrors: this.errorCollection.criticalErrors.length,
      recentErrors: this.errorCollection.recentErrors.length,
      severityBreakdown: {}
    };
    
    // Calculate severity breakdown
    for (const error of this.errorCollection.errors) {
      stats.severityBreakdown[error.severity] = (stats.severityBreakdown[error.severity] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errorCollection.errors = [];
    this.errorCollection.categories.clear();
    this.errorCollection.patterns.clear();
    this.errorCollection.criticalErrors = [];
    this.errorCollection.recentErrors = [];
    
    this.logger.log('All errors cleared');
    this.updateDebugUI();
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled) {
    this.debugTools.debugMode = enabled;
    this.debugTools.verboseLogging = enabled;
    
    if (enabled) {
      this.logger.log('Debug mode enabled');
    } else {
      this.logger.log('Debug mode disabled');
    }
  }

  /**
   * Update debug UI if visible
   */
  updateDebugUI() {
    // This would update any visible debug UI elements
    // Implementation depends on specific UI framework used
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system diagnostics
   */
  getSystemDiagnostics() {
    this.updateSystemDiagnostics();
    return { ...this.systemDiagnostics };
  }
}

// Create global instance
export const errorReporter = new ErrorReporter();
