import { loadWasmModule, createWasmSkeleton } from './WasmLoaderService.js';

export class SkeletonManager {
	constructor() {
		this.skeleton = null;
	}

	async initializePreferred() {
		await loadWasmModule();
		this.skeleton = createWasmSkeleton();
		return this.skeleton;
	}
}
