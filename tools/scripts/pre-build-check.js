#!/usr/bin/env node

/**
 * Pre-build check script
 * Validates that all dependencies and configurations are in place before running build
 * This helps prevent build failures due to missing dependencies or misconfiguration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let hasErrors = false;
let hasWarnings = false;

function logSuccess(message) {
  console.log(chalk.green('✓'), message);
}

function logError(message) {
  console.log(chalk.red('✗'), message);
  hasErrors = true;
}

function logWarning(message) {
  console.log(chalk.yellow('⚠'), message);
  hasWarnings = true;
}

function logInfo(message) {
  console.log(chalk.blue('ℹ'), message);
}

console.log(chalk.bold('\n🔍 Running Pre-Build Checks...\n'));

// Check 1: Node.js version
console.log(chalk.bold('Checking Node.js version...'));
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 14) {
  logSuccess(`Node.js version ${nodeVersion} is supported`);
} else {
  logError(`Node.js version ${nodeVersion} is too old. Minimum required: v14.0.0`);
}

// Check 2: npm availability
console.log(chalk.bold('\nChecking npm...'));
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  logSuccess(`npm version ${npmVersion} is installed`);
} catch (error) {
  logError('npm is not installed or not in PATH');
}

// Check 3: package.json existence
console.log(chalk.bold('\nChecking package.json...'));
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  logSuccess('package.json found');
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check for build scripts
  if (packageJson.scripts?.build) {
    logSuccess('Build script is defined');
  } else {
    logError('Build script is missing in package.json');
  }
} else {
  logError('package.json not found');
}

// Check 4: node_modules and critical dependencies
console.log(chalk.bold('\nChecking dependencies...'));
const nodeModulesPath = path.join(rootDir, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  logError('node_modules directory not found. Run "npm install" first.');
} else {
  logSuccess('node_modules directory exists');
  
  // Check critical build dependencies
  const criticalDeps = [
    'rollup',
    '@rollup/plugin-commonjs',
    '@rollup/plugin-node-resolve',
    '@rollup/plugin-replace',
    '@rollup/plugin-terser'
  ];
  
  console.log(chalk.bold('\nChecking critical build dependencies...'));
  let missingDeps = [];
  
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      logSuccess(`${dep} is installed`);
    } else {
      logError(`${dep} is missing`);
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    logInfo(`\nTo install missing dependencies, run: ${chalk.cyan('npm install')}`);
  }
}

// Check 5: Rollup configuration files
console.log(chalk.bold('\nChecking rollup configuration files...'));
const configFiles = [
  'rollup.config.js',
  'rollup.config.animations.js',
  'rollup.config.wolf.js'
];

configFiles.forEach(file => {
  const filePath = path.join(rootDir, 'tools', 'config', file);
  if (fs.existsSync(filePath)) {
    logSuccess(`${file} found in tools/config/`);
  } else {
    logError(`${file} is missing from tools/config/`);
  }
});

// Check 6: Source files
console.log(chalk.bold('\nChecking source files...'));
// Only require the modules we actually ship now
const sourceFiles = [
  // Core exports
  'public/src/utils/index.js',

  // Currently supported networking implementation
  'public/src/netcode/mqtt.js',
  'public/src/utils/wasm.js',

  // Animation modules
  'public/src/animation/player/procedural/player-animator.js',
  'public/src/animation/enemy/wolf-animation.js'
];

let missingSources = [];
sourceFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    missingSources.push(file);
  }
});

if (missingSources.length === 0) {
  logSuccess('All source files are present');
} else {
  missingSources.forEach(file => {
    logError(`Source file missing: ${file}`);
  });
}

// Check 7: Check for package-lock.json
console.log(chalk.bold('\nChecking package-lock.json...'));
const lockPath = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  logSuccess('package-lock.json found');
  
  // Check if it's in sync with package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    
    if (lockJson.name === packageJson.name && lockJson.version === packageJson.version) {
      logSuccess('package-lock.json is in sync with package.json');
    } else {
      logWarning('package-lock.json might be out of sync with package.json');
    }
  } catch (error) {
    logWarning('Could not verify package-lock.json sync status');
  }
} else {
  logWarning('package-lock.json not found (will be created on npm install)');
}

// Check 8: Check dist directory
console.log(chalk.bold('\nChecking output directory...'));
const distPath = path.join(rootDir, 'dist');
if (fs.existsSync(distPath)) {
  logInfo('dist directory exists (will be overwritten during build)');
} else {
  logInfo('dist directory will be created during build');
}

// Check 9: Quick vulnerability check (optional)
console.log(chalk.bold('\nChecking for known vulnerabilities...'));
try {
  const auditResult = execSync('npm audit --json 2>/dev/null', { 
    cwd: rootDir, 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  const audit = JSON.parse(auditResult);
  const critical = audit.metadata?.vulnerabilities?.critical || 0;
  const high = audit.metadata?.vulnerabilities?.high || 0;
  
  if (critical > 0) {
    logError(`Found ${critical} critical vulnerabilities. Run "npm audit" for details.`);
  } else if (high > 0) {
    logWarning(`Found ${high} high severity vulnerabilities. Run "npm audit" for details.`);
  } else {
    logSuccess('No critical or high severity vulnerabilities found');
  }
} catch (error) {
  // npm audit might fail or not be available
  logInfo('Skipping vulnerability check (npm audit not available or failed)');
}

// Final summary
console.log(chalk.bold('\n📊 Pre-Build Check Summary:\n'));

if (hasErrors) {
  console.log(chalk.red.bold('❌ Pre-build check failed!'));
  console.log(chalk.red('Please fix the errors above before running the build.\n'));
  
  // Suggest fix command
  if (fs.existsSync(nodeModulesPath)) {
    console.log(chalk.yellow('Suggested fix:'), chalk.cyan('npm install'));
  } else {
    console.log(chalk.yellow('Suggested fix:'), chalk.cyan('npm install'));
  }
  
  process.exit(1);
} else if (hasWarnings) {
  console.log(chalk.yellow.bold('⚠️  Pre-build check passed with warnings'));
  console.log(chalk.yellow('The build should work, but you may want to address the warnings.\n'));
  process.exit(0);
} else {
  console.log(chalk.green.bold('✅ All pre-build checks passed!'));
  console.log(chalk.green('Ready to build. Run:'), chalk.cyan('npm run build\n'));
  process.exit(0);
}