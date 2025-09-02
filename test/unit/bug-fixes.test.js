#!/usr/bin/env node

/**
 * Unit tests for bug fixes
 * Run with: node test/unit/bug-fixes.test.js
 */

import { strict as assert } from 'assert'
import LobbyAnalytics from '../../src/lobby-analytics.js'
import EnhancedRoomManager from '../../src/enhanced-room-manager.js'
import HostAuthority from '../../src/host-authority.js'

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

// Test EnhancedRoomManager
console.log('\nTesting EnhancedRoomManager...')

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
}

test('EnhancedRoomManager should have destroy method', () => {
  const roomManager = new EnhancedRoomManager({
    appId: 'test-app',
    serverUrl: 'ws://localhost:3000'
  })
  assert(typeof roomManager.destroy === 'function', 'destroy method should exist')
  roomManager.destroy()
})

test('EnhancedRoomManager destroy should clear intervals', () => {
  const roomManager = new EnhancedRoomManager({
    appId: 'test-app',
    serverUrl: 'ws://localhost:3000'
  })
  
  // Set some intervals
  roomManager.announceInterval = setInterval(() => {}, 1000)
  roomManager.cleanupInterval = setInterval(() => {}, 1000)
  roomManager.heartbeatInterval = setInterval(() => {}, 1000)
  
  roomManager.destroy()
  
  assert(!roomManager.announceInterval, 'announceInterval should be cleared')
  assert(!roomManager.cleanupInterval, 'cleanupInterval should be cleared')
  assert(!roomManager.heartbeatInterval, 'heartbeatInterval should be cleared')
})

test('EnhancedRoomManager destroy should clear data structures', () => {
  const roomManager = new EnhancedRoomManager({
    appId: 'test-app',
    serverUrl: 'ws://localhost:3000'
  })
  
  roomManager.rooms.set('room1', { id: 'room1' })
  roomManager.players.set('player1', { id: 'player1' })
  roomManager.chatChannels.set('channel1', {})
  
  assert(roomManager.rooms.size === 1, 'rooms should have 1 entry')
  assert(roomManager.players.size === 1, 'players should have 1 entry')
  assert(roomManager.chatChannels.size === 1, 'chatChannels should have 1 entry')
  
  roomManager.destroy()
  
  assert(roomManager.rooms.size === 0, 'rooms should be empty after destroy')
  assert(roomManager.players.size === 0, 'players should be empty after destroy')
  assert(roomManager.chatChannels.size === 0, 'chatChannels should be empty after destroy')
})

test('EnhancedRoomManager should log errors properly', () => {
  const originalWarn = console.warn
  let warnCalled = false
  let warnMessage = ''
  
  console.warn = (msg, err) => {
    warnCalled = true
    warnMessage = msg
  }
  
  const roomManager = new EnhancedRoomManager({
    appId: 'test-app',
    serverUrl: 'ws://localhost:3000'
  })
  
  // Mock localStorage to throw error
  global.localStorage.getItem = () => {
    throw new Error('Storage error')
  }
  
  roomManager._loadPersistedData()
  
  assert(warnCalled, 'console.warn should be called')
  assert(warnMessage.includes('Failed to load persisted room data'), 'Should log correct error message')
  
  console.warn = originalWarn
  roomManager.destroy()
})

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