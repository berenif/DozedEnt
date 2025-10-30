import { SkeletonCanvasRenderer } from '../renderer/skeleton/SkeletonCanvasRenderer.js';
import { applyPoseByName } from '../controllers/skeleton/pose-presets.js';

export function createCanvasRenderer(canvas) {
	return new SkeletonCanvasRenderer(canvas);
}

export function applyPose(skeleton, name) {
	applyPoseByName(skeleton, name);
}
