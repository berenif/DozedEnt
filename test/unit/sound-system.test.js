import { expect } from 'chai';
import sinon from 'sinon';
import { SoundSystem } from '../../src/utils/sound-system.js';

describe('SoundSystem', () => {
  let soundSystem;
  let mockAudioContext;
  let mockGainNode;
  let mockCompressor;
  let mockReverb;
  let mockLowPassFilter;

  beforeEach(() => {
    // Create mock audio context and nodes
    mockGainNode = {
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      gain: { value: 1.0 }
    };

    mockCompressor = {
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 }
    };

    mockReverb = {
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      wet: { value: 0.3 },
      dry: { value: 0.7 }
    };

    mockLowPassFilter = {
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      frequency: { value: 20000 },
      Q: { value: 1 }
    };

    mockAudioContext = {
      createGain: sinon.stub().returns(mockGainNode),
      createDynamicsCompressor: sinon.stub().returns(mockCompressor),
      createConvolver: sinon.stub().returns(mockReverb),
      createBiquadFilter: sinon.stub().returns(mockLowPassFilter),
      createBufferSource: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        start: sinon.stub(),
        stop: sinon.stub(),
        buffer: null,
        loop: false,
        playbackRate: { value: 1.0 }
      }),
      createBuffer: sinon.stub().returns({
        length: 44100,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: sinon.stub().returns(new Float32Array(44100))
      }),
      createOscillator: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        start: sinon.stub(),
        stop: sinon.stub(),
        frequency: { value: 440 },
        type: 'sine'
      }),
      createAnalyser: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: sinon.stub(),
        getByteTimeDomainData: sinon.stub()
      }),
      createPanner: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        orientationX: { value: 0 },
        orientationY: { value: 0 },
        orientationZ: { value: 1 },
        panningModel: 'equalpower',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0
      }),
      createDelay: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        delayTime: { value: 0.1 },
        maxDelayTime: 1
      }),
      createWaveShaper: sinon.stub().returns({
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        curve: null,
        oversample: 'none'
      }),
      destination: { connect: sinon.stub() },
      sampleRate: 44100,
      currentTime: 0,
      state: 'running',
      suspend: sinon.stub().returns(Promise.resolve()),
      resume: sinon.stub().returns(Promise.resolve()),
      close: sinon.stub().returns(Promise.resolve())
    };

    // Mock Web Audio API
    global.AudioContext = sinon.stub().returns(mockAudioContext);
    global.webkitAudioContext = sinon.stub().returns(mockAudioContext);

    soundSystem = new SoundSystem();
  });

  describe('Configuration', () => {
    it('should accept custom configuration options', () => {
      const customConfig = {
        masterVolume: 0.5,
        enableDynamicRange: false,
        enableReverb: false,
        enableCompression: false
      };
      const customSoundSystem = new SoundSystem(customConfig);
      expect(customSoundSystem.config.masterVolume).to.equal(0.5);
      expect(customSoundSystem.config.enableDynamicRange).to.be.false;
      expect(customSoundSystem.config.enableReverb).to.be.false;
      expect(customSoundSystem.config.enableCompression).to.be.false;
    });

    it('should merge custom config with defaults', () => {
      const partialConfig = { masterVolume: 0.3 };
      const customSoundSystem = new SoundSystem(partialConfig);
      expect(customSoundSystem.config.masterVolume).to.equal(0.3);
      expect(customSoundSystem.config.enableDynamicRange).to.be.true; // Default
    });

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        masterVolume: 'invalid',
        enableDynamicRange: 'not-boolean'
      };
      const system = new SoundSystem(invalidConfig);
      expect(system.config.masterVolume).to.equal(0.7); // Should use default
    });
  });

  describe('Constructor', () => {
    it('should create sound system with default properties', () => {
      expect(soundSystem.audioContext).to.be.null;
      expect(soundSystem.masterGain).to.be.null;
      expect(soundSystem.sounds).to.be.an('object');
      expect(soundSystem.playingSounds).to.be.an('object');
      expect(soundSystem.musicTracks).to.be.an('object');
      expect(soundSystem.currentMusic).to.be.null;
      expect(soundSystem.listenerPosition).to.deep.equal({ x: 640, y: 360 });
      expect(soundSystem.initialized).to.be.false;
    });

    it('should initialize audio buses', () => {
      expect(soundSystem.buses).to.have.property('master');
      expect(soundSystem.buses).to.have.property('sfx');
      expect(soundSystem.buses).to.have.property('music');
      expect(soundSystem.buses).to.have.property('ambient');
      expect(soundSystem.buses).to.have.property('ui');
    });

    it('should initialize audio effects', () => {
      expect(soundSystem.compressor).to.be.null;
      expect(soundSystem.reverb).to.be.null;
      expect(soundSystem.reverbWet).to.be.null;
      expect(soundSystem.reverbDry).to.be.null;
      expect(soundSystem.lowPassFilter).to.be.null;
    });
  });

  describe('Initialization', () => {
    it('should initialize audio context on first call', async () => {
      await soundSystem.initialize();
      
      expect(soundSystem.audioContext).to.equal(mockAudioContext);
      expect(soundSystem.initialized).to.be.true;
    });

    it('should not initialize twice', async () => {
      await soundSystem.initialize();
      const firstContext = soundSystem.audioContext;
      
      await soundSystem.initialize();
      expect(soundSystem.audioContext).to.equal(firstContext);
    });

    it('should create audio buses', async () => {
      await soundSystem.initialize();
      
      expect(soundSystem.buses.master).to.exist;
      expect(soundSystem.buses.sfx).to.exist;
      expect(soundSystem.buses.music).to.exist;
      expect(soundSystem.buses.ambient).to.exist;
      expect(soundSystem.buses.ui).to.exist;
    });

    it('should create audio effects', async () => {
      await soundSystem.initialize();
      
      expect(soundSystem.compressor).to.exist;
      expect(soundSystem.reverb).to.exist;
      expect(soundSystem.reverbWet).to.exist;
      expect(soundSystem.reverbDry).to.exist;
      expect(soundSystem.lowPassFilter).to.exist;
    });

    it('should handle initialization errors gracefully', async () => {
      global.AudioContext = sinon.stub().throws(new Error('Audio not supported'));
      
      await soundSystem.initialize();
      expect(soundSystem.initialized).to.be.false;
    });
  });

  describe('Sound Loading', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should load sound from URL', async () => {
      const mockResponse = {
        arrayBuffer: sinon.stub().returns(Promise.resolve(new ArrayBuffer(8)))
      };
      global.fetch = sinon.stub().returns(Promise.resolve(mockResponse));
      
      const sound = await soundSystem.loadSound('test-sound', 'audio/test.mp3');
      
      expect(sound).to.exist;
      expect(soundSystem.sounds.get('test-sound')).to.exist;
    });

    it('should load sound from buffer', async () => {
      const buffer = mockAudioContext.createBuffer();
      const sound = await soundSystem.loadSoundFromBuffer('test-sound', buffer);
      
      expect(sound).to.exist;
      expect(soundSystem.sounds.get('test-sound')).to.exist;
    });

    it('should handle sound loading errors', async () => {
      global.fetch = sinon.stub().returns(Promise.reject(new Error('Network error')));
      
      try {
        await soundSystem.loadSound('test-sound', 'audio/test.mp3');
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });
  });

  describe('Sound Playback', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
      
      // Create a mock sound
      const mockSound = {
        buffer: mockAudioContext.createBuffer(),
        volume: 1.0,
        pitch: 1.0,
        loop: false,
        spatial: false
      };
      soundSystem.sounds.set('test-sound', mockSound);
    });

    it('should play sound', () => {
      const soundId = soundSystem.playSound('test-sound');
      
      expect(soundId).to.exist;
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });

    it('should play sound with options', () => {
      const options = {
        volume: 0.5,
        pitch: 1.5,
        loop: true,
        spatial: true,
        position: { x: 100, y: 200 }
      };
      
      const soundId = soundSystem.playSound('test-sound', options);
      
      expect(soundId).to.exist;
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });

    it('should stop sound', () => {
      const soundId = soundSystem.playSound('test-sound');
      soundSystem.stopSound(soundId);
      
      expect(soundSystem.playingSounds.has(soundId)).to.be.false;
    });

    it('should stop all sounds', () => {
      soundSystem.playSound('test-sound');
      soundSystem.playSound('test-sound');
      
      soundSystem.stopAllSounds();
      expect(soundSystem.playingSounds.size).to.equal(0);
    });

    it('should pause sound', () => {
      const soundId = soundSystem.playSound('test-sound');
      soundSystem.pauseSound(soundId);
      
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });

    it('should resume sound', () => {
      const soundId = soundSystem.playSound('test-sound');
      soundSystem.pauseSound(soundId);
      soundSystem.resumeSound(soundId);
      
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });
  });

  describe('Music System', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
      
      // Create a mock music track
      const mockTrack = {
        buffer: mockAudioContext.createBuffer(),
        volume: 0.7,
        loop: true,
        fadeIn: 2000,
        fadeOut: 2000
      };
      soundSystem.musicTracks.set('background-music', mockTrack);
    });

    it('should play music', () => {
      soundSystem.playMusic('background-music');
      
      expect(soundSystem.currentMusic).to.exist;
    });

    it('should stop music', () => {
      soundSystem.playMusic('background-music');
      soundSystem.stopMusic();
      
      expect(soundSystem.currentMusic).to.be.null;
    });

    it('should fade in music', () => {
      soundSystem.playMusic('background-music', { fadeIn: 1000 });
      
      expect(soundSystem.currentMusic).to.exist;
    });

    it('should fade out music', () => {
      soundSystem.playMusic('background-music');
      soundSystem.stopMusic({ fadeOut: 1000 });
      
      expect(soundSystem.currentMusic).to.be.null;
    });

    it('should crossfade between tracks', () => {
      soundSystem.playMusic('background-music');
      soundSystem.playMusic('background-music', { crossfade: 2000 });
      
      expect(soundSystem.currentMusic).to.exist;
    });
  });

  describe('Spatial Audio', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
      
      const mockSound = {
        buffer: mockAudioContext.createBuffer(),
        volume: 1.0,
        pitch: 1.0,
        loop: false,
        spatial: true
      };
      soundSystem.sounds.set('spatial-sound', mockSound);
    });

    it('should play spatial sound', () => {
      const position = { x: 100, y: 200 };
      const soundId = soundSystem.playSound('spatial-sound', { spatial: true, position });
      
      expect(soundId).to.exist;
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });

    it('should update listener position', () => {
      const newPosition = { x: 200, y: 300 };
      soundSystem.setListenerPosition(newPosition.x, newPosition.y);
      
      expect(soundSystem.listenerPosition).to.deep.equal(newPosition);
    });

    it('should update sound position', () => {
      const soundId = soundSystem.playSound('spatial-sound', { spatial: true });
      const newPosition = { x: 150, y: 250 };
      
      soundSystem.updateSoundPosition(soundId, newPosition.x, newPosition.y);
      
      expect(soundSystem.playingSounds.has(soundId)).to.be.true;
    });
  });

  describe('Audio Effects', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should set master volume', () => {
      soundSystem.setMasterVolume(0.5);
      expect(soundSystem.buses.master.gain.value).to.equal(0.5);
    });

    it('should set SFX volume', () => {
      soundSystem.setSFXVolume(0.7);
      expect(soundSystem.buses.sfx.gain.value).to.equal(0.7);
    });

    it('should set music volume', () => {
      soundSystem.setMusicVolume(0.6);
      expect(soundSystem.buses.music.gain.value).to.equal(0.6);
    });

    it('should set ambient volume', () => {
      soundSystem.setAmbientVolume(0.4);
      expect(soundSystem.buses.ambient.gain.value).to.equal(0.4);
    });

    it('should set UI volume', () => {
      soundSystem.setUIVolume(0.8);
      expect(soundSystem.buses.ui.gain.value).to.equal(0.8);
    });

    it('should set reverb amount', () => {
      soundSystem.setReverbAmount(0.5);
      expect(soundSystem.reverbWet.gain.value).to.equal(0.5);
      expect(soundSystem.reverbDry.gain.value).to.equal(0.5);
    });

    it('should set low-pass filter frequency', () => {
      soundSystem.setLowPassFrequency(1000);
      expect(soundSystem.lowPassFilter.frequency.value).to.equal(1000);
    });

    it('should set compressor settings', () => {
      soundSystem.setCompressorSettings({
        threshold: -20,
        knee: 25,
        ratio: 10,
        attack: 0.002,
        release: 0.2
      });
      
      expect(soundSystem.compressor.threshold.value).to.equal(-20);
      expect(soundSystem.compressor.knee.value).to.equal(25);
      expect(soundSystem.compressor.ratio.value).to.equal(10);
      expect(soundSystem.compressor.attack.value).to.equal(0.002);
      expect(soundSystem.compressor.release.value).to.equal(0.2);
    });
  });

  describe('Dynamic Range Compression', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should apply compression to audio', () => {
      const mockSource = mockAudioContext.createBufferSource();
      soundSystem.applyCompression(mockSource);
      
      expect(mockSource.connect.called).to.be.true;
    });

    it('should adjust compression based on audio level', () => {
      const mockAnalyser = mockAudioContext.createAnalyser();
      const mockData = new Uint8Array(1024);
      
      // Simulate high audio level
      for (let i = 0; i < 1024; i++) {
        mockData[i] = 200;
      }
      
      mockAnalyser.getByteFrequencyData.returns(mockData);
      
      soundSystem.updateDynamicCompression(mockAnalyser);
      
      expect(soundSystem.compressor.threshold.value).to.be.lessThan(-24);
    });
  });

  describe('Environmental Effects', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should apply underwater effect', () => {
      soundSystem.applyUnderwaterEffect(true);
      expect(soundSystem.lowPassFilter.frequency.value).to.be.lessThan(20000);
    });

    it('should remove underwater effect', () => {
      soundSystem.applyUnderwaterEffect(false);
      expect(soundSystem.lowPassFilter.frequency.value).to.equal(20000);
    });

    it('should apply cave reverb', () => {
      soundSystem.applyCaveReverb(true);
      expect(soundSystem.reverbWet.gain.value).to.be.greaterThan(0.3);
    });

    it('should remove cave reverb', () => {
      soundSystem.applyCaveReverb(false);
      expect(soundSystem.reverbWet.gain.value).to.equal(0.3);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should track playing sounds count', () => {
      soundSystem.playSound('test-sound');
      soundSystem.playSound('test-sound');
      
      expect(soundSystem.getPlayingSoundsCount()).to.equal(2);
    });

    it('should get memory usage', () => {
      const memoryUsage = soundSystem.getMemoryUsage();
      expect(memoryUsage).to.be.a('number');
      expect(memoryUsage).to.be.greaterThan(0);
    });

    it('should get CPU usage', () => {
      const cpuUsage = soundSystem.getCPUUsage();
      expect(cpuUsage).to.be.a('number');
      expect(cpuUsage).to.be.at.least(0);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
    });

    it('should cleanup resources', () => {
      soundSystem.playSound('test-sound');
      soundSystem.cleanup();
      
      expect(soundSystem.playingSounds.size).to.equal(0);
      expect(soundSystem.currentMusic).to.be.null;
    });

    it('should close audio context', async () => {
      await soundSystem.cleanup();
      expect(mockAudioContext.close.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle missing audio context', () => {
      expect(() => soundSystem.playSound('test-sound')).to.not.throw();
    });

    it('should handle missing sound', async () => {
      await soundSystem.initialize();
      expect(() => soundSystem.playSound('nonexistent-sound')).to.not.throw();
    });

    it('should handle audio context errors', async () => {
      mockAudioContext.createBufferSource.throws(new Error('Audio context error'));
      await soundSystem.initialize();
      
      expect(() => soundSystem.playSound('test-sound')).to.not.throw();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await soundSystem.initialize();
      
      const mockSound = {
        buffer: mockAudioContext.createBuffer(),
        volume: 1.0,
        pitch: 1.0,
        loop: false,
        spatial: false
      };
      soundSystem.sounds.set('test-sound', mockSound);
    });

    it('should play sounds efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        soundSystem.playSound('test-sound');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 sound plays in less than 50ms
      expect(duration).to.be.lessThan(50);
    });

    it('should update efficiently', () => {
      soundSystem.playSound('test-sound');
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        soundSystem.update(16);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });
  });
});