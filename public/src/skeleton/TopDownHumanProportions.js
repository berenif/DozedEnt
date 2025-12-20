// Human skeleton proportions optimized for top-down/isometric view
// Coordinates: X = left/right, Y = forward/back (depth), Z = up/down (height)
// The renderer's toIso() transforms these for isometric projection

const DEG2RAD = Math.PI / 180;

/**
 * Standard human proportions based on 8-head figure
 * Scaled to ~1.75m total height with realistic body ratios
 * 
 * In top-down view:
 * - Character appears wider than tall (foreshortened)
 * - Torso forms the main visible mass
 * - Head is clearly visible on top
 * - Arms extend to sides
 * - Legs extend toward/away from camera
 */
export const HUMAN_MEASUREMENTS = {
	// Base height (for scaling)
	totalHeight: 1.75, // meters
	
	// Torso proportions (viewed from above, torso is the main mass)
	shoulderWidth: 0.44,    // Wider shoulders for clear silhouette
	chestDepth: 0.24,       // Front-to-back chest thickness
	hipWidth: 0.36,         // Slightly narrower than shoulders
	pelvisDepth: 0.20,      // Front-to-back pelvis
	
	// Vertical heights (Z axis - compressed in isometric view)
	pelvisHeight: 0.0,      // Base reference point
	spineHeight: 0.12,      // Lower spine above pelvis
	chestHeight: 0.32,      // Chest level
	shoulderHeight: 0.42,   // Shoulder attachment point
	neckHeight: 0.46,       // Base of neck
	headHeight: 0.56,       // Center of head
	
	// Arm segment lengths
	upperArmLength: 0.30,   // Shoulder to elbow
	forearmLength: 0.26,    // Elbow to wrist
	handLength: 0.10,       // Wrist to fingertips
	
	// Leg segment lengths
	thighLength: 0.40,      // Hip to knee
	shinLength: 0.38,       // Knee to ankle
	footLength: 0.12,       // Ankle to toe
	
	// Joint radii for collision/visualization
	headRadius: 0.10,
	shoulderRadius: 0.06,
	elbowRadius: 0.04,
	handRadius: 0.04,
	hipRadius: 0.06,
	kneeRadius: 0.05,
	ankleRadius: 0.04,
	footRadius: 0.05
};

/**
 * Create bone definitions for WASM skeleton with top-down optimized positions
 * @param {number} scale - Scale multiplier (default 1.0 for meters)
 * @returns {Array} Array of bone definition objects
 */
export function createTopDownBoneDefinitions(scale = 1.0) {
	const m = HUMAN_MEASUREMENTS;
	const s = scale;
	
	// Helper to scale values
	const sc = (v) => v * s;
	
	return [
		// Core body - pelvis is the root
		{
			name: 'pelvis',
			parent: -1,
			offset: { x: 0, y: 0, z: sc(m.pelvisHeight) },
			length: sc(0.12),
			radius: sc(0.10),
			mass: 10.0
		},
		// Spine chain - runs vertically (Z axis)
		{
			name: 'spine_01',
			parent: 'pelvis',
			offset: { x: 0, y: 0, z: sc(0.08) },
			length: sc(0.08),
			radius: sc(0.08),
			mass: 3.0
		},
		{
			name: 'spine_02',
			parent: 'spine_01',
			offset: { x: 0, y: 0, z: sc(0.08) },
			length: sc(0.08),
			radius: sc(0.08),
			mass: 3.0
		},
		{
			name: 'spine_03',
			parent: 'spine_02',
			offset: { x: 0, y: 0, z: sc(0.08) },
			length: sc(0.08),
			radius: sc(0.08),
			mass: 3.0
		},
		{
			name: 'chest',
			parent: 'spine_03',
			offset: { x: 0, y: 0, z: sc(0.10) },
			length: sc(m.chestDepth),
			radius: sc(0.12),
			mass: 12.0
		},
		// Neck and head
		{
			name: 'neck',
			parent: 'chest',
			offset: { x: 0, y: 0, z: sc(0.08) },
			length: sc(0.06),
			radius: sc(0.04),
			mass: 1.5
		},
		{
			name: 'head',
			parent: 'neck',
			offset: { x: 0, y: 0, z: sc(0.08) },
			length: sc(m.headRadius * 2),
			radius: sc(m.headRadius),
			mass: 5.0
		},
		
		// Right arm chain - extends to the right side (positive X)
		{
			name: 'clav_R',
			parent: 'chest',
			offset: { x: sc(0.08), y: 0, z: sc(0.04) },
			length: sc(0.10),
			radius: sc(0.03),
			mass: 0.4
		},
		{
			name: 'upperArm_R',
			parent: 'clav_R',
			offset: { x: sc(0.12), y: 0, z: -sc(0.02) },
			length: sc(m.upperArmLength),
			radius: sc(0.045),
			mass: 2.2
		},
		{
			name: 'forearm_R',
			parent: 'upperArm_R',
			offset: { x: sc(m.upperArmLength), y: sc(0.02), z: -sc(0.04) },
			length: sc(m.forearmLength),
			radius: sc(0.035),
			mass: 1.5
		},
		{
			name: 'hand_R',
			parent: 'forearm_R',
			offset: { x: sc(m.forearmLength * 0.8), y: sc(0.02), z: -sc(0.02) },
			length: sc(m.handLength),
			radius: sc(m.handRadius),
			mass: 0.5
		},
		
		// Left arm chain - extends to the left side (negative X)
		{
			name: 'clav_L',
			parent: 'chest',
			offset: { x: -sc(0.08), y: 0, z: sc(0.04) },
			length: sc(0.10),
			radius: sc(0.03),
			mass: 0.4
		},
		{
			name: 'upperArm_L',
			parent: 'clav_L',
			offset: { x: -sc(0.12), y: 0, z: -sc(0.02) },
			length: sc(m.upperArmLength),
			radius: sc(0.045),
			mass: 2.2
		},
		{
			name: 'forearm_L',
			parent: 'upperArm_L',
			offset: { x: -sc(m.upperArmLength), y: sc(0.02), z: -sc(0.04) },
			length: sc(m.forearmLength),
			radius: sc(0.035),
			mass: 1.5
		},
		{
			name: 'hand_L',
			parent: 'forearm_L',
			offset: { x: -sc(m.forearmLength * 0.8), y: sc(0.02), z: -sc(0.02) },
			length: sc(m.handLength),
			radius: sc(m.handRadius),
			mass: 0.5
		},
		
		// Right leg chain - extends forward/down (positive Y, negative Z)
		{
			name: 'thigh_R',
			parent: 'pelvis',
			offset: { x: sc(0.10), y: sc(0.04), z: -sc(0.04) },
			length: sc(m.thighLength),
			radius: sc(0.06),
			mass: 8.0
		},
		{
			name: 'shin_R',
			parent: 'thigh_R',
			offset: { x: sc(0.02), y: sc(m.thighLength * 0.6), z: -sc(m.thighLength * 0.4) },
			length: sc(m.shinLength),
			radius: sc(0.045),
			mass: 4.0
		},
		{
			name: 'foot_R',
			parent: 'shin_R',
			offset: { x: 0, y: sc(m.shinLength * 0.5), z: -sc(m.shinLength * 0.4) },
			length: sc(m.footLength),
			radius: sc(m.footRadius),
			mass: 1.0
		},
		{
			name: 'toe_R',
			parent: 'foot_R',
			offset: { x: 0, y: sc(m.footLength), z: 0 },
			length: sc(0.05),
			radius: sc(0.025),
			mass: 0.2
		},
		
		// Left leg chain - extends forward/down (positive Y, negative Z)
		{
			name: 'thigh_L',
			parent: 'pelvis',
			offset: { x: -sc(0.10), y: sc(0.04), z: -sc(0.04) },
			length: sc(m.thighLength),
			radius: sc(0.06),
			mass: 8.0
		},
		{
			name: 'shin_L',
			parent: 'thigh_L',
			offset: { x: -sc(0.02), y: sc(m.thighLength * 0.6), z: -sc(m.thighLength * 0.4) },
			length: sc(m.shinLength),
			radius: sc(0.045),
			mass: 4.0
		},
		{
			name: 'foot_L',
			parent: 'shin_L',
			offset: { x: 0, y: sc(m.shinLength * 0.5), z: -sc(m.shinLength * 0.4) },
			length: sc(m.footLength),
			radius: sc(m.footRadius),
			mass: 1.0
		},
		{
			name: 'toe_L',
			parent: 'foot_L',
			offset: { x: 0, y: sc(m.footLength), z: 0 },
			length: sc(0.05),
			radius: sc(0.025),
			mass: 0.2
		}
	];
}

/**
 * Joint type enum matching WASM definitions
 */
export const JointType = {
	FREE6DOF: 0,
	BALL: 1,
	HINGE: 2,
	TWIST: 3,
	SWING_TWIST: 4
};

/**
 * Create joint definitions for the skeleton
 * Joints define the allowed rotations between connected bones
 * @returns {Array} Array of joint definition objects
 */
export function createTopDownJointDefinitions() {
	return [
		// Spine joints - allow slight bending
		{
			name: 'spine01',
			parent: 'pelvis',
			child: 'spine_01',
			type: JointType.SWING_TWIST,
			limits: {
				minX: -25 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: -25 * DEG2RAD, maxY: 25 * DEG2RAD,
				minZ: -15 * DEG2RAD, maxZ: 15 * DEG2RAD
			},
			stiffness: 200,
			damping: 30
		},
		{
			name: 'spine02',
			parent: 'spine_01',
			child: 'spine_02',
			type: JointType.SWING_TWIST,
			limits: {
				minX: -20 * DEG2RAD, maxX: 20 * DEG2RAD,
				minY: -20 * DEG2RAD, maxY: 20 * DEG2RAD,
				minZ: -10 * DEG2RAD, maxZ: 10 * DEG2RAD
			},
			stiffness: 200,
			damping: 30
		},
		{
			name: 'spine03',
			parent: 'spine_02',
			child: 'spine_03',
			type: JointType.SWING_TWIST,
			limits: {
				minX: -20 * DEG2RAD, maxX: 20 * DEG2RAD,
				minY: -20 * DEG2RAD, maxY: 20 * DEG2RAD,
				minZ: -10 * DEG2RAD, maxZ: 10 * DEG2RAD
			},
			stiffness: 200,
			damping: 30
		},
		{
			name: 'chest',
			parent: 'spine_03',
			child: 'chest',
			type: JointType.SWING_TWIST,
			limits: {
				minX: -25 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: -25 * DEG2RAD, maxY: 25 * DEG2RAD,
				minZ: -15 * DEG2RAD, maxZ: 15 * DEG2RAD
			},
			stiffness: 220,
			damping: 35
		},
		// Neck and head
		{
			name: 'neck',
			parent: 'chest',
			child: 'neck',
			type: JointType.BALL,
			limits: {
				minX: -40 * DEG2RAD, maxX: 50 * DEG2RAD,
				minY: -50 * DEG2RAD, maxY: 50 * DEG2RAD,
				minZ: -70 * DEG2RAD, maxZ: 70 * DEG2RAD
			},
			stiffness: 150,
			damping: 25
		},
		{
			name: 'head',
			parent: 'neck',
			child: 'head',
			type: JointType.BALL,
			limits: {
				minX: -25 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: -15 * DEG2RAD, maxY: 15 * DEG2RAD,
				minZ: -35 * DEG2RAD, maxZ: 35 * DEG2RAD
			},
			stiffness: 120,
			damping: 20
		},
		// Right arm joints
		{
			name: 'clav_R',
			parent: 'chest',
			child: 'clav_R',
			type: JointType.BALL,
			limits: {
				minX: -15 * DEG2RAD, maxX: 20 * DEG2RAD,
				minY: -40 * DEG2RAD, maxY: 40 * DEG2RAD,
				minZ: -25 * DEG2RAD, maxZ: 25 * DEG2RAD
			},
			stiffness: 100,
			damping: 15
		},
		{
			name: 'shoulder_R',
			parent: 'clav_R',
			child: 'upperArm_R',
			type: JointType.BALL,
			limits: {
				minX: -50 * DEG2RAD, maxX: 35 * DEG2RAD,
				minY: -160 * DEG2RAD, maxY: 160 * DEG2RAD,
				minZ: -85 * DEG2RAD, maxZ: 75 * DEG2RAD
			},
			stiffness: 150,
			damping: 20
		},
		{
			name: 'elbow_R',
			parent: 'upperArm_R',
			child: 'forearm_R',
			type: JointType.HINGE,
			limits: {
				minX: -5 * DEG2RAD, maxX: 145 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 180,
			damping: 25
		},
		{
			name: 'wrist_R',
			parent: 'forearm_R',
			child: 'hand_R',
			type: JointType.BALL,
			limits: {
				minX: -75 * DEG2RAD, maxX: 65 * DEG2RAD,
				minY: -25 * DEG2RAD, maxY: 35 * DEG2RAD,
				minZ: -75 * DEG2RAD, maxZ: 75 * DEG2RAD
			},
			stiffness: 100,
			damping: 15
		},
		// Left arm joints
		{
			name: 'clav_L',
			parent: 'chest',
			child: 'clav_L',
			type: JointType.BALL,
			limits: {
				minX: -15 * DEG2RAD, maxX: 20 * DEG2RAD,
				minY: -40 * DEG2RAD, maxY: 40 * DEG2RAD,
				minZ: -25 * DEG2RAD, maxZ: 25 * DEG2RAD
			},
			stiffness: 100,
			damping: 15
		},
		{
			name: 'shoulder_L',
			parent: 'clav_L',
			child: 'upperArm_L',
			type: JointType.BALL,
			limits: {
				minX: -50 * DEG2RAD, maxX: 35 * DEG2RAD,
				minY: -160 * DEG2RAD, maxY: 160 * DEG2RAD,
				minZ: -75 * DEG2RAD, maxZ: 85 * DEG2RAD
			},
			stiffness: 150,
			damping: 20
		},
		{
			name: 'elbow_L',
			parent: 'upperArm_L',
			child: 'forearm_L',
			type: JointType.HINGE,
			limits: {
				minX: -5 * DEG2RAD, maxX: 145 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 180,
			damping: 25
		},
		{
			name: 'wrist_L',
			parent: 'forearm_L',
			child: 'hand_L',
			type: JointType.BALL,
			limits: {
				minX: -75 * DEG2RAD, maxX: 65 * DEG2RAD,
				minY: -25 * DEG2RAD, maxY: 35 * DEG2RAD,
				minZ: -75 * DEG2RAD, maxZ: 75 * DEG2RAD
			},
			stiffness: 100,
			damping: 15
		},
		// Right leg joints
		{
			name: 'hip_R',
			parent: 'pelvis',
			child: 'thigh_R',
			type: JointType.BALL,
			limits: {
				minX: -115 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: -35 * DEG2RAD, maxY: 50 * DEG2RAD,
				minZ: -45 * DEG2RAD, maxZ: 40 * DEG2RAD
			},
			stiffness: 200,
			damping: 30
		},
		{
			name: 'knee_R',
			parent: 'thigh_R',
			child: 'shin_R',
			type: JointType.HINGE,
			limits: {
				minX: 0, maxX: 145 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 220,
			damping: 35
		},
		{
			name: 'ankle_R',
			parent: 'shin_R',
			child: 'foot_R',
			type: JointType.HINGE,
			limits: {
				minX: -45 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 150,
			damping: 20
		},
		{
			name: 'toe_R',
			parent: 'foot_R',
			child: 'toe_R',
			type: JointType.HINGE,
			limits: {
				minX: -35 * DEG2RAD, maxX: 60 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 80,
			damping: 10
		},
		// Left leg joints
		{
			name: 'hip_L',
			parent: 'pelvis',
			child: 'thigh_L',
			type: JointType.BALL,
			limits: {
				minX: -115 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: -50 * DEG2RAD, maxY: 35 * DEG2RAD,
				minZ: -40 * DEG2RAD, maxZ: 45 * DEG2RAD
			},
			stiffness: 200,
			damping: 30
		},
		{
			name: 'knee_L',
			parent: 'thigh_L',
			child: 'shin_L',
			type: JointType.HINGE,
			limits: {
				minX: 0, maxX: 145 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 220,
			damping: 35
		},
		{
			name: 'ankle_L',
			parent: 'shin_L',
			child: 'foot_L',
			type: JointType.HINGE,
			limits: {
				minX: -45 * DEG2RAD, maxX: 25 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 150,
			damping: 20
		},
		{
			name: 'toe_L',
			parent: 'foot_L',
			child: 'toe_L',
			type: JointType.HINGE,
			limits: {
				minX: -35 * DEG2RAD, maxX: 60 * DEG2RAD,
				minY: 0, maxY: 0,
				minZ: 0, maxZ: 0
			},
			stiffness: 80,
			damping: 10
		}
	];
}

/**
 * Convert bone definitions to absolute world positions
 * @param {Array} boneDefs - Bone definitions from createTopDownBoneDefinitions
 * @returns {Array} Bones with computed world positions
 */
export function computeAbsolutePositions(boneDefs) {
	const boneMap = new Map();
	const result = [];
	
	// First pass: create bone map
	boneDefs.forEach((def, index) => {
		boneMap.set(def.name, { ...def, index, worldPos: { x: 0, y: 0, z: 0 } });
	});
	
	// Second pass: compute world positions
	boneDefs.forEach((def) => {
		const bone = boneMap.get(def.name);
		if (def.parent === -1) {
			// Root bone
			bone.worldPos = { ...def.offset };
		} else {
			const parentBone = boneMap.get(def.parent);
			if (parentBone) {
				bone.worldPos = {
					x: parentBone.worldPos.x + def.offset.x,
					y: parentBone.worldPos.y + def.offset.y,
					z: parentBone.worldPos.z + def.offset.z
				};
			}
		}
		result.push(bone);
	});
	
	return result;
}
