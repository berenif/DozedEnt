// WASM module loader for skeleton physics
// Handles loading and initialization of the WebAssembly physics engine

const DEG2RAD = Math.PI / 180;

let WasmModule = null;

export async function loadWasmModule() {
	try {
		// Probe for module availability with correct MIME to avoid module MIME errors
		const moduleUrl = '/wasm/skeleton-physics.js';
		let canLoad = false;
		try {
			const head = await fetch(moduleUrl, { method: 'HEAD' });
			const ctype = head.headers.get('Content-Type') || '';
			canLoad = head.ok && /javascript|ecmascript/.test(ctype);
		} catch (_) {
			canLoad = false;
		}

		if (!canLoad) {
			throw new Error('WASM JS glue not present or wrong MIME');
		}

		const createModule = await import(moduleUrl);
		WasmModule = await createModule.default();
		console.log('✓ WebAssembly physics engine loaded');
		console.log('WASM Module exports:', Object.keys(WasmModule));
		return WasmModule;
	} catch (error) {
		console.warn('WASM module not available, using JavaScript fallback:', error.message);
		WasmModule = null; // Explicitly set to null to indicate fallback mode
		return null;
	}
}

export function getWasmModule() {
	return WasmModule;
}

export function createWasmSkeleton() {
	if (!WasmModule || !WasmModule.Skeleton) {
		console.log('Creating JavaScript fallback skeleton...');
		return createJavaScriptSkeleton();
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
	try { Object.defineProperty(skeleton, '__boneParents', { value: parents, enumerable: false, configurable: true }); } catch (error) {
		console.warn('Failed to set bone parents property:', error);
	}
	return skeleton;
}

// JavaScript fallback skeleton implementation
function createJavaScriptSkeleton() {
	console.log('Creating JavaScript skeleton...');
	
	// Simple bone data structure
	const bones = [
		{ name: 'pelvis', parent: -1, pos: { x: 0, y: 1.0, z: 0 }, length: 0.12, radius: 0.11, mass: 9.5 },
		{ name: 'spine_01', parent: 0, pos: { x: 0, y: 1.08, z: 0 }, length: 0.10, radius: 0.07, mass: 3.0 },
		{ name: 'spine_02', parent: 1, pos: { x: 0, y: 1.18, z: 0 }, length: 0.10, radius: 0.07, mass: 3.0 },
		{ name: 'spine_03', parent: 2, pos: { x: 0, y: 1.28, z: 0 }, length: 0.10, radius: 0.07, mass: 3.0 },
		{ name: 'chest', parent: 3, pos: { x: 0, y: 1.40, z: 0 }, length: 0.14, radius: 0.10, mass: 15.0 },
		{ name: 'neck', parent: 4, pos: { x: 0, y: 1.52, z: 0 }, length: 0.08, radius: 0.04, mass: 1.5 },
		{ name: 'head', parent: 5, pos: { x: 0, y: 1.62, z: 0 }, length: 0.12, radius: 0.08, mass: 6.0 },
		{ name: 'clav_R', parent: 4, pos: { x: 0.08, y: 1.50, z: 0 }, length: 0.14, radius: 0.02, mass: 0.4 },
		{ name: 'scap_R', parent: 7, pos: { x: 0.22, y: 1.50, z: 0 }, length: 0.05, radius: 0.06, mass: 0.3 },
		{ name: 'upperArm_R', parent: 8, pos: { x: 0.27, y: 1.48, z: 0 }, length: 0.28, radius: 0.05, mass: 2.1 },
		{ name: 'forearm_R', parent: 9, pos: { x: 0.27, y: 1.20, z: 0 }, length: 0.24, radius: 0.04, mass: 1.6 },
		{ name: 'hand_R', parent: 10, pos: { x: 0.27, y: 0.96, z: 0 }, length: 0.08, radius: 0.035, mass: 0.8 },
		{ name: 'clav_L', parent: 4, pos: { x: -0.08, y: 1.50, z: 0 }, length: 0.14, radius: 0.02, mass: 0.4 },
		{ name: 'scap_L', parent: 12, pos: { x: -0.22, y: 1.50, z: 0 }, length: 0.05, radius: 0.06, mass: 0.3 },
		{ name: 'upperArm_L', parent: 13, pos: { x: -0.27, y: 1.48, z: 0 }, length: 0.28, radius: 0.05, mass: 2.1 },
		{ name: 'forearm_L', parent: 14, pos: { x: -0.27, y: 1.20, z: 0 }, length: 0.24, radius: 0.04, mass: 1.6 },
		{ name: 'hand_L', parent: 15, pos: { x: -0.27, y: 0.96, z: 0 }, length: 0.08, radius: 0.035, mass: 0.8 },
		{ name: 'thigh_R', parent: 0, pos: { x: 0.10, y: 0.92, z: 0 }, length: 0.40, radius: 0.06, mass: 7.5 },
		{ name: 'shin_R', parent: 17, pos: { x: 0.10, y: 0.52, z: 0 }, length: 0.38, radius: 0.045, mass: 3.8 },
		{ name: 'foot_R', parent: 18, pos: { x: 0.10, y: 0.14, z: 0.05 }, length: 0.10, radius: 0.035, mass: 0.8 },
		{ name: 'toe_R', parent: 19, pos: { x: 0.10, y: 0.12, z: 0.13 }, length: 0.05, radius: 0.02, mass: 0.2 },
		{ name: 'thigh_L', parent: 0, pos: { x: -0.10, y: 0.92, z: 0 }, length: 0.40, radius: 0.06, mass: 7.5 },
		{ name: 'shin_L', parent: 21, pos: { x: -0.10, y: 0.52, z: 0 }, length: 0.38, radius: 0.045, mass: 3.8 },
		{ name: 'foot_L', parent: 22, pos: { x: -0.10, y: 0.14, z: 0.05 }, length: 0.10, radius: 0.035, mass: 0.8 },
		{ name: 'toe_L', parent: 23, pos: { x: -0.10, y: 0.12, z: 0.13 }, length: 0.05, radius: 0.02, mass: 0.2 }
	];

	const joints = [
		{ name: 'spine01', parent: 0, child: 1, type: 4, limits: [-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'spine02', parent: 1, child: 2, type: 4, limits: [-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'spine03', parent: 2, child: 3, type: 4, limits: [-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'chest', parent: 3, child: 4, type: 4, limits: [-30*DEG2RAD, -30*DEG2RAD, -15*DEG2RAD, 30*DEG2RAD, 30*DEG2RAD, 15*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'neck', parent: 4, child: 5, type: 1, limits: [-45*DEG2RAD, -60*DEG2RAD, -80*DEG2RAD, 60*DEG2RAD, 45*DEG2RAD, 80*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'head', parent: 5, child: 6, type: 1, limits: [-20*DEG2RAD, -10*DEG2RAD, -30*DEG2RAD, 20*DEG2RAD, 10*DEG2RAD, 30*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'shoulder_R', parent: 8, child: 9, type: 1, limits: [-45*DEG2RAD, -180*DEG2RAD, -90*DEG2RAD, 30*DEG2RAD, 180*DEG2RAD, 70*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'elbow_R', parent: 9, child: 10, type: 2, limits: [-5*DEG2RAD, 0, 0, 150*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'wrist_R', parent: 10, child: 11, type: 1, limits: [-80*DEG2RAD, -20*DEG2RAD, -80*DEG2RAD, 70*DEG2RAD, 30*DEG2RAD, 80*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'shoulder_L', parent: 13, child: 14, type: 1, limits: [-45*DEG2RAD, -180*DEG2RAD, -70*DEG2RAD, 30*DEG2RAD, 180*DEG2RAD, 90*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'elbow_L', parent: 14, child: 15, type: 2, limits: [-5*DEG2RAD, 0, 0, 150*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'wrist_L', parent: 15, child: 16, type: 1, limits: [-80*DEG2RAD, -20*DEG2RAD, -80*DEG2RAD, 70*DEG2RAD, 30*DEG2RAD, 80*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'hip_R', parent: 0, child: 17, type: 1, limits: [-120*DEG2RAD, -30*DEG2RAD, -45*DEG2RAD, 20*DEG2RAD, 45*DEG2RAD, 35*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'knee_R', parent: 17, child: 18, type: 2, limits: [0, 0, 0, 150*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'ankle_R', parent: 18, child: 19, type: 2, limits: [-50*DEG2RAD, 0, 0, 20*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'toe_R', parent: 19, child: 20, type: 2, limits: [-40*DEG2RAD, 0, 0, 65*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'hip_L', parent: 0, child: 21, type: 1, limits: [-120*DEG2RAD, -30*DEG2RAD, -35*DEG2RAD, 20*DEG2RAD, 45*DEG2RAD, 45*DEG2RAD], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'knee_L', parent: 21, child: 22, type: 2, limits: [0, 0, 0, 150*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'ankle_L', parent: 22, child: 23, type: 2, limits: [-50*DEG2RAD, 0, 0, 20*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } },
		{ name: 'toe_L', parent: 23, child: 24, type: 2, limits: [-40*DEG2RAD, 0, 0, 65*DEG2RAD, 0, 0], targetAngles: { x: 0, y: 0, z: 0 }, currentAngles: { x: 0, y: 0, z: 0 } }
	];

	// Create parent mapping for renderers
	const parents = bones.map(bone => bone.parent);
	
	// Store initial positions
	const initialPositions = bones.map(b => ({...b.pos}));
	
	// Helper function to rotate a 3D vector
	function rotateVector(v, angles) {
		let x = v.x; let y = v.y; let z = v.z;
		
		// Rotation around X axis
		if (angles.x !== 0) {
			const cos = Math.cos(angles.x);
			const sin = Math.sin(angles.x);
			const ny = y * cos - z * sin;
			const nz = y * sin + z * cos;
			y = ny; z = nz;
		}
		
		// Rotation around Y axis
		if (angles.y !== 0) {
			const cos = Math.cos(angles.y);
			const sin = Math.sin(angles.y);
			const nx = x * cos + z * sin;
			const nz = -x * sin + z * cos;
			x = nx; z = nz;
		}
		
		// Rotation around Z axis
		if (angles.z !== 0) {
			const cos = Math.cos(angles.z);
			const sin = Math.sin(angles.z);
			const nx = x * cos - y * sin;
			const ny = x * sin + y * cos;
			x = nx; y = ny;
		}
		
		return { x, y, z };
	}
	
	// Forward kinematics update function
	function updateBonePositions() {
		for (let i = 0; i < bones.length; i++) {
			const bone = bones[i];
			if (bone.parent < 0) {
				// Root bone stays at initial position
				bone.pos = { ...initialPositions[i] };
				continue;
			}
			
			// Find joint affecting this bone
			const joint = joints.find(j => j.child === i);
			const parentBone = bones[bone.parent];
			const offset = {
				x: initialPositions[i].x - initialPositions[bone.parent].x,
				y: initialPositions[i].y - initialPositions[bone.parent].y,
				z: initialPositions[i].z - initialPositions[bone.parent].z
			};
			
			if (!joint) {
				// No joint, use unrotated offset
				bone.pos = {
					x: parentBone.pos.x + offset.x,
					y: parentBone.pos.y + offset.y,
					z: parentBone.pos.z + offset.z
				};
			} else {
				// Apply joint rotation
				const rotated = rotateVector(offset, joint.currentAngles);
				bone.pos = {
					x: parentBone.pos.x + rotated.x,
					y: parentBone.pos.y + rotated.y,
					z: parentBone.pos.z + rotated.z
				};
			}
		}
	}

	return {
		getBoneCount: () => bones.length,
		getJointCount: () => joints.length,
		getBonePosition: (index) => bones[index] ? { ...bones[index].pos } : { x: 0, y: 0, z: 0 },
		getBoneRotation: (index) => ({ x: 0, y: 0, z: 0, w: 1 }),
		getBoneName: (index) => bones[index] ? bones[index].name : 'bone_' + index,
		getBoneLength: (index) => bones[index] ? bones[index].length : 0.1,
		getBoneRadius: (index) => bones[index] ? bones[index].radius : 0.02,
		getJointName: (index) => joints[index] ? joints[index].name : 'joint_' + index,
		getJointChildBoneIndex: (index) => joints[index] ? joints[index].child : -1,
		computeCenterOfMass: () => ({ x: 0, y: 1.2, z: 0 }),
		update: (dt) => {
			// Smoothly interpolate current angles toward target angles
			for (const joint of joints) {
				const lerpFactor = Math.min(1.0, dt * 5.0);
				joint.currentAngles.x += (joint.targetAngles.x - joint.currentAngles.x) * lerpFactor;
				joint.currentAngles.y += (joint.targetAngles.y - joint.currentAngles.y) * lerpFactor;
				joint.currentAngles.z += (joint.targetAngles.z - joint.currentAngles.z) * lerpFactor;
			}
			// Apply forward kinematics
			updateBonePositions();
		},
		setPhysicsEnabled: (enabled) => {
			console.log('[JS Fallback] Physics enabled:', enabled);
		},
		setGravityEnabled: (enabled) => {
			console.log('[JS Fallback] Gravity enabled:', enabled);
		},
		setGlobalStiffness: (stiffness) => {
			console.log('[JS Fallback] Global stiffness:', stiffness);
		},
		setGlobalDamping: (damping) => {
			console.log('[JS Fallback] Global damping:', damping);
		},
		setJointTargetAngles: (jointIndex, x, y, z) => {
			if (joints[jointIndex]) {
				console.log(`[JS Fallback] setJointTargetAngles: joint ${jointIndex} (${joints[jointIndex].name}) to [${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`);
				joints[jointIndex].targetAngles = { x, y, z };
			} else {
				console.warn(`[JS Fallback] setJointTargetAngles: joint ${jointIndex} not found`);
			}
		},
		__boneParents: parents
	};
}


