/**
 * Anticipation - Attack anticipation animation
 */

export function createAnticipation(duration = 0.3, intensity = 0.15) {
    return {
        time: 0,
        active: false,
        phase: 'idle', // idle, anticipation, action, recovery
        _buf: { scaleX: 1, scaleY: 1, offsetX: 0 },
        trigger() {
            this.time = 0;
            this.active = true;
            this.phase = 'anticipation';
        },
        update(deltaTime) {
            const res = this._buf;
            if (!this.active) {
                res.scaleX = 1;
                res.scaleY = 1;
                res.offsetX = 0;
                return res;
            }

            this.time += deltaTime;

            if (this.phase === 'anticipation') {
                const progress = Math.min(this.time / (duration * 0.4), 1);
                const eased = 1 - Math.cos(progress * Math.PI * 0.5);

                if (progress >= 1) {
                    this.phase = 'action';
                    this.time = 0;
                }

                res.scaleX = 1 - eased * intensity;
                res.scaleY = 1 + eased * intensity * 0.5;
                res.offsetX = -eased * 10;
                return res;
            }

            if (this.phase === 'action') {
                const progress = Math.min(this.time / (duration * 0.2), 1);
                const eased = Math.sin(progress * Math.PI * 0.5);

                if (progress >= 1) {
                    this.phase = 'recovery';
                    this.time = 0;
                }

                res.scaleX = 1 + eased * intensity * 2;
                res.scaleY = 1 - eased * intensity;
                res.offsetX = eased * 20;
                return res;
            }

            if (this.phase === 'recovery') {
                const progress = Math.min(this.time / (duration * 0.4), 1);
                const eased = 1 - (1 - progress)**3;

                if (progress >= 1) {
                    this.active = false;
                    this.phase = 'idle';
                }

                res.scaleX = 1 + (1 - eased) * intensity * 0.5;
                res.scaleY = 1 - (1 - eased) * intensity * 0.25;
                res.offsetX = (1 - eased) * 10;
                return res;
            }

            res.scaleX = 1;
            res.scaleY = 1;
            res.offsetX = 0;
            return res;
        }
    };
}
