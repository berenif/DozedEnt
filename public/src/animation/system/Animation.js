/**
 * Animation - Manages animation playback with frames
 */

import { toMilliseconds } from './utils.js';

export class Animation {
    constructor(name, frames, options = {}) {
        this.name = name;
        this.frames = frames;
        this.loop = options.loop !== null && options.loop !== void 0 ? options.loop : true;
        this.pingPong = options.pingPong || false;
        this.speed = options.speed || 1.0;
        this.onComplete = options.onComplete || null;
        this.onFrame = options.onFrame || null;
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
        this.isPlaying = false;
        this.hasCompleted = false;
    }

    play() {
        this.isPlaying = true;
        this.hasCompleted = false;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
    }

    stop() {
        this.isPlaying = false;
        this.reset();
    }

    pause() {
        this.isPlaying = false;
    }

    resume() {
        this.isPlaying = true;
    }

    reset() {
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.direction = 1;
        this.hasCompleted = false;
    }

    update(deltaTime) {
        if (!this.isPlaying || this.frames.length === 0) {
            return;
        }

        const deltaMs = toMilliseconds(deltaTime) * this.speed;
        if (deltaMs <= 0) {
            return;
        }

        this.elapsedTime += deltaMs;

        if (this.frames.length <= 1) {
            this._updateSingleFrame();
            return;
        }

        this._updateMultiFrame();
    }

    _updateSingleFrame() {
        const singleFrame = this.frames[0];
        if (!singleFrame) {
            this.elapsedTime = 0;
            return;
        }

        if (singleFrame.duration <= 0) {
            if (!this.loop) {
                this.isPlaying = false;
                this.hasCompleted = true;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
            this.elapsedTime = 0;
            return;
        }

        if (this.elapsedTime >= singleFrame.duration) {
            if (this.loop) {
                this.elapsedTime = this.elapsedTime % singleFrame.duration;
            } else {
                this.currentFrame = 0;
                this.isPlaying = false;
                this.hasCompleted = true;
                this.elapsedTime = 0;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }
    }

    _updateMultiFrame() {
        const maxSteps = this.frames.length * 3;
        let steps = 0;

        while (steps < maxSteps) {
            const currentFrameData = this.frames[this.currentFrame];

            if (!currentFrameData) {
                this.currentFrame = Math.min(Math.max(this.currentFrame, 0), this.frames.length - 1);
                this.elapsedTime = 0;
                break;
            }

            if (currentFrameData.duration <= 0) {
                if (!this.loop && this.currentFrame === this.frames.length - 1) {
                    this.isPlaying = false;
                    this.hasCompleted = true;
                    if (this.onComplete) {
                        this.onComplete();
                    }
                }
                this.elapsedTime = 0;
                break;
            }

            if (this.elapsedTime < currentFrameData.duration) {
                break;
            }

            this.elapsedTime -= currentFrameData.duration;

            const previousFrame = this.currentFrame;
            this.currentFrame += this.direction;

            if (this.pingPong) {
                this._handlePingPong(previousFrame);
            } else {
                this._handleLinear(previousFrame);
            }

            if (this.onFrame && this.currentFrame !== previousFrame) {
                const frameData = this.frames[this.currentFrame];
                if (frameData) {
                    this.onFrame(this.currentFrame, frameData);
                }
            }

            steps += 1;
        }
    }

    _handlePingPong(previousFrame) {
        if (this.currentFrame >= this.frames.length || this.currentFrame < 0) {
            this.direction *= -1;
            this.currentFrame = previousFrame + this.direction;
        }
    }

    _handleLinear(previousFrame) {
        if (this.currentFrame >= this.frames.length) {
            if (this.loop) {
                this.currentFrame = 0;
            } else {
                this.currentFrame = this.frames.length - 1;
                this.isPlaying = false;
                this.hasCompleted = true;
                this.elapsedTime = 0;
                if (this.onComplete) {
                    this.onComplete();
                }
                const frameData = this.frames[this.currentFrame];
                if (frameData && this.onFrame && this.currentFrame !== previousFrame) {
                    this.onFrame(this.currentFrame, frameData);
                }
            }
        } else if (this.currentFrame < 0) {
            this.currentFrame = this.loop ? this.frames.length - 1 : 0;
        }
    }

    getCurrentFrame() {
        if (this.frames.length === 0) {
            return null;
        }
        if (this.currentFrame < 0 || this.currentFrame >= this.frames.length) {
            return null;
        }
        return this.frames[this.currentFrame];
    }

    getProgress() {
        if (this.frames.length <= 1) {
            return 0;
        }
        return this.currentFrame / (this.frames.length - 1);
    }

    getFrameAt(index) {
        if (index < 0 || index >= this.frames.length) {
            return null;
        }
        return this.frames[index];
    }
}
