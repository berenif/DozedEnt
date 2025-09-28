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
  'get_player_anim_state',
  'get_player_state_timer',
  'get_stamina',
  'get_hp',
  'init_run',
  'reset_run'
];

const DIRECT_PATHS = [
  'public/game.wasm',
  'public/wasm/game.wasm',
  'game.wasm',
  'dist/game.wasm'
];

const OPTIONAL_PATTERNS = [
  /^get_weapon_/, 
  /^get_landmark_/, 
  /^get_exit_/
];

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

  relativePaths.forEach(path => {
    origins.forEach(origin => {
      try {
        const resolved = new URL(path, origin).href;
        candidates.add(resolved);
      } catch (_) {
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

  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: 1,
    rolling: 0,
    block: 0,
    anim: 0,
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

  const ANIM = {
    idle: 0,
    run: 1,
    roll: 2,
    attack: 3,
    block: 4
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

  const resolveAnim = () => {
    if (inputs.roll) {
      state.anim = ANIM.roll;
      state.rolling = 1;
      return;
    }
    state.rolling = 0;
    if (inputs.block) {
      state.anim = ANIM.block;
      return;
    }
    if (inputs.light || inputs.heavy || inputs.special) {
      state.anim = ANIM.attack;
      return;
    }
    const moving = Math.hypot(inputs.x, inputs.y) > 0.05;
    state.anim = moving ? ANIM.run : ANIM.idle;
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
    },
    set_player_input: (x, y, roll, jump, light, heavy, block, special) => {
      base.set_player_input?.(x, y, roll, jump, light, heavy, block, special);
      inputs.x = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
      inputs.y = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
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
      base.init_run?.(seed, weapon);
      state.x = 0;
      state.y = 0;
      state.animTimer = 0;
    },
    reset_run: (seed) => {
      base.reset_run?.(seed);
      state.x = 0;
      state.y = 0;
      state.animTimer = 0;
    }
  };

  return fallback;
};

const normalizeAnim = (value) => {
  switch (value) {
    case 1: return 'running';
    case 2: return 'rolling';
    case 3: return 'attacking';
    case 4: return 'blocking';
    default: return 'idle';
  }
};

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

  const getPlayerState = () => {
    stateCache.x = Number(handles.get_x());
    stateCache.y = Number(handles.get_y());
    stateCache.vx = Number(handles.get_vel_x());
    stateCache.vy = Number(handles.get_vel_y());
    stateCache.grounded = Boolean(handles.get_is_grounded());
    stateCache.rolling = Boolean(handles.get_is_rolling());
    stateCache.block = Boolean(handles.get_block_state());
    stateCache.anim = normalizeAnim(Number(handles.get_player_anim_state()));
    stateCache.animT = Number(handles.get_player_state_timer());
    stateCache.stamina = Number(handles.get_stamina());
    stateCache.hp = Number(handles.get_hp());
    return stateCache;
  };

  const initialSeed = Number.isFinite(config.seed) ? config.seed : Math.floor(Date.now() % 2147483647);
  const initialWeapon = Number.isFinite(config.weapon) ? config.weapon : 0;

  handles.start();
  handles.init_run(initialSeed, initialWeapon);

  let currentSeed = initialSeed;
  let cachedWeapon = initialWeapon;

  const api = {
    isFallback: loaderInfo.fallback,
    loaderInfo,
    memory,
    start: handles.start,
    update: (dt) => {
      const delta = Number.isFinite(dt) ? dt : 1 / 60;
      handles.update(delta);
    },
    setPlayerInput: (x, y, roll, jump, light, heavy, block, special) => {
      handles.set_player_input(x, y, roll, jump, light, heavy, block, special);
    },
    getPlayerState,
    resetRun: (seed = currentSeed) => {
      currentSeed = Number.isFinite(seed) ? seed : initialSeed;
      handles.reset_run(currentSeed);
      handles.init_run(currentSeed, cachedWeapon);
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
    setInput: api.setPlayerInput
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



