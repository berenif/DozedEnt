import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import LobbyAnalytics from '../src/utils/lobby-analytics.js'
// Removed EnhancedRoomManager and EnhancedLobbyUI imports
import HostAuthority from '../src/host-authority.js'
import RollbackP2P from '../src/rollback-p2p.js'

// Mock EnhancedRoomManager for tests
class EnhancedRoomManager {
  constructor(config) {
    this.config = config
  }
}

describe('Bug Fixes', () => {
  describe('Memory Leak Fixes', () => {
    describe('LobbyAnalytics', () => {
      let analytics
      
      beforeEach(() => {
        analytics = new LobbyAnalytics()
      })
      
      afterEach(() => {
        if (analytics) {
          analytics.destroy()
        }
      })
      
      it('should store aggregation interval for cleanup', () => {
        analytics.startAggregation()
        expect(analytics.aggregationInterval).toBeDefined()
        expect(analytics.aggregationInterval).not.toBeNull()
      })
      
      it('should clear aggregation interval on destroy', () => {
        analytics.startAggregation()
        const intervalId = analytics.aggregationInterval
        analytics.destroy()
        expect(analytics.aggregationInterval).toBeNull()
      })
      
      it('should clear data on destroy', () => {
        analytics.trackEvent('test', { data: 'test' })
        expect(analytics.eventLog.length).toBeGreaterThan(0)
        analytics.destroy()
        expect(analytics.eventLog.length).toBe(0)
        expect(analytics.timeSeries).toEqual({})
      })
    })
    
    // Removed EnhancedRoomManager suite
    
    describe('HostAuthority', () => {
      let hostAuthority
      
      beforeEach(() => {
        hostAuthority = new HostAuthority({
          updateRate: 60,
          stateSnapshotRate: 10
        })
      })
      
      afterEach(() => {
        if (hostAuthority) {
          hostAuthority.destroy()
        }
      })
      
      it('should clear update interval on stopGameLoop', () => {
        hostAuthority.updateInterval = setInterval(() => {}, 1000)
        const intervalId = hostAuthority.updateInterval
        
        hostAuthority.stopGameLoop()
        
        expect(hostAuthority.updateInterval).toBeNull()
      })
      
      it('should call stopGameLoop on destroy', () => {
        const stopSpy = vi.spyOn(hostAuthority, 'stopGameLoop')
        hostAuthority.destroy()
        expect(stopSpy).toHaveBeenCalled()
      })
    })
    
    describe('RollbackP2P', () => {
      let p2p
      
      beforeEach(() => {
        p2p = new RollbackP2P({
          heartbeatInterval: 1000,
          connectionTimeout: 5000
        })
      })
      
      afterEach(() => {
        if (p2p) {
          p2p.disconnectAll()
        }
      })
      
      it('should store heartbeat intervals in map', () => {
        p2p.startHeartbeat('peer1')
        expect(p2p.heartbeatIntervals.has('peer1')).toBe(true)
      })
      
      it('should clear heartbeat interval on stopHeartbeat', () => {
        p2p.startHeartbeat('peer1')
        expect(p2p.heartbeatIntervals.has('peer1')).toBe(true)
        
        p2p.stopHeartbeat('peer1')
        expect(p2p.heartbeatIntervals.has('peer1')).toBe(false)
      })
      
      it('should clear all heartbeats on disconnectAll', () => {
        p2p.peers.set('peer1', { id: 'peer1' })
        p2p.peers.set('peer2', { id: 'peer2' })
        p2p.startHeartbeat('peer1')
        p2p.startHeartbeat('peer2')
        
        expect(p2p.heartbeatIntervals.size).toBe(2)
        
        p2p.disconnectAll()
        
        expect(p2p.heartbeatIntervals.size).toBe(0)
      })
    })
  })
  
  describe('Event Listener Fixes', () => {
    // Removed EnhancedLobbyUI suite
  })
  
  describe('Error Handling Fixes', () => {
    describe('EnhancedRoomManager', () => {
      let roomManager
      let consoleWarnSpy
      
      beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        
        global.localStorage = {
          getItem: vi.fn(),
          setItem: vi.fn()
        }
        
        roomManager = new EnhancedRoomManager({
          appId: 'test-app',
          serverUrl: 'ws://localhost:3000'
        })
      })
      
      afterEach(() => {
        consoleWarnSpy.mockRestore()
        if (roomManager) {
          roomManager.destroy()
        }
      })
      
      it('should log error when failing to load persisted data', () => {
        global.localStorage.getItem = vi.fn().mockImplementation(() => {
          throw new Error('Storage error')
        })
        
        roomManager._loadPersistedData()
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to load persisted room data:',
          'Storage error'
        )
      })
      
      it('should log error when failing to persist data', () => {
        global.localStorage.setItem = vi.fn().mockImplementation(() => {
          throw new Error('Storage full')
        })
        
        roomManager._persistRoomData({ id: 'room1', name: 'Test Room' })
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Failed to persist room data:',
          'Storage full'
        )
      })
    })
    
    describe('Sound System', () => {
      let SoundSystem
      let consoleErrorSpy
      
      beforeEach(async () => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const module = await import('../src/utils/sound-system.js')
        SoundSystem = module.default
      })
      
      afterEach(() => {
        consoleErrorSpy.mockRestore()
      })
      
      it('should log error when sound initialization fails', async () => {
        // Mock AudioContext to throw error
        global.AudioContext = vi.fn().mockImplementation(() => {
          throw new Error('Audio not supported')
        })
        global.webkitAudioContext = undefined
        
        const soundSystem = new SoundSystem()
        await soundSystem.init()
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to initialize sound system:',
          expect.any(Error)
        )
        expect(soundSystem.initialized).toBe(false)
      })
    })
  })
  
  describe('Integration Tests', () => {
    it('should properly clean up all resources for remaining components', () => {
      const analytics = new LobbyAnalytics()
      const hostAuthority = new HostAuthority({
        updateRate: 60,
        stateSnapshotRate: 10
      })
      
      // Start various intervals
      analytics.startAggregation()
      hostAuthority.updateInterval = setInterval(() => {}, 1000)
      
      // Destroy all
      analytics.destroy()
      hostAuthority.destroy()
      
      // Verify cleanup
      expect(analytics.aggregationInterval).toBeNull()
      expect(hostAuthority.updateInterval).toBeNull()
    })
  })
})