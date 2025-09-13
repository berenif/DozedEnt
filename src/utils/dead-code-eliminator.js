/**
 * Dead Code Elimination System
 * Identifies and removes unused variables, functions, and imports
 */

export class DeadCodeEliminator {
  constructor() {
    this.unusedVariables = new Set();
    this.unusedFunctions = new Set();
    this.unusedImports = new Set();
    this.consoleStatements = new Set();
    
    this.config = {
      removeConsoleInProduction: true,
      removeDebugCode: true,
      removeUnusedImports: true,
      removeUnusedVariables: true,
      removeComments: false, // Keep comments by default
      minifyWhitespace: true
    };

    this.stats = {
      filesProcessed: 0,
      bytesRemoved: 0,
      consoleStatementsRemoved: 0,
      unusedImportsRemoved: 0,
      unusedVariablesRemoved: 0
    };
  }

  /**
   * Analyze file for dead code
   * @param {string} content - File content
   * @param {string} filePath - File path for context
   * @returns {Object} Analysis results
   */
  analyzeFile(content) {
    const analysis = {
      unusedImports: [],
      unusedVariables: [],
      consoleStatements: [],
      debugBlocks: [],
      potentialDeadCode: []
    };

    const lines = content.split('\n');
    const importedSymbols = new Map();
    const declaredVariables = new Map();
    const usedSymbols = new Set();
    
    let inCommentBlock = false;
    // let inDebugBlock = false; // Not used in current implementation

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Handle comment blocks
      if (trimmedLine.includes('/*')) {
        inCommentBlock = true;
      }
      if (trimmedLine.includes('*/')) {
        inCommentBlock = false;
      }
      if (inCommentBlock) {
        continue;
      }

      // Skip single-line comments
      if (trimmedLine.startsWith('//')) {
        continue;
      }

      // Detect debug blocks
      if (trimmedLine.includes('// DEBUG START')) {
        inDebugBlock = true;
        analysis.debugBlocks.push({ start: i + 1 });
        continue;
      }
      if (trimmedLine.includes('// DEBUG END')) {
        inDebugBlock = false;
        if (analysis.debugBlocks.length > 0) {
          analysis.debugBlocks[analysis.debugBlocks.length - 1].end = i + 1;
        }
        continue;
      }

      // Detect imports
      const importMatch = trimmedLine.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const [, namedImports, namespaceImport, defaultImport, modulePath] = importMatch;
        
        if (namedImports) {
          namedImports.split(',').forEach(symbol => {
            const cleanSymbol = symbol.trim().replace(/\s+as\s+\w+/, '');
            importedSymbols.set(cleanSymbol, { line: i + 1, module: modulePath });
          });
        }
        
        if (namespaceImport) {
          importedSymbols.set(namespaceImport, { line: i + 1, module: modulePath });
        }
        
        if (defaultImport) {
          importedSymbols.set(defaultImport, { line: i + 1, module: modulePath });
        }
      }

      // Detect variable declarations
      const varMatch = trimmedLine.match(/(?:let|const|var)\s+(\w+)/);
      if (varMatch) {
        const varName = varMatch[1];
        declaredVariables.set(varName, { line: i + 1, type: 'variable' });
      }

      // Detect function declarations
      const funcMatch = trimmedLine.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{))/);
      if (funcMatch) {
        const funcName = funcMatch[1] || funcMatch[2];
        declaredVariables.set(funcName, { line: i + 1, type: 'function' });
      }

      // Detect console statements
      const consoleMatch = trimmedLine.match(/console\.(log|warn|error|info|debug|trace)/);
      if (consoleMatch) {
        analysis.consoleStatements.push({
          line: i + 1,
          type: consoleMatch[1],
          content: trimmedLine
        });
      }

      // Track symbol usage (simple heuristic)
      for (const [symbol] of [...importedSymbols, ...declaredVariables]) {
        if (trimmedLine.includes(symbol) && !trimmedLine.startsWith('import') && !trimmedLine.includes(`${symbol} =`)) {
          usedSymbols.add(symbol);
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

    // Find unused variables/functions
    for (const [symbol, info] of declaredVariables) {
      if (!usedSymbols.has(symbol) && !symbol.startsWith('_')) { // Skip private variables
        analysis.unusedVariables.push({
          symbol,
          line: info.line,
          type: info.type
        });
      }
    }

    return analysis;
  }

  /**
   * Remove dead code from content
   * @param {string} content - Original content
   * @param {Object} analysis - Analysis results
   * @returns {Object} Optimized content and stats
   */
  eliminateDeadCode(content, analysis = null) {
    if (!analysis) {
      analysis = this.analyzeFile(content);
    }

    let optimized = content;
    const changes = [];
    let bytesRemoved = 0;

    // Remove console statements in production
    if (this.config.removeConsoleInProduction) {
      const consoleRegex = /console\.(log|warn|error|info|debug|trace)\([^)]*\);?\s*/g;
      const originalLength = optimized.length;
      optimized = optimized.replace(consoleRegex, '');
      const removed = originalLength - optimized.length;
      
      if (removed > 0) {
        bytesRemoved += removed;
        changes.push(`Removed console statements (${removed} bytes)`);
        this.stats.consoleStatementsRemoved += analysis.consoleStatements.length;
      }
    }

    // Remove debug blocks
    if (this.config.removeDebugCode) {
      const debugRegex = /\/\/ DEBUG START[\s\S]*?\/\/ DEBUG END\s*/g;
      const originalLength = optimized.length;
      optimized = optimized.replace(debugRegex, '');
      const removed = originalLength - optimized.length;
      
      if (removed > 0) {
        bytesRemoved += removed;
        changes.push(`Removed debug blocks (${removed} bytes)`);
      }
    }

    // Remove unused imports (careful - this is complex)
    if (this.config.removeUnusedImports && analysis.unusedImports.length > 0) {
      const lines = optimized.split('\n');
      const linesToRemove = new Set();

      for (const unusedImport of analysis.unusedImports) {
        const lineIndex = unusedImport.line - 1;
        if (lineIndex < lines.length) {
          const line = lines[lineIndex];
          
          // Only remove if the entire import statement is unused
          const importMatch = line.match(/import\s+{([^}]+)}\s+from/);
          if (importMatch) {
            const imports = importMatch[1].split(',').map(s => s.trim());
            const unusedCount = imports.filter(imp => 
              analysis.unusedImports.some(ui => ui.symbol === imp)
            ).length;
            
            if (unusedCount === imports.length) {
              linesToRemove.add(lineIndex);
            }
          }
        }
      }

      if (linesToRemove.size > 0) {
        const filteredLines = lines.filter((_, index) => !linesToRemove.has(index));
        const newContent = filteredLines.join('\n');
        const removed = optimized.length - newContent.length;
        
        optimized = newContent;
        bytesRemoved += removed;
        changes.push(`Removed ${linesToRemove.size} unused import lines (${removed} bytes)`);
        this.stats.unusedImportsRemoved += linesToRemove.size;
      }
    }

    // Remove TODO/FIXME comments
    const todoRegex = /\/\/ (TODO|FIXME|HACK|XXX):?.*$/gm;
    const originalLength = optimized.length;
    optimized = optimized.replace(todoRegex, '');
    const todoRemoved = originalLength - optimized.length;
    
    if (todoRemoved > 0) {
      bytesRemoved += todoRemoved;
      changes.push(`Removed TODO/FIXME comments (${todoRemoved} bytes)`);
    }

    // Minify whitespace
    if (this.config.minifyWhitespace) {
      const originalLength = optimized.length;
      
      // Remove excessive empty lines
      optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Remove trailing whitespace
      optimized = optimized.replace(/[ \t]+$/gm, '');
      
      // Remove leading whitespace on empty lines
      optimized = optimized.replace(/^\s+$/gm, '');
      
      const whitespaceRemoved = originalLength - optimized.length;
      if (whitespaceRemoved > 0) {
        bytesRemoved += whitespaceRemoved;
        changes.push(`Cleaned up whitespace (${whitespaceRemoved} bytes)`);
      }
    }

    // Update stats
    this.stats.filesProcessed++;
    this.stats.bytesRemoved += bytesRemoved;

    return {
      content: optimized,
      changes,
      bytesRemoved,
      analysis
    };
  }

  /**
   * Process multiple files
   * @param {Object} files - Map of filePath -> content
   * @returns {Object} Results for all files
   */
  processFiles(files) {
    const results = new Map();
    
    for (const [filePath, content] of Object.entries(files)) {
      try {
        const result = this.eliminateDeadCode(content);
        results.set(filePath, result);
        console.log(`✅ Processed ${filePath}: ${result.bytesRemoved} bytes removed`);
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, error);
        results.set(filePath, { error: error.message });
      }
    }

    return results;
  }

  /**
   * Generate optimization report
   */
  generateReport() {
    const totalSavings = this.stats.bytesRemoved;
    const avgSavings = this.stats.filesProcessed > 0 ? totalSavings / this.stats.filesProcessed : 0;

    return {
      summary: {
        filesProcessed: this.stats.filesProcessed,
        totalBytesRemoved: totalSavings,
        averageBytesPerFile: Math.round(avgSavings),
        consoleStatementsRemoved: this.stats.consoleStatementsRemoved,
        unusedImportsRemoved: this.stats.unusedImportsRemoved
      },
      recommendations: this.generateRecommendations(),
      config: this.config
    };
  }

  /**
   * Generate optimization recommendations
   * @private
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.consoleStatementsRemoved > 50) {
      recommendations.push({
        type: 'console_statements',
        message: 'Consider using a logging library with configurable levels instead of console statements',
        impact: 'medium'
      });
    }

    if (this.stats.unusedImportsRemoved > 10) {
      recommendations.push({
        type: 'unused_imports',
        message: 'Consider using a linter with unused import detection during development',
        impact: 'low'
      });
    }

    if (this.stats.bytesRemoved > 100000) { // 100KB
      recommendations.push({
        type: 'significant_savings',
        message: 'Significant dead code detected. Consider implementing automated dead code elimination in your build process',
        impact: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      filesProcessed: 0,
      bytesRemoved: 0,
      consoleStatementsRemoved: 0,
      unusedImportsRemoved: 0,
      unusedVariablesRemoved: 0
    };
  }

  /**
   * Configure elimination options
   */
  configure(options) {
    this.config = { ...this.config, ...options };
  }
}

// Global dead code eliminator instance
export const globalDeadCodeEliminator = new DeadCodeEliminator();
