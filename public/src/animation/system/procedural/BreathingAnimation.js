/**
 * BreathingAnimation - Creates realistic breathing animation with state modulation
 */

export function createBreathingAnimation(options = {}) {
    const {
        baseScale = 1.0,
        intensity = 0.015,
        speed = 2.0,
        asymmetry = 0.2
    } = options;

    return {
        time: 0,
        phase: 0,
        breathRate: speed,
        currentIntensity: intensity,
        depthMod: 1.0,
        asymmetryOffset: 0,
        _buf: {
            scaleX: baseScale,
            scaleY: baseScale,
            offsetY: 0,
            chestExpansion: 0,
            phase: 0,
            intensity: 0
        },

        // State-based modulation
        modulateForState(state) {
            switch(state) {
                case 'running':
                    this.depthMod = 0.3;
                    this.breathRate = speed * 3.0;
                    break;
                case 'attacking':
                    this.depthMod = 0.5;
                    this.breathRate = speed * 1.8;
                    break;
                case 'blocking':
                    this.depthMod = 0.2;
                    this.breathRate = speed * 1.3;
                    break;
                case 'hurt':
                    this.depthMod = 0.1;
                    this.breathRate = speed * 0.5;
                    break;
                case 'dead':
                    this.depthMod = 0.0;
                    this.breathRate = 0.0;
                    break;
                default: // idle, rolling
                    this.depthMod = 1.0;
                    this.breathRate = speed;
            }
        },

        update(deltaTime) {
            const res = this._buf;

            if (this.breathRate <= 0) {
                res.scaleX = baseScale;
                res.scaleY = baseScale;
                res.offsetY = 0;
                res.chestExpansion = 0;
                res.phase = 0;
                res.intensity = 0;
                return res;
            }

            this.time += deltaTime * this.breathRate;
            this.phase = Math.sin(this.time);

            // Calculate breathing with realistic parameters
            const currentIntensity = this.currentIntensity * this.depthMod;
            const breathScaleX = baseScale + this.phase * currentIntensity;
            const breathScaleY = baseScale + this.phase * currentIntensity * 0.7;

            // Add slight asymmetry for more natural feel
            const asymmetryFactor = Math.sin(this.time * 0.7) * asymmetry;
            const finalScaleX = breathScaleX + asymmetryFactor * currentIntensity * 0.3;

            // Chest expansion effect (subtle upward movement)
            const chestExpansion = this.phase * currentIntensity * 2;

            // Smooth transitions
            const smoothFactor = 1 - Math.exp(-deltaTime * 5);
            this.currentIntensity = this.currentIntensity + (currentIntensity - this.currentIntensity) * smoothFactor;

            res.scaleX = finalScaleX;
            res.scaleY = breathScaleY;
            res.offsetY = -chestExpansion * 0.5;
            res.chestExpansion = chestExpansion;
            res.phase = this.phase;
            res.intensity = currentIntensity;
            return res;
        }
    };
}
