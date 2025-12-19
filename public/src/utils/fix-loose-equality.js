#!/usr/bin/env node

/**
 * Script to fix loose equality operators (==, !=) to strict equality (===, !==)
 * Usage: node fix-loose-equality.js [file-or-directory]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixLooseEquality(content) {
  let changes = 0;
  
  // Fix == to === (but not === which is already correct)
  content = content.replace(/([^=!<>])\s*==\s*([^=])/g, (match, left, right) => {
    changes++;
    return `${left} === ${right}`;
  });
  
  // Fix != to !== (but not !== which is already correct)
  content = content.replace(/([^!<>])\s*!=\s*([^=])/g, (match, left, right) => {
    changes++;
    return `${left} !== ${right}`;
  });
  
  return { content, changes };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, changes } = fixLooseEquality(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed ${changes} loose equality operators in ${filePath}`);
      return changes;
    } 
      console.log(`ℹ️  No loose equality operators found in ${filePath}`);
      return 0;
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function processDirectory(dirPath) {
  let totalChanges = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        totalChanges += processDirectory(fullPath);
      } else if (item.endsWith('.js') || item.endsWith('.ts')) {
        totalChanges += processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message);
  }
  
  return totalChanges;
}

function main() {
  const target = process.argv[2] || path.join(__dirname, '..');
  const resolvedTarget = path.resolve(target);
  
  console.log(`🔍 Fixing loose equality operators in: ${resolvedTarget}`);
  
  let totalChanges = 0;
  
  try {
    const stat = fs.statSync(resolvedTarget);
    
    if (stat.isDirectory()) {
      totalChanges = processDirectory(resolvedTarget);
    } else if (stat.isFile()) {
      totalChanges = processFile(resolvedTarget);
    } else {
      console.error('❌ Target is neither a file nor a directory');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error accessing target:', error.message);
    process.exit(1);
  }
  
  console.log(`\n🎉 Total changes made: ${totalChanges} loose equality operators fixed`);
  
  if (totalChanges > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes to ensure they are correct');
    console.log('2. Run tests to verify no behavior changes');
    console.log('3. Consider adding ESLint rules to prevent future issues:');
    console.log('   - "eqeqeq": ["error", "always"]');
    console.log('   - "no-eq-null": "error"');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixLooseEquality, processFile, processDirectory };
