/**
 * Replay System - Advanced game replay recording and playback
 * Features deterministic replay, compression, and analysis tools
 */

export class ReplaySystem {
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
      maxRecordingTime: 3600, // 1 hour max
      compressionLevel: 3,    // 1-9, higher = more compression
      includeAudio: false,    // Audio recording disabled by default
      includeVideo: false,    // Video recording disabled by default
      frameRate: 60,          // Target frame rate
      autoSave: true,         // Auto-save completed recordings
      maxReplays: 100         // Maximum stored replays
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
    
    // Compression and encoding
    this.compressionWorker = null;
    this.encodingQueue = [];
    
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
  
  /**
   * Initialize replay system
   */
  init() {
    this.loadSavedReplays();
    this.setupCompressionWorker();
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Game events
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
    
    // Input events for recording
    window.addEventListener('playerInput', (event) => {
      if (this.isRecording && !this.isPaused) {
        this.recordInput(event.detail);
      }
    });
    
    // Frame events
    window.addEventListener('gameFrameUpdate', (event) => {
      if (this.isRecording && !this.isPaused) {
        this.recordFrame(event.detail);
      }
      
      if (this.isPlaying && !this.playbackPaused) {
        this.playbackFrame(event.detail);
      }
    });
  }
  
  /**
   * Setup compression worker for background processing
   */
  setupCompressionWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        // Create inline worker for compression
        const workerCode = `
          self.onmessage = function(e) {
            const { data, level } = e.data;
            
            // Simple compression algorithm (in real implementation, use better compression)
            const compressed = compressData(data, level);
            
            self.postMessage({ compressed });
          };
          
          function compressData(data, level) {
            // Placeholder compression - in real implementation use proper compression library
            const jsonString = JSON.stringify(data);
            return btoa(jsonString); // Simple base64 encoding
          }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
        
        this.compressionWorker.onmessage = (e) => {
          this.handleCompressionResult(e.data);
        };
      } catch (error) {
        console.warn('Compression worker not available:', error);
      }
    }
  }
  
  /**
   * Start recording a new replay
   */
  startRecording(metadata = {}) {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return false;
    }
    
    // Initialize recording
    this.isRecording = true;
    this.isPaused = false;
    this.inputBuffer = [];
    this.frameBuffer = [];
    
    // Setup metadata
    this.replayMetadata = {
      version: '1.0',
      gameVersion: '1.0.0',
      timestamp: Date.now(),
      duration: 0,
      seed: this.wasmManager.exports?.get_seed?.() ?? (typeof globalThis.runSeedForVisuals !== 'undefined' ? globalThis.runSeedForVisuals : 1),
      playerName: localStorage.getItem('playerName') || 'Anonymous',
      score: 0,
      result: 'unknown',
      ...metadata
    };
    
    // Reset analysis data
    this.analysisData = {
      inputFrequency: new Map(),
      reactionTimes: [],
      accuracyData: [],
      performanceMetrics: {}
    };
    
    console.log('🎬 Replay recording started');
    return true;
  }
  
  /**
   * Stop recording and save replay
   */
  stopRecording(gameResult = {}) {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return null;
    }
    
    this.isRecording = false;
    this.isPaused = false;
    
    // Update metadata with final results
    this.replayMetadata.duration = Date.now() - this.replayMetadata.timestamp;
    this.replayMetadata.score = gameResult.score || 0;
    this.replayMetadata.result = gameResult.result || 'completed';
    
    // Create replay object
    const replay = {
      metadata: { ...this.replayMetadata },
      inputs: [...this.inputBuffer],
      frames: [...this.frameBuffer],
      analysis: { ...this.analysisData },
      compressed: false
    };
    
    // Compress replay if worker is available
    if (this.compressionWorker && this.config.compressionLevel > 0) {
      this.compressReplay(replay);
    } else {
      this.saveReplay(replay);
    }
    
    console.log('🎬 Replay recording stopped', {
      duration: this.replayMetadata.duration,
      inputs: this.inputBuffer.length,
      frames: this.frameBuffer.length
    });
    
    return replay;
  }
  
  /**
   * Pause/resume recording
   */
  pauseRecording() {
    if (this.isRecording) {
      this.isPaused = !this.isPaused;
      console.log(`🎬 Recording ${this.isPaused ? 'paused' : 'resumed'}`);
    }
  }
  
  /**
   * Record input event
   */
  recordInput(inputData) {
    const inputFrame = {
      timestamp: Date.now(),
      frame: this.frameBuffer.length,
      type: 'input',
      data: { ...inputData }
    };
    
    this.inputBuffer.push(inputFrame);
    
    // Update analysis data
    this.updateInputAnalysis(inputData);
  }
  
  /**
   * Record frame state
   */
  recordFrame(frameData) {
    // Only record key frame data to save space
    const keyFrameData = {
      timestamp: Date.now(),
      frame: this.frameBuffer.length,
      playerState: {
        x: frameData.playerX || 0,
        y: frameData.playerY || 0,
        health: frameData.health || 100,
        stamina: frameData.stamina || 100,
        state: frameData.animationState || 'idle'
      },
      gameState: {
        phase: frameData.phase || 0,
        roomCount: frameData.roomCount || 0,
        score: frameData.score || 0
      },
      checksum: this.calculateFrameChecksum(frameData)
    };
    
    // Only store every Nth frame to reduce size
    const frameSkip = Math.max(1, Math.floor(60 / this.config.frameRate));
    if (this.frameBuffer.length % frameSkip === 0) {
      this.frameBuffer.push(keyFrameData);
    }
  }
  
  /**
   * Calculate frame checksum for integrity verification
   */
  calculateFrameChecksum(frameData) {
    // Simple checksum - in real implementation use proper hash
    const dataString = JSON.stringify(frameData);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  /**
   * Update input analysis data
   */
  updateInputAnalysis(inputData) {
    // Track input frequency
    Object.keys(inputData).forEach(key => {
      if (inputData[key]) {
        const count = this.analysisData.inputFrequency.get(key) || 0;
        this.analysisData.inputFrequency.set(key, count + 1);
      }
    });
    
    // Track reaction times (simplified)
    if (inputData.timestamp && this.lastEventTimestamp) {
      const reactionTime = inputData.timestamp - this.lastEventTimestamp;
      if (reactionTime > 0 && reactionTime < 1000) { // Valid reaction time range
        this.analysisData.reactionTimes.push(reactionTime);
      }
    }
    
    this.lastEventTimestamp = inputData.timestamp;
  }
  
  /**
   * Compress replay data
   */
  compressReplay(replay) {
    if (this.compressionWorker) {
      this.compressionWorker.postMessage({
        data: replay,
        level: this.config.compressionLevel,
        replayId: replay.metadata.timestamp
      });
    } else {
      // Fallback compression
      replay.compressed = true;
      replay.compressedData = this.simpleCompress(replay);
      this.saveReplay(replay);
    }
  }
  
  /**
   * Handle compression worker result
   */
  handleCompressionResult(result) {
    const { compressed, replayId } = result;
    
    // Find the original replay and update it
    const replay = this.findReplayById(replayId);
    if (replay) {
      replay.compressed = true;
      replay.compressedData = compressed;
      this.saveReplay(replay);
    }
  }
  
  /**
   * Simple compression fallback
   */
  simpleCompress(data) {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.error('Compression failed:', error);
      return null;
    }
  }
  
  /**
   * Decompress replay data
   */
  decompressReplay(compressedData) {
    try {
      if (typeof compressedData === 'string') {
        // Simple base64 decompression
        const jsonString = atob(compressedData);
        return JSON.parse(jsonString);
      }
      return compressedData; // Already decompressed
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }
  
  /**
   * Save replay to storage
   */
  saveReplay(replay) {
    const replayId = `replay_${replay.metadata.timestamp}`;
    
    // Add to saved replays
    this.savedReplays.set(replayId, replay);
    
    // Maintain maximum replay limit
    if (this.savedReplays.size > this.config.maxReplays) {
      const oldestReplay = Array.from(this.savedReplays.keys())
        .sort()[0]; // Get oldest by timestamp
      this.savedReplays.delete(oldestReplay);
    }
    
    // Save to localStorage
    this.saveToPersistentStorage();
    
    // Trigger event
    window.dispatchEvent(new CustomEvent('replaySaved', {
      detail: { replayId, metadata: replay.metadata }
    }));
    
    console.log('💾 Replay saved:', replayId);
  }
  
  /**
   * Load replay for playback
   */
  loadReplay(replayId) {
    const replay = this.savedReplays.get(replayId);
    if (!replay) {
      console.error('Replay not found:', replayId);
      return false;
    }
    
    // Decompress if needed
    let replayData = replay;
    if (replay.compressed && replay.compressedData) {
      replayData = this.decompressReplay(replay.compressedData);
      if (!replayData) {
        console.error('Failed to decompress replay:', replayId);
        return false;
      }
    }
    
    this.currentReplay = replayData;
    this.playbackFrame = 0;
    
    console.log('📼 Replay loaded:', replayId);
    return true;
  }
  
  /**
   * Start replay playback
   */
  startPlayback(replayId, options = {}) {
    if (!this.loadReplay(replayId)) {
      return false;
    }
    
    this.isPlaying = true;
    this.playbackPaused = false;
    this.playbackSpeed = options.speed || 1.0;
    this.playbackFrame = 0;
    
    // Initialize game state with replay seed
    if (this.currentReplay.metadata.seed && this.wasmManager.exports?.reset_run) {
      this.wasmManager.exports.reset_run(this.currentReplay.metadata.seed);
    }
    
    // Start playback loop
    this.playbackLoop();
    
    console.log('▶️ Replay playback started:', replayId);
    return true;
  }
  
  /**
   * Stop replay playback
   */
  stopPlayback() {
    this.isPlaying = false;
    this.playbackPaused = false;
    this.currentReplay = null;
    this.playbackFrame = 0;
    
    console.log('⏹️ Replay playback stopped');
  }
  
  /**
   * Pause/resume playback
   */
  pausePlayback() {
    if (this.isPlaying) {
      this.playbackPaused = !this.playbackPaused;
      console.log(`⏸️ Playback ${this.playbackPaused ? 'paused' : 'resumed'}`);
    }
  }
  
  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.1, Math.min(10, speed));
    console.log('⚡ Playback speed:', this.playbackSpeed);
  }
  
  /**
   * Seek to specific frame
   */
  seekToFrame(frameNumber) {
    if (!this.currentReplay) return false;
    
    const maxFrame = this.currentReplay.inputs.length - 1;
    this.playbackFrame = Math.max(0, Math.min(maxFrame, frameNumber));
    
    console.log('⏩ Seeked to frame:', this.playbackFrame);
    return true;
  }
  
  /**
   * Seek to specific time
   */
  seekToTime(timeSeconds) {
    if (!this.currentReplay) return false;
    
    const targetTime = timeSeconds * 1000; // Convert to milliseconds
    const startTime = this.currentReplay.metadata.timestamp;
    
    // Find closest frame to target time
    let closestFrame = 0;
    let closestTimeDiff = Infinity;
    
    this.currentReplay.inputs.forEach((input, index) => {
      const timeDiff = Math.abs((input.timestamp - startTime) - targetTime);
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestFrame = index;
      }
    });
    
    return this.seekToFrame(closestFrame);
  }
  
  /**
   * Playback loop
   */
  playbackLoop() {
    if (!this.isPlaying || !this.currentReplay) return;
    
    if (!this.playbackPaused) {
      this.processPlaybackFrame();
    }
    
    // Schedule next frame
    const frameDelay = (1000 / 60) / this.playbackSpeed; // Adjust for speed
    setTimeout(() => {
      if (this.isPlaying) {
        this.playbackLoop();
      }
    }, frameDelay);
  }
  
  /**
   * Process current playback frame
   */
  processPlaybackFrame() {
    if (this.playbackFrame >= this.currentReplay.inputs.length) {
      this.stopPlayback();
      window.dispatchEvent(new CustomEvent('replayEnded'));
      return;
    }
    
    const input = this.currentReplay.inputs[this.playbackFrame];
    
    // Apply input to game
    if (this.gameStateManager && input.data) {
      this.gameStateManager.processReplayInput(input.data);
    }
    
    // Update game state
    if (this.wasmManager.exports?.update) {
      this.wasmManager.exports.update(
        input.data.moveX || 0,
        input.data.moveY || 0,
        input.data.isRolling || false,
        1/60 // Fixed delta time for deterministic playback
      );
    }
    
    // Trigger frame event
    window.dispatchEvent(new CustomEvent('replayFrameProcessed', {
      detail: {
        frame: this.playbackFrame,
        input: input,
        progress: this.playbackFrame / this.currentReplay.inputs.length
      }
    }));
    
    this.playbackFrame++;
  }
  
  /**
   * Get saved replays list
   */
  getSavedReplays() {
    return Array.from(this.savedReplays.entries()).map(([id, replay]) => ({
      id,
      metadata: replay.metadata,
      size: this.calculateReplaySize(replay),
      compressed: replay.compressed || false
    })).sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
  }
  
  /**
   * Calculate replay size in bytes
   */
  calculateReplaySize(replay) {
    const jsonString = JSON.stringify(replay);
    return new Blob([jsonString]).size;
  }
  
  /**
   * Delete saved replay
   */
  deleteReplay(replayId) {
    if (this.savedReplays.has(replayId)) {
      this.savedReplays.delete(replayId);
      this.saveToPersistentStorage();
      
      window.dispatchEvent(new CustomEvent('replayDeleted', {
        detail: { replayId }
      }));
      
      console.log('🗑️ Replay deleted:', replayId);
      return true;
    }
    return false;
  }
  
  /**
   * Export replay to file
   */
  exportReplay(replayId) {
    const replay = this.savedReplays.get(replayId);
    if (!replay) return null;
    
    const exportData = {
      version: '1.0',
      exported: Date.now(),
      replay: replay
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const filename = `replay_${replay.metadata.timestamp}.json`;
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📤 Replay exported:', filename);
    return filename;
  }
  
  /**
   * Import replay from file
   */
  async importReplay(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.replay || !importData.replay.metadata) {
        throw new Error('Invalid replay file format');
      }
      
      const replayId = `imported_${Date.now()}`;
      this.savedReplays.set(replayId, importData.replay);
      this.saveToPersistentStorage();
      
      window.dispatchEvent(new CustomEvent('replayImported', {
        detail: { replayId, metadata: importData.replay.metadata }
      }));
      
      console.log('📥 Replay imported:', replayId);
      return replayId;
    } catch (error) {
      console.error('Failed to import replay:', error);
      return null;
    }
  }
  
  /**
   * Analyze replay performance
   */
  analyzeReplay(replayId) {
    const replay = this.savedReplays.get(replayId);
    if (!replay) return null;
    
    const analysis = {
      metadata: replay.metadata,
      duration: replay.metadata.duration,
      totalInputs: replay.inputs.length,
      inputFrequency: replay.analysis.inputFrequency || new Map(),
      averageReactionTime: 0,
      accuracyMetrics: {},
      performanceScore: 0
    };
    
    // Calculate average reaction time
    if (replay.analysis.reactionTimes && replay.analysis.reactionTimes.length > 0) {
      analysis.averageReactionTime = replay.analysis.reactionTimes.reduce((a, b) => a + b, 0) / 
        replay.analysis.reactionTimes.length;
    }
    
    // Calculate input distribution
    const inputDistribution = {};
    if (replay.analysis.inputFrequency) {
      const totalInputs = Array.from(replay.analysis.inputFrequency.values())
        .reduce((a, b) => a + b, 0);
      
      replay.analysis.inputFrequency.forEach((count, input) => {
        inputDistribution[input] = {
          count: count,
          percentage: (count / totalInputs) * 100
        };
      });
    }
    analysis.inputDistribution = inputDistribution;
    
    // Calculate performance score (simplified)
    const scoreFactors = {
      finalScore: (replay.metadata.score || 0) / 1000,
      reactionTime: Math.max(0, 1 - (analysis.averageReactionTime / 500)),
      inputEfficiency: Math.min(1, (replay.metadata.score || 0) / replay.inputs.length)
    };
    
    analysis.performanceScore = Object.values(scoreFactors).reduce((a, b) => a + b, 0) / 
      Object.keys(scoreFactors).length;
    
    return analysis;
  }
  
  /**
   * Compare two replays
   */
  compareReplays(replayId1, replayId2) {
    const analysis1 = this.analyzeReplay(replayId1);
    const analysis2 = this.analyzeReplay(replayId2);
    
    if (!analysis1 || !analysis2) return null;
    
    return {
      replay1: analysis1,
      replay2: analysis2,
      comparison: {
        scoreDifference: analysis1.metadata.score - analysis2.metadata.score,
        timeDifference: analysis1.duration - analysis2.duration,
        reactionTimeDifference: analysis1.averageReactionTime - analysis2.averageReactionTime,
        performanceScoreDifference: analysis1.performanceScore - analysis2.performanceScore
      }
    };
  }
  
  /**
   * Find replay by ID
   */
  findReplayById(replayId) {
    return this.savedReplays.get(replayId);
  }
  
  /**
   * Load replays from persistent storage
   */
  loadSavedReplays() {
    try {
      const stored = localStorage.getItem('savedReplays');
      if (stored) {
        const data = JSON.parse(stored);
        this.savedReplays = new Map(Object.entries(data));
        console.log(`📼 Loaded ${this.savedReplays.size} saved replays`);
      }
    } catch (error) {
      console.warn('Failed to load saved replays:', error);
    }
  }
  
  /**
   * Save replays to persistent storage
   */
  saveToPersistentStorage() {
    try {
      const data = Object.fromEntries(this.savedReplays);
      localStorage.setItem('savedReplays', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save replays to storage:', error);
    }
  }
  
  /**
   * Get current recording status
   */
  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.isRecording ? Date.now() - this.replayMetadata.timestamp : 0,
      inputCount: this.inputBuffer.length,
      frameCount: this.frameBuffer.length
    };
  }
  
  /**
   * Get current playback status
   */
  getPlaybackStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.playbackPaused,
      currentFrame: this.playbackFrame,
      totalFrames: this.currentReplay ? this.currentReplay.inputs.length : 0,
      progress: this.currentReplay ? this.playbackFrame / this.currentReplay.inputs.length : 0,
      speed: this.playbackSpeed
    };
  }
  
  /**
   * Clear all replays
   */
  clearAllReplays() {
    this.savedReplays.clear();
    this.saveToPersistentStorage();
    
    window.dispatchEvent(new CustomEvent('allReplaysCleared'));
    console.log('🗑️ All replays cleared');
  }
  
  /**
   * Get replay system statistics
   */
  getSystemStats() {
    const replays = Array.from(this.savedReplays.values());
    
    return {
      totalReplays: replays.length,
      totalDuration: replays.reduce((sum, replay) => sum + replay.metadata.duration, 0),
      averageScore: replays.length > 0 ? 
        replays.reduce((sum, replay) => sum + (replay.metadata.score || 0), 0) / replays.length : 0,
      totalSize: replays.reduce((sum, replay) => sum + this.calculateReplaySize(replay), 0),
      compressedReplays: replays.filter(replay => replay.compressed).length
    };
  }
}
