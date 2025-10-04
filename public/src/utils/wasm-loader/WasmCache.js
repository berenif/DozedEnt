export class WasmCache {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.moduleCache = new Map();
  }

  getLoaded(moduleName) {
    return this.loadedModules.get(moduleName);
  }

  hasLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }

  setLoaded(moduleName, instance) {
    this.loadedModules.set(moduleName, instance);
  }

  deleteLoaded(moduleName) {
    return this.loadedModules.delete(moduleName);
  }

  clearLoaded() {
    this.loadedModules.clear();
  }

  getModuleExports(moduleName) {
    return this.loadedModules.get(moduleName)?.exports || null;
  }

  getLoading(moduleName) {
    return this.loadingPromises.get(moduleName);
  }

  hasLoading(moduleName) {
    return this.loadingPromises.has(moduleName);
  }

  setLoading(moduleName, promise) {
    this.loadingPromises.set(moduleName, promise);
  }

  clearLoading(moduleName) {
    this.loadingPromises.delete(moduleName);
  }

  clearAllLoading() {
    this.loadingPromises.clear();
  }

  loadedCount() {
    return this.loadedModules.size;
  }

  loadingCount() {
    return this.loadingPromises.size;
  }

  unload(moduleName) {
    const existed = this.loadedModules.delete(moduleName);
    this.moduleCache.delete(moduleName);
    return existed;
  }

  clearModuleCache() {
    const count = this.moduleCache.size;
    this.moduleCache.clear();
    return count;
  }

  clearAllCaches() {
    const cleared = this.loadedModules.size;
    this.loadedModules.clear();
    this.loadingPromises.clear();
    this.moduleCache.clear();
    return cleared;
  }
}

export const globalWasmCache = new WasmCache();
