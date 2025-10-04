import { config, setFlag } from './config.js';
import { createWasmApi } from './wasm-api.js';
import { createRenderer } from './renderer.js';
import { createInputManager } from '../managers/input-migration-adapter.js';
import { OrientationManager } from '../ui/orientation-manager.js';
import { AbilityManager, CHARACTER_TYPE } from '../game/abilities/ability-manager.js';
import { VFXManager } from '../game/vfx/vfx-manager.js';

import { registerDebugHelpers, createOverlayBuilder } from './debug-tools.js';
import { setupOrientation } from './orientation.js';
import { spawnWolvesIfAvailable } from './spawn-wolves.js';
import { createEntityCollector } from './entities.js';
import { createInputApplier } from './input-loop.js';
import { createGameLoop } from './game-loop.js';
import { clamp } from './utils.js';

const canvas = document.getElementById('demo-canvas');
if (!canvas) {
  throw new Error('demo canvas missing');
}

const renderer = createRenderer(canvas);
const wasmApi = await createWasmApi();

window.wasmApi = wasmApi;
window.renderer = renderer;

let inputManager = null;
let vfxManager = null;
let abilityManager = null;

if (wasmApi.exports?.init_run) {
  try {
    const seed = BigInt(Date.now());
    wasmApi.exports.init_run(seed, 0);

    const x = wasmApi.exports.get_x?.();
    const y = wasmApi.exports.get_y?.();
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.error('[Main] WASM init failed - position is NaN');
    } else {
      console.log('[Main] Player spawned successfully at', x, y);
    }
  } catch (error) {
    console.error('[Main] WASM initialization failed:', error);
  }
}

await new Promise((resolve) => setTimeout(resolve, 50));

inputManager = createInputManager(wasmApi, {
  useLegacyAdapter: true,
  debugMode: false
});

vfxManager = new VFXManager(canvas);
abilityManager = new AbilityManager(wasmApi, vfxManager, CHARACTER_TYPE.WARDEN);

registerDebugHelpers({ wasmApi, inputManagerRef: () => inputManager });
const buildOverlay = createOverlayBuilder({ wasmApi, config });

const orientationManager = setupOrientation(OrientationManager);
window.orientationManager = orientationManager;

const step = 1 / 60;
const maxSubSteps = 5;
const speed = Number.isFinite(config.speed) ? config.speed : 1;
const fpsCap = Number.isFinite(config.fps) ? Math.max(15, config.fps) : null;
const frameInterval = fpsCap ? 1000 / fpsCap : 0;

console.log('⚙️ Game speed:', speed, 'fps cap:', fpsCap || 'none');
if (fpsCap) {
  setFlag('fpsCap', fpsCap);
}

const optionalHandles = wasmApi.optionalHandles || {};
const gatherEntities = createEntityCollector(optionalHandles, clamp);
const applyInput = createInputApplier({ wasmApi, inputManagerRef: () => inputManager, clamp });

if (window.DZ) {
  window.DZ.inputManager = inputManager;
  window.DZ.vfxManager = vfxManager;
  window.DZ.abilityManager = abilityManager;
  window.DZ.enableInputDebug = () => {
    inputManager.setDebugMode(true);
    console.log('Input debug mode enabled');
  };
  window.DZ.disableInputDebug = () => {
    inputManager.setDebugMode(false);
    console.log('Input debug mode disabled');
  };
}

spawnWolvesIfAvailable(wasmApi, config.initialWolfCount ?? 5);

const loop = createGameLoop({
  wasmApi,
  renderer,
  canvas,
  config,
  applyInput,
  gatherEntities,
  buildOverlay,
  abilityManagerRef: () => abilityManager,
  vfxManagerRef: () => vfxManager,
  getInputManager: () => inputManager,
  speed,
  step,
  maxSubSteps,
  frameInterval,
  fpsCap,
  setFlag
});

loop.start();
