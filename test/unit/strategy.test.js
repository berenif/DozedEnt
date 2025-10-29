import { expect } from 'chai';
import sinon from 'sinon';
import createStrategy from '../../public/src/strategy.js';

describe('Strategy Module', () => {
  let mockInit, mockSubscribe, mockAnnounce;
  let strategy;

  beforeEach(() => {
    mockInit = sinon.stub().resolves();
    mockSubscribe = sinon.stub().resolves();
    mockAnnounce = sinon.stub().resolves();
    
    strategy = createStrategy({
      init: mockInit,
      subscribe: mockSubscribe,
      announce: mockAnnounce
    });
  });

  describe('strategy factory', () => {
    it('should return a function when created', () => {
      expect(strategy).to.be.a('function');
    });

    it('should accept init, subscribe, and announce functions', () => {
      const customStrategy = createStrategy({
        init: () => {},
        subscribe: () => {},
        announce: () => {}
      });
      expect(customStrategy).to.be.a('function');
    });
  });

  describe('room creation', () => {
    it('should create a new room with valid config', () => {
      const config = { appId: 'test-app' };
      const roomId = 'test-room';
      
      const room = strategy(config, roomId);
      
      expect(room).to.be.an('object');
      expect(room).to.have.property('makeAction');
      expect(room).to.have.property('onPeerJoin');
      expect(room).to.have.property('onPeerLeave');
      expect(room).to.have.property('onPeerStream');
      expect(room).to.have.property('onPeerTrack');
      expect(room).to.have.property('leave');
      expect(room).to.have.property('getPeers');
      expect(room).to.have.property('addStream');
      expect(room).to.have.property('addTrack');
      expect(room).to.have.property('removeStream');
      expect(room).to.have.property('removeTrack');
      expect(room).to.have.property('replaceTrack');
      expect(room).to.have.property('ping');
    });

    it('should return the same room instance for duplicate calls', () => {
      const config = { appId: 'test-app' };
      const roomId = 'test-room';
      
      const room1 = strategy(config, roomId);
      const room2 = strategy(config, roomId);
      
      expect(room1).to.equal(room2);
    });

    it('should create different rooms for different roomIds', () => {
      const config = { appId: 'test-app' };
      
      const room1 = strategy(config, 'room1');
      const room2 = strategy(config, 'room2');
      
      expect(room1).to.not.equal(room2);
    });

    it('should create different rooms for different appIds', () => {
      const room1 = strategy({ appId: 'app1' }, 'room');
      const room2 = strategy({ appId: 'app2' }, 'room');
      
      expect(room1).to.not.equal(room2);
    });

    it('should handle onJoinError callback', () => {
      const config = { appId: 'test-app' };
      const roomId = 'test-room';
      const onJoinError = sinon.stub();
      
      const room = strategy(config, roomId, onJoinError);
      
      expect(room).to.be.an('object');
    });
  });

  describe('room methods', () => {
    let room;
    
    beforeEach(() => {
      const config = { appId: 'test-app' };
      room = strategy(config, 'test-room');
    });

    it('should have makeAction method that returns action functions', () => {
      const action = room.makeAction('test');
      
      expect(action).to.be.a('function');
      expect(action).to.have.property('toAll');
      expect(action).to.have.property('toAllExcept');
      expect(action.toAll).to.be.a('function');
      expect(action.toAllExcept).to.be.a('function');
    });

    it('should have event handler setters', () => {
      const handler = () => {};
      
      room.onPeerJoin(handler);
      room.onPeerLeave(handler);
      room.onPeerStream(handler);
      room.onPeerTrack(handler);
      
      // Should not throw
      expect(true).to.be.true;
    });

    it('should have getPeers method that returns an array', () => {
      const peers = room.getPeers();
      
      expect(peers).to.be.an('array');
    });

    it('should have leave method', () => {
      expect(room.leave).to.be.a('function');
      
      // Should not throw
      room.leave();
      expect(true).to.be.true;
    });

    it('should have ping method that returns a promise', () => {
      const pingResult = room.ping('test-peer');
      
      expect(pingResult).to.be.a('promise');
    });

    it('should have media stream methods', () => {
      expect(room.addStream).to.be.a('function');
      expect(room.addTrack).to.be.a('function');
      expect(room.removeStream).to.be.a('function');
      expect(room.removeTrack).to.be.a('function');
      expect(room.replaceTrack).to.be.a('function');
    });
  });

  describe('configuration handling', () => {
    it('should normalize config with password', () => {
      const config = {
        appId: 'test-app',
        password: 'secret123'
      };
      
      const room = strategy(config, 'test-room');
      expect(room).to.be.an('object');
    });

    it('should normalize config with rtcConfig', () => {
      const config = {
        appId: 'test-app',
        rtcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      };
      
      const room = strategy(config, 'test-room');
      expect(room).to.be.an('object');
    });

    it('should normalize config with logger options', () => {
      const config = {
        appId: 'test-app',
        logger: { level: 'debug', prefix: 'TestApp' }
      };
      
      const room = strategy(config, 'test-room');
      expect(room).to.be.an('object');
    });
  });

  describe('initialization', () => {
    it('should call init function on first room creation', async () => {
      const config = { appId: 'test-app' };
      
      strategy(config, 'test-room');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockInit.calledOnce).to.be.true;
    });

    it('should not call init multiple times', async () => {
      const config = { appId: 'test-app' };
      
      strategy(config, 'room1');
      strategy(config, 'room2');
      strategy(config, 'room3');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockInit.calledOnce).to.be.true;
    });
  });
});