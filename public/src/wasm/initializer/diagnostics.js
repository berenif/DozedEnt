import { globalWasmLoader } from '../../utils/wasm-lazy-loader.js';

export async function runDiagnostics(moduleName = 'game') {
  console.log('Running WASM diagnostics due to timeout...');
  try {
    const diagnostics = await globalWasmLoader.runDiagnostics(moduleName);
    console.log('WASM Diagnostics Results:', diagnostics);
  } catch (error) {
    console.warn('Failed to run diagnostics:', error.message);
  }
}
