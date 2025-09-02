import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import LobbyAnalytics from '../src/lobby-analytics.js'
import EnhancedRoomManager from '../src/enhanced-room-manager.js'
import EnhancedLobbyUI from '../src/enhanced-lobby-ui.js'
import HostAuthority from '../src/host-authority.js'
import RollbackP2P from '../src/rollback-p2p.js'

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
    
    describe('EnhancedRoomManager', () => {
      let roomManager
      
      beforeEach(() => {
        // Mock localStorage
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
        if (roomManager) {
          roomManager.destroy()
        }
      })
      
      it('should clear intervals on destroy', () => {
        roomManager.announceInterval = setInterval(() => {}, 1000)
        roomManager.cleanupInterval = setInterval(() => {}, 1000)
        roomManager.heartbeatInterval = setInterval(() => {}, 1000)
        
        const announceId = roomManager.announceInterval
        const cleanupId = roomManager.cleanupInterval
        const heartbeatId = roomManager.heartbeatInterval
        
        roomManager.destroy()
        
        // Intervals should be cleared
        expect(roomManager.announceInterval).toBeFalsy()
        expect(roomManager.cleanupInterval).toBeFalsy()
        expect(roomManager.heartbeatInterval).toBeFalsy()
      })
      
      it('should clear data structures on destroy', () => {
        roomManager.rooms.set('room1', { id: 'room1' })
        roomManager.players.set('player1', { id: 'player1' })
        roomManager.chatChannels.set('channel1', {})
        
        expect(roomManager.rooms.size).toBe(1)
        expect(roomManager.players.size).toBe(1)
        expect(roomManager.chatChannels.size).toBe(1)
        
        roomManager.destroy()
        
        expect(roomManager.rooms.size).toBe(0)
        expect(roomManager.players.size).toBe(0)
        expect(roomManager.chatChannels.size).toBe(0)
      })
      
      it('should clear matchmaking timeout when resolved', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
        
        // Mock the lobby actions
        roomManager.lobbyActions = {
          sendMatchmakingRequest: vi.fn()
        }
        
        // Start matchmaking
        const matchmakingPromise = roomManager.startMatchmaking({
          maxWaitTime: 5000
        })
        
        // Simulate matchmaking response
        roomManager.matchmakingResolver = {
          resolve: vi.fn(),
          reject: vi.fn(),
          timeout: 123
        }
        
        roomManager._handleMatchmakingResponse({
          requestId: roomManager.playerInfo.id,
          roomId: 'test-room'
        }, roomManager.playerInfo.id)
        
        expect(clearTimeoutSpy).toHaveBeenCalledWith(123)
        expect(roomManager.matchmakingResolver).toBeNull()
      })
    })
    
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
    describe('EnhancedLobbyUI', () => {
      let lobbyUI
      let container
      
      beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        
        lobbyUI = new EnhancedLobbyUI(container, {
          appId: 'test-app',
          serverUrl: 'ws://localhost:3000'
        })
      })
      
      afterEach(() => {
        if (lobbyUI) {
          lobbyUI.close()
        }
        if (container && container.parentNode) {
          container.parentNode.removeChild(container)
        }
      })
      
      it('should track event listeners when added', () => {
        const element = document.createElement('button')
        const handler = () => {}
        
        lobbyUI.addEventListener(element, 'click', handler)
        
        expect(lobbyUI.eventListeners.length).toBe(1)
        expect(lobbyUI.eventListeners[0]).toEqual({
          element,
          event: 'click',
          handler
        })
      })
      
      it('should remove all tracked event listeners on cleanup', () => {
        const element1 = document.createElement('button')
        const element2 = document.createElement('input')
        const handler1 = vi.fn()
        const handler2 = vi.fn()
        
        const removeSpy1 = vi.spyOn(element1, 'removeEventListener')
        const removeSpy2 = vi.spyOn(element2, 'removeEventListener')
        
        lobbyUI.addEventListener(element1, 'click', handler1)
        lobbyUI.addEventListener(element2, 'change', handler2)
        
        expect(lobbyUI.eventListeners.length).toBe(2)
        
        lobbyUI.cleanupEventListeners()
        
        expect(removeSpy1).toHaveBeenCalledWith('click', handler1)
        expect(removeSpy2).toHaveBeenCalledWith('change', handler2)
        expect(lobbyUI.eventListeners.length).toBe(0)
        expect(lobbyUI.boundHandlers.size).toBe(0)
      })
      
      it('should call cleanupEventListeners on close', () => {
        const cleanupSpy = vi.spyOn(lobbyUI, 'cleanupEventListeners')
        lobbyUI.close()
        expect(cleanupSpy).toHaveBeenCalled()
      })
      
      it('should handle null elements gracefully', () => {
        const handler = () => {}
        
        // Should not throw
        expect(() => {
          lobbyUI.addEventListener(null, 'click', handler)
        }).not.toThrow()
        
        expect(lobbyUI.eventListeners.length).toBe(0)
      })
    })
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
        const module = await import('../src/sound-system.js')
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
    it('should properly clean up all resources when components are destroyed', () => {
      const analytics = new LobbyAnalytics()
      const roomManager = new EnhancedRoomManager({
        appId: 'test-app',
        serverUrl: 'ws://localhost:3000'
      })
      const hostAuthority = new HostAuthority({
        updateRate: 60,
        stateSnapshotRate: 10
      })
      
      // Start various intervals
      analytics.startAggregation()
      roomManager.announceInterval = setInterval(() => {}, 1000)
      hostAuthority.updateInterval = setInterval(() => {}, 1000)
      
      // Destroy all
      analytics.destroy()
      roomManager.destroy()
      hostAuthority.destroy()
      
      // Verify cleanup
      expect(analytics.aggregationInterval).toBeNull()
      expect(roomManager.announceInterval).toBeFalsy()
      expect(hostAuthority.updateInterval).toBeNull()
    })
  })
})