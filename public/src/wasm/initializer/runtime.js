import { setGlobalSeed as setVisualRngSeed } from '../../utils/rng.js';

export async function initializeRuntime(initializer) {
  const exports = initializer.exports;
  if (!exports || typeof exports.start !== 'function') {
    console.warn('WASM start function not available in exports');
    return;
  }

  console.log('Calling WASM start() function...');
  const startTime = performance.now();

  try {
    exports.start();
    const startDuration = performance.now() - startTime;
    console.log(`WASM start() completed in ${startDuration.toFixed(2)}ms`);

    const posX = exports.get_x?.();
    const posY = exports.get_y?.();
    console.log('WASM position immediately after start():', posX, posY);

    const stamina = exports.get_stamina?.();
    const hp = exports.get_hp?.();
    console.log('WASM other values after start():', { stamina, hp });
  } catch (error) {
    const startDuration = performance.now() - startTime;
    console.error(`WASM start() failed after ${startDuration.toFixed(2)}ms:`, error);
    throw error;
  }
}

export async function runInitializationTests(initializer) {
  const exports = initializer.exports;
  if (!exports || typeof exports.set_player_input !== 'function') {
    return;
  }

  console.log('Testing set_player_input...');
  exports.set_player_input(0, 1, 0, 0, 0, 0, 0, 0);

  const posXAfterInput = exports.get_x?.();
  const posYAfterInput = exports.get_y?.();
  console.log('WASM position after setting input:', posXAfterInput, posYAfterInput);

  if (typeof exports.update !== 'function') {
    return;
  }

  console.log('Testing WASM update function...');
  const updateTimeout = setTimeout(() => {
    console.error('WASM test update timed out after 500ms');
    throw new Error('WASM update timeout during test');
  }, 500);

  try {
    const updateStartTime = performance.now();
    exports.update(0.016);
    const updateDuration = performance.now() - updateStartTime;
    clearTimeout(updateTimeout);

    console.log(`WASM test update completed in ${updateDuration.toFixed(2)}ms`);

    const posXAfterUpdate = exports.get_x?.();
    const posYAfterUpdate = exports.get_y?.();
    console.log('WASM position after update:', posXAfterUpdate, posYAfterUpdate);
  } catch (error) {
    clearTimeout(updateTimeout);
    console.error('Error during WASM test update:', error);
    throw error;
  }
}

export function initializeGameRun(initializer) {
  const exports = initializer.exports;
  if (!exports || typeof exports.init_run !== 'function') {
    console.warn('WASM init_run function not available');
    return;
  }

  try {
    const urlParams = new URLSearchParams(location.search);
    const urlSeed = urlParams.get('seed');

    if (urlSeed !== null && /^\d+$/.test(urlSeed)) {
      initializer.runSeed = BigInt(urlSeed);
      console.log('Using URL seed:', initializer.runSeed.toString());
    } else {
      initializer.runSeed = 1n;
      console.log('Using default seed:', initializer.runSeed.toString());
    }

    const startWeapon = getStartWeaponFromUrl();
    exports.init_run(initializer.runSeed, startWeapon);

    try {
      if (typeof exports.set_player_input === 'function') {
        exports.set_player_input(0, 0, 0, 0, 0, 0, 0, 0);
      }
      if (typeof exports.set_blocking === 'function') {
        exports.set_blocking(0, 0, 0);
      }
    } catch (clearError) {
      console.warn('Failed to clear initial input state in fallback:', clearError);
    }

    globalThis.runSeedForVisuals = initializer.runSeed;
    try {
      setVisualRngSeed(initializer.runSeed);
    } catch (seedError) {
      console.debug('Visual RNG seed setting failed:', seedError.message);
    }

    if (!verifyWasmInitialization(initializer)) {
      console.warn('WASM verification failed after init_run');
    }
  } catch (error) {
    console.error('Failed to initialize game run:', error);
    throw error;
  }
}

export function verifyWasmInitialization(initializer) {
  try {
    const exports = initializer.exports;
    const playerPos = {
      x: typeof exports.get_x === 'function' ? exports.get_x() : 0.5,
      y: typeof exports.get_y === 'function' ? exports.get_y() : 0.5
    };

    const stamina = typeof exports.get_stamina === 'function' ? exports.get_stamina() : 1.0;
    const phase = typeof exports.get_phase === 'function' ? exports.get_phase() : 0;

    const isValid = (
      playerPos &&
      typeof playerPos.x === 'number' &&
      typeof playerPos.y === 'number' &&
      Number.isFinite(stamina) && stamina >= 0 && stamina <= 1 &&
      Number.isInteger(phase) && phase >= 0
    );

    if (!isValid) {
      console.error('WASM verification failed: invalid return values', {
        playerPosition: playerPos,
        stamina,
        currentPhase: phase
      });
      return false;
    }

    console.log('WASM verification successful:', {
      playerPosition: playerPos,
      stamina,
      currentPhase: phase
    });

    return true;
  } catch (error) {
    console.error('WASM verification failed:', error);
    initializer.isLoaded = false;
    return false;
  }
}

export function applyUrlParameters(initializer) {
  try {
    const exports = initializer.exports;
    const urlParams = new URLSearchParams(location.search);
    const windX = parseFloat(urlParams.get('windx') || '0');
    const windY = parseFloat(urlParams.get('windy') || '0');

    if (!Number.isNaN(windX) && !Number.isNaN(windY) && typeof exports.set_wind === 'function') {
      exports.set_wind(windX, windY);
    }
  } catch (error) {
    console.warn('Failed to apply URL parameters:', error);
  }
}

export function normalizeBooleanExports(initializer) {
  const exports = initializer.exports;
  if (!exports) {
    return;
  }

  const wrap01 = (fn) => {
    if (typeof fn !== 'function') {
      return null;
    }
    const orig = fn.bind(exports);
    return () => {
      const value = Number(orig());
      return Number.isFinite(value) ? ((value | 0) & 1) : 0;
    };
  };

  if (typeof exports.get_block_state === 'function') {
    const wrapped = wrap01(exports.get_block_state);
    if (wrapped) {
      exports.get_block_state = wrapped;
    }
  }
}

function getStartWeaponFromUrl() {
  const urlParams = new URLSearchParams(location.search);
  const weaponParam = urlParams.get('weapon');

  if (weaponParam !== null) {
    const weaponId = parseInt(weaponParam, 10);
    if (!Number.isNaN(weaponId) && weaponId >= 0 && weaponId < 4) {
      console.log('Using URL weapon:', weaponId);
      return weaponId;
    }
  }

  return 0;
}
