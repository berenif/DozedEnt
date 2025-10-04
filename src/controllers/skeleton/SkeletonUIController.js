// UI controller for skeleton physics demo
// Handles all UI interactions and event bindings

import { applyPoseByName } from './pose-presets.js';
import { runJointTest, resetPose } from './test-animations.js';

export class SkeletonUIController {
	constructor(skeleton, renderer) {
		this.skeleton = skeleton;
		this.renderer = renderer;
		this.currentAnimation = null;
	}
	
	/**
	 * Setup all UI event listeners
	 */
	setupUI() {
		this._setupPoseButtons();
		this._setupPhysicsControls();
		this._setupVisualizationControls();
		this._setupTestButtons();
	}
	
	_setupPoseButtons() {
		const poses = ['apose', 'tpose', 'sit', 'squat', 'reach', 'wave'];
		poses.forEach(pose => {
			const btn = document.getElementById(`btn-${pose}`);
			if (btn) {
				btn.addEventListener('click', () => {
					this._stopCurrentAnimation();
					applyPoseByName(this.skeleton, pose);
				});
			}
		});
	}
	
	_setupPhysicsControls() {
		// Physics enable/disable
		const chkPhysics = document.getElementById('chk-physics');
		if (chkPhysics) {
			chkPhysics.addEventListener('change', (e) => {
				if (typeof this.skeleton.setPhysicsEnabled === 'function') {
					this.skeleton.setPhysicsEnabled(e.target.checked);
				}
			});
		}
		
		// Gravity enable/disable
		const chkGravity = document.getElementById('chk-gravity');
		if (chkGravity) {
			chkGravity.addEventListener('change', (e) => {
				if (typeof this.skeleton.setGravityEnabled === 'function') {
					this.skeleton.setGravityEnabled(e.target.checked);
				}
			});
		}
		
		// Stiffness slider
		const sliderStiffness = document.getElementById('slider-stiffness');
		const valStiffness = document.getElementById('val-stiffness');
		if (sliderStiffness && valStiffness) {
			sliderStiffness.addEventListener('input', (e) => {
				const value = parseFloat(e.target.value);
				valStiffness.textContent = value;
				if (typeof this.skeleton.setGlobalStiffness === 'function') {
					this.skeleton.setGlobalStiffness(value / 100);
				}
			});
		}
		
		// Damping slider
		const sliderDamping = document.getElementById('slider-damping');
		const valDamping = document.getElementById('val-damping');
		if (sliderDamping && valDamping) {
			sliderDamping.addEventListener('input', (e) => {
				const value = parseFloat(e.target.value);
				valDamping.textContent = value;
				if (typeof this.skeleton.setGlobalDamping === 'function') {
					this.skeleton.setGlobalDamping(value / 20);
				}
			});
		}
	}
	
	_setupVisualizationControls() {
		// Bones
		const chkBones = document.getElementById('chk-bones');
		if (chkBones) {
			chkBones.addEventListener('change', (e) => {
				this.renderer.showBones = e.target.checked;
			});
		}
		
		// Joints
		const chkJoints = document.getElementById('chk-joints');
		if (chkJoints) {
			chkJoints.addEventListener('change', (e) => {
				this.renderer.showJoints = e.target.checked;
			});
		}
		
		// Center of Mass
		const chkCOM = document.getElementById('chk-com');
		if (chkCOM) {
			chkCOM.addEventListener('change', (e) => {
				this.renderer.showCOM = e.target.checked;
			});
		}
		
		// Joint Limits
		const chkLimits = document.getElementById('chk-limits');
		if (chkLimits) {
			chkLimits.addEventListener('change', (e) => {
				if (this.renderer.showLimits !== undefined) {
					this.renderer.showLimits = e.target.checked;
				}
			});
		}
		
		// IK Targets
		const chkIKTargets = document.getElementById('chk-ik-targets');
		if (chkIKTargets) {
			chkIKTargets.addEventListener('change', (e) => {
				if (this.renderer.showIKTargets !== undefined) {
					this.renderer.showIKTargets = e.target.checked;
				}
			});
		}
	}
	
	_setupTestButtons() {
		// Shoulder test
		const btnTestShoulder = document.getElementById('btn-test-shoulder');
		if (btnTestShoulder) {
			btnTestShoulder.addEventListener('click', () => {
				this._stopCurrentAnimation();
				this.currentAnimation = runJointTest(this.skeleton, 'shoulder');
			});
		}
		
		// Elbow test
		const btnTestElbow = document.getElementById('btn-test-elbow');
		if (btnTestElbow) {
			btnTestElbow.addEventListener('click', () => {
				this._stopCurrentAnimation();
				this.currentAnimation = runJointTest(this.skeleton, 'elbow');
			});
		}
		
		// Knee test
		const btnTestKnee = document.getElementById('btn-test-knee');
		if (btnTestKnee) {
			btnTestKnee.addEventListener('click', () => {
				this._stopCurrentAnimation();
				this.currentAnimation = runJointTest(this.skeleton, 'knee');
			});
		}
		
		// Reset
		const btnReset = document.getElementById('btn-reset');
		if (btnReset) {
			btnReset.addEventListener('click', () => {
				this._stopCurrentAnimation();
				resetPose(this.skeleton);
			});
		}
	}
	
	_stopCurrentAnimation() {
		if (this.currentAnimation && this.currentAnimation.stop) {
			this.currentAnimation.stop();
			this.currentAnimation = null;
		}
	}
	
	/**
	 * Update info display
	 */
	updateInfo() {
		const boneCount = document.getElementById('bone-count');
		const jointCount = document.getElementById('joint-count');
		
		if (boneCount && this.skeleton.getBoneCount) {
			boneCount.textContent = this.skeleton.getBoneCount();
		}
		
		if (jointCount && this.skeleton.getJointCount) {
			jointCount.textContent = this.skeleton.getJointCount();
		}
	}
}


