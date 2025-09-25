#!/usr/bin/env node

/**
 * Minimal Public Folder Build Script for DozedEnt GitHub Pages Deployment
 * 
 * This script creates a minimal /public folder that only contains essential files
 * and references the dist/ folder directly without duplication.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')
const publicDir = join(projectRoot, 'public')

console.log('🚀 Building Minimal DozedEnt Public Folder...')

// Clean and create public directory
function setupPublicDirectory() {
  console.log('🧹 Setting up minimal public directory...')
  
  // Remove existing public directory if it exists
  if (existsSync(publicDir)) {
    rmSync(publicDir, { recursive: true, force: true })
    console.log('✅ Cleaned existing public directory')
  }
  
  // Create public directory
  mkdirSync(publicDir, { recursive: true })
  console.log('✅ Created minimal public directory')
}

// Copy only essential files that need to be in public root
function copyEssentialFiles() {
  console.log('📄 Copying essential files only...')
  
  const essentialFiles = [
    'index.html',
    'favicon.ico',
    'site.js'
  ]
  
  essentialFiles.forEach(file => {
    const srcPath = join(projectRoot, file)
    const destPath = join(publicDir, file)
    
    if (existsSync(srcPath)) {
      try {
        if (file.endsWith('.html')) {
          // Inject build info and modify paths to reference dist directly
          injectBuildInfoAndModifyPaths(srcPath, destPath)
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

// Inject build information and modify paths to reference dist directly
function injectBuildInfoAndModifyPaths(srcPath, destPath) {
  let htmlContent = readFileSync(srcPath, 'utf8')
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: '1.0.0',
    deploymentType: 'github-pages-minimal',
    structure: {
      mainFiles: ['index.html', 'site.js', 'favicon.ico'],
      references: ['../dist/', '../src/', '../assets/', '../data/', '../images/'],
      wasmFiles: ['../dist/wasm/game.wasm', '../dist/wasm/game-host.wasm']
    },
    notes: [
      'Minimal public folder - no file duplication',
      'All assets referenced from original locations',
      'dist/ folder referenced as ../dist/',
      'src/ folder referenced as ../src/',
      'WASM files referenced from ../dist/wasm/',
      'Assets referenced from ../assets/, ../data/, ../images/'
    ]
  }
  
  const buildScript = `<script>window.__BUILD__ = ${JSON.stringify(buildInfo, null, 2)};</script>`
  
  // Modify import paths to reference dist folder directly
  htmlContent = htmlContent.replace(/src="\.\/dist\//g, 'src="../dist/')
  htmlContent = htmlContent.replace(/src="\.\/src\//g, 'src="../src/')
  htmlContent = htmlContent.replace(/src="\.\/assets\//g, 'src="../assets/')
  htmlContent = htmlContent.replace(/src="\.\/data\//g, 'src="../data/')
  htmlContent = htmlContent.replace(/src="\.\/images\//g, 'src="../images/')
  htmlContent = htmlContent.replace(/src="\.\/wasm\//g, 'src="../dist/wasm/')
  htmlContent = htmlContent.replace(/src="\.\/core\//g, 'src="../dist/core/')
  htmlContent = htmlContent.replace(/src="\.\/animations\//g, 'src="../dist/animations/')
  
  // Modify script imports
  htmlContent = htmlContent.replace(/import.*from\s+['"]\.\/dist\//g, (match) => match.replace('./dist/', '../dist/'))
  htmlContent = htmlContent.replace(/import.*from\s+['"]\.\/src\//g, (match) => match.replace('./src/', '../src/'))
  
  // Inject build script before closing head tag or at the beginning of body
  if (htmlContent.includes('</head>')) {
    htmlContent = htmlContent.replace('</head>', `  ${buildScript}\n</head>`)
  } else if (htmlContent.includes('<body')) {
    htmlContent = htmlContent.replace('<body', `${buildScript}\n<body`)
  } else {
    // Fallback: add at the beginning
    htmlContent = buildScript + '\n' + htmlContent
  }
  
  writeFileSync(destPath, htmlContent)
}

// Create a simple index.html that redirects to the main game
function createRedirectIndex() {
  console.log('🔄 Creating redirect index.html...')
  
  const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DozedEnt - Redirecting...</title>
    <meta http-equiv="refresh" content="0; url=./public/index.html">
    <link rel="canonical" href="./public/index.html">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .redirect-container {
            max-width: 500px;
            padding: 40px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .logo {
            font-size: 3em;
            margin-bottom: 20px;
        }
        .loading {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin: 20px 0;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .manual-link {
            margin-top: 20px;
        }
        .manual-link a {
            color: #4CAF50;
            text-decoration: none;
            font-weight: bold;
            padding: 10px 20px;
            border: 2px solid #4CAF50;
            border-radius: 25px;
            transition: all 0.3s ease;
        }
        .manual-link a:hover {
            background-color: #4CAF50;
            color: white;
        }
    </style>
</head>
<body>
    <div class="redirect-container">
        <div class="logo">🎮</div>
        <h1>DozedEnt</h1>
        <p>Powered by Trystero - P2P Survival Game</p>
        <div class="loading"></div>
        <p>Redirecting to game...</p>
        <div class="manual-link">
            <p>If you're not redirected automatically:</p>
            <a href="./public/index.html">Click here to play</a>
        </div>
    </div>
    
    <script>
        // JavaScript redirect as backup
        setTimeout(function() {
            window.location.href = './public/index.html';
        }, 1000);
    </script>
</body>
</html>`

  try {
    writeFileSync(join(publicDir, 'index.html'), redirectHtml)
    console.log('  ✅ Created redirect index.html')
  } catch (error) {
    console.error('  ❌ Error creating redirect index.html:', error.message)
  }
}

// Create Jekyll configuration for minimal setup
function createJekyllConfig() {
  console.log('⚙️  Creating minimal Jekyll configuration...')
  
  const jekyllConfig = `# Jekyll configuration for DozedEnt GitHub Pages (Minimal)
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
  - favicon.ico
  - site.js
  - ../dist/
  - ../src/
  - ../assets/
  - ../data/
  - ../images/

# Disable Jekyll processing for certain files to preserve WASM and JS modules
defaults:
  - scope:
      path: "*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.wasm"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.js"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.mjs"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.ts"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.d.ts"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.css"
    values:
      layout: null
      sitemap: false
  - scope:
      path: "**/*.map"
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

// Validate minimal public folder structure
function validatePublicFolder() {
  console.log('🔍 Validating minimal public folder structure...')
  
  const requiredFiles = [
    'index.html',
    'favicon.ico',
    'site.js',
    '_config.yml',
    '.nojekyll'
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
  
  if (validationErrors === 0) {
    console.log('  ✅ Minimal public folder validation passed')
  } else {
    console.log(`  ❌ Minimal public folder validation failed (${validationErrors} errors)`)
  }
  
  return validationErrors === 0
}

// Main build function
async function buildMinimalPublicFolder() {
  try {
    setupPublicDirectory()
    copyEssentialFiles()
    createRedirectIndex()
    createJekyllConfig()
    createNoJekyllFile()
    
    const validationPassed = validatePublicFolder()
    
    console.log('\n🎉 Minimal public folder build complete!')
    console.log('📁 Structure created:')
    console.log('   📄 Essential files: index.html, site.js, favicon.ico')
    console.log('   🔄 Redirect index.html → ./public/index.html')
    console.log('   📋 Modified paths to reference ../dist/, ../src/, etc.')
    console.log('   ⚙️  Configuration: _config.yml, .nojekyll')
    console.log('   📋 Info: window.__BUILD__ injected into HTML')
    console.log('   💡 No file duplication - all assets referenced from original locations')
    
    if (validationPassed) {
      console.log('\n✅ Minimal public folder is ready for GitHub Pages deployment!')
      console.log('🌐 Deploy by uploading the public/ folder to GitHub Pages')
      console.log('💡 This approach avoids file duplication by referencing original sources')
    } else {
      console.log('\n❌ Minimal public folder validation failed - check errors above')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error building minimal public folder:', error)
    process.exit(1)
  }
}

// Run the build
buildMinimalPublicFolder()
