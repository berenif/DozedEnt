/**
 * AnimationController - Manages multiple animations with blending
 */

import { toMilliseconds } from './utils.js';

export class AnimationController {
    constructor() {
        this.animations = Object.create(null);
        this._animationMap = new Map();
        this.currentAnimation = null;
        this.blendTime = 0;
        this.blendFrom = null;
        this.blendProgress = 0;
        this.isTransitioning = false;
        this.transitionDuration = 0;
    }

    addAnimation(nameOrAnimation, maybeAnimation) {
        let name = null;
        let animation = null;

        if (typeof nameOrAnimation === 'string' && maybeAnimation) {
            name = nameOrAnimation;
            animation = maybeAnimation;
        } else {
            animation = nameOrAnimation;
            if (animation && typeof animation.name === 'string') {
                name = animation.name;
            }
        }

        if (!name || !animation) {
            return;
        }

        this.animations[name] = animation;
        this._animationMap.set(name, animation);
    }

    getAnimation(name) {
        if (!name) {
            return null;
        }
        return this._animationMap.get(name) || this.animations[name] || null;
    }

    play(animationName, options = {}) {
        const animation = this.getAnimation(animationName);
        if (!animation) {
            return;
        }

        const hasCurrent = !!this.currentAnimation;
        const rawTransition = options.transition;
        const explicitDuration = typeof options.transitionDuration === 'number' ? options.transitionDuration : 0;
        let transitionDuration = 0;

        if (typeof rawTransition === 'number' && rawTransition > 0) {
            transitionDuration = rawTransition;
        } else if ((rawTransition === true || explicitDuration > 0) && explicitDuration > 0) {
            transitionDuration = explicitDuration;
        } else if (rawTransition === true && explicitDuration === 0) {
            transitionDuration = 150;
        } else if (explicitDuration > 0) {
            transitionDuration = explicitDuration;
        }

        const blendDurationMs = toMilliseconds(transitionDuration);

        if (hasCurrent && blendDurationMs > 0) {
            this.blendFrom = this.currentAnimation;
            this.blendTime = blendDurationMs;
            this.blendProgress = 0;
            this.isTransitioning = true;
            this.transitionDuration = blendDurationMs;
        } else {
            this.blendFrom = null;
            this.blendTime = 0;
            this.blendProgress = 0;
            this.isTransitioning = false;
            this.transitionDuration = 0;
        }

        this.currentAnimation = animation;
        animation.play();
    }

    stop() {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        this.isTransitioning = false;
        this.blendTime = 0;
        this.blendFrom = null;
        this.blendProgress = 0;
        this.transitionDuration = 0;
    }

    update(deltaTime) {
        const deltaMs = toMilliseconds(deltaTime);

        if (this.blendTime > 0 && deltaMs > 0) {
            this.blendProgress += deltaMs;
            if (this.blendProgress >= this.blendTime) {
                this.blendTime = 0;
                this.blendFrom = null;
                this.blendProgress = 0;
                this.isTransitioning = false;
                this.transitionDuration = 0;
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.update(deltaTime);
        }
    }

    getCurrentFrame() {
        if (!this.currentAnimation) {
            return null;
        }
        return this.currentAnimation.getCurrentFrame();
    }

    getBlendFrames() {
        if (this.blendTime === 0 || !this.blendFrom) {
            return { current: this.getCurrentFrame(), blend: null, blendFactor: 0 };
        }

        const blendFactor = this.blendTime > 0 ? Math.min(1, this.blendProgress / this.blendTime) : 0;
        return {
            current: this.currentAnimation ? this.currentAnimation.getCurrentFrame() : null,
            blend: this.blendFrom ? this.blendFrom.getCurrentFrame() : null,
            blendFactor
        };
    }

    isPlaying(animationName) {
        return this.currentAnimation &&
               this.currentAnimation.name === animationName &&
               this.currentAnimation.isPlaying;
    }

    setSpeed(speed) {
        if (this.currentAnimation) {
            this.currentAnimation.speed = speed;
        }
    }
}
