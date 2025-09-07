#!/usr/bin/env node

/**
 * UI Tests Runner
 * Runs all UI component tests with proper mocking and setup
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// UI test files to run
const uiTestFiles = [
  'test/unit/combat-feedback.test.js',
  'test/unit/ui-dom-integration.test.js',
  'test/unit/ui-performance.test.js'
];

console.log('🎮 Running UI Component Tests for DozedEnt');
console.log('=' .repeat(50));

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running: ${testFile}`);
    
    const mocha = spawn('npx', [
      'mocha',
      testFile,
      '--require', 'test/setup.js',
      '--timeout', '5000',
      '--reporter', 'spec'
    ], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true
    });

    mocha.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} - PASSED`);
        resolve(code);
      } else {
        console.log(`❌ ${testFile} - FAILED (exit code: ${code})`);
        resolve(code); // Don't reject, just continue with other tests
      }
    });

    mocha.on('error', (error) => {
      console.error(`💥 Error running ${testFile}:`, error.message);
      resolve(1);
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const testFile of uiTestFiles) {
    const result = await runTest(testFile);
    results.push({ file: testFile, code: result });
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 UI Test Results Summary');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(({ file, code }) => {
    const status = code === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${file}`);
    
    if (code === 0) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All UI tests passed! Great job!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test file(s) had failures. Check output above for details.`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Fatal error running UI tests:', error);
  process.exit(1);
});
