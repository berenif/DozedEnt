import { WasmLoader, globalWasmLoaderInstance } from './wasm-loader/WasmLoader.js';
import { cleanupGlobalSourceMaps } from './wasm-loader/WasmSourceMap.js';

export { WasmLoader } from './wasm-loader/WasmLoader.js';
export { cleanupGlobalSourceMaps } from './wasm-loader/WasmSourceMap.js';

export const globalWasmLoader = globalWasmLoaderInstance;

if (typeof window !== 'undefined') {
  window.runWasmDiagnostics = () => globalWasmLoader.runDiagnostics();
  window.wasmLoader = globalWasmLoader;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    cleanupGlobalSourceMaps({ logger: console });

    globalWasmLoader.preloadCriticalModules().catch(error => {
      console.warn('Failed to preload critical WASM modules:', error);
    });
  });
}
