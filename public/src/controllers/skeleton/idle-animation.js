// Gentle idle animation for the WASM skeleton

const D = Math.PI / 180;

export class IdleAnimation {
    constructor(skeleton) {
        this.skeleton = skeleton;
        this.map = new Map();
        const count = skeleton.getJointCount ? skeleton.getJointCount() : 0;
        for (let i = 0; i < count; i++) {
            this.map.set(skeleton.getJointName(i), i);
        }
        this.enabled = true;
        this.time = 0;
    }

    setEnabled(flag) {
        this.enabled = !!flag;
    }

    _idx(name) {
        return this.map.has(name) ? this.map.get(name) : -1;
    }

    update(dtSeconds) {
        if (!this.enabled) {return;}
        this.time += dtSeconds;

        const t = this.time;
        const sin = Math.sin;

        // Breathing: chest/neck slight oscillation
        const chest = this._idx('chest');
        const neck = this._idx('neck');
        if (chest >= 0) {
            const x = 5 * D * sin(t * 1.2);
            this.skeleton.setJointTargetAngles(chest, x, 0, 0);
        }
        if (neck >= 0) {
            const x = 3 * D * sin(t * 1.5 + 0.6);
            this.skeleton.setJointTargetAngles(neck, x, 0, 0);
        }

        // Arm sway: small shoulder ab/adduction and elbow micro-flex
        const shoulderR = this._idx('shoulder_R');
        const shoulderL = this._idx('shoulder_L');
        const elbowR = this._idx('elbow_R');
        const elbowL = this._idx('elbow_L');
        const armAmp = 12 * D;
        const elbowAmp = 10 * D;
        if (shoulderR >= 0) {this.skeleton.setJointTargetAngles(shoulderR, 0, armAmp * sin(t * 0.7 + 0.3), 0);}
        if (shoulderL >= 0) {this.skeleton.setJointTargetAngles(shoulderL, 0, -armAmp * sin(t * 0.7 + 0.3), 0);}
        if (elbowR >= 0) {this.skeleton.setJointTargetAngles(elbowR, elbowAmp * (0.5 + 0.5 * sin(t * 1.1)), 0, 0);}
        if (elbowL >= 0) {this.skeleton.setJointTargetAngles(elbowL, elbowAmp * (0.5 + 0.5 * sin(t * 1.15 + 0.2)), 0, 0);}

        // Subtle weight shift: hips/ankles tiny movement
        const hipR = this._idx('hip_R');
        const hipL = this._idx('hip_L');
        const kneeR = this._idx('knee_R');
        const kneeL = this._idx('knee_L');
        const ankleR = this._idx('ankle_R');
        const ankleL = this._idx('ankle_L');
        const hipAmp = 6 * D;
        const kneeAmp = 6 * D;
        const ankleAmp = 5 * D;
        if (hipR >= 0) {this.skeleton.setJointTargetAngles(hipR, -hipAmp * (0.5 + 0.5 * sin(t * 0.6)), hipAmp * 0.3 * sin(t * 0.6 + 1.2), 0);}
        if (hipL >= 0) {this.skeleton.setJointTargetAngles(hipL, -hipAmp * (0.5 + 0.5 * sin(t * 0.6 + Math.PI)), -hipAmp * 0.3 * sin(t * 0.6 + 1.2), 0);}
        if (kneeR >= 0) {this.skeleton.setJointTargetAngles(kneeR, kneeAmp * (0.5 + 0.5 * sin(t * 0.9 + 0.8)), 0, 0);}
        if (kneeL >= 0) {this.skeleton.setJointTargetAngles(kneeL, kneeAmp * (0.5 + 0.5 * sin(t * 0.95 + 1.1)), 0, 0);}
        if (ankleR >= 0) {this.skeleton.setJointTargetAngles(ankleR, -ankleAmp * sin(t * 0.7 + 0.4), 0, 0);}
        if (ankleL >= 0) {this.skeleton.setJointTargetAngles(ankleL, -ankleAmp * sin(t * 0.75 + 0.9), 0, 0);}
    }
}


