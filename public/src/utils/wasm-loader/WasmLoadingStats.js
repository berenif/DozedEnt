const ZERO_DIVISION_GUARD = 1e-9;

export class WasmLoadingStats {
  constructor() {
    this.modulesLoaded = 0;
    this.totalLoadTime = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.compressionSavings = 0;
    this.failedLoads = 0;
  }

  recordCacheHit() {
    this.cacheHits += 1;
  }

  recordCacheMiss(loadTimeMs) {
    this.modulesLoaded += 1;
    this.cacheMisses += 1;
    this.totalLoadTime += loadTimeMs;
  }

  recordFailure() {
    this.failedLoads += 1;
  }

  addCompressionSavings(bytesSaved) {
    if (Number.isFinite(bytesSaved) && bytesSaved > 0) {
      this.compressionSavings += bytesSaved;
    }
  }

  snapshot({ loadedModules = 0, loadingInProgress = 0 } = {}) {
    const totalCacheEvents = this.cacheHits + this.cacheMisses;
    return {
      modulesLoaded: this.modulesLoaded,
      totalLoadTime: this.totalLoadTime,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      compressionSavings: this.compressionSavings,
      failedLoads: this.failedLoads,
      loadedModules,
      loadingInProgress,
      averageLoadTime: this.modulesLoaded === 0
        ? 0
        : this.totalLoadTime / (this.modulesLoaded || ZERO_DIVISION_GUARD),
      cacheHitRate: totalCacheEvents === 0
        ? 0
        : this.cacheHits / (totalCacheEvents || ZERO_DIVISION_GUARD)
    };
  }
}

export const globalWasmLoadingStats = new WasmLoadingStats();
