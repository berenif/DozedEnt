// Coordinates renderer, interaction, and UI around the skeleton

import { SkeletonInteractionController } from '../controllers/skeleton/SkeletonInteractionController.js';
import { SkeletonUIController } from '../controllers/skeleton/SkeletonUIController.js';
import { createCanvasRenderer } from '../adapters/SkeletonFactory.js';

export class SkeletonCoordinator {
	constructor(skeleton) {
		this.skeleton = skeleton;
		this.renderer = null;
		this.interaction = null;
		this.ui = null;
	}

	attachTo(container) {
		const canvas = document.createElement('canvas');
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		canvas.style.display = 'block';
		container.innerHTML = '';
		container.appendChild(canvas);

		this.renderer = createCanvasRenderer(canvas);
		this.renderer.camera.zoom = 0.9;
		this.renderer.camera.z = 2.0;
		this.renderer.camera.y = 1.2;

		this.interaction = new SkeletonInteractionController(this.renderer, this.skeleton);
		this.ui = new SkeletonUIController(this.skeleton, this.renderer);
		this.ui.setupUI();
		this.ui.updateInfo();
	}
}


