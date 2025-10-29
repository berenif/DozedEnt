import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { SoundSystem } from '../../public/src/sound-system.js';

describe('SoundSystem', function() {
  let soundSystem;
  let mockAudioContext;
  let mockGainNode;
  let mockAudioBuffer;
  let mockBufferSource;
  let mockAnalyser;
  let mockBiquadFilter;

  beforeEach(function() {
    // Mock Web Audio API
    mockGainNode = {
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      gain: { value: 1, setValueAtTime: sinon.stub() }
    };

    mockAudioBuffer = {
      duration: 2.5,
      length: 44100 * 2.5,
      sampleRate: 44100
    };

    mockBufferSource = {
      buffer: null,
      connect: sinon.stub(),
      start: sinon.stub(),
      stop: sinon.stub(),
      playbackRate: { value: 1 },
      loop: false,
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub()
    };

    mockAnalyser = {
      connect: sinon.stub(),
      getByteFrequencyData: sinon.stub(),
      fftSize: 256,
      frequencyBinCount: 128
    };

    mockBiquadFilter = {
      connect: sinon.stub(),
      frequency: { value: 350, setValueAtTime: sinon.stub() },
      Q: { value: 1 },
      type: 'lowpass'
    };

    mockAudioContext = {
      createGain: sinon.stub().returns(mockGainNode),
      createBufferSource: sinon.stub().returns(mockBufferSource),
      createAnalyser: sinon.stub().returns(mockAnalyser),
      createBiquadFilter: sinon.stub().returns(mockBiquadFilter),
      decodeAudioData: sinon.stub().resolves(mockAudioBuffer),
      destination: { connect: sinon.stub() },
      currentTime: 0,
      state: 'running',
      resume: sinon.stub().resolves(),
      suspend: sinon.stub().resolves(),
      close: sinon.stub().resolves()
    };

    // Mock global AudioContext
    global.AudioContext = sinon.stub().returns(mockAudioContext);
    global.webkitAudioContext = sinon.stub().returns(mockAudioContext);

    // Mock fetch for audio loading
    global.fetch = sinon.stub().resolves({
      ok: true,
      arrayBuffer: sinon.stub().resolves(new ArrayBuffer(1024))
    });

    soundSystem = new SoundSystem();
  });

  afterEach(function() {
    sinon.restore();
    delete global.AudioContext;
    delete global.webkitAudioContext;
    delete global.fetch;
  });

  describe('Initialization', function() {
    it('should initialize with default configuration', function() {
      expect(soundSystem).to.be.an.instanceOf(SoundSystem);
      expect(soundSystem.masterVolume).to.equal(0.7);
      expect(soundSystem.enabled).to.be.true;
    });

    it('should initialize with custom configuration', function() {
      const config = {
        masterVolume: 0.5,
        enabled: false,
        maxSources: 16
      };
      const customSoundSystem = new SoundSystem(config);
      expect(customSoundSystem.masterVolume).to.equal(0.5);
      expect(customSoundSystem.enabled).to.be.false;
    });

    it('should handle AudioContext creation failure gracefully', function() {
      global.AudioContext = undefined;
      global.webkitAudioContext = undefined;
      
      const consoleSpy = sinon.spy(console, 'error');
      const fallbackSystem = new SoundSystem();
      
      expect(fallbackSystem.audioContext).to.be.null;
      expect(consoleSpy.called).to.be.true;
    });
  });

  describe('Audio Loading', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
    });

    it('should load audio files successfully', async function() {
      const result = await soundSystem.loadSound('test', '/audio/test.mp3');
      
      expect(result).to.be.true;
      expect(global.fetch.calledWith('/audio/test.mp3')).to.be.true;
      expect(mockAudioContext.decodeAudioData.called).to.be.true;
      expect(soundSystem.sounds.has('test')).to.be.true;
    });

    it('should handle loading failures gracefully', async function() {
      global.fetch.rejects(new Error('Network error'));
      const consoleSpy = sinon.spy(console, 'error');
      
      const result = await soundSystem.loadSound('test', '/audio/nonexistent.mp3');
      
      expect(result).to.be.false;
      expect(consoleSpy.called).to.be.true;
      expect(soundSystem.sounds.has('test')).to.be.false;
    });

    it('should load multiple sounds in batch', async function() {
      const sounds = {
        'jump': '/audio/jump.mp3',
        'attack': '/audio/attack.mp3',
        'hurt': '/audio/hurt.mp3'
      };
      
      const results = await soundSystem.loadSounds(sounds);
      
      expect(results.jump).to.be.true;
      expect(results.attack).to.be.true;
      expect(results.hurt).to.be.true;
      expect(soundSystem.sounds.size).to.equal(3);
    });
  });

  describe('Sound Playback', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
    });

    it('should play sounds with default settings', function() {
      const result = soundSystem.playSound('test');
      
      expect(result).to.not.be.null;
      expect(mockAudioContext.createBufferSource.called).to.be.true;
      expect(mockAudioContext.createGain.called).to.be.true;
      expect(mockBufferSource.start.called).to.be.true;
    });

    it('should play sounds with custom volume', function() {
      soundSystem.playSound('test', { volume: 0.5 });
      
      expect(mockGainNode.gain.value).to.equal(0.5 * 0.7); // volume * masterVolume
    });

    it('should play looping sounds', function() {
      soundSystem.playSound('test', { loop: true });
      
      expect(mockBufferSource.loop).to.be.true;
    });

    it('should handle playback rate changes', function() {
      soundSystem.playSound('test', { playbackRate: 1.5 });
      
      expect(mockBufferSource.playbackRate.value).to.equal(1.5);
    });

    it('should not play when disabled', function() {
      soundSystem.enabled = false;
      const result = soundSystem.playSound('test');
      
      expect(result).to.be.null;
      expect(mockBufferSource.start.called).to.be.false;
    });

    it('should handle non-existent sounds gracefully', function() {
      const consoleSpy = sinon.spy(console, 'warn');
      const result = soundSystem.playSound('nonexistent');
      
      expect(result).to.be.null;
      expect(consoleSpy.called).to.be.true;
    });
  });

  describe('3D Positional Audio', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
    });

    it('should create 3D positioned sounds', function() {
      const mockPanner = {
        connect: sinon.stub(),
        setPosition: sinon.stub(),
        setOrientation: sinon.stub(),
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1
      };
      
      mockAudioContext.createPanner = sinon.stub().returns(mockPanner);
      
      const position = { x: 5, y: 0, z: 3 };
      soundSystem.playSound3D('test', position);
      
      expect(mockAudioContext.createPanner.called).to.be.true;
      expect(mockPanner.setPosition.calledWith(5, 0, 3)).to.be.true;
    });

    it('should update listener position', function() {
      const mockListener = {
        setPosition: sinon.stub(),
        setOrientation: sinon.stub()
      };
      
      mockAudioContext.listener = mockListener;
      
      soundSystem.updateListenerPosition({ x: 1, y: 2, z: 3 });
      
      expect(mockListener.setPosition.calledWith(1, 2, 3)).to.be.true;
    });
  });

  describe('Volume Control', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
    });

    it('should set master volume', function() {
      soundSystem.setMasterVolume(0.5);
      
      expect(soundSystem.masterVolume).to.equal(0.5);
      expect(mockGainNode.gain.setValueAtTime.called).to.be.true;
    });

    it('should clamp master volume to valid range', function() {
      soundSystem.setMasterVolume(1.5);
      expect(soundSystem.masterVolume).to.equal(1.0);
      
      soundSystem.setMasterVolume(-0.5);
      expect(soundSystem.masterVolume).to.equal(0.0);
    });

    it('should mute and unmute', function() {
      soundSystem.mute();
      expect(soundSystem.isMuted).to.be.true;
      
      soundSystem.unmute();
      expect(soundSystem.isMuted).to.be.false;
    });
  });

  describe('Sound Management', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
    });

    it('should stop all sounds', function() {
      const source1 = soundSystem.playSound('test');
      const source2 = soundSystem.playSound('test');
      
      soundSystem.stopAllSounds();
      
      expect(mockBufferSource.stop.calledTwice).to.be.true;
      expect(soundSystem.activeSources.size).to.equal(0);
    });

    it('should stop specific sound by ID', function() {
      const sourceId = soundSystem.playSound('test');
      
      soundSystem.stopSound(sourceId);
      
      expect(mockBufferSource.stop.called).to.be.true;
      expect(soundSystem.activeSources.has(sourceId)).to.be.false;
    });

    it('should clean up finished sounds automatically', function() {
      const source = soundSystem.playSound('test');
      
      // Simulate sound ending
      const endCallback = mockBufferSource.addEventListener.getCall(0).args[1];
      endCallback();
      
      expect(soundSystem.activeSources.has(source)).to.be.false;
    });
  });

  describe('Audio Analysis', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
    });

    it('should create audio analyser', function() {
      const analyser = soundSystem.createAnalyser();
      
      expect(mockAudioContext.createAnalyser.called).to.be.true;
      expect(analyser).to.equal(mockAnalyser);
    });

    it('should get frequency data', function() {
      const analyser = soundSystem.createAnalyser();
      const frequencyData = new Uint8Array(128);
      mockAnalyser.getByteFrequencyData.returns(frequencyData);
      
      const result = soundSystem.getFrequencyData(analyser);
      
      expect(mockAnalyser.getByteFrequencyData.called).to.be.true;
      expect(result).to.equal(frequencyData);
    });
  });

  describe('Effects and Filters', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
    });

    it('should apply lowpass filter', function() {
      soundSystem.playSound('test', { 
        effects: { 
          lowpass: { frequency: 1000, Q: 2 } 
        } 
      });
      
      expect(mockAudioContext.createBiquadFilter.called).to.be.true;
      expect(mockBiquadFilter.type).to.equal('lowpass');
    });

    it('should apply highpass filter', function() {
      soundSystem.playSound('test', { 
        effects: { 
          highpass: { frequency: 200, Q: 1 } 
        } 
      });
      
      expect(mockAudioContext.createBiquadFilter.called).to.be.true;
    });

    it('should chain multiple effects', function() {
      soundSystem.playSound('test', { 
        effects: { 
          lowpass: { frequency: 1000 },
          highpass: { frequency: 200 }
        } 
      });
      
      expect(mockAudioContext.createBiquadFilter.calledTwice).to.be.true;
    });
  });

  describe('Error Handling', function() {
    it('should handle AudioContext suspend/resume', async function() {
      await soundSystem.initialize();
      
      await soundSystem.suspend();
      expect(mockAudioContext.suspend.called).to.be.true;
      
      await soundSystem.resume();
      expect(mockAudioContext.resume.called).to.be.true;
    });

    it('should handle cleanup on destroy', async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
      
      soundSystem.playSound('test');
      soundSystem.destroy();
      
      expect(mockAudioContext.close.called).to.be.true;
      expect(soundSystem.sounds.size).to.equal(0);
      expect(soundSystem.activeSources.size).to.equal(0);
    });

    it('should handle invalid audio data', async function() {
      mockAudioContext.decodeAudioData.rejects(new Error('Invalid audio data'));
      const consoleSpy = sinon.spy(console, 'error');
      
      const result = await soundSystem.loadSound('invalid', '/audio/invalid.mp3');
      
      expect(result).to.be.false;
      expect(consoleSpy.called).to.be.true;
    });
  });

  describe('Performance', function() {
    beforeEach(async function() {
      await soundSystem.initialize();
      await soundSystem.loadSound('test', '/audio/test.mp3');
    });

    it('should limit concurrent sounds', function() {
      // Set low limit for testing
      soundSystem.maxConcurrentSources = 2;
      
      soundSystem.playSound('test');
      soundSystem.playSound('test');
      const thirdSound = soundSystem.playSound('test');
      
      expect(thirdSound).to.be.null;
      expect(soundSystem.activeSources.size).to.equal(2);
    });

    it('should reuse audio buffers', async function() {
      await soundSystem.loadSound('test2', '/audio/test.mp3'); // Same URL
      
      expect(global.fetch.calledOnce).to.be.true; // Should not fetch twice
    });
  });
});
