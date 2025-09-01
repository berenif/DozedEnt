import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('WASM: load from raw bytes, codec roundtrip, init basics', async ({page}) => {
  await page.goto(testUrl)

  // Load the browser bundle for the wasm helpers
  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  // Minimal valid empty wasm module (header + version only)
  const emptyWasmBytes = [0, 97, 115, 109, 1, 0, 0, 0]

  // loadWasm() with raw bytes
  const runtimeInfo = await page.evaluate(async bytes => {
    const {loadWasm} = window.trysteroWasm
    const u8 = new Uint8Array(bytes)
    const {instance, module, memory, exports} = await loadWasm(u8)
    return {
      hasInstance: !!instance,
      hasModule: !!module,
      hasMemory: memory instanceof WebAssembly.Memory,
      hasExports: !!exports
    }
  }, emptyWasmBytes)

  expect(runtimeInfo.hasInstance).toBe(true)
  expect(runtimeInfo.hasModule).toBe(true)
  expect(runtimeInfo.hasMemory).toBe(true)
  expect(runtimeInfo.hasExports).toBe(true)

  // createStringCodec() with mock memory + allocator
  const [original, roundtrip] = await page.evaluate(() => {
    const {createStringCodec} = window.trysteroWasm
    const memory = new WebAssembly.Memory({initial: 1})
    let heap = 0
    const exports = {malloc: n => ((heap += n) - n)}
    const {toWasm, fromWasm} = createStringCodec({memory, exports})
    const str = 'hello wasm 🚀'
    const {ptr, len} = toWasm(str)
    return [str, fromWasm(ptr, len)]
  })

  expect(roundtrip).toBe(original)

  // initWasmGame() returns callable API for modules with no exports
  const apiShape = await page.evaluate(async bytes => {
    const {initWasmGame} = window.trysteroWasm
    let readyCalled = false
    const api = await initWasmGame({
      source: new Uint8Array(bytes),
      onReady: () => (readyCalled = true)
    })
    // Ensure methods exist and are callable
    api.start()
    api.update(16)
    api.handleMessage(0, 0)
    return {
      readyCalled,
      hasStart: typeof api.start === 'function',
      hasUpdate: typeof api.update === 'function',
      hasHandleMessage: typeof api.handleMessage === 'function'
    }
  }, emptyWasmBytes)

  expect(apiShape.readyCalled).toBe(true)
  expect(apiShape.hasStart).toBe(true)
  expect(apiShape.hasUpdate).toBe(true)
  expect(apiShape.hasHandleMessage).toBe(true)
})


