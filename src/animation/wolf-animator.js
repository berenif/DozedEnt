import { CharacterAnimator } from './animation-system.js'

export class WolfAnimator extends CharacterAnimator {
    constructor() {
        super()
        // Initialize wolf-specific animation states or overrides here
        // For example, if wolf has different blend factors or default states
        this.blendSpeed = 0.15 // Wolf animations might blend differently
        this._animationTimeouts = new Set() // Track timeouts for cleanup
    }

    // Override or add wolf-specific state setting logic
    setState(newState) {
        // You can add wolf-specific logic here before calling super.setState
        super.setState(newState)
    }

    // Override or extend the update method to handle wolf-specific procedural animations
    update(deltaTime, position, velocity = { x: 0, y: 0 }, isGrounded = true) {
        // Call the parent update to get base character transformations
        const transform = super.update(deltaTime, position, velocity, isGrounded)

        // TODO: Integrate WASM data here for wolf-specific procedural animations
        // For example:
        // const wasmWolfAnimationData = getWolfAnimationDataFromWASM()
        // transform.rotation += wasmWolfAnimationData.spineBend
        // transform.offsetY += wasmWolfAnimationData.legLift

        return transform
    }

    // Add any wolf-specific animation triggers or methods
    triggerHowl() {
        this.setState('howl')
        const timeoutId = setTimeout(() => {
            this._animationTimeouts.delete(timeoutId)
            if (this.state === 'howl') {
                this.setState('idle') // Or a more appropriate resting state
            }
        }, 1400) // Adjust duration based on howl animation
        this._animationTimeouts.add(timeoutId)
    }

    triggerLunge() {
        this.setState('lunge')
        const timeoutId = setTimeout(() => {
            this._animationTimeouts.delete(timeoutId)
            if (this.state === 'lunge') {
                this.setState('idle')
            }
        }, 200) // Adjust duration
        this._animationTimeouts.add(timeoutId)
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Clear all pending timeouts
        for (const timeoutId of this._animationTimeouts) {
            clearTimeout(timeoutId)
        }
        this._animationTimeouts.clear()
        
        // Call parent cleanup if it exists
        if (super.destroy) {
            super.destroy()
        }
    }

    triggerProwl(isProwling) {
        if (isProwling) {
            this.setState('prowl')
        } else if (this.state === 'prowl') {
            this.setState('idle')
        }
    }
}
