/**
 * SquashStretch - Impact and jump animations
 */

export function createSquashStretch(intensity = 0.3, duration = 0.2) {
    return {
        time: 0,
        active: false,
        _buf: { scaleX: 1, scaleY: 1 },
        trigger() {
            this.time = 0;
            this.active = true;
        },
        update(deltaTime) {
            const res = this._buf;

            if (!this.active) {
                res.scaleX = 1;
                res.scaleY = 1;
                return res;
            }

            this.time += deltaTime;
            const progress = Math.min(this.time / duration, 1);

            if (progress >= 1) {
                this.active = false;
                res.scaleX = 1;
                res.scaleY = 1;
                return res;
            }

            // Elastic easing
            const t = progress;
            const p = 0.3;
            const s = p / 4;
            const postFix = 2**(-10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;

            const squash = 1 - postFix * intensity;
            const stretch = 1 + postFix * intensity * 0.5;

            res.scaleX = progress < 0.5 ? stretch : squash;
            res.scaleY = progress < 0.5 ? squash : stretch;
            return res;
        }
    };
}
