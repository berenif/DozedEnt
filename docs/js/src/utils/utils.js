const {floor, sin} = Math

export const libName = 'Trystero'

export const alloc = (n, f) => Array(n).fill().map(f)

const charSet = '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz'

// Secure crypto-based ID generation
const getCrypto = () => {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      return globalThis.crypto
    }
    return null
  } catch (e) {
    return null
  }
}

export const genId = n => {
  const crypto = getCrypto()
  
  if (crypto) {
    // Use cryptographically secure random values
    const bytes = new Uint8Array(n)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => charSet[byte % charSet.length]).join('')
  } else {
    // Fallback to deterministic generation based on current time and counter
    let counter = genId.counter || 0
    genId.counter = (counter + 1) % 1000000
    const seed = Date.now() + counter
    
    return alloc(n, (_, i) => {
      const value = (seed + i * 1664525 + 1013904223) % charSet.length
      return charSet[Math.abs(value) % charSet.length]
    }).join('')
  }
}

export const selfId = genId(20)

export const all = Promise.all.bind(Promise)

export const isBrowser = typeof window !== 'undefined'

export const {entries, fromEntries, keys} = Object

export const noOp = () => {}

export const mkErr = msg => new Error(`${libName}: ${msg}`)

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const encodeBytes = txt => encoder.encode(txt)

export const decodeBytes = buffer => decoder.decode(buffer)

export const toHex = buffer =>
  buffer.reduce((a, c) => a + c.toString(16).padStart(2, '0'), '')

export const topicPath = (...parts) => parts.join('@')

export const shuffle = (xs, seed) => {
  const a = [...xs]
  const rand = () => {
    const x = sin(seed++) * 10_000
    return x - floor(x)
  }

  let i = a.length

  while (i) {
    const j = floor(rand() * i)
    i--
    ;[a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

export const getRelays = (config, defaults, defaultN, deriveFromAppId) => {
  const relayUrls =
    config.relayUrls ||
    (deriveFromAppId ? shuffle(defaults, strToNum(config.appId)) : defaults)

  return relayUrls.slice(
    0,
    config.relayUrls
      ? config.relayUrls.length
      : config.relayRedundancy || defaultN
  )
}

export const toJson = JSON.stringify

export const fromJson = JSON.parse

export const strToNum = (str, limit = Number.MAX_SAFE_INTEGER) =>
  str.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % limit

const defaultRetryMs = 3333
const socketRetryPeriods = {}

export const makeSocket = (url, onMessage) => {
  const client = {}

  const init = () => {
    const socket = new WebSocket(url)

    socket.onclose = () => {
      socketRetryPeriods[url] ??= defaultRetryMs
      setTimeout(init, socketRetryPeriods[url])
      socketRetryPeriods[url] *= 2
    }

    socket.onmessage = e => onMessage(e.data)
    client.socket = socket
    client.url = socket.url
    client.ready = new Promise(
      res =>
        (socket.onopen = () => {
          res(client)
          socketRetryPeriods[url] = defaultRetryMs
        })
    )
    client.send = data => {
      if (socket.readyState === 1) {
        socket.send(data)
      }
    }
  }

  init()

  return client
}

export const socketGetter = clientMap => () =>
  fromEntries(entries(clientMap).map(([url, client]) => [url, client.socket]))
