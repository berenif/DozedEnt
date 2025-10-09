// PlayerProceduralRig represents the joint hierarchy used by the procedural pipeline.
// It exposes helper methods to clone and mutate the rig in a controlled manner so
// each module can focus on its specific concern.

export default class PlayerProceduralRig {
    constructor(initialPose = PlayerProceduralRig.createDefaultPose()) {
        this.pose = PlayerProceduralRig.clonePose(initialPose)
    }

    static createDefaultPose() {
        return {
            root: { x: 0, y: 0 },
            pelvis: { x: 0, y: 0 },
            // Multi-segment spine
            lowerSpine: { x: 0, y: -7 },
            chest: { x: 0, y: -14 },
            neck: { x: 0, y: -20 },
            // Legacy torso kept for backward compatibility (maps to chest)
            torso: { x: 0, y: -14 },
            head: { x: 0, y: -26 },
            // Shoulder girdle
            clavicleL: { x: -5, y: -16 },
            clavicleR: { x: 5, y: -16 },
            leftArm: {
                shoulder: { x: -7, y: -17 },
                elbow: { x: -11, y: -9 },
                wrist: { x: -13, y: -1 },
                hand: { x: -14, y: 0 }
            },
            rightArm: {
                shoulder: { x: 7, y: -17 },
                elbow: { x: 11, y: -9 },
                wrist: { x: 13, y: -1 },
                hand: { x: 14, y: 0 }
            },
            leftLeg: {
                hip: { x: -4, y: 0 },
                knee: { x: -5, y: 10 },
                ankle: { x: -6, y: 19 },
                foot: { x: -6, y: 21 },
                toe: { x: -6, y: 23 }
            },
            rightLeg: {
                hip: { x: 4, y: 0 },
                knee: { x: 5, y: 10 },
                ankle: { x: 6, y: 19 },
                foot: { x: 6, y: 21 },
                toe: { x: 6, y: 23 }
            }
        }
    }

    static clonePose(pose) {
        const cloneSegment = (segment) => {
            const result = {}
            Object.entries(segment).forEach(([key, value]) => {
                if (value && typeof value === 'object' && 'x' in value) {
                    result[key] = { x: value.x, y: value.y }
                } else if (value && typeof value === 'object') {
                    result[key] = cloneSegment(value)
                } else {
                    result[key] = value
                }
            })
            return result
        }
        return cloneSegment(pose)
    }

    createWorkingPose() {
        return PlayerProceduralRig.clonePose(this.pose)
    }

    commitPose(updatedPose) {
        this.pose = PlayerProceduralRig.clonePose(updatedPose)
    }

    toSkeleton() {
        return this.createWorkingPose()
    }

    // Apply anthropometric scaling to limb segment positions relative to pelvis
    applyAnthropometrics(anthro) {
        if (!anthro || typeof anthro !== 'object') {return}
        const scaleY = (v, k) => ({ x: v.x, y: v.y * k })
        const scaleXY = (v, kx, ky) => ({ x: v.x * kx, y: v.y * ky })
        const s = {
            arm: anthro.armLengthScale ?? 1,
            forearm: anthro.forearmLengthScale ?? 1,
            hand: anthro.handLengthScale ?? 1,
            thigh: anthro.thighLengthScale ?? 1,
            shin: anthro.shinLengthScale ?? 1,
            foot: anthro.footLengthScale ?? 1,
            spine: anthro.spineLengthScale ?? 1,
            stature: anthro.overallScale ?? 1
        }
        // Spine segment scaling
        this.pose.lowerSpine = scaleY(this.pose.lowerSpine, s.spine)
        this.pose.chest = scaleY(this.pose.chest, s.spine)
        this.pose.neck = scaleY(this.pose.neck, s.spine)
        this.pose.head = scaleY(this.pose.head, s.stature)
        // Arms
        this.pose.leftArm.elbow = scaleXY(this.pose.leftArm.elbow, s.arm, s.arm)
        this.pose.leftArm.wrist = scaleXY(this.pose.leftArm.wrist, s.forearm, s.forearm)
        this.pose.leftArm.hand = scaleXY(this.pose.leftArm.hand, s.hand, s.hand)
        this.pose.rightArm.elbow = scaleXY(this.pose.rightArm.elbow, s.arm, s.arm)
        this.pose.rightArm.wrist = scaleXY(this.pose.rightArm.wrist, s.forearm, s.forearm)
        this.pose.rightArm.hand = scaleXY(this.pose.rightArm.hand, s.hand, s.hand)
        // Legs (scale vertical distances more prominently)
        this.pose.leftLeg.knee = scaleY(this.pose.leftLeg.knee, s.thigh)
        this.pose.leftLeg.ankle = scaleY(this.pose.leftLeg.ankle, s.shin)
        this.pose.leftLeg.foot = scaleY(this.pose.leftLeg.foot, s.foot)
        this.pose.leftLeg.toe = scaleY(this.pose.leftLeg.toe, s.foot)
        this.pose.rightLeg.knee = scaleY(this.pose.rightLeg.knee, s.thigh)
        this.pose.rightLeg.ankle = scaleY(this.pose.rightLeg.ankle, s.shin)
        this.pose.rightLeg.foot = scaleY(this.pose.rightLeg.foot, s.foot)
        this.pose.rightLeg.toe = scaleY(this.pose.rightLeg.toe, s.foot)
    }
}
