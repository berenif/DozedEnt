// Pose presets for top-down/isometric skeleton
// Joint rotations are applied relative to parent bone
// X = pitch (forward/back tilt), Y = yaw (left/right rotation), Z = roll (twist)

const D = Math.PI / 180;

/**
 * Pose presets optimized for top-down isometric viewing
 * Arms extend to sides, legs extend forward/back (toward/away from camera)
 */
export const PosePresets = {
	// Neutral A-pose: arms slightly down from horizontal
	apose: {
		shoulder_R: { x: -15 * D, y: 20 * D, z: 0 },
		shoulder_L: { x: -15 * D, y: -20 * D, z: 0 },
		elbow_R: { x: 5 * D },
		elbow_L: { x: 5 * D }
	},
	// T-pose: arms fully horizontal (visible from top-down)
	tpose: {
		shoulder_R: { x: 0, y: 85 * D, z: 0 },
		shoulder_L: { x: 0, y: -85 * D, z: 0 },
		elbow_R: { x: 0 },
		elbow_L: { x: 0 }
	},
	// Sitting pose: legs bent forward
	sit: {
		hip_R: { x: -90 * D, y: 10 * D },
		hip_L: { x: -90 * D, y: -10 * D },
		knee_R: { x: 90 * D },
		knee_L: { x: 90 * D },
		spine01: { x: -10 * D }
	},
	// Squatting pose: deep leg bend
	squat: {
		hip_R: { x: -100 * D, y: 20 * D },
		hip_L: { x: -100 * D, y: -20 * D },
		knee_R: { x: 120 * D },
		knee_L: { x: 120 * D },
		ankle_R: { x: 20 * D },
		ankle_L: { x: 20 * D },
		spine01: { x: -15 * D },
		chest: { x: -10 * D }
	},
	// Reaching pose: arms extended forward
	reach: {
		shoulder_R: { x: -60 * D, y: 30 * D },
		shoulder_L: { x: -60 * D, y: -30 * D },
		elbow_R: { x: 15 * D },
		elbow_L: { x: 15 * D },
		spine01: { x: -10 * D },
		chest: { x: -15 * D },
		neck: { x: -10 * D }
	},
	// Waving pose: one arm raised
	wave: {
		shoulder_R: { x: -80 * D, y: 60 * D },
		elbow_R: { x: 100 * D },
		wrist_R: { z: 20 * D },
		shoulder_L: { x: -10 * D, y: -15 * D }
	},
	// Combat ready stance: defensive posture
	combat: {
		shoulder_R: { x: -40 * D, y: 40 * D },
		shoulder_L: { x: -40 * D, y: -40 * D },
		elbow_R: { x: 80 * D },
		elbow_L: { x: 80 * D },
		hip_R: { x: -30 * D, y: 15 * D },
		hip_L: { x: -30 * D, y: -15 * D },
		knee_R: { x: 30 * D },
		knee_L: { x: 30 * D },
		spine01: { x: -10 * D },
		chest: { x: -5 * D }
	},
	// Walking pose: mid-stride
	walk: {
		hip_R: { x: -30 * D },
		hip_L: { x: 15 * D },
		knee_R: { x: 40 * D },
		knee_L: { x: 10 * D },
		shoulder_R: { x: 10 * D, y: 15 * D },
		shoulder_L: { x: -20 * D, y: -15 * D },
		elbow_R: { x: 20 * D },
		elbow_L: { x: 40 * D },
		spine01: { z: 5 * D },
		chest: { z: -3 * D }
	},
	// Running pose: extended stride
	run: {
		hip_R: { x: -50 * D },
		hip_L: { x: 30 * D },
		knee_R: { x: 80 * D },
		knee_L: { x: 15 * D },
		shoulder_R: { x: 25 * D, y: 20 * D },
		shoulder_L: { x: -40 * D, y: -20 * D },
		elbow_R: { x: 60 * D },
		elbow_L: { x: 90 * D },
		spine01: { z: 8 * D, x: -5 * D },
		chest: { z: -5 * D, x: -10 * D }
	}
};

/**
 * Apply a named pose to the skeleton
 * @param {Object} skeleton - Skeleton instance with joint methods
 * @param {string} poseName - Name of the pose to apply
 */
export function applyPoseByName(skeleton, poseName) {
	const pose = PosePresets[poseName];
	if (!pose) {
		console.warn(`[PosePresets] Unknown pose: ${poseName}`);
		return;
	}
	
	const count = skeleton.getJointCount();
	// Build name to index map
	const jointMap = new Map();
	for (let i = 0; i < count; i++) {
		jointMap.set(skeleton.getJointName(i), i);
	}
	
	// Apply each joint rotation in the pose
	for (const [jointName, axes] of Object.entries(pose)) {
		if (!jointMap.has(jointName)) {
			// Joint not found - may be using different naming convention
			continue;
		}
		const idx = jointMap.get(jointName);
		skeleton.setJointTargetAngles(idx, axes.x ?? 0, axes.y ?? 0, axes.z ?? 0);
	}
}

/**
 * Reset all joints to neutral position
 * @param {Object} skeleton - Skeleton instance
 */
export function resetToNeutral(skeleton) {
	const count = skeleton.getJointCount();
	for (let i = 0; i < count; i++) {
		skeleton.setJointTargetAngles(i, 0, 0, 0);
	}
}

/**
 * Blend between two poses
 * @param {Object} skeleton - Skeleton instance
 * @param {string} poseA - First pose name
 * @param {string} poseB - Second pose name
 * @param {number} t - Blend factor (0 = poseA, 1 = poseB)
 */
export function blendPoses(skeleton, poseA, poseB, t) {
	const a = PosePresets[poseA];
	const b = PosePresets[poseB];
	if (!a || !b) {
		return;
	}
	
	const count = skeleton.getJointCount();
	const jointMap = new Map();
	for (let i = 0; i < count; i++) {
		jointMap.set(skeleton.getJointName(i), i);
	}
	
	// Get all unique joint names from both poses
	const allJoints = new Set([...Object.keys(a), ...Object.keys(b)]);
	
	for (const jointName of allJoints) {
		if (!jointMap.has(jointName)) {
			continue;
		}
		const idx = jointMap.get(jointName);
		
		const axesA = a[jointName] || { x: 0, y: 0, z: 0 };
		const axesB = b[jointName] || { x: 0, y: 0, z: 0 };
		
		const x = (axesA.x ?? 0) * (1 - t) + (axesB.x ?? 0) * t;
		const y = (axesA.y ?? 0) * (1 - t) + (axesB.y ?? 0) * t;
		const z = (axesA.z ?? 0) * (1 - t) + (axesB.z ?? 0) * t;
		
		skeleton.setJointTargetAngles(idx, x, y, z);
	}
}


