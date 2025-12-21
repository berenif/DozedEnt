// WASM module loader for skeleton physics
// Handles loading and initialization of the WebAssembly physics engine
// Updated to use TopDownHumanProportions for proper isometric view

import {
	createTopDownBoneDefinitions,
	createTopDownJointDefinitions,
	computeAbsolutePositions
} from './TopDownHumanProportions.js';

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

// JavaScript fallback skeleton implementation using top-down proportions
function createJavaScriptSkeleton() {
	console.log('Creating JavaScript skeleton with top-down proportions...');
	
	// Get bone and joint definitions from proportions module
	const boneDefs = createTopDownBoneDefinitions(1.0);
	const jointDefs = createTopDownJointDefinitions();
	const bonesWithPositions = computeAbsolutePositions(boneDefs);
	
	// Build bone array with computed world positions
	const bones = bonesWithPositions.map((def) => ({
		name: def.name,
		parent: def.parent === -1 ? -1 : bonesWithPositions.findIndex(b => b.name === def.parent),
		pos: { x: def.worldPos.x, y: def.worldPos.z, z: def.worldPos.y }, // Swap Y/Z for renderer
		length: def.length,
		radius: def.radius,
		mass: def.mass
	}));

	// Build joint array with limits
	const joints = jointDefs.map((def) => {
		const parentIdx = bones.findIndex(b => b.name === def.parent);
		const childIdx = bones.findIndex(b => b.name === def.child);
		return {
			name: def.name,
			parent: parentIdx,
			child: childIdx,
			type: def.type,
			limits: [
				def.limits.minX, def.limits.minY, def.limits.minZ,
				def.limits.maxX, def.limits.maxY, def.limits.maxZ
			],
			targetAngles: { x: 0, y: 0, z: 0 },
			currentAngles: { x: 0, y: 0, z: 0 }
		};
	});

	// Create parent mapping for renderers
	const parents = bones.map(bone => bone.parent);
	
	// Store initial positions
	const initialPositions = bones.map(b => ({ ...b.pos }));
	
	// Helper function to rotate a 3D vector
	function rotateVector(v, angles) {
		let x = v.x;
		let y = v.y;
		let z = v.z;
		
		// Rotation around X axis
		if (angles.x !== 0) {
			const cos = Math.cos(angles.x);
			const sin = Math.sin(angles.x);
			const ny = y * cos - z * sin;
			const nz = y * sin + z * cos;
			y = ny;
			z = nz;
		}
		
		// Rotation around Y axis
		if (angles.y !== 0) {
			const cos = Math.cos(angles.y);
			const sin = Math.sin(angles.y);
			const nx = x * cos + z * sin;
			const nz = -x * sin + z * cos;
			x = nx;
			z = nz;
		}
		
		// Rotation around Z axis
		if (angles.z !== 0) {
			const cos = Math.cos(angles.z);
			const sin = Math.sin(angles.z);
			const nx = x * cos - y * sin;
			const ny = x * sin + y * cos;
			x = nx;
			y = ny;
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

	// Compute center of mass based on bone masses
	function computeCenterOfMass() {
		let totalMass = 0;
		const com = { x: 0, y: 0, z: 0 };
		for (const bone of bones) {
			totalMass += bone.mass;
			com.x += bone.pos.x * bone.mass;
			com.y += bone.pos.y * bone.mass;
			com.z += bone.pos.z * bone.mass;
		}
		if (totalMass > 0) {
			com.x /= totalMass;
			com.y /= totalMass;
			com.z /= totalMass;
		}
		return com;
	}

	return {
		getBoneCount: () => bones.length,
		getJointCount: () => joints.length,
		getBonePosition: (index) => bones[index] ? { ...bones[index].pos } : { x: 0, y: 0, z: 0 },
		getBoneRotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
		getBoneName: (index) => bones[index] ? bones[index].name : 'bone_' + index,
		getBoneLength: (index) => bones[index] ? bones[index].length : 0.1,
		getBoneRadius: (index) => bones[index] ? bones[index].radius : 0.02,
		getJointName: (index) => joints[index] ? joints[index].name : 'joint_' + index,
		getJointChildBoneIndex: (index) => joints[index] ? joints[index].child : -1,
		computeCenterOfMass,
		getCenterOfMass: computeCenterOfMass,
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
		setPhysicsEnabled: () => {},
		setGravityEnabled: () => {},
		setGlobalStiffness: () => {},
		setGlobalDamping: () => {},
		setJointTargetAngles: (jointIndex, x, y, z) => {
			if (joints[jointIndex]) {
				joints[jointIndex].targetAngles = { x, y, z };
			}
		},
		__boneParents: parents
	};
}

export function createWasmSkeleton() {
	if (!WasmModule || !WasmModule.Skeleton) {
		console.log('Creating JavaScript fallback skeleton...');
		return createJavaScriptSkeleton();
	}
	
	console.log('Creating WASM skeleton with top-down optimized proportions...');
	const skeleton = new WasmModule.Skeleton();

	// Get bone and joint definitions from proportions module
	const boneDefs = createTopDownBoneDefinitions(1.0);
	const jointDefs = createTopDownJointDefinitions();
	
	// Track bone parent indices and name-to-index mapping
	const parents = [];
	const boneIndexMap = new Map();
	
	// Add bones using top-down optimized proportions
	boneDefs.forEach((def) => {
		const parentIndex = def.parent === -1 ? -1 : boneIndexMap.get(def.parent);
		const resolvedParent = (parentIndex !== null && parentIndex !== void 0) ? parentIndex : -1;
		const boneIdx = skeleton.addBone(
			def.name,
			resolvedParent,
			def.offset.x,
			def.offset.z, // Z becomes Y (vertical) in WASM
			def.offset.y, // Y becomes Z (depth) in WASM
			def.length,
			def.radius,
			def.mass
		);
		boneIndexMap.set(def.name, boneIdx);
		parents[boneIdx] = resolvedParent;
	});
	
	// Add joints using definitions from proportions module
	jointDefs.forEach((def) => {
		const parentIdx = boneIndexMap.get(def.parent);
		const childIdx = boneIndexMap.get(def.child);
		const hasParent = parentIdx !== null && parentIdx !== void 0;
		const hasChild = childIdx !== null && childIdx !== void 0;
		if (hasParent && hasChild) {
			skeleton.addJoint(
				def.name,
				parentIdx,
				childIdx,
				def.type,
				def.limits.minX, def.limits.minY, def.limits.minZ,
				def.limits.maxX, def.limits.maxY, def.limits.maxZ,
				def.stiffness,
				def.damping
			);
		}
	});
	
	console.log('WASM skeleton created. Bones:', skeleton.getBoneCount(), 'Joints:', skeleton.getJointCount());
	// Attach parents array for renderers/interactions
	try {
		Object.defineProperty(skeleton, '__boneParents', {
			value: parents,
			enumerable: false,
			configurable: true
		});
	} catch (error) {
		console.warn('Failed to set bone parents property:', error);
	}
	return skeleton;
}
