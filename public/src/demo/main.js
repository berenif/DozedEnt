import { config, setFlag } from './config.js';
import { createWasmApi } from './wasm-api.js';
import { createRenderer } from './renderer.js';
// Import the new unified input system with legacy compatibility
import { createInputManager } from '../managers/input-migration-adapter.js';
// Import OrientationManager for mobile fullscreen and orientation lock
import { OrientationManager } from '../ui/orientation-manager.js';

const canvas = document.getElementById('demo-canvas');
if (!canvas) {
  throw new Error('demo canvas missing');
}

const renderer = createRenderer(canvas);
const wasmApi = await createWasmApi();

// Expose for debugging
window.wasmApi = wasmApi;
window.renderer = renderer;

// Will be set after inputManager is created
let inputManager = null;

// CRITICAL: Initialize WASM immediately after creation
// This ensures the player spawns at a valid position
if (wasmApi.exports?.init_run) {
  try {
    const seed = BigInt(Date.now());
    wasmApi.exports.init_run(seed, 0);
    console.log('✅ [Main] WASM initialized at', new Date().toLocaleTimeString());
    
    // CRITICAL: Clear all input states immediately after init
    // This prevents garbage memory values from causing auto-movement
    wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
    console.log('✅ [Main] Input state cleared');
    
    // Verify initialization worked
    let x = wasmApi.exports.get_x?.();
    let y = wasmApi.exports.get_y?.();
    console.log('✅ [Main] Player position after init_run:', x, y);
    
    // WORKAROUND: If position is corrupted, force it back to 0.5, 0.5
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x - 0.5) > 0.1 || Math.abs(y - 0.5) > 0.1) {
      console.warn('⚠️ [Main] Position corrupted after init_run, attempting fix...');
      
      // Use start() which also sets position to 0.5
      if (wasmApi.exports?.start) {
        wasmApi.exports.start();
        x = wasmApi.exports.get_x?.();
        y = wasmApi.exports.get_y?.();
        console.log('✅ [Main] Position after start():', x, y);
      }
    }
    
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.error('❌ [Main] WASM init failed - position is NaN');
    } else {
      console.log('✅ [Main] Player spawned successfully at', x, y);
    }
  } catch (initError) {
    console.error('❌ [Main] WASM initialization failed:', initError);
  }
}

// Small delay to ensure WASM is fully initialized before input manager
await new Promise(resolve => setTimeout(resolve, 50));

// Initialize unified input manager with legacy compatibility
inputManager = createInputManager(wasmApi, { 
  useLegacyAdapter: true, 
  debugMode: false 
});

// Expose input manager for debugging (extend existing window.DZ)
if (window.DZ) {
  window.DZ.inputManager = inputManager;
  window.DZ.enableInputDebug = () => {
    inputManager.setDebugMode(true);
    console.log('🐛 Input debug mode enabled');
  };
  window.DZ.disableInputDebug = () => {
    inputManager.setDebugMode(false);
    console.log('✅ Input debug mode disabled');
  };
}

// NOTE: Removed automatic delayed input clearing (lines 136-162)
// It was causing race conditions with user input and contradicting
// the proper initialization sequence in unified-input-manager.js
// The input manager already initializes with zero state by default

// Debug helper: Force clear attack state (defined after inputManager is ready)
window.clearAttacks = () => {
  console.log('🔧 Manually clearing attack states...');
  
  // Send zero inputs multiple times to force WASM to process it
  for (let i = 0; i < 10; i++) {
    wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
    wasmApi.update(1/60); // Force update to process
  }
  
  if (inputManager && inputManager.inputState) {
    inputManager.inputState.lightAttack = false;
    inputManager.inputState.heavyAttack = false;
    inputManager.inputState.special = false;
    inputManager.inputState.block = false;
  }
  
  const state = wasmApi.getPlayerState();
  console.log('✅ Attack states cleared. Animation now:', state.anim);
};

// Debug helper: Check movement state (defined after inputManager is ready)
window.checkMovement = () => {
  if (!inputManager) {
    console.warn('⚠️ Input manager not initialized yet');
    return;
  }
  
  const state = wasmApi.getPlayerState();
  console.log('📊 Movement Debug:');
  console.log('  Position:', state.x.toFixed(3), state.y.toFixed(3));
  console.log('  Velocity:', state.vx.toFixed(3), state.vy.toFixed(3));
  console.log('  Animation:', state.anim);
  console.log('  Stamina:', (state.stamina * 100).toFixed(0) + '%');
  console.log('  Block:', state.block ? 'YES (blocks movement!)' : 'no');
  console.log('  Rolling:', state.rolling ? 'YES' : 'no');
  
  const input = inputManager.inputState;
  console.log('  Input Dir:', input.direction.x.toFixed(2), input.direction.y.toFixed(2));
  console.log('  Attacks:', input.lightAttack ? 'LIGHT' : '', input.heavyAttack ? 'HEAVY' : '', input.special ? 'SPECIAL' : '');
  
  // Check for movement blockers
  if (state.block) console.warn('⚠️ BLOCK is active - this prevents movement!');
  if (state.anim === 'attacking') console.warn('⚠️ Attack animation may slow movement');
  if (state.stamina < 0.1) console.warn('⚠️ Low stamina may affect movement');
};

// Initialize OrientationManager for mobile devices
const orientationManager = new OrientationManager({
  detectMobileDevice: () => {
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallViewport = window.innerWidth <= 768;
    const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|ipad|tablet/;
    return mobileRegex.test(userAgent) || hasTouch || smallViewport;
  },
  onOrientationChange: (isLandscape) => {
    console.log('📱 Orientation changed:', isLandscape ? 'landscape' : 'portrait');
  }
});

// Initialize the orientation manager
orientationManager.initialize();

// Show mobile controls on touch devices
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const mobileControls = document.getElementById('mobile-controls');
  if (mobileControls) {
    mobileControls.style.display = 'flex';
    console.log('✅ Mobile controls enabled');
  }
  
  // Request fullscreen and orientation lock on mobile
  orientationManager.evaluateOrientation();
}

const step = 1 / 60;
const maxSubSteps = 5;
const speed = Number.isFinite(config.speed) ? config.speed : 1;
const fpsCap = Number.isFinite(config.fps) ? Math.max(15, config.fps) : null;

// Log game speed settings
console.log('⚙️ Game speed:', speed, 'fps cap:', fpsCap || 'none');
const frameInterval = fpsCap ? 1000 / fpsCap : 0;

setFlag('timescale', speed);
if (fpsCap) {
  setFlag('fpsCap', fpsCap);
}

const optionalHandles = wasmApi.optionalHandles || {};

const placeholderWorld = [
  // Obstacles removed - empty world for free movement
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const gatherEntities = () => {
  const entities = [];

  // OBSTACLES DISABLED - return empty array for free movement
  // const countFn = optionalHandles.get_obstacle_count;
  // const obstacleX = optionalHandles.get_obstacle_x;
  // const obstacleY = optionalHandles.get_obstacle_y;
  // const obstacleR = optionalHandles.get_obstacle_r;

  // if (typeof countFn === 'function' && typeof obstacleX === 'function' && typeof obstacleY === 'function') {
  //   const count = clamp(Number(countFn()), 0, 24);
  //   for (let i = 0; i < count; i += 1) {
  //     entities.push({
  //       x: Number(obstacleX(i)),
  //       y: Number(obstacleY(i)),
  //       r: Math.max(0.2, Number(obstacleR?.(i) ?? 0.6)),
  //       type: 'obstacle'
  //     });
  //   }
  // }

  // LANDMARKS DISABLED
  // const landmarkCount = optionalHandles.get_landmark_count;
  // const landmarkX = optionalHandles.get_landmark_x;
  // const landmarkY = optionalHandles.get_landmark_y;
  // const landmarkR = optionalHandles.get_landmark_r;

  // if (typeof landmarkCount === 'function' && typeof landmarkX === 'function' && typeof landmarkY === 'function') {
  //   const count = clamp(Number(landmarkCount()), 0, 16);
  //   for (let i = 0; i < count; i += 1) {
  //     entities.push({
  //       x: Number(landmarkX(i)),
  //       y: Number(landmarkY(i)),
  //       r: Math.max(0.2, Number(landmarkR?.(i) ?? 0.5)),
  //       type: 'landmark'
  //     });
  //   }
  // }

  return entities; // Return empty array - no obstacles or landmarks
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

let stuckAttackWarned = false;
let firstFrameCleared = false;
const applyInput = () => {
  // SAFETY: Guard against null inputManager
  if (!inputManager || !inputManager.inputState) {
    console.warn('⚠️ applyInput called before inputManager initialized');
    return;
  }
  
  // SAFETY: Force clear inputs on first frame to prevent garbage values
  if (!firstFrameCleared) {
    wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
    firstFrameCleared = true;
    console.log('🧹 First frame input cleared');
    return; // Skip this frame's input processing
  }
  
  // Allow console override via window.DZ.setFlag('inputOverride', { direction:{x,y}, roll, jump, lightAttack, heavyAttack, block, special })
  const flagsSnapshot = (window.DZ && typeof window.DZ.flags === 'function') ? window.DZ.flags() : null;
  const override = flagsSnapshot && typeof flagsSnapshot.inputOverride === 'object' ? flagsSnapshot.inputOverride : null;
  const input = override || inputManager.inputState;
  const dirX = clamp(input.direction?.x ?? 0, -1, 1);
  const dirY = -clamp(input.direction?.y ?? 0, -1, 1); // Invert Y: screen coords to game coords
  
  // DEBUG: Validate input values
  if (!Number.isFinite(dirX) || !Number.isFinite(dirY)) {
    console.error('🔴 Invalid input in applyInput:', { dirX, dirY, input });
  }
  
  // SAFETY: Detect and clear stuck attack/block states
  // ONLY run this when NOT using an override (overrides are intentional)
  // This prevents stuck states from persisting in the real input manager
  if (!override) {
    // Clear stuck attack states
    const hasAttackInput = inputManager.inputState.lightAttack || inputManager.inputState.heavyAttack;
    const hasPointerDown = inputManager.inputState.pointer?.down;
    
    if (hasAttackInput && !hasPointerDown) {
      if (!stuckAttackWarned) {
        console.warn('⚠️ Detected stuck attack state, clearing...');
        stuckAttackWarned = true;
      }
      inputManager.inputState.lightAttack = false;
      inputManager.inputState.heavyAttack = false;
    } else if (!hasAttackInput) {
      // Reset warning flag when attacks are cleared
      stuckAttackWarned = false;
    }
    
    // Clear stuck block state
    if (inputManager.inputState.block && !hasPointerDown) {
      inputManager.inputState.block = false;
    }
    
    // SAFETY: Force cancel attack animation if stuck
    // Check if attack animation is active but no attack inputs
    const state = wasmApi.getPlayerState();
    if (state.anim === 'attacking' && !inputManager.inputState.lightAttack && !inputManager.inputState.heavyAttack && !inputManager.inputState.special) {
      // Send multiple zero-attack frames to force cancel
      wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
    }
  }
  
  // Update last movement direction for shield facing
  // Use inputState.lastMovementDirection to maintain proper reference
  if (dirX !== 0 || dirY !== 0) {
    inputManager.inputState.lastMovementDirection.x = dirX;
    inputManager.inputState.lastMovementDirection.y = dirY;
  }
  
  // Get block state - ensure it's properly read from input
  // IMPORTANT: Block should ONLY be active when explicitly pressed
  const block = (input.block === true || input.block === 1) ? 1 : 0;

  wasmApi.setPlayerInput(
    dirX,
    dirY,
    input.roll ? 1 : 0,
    input.jump ? 1 : 0,
    input.lightAttack ? 1 : 0,
    input.heavyAttack ? 1 : 0,
    block,
    input.special ? 1 : 0
  );

  // Synchronize blocking state explicitly to avoid latched blocks
  // Always call set_blocking with current state to ensure WASM state is correct
  if (wasmApi.exports?.set_blocking) {
    const lastDir = inputManager.inputState.lastMovementDirection;
    wasmApi.exports.set_blocking(
      block,
      lastDir.x || 1,
      lastDir.y || 0
    );
  }

  // Log when override becomes active
  if (override && !window.__DZ_OVERRIDE_LOGGED__) {
    window.__DZ_OVERRIDE_LOGGED__ = true;
    console.info('[Demo] Using inputOverride from feature flags:', { dirX, dirY, ...override });
  } else if (!override && window.__DZ_OVERRIDE_LOGGED__) {
    // Reset flag when override is removed
    window.__DZ_OVERRIDE_LOGGED__ = false;
  }
};

const frame = (now) => {
  const deltaSeconds = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += deltaSeconds * speed;

  let iterations = 0;
  while (accumulator >= step && iterations < maxSubSteps) {
    // DEBUG: Check position before update
    const beforeX = wasmApi.exports.get_x?.();
    const beforeY = wasmApi.exports.get_y?.();
    
    applyInput();
    wasmApi.update(step);
    
    // DEBUG: Check position after update
    const afterX = wasmApi.exports.get_x?.();
    const afterY = wasmApi.exports.get_y?.();
    
    // Log if corruption detected
    if (Number.isFinite(beforeX) && Number.isFinite(beforeY) && (!Number.isFinite(afterX) || !Number.isFinite(afterY))) {
      console.error('🔴 CORRUPTION in update loop!');
      console.error('  Before update:', beforeX, beforeY);
      console.error('  After update:', afterX, afterY);
      console.error('  dt:', step);
      console.trace('Corruption trace:');
    }
    
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
