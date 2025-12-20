// Draw a human skeleton using simple capsules and depth-sorted joints

export class SkeletonCanvasRenderer {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		// Camera positioned for top-down/isometric view
		// rotX: tilt down to see from above; rotY: slight angle for 3D depth
		this.camera = { x: 0, y: 0.3, z: 0.8, rotX: -0.6, rotY: 0.3, zoom: 2.0 };
		this.colors = {
			bone: '#3be26f',
			joint: '#ff5252',
			left: '#4da6ff',
			right: '#ffaf40'
		};
		this.showBones = true;
		this.showJoints = true;
		this.showCOM = false;
		this.showLimits = false;
		this.showIKTargets = false;
		this._ikTarget = null;
	}

	// Simple perspective-ish projection
	_worldToScreen(p) {
		const scale = 200 * this.camera.zoom;
		// Rotate around Y then X
		const cy = Math.cos(this.camera.rotY);
		const sy = Math.sin(this.camera.rotY);
		const cx = Math.cos(this.camera.rotX);
		const sx = Math.sin(this.camera.rotX);
		let x = p.x * cy - p.z * sy;
		let y = p.y;
		let z = p.x * sy + p.z * cy;
		const ty = y * cx - z * sx;
		z = y * sx + z * cx;
		y = ty;
		// Camera translate
		x -= this.camera.x;
		y -= this.camera.y;
		z -= this.camera.z;
		// Prevent near-camera magnification for negative z; clamp depth to [~0.5..1]
		const depth = 1 / (1 + Math.max(0, z));
		return { x: this.canvas.width / 2 + x * scale * depth, y: this.canvas.height / 2 - y * scale * depth, z, depth };
	}

	// Public helpers
	worldToScreen(p) {
		return this._worldToScreen(p);
	}

	screenToWorld2D(screenX, screenY) {
		// Approximate inverse of worldToScreen on z-plane near the skeleton
		const scale = 200 * this.camera.zoom;
		let x = (screenX - this.canvas.width / 2) / scale;
		let y = (this.canvas.height / 2 - screenY) / scale;
		// Undo camera translation only (approximate – ignoring rotation)
		x += this.camera.x;
		y += this.camera.y;
		return { x, y, z: 0 };
	}

	_drawCapsule(a, b, radius, color) {
		const A = this._worldToScreen(a);
		const B = this._worldToScreen(b);
		const ctx = this.ctx;
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(2, radius * 240 * this.camera.zoom * ((A.depth + B.depth) * 0.5));
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(A.x, A.y);
		ctx.lineTo(B.x, B.y);
		ctx.stroke();
	}

	_drawJoint(p, radius, color) {
		const S = this._worldToScreen(p);
		const r = Math.max(2, radius * 200 * this.camera.zoom * S.depth);
		const ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(S.x, S.y, r, 0, Math.PI * 2);
		ctx.fill();
	}

	setIkTarget(target) {
		this._ikTarget = target ? { x: target.x, y: target.y, z: target.z ?? 0 } : null;
	}

	_drawIkTarget() {
		if (!this.showIKTargets || !this._ikTarget) {
			return;
		}
		const { x, y } = this._worldToScreen(this._ikTarget);
		const ctx = this.ctx;
		ctx.save();
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x - 10, y);
		ctx.lineTo(x + 10, y);
		ctx.moveTo(x, y - 10);
		ctx.lineTo(x, y + 10);
		ctx.stroke();
		ctx.restore();
	}

	_drawCenterOfMass(skeleton) {
		if (!this.showCOM) {
			return;
		}
		let com = null;
		if (typeof skeleton.computeCenterOfMass === 'function') {
			com = skeleton.computeCenterOfMass();
		} else if (typeof skeleton.getCenterOfMass === 'function') {
			com = skeleton.getCenterOfMass();
		}
		if (!com || !Number.isFinite(com.x) || !Number.isFinite(com.y)) {
			return;
		}
		const screen = this._worldToScreen(com);
		const ctx = this.ctx;
		ctx.save();
		ctx.fillStyle = '#fffb30';
		ctx.strokeStyle = '#fffb30';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(screen.x - 8, screen.y);
		ctx.lineTo(screen.x + 8, screen.y);
		ctx.moveTo(screen.x, screen.y - 8);
		ctx.lineTo(screen.x, screen.y + 8);
		ctx.stroke();
		ctx.restore();
	}

	render(skeleton) {
		const ctx = this.ctx;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw bones using parent mapping if available
		const count = skeleton.getBoneCount();
		if (this.showBones) {
			const parents = skeleton.__boneParents;
			if (Array.isArray(parents) && parents.length === count) {
				for (let i = 0; i < count; i++) {
					const parent = parents[i];
					if (parent !== null && parent !== -1 && parent >= 0) {
						this._drawCapsule(
							skeleton.getBonePosition(parent),
							skeleton.getBonePosition(i),
							skeleton.getBoneRadius(i) * 2.0,
							this.colors.bone
						);
					}
				}
			} else {
				// Fallback: use bone name-based parent mapping
				const parentMap = this._buildParentMap();
				for (let i = 0; i < count; i++) {
					const name = skeleton.getBoneName(i);
					const pos = skeleton.getBonePosition(i);
					const parent = parentMap[name];
					if (parent) {
						const mapIndex = this._findBoneIndex(skeleton, count, parent);
						if (mapIndex >= 0) {
							this._drawCapsule(
								skeleton.getBonePosition(mapIndex),
								pos,
								skeleton.getBoneRadius(i) * 2.0,
								this.colors.bone
							);
						}
					}
				}
			}
		}
		ctx.globalAlpha = 1;

		// Draw joints on top
		if (this.showJoints) {
			for (let i = 0; i < count; i++) {
				const pos = skeleton.getBonePosition(i);
				const name = skeleton.getBoneName(i);
				const c = name.endsWith('_L') ? this.colors.left :
				          name.endsWith('_R') ? this.colors.right :
				          this.colors.joint;
				this._drawJoint(pos, Math.max(0.012, skeleton.getBoneRadius(i) * 1.2), c);
			}
		}

		this._drawCenterOfMass(skeleton);
		this._drawIkTarget();
	}

	// Build parent mapping for top-down skeleton bone names
	_buildParentMap() {
		return {
			// Spine chain
			'spine_01': 'pelvis',
			'spine_02': 'spine_01',
			'spine_03': 'spine_02',
			'chest': 'spine_03',
			'neck': 'chest',
			'head': 'neck',
			// Right arm chain
			'clav_R': 'chest',
			'upperArm_R': 'clav_R',
			'forearm_R': 'upperArm_R',
			'hand_R': 'forearm_R',
			// Left arm chain
			'clav_L': 'chest',
			'upperArm_L': 'clav_L',
			'forearm_L': 'upperArm_L',
			'hand_L': 'forearm_L',
			// Right leg chain
			'thigh_R': 'pelvis',
			'shin_R': 'thigh_R',
			'foot_R': 'shin_R',
			'toe_R': 'foot_R',
			// Left leg chain
			'thigh_L': 'pelvis',
			'shin_L': 'thigh_L',
			'foot_L': 'shin_L',
			'toe_L': 'foot_L'
		};
	}

	// Find bone index by name
	_findBoneIndex(skeleton, count, name) {
		for (let j = 0; j < count; j++) {
			if (skeleton.getBoneName(j) === name) {
				return j;
			}
		}
		return -1;
	}
}


