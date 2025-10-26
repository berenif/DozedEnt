// input-coordinator.spec.js
// Unit tests for InputCoordinator

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { InputCoordinator } from '../../../public/src/game/coordinators/InputCoordinator.js';

describe('InputCoordinator', () => {
  let coordinator;
  let mockWasmApi;
  let inputCalls;

  beforeEach(() => {
    inputCalls = [];
    
    mockWasmApi = {
      setPlayerInput: (...args) => {
        inputCalls.push(args);
      }
    };

    coordinator = new InputCoordinator(mockWasmApi, {
      recordingEnabled: false
    });
  });

  describe('constructor', () => {
    it('should initialize with WASM API', () => {
      expect(coordinator.wasmApi).to.equal(mockWasmApi);
    });

    it('should create InputMapper', () => {
      expect(coordinator.inputMapper).to.exist;
    });

    it('should initialize with recording disabled by default', () => {
      expect(coordinator.recordingEnabled).to.be.false;
      expect(coordinator.inputHistory).to.be.empty;
    });

    it('should enable recording when specified', () => {
      const recorder = new InputCoordinator(mockWasmApi, {
        recordingEnabled: true
      });
      expect(recorder.recordingEnabled).to.be.true;
    });
  });

  describe('processInput()', () => {
    it('should forward input to WASM', () => {
      coordinator.processInput();
      
      expect(inputCalls.length).to.equal(1);
      expect(inputCalls[0]).to.have.lengthOf(8);
    });

    it('should return input frame', () => {
      const frame = coordinator.processInput();
      
      expect(frame).to.have.property('axisX');
      expect(frame).to.have.property('axisY');
      expect(frame).to.have.property('flags');
    });
  });

  describe('recording', () => {
    beforeEach(() => {
      coordinator.setRecording(true);
    });

    it('should record input frames when enabled', () => {
      coordinator.processInput();
      coordinator.processInput();
      coordinator.processInput();
      
      expect(coordinator.inputHistory).to.have.lengthOf(3);
    });

    it('should not record when disabled', () => {
      coordinator.setRecording(false);
      coordinator.processInput();
      
      expect(coordinator.inputHistory).to.be.empty;
    });

    it('should clear history when recording disabled', () => {
      coordinator.processInput();
      coordinator.processInput();
      expect(coordinator.inputHistory).to.have.lengthOf(2);
      
      coordinator.setRecording(false);
      expect(coordinator.inputHistory).to.be.empty;
    });
  });

  describe('getInputHistory()', () => {
    it('should return copy of history', () => {
      coordinator.setRecording(true);
      coordinator.processInput();
      
      const history = coordinator.getInputHistory();
      expect(history).to.have.lengthOf(1);
      
      // Modify copy shouldn't affect original
      history.push({ test: 'data' });
      expect(coordinator.inputHistory).to.have.lengthOf(1);
    });
  });

  describe('clearHistory()', () => {
    it('should clear input history', () => {
      coordinator.setRecording(true);
      coordinator.processInput();
      coordinator.processInput();
      
      expect(coordinator.inputHistory).to.have.lengthOf(2);
      
      coordinator.clearHistory();
      expect(coordinator.inputHistory).to.be.empty;
    });
  });
});

