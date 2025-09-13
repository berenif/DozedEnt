// Animation Event System
// Provides event callbacks and hooks for animation state changes and keyframes

export class AnimationEventSystem {
    constructor() {
        this.listeners = new Map()
        this.frameEvents = new Map()
        this.stateEvents = new Map()
        this.globalListeners = new Set()
        this.eventQueue = []
        this.processing = false
    }

    // Register event listener
    on(eventName, callback, context = null) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set())
        }
        
        this.listeners.get(eventName).add({
            callback,
            context,
            once: false
        })
        
        return () => this.off(eventName, callback)
    }

    // Register one-time event listener
    once(eventName, callback, context = null) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set())
        }
        
        this.listeners.get(eventName).add({
            callback,
            context,
            once: true
        })
        
        return () => this.off(eventName, callback)
    }

    // Remove event listener
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) {return}
        
        const listeners = this.listeners.get(eventName)
        for (const listener of listeners) {
            if (listener.callback === callback) {
                listeners.delete(listener)
                break
            }
        }
        
        if (listeners.size === 0) {
            this.listeners.delete(eventName)
        }
    }

    // Emit event
    emit(eventName, data = {}) {
        // Add to queue to prevent recursive event calls
        this.eventQueue.push({ eventName, data, timestamp: Date.now() })
        
        if (!this.processing) {
            this.processEventQueue()
        }
    }

    // Process queued events
    processEventQueue() {
        this.processing = true
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()
            this.processEvent(event.eventName, event.data)
        }
        
        this.processing = false
    }

    // Process single event
    processEvent(eventName, data) {
        // Notify specific listeners
        if (this.listeners.has(eventName)) {
            const listeners = Array.from(this.listeners.get(eventName))
            
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data)
                    } else {
                        listener.callback(data)
                    }
                    
                    if (listener.once) {
                        this.listeners.get(eventName).delete(listener)
                    }
                } catch (error) {
                    console.error(`Error in animation event listener for ${eventName}:`, error)
                }
            }
        }
        
        // Notify global listeners
        for (const listener of this.globalListeners) {
            try {
                listener(eventName, data)
            } catch (error) {
                console.error(`Error in global animation event listener:`, error)
            }
        }
    }

    // Register frame-specific event
    registerFrameEvent(animationName, frameIndex, eventData) {
        const key = `${animationName}_${frameIndex}`
        
        if (!this.frameEvents.has(key)) {
            this.frameEvents.set(key, [])
        }
        
        this.frameEvents.get(key).push(eventData)
    }

    // Trigger frame events
    triggerFrameEvents(animationName, frameIndex) {
        const key = `${animationName}_${frameIndex}`
        
        if (this.frameEvents.has(key)) {
            const events = this.frameEvents.get(key)
            
            for (const eventData of events) {
                this.emit(eventData.type || 'frame', {
                    animation: animationName,
                    frame: frameIndex,
                    ...eventData
                })
            }
        }
    }

    // Register state transition event
    registerStateEvent(fromState, toState, eventData) {
        const key = `${fromState}_to_${toState}`
        
        if (!this.stateEvents.has(key)) {
            this.stateEvents.set(key, [])
        }
        
        this.stateEvents.get(key).push(eventData)
    }

    // Trigger state transition events
    triggerStateEvents(fromState, toState) {
        const key = `${fromState}_to_${toState}`
        
        if (this.stateEvents.has(key)) {
            const events = this.stateEvents.get(key)
            
            for (const eventData of events) {
                this.emit(eventData.type || 'stateChange', {
                    fromState,
                    toState,
                    ...eventData
                })
            }
        }
        
        // Also trigger generic state change event
        this.emit('stateChange', { fromState, toState })
    }

    // Add global listener (receives all events)
    addGlobalListener(callback) {
        this.globalListeners.add(callback)
        return () => this.globalListeners.delete(callback)
    }

    // Clear all listeners
    clear() {
        this.listeners.clear()
        this.frameEvents.clear()
        this.stateEvents.clear()
        this.globalListeners.clear()
        this.eventQueue = []
    }
}

// Enhanced Animation class with event support
export class EventedAnimation {
    constructor(animation, eventSystem) {
        this.animation = animation
        this.eventSystem = eventSystem
        this.lastFrame = -1
        this.eventConfig = new Map()
    }

    // Add event at specific frame
    addFrameEvent(frameIndex, eventType, eventData = {}) {
        if (!this.eventConfig.has(frameIndex)) {
            this.eventConfig.set(frameIndex, [])
        }
        
        this.eventConfig.get(frameIndex).push({
            type: eventType,
            ...eventData
        })
        
        return this
    }

    // Add event at specific time (normalized 0-1)
    addTimeEvent(normalizedTime, eventType, eventData = {}) {
        const frameIndex = Math.floor(normalizedTime * (this.animation.frames.length - 1))
        return this.addFrameEvent(frameIndex, eventType, eventData)
    }

    // Update animation and trigger events
    update(deltaTime) {
        const previousFrame = this.animation.currentFrame
        this.animation.update(deltaTime)
        const currentFrame = this.animation.currentFrame
        
        // Check if frame changed
        if (currentFrame !== previousFrame) {
            this.triggerFrameEvents(currentFrame)
            
            // Check for frame range events (for frames we might have skipped)
            if (Math.abs(currentFrame - previousFrame) > 1) {
                const start = Math.min(previousFrame, currentFrame)
                const end = Math.max(previousFrame, currentFrame)
                
                for (let frame = start + 1; frame < end; frame++) {
                    this.triggerFrameEvents(frame)
                }
            }
        }
        
        // Check for animation completion
        if (this.animation.hasCompleted && !this.animation.loop) {
            this.eventSystem.emit('animationComplete', {
                animation: this.animation.name
            })
        }
    }

    triggerFrameEvents(frameIndex) {
        if (this.eventConfig.has(frameIndex)) {
            const events = this.eventConfig.get(frameIndex)
            
            for (const event of events) {
                this.eventSystem.emit(event.type, {
                    animation: this.animation.name,
                    frame: frameIndex,
                    ...event
                })
            }
        }
    }
}

// Animation Event Presets for common use cases
export class AnimationEventPresets {
    static createCombatEvents(eventSystem) {
        const events = {
            // Attack events
            attackWindup: () => eventSystem.emit('attack.windup'),
            attackActive: () => eventSystem.emit('attack.active'),
            attackRecovery: () => eventSystem.emit('attack.recovery'),
            attackHit: (target) => eventSystem.emit('attack.hit', { target }),
            attackMiss: () => eventSystem.emit('attack.miss'),
            
            // Combo events
            comboWindow: () => eventSystem.emit('combo.window'),
            comboSuccess: (comboCount) => eventSystem.emit('combo.success', { comboCount }),
            comboBreak: () => eventSystem.emit('combo.break'),
            
            // Defense events
            blockStart: () => eventSystem.emit('block.start'),
            blockHold: () => eventSystem.emit('block.hold'),
            blockRelease: () => eventSystem.emit('block.release'),
            blockImpact: (damage) => eventSystem.emit('block.impact', { damage }),
            
            // Parry events
            parryWindow: () => eventSystem.emit('parry.window'),
            parrySuccess: () => eventSystem.emit('parry.success'),
            parryFail: () => eventSystem.emit('parry.fail'),
            
            // Dodge events
            dodgeStart: () => eventSystem.emit('dodge.start'),
            dodgeIFrames: () => eventSystem.emit('dodge.iframes'),
            dodgeEnd: () => eventSystem.emit('dodge.end')
        }
        
        return events
    }

    static createMovementEvents(eventSystem) {
        const events = {
            // Basic movement
            moveStart: (direction) => eventSystem.emit('move.start', { direction }),
            moveStop: () => eventSystem.emit('move.stop'),
            turnAround: (newDirection) => eventSystem.emit('turn', { direction: newDirection }),
            
            // Jump events
            jumpStart: () => eventSystem.emit('jump.start'),
            jumpApex: () => eventSystem.emit('jump.apex'),
            jumpLand: (fallHeight) => eventSystem.emit('jump.land', { fallHeight }),
            doubleJump: () => eventSystem.emit('jump.double'),
            
            // Dash events
            dashStart: (direction) => eventSystem.emit('dash.start', { direction }),
            dashEnd: () => eventSystem.emit('dash.end'),
            
            // Wall events
            wallSlideStart: () => eventSystem.emit('wall.slide.start'),
            wallSlideEnd: () => eventSystem.emit('wall.slide.end'),
            wallJump: () => eventSystem.emit('wall.jump'),
            
            // Footsteps
            footstep: (foot) => eventSystem.emit('footstep', { foot })
        }
        
        return events
    }

    static createEffectEvents(eventSystem) {
        const events = {
            // Visual effects
            particleSpawn: (type, position) => eventSystem.emit('particle.spawn', { type, position }),
            trailStart: () => eventSystem.emit('trail.start'),
            trailEnd: () => eventSystem.emit('trail.end'),
            
            // Sound effects
            soundPlay: (soundName) => eventSystem.emit('sound.play', { sound: soundName }),
            soundStop: (soundName) => eventSystem.emit('sound.stop', { sound: soundName }),
            
            // Screen effects
            screenShake: (intensity) => eventSystem.emit('screen.shake', { intensity }),
            screenFlash: (color) => eventSystem.emit('screen.flash', { color }),
            slowMotion: (scale) => eventSystem.emit('time.scale', { scale })
        }
        
        return events
    }

    static attachToAnimation(animation, eventSystem, presetType = 'combat') {
        const eventedAnim = new EventedAnimation(animation, eventSystem)
        
        switch (presetType) {
            case 'combat':
                // Attack animation events
                if (animation.name.includes('attack')) {
                    eventedAnim.addTimeEvent(0.2, 'attack.windup')
                    eventedAnim.addTimeEvent(0.5, 'attack.active')
                    eventedAnim.addTimeEvent(0.8, 'attack.recovery')
                    eventedAnim.addTimeEvent(0.6, 'combo.window')
                }
                
                // Block animation events
                if (animation.name.includes('block')) {
                    eventedAnim.addTimeEvent(0, 'block.start')
                    eventedAnim.addTimeEvent(0.1, 'parry.window')
                }
                
                // Roll animation events
                if (animation.name.includes('roll')) {
                    eventedAnim.addTimeEvent(0, 'dodge.start')
                    eventedAnim.addTimeEvent(0.2, 'dodge.iframes')
                    eventedAnim.addTimeEvent(0.8, 'dodge.end')
                }
                break
                
            case 'movement':
                // Jump animation events
                if (animation.name.includes('jump')) {
                    eventedAnim.addTimeEvent(0, 'jump.start')
                    eventedAnim.addTimeEvent(0.5, 'jump.apex')
                }
                
                // Landing animation events
                if (animation.name.includes('land')) {
                    eventedAnim.addTimeEvent(0, 'jump.land')
                    eventedAnim.addTimeEvent(0.1, 'screen.shake')
                }
                
                // Run animation events
                if (animation.name.includes('run')) {
                    eventedAnim.addTimeEvent(0.25, 'footstep', { foot: 'left' })
                    eventedAnim.addTimeEvent(0.75, 'footstep', { foot: 'right' })
                }
                break
                
            case 'damage':
                // Hurt animation events
                if (animation.name.includes('hurt')) {
                    eventedAnim.addTimeEvent(0, 'damage.taken')
                    eventedAnim.addTimeEvent(0.1, 'screen.shake')
                    eventedAnim.addTimeEvent(0.2, 'particle.spawn', { type: 'blood' })
                }
                
                // Death animation events
                if (animation.name.includes('death') || animation.name.includes('dead')) {
                    eventedAnim.addTimeEvent(0, 'death.start')
                    eventedAnim.addTimeEvent(0.5, 'particle.spawn', { type: 'deathExplosion' })
                    eventedAnim.addTimeEvent(1.0, 'death.complete')
                }
                break
        }
        
        return eventedAnim
    }
}

// Global animation event bus for cross-system communication
export const globalAnimationEvents = new AnimationEventSystem()

export default AnimationEventSystem