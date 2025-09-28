/**
 * Test Runner Utility
 * Provides enhanced test execution and reporting capabilities
 * Follows testing best practices from BUILD/TESTING.md
 */

// Use browser-compatible performance API
const performance = (typeof globalThis !== 'undefined' && globalThis.performance) || 
                   (typeof window !== 'undefined' && window.performance) ||
                   { now: () => Date.now() };

// Simple color formatting without external dependency
const chalk = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

/**
 * Enhanced test runner with performance monitoring and reporting
 */
export class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      showTimings: options.showTimings !== false,
      maxConcurrent: options.maxConcurrent || 5,
      timeout: options.timeout || 5000,
      retries: options.retries || 0,
      bail: options.bail || false,
      ...options
    };
    
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      pending: [],
      totalTime: 0
    };
    
    this.startTime = null;
    this.currentSuite = null;
    this.listeners = new Map();
  }

  /**
   * Run a test suite
   * @param {string} suiteName - Name of the test suite
   * @param {Function} suiteFunction - Function containing test cases
   * @returns {Promise<Object>} Test results
   */
  async runSuite(suiteName, suiteFunction) {
    this.currentSuite = suiteName;
    this.emit('suiteStart', { suite: suiteName });
    
    const suiteStartTime = performance.now();
    
    try {
      await suiteFunction();
    } catch (error) {
      this.emit('suiteError', { suite: suiteName, error });
      this.results.failed.push({
        suite: suiteName,
        error: error.message,
        stack: error.stack
      });
    }
    
    const suiteEndTime = performance.now();
    const suiteTime = suiteEndTime - suiteStartTime;
    
    this.emit('suiteEnd', { 
      suite: suiteName, 
      time: suiteTime,
      passed: this.results.passed.filter(t => t.suite === suiteName).length,
      failed: this.results.failed.filter(t => t.suite === suiteName).length
    });
    
    this.currentSuite = null;
    return this.getResults();
  }

  /**
   * Run a single test case
   * @param {string} testName - Name of the test
   * @param {Function} testFunction - Test function to execute
   * @returns {Promise<void>}
   */
  async runTest(testName, testFunction) {
    const test = {
      name: testName,
      suite: this.currentSuite,
      status: 'pending',
      error: null,
      time: 0,
      retries: 0
    };
    
    this.emit('testStart', test);
    
    let attempts = 0;
    let lastError = null;
    
    while (attempts <= this.options.retries) {
      const testStartTime = performance.now();
      
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Test timeout after ${this.options.timeout}ms`)), 
                    this.options.timeout);
        });
        
        // Race between test and timeout
        await Promise.race([
          testFunction(),
          timeoutPromise
        ]);
        
        const testEndTime = performance.now();
        test.time = testEndTime - testStartTime;
        test.status = 'passed';
        
        this.results.passed.push(test);
        this.emit('testPass', test);
        
        if (this.options.verbose) {
          console.log(chalk.green('✓'), chalk.gray(testName), 
                     this.options.showTimings ? chalk.yellow(`(${test.time.toFixed(2)}ms)`) : '');
        }
        
        return;
      } catch (error) {
        lastError = error;
        attempts++;
        test.retries = attempts - 1;
        
        if (attempts <= this.options.retries) {
          this.emit('testRetry', { ...test, attempt: attempts });
        }
      }
    }
    
    // Test failed after all retries
    const testEndTime = performance.now();
    test.time = testEndTime - performance.now();
    test.status = 'failed';
    test.error = lastError.message;
    test.stack = lastError.stack;
    
    this.results.failed.push(test);
    this.emit('testFail', test);
    
    if (this.options.verbose) {
      console.log(chalk.red('✗'), chalk.gray(testName));
      if (lastError.message) {
        console.log(chalk.red('  Error:'), lastError.message);
      }
    }
    
    if (this.options.bail) {
      throw new Error(`Bail on first failure: ${testName}`);
    }
  }

  /**
   * Skip a test
   * @param {string} testName - Name of the test to skip
   * @param {string} reason - Reason for skipping
   */
  skipTest(testName, reason = '') {
    const test = {
      name: testName,
      suite: this.currentSuite,
      status: 'skipped',
      reason
    };
    
    this.results.skipped.push(test);
    this.emit('testSkip', test);
    
    if (this.options.verbose) {
      console.log(chalk.yellow('-'), chalk.gray(testName), 
                 reason ? chalk.yellow(`(${reason})`) : '');
    }
  }

  /**
   * Mark a test as pending
   * @param {string} testName - Name of the pending test
   */
  pendingTest(testName) {
    const test = {
      name: testName,
      suite: this.currentSuite,
      status: 'pending'
    };
    
    this.results.pending.push(test);
    this.emit('testPending', test);
    
    if (this.options.verbose) {
      console.log(chalk.cyan('○'), chalk.gray(testName), chalk.cyan('(pending)'));
    }
  }

  /**
   * Run multiple test suites in parallel
   * @param {Array<Object>} suites - Array of suite objects with name and function
   * @returns {Promise<Object>} Combined results
   */
  async runParallel(suites) {
    this.startTime = performance.now();
    this.emit('runStart', { totalSuites: suites.length });
    
    const chunks = [];
    for (let i = 0; i < suites.length; i += this.options.maxConcurrent) {
      chunks.push(suites.slice(i, i + this.options.maxConcurrent));
    }
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(suite => this.runSuite(suite.name, suite.function))
      );
    }
    
    const endTime = performance.now();
    this.results.totalTime = endTime - this.startTime;
    
    this.emit('runEnd', this.getResults());
    return this.getResults();
  }

  /**
   * Get test results
   * @returns {Object} Test results summary
   */
  getResults() {
    return {
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      skipped: this.results.skipped.length,
      pending: this.results.pending.length,
      total: this.results.passed.length + this.results.failed.length + 
             this.results.skipped.length + this.results.pending.length,
      duration: this.results.totalTime,
      failures: this.results.failed,
      success: this.results.failed.length === 0
    };
  }

  /**
   * Generate a detailed report
   * @returns {string} Formatted report
   */
  generateReport() {
    const results = this.getResults();
    const lines = [];
    
    lines.push('');
    lines.push(chalk.bold('Test Results'));
    lines.push('='.repeat(50));
    
    if (results.passed > 0) {
      lines.push(chalk.green(`✓ ${results.passed} passing`));
    }
    
    if (results.failed > 0) {
      lines.push(chalk.red(`✗ ${results.failed} failing`));
    }
    
    if (results.skipped > 0) {
      lines.push(chalk.yellow(`- ${results.skipped} skipped`));
    }
    
    if (results.pending > 0) {
      lines.push(chalk.cyan(`○ ${results.pending} pending`));
    }
    
    if (this.options.showTimings && results.duration) {
      lines.push('');
      lines.push(chalk.gray(`Total time: ${(results.duration / 1000).toFixed(2)}s`));
    }
    
    if (results.failed > 0) {
      lines.push('');
      lines.push(chalk.bold.red('Failures:'));
      lines.push('-'.repeat(50));
      
      this.results.failed.forEach((failure, index) => {
        lines.push('');
        lines.push(chalk.red(`${index + 1}) ${failure.suite ? failure.suite + ': ' : ''}${failure.name}`));
        lines.push(chalk.red(`   ${failure.error}`));
        
        if (this.options.verbose && failure.stack) {
          lines.push(chalk.gray(failure.stack.split('\n').slice(1, 4).join('\n')));
        }
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Create a test context with utilities
   * @returns {Object} Test context
   */
  createContext() {
    return {
      test: this.runTest.bind(this),
      skip: this.skipTest.bind(this),
      pending: this.pendingTest.bind(this),
      suite: this.runSuite.bind(this),
      
      // Assertion helpers
      assert: {
        equal: (actual, expected, message) => {
          if (actual !== expected) {
            throw new Error(message || `Expected ${actual} to equal ${expected}`);
          }
        },
        
        deepEqual: (actual, expected, message) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Expected ${JSON.stringify(actual)} to deep equal ${JSON.stringify(expected)}`);
          }
        },
        
        truthy: (value, message) => {
          if (!value) {
            throw new Error(message || `Expected ${value} to be truthy`);
          }
        },
        
        falsy: (value, message) => {
          if (value) {
            throw new Error(message || `Expected ${value} to be falsy`);
          }
        },
        
        throws: async (fn, expectedError, message) => {
          let threw = false;
          let actualError = null;
          
          try {
            await fn();
          } catch (error) {
            threw = true;
            actualError = error;
          }
          
          if (!threw) {
            throw new Error(message || 'Expected function to throw');
          }
          
          if (expectedError && actualError.message !== expectedError) {
            throw new Error(message || `Expected error "${expectedError}" but got "${actualError.message}"`);
          }
        }
      }
    };
  }
}

/**
 * Create a test runner with default options
 * @param {Object} options - Runner options
 * @returns {TestRunner} Test runner instance
 */
export function createTestRunner(options = {}) {
  return new TestRunner(options);
}

/**
 * Run tests with automatic discovery
 * @param {string} pattern - File pattern to match test files
 * @param {Object} options - Runner options
 * @returns {Promise<Object>} Test results
 */
export async function runTests(pattern = '**/*.test.js', options = {}) {
  const runner = createTestRunner(options);
  
  // This would typically use file system operations to discover tests
  // For now, returning a placeholder
  console.warn('Automatic test discovery not implemented in browser environment');
  
  return runner.getResults();
}

// Export singleton instance for convenience
export const globalTestRunner = new TestRunner({
  verbose: true,
  showTimings: true
});

export default TestRunner;