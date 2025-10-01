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
}
