import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Mock room implementation based on the netcode structure
const createMockRoom = () => {
  return class MockRoom {
    constructor(config = {}) {
      this.config = {
        appId: 'test-app',
        roomId: 'test-room',
        maxPeers: 8,
        hostAuthority: true,
        password: null,
        ...config
      };
      
      this.peers = new Map();
      this.isHost = false;
      this.hostPeerId = null;
      this.selfId = this.generateId();
      this.connected = false;
      this.destroyed = false;
      
      this.eventHandlers = new Map();
      this.messageQueue = [];
      this.gameState = null;
      
      // Room statistics
      this.stats = {
        peersConnected: 0,
        messagesReceived: 0,
        messagesSent: 0,
        connectionTime: null,
        lastHeartbeat: null
      };
      
      // Host authority specific
      this.authorityState = {
        gameTickRate: 60,
        stateVersion: 0,
        pendingInputs: new Map(),
        gameHistory: []
      };
    }

    generateId() {
      return Math.random().toString(36).substring(2, 15);
    }

    async join() {
      if (this.connected) {
        throw new Error('Already connected to room');
      }
      
      // Simulate connection process
      await this.simulateConnectionProcess();
      
      this.connected = true;
      this.stats.connectionTime = Date.now();
      this.stats.lastHeartbeat = Date.now();
      
      // Determine if we're the host (first to join)
      if (this.peers.size === 0) {
        this.isHost = true;
        this.hostPeerId = this.selfId;
        this.emit('hostChanged', this.selfId);
      }
      
      this.emit('connected');
      return this.selfId;
    }

    async simulateConnectionProcess() {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate finding existing peers
      if (Math.random() > 0.7) { // 30% chance of existing peers
        const existingPeerCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < existingPeerCount; i++) {
          await this.simulatePeerJoin(this.generateId());
        }
      }
    }

    async simulatePeerJoin(peerId) {
      if (this.peers.has(peerId)) return;
      
      const peer = {
        id: peerId,
        connected: true,
        lastSeen: Date.now(),
        ping: Math.floor(Math.random() * 100) + 20,
        isHost: peerId === this.hostPeerId
      };
      
      this.peers.set(peerId, peer);
      this.stats.peersConnected++;
      
      this.emit('peerJoined', peer);
      
      // Host migration if needed
      if (!this.hostPeerId || this.hostPeerId === peerId) {
        await this.handleHostMigration(peerId);
      }
    }

    async simulatePeerLeave(peerId) {
      const peer = this.peers.get(peerId);
      if (!peer) return;
      
      this.peers.delete(peerId);
      this.stats.peersConnected--;
      
      this.emit('peerLeft', peer);
      
      // Handle host migration if host left
      if (this.hostPeerId === peerId) {
        await this.handleHostMigration();
      }
    }

    async handleHostMigration(newHostId = null) {
      const oldHost = this.hostPeerId;
      
      if (newHostId) {
        this.hostPeerId = newHostId;
      } else {
        // Select new host (oldest peer or self)
        const availablePeers = Array.from(this.peers.keys());
        if (availablePeers.length > 0) {
          this.hostPeerId = availablePeers[0];
        } else {
          this.hostPeerId = this.selfId;
        }
      }
      
      this.isHost = (this.hostPeerId === this.selfId);
      
      // Update peer host status
      this.peers.forEach(peer => {
        peer.isHost = (peer.id === this.hostPeerId);
      });
      
      if (oldHost !== this.hostPeerId) {
        this.emit('hostChanged', this.hostPeerId, oldHost);
        
        if (this.isHost) {
          await this.initializeHostAuthority();
        }
      }
    }

    async initializeHostAuthority() {
      if (!this.config.hostAuthority) return;
      
      // Initialize host-specific state
      this.authorityState.stateVersion = 0;
      this.authorityState.pendingInputs.clear();
      this.authorityState.gameHistory = [];
      
      // Start game tick if we have a game state
      if (this.gameState) {
        this.startGameTick();
      }
      
      this.emit('hostAuthorityInitialized');
    }

    startGameTick() {
      if (this.gameTickInterval) {
        clearInterval(this.gameTickInterval);
      }
      
      const tickInterval = 1000 / this.authorityState.gameTickRate;
      this.gameTickInterval = setInterval(() => {
        this.processGameTick();
      }, tickInterval);
    }

    processGameTick() {
      if (!this.isHost || !this.gameState) return;
      
      // Process pending inputs
      const inputs = Array.from(this.authorityState.pendingInputs.values());
      this.authorityState.pendingInputs.clear();
      
      // Update game state (mock)
      this.authorityState.stateVersion++;
      
      // Store in history for rollback
      this.authorityState.gameHistory.push({
        version: this.authorityState.stateVersion,
        state: { ...this.gameState },
        inputs: [...inputs],
        timestamp: Date.now()
      });
      
      // Keep limited history
      if (this.authorityState.gameHistory.length > 300) { // 5 seconds at 60fps
        this.authorityState.gameHistory.shift();
      }
      
      // Broadcast state to peers
      this.broadcast('gameState', {
        version: this.authorityState.stateVersion,
        state: this.gameState,
        timestamp: Date.now()
      });
    }

    send(peerId, event, data) {
      if (!this.connected) {
        throw new Error('Room not connected');
      }
      
      const peer = this.peers.get(peerId);
      if (!peer) {
        throw new Error(`Peer ${peerId} not found`);
      }
      
      this.stats.messagesSent++;
      
      // Simulate message delivery
      setTimeout(() => {
        this.simulateMessageReceived(this.selfId, event, data);
      }, peer.ping);
    }

    broadcast(event, data, excludePeers = []) {
      if (!this.connected) {
        throw new Error('Room not connected');
      }
      
      this.peers.forEach((peer, peerId) => {
        if (!excludePeers.includes(peerId)) {
          this.send(peerId, event, data);
        }
      });
    }

    simulateMessageReceived(fromPeerId, event, data) {
      this.stats.messagesReceived++;
      
      // Handle special messages
      if (event === 'gameInput' && this.isHost) {
        this.handleGameInput(fromPeerId, data);
      } else if (event === 'heartbeat') {
        this.handleHeartbeat(fromPeerId, data);
      }
      
      this.emit('message', {
        from: fromPeerId,
        event,
        data,
        timestamp: Date.now()
      });
    }

    handleGameInput(fromPeerId, inputData) {
      if (!this.config.hostAuthority) return;
      
      // Store input for next game tick
      this.authorityState.pendingInputs.set(fromPeerId, {
        peerId: fromPeerId,
        input: inputData,
        timestamp: Date.now()
      });
    }

    handleHeartbeat(fromPeerId, data) {
      const peer = this.peers.get(fromPeerId);
      if (peer) {
        peer.lastSeen = Date.now();
        peer.ping = data.ping || peer.ping;
      }
    }

    sendGameInput(inputData) {
      if (this.isHost) {
        // Process input locally
        this.handleGameInput(this.selfId, inputData);
      } else {
        // Send to host
        if (this.hostPeerId) {
          this.send(this.hostPeerId, 'gameInput', inputData);
        }
      }
    }

    updateGameState(newState) {
      this.gameState = { ...newState };
      
      if (this.isHost && this.config.hostAuthority) {
        // Host updates are authoritative
        this.broadcast('gameState', {
          version: ++this.authorityState.stateVersion,
          state: this.gameState,
          timestamp: Date.now()
        });
      }
    }

    rollbackToState(version) {
      if (!this.isHost || !this.config.hostAuthority) {
        throw new Error('Only host can perform rollback');
      }
      
      const historyEntry = this.authorityState.gameHistory.find(h => h.version === version);
      if (!historyEntry) {
        throw new Error(`State version ${version} not found in history`);
      }
      
      // Restore state
      this.gameState = { ...historyEntry.state };
      this.authorityState.stateVersion = version;
      
      // Remove future history
      this.authorityState.gameHistory = this.authorityState.gameHistory.filter(h => h.version <= version);
      
      this.emit('rollback', { version, state: this.gameState });
    }

    getPeers() {
      return Array.from(this.peers.values());
    }

    getPeer(peerId) {
      return this.peers.get(peerId);
    }

    getPeerCount() {
      return this.peers.size;
    }

    getStats() {
      return {
        ...this.stats,
        peerCount: this.peers.size,
        isHost: this.isHost,
        hostPeerId: this.hostPeerId,
        gameStateVersion: this.authorityState.stateVersion
      };
    }

    startHeartbeat() {
      if (this.heartbeatInterval) return;
      
      this.heartbeatInterval = setInterval(() => {
        const heartbeatData = {
          ping: this.calculatePing(),
          timestamp: Date.now()
        };
        
        this.broadcast('heartbeat', heartbeatData);
        this.stats.lastHeartbeat = Date.now();
        
        // Check for disconnected peers
        this.checkPeerConnections();
      }, 5000); // 5 second heartbeat
    }

    calculatePing() {
      // Mock ping calculation
      return Math.floor(Math.random() * 50) + 20;
    }

    checkPeerConnections() {
      const now = Date.now();
      const timeout = 30000; // 30 second timeout
      
      const disconnectedPeers = [];
      this.peers.forEach((peer, peerId) => {
        if (now - peer.lastSeen > timeout) {
          disconnectedPeers.push(peerId);
        }
      });
      
      // Remove disconnected peers
      disconnectedPeers.forEach(peerId => {
        this.simulatePeerLeave(peerId);
      });
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
            console.error(`Error in room event handler for ${event}:`, error);
          }
        });
      }
    }

    leave() {
      if (!this.connected) return;
      
      this.connected = false;
      
      // Notify peers we're leaving
      this.broadcast('peerLeaving', { peerId: this.selfId });
      
      // Clean up intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.gameTickInterval) {
        clearInterval(this.gameTickInterval);
        this.gameTickInterval = null;
      }
      
      this.emit('disconnected');
    }

    destroy() {
      if (this.destroyed) return;
      
      this.leave();
      this.destroyed = true;
      
      // Clear all data
      this.peers.clear();
      this.eventHandlers.clear();
      this.messageQueue = [];
      this.gameState = null;
      
      this.emit('destroyed');
    }

    // Test utilities
    simulateNetworkLatency(minMs = 10, maxMs = 100) {
      return new Promise(resolve => {
        const delay = Math.random() * (maxMs - minMs) + minMs;
        setTimeout(resolve, delay);
      });
    }

    simulateNetworkPartition(duration = 5000) {
      const originalSend = this.send.bind(this);
      this.send = () => {
        throw new Error('Network partition - message dropped');
      };
      
      setTimeout(() => {
        this.send = originalSend;
        this.emit('networkRestored');
      }, duration);
    }
  };
};

describe('Room', function() {
  let Room;
  let room1;
  let room2;
  let room3;

  beforeEach(function() {
    Room = createMockRoom();
    
    room1 = new Room({ roomId: 'test-room-1' });
    room2 = new Room({ roomId: 'test-room-1' });
    room3 = new Room({ roomId: 'test-room-1' });
  });

  afterEach(function() {
    if (room1 && !room1.destroyed) room1.destroy();
    if (room2 && !room2.destroyed) room2.destroy();
    if (room3 && !room3.destroyed) room3.destroy();
  });

  describe('Room Creation and Joining', function() {
    it('should create room with configuration', function() {
      expect(room1.config.roomId).to.equal('test-room-1');
      expect(room1.config.maxPeers).to.equal(8);
      expect(room1.connected).to.be.false;
    });

    it('should join room successfully', async function() {
      const selfId = await room1.join();
      
      expect(selfId).to.be.a('string');
      expect(room1.connected).to.be.true;
      expect(room1.selfId).to.equal(selfId);
    });

    it('should become host when first to join', async function() {
      await room1.join();
      
      expect(room1.isHost).to.be.true;
      expect(room1.hostPeerId).to.equal(room1.selfId);
    });

    it('should emit connected event on join', function(done) {
      room1.on('connected', () => {
        expect(room1.connected).to.be.true;
        done();
      });
      
      room1.join();
    });

    it('should throw error when joining already connected room', async function() {
      await room1.join();
      
      try {
        await room1.join();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Already connected to room');
      }
    });
  });

  describe('Peer Management', function() {
    beforeEach(async function() {
      await room1.join();
    });

    it('should handle peer joining', async function() {
      const peerJoinedPromise = new Promise(resolve => {
        room1.on('peerJoined', resolve);
      });
      
      await room1.simulatePeerJoin('peer-2');
      const joinedPeer = await peerJoinedPromise;
      
      expect(joinedPeer.id).to.equal('peer-2');
      expect(room1.getPeerCount()).to.equal(1);
    });

    it('should handle peer leaving', async function() {
      await room1.simulatePeerJoin('peer-2');
      
      const peerLeftPromise = new Promise(resolve => {
        room1.on('peerLeft', resolve);
      });
      
      await room1.simulatePeerLeave('peer-2');
      const leftPeer = await peerLeftPromise;
      
      expect(leftPeer.id).to.equal('peer-2');
      expect(room1.getPeerCount()).to.equal(0);
    });

    it('should get peer list', async function() {
      await room1.simulatePeerJoin('peer-2');
      await room1.simulatePeerJoin('peer-3');
      
      const peers = room1.getPeers();
      
      expect(peers).to.have.length(2);
      expect(peers.map(p => p.id)).to.include.members(['peer-2', 'peer-3']);
    });

    it('should get specific peer', async function() {
      await room1.simulatePeerJoin('peer-2');
      
      const peer = room1.getPeer('peer-2');
      
      expect(peer.id).to.equal('peer-2');
      expect(peer.connected).to.be.true;
    });
  });

  describe('Host Authority', function() {
    beforeEach(async function() {
      await room1.join(); // room1 becomes host
    });

    it('should initialize host authority', async function() {
      const initPromise = new Promise(resolve => {
        room1.on('hostAuthorityInitialized', resolve);
      });
      
      await room1.initializeHostAuthority();
      await initPromise;
      
      expect(room1.authorityState.stateVersion).to.equal(0);
      expect(room1.authorityState.pendingInputs.size).to.equal(0);
    });

    it('should handle host migration', async function() {
      await room1.simulatePeerJoin('peer-2');
      
      const hostChangedPromise = new Promise(resolve => {
        room1.on('hostChanged', resolve);
      });
      
      // Simulate current host leaving
      await room1.simulatePeerLeave(room1.hostPeerId);
      const newHostId = await hostChangedPromise;
      
      expect(newHostId).to.equal('peer-2');
      expect(room1.hostPeerId).to.equal('peer-2');
      expect(room1.isHost).to.be.false;
    });

    it('should process game inputs as host', function() {
      const inputData = { x: 0.5, y: -0.3, action: 'move' };
      
      room1.sendGameInput(inputData);
      
      expect(room1.authorityState.pendingInputs.has(room1.selfId)).to.be.true;
      const storedInput = room1.authorityState.pendingInputs.get(room1.selfId);
      expect(storedInput.input).to.deep.equal(inputData);
    });

    it('should update and broadcast game state', function() {
      const newState = { playerX: 0.7, playerY: 0.2, health: 100 };
      const broadcastSpy = sinon.spy(room1, 'broadcast');
      
      room1.updateGameState(newState);
      
      expect(room1.gameState).to.deep.equal(newState);
      expect(broadcastSpy.calledWith('gameState')).to.be.true;
    });

    it('should perform rollback', async function() {
      room1.gameState = { x: 1, y: 1 };
      room1.authorityState.gameHistory = [
        { version: 1, state: { x: 0, y: 0 }, inputs: [], timestamp: Date.now() - 100 },
        { version: 2, state: { x: 1, y: 1 }, inputs: [], timestamp: Date.now() }
      ];
      room1.authorityState.stateVersion = 2;
      
      const rollbackPromise = new Promise(resolve => {
        room1.on('rollback', resolve);
      });
      
      room1.rollbackToState(1);
      const rollbackData = await rollbackPromise;
      
      expect(rollbackData.version).to.equal(1);
      expect(room1.gameState).to.deep.equal({ x: 0, y: 0 });
      expect(room1.authorityState.stateVersion).to.equal(1);
    });

    it('should throw error when non-host tries rollback', function() {
      room1.isHost = false;
      
      expect(() => {
        room1.rollbackToState(1);
      }).to.throw('Only host can perform rollback');
    });
  });

  describe('Messaging', function() {
    beforeEach(async function() {
      await room1.join();
      await room1.simulatePeerJoin('peer-2');
    });

    it('should send message to specific peer', function() {
      const messageData = { text: 'Hello peer!' };
      
      room1.send('peer-2', 'chat', messageData);
      
      expect(room1.stats.messagesSent).to.equal(1);
    });

    it('should broadcast message to all peers', function() {
      const sendSpy = sinon.spy(room1, 'send');
      const messageData = { announcement: 'Game starting!' };
      
      room1.broadcast('gameEvent', messageData);
      
      expect(sendSpy.calledWith('peer-2', 'gameEvent', messageData)).to.be.true;
    });

    it('should exclude peers from broadcast', function() {
      await room1.simulatePeerJoin('peer-3');
      const sendSpy = sinon.spy(room1, 'send');
      
      room1.broadcast('gameEvent', {}, ['peer-2']);
      
      expect(sendSpy.calledWith('peer-3')).to.be.true;
      expect(sendSpy.calledWith('peer-2')).to.be.false;
    });

    it('should receive and emit messages', function(done) {
      room1.on('message', (message) => {
        expect(message.from).to.equal('peer-2');
        expect(message.event).to.equal('chat');
        expect(message.data.text).to.equal('Hello back!');
        done();
      });
      
      room1.simulateMessageReceived('peer-2', 'chat', { text: 'Hello back!' });
    });

    it('should throw error when sending to non-existent peer', function() {
      expect(() => {
        room1.send('non-existent', 'test', {});
      }).to.throw('Peer non-existent not found');
    });

    it('should throw error when not connected', function() {
      room1.connected = false;
      
      expect(() => {
        room1.send('peer-2', 'test', {});
      }).to.throw('Room not connected');
    });
  });

  describe('Heartbeat and Connection Monitoring', function() {
    beforeEach(async function() {
      await room1.join();
      await room1.simulatePeerJoin('peer-2');
    });

    it('should start heartbeat system', function() {
      room1.startHeartbeat();
      
      expect(room1.heartbeatInterval).to.not.be.null;
    });

    it('should handle heartbeat messages', function() {
      const heartbeatData = { ping: 45, timestamp: Date.now() };
      
      room1.handleHeartbeat('peer-2', heartbeatData);
      
      const peer = room1.getPeer('peer-2');
      expect(peer.ping).to.equal(45);
      expect(peer.lastSeen).to.be.closeTo(Date.now(), 100);
    });

    it('should detect disconnected peers', function() {
      const peer = room1.getPeer('peer-2');
      peer.lastSeen = Date.now() - 35000; // 35 seconds ago (past timeout)
      
      const peerLeftPromise = new Promise(resolve => {
        room1.on('peerLeft', resolve);
      });
      
      room1.checkPeerConnections();
      
      return peerLeftPromise.then(leftPeer => {
        expect(leftPeer.id).to.equal('peer-2');
      });
    });
  });

  describe('Statistics', function() {
    beforeEach(async function() {
      await room1.join();
    });

    it('should track connection statistics', function() {
      const stats = room1.getStats();
      
      expect(stats.peerCount).to.equal(0);
      expect(stats.isHost).to.be.true;
      expect(stats.hostPeerId).to.equal(room1.selfId);
      expect(stats.connectionTime).to.be.a('number');
    });

    it('should update message statistics', function() {
      room1.stats.messagesReceived = 5;
      room1.stats.messagesSent = 3;
      
      const stats = room1.getStats();
      
      expect(stats.messagesReceived).to.equal(5);
      expect(stats.messagesSent).to.equal(3);
    });
  });

  describe('Game Tick System', function() {
    beforeEach(async function() {
      await room1.join();
      room1.gameState = { x: 0, y: 0 };
    });

    it('should start game tick when host', function() {
      room1.startGameTick();
      
      expect(room1.gameTickInterval).to.not.be.null;
    });

    it('should process game tick', function() {
      const broadcastSpy = sinon.spy(room1, 'broadcast');
      room1.authorityState.pendingInputs.set('test-peer', {
        peerId: 'test-peer',
        input: { x: 1, y: 0 },
        timestamp: Date.now()
      });
      
      room1.processGameTick();
      
      expect(room1.authorityState.stateVersion).to.equal(1);
      expect(room1.authorityState.gameHistory).to.have.length(1);
      expect(broadcastSpy.calledWith('gameState')).to.be.true;
    });

    it('should maintain game history limit', function() {
      // Fill history beyond limit
      for (let i = 0; i < 350; i++) {
        room1.authorityState.gameHistory.push({
          version: i,
          state: { x: i, y: i },
          inputs: [],
          timestamp: Date.now() - (350 - i) * 16
        });
      }
      
      room1.processGameTick();
      
      expect(room1.authorityState.gameHistory.length).to.equal(300);
    });
  });

  describe('Error Handling', function() {
    beforeEach(async function() {
      await room1.join();
    });

    it('should handle event handler errors gracefully', function() {
      const errorHandler = sinon.stub().throws(new Error('Handler error'));
      const normalHandler = sinon.stub();
      const consoleSpy = sinon.spy(console, 'error');
      
      room1.on('test-event', errorHandler);
      room1.on('test-event', normalHandler);
      
      room1.emit('test-event', 'data');
      
      expect(consoleSpy.called).to.be.true;
      expect(normalHandler.called).to.be.true;
    });

    it('should handle network simulation errors', function() {
      room1.simulateNetworkPartition(1000);
      
      expect(() => {
        room1.send('peer-2', 'test', {});
      }).to.throw('Network partition - message dropped');
    });
  });

  describe('Cleanup and Destruction', function() {
    beforeEach(async function() {
      await room1.join();
      room1.startHeartbeat();
      room1.startGameTick();
    });

    it('should leave room properly', function() {
      const broadcastSpy = sinon.spy(room1, 'broadcast');
      
      room1.leave();
      
      expect(room1.connected).to.be.false;
      expect(room1.heartbeatInterval).to.be.null;
      expect(room1.gameTickInterval).to.be.null;
      expect(broadcastSpy.calledWith('peerLeaving')).to.be.true;
    });

    it('should emit disconnected event on leave', function(done) {
      room1.on('disconnected', () => {
        done();
      });
      
      room1.leave();
    });

    it('should destroy room completely', function() {
      room1.destroy();
      
      expect(room1.destroyed).to.be.true;
      expect(room1.peers.size).to.equal(0);
      expect(room1.eventHandlers.size).to.equal(0);
      expect(room1.gameState).to.be.null;
    });

    it('should emit destroyed event on destroy', function(done) {
      room1.on('destroyed', () => {
        done();
      });
      
      room1.destroy();
    });

    it('should handle multiple destroy calls gracefully', function() {
      room1.destroy();
      room1.destroy(); // Should not throw
      
      expect(room1.destroyed).to.be.true;
    });
  });

  describe('Multi-Room Integration', function() {
    it('should handle multiple rooms independently', async function() {
      const room1Id = await room1.join();
      const room2Id = await room2.join();
      
      expect(room1Id).to.not.equal(room2Id);
      expect(room1.isHost).to.be.true;
      expect(room2.isHost).to.be.true;
    });

    it('should simulate peer-to-peer communication', async function() {
      await room1.join();
      await room2.join();
      
      // Simulate room1 and room2 finding each other
      await room1.simulatePeerJoin(room2.selfId);
      await room2.simulatePeerJoin(room1.selfId);
      
      expect(room1.getPeerCount()).to.equal(1);
      expect(room2.getPeerCount()).to.equal(1);
    });
  });
});
