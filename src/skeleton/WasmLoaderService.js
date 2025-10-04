// WASM module loader for skeleton physics
// Handles loading and initialization of the WebAssembly physics engine

const DEG2RAD = Math.PI / 180;

let WasmModule = null;

export async function loadWasmModule() {
	try {
		const createModule = await import('../../wasm/skeleton-physics.js');
		WasmModule = await createModule.default();
		console.log('✓ WebAssembly physics engine loaded');
		console.log('WASM Module exports:', Object.keys(WasmModule));
		return WasmModule;
	} catch (error) {
		console.error('Failed to load WASM module:', error);
		throw new Error('WebAssembly module could not be loaded: ' + error.message);
	}
}

export function getWasmModule() {
	return WasmModule;
}

export function createWasmSkeleton() {
	if (!WasmModule || !WasmModule.Skeleton) {
		throw new Error('WASM module not properly loaded or Skeleton class not available');
	}
	
	console.log('Creating WASM skeleton...');
	const skeleton = new WasmModule.Skeleton();

	// Track bone parent indices in JS so renderers can draw proper links
	// Note: The wasm build does not currently expose bone parent indices.
	// We capture them here at construction time.
	const parents = [];
	const setParent = (child, parent) => { parents[child] = parent; };
	
	// Joint type enum
	const JointType = {
		FREE6DOF: 0,
		BALL: 1,
		HINGE: 2,
		TWIST: 3,
		SWING_TWIST: 4
	};
	
	// Add bones
	const pelvis = skeleton.addBone('pelvis', -1, 0, 1.0, 0, 0.12, 0.11, 9.5); setParent(pelvis, -1);
	const spine01 = skeleton.addBone('spine_01', pelvis, 0, 0.08, 0, 0.10, 0.07, 3.0); setParent(spine01, pelvis);
	const spine02 = skeleton.addBone('spine_02', spine01, 0, 0.10, 0, 0.10, 0.07, 3.0); setParent(spine02, spine01);
	const spine03 = skeleton.addBone('spine_03', spine02, 0, 0.10, 0, 0.10, 0.07, 3.0); setParent(spine03, spine02);
	// Extended torso: add spine_04 between spine_03 and chest for finer torso control
	const spine04 = skeleton.addBone('spine_04', spine03, 0, 0.12, 0, 0.11, 0.08, 3.2); setParent(spine04, spine03);
	const chest = skeleton.addBone('chest', spine04, 0, 0.12, 0, 0.14, 0.10, 15.0); setParent(chest, spine04);
	const neck = skeleton.addBone('neck', chest, 0, 0.12, 0, 0.08, 0.04, 1.5); setParent(neck, chest);
	const head = skeleton.addBone('head', neck, 0, 0.10, 0, 0.12, 0.08, 6.0); setParent(head, neck);
	
	// Right arm
	const clavR = skeleton.addBone('clav_R', chest, 0.08, 0.10, 0, 0.14, 0.02, 0.4); setParent(clavR, chest);
	const scapR = skeleton.addBone('scap_R', clavR, 0.14, 0, 0, 0.05, 0.06, 0.3); setParent(scapR, clavR);
	const upperArmR = skeleton.addBone('upperArm_R', scapR, 0.05, -0.02, 0, 0.28, 0.05, 2.1); setParent(upperArmR, scapR);
	const forearmR = skeleton.addBone('forearm_R', upperArmR, 0, -0.28, 0, 0.24, 0.04, 1.6); setParent(forearmR, upperArmR);
	const handR = skeleton.addBone('hand_R', forearmR, 0, -0.24, 0, 0.08, 0.035, 0.8); setParent(handR, forearmR);
	
	// Left arm
	const clavL = skeleton.addBone('clav_L', chest, -0.08, 0.10, 0, 0.14, 0.02, 0.4); setParent(clavL, chest);
	const scapL = skeleton.addBone('scap_L', clavL, -0.14, 0, 0, 0.05, 0.06, 0.3); setParent(scapL, clavL);
	const upperArmL = skeleton.addBone('upperArm_L', scapL, -0.05, -0.02, 0, 0.28, 0.05, 2.1); setParent(upperArmL, scapL);
	const forearmL = skeleton.addBone('forearm_L', upperArmL, 0, -0.28, 0, 0.24, 0.04, 1.6); setParent(forearmL, upperArmL);
	const handL = skeleton.addBone('hand_L', forearmL, 0, -0.24, 0, 0.08, 0.035, 0.8); setParent(handL, forearmL);
	
	// Right leg
	const thighR = skeleton.addBone('thigh_R', pelvis, 0.10, -0.08, 0, 0.40, 0.06, 7.5); setParent(thighR, pelvis);
	const shinR = skeleton.addBone('shin_R', thighR, 0, -0.40, 0, 0.38, 0.045, 3.8); setParent(shinR, thighR);
	const footR = skeleton.addBone('foot_R', shinR, 0, -0.38, 0.05, 0.10, 0.035, 0.8); setParent(footR, shinR);
	// Extended foot: midfoot joint for better push-off control
	const midfootR = skeleton.addBone('midfoot_R', footR, 0, -0.06, 0.06, 0.06, 0.03, 0.25); setParent(midfootR, footR);
	const toeR = skeleton.addBone('toe_R', midfootR, 0, -0.02, 0.08, 0.05, 0.02, 0.2); setParent(toeR, midfootR);
	
	// Left leg
	const thighL = skeleton.addBone('thigh_L', pelvis, -0.10, -0.08, 0, 0.40, 0.06, 7.5); setParent(thighL, pelvis);
	const shinL = skeleton.addBone('shin_L', thighL, 0, -0.40, 0, 0.38, 0.045, 3.8); setParent(shinL, thighL);
	const footL = skeleton.addBone('foot_L', shinL, 0, -0.38, 0.05, 0.10, 0.035, 0.8); setParent(footL, shinL);
	const midfootL = skeleton.addBone('midfoot_L', footL, 0, -0.06, 0.06, 0.06, 0.03, 0.25); setParent(midfootL, footL);
	const toeL = skeleton.addBone('toe_L', midfootL, 0, -0.02, 0.08, 0.05, 0.02, 0.2); setParent(toeL, midfootL);
	
	// Add joints - Spine
	skeleton.addJoint('spine01', pelvis, spine01, JointType.SWING_TWIST,
		-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD, 200, 30);
	skeleton.addJoint('spine02', spine01, spine02, JointType.SWING_TWIST,
		-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD, 200, 30);
	skeleton.addJoint('spine03', spine02, spine03, JointType.SWING_TWIST,
		-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD, 200, 30);
	// New spine_04 joint
	skeleton.addJoint('spine04', spine03, spine04, JointType.SWING_TWIST,
		-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD, 210, 32);
	skeleton.addJoint('chest', spine04, chest, JointType.SWING_TWIST,
		-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD, 220, 35);
	
	// Neck & head
	skeleton.addJoint('neck', chest, neck, JointType.BALL,
		-45*DEG2RAD, -60*DEG2RAD, -80*DEG2RAD, 60*DEG2RAD, 45*DEG2RAD, 80*DEG2RAD, 150, 25);
	skeleton.addJoint('head', neck, head, JointType.BALL,
		-20*DEG2RAD, -10*DEG2RAD, -30*DEG2RAD, 20*DEG2RAD, 10*DEG2RAD, 30*DEG2RAD, 120, 20);
	
	// Right arm
	skeleton.addJoint('clav_R', chest, clavR, JointType.BALL,
		-10*DEG2RAD, -45*DEG2RAD, -20*DEG2RAD, 15*DEG2RAD, 45*DEG2RAD, 20*DEG2RAD, 100, 15);
	skeleton.addJoint('scap_R', clavR, scapR, JointType.BALL,
		-20*DEG2RAD, -30*DEG2RAD, -60*DEG2RAD, 20*DEG2RAD, 30*DEG2RAD, 0*DEG2RAD, 80, 12);
	skeleton.addJoint('shoulder_R', scapR, upperArmR, JointType.BALL,
		-45*DEG2RAD, -180*DEG2RAD, -90*DEG2RAD, 30*DEG2RAD, 180*DEG2RAD, 70*DEG2RAD, 150, 20);
	skeleton.addJoint('elbow_R', upperArmR, forearmR, JointType.HINGE,
		-5*DEG2RAD, 0, 0, 150*DEG2RAD, 0, 0, 180, 25);
	skeleton.addJoint('wrist_R', forearmR, handR, JointType.BALL,
		-80*DEG2RAD, -20*DEG2RAD, -80*DEG2RAD, 70*DEG2RAD, 30*DEG2RAD, 80*DEG2RAD, 100, 15);
	
	// Left arm
	skeleton.addJoint('clav_L', chest, clavL, JointType.BALL,
		-10*DEG2RAD, -45*DEG2RAD, -20*DEG2RAD, 15*DEG2RAD, 45*DEG2RAD, 20*DEG2RAD, 100, 15);
	skeleton.addJoint('scap_L', clavL, scapL, JointType.BALL,
		-20*DEG2RAD, -30*DEG2RAD, -60*DEG2RAD, 20*DEG2RAD, 30*DEG2RAD, 0*DEG2RAD, 80, 12);
	skeleton.addJoint('shoulder_L', scapL, upperArmL, JointType.BALL,
		-45*DEG2RAD, -180*DEG2RAD, -70*DEG2RAD, 30*DEG2RAD, 180*DEG2RAD, 90*DEG2RAD, 150, 20);
	skeleton.addJoint('elbow_L', upperArmL, forearmL, JointType.HINGE,
		-5*DEG2RAD, 0, 0, 150*DEG2RAD, 0, 0, 180, 25);
	skeleton.addJoint('wrist_L', forearmL, handL, JointType.BALL,
		-80*DEG2RAD, -20*DEG2RAD, -80*DEG2RAD, 70*DEG2RAD, 30*DEG2RAD, 80*DEG2RAD, 100, 15);
	
	// Right leg
	skeleton.addJoint('hip_R', pelvis, thighR, JointType.BALL,
		-120*DEG2RAD, -30*DEG2RAD, -45*DEG2RAD, 20*DEG2RAD, 45*DEG2RAD, 35*DEG2RAD, 200, 30);
	skeleton.addJoint('knee_R', thighR, shinR, JointType.HINGE,
		0, 0, 0, 150*DEG2RAD, 0, 0, 220, 35);
	skeleton.addJoint('ankle_R', shinR, footR, JointType.HINGE,
		-50*DEG2RAD, 0, 0, 20*DEG2RAD, 0, 0, 150, 20);
	// Midfoot and toe joints
	skeleton.addJoint('midfoot_R', footR, midfootR, JointType.HINGE,
		-20*DEG2RAD, 0, 0, 25*DEG2RAD, 0, 0, 90, 12);
	skeleton.addJoint('toe_R', midfootR, toeR, JointType.HINGE,
		-40*DEG2RAD, 0, 0, 65*DEG2RAD, 0, 0, 80, 10);
	
	// Left leg
	skeleton.addJoint('hip_L', pelvis, thighL, JointType.BALL,
		-120*DEG2RAD, -30*DEG2RAD, -35*DEG2RAD, 20*DEG2RAD, 45*DEG2RAD, 45*DEG2RAD, 200, 30);
	skeleton.addJoint('knee_L', thighL, shinL, JointType.HINGE,
		0, 0, 0, 150*DEG2RAD, 0, 0, 220, 35);
	skeleton.addJoint('ankle_L', shinL, footL, JointType.HINGE,
		-50*DEG2RAD, 0, 0, 20*DEG2RAD, 0, 0, 150, 20);
	skeleton.addJoint('midfoot_L', footL, midfootL, JointType.HINGE,
		-20*DEG2RAD, 0, 0, 25*DEG2RAD, 0, 0, 90, 12);
	skeleton.addJoint('toe_L', midfootL, toeL, JointType.HINGE,
		-40*DEG2RAD, 0, 0, 65*DEG2RAD, 0, 0, 80, 10);
	
	console.log('WASM skeleton created. Bones:', skeleton.getBoneCount(), 'Joints:', skeleton.getJointCount());
	// Attach parents array for renderers/interactions
	try { Object.defineProperty(skeleton, '__boneParents', { value: parents, enumerable: false, configurable: true }); } catch {}
	return skeleton;
}


