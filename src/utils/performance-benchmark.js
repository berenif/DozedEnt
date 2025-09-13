/**
 * Performance Benchmark Utility
 * Provides comprehensive performance benchmarking and analysis
 * Follows performance optimization guidelines from PERFORMANCE_OPTIMIZATIONS.md
 */

/**
 * Performance benchmark runner with statistical analysis
 */
export class PerformanceBenchmark {
  constructor(options = {}) {
    this.options = {
      iterations: options.iterations || 1000,
      warmupIterations: options.warmupIterations || 100,
      minTime: options.minTime || 1000, // Minimum time in ms to run benchmark
      maxTime: options.maxTime || 10000, // Maximum time in ms to run benchmark
      async: options.async !== false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.results = new Map();
    this.suites = new Map();
    this.currentSuite = null;
    
    // Performance metrics
    this.metrics = {
      heapUsedBefore: 0,
      heapUsedAfter: 0,
      gcCount: 0,
      totalTime: 0
    };
  }

  /**
   * Create a benchmark suite
   * @param {string} name - Suite name
   * @param {Object} options - Suite options
   * @returns {Object} Suite object
   */
  suite(name, options = {}) {
    const suite = {
      name,
      benchmarks: new Map(),
      options: { ...this.options, ...options },
      setup: null,
      teardown: null
    };
    
    this.suites.set(name, suite);
    this.currentSuite = suite;
    
    return {
      add: (benchmarkName, fn, opts) => this.add(benchmarkName, fn, opts),
      setup: (fn) => { suite.setup = fn; },
      teardown: (fn) => { suite.teardown = fn; },
      run: () => this.runSuite(name)
    };
  }

  /**
   * Add a benchmark to the current suite
   * @param {string} name - Benchmark name
   * @param {Function} fn - Function to benchmark
   * @param {Object} options - Benchmark options
   */
  add(name, fn, options = {}) {
    const benchmark = {
      name,
      fn,
      options: { ...this.options, ...options },
      results: []
    };
    
    if (this.currentSuite) {
      this.currentSuite.benchmarks.set(name, benchmark);
    } else {
      // Create default suite if none exists
      if (!this.suites.has('default')) {
        this.suite('default');
      }
      this.currentSuite.benchmarks.set(name, benchmark);
    }
    
    return this;
  }

  /**
   * Run a single benchmark
   * @param {string} name - Benchmark name
   * @param {Function} fn - Function to benchmark
   * @param {Object} options - Options
   * @returns {Promise<Object>} Benchmark results
   */
  async runBenchmark(name, fn, options = {}) {
    const opts = { ...this.options, ...options };
    const results = [];
    
    if (opts.verbose) {
      console.log(`Running benchmark: ${name}`);
    }
    
    // Warmup phase
    if (opts.warmupIterations > 0) {
      if (opts.verbose) {
        console.log(`  Warmup: ${opts.warmupIterations} iterations`);
      }
      
      for (let i = 0; i < opts.warmupIterations; i++) {
        if (opts.async) {
          await fn();
        } else {
          fn();
        }
      }
    }
    
    // Force garbage collection if available
    this.forceGC();
    
    // Record initial memory
    const memBefore = this.getMemoryUsage();
    
    // Benchmark phase
    let iterations = 0;
    let totalTime = 0;
    const startTime = performance.now();
    
    while (totalTime < opts.minTime && totalTime < opts.maxTime) {
      const iterStartTime = performance.now();
      
      if (opts.async) {
        await fn();
      } else {
        fn();
      }
      
      const iterEndTime = performance.now();
      const iterTime = iterEndTime - iterStartTime;
      
      results.push(iterTime);
      totalTime = iterEndTime - startTime;
      iterations++;
      
      // Dynamic iteration adjustment
      if (iterations >= opts.iterations) {
        break;
      }
    }
    
    // Record final memory
    const memAfter = this.getMemoryUsage();
    
    // Calculate statistics
    const stats = this.calculateStats(results);
    stats.iterations = iterations;
    stats.totalTime = totalTime;
    stats.memoryDelta = memAfter - memBefore;
    stats.opsPerSecond = iterations / (totalTime / 1000);
    
    // Store results
    this.results.set(name, stats);
    
    if (opts.verbose) {
      console.log(`  Completed: ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
      console.log(`  Ops/sec: ${stats.opsPerSecond.toFixed(0)}`);
      console.log(`  Mean: ${stats.mean.toFixed(3)}ms ±${stats.deviation.toFixed(3)}ms`);
    }
    
    return stats;
  }

  /**
   * Run a benchmark suite
   * @param {string} suiteName - Suite name
   * @returns {Promise<Object>} Suite results
   */
  async runSuite(suiteName) {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      throw new Error(`Suite "${suiteName}" not found`);
    }
    
    console.log(`\n${suiteName} Benchmark Suite`);
    console.log('='.repeat(50));
    
    const suiteResults = {
      name: suiteName,
      benchmarks: new Map(),
      summary: null
    };
    
    // Run setup if provided
    if (suite.setup) {
      await suite.setup();
    }
    
    // Run each benchmark
    for (const [name, benchmark] of suite.benchmarks) {
      const results = await this.runBenchmark(
        name, 
        benchmark.fn, 
        benchmark.options
      );
      suiteResults.benchmarks.set(name, results);
    }
    
    // Run teardown if provided
    if (suite.teardown) {
      await suite.teardown();
    }
    
    // Generate summary
    suiteResults.summary = this.generateSuiteSummary(suiteResults);
    
    return suiteResults;
  }

  /**
   * Run all benchmark suites
   * @returns {Promise<Array>} All suite results
   */
  async runAll() {
    const results = [];
    
    for (const [name] of this.suites) {
      const suiteResults = await this.runSuite(name);
      results.push(suiteResults);
    }
    
    return results;
  }

  /**
   * Calculate statistics from benchmark results
   * @param {Array<number>} results - Array of timing results
   * @returns {Object} Statistics
   * @private
   */
  calculateStats(results) {
    if (results.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        deviation: 0,
        variance: 0,
        percentiles: {}
      };
    }
    
    // Sort results for percentile calculations
    const sorted = [...results].sort((a, b) => a - b);
    
    // Calculate mean
    const sum = results.reduce((acc, val) => acc + val, 0);
    const mean = sum / results.length;
    
    // Calculate median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    
    // Calculate min/max
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    // Calculate variance and standard deviation
    const squaredDiffs = results.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / results.length;
    const deviation = Math.sqrt(variance);
    
    // Calculate percentiles
    const percentiles = {
      p50: this.percentile(sorted, 50),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99)
    };
    
    // Calculate margin of error (95% confidence interval)
    const marginOfError = 1.96 * (deviation / Math.sqrt(results.length));
    
    return {
      mean,
      median,
      min,
      max,
      deviation,
      variance,
      percentiles,
      marginOfError,
      samples: results.length
    };
  }

  /**
   * Calculate percentile value
   * @param {Array<number>} sorted - Sorted array of values
   * @param {number} p - Percentile (0-100)
   * @returns {number} Percentile value
   * @private
   */
  percentile(sorted, p) {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Generate suite summary
   * @param {Object} suiteResults - Suite results
   * @returns {Object} Summary
   * @private
   */
  generateSuiteSummary(suiteResults) {
    const benchmarks = Array.from(suiteResults.benchmarks.entries());
    
    if (benchmarks.length === 0) {
      return null;
    }
    
    // Find fastest benchmark
    const fastest = benchmarks.reduce((prev, curr) => {
      return curr[1].mean < prev[1].mean ? curr : prev;
    });
    
    // Calculate relative performance
    const comparison = benchmarks.map(([name, stats]) => {
      const ratio = stats.mean / fastest[1].mean;
      const percentage = ((ratio - 1) * 100).toFixed(1);
      
      return {
        name,
        mean: stats.mean,
        opsPerSecond: stats.opsPerSecond,
        relative: ratio,
        percentage: ratio === 1 ? 'fastest' : `${percentage}% slower`
      };
    });
    
    return {
      fastest: fastest[0],
      comparison: comparison.sort((a, b) => a.relative - b.relative)
    };
  }

  /**
   * Compare two benchmarks
   * @param {string} name1 - First benchmark name
   * @param {string} name2 - Second benchmark name
   * @returns {Object} Comparison results
   */
  compare(name1, name2) {
    const results1 = this.results.get(name1);
    const results2 = this.results.get(name2);
    
    if (!results1 || !results2) {
      throw new Error('Both benchmarks must be run before comparison');
    }
    
    const ratio = results1.mean / results2.mean;
    const faster = ratio < 1 ? name1 : name2;
    const slower = ratio < 1 ? name2 : name1;
    const speedup = ratio < 1 ? 1 / ratio : ratio;
    
    return {
      faster,
      slower,
      ratio,
      speedup,
      percentageDifference: ((speedup - 1) * 100).toFixed(1),
      significant: this.isSignificantDifference(results1, results2)
    };
  }

  /**
   * Check if difference between benchmarks is statistically significant
   * @param {Object} results1 - First benchmark results
   * @param {Object} results2 - Second benchmark results
   * @returns {boolean} True if significant
   * @private
   */
  isSignificantDifference(results1, results2) {
    // Simple check using margin of error
    const range1 = [
      results1.mean - results1.marginOfError,
      results1.mean + results1.marginOfError
    ];
    
    const range2 = [
      results2.mean - results2.marginOfError,
      results2.mean + results2.marginOfError
    ];
    
    // Check if ranges overlap
    return range1[1] < range2[0] || range2[1] < range1[0];
  }

  /**
   * Generate report for all results
   * @returns {string} Formatted report
   */
  generateReport() {
    const lines = [];
    
    lines.push('');
    lines.push('Performance Benchmark Report');
    lines.push('=' .repeat(80));
    lines.push('');
    
    for (const [suiteName, suite] of this.suites) {
      lines.push(`Suite: ${suiteName}`);
      lines.push('-'.repeat(40));
      
      for (const [benchName, benchmark] of suite.benchmarks) {
        const results = this.results.get(benchName);
        if (results) {
          lines.push('');
          lines.push(`  ${benchName}:`);
          lines.push(`    Ops/sec:     ${results.opsPerSecond.toFixed(0).padStart(10)} operations`);
          lines.push(`    Mean:        ${results.mean.toFixed(3).padStart(10)}ms ±${results.marginOfError.toFixed(3)}ms`);
          lines.push(`    Median:      ${results.median.toFixed(3).padStart(10)}ms`);
          lines.push(`    Min:         ${results.min.toFixed(3).padStart(10)}ms`);
          lines.push(`    Max:         ${results.max.toFixed(3).padStart(10)}ms`);
          lines.push(`    Std Dev:     ${results.deviation.toFixed(3).padStart(10)}ms`);
          lines.push(`    Samples:     ${results.samples.toString().padStart(10)}`);
          
          if (results.memoryDelta && results.memoryDelta !== 0) {
            lines.push(`    Memory:      ${(results.memoryDelta / 1024 / 1024).toFixed(2).padStart(10)}MB`);
          }
        }
      }
      
      lines.push('');
    }
    
    // Add comparison table if multiple benchmarks
    if (this.results.size > 1) {
      lines.push('');
      lines.push('Comparison');
      lines.push('-'.repeat(40));
      
      const sorted = Array.from(this.results.entries())
        .sort((a, b) => a[1].mean - b[1].mean);
      
      const fastest = sorted[0];
      
      for (const [name, results] of sorted) {
        const ratio = results.mean / fastest[1].mean;
        const status = ratio === 1 ? '(fastest)' : `(${ratio.toFixed(2)}x slower)`;
        
        lines.push(`  ${name.padEnd(30)} ${results.opsPerSecond.toFixed(0).padStart(10)} ops/sec ${status}`);
      }
    }
    
    lines.push('');
    lines.push('=' .repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Get memory usage
   * @returns {number} Memory usage in bytes
   * @private
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    return 0;
  }

  /**
   * Force garbage collection if available
   * @private
   */
  forceGC() {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      this.metrics.gcCount++;
    }
  }

  /**
   * Reset all results
   */
  reset() {
    this.results.clear();
    this.suites.clear();
    this.currentSuite = null;
    this.metrics = {
      heapUsedBefore: 0,
      heapUsedAfter: 0,
      gcCount: 0,
      totalTime: 0
    };
  }
}

/**
 * Create a benchmark runner with default options
 * @param {Object} options - Benchmark options
 * @returns {PerformanceBenchmark} Benchmark instance
 */
export function createBenchmark(options = {}) {
  return new PerformanceBenchmark(options);
}

/**
 * Quick benchmark function for simple cases
 * @param {string} name - Benchmark name
 * @param {Function} fn - Function to benchmark
 * @param {Object} options - Options
 * @returns {Promise<Object>} Benchmark results
 */
export async function benchmark(name, fn, options = {}) {
  const bench = new PerformanceBenchmark(options);
  return await bench.runBenchmark(name, fn, options);
}

/**
 * Measure function execution time
 * @param {Function} fn - Function to measure
 * @param {Array} args - Function arguments
 * @returns {Promise<Object>} Timing results
 */
export async function measure(fn, ...args) {
  const startTime = performance.now();
  const startMemory = typeof performance !== 'undefined' && performance.memory 
    ? performance.memory.usedJSHeapSize : 0;
  
  const result = await fn(...args);
  
  const endTime = performance.now();
  const endMemory = typeof performance !== 'undefined' && performance.memory
    ? performance.memory.usedJSHeapSize : 0;
  
  return {
    result,
    time: endTime - startTime,
    memory: endMemory - startMemory
  };
}

// Export singleton instance for convenience
export const globalBenchmark = new PerformanceBenchmark({
  verbose: true,
  iterations: 1000,
  warmupIterations: 100
});

export default PerformanceBenchmark;