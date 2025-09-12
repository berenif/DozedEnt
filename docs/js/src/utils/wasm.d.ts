export type WasmSource = string | Response | ArrayBuffer | Uint8Array

export interface WasmRuntime {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory: WebAssembly.Memory
  exports: Record<string, any>
}

export interface StringCodec {
  toWasm: (str: string) => {ptr: number, len: number}
  fromWasm: (ptr: number, len: number) => string
}

export function loadWasm(source: WasmSource, imports?: Record<string, any>): Promise<WasmRuntime>

export function createStringCodec(runtime: {memory: WebAssembly.Memory, exports: Record<string, any>}): StringCodec

export function initWasmGame(params: {
  source: WasmSource
  imports?: Record<string, any>
  onReady?: (api: {
    start: () => void
    update: (dtMs: number) => void
    handleMessage: (ptr: number, len: number) => void
    exports: Record<string, any>
    memory: WebAssembly.Memory
  }) => void
}): Promise<{
  start: () => void
  update: (dtMs: number) => void
  handleMessage: (ptr: number, len: number) => void
  exports: Record<string, any>
  memory: WebAssembly.Memory
}>


