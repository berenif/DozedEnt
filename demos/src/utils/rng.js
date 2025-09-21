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
  // Validate and limit input to prevent timeouts
  if (!name || typeof name !== 'string') {
    name = 'default'
  }
  
  // Limit name length to prevent excessive processing
  if (name.length > 1000) {
    name = name.substring(0, 1000)
  }
  
  let h = 0xcbf29ce484222325n // FNV offset basis
  const p = 0x100000001b3n // FNV prime
  
  // Process characters with timeout protection
  const maxIterations = Math.min(name.length, 1000)
  for (let i = 0; i < maxIterations; i++) {
    const charCode = name.charCodeAt(i)
    // Skip invalid characters that might cause issues
    if (charCode < 0 || charCode > 0x10FFFF) {
      continue
    }
    h ^= BigInt(charCode & 0xff)
    h = (h * p) & 0xffffffffffffffffn
  }
  
  // mix with baseSeed
  const mixed = (h ^ baseSeed) & 0xffffffffffffffffn
  // ensure non-zero
  return mixed === 0n ? 1n : mixed
}

function getStream(name = 'default') {
  let r = streams.get(name)
  if (!r) { r = new XorShift64Star(deriveSeed(name)); streams.set(name, r) }
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

/** Float in [0,1) from a named stream */
export function randFloat(stream = 'default') {
  return getStream(stream).nextFloat01()
}

/** Integer in [0, max) from a named stream */
export function randInt(max, stream = 'default') {
  if (!Number.isFinite(max) || max <= 0) { return 0 }
  const f = getStream(stream).nextFloat01()
  return Math.floor(f * max)
}

/** Choose an element from an array via named stream */
export function randChoice(arr, stream = 'default') {
  if (!arr || arr.length === 0) { return void 0 }
  return arr[randInt(arr.length, stream)]
}

/** Float in [min,max) from a named stream */
export function randRange(min, max, stream = 'default') {
  return min + (max - min) * randFloat(stream)
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

export default { setGlobalSeed, randFloat, randInt, randChoice, randRange, createRngStream }


