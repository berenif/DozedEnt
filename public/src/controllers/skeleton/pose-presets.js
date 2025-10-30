// Pose presets in radians

const D = Math.PI / 180;

export const PosePresets = {
	apose: {
		shoulder_R: { y: 25 * D },
		shoulder_L: { y: -25 * D }
	},
	tpose: {
		shoulder_R: { y: 90 * D },
		shoulder_L: { y: -90 * D }
	},
	sit: {
		hip_R: { x: -90 * D },
		hip_L: { x: -90 * D },
		knee_R: { x: 90 * D },
		knee_L: { x: 90 * D }
	},
	squat: {
		hip_R: { x: -110 * D },
		hip_L: { x: -110 * D },
		knee_R: { x: 130 * D },
		knee_L: { x: 130 * D },
		ankle_R: { x: 20 * D },
		ankle_L: { x: 20 * D }
	},
	reach: {
		shoulder_R: { y: 120 * D },
		shoulder_L: { y: -120 * D },
		elbow_R: { x: 10 * D },
		elbow_L: { x: 10 * D }
	},
	wave: {
		shoulder_R: { y: 150 * D },
		elbow_R: { x: 90 * D }
	}
};

export function applyPoseByName(skeleton, poseName) {
	const pose = PosePresets[poseName];
	if (!pose) {
		return;
	}
	const count = skeleton.getJointCount();
	// Build name to index once
	const map = new Map();
	for (let i = 0; i < count; i++) {
		map.set(skeleton.getJointName(i), i);
	}
	for (const [name, axes] of Object.entries(pose)) {
		const idx = map.get(name);
		if (idx === undefined) {
			continue;
		}
		skeleton.setJointTargetAngles(idx, axes.x ?? 0, axes.y ?? 0, axes.z ?? 0);
	}
}


