#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const docsDir = path.join(rootDir, 'docs'); // Deploy to docs folder for GitHub Pages
const demoDir = path.join(rootDir, 'demo');
const distDir = path.join(rootDir, 'dist');

let errors = [];
let warnings = [];
let successes = [];

console.log(chalk.blue.bold('\n🔍 Validating GitHub Pages Deployment...\n'));

// Check if root directory is ready for deployment
function checkDocsFolder() {
  console.log('Checking root directory for deployment...');
  if (!fs.existsSync(rootDir)) {
    errors.push('❌ Root directory does not exist.');
    return false;
  }
  successes.push('✓ Root directory exists and ready for deployment');
  return true;
}

// Check for index.html
function checkIndexFile() {
  console.log('Checking index.html...');
  const indexPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    errors.push('❌ index.html is missing');
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
  
  // Check for essential content (demos were removed)
  if (!content.includes('Trystero')) {
    warnings.push(`⚠️  index.html missing Trystero branding`);
  }
  
  successes.push('✓ index.html exists and has proper structure');
  return true;
}

// Check for .nojekyll file
function checkNoJekyll() {
  console.log('Checking .nojekyll file...');
  const nojekyllPath = path.join(rootDir, '.nojekyll');
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
  const docsDistPath = path.join(rootDir, 'dist');
  
  if (!fs.existsSync(docsDistPath)) {
    errors.push('❌ dist folder is missing in root');
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
    errors.push(`❌ Missing bundles in dist: ${missingBundles.join(', ')}`);
    return false;
  }
  
  successes.push('✓ All required bundles are present in dist');
  return true;
}

// Check for game files
function checkProjectFiles() {
  console.log('Checking essential project files...');
  
  const essentialFiles = [
    'game.wasm',
    'API.md',
    'GETTING_STARTED.md'
  ];
  
  const missingFiles = [];
  essentialFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    errors.push(`❌ Missing essential files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  successes.push('✓ All essential project files are present');
  return true;
}

// Check for supporting files
function checkSupportingFiles() {
  console.log('Checking supporting files...');
  
  // Check for main site.js if it exists
  const siteJsPath = path.join(rootDir, 'site.js');
  if (fs.existsSync(siteJsPath)) {
    successes.push('✓ Main site.js file is present');
  }
  
  // No required supporting files since demos were removed
  successes.push('✓ Supporting files check complete');
  
  return true;
}

// Check file sizes to ensure they're not empty
function checkFileSizes() {
  console.log('Checking file sizes...');
  
  const filesToCheck = [
    'index.html',
    'dist/trystero-firebase.min.js'
  ];
  
  const emptyFiles = [];
  filesToCheck.forEach(file => {
    const filePath = path.join(rootDir, file);
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
    checkProjectFiles();
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