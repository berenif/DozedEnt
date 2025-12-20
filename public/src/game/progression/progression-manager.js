import { LocalProgressStore, defaultEmptyState } from '../../storage/local-progress-store.js';
import { ProgressionBridge } from '../../bridge/progression-bridge.js';

function fetchJson(url) {
  return fetch(url).then(r => {
    if (!r.ok) {throw new Error(`Failed to load ${url}`);}
    return r.json();
  });
}

export class ProgressionManager {
  constructor(modulePromise, basePath = null) {
    this.modulePromise = modulePromise; // Promise resolving to Emscripten Module
    // NOTE: basePath is kept for backward compatibility, but upgrade JSONs are
    // resolved relative to this module via import.meta.url to work under GitHub Pages
    // subpaths (e.g. /DozedEnt/).
    this.basePath = basePath;
    this.store = new LocalProgressStore();
    this.bridge = null;
    this.trees = new Map();
    this.cachedScalars = new Map(); // key: `${classId}:${effectKey}` => number
    this.listeners = { stateChanged: new Set(), essenceChanged: new Set(), purchaseFailed: new Set() };
  }

  async init() {
    const Module = await this.modulePromise;
    this.bridge = new ProgressionBridge(Module);
    const [warden, raider, kensei] = await Promise.all([
      fetchJson(new URL('../../data/upgrades/warden.json', import.meta.url).href),
      fetchJson(new URL('../../data/upgrades/raider.json', import.meta.url).href),
      fetchJson(new URL('../../data/upgrades/kensei.json', import.meta.url).href)
    ]);
    this.trees.set('warden', warden);
    this.trees.set('raider', raider);
    this.trees.set('kensei', kensei);
    // Seed trees into WASM
    for (const [classId, tree] of this.trees) {
      this.bridge.setTree(this.classIdToInt(classId), JSON.stringify(tree));
    }
  }

  classIdToInt(classId) {
    switch (classId) {
      case 'warden': return 1;
      case 'raider': return 2;
      case 'kensei': return 3;
      default: return 0;
    }
  }

  on(event, fn) {
    const set = this.listeners[event];
    if (set) {set.add(fn);}
    return () => set && set.delete(fn);
  }

  emit(event, payload) {
    const set = this.listeners[event];
    if (!set) {return;}
    for (const fn of set) {fn(payload);}
  }

  loadClassState(classId) {
    const saved = this.store.load(classId) || defaultEmptyState(classId);
    this.bridge.setState(this.classIdToInt(classId), JSON.stringify(saved));
    const state = this.bridge.getState(this.classIdToInt(classId));
    
    // Guard against null state - fallback to saved state if WASM returns null
    const finalState = state || saved;
    
    this.emit('stateChanged', { classId, state: finalState });
    this.emit('essenceChanged', { classId, essence: finalState.essence });
    return finalState;
  }

  addEssence(classId, delta) {
    this.bridge.addEssence(this.classIdToInt(classId), delta);
    const state = this.bridge.getState(this.classIdToInt(classId));
    
    // Guard against null state
    if (!state) {
      console.warn(`[ProgressionManager] addEssence: WASM returned null state for ${classId}`);
      return;
    }
    
    this.store.save({ ...state, classId });
    this.emit('essenceChanged', { classId, essence: state.essence });
    this.emit('stateChanged', { classId, state });
  }

  purchase(classId, nodeId) {
    const code = this.bridge.purchase(this.classIdToInt(classId), nodeId);
    if (code !== 0) {
      this.emit('purchaseFailed', { classId, nodeId, code });
      return false;
    }
    const state = this.bridge.getState(this.classIdToInt(classId));
    
    // Guard against null state
    if (!state) {
      console.warn(`[ProgressionManager] purchase: WASM returned null state for ${classId} after purchase`);
      this.emit('purchaseFailed', { classId, nodeId, code: 9 });
      return false;
    }
    
    this.store.save({ ...state, classId });
    this.cachedScalars.clear();
    this.emit('stateChanged', { classId, state });
    this.emit('essenceChanged', { classId, essence: state.essence });
    return true;
  }

  getEffectScalar(classId, effectKey) {
    const cacheKey = `${classId}:${effectKey}`;
    if (this.cachedScalars.has(cacheKey)) {return this.cachedScalars.get(cacheKey);}
    const Module = this.bridge.Module;
    const enc = new TextEncoder();
    const bytes = enc.encode(effectKey);
    const ptr = Module._malloc(bytes.length + 1);
    Module.HEAPU8.set(bytes, ptr);
    Module.HEAPU8[ptr + bytes.length] = 0;
    try {
      const raw = Module._upgrade_get_effect_scalar(this.classIdToInt(classId), ptr, bytes.length);
      // raw is 16.16 fixed; convert to float
      const value = raw / 65536.0;
      this.cachedScalars.set(cacheKey, value);
      return value;
    } finally {
      Module._free(ptr);
    }
  }
}


