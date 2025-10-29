/**
 * AnimationFrame - Represents a single frame in an animation sequence
 * Part of the modular animation system
 */

export class AnimationFrame {
    constructor(x, y, width, height, duration = 100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.duration = duration; // milliseconds
    }
}
