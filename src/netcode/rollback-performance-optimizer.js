/**
 * Rollback Performance Optimizer
 * Optimizes rollback netcode performance through state compression, batching,
 * and adaptive algorithms based on network conditions
 */

import { createLogger } from '../utils/logger.js'

// Constants for performance optimization
const COMPRESSION_ALGORITHMS = {
  NONE: 'none',
  LZ4: 'lz4',
  GZIP: 'gzip',
  CUSTOM: 'custom'
}

const BATCH_STRATEGIES = {
  TIME_BASED: 'time_based',
  SIZE_BASED: 'size_based',
  ADAPTIVE: 'adaptive'
}

const FRAME_SKIP_STRATEGIES = {
  NONE: 'none',
  PREDICTIVE: 'predictive',
  QUALITY_BASED: 'quality_based'
}

export class RollbackPerformanceOptimizer {
  constructor(config = {}) {
    this.config = {
      // Compression settings
      compressionAlgorithm: config.compressionAlgorithm || COMPRESSION_ALGORITHMS.CUSTOM,
      compressionThreshold: config.compressionThreshold || 1024, // bytes
      compressionLevel: config.compressionLevel || 6, // 1-9
      
      // Batching settings
      batchStrategy: config.batchStrategy || BATCH_STRATEGIES.ADAPTIVE,
      maxBatchSize: config.maxBatchSize || 8192, // bytes
      maxBatchTime: config.maxBatchTime || 16, // ms
      minBatchSize: config.minBatchSize || 512, // bytes
      
      // Frame optimization
      frameSkipStrategy: config.frameSkipStrategy || FRAME_SKIP_STRATEGIES.QUALITY_BASED,
      maxFrameSkip: config.maxFrameSkip || 3,
      qualityThreshold: config.qualityThreshold || 0.7,
      
      // Memory optimization
      maxStateHistory: config.maxStateHistory || 60, // frames
      enableStatePooling: config.enableStatePooling !== false,
      enableDeltaCompression: config.enableDeltaCompression !== false,
      
      // Adaptive settings
      enableAdaptiveOptimization: config.enableAdaptiveOptimization !== false,
      performanceTargetFPS: config.performanceTargetFPS || 60,
      adaptationInterval: config.adaptationInterval || 5000, // ms
      
      ...config
    }
    
    this.logger = createLogger({ level: config.logLevel || 'info' })
    
    // Performance metrics
    this.metrics = {
      compression: {
        totalStates: 0,
        compressedStates: 0,
        originalBytes: 0,
        compressedBytes: 0,
        compressionRatio: 0,
        compressionTime: [],
        decompressionTime: []
      },
      
      batching: {
        totalBatches: 0,
        avgBatchSize: 0,
        avgBatchTime: 0,
        batchSizes: [],
        batchTimes: []
      },
      
      frameProcessing: {
        totalFrames: 0,
        skippedFrames: 0,
        avgFrameTime: 0,
        frameTimes: [],
        rollbacks: 0,
        rollbackTime: []
      },
      
      memory: {
        statePoolSize: 0,
        statePoolHits: 0,
        statePoolMisses: 0,
        memoryUsage: 0,
        gcCollections: 0
      },
      
      network: {
        bytesSaved: 0,
        latencyReduction: 0,
        qualityScore: 0
      }
    }
    
    // State management
    this.statePool = new Map() // Reusable state objects
    this.compressionCache = new Map() // Cached compressed states
    this.deltaStates = new Map() // Delta-compressed states
    this.batchQueue = []
    this.batchTimer = null
    
    // Adaptive optimization
    this.adaptiveSettings = {
      currentFPS: 60,
      targetFPS: this.config.performanceTargetFPS,
      networkQuality: 'good',
      cpuUsage: 0,
      memoryPressure: 0,
      lastAdaptation: 0
    }
    
    // Optimization strategies
    this.strategies = {
      compression: null,
      batching: null,
      frameSkipping: null
    }
    
    this.initializeStrategies()
    
    if (this.config.enableAdaptiveOptimization) {
      this.startAdaptiveOptimization()
    }
  }
  
  /**
   * Initialize optimization strategies
   */
  initializeStrategies() {
    // Initialize compression strategy
    this.strategies.compression = this.createCompressionStrategy()
    
    // Initialize batching strategy
    this.strategies.batching = this.createBatchingStrategy()
    
    // Initialize frame skipping strategy
    this.strategies.frameSkipping = this.createFrameSkippingStrategy()
    
    this.logger.info('Performance optimization strategies initialized', {
      compression: this.config.compressionAlgorithm,
      batching: this.config.batchStrategy,
      frameSkipping: this.config.frameSkipStrategy
    })
  }
  
  /**
   * Create compression strategy
   */
  createCompressionStrategy() {
    switch (this.config.compressionAlgorithm) {
      case COMPRESSION_ALGORITHMS.LZ4:
        return {
          compress: this.compressLZ4.bind(this),
          decompress: this.decompressLZ4.bind(this),
          shouldCompress: (data) => this.getDataSize(data) > this.config.compressionThreshold
        }
        
      case COMPRESSION_ALGORITHMS.GZIP:
        return {
          compress: this.compressGzip.bind(this),
          decompress: this.decompressGzip.bind(this),
          shouldCompress: (data) => this.getDataSize(data) > this.config.compressionThreshold
        }
        
      case COMPRESSION_ALGORITHMS.CUSTOM:
        return {
          compress: this.compressCustom.bind(this),
          decompress: this.decompressCustom.bind(this),
          shouldCompress: (data) => this.getDataSize(data) > this.config.compressionThreshold
        }
        
      default:
        return {
          compress: (data) => data,
          decompress: (data) => data,
          shouldCompress: () => false
        }
    }
  }
  
  /**
   * Create batching strategy
   */
  createBatchingStrategy() {
    switch (this.config.batchStrategy) {
      case BATCH_STRATEGIES.TIME_BASED:
        return {
          shouldBatch: () => true,
          getBatchTimeout: () => this.config.maxBatchTime,
          canAddToBatch: (batchSize, itemSize) => batchSize + itemSize <= this.config.maxBatchSize
        }
        
      case BATCH_STRATEGIES.SIZE_BASED:
        return {
          shouldBatch: () => true,
          getBatchTimeout: () => this.config.maxBatchTime * 2,
          canAddToBatch: (batchSize, itemSize) => batchSize + itemSize <= this.config.maxBatchSize
        }
        
      case BATCH_STRATEGIES.ADAPTIVE:
        return {
          shouldBatch: () => this.adaptiveSettings.networkQuality !== 'excellent',
          getBatchTimeout: () => this.getAdaptiveBatchTimeout(),
          canAddToBatch: (batchSize, itemSize) => batchSize + itemSize <= this.getAdaptiveBatchSize()
        }
        
      default:
        return {
          shouldBatch: () => false,
          getBatchTimeout: () => 0,
          canAddToBatch: () => false
        }
    }
  }
  
  /**
   * Create frame skipping strategy
   */
  createFrameSkippingStrategy() {
    switch (this.config.frameSkipStrategy) {
      case FRAME_SKIP_STRATEGIES.PREDICTIVE:
        return {
          shouldSkipFrame: (frame, networkQuality) => networkQuality === 'poor' && frame % 2 === 0,
          getSkipPattern: (quality) => quality === 'poor' ? 2 : 1
        }
        
      case FRAME_SKIP_STRATEGIES.QUALITY_BASED:
        return {
          shouldSkipFrame: (frame, networkQuality, cpuUsage) => {
            const qualityScore = this.calculateQualityScore(networkQuality, cpuUsage)
            return qualityScore < this.config.qualityThreshold && frame % this.getSkipInterval(qualityScore) === 0
          },
          getSkipPattern: (quality) => this.getSkipInterval(this.calculateQualityScore(quality))
        }
        
      default:
        return {
          shouldSkipFrame: () => false,
          getSkipPattern: () => 1
        }
    }
  }
  
  /**
   * Optimize game state before saving
   */
  optimizeStateForSaving(state, frame) {
    const startTime = performance.now()
    let optimizedState = state
    
    try {
      // Apply delta compression if enabled
      if (this.config.enableDeltaCompression) {
        optimizedState = this.applyDeltaCompression(state, frame)
      }
      
      // Apply state compression if needed
      if (this.strategies.compression.shouldCompress(optimizedState)) {
        optimizedState = this.strategies.compression.compress(optimizedState)
        this.updateCompressionMetrics(state, optimizedState, performance.now() - startTime)
      }
      
      // Use state pooling if enabled
      if (this.config.enableStatePooling) {
        optimizedState = this.poolState(optimizedState)
      }
      
      this.metrics.frameProcessing.totalFrames++
      this.updateFrameProcessingMetrics(performance.now() - startTime)
      
      return optimizedState
      
    } catch (error) {
      this.logger.error('State optimization failed', error)
      return state // Return original state on error
    }
  }
  
  /**
   * Optimize state for loading
   */
  optimizeStateForLoading(state, frame) {
    const startTime = performance.now()
    let optimizedState = state
    
    try {
      // Decompress if needed
      if (this.isCompressedState(state)) {
        optimizedState = this.strategies.compression.decompress(state)
        this.updateDecompressionMetrics(performance.now() - startTime)
      }
      
      // Apply delta decompression if needed
      if (this.config.enableDeltaCompression && this.isDeltaState(optimizedState)) {
        optimizedState = this.applyDeltaDecompression(optimizedState, frame)
      }
      
      return optimizedState
      
    } catch (error) {
      this.logger.error('State loading optimization failed', error)
      return state
    }
  }
  
  /**
   * Optimize input batching
   */
  optimizeInputBatching(input, frame) {
    if (!this.strategies.batching.shouldBatch()) {
      return { inputs: [input], immediate: true }
    }
    
    const inputSize = this.getDataSize(input)
    const currentBatchSize = this.getCurrentBatchSize()
    
    if (this.strategies.batching.canAddToBatch(currentBatchSize, inputSize)) {
      this.addToBatch(input, frame)
      
      // Set batch timer if not already set
      if (!this.batchTimer) {
        const timeout = this.strategies.batching.getBatchTimeout()
        this.batchTimer = setTimeout(() => {
          this.flushBatch()
        }, timeout)
      }
      
      return { inputs: [], immediate: false }
    } 
      // Batch is full, flush it and start new batch
      const batchedInputs = this.flushBatch()
      this.addToBatch(input, frame)
      
      return { inputs: batchedInputs, immediate: false }
    
  }
  
  /**
   * Optimize rollback operation
   */
  optimizeRollback(targetFrame, currentFrame) {
    const startTime = performance.now()
    const rollbackFrames = currentFrame - targetFrame
    
    // Determine if we should use frame skipping during rollback
    const shouldSkipFrames = this.strategies.frameSkipping.shouldSkipFrame(
      rollbackFrames,
      this.adaptiveSettings.networkQuality,
      this.adaptiveSettings.cpuUsage
    )
    
    const optimizationStrategy = {
      useFrameSkipping: shouldSkipFrames,
      skipInterval: shouldSkipFrames ? this.strategies.frameSkipping.getSkipPattern(this.adaptiveSettings.networkQuality) : 1,
      useDeltaStates: this.config.enableDeltaCompression,
      batchUpdates: rollbackFrames > 5
    }
    
    // Track rollback metrics
    this.metrics.frameProcessing.rollbacks++
    this.metrics.frameProcessing.rollbackTime.push(performance.now() - startTime)
    
    if (this.metrics.frameProcessing.rollbackTime.length > 100) {
      this.metrics.frameProcessing.rollbackTime.shift()
    }
    
    return optimizationStrategy
  }
  
  /**
   * Apply delta compression to state
   */
  applyDeltaCompression(currentState, frame) {
    const previousFrame = frame - 1
    const previousState = this.deltaStates.get(previousFrame)
    
    if (!previousState) {
      // No previous state, store full state
      this.deltaStates.set(frame, currentState)
      return currentState
    }
    
    // Calculate delta
    const delta = this.calculateStateDelta(previousState, currentState)
    
    // Store delta if it's smaller than full state
    const deltaSize = this.getDataSize(delta)
    const fullSize = this.getDataSize(currentState)
    
    if (deltaSize < fullSize * 0.7) {
      const deltaState = {
        type: 'delta',
        baseFrame: previousFrame,
        delta: delta,
        frame: frame
      }
      
      this.deltaStates.set(frame, deltaState)
      return deltaState
    } 
      // Delta not worth it, store full state
      this.deltaStates.set(frame, currentState)
      return currentState
    
  }
  
  /**
   * Apply delta decompression to state
   */
  applyDeltaDecompression(deltaState, frame) {
    if (!this.isDeltaState(deltaState)) {
      return deltaState
    }
    
    const baseState = this.deltaStates.get(deltaState.baseFrame)
    if (!baseState) {
      this.logger.warn('Base state not found for delta decompression', {
        frame,
        baseFrame: deltaState.baseFrame
      })
      return deltaState
    }
    
    return this.applyDeltaToState(baseState, deltaState.delta)
  }
  
  /**
   * Calculate delta between two states
   */
  calculateStateDelta(oldState, newState) {
    const delta = {}
    
    // Simple delta calculation - in a real implementation,
    // this would be more sophisticated
    for (const key in newState) {
      if (newState[key] !== oldState[key]) {
        delta[key] = newState[key]
      }
    }
    
    return delta
  }
  
  /**
   * Apply delta to base state
   */
  applyDeltaToState(baseState, delta) {
    const newState = { ...baseState }
    
    for (const key in delta) {
      newState[key] = delta[key]
    }
    
    return newState
  }
  
  /**
   * Custom compression implementation
   */
  compressCustom(data) {
    try {
      const jsonString = JSON.stringify(data)
      
      // Simple run-length encoding for repeated characters
      let compressed = jsonString.replace(/(.)\\1{2,}/g, (match, char) => `${char}${match.length}`)
      
      // Remove common JSON patterns
      compressed = compressed
        .replace(/\"(\\w+)\":/g, '$1:') // Remove quotes from keys
        .replace(/\\s+/g, '') // Remove whitespace
      
      return {
        type: 'custom_compressed',
        data: compressed,
        originalSize: jsonString.length,
        compressedSize: compressed.length
      }
    } catch (error) {
      this.logger.error('Custom compression failed', error)
      return data
    }
  }
  
  /**
   * Custom decompression implementation
   */
  decompressCustom(compressedData) {
    try {
      if (!compressedData || compressedData.type !== 'custom_compressed') {
        return compressedData
      }
      
      let decompressed = compressedData.data
      
      // Reverse compression steps
      decompressed = decompressed.replace(/(\\w+):/g, '\"$1\":') // Add quotes back
      decompressed = decompressed.replace(/(.)([0-9]+)/g, (match, char, count) => char.repeat(parseInt(count)))
      
      return JSON.parse(decompressed)
    } catch (error) {
      this.logger.error('Custom decompression failed', error)
      return compressedData
    }
  }
  
  /**
   * LZ4 compression (simplified implementation)
   */
  compressLZ4(data) {
    // This is a placeholder - in a real implementation,
    // you would use a proper LZ4 library
    return this.compressCustom(data)
  }
  
  /**
   * LZ4 decompression
   */
  decompressLZ4(data) {
    return this.decompressCustom(data)
  }
  
  /**
   * GZIP compression
   */
  compressGzip(data) {
    // This would use a GZIP library in a real implementation
    return this.compressCustom(data)
  }
  
  /**
   * GZIP decompression
   */
  decompressGzip(data) {
    return this.decompressCustom(data)
  }
  
  /**
   * Pool state objects for reuse
   */
  poolState(state) {
    const stateKey = this.generateStateKey(state)
    
    if (this.statePool.has(stateKey)) {
      this.metrics.memory.statePoolHits++
      return this.statePool.get(stateKey)
    } 
      this.metrics.memory.statePoolMisses++
      this.statePool.set(stateKey, state)
      
      // Limit pool size
      if (this.statePool.size > 1000) {
        const oldestKey = this.statePool.keys().next().value
        this.statePool.delete(oldestKey)
      }
      
      return state
    
  }
  
  /**
   * Generate key for state pooling
   */
  generateStateKey(state) {
    // Simple hash of state - in a real implementation,
    // this would be more sophisticated
    return JSON.stringify(state).split('').reduce((hash, char) => {
      hash = ((hash << 5) - hash) + char.charCodeAt(0)
      return hash & hash
    }, 0).toString()
  }
  
  /**
   * Add input to current batch
   */
  addToBatch(input, frame) {
    this.batchQueue.push({ input, frame, timestamp: performance.now() })
  }
  
  /**
   * Flush current batch
   */
  flushBatch() {
    if (this.batchQueue.length === 0) {
      return []
    }
    
    const batchStartTime = performance.now()
    const batch = [...this.batchQueue]
    this.batchQueue = []
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    // Update batching metrics
    const batchTime = performance.now() - batchStartTime
    const batchSize = batch.reduce((size, item) => size + this.getDataSize(item.input), 0)
    
    this.updateBatchingMetrics(batchSize, batchTime)
    
    return batch.map(item => item.input)
  }
  
  /**
   * Get current batch size
   */
  getCurrentBatchSize() {
    return this.batchQueue.reduce((size, item) => size + this.getDataSize(item.input), 0)
  }
  
  /**
   * Get data size in bytes
   */
  getDataSize(data) {
    if (!data) {return 0}
    
    if (data.byteLength !== undefined) {
      return data.byteLength
    }
    
    if (data.compressedSize !== undefined) {
      return data.compressedSize
    }
    
    // Estimate size from JSON string
    try {
      return JSON.stringify(data).length * 2 // Rough estimate for UTF-16
    } catch {
      return 1024 // Default estimate
    }
  }
  
  /**
   * Check if state is compressed
   */
  isCompressedState(state) {
    return state && (state.type === 'custom_compressed' || state.compressed === true)
  }
  
  /**
   * Check if state is delta-compressed
   */
  isDeltaState(state) {
    return state && state.type === 'delta'
  }
  
  /**
   * Calculate quality score
   */
  calculateQualityScore(networkQuality, cpuUsage = 0) {
    let score = 1.0
    
    switch (networkQuality) {
      case 'excellent': score *= 1.0; break
      case 'good': score *= 0.8; break
      case 'fair': score *= 0.6; break
      case 'poor': score *= 0.3; break
      default: score *= 0.5
    }
    
    // Factor in CPU usage
    score *= Math.max(0.1, 1.0 - (cpuUsage / 100))
    
    return score
  }
  
  /**
   * Get skip interval based on quality
   */
  getSkipInterval(qualityScore) {
    if (qualityScore > 0.8) {return 1} // No skipping
    if (qualityScore > 0.6) {return 2} // Skip every other frame
    if (qualityScore > 0.4) {return 3} // Skip 2 out of 3 frames
    return Math.min(this.config.maxFrameSkip, 4) // Skip more aggressively
  }
  
  /**
   * Get adaptive batch timeout
   */
  getAdaptiveBatchTimeout() {
    const baseTimeout = this.config.maxBatchTime
    
    switch (this.adaptiveSettings.networkQuality) {
      case 'excellent': return baseTimeout * 0.5
      case 'good': return baseTimeout
      case 'fair': return baseTimeout * 1.5
      case 'poor': return baseTimeout * 2
      default: return baseTimeout
    }
  }
  
  /**
   * Get adaptive batch size
   */
  getAdaptiveBatchSize() {
    const baseSize = this.config.maxBatchSize
    
    switch (this.adaptiveSettings.networkQuality) {
      case 'excellent': return baseSize * 0.5
      case 'good': return baseSize
      case 'fair': return baseSize * 1.2
      case 'poor': return baseSize * 1.5
      default: return baseSize
    }
  }
  
  /**
   * Start adaptive optimization
   */
  startAdaptiveOptimization() {
    setInterval(() => {
      this.adaptOptimizationSettings()
    }, this.config.adaptationInterval)
    
    this.logger.info('Adaptive optimization started')
  }
  
  /**
   * Adapt optimization settings based on current conditions
   */
  adaptOptimizationSettings() {
    const now = performance.now()
    
    // Update current conditions
    this.updateCurrentConditions()
    
    // Adapt compression settings
    this.adaptCompressionSettings()
    
    // Adapt batching settings
    this.adaptBatchingSettings()
    
    // Adapt frame processing settings
    this.adaptFrameProcessingSettings()
    
    this.adaptiveSettings.lastAdaptation = now
    
    this.logger.debug('Optimization settings adapted', {
      networkQuality: this.adaptiveSettings.networkQuality,
      currentFPS: this.adaptiveSettings.currentFPS,
      cpuUsage: this.adaptiveSettings.cpuUsage
    })
  }
  
  /**
   * Update current system conditions
   */
  updateCurrentConditions() {
    // Calculate current FPS
    const recentFrameTimes = this.metrics.frameProcessing.frameTimes.slice(-60)
    if (recentFrameTimes.length > 0) {
      const avgFrameTime = recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length
      this.adaptiveSettings.currentFPS = 1000 / avgFrameTime
    }
    
    // Estimate CPU usage based on frame processing times
    if (recentFrameTimes.length > 0) {
      const maxFrameTime = Math.max(...recentFrameTimes)
      this.adaptiveSettings.cpuUsage = Math.min(100, (maxFrameTime / 16.67) * 100) // 16.67ms = 60fps
    }
    
    // Update memory pressure
    this.adaptiveSettings.memoryPressure = this.estimateMemoryPressure()
  }
  
  /**
   * Adapt compression settings
   */
  adaptCompressionSettings() {
    // Increase compression if network quality is poor
    if (this.adaptiveSettings.networkQuality === 'poor') {
      this.config.compressionThreshold = Math.max(512, this.config.compressionThreshold * 0.8)
    } else if (this.adaptiveSettings.networkQuality === 'excellent') {
      this.config.compressionThreshold = Math.min(2048, this.config.compressionThreshold * 1.2)
    }
  }
  
  /**
   * Adapt batching settings
   */
  adaptBatchingSettings() {
    // Adjust batch size based on network conditions
    if (this.adaptiveSettings.networkQuality === 'poor') {
      this.config.maxBatchSize = Math.min(16384, this.config.maxBatchSize * 1.2)
      this.config.maxBatchTime = Math.min(50, this.config.maxBatchTime * 1.5)
    } else if (this.adaptiveSettings.networkQuality === 'excellent') {
      this.config.maxBatchSize = Math.max(4096, this.config.maxBatchSize * 0.8)
      this.config.maxBatchTime = Math.max(8, this.config.maxBatchTime * 0.8)
    }
  }
  
  /**
   * Adapt frame processing settings
   */
  adaptFrameProcessingSettings() {
    // Adjust frame skipping based on performance
    if (this.adaptiveSettings.currentFPS < this.adaptiveSettings.targetFPS * 0.9) {
      // Performance is below target, enable more aggressive optimizations
      this.config.maxFrameSkip = Math.min(5, this.config.maxFrameSkip + 1)
    } else if (this.adaptiveSettings.currentFPS > this.adaptiveSettings.targetFPS * 1.1) {
      // Performance is above target, reduce optimizations
      this.config.maxFrameSkip = Math.max(1, this.config.maxFrameSkip - 1)
    }
  }
  
  /**
   * Estimate memory pressure
   */
  estimateMemoryPressure() {
    // Simple estimation based on pool sizes and GC frequency
    const poolPressure = this.statePool.size / 1000
    const cachePressure = this.compressionCache.size / 500
    const deltaPressure = this.deltaStates.size / 200
    
    return Math.min(1.0, poolPressure + cachePressure + deltaPressure)
  }
  
  /**
   * Update compression metrics
   */
  updateCompressionMetrics(originalState, compressedState, compressionTime) {
    this.metrics.compression.totalStates++
    this.metrics.compression.compressedStates++
    
    const originalSize = this.getDataSize(originalState)
    const compressedSize = this.getDataSize(compressedState)
    
    this.metrics.compression.originalBytes += originalSize
    this.metrics.compression.compressedBytes += compressedSize
    
    if (this.metrics.compression.originalBytes > 0) {
      this.metrics.compression.compressionRatio = this.metrics.compression.compressedBytes / this.metrics.compression.originalBytes
    }
    
    this.metrics.compression.compressionTime.push(compressionTime)
    if (this.metrics.compression.compressionTime.length > 100) {
      this.metrics.compression.compressionTime.shift()
    }
    
    // Track bytes saved
    this.metrics.network.bytesSaved += Math.max(0, originalSize - compressedSize)
  }
  
  /**
   * Update decompression metrics
   */
  updateDecompressionMetrics(decompressionTime) {
    this.metrics.compression.decompressionTime.push(decompressionTime)
    if (this.metrics.compression.decompressionTime.length > 100) {
      this.metrics.compression.decompressionTime.shift()
    }
  }
  
  /**
   * Update batching metrics
   */
  updateBatchingMetrics(batchSize, batchTime) {
    this.metrics.batching.totalBatches++
    
    this.metrics.batching.batchSizes.push(batchSize)
    this.metrics.batching.batchTimes.push(batchTime)
    
    if (this.metrics.batching.batchSizes.length > 100) {
      this.metrics.batching.batchSizes.shift()
      this.metrics.batching.batchTimes.shift()
    }
    
    // Update averages
    this.metrics.batching.avgBatchSize = this.metrics.batching.batchSizes.reduce((a, b) => a + b, 0) / this.metrics.batching.batchSizes.length
    this.metrics.batching.avgBatchTime = this.metrics.batching.batchTimes.reduce((a, b) => a + b, 0) / this.metrics.batching.batchTimes.length
  }
  
  /**
   * Update frame processing metrics
   */
  updateFrameProcessingMetrics(frameTime) {
    this.metrics.frameProcessing.frameTimes.push(frameTime)
    
    if (this.metrics.frameProcessing.frameTimes.length > 100) {
      this.metrics.frameProcessing.frameTimes.shift()
    }
    
    this.metrics.frameProcessing.avgFrameTime = this.metrics.frameProcessing.frameTimes.reduce((a, b) => a + b, 0) / this.metrics.frameProcessing.frameTimes.length
  }
  
  /**
   * Update network quality
   */
  updateNetworkQuality(quality) {
    this.adaptiveSettings.networkQuality = quality
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const avgCompressionTime = this.metrics.compression.compressionTime.length > 0
      ? this.metrics.compression.compressionTime.reduce((a, b) => a + b, 0) / this.metrics.compression.compressionTime.length
      : 0
    
    const avgDecompressionTime = this.metrics.compression.decompressionTime.length > 0
      ? this.metrics.compression.decompressionTime.reduce((a, b) => a + b, 0) / this.metrics.compression.decompressionTime.length
      : 0
    
    const avgRollbackTime = this.metrics.frameProcessing.rollbackTime.length > 0
      ? this.metrics.frameProcessing.rollbackTime.reduce((a, b) => a + b, 0) / this.metrics.frameProcessing.rollbackTime.length
      : 0
    
    return {
      compression: {
        ...this.metrics.compression,
        avgCompressionTime,
        avgDecompressionTime,
        compressionEfficiency: this.metrics.compression.compressionRatio
      },
      
      batching: {
        ...this.metrics.batching,
        batchingEfficiency: this.metrics.batching.totalBatches > 0 
          ? this.metrics.batching.avgBatchSize / this.config.maxBatchSize 
          : 0
      },
      
      frameProcessing: {
        ...this.metrics.frameProcessing,
        avgRollbackTime,
        frameSkipRate: this.metrics.frameProcessing.totalFrames > 0
          ? this.metrics.frameProcessing.skippedFrames / this.metrics.frameProcessing.totalFrames
          : 0
      },
      
      memory: {
        ...this.metrics.memory,
        poolHitRate: (this.metrics.memory.statePoolHits + this.metrics.memory.statePoolMisses) > 0
          ? this.metrics.memory.statePoolHits / (this.metrics.memory.statePoolHits + this.metrics.memory.statePoolMisses)
          : 0
      },
      
      network: {
        ...this.metrics.network,
        bandwidthSaved: this.metrics.network.bytesSaved
      },
      
      adaptive: {
        ...this.adaptiveSettings
      }
    }
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      compression: {
        totalStates: 0,
        compressedStates: 0,
        originalBytes: 0,
        compressedBytes: 0,
        compressionRatio: 0,
        compressionTime: [],
        decompressionTime: []
      },
      
      batching: {
        totalBatches: 0,
        avgBatchSize: 0,
        avgBatchTime: 0,
        batchSizes: [],
        batchTimes: []
      },
      
      frameProcessing: {
        totalFrames: 0,
        skippedFrames: 0,
        avgFrameTime: 0,
        frameTimes: [],
        rollbacks: 0,
        rollbackTime: []
      },
      
      memory: {
        statePoolSize: 0,
        statePoolHits: 0,
        statePoolMisses: 0,
        memoryUsage: 0,
        gcCollections: 0
      },
      
      network: {
        bytesSaved: 0,
        latencyReduction: 0,
        qualityScore: 0
      }
    }
    
    this.logger.info('Performance metrics reset')
  }
  
  /**
   * Cleanup and shutdown
   */
  shutdown() {
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    // Clear pools and caches
    this.statePool.clear()
    this.compressionCache.clear()
    this.deltaStates.clear()
    this.batchQueue = []
    
    this.logger.info('Rollback performance optimizer shutdown')
  }
}

export default RollbackPerformanceOptimizer
