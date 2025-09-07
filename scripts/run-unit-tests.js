#!/usr/bin/env node

/**
 * Unit Test Runner Script
 * Provides comprehensive testing with coverage reporting and CI integration
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkTestFiles() {
  log('🔍 Checking test files...', 'blue');
  
  const testDir = join(projectRoot, 'test', 'unit');
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .map(file => file.replace('.test.js', ''));
  
  log(`Found ${testFiles.length} test files:`, 'cyan');
  testFiles.forEach(file => {
    log(`  ✓ ${file}`, 'green');
  });
  
  return testFiles;
}

async function runUnitTests() {
  log('🧪 Running unit tests...', 'blue');
  
  try {
    await runCommand('npm', ['run', 'test:unit']);
    log('✅ Unit tests passed!', 'green');
    return true;
  } catch (error) {
    log('❌ Unit tests failed!', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function runCoverageTests() {
  log('📊 Running coverage tests...', 'blue');
  
  try {
    await runCommand('npm', ['run', 'test:coverage']);
    log('✅ Coverage tests passed!', 'green');
    return true;
  } catch (error) {
    log('❌ Coverage tests failed!', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function checkCoverageThresholds() {
  log('🎯 Checking coverage thresholds...', 'blue');
  
  try {
    await runCommand('npm', ['run', 'test:coverage:check']);
    log('✅ Coverage thresholds met!', 'green');
    return true;
  } catch (error) {
    log('❌ Coverage thresholds not met!', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function generateCoverageReport() {
  log('📈 Generating coverage report...', 'blue');
  
  try {
    await runCommand('npm', ['run', 'test:coverage:report']);
    log('✅ Coverage report generated!', 'green');
    log('📁 Report available at: coverage/index.html', 'cyan');
    return true;
  } catch (error) {
    log('❌ Failed to generate coverage report!', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting comprehensive test suite...', 'bright');
  log('=' .repeat(50), 'bright');
  
  const startTime = Date.now();
  let allPassed = true;
  
  try {
    // Check test files
    await checkTestFiles();
    log('');
    
    // Run unit tests
    const unitTestsPassed = await runUnitTests();
    allPassed = allPassed && unitTestsPassed;
    log('');
    
    // Run coverage tests
    const coverageTestsPassed = await runCoverageTests();
    allPassed = allPassed && coverageTestsPassed;
    log('');
    
    // Check coverage thresholds
    const coverageThresholdsPassed = await checkCoverageThresholds();
    allPassed = allPassed && coverageThresholdsPassed;
    log('');
    
    // Generate coverage report
    const reportGenerated = await generateCoverageReport();
    allPassed = allPassed && reportGenerated;
    log('');
    
  } catch (error) {
    log('💥 Test suite failed with error:', 'red');
    log(error.message, 'red');
    allPassed = false;
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  log('=' .repeat(50), 'bright');
  
  if (allPassed) {
    log('🎉 All tests passed successfully!', 'green');
    log(`⏱️  Total time: ${duration}ms`, 'cyan');
    log('📊 Coverage report: coverage/index.html', 'cyan');
  } else {
    log('💥 Some tests failed!', 'red');
    log(`⏱️  Total time: ${duration}ms`, 'yellow');
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'unit':
    runUnitTests().catch(console.error);
    break;
  case 'coverage':
    runCoverageTests().catch(console.error);
    break;
  case 'check':
    checkCoverageThresholds().catch(console.error);
    break;
  case 'report':
    generateCoverageReport().catch(console.error);
    break;
  case 'all':
  default:
    runAllTests().catch(console.error);
    break;
}
