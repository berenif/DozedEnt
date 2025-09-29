/**
 * WASM Utility Module
 * Provides utilities for loading and interacting with WebAssembly modules
 */

export async function loadWasm(wasmPath, imports = {}) {
  console.log(`[WASM] Loading WebAssembly module from ${wasmPath}`)
  
  try {
    const response = await fetch(wasmPath)
    const buffer = await response.arrayBuffer()
    const module = await WebAssembly.instantiate(buffer, imports)
    
    console.log('[WASM] Module loaded successfully')
    return module.instance
  } catch (error) {
    console.error('[WASM] Failed to load module:', error)
    throw error
  }
}

export function createWasmMemoryView(memory, offset, length) {
  return new Uint8Array(memory.buffer, offset, length)
}

export function writeStringToWasm(memory, offset, str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const view = new Uint8Array(memory.buffer, offset, data.length)
  view.set(data)
  return data.length
}

export function readStringFromWasm(memory, offset, length) {
  const view = new Uint8Array(memory.buffer, offset, length)
  const decoder = new TextDecoder()
  return decoder.decode(view)
}

export default {
  loadWasm,
  createWasmMemoryView,
  writeStringToWasm,
  readStringFromWasm
}