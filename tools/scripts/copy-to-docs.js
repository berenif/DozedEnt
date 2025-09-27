#!/usr/bin/env node

/**
 * Copy Source Files to Public Directory
 *
 * This script copies all necessary source files from the src/ directory
 * to the public/ directory for GitHub Pages deployment.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')
const srcDir = join(projectRoot, 'src')
const publicDir = join(projectRoot, 'public')
const publicJsDir = join(publicDir, 'js')

console.log('📁 Copying source files to public directory...')

// Ensure public/js directory exists
if (!existsSync(publicJsDir)) {
  mkdirSync(publicJsDir, { recursive: true })
  console.log('✅ Created public/js directory')
}

// Copy all source files recursively
function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }
  
  try {
    cpSync(src, dest, { recursive: true })
    console.log(`✅ Copied ${src} → ${dest}`)
  } catch (error) {
    console.error(`❌ Error copying ${src}:`, error.message)
  }
}

// Copy specific directories
const directoriesToCopy = [
  'ai',
  'animation', 
  'audio',
  'css',
  'effects',
  'game',
  'gameentity',
  'gameplay',
  'images',
  'input',
  'lobby',
  'multiplayer',
  'netcode',
  'ui',
  'utils',
  'wasm'
]

console.log('📂 Copying source directories...')
directoriesToCopy.forEach(dir => {
  const srcPath = join(srcDir, dir)
  const destPath = join(publicJsDir, 'src', dir)

  if (existsSync(srcPath)) {
    copyDirectory(srcPath, destPath)
  } else {
    console.log(`⚠️  Directory ${dir} not found in src/`)
  }
})

// Copy individual files from src root
const filesToCopy = [
  'host-authority.js',
  'lobby-analytics.js', 
  'sound-system.js'
]

console.log('📄 Copying individual source files...')
filesToCopy.forEach(file => {
  const srcPath = join(srcDir, file)
  const destPath = join(publicJsDir, 'src', file)

  if (existsSync(srcPath)) {
    try {
      copyFileSync(srcPath, destPath)
      console.log(`✅ Copied ${file}`)
    } catch (error) {
      console.error(`❌ Error copying ${file}:`, error.message)
    }
  } else {
    console.log(`⚠️  File ${file} not found in src/`)
  }
})

// Copy assets directory
const assetsSrc = join(projectRoot, 'assets')
const assetsDest = join(publicDir, 'assets')

if (existsSync(assetsSrc)) {
  console.log('🎵 Copying assets directory...')
  copyDirectory(assetsSrc, assetsDest)
} else {
  console.log('⚠️  Assets directory not found')
}

// Copy data directory
const dataSrc = join(projectRoot, 'data')
const dataDest = join(publicDir, 'data')

if (existsSync(dataSrc)) {
  console.log('📊 Copying data directory...')
  copyDirectory(dataSrc, dataDest)
} else {
  console.log('⚠️  Data directory not found')
}

// Copy built files from dist to public/js
const distSrc = join(projectRoot, 'dist')
const distDest = join(publicDir, 'js', 'dist')

if (existsSync(distSrc)) {
  console.log('📦 Copying dist directory...')
  copyDirectory(distSrc, distDest)
} else {
  console.log('⚠️  Dist directory not found - run npm run build:all first')
}

// Copy WASM files
const wasmFiles = ['game.wasm', 'game-host.wasm']
const wasmDestDir = join(publicDir, 'wasm')

if (!existsSync(wasmDestDir)) {
  mkdirSync(wasmDestDir, { recursive: true })
}

console.log('🔧 Copying WASM files...')
wasmFiles.forEach(file => {
  const srcPath = join(projectRoot, file)
  const destPath = join(wasmDestDir, file)

  if (existsSync(srcPath)) {
    try {
      copyFileSync(srcPath, destPath)
      console.log(`✅ Copied ${file}`)
    } catch (error) {
      console.error(`❌ Error copying ${file}:`, error.message)
    }
  } else {
    console.log(`⚠️  WASM file ${file} not found`)
  }
})

// Copy main site.js if it exists
const siteJsSrc = join(projectRoot, 'site.js')
const siteJsDest = join(publicDir, 'site.js')

if (existsSync(siteJsSrc)) {
  try {
    copyFileSync(siteJsSrc, siteJsDest)
    console.log('✅ Copied site.js')
  } catch (error) {
    console.error('❌ Error copying site.js:', error.message)
  }
} else {
  console.log('⚠️  site.js not found')
}

// Copy favicon
const faviconSrc = join(projectRoot, 'favicon.ico')
const faviconDest = join(publicDir, 'favicon.ico')

if (existsSync(faviconSrc)) {
  try {
    copyFileSync(faviconSrc, faviconDest)
    console.log('✅ Copied favicon.ico')
  } catch (error) {
    console.error('❌ Error copying favicon.ico:', error.message)
  }
} else {
  console.log('⚠️  favicon.ico not found')
}

// Create .nojekyll file to prevent Jekyll processing
const nojekyllPath = join(publicDir, '.nojekyll')
if (!existsSync(nojekyllPath)) {
  try {
    writeFileSync(nojekyllPath, '')
    console.log('✅ Created .nojekyll file')
  } catch (error) {
    console.error('❌ Error creating .nojekyll file:', error.message)
  }
}

console.log('\n🎉 Source files copied to public directory!')
console.log('📁 Files copied:')
console.log('   - All src/ directories → public/js/src/')
console.log('   - Individual src/ files → public/js/src/')
console.log('   - assets/ → public/assets/')
console.log('   - data/ → public/data/')
console.log('   - dist/ → public/js/dist/')
console.log('   - WASM files → public/wasm/')
console.log('   - site.js → public/site.js')
console.log('   - favicon.ico → public/favicon.ico')
console.log('   - .nojekyll file created')

console.log('\n🌐 Your public directory is now ready for GitHub Pages deployment!')
