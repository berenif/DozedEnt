/**
 * WolfAnimator - Wolf-specific animation system
 */

import { AnimationController } from './AnimationController.js';
import { ProceduralAnimator } from './procedural/ProceduralAnimator.js';

export class WolfAnimator {
    constructor() {
        this.controller = new AnimationController();
        this.procedural = new ProceduralAnimator();

        // Wolf-specific procedural animations
        this.sniffing = this.procedural.createBreathingAnimation({
            intensity: 0.008, 
            speed: 0.5
        });
        this.howling = this.procedural.createAnticipation({
            duration: 0.5, 
            intensity: 0.2
        });

        this.state = 'idle';
        this.facing = 'right';
    }

    addAnimation(name, animation) {
        this.controller.addAnimation(name, animation);
    }

    play(animationName, options = {}) {
        this.controller.play(animationName, options);
    }

    setWolfState(newState) {
        if (this.state === newState) {
            return;
        }
        this.state = newState;
        this.play(newState);

        // Trigger procedural effects specific to wolf
        switch(newState) {
            case 'lunge':
                this.sniffing.modulateForState('attacking');
                break;
            case 'howl':
                this.howling.trigger();
                this.sniffing.modulateForState('idle');
                break;
            case 'prowl':
                this.sniffing.modulateForState('running');
                break;
            case 'hurt':
                this.sniffing.modulateForState('hurt');
                break;
            case 'death':
                this.sniffing.modulateForState('dead');
                break;
            default:
                this.sniffing.modulateForState('idle');
        }
    }

    update(deltaTime) {
        this.controller.update(deltaTime);
        
        const breathing = this.sniffing.update(deltaTime);
        const howling = this.howling.update(deltaTime);

        const transform = {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0
        };

        // Apply breathing
        transform.scaleX *= breathing.scaleX;
        transform.scaleY *= breathing.scaleY;
        transform.offsetY += breathing.offsetY;

        // Apply howling anticipation
        transform.scaleX *= howling.scaleX;
        transform.scaleY *= howling.scaleY;
        transform.offsetX += howling.offsetX;

        // Facing direction
        if (this.facing === 'left') {
            transform.scaleX *= -1;
        }

        return transform;
    }

    setFacing(direction) {
        this.facing = direction;
    }

    getCurrentFrame() {
        return this.controller.getCurrentFrame();
    }
}
