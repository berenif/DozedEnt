// Main initialization for skeleton physics demo
// Orchestrates loading, setup, and animation loop

import { SkeletonManager } from './SkeletonManager.js';
import { SkeletonCoordinator } from './SkeletonCoordinator.js';
import { IdleAnimation } from '../controllers/skeleton/idle-animation.js';
import { applyPoseByName } from '../controllers/skeleton/pose-presets.js';

/**
 * Loading status callback
 */
let statusCallback = null;

export function setLoadingStatusCallback(callback) {
    statusCallback = callback;
}

function updateStatus(message) {
    if (statusCallback) {
        statusCallback(message);
    }
    console.log('Status:', message);
}

/**
 * Initialize skeleton physics demo
 * @param {HTMLElement} canvasContainer - Container element for canvas
 * @returns {Promise<Object>} Demo instance with skeleton, renderer, and controllers
 */
export async function initSkeletonDemo(canvasContainer) {
    updateStatus('Loading WebAssembly module...');
    const manager = new SkeletonManager();
    const skeleton = await manager.initializePreferred();
    updateStatus('Creating WASM skeleton...');

    updateStatus('Initializing renderer...');
    const coordinator = new SkeletonCoordinator(skeleton);
    coordinator.attachTo(canvasContainer);

    // Ensure simulation settings are sane even if UI isn't toggled yet
    if (typeof skeleton.setPhysicsEnabled === 'function') skeleton.setPhysicsEnabled(true);
    if (typeof skeleton.setGravityEnabled === 'function') skeleton.setGravityEnabled(true);
    if (typeof skeleton.setGlobalStiffness === 'function') skeleton.setGlobalStiffness(1.0);
    if (typeof skeleton.setGlobalDamping === 'function') skeleton.setGlobalDamping(1.0);

    // Start from a visible neutral pose
    try { applyPoseByName(skeleton, 'apose'); } catch (error) {
      console.warn('Failed to apply initial pose:', error);
    }

    const idle = new IdleAnimation(skeleton);
    updateStatus('Ready!');
    return {
        skeleton,
        renderer: coordinator.renderer,
        interactionController: coordinator.interaction,
        uiController: coordinator.ui,
        idle
    };
}

/**
 * Start animation loop
 * @param {Object} demo - Demo instance from initSkeletonDemo
 * @returns {Function} Stop function to halt animation
 */
export function startAnimationLoop(demo) {
    const { skeleton, renderer, idle } = demo;

    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = lastTime;
    let animationId = null;
    let isRunning = true;

    function animate() {
        if (!isRunning) return;

        animationId = requestAnimationFrame(animate);

        const currentTime = performance.now();
        const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
        lastTime = currentTime;

        // Idle animation updates joint targets first
        if (idle && idle.update) {
            idle.update(dt);
        }

        // Update physics
        const physicsStart = performance.now();
        if (skeleton.update) {
            skeleton.update(dt);
        }
        const physicsTime = performance.now() - physicsStart;

        // Render
        const renderStart = performance.now();
        renderer.render(skeleton);
        const renderTime = performance.now() - renderStart;

        // Update performance stats
        updatePerformanceStats(physicsTime, renderTime);

        // Update FPS
        frameCount++;
        if (frameCount % 30 === 0) {
            const fps = Math.round(30000 / (currentTime - lastFpsUpdate));
            updateFPS(fps);
            lastFpsUpdate = currentTime;
        }
    }

    animate();

    // Return stop function
    return () => {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    };
}

function updatePerformanceStats(physicsTime, renderTime) {
    const perfPhysics = document.getElementById('perf-physics');
    const perfRender = document.getElementById('perf-render');
    const perfTotal = document.getElementById('perf-total');

    if (perfPhysics) perfPhysics.textContent = physicsTime.toFixed(2) + 'ms';
    if (perfRender) perfRender.textContent = renderTime.toFixed(2) + 'ms';
    if (perfTotal) perfTotal.textContent = (physicsTime + renderTime).toFixed(2) + 'ms';
}

function updateFPS(fps) {
    const fpsElement = document.getElementById('fps');
    if (fpsElement) {
        fpsElement.textContent = fps;
    }
}
