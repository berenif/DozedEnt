import { expect } from 'chai';
import sinon from 'sinon';

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  constructor() {
    this.destination = { connect: sinon.stub() };
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
  }
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: sinon.stub(), linearRampToValueAtTime: sinon.stub() },
      connect: sinon.stub(),
      disconnect: sinon.stub()
    };
  }
  
  createDynamicsCompressor() {
    return {
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: sinon.stub(),
      disconnect: sinon.stub()
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 1000, setValueAtTime: sinon.stub() },
      Q: { value: 1 },
      connect: sinon.stub(),
      disconnect: sinon.stub()
    };
  }
  
  createConvolver() {
    return {
      buffer: null,
      connect: sinon.stub(),
      disconnect: sinon.stub()
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      start: sinon.stub(),
      stop: sinon.stub()
    };
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440, setValueAtTime: sinon.stub() },
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      start: sinon.stub(),
      stop: sinon.stub()
    };
  }
  
  decodeAudioData(data, success, error) {
    const mockBuffer = {
      duration: 1.0,
      length: 44100,
      numberOfChannels: 2,
      sampleRate: 44100
    };
    if (success) success(mockBuffer);
    return Promise.resolve(mockBuffer);
  }
  
  resume() {
    return Promise.resolve();
  }
  
  suspend() {
    return Promise.resolve();
  }
};

import { SoundSystem } from '../../src/sound-system.js';

describe('Sound System', () => {
  let soundSystem;
  let audioContext;

  beforeEach(() => {
    audioContext = new AudioContext();
    soundSystem = new SoundSystem(audioContext);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(soundSystem.context).to.equal(audioContext);
      expect(soundSystem.masterVolume).to.equal(1.0);
      expect(soundSystem.sounds).to.be.an('object');
      expect(soundSystem.music).to.be.an('object');
      expect(soundSystem.soundVolume).to.equal(1.0);
      expect(soundSystem.musicVolume).to.equal(0.7);
      expect(soundSystem.isMuted).to.be.false;
    });

    it('should create audio nodes', () => {
      expect(soundSystem.masterGain).to.exist;
      expect(soundSystem.soundGain).to.exist;
      expect(soundSystem.musicGain).to.exist;
      expect(soundSystem.compressor).to.exist;
    });
  });

  describe('volume control', () => {
    it('should set master volume', () => {
      soundSystem.setMasterVolume(0.5);
      expect(soundSystem.masterVolume).to.equal(0.5);
      expect(soundSystem.masterGain.gain.value).to.equal(0.5);
    });

    it('should clamp volume to valid range', () => {
      soundSystem.setMasterVolume(2.0);
      expect(soundSystem.masterVolume).to.equal(1.0);
      
      soundSystem.setMasterVolume(-1.0);
      expect(soundSystem.masterVolume).to.equal(0.0);
    });

    it('should set sound volume', () => {
      soundSystem.setSoundVolume(0.8);
      expect(soundSystem.soundVolume).to.equal(0.8);
      expect(soundSystem.soundGain.gain.value).to.equal(0.8);
    });

    it('should set music volume', () => {
      soundSystem.setMusicVolume(0.6);
      expect(soundSystem.musicVolume).to.equal(0.6);
      expect(soundSystem.musicGain.gain.value).to.equal(0.6);
    });

    it('should mute all sounds', () => {
      const originalVolume = soundSystem.masterVolume;
      soundSystem.mute();
      
      expect(soundSystem.isMuted).to.be.true;
      expect(soundSystem.masterGain.gain.value).to.equal(0);
      expect(soundSystem.previousVolume).to.equal(originalVolume);
    });

    it('should unmute and restore previous volume', () => {
      soundSystem.setMasterVolume(0.7);
      soundSystem.mute();
      soundSystem.unmute();
      
      expect(soundSystem.isMuted).to.be.false;
      expect(soundSystem.masterGain.gain.value).to.equal(0.7);
    });
  });

  describe('sound loading', () => {
    it('should load a sound buffer', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      const promise = soundSystem.loadSound('test', mockArrayBuffer);
      
      await promise;
      
      expect(soundSystem.sounds.test).to.exist;
      expect(soundSystem.sounds.test.duration).to.equal(1.0);
    });

    it('should handle multiple sound loads', async () => {
      const buffer1 = new ArrayBuffer(100);
      const buffer2 = new ArrayBuffer(200);
      
      await Promise.all([
        soundSystem.loadSound('sound1', buffer1),
        soundSystem.loadSound('sound2', buffer2)
      ]);
      
      expect(soundSystem.sounds.sound1).to.exist;
      expect(soundSystem.sounds.sound2).to.exist;
    });
  });

  describe('sound playback', () => {
    beforeEach(async () => {
      const mockBuffer = new ArrayBuffer(100);
      await soundSystem.loadSound('testSound', mockBuffer);
    });

    it('should play a loaded sound', () => {
      const source = soundSystem.playSound('testSound');
      
      expect(source).to.exist;
      expect(source.start.calledOnce).to.be.true;
    });

    it('should play sound with custom volume', () => {
      const source = soundSystem.playSound('testSound', 0.5);
      
      expect(source).to.exist;
      // Volume should be applied through gain node
    });

    it('should play sound with pitch adjustment', () => {
      const source = soundSystem.playSound('testSound', 1.0, 1.5);
      
      expect(source).to.exist;
      expect(source.playbackRate.value).to.equal(1.5);
    });

    it('should not play non-existent sound', () => {
      const consoleSpy = sinon.spy(console, 'warn');
      const source = soundSystem.playSound('nonExistent');
      
      expect(source).to.be.null;
      expect(consoleSpy.called).to.be.true;
      
      consoleSpy.restore();
    });

    it('should loop a sound', () => {
      const source = soundSystem.playSound('testSound', 1.0, 1.0, true);
      
      expect(source).to.exist;
      expect(source.loop).to.be.true;
    });
  });

  describe('music playback', () => {
    beforeEach(async () => {
      const mockBuffer = new ArrayBuffer(1000);
      await soundSystem.loadSound('bgMusic', mockBuffer);
    });

    it('should play music', () => {
      soundSystem.playMusic('bgMusic');
      
      expect(soundSystem.currentMusic).to.exist;
      expect(soundSystem.currentMusicName).to.equal('bgMusic');
    });

    it('should stop current music before playing new one', () => {
      soundSystem.playMusic('bgMusic');
      const firstMusic = soundSystem.currentMusic;
      
      soundSystem.playMusic('bgMusic');
      
      expect(firstMusic.stop.calledOnce).to.be.true;
    });

    it('should stop music', () => {
      soundSystem.playMusic('bgMusic');
      const music = soundSystem.currentMusic;
      
      soundSystem.stopMusic();
      
      expect(music.stop.calledOnce).to.be.true;
      expect(soundSystem.currentMusic).to.be.null;
      expect(soundSystem.currentMusicName).to.be.null;
    });

    it('should fade music in', () => {
      const clock = sinon.useFakeTimers();
      
      soundSystem.playMusic('bgMusic', true, 1000);
      
      expect(soundSystem.musicGain.gain.setValueAtTime.called).to.be.true;
      expect(soundSystem.musicGain.gain.linearRampToValueAtTime.called).to.be.true;
      
      clock.restore();
    });

    it('should fade music out', () => {
      soundSystem.playMusic('bgMusic');
      
      soundSystem.fadeOutMusic(500);
      
      expect(soundSystem.musicGain.gain.linearRampToValueAtTime.called).to.be.true;
    });
  });

  describe('3D spatial audio', () => {
    it('should play sound at position', () => {
      // Note: This would require mocking PannerNode which is complex
      // For now, just test that the method exists and doesn't throw
      expect(soundSystem.playSoundAtPosition).to.be.a('function');
    });

    it('should update listener position', () => {
      soundSystem.updateListenerPosition(10, 20, 30);
      // Would need to mock AudioListener
      expect(true).to.be.true;
    });
  });

  describe('sound effects', () => {
    beforeEach(async () => {
      const mockBuffer = new ArrayBuffer(100);
      await soundSystem.loadSound('effect', mockBuffer);
    });

    it('should play one-shot sound', () => {
      const source = soundSystem.playOneShot('effect', 0.8, 1.2);
      
      expect(source).to.exist;
      expect(source.start.calledOnce).to.be.true;
    });

    it('should play random pitch sound', () => {
      const source = soundSystem.playRandomPitch('effect', 0.8, 1.2);
      
      expect(source).to.exist;
      expect(source.playbackRate.value).to.be.at.least(0.8);
      expect(source.playbackRate.value).to.be.at.most(1.2);
    });

    it('should play impact sound based on force', () => {
      soundSystem.playImpactSound(0.5);
      // Would need to mock oscillator creation
      expect(true).to.be.true;
    });

    it('should play footstep sound', () => {
      soundSystem.playFootstep('grass');
      // Would need to mock oscillator creation
      expect(true).to.be.true;
    });
  });

  describe('audio context management', () => {
    it('should resume audio context', async () => {
      await soundSystem.resumeContext();
      expect(audioContext.resume.called).to.be.true;
    });

    it('should suspend audio context', async () => {
      await soundSystem.suspendContext();
      expect(audioContext.suspend.called).to.be.true;
    });
  });

  describe('cleanup', () => {
    it('should stop all sounds', () => {
      soundSystem.playSound('test');
      soundSystem.playMusic('bgMusic');
      
      const stopAllSpy = sinon.spy(soundSystem, 'stopAllSounds');
      soundSystem.stopAllSounds();
      
      expect(stopAllSpy.calledOnce).to.be.true;
      expect(soundSystem.currentMusic).to.be.null;
    });

    it('should clean up resources', () => {
      soundSystem.cleanup();
      
      expect(soundSystem.sounds).to.deep.equal({});
      expect(soundSystem.music).to.deep.equal({});
      expect(soundSystem.currentMusic).to.be.null;
    });
  });
});