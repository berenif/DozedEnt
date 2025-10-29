/**
 * Wobble - Jelly-like movement effect
 */

export function createWobble(frequency = 10, damping = 0.8, intensity = 0.1) {
    return {
        velocity: 0,
        displacement: 0,
        _buf: { scaleX: 1, scaleY: 1, rotation: 0 },
        update(deltaTime, force = 0) {
            // Spring physics
            const springForce = -frequency * this.displacement;
            const dampingForce = -damping * this.velocity;

            this.velocity += (springForce + dampingForce + force) * deltaTime;
            this.displacement += this.velocity * deltaTime;

            const res = this._buf;
            res.scaleX = 1 + this.displacement * intensity;
            res.scaleY = 1 - this.displacement * intensity * 0.5;
            res.rotation = this.displacement * 0.1;
            return res;
        },
        impulse(force) {
            this.velocity += force;
        }
    };
}
