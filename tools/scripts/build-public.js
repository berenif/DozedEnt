#!/usr/bin/env node

/**
 * Public Folder Build Script for DozedEnt GitHub Pages Deployment
 * 
 * This script creates a robust /public folder structure for GitHub Pages deployment,
 * copying all necessary files from /dist and other source directories.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const publicDir = join(projectRoot, 'public')

console.log('?? Building DozedEnt Public Folder for GitHub Pages...')

// Clean and create public directory
function setupPublicDirectory() {
  console.log('?? Setting up public directory...')
  
  // Remove existing public directory if it exists
  if (existsSync(publicDir)) {
    try {
      // Try to remove with force and recursive
      rmSync(publicDir, { recursive: true, force: true })
      console.log('? Cleaned existing public directory')
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'EPERM') {
        console.log('? Directory is locked, trying alternative approach...')
        
        // Try to remove individual files first
        try {
          const files = execSync(`dir /b "${publicDir}"`, { encoding: 'utf8' }).split('\n').filter(f => f.trim())
          for (const file of files) {
            try {
              rmSync(join(publicDir, file), { recursive: true, force: true })
            } catch (fileError) {
              console.log(`  ?? Could not remove ${file}, will overwrite`)
            }
          }
          console.log('? Cleaned individual files from public directory')
        } catch (dirError) {
          console.log('? Could not clean directory, will attempt to overwrite files')
        }
      } else {
        throw error
      }
    }
  }
  
  // Create public directory
  mkdirSync(publicDir, { recursive: true })
  console.log('? Created public directory')
}

// Copy main game files
function copyMainGameFiles() {
  console.log('?? Copying main game files...')
  
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
        console.log(`  ? Copied ${file}`)
      } catch (error) {
        console.error(`  ? Error copying ${file}:`, error.message)
      }
    } else {
      console.log(`  ??  ${file} not found, skipping`)
    }
  })
}

// Inject build information into HTML files
function injectBuildInfoIntoHtml(srcPath, destPath) {
  const htmlContent = readFileSync(srcPath, 'utf8')
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: '1.0.0',
    deploymentType: 'github-pages',
    structure: {
      mainFiles: ['index.html', 'site.js', 'favicon.ico'],
      wasmFiles: ['game.wasm', 'game-host.wasm'],
      directories: ['core/', 'assets/', 'images/', 'src/', 'data/', 'wasm/'],
      configFiles: ['_config.yml', '.nojekyll']
    },
    notes: [
      'Core modules are available at /core/',
      'WASM files are available at root level and in /wasm/',
      'Source files are available at /src/ for debugging',
      'Assets and data are available at /assets/ and /data/'
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

// Copy WASM files
function copyWasmFiles() {
  console.log('?? Copying WASM files...')
  
  const wasmFiles = ['game.wasm', 'game-host.wasm']
  
  wasmFiles.forEach(file => {
    const srcPath = join(projectRoot, file)
    const destPath = join(publicDir, file)
    
    if (existsSync(srcPath)) {
      try {
        copyFileSync(srcPath, destPath)
        console.log(`  ? Copied ${file}`)
      } catch (error) {
        console.error(`  ? Error copying ${file}:`, error.message)
      }
    } else {
      console.log(`  ??  ${file} not found in root, skipping`)
    }
  })
  
  // Also copy from dist/wasm if it exists
  const distWasmPath = join(projectRoot, 'dist', 'wasm')
  if (existsSync(distWasmPath)) {
    try {
      cpSync(distWasmPath, join(publicDir, 'wasm'), { recursive: true })
      console.log('  ? Copied dist/wasm/ directory')
      
      // Also copy WASM files to public root for easy access
      wasmFiles.forEach(file => {
        const srcPath = join(distWasmPath, file)
        const destPath = join(publicDir, file)
        
        if (existsSync(srcPath)) {
          try {
            copyFileSync(srcPath, destPath)
            console.log(`  ? Copied dist/wasm/${file} to public root`)
          } catch (error) {
            console.error(`  ? Error copying dist/wasm/${file}:`, error.message)
          }
        }
      })
    } catch (error) {
      console.error('  ? Error copying dist/wasm/:', error.message)
    }
  }
}

// Copy build folder contents
function copyDistFolder() {
  console.log('?? Copying build folder contents...')
  
  const buildPath = join(projectRoot, 'build')
  if (!existsSync(buildPath)) {
    console.log('  ??  build folder not found, skipping')
    return
  }
  
  try {
    // Copy entire build folder to public/build
    cpSync(buildPath, join(publicDir, 'build'), { recursive: true })
    console.log('  ? Copied build/ ? public/build/')
    
    // Also copy key modules to public root for easy access
    const keyModules = ['core', 'animations']
    
    keyModules.forEach(module => {
      const srcPath = join(buildPath, module)
      const destPath = join(publicDir, module)
      
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true })
        console.log(`  ? Copied build/${module}/ ? public/${module}/`)
      }
    })
    
  } catch (error) {
    console.error('  ? Error copying build folder:', error.message)
  }
}

// Copy assets and data
// Copy dist folder contents (v2)
function copyDistFolderV2() {
  const distPath = join(projectRoot, 'dist')
  if (!existsSync(distPath)) {
    console.log('  (i) dist folder not found, skipping')
    return
  }
  try {
    // Copy convenience folders from dist to public root
    for (const module of ['core']) {
      const srcPath = join(distPath, module)
      const destPath = join(publicDir, module)
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true })
        console.log(`  Copied dist/${module}/ -> public/${module}/`)
      }
    }
  } catch (error) {
    console.error('  Error copying dist folder:', error.message)
  }
}

function copyAssetsAndData() {
  console.log('?? Copying assets and data...')
  
  const assetDirs = ['assets', 'data', 'images']
  
  assetDirs.forEach(dir => {
    const srcPath = join(projectRoot, dir)
    const destPath = join(publicDir, dir)
    
    if (existsSync(srcPath)) {
      try {
        cpSync(srcPath, destPath, { recursive: true })
        console.log(`  ? Copied ${dir}/ ? public/${dir}/`)
      } catch (error) {
        console.error(`  ? Error copying ${dir}/:`, error.message)
      }
    } else {
      console.log(`  ??  ${dir}/ not found, skipping`)
    }
  })
}

// Source files are already in public/src/ - no copying needed
function copySourceFiles() {
  console.log('?? Copying source files...')
  
  const srcPath = join(projectRoot, 'src')
  const destPath = join(publicDir, 'src')
  
  if (existsSync(srcPath)) {
    try {
      cpSync(srcPath, destPath, { recursive: true })
      console.log('  ? Copied src/ ? public/src/')
    } catch (error) {
      console.error('  ? Error copying src/:', error.message)
    }
  } else {
    console.log('  ??  src/ not found, skipping')
  }
}

// Create Jekyll configuration
function createJekyllConfig() {
  console.log('??  Creating Jekyll configuration...')
  
  const jekyllConfig = `# Jekyll configuration for DozedEnt GitHub Pages
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
    console.log('  ? Created _config.yml')
  } catch (error) {
    console.error('  ? Error creating _config.yml:', error.message)
  }
}

// Create .nojekyll file
function createNoJekyllFile() {
  console.log('?? Creating .nojekyll file...')
  
  try {
    writeFileSync(join(publicDir, '.nojekyll'), '')
    console.log('  ? Created .nojekyll file')
  } catch (error) {
    console.error('  ? Error creating .nojekyll file:', error.message)
  }
}

// Build info is now injected directly into HTML files via injectBuildInfoIntoHtml()

// Validate public folder structure
function validatePublicFolder() {
  console.log('?? Validating public folder structure...')
  
  const requiredFiles = [
    'index.html',
    'favicon.ico',
    'game.wasm',
    'game-host.wasm',
    '_config.yml',
    '.nojekyll'
  ]
  
  const requiredDirs = [
    'core'
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
      console.log(`  ? ${file} exists`)
    } else {
      console.log(`  ? ${file} missing`)
      validationErrors++
    }
  })
  
  requiredDirs.forEach(dir => {
    const dirPath = join(publicDir, dir)
    if (existsSync(dirPath)) {
      console.log(`  ? ${dir}/ exists`)
    } else {
      console.log(`  ? ${dir}/ missing`)
      validationErrors++
    }
  })
  
  optionalDirs.forEach(dir => {
    const dirPath = join(publicDir, dir)
    if (existsSync(dirPath)) {
      console.log(`  ? ${dir}/ exists`)
    } else {
      console.log(`  ??  ${dir}/ missing (optional)`)
    }
  })
  
  if (validationErrors === 0) {
    console.log('  ? Public folder validation passed')
  } else {
    console.log(`  ? Public folder validation failed (${validationErrors} errors)`)
  }
  
  return validationErrors === 0
}

// Main build function
async function buildPublicFolder() {
  try {
    setupPublicDirectory()
    copyMainGameFiles()
    copyWasmFiles()
    copyDistFolderV2()
    copyAssetsAndData()
    copySourceFiles()
    createJekyllConfig()
    createNoJekyllFile()
    
    const validationPassed = validatePublicFolder()
    
    console.log('\n?? Public folder build complete!')
    console.log('?? Structure created:')
    console.log('   ?? Main files: index.html, site.js, favicon.ico')
    console.log('   ?? WASM files: game.wasm, game-host.wasm')
    // dist/ folder intentionally not included in public/
    console.log('   ?? core/ folder: Networking modules')
    // animations folder not included in public/
    console.log('   ?? assets/ folder: Audio and media files')
    console.log('   ???  images/ folder: Game images')
    console.log('   ?? src/ folder: Source files for debugging')
    console.log('   ?? data/ folder: Game data files')
    console.log('   ??  Configuration: _config.yml, .nojekyll')
    console.log('   ?? Info: window.__BUILD__ injected into HTML')
    
    if (validationPassed) {
      console.log('\n? Public folder is ready for GitHub Pages deployment!')
      console.log('?? Deploy by uploading the public/ folder to GitHub Pages')
    } else {
      console.log('\n? Public folder validation failed - check errors above')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('? Error building public folder:', error)
    process.exit(1)
  }
}

// Run the build
buildPublicFolder()


