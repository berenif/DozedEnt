// Test animations for joint range demonstrations

const DEG2RAD = Math.PI / 180;

/**
 * Animates a joint through its range of motion
 * @param {Object} skeleton - Skeleton instance
 * @param {string} jointName - Name of the joint to test
 * @param {Array} startAngles - Starting angles [x, y, z] in radians
 * @param {Array} endAngles - Ending angles [x, y, z] in radians
 * @param {number} speed - Animation speed multiplier
 * @returns {Object} Animation controller with stop() method
 */
export function animateJointRange(skeleton, jointName, startAngles, endAngles, speed = 2) {
	let t = 0;
	const step = 0.02 * speed;
	
	// Build joint name to index map once
	const jointMap = new Map();
	const jointCount = skeleton.getJointCount();
	for (let i = 0; i < jointCount; i++) {
		const name = skeleton.getJointName(i);
		jointMap.set(name, i);
	}
	
	const jointIdx = jointMap.get(jointName);
	if (jointIdx === undefined) {
		console.warn(`Joint "${jointName}" not found`);
		return { stop: () => {} };
	}
	
	const interval = setInterval(() => {
		t += step;
		
		if (t >= 1.0) {
			clearInterval(interval);
			return;
		}
		
		const angles = [
			startAngles[0] + (endAngles[0] - startAngles[0]) * t,
			startAngles[1] + (endAngles[1] - startAngles[1]) * t,
			startAngles[2] + (endAngles[2] - startAngles[2]) * t
		];
		
		skeleton.setJointTargetAngles(jointIdx, angles[0], angles[1], angles[2]);
	}, 50);
	
	return {
		stop: () => clearInterval(interval)
	};
}

/**
 * Reset all joint angles to neutral pose
 * @param {Object} skeleton - Skeleton instance
 */
export function resetPose(skeleton) {
	const jointCount = skeleton.getJointCount();
	for (let i = 0; i < jointCount; i++) {
		skeleton.setJointTargetAngles(i, 0, 0, 0);
	}
}

/**
 * Predefined joint range tests
 */
export const JointTests = {
	shoulder: {
		name: 'shoulder_R',
		start: [0, 0, 0],
		end: [0, 180 * DEG2RAD, 0],
		speed: 2
	},
	elbow: {
		name: 'elbow_R',
		start: [0, 0, 0],
		end: [150 * DEG2RAD, 0, 0],
		speed: 3
	},
	knee: {
		name: 'knee_R',
		start: [0, 0, 0],
		end: [150 * DEG2RAD, 0, 0],
		speed: 3
	}
};

/**
 * Run a predefined test animation
 * @param {Object} skeleton - Skeleton instance
 * @param {string} testName - Name of the test from JointTests
 * @returns {Object} Animation controller with stop() method
 */
export function runJointTest(skeleton, testName) {
	const test = JointTests[testName];
	if (!test) {
		console.warn(`Test "${testName}" not found`);
		return { stop: () => {} };
	}
	
	const animation = animateJointRange(
		skeleton,
		test.name,
		test.start,
		test.end,
		test.speed
	);
	
	// Auto-reset after animation completes
	setTimeout(() => {
		setTimeout(() => resetPose(skeleton), 1000);
	}, (1.0 / (0.02 * test.speed)) * 50);
	
	return animation;
}

