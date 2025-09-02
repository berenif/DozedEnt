#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');

let errors = [];
let warnings = [];
let successes = [];

console.log(chalk.blue.bold('\n🔍 Validating GitHub Pages Deployment...\n'));

// Check if docs folder exists
function checkDocsFolder() {
  console.log('Checking docs folder...');
  if (!fs.existsSync(docsDir)) {
    errors.push('❌ docs folder does not exist. Run npm run build:docs first.');
    return false;
  }
  successes.push('✓ docs folder exists');
  return true;
}

// Check for index.html
function checkIndexFile() {
  console.log('Checking index.html...');
  const indexPath = path.join(docsDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    errors.push('❌ docs/index.html is missing');
    return false;
  }
  
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Check for localhost references
  if (content.includes('localhost:') || content.includes('127.0.0.1')) {
    warnings.push('⚠️  index.html contains localhost references');
  }
  
  // Check for proper HTML structure
  if (!content.includes('<!DOCTYPE html>')) {
    errors.push('❌ index.html missing DOCTYPE declaration');
  }
  
  // Check for game links
  const requiredLinks = ['complete-game.html', 'enhanced-game-demo.html', 'room-demo.html'];
  const missingLinks = requiredLinks.filter(link => !content.includes(link));
  
  if (missingLinks.length > 0) {
    warnings.push(`⚠️  index.html missing links to: ${missingLinks.join(', ')}`);
  }
  
  successes.push('✓ index.html exists and has proper structure');
  return true;
}

// Check for .nojekyll file
function checkNoJekyll() {
  console.log('Checking .nojekyll file...');
  const nojekyllPath = path.join(docsDir, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    errors.push('❌ .nojekyll file is missing in docs folder');
    return false;
  }
  successes.push('✓ .nojekyll file exists');
  return true;
}

// Check for built assets
function checkBuiltAssets() {
  console.log('Checking built assets...');
  const docsDistPath = path.join(docsDir, 'dist');
  
  if (!fs.existsSync(docsDistPath)) {
    errors.push('❌ dist folder is missing in docs');
    return false;
  }
  
  // Check for specific bundles
  const requiredBundles = [
    'trystero-firebase.min.js',
    'trystero-ipfs.min.js',
    'trystero-mqtt.min.js',
    'player-animator.min.js',
    'wolf-animation.min.js'
  ];
  
  const missingBundles = [];
  requiredBundles.forEach(bundle => {
    const bundlePath = path.join(docsDistPath, bundle);
    if (!fs.existsSync(bundlePath)) {
      missingBundles.push(bundle);
    }
  });
  
  if (missingBundles.length > 0) {
    errors.push(`❌ Missing bundles in docs/dist: ${missingBundles.join(', ')}`);
    return false;
  }
  
  successes.push('✓ All required bundles are present in docs/dist');
  return true;
}

// Check for game files
function checkGameFiles() {
  console.log('Checking game files...');
  
  const criticalGameFiles = [
    'complete-game.html',
    'enhanced-game-demo.html',
    'room-demo.html',
    'enhanced-lobby-demo.html',
    'player-animations-demo.html',
    'wolf-animation-demo.html'
  ];
  
  const missingFiles = [];
  criticalGameFiles.forEach(file => {
    const filePath = path.join(docsDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    errors.push(`❌ Missing game files in docs: ${missingFiles.join(', ')}`);
    return false;
  }
  
  // Check if demo files are copied
  if (fs.existsSync(demoDir)) {
    const demoFiles = fs.readdirSync(demoDir).filter(f => f.endsWith('.html'));
    const notCopied = [];
    
    demoFiles.forEach(file => {
      if (!fs.existsSync(path.join(docsDir, file))) {
        notCopied.push(file);
      }
    });
    
    if (notCopied.length > 0) {
      warnings.push(`⚠️  Demo files not copied to docs: ${notCopied.join(', ')}`);
    }
  }
  
  successes.push('✓ All critical game files are present');
  return true;
}

// Check for supporting files
function checkSupportingFiles() {
  console.log('Checking supporting files...');
  
  const supportingFiles = [
    'wolf-animation.js',
    'wolf-character.js',
    'game-renderer.js',
    'enhanced-room-manager.js'
  ];
  
  const missingSupporting = [];
  supportingFiles.forEach(file => {
    const filePath = path.join(docsDir, file);
    if (!fs.existsSync(filePath)) {
      missingSupporting.push(file);
    }
  });
  
  if (missingSupporting.length > 0) {
    warnings.push(`⚠️  Missing supporting files: ${missingSupporting.join(', ')}`);
  } else {
    successes.push('✓ All supporting JavaScript files are present');
  }
  
  return true;
}

// Check file sizes to ensure they're not empty
function checkFileSizes() {
  console.log('Checking file sizes...');
  
  const filesToCheck = [
    'index.html',
    'complete-game.html',
    'dist/trystero-firebase.min.js'
  ];
  
  const emptyFiles = [];
  filesToCheck.forEach(file => {
    const filePath = path.join(docsDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        emptyFiles.push(file);
      }
    }
  });
  
  if (emptyFiles.length > 0) {
    errors.push(`❌ Empty files detected: ${emptyFiles.join(', ')}`);
    return false;
  }
  
  successes.push('✓ All files have content');
  return true;
}

// Check for test files (they shouldn't be in docs)
function checkForTestFiles() {
  console.log('Checking for test files...');
  
  const testPatterns = ['test-', '.test.', '.spec.'];
  const docsFiles = fs.existsSync(docsDir) ? fs.readdirSync(docsDir) : [];
  const testFilesInDocs = docsFiles.filter(file => 
    testPatterns.some(pattern => file.includes(pattern))
  );
  
  if (testFilesInDocs.length > 0) {
    warnings.push(`⚠️  Test files found in docs (consider removing): ${testFilesInDocs.join(', ')}`);
  } else {
    successes.push('✓ No test files in production docs');
  }
  
  return true;
}

// Check dependencies
function checkDependencies() {
  console.log('Checking dependencies...');
  
  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    errors.push('❌ node_modules not found. Run npm install first.');
    return false;
  }
  
  if (!fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
    warnings.push('⚠️  package-lock.json not found');
  }
  
  successes.push('✓ Dependencies are installed');
  return true;
}

// Main validation function
function validate() {
  // Run all checks
  checkDependencies();
  
  if (checkDocsFolder()) {
    checkIndexFile();
    checkNoJekyll();
    checkBuiltAssets();
    checkGameFiles();
    checkSupportingFiles();
    checkFileSizes();
    checkForTestFiles();
  }
  
  // Print results
  console.log('\n' + chalk.blue.bold('📊 Validation Results:\n'));
  
  if (successes.length > 0) {
    console.log(chalk.green.bold('Successes:'));
    successes.forEach(msg => console.log(chalk.green(msg)));
  }
  
  if (warnings.length > 0) {
    console.log('\n' + chalk.yellow.bold('Warnings:'));
    warnings.forEach(msg => console.log(chalk.yellow(msg)));
  }
  
  if (errors.length > 0) {
    console.log('\n' + chalk.red.bold('Errors:'));
    errors.forEach(msg => console.log(chalk.red(msg)));
  }
  
  // Summary
  console.log('\n' + chalk.blue.bold('Summary:'));
  console.log(`  ✓ ${chalk.green(successes.length)} checks passed`);
  console.log(`  ⚠ ${chalk.yellow(warnings.length)} warnings`);
  console.log(`  ✗ ${chalk.red(errors.length)} errors`);
  
  if (errors.length === 0) {
    console.log('\n' + chalk.green.bold('✅ GitHub Pages deployment is ready!'));
    console.log(chalk.gray('Push to GitHub and enable Pages in repository settings.'));
    process.exit(0);
  } else {
    console.log('\n' + chalk.red.bold('❌ Deployment validation failed!'));
    console.log(chalk.gray('Fix the errors above and run validation again.'));
    process.exit(1);
  }
}

// Run validation
validate();