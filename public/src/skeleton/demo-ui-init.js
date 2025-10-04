// UI bootstrap for the interactive skeleton physics demo
// Extracted from the HTML inline <script type="module"> block

import { initSkeletonDemo, startAnimationLoop, setLoadingStatusCallback } from './demo-init.js';

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

        startAnimationLoop(demo);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        updateLoadStatus('Error: ' + error.message);
    }
}


