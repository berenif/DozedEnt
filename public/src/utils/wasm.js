// Lightweight WASM loader and runtime helpers
// - Loads .wasm from URL/Response/bytes
// - Provides a stable ESM API for WASM game modules

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

const isResponse = x => typeof Response !== 'undefined' && x instanceof Response
const isUrl = x => typeof x === 'string' && /\.wasm($|\?|#)/.test(x)
const isBytes = x => x instanceof ArrayBuffer || x instanceof Uint8Array

const getInstantiate = async (source, importObject) => {
  if (isResponse(source)) {
    try {
      const resForStreaming = typeof source.clone === 'function' ? source.clone() : source
      return await WebAssembly.instantiateStreaming(resForStreaming, importObject)
    } catch (streamingError) {
      // Fallback for incorrect MIME types
      console.debug('WebAssembly streaming failed, falling back to array buffer:', streamingError.message);
      const resForArray = typeof source.clone === 'function' ? source.clone() : source
      const bytes = await resForArray.arrayBuffer()
      return await WebAssembly.instantiate(bytes, importObject)
    }
  }

  if (isUrl(source)) {
    const res = await fetch(source)
    return await getInstantiate(res, importObject)
  }

  if (isBytes(source)) {
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
    return await WebAssembly.instantiate(bytes, importObject)
  }

  throw new TypeError('Unsupported WASM source; expected URL/Response/bytes')
}

const defaultEnv = memory => ({
  // Minimal imports commonly used by toolchains
  env: {
    memory,
    abort: () => { throw new Error('wasm abort') },
    abort_: () => { throw new Error('wasm abort_') },
    // Console helpers – optional for debugging
    __console_log: (ptr, len) => {
      const view = new Uint8Array(memory.buffer, ptr, len)
      console.log(textDecoder.decode(view))
    }
  }
})

// Minimal WASI shim for browser environments. Provides enough to satisfy
// modules compiled against wasi_snapshot_preview1 without crashing.
// SES-compatible implementation that avoids Proxy usage and unpermitted intrinsics.
const createWasiPreview1 = (memory) => {
	const u8 = () => new Uint8Array(memory.buffer)
	const dv = () => new DataView(memory.buffer)
	
	// Deterministic PRNG fallback (LCG) for environments without crypto
	// Seed from globalThis.runSeedForVisuals when available, else a constant
	let __wasiPrngState = (() => {
		try {
			const seedBig = (typeof globalThis !== 'undefined' && typeof globalThis.runSeedForVisuals !== 'undefined')
				? globalThis.runSeedForVisuals
				: 0xC0FFEE ^ 0x9E3779B9;
			const seedNum = typeof seedBig === 'bigint' ? Number(seedBig & 0xffffffffn) : (seedBig >>> 0);
			return (seedNum >>> 0) || 0x9E3779B9;
		} catch {
			return 0x9E3779B9;
		}
	})();
	const __wasiNextByte = () => {
		// LCG parameters (Numerical Recipes)
		__wasiPrngState = (Math.imul(__wasiPrngState, 1664525) + 1013904223) >>> 0;
		return __wasiPrngState & 0xff;
	};
	
	// Safe crypto access that works under SES lockdown
	const getCrypto = () => {
		try {
			// Use globalThis directly to avoid invalid 'this' under strict mode/ESM
			const g = typeof globalThis !== 'undefined' ? globalThis : null;
			return g && g.crypto && typeof g.crypto.getRandomValues === 'function' 
				? g.crypto 
				: null;
		} catch (e) {
			return null;
		}
	};

	// Create a completely plain object to satisfy SES lockdown requirements
	// Use Object.create(null) and explicit property assignment to avoid prototype pollution
	const wasi = Object.create(null);
	
	// Define all WASI functions as non-enumerable, non-configurable properties
	// to prevent SES from considering them as unpermitted intrinsics
	Object.defineProperty(wasi, 'fd_write', {
		value: (fd, iovPtr, iovCnt, nwrittenPtr) => {
			let written = 0;
			const dataView = dv();
			const bytes = u8();
			let offset = iovPtr >>> 0;
			for (let i = 0; i < (iovCnt >>> 0); i++) {
				const ptr = dataView.getUint32(offset, true);
				const len = dataView.getUint32(offset + 4, true);
				offset += 8;
				const chunk = bytes.subarray(ptr, ptr + len);
				const text = textDecoder.decode(chunk);
				if (fd === 1) { console.log(text); }
				else if (fd === 2) { console.error(text); }
				written += len;
			}
			dataView.setUint32(nwrittenPtr >>> 0, written >>> 0, true);
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'proc_exit', {
		value: (code) => { throw new Error(`WASI proc_exit: ${code}`); },
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'random_get', {
		value: (ptr, len) => {
			const view = u8().subarray(ptr >>> 0, (ptr >>> 0) + (len >>> 0));
			const crypto = getCrypto();
			if (crypto) {
				crypto.getRandomValues(view);
			} else {
				// Deterministic fallback for environments without crypto
				for (let i = 0; i < view.length; i++) {
					view[i] = __wasiNextByte();
				}
			}
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	// Deterministic time counter for WASM (starts at 0, increments on each call)
	let __wasiTimeCounter = 0n;
	const __wasiTimeIncrement = 16666666n; // ~16.67ms in nanoseconds (60 FPS)
	
	Object.defineProperty(wasi, 'clock_time_get', {
		value: (_id, _precision, timePtr) => {
			// Use deterministic time counter instead of Date.now()
			// This ensures reproducible behavior across runs
			__wasiTimeCounter += __wasiTimeIncrement;
			const nowNs = __wasiTimeCounter;
			
			const dataView = dv();
			if (typeof dataView.setBigUint64 === 'function') {
				dataView.setBigUint64(timePtr >>> 0, nowNs, true);
			} else {
				const low = Number(nowNs & 0xffffffffn);
				const high = Number((nowNs >> 32n) & 0xffffffffn);
				dataView.setUint32((timePtr >>> 0), low, true);
				dataView.setUint32((timePtr >>> 0) + 4, high, true);
			}
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'args_sizes_get', {
		value: (argcPtr, argvBufSizePtr) => {
			const dataView = dv();
			dataView.setUint32(argcPtr >>> 0, 0, true);
			dataView.setUint32(argvBufSizePtr >>> 0, 0, true);
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'args_get', {
		value: () => 0,
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'environ_sizes_get', {
		value: (envcPtr, envBufSizePtr) => {
			const dataView = dv();
			dataView.setUint32(envcPtr >>> 0, 0, true);
			dataView.setUint32(envBufSizePtr >>> 0, 0, true);
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'environ_get', {
		value: () => 0,
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'fd_close', {
		value: () => 0,
		writable: false,
		enumerable: false,
		configurable: false
	});

	Object.defineProperty(wasi, 'fd_seek', {
		value: (_fd, _offsetLow, _offsetHigh, _whence, newOffsetPtr) => {
			// report position 0
			const dataView = dv();
			dataView.setUint32(newOffsetPtr >>> 0, 0, true);
			dataView.setUint32((newOffsetPtr >>> 0) + 4, 0, true);
			return 0;
		},
		writable: false,
		enumerable: false,
		configurable: false
	});

	// Freeze the object to prevent modifications and satisfy SES requirements
	// This ensures SES won't try to remove properties as unpermitted intrinsics
	return Object.freeze(wasi);
}

const ensureWasiObject = (maybeWasi, memory) => (maybeWasi && typeof maybeWasi === 'object') ? maybeWasi : createWasiPreview1(memory)

/**
 * Load a WebAssembly module.
 * @param {string|Response|ArrayBuffer|Uint8Array} source
 * @param {object} imports Optional importObject; merged over defaults
 * @returns {Promise<{instance: WebAssembly.Instance, module: WebAssembly.Module, memory: WebAssembly.Memory, exports: any}>}
 */
export const loadWasm = async (source, imports = {}) => {
  const memory =
    imports?.env?.memory || new WebAssembly.Memory({initial: 16})

  // Merge default env with user imports (user wins on conflicts)
  const base = defaultEnv(memory)
  const user = imports && typeof imports === 'object' ? imports : {}
  const mergedImports = {
    ...base,
    ...user,
    env: {
      ...base.env,
      ...(user.env || {})
    },
    // Provide a minimal WASI if caller did not supply a valid object
    wasi_snapshot_preview1: ensureWasiObject(user.wasi_snapshot_preview1, memory),
    wasi_unstable: ensureWasiObject(user.wasi_unstable, memory)
  }

  const {instance, module} = await getInstantiate(source, mergedImports)
  const exports = instance.exports

  return {instance, module, memory, exports}
}

/**
 * Create helpers to pass strings between JS and WASM using an exported allocator.
 * Expects the module to export `malloc` and provide linear memory.
 */
export const createStringCodec = ({memory, exports}) => {
  const malloc = exports.malloc

  if (typeof malloc !== 'function') {
    return {
      toWasm: () => { throw new Error('malloc export not found') },
      fromWasm: () => { throw new Error('memory export not found') }
    }
  }

  return {
    toWasm: str => {
      const bytes = textEncoder.encode(str)
      const ptr = malloc(bytes.byteLength)
      new Uint8Array(memory.buffer, ptr, bytes.byteLength).set(bytes)
      return {ptr, len: bytes.byteLength}
    },
    fromWasm: (ptr, len) =>
      textDecoder.decode(new Uint8Array(memory.buffer, ptr, len))
  }
}

/**
 * Optional convenience: initialize a WASM game module and expose a minimal
 * lifecycle interface for game applications.
 */
export const initWasmGame = async ({source, imports, onReady}) => {
  const runtime = await loadWasm(source, imports)

  const api = {
    // Convention-based optional exports
    start: runtime.exports.start || (() => {}),
    update: runtime.exports.update || (() => {}),
    handleMessage: runtime.exports.handleMessage || (() => {}),
    exports: runtime.exports,
    memory: runtime.memory
  }

  onReady?.(api)
  return runtime.exports; // Directly return exports
}


