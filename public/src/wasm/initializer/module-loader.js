import { createFallbackExports } from './fallback-exports.js';

export async function loadWasmHelper() {
  const helperModulePaths = [
    './src/utils/wasm.js',
    '../utils/wasm.js'
  ];

  for (const modulePath of helperModulePaths) {
    try {
      const baseUrl = new URL(document.baseURI);
      const wasmModulePath = new URL(modulePath, baseUrl).href;
      console.log(`Attempting to load WASM helper from: ${wasmModulePath}`);
      const wasmHelperModule = await import(wasmModulePath);
      console.log(`Successfully loaded WASM helper from: ${wasmModulePath}`);
      return wasmHelperModule;
    } catch (error) {
      console.warn(`Failed to load WASM helper from ${modulePath}:`, error.message);
    }
  }

  return null;
}

export async function loadTraditional(initializer, loadWasm) {
  const resolveUrl = (path) => {
    try {
      return new URL(path, document.baseURI).toString();
    } catch (error) {
      console.debug('URL construction failed, using raw path:', error.message);
      return path;
    }
  };

  const candidatePaths = [
    '/wasm/game.wasm',
    'game.wasm',
    'wasm/game.wasm',
    'src/wasm/game.wasm',
    '../game.wasm'
  ];

  try {
    if (location && /\.github\.io$/.test(location.hostname)) {
      const parts = location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const repo = parts[0];
        candidatePaths.push(`${repo}/game.wasm`);
        candidatePaths.push(`${repo}/wasm/game.wasm`);
      }
    }
  } catch (error) {
    // Ignore URL parsing errors
  }

  const wasmUrls = candidatePaths.map(resolveUrl);
  const loadAttempts = [];

  for (const wasmUrl of wasmUrls) {
    try {
      console.log(`Attempting traditional WASM load from ${wasmUrl}`);
      const startTime = performance.now();
      const result = await loadWasm({ wasmPath: wasmUrl });
      const loadTime = performance.now() - startTime;
      console.log(`Traditional WASM load succeeded in ${loadTime.toFixed(2)}ms`);

      initializer.errorCount = 0;
      return {
        success: true,
        exports: result.instance.exports,
        wasmPath: wasmUrl,
        isFallback: false
      };
    } catch (error) {
      initializer.errorCount += 1;
      provideErrorGuidance(error);
      loadAttempts.push({ url: wasmUrl, success: false, error: error.message });

      const delay = Math.min(1000 * initializer.errorCount, 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log('WASM loading attempts summary:', loadAttempts);
  console.warn('Could not load WASM from any path - initializing fallback mode');

  showWasmLoadError(loadAttempts);

  return {
    success: true,
    exports: createFallbackExports(initializer),
    wasmPath: 'fallback',
    isFallback: true
  };
}

export function provideErrorGuidance(error) {
  if (!error || typeof error.message !== 'string') {
    return;
  }

  if (error.message.includes('fetch')) {
    console.warn('Network error - check if WASM file exists and is accessible');
  } else if (error.message.includes('WebAssembly')) {
    console.warn('WASM compilation error - file may be corrupted or incompatible');
  } else if (error.message.includes('timeout')) {
    console.warn('WASM loading timed out - check network connection');
  }
}

export function showWasmLoadError(loadAttempts) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.4;
  `;

  const totalAttempts = loadAttempts.length;
  const failedAttempts = loadAttempts.filter((attempt) => !attempt.success).length;

  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">WASM Loading Failed</div>
    <div>Failed to load game engine (${failedAttempts}/${totalAttempts} attempts)</div>
    <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
      Running in limited fallback mode.<br>
      Some features may not work correctly.
    </div>
    <button onclick="this.parentElement.remove()" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 8px;
      font-size: 11px;
    ">Dismiss</button>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}
