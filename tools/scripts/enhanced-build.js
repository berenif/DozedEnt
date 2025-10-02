#!/usr/bin/env node

/**
 * Enhanced Build Script
 * Integrates dead code elimination, memory optimization, and comprehensive build validation
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { MemoryOptimizer } from '../../public/src/utils/memory-optimizer.js';
import { DistOrganizer } from './dist-organizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

class EnhancedBuildSystem {
  constructor() {
    this.startTime = Date.now();
    this.buildStats = {
      modulesBuilt: 0,
      totalSize: 0,
      optimizationSavings: 0,
      errors: [],
      warnings: []
    };
    
    this.memoryOptimizer = new MemoryOptimizer();
    
    console.log('Enhanced build system initialized');
    
    this.config = {
      parallel: true,
      optimize: true,
      validate: true,
      generateReport: true,
      cleanDist: true
    };
  }

  /**
   * Run the enhanced build process
   */
  async build() {
    console.log(chalk.bold.blue('\n🚀 Starting Enhanced Build Process...\n'));
    console.log('About to start build process...');
    
    try {
      // 1. Pre-build validation (skip since npm prebuild already ran)
      console.log(chalk.blue('🔍 Pre-build checks already completed by npm prebuild'));
      
      // 2. Clean dist directory
      if (this.config.cleanDist) {
        await this.cleanDistDirectory();
      }
      
      // 3. Build WASM files
      await this.buildWasm();
      
      // 4. Run builds in parallel
      await this.runBuilds();
      
      // 5. Post-build optimization
      if (this.config.optimize) {
        await this.runPostBuildOptimization();
      }
      
      // 6. Validate builds
      if (this.config.validate) {
        await this.validateBuilds();
      }
      
      // 7. Copy WASM files
      await this.copyWasmFiles();
      
      // 8. Organize dist folder structure
      await this.organizeDistFolder();
      
      // 9. Generate report
      if (this.config.generateReport) {
        await this.generateBuildReport();
      }
      
      const duration = Date.now() - this.startTime;
      console.log(chalk.green.bold(`\n✅ Build completed successfully in ${duration}ms\n`));
      
      return true;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Build failed:'), error.message);
      this.buildStats.errors.push(error.message);
      await this.generateBuildReport();
      return false;
    }
  }

  /**
   * Run pre-build validation checks
   */
  async runPreBuildChecks() {
    console.log(chalk.blue('🔍 Running pre-build checks...'));
    
    try {
      // Run the existing pre-build check script
      execSync('node tools/scripts/pre-build-check.js', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      console.log(chalk.green('✓ Pre-build checks passed'));
    } catch (error) {
      throw new Error(`Pre-build checks failed: ${error.message}`);
    }
  }

  /**
   * Clean the dist directory
   */
  async cleanDistDirectory() {
    console.log(chalk.blue('🧹 Cleaning dist directory...'));
    
    const distPath = path.join(projectRoot, 'dist');
    
    try {
      await fs.access(distPath);
      const files = await fs.readdir(distPath);
      
      for (const file of files) {
        await fs.unlink(path.join(distPath, file));
      }
      
      console.log(chalk.green(`✓ Cleaned ${files.length} files from dist directory`));
    } catch (error) {
      // Dist directory doesn't exist, that's fine
      console.log(chalk.yellow('ℹ Dist directory does not exist, will be created'));
    }
  }

  /**
   * Build WASM files
   */
  async buildWasm() {
    console.log(chalk.blue('🔧 Building WASM files...'));
    
    try {
      const startTime = Date.now();
      execSync('npm run wasm:build', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      const duration = Date.now() - startTime;
      console.log(chalk.green(`✓ WASM build completed successfully (${duration}ms)`));
    } catch (error) {
      // WASM build failure is not fatal - log warning and continue
      const warning = `WASM build failed: ${error.message}`;
      this.buildStats.warnings.push(warning);
      console.log(chalk.yellow(`⚠ ${warning} - continuing with build process`));
    }
  }

  /**
   * Run all builds in parallel
   */
  async runBuilds() {
    console.log(chalk.blue('🔨 Running builds...'));
    
    const buildTasks = [
      { name: 'Core Modules', command: 'npm run build:core' },
      { name: 'Player Animations', command: 'npm run build:animations' },
      { name: 'Wolf Animations', command: 'npm run build:wolf' }
    ];

    if (this.config.parallel) {
      // Run builds in parallel
      const promises = buildTasks.map(task => this.runBuildTask(task));
      await Promise.all(promises);
    } else {
      // Run builds sequentially
      for (const task of buildTasks) {
        await this.runBuildTask(task);
      }
    }
  }

  /**
   * Run a single build task
   */
  async runBuildTask(task) {
    return new Promise((resolve, reject) => {
      console.log(chalk.blue(`  📦 Building ${task.name}...`));
      
      const startTime = Date.now();
      const scriptName = task.command.replace('npm run ', '');
      const child = spawn('npm', ['run', scriptName], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          console.log(chalk.green(`  ✓ ${task.name} built successfully (${duration}ms)`));
          this.buildStats.modulesBuilt++;
          resolve();
        } else {
          const error = `Build failed for ${task.name}: ${stderr}`;
          console.log(chalk.red(`  ✗ ${task.name} failed`));
          this.buildStats.errors.push(error);
          reject(new Error(error));
        }
      });

      child.on('error', (error) => {
        const errorMsg = `Failed to start build for ${task.name}: ${error.message}`;
        this.buildStats.errors.push(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }

  /**
   * Run post-build optimization
   */
  async runPostBuildOptimization() {
    console.log(chalk.blue('⚡ Running post-build optimization...'));
    
    try {
      // Dead code eliminator module has been removed; skip optimization step
      this.buildStats.optimizationSavings = 0;
      console.log(chalk.yellow('ℹ Dead code elimination is disabled (module removed)'));
      
    } catch (error) {
      this.buildStats.warnings.push(`Post-build optimization failed: ${error.message}`);
      console.log(chalk.yellow(`⚠ Post-build optimization failed: ${error.message}`));
    }
  }

  /**
   * Validate built files
   */
  async validateBuilds() {
    console.log(chalk.blue('🔍 Validating builds...'));
    
    const distPath = path.join(projectRoot, 'dist');
    const expectedFiles = [
      // Core modules
      'core/trystero-firebase.min.js',
      'core/trystero-ipfs.min.js',
      'core/trystero-mqtt.min.js',
      'core/trystero-nostr.min.js',
      'core/trystero-supabase.min.js',
      'core/trystero-torrent.min.js',
      'core/trystero-wasm.min.js',
      
      // Animation modules
      'animations/player-animator.js',
      'animations/player-animator.min.js',
      'animations/player-animator.umd.js',
      'animations/wolf-animation.js',
      'animations/wolf-animation.min.js',
      'animations/wolf-animation.umd.js',
      
      // Index files
      'core/index.js',
      'animations/index.js',
      'index.js'
    ];

    let totalSize = 0;
    const fileSizes = {};

    for (const file of expectedFiles) {
      const filePath = path.join(distPath, file);
      
      try {
        const stats = await fs.stat(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        totalSize += stats.size;
        fileSizes[file] = sizeKB;
        
        console.log(chalk.green(`  ✓ ${file}: ${sizeKB}KB`));
      } catch (error) {
        const errorMsg = `Missing expected file: ${file}`;
        this.buildStats.errors.push(errorMsg);
        console.log(chalk.red(`  ✗ ${file}: Missing`));
      }
    }

    this.buildStats.totalSize = totalSize;
    this.buildStats.fileSizes = fileSizes;

    // Check for bundle size regressions
    await this.checkBundleSizeRegressions(fileSizes);
  }

  /**
   * Check for bundle size regressions
   */
  async checkBundleSizeRegressions(fileSizes) {
    const bundleSizeThresholds = {
      'core/trystero-firebase.min.js': 200,
      'core/trystero-ipfs.min.js': 150,
      'core/trystero-mqtt.min.js': 100,
      'core/trystero-nostr.min.js': 50,
      'core/trystero-supabase.min.js': 120,
      'core/trystero-torrent.min.js': 180,
      'core/trystero-wasm.min.js': 50,
      'animations/player-animator.min.js': 300,
      'animations/wolf-animation.min.js': 250
    };

    for (const [file, threshold] of Object.entries(bundleSizeThresholds)) {
      const size = fileSizes[file];
      if (size && size > threshold) {
        const warning = `Bundle size warning: ${file} is ${size}KB (threshold: ${threshold}KB)`;
        this.buildStats.warnings.push(warning);
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }
  }

  /**
   * Copy WASM files to dist directory
   */
  async copyWasmFiles() {
    console.log(chalk.blue('📦 Copying WASM files...'));
    
    const wasmFiles = [
      { source: 'public/src/wasm/game.wasm', target: 'dist/wasm/game.wasm' },
      { source: 'public/src/wasm/game-host.wasm', target: 'dist/wasm/game-host.wasm' }
    ];
    
    for (const { source, target } of wasmFiles) {
      const sourcePath = path.join(projectRoot, source);
      const targetPath = path.join(projectRoot, target);
      
      try {
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, targetPath);
        console.log(chalk.green(`  ✓ Copied ${source} → ${target}`));
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(chalk.yellow(`  ⚠ ${source} not found (may need to build WASM first)`));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Organize dist folder structure
   */
  async organizeDistFolder() {
    console.log(chalk.blue('📁 Organizing dist folder structure...'));
    
    try {
      const organizer = new DistOrganizer();
      await organizer.organize();
      console.log(chalk.green('✓ Dist folder organized'));
    } catch (error) {
      this.buildStats.warnings.push(`Dist organization failed: ${error.message}`);
      console.log(chalk.yellow(`⚠ Dist organization failed: ${error.message}`));
    }
  }

  /**
   * Generate comprehensive build report
   */
  async generateBuildReport() {
    console.log(chalk.blue('📊 Generating build report...'));
    
    const duration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      stats: this.buildStats,
      memoryStats: this.memoryOptimizer.getMemoryStats(),
      poolEfficiency: this.memoryOptimizer.getPoolEfficiency(),
      optimizationReport: {
        summary: {
          filesProcessed: 0,
          totalBytesRemoved: 0,
          consoleStatementsRemoved: 0,
          unusedImportsRemoved: 0
        },
        recommendations: []
      }
    };

    // Write JSON report
    const reportPath = path.join(projectRoot, 'BUILD_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Write markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(projectRoot, 'BUILD_REPORT.md');
    await fs.writeFile(markdownPath, markdownReport);

    console.log(chalk.green(`✓ Build report generated: BUILD_REPORT.md`));
    
    // Display summary
    this.displayBuildSummary(report);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    const { stats, duration, timestamp } = report;
    
    return `# Build Report

Generated: ${timestamp}
Duration: ${duration}ms

## Summary

- **Modules Built**: ${stats.modulesBuilt}
- **Total Size**: ${Math.round(stats.totalSize / 1024)}KB
- **Optimization Savings**: ${stats.optimizationSavings} bytes
- **Errors**: ${stats.errors.length}
- **Warnings**: ${stats.warnings.length}

## File Sizes

${Object.entries(stats.fileSizes || {}).map(([file, size]) => `- **${file}**: ${size}KB`).join('\n')}

## Errors

${stats.errors.length > 0 ? stats.errors.map(error => `- ${error}`).join('\n') : 'No errors'}

## Warnings

${stats.warnings.length > 0 ? stats.warnings.map(warning => `- ${warning}`).join('\n') : 'No warnings'}

## Memory Optimization

- **Pool Hit Rate**: ${report.poolEfficiency.hitRate}
- **Total Allocations**: ${report.poolEfficiency.allocations}
- **Total Deallocations**: ${report.poolEfficiency.deallocations}

## Dead Code Elimination

- **Files Processed**: ${report.optimizationReport.summary.filesProcessed}
- **Bytes Removed**: ${report.optimizationReport.summary.totalBytesRemoved}
- **Console Statements Removed**: ${report.optimizationReport.summary.consoleStatementsRemoved}
- **Unused Imports Removed**: ${report.optimizationReport.summary.unusedImportsRemoved}

## Recommendations

${report.optimizationReport.recommendations.map(rec => `- **${rec.type}**: ${rec.message} (${rec.impact} impact)`).join('\n')}
`;
  }

  /**
   * Display build summary
   */
  displayBuildSummary(report) {
    const { stats } = report;
    
    console.log(chalk.bold('\n📋 Build Summary:'));
    console.log(chalk.blue(`  Modules Built: ${stats.modulesBuilt}`));
    console.log(chalk.blue(`  Total Size: ${Math.round(stats.totalSize / 1024)}KB`));
    console.log(chalk.green(`  Optimization Savings: ${stats.optimizationSavings} bytes`));
    
    if (stats.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${stats.errors.length}`));
    }
    
    if (stats.warnings.length > 0) {
      console.log(chalk.yellow(`  Warnings: ${stats.warnings.length}`));
    }
    
    console.log(chalk.blue(`  Memory Pool Hit Rate: ${report.poolEfficiency.hitRate}`));
  }
}

// Run enhanced build if called directly
if (process.argv[1] && process.argv[1].endsWith('enhanced-build.js')) {
  const buildSystem = new EnhancedBuildSystem();
  const success = await buildSystem.build();
  process.exit(success ? 0 : 1);
}

export { EnhancedBuildSystem };
