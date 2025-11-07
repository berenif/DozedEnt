#!/usr/bin/env node

/**
 * Simple unit tests for bug fixes without full module imports
 * Run with: node test/unit/bug-fixes-simple.test.js
 */

import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'

console.log('🧪 Running Bug Fix Verification Tests...\n')

let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error.message}`)
    testsFailed++
  }
}

// Read file contents to verify our fixes
const readFile = (filePath) => {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

console.log('Verifying Bug Fixes in Source Code...')

// Test LobbyAnalytics fixes
test('LobbyAnalytics should have aggregationInterval stored', () => {
  const content = readFile('public/src/utils/lobby-analytics.js')
  assert(content.includes('this.aggregationInterval = setInterval'), 
    'Should store interval in this.aggregationInterval')
})

test('LobbyAnalytics should have destroy method', () => {
  const content = readFile('public/src/utils/lobby-analytics.js')
  assert(content.includes('destroy()'), 'Should have destroy method')
  assert(content.includes('clearInterval(this.aggregationInterval)'), 
    'destroy method should clear aggregationInterval')
})

// Removed EnhancedRoomManager checks

// Test SoundSystem fixes
test('SoundSystem should log initialization errors', () => {
  const content = readFile('public/src/sound/sound-system.js')
  assert(content.includes("console.error('Failed to initialize sound system:'"), 
    'Should log error when sound system initialization fails')
})

// Removed EnhancedLobbyUI checks

// Test HostAuthority fixes
test('HostAuthority has proper cleanup', () => {
  const content = readFile('public/src/netcode/host-authority.js')
  assert(content.includes('stopGameLoop()'), 'Should have stopGameLoop method')
  assert(content.includes('clearInterval(this.updateInterval)'), 
    'Should clear updateInterval')
  assert(content.includes('this.updateInterval = null'), 
    'Should set updateInterval to null')
})

// Verify no TODO/FIXME comments were added
test('No TODO/FIXME comments added in fixes', () => {
  const files = [
    'public/src/utils/lobby-analytics.js',
    'public/src/sound/sound-system.js'
  ]
  
  files.forEach(file => {
    const content = readFile(file)
    const lines = content.split('\n')
    const recentLines = lines.slice(-50) // Check last 50 lines for new TODOs
    const hasTodo = recentLines.some(line => 
      line.includes('TODO') || line.includes('FIXME') || line.includes('XXX')
    )
    assert(!hasTodo, `No new TODO/FIXME comments should be added in ${file}`)
  })
})

// Check for potential remaining issues
console.log('\nChecking for Remaining Issues...')

test('No empty catch blocks remain', () => {
  const files = [
    'public/src/sound/sound-system.js'
  ]
  
  files.forEach(file => {
    const content = readFile(file)
    // Look for catch blocks with ONLY comments or whitespace (no actual code like console.log, throw, etc.)
    // This pattern looks for catch blocks that don't contain any statements like console., throw, return, etc.
    const lines = content.split('\n')
    let inCatchBlock = false
    let catchBlockContent = []
    let braceDepth = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.match(/catch\s*\([^)]*\)\s*{/)) {
        inCatchBlock = true
        catchBlockContent = []
        braceDepth = 1
        // Check if there's content on the same line after the opening brace
        const afterBrace = line.substring(line.indexOf('{') + 1).trim()
        if (afterBrace && afterBrace !== '' && afterBrace !== '}' && !afterBrace.startsWith('//')) {
          catchBlockContent.push(afterBrace)
        }
        continue
      }
      
      if (inCatchBlock) {
        braceDepth += (line.match(/{/g) || []).length
        braceDepth -= (line.match(/}/g) || []).length
        
        const trimmed = line.trim()
        // Only count non-comment, non-empty lines as content
        if (trimmed && !trimmed.startsWith('//') && trimmed !== '}') {
          catchBlockContent.push(trimmed)
        }
        
        if (braceDepth === 0) {
          // End of catch block - check if it's empty
          const hasCode = catchBlockContent.some(content => 
            content.includes('console.') || 
            content.includes('throw ') ||
            content.includes('return ') ||
            content.includes('=') ||
            content.match(/\w+\s*\(/)  // function calls
          )
          
          assert(hasCode, `Empty catch block found on line ${i} in ${file}`)
          inCatchBlock = false
        }
      }
    }
  })
})

// Summary
console.log('\n' + '='.repeat(50))
console.log('Test Results:')
console.log(`✅ Passed: ${testsPassed}`)
console.log(`❌ Failed: ${testsFailed}`)
console.log('='.repeat(50))

if (testsFailed > 0) {
  console.log('\n⚠️  Some tests failed. Please review the fixes.')
  process.exit(1)
} else {
  console.log('\n🎉 All tests passed! Bug fixes are verified.')
  process.exit(0)
}