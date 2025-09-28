#!/usr/bin/env node

/**
 * GitHub Pages Deployment Validation Script
 *
 * This script validates that all required files are present for GitHub Pages deployment
 * and checks that the deployment structure is correct.
 */

import { readFileSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const publicPath = join(projectRoot, 'public')

console.log(chalk.bold.blue('\nÃ°Å¸â€Â Validating GitHub Pages Deployment...\n'))

console.log(chalk.blue('Ã°Å¸â€œÂ Checking public directory structure...'))

class GitHubPagesValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.requiredFiles = [
      'index.html',
      'favicon.ico',
      'game.wasm',
      'game-host.wasm'
    ]
    this.requiredDirectories = [
      'core',
      'animations',
      'assets',
      'images'
    ]
    this.optionalFiles = [
      'site.js',
      'serve-modules.js',
      'trystero-wasm.min.js'
    ]
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue('Ã°Å¸â€œÂ Checking docs directory structure...'))
    await this.checkDirectoryStructure()
    
    console.log(chalk.blue('Ã°Å¸â€œâ€ž Checking required files...'))
    await this.checkRequiredFiles()
    
        // Dist folder is not shipped in public/; skip checking its contents\n    
    console.log(chalk.blue('Ã°Å¸Å’Â Checking WASM files...'))
    await this.checkWasmFiles()
    
    console.log(chalk.blue('Ã°Å¸â€Â§ Checking Jekyll configuration...'))
    await this.checkJekyllConfig()
    
    console.log(chalk.blue('Ã°Å¸â€œÅ  Checking file sizes...'))
    await this.checkFileSizes()
    
    this.displayResults()
    return this.errors.length === 0
  }

  /**
   * Check directory structure
   */
  async checkDirectoryStructure() {
    if (!existsSync(publicPath)) {
      this.errors.push('public/ directory does not exist')
      return
    }

    for (const dir of this.requiredDirectories) {
      const dirPath = join(publicPath, dir)
      if (!existsSync(dirPath)) {
        this.warnings.push(`public/${dir}/ directory missing`)
      } else {
        console.log(chalk.green(`  Ã¢Å“â€¦ public/${dir}/ exists`))
      }
    }
  }

  /**
   * Check required files
   */
  async checkRequiredFiles() {
    for (const file of this.requiredFiles) {
      const filePath = join(publicPath, file)
      if (!existsSync(filePath)) {
        this.errors.push(`Required file public/${file} is missing`)
      } else {
        console.log(chalk.green(`  Ã¢Å“â€¦ public/${file} exists`))
      }
    }

    for (const file of this.optionalFiles) {
      const filePath = join(publicPath, file)
      if (existsSync(filePath)) {
        console.log(chalk.green(`  Ã¢Å“â€¦ public/${file} exists`))
      } else {
        console.log(chalk.yellow(`  Ã¢Å¡Â Ã¯Â¸Â  public/${file} missing (optional)`))
      }
    }
  }

  /**
   * Check dist folder contents
   */
  async checkDistFolder() {
    const distPath = join(publicPath, 'dist')
    if (!existsSync(distPath)) {
      this.errors.push('public/dist/ directory is missing')
      return
    }

    const expectedDistContents = [
      'core',
      'animations',
      'wasm',
      'sourcemaps',
      'reports',
      'index.js',
      'README.md'
    ]

    for (const item of expectedDistContents) {
      const itemPath = join(distPath, item)
      if (!existsSync(itemPath)) {
        this.warnings.push(`public/dist/${item} missing`)
      } else {
        console.log(chalk.green(`  Ã¢Å“â€¦ public/dist/${item} exists`))
      }
    }
  }

  /**
   * Check WASM files
   */
  async checkWasmFiles() {
    const wasmFiles = ['game.wasm', 'game-host.wasm']

    for (const wasmFile of wasmFiles) {
      const wasmPath = join(publicPath, wasmFile)
      if (existsSync(wasmPath)) {
        const stats = statSync(wasmPath)
        const sizeKB = Math.round(stats.size / 1024)
        console.log(chalk.green(`  Ã¢Å“â€¦ public/${wasmFile} exists (${sizeKB}KB)`))

        if (stats.size === 0) {
          this.errors.push(`public/${wasmFile} is empty`)
        }
      } else {
        this.errors.push(`public/${wasmFile} is missing`)
      }
    }
  }

  /**
   * Check Jekyll configuration
   */
  async checkJekyllConfig() {
    const configPath = join(publicPath, '_config.yml')
    if (!existsSync(configPath)) {
      this.errors.push('public/_config.yml is missing')
      return
    }

    try {
      const configContent = readFileSync(configPath, 'utf8')

      // Check for required configurations
      const requiredConfigs = [
        'title:',
        'description:',
        'baseurl:',
        'include:',
        'defaults:'
      ]

      for (const config of requiredConfigs) {
        if (configContent.includes(config)) {
          console.log(chalk.green(`  Ã¢Å“â€¦ _config.yml contains ${config}`))
        } else {
          this.warnings.push(`_config.yml missing ${config}`)
        }
      }

      // Check for WASM MIME type configuration
      if (configContent.includes('application/wasm')) {
        console.log(chalk.green(`  Ã¢Å“â€¦ _config.yml has WASM MIME type configuration`))
      } else {
        this.warnings.push('_config.yml missing WASM MIME type configuration')
      }

    } catch (error) {
      this.errors.push(`Error reading _config.yml: ${error.message}`)
    }
  }

  /**
   * Check file sizes
   */
  async checkFileSizes() {
    const filesToCheck = [
      { path: 'index.html', maxSize: 100 }, // 100KB
      { path: 'game.wasm', minSize: 10 },   // 10KB minimum
      { path: 'game-host.wasm', minSize: 10 } // 10KB minimum
    ]

    for (const file of filesToCheck) {
      const filePath = join(publicPath, file.path)
      if (existsSync(filePath)) {
        const stats = statSync(filePath)
        const sizeKB = Math.round(stats.size / 1024)

        if (file.maxSize && sizeKB > file.maxSize) {
          this.warnings.push(`public/${file.path} is large (${sizeKB}KB > ${file.maxSize}KB)`)
        } else if (file.minSize && sizeKB < file.minSize) {
          this.warnings.push(`public/${file.path} is small (${sizeKB}KB < ${file.minSize}KB)`)
        } else {
          console.log(chalk.green(`  Ã¢Å“â€¦ public/${file.path} size OK (${sizeKB}KB)`))
        }
      }
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    console.log(chalk.bold.blue('\nÃ°Å¸â€œÅ  Validation Results:\n'))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('Ã¢Å“â€¦ All checks passed! Deployment is ready.'))
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold('Ã¢ÂÅ’ Errors found:'))
        this.errors.forEach(error => {
          console.log(chalk.red(`  Ã¢â‚¬Â¢ ${error}`))
        })
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold('\nÃ¢Å¡Â Ã¯Â¸Â  Warnings:'))
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  Ã¢â‚¬Â¢ ${warning}`))
        })
      }
    }

    console.log(chalk.blue('\nÃ°Å¸â€œâ€¹ Deployment Checklist:'))
    console.log(chalk.blue('  Ã¢â€“Â¡ GitHub Pages enabled in repository settings'))
    console.log(chalk.blue('  Ã¢â€“Â¡ GitHub Actions permissions configured'))
    console.log(chalk.blue('  Ã¢â€“Â¡ Workflow file exists (.github/workflows/deploy.yml)'))
    console.log(chalk.blue('  Ã¢â€“Â¡ All required files present in public/'))
    console.log(chalk.blue('  Ã¢â€“Â¡ WASM files have correct MIME types'))
    console.log(chalk.blue('  Ã¢â€“Â¡ Jekyll configuration is valid'))

    if (this.errors.length === 0) {
      console.log(chalk.green.bold('\nÃ°Å¸Å¡â‚¬ Ready for deployment!'))
      console.log(chalk.blue('Push to main branch to trigger automatic deployment.'))
    } else {
      console.log(chalk.red.bold('\nÃ¢ÂÅ’ Fix errors before deploying'))
    }
  }
}

// Run validation if called directly
if (process.argv[1] && process.argv[1].endsWith('validate-github-pages.js')) {
  const validator = new GitHubPagesValidator()
  const success = await validator.validate()
  process.exit(success ? 0 : 1)
}

export { GitHubPagesValidator }
