import { CharacterAnimator } from '../system/animation-system.js'

export class WolfAnimator extends CharacterAnimator {
    constructor() {
        super()
        // Initialize wolf-specific animation states or overrides here
        // For example, if wolf has different blend factors or default states
        this.blendSpeed = 0.15 // Wolf animations might blend differently
        this._animationTimeouts = new Set() // Track timeouts for cleanup
        this.wasmManager = null
    }

    /**
     * Set the WASM manager for accessing wolf animation data
     * @param {WasmManager} wasmManager - The WASM manager instance
     */
    setWasmManager(wasmManager) {
        this.wasmManager = wasmManager;
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

        // Integrate WASM data for wolf-specific procedural animations
        // Get wolf animation data from WASM if available
        if (this.wasmManager && this.wasmManager.exports) {
            try {
                const wolfCount = this.wasmManager.exports.get_enemy_count();
                if (wolfCount > 0) {
                    // Use first wolf's data for animation adjustments
                    const wolfState = this.wasmManager.exports.get_enemy_state ? this.wasmManager.exports.get_enemy_state(0) : 0;
                    const animationTime = this.wasmManager.exports.get_time_seconds ? this.wasmManager.exports.get_time_seconds() : 0;
                    
                    // Apply procedural spine bend based on movement
                    const spineBend = Math.sin(animationTime * 0.01) * 0.1;
                    transform.rotation += spineBend;
                    
                    // Apply leg lift during running state
                    if (wolfState === 2) { // Running state
                        const legLift = Math.abs(Math.sin(animationTime * 0.02)) * 2;
                        transform.offsetY += legLift;
                    }
                }
            } catch (error) {
                // Silently ignore WASM errors and continue with base animation
            }
        }

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
