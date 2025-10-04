/**
 * Utility helpers for working with string data returned from WASM exports.
 *
 * Many of the WASM functions expose JSON payloads as pointers into linear memory.
 * These helpers normalise the value so callers can work with plain JavaScript
 * strings/objects without worrying about pointer decoding.
 */

const memoryViewCache = new WeakMap();
let sharedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const getTextDecoder = () => {
  if (!sharedTextDecoder && typeof TextDecoder !== 'undefined') {
    sharedTextDecoder = new TextDecoder();
  }
  return sharedTextDecoder;
};

const getMemoryView = (wasmExports) => {
  if (!wasmExports || !wasmExports.memory || !wasmExports.memory.buffer) {
    return null;
  }

  const memory = wasmExports.memory;
  const cachedView = memoryViewCache.get(memory);

  if (!cachedView || cachedView.buffer !== memory.buffer) {
    const view = new Uint8Array(memory.buffer);
    memoryViewCache.set(memory, view);
    return view;
  }

  return cachedView;
};

const normalisePointerValue = (value, explicitLength) => {
  let pointer = null;
  let length = Number.isFinite(explicitLength) ? Number(explicitLength) : null;

  if (typeof value === 'number') {
    pointer = value;
  } else if (typeof value === 'bigint') {
    pointer = Number(value);
  } else if (value && typeof value === 'object') {
    if (typeof value.ptr !== 'undefined') {
      pointer = Number(value.ptr);
    } else if (typeof value.pointer !== 'undefined') {
      pointer = Number(value.pointer);
    }

    if (!Number.isFinite(length)) {
      if (typeof value.len !== 'undefined') {
        length = Number(value.len);
      } else if (typeof value.length === 'number') {
        length = Number(value.length);
      }
    }
  }

  if (!Number.isFinite(pointer)) {
    return null;
  }

  if (!Number.isFinite(length) || length < 0) {
    length = null;
  }

  return { pointer, length };
};

export const decodeWasmString = (wasmExports, value, explicitLength = null) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  const pointerInfo = normalisePointerValue(value, explicitLength);
  if (!pointerInfo) {
    return null;
  }

  const { pointer, length } = pointerInfo;
  if (pointer === 0) {
    return '';
  }

  const memoryView = getMemoryView(wasmExports);
  if (!memoryView || pointer < 0 || pointer >= memoryView.length) {
    return null;
  }

  let end = length !== null ? pointer + length : pointer;
  if (length === null) {
    while (end < memoryView.length && memoryView[end] !== 0) {
      end += 1;
    }
  }

  if (end > memoryView.length) {
    end = memoryView.length;
  }

  const decoder = getTextDecoder();
  if (!decoder) {
    throw new Error('TextDecoder is not available in this environment');
  }

  return decoder.decode(memoryView.subarray(pointer, end));
};

export const parseWasmJson = (wasmExports, value, options = {}) => {
  const { fallback = null, explicitLength = null, onError } = options;
  const raw = decodeWasmString(wasmExports, value, explicitLength);

  if (typeof raw !== 'string' || raw.length === 0) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error, raw);
    } else {
      console.warn('Failed to parse WASM JSON payload:', error);
    }
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};
