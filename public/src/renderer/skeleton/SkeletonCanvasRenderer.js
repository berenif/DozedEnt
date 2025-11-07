// Draw a human skeleton using simple capsules and depth-sorted joints

export class SkeletonCanvasRenderer {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.camera = { x: 0, y: 1.0, z: 1.0, rotX: -0.2, rotY: 0.0, zoom: 1.6 };
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
					if (parent != null && parent >= 0) {
						this._drawCapsule(
							skeleton.getBonePosition(parent),
							skeleton.getBonePosition(i),
							skeleton.getBoneRadius(i) * 2.0,
							this.colors.bone
						);
					}
				}
			} else {
				for (let i = 0; i < count; i++) {
					const name = skeleton.getBoneName(i);
					const pos = skeleton.getBonePosition(i);
					let parent = null;
					if (name === 'knee_L') parent = 'hip_L';
					else if (name === 'ankle_L') parent = 'knee_L';
					else if (name === 'knee_R') parent = 'hip_R';
					else if (name === 'ankle_R') parent = 'knee_R';
					else if (name === 'elbow_L') parent = 'shoulder_L';
					else if (name === 'wrist_L') parent = 'elbow_L';
					else if (name === 'elbow_R') parent = 'shoulder_R';
					else if (name === 'wrist_R') parent = 'elbow_R';
					else if (name === 'shoulder_L' || name === 'shoulder_R') parent = 'chest';
					else if (name === 'chest') parent = 'spine_03';
					else if (name === 'spine_03') parent = 'spine_02';
					else if (name === 'spine_02') parent = 'spine_01';
					else if (name === 'spine_01') parent = 'pelvis';
					else if (name === 'neck') parent = 'chest';
					else if (name === 'head') parent = 'neck';
					else if (name === 'hip_L' || name === 'hip_R') parent = 'pelvis';
					else if (name === 'toe_L') parent = 'foot_L';
					else if (name === 'toe_R') parent = 'foot_R';
					if (parent) {
						const mapIndex = (() => {
							for (let j = 0; j < count; j++) {
								if (skeleton.getBoneName(j) === parent) return j;
							}
							return -1;
						})();
						if (mapIndex >= 0) {
							this._drawCapsule(skeleton.getBonePosition(mapIndex), pos, skeleton.getBoneRadius(i) * 2.0, this.colors.bone);
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
				const c = name.endsWith('_L') ? this.colors.left : name.endsWith('_R') ? this.colors.right : this.colors.joint;
				this._drawJoint(pos, Math.max(0.012, skeleton.getBoneRadius(i) * 1.2), c);
			}
		}

		this._drawCenterOfMass(skeleton);
		this._drawIkTarget();
	}
}


