#!/usr/bin/env node
/**
 * Dead Code Verification Script
 * Checks if files can be safely deleted by scanning for imports
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const CANDIDATES_FOR_DELETION = [
  'public/src/animation/player/procedural/player-animator.js',
  'public/src/animation/enhanced-animation-controller.js',
  'public/src/sound/sound-system.js',
  'public/src/utils/sound-system.js',
  'public/src/audio/audio-manager.js',
  'public/src/game/game-state-manager.js',
  'public/src/lobby/room-manager.js',
  'public/src/utils/room-manager.js',
  'public/src/input/InputStateManager.js',
  'public/src/animation/procedural/realistic-procedural-animator.js'
];

const SEARCH_DIRECTORIES = [
  'public/src',
  'public/demos',
  'demos',
  'test'
];

/**
 * Check if a file is imported anywhere
 */
function checkImports(filePath) {
  const basename = filePath.split('/').pop().replace('.js', '');
  const results = {
    file: filePath,
    imports: [],
    status: 'UNKNOWN'
  };

  for (const searchDir of SEARCH_DIRECTORIES) {
    try {
      // Search for various import patterns
      const patterns = [
        `from.*${basename}`,
        `require.*${basename}`,
        `import.*${basename}`
      ];

      for (const pattern of patterns) {
        try {
          const grepResult = execSync(
            `grep -r "${pattern}" ${searchDir} --exclude-dir=node_modules --include="*.js" --include="*.html" || true`,
            { encoding: 'utf8' }
          );

          if (grepResult.trim()) {
            const lines = grepResult.trim().split('\n').filter(line => {
              // Exclude the file itself
              return !line.includes(filePath);
            });

            results.imports.push(...lines.map(line => ({
              location: line.split(':')[0],
              code: line.substring(line.indexOf(':') + 1)
            })));
          }
        } catch (error) {
          // Grep returns exit code 1 when no matches found - that's okay
        }
      }
    } catch (error) {
      console.error(`Error searching ${searchDir}:`, error.message);
    }
  }

  // Determine status
  if (results.imports.length === 0) {
    results.status = '✅ SAFE TO DELETE';
  } else if (results.imports.every(imp => 
    imp.location.includes('/test/') || 
    imp.location.includes('index.js')
  )) {
    results.status = '⚠️ ONLY USED IN TESTS/INDEX';
  } else {
    results.status = '❌ STILL IN USE';
  }

  return results;
}

/**
 * Analyze file size and complexity
 */
function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const exports = (content.match(/export /g) || []).length;
    const classes = (content.match(/class /g) || []).length;
    const functions = (content.match(/function /g) || []).length;

    return {
      exists: true,
      lines,
      exports,
      classes,
      functions,
      complexity: lines > 500 ? '🔴 VIOLATES 500-LINE RULE' : '✅ SIZE OK'
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Find duplicate managers
 */
function findDuplicateManagers() {
  const managers = new Map();

  function scanDirectory(dir, prefix = '') {
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, prefix);
        } else if (file.endsWith('-manager.js') || file.endsWith('Manager.js')) {
          const key = file.toLowerCase().replace(/-/g, '');
          if (!managers.has(key)) {
            managers.set(key, []);
          }
          managers.get(key).push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or not readable
    }
  }

  for (const dir of SEARCH_DIRECTORIES) {
    scanDirectory(dir);
  }

  return managers;
}

/**
 * Main execution
 */
console.log('🔍 Dead Code Verification Report\n');
console.log('=' .repeat(80));
console.log('\n');

console.log('📁 Checking Deletion Candidates...\n');

const results = [];

for (const file of CANDIDATES_FOR_DELETION) {
  console.log(`\n📄 ${file}`);
  console.log('-'.repeat(80));

  const analysis = analyzeFile(file);
  if (!analysis.exists) {
    console.log('  ⚠️  File not found (may already be deleted)');
    continue;
  }

  console.log(`  📊 Lines: ${analysis.lines} ${analysis.complexity}`);
  console.log(`  📦 Exports: ${analysis.exports}, Classes: ${analysis.classes}, Functions: ${analysis.functions}`);

  const importCheck = checkImports(file);
  console.log(`  ${importCheck.status}`);

  if (importCheck.imports.length > 0) {
    console.log(`  📌 Found ${importCheck.imports.length} import(s):`);
    importCheck.imports.slice(0, 5).forEach(imp => {
      console.log(`     - ${imp.location}`);
      console.log(`       ${imp.code.trim()}`);
    });
    if (importCheck.imports.length > 5) {
      console.log(`     ... and ${importCheck.imports.length - 5} more`);
    }
  }

  results.push({
    file,
    ...analysis,
    ...importCheck
  });
}

console.log('\n\n');
console.log('=' .repeat(80));
console.log('📊 Duplicate Managers Analysis\n');

const duplicates = findDuplicateManagers();
let hasDuplicates = false;

for (const [name, paths] of duplicates.entries()) {
  if (paths.length > 1) {
    hasDuplicates = true;
    console.log(`\n⚠️  Multiple "${name}" found (${paths.length} copies):`);
    paths.forEach((path, index) => {
      const analysis = analyzeFile(path);
      console.log(`   ${index + 1}. ${path}`);
      console.log(`      Lines: ${analysis.lines}, Exports: ${analysis.exports}`);
    });
    console.log('   🔧 Action: Consolidate to ONE implementation');
  }
}

if (!hasDuplicates) {
  console.log('✅ No duplicate managers found');
}

console.log('\n\n');
console.log('=' .repeat(80));
console.log('📋 Summary\n');

const safeToDelete = results.filter(r => r.status === '✅ SAFE TO DELETE');
const onlyTests = results.filter(r => r.status === '⚠️ ONLY USED IN TESTS/INDEX');
const stillInUse = results.filter(r => r.status === '❌ STILL IN USE');

console.log(`✅ Safe to delete immediately: ${safeToDelete.length}`);
safeToDelete.forEach(r => console.log(`   - ${r.file}`));

console.log(`\n⚠️  Only used in tests/index: ${onlyTests.length}`);
onlyTests.forEach(r => console.log(`   - ${r.file} (verify tests, update index)`));

console.log(`\n❌ Still in use: ${stillInUse.length}`);
stillInUse.forEach(r => console.log(`   - ${r.file} (migration needed)`));

const godClasses = results.filter(r => r.exists && r.lines > 500);
console.log(`\n🔴 God classes (>500 lines): ${godClasses.length}`);
godClasses.forEach(r => console.log(`   - ${r.file} (${r.lines} lines)`));

console.log('\n');
console.log('=' .repeat(80));
console.log('\n✅ Verification complete. See CLEANUP_ACTION_PLAN.md for next steps.\n');

// Export results as JSON
import { writeFileSync } from 'fs';
writeFileSync(
  'GUIDELINES/PROGRESS/dead-code-analysis.json',
  JSON.stringify({ results, duplicates: Array.from(duplicates.entries()) }, null, 2)
);

console.log('📄 Detailed results saved to: GUIDELINES/PROGRESS/dead-code-analysis.json\n');

