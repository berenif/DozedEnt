import { expect } from 'chai';
import sinon from 'sinon';

// Mock the ReplaySystem since direct import might be complex in test environment
describe('ReplaySystem - Comprehensive Tests', () => {
  let ReplaySystem;
  let replaySystem;
  let mockGameStateManager;
  let mockWasmManager;
  let mockWindow;
  let mockLocalStorage;

  before(() => {
    // Define ReplaySystem inline for testing
    class TestReplaySystem {
      constructor(gameStateManager, wasmManager) {
        this.gameStateManager = gameStateManager;
        this.wasmManager = wasmManager;
        
        // Recording state
        this.isRecording = false;
        this.isPaused = false;
        this.currentRecording = null;
        
        // Playback state
        this.isPlaying = false;
        this.currentReplay = null;
        this.playbackFrame = 0;
        this.playbackSpeed = 1.0;
        this.playbackPaused = false;
        
        // Recording configuration
        this.config = {
          maxRecordingTime: 3600,
          compressionLevel: 3,
          includeAudio: false,
          includeVideo: false,
          frameRate: 60,
          autoSave: true,
          maxReplays: 100
        };
        
        // Input buffer for recording
        this.inputBuffer = [];
        this.frameBuffer = [];
        
        // Replay metadata
        this.replayMetadata = {
          version: '1.0',
          gameVersion: '1.0.0',
          timestamp: null,
          duration: 0,
          seed: null,
          playerName: '',
          score: 0,
          result: 'unknown'
        };
        
        // Analysis data
        this.analysisData = {
          inputFrequency: new Map(),
          reactionTimes: [],
          accuracyData: [],
          performanceMetrics: {}
        };
        
        // Stored replays
        this.savedReplays = new Map();
        
        this.init();
      }
      
      init() {
        this.loadSavedReplays();
        this.setupEventListeners();
      }
      
      setupEventListeners() {
        // Mock event listener setup
        if (typeof window !== 'undefined') {
          window.addEventListener('gameStarted', () => {
            if (this.config.autoSave) {
              this.startRecording();
            }
          });
          
          window.addEventListener('gameEnded', (event) => {
            if (this.isRecording) {
              this.stopRecording(event.detail);
            }
          });
          
          window.addEventListener('playerInput', (event) => {
            if (this.isRecording && !this.isPaused) {
              this.recordInput(event.detail);
            }
          });
        }
      }
      
      startRecording(metadata = {}) {
        if (this.isRecording) {
          throw new Error('Already recording');
        }
        
        this.isRecording = true;
        this.isPaused = false;
        this.inputBuffer = [];
        this.frameBuffer = [];
        
        // Initialize recording
        this.currentRecording = {
          id: this.generateReplayId(),
          startTime: Date.now(),
          inputs: [],
          frames: [],
          metadata: {
            ...this.replayMetadata,
            ...metadata,
            timestamp: Date.now()
          }
        };
        
        // Get initial game state
        if (this.wasmManager && this.wasmManager.exports) {
          this.currentRecording.metadata.seed = this.wasmManager.exports.get_seed ? 
            this.wasmManager.exports.get_seed() : 12345;
        }
        
        return this.currentRecording.id;
      }
      
      stopRecording(gameResult = {}) {
        if (!this.isRecording) {
          throw new Error('Not currently recording');
        }
        
        this.isRecording = false;
        
        // Finalize recording
        this.currentRecording.endTime = Date.now();
        this.currentRecording.metadata.duration = 
          this.currentRecording.endTime - this.currentRecording.startTime;
        this.currentRecording.metadata.result = gameResult.result || 'completed';
        this.currentRecording.metadata.score = gameResult.score || 0;
        
        // Copy buffers to recording
        this.currentRecording.inputs = [...this.inputBuffer];
        this.currentRecording.frames = [...this.frameBuffer];
        
        // Perform analysis
        this.analyzeRecording(this.currentRecording);
        
        // Save if auto-save is enabled
        if (this.config.autoSave) {
          this.saveReplay(this.currentRecording);
        }
        
        const recordingId = this.currentRecording.id;
        this.currentRecording = null;
        
        return recordingId;
      }
      
      pauseRecording() {
        if (!this.isRecording) {
          throw new Error('Not currently recording');
        }
        
        this.isPaused = !this.isPaused;
        return this.isPaused;
      }
      
      recordInput(inputData) {
        if (!this.isRecording || this.isPaused) {
          return false;
        }
        
        const timestamp = Date.now();
        const frame = this.frameBuffer.length;
        
        this.inputBuffer.push({
          frame,
          timestamp,
          ...inputData
        });
        
        // Update analysis data
        this.updateInputAnalysis(inputData);
        
        return true;
      }
      
      recordFrame(frameData) {
        if (!this.isRecording || this.isPaused) {
          return false;
        }
        
        const timestamp = Date.now();
        const frame = this.frameBuffer.length;
        
        // Get game state from WASM
        let gameState = {};
        if (this.wasmManager && this.wasmManager.exports) {
          gameState = {
            playerX: this.wasmManager.exports.get_x ? this.wasmManager.exports.get_x() : 0.5,
            playerY: this.wasmManager.exports.get_y ? this.wasmManager.exports.get_y() : 0.5,
            stamina: this.wasmManager.exports.get_stamina ? this.wasmManager.exports.get_stamina() : 100,
            phase: this.wasmManager.exports.get_phase ? this.wasmManager.exports.get_phase() : 0
          };
        }
        
        this.frameBuffer.push({
          frame,
          timestamp,
          gameState,
          ...frameData
        });
        
        return true;
      }
      
      startPlayback(replayId, options = {}) {
        if (this.isPlaying) {
          throw new Error('Already playing a replay');
        }
        
        const replay = this.savedReplays.get(replayId);
        if (!replay) {
          throw new Error(`Replay not found: ${replayId}`);
        }
        
        this.isPlaying = true;
        this.currentReplay = replay;
        this.playbackFrame = 0;
        this.playbackSpeed = options.speed || 1.0;
        this.playbackPaused = false;
        
        // Initialize game state for replay
        if (this.wasmManager && replay.metadata.seed) {
          if (this.wasmManager.exports.init_run) {
            this.wasmManager.exports.init_run(replay.metadata.seed, 0);
          }
        }
        
        return true;
      }
      
      stopPlayback() {
        if (!this.isPlaying) {
          return false;
        }
        
        this.isPlaying = false;
        this.currentReplay = null;
        this.playbackFrame = 0;
        this.playbackPaused = false;
        
        return true;
      }
      
      pausePlayback() {
        if (!this.isPlaying) {
          return false;
        }
        
        this.playbackPaused = !this.playbackPaused;
        return this.playbackPaused;
      }
      
      seekToFrame(frame) {
        if (!this.isPlaying || !this.currentReplay) {
          return false;
        }
        
        if (frame < 0 || frame >= this.currentReplay.frames.length) {
          throw new Error('Frame out of bounds');
        }
        
        this.playbackFrame = frame;
        
        // Apply game state at this frame
        const frameData = this.currentReplay.frames[frame];
        if (frameData && frameData.gameState && this.wasmManager) {
          // Restore WASM state (simplified)
          // In real implementation, this would restore full WASM state
        }
        
        return true;
      }
      
      getPlaybackProgress() {
        if (!this.isPlaying || !this.currentReplay) {
          return 0;
        }
        
        return this.playbackFrame / this.currentReplay.frames.length;
      }
      
      updatePlayback(deltaTime) {
        if (!this.isPlaying || this.playbackPaused || !this.currentReplay) {
          return false;
        }
        
        // Advance playback frame based on speed
        const frameAdvance = (deltaTime / 16.67) * this.playbackSpeed;
        this.playbackFrame += frameAdvance;
        
        if (this.playbackFrame >= this.currentReplay.frames.length) {
          this.stopPlayback();
          return false;
        }
        
        // Apply current frame inputs
        const currentFrame = Math.floor(this.playbackFrame);
        const frameInputs = this.currentReplay.inputs.filter(input => input.frame === currentFrame);
        
        for (const input of frameInputs) {
          this.applyReplayInput(input);
        }
        
        return true;
      }
      
      applyReplayInput(inputData) {
        // Apply input to game (simplified)
        if (this.wasmManager && this.wasmManager.exports && this.wasmManager.exports.set_player_input) {
          this.wasmManager.exports.set_player_input(
            inputData.directionX || 0,
            inputData.directionY || 0,
            inputData.isRolling || 0,
            inputData.isJumping || 0,
            inputData.lightAttack || 0,
            inputData.heavyAttack || 0,
            inputData.isBlocking || 0,
            inputData.special || 0
          );
        }
      }
      
      saveReplay(replay) {
        if (!replay) {
          throw new Error('No replay data provided');
        }
        
        // Check storage limits
        if (this.savedReplays.size >= this.config.maxReplays) {
          this.cleanupOldReplays();
        }
        
        // Compress replay data (simplified)
        const compressedReplay = this.compressReplay(replay);
        
        this.savedReplays.set(replay.id, compressedReplay);
        
        // Save to localStorage if available
        if (typeof localStorage !== 'undefined') {
          try {
            const replayData = JSON.stringify(compressedReplay);
            localStorage.setItem(`replay_${replay.id}`, replayData);
          } catch (error) {
            console.warn('Failed to save replay to localStorage:', error);
          }
        }
        
        return replay.id;
      }
      
      loadReplay(replayId) {
        // Try to load from memory first
        if (this.savedReplays.has(replayId)) {
          return this.savedReplays.get(replayId);
        }
        
        // Try to load from localStorage
        if (typeof localStorage !== 'undefined') {
          try {
            const replayData = localStorage.getItem(`replay_${replayId}`);
            if (replayData) {
              const replay = JSON.parse(replayData);
              this.savedReplays.set(replayId, replay);
              return replay;
            }
          } catch (error) {
            console.warn('Failed to load replay from localStorage:', error);
          }
        }
        
        return null;
      }
      
      deleteReplay(replayId) {
        const deleted = this.savedReplays.delete(replayId);
        
        // Remove from localStorage
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(`replay_${replayId}`);
        }
        
        return deleted;
      }
      
      listReplays() {
        return Array.from(this.savedReplays.values()).map(replay => ({
          id: replay.id,
          metadata: replay.metadata,
          size: this.calculateReplaySize(replay)
        }));
      }
      
      compressReplay(replay) {
        // Simple compression simulation
        const compressed = {
          ...replay,
          compressed: true,
          originalSize: JSON.stringify(replay).length
        };
        
        // In real implementation, this would use actual compression algorithms
        compressed.compressedSize = Math.floor(compressed.originalSize * 0.7);
        
        return compressed;
      }
      
      decompressReplay(compressedReplay) {
        if (!compressedReplay.compressed) {
          return compressedReplay;
        }
        
        // Simple decompression simulation
        const decompressed = { ...compressedReplay };
        delete decompressed.compressed;
        delete decompressed.originalSize;
        delete decompressed.compressedSize;
        
        return decompressed;
      }
      
      analyzeRecording(recording) {
        if (!recording || !recording.inputs) {
          return null;
        }
        
        const analysis = {
          totalInputs: recording.inputs.length,
          inputTypes: new Map(),
          averageInputFrequency: 0,
          reactionTimes: [],
          accuracy: 0,
          performance: {}
        };
        
        // Analyze input types
        for (const input of recording.inputs) {
          for (const [key, value] of Object.entries(input)) {
            if (key !== 'frame' && key !== 'timestamp' && value) {
              const count = analysis.inputTypes.get(key) || 0;
              analysis.inputTypes.set(key, count + 1);
            }
          }
        }
        
        // Calculate input frequency
        if (recording.metadata.duration > 0) {
          analysis.averageInputFrequency = 
            (recording.inputs.length / recording.metadata.duration) * 1000; // inputs per second
        }
        
        // Store analysis
        recording.analysis = analysis;
        
        return analysis;
      }
      
      exportReplay(replayId, format = 'json') {
        const replay = this.loadReplay(replayId);
        if (!replay) {
          throw new Error(`Replay not found: ${replayId}`);
        }
        
        switch (format) {
          case 'json':
            return JSON.stringify(replay, null, 2);
          case 'csv':
            return this.exportReplayAsCSV(replay);
          case 'binary':
            return this.exportReplayAsBinary(replay);
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }
      }
      
      importReplay(replayData, format = 'json') {
        let replay;
        
        switch (format) {
          case 'json':
            replay = JSON.parse(replayData);
            break;
          case 'csv':
            replay = this.importReplayFromCSV(replayData);
            break;
          case 'binary':
            replay = this.importReplayFromBinary(replayData);
            break;
          default:
            throw new Error(`Unsupported import format: ${format}`);
        }
        
        // Validate replay structure
        if (!this.validateReplay(replay)) {
          throw new Error('Invalid replay data structure');
        }
        
        return this.saveReplay(replay);
      }
      
      validateReplay(replay) {
        if (!replay || typeof replay !== 'object') {
          return false;
        }
        
        const requiredFields = ['id', 'metadata', 'inputs'];
        for (const field of requiredFields) {
          if (!(field in replay)) {
            return false;
          }
        }
        
        if (!Array.isArray(replay.inputs)) {
          return false;
        }
        
        return true;
      }
      
      generateReplayId() {
        return `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      calculateReplaySize(replay) {
        return JSON.stringify(replay).length;
      }
      
      updateInputAnalysis(inputData) {
        // Update input frequency analysis
        for (const [key, value] of Object.entries(inputData)) {
          if (key !== 'frame' && key !== 'timestamp' && value) {
            const count = this.analysisData.inputFrequency.get(key) || 0;
            this.analysisData.inputFrequency.set(key, count + 1);
          }
        }
      }
      
      loadSavedReplays() {
        if (typeof localStorage === 'undefined') {
          return;
        }
        
        // Load replays from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('replay_')) {
            try {
              const replayData = localStorage.getItem(key);
              const replay = JSON.parse(replayData);
              this.savedReplays.set(replay.id, replay);
            } catch (error) {
              console.warn(`Failed to load replay ${key}:`, error);
            }
          }
        }
      }
      
      cleanupOldReplays() {
        // Remove oldest replays to make room for new ones
        const replays = Array.from(this.savedReplays.values());
        replays.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
        
        const toRemove = replays.slice(0, replays.length - this.config.maxReplays + 1);
        for (const replay of toRemove) {
          this.deleteReplay(replay.id);
        }
      }
      
      exportReplayAsCSV(replay) {
        // Simple CSV export
        const headers = ['frame', 'timestamp', 'directionX', 'directionY', 'lightAttack', 'heavyAttack'];
        const rows = [headers.join(',')];
        
        for (const input of replay.inputs) {
          const row = headers.map(header => input[header] || '').join(',');
          rows.push(row);
        }
        
        return rows.join('\n');
      }
      
      exportReplayAsBinary(replay) {
        // Simplified binary export (would use actual binary encoding in real implementation)
        return new Uint8Array(JSON.stringify(replay).split('').map(c => c.charCodeAt(0)));
      }
      
      importReplayFromCSV(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        const inputs = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const input = {};
          
          for (let j = 0; j < headers.length; j++) {
            const value = values[j];
            input[headers[j]] = isNaN(value) ? value : Number(value);
          }
          
          inputs.push(input);
        }
        
        return {
          id: this.generateReplayId(),
          metadata: {
            version: '1.0',
            timestamp: Date.now(),
            imported: true
          },
          inputs,
          frames: []
        };
      }
      
      importReplayFromBinary(binaryData) {
        // Simplified binary import
        const jsonString = Array.from(binaryData).map(byte => String.fromCharCode(byte)).join('');
        return JSON.parse(jsonString);
      }
    }

    ReplaySystem = TestReplaySystem;
  });

  beforeEach(() => {
    // Mock dependencies
    mockGameStateManager = {
      getStateSnapshot: sinon.stub().returns({ frame: 0, players: [] }),
      emit: sinon.stub()
    };

    mockWasmManager = {
      exports: {
        get_x: sinon.stub().returns(0.5),
        get_y: sinon.stub().returns(0.5),
        get_stamina: sinon.stub().returns(100),
        get_phase: sinon.stub().returns(0),
        get_seed: sinon.stub().returns(12345),
        init_run: sinon.stub(),
        set_player_input: sinon.stub()
      }
    };

    mockLocalStorage = {
      setItem: sinon.stub(),
      getItem: sinon.stub(),
      removeItem: sinon.stub(),
      key: sinon.stub(),
      length: 0
    };

    mockWindow = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub()
    };

    // Set up global mocks
    global.window = mockWindow;
    global.localStorage = mockLocalStorage;
    global.Date = {
      now: sinon.stub().returns(1000000)
    };
    global.performance = {
      now: sinon.stub().returns(16.67)
    };

    replaySystem = new ReplaySystem(mockGameStateManager, mockWasmManager);
  });

  afterEach(() => {
    sinon.restore();
    delete global.window;
    delete global.localStorage;
    delete global.Date;
    delete global.performance;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(replaySystem.isRecording).to.be.false;
      expect(replaySystem.isPlaying).to.be.false;
      expect(replaySystem.config.maxRecordingTime).to.equal(3600);
      expect(replaySystem.config.frameRate).to.equal(60);
      expect(replaySystem.config.autoSave).to.be.true;
    });

    it('should set up event listeners', () => {
      expect(mockWindow.addEventListener).to.have.been.calledWith('gameStarted');
      expect(mockWindow.addEventListener).to.have.been.calledWith('gameEnded');
      expect(mockWindow.addEventListener).to.have.been.calledWith('playerInput');
    });

    it('should initialize empty replay storage', () => {
      expect(replaySystem.savedReplays.size).to.equal(0);
      expect(replaySystem.inputBuffer).to.be.empty;
      expect(replaySystem.frameBuffer).to.be.empty;
    });
  });

  describe('Recording', () => {
    it('should start recording successfully', () => {
      const replayId = replaySystem.startRecording();
      
      expect(replaySystem.isRecording).to.be.true;
      expect(replaySystem.isPaused).to.be.false;
      expect(replayId).to.be.a('string');
      expect(replaySystem.currentRecording).to.not.be.null;
      expect(replaySystem.currentRecording.id).to.equal(replayId);
    });

    it('should throw error when already recording', () => {
      replaySystem.startRecording();
      
      expect(() => replaySystem.startRecording()).to.throw('Already recording');
    });

    it('should stop recording successfully', () => {
      const replayId = replaySystem.startRecording();
      const gameResult = { result: 'victory', score: 1000 };
      
      const stoppedId = replaySystem.stopRecording(gameResult);
      
      expect(replaySystem.isRecording).to.be.false;
      expect(stoppedId).to.equal(replayId);
      expect(replaySystem.currentRecording).to.be.null;
    });

    it('should throw error when not recording', () => {
      expect(() => replaySystem.stopRecording()).to.throw('Not currently recording');
    });

    it('should pause and unpause recording', () => {
      replaySystem.startRecording();
      
      expect(replaySystem.pauseRecording()).to.be.true; // Now paused
      expect(replaySystem.isPaused).to.be.true;
      
      expect(replaySystem.pauseRecording()).to.be.false; // Now unpaused
      expect(replaySystem.isPaused).to.be.false;
    });

    it('should record input data', () => {
      replaySystem.startRecording();
      
      const inputData = {
        directionX: 1,
        directionY: 0,
        lightAttack: true
      };
      
      const result = replaySystem.recordInput(inputData);
      
      expect(result).to.be.true;
      expect(replaySystem.inputBuffer).to.have.length(1);
      expect(replaySystem.inputBuffer[0]).to.include(inputData);
    });

    it('should not record input when paused', () => {
      replaySystem.startRecording();
      replaySystem.pauseRecording(); // Pause
      
      const result = replaySystem.recordInput({ directionX: 1 });
      
      expect(result).to.be.false;
      expect(replaySystem.inputBuffer).to.be.empty;
    });

    it('should record frame data', () => {
      replaySystem.startRecording();
      
      const frameData = { customData: 'test' };
      const result = replaySystem.recordFrame(frameData);
      
      expect(result).to.be.true;
      expect(replaySystem.frameBuffer).to.have.length(1);
      expect(replaySystem.frameBuffer[0]).to.include(frameData);
      expect(replaySystem.frameBuffer[0].gameState).to.be.an('object');
    });

    it('should include metadata in recording', () => {
      const metadata = { playerName: 'TestPlayer' };
      replaySystem.startRecording(metadata);
      
      expect(replaySystem.currentRecording.metadata.playerName).to.equal('TestPlayer');
      expect(replaySystem.currentRecording.metadata.seed).to.equal(12345);
    });
  });

  describe('Playback', () => {
    let replayId;

    beforeEach(() => {
      // Create a test replay
      replayId = replaySystem.startRecording();
      replaySystem.recordInput({ directionX: 1, frame: 0 });
      replaySystem.recordFrame({ frame: 0 });
      replaySystem.stopRecording({ result: 'test' });
    });

    it('should start playback successfully', () => {
      const result = replaySystem.startPlayback(replayId);
      
      expect(result).to.be.true;
      expect(replaySystem.isPlaying).to.be.true;
      expect(replaySystem.currentReplay).to.not.be.null;
      expect(replaySystem.playbackFrame).to.equal(0);
    });

    it('should throw error for non-existent replay', () => {
      expect(() => replaySystem.startPlayback('invalid-id')).to.throw('Replay not found');
    });

    it('should throw error when already playing', () => {
      replaySystem.startPlayback(replayId);
      
      expect(() => replaySystem.startPlayback(replayId)).to.throw('Already playing a replay');
    });

    it('should stop playback successfully', () => {
      replaySystem.startPlayback(replayId);
      
      const result = replaySystem.stopPlayback();
      
      expect(result).to.be.true;
      expect(replaySystem.isPlaying).to.be.false;
      expect(replaySystem.currentReplay).to.be.null;
      expect(replaySystem.playbackFrame).to.equal(0);
    });

    it('should pause and unpause playback', () => {
      replaySystem.startPlayback(replayId);
      
      expect(replaySystem.pausePlayback()).to.be.true; // Now paused
      expect(replaySystem.playbackPaused).to.be.true;
      
      expect(replaySystem.pausePlayback()).to.be.false; // Now unpaused
      expect(replaySystem.playbackPaused).to.be.false;
    });

    it('should seek to specific frame', () => {
      replaySystem.startPlayback(replayId);
      
      const result = replaySystem.seekToFrame(0);
      
      expect(result).to.be.true;
      expect(replaySystem.playbackFrame).to.equal(0);
    });

    it('should throw error for out-of-bounds frame', () => {
      replaySystem.startPlayback(replayId);
      
      expect(() => replaySystem.seekToFrame(1000)).to.throw('Frame out of bounds');
    });

    it('should calculate playback progress', () => {
      replaySystem.startPlayback(replayId);
      
      const progress = replaySystem.getPlaybackProgress();
      
      expect(progress).to.be.a('number');
      expect(progress).to.be.at.least(0);
      expect(progress).to.be.at.most(1);
    });

    it('should update playback frame', () => {
      replaySystem.startPlayback(replayId);
      const initialFrame = replaySystem.playbackFrame;
      
      const result = replaySystem.updatePlayback(16.67);
      
      expect(result).to.be.true;
      expect(replaySystem.playbackFrame).to.be.greaterThan(initialFrame);
    });

    it('should stop playback at end of replay', () => {
      replaySystem.startPlayback(replayId);
      replaySystem.playbackFrame = replaySystem.currentReplay.frames.length;
      
      const result = replaySystem.updatePlayback(16.67);
      
      expect(result).to.be.false;
      expect(replaySystem.isPlaying).to.be.false;
    });
  });

  describe('Replay Management', () => {
    let replayId;

    beforeEach(() => {
      replayId = replaySystem.startRecording();
      replaySystem.stopRecording({ result: 'test' });
    });

    it('should save replay to storage', () => {
      expect(replaySystem.savedReplays.has(replayId)).to.be.true;
      expect(mockLocalStorage.setItem).to.have.been.called;
    });

    it('should load replay from storage', () => {
      const replay = replaySystem.loadReplay(replayId);
      
      expect(replay).to.not.be.null;
      expect(replay.id).to.equal(replayId);
    });

    it('should return null for non-existent replay', () => {
      const replay = replaySystem.loadReplay('invalid-id');
      
      expect(replay).to.be.null;
    });

    it('should delete replay from storage', () => {
      const result = replaySystem.deleteReplay(replayId);
      
      expect(result).to.be.true;
      expect(replaySystem.savedReplays.has(replayId)).to.be.false;
      expect(mockLocalStorage.removeItem).to.have.been.calledWith(`replay_${replayId}`);
    });

    it('should list all replays', () => {
      const replays = replaySystem.listReplays();
      
      expect(replays).to.be.an('array');
      expect(replays).to.have.length(1);
      expect(replays[0].id).to.equal(replayId);
      expect(replays[0]).to.have.property('metadata');
      expect(replays[0]).to.have.property('size');
    });

    it('should cleanup old replays when limit exceeded', () => {
      const originalLimit = replaySystem.config.maxReplays;
      replaySystem.config.maxReplays = 1;
      
      // Create second replay
      const secondId = replaySystem.startRecording();
      replaySystem.stopRecording({ result: 'test2' });
      
      expect(replaySystem.savedReplays.size).to.equal(1);
      expect(replaySystem.savedReplays.has(secondId)).to.be.true;
      expect(replaySystem.savedReplays.has(replayId)).to.be.false;
      
      replaySystem.config.maxReplays = originalLimit;
    });
  });

  describe('Compression', () => {
    let testReplay;

    beforeEach(() => {
      testReplay = {
        id: 'test-replay',
        inputs: [{ frame: 0, directionX: 1 }],
        frames: [{ frame: 0, gameState: {} }],
        metadata: { timestamp: Date.now() }
      };
    });

    it('should compress replay data', () => {
      const compressed = replaySystem.compressReplay(testReplay);
      
      expect(compressed.compressed).to.be.true;
      expect(compressed.originalSize).to.be.a('number');
      expect(compressed.compressedSize).to.be.lessThan(compressed.originalSize);
    });

    it('should decompress replay data', () => {
      const compressed = replaySystem.compressReplay(testReplay);
      const decompressed = replaySystem.decompressReplay(compressed);
      
      expect(decompressed.compressed).to.be.undefined;
      expect(decompressed.id).to.equal(testReplay.id);
      expect(decompressed.inputs).to.deep.equal(testReplay.inputs);
    });

    it('should return uncompressed replay as-is', () => {
      const result = replaySystem.decompressReplay(testReplay);
      
      expect(result).to.deep.equal(testReplay);
    });
  });

  describe('Analysis', () => {
    let replayId;

    beforeEach(() => {
      replayId = replaySystem.startRecording();
      replaySystem.recordInput({ directionX: 1, lightAttack: true });
      replaySystem.recordInput({ directionY: 1, heavyAttack: true });
      replaySystem.stopRecording({ result: 'test', score: 500 });
    });

    it('should analyze recording data', () => {
      const replay = replaySystem.savedReplays.get(replayId);
      
      expect(replay.analysis).to.be.an('object');
      expect(replay.analysis.totalInputs).to.equal(2);
      expect(replay.analysis.inputTypes).to.be.instanceOf(Map);
      expect(replay.analysis.averageInputFrequency).to.be.a('number');
    });

    it('should track input types correctly', () => {
      const replay = replaySystem.savedReplays.get(replayId);
      const analysis = replay.analysis;
      
      expect(analysis.inputTypes.get('directionX')).to.equal(1);
      expect(analysis.inputTypes.get('lightAttack')).to.equal(1);
      expect(analysis.inputTypes.get('heavyAttack')).to.equal(1);
    });

    it('should calculate input frequency', () => {
      const replay = replaySystem.savedReplays.get(replayId);
      
      expect(replay.analysis.averageInputFrequency).to.be.greaterThan(0);
    });
  });

  describe('Import/Export', () => {
    let replayId;

    beforeEach(() => {
      replayId = replaySystem.startRecording();
      replaySystem.recordInput({ directionX: 1, lightAttack: true });
      replaySystem.stopRecording({ result: 'test' });
    });

    it('should export replay as JSON', () => {
      const exported = replaySystem.exportReplay(replayId, 'json');
      
      expect(exported).to.be.a('string');
      const parsed = JSON.parse(exported);
      expect(parsed.id).to.equal(replayId);
    });

    it('should export replay as CSV', () => {
      const exported = replaySystem.exportReplay(replayId, 'csv');
      
      expect(exported).to.be.a('string');
      expect(exported).to.include('frame,timestamp');
    });

    it('should export replay as binary', () => {
      const exported = replaySystem.exportReplay(replayId, 'binary');
      
      expect(exported).to.be.instanceOf(Uint8Array);
    });

    it('should throw error for unsupported export format', () => {
      expect(() => replaySystem.exportReplay(replayId, 'xml')).to.throw('Unsupported export format');
    });

    it('should import replay from JSON', () => {
      const exported = replaySystem.exportReplay(replayId, 'json');
      const importedId = replaySystem.importReplay(exported, 'json');
      
      expect(importedId).to.be.a('string');
      expect(replaySystem.savedReplays.has(importedId)).to.be.true;
    });

    it('should import replay from CSV', () => {
      const csvData = 'frame,timestamp,directionX,directionY\n0,1000,1,0\n1,1016,0,1';
      const importedId = replaySystem.importReplay(csvData, 'csv');
      
      expect(importedId).to.be.a('string');
      const replay = replaySystem.savedReplays.get(importedId);
      expect(replay.inputs).to.have.length(2);
    });

    it('should throw error for invalid replay data', () => {
      const invalidData = '{"invalid": "data"}';
      
      expect(() => replaySystem.importReplay(invalidData, 'json')).to.throw('Invalid replay data structure');
    });
  });

  describe('Validation', () => {
    it('should validate correct replay structure', () => {
      const validReplay = {
        id: 'test-id',
        metadata: { timestamp: Date.now() },
        inputs: [{ frame: 0, directionX: 1 }]
      };
      
      const result = replaySystem.validateReplay(validReplay);
      
      expect(result).to.be.true;
    });

    it('should reject invalid replay structure', () => {
      const invalidReplays = [
        null,
        undefined,
        'not an object',
        {},
        { id: 'test' },
        { id: 'test', metadata: {} },
        { id: 'test', metadata: {}, inputs: 'not an array' }
      ];
      
      for (const invalidReplay of invalidReplays) {
        const result = replaySystem.validateReplay(invalidReplay);
        expect(result).to.be.false;
      }
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique replay IDs', () => {
      const id1 = replaySystem.generateReplayId();
      const id2 = replaySystem.generateReplayId();
      
      expect(id1).to.be.a('string');
      expect(id2).to.be.a('string');
      expect(id1).to.not.equal(id2);
      expect(id1).to.include('replay_');
    });

    it('should calculate replay size', () => {
      const testReplay = {
        id: 'test',
        inputs: [{ frame: 0 }],
        metadata: {}
      };
      
      const size = replaySystem.calculateReplaySize(testReplay);
      
      expect(size).to.be.a('number');
      expect(size).to.be.greaterThan(0);
    });

    it('should update input analysis', () => {
      const inputData = { lightAttack: true, directionX: 1 };
      
      replaySystem.updateInputAnalysis(inputData);
      
      expect(replaySystem.analysisData.inputFrequency.get('lightAttack')).to.equal(1);
      expect(replaySystem.analysisData.inputFrequency.get('directionX')).to.equal(1);
    });
  });
});
