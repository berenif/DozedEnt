// Lightweight WASM loader and runtime helpers
// - Keeps Trystero core unchanged
// - Loads .wasm from URL/Response/bytes
// - Provides a stable ESM API that strategies/apps can use

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
    } catch (_) {
      // Fallback for incorrect MIME types
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
const createWasiPreview1 = (memory) => {
	const u8 = () => new Uint8Array(memory.buffer)
	const dv = () => new DataView(memory.buffer)
	const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') ? globalThis.crypto : null

	// Plain object without Proxy to satisfy SES lockdown and WASM import checks
	const wasi = {
		fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
			let written = 0
			const dataView = dv()
			const bytes = u8()
			let offset = iovPtr >>> 0
			for (let i = 0; i < (iovCnt >>> 0); i++) {
				const ptr = dataView.getUint32(offset, true)
				const len = dataView.getUint32(offset + 4, true)
				offset += 8
				const chunk = bytes.subarray(ptr, ptr + len)
				const text = textDecoder.decode(chunk)
				if (fd === 1) {console.log(text)}
				else if (fd === 2) {console.error(text)}
				written += len
			}
			dataView.setUint32(nwrittenPtr >>> 0, written >>> 0, true)
			return 0
		},

		proc_exit: (code) => { throw new Error(`WASI proc_exit: ${code}`) },

		random_get: (ptr, len) => {
			const view = u8().subarray(ptr >>> 0, (ptr >>> 0) + (len >>> 0))
			if (cryptoObj) {cryptoObj.getRandomValues(view)}
			else {for (let i = 0; i < view.length; i++) {view[i] = (Math.random() * 256) | 0}}
			return 0
		},

		clock_time_get: (_id, _precision, timePtr) => {
			const nowNs = BigInt(Date.now()) * 1000000n
			const dataView = dv()
			if (typeof dataView.setBigUint64 === 'function') {
				dataView.setBigUint64(timePtr >>> 0, nowNs, true)
			} else {
				const low = Number(nowNs & 0xffffffffn)
				const high = Number((nowNs >> 32n) & 0xffffffffn)
				dataView.setUint32((timePtr >>> 0), low, true)
				dataView.setUint32((timePtr >>> 0) + 4, high, true)
			}
			return 0
		},

		args_sizes_get: (argcPtr, argvBufSizePtr) => {
			const dataView = dv()
			dataView.setUint32(argcPtr >>> 0, 0, true)
			dataView.setUint32(argvBufSizePtr >>> 0, 0, true)
			return 0
		},
		args_get: () => 0,
		environ_sizes_get: (envcPtr, envBufSizePtr) => {
			const dataView = dv()
			dataView.setUint32(envcPtr >>> 0, 0, true)
			dataView.setUint32(envBufSizePtr >>> 0, 0, true)
			return 0
		},
		environ_get: () => 0,

		fd_close: () => 0,
		fd_seek: (_fd, _offsetLow, _offsetHigh, _whence, newOffsetPtr) => {
			// report position 0
			dv().setUint32(newOffsetPtr >>> 0, 0, true)
			dv().setUint32((newOffsetPtr >>> 0) + 4, 0, true)
			return 0
		}
	}

	// Provide no-op implementations for commonly missing functions explicitly
	// to avoid relying on Proxy traps which SES forbids. Any additional
	// functions required by a specific module should be provided by imports.
	return Object.freeze(wasi)
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
  const mergedImports = {
    ...defaultEnv(memory),
    ...imports,
    env: {
      ...defaultEnv(memory).env,
      ...(imports.env || {})
    },
    // Provide a minimal WASI if caller did not supply a valid object
    wasi_snapshot_preview1: ensureWasiObject(imports.wasi_snapshot_preview1, memory),
    wasi_unstable: ensureWasiObject(imports.wasi_unstable, memory)
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
 * lifecycle interface without coupling to Trystero. Your app can wire this to
 * a room via `room.makeAction` as desired.
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
  return api
}


