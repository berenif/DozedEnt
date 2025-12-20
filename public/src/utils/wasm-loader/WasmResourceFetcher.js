import { decompressIfNeeded } from './WasmCompression.js';

export class WasmResourceFetcher {
  constructor({ retryStrategy, config, logger = console } = {}) {
    this.retryStrategy = retryStrategy;
    this.config = config;
    this.logger = logger;
  }

  updateConfig(config) {
    this.config = config;
  }

  async loadModuleBytes(moduleName, options = {}) {
    const paths = this.resolveModulePaths(moduleName);
    let lastError = null;

    this.logger.log?.(`Resolving paths for WASM module '${moduleName}':`, paths);

    for (const path of paths) {
      try {
        this.logger.log?.(`Attempting to load WASM from: ${path}`);
        const arrayBuffer = await this.fetchWithTimeout(path, options);

        this.logger.log?.(`Successfully loaded WASM from: ${path} (${arrayBuffer.byteLength} bytes)`);

        const decompressed = await decompressIfNeeded(
          arrayBuffer,
          {
            enableCompression: this.config.enableCompression,
            compressionThreshold: this.config.compressionThreshold
          },
          { logger: this.logger, sourcePath: path }
        );

        return decompressed;
      } catch (error) {
        lastError = error;
        this.logger.warn?.(`Failed to load from ${path}:`, error.message);
      }
    }

    this.logger.error?.(`All module paths failed for '${moduleName}':`, paths);
    const reason = lastError?.message || 'Unknown error';
    throw new Error(`All module paths failed for '${moduleName}': ${reason}`);
  }

  async fetchWithTimeout(url, options = {}) {
    if (!url || url.trim() === '') {
      throw new Error('Invalid URL provided to fetchWithTimeout');
    }

    const controller = new AbortController();
    const timeoutMs = this.config.loadTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: options.fetchOptions?.cache || 'no-store',
        ...(options.fetchOptions || {})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.body && typeof options.onProgress === 'function') {
        const result = await this.trackDownloadProgress(response, options.onProgress);
        clearTimeout(timeoutId);
        return result;
      }

      const arrayBuffer = await response.arrayBuffer();
      clearTimeout(timeoutId);
      return arrayBuffer;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Load timeout after ${timeoutMs}ms`);
      }

      throw error;
    }
  }

  async trackDownloadProgress(response, onProgress) {
    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    const chunks = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedBytes += value.length;

      if (totalBytes > 0) {
        onProgress({
          loaded: receivedBytes,
          total: totalBytes,
          progress: receivedBytes / totalBytes
        });
      }
    }

    const arrayBuffer = new ArrayBuffer(receivedBytes);
    const uint8Array = new Uint8Array(arrayBuffer);
    let offset = 0;

    for (const chunk of chunks) {
      uint8Array.set(chunk, offset);
      offset += chunk.length;
    }

    return arrayBuffer;
  }

  resolveModulePaths(moduleName) {
    let baseUrl;
    try {
      baseUrl = new URL(document.baseURI || window.location.href);
    } catch {
      baseUrl = new URL(window.location.href);
    }

    // Detect the site's base path (e.g., '/DozedEnt/' for GitHub Pages subdirectory)
    const basePath = this.detectBasePath(baseUrl);

    const candidates = [
      // Prefer relative paths first - these work correctly with baseURI
      `wasm/${moduleName}.wasm`,
      `${moduleName}.wasm`,
      // Use detected base path for absolute paths (GitHub Pages compatibility)
      `${basePath}wasm/${moduleName}.wasm`,
      // Additional fallback paths
      `public/${moduleName}.wasm`,
      `src/wasm/${moduleName}.wasm`,
      `dist/${moduleName}.wasm`,
      `../${moduleName}.wasm`,
      `../src/wasm/${moduleName}.wasm`
    ];

    return candidates
      .map(path => {
        if (!path || path.trim() === '') {
          this.logger.warn?.(`Invalid WASM path: "${path}"`);
          return null;
        }

        try {
          return new URL(path, baseUrl).href;
        } catch (error) {
          this.logger.warn?.(`Failed to create URL for path "${path}":`, error.message);
          return path;
        }
      })
      .filter(Boolean);
  }

  /**
   * Detect the site's base path from the URL.
   * Handles GitHub Pages subdirectory deployments (e.g., /DozedEnt/).
   * @param {URL} baseUrl - The base URL to analyze
   * @returns {string} The base path (e.g., '/DozedEnt/' or '/')
   */
  detectBasePath(baseUrl) {
    try {
      const pathname = baseUrl.pathname;

      // Check for GitHub Pages pattern: /<repo-name>/...
      // The first path segment after root is likely the repo name
      const segments = pathname.split('/').filter(Boolean);

      if (segments.length > 0) {
        // If we're in a subdirectory (e.g., /DozedEnt/index.html)
        // Check if this looks like a GitHub Pages deployment
        const isGitHubPages = baseUrl.hostname.endsWith('.github.io');

        if (isGitHubPages && segments.length >= 1) {
          // Return the repo path (e.g., '/DozedEnt/')
          return `/${segments[0]}/`;
        }
      }

      // Default to root for non-GitHub Pages or root deployments
      return '/';
    } catch {
      return '/';
    }
  }
}
