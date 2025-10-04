export class WasmImportFactory {
  constructor({ cache, logger = console } = {}) {
    this.cache = cache;
    this.logger = logger;
  }

  createSimplifiedImportObject(moduleName) {
    this.logger.log?.(`Creating simplified import object for ${moduleName}...`);

    const memory = new WebAssembly.Memory({ initial: 8 });

    return {
      env: {
        memory,
        abort: () => { throw new Error('WASM abort'); },
        __console_log: (ptr, len) => this.#logFromMemory('[WASM]', memory, ptr, len),
        js_log: (ptr, len) => this.#logFromMemory('[WASM]', memory, ptr, len),
        js_get_timestamp: () => Date.now(),
        js_random: () => Math.random()
      }
    };
  }

  createImportObject(moduleName, userImports = {}) {
    const memory = userImports.env?.memory || new WebAssembly.Memory({
      initial: 16,
      maximum: 1024,
      shared: false
    });

    const baseEnv = {
      memory,
      abort: () => { throw new Error('WASM abort'); },
      abort_: () => { throw new Error('WASM abort_'); },
      __console_log: (ptr, len) => this.#logFromMemory('[WASM]', memory, ptr, len),
      js_log: (ptr, len) => this.#logFromMemory('[WASM]', memory, ptr, len),
      js_get_timestamp: () => Date.now(),
      js_random: () => Math.random(),
      emscripten_notify_memory_growth: () => {},
      memory_fill: (memoryIndex, dest, value, size) => this.#memoryFill(memoryIndex, dest, value, size, memory),
      memory_copy: (memoryIndex, dest, src, size) => this.#memoryCopy(memoryIndex, dest, src, size, memory),
      wasm_exception: (exceptionPtr) => {
        this.logger.warn?.('[WASM] Exception occurred:', exceptionPtr);
      }
    };

    const baseImports = { env: baseEnv };
    const wasiImports = this.createWasiShim(memory);

    let moduleSpecificImports = {};
    if (moduleName === 'game') {
      moduleSpecificImports = {
        wasi_snapshot_preview1: wasiImports,
        wasi_unstable: wasiImports
      };
    }

    const finalImports = {
      ...baseImports,
      ...moduleSpecificImports,
      ...userImports
    };

    if (userImports.env || moduleSpecificImports.env) {
      finalImports.env = {
        ...baseImports.env,
        ...moduleSpecificImports.env,
        ...userImports.env
      };
    }

    return finalImports;
  }

  createWasiShim(memory) {
    return this.#createWasiImplementation(memory, {
      randomByte: () => Math.floor(Math.random() * 256),
      log: message => this.logger.log?.(message),
      error: message => this.logger.error?.(message)
    });
  }

  createMinimalWasiShim(memory) {
    return this.#createWasiImplementation(memory, {
      randomByte: () => Math.floor(Math.random() * 256),
      log: message => this.logger.log?.(message),
      error: message => this.logger.error?.(message)
    });
  }

  getAdditionalMemory(memoryIndex) {
    const primaryMemory = this.cache?.getLoaded('main')?.exports?.memory
      || this.cache?.getLoaded('game')?.exports?.memory;

    if (primaryMemory) {
      return primaryMemory;
    }

    this.logger.warn?.(`No cached memory available for index ${memoryIndex}; creating fallback memory`);
    return new WebAssembly.Memory({ initial: 16 });
  }

  #logFromMemory(prefix, memory, ptr, len) {
    try {
      const view = new Uint8Array(memory.buffer, ptr, len);
      const text = new TextDecoder().decode(view);
      this.logger.log?.(`${prefix}: ${text}`);
    } catch (error) {
      this.logger.warn?.('Failed to decode WASM log message:', error);
    }
  }

  #memoryFill(memoryIndex, dest, value, size, defaultMemory) {
    try {
      const mem = memoryIndex === 0 ? defaultMemory : this.getAdditionalMemory(memoryIndex);
      const view = new Uint8Array(mem.buffer, dest, size);
      view.fill(value);
      return 0;
    } catch (error) {
      this.logger.warn?.('Memory fill error:', error);
      return 1;
    }
  }

  #memoryCopy(memoryIndex, dest, src, size, defaultMemory) {
    try {
      const mem = memoryIndex === 0 ? defaultMemory : this.getAdditionalMemory(memoryIndex);
      const destView = new Uint8Array(mem.buffer, dest, size);
      const srcView = new Uint8Array(mem.buffer, src, size);
      destView.set(srcView);
      return 0;
    } catch (error) {
      this.logger.warn?.('Memory copy error:', error);
      return 1;
    }
  }

  #createWasiImplementation(memory, { randomByte, log, error }) {
    const bytes = () => new Uint8Array(memory.buffer);
    const view = () => new DataView(memory.buffer);
    const decoder = new TextDecoder();

    return {
      fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
        let written = 0;
        const dataView = view();
        const buffer = bytes();
        let offset = iovPtr >>> 0;

        for (let i = 0; i < (iovCnt >>> 0); i++) {
          const ptr = dataView.getUint32(offset, true);
          const len = dataView.getUint32(offset + 4, true);
          offset += 8;

          try {
            const chunk = buffer.subarray(ptr, ptr + len);
            const text = decoder.decode(chunk);
            if (fd === 1) {
              log(text);
            } else if (fd === 2) {
              error(text);
            }
            written += len;
          } catch (decodeError) {
            this.logger.warn?.('WASI fd_write decode error:', decodeError);
          }
        }

        dataView.setUint32(nwrittenPtr >>> 0, written >>> 0, true);
        return 0;
      },

      proc_exit: (code) => {
        throw new Error(`WASI proc_exit: ${code}`);
      },

      random_get: (ptr, len) => {
        const buffer = bytes().subarray(ptr >>> 0, (ptr >>> 0) + (len >>> 0));

        try {
          if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
            globalThis.crypto.getRandomValues(buffer);
            return 0;
          }
        } catch {
          // Fall back to deterministic generator
        }

        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = randomByte();
        }
        return 0;
      },

      clock_time_get: (_id, _precision, timePtr) => {
        const nowNs = BigInt(Date.now()) * 1000000n;
        const dataView = view();

        try {
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(timePtr >>> 0, nowNs, true);
          } else {
            const low = Number(nowNs & 0xffffffffn);
            const high = Number((nowNs >> 32n) & 0xffffffffn);
            dataView.setUint32(timePtr >>> 0, low, true);
            dataView.setUint32((timePtr >>> 0) + 4, high, true);
          }
        } catch (clockError) {
          this.logger.warn?.('WASI clock_time_get error:', clockError);
        }
        return 0;
      },

      args_sizes_get: (argcPtr, argvBufSizePtr) => {
        const dataView = view();
        dataView.setUint32(argcPtr >>> 0, 0, true);
        dataView.setUint32(argvBufSizePtr >>> 0, 0, true);
        return 0;
      },

      args_get: () => 0,
      environ_sizes_get: (envcPtr, envBufSizePtr) => {
        const dataView = view();
        dataView.setUint32(envcPtr >>> 0, 0, true);
        dataView.setUint32(envBufSizePtr >>> 0, 0, true);
        return 0;
      },
      environ_get: () => 0,
      fd_close: () => 0,
      fd_seek: (_fd, _offsetLow, _offsetHigh, _whence, newOffsetPtr) => {
        const dataView = view();
        dataView.setUint32(newOffsetPtr >>> 0, 0, true);
        dataView.setUint32((newOffsetPtr >>> 0) + 4, 0, true);
        return 0;
      }
    };
  }
}
