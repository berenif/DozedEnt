#!/usr/bin/env node

/**
 * Public Folder Build Script with Symlinks for DozedEnt GitHub Pages Deployment
 * 
 * This script creates a /public folder structure that uses symlinks to avoid
 * duplicating files from /dist and other source directories.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync, rmSync, symlinkSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const publicDir = join(projectRoot, 'public')

console.log('🚀 Building DozedEnt Public Folder with Symlinks...')

// Clean and create public directory
function setupPublicDirectory() {
  console.log('🧹 Setting up public directory...')
  
  // Remove existing public directory if it exists
  if (existsSync(publicDir)) {
    rmSync(publicDir, { recursive: true, force: true })
    console.log('✅ Cleaned existing public directory')
  }
  
  // Create public directory
  mkdirSync(publicDir, { recursive: true })
  console.log('✅ Created public directory')
}

// Copy main game files (these need to be actual files, not symlinks)
function copyMainGameFiles() {
  console.log('🎮 Copying main game files...')
  
  const mainFiles = [
    'index.html',
    'favicon.ico',
    'site.js',
    'serve-modules.js',
    'trystero-wasm.min.js'
  ]
  
  mainFiles.forEach(file => {
    const srcPath = join(projectRoot, file)
    const destPath = join(publicDir, file)
    
    if (existsSync(srcPath)) {
      try {
        if (file.endsWith('.html')) {
          // Inject build info into HTML files
          injectBuildInfoIntoHtml(srcPath, destPath)
        } else {
          copyFileSync(srcPath, destPath)
        }
        console.log(`  ✅ Copied ${file}`)
      } catch (error) {
        console.error(`  ❌ Error copying ${file}:`, error.message)
      }
    } else {
      console.log(`  ⚠️  ${file} not found, skipping`)
    }
  })
}

// Create symlinks to dist folder contents
function createDistSymlinks() {
  console.log('🔗 Creating symlinks to dist folder...')
  
  const distPath = join(projectRoot, 'dist')
  if (!existsSync(distPath)) {
    console.log('  ⚠️  dist folder not found, skipping symlinks')
    return
  }
  
  try {
    // Create symlink to entire dist folder
    const distSymlinkPath = join(publicDir, 'dist')
    symlinkSync(relative(publicDir, distPath), distSymlinkPath, 'dir')
    console.log('  ✅ Created symlink: public/dist → ../dist')
    
    // Create individual symlinks for key modules at public root level
    const keyModules = ['core', 'animations']
    
    keyModules.forEach(module => {
      const srcPath = join(distPath, module)
      const destPath = join(publicDir, module)
      
      if (existsSync(srcPath)) {
        symlinkSync(relative(publicDir, srcPath), destPath, 'dir')
        console.log(`  ✅ Created symlink: public/${module}/ → ../dist/${module}/`)
      }
    })
    
  } catch (error) {
    console.error('  ❌ Error creating dist symlinks:', error.message)
    console.log('  💡 Falling back to copying files...')
    // Fallback to copying if symlinks fail
    copyDistFolderFallback()
  }
}

// Fallback function to copy dist folder if symlinks fail
function copyDistFolderFallback() {
  console.log('📦 Copying dist folder contents (fallback)...')
  
  const distPath = join(projectRoot, 'dist')
  if (!existsSync(distPath)) {
    console.log('  ⚠️  dist folder not found, skipping')
    return
  }
  
  try {
    // Copy entire dist folder to public/dist
    cpSync(distPath, join(publicDir, 'dist'), { recursive: true })
    console.log('  ✅ Copied dist/ → public/dist/')
    
    // Also copy key modules to public root for easy access
    const keyModules = ['core', 'animations']
    
    keyModules.forEach(module => {
      const srcPath = join(distPath, module)
      const destPath = join(publicDir, module)
      
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true })
        console.log(`  ✅ Copied dist/${module}/ → public/${module}/`)
      }
    })
    
  } catch (error) {
    console.error('  ❌ Error copying dist folder:', error.message)
  }
}

// Create symlinks to WASM files
function createWasmSymlinks() {
  console.log('🔧 Creating WASM file symlinks...')
  
  const wasmFiles = ['game.wasm', 'game-host.wasm']
  
  wasmFiles.forEach(file => {
    // Try root level first
    const srcPath = join(projectRoot, file)
    const destPath = join(publicDir, file)
    
    if (existsSync(srcPath)) {
      try {
        symlinkSync(relative(publicDir, srcPath), destPath, 'file')
        console.log(`  ✅ Created symlink: public/${file} → ../${file}`)
      } catch (error) {
        console.error(`  ❌ Error creating symlink for ${file}:`, error.message)
        // Fallback to copying
        try {
          copyFileSync(srcPath, destPath)
          console.log(`  ✅ Copied ${file} (fallback)`)
        } catch (copyError) {
          console.error(`  ❌ Error copying ${file}:`, copyError.message)
        }
      }
    } else {
      // Try dist/wasm folder
      const distWasmPath = join(projectRoot, 'dist', 'wasm', file)
      if (existsSync(distWasmPath)) {
        try {
          symlinkSync(relative(publicDir, distWasmPath), destPath, 'file')
          console.log(`  ✅ Created symlink: public/${file} → ../dist/wasm/${file}`)
        } catch (error) {
          console.error(`  ❌ Error creating symlink for dist/wasm/${file}:`, error.message)
          // Fallback to copying
          try {
            copyFileSync(distWasmPath, destPath)
            console.log(`  ✅ Copied dist/wasm/${file} (fallback)`)
          } catch (copyError) {
            console.error(`  ❌ Error copying dist/wasm/${file}:`, copyError.message)
          }
        }
      } else {
        console.log(`  ⚠️  ${file} not found, skipping`)
      }
    }
  })
  
  // Create symlink to wasm directory if it exists
  const distWasmPath = join(projectRoot, 'dist', 'wasm')
  if (existsSync(distWasmPath)) {
    try {
      const wasmSymlinkPath = join(publicDir, 'wasm')
      symlinkSync(relative(publicDir, distWasmPath), wasmSymlinkPath, 'dir')
      console.log('  ✅ Created symlink: public/wasm/ → ../dist/wasm/')
    } catch (error) {
      console.error('  ❌ Error creating wasm directory symlink:', error.message)
    }
  }
}

// Create symlinks to assets and data
function createAssetSymlinks() {
  console.log('🎵 Creating asset and data symlinks...')
  
  const assetDirs = ['assets', 'data', 'images']
  
  assetDirs.forEach(dir => {
    const srcPath = join(projectRoot, dir)
    const destPath = join(publicDir, dir)
    
    if (existsSync(srcPath)) {
      try {
        symlinkSync(relative(publicDir, srcPath), destPath, 'dir')
        console.log(`  ✅ Created symlink: public/${dir}/ → ../${dir}/`)
      } catch (error) {
        console.error(`  ❌ Error creating symlink for ${dir}/:`, error.message)
        // Fallback to copying
        try {
          cpSync(srcPath, destPath, { recursive: true })
          console.log(`  ✅ Copied ${dir}/ (fallback)`)
        } catch (copyError) {
          console.error(`  ❌ Error copying ${dir}/:`, copyError.message)
        }
      }
    } else {
      console.log(`  ⚠️  ${dir}/ not found, skipping`)
    }
  })
}

// Create symlink to source files
function createSourceSymlinks() {
  console.log('📁 Creating source file symlinks...')
  
  const srcPath = join(projectRoot, 'src')
  const destPath = join(publicDir, 'src')
  
  if (existsSync(srcPath)) {
    try {
      symlinkSync(relative(publicDir, srcPath), destPath, 'dir')
      console.log('  ✅ Created symlink: public/src/ → ../src/')
    } catch (error) {
      console.error('  ❌ Error creating src symlink:', error.message)
      // Fallback to copying
      try {
        cpSync(srcPath, destPath, { recursive: true })
        console.log('  ✅ Copied src/ (fallback)')
      } catch (copyError) {
        console.error('  ❌ Error copying src/:', copyError.message)
      }
    }
  } else {
    console.log('  ⚠️  src/ not found, skipping')
  }
}

// Inject build information into HTML files
function injectBuildInfoIntoHtml(srcPath, destPath) {
  const htmlContent = readFileSync(srcPath, 'utf8')
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: '1.0.0',
    deploymentType: 'github-pages-symlinks',
    structure: {
      mainFiles: ['index.html', 'site.js', 'favicon.ico'],
      symlinks: ['dist/', 'core/', 'animations/', 'wasm/', 'src/', 'assets/', 'data/', 'images/'],
      wasmFiles: ['game.wasm', 'game-host.wasm']
    },
    notes: [
      'All dist/ folder contents are symlinked from ../dist/',
      'WASM files are symlinked from root level and dist/wasm/',
      'Core networking modules are symlinked from dist/core/',
      'Animation modules are symlinked from dist/animations/',
      'Source files are symlinked from ../src/ for debugging',
      'Assets and data are symlinked from ../assets/ and ../data/',
      'No file duplication - all files reference original sources'
    ]
  }
  
  const buildScript = `<script>window.__BUILD__ = ${JSON.stringify(buildInfo, null, 2)};</script>`
  
  // Inject before closing head tag or at the beginning of body
  let modifiedHtml = htmlContent
  if (htmlContent.includes('</head>')) {
    modifiedHtml = htmlContent.replace('</head>', `  ${buildScript}\n</head>`)
  } else if (htmlContent.includes('<body')) {
    modifiedHtml = htmlContent.replace('<body', `${buildScript}\n<body`)
  } else {
    // Fallback: add at the beginning
    modifiedHtml = buildScript + '\n' + htmlContent
  }
  
  writeFileSync(destPath, modifiedHtml)
}

// Create Jekyll configuration
function createJekyllConfig() {
  console.log('⚙️  Creating Jekyll configuration...')
  
  const jekyllConfig = `# Jekyll configuration for DozedEnt GitHub Pages (Symlinks)
# This file configures how GitHub Pages serves the DozedEnt game

# Basic site settings
title: "DozedEnt - P2P Survival Game"
description: "WebAssembly-first multiplayer survival game with advanced AI, 5-button combat system, and serverless P2P networking"
baseurl: "/DozedEnt" # Repository name for GitHub Pages
url: "" # Your custom domain or leave empty for github.io domain

# Build settings
theme: null # We're using custom HTML/CSS, so no Jekyll theme
plugins: []

# Exclude files from being served
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor/bundle/
  - vendor/cache/
  - vendor/gems/
  - vendor/ruby/
  - .sass-cache
  - .jekyll-cache
  - .jekyll-metadata
  - README.md
  - package.json
  - package-lock.json
  - tools/
  - test/
  - coverage/
  - emsdk/

# Include specific files/folders for GitHub Pages
include:
  - index.html
  - js/
  - css/
  - wasm/
  - assets/
  - images/
  - favicon.ico
  - dist/
  - core/
  - animations/
  - src/
  - data/
  - *.wasm
  - site.js
  - serve-modules.js
  - trystero-wasm.min.js

# Disable Jekyll processing for certain files to preserve WASM and JS modules
defaults:
  - scope:
      path: "*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "wasm/**/*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "dist/**/*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "js/**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "js/**/*.mjs"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "js/**/*.ts"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "js/**/*.d.ts"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "dist/**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "core/**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "animations/**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "src/**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "css/**/*.css"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.map"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "assets/**/*"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "data/**/*"
    values:
      layout: null
      sitemap: false

# MIME type configuration for WebAssembly
webrick:
  headers:
    'Access-Control-Allow-Origin': '*'
    'Access-Control-Allow-Methods': 'GET'
  mime_types:
    wasm: application/wasm
    map: application/json

# GitHub Pages specific settings
github: [metadata]
kramdown:
  input: GFM
  hard_wrap: false
`

  try {
    writeFileSync(join(publicDir, '_config.yml'), jekyllConfig)
    console.log('  ✅ Created _config.yml')
  } catch (error) {
    console.error('  ❌ Error creating _config.yml:', error.message)
  }
}

// Create .nojekyll file
function createNoJekyllFile() {
  console.log('🚫 Creating .nojekyll file...')
  
  try {
    writeFileSync(join(publicDir, '.nojekyll'), '')
    console.log('  ✅ Created .nojekyll file')
  } catch (error) {
    console.error('  ❌ Error creating .nojekyll file:', error.message)
  }
}

// Validate public folder structure
function validatePublicFolder() {
  console.log('🔍 Validating public folder structure...')
  
  const requiredFiles = [
    'index.html',
    'favicon.ico',
    'game.wasm',
    'game-host.wasm',
    '_config.yml',
    '.nojekyll'
  ]
  
  const requiredDirs = [
    'dist',
    'core',
    'animations'
  ]
  
  const optionalDirs = [
    'assets',
    'images',
    'src',
    'data',
    'wasm'
  ]
  
  let validationErrors = 0
  
  requiredFiles.forEach(file => {
    const filePath = join(publicDir, file)
    if (existsSync(filePath)) {
      console.log(`  ✅ ${file} exists`)
    } else {
      console.log(`  ❌ ${file} missing`)
      validationErrors++
    }
  })
  
  requiredDirs.forEach(dir => {
    const dirPath = join(publicDir, dir)
    if (existsSync(dirPath)) {
      console.log(`  ✅ ${dir}/ exists`)
    } else {
      console.log(`  ❌ ${dir}/ missing`)
      validationErrors++
    }
  })
  
  optionalDirs.forEach(dir => {
    const dirPath = join(publicDir, dir)
    if (existsSync(dirPath)) {
      console.log(`  ✅ ${dir}/ exists`)
    } else {
      console.log(`  ⚠️  ${dir}/ missing (optional)`)
    }
  })
  
  if (validationErrors === 0) {
    console.log('  ✅ Public folder validation passed')
  } else {
    console.log(`  ❌ Public folder validation failed (${validationErrors} errors)`)
  }
  
  return validationErrors === 0
}

// Main build function
async function buildPublicFolder() {
  try {
    setupPublicDirectory()
    copyMainGameFiles()
    createDistSymlinks()
    createWasmSymlinks()
    createAssetSymlinks()
    createSourceSymlinks()
    createJekyllConfig()
    createNoJekyllFile()
    
    const validationPassed = validatePublicFolder()
    
    console.log('\n🎉 Public folder build complete!')
    console.log('📁 Structure created with symlinks:')
    console.log('   📄 Main files: index.html, site.js, favicon.ico (copied)')
    console.log('   🔗 dist/ → ../dist/ (symlink)')
    console.log('   🔗 core/ → ../dist/core/ (symlink)')
    console.log('   🔗 animations/ → ../dist/animations/ (symlink)')
    console.log('   🔗 wasm/ → ../dist/wasm/ (symlink)')
    console.log('   🔗 src/ → ../src/ (symlink)')
    console.log('   🔗 assets/ → ../assets/ (symlink)')
    console.log('   🔗 data/ → ../data/ (symlink)')
    console.log('   🔗 images/ → ../images/ (symlink)')
    console.log('   🔧 WASM files: game.wasm, game-host.wasm (symlinked)')
    console.log('   ⚙️  Configuration: _config.yml, .nojekyll')
    console.log('   📋 Info: window.__BUILD__ injected into HTML')
    
    if (validationPassed) {
      console.log('\n✅ Public folder is ready for GitHub Pages deployment!')
      console.log('🌐 Deploy by uploading the public/ folder to GitHub Pages')
      console.log('💡 No file duplication - all files reference original sources via symlinks')
    } else {
      console.log('\n❌ Public folder validation failed - check errors above')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error building public folder:', error)
    process.exit(1)
  }
}

// Run the build
buildPublicFolder()
