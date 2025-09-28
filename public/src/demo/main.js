import { config, setFlag } from './config.js';
import { createWasmApi } from './wasm-api.js';
import { createRenderer } from './renderer.js';
import { InputManager } from '../input/input-manager.js';

const canvas = document.getElementById('demo-canvas');
if (!canvas) {
  throw new Error('demo canvas missing');
}

const renderer = createRenderer(canvas);
const wasmApi = await createWasmApi();
const inputManager = new InputManager(null);

const step = 1 / 60;
const maxSubSteps = 5;
const speed = Number.isFinite(config.speed) ? config.speed : 1;
const fpsCap = Number.isFinite(config.fps) ? Math.max(15, config.fps) : null;
const frameInterval = fpsCap ? 1000 / fpsCap : 0;

setFlag('timescale', speed);
if (fpsCap) {
  setFlag('fpsCap', fpsCap);
}

const optionalHandles = wasmApi.optionalHandles || {};

const placeholderWorld = [
  { x: -2.4, y: 1.2, r: 0.8, type: 'obstacle' },
  { x: 1.8, y: 2.4, r: 0.6, type: 'obstacle' },
  { x: 0, y: 3.2, r: 0.45, type: 'landmark' }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const gatherEntities = () => {
  const entities = [];

  const countFn = optionalHandles.get_obstacle_count;
  const obstacleX = optionalHandles.get_obstacle_x;
  const obstacleY = optionalHandles.get_obstacle_y;
  const obstacleR = optionalHandles.get_obstacle_r;

  if (typeof countFn === 'function' && typeof obstacleX === 'function' && typeof obstacleY === 'function') {
    const count = clamp(Number(countFn()), 0, 24);
    for (let i = 0; i < count; i += 1) {
      entities.push({
        x: Number(obstacleX(i)),
        y: Number(obstacleY(i)),
        r: Math.max(0.2, Number(obstacleR?.(i) ?? 0.6)),
        type: 'obstacle'
      });
    }
  }

  const landmarkCount = optionalHandles.get_landmark_count;
  const landmarkX = optionalHandles.get_landmark_x;
  const landmarkY = optionalHandles.get_landmark_y;
  const landmarkR = optionalHandles.get_landmark_r;

  if (typeof landmarkCount === 'function' && typeof landmarkX === 'function' && typeof landmarkY === 'function') {
    const count = clamp(Number(landmarkCount()), 0, 16);
    for (let i = 0; i < count; i += 1) {
      entities.push({
        x: Number(landmarkX(i)),
        y: Number(landmarkY(i)),
        r: Math.max(0.2, Number(landmarkR?.(i) ?? 0.5)),
        type: 'landmark'
      });
    }
  }

  return entities.length ? entities : placeholderWorld;
};

let accumulator = 0;
let lastTime = performance.now();
let lastRenderTime = lastTime;
let fpsTimer = 0;
let framesSinceSample = 0;
let fpsValue = 0;
let lastOverlayUpdate = 0;
let memorySampleTimer = 0;
let memoryInfo = 'n/a';

const overlayLines = [];

const buildOverlay = (state, now) => {
  if (!config.debug) return null;

  if (now - memorySampleTimer > 5000) {
    memorySampleTimer = now;
    const perfMemory = performance?.memory;
    if (perfMemory && perfMemory.usedJSHeapSize) {
      const usedMb = perfMemory.usedJSHeapSize / (1024 * 1024);
      memoryInfo = `${usedMb.toFixed(1)} MB`;
    }
  }

  overlayLines.length = 0;
  overlayLines.push(`fps: ${fpsValue.toFixed(1)}`);
  overlayLines.push(`pos: ${state.x.toFixed(2)}, ${state.y.toFixed(2)}`);
  overlayLines.push(`vel: ${state.vx.toFixed(2)}, ${state.vy.toFixed(2)}`);
  overlayLines.push(`anim: ${state.anim} (${state.animT.toFixed(2)}s)`);
  overlayLines.push(`roll: ${state.rolling ? 'on' : 'off'} block: ${state.block ? 'on' : 'off'}`);
  overlayLines.push(`stam: ${(state.stamina * 100).toFixed(0)}% hp: ${(state.hp * 100).toFixed(0)}%`);
  overlayLines.push(`loader: ${wasmApi.loaderInfo.mode} fallback: ${wasmApi.isFallback ? 'yes' : 'no'}`);
  if (fpsCap) {
    overlayLines.push(`fps cap: ${fpsCap}`);
  }
  overlayLines.push(`heap: ${memoryInfo}`);

  return { debug: true, lines: [...overlayLines] };
};

const applyInput = () => {
  const input = inputManager.inputState;
  const dirX = clamp(input.direction?.x ?? 0, -1, 1);
  const dirY = clamp(input.direction?.y ?? 0, -1, 1);
  wasmApi.setPlayerInput(
    dirX,
    dirY,
    input.roll ? 1 : 0,
    input.jump ? 1 : 0,
    input.lightAttack ? 1 : 0,
    input.heavyAttack ? 1 : 0,
    input.block ? 1 : 0,
    input.special ? 1 : 0
  );
};

const frame = (now) => {
  const deltaSeconds = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += deltaSeconds * speed;

  let iterations = 0;
  while (accumulator >= step && iterations < maxSubSteps) {
    applyInput();
    wasmApi.update(step);
    accumulator -= step;
    iterations += 1;
  }

  if (iterations === maxSubSteps) {
    accumulator = 0;
  }

  let renderDue = true;
  if (frameInterval) {
    if (now - lastRenderTime < frameInterval) {
      renderDue = false;
    }
  }

  if (renderDue) {
    const state = wasmApi.getPlayerState();
    const overlayInfo = config.debug && now - lastOverlayUpdate > 200 ? buildOverlay(state, now) : (config.debug ? { debug: true, lines: overlayLines } : null);
    if (config.debug && now - lastOverlayUpdate > 200) {
      lastOverlayUpdate = now;
    }

    renderer.clear();
    renderer.drawObstacles(gatherEntities());
    renderer.drawPlayer(state);
    renderer.drawOverlays(state, overlayInfo);
    lastRenderTime = now;
  }

  framesSinceSample += 1;
  fpsTimer += deltaSeconds;
  if (fpsTimer >= 1) {
    fpsValue = framesSinceSample / fpsTimer;
    framesSinceSample = 0;
    fpsTimer = 0;
    setFlag('fps', fpsValue);
  }

  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
