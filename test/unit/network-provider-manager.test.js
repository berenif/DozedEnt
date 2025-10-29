/**
 * Network Provider Manager Tests
 * Tests the NetworkProviderManager abstraction layer
 */

import { expect } from 'chai'
import NetworkProviderManager from '../../public/src/netcode/network-provider-manager.js'

describe('NetworkProviderManager', () => {
  let networkManager

  beforeEach(() => {
    networkManager = new NetworkProviderManager()
  })

  describe('Provider Management', () => {
    it('should return list of available providers', () => {
      const providers = networkManager.getAvailableProviders()
      
      expect(providers).to.be.an('array')
      expect(providers.length).to.be.greaterThan(0)
      
      // Check that each provider has required properties
      providers.forEach(provider => {
        expect(provider).to.have.property('id')
        expect(provider).to.have.property('name')
        expect(provider).to.have.property('isLoaded')
        expect(provider).to.have.property('config')
      })
    })

    it('should include all expected providers', () => {
      const providers = networkManager.getAvailableProviders()
      const providerIds = providers.map(p => p.id)
      
      expect(providerIds).to.include('torrent')
      expect(providerIds).to.include('firebase')
      expect(providerIds).to.include('ipfs')
      expect(providerIds).to.include('mqtt')
      expect(providerIds).to.include('supabase')
    })

    it('should handle unknown provider gracefully', async () => {
      const result = await networkManager.initializeProvider('unknown-provider')
      expect(result).to.be.false
    })
  })

  describe('Event Handling', () => {
    it('should register event handlers', () => {
      let eventFired = false
      
      networkManager.on('onProviderChanged', () => {
        eventFired = true
      })
      
      // Simulate provider change event
      if (networkManager.eventHandlers.onProviderChanged) {
        networkManager.eventHandlers.onProviderChanged('test-provider')
      }
      
      expect(eventFired).to.be.true
    })

    it('should handle unknown events gracefully', () => {
      // Should not throw error
      expect(() => {
        networkManager.on('unknownEvent', () => {})
      }).to.not.throw()
    })
  })

  describe('Statistics', () => {
    it('should track message statistics', () => {
      networkManager.updateMessageStats('sent')
      networkManager.updateMessageStats('received')
      
      const stats = networkManager.getStats()
      expect(stats.messagesSent).to.equal(1)
      expect(stats.messagesReceived).to.equal(1)
    })

    it('should reset statistics', () => {
      networkManager.updateMessageStats('sent')
      networkManager.updateMessageStats('received')
      
      networkManager.resetStats()
      
      const stats = networkManager.getStats()
      expect(stats.messagesSent).to.equal(0)
      expect(stats.messagesReceived).to.equal(0)
    })

    it('should provide comprehensive stats', () => {
      const stats = networkManager.getStats()
      
      expect(stats).to.have.property('messagesSent')
      expect(stats).to.have.property('messagesReceived')
      expect(stats).to.have.property('connectionsEstablished')
      expect(stats).to.have.property('errors')
      expect(stats).to.have.property('currentProvider')
      expect(stats).to.have.property('isConnected')
      expect(stats).to.have.property('peerCount')
    })
  })

  describe('Room Management', () => {
    it('should handle room operations without provider initialized', async () => {
      try {
        await networkManager.createRoom('test-room')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error.message).to.include('No provider initialized')
      }
    })

    it('should handle leave room when not connected', () => {
      // Should not throw error
      expect(() => {
        networkManager.leaveRoom()
      }).to.not.throw()
    })

    it('should handle action creation without room', () => {
      try {
        networkManager.createAction('test-action')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error.message).to.include('No active room')
      }
    })
  })

  describe('Provider Information', () => {
    it('should return null for current provider when none initialized', () => {
      const provider = networkManager.getCurrentProvider()
      expect(provider).to.be.null
    })

    it('should return current provider info when initialized', async () => {
      // Mock the import to avoid actual network calls
      const mockModule = { joinRoom: () => {} }
      networkManager.providers.torrent.module = mockModule
      networkManager.currentProvider = 'torrent'
      networkManager.isInitialized = true
      
      const provider = networkManager.getCurrentProvider()
      expect(provider).to.not.be.null
      expect(provider.id).to.equal('torrent')
      expect(provider.name).to.equal('Torrent (BitTorrent)')
      expect(provider.isInitialized).to.be.true
    })
  })

  describe('Configuration', () => {
    it('should have default configuration for all providers', () => {
      const providers = networkManager.getAvailableProviders()
      
      providers.forEach(provider => {
        expect(provider.config).to.have.property('appId')
        expect(provider.config).to.have.property('password')
        expect(provider.config.appId).to.equal('working-multiplayer-demo')
        expect(provider.config.password).to.be.null
      })
    })
  })
})
