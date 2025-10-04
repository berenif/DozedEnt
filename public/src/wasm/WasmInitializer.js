import { globalWasmLoader } from '../utils/wasm-lazy-loader.js';
import { globalMemoryOptimizer } from '../utils/memory-optimizer.js';

import { loadWasmHelper, loadTraditional } from './initializer/module-loader.js';
import {
  initializeRuntime,
  runInitializationTests,
  initializeGameRun,
  applyUrlParameters,
  normalizeBooleanExports
} from './initializer/runtime.js';
import { runDiagnostics } from './initializer/diagnostics.js';
import { showCriticalError } from './initializer/ui-feedback.js';
import { emitInitializationEvent } from './initializer/events.js';

export class WasmInitializer {
  constructor() {
    this.exports = null;
    this.isLoaded = false;
    this.isFallbackMode = false;
    this.runSeed = 0n;
    this.errorCount = 0;
  }

  async initialize() {
    const initStartTime = performance.now();

    if (globalMemoryOptimizer && !globalMemoryOptimizer.isMonitoring) {
      setTimeout(() => {
        try {
          globalMemoryOptimizer.startMonitoring();
        } catch (error) {
          console.debug('Memory optimizer failed to start:', error.message);
        }
      }, 1000);
    }

    try {
      const wasmHelperModule = await loadWasmHelper();
      if (!wasmHelperModule) {
        throw new Error('Failed to load WASM helper module');
      }

      const { loadWasm } = wasmHelperModule;

      try {
        console.log('Attempting to load WASM module with lazy loader...');
        const wasmInstance = await globalWasmLoader.loadModule('game', {
          imports: {},
          onProgress: (progress) => {
            console.log(`WASM loading progress: ${(progress.progress * 100).toFixed(1)}%`);
          }
        });

        if (!wasmInstance || !wasmInstance.exports) {
          throw new Error('Lazy loader returned invalid WASM instance');
        }

        this.exports = wasmInstance.exports;
        this.isLoaded = true;
        this.isFallbackMode = false;

        const lazyLoadTime = performance.now() - initStartTime;
        console.log(`WASM module loaded successfully with lazy loader in ${lazyLoadTime.toFixed(2)}ms`);

        normalizeBooleanExports(this);
        globalThis.wasmExports = this.exports;

        await initializeRuntime(this);
        await runInitializationTests(this);
        initializeGameRun(this);
        applyUrlParameters(this);

        const initTime = performance.now() - initStartTime;
        console.log(`WASM initialization completed in ${initTime.toFixed(1)}ms`);

        emitInitializationEvent({
          success: true,
          fallbackMode: false,
          loadTime: initTime,
          wasmPath: 'lazy-loader:game'
        });

        return true;
      } catch (lazyLoadError) {
        console.warn('Lazy loader failed, falling back to traditional loading:', lazyLoadError.message);

        if (lazyLoadError.message?.includes('timeout')) {
          await runDiagnostics('game');
        }
      }

      const loadResult = await loadTraditional(this, loadWasm);
      if (!loadResult.success) {
        return false;
      }

      this.exports = loadResult.exports;
      this.isLoaded = true;
      this.isFallbackMode = loadResult.isFallback;

      normalizeBooleanExports(this);
      globalThis.wasmExports = this.exports;

      if (!this.isFallbackMode) {
        await initializeRuntime(this);
      }

      initializeGameRun(this);
      applyUrlParameters(this);

      const initTime = performance.now() - initStartTime;
      console.log(`WASM initialization completed in ${initTime.toFixed(1)}ms`);

      emitInitializationEvent({
        success: true,
        fallbackMode: this.isFallbackMode,
        loadTime: initTime,
        wasmPath: loadResult.wasmPath
      });

      return true;
    } catch (error) {
      const initTime = performance.now() - initStartTime;
      console.error('WASM initialization failed completely:', error);

      showCriticalError(error);
      emitInitializationEvent({
        success: false,
        fallbackMode: false,
        loadTime: initTime,
        error: error.message
      });

      return false;
    }
  }
}
