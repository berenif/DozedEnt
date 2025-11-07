#!/usr/bin/env node

/**
 * Unit tests for bug fixes
 * Run with: node test/unit/bug-fixes.test.js
 */

import { strict as assert } from 'assert'
import LobbyAnalytics from '../../public/src/lobby-analytics.js'
// Removed EnhancedRoomManager import
import HostAuthority from '../../public/src/host-authority.js'

console.log('🧪 Running Bug Fix Tests...\n')

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

// Test LobbyAnalytics
console.log('Testing LobbyAnalytics...')

test('LobbyAnalytics should have destroy method', () => {
  const analytics = new LobbyAnalytics()
  assert(typeof analytics.destroy === 'function', 'destroy method should exist')
})

test('LobbyAnalytics should store aggregation interval', () => {
  const analytics = new LobbyAnalytics()
  analytics.startAggregation()
  assert(analytics.aggregationInterval !== undefined, 'aggregationInterval should be defined')
  assert(analytics.aggregationInterval !== null, 'aggregationInterval should not be null')
  clearInterval(analytics.aggregationInterval)
})

test('LobbyAnalytics destroy should clear interval', () => {
  const analytics = new LobbyAnalytics()
  analytics.startAggregation()
  const intervalId = analytics.aggregationInterval
  analytics.destroy()
  assert(analytics.aggregationInterval === null, 'aggregationInterval should be null after destroy')
})

test('LobbyAnalytics destroy should clear data', () => {
  const analytics = new LobbyAnalytics()
  analytics.trackEvent('test', { data: 'test' })
  assert(analytics.eventLog.length > 0, 'eventLog should have events')
  analytics.destroy()
  assert(analytics.eventLog.length === 0, 'eventLog should be empty after destroy')
  assert(Object.keys(analytics.timeSeries).length === 0, 'timeSeries should be empty after destroy')
})

// Removed EnhancedRoomManager tests

// Test HostAuthority
console.log('\nTesting HostAuthority...')

test('HostAuthority should have destroy method', () => {
  const hostAuthority = new HostAuthority({
    updateRate: 60,
    stateSnapshotRate: 10
  })
  assert(typeof hostAuthority.destroy === 'function', 'destroy method should exist')
  hostAuthority.destroy()
})

test('HostAuthority should clear update interval on stopGameLoop', () => {
  const hostAuthority = new HostAuthority({
    updateRate: 60,
    stateSnapshotRate: 10
  })
  
  hostAuthority.updateInterval = setInterval(() => {}, 1000)
  hostAuthority.stopGameLoop()
  
  assert(hostAuthority.updateInterval === null, 'updateInterval should be null after stopGameLoop')
  hostAuthority.destroy()
})

test('HostAuthority destroy should call stopGameLoop', () => {
  const hostAuthority = new HostAuthority({
    updateRate: 60,
    stateSnapshotRate: 10
  })
  
  let stopGameLoopCalled = false
  const originalStop = hostAuthority.stopGameLoop
  hostAuthority.stopGameLoop = function() {
    stopGameLoopCalled = true
    originalStop.call(this)
  }
  
  hostAuthority.destroy()
  assert(stopGameLoopCalled, 'stopGameLoop should be called on destroy')
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
  console.log('\n🎉 All tests passed! Bug fixes are working correctly.')
  process.exit(0)
}