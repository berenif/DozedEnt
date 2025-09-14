/**
 * Code Coverage Reporter Utility
 * Provides code coverage tracking and reporting capabilities
 * Integrates with testing framework for comprehensive coverage analysis
 */

/**
 * Coverage reporter for tracking code execution and generating reports
 */
export class CoverageReporter {
  constructor(options = {}) {
    this.options = {
      threshold: {
        statements: options.threshold?.statements || 80,
        branches: options.threshold?.branches || 80,
        functions: options.threshold?.functions || 80,
        lines: options.threshold?.lines || 80
      },
      reportFormats: options.reportFormats || ['text', 'html', 'json'],
      outputDir: options.outputDir || './coverage',
      verbose: options.verbose || false,
      ...options
    };
    
    this.coverage = {
      statements: new Map(),
      branches: new Map(),
      functions: new Map(),
      lines: new Map()
    };
    
    this.fileData = new Map();
    this.startTime = null;
  }

  /**
   * Start coverage collection
   */
  start() {
    this.startTime = Date.now();
    this.reset();
    
    if (this.options.verbose) {
      console.log('Coverage collection started');
    }
  }

  /**
   * Stop coverage collection
   * @returns {Object} Coverage data
   */
  stop() {
    const duration = Date.now() - this.startTime;
    
    if (this.options.verbose) {
      console.log(`Coverage collection stopped (${duration}ms)`);
    }
    
    return this.getCoverageData();
  }

  /**
   * Reset coverage data
   */
  reset() {
    this.coverage.statements.clear();
    this.coverage.branches.clear();
    this.coverage.functions.clear();
    this.coverage.lines.clear();
    this.fileData.clear();
  }

  /**
   * Track statement execution
   * @param {string} file - File path
   * @param {number} line - Line number
   * @param {number} column - Column number
   */
  trackStatement(file, line, column) {
    const key = `${file}:${line}:${column}`;
    const count = this.coverage.statements.get(key) || 0;
    this.coverage.statements.set(key, count + 1);
    
    this.trackLine(file, line);
  }

  /**
   * Track branch execution
   * @param {string} file - File path
   * @param {number} line - Line number
   * @param {number} branch - Branch index
   * @param {boolean} taken - Whether branch was taken
   */
  trackBranch(file, line, branch, taken) {
    const key = `${file}:${line}:${branch}`;
    
    if (!this.coverage.branches.has(key)) {
      this.coverage.branches.set(key, { taken: 0, notTaken: 0 });
    }
    
    const branchData = this.coverage.branches.get(key);
    if (taken) {
      branchData.taken++;
    } else {
      branchData.notTaken++;
    }
  }

  /**
   * Track function execution
   * @param {string} file - File path
   * @param {string} name - Function name
   * @param {number} line - Line number
   */
  trackFunction(file, name, line) {
    const key = `${file}:${name}:${line}`;
    const count = this.coverage.functions.get(key) || 0;
    this.coverage.functions.set(key, count + 1);
  }

  /**
   * Track line execution
   * @param {string} file - File path
   * @param {number} line - Line number
   */
  trackLine(file, line) {
    const key = `${file}:${line}`;
    const count = this.coverage.lines.get(key) || 0;
    this.coverage.lines.set(key, count + 1);
  }

  /**
   * Register file for coverage tracking
   * @param {string} file - File path
   * @param {Object} metadata - File metadata
   */
  registerFile(file, metadata = {}) {
    this.fileData.set(file, {
      path: file,
      totalStatements: metadata.statements || 0,
      totalBranches: metadata.branches || 0,
      totalFunctions: metadata.functions || 0,
      totalLines: metadata.lines || 0,
      source: metadata.source || ''
    });
  }

  /**
   * Get coverage data for all files
   * @returns {Object} Coverage data
   */
  getCoverageData() {
    const files = new Map();
    
    // Process each file
    for (const [filePath, metadata] of this.fileData) {
      const fileCoverage = {
        path: filePath,
        statements: this.getFileCoverage(filePath, 'statements'),
        branches: this.getFileBranchCoverage(filePath),
        functions: this.getFileCoverage(filePath, 'functions'),
        lines: this.getFileCoverage(filePath, 'lines')
      };
      
      files.set(filePath, fileCoverage);
    }
    
    return {
      files: Array.from(files.values()),
      summary: this.getSummary(files),
      timestamp: Date.now()
    };
  }

  /**
   * Get coverage for a specific file and metric
   * @param {string} file - File path
   * @param {string} metric - Coverage metric
   * @returns {Object} File coverage
   * @private
   */
  getFileCoverage(file, metric) {
    const coverageMap = this.coverage[metric];
    const fileMetadata = this.fileData.get(file) || {};
    
    let covered = 0;
    const total = fileMetadata[`total${metric.charAt(0).toUpperCase() + metric.slice(1)}`] || 0;
    
    for (const [key, count] of coverageMap) {
      if (key.startsWith(file + ':')) {
        if (count > 0) {covered++;}
      }
    }
    
    return {
      covered,
      total,
      percentage: total > 0 ? (covered / total) * 100 : 100,
      details: this.getDetailedCoverage(file, metric)
    };
  }

  /**
   * Get branch coverage for a file
   * @param {string} file - File path
   * @returns {Object} Branch coverage
   * @private
   */
  getFileBranchCoverage(file) {
    const fileMetadata = this.fileData.get(file) || {};
    let coveredBranches = 0;
    let totalBranches = 0;
    
    for (const [key, data] of this.coverage.branches) {
      if (key.startsWith(file + ':')) {
        totalBranches += 2; // Each branch has two paths
        if (data.taken > 0) {coveredBranches++;}
        if (data.notTaken > 0) {coveredBranches++;}
      }
    }
    
    return {
      covered: coveredBranches,
      total: totalBranches || fileMetadata.totalBranches || 0,
      percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
      details: this.getDetailedBranchCoverage(file)
    };
  }

  /**
   * Get detailed coverage for a metric
   * @param {string} file - File path
   * @param {string} metric - Coverage metric
   * @returns {Array} Detailed coverage
   * @private
   */
  getDetailedCoverage(file, metric) {
    const details = [];
    const coverageMap = this.coverage[metric];
    
    for (const [key, count] of coverageMap) {
      if (key.startsWith(file + ':')) {
        const parts = key.split(':');
        details.push({
          line: parseInt(parts[1]),
          column: metric === 'statements' ? parseInt(parts[2]) : undefined,
          count,
          covered: count > 0
        });
      }
    }
    
    return details.sort((a, b) => a.line - b.line);
  }

  /**
   * Get detailed branch coverage
   * @param {string} file - File path
   * @returns {Array} Detailed branch coverage
   * @private
   */
  getDetailedBranchCoverage(file) {
    const details = [];
    
    for (const [key, data] of this.coverage.branches) {
      if (key.startsWith(file + ':')) {
        const parts = key.split(':');
        details.push({
          line: parseInt(parts[1]),
          branch: parseInt(parts[2]),
          taken: data.taken,
          notTaken: data.notTaken,
          covered: data.taken > 0 && data.notTaken > 0
        });
      }
    }
    
    return details.sort((a, b) => a.line - b.line);
  }

  /**
   * Get coverage summary
   * @param {Map} files - File coverage data
   * @returns {Object} Coverage summary
   * @private
   */
  getSummary(files) {
    const summary = {
      statements: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      lines: { covered: 0, total: 0, percentage: 0 }
    };
    
    for (const fileCoverage of files.values()) {
      summary.statements.covered += fileCoverage.statements.covered;
      summary.statements.total += fileCoverage.statements.total;
      
      summary.branches.covered += fileCoverage.branches.covered;
      summary.branches.total += fileCoverage.branches.total;
      
      summary.functions.covered += fileCoverage.functions.covered;
      summary.functions.total += fileCoverage.functions.total;
      
      summary.lines.covered += fileCoverage.lines.covered;
      summary.lines.total += fileCoverage.lines.total;
    }
    
    // Calculate percentages
    for (const metric of Object.keys(summary)) {
      const data = summary[metric];
      data.percentage = data.total > 0 ? (data.covered / data.total) * 100 : 100;
    }
    
    return summary;
  }

  /**
   * Check if coverage meets thresholds
   * @param {Object} coverage - Coverage data
   * @returns {Object} Threshold check results
   */
  checkThresholds(coverage = null) {
    const data = coverage || this.getCoverageData();
    const results = {
      passed: true,
      failures: []
    };
    
    for (const [metric, threshold] of Object.entries(this.options.threshold)) {
      const actual = data.summary[metric].percentage;
      
      if (actual < threshold) {
        results.passed = false;
        results.failures.push({
          metric,
          threshold,
          actual: actual.toFixed(2),
          difference: (threshold - actual).toFixed(2)
        });
      }
    }
    
    return results;
  }

  /**
   * Generate text report
   * @param {Object} coverage - Coverage data
   * @returns {string} Text report
   */
  generateTextReport(coverage = null) {
    const data = coverage || this.getCoverageData();
    const lines = [];
    
    lines.push('');
    lines.push('=============================== Coverage Summary ===============================');
    lines.push('');
    
    // Summary table header
    const metrics = ['Statements', 'Branches', 'Functions', 'Lines'];
    const header = metrics.map(m => m.padEnd(12)).join('');
    lines.push(header);
    lines.push('-'.repeat(header.length));
    
    // Summary data
    const values = metrics.map(m => {
      const metric = m.toLowerCase();
      const summary = data.summary[metric];
      const percentage = summary.percentage.toFixed(2);
      const covered = summary.covered;
      const total = summary.total;
      return `${percentage}%`.padEnd(12);
    });
    lines.push(values.join(''));
    
    const details = metrics.map(m => {
      const metric = m.toLowerCase();
      const summary = data.summary[metric];
      return `(${summary.covered}/${summary.total})`.padEnd(12);
    });
    lines.push(details.join(''));
    
    // File details
    if (data.files.length > 0) {
      lines.push('');
      lines.push('=============================== File Coverage ==================================');
      lines.push('');
      
      for (const file of data.files) {
        lines.push(`File: ${file.path}`);
        lines.push(`  Statements: ${file.statements.percentage.toFixed(2)}% (${file.statements.covered}/${file.statements.total})`);
        lines.push(`  Branches:   ${file.branches.percentage.toFixed(2)}% (${file.branches.covered}/${file.branches.total})`);
        lines.push(`  Functions:  ${file.functions.percentage.toFixed(2)}% (${file.functions.covered}/${file.functions.total})`);
        lines.push(`  Lines:      ${file.lines.percentage.toFixed(2)}% (${file.lines.covered}/${file.lines.total})`);
        lines.push('');
      }
    }
    
    // Threshold check
    const thresholdResults = this.checkThresholds(data);
    if (!thresholdResults.passed) {
      lines.push('=============================== Threshold Failures =============================');
      lines.push('');
      
      for (const failure of thresholdResults.failures) {
        lines.push(`✗ ${failure.metric}: ${failure.actual}% (threshold: ${failure.threshold}%, -${failure.difference}%)`);
      }
      lines.push('');
    }
    
    lines.push('================================================================================');
    
    return lines.join('\n');
  }

  /**
   * Generate HTML report
   * @param {Object} coverage - Coverage data
   * @returns {string} HTML report
   */
  generateHTMLReport(coverage = null) {
    const data = coverage || this.getCoverageData();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metric { display: inline-block; margin: 0 20px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .good { color: #4caf50; }
    .medium { color: #ff9800; }
    .bad { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .percentage { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    ${this.generateHTMLSummary(data.summary)}
  </div>
  
  <h2>File Coverage</h2>
  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Statements</th>
        <th>Branches</th>
        <th>Functions</th>
        <th>Lines</th>
      </tr>
    </thead>
    <tbody>
      ${data.files.map(file => this.generateHTMLFileRow(file)).join('')}
    </tbody>
  </table>
  
  <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
</body>
</html>`;
    
    return html;
  }

  /**
   * Generate HTML summary section
   * @param {Object} summary - Coverage summary
   * @returns {string} HTML summary
   * @private
   */
  generateHTMLSummary(summary) {
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    
    return metrics.map(metric => {
      const data = summary[metric];
      const percentage = data.percentage.toFixed(2);
      const cssClass = percentage >= 80 ? 'good' : percentage >= 50 ? 'medium' : 'bad';
      
      return `
        <div class="metric">
          <div>${metric.charAt(0).toUpperCase() + metric.slice(1)}</div>
          <div class="metric-value ${cssClass}">${percentage}%</div>
          <div>${data.covered}/${data.total}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Generate HTML table row for a file
   * @param {Object} file - File coverage data
   * @returns {string} HTML table row
   * @private
   */
  generateHTMLFileRow(file) {
    const getCssClass = (percentage) => percentage >= 80 ? 'good' : percentage >= 50 ? 'medium' : 'bad';
    
    return `
      <tr>
        <td>${file.path}</td>
        <td class="percentage ${getCssClass(file.statements.percentage)}">
          ${file.statements.percentage.toFixed(2)}%
          <small>(${file.statements.covered}/${file.statements.total})</small>
        </td>
        <td class="percentage ${getCssClass(file.branches.percentage)}">
          ${file.branches.percentage.toFixed(2)}%
          <small>(${file.branches.covered}/${file.branches.total})</small>
        </td>
        <td class="percentage ${getCssClass(file.functions.percentage)}">
          ${file.functions.percentage.toFixed(2)}%
          <small>(${file.functions.covered}/${file.functions.total})</small>
        </td>
        <td class="percentage ${getCssClass(file.lines.percentage)}">
          ${file.lines.percentage.toFixed(2)}%
          <small>(${file.lines.covered}/${file.lines.total})</small>
        </td>
      </tr>
    `;
  }

  /**
   * Generate JSON report
   * @param {Object} coverage - Coverage data
   * @returns {string} JSON report
   */
  generateJSONReport(coverage = null) {
    const data = coverage || this.getCoverageData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate all configured reports
   * @returns {Object} Generated reports
   */
  generateReports() {
    const coverage = this.getCoverageData();
    const reports = {};
    
    for (const format of this.options.reportFormats) {
      switch (format) {
        case 'text':
          reports.text = this.generateTextReport(coverage);
          break;
        case 'html':
          reports.html = this.generateHTMLReport(coverage);
          break;
        case 'json':
          reports.json = this.generateJSONReport(coverage);
          break;
      }
    }
    
    return reports;
  }
}

/**
 * Create a coverage reporter with default options
 * @param {Object} options - Reporter options
 * @returns {CoverageReporter} Coverage reporter instance
 */
export function createCoverageReporter(options = {}) {
  return new CoverageReporter(options);
}

// Export singleton instance for convenience
export const globalCoverageReporter = new CoverageReporter({
  verbose: true,
  threshold: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
});

export default CoverageReporter;