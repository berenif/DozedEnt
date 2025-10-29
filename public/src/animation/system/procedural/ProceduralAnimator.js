/**
 * ProceduralAnimator - Main procedural animation coordinator
 */

import { createBreathingAnimation } from './BreathingAnimation.js';
import { createBobbingAnimation } from './BobbingAnimation.js';
import { createSquashStretch } from './SquashStretch.js';
import { createWobble } from './Wobble.js';
import { createAnticipation } from './Anticipation.js';
import { createAdvancedIK } from './AdvancedIK.js';
import { createSecondaryMotion } from './SecondaryMotion.js';
import { createMomentumSystem } from './MomentumSystem.js';
import { createTrailEffect } from './TrailEffect.js';

export class ProceduralAnimator {
    constructor() {
        this.animations = Object.create(null);
    }

    addAnimation(name, updateFn, options = {}) {
        if (!name || typeof updateFn !== 'function') {
            return null;
        }

        const entry = {
            name,
            update: updateFn,
            duration: typeof options.duration === 'number' ? options.duration : null,
            loop: options.loop !== undefined ? options.loop : true,
            isPlaying: options.autoStart === undefined ? true : options.autoStart !== false,
            elapsed: 0,
            meta: options.meta ?? null
        };

        this.animations[name] = entry;
        return entry;
    }

    play(name) {
        const animation = this.animations[name];
        if (!animation) {
            return;
        }
        animation.isPlaying = true;
        animation.elapsed = 0;
    }

    stop(name) {
        const animation = this.animations[name];
        if (!animation) {
            return;
        }
        animation.isPlaying = false;
        animation.elapsed = 0;
    }

    update(deltaTime) {
        const dt = Number.isFinite(deltaTime) ? deltaTime : 0;

        for (const animation of Object.values(this.animations)) {
            if (!animation || animation.isPlaying === false || typeof animation.update !== 'function') {
                continue;
            }

            animation.elapsed += dt;
            animation.update(dt, animation);

            if (animation.duration && animation.duration > 0 && animation.elapsed >= animation.duration) {
                if (animation.loop) {
                    animation.elapsed = animation.elapsed % animation.duration;
                } else {
                    animation.isPlaying = false;
                }
            }
        }
    }

    // Factory methods for creating animation instances
    createBreathingAnimation(options) {
        return createBreathingAnimation(options);
    }

    createBobbingAnimation(amplitude, speed) {
        return createBobbingAnimation(amplitude, speed);
    }

    createSquashStretch(intensity, duration) {
        return createSquashStretch(intensity, duration);
    }

    createWobble(frequency, damping, intensity) {
        return createWobble(frequency, damping, intensity);
    }

    createAnticipation(duration, intensity) {
        return createAnticipation(duration, intensity);
    }

    createAdvancedIK(options) {
        return createAdvancedIK(options);
    }

    createSecondaryMotion(options) {
        return createSecondaryMotion(options);
    }

    createMomentumSystem(options) {
        return createMomentumSystem(options);
    }

    createTrailEffect(maxTrails, fadeSpeed) {
        return createTrailEffect(maxTrails, fadeSpeed);
    }
}
