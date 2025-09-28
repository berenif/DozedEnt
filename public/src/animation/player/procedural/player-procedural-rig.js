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
            torso: { x: 0, y: -14 },
            head: { x: 0, y: -26 },
            leftArm: {
                shoulder: { x: -7, y: -17 },
                elbow: { x: -11, y: -9 },
                hand: { x: -14, y: 0 }
            },
            rightArm: {
                shoulder: { x: 7, y: -17 },
                elbow: { x: 11, y: -9 },
                hand: { x: 14, y: 0 }
            },
            leftLeg: {
                hip: { x: -4, y: 0 },
                knee: { x: -5, y: 10 },
                foot: { x: -6, y: 21 }
            },
            rightLeg: {
                hip: { x: 4, y: 0 },
                knee: { x: 5, y: 10 },
                foot: { x: 6, y: 21 }
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
