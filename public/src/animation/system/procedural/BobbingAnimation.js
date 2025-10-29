/**
 * BobbingAnimation - Floating/bobbing effect for objects
 */

export function createBobbingAnimation(amplitude = 5, speed = 2) {
    return {
        time: 0,
        _buf: { offsetY: 0, rotation: 0 },
        update(deltaTime) {
            this.time += deltaTime * speed;
            const res = this._buf;
            res.offsetY = Math.sin(this.time) * amplitude;
            res.rotation = Math.sin(this.time * 0.5) * 0.05;
            return res;
        }
    };
}
