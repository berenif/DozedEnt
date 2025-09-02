// Advanced Sound System with Spatial Audio and Dynamic Mixing
// Provides immersive audio feedback for all game actions

export class SoundSystem {
    constructor() {
        this.audioContext = null
        this.masterGain = null
        this.sounds = new Map()
        this.playingSounds = new Set()
        this.musicTracks = new Map()
        this.currentMusic = null
        this.listenerPosition = { x: 640, y: 360 } // Center of screen by default
        
        // Audio buses for mixing
        this.buses = {
            master: null,
            sfx: null,
            music: null,
            ambient: null,
            ui: null
        }
        
        // Dynamic range compression for better mixing
        this.compressor = null
        
        // Reverb for environmental effects
        this.reverb = null
        this.reverbWet = null
        this.reverbDry = null
        
        // Low-pass filter for underwater/muffled effects
        this.lowPassFilter = null
        
        // Initialize on first user interaction
        this.initialized = false
        this.initPromise = null
        
        // Sound library definitions
        this.soundLibrary = {
            // Combat sounds
            'sword_swing': { 
                variations: 3, 
                volume: 0.7, 
                pitch: { min: 0.9, max: 1.1 },
                bus: 'sfx'
            },
            'sword_hit': { 
                variations: 4, 
                volume: 0.8, 
                pitch: { min: 0.8, max: 1.2 },
                bus: 'sfx'
            },
            'sword_block': { 
                variations: 3, 
                volume: 0.6, 
                pitch: { min: 0.95, max: 1.05 },
                bus: 'sfx'
            },
            'perfect_parry': { 
                variations: 1, 
                volume: 1.0, 
                pitch: { min: 1.0, max: 1.0 },
                bus: 'sfx'
            },
            'critical_hit': { 
                variations: 2, 
                volume: 1.0, 
                pitch: { min: 0.95, max: 1.05 },
                bus: 'sfx'
            },
            
            // Movement sounds
            'footstep': { 
                variations: 6, 
                volume: 0.3, 
                pitch: { min: 0.9, max: 1.1 },
                bus: 'sfx'
            },
            'roll': { 
                variations: 2, 
                volume: 0.5, 
                pitch: { min: 0.95, max: 1.05 },
                bus: 'sfx'
            },
            'dash': { 
                variations: 2, 
                volume: 0.4, 
                pitch: { min: 0.9, max: 1.1 },
                bus: 'sfx'
            },
            'land': { 
                variations: 3, 
                volume: 0.4, 
                pitch: { min: 0.8, max: 1.0 },
                bus: 'sfx'
            },
            
            // Enemy sounds
            'wolf_growl': { 
                variations: 3, 
                volume: 0.6, 
                pitch: { min: 0.8, max: 1.2 },
                bus: 'sfx'
            },
            'wolf_attack': { 
                variations: 2, 
                volume: 0.7, 
                pitch: { min: 0.9, max: 1.1 },
                bus: 'sfx'
            },
            'wolf_hurt': { 
                variations: 3, 
                volume: 0.5, 
                pitch: { min: 0.9, max: 1.2 },
                bus: 'sfx'
            },
            'wolf_death': { 
                variations: 2, 
                volume: 0.6, 
                pitch: { min: 0.95, max: 1.05 },
                bus: 'sfx'
            },
            
            // UI sounds
            'menu_select': { 
                variations: 1, 
                volume: 0.4, 
                pitch: { min: 1.0, max: 1.0 },
                bus: 'ui'
            },
            'menu_hover': { 
                variations: 1, 
                volume: 0.2, 
                pitch: { min: 1.0, max: 1.0 },
                bus: 'ui'
            },
            'menu_back': { 
                variations: 1, 
                volume: 0.3, 
                pitch: { min: 1.0, max: 1.0 },
                bus: 'ui'
            },
            'level_up': { 
                variations: 1, 
                volume: 0.8, 
                pitch: { min: 1.0, max: 1.0 },
                bus: 'ui'
            },
            'item_pickup': { 
                variations: 2, 
                volume: 0.5, 
                pitch: { min: 0.95, max: 1.05 },
                bus: 'ui'
            },
            
            // Ambient sounds
            'wind': { 
                variations: 1, 
                volume: 0.2, 
                loop: true,
                bus: 'ambient'
            },
            'fire_crackle': { 
                variations: 1, 
                volume: 0.3, 
                loop: true,
                bus: 'ambient'
            },
            'water_flow': { 
                variations: 1, 
                volume: 0.25, 
                loop: true,
                bus: 'ambient'
            }
        }
    }

    initialize() {
        if (this.initialized) {return}
        if (this.initPromise) {return this.initPromise}
        
        this.initPromise = this._doInitialize()
        return this.initPromise
    }

    async _doInitialize() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext
            this.audioContext = new AudioContext()
            
            // Create master gain
            this.masterGain = this.audioContext.createGain()
            this.masterGain.gain.value = 0.8
            
            // Create audio buses
            this.buses.master = this.masterGain
            this.buses.sfx = this.audioContext.createGain()
            this.buses.music = this.audioContext.createGain()
            this.buses.ambient = this.audioContext.createGain()
            this.buses.ui = this.audioContext.createGain()
            
            // Set default bus volumes
            this.buses.sfx.gain.value = 1.0
            this.buses.music.gain.value = 0.7
            this.buses.ambient.gain.value = 0.5
            this.buses.ui.gain.value = 0.8
            
            // Connect buses to master
            this.buses.sfx.connect(this.masterGain)
            this.buses.music.connect(this.masterGain)
            this.buses.ambient.connect(this.masterGain)
            this.buses.ui.connect(this.masterGain)
            
            // Create compressor
            this.compressor = this.audioContext.createDynamicsCompressor()
            this.compressor.threshold.value = -24
            this.compressor.knee.value = 30
            this.compressor.ratio.value = 12
            this.compressor.attack.value = 0.003
            this.compressor.release.value = 0.25
            
            // Connect master through compressor to destination
            this.masterGain.connect(this.compressor)
            this.compressor.connect(this.audioContext.destination)
            
            // Create reverb (using ConvolverNode with generated impulse)
            await this.createReverb()
            
            // Create low-pass filter
            this.lowPassFilter = this.audioContext.createBiquadFilter()
            this.lowPassFilter.type = 'lowpass'
            this.lowPassFilter.frequency.value = 20000 // Full range by default
            this.lowPassFilter.Q.value = 1
            
            // Generate procedural sounds since we can't load files
            await this.generateProceduralSounds()
            
            this.initialized = true
            console.log('Sound system initialized')
            
        } catch (error) {
            console.error('Failed to initialize sound system:', error)
        }
    }

    createReverb() {
        const length = this.audioContext.sampleRate * 2 // 2 second reverb
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate)
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel)
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * (1 - i / length)**2
            }
        }
        
        this.reverb = this.audioContext.createConvolver()
        this.reverb.buffer = impulse
        
        // Create wet/dry mix
        this.reverbWet = this.audioContext.createGain()
        this.reverbDry = this.audioContext.createGain()
        this.reverbWet.gain.value = 0.2
        this.reverbDry.gain.value = 0.8
        
        // Connect reverb path
        this.buses.sfx.connect(this.reverb)
        this.reverb.connect(this.reverbWet)
        this.reverbWet.connect(this.masterGain)
        this.buses.sfx.connect(this.reverbDry)
        this.reverbDry.connect(this.masterGain)
    }

    generateProceduralSounds() {
        // Generate basic waveform sounds for different effects
        
        // Sword swing - whoosh sound
        for (let i = 1; i <= 3; i++) {
            const buffer = this.createNoiseBuffer(0.2, 'brown')
            this.applyEnvelope(buffer, 0.01, 0.05, 0.3, 0.1)
            this.sounds.set(`sword_swing_${i}`, buffer)
        }
        
        // Sword hit - impact sound
        for (let i = 1; i <= 4; i++) {
            const buffer = this.createImpactSound(0.15 + Math.random() * 0.1)
            this.sounds.set(`sword_hit_${i}`, buffer)
        }
        
        // Footsteps - soft thuds
        for (let i = 1; i <= 6; i++) {
            const buffer = this.createFootstepSound()
            this.sounds.set(`footstep_${i}`, buffer)
        }
        
        // Perfect parry - resonant ring
        const parryBuffer = this.createResonantSound(0.8, 440, [880, 1320, 1760])
        this.sounds.set('perfect_parry_1', parryBuffer)
        
        // UI sounds
        this.sounds.set('menu_select_1', this.createUIClickSound(0.1, 800))
        this.sounds.set('menu_hover_1', this.createUIClickSound(0.05, 1200))
        this.sounds.set('menu_back_1', this.createUIClickSound(0.1, 400))
        
        // Level up fanfare
        this.sounds.set('level_up_1', this.createFanfareSound())
    }

    createNoiseBuffer(duration, type = 'white') {
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate)
        const data = buffer.getChannelData(0)
        
        if (type === 'white') {
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1
            }
        } else if (type === 'brown') {
            let lastOut = 0
            for (let i = 0; i < length; i++) {
                const white = Math.random() * 2 - 1
                data[i] = (lastOut + (0.02 * white)) / 1.02
                lastOut = data[i]
                data[i] *= 3.5 // Compensate for volume loss
            }
        }
        
        return buffer
    }

    createImpactSound(duration) {
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate)
        const data = buffer.getChannelData(0)
        
        // Mix of low frequency sine and noise
        for (let i = 0; i < length; i++) {
            const t = i / this.audioContext.sampleRate
            const envelope = Math.exp(-t * 10)
            const sine = Math.sin(2 * Math.PI * 60 * t) * 0.5
            const noise = (Math.random() * 2 - 1) * 0.5
            data[i] = (sine + noise) * envelope
        }
        
        return buffer
    }

    createFootstepSound() {
        const duration = 0.1
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate)
        const data = buffer.getChannelData(0)
        
        // Low thud with some high-frequency content
        for (let i = 0; i < length; i++) {
            const t = i / this.audioContext.sampleRate
            const envelope = Math.exp(-t * 20)
            const lowFreq = Math.sin(2 * Math.PI * 80 * t) * 0.6
            const midFreq = Math.sin(2 * Math.PI * 200 * t) * 0.3
            const noise = (Math.random() * 2 - 1) * 0.1
            data[i] = (lowFreq + midFreq + noise) * envelope
        }
        
        return buffer
    }

    createResonantSound(duration, fundamental, harmonics) {
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate)
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel)
            for (let i = 0; i < length; i++) {
                const t = i / this.audioContext.sampleRate
                const envelope = Math.exp(-t * 0.5) * Math.sin(Math.PI * t / duration)
                
                let sample = Math.sin(2 * Math.PI * fundamental * t) * 0.5
                harmonics.forEach((freq, index) => {
                    sample += Math.sin(2 * Math.PI * freq * t) * (0.3 / (index + 2))
                })
                
                data[i] = sample * envelope
            }
        }
        
        return buffer
    }

    createUIClickSound(duration, frequency) {
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate)
        const data = buffer.getChannelData(0)
        
        for (let i = 0; i < length; i++) {
            const t = i / this.audioContext.sampleRate
            const envelope = Math.exp(-t * 30)
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope
        }
        
        return buffer
    }

    createFanfareSound() {
        const duration = 1.0
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate)
        
        // Major chord arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25] // C, E, G, C
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel)
            for (let i = 0; i < length; i++) {
                const t = i / this.audioContext.sampleRate
                let sample = 0
                
                notes.forEach((freq, index) => {
                    const noteStart = index * 0.15
                    if (t >= noteStart) {
                        const noteT = t - noteStart
                        const noteEnv = Math.exp(-noteT * 2) * 0.5
                        sample += Math.sin(2 * Math.PI * freq * t) * noteEnv
                    }
                })
                
                data[i] = sample
            }
        }
        
        return buffer
    }

    applyEnvelope(buffer, attack, decay, sustain, release) {
        const data = buffer.getChannelData(0)
        const sampleRate = buffer.sampleRate
        const length = buffer.length
        
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate
            let envelope
            
            if (t < attack) {
                envelope = t / attack
            } else if (t < attack + decay) {
                const decayT = (t - attack) / decay
                envelope = 1 - decayT * (1 - sustain)
            } else if (t < buffer.duration - release) {
                envelope = sustain
            } else {
                const releaseT = (t - (buffer.duration - release)) / release
                envelope = sustain * (1 - releaseT)
            }
            
            data[i] *= envelope
        }
    }

    play(soundName, options = {}) {
        if (!this.initialized) {
            this.initialize()
            return null
        }
        
        const soundDef = this.soundLibrary[soundName]
        if (!soundDef) {
            console.warn(`Sound not found: ${soundName}`)
            return null
        }
        
        // Select variation
        const variation = soundDef.variations > 1 ? 
            Math.floor(Math.random() * soundDef.variations) + 1 : 1
        const bufferKey = `${soundName}_${variation}`
        const buffer = this.sounds.get(bufferKey)
        
        if (!buffer) {
            console.warn(`Sound buffer not found: ${bufferKey}`)
            return null
        }
        
        // Create source
        const source = this.audioContext.createBufferSource()
        source.buffer = buffer
        
        // Create gain node for this instance
        const gainNode = this.audioContext.createGain()
        const volume = (options.volume || 1.0) * soundDef.volume
        gainNode.gain.value = volume
        
        // Apply pitch variation
        const pitchRange = soundDef.pitch || { min: 1, max: 1 }
        source.playbackRate.value = pitchRange.min + Math.random() * (pitchRange.max - pitchRange.min)
        
        // Apply spatial audio if position provided
        if (options.position) {
            const panner = this.createPanner(options.position)
            source.connect(panner)
            panner.connect(gainNode)
        } else {
            source.connect(gainNode)
        }
        
        // Connect to appropriate bus
        const bus = this.buses[soundDef.bus || 'sfx']
        gainNode.connect(bus)
        
        // Handle loop
        if (soundDef.loop || options.loop) {
            source.loop = true
        }
        
        // Start playback
        source.start(0)
        
        // Track playing sound
        const playingSound = {
            source,
            gainNode,
            startTime: this.audioContext.currentTime,
            soundName
        }
        this.playingSounds.add(playingSound)
        
        // Clean up when finished
        source.onended = () => {
            this.playingSounds.delete(playingSound)
        }
        
        return playingSound
    }

    createPanner(position) {
        const panner = this.audioContext.createPanner()
        panner.panningModel = 'HRTF'
        panner.distanceModel = 'inverse'
        panner.refDistance = 100
        panner.maxDistance = 1000
        panner.rolloffFactor = 1
        panner.coneInnerAngle = 360
        panner.coneOuterAngle = 0
        panner.coneOuterGain = 0
        
        // Convert 2D position to 3D
        const x = (position.x - this.listenerPosition.x) / 100
        const y = (position.y - this.listenerPosition.y) / 100
        panner.setPosition(x, y, 0)
        
        return panner
    }

    stop(playingSound, fadeOut = 0) {
        if (!playingSound) {return}
        
        if (fadeOut > 0) {
            playingSound.gainNode.gain.linearRampToValueAtTime(
                0, 
                this.audioContext.currentTime + fadeOut
            )
            setTimeout(() => {
                playingSound.source.stop()
                this.playingSounds.delete(playingSound)
            }, fadeOut * 1000)
        } else {
            playingSound.source.stop()
            this.playingSounds.delete(playingSound)
        }
    }

    stopAll(fadeOut = 0) {
        this.playingSounds.forEach(sound => this.stop(sound, fadeOut))
    }

    setListenerPosition(x, y) {
        this.listenerPosition.x = x
        this.listenerPosition.y = y
        
        if (this.audioContext && this.audioContext.listener) {
            this.audioContext.listener.setPosition(0, 0, 0)
        }
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
        }
    }

    setBusVolume(busName, volume) {
        if (this.buses[busName]) {
            this.buses[busName].gain.value = Math.max(0, Math.min(1, volume))
        }
    }

    setReverbMix(wetness) {
        if (this.reverbWet && this.reverbDry) {
            this.reverbWet.gain.value = wetness
            this.reverbDry.gain.value = 1 - wetness
        }
    }

    setLowPassFilter(frequency) {
        if (this.lowPassFilter) {
            this.lowPassFilter.frequency.value = frequency
        }
    }

    // Preset sound triggers for game events
    playFootstep(position) {
        this.play('footstep', { position, volume: 0.3 + Math.random() * 0.2 })
    }

    playSwordSwing(position) {
        this.play('sword_swing', { position })
    }

    playSwordHit(position, critical = false) {
        if (critical) {
            this.play('critical_hit', { position, volume: 1.2 })
        } else {
            this.play('sword_hit', { position })
        }
    }

    playBlock(position, perfect = false) {
        if (perfect) {
            this.play('perfect_parry', { position, volume: 1.3 })
        } else {
            this.play('sword_block', { position })
        }
    }

    playRoll(position) {
        this.play('roll', { position })
    }

    playEnemySound(type, action, position) {
        const soundName = `${type}_${action}`
        if (this.soundLibrary[soundName]) {
            this.play(soundName, { position })
        }
    }

    playUISound(action) {
        const soundName = `menu_${action}`
        if (this.soundLibrary[soundName]) {
            this.play(soundName)
        }
    }

    playLevelUp() {
        this.play('level_up', { volume: 1.2 })
    }

    playItemPickup(position) {
        this.play('item_pickup', { position })
    }

    // Environmental audio
    startAmbience(type) {
        if (this.currentAmbience) {
            this.stop(this.currentAmbience, 1)
        }
        
        this.currentAmbience = this.play(type, { loop: true })
    }

    stopAmbience(fadeOut = 1) {
        if (this.currentAmbience) {
            this.stop(this.currentAmbience, fadeOut)
            this.currentAmbience = null
        }
    }

    // Music playback (would need actual music files in production)
    playMusic(trackName) {
        // Placeholder for music playback
        console.log(`Playing music: ${trackName}`)
    }

    stopMusic(fadeOut = 2) {
        if (this.currentMusic) {
            this.stop(this.currentMusic, fadeOut)
            this.currentMusic = null
        }
    }

    // Apply environmental effects
    setEnvironment(type) {
        switch(type) {
            case 'cave':
                this.setReverbMix(0.6)
                this.setLowPassFilter(8000)
                break
            case 'underwater':
                this.setReverbMix(0.8)
                this.setLowPassFilter(2000)
                break
            case 'outdoor':
                this.setReverbMix(0.2)
                this.setLowPassFilter(20000)
                break
            case 'indoor':
                this.setReverbMix(0.4)
                this.setLowPassFilter(15000)
                break
            default:
                this.setReverbMix(0.2)
                this.setLowPassFilter(20000)
        }
    }
}

// Singleton instance
let soundSystemInstance = null

export function getSoundSystem() {
    if (!soundSystemInstance) {
        soundSystemInstance = new SoundSystem()
    }
    return soundSystemInstance
}

export default SoundSystem