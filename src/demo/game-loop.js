export function createGameLoop({
  wasmApi,
  renderer,
  canvas,
  config,
  applyInput,
  gatherEntities,
  buildOverlay,
  abilityManagerRef,
  vfxManagerRef,
  getInputManager,
  speed,
  step,
  maxSubSteps,
  frameInterval,
  fpsCap,
  setFlag
}) {
  let accumulator = 0;
  let lastTime = performance.now();
  let lastRenderTime = lastTime;
  let fpsTimer = 0;
  let framesSinceSample = 0;
  let fpsValue = 0;
  let lastOverlayUpdate = 0;

  const frame = (now) => {
    const deltaSeconds = Math.min(0.25, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += deltaSeconds * speed;

    let iterations = 0;
    while (accumulator >= step && iterations < maxSubSteps) {
      const beforeX = wasmApi.exports.get_x?.();
      const beforeY = wasmApi.exports.get_y?.();

      applyInput();

      const abilityManager = abilityManagerRef?.();
      const inputManager = getInputManager?.();
      if (abilityManager && inputManager) {
        abilityManager.update(step, inputManager.inputState);
      }

      const vfxManager = vfxManagerRef?.();
      if (vfxManager) {
        vfxManager.update(step);
      }

      wasmApi.update(step);

      const afterX = wasmApi.exports.get_x?.();
      const afterY = wasmApi.exports.get_y?.();

      if (Number.isFinite(beforeX) && Number.isFinite(beforeY) && (!Number.isFinite(afterX) || !Number.isFinite(afterY))) {
        console.error('Corruption detected in update loop');
        console.error('  Before update:', beforeX, beforeY);
        console.error('  After update:', afterX, afterY);
        console.error('  dt:', step);
      }

      accumulator -= step;
      iterations += 1;
    }

    if (iterations === maxSubSteps) {
      accumulator = 0;
    }

    let renderDue = true;
    if (frameInterval && now - lastRenderTime < frameInterval) {
      renderDue = false;
    }

    if (renderDue) {
      const state = wasmApi.getPlayerState();
      const overlayInfo = buildOverlay ? buildOverlay(state, now, fpsValue, fpsCap) : null;

      renderer.clear();
      renderer.drawObstacles(gatherEntities());
      renderer.drawWolves({ ...wasmApi.exports, ...(wasmApi.optionalHandles || {}) });
      renderer.drawPlayer(state);

      const abilityManager = abilityManagerRef?.();
      if (abilityManager) {
        const cameraState = {
          x: state.x || 0.5,
          y: state.y || 0.5,
          scale: 1.0,
          width: canvas.width,
          height: canvas.height
        };
        abilityManager.render(renderer.ctx, cameraState);
      }

      const vfxManager = vfxManagerRef?.();
      if (vfxManager) {
        const cameraState = {
          x: state.x || 0.5,
          y: state.y || 0.5,
          scale: 1.0,
          width: canvas.width,
          height: canvas.height
        };
        vfxManager.render(renderer.ctx, cameraState);
      }

      renderer.drawOverlays(state, overlayInfo);
      lastRenderTime = now;
      if (config.debug && now - lastOverlayUpdate > 200) {
        lastOverlayUpdate = now;
      }
    }

    framesSinceSample += 1;
    fpsTimer += deltaSeconds;
    if (fpsTimer >= 1) {
      fpsValue = framesSinceSample / fpsTimer;
      framesSinceSample = 0;
      fpsTimer = 0;
      setFlag?.('fps', fpsValue);
    }

    requestAnimationFrame(frame);
  };

  return {
    start() {
      requestAnimationFrame(frame);
    }
  };
}
