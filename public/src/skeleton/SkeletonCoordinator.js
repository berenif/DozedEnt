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
		this.canvas = null;
		this.container = null;
		this._resizeHandler = null;
	}

	attachTo(container) {
		this.container = container;
		const canvas = document.createElement('canvas');
		canvas.style.display = 'block';
		container.innerHTML = '';
		container.appendChild(canvas);
		this.canvas = canvas;

		this.renderer = createCanvasRenderer(canvas);
		this.renderer.camera.zoom = 0.9;
		this.renderer.camera.z = 2.0;
		this.renderer.camera.y = 1.2;

		this.interaction = new SkeletonInteractionController(this.renderer, this.skeleton);
		this.ui = new SkeletonUIController(this.skeleton, this.renderer);
		this.ui.setupUI();
		this.ui.updateInfo();

		this._resizeHandler = () => {
			this._resizeCanvas();
		};
		window.addEventListener('resize', this._resizeHandler);
		window.addEventListener('orientationchange', this._resizeHandler);
		this._resizeCanvas();
	}

	_resizeCanvas() {
		if (!this.canvas) {
			return;
		}
		const ratio = window.devicePixelRatio ?? 1;
		let width = window.innerWidth;
		let height = window.innerHeight;
		if (this.container) {
			const rect = this.container.getBoundingClientRect();
			if (rect.width > 0) {
				width = rect.width;
			}
			if (rect.height > 0) {
				height = rect.height;
			}
		}
		const scaledWidth = Math.max(1, Math.floor(width * ratio));
		const scaledHeight = Math.max(1, Math.floor(height * ratio));
		const cssWidth = Math.max(1, Math.round(width));
		const cssHeight = Math.max(1, Math.round(height));
		if (this.canvas.style.width !== `${cssWidth}px`) {
			this.canvas.style.width = `${cssWidth}px`;
		}
		if (this.canvas.style.height !== `${cssHeight}px`) {
			this.canvas.style.height = `${cssHeight}px`;
		}
		if (this.canvas.width !== scaledWidth || this.canvas.height !== scaledHeight) {
			this.canvas.width = scaledWidth;
			this.canvas.height = scaledHeight;
		}
	}

	detach() {
		if (this._resizeHandler) {
			window.removeEventListener('resize', this._resizeHandler);
			window.removeEventListener('orientationchange', this._resizeHandler);
			this._resizeHandler = null;
		}
		if (this.ui) {
			this.ui.cleanup();
			this.ui = null;
		}
		if (this.interaction) {
			this.interaction.destroy();
			this.interaction = null;
		}
		this.renderer = null;
		if (this.canvas && this.container && this.canvas.parentElement === this.container) {
			this.container.removeChild(this.canvas);
		}
		this.canvas = null;
		this.container = null;
	}
}


