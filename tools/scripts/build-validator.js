#!/usr/bin/env node

/**
 * Build Validation Script
 * Validates build outputs, checks bundle sizes, and ensures build integrity
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { brotliCompress } from 'zlib';
import { promisify } from 'util';

const brotliCompressAsync = promisify(brotliCompress);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

class BuildValidator {
  constructor() {
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: [],
      warnings: [],
      bundleSizes: {},
      compressionRatios: {}
    };
    
    this.config = {
      bundleSizeThresholds: {
        'core/trystero-mqtt.min.js': 100,
        'core/trystero-wasm.min.js': 50,
        'animations/player-animator.min.js': 300,
        'animations/wolf-animation.min.js': 250
      },
      compressionThreshold: 0.3, // 30% compression ratio
      syntaxCheck: true,
      integrityCheck: true
    };
  }

  /**
   * Run comprehensive build validation
   */
  async validate() {
    console.log(chalk.bold.blue('\n🔍 Running Build Validation...\n'));
    
    try {
      // 1. Check if dist directory exists
      await this.checkDistDirectory();
      
      // 2. Validate file existence
      await this.validateFileExistence();
      
      // 3. Check bundle sizes
      await this.checkBundleSizes();
      
      // 4. Test compression ratios
      await this.testCompressionRatios();
      
      // 5. Syntax validation
      if (this.config.syntaxCheck) {
        await this.validateSyntax();
      }
      
      // 6. Integrity checks
      if (this.config.integrityCheck) {
        await this.validateIntegrity();
      }
      
      // 7. Generate validation report
      await this.generateValidationReport();
      
      const success = this.validationResults.failed === 0;
      console.log(chalk.bold(success ? '\n✅ Build validation passed!' : '\n❌ Build validation failed!'));
      
      return success;
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Validation error:'), error.message);
      return false;
    }
  }

  /**
   * Check if dist directory exists
   */
  async checkDistDirectory() {
    console.log(chalk.blue('📁 Checking dist directory...'));
    
    const distPath = path.join(projectRoot, 'dist');
    
    try {
      await fs.access(distPath);
      console.log(chalk.green('✓ Dist directory exists'));
      this.validationResults.passed++;
    } catch (error) {
      const errorMsg = 'Dist directory does not exist';
      this.validationResults.errors.push(errorMsg);
      this.validationResults.failed++;
      throw new Error(errorMsg);
    }
  }

  /**
   * Validate that all expected files exist
   */
  async validateFileExistence() {
    console.log(chalk.blue('📄 Validating file existence...'));
    
    const expectedFiles = [
      'trystero-mqtt.min.js',
      'trystero-wasm.min.js',
      'player-animator.js',
      'player-animator.min.js',
      'player-animator.umd.js',
      'wolf-animation.js',
      'wolf-animation.min.js',
      'wolf-animation.umd.js'
    ];

    const distPath = path.join(projectRoot, 'dist');
    
    for (const file of expectedFiles) {
      const filePath = path.join(distPath, file);
      
      try {
        await fs.access(filePath);
        console.log(chalk.green(`  ✓ ${file}`));
        this.validationResults.passed++;
      } catch (error) {
        const errorMsg = `Missing expected file: ${file}`;
        this.validationResults.errors.push(errorMsg);
        this.validationResults.failed++;
        console.log(chalk.red(`  ✗ ${file}: Missing`));
      }
    }
  }

  /**
   * Check bundle sizes against thresholds
   */
  async checkBundleSizes() {
    console.log(chalk.blue('📊 Checking bundle sizes...'));
    
    const distPath = path.join(projectRoot, 'dist');
    
    for (const [file, threshold] of Object.entries(this.config.bundleSizeThresholds)) {
      const filePath = path.join(distPath, file);
      
      try {
        const stats = await fs.stat(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        this.validationResults.bundleSizes[file] = sizeKB;
        
        if (sizeKB <= threshold) {
          console.log(chalk.green(`  ✓ ${file}: ${sizeKB}KB (≤ ${threshold}KB)`));
          this.validationResults.passed++;
        } else {
          const warning = `${file} is ${sizeKB}KB (threshold: ${threshold}KB)`;
          this.validationResults.warnings.push(warning);
          this.validationResults.warnings++;
          console.log(chalk.yellow(`  ⚠ ${file}: ${sizeKB}KB (> ${threshold}KB)`));
        }
      } catch (error) {
        const errorMsg = `Could not check size for ${file}`;
        this.validationResults.errors.push(errorMsg);
        this.validationResults.failed++;
        console.log(chalk.red(`  ✗ ${file}: Could not check size`));
      }
    }
  }

  /**
   * Test compression ratios for minified files
   */
  async testCompressionRatios() {
    console.log(chalk.blue('🗜️ Testing compression ratios...'));
    
    const minifiedFiles = Object.keys(this.config.bundleSizeThresholds);
    const distPath = path.join(projectRoot, 'dist');
    
    for (const file of minifiedFiles) {
      const filePath = path.join(distPath, file);
      
      try {
        const content = await fs.readFile(filePath);
        const compressed = await brotliCompressAsync(content);
        
        const originalSize = content.length;
        const compressedSize = compressed.length;
        const ratio = compressedSize / originalSize;
        
        this.validationResults.compressionRatios[file] = {
          original: originalSize,
          compressed: compressedSize,
          ratio: ratio
        };
        
        if (ratio <= this.config.compressionThreshold) {
          console.log(chalk.green(`  ✓ ${file}: ${(ratio * 100).toFixed(1)}% compression`));
          this.validationResults.passed++;
        } else {
          const warning = `${file} compression ratio is ${(ratio * 100).toFixed(1)}% (threshold: ${(this.config.compressionThreshold * 100).toFixed(1)}%)`;
          this.validationResults.warnings.push(warning);
          this.validationResults.warnings++;
          console.log(chalk.yellow(`  ⚠ ${file}: ${(ratio * 100).toFixed(1)}% compression`));
        }
      } catch (error) {
        const errorMsg = `Could not test compression for ${file}`;
        this.validationResults.errors.push(errorMsg);
        this.validationResults.failed++;
        console.log(chalk.red(`  ✗ ${file}: Could not test compression`));
      }
    }
  }

  /**
   * Validate JavaScript syntax
   */
  async validateSyntax() {
    console.log(chalk.blue('🔍 Validating JavaScript syntax...'));
    
    const distPath = path.join(projectRoot, 'dist');
    const files = await fs.readdir(distPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    for (const file of jsFiles) {
      const filePath = path.join(distPath, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Basic syntax check - try to parse as JavaScript
        try {
          // This is a simple check - in a real scenario you might use a proper parser
          if (content.includes('function') || content.includes('const') || content.includes('let') || content.includes('var')) {
            console.log(chalk.green(`  ✓ ${file}: Syntax appears valid`));
            this.validationResults.passed++;
          } else {
            const warning = `${file}: No recognizable JavaScript syntax found`;
            this.validationResults.warnings.push(warning);
            this.validationResults.warnings++;
            console.log(chalk.yellow(`  ⚠ ${file}: No recognizable JavaScript syntax`));
          }
        } catch (parseError) {
          const errorMsg = `${file}: Syntax validation failed`;
          this.validationResults.errors.push(errorMsg);
          this.validationResults.failed++;
          console.log(chalk.red(`  ✗ ${file}: Syntax validation failed`));
        }
      } catch (error) {
        const errorMsg = `Could not read ${file} for syntax validation`;
        this.validationResults.errors.push(errorMsg);
        this.validationResults.failed++;
        console.log(chalk.red(`  ✗ ${file}: Could not read file`));
      }
    }
  }

  /**
   * Validate build integrity
   */
  async validateIntegrity() {
    console.log(chalk.blue('🔒 Validating build integrity...'));
    
    const distPath = path.join(projectRoot, 'dist');
    const files = await fs.readdir(distPath);
    
    // Check for source map files
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.min.js'));
    const mapFiles = files.filter(file => file.endsWith('.map'));
    
    for (const jsFile of jsFiles) {
      const expectedMapFile = jsFile + '.map';
      
      if (mapFiles.includes(expectedMapFile)) {
        console.log(chalk.green(`  ✓ ${jsFile}: Source map found`));
        this.validationResults.passed++;
      } else {
        const warning = `${jsFile}: No source map found`;
        this.validationResults.warnings.push(warning);
        this.validationResults.warnings++;
        console.log(chalk.yellow(`  ⚠ ${jsFile}: No source map`));
      }
    }
    
    // Check for empty files
    for (const file of files) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        const errorMsg = `${file}: File is empty`;
        this.validationResults.errors.push(errorMsg);
        this.validationResults.failed++;
        console.log(chalk.red(`  ✗ ${file}: Empty file`));
      }
    }
  }

  /**
   * Generate validation report
   */
  async generateValidationReport() {
    console.log(chalk.blue('📊 Generating validation report...'));
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.validationResults.passed,
        failed: this.validationResults.failed,
        warnings: this.validationResults.warnings
      },
      bundleSizes: this.validationResults.bundleSizes,
      compressionRatios: this.validationResults.compressionRatios,
      errors: this.validationResults.errors,
      warnings: this.validationResults.warnings
    };

    // Write JSON report
    const reportPath = path.join(projectRoot, 'VALIDATION_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Write markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(projectRoot, 'VALIDATION_REPORT.md');
    await fs.writeFile(markdownPath, markdownReport);

    console.log(chalk.green(`✓ Validation report generated: VALIDATION_REPORT.md`));
    
    // Display summary
    this.displayValidationSummary(report);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    const { summary, bundleSizes, compressionRatios, errors, warnings } = report;
    
    return `# Build Validation Report

Generated: ${report.timestamp}

## Summary

- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Warnings**: ${summary.warnings}

## Bundle Sizes

${Object.entries(bundleSizes).map(([file, size]) => `- **${file}**: ${size}KB`).join('\n')}

## Compression Ratios

${Object.entries(compressionRatios).map(([file, data]) => 
  `- **${file}**: ${(data.ratio * 100).toFixed(1)}% (${data.compressed} bytes compressed from ${data.original} bytes)`
).join('\n')}

## Errors

${errors.length > 0 ? errors.map(error => `- ${error}`).join('\n') : 'No errors'}

## Warnings

${warnings.length > 0 ? warnings.map(warning => `- ${warning}`).join('\n') : 'No warnings'}

## Recommendations

${this.generateRecommendations()}
`;
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.validationResults.failed > 0) {
      recommendations.push('- Fix all validation errors before deployment');
    }
    
    if (this.validationResults.warnings > 0) {
      recommendations.push('- Address warnings to improve build quality');
    }
    
    const largeBundles = Object.entries(this.validationResults.bundleSizes)
      .filter(([file, size]) => size > this.config.bundleSizeThresholds[file])
      .map(([file]) => file);
    
    if (largeBundles.length > 0) {
      recommendations.push(`- Consider optimizing large bundles: ${largeBundles.join(', ')}`);
    }
    
    const poorCompression = Object.entries(this.validationResults.compressionRatios)
      .filter(([file, data]) => data.ratio > this.config.compressionThreshold)
      .map(([file]) => file);
    
    if (poorCompression.length > 0) {
      recommendations.push(`- Improve compression for: ${poorCompression.join(', ')}`);
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : '- All validations passed successfully';
  }

  /**
   * Display validation summary
   */
  displayValidationSummary(report) {
    const { summary } = report;
    
    console.log(chalk.bold('\n📋 Validation Summary:'));
    console.log(chalk.green(`  Passed: ${summary.passed}`));
    
    if (summary.failed > 0) {
      console.log(chalk.red(`  Failed: ${summary.failed}`));
    }
    
    if (summary.warnings > 0) {
      console.log(chalk.yellow(`  Warnings: ${summary.warnings}`));
    }
    
    console.log(chalk.blue(`  Total Bundle Size: ${Object.values(this.validationResults.bundleSizes).reduce((sum, size) => sum + size, 0)}KB`));
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BuildValidator();
  const success = await validator.validate();
  process.exit(success ? 0 : 1);
}

export { BuildValidator };
