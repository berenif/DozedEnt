// Deterministic RNG for JS-side visuals (WASM-friendly, seeded from runSeed)
// - Do NOT use for gameplay; visuals only

// xorshift64* PRNG using BigInt state
class XorShift64Star {
  /** @param {bigint} seed */
  constructor(seed) { this.state = seed && seed !== 0n ? seed : 1n }
  next64() {
    let x = this.state
    x ^= x >> 12n
    x ^= x << 25n
    x ^= x >> 27n
    this.state = x
    return x * 2685821657736338717n
  }
  nextFloat01() {
    // Take high 24 bits to Number in [0,1)
    const v = this.next64() >> 40n // 64-40 = 24 bits
    return Number(v) / 16777216.0
  }
}

/** Global seed and named substreams */
let baseSeed = 1n
/** @type {Map<string, XorShift64Star>} */
const streams = new Map()

/** Derive a per-stream seed from baseSeed and name via FNV-1a-64 */
function deriveSeed(name) {
  // Safety checks to prevent timeout issues
  if (!name || typeof name !== 'string') {
    name = 'default'
  }
  
  // Limit name length to prevent excessive processing
  if (name.length > 1000) {
    name = name.substring(0, 1000)
  }
  
  let h = 0xcbf29ce484222325n // FNV offset basis
  const p = 0x100000001b3n // FNV prime
  
  // Add timeout protection - limit iterations
  const maxIterations = Math.min(name.length, 1000)
  for (let i = 0; i < maxIterations; i++) {
    h ^= BigInt(name.charCodeAt(i) & 0xff)
    h = (h * p) & 0xffffffffffffffffn
  }
  
  // mix with baseSeed
  const mixed = (h ^ baseSeed) & 0xffffffffffffffffn
  // ensure non-zero
  return mixed === 0n ? 1n : mixed
}

function getStream(name = 'default') {
  // Safety checks for stream name
  if (!name || typeof name !== 'string') {
    name = 'default'
  }
  
  // Limit stream name length and sanitize
  if (name.length > 200) {
    name = name.substring(0, 200)
  }
  
  // Remove any potentially problematic characters
  name = name.replace(/[^\w\-:.]/g, '_')
  
  let r = streams.get(name)
  if (!r) { 
    try {
      r = new XorShift64Star(deriveSeed(name))
      streams.set(name, r) 
    } catch (error) {
      console.warn('Failed to create RNG stream, using default:', error)
      r = new XorShift64Star(deriveSeed('default'))
      streams.set('default', r)
    }
  }
  return r
}

/** Set the global seed (BigInt or number). Clears existing substreams. */
export function setGlobalSeed(seed) {
  try {
    baseSeed = typeof seed === 'bigint' ? seed : BigInt(seed >>> 0)
  } catch {
    baseSeed = 1n
  }
  streams.clear()
}

/** Sync seed from WASM if available */
export function syncSeedFromWasm() {
  try {
    // Try to get seed from WASM
    if (globalThis.wasmExports?.get_game_seed) {
      const wasmSeed = globalThis.wasmExports.get_game_seed()
      if (typeof wasmSeed === 'number' && Number.isFinite(wasmSeed)) {
        setGlobalSeed(BigInt(Math.floor(wasmSeed)))
        return true
      }
    }
    
    // Try alternative WASM seed functions
    if (globalThis.wasmExports?.get_random_seed) {
      const wasmSeed = globalThis.wasmExports.get_random_seed()
      if (typeof wasmSeed === 'number' && Number.isFinite(wasmSeed)) {
        setGlobalSeed(BigInt(Math.floor(wasmSeed)))
        return true
      }
    }
    
    // Try to get current time as seed from WASM
    if (globalThis.wasmExports?.get_time_seconds) {
      const timeSeed = globalThis.wasmExports.get_time_seconds()
      if (typeof timeSeed === 'number' && Number.isFinite(timeSeed)) {
        setGlobalSeed(BigInt(Math.floor(timeSeed * 1000000))) // Convert to microseconds for better entropy
        return true
      }
    }
  } catch (error) {
    console.warn('Failed to sync seed from WASM:', error)
  }
  
  return false
}

/** Float in [0,1) from a named stream */
export function randFloat(stream = 'default') {
  try {
    return getStream(stream).nextFloat01()
  } catch (error) {
    console.warn('RNG error in randFloat, using fallback:', error)
    return Math.random()
  }
}

/** Integer in [0, max) from a named stream */
export function randInt(max, stream = 'default') {
  if (!Number.isFinite(max) || max <= 0) { return 0 }
  try {
    const f = getStream(stream).nextFloat01()
    return Math.floor(f * max)
  } catch (error) {
    console.warn('RNG error in randInt, using fallback:', error)
    return Math.floor(Math.random() * max)
  }
}

/** Choose an element from an array via named stream */
export function randChoice(arr, stream = 'default') {
  if (!arr || arr.length === 0) { return void 0 }
  try {
    return arr[randInt(arr.length, stream)]
  } catch (error) {
    console.warn('RNG error in randChoice, using fallback:', error)
    return arr[Math.floor(Math.random() * arr.length)]
  }
}

/** Float in [min,max) from a named stream */
export function randRange(min, max, stream = 'default') {
  try {
    return min + (max - min) * randFloat(stream)
  } catch (error) {
    console.warn('RNG error in randRange, using fallback:', error)
    return min + (max - min) * Math.random()
  }
}

/** Create a dedicated RNG stream object for advanced usage */
export function createRngStream(name) {
  return {
    float: () => randFloat(name),
    int: (max) => randInt(max, name),
    choice: (arr) => randChoice(arr, name),
    range: (a, b) => randRange(a, b, name)
  }
}

export default { setGlobalSeed, syncSeedFromWasm, randFloat, randInt, randChoice, randRange, createRngStream }


