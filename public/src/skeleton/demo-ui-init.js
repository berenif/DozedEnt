// UI bootstrap for the interactive skeleton physics demo
// Extracted from the HTML inline <script type="module"> block

import { destroySkeletonDemo, initSkeletonDemo, startAnimationLoop, setLoadingStatusCallback } from './demo-init.js';

export async function initializeSkeletonUI() {
    function updateLoadStatus(message) {
        const statusEl = document.getElementById('load-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    setLoadingStatusCallback(updateLoadStatus);

    try {
        const canvasContainer = document.getElementById('canvas-container');
        const demo = await initSkeletonDemo(canvasContainer);

        setTimeout(() => {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }
        }, 500);

        const stopLoop = startAnimationLoop(demo);
        const teardown = () => destroySkeletonDemo(demo, stopLoop);
        window.addEventListener('beforeunload', teardown, { once: true });
        window.addEventListener('pagehide', teardown, { once: true });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        updateLoadStatus('Error: ' + error.message);
    }
}


