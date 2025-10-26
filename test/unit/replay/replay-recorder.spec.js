// replay-recorder.spec.js
// Unit tests for ReplayRecorder

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { ReplayRecorder } from '../../../public/src/game/replay/ReplayRecorder.js';

describe('ReplayRecorder', () => {
  let recorder;

  beforeEach(() => {
    recorder = new ReplayRecorder({ enabled: false });
  });

  describe('constructor', () => {
    it('should initialize with disabled recording', () => {
      expect(recorder.enabled).to.be.false;
      expect(recorder.frames).to.be.empty;
    });

    it('should initialize with enabled recording when specified', () => {
      const enabled = new ReplayRecorder({ enabled: true });
      expect(enabled.enabled).to.be.true;
    });

    it('should initialize metadata', () => {
      expect(recorder.metadata).to.exist;
      expect(recorder.metadata).to.have.property('seed');
      expect(recorder.metadata).to.have.property('startTime');
      expect(recorder.metadata).to.have.property('version');
    });
  });

  describe('start()', () => {
    it('should enable recording', () => {
      const seed = 12345;
      recorder.start(seed);
      
      expect(recorder.enabled).to.be.true;
      expect(recorder.metadata.seed).to.equal(seed);
      expect(recorder.metadata.startTime).to.be.a('number');
    });

    it('should clear previous frames', () => {
      recorder.frames = [{ test: 'data' }];
      recorder.start(12345);
      
      expect(recorder.frames).to.be.empty;
    });
  });

  describe('stop()', () => {
    it('should disable recording', () => {
      recorder.enabled = true;
      recorder.stop();
      
      expect(recorder.enabled).to.be.false;
    });
  });

  describe('recordFrame()', () => {
    beforeEach(() => {
      recorder.start(12345);
    });

    it('should record frame when enabled', () => {
      recorder.recordFrame({
        tick: 1,
        input: { axisX: 0.5, axisY: 0 }
      });
      
      expect(recorder.frames).to.have.lengthOf(1);
      expect(recorder.frames[0]).to.have.property('tick', 1);
      expect(recorder.frames[0]).to.have.property('input');
      expect(recorder.frames[0]).to.have.property('timestamp');
    });

    it('should not record when disabled', () => {
      recorder.stop();
      recorder.recordFrame({
        tick: 1,
        input: { axisX: 0.5, axisY: 0 }
      });
      
      expect(recorder.frames).to.be.empty;
    });
  });

  describe('recordStateSnapshot()', () => {
    beforeEach(() => {
      recorder.start(12345);
    });

    it('should record snapshot every 60 frames', () => {
      recorder.recordStateSnapshot(60, { player: { x: 1, y: 2 } });
      
      expect(recorder.frames).to.have.lengthOf(1);
      expect(recorder.frames[0]).to.have.property('type', 'snapshot');
      expect(recorder.frames[0]).to.have.property('tick', 60);
      expect(recorder.frames[0]).to.have.property('state');
    });

    it('should not record non-60-frame snapshots', () => {
      recorder.recordStateSnapshot(59, { player: { x: 1, y: 2 } });
      recorder.recordStateSnapshot(61, { player: { x: 1, y: 2 } });
      
      expect(recorder.frames).to.be.empty;
    });
  });

  describe('export()', () => {
    it('should export replay data', () => {
      const seed = 12345;
      recorder.start(seed);
      recorder.recordFrame({ tick: 1, input: {} });
      recorder.recordFrame({ tick: 2, input: {} });
      
      const exported = recorder.export();
      
      expect(exported).to.have.property('metadata');
      expect(exported).to.have.property('frames');
      expect(exported).to.have.property('frameCount', 2);
      expect(exported.metadata.seed).to.equal(seed);
    });
  });

  describe('import()', () => {
    it('should import replay data', () => {
      const replayData = {
        metadata: {
          seed: 54321,
          startTime: Date.now(),
          version: '1.0.0'
        },
        frames: [
          { tick: 1, input: { axisX: 0.5, axisY: 0 } },
          { tick: 2, input: { axisX: 0.3, axisY: 0.5 } }
        ]
      };
      
      recorder.import(replayData);
      
      expect(recorder.metadata.seed).to.equal(54321);
      expect(recorder.frames).to.have.lengthOf(2);
    });
  });

  describe('clear()', () => {
    it('should clear all data', () => {
      recorder.start(12345);
      recorder.recordFrame({ tick: 1, input: {} });
      
      recorder.clear();
      
      expect(recorder.frames).to.be.empty;
      expect(recorder.metadata.seed).to.be.null;
      expect(recorder.metadata.startTime).to.be.null;
    });
  });

  describe('getFrameCount()', () => {
    it('should return frame count', () => {
      recorder.start(12345);
      recorder.recordFrame({ tick: 1, input: {} });
      recorder.recordFrame({ tick: 2, input: {} });
      recorder.recordFrame({ tick: 3, input: {} });
      
      expect(recorder.getFrameCount()).to.equal(3);
    });
  });

  describe('isRecording()', () => {
    it('should return recording status', () => {
      expect(recorder.isRecording()).to.be.false;
      
      recorder.start(12345);
      expect(recorder.isRecording()).to.be.true;
      
      recorder.stop();
      expect(recorder.isRecording()).to.be.false;
    });
  });
});

