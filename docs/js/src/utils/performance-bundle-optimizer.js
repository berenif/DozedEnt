/**
 * Bundle Size and Dead Code Optimization System
 * Identifies and removes unused code, optimizes imports, and reduces bundle size
 */

export class BundleOptimizer {
  constructor() {
    this.unusedImports = new Set();
    this.deadCode = new Set();
    this.consoleStatements = new Set();
    this.optimizationStats = {
      totalFiles: 0,
      unusedImports: 0,
      deadCodeBlocks: 0,
      consoleStatementsRemoved: 0,
      bytesRemoved: 0
    };
    
    this.config = {
      removeConsoleInProduction: true,
      removeDebugCode: true,
      optimizeImports: true,
      enableTreeShaking: true,
      minifyOutput: true
    };
  }

  /**
   * Analyze bundle for optimization opportunities
   * @param {string[]} filePaths - Array of file paths to analyze
   * @returns {Object} Analysis results
   */
  async analyzeBundleSize(filePaths) {
    const analysis = {
      largestFiles: [],
      unusedImports: [],
      deadCodeBlocks: [],
      optimizationOpportunities: []
    };

    for (const filePath of filePaths) {
      try {
        const content = await this.readFile(filePath);
        const fileStats = await this.analyzeFile(filePath, content);
        
        analysis.largestFiles.push({
          path: filePath,
          size: content.length,
          lines: content.split('\n').length,
          imports: fileStats.imports,
          exports: fileStats.exports
        });

        analysis.unusedImports.push(...fileStats.unusedImports);
        analysis.deadCodeBlocks.push(...fileStats.deadCode);
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error.message);
      }
    }

    // Sort by file size
    analysis.largestFiles.sort((a, b) => b.size - a.size);

    return analysis;
  }

  /**
   * Analyze individual file for optimization opportunities
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Object} File analysis
   */
  analyzeFile(filePath, content) {
    const lines = content.split('\n');
    const analysis = {
      imports: [],
      exports: [],
      unusedImports: [],
      deadCode: [],
      consoleStatements: []
    };

    let inCommentBlock = false;
    const importedSymbols = new Map();
    const usedSymbols = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//')) {
        continue;
      }
      
      // Handle multi-line comments
      if (line.includes('/*')) {
        inCommentBlock = true;
      }
      if (line.includes('*/')) {
        inCommentBlock = false;
      }
      if (inCommentBlock) {
        continue;
      }

      // Detect imports
      const importMatch = line.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const [, namedImports, namespaceImport, defaultImport, modulePath] = importMatch;
        
        if (namedImports) {
          const symbols = namedImports.split(',').map(s => s.trim());
          symbols.forEach(symbol => {
            const cleanSymbol = symbol.replace(/\s+as\s+\w+/, '').trim();
            importedSymbols.set(cleanSymbol, { line: i + 1, module: modulePath });
          });
        }
        
        if (namespaceImport) {
          importedSymbols.set(namespaceImport, { line: i + 1, module: modulePath });
        }
        
        if (defaultImport) {
          importedSymbols.set(defaultImport, { line: i + 1, module: modulePath });
        }

        analysis.imports.push({
          line: i + 1,
          module: modulePath,
          symbols: namedImports ? namedImports.split(',').map(s => s.trim()) : [defaultImport || namespaceImport]
        });
      }

      // Detect console statements
      if (line.includes('console.')) {
        const consoleMatch = line.match(/console\.(log|warn|error|info|debug)/);
        if (consoleMatch) {
          analysis.consoleStatements.push({
            line: i + 1,
            type: consoleMatch[1],
            content: line
          });
        }
      }

      // Track symbol usage
      for (const [symbol] of importedSymbols) {
        if (line.includes(symbol) && !line.startsWith('import')) {
          usedSymbols.add(symbol);
        }
      }

      // Detect potential dead code
      if (line.includes('// TODO') || line.includes('// FIXME') || line.includes('// DEBUG')) {
        analysis.deadCode.push({
          line: i + 1,
          type: 'comment',
          content: line
        });
      }

      // Detect unused functions (simple heuristic)
      const functionMatch = line.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{))/);
      if (functionMatch) {
        // Store function name for potential dead code analysis
        const functionName = functionMatch[1] || functionMatch[2];
        // Could be used for tracking function usage
        if (functionName) {
          // Function detected - could be analyzed for usage
        }
      }
    }

    // Find unused imports
    for (const [symbol, info] of importedSymbols) {
      if (!usedSymbols.has(symbol)) {
        analysis.unusedImports.push({
          symbol,
          line: info.line,
          module: info.module
        });
      }
    }

    return analysis;
  }

  /**
   * Generate optimized version of a file
   * @param {string} content - Original file content
   * @param {Object} optimizations - Optimizations to apply
   * @returns {string} Optimized content
   */
  optimizeFileContent(content, optimizations = {}) {
    let optimized = content;
    const changes = [];

    // Remove console statements in production
    if (this.config.removeConsoleInProduction && optimizations.removeConsole !== false) {
      const consoleRegex = /console\.(log|warn|error|info|debug)\([^)]*\);?\s*/g;
      const matches = [...optimized.matchAll(consoleRegex)];
      optimized = optimized.replace(consoleRegex, '');
      changes.push(`Removed ${matches.length} console statements`);
    }

    // Remove debug code blocks
    if (this.config.removeDebugCode) {
      const debugRegex = /\/\/ DEBUG START[\s\S]*?\/\/ DEBUG END\s*/g;
      const matches = [...optimized.matchAll(debugRegex)];
      optimized = optimized.replace(debugRegex, '');
      changes.push(`Removed ${matches.length} debug blocks`);
    }

    // Remove TODO/FIXME comments
    const todoRegex = /\/\/ (TODO|FIXME|HACK):?.*$/gm;
    const todoMatches = [...optimized.matchAll(todoRegex)];
    optimized = optimized.replace(todoRegex, '');
    if (todoMatches.length > 0) {
      changes.push(`Removed ${todoMatches.length} TODO/FIXME comments`);
    }

    // Remove excessive whitespace
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple empty lines to double
    optimized = optimized.replace(/[ \t]+$/gm, ''); // Trailing whitespace
    changes.push('Cleaned up whitespace');

    return {
      content: optimized,
      changes,
      bytesRemoved: content.length - optimized.length
    };
  }

  /**
   * Create WASM lazy loading system
   * @returns {string} Lazy loading implementation
   */
  createWasmLazyLoader() {
    return `/**
 * WASM Lazy Loading System
 * Implements progressive loading strategies for WASM modules
 */

export class WasmLazyLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.preloadQueue = [];
    this.config = {
      preloadCritical: true,
      enableCompression: true,
      cacheModules: true,
      loadTimeout: 30000
    };
  }

  /**
   * Load WASM module with lazy loading strategy
   * @param {string} moduleName - Module identifier
   * @param {Object} options - Loading options
   * @returns {Promise<WebAssembly.Module>} Loaded module
   */
  async loadModule(moduleName, options = {}) {
    // Return cached module if available
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Create loading promise
    const loadingPromise = this.performLazyLoad(moduleName, options);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * Perform the actual lazy loading
   * @private
   */
  async performLazyLoad(moduleName, options) {
    const startTime = performance.now();
    
    // Determine module path
    const modulePath = this.resolveModulePath(moduleName);
    
    // Load with timeout
    const loadPromise = this.loadWithTimeout(modulePath, options);
    
    try {
      const arrayBuffer = await loadPromise;
      const module = await WebAssembly.compile(arrayBuffer);
      
      const loadTime = performance.now() - startTime;
      console.log(\`📦 Loaded WASM module '\${moduleName}' in \${loadTime.toFixed(2)}ms\`);
      
      return module;
    } catch (error) {
      console.error(\`❌ Failed to load WASM module '\${moduleName}':\`, error);
      throw error;
    }
  }

  /**
   * Load WASM with timeout
   * @private
   */
  async loadWithTimeout(modulePath, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.loadTimeout);

    try {
      const response = await fetch(modulePath, {
        signal: controller.signal,
        ...options.fetchOptions
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const arrayBuffer = await response.arrayBuffer();
      clearTimeout(timeoutId);
      return arrayBuffer;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Resolve module path with fallbacks
   * @private
   */
  resolveModulePath(moduleName) {
    const paths = [
      \`\${moduleName}.wasm\`,
      \`dist/\${moduleName}.wasm\`,
      \`src/wasm/\${moduleName}.wasm\`,
      \`wasm/\${moduleName}.wasm\`
    ];

    // Return first path for now, could implement path testing
    return paths[0];
  }

  /**
   * Preload critical WASM modules
   */
  async preloadCriticalModules() {
    const criticalModules = ['game', 'game-host'];
    
    const preloadPromises = criticalModules.map(async (moduleName) => {
      try {
        await this.loadModule(moduleName, { priority: 'high' });
        console.log(\`✅ Preloaded critical module: \${moduleName}\`);
      } catch (error) {
        console.warn(\`⚠️ Failed to preload \${moduleName}:\`, error.message);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      loadedModules: this.loadedModules.size,
      loadingInProgress: this.loadingPromises.size,
      preloadQueueSize: this.preloadQueue.length
    };
  }
}

// Global lazy loader instance
export const globalWasmLoader = new WasmLazyLoader();`;
  }

  /**
   * Create memory leak detection system
   * @returns {string} Memory leak detector implementation
   */
  createMemoryLeakDetector() {
    return `/**
 * Advanced Memory Leak Detection System
 * Monitors for unused variables, event listeners, and memory patterns
 */

export class MemoryLeakDetector {
  constructor() {
    this.trackedObjects = new WeakMap();
    this.eventListeners = new Map();
    this.timers = new Set();
    this.intervals = new Set();
    this.memorySnapshots = [];
    this.leakThresholds = {
      memoryGrowth: 50 * 1024 * 1024, // 50MB
      objectCount: 10000,
      eventListenerCount: 1000
    };
  }

  /**
   * Start memory leak monitoring
   */
  startMonitoring() {
    // Monitor memory usage
    this.memoryInterval = setInterval(() => {
      this.takeMemorySnapshot();
      this.detectLeaks();
    }, 5000);

    // Override addEventListener to track listeners
    this.patchEventListeners();
    
    // Override setTimeout/setInterval to track timers
    this.patchTimers();

    console.log('🔍 Memory leak detection started');
  }

  /**
   * Take memory snapshot
   * @private
   */
  takeMemorySnapshot() {
    if (!performance.memory) return;

    const snapshot = {
      timestamp: Date.now(),
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 20 snapshots
    if (this.memorySnapshots.length > 20) {
      this.memorySnapshots.shift();
    }
  }

  /**
   * Detect memory leaks
   * @private
   */
  detectLeaks() {
    if (this.memorySnapshots.length < 2) return;

    const recent = this.memorySnapshots.slice(-5);
    const growth = recent[recent.length - 1].used - recent[0].used;

    if (growth > this.leakThresholds.memoryGrowth) {
      console.warn(\`🚨 Memory leak detected: \${(growth / 1024 / 1024).toFixed(1)}MB growth\`);
      this.reportLeak('memory_growth', { growth, snapshots: recent });
    }

    // Check event listener count
    const listenerCount = Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.size, 0);
    if (listenerCount > this.leakThresholds.eventListenerCount) {
      console.warn(\`🚨 Event listener leak detected: \${listenerCount} listeners\`);
      this.reportLeak('event_listeners', { count: listenerCount });
    }
  }

  /**
   * Patch addEventListener to track listeners
   * @private
   */
  patchEventListeners() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const detector = this;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Track the listener
      if (!detector.eventListeners.has(this)) {
        detector.eventListeners.set(this, new Map());
      }
      
      const listeners = detector.eventListeners.get(this);
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(listener);

      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      // Remove from tracking
      if (detector.eventListeners.has(this)) {
        const listeners = detector.eventListeners.get(this);
        if (listeners.has(type)) {
          listeners.get(type).delete(listener);
        }
      }

      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Patch timers to track them
   * @private
   */
  patchTimers() {
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;
    const detector = this;

    window.setTimeout = function(callback, delay, ...args) {
      const id = originalSetTimeout.call(this, callback, delay, ...args);
      detector.timers.add(id);
      return id;
    };

    window.setInterval = function(callback, delay, ...args) {
      const id = originalSetInterval.call(this, callback, delay, ...args);
      detector.intervals.add(id);
      return id;
    };

    window.clearTimeout = function(id) {
      detector.timers.delete(id);
      return originalClearTimeout.call(this, id);
    };

    window.clearInterval = function(id) {
      detector.intervals.delete(id);
      return originalClearInterval.call(this, id);
    };
  }

  /**
   * Report detected leak
   * @private
   */
  reportLeak(type, details) {
    const report = {
      type,
      timestamp: Date.now(),
      details,
      stackTrace: new Error().stack
    };

    // Could send to analytics or logging service
    console.error('Memory leak report:', report);
  }

  /**
   * Get current statistics
   */
  getStats() {
    const listenerCount = Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.size, 0);
    
    return {
      eventListeners: listenerCount,
      timers: this.timers.size,
      intervals: this.intervals.size,
      memorySnapshots: this.memorySnapshots.length,
      currentMemory: this.memorySnapshots.length > 0 ? this.memorySnapshots[this.memorySnapshots.length - 1] : null
    };
  }

  /**
   * Clean up detector
   */
  cleanup() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    
    // Clear all tracked timers
    this.timers.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    
    console.log('🧹 Memory leak detector cleaned up');
  }
}

// Global memory leak detector
export const globalMemoryLeakDetector = new MemoryLeakDetector();`;
  }

  /**
   * Helper method to read file (stub for actual implementation)
   * @private
   */
  readFile() {
    // In actual implementation, this would read from filesystem
    // For now, return empty string as placeholder
    return '';
  }
}

// Global bundle optimizer instance
export const globalBundleOptimizer = new BundleOptimizer();
