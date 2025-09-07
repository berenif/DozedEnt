import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Mock peer implementation based on the netcode structure
const createMockPeer = () => {
  return class MockPeer {
    constructor(initiator = false, config = {}) {
      this.initiator = initiator;
      this.config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        sdpSemantics: 'unified-plan',
        ...config
      };
      
      this.connected = false;
      this.destroyed = false;
      this.localDescription = null;
      this.remoteDescription = null;
      this.connectionState = 'new';
      this.iceConnectionState = 'new';
      this.signalingState = 'stable';
      
      this.dataChannels = new Map();
      this.eventHandlers = new Map();
      this.pendingCandidates = [];
      
      // Mock RTCPeerConnection
      this.pc = this.createMockRTCPeerConnection();
      
      if (this.initiator) {
        this.createDataChannel('data');
      }
    }

    createMockRTCPeerConnection() {
      return {
        connectionState: 'new',
        iceConnectionState: 'new',
        signalingState: 'stable',
        localDescription: null,
        remoteDescription: null,
        
        createOffer: sinon.stub().resolves({
          type: 'offer',
          sdp: 'v=0\r\no=- 123456789 0 IN IP4 127.0.0.1\r\n...'
        }),
        
        createAnswer: sinon.stub().resolves({
          type: 'answer',
          sdp: 'v=0\r\no=- 987654321 0 IN IP4 127.0.0.1\r\n...'
        }),
        
        setLocalDescription: sinon.stub().callsFake((desc) => {
          this.pc.localDescription = desc;
          return Promise.resolve();
        }),
        
        setRemoteDescription: sinon.stub().callsFake((desc) => {
          this.pc.remoteDescription = desc;
          return Promise.resolve();
        }),
        
        addIceCandidate: sinon.stub().resolves(),
        
        createDataChannel: sinon.stub().callsFake((label, options = {}) => {
          return this.createMockDataChannel(label, options);
        }),
        
        close: sinon.stub(),
        
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
        
        getStats: sinon.stub().resolves(new Map([
          ['candidate-pair', {
            type: 'candidate-pair',
            state: 'succeeded',
            bytesReceived: 1024,
            bytesSent: 2048,
            currentRoundTripTime: 0.05
          }]
        ]))
      };
    }

    createMockDataChannel(label, options = {}) {
      const channel = {
        label,
        readyState: 'connecting',
        bufferedAmount: 0,
        maxRetransmits: options.maxRetransmits || null,
        ordered: options.ordered !== false,
        
        send: sinon.stub().callsFake((data) => {
          if (channel.readyState !== 'open') {
            throw new Error('DataChannel is not open');
          }
          // Simulate message delivery
          setTimeout(() => {
            this.simulateDataChannelMessage(label, data);
          }, 1);
        }),
        
        close: sinon.stub().callsFake(() => {
          channel.readyState = 'closed';
        }),
        
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub()
      };
      
      // Simulate channel opening
      setTimeout(() => {
        if (!this.destroyed) {
          channel.readyState = 'open';
          this.emit('channelOpen', { channel });
        }
      }, 10);
      
      return channel;
    }

    createDataChannel(label, options = {}) {
      const channel = this.pc.createDataChannel(label, options);
      this.dataChannels.set(label, channel);
      return channel;
    }

    async createOffer() {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.localDescription = offer;
      return offer;
    }

    async createAnswer() {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.localDescription = answer;
      return answer;
    }

    async setRemoteDescription(description) {
      await this.pc.setRemoteDescription(description);
      this.remoteDescription = description;
      
      // Simulate connection process
      setTimeout(() => {
        if (!this.destroyed) {
          this.connectionState = 'connecting';
          this.iceConnectionState = 'checking';
          this.emit('connectionStateChange', 'connecting');
          
          setTimeout(() => {
            if (!this.destroyed) {
              this.connectionState = 'connected';
              this.iceConnectionState = 'connected';
              this.connected = true;
              this.emit('connect');
              this.emit('connectionStateChange', 'connected');
            }
          }, 50);
        }
      }, 10);
    }

    async addIceCandidate(candidate) {
      if (this.remoteDescription) {
        await this.pc.addIceCandidate(candidate);
      } else {
        this.pendingCandidates.push(candidate);
      }
    }

    send(data, channelLabel = 'data') {
      const channel = this.dataChannels.get(channelLabel);
      if (!channel) {
        throw new Error(`DataChannel '${channelLabel}' not found`);
      }
      
      if (!this.connected) {
        throw new Error('Peer not connected');
      }
      
      channel.send(data);
    }

    simulateDataChannelMessage(channelLabel, data) {
      // Simulate receiving the message on a connected peer
      this.emit('data', data, channelLabel);
    }

    on(event, handler) {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }

    emit(event, ...args) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        });
      }
    }

    getStats() {
      return this.pc.getStats();
    }

    destroy() {
      if (this.destroyed) return;
      
      this.destroyed = true;
      this.connected = false;
      
      // Close all data channels
      this.dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
          channel.close();
        }
      });
      
      // Close peer connection
      this.pc.close();
      
      // Clear event handlers
      this.eventHandlers.clear();
      
      this.emit('close');
    }

    // Utility methods for testing
    simulateConnectionFailure() {
      this.connectionState = 'failed';
      this.iceConnectionState = 'failed';
      this.emit('error', new Error('Connection failed'));
    }

    simulateDisconnection() {
      this.connected = false;
      this.connectionState = 'disconnected';
      this.iceConnectionState = 'disconnected';
      this.emit('disconnect');
    }

    simulateReconnection() {
      this.connected = true;
      this.connectionState = 'connected';
      this.iceConnectionState = 'connected';
      this.emit('reconnect');
    }
  };
};

describe('Peer', function() {
  let Peer;
  let peer1;
  let peer2;
  let mockRTCPeerConnection;

  beforeEach(function() {
    Peer = createMockPeer();
    
    // Mock RTCPeerConnection globally
    mockRTCPeerConnection = sinon.stub();
    global.RTCPeerConnection = mockRTCPeerConnection;
    
    peer1 = new Peer(true); // Initiator
    peer2 = new Peer(false); // Responder
  });

  afterEach(function() {
    if (peer1 && !peer1.destroyed) peer1.destroy();
    if (peer2 && !peer2.destroyed) peer2.destroy();
    sinon.restore();
  });

  describe('Initialization', function() {
    it('should create initiator peer', function() {
      expect(peer1.initiator).to.be.true;
      expect(peer1.connected).to.be.false;
      expect(peer1.destroyed).to.be.false;
    });

    it('should create responder peer', function() {
      expect(peer2.initiator).to.be.false;
      expect(peer2.connected).to.be.false;
      expect(peer2.destroyed).to.be.false;
    });

    it('should use custom configuration', function() {
      const customConfig = {
        iceServers: [{ urls: 'stun:custom.server.com:3478' }]
      };
      
      const customPeer = new Peer(true, customConfig);
      expect(customPeer.config.iceServers[0].urls).to.equal('stun:custom.server.com:3478');
    });

    it('should create data channel for initiator', function() {
      expect(peer1.dataChannels.has('data')).to.be.true;
      expect(peer2.dataChannels.has('data')).to.be.false;
    });
  });

  describe('WebRTC Signaling', function() {
    it('should create offer', async function() {
      const offer = await peer1.createOffer();
      
      expect(offer.type).to.equal('offer');
      expect(offer.sdp).to.be.a('string');
      expect(peer1.localDescription).to.equal(offer);
    });

    it('should create answer', async function() {
      // First set remote description (offer)
      const offer = { type: 'offer', sdp: 'mock-offer-sdp' };
      await peer2.setRemoteDescription(offer);
      
      const answer = await peer2.createAnswer();
      
      expect(answer.type).to.equal('answer');
      expect(answer.sdp).to.be.a('string');
      expect(peer2.localDescription).to.equal(answer);
    });

    it('should set remote description', async function() {
      const offer = { type: 'offer', sdp: 'mock-offer-sdp' };
      await peer2.setRemoteDescription(offer);
      
      expect(peer2.remoteDescription).to.equal(offer);
    });

    it('should handle ICE candidates', async function() {
      const candidate = {
        candidate: 'candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };
      
      await peer1.addIceCandidate(candidate);
      expect(peer1.pc.addIceCandidate.calledWith(candidate)).to.be.true;
    });

    it('should queue ICE candidates before remote description', async function() {
      const candidate = { candidate: 'test-candidate' };
      
      await peer1.addIceCandidate(candidate);
      expect(peer1.pendingCandidates).to.include(candidate);
    });
  });

  describe('Data Channel Communication', function() {
    beforeEach(async function() {
      // Simulate connection establishment
      const offer = await peer1.createOffer();
      await peer2.setRemoteDescription(offer);
      
      const answer = await peer2.createAnswer();
      await peer1.setRemoteDescription(answer);
      
      // Wait for connection
      await new Promise(resolve => {
        peer1.on('connect', resolve);
      });
    });

    it('should send data through data channel', function() {
      const testData = 'Hello, peer!';
      
      peer1.send(testData);
      
      const channel = peer1.dataChannels.get('data');
      expect(channel.send.calledWith(testData)).to.be.true;
    });

    it('should receive data from peer', function(done) {
      const testData = 'Hello back!';
      
      peer1.on('data', (data) => {
        expect(data).to.equal(testData);
        done();
      });
      
      peer1.simulateDataChannelMessage('data', testData);
    });

    it('should handle multiple data channels', function() {
      peer1.createDataChannel('game-state');
      peer1.createDataChannel('chat');
      
      expect(peer1.dataChannels.has('game-state')).to.be.true;
      expect(peer1.dataChannels.has('chat')).to.be.true;
    });

    it('should throw error when sending on disconnected peer', function() {
      peer1.connected = false;
      
      expect(() => {
        peer1.send('test');
      }).to.throw('Peer not connected');
    });

    it('should throw error when using non-existent channel', function() {
      expect(() => {
        peer1.send('test', 'nonexistent');
      }).to.throw("DataChannel 'nonexistent' not found");
    });
  });

  describe('Connection Events', function() {
    it('should emit connect event when connected', function(done) {
      peer1.on('connect', () => {
        expect(peer1.connected).to.be.true;
        done();
      });
      
      // Simulate connection
      const offer = { type: 'offer', sdp: 'mock-sdp' };
      peer1.setRemoteDescription(offer);
    });

    it('should emit error event on connection failure', function(done) {
      peer1.on('error', (error) => {
        expect(error.message).to.equal('Connection failed');
        done();
      });
      
      peer1.simulateConnectionFailure();
    });

    it('should emit disconnect event when disconnected', function(done) {
      peer1.on('disconnect', () => {
        expect(peer1.connected).to.be.false;
        done();
      });
      
      peer1.simulateDisconnection();
    });

    it('should emit reconnect event when reconnected', function(done) {
      peer1.on('reconnect', () => {
        expect(peer1.connected).to.be.true;
        done();
      });
      
      peer1.simulateReconnection();
    });

    it('should emit close event when destroyed', function(done) {
      peer1.on('close', () => {
        done();
      });
      
      peer1.destroy();
    });
  });

  describe('Event Handling', function() {
    it('should add event listeners', function() {
      const handler = sinon.stub();
      peer1.on('test-event', handler);
      
      peer1.emit('test-event', 'data');
      
      expect(handler.calledWith('data')).to.be.true;
    });

    it('should remove event listeners', function() {
      const handler = sinon.stub();
      peer1.on('test-event', handler);
      peer1.off('test-event', handler);
      
      peer1.emit('test-event', 'data');
      
      expect(handler.called).to.be.false;
    });

    it('should handle multiple listeners for same event', function() {
      const handler1 = sinon.stub();
      const handler2 = sinon.stub();
      
      peer1.on('test-event', handler1);
      peer1.on('test-event', handler2);
      
      peer1.emit('test-event', 'data');
      
      expect(handler1.calledWith('data')).to.be.true;
      expect(handler2.calledWith('data')).to.be.true;
    });

    it('should handle errors in event handlers gracefully', function() {
      const errorHandler = sinon.stub().throws(new Error('Handler error'));
      const normalHandler = sinon.stub();
      const consoleSpy = sinon.spy(console, 'error');
      
      peer1.on('test-event', errorHandler);
      peer1.on('test-event', normalHandler);
      
      peer1.emit('test-event', 'data');
      
      expect(consoleSpy.called).to.be.true;
      expect(normalHandler.called).to.be.true;
    });
  });

  describe('Statistics', function() {
    beforeEach(async function() {
      // Simulate connection
      const offer = await peer1.createOffer();
      await peer2.setRemoteDescription(offer);
    });

    it('should get connection statistics', async function() {
      const stats = await peer1.getStats();
      
      expect(stats).to.be.instanceOf(Map);
      expect(stats.has('candidate-pair')).to.be.true;
    });

    it('should provide meaningful statistics data', async function() {
      const stats = await peer1.getStats();
      const candidatePair = stats.get('candidate-pair');
      
      expect(candidatePair.type).to.equal('candidate-pair');
      expect(candidatePair.bytesReceived).to.be.a('number');
      expect(candidatePair.bytesSent).to.be.a('number');
    });
  });

  describe('Cleanup and Destruction', function() {
    it('should destroy peer properly', function() {
      peer1.destroy();
      
      expect(peer1.destroyed).to.be.true;
      expect(peer1.connected).to.be.false;
      expect(peer1.pc.close.called).to.be.true;
    });

    it('should close data channels on destroy', function() {
      const channel = peer1.dataChannels.get('data');
      channel.readyState = 'open';
      
      peer1.destroy();
      
      expect(channel.close.called).to.be.true;
    });

    it('should clear event handlers on destroy', function() {
      const handler = sinon.stub();
      peer1.on('test-event', handler);
      
      peer1.destroy();
      
      expect(peer1.eventHandlers.size).to.equal(0);
    });

    it('should handle multiple destroy calls gracefully', function() {
      peer1.destroy();
      peer1.destroy(); // Should not throw
      
      expect(peer1.destroyed).to.be.true;
    });
  });

  describe('Error Handling', function() {
    it('should handle WebRTC API failures', async function() {
      peer1.pc.createOffer.rejects(new Error('WebRTC error'));
      
      try {
        await peer1.createOffer();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('WebRTC error');
      }
    });

    it('should handle data channel send failures', function() {
      const channel = peer1.dataChannels.get('data');
      channel.send.throws(new Error('Send failed'));
      
      expect(() => {
        peer1.send('test');
      }).to.throw('Send failed');
    });

    it('should handle malformed SDP', async function() {
      const invalidSdp = { type: 'offer', sdp: 'invalid-sdp' };
      peer1.pc.setRemoteDescription.rejects(new Error('Invalid SDP'));
      
      try {
        await peer1.setRemoteDescription(invalidSdp);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Invalid SDP');
      }
    });
  });

  describe('Performance', function() {
    beforeEach(async function() {
      // Establish connection
      const offer = await peer1.createOffer();
      await peer2.setRemoteDescription(offer);
      const answer = await peer2.createAnswer();
      await peer1.setRemoteDescription(answer);
      
      await new Promise(resolve => peer1.on('connect', resolve));
    });

    it('should handle high-frequency message sending', function() {
      const messages = [];
      for (let i = 0; i < 100; i++) {
        messages.push(`Message ${i}`);
      }
      
      messages.forEach(msg => {
        peer1.send(msg);
      });
      
      const channel = peer1.dataChannels.get('data');
      expect(channel.send.callCount).to.equal(100);
    });

    it('should manage memory efficiently with many events', function() {
      // Add and remove many event listeners
      for (let i = 0; i < 1000; i++) {
        const handler = () => {};
        peer1.on('test-event', handler);
        peer1.off('test-event', handler);
      }
      
      expect(peer1.eventHandlers.get('test-event')).to.have.length(0);
    });
  });

  describe('Integration', function() {
    it('should complete full connection handshake', async function() {
      const connectPromise1 = new Promise(resolve => peer1.on('connect', resolve));
      const connectPromise2 = new Promise(resolve => peer2.on('connect', resolve));
      
      // Simulate full handshake
      const offer = await peer1.createOffer();
      await peer2.setRemoteDescription(offer);
      
      const answer = await peer2.createAnswer();
      await peer1.setRemoteDescription(answer);
      
      await Promise.all([connectPromise1, connectPromise2]);
      
      expect(peer1.connected).to.be.true;
      expect(peer2.connected).to.be.true;
    });

    it('should exchange data bidirectionally', function(done) {
      let messagesReceived = 0;
      
      const checkComplete = () => {
        if (++messagesReceived === 2) done();
      };
      
      peer1.on('data', (data) => {
        expect(data).to.equal('Hello from peer2');
        checkComplete();
      });
      
      peer2.on('data', (data) => {
        expect(data).to.equal('Hello from peer1');
        checkComplete();
      });
      
      // Simulate bidirectional communication
      peer1.simulateDataChannelMessage('data', 'Hello from peer2');
      peer2.simulateDataChannelMessage('data', 'Hello from peer1');
    });
  });
});
