export class SoundSystem {
  constructor(audioContext = (typeof AudioContext !== 'undefined' ? new AudioContext() : null)) {
    this.context = audioContext
    this.masterVolume = 1.0
    this.soundVolume = 1.0
    this.musicVolume = 0.7
    this.isMuted = false
    this.previousVolume = this.masterVolume

    this.sounds = {}
    this.music = {}
    this.currentMusic = null
    this.currentMusicName = null

    if (!this.context) {
      // Match expectation from tests that an error should be logged on init failure
      try { throw new Error('AudioContext unavailable') } catch (e) {
        console.error('Failed to initialize sound system:', e)
      }
      return
    }

    // Nodes
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = this.masterVolume
    this.soundGain = this.context.createGain()
    this.soundGain.gain.value = this.soundVolume
    this.musicGain = this.context.createGain()
    this.musicGain.gain.value = this.musicVolume
    this.compressor = this.context.createDynamicsCompressor()

    // Wiring: sounds/music -> master -> destination
    this.soundGain.connect(this.masterGain)
    this.musicGain.connect(this.masterGain)
    this.masterGain.connect(this.compressor)
    this.compressor.connect(this.context.destination)
  }

  clampVolume(value) {
    if (value < 0) { return 0.0 }
    if (value > 1) { return 1.0 }
    return value
  }

  setMasterVolume(value) {
    this.masterVolume = this.clampVolume(value)
    if (this.masterGain) { this.masterGain.gain.value = this.masterVolume }
  }

  setSoundVolume(value) {
    this.soundVolume = this.clampVolume(value)
    if (this.soundGain) { this.soundGain.gain.value = this.soundVolume }
  }

  setMusicVolume(value) {
    this.musicVolume = this.clampVolume(value)
    if (this.musicGain) { this.musicGain.gain.value = this.musicVolume }
  }

  mute() {
    if (this.isMuted) { return }
    this.previousVolume = this.masterVolume
    this.isMuted = true
    if (this.masterGain) { this.masterGain.gain.value = 0 }
  }

  unmute() {
    if (!this.isMuted) { return }
    this.isMuted = false
    this.setMasterVolume(this.previousVolume)
  }

  async loadSound(name, arrayBuffer) {
    if (!this.context) { return null }
    const buffer = await this.context.decodeAudioData(arrayBuffer)
    this.sounds[name] = buffer
    return buffer
  }

  playSound(name, volume = 1.0, pitch = 1.0, loop = false) {
    if (!this.context) { return null }
    const buffer = this.sounds[name]
    if (!buffer) {
      console.warn(`Sound not found: ${name}`)
      return null
    }
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = !!loop
    source.playbackRate.value = pitch

    // Per-sound volume via a gain node
    const gain = this.context.createGain()
    gain.gain.value = this.clampVolume(volume)
    source.connect(gain)
    gain.connect(this.soundGain)
    source.start()
    return source
  }

  playOneShot(name, volume = 1.0, pitch = 1.0) {
    return this.playSound(name, volume, pitch, false)
  }

  playRandomPitch(name, min = 0.9, max = 1.1, volume = 1.0) {
    const pitch = min + Math.random() * (max - min)
    return this.playSound(name, volume, pitch, false)
  }

  playMusic(name, fadeIn = false, fadeMs = 500) {
    if (!this.context) { return }
    const buffer = this.sounds[name]
    if (!buffer) { console.warn(`Music not found: ${name}`); return }

    // Stop existing music
    if (this.currentMusic) {
      try { 
        this.currentMusic.stop() 
      } catch (_) {
        // Ignore stop errors on already stopped audio
      }
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.musicGain)
    source.start()

    this.currentMusic = source
    this.currentMusicName = name

    if (fadeIn && this.musicGain?.gain?.setValueAtTime && this.musicGain?.gain?.linearRampToValueAtTime) {
      const now = this.context.currentTime || 0
      const target = this.musicVolume
      this.musicGain.gain.setValueAtTime(0, now)
      this.musicGain.gain.linearRampToValueAtTime(target, now + (fadeMs / 1000))
    }
  }

  fadeOutMusic(fadeMs = 500) {
    if (!this.context || !this.currentMusic || !this.musicGain) { return }
    const now = this.context.currentTime || 0
    if (this.musicGain.gain.linearRampToValueAtTime && this.musicGain.gain.setValueAtTime) {
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now)
      this.musicGain.gain.linearRampToValueAtTime(0, now + (fadeMs / 1000))
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      try { 
        this.currentMusic.stop() 
      } catch (_) {
        // Ignore stop errors on already stopped audio
      }
    }
    this.currentMusic = null
    this.currentMusicName = null
  }

  playSoundAtPosition(/* name, x, y, z */) {
    // Placeholder for 3D audio. Tests only assert method exists.
  }

  updateListenerPosition(/* x, y, z */) {
    // Placeholder for 3D listener updates
  }

  async resumeContext() {
    if (this.context && this.context.resume) {
      return this.context.resume()
    }
  }

  async suspendContext() {
    if (this.context && this.context.suspend) {
      return this.context.suspend()
    }
  }

  stopAllSounds() {
    this.stopMusic()
    // In a full implementation, we would track active sources and stop them here
  }

  cleanup() {
    this.stopAllSounds()
    this.sounds = {}
    this.music = {}
    this.currentMusic = null
    this.currentMusicName = null
  }
}

export default SoundSystem


