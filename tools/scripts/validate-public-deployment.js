#!/usr/bin/env node

/**
 * Public Folder Deployment Validation Script
 * 
 * This script validates that the public folder is properly structured
 * for GitHub Pages deployment with all required files and assets.
 */

import { readFileSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const publicPath = join(projectRoot, 'public')

console.log(chalk.bold.blue('\n🔍 Validating Public Folder Deployment...\n'))

class PublicDeploymentValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.requiredFiles = [
      'index.html',
      'favicon.ico',
      'game.wasm',
      'game-host.wasm',
      '_config.yml',
      '.nojekyll',
      'site.js'
    ]
    this.requiredDirectories = [
      'dist',
      'core',
      'animations',
      'assets',
      'images'
    ]
    this.optionalFiles = [
      'serve-modules.js',
      'trystero-wasm.min.js',
      'deployment-info.json'
    ]
    this.optionalDirectories = [
      'src',
      'data',
      'wasm'
    ]
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue('📁 Checking public directory structure...'))
    await this.checkDirectoryStructure()
    
    console.log(chalk.blue('📄 Checking required files...'))
    await this.checkRequiredFiles()
    
    console.log(chalk.blue('📦 Checking dist folder contents...'))
    await this.checkDistFolder()
    
    console.log(chalk.blue('🔧 Checking WASM files...'))
    await this.checkWasmFiles()
    
    console.log(chalk.blue('🌐 Checking core modules...'))
    await this.checkCoreModules()
    
    console.log(chalk.blue('🎭 Checking animation modules...'))
    await this.checkAnimationModules()
    
    console.log(chalk.blue('🎵 Checking assets...'))
    await this.checkAssets()
    
    console.log(chalk.blue('⚙️  Checking Jekyll configuration...'))
    await this.checkJekyllConfig()
    
    console.log(chalk.blue('📊 Checking file sizes...'))
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
        console.log(chalk.green(`  ✅ public/${dir}/ exists`))
      }
    }

    for (const dir of this.optionalDirectories) {
      const dirPath = join(publicPath, dir)
      if (existsSync(dirPath)) {
        console.log(chalk.green(`  ✅ public/${dir}/ exists`))
      } else {
        console.log(chalk.yellow(`  ⚠️  public/${dir}/ missing (optional)`))
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
        console.log(chalk.green(`  ✅ public/${file} exists`))
      }
    }

    for (const file of this.optionalFiles) {
      const filePath = join(publicPath, file)
      if (existsSync(filePath)) {
        console.log(chalk.green(`  ✅ public/${file} exists`))
      } else {
        console.log(chalk.yellow(`  ⚠️  public/${file} missing (optional)`))
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
        console.log(chalk.green(`  ✅ public/dist/${item} exists`))
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
        console.log(chalk.green(`  ✅ public/${wasmFile} exists (${sizeKB}KB)`))
        
        if (stats.size === 0) {
          this.errors.push(`public/${wasmFile} is empty`)
        }
      } else {
        this.errors.push(`public/${wasmFile} is missing`)
      }
    }

    // Check dist/wasm folder
    const distWasmPath = join(publicPath, 'dist', 'wasm')
    if (existsSync(distWasmPath)) {
      console.log(chalk.green(`  ✅ public/dist/wasm/ exists`))
    } else {
      this.warnings.push('public/dist/wasm/ directory missing')
    }

    // Check public/wasm folder
    const publicWasmPath = join(publicPath, 'wasm')
    if (existsSync(publicWasmPath)) {
      console.log(chalk.green(`  ✅ public/wasm/ exists`))
    } else {
      console.log(chalk.yellow(`  ⚠️  public/wasm/ missing (optional)`))
    }
  }

  /**
   * Check core modules
   */
  async checkCoreModules() {
    const corePath = join(publicPath, 'core')
    if (!existsSync(corePath)) {
      this.warnings.push('public/core/ directory missing')
      return
    }

    const expectedCoreFiles = [
      'index.js',
      'trystero-firebase.min.js',
      'trystero-ipfs.min.js',
      'trystero-mqtt.min.js',
      'trystero-supabase.min.js',
      'trystero-torrent.min.js',
      'trystero-wasm.min.js'
    ]

    for (const file of expectedCoreFiles) {
      const filePath = join(corePath, file)
      if (existsSync(filePath)) {
        console.log(chalk.green(`  ✅ public/core/${file} exists`))
      } else {
        this.warnings.push(`public/core/${file} missing`)
      }
    }
  }

  /**
   * Check animation modules
   */
  async checkAnimationModules() {
    const animationsPath = join(publicPath, 'animations')
    if (!existsSync(animationsPath)) {
      this.warnings.push('public/animations/ directory missing')
      return
    }

    const expectedAnimationFiles = [
      'index.js',
      'player-animator.js',
      'player-animator.min.js',
      'player-animator.umd.js',
      'wolf-animation.js',
      'wolf-animation.min.js',
      'wolf-animation.umd.js'
    ]

    for (const file of expectedAnimationFiles) {
      const filePath = join(animationsPath, file)
      if (existsSync(filePath)) {
        console.log(chalk.green(`  ✅ public/animations/${file} exists`))
      } else {
        this.warnings.push(`public/animations/${file} missing`)
      }
    }
  }

  /**
   * Check assets
   */
  async checkAssets() {
    const assetsPath = join(publicPath, 'assets')
    if (!existsSync(assetsPath)) {
      this.warnings.push('public/assets/ directory missing')
      return
    }

    const expectedAssetDirs = [
      'audio',
      'images'
    ]

    for (const dir of expectedAssetDirs) {
      const dirPath = join(assetsPath, dir)
      if (existsSync(dirPath)) {
        console.log(chalk.green(`  ✅ public/assets/${dir}/ exists`))
      } else {
        this.warnings.push(`public/assets/${dir}/ missing`)
      }
    }

    // Check images directory
    const imagesPath = join(publicPath, 'images')
    if (existsSync(imagesPath)) {
      console.log(chalk.green(`  ✅ public/images/ exists`))
    } else {
      this.warnings.push('public/images/ directory missing')
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
          console.log(chalk.green(`  ✅ _config.yml contains ${config}`))
        } else {
          this.warnings.push(`_config.yml missing ${config}`)
        }
      }

      // Check for WASM MIME type configuration
      if (configContent.includes('application/wasm')) {
        console.log(chalk.green(`  ✅ _config.yml has WASM MIME type configuration`))
      } else {
        this.warnings.push('_config.yml missing WASM MIME type configuration')
      }

      // Check for public folder specific configurations
      if (configContent.includes('public/')) {
        console.log(chalk.green(`  ✅ _config.yml configured for public folder`))
      } else {
        this.warnings.push('_config.yml may not be optimized for public folder deployment')
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
      { path: 'game-host.wasm', minSize: 10 }, // 10KB minimum
      { path: 'site.js', maxSize: 50 }       // 50KB
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
          console.log(chalk.green(`  ✅ public/${file.path} size OK (${sizeKB}KB)`))
        }
      }
    }

    // Check dist folder size
    const distPath = join(publicPath, 'dist')
    if (existsSync(distPath)) {
      try {
        const stats = statSync(distPath)
        const sizeMB = Math.round(stats.size / (1024 * 1024))
        console.log(chalk.green(`  ✅ public/dist/ size OK (${sizeMB}MB)`))
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Could not determine public/dist/ size`))
      }
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    console.log(chalk.bold.blue('\n📊 Public Folder Validation Results:\n'))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('✅ All checks passed! Public folder is ready for deployment.'))
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold('❌ Errors found:'))
        this.errors.forEach(error => {
          console.log(chalk.red(`  • ${error}`))
        })
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold('\n⚠️  Warnings:'))
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`))
        })
      }
    }

    console.log(chalk.blue('\n📋 Public Folder Deployment Checklist:'))
    console.log(chalk.blue('  □ GitHub Pages enabled in repository settings'))
    console.log(chalk.blue('  □ GitHub Actions permissions configured'))
    console.log(chalk.blue('  □ Workflow file exists (.github/workflows/deploy-public.yml)'))
    console.log(chalk.blue('  □ All required files present in public/'))
    console.log(chalk.blue('  □ Complete /dist folder copied to public/dist/'))
    console.log(chalk.blue('  □ WASM files available at root and in /wasm/'))
    console.log(chalk.blue('  □ Core modules available at /core/'))
    console.log(chalk.blue('  □ Animation modules available at /animations/'))
    console.log(chalk.blue('  □ Assets available at /assets/ and /images/'))
    console.log(chalk.blue('  □ Jekyll configuration optimized for public folder'))

    if (this.errors.length === 0) {
      console.log(chalk.green.bold('\n🚀 Public folder is ready for GitHub Pages deployment!'))
      console.log(chalk.blue('The public/ folder contains everything needed for the game to work.'))
      console.log(chalk.blue('Push to main branch to trigger automatic deployment.'))
    } else {
      console.log(chalk.red.bold('\n❌ Fix errors before deploying'))
    }
  }
}

// Run validation if called directly
if (process.argv[1] && process.argv[1].endsWith('validate-public-deployment.js')) {
  const validator = new PublicDeploymentValidator()
  const success = await validator.validate()
  process.exit(success ? 0 : 1)
}

export { PublicDeploymentValidator }
