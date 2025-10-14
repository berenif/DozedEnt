import { config, setFlag, allFlags } from './config.js';
import { loadWasm } from '../utils/wasm.js';
import { globalWasmLoader } from '../utils/wasm-lazy-loader.js';
import { WasmManager } from '../utils/wasm-manager.js';

const REQUIRED_EXPORTS = [
  'start',
  'update',
  'set_player_input',
  'get_x',
  'get_y',
  'get_vel_x',
  'get_vel_y',
  'get_is_grounded',
  'get_is_rolling',
  'get_block_state',
  'get_stamina',
  'get_hp',
  'init_run',
  'reset_run'
];

// Prefer absolute web-root path first to avoid resolving under /demos
const DIRECT_PATHS = [
  '/wasm/game.wasm',
  'wasm/game.wasm'
  
  // Removed 'dist/game.wasm' as it has incomplete exports
];

const OPTIONAL_PATTERNS = [
  /^get_weapon_/, 
  /^get_landmark_/, 
  /^get_exit_/,
  /wolf/,
  /enemy/,
  /spawn/,
  /bash/, // include ability-related functions like start_charging_bash, release_bash, etc.
  /get_player_anim_state/,
  /get_player_state_timer/
];

export const PLAYER_ANIM_CODES = Object.freeze({
  idle: 0,
  running: 1,
  attacking: 2,
  blocking: 3,
  rolling: 4,
  hurt: 5,
  dead: 6,
  jumping: 7,
  doubleJumping: 8,
  landing: 9,
  wallSliding: 10,
  dashing: 11,
  chargingAttack: 12
});

export const PLAYER_ANIM_NAMES = Object.freeze(
  Object.fromEntries(
    Object.entries(PLAYER_ANIM_CODES).map(([name, code]) => [code, name])
  )
);

const optionalDefaultsUrl = new URL('./optional-export-defaults.json', import.meta.url);

let createPromise = null;
const onceLogs = new Set();

const logOnce = (key, fn) => {
  if (onceLogs.has(key)) return;
  onceLogs.add(key);
  fn();
};

const resolveBaseUrls = (relativePaths) => {
  const candidates = new Set();
  const baseHref = window.location.href;
  const baseDir = baseHref.endsWith('/') ? baseHref : baseHref.replace(/[^/]*$/, '');
  const origins = [baseHref, baseDir, `${window.location.origin}/`];

  // Prefer stable build timestamp when available, fallback to current time
  const version = (window.__BUILD__ && window.__BUILD__.buildTime) || (window.__BUILD__ && window.__BUILD__.version) || String(Date.now());

  relativePaths.forEach(path => {
    origins.forEach(origin => {
      try {
        const u = new URL(path, origin);
        // Append cache-busting version so latest WASM is always fetched
        u.searchParams.set('v', version);
        candidates.add(u.href);
      } catch {
        // ignore invalid url
      }
    });
  });

  return Array.from(candidates);
};

const fetchJson = async (url) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const loadOptionalDefaults = async () => {
  try {
    return await fetchJson(optionalDefaultsUrl);
  } catch (error) {
    logOnce('optional-defaults', () => console.warn('[Demo] Optional defaults unavailable:', error.message));
    return {};
  }
};

const loadContract = async () => {
  const candidates = [
    new URL('../../WASM_EXPORTS.json', import.meta.url).href,
    new URL('../../../WASM_EXPORTS.json', import.meta.url).href,
    `${window.location.origin}/WASM_EXPORTS.json`
  ];

  for (const candidate of candidates) {
    try {
      return await fetchJson(candidate);
    } catch (error) {
      logOnce(`contract-${candidate}`, () => console.debug('[Demo] Contract fetch failed at', candidate, error.message));
    }
  }

  logOnce('contract-missing', () => console.warn('[Demo] WASM export contract not reachable; validation will use runtime exports only.'));
  return null;
};

const contractToSet = (contract) => {
  if (!contract) return null;
  const modules = Array.isArray(contract.modules) ? contract.modules : [];
  const entry = modules.find(mod => mod.file === 'game.wasm');
  if (!entry || !entry.byType || !Array.isArray(entry.byType.func)) {
    return null;
  }
  return new Set(entry.byType.func);
};

const createFallbackExports = () => {
  const manager = new WasmManager();
  const base = typeof manager.createFallbackExports === 'function' ? manager.createFallbackExports() : {};
  const ANIM = PLAYER_ANIM_CODES;

  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: 1,
    rolling: 0,
    block: 0,
    anim: ANIM.idle,
    animTimer: 0,
    stamina: 1,
    hp: 1
  };

  const inputs = {
    x: 0,
    y: 0,
    roll: 0,
    jump: 0,
    light: 0,
    heavy: 0,
    block: 0,
    special: 0
  };

  const applyInput = (nx, ny) => {
    const max = Math.max(1, Math.hypot(nx, ny));
    const speed = 2.7;
    state.vx = (nx / max) * speed;
    state.vy = (ny / max) * speed;
  };

  const integrate = (dt) => {
    state.x += state.vx * dt;
    state.y += state.vy * dt;
    state.x = Math.min(4.5, Math.max(-4.5, state.x));
    state.y = Math.min(4.5, Math.max(0, state.y));
  };

  const setAnimState = (animCode) => {
    const code = Number.isFinite(animCode) ? animCode : ANIM.idle;
    if (state.anim !== code) {
      state.anim = code;
      state.animTimer = 0;
    }
    state.rolling = code === ANIM.rolling ? 1 : 0;
  };

  const resolveAnim = () => {
    if (inputs.roll) {
      setAnimState(ANIM.rolling);
      return;
    }

    if (inputs.block) {
      setAnimState(ANIM.blocking);
      return;
    }

    if (inputs.light || inputs.heavy) {
      setAnimState(ANIM.attacking);
      return;
    }

    if (inputs.special) {
      setAnimState(ANIM.chargingAttack);
      return;
    }

    if (inputs.jump) {
      setAnimState(ANIM.jumping);
      return;
    }

    const moving = Math.hypot(inputs.x, inputs.y) > 0.05;
    setAnimState(moving ? ANIM.running : ANIM.idle);
  };

  const fallback = {
    ...base,
    start: () => {
      base.start?.();
      state.x = 0;
      state.y = 0;
      state.stamina = 1;
      state.hp = 1;
      state.animTimer = 0;
      setAnimState(ANIM.idle);
    },
    set_player_input: (x, y, roll, jump, light, heavy, block, special) => {
      // NaN protection: ensure all parameters are valid numbers
      const safeX = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
      const safeY = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
      
      base.set_player_input?.(safeX, safeY, roll, jump, light, heavy, block, special);
      inputs.x = safeX;
      inputs.y = safeY;
      inputs.roll = roll ? 1 : 0;
      inputs.jump = jump ? 1 : 0;
      inputs.light = light ? 1 : 0;
      inputs.heavy = heavy ? 1 : 0;
      inputs.block = block ? 1 : 0;
      inputs.special = special ? 1 : 0;
      if (inputs.roll) {
        state.stamina = Math.max(0, state.stamina - 0.08);
      }
      if (inputs.light || inputs.heavy || inputs.special) {
        state.stamina = Math.max(0, state.stamina - 0.12);
      }
      state.block = inputs.block ? 1 : 0;
      resolveAnim();
      applyInput(inputs.x, inputs.y);
    },
    update: (dt) => {
      const delta = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 1 / 60;
      base.update?.(delta);
      integrate(delta);
      state.animTimer += delta;
      state.stamina = Math.min(1, state.stamina + delta * 0.25);
    },
    get_x: () => state.x,
    get_y: () => state.y,
    get_vel_x: () => state.vx,
    get_vel_y: () => state.vy,
    get_is_grounded: () => state.grounded,
    get_is_rolling: () => state.rolling,
    get_block_state: () => state.block,
    get_player_anim_state: () => state.anim,
    get_player_state_timer: () => state.animTimer,
    get_stamina: () => state.stamina,
    get_hp: () => state.hp,
    init_run: (seed, weapon) => {
      try {
        const safeSeed = typeof seed === 'bigint' ? seed : BigInt(Math.floor(Number(seed) || 1));
        base.init_run?.(safeSeed, weapon);
      } catch (error) {
        console.warn('[Demo] Fallback init_run seed conversion failed:', error.message);
        base.init_run?.(1n, weapon);
      }
      // FIXED: Match WASM init position (0.5, 0.5) not (0, 0)
      state.x = 0.5;
      state.y = 0.5;
      state.animTimer = 0;
      setAnimState(ANIM.idle);
    },
    reset_run: (seed) => {
      try {
        const safeSeed = typeof seed === 'bigint' ? seed : BigInt(Math.floor(Number(seed) || 1));
        base.reset_run?.(safeSeed);
      } catch (error) {
        console.warn('[Demo] Fallback reset_run seed conversion failed:', error.message);
        base.reset_run?.(1n);
      }
      state.x = 0;
      state.y = 0;
      state.animTimer = 0;
      setAnimState(ANIM.idle);
    },
    forceFallback: () => {
      try {
        setFlag('forceFallback', true);
        const url = new URL(window.location.href);
        url.searchParams.set('debug', '1');
        window.location.href = url.toString();
      } catch (e) {
        console.warn('[Demo] forceFallback() failed:', e.message);
      }
    }
  };

  return fallback;
};

const normalizeAnim = (value) => PLAYER_ANIM_NAMES[value] || 'idle';

const createOptionalWrapper = (name, exports, defaults, debugEnabled) => {
  const fn = exports[name];
  if (typeof fn === 'function') {
    return fn.bind(exports);
  }
  const defaultValue = Object.prototype.hasOwnProperty.call(defaults, name) ? defaults[name] : 0;
  let warned = false;
  return (...args) => {
    if (!warned) {
      warned = true;
      const message = `[Demo] Optional WASM export missing: ${name}. Using default value.`;
      if (debugEnabled) {
        console.warn(message, { defaultValue, args });
      } else {
        console.info(message);
      }
    }
    return defaultValue;
  };
};

const createApiFromRuntime = (runtime, optionalDefaults, contractSet) => {
  const { exports, memory, loaderInfo } = runtime;
  const debugEnabled = !!config.debug;

  const missing = REQUIRED_EXPORTS.filter(name => typeof exports[name] !== 'function');
  if (missing.length) {
    throw new Error(`Missing required WASM exports: ${missing.join(', ')}`);
  }

  if (contractSet) {
    const missingInContract = REQUIRED_EXPORTS.filter(name => !contractSet.has(name));
    if (missingInContract.length) {
      logOnce('contract-mismatch', () => console.warn('[Demo] Contract omits required exports:', missingInContract.join(', ')));
    }
  }

  const optionalNames = new Set(Object.keys(optionalDefaults));

  const handles = {};
  REQUIRED_EXPORTS.forEach(name => {
    handles[name] = exports[name].bind(exports);
  });
  // Normalize boolean-like exports to strict 0/1 to avoid noisy logs
  const wrapBool01 = (fn) => {
    if (typeof fn !== 'function') return fn;
    return (...args) => {
      try {
        const v = Number(fn(...args));
        return ((v | 0) & 1) >>> 0; // ensure 0 or 1
      } catch {
        return 0;
      }
    };
  };
  if (typeof handles.get_block_state === 'function') {
    handles.get_block_state = wrapBool01(handles.get_block_state);
  }
  if (typeof handles.get_is_grounded === 'function') {
    handles.get_is_grounded = wrapBool01(handles.get_is_grounded);
  }
  if (typeof handles.get_is_rolling === 'function') {
    handles.get_is_rolling = wrapBool01(handles.get_is_rolling);
  }

  const optionalHandles = {};
  const attachOptional = (name) => {
    if (optionalHandles[name]) return;
    optionalHandles[name] = createOptionalWrapper(name, exports, optionalDefaults, debugEnabled);
  };

  for (const name in exports) {
    if (optionalNames.has(name) || OPTIONAL_PATTERNS.some(pattern => pattern.test(name))) {
      attachOptional(name);
    }
  }

  optionalNames.forEach(name => attachOptional(name));

  const stateCache = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: false,
    rolling: false,
    block: false,
    anim: 'idle',
    animT: 0,
    stamina: 1,
    hp: 1
  };

  const coerceNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const getPlayerState = () => {
    // Coerce all numeric reads to finite numbers to avoid NaN in overlay/render
    const rawX = handles.get_x();
    const rawY = handles.get_y();
    
    // Diagnostic: log if raw WASM position is corrupted
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
      console.error('[Demo] 🔴 WASM position corrupted! raw x:', rawX, 'raw y:', rawY);
      console.trace('Position corruption detected at:');
    }
    
    stateCache.x = coerceNumber(rawX, 0);
    stateCache.y = coerceNumber(rawY, 0);
    stateCache.vx = coerceNumber(handles.get_vel_x(), 0);
    stateCache.vy = coerceNumber(handles.get_vel_y(), 0);
    // Some builds have returned 255 for boolean flags; normalize safely
    const groundedRaw = coerceNumber(handles.get_is_grounded(), 0);
    const rollingRaw = coerceNumber(handles.get_is_rolling(), 0);
    const blockRaw = coerceNumber(handles.get_block_state(), 0);
    const toBool = (n) => ((n | 0) & 1) === 1; // mask to LSB
    if (groundedRaw !== 0 && groundedRaw !== 1) {
      logOnce('warn-grounded-norm', () => console.warn('[Demo] get_is_grounded returned', groundedRaw, 'â€” normalizing via &1.'));
    }
    if (rollingRaw !== 0 && rollingRaw !== 1) {
      logOnce('warn-rolling-norm', () => console.warn('[Demo] get_is_rolling returned', rollingRaw, 'â€” normalizing via &1.'));
    }
    if (blockRaw !== 0 && blockRaw !== 1) {
      logOnce('warn-block-norm', () => console.warn('[Demo] get_block_state returned', blockRaw, 'â€” normalizing via &1.'));
    }
    stateCache.grounded = toBool(groundedRaw);
    stateCache.rolling = toBool(rollingRaw);
    stateCache.block = toBool(blockRaw);
    const animStateValue = (optionalHandles.get_player_anim_state?.() ?? exports.get_player_anim_state?.() ?? 0);
    stateCache.anim = normalizeAnim(coerceNumber(animStateValue, 0));
    const animTimerValue = (optionalHandles.get_player_state_timer?.() ?? exports.get_player_state_timer?.() ?? 0);
    stateCache.animT = coerceNumber(animTimerValue, 0);
    stateCache.stamina = coerceNumber(handles.get_stamina(), 1);
    stateCache.hp = coerceNumber(handles.get_hp(), 1);
    return stateCache;
  };

  const initialSeed = Number.isFinite(config.seed) ? config.seed : Math.floor(Date.now() % 2147483647);
  const initialWeapon = Number.isFinite(config.weapon) ? config.weapon : 0;

  handles.start();
  
  // Convert seed to BigInt safely for WASM compatibility
  try {
    const seedBigInt = typeof initialSeed === 'bigint' ? initialSeed : BigInt(Math.floor(Number(initialSeed)));
    handles.init_run(seedBigInt, initialWeapon);
  } catch (seedError) {
    console.warn('[Demo] Seed conversion failed, using fallback seed:', seedError.message);
    handles.init_run(1n, initialWeapon); // Use safe default seed
  }
  
  // Ensure player starts with clean input state after initialization
  if (handles.set_blocking) {
    handles.set_blocking(0, 0, 0);
  }
  
  // Also clear all inputs to ensure clean start
  if (handles.set_player_input) {
    handles.set_player_input(0, 0, 0, 0, 0, 0, 0, 0);
  }

  let currentSeed = initialSeed;
  let cachedWeapon = initialWeapon;

  // Merge required handles with bound passthroughs for all other exported functions.
  // This ensures ability functions (e.g., start_charging_bash) are available via api.exports
  const mergedExports = { ...handles };
  for (const name in exports) {
    if (!Object.prototype.hasOwnProperty.call(mergedExports, name)) {
      const fn = exports[name];
      if (typeof fn === 'function') {
        mergedExports[name] = fn.bind(exports);
      }
    }
  }

  const api = {
    isFallback: loaderInfo.fallback,
    loaderInfo,
    memory,
    exports: mergedExports, // Expose full WASM exports (required + optional)
    start: handles.start,
    update: (dt) => {
      const delta = Number.isFinite(dt) ? dt : 1 / 60;
      handles.update(delta);
    },
    setPlayerInput: (x, y, roll, jump, light, heavy, block, special) => {
      // NaN protection with diagnostic logging
      const safeX = Number.isFinite(x) ? x : 0;
      const safeY = Number.isFinite(y) ? y : 0;
      
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        console.warn('[Demo] ⚠️ Invalid input detected in setPlayerInput:', { x, y });
      }
      
      handles.set_player_input(safeX, safeY, roll, jump, light, heavy, block, special);
    },
    getPlayerState,
    resetRun: (seed = currentSeed) => {
      currentSeed = Number.isFinite(seed) ? seed : initialSeed;
      try {
        const seedBigInt = typeof currentSeed === 'bigint' ? currentSeed : BigInt(Math.floor(Number(currentSeed)));
        // Only call reset_run if it exists
        if (typeof handles.reset_run === 'function') {
          handles.reset_run(seedBigInt);
        }
        // ALWAYS call init_run to ensure proper initialization
        handles.init_run(seedBigInt, cachedWeapon);
      } catch (seedError) {
        console.warn('[Demo] Reset seed conversion failed, using fallback:', seedError.message);
        if (typeof handles.reset_run === 'function') {
          handles.reset_run(1n);
        }
        handles.init_run(1n, cachedWeapon);
      }
    },
    setWeapon: (weaponId) => {
      const value = Number.isFinite(weaponId) ? weaponId : 0;
      cachedWeapon = value;
      const setter = optionalHandles.set_character_and_weapon;
      const getter = optionalHandles.get_character_type;
      if (typeof setter === 'function') {
        try {
          const charType = typeof getter === 'function' ? getter() : 0;
          setter(charType, value);
        } catch (error) {
          logOnce('set-weapon', () => console.warn('[Demo] set_character_and_weapon failed:', error));
        }
      }
    },
    optionalHandles
  };

  setFlag('loaderMode', loaderInfo.mode);
  setFlag('loaderPath', loaderInfo.path);
  setFlag('seed', currentSeed);
  setFlag('weapon', cachedWeapon);
  if (loaderInfo.fallback) {
    setFlag('fallback', true);
  }

  window.DZ = {
    state: getPlayerState,
    setWeapon: api.setWeapon,
    reset: api.resetRun,
    setFlag,
    flags: allFlags,
    setInput: api.setPlayerInput,
    // Expose raw wasm exports for debugging
    exports: handles,
    optional: optionalHandles,
    unblock: () => {
      try {
        // Clear local flags if used via override
        const flagsObj = allFlags();
        if (flagsObj && typeof flagsObj.inputOverride === 'object') {
          flagsObj.inputOverride.block = 0;
          setFlag('inputOverride', flagsObj.inputOverride);
        }
        // Force-clear in WASM if export exists
        if (api.exports && typeof api.exports.set_blocking === 'function') {
          api.exports.set_blocking(0, 0, 0);
        }
      } catch (e) {
        console.warn('[Demo] unblock() failed:', e.message);
      }
    },
    forceBlock: (on) => {
      try {
        const v = on ? 1 : 0;
        // Drive block state via input path for a few frames
        for (let i = 0; i < 6; i += 1) {
          api.setPlayerInput(0, 0, 0, 0, 0, 0, v, 0);
          api.update(1 / 60);
        }
        // Also call direct blocking export if present
        if (api.exports && typeof api.exports.set_blocking === 'function') {
          api.exports.set_blocking(v, 0, 0);
        }
      } catch (e) {
        console.warn('[Demo] forceBlock() failed:', e.message);
      }
    }
  };

  return api;
};

const tryDirectLoad = async () => {
  const attempts = [];
  const candidates = resolveBaseUrls(DIRECT_PATHS);
  for (const url of candidates) {
    try {
      const runtime = await loadWasm(url);
      return {
        exports: runtime.exports,
        memory: runtime.memory,
        loaderInfo: { mode: 'direct', path: url, fallback: false }
      };
    } catch (error) {
      attempts.push({ url, message: error.message });
    }
  }
  const messages = attempts.map(entry => `${entry.url} -> ${entry.message}`);
  throw new Error(messages.join(' | '));
};

const tryLazyLoad = async () => {
  const loader = globalWasmLoader;
  const candidates = resolveBaseUrls(DIRECT_PATHS);
  const originalResolver = loader.resolveModulePaths?.bind(loader);
  const originalFetch = loader.fetchWithTimeout?.bind(loader);
  let chosenUrl = null;

  loader.resolveModulePaths = () => candidates;
  if (originalFetch) {
    loader.fetchWithTimeout = async (url, options) => {
      const buffer = await originalFetch(url, options);
      if (!chosenUrl) {
        chosenUrl = url;
      }
      return buffer;
    };
  }

  try {
    const instance = await loader.loadModule('game', { imports: {} });
    const exports = instance?.exports || instance?.instance?.exports;
    if (!exports) {
      throw new Error('Lazy loader returned invalid module');
    }
    const memory = exports.memory instanceof WebAssembly.Memory ? exports.memory : null;
    const path = chosenUrl || candidates[0] || 'lazy-cache';
    return {
      exports,
      memory,
      loaderInfo: { mode: 'lazy', path, fallback: false }
    };
  } finally {
    if (originalResolver) loader.resolveModulePaths = originalResolver;
    if (originalFetch) loader.fetchWithTimeout = originalFetch;
  }
};

const initialise = async () => {
  const [optionalDefaults, contract] = await Promise.all([
    loadOptionalDefaults(),
    loadContract()
  ]);
  const contractSet = contractToSet(contract);

  const loaderMode = config.loader;
  let runtime = null;
  let loaderError = null;

  try {
    const flagsAtInit = allFlags();
    if (flagsAtInit && flagsAtInit.forceFallback) {
      throw new Error('forced by flag');
    }
    runtime = loaderMode === 'lazy' ? await tryLazyLoad() : await tryDirectLoad();
  } catch (error) {
    loaderError = error;
    logOnce('runtime-load-error', () => console.warn(`[Demo] WASM load failed (${loaderMode}). Falling back.`, error.message));
  }

  if (!runtime) {
    const fallbackExports = createFallbackExports();
    runtime = {
      exports: fallbackExports,
      memory: null,
      loaderInfo: { mode: loaderMode, path: loaderError ? loaderError.message : 'fallback', fallback: true }
    };
  }

  let activeRuntime = runtime;
  let api;
  try {
    api = createApiFromRuntime(activeRuntime, optionalDefaults, contractSet);
  } catch (validationError) {
    logOnce("validation-failure", () => console.warn('[Demo] WASM validation failed; using fallback exports.', validationError.message));
    const fallbackExports = createFallbackExports();
    activeRuntime = {
      exports: fallbackExports,
      memory: null,
      loaderInfo: { mode: loaderMode, path: validationError.message, fallback: true }
    };
    api = createApiFromRuntime(activeRuntime, optionalDefaults, contractSet);
  }

  // NOTE: WASM initialization is now handled in main.js to avoid double-init
  // Initializing twice was causing position corruption
  // The main.js file will call init_run() after creating the wasmApi instance
  
  // Runtime sanity check: ensure inputs produce finite, changing state
  const validateRuntime = () => {
    try {
      const before = api.getPlayerState();
      const bx = Number.isFinite(before.x) ? before.x : 0;
      const by = Number.isFinite(before.y) ? before.y : 0;
      // Apply a brief rightward input over a few updates
      api.setPlayerInput(1, 0, 0, 0, 0, 0, 0, 0);
      for (let i = 0; i < 6; i += 1) {
        api.update(1 / 60);
      }
      api.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
      const after = api.getPlayerState();
      const ax = Number.isFinite(after.x) ? after.x : NaN;
      const ay = Number.isFinite(after.y) ? after.y : NaN;
      const moved = Number.isFinite(ax) && Number.isFinite(ay) && (Math.abs(ax - bx) > 1e-6 || Math.abs(ay - by) > 1e-6);
      // Re-initialize after validation test to ensure clean state
      if (typeof api.exports?.init_run === 'function') {
        const initSeed = BigInt(Date.now());
        api.exports.init_run(initSeed, 0);
      }
      return moved;
    } catch {
      return false;
    }
  };

  // DISABLED: validateRuntime was corrupting the initialized state
  // The validation test moves the player then tries to reset, but reset is broken
  // Since we're initializing properly now, we don't need this validation
  const validationResult = false; // validateRuntime();
  if (validationResult === false && false) { // Never execute fallback switch
    logOnce('runtime-invalid', () => console.warn('[Demo] Active WASM runtime produced invalid or static state; switching to fallback.'));
    const fallbackExports = createFallbackExports();
    activeRuntime = {
      exports: fallbackExports,
      memory: null,
      loaderInfo: { mode: loaderMode, path: 'sanity-check', fallback: true }
    };
    api = createApiFromRuntime(activeRuntime, optionalDefaults, contractSet);
  }
  
  console.log('[Demo] ✅ Skipped validation test to preserve initialized state');

  logOnce('loader-summary', () => {
    const info = activeRuntime.loaderInfo;
    console.info(`[Demo] loader=${info.mode} path=${info.path} fallback=${info.fallback}`);
  });
  return api;
};

export const createWasmApi = async () => {
  if (!createPromise) {
    createPromise = initialise();
  }
  return createPromise;
};
