// Click-drag joint interaction with simple 2D IK for limbs

function dist(a, b) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.hypot(dx, dy);
}

function sub(a, b) {
	return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
}
function add(a, b) {
	return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) };
}
function scale(v, k) {
	return { x: v.x * k, y: v.y * k, z: (v.z || 0) * k };
}
function norm(v) {
	const m = Math.hypot(v.x, v.y, v.z || 0) || 1e-6;
	return scale(v, 1 / m);
}

export class SkeletonInteractionController {
	constructor(renderer, skeleton) {
		this.renderer = renderer;
		this.skeleton = skeleton;
		this.activeJoint = null;
		this.dragOffset = { x: 0, y: 0 };

		this._bind();
	}

	_bind() {
		const canvas = this.renderer.canvas;
		canvas.addEventListener('mousedown', (e) => this._onDown(e));
		canvas.addEventListener('touchstart', (e) => this._onDown(e.touches[0]));
		window.addEventListener('mousemove', (e) => this._onMove(e));
		window.addEventListener('touchmove', (e) => this._onMove(e.touches[0]));
		window.addEventListener('mouseup', () => this._onUp());
		window.addEventListener('touchend', () => this._onUp());
	}

	_findJointAt(screenX, screenY) {
		const radiusPx = 14;
		// Select by bone positions for visual hit-testing
		const count = this.skeleton.getBoneCount();
		let best = { idx: -1, d: Infinity };
		for (let i = 0; i < count; i++) {
			const p = this.skeleton.getBonePosition(i);
			const s = this.renderer.worldToScreen(p);
			const d = Math.hypot(s.x - screenX, s.y - screenY);
			if (d < radiusPx && d < best.d) {
				best = { idx: i, d };
			}
		}
		return best.idx;
	}

	_onDown(e) {
		const rect = this.renderer.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const idx = this._findJointAt(x, y);
		if (idx >= 0) {
			this.activeJoint = idx;
			const p = this.skeleton.getBonePosition(idx);
			const s = this.renderer.worldToScreen(p);
			this.dragOffset.x = s.x - x;
			this.dragOffset.y = s.y - y;
			// Precompute chain info and lengths to preserve proportions
			this._prepareChain(idx);
		}
	}

	_onMove(e) {
		if (this.activeJoint == null) {
			return;
		}
		const rect = this.renderer.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left + this.dragOffset.x;
		const y = e.clientY - rect.top + this.dragOffset.y;
		const target = this._screenToWorldOnDepth(x, y);
		this._applyIK3D(this.activeJoint, target);
	}

	_onUp() {
		this.activeJoint = null;
	}

	// Project to world using the current depth of the dragged joint
	_screenToWorldOnDepth(screenX, screenY) {
		const idx = this.activeJoint;
		const current = this.skeleton.getBonePosition(idx);
		// estimate by ignoring rotation while keeping same z
		const p = this.renderer.screenToWorld2D(screenX, screenY);
		return { x: p.x, y: p.y, z: current.z };
	}

	_prepareChain(endBoneIndex) {
		const name = this.skeleton.getBoneName(endBoneIndex);
		let midName;
		let rootName;
		const sideL = name.endsWith('_L');
		const sideSuffix = sideL ? '_L' : '_R';
		// Normalize by bone clicked
		if (name.includes('hand') || name.includes('wrist') || name.includes('forearm')) {
			midName = 'elbow' + sideSuffix;
			rootName = 'shoulder' + sideSuffix;
		} else if (name.includes('elbow') || name.includes('upperArm')) {
			midName = 'elbow' + sideSuffix;
			rootName = 'shoulder' + sideSuffix;
		} else if (name.includes('foot') || name.includes('ankle') || name.includes('shin')) {
			midName = 'knee' + sideSuffix;
			rootName = 'hip' + sideSuffix;
		} else if (name.includes('knee') || name.includes('thigh')) {
			midName = 'knee' + sideSuffix;
			rootName = 'hip' + sideSuffix;
		} else {
			this.dragChain = null;
			return;
		}

		// Map joint names to joint indices
		const jointIdxOf = (n) => {
			const c = this.skeleton.getJointCount();
			for (let i = 0; i < c; i++) if (this.skeleton.getJointName(i) === n) return i;
			return -1;
		};
		const jRoot = jointIdxOf(rootName);
		const jMid = jointIdxOf(midName);
		if (jRoot < 0 || jMid < 0) {
			this.dragChain = null;
			return;
		}

		// Resolve bone indices from joints for accurate positions
		const bRoot = this.skeleton.getJointChildBoneIndex(jRoot);
		const bMid = this.skeleton.getJointChildBoneIndex(jMid);
		const bEnd = endBoneIndex;

		const pRoot = this.skeleton.getBonePosition(bRoot);
		const pMid = this.skeleton.getBonePosition(bMid);
		const pEnd = this.skeleton.getBonePosition(bEnd);
		const L1 = dist(pRoot, pMid);
		const L2 = dist(pMid, pEnd);
		this.dragChain = { jRoot, jMid, bRoot, bMid, bEnd, L1, L2, side: sideL ? 'L' : 'R', isArm: name.includes('hand') || name.includes('wrist') || name.includes('elbow') || name.includes('upperArm') };
	}

	// Two-bone FABRIK in 3D preserving bone lengths
	_applyIK3D(endBoneIndex, target) {
		if (!this.dragChain || this.dragChain.bEnd !== endBoneIndex) {
			this._prepareChain(endBoneIndex);
		}
		const chain = this.dragChain;
		if (!chain) {
			return;
		}
		const { bRoot, bMid, bEnd, L1, L2 } = chain;

		const p0 = this.skeleton.getBonePosition(bRoot);
		let p1 = this.skeleton.getBonePosition(bMid);
		let p2 = this.skeleton.getBonePosition(bEnd);
		const toTarget = dist(p0, target);
		const clamped = Math.max(1e-4, Math.min(L1 + L2 - 1e-4, toTarget));
		const cosA = (L1*L1 + L2*L2 - clamped*clamped) / (2*L1*L2);
		const cosB = (L1*L1 + clamped*clamped - L2*L2) / (2*L1*clamped);
		const angleA = Math.acos(cosA);
		const angleB = Math.acos(cosB);
		// FABRIK forward pass
		p2 = { ...target };
		p1 = add(p2, scale(norm(sub(p0, p2)), L2));
		// FABRIK backward pass
		p1 = add(p0, scale(norm(sub(p1, p0)), L1));
		p2 = add(p1, scale(norm(sub(target, p1)), L2));

		// Convert IK positions to joint angles and send to WASM model
		const vec = (a, b) => sub(b, a);
		const vRoot = vec(p0, p1);
		const vEnd = vec(p1, p2);
		const horiz = Math.hypot(vRoot.x, vRoot.z) || 1e-6;
		let yaw = Math.atan2(vRoot.x, vRoot.z); // rotate around Y
		let pitch = Math.atan2(vRoot.y, horiz); // rotate around X
		// Clamp within plausible human ranges matching WASM joint limits
		const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
		pitch = clamp(pitch, -2.09, 0.52); // hip flex -120..+30 deg or shoulder approx
		yaw = clamp(yaw, -Math.PI, Math.PI);
		const dot = v => v.x*v.x + v.y*v.y + v.z*v.z;
		let elbow = Math.acos(Math.max(-1, Math.min(1, (vRoot.x*vEnd.x + vRoot.y*vEnd.y + vRoot.z*vEnd.z) / (Math.sqrt(dot(vRoot)) * Math.sqrt(dot(vEnd)) ))));
		elbow = clamp(elbow, 0, 2.62); // 0..150 deg

		// Joint indices
		const jRoot = chain.jRoot; // shoulder or hip
		const jMid = chain.jMid;   // elbow or knee

		// Shoulder/Hip: use (x=pitch, y=yaw, z=0)
		try { this.skeleton.setJointTargetAngles(jRoot, pitch, yaw, 0); } catch (error) {
		  console.warn('Failed to set joint target angles for root:', error);
		}
		// Elbow/Knee hinge about X
		try { this.skeleton.setJointTargetAngles(jMid, elbow, 0, 0); } catch (error) {
		  console.warn('Failed to set joint target angles for mid:', error);
		}
	}
}


