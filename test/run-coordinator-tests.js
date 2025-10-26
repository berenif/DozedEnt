#!/usr/bin/env node
// run-coordinator-tests.js
// Script to run coordinator unit tests

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running Coordinator Unit Tests...\n');

// Test files to run
const testFiles = [
  'test/unit/coordinators/state-coordinator.spec.js',
  'test/unit/coordinators/input-coordinator.spec.js',
  'test/unit/replay/replay-recorder.spec.js',
  'test/unit/state/wasm-core-state.spec.js'
];

// Run mocha with the test files
const mocha = spawn('npx', [
  'mocha',
  '--reporter', 'spec',
  '--require', 'test/setup.js',
  '--timeout', '5000',
  ...testFiles
], {
  stdio: 'inherit',
  shell: true,
  cwd: join(__dirname, '..')
});

mocha.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All coordinator tests passed!');
  } else {
    console.error(`\n❌ Tests failed with exit code ${code}`);
    process.exit(code);
  }
});

mocha.on('error', (error) => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});

