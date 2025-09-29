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

console.log(chalk.bold.blue('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Validating Public Folder Deployment...\n'))

class PublicDeploymentValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.requiredFiles = [
      'index.html',
      'favicon.ico',
      'game.wasm',
      '_config.yml',
      '.nojekyll'
    ]
    this.requiredDirectories = ['core']
    this.optionalFiles = [
      'game-host.wasm',
      'serve-modules.js',
      'trystero-wasm.min.js',
      'site.js',
      'deployment-info.json'
    ]
    this.optionalDirectories = [
      'assets',
      'images',
      'src',
      'data',
      'wasm'
    ]
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Checking public directory structure...'))
    await this.checkDirectoryStructure()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ Checking required files...'))
    await this.checkRequiredFiles()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Checking dist folder contents...'))
    await this.checkDistFolder()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Checking WASM files...'))
    await this.checkWasmFiles()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Checking core modules...'))
    await this.checkCoreModules()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµ Checking assets...'))
    await this.checkAssets()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Checking Jekyll configuration...'))
    await this.checkJekyllConfig()
    
    console.log(chalk.blue('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â  Checking file sizes...'))
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
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${dir}/ exists`))
      }
    }

    for (const dir of this.optionalDirectories) {
      const dirPath = join(publicPath, dir)
      if (existsSync(dirPath)) {
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${dir}/ exists`))
      } else {
        console.log(chalk.yellow(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  public/${dir}/ missing (optional)`))
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
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${file} exists`))
      }
    }

    for (const file of this.optionalFiles) {
      const filePath = join(publicPath, file)
      if (existsSync(filePath)) {
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${file} exists`))
      } else {
        console.log(chalk.yellow(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  public/${file} missing (optional)`))
      }
    }
  }

  /**
   * Check dist folder contents
   */
  async checkDistFolder() {
    const distPath = join(publicPath, 'dist')
    if (!existsSync(distPath)) {
      // If dist/ is not shipped to public/, skip without error
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
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/dist/${item} exists`))
      }
    }
  }

  /**
   * Check WASM files
   */
  async checkWasmFiles() {
    const wasmFiles = ['game.wasm']
    
    for (const wasmFile of wasmFiles) {
      const wasmPath = join(publicPath, wasmFile)
      if (existsSync(wasmPath)) {
        const stats = statSync(wasmPath)
        const sizeKB = Math.round(stats.size / 1024)
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${wasmFile} exists (${sizeKB}KB)`))
        
        if (stats.size === 0) {
          this.errors.push(`public/${wasmFile} is empty`)
        }
      } else {
        this.errors.push(`public/${wasmFile} is missing`)
      }
    }
    
    // Check optional game-host.wasm
    const gameHostPath = join(publicPath, 'game-host.wasm')
    if (existsSync(gameHostPath)) {
      const stats = statSync(gameHostPath)
      const sizeKB = Math.round(stats.size / 1024)
      console.log(chalk.green(`  ✓ public/game-host.wasm exists (${sizeKB}KB)`))
      
      if (stats.size === 0) {
        this.warnings.push(`public/game-host.wasm is empty`)
      }
    } else {
      console.log(chalk.yellow(`  ⚠ public/game-host.wasm missing (optional)`))
    }
    
    // Check public/wasm folder
    const publicWasmPath = join(publicPath, 'wasm')
    if (existsSync(publicWasmPath)) {
      console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/wasm/ exists`))
    } else {
      console.log(chalk.yellow(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  public/wasm/ missing (optional)`))
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
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/core/${file} exists`))
      } else {
        this.warnings.push(`public/core/${file} missing`)
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
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/assets/${dir}/ exists`))
      } else {
        this.warnings.push(`public/assets/${dir}/ missing`)
      }
    }

    // Check images directory
    const imagesPath = join(publicPath, 'images')
    if (existsSync(imagesPath)) {
      console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/images/ exists`))
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
          console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ _config.yml contains ${config}`))
        } else {
          this.warnings.push(`_config.yml missing ${config}`)
        }
      }

      // Check for WASM MIME type configuration
      if (configContent.includes('application/wasm')) {
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ _config.yml has WASM MIME type configuration`))
      } else {
        this.warnings.push('_config.yml missing WASM MIME type configuration')
      }

      // Check for public folder specific configurations
      if (configContent.includes('public/')) {
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ _config.yml configured for public folder`))
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
          console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/${file.path} size OK (${sizeKB}KB)`))
        }
      }
    }

    // Check dist folder size
    const distPath = join(publicPath, 'dist')
    if (existsSync(distPath)) {
      try {
        const stats = statSync(distPath)
        const sizeMB = Math.round(stats.size / (1024 * 1024))
        console.log(chalk.green(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ public/dist/ size OK (${sizeMB}MB)`))
      } catch (error) {
        console.log(chalk.yellow(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Could not determine public/dist/ size`))
      }
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    console.log(chalk.bold.blue('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â  Public Folder Validation Results:\n'))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ All checks passed! Public folder is ready for deployment.'))
    } else {
      if (this.errors.length > 0) {
        console.log(chalk.red.bold('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Errors found:'))
        this.errors.forEach(error => {
          console.log(chalk.red(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ${error}`))
        })
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  Warnings:'))
        this.warnings.forEach(warning => {
          console.log(chalk.yellow(`  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ${warning}`))
        })
      }
    }

    console.log(chalk.blue('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ Public Folder Deployment Checklist:'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ GitHub Pages enabled in repository settings'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ GitHub Actions permissions configured'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Workflow file exists (.github/workflows/deploy-public.yml)'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ All required files present in public/'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Core copied (no public/dist)'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ WASM files available at root and in /wasm/'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Core modules available at /core/'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Animation modules available at /animations/'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Assets available at /assets/ and /images/'))
    console.log(chalk.blue('  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ Jekyll configuration optimized for public folder'))

    if (this.errors.length === 0) {
      console.log(chalk.green.bold('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ Public folder is ready for GitHub Pages deployment!'))
      console.log(chalk.blue('The public/ folder contains everything needed for the game to work.'))
      console.log(chalk.blue('Push to main branch to trigger automatic deployment.'))
    } else {
      console.log(chalk.red.bold('\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Fix errors before deploying'))
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





