/**
 * Enhanced Audio Manager - Comprehensive 3D spatial audio system
 * Features dynamic soundscapes, combat audio, and adaptive music
 */

export class EnhancedAudioManager {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverb = null;
    
    // Audio categories with individual volume controls
    this.audioCategories = {
      master: { gain: null, volume: 0.8 },
      music: { gain: null, volume: 0.6 },
      sfx: { gain: null, volume: 0.8 },
      ambient: { gain: null, volume: 0.5 },
      ui: { gain: null, volume: 0.7 },
      voice: { gain: null, volume: 0.9 }
    };
    
    // 3D Audio system
    this.listener = null;
    this.spatialSources = new Map();
    
    // Audio assets
    this.audioAssets = new Map();
    this.loadingPromises = new Map();
    
    // Music system
    this.musicSystem = {
      currentTrack: null,
      nextTrack: null,
      crossfading: false,
      crossfadeTime: 2000,
      adaptiveMusic: true,
      intensity: 0,
      targetIntensity: 0
    };
    
    // Ambient soundscape
    this.ambientSystem = {
      layers: new Map(),
      weather: null,
      timeOfDay: 'day',
      environment: 'forest'
    };
    
    // Combat audio
    this.combatAudio = {
      footsteps: new Map(),
      impacts: new Map(),
      weapons: new Map(),
      voices: new Map()
    };
    
    // Wolf AI vocalizations
    this.wolfAudio = {
      howls: new Map(),
      growls: new Map(),
      barks: new Map(),
      whines: new Map(),
      packCommunication: new Map()
    };
    
    // Dynamic effects
    this.dynamicEffects = {
      lowpass: null,
      highpass: null,
      distortion: null,
      delay: null,
      chorus: null
    };
    
    // Performance monitoring
    this.performance = {
      activeSources: 0,
      maxSources: 64,
      cpuUsage: 0,
      memoryUsage: 0
    };
    
    this.init();
  }
  
  /**
   * Initialize enhanced audio system
   */
  async init() {
    try {
      // Create audio context with optimal settings
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      
      await this.setupAudioGraph();
      await this.setup3DAudio();
      await this.loadAudioAssets();
      this.setupDynamicEffects();
      this.bindGameEvents();
      
      console.log('✅ Enhanced Audio System initialized');
    } catch (error) {
      console.error('❌ Audio initialization failed:', error);
      this.createFallbackAudio();
    }
  }
  
  /**
   * Setup audio processing graph
   */
  async setupAudioGraph() {
    // Master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.audioCategories.master.volume;
    
    // Compressor for dynamic range control
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Convolution reverb for spatial realism
    this.reverb = this.audioContext.createConvolver();
    await this.createReverbImpulse();
    
    // Create category gain nodes
    Object.keys(this.audioCategories).forEach(category => {
      if (category !== 'master') {
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.audioCategories[category].volume;
        this.audioCategories[category].gain = gainNode;
        
        // Connect to master chain
        gainNode.connect(this.compressor);
      }
    });
    
    // Connect master chain
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    // Reverb send
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.2;
    reverbGain.connect(this.reverb);
    this.reverb.connect(this.masterGain);
  }
  
  /**
   * Setup 3D spatial audio
   */
  setup3DAudio() {
    if (this.audioContext.listener) {
      this.listener = this.audioContext.listener;
      
      // Set listener orientation (facing forward, up is Y+)
      if (this.listener.forwardX) {
        this.listener.forwardX.value = 0;
        this.listener.forwardY.value = 0;
        this.listener.forwardZ.value = -1;
        this.listener.upX.value = 0;
        this.listener.upY.value = 1;
        this.listener.upZ.value = 0;
      }
      
      // Set initial listener position
      this.setListenerPosition(0, 0, 0);
      
      console.log('✅ 3D Audio initialized');
    } else {
      console.warn('⚠️ 3D Audio not supported in this browser');
    }
  }
  
  /**
   * Load audio assets
   */
  async loadAudioAssets() {
    const audioFiles = {
      // Music tracks
      'music/explore': 'assets/audio/music/explore_ambient.ogg',
      'music/combat': 'assets/audio/music/combat_intense.ogg',
      'music/victory': 'assets/audio/music/victory_fanfare.ogg',
      'music/menu': 'assets/audio/music/menu_theme.ogg',
      
      // Combat SFX
      'combat/sword_swing': 'assets/audio/sfx/sword_swing.ogg',
      'combat/sword_hit': 'assets/audio/sfx/sword_hit.ogg',
      'combat/block': 'assets/audio/sfx/block.ogg',
      'combat/parry': 'assets/audio/sfx/parry.ogg',
      'combat/roll': 'assets/audio/sfx/roll.ogg',
      'combat/footstep': 'assets/audio/sfx/footstep.ogg',
      
      // Wolf vocalizations
      'wolf/howl_distant': 'assets/audio/wolf/howl_distant.ogg',
      'wolf/howl_close': 'assets/audio/wolf/howl_close.ogg',
      'wolf/growl_aggressive': 'assets/audio/wolf/growl_aggressive.ogg',
      'wolf/growl_warning': 'assets/audio/wolf/growl_warning.ogg',
      'wolf/bark_alert': 'assets/audio/wolf/bark_alert.ogg',
      'wolf/whine_retreat': 'assets/audio/wolf/whine_retreat.ogg',
      'wolf/pack_call': 'assets/audio/wolf/pack_call.ogg',
      
      // Ambient sounds
      'ambient/forest_day': 'assets/audio/ambient/forest_day.ogg',
      'ambient/forest_night': 'assets/audio/ambient/forest_night.ogg',
      'ambient/wind_light': 'assets/audio/ambient/wind_light.ogg',
      'ambient/wind_strong': 'assets/audio/ambient/wind_strong.ogg',
      'ambient/rain': 'assets/audio/ambient/rain.ogg',
      'ambient/thunder': 'assets/audio/ambient/thunder.ogg',
      
      // UI sounds
      'ui/button_hover': 'assets/audio/ui/button_hover.ogg',
      'ui/button_click': 'assets/audio/ui/button_click.ogg',
      'ui/menu_open': 'assets/audio/ui/menu_open.ogg',
      'ui/menu_close': 'assets/audio/ui/menu_close.ogg',
      'ui/notification': 'assets/audio/ui/notification.ogg'
    };
    
    // Create fallback audio data for development
    const fallbackAudioFiles = this.createFallbackAudioData();
    
    const loadPromises = Object.entries(audioFiles).map(async ([key, url]) => {
      try {
        // Try to load real audio file first
        const buffer = await this.loadAudioFile(url);
        this.audioAssets.set(key, buffer);
      } catch (error) {
        // Use fallback procedural audio
        console.warn(`Using fallback audio for ${key}:`, error.message);
        const fallbackBuffer = fallbackAudioFiles[key] || this.generateFallbackTone(440, 0.5);
        this.audioAssets.set(key, fallbackBuffer);
      }
    });
    
    await Promise.all(loadPromises);
    console.log(`✅ Loaded ${this.audioAssets.size} audio assets`);
  }
  
  /**
   * Load audio file and decode
   */
  async loadAudioFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }
  
  /**
   * Create fallback audio data using procedural generation
   */
  createFallbackAudioData() {
    const fallbacks = {};
    
    // Generate procedural audio for missing files
    fallbacks['combat/sword_swing'] = this.generateSwooshSound();
    fallbacks['combat/sword_hit'] = this.generateImpactSound();
    fallbacks['combat/block'] = this.generateMetallicSound();
    fallbacks['combat/footstep'] = this.generateFootstepSound();
    fallbacks['wolf/howl_distant'] = this.generateHowlSound();
    fallbacks['wolf/growl_aggressive'] = this.generateGrowlSound();
    fallbacks['ambient/forest_day'] = this.generateForestAmbient();
    
    return fallbacks;
  }
  
  /**
   * Setup dynamic audio effects
   */
  setupDynamicEffects() {
    // Low-pass filter for underwater/muffled effects
    this.dynamicEffects.lowpass = this.audioContext.createBiquadFilter();
    this.dynamicEffects.lowpass.type = 'lowpass';
    this.dynamicEffects.lowpass.frequency.value = 22050;
    
    // High-pass filter for radio/telephone effects
    this.dynamicEffects.highpass = this.audioContext.createBiquadFilter();
    this.dynamicEffects.highpass.type = 'highpass';
    this.dynamicEffects.highpass.frequency.value = 20;
    
    // Delay for echo effects
    this.dynamicEffects.delay = this.audioContext.createDelay(2.0);
    this.dynamicEffects.delay.delayTime.value = 0.3;
    
    const delayFeedback = this.audioContext.createGain();
    delayFeedback.gain.value = 0.3;
    this.dynamicEffects.delay.connect(delayFeedback);
    delayFeedback.connect(this.dynamicEffects.delay);
  }
  
  /**
   * Bind to game events
   */
  bindGameEvents() {
    // Combat events
    window.addEventListener('playerAttack', (event) => {
      this.playAttackSound(event.detail);
    });
    
    window.addEventListener('playerHit', (event) => {
      this.playHitSound(event.detail);
    });
    
    window.addEventListener('playerBlock', (event) => {
      this.playBlockSound(event.detail);
    });
    
    window.addEventListener('playerRoll', (event) => {
      this.playRollSound(event.detail);
    });
    
    window.addEventListener('playerFootstep', (event) => {
      this.playFootstepSound(event.detail);
    });
    
    // Wolf AI events
    window.addEventListener('wolfHowl', (event) => {
      this.playWolfVocalization('howl', event.detail);
    });
    
    window.addEventListener('wolfGrowl', (event) => {
      this.playWolfVocalization('growl', event.detail);
    });
    
    window.addEventListener('wolfBark', (event) => {
      this.playWolfVocalization('bark', event.detail);
    });
    
    // Phase transition events
    window.addEventListener('phaseTransition', (event) => {
      this.handlePhaseTransition(event.detail);
    });
    
    // Environmental events
    window.addEventListener('weatherChange', (event) => {
      this.updateWeatherAudio(event.detail);
    });
  }
  
  /**
   * Play spatial 3D sound
   */
  playSpatialSound(audioKey, x, y, z = 0, options = {}) {
    const audioBuffer = this.audioAssets.get(audioKey);
    if (!audioBuffer) {
      console.warn(`Audio asset not found: ${audioKey}`);
      return null;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create panner for 3D positioning
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = options.refDistance || 1;
    panner.maxDistance = options.maxDistance || 10000;
    panner.rolloffFactor = options.rolloffFactor || 1;
    panner.coneInnerAngle = options.coneInnerAngle || 360;
    panner.coneOuterAngle = options.coneOuterAngle || 0;
    panner.coneOuterGain = options.coneOuterGain || 0;
    
    // Set position
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
    
    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume || 1.0;
    
    // Connect audio graph
    const category = options.category || 'sfx';
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioCategories[category].gain);
    
    // Apply effects if specified
    if (options.effects) {
      this.applyEffects(panner, options.effects);
    }
    
    // Configure playback
    source.loop = options.loop || false;
    source.playbackRate.value = options.playbackRate || 1.0;
    
    // Start playback
    const when = options.when || this.audioContext.currentTime;
    source.start(when);
    
    // Store source for tracking
    const sourceId = this.generateSourceId();
    this.spatialSources.set(sourceId, {
      source,
      panner,
      gainNode,
      position: { x, y, z },
      startTime: when
    });
    
    // Auto-cleanup when sound ends
    source.onended = () => {
      this.spatialSources.delete(sourceId);
      this.performance.activeSources--;
    };
    
    this.performance.activeSources++;
    
    return sourceId;
  }
  
  /**
   * Play 2D sound (non-spatial)
   */
  playSound(audioKey, options = {}) {
    const audioBuffer = this.audioAssets.get(audioKey);
    if (!audioBuffer) {
      console.warn(`Audio asset not found: ${audioKey}`);
      return null;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume || 1.0;
    
    const category = options.category || 'sfx';
    source.connect(gainNode);
    gainNode.connect(this.audioCategories[category].gain);
    
    source.loop = options.loop || false;
    source.playbackRate.value = options.playbackRate || 1.0;
    
    const when = options.when || this.audioContext.currentTime;
    source.start(when);
    
    return source;
  }
  
  /**
   * Update listener position for 3D audio
   */
  setListenerPosition(x, y, z = 0) {
    if (!this.listener) {return;}
    
    if (this.listener.positionX) {
      this.listener.positionX.value = x;
      this.listener.positionY.value = y;
      this.listener.positionZ.value = z;
    } else {
      this.listener.setPosition(x, y, z);
    }
  }
  
  /**
   * Update listener orientation
   */
  setListenerOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
    if (!this.listener) {return;}
    
    if (this.listener.forwardX) {
      this.listener.forwardX.value = forwardX;
      this.listener.forwardY.value = forwardY;
      this.listener.forwardZ.value = forwardZ;
      this.listener.upX.value = upX;
      this.listener.upY.value = upY;
      this.listener.upZ.value = upZ;
    } else {
      this.listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }
  
  /**
   * Play attack sound with variations
   */
  playAttackSound(data) {
    const { x, y, type, weapon } = data;
    
    let audioKey;
    switch (type) {
      case 'light':
        audioKey = 'combat/sword_swing';
        break;
      case 'heavy':
        audioKey = 'combat/sword_swing';
        break;
      case 'special':
        audioKey = 'combat/sword_swing';
        break;
      default:
        audioKey = 'combat/sword_swing';
    }
    
    // Add variation with pitch and volume
    const pitchVariation = 0.8 + Math.random() * 0.4;
    const volumeVariation = 0.8 + Math.random() * 0.2;
    
    this.playSpatialSound(audioKey, x, y, 0, {
      volume: volumeVariation,
      playbackRate: pitchVariation,
      category: 'sfx'
    });
  }
  
  /**
   * Play hit sound with impact intensity
   */
  playHitSound(data) {
    const { x, y, damage, critical } = data;
    
    const audioKey = critical ? 'combat/sword_hit' : 'combat/sword_hit';
    const volume = Math.min(1.0, 0.5 + (damage / 100));
    const pitch = critical ? 1.2 : 1.0;
    
    this.playSpatialSound(audioKey, x, y, 0, {
      volume: volume,
      playbackRate: pitch,
      category: 'sfx'
    });
  }
  
  /**
   * Play block sound
   */
  playBlockSound(data) {
    const { x, y, perfect } = data;
    
    const audioKey = perfect ? 'combat/parry' : 'combat/block';
    const volume = perfect ? 1.0 : 0.8;
    const pitch = perfect ? 1.3 : 1.0;
    
    this.playSpatialSound(audioKey, x, y, 0, {
      volume: volume,
      playbackRate: pitch,
      category: 'sfx'
    });
  }
  
  /**
   * Play roll sound
   */
  playRollSound(data) {
    const { x, y } = data;
    
    this.playSpatialSound('combat/roll', x, y, 0, {
      volume: 0.6,
      playbackRate: 0.9 + Math.random() * 0.2,
      category: 'sfx'
    });
  }
  
  /**
   * Play footstep sound with surface variation
   */
  playFootstepSound(data) {
    const { x, y, surface = 'grass', speed = 1.0 } = data;
    
    const volume = Math.min(0.4, 0.2 + speed * 0.2);
    const pitch = 0.8 + Math.random() * 0.4;
    
    this.playSpatialSound('combat/footstep', x, y, 0, {
      volume: volume,
      playbackRate: pitch,
      category: 'sfx',
      refDistance: 2
    });
  }
  
  /**
   * Play wolf vocalization with pack communication
   */
  playWolfVocalization(type, data) {
    const { x, y, wolfId, emotion = 'neutral', packContext = null } = data;
    
    let audioKey;
    switch (type) {
      case 'howl':
        audioKey = packContext ? 'wolf/pack_call' : 'wolf/howl_distant';
        break;
      case 'growl':
        audioKey = emotion === 'aggressive' ? 'wolf/growl_aggressive' : 'wolf/growl_warning';
        break;
      case 'bark':
        audioKey = 'wolf/bark_alert';
        break;
      case 'whine':
        audioKey = 'wolf/whine_retreat';
        break;
      default:
        audioKey = 'wolf/howl_distant';
    }
    
    // Emotional modulation
    const emotionPitch = this.getEmotionalPitch(emotion);
    const emotionVolume = this.getEmotionalVolume(emotion);
    
    this.playSpatialSound(audioKey, x, y, 0, {
      volume: emotionVolume,
      playbackRate: emotionPitch,
      category: 'ambient',
      maxDistance: type === 'howl' ? 1000 : 200
    });
  }
  
  /**
   * Handle phase transitions with appropriate music
   */
  handlePhaseTransition(data) {
    const { from, to } = data;
    
    let newTrack;
    switch (to) {
      case 'explore':
        newTrack = 'music/explore';
        this.musicSystem.targetIntensity = 0.3;
        break;
      case 'fight':
        newTrack = 'music/combat';
        this.musicSystem.targetIntensity = 0.8;
        break;
      case 'choose':
      case 'powerup':
      case 'cashout':
        newTrack = 'music/explore';
        this.musicSystem.targetIntensity = 0.5;
        break;
      case 'risk':
      case 'escalate':
        newTrack = 'music/combat';
        this.musicSystem.targetIntensity = 1.0;
        break;
    }
    
    if (newTrack) {
      this.crossfadeToTrack(newTrack);
    }
  }
  
  /**
   * Crossfade between music tracks
   */
  crossfadeToTrack(newTrackKey) {
    const newBuffer = this.audioAssets.get(newTrackKey);
    if (!newBuffer) {return;}
    
    // Create new track source
    const newSource = this.audioContext.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;
    
    const newGain = this.audioContext.createGain();
    newGain.gain.value = 0; // Start silent
    
    newSource.connect(newGain);
    newGain.connect(this.audioCategories.music.gain);
    
    const currentTime = this.audioContext.currentTime;
    const crossfadeTime = this.musicSystem.crossfadeTime / 1000;
    
    // Fade out current track
    if (this.musicSystem.currentTrack) {
      this.musicSystem.currentTrack.gain.gain.exponentialRampToValueAtTime(0.001, currentTime + crossfadeTime);
      setTimeout(() => {
        this.musicSystem.currentTrack.source.stop();
      }, this.musicSystem.crossfadeTime);
    }
    
    // Fade in new track
    newGain.gain.exponentialRampToValueAtTime(this.audioCategories.music.volume, currentTime + crossfadeTime);
    newSource.start(currentTime);
    
    this.musicSystem.currentTrack = { source: newSource, gain: newGain };
  }
  
  /**
   * Update weather audio
   */
  updateWeatherAudio(weatherData) {
    const { type, intensity } = weatherData;
    
    // Stop current weather audio
    if (this.ambientSystem.weather) {
      this.ambientSystem.weather.stop();
    }
    
    let weatherAudioKey;
    switch (type) {
      case 'rain':
        weatherAudioKey = 'ambient/rain';
        break;
      case 'storm':
        weatherAudioKey = 'ambient/thunder';
        break;
      case 'wind':
        weatherAudioKey = intensity > 0.5 ? 'ambient/wind_strong' : 'ambient/wind_light';
        break;
    }
    
    if (weatherAudioKey) {
      this.ambientSystem.weather = this.playSound(weatherAudioKey, {
        loop: true,
        volume: intensity,
        category: 'ambient'
      });
    }
  }
  
  /**
   * Generate procedural swoosh sound
   */
  generateSwooshSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8) * (1 - Math.exp(-t * 40));
      const frequency = 200 + Math.sin(t * 20) * 100;
      const noise = (Math.random() - 0.5) * 0.3;
      data[i] = (Math.sin(2 * Math.PI * frequency * t) + noise) * envelope * 0.3;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural impact sound
   */
  generateImpactSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15);
      const click = Math.exp(-t * 100);
      const noise = (Math.random() - 0.5) * envelope;
      const tone = Math.sin(2 * Math.PI * 150 * t) * click * 0.3;
      data[i] = (noise + tone) * 0.4;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural howl sound
   */
  generateHowlSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 2.0;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * Math.exp(-t * 0.5);
      const frequency = 200 + Math.sin(t * 3) * 50 + Math.sin(t * 0.5) * 100;
      const vibrato = Math.sin(2 * Math.PI * 6 * t) * 0.1;
      data[i] = Math.sin(2 * Math.PI * frequency * t * (1 + vibrato)) * envelope * 0.2;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural metallic sound (for blocks/parries)
   */
  generateMetallicSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      // Metallic harmonics
      const fundamental = 800;
      const harmonic1 = Math.sin(2 * Math.PI * fundamental * t) * 0.5;
      const harmonic2 = Math.sin(2 * Math.PI * fundamental * 2.7 * t) * 0.3;
      const harmonic3 = Math.sin(2 * Math.PI * fundamental * 5.4 * t) * 0.2;
      const noise = (Math.random() - 0.5) * 0.1 * Math.exp(-t * 50);
      data[i] = (harmonic1 + harmonic2 + harmonic3 + noise) * envelope * 0.4;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural footstep sound
   */
  generateFootstepSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      // Low frequency thud
      const thud = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 50);
      // High frequency crunch
      const crunch = (Math.random() - 0.5) * Math.exp(-t * 100);
      data[i] = (thud * 0.7 + crunch * 0.3) * envelope * 0.3;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural growl sound
   */
  generateGrowlSound() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.0;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * 0.8;
      // Low rumbling frequency with modulation
      const baseFreq = 80 + Math.sin(t * 8) * 20;
      const rumble = Math.sin(2 * Math.PI * baseFreq * t);
      // Add some roughness
      const roughness = Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.3;
      const noise = (Math.random() - 0.5) * 0.1;
      data[i] = (rumble + roughness + noise) * envelope * 0.25;
    }
    
    return buffer;
  }
  
  /**
   * Generate procedural forest ambient sound
   */
  generateForestAmbient() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 3.0;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        
        // Wind simulation
        const windFreq = 0.5 + Math.sin(t * 0.1) * 0.2;
        const wind = Math.sin(2 * Math.PI * windFreq * t) * 0.05;
        
        // Bird chirps (random occasional)
        let chirp = 0;
        if (Math.random() < 0.001) {
          const chirpFreq = 2000 + Math.random() * 1000;
          chirp = Math.sin(2 * Math.PI * chirpFreq * t) * Math.exp(-((t % 0.1) * 20)) * 0.1;
        }
        
        // Rustling leaves (filtered noise)
        const rustle = (Math.random() - 0.5) * 0.02 * (1 + Math.sin(t * 2) * 0.5);
        
        // Combine all elements
        data[i] = wind + chirp + rustle;
      }
    }
    
    return buffer;
  }
  
  /**
   * Generate a simple fallback tone
   */
  generateFallbackTone(frequency = 440, duration = 0.5) {
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.2;
    }
    
    return buffer;
  }
  
  /**
   * Get emotional pitch modulation
   */
  getEmotionalPitch(emotion) {
    const pitchMap = {
      aggressive: 1.2,
      fearful: 0.8,
      confident: 1.1,
      desperate: 1.3,
      calm: 1.0,
      frustrated: 1.15
    };
    
    return pitchMap[emotion] || 1.0;
  }
  
  /**
   * Get emotional volume modulation
   */
  getEmotionalVolume(emotion) {
    const volumeMap = {
      aggressive: 1.0,
      fearful: 0.6,
      confident: 0.9,
      desperate: 1.2,
      calm: 0.7,
      frustrated: 0.8
    };
    
    return volumeMap[emotion] || 0.8;
  }
  
  /**
   * Create reverb impulse response
   */
  async createReverbImpulse() {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 2;
    const impulse = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        const envelope = (1 - t / duration)**2;
        channelData[i] = (Math.random() * 2 - 1) * envelope * 0.1;
      }
    }
    
    this.reverb.buffer = impulse;
  }
  
  /**
   * Generate source ID
   */
  generateSourceId() {
    return `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Set volume for audio category
   */
  setVolume(category, volume) {
    if (this.audioCategories[category]) {
      this.audioCategories[category].volume = Math.max(0, Math.min(1, volume));
      if (this.audioCategories[category].gain) {
        this.audioCategories[category].gain.gain.value = this.audioCategories[category].volume;
      }
    }
  }
  
  /**
   * Get current volume for category
   */
  getVolume(category) {
    return this.audioCategories[category]?.volume || 0;
  }
  
  /**
   * Resume audio context (required for user interaction)
   */
  async resumeAudioContext() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('✅ Audio context resumed');
    }
  }
  
  /**
   * Get audio system performance info
   */
  getPerformanceInfo() {
    return {
      ...this.performance,
      contextState: this.audioContext.state,
      currentTime: this.audioContext.currentTime,
      sampleRate: this.audioContext.sampleRate,
      spatialSourcesCount: this.spatialSources.size,
      loadedAssetsCount: this.audioAssets.size
    };
  }
  
  /**
   * Create fallback audio system for unsupported browsers
   */
  createFallbackAudio() {
    console.warn('🔇 Creating fallback audio system');
    
    this.playSound = () => null;
    this.playSpatialSound = () => null;
    this.setListenerPosition = () => {};
    this.setVolume = () => {};
  }
  
  /**
   * Cleanup audio system
   */
  destroy() {
    // Stop all active sources
    this.spatialSources.forEach(({ source }) => {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped
      }
    });
    
    this.spatialSources.clear();
    
    // Stop current music
    if (this.musicSystem.currentTrack) {
      try {
        this.musicSystem.currentTrack.source.stop();
      } catch (error) {
        // Source may already be stopped
      }
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    console.log('🔇 Audio system destroyed');
  }
}
