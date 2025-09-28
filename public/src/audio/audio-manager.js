/**
 * Unified Audio Manager - wraps EnhancedAudioManager for main app compatibility
 */
import { EnhancedAudioManager } from './enhanced-audio-manager.js'

export class AudioManager {
  constructor(gameStateManager = null) {
    this._enhanced = new EnhancedAudioManager(gameStateManager)
    // Back-compat UI visual tracking used by site.js
    this._visuals = new Map()
  }

  // Preserve existing API used in site.js
  setupEventListeners() {
    // Enhanced manager initializes itself; still install minimal user interaction resume
    this.resumeAudioContext?.()
    document.addEventListener('click', () => this.resumeAudioContext?.())
    document.addEventListener('keydown', () => this.resumeAudioContext?.())
    document.addEventListener('touchstart', () => this.resumeAudioContext?.())
  }

  // Called in game loop by site.js
  updateVocalizationVisuals() {
    // No-op visual shim retained for compatibility
  }

  // Adapter methods mapping to enhanced system
  resumeAudioContext() { return this._enhanced.resumeAudioContext?.() }
  setVolume(category, volume) { return this._enhanced.setVolume(category, volume) }
  setCategoryVolume(category, volume) { return this._enhanced.setCategoryVolume(category, volume) }
  setMasterVolume(volume) { return this._enhanced.setMasterVolume(volume) }
  setMuted(muted) { return this._enhanced.setMuted(muted) }
  set3DAudioEnabled(enabled) { return this._enhanced.set3DAudioEnabled(enabled) }
  getVolume(category) { return this._enhanced.getVolume(category) }
  playSound(key, options) { return this._enhanced.playSound(key, options) }
  playSpatialSound(key, x, y, z = 0, options = {}) { return this._enhanced.playSpatialSound(key, x, y, z, options) }
  setListenerPosition(x, y, z = 0) { return this._enhanced.setListenerPosition(x, y, z); }
  updateSpatialSource(sourceId, options) { return this._enhanced.updateSpatialSource(sourceId, options) }
  handlePhaseTransition(data) { return this._enhanced.handlePhaseTransition(data) }
  updateWeatherAudio(data) { return this._enhanced.updateWeatherAudio(data) }
  getPerformanceInfo() { return this._enhanced.getPerformanceInfo() }
  getAudioInfo() { return this._enhanced.getAudioInfo() }
  getSpatialAudioInfo() { return this._enhanced.getSpatialAudioInfo() }
  destroy() { return this._enhanced.destroy() }
}
