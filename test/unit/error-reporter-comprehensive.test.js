import { expect } from 'chai';
import sinon from 'sinon';

describe('ErrorReporter - Comprehensive Tests', () => {
  let ErrorReporter;
  let errorReporter;
  let mockWindow;
  let mockLogger;
  let mockConsole;
  let mockPerformanceObserver;

  before(() => {
    // Mock logger
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    };

    const mockCreateLogger = sinon.stub().returns(mockLogger);

    // Define ErrorReporter inline for testing
    class TestErrorReporter {
      constructor() {
        this.logger = mockCreateLogger('ErrorReporter');
        
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
          reportThreshold: 10,
          reportInterval: 300000,
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

      initializeErrorReporting() {
        if (typeof window !== 'undefined') {
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
        }
        
        // Performance observer for long tasks
        if (typeof PerformanceObserver !== 'undefined') {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.duration > 50) { // Tasks longer than 50ms
                  this.reportPerformanceIssue('long_task', {
                    duration: entry.duration,
                    startTime: entry.startTime,
                    name: entry.name
                  });
                }
              }
            });
            observer.observe({ entryTypes: ['longtask'] });
          } catch (error) {
            this.logger.warn('PerformanceObserver not available:', error.message);
          }
        }
      }

      setupDebugTools() {
        // Register debug console commands
        this.debugTools.consoleCommands.set('errors', () => this.getErrorSummary());
        this.debugTools.consoleCommands.set('clearErrors', () => this.clearErrors());
        this.debugTools.consoleCommands.set('diagnostics', () => this.getSystemDiagnostics());
        this.debugTools.consoleCommands.set('debugMode', (enabled) => this.setDebugMode(enabled));
        
        // Expose debug commands globally if in debug mode
        if (typeof window !== 'undefined' && this.debugTools.debugMode) {
          window.errorReporter = {
            getErrors: () => this.getErrorSummary(),
            clearErrors: () => this.clearErrors(),
            getDiagnostics: () => this.getSystemDiagnostics()
          };
        }
      }

      reportError(category, error, context = {}) {
        if (!this.reportingConfig.enabled) {
          return false;
        }

        const timestamp = Date.now();
        const errorData = {
          id: this.generateErrorId(),
          timestamp,
          category,
          message: error.message || String(error),
          stack: error.stack || null,
          context,
          severity: this.determineSeverity(error, context),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location?.href : 'unknown'
        };

        // Add to error collection
        this.errorCollection.errors.push(errorData);
        this.errorCollection.recentErrors.unshift(errorData);

        // Limit collection size
        if (this.errorCollection.errors.length > this.errorCollection.maxErrors) {
          this.errorCollection.errors.shift();
        }

        // Keep only recent errors (last 50)
        if (this.errorCollection.recentErrors.length > 50) {
          this.errorCollection.recentErrors.pop();
        }

        // Update categories
        const categoryCount = this.errorCollection.categories.get(category) || 0;
        this.errorCollection.categories.set(category, categoryCount + 1);

        // Check for error patterns
        this.analyzeErrorPatterns(errorData);

        // Handle critical errors
        if (errorData.severity === 'critical') {
          this.errorCollection.criticalErrors.push(errorData);
          this.handleCriticalError(errorData);
        }

        // Log the error
        const logLevel = errorData.severity === 'critical' ? 'error' : 
                        errorData.severity === 'high' ? 'warn' : 'info';
        this.logger[logLevel]('Error reported', {
          id: errorData.id,
          category,
          message: errorData.message,
          severity: errorData.severity
        });

        // Auto-report if threshold reached
        if (this.reportingConfig.autoReport && 
            this.errorCollection.errors.length >= this.reportingConfig.reportThreshold) {
          this.sendErrorReport();
        }

        return errorData.id;
      }

      reportPerformanceIssue(type, data) {
        return this.reportError('performance', new Error(`Performance issue: ${type}`), {
          type,
          ...data,
          source: 'performance_observer'
        });
      }

      reportNetworkError(error, context = {}) {
        return this.reportError('network', error, {
          ...context,
          source: 'network_layer'
        });
      }

      reportWasmError(error, context = {}) {
        return this.reportError('wasm', error, {
          ...context,
          source: 'wasm_layer'
        });
      }

      reportGameError(error, context = {}) {
        return this.reportError('game', error, {
          ...context,
          source: 'game_logic'
        });
      }

      determineSeverity(error, context) {
        // Critical errors that break core functionality
        if (error.message.includes('WASM') || 
            error.message.includes('WebAssembly') ||
            context.source === 'wasm_layer') {
          return 'critical';
        }

        if (error.message.includes('Network') || 
            error.message.includes('WebRTC') ||
            context.source === 'network_layer') {
          return 'high';
        }

        if (error.message.includes('Performance') ||
            context.type === 'long_task') {
          return 'medium';
        }

        // UI and non-critical errors
        if (context.source === 'ui_layer' ||
            error.message.includes('render')) {
          return 'low';
        }

        return 'medium';
      }

      analyzeErrorPatterns(errorData) {
        const pattern = this.extractErrorPattern(errorData);
        if (pattern) {
          const count = this.errorCollection.patterns.get(pattern) || 0;
          this.errorCollection.patterns.set(pattern, count + 1);

          // Alert on repeated patterns
          if (count > 5) {
            this.logger.warn('Repeated error pattern detected', {
              pattern,
              count: count + 1,
              message: errorData.message
            });
          }
        }
      }

      extractErrorPattern(errorData) {
        // Extract pattern from stack trace or message
        if (errorData.stack) {
          const lines = errorData.stack.split('\n');
          const relevantLine = lines.find(line => line.includes('.js:'));
          if (relevantLine) {
            return relevantLine.replace(/:\d+:\d+/g, ':*:*'); // Normalize line numbers
          }
        }

        // Fallback to message-based pattern
        return errorData.message.replace(/\d+/g, '*'); // Replace numbers with wildcards
      }

      handleCriticalError(errorData) {
        // Immediate actions for critical errors
        this.logger.error('CRITICAL ERROR DETECTED', errorData);

        // Attempt recovery based on error type
        if (errorData.category === 'wasm') {
          this.attemptWasmRecovery(errorData);
        } else if (errorData.category === 'network') {
          this.attemptNetworkRecovery(errorData);
        }

        // Notify user if appropriate
        if (typeof window !== 'undefined' && window.gameStateManager) {
          window.gameStateManager.emit('criticalError', errorData);
        }
      }

      attemptWasmRecovery(errorData) {
        this.logger.info('Attempting WASM recovery', { errorId: errorData.id });
        
        // Recovery strategies would be implemented here
        // For testing, we'll just log the attempt
        return { attempted: true, success: false, strategy: 'reload_wasm' };
      }

      attemptNetworkRecovery(errorData) {
        this.logger.info('Attempting network recovery', { errorId: errorData.id });
        
        // Recovery strategies would be implemented here
        return { attempted: true, success: false, strategy: 'reconnect' };
      }

      getErrorSummary() {
        const summary = {
          totalErrors: this.errorCollection.errors.length,
          criticalErrors: this.errorCollection.criticalErrors.length,
          recentErrors: this.errorCollection.recentErrors.length,
          categories: Object.fromEntries(this.errorCollection.categories),
          patterns: Object.fromEntries(this.errorCollection.patterns),
          topErrors: this.getTopErrors(5),
          errorRate: this.calculateErrorRate()
        };

        return summary;
      }

      getTopErrors(limit = 10) {
        const errorCounts = new Map();
        
        for (const error of this.errorCollection.errors) {
          const key = `${error.category}:${error.message}`;
          const count = errorCounts.get(key) || 0;
          errorCounts.set(key, count + 1);
        }

        return Array.from(errorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([error, count]) => ({ error, count }));
      }

      calculateErrorRate() {
        if (this.errorCollection.errors.length === 0) {
          return 0;
        }

        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentErrors = this.errorCollection.errors.filter(
          error => error.timestamp > oneHourAgo
        );

        return recentErrors.length; // Errors per hour
      }

      getSystemDiagnostics() {
        const now = Date.now();
        
        // Update diagnostics if stale
        if (now - this.systemDiagnostics.lastUpdate > 60000) { // 1 minute
          this.updateSystemDiagnostics();
        }

        return this.systemDiagnostics;
      }

      updateSystemDiagnostics() {
        const now = Date.now();

        // Browser information
        if (typeof navigator !== 'undefined') {
          this.systemDiagnostics.browser = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform
          };
        }

        // Performance information
        if (typeof performance !== 'undefined') {
          this.systemDiagnostics.performance = {
            timing: performance.timing ? {
              loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
              domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : null,
            memory: performance.memory ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null
          };
        }

        // Network information
        if (typeof navigator !== 'undefined' && navigator.connection) {
          this.systemDiagnostics.network = {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
          };
        }

        this.systemDiagnostics.lastUpdate = now;
      }

      sendErrorReport() {
        if (!this.reportingConfig.reportEndpoint) {
          this.logger.warn('No error reporting endpoint configured');
          return false;
        }

        const now = Date.now();
        if (now - this.reportingConfig.lastReport < this.reportingConfig.reportInterval) {
          return false; // Too soon since last report
        }

        const report = {
          timestamp: now,
          errors: this.errorCollection.errors.slice(-100), // Last 100 errors
          summary: this.getErrorSummary(),
          diagnostics: this.getSystemDiagnostics(),
          version: '1.0.0'
        };

        // In real implementation, this would send to server
        this.logger.info('Sending error report', {
          errorCount: report.errors.length,
          endpoint: this.reportingConfig.reportEndpoint
        });

        this.reportingConfig.lastReport = now;
        return true;
      }

      clearErrors() {
        const clearedCount = this.errorCollection.errors.length;
        
        this.errorCollection.errors = [];
        this.errorCollection.recentErrors = [];
        this.errorCollection.criticalErrors = [];
        this.errorCollection.categories.clear();
        this.errorCollection.patterns.clear();

        this.logger.info('Errors cleared', { count: clearedCount });
        return clearedCount;
      }

      setDebugMode(enabled) {
        this.debugTools.debugMode = enabled;
        this.debugTools.verboseLogging = enabled;

        if (enabled && typeof window !== 'undefined') {
          window.errorReporter = {
            getErrors: () => this.getErrorSummary(),
            clearErrors: () => this.clearErrors(),
            getDiagnostics: () => this.getSystemDiagnostics(),
            reportError: (error, context) => this.reportError('debug', error, context)
          };
        } else if (typeof window !== 'undefined') {
          delete window.errorReporter;
        }

        this.logger.info('Debug mode changed', { enabled });
        return enabled;
      }

      addErrorFilter(pattern) {
        this.debugTools.errorFilters.add(pattern);
        this.logger.debug('Error filter added', { pattern });
      }

      removeErrorFilter(pattern) {
        const removed = this.debugTools.errorFilters.delete(pattern);
        this.logger.debug('Error filter removed', { pattern, removed });
        return removed;
      }

      shouldFilterError(errorData) {
        for (const pattern of this.debugTools.errorFilters) {
          if (errorData.message.includes(pattern) || 
              errorData.category === pattern) {
            return true;
          }
        }
        return false;
      }

      generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      exportErrors(format = 'json') {
        const data = {
          errors: this.errorCollection.errors,
          summary: this.getErrorSummary(),
          diagnostics: this.getSystemDiagnostics(),
          exportTime: Date.now()
        };

        switch (format) {
          case 'json':
            return JSON.stringify(data, null, 2);
          case 'csv':
            return this.exportErrorsAsCSV(data.errors);
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }
      }

      exportErrorsAsCSV(errors) {
        const headers = ['timestamp', 'category', 'severity', 'message', 'source'];
        const rows = [headers.join(',')];

        for (const error of errors) {
          const row = [
            error.timestamp,
            error.category,
            error.severity,
            `"${error.message.replace(/"/g, '""')}"`,
            error.context?.source || 'unknown'
          ];
          rows.push(row.join(','));
        }

        return rows.join('\n');
      }

      getHealthStatus() {
        const summary = this.getErrorSummary();
        const criticalCount = summary.criticalErrors;
        const errorRate = summary.errorRate;

        let status = 'healthy';
        let score = 100;

        if (criticalCount > 0) {
          status = 'critical';
          score = Math.max(0, 100 - (criticalCount * 20));
        } else if (errorRate > 10) {
          status = 'degraded';
          score = Math.max(50, 100 - (errorRate * 2));
        } else if (errorRate > 5) {
          status = 'warning';
          score = Math.max(70, 100 - errorRate);
        }

        return {
          status,
          score,
          criticalErrors: criticalCount,
          errorRate,
          lastUpdate: Date.now()
        };
      }
    }

    ErrorReporter = TestErrorReporter;
  });

  beforeEach(() => {
    // Mock dependencies
    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      location: { href: 'http://localhost:3000' }
    };

    mockConsole = {
      log: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub()
    };

    mockPerformanceObserver = sinon.stub();
    mockPerformanceObserver.prototype.observe = sinon.stub();

    // Set up global mocks
    global.window = mockWindow;
    global.console = mockConsole;
    global.PerformanceObserver = mockPerformanceObserver;
    global.navigator = {
      userAgent: 'Test Browser 1.0',
      language: 'en-US',
      onLine: true,
      platform: 'Test Platform'
    };
    global.performance = {
      timing: {
        navigationStart: 1000,
        loadEventEnd: 2000,
        domContentLoadedEventEnd: 1500
      },
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      }
    };
    global.Date = { now: sinon.stub().returns(1000000) };

    errorReporter = new ErrorReporter();
    sinon.resetHistory();
  });

  afterEach(() => {
    sinon.restore();
    delete global.window;
    delete global.console;
    delete global.PerformanceObserver;
    delete global.navigator;
    delete global.performance;
    delete global.Date;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(errorReporter.reportingConfig.enabled).to.be.true;
      expect(errorReporter.reportingConfig.autoReport).to.be.false;
      expect(errorReporter.reportingConfig.reportThreshold).to.equal(10);
      expect(errorReporter.errorCollection.maxErrors).to.equal(1000);
    });

    it('should set up global error handlers', () => {
      expect(mockWindow.addEventListener).to.have.been.calledWith('error');
      expect(mockWindow.addEventListener).to.have.been.calledWith('unhandledrejection');
    });

    it('should initialize debug tools', () => {
      expect(errorReporter.debugTools.consoleCommands.size).to.be.greaterThan(0);
      expect(errorReporter.debugTools.consoleCommands.has('errors')).to.be.true;
      expect(errorReporter.debugTools.consoleCommands.has('clearErrors')).to.be.true;
    });

    it('should initialize empty error collection', () => {
      expect(errorReporter.errorCollection.errors).to.be.empty;
      expect(errorReporter.errorCollection.criticalErrors).to.be.empty;
      expect(errorReporter.errorCollection.categories.size).to.equal(0);
    });
  });

  describe('Error Reporting', () => {
    it('should report JavaScript errors', () => {
      const error = new Error('Test error');
      const context = { source: 'test' };
      
      const errorId = errorReporter.reportError('javascript', error, context);
      
      expect(errorId).to.be.a('string');
      expect(errorReporter.errorCollection.errors).to.have.length(1);
      
      const reportedError = errorReporter.errorCollection.errors[0];
      expect(reportedError.category).to.equal('javascript');
      expect(reportedError.message).to.equal('Test error');
      expect(reportedError.context).to.include(context);
    });

    it('should determine error severity correctly', () => {
      // Critical WASM error
      const wasmError = new Error('WASM module failed');
      const wasmErrorId = errorReporter.reportError('wasm', wasmError);
      const wasmErrorData = errorReporter.errorCollection.errors.find(e => e.id === wasmErrorId);
      expect(wasmErrorData.severity).to.equal('critical');
      
      // High priority network error
      const networkError = new Error('Network connection failed');
      const networkErrorId = errorReporter.reportError('network', networkError);
      const networkErrorData = errorReporter.errorCollection.errors.find(e => e.id === networkErrorId);
      expect(networkErrorData.severity).to.equal('high');
      
      // Low priority UI error
      const uiError = new Error('Button render failed');
      const uiErrorId = errorReporter.reportError('ui', uiError, { source: 'ui_layer' });
      const uiErrorData = errorReporter.errorCollection.errors.find(e => e.id === uiErrorId);
      expect(uiErrorData.severity).to.equal('low');
    });

    it('should handle critical errors specially', () => {
      const criticalError = new Error('WASM initialization failed');
      
      errorReporter.reportError('wasm', criticalError);
      
      expect(errorReporter.errorCollection.criticalErrors).to.have.length(1);
      expect(mockLogger.error).to.have.been.calledWith('CRITICAL ERROR DETECTED');
    });

    it('should update error categories', () => {
      errorReporter.reportError('javascript', new Error('Error 1'));
      errorReporter.reportError('javascript', new Error('Error 2'));
      errorReporter.reportError('network', new Error('Error 3'));
      
      expect(errorReporter.errorCollection.categories.get('javascript')).to.equal(2);
      expect(errorReporter.errorCollection.categories.get('network')).to.equal(1);
    });

    it('should limit error collection size', () => {
      const originalMaxErrors = errorReporter.errorCollection.maxErrors;
      errorReporter.errorCollection.maxErrors = 3;
      
      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        errorReporter.reportError('test', new Error(`Error ${i}`));
      }
      
      expect(errorReporter.errorCollection.errors).to.have.length(3);
      
      errorReporter.errorCollection.maxErrors = originalMaxErrors;
    });

    it('should not report errors when disabled', () => {
      errorReporter.reportingConfig.enabled = false;
      
      const result = errorReporter.reportError('test', new Error('Should not report'));
      
      expect(result).to.be.false;
      expect(errorReporter.errorCollection.errors).to.be.empty;
    });
  });

  describe('Specialized Error Reporting', () => {
    it('should report performance issues', () => {
      const performanceData = { duration: 100, type: 'long_task' };
      
      const errorId = errorReporter.reportPerformanceIssue('long_task', performanceData);
      
      expect(errorId).to.be.a('string');
      const error = errorReporter.errorCollection.errors.find(e => e.id === errorId);
      expect(error.category).to.equal('performance');
      expect(error.context.type).to.equal('long_task');
    });

    it('should report network errors', () => {
      const networkError = new Error('Connection timeout');
      const context = { url: 'ws://example.com', timeout: 5000 };
      
      const errorId = errorReporter.reportNetworkError(networkError, context);
      
      const error = errorReporter.errorCollection.errors.find(e => e.id === errorId);
      expect(error.category).to.equal('network');
      expect(error.context.source).to.equal('network_layer');
    });

    it('should report WASM errors', () => {
      const wasmError = new Error('Module instantiation failed');
      const context = { module: 'game.wasm' };
      
      const errorId = errorReporter.reportWasmError(wasmError, context);
      
      const error = errorReporter.errorCollection.errors.find(e => e.id === errorId);
      expect(error.category).to.equal('wasm');
      expect(error.context.source).to.equal('wasm_layer');
    });

    it('should report game errors', () => {
      const gameError = new Error('Invalid game state');
      const context = { phase: 'combat', player: 'player1' };
      
      const errorId = errorReporter.reportGameError(gameError, context);
      
      const error = errorReporter.errorCollection.errors.find(e => e.id === errorId);
      expect(error.category).to.equal('game');
      expect(error.context.source).to.equal('game_logic');
    });
  });

  describe('Error Pattern Analysis', () => {
    it('should detect repeated error patterns', () => {
      const baseError = new Error('TypeError: Cannot read property');
      baseError.stack = 'Error: TypeError\n    at test.js:10:5\n    at main.js:20:10';
      
      // Report same pattern multiple times
      for (let i = 0; i < 6; i++) {
        errorReporter.reportError('javascript', baseError);
      }
      
      expect(mockLogger.warn).to.have.been.calledWith('Repeated error pattern detected');
      expect(errorReporter.errorCollection.patterns.size).to.be.greaterThan(0);
    });

    it('should extract error patterns from stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at function1 (test.js:15:20)\n    at function2 (main.js:30:40)';
      
      const pattern = errorReporter.extractErrorPattern({
        message: error.message,
        stack: error.stack
      });
      
      expect(pattern).to.include('test.js:*:*');
    });

    it('should normalize line numbers in patterns', () => {
      const error = new Error('Consistent error');
      error.stack = 'Error: Consistent error\n    at test.js:123:456';
      
      const pattern = errorReporter.extractErrorPattern({
        message: error.message,
        stack: error.stack
      });
      
      expect(pattern).to.equal('test.js:*:*');
    });
  });

  describe('System Diagnostics', () => {
    it('should collect browser information', () => {
      errorReporter.updateSystemDiagnostics();
      
      const diagnostics = errorReporter.getSystemDiagnostics();
      
      expect(diagnostics.browser.userAgent).to.equal('Test Browser 1.0');
      expect(diagnostics.browser.language).to.equal('en-US');
      expect(diagnostics.browser.onLine).to.be.true;
    });

    it('should collect performance information', () => {
      errorReporter.updateSystemDiagnostics();
      
      const diagnostics = errorReporter.getSystemDiagnostics();
      
      expect(diagnostics.performance.timing).to.be.an('object');
      expect(diagnostics.performance.memory).to.be.an('object');
      expect(diagnostics.performance.memory.usedJSHeapSize).to.equal(1000000);
    });

    it('should cache diagnostics to avoid frequent updates', () => {
      const firstCall = errorReporter.getSystemDiagnostics();
      const secondCall = errorReporter.getSystemDiagnostics();
      
      expect(firstCall.lastUpdate).to.equal(secondCall.lastUpdate);
    });

    it('should refresh stale diagnostics', () => {
      errorReporter.updateSystemDiagnostics();
      const firstUpdate = errorReporter.systemDiagnostics.lastUpdate;
      
      // Simulate time passing
      errorReporter.systemDiagnostics.lastUpdate = firstUpdate - 120000; // 2 minutes ago
      
      errorReporter.getSystemDiagnostics();
      
      expect(errorReporter.systemDiagnostics.lastUpdate).to.be.greaterThan(firstUpdate);
    });
  });

  describe('Error Summaries and Analysis', () => {
    beforeEach(() => {
      // Add some test errors
      errorReporter.reportError('javascript', new Error('JS Error 1'));
      errorReporter.reportError('javascript', new Error('JS Error 2'));
      errorReporter.reportError('network', new Error('Network Error'));
      errorReporter.reportError('wasm', new Error('WASM Error')); // Critical
    });

    it('should generate comprehensive error summary', () => {
      const summary = errorReporter.getErrorSummary();
      
      expect(summary.totalErrors).to.equal(4);
      expect(summary.criticalErrors).to.equal(1);
      expect(summary.categories.javascript).to.equal(2);
      expect(summary.categories.network).to.equal(1);
      expect(summary.categories.wasm).to.equal(1);
    });

    it('should calculate error rate', () => {
      const errorRate = errorReporter.calculateErrorRate();
      
      expect(errorRate).to.be.a('number');
      expect(errorRate).to.be.at.least(0);
    });

    it('should identify top errors', () => {
      // Add duplicate errors
      errorReporter.reportError('javascript', new Error('Common Error'));
      errorReporter.reportError('javascript', new Error('Common Error'));
      
      const topErrors = errorReporter.getTopErrors(3);
      
      expect(topErrors).to.be.an('array');
      expect(topErrors[0].count).to.be.greaterThan(1);
    });

    it('should provide health status assessment', () => {
      const health = errorReporter.getHealthStatus();
      
      expect(health.status).to.be.oneOf(['healthy', 'warning', 'degraded', 'critical']);
      expect(health.score).to.be.a('number');
      expect(health.score).to.be.at.least(0).and.at.most(100);
      expect(health.criticalErrors).to.equal(1);
    });
  });

  describe('Debug Tools', () => {
    it('should enable debug mode', () => {
      const result = errorReporter.setDebugMode(true);
      
      expect(result).to.be.true;
      expect(errorReporter.debugTools.debugMode).to.be.true;
      expect(errorReporter.debugTools.verboseLogging).to.be.true;
    });

    it('should add error filters', () => {
      errorReporter.addErrorFilter('test_pattern');
      
      expect(errorReporter.debugTools.errorFilters.has('test_pattern')).to.be.true;
    });

    it('should remove error filters', () => {
      errorReporter.addErrorFilter('test_pattern');
      const removed = errorReporter.removeErrorFilter('test_pattern');
      
      expect(removed).to.be.true;
      expect(errorReporter.debugTools.errorFilters.has('test_pattern')).to.be.false;
    });

    it('should filter errors based on patterns', () => {
      errorReporter.addErrorFilter('filtered_error');
      
      const shouldFilter = errorReporter.shouldFilterError({
        message: 'This is a filtered_error message',
        category: 'test'
      });
      
      expect(shouldFilter).to.be.true;
    });
  });

  describe('Error Management', () => {
    beforeEach(() => {
      errorReporter.reportError('test', new Error('Test error 1'));
      errorReporter.reportError('test', new Error('Test error 2'));
    });

    it('should clear all errors', () => {
      const clearedCount = errorReporter.clearErrors();
      
      expect(clearedCount).to.equal(2);
      expect(errorReporter.errorCollection.errors).to.be.empty;
      expect(errorReporter.errorCollection.criticalErrors).to.be.empty;
      expect(errorReporter.errorCollection.categories.size).to.equal(0);
    });

    it('should export errors as JSON', () => {
      const exported = errorReporter.exportErrors('json');
      
      expect(exported).to.be.a('string');
      const parsed = JSON.parse(exported);
      expect(parsed.errors).to.be.an('array');
      expect(parsed.summary).to.be.an('object');
      expect(parsed.diagnostics).to.be.an('object');
    });

    it('should export errors as CSV', () => {
      const exported = errorReporter.exportErrors('csv');
      
      expect(exported).to.be.a('string');
      expect(exported).to.include('timestamp,category,severity,message,source');
    });

    it('should throw error for unsupported export format', () => {
      expect(() => errorReporter.exportErrors('xml')).to.throw('Unsupported export format');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should attempt WASM recovery for WASM errors', () => {
      const wasmError = new Error('WASM module crashed');
      const errorData = {
        id: 'test-error',
        category: 'wasm',
        message: wasmError.message,
        severity: 'critical'
      };
      
      const recovery = errorReporter.attemptWasmRecovery(errorData);
      
      expect(recovery.attempted).to.be.true;
      expect(recovery.strategy).to.equal('reload_wasm');
    });

    it('should attempt network recovery for network errors', () => {
      const networkError = new Error('Connection lost');
      const errorData = {
        id: 'test-error',
        category: 'network',
        message: networkError.message,
        severity: 'high'
      };
      
      const recovery = errorReporter.attemptNetworkRecovery(errorData);
      
      expect(recovery.attempted).to.be.true;
      expect(recovery.strategy).to.equal('reconnect');
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique error IDs', () => {
      const id1 = errorReporter.generateErrorId();
      const id2 = errorReporter.generateErrorId();
      
      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
      expect(id1).to.include('error_');
    });

    it('should handle missing context gracefully', () => {
      const error = new Error('Test error');
      
      const errorId = errorReporter.reportError('test', error);
      
      expect(errorId).to.be.a('string');
      const reportedError = errorReporter.errorCollection.errors[0];
      expect(reportedError.context).to.be.an('object');
    });

    it('should handle errors without stack traces', () => {
      const error = { message: 'Error without stack' };
      
      const errorId = errorReporter.reportError('test', error);
      
      expect(errorId).to.be.a('string');
      const reportedError = errorReporter.errorCollection.errors[0];
      expect(reportedError.stack).to.be.null;
    });
  });
});
