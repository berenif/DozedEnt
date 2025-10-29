/**
 * TrailEffect - Motion trail for fast movement
 */

export function createTrailEffect(maxTrails = 5, fadeSpeed = 0.3) {
    return {
        trails: [],
        lastPosition: null,
        update(deltaTime, currentPosition) {
            // Fade existing trails
            this.trails = this.trails.filter(trail => {
                trail.alpha -= fadeSpeed * deltaTime;
                return trail.alpha > 0;
            });

            // Add new trail if moved enough
            if (this.lastPosition) {
                const dx = currentPosition.x - this.lastPosition.x;
                const dy = currentPosition.y - this.lastPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 10) {
                    this.trails.push({
                        x: this.lastPosition.x,
                        y: this.lastPosition.y,
                        alpha: 0.5,
                        scale: 0.8
                    });

                    if (this.trails.length > maxTrails) {
                        this.trails.shift();
                    }

                    this.lastPosition = { ...currentPosition };
                }
            } else {
                this.lastPosition = { ...currentPosition };
            }

            return this.trails;
        },
        clear() {
            this.trails = [];
        }
    };
}
