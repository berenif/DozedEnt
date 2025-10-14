// Fallback WASM helper for when the main helper fails to load due to MIME type issues
// This provides the same API as wasm.js but with simplified implementation

/**
 * Simplified WASM loader that works even with MIME type issues
 * @param {string|Response|ArrayBuffer|Uint8Array} source
 * @param {object} imports Optional importObject
 * @returns {Promise<{instance: WebAssembly.Instance, module: WebAssembly.Module, memory: WebAssembly.Memory, exports: any}>}
 */
export const loadWasm = async (source, imports = {}) => {
  const memory = imports?.env?.memory || new WebAssembly.Memory({initial: 16});

  // Minimal imports
  const defaultImports = {
    env: {
      memory,
      abort: () => { throw new Error('wasm abort') },
      abort_: () => { throw new Error('wasm abort_') },
      emscripten_notify_memory_growth: () => {}
    }
  };

  const mergedImports = {
    ...defaultImports,
    ...imports,
    env: {
      ...defaultImports.env,
      ...(imports.env || {})
    }
  };

  let result;
  
  if (typeof source === 'string' && source.endsWith('.wasm')) {
    // URL source
    const response = await fetch(source, { cache: 'no-store' });
    result = await WebAssembly.instantiateStreaming(response, mergedImports);
  } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
    // Binary source
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    result = await WebAssembly.instantiate(bytes, mergedImports);
  } else if (source instanceof Response) {
    // Response source
    try {
      result = await WebAssembly.instantiateStreaming(source, mergedImports);
    } catch (error) {
      // Fallback to array buffer
      const bytes = await source.arrayBuffer();
      result = await WebAssembly.instantiate(bytes, mergedImports);
    }
  } else {
    throw new TypeError('Unsupported WASM source');
  }

  const {instance, module} = result;
  const exports = instance.exports;

  return {instance, module, memory, exports};
};

/**
 * Create string codec helpers
 * @param {object} param0
 * @returns {object}
 */
export const createStringCodec = ({memory, exports}) => {
  const malloc = exports.malloc;

  if (typeof malloc !== 'function') {
    return {
      toWasm: () => { throw new Error('malloc export not found') },
      fromWasm: () => { throw new Error('memory export not found') }
    };
  }

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  return {
    toWasm: str => {
      const bytes = textEncoder.encode(str);
      const ptr = malloc(bytes.byteLength);
      new Uint8Array(memory.buffer, ptr, bytes.byteLength).set(bytes);
      return {ptr, len: bytes.byteLength};
    },
    fromWasm: (ptr, len) =>
      textDecoder.decode(new Uint8Array(memory.buffer, ptr, len))
  };
};

/**
 * Initialize WASM game module
 * @param {object} param0
 * @returns {Promise<any>}
 */
export const initWasmGame = async ({source, imports, onReady}) => {
  const runtime = await loadWasm(source, imports);

  const api = {
    start: runtime.exports.start || (() => {}),
    update: runtime.exports.update || (() => {}),
    handleMessage: runtime.exports.handleMessage || (() => {}),
    exports: runtime.exports,
    memory: runtime.memory
  };

  onReady?.(api);
  return runtime.exports;
};

// Export as default for compatibility
export default {
  loadWasm,
  createStringCodec,
  initWasmGame
};
