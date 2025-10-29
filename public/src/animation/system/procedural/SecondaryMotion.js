/**
 * SecondaryMotion - Chain physics for cloth, hair, equipment
 */

export function createSecondaryMotion(options = {}) {
    const {
        segments = 5,
        length = 15,
        damping = 0.85,
        gravity = 0.5,
        windStrength = 0.1
    } = options;

    return {
        segments: [],
        anchorPoint: { x: 0, y: 0 },
        windTime: 0,
        _segBuf: [],

        initialize(anchorX, anchorY) {
            this.anchorPoint = { x: anchorX, y: anchorY };
            this.segments = [];

            // Create chain segments
            for (let i = 0; i < segments; i++) {
                this.segments.push({
                    x: anchorX,
                    y: anchorY + i * (length / segments),
                    vx: 0,
                    vy: 0,
                    prevX: anchorX,
                    prevY: anchorY + i * (length / segments)
                });
            }
        },

        update(deltaTime, anchorX, anchorY, windDirection = 0) {
            this.anchorPoint.x = anchorX;
            this.anchorPoint.y = anchorY;
            this.windTime += deltaTime;

            // Update anchor point
            this.segments[0].x = anchorX;
            this.segments[0].y = anchorY;

            // Simulate chain physics
            for (let i = 1; i < this.segments.length; i++) {
                const segment = this.segments[i];
                const prevSegment = this.segments[i - 1];

                // Calculate desired position (maintain distance from previous segment)
                const dx = segment.x - prevSegment.x;
                const dy = segment.y - prevSegment.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const targetDistance = length / segments;

                if (distance > 0) {
                    const ratio = targetDistance / distance;
                    segment.x = prevSegment.x + dx * ratio;
                    segment.y = prevSegment.y + dy * ratio;
                }

                // Apply gravity
                segment.vy += gravity * deltaTime;

                // Apply wind
                const windX = Math.sin(this.windTime * 2 + windDirection) * windStrength;
                const windY = Math.cos(this.windTime * 1.5 + windDirection) * windStrength * 0.5;
                segment.vx += windX * deltaTime;
                segment.vy += windY * deltaTime;

                // Verlet integration for smooth movement
                const tempX = segment.x;
                const tempY = segment.y;
                segment.x += (segment.x - segment.prevX) * damping + segment.vx * deltaTime;
                segment.y += (segment.y - segment.prevY) * damping + segment.vy * deltaTime;
                segment.prevX = tempX;
                segment.prevY = tempY;

                // Dampen velocity
                segment.vx *= damping;
                segment.vy *= damping;
            }

            if (!this._segBuf || this._segBuf.length !== this.segments.length) {
                this._segBuf = new Array(this.segments.length);
            }
            for (let i = 0; i < this.segments.length; i++) {
                this._segBuf[i] = this.segments[i];
            }
            return this._segBuf;
        },

        applyForce(forceX, forceY, segmentIndex = -1) {
            if (segmentIndex === -1) {
                // Apply to all segments
                this.segments.forEach(segment => {
                    segment.vx += forceX;
                    segment.vy += forceY;
                });
            } else if (segmentIndex < this.segments.length) {
                this.segments[segmentIndex].vx += forceX;
                this.segments[segmentIndex].vy += forceY;
            }
        }
    };
}
