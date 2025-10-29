/**
 * MomentumSystem - Momentum-based animation adjustments
 */

export function createMomentumSystem(options = {}) {
    const {
        maxMomentum = 10,
        momentumDecay = 0.9,
        momentumInfluence = 0.3,
        directionSmoothing = 0.8
    } = options;

    return {
        momentum: { x: 0, y: 0 },
        smoothedDirection: { x: 0, y: 0 },
        lastVelocity: { x: 0, y: 0 },
        _buf: {
            momentum: { x: 0, y: 0 },
            smoothedDirection: { x: 0, y: 0 },
            leanAngle: 0,
            bounceFactor: 0,
            stretchFactor: 0
        },

        update(deltaTime, velocityX, velocityY, isGrounded = true) {
            // Calculate velocity change
            const deltaVx = velocityX - this.lastVelocity.x;
            const deltaVy = velocityY - this.lastVelocity.y;
            this.lastVelocity = { x: velocityX, y: velocityY };

            // Build momentum from acceleration
            const acceleration = Math.sqrt(deltaVx * deltaVx + deltaVy * deltaVy);
            if (acceleration > 0.1) {
                const momentumStrength = Math.min(acceleration * momentumInfluence, maxMomentum);
                const momentumDirX = deltaVx / acceleration;
                const momentumDirY = deltaVy / acceleration;

                this.momentum.x += momentumDirX * momentumStrength;
                this.momentum.y += momentumDirY * momentumStrength;
            }

            // Apply momentum decay
            this.momentum.x *= momentumDecay;
            this.momentum.y *= momentumDecay;

            // Clamp momentum
            const momentumMagnitude = Math.sqrt(this.momentum.x * this.momentum.x + this.momentum.y * this.momentum.y);
            if (momentumMagnitude > maxMomentum) {
                this.momentum.x = (this.momentum.x / momentumMagnitude) * maxMomentum;
                this.momentum.y = (this.momentum.y / momentumMagnitude) * maxMomentum;
            }

            // Smooth direction changes
            const currentDirection = { x: velocityX, y: velocityY };
            const directionMagnitude = Math.sqrt(currentDirection.x * currentDirection.x + currentDirection.y * currentDirection.y);

            if (directionMagnitude > 0.1) {
                const normalizedDir = {
                    x: currentDirection.x / directionMagnitude,
                    y: currentDirection.y / directionMagnitude
                };

                this.smoothedDirection.x = this.smoothedDirection.x * (1 - directionSmoothing) + normalizedDir.x * directionSmoothing;
                this.smoothedDirection.y = this.smoothedDirection.y * (1 - directionSmoothing) + normalizedDir.y * directionSmoothing;
            }

            const res = this._buf;
            res.momentum.x = this.momentum.x;
            res.momentum.y = this.momentum.y;
            res.smoothedDirection.x = this.smoothedDirection.x;
            res.smoothedDirection.y = this.smoothedDirection.y;
            res.leanAngle = isGrounded ? Math.atan2(this.momentum.x, Math.abs(this.momentum.y) + 1) * 0.3 : 0;
            res.bounceFactor = momentumMagnitude * 0.1;
            res.stretchFactor = Math.max(0, momentumMagnitude * 0.05);
            return res;
        },

        addImpulse(impulseX, impulseY) {
            this.momentum.x += impulseX;
            this.momentum.y += impulseY;
        }
    };
}
