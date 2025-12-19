// ReplayRecorder.js
// Records gameplay for deterministic replay
// Single responsibility: capture and store replay data

/**
 * ReplayRecorder captures input frames and game state for replay.
 * Implements deterministic replay for multiplayer validation.
 * 
 * Responsibilities:
 * - Record input frames with timestamps
 * - Store initial seed and state
 * - Export replay data for playback
 * - Validate replay integrity
 */
export class ReplayRecorder {
  constructor(options = {}) {
    this.enabled = options.enabled || false
    this.frames = []
    this.metadata = {
      seed: null,
      startTime: null,
      version: '1.0.0'
    }
  }

  /**
   * Start recording
   */
  start(seed) {
    this.enabled = true
    this.frames = []
    this.metadata.seed = seed
    this.metadata.startTime = Date.now()
  }

  /**
   * Stop recording
   */
  stop() {
    this.enabled = false
  }

  /**
   * Record a frame
   */
  recordFrame(frameData) {
    if (!this.enabled) {return}

    const frame = {
      tick: frameData.tick,
      input: { ...frameData.input },
      timestamp: Date.now() - this.metadata.startTime
    }

    this.frames.push(frame)
  }

  /**
   * Record state snapshot (for validation)
   */
  recordStateSnapshot(tick, stateData) {
    if (!this.enabled) {return}

    const snapshot = {
      tick,
      state: { ...stateData },
      timestamp: Date.now() - this.metadata.startTime
    }

    // Store snapshots every N frames
    if (tick % 60 === 0) {
      this.frames.push({
        type: 'snapshot',
        ...snapshot
      })
    }
  }

  /**
   * Export replay data
   */
  export() {
    return {
      metadata: { ...this.metadata },
      frames: [...this.frames],
      frameCount: this.frames.length
    }
  }

  /**
   * Import replay data
   */
  import(replayData) {
    this.metadata = { ...replayData.metadata }
    this.frames = [...replayData.frames]
  }

  /**
   * Clear recording
   */
  clear() {
    this.frames = []
    this.metadata.seed = null
    this.metadata.startTime = null
  }

  /**
   * Get frame count
   */
  getFrameCount() {
    return this.frames.length
  }

  /**
   * Check if recording
   */
  isRecording() {
    return this.enabled
  }
}

